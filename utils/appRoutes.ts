import { EXAM_PRESETS } from '../constants';

export const PAGE_ROUTES = {
  home: { path: '', label: '' },
  ranking: { path: 'ranking', label: '排行榜' },
  community: { path: 'community', label: '今日共讀' },
  learning: { path: 'learning', label: '讀書統計' },
  achievements: { path: 'achievements', label: '成就徽章' },
  temple: { path: 'temple', label: '祈福神社' },
  settings: { path: 'settings', label: '設定' },
  account: { path: 'account', label: '帳號管理' },
  instructions: { path: 'instructions', label: '使用說明' },
  privacy: { path: 'privacy', label: '隱私權政策' },
  terms: { path: 'terms', label: '服務條款' },
  schedule: { path: 'schedule', label: '官方參考日程' },
  donation: { path: 'donation', label: '小額贊助' },
  announcements: { path: 'announcements', label: '最新公告' },
  support: { path: 'support', label: '售後服務' },
  refund: { path: 'refund-policy', label: '退款與取消政策' },
} as const;

export type ActivePage = keyof typeof PAGE_ROUTES;
export const AUTH_ROUTE_MODES = ['login', 'signup', 'forgot', 'reset'] as const;
export type AuthRouteMode = typeof AUTH_ROUTE_MODES[number];
export const isActivePage = (value: unknown): value is ActivePage =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PAGE_ROUTES, value);
export const isExamId = (value: unknown): value is string =>
  typeof value === 'string' && EXAM_PRESETS.some(exam => exam.id === value);
export const normalizeExamId = (value: string) => {
  const exam = value.toLowerCase() === '115cap' ? '117cap' : value.toLowerCase();
  return isExamId(exam) ? exam : undefined;
};
const pageFromPath = (value: string): ActivePage | undefined =>
  (Object.keys(PAGE_ROUTES) as ActivePage[]).find(page => PAGE_ROUTES[page].path === value);

// URLs are authoritative: history.state is metadata, not a second route source.
export const readAppRoute = (url: URL) => {
  const parts = url.pathname.toLowerCase().split('/').filter(Boolean);
  const pathExam = parts[0] ? normalizeExamId(parts[0]) : undefined;
  const examId = pathExam || normalizeExamId(url.searchParams.get('exam') || '');
  const routeParts = pathExam ? parts.slice(1) : parts;
  const isAuth = routeParts[0] === 'auth' && routeParts.length <= 2;
  const authMode = isAuth && AUTH_ROUTE_MODES.includes(routeParts[1] as AuthRouteMode)
    ? routeParts[1] as AuthRouteMode : undefined;
  const legacyPage = url.searchParams.get(isAuth ? 'returnTo' : 'page');
  let page: ActivePage = isActivePage(legacyPage) ? legacyPage : 'home';
  if (routeParts.length === 1) page = pageFromPath(routeParts[0]) || page;
  if (routeParts.join('/') === 'spare/support') page = 'support';
  if (routeParts.join('/') === 'spare/refund-cancellation-policy') page = 'refund';
  return { examId, page, isAuth, authMode };
};

const routeQuery = (search = '') => {
  const params = new URLSearchParams(search);
  for (const key of ['exam', 'page', 'returnTo', 'authMode']) params.delete(key);
  return params;
};
const withQuery = (path: string, params: URLSearchParams, hash = '') =>
  `${path}${params.size ? `?${params.toString()}` : ''}${hash}`;

export const buildAppRoute = (page: ActivePage, examId: string, search = '', hash = '') => {
  const exam = normalizeExamId(examId) || '116gsat';
  return withQuery(`/${exam}${PAGE_ROUTES[page].path ? `/${PAGE_ROUTES[page].path}` : ''}`, routeQuery(search), hash);
};

export const buildAuthRoute = (page: ActivePage, examId: string, mode?: string, search = '', hash = '') => {
  const exam = normalizeExamId(examId) || '116gsat';
  const authMode = AUTH_ROUTE_MODES.includes(mode as AuthRouteMode) ? mode : 'login';
  const params = routeQuery(search);
  if (page !== 'home') params.set('returnTo', page);
  if (mode && mode !== authMode) params.set('authMode', mode);
  return withQuery(`/${exam}/auth/${authMode}`, params, hash);
};

// Keep recovery/OTP parameters untouched until Supabase has consumed them.
export const hasAuthCallback = (url: URL) => {
  const hashQuery = url.hash.includes('?') ? url.hash.slice(url.hash.indexOf('?') + 1) : url.hash.slice(1);
  return [url.searchParams, new URLSearchParams(hashQuery)].some(params =>
    ['code', 'token_hash', 'access_token', 'refresh_token', 'error_code', 'error', 'error_description'].some(key => params.has(key))
    || params.get('reset') === 'true' || params.get('login') === 'otp'
    || ['magiclink', 'email', 'recovery'].includes(params.get('type') || ''));
};
