import { safeLocalStorage } from '../utils/storage';
import { AppData, AuthResponse, RankingItem, StudySession, TempleSyncData, User } from '../types';
import { initialAuthCallbackHref, requireSupabase } from './supabaseClient';

const AUTH_REQUIRED = 'AUTH_REQUIRED';
const LOGOUT_PENDING_KEY = 'gsat_logout_pending';
const CONSUMED_AUTH_CALLBACK_HREF_KEY = 'gsat_consumed_auth_callback_href';
const AUTH_ERROR_PATTERN =
  /session.*missing|session.*expired|jwt.*expired|invalid jwt|refresh token|not authenticated|auth session missing|user not found/i;

type StudyLogsResponse = {
  success: boolean;
  sessions?: StudySession[];
  message?: string;
  code?: string;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * App-state is intentionally handled by a same-origin server endpoint.  The
 * endpoint validates the Supabase access token and encrypts the payload with a
 * server-only key; do not fall back to direct `app_state` queries here.
 */
const appStateRequest = async <T>(method: 'GET' | 'PUT', body?: AppData, revision?: string | null, expectedOwner?: string): Promise<T> => {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session?.access_token || (expectedOwner && sessionData.session.user?.id !== expectedOwner)) {
    throw Object.assign(new Error('Authentication session missing'), { status: 401 });
  }

  const response = await fetch('/api/app-state', {
    method,
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify({ data: body, revision }) } : {}),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw Object.assign(new Error(payload?.error || 'Unable to synchronize encrypted data'), {
      status: response.status,
      code: response.status >= 500 ? 'APP_STATE_UNAVAILABLE' : payload?.code,
    });
  }
  return response.json() as Promise<T>;
};

const templeRequest = async <T>(method: 'GET' | 'POST', body?: { actionId: string; ritualType: 'lamp' | 'fortune' | 'ticket' }): Promise<T> => {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) throw Object.assign(new Error('Authentication session missing'), { status: 401 });
  const response = await fetch('/api/temple', {
    method,
    headers: { Authorization: `Bearer ${sessionData.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error || 'Temple request failed'), { status: response.status, code: payload?.code });
  return payload.data as T;
};

const studyLogRequest = async (sessions: StudySession[], expectedOwner?: string): Promise<TempleSyncData> => {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session?.access_token || (expectedOwner && sessionData.session.user?.id !== expectedOwner)) {
    throw Object.assign(new Error('Authentication session missing'), { status: 401 });
  }
  const response = await fetch('/api/study-logs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      'Content-Type': 'application/json',
    },
    // The server accepts a small batch so an interrupted sync can retry all
    // pending records atomically from the client's point of view.  Keep the
    // original completion timestamp: community statistics use it to decide
    // whether a session belongs to today in Asia/Taipei.
    body: JSON.stringify({
      sessions: sessions.map((session) => ({
        sessionId: session.id,
        subjectName: session.subjectName,
        durationMinutes: session.durationMinutes,
        timestamp: session.timestamp,
      })),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload?.error || 'Unable to record study session'), { status: response.status, code: payload?.code });
  }
  return payload.temple as TempleSyncData;
};

const getAuthRedirectBase = (): string => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
};

const formatDate = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const errorMessage = (error: any, fallback: string): string => {
  if (error?.code === 'TEMPLE_SETUP_REQUIRED') return '香火幣帳本尚未完成設定，請通知管理員安裝專注與香火幣帳本更新。';
  if (error?.code === 'STUDY_CREDIT_UNCONFIRMED') return '專注紀錄可能已儲存，但香火幣收據尚未確認，不能視為已發幣。請保留紀錄並檢查帳本更新。';
  const message = String(error?.message || '');
  const status = Number(error?.status || error?.statusCode || 0);
  if (status === 409 && /overlap/i.test(message)) return '這筆專注與已入帳紀錄的時段重疊，不能重複發幣；請核對是否在多個裝置同時計時。';
  if (status === 409 && /already recorded session/i.test(message)) return '這筆紀錄的編號已入帳，但內容不同，請保留紀錄並聯絡支援核對。';
  if (status === 400 && /backfill period/i.test(message)) return '這筆紀錄已超過 7 天補傳期限，或時間資料不合法，請保留紀錄並聯絡支援核對。';
  if (!navigator.onLine || /failed to fetch|network|load failed/i.test(message)) {
    return '網路連線異常，請確認網路後再試一次';
  }
  if (status === 429 || /rate limit|too many requests|over_email_send_rate_limit/i.test(message)) {
    return '操作次數過多，請稍候幾分鐘再試';
  }
  if (error?.code === 'APP_STATE_UNAVAILABLE') {
    return '雲端資料暫時無法同步，請稍後再試';
  }
  if (AUTH_ERROR_PATTERN.test(message)) {
    return '登入已失效，請重新登入';
  }
  if (/invalid login credentials/i.test(message)) return 'Email 或密碼錯誤';
  if (/email not confirmed/i.test(message)) return '請先到信箱完成 Email 驗證';
  if (/already registered|already been registered|already exists|user.*exists/i.test(message)) {
    return '此 Email 已註冊';
  }
  if (/weak password|password/i.test(message) && /least|characters|strength/i.test(message)) {
    return '密碼強度不足，請使用至少 8 個字元並包含英文字母與數字';
  }
  if (/same password|different from the old password/i.test(message)) return '新密碼不可與目前密碼相同';
  if (/email address.*invalid|invalid email/i.test(message)) return 'Email 格式不正確';
  if (/database|row-level security|permission denied|violates/i.test(message)) {
    return `${fallback}，請稍後再試`;
  }
  return fallback;
};

const isAuthFailureError = (error: any): boolean => {
  const message = String(error?.message || '');
  const status = Number(error?.status || error?.statusCode || 0);
  return status === 401 || AUTH_ERROR_PATTERN.test(message);
};

const authFailure = (message = '登入已失效，請重新登入'): AuthResponse => ({
  success: false,
  message,
  code: AUTH_REQUIRED,
});

const isPasskeySupported = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential !== 'undefined' &&
  typeof navigator.credentials !== 'undefined';

const passkeyErrorMessage = (error: any, fallback: string): string => {
  const message = String(error?.message || error || '');
  if (!isPasskeySupported() || /does not support webauthn|not supported/i.test(message)) {
    return '此裝置或瀏覽器不支援手機金鑰登入';
  }
  if (/notallowederror|aborted|cancel/i.test(message)) {
    return '手機金鑰驗證已取消';
  }
  if (/passkey.*disabled|experimental.*passkey|webauthn.*disabled|not enabled/i.test(message)) {
    return '手機金鑰尚未在 Supabase 專案啟用，請先到後台開啟 Passkeys/WebAuthn';
  }
  if (/not found|no credential|credential.*not.*found|invalid credential/i.test(message)) {
    return '找不到可用的手機金鑰，請先在帳號設定新增手機金鑰';
  }
  return errorMessage(error, fallback);
};

const revokeAllPasskeys = async (client: any): Promise<boolean> => {
  const auth = client?.auth as any;
  const listPasskeys = auth?.listPasskeys || auth?._listPasskeys;
  const deletePasskey = auth?.deletePasskey || auth?._deletePasskey;
  if (typeof listPasskeys !== 'function' || typeof deletePasskey !== 'function') {
    return true;
  }

  const { data, error } = await listPasskeys.call(auth);
  if (error) throw error;

  const passkeys = Array.isArray(data)
    ? data
    : Array.isArray(data?.passkeys)
    ? data.passkeys
    : Array.isArray(data?.items)
    ? data.items
    : [];

  for (const passkey of passkeys) {
    const passkeyId = passkey?.id || passkey?.passkey_id || passkey?.credential_id;
    if (!passkeyId) continue;
    const { error: deleteError } = await deletePasskey.call(auth, { passkeyId });
    if (deleteError) throw deleteError;
  }

  return true;
};

const toUser = (authUser: any, profile?: any): User => ({
  email: authUser.email || profile?.email || '',
  name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '使用者',
  registrationDate: formatDate(profile?.created_at || authUser.created_at),
  lastLoginDate: formatDate(profile?.last_login_at || authUser.last_sign_in_at),
  needsOnboarding: authUser.user_metadata?.onboarding_complete === false,
});

const getCurrentAuthUser = async (): Promise<any | null> => {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (isAuthFailureError(error)) {
      return null;
    }
    throw error;
  }
  return data.user;
};

const upsertCurrentDevice = async (_userId: string): Promise<void> => {
  const client = requireSupabase();
  const { error } = await client.rpc('register_current_device', {
    p_device_id: authService.getDeviceId(),
    p_device_name: authService.getDeviceName(),
  });
  if (error) throw error;
};

const getCurrentAppUser = async (): Promise<any | null> => {
  const client = requireSupabase();
  const authUser = await getCurrentAuthUser();
  if (!authUser) return null;
  try {
    // Bind existing devices to the signed Auth session; revoked JWTs cannot register.
    await upsertCurrentDevice(authUser.id);
    return authUser;
  } catch (error) {
    if (isAuthFailureError(error)) return null;
    throw error;
  }
};

const touchCurrentDevice = async (userId: string): Promise<void> => {
  const client = requireSupabase();
  const { error } = await client
    .from('devices')
    .update({ last_active_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('device_id', authService.getDeviceId());
  if (error) throw error;
};

const loadAccount = async (authUser: any): Promise<AuthResponse> => {
  const client = requireSupabase();
  const [{ data: profile, error: profileError }, state] = await Promise.all([
    client.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
    appStateRequest<{ data: AppData | null }>('GET'),
  ]);

  if (profileError) {
    const error = profileError;
    return isAuthFailureError(error)
      ? authFailure()
      : { success: false, message: errorMessage(error, '讀取雲端資料失敗') };
  }

  const accountData = {
    ...(state?.data || {}),
    team: state?.data?.team ?? profile?.team ?? '',
    targetExam: state?.data?.targetExam || profile?.exam_type,
  } as AppData;

  await upsertCurrentDevice(authUser.id);
  return {
    success: true,
    user: toUser(authUser, profile),
    data: accountData,
    encryptionKey: authUser.id,
  };
};

export const authService = {
  getDeviceId(): string {
    let deviceId = safeLocalStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      safeLocalStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  },

  getDeviceName(): string {
    const ua = navigator.userAgent;
    let browser = 'Unknown Browser';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';

    let os = 'Unknown OS';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';
    if (ua.includes('like Mac')) os = 'iOS';
    return `${browser} on ${os}`;
  },

  isAuthError(response: Pick<AuthResponse, 'code'>): boolean {
    return response.code === AUTH_REQUIRED;
  },

  async validateSession(): Promise<AuthResponse> {
    try {
      const authUser = await getCurrentAppUser();
      return authUser ? { success: true } : authFailure();
    } catch (error) {
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: errorMessage(error, '無法確認登入狀態') };
    }
  },

  onSessionInvalidated(callback: () => void): () => void {
    try {
      const client = requireSupabase();
      const { data } = client.auth.onAuthStateChange((event: string, session: any) => {
        const hasLocalAccount = Boolean(safeLocalStorage.getItem('gsat_user_profile'));
        const isIntentionalLogout = Boolean(safeLocalStorage.getItem(LOGOUT_PENDING_KEY));
        if (
          !isIntentionalLogout &&
          hasLocalAccount &&
          (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session))
        ) {
          callback();
        }
      });
      return () => data.subscription.unsubscribe();
    } catch {
      return () => undefined;
    }
  },

  onPasswordRecovery(callback: () => void): () => void {
    try {
      const client = requireSupabase();
      const { data } = client.auth.onAuthStateChange((event: string) => {
        if (event === 'PASSWORD_RECOVERY') callback();
      });
      return () => data.subscription.unsubscribe();
    } catch {
      return () => undefined;
    }
  },

  onOneTimeLogin(callback: (response: AuthResponse) => void): () => void {
    try {
      const client = requireSupabase();
      let handled = false;
      const hasCallbackParams = (href: string) =>
        href.includes('login=otp') ||
        href.includes('type=magiclink') ||
        href.includes('type=email') ||
        href.includes('code=') ||
        href.includes('error_code=');

      const getInitialCallbackHref = () => {
        try {
          if (sessionStorage.getItem(CONSUMED_AUTH_CALLBACK_HREF_KEY) === initialAuthCallbackHref) {
            return window.location.href;
          }
        } catch {
          // Session storage can be unavailable in private/restricted contexts.
        }
        return initialAuthCallbackHref;
      };

      const markInitialCallbackHrefConsumed = () => {
        try {
          if (hasCallbackParams(initialAuthCallbackHref)) {
            sessionStorage.setItem(CONSUMED_AUTH_CALLBACK_HREF_KEY, initialAuthCallbackHref);
          }
        } catch {
          // Best-effort guard against duplicate callback handling.
        }
      };

      const getCallbackHref = () =>
        hasCallbackParams(window.location.href)
          ? window.location.href
          : getInitialCallbackHref();

      const isEmailLinkCallback = (href = getCallbackHref()) =>
        hasCallbackParams(href);

      // A password-recovery link also contains an auth code and creates a
      // short-lived session. It must not be handled as a magic-login link,
      // otherwise opening the reset email takes the user straight into the app.
      const isPasswordRecoveryCallback = (href = getCallbackHref()) => {
        const params = getEmailLinkParams(href);
        return params.get('reset') === 'true' || params.get('type') === 'recovery';
      };

      const cleanAuthCallbackUrl = () => {
        markInitialCallbackHrefConsumed();
        if (isEmailLinkCallback(window.location.href)) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      const getEmailLinkParams = (href = getCallbackHref()) => {
        const url = new URL(href, window.location.origin);
        const params = new URLSearchParams(url.search);

        if (url.hash) {
          const hash = url.hash.slice(1);
          const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash;
          new URLSearchParams(hashQuery).forEach((value, key) => {
            if (!params.has(key)) params.set(key, value);
          });
        }

        return params;
      };

      const getEmailLinkSignature = () => {
        const params = getEmailLinkParams();

        const uniquePart =
          params.get('code') ||
          params.get('token_hash') ||
          params.get('access_token') ||
          params.get('refresh_token');

        if (!uniquePart) return null;
        return [
          params.get('type') || '',
          uniquePart,
        ].join(':');
      };

      const getEmailLinkError = () => {
        const params = getEmailLinkParams();
        return params.get('error_code') || params.get('error') || null;
      };

      const isProcessedEmailLink = () => {
        const linkSignature = getEmailLinkSignature();
        return Boolean(
          linkSignature &&
          safeLocalStorage.getItem('gsat_last_processed_login_link') === linkSignature
        );
      };

      const expiredLoginLinkMessage = '\u767b\u5165\u9023\u7d50\u5df2\u5931\u6548\uff0c\u8acb\u91cd\u65b0\u5bc4\u9001\u4e00\u6b21\u6027\u767b\u5165\u9023\u7d50';

      const notifyExpiredLoginLink = () => {
        callback({
          success: false,
          message: '登入連結已失效，請重新寄送一次性登入連結',
          ...{ message: expiredLoginLinkMessage },
        });
      };

      const shouldRestoreSession = () =>
        isEmailLinkCallback() ||
        (
          !safeLocalStorage.getItem(LOGOUT_PENDING_KEY) &&
          !safeLocalStorage.getItem('gsat_user_profile')
        );

      const finishLogin = async (authUser: any) => {
        if (handled || !authUser || isPasswordRecoveryCallback() || !shouldRestoreSession()) return;
        const linkSignature = getEmailLinkSignature();
        if (linkSignature && safeLocalStorage.getItem('gsat_last_processed_login_link') === linkSignature) {
          handled = true;
          cleanAuthCallbackUrl();
          notifyExpiredLoginLink();
          return;
        }

        handled = true;
        safeLocalStorage.removeItem(LOGOUT_PENDING_KEY);
        if (linkSignature) {
          safeLocalStorage.setItem('gsat_last_processed_login_link', linkSignature);
        }
        cleanAuthCallbackUrl();
        await client.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', authUser.id);
        callback(await loadAccount(authUser));
      };

      const { data } = client.auth.onAuthStateChange(async (event: string, session: any) => {
        if (event === 'SIGNED_IN' && isEmailLinkCallback() && !isPasswordRecoveryCallback()) {
          setTimeout(() => {
            void finishLogin(session?.user);
          }, 0);
        }
      });

      if (!isPasswordRecoveryCallback() && isEmailLinkCallback() && (isProcessedEmailLink() || getEmailLinkError())) {
        handled = true;
        cleanAuthCallbackUrl();
        setTimeout(notifyExpiredLoginLink, 0);
        return () => data.subscription.unsubscribe();
      }

      if (shouldRestoreSession()) {
        client.auth.getSession().then(({ data: sessionData }: any) => {
          void finishLogin(sessionData?.session?.user);
        });
      }

      return () => data.subscription.unsubscribe();
    } catch {
      return () => undefined;
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const { data, error } = await client.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (error || !data.user) {
        return { success: false, message: errorMessage(error, '登入失敗') };
      }
      safeLocalStorage.removeItem(LOGOUT_PENDING_KEY);
      await client.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);
      return await loadAccount(data.user);
    } catch (error) {
      return { success: false, message: errorMessage(error, '無法連線至 Supabase') };
    }
  },

  isPasskeySupported(): boolean {
    return isPasskeySupported();
  },

  async loginWithPasskey(): Promise<AuthResponse> {
    try {
      if (!isPasskeySupported()) {
        return { success: false, message: '此裝置或瀏覽器不支援手機金鑰登入' };
      }

      const client = requireSupabase();
      if (typeof client.auth.signInWithPasskey !== 'function') {
        return { success: false, message: '目前的 Supabase SDK 不支援手機金鑰登入' };
      }

      const { data, error } = await client.auth.signInWithPasskey();
      if (error || !data?.user) {
        return { success: false, message: passkeyErrorMessage(error, '手機金鑰登入失敗') };
      }

      safeLocalStorage.removeItem(LOGOUT_PENDING_KEY);
      await client.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);
      return await loadAccount(data.user);
    } catch (error) {
      return { success: false, message: passkeyErrorMessage(error, '手機金鑰登入失敗') };
    }
  },

  async registerPasskey(): Promise<AuthResponse> {
    try {
      if (!isPasskeySupported()) {
        return { success: false, message: '此裝置或瀏覽器不支援手機金鑰登入' };
      }

      const client = requireSupabase();
      if (typeof client.auth.registerPasskey !== 'function') {
        return { success: false, message: '目前的 Supabase SDK 不支援手機金鑰登入' };
      }

      const authUser = await getCurrentAuthUser();
      if (!authUser) return authFailure();

      const { error } = await client.auth.registerPasskey();
      return error
        ? { success: false, message: passkeyErrorMessage(error, '新增手機金鑰失敗') }
        : { success: true, message: '手機金鑰已新增，之後可直接使用手機金鑰登入' };
    } catch (error) {
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: passkeyErrorMessage(error, '新增手機金鑰失敗') };
    }
  },

  async verifyOneTimeLoginCode(email: string, code: string): Promise<AuthResponse> {
    try {
      const cleanCode = code.replace(/\s+/g, '');
      if (!cleanCode) {
        return { success: false, message: '請輸入一次性驗證碼' };
      }

      const client = requireSupabase();
      const { data, error } = await client.auth.verifyOtp({
        email: normalizeEmail(email),
        token: cleanCode,
        type: 'email',
      });

      if (error || !data?.user) {
        return { success: false, message: errorMessage(error, '一次性驗證碼錯誤或已失效') };
      }

      safeLocalStorage.removeItem(LOGOUT_PENDING_KEY);
      await client.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);
      return await loadAccount(data.user);
    } catch (error) {
      return { success: false, message: errorMessage(error, '一次性驗證碼驗證失敗') };
    }
  },

  async sendOneTimeLoginLink(email: string, redirectUrlBase: string): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const redirectTo = `${redirectUrlBase.replace(/\/$/, '')}/?login=otp`;
      const { error } = await client.auth.signInWithOtp({
        email: normalizeEmail(email),
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: false,
        },
      });

      return error
        ? { success: false, message: errorMessage(error, '寄送一次性登入連結失敗') }
        : { success: true, message: '一次性登入連結已寄出' };
    } catch (error) {
      return { success: false, message: errorMessage(error, '寄送一次性登入連結失敗') };
    }
  },

  async signup(
    email: string,
    password: string,
    name: string,
    examType?: string,
    team?: string,
  ): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const { data, error } = await client.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          data: {
            name: name || normalizeEmail(email).split('@')[0],
            exam_type: examType || '116gsat',
            team: team || '',
            onboarding_complete: false,
          },
          ...(isLocalHost ? {} : { emailRedirectTo: getAuthRedirectBase() }),
        },
      });
      if (error) return { success: false, message: errorMessage(error, '註冊失敗') };
      // With email confirmation enabled, Supabase hides duplicate-account details
      // by returning a user with no identities instead of returning an error.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { success: false, message: '此 Email 已註冊' };
      }
      if (!data.user) return { success: false, message: '註冊失敗，請稍後再試' };
      return {
        success: true,
        message: data.session ? '註冊成功' : '註冊成功，請至信箱完成 Email 驗證後登入',
      };
    } catch (error) {
      return { success: false, message: errorMessage(error, '無法連線至 Supabase') };
    }
  },

  async syncData(_email: string, _password: string, data: AppData, _encryptionKey: string, revision?: string | null): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser || authUser.id !== _encryptionKey) return authFailure();

      await appStateRequest('PUT', data, revision, _encryptionKey);
      const { error: profileError } = await client.from('profiles').update({
          team: data.team || '',
          exam_type: data.targetExam || '',
        }).eq('id', authUser.id);
      const error = profileError;
      if (error) {
        return isAuthFailureError(error)
          ? authFailure()
          : { success: false, message: errorMessage(error, '同步失敗') };
      }
      await touchCurrentDevice(authUser.id);
      return { success: true };
    } catch (error) {
      if ((error as { code?: string }).code === 'STATE_CONFLICT') return { success: false, code: 'STATE_CONFLICT', message: '其他裝置更新了資料，正在重新合併。' };
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: errorMessage(error, '同步失敗') };
    }
  },

  async getData(_email: string, _password: string, _encryptionKey: string): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser || authUser.id !== _encryptionKey) return authFailure();
      const [stateResponse, { data: profile, error: profileError }] = await Promise.all([
        appStateRequest<{ data: AppData | null; revision: string | null }>('GET', undefined, undefined, _encryptionKey),
        client.from('profiles').select('team,exam_type').eq('id', authUser.id).maybeSingle(),
      ]);
      const encryptedState = stateResponse.data;
      const readError = profileError;
      if (readError) {
        return isAuthFailureError(readError)
          ? authFailure()
          : { success: false, message: errorMessage(readError, '讀取雲端資料失敗') };
      }
      await touchCurrentDevice(authUser.id);
      return {
        success: true,
        stateRevision: stateResponse.revision,
        data: {
          ...(encryptedState || {}),
          team: encryptedState?.team ?? profile?.team ?? '',
          targetExam: encryptedState?.targetExam || profile?.exam_type,
        } as AppData,
      };
    } catch (error) {
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: errorMessage(error, '讀取雲端資料失敗') };
    }
  },

  // study_logs is the durable, per-session source used by rankings. Reading it
  // here lets the personal history repair itself if a past app_state write was
  // interrupted or overwritten by another device.
  async getStudySessions(sinceTimestamp?: number): Promise<StudyLogsResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser) return { ...authFailure(), sessions: [] };

      const data: { session_id: string; subject_name: string; duration_minutes: number; session_timestamp: number }[] = [];
      // Page explicitly: PostgREST otherwise truncates long histories. A stable
      // second sort also prevents equal completion times crossing page boundaries.
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        let query = client.from('study_logs')
          .select('session_id,subject_name,duration_minutes,session_timestamp')
          .eq('user_id', authUser.id)
          .order('session_timestamp', { ascending: true })
          .order('session_id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (sinceTimestamp !== undefined) query = query.gte('session_timestamp', sinceTimestamp);
        const { data: page, error } = await query;
        if (error) {
          return isAuthFailureError(error)
            ? { ...authFailure(), sessions: [] }
            : { success: false, sessions: [], message: errorMessage(error, '讀取專注紀錄失敗') };
        }
        data.push(...(page || []));
        if (!page || page.length < pageSize) break;
      }

      return {
        success: true,
        sessions: (data || []).map((row: {
          session_id: string;
          subject_name: string;
          duration_minutes: number;
          session_timestamp: number;
        }) => ({
          id: row.session_id,
          // Older rows do not contain subject_id. subjectName is stable and
          // keeps those rows grouped correctly in the learning-history view.
          subjectId: row.subject_name,
          subjectName: row.subject_name,
          durationMinutes: row.duration_minutes,
          timestamp: row.session_timestamp,
        })),
      };
    } catch (error) {
      return isAuthFailureError(error)
        ? { ...authFailure(), sessions: [] }
        : { success: false, sessions: [], message: errorMessage(error, '讀取專注紀錄失敗') };
    }
  },

  async logSession(_email: string, _password: string, session: StudySession, team?: string): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser || normalizeEmail(authUser.email || '') !== normalizeEmail(_email)) return authFailure();
      const temple = await studyLogRequest([session], authUser.id);
      const { error: profileError } = team !== undefined
        ? await client.from('profiles').update({ team }).eq('id', authUser.id)
        : { error: null };
      const error = profileError;
      if (error) {
        return isAuthFailureError(error)
          ? { ...authFailure(), syncedStudySessionIds: [session.id], data: temple as unknown as AppData }
          : { success: false, syncedStudySessionIds: [session.id], data: temple as unknown as AppData, message: '專注與香火幣已入帳，但隊伍資料暫時更新失敗。' };
      }
      return { success: true, syncedStudySessionIds: [session.id], data: temple as unknown as AppData };
    } catch (error) {
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: errorMessage(error, '寫入專注紀錄失敗') };
    }
  },

  async getTempleState(): Promise<{ success: boolean; data?: TempleSyncData; message?: string; code?: string }> {
    try {
      return { success: true, data: await templeRequest<TempleSyncData>('GET') };
    } catch (error) {
      return isAuthFailureError(error)
        ? { success: false, code: AUTH_REQUIRED, message: '登入已失效' }
        : { success: false, message: errorMessage(error, '讀取香火幣失敗') };
    }
  },

  async performTempleRitual(actionId: string, ritualType: 'lamp' | 'fortune' | 'ticket'): Promise<{ success: boolean; data?: TempleSyncData; message?: string; code?: string }> {
    try {
      return { success: true, data: await templeRequest<TempleSyncData>('POST', { actionId, ritualType }) };
    } catch (error) {
      return isAuthFailureError(error)
        ? { success: false, code: AUTH_REQUIRED, message: '登入已失效' }
        : { success: false, message: errorMessage(error, '儀式執行失敗') };
    }
  },

  async syncStudyLogs(sessions: StudySession[], team?: string, expectedOwner?: string): Promise<AuthResponse> {
    const syncedStudySessionIds: string[] = [];
    let temple: TempleSyncData | undefined;
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser || (expectedOwner && authUser.id !== expectedOwner)) return authFailure();
      // Previously this method only updated the profile team.  The sync loop
      // then marked pending sessions as sent even though no study_logs rows
      // had been created, leaving the community page permanently at zero.
      // The endpoint limits a request to 50 records.  Splitting here also
      // lets an existing local history be safely backfilled after an upgrade.
      let rejected = false;
      for (let index = 0; index < sessions.length; index += 50) {
        const batch = sessions.slice(index, index + 50);
        try {
          temple = await studyLogRequest(batch, authUser.id);
          syncedStudySessionIds.push(...batch.map(session => session.id));
        } catch (error) {
          if (![400, 409].includes(Number((error as { status?: number }).status))) throw error;
          // An expired or overlapping record must not prevent unrelated study
          // on another device from ever being uploaded. Retrying accepted IDs
          // is safe because the ledger enforces idempotency.
          for (const session of batch) {
            try {
              temple = await studyLogRequest([session], authUser.id);
              syncedStudySessionIds.push(session.id);
            } catch (singleError) {
              if (![400, 409].includes(Number((singleError as { status?: number }).status))) throw singleError;
              rejected = true;
            }
          }
        }
      }
      const { error: profileError } = team !== undefined
        ? await client.from('profiles').update({ team }).eq('id', authUser.id)
        : { error: null };
      const error = profileError;
      if (error) {
        return isAuthFailureError(error)
          ? { ...authFailure(), syncedStudySessionIds }
          : { success: false, syncedStudySessionIds, data: temple as unknown as AppData, message: errorMessage(error, '同步讀書統計失敗') };
      }
      return { success: !rejected, syncedStudySessionIds, data: temple as unknown as AppData,
        ...(rejected ? { message: '部分專注紀錄超過補傳期限或時段重疊，請至學習歷程檢查同步。' } : {}) };
    } catch (error) {
      return isAuthFailureError(error)
        ? { ...authFailure(), syncedStudySessionIds }
        : { success: false, syncedStudySessionIds, data: temple as unknown as AppData, message: errorMessage(error, '同步讀書統計失敗') };
    }
  },

  async getRanking(_email?: string, team?: string): Promise<{ success: boolean; message?: string; globalRanking: RankingItem[]; teamRanking: any[] }> {
    try {
      const client = requireSupabase();
      const { data, error } = await client.rpc('get_rankings', { requested_team: team || null });
      if (error) throw error;
      return {
        globalRanking: data?.global_ranking || [],
        teamRanking: data?.team_ranking || [],
        success: true,
      };
    } catch (error) {
      console.error('Ranking error:', error);
      return { success: false, message: errorMessage(error, '排行榜暫時無法載入，請稍後重試'), globalRanking: [], teamRanking: [] };
    }
  },

  async getTodayCommunityStats(): Promise<{
    success: boolean;
    stats?: {
      totalMinutes: number;
      activeUsers: number;
      sessionCount: number;
      averageMinutes: number;
      topSubject?: string;
    };
    message?: string;
  }> {
    try {
      const client = requireSupabase();
      const { data, error } = await client.rpc('get_today_community_study', {
        timezone_name: 'Asia/Taipei',
      });
      if (error) throw error;
      return {
        success: true,
        stats: {
          totalMinutes: Number(data?.total_minutes || 0),
          activeUsers: Number(data?.active_users || 0),
          sessionCount: Number(data?.session_count || 0),
          averageMinutes: Number(data?.average_minutes || 0),
          topSubject: data?.top_subject || undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: errorMessage(error, '讀取今日共讀統計失敗'),
      };
    }
  },

  async sendResetCode(email: string, resetUrlBase: string): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const redirectTo = `${resetUrlBase.replace(/\/$/, '')}/?reset=true`;
      const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
      return error
        ? { success: false, message: errorMessage(error, '寄送重設信失敗') }
        : { success: true, message: '密碼重設連結已寄出' };
    } catch (error) {
      return { success: false, message: errorMessage(error, '寄送重設信失敗') };
    }
  },

  async resetPassword(_email: string, _code: string, newPassword: string): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAuthUser();
      if (!authUser) {
        return { success: false, message: '重設連結已失效，請重新寄送密碼重設信' };
      }
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, message: errorMessage(error, '重設密碼失敗，請重新開啟信件連結') };
      }
      await client.from('devices').delete().eq('user_id', authUser.id);
      safeLocalStorage.setItem(LOGOUT_PENDING_KEY, 'true');
      const { error: signOutError } = await client.auth.signOut({ scope: 'global' });
      return {
        success: true,
        message: signOutError
          ? '密碼已重設，但部分裝置可能仍保持登入，請至裝置管理再次登出'
          : '密碼重設成功，請使用新密碼重新登入',
      };
    } catch (error) {
      return { success: false, message: errorMessage(error, '重設密碼失敗') };
    }
  },

  async changePassword(email: string, oldPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const { data: verifyData, error: verifyError } = await client.auth.signInWithPassword({
        email: normalizeEmail(email),
        password: oldPassword,
      });
      if (verifyError || !verifyData.user) return { success: false, message: '舊密碼不正確' };

      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) return { success: false, message: errorMessage(error, '變更密碼失敗') };

      let passkeysRevoked = true;
      try {
        passkeysRevoked = await revokeAllPasskeys(client);
      } catch {
        passkeysRevoked = false;
      }

      const { error: deviceError } = await client
        .from('devices')
        .delete()
        .eq('user_id', verifyData.user.id);

      safeLocalStorage.setItem(LOGOUT_PENDING_KEY, 'true');
      const { error: signOutError } = await client.auth.signOut({ scope: 'global' });

      if (deviceError || signOutError || !passkeysRevoked) {
        return {
          success: true,
          message: passkeysRevoked
            ? '密碼已變更，所有裝置登入已失效；請重新登入。'
            : '密碼已變更並已登出所有裝置，但手機金鑰撤銷失敗，請到 Supabase 後台確認 Passkeys/WebAuthn。',
        };
      }

      return {
        success: true,
        message: '密碼已變更，手機金鑰與所有裝置登入已失效，請重新登入。',
      };
    } catch (error) {
      return { success: false, message: errorMessage(error, '變更密碼失敗') };
    }
  },

  async getSessions(_email: string, _password: string): Promise<{ success: boolean; sessions?: any[]; message?: string }> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser) return authFailure();
      await touchCurrentDevice(authUser.id);
      const { data, error } = await client
        .from('devices')
        .select('device_id,device_name,last_active_at,created_at')
        .order('last_active_at', { ascending: false });
      if (error) {
        return isAuthFailureError(error)
          ? authFailure()
          : { success: false, message: errorMessage(error, '讀取裝置失敗') };
      }
      return {
        success: true,
        sessions: (data || []).map((item: any) => ({
          deviceId: item.device_id,
          deviceName: item.device_name,
          lastActiveTime: formatDate(item.last_active_at),
          createdTime: formatDate(item.created_at),
        })),
      };
    } catch (error) {
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: errorMessage(error, '讀取裝置失敗') };
    }
  },

  async updateProfile(updates: { name?: string }): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser) return authFailure();

      const nextName = updates.name?.trim();
      if (!nextName) {
        return { success: false, message: '請輸入顯示名稱' };
      }
      if (nextName.length > 20) {
        return { success: false, message: '顯示名稱不可超過 20 個字' };
      }

      const [{ error: profileError }, { error: metadataError }] = await Promise.all([
        client.from('profiles').update({ name: nextName }).eq('id', authUser.id),
        client.auth.updateUser({ data: { name: nextName } }),
      ]);
      const error = profileError || metadataError;
      if (error) {
        return isAuthFailureError(error)
          ? authFailure()
          : { success: false, message: errorMessage(error, '更新帳號資料失敗') };
      }

      return await loadAccount({ ...authUser, user_metadata: { ...(authUser.user_metadata || {}), name: nextName } });
    } catch (error) {
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: errorMessage(error, '更新帳號資料失敗') };
    }
  },

  async completeOnboarding(updates: { name: string; examType: string; team: string }): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser) return authFailure();

      const name = updates.name.trim();
      if (!name || name.length > 20) return { success: false, message: '暱稱需介於 1 到 20 個字元' };
      const [{ error: profileError }, { error: metadataError }] = await Promise.all([
        client.from('profiles').update({ name, exam_type: updates.examType, team: updates.team }).eq('id', authUser.id),
        client.auth.updateUser({ data: { name, exam_type: updates.examType, team: updates.team, onboarding_complete: true } }),
      ]);
      const error = profileError || metadataError;
      if (error) return isAuthFailureError(error) ? authFailure() : { success: false, message: errorMessage(error, '儲存個人資料失敗') };
      return await loadAccount({ ...authUser, user_metadata: { ...(authUser.user_metadata || {}), name, onboarding_complete: true } });
    } catch (error) {
      return isAuthFailureError(error) ? authFailure() : { success: false, message: errorMessage(error, '儲存個人資料失敗') };
    }
  },

  async removeSession(_email: string, _password: string, deviceIdToRemove: string): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser) return authFailure();
      const { error } = await client.rpc('revoke_device_sessions', { p_device_id: deviceIdToRemove });
      if (error) {
        if (error.message?.includes('DEVICE_SESSION_NOT_LINKED')) {
          return { success: false, message: '此舊裝置尚未建立登入對應，請使用「登出其他所有裝置」撤銷登入。' };
        }
        return isAuthFailureError(error)
          ? authFailure()
          : { success: false, message: errorMessage(error, '撤銷裝置登入失敗') };
      }
      return { success: true, message: '已撤銷該裝置的登入；後續受保護的資料請求會被拒絕。' };
    } catch (error) {
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: errorMessage(error, '移除裝置失敗') };
    }
  },

  async removeAllSessions(_email: string, _password: string, keepCurrent = true): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAppUser();
      if (!authUser) return authFailure();
      const { error } = await client.rpc('revoke_other_sessions', { p_keep_current: keepCurrent });
      if (error) {
        return isAuthFailureError(error)
          ? authFailure()
          : { success: false, message: errorMessage(error, '移除裝置失敗') };
      }
      return { success: true, message: keepCurrent ? '已撤銷其他裝置的登入；後續受保護的資料請求會被拒絕。' : '已撤銷所有裝置的登入，請重新登入。' };
    } catch (error) {
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: errorMessage(error, '移除裝置失敗') };
    }
  },

  async deleteAccount(): Promise<AuthResponse> {
    try {
      const client = requireSupabase();
      const authUser = await getCurrentAuthUser();
      if (!authUser) return authFailure();

      const { error } = await client.rpc('delete_own_account');
      if (error) {
        return isAuthFailureError(error)
          ? authFailure()
          : { success: false, message: errorMessage(error, '刪除帳號失敗，請稍後再試或聯絡我們') };
      }

      return { success: true, message: '帳號與雲端資料已刪除' };
    } catch (error) {
      return isAuthFailureError(error)
        ? authFailure()
        : { success: false, message: errorMessage(error, '刪除帳號失敗，請稍後再試或聯絡我們') };
    }
  },

  async logout(): Promise<void> {
    safeLocalStorage.setItem(LOGOUT_PENDING_KEY, 'true');
    try {
      await requireSupabase().auth.signOut({ scope: 'local' });
    } catch {
      // Local cleanup in App still runs when Supabase is unavailable.
    }
  },
};
