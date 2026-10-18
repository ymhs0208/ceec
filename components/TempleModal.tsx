import ModalLayer from './ModalLayer';
import React, { useState, useEffect, useRef } from 'react';
import { X, Flame, ScrollText, Ticket, Sparkles, Coins, AlertCircle, ArrowLeft, BookOpen, Check, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import { TempleState, IncenseRecord } from '../types';
import './TemplePage.css';
import TempleRitualScene from './TempleRitualScene';
import TempleRitualKeepsake from './TempleRitualKeepsake';
import { RITUAL_TIMING } from './templeRitualTiming';

const RITUAL_COSTS = {
  lamp: 100,
  fortune: 30,
  ticket: 500,
  records: 0,
} as const;

const RITUAL_NAMES = {
  lamp: '點光明燈',
  fortune: '求籤',
  ticket: '供奉准考證',
  records: '香火紀錄',
} as const;

interface TempleModalProps {
  isOpen: boolean;
  isVerified?: boolean;
  onClose: () => void;
  incenseCoins: number;
  incenseRecords: IncenseRecord[];
  templeState: TempleState;
  onPerformRitual: (ritual: 'lamp' | 'fortune' | 'ticket') => Promise<{ type: string; text: string } | undefined>;
  variant?: 'modal' | 'page';
  userName?: string;
  targetSchool?: string;
  onCheckSync?: () => Promise<string>;
  pendingStudyCount?: number;
  syncMessage?: string;
}

interface TempleNoticeProps {
  activeTab: 'lamp' | 'fortune' | 'ticket' | 'records';
  coins: number;
  message: string;
  onDismiss: () => void;
  isPage: boolean;
}

const TempleNotice: React.FC<TempleNoticeProps> = ({ activeTab, coins, message, onDismiss, isPage }) => {
  const requiredCoins = RITUAL_COSTS[activeTab];
  const isCoinShortage = message.includes('香火幣不足') && requiredCoins > 0;
  const missingCoins = Math.max(requiredCoins - coins, 0);
  const progress = requiredCoins > 0 ? Math.min(100, Math.round((coins / requiredCoins) * 100)) : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      className={`relative overflow-hidden rounded-[1.5rem] border shadow-lg ${
        isCoinShortage
          ? 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 text-amber-950 shadow-amber-100/70'
          : 'border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 text-rose-800 shadow-rose-100/50'
      } ${isPage ? 'mb-5 p-4 sm:p-5' : 'mb-4 p-4'}`}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm ${
          isCoinShortage ? 'border-amber-200 bg-white text-amber-600' : 'border-rose-100 bg-white text-rose-600'
        }`}>
          {isCoinShortage ? <Coins className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black">
                {isCoinShortage ? '香火幣還差一點' : '儀式提醒'}
              </div>
              <p className="mt-1 text-xs font-semibold leading-relaxed opacity-75">
                {isCoinShortage
                  ? `${RITUAL_NAMES[activeTab]}需要 ${requiredCoins} 枚香火幣，目前有 ${coins} 枚，還差 ${missingCoins} 枚。完成專注讀書就能繼續累積。`
                  : message}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/80 text-amber-700 shadow-sm transition-colors hover:bg-white hover:text-amber-950"
              aria-label="關閉提醒"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isCoinShortage && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-black text-amber-700/70">
                <span>目前 {coins}</span>
                <span>目標 {requiredCoins}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-amber-100 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 rounded-xl border border-amber-100 bg-white/70 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800/75">
                小提示：每完成 1 分鐘專注，就會轉成 1 枚香火幣。
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const TempleModal: React.FC<TempleModalProps> = ({ isOpen, isVerified = false, onClose, incenseCoins, incenseRecords, templeState, onPerformRitual, variant = 'modal', userName, targetSchool, onCheckSync, pendingStudyCount = 0, syncMessage }) => {
  const [activeTab, setActiveTab] = useState<'lamp' | 'fortune' | 'ticket' | 'records'>('lamp');
  const [showFortune, setShowFortune] = useState<{ type: string; text: string } | null>(null);
  const [error, setError] = useState('');
  const [checkingSync, setCheckingSync] = useState(false);
  const [syncReport, setSyncReport] = useState('');
  const ticketUserName = userName?.trim() || '考生';
  const ticketTargetSchool = targetSchool?.trim() || '目標學校';
  
  // Animation states
  const [isLightingLamp, setIsLightingLamp] = useState(false);
  const [lampPhase, setLampPhase] = useState<'idle' | 'prepare' | 'kindle' | 'blessing'>('idle');
  const [isDrawingFortune, setIsDrawingFortune] = useState(false);
  const [isChoosingFortune, setIsChoosingFortune] = useState(false);
  const [isOfferingTicket, setIsOfferingTicket] = useState(false);
  const [offeringPhase, setOfferingPhase] = useState<'idle' | 'purify' | 'ascend' | 'seal'>('idle');

  const [selectedStick, setSelectedStick] = useState<number | null>(null);
  const [ritualStatus, setRitualStatus] = useState('');
  const reduceMotion = useReducedMotion();
  const busyRef = useRef(false);
  const pickRef = useRef(false);
  const runRef = useRef(0);
  const timers = useRef(new Map<ReturnType<typeof setTimeout>, () => void>());
  const ritualAudio = useRef<AudioContext | null>(null);

  useEffect(() => {
    busyRef.current = false;
    pickRef.current = false;
    setError('');
    setShowFortune(null);
    setIsLightingLamp(false);
    setIsDrawingFortune(false);
    setIsChoosingFortune(false);
    setIsOfferingTicket(false);
    setLampPhase('idle');
    setOfferingPhase('idle');
    setSelectedStick(null);
    setRitualStatus('');
    return () => {
      runRef.current += 1;
      for (const [timer, cancel] of timers.current) { clearTimeout(timer); cancel(); }
      timers.current.clear();
      if (ritualAudio.current) { void ritualAudio.current.close().catch(() => {}); ritualAudio.current = null; }
    };
  }, [isOpen]);

  const pause = (ms: number) => new Promise<void>(resolve => {
    const timer = setTimeout(() => { timers.current.delete(timer); resolve(); }, reduceMotion ? 80 : ms);
    timers.current.set(timer, resolve);
  });
  const playSound = (type: 'magic' | 'coins' | 'bell') => {
    if (reduceMotion) return;
    try {
      const context = ritualAudio.current ?? new AudioContext();
      ritualAudio.current = context;
      void context.resume().catch(() => {});
      const notes = type === 'bell' ? [523.25, 1046.5, 1569.75] : type === 'coins' ? [330, 440, 330] : [392, 523.25, 659.25];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const start = context.currentTime + (type === 'bell' ? 0 : index * .12);
        const duration = type === 'bell' ? 1.8 : type === 'coins' ? .11 : .65;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(.035 / (index + 1), start + .015);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(envelope); envelope.connect(context.destination);
        oscillator.start(start); oscillator.stop(start + duration + .03);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
      });
    } catch { /* Sound is optional; the ritual still completes without it. */ }
  };
  const completeRitual = (message: string) => {
    setRitualStatus(message);
    playSound('bell');
  };

  const handleLightLamp = async () => {
    if (!isVerified) { setError('點數尚未核對。請先登入，再到學習歷程檢查同步。'); return; }
    if (busyRef.current) return;
    if (incenseCoins < 100) { setError('香火幣不足！點光明燈需要 100 枚香火幣。'); return; }
    if (templeState.lamps.some(l => l.expireAt > Date.now())) { setError('您的光明燈還在亮著呢！'); return; }
    busyRef.current = true;
    const run = ++runRef.current;
    setError(''); setRitualStatus(''); setIsLightingLamp(true); setLampPhase('prepare');
    playSound('magic');
    try {
      await pause(RITUAL_TIMING.prepare); if (run !== runRef.current) return;
      setLampPhase('kindle');
      await pause(RITUAL_TIMING.kindle); if (run !== runRef.current) return;
      setRitualStatus('正在安放光明燈，請稍候…');
      await onPerformRitual('lamp'); if (run !== runRef.current) return;
      setLampPhase('blessing'); completeRitual('光明燈已點亮，願你心定、思緒清明。');
      await pause(RITUAL_TIMING.blessing);
    } catch (error) {
      if (run !== runRef.current) return;
      setError(error instanceof Error ? error.message : '點燈失敗，請稍後再試。'); setLampPhase('idle'); setRitualStatus('');
    } finally {
      if (run === runRef.current) { busyRef.current = false; setIsLightingLamp(false); }
    }
  };

  const handleDrawFortune = async () => {
    if (!isVerified) { setError('點數尚未核對。請先登入，再到學習歷程檢查同步。'); return; }
    if (busyRef.current) return;
    if (incenseCoins < 30) { setError('香火幣不足！求籤需要 30 枚香火幣。'); return; }
    busyRef.current = true;
    const run = ++runRef.current;
    pickRef.current = false;
    setError(''); setRitualStatus(''); setSelectedStick(null); setIsDrawingFortune(true);
    setIsChoosingFortune(false); setShowFortune(null); playSound('coins');
    await pause(RITUAL_TIMING.shake); if (run !== runRef.current) return;
    setIsDrawingFortune(false); setIsChoosingFortune(true); setRitualStatus('靜下心來，選一支與你有緣的籤。');
  };

  const handlePickFortune = async (stickIndex: number) => {
    if (!isChoosingFortune || selectedStick !== null) return;
    // Lock synchronously: rapid pointer or keyboard events must not submit twice.
    if (!busyRef.current || pickRef.current) return;
    pickRef.current = true;
    const run = ++runRef.current;
    setSelectedStick(stickIndex); setIsChoosingFortune(false); setIsDrawingFortune(true);
    setRitualStatus('籤已選定，正在請示籤意…'); playSound('magic');
    try {
      await pause(RITUAL_TIMING.reveal); if (run !== runRef.current) return;
      const fortune = await onPerformRitual('fortune'); if (run !== runRef.current) return;
      if (!fortune) throw new Error('暫時無法取得籤文，請重新核對香火紀錄後再試。');
      await pause(350); if (run !== runRef.current) return;
      setShowFortune(fortune); completeRitual('籤文已展開，願這段話陪伴你繼續前進。');
    } catch (error) {
      if (run !== runRef.current) return;
      setError(error instanceof Error ? error.message : '求籤失敗，請稍後再試。'); setRitualStatus(''); setSelectedStick(null);
    } finally {
      if (run === runRef.current) { busyRef.current = false; setIsDrawingFortune(false); }
    }
  };

  const handleOfferTicket = async () => {
    if (!isVerified) { setError('點數尚未核對。請先登入，再到學習歷程檢查同步。'); return; }
    if (busyRef.current) return;
    if (templeState.ticketOffered) { setError('您已經供奉過准考證了！文昌帝君會保佑您的。'); return; }
    if (incenseCoins < 500) { setError('香火幣不足！供奉准考證需要 500 枚香火幣。'); return; }
    busyRef.current = true;
    const run = ++runRef.current;
    setError(''); setRitualStatus(''); setIsOfferingTicket(true); setOfferingPhase('purify'); playSound('magic');
    try {
      await pause(RITUAL_TIMING.purify); if (run !== runRef.current) return;
      setOfferingPhase('ascend');
      await pause(RITUAL_TIMING.ascend); if (run !== runRef.current) return;
      setRitualStatus('正在確認供奉，請稍候…');
      await onPerformRitual('ticket'); if (run !== runRef.current) return;
      setOfferingPhase('seal'); completeRitual('准考證已安放，願你從容應試、穩定發揮。');
      await pause(RITUAL_TIMING.seal);
    } catch (error) {
      if (run !== runRef.current) return;
      setError(error instanceof Error ? error.message : '供奉失敗，請稍後再試。'); setOfferingPhase('idle'); setRitualStatus('');
    } finally {
      if (run === runRef.current) { busyRef.current = false; setIsOfferingTicket(false); }
    }
  };

  if (!isOpen) return null;

  const now = Date.now();
  const activeLamps = templeState.lamps.filter(l => l.expireAt > now);
  const isLampActive = activeLamps.length > 0;
  const isPage = variant === 'page';
  const templeTabs = [
    { id: 'lamp' as const, label: '點光明燈', caption: isLampActive ? '光明燈照亮中' : '100 香火幣', icon: <Flame className="w-4 h-4" /> },
    { id: 'fortune' as const, label: '求籤', caption: '30 香火幣', icon: <ScrollText className="w-4 h-4" /> },
    { id: 'ticket' as const, label: '供奉准考證', caption: templeState.ticketOffered ? '已供奉' : '500 香火幣', icon: <Ticket className="w-4 h-4" /> },
    { id: 'records' as const, label: '香火紀錄', caption: `${incenseRecords.length} 筆紀錄`, icon: <Coins className="w-4 h-4" /> },
  ];
  const selectTab = (tab: typeof activeTab) => {
    if (isLightingLamp || isDrawingFortune || isOfferingTicket || isChoosingFortune) return;
    setRitualStatus('');
    setActiveTab(tab);
    setError('');
    setShowFortune(null);
    setIsChoosingFortune(false);
  };

  return (
    <MotionConfig reducedMotion="user"><ModalLayer active={!isPage} className={isPage ? "animate-fade-in" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"}>
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={isPage ? "temple-page" : "bg-gradient-to-b from-amber-50 to-orange-50 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative border border-amber-200/50 max-h-[90vh] overflow-y-auto custom-scrollbar transition-all duration-300"}
      >
        {!isPage && <button onClick={onClose} className="absolute top-4 right-4 text-amber-900/50 hover:text-amber-900 transition-colors z-10">
          <X className="w-6 h-6" />
        </button>}

        {isPage ? (
          <header className="temple-hero">
            <div className="temple-intro">
              <button type="button" onClick={onClose} className="temple-back"><ArrowLeft size={15} />回到首頁</button>
              <div className="temple-title-row"><span className="temple-seal" aria-hidden="true">文</span><div><p className="temple-eyebrow">WENCHANG · A MOMENT OF PEACE</p><h1>線上文昌廟<span>。</span></h1></div></div>
              <p className="temple-intro-note">把努力化作香火，為自己留一盞光。</p>
            </div>
            <div className="temple-wallet">
              <div className="temple-wallet-heading"><span><Coins size={16} />我的香火幣</span><span className={isVerified ? 'is-verified' : ''}>{isVerified ? <><ShieldCheck size={12} />已核對</> : '待核對'}</span></div>
              <div className="temple-wallet-balance"><strong>{isVerified ? incenseCoins.toLocaleString() : '—'}</strong><span>枚</span></div>
              <p><BookOpen size={13} />專注 1 分鐘，累積 1 枚香火幣</p>
            </div>
          </header>
        ) : (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-900 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            線上文昌廟
            <Sparkles className="w-6 h-6 text-amber-500" />
          </h2>
          <p className="text-amber-700/70 text-sm mt-2">心誠則靈，專注時間可轉換為香火幣</p>
          
          <div className="mt-4 inline-flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full border border-amber-200 shadow-sm">
            <Coins className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-amber-900">香火幣：{isVerified ? incenseCoins : '待核對'}</span>
          </div>
        </div>
        )}

        {!isVerified && <p role="status" className={isPage ? 'temple-verification' : 'mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900'}><ShieldCheck size={16} />目前為本機暫存紀錄。登入後，請至「學習歷程 → 檢查同步」核對可用香火幣。</p>}
        <AnimatePresence>
          {error && (
            <TempleNotice
              activeTab={activeTab}
              coins={incenseCoins}
              isPage={isPage}
              message={error}
              onDismiss={() => setError('')}
            />
          )}
        </AnimatePresence>

        {onCheckSync && <section className="temple-sync-panel" aria-label="香火幣入帳核對">
          <div><div><strong>有讀書，卻沒收到香火幣？</strong><p>{pendingStudyCount > 0 ? `目前有 ${pendingStudyCount} 筆專注紀錄等待入帳。` : '核對已同步的讀書紀錄，並補傳符合期限的未入帳紀錄。'}</p></div><button type="button" disabled={checkingSync || isLightingLamp || isDrawingFortune || isOfferingTicket || isChoosingFortune} onClick={async () => {
            if (checkingSync) return;
            setCheckingSync(true); setSyncReport('正在核對並補傳，請稍候…');
            try { setSyncReport(await onCheckSync()); }
            catch (error) { setSyncReport(error instanceof Error ? error.message : '目前無法核對，請稍後再試。'); }
            finally { setCheckingSync(false); }
          }}>{checkingSync ? '核對中…' : '檢查並補傳'}</button></div>
          {(syncReport || syncMessage) && <p className="temple-sync-report" role="status" aria-live="polite">{[syncMessage, syncReport].filter(Boolean).join('\n\n')}</p>}
        </section>}
        <div className={isPage ? 'temple-workspace' : ''}>
        <nav className={isPage ? 'temple-navigation' : 'flex gap-2 mb-6 bg-white/40 p-1 rounded-2xl border border-amber-100 overflow-x-auto custom-scrollbar'} aria-label="文昌廟祈福功能">
          <div className={isPage ? 'temple-tabs' : 'contents'}>
            {templeTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
              <motion.button 
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                disabled={isLightingLamp || isDrawingFortune || isOfferingTicket || isChoosingFortune}
                aria-pressed={isActive}
                data-active={isActive}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={isPage
                  ? 'temple-tab'
                  : `relative flex-1 min-w-[100px] overflow-hidden py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isActive ? 'text-white shadow-md ring-1 ring-amber-300/70' : 'text-amber-700 hover:bg-white/60'}`
                }
              >
                {isActive && (
                  <motion.span
                    layoutId={isPage ? "temple-page-active-tab" : "temple-modal-active-tab"}
                    className={isPage ? 'temple-tab-highlight' : 'absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500'}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                {isActive && !isPage && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-x-3 bottom-0 h-8 rounded-full bg-white/25 blur-xl"
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.35 }}
                  />
                )}
                <span className={isPage ? 'temple-tab-icon' : `relative z-10 flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100/70 text-amber-600'}`}>
                  {tab.icon}
                </span>
                <span className={isPage ? 'temple-tab-label' : 'relative z-10'}>{tab.label}</span>
                {isPage && (
                  <span className="temple-tab-caption">
                    {tab.caption}
                  </span>
                )}
              </motion.button>
            )})}
          </div>
        </nav>

        <div id="temple-ritual-content" className={isPage ? 'temple-stage' : 'bg-white/80 rounded-2xl p-6 border border-amber-100 shadow-sm min-h-[250px] flex flex-col items-center justify-center text-center'}>
          <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex w-full flex-1 flex-col items-center justify-center"
          >
          {activeTab === 'lamp' && (
            <div className="temple-ritual-body space-y-4 relative w-full">
              <TempleRitualScene kind="lamp" phase={lampPhase} active={isLampActive} busy={isLightingLamp} />
              {(isLampActive || lampPhase === 'blessing') && <TempleRitualKeepsake kind="lamp" userName={ticketUserName} targetSchool={ticketTargetSchool} />}
              <div className="temple-ritual-description rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-left">
                <div className="flex items-center justify-between gap-3"><h3 className="font-black text-amber-950 text-lg">點光明燈</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isLampActive ? 'bg-emerald-100 text-emerald-700' : isLightingLamp ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>{isLampActive ? '光明常照' : isLightingLamp ? '儀式進行中' : '待點燈'}</span></div>
                <p className="mt-1 text-sm font-medium leading-relaxed text-amber-800/70">
                  {isLampActive
                    ? `光明燈已點亮，持續為你的讀書計畫祈願加持，剩餘 ${Math.ceil((activeLamps[0].expireAt - now) / (1000 * 60 * 60 * 24))} 天`
                    : '為自己點一盞光明燈，祈願讀書時思緒清晰，考試時安定從容。'}
                </p>
              </div>
              {!isLampActive && (
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button
                    onClick={handleLightLamp}
                    disabled={isLightingLamp}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Coins className="w-4 h-4" /> {isLightingLamp ? '點燈中...' : '點亮光明燈 · 100 香火幣'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fortune' && (
            <div className="temple-ritual-body space-y-4 w-full">
              {showFortune ? (
                <FortuneResult fortune={showFortune} userName={ticketUserName} targetSchool={ticketTargetSchool} onReset={() => setShowFortune(null)} />
              ) : (
                <>
                  <TempleRitualScene kind="fortune" phase={isChoosingFortune ? 'choose' : selectedStick !== null ? 'reveal' : isDrawingFortune ? 'shake' : 'idle'} busy={isDrawingFortune} selectedStick={selectedStick} onPick={handlePickFortune} />
                  {isChoosingFortune && <button type="button" className="ritual-cancel" onClick={() => { busyRef.current = false; setIsChoosingFortune(false); setRitualStatus(''); }}>先收起籤筒</button>}
                  <div>
                    <h3 className="font-bold text-amber-900 text-lg">求籤</h3>
                    <p className="text-sm text-amber-700/70 mt-1">搖動籤筒、抽出一支籤，讓讀書與考試方向得到一段提醒。</p>
                  </div>
                  <button
                    onClick={handleDrawFortune}
                    disabled={isDrawingFortune || isChoosingFortune}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Coins className="w-4 h-4" /> {isChoosingFortune ? '請選一支籤' : isDrawingFortune ? '搖籤中...' : '求一支籤 · 30 香火幣'}
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'ticket' && (
            <div className="temple-ritual-body w-full space-y-5">
              <TempleRitualScene kind="ticket" phase={offeringPhase} active={templeState.ticketOffered} busy={isOfferingTicket} userName={ticketUserName} targetSchool={ticketTargetSchool} />
              {(templeState.ticketOffered || offeringPhase === 'seal') && <TempleRitualKeepsake kind="ticket" userName={ticketUserName} targetSchool={ticketTargetSchool} />}
              <div className="temple-ritual-description rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-left">
                <div className="flex items-center justify-between gap-3"><h3 className="font-black text-amber-950 text-lg">供奉准考證</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${templeState.ticketOffered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{templeState.ticketOffered ? '祈願已安放' : isOfferingTicket ? '儀式進行中' : '準備供奉'}</span></div>
                <p className="mt-1 text-sm font-medium leading-relaxed text-amber-800/70">
                  {templeState.ticketOffered
                    ? '准考證已安放在供桌上，願考試當天穩定發揮、心神安定。'
                    : '以准考證為信物，將你的姓名、目標與努力安放在文昌殿前。'}
                </p>
              </div>
              {!templeState.ticketOffered && (
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button
                    onClick={handleOfferTicket}
                    disabled={isOfferingTicket}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Coins className="w-4 h-4" /> {isOfferingTicket ? '供奉中...' : '供奉准考證 · 500 香火幣'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'records' && (
            <div className="w-full h-full flex flex-col">
              <h3 className="font-bold text-amber-900 text-lg mb-4">香火紀錄</h3>
              {incenseRecords.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-amber-700/50 text-sm">
                  尚無紀錄，開始專注學習來獲得香火幣吧！
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 text-left">
                  {incenseRecords.map((record, index) => (
                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, delay: reduceMotion ? 0 : Math.min(index, 8) * .04 }} key={record.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                      <div>
                        <div className="font-bold text-amber-900 text-sm">{record.reason}</div>
                        <div className="text-xs text-amber-700/60">{new Date(record.timestamp).toLocaleString()}</div>
                      </div>
                      <div className={`font-bold ${record.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {record.amount > 0 ? '+' : ''}{record.amount}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="ritual-live-status" role="status" aria-live="polite" aria-atomic="true">{ritualStatus}</div>
          </motion.div>
          </AnimatePresence>
        </div>
        {isPage && <aside className="temple-sidebar">
          <section className="temple-wish"><p className="temple-eyebrow">A WISH FOR YOUR JOURNEY</p><h2>祈願小箋</h2><div className="temple-wish-paper"><span className="temple-wish-mark" aria-hidden="true">願</span><p>{ticketUserName}，願你</p><strong>心有所向，<br />行有所至。</strong><span>向著 {ticketTargetSchool}，穩穩前進。</span></div></section>
          <section className="temple-prayer-status"><h2><Sparkles size={15} />我的祈福足跡</h2><div><span>光明燈</span><strong>{isLampActive ? `${activeLamps.length} 盞照亮中` : '尚未點燈'}</strong></div><div><span>文昌靈籤</span><strong>{templeState.fortunes.length} 支</strong></div><div><span>准考證</span><strong>{templeState.ticketOffered ? <><Check size={12} />已供奉</> : '尚未供奉'}</strong></div></section>
          <section className="temple-guide"><h2><BookOpen size={15} />讓專注，成為香火</h2><ol><li><span>01</span>完成一段專注讀書</li><li><span>02</span>儲存並同步讀書紀錄</li><li><span>03</span>核對香火幣，選擇祈福儀式</li></ol><p>祈願之後，也別忘了相信自己的努力。</p></section>
        </aside>}
        </div>
        {isPage && <footer className="temple-footer"><span />心有光，前路就有方向。<span /></footer>}
      </motion.div>
    </ModalLayer></MotionConfig>
  );
};

interface FortuneResultProps {
  fortune: { type: string; text: string };
  onReset: () => void;
  userName?: string;
  targetSchool?: string;
}

const FortuneResult: React.FC<FortuneResultProps> = ({ fortune, onReset, userName, targetSchool }) => {
  const fortuneLines = fortune.text
    .replace(/\\n/g, '\n')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  const fortuneChars: string[] = Array.from(fortune.type);
  const fortuneNo = Math.max(
    1,
    fortuneChars.reduce<number>((sum, char) => sum + char.charCodeAt(0), 0) % 60,
  );

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full ritual-fortune-result">
      <div className="ritual-fortune-received"><Sparkles size={13} />一支籤，一份此刻的提醒</div>
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-[1.75rem] border border-amber-200 bg-gradient-to-b from-stone-100 via-amber-50 to-orange-100 p-4 shadow-inner">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,.24),transparent_58%)]" />
        <div className="absolute inset-x-8 bottom-5 h-8 rounded-full bg-stone-300/60 blur-md" />

        <div className="fortune-stick-drop absolute left-7 top-8 z-20 h-52 w-6 rounded-full bg-gradient-to-r from-amber-900 via-yellow-500 to-amber-800 shadow-xl">
          <div className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-yellow-100/50" />
          <div className="absolute left-1/2 top-4 h-9 w-9 -translate-x-1/2 rounded-full border border-red-800/40 bg-red-700 text-[10px] font-black leading-9 text-amber-50 shadow-md">
            {fortuneNo.toString().padStart(2, '0')}
          </div>
          <div className="absolute bottom-5 left-1/2 h-20 w-3 -translate-x-1/2 rounded-full bg-amber-950/20" />
        </div>

        <div className="fortune-paper-open relative ml-10 min-h-[19rem] rounded-[1.25rem] border border-amber-300/80 bg-[#fff8df] px-5 py-5 text-left shadow-2xl shadow-amber-900/10">
          <div className="absolute inset-0 rounded-[1.25rem] opacity-60 mix-blend-multiply bg-[linear-gradient(90deg,rgba(146,64,14,.08)_1px,transparent_1px),linear-gradient(180deg,rgba(146,64,14,.06)_1px,transparent_1px)] bg-[size:18px_18px]" />
          <div className="absolute inset-y-3 left-3 w-1 rounded-full bg-red-800/65" />
          <div className="absolute inset-y-3 right-3 w-1 rounded-full bg-red-800/65" />
          <div className="relative z-10">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-red-900/15 pb-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.32em] text-red-800/70">WENCHANG LOT</div>
                <div className="mt-1 text-xs font-black text-amber-900/60">第 {fortuneNo.toString().padStart(2, '0')} 籤</div>
              </div>
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-red-700/70 text-center text-sm font-black leading-tight text-red-800">
                文昌
              </div>
            </div>

            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <div className="min-h-44 border-r border-red-900/10 pr-3 text-center">
                <div className="mx-auto [writing-mode:vertical-rl] text-3xl font-black tracking-[0.18em] text-red-900 drop-shadow-sm">
                  {fortune.type}
                </div>
              </div>
              <div className="space-y-3">
                {fortuneLines.length > 0 ? fortuneLines.map((line, index) => (
                  <p key={`${line}-${index}`} style={{ animationDelay: `${.55 + index * .16}s` }} className={`ritual-poem-line ${index === 0 ? 'text-base text-amber-950' : 'text-sm text-stone-700'} font-bold leading-7`}>
                    {line}
                  </p>
                )) : (
                  <p className="text-sm font-bold leading-7 text-stone-700">{fortune.text}</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-red-900/15 pt-3 text-[10px] font-black tracking-[0.18em] text-amber-900/55">
              <span>誠心求籤</span>
              <span>靜心解籤</span>
            </div>
          </div>
        </div>
      </div>

      <TempleRitualKeepsake kind="fortune" userName={userName} targetSchool={targetSchool} />
      <button onClick={onReset} className="mt-5 mx-auto flex px-5 py-2.5 rounded-full bg-amber-100 text-sm text-amber-800 font-black hover:bg-amber-200 hover:text-amber-950 transition-colors">
        再求一籤
      </button>
    </motion.div>
  );
};

export default TempleModal;
