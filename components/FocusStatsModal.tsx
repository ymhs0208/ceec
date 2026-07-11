import React, { useMemo, useState } from 'react';
import {
  X,
  ArrowLeft,
  BarChart3,
  Clock,
  TrendingUp,
  Calendar,
  BookOpen,
  Target,
  List,
  Filter,
  Award,
  CheckCircle2,
  AlertCircle,
  Flame,
  NotebookText,
  Heart,
  Activity,
  PieChart,
  CalendarDays,
} from 'lucide-react';
import { StudySession } from '../types';

interface FocusStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StudySession[];
  variant?: 'modal' | 'page';
}

type Tab = 'overview' | 'review' | 'records';

const dayMs = 24 * 60 * 60 * 1000;

const SUBJECT_STYLES: Record<string, { dot: string; soft: string; text: string; bar: string }> = {
  chinese: { dot: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' },
  english: { dot: 'bg-sky-500', soft: 'bg-sky-50', text: 'text-sky-700', bar: 'bg-sky-500' },
  math: { dot: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  social: { dot: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  natural: { dot: 'bg-cyan-500', soft: 'bg-cyan-50', text: 'text-cyan-700', bar: 'bg-cyan-500' },
  default: { dot: 'bg-slate-500', soft: 'bg-slate-50', text: 'text-slate-700', bar: 'bg-slate-500' },
};

const getSubjectStyle = (subjectId: string, subjectName = '') => {
  const id = `${subjectId} ${subjectName}`.toLowerCase();
  if (id.includes('chinese') || id.includes('國文') || id.includes('中文')) return SUBJECT_STYLES.chinese;
  if (id.includes('english') || id.includes('英文')) return SUBJECT_STYLES.english;
  if (id.includes('math') || id.includes('數學')) return SUBJECT_STYLES.math;
  if (id.includes('social') || id.includes('社會')) return SUBJECT_STYLES.social;
  if (id.includes('natural') || id.includes('自然')) return SUBJECT_STYLES.natural;
  return SUBJECT_STYLES.default;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const startOfWeek = (date: Date) => {
  const day = date.getDay() === 0 ? 7 : date.getDay();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day + 1).getTime();
};

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} 分鐘`;
  if (m === 0) return `${h} 小時`;
  return `${h} 小時 ${m} 分鐘`;
};

const formatShortDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatHours = (minutes: number) => (minutes / 60).toFixed(1);

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', weekday: 'short' });

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });

const FocusStatsModal: React.FC<FocusStatsModalProps> = ({ isOpen, onClose, sessions, variant = 'modal' }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => b.timestamp - a.timestamp), [sessions]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastWeekStart = weekStart - 7 * dayMs;
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    const todaySessions = sessions.filter((session) => session.timestamp >= todayStart && session.timestamp < todayStart + dayMs);
    const thisWeekSessions = sessions.filter((session) => session.timestamp >= weekStart && session.timestamp < weekStart + 7 * dayMs);
    const lastWeekSessions = sessions.filter((session) => session.timestamp >= lastWeekStart && session.timestamp < weekStart);
    const thisMonthSessions = sessions.filter((session) => session.timestamp >= monthStart);
    const lastMonthSessions = sessions.filter((session) => session.timestamp >= lastMonthStart && session.timestamp < monthStart);

    const todayMinutes = todaySessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    const thisWeekMinutes = thisWeekSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    const lastWeekMinutes = lastWeekSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    const thisMonthMinutes = thisMonthSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    const lastMonthMinutes = lastMonthSessions.reduce((sum, session) => sum + session.durationMinutes, 0);

    const dayMap = new Map<string, number>();
    const subjectMap: Record<string, { id: string; name: string; minutes: number; count: number }> = {};
    const hourMap: Record<number, number> = {};

    sessions.forEach((session) => {
      const dateKey = new Date(session.timestamp).toLocaleDateString('zh-TW');
      dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + session.durationMinutes);
      const hour = new Date(session.timestamp).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + session.durationMinutes;

      if (!subjectMap[session.subjectId]) {
        subjectMap[session.subjectId] = { id: session.subjectId, name: session.subjectName, minutes: 0, count: 0 };
      }
      subjectMap[session.subjectId].minutes += session.durationMinutes;
      subjectMap[session.subjectId].count += 1;
    });

    const subjectData = Object.values(subjectMap).sort((a, b) => b.minutes - a.minutes);
    const activeDays = dayMap.size;
    const averagePerSession = sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0;
    const averagePerActiveDay = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;
    const longestSession = sessions.reduce((max, session) => Math.max(max, session.durationMinutes), 0);
    const topSubject = subjectData[0]?.name || '尚無';
    const topSubjectShare = totalMinutes > 0 ? Math.round(((subjectData[0]?.minutes || 0) / totalMinutes) * 100) : 0;
    const peakHourEntry = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
    const bestDayEntry = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0];

    const dailyData = Array.from({ length: 14 }).map((_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (13 - index));
      const start = startOfDay(date);
      const minutes = sessions
        .filter((session) => session.timestamp >= start && session.timestamp < start + dayMs)
        .reduce((sum, session) => sum + session.durationMinutes, 0);

      return {
        label: date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
        weekday: date.toLocaleDateString('zh-TW', { weekday: 'short' }),
        minutes,
      };
    });

    const heatmapData = Array.from({ length: 28 }).map((_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (27 - index));
      const start = startOfDay(date);
      const minutes = sessions
        .filter((session) => session.timestamp >= start && session.timestamp < start + dayMs)
        .reduce((sum, session) => sum + session.durationMinutes, 0);

      return {
        key: date.toISOString(),
        label: date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
        minutes,
      };
    });

    const hourData = Array.from({ length: 24 }).map((_, hour) => ({
      hour,
      minutes: hourMap[hour] || 0,
    }));

    const maxDailyMinutes = Math.max(...dailyData.map((day) => day.minutes), 60);
    const maxHeatMinutes = Math.max(...heatmapData.map((day) => day.minutes), 1);
    const maxHourMinutes = Math.max(...hourData.map((item) => item.minutes), 1);
    const weekDiff = thisWeekMinutes - lastWeekMinutes;
    const monthDiff = thisMonthMinutes - lastMonthMinutes;

    let headline = '還沒有紀錄也沒關係';
    let encouragement = '學習歷程會從第一段專注開始。先完成一小段，這裡就會慢慢長出你的努力軌跡。';
    if (totalMinutes > 0) {
      headline = `你已經累積 ${formatDuration(totalMinutes)}`;
      encouragement = '這些不是冷冰冰的數字，是你坐下來、撐過分心、把時間交給目標的證明。';
    }
    if (todayMinutes > 0) {
      encouragement = `今天已經完成 ${formatDuration(todayMinutes)}。不管多長，能開始就是很重要的一步。`;
    }

    const reviewNotes = [
      totalMinutes > 0
        ? `目前共有 ${sessions.length} 筆專注紀錄，平均每次 ${formatDuration(averagePerSession)}。`
        : '先不用追求完美紀錄，從一段能完成的時間開始就好。',
      subjectData.length > 0
        ? `${topSubject} 是目前投入最多的科目，占整體 ${topSubjectShare}%。`
        : '開始記錄科目後，這裡會幫你看出讀書重心。',
      peakHourEntry
        ? `你比較常在 ${peakHourEntry[0].padStart(2, '0')}:00 左右累積專注，可以把難度高的內容放在這段時間。`
        : '多累積幾天後，系統會看出你比較適合讀書的時段。',
      bestDayEntry
        ? `目前最有感的一天是 ${bestDayEntry[0]}，那天累積 ${formatDuration(bestDayEntry[1])}。`
        : '等你留下更多紀錄後，這裡會顯示最投入的一天。',
    ];

    return {
      activeDays,
      averagePerActiveDay,
      averagePerSession,
      bestDay: bestDayEntry ? { label: bestDayEntry[0], minutes: bestDayEntry[1] } : null,
      dailyData,
      encouragement,
      headline,
      heatmapData,
      hourData,
      lastMonthMinutes,
      lastWeekMinutes,
      longestSession,
      maxDailyMinutes,
      maxHeatMinutes,
      maxHourMinutes,
      monthDiff,
      peakHour: peakHourEntry ? Number(peakHourEntry[0]) : null,
      reviewNotes,
      subjectData,
      thisMonthMinutes,
      thisWeekMinutes,
      todayMinutes,
      todaySessionCount: todaySessions.length,
      topSubject,
      topSubjectShare,
      totalMinutes,
      weekDiff,
    };
  }, [sessions]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Map<string, string>();
    sessions.forEach((session) => subjects.set(session.subjectName, session.subjectName));
    return Array.from(subjects.values());
  }, [sessions]);

  const groupedSessions = useMemo(() => {
    const filtered = filterSubject === 'all'
      ? sortedSessions
      : sortedSessions.filter((session) => session.subjectName === filterSubject);

    return filtered.reduce<Record<string, StudySession[]>>((groups, session) => {
      const key = formatDate(session.timestamp);
      if (!groups[key]) groups[key] = [];
      groups[key].push(session);
      return groups;
    }, {});
  }, [filterSubject, sortedSessions]);

  if (!isOpen) return null;

  const isPage = variant === 'page';
  const groupedSessionEntries = Object.entries(groupedSessions) as [string, StudySession[]][];
  const tabs: { id: Tab; label: string; caption: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '總覽', caption: '完整統計', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'review', label: '檢討', caption: '趨勢與建議', icon: <Award className="h-4 w-4" /> },
    { id: 'records', label: '紀錄', caption: '逐筆查看', icon: <List className="h-4 w-4" /> },
  ];
  const activeTabItem = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className={isPage ? 'animate-fade-in' : 'fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-md animate-fade-in'}>
      <div className={isPage ? 'relative flex min-h-[calc(100vh-11rem)] w-full flex-col gap-6' : 'relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-2xl shadow-indigo-100/40 animate-scale-in'}>
        <header className={isPage ? 'relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-8' : 'flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-sky-50 p-5 md:flex-row md:items-center md:justify-between md:p-6'}>
          {isPage && <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />}
          <div className="flex items-start gap-4">
            <button
              onClick={onClose}
              className={isPage ? 'mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900' : 'absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition-all hover:text-slate-800 md:static'}
              title="返回"
            >
              {isPage ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </button>
            <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-700">
                <NotebookText className="h-4 w-4" />
                Learning Portfolio
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">學習歷程</h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                完整整理你的專注時數、科目分佈、讀書時段、近期趨勢與逐筆紀錄，讓努力不只是過去，而是下一步的方向。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
            <TopStat label="累積" value={`${formatHours(stats.totalMinutes)}h`} tone="indigo" />
            <TopStat label="紀錄" value={`${sessions.length}`} tone="emerald" />
            <TopStat label="天數" value={`${stats.activeDays}`} tone="amber" />
          </div>
        </header>

        <div className={isPage ? 'grid flex-grow gap-5 lg:grid-cols-[250px_minmax(0,1fr)]' : 'flex-grow overflow-hidden'}>
          {isPage && (
            <aside className="hidden lg:block">
              <div className="sticky top-6 rounded-[1.5rem] border border-white/70 bg-white/85 p-3 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
                <div className="px-3 pb-3 pt-2">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">View</div>
                  <div className="mt-1 text-lg font-black text-slate-950">{activeTabItem.label}</div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{activeTabItem.caption}</p>
                </div>
                <div className="space-y-1.5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${activeTab === tab.id ? 'border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900'}`}
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">{tab.icon}</span>
                      <span>
                        <span className="block text-sm font-black">{tab.label}</span>
                        <span className="block text-xs font-semibold opacity-70">{tab.caption}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          <div className={isPage ? 'sticky top-3 z-30 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/95 p-2 shadow-lg shadow-slate-200/60 backdrop-blur-xl lg:hidden' : 'border-b border-slate-100 bg-slate-50 p-3'}>
            <div className="grid grid-cols-3 gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[58px] rounded-2xl px-2.5 py-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${activeTab === tab.id ? 'bg-slate-950 text-white shadow-lg shadow-slate-300/60' : 'bg-white text-slate-500 border border-slate-200 shadow-sm'}`}
                >
                  {tab.icon}
                  <span className="text-xs font-black leading-none">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <main className={isPage ? 'min-w-0 rounded-[1.5rem] border border-white/70 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-6 xl:p-8' : 'h-full overflow-y-auto bg-slate-50 p-4 custom-scrollbar md:p-8'}>
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                <section className="overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-xl shadow-indigo-100/40">
                  <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
                    <div className="p-5 sm:p-6">
                      <div className="mb-3 flex items-center gap-2 text-xs font-black text-indigo-700">
                        <Heart className="h-4 w-4" />
                        你的努力摘要
                      </div>
                      <h3 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{stats.headline}</h3>
                      <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">{stats.encouragement}</p>
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <SimpleStat icon={<Clock className="h-4 w-4" />} label="今天" value={formatShortDuration(stats.todayMinutes)} />
                        <SimpleStat icon={<Flame className="h-4 w-4" />} label="本週" value={formatShortDuration(stats.thisWeekMinutes)} />
                        <SimpleStat icon={<BookOpen className="h-4 w-4" />} label="主要科目" value={stats.topSubject} />
                      </div>
                    </div>
                    <div className="border-t border-indigo-100/70 bg-gradient-to-br from-indigo-50 to-sky-50 p-5 lg:border-l lg:border-t-0">
                      <div className="text-xs font-black text-indigo-500">TOTAL FOCUS</div>
                      <div className="mt-5 text-5xl font-black text-slate-950">{formatHours(stats.totalMinutes)}</div>
                      <div className="mt-1 text-sm font-bold text-slate-500">小時專注</div>
                      <div className="mt-6 grid gap-2">
                        <MiniPanel label="平均每次" value={formatDuration(stats.averagePerSession)} />
                        <MiniPanel label="最長一次" value={formatDuration(stats.longestSession)} />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <SummaryCard icon={<Activity className="h-5 w-5" />} label="今日紀錄" value={`${stats.todaySessionCount} 筆`} tone="indigo" />
                  <SummaryCard icon={<CalendarDays className="h-5 w-5" />} label="本月累積" value={`${formatHours(stats.thisMonthMinutes)}h`} tone="emerald" />
                  <SummaryCard icon={<Target className="h-5 w-5" />} label="平均活躍日" value={formatDuration(stats.averagePerActiveDay)} tone="amber" />
                  <SummaryCard icon={<Award className="h-5 w-5" />} label="最高單日" value={stats.bestDay ? formatShortDuration(stats.bestDay.minutes) : '尚無'} tone="rose" />
                </div>

                <TrendSection
                  dailyData={stats.dailyData}
                  maxDailyMinutes={stats.maxDailyMinutes}
                  todayMinutes={stats.todayMinutes}
                />

                <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
                  <SubjectSection subjectData={stats.subjectData} totalMinutes={stats.totalMinutes} />
                  <HeatmapSection heatmapData={stats.heatmapData} maxHeatMinutes={stats.maxHeatMinutes} />
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <PeriodCard title="本週" minutes={stats.thisWeekMinutes} previous={stats.lastWeekMinutes} diff={stats.weekDiff} />
                  <PeriodCard title="本月" minutes={stats.thisMonthMinutes} previous={stats.lastMonthMinutes} diff={stats.monthDiff} />
                  <PeriodCard title="平均一天" minutes={stats.averagePerActiveDay} previous={0} diff={0} isAverage />
                </div>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-black text-slate-900">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    給你的回饋
                  </h3>
                  <div className="space-y-3">
                    {stats.reviewNotes.map((note) => (
                      <div key={note} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                        <p className="text-sm font-semibold leading-relaxed text-slate-700">{note}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-black text-slate-900">
                    <Clock className="h-5 w-5 text-rose-600" />
                    讀書時段分析
                  </h3>
                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 xl:grid-cols-12">
                    {stats.hourData.map((item) => {
                      const height = item.minutes > 0 ? Math.max((item.minutes / stats.maxHourMinutes) * 100, 18) : 8;
                      return (
                        <div key={item.hour} className="flex h-24 flex-col justify-end gap-1">
                          <div className="flex flex-1 items-end overflow-hidden rounded-md bg-slate-100">
                            <div
                              className="w-full rounded-t-md bg-rose-400 transition-all"
                              style={{ height: `${height}%`, opacity: item.minutes > 0 ? 0.9 : 0.18 }}
                            />
                          </div>
                          <div className="text-center text-[10px] font-bold text-slate-400">{item.hour}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-black text-slate-900">
                    <Award className="h-5 w-5 text-indigo-600" />
                    下一步可以這樣做
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Suggestion title="保留做得到的節奏" description="比起一次讀很久，更重要的是明天還願意回來。先守住你能穩定完成的長度。" />
                    <Suggestion title="讀完留 3 分鐘回顧" description="每段結束後寫下今天卡住的地方，下一次開始會更快進入狀態。" />
                    <Suggestion title="讓科目更平均" description="如果某科占比很高，可以安排一段短時間給比較少碰的科目，避免考前失衡。" />
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'records' && (
              <RecordsTab
                filterSubject={filterSubject}
                groupedSessionEntries={groupedSessionEntries}
                setFilterSubject={setFilterSubject}
                uniqueSubjects={uniqueSubjects}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

interface TopStatProps {
  label: string;
  value: string;
  tone: 'indigo' | 'emerald' | 'amber';
}

const topStatTone = {
  indigo: 'border-indigo-100 bg-indigo-50/80 text-indigo-700',
  emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-700',
  amber: 'border-amber-100 bg-amber-50/80 text-amber-700',
};

const TopStat: React.FC<TopStatProps> = ({ label, value, tone }) => (
  <div className={`rounded-2xl border px-3 py-3 text-center ${topStatTone[tone]}`}>
    <div className="text-xl font-black">{value}</div>
    <div className="mt-1 text-[10px] font-black uppercase tracking-widest opacity-70">{label}</div>
  </div>
);

interface SimpleStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const SimpleStat: React.FC<SimpleStatProps> = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
      {icon}
      {label}
    </div>
    <div className="mt-1 truncate text-sm font-black text-slate-950">{value}</div>
  </div>
);

const MiniPanel: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
    <div className="text-xs font-black text-slate-400">{label}</div>
    <div className="mt-1 text-base font-black text-slate-950">{value}</div>
  </div>
);

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose';
}

const summaryTone = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
};

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, tone }) => (
  <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${summaryTone[tone]}`}>
      {icon}
    </div>
    <div className="text-xs font-black text-slate-400">{label}</div>
    <div className="mt-1 text-xl font-black text-slate-950">{value}</div>
  </div>
);

interface TrendSectionProps {
  dailyData: Array<{ label: string; weekday: string; minutes: number }>;
  maxDailyMinutes: number;
  todayMinutes: number;
}

const TrendSection: React.FC<TrendSectionProps> = ({ dailyData, maxDailyMinutes, todayMinutes }) => {
  const totalMinutes = dailyData.reduce((sum, day) => sum + day.minutes, 0);
  const activeDays = dailyData.filter((day) => day.minutes > 0).length;
  const averageMinutes = dailyData.length > 0 ? Math.round(totalMinutes / dailyData.length) : 0;
  const bestDay = dailyData.reduce(
    (best, day) => (day.minutes > best.minutes ? day : best),
    { label: '-', weekday: '', minutes: 0 },
  );

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-white via-indigo-50/60 to-sky-50/70 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-black text-slate-900">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              最近 14 天趨勢
            </h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
              用兩週的節奏看出自己什麼時候比較穩，不用每天滿分，有留下痕跡就值得被看見。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <TrendMetric label="兩週累積" value={formatShortDuration(totalMinutes)} />
            <TrendMetric label="有讀書天" value={`${activeDays} 天`} />
            <TrendMetric label="今日" value={formatShortDuration(todayMinutes)} strong />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-[11px] font-black text-slate-400">平均每天</div>
            <div className="mt-1 text-xl font-black text-slate-950">{formatDuration(averageMinutes)}</div>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="text-[11px] font-black text-indigo-500">最高一天</div>
            <div className="mt-1 text-xl font-black text-indigo-950">
              {bestDay.minutes > 0 ? formatShortDuration(bestDay.minutes) : '0m'}
            </div>
            <div className="mt-1 text-xs font-bold text-indigo-700/70">
              {bestDay.minutes > 0 ? `${bestDay.label} ${bestDay.weekday}` : '尚未累積'}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="text-[11px] font-black text-emerald-600">節奏感</div>
            <div className="mt-1 text-xl font-black text-emerald-950">
              {activeDays >= 10 ? '很穩' : activeDays >= 5 ? '正在成形' : '剛開始'}
            </div>
            <div className="mt-1 text-xs font-bold text-emerald-700/70">最近兩週有 {activeDays} 天留下紀錄</div>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="min-w-[720px] rounded-[1.25rem] border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex h-56 items-end gap-2">
              {dailyData.map((day, index) => {
                const height = Math.max((day.minutes / maxDailyMinutes) * 100, day.minutes > 0 ? 10 : 3);
                const isToday = index === dailyData.length - 1;
                const isBest = day.minutes > 0 && day.minutes === bestDay.minutes;
                return (
                  <div key={`${day.label}-${index}`} className="group flex h-full flex-1 flex-col justify-end gap-2">
                    <div className="flex min-h-[26px] items-end justify-center text-[10px] font-black text-slate-400">
                      {day.minutes > 0 ? formatShortDuration(day.minutes) : ''}
                    </div>
                    <div className="relative flex h-full items-end overflow-hidden rounded-xl bg-white shadow-inner">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-700 ${
                          isToday
                            ? 'bg-indigo-600'
                            : isBest
                              ? 'bg-emerald-500'
                              : 'bg-slate-300 group-hover:bg-sky-400'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="text-center leading-tight">
                      <div className={`text-[10px] font-black ${isToday ? 'text-indigo-700' : 'text-slate-600'}`}>{day.label}</div>
                      <div className="text-[9px] font-bold text-slate-400">{day.weekday}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />今天</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />最高一天</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />一般紀錄</span>
        </div>
      </div>
    </section>
  );
};

const TrendMetric: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className={`rounded-2xl border px-3 py-3 text-center shadow-sm ${strong ? 'border-indigo-100 bg-white text-indigo-700' : 'border-white/80 bg-white/75 text-slate-700'}`}>
    <div className="truncate text-lg font-black">{value}</div>
    <div className="mt-1 text-[10px] font-black uppercase tracking-widest opacity-60">{label}</div>
  </div>
);

const SubjectSection: React.FC<{
  subjectData: Array<{ id: string; name: string; minutes: number; count: number }>;
  totalMinutes: number;
}> = ({ subjectData, totalMinutes }) => (
  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h3 className="mb-5 flex items-center gap-2 font-black text-slate-900">
      <PieChart className="h-5 w-5 text-emerald-600" />
      科目分佈
    </h3>
    {subjectData.length === 0 ? (
      <EmptyState title="還沒有科目資料" description="完成第一段專注後，這裡會自動整理你把時間放在哪些科目。" icon={<BookOpen className="h-10 w-10" />} />
    ) : (
      <div className="space-y-4">
        {subjectData.map((subject) => {
          const style = getSubjectStyle(subject.id, subject.name);
          const percent = totalMinutes > 0 ? Math.round((subject.minutes / totalMinutes) * 100) : 0;
          return (
            <div key={subject.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                  <span className="truncate text-sm font-bold text-slate-800">{subject.name}</span>
                </div>
                <div className="whitespace-nowrap text-xs font-bold text-slate-500">
                  {formatDuration(subject.minutes)} · {percent}% · {subject.count} 筆
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
);

const HeatmapSection: React.FC<{
  heatmapData: Array<{ key: string; label: string; minutes: number }>;
  maxHeatMinutes: number;
}> = ({ heatmapData, maxHeatMinutes }) => (
  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h3 className="mb-5 flex items-center gap-2 font-black text-slate-900">
      <CalendarDays className="h-5 w-5 text-cyan-600" />
      最近 28 天熱度
    </h3>
    <div className="grid grid-cols-7 gap-2">
      {heatmapData.map((day) => {
        const opacity = day.minutes === 0 ? 0 : 0.25 + (day.minutes / maxHeatMinutes) * 0.75;
        return (
          <div
            key={day.key}
            title={`${day.label}: ${formatDuration(day.minutes)}`}
            className="aspect-square rounded-lg border border-slate-100"
            style={{ backgroundColor: day.minutes > 0 ? `rgba(14, 165, 233, ${opacity})` : '#f1f5f9' }}
          />
        );
      })}
    </div>
    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400">
      <span>少</span>
      <span>顏色越深，代表那天專注越久</span>
      <span>多</span>
    </div>
  </section>
);

interface PeriodCardProps {
  title: string;
  minutes: number;
  previous: number;
  diff: number;
  isAverage?: boolean;
}

const PeriodCard: React.FC<PeriodCardProps> = ({ title, minutes, previous, diff, isAverage }) => {
  const subtitle = isAverage
    ? '有紀錄的日子平均投入時間'
    : previous === 0
      ? '前一段尚無可比較資料'
      : diff >= 0
        ? `比前一段多 ${formatDuration(diff)}`
        : `比前一段少 ${formatDuration(Math.abs(diff))}`;

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-900">{title}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700">
          <Award className="h-5 w-5" />
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900">
        {isAverage ? formatDuration(minutes) : `${formatHours(minutes)} `}
        {!isAverage && <span className="text-sm text-slate-400">h</span>}
      </div>
    </div>
  );
};

interface SuggestionProps {
  title: string;
  description: string;
}

const Suggestion: React.FC<SuggestionProps> = ({ title, description }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-2 text-sm font-black text-slate-900">{title}</div>
    <p className="text-xs font-semibold leading-relaxed text-slate-600">{description}</p>
  </div>
);

const RecordsTab: React.FC<{
  filterSubject: string;
  groupedSessionEntries: [string, StudySession[]][];
  setFilterSubject: React.Dispatch<React.SetStateAction<string>>;
  uniqueSubjects: string[];
}> = ({ filterSubject, groupedSessionEntries, setFilterSubject, uniqueSubjects }) => (
  <div className="space-y-5 pb-8 animate-fade-in">
    <div className="sticky top-3 z-20 -mx-3 bg-slate-50/95 px-3 py-2 backdrop-blur-sm sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          篩選
        </div>
        <button
          onClick={() => setFilterSubject('all')}
          className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${filterSubject === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
        >
          全部
        </button>
        {uniqueSubjects.map((subject) => (
          <button
            key={subject}
            onClick={() => setFilterSubject(subject)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${filterSubject === subject ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            {subject}
          </button>
        ))}
      </div>
    </div>

    {groupedSessionEntries.length === 0 ? (
      <EmptyState
        icon={<List className="h-12 w-12" />}
        title={filterSubject === 'all' ? '還沒有學習紀錄' : `沒有「${filterSubject}」的紀錄`}
        description={filterSubject === 'all' ? '完成一次專注後，這裡會依日期整理你的讀書歷程。' : '可以切回全部，看看其他科目的紀錄。'}
      />
    ) : (
      <div className="space-y-6">
        {groupedSessionEntries.map(([date, daySessions]) => {
          const dayTotal = daySessions.reduce((sum, session) => sum + session.durationMinutes, 0);
          return (
            <section key={date} className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col items-start gap-1.5 border-b border-slate-200 bg-slate-100/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex items-center gap-2 font-black text-slate-800">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  {date}
                </div>
                <div className="text-xs font-bold text-slate-500">{daySessions.length} 筆 · {formatDuration(dayTotal)}</div>
              </div>
              <div className="divide-y divide-slate-100">
                {daySessions.map((session) => {
                  const style = getSubjectStyle(session.subjectId, session.subjectName);
                  return (
                    <div key={session.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${style.soft} ${style.text} font-black`}>
                          {session.subjectName.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-black text-slate-900">{session.subjectName}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {formatTime(session.timestamp)} 開始
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-end justify-between border-t border-slate-100 pt-3 text-right sm:block sm:border-t-0 sm:pt-0">
                        <div className="font-black text-slate-900">{formatDuration(session.durationMinutes)}</div>
                        <div className="text-[10px] font-bold text-slate-400">完成紀錄</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    )}
  </div>
);

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white py-14 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-300">{icon}</div>
    <div className="font-black text-slate-700">{title}</div>
    <p className="mt-2 max-w-sm text-sm font-semibold leading-relaxed text-slate-500">{description}</p>
  </div>
);

export default FocusStatsModal;
