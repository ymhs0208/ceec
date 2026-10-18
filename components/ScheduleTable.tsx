import React, { useEffect, useMemo, useState } from 'react';
import './ScheduleTimeline.css';
import { EXAM_PRESETS } from '../constants';
import {
  AlertCircle,
  BookOpen,
  CalendarRange,
  Calculator,
  Clock,
  Ear,
  FlaskConical,
  Globe2,
  Languages,
  MapPin,
  PenTool,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getSubjectIcon = (name: string) => {
  if (name.includes('數學') || name.includes('數學甲')) return <Calculator className="w-5 h-5" />;
  if (name.includes('自然') || name.includes('物理') || name.includes('化學') || name.includes('生物')) return <FlaskConical className="w-5 h-5" />;
  if (name.includes('英文') || name.includes('英語')) return <Languages className="w-5 h-5" />;
  if (name.includes('國') && !name.includes('社會')) return <BookOpen className="w-5 h-5" />;
  if (name.includes('寫作')) return <PenTool className="w-5 h-5" />;
  if (name.includes('社會') || name.includes('歷史') || name.includes('地理') || name.includes('公民')) return <Globe2 className="w-5 h-5" />;
  if (name.includes('專業')) return <Wrench className="w-5 h-5" />;
  if (name.includes('聽力')) return <Ear className="w-5 h-5" />;
  return <BookOpen className="w-5 h-5" />;
};

const getSubjectStyle = (name: string) => {
  if (name.includes('數學')) return { bg: 'bg-blue-50', text: 'text-blue-700', line: 'bg-blue-500', ring: 'border-blue-100' };
  if (name.includes('自然') || name.includes('生物')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', line: 'bg-emerald-500', ring: 'border-emerald-100' };
  if (name.includes('英文') || name.includes('英語')) return { bg: 'bg-violet-50', text: 'text-violet-700', line: 'bg-violet-500', ring: 'border-violet-100' };
  if (name.includes('國') && !name.includes('社會')) return { bg: 'bg-rose-50', text: 'text-rose-700', line: 'bg-rose-500', ring: 'border-rose-100' };
  if (name.includes('寫作')) return { bg: 'bg-orange-50', text: 'text-orange-700', line: 'bg-orange-500', ring: 'border-orange-100' };
  if (name.includes('社會') || name.includes('歷史')) return { bg: 'bg-amber-50', text: 'text-amber-700', line: 'bg-amber-500', ring: 'border-amber-100' };
  if (name.includes('物理') || name.includes('化學')) return { bg: 'bg-cyan-50', text: 'text-cyan-700', line: 'bg-cyan-500', ring: 'border-cyan-100' };
  if (name.includes('專業')) return { bg: 'bg-zinc-100', text: 'text-zinc-700', line: 'bg-zinc-500', ring: 'border-zinc-200' };
  return { bg: 'bg-slate-100', text: 'text-slate-700', line: 'bg-slate-500', ring: 'border-slate-200' };
};

interface Subject {
  time: string;
  name: string;
  type: 'morning' | 'afternoon';
  duration: string;
  note?: string;
  groups?: string[];
}

interface DaySchedule {
  date: string;
  weekday: string;
  weekdayZh: string;
  subjects: Subject[];
  timeline?: { time: string; name: string; minutes: number; kind: 'exam' | 'instruction' | 'break' | 'lunch' }[];
}

interface ExamSchedule {
  title: string;
  note: string;
  days: DaySchedule[];
  examWindow?: string;
  registration?: string;
  status?: string;
  source?: string;
}

interface ScheduleTableProps {
  targetExam?: string;
  tvetCategory?: string;
}

const SCHEDULE_DATA: Record<string, ExamSchedule> = {
  '117gsat': {
    title: '117 學測日程 (預計)',
    note: '預備鈴響前 5 分鐘入場，考試開始 20 分鐘後不得入場，60 分鐘內不得離場。',
    examWindow: '117.01.22 - 01.24',
    status: '預估日程',
    source: '依系統預估資料顯示',
    days: [
      {
        date: '01.22', weekday: 'Saturday', weekdayZh: '週六',
        subjects: [
          { time: '09:20 - 11:00', name: '數學 A', type: 'morning', duration: '100 分鐘' },
          { time: '12:50 - 14:40', name: '自然', type: 'afternoon', duration: '110 分鐘' },
        ]
      },
      {
        date: '01.23', weekday: 'Sunday', weekdayZh: '週日',
        subjects: [
          { time: '09:20 - 11:00', name: '英文', type: 'morning', duration: '100 分鐘' },
          { time: '12:50 - 14:20', name: '國綜', type: 'afternoon', duration: '90 分鐘' },
          { time: '15:20 - 16:50', name: '國寫', type: 'afternoon', duration: '90 分鐘' },
        ]
      },
      {
        date: '01.24', weekday: 'Monday', weekdayZh: '週一',
        subjects: [
          { time: '09:20 - 11:00', name: '數學 B', type: 'morning', duration: '100 分鐘' },
          { time: '12:50 - 14:40', name: '社會', type: 'afternoon', duration: '110 分鐘' },
        ]
      }
    ]
  },
  '116gsat': {
    title: '116 學測日程',
    note: '預備鈴響前 5 分鐘入場，考試開始 20 分鐘後不得入場，60 分鐘內不得離場。實際日期仍以 116 學年度考試簡章為準。',
    examWindow: '116.01.22 - 01.24',
    registration: '115.10.27 - 11.10',
    status: '大考中心暫定',
    source: '大考中心 115.05 公告',
    days: [
      {
        date: '01.22', weekday: 'Friday', weekdayZh: '週五',
        subjects: [
          { time: '09:20 - 11:00', name: '數學 A', type: 'morning', duration: '100 分鐘' },
          { time: '12:50 - 14:40', name: '自然', type: 'afternoon', duration: '110 分鐘' },
        ]
      },
      {
        date: '01.23', weekday: 'Saturday', weekdayZh: '週六',
        subjects: [
          { time: '09:20 - 11:00', name: '英文', type: 'morning', duration: '100 分鐘' },
          { time: '12:50 - 14:20', name: '國綜', type: 'afternoon', duration: '90 分鐘' },
          { time: '15:20 - 16:50', name: '國寫', type: 'afternoon', duration: '90 分鐘' },
        ]
      },
      {
        date: '01.24', weekday: 'Sunday', weekdayZh: '週日',
        subjects: [
          { time: '09:20 - 11:00', name: '數學 B', type: 'morning', duration: '100 分鐘' },
          { time: '12:50 - 14:40', name: '社會', type: 'afternoon', duration: '110 分鐘' },
        ]
      }
    ]
  },
  '116cap': {
    title: '116 會考日程',
    note: '一般科目考試說明為 10 分鐘，英語聽力為 5 分鐘。英語聽力測驗撥音後即不得入場。科目時程為參考，實際安排以 116 年會考簡章為準。',
    examWindow: '116.05.15 - 05.16',
    registration: '116.03.04 - 03.06',
    status: '考試日期已公告',
    days: [
      {
        date: '05.15', weekday: 'Saturday', weekdayZh: '週六',
        timeline: [
          { time: '08:20～08:30', name: '考試說明', minutes: 10, kind: 'instruction' },
          { time: '08:30～09:40', name: '社會', minutes: 70, kind: 'exam' },
          { time: '09:40～10:20', name: '休息', minutes: 40, kind: 'break' },
          { time: '10:20～10:30', name: '考試說明', minutes: 10, kind: 'instruction' },
          { time: '10:30～11:50', name: '數學', minutes: 80, kind: 'exam' },
          { time: '11:50～13:40', name: '午休', minutes: 110, kind: 'lunch' },
          { time: '13:40～13:50', name: '考試說明', minutes: 10, kind: 'instruction' },
          { time: '13:50～15:00', name: '國文', minutes: 70, kind: 'exam' },
          { time: '15:00～15:40', name: '休息', minutes: 40, kind: 'break' },
          { time: '15:40～15:50', name: '考試說明', minutes: 10, kind: 'instruction' },
          { time: '15:50～16:40', name: '寫作測驗', minutes: 50, kind: 'exam' },
        ],
        subjects: [
          { time: '08:30 - 09:40', name: '社會', type: 'morning', duration: '70 分鐘' },
          { time: '10:30 - 11:50', name: '數學', type: 'morning', duration: '80 分鐘' },
          { time: '13:50 - 15:00', name: '國文', type: 'afternoon', duration: '70 分鐘' },
          { time: '15:50 - 16:40', name: '寫作測驗', type: 'afternoon', duration: '50 分鐘' },
        ]
      },
      {
        date: '05.16', weekday: 'Sunday', weekdayZh: '週日',
        timeline: [
          { time: '08:20～08:30', name: '考試說明', minutes: 10, kind: 'instruction' },
          { time: '08:30～09:40', name: '自然', minutes: 70, kind: 'exam' },
          { time: '09:40～10:20', name: '休息', minutes: 40, kind: 'break' },
          { time: '10:20～10:30', name: '考試說明', minutes: 10, kind: 'instruction' },
          { time: '10:30～11:30', name: '英語（閱讀）', minutes: 60, kind: 'exam' },
          { time: '11:30～12:00', name: '休息', minutes: 30, kind: 'break' },
          { time: '12:00～12:05', name: '考試說明', minutes: 5, kind: 'instruction' },
          { time: '12:05～12:30', name: '英語（聽力）', minutes: 25, kind: 'exam' },
        ],
        subjects: [
          { time: '08:30 - 09:40', name: '自然', type: 'morning', duration: '70 分鐘' },
          { time: '10:30 - 11:30', name: '英語 (閱讀)', type: 'morning', duration: '60 分鐘' },
          { time: '12:05 - 12:30', name: '英語 (聽力)', type: 'morning', duration: '25 分鐘' },
        ]
      }
    ]
  },
  '116ast': {
    title: '116 分科測驗日程 (預計)',
    note: '預備鈴響前 5 分鐘入場（持應試有效證件正本），考試開始 20 分鐘後不得入場。',
    examWindow: '116.07.10 - 07.11',
    registration: '116.06.03 - 06.15',
    status: '大考中心暫定',
    source: '大考中心 115.05 公告',
    days: [
      {
        date: '07.10', weekday: 'Saturday', weekdayZh: '週六',
        subjects: [
          { time: '08:40 - 10:00', name: '物理', type: 'morning', duration: '80 分鐘' },
          { time: '10:50 - 12:10', name: '化學', type: 'morning', duration: '80 分鐘' },
          { time: '14:00 - 15:20', name: '數學甲', type: 'afternoon', duration: '80 分鐘' },
          { time: '16:10 - 17:30', name: '生物', type: 'afternoon', duration: '80 分鐘' },
        ]
      },
      {
        date: '07.11', weekday: 'Sunday', weekdayZh: '週日',
        subjects: [
          { time: '08:40 - 10:00', name: '歷史', type: 'morning', duration: '80 分鐘' },
          { time: '10:50 - 12:10', name: '地理', type: 'morning', duration: '80 分鐘' },
          { time: '14:00 - 15:20', name: '公民與社會', type: 'afternoon', duration: '80 分鐘' }
        ]
      }
    ]
  },
  '116tvet': {
    title: '116 統測日程',
    note: '請攜帶准考證及規定文具。專業科目(二)依群別分時段考試，請務必確認個人群別考程。',
    examWindow: '116.04.24 - 04.25',
    status: '預估日程',
    days: [
      {
        date: '04.24', weekday: 'Saturday', weekdayZh: '週六',
        subjects: [
          { time: '10:20 - 12:00', name: '專業科目(二)', type: 'morning', duration: '100 分鐘', note: '群別 03, 07, 12, 15, 51-53, 55-56', groups: ['03', '07', '12', '15', '51', '52', '53', '55', '56'] },
          { time: '13:30 - 15:10', name: '國文', type: 'afternoon', duration: '100 分鐘' },
          { time: '16:00 - 17:40', name: '英文', type: 'afternoon', duration: '100 分鐘' },
        ]
      },
      {
        date: '04.25', weekday: 'Sunday', weekdayZh: '週日',
        subjects: [
          { time: '08:30 - 10:10', name: '專業科目(二)', type: 'morning', duration: '100 分鐘', note: '群別 01-02, 04-06, 08-11, 13-14, 17-20, 51-54, 56', groups: ['01', '02', '04', '05', '06', '08', '09', '10', '11', '13', '14', '17', '18', '19', '20', '51', '52', '53', '54', '56'] },
          { time: '11:00 - 12:20', name: '數學', type: 'morning', duration: '80 分鐘' },
          { time: '13:30 - 15:10', name: '專業科目(一)', type: 'afternoon', duration: '100 分鐘' },
          { time: '16:00 - 17:40', name: '專業科目(二)', type: 'afternoon', duration: '100 分鐘', note: '群別 16, 54-56', groups: ['16', '54', '55', '56'] },
        ]
      }
    ]
  },
  '115tvet': {
    title: '115 統測日程',
    note: '請攜帶准考證及規定文具。專業科目(二)依群別分時段考試，請務必確認個人群別考程。',
    examWindow: '115.04.25 - 04.26',
    status: '正式日程',
    days: [
      {
        date: '04.25', weekday: 'Saturday', weekdayZh: '週六',
        subjects: [
          { time: '10:20 - 12:00', name: '專業科目(二)', type: 'morning', duration: '100 分鐘', note: '群別 03, 07, 12, 15, 51-53, 55-56', groups: ['03', '07', '12', '15', '51', '52', '53', '55', '56'] },
          { time: '13:30 - 15:10', name: '國文', type: 'afternoon', duration: '100 分鐘' },
          { time: '16:00 - 17:40', name: '英文', type: 'afternoon', duration: '100 分鐘' },
        ]
      },
      {
        date: '04.26', weekday: 'Sunday', weekdayZh: '週日',
        subjects: [
          { time: '08:30 - 10:10', name: '專業科目(二)', type: 'morning', duration: '100 分鐘', note: '群別 01-02, 04-06, 08-11, 13-14, 17-20, 51-54, 56', groups: ['01', '02', '04', '05', '06', '08', '09', '10', '11', '13', '14', '17', '18', '19', '20', '51', '52', '53', '54', '56'] },
          { time: '11:00 - 12:20', name: '數學', type: 'morning', duration: '80 分鐘' },
          { time: '13:30 - 15:10', name: '專業科目(一)', type: 'afternoon', duration: '100 分鐘' },
          { time: '16:00 - 17:40', name: '專業科目(二)', type: 'afternoon', duration: '100 分鐘', note: '群別 16, 54-56', groups: ['16', '54', '55', '56'] },
        ]
      }
    ]
  },
  '117cap': {
    title: '117 會考日程（預估）',
    note: '日期暫以 2028 年 5 月第三個週末推估，各科時段沿用歷年安排供備考參考；正式日期與時段以國中教育會考公告為準。',
    examWindow: '117.05.20 - 05.21（預估）',
    status: '預估・待官方公告',
    days: [
      {
        date: '05.20', weekday: 'Saturday', weekdayZh: '週六',
        subjects: [
          { time: '08:30 - 09:40', name: '社會', type: 'morning', duration: '70 分鐘' },
          { time: '10:30 - 11:50', name: '數學', type: 'morning', duration: '80 分鐘' },
          { time: '13:50 - 15:00', name: '國文', type: 'afternoon', duration: '70 分鐘' },
          { time: '15:50 - 16:40', name: '寫作測驗', type: 'afternoon', duration: '50 分鐘' },
        ]
      },
      {
        date: '05.21', weekday: 'Sunday', weekdayZh: '週日',
        subjects: [
          { time: '08:30 - 09:40', name: '自然', type: 'morning', duration: '70 分鐘' },
          { time: '10:30 - 11:30', name: '英語 (閱讀)', type: 'morning', duration: '60 分鐘' },
          { time: '12:05 - 12:30', name: '英語 (聽力)', type: 'afternoon', duration: '25 分鐘' },
        ]
      }
    ]
  },
  '115ast': {
    title: '115 分科測驗日程',
    note: '因應巴威颱風順延。預備鈴響前 5 分鐘入場（持應試有效證件正本），考試開始 20 分鐘後不得入場。',
    examWindow: '115.07.13 - 07.14',
    status: '順延後日程',
    days: [
      {
        date: '07.13', weekday: 'Monday', weekdayZh: '週一',
        subjects: [
          { time: '08:40 - 10:00', name: '物理', type: 'morning', duration: '80 分鐘', note: '09:00 截止入場，09:40 始可離場' },
          { time: '10:50 - 12:10', name: '化學', type: 'morning', duration: '80 分鐘', note: '11:10 截止入場，11:50 始可離場' },
          { time: '14:00 - 15:20', name: '數學甲', type: 'afternoon', duration: '80 分鐘', note: '14:20 截止入場，15:00 始可離場' },
          { time: '16:10 - 17:30', name: '生物', type: 'afternoon', duration: '80 分鐘', note: '16:30 截止入場，17:10 始可離場' },
        ]
      },
      {
        date: '07.14', weekday: 'Tuesday', weekdayZh: '週二',
        subjects: [
          { time: '08:40 - 10:00', name: '歷史', type: 'morning', duration: '80 分鐘', note: '09:00 截止入場，09:40 始可離場' },
          { time: '10:50 - 12:10', name: '地理', type: 'morning', duration: '80 分鐘', note: '11:10 截止入場，11:50 始可離場' },
          { time: '14:00 - 15:20', name: '數學乙', type: 'afternoon', duration: '80 分鐘', note: '14:20 截止入場，15:00 始可離場' },
          { time: '16:10 - 17:30', name: '公民與社會', type: 'afternoon', duration: '80 分鐘', note: '16:30 截止入場，17:10 始可離場' },
        ]
      }
    ]
  }
};

const parseMinutes = (duration: string) => {
  const match = duration.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const ScheduleTable: React.FC<ScheduleTableProps> = ({ targetExam = '116gsat', tvetCategory }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [targetExam, tvetCategory]);

  const scheduleInfo = SCHEDULE_DATA[targetExam as keyof typeof SCHEDULE_DATA] || SCHEDULE_DATA['116gsat'];
  const days = useMemo(() => {
    return scheduleInfo.days.map((day) => ({
      ...day,
      subjects: day.subjects.filter((subject) => !subject.groups || !tvetCategory || subject.groups.includes(tvetCategory)),
    }));
  }, [scheduleInfo.days, tvetCategory]);

  const activeDay = days[activeIndex] || days[0];

  const isEstimated = Boolean(EXAM_PRESETS.find(exam => exam.id === targetExam)?.isEstimated) || /預估|預計/.test(scheduleInfo.title);
  const title = scheduleInfo.title.replace(/\s*[（(](預估|預計)[）)]/, '');
  const status = isEstimated ? '預估・待官方公告' : scheduleInfo.status === '大考中心暫定' ? '' : scheduleInfo.status;

  return (
    <div className="exam-plan">
      <header className="exam-plan-header">
        <div className="exam-plan-eyebrow"><span><CalendarRange size={13} aria-hidden="true" /> EXAM SCHEDULE</span>{status && <span className="exam-plan-status" data-estimated={isEstimated}>{isEstimated && <Clock size={10} aria-hidden="true" />}{status}</span>}</div>
        <h3>{title}</h3>
        <div className="exam-plan-meta"><span>{scheduleInfo.examWindow || '考試日期請參考下方日程'}</span><span><MapPin size={11} aria-hidden="true" />考場依准考證公告</span></div>
      </header>

      <div className="exam-plan-days" role="group" aria-label="選擇考試日期" style={{ gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}>
        {days.map((day, index) => <button type="button" key={`${day.date}-${index}`} onClick={() => setActiveIndex(index)} aria-pressed={index === activeIndex} data-active={index === activeIndex} className="schedule-day-button"><span className="exam-plan-day-label">DAY {String(index + 1).padStart(2, '0')}</span><span className="exam-plan-day-date"><strong>{day.date}</strong><small>{day.weekdayZh}</small></span><span className="exam-plan-day-line" /></button>)}
      </div>

      <div className="exam-plan-body">
        <div className="exam-plan-list-heading"><span>當日考程</span><small>{isEstimated ? '預估時段・供備考參考' : '時段以當年度簡章為準'}</small></div>
        {activeDay.timeline ? <table className="cap-day-timeline">
          <caption>第{activeIndex === 0 ? '一' : '二'}天｜{activeDay.date.replace('05.', '5月')}日（{activeDay.weekdayZh.replace('週', '')}）</caption>
          <thead><tr><th scope="col">時間</th><th scope="col">考試安排</th></tr></thead>
          <tbody>{activeDay.timeline.map(item => <tr key={item.time} data-kind={item.kind}><td>{item.time}</td><td><span>{item.name}</span><small>{item.minutes} 分鐘</small></td></tr>)}</tbody>
        </table> : <ol className="exam-plan-subjects" aria-label={`${activeDay.date}考科與時間`}>
          {activeDay.subjects.map((subject, index) => <li key={`${subject.time}-${subject.name}`} className="exam-plan-subject">
            <div className="exam-plan-time"><span>{subject.type === 'morning' ? '上午' : '下午'}</span><strong>{subject.time}</strong></div>
            <span className="exam-plan-subject-icon" aria-hidden="true">{getSubjectIcon(subject.name)}</span>
            <div className="exam-plan-subject-copy"><div><h4>{subject.name}</h4><span>{subject.duration}</span></div>{subject.note && <p>{subject.note}</p>}</div>
            <small className="exam-plan-sequence">{String(index + 1).padStart(2, '0')}</small>
          </li>)}
          {activeDay.subjects.length === 0 && <li className="exam-plan-empty">目前群別沒有安排考科，請切換日期查看。</li>}
        </ol>}
      </div>

      <footer className="exam-plan-footer">
        <div className="exam-plan-footer-note"><AlertCircle size={14} aria-hidden="true" /><span>{isEstimated ? '日期與科目時段均為預估，請以正式公告為準。' : '請留意入場規定，並攜帶准考證與有效證件。'}</span></div>
        <details className="exam-plan-details"><summary>查看考試須知</summary><p>{scheduleInfo.note}</p>{scheduleInfo.source && <small>資料來源：{scheduleInfo.source}</small>}</details>
      </footer>
    </div>
  );
};

export default ScheduleTable;
