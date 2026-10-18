import React from 'react';
import { ArrowLeft, ArrowUpRight, Code2, Coffee, ExternalLink, Heart, MessageCircle, QrCode, Sparkles } from 'lucide-react';
import './DonationPage.css';
import { buildAppRoute } from '../utils/appRoutes';

const DONATION_URL = 'https://p.ecpay.com.tw/955D011';
const QR_CODE_URL = 'data:image/png;base64,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';

interface DonationPageProps {
  onBack: () => void;
  targetExam?: string;
}

const DonationPage: React.FC<DonationPageProps> = ({ onBack, targetExam = '116gsat' }) => (
  <main id="main-content" className="relative z-10 mx-auto max-w-4xl pb-12 opacity-0 animate-fade-in-up delay-100">
    <section className="support-page">
      <div className="support-topbar">
        <button type="button" onClick={onBack} className="support-back"><ArrowLeft size={16} /> 回到首頁</button>
        <span className="support-wordmark"><Heart size={13} /> SUPPORT FOCUS SPACE</span>
      </div>
      <div className="support-layout">
        <div className="support-story">
          <span className="support-eyebrow"><span /> 一份心意，持續陪伴</span>
          <h1>小額贊助<span>。</span></h1>
          <p className="support-intro">讓專注的日常，<br />多一點繼續前進的力量。</p>
          <p className="support-description">如果 Focus Space 陪你度過了備考的一天，歡迎用一杯飲料的心意，支持網站持續維護與改善。</p>
          <div className="support-art" aria-hidden="true">
            <div className="support-orbit support-orbit--outer" /><div className="support-orbit support-orbit--inner" />
            <span className="support-art-coffee"><Coffee size={23} strokeWidth={1.5} /></span>
            <span className="support-art-spark"><Sparkles size={24} strokeWidth={1.5} /></span>
            <div className="support-heart"><Heart size={65} strokeWidth={1.4} /></div>
            <span className="support-art-caption">A LITTLE SUPPORT, A LOT OF HEART.</span>
          </div>
          <div className="support-purpose"><span><Code2 size={16} /> 網站維護</span><span><Sparkles size={16} /> 功能改善</span><span><Heart size={16} /> 更好的體驗</span></div>
        </div>
        <section className="support-payment" aria-labelledby="support-payment-title">
          <span className="support-payment-icon"><Coffee size={23} strokeWidth={1.6} /></span>
          <h2 id="support-payment-title">請我們喝杯飲料</h2>
          <p className="support-payment-description">金額由你決定，每一份支持都很珍貴。</p>
          <a href={DONATION_URL} target="_blank" rel="noopener noreferrer" className="support-donate">前往小額贊助 <ArrowUpRight size={19} /></a>
          <p className="support-payment-caption"><ExternalLink size={11} /> 在新分頁開啟綠界科技付款頁面</p>
          <div className="support-divider"><span />或用手機掃描<span /></div>
          <a href={DONATION_URL} target="_blank" rel="noopener noreferrer" className="support-qr" aria-label="開啟小額贊助頁面">
            <img src={QR_CODE_URL} width="220" height="220" alt="前往 Focus Space 小額贊助頁面的 QR Code" />
          </a>
          <span className="support-scan"><QrCode size={14} /> 開啟相機，掃描即可贊助</span>
          <div className="support-thanks"><Heart size={14} /> 謝謝你，讓這份陪伴走得更遠。</div>
        </section>
      </div>
      <footer className="support-footer">
        <div className="support-footer-copy"><MessageCircle size={17} /><span>關於贊助，有任何疑問？</span></div>
        <div className="support-policy-links"><a href={buildAppRoute('support', targetExam)}>售後服務 <ArrowUpRight size={13} /></a><span aria-hidden="true" /><a href={buildAppRoute('refund', targetExam)}>退款與取消政策 <ArrowUpRight size={13} /></a></div>
      </footer>
    </section>
  </main>
);

export default DonationPage;
