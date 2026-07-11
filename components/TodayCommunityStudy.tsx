import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock, Loader2, Radio, Sparkles, UsersRound } from 'lucide-react';
import { StudySession } from '../types';
import { authService } from '../services/authService';

interface TodayCommunityStudyProps {
  sessions: StudySession[];
}

interface CommunityStats {
  totalMinutes: number;
  activeUsers: number;
  sessionCount: number;
  averageMinutes: number;
  topSubject?: string;
}

const formatDuration = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs <= 0) return `${mins} 分鐘`;
  if (mins === 0) return `${hrs} 小時`;
  return `${hrs} 小時 ${mins} 分鐘`;
};

const getTaipeiTodayBounds = () => {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
  const start = new Date(`${today}T00:00:00+08:00`).getTime();
  return { start, end: start + 86400000 };
};

const TodayCommunityStudy: React.FC<TodayCommunityStudyProps> = ({ sessions }) => {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const myToday = useMemo(() => {
    const { start, end } = getTaipeiTodayBounds();
    const todaySessions = sessions.filter((session) => session.timestamp >= start && session.timestamp < end);
    return {
      minutes: todaySessions.reduce((sum, session) => sum + session.durationMinutes, 0),
      count: todaySessions.length,
    };
  }, [sessions]);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      setLoading(true);
      const response = await authService.getTodayCommunityStats();
      if (cancelled) return;

      if (response.success && response.stats) {
        setStats(response.stats);
        setUnavailable(false);
      } else {
        setStats(null);
        setUnavailable(true);
      }
      setLoading(false);
    };

    loadStats();
    const timer = window.setInterval(loadStats, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const totalMinutes = stats?.totalMinutes ?? 0;
  const activeUsers = stats?.activeUsers ?? 0;
  const averageMinutes = stats?.averageMinutes ?? 0;
  const maxChartMinutes = Math.max(totalMinutes, averageMinutes, myToday.minutes, 1);
  const chartBars = [
    {
      label: '大家總共',
      value: totalMinutes,
      color: 'from-emerald-400 to-teal-500',
      textColor: 'text-emerald-700',
    },
    {
      label: '平均每人',
      value: averageMinutes,
      color: 'from-sky-400 to-indigo-500',
      textColor: 'text-sky-700',
    },
    {
      label: '我的今日',
      value: myToday.minutes,
      color: 'from-amber-400 to-orange-500',
      textColor: 'text-amber-700',
    },
  ];
  const sessionCount = stats?.sessionCount ?? 0;
  const sessionShare = Math.min(100, Math.round((sessionCount / Math.max(activeUsers, 1)) * 18));

  return (
    <section className="glass-card overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-lg shadow-slate-200/60">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 text-emerald-600 ring-1 ring-emerald-100">
            <BookOpen className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white">
              <Radio className="h-2.5 w-2.5 text-white" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-black text-slate-900">今日大家看多久書</h3>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
              {unavailable
                ? '雲端共讀統計尚未啟用，先顯示你今天的讀書時間。'
                : '每 5 分鐘更新一次，只顯示彙總數字。'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Today Total</div>
          <div className="mt-1 text-xl font-black text-emerald-700">{formatDuration(totalMinutes)}</div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-white/80 p-4 shadow-inner shadow-slate-100/70">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Chart</div>
            <h4 className="mt-1 text-sm font-black text-slate-900">今日讀書時間比較</h4>
          </div>
          <div className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-100">
            Asia/Taipei
          </div>
        </div>

        <div className="space-y-3">
          {chartBars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-xs font-black text-slate-600">{bar.label}</span>
                <span className={`text-xs font-black ${bar.textColor}`}>{formatDuration(bar.value)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${bar.color} transition-all duration-700`}
                  style={{ width: `${Math.max(5, Math.round((bar.value / maxChartMinutes) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Density</div>
            <div className="mt-1 text-sm font-black text-slate-800">今日紀錄活躍度</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400 transition-all duration-700"
                style={{ width: `${Math.max(6, sessionShare)}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900">{sessionCount}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">筆紀錄</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
          <UsersRound className="mb-2 h-4 w-4 text-sky-500" />
          <div className="text-lg font-black text-slate-900">{activeUsers}</div>
          <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">今日上線讀書</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
          <Clock className="mb-2 h-4 w-4 text-indigo-500" />
          <div className="text-lg font-black text-slate-900">{formatDuration(averageMinutes)}</div>
          <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">平均每人</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
          <Sparkles className="mb-2 h-4 w-4 text-amber-500" />
          <div className="truncate text-lg font-black text-slate-900">{stats?.topSubject || '尚未累積'}</div>
          <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">最多人讀</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
          <BookOpen className="mb-2 h-4 w-4 text-rose-500" />
          <div className="text-lg font-black text-slate-900">{sessionCount}</div>
          <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">今日紀錄</div>
        </div>
      </div>
    </section>
  );
};

export default TodayCommunityStudy;
