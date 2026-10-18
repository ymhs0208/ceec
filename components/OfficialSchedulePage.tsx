import React, { useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, ListFilter, ShieldCheck } from 'lucide-react';
import { CAP_116_SCHEDULE_SOURCE, EXAM_PRESETS } from '../constants';
import { buildAppRoute } from '../utils/appRoutes';
import { getOfficialSchedule } from './ImportantDates';
import './OfficialSchedulePage.css';

interface OfficialSchedulePageProps {
  targetExam: string;
  onBack: () => void;
}

const filters = ['全部時程', '重要日期', '每日考程'] as const;
type ScheduleFilter = typeof filters[number];

const OfficialSchedulePage: React.FC<OfficialSchedulePageProps> = ({ targetExam, onBack }) => {
  const exam = EXAM_PRESETS.find(item => item.id === targetExam);
  const schedules = getOfficialSchedule(targetExam);
  const source = targetExam === '116cap' ? CAP_116_SCHEDULE_SOURCE : null;
  const [selection, setSelection] = useState<{ exam: string; filter: ScheduleFilter }>({ exam: targetExam, filter: '全部時程' });
  const filter = selection.exam === targetExam ? selection.filter : '全部時程';
  const visibleSchedules = schedules.map((category, index) => ({ ...category, index })).filter(category =>
    filter === '全部時程' || (filter === '每日考程' ? category.title.startsWith('考程') : !category.title.startsWith('考程'))
  );
  const eventCount = visibleSchedules.reduce((count, category) => count + category.items.length, 0);

  return (
    <main id="main-content" className="relative z-10 mx-auto w-full max-w-6xl pb-14">
      <section className="schedule-page">
        <div className="schedule-inner">
          <button type="button" onClick={onBack} className="schedule-back"><ArrowLeft size={16} /> 回到首頁</button>
          <header className="schedule-header">
            <div>
              <span className="schedule-eyebrow"><span /> 把重要日子，放進你的計畫</span>
              <h1>官方參考日程<span>。</span></h1>
              <p>從報名到考試，整理每個值得留意的時間點。</p>
            </div>
            <div className="schedule-exam-card"><span className="schedule-exam-icon"><CalendarDays size={26} strokeWidth={1.5} /></span><div><span className="schedule-exam-label">目前考試</span><strong>{exam?.name || '目前考試'}</strong></div></div>
          </header>
          <div className="schedule-layout">
            <div className="schedule-content">
              <div className="schedule-toolbar">
                <div className="schedule-filters" aria-label="日程分類">{filters.map(item => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setSelection({ exam: targetExam, filter: item })}>{item === '全部時程' ? <ListFilter size={14} /> : item === '每日考程' ? <Clock3 size={14} /> : <CalendarDays size={14} />}{item}</button>)}</div>
                <span className="schedule-count" aria-live="polite">{eventCount} 項時程</span>
              </div>
              <div className="schedule-sections">
                {visibleSchedules.map(category => <section key={category.title} id={`schedule-section-${category.index}`} className="schedule-category" aria-labelledby={`schedule-title-${category.index}`}>
                  <header className="schedule-category-header"><span className="schedule-category-icon">{category.icon}</span><h2 id={`schedule-title-${category.index}`}>{category.title}</h2><span className="schedule-category-count">{category.items.length} 項</span></header>
                  <ul className="schedule-rows">{category.items.map((item, index) => <li key={`${item.event}-${index}`} className={`schedule-row${category.title.startsWith('考程') ? ' schedule-row--exam' : ''}`}>
                    <div className="schedule-row-date"><span className="schedule-row-dot" aria-hidden="true" /><span>{item.date.replace(/^預計\s*/, '')}</span>{item.date.includes('預計') && <span className="schedule-estimated">預計</span>}</div>
                    <div className="schedule-row-event"><h3>{item.event}</h3>{item.note && <p>{item.note}</p>}</div>
                  </li>)}</ul>
                </section>)}
                {visibleSchedules.length === 0 && <div className="schedule-empty"><CalendarDays size={28} /><h2>目前沒有此類日程</h2><p>可切換至全部時程，查看現有的參考資訊。</p><button type="button" onClick={() => setSelection({ exam: targetExam, filter: '全部時程' })}>查看全部時程</button></div>}
              </div>
            </div>
            <aside className="schedule-sidebar">
              {source && <section className="schedule-reminder"><span className="schedule-reminder-icon"><ShieldCheck size={23} strokeWidth={1.6} /></span><h2>官方日程來源</h2><p>{source.note}</p><a href={source.url} target="_blank" rel="noopener noreferrer">開啟官方日程表 PDF <ArrowUpRight size={15} /></a></section>}
              <nav className="schedule-directory" aria-label="日程段落導覽"><span className="schedule-aside-label">快速查閱</span><h2>你的備考時間軸</h2><div>{visibleSchedules.map(category => <a key={category.title} href={`#schedule-section-${category.index}`}><span className="schedule-directory-number">{String(category.index + 1).padStart(2, '0')}</span><span>{category.title}</span><ArrowUpRight size={14} /></a>)}</div></nav>
              <section className="schedule-reminder"><span className="schedule-reminder-icon"><ShieldCheck size={23} strokeWidth={1.6} /></span><h2>規劃之前，先確認。</h2><p>本頁供備考規劃參考。日期、報名資格與試務規則，請以各考試主管機關最新公告為準。</p><div className="schedule-reminder-rule"><CheckCircle2 size={14} /><span>標示「預計」的時程尚待確認</span></div><a href={buildAppRoute('announcements', targetExam)}>查看最新公告 <ArrowUpRight size={15} /></a></section>
              <p className="schedule-calendar-note"><CalendarDays size={14} /> 日期以民國年呈現<br />每日考程使用 24 小時制</p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

export default OfficialSchedulePage;
