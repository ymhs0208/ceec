import React, { useEffect, useMemo, useState } from 'react';
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
    title: '116 會考日程 (預計)',
    note: '考試說明時間為各科考前10分鐘。英語聽力測驗撥音後即不得入場。',
    examWindow: '116.05.15 - 05.16',
    status: '預估日程',
    days: [
      {
        date: '05.15', weekday: 'Saturday', weekdayZh: '週六',
        subjects: [
          { time: '08:30 - 09:40', name: '社會', type: 'morning', duration: '70 分鐘' },
          { time: '10:30 - 11:50', name: '數學', type: 'morning', duration: '80 分鐘' },
          { time: '13:50 - 15:00', name: '國文', type: 'afternoon', duration: '70 分鐘' },
          { time: '15:50 - 16:40', name: '寫作測驗', type: 'afternoon', duration: '50 分鐘' },
        ]
      },
      {
        date: '05.16', weekday: 'Sunday', weekdayZh: '週日',
        subjects: [
          { time: '08:30 - 09:40', name: '自然', type: 'morning', duration: '70 分鐘' },
          { time: '10:30 - 11:30', name: '英語 (閱讀)', type: 'morning', duration: '60 分鐘' },
          { time: '12:05 - 12:30', name: '英語 (聽力)', type: 'afternoon', duration: '25 分鐘' },
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
  '115cap': {
    title: '115 會考日程',
    note: '考試說明時間為各科考前10分鐘。英語聽力測驗撥音後即不得入場。',
    examWindow: '115.05.16 - 05.17',
    status: '正式日程',
    days: [
      {
        date: '05.16', weekday: 'Saturday', weekdayZh: '週六',
        subjects: [
          { time: '08:30 - 09:40', name: '社會', type: 'morning', duration: '70 分鐘' },
          { time: '10:30 - 11:50', name: '數學', type: 'morning', duration: '80 分鐘' },
          { time: '13:50 - 15:00', name: '國文', type: 'afternoon', duration: '70 分鐘' },
          { time: '15:50 - 16:40', name: '寫作測驗', type: 'afternoon', duration: '50 分鐘' },
        ]
      },
      {
        date: '05.17', weekday: 'Sunday', weekdayZh: '週日',
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
  const totalSubjects = days.reduce((sum, day) => sum + day.subjects.length, 0);
  const activeDayMinutes = activeDay.subjects.reduce((sum, subject) => sum + parseMinutes(subject.duration), 0);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-white/90 backdrop-blur-2xl rounded-[2rem] overflow-hidden border border-white/80 shadow-2xl shadow-indigo-100/60 relative">
      <div className="px-4 md:px-5 py-4 border-b border-slate-100/70 bg-gradient-to-r from-indigo-50/80 to-sky-50/60">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white text-indigo-700 border border-indigo-100 shadow-sm flex items-center justify-center flex-shrink-0">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">{scheduleInfo.title}</h3>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black">
                    {scheduleInfo.status || '考程'}
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-white/80 text-xs text-slate-600 font-bold flex-shrink-0 shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              考場待定
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="考試天數" value={`${days.length} 天`} />
            <Metric label="考科時段" value={`${totalSubjects} 場`} />
            <Metric label="本日總長" value={`${activeDayMinutes} 分`} />
          </div>
        </div>
      </div>

      <div className="px-4 md:px-5 pt-3 pb-2 bg-white/70 border-b border-slate-100">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}>
          {days.map((day, index) => {
            const isActive = index === activeIndex;
            const minutes = day.subjects.reduce((sum, subject) => sum + parseMinutes(subject.duration), 0);
            return (
              <button
                key={`${day.date}-${index}`}
                onClick={() => setActiveIndex(index)}
                className={`relative rounded-2xl border p-2.5 text-left transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200 shadow-md shadow-indigo-100/70'
                    : 'bg-white/80 text-slate-600 border-slate-100 hover:border-indigo-200 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeScheduleDay"
                    className="absolute inset-0 rounded-2xl border border-indigo-200"
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <div className="relative z-10">
                  <div className={`text-[10px] font-black ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>DAY {index + 1}</div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2">
                    <span className="text-sm md:text-base font-black font-mono">{day.date}</span>
                    <span className={`text-[11px] font-bold ${isActive ? 'text-indigo-500' : 'text-slate-500'}`}>{day.weekdayZh}</span>
                  </div>
                  <div className={`mt-1.5 text-[10px] font-bold ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>
                    {day.subjects.length} 場 · {minutes} 分
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar px-4 md:px-5 py-3 bg-white/70">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${targetExam}-${tvetCategory || 'all'}-${activeIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="relative"
          >
            <div className="absolute left-[18px] top-4 bottom-4 w-px bg-slate-200" />
            <div className="space-y-2.5">
              {activeDay.subjects.map((subject, index) => {
                const style = getSubjectStyle(subject.name);
                return (
                  <motion.div
                    key={`${subject.time}-${subject.name}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="relative pl-12"
                  >
                    <div className={`absolute left-0 top-4 w-9 h-9 rounded-2xl ${style.bg} ${style.text} ${style.ring} border flex items-center justify-center z-10 shadow-sm`}>
                      {getSubjectIcon(subject.name)}
                    </div>
                    <div className="rounded-[1.25rem] border border-slate-100 bg-white p-3 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-6 rounded-full ${style.line}`} />
                            <h4 className="text-base font-black text-slate-900 truncate">{subject.name}</h4>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {subject.time}
                            </span>
                            <span className="rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1">{subject.duration}</span>
                            <span className={`rounded-md px-2.5 py-1 border ${subject.type === 'morning' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                              {subject.type === 'morning' ? '上午場' : '下午場'}
                            </span>
                          </div>
                          {subject.note && (
                            <p className="mt-2 text-xs leading-relaxed text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                              {subject.note}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 sm:pt-1">
                          <span className="font-mono">{String(index + 1).padStart(2, '0')}</span>
                          <span>/</span>
                          <span className="font-mono">{String(activeDay.subjects.length).padStart(2, '0')}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 md:px-5 py-3 bg-amber-50/80 border-t border-amber-100/80">
        <div className="flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
          <div className="w-7 h-7 rounded-xl bg-white border border-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="flex-1">
            <span className="font-black">考試須知：</span>
            {scheduleInfo.note}
            {scheduleInfo.source && <span className="hidden sm:block mt-1 text-amber-700/80">資料來源：{scheduleInfo.source}</span>}
          </p>
          <ShieldCheck className="hidden sm:block w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};

interface MetricProps {
  label: string;
  value: string;
}

const Metric: React.FC<MetricProps> = ({ label, value }) => (
  <div className="rounded-2xl bg-white/80 border border-white/80 px-3 py-1.5 shadow-sm">
    <div className="text-[10px] font-black text-slate-400">{label}</div>
    <div className="mt-0.5 text-sm font-black text-slate-900">{value}</div>
  </div>
);

export default ScheduleTable;
