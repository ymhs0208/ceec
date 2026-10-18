import ModalLayer from './ModalLayer';
import './AccountPage.css';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, Cloud, Fingerprint, KeyRound, Loader2, Lock, LogOut, Mail, MonitorSmartphone, RefreshCw, Shield, Trash2, UserCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AccountPageProps {
  currentUser: User;
  onBack: () => void;
  onLogout: (discardData?: boolean) => void | Promise<void>;
  onPrepareLogout: () => boolean;
  onUserUpdate: (user: User) => void;
  onSync: () => void;
  isSyncing: boolean;
}

type AccountSection = 'overview' | 'security' | 'devices';
type LoadingAction = 'sessions' | 'passkey' | 'password' | 'logout' | 'device' | 'profile' | 'delete' | null;

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

const AccountPage: React.FC<AccountPageProps> = ({ currentUser, onBack, onLogout, onPrepareLogout, onUserUpdate, onSync, isSyncing }) => {
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
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

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
    if (!onPrepareLogout()) return;

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
    if (deviceId === currentDeviceId && !onPrepareLogout()) return;
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
      setMessage(res.message || '該裝置的登入已撤銷');
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
      setMessage(res.message || '其他裝置的登入已撤銷');
    } else {
      setError(res.message || '登出其他裝置失敗');
    }
    setLoadingAction(null);
  };

  const handleLogoutAllSessions = async () => {
    if (!onPrepareLogout()) return;
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
    if (!onPrepareLogout()) return;
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

  const handleDeleteAccount = async () => {
    clearNotice();
    if (deleteConfirmation !== '刪除') {
      setError('請輸入「刪除」以確認永久刪除帳號');
      return;
    }

    setLoadingAction('delete');
    const res = await authService.deleteAccount();
    if (!res.success) {
      setLoadingAction(null);
      setError(res.message || '刪除帳號失敗');
      return;
    }

    await onLogout(true);
  };

  const navItems: { id: AccountSection; label: string; caption: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '帳號總覽', caption: '個人資料與登入狀態', icon: <UserCircle className="h-5 w-5" /> },
    { id: 'security', label: '安全設定', caption: '密碼與 Passkey', icon: <Shield className="h-5 w-5" /> },
    { id: 'devices', label: '裝置管理', caption: `${sessions.length} 個登入裝置`, icon: <MonitorSmartphone className="h-5 w-5" /> },
  ];

  return (
    <main id="main-content" className="account-page">
      <button onClick={onBack} className="account-back"><ArrowLeft size={15} />返回首頁</button>
      <header className="account-heading">
        <div>
          <p className="account-eyebrow"><span />ACCOUNT CENTER</p>
          <h1>你的帳號，<span>自在管理。</span></h1>
          <p className="account-intro">管理個人資料、登入安全與裝置，安心專注每一天的學習。</p>
        </div>
        <span className="account-status"><CheckCircle2 size={14} />已登入</span>
      </header>

      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-identity">
            <div className="account-avatar">{currentUser.name.charAt(0).toUpperCase()}<span><CheckCircle2 size={14} /></span></div>
            <h2>{currentUser.name}</h2>
            <p title={currentUser.email}>{currentUser.email}</p>
            <span className="account-member">學習，從這裡繼續</span>
            <dl className="account-dates">
              <div><dt><CalendarDays size={14} />註冊日期</dt><dd>{currentUser.registrationDate || '尚無紀錄'}</dd></div>
              <div><dt><CheckCircle2 size={14} />最近登入</dt><dd>{currentUser.lastLoginDate || '尚無紀錄'}</dd></div>
            </dl>
          </div>
          <div className="account-sidebar-note"><Shield size={19} /><div><strong>讓學習紀錄跟著你</strong><p>定期同步資料，跨裝置也能接續學習。</p></div></div>
        </aside>

        <div className="account-workspace">
          <nav className="account-nav" aria-label="帳號設定分類">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => { setSection(item.id); clearNotice(); }} aria-pressed={section === item.id}>
                <span className="account-nav-icon">{item.icon}</span>
                <span><strong>{item.label}</strong><small>{item.caption}</small></span>
                <ChevronRight size={14} />
              </button>
            ))}
          </nav>

          {(message || error) && <div role={error ? 'alert' : 'status'} className={`account-notice ${error ? 'account-notice-error' : ''}`}>{error || message}</div>}

          <section className="account-content" aria-label={navItems.find(item => item.id === section)?.label}>
          {section === 'overview' && (
            <div className="account-overview">
              <form onSubmit={handleUpdateProfile} className="account-card account-profile">
                <div className="account-card-heading"><span className="account-card-icon"><UserCircle size={20} /></span><div><h2>個人資料</h2><p>用你喜歡的名字，開始每一天。</p></div><span className="account-card-index">01</span></div>
                <label className="account-field"><span>顯示名稱 <small>最多 20 個字</small></span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={20} required autoComplete="nickname" /></label>
                <div className="account-email"><span>電子郵件</span><div><Mail size={16} /><span>{currentUser.email}</span><Lock size={13} /></div><small>此信箱用於登入與帳號識別。</small></div>
                <div className="account-form-footer"><span>{displayName.trim() === currentUser.name ? '個人資料已是最新' : '你有尚未儲存的變更'}</span><button type="submit" disabled={loadingAction === 'profile' || !displayName.trim() || displayName.trim() === currentUser.name} className="account-primary">{loadingAction === 'profile' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}儲存變更</button></div>
              </form>

              <div className="account-card account-sync">
                <div className="account-sync-top"><span className="account-cloud"><Cloud size={25} /></span><span className="account-small-label">CLOUD SYNC</span></div>
                <h2>你的努力，隨時接續。</h2>
                <p>將學習紀錄同步到雲端，<br />在不同裝置延續你的進度。</p>
                <button onClick={onSync} disabled={isSyncing} className="account-sync-button">{isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}{isSyncing ? '同步資料中…' : '立即同步資料'}<ArrowUpRight size={16} /></button>
                <span className="account-sync-caption">每一份累積，都值得好好保存。</span>
              </div>

              <div className="account-card account-shortcuts">
                <div className="account-card-heading"><div><h2>登入與安全</h2><p>為帳號多一份安心。</p></div><span className="account-card-index">02</span></div>
                <button onClick={() => setSection('security')} className="account-action-row"><span className="account-action-icon"><Fingerprint size={21} /></span><span><strong>密碼與 Passkey</strong><small>更新密碼，或使用生物辨識快速登入</small></span><ArrowUpRight size={17} /></button>
                <button onClick={() => setSection('devices')} className="account-action-row"><span className="account-action-icon"><MonitorSmartphone size={21} /></span><span><strong>登入裝置</strong><small>{loadingAction === 'sessions' ? '正在載入裝置…' : `查看與管理 ${sessions.length} 個已登入裝置`}</small></span><ArrowUpRight size={17} /></button>
                <button onClick={fetchSessions} disabled={loadingAction === 'sessions'} className="account-refresh">{loadingAction === 'sessions' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}重新整理登入狀態</button>
              </div>

              <div className="account-card account-operations">
                <div className="account-card-heading"><div><h2>帳號操作</h2><p>管理目前的登入狀態與帳號。</p></div><span className="account-card-index">03</span></div>
                <button onClick={handleLogoutCurrent} disabled={loadingAction === 'logout'} className="account-action-row"><span className="account-action-icon"><LogOut size={20} /></span><span><strong>登出目前裝置</strong><small>其他裝置仍會保持登入</small></span>{loadingAction === 'logout' ? <Loader2 size={17} className="animate-spin" /> : <ChevronRight size={17} />}</button>
                <div className="account-delete-row"><div><strong>永久刪除帳號</strong><p>雲端與本機資料將永久移除，無法復原。</p></div><button onClick={() => { clearNotice(); setDeleteConfirmation(''); setIsDeleteAccountOpen(true); }} aria-expanded={isDeleteAccountOpen}><Trash2 size={14} />刪除帳號</button></div>
                {isDeleteAccountOpen && (
                  <div className="account-delete-confirm">
                    <label htmlFor="account-delete-confirmation">請輸入「刪除」以確認永久刪除帳號</label>
                    <input id="account-delete-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" placeholder="刪除" />
                    <div><button onClick={() => { setIsDeleteAccountOpen(false); setDeleteConfirmation(''); }} disabled={loadingAction === 'delete'}>取消</button><button onClick={handleDeleteAccount} disabled={loadingAction === 'delete' || deleteConfirmation !== '刪除'}>{loadingAction === 'delete' && <Loader2 size={14} className="animate-spin" />}永久刪除</button></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="grid gap-4 md:grid-cols-2">
              <form onSubmit={handleChangePassword} className="h-full rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">修改密碼</h2><p className="mt-2 text-sm text-slate-500">至少 8 個字元，包含英文字母與數字。更新後需重新登入。</p>
                <div className="mt-5 grid gap-4">
                  <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">目前密碼</span><input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required maxLength={MAX_PASSWORD_LENGTH} autoComplete="current-password" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">新密碼</span><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /><div className="mt-2 flex gap-1.5">{[1, 2, 3].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${step <= strength ? 'bg-indigo-500' : 'bg-slate-100'}`} />)}</div></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">確認新密碼</span><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /></label>
                </div>
                <button type="submit" disabled={loadingAction === 'password'} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-60 sm:w-auto">{loadingAction === 'password' && <Loader2 className="h-5 w-5 animate-spin" />}儲存新密碼</button>
              </form>

              <div className="h-full rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Lock className="h-6 w-6" /></div>
                <h2 className="mt-4 text-xl font-black text-slate-950">Passkey 快速登入</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">使用系統支援的生物辨識或安全金鑰，之後可以更快登入。</p>
                {!authService.isPasskeySupported() && <p className="mt-4 text-sm text-slate-500">此瀏覽器目前不支援 Passkey，請改用支援的瀏覽器或裝置。</p>}
                <button onClick={handleRegisterPasskey} disabled={loadingAction === 'passkey' || !authService.isPasskeySupported()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-5 py-3.5 text-sm font-black text-violet-700 transition-all hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50">{loadingAction === 'passkey' ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}新增 Passkey</button>
              </div>
            </div>
          )}

          {section === 'devices' && (
            <div className="w-full rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="text-xl font-black text-slate-950">已登入裝置</h2><p className="mt-1 text-sm font-semibold text-slate-500">管理目前保留登入狀態的瀏覽器與裝置。</p></div>
                <button onClick={fetchSessions} disabled={loadingAction === 'sessions'} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-60">{loadingAction === 'sessions' && <Loader2 className="h-4 w-4 animate-spin" />}重新整理</button>
              </div>

              {confirmDevice && createPortal(
                <ModalLayer className="fixed inset-0 z-[1100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="session-confirm-title">
                  <button type="button" onClick={() => !loadingAction && setConfirmDevice(null)} className="absolute inset-0 cursor-default bg-slate-950/65 backdrop-blur-sm" aria-label="取消登出操作" />
                  <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,.38)]">
                    <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 to-red-600 px-6 pb-7 pt-6 text-white"><div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[14px] border-white/15" /><div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><LogOut className="h-6 w-6" /></div><h2 id="session-confirm-title" className="relative mt-4 text-xl font-black">確認登出裝置</h2><p className="relative mt-2 text-sm font-semibold leading-relaxed text-rose-50/90">{confirmDevice === 'others' ? '其他已登入裝置將被登出，需要重新登入才能使用。' : confirmDevice === 'all' ? '所有裝置都會被登出，包含目前這台裝置。' : `${confirmDevice.name} 將被登出。`}</p></div>
                    <div className="p-6"><div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold leading-relaxed text-rose-700">登入撤銷後，後續受保護的資料請求會被拒絕。裝置畫面可能在下一次連線檢查時才更新；已顯示的資料不會自動消失。</div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => setConfirmDevice(null)} disabled={loadingAction === 'device'} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:opacity-60">取消</button><button onClick={() => confirmDevice === 'others' ? handleRemoveOtherSessions() : confirmDevice === 'all' ? handleLogoutAllSessions() : handleRemoveSession(confirmDevice.id)} disabled={loadingAction === 'device'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-200 transition hover:bg-red-600 disabled:opacity-60">{loadingAction === 'device' && <Loader2 className="h-4 w-4 animate-spin" />}確認登出</button></div></div>
                  </div>
                </ModalLayer>,
                document.body,
              )}

              <div className="space-y-3">
                {loadingAction === 'sessions' && <div role="status" className="account-device-loading"><Loader2 size={18} className="animate-spin" />正在載入登入裝置…</div>}
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
      </div>
      <footer className="account-footer"><Lock size={12} />專注學習，帳號設定在這裡安心管理。</footer>
    </main>
  );
};

export default AccountPage;
