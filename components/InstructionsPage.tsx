import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Clock, Cloud, Mail, Settings, Sparkles, Target, type LucideIcon } from 'lucide-react';
import PageLink from './PageLink';
import { type ActivePage } from '../utils/appRoutes';
import './InstructionsPage.css';

interface InstructionsPageProps {
  examId: string;
  onNavigate: (page: ActivePage) => void;
  sections: readonly { title: string; body: string; icon: LucideIcon }[];
}

const chapterLabels = ['考試與目標', '讀書計時器', '任務與學習紀錄', '背景音樂', '登入與同步', '排行榜與隊伍', '重置與資料清理', '問題回報'];
const chapterTags = ['開始準備', '建立節奏', '追蹤進度', '專注氛圍', '跨裝置使用', '一起前進', '資料管理', '需要協助'];
const quickSteps = [
  { icon: Target, title: '設定你的目標', description: '選擇考試、倒數日期與目標學校。', chapter: 0 },
  { icon: Clock, title: '開始一段專注', description: '選好科目與模式，累積讀書時間。', chapter: 1 },
  { icon: Cloud, title: '保存每一份努力', description: '查看學習紀錄，登入後跨裝置同步。', chapter: 4 },
];
const timerModes = [
  { title: '倒數', detail: '番茄鐘・固定時段' },
  { title: '正數', detail: '自由累積時間' },
  { title: '模擬考', detail: '依科目時間倒數' },
  { title: '挑戰', detail: '結合待辦任務' },
];

const InstructionsPage = ({ examId, onNavigate, sections }: InstructionsPageProps) => {
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveChapter(Number(visible[0].target.getAttribute('data-chapter')));
    }, { rootMargin: '-120px 0px -45% 0px', threshold: 0 });
    sections.forEach((_, index) => {
      const element = document.getElementById(`guide-chapter-${index + 1}`);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <main id="main-content" className="guide-page">
      <div className="guide-topbar">
        <PageLink page="home" examId={examId} onClick={() => onNavigate('home')} className="guide-back"><ArrowLeft size={15} />返回首頁</PageLink>
        <span className="guide-version"><span />適用於目前版本</span>
      </div>

      <header className="guide-hero">
        <div className="guide-hero-copy">
          <p className="guide-eyebrow"><BookOpen size={14} />FOCUS SPACE GUIDE</p>
          <h1>使用說明<span>。</span></h1>
          <p className="guide-hero-title">讓每一天的努力，<br /><span>都有自己的節奏。</span></p>
          <p className="guide-intro">從設定目標到累積專注，把倒數、任務與學習紀錄放在同一個工作台。從這裡，開始熟悉你的 Focus Space。</p>
          <PageLink page="home" examId={examId} onClick={() => onNavigate('home')} className="guide-primary">開始我的學習 <ArrowUpRight size={16} /></PageLink>
        </div>
        <div className="guide-hero-art" aria-hidden="true">
          <div className="guide-orbit guide-orbit-outer" /><div className="guide-orbit guide-orbit-inner" />
          <span className="guide-art-spark"><Sparkles size={25} strokeWidth={1.3} /></span>
          <span className="guide-art-goal"><Target size={22} strokeWidth={1.5} /></span>
          <div className="guide-notebook">
            <div className="guide-notebook-heading"><span />MY FOCUS PLAN</div>
            <div className="guide-notebook-title">一步一步，靠近目標。</div>
            <div className="guide-notebook-line"><span><Check size={11} /></span>設定目標 <i /></div>
            <div className="guide-notebook-line"><span><Check size={11} /></span>開始專注 <i /></div>
            <div className="guide-notebook-line"><span /><span>記錄今天的進步</span></div>
            <div className="guide-notebook-footer"><Clock size={12} />A LITTLE PROGRESS, EVERY DAY.</div>
          </div>
          <span className="guide-art-caption">YOUR SPACE. YOUR PACE.</span>
        </div>
      </header>

      <section className="guide-quickstart" aria-labelledby="guide-start-title">
        <div className="guide-quickstart-heading"><span className="guide-small-label">GETTING STARTED</span><h2 id="guide-start-title">第一次使用？從這三步開始。</h2></div>
        <div className="guide-steps">
          {quickSteps.map((step, index) => <a key={step.title} href={`#guide-chapter-${step.chapter + 1}`} onClick={() => setActiveChapter(step.chapter)} className="guide-step"><span className="guide-step-number">0{index + 1}</span><span className="guide-step-icon"><step.icon size={20} strokeWidth={1.6} /></span><span className="guide-step-copy"><strong>{step.title}</strong><small>{step.description}</small></span><ArrowRight size={16} /></a>)}
        </div>
      </section>

      <div className="guide-layout">
        <aside className="guide-sidebar">
          <nav className="guide-toc" aria-label="使用說明章節目錄">
            <div className="guide-toc-heading"><BookOpen size={15} /><span>功能指南</span><small>08</small></div>
            {sections.map((section, index) => <a key={section.title} href={`#guide-chapter-${index + 1}`} onClick={() => setActiveChapter(index)} aria-current={activeChapter === index ? 'location' : undefined}><span className="guide-toc-number">0{index + 1}</span><span>{chapterLabels[index]}</span><ChevronRight size={13} /></a>)}
          </nav>
          <div className="guide-local-note"><Cloud size={20} strokeWidth={1.5} /><strong>不登入，也能開始。</strong><p>多數功能可直接使用，資料保存在目前瀏覽器。想跨裝置接續學習，再登入同步即可。</p></div>
        </aside>

        <article className="guide-chapters" aria-label="完整功能說明">
          <div className="guide-content-heading"><h2>認識你的學習工作台</h2><span>8 個主題，依需求閱讀</span></div>
          {sections.map((section, index) => {
            const Icon = section.icon;
            return <section key={section.title} id={`guide-chapter-${index + 1}`} data-chapter={index} className={`guide-chapter ${index === 1 ? 'guide-chapter-timer' : ''}`} aria-labelledby={`guide-title-${index + 1}`}>
              <div className="guide-chapter-heading"><span className="guide-chapter-icon"><Icon size={21} strokeWidth={1.6} /></span><div><span className="guide-small-label">{chapterTags[index]}<span className="guide-chapter-number"> / 0{index + 1}</span></span><h3 id={`guide-title-${index + 1}`}>{section.title.replace(/^\d+\.\s*/, '')}</h3></div><span className="guide-chapter-large-number" aria-hidden="true">0{index + 1}</span></div>
              <p className="guide-chapter-body">{section.body}</p>
              {index === 0 && <PageLink page="settings" examId={examId} onClick={() => onNavigate('settings')} className="guide-text-link"><Settings size={14} />前往設定目標<ArrowUpRight size={14} /></PageLink>}
              {index === 1 && <div className="guide-timer-modes">{timerModes.map(mode => <div key={mode.title}><span /><strong>{mode.title}</strong><small>{mode.detail}</small></div>)}</div>}
              {index === 4 && <div className="guide-sync-note"><Cloud size={16} /><span>本機儲存 → 登入帳號 → 雲端同步 → 跨裝置接續</span></div>}
              {index === 5 && <PageLink page="ranking" examId={examId} onClick={() => onNavigate('ranking')} className="guide-text-link">查看排行榜<ArrowUpRight size={14} /></PageLink>}
              {index === 6 && <div className="guide-data-note">重置前，先確認這些紀錄已不再需要。</div>}
              {index === 7 && <a href="mailto:tyctw.analyze@gmail.com" className="guide-text-link"><Mail size={14} />聯絡我們<ArrowUpRight size={14} /></a>}
            </section>;
          })}
          <section className="guide-bottom-cta" aria-labelledby="guide-ready-title"><span className="guide-cta-icon"><Sparkles size={24} strokeWidth={1.5} /></span><div><h2 id="guide-ready-title">準備好了，就從今天開始。</h2><p>一段專注、一個任務，都在讓你更靠近目標。</p></div><PageLink page="home" examId={examId} onClick={() => onNavigate('home')} className="guide-primary">回到學習工作台<ArrowRight size={15} /></PageLink></section>
        </article>
      </div>
      <footer className="guide-footer">FOCUS SPACE<span />YOUR SPACE. YOUR PACE.</footer>
    </main>
  );
};

export default InstructionsPage;
