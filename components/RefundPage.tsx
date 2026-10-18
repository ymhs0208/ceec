import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, ClipboardList, Copy, Mail, RefreshCw, Scale, ShieldCheck, Wallet } from 'lucide-react';
import PageLink from './PageLink';
import { type ActivePage } from '../utils/appRoutes';
import { refundSections, refundScenarios, refundTemplate, refundMailto, REFUND_CONTACT, REFUND_UPDATED } from '../data/refundPolicy';
import './RefundPage.css';
interface RefundPageProps { examId: string; onNavigate: (page: ActivePage) => void; }
const relatedPages = [{ page: 'support', label: '售後服務' }, { page: 'terms', label: '服務條款' }, { page: 'privacy', label: '隱私權政策' }] as const;
const RefundPage = ({ examId, onNavigate }: RefundPageProps) => {
  const [activeSection, setActiveSection] = useState('scope');
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id.replace('refund-', ''));
    }, { rootMargin: '-120px 0px -50% 0px', threshold: 0 });
    refundSections.forEach(section => { const node = document.getElementById(`refund-${section.id}`); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);
  const copyTemplate = async () => {
    try { await navigator.clipboard.writeText(refundTemplate); setCopyStatus('範本已複製，請貼到你的信件並填入資料。'); }
    catch { setCopyStatus('無法自動複製，請選取下方範本文字手動複製。'); }
  };
  return <main id="main-content" className="refund-page">
    <div className="refund-topbar"><PageLink page="home" examId={examId} onClick={() => onNavigate('home')} className="refund-back"><ArrowLeft size={15} />返回首頁</PageLink><span className="refund-version">最後更新 <time dateTime="2026-10-12">{REFUND_UPDATED}</time></span></div>
    <header className="refund-hero"><div><p className="refund-eyebrow"><RefreshCw size={14} />REFUNDS & CANCELLATIONS</p><h1>退款與取消政策<span>。</span></h1><p className="refund-hero-title">每一份支持，<br /><span>都有清楚的處理方式。</span></p><p className="refund-intro">付款狀態有疑問，或希望取消與申請退款？從交易確認到款項退回，了解適用情況、準備資料與後續流程。</p><div className="refund-hero-links"><a href="#refund-apply" onClick={() => setActiveSection('apply')}>如何提出申請<ArrowUpRight size={14} /></a><a href="#refund-eligibility" onClick={() => setActiveSection('eligibility')}>查看適用情況<ArrowUpRight size={14} /></a></div></div><div className="refund-hero-card"><span className="refund-shield"><Wallet size={35} strokeWidth={1.3} /></span><span className="refund-small-label">YOUR SUPPORT. YOUR RIGHTS.</span><h2>先確認，再安心處理。</h2><p>取消、退款與付款爭議<br />依實際交易與法律確認。</p><div><Check size={14} />不需要登入，也可以提出申請。</div></div></header>
    <section className="refund-summary" aria-label="退款政策重點摘要">{[{ icon: RefreshCw, title: '沒有自動續費', text: '目前為自願支持，未提供付費訂閱與金幣購買。' }, { icon: ClipboardList, title: '先核對交易', text: '畫面逾時不一定未扣款，請先確認再重新付款。' }, { icon: Mail, title: '透過信箱申請', text: '準備交易時間、金額及必要資訊，無須登入。' }, { icon: Scale, title: '保留法定權利', text: '資格與期限依法判斷，不一律排除或保證退款。' }].map(item => <div key={item.title}><span><item.icon size={20} strokeWidth={1.5} /></span><h2>{item.title}</h2><p>{item.text}</p></div>)}</section>
    <div className="refund-layout"><aside className="refund-sidebar"><nav className="refund-toc" aria-label="退款政策章節導覽"><div className="refund-toc-heading"><ClipboardList size={15} />政策導覽<small>10 CHAPTERS</small></div>{refundSections.map((section, index) => <a key={section.id} href={`#refund-${section.id}`} aria-current={activeSection === section.id ? 'location' : undefined} onClick={() => setActiveSection(section.id)}><span>{String(index + 1).padStart(2, '0')}</span>{section.label}<ChevronRight size={12} /></a>)}</nav><div className="refund-sidebar-contact"><strong>付款問題，不必獨自處理。</strong><p>請保留交易與寄件紀錄，<br />讓核對更順利。</p><a href={refundMailto}>開啟申請信件<ArrowUpRight size={12} /></a></div></aside>
    <article className="refund-document" aria-label="完整退款與取消政策"><div className="refund-document-heading"><h2>完整政策與申請指南</h2><span>以下全文為政策內容；摘要供快速閱讀。</span></div>{refundSections.map((section, index) => <section key={section.id} id={`refund-${section.id}`} className="refund-section" aria-labelledby={`refund-title-${section.id}`}><div className="refund-section-heading"><span className="refund-section-icon"><section.icon size={21} strokeWidth={1.5} /></span><div><p className="refund-small-label">SECTION {String(index + 1).padStart(2, '0')}</p><h3 id={`refund-title-${section.id}`}>{section.title}</h3></div></div>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}{section.note && <div className="refund-note"><ShieldCheck size={15} /><p>{section.note}</p></div>}
      {section.id === 'eligibility' && <div className="refund-scenarios">{refundScenarios.map(scenario => <div key={scenario.title}><h4>{scenario.title}</h4><p>{scenario.description}</p><span>{scenario.action}<ArrowUpRight size={12} /></span></div>)}</div>}
      {section.id === 'apply' && <div className="refund-template"><div className="refund-template-heading"><h4>申請信件範本</h4><button type="button" onClick={copyTemplate}><Copy size={13} />複製範本</button></div><label className="sr-only" htmlFor="refund-email-template">退款申請信件範本，可選取並複製</label><textarea id="refund-email-template" readOnly value={refundTemplate} rows={16} spellCheck={false} /><div className="refund-template-actions"><a href={refundMailto}><Mail size={14} />開啟申請信件<ArrowUpRight size={13} /></a><p>會開啟你的郵件程式，確認後再寄出。</p></div><p className="refund-copy-status" role="status" aria-live="polite">{copyStatus}</p></div>}
      {section.id === 'process' && <ol className="refund-steps" aria-label="退款處理步驟">{[{ title: '提出申請', text: '寄送交易資訊與請求。' }, { title: '核對與回覆', text: '確認狀態、資格與金額。' }, { title: '辦理與追蹤', text: '依法律及確認安排退回。' }].map((step, i) => <li key={step.title}><span>{String(i + 1).padStart(2, '0')}</span><div><h4>{step.title}</h4><p>{step.text}</p></div></li>)}</ol>}
      {section.id === 'disputes' && <div className="refund-rights-links"><a href="https://support.ecpay.com.tw/5024/" target="_blank" rel="noopener noreferrer">綠界退款與取消說明<ArrowUpRight size={13} /></a><PageLink page="support" examId={examId} onClick={() => onNavigate('support')}>售後服務<ArrowUpRight size={13} /></PageLink></div>}
      {section.id === 'security' && <div className="refund-rights-links"><PageLink page="privacy" examId={examId} onClick={() => onNavigate('privacy')}>個人資料保存與權利<ArrowUpRight size={13} /></PageLink></div>}
    </section>)}<section className="refund-contact-card" aria-labelledby="refund-contact-title"><span><Mail size={24} strokeWidth={1.5} /></span><div><p className="refund-small-label">WE’RE HERE TO HELP</p><h2 id="refund-contact-title">讓我們協助確認你的交易。</h2><p>可直接寄信，不必登入；請勿提供完整卡號或驗證碼。</p><a href={refundMailto}>{REFUND_CONTACT}<ArrowUpRight size={14} /></a><div className="refund-rights-links">{relatedPages.map(link => <PageLink key={link.page} page={link.page} examId={examId} onClick={() => onNavigate(link.page)}>{link.label}<ArrowUpRight size={13} /></PageLink>)}</div></div></section></article></div><footer className="refund-footer"><RefreshCw size={12} />FOCUS SPACE<span />REFUNDS & CANCELLATIONS</footer>
  </main>;
};
export default RefundPage;
