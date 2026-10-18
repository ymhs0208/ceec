import './FocusStats.css';
import { useToday } from '../utils/useToday';
import React, { useMemo } from 'react';
import { StudySession, StreakData } from '../types';
import { ArrowRight, BarChart3, Check, Clock, Flame, Sparkles, Target } from 'lucide-react';

interface FocusStatsProps {
  sessions: StudySession[];
  dailyGoal?: number;
  streak?: StreakData;
  onClick?: () => void;
  compact?: boolean;
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} 分`;
  if (mins === 0) return `${hours} 小時`;
  return `${hours} 小時 ${mins} 分`;
};

const FocusStats: React.FC<FocusStatsProps> = ({
  sessions,
  dailyGoal = 120,
  streak = { current: 0, max: 0, lastDate: '' },
  onClick,
  compact = false,
}) => {
  const today = useToday();
  const stats = useMemo(() => {
    const now = new Date(today);
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
    const differenceFromYesterday = todayMinutes - yesterdayMinutes;

    let status = '今天還沒開始';

    if (todayPercent >= 100) {
      status = '今日目標完成';
    } else if (todayMinutes > 0) {
      status = todayPercent >= 70 ? '快達標了' : '已經開始累積';

    }

    return {
      remainingMinutes,
      status,
      todayMinutes,
      todayPercent,
      todaySessionCount: todaySessions.length,
      differenceFromYesterday,
      isComplete: todayPercent >= 100,
    };
  }, [sessions, dailyGoal, today]);

  const hours = Math.floor(stats.todayMinutes / 60);
  const minutes = stats.todayMinutes % 60;

  if (compact) return (
    <button type="button" onClick={onClick} className="focus-summary" data-complete={stats.isComplete}>
      <span className="focus-summary-heading"><span><Target size={15} /> 今日專注</span><span>{stats.isComplete ? '今日目標完成' : `${stats.todayPercent}%`}<ArrowRight size={14} /></span></span>
      <span className="focus-summary-value"><strong>{stats.todayMinutes}</strong><span>／{Math.max(dailyGoal, 1)} 分鐘</span><span className="focus-summary-streak"><Flame size={13} /> 連續 {streak.current} 天</span></span>
      <span className="focus-dashboard-progress" role="progressbar" aria-label="今日專注目標進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.todayPercent}><span style={{ width: `${stats.todayPercent}%` }} /></span>
      <span className="sr-only">查看學習歷程</span>
    </button>
  );

  return (
    <button type="button" onClick={onClick} className="focus-dashboard" data-complete={stats.isComplete}>
      <div className="focus-dashboard-header">
        <div><span className="focus-dashboard-eyebrow"><BarChart3 size={13} /> TODAY'S FOCUS</span><h3>今日專注儀表板</h3></div>
        <span className="focus-dashboard-status"><span />{stats.status}</span>
      </div>
      <div className="focus-dashboard-content">
        <div className="focus-dashboard-total">
          <span>今日累積專注</span>
          <div>{hours > 0 && <><strong>{hours}</strong><small>小時</small></>}{(minutes > 0 || hours === 0) && <><strong>{minutes}</strong><small>分鐘</small></>}</div>
          <p>{stats.differenceFromYesterday > 0 ? `比昨天多 ${formatDuration(stats.differenceFromYesterday)}` : '每一段專注，都是一點進步。'}</p>
        </div>
        <div className="focus-dashboard-goal">
          <div className="focus-dashboard-goal-heading"><span>今日目標進度</span><strong>{stats.todayPercent}<small>%</small></strong></div>
          <div className="focus-dashboard-progress" role="progressbar" aria-label="今日專注目標進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.todayPercent}><span style={{width: `${stats.todayPercent}%`}} /></div>
          <div className="focus-dashboard-goal-meta"><span><Target size={12} />目標 {formatDuration(dailyGoal)}</span><span>{stats.isComplete ? '已達標' : `還差 ${formatDuration(stats.remainingMinutes)}`}</span></div>
          <p>{stats.isComplete ? '今天的努力已經達標，給自己一點掌聲。' : stats.todayMinutes > 0 ? '照著自己的節奏，繼續累積就好。' : '從一段 25 分鐘開始，慢慢靠近今天的目標。'}</p>
        </div>
        <div className="focus-dashboard-metrics">
          <div className="focus-dashboard-metric"><span><Clock size={12} />專注次數</span><div><strong>{stats.todaySessionCount}</strong><small>次</small></div></div>
          <div className="focus-dashboard-metric"><span><Flame size={12} />連續專注</span><div><strong>{streak.current}</strong><small>天</small></div></div>
        </div>
      </div>
      <div className="focus-dashboard-footer">
        <span className="focus-dashboard-next">{stats.isComplete ? <Check size={13} /> : <Sparkles size={13} />}{stats.isComplete ? '今日目標完成，收藏這份努力。' : `下一步，再專注 ${formatDuration(Math.min(stats.remainingMinutes, 25))}。`}</span>
        <span className="focus-dashboard-link">查看學習歷程<ArrowRight size={13} /></span>
      </div>
    </button>
  );
};

export default FocusStats;
