import React, { useMemo } from 'react';
import { StudySession, StreakData } from '../types';
import { ArrowRight, BarChart3, Clock, Flame, Target } from 'lucide-react';

interface FocusStatsProps {
  sessions: StudySession[];
  dailyGoal?: number;
  streak?: StreakData;
  onClick?: () => void;
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} 分`;
  if (mins === 0) return `${hours} 小時`;
  return `${hours} 小時 ${mins} 分`;
};

const formatShortDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const FocusStats: React.FC<FocusStatsProps> = ({
  sessions,
  dailyGoal = 120,
  streak = { current: 0, max: 0, lastDate: '' },
  onClick,
}) => {
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;
    const yesterdayStart = todayStart - 86400000;

    const todaySessions = sessions.filter((session) => session.timestamp >= todayStart && session.timestamp < todayEnd);
    const yesterdaySessions = sessions.filter((session) => session.timestamp >= yesterdayStart && session.timestamp < todayStart);
    const todayMinutes = todaySessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    const yesterdayMinutes = yesterdaySessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    const goalMinutes = Math.max(dailyGoal, 1);
    const remainingMinutes = Math.max(goalMinutes - todayMinutes, 0);
    const todayPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

    let status = '今天還沒開始';
    let note = '先完成一段 25 分鐘就很好，儀表板會把完整紀錄整理到學習歷程。';

    if (todayPercent >= 100) {
      status = '今日目標完成';
      note = `已累積 ${formatDuration(todayMinutes)}，可以到學習歷程看完整分佈與紀錄。`;
    } else if (todayMinutes > 0) {
      status = todayPercent >= 70 ? '快達標了' : '已經開始累積';
      note = `目前完成 ${todayPercent}%，還差 ${formatDuration(remainingMinutes)}。`;
      if (todayMinutes > yesterdayMinutes && yesterdayMinutes > 0) {
        note += ` 今天比昨天多 ${formatDuration(todayMinutes - yesterdayMinutes)}。`;
      }
    }

    return {
      note,
      remainingMinutes,
      status,
      todayMinutes,
      todayPercent,
      todaySessionCount: todaySessions.length,
    };
  }, [sessions, dailyGoal]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/92 text-left shadow-xl shadow-indigo-100/50 backdrop-blur-2xl transition-all duration-300 ${
        onClick ? 'hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-200/45' : ''
      }`}
    >
      <div className="border-b border-slate-100/80 bg-gradient-to-br from-white via-indigo-50/70 to-emerald-50/50 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-indigo-600">
              <BarChart3 className="h-4 w-4" />
              今日專注
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">今日專注儀表板</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{stats.note}</p>
          </div>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-indigo-700 shadow-sm">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/75 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black text-slate-400">現在狀態</div>
              <div className="mt-1 text-xl font-black text-slate-950">{stats.status}</div>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 shadow-sm">
              {stats.todayPercent}%
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>{formatDuration(stats.todayMinutes)}</span>
              <span>目標 {formatDuration(dailyGoal)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${stats.todayPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniMetric icon={<Clock className="h-3.5 w-3.5" />} label="今天" value={formatShortDuration(stats.todayMinutes)} />
          <MiniMetric icon={<Target className="h-3.5 w-3.5" />} label="還差" value={stats.remainingMinutes === 0 ? '完成' : formatShortDuration(stats.remainingMinutes)} />
          <MiniMetric icon={<Flame className="h-3.5 w-3.5" />} label="連續" value={`${streak.current} 天`} />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-[1.5rem] border border-indigo-100 bg-indigo-50 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-indigo-950">完整內容在學習歷程</div>
            <div className="mt-0.5 text-xs font-bold text-indigo-700/70">
              科目分佈、近 7 天趨勢、逐筆紀錄都放在裡面
            </div>
          </div>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-indigo-700" />
        </div>
      </div>
    </button>
  );
};

interface MiniMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const MiniMetric: React.FC<MiniMetricProps> = ({ icon, label, value }) => (
  <div className="min-w-0 rounded-[1.25rem] border border-slate-100 bg-white px-3 py-3 shadow-sm">
    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
      {icon}
      {label}
    </div>
    <div className="mt-1 truncate text-sm font-black text-slate-950">{value}</div>
  </div>
);

export default FocusStats;
