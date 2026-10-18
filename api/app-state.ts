import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { isServerSessionActive } from '../services/serverSession.js';

type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type EncryptedPayload = { version: 1; iv: string; tag: string; ciphertext: string };

const jsonHeaders = { 'Content-Type': 'application/json' };

const getRequiredEnvironment = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionKey = process.env.APP_STATE_ENCRYPTION_KEY;
  if (!url || !anonKey || !serviceRoleKey || !encryptionKey) throw new Error('Server encryption is not configured');
  const key = Buffer.from(encryptionKey, 'base64');
  if (key.length !== 32) throw new Error('APP_STATE_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return { url: url.replace(/\/$/, ''), anonKey, serviceRoleKey, key };
};

const encrypt = (value: unknown, key: Buffer): EncryptedPayload => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
};

const decrypt = (value: EncryptedPayload, key: Buffer): unknown => {
  if (!value || value.version !== 1 || !value.iv || !value.tag || !value.ciphertext) throw new Error('Invalid encrypted app state');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
};

const getBearerToken = (headers: RequestLike['headers']): string | null => {
  const header = headers.authorization || headers.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  return value?.startsWith('Bearer ') ? value.slice(7) : null;
};

const authenticate = async (token: string, config: ReturnType<typeof getRequiredEnvironment>): Promise<string | null> => {
  const response = await fetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id && await isServerSessionActive(token, config) ? user.id : null;
};

const serviceRequest = async (path: string, config: ReturnType<typeof getRequiredEnvironment>, init?: RequestInit) =>
  fetch(`${config.url}${path}`, {
    ...init,
    headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, ...jsonHeaders, ...(init?.headers || {}) },
  });

const readState = async (userId: string, config: ReturnType<typeof getRequiredEnvironment>) => {
  const response = await serviceRequest(`/rest/v1/app_state?user_id=eq.${encodeURIComponent(userId)}&select=encrypted_data,data,updated_at&limit=1`, config);
  if (!response.ok) throw new Error('Unable to read app state');
  const rows = await response.json() as Array<{ encrypted_data?: EncryptedPayload | null; data?: unknown; updated_at: string }>;
  return rows[0] || null;
};

const writeState = async (userId: string, data: unknown, config: ReturnType<typeof getRequiredEnvironment>, expectedRevision: string | null) => {
  // Coin balances and ritual outcomes are maintained in the server ledger.
  // Never persist a browser-supplied copy in general app state.
  const { incenseCoins: _coins, incenseRecords: _records, templeState: _temple, ...untrustedState } = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const revision = new Date(Math.max(Date.now(), expectedRevision ? Date.parse(expectedRevision) + 1 : 0)).toISOString();
  const row = { user_id: userId, encrypted_data: encrypt(untrustedState, config.key), data: null, updated_at: revision };
  // The timestamp predicate makes this a compare-and-swap. Two devices may
  // both read the same snapshot; only the first is allowed to replace it.
  const path = expectedRevision === null ? '/rest/v1/app_state'
    : `/rest/v1/app_state?user_id=eq.${encodeURIComponent(userId)}&updated_at=eq.${encodeURIComponent(expectedRevision)}`;
  const response = await serviceRequest(path, config, {
    method: expectedRevision === null ? 'POST' : 'PATCH',
    headers: { Prefer: 'return=representation' },
    // Clearing `data` happens in the same database write as storing ciphertext.
    body: JSON.stringify(expectedRevision === null ? [row] : row),
  });
  if (response.status === 409) throw Object.assign(new Error('Cloud state changed'), { status: 409 });
  if (!response.ok) throw new Error('Unable to write encrypted app state');
  const rows = await response.json() as unknown[];
  if (!rows.length) throw Object.assign(new Error('Cloud state changed'), { status: 409 });
  return revision;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'GET' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
    const config = getRequiredEnvironment();
    const token = getBearerToken(req.headers);
    const userId = token ? await authenticate(token, config) : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'PUT') {
      const body = req.body as { data?: unknown; revision?: unknown } | undefined;
      const data = body?.data;
      const serialized = JSON.stringify(data);
      const revision = body?.revision;
      if (!data || typeof data !== 'object' || Array.isArray(data) || serialized.length > 1_000_000
        || !(revision === null || (typeof revision === 'string' && revision.length < 80 && Number.isFinite(Date.parse(revision))))) {
        return res.status(400).json({ error: 'Invalid app state payload' });
      }
      const updatedRevision = await writeState(userId, data, config, revision as string | null);
      return res.status(200).json({ ok: true, revision: updatedRevision });
    }

    const state = await readState(userId, config);
    if (!state) return res.status(200).json({ data: null, revision: null });
    if (state.encrypted_data) return res.status(200).json({ data: decrypt(state.encrypted_data, config.key), revision: state.updated_at });

    // Backward-compatible, one-time migration: preserve the legacy value until
    // encryption succeeds, then atomically replace it with ciphertext.
    const legacyData = state.data ?? null;
    const revision = legacyData !== null ? await writeState(userId, legacyData, config, state.updated_at) : state.updated_at;
    return res.status(200).json({ data: legacyData, revision });
  } catch (error) {
    if ((error as { status?: number }).status === 409) return res.status(409).json({ error: 'Cloud state changed; read and merge again', code: 'STATE_CONFLICT' });
    console.error('Encrypted app-state request failed', error);
    return res.status(500).json({ error: 'Encrypted synchronization is temporarily unavailable' });
  }
}
