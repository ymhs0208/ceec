import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, Sparkles, Timer, Flame, BookOpen, ListChecks, Star, X } from 'lucide-react';
import { Achievement } from '../utils/achievements';

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const CATEGORY_META = {
  time: {
    label: '專注時間',
    icon: Timer,
    accent: 'amber',
    ring: 'ring-amber-100',
    badge: 'border-amber-100 bg-amber-50 text-amber-700',
    glow: 'bg-amber-300/20',
    button: 'hover:bg-amber-50 hover:text-amber-700',
  },
  streak: {
    label: '連續紀錄',
    icon: Flame,
    accent: 'rose',
    ring: 'ring-rose-100',
    badge: 'border-rose-100 bg-rose-50 text-rose-700',
    glow: 'bg-rose-300/20',
    button: 'hover:bg-rose-50 hover:text-rose-700',
  },
  subject: {
    label: '科目熟練',
    icon: BookOpen,
    accent: 'sky',
    ring: 'ring-sky-100',
    badge: 'border-sky-100 bg-sky-50 text-sky-700',
    glow: 'bg-sky-300/20',
    button: 'hover:bg-sky-50 hover:text-sky-700',
  },
  task: {
    label: '任務完成',
    icon: ListChecks,
    accent: 'emerald',
    ring: 'ring-emerald-100',
    badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    glow: 'bg-emerald-300/20',
    button: 'hover:bg-emerald-50 hover:text-emerald-700',
  },
  special: {
    label: '特殊挑戰',
    icon: Star,
    accent: 'violet',
    ring: 'ring-violet-100',
    badge: 'border-violet-100 bg-violet-50 text-violet-700',
    glow: 'bg-violet-300/20',
    button: 'hover:bg-violet-50 hover:text-violet-700',
  },
} as const;

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onClose }) => {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const meta = useMemo(() => {
    if (!achievement) return CATEGORY_META.special;
    return CATEGORY_META[achievement.category] || CATEGORY_META.special;
  }, [achievement]);

  useEffect(() => {
    if (!achievement) return;

    const defaults = {
      startVelocity: 22,
      spread: 72,
      ticks: 80,
      scalar: 0.85,
      zIndex: 100000,
      colors: ['#f59e0b', '#6366f1', '#14b8a6', '#ffffff'],
    };

    confetti({ ...defaults, particleCount: 56, origin: { x: 0.5, y: 0.82 }, angle: 90 });
    confetti({ ...defaults, particleCount: 24, origin: { x: 0.25, y: 0.9 }, angle: 60 });
    confetti({ ...defaults, particleCount: 24, origin: { x: 0.75, y: 0.9 }, angle: 120 });

    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audio.volume = 0.28;
    audio.play().catch(() => {});

    const timer = window.setTimeout(() => {
      onCloseRef.current();
    }, 5200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [achievement?.id]);

  const CategoryIcon = meta.icon;

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          key={achievement.id}
          initial={{ opacity: 0, y: 36, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(8px)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="fixed inset-x-4 bottom-6 z-[60000] mx-auto w-auto max-w-md sm:bottom-8"
          role="status"
          aria-live="polite"
        >
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/95 p-4 shadow-2xl shadow-slate-300/70 backdrop-blur-xl sm:p-5">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl ${meta.glow}`} />
            <div className={`absolute -bottom-12 left-8 h-28 w-28 rounded-full blur-3xl ${meta.glow}`} />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-indigo-400 to-teal-400" />

            <div className="relative z-10 flex gap-4">
              <motion.div
                initial={{ rotate: -14, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 20, delay: 0.08 }}
                className={`relative flex h-[4.25rem] w-[4.25rem] flex-shrink-0 items-center justify-center rounded-[1.25rem] bg-white text-4xl shadow-lg shadow-slate-200/80 ring-8 ${meta.ring}`}
              >
                <span className="leading-none">{achievement.icon}</span>
                <span className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white shadow-md">
                  <Award className="h-4 w-4" />
                </span>
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${meta.badge}`}
                  >
                    <CategoryIcon className="h-3.5 w-3.5" />
                    {meta.label}
                  </motion.div>
                  <button
                    onClick={onClose}
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors ${meta.button}`}
                    aria-label="關閉成就通知"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="mt-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  成就已解鎖
                </motion.div>

                <motion.h4
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                  className="mt-1 truncate text-xl font-black tracking-tight text-slate-950"
                >
                  {achievement.title}
                </motion.h4>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-1 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500"
                >
                  {achievement.description}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38 }}
                  className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500"
                >
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  已加入成就收藏，繼續保持節奏。
                </motion.div>
              </div>
            </div>

            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5.2, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-1 w-full origin-left bg-gradient-to-r from-amber-400 via-indigo-400 to-teal-400"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
