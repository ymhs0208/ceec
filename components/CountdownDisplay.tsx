import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TimeLeft, User } from '../types';
import { CalendarDays, Clock, Timer, ChevronRight, AlertCircle, BookOpen, Coffee, Flag, Sparkles, Hourglass, Bell, GraduationCap, PenTool } from 'lucide-react';
import Greeting from './Greeting';
import { EXAM_PRESETS } from '../constants';
import { getTaipeiDateString, getTaipeiTimeSeconds, taipeiDateTimeMs } from '../utils/time';

interface CountdownDisplayProps {
  timeLeft: TimeLeft;
  targetDate: Date;
  user: User | null;
  examName?: string;
  examShortName?: string;
  currentExamId?: string;
  tvetCategory?: string;
  onExamChange?: (id: string, date: string) => void;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ 
  timeLeft, 
  targetDate, 
  user, 
  examName = '學測', 
  examShortName = '學測',
  currentExamId,
  tvetCategory,
  onExamChange
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let timeoutId: number | undefined;

    const tick = () => {
      const current = new Date();
      setNow(current);
      timeoutId = window.setTimeout(tick, 1000 - (current.getTime() % 1000) + 12);
    };

    tick();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
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

    let animationFrame = 0;
    let showStartedAt = 0;
    let lastAmbientLaunch = 0;
    let currentScene = -1;
    let cueIndex = 0;
    let running = true;
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
    const scenes = [
      { at: 0, title: '序幕', line: '最後一題交卷，夜空先安靜一秒。' },
      { at: 5_500, title: '累積', line: '那些讀過的夜，開始一盞一盞亮起。' },
      { at: 12_000, title: '綻放', line: '努力不是消失了，是在最高處開花。' },
      { at: 21_000, title: '謝幕', line: '把辛苦留在夜空，把明天交給自己。' },
      { at: 28_000, title: '新旅程', line: '燈火落下，新的路亮起。' }
    ];
    const cues = [
      { at: 350, type: 'single' },
      { at: 1900, type: 'single' },
      { at: 3500, type: 'pair' },
      { at: 5600, type: 'memory' },
      { at: 6900, type: 'memory' },
      { at: 8300, type: 'memory' },
      { at: 9800, type: 'pair' },
      { at: 12_000, type: 'fan' },
      { at: 14_500, type: 'cross' },
      { at: 16_600, type: 'fan' },
      { at: 19_000, type: 'triple' },
      { at: 21_200, type: 'willow' },
      { at: 23_600, type: 'willow' },
      { at: 25_800, type: 'curtain' },
      { at: 28_000, type: 'finale' },
      { at: 29_250, type: 'finale' }
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
      const scene = scenes[index];
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
          glow: i % glowEvery === 0
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
          glow: i % 2 === 0
        });
      }
    }

    function layeredBurst(x: number, y: number, color: string, willow: boolean, ringCount: number) {
      burst(x, y, color, willow);
      if (ringCount > 1) {
        window.setTimeout(() => {
          if (running) burst(x, y, '#ffffff', false);
        }, 120);
      }
      if (ringCount > 2) {
        window.setTimeout(() => {
          if (running) burst(x, y, '#facc15', true);
        }, 260);
      }
    }

    function runCue(type: string) {
      if (type === 'single') {
        launchRocket({ x: width * 0.5, targetX: width * 0.5, targetY: height * 0.18, color: '#fef08a', ringCount: 2 });
      } else if (type === 'pair') {
        launchRocket({ x: width * 0.28, targetX: width * 0.36, targetY: height * 0.26, color: '#67e8f9' });
        launchRocket({ x: width * 0.72, targetX: width * 0.64, targetY: height * 0.26, color: '#fb7185' });
      } else if (type === 'memory') {
        [0.24, 0.38, 0.52, 0.66, 0.8].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio + randomInRange(-35, 35), targetY: randomInRange(height * 0.28, height * 0.5), color: pick(['#60a5fa', '#a78bfa', '#86efac']) });
        });
      } else if (type === 'fan') {
      [0.13, 0.25, 0.37, 0.5, 0.63, 0.75, 0.87].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: randomInRange(height * 0.12, height * 0.34), color: pick(colors), ringCount: 2 });
        });
      } else if (type === 'cross') {
        launchRocket({ x: width * 0.16, targetX: width * 0.72, targetY: height * 0.22, color: '#f472b6', ringCount: 2 });
        launchRocket({ x: width * 0.84, targetX: width * 0.28, targetY: height * 0.22, color: '#67e8f9', ringCount: 2 });
        launchRocket({ x: width * 0.5, targetX: width * 0.5, targetY: height * 0.12, color: '#ffffff', ringCount: 2 });
      } else if (type === 'triple') {
        [0.25, 0.5, 0.75].forEach((ratio, index) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: height * (0.16 + index * 0.05), color: pick(['#fef08a', '#fb7185', '#60a5fa']), ringCount: 2 });
        });
      } else if (type === 'willow') {
        [0.32, 0.5, 0.68].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: randomInRange(height * 0.15, height * 0.3), color: '#facc15', willow: true, ringCount: 2 });
        });
      } else if (type === 'curtain') {
        [0.16, 0.28, 0.4, 0.52, 0.64, 0.76, 0.88].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio, targetY: randomInRange(height * 0.18, height * 0.36), color: '#fde68a', willow: true });
        });
      } else if (type === 'finale') {
        [0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88].forEach((ratio) => {
          launchRocket({ x: width * ratio, targetX: width * ratio + randomInRange(-40, 40), targetY: randomInRange(height * 0.1, height * 0.38), color: pick(colors), willow: Math.random() > 0.55, ringCount: 3 });
        });
        launchRocket({ x: width * 0.5, targetX: width * 0.5, targetY: height * 0.12, color: '#ffffff', ringCount: 3 });
      }
    }

    function fadeAndStop() {
      caption.style.opacity = '0';
      backdrop.style.opacity = '0';
      canvas.style.opacity = '0';
      window.setTimeout(() => {
        running = false;
        cancelAnimationFrame(animationFrame);
        canvas.remove();
        backdrop.remove();
        caption.remove();
      }, 1300);
    }

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

      if (elapsed > 5_500 && elapsed < 20_000 && elapsed - lastAmbientLaunch > 920) {
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
      spark.vx *= 0.986;
      spark.vy = spark.vy * 0.986 + spark.gravity;
      spark.life -= 1;

      const alpha = Math.max(0, spark.life / spark.maxLife);
      const flicker = 0.76 + Math.sin(spark.life * spark.twinkle) * 0.24;
      ctx.lineWidth = spark.size;
      ctx.strokeStyle = spark.color;
      ctx.beginPath();
      spark.trail.forEach((point, trailIndex) => {
        ctx.globalAlpha = alpha * flicker * (trailIndex / spark.trail.length);
        if (trailIndex === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      if (spark.glow) {
        drawDotGlow(spark.x, spark.y, spark.size * 2.4, spark.color, alpha * 0.22);
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
          layeredBurst(rocket.x, rocket.y, rocket.hue, rocket.willow, rocket.ringCount);
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
    };
  }, [liveExamStatus?.state]);

  return (
    <div className="w-full glass-card rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden bg-white/70 shadow-xl shadow-indigo-50/50 border border-white/60 group">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-indigo-100/40 to-fuchsia-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-6">
        
        {/* Quick Exam Switcher */}
        <div className="flex flex-col gap-4">
          {/* Category Selector - Premium Modern Style */}
          <div className="relative flex p-1.5 bg-white/50 backdrop-blur-xl shadow-sm rounded-2xl border border-white/60 self-start md:self-auto overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: 'gsat', name: '學測', icon: GraduationCap, text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', shadow: 'shadow-indigo-100/50' },
              { id: 'cap', name: '會考', icon: PenTool, text: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', shadow: 'shadow-teal-100/50'  },
              { id: 'tvet', name: '統測', icon: BookOpen, text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', shadow: 'shadow-orange-100/50' },
              { id: 'ast', name: '分科', icon: Sparkles, text: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100', shadow: 'shadow-pink-100/50' }
            ].map((cat) => {
              const currentCat = EXAM_PRESETS.find(e => e.id === currentExamId)?.category;
              const isActive = currentCat === cat.id;
              const Icon = cat.icon;
              
              return (
                <button
                  key={cat.id}
                  id={`cat-btn-${cat.id}`}
                  onClick={() => {
                    const firstMatch = EXAM_PRESETS.find(e => e.category === cat.id);
                    if (firstMatch) onExamChange?.(firstMatch.id, firstMatch.date);
                  }}
                  className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap z-10 ${
                    isActive ? cat.text : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? cat.text : 'text-slate-400'}`} />
                  {cat.name}
                  {isActive && (
                    <motion.div
                      layoutId="cat-bg"
                      className={`absolute inset-0 ${cat.bg} border ${cat.border} shadow-sm ${cat.shadow} rounded-[14px] -z-10`}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Year Selector - Premium Modern Style */}
          <div className="flex p-1.5 bg-white/40 backdrop-blur-xl shadow-inner rounded-[1.125rem] border border-white/50 self-start w-max overflow-x-auto no-scrollbar max-w-full">
            {EXAM_PRESETS.filter(e => e.category === EXAM_PRESETS.find(p => p.id === currentExamId)?.category).map((exam) => {
              const isSelected = currentExamId === exam.id;
              
              // Get current category theme
              const catTheme = [
                { id: 'gsat', text: 'text-indigo-700', activeBg: 'bg-white', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-600' },
                { id: 'cap', text: 'text-teal-700', activeBg: 'bg-white', badgeBg: 'bg-teal-50', badgeText: 'text-teal-600' },
                { id: 'tvet', text: 'text-orange-700', activeBg: 'bg-white', badgeBg: 'bg-orange-50', badgeText: 'text-orange-600' },
                { id: 'ast', text: 'text-pink-700', activeBg: 'bg-white', badgeBg: 'bg-pink-50', badgeText: 'text-pink-600' }
              ].find(c => c.id === exam.category) || { text: 'text-indigo-700', activeBg: 'bg-white', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-600' };

              return (
                <button
                  key={exam.id}
                  id={`year-btn-${exam.id}`}
                  onClick={() => onExamChange?.(exam.id, exam.date)}
                  className={`group relative px-4 py-2 rounded-[14px] text-[11px] md:text-xs font-bold transition-all duration-300 flex items-center gap-2 z-10 flex-shrink-0 ${
                    isSelected
                      ? catTheme.text
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
                >
                  {exam.year} 年
                  {exam.isEstimated && (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md transition-colors tracking-widest ${
                      isSelected 
                        ? `${catTheme.badgeBg} border border-white/50 ${catTheme.badgeText}` 
                        : 'bg-slate-100/50 border border-slate-200/50 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                    }`}>
                      預計
                    </span>
                  )}
                  {isSelected && (
                    <motion.div
                      layoutId="year-bg"
                      className={`absolute inset-0 ${catTheme.activeBg} shadow-sm ring-1 ring-slate-200/50 rounded-[14px] -z-10`}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
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
                      ? 'bg-gradient-to-br from-white via-amber-100 to-cyan-100'
                      : 'bg-gradient-to-br from-slate-800 to-slate-500'
                  }`}>
                     {liveExamStatus.title}
                  </h3>
                  
                  {liveExamStatus.motivation && (
                      <div className={`text-base md:text-lg font-bold mb-2 mt-[-0.5rem] tracking-wide max-w-sm md:max-w-md ${
                        liveExamStatus.state === 'FINISHED' ? 'text-white/85' : 'text-slate-500'
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
                        <p className={`font-bold text-xl ${liveExamStatus.state === 'FINISHED' ? 'text-white/90' : 'text-slate-600'}`}>{liveExamStatus.label}</p>
                    </div>
                  )}
              </div>
          </div>
        ) : (
          /* Standard Countdown Display */
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            {/* Left: Main Days Display */}
          <div className="flex-1 relative overflow-hidden rounded-[2rem] border border-white/80 bg-[radial-gradient(circle_at_18%_18%,rgba(199,210,254,.55),transparent_32%),linear-gradient(135deg,rgba(255,255,255,.98),rgba(238,242,255,.72)_48%,rgba(236,254,255,.58))] shadow-[0_24px_70px_rgba(79,70,229,0.12),inset_0_1px_0_rgba(255,255,255,.9)] p-5 md:p-6 flex flex-col justify-between group-hover:shadow-[0_28px_78px_rgba(79,70,229,0.18)] transition-all duration-500 min-h-[220px]">
             <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-indigo-300/25 blur-3xl pointer-events-none"></div>
             <div className="absolute -left-12 bottom-0 w-40 h-40 rounded-full bg-cyan-300/20 blur-3xl pointer-events-none"></div>
             <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"></div>
             <div className="flex justify-between items-start gap-3 relative z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/75 border border-indigo-100/80 text-indigo-600 text-[10px] md:text-xs font-black tracking-wider uppercase shadow-sm backdrop-blur-md">
                   <CalendarDays className="w-3 h-3" />
                   <span>{examShortName}倒數</span>
                </div>
                <span className="text-xs font-mono text-slate-500 bg-white/70 px-2.5 py-1 rounded-xl border border-white shadow-sm">
                  {targetDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })}
                </span>
             </div>

             <div className="relative z-10 py-5 md:py-6">
                <div className="absolute left-1/2 top-1/2 h-28 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-2xl"></div>
                <div className="flex items-end justify-center gap-2 sm:gap-3">
                  {String(timeLeft.days).padStart(2, '0').split('').map((digit, index) => (
                    <div
                      key={`${digit}-${index}`}
                      className="relative flex h-[6.2rem] w-[4.35rem] items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/80 bg-gradient-to-b from-white via-slate-50 to-indigo-50/80 shadow-[0_18px_36px_rgba(79,70,229,0.16),inset_0_1px_0_rgba(255,255,255,1)] md:h-32 md:w-[5.55rem] md:rounded-[1.65rem]"
                    >
                      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/90 to-transparent"></div>
                      <div className="absolute inset-x-3 top-1/2 h-px bg-slate-200/80"></div>
                      <span
                        className="relative z-10 tabular-nums text-[4.8rem] leading-none md:text-[6.55rem] font-black tracking-[-0.075em] bg-clip-text text-transparent bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-600 drop-shadow-[0_10px_20px_rgba(79,70,229,0.14)] pr-1"
                        style={{ fontFamily: '"SF Pro Display", "Inter", ui-sans-serif, system-ui, sans-serif' }}
                      >
                        {digit}
                      </span>
                    </div>
                  ))}
                  <div className="mb-2 md:mb-4 ml-1 flex flex-col items-start">
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs md:text-sm font-black text-white tracking-[0.22em] shadow-lg shadow-indigo-200/70">DAYS</span>
                    <span className="mt-2 text-[10px] font-black text-slate-400 tracking-[0.24em]">倒數天數</span>
                  </div>
                </div>
             </div>

             <div className="space-y-2 relative z-10">
                <div className="w-full bg-white/80 h-2 rounded-full overflow-hidden border border-white shadow-inner">
                   <div className="h-full w-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 animate-[shimmer_3s_infinite]"></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                   <span>距離 {examName}</span>
                   <span className="text-indigo-500">Keep Going</span>
                </div>
             </div>
          </div>
          <div className="hidden flex-1 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-indigo-50/30 to-sky-50/40 border border-white shadow-sm p-6 flex-col justify-between group-hover:shadow-md transition-all duration-500 min-h-[180px]">
             <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-indigo-200/20 blur-3xl pointer-events-none"></div>
             <div className="absolute -left-12 bottom-0 w-32 h-32 rounded-full bg-cyan-200/20 blur-3xl pointer-events-none"></div>
             <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] md:text-xs font-bold tracking-wider uppercase">
                   <CalendarDays className="w-3 h-3" />
                   <span>{examShortName}倒數</span>
                </div>
                <span className="text-xs font-mono text-slate-400 bg-white/50 px-2 py-1 rounded-md border border-slate-100">
                  {targetDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })}
                </span>
             </div>
             
             <div className="mt-1 mb-2 flex items-end gap-3 md:gap-5 relative z-10 overflow-visible py-2">
                <span
                  className="tabular-nums text-[5.15rem] leading-[1.08] md:text-[7rem] font-black tracking-[-0.045em] bg-clip-text text-transparent bg-gradient-to-b from-slate-950 via-indigo-900 to-slate-700 drop-shadow-[0_10px_24px_rgba(79,70,229,0.16)] px-1"
                  style={{ fontFamily: '"SF Pro Display", "Inter", ui-sans-serif, system-ui, sans-serif' }}
                >
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <div className="mb-3 md:mb-5 flex flex-col">
                  <span className="text-sm md:text-lg font-black text-indigo-500 tracking-[0.26em]">DAYS</span>
                  <span className="mt-1 text-[10px] font-bold text-slate-400 tracking-widest">倒數天數</span>
                </div>
             </div>
             
             <div className="space-y-2">
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 w-full animate-[shimmer_3s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] opacity-80"></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                   <span>距離 {examName}</span>
                   <span className="text-indigo-400">Keep Going</span>
                </div>
             </div>
          </div>

          {/* Right: H/M/S Stats Grid */}
          <div className="flex-1 grid grid-cols-3 gap-3">
              {[
                { label: '小時', value: timeLeft.hours, color: 'from-indigo-700 to-indigo-500', bg: 'bg-indigo-50/70', border: 'border-indigo-100' },
                { label: '分鐘', value: timeLeft.minutes, color: 'from-fuchsia-700 to-fuchsia-500', bg: 'bg-fuchsia-50/70', border: 'border-fuchsia-100' },
                { label: '秒數', value: timeLeft.seconds, color: 'from-emerald-700 to-emerald-500', bg: 'bg-emerald-50/70', border: 'border-emerald-100' }
              ].map((item, idx) => (
                <div key={idx} className={`rounded-[1.75rem] ${item.bg} ${item.border} border flex flex-col items-center justify-center p-2 relative overflow-hidden group/item transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-100/50`}>
                   <div className="absolute inset-x-3 top-3 h-px bg-white/80"></div>
                   <div className="absolute -right-4 -bottom-4 w-14 h-14 rounded-full bg-white/50 blur-xl"></div>
                   <span
                     className={`text-4xl md:text-5xl font-black tabular-nums leading-[1.12] tracking-[-0.025em] z-10 bg-clip-text text-transparent bg-gradient-to-b ${item.color} drop-shadow-[0_6px_16px_rgba(15,23,42,0.10)] px-0.5 py-1`}
                     style={{ fontFamily: '"SF Pro Display", "Inter", ui-sans-serif, system-ui, sans-serif' }}
                   >
                     {String(item.value).padStart(2, '0')}
                   </span>
                   <span className="text-[10px] text-slate-400 uppercase tracking-[0.22em] font-black z-10 mt-1">{item.label}</span>
                </div>
              ))}
              
              {/* Bottom Row - Greeting Tag */}
              <Greeting user={user} />
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default CountdownDisplay;
