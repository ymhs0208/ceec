import { isServerSessionActive } from '../services/serverSession.js';

type RequestLike = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type ResponseLike = { status: (code: number) => ResponseLike; json: (body: unknown) => void; setHeader: (name: string, value: string) => void };

const getConfig = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) throw new Error('Temple service is not configured');
  return { url: url.replace(/\/$/, ''), anonKey, serviceRoleKey };
};
const bearer = (headers: RequestLike['headers']) => {
  const value = headers.authorization || headers.Authorization;
  const header = Array.isArray(value) ? value[0] : value;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
};
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(value);

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const config = getConfig();
    const token = bearer(req.headers);
    const auth = token && await fetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` } });
    if (!auth?.ok) return res.status(401).json({ error: 'Unauthorized' });
    const user = await auth.json() as { id?: string };
    if (!user.id || !await isServerSessionActive(token!, config)) return res.status(401).json({ error: 'Unauthorized' });
    const body = req.body as { actionId?: unknown; ritualType?: unknown } | undefined;
    const rpc = req.method === 'GET' ? 'get_temple_state' : 'perform_temple_ritual';
    if (req.method === 'POST' && (!validId(body?.actionId) || !['lamp', 'fortune', 'ticket'].includes(String(body?.ritualType)))) return res.status(400).json({ error: 'Invalid temple ritual' });
    const response = await fetch(`${config.url}/rest/v1/rpc/${rpc}`, {
      method: 'POST', headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.method === 'GET' ? { p_user_id: user.id } : { p_user_id: user.id, p_action_id: body!.actionId, p_ritual_type: body!.ritualType }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && ['PGRST202', '42883', '42P01'].includes(String(data?.code))) return res.status(503).json({ code: 'TEMPLE_SETUP_REQUIRED', error: '香火幣帳本尚未完成設定，請通知管理員安裝專注與香火幣帳本更新。' });
    if (!response.ok) return res.status(response.status === 400 ? 400 : 409).json({ error: data.message || 'Temple ritual could not be completed' });
    return res.status(200).json({ data });
  } catch (error) {
    console.error('Temple request failed', error);
    return res.status(500).json({ error: 'Temple service is temporarily unavailable' });
  }
}
