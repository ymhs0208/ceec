import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, Clock3, Coffee, Flame, Loader2, RefreshCw, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { StudySession } from '../types';
import { authService } from '../services/authService';
import './TodayCommunityStudy.css';

interface TodayCommunityStudyProps {
  sessions: StudySession[];
  variant?: 'card' | 'page';
  onBack?: () => void;
  onStartFocus?: () => void;
}
interface CommunityStats {
  totalMinutes: number;
  activeUsers: number;
  sessionCount: number;
  averageMinutes: number;
  topSubject?: string;
}
const taipeiDay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
const formatNumber = (value: number) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(value);
const formatDuration = (value: number) => {
  const minutes = Math.round(value);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${formatNumber(hours)} 小時${rest ? ` ${rest} 分鐘` : ''}` : `${rest} 分鐘`;
};

export default function TodayCommunityStudy({ sessions, variant = 'card', onBack, onStartFocus }: TodayCommunityStudyProps) {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [day, setDay] = useState(taipeiDay);

  useEffect(() => {
    const updateDay = () => setDay(taipeiDay());
    const timer = window.setInterval(updateDay, 30_000);
    window.addEventListener('focus', updateDay);
    document.addEventListener('visibilitychange', updateDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', updateDay);
      document.removeEventListener('visibilitychange', updateDay);
    };
  }, []);

  const myToday = useMemo(() => {
    const start = new Date(`${day}T00:00:00+08:00`).getTime();
    const records = sessions.filter(session => session.timestamp >= start && session.timestamp < start + 86_400_000);
    return { minutes: records.reduce((sum, session) => sum + session.durationMinutes, 0), count: records.length };
  }, [sessions, day]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const loadStats = async () => {
      if (inFlight) return;
      inFlight = true;
      setLoading(true);
      try {
        const response = await authService.getTodayCommunityStats();
        if (cancelled) return;
        if (response.success && response.stats) {
          setStats(response.stats);
          setUnavailable(false);
          setLastUpdated(new Date());
        } else { setStats(null); setUnavailable(true); }
      } catch {
        if (!cancelled) { setStats(null); setUnavailable(true); }
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    };
    setStats(null);
    void loadStats();
    const timer = window.setInterval(() => { void loadStats(); }, 5 * 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [refreshRevision, day]);

  const cloudReady = stats !== null && !unavailable;
  const average = stats?.averageMinutes ?? 0;
  const total = stats?.totalMinutes ?? 0;
  const chartMax = Math.max(average, myToday.minutes, 1);
  const contribution = cloudReady && total > 0 ? Math.min(100, myToday.minutes / total * 100) : null;
  const contributionLabel = contribution !== null && contribution > 0 && contribution < 1 ? '不到 1%' : `${Math.round(contribution ?? 0)}%`;
  const comparisonNote = !cloudReady ? '先照著自己的節奏，累積今天的專注。'
    : average === 0 ? '今天的共讀剛開始，每一段專注都算數。'
    : myToday.minutes >= average ? `比今日平均多 ${formatDuration(myToday.minutes - average)}，繼續保持自己的節奏。`
    : '每個人的步調不同，下一段專注就從現在開始。';
  const dateLabel = new Date(`${day}T12:00:00+08:00`).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: 'long', day: 'numeric', weekday: 'long' });
  const refreshedAt = lastUpdated?.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false });
  const stateText = loading ? '正在更新共讀統計' : unavailable ? '統計暫時無法更新' : '每 5 分鐘更新';

  return (
    <div className={`community-page${variant === 'card' ? ' community-page--card' : ''}`}>
      {variant === 'page' && <button type="button" onClick={onBack} className="community-back"><ArrowLeft size={15} />回到首頁</button>}
      <header className="community-heading">
        <div><p className="community-eyebrow"><span /> FOCUS TOGETHER</p><h1>今日共讀站<span>。</span></h1><p className="community-intro">各自朝著目標，一起累積專注。</p></div>
        <div className="community-date"><CalendarDays size={16} /><time dateTime={day}>{dateLabel}</time><span>台北時間</span></div>
      </header>

      <section className="community-overview" aria-labelledby="community-total-title">
        <div className="community-total">
          <div className="community-total-top"><span><UsersRound size={15} />今天，我們一起累積了</span><span className="community-total-tag">全站共讀</span></div>
          <h2 id="community-total-title" className="sr-only">全站今日專注時間</h2>
          <div className="community-total-value" aria-busy={loading}>{cloudReady ? <><strong>{formatNumber(Math.floor(total / 60))}</strong><span>小時</span><strong>{formatNumber(Math.round(total % 60))}</strong><span>分鐘</span></> : <><strong>—</strong><span>{loading ? '讀取中' : '等待更新'}</span></>}</div>
          <div className="community-total-bottom"><p>{cloudReady ? stats.activeUsers > 0 ? `${formatNumber(stats.activeUsers)} 位夥伴，讓今天多了一點前進的力量。` : '今天的共讀剛開始，留下一段屬於你的專注。' : '你的每一段努力，都值得被記住。'}</p><BookOpen size={48} strokeWidth={1} aria-hidden="true" /></div>
        </div>
        <div className="community-metrics">
          <CommunityMetric icon={<UsersRound size={19} />} label="今日共讀夥伴" value={cloudReady ? formatNumber(stats.activeUsers) : '—'} unit={cloudReady ? '人' : ''} note="今天留下讀書紀錄的夥伴" />
          <CommunityMetric icon={<Clock3 size={19} />} label="平均每人專注" value={cloudReady ? formatNumber(average) : '—'} unit={cloudReady ? '分鐘' : ''} note="各自累積，也彼此陪伴" />
          <CommunityMetric icon={<BookOpen size={19} />} label="今日專注紀錄" value={cloudReady ? formatNumber(stats.sessionCount) : '—'} unit={cloudReady ? '筆' : ''} note="一段一段，把努力留下來" />
        </div>
      </section>

      <div className="community-update" role="status"><span className={`community-update-state${unavailable ? ' is-unavailable' : ''}`}>{loading ? <Loader2 size={13} className="animate-spin" /> : <span className="community-status-dot" />}{stateText}{!loading && cloudReady && refreshedAt && <span className="community-last-updated">· {refreshedAt} 更新</span>}</span><button type="button" onClick={() => setRefreshRevision(value => value + 1)} disabled={loading} aria-label={unavailable ? '重試共讀統計' : '重新整理共讀統計'}><RefreshCw size={13} />{unavailable ? '重試' : '重新整理'}</button></div>

      <section className="community-workspace" aria-label="我的專注與共讀概況">
        <article className="community-personal">
          <div className="community-panel-heading"><div><p className="community-eyebrow">YOUR OWN PACE</p><h2>你也在，努力的路上。</h2></div><span className="community-personal-icon"><Sparkles size={20} /></span></div>
          <div className="community-my-time"><span>我的今日專注</span><strong>{formatDuration(myToday.minutes)}</strong><p>完成 {myToday.count} 段專注{contribution !== null ? ` · 占今日共讀時數 ${contributionLabel}` : ''}</p></div>
          <p className="community-personal-note">{myToday.minutes > 0 ? '這些時間，都是你為未來留下的累積。' : '不用等到準備好，先給自己一段安靜的時間。'}</p>
          {(onStartFocus || onBack) && <button type="button" className="community-focus-action" onClick={onStartFocus || onBack}><span><Clock3 size={17} />{myToday.minutes > 0 ? '再留一段時間，給自己' : '開始今天的第一段專注'}</span><ArrowUpRight size={19} /></button>}
        </article>
        <article className="community-rhythm">
          <div className="community-panel-heading"><div><p className="community-eyebrow">TODAY'S RHYTHM</p><h2>一起讀，各自有節奏。</h2></div><span className="community-rhythm-icon"><Flame size={19} /></span></div>
          <p className="community-panel-description">看看今日平均，也找到適合自己的步調。</p>
          <div className="community-chart" aria-label="我的今日專注與全站平均比較">
            {[{ label: '我的今日', value: myToday.minutes, ready: true, tone: 'mine' }, { label: '共讀平均', value: average, ready: cloudReady, tone: 'average' }].map(bar => <div key={bar.tone} className={`community-chart-row community-chart-row--${bar.tone}`}><div><span><i />{bar.label}</span><strong>{bar.ready ? formatDuration(bar.value) : '等待統計'}</strong></div><div className="community-chart-track" role="img" aria-label={`${bar.label}：${bar.ready ? formatDuration(bar.value) : '等待統計'}`}><span style={{ width: `${bar.ready ? bar.value / chartMax * 100 : 0}%` }} /></div></div>)}
          </div>
          <p className="community-comparison-note">{comparisonNote}</p>
          <div className="community-subject"><span><BookOpen size={15} />今日熱門科目</span><strong>{cloudReady ? stats.topSubject || '等待第一筆紀錄' : '等待統計'}</strong></div>
        </article>
      </section>
      <footer className="community-footer"><span><ShieldCheck size={15} />只分享整體數字，保留每個人的讀書空間。</span><span><Coffee size={14} /> 每一段專注，都有人同行。</span></footer>
    </div>
  );
}

function CommunityMetric({ icon, label, value, unit, note }: { icon: React.ReactNode; label: string; value: string; unit?: string; note: string }) {
  return <div className="community-metric"><span className="community-metric-icon">{icon}</span><div><h3>{label}</h3><p><strong>{value}</strong>{unit && <span>{unit}</span>}</p><small>{note}</small></div></div>;
}
