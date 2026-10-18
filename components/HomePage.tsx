import React from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, CheckCheck, GraduationCap, Medal, Sparkles, Trophy, UsersRound } from 'lucide-react';
import PageLink from './PageLink';
import type { ActivePage } from '../utils/appRoutes';
import './HomePage.css';

interface HomePageProps {
  isVisible?: boolean;
  examId: string;
  examName: string;
  userName?: string;
  targetSchool: string;
  targetMajor: string;
  onNavigate: (page: ActivePage) => void;
  pastUrl: string;
  pastTitle: string;
  scoreTitle: string;
  onScoreQuery: () => void;
  countdown: React.ReactNode;
  timer: React.ReactNode;
  stats: React.ReactNode;
  tasks: React.ReactNode;
  schedule: React.ReactNode;
  dates: React.ReactNode;
  promo: React.ReactNode;
}

const destinations = [
  { page: 'learning', icon: BookOpen, title: '學習歷程', note: '看見每一段累積', accent: 'violet' },
  { page: 'achievements', icon: Medal, title: '勳章殿堂', note: '收藏努力的證明', accent: 'amber' },
  { page: 'community', icon: UsersRound, title: '今日共讀', note: '和夥伴一起前進', accent: 'green' },
  { page: 'ranking', icon: Trophy, title: '巔峰英雄榜', note: '讓專注成為力量', accent: 'blue' },
] as const;

export default function HomePage(props: HomePageProps) {
  return (
    <main id={props.isVisible === false ? undefined : 'main-content'} hidden={props.isVisible === false} style={{ display: props.isVisible === false ? 'none' : undefined }} className="home-page">
      <section className="home-overview" aria-label="考試倒數">
        <h2 className="sr-only">距離考試還有多久</h2>
        <div className="home-countdown">
          <header className="home-intro">
            <div><p className="home-eyebrow">EXAM COUNTDOWN</p><h1>{props.examName}</h1></div>
          </header>
          {props.countdown}
          <div className="home-countdown-bottom"><span>以台灣時間計算</span><PageLink page="schedule" examId={props.examId} onClick={() => props.onNavigate('schedule')} className="home-countdown-link">考試日程 <ArrowUpRight size={14} /></PageLink></div>
        </div>
      </section>

      <section className="home-progress" aria-label="今日讀書進度"><h2 className="sr-only">今日讀書進度</h2>{props.stats}</section>

      <section id="home-focus" className="home-workspace" aria-labelledby="home-focus-title">
        <div className="home-study-column">
          <div className="home-section-heading"><div><p className="home-eyebrow">01 / STAY FOCUSED</p><h2 id="home-focus-title">現在，開始專注。</h2></div><span className="home-section-note">一次專注，一點進步</span></div>
          <div className="home-timer">{props.timer}</div>
        </div>
        <div className="home-plan-column">
          <div className="home-tasks">{props.tasks}</div>
          <p className="home-task-note"><CheckCheck size={15} /> 把大目標拆成小任務，完成一件也算前進。</p>
        </div>
      </section>

      <section className="home-explore" aria-labelledby="home-explore-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">02 / GROW TOGETHER</p><h2 id="home-explore-title">努力，有跡可循。</h2></div><PageLink page="temple" examId={props.examId} onClick={() => props.onNavigate('temple')} className="home-temple-link"><Sparkles size={15} /> 去文昌廟，為自己加油 <ArrowUpRight size={14} /></PageLink></div>
        <div className="home-destinations">
          {destinations.map(({ page, icon: Icon, title, note, accent }) => <PageLink key={page} page={page} examId={props.examId} onClick={() => props.onNavigate(page)} className={`home-destination home-destination--${accent}`}><span className="home-destination-icon"><Icon size={23} /></span><ArrowUpRight className="home-destination-arrow" size={18} /><h3>{title}</h3><p>{note}</p></PageLink>)}
        </div>
      </section>

      <section className="home-calendar" aria-labelledby="home-calendar-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">03 / PLAN AHEAD</p><h2 id="home-calendar-title">把重要的日子，放在心上。</h2></div><PageLink page="schedule" examId={props.examId} onClick={() => props.onNavigate('schedule')} className="home-text-link">完整參考日程 <ArrowRight size={16} /></PageLink></div>
        <div className="home-calendar-grid"><div className="home-exam-schedule">{props.schedule}</div><div className="home-important-dates">{props.dates}</div></div>
      </section>

      <section className="home-resources" aria-labelledby="home-resources-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">04 / YOUR TOOLKIT</p><h2 id="home-resources-title">備考路上，用得上的資源。</h2></div></div>
        <div className="home-resource-grid">
          <a href={props.pastUrl} target="_blank" rel="noopener noreferrer" className="home-resource"><span className="home-resource-icon"><BookOpen size={22} /></span><div><p>PRACTICE ARCHIVE</p><h3>{props.pastTitle}</h3><span>歷屆試題、答案與相關資源</span></div><ArrowUpRight size={20} /></a>
          <button type="button" onClick={props.onScoreQuery} className="home-resource"><span className="home-resource-icon home-resource-icon--amber"><GraduationCap size={22} /></span><div><p>SCORE SERVICE</p><h3>{props.scoreTitle}</h3><span>開放時間與成績查詢入口</span></div><ArrowUpRight size={20} /></button>
        </div>
        <div className="home-promo">{props.promo}</div>
      </section>

      <div className="home-closing"><CalendarDays size={16} /><span>把每一天的努力，累積成你想要的未來。</span><span>FOCUS SPACE</span></div>
    </main>
  );
}
