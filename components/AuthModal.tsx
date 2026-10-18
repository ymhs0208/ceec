
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, Loader2, AlertCircle, CheckCircle2, Calendar, LogOut, KeyRound, ShieldQuestion, ChevronRight, ChevronLeft, Send, Eye, EyeOff, MonitorSmartphone, Trash2, MapPin, Sparkles, Settings, Cloud } from 'lucide-react';
import { authService } from '../services/authService';
import { AppData, User } from '../types';
import TeamSelectModal from './TeamSelectModal';
import ExamSelectModal from './ExamSelectModal';
import { EXAM_PRESETS } from '../constants';
import './AuthPage.css';

interface AuthPageProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, data?: AppData, encryptionKey?: string) => void;
  onLogout: () => void | Promise<void>;
  currentData: AppData;
  currentUser: User | null;
  initialMode?: AuthMode;
  initialEmail?: string;
  initialResetCode?: string;
  onShowPrivacy?: () => void;
  onShowInstructions?: () => void;
  onShowTerms?: () => void;
}

type AuthMode = 'login' | 'signup' | 'onboarding' | 'forgot' | 'reset' | 'profile' | 'change-password' | 'devices';
type LoadingAction = 'password' | 'otp-send' | 'otp-verify' | 'passkey' | 'passkey-register' | null;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getAuthRedirectBase = () => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
};

const validateNewPassword = (value: string): string | null => {
  if (value.length < MIN_PASSWORD_LENGTH) return '密碼至少需要 8 個字元';
  if (value.length > MAX_PASSWORD_LENGTH) return '密碼不可超過 128 個字元';
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return '密碼需同時包含英文字母與數字';
  }
  return null;
};

const maskEmail = (email: string) => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  const maskedName = name.length > 3 
    ? name.substring(0, 3) + '***' 
    : name.substring(0, 1) + '***';
  return `${maskedName}@${domain}`;
};

const getPasswordStrength = (pass: string) => {
  if (!pass || pass.length < MIN_PASSWORD_LENGTH) return 0;
  
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  
  if (score <= 1) return 1; // 弱
  if (score <= 3) return 2; // 中
  return 3; // 強
};

const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  
  const strength = getPasswordStrength(password);
  const labels = ['太短', '弱', '中', '強'];
  const colors = ['bg-slate-200', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'];
  const textColors = ['text-slate-400', 'text-red-500', 'text-amber-600', 'text-emerald-600'];
  
  return (
    <div className="mt-2 px-1">
      <div className="flex gap-1.5 h-1.5">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`flex-1 rounded-full transition-all duration-500 ${i <= strength ? colors[strength] : 'bg-slate-100'}`}
          />
        ))}
      </div>
      <div className="flex justify-between items-center mt-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${textColors[strength]}`}>
          密碼強度：{labels[strength]}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">至少 8 字元，包含字母與數字</span>
      </div>
    </div>
  );
};

const AuthPage: React.FC<AuthPageProps> = ({ isOpen, onClose, onLoginSuccess, onLogout, currentData, currentUser, initialMode, initialEmail, initialResetCode, onShowPrivacy, onShowInstructions, onShowTerms }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode || 'login');
  
  // Form States
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [name, setName] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [resetCode, setResetCode] = useState(initialResetCode || '');
  const [newPassword, setNewPassword] = useState('');
  const [oneTimeStep, setOneTimeStep] = useState<1 | 2>(1);
  const [oneTimeCode, setOneTimeCode] = useState('');
  
  // Registration Team State
  const [selectedTeam, setSelectedTeam] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [examType, setExamType] = useState('116gsat');
  const [showExamModal, setShowExamModal] = useState(false);

  // Forgot Password Flow States
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1: Input Email, 2: Email sent

  // Change Password States
  const [oldPassword, setOldPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Device Management States
  const [sessions, setSessions] = useState<any[]>([]);
  const [confirmDeviceLogout, setConfirmDeviceLogout] = useState<{ id: string, name: string } | 'all' | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingSignup, setPendingSignup] = useState<{ user: User; email: string; encryptionKey: string } | null>(null);

  // Set initial mode based on auth state
  useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setMode(initialMode);
      } else {
        setMode('login');
      }
      
      if (!initialMode) {
        resetForm();
      } else {
        setError('');
        setMessage('');
        setLoading(false);
        setPassword('');
        setShowPassword(false);
        setNewPassword('');
        setOneTimeStep(1);
        setOneTimeCode('');
        setOldPassword('');
        setConfirmPassword('');
        setForgotStep(1);
        setConfirmDeviceLogout(null);
        setShowLogoutConfirm(false);
        if (initialEmail) setEmail(initialEmail);
        if (initialResetCode) setResetCode(initialResetCode);
      }
    }
  }, [isOpen, currentUser, initialMode, initialEmail, initialResetCode]);

  useEffect(() => {
    const publicModes = ['login', 'signup', 'forgot', 'reset'];
    if (!isOpen || !publicModes.includes(mode)) return;

    const url = new URL(window.location.href);
    if (url.searchParams.has('code') || url.searchParams.get('reset') === 'true') return;
    const parts = url.pathname.split('/').filter(Boolean);
    const authIndex = parts.lastIndexOf('auth');
    if (authIndex < 0) return;
    parts.splice(authIndex + 1);
    parts.push(mode);
    url.pathname = `/${parts.join('/')}`;
    url.searchParams.delete('authMode');
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
      window.history.replaceState(window.history.state, document.title, nextUrl);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const resetForm = () => {
    setError('');
    setMessage('');
    setLoading(false);
    setPassword('');
    setShowPassword(false);
    setNewPassword('');
    setOneTimeStep(1);
    setOneTimeCode('');
    setOldPassword('');
    setConfirmPassword('');
    setResetCode('');
    setSelectedTeam('');
    setShowTeamModal(false);
    setForgotStep(1);
    setConfirmDeviceLogout(null);
    setShowLogoutConfirm(false);
  };

  const fetchSessions = async () => {
    if (!currentUser) return;
    setLoading(true);
    setLoadingAction('password');
    const res = await authService.getSessions(currentUser.email, '');
    setLoading(false);
    setLoadingAction(null);
    if (res.success && res.sessions) {
      setSessions(res.sessions);
    } else {
      setError(res.message || '無法取得裝置列表');
    }
  };

  const handleRemoveSession = async (deviceIdToRemove: string) => {
    if (!currentUser) return;
    setLoading(true);
    setLoadingAction('otp-send');
    const res = await authService.removeSession(currentUser.email, '', deviceIdToRemove);
    if (res.success) {
      setConfirmDeviceLogout(null);
      if (deviceIdToRemove === authService.getDeviceId()) {
        await onLogout();
        onClose();
      } else {
        setMessage(res.message || '該裝置的登入已撤銷');
        await fetchSessions();
      }
    } else {
      setLoading(false);
      setError(res.message || '移除失敗');
    }
  };

  const handleRemoveAllSessions = async () => {
    if (!currentUser) return;
    setLoading(true);
    const res = await authService.removeAllSessions(currentUser.email, '', true);
    if (res.success) {
      setConfirmDeviceLogout(null);
      setMessage(res.message || '其他裝置的登入狀態已撤銷');
      await fetchSessions();
    } else {
      setLoading(false);
      setError(res.message || '登出失敗');
    }
  };

  // Validation Helpers
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const hasStrangeChars = (str: string) => {
    return /[<>]/.test(str);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isValidEmail(email)) {
      setError("請輸入有效的 Email 格式");
      return;
    }

    setLoading(true);
    setLoadingAction('password');
    
    const cleanEmail = normalizeEmail(email);
    setEmail(cleanEmail);
    const res = await authService.login(cleanEmail, password);
    setLoading(false);
    setLoadingAction(null);

    if (res.success && res.user) {
      if (res.user.needsOnboarding && res.encryptionKey) {
        setPendingSignup({ user: res.user, email: cleanEmail, encryptionKey: res.encryptionKey });
        setMode('onboarding');
        return;
      }
      onLoginSuccess(res.user, res.data, res.encryptionKey);
      onClose();
    } else {
      setPassword('');
      if (res.isLocked) {
        setError(res.message || '帳號已被鎖定');
      } else {
        setError(res.message || '登入失敗');
      }
    }
  };

  const handleOneTimeLogin = async () => {
    setError('');
    setMessage('');

    if (!isValidEmail(email)) {
      setError('請輸入正確的 Email');
      return;
    }

    setLoading(true);
    setLoadingAction('otp-send');
    const cleanEmail = normalizeEmail(email);
    setEmail(cleanEmail);
    const res = await authService.sendOneTimeLoginLink(cleanEmail, getAuthRedirectBase());
    setLoading(false);
    setLoadingAction(null);

    if (res.success) {
      setOneTimeStep(2);
      setOneTimeCode('');
      setMessage('一次性登入連結已寄出，請到信箱開啟連結，或輸入信中的一次性驗證碼。');
    } else {
      setError(res.message || '寄送一次性登入連結失敗');
    }
  };

  const handleVerifyOneTimeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isValidEmail(email)) {
      setError('請輸入正確的 Email');
      return;
    }
    if (!oneTimeCode.trim()) {
      setError('請輸入一次性驗證碼');
      return;
    }

    setLoading(true);
    setLoadingAction('otp-verify');
    const cleanEmail = normalizeEmail(email);
    setEmail(cleanEmail);
    const res = await authService.verifyOneTimeLoginCode(cleanEmail, oneTimeCode);
    setLoading(false);
    setLoadingAction(null);

    if (res.success && res.user) {
      onLoginSuccess(res.user, res.data, res.encryptionKey);
      onClose();
    } else {
      setError(res.message || '一次性驗證碼錯誤或已失效');
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    setLoadingAction('passkey');
    const res = await authService.loginWithPasskey();
    setLoading(false);
    setLoadingAction(null);

    if (res.success && res.user) {
      onLoginSuccess(res.user, res.data, res.encryptionKey);
      onClose();
    } else {
      setError(res.message || '手機金鑰登入失敗');
    }
  };

  const handleRegisterPasskey = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    setLoadingAction('passkey-register');
    const res = await authService.registerPasskey();
    setLoading(false);
    setLoadingAction(null);

    if (res.success) {
      setMessage(res.message || '手機金鑰已新增');
    } else {
      setError(res.message || '新增手機金鑰失敗');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Strict Validation
    if (!isValidEmail(email)) {
      setError("請輸入有效的 Email 格式");
      return;
    }
    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不符");
      return;
    }
    const passwordError = validateNewPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (false && !selectedTeam) {
      setError("請選擇您要加入的戰隊");
      return;
    }
    if (!isAgreed) {
      setError("請閱讀並勾選同意服務條款，確認已了解隱私權政策");
      return;
    }
    if (false && !name.trim()) {
      setError("請輸入暱稱");
      return;
    }
    if (false && name.trim().length > 20) {
      setError("暱稱過長，請限制在 20 字以內");
      return;
    }
    if (hasStrangeChars(email)) {
      setError("輸入內容包含無效字元");
      return;
    }
    setLoading(true);

    const cleanEmail = normalizeEmail(email);
    setEmail(cleanEmail);
    const res = await authService.signup(cleanEmail, password, '');
    
    if (res.success) {
      const loginRes = await authService.login(cleanEmail, password);
      
       if (false && loginRes.success && loginRes.user && loginRes.encryptionKey) {
         const selectedPreset = EXAM_PRESETS.find(p => p.id === examType);
         const dataToSync = { 
            ...currentData, 
            team: selectedTeam, 
            targetExam: examType,
            targetDateStr: selectedPreset ? selectedPreset.date : currentData.targetDateStr
         };
         const syncRes = await authService.syncData(cleanEmail, '', dataToSync, loginRes.encryptionKey);
         
         if (syncRes.success) {
            sessionStorage.setItem('gsat_welcome_type', 'signup');
            onLoginSuccess(loginRes.user, dataToSync, loginRes.encryptionKey);
            onClose();
            return;
         }
      }
       if (loginRes.success && loginRes.user && loginRes.encryptionKey) {
          setPendingSignup({ user: loginRes.user, email: cleanEmail, encryptionKey: loginRes.encryptionKey });
          setLoading(false);
          setMode('onboarding');
          return;
       }
       setLoading(false);
      setMessage('帳號已建立，請依信箱驗證要求完成驗證後登入。');
      setMode('login');
    } else {
      setLoading(false);
      setError(res.message || '註冊失敗');
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pendingSignup) {
      setMode('login');
      return;
    }
    if (!name.trim() || name.trim().length > 20 || hasStrangeChars(name)) {
      setError('請輸入最多 20 個字元的暱稱');
      return;
    }
    if (!selectedTeam) {
      setError('請選擇就讀學校');
      return;
    }
    setLoading(true);
    const profileRes = await authService.completeOnboarding({ name: name.trim(), examType, team: selectedTeam });
    if (!profileRes.success) {
      setLoading(false);
      setError(profileRes.message || '儲存個人資料失敗');
      return;
    }
    const selectedPreset = EXAM_PRESETS.find(p => p.id === examType);
    const dataToSync = { ...currentData, team: selectedTeam, targetExam: examType, targetDateStr: selectedPreset ? selectedPreset.date : currentData.targetDateStr };
    const syncRes = await authService.syncData(pendingSignup.email, '', dataToSync, pendingSignup.encryptionKey);
    setLoading(false);
    if (!syncRes.success) {
      setError(syncRes.message || '同步個人資料失敗');
      return;
    }
    onLoginSuccess(profileRes.user || pendingSignup.user, dataToSync, pendingSignup.encryptionKey);
    onClose();
  };

  // Forgot Password: Supabase only supports email-based password reset here.
  const handleCheckEmailForRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isValidEmail(email)) {
       setError("請輸入有效的 Email");
       return;
    }

    await handleSendCode();
  };

  // Option A: Send Email Code
  const handleSendCode = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    const cleanEmail = normalizeEmail(email);
    setEmail(cleanEmail);
    const resetUrlBase = getAuthRedirectBase();
    const res = await authService.sendResetCode(cleanEmail, resetUrlBase);
    setLoading(false);

    if (res.success) {
      setMessage('密碼重設連結已發送至您的信箱');
      setForgotStep(2);
    } else {
      setError(res.message || '發送失敗');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError("兩次輸入的新密碼不符");
      return;
    }
    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    const res = await authService.resetPassword(email, resetCode, newPassword);
    setLoading(false);

    if (res.success) {
      setMessage(res.message || '密碼重設成功，請使用新密碼登入');
      setTimeout(() => setMode('login'), 1500);
    } else {
      setError(res.message || '重設失敗');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPassword !== confirmPassword) {
      setError("兩次輸入的新密碼不符");
      return;
    }
    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (oldPassword === newPassword) {
      setError("新密碼不可與目前密碼相同");
      return;
    }
    
    resetForm();
    setLoading(true);

    const res = await authService.changePassword(currentUser.email, oldPassword, newPassword);
    setLoading(false);

    if (res.success) {
      setMessage(res.message || '密碼已變更，手機金鑰與所有裝置登入已失效，請重新登入。');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(async () => {
        await onLogout();
        onClose();
      }, 1500);
    } else {
      setError(res.message || '修改失敗，請確認舊密碼是否正確');
    }
  };

  const renderHeader = () => {
    switch (mode) {
      case 'login': return oneTimeStep === 2 ? '查看登入信' : '歡迎回來';
      case 'signup': return '建立帳號';
      case 'forgot': return forgotStep === 1 ? '忘記密碼' : '檢查您的信箱';
      case 'reset': return '重設密碼';
      case 'profile': return '帳號管理';
      case 'change-password': return '修改密碼';
      case 'devices': return '裝置管理';
      case 'onboarding': return '完成個人資料';
      default: return '';
    }
  };

  const renderSubHeader = () => {
    switch (mode) {
      case 'login': return oneTimeStep === 2 ? '開啟信件連結，或輸入一次性驗證碼。' : '登入帳號，延續你的學習進度。';
      case 'signup': return '建立帳號，讓每一段專注都有紀錄。';
      case 'forgot': return forgotStep === 1 ? '輸入帳號信箱，接收密碼重設連結。' : '請開啟信件中的連結，設定新的密碼。';
      case 'reset': return '設定新密碼';
      case 'profile': return '查看您的帳號資訊';
      case 'change-password': return '定期更換密碼以保護帳號安全';
      case 'devices': return '管理您目前已登入的裝置';
      case 'onboarding': return '讓我們為你準備專屬的學習空間';
      default: return '';
    }
  };

  const isPublicAuthMode = ['login', 'signup', 'onboarding', 'forgot', 'reset'].includes(mode);
  const isLoginMode = mode === 'login';
  const publicAuthIntro = {
    login: {
      eyebrow: 'Focus Space',
      title: <>回到你的<br />讀書進度</>,
      body: '登入後同步計時紀錄、排行榜積分、目標設定與跨裝置資料。',
      cardTitle: '讀書紀錄',
      cardBody: '跨裝置延續專注歷程',
    },
    signup: {
      eyebrow: 'Join Focus Space',
      title: <>建立你的<br />讀書帳號</>,
      body: '從一個小目標開始，整理你的任務、讀書紀錄與備考日常。',
      cardTitle: '學習資料',
      cardBody: '登入後同步紀錄，重要資料仍請另行保存。',
    },
    onboarding: {
      eyebrow: 'Your Focus Profile',
      title: <>設定你的<br />學習起點</>,
      body: '用幾項簡單資料，建立適合你目標的 Focus Space 學習體驗。',
      cardTitle: '資料隨時可調整',
      cardBody: '完成後可隨時在帳號管理中更新設定。',
    },
    forgot: {
      eyebrow: 'Account Recovery',
      title: <>找回你的<br />登入權限</>,
      body: '透過帳號信箱重新設定密碼，回到你的學習空間。',
      cardTitle: '安全重設',
      cardBody: '透過信箱驗證帳號身分',
    },
    reset: {
      eyebrow: 'Reset Password',
      title: <>設定新的<br />帳號密碼</>,
      body: '請建立一組安全的新密碼，完成後即可重新登入。',
      cardTitle: '密碼保護',
      cardBody: '至少 8 字元並包含字母與數字',
    },
  } as const;
  const currentPublicIntro = isPublicAuthMode ? publicAuthIntro[mode as keyof typeof publicAuthIntro] : null;

  return (
    <>
    <main id="main-content" className={`auth-page auth-view-${mode}`}>
      <header className="auth-page-header" aria-label="Focus Space 導覽">
        <button type="button" onClick={onClose} className="auth-brand" aria-label="返回首頁">
          <img src="/apple-touch-icon.png" alt="" width="36" height="36" /><span><strong>大考倒數</strong><small>FOCUS SPACE</small></span>
        </button>
        <button type="button" onClick={onClose} className="auth-home"><ChevronLeft size={14} />返回首頁</button>
      </header>
      <div className={`auth-layout ${isPublicAuthMode ? '' : 'auth-layout-private'}`}>
        {isPublicAuthMode && currentPublicIntro && <aside className="auth-story" aria-label="你的學習空間">
          <div><p className="auth-eyebrow"><Sparkles size={13} />{currentPublicIntro.eyebrow}</p><h2>{currentPublicIntro.title}<span>。</span></h2><p className="auth-story-intro">{currentPublicIntro.body}</p></div>
          <div className="auth-illustration" aria-hidden="true"><div className="auth-orbit" /><div className="auth-paper"><div className="auth-paper-head"><span /><span /><span /><small>MY FOCUS JOURNAL</small></div><div className="auth-paper-title">每一天，都更靠近。</div><div className="auth-paper-date">ONE STEP AT A TIME</div><div className="auth-paper-line"><CheckCircle2 size={15} /><span>整理今天的讀書計畫</span></div><div className="auth-paper-line"><CheckCircle2 size={15} /><span>留下一段專注的紀錄</span></div><div className="auth-paper-line auth-paper-pending"><span className="auth-paper-dot" /><span>為下一個小目標努力</span></div><div className="auth-paper-progress"><span /></div><p>Keep going. You’ve got this.</p></div><div className="auth-float"><Cloud size={18} /><span>把努力，慢慢累積。</span></div><Sparkles className="auth-art-spark" size={23} /></div>
          <div className="auth-story-note"><span><Cloud size={18} strokeWidth={1.5} /></span><div><h3>{currentPublicIntro.cardTitle}</h3><p>{currentPublicIntro.cardBody}</p></div></div>
          <p className="auth-story-caption">A LITTLE FOCUS, EVERY DAY.</p>
        </aside>}
        <section className="auth-panel" aria-labelledby="auth-title" aria-busy={loading}>
          {((isLoginMode && oneTimeStep === 1) || mode === 'signup') ? <nav className="auth-mode-tabs" aria-label="帳號入口"><button type="button" disabled={loading} aria-current={mode === 'login' ? 'page' : undefined} onClick={() => { resetForm(); setMode('login'); }}>登入</button><button type="button" disabled={loading} aria-current={mode === 'signup' ? 'page' : undefined} onClick={() => { resetForm(); setMode('signup'); }}>註冊</button></nav> : <p className="auth-panel-eyebrow">{mode === 'onboarding' ? 'YOUR PROFILE' : mode === 'forgot' || mode === 'reset' ? 'ACCOUNT RECOVERY' : 'YOUR ACCOUNT'}</p>}
          <div className="auth-panel-heading"><span className="auth-heading-icon">{mode === 'login' ? <UserIcon size={21} /> : mode === 'signup' || mode === 'onboarding' ? <Sparkles size={21} /> : <Lock size={21} />}</span><div><h1 id="auth-title">{renderHeader()}</h1><p>{renderSubHeader()}</p></div></div>
        {error && (
          <div role="alert" aria-live="assertive" className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm font-medium animate-shake">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div role="status" aria-live="polite" className="mb-5 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-600 text-sm font-medium animate-fade-in-down">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Profile View */}
        {mode === 'profile' && currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {showLogoutConfirm ? (
              <div className="relative overflow-hidden p-7 bg-white border border-red-100 rounded-[2rem] text-center space-y-5 shadow-xl shadow-red-100/40 animate-scale-in">
                <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-red-50/70">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">確定要登出嗎？</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-[260px] mx-auto">
                    此裝置會停止同步資料；下次使用雲端同步時，需要重新登入。
                  </p>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      const result = await authService.removeSession(currentUser.email, '', authService.getDeviceId());
                      if (!result.success) {
                        setLoading(false);
                        setError(result.message || '登出失敗，請稍後再試');
                        return;
                      }
                      await onLogout();
                      onClose();
                    }}
                    disabled={loading}
                    className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all active:scale-[0.98] shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                    確認登出
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    disabled={loading}
                    className="w-full py-3 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/70">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-teal-50 border border-indigo-100 flex items-center justify-center shadow-inner flex-shrink-0">
                      <span className="text-2xl font-black text-indigo-700">{currentUser.name.charAt(0).toUpperCase()}</span>
                      <span className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full bg-emerald-400 ring-4 ring-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-black uppercase tracking-widest text-teal-600">帳號管理</div>
                      <h3 className="mt-1 text-2xl font-black text-slate-900 truncate">{currentUser.name}</h3>
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 min-w-0">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{currentUser.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">註冊日期</div>
                      <div className="mt-1 text-sm font-black text-slate-800 leading-relaxed break-words">{currentUser.registrationDate || '未記錄'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">最近登入</div>
                      <div className="mt-1 text-sm font-black text-slate-800 leading-relaxed break-words">{currentUser.lastLoginDate || '剛剛'}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { resetForm(); setMode('change-password'); }} className="rounded-[1.25rem] border border-indigo-100 bg-indigo-50/60 p-4 text-left hover:bg-indigo-50 hover:shadow-md transition-all">
                    <div className="h-10 w-10 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-sm mb-3">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-black text-slate-800">變更密碼</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500 leading-snug">更新登入密碼與帳號保護</div>
                  </button>

                  <button onClick={handleRegisterPasskey} disabled={loading || !authService.isPasskeySupported()} className="rounded-[1.25rem] border border-violet-100 bg-violet-50/60 p-4 text-left hover:bg-violet-50 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <div className="h-10 w-10 rounded-2xl bg-white text-violet-600 flex items-center justify-center shadow-sm mb-3">
                      {loadingAction === 'passkey-register' ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                    </div>
                    <div className="text-sm font-black text-slate-800">手機金鑰</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500 leading-snug">使用 Face ID、指紋或裝置金鑰</div>
                  </button>
                </div>

                <div className="rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-sm">
                  <button onClick={() => { resetForm(); setMode('devices'); fetchSessions(); }} className="group w-full p-4 rounded-[1.15rem] hover:bg-teal-50 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
                        <MonitorSmartphone className="w-5 h-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-black text-slate-800">裝置管理</div>
                        <div className="text-xs text-slate-400 font-semibold mt-0.5 truncate">查看並移除已登入裝置</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 flex-shrink-0" />
                  </button>
                </div>

                <button onClick={() => setShowLogoutConfirm(true)} className="w-full p-4 rounded-[1.25rem] border border-red-100 bg-red-50/70 text-red-600 hover:bg-red-50 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5" />
                    <div className="text-left">
                      <div className="text-sm font-black">登出帳號</div>
                      <div className="text-xs font-semibold text-red-400/80 mt-0.5">停止此裝置的登入狀態</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-300" />
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Devices View */}
        {mode === 'devices' && currentUser && (
          <div className="space-y-4">
            {loading && sessions.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <>
                {confirmDeviceLogout ? (
                  <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-center space-y-4 animate-scale-in">
                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">確認移除裝置</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {confirmDeviceLogout === 'all'
                          ? '確定要登出其他所有裝置嗎？那些裝置之後需要重新登入。'
                          : `確定要移除「${confirmDeviceLogout.name}」嗎？`}
                      </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setConfirmDeviceLogout(null)}
                        disabled={loading}
                        className="py-4 px-6 bg-white border border-slate-200 text-slate-600 font-black rounded-[1rem] hover:bg-slate-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => confirmDeviceLogout === 'all' ? handleRemoveAllSessions() : handleRemoveSession(confirmDeviceLogout.id)}
                        disabled={loading}
                        className="flex-grow py-4 bg-red-500 text-white font-black rounded-[1rem] hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        確認移除
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/70 overflow-hidden relative">
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl" />
                      <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
                      <div className="relative flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-widest text-teal-200">裝置安全</div>
                          <div className="mt-1 text-2xl font-black tracking-tight">{sessions.length}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-300">個已登入裝置</div>
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-inner">
                          <MonitorSmartphone className="w-7 h-7 text-teal-200" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                      {sessions.map((session, index) => {
                        const isCurrentDevice = session.deviceId === authService.getDeviceId();
                        return (
                                                                              <div key={session.deviceId || index} className={`group p-4 rounded-[1.25rem] border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all ${isCurrentDevice ? 'bg-indigo-50 border-indigo-200 shadow-lg shadow-indigo-100/70' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                            <div className="flex items-start sm:items-center gap-3 min-w-0 w-full">
                              <div className={`relative p-3 rounded-2xl shadow-sm transition-colors flex-shrink-0 ${isCurrentDevice ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white'}`}>
                                <MonitorSmartphone className="w-5 h-5" />
                                {isCurrentDevice && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-indigo-50" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-black text-slate-800 text-sm flex flex-wrap items-center gap-2 leading-snug">
                                  <span className="min-w-0 max-w-full truncate">{session.deviceName}</span>
                                  {isCurrentDevice && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black flex-shrink-0">目前裝置</span>}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 font-semibold break-words">
                                  最後活動 {session.lastActiveTime || '-'}
                                </div>
                                {session.createdTime && (
                                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium break-words">
                                    加入時間 {session.createdTime}
                                  </div>
                                )}
                                <div className="mt-2 h-1.5 w-full max-w-28 rounded-full bg-slate-100 overflow-hidden">
                                  <div className={`h-full rounded-full ${isCurrentDevice ? 'w-full bg-emerald-400' : 'w-2/3 bg-slate-300'}`} />
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setConfirmDeviceLogout({ id: session.deviceId, name: session.deviceName })}
                              disabled={loading}
                              className="self-end sm:self-auto p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors flex-shrink-0 disabled:opacity-50"
                              title="移除此裝置"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                      {sessions.length === 0 && !loading && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          目前沒有其他登入的裝置
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={() => setMode('profile')} 
                        className="py-4 px-6 bg-slate-100 text-slate-600 font-black rounded-[1rem] hover:bg-slate-200 transition-colors"
                      >
                        返回
                      </button>
                      {sessions.length > 1 && (
                        <button 
                          onClick={() => setConfirmDeviceLogout('all')}
                          disabled={loading}
                          className="flex-grow py-4 bg-red-50 text-red-600 font-black rounded-[1rem] hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-100"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                          登出其他所有裝置
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Change Password Form */}
        {mode === 'change-password' && (
           <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="space-y-1.5">
                 <label htmlFor={`auth-${mode}-oldPassword`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">舊密碼</label>
                 <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="password" id={`auth-${mode}-oldPassword`} value={oldPassword} onChange={e => setOldPassword(e.target.value)} required maxLength={MAX_PASSWORD_LENGTH} autoComplete="current-password" className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" placeholder="輸入舊密碼" />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label htmlFor={`auth-${mode}-newPassword`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">新密碼</label>
                 <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="password" id={`auth-${mode}-newPassword`} value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" placeholder="輸入新密碼" />
                 </div>
                 <PasswordStrengthMeter password={newPassword} />
              </div>
              <div className="space-y-1.5">
                 <label htmlFor={`auth-${mode}-confirmPassword`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">確認新密碼</label>
                 <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="password" id={`auth-${mode}-confirmPassword`} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" placeholder="再次輸入新密碼" />
                 </div>
              </div>

              <div className="flex gap-3 pt-2">
                 <button type="button" onClick={() => setMode('profile')} className="py-4 px-6 bg-slate-100 text-slate-600 font-black rounded-[1rem] hover:bg-slate-200 transition-colors">
                    返回
                 </button>
                 <button type="submit" disabled={loading} className="flex-grow py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-[1rem] hover:opacity-90 active:scale-[0.98] shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                    確認修改
                 </button>
              </div>
                         </form>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
           <form onSubmit={handleSignup} noValidate className="space-y-4">
              <div className="hidden">
                <label htmlFor={`auth-${mode}-name`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">暱稱 Username</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input type="text" id={`auth-${mode}-name`} value={name} onChange={e => setName(e.target.value)} maxLength={20} autoComplete="nickname" className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" placeholder="您的稱呼 (限20字)" />
                </div>
             </div>
             
             <div className="space-y-1.5">
                <label htmlFor={`auth-${mode}-email`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Email 電子信箱</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input type="email" id={`auth-${mode}-email`} value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="email" inputMode="email" className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" placeholder="example@mail.com" />
                </div>
             </div>

             <div className="space-y-1.5">
                <label htmlFor={`auth-${mode}-password`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">設定密碼</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id={`auth-${mode}-password`} value={password}
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    minLength={MIN_PASSWORD_LENGTH}
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-12 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" 
                    placeholder="至少 8 字元，包含字母與數字"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "隱藏密碼" : "顯示密碼"} aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
             </div>

             <div className="space-y-1.5">
                <label htmlFor={`auth-${mode}-confirmPassword`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">確認密碼</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id={`auth-${mode}-confirmPassword`} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} 
                    required 
                    minLength={MIN_PASSWORD_LENGTH}
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-12 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" 
                    placeholder="再次輸入密碼" 
                  />
                </div>
             </div>

              <div className="hidden">
                 <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">大考類別</label>
                    <div onClick={() => setShowExamModal(true)} className="relative group cursor-pointer">
                      <input 
                        type="text" 
                        readOnly 
                        value={EXAM_PRESETS.find(e => e.id === examType)?.name || '請選擇'} 
                        className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 px-4 pr-10 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer placeholder-slate-400 truncate text-left" 
                        placeholder="請選擇大考" 
                      />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">就讀學校</label>
                    <div onClick={() => setShowTeamModal(true)} className="relative group cursor-pointer">
                      <input 
                        type="text" 
                        readOnly 
                        value={selectedTeam} 
                        className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 px-4 pr-10 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer placeholder-slate-400 truncate" 
                        placeholder="請選擇學校" 
                      />
                      <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                 </div>
             </div>

              {/* Terms Agreement */}
             <div className="flex items-start gap-3 pt-2 pb-2">
                <input 
                  type="checkbox" 
                  id="agree-terms" 
                  checked={isAgreed} 
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="agree-terms" className="text-xs text-slate-500 leading-relaxed cursor-pointer select-none">
                  我已閱讀並了解 <button type="button" onClick={onShowPrivacy} className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold transition-colors">隱私權保護政策</button>，並同意 <button type="button" onClick={onShowTerms} className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold transition-colors">使用者服務條款</button>。
                </label>
             </div>

              <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-indigo-600 to-violet-600 py-4 font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                 {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                建立帳號
             </button>
           </form>
        )}

        {mode === 'onboarding' && (
          <form onSubmit={handleCompleteOnboarding} className="space-y-5">
            <div className="flex items-center justify-between rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">1</span> 個人資料設定</div>
              <span className="text-[10px] font-black tracking-[0.14em] text-indigo-500">STEP 1 / 1</span>
            </div>
            <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50/70 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <p className="text-base font-black text-slate-900">帳號建立完成</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">填完這三項，我們就能為你安排更合適的學習空間。</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`auth-${mode}-name`} className="ml-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500"><span className="text-indigo-500">01</span> 暱稱 Username</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
                <input type="text" id={`auth-${mode}-name`} value={name} onChange={e => setName(e.target.value)} required maxLength={20} autoComplete="nickname" className="w-full rounded-[1rem] border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none transition-all hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" placeholder="輸入顯示名稱" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500"><span className="text-indigo-500">02</span> 大考類別</label>
                <button type="button" onClick={() => setShowExamModal(true)} className="group flex w-full items-center justify-between rounded-[1rem] border-2 border-slate-100 bg-white/75 px-4 py-3.5 text-left text-sm font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white hover:shadow-md">
                  <span className="truncate">{EXAM_PRESETS.find(e => e.id === examType)?.name || '請選擇'}</span><Calendar className="h-4 w-4 text-slate-400 transition-colors group-hover:text-indigo-500" />
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500"><span className="text-indigo-500">03</span> 就讀學校</label>
                <button type="button" onClick={() => setShowTeamModal(true)} className="group flex w-full items-center justify-between rounded-[1rem] border-2 border-slate-100 bg-white/75 px-4 py-3.5 text-left text-sm font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white hover:shadow-md">
                  <span className="truncate">{selectedTeam || '請選擇學校'}</span><MapPin className="h-4 w-4 text-slate-400 transition-colors group-hover:text-indigo-500" />
                </button>
              </div>
            </div>
            <p className="auth-method-hint">暱稱與隊伍會出現在公開排行榜，請避免填入私人聯絡資訊。</p>
            <button type="submit" disabled={loading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_100%] py-4 font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-right active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}完成設定，開始使用
            </button>
            <p className="text-center text-[11px] font-semibold text-slate-400">這些資料之後都可以在帳號管理中修改</p>
          </form>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          oneTimeStep === 2 ? (
            <form onSubmit={handleVerifyOneTimeCode} className="space-y-5">
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-black text-slate-800">登入信已寄出</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed break-words">
                    已寄送至 {maskEmail(email)}。你可以開啟信中的登入連結，或輸入一次性驗證碼。若找不到信件，請檢查垃圾郵件。
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`auth-${mode}-oneTimeCode`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">一次性驗證碼</label>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    id={`auth-${mode}-oneTimeCode`} value={oneTimeCode}
                    onChange={e => setOneTimeCode(e.target.value.replace(/\s/g, '').slice(0, 12))}
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-4 text-lg tracking-[0.35em] outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-black text-slate-800 placeholder-slate-300"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-[1rem] hover:opacity-90 active:scale-[0.98] shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2">
                {loadingAction === 'otp-verify' && <Loader2 className="w-5 h-5 animate-spin" />}
                驗證並登入
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={handleOneTimeLogin} disabled={loading} className="py-3.5 bg-white border-2 border-indigo-100 text-indigo-600 font-black rounded-[1rem] hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                  {loadingAction === 'otp-send' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  重新寄送
                </button>
                <button type="button" onClick={() => { setOneTimeStep(1); setOneTimeCode(''); setMessage(''); setError(''); }} disabled={loading} className="py-3.5 bg-slate-100 text-slate-600 font-black rounded-[1rem] hover:bg-slate-200 transition-all">
                  返回登入
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor={`auth-${mode}-email`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Email 登入信箱</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input type="email" id={`auth-${mode}-email`} value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="email" inputMode="email" className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-slate-900/10 transition-all font-semibold text-slate-800 placeholder-slate-400 shadow-sm" placeholder="example@mail.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor={`auth-${mode}-password`} className="text-[11px] font-black text-slate-500 uppercase tracking-widest">密碼</label>
                  <button type="button" onClick={() => { resetForm(); setMode('forgot'); }} className="text-[11px] font-bold text-slate-500 hover:text-slate-950 transition-colors">忘記密碼？</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id={`auth-${mode}-password`} value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="current-password"
                    className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-12 text-sm outline-none focus:ring-4 focus:ring-slate-900/10 transition-all font-semibold text-slate-800 placeholder-slate-400 shadow-sm"
                    placeholder="輸入密碼"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "隱藏密碼" : "顯示密碼"} aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full mt-2 py-4 bg-slate-950 text-white font-black rounded-[1rem] hover:bg-slate-800 active:scale-[0.98] shadow-lg shadow-slate-300 transition-all flex items-center justify-center gap-2">
                {loadingAction === 'password' && <Loader2 className="w-5 h-5 animate-spin" />}
                登入帳號
              </button>
              <div className="auth-method-divider"><span />或使用其他登入方式<span /></div>
              <div className="auth-alternative-methods">
                <button type="button" onClick={handleOneTimeLogin} disabled={loading} className="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-black rounded-[1rem] hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  {loadingAction === 'otp-send' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  寄送一次性登入信
                </button>
                <button type="button" onClick={handlePasskeyLogin} disabled={loading || !authService.isPasskeySupported()} className="w-full py-3.5 bg-cyan-50 border-2 border-cyan-100 text-cyan-700 font-black rounded-[1rem] hover:border-cyan-200 hover:bg-cyan-100/70 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loadingAction === 'passkey' ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                  Passkey 登入
                </button>
              </div>
              <p className="auth-method-hint">登入信不需要密碼；Passkey 需事先設定並使用支援的裝置。{!authService.isPasskeySupported() && '目前環境不支援 Passkey，請使用密碼或登入信。'}</p>
            </form>
          )
        )}

        {/* Forgot Password Flow */}
        {mode === 'forgot' && (
           <div className="space-y-4 pt-2">
              {/* Step 1: Input Email */}
              {forgotStep === 1 && (
                 <form onSubmit={handleCheckEmailForRecovery} className="space-y-5">
                    <div className="space-y-1.5">
                       <label htmlFor={`auth-${mode}-email`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">您的 Email 電子信箱</label>
                       <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input type="email" id={`auth-${mode}-email`} value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="email" inputMode="email" className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" placeholder="example@mail.com" />
                       </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-[1rem] hover:opacity-90 active:scale-[0.98] shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2">
                       {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                       寄送重設連結
                    </button>
                 </form>
              )}

              {/* Step 2: Email Sent */}
              {forgotStep === 2 && (
                 <div className="space-y-4">
                    <div className="p-5 bg-indigo-50/50 rounded-[1.5rem] border border-indigo-100/50 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                           <Mail className="w-6 h-6" />
                        </div>
                        <div>
                           <div className="font-black text-slate-800">重設連結已寄出</div>
                           <div className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                              請到 {maskEmail(email)} 開啟重設連結。若未收到，請檢查信箱拼字與垃圾郵件。
                           </div>
                        </div>
                    </div>
                    <button onClick={handleSendCode} disabled={loading} className="w-full py-4 bg-white border-2 border-indigo-100 text-indigo-600 font-black rounded-[1rem] hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        重新寄送重設連結
                    </button>
                 </div>
              )}
           </div>
        )}

        {/* Reset Password Form */}
        {mode === 'reset' && (
           <form onSubmit={handleResetPassword} className="space-y-5">
              {email && (
                <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-[1.5rem] p-5 mb-2 text-center shadow-inner">
                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">重設密碼帳號</p>
                  <p className="text-lg font-bold text-slate-800">{maskEmail(email)}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor={`auth-${mode}-newPassword`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">新密碼</label>
                <div className="relative group">
                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                   <input type={showPassword ? "text" : "password"} id={`auth-${mode}-newPassword`} value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-12 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" placeholder="輸入新密碼" />
                   <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? '隱藏密碼' : '顯示密碼'} aria-pressed={showPassword} className="absolute right-4 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
                <PasswordStrengthMeter password={newPassword} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`auth-${mode}-confirmPassword`} className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">確認新密碼</label>
                <div className="relative group">
                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                   <input type={showPassword ? "text" : "password"} id={`auth-${mode}-confirmPassword`} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-[1rem] py-3.5 pl-12 pr-12 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400" placeholder="再次輸入新密碼" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full mt-2 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-[1rem] hover:opacity-90 active:scale-[0.98] shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2">
                 {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                 更新密碼
              </button>
           </form>
        )}

        {/* Footer Links */}
        {(mode === 'login' || mode === 'signup' || mode === 'forgot' || mode === 'reset') && (
           <div className="auth-switch-footer">
              {mode === 'login' && (
                 <>
                    <span className="text-slate-400">還沒有帳號？</span>
                    <button onClick={() => { resetForm(); setMode('signup'); }} className="text-indigo-600 hover:text-indigo-700 transition-colors">立即註冊</button>
                 </>
              )}
              {mode === 'signup' && (
                 <>
                    <span className="text-slate-400">已經有帳號？</span>
                    <button onClick={() => { resetForm(); setMode('login'); }} className="text-indigo-600 hover:text-indigo-700 transition-colors">登入</button>
                 </>
              )}
              {(mode === 'forgot' || mode === 'reset') && (
                 <button onClick={() => { resetForm(); setMode('login'); }} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> 返回登入
                 </button>
              )}
           </div>
        )}
        </section>
      </div>
      <footer className="auth-page-footer"><p>FOCUS SPACE <span>·</span> 把今天的專注，留給明天的自己。</p><div><button type="button" onClick={onShowInstructions}>使用說明</button><button type="button" onClick={onShowPrivacy}>隱私權政策</button><button type="button" onClick={onShowTerms}>服務條款</button><a href="mailto:tyctw.analyze@gmail.com">聯絡我們</a></div></footer>
    </main>
    
      {/* Team Selection Modal */}
      <TeamSelectModal 
        isOpen={showTeamModal} 
        onClose={() => setShowTeamModal(false)} 
        onSelectTeam={(team) => {
           setSelectedTeam(team);
        }} 
      />
      
      {/* Exam Selection Modal */}
      <ExamSelectModal 
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        onSelectExam={(id) => setExamType(id)}
        currentExamId={examType}
      />
    </>
  );
};

export default AuthPage;
