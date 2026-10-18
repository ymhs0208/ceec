import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, CloudCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WelcomeSplashProps {
  userName: string;
  onComplete: () => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

const WelcomeSplash: React.FC<WelcomeSplashProps> = ({ userName, onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [welcomeType, setWelcomeType] = useState<'login' | 'signup'>('login');
  const onCompleteRef = React.useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const copy = useMemo(() => {
    const isSignup = welcomeType === 'signup';
    return {
      overline: isSignup ? '帳號建立完成' : '登入成功',
      title: isSignup ? `歡迎加入，${userName}` : `${userName}，歡迎回來`,
      subtitle: isSignup
        ? '你的學習空間已準備完成，從今天開始累積每一點進步。'
        : '資料已安全同步完成，今天也一起專注。',
    };
  }, [userName, welcomeType]);

  const complete = React.useCallback(() => {
    setIsVisible(false);
    window.setTimeout(() => onCompleteRef.current(), 360);
  }, []);

  useEffect(() => {
    const storedType = sessionStorage.getItem('gsat_welcome_type') as 'login' | 'signup' | null;
    if (storedType) setWelcomeType(storedType);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const completeTimer = window.setTimeout(complete, reducedMotion ? 1500 : 3100);
    if (reducedMotion) return () => window.clearTimeout(completeTimer);

    const confettiTimer = window.setTimeout(() => {
      confetti({
        particleCount: 28,
        spread: 48,
        startVelocity: 18,
        scalar: 0.65,
        origin: { x: 0.5, y: 0.42 },
        colors: ['#818cf8', '#5eead4', '#ddd6fe'],
        zIndex: 110,
      });
    }, 480);

    return () => {
      window.clearTimeout(completeTimer);
      window.clearTimeout(confettiTimer);
    };
  }, [complete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.section
          aria-live="polite"
          aria-label="登入成功"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-100/20 px-5 py-8 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease }}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white bg-white/95 p-1 shadow-[0_28px_80px_rgba(79,70,229,.20)]"
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.55, ease }}
          >
            <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-indigo-100/80 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-teal-100/70 blur-3xl" />
            <div className="relative rounded-[1.75rem] border border-slate-100 bg-gradient-to-br from-white via-white to-indigo-50/55 px-6 py-8 text-center sm:px-8">
              <motion.div
                className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center"
                initial={{ scale: 0.5, rotate: -14 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 160, delay: 0.1 }}
              >
                <motion.div className="absolute inset-0 rounded-[1.65rem] bg-indigo-200/60" animate={{ scale: [1, 1.16, 1], opacity: [0.65, 0, 0.65] }} transition={{ duration: 2, repeat: Infinity }} />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200">
                  <Check className="h-8 w-8 stroke-[3] text-white" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-black tracking-[0.16em] text-indigo-600">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {copy.overline}
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.45, ease }} className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {copy.title}
              </motion.h2>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-slate-500">
                {copy.subtitle}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }} className="mt-6 flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/75 px-4 py-3 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-teal-500 shadow-sm">
                  <CloudCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-teal-800">帳號已安全登入</p>
                  <p className="mt-0.5 text-[11px] font-medium text-teal-700/65">正在開啟你的 Focus Space</p>
                </div>
                <motion.span className="h-2 w-2 rounded-full bg-teal-400" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.1, repeat: Infinity }} />
              </motion.div>

              <motion.button type="button" onClick={complete} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 transition-colors hover:text-indigo-600 focus:outline-none focus-visible:text-indigo-600">
                立即進入 <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

export default WelcomeSplash;
