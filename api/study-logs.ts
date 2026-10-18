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

const jsonHeaders = { 'Content-Type': 'application/json' };

const getRequiredEnvironment = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) throw new Error('Study-log service is not configured');
  return { url: url.replace(/\/$/, ''), anonKey, serviceRoleKey };
};

const getBearerToken = (headers: RequestLike['headers']): string | null => {
  const header = headers.authorization || headers.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  return value?.startsWith('Bearer ') ? value.slice(7) : null;
};

const authenticate = async (token: string, config: ReturnType<typeof getRequiredEnvironment>): Promise<string | null> => {
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id && await isServerSessionActive(token, config) ? user.id : null;
};

const serviceRequest = async (path: string, config: ReturnType<typeof getRequiredEnvironment>, init?: RequestInit) =>
  fetch(`${config.url}${path}`, {
    ...init,
    headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, ...jsonHeaders, ...(init?.headers || {}) },
  });

const isValidSessionId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(value);

// A saved study row is not proof that its coins were awarded. This also
// detects older/incompatible RPC versions that return a successful response.
const confirmsStudyAward = (value: unknown, sessionId: string, minutes: number): boolean => {
  if (!value || typeof value !== 'object') return false;
  const state = value as { incenseCoins?: unknown; incenseRecords?: unknown };
  if (!Number.isSafeInteger(state.incenseCoins) || Number(state.incenseCoins) < 0 || !Array.isArray(state.incenseRecords)) return false;
  let awarded = 0;
  for (const receipt of state.incenseRecords) {
    if (receipt && (receipt.id === `study:${sessionId}` || receipt.studySessionId === sessionId)
      && Number.isSafeInteger(receipt.amount)) awarded += receipt.amount;
  }
  return awarded >= minutes;
};

type IncomingSession = {
  sessionId?: unknown;
  subjectName?: unknown;
  durationMinutes?: unknown;
  timestamp?: unknown;
};

const validateSession = (session: IncomingSession) => {
  const subjectName = typeof session.subjectName === 'string' ? session.subjectName.trim() : '';
  const durationMinutes = session.durationMinutes;
  const timestamp = session.timestamp;
  const now = Date.now();
  if (
    !isValidSessionId(session.sessionId) || !subjectName || subjectName.length > 40 ||
    typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440 ||
    // Let the RPC distinguish an old retry (already awarded) from a new backfill.
    typeof timestamp !== 'number' || !Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > now + 5 * 60 * 1000
  ) {
    return null;
  }
  return { sessionId: session.sessionId, subjectName, durationMinutes, timestamp };
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const config = getRequiredEnvironment();
    const token = getBearerToken(req.headers);
    const userId = token ? await authenticate(token, config) : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body as { sessions?: IncomingSession[] } | undefined;
    const rawSessions = Array.isArray(body?.sessions) ? body.sessions : [];
    if (rawSessions.length < 1 || rawSessions.length > 50) {
      return res.status(400).json({ error: 'Invalid study session' });
    }
    const sessions = rawSessions.map(validateSession);
    if (sessions.some(session => !session)) return res.status(400).json({ error: 'Invalid study session' });

    let temple: unknown;
    for (const session of sessions.sort((a, b) => a!.timestamp - b!.timestamp)) {
      // The RPC obtains a per-user advisory lock, stores the original completion
      // time and awards coins once per session ID.
      const response = await serviceRequest('/rest/v1/rpc/record_study_session', config, {
        method: 'POST',
        body: JSON.stringify({
          p_user_id: userId,
          p_session_id: session!.sessionId,
          p_subject_name: session!.subjectName,
          p_duration_minutes: session!.durationMinutes,
          p_session_timestamp: session!.timestamp,
        }),
      });
      let data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (['PGRST202', '42883', '42P01'].includes(String(data?.code))) return res.status(503).json({ code: 'TEMPLE_SETUP_REQUIRED', error: '香火幣帳本尚未完成設定，請通知管理員安裝專注與香火幣帳本更新。' });
        const message = typeof data?.message === 'string' ? data.message : '';
        if (message.includes('FOCUS_SESSION_OVERLAPS')) return res.status(409).json({ error: 'Study sessions overlap with an existing record' });
        if (message.includes('FOCUS_SESSION_CONFLICT')) return res.status(409).json({ error: 'Study session differs from the already recorded session' });
        if (/FOCUS_SESSION_TOO_OLD|INVALID_FOCUS_SESSION/.test(message)) return res.status(400).json({ error: 'Study session is outside the allowed backfill period or has invalid values' });
        throw new Error('Unable to record study session');
      }
      if (!confirmsStudyAward(data, session!.sessionId, session!.durationMinutes)) {
        // Reconcile once using the existing server ledger, without issuing
        // browser-calculated coins or submitting another study session ID.
        const refreshed = await serviceRequest('/rest/v1/rpc/get_temple_state', config, {
          method: 'POST', body: JSON.stringify({ p_user_id: userId }),
        });
        const latest = await refreshed.json().catch(() => ({}));
        if (refreshed.ok && confirmsStudyAward(latest, session!.sessionId, session!.durationMinutes)) data = latest;
        else {
          if (['PGRST202', '42883', '42P01'].includes(String(latest?.code))) return res.status(503).json({ code: 'TEMPLE_SETUP_REQUIRED', error: '香火幣帳本尚未完成設定，請通知管理員安裝專注與香火幣帳本更新。' });
          return res.status(503).json({ code: 'STUDY_CREDIT_UNCONFIRMED', error: '專注紀錄可能已儲存，但尚未確認該筆香火幣收據。請保留紀錄，通知管理員核對發幣帳本。' });
        }
      }
      temple = data;
    }
    return res.status(201).json({ ok: true, temple });
  } catch (error) {
    console.error('Study-log request failed', error);
    return res.status(500).json({ error: 'Unable to record study session' });
  }
}
