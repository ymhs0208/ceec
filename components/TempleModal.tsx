import React, { useState, useEffect } from 'react';
import { X, Flame, ScrollText, Ticket, Sparkles, Coins, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TempleState, IncenseRecord } from '../types';
import { FORTUNES } from '../data/fortunes';

const IncenseSmoke = () => (
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none z-0">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute bottom-1/2 left-1/2 w-4 h-4 bg-white/40 rounded-full blur-xl mix-blend-overlay"
        initial={{ opacity: 0, scale: 0.5, y: 0, x: '-50%' }}
        animate={{
          opacity: [0, 0.4, 0],
          scale: [0.5, 2, 4],
          y: [-20, -100, -200],
          x: ['-50%', `calc(-50% + ${Math.random() * 40 - 20}px)`, `calc(-50% + ${Math.random() * 100 - 50}px)`]
        }}
        transition={{
          duration: 4 + Math.random() * 2,
          repeat: Infinity,
          delay: i * 0.8,
          ease: "easeOut"
        }}
      />
    ))}
  </div>
);

const FallingBlessings = () => (
  <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-3xl">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ top: '-10%', left: `${Math.random() * 100}%`, opacity: 1, rotate: 0, scale: Math.random() * 0.5 + 0.5 }}
        animate={{ top: '110%', opacity: 0, rotate: Math.random() * 720 - 360 }}
        transition={{ duration: 2 + Math.random() * 2, ease: 'linear' }}
        className="absolute text-amber-500 flex items-center justify-center font-bold"
      >
        <Coins className="w-6 h-6" />
      </motion.div>
    ))}
  </div>
);

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
  onClose: () => void;
  incenseCoins: number;
  setIncenseCoins: React.Dispatch<React.SetStateAction<number>>;
  incenseRecords: IncenseRecord[];
  setIncenseRecords: React.Dispatch<React.SetStateAction<IncenseRecord[]>>;
  templeState: TempleState;
  setTempleState: React.Dispatch<React.SetStateAction<TempleState>>;
  variant?: 'modal' | 'page';
  userName?: string;
  targetSchool?: string;
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

const TempleModal: React.FC<TempleModalProps> = ({ isOpen, onClose, incenseCoins, setIncenseCoins, incenseRecords, setIncenseRecords, templeState, setTempleState, variant = 'modal', userName, targetSchool }) => {
  const [activeTab, setActiveTab] = useState<'lamp' | 'fortune' | 'ticket' | 'records'>('lamp');
  const [showFortune, setShowFortune] = useState<{ type: string; text: string } | null>(null);
  const [error, setError] = useState('');
  const ticketUserName = userName?.trim() || '考生';
  const ticketTargetSchool = targetSchool?.trim() || '目標學校';
  
  // Animation states
  const [isLightingLamp, setIsLightingLamp] = useState(false);
  const [isDrawingFortune, setIsDrawingFortune] = useState(false);
  const [isChoosingFortune, setIsChoosingFortune] = useState(false);
  const [isOfferingTicket, setIsOfferingTicket] = useState(false);
  const [showDivineFlash, setShowDivineFlash] = useState(false);

  if (!isOpen) return null;

  const playSound = (type: 'magic' | 'coins' | 'bell') => {
    try {
      let url = '';
      if (type === 'magic') url = 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3';
      if (type === 'coins') url = 'https://assets.mixkit.co/active_storage/sfx/2044/2044-preview.mp3';
      if (type === 'bell') url = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch(e) {}
  };

  const handleLightLamp = () => {
    if (incenseCoins < 100) {
      setError('香火幣不足！點光明燈需要 100 枚香火幣。');
      return;
    }
    
    // Check if already has active lamp
    const now = Date.now();
    const activeLamps = templeState.lamps.filter(l => l.expireAt > now);
    if (activeLamps.length > 0) {
      setError('您的光明燈還在亮著呢！');
      return;
    }

    setError('');
    setIsLightingLamp(true);
    playSound('magic');

    setTimeout(() => {
      setShowDivineFlash(true);
      playSound('bell');
      setTimeout(() => setShowDivineFlash(false), 500);
      
      setIncenseCoins(prev => prev - 100);
      setIncenseRecords(prev => [{
        id: Date.now().toString(),
        amount: -100,
        reason: '點光明燈',
        timestamp: Date.now()
      }, ...prev]);
      setTempleState(prev => ({
        ...prev,
        lamps: [...prev.lamps, { type: '光明燈', expireAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }] // 7 days
      }));
      setIsLightingLamp(false);
    }, 2000);
  };

  const handleDrawFortune = () => {
    if (incenseCoins < 30) {
      setError('香火幣不足！求籤需要 30 枚香火幣。');
      return;
    }

    setError('');
    setIsDrawingFortune(true);
    setIsChoosingFortune(false);
    setShowFortune(null);
    playSound('coins');

    setTimeout(() => {
      setIsDrawingFortune(false);
      setIsChoosingFortune(true);
    }, 900);
    return;

    setTimeout(() => {
      setShowDivineFlash(true);
      playSound('bell');
      setTimeout(() => setShowDivineFlash(false), 500);

      setIncenseCoins(prev => prev - 30);
      setIncenseRecords(prev => [{
        id: Date.now().toString(),
        amount: -30,
        reason: '求籤',
        timestamp: Date.now()
      }, ...prev]);
      const randomFortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      setShowFortune(randomFortune);
      setTempleState(prev => ({
        ...prev,
        fortunes: [{ ...randomFortune, date: Date.now() }, ...prev.fortunes].slice(0, 10) // Keep last 10
      }));
      setIsDrawingFortune(false);
    }, 2500);
  };

  const handlePickFortune = (stickIndex: number) => {
    if (!isChoosingFortune) return;
    setIsChoosingFortune(false);
    setIsDrawingFortune(true);
    playSound('magic');

    setTimeout(() => {
      setShowDivineFlash(true);
      playSound('bell');
      setTimeout(() => setShowDivineFlash(false), 500);

      setIncenseCoins(prev => prev - 30);
      setIncenseRecords(prev => [{
        id: Date.now().toString(),
        amount: -30,
        reason: '求籤',
        timestamp: Date.now()
      }, ...prev]);
      const randomFortune = FORTUNES[(Date.now() + stickIndex * 7) % FORTUNES.length];
      setShowFortune(randomFortune);
      setTempleState(prev => ({
        ...prev,
        fortunes: [{ ...randomFortune, date: Date.now() }, ...prev.fortunes].slice(0, 10)
      }));
      setIsDrawingFortune(false);
    }, 900);
  };

  const handleOfferTicket = () => {
    if (templeState.ticketOffered) {
      setError('您已經供奉過准考證了！文昌帝君會保佑您的。');
      return;
    }
    if (incenseCoins < 500) {
      setError('香火幣不足！供奉准考證需要 500 枚香火幣。');
      return;
    }

    setError('');
    setIsOfferingTicket(true);
    playSound('magic');

    setTimeout(() => {
      setShowDivineFlash(true);
      playSound('bell');
      setTimeout(() => setShowDivineFlash(false), 500);

      setIncenseCoins(prev => prev - 500);
      setIncenseRecords(prev => [{
        id: Date.now().toString(),
        amount: -500,
        reason: '供奉准考證',
        timestamp: Date.now()
      }, ...prev]);
      setTempleState(prev => ({ ...prev, ticketOffered: true }));
      setIsOfferingTicket(false);
    }, 2500);
  };

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
  const activeTempleTab = templeTabs.find(tab => tab.id === activeTab) || templeTabs[0];
  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setError('');
    setShowFortune(null);
    setIsChoosingFortune(false);
  };

  return (
    <div className={isPage ? "animate-fade-in" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"}>
      <style>{`
        @keyframes shake-bucket {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-15deg) translateY(-5px); }
          50% { transform: rotate(0deg) translateY(0); }
          75% { transform: rotate(15deg) translateY(-5px); }
        }
        .animate-shake-bucket {
          animation: shake-bucket 0.3s ease-in-out infinite;
        }
        @keyframes fly-out {
          0% { transform: translateY(0) rotate(0deg) scale(0.5); opacity: 0; }
          20% { transform: translateY(-30px) rotate(180deg) scale(1.2); opacity: 1; }
          80% { transform: translateY(-120px) rotate(720deg) scale(1.5); opacity: 1; }
          100% { transform: translateY(-150px) rotate(900deg) scale(2); opacity: 0; }
        }
        .animate-fly-out {
          animation: fly-out 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @keyframes float-offer {
          0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
          25% { transform: translateY(-20px) scale(1.1) rotate(-5deg); opacity: 0.9; filter: drop-shadow(0 0 20px #fbbf24); }
          50% { transform: translateY(-40px) scale(1.3) rotate(5deg); opacity: 0.8; filter: drop-shadow(0 0 40px #f59e0b); }
          75% { transform: translateY(-20px) scale(1.1) rotate(-2deg); opacity: 0.9; filter: drop-shadow(0 0 30px #fbbf24); }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 15px #f59e0b); }
        }
        .animate-float-offer {
          animation: float-offer 3s ease-in-out forwards;
        }
        @keyframes spark-move {
          0% { transform: translate(0, 0) scale(0) rotate(0deg); opacity: 0; }
          20% { transform: translate(var(--tx), var(--ty)) scale(2) rotate(45deg); opacity: 1; }
          80% { transform: translate(calc(var(--tx) * 1.5), calc(var(--ty) * 1.5)) scale(1.5) rotate(90deg); opacity: 1; }
          100% { transform: translate(calc(var(--tx) * 2), calc(var(--ty) * 2)) scale(0) rotate(180deg); opacity: 0; }
        }
        .animate-spark-move {
          animation: spark-move 2s ease-out forwards;
        }
        @keyframes lamp-glow {
          0% { filter: drop-shadow(0 0 0px rgba(245,158,11,0)); transform: scale(1); opacity: 0.5; }
          50% { filter: drop-shadow(0 0 60px rgba(245,158,11,1)); transform: scale(1.15); opacity: 1; }
          100% { filter: drop-shadow(0 0 40px rgba(245,158,11,0.8)); transform: scale(1); opacity: 0.8; }
        }
        .animate-lamp-glow {
          animation: lamp-glow 2s ease-in-out forwards;
          animation-delay: 0.5s;
        }
        @keyframes divine-flash {
          0% { opacity: 0; transform: scale(0.5) rotate(0deg); filter: brightness(1); }
          50% { opacity: 1; transform: scale(1.5) rotate(180deg); filter: brightness(2); }
          100% { opacity: 0; transform: scale(2.5) rotate(360deg); filter: brightness(1); }
        }
        .animate-divine-flash {
          animation: divine-flash 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes modal-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) rotate(-1deg); }
          20%, 40%, 60%, 80% { transform: translateX(5px) rotate(1deg); }
        }
        .animate-modal-shake {
          animation: modal-shake 0.5s ease-in-out;
        }
        @keyframes aura-rotate {
          from { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.05); }
          to { transform: rotate(360deg) scale(1); }
        }
        .animate-aura-rotate {
          animation: aura-rotate 8s linear infinite;
        }
        @keyframes float-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-float-up {
          animation: float-up 0.5s ease-out forwards;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(245, 158, 11, 0); }
          100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        @keyframes real-flame {
          0%, 100% { transform: translateX(-50%) scaleY(1) scaleX(1) rotate(-2deg); border-radius: 55% 45% 60% 40%; }
          25% { transform: translateX(-52%) scaleY(1.16) scaleX(0.92) rotate(3deg); border-radius: 45% 55% 48% 52%; }
          50% { transform: translateX(-48%) scaleY(0.94) scaleX(1.08) rotate(-4deg); border-radius: 58% 42% 52% 48%; }
          75% { transform: translateX(-51%) scaleY(1.08) scaleX(0.96) rotate(2deg); border-radius: 48% 52% 60% 40%; }
        }
        .real-flame {
          animation: real-flame 1.15s ease-in-out infinite;
          transform-origin: 50% 100%;
        }
        @keyframes wick-glow {
          0%, 100% { opacity: .7; box-shadow: 0 0 16px rgba(251,191,36,.65); }
          50% { opacity: 1; box-shadow: 0 0 34px rgba(245,158,11,.95); }
        }
        .wick-glow { animation: wick-glow 1.6s ease-in-out infinite; }
        @keyframes incense-thread {
          0% { transform: translate3d(0, 10px, 0) scale(.45); opacity: 0; }
          18% { opacity: .42; }
          100% { transform: translate3d(var(--smoke-x), -120px, 0) scale(2.3); opacity: 0; }
        }
        .incense-thread { animation: incense-thread 4.6s ease-out infinite; }
        @keyframes lamp-scene-breathe {
          0%, 100% { filter: saturate(1) brightness(1); }
          50% { filter: saturate(1.12) brightness(1.06); }
        }
        .lamp-scene-breathe { animation: lamp-scene-breathe 3.8s ease-in-out infinite; }
        @keyframes lamp-orb-rise {
          0% { transform: translate(-50%, 72px) scale(.38); opacity: 0; filter: blur(3px); }
          18% { opacity: 1; filter: blur(0); }
          58% { transform: translate(-50%, -38px) scale(.9); opacity: 1; }
          100% { transform: translate(-50%, -76px) scale(.18); opacity: 0; filter: blur(7px); }
        }
        .lamp-orb-rise { animation: lamp-orb-rise 1.75s cubic-bezier(.22,.9,.24,1) forwards; }
        @keyframes lamp-light-wave {
          0% { transform: translate(-50%, -50%) scale(.15); opacity: .8; }
          70% { opacity: .28; }
          100% { transform: translate(-50%, -50%) scale(1.25); opacity: 0; }
        }
        .lamp-light-wave { animation: lamp-light-wave 1.7s ease-out forwards; }
        @keyframes lamp-flame-bloom {
          0% { transform: translateX(-50%) scale(.2, .1) rotate(-3deg); opacity: 0; }
          40% { transform: translateX(-50%) scale(1.18, 1.32) rotate(2deg); opacity: 1; }
          70% { transform: translateX(-50%) scale(.92, .96) rotate(-2deg); }
          100% { transform: translateX(-50%) scale(1, 1) rotate(0deg); opacity: 1; }
        }
        .lamp-flame-bloom { animation: lamp-flame-bloom .9s cubic-bezier(.2,.9,.25,1) both, real-flame 1.12s .9s ease-in-out infinite; }
        @keyframes lamp-spark-float {
          0% { transform: translate3d(0, 0, 0) scale(.45); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate3d(var(--spark-x), var(--spark-y), 0) scale(0); opacity: 0; }
        }
        .lamp-spark-float { animation: lamp-spark-float 1.55s ease-out infinite; }
        @keyframes lamp-smoke-real {
          0% { transform: translate3d(0, 8px, 0) scale(.35) rotate(0deg); opacity: 0; }
          20% { opacity: .38; }
          100% { transform: translate3d(var(--smoke-x), -92px, 0) scale(1.9) rotate(22deg); opacity: 0; }
        }
        .lamp-smoke-real { animation: lamp-smoke-real 4.2s ease-out infinite; }
        @keyframes stick-shake {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          12% { transform: translateY(-7px) rotate(-7deg); }
          25% { transform: translateY(2px) rotate(6deg); }
          38% { transform: translateY(-6px) rotate(8deg); }
          52% { transform: translateY(1px) rotate(-6deg); }
          70% { transform: translateY(-4px) rotate(4deg); }
        }
        .stick-shake { animation: stick-shake .62s ease-in-out infinite; }
        @keyframes chosen-stick {
          0% { transform: translate(-50%, 22px) rotate(-5deg); opacity: 0; }
          35% { opacity: 1; }
          100% { transform: translate(-50%, -92px) rotate(7deg); opacity: 1; }
        }
        .chosen-stick { animation: chosen-stick 1.55s cubic-bezier(.2,.8,.2,1) forwards; }
        @keyframes fortune-paper-open {
          0% { transform: translateY(18px) scaleY(.18) rotateX(48deg); opacity: 0; filter: blur(2px); }
          45% { opacity: 1; filter: blur(0); }
          100% { transform: translateY(0) scaleY(1) rotateX(0deg); opacity: 1; filter: blur(0); }
        }
        .fortune-paper-open {
          animation: fortune-paper-open .95s cubic-bezier(.2,.8,.2,1) both;
          transform-origin: top center;
        }
        @keyframes fortune-stick-drop {
          0% { transform: translateY(-90px) rotate(-18deg); opacity: 0; }
          60% { opacity: 1; }
          100% { transform: translateY(0) rotate(-7deg); opacity: 1; }
        }
        .fortune-stick-drop { animation: fortune-stick-drop .8s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes paper-offer {
          0% { transform: translateY(18px) scale(.94) rotate(-2deg); opacity: .72; }
          35% { transform: translateY(-34px) scale(1.06) rotate(1deg); opacity: 1; filter: drop-shadow(0 18px 24px rgba(245,158,11,.28)); }
          70% { transform: translateY(-12px) scale(1.02) rotate(-.6deg); opacity: 1; }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
        }
        .paper-offer { animation: paper-offer 2.7s ease-in-out forwards; }
        @keyframes altar-light {
          0%, 100% { opacity: .2; transform: scaleX(.72); }
          50% { opacity: .85; transform: scaleX(1); }
        }
        .altar-light { animation: altar-light 1.8s ease-in-out infinite; }
      `}</style>
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={isPage ? "relative flex min-h-[calc(100vh-11rem)] w-full flex-col gap-6 overflow-visible rounded-[1.75rem] border border-amber-100/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-0 shadow-none transition-all duration-300" : "bg-gradient-to-b from-amber-50 to-orange-50 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative border border-amber-200/50 max-h-[90vh] overflow-y-auto custom-scrollbar transition-all duration-300"}
      >
        <AnimatePresence>
          {showDivineFlash && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden rounded-3xl"
            >
              <div className="w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(253,230,138,0.8)_30%,rgba(251,191,36,0)_70%)] animate-divine-flash mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-white/40 animate-pulse"></div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(isOfferingTicket || showDivineFlash) && <FallingBlessings />}
        </AnimatePresence>
        
        {!isPage && <button onClick={onClose} className="absolute top-4 right-4 text-amber-900/50 hover:text-amber-900 transition-colors z-10">
          <X className="w-6 h-6" />
        </button>}

        {isPage ? (
          <section className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-amber-100/50 backdrop-blur-xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"></div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-4">
                <button onClick={onClose} className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-700 shadow-sm transition-all hover:border-amber-300 hover:text-amber-950" title="返回主頁">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
                    <Sparkles className="h-4 w-4" /> Wenchang Temple
                  </p>
                  <h2 className="text-3xl font-black tracking-tight text-amber-950 sm:text-4xl">線上文昌廟</h2>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-amber-800/70">
                    把專注累積成香火幣，在這裡點光明燈、求文昌靈籤、供奉准考證，替考前努力留下儀式感。
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 lg:min-w-[380px]">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/90 px-3 py-3 text-center">
                  <div className="text-xl font-black text-amber-700">{incenseCoins}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-600/70">Coins</div>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/90 px-3 py-3 text-center">
                  <div className="text-xl font-black text-orange-700">{activeLamps.length}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-orange-600/70">Lamps</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-3 py-3 text-center">
                  <div className="text-xl font-black text-rose-700">{templeState.fortunes.length}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-rose-600/70">Fortunes</div>
                </div>
              </div>
            </div>
          </section>
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
            <span className="font-bold text-amber-900">香火幣：{incenseCoins}</span>
          </div>
        </div>
        )}

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

        <div className={isPage ? "grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]" : ""}>
        <div className={isPage ? "space-y-4" : "flex gap-2 mb-6 bg-white/40 p-1 rounded-2xl border border-amber-100 overflow-x-auto custom-scrollbar"}>
          {isPage && (
            <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-xl shadow-amber-100/50 backdrop-blur-xl">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500">Current Ritual</div>
              <div className="mt-1 text-lg font-black text-amber-950">{activeTempleTab.label}</div>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-800/60">{activeTempleTab.caption}</p>
            </div>
          )}
          <div className={isPage ? "grid grid-cols-2 gap-2 rounded-[1.5rem] border border-white/70 bg-white/85 p-3 shadow-xl shadow-amber-100/50 backdrop-blur-xl lg:grid-cols-1" : "contents"}>
            {templeTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
              <motion.button 
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={isPage
                  ? `relative flex min-h-[76px] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-3 py-3 text-center text-sm font-black transition-all lg:flex-row lg:justify-start lg:text-left ${isActive ? 'text-white shadow-lg shadow-amber-200/70 ring-1 ring-amber-300/70' : 'text-amber-700 hover:bg-amber-50'}`
                  : `relative flex-1 min-w-[100px] overflow-hidden py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isActive ? 'text-white shadow-md ring-1 ring-amber-300/70' : 'text-amber-700 hover:bg-white/60'}`
                }
              >
                {isActive && (
                  <motion.span
                    layoutId={isPage ? "temple-page-active-tab" : "temple-modal-active-tab"}
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                {isActive && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-x-3 bottom-0 h-8 rounded-full bg-white/25 blur-xl"
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.35 }}
                  />
                )}
                <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100/70 text-amber-600'}`}>
                  {tab.icon}
                </span>
                <span className="relative z-10">{tab.label}</span>
                {isPage && (
                  <span className={`relative z-10 rounded-full px-2 py-0.5 text-[10px] font-black transition-colors lg:ml-auto ${isActive ? 'bg-white/18 text-white/85' : 'bg-white/70 text-amber-600'}`}>
                    {tab.caption}
                  </span>
                )}
              </motion.button>
            )})}
          </div>
        </div>

        <div className={isPage ? "min-h-[520px] rounded-[1.5rem] border border-white/70 bg-white/85 p-4 text-center shadow-xl shadow-amber-100/50 backdrop-blur-xl sm:p-6 flex flex-col items-center justify-center" : "bg-white/80 rounded-2xl p-6 border border-amber-100 shadow-sm min-h-[250px] flex flex-col items-center justify-center text-center"}>
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
            <div className="space-y-4 relative w-full">
              <div className={`relative mx-auto h-72 w-full max-w-md overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-[radial-gradient(circle_at_50%_18%,rgba(254,243,199,.96),rgba(255,247,237,.78)_32%,rgba(146,64,14,.16)_70%,rgba(68,64,60,.28)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.85),0_22px_55px_rgba(146,64,14,.18)] ${isLampActive || isLightingLamp ? 'lamp-scene-breathe' : ''}`}>
                <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(120,53,15,.14),transparent)]"></div>
                <div className="absolute left-1/2 top-5 h-32 w-64 -translate-x-1/2 rounded-b-[8rem] border-x border-b border-amber-300/45 bg-gradient-to-b from-amber-100/55 to-transparent"></div>
                <div className="absolute left-1/2 top-9 h-2 w-40 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-amber-500/35 to-transparent"></div>
                <div className="absolute left-10 top-11 h-36 w-2 rounded-full bg-gradient-to-b from-amber-200/80 via-orange-300/45 to-transparent"></div>
                <div className="absolute right-10 top-11 h-36 w-2 rounded-full bg-gradient-to-b from-amber-200/80 via-orange-300/45 to-transparent"></div>

                {(isLampActive || isLightingLamp) && (
                  <>
                    <div className="wick-glow absolute left-1/2 top-16 h-36 w-36 -translate-x-1/2 rounded-full bg-amber-300/25 blur-3xl"></div>
                    <div className="absolute left-1/2 top-24 h-44 w-44 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(253,224,71,.34),rgba(251,146,60,.16)_42%,transparent_70%)]"></div>
                  </>
                )}

                {isLightingLamp && (
                  <>
                    <div className="lamp-orb-rise absolute bottom-[5.9rem] left-1/2 z-30 h-9 w-9 rounded-full bg-[radial-gradient(circle,white_0%,#fde68a_32%,#f59e0b_64%,transparent_72%)] shadow-[0_0_34px_rgba(245,158,11,.95)]"></div>
                    <div className="lamp-light-wave absolute left-1/2 top-[8.9rem] z-20 h-44 w-44 rounded-full border border-amber-200/70 bg-amber-200/10"></div>
                    <div className="absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-xs font-black text-amber-700 shadow-lg shadow-amber-200/40">
                      點燈中
                    </div>
                    {[...Array(14)].map((_, i) => (
                      <span
                        key={i}
                        className="lamp-spark-float absolute left-1/2 top-[9rem] z-30 h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_12px_rgba(251,191,36,.9)]"
                        style={{
                          '--spark-x': `${(i % 2 === 0 ? -1 : 1) * (24 + i * 4)}px`,
                          '--spark-y': `${-28 - (i % 5) * 18}px`,
                          animationDelay: `${i * 0.08}s`
                        } as React.CSSProperties}
                      />
                    ))}
                  </>
                )}

                <div className="absolute bottom-9 left-1/2 h-8 w-64 -translate-x-1/2 rounded-full bg-stone-500/25 blur-md"></div>
                <div className="absolute bottom-11 left-1/2 h-6 w-60 -translate-x-1/2 rounded-[50%] bg-gradient-to-r from-stone-300 via-amber-200 to-stone-300 shadow-lg"></div>
                <div className="absolute bottom-[4.2rem] left-1/2 h-16 w-48 -translate-x-1/2 rounded-[50%] border border-amber-300/80 bg-gradient-to-b from-yellow-100 via-amber-300 to-orange-500 shadow-[inset_0_-16px_26px_rgba(120,53,15,.35),0_16px_28px_rgba(146,64,14,.24)]"></div>
                <div className="absolute bottom-[5.2rem] left-1/2 h-9 w-52 -translate-x-1/2 rounded-[50%] border border-amber-200 bg-gradient-to-r from-orange-300 via-yellow-100 to-orange-300 shadow-[inset_0_8px_16px_rgba(120,53,15,.18)]"></div>
                <div className="absolute bottom-[5.55rem] left-1/2 h-5 w-40 -translate-x-1/2 rounded-[50%] bg-gradient-to-r from-amber-900/45 via-amber-600/40 to-amber-900/45"></div>
                {[...Array(9)].map((_, i) => (
                  <span
                    key={i}
                    className="absolute bottom-[4.65rem] left-1/2 h-10 w-6 origin-bottom rounded-t-full border border-amber-300/60 bg-gradient-to-b from-yellow-100 to-orange-300 shadow-sm"
                    style={{
                      transform: `translateX(-50%) rotate(${(i - 4) * 13}deg) translateY(${Math.abs(i - 4) * 1.6}px)`
                    }}
                  />
                ))}
                <div className="absolute bottom-[9.05rem] left-1/2 z-20 h-10 w-2 -translate-x-1/2 rounded-full bg-gradient-to-b from-stone-700 to-stone-950"></div>

                {(isLampActive || isLightingLamp) ? (
                  <>
                    <div className={`${isLightingLamp ? 'lamp-flame-bloom' : 'real-flame'} absolute bottom-[9.35rem] left-1/2 z-30 h-20 w-12 bg-gradient-to-t from-orange-700 via-amber-300 to-white shadow-[0_0_46px_rgba(245,158,11,.95)]`}></div>
                    <div className={`${isLightingLamp ? 'lamp-flame-bloom' : 'real-flame'} absolute bottom-[9.85rem] left-1/2 z-40 h-12 w-6 bg-gradient-to-t from-yellow-300 via-white to-white/95 opacity-90`} style={{ animationDuration: '.86s' }}></div>
                    {[...Array(6)].map((_, i) => (
                      <span
                        key={i}
                        className="lamp-smoke-real absolute bottom-[11.25rem] left-1/2 z-10 h-9 w-9 rounded-full border border-stone-300/30 blur-[1.5px]"
                        style={{
                          '--smoke-x': `${(i % 2 === 0 ? -1 : 1) * (14 + i * 6)}px`,
                          animationDelay: `${i * 0.5}s`
                        } as React.CSSProperties}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <div className="absolute bottom-[9.35rem] left-1/2 z-20 h-4 w-4 -translate-x-1/2 rounded-full bg-stone-500/55 shadow-[0_0_10px_rgba(120,113,108,.3)]"></div>
                    <div className="absolute bottom-[10.1rem] left-1/2 z-20 h-5 w-px -translate-x-1/2 rounded-full bg-stone-400/45"></div>
                  </>
                )}
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-lg">點光明燈</h3>
                <p className="text-sm text-amber-700/70 mt-1">
                  {isLampActive
                    ? `光明燈已點亮，持續為你的讀書計畫祈願加持，剩餘 ${Math.ceil((activeLamps[0].expireAt - now) / (1000 * 60 * 60 * 24))} 天`
                    : '點燃燈芯後會亮起火焰、燈暈與煙線，象徵讀書路上的專注與平安。'}
                </p>
              </div>
              {!isLampActive && (
                <button
                  onClick={handleLightLamp}
                  disabled={isLightingLamp}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Coins className="w-4 h-4" /> {isLightingLamp ? '點燈中...' : '100 香火幣'}
                </button>
              )}
            </div>
          )}

          {false && activeTab === 'lamp' && (
            <div className="space-y-4 relative w-full">
              <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-1000 relative ${isLampActive ? 'bg-amber-100 shadow-[0_0_60px_rgba(245,158,11,0.7)] animate-pulse-ring' : 'bg-slate-100'}`}>
                {isLampActive && (
                  <>
                    <div className="absolute inset-[-20px] rounded-full border-2 border-amber-300/40 border-dashed animate-aura-rotate"></div>
                    <IncenseSmoke />
                  </>
                )}
                <Flame className={`w-16 h-16 relative z-10 transition-all duration-500 ${isLampActive ? 'text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-110' : 'text-slate-300'}`} />
                {isLightingLamp && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <Sparkles 
                        key={i} 
                        className="w-8 h-8 text-amber-500 absolute animate-spark-move z-20" 
                        style={{ 
                          '--tx': `${Math.cos(i * Math.PI / 4) * 100}px`, 
                          '--ty': `${Math.sin(i * Math.PI / 4) * 100}px`,
                          animationDelay: `${i * 0.1}s` 
                        } as React.CSSProperties} 
                      />
                    ))}
                    <div className="absolute inset-0 rounded-full animate-lamp-glow bg-gradient-to-tr from-amber-300/50 to-orange-400/50 blur-md"></div>
                  </>
                )}
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-lg">文昌光明燈</h3>
                <p className="text-sm text-amber-700/70 mt-1">
                  {isLampActive 
                    ? `您的光明燈正在照亮前程！(剩餘 ${Math.ceil((activeLamps[0].expireAt - now) / (1000 * 60 * 60 * 24))} 天)`
                    : '點亮光明燈，祈求考運亨通、思緒清晰。'}
                </p>
              </div>
              {!isLampActive && (
                <button 
                  onClick={handleLightLamp} 
                  disabled={isLightingLamp}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Coins className="w-4 h-4" /> 消耗 100 香火幣
                </button>
              )}
            </div>
          )}

          {activeTab === 'fortune' && (
            <div className="space-y-4 w-full">
              {showFortune ? (
                <FortuneResult fortune={showFortune} onReset={() => setShowFortune(null)} />
              ) : (
                <>
                  <div className="relative mx-auto h-56 w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-amber-100 bg-gradient-to-b from-orange-50 via-amber-50 to-stone-100 shadow-inner">
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-stone-200/90 to-transparent"></div>
                    <div className="absolute bottom-8 left-1/2 h-7 w-44 -translate-x-1/2 rounded-full bg-stone-300/70 blur-sm"></div>
                    <div className={`absolute left-1/2 top-12 h-32 w-28 -translate-x-1/2 origin-bottom rounded-b-[2.5rem] rounded-t-xl bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900 shadow-xl ${isDrawingFortune ? 'stick-shake' : ''}`}>
                      <div className="absolute inset-x-2 top-3 h-3 rounded-full bg-amber-950/35"></div>
                      <div className="absolute inset-x-3 bottom-4 h-16 rounded-b-[2rem] rounded-t-md bg-gradient-to-r from-amber-800 via-amber-500 to-amber-800 shadow-inner"></div>
                      {[...Array(13)].map((_, i) => (
                        <span
                          key={i}
                          className="absolute bottom-24 left-1/2 h-24 w-1.5 origin-bottom rounded-full bg-gradient-to-t from-yellow-800 via-amber-500 to-amber-100 shadow-sm"
                          style={{
                            transform: `translateX(-50%) rotate(${(i - 6) * 5.5}deg)`,
                            zIndex: 13 - Math.abs(i - 6)
                          }}
                        />
                      ))}
                    </div>
                    {isDrawingFortune && (
                      <>
                        <div className="chosen-stick absolute left-1/2 top-28 z-20 h-32 w-2 rounded-full bg-gradient-to-t from-yellow-800 via-amber-500 to-amber-100 shadow-[0_0_18px_rgba(245,158,11,.45)]">
                          <span className="absolute -top-2 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border border-amber-300 bg-amber-100"></span>
                        </div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(251,191,36,.22),transparent_55%)] animate-pulse"></div>
                      </>
                    )}
                    {isChoosingFortune && (
                      <div className="absolute inset-x-6 top-5 z-30 h-36">
                        <div className="mb-2 rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-center text-xs font-black text-amber-800 shadow-sm">
                          選一支籤
                        </div>
                        {[...Array(7)].map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handlePickFortune(i)}
                            className="absolute left-1/2 bottom-0 h-28 w-5 origin-bottom -translate-x-1/2 rounded-full bg-gradient-to-t from-yellow-800 via-amber-500 to-amber-100 shadow-md transition-transform hover:-translate-y-3 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            style={{
                              transform: `translateX(-50%) rotate(${(i - 3) * 11}deg)`,
                              zIndex: 20 - Math.abs(i - 3)
                            }}
                            aria-label={`抽第 ${i + 1} 支籤`}
                          >
                            <span className="absolute -top-1 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-amber-300 bg-amber-100"></span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 text-lg">求籤</h3>
                    <p className="text-sm text-amber-700/70 mt-1">搖動籤筒、抽出一支籤，讓讀書與考試方向得到一段提醒。</p>
                  </div>
                  <button
                    onClick={handleDrawFortune}
                    disabled={isDrawingFortune || isChoosingFortune}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Coins className="w-4 h-4" /> {isChoosingFortune ? '請選一支籤' : isDrawingFortune ? '搖籤中...' : '30 香火幣'}
                  </button>
                </>
              )}
            </div>
          )}

          {false && activeTab === 'fortune' && (
            <div className="space-y-4 w-full">
              {showFortune ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-500 to-orange-700 mb-4 drop-shadow-sm">{showFortune.type}</div>
                  <div className="text-lg font-bold text-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-200/60 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50"></div>
                    {showFortune.text}
                  </div>
                  <button onClick={() => setShowFortune(null)} className="mt-6 px-4 py-2 rounded-full bg-amber-100 text-sm text-amber-700 font-bold hover:bg-amber-200 hover:text-amber-900 transition-colors">
                    再求一籤
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                    <motion.div 
                      animate={isDrawingFortune ? { rotate: [0, -15, 15, -15, 15, 0], y: [0, -5, -5, -5, -5, 0] } : { rotate: 0, y: 0 }}
                      transition={{ duration: 0.5, repeat: isDrawingFortune ? Infinity : 0 }}
                      className={`w-32 h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center relative z-10 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.05),0_10px_20px_rgba(245,158,11,0.2)] border-4 border-white`}
                    >
                      <ScrollText className={`w-14 h-14 text-amber-600 drop-shadow-sm`} />
                    </motion.div>
                    {isDrawingFortune && (
                      <>
                        <AnimatePresence>
                          {[...Array(5)].map((_, i) => (
                            <motion.div 
                              key={i}
                              initial={{ y: 0, rotate: 0, scale: 0.5, opacity: 0 }}
                              animate={{ 
                                y: [-30, -120, -150], 
                                rotate: [180, 720, 900], 
                                scale: [1.2, 1.5, 2], 
                                opacity: [1, 1, 0] 
                              }}
                              transition={{ duration: 2, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-24 bg-gradient-to-t from-amber-600 to-orange-400 rounded-full z-0 shadow-md border border-amber-300/50" 
                              style={{ transformOrigin: 'bottom center' }}
                            />
                          ))}
                        </AnimatePresence>
                        <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping" style={{ animationDuration: '1s' }}></div>
                      </>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 text-lg">文昌靈籤</h3>
                    <p className="text-sm text-amber-700/70 mt-1">誠心默念您的問題，求取文昌帝君的指引。</p>
                  </div>
                  <button 
                    onClick={handleDrawFortune} 
                    disabled={isDrawingFortune}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Coins className="w-4 h-4" /> 消耗 30 香火幣
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'ticket' && (
            <div className="space-y-4 w-full">
              <div className="relative mx-auto h-72 w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-amber-100 bg-gradient-to-b from-rose-50 via-amber-50 to-stone-100 shadow-inner">
                <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,.22),transparent_70%)]"></div>
                <div className="absolute bottom-8 left-1/2 h-8 w-56 -translate-x-1/2 rounded-full bg-stone-300/70 blur-sm"></div>
                <div className="absolute inset-x-8 bottom-10 h-12 rounded-t-2xl bg-gradient-to-r from-red-950 via-red-700 to-red-950 shadow-xl"></div>
                <div className="absolute inset-x-12 bottom-[5.35rem] h-5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-500 shadow-md"></div>
                {(isOfferingTicket || templeState.ticketOffered) && (
                  <div className="altar-light absolute bottom-20 left-1/2 h-12 w-48 -translate-x-1/2 rounded-full bg-amber-300/40 blur-xl"></div>
                )}
                <motion.div
                  animate={isOfferingTicket ? {
                    y: [20, -28, -10, 0],
                    scale: [0.94, 1.07, 1.02, 1],
                    rotate: [-2, 1.2, -0.6, 0]
                  } : {}}
                  transition={{ duration: 2.7, ease: 'easeInOut' }}
                  className={`absolute left-1/2 top-7 w-[min(12rem,calc(100%-2.25rem))] -translate-x-1/2 rounded-xl border bg-white p-2.5 text-left shadow-2xl ${isOfferingTicket || templeState.ticketOffered ? 'paper-offer border-amber-300 shadow-amber-200/70' : 'border-stone-200'}`}
                >
                  <div className="mb-2 flex items-center justify-between border-b border-red-100 pb-2">
                    <span className="text-xs font-black tracking-[0.2em] text-red-700">准考證</span>
                    <Ticket className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[9px] font-black tracking-[0.16em] text-stone-400">考生姓名</div>
                      <div className="mt-0.5 max-w-full truncate text-xs font-black text-stone-900">{ticketUserName}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black tracking-[0.16em] text-stone-400">目標學校</div>
                      <div className="mt-0.5 line-clamp-2 max-w-full text-xs font-black leading-snug text-amber-800">{ticketTargetSchool}</div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-end gap-2 border-t border-amber-100 pt-2">
                      <div>
                        <div className="text-[9px] font-black tracking-[0.16em] text-stone-400">祈願事項</div>
                        <div className="mt-0.5 text-[10px] font-bold leading-tight text-stone-600">考試順利・金榜題名</div>
                      </div>
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-red-200 text-[9px] font-black text-red-600">
                        文昌
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 h-4 w-16 -translate-x-1/2 rounded-full bg-red-700/15 blur-sm"></div>
                </motion.div>
                {isOfferingTicket && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <span
                        key={i}
                        className="absolute h-1.5 w-1.5 rounded-full bg-amber-400 animate-spark-move"
                        style={{
                          left: '50%',
                          top: '45%',
                          '--tx': `${Math.cos(i * Math.PI / 4) * 92}px`,
                          '--ty': `${Math.sin(i * Math.PI / 4) * 58}px`,
                          animationDelay: `${i * 0.07}s`
                        } as React.CSSProperties}
                      />
                    ))}
                  </>
                )}
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-lg">供奉准考證</h3>
                <p className="text-sm text-amber-700/70 mt-1">
                  {templeState.ticketOffered
                    ? '准考證已安放在供桌上，願考試當天穩定發揮、心神安定。'
                    : '將准考證慢慢升上供桌，伴隨光暈與金點，完成考前祈願。'}
                </p>
              </div>
              {!templeState.ticketOffered && (
                <button
                  onClick={handleOfferTicket}
                  disabled={isOfferingTicket}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Coins className="w-4 h-4" /> {isOfferingTicket ? '供奉中...' : '500 香火幣'}
                </button>
              )}
            </div>
          )}

          {false && activeTab === 'ticket' && (
            <div className="space-y-4 w-full">
              <motion.div 
                animate={isOfferingTicket ? { 
                  y: [0, -40, -20, 0], 
                  scale: [1, 1.3, 1.1, 1],
                  rotate: [0, 5, -2, 0],
                  filter: [
                    'drop-shadow(0 0 0px #f59e0b)',
                    'drop-shadow(0 0 40px #f59e0b)',
                    'drop-shadow(0 0 30px #fbbf24)',
                    'drop-shadow(0 0 15px #f59e0b)'
                  ]
                } : {}}
                transition={{ duration: 3, ease: "easeInOut" }}
                className={`w-32 h-32 mx-auto rounded-2xl flex items-center justify-center transition-all duration-700 relative ${templeState.ticketOffered ? 'bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.5)] animate-pulse-ring' : 'bg-slate-50 border-2 border-dashed border-slate-300'}`}
              >
                {templeState.ticketOffered && (
                  <div className="absolute inset-[-20px] rounded-2xl border-2 border-amber-300/30 border-dotted animate-aura-rotate"></div>
                )}
                <Ticket className={`w-16 h-16 transition-all duration-500 ${templeState.ticketOffered || isOfferingTicket ? 'text-amber-600 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-110' : 'text-slate-300'}`} />
                {isOfferingTicket && (
                  <>
                    <Sparkles className="w-24 h-24 text-amber-400 absolute inset-0 m-auto animate-ping opacity-60" style={{ animationDuration: '1.5s' }} />
                    <Sparkles className="w-16 h-16 text-orange-500 absolute inset-0 m-auto animate-ping opacity-80" style={{ animationDuration: '1s', animationDelay: '0.2s' }} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/30 to-orange-300/30 rounded-2xl animate-pulse blur-sm"></div>
                  </>
                )}
              </motion.div>
              <div>
                <h3 className="font-bold text-amber-900 text-lg">供奉准考證</h3>
                <p className="text-sm text-amber-700/70 mt-1">
                  {templeState.ticketOffered 
                    ? '您的准考證已安放於文昌帝君神案前，必定金榜題名！'
                    : '將虛擬准考證供奉於神案前，祈求考試順利。'}
                </p>
              </div>
              {!templeState.ticketOffered && (
                <button 
                  onClick={handleOfferTicket} 
                  disabled={isOfferingTicket}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Coins className="w-4 h-4" /> 消耗 500 香火幣
                </button>
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
                  {incenseRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                      <div>
                        <div className="font-bold text-amber-900 text-sm">{record.reason}</div>
                        <div className="text-xs text-amber-700/60">{new Date(record.timestamp).toLocaleString()}</div>
                      </div>
                      <div className={`font-bold ${record.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {record.amount > 0 ? '+' : ''}{record.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </motion.div>
          </AnimatePresence>
        </div>
        </div>
      </motion.div>
    </div>
  );
};

interface FortuneResultProps {
  fortune: { type: string; text: string };
  onReset: () => void;
}

const FortuneResult: React.FC<FortuneResultProps> = ({ fortune, onReset }) => {
  const fortuneLines = fortune.text
    .replace(/\\n/g, '\n')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  const fortuneNo = Math.max(1, Array.from(fortune.type).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 60);

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full">
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
                  <p key={`${line}-${index}`} className={`${index === 0 ? 'text-base text-amber-950' : 'text-sm text-stone-700'} font-bold leading-7`}>
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

      <button onClick={onReset} className="mt-5 mx-auto flex px-5 py-2.5 rounded-full bg-amber-100 text-sm text-amber-800 font-black hover:bg-amber-200 hover:text-amber-950 transition-colors">
        再求一籤
      </button>
    </motion.div>
  );
};

export default TempleModal;
