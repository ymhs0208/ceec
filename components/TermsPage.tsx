import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Heart, ListChecks, Mail, Scale, ScrollText, ShieldCheck, Users } from 'lucide-react';
import PageLink from './PageLink';
import { type ActivePage } from '../utils/appRoutes';
import { termsSections, TERMS_CONTACT, TERMS_UPDATED } from '../data/termsOfService';
import './TermsPage.css';

interface TermsPageProps { examId: string; onNavigate: (page: ActivePage) => void; }
const relatedPages = [{ page: 'privacy', label: '隱私權政策' }, { page: 'support', label: '贊助說明' }, { page: 'refund', label: '退款政策' }] as const;
const TermsPage = ({ examId, onNavigate }: TermsPageProps) => {
  const [activeSection, setActiveSection] = useState('scope');
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id.replace('terms-', ''));
    }, { rootMargin: '-120px 0px -50% 0px', threshold: 0 });
    termsSections.forEach(section => { const node = document.getElementById(`terms-${section.id}`); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);
  return <main id="main-content" className="terms-page">
    <div className="terms-topbar"><PageLink page="home" examId={examId} onClick={() => onNavigate('home')} className="terms-back"><ArrowLeft size={15} />返回首頁</PageLink><span className="terms-version">最後更新 <time dateTime="2026-10-12">{TERMS_UPDATED}</time></span></div>
    <header className="terms-hero">
      <div><p className="terms-eyebrow"><ScrollText size={14} />TERMS & YOUR RIGHTS</p><h1>服務條款<span>。</span></h1><p className="terms-hero-title">讓專注有秩序，<br /><span>也讓權益更清楚。</span></p><p className="terms-intro">從建立帳號到保存學習紀錄，清楚了解服務規則、使用責任與你的權利。一起維護安心、公平的學習空間。</p><div className="terms-hero-links"><a href="#terms-scope" onClick={() => setActiveSection('scope')}>閱讀完整條款<ArrowUpRight size={14} /></a><PageLink page="privacy" examId={examId} onClick={() => onNavigate('privacy')}>隱私權政策<ArrowUpRight size={14} /></PageLink></div></div>
      <div className="terms-hero-card"><span className="terms-shield"><Scale size={35} strokeWidth={1.3} /></span><span className="terms-small-label">CLEAR RULES. FAIR SPACE.</span><h2>共同遵守，也彼此保障。</h2><p>把規則說清楚，把選擇留給你。<br />每一份努力，都值得被尊重。</p><div><Check size={14} />14 個章節，了解使用前的重要事項。</div></div>
    </header>
    <section className="terms-summary" aria-label="服務條款重點摘要">
      {[{ icon: ListChecks, title: '學習輔助', text: '主要功能免費使用；考試資訊請以官方公告為準。' }, { icon: Users, title: '公平使用', text: '公開排行顯示暱稱與隊伍，請勿偽造紀錄或灌分。' }, { icon: Heart, title: '自願支持', text: '贊助並非訂閱或購買金幣，付款前請確認交易條件。' }, { icon: ShieldCheck, title: '權益保留', text: '合理處理限制與申訴，不排除依法享有的保障。' }].map(item => <div key={item.title}><span><item.icon size={20} strokeWidth={1.5} /></span><h2>{item.title}</h2><p>{item.text}</p></div>)}
    </section>
    <div className="terms-layout">
      <aside className="terms-sidebar"><nav className="terms-toc" aria-label="服務條款章節導覽"><div className="terms-toc-heading"><ScrollText size={15} />條款導覽<small>14 CHAPTERS</small></div>{termsSections.map((section, index) => <a key={section.id} href={`#terms-${section.id}`} aria-current={activeSection === section.id ? 'location' : undefined} onClick={() => setActiveSection(section.id)}><span>{String(index + 1).padStart(2, '0')}</span>{section.label}<ChevronRight size={12} /></a>)}</nav><div className="terms-sidebar-contact"><strong>有疑問，先讓我們知道。</strong><p>服務、帳號或交易問題<br />都可以透過信箱聯絡。</p><a href={`mailto:${TERMS_CONTACT}`}>聯絡維運者<ArrowUpRight size={12} /></a></div></aside>
      <article className="terms-document" aria-label="完整服務條款"><div className="terms-document-heading"><h2>完整服務條款</h2><span>以下全文為條款內容；摘要供快速閱讀。</span></div>{termsSections.map((section, index) => <section key={section.id} id={`terms-${section.id}`} className="terms-section" aria-labelledby={`terms-title-${section.id}`}><div className="terms-section-heading"><span className="terms-section-icon"><section.icon size={21} strokeWidth={1.5} /></span><div><p className="terms-small-label">SECTION {String(index + 1).padStart(2, '0')}</p><h3 id={`terms-title-${section.id}`}>{section.title}</h3></div></div>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}{section.note && <div className="terms-note"><ShieldCheck size={15} /><p>{section.note}</p></div>}{section.id === 'payments' && <div className="terms-rights-links">{relatedPages.filter(link => link.page !== 'privacy').map(link => <PageLink key={link.page} page={link.page} examId={examId} onClick={() => onNavigate(link.page)}>{link.label}<ArrowUpRight size={13} /></PageLink>)}</div>}{section.id === 'leaving' && <div className="terms-rights-links"><PageLink page="account" examId={examId} onClick={() => onNavigate('account')}>前往帳號中心<ArrowUpRight size={13} /></PageLink><PageLink page="privacy" examId={examId} onClick={() => onNavigate('privacy')}>資料保存與權利<ArrowUpRight size={13} /></PageLink></div>}</section>)}
      <section className="terms-contact-card" aria-labelledby="terms-contact-title"><span><Mail size={24} strokeWidth={1.5} /></span><div><p className="terms-small-label">LET’S KEEP IT FAIR</p><h2 id="terms-contact-title">需要協助，或對條款有疑問？</h2><p>請提供問題與必要的帳號或交易資訊，讓我們協助處理。</p><a href={`mailto:${TERMS_CONTACT}`}>{TERMS_CONTACT}<ArrowUpRight size={14} /></a><div className="terms-rights-links">{relatedPages.map(link => <PageLink key={link.page} page={link.page} examId={examId} onClick={() => onNavigate(link.page)}>{link.label}<ArrowUpRight size={13} /></PageLink>)}</div></div></section>
      </article>
    </div><footer className="terms-footer"><Scale size={12} />FOCUS SPACE<span />TERMS & YOUR RIGHTS</footer>
  </main>;
};
export default TermsPage;
