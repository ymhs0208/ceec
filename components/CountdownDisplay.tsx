import './CountdownDisplay.css';
import ModalLayer from './ModalLayer';
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { User } from '../types';
import { CalendarDays, Clock, Timer, ChevronRight, AlertCircle, BookOpen, Coffee, Flag, Sparkles, Hourglass, Bell, GraduationCap, PenTool, X } from 'lucide-react';
import Greeting from './Greeting';
import { EXAM_PRESETS } from '../constants';
import { getTimeLeft, getTaipeiDateString, getTaipeiTimeSeconds, taipeiDateTimeMs } from '../utils/time';

interface CountdownDisplayProps {
  targetDate: Date;
  user: User | null;
  examName?: string;
  examShortName?: string;
  currentExamId?: string;
  tvetCategory?: string;
  onExamChange?: (id: string, date: string) => void;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ 
  targetDate, 
  user, 
  examName = '學測', 
  examShortName = '學測',
  currentExamId,
  tvetCategory,
  onExamChange
}) => {
  const [now, setNow] = useState(new Date());
  const timeLeft = getTimeLeft(targetDate, now);
  const [isExamSwitcherOpen, setIsExamSwitcherOpen] = useState(false);
  const [examSwitchStep, setExamSwitchStep] = useState<'category' | 'year'>('category');
  const [selectedExamCategory, setSelectedExamCategory] = useState(() =>
    EXAM_PRESETS.find(exam => exam.id === currentExamId)?.category || 'gsat',
  );

  useEffect(() => {
    if (!isExamSwitcherOpen) setSelectedExamCategory(EXAM_PRESETS.find(exam => exam.id === currentExamId)?.category || 'gsat');
    setExamSwitchStep('category');
  }, [currentExamId, isExamSwitcherOpen]);

  useEffect(() => {
    let timeoutId: number | undefined;

    const tick = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const current = new Date();
      setNow(current);
      if (!document.hidden) {
        timeoutId = window.setTimeout(tick, 1000 - (current.getTime() % 1000) + 12);
      }
    };

    tick();
    document.addEventListener('visibilitychange', tick);
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const liveExamStatus = useMemo(() => {
    let currentExam = EXAM_PRESETS.find(e => e.id === currentExamId);
    if (!currentExam || !currentExam.schedule) return null;

    const isFireworksTestMode = import.meta.env.DEV
      && typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('fireworksTest') === '1';

    if (isFireworksTestMode) {
      return {
        state: 'FINISHED',
        title: '測驗已圓滿落幕',
        subject: '🎉',
        countdownTo: '',
        remainingSeconds: 0,
        label: '煙火秀測試中',
        examName: currentExam.name,
        dayLabel: 'Test Mode',
        motivation: '這是本機測試模式，正式環境不會被網址強制觸發。'
      };
    }

    // Filter schedule subjects based on tvetCategory
    if (currentExam.id === '115tvet' && tvetCategory) {
        currentExam = {
            ...currentExam,
            schedule: currentExam.schedule.map(day => ({
                ...day,
                subjects: day.subjects.filter(subj => {
                    if (!subj.groups) return true;
                    return subj.groups.includes(tvetCategory);
                }).map(subj => ({
                    ...subj,
                    description: undefined
                }))
            }))
        };
    }

    const todayStr = getTaipeiDateString(now);
    const todayIndex = currentExam.schedule.findIndex(s => s.date === todayStr);
    const todaySchedule = todayIndex !== -1 ? currentExam.schedule[todayIndex] : undefined;

    let dayLabel = '';
    let motivation = '';

    if (todayIndex !== -1) {
        dayLabel = `第 ${todayIndex + 1} 天`;
        if (todayIndex === 0 && currentExam.schedule.length === 1) {
             motivation = '全力以赴，展現最棒的自己！';
        } else if (todayIndex === 0) {
             motivation = '旗開得勝，保持平常心！';
        } else if (todayIndex === currentExam.schedule.length - 1) {
             motivation = '最後一天，堅持到底，完美收尾！';
        } else {
             motivation = '穩住陣腳，持續發揮實力！';
        }
    }

    if (!todaySchedule) {
      const lastDay = currentExam.schedule[currentExam.schedule.length - 1];
      if (lastDay && lastDay.subjects && lastDay.subjects.length > 0) {
        const lastSubject = lastDay.subjects[lastDay.subjects.length - 1];
        const finalTimeMs = taipeiDateTimeMs(lastDay.date, lastSubject.end);
        const nowMs = now.getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        
        if (nowMs >= finalTimeMs && nowMs <= finalTimeMs + sevenDaysMs) {
           return {
               state: 'FINISHED',
               title: '測驗已圓滿落幕',
               subject: '🎉',
               countdownTo: '',
               remainingSeconds: 0,
               label: '好好慶祝並休息吧！',
               examName: currentExam.name,
               dayLabel: '',
               motivation: '辛苦了，為自己的努力喝采！'
           };
        } else if (nowMs > finalTimeMs + sevenDaysMs) {
            return {
                state: 'COMPLETED',
                title: '考試結束',
                subject: '🎯',
                countdownTo: '',
                remainingSeconds: 0,
                label: '迎向新里程',
                examName: currentExam.name,
                dayLabel: '',
                motivation: '新的旅程已經開始，加油！'
            };
        }
      }
      return null;
    }

    // timeStr is 'HH:mm:ss'
    const toSeconds = (timeStr: string) => {
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + (parts.length > 2 ? parseInt(parts[2]) : 0);
    };

    const currentSeconds = getTaipeiTimeSeconds(now);

    for (let i = 0; i < todaySchedule.subjects.length; i++) {
        const subject = todaySchedule.subjects[i];
        const startSeconds = toSeconds(subject.start);
        const endSeconds = toSeconds(subject.end);

        if (currentSeconds < startSeconds) {
            if (i === 0) {
                // Before first exam
                return {
                    state: 'PRE_EXAM',
                    title: '本日大考即將開始',
                    subject: subject.name,
                    subjectDescription: subject.description,
                    countdownTo: subject.start,
                    remainingSeconds: startSeconds - currentSeconds,
                    totalSeconds: startSeconds - toSeconds('00:00:00'), // approximate day start
                    label: '距離首節',
                    examName: currentExam.name,
                    dayLabel,
                    motivation
                };
            } else {
                // Break time (after previous, before current)
                const prevSubject = todaySchedule.subjects[i - 1];
                const prevEndSeconds = toSeconds(prevSubject.end);
                return {
                    state: 'BREAK',
                    title: '下課休息中',
                    subject: subject.name,
                    subjectDescription: subject.description,
                    countdownTo: subject.start,
                    remainingSeconds: startSeconds - currentSeconds,
                    totalSeconds: startSeconds - prevEndSeconds,
                    label: '下一節考科',
                    examName: currentExam.name,
                    dayLabel,
                    motivation
                };
            }
        } else if (currentSeconds >= startSeconds && currentSeconds <= endSeconds) {
            // During exam
            return {
                state: 'IN_PROGRESS',
                title: '測驗進行中',
                subject: subject.name,
                subjectDescription: subject.description,
                countdownTo: subject.end,
                remainingSeconds: endSeconds - currentSeconds,
                totalSeconds: endSeconds - startSeconds,
                label: '距離結束',
                examName: currentExam.name,
                dayLabel,
                motivation
            };
        }
    }

    // After all exams today
    // const todayIndex = currentExam.schedule.findIndex(s => s.date === todayStr); // already computed above
    if (todayIndex !== -1 && todayIndex < currentExam.schedule.length - 1) {
        const nextSchedule = currentExam.schedule[todayIndex + 1];
        if (nextSchedule && nextSchedule.subjects.length > 0) {
            const nextSubjects = nextSchedule.subjects.map(s => s.name).join(' 、 ');
            const firstSubject = nextSchedule.subjects[0];
            const nextStartMs = taipeiDateTimeMs(nextSchedule.date, firstSubject.start);
            const nowMs = now.getTime();
            const totalRemainingSeconds = Math.max(0, Math.floor((nextStartMs - nowMs) / 1000));
            
            const lastTodaySubject = todaySchedule.subjects[todaySchedule.subjects.length - 1];
            const lastTodayEndMs = taipeiDateTimeMs(todaySchedule.date, lastTodaySubject.end);
            
            const totalGapSeconds = Math.max(0, Math.floor((nextStartMs - lastTodayEndMs) / 1000)) || (14 * 3600);

            return {
                state: 'PRE_EXAM',
                title: '明日測驗即將到來',
                subject: nextSubjects,
                subjectsList: nextSchedule.subjects,
                countdownTo: firstSubject.start,
                remainingSeconds: totalRemainingSeconds,
                totalSeconds: totalGapSeconds,
                label: '明日考科',
                examName: currentExam.name,
                dayLabel: `第 ${todayIndex + 2} 天`,
                motivation: '提早休息，養足精神面對明日挑戰！'
            };
        }
    }

    return {
        state: 'FINISHED',
        title: '本日測驗已結束',
        subject: '',
        countdownTo: '',
        remainingSeconds: 0,
        label: '辛苦了！',
        examName: currentExam.name,
        dayLabel: dayLabel,
        motivation: '今日已完成，好好放鬆一下吧！'
    };
  }, [now, currentExamId, tvetCategory]);

  useEffect(() => {
    if (liveExamStatus?.state !== 'FINISHED') return;

    const finaleSeenKey = `exam-finale-seen:${currentExamId ?? liveExamStatus.examName}`;
    try {
      if (window.localStorage.getItem(finaleSeenKey)) return;
      window.localStorage.setItem(finaleSeenKey, 'true');
    } catch {
      // Continue showing the finale if browser storage is unavailable.
    }

    let animationFrame = 0;
    let showStartedAt = 0;
    let lastAmbientLaunch = 0;
    let currentScene = -1;
    let cueIndex = 0;
    let running = true;
    let isClosing = false;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let renderScale = 1;
    const showDuration = 30_000;
    const cleanupAfter = 36_000;
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 pointer-events-none';
    backdrop.style.zIndex = '49999';
    backdrop.style.background = 'radial-gradient(circle at 50% 18%, rgba(30, 41, 59, 0.35), rgba(2, 6, 23, 0.72) 58%, rgba(2, 6, 23, 0.82))';
    backdrop.style.opacity = '0.9';
    backdrop.style.transition = 'opacity 1200ms ease';
    const canvas = document.createElement('canvas');
    canvas.className = 'fixed inset-0 pointer-events-none';
    canvas.style.zIndex = '50000';
    canvas.style.mixBlendMode = 'screen';
    canvas.style.transition = 'opacity 1200ms ease';
    const caption = document.createElement('div');
    caption.className = 'fixed left-1/2 top-[12vh] -translate-x-1/2 pointer-events-none text-center px-6 py-3 rounded-full bg-slate-950/35 border border-white/15 text-white shadow-2xl shadow-black/20 backdrop-blur-md';
    caption.style.zIndex = '50001';
    caption.style.opacity = '0';
    caption.style.transition = 'opacity 500ms ease, transform 700ms ease';
    caption.style.transform = 'translate(-50%, 12px)';
    document.body.appendChild(backdrop);
    document.body.appendChild(canvas);
    document.body.appendChild(caption);

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => canvas.remove();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallScreen = width < 760;
    const maxSparks = isSmallScreen ? 1050 : 1650;
    const maxRockets = isSmallScreen ? 14 : 22;
    const particleScale = isSmallScreen ? 0.62 : 0.78;
    const trailLimit = isSmallScreen ? 6 : 8;
    const glowEvery = isSmallScreen ? 5 : 3;
    const colors = [
      '#ffffff',
      '#fef08a',
      '#facc15',
      '#fb7185',
      '#f472b6',
      '#a78bfa',
      '#60a5fa',
      '#67e8f9',
      '#86efac'
    ];
    // A restrained palette reads more like a Japanese hanabi programme than
    // indiscriminate rainbow bursts: each scene has a deliberate dominant hue.
    const hanabiPalette = {
      gold: '#facc15',
      silver: '#f8fafc',
      sakura: '#fb7185',
      indigo: '#818cf8',
      aqua: '#67e8f9',
      emerald: '#86efac'
    };
    // The show follows one small journey: a lone wish, companions along the
    // way, the long climb, and a shared new beginning.
    const hanabiStoryScenes = [
      { title: '序幕・一枚願望', line: '夜色很深，但你先替夢想點亮了第一束光。' },
      { title: '相遇・星光成行', line: '那些一起努力的日子，讓每一道光都有了方向。' },
      { title: '奔赴・穿越長夜', line: '不安與期待交錯，而你沒有停下腳步。' },
      { title: '綻放・金色瀑布', line: '走過的每一步，都在此刻化為從天而降的光。' },
      { title: '終章・明日啟程', line: '這不是結束；全新的天空，正為你盛開。' }
    ];
    const scenes = [
      { at: 0, title: '序幕', line: '最後一題交卷，夜空先安靜一秒。' },
      { at: 5_500, title: '累積', line: '那些讀過的夜，開始一盞一盞亮起。' },
      { at: 12_000, title: '綻放', line: '努力不是消失了，是在最高處開花。' },
      { at: 21_000, title: '謝幕', line: '把辛苦留在夜空，把明天交給自己。' },
      { at: 28_000, title: '新旅程', line: '燈火落下，新的路亮起。' }
    ];
    const cues = [
      // Opening: leave breathing room around two large, centred shaku-dama.
      { at: 450, type: 'opening' },
      { at: 2_650, type: 'single' },
      { at: 4_500, type: 'pair' },
      // Mid-show: a measured colour progression, then a wide fan.
      { at: 5_800, type: 'memory' },
      { at: 7_250, type: 'memory' },
      { at: 8_700, type: 'memory' },
      { at: 9_700, type: 'cross' },
      { at: 11_600, type: 'heart' },
      { at: 14_000, type: 'fan' },
      { at: 16_200, type: 'triple' },
      { at: 18_400, type: 'star' },
      // Gold kamuro and niagara create the quiet, lingering final movement.
      { at: 20_700, type: 'willow' },
      { at: 22_000, type: 'willow' },
      { at: 24_600, type: 'curtain' },
      { at: 27_000, type: 'grandFinale' },
      { at: 28_300, type: 'grandFinale' },
      { at: 29_450, type: 'finale' }
    ];
    const rockets: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      targetY: number;
      hue: string;
      willow: boolean;
      ringCount: number;
      shape?: 'heart' | 'star';
      trail: { x: number; y: number }[];
    }[] = [];
    const sparks: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
      trail: { x: number; y: number }[];
      gravity: number;
      twinkle: number;
      glow: boolean;
      z?: number;
      vz?: number;
    }[] = [];

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    function pick<T>(items: T[]) {
      return items[Math.floor(Math.random() * items.length)];
    }

    function resizeCanvas() {
      renderScale = Math.min(window.devicePixelRatio || 1, isSmallScreen ? 1.15 : 1.35);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * renderScale);
      canvas.height = Math.floor(height * renderScale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    }

    function setCaption(index: number) {
      const scene = hanabiStoryScenes[index] ?? scenes[index];
      caption.replaceChildren();

      const title = document.createElement('div');
      title.className = 'text-[10px] font-black tracking-[0.35em] uppercase text-amber-200';
      title.textContent = scene.title;

      const line = document.createElement('div');
      line.className = 'mt-1 text-sm md:text-base font-bold tracking-wide';
      line.textContent = scene.line;

      caption.append(title, line);
      caption.style.opacity = '1';
      caption.style.transform = 'translate(-50%, 0)';
    }

    function launchRocket(options: {
      x?: number;
      targetX?: number;
      targetY?: number;
      color?: string;
      willow?: boolean;
      ringCount?: number;
      shape?: 'heart' | 'star';
    } = {}) {
      if (rockets.length >= maxRockets) return;
      const x = options.x ?? randomInRange(width * 0.12, width * 0.88);
      const targetX = Math.min(width * 0.94, Math.max(width * 0.06, options.targetX ?? x + randomInRange(-width * 0.2, width * 0.2)));
      const targetY = options.targetY ?? randomInRange(height * 0.12, height * 0.44);
      const flightTime = randomInRange(58, 78);
      rockets.push({
        x,
        y: height + 20,
        vx: (targetX - x) / flightTime,
        vy: (targetY - height) / flightTime,
        targetY,
        hue: options.color ?? pick(colors),
        willow: options.willow ?? false,
        ringCount: options.ringCount ?? 1,
        shape: options.shape,
        trail: []
      });
    }

    function burst(x: number, y: number, color = pick(colors), willow = Math.random() > 0.74) {
      const availableSlots = Math.max(0, maxSparks - sparks.length);
      if (availableSlots < 24) return;
      const baseCount = Math.floor((willow ? 132 : 92) * particleScale);
      const count = Math.min(baseCount, availableSlots);
      const speed = willow ? randomInRange(1.8, 5.2) : randomInRange(2.8, 7.2);

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + randomInRange(-0.035, 0.035);
        const velocity = speed * randomInRange(0.42, 1.08);
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: willow ? randomInRange(96, 150) : randomInRange(64, 108),
          maxLife: willow ? 150 : 108,
          size: randomInRange(1.15, willow ? 2.4 : 2.1),
          color: willow ? pick(['#fff7cc', '#fde68a', '#facc15', '#f59e0b']) : (Math.random() > 0.64 ? pick(colors) : color),
          trail: [],
          gravity: willow ? randomInRange(0.045, 0.078) : randomInRange(0.025, 0.055),
          twinkle: randomInRange(0.75, 1.35),
          glow: i % glowEvery === 0,
          z: randomInRange(-70, 70),
          vz: randomInRange(-1.15, 1.15)
        });
      }

      const starCount = Math.min(Math.floor(18 * particleScale), maxSparks - sparks.length);
      for (let i = 0; i < starCount; i++) {
        const angle = randomInRange(0, Math.PI * 2);
        const velocity = randomInRange(0.45, 2.2);
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: randomInRange(42, 76),
          maxLife: 76,
          size: randomInRange(0.7, 1.35),
          color: '#ffffff',
          trail: [],
          gravity: 0.018,
          twinkle: 2,
          glow: i % 2 === 0,
          z: randomInRange(-38, 38),
          vz: randomInRange(-0.75, 0.75)
        });
      }
    }

    // Precise rings and palms are what give large Japanese shells their
    // recognisable geometry. They complement (rather than replace) the more
    // organic chrysanthemum burst above.
    function ringBurst(x: number, y: number, color: string, radius = 5.4) {
      const count = Math.min(Math.floor(58 * particleScale), maxSparks - sparks.length);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        sparks.push({
          x, y,
          vx: Math.cos(angle) * radius,
          vy: Math.sin(angle) * radius,
          life: randomInRange(58, 82), maxLife: 82,
          size: randomInRange(0.9, 1.55), color,
          trail: [], gravity: 0.026, twinkle: 1.5,
          glow: i % glowEvery === 0,
          z: Math.sin(angle) * 86, vz: Math.sin(angle * 2) * 1.05
        });
      }
    }

    function palmBurst(x: number, y: number, color: string) {
      const count = Math.min(Math.floor(34 * particleScale), maxSparks - sparks.length);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + randomInRange(-0.025, 0.025);
        const speed = randomInRange(3.8, 6.7);
        sparks.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: randomInRange(128, 176), maxLife: 176,
          size: randomInRange(1.6, 2.75), color,
          trail: [], gravity: randomInRange(0.055, 0.082), twinkle: 0.62,
          glow: i % 2 === 0,
          z: Math.cos(angle) * 72, vz: Math.sin(angle) * 0.9
        });
      }
    }

    function strobeBurst(x: number, y: number) {
      const count = Math.min(Math.floor(28 * particleScale), maxSparks - sparks.length);
      for (let i = 0; i < count; i++) {
        const angle = randomInRange(0, Math.PI * 2);
        const speed = randomInRange(1.2, 4.1);
        sparks.push({
          x, y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: randomInRange(38, 58), maxLife: 58,
          size: randomInRange(1.1, 2), color: '#ffffff',
          trail: [], gravity: 0.014, twinkle: 4.2, glow: true,
          z: randomInRange(-55, 55), vz: randomInRange(-1.6, 1.6)
        });
      }
    }

    function shapeBurst(x: number, y: number, color: string, shape: 'heart' | 'star') {
      // Figures need generous negative space. A smaller, evenly spaced set of
      // stars remains legible from a phone-sized viewport.
      const count = Math.min(Math.floor(62 * particleScale), maxSparks - sparks.length);
      for (let i = 0; i < count; i++) {
        const t = (Math.PI * 2 * i) / count;
        let dx: number;
        let dy: number;

        if (shape === 'heart') {
          // Parametric heart: the shell first opens as a peony, then resolves
          // into the figure as the stars travel outward.
          dx = 16 * Math.sin(t) ** 3;
          dy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        } else {
          const point = (t / (Math.PI * 2)) * 10;
          const segment = Math.floor(point);
          const local = point - segment;
          const outer = segment % 2 === 0 ? 1 : 0.42;
          const next = (segment + 1) % 2 === 0 ? 1 : 0.42;
          const radius = outer + (next - outer) * local;
          dx = Math.cos(t - Math.PI / 2) * radius * 18;
          dy = Math.sin(t - Math.PI / 2) * radius * 18;
        }

        sparks.push({
          x, y,
          vx: dx * 0.28,
          vy: dy * 0.28,
          life: randomInRange(88, 112), maxLife: 112,
          size: randomInRange(1.25, 2.15), color,
          trail: [], gravity: 0.012, twinkle: 1.8,
          glow: i % 2 === 0,
          // Alternating depth gives the figure a gently rotating, spherical shell.
          z: Math.sin(t * 2) * 95,
          vz: Math.cos(t * 2) * 1.3
        });
      }
    }

    function layeredBurst(x: number, y: number, color: string, willow: boolean, ringCount: number) {
      burst(x, y, color, willow);
      if (ringCount > 1) {
        window.setTimeout(() => {
          if (running) {
            ringBurst(x, y, '#ffffff', 4.65);
            strobeBurst(x, y);
          }
        }, 120);
      }
      if (ringCount > 2) {
        window.setTimeout(() => {
          if (running) palmBurst(x, y, hanabiPalette.gold);
        }, 260);
      }
    }

    function runCue(type: string) {
      if (type === 'opening') {
        launchRocket({ x: width * 0.5, targetX: width * 0.5, targetY: height * 0.16, color: hanabiPalette.silver, ringCount: 3 });
      } else if (type === 'single') {
        launchRocket({ x: width * 0.5, targetX: width * 0.5, targetY: height * 0.18, color: hanabiPalette.sakura, ringCount: 2 });
      } else if (type === 'pair') {
        launchRocket({ x: width * 0.28, targetX: width * 0.36, targetY: height * 0.26, color: '#67e8f9' });
        launchRocket({ x: width * 0.72, targetX: width * 0.64, targetY: height * 0.26, color: '#fb7185' });
      } else if (type === 'memory') {
        [0.24, 0.38, 0.52, 0.66, 0.8].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio + randomInRange(-24, 24), targetY: randomInRange(height * 0.28, height * 0.5), color: pick([hanabiPalette.aqua, hanabiPalette.indigo, hanabiPalette.emerald]) });
        });
      } else if (type === 'fan') {
      [0.13, 0.25, 0.37, 0.5, 0.63, 0.75, 0.87].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: randomInRange(height * 0.12, height * 0.34), color: pick(colors), ringCount: 2 });
        });
      } else if (type === 'cross') {
        launchRocket({ x: width * 0.16, targetX: width * 0.72, targetY: height * 0.22, color: '#f472b6', ringCount: 2 });
        launchRocket({ x: width * 0.84, targetX: width * 0.28, targetY: height * 0.22, color: '#67e8f9', ringCount: 2 });
        launchRocket({ x: width * 0.5, targetX: width * 0.5, targetY: height * 0.12, color: '#ffffff', ringCount: 2 });
      } else if (type === 'heart') {
        launchRocket({ x: width * 0.5, targetX: width * 0.5, targetY: height * 0.22, color: hanabiPalette.sakura, shape: 'heart' });
      } else if (type === 'star') {
        launchRocket({ x: width * 0.5, targetX: width * 0.5, targetY: height * 0.2, color: hanabiPalette.aqua, shape: 'star' });
      } else if (type === 'triple') {
        [0.25, 0.5, 0.75].forEach((ratio, index) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: height * (0.16 + index * 0.05), color: pick(['#fef08a', '#fb7185', '#60a5fa']), ringCount: 2 });
        });
      } else if (type === 'willow') {
        [0.32, 0.5, 0.68].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: randomInRange(height * 0.15, height * 0.3), color: hanabiPalette.gold, willow: true, ringCount: 2 });
        });
      } else if (type === 'curtain') {
        [0.16, 0.28, 0.4, 0.52, 0.64, 0.76, 0.88].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: randomInRange(height * 0.18, height * 0.36), color: '#fde68a', willow: true });
        });
      } else if (type === 'grandFinale') {
        // A deliberate three-height wall: silver peonies above, coloured
        // middle shells, and gold palms below. This avoids a flat random spray.
        [0.18, 0.34, 0.5, 0.66, 0.82].forEach((ratio, index) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: height * (0.12 + (index % 2) * 0.07), color: hanabiPalette.silver, ringCount: 2 });
        });
        [0.27, 0.5, 0.73].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: height * 0.28, color: pick([hanabiPalette.sakura, hanabiPalette.aqua, hanabiPalette.indigo]), willow: true, ringCount: 2 });
        });
      } else if (type === 'finale') {
        [0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio + randomInRange(-22, 22), targetY: randomInRange(height * 0.1, height * 0.38), color: pick([hanabiPalette.gold, hanabiPalette.sakura, hanabiPalette.aqua]), willow: Math.random() > 0.45, ringCount: 3 });
        });
        launchRocket({ x: width * 0.5, targetX: width * 0.5, targetY: height * 0.12, color: '#ffffff', ringCount: 3 });
      }
    }

    function fadeAndStop() {
      if (isClosing) return;
      isClosing = true;
      running = false;
      cancelAnimationFrame(animationFrame);
      caption.style.opacity = '0';
      backdrop.style.opacity = '0';
      canvas.style.opacity = '0';
      closeButton.style.opacity = '0';
      window.setTimeout(() => {
        canvas.remove();
        backdrop.remove();
        caption.remove();
        closeButton.remove();
      }, 1300);
    }

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '關閉煙火';
    closeButton.setAttribute('aria-label', '關閉煙火動畫');
    closeButton.className = 'fixed right-4 top-4 rounded-full border border-white/40 bg-slate-950/75 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-white/80';
    closeButton.style.zIndex = '50002';
    closeButton.style.transition = 'opacity 300ms ease';
    closeButton.addEventListener('click', fadeAndStop);
    document.body.appendChild(closeButton);

    function drawCurtainFloor(elapsed: number) {
      if (elapsed < 21_000 || elapsed > showDuration) return;
      const intensity = Math.min(1, (elapsed - 21_000) / 2500) * Math.min(1, (showDuration - elapsed) / 900);
      ctx.globalAlpha = Math.max(0, intensity) * 0.34;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
      ctx.fillRect(0, height * 0.72, width, height * 0.28);
      ctx.globalAlpha = 1;
    }

    function getSceneIndex(elapsed: number) {
      for (let i = scenes.length - 1; i >= 0; i -= 1) {
        if (elapsed >= scenes[i].at) return i;
      }
      return 0;
    }

    function runTimelineFallback(elapsed: number) {
      const nextScene = getSceneIndex(elapsed);
      if (nextScene !== currentScene) {
        currentScene = nextScene;
        setCaption(currentScene);
      }

      while (cueIndex < cues.length && elapsed >= cues[cueIndex].at) {
        runCue(cues[cueIndex].type);
        cueIndex += 1;
      }

      const figureSpotlight = (elapsed > 11_500 && elapsed < 13_650)
        || (elapsed > 18_300 && elapsed < 20_450);
      if (elapsed > 5_500 && elapsed < 20_000 && !figureSpotlight && elapsed - lastAmbientLaunch > 920) {
        launchRocket({
          x: randomInRange(width * 0.18, width * 0.82),
          targetY: randomInRange(height * 0.18, height * 0.46),
          color: pick(colors)
        });
        lastAmbientLaunch = elapsed;
      }

      if (elapsed > 21_000 && elapsed < 28_000 && elapsed - lastAmbientLaunch > 1250) {
        launchRocket({
          x: randomInRange(width * 0.22, width * 0.78),
          targetY: randomInRange(height * 0.16, height * 0.34),
          color: '#facc15',
          willow: true
        });
        lastAmbientLaunch = elapsed;
      }
    }

    function drawRocket(rocket: typeof rockets[number]) {
      rocket.trail.push({ x: rocket.x, y: rocket.y });
      if (rocket.trail.length > 13) rocket.trail.shift();
      rocket.x += rocket.vx;
      rocket.y += rocket.vy;
      rocket.vy += 0.018;

      ctx.lineWidth = 2;
      ctx.strokeStyle = rocket.hue;
      ctx.beginPath();
      rocket.trail.forEach((point, trailIndex) => {
        ctx.globalAlpha = trailIndex / rocket.trail.length;
        if (trailIndex === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
      drawDotGlow(rocket.x, rocket.y, 6, rocket.hue, 0.45);
    }

    function drawSpark(spark: typeof sparks[number]) {
      spark.trail.push({ x: spark.x, y: spark.y });
      if (spark.trail.length > trailLimit) spark.trail.shift();
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.z = (spark.z ?? 0) + (spark.vz ?? 0);
      spark.vz = (spark.vz ?? 0) * 0.985;
      spark.vx *= 0.986;
      spark.vy = spark.vy * 0.986 + spark.gravity;
      spark.life -= 1;

      const alpha = Math.max(0, spark.life / spark.maxLife);
      const flicker = 0.76 + Math.sin(spark.life * spark.twinkle) * 0.24;
      const depthScale = Math.max(0.62, Math.min(1.42, 1 + (spark.z ?? 0) / 430));
      const project = (point: { x: number; y: number }) => ({
        x: width * 0.5 + (point.x - width * 0.5) * depthScale,
        y: height * 0.5 + (point.y - height * 0.5) * depthScale
      });
      ctx.lineWidth = spark.size * depthScale;
      ctx.strokeStyle = spark.color;
      ctx.beginPath();
      spark.trail.forEach((point, trailIndex) => {
        const projected = project(point);
        ctx.globalAlpha = alpha * flicker * (trailIndex / spark.trail.length);
        if (trailIndex === 0) ctx.moveTo(projected.x, projected.y);
        else ctx.lineTo(projected.x, projected.y);
      });
      ctx.stroke();
      if (spark.glow) {
        const projected = project(spark);
        drawDotGlow(projected.x, projected.y, spark.size * 2.4 * depthScale, spark.color, alpha * 0.22);
      }
    }

    function drawDotGlow(x: number, y: number, radius: number, color: string, alpha: number) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function tick(timestamp: number) {
      if (!running) return;
      if (!showStartedAt) showStartedAt = timestamp;
      const elapsed = timestamp - showStartedAt;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2, 6, 23, 0.2)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      if (!reducedMotion && elapsed <= showDuration) {
        runTimelineFallback(elapsed);
      }

      for (let i = rockets.length - 1; i >= 0; i -= 1) {
        const rocket = rockets[i];
        drawRocket(rocket);
        if (rocket.y <= rocket.targetY || rocket.vy >= -0.5) {
          if (rocket.shape) shapeBurst(rocket.x, rocket.y, rocket.hue, rocket.shape);
          else layeredBurst(rocket.x, rocket.y, rocket.hue, rocket.willow, rocket.ringCount);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i];
        drawSpark(spark);
        if (spark.life <= 0) sparks.splice(i, 1);
      }

      drawCurtainFloor(elapsed);
      ctx.globalAlpha = 1;

      if (elapsed >= cleanupAfter) {
        fadeAndStop();
        return;
      }

      animationFrame = requestAnimationFrame(tick);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animationFrame = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resizeCanvas);
      canvas.remove();
      backdrop.remove();
      caption.remove();
      closeButton.removeEventListener('click', fadeAndStop);
      closeButton.remove();
    };
  }, [liveExamStatus?.state, currentExamId, liveExamStatus?.examName]);

  return (
    <div className="countdown-panel w-full glass-card rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden bg-white/70 shadow-xl shadow-indigo-50/50 border border-white/60 group">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-indigo-100/40 to-fuchsia-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      
      <div className="countdown-content relative z-10 flex flex-col gap-6">
        
        {/* Quick Exam Switcher */}
        <div className="countdown-switcher rounded-[1.75rem] border border-slate-100 bg-slate-50/80 p-3 shadow-inner sm:p-4">
          <button type="button" onClick={() => setIsExamSwitcherOpen(true)} aria-haspopup="dialog" aria-expanded={isExamSwitcherOpen} className="flex w-full items-center justify-between gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/70">
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-slate-400">倒數模式</p>
              <p className="mt-0.5 text-sm font-black text-slate-800">{examName}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[10px] font-black text-indigo-600 shadow-sm">切換考試 <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExamSwitcherOpen ? 'rotate-90' : ''}`} /></span>
          </button>

          {isExamSwitcherOpen && createPortal(
            <ModalLayer className="exam-selector-layer fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label="切換考試">
              <button type="button" onClick={() => setIsExamSwitcherOpen(false)} className="exam-selector-backdrop" aria-label="關閉切換考試視窗" />
              <motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} className="exam-selector-card">
                <header className="exam-selector-header">
                  <span className="exam-selector-eyebrow">YOUR NEXT CHAPTER</span>
                  <button type="button" onClick={() => setIsExamSwitcherOpen(false)} className="exam-selector-close" aria-label="關閉"><X size={19} /></button>
                  <h2>選擇你的備考舞台</h2>
                  <p>從一個目標開始，讓每一天的努力有方向。</p>
                  <div className="exam-selector-current"><CalendarDays size={16} /><span>目前倒數</span><strong>{EXAM_PRESETS.find(p => p.id === currentExamId)?.name || examName}</strong></div>
                </header>
                <div className="exam-selector-body">
                  <nav className="exam-selector-steps" aria-label="考試選擇步驟">
                    <button type="button" onClick={() => setExamSwitchStep('category')} aria-current={examSwitchStep === 'category' ? 'step' : undefined}><span>01</span>考試類別</button>
                    <ChevronRight size={16} aria-hidden="true" />
                    <button type="button" onClick={() => setExamSwitchStep('year')} aria-current={examSwitchStep === 'year' ? 'step' : undefined}><span>02</span>應試年度</button>
                  </nav>
                  {examSwitchStep === 'category' ? <section className="exam-selector-section" aria-label="選擇考試類別">
                    <div className="exam-selector-section-title"><h3>你的下一站是？</h3><span>選擇考試，繼續設定年度</span></div>
                    <div className="exam-selector-categories">
                      {[
                        { id: 'gsat', name: '學測', detail: '學科能力測驗', icon: GraduationCap },
                        { id: 'cap', name: '會考', detail: '國中教育會考', icon: PenTool },
                        { id: 'tvet', name: '統測', detail: '四技二專統一入學測驗', icon: BookOpen },
                        { id: 'ast', name: '分科', detail: '分科測驗', icon: Sparkles },
                      ].map(cat => {
                        const Icon = cat.icon;
                        return <button type="button" key={cat.id} id={`cat-btn-${cat.id}`} className="exam-selector-category" data-selected={selectedExamCategory === cat.id} onClick={() => { setSelectedExamCategory(cat.id as typeof selectedExamCategory); setExamSwitchStep('year'); }}>
                          <span className="exam-selector-category-icon"><Icon size={23} /></span>
                          <span className="exam-selector-category-copy"><strong>{cat.name}</strong><span>{cat.detail}</span></span>
                          <ChevronRight size={16} className="exam-selector-category-arrow" aria-hidden="true" />
                        </button>;
                      })}
                    </div>
                  </section> : <section className="exam-selector-section" aria-label="選擇應試年度">
                    <div className="exam-selector-section-title"><h3>{({ gsat: '學測', cap: '會考', tvet: '統測', ast: '分科' }[selectedExamCategory])}，準備哪一年？</h3><button type="button" onClick={() => setExamSwitchStep('category')}>返回類別</button></div>
                    <div className="exam-selector-years">
                      {EXAM_PRESETS.filter(e => e.category === selectedExamCategory).sort((a, b) => b.year - a.year).map(exam => <button type="button" key={exam.id} id={`year-btn-${exam.id}`} className="exam-selector-year" data-selected={currentExamId === exam.id} onClick={() => { onExamChange?.(exam.id, exam.date); setIsExamSwitcherOpen(false); }}>
                        <span className="exam-selector-year-top"><strong>{exam.year}<small>年</small></strong>{currentExamId === exam.id && <span className="exam-selector-tag">目前選擇</span>}</span>
                        <span className="exam-selector-year-date">{exam.isEstimated ? '預計 ' : ''}{new Date(exam.date).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                        <span className="exam-selector-year-action">以此為目標 <ChevronRight size={14} aria-hidden="true" /></span>
                      </button>)}
                    </div>
                  </section>}
                </div>
                <footer className="exam-selector-footer"><CalendarDays size={15} /><p>{examSwitchStep === 'category' ? '接著選擇年度，就能開始你的專屬倒數。' : '選擇年度後，將更新倒數、日程與讀書工具的科目設定。'}</p></footer>
              </motion.div>
            </ModalLayer>, document.body)}
        </div>

        {liveExamStatus ? (
          /* Live Exam Day Dashboard - Light Theme */
          <div className="w-full bg-gradient-to-br from-white/90 to-slate-50/90 rounded-[2.5rem] p-8 md:p-12 text-slate-800 relative flex flex-col items-center justify-center text-center overflow-hidden border border-white/60 shadow-2xl shadow-indigo-100/50">
              {/* Dynamic light glows based on state */}
              {liveExamStatus.state === 'IN_PROGRESS' && (
                <div className="absolute top-0 right-0 w-96 h-96 bg-red-100 blur-[100px] opacity-60 pointer-events-none rounded-full"></div>
              )}
              {liveExamStatus.state === 'BREAK' && (
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-100 blur-[100px] opacity-60 pointer-events-none rounded-full"></div>
              )}
              {liveExamStatus.state === 'PRE_EXAM' && (
                <div className="absolute top-0 left-0 w-96 h-96 bg-amber-100 blur-[100px] opacity-60 pointer-events-none rounded-full"></div>
              )}
              {liveExamStatus.state === 'FINISHED' && (
                <div className="absolute inset-0 w-full h-full bg-indigo-50 blur-[100px] opacity-60 pointer-events-none rounded-full scale-150"></div>
              )}
              {liveExamStatus.state === 'COMPLETED' && (
                <div className="absolute inset-0 w-full h-full bg-slate-100 blur-[100px] opacity-60 pointer-events-none rounded-full scale-150"></div>
              )}
              {liveExamStatus.state === 'FINISHED' && (
                <div className="exam-finale-stage" aria-hidden="true">
                  <div className="exam-finale-sky"></div>
                  <div className="exam-finale-stars exam-finale-stars-a"></div>
                  <div className="exam-finale-stars exam-finale-stars-b"></div>
                  <div className="exam-finale-beam exam-finale-beam-left"></div>
                  <div className="exam-finale-beam exam-finale-beam-center"></div>
                  <div className="exam-finale-beam exam-finale-beam-right"></div>
                  <div className="exam-finale-sparkline"></div>
                </div>
              )}

              {/* Decorative background icons for the live display */}
              <div className="absolute top-10 left-10 md:top-20 md:left-20 opacity-[0.03] rotate-12 pointer-events-none">
                  {liveExamStatus.state === 'BREAK' ? <Coffee className="w-32 h-32 md:w-48 md:h-48 text-emerald-600" /> : 
                   liveExamStatus.state === 'PRE_EXAM' ? <Hourglass className="w-32 h-32 md:w-48 md:h-48 text-amber-600" /> :
                   (liveExamStatus.state === 'FINISHED' || liveExamStatus.state === 'COMPLETED') ? <GraduationCap className="w-32 h-32 md:w-48 md:h-48 text-indigo-600" /> :
                   <PenTool className="w-32 h-32 md:w-48 md:h-48 text-indigo-600" />}
              </div>
              <div className="absolute bottom-10 right-10 md:bottom-20 md:right-20 opacity-[0.03] -rotate-12 pointer-events-none">
                  {liveExamStatus.state === 'BREAK' ? <Timer className="w-32 h-32 md:w-48 md:h-48 text-emerald-600" /> : 
                   liveExamStatus.state === 'PRE_EXAM' ? <Bell className="w-32 h-32 md:w-48 md:h-48 text-amber-600" /> :
                   (liveExamStatus.state === 'FINISHED' || liveExamStatus.state === 'COMPLETED') ? <Flag className="w-32 h-32 md:w-48 md:h-48 text-indigo-600" /> :
                   <BookOpen className="w-32 h-32 md:w-48 md:h-48 text-indigo-600" />}
              </div>
              
              <div className="relative z-10 flex flex-col items-center w-full">
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-slate-200/60 shadow-sm text-xs font-bold tracking-widest text-slate-500 uppercase backdrop-blur-md">
                         <AlertCircle className={`w-4 h-4 ${
                             liveExamStatus.state === 'IN_PROGRESS' ? 'text-red-500 animate-pulse' :
                             liveExamStatus.state === 'BREAK' ? 'text-emerald-500' :
                             (liveExamStatus.state === 'FINISHED' || liveExamStatus.state === 'COMPLETED') ? 'text-indigo-500' :
                             'text-amber-500'
                         }`} />
                         {liveExamStatus.examName} { (liveExamStatus.state === 'FINISHED' || liveExamStatus.state === 'COMPLETED') ? '已結束' : '進行中'}
                      </div>
                      {liveExamStatus.dayLabel && (
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50/80 border border-indigo-200/60 shadow-sm text-xs font-bold tracking-widest text-indigo-600 uppercase backdrop-blur-md">
                             <Sparkles className="w-4 h-4 text-indigo-500" />
                             {liveExamStatus.dayLabel}
                          </div>
                      )}
                  </div>

                  <h3 className={`text-4xl md:text-6xl font-black tracking-tighter mb-4 text-transparent bg-clip-text drop-shadow-sm ${
                    liveExamStatus.state === 'FINISHED'
                      ? 'bg-gradient-to-br from-indigo-950 via-violet-800 to-fuchsia-700 drop-shadow-[0_2px_2px_rgba(255,255,255,0.9)]'
                      : 'bg-gradient-to-br from-slate-800 to-slate-500'
                  }`}>
                     {liveExamStatus.title}
                  </h3>
                  
                  {liveExamStatus.motivation && (
                      <div className={`text-base md:text-lg font-bold mb-2 mt-[-0.5rem] tracking-wide max-w-sm md:max-w-md ${
                        liveExamStatus.state === 'FINISHED' ? 'text-slate-700' : 'text-slate-500'
                      }`}>
                          {liveExamStatus.motivation}
                      </div>
                  )}
                  
                  {liveExamStatus.state !== 'FINISHED' && liveExamStatus.state !== 'COMPLETED' ? (
                    <>
                        <div className="flex flex-col items-center gap-3 mt-6 mb-8 w-full max-w-md relative">
                            {/* Interactive state icons */}
                            <span className="text-sm md:text-base text-slate-500 font-bold tracking-wider uppercase bg-white/50 px-3 py-1 rounded-full border border-slate-100 flex items-center gap-2">
                                {liveExamStatus.label}
                            </span>
                            
                            {liveExamStatus.label === '明日考科' && 'subjectsList' in liveExamStatus && liveExamStatus.subjectsList ? (
                                <div className="w-full mt-4 flex flex-col gap-3">
                                    {(liveExamStatus.subjectsList as {name: string, start: string, end: string, description?: string}[]).map((subj, idx) => (
                                        <div key={idx} className="flex flex-col gap-1 bg-white/80 border border-slate-200/60 rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                                             <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-l-2xl opacity-80"></div>
                                             <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-indigo-900 font-black text-xl md:text-2xl">{subj.name}</span>
                                                </div>
                                                <div className="text-slate-500 font-bold text-sm md:text-base tracking-wider bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                                    {subj.start} - {subj.end}
                                                </div>
                                             </div>
                                             {subj.description && (
                                                <div className="text-slate-500 text-sm font-medium mt-2 text-left pl-1">
                                                    {subj.description}
                                                </div>
                                             )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full px-8 py-5 rounded-3xl bg-white border border-slate-100/80 text-indigo-900 font-black text-3xl md:text-4xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 ease-in-out"></div>
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="flex items-center justify-center gap-4">
                                          {liveExamStatus.state === 'IN_PROGRESS' && <PenTool className="w-8 h-8 text-indigo-400 opacity-60" />}
                                          {liveExamStatus.state === 'PRE_EXAM' && <Hourglass className="w-8 h-8 text-amber-400 opacity-60" />}
                                          {liveExamStatus.state === 'BREAK' && <Coffee className="w-8 h-8 text-emerald-400 opacity-60" />}
                                          <span>{liveExamStatus.subject}</span>
                                          {liveExamStatus.state === 'IN_PROGRESS' && <BookOpen className="w-8 h-8 text-indigo-400 opacity-60" />}
                                          {liveExamStatus.state === 'PRE_EXAM' && <Bell className="w-8 h-8 text-amber-400 opacity-60" />}
                                          {liveExamStatus.state === 'BREAK' && <Timer className="w-8 h-8 text-emerald-400 opacity-60" />}
                                        </div>
                                        {'subjectDescription' in liveExamStatus && typeof liveExamStatus.subjectDescription === 'string' && liveExamStatus.subjectDescription && (
                                            <div className="mt-3 text-sm md:text-base text-slate-500 font-medium tracking-normal text-left sm:text-center px-4 w-full break-words leading-relaxed">
                                                {liveExamStatus.subjectDescription}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 relative flex justify-center items-center gap-2 md:gap-4">
                            {Math.floor(liveExamStatus.remainingSeconds / 3600) > 0 && (
                                <>
                                    <div className="flex flex-col items-center">
                                        <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 shadow-xl shadow-indigo-500/5 rounded-[2rem] w-20 md:w-28 py-6 md:py-8 relative overflow-hidden flex items-center justify-center group transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-indigo-500/10 hover:border-indigo-200/50">
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-slate-50/20 to-transparent"></div>
                                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"></div>
                                            <span className="tabular-nums text-5xl md:text-7xl font-black text-slate-800 tracking-tighter relative z-10 bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 drop-shadow-sm">
                                                {String(Math.floor(liveExamStatus.remainingSeconds / 3600)).padStart(2, '0')}
                                            </span>
                                        </div>
                                        <span className="text-[10px] md:text-xs font-black text-slate-400 mt-4 tracking-[0.2em] uppercase">HOURS</span>
                                    </div>
                                    
                                    <div className="flex flex-col justify-center h-full pb-8 md:pb-10">
                                        <span className="text-3xl md:text-5xl font-black text-slate-300/50 animate-pulse">:</span>
                                    </div>
                                </>
                            )}
                            
                            <div className="flex flex-col items-center">
                                <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 shadow-xl shadow-indigo-500/5 rounded-[2rem] w-20 md:w-28 py-6 md:py-8 relative overflow-hidden flex items-center justify-center group transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-indigo-500/10 hover:border-indigo-200/50">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-slate-50/20 to-transparent"></div>
                                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"></div>
                                    <span className="tabular-nums text-5xl md:text-7xl font-black text-slate-800 tracking-tighter relative z-10 bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 drop-shadow-sm">
                                        {String(Math.floor((liveExamStatus.remainingSeconds % 3600) / 60)).padStart(2, '0')}
                                    </span>
                                </div>
                                <span className="text-[10px] md:text-xs font-black text-slate-400 mt-4 tracking-[0.2em] uppercase">MINS</span>
                            </div>

                            <div className="flex flex-col justify-center h-full pb-8 md:pb-10">
                                <span className="text-3xl md:text-5xl font-black text-slate-300/50 animate-pulse">:</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 shadow-xl shadow-indigo-500/5 rounded-3xl w-16 md:w-24 py-5 md:py-7 relative overflow-hidden flex items-center justify-center group transition-all duration-300 mt-1 md:mt-1 opacity-90 scale-95 hover:scale-100 hover:opacity-100 hover:bg-white hover:shadow-indigo-500/10 hover:border-indigo-200/50">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-slate-50/20 to-transparent"></div>
                                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"></div>
                                    <span className="tabular-nums text-4xl md:text-6xl font-black text-slate-800 tracking-tighter relative z-10 bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-500 drop-shadow-sm">
                                        {String(liveExamStatus.remainingSeconds % 60).padStart(2, '0')}
                                    </span>
                                </div>
                                <span className="text-[10px] md:text-xs font-black text-slate-400 mt-4 tracking-[0.2em] uppercase">SECS</span>
                            </div>
                        </div>

                        {/* Extra embellishments, subtle progress visual or clock icon */}
                        <div className="mt-12 w-full max-w-md flex flex-col items-center gap-6 relative">
                            {/* Ambient background glow for progress */}
                            <div className={`absolute inset-0 blur-2xl opacity-20 transition-colors duration-1000 ${
                                liveExamStatus.state === 'IN_PROGRESS' ? 'bg-red-400' :
                                liveExamStatus.state === 'BREAK' ? 'bg-emerald-400' :
                                'bg-amber-400'
                            }`}></div>

                            <div className="w-full bg-slate-100/50 rounded-full h-4 md:h-5 overflow-hidden border border-white shadow-inner relative z-10 p-0.5">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-linear shadow-sm ${
                                        liveExamStatus.state === 'IN_PROGRESS' ? 'bg-gradient-to-r from-red-500 to-rose-400' :
                                        liveExamStatus.state === 'BREAK' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                        'bg-gradient-to-r from-amber-500 to-orange-400'
                                    }`}
                                    style={{ 
                                        width: `${Math.max(0, Math.min(100, ((liveExamStatus.totalSeconds - liveExamStatus.remainingSeconds) / liveExamStatus.totalSeconds) * 100))}%` 
                                    }}
                                >
                                    <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)50%,rgba(255,255,255,0.2)75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-stripes"></div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-slate-600 font-bold text-sm md:text-base border border-slate-200/50 bg-white/80 px-8 py-3 rounded-full shadow-lg shadow-indigo-500/5 backdrop-blur-md relative z-10 transition-transform hover:scale-105">
                                <Clock className={`w-5 h-5 animate-[spin_4s_linear_infinite] ${
                                    liveExamStatus.state === 'IN_PROGRESS' ? 'text-red-500' :
                                    liveExamStatus.state === 'BREAK' ? 'text-emerald-500' :
                                    'text-amber-500'
                                }`} />
                                <span className="tracking-[0.15em] uppercase">目標時間 : <span className="text-slate-800 font-black">{liveExamStatus.countdownTo}</span></span>
                            </div>
                        </div>
                    </>
                  ) : (
                    <div className="mt-8 mb-4 flex flex-col items-center">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-sm text-5xl">
                            {liveExamStatus.state === 'FINISHED' && liveExamStatus.subject === '🎉' ? '🎉' : 
                             liveExamStatus.state === 'COMPLETED' ? '🎯' : 
                             <CalendarDays className="w-10 h-10" />}
                        </div>
                        <p className={`font-bold text-xl ${liveExamStatus.state === 'FINISHED' ? 'text-slate-700' : 'text-slate-600'}`}>{liveExamStatus.label}</p>
                    </div>
                  )}
              </div>
          </div>
        ) : (
          /* Standard Countdown Display */
          <div className="countdown-stage">
            <div className="countdown-face">
              <p className="countdown-face-label">距離考試還有</p>
              <div className="countdown-number-row" style={{ '--day-digits': String(timeLeft.days).length } as React.CSSProperties}>
                <span className="countdown-value">{timeLeft.days}</span>
                <span className="countdown-unit"><strong>天</strong><span>DAYS LEFT</span></span>
              </div>
              <p className="countdown-face-note"><span /> 每一天，都更接近目標。</p>
            </div>
            <div className="countdown-details">
              <div className="countdown-date">
                <span className="countdown-date-icon"><CalendarDays size={21} /></span>
                <div><p>目標日期</p><time dateTime={targetDate.toISOString()}>{targetDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' })}</time></div>
                <span className="countdown-weekday">{targetDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'long' })}</span>
              </div>
              <div className="countdown-time" role="group" aria-label="剩餘時分秒">
                {[
                  { value: timeLeft.hours, label: '小時' },
                  { value: timeLeft.minutes, label: '分鐘' },
                  { value: timeLeft.seconds, label: '秒' },
                ].map(item => <div className="countdown-time-item" key={item.label}><span>{String(item.value).padStart(2, '0')}</span><p>{item.label}</p></div>)}
              </div>
              <Greeting user={user} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountdownDisplay;
