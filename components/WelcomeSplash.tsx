import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Cloud, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WelcomeSplashProps {
  userName: string;
  onComplete: () => void;
}

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
      eyebrow: isSignup ? '帳號建立完成' : '登入成功',
      title: isSignup ? `歡迎加入，${userName}` : `歡迎回來，${userName}`,
      subtitle: isSignup
        ? '你的讀書空間已準備好，接下來每一步都會被好好記錄。'
        : '雲端資料已同步完成，今天也從一個清楚的起點開始。',
      status: isSignup ? '個人空間已建立' : '讀書紀錄已同步',
    };
  }, [userName, welcomeType]);

  const handleClose = React.useCallback(() => {
    setIsVisible(false);
    window.setTimeout(() => {
      onCompleteRef.current();
    }, 650);
  }, []);

  useEffect(() => {
    const storedType = sessionStorage.getItem('gsat_welcome_type') as 'login' | 'signup' | null;
    if (storedType) setWelcomeType(storedType);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const timer = window.setTimeout(handleClose, 2600);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(handleClose, 4300);
    const burstTimer = window.setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 72,
        startVelocity: 34,
        origin: { x: 0.5, y: 0.48 },
        colors: ['#4f46e5', '#14b8a6', '#a855f7', '#facc15', '#ffffff'],
        zIndex: 120,
      });
    }, 720);

    const sparkleTimer = window.setTimeout(() => {
      confetti({
        particleCount: 36,
        spread: 120,
        startVelocity: 20,
        scalar: 0.72,
        origin: { x: 0.5, y: 0.28 },
        colors: ['#c7d2fe', '#99f6e4', '#fef3c7'],
        zIndex: 120,
      });
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(burstTimer);
      window.clearTimeout(sparkleTimer);
    };
  }, [handleClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleClose}
          className="fixed inset-0 z-[100] flex cursor-pointer select-none items-center justify-center overflow-hidden bg-slate-50/95 px-4 py-8 text-slate-900 backdrop-blur-2xl"
          role="status"
          aria-live="polite"
        >
          <motion.div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/70 blur-3xl"
            animate={{ scale: [0.9, 1.08, 0.98], opacity: [0.45, 0.72, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute -right-20 top-12 h-72 w-72 rounded-full bg-teal-200/70 blur-3xl"
            animate={{ y: [0, 24, 0], x: [0, -18, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute -bottom-24 left-8 h-80 w-80 rounded-full bg-fuchsia-200/60 blur-3xl"
            animate={{ y: [0, -20, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div
            initial={{ y: 26, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -16, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 180 }}
            className="relative w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 p-1 shadow-[0_30px_100px_rgba(79,70,229,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-[radial-gradient(circle_at_20%_0%,rgba(199,210,254,.55),transparent_34%),linear-gradient(145deg,rgba(255,255,255,.96),rgba(248,250,252,.82))] p-6 sm:p-8">
              <motion.div
                aria-hidden="true"
                className="absolute right-8 top-8 h-24 w-24 rounded-full border border-indigo-100"
                animate={{ rotate: 360 }}
                transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
              >
                <span className="absolute -left-1 top-7 h-2.5 w-2.5 rounded-full bg-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.8)]" />
              </motion.div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 170, delay: 0.12 }}
                  className="relative mb-6 flex h-24 w-24 items-center justify-center"
                >
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-indigo-500 via-violet-500 to-teal-400 shadow-[0_22px_60px_rgba(79,70,229,0.30)]" />
                  <motion.div
                    className="absolute inset-2 rounded-[1.5rem] border border-white/40"
                    animate={{ scale: [1, 1.08, 1], opacity: [0.65, 1, 0.65] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {welcomeType === 'signup' ? (
                    <GraduationCap className="relative z-10 h-11 w-11 text-white" />
                  ) : (
                    <CheckCircle2 className="relative z-10 h-11 w-11 text-white" />
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-700"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {copy.eyebrow}
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42 }}
                  className="max-w-xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl"
                >
                  {copy.title}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.58 }}
                  className="mt-4 max-w-md text-sm font-semibold leading-7 text-slate-600 sm:text-base"
                >
                  {copy.subtitle}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.78 }}
                  className="mt-7 grid w-full grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-left backdrop-blur">
                    <div className="flex items-center gap-2 text-xs font-black text-teal-700">
                      <Cloud className="h-4 w-4" />
                      {copy.status}
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-teal-300 to-indigo-300"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 0.9, duration: 1.05, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-left backdrop-blur">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-700">
                      <ShieldCheck className="h-4 w-4" />
                      安全登入已確認
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-slate-500">
                      可以繼續計時、同步與查看排行。
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.15 }}
                  className="mt-6 text-[11px] font-bold text-slate-400"
                  onClick={handleClose}
                >
                  點擊任意處以跳過
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeSplash;
