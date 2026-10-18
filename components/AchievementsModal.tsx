import ModalLayer from './ModalLayer';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Trophy, Lock, Star, Flame, BookOpen, CheckSquare, Zap, Target, LayoutGrid, CalendarDays, Clock, ChevronLeft, ChevronRight, ArrowLeft, Award, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { AppData, StudySession } from '../types';
import { ACHIEVEMENTS, Achievement, getLocalDateKey, getStudyTimeBySubject, matchesAchievementSubject, getStudyDayStreak, getCompletedTaskCount, getMaxDailySubjectCount } from '../utils/achievements';
import Heatmap from './Heatmap';
import './AchievementsPage.css';

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
    target *= 60;
    unit = '分鐘';
    if (desc.includes('累積讀書')) {
      current = data.studySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    } else if (desc.includes('單日讀書')) {
      const daily = data.studySessions.reduce((acc, s) => {
        const date = getLocalDateKey(s.timestamp);
        acc[date] = (acc[date] || 0) + s.durationMinutes;
        return acc;
      }, {} as Record<string, number>);
      current = Math.max(0, ...Object.values(daily));
    }
  } else if (achievement.category === 'streak') {
    current = getStudyDayStreak(data.studySessions).max;
  } else if (achievement.category === 'subject') {
    target *= 60;
    unit = '分鐘';
    const subjectMap: Record<string, string> = {
      '國文': 'chinese', '英文': 'english', '數學': 'math', '社會': 'social', '自然': 'natural'
    };
    const subjectName = Object.keys(subjectMap).find(k => desc.includes(k));
    if (subjectName) {
      const subjectId = subjectMap[subjectName];
      current = getStudyTimeBySubject(data.studySessions, subjectId);
    }
  } else if (achievement.category === 'task') {
    current = getCompletedTaskCount(data);
  } else if (achievement.category === 'special') {
    if (['sp10', 'sp11', 'sp12', 'sp13'].includes(achievement.id)) {
      target *= 60;
      unit = '分鐘';
      current = Math.max(0, ...data.studySessions.map(session => session.durationMinutes));
    } else if (achievement.id === 'sp14' || achievement.id === 'sp15') {
      target = Number(desc.match(/(\d+)\s*種/)?.[1] || 1);
      unit = '科';
      current = getMaxDailySubjectCount(data.studySessions);
    } else if (achievement.id === 'sp30') {
      target *= 60;
      unit = '分鐘';
      current = Math.min(...['chinese', 'english', 'math', 'social', 'natural'].map(subject => getStudyTimeBySubject(data.studySessions, subject)));
    } else if (desc.includes('半夜')) {
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
      sessions = sessions.filter(s => matchesAchievementSubject(s, subjectMap[subjectName]));
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
  const [collectionStatus, setCollectionStatus] = useState<'all' | 'unlocked' | 'locked'>('all');
  const medalRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const detailBackRef = useRef<HTMLButtonElement>(null);
  const nextMilestoneRef = useRef<HTMLButtonElement>(null);
  const closePageDetail = () => {
    const previous = selectedAchievement?.id;
    setSelectedAchievement(null);
    requestAnimationFrame(() => { (previous && medalRefs.current[previous] || nextMilestoneRef.current)?.focus(); });
  };

  const unlockedIds = useMemo(() => {
    // 永遠以原始學習資料重新驗證，不信任可被本機修改的已解鎖 ID 清單。
    return new Set(ACHIEVEMENTS.filter(achievement => achievement.condition(data)).map(achievement => achievement.id));
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
  const pageAchievements = filteredAchievements.filter(a => collectionStatus === 'all' || (collectionStatus === 'unlocked' ? unlockedIds.has(a.id) : !unlockedIds.has(a.id)));
  const nextAchievement = useMemo(() => {
    return ACHIEVEMENTS
      .filter(achievement => !unlockedIds.has(achievement.id))
      .map(achievement => ({ achievement, progress: calculateProgress(achievement, data) }))
      .sort((a, b) => (b.progress.current / b.progress.target) - (a.progress.current / a.progress.target))[0];
  }, [data, unlockedIds]);

  useEffect(() => {
    if (isPage && selectedAchievement) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      detailBackRef.current?.focus({ preventScroll: true });
    }
  }, [isPage, selectedAchievement]);

  if (!isOpen) return null;

  if (selectedAchievement) {
    const isUnlocked = unlockedIds.has(selectedAchievement.id);
    const progress = calculateProgress(selectedAchievement, data);
    const relatedSessions = getRelatedSessions(selectedAchievement, data);

    if (isPage) {
      return (
        <div className="medal-hall medal-detail">
          <button ref={detailBackRef} type="button" onClick={closePageDetail} className="medal-back"><ArrowLeft size={16} /> 返回勳章殿堂</button>
          <div className="medal-detail-layout">
            <section className={`medal-detail-showcase${isUnlocked ? ' medal-detail-showcase--unlocked' : ''}`}>
              <span className="medal-eyebrow">{MEDAL_STYLES[selectedAchievement.category].label}</span>
              <div className="medal-detail-badge"><AchievementMedal achievement={selectedAchievement} unlocked={isUnlocked} size="lg" /></div>
              <h1>{selectedAchievement.title}</h1><p>{selectedAchievement.description}</p>
              <span className={`medal-status${isUnlocked ? ' medal-status--unlocked' : ''}`}>{isUnlocked ? <CheckCircle2 size={13} /> : <Lock size={13} />}{isUnlocked ? '已解鎖' : '尚未解鎖'}</span>
            </section>
            <div className="medal-detail-info">
              <section className="medal-detail-panel"><span className="medal-eyebrow">每一步，都是累積</span><h2>解鎖進度</h2><div className="medal-detail-progress"><strong>{isUnlocked ? progress.target : progress.current}<span> / {progress.target} {progress.unit}</span></strong><span>{isUnlocked ? '已達成' : '持續累積中'}</span></div><progress className="medal-progress" value={isUnlocked ? progress.target : progress.current} max={progress.target} aria-label={`${selectedAchievement.title}解鎖進度`} /><p>{isUnlocked ? '目前的學習紀錄已達成這項里程碑，謝謝你持續投入的每一次專注。' : `再累積 ${Math.max(0, progress.target - progress.current)} ${progress.unit}，朝這枚勳章前進。`}</p></section>
              <section className="medal-detail-panel"><div className="medal-record-heading"><h2><Clock size={18} /> 對應專注紀錄</h2><span>最近 {relatedSessions.length} 筆</span></div>{relatedSessions.length ? <ul className="medal-records">{relatedSessions.map(session => <li key={session.id}><div><strong>{session.subjectName}</strong><p>{new Date(session.timestamp).toLocaleString('zh-TW')}</p></div><span>{session.durationMinutes} 分鐘</span></li>)}</ul> : <div className="medal-record-empty"><BookOpen size={25} /><p>尚無可對應到這個成就的讀書紀錄。</p></div>}</section>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ModalLayer className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
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
      </ModalLayer>
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
      <div className="medal-hall">
        <button type="button" onClick={onClose} className="medal-back"><ArrowLeft size={16} /> 回到首頁</button>
        <header className="medal-header">
          <div><span className="medal-eyebrow"><Trophy size={14} /> 每一份專注，都值得收藏</span><h1>勳章殿堂<span>。</span></h1><p>累積日常的小小進步，點亮屬於你的學習里程碑。</p></div>
          <div className="medal-collection"><div className="medal-ring" style={{ background: `conic-gradient(#c3a16a ${progressPercentage}%, #ede7dc 0)` }}><div><Award size={23} /><strong>{progressPercentage}%</strong></div></div><div><span>收藏進度</span><strong>{unlockedCount}<span> / {totalCount}</span></strong><p>枚勳章已解鎖</p></div></div>
        </header>
        <div className="medal-overview">
          <div className="medal-metrics"><div><span className="medal-metric-icon"><Trophy size={19} /></span><div><span>已解鎖勳章</span><strong>{unlockedCount}<small> 枚</small></strong></div></div><div><span className="medal-metric-icon"><Clock size={19} /></span><div><span>累積專注</span><strong>{Math.round(totalMinutes / 60)}<small> 小時</small></strong></div></div><div><span className="medal-metric-icon"><CalendarDays size={19} /></span><div><span>學習足跡</span><strong>{activeDays}<small> 天</small></strong></div></div></div>
          {nextAchievement ? <button ref={nextMilestoneRef} type="button" className="medal-next" onClick={() => setSelectedAchievement(nextAchievement.achievement)}><span className="medal-next-icon" aria-hidden="true">{nextAchievement.achievement.icon}</span><div><span>下一個里程碑</span><strong>{nextAchievement.achievement.title}</strong><p>{nextAchievement.progress.current} / {nextAchievement.progress.target} {nextAchievement.progress.unit}</p></div><ArrowUpRight size={20} /></button> : <div className="medal-complete"><Trophy size={26} /><div><strong>收藏已完整點亮</strong><p>每一次專注，都是值得記住的成就。</p></div></div>}
        </div>
        <div className="medal-view-switch" aria-label="紀錄檢視"><button type="button" aria-pressed={viewMode === 'achievements'} onClick={() => setViewMode('achievements')}><LayoutGrid size={15} /> 勳章牆</button><button type="button" aria-pressed={viewMode === 'heatmap'} onClick={() => setViewMode('heatmap')}><CalendarDays size={15} /> 讀書熱力圖</button></div>
        {viewMode === 'heatmap' ? <section className="medal-heatmap"><span className="medal-eyebrow">讓努力留下軌跡</span><h2>過去 365 天讀書熱力圖</h2><p>從每日顏色濃淡，看看你的學習節奏。</p><div className="medal-heatmap-scroll"><Heatmap sessions={data.studySessions} /></div></section> : <section className="medal-wall" aria-label="勳章牆">
          <div className="medal-wall-heading"><div><h2>我的勳章收藏</h2><p>點選勳章，查看解鎖條件與相關紀錄。</p></div><label className="medal-status-filter"><span>收藏狀態</span><select value={collectionStatus} onChange={e => setCollectionStatus(e.target.value as typeof collectionStatus)}><option value="all">全部狀態</option><option value="unlocked">已解鎖</option><option value="locked">未解鎖</option></select></label></div>
          <div className="medal-filter-row"><div className="medal-filters" aria-label="勳章分類">{tabs.map(tab => { const Icon = tab.icon; return <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}><Icon size={14} />{tab.label}</button>; })}</div><span className="medal-result-count" aria-live="polite">共 {pageAchievements.length} 枚</span></div>
          <div className="medal-grid">{pageAchievements.map(achievement => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const progress = calculateProgress(achievement, data);
            return <button key={achievement.id} ref={node => { medalRefs.current[achievement.id] = node; }} type="button" onClick={() => setSelectedAchievement(achievement)} className={`medal-card${isUnlocked ? ' medal-card--unlocked' : ''}`}>
              <div className="medal-card-meta"><span>{MEDAL_STYLES[achievement.category].label}</span><span className={`medal-status${isUnlocked ? ' medal-status--unlocked' : ''}`}>{isUnlocked ? <CheckCircle2 size={11} /> : <Lock size={11} />}{isUnlocked ? '已解鎖' : '未解鎖'}</span></div>
              <div className="medal-card-badge"><AchievementMedal achievement={achievement} unlocked={isUnlocked} /></div><h3>{achievement.title}</h3><p>{achievement.description}</p>
              <div className="medal-card-progress"><span>{isUnlocked ? '已達成' : '解鎖進度'}</span><span>{isUnlocked ? progress.target : progress.current} / {progress.target} {progress.unit}</span></div><progress className="medal-progress" value={isUnlocked ? progress.target : progress.current} max={progress.target} aria-label={`${achievement.title}解鎖進度`} />
            </button>;
          })}</div>
          {pageAchievements.length === 0 && <div className="medal-empty"><Award size={30} /><h3>目前沒有符合的勳章</h3><p>試試其他分類，或繼續累積你的第一枚勳章。</p><button type="button" onClick={() => { setActiveTab('all'); setCollectionStatus('all'); }}>查看全部勳章</button></div>}
        </section>}
      </div>
    );
  }

  return (
    <ModalLayer className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
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
    </ModalLayer>
  );
};

const MEDAL_STYLES: Record<Achievement['category'], { ribbon: string; ring: string; core: string; label: string }> = {
  time: { ribbon: 'from-sky-400 to-indigo-600', ring: 'from-sky-200 via-white to-indigo-200', core: 'from-sky-50 to-indigo-100', label: '時光徽章' },
  streak: { ribbon: 'from-orange-400 to-rose-600', ring: 'from-orange-200 via-white to-rose-200', core: 'from-orange-50 to-rose-100', label: '連續徽章' },
  subject: { ribbon: 'from-violet-400 to-fuchsia-600', ring: 'from-violet-200 via-white to-fuchsia-200', core: 'from-violet-50 to-fuchsia-100', label: '科目徽章' },
  task: { ribbon: 'from-emerald-400 to-teal-600', ring: 'from-emerald-200 via-white to-teal-200', core: 'from-emerald-50 to-teal-100', label: '任務徽章' },
  special: { ribbon: 'from-amber-400 to-pink-600', ring: 'from-amber-200 via-white to-pink-200', core: 'from-amber-50 to-pink-100', label: '限定徽章' },
};

const AchievementMedal: React.FC<{ achievement: Achievement; unlocked: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ achievement, unlocked, size = 'md' }) => {
  const style = MEDAL_STYLES[achievement.category];
  const dimensions = size === 'sm' ? 'h-14 w-14 text-2xl' : size === 'lg' ? 'h-28 w-28 text-5xl' : 'h-20 w-20 text-3xl';
  return (
    <div className={`relative mb-4 flex-shrink-0 ${dimensions}`} title={style.label}>
      <div className={`absolute left-[18%] top-0 h-9 w-[29%] rounded-b-md bg-gradient-to-b ${unlocked ? style.ribbon : 'from-slate-300 to-slate-400'} [clip-path:polygon(0_0,100%_0,84%_100%,0_72%)]`} />
      <div className={`absolute right-[18%] top-0 h-9 w-[29%] rounded-b-md bg-gradient-to-b ${unlocked ? style.ribbon : 'from-slate-300 to-slate-400'} [clip-path:polygon(0_0,100%_0,100%_72%,16%_100%)]`} />
      <div className={`absolute bottom-0 left-1/2 grid h-[76%] w-[76%] -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br p-1 shadow-md transition-transform duration-300 group-hover:scale-110 ${unlocked ? style.ring : 'from-slate-200 via-white to-slate-300 grayscale'}`}>
        <div className={`grid h-full w-full place-items-center rounded-full bg-gradient-to-br shadow-inner ${unlocked ? style.core : 'from-slate-100 to-slate-200'}`}>
          <span aria-hidden="true" className={unlocked ? "drop-shadow-sm" : "grayscale opacity-60"}>{achievement.icon}</span>
        </div>
      </div>
      {unlocked && <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-emerald-500 text-[9px] font-black text-white shadow-sm">✓</span>}
    </div>
  );
};

export default AchievementsModal;
