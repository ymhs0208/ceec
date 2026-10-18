import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Cloud, Cookie, Database, Mail, Scale, ShieldCheck, Users } from 'lucide-react';
import PageLink from './PageLink';
import { type ActivePage } from '../utils/appRoutes';
import { openAnalyticsSettings } from './AnalyticsConsent';
import { privacyDataRows, privacyPartners, privacySections, PRIVACY_CONTACT, PRIVACY_UPDATED } from '../data/privacyPolicy';
import './PrivacyPage.css';

interface PrivacyPageProps { examId: string; onNavigate: (page: ActivePage) => void; }
const PrivacyPage = ({ examId, onNavigate }: PrivacyPageProps) => {
  const [activeSection, setActiveSection] = useState('scope');
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id.replace('privacy-', ''));
    }, { rootMargin: '-120px 0px -50% 0px', threshold: 0 });
    privacySections.forEach(section => {
      const node = document.getElementById(`privacy-${section.id}`);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  return <main id="main-content" className="privacy-page">
    <div className="privacy-topbar"><PageLink page="home" examId={examId} onClick={() => onNavigate('home')} className="privacy-back"><ArrowLeft size={15} />返回首頁</PageLink><span className="privacy-version">最後更新 <time dateTime="2026-10-12">{PRIVACY_UPDATED}</time></span></div>
    <header className="privacy-hero">
      <div><p className="privacy-eyebrow"><ShieldCheck size={14} />PRIVACY & YOUR CHOICES</p><h1>隱私權政策<span>。</span></h1><p className="privacy-hero-title">你的資料，<span>值得清楚交代。</span></p><p className="privacy-intro">了解我們處理哪些資料、如何保存與使用，以及你能做的選擇。讓每一段專注，都建立在知情與安心之上。</p><div className="privacy-hero-links"><a href="#privacy-rights" onClick={() => setActiveSection('rights')}>了解我的權利<ArrowUpRight size={14} /></a><button type="button" onClick={openAnalyticsSettings}><Cookie size={14} />Cookie 設定</button></div></div>
      <div className="privacy-hero-card"><span className="privacy-shield"><ShieldCheck size={35} strokeWidth={1.3} /></span><span className="privacy-small-label">INFORMED. IN CONTROL.</span><h2>每一種選擇，都說清楚。</h2><p>本機儲存、帳號同步與公開排行<br />各有不同的資料範圍。</p><div><Check size={14} />完整政策與管理入口，在這一頁。</div></div>
    </header>

    <section className="privacy-summary" aria-label="隱私重點摘要">
      <div><span><Database size={20} strokeWidth={1.5} /></span><h2>本機優先</h2><p>未登入的學習資料主要存在瀏覽器；外部資源仍可能連線。</p></div>
      <div><span><Cloud size={20} strokeWidth={1.5} /></span><h2>登入後同步</h2><p>登入後合併與同步紀錄，部分內容由伺服器加密儲存。</p></div>
      <div><span><Users size={20} strokeWidth={1.5} /></span><h2>排行會公開</h2><p>顯示名稱、隊伍與排行資訊公開呈現，請選用合適暱稱。</p></div>
      <div><span><Scale size={20} strokeWidth={1.5} /></span><h2>你可以管理</h2><p>變更分析選擇，或提出閱覽、更正、停止利用與刪除請求。</p></div>
    </section>

    <div className="privacy-layout">
      <aside className="privacy-sidebar"><nav className="privacy-toc" aria-label="隱私權政策章節"><div className="privacy-toc-heading">閱讀目錄<small>12 SECTIONS</small></div>{privacySections.map((section, index) => <a key={section.id} href={`#privacy-${section.id}`} aria-current={activeSection === section.id ? 'location' : undefined} onClick={() => setActiveSection(section.id)}><span>{String(index + 1).padStart(2, '0')}</span>{section.label}<ChevronRight size={12} /></a>)}</nav><div className="privacy-sidebar-contact"><Mail size={19} strokeWidth={1.5} /><strong>有隱私相關問題？</strong><p>歡迎來信說明請求，<br />請勿附上密碼或驗證碼。</p><a href={`mailto:${PRIVACY_CONTACT}`}>聯絡隱私窗口<ArrowUpRight size={13} /></a></div></aside>
      <article className="privacy-document" aria-label="完整隱私權政策">
        <div className="privacy-document-heading"><h2>完整政策</h2><span>更新日期：{PRIVACY_UPDATED}</span></div>
        {privacySections.map((section, index) => {
          const Icon = section.icon;
          return <section key={section.id} id={`privacy-${section.id}`} className="privacy-section" aria-labelledby={`privacy-title-${section.id}`}>
            <div className="privacy-section-heading"><span className="privacy-section-icon"><Icon size={20} strokeWidth={1.5} /></span><div><span className="privacy-small-label">SECTION {String(index + 1).padStart(2, '0')}</span><h3 id={`privacy-title-${section.id}`}>{section.title}</h3></div></div>
            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            {section.id === 'data' && <div className="privacy-data-table"><table><caption>資料類別、內容與用途</caption><thead><tr><th scope="col">資料類別</th><th scope="col">可能包含的內容</th><th scope="col">用途／情境</th></tr></thead><tbody>{privacyDataRows.map(([category, details, purpose]) => <tr key={category}><th scope="row">{category}</th><td>{details}</td><td>{purpose}</td></tr>)}</tbody></table></div>}
            {section.id === 'partners' && <div className="privacy-partners">{privacyPartners.map(partner => <div key={partner.name}><div><strong>{partner.name}</strong><span>{partner.purpose}</span></div><p>{partner.detail}</p><a href={partner.url} target="_blank" rel="noopener noreferrer">{partner.link}<ArrowUpRight size={12} /><span className="sr-only">（另開分頁）</span></a></div>)}</div>}
            {section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}
            {section.note && <div className="privacy-note"><ShieldCheck size={16} /><span>{section.note}</span></div>}
            {section.id === 'cookies' && <div className="privacy-section-actions"><button type="button" onClick={openAnalyticsSettings} className="privacy-primary"><Cookie size={15} />管理 Cookie 選擇<ArrowUpRight size={14} /></button><span>拒絕分析，不影響主要學習功能。</span></div>}
            {section.id === 'rights' && <div className="privacy-rights-links"><PageLink page="account" examId={examId} onClick={() => onNavigate('account')}>前往帳號中心<ArrowUpRight size={14} /></PageLink><a href={`mailto:${PRIVACY_CONTACT}?subject=${encodeURIComponent('Focus Space 個人資料權利請求')}`}>提出個資請求<Mail size={14} /></a><a href="https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021" target="_blank" rel="noopener noreferrer">個人資料保護法<ArrowUpRight size={14} /><span className="sr-only">（另開分頁）</span></a></div>}
            {section.id === 'updates' && <div className="privacy-rights-links">{([{ page: 'terms', label: '服務條款' }, { page: 'support', label: '售後服務' }, { page: 'refund', label: '退款政策' }] as const).map(link => <PageLink key={link.page} page={link.page} examId={examId} onClick={() => onNavigate(link.page)}>{link.label}<ArrowUpRight size={13} /></PageLink>)}</div>}
          </section>;
        })}
        <section className="privacy-contact-card" aria-labelledby="privacy-contact-title"><span><Mail size={24} strokeWidth={1.5} /></span><div><p className="privacy-small-label">LET’S KEEP IT CLEAR</p><h2 id="privacy-contact-title">關於你的資料，歡迎聯絡我們。</h2><p>請說明帳號信箱與請求內容，我們會依適用法令處理。</p><a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}<ArrowUpRight size={14} /></a></div></section>
      </article>
    </div>
    <footer className="privacy-footer"><ShieldCheck size={12} />FOCUS SPACE<span />PRIVACY & YOUR CHOICES</footer>
  </main>;
};
export default PrivacyPage;
