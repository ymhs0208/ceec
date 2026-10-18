import React, { useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, Clock, ExternalLink, Megaphone } from 'lucide-react';
import './AnnouncementsPage.css';

interface AnnouncementsPageProps {
  onBack: () => void;
}

const scheduleItems = [
  { label: '英聽第一次', value: '115.10.17（六）', tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
  { label: '英聽第二次', value: '115.12.12（六）', tone: 'bg-sky-50 text-sky-700 ring-sky-100' },
  { label: '學科能力測驗', value: '116.01.22 – 01.24', tone: 'bg-violet-50 text-violet-700 ring-violet-100' },
  { label: '分科測驗', value: '116.07.10 – 07.11', tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
];

const reminders = [
  '簡章於 115 年 8 月 4 日公告及發售；報名前請完整閱讀考科、試務與違規規定。',
  '攜帶智慧眼鏡入座，不論是否使用，均視同舞弊；行動電話與電子穿戴裝置也加重處分。',
  '實際報名與應考安排，請以大考中心最新正式公告及簡章為準。',
];

const announcements = [
  { id: '116-exam-guide', category: '學測與分科', tag: '考試簡章', date: '115.08.03', source: '大學入學考試中心', title: '116 學年度考試簡章於 8 月 4 日公告與發售', summary: '英聽、學測與分科測驗的報名時程、考試日期及試場規則，一次掌握。', icon: BookOpen, tone: 'indigo' },
  { id: '116-cap', category: '國中會考', tag: '考試日期', date: '115.07.06', source: '國中教育會考', title: '116 年國中教育會考考試日期公告', summary: '考試訂於 116 年 5 月 15 日、16 日辦理；各項試務工作期程將另行公告。', icon: CalendarDays, tone: 'sky' },
  { id: '116-tech-admission', category: '技專統測', tag: '制度調整', date: '115.01.08 備查', source: '技專校院招生策略委員會', title: '116 學年度起四技二專入學考招制度調整', summary: '統測開放自主選考、調整採計科目數，並新增 APCS 升學機會。', icon: Megaphone, tone: 'violet' },
];
const categories = ['全部公告', '學測與分科', '技專統測', '國中會考'];

const AnnouncementsPage: React.FC<AnnouncementsPageProps> = ({ onBack }) => {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<string | null>(null);
  const [category, setCategory] = useState('全部公告');
  const detailBackRef = useRef<HTMLButtonElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const filterRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visibleAnnouncements = announcements.filter(item => category === '全部公告' || item.category === category);
  const openAnnouncement = (id: string) => {
    setSelectedAnnouncement(id);
    requestAnimationFrame(() => {
      detailBackRef.current?.focus({ preventScroll: true });
      detailBackRef.current?.scrollIntoView({ block: 'start' });
    });
  };
  const closeAnnouncement = () => {
    const previous = selectedAnnouncement;
    setSelectedAnnouncement(null);
    requestAnimationFrame(() => { (previous && cardRefs.current[previous] || filterRefs.current[category])?.focus(); });
  };

  return (
  <main id="main-content" className="bulletin-main relative z-10 pb-16 opacity-0 animate-fade-in-up delay-100">
    <section className="bulletin-page">
      <div className="bulletin-inner">
        <button type="button" onClick={onBack} className="bulletin-back">
          <ArrowLeft size={16} /> 回到首頁
        </button>
        <header className="bulletin-header">
          <div>
            <span className="bulletin-eyebrow"><span /> NEWS & UPDATES</span>
            <h1>最新公告<span className="bulletin-heading-dot">。</span></h1>
            <p>從考試簡章到重要日期，<br className="bulletin-mobile-break" />把準備路上的消息，一次整理好。</p>
          </div>
          <div className="bulletin-header-note"><span className="bulletin-header-symbol" aria-hidden="true"><Megaphone size={28} strokeWidth={1.4} /></span><div><strong>每個重要消息，都不錯過。</strong><span>簡章公告 / 考試日期 / 考招制度</span></div></div>
        </header>

        {selectedAnnouncement === null ? (
          <>
          <nav className="bulletin-filters" aria-label="公告分類">
            {categories.map(item => <button key={item} ref={node => { filterRefs.current[item] = node; }} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}<span>{item === '全部公告' ? announcements.length : announcements.filter(announcement => announcement.category === item).length}</span></button>)}
          </nav>
          <div className="bulletin-layout">
            <section className="bulletin-feed" aria-label="公告列表">
              <div className="bulletin-list-label"><h2>{category}</h2><span aria-live="polite">{visibleAnnouncements.length} 則消息 · 依公告日期排序</span></div>
              <div className="bulletin-cards">
                {visibleAnnouncements.map(item => {
                  const Icon = item.icon;
                  return <button key={item.id} ref={node => { cardRefs.current[item.id] = node; }} type="button" className={`bulletin-card bulletin-card--${item.tone}${item.id === '116-exam-guide' ? ' bulletin-card--featured' : ''}`} onClick={() => openAnnouncement(item.id)}>
                    <span className="bulletin-date-block"><span>{item.date.split('.')[0]} 年</span><strong>{item.date.split('.').slice(1).join('.').split(' ')[0]}</strong><span>{item.date.includes('備查') ? '備查日期' : '公告日期'}</span></span>
                    <div className="bulletin-card-content">
                      <span className="bulletin-card-top"><span className="bulletin-tag"><Icon size={13} />{item.tag}</span><span className="bulletin-card-category">{item.category}</span>{item.id === '116-exam-guide' && <span className="bulletin-feature-label">重點公告</span>}</span>
                      <div className="bulletin-card-body"><h3>{item.title}</h3><p className="bulletin-card-summary">{item.summary}</p></div>
                      <span className="bulletin-card-bottom"><span>{item.source}</span><span className="bulletin-read">閱讀全文 <ArrowRight size={15} /></span></span>
                    </div>
                  </button>;
                })}
              </div>
            </section>
            <aside className="bulletin-sidebar">
              <section className="bulletin-calendar">
                <p className="bulletin-aside-eyebrow">MARK YOUR CALENDAR</p><div className="bulletin-aside-heading"><span className="bulletin-aside-icon"><CalendarDays size={20} /></span><div><h2>考試時程速覽</h2><p>116 學年度 · 大考中心</p></div></div>
                <div className="bulletin-timeline">{scheduleItems.map((item, index) => <div key={item.label} className="bulletin-timeline-item"><span className="bulletin-timeline-dot" aria-hidden="true" /><span className="bulletin-timeline-index">0{index + 1}</span><div><h3>{item.label}</h3><p>{item.value}</p></div></div>)}</div>
                <button type="button" className="bulletin-schedule-link" onClick={() => openAnnouncement('116-exam-guide')}>查看報名期間 <ArrowUpRight size={16} /></button>
              </section>
              <section className="bulletin-note"><span className="bulletin-note-label"><CheckCircle2 size={16} /> 備考小提醒</span><h2>報名前，再確認一次。</h2><p>考程與規則請以官方最新公告為準，提前確認報名期限與應考規定。</p><a href="https://www.ceec.edu.tw/" target="_blank" rel="noreferrer">前往大考中心 <ExternalLink size={14} /></a></section>
            </aside>
          </div>
          <p className="bulletin-footnote"><CheckCircle2 size={14} /> 本頁整理考試相關消息，完整內容與最新異動請以各主管機關公告為準。</p>
          </>
        ) : (
          <div className="bulletin-detail">
            <button ref={detailBackRef} type="button" onClick={closeAnnouncement} className="bulletin-back bulletin-detail-back">
              <ArrowLeft className="h-4 w-4" /> 回到公告摘要
            </button>
            {selectedAnnouncement === '116-tech-admission' ? (
              <>
                <article className="mt-4 overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
                  <div className="border-b border-violet-100/80 px-6 py-4 sm:px-8">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 font-black text-white"><Megaphone className="h-3.5 w-3.5" /> 技專考招制度</span>
                      <span>技專校院招生策略委員會 · 教育部 115 年 1 月 8 日臺教技（一）字第 1140136358 號函備查</span>
                    </div>
                  </div>
                  <div className="px-6 py-7 sm:px-8 sm:py-9">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">116 學年度起四技二專入學考招制度調整說明</h2>
                    <p className="mt-4 max-w-4xl text-sm font-medium leading-7 text-slate-600 sm:text-base">制度調整旨在讓學生依興趣與專長選擇適合的升學途徑，提供技專校院更多元、適性的選才方式。以下為已公告的實施重點。</p>

                    <section className="mt-7 rounded-2xl border border-violet-100 bg-white/80 p-5 sm:p-6">
                      <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white">116</span><h3 className="font-black text-slate-800">116 學年度起實施</h3></div>
                      <div className="mt-5 grid gap-4 text-sm font-medium leading-7 text-slate-600">
                        <p><span className="font-black text-slate-800">統測自主選考：</span>單群（類）考生至少選考 2 科，且須含至少 1 科專業科目；跨群（類）考生至少選考 3 科，各群（類）專業科目（二）為必考。</p>
                        <p><span className="font-black text-slate-800">甄選入學第一階段：</span>統測參採科目由 1 至 5 科調整為 1 至 4 科；一、二階段可採不同科目，但合計至多 4 科。任一採計科目未報考，或有 2 科以上為 0 分（缺考亦計 0 分），不得進入第一階段篩選。</p>
                        <p><span className="font-black text-slate-800">APCS 超額篩選：</span>資訊、電資相關系得以一般組一般考生預計甄試人數最多 10%（無條件進位）作為超額篩選名額，讓符合系科標準的 APCS 考生有機會進入第二階段。</p>
                        <p><span className="font-black text-slate-800">聯合登記分發：</span>統測採計由 5 科全採調整為 2 至 5 科，且專業科目總權重須大於共同科目總權重；未報考任一採計科目或有 2 科以上 0 分者，不具分發資格。</p>
                      </div>
                    </section>

                    <section className="mt-5 rounded-2xl border border-fuchsia-100 bg-white/80 p-5 sm:p-6">
                      <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-600 text-sm font-black text-white">117</span><h3 className="font-black text-slate-800">117 學年度起實施</h3></div>
                      <p className="mt-4 text-sm font-medium leading-7 text-slate-600">四技二專甄選入學一般組第一階段招生名額篩選倍率上限，由現行 3 倍調整為 4 倍，提升考生通過第一階段、進入第二階段甄試的機會。</p>
                    </section>

                    <section className="mt-5 rounded-2xl bg-slate-900 p-5 text-white sm:p-6">
                      <h3 className="font-black">重要時程</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-300">116 學年度首次開放統測自主選考；各系科於甄選入學及聯合登記分發所採計的統測科目，將提前於 115 年 6 月公告。</p>
                    </section>
                  </div>
                </article>
                <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                  <h2 className="text-lg font-black text-slate-800">常見問題 Q&A</h2>
                  <div className="mt-5 space-y-4 text-sm font-medium leading-7 text-slate-600">
                    <p><span className="font-black text-slate-800">為什麼開放自主選考？</span>讓學生依興趣與強項聚焦準備、展現真實學習成果，也呼應適性發展與多元探索。</p>
                    <p><span className="font-black text-slate-800">會影響學校教學嗎？</span>不會。高中仍依課綱完整開設共同與專業課程；選考是升學測驗的彈性安排。</p>
                    <p><span className="font-black text-slate-800">同分如何處理？</span>聯合登記分發經同分比序後仍同分者，將同時增額錄取，以維持招生公平。</p>
                    <p><span className="font-black text-slate-800">報名如何避免選科錯誤？</span>統測報名系統會設有防錯提醒，送出資料前會列出已選與未選科目供確認。</p>
                  </div>
                </section>
              </>
            ) : selectedAnnouncement === '116-cap' ? (
              <>
                <article className="mt-4 overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50">
                  <div className="border-b border-sky-100/80 px-6 py-4 sm:px-8">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1.5 font-black text-white"><CalendarDays className="h-3.5 w-3.5" /> 國中教育會考</span>
                      <span>依教育部 115 年 7 月 6 日臺教授國部字第 1155502031 號函辦理</span>
                    </div>
                  </div>
                  <div className="px-6 py-7 sm:px-8 sm:py-9">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">116 年國中教育會考考試日期公告</h2>
                    <div className="mt-6 rounded-2xl bg-sky-600 p-5 text-white sm:p-6">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-100">Exam dates</p>
                      <p className="mt-2 text-xl font-black sm:text-2xl">116 年 5 月 15 日、5 月 16 日（六、日）</p>
                    </div>
                    <div className="mt-7 space-y-5 text-sm font-medium leading-7 text-slate-600 sm:text-base">
                      <p>116 年國中教育會考訂於 116 年 5 月 15 日與 5 月 16 日（星期六、日）辦理。</p>
                      <p>為避免重大活動於此期間規劃而影響學生權益，請相關單位及考生預先留意並妥善安排。</p>
                      <p>116 年國中教育會考各項試務工作辦理期程將另行公告，請持續留意國中教育會考網站的最新訊息。</p>
                    </div>
                  </div>
                </article>
                <aside className="mt-8 rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-300 sm:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Official source</p>
                  <h2 className="mt-3 text-xl font-black">以國中教育會考網站公告為準</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">各項試務工作期程將另行公告，請持續查看官方網站。</p>
                  <a href="https://cap.rcpet.edu.tw" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-sky-50">
                    前往國中教育會考網站 <ExternalLink className="h-4 w-4" />
                  </a>
                </aside>
              </>
            ) : (
              <>
            <article className="mt-4 overflow-hidden rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-violet-50">
              <div className="border-b border-rose-100/80 px-6 py-4 sm:px-8">
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 font-black text-white"><AlertTriangle className="h-3.5 w-3.5" /> 考試簡章公告</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> 財團法人大學入學考試中心基金會新聞稿 · 115.08.03</span>
                </div>
              </div>
              <div className="px-6 py-7 sm:px-8 sm:py-9">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">116 學年度考試簡章於 8 月 4 日公告與發售</h2>
                <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-600 sm:text-base">116 學年度考試簡章已公告，內容包含高中英語聽力測驗、學科能力測驗及分科測驗的測驗說明、試務作業、試場規則與違規處理辦法。請考生於各項考試規定期間完成報名或應考服務申請。</p>
                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600 sm:text-base">紙本簡章自 115 年 8 月 4 日起至 116 年 7 月 11 日止發售，每本 60 元；網路版及有聲版同步於大考中心簡章專區提供查覽、列印或下載。</p>
                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {scheduleItems.map((item) => (
                    <div key={item.label} className={`rounded-2xl px-4 py-4 ring-1 ${item.tone}`}>
                      <div className="flex items-center gap-2 text-[11px] font-black tracking-wider opacity-75"><Clock className="h-3.5 w-3.5" /> {item.label}</div>
                      <div className="mt-1.5 text-sm font-black sm:text-base">{item.value}</div>
                    </div>
                  ))}
                </div>
                <section className="mt-8 rounded-2xl border border-white bg-white/75 p-5">
                  <h3 className="font-black text-slate-800">各項考試報名期間</h3>
                  <div className="mt-4 grid gap-3 text-sm font-medium text-slate-600 sm:grid-cols-2">
                    <p><span className="font-black text-slate-800">英聽第一次：</span>115.09.03 – 09.10</p>
                    <p><span className="font-black text-slate-800">英聽第二次：</span>115.11.04 – 11.10</p>
                    <p><span className="font-black text-slate-800">學科能力測驗：</span>115.10.27 – 11.10</p>
                    <p><span className="font-black text-slate-800">分科測驗：</span>116.06.03 – 06.15</p>
                  </div>
                </section>
              </div>
            </article>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-lg font-black text-slate-800">簡章重點提醒</h2>
            <div className="mt-5 space-y-4">
              {reminders.map((reminder) => (
                <div key={reminder} className="flex gap-3 text-sm font-medium leading-6 text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <p>{reminder}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5 text-sm font-medium leading-7 text-slate-600">
              <p><span className="font-black text-slate-800">考試形式：</span>英聽為選擇題；學測除國寫外，其餘考科與分科測驗皆包含選擇題，並可能包含混合或非選擇題型。</p>
              <p className="mt-3"><span className="font-black text-slate-800">答題注意：</span>答題卷皆設有簽名欄。請依規定時間以 2B 軟心鉛筆或黑色墨水筆正楷簽全名，未簽全名或提早簽名均可能扣分。</p>
              <p className="mt-3"><span className="font-black text-slate-800">成績表示：</span>英聽採 A、B、C、F 四等級；學測與分科測驗採級分制，詳細採計方式請見正式簡章。</p>
            </div>
          </section>

          <aside className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-300 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">Primary source</p>
            <h2 className="mt-3 text-xl font-black">以官方公告為準</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">重要考程可能隨官方通知更新。出發前請再完成一次確認。</p>
            <a href="https://www.ceec.edu.tw/" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-rose-50">
              前往大考中心 <ExternalLink className="h-4 w-4" />
            </a>
          </aside>
            </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  </main>
  );
};

export default AnnouncementsPage;
