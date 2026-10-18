import ModalLayer from './ModalLayer';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Trophy, Medal, Crown, Timer, AlertCircle, Loader2, Info, Swords, Target, Flame, Sparkles, Share2, TrendingUp, Award, Flag, MapPin, Search, ArrowLeft, ArrowUpRight, RefreshCw, Users, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';
import { RankingItem, User, ChallengeRecord, StudySession } from '../types';
import TeamSelectModal from './TeamSelectModal';
import './RankingPage.css';

interface RankingBoardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  challengeRecords: ChallengeRecord[];
  studySessions: StudySession[];
  team?: string;
  onJoinTeam?: (team: string) => void;
  variant?: 'modal' | 'page';
}

const SUBJECT_MAP: Record<string, string> = {
  math: '數學 A/B',
  english: '英文',
  social: '社會',
  natural: '自然',
  chinese1: '國綜',
  chinese2: '國寫',
  self_study: '自主複習'
};

// 恭喜動畫資料
const congratsAnimations = [
  {
    icon: <Crown className="w-24 h-24 text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" />,
    text: '無可撼動的第一名！金榜題名，指日可待！',
    animation: {
      initial: { scale: 0, opacity: 0, rotate: -180 },
      animate: { scale: [1, 1.2, 1], opacity: 1, rotate: [0, 10, -10, 0] },
      transition: { duration: 1.2, times: [0, 0.5, 1], ease: "easeInOut" }
    }
  },
  {
    icon: <Medal className="w-24 h-24 text-slate-300 drop-shadow-[0_0_30px_rgba(203,213,225,0.6)]" />,
    text: '榮獲亞軍！實力驚人，繼續加油，劍指第一！',
    animation: {
      initial: { y: 100, opacity: 0 },
      animate: { y: [0, -20, 0], opacity: 1 },
      transition: { duration: 0.9, times: [0, 0.6, 1], ease: "backOut" }
    }
  },
  {
    icon: <Medal className="w-24 h-24 text-orange-400 drop-shadow-[0_0_30px_rgba(251,146,60,0.6)]" />,
    text: '季軍達成！站上頒獎台，你是116統測的耀眼之星！',
    animation: {
      initial: { scale: 0.3, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { duration: 0.7, ease: "circOut" }
    }
  },
  {
    icon: <Swords className="w-24 h-24 text-indigo-400 drop-shadow-[0_0_30px_rgba(129,140,248,0.5)]" />,
    text: '第四名！距離前三僅一步之遙，戰鬥到最後一刻！',
    animation: {
      initial: { x: -100, opacity: 0, rotate: -45 },
      animate: { x: 0, opacity: 1, rotate: 0 },
      transition: { type: "spring", bounce: 0.5, duration: 0.8 }
    }
  },
  {
    icon: <Target className="w-24 h-24 text-fuchsia-400 drop-shadow-[0_0_30px_rgba(232,121,249,0.5)]" />,
    text: '第五名！穩定輸出，榜單常客，繼續保持這份專注！',
    animation: {
      initial: { x: 100, opacity: 0, rotate: 45 },
      animate: { x: 0, opacity: 1, rotate: 0 },
      transition: { type: "spring", bounce: 0.5, duration: 0.8 }
    }
  }
];

const teamCongratsAnimations = [
  {
    icon: <Crown className="w-24 h-24 text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" />,
    text: '最強戰隊誕生！全校師生的榮耀！',
    animation: {
      initial: { scale: 0, opacity: 0, rotate: -180 },
      animate: { scale: [1, 1.2, 1], opacity: 1, rotate: [0, 10, -10, 0] },
      transition: { duration: 1.2, times: [0, 0.5, 1], ease: "easeInOut" }
    }
  },
  {
    icon: <Medal className="w-24 h-24 text-slate-300 drop-shadow-[0_0_30px_rgba(203,213,225,0.6)]" />,
    text: '戰隊榮獲亞軍！凝聚力驚人，繼續加油！',
    animation: {
      initial: { y: 100, opacity: 0 },
      animate: { y: [0, -20, 0], opacity: 1 },
      transition: { duration: 0.9, times: [0, 0.6, 1], ease: "backOut" }
    }
  },
  {
    icon: <Medal className="w-24 h-24 text-orange-400 drop-shadow-[0_0_30px_rgba(251,146,60,0.6)]" />,
    text: '戰隊季軍達成！你們是學校的驕傲！',
    animation: {
      initial: { scale: 0.3, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { duration: 0.7, ease: "circOut" }
    }
  },
  {
    icon: <Flag className="w-24 h-24 text-indigo-400 drop-shadow-[0_0_30px_rgba(129,140,248,0.5)]" />,
    text: '戰隊第四名！火力全開，朝前三邁進！',
    animation: {
      initial: { x: -100, opacity: 0, rotate: -45 },
      animate: { x: 0, opacity: 1, rotate: 0 },
      transition: { type: "spring", bounce: 0.5, duration: 0.8 }
    }
  },
  {
    icon: <Target className="w-24 h-24 text-fuchsia-400 drop-shadow-[0_0_30px_rgba(232,121,249,0.5)]" />,
    text: '戰隊第五名！團結一致，成為榜單耀眼新星！',
    animation: {
      initial: { x: 100, opacity: 0, rotate: 45 },
      animate: { x: 0, opacity: 1, rotate: 0 },
      transition: { type: "spring", bounce: 0.5, duration: 0.8 }
    }
  }
];

// 動畫變數定義
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const RankingBoard: React.FC<RankingBoardProps> = ({ isOpen, onClose, currentUser, challengeRecords, studySessions, team, onJoinTeam, variant = 'modal' }) => {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [teamRankingBackend, setTeamRankingBackend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'global' | 'personal' | 'team'>('global');
  const [showInfo, setShowInfo] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const rankingRequestRef = useRef(0);
  
  const [showCongrats, setShowCongrats] = useState(false);
  const [currentCongrats, setCurrentCongrats] = useState<{icon: React.ReactNode, text: string, animation: any, title?: string} | null>(null);

  useEffect(() => {
    if (isOpen && (activeTab === 'global' || activeTab === 'team')) {
      fetchRanking();
    }
    return () => { rankingRequestRef.current += 1; };
  }, [isOpen, activeTab, team, currentUser?.email]);

  const fetchRanking = async () => {
    const request = ++rankingRequestRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await authService.getRanking(currentUser?.email, team);
      if (request !== rankingRequestRef.current) return;
      if (!data.success) {
        setError(data.message || '無法載入排行榜');
        return;
      }
      
      // Keep server ranks: the current user can be outside the leading 50.
      const globalSorted = [...(data.globalRanking || [])].sort((a, b) => {
        if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
        return (a.name || '').localeCompare(b.name || '');
      });
      setRanking(globalSorted);

      // Preserve authoritative ranks when our team is outside the first 30.
      const teamSorted = [...(data.teamRanking || [])].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return (a.name || '').localeCompare(b.name || '');
      });
      for (const item of teamSorted) {
        item.rank = Number(item.rank);
        item.trend = Number(item.trend || 0);
        item.isNew = Boolean(item.isNew);
      }
      setTeamRankingBackend(teamSorted);
      
      // 根據 activeTab 決定要顯示的慶祝動畫
      if (activeTab === 'team' && team) {
         const teamRankItem = teamSorted.find((item: any) => item.name === team);
         if (teamRankItem && teamRankItem.rank <= 5) {
            setCurrentCongrats({
              ...teamCongratsAnimations[teamRankItem.rank - 1],
              title: `${team} 榮耀時刻！`
            });
            setShowCongrats(true);
         }
      } else if (activeTab === 'global') {
         const userRankItem = globalSorted.find((item: any) => item.isCurrentUser);
         if (userRankItem && userRankItem.rank <= 5) {
            setCurrentCongrats({
               ...congratsAnimations[userRankItem.rank - 1],
               title: `王者誕生，${currentUser?.name || ''}！`
            });
            setShowCongrats(true);
         }
      }
    } catch (e) {
      if (request === rankingRequestRef.current) setError('無法載入排行榜');
    } finally {
      if (request === rankingRequestRef.current) setLoading(false);
    }
  };

  const personalStats = useMemo(() => {
    if (challengeRecords.length === 0) return null;
    const totalChallenges = challengeRecords.length;
    const bestScore = Math.max(...challengeRecords.map(r => r.tasksCompleted));
    const totalMinutes = Math.floor(challengeRecords.reduce((acc, r) => acc + r.duration, 0) / 60);
    return { totalChallenges, bestScore, totalMinutes };
  }, [challengeRecords]);

  const teamRanking = useMemo(() => {
    // The response may include our team beyond the leading 30. Re-ranking this
    // partial list would incorrectly turn e.g. rank 42 into rank 31.
    return teamRankingBackend.map(item => ({ ...item, isCurrentTeam: item.name === team }))
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  }, [team, teamRankingBackend]);

  if (!isOpen) return null;
  const isPage = variant === 'page';

  const formatTotalTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}分`;
    return `${hrs}小時 ${mins}分`;
  };

  const sortedPersonalRecords = [...challengeRecords].sort((a, b) => {
      if (b.tasksCompleted !== a.tasksCompleted) return b.tasksCompleted - a.tasksCompleted;
      return a.duration - b.duration;
  }).slice(0, 50);

  const currentUserRank = ranking.find(r => r.isCurrentUser);
  const visibleCount = activeTab === 'team' ? teamRanking.length : activeTab === 'personal' ? sortedPersonalRecords.length : ranking.length;
  const totalFocusMinutes = studySessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);
  const tabItems: { id: 'team' | 'global' | 'personal'; label: string; caption: string; metric: string; icon: React.ReactNode; activeClass: string; hoverClass: string }[] = [
    {
      id: 'team',
      label: '隊伍排行',
      caption: team ? `${team} 戰隊` : '加入學校戰隊',
      metric: `${teamRanking.length.toLocaleString()} 隊`,
      icon: <Flag className="h-4 w-4" />,
      activeClass: 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/70',
      hoverClass: 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700',
    },
    {
      id: 'global',
      label: '全站排行',
      caption: '全站讀書時數',
      metric: `${ranking.length.toLocaleString()} 人`,
      icon: <Crown className="h-4 w-4" />,
      activeClass: 'bg-amber-500 text-white shadow-lg shadow-amber-200/70',
      hoverClass: 'text-slate-500 hover:bg-amber-50 hover:text-amber-700',
    },
    {
      id: 'personal',
      label: '個人挑戰',
      caption: '本機挑戰紀錄',
      metric: `${sortedPersonalRecords.length.toLocaleString()} 筆`,
      icon: <Swords className="h-4 w-4" />,
      activeClass: 'bg-sky-600 text-white shadow-lg shadow-sky-200/70',
      hoverClass: 'text-slate-500 hover:bg-sky-50 hover:text-sky-700',
    },
  ];
  const activeTabItem = tabItems.find(tab => tab.id === activeTab) || tabItems[1];
  // 渲染前三名焦點榜單
  const renderPodium = () => {
    if (ranking.length === 0) return null;
    
    const podiumData = ranking.slice(0, 3).filter(Boolean);
    const leader = podiumData[0];
    const runnerUps = podiumData.slice(1);

    const rankStyles: Record<number, { badge: string; ring: string; icon: React.ReactNode; label: string }> = {
      1: {
        badge: 'bg-amber-500 text-white',
        ring: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: <Crown className="h-4 w-4" />,
        label: '第一名',
      },
      2: {
        badge: 'bg-slate-700 text-white',
        ring: 'border-slate-200 bg-slate-50 text-slate-700',
        icon: <Medal className="h-4 w-4" />,
        label: '第二名',
      },
      3: {
        badge: 'bg-orange-500 text-white',
        ring: 'border-orange-200 bg-orange-50 text-orange-700',
        icon: <Medal className="h-4 w-4" />,
        label: '第三名',
      },
    };

    const renderPersonLine = (user: any, index: number) => {
      const style = rankStyles[user.rank] || rankStyles[index + 1] || rankStyles[3];

      return (
        <motion.div
          key={`${user.rank}-${user.name}-${index}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + index * 0.08, type: 'spring', stiffness: 240, damping: 24 }}
          className="global-runner group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/70 sm:p-4"
        >
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black shadow-sm ${style.badge}`}>
            {user.rank}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-black text-slate-900 sm:text-base">{user.name}</span>
              {user.isCurrentUser && (
                <span className="rounded-md bg-sky-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">Yours</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 ${style.ring}`}>
                {style.icon}
                {style.label}
              </span>
              {user.team && (
                <span className="max-w-[150px] truncate rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                  {user.team}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end">
            <span className="text-base font-black leading-none text-slate-950 sm:text-lg">
              {Number(user.totalMinutes || 0).toLocaleString()}
            </span>
            <span className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Points</span>
          </div>
        </motion.div>
      );
    };

    return (
      <div className="global-podium mb-5 mt-3">
        <div className="global-podium-intro mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Top 3 Ranking</p>
            <h3 className="text-lg font-black text-slate-950">巔峰前三名</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">依同步專注分鐘排序，顯示目前最高讀書累積。</p>
          </div>
          <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm sm:block">
            {ranking.length.toLocaleString()} 位同學
          </div>
        </div>

        <div className="global-podium-stage grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {leader && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 24 }}
              className="global-leader relative overflow-hidden rounded-[1.75rem] border border-amber-200 bg-[linear-gradient(135deg,#fffdf4_0%,#ffffff_52%,#fff7df_100%)] p-5 shadow-xl shadow-amber-100/60"
            >
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-300 via-amber-500 to-orange-400" />
              <div className="global-leader-corner-icon pointer-events-none absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="global-leader-heading flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="global-leader-label mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                    <Crown className="h-4 w-4" />
                    目前第一名
                  </div>
                  <h4 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{leader.name}</h4>
                  <div className="global-leader-meta mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
                      <Timer className="h-3.5 w-3.5" />
                      {formatTotalTime(leader.totalMinutes)}
                    </span>
                    {leader.team && (
                      <span className="max-w-[180px] truncate rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-emerald-700">{leader.team}</span>
                    )}
                    {leader.isCurrentUser && (
                      <span className="rounded-lg bg-sky-600 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">Yours</span>
                    )}
                  </div>
                </div>
                <div className="global-leader-rank flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200 ring-4 ring-white" aria-label="目前第一名">
                  <Crown className="h-5 w-5" />
                  <span className="mt-0.5 text-xs font-black">#1</span>
                </div>
              </div>

              <div className="global-leader-stats mt-6 grid grid-cols-2 gap-3">
                <div className="global-leader-stat rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><Timer className="h-3.5 w-3.5" /> Focus Time</div>
                  <div className="mt-1 text-lg font-black text-slate-950">{formatTotalTime(leader.totalMinutes)}</div>
                </div>
                <div className="global-leader-stat rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><Medal className="h-3.5 w-3.5" /> Points</div>
                  <div className="mt-1 text-lg font-black text-slate-950">{Number(leader.totalMinutes || 0).toLocaleString()}</div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {runnerUps.map((user, index) => renderPersonLine(user, index + 1))}
          </div>
        </div>
      </div>
    );
  };

  const renderPage = () => {
    const remoteTab = activeTab !== 'personal';
    const unavailable = remoteTab && (loading || Boolean(error));
    const rows = activeTab === 'global' ? ranking : activeTab === 'team' ? teamRanking : sortedPersonalRecords;
    const myTeamRank = teamRanking.find(item => item.isCurrentTeam);
    const rankValue = activeTab === 'team' ? myTeamRank?.rank : currentUserRank?.rank;
    return <section className="heroes-page">
      <button type="button" onClick={onClose} className="heroes-back"><ArrowLeft size={16} /> 回到首頁</button>
      <header className="heroes-header"><div><span className="heroes-eyebrow"><Trophy size={14} /> 每一次專注，都是向上一步</span><h1>巔峰英雄榜<span>。</span></h1><p>與夥伴一起累積努力，也看見自己的每一次突破。</p></div><button type="button" className="heroes-rule-button" onClick={() => setShowInfo(true)}><Info size={15} /> 積分規則 <ArrowUpRight size={14} /></button></header>
      <div className="heroes-summary">
        <div><span className="heroes-summary-icon"><Users size={20} /></span><div><span>{activeTab === 'personal' ? '挑戰紀錄' : activeTab === 'team' ? '榜上隊伍' : '榜上同學'}</span><strong>{unavailable ? '—' : visibleCount.toLocaleString()}<small>{activeTab === 'personal' ? ' 筆' : activeTab === 'team' ? ' 隊' : ' 人'}</small></strong></div></div>
        <div><span className="heroes-summary-icon"><Award size={20} /></span><div><span>{activeTab === 'personal' ? '個人最高得分' : activeTab === 'team' ? '我的隊伍排名' : '我的全站排名'}</span><strong>{activeTab === 'personal' ? personalStats?.bestScore ?? '—' : unavailable || !rankValue ? '—' : `#${rankValue}`}</strong></div></div>
        <div><span className="heroes-summary-icon"><Timer size={20} /></span><div><span>我的累積專注</span><strong>{totalFocusMinutes.toLocaleString()}<small> 分鐘</small></strong></div></div>
      </div>
      <div className="heroes-layout"><div className="heroes-main">
        <div className="heroes-tabs" aria-label="排行榜分類">{tabItems.map(tab => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.icon}{tab.label}</button>)}</div>
        <div className="heroes-board-heading"><div><h2>{activeTabItem.label}</h2><p>{activeTab === 'global' ? '依已同步的專注分鐘排序，同分共享名次。' : activeTab === 'team' ? '一起為學校累積積分，看見團隊的力量。' : '依完成任務數排序，同分時用時較短者優先。'}</p></div>{remoteTab && <button type="button" onClick={fetchRanking} disabled={loading} className="heroes-refresh" aria-label="重新整理排行榜"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>}</div>
          {activeTab === 'team' && <section className="heroes-team-banner"><span className="heroes-team-icon"><Flag size={22} /></span><div><h3>{team || '找到一起努力的夥伴'}</h3><p>{team ? `我的貢獻：${(currentUserRank?.totalMinutes || 0).toLocaleString()} 積分` : '加入學校戰隊，將專注時數化為團隊積分。'}</p></div>{team ? confirmQuit ? <div className="heroes-team-confirm"><span>確定退出戰隊？</span><button type="button" onClick={() => { setConfirmQuit(false); onJoinTeam?.(''); }}>確定退出</button><button type="button" onClick={() => setConfirmQuit(false)}>取消</button></div> : <button type="button" onClick={() => setConfirmQuit(true)}>退出戰隊</button> : <button type="button" onClick={() => setIsTeamModalOpen(true)}>選擇學校 <ArrowUpRight size={14} /></button>}</section>}
        {remoteTab && loading ? <div className="heroes-state" role="status"><span className="heroes-state-icon"><Loader2 size={28} className="animate-spin" /></span><h3>正在整理榜單</h3><p>讀取已同步的專注紀錄，請稍候。</p></div> : remoteTab && error ? <div className="heroes-state heroes-state--error" role="alert"><span className="heroes-state-icon"><AlertCircle size={28} /></span><h3>暫時無法載入榜單</h3><p>{error}</p><button type="button" onClick={fetchRanking}><RefreshCw size={14} /> 重新連線</button></div> : <>

          {activeTab === 'global' && ranking.length > 0 && <section className="heroes-podium" aria-label="榜首焦點">{ranking.slice(0, 3).map((item, index) => <div key={`${item.name}-${index}`} className={`heroes-podium-card heroes-podium-card--${Math.min(item.rank, 3)}`}><span className="heroes-podium-rank">{item.rank === 1 ? <Crown size={17} /> : <Medal size={17} />} 第 {item.rank} 名</span><span className="heroes-avatar" aria-hidden="true">{Array.from(item.name || '?')[0]}</span><h3 title={item.name}>{item.name}</h3><p title={item.team || undefined}>{item.team || '專注同行者'}</p><strong>{Number(item.totalMinutes || 0).toLocaleString()}<small> 積分</small></strong><span className="heroes-podium-time">{formatTotalTime(item.totalMinutes)}</span>{item.isCurrentUser && <span className="heroes-you">我</span>}</div>)}</section>}
          {rows.length ? <div className="heroes-ranking-list"><div className="heroes-list-heading"><span>名次</span><span>{activeTab === 'global' ? '同學 / 隊伍' : activeTab === 'team' ? '隊伍 / 排名趨勢' : '挑戰 / 完成時間'}</span><span>{activeTab === 'personal' ? '完成任務' : '積分'}</span></div><ol>{(activeTab === 'global' ? ranking.slice(3) : rows).map((item: any, index) => {
            const isMine = activeTab === 'global' ? item.isCurrentUser : activeTab === 'team' ? item.isCurrentTeam : false;
            const name = activeTab === 'personal' ? SUBJECT_MAP[item.subjectId] || item.subjectId : item.name;
            const score = activeTab === 'global' ? item.totalMinutes : activeTab === 'team' ? item.points : item.tasksCompleted;
            return <li key={item.id || `${name}-${index}`} className={isMine ? 'heroes-row heroes-row--mine' : 'heroes-row'}><span className="heroes-row-rank">{activeTab === 'personal' ? index + 1 : item.rank}</span><div className="heroes-row-person"><strong>{name}{isMine && <span className="heroes-you">{activeTab === 'team' ? '我的隊伍' : '我'}</span>}</strong><p>{activeTab === 'global' ? item.team || formatTotalTime(item.totalMinutes) : activeTab === 'personal' ? `${Math.floor(item.duration / 60)} 分鐘 · ${new Date(item.timestamp).toLocaleDateString('zh-TW')}` : item.isNew ? '新上榜' : item.trend > 0 ? `較上週進步 ${item.trend} 名` : item.trend < 0 ? `較上週下降 ${Math.abs(item.trend)} 名` : '排名持平'}</p></div><span className="heroes-row-score">{Number(score || 0).toLocaleString()}<small>{activeTab === 'personal' ? ' 項' : ' 分'}</small></span></li>;
          })}</ol>{activeTab === 'global' && ranking.length <= 3 && <p className="heroes-list-note">目前所有上榜同學已顯示於榜首焦點。</p>}</div> : <div className="heroes-state"><span className="heroes-state-icon">{activeTab === 'personal' ? <Target size={29} /> : <Trophy size={29} />}</span><h3>{activeTab === 'personal' ? '第一個突破，從現在開始' : '榜單正等待新的努力'}</h3><p>{activeTab === 'personal' ? '完成挑戰後，你的任務紀錄就會出現在這裡。' : '持續累積專注，完成同步後即可查看排名。'}</p></div>}
        </>}
      </div><aside className="heroes-sidebar"><section className="heroes-profile"><span className="heroes-aside-label">我的專注旅程</span><div className="heroes-profile-avatar"><Trophy size={26} strokeWidth={1.5} /></div><h2>{currentUser?.name || '每一份努力，都值得被看見'}</h2><p>{currentUser ? team || '繼續累積，朝下一個里程碑前進。' : '登入並同步讀書紀錄，讓你的專注也成為榜上的一份力量。'}</p>{currentUser && <div className="heroes-profile-rank"><span>全站排名</span><strong>{loading || error || !currentUserRank ? '—' : `#${currentUserRank.rank}`}</strong></div>}</section><section className="heroes-notes"><h2><CheckCircle2 size={16} /> 排名小筆記</h2><p>全站與隊伍積分依雲端同步紀錄計算；個人挑戰使用目前裝置的挑戰紀錄。</p><button type="button" onClick={() => setShowInfo(true)}>了解積分方式 <ArrowUpRight size={14} /></button></section></aside></div>
      <footer className="heroes-footer"><Timer size={13} />{remoteTab && error ? '榜單讀取失敗，請稍後重試。' : remoteTab && loading ? '正在讀取雲端榜單。' : activeTab === 'personal' ? '個人挑戰依目前裝置的紀錄呈現。' : '依本次讀取的雲端資料呈現；可重新整理查看最新排名。'}</footer>
    </section>;
  };

  return (
    <>
      {/* 積分規則：使用瀏覽器最上層，不受頁面動畫與頁首層級限制。 */}
      <AnimatePresence>
        {showInfo && (
          <ModalLayer className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               role="dialog" aria-labelledby="ranking-rules-title" className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
             >
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100/80 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner pt-0.5">
                                <Award className="w-6 h-6" />
                            </div>
                            <h3 id="ranking-rules-title" className="text-xl font-black text-slate-800">積分計算規則</h3>
                        </div>
                        <button aria-label="關閉積分規則" onClick={() => setShowInfo(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition-colors">
                             <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="p-6 space-y-6 bg-white relative z-10 text-left">
                    {/* rule 1 */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Timer className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-base mb-1">⏱️ 計時模式積分</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                使用專注計時器，<strong>每專注 1 分鐘 = 1 分</strong>。儲存並成功同步後，完整分鐘會累計至全站與目前所屬隊伍；休息不計分。排行榜積分不會因祈福花費香火幣而減少。
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                      全站顯示前 50 位與目前使用者；隊伍顯示前 30 隊與目前隊伍。同分並列，後續名次跳號。隊伍以成員累計分鐘加總，並非人均；轉隊會連同過去累計分鐘歸入目前隊伍，學校身分為自行選擇。讀書時長目前由裝置回報，尚非完全防作弊的競賽榜單。
                    </div>

                    {/* rule 2 */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Target className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-base mb-1">🎯 挑戰模式積分</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                挑戰模式中，<strong>每完成一項任務即記錄 1 分</strong>，此任務分數僅作個人挑戰紀錄，不加到全站或隊伍積分；挑戰中完成並同步的專注分鐘，仍依一般計時規則計分。
                            </p>
                        </div>
                    </div>
                    
                    {/* rule 3 */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-base mb-1">📈 戰隊排名趨勢</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                趨勢比較目前名次與<strong>最近一個過去日期的排名快照</strong>；沒有快照時不顯示升降，並非固定比較 7 天前的積分。
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center relative z-10">
                    <button onClick={() => setShowInfo(false)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all text-sm">
                        我知道了，開始衝刺！
                    </button>
                </div>
             </motion.div>
          </ModalLayer>
        )}
      </AnimatePresence>

      {/* 全螢幕恭喜動畫 */}
      <AnimatePresence>
        {showCongrats && currentCongrats && (
          <ModalLayer priority={100}>
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setShowCongrats(false)}
          >
            <Sparkles className="absolute top-1/4 left-1/4 w-8 h-8 text-amber-300 animate-ping opacity-70" />
            <Sparkles className="absolute bottom-1/3 right-1/4 w-12 h-12 text-indigo-300 animate-pulse opacity-50" />
            
            <motion.div {...currentCongrats.animation} className="flex flex-col items-center gap-6 text-center z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full"></div>
                {currentCongrats.icon}
              </div>
              
              <motion.h3 
                className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-50 to-indigo-200 tracking-tight drop-shadow-2xl mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                {currentCongrats.title || `王者誕生，${currentUser?.name}！`}
              </motion.h3>
              
              <motion.p 
                className="text-lg sm:text-xl text-indigo-200/90 font-medium max-w-md leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
              >
                {currentCongrats.text}
              </motion.p>
              
              <motion.button 
                className="px-10 py-4 mt-8 bg-white text-indigo-900 rounded-2xl font-black text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                onClick={(e) => { e.stopPropagation(); setShowCongrats(false); }}
              >
                領取榮耀，查看榜單
              </motion.button>
            </motion.div>
          </motion.div>
          </ModalLayer>
        )}
      </AnimatePresence>

      {/* 排行榜主體 */}
      {isPage ? renderPage() : <ModalLayer className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/55 backdrop-blur-md animate-fade-in">
        <div className="bg-white rounded-[2rem] w-full max-w-[560px] shadow-[0_28px_70px_-24px_rgba(15,23,42,0.65)] relative border border-white/80 max-h-[92vh] flex flex-col overflow-hidden">
          
          {!isPage && (
          <div className="bg-gradient-to-br from-white via-amber-50 to-sky-50 p-4 sm:p-5 relative flex-shrink-0 border-b border-amber-100">
             <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400"></div>
             <div className="absolute bottom-0 left-0 right-0 h-px bg-white/80"></div>
             
             <div className="absolute top-3 right-3 flex gap-1.5 z-20">
                <button onClick={() => setShowInfo(!showInfo)} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200 hover:shadow-sm">
                  <Info className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-full transition-all border border-transparent hover:border-rose-100 hover:shadow-sm">
                  <X className="w-4 h-4" />
                </button>
             </div>
             
             <div className="relative z-10 flex items-center gap-3 pr-16">
                <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/60 border border-amber-100 flex-shrink-0">
                   <Trophy className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
                </div>
                <div className="text-left flex-1 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                   <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                      巔峰英雄榜
                   </h2>
                   <p className="text-slate-500 text-[10px] sm:text-xs font-black tracking-widest uppercase">大考・頂尖對決</p>
                </div>
             </div>

             {/* 規則說明改移至最外層 */}

             {/* 切換按鈕 */}
             <div className="flex p-1 bg-white/80 rounded-2xl mt-4 relative z-10 border border-amber-100 shadow-inner shadow-amber-100/60">
                <button 
                  onClick={() => setActiveTab('team')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'team' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 transform scale-100' : 'text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 scale-[0.98]'}`}
                >
                   <Flag className="w-3.5 h-3.5" /> 戰隊排行
                </button>
                <button 
                  onClick={() => setActiveTab('global')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'global' ? 'bg-amber-500 text-white shadow-md shadow-amber-200 transform scale-100' : 'text-slate-500 hover:text-slate-900 hover:bg-white scale-[0.98]'}`}
                >
                   <Crown className="w-3.5 h-3.5" /> 全球排行
                </button>
                <button 
                  onClick={() => setActiveTab('personal')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'personal' ? 'bg-sky-600 text-white shadow-md shadow-sky-200 transform scale-100' : 'text-slate-500 hover:text-slate-900 hover:bg-white scale-[0.98]'}`}
                >
                   <Swords className="w-3.5 h-3.5" /> 個人突破
                </button>
             </div>
          </div>
          )}
          <div className="flex-grow overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-5 bg-gradient-to-b from-white to-slate-50 relative">
             
             {activeTab === 'global' && (
                <div className="global-ranking-view">
                  {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-5">
                        <div className="relative">
                           <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-ping opacity-30"></div>
                           <Loader2 className="w-12 h-12 animate-spin text-indigo-500 relative z-10" />
                        </div>
                        <span className="text-sm font-bold tracking-widest uppercase">載入神人數據中...</span>
                    </div>
                  ) : error ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-2">
                           <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-600">{error}</span>
                        <button onClick={fetchRanking} className="px-6 py-2.5 mt-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transition-all">重新連線</button>
                    </div>
                  ) : ranking.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4 bg-gradient-to-br from-indigo-50/50 to-white border-2 border-indigo-100/50 rounded-[1.5rem] shadow-inner relative overflow-hidden mt-6">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                        <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-[1.5rem] flex items-center justify-center rotate-6 relative z-10">
                           <Timer className="w-10 h-10 text-indigo-300 drop-shadow-sm" />
                        </div>
                        <div className="text-center mt-2 relative z-10">
                           <h3 className="text-slate-800 font-black text-xl mb-2">榜單虛位以待</h3>
                           <p className="text-sm text-slate-500 font-bold leading-relaxed">開啟計時器，搶下歷史性的第一名！</p>
                        </div>
                    </div>
                  ) : (
                    <div className="pb-24"> {/* 留空間給 sticky footer */}
                      {/* 前三名頒獎台 */}
                      {renderPodium()}

                      {/* 4名以後的列表 */}
                      {ranking.length >= 3 && <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-5"></div>}
                      
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-3"
                      >
                        {ranking.slice(3).map((item, idx) => (
                          <motion.div 
                            key={`${item.rank}-${item.name}-${idx}`} 
                            variants={itemVariants}
                            className={`group flex flex-col gap-3 rounded-2xl border p-3.5 transition-all duration-300 sm:flex-row sm:items-center ${item.isCurrentUser ? 'bg-sky-50 border-sky-200 shadow-lg shadow-sky-100/70 ring-4 ring-sky-500/10' : 'bg-white border-slate-100 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-lg hover:shadow-amber-100/60'}`}
                          >
                              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex-shrink-0">
                                <span className="text-slate-500 font-black text-base">{item.rank}</span>
                              </div>
                              
                              <div className="w-full min-w-0 flex flex-grow flex-col justify-center">
                                <div className="flex items-center gap-2">
                                    <span className={`text-base sm:text-lg font-black truncate transition-colors ${item.isCurrentUser ? 'text-sky-700' : 'text-slate-800 group-hover:text-slate-950'}`}>
                                      {item.name}
                                    </span>
                                    {item.isCurrentUser && (
                                      <span className="text-[10px] bg-sky-600 text-white px-2 py-0.5 rounded-md font-bold shadow-sm tracking-widest uppercase">Yours</span>
                                    )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-bold mt-1.5 flex items-center gap-1.5 flex-wrap">
                                   <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                                     <Timer className="w-3 h-3" />
                                     {formatTotalTime(item.totalMinutes)}
                                   </div>
                                   {item.team && (
                                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 truncate max-w-[120px]">
                                         {item.team}
                                      </span>
                                   )}
                                </div>
                              </div>

                              <div className={`flex w-full flex-row items-center justify-between flex-shrink-0 px-3 py-2 rounded-2xl transition-colors border sm:w-auto sm:flex-col sm:items-end sm:justify-center ${item.isCurrentUser ? 'bg-white border-sky-100 shadow-sm' : 'bg-slate-50 border-slate-100 group-hover:bg-white group-hover:border-amber-100'}`}>
                                <span className={`text-lg font-black leading-none mb-1 ${item.isCurrentUser ? 'text-sky-700' : 'text-slate-900'}`}>
                                    {item.totalMinutes}
                                </span>
                                <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">
                                    Points
                                </span>
                              </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                  )}
                </div>
             )}

             {activeTab === 'team' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-5">
                       <div className="relative">
                          <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-ping opacity-30"></div>
                          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 relative z-10" />
                       </div>
                       <span className="text-sm font-bold tracking-widest uppercase">結算各校戰績中...</span>
                    </div>
                  ) : !team ? (
                     <div className="bg-gradient-to-br from-indigo-50/50 to-white border-2 border-indigo-100/50 rounded-[1.5rem] p-8 text-center shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                        <Flag className="w-14 h-14 text-indigo-400 mx-auto mb-4 relative z-10 drop-shadow-sm" />
                        <h3 className="text-xl font-black text-slate-800 mb-2 relative z-10">尚未加入任何戰隊</h3>
                        <p className="text-sm text-slate-500 mb-6 relative z-10 leading-relaxed max-w-xs mx-auto">加入學校戰隊，將你的學習時長轉化為積分，為校爭光！</p>
                        <div className="flex flex-col gap-3 relative z-10">
                           <button 
                              onClick={() => setIsTeamModalOpen(true)}
                              className="w-full bg-white border-2 border-slate-100 text-slate-700 py-4 px-5 rounded-[1rem] font-bold hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-100/50 transition-all flex items-center justify-between group active:scale-[0.98]"
                           >
                              <span className="text-slate-500 group-hover:text-indigo-600 transition-colors text-sm">選擇您就讀的學校...</span>
                              <Search className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                           </button>
                        </div>
                     </div>
                  ) : (
                     <div className="team-spotlight relative mb-6 overflow-hidden rounded-[1.75rem] border border-indigo-200 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,.78),transparent_22%),linear-gradient(135deg,#eef2ff_0%,#ffffff_52%,#f5f3ff_100%)] p-5 text-slate-900 shadow-xl shadow-indigo-100/60 sm:p-6">
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"></div>
                        <div className="pointer-events-none absolute right-7 top-3 h-24 w-24 rounded-full border-[12px] border-indigo-100/70"></div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                           <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-600 flex items-center justify-center rounded-[1rem] shadow-lg shadow-indigo-200 text-white flex-shrink-0">
                                 <Flag className="w-6 h-6 sm:w-7 sm:h-7" />
                              </div>
                              <div className="min-w-0 flex-1">
                                 <h3 className="font-black text-xl sm:text-2xl tracking-tight leading-tight mb-0.5 sm:mb-1 truncate">{team} <span className="text-indigo-200 text-[11px] sm:text-[13px] tracking-normal align-middle ml-1">戰隊</span></h3>
                                 <p className="text-[9px] sm:text-[11px] text-indigo-100/90 uppercase tracking-widest font-bold truncate">
                                    個人貢獻 <span className="text-yellow-300 text-xs sm:text-sm font-black mx-1 drop-shadow-sm">{currentUserRank?.totalMinutes || 0}</span> 積分
                                 </p>
                              </div>
                           </div>
                           
                           <div className="w-full h-px bg-indigo-100 sm:hidden"></div>
                           
                           {confirmQuit ? (
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 w-full sm:w-auto">
                                 <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest sm:block">退出戰隊？</span>
                                 <div className="flex gap-1.5">
                                     <button 
                                        onClick={() => {
                                           setConfirmQuit(false);
                                           if (onJoinTeam) onJoinTeam('');
                                        }}
                                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-black transition-all shadow-md active:scale-95"
                                     >
                                        確定
                                     </button>
                                     <button 
                                        onClick={() => setConfirmQuit(false)}
                                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all backdrop-blur-sm active:scale-95 border border-white/10"
                                     >
                                        取消
                                     </button>
                                 </div>
                              </div>
                           ) : (
                               <button 
                                  onClick={() => setConfirmQuit(true)}
                                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 rounded-[1rem] text-[11px] font-black tracking-widest uppercase transition-all border border-indigo-100 hover:shadow-lg active:scale-95 flex-shrink-0 text-center"
                               >
                                  更換/退出戰隊
                               </button>
                           )}
                        </div>
                     </div>
                  )}

                  {!loading && teamRanking.length > 0 && (
                     <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-3"
                     >
                        {teamRanking.map((item) => (
                           <motion.div 
                              key={item.name} 
                              variants={itemVariants}
                              className={`group flex flex-col gap-3 rounded-[1.25rem] border-2 p-4 transition-all duration-300 sm:flex-row sm:items-center sm:gap-4 ${item.isCurrentTeam ? 'bg-[linear-gradient(135deg,#eef2ff,#ffffff)] border-indigo-200 shadow-lg shadow-indigo-100/50 ring-4 ring-indigo-500/10' : 'bg-white border-slate-100 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/30 hover:shadow-lg hover:shadow-violet-100/50'}`}
                           >
                              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex-shrink-0">
                                 {item.rank === 1 ? <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" /> :
                                  item.rank === 2 ? <Medal className="w-7 h-7 text-slate-300 drop-shadow-sm" /> :
                                  item.rank === 3 ? <Medal className="w-7 h-7 text-orange-400 drop-shadow-sm" /> :
                                  <span className="text-slate-500 font-black text-base">{item.rank}</span>}
                              </div>
                              
                              <div className="w-full min-w-0 flex flex-grow flex-col justify-center">
                                 <div className="flex items-center gap-2">
                                    <span className={`text-base sm:text-lg font-black truncate transition-colors ${item.isCurrentTeam ? 'text-indigo-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
                                       {item.name}
                                    </span>
                                    {item.isCurrentTeam && (
                                       <span className="text-[10px] bg-sky-600 text-white px-2 py-0.5 rounded-md font-bold shadow-sm tracking-widest uppercase">Yours</span>
                                    )}
                                 </div>
                                 <div className="flex items-center gap-1.5 mt-1.5">
                                    {item.isNew ? (
                                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 tracking-widest uppercase shadow-sm">✨ 新上榜</span>
                                    ) : item.trend > 0 ? (
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 lowercase shadow-sm">
                                            <TrendingUp className="w-3 h-3" /> +{item.trend}
                                        </span>
                                    ) : item.trend < 0 ? (
                                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1 lowercase shadow-sm">
                                           <TrendingUp className="w-3 h-3 rotate-180" /> -{Math.abs(item.trend)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                                            <span className="w-2 h-0.5 bg-slate-300 rounded-full"></span> 排名持平
                                        </span>
                                    )}
                                 </div>
                              </div>

                              <div className={`flex w-full flex-row items-center justify-between flex-shrink-0 px-4 py-2.5 rounded-[1rem] transition-colors border sm:w-auto sm:flex-col sm:items-end sm:justify-center ${item.isCurrentTeam ? 'bg-white/80 border-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100 group-hover:bg-white group-hover:border-slate-200'}`}>
                                 <span className={`text-[1.25rem] font-black leading-none mb-1 ${item.isCurrentTeam ? 'text-indigo-700' : 'text-slate-800'}`}>
                                    {item.points.toLocaleString()}
                                 </span>
                                 <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">
                                    Points
                                 </span>
                              </div>
                           </motion.div>
                        ))}
                     </motion.div>
                  )}
                </div>
             )}

             {activeTab === 'personal' && (
                <>
                   {sortedPersonalRecords.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4 bg-gradient-to-br from-orange-50/50 to-white border-2 border-orange-100/50 rounded-[1.5rem] shadow-inner relative overflow-hidden mt-6">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                          <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-[1.5rem] flex items-center justify-center -rotate-6 relative z-10">
                             <Target className="w-10 h-10 text-orange-300 drop-shadow-sm" />
                          </div>
                          <div className="text-center mt-2 relative z-10">
                             <h3 className="text-slate-800 font-black text-xl mb-2">尚未建立挑戰</h3>
                             <p className="text-sm text-slate-500 font-bold leading-relaxed max-w-[200px] mx-auto">
                                進入挑戰模式，打破自己的極限紀錄！
                             </p>
                          </div>
                      </div>
                   ) : (
                      <div className="space-y-6">
                         {/* Personal Stats Summary */}
                         {personalStats && (
                            <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-3">
                               <div className="bg-white p-4 rounded-[1.25rem] border-2 border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                                  <Award className="w-6 h-6 text-orange-500 mb-2 drop-shadow-sm" />
                                  <span className="text-2xl font-black text-slate-800">{personalStats.bestScore}</span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">最高得分</span>
                               </div>
                               <div className="bg-white p-4 rounded-[1.25rem] border-2 border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                                  <TrendingUp className="w-6 h-6 text-indigo-500 mb-2 drop-shadow-sm" />
                                  <span className="text-2xl font-black text-slate-800">{personalStats.totalChallenges}</span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">挑戰次數</span>
                               </div>
                               <div className="bg-white p-4 rounded-[1.25rem] border-2 border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                                  <Timer className="w-6 h-6 text-emerald-500 mb-2 drop-shadow-sm" />
                                  <span className="text-2xl font-black text-slate-800">{personalStats.totalMinutes}</span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">累積分鐘</span>
                               </div>
                            </div>
                         )}

                         <motion.div 
                           variants={containerVariants}
                           initial="hidden"
                           animate="show"
                           className="space-y-3"
                         >
                            {sortedPersonalRecords.map((record, index) => (
                               <motion.div 
                                  key={record.id || index}
                                  variants={itemVariants}
                                  className="flex flex-col gap-3 p-4 rounded-[1.25rem] border-2 bg-white border-slate-100 hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-200 transition-all duration-300 group relative overflow-hidden sm:flex-row sm:items-center sm:gap-4"
                               >
                                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-orange-400 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                  <div className="w-12 h-12 rounded-[1rem] bg-orange-50 text-orange-600 flex items-center justify-center font-black text-base border border-orange-100/50 flex-shrink-0 group-hover:bg-orange-100/50 transition-colors">
                                     #{index + 1}
                                  </div>

                                  <div className="w-full flex-grow min-w-0 pl-1">
                                     <div className="text-base sm:text-lg font-black text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                                        {SUBJECT_MAP[record.subjectId] || record.subjectId}
                                     </div>
                                     <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1.5 font-bold">
                                        <span className="flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md"><Timer className="w-3 h-3"/> {Math.floor(record.duration / 60)} 分</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>{new Date(record.timestamp).toLocaleDateString()}</span>
                                     </div>
                                  </div>

                                  <div className="flex w-full flex-row items-center justify-between bg-orange-50/50 px-4 py-2.5 rounded-[1rem] group-hover:bg-orange-100/50 transition-colors border border-orange-50 group-hover:border-orange-200/50 sm:w-auto sm:flex-col sm:items-end">
                                     <span className="text-[1.25rem] font-black text-orange-600 leading-none">
                                        {record.tasksCompleted}
                                     </span>
                                     <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest mt-1.5">Tasks</span>
                                  </div>
                               </motion.div>
                            ))}
                         </motion.div>
                      </div>
                   )}
                </>
             )}
          </div>
          </div>

          {/* Sticky Footer for Current User Rank in Global Tab */}
          {!isPage && activeTab === 'global' && currentUserRank && currentUserRank.rank > 3 && (
            <div className="absolute bottom-14 left-0 right-0 px-4 sm:px-6 py-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none z-20">
               <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-xl shadow-slate-400/30 flex items-center justify-between pointer-events-auto border border-slate-800">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black text-lg backdrop-blur-sm">
                        {currentUserRank.rank}
                     </div>
                     <div>
                        <div className="font-bold text-sm">你的目前排名</div>
                        <div className="text-indigo-200 text-xs mt-0.5">{formatTotalTime(currentUserRank.totalMinutes)} ({currentUserRank.totalMinutes} pt)</div>
                     </div>
                  </div>
                  <button 
                     onClick={() => {
                        if (navigator.share) {
                           navigator.share({
                              title: 'Focus Space 116 排行榜',
                              text: `我在 Focus Space 116 排行榜目前排名第 ${currentUserRank.rank} 名，累積專注 ${currentUserRank.totalMinutes} 分鐘！一起來挑戰吧！`,
                              url: window.location.href
                           }).catch(console.error);
                        } else {
                           alert('您的瀏覽器不支援分享功能');
                        }
                     }}
                     className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                     title="分享成績"
                  >
                     <Share2 className="w-5 h-5" />
                  </button>
               </div>
            </div>
          )}

          <div className="px-6 py-4 bg-white border-t border-slate-100 text-center flex-shrink-0 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] relative">
             <p className="text-xs text-slate-500 font-bold flex items-center justify-center gap-2 tracking-wide">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                數據即時同步中，展現你的最佳狀態！
             </p>
          </div>
        </div>
      </ModalLayer>
      }
      <TeamSelectModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSelectTeam={(selected) => {
          if (onJoinTeam) onJoinTeam(selected);
        }}
      />
    </>
  );
};

export default RankingBoard;
