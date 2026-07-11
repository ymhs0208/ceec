type SupabaseClient = any;

declare global {
  interface Window {
    supabase?: {
      createClient: (url: string, key: string, options?: Record<string, unknown>) => SupabaseClient;
    };
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const initialAuthCallbackHref = window.location.href;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && window.supabase);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? window.supabase!.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        experimental: {
          passkey: true,
        },
      },
    })
  : null;

export const requireSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('尚未設定 Supabase。請先填寫 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY。');
  }
  return supabase;
};
