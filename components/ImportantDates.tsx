
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Trash2, Plus, Flag, ChevronDown, ChevronUp, Clock, BookOpen, ListFilter, Timer, X, CalendarDays, BellRing, Sparkles, ExternalLink } from 'lucide-react';
import { CustomDate } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduleItem {
  event: string;
  date: string;
  note?: string;
}

interface ScheduleCategory {
  title: string;
  icon: React.ReactNode;
  items: ScheduleItem[];
}

const OFFICIAL_SCHEDULE_116_GSAT: ScheduleCategory[] = [
  {
    title: "簡章、報名與考試",
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { event: "116學年度考試簡章公告與發售", date: "115.08.04", note: "實際日期以簡章為準" },
      { event: "高中英語聽力測驗第一次報名", date: "115.09.03 ~ 09.10" },
      { event: "高中英語聽力測驗第一次考試", date: "115.10.17" },
      { event: "學科能力測驗報名", date: "115.10.27 ~ 11.10" },
      { event: "高中英語聽力測驗第二次報名", date: "115.11.04 ~ 11.10" },
      { event: "高中英語聽力測驗第二次考試", date: "115.12.12" },
      { event: "學科能力測驗", date: "116.01.22 ~ 01.24", note: "暫定考試日期" },
      { event: "學測放榜", date: "預計 116.02" },
    ]
  },
  {
    title: "第一階段 (個申)",
    icon: <ListFilter className="w-4 h-4" />,
    items: [
      { event: "個申報名", date: "預計 116.03", note: "網路報名" },
      { event: "一階篩選結果", date: "預計 116.03 底" },
    ]
  },
  {
    title: "考程：1月22日 (五)",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "數學 A", date: "09:20 ~ 11:00", note: "100分鐘" },
      { event: "自然", date: "12:50 ~ 14:40", note: "110分鐘" }
    ]
  },
  {
    title: "考程：1月23日 (六)",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "英文", date: "09:20 ~ 11:00", note: "100分鐘" },
      { event: "國綜", date: "12:50 ~ 14:20", note: "90分鐘" },
      { event: "國寫", date: "15:20 ~ 16:50", note: "90分鐘" }
    ]
  },
  {
    title: "考程：1月24日 (日)",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "數學 B", date: "09:20 ~ 11:00", note: "100分鐘" },
      { event: "社會", date: "12:50 ~ 14:40", note: "110分鐘" }
    ]
  },
];

const OFFICIAL_SCHEDULE_116_AST: ScheduleCategory[] = [
  {
    title: "報名與考試",
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { event: "116學年度考試簡章公告與發售", date: "115.08.04", note: "實際日期以簡章為準" },
      { event: "分科測驗報名", date: "116.06.03 ~ 06.15" },
      { event: "分科測驗", date: "116.07.10 ~ 07.11", note: "暫定考試日期" },
      { event: "放榜/成績公布", date: "116.07.28", note: "預計" },
    ]
  },
  {
    title: "考程：7月10日 (六)",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "物理", date: "08:40 ~ 10:00", note: "80分鐘" },
      { event: "化學", date: "10:50 ~ 12:10", note: "80分鐘" },
      { event: "數學甲", date: "14:00 ~ 15:20", note: "80分鐘" },
      { event: "生物", date: "16:10 ~ 17:30", note: "80分鐘" }
    ]
  },
  {
    title: "考程：7月11日 (日)",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "歷史", date: "08:40 ~ 10:00", note: "80分鐘" },
      { event: "地理", date: "10:50 ~ 12:10", note: "80分鐘" },
      { event: "公民與社會", date: "14:00 ~ 15:20", note: "80分鐘" }
    ]
  }
];

const OFFICIAL_SCHEDULE_115_TVET: ScheduleCategory[] = [
  {
    title: "報名階段",
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { event: "學校集體報名", date: "114.11.27 ~ 12.17", note: "含報名費繳費" },
      { event: "個別網路報名", date: "114.12.05 ~ 12.17", note: "上午9時起至下午5時止" },
      { event: "報名結果確認", date: "115.01.02 ~ 01.09", note: "網路查詢及確認" },
      { event: "資料錯誤更正截止", date: "115.01.09", note: "截止日" },
    ]
  },
  {
    title: "考試階段",
    icon: <ListFilter className="w-4 h-4" />,
    items: [
      { event: "寄發准考證", date: "115.03.18" },
      { event: "公布考試地點", date: "115.04.15", note: "上午9時起" },
      { event: "統一入學測驗", date: "115.04.25 ~ 04.26", note: "正式考試" },
      { event: "公布試題", date: "115.04.25 ~ 04.26" },
      { event: "公布參考答案", date: "115.04.27", note: "上午9時起" },
    ]
  },
  {
    title: "考程：4月25日 (六)",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "專業科目(二)", date: "10:20 ~ 12:00", note: "群別 03, 07, 12, 15, 51-53, 55-56" },
      { event: "國文", date: "13:30 ~ 15:10", note: "下午第一考科" },
      { event: "英文", date: "16:00 ~ 17:40", note: "下午第二考科" }
    ]
  },
  {
    title: "考程：4月26日 (日)",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "專業科目(二)", date: "08:30 ~ 10:10", note: "群別 01-02, 04-06, 08-11, 13-14, 17-20, 51-54, 56" },
      { event: "數學", date: "11:00 ~ 12:20", note: "" },
      { event: "專業科目(一)", date: "13:30 ~ 15:10", note: "下午第一考科" },
      { event: "專業科目(二)", date: "16:00 ~ 17:40", note: "群別 16, 54-56" }
    ]
  },
  {
    title: "成績與複查",
    icon: <Sparkles className="w-4 h-4" />,
    items: [
      { event: "成績公告與查詢", date: "115.05.14", note: "下午2時起" },
      { event: "申請成績複查", date: "115.05.14 ~ 05.18", note: "下午5時前" },
      { event: "成績複查結果查詢", date: "115.05.22", note: "下午5時起" },
    ]
  }
];

const OFFICIAL_SCHEDULE_115_CAP: ScheduleCategory[] = [
  {
    title: "報名與考試",
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { event: "會考報名", date: "115.03.05 ~ 03.07" },
      { event: "寄發准考證", date: "115.04.10" },
      { event: "國中教育會考", date: "115.05.16 ~ 05.17", note: "正式考試" },
    ]
  },
  {
    title: "考程：5月16日 (六)",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "社會", date: "08:30 ~ 09:40", note: "70分鐘" },
      { event: "數學", date: "10:30 ~ 11:50", note: "80分鐘" },
      { event: "國文", date: "13:50 ~ 15:00", note: "70分鐘" },
      { event: "寫作測驗", date: "15:50 ~ 16:40", note: "50分鐘" }
    ]
  },
  {
    title: "考程：5月17日 (日)",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "自然", date: "08:30 ~ 09:40", note: "70分鐘" },
      { event: "英語 (閱讀)", date: "10:30 ~ 11:30", note: "60分鐘" },
      { event: "英語 (聽力)", date: "12:05 ~ 12:30", note: "25分鐘" }
    ]
  },
  {
    title: "成績與志願",
    icon: <Sparkles className="w-4 h-4" />,
    items: [
      { event: "成績公布", date: "115.06.05" },
      { event: "序位區間公告", date: "115.06.18" },
      { event: "免試入學填志願", date: "115.06.18 起", note: "結束依各區為主" },
    ]
  },
  {
    title: "放榜與報到",
    icon: <ListFilter className="w-4 h-4" />,
    items: [
      { event: "免試入學放榜", date: "115.07.07", note: "依各地區為主" },
      { event: "免試入學報到", date: "115.07.09" }
    ]
  }
];

const OFFICIAL_SCHEDULE_115_AST: ScheduleCategory[] = [
  {
    title: "報名與考場",
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { event: "考試報名", date: "115.06.03 ~ 06.16", note: "下午5點截止" },
      { event: "應考/考場查詢", date: "115.07.07", note: "上午9點起" }
    ]
  },
  {
    title: "考試與成績",
    icon: <Timer className="w-4 h-4" />,
    items: [
      { event: "查看試場", date: "115.07.12", note: "下午4點至6點" },
      { event: "分科測驗", date: "115.07.13 ~ 07.14", note: "因颱風順延" },
      { event: "放榜/成績公布", date: "115.08.03", note: "上午9點起" },
      { event: "成績複查申請", date: "115.08.03 ~ 08.06", note: "下午5點截止" },
      { event: "成績複查結果", date: "115.08.13", note: "開放查詢" },
    ]
  },
  {
    title: "志願與分發",
    icon: <ListFilter className="w-4 h-4" />,
    items: [
      { event: "登記註冊繳費", date: "115.07.29 ~ 08.04", note: "中午12點截止" },
      { event: "登記選填志願", date: "115.08.01 ~ 08.04", note: "下午4點30分截止" },
      { event: "錄取公告", date: "115.08.13 ~ 08.15", note: "分發入學" }
    ]
  }
];

const OFFICAL_SCHEDULE_DEFAULT: ScheduleCategory[] = [
    {
      title: "準備中",
      icon: <Clock className="w-4 h-4" />,
      items: [
        { event: "官方日程尚待更新", date: "持續關注", note: "系統將自動更新" }
      ]
    }
];

const getOfficialSchedule = (targetExam?: string) => {
    switch (targetExam) {
        case '116gsat':
            return OFFICIAL_SCHEDULE_116_GSAT;
        case '116ast':
            return OFFICIAL_SCHEDULE_116_AST;
        case '115tvet':
            return OFFICIAL_SCHEDULE_115_TVET;
        case '115cap':
            return OFFICIAL_SCHEDULE_115_CAP;
        case '115ast':
            return OFFICIAL_SCHEDULE_115_AST;
        default:
            return OFFICAL_SCHEDULE_DEFAULT;
    }
};

interface ImportantDatesProps {
  customDates: CustomDate[];
  setCustomDates: React.Dispatch<React.SetStateAction<CustomDate[]>>;
  targetExam?: string;
}

const ImportantDates: React.FC<ImportantDatesProps> = ({ customDates, setCustomDates, targetExam }) => {
  // Local UI state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const handleAddDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    // Validation
    if (newTitle.length > 15) {
       alert("標題請控制在 15 字以內");
       return;
    }
    if (/[<>]/.test(newTitle)) {
       alert("標題不可包含特殊符號");
       return;
    }

    if (!window.confirm('確定要新增這個重要日程嗎？')) {
        return;
    }

    const newItem: CustomDate = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      date: newDate,
    };
    
    // Update parent state
    setCustomDates(prev => [...prev, newItem].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    
    setNewTitle('');
    setNewDate('');
    setIsAdding(false);
  };

  const deleteDate = (id: string) => {
    if (window.confirm('確定要刪除這個重要日程嗎？')) {
      setCustomDates(prev => prev.filter(d => d.id !== id));
    }
  };

  const getDaysLeft = (dateStr: string) => {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const nearestEvent = useMemo(() => {
    return customDates
      .map(d => ({ ...d, daysLeft: getDaysLeft(d.date) }))
      .filter(d => d.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)[0];
  }, [customDates]);

  const nearestOfficialEvent = useMemo(() => {
    const categories = getOfficialSchedule(targetExam);
    const allItems = categories.flatMap(cat => cat.items);
    
    const parseOfficialDate = (dateStr: string) => {
        // Extract 115.04.25 or 116.01.22
        const match = dateStr.match(/(\d{3})\.(\d{2})\.(\d{2})/);
        if (match) {
            const year = parseInt(match[1]) + 1911;
            const month = parseInt(match[2]) - 1;
            const day = parseInt(match[3]);
            return new Date(year, month, day);
        }
        // Handle range starts like 115.05.16 ~ 05.17
        const rangeMatch = dateStr.match(/(\d{3})\.(\d{2})\.(\d{2})\s*~/);
        if (rangeMatch) {
            const year = parseInt(rangeMatch[1]) + 1911;
            const month = parseInt(rangeMatch[2]) - 1;
            const day = parseInt(rangeMatch[3]);
            return new Date(year, month, day);
        }
        return null;
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return allItems
      .map(item => {
          const date = parseOfficialDate(item.date);
          if (!date) return { ...item, daysLeft: -1 };
          const diff = date.getTime() - now.getTime();
          const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
          return { ...item, daysLeft };
      })
      .filter(item => item.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)[0];
  }, [targetExam]);

  return (
    <div className="w-full h-full flex flex-col bg-white/90 backdrop-blur-2xl rounded-[2rem] overflow-hidden border border-white/80 shadow-2xl shadow-indigo-100/60 relative">
        {/* Decorative background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

        <div className="p-6 flex-grow flex flex-col min-h-0 relative z-10">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-200/50">
                        <Flag className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">重要日程</h3>
                        <p className="text-xs text-slate-500 font-medium tracking-wider uppercase mt-0.5">Important Dates</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${isAdding ? 'bg-slate-100 text-slate-600 rotate-45' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 hover:scale-105 hover:shadow-indigo-100'}`}
                    title="新增日程"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-grow min-h-0 overflow-y-auto pr-2 custom-scrollbar flex flex-col space-y-6">
                
                {/* Nearest Events Highlights */}
                <AnimatePresence mode="popLayout">
                {(nearestOfficialEvent || nearestEvent) && (
                    <div className="flex flex-col gap-4 flex-shrink-0 pt-1">
                        {/* Official Countdown Card */}
                        {nearestOfficialEvent && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative overflow-hidden rounded-[1.5rem] bg-indigo-600 p-5 text-white shadow-xl shadow-indigo-200/50 flex flex-col group"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-2 opacity-90">
                                            <div className="p-1 px-2 bg-white/20 rounded-md backdrop-blur-md border border-white/20">
                                                <span className="text-[10px] font-bold tracking-widest uppercase">官方時程</span>
                                            </div>
                                        </div>
                                        <h4 className="text-xl font-black leading-tight mb-1 truncate max-w-[180px]">{nearestOfficialEvent.event}</h4>
                                        <div className="text-xs text-indigo-100 font-medium">日期：{nearestOfficialEvent.date}</div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="text-4xl font-black leading-none">{nearestOfficialEvent.daysLeft}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-tighter opacity-80 mt-1">DAYS TO GO</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Custom Countdown Card */}
                        {nearestEvent && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-purple-500 to-indigo-600 p-5 text-white shadow-xl shadow-indigo-100/50 flex flex-col group"
                            >
                                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-2 opacity-90">
                                            <div className="p-1 px-2 bg-white/20 rounded-md backdrop-blur-md border border-white/20">
                                                <span className="text-[10px] font-bold tracking-widest uppercase">重要提醒</span>
                                            </div>
                                        </div>
                                        <h4 className="text-xl font-black leading-tight mb-1 truncate max-w-[180px]">{nearestEvent.title}</h4>
                                        <div className="text-xs text-indigo-100 font-medium">{nearestEvent.date.replace(/-/g, '.')}</div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="text-4xl font-black leading-none">{nearestEvent.daysLeft}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-tighter opacity-80 mt-1">DAYS TO GO</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
                </AnimatePresence>

                {/* Add Date Form */}
                <AnimatePresence>
                {isAdding && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden flex-shrink-0"
                    >
                        <form onSubmit={handleAddDate} className="p-5 bg-gradient-to-b from-indigo-50/50 to-white rounded-[1.5rem] border border-indigo-100 shadow-inner relative">
                            <button 
                                type="button" 
                                onClick={() => setIsAdding(false)}
                                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <h4 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                <div className="p-1 bg-indigo-100 rounded-md text-indigo-600">
                                    <Plus className="w-3.5 h-3.5" />
                                </div>
                                新增重要日程
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <input 
                                        type="text" 
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="事項名稱 (限15字)"
                                        maxLength={15}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all shadow-sm"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <input 
                                        type="date" 
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        max="2030-12-31"
                                        className="flex-grow bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all shadow-sm"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!newTitle.trim() || !newDate}
                                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 active:scale-95"
                                    >
                                        儲存
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
                </AnimatePresence>

                {/* Custom Dates List */}
                <div className="space-y-3 flex-shrink-0">
                     <AnimatePresence mode="popLayout">
                     {customDates.map((item) => {
                    const daysLeft = getDaysLeft(item.date);
                    const isNearest = nearestEvent && nearestEvent.id === item.id;
                    const dateObj = new Date(item.date);
                    
                    return (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            key={item.id} 
                            className={`group relative flex items-center p-4 rounded-[1.25rem] border transition-all duration-300 ${isNearest ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-sm' : 'bg-white/60 border-slate-200/60 hover:bg-white hover:border-slate-300 hover:shadow-md'}`}
                        >
                            {/* Date Box */}
                            <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl mr-4 flex-shrink-0 transition-all duration-300 ${isNearest ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 mb-0.5 leading-none mt-1">
                                    {dateObj.toLocaleString('en-US', { month: 'short' })}
                                </span>
                                <span className="text-xl font-black leading-none">
                                    {dateObj.getDate()}
                                </span>
                            </div>

                            <div className="min-w-0 flex-1 mr-3">
                                <div className={`text-base font-bold truncate mb-1 transition-colors ${isNearest ? 'text-indigo-900' : 'text-slate-700 group-hover:text-slate-900'}`}>{item.title}</div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${daysLeft < 0 ? 'bg-slate-100 text-slate-500 border-slate-200' : isNearest ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors'}`}>
                                        {daysLeft < 0 ? "已結束" : `還剩 ${daysLeft} 天`}
                                    </span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => deleteDate(item.id)} 
                                className="opacity-0 group-hover:opacity-100 w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 flex-shrink-0 shadow-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </motion.div>
                    );
                 })}
                 </AnimatePresence>
                 {customDates.length === 0 && (
                     <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-40 text-slate-400 border-2 border-dashed border-slate-200/60 rounded-[1.5rem] bg-white/40"
                     >
                         <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                            <CalendarDays className="w-6 h-6 text-slate-400" />
                         </div>
                         <span className="text-sm font-bold text-slate-500">尚無自訂日程</span>
                         <span className="text-xs font-medium opacity-70 mt-1">點擊右上角 + 新增考試或活動</span>
                     </motion.div>
                 )}
                </div>
                
                {/* Official Schedule Section */}
                <div className="mt-4 pt-4 border-t border-slate-200/60 flex-shrink-0 pb-8">
                     <button 
                        onClick={() => setIsScheduleModalOpen(true)} 
                    className="flex items-center justify-between w-full p-3 rounded-2xl hover:bg-slate-50 transition-all duration-300 group border border-transparent hover:border-slate-200/60"
                 >
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors text-slate-500">
                             <BookOpen className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">官方參考日程</span>
                     </div>
                     <div className="p-1.5 rounded-xl transition-all duration-300 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600">
                        <ExternalLink className="w-4 h-4" />
                     </div>
                 </button>
                 
                 {typeof document !== 'undefined' && createPortal(
                   <AnimatePresence>
                     {isScheduleModalOpen && (
                         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl relative border border-white/50 flex flex-col max-h-[85vh] overflow-hidden"
                            >
                              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                                 <h2 className="text-lg font-black tracking-tight text-slate-800 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-indigo-600" />
                                    官方參考日程
                                 </h2>
                                 <button
                                   onClick={() => setIsScheduleModalOpen(false)}
                                   className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                                 >
                                    <X className="w-5 h-5" />
                                 </button>
                              </div>
                              
                              <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6">
                                  {getOfficialSchedule(targetExam).map((category, idx) => (
                                      <div key={idx} className="relative pl-6 border-l-2 border-indigo-100">
                                          <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center shadow-sm">
                                              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                          </div>
                                          <h5 className="text-xs font-black text-indigo-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                              <span className="p-1.5 bg-indigo-50 rounded-md text-indigo-600">
                                                 {category.icon}
                                              </span>
                                              {category.title}
                                          </h5>
                                          <div className="space-y-3">
                                              {category.items.map((item, i) => (
                                                  <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all group gap-2 sm:gap-0">
                                                      <div>
                                                          <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">{item.event}</div>
                                                          {item.note && <div className="text-[10px] text-slate-400 mt-1.5 font-medium bg-slate-50 inline-block px-2 py-0.5 rounded">{item.note}</div>}
                                                      </div>
                                                      <span className="text-xs font-mono font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-100 transition-colors">
                                                          {item.date}
                                                      </span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                                 <button
                                   onClick={() => setIsScheduleModalOpen(false)}
                                   className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                                 >
                                    關閉
                                 </button>
                              </div>
                            </motion.div>
                         </div>
                     )}
                   </AnimatePresence>,
                   document.body
                 )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ImportantDates;
