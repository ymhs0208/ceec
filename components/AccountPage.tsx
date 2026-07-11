import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Lock, LogOut, Mail, MonitorSmartphone, Shield, Trash2, UserCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AccountPageProps {
  currentUser: User;
  onBack: () => void;
  onLogout: () => void | Promise<void>;
  onUserUpdate: (user: User) => void;
}

type AccountSection = 'overview' | 'security' | 'devices';
type LoadingAction = 'sessions' | 'passkey' | 'password' | 'logout' | 'device' | 'profile' | null;

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const validatePassword = (value: string): string | null => {
  if (value.length < MIN_PASSWORD_LENGTH) return '新密碼至少需要 8 個字元';
  if (value.length > MAX_PASSWORD_LENGTH) return '新密碼不可超過 128 個字元';
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return '新密碼需要同時包含英文字母與數字';
  return null;
};

const passwordStrength = (value: string) => {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(3, Math.max(1, score <= 1 ? 1 : score <= 3 ? 2 : 3));
};

const AccountPage: React.FC<AccountPageProps> = ({ currentUser, onBack, onLogout, onUserUpdate }) => {
  const [section, setSection] = useState<AccountSection>('overview');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState(currentUser.name);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmDevice, setConfirmDevice] = useState<{ id: string; name: string } | 'others' | 'all' | null>(null);

  const currentDeviceId = useMemo(() => authService.getDeviceId(), []);
  const strength = passwordStrength(newPassword);

  const clearNotice = () => {
    setMessage('');
    setError('');
  };

  const fetchSessions = async () => {
    setLoadingAction('sessions');
    clearNotice();
    const res = await authService.getSessions(currentUser.email, '');
    setLoadingAction(null);
    if (res.success) setSessions(res.sessions || []);
    else setError(res.message || '無法載入已登入裝置');
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    setDisplayName(currentUser.name);
  }, [currentUser.name]);

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    clearNotice();
    const nextName = displayName.trim();
    if (!nextName) return setError('請輸入顯示名稱');
    if (nextName.length > 20) return setError('顯示名稱不可超過 20 個字');

    setLoadingAction('profile');
    const res = await authService.updateProfile({ name: nextName });
    setLoadingAction(null);
    if (res.success && res.user) {
      onUserUpdate(res.user);
      setMessage('帳號資料已更新');
    } else {
      setError(res.message || '帳號資料更新失敗');
    }
  };

  const handleRegisterPasskey = async () => {
    setLoadingAction('passkey');
    clearNotice();
    const res = await authService.registerPasskey();
    setLoadingAction(null);
    if (res.success) setMessage(res.message || 'Passkey 已新增');
    else setError(res.message || 'Passkey 新增失敗');
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    clearNotice();
    if (newPassword !== confirmPassword) return setError('兩次輸入的新密碼不一致');
    const passwordError = validatePassword(newPassword);
    if (passwordError) return setError(passwordError);
    if (oldPassword === newPassword) return setError('新密碼不能與目前密碼相同');

    setLoadingAction('password');
    const res = await authService.changePassword(currentUser.email, oldPassword, newPassword);
    setLoadingAction(null);
    if (res.success) {
      setMessage(res.message || '密碼已更新，請重新登入');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(async () => onLogout(), 1200);
    } else {
      setError(res.message || '密碼更新失敗');
    }
  };

  const handleRemoveSession = async (deviceId: string) => {
    setLoadingAction('device');
    clearNotice();
    const res = await authService.removeSession(currentUser.email, '', deviceId);
    if (res.success) {
      setConfirmDevice(null);
      if (deviceId === currentDeviceId) {
        await onLogout();
        return;
      }
      await fetchSessions();
      setMessage('裝置已移除');
    } else {
      setError(res.message || '移除裝置失敗');
    }
    setLoadingAction(null);
  };

  const handleRemoveOtherSessions = async () => {
    setLoadingAction('device');
    clearNotice();
    const res = await authService.removeAllSessions(currentUser.email, '', true);
    if (res.success) {
      setConfirmDevice(null);
      await fetchSessions();
      setMessage('其他裝置已登出');
    } else {
      setError(res.message || '登出其他裝置失敗');
    }
    setLoadingAction(null);
  };

  const handleLogoutAllSessions = async () => {
    setLoadingAction('device');
    clearNotice();
    const res = await authService.removeAllSessions(currentUser.email, '', false);
    if (!res.success) {
      setLoadingAction(null);
      setError(res.message || '登出所有裝置失敗');
      return;
    }
    await onLogout();
  };

  const handleLogoutCurrent = async () => {
    setLoadingAction('logout');
    clearNotice();
    const res = await authService.removeSession(currentUser.email, '', currentDeviceId);
    if (!res.success) {
      setLoadingAction(null);
      setError(res.message || '登出失敗');
      return;
    }
    await onLogout();
  };

  const navItems: { id: AccountSection; label: string; caption: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '帳號總覽', caption: '個人資料與登入狀態', icon: <UserCircle className="h-5 w-5" /> },
    { id: 'security', label: '安全設定', caption: '密碼與 Passkey', icon: <Shield className="h-5 w-5" /> },
    { id: 'devices', label: '裝置管理', caption: `${sessions.length} 個登入裝置`, icon: <MonitorSmartphone className="h-5 w-5" /> },
  ];

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </button>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 sm:flex">
          <CheckCircle2 className="h-4 w-4" />
          已登入
        </div>
      </div>

      <section className="mb-6 overflow-hidden rounded-[1.75rem] border border-indigo-100 bg-white shadow-xl shadow-slate-200/60">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-600">Account Center</p>
            <h1 className="mt-3 truncate text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{currentUser.name}</h1>
            <div className="mt-3 flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-500">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{currentUser.email}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">註冊時間</div>
              <div className="mt-1 text-sm font-black text-slate-900">{currentUser.registrationDate || '-'}</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">最近登入</div>
              <div className="mt-1 text-sm font-black text-slate-900">{currentUser.lastLoginDate || '-'}</div>
            </div>
          </div>
        </div>
      </section>

      {(message || error) && (
        <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-bold ${error ? 'border-red-100 bg-red-50 text-red-600' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-6">
        <aside className="grid grid-cols-3 gap-1.5 rounded-[1.25rem] border border-slate-200 bg-white p-1.5 shadow-sm sm:gap-2 sm:p-2 lg:block lg:rounded-[1.5rem] lg:self-start">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setSection(item.id)} className={`flex min-h-[88px] w-full flex-col items-center justify-start gap-2 rounded-2xl px-2 py-3 text-center transition-all sm:min-h-[92px] lg:mb-1 lg:min-h-0 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-left lg:last:mb-0 ${section === item.id ? 'border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl lg:h-10 lg:w-10 ${section === item.id ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>{item.icon}</span>
              <span className="min-w-0 w-full lg:w-auto">
                <span className="block truncate text-[12px] font-black leading-tight sm:text-sm">{item.label}</span>
                <span className={`mt-1 block text-[10px] font-semibold leading-tight line-clamp-2 sm:text-xs lg:mt-0.5 lg:truncate ${section === item.id ? 'text-indigo-400' : 'text-slate-400'}`}>{item.caption}</span>
              </span>
            </button>
          ))}
        </aside>

        <section className="min-w-0">
          {section === 'overview' && (
            <div className="grid gap-4 md:grid-cols-2">
              <form onSubmit={handleUpdateProfile} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-black text-indigo-700">{currentUser.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Profile</div>
                    <div className="mt-1 truncate text-xl font-black text-slate-950">{currentUser.name}</div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-500">{currentUser.email}</div>
                  </div>
                </div>
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">顯示名稱</span>
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={20} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" />
                </label>
                <button type="submit" disabled={loadingAction === 'profile' || displayName.trim() === currentUser.name} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                  {loadingAction === 'profile' && <Loader2 className="h-4 w-4 animate-spin" />}
                  儲存個人資料
                </button>
              </form>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Actions</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button onClick={() => setSection('security')} className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-left text-indigo-700 transition-all hover:border-indigo-200 hover:bg-indigo-100"><KeyRound className="mb-3 h-5 w-5" /><div className="text-sm font-black">更新安全設定</div></button>
                  <button onClick={() => setSection('devices')} className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-left text-teal-700 transition-all hover:border-teal-200 hover:bg-teal-100"><MonitorSmartphone className="mb-3 h-5 w-5" /><div className="text-sm font-black">查看登入裝置</div></button>
                  <button onClick={fetchSessions} disabled={loadingAction === 'sessions'} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-600 transition-all hover:border-slate-300 hover:bg-white disabled:opacity-60">{loadingAction === 'sessions' ? <Loader2 className="mb-3 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mb-3 h-5 w-5" />}<div className="text-sm font-black">重新整理狀態</div></button>
                </div>
              </div>

              <button onClick={handleLogoutCurrent} disabled={loadingAction === 'logout'} className="md:col-span-2 flex items-center justify-between rounded-[1.5rem] border border-red-100 bg-red-50 p-5 text-left text-red-600 transition-all hover:bg-red-100 disabled:opacity-60">
                <span><span className="block text-sm font-black">登出目前裝置</span><span className="mt-1 block text-xs font-semibold text-red-400">此裝置會停止同步，其他裝置不受影響。</span></span>
                {loadingAction === 'logout' ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
              </button>
            </div>
          )}

          {section === 'security' && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <form onSubmit={handleChangePassword} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">修改密碼</h2>
                <div className="mt-5 grid gap-4">
                  <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">目前密碼</span><input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required maxLength={MAX_PASSWORD_LENGTH} autoComplete="current-password" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">新密碼</span><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /><div className="mt-2 flex gap-1.5">{[1, 2, 3].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${step <= strength ? 'bg-indigo-500' : 'bg-slate-100'}`} />)}</div></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">確認新密碼</span><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /></label>
                </div>
                <button type="submit" disabled={loadingAction === 'password'} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-60 sm:w-auto">{loadingAction === 'password' && <Loader2 className="h-5 w-5 animate-spin" />}儲存新密碼</button>
              </form>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Lock className="h-6 w-6" /></div>
                <h2 className="mt-4 text-xl font-black text-slate-950">Passkey</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">使用系統支援的生物辨識或安全金鑰，之後可以更快登入。</p>
                <button onClick={handleRegisterPasskey} disabled={loadingAction === 'passkey' || !authService.isPasskeySupported()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-5 py-3.5 text-sm font-black text-violet-700 transition-all hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50">{loadingAction === 'passkey' ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}新增 Passkey</button>
              </div>
            </div>
          )}

          {section === 'devices' && (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="text-xl font-black text-slate-950">已登入裝置</h2><p className="mt-1 text-sm font-semibold text-slate-500">管理目前保留登入狀態的瀏覽器與裝置。</p></div>
                <button onClick={fetchSessions} disabled={loadingAction === 'sessions'} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-60">{loadingAction === 'sessions' && <Loader2 className="h-4 w-4 animate-spin" />}重新整理</button>
              </div>

              {confirmDevice && (
                <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="font-black text-red-700">確認移除登入狀態</div>
                  <div className="mt-1 text-sm font-semibold text-red-500">{confirmDevice === 'others' ? '其他裝置將需要重新登入。' : confirmDevice === 'all' ? '所有裝置都會被登出，包含目前這台裝置。' : `${confirmDevice.name} 將被登出。`}</div>
                  <div className="mt-3 flex gap-2"><button onClick={() => setConfirmDevice(null)} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-600">取消</button><button onClick={() => confirmDevice === 'others' ? handleRemoveOtherSessions() : confirmDevice === 'all' ? handleLogoutAllSessions() : handleRemoveSession(confirmDevice.id)} disabled={loadingAction === 'device'} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white disabled:opacity-60">{loadingAction === 'device' && <Loader2 className="h-4 w-4 animate-spin" />}確認移除</button></div>
                </div>
              )}

              <div className="space-y-3">
                {sessions.map((session, index) => {
                  const isCurrent = session.deviceId === currentDeviceId;
                  return (
                    <div key={session.deviceId || index} className={`rounded-[1.25rem] border p-3 transition-all sm:p-4 ${isCurrent ? 'border-indigo-200 bg-indigo-50/80 shadow-sm shadow-indigo-100/70' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)_auto] sm:items-center">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}><MonitorSmartphone className="h-5 w-5" /></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"><span className="min-w-0 truncate text-sm font-black text-slate-900 sm:text-base">{session.deviceName}</span>{isCurrent && <span className="inline-flex w-fit flex-shrink-0 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white">目前裝置</span>}</div>
                            <div className="mt-2 flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${isCurrent ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{isCurrent ? '正在使用' : '已授權'}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">#{index + 1}</span></div>
                          </div>
                        </div>
                        <div className={`grid gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold sm:bg-white/70 ${isCurrent ? 'border-indigo-100 bg-white/80 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                          <div className="flex items-center justify-between gap-3"><span className="flex-shrink-0 text-slate-400">最近活動</span><span className="min-w-0 truncate text-right font-black text-slate-700">{session.lastActiveTime || '-'}</span></div>
                          <div className="flex items-center justify-between gap-3"><span className="flex-shrink-0 text-slate-400">建立時間</span><span className="min-w-0 truncate text-right font-black text-slate-600">{session.createdTime || '-'}</span></div>
                        </div>
                        <button onClick={() => setConfirmDevice({ id: session.deviceId, name: session.deviceName })} disabled={loadingAction === 'device'} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition-all hover:bg-red-100 disabled:opacity-50 sm:w-auto sm:px-3" title="移除此裝置"><Trash2 className="h-4 w-4" /><span className="sm:hidden">移除此裝置</span></button>
                      </div>
                    </div>
                  );
                })}
                {sessions.length === 0 && loadingAction !== 'sessions' && <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm font-semibold text-slate-400">目前沒有可顯示的裝置</div>}
              </div>

              {sessions.length > 1 && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => setConfirmDevice('others')} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-3.5 text-sm font-black text-red-600 transition-all hover:bg-red-100 sm:w-auto"><LogOut className="h-5 w-5" />登出其他所有裝置</button>
                  <button onClick={() => setConfirmDevice('all')} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-red-100 transition-all hover:bg-red-600 sm:w-auto"><LogOut className="h-5 w-5" />登出所有裝置</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default AccountPage;
