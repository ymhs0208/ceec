import React, { useMemo, useState } from 'react';
import { X, Trophy, Lock, Star, Flame, BookOpen, CheckSquare, Zap, Target, LayoutGrid, CalendarDays, Clock, ChevronLeft, ArrowLeft, Award, TrendingUp } from 'lucide-react';
import { AppData, StudySession } from '../types';
import { ACHIEVEMENTS, Achievement } from '../utils/achievements';
import Heatmap from './Heatmap';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  variant?: 'modal' | 'page';
}

const calculateProgress = (achievement: Achievement, data: AppData) => {
  let current = 0;
  let target = 1;
  let unit = '次';

  const desc = achievement.description;
  
  const match = desc.match(/(\d+)\s*(小時|天|個|次|分鐘)/);
  if (match) {
    target = parseInt(match[1], 10);
    unit = match[2];
  }

  if (achievement.category === 'time') {
    if (desc.includes('累積讀書')) {
      current = Math.floor(data.studySessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60);
    } else if (desc.includes('單日讀書')) {
      const daily = data.studySessions.reduce((acc, s) => {
        const date = new Date(s.timestamp).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + s.durationMinutes;
        return acc;
      }, {} as Record<string, number>);
      current = Math.floor(Math.max(0, ...Object.values(daily)) / 60);
    }
  } else if (achievement.category === 'streak') {
    current = data.streak.max;
  } else if (achievement.category === 'subject') {
    const subjectMap: Record<string, string> = {
      '國文': 'chinese', '英文': 'english', '數學': 'math', '社會': 'social', '自然': 'natural'
    };
    const subjectName = Object.keys(subjectMap).find(k => desc.includes(k));
    if (subjectName) {
      const subjectId = subjectMap[subjectName];
      current = Math.floor(data.studySessions.filter(s => s.subjectId === subjectId).reduce((acc, s) => acc + s.durationMinutes, 0) / 60);
    }
  } else if (achievement.category === 'task') {
    current = data.tasks.filter(t => t.completed).length;
  } else if (achievement.category === 'special') {
    if (desc.includes('半夜')) {
      current = data.studySessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 0 && h < 4; }).length;
    } else if (desc.includes('清晨')) {
      current = data.studySessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 4 && h < 8; }).length;
    } else if (desc.includes('週末')) {
      current = data.studySessions.filter(s => [0, 6].includes(new Date(s.timestamp).getDay())).length;
    } else if (desc.includes('記錄')) {
      if (desc.includes('分鐘')) {
        const mins = parseInt(desc.match(/(\d+)\s*分鐘/)?.[1] || '0', 10);
        current = data.studySessions.filter(s => s.durationMinutes === mins).length;
      } else {
        current = data.studySessions.length;
      }
    } else if (desc.includes('中午')) {
      current = data.studySessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 12 && h < 13; }).length;
    } else if (desc.includes('下午')) {
      current = data.studySessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 14 && h < 16; }).length;
    } else if (desc.includes('晚餐')) {
      current = data.studySessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 18 && h < 20; }).length;
    } else if (desc.includes('黃金')) {
      current = data.studySessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 20 && h < 22; }).length;
    } else if (desc.includes('深夜')) {
      current = data.studySessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 22 && h < 24; }).length;
    } else {
      current = achievement.condition(data) ? target : 0;
    }
  }

  return { current: Math.min(current, target), target, unit };
};

const getRelatedSessions = (achievement: Achievement, data: AppData) => {
  const desc = achievement.description;
  let sessions = [...data.studySessions].sort((a, b) => b.timestamp - a.timestamp);

  if (achievement.category === 'subject') {
    const subjectMap: Record<string, string> = {
      '國文': 'chinese', '英文': 'english', '數學': 'math', '社會': 'social', '自然': 'natural'
    };
    const subjectName = Object.keys(subjectMap).find(k => desc.includes(k));
    if (subjectName) {
      sessions = sessions.filter(s => s.subjectId === subjectMap[subjectName]);
    }
  } else if (achievement.category === 'special') {
    if (desc.includes('半夜')) {
      sessions = sessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 0 && h < 4; });
    } else if (desc.includes('清晨')) {
      sessions = sessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 4 && h < 8; });
    } else if (desc.includes('週末')) {
      sessions = sessions.filter(s => [0, 6].includes(new Date(s.timestamp).getDay()));
    } else if (desc.includes('中午')) {
      sessions = sessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 12 && h < 13; });
    } else if (desc.includes('下午')) {
      sessions = sessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 14 && h < 16; });
    } else if (desc.includes('晚餐')) {
      sessions = sessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 18 && h < 20; });
    } else if (desc.includes('黃金')) {
      sessions = sessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 20 && h < 22; });
    } else if (desc.includes('深夜')) {
      sessions = sessions.filter(s => { const h = new Date(s.timestamp).getHours(); return h >= 22 && h < 24; });
    } else if (desc.includes('分鐘')) {
      const mins = parseInt(desc.match(/(\d+)\s*分鐘/)?.[1] || '0', 10);
      sessions = sessions.filter(s => s.durationMinutes === mins);
    }
  }
  
  return sessions.slice(0, 5);
};

const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, onClose, data, variant = 'modal' }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'time' | 'streak' | 'subject' | 'task' | 'special'>('all');
  const [viewMode, setViewMode] = useState<'achievements' | 'heatmap'>('achievements');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const isPage = variant === 'page';

  const unlockedIds = useMemo(() => {
    return new Set(ACHIEVEMENTS.filter(a => a.condition(data)).map(a => a.id));
  }, [data]);

  const filteredAchievements = useMemo(() => {
    if (activeTab === 'all') return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter(a => a.category === activeTab);
  }, [activeTab]);

  const unlockedCount = unlockedIds.size;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercentage = Math.round((unlockedCount / totalCount) * 100);
  const totalMinutes = data.studySessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const activeDays = new Set(data.studySessions.map(session => new Date(session.timestamp).toLocaleDateString('zh-TW'))).size;
  const recentUnlocked = ACHIEVEMENTS.filter(a => unlockedIds.has(a.id)).slice(-3).reverse();

  if (!isOpen) return null;

  if (selectedAchievement) {
    const isUnlocked = unlockedIds.has(selectedAchievement.id);
    const progress = calculateProgress(selectedAchievement, data);
    const relatedSessions = getRelatedSessions(selectedAchievement, data);

    if (isPage) {
      return (
        <div className="animate-fade-in">
          <div className="relative min-h-[calc(100vh-11rem)] rounded-[1.75rem] border border-white/70 bg-white/85 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-6 lg:p-8">
            <button onClick={() => setSelectedAchievement(null)} className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-700">
              <ChevronLeft className="h-4 w-4" /> 返回成就牆
            </button>
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-center">
                <div className={`mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-[2rem] text-6xl shadow-inner ${isUnlocked ? 'bg-indigo-50 shadow-indigo-200' : 'bg-slate-100 grayscale opacity-60'}`}>
                  {isUnlocked ? selectedAchievement.icon : <Lock className="h-12 w-12 text-slate-400" />}
                </div>
                <h2 className="text-2xl font-black text-slate-950">{selectedAchievement.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">{selectedAchievement.description}</p>
                <div className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  {isUnlocked ? <CheckSquare className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {isUnlocked ? '已解鎖' : '尚未解鎖'}
                </div>
              </aside>

              <section className="space-y-5">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3 text-sm font-black">
                    <span className="text-slate-700">當前進度</span>
                    <span className="text-indigo-700">{progress.current} / {progress.target} {progress.unit}</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-1000" style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }} />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 font-black text-slate-900">
                    <Clock className="h-5 w-5 text-indigo-600" /> 最近相關紀錄
                  </h3>
                  {relatedSessions.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {relatedSessions.map(session => (
                        <div key={session.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="font-black text-slate-800">{session.subjectName}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{new Date(session.timestamp).toLocaleString()}</div>
                          <div className="mt-3 inline-flex rounded-xl bg-indigo-50 px-3 py-1 text-sm font-black text-indigo-700">{session.durationMinutes} 分鐘</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                      尚無可對應到這個成就的讀書紀錄。
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative border border-white/50 animate-scale-in max-h-[90vh] flex flex-col">
          <button onClick={() => setSelectedAchievement(null)} className="absolute top-6 left-6 text-slate-400 hover:text-slate-700 transition-colors z-10 bg-slate-100 p-2 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors z-10 bg-slate-100 p-2 rounded-full">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-10">
            <div className="flex flex-col items-center text-center">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl mb-6 shadow-inner ${
                isUnlocked ? 'bg-indigo-50 shadow-indigo-200' : 'bg-slate-100 grayscale opacity-50'
              }`}>
                {isUnlocked ? selectedAchievement.icon : <Lock className="w-12 h-12 text-slate-400" />}
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-2">{selectedAchievement.title}</h3>
              <p className="text-slate-500 mb-6">{selectedAchievement.description}</p>
              
              {/* Status Badge */}
              <div className="mb-8">
                {isUnlocked ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold shadow-sm">
                    <CheckSquare className="w-4 h-4" /> 已解鎖
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-full text-sm font-bold shadow-sm">
                    <Lock className="w-4 h-4" /> 尚未解鎖
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
                <div className="flex justify-between text-sm font-bold mb-3">
                  <span className="text-slate-600">當前進度</span>
                  <span className="text-indigo-600">{progress.current} / {progress.target} {progress.unit}</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Related Records */}
              {relatedSessions.length > 0 && (
                <div className="w-full text-left">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" /> 最近相關紀錄
                  </h4>
                  <div className="space-y-2">
                    {relatedSessions.map(session => (
                      <div key={session.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{session.subjectName}</span>
                          <span className="text-xs text-slate-500">{new Date(session.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                          {session.durationMinutes} 分鐘
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'all', label: '全部', icon: Trophy },
    { id: 'time', label: '時間', icon: Star },
    { id: 'streak', label: '連續', icon: Flame },
    { id: 'subject', label: '科目', icon: BookOpen },
    { id: 'task', label: '任務', icon: CheckSquare },
    { id: 'special', label: '特殊', icon: Zap },
  ] as const;

  if (isPage) {
    return (
      <div className="animate-fade-in">
        <div className="relative flex min-h-[calc(100vh-11rem)] flex-col gap-6">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400"></div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-4">
                <button onClick={onClose} className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900" title="返回主頁">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-700">
                    <Trophy className="h-4 w-4" /> Honor Archive
                  </p>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">成就與紀錄</h2>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                    把解鎖勳章、讀書熱力圖與最近學習紀錄整理成一個個人榮譽頁，讓努力不只被保存，也能被回顧。
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 lg:min-w-[380px]">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 px-3 py-3 text-center">
                  <div className="text-xl font-black text-indigo-700">{unlockedCount}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-indigo-600/70">Unlocked</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 text-center">
                  <div className="text-xl font-black text-emerald-700">{Math.round(totalMinutes / 60)}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Hours</div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-3 py-3 text-center">
                  <div className="text-xl font-black text-amber-700">{activeDays}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-600/70">Days</div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Progress</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">{progressPercentage}%</div>
                  </div>
                  <Award className="h-8 w-8 text-indigo-500" />
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500" style={{ width: `${progressPercentage}%` }} />
                </div>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">已解鎖 {unlockedCount} / {totalCount} 個勳章。</p>
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-3 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                  <button onClick={() => setViewMode('achievements')} className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-black transition-all ${viewMode === 'achievements' ? 'bg-slate-950 text-white shadow-lg shadow-slate-300/50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <LayoutGrid className="h-4 w-4" /> 勳章牆
                  </button>
                  <button onClick={() => setViewMode('heatmap')} className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-black transition-all ${viewMode === 'heatmap' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/70' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                    <CalendarDays className="h-4 w-4" /> 讀書熱力圖
                  </button>
                </div>
              </div>

              <div className="hidden rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl lg:block">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> 最近解鎖
                </h3>
                <div className="space-y-2">
                  {recentUnlocked.length > 0 ? recentUnlocked.map(item => (
                    <button key={item.id} onClick={() => setSelectedAchievement(item)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-slate-800">{item.title}</span>
                        <span className="block truncate text-xs font-semibold text-slate-500">{item.description}</span>
                      </span>
                    </button>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">尚未解鎖成就</div>
                  )}
                </div>
              </div>
            </aside>

            <section className="min-w-0 rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-6">
              {viewMode === 'heatmap' ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">Study Heatmap</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">過去 365 天讀書熱力圖</h3>
                    <p className="mt-2 text-sm font-semibold text-slate-500">用每日顏色濃淡看出你的讀書節奏與穩定度。</p>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <Heatmap sessions={data.studySessions} />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">Achievement Wall</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-950">勳章牆</h3>
                      <p className="mt-2 text-sm font-semibold text-slate-500">依類型篩選成就，點擊可查看進度與相關紀錄。</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            <Icon className="h-4 w-4" /> {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {filteredAchievements.map(achievement => {
                      const isUnlocked = unlockedIds.has(achievement.id);
                      const progress = calculateProgress(achievement, data);
                      return (
                        <button key={achievement.id} onClick={() => setSelectedAchievement(achievement)} className={`relative min-h-[176px] rounded-2xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isUnlocked ? 'bg-white border-indigo-100 shadow-sm hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-75 grayscale hover:opacity-100 hover:grayscale-0'}`}>
                          {isUnlocked && <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />}
                          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-inner ${isUnlocked ? 'bg-indigo-50' : 'bg-slate-200'}`}>
                            {isUnlocked ? achievement.icon : <Lock className="h-6 w-6 text-slate-400" />}
                          </div>
                          <h4 className={`font-black ${isUnlocked ? 'text-slate-900' : 'text-slate-500'}`}>{achievement.title}</h4>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-500">{achievement.description}</p>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${isUnlocked ? 'bg-emerald-500' : 'bg-indigo-400'}`} style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl p-6 md:p-8 shadow-2xl relative border border-white/50 max-h-[90vh] flex flex-col animate-scale-in">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors z-10 bg-slate-100 p-2 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">成就與紀錄</h2>
              <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                已解鎖 {unlockedCount} / {totalCount} 個勳章
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                  {progressPercentage}%
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setViewMode('achievements')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'achievements' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-4 h-4" /> 勳章牆
            </button>
            <button 
              onClick={() => setViewMode('heatmap')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'heatmap' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CalendarDays className="w-4 h-4" /> 讀書熱力圖
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full mb-8 overflow-hidden shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {viewMode === 'heatmap' ? (
          /* Heatmap Section */
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-700">讀書熱力圖 (過去 365 天)</h3>
              </div>
              <Heatmap sessions={data.studySessions} />
            </div>
          </div>
        ) : (
          /* Achievements Section */
          <>
            {/* Tabs */}
            <div className="flex overflow-x-auto custom-scrollbar gap-2 mb-6 pb-2 shrink-0">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Achievements Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredAchievements.map(achievement => {
                  const isUnlocked = unlockedIds.has(achievement.id);
                  return (
                    <button 
                      key={achievement.id}
                      onClick={() => setSelectedAchievement(achievement)}
                      className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        isUnlocked 
                          ? 'bg-white border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-1' 
                          : 'bg-slate-50 border-slate-100 opacity-70 grayscale hover:grayscale-0 hover:opacity-100'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner ${
                        isUnlocked ? 'bg-indigo-50' : 'bg-slate-200'
                      }`}>
                        {isUnlocked ? achievement.icon : <Lock className="w-6 h-6 text-slate-400" />}
                      </div>
                      <h4 className={`font-bold text-sm mb-1 ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>
                        {achievement.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {achievement.description}
                      </p>
                      
                      {isUnlocked && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  沒有符合的成就
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AchievementsModal;
