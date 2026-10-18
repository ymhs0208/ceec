import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, ClipboardList, Copy, HeartHandshake, Mail, ShieldCheck } from 'lucide-react';
import PageLink from './PageLink';
import { type ActivePage } from '../utils/appRoutes';
import { supportSections, supportTopics, supportFaqs, buildSupportTemplate, buildSupportMailto, SUPPORT_CONTACT, SUPPORT_UPDATED, type SupportTopicId } from '../data/customerSupport';
import './CustomerSupportPage.css';
interface Props { examId: string; onNavigate: (page: ActivePage) => void; }
const relatedPages = [{ page: 'instructions', label: '使用說明' }, { page: 'refund', label: '退款與取消政策' }, { page: 'terms', label: '服務條款' }, { page: 'privacy', label: '隱私權政策' }] as const;
const CustomerSupportPage = ({ examId, onNavigate }: Props) => {
  const [activeSection, setActiveSection] = useState('scope');
  const [topicId, setTopicId] = useState<SupportTopicId>('payment');
  const [copyStatus, setCopyStatus] = useState('');
  const template = buildSupportTemplate(topicId);
  const mailto = buildSupportMailto(topicId);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id.replace('service-', ''));
    }, { rootMargin: '-120px 0px -50% 0px', threshold: 0 });
    supportSections.forEach(section => { const node = document.getElementById(`service-${section.id}`); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);
  const selectTopic = (id: SupportTopicId) => { setTopicId(id); setCopyStatus(''); setActiveSection('contact'); };
  const copyTemplate = async () => {
    try { await navigator.clipboard.writeText(template); setCopyStatus('範本已複製，請貼到你的信件並填入資料。'); }
    catch { setCopyStatus('無法自動複製，請選取下方範本文字手動複製。'); }
  };
  return <main id="main-content" className="service-page">
    <div className="service-topbar"><PageLink page="home" examId={examId} onClick={() => onNavigate('home')} className="service-back"><ArrowLeft size={15} />返回首頁</PageLink><span className="service-version">最後更新 <time dateTime="2026-10-12">{SUPPORT_UPDATED}</time></span></div>
    <header className="service-hero"><div><p className="service-eyebrow"><HeartHandshake size={14} />SUPPORT & CARE</p><h1>售後服務<span>。</span></h1><p className="service-hero-title">你的問題，<br /><span>我們一起釐清。</span></p><p className="service-intro">從贊助付款到日常學習，找到合適的協助方式。準備必要資訊，讓每一次聯絡都更清楚、更安心。</p><div className="service-hero-links"><a href="#service-contact" onClick={() => setActiveSection('contact')}>準備回報信件<ArrowUpRight size={14} /></a><a href="#service-faq">先看常見問題<ArrowUpRight size={14} /></a></div></div><div className="service-hero-card"><span className="service-shield"><HeartHandshake size={35} strokeWidth={1.3} /></span><span className="service-small-label">HERE TO HELP YOU FOCUS.</span><h2>讓卡住的地方，繼續前進。</h2><p>付款、登入、同步與功能問題<br />都可以先從這裡開始。</p><div><Check size={14} />不需要贊助或登入，也能聯絡。</div></div></header>
    <section className="service-topics" aria-labelledby="service-topics-title"><div className="service-topics-heading"><h2 id="service-topics-title">今天，需要哪一種協助？</h2><span>選擇類型，查看對應回報範本。</span></div><div>{supportTopics.map((topic, index) => <a key={topic.id} href="#service-contact" onClick={() => selectTopic(topic.id)}><span className="service-topic-number">0{index + 1}</span><h3>{topic.label}<ArrowUpRight size={15} /></h3><p>{topic.description}</p><span className="service-topic-action">準備回報資訊<ChevronRight size={12} /></span></a>)}</div></section>
    <div className="service-layout"><aside className="service-sidebar"><nav className="service-toc" aria-label="售後服務章節導覽"><div className="service-toc-heading"><ClipboardList size={15} />協助指南<small>08 CHAPTERS</small></div>{supportSections.map((section, index) => <a key={section.id} href={`#service-${section.id}`} aria-current={activeSection === section.id ? 'location' : undefined} onClick={() => setActiveSection(section.id)}><span>{String(index + 1).padStart(2, '0')}</span>{section.label}<ChevronRight size={12} /></a>)}</nav><div className="service-sidebar-contact"><strong>一封信，讓問題更清楚。</strong><p>保存必要紀錄，<br />並遮蔽敏感資訊。</p><a href={`mailto:${SUPPORT_CONTACT}`}>聯絡維運者<ArrowUpRight size={12} /></a></div></aside>
    <article className="service-document" aria-label="售後服務完整說明"><div className="service-document-heading"><h2>服務協助與聯絡指南</h2><span>清楚了解回報方式與後續流程。</span></div>{supportSections.map((section, index) => <section key={section.id} id={`service-${section.id}`} className="service-section" aria-labelledby={`service-title-${section.id}`}><div className="service-section-heading"><span className="service-section-icon"><section.icon size={21} strokeWidth={1.5} /></span><div><p className="service-small-label">SECTION {String(index + 1).padStart(2, '0')}</p><h3 id={`service-title-${section.id}`}>{section.title}</h3></div></div>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}{section.note && <div className="service-note"><ShieldCheck size={15} /><p>{section.note}</p></div>}
    {section.id === 'contact' && <div className="service-template"><div className="service-template-heading"><h4>問題回報範本</h4><button type="button" onClick={copyTemplate}><Copy size={13} />複製範本</button></div><div className="service-topic-select"><label htmlFor="service-topic">問題類型</label><select id="service-topic" value={topicId} onChange={event => selectTopic(event.target.value as SupportTopicId)}>{supportTopics.map(topic => <option key={topic.id} value={topic.id}>{topic.label}</option>)}</select></div><label className="sr-only" htmlFor="service-email-template">問題回報信件範本，可選取並複製</label><textarea id="service-email-template" readOnly value={template} rows={17} spellCheck={false} /><div className="service-template-actions"><a href={mailto}><Mail size={14} />開啟回報信件<ArrowUpRight size={13} /></a><p>請填寫後自行寄出，此處不會自動送出。</p></div><p className="service-copy-status" role="status" aria-live="polite">{copyStatus}</p></div>}
    {section.id === 'process' && <ol className="service-steps" aria-label="問題處理步驟">{[{ title: '寄送問題', text: '說明事件與必要資訊。' }, { title: '確認情況', text: '核對資料與影響範圍。' }, { title: '回覆與追蹤', text: '說明結果或後續步驟。' }].map((step, i) => <li key={step.title}><span>0{i + 1}</span><div><h4>{step.title}</h4><p>{step.text}</p></div></li>)}</ol>}
    {section.id === 'payment' && <div className="service-rights-links"><PageLink page="refund" examId={examId} onClick={() => onNavigate('refund')}>退款與取消政策<ArrowUpRight size={13} /></PageLink><a href="https://support.ecpay.com.tw/5024/" target="_blank" rel="noopener noreferrer">綠界交易協助<ArrowUpRight size={13} /><span className="sr-only">（另開分頁）</span></a></div>}
    {section.id === 'troubleshoot' && <div className="service-rights-links"><PageLink page="instructions" examId={examId} onClick={() => onNavigate('instructions')}>使用說明<ArrowUpRight size={13} /></PageLink><PageLink page="account" examId={examId} onClick={() => onNavigate('account')}>帳號中心<ArrowUpRight size={13} /></PageLink></div>}
    {section.id === 'privacy' && <div className="service-rights-links"><PageLink page="privacy" examId={examId} onClick={() => onNavigate('privacy')}>個人資料保存與權利<ArrowUpRight size={13} /></PageLink></div>}
    {section.id === 'documents' && <div className="service-rights-links">{relatedPages.map(link => <PageLink key={link.page} page={link.page} examId={examId} onClick={() => onNavigate(link.page)}>{link.label}<ArrowUpRight size={13} /></PageLink>)}</div>}
    </section>)}
    <section id="service-faq" className="service-section service-faq" aria-labelledby="service-faq-title"><p className="service-small-label">QUICK ANSWERS</p><h2 id="service-faq-title">常見問題，先看這裡。</h2>{supportFaqs.map(item => <details key={item.question}><summary>{item.question}<ChevronRight size={15} /></summary><p>{item.answer}</p></details>)}</section>
    <section className="service-contact-card" aria-labelledby="service-contact-title"><span><Mail size={24} strokeWidth={1.5} /></span><div><p className="service-small-label">LET’S WORK THROUGH IT</p><h2 id="service-contact-title">需要協助，歡迎來信。</h2><p>說明問題與發生時間，不必登入，也不用先贊助。</p><a href={mailto}>{SUPPORT_CONTACT}<ArrowUpRight size={14} /></a></div></section></article></div><footer className="service-footer"><HeartHandshake size={12} />FOCUS SPACE<span />SUPPORT & CARE</footer>
  </main>;
};
export default CustomerSupportPage;
