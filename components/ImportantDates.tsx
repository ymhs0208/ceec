import ModalLayer from './ModalLayer';

import React, { useState, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Trash2, Plus, Flag, ChevronDown, ChevronUp, Clock, BookOpen, ListFilter, Timer, X, CalendarDays, BellRing, Sparkles, ExternalLink } from 'lucide-react';
import { CustomDate } from '../types';
import { EXAM_PRESETS } from '../constants';
import './ImportantDates.css';
import { useToday } from '../utils/useToday';
import { motion, AnimatePresence } from 'framer-motion';

export interface ScheduleItem {
  event: string;
  date: string;
  note?: string;
}

export interface ScheduleCategory {
  title: string;
  icon: React.ReactNode;
  items: ScheduleItem[];
}

const OFFICIAL_SCHEDULE_116_GSAT: ScheduleCategory[] = [
  {
    title: "簡章、報名與考試",
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { event: "116學年度考試簡章發售", date: "115.08.04" },
      { event: "高中英語聽力測驗第一次報名", date: "115.09.03 ~ 09.10" },
      { event: "第一次英聽應考服務申請", date: "115.09.03 ~ 09.10", note: "身心障礙及重大傷病考生" },
      { event: "第一次英聽報名結果檢核", date: "115.09.15 ~ 09.21" },
      { event: "第一次英聽應考服務審查結果", date: "115.10.02" },
      { event: "第一次英聽應考資訊與試場公布", date: "115.10.13" },
      { event: "高中英語聽力測驗第一次考試", date: "115.10.17" },
      { event: "第一次英聽成績公布與查詢", date: "115.10.30" },
      { event: "申請第一次英聽成績複查", date: "115.10.30 ~ 11.02" },
      { event: "第一次英聽成績複查結果公布", date: "115.11.04" },
      { event: "學科能力測驗報名", date: "115.10.27 ~ 11.10" },
      { event: "學測應考服務申請", date: "115.10.27 ~ 11.10", note: "身心障礙及重大傷病考生" },
      { event: "高中英語聽力測驗第二次報名", date: "115.11.04 ~ 11.10" },
      { event: "第二次英聽應考服務申請", date: "115.11.04 ~ 11.10", note: "身心障礙及重大傷病考生" },
      { event: "第二次英聽／學測報名結果檢核", date: "115.11.13 ~ 11.19" },
      { event: "第二次英聽應考服務審查結果", date: "115.11.24" },
      { event: "高中英語聽力測驗第二次考試", date: "115.12.12" },
      { event: "第二次英聽成績公布與查詢", date: "115.12.24" },
      { event: "申請第二次英聽成績複查", date: "115.12.24 ~ 12.28" },
      { event: "第二次英聽成績複查結果公布", date: "115.12.30" },
      { event: "學測應考服務審查結果", date: "115.12.18" },
      { event: "學測應考資訊與試場公布", date: "116.01.05" },
      { event: "學科能力測驗", date: "116.01.22 ~ 01.24" },
      { event: "學測參考答案公布", date: "116.01.23 ~ 01.25" },
      { event: "學測成績公布與查詢", date: "116.02.25" },
      { event: "寄發學測成績通知單", date: "116.02.26" },
      { event: "申請學測成績複查", date: "116.02.26 ~ 03.04" },
      { event: "學測成績複查結果公布", date: "116.03.11" },
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
      { event: "116學年度考試簡章發售", date: "115.08.04" },
      { event: "分科測驗報名", date: "116.06.03 ~ 06.15" },
      { event: "分科測驗應考服務申請", date: "116.06.03 ~ 06.15", note: "身心障礙及重大傷病考生" },
      { event: "分科測驗報名結果檢核", date: "116.06.18 ~ 06.21" },
      { event: "分科測驗應考服務審查結果", date: "116.06.25" },
      { event: "分科應考資訊與試場公布", date: "116.07.06" },
      { event: "分科測驗", date: "116.07.10 ~ 07.11" },
      { event: "分科測驗參考答案公布", date: "116.07.11 ~ 07.12" },
      { event: "分科測驗成績公布與查詢", date: "116.07.29" },
      { event: "申請分科測驗成績複查", date: "116.07.29 ~ 08.03" },
      { event: "分科測驗成績複查結果公布", date: "116.08.10" },
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

// 教育部 115.09.11 臺教授國部字第 1155404304 號函。
// 原始日程表只公布日期；各科時段仍須以會考簡章確認。
const OFFICIAL_SCHEDULE_116_CAP: ScheduleCategory[] = [
  {
    title: '會考報名、考試與成績',
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { event: '國中教育會考報名', date: '116.03.04 ~ 03.06' },
      { event: '寄發國中教育會考准考證', date: '116.04.09' },
      { event: '國中教育會考', date: '116.05.15 ~ 05.16', note: '星期六、星期日；各科時段以會考簡章為準' },
      { event: '寄發會考成績通知單並開放網路查詢', date: '116.06.04' },
    ],
  },
  {
    title: '高中職免試入學與志願選填',
    icon: <ListFilter className="w-4 h-4" />,
    items: [
      { event: '免試入學變更就學區申請', date: '116.04.22 ~ 04.29' },
      { event: '學習區完全免試入學報名', date: '116.05.04 ~ 05.05' },
      { event: '學習區完全免試入學放榜', date: '116.05.13' },
      { event: '各就學區辦理優先免試入學開始', date: '116.05.17' },
      { event: '免試入學變更就學區審查結果通知截止', date: '116.05.17' },
      { event: '各校直升入學報名', date: '116.05.27 ~ 06.04' },
      { event: '各校直升入學放榜截止', date: '116.06.11' },
      { event: '學習區完全免試入學報到', date: '116.06.14' },
      { event: '學習區完全免試入學報到後聲明放棄錄取資格', date: '116.06.15' },
      { event: '各校直升入學報到截止', date: '116.06.15', note: '含報到後聲明放棄錄取資格' },
      { event: '各就學區優先免試入學放榜、報到截止', date: '116.06.15', note: '含報到後聲明放棄錄取資格' },
      { event: '免試入學公告實際招生名額、開放個人序位查詢及志願選填', date: '116.06.18' },
      { event: '個人序位查詢及免試入學志願選填截止', date: '116.06.24' },
      { event: '各就學區高中職免試入學報名截止', date: '116.06.29' },
      { event: '各就學區免試入學放榜', date: '116.07.06' },
      { event: '各就學區免試入學報到', date: '116.07.08' },
      { event: '免試入學報到後聲明放棄錄取資格', date: '116.07.12' },
      { event: '免試入學續招學校簡章公告截止', date: '116.07.27' },
    ],
  },
  {
    title: '五專免試入學',
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { event: '五專完全免試入學報名', date: '116.04.27 ~ 05.03' },
      { event: '五專完全免試入學放榜', date: '116.05.13' },
      { event: '五專優先免試入學報名', date: '116.05.17 ~ 05.21' },
      { event: '五專優先免試入學放榜、五專完全免試入學報到截止', date: '116.06.11' },
      { event: '五專優先免試入學報到截止', date: '116.06.15', note: '含報到後聲明放棄錄取資格' },
      { event: '五專完全免試入學報到後聲明放棄錄取資格', date: '116.06.15' },
      { event: '五專聯合免試入學報名', date: '116.06.18 ~ 06.24' },
      { event: '五專聯合免試入學現場登記分發報到', date: '116.07.07' },
      { event: '五專聯合免試入學報到後聲明放棄錄取資格', date: '116.07.12' },
    ],
  },
  {
    title: '特色招生、技優與實用技能學程',
    icon: <Sparkles className="w-4 h-4" />,
    items: [
      { event: '特色招生專業群科甄選入學報名', date: '116.03.08 ~ 03.12' },
      { event: '特色招生專業群科甄選入學術科測驗', date: '116.04.10 ~ 04.11' },
      { event: '特色招生專業群科甄選入學術科測驗成績公告', date: '116.05.17' },
      { event: '技優甄審入學、實用技能學程報名', date: '116.05.20 ~ 05.21' },
      { event: '技優甄審、專業群科甄選入學及實用技能學程放榜', date: '116.06.11' },
      { event: '技優甄審、專業群科甄選入學及實用技能學程報到', date: '116.06.14' },
      { event: '技優甄審、專業群科甄選入學及實用技能學程放棄錄取資格', date: '116.06.15', note: '專業群科甄選入學含遞補截止' },
      { event: '特色招生考試分發入學學科測驗報名', date: '116.06.16 ~ 06.18' },
      { event: '特色招生考試分發入學學科測驗', date: '116.06.20' },
      { event: '特色招生考試分發入學學科測驗分數網路查詢', date: '116.06.21' },
      { event: '特色招生考試分發入學志願選填截止', date: '116.06.24' },
      { event: '特色招生考試分發入學報名截止', date: '116.06.29' },
      { event: '特色招生考試分發入學放榜', date: '116.07.06' },
      { event: '特色招生專業群科甄選入學續招簡章公告截止', date: '116.07.07' },
      { event: '特色招生考試分發入學報到', date: '116.07.08' },
      { event: '特色招生考試分發入學報到後聲明放棄錄取資格', date: '116.07.12' },
    ],
  },
  {
    title: '藝才班甄選入學',
    icon: <Sparkles className="w-4 h-4" />,
    items: [
      { event: '音樂、美術、舞蹈及戲劇班術科測驗報名', date: '116.02.22 ~ 03.08' },
      { event: '音樂、舞蹈班術科測驗', date: '116.04.10 ~ 04.12' },
      { event: '美術、戲劇班術科測驗', date: '116.04.17 ~ 04.18' },
      { event: '藝才班術科測驗成績公告', date: '116.05.04' },
      { event: '藝才班分發報名', date: '116.06.04 ~ 06.11' },
      { event: '音樂、美術及舞蹈班分發志願選填', date: '116.06.21 ~ 06.25' },
      { event: '藝才班分發放榜', date: '116.07.06' },
      { event: '藝才班報到', date: '116.07.07' },
      { event: '藝才班報到後聲明放棄錄取資格', date: '116.07.08' },
    ],
  },
  {
    title: '科學班、體育班與運動績優生',
    icon: <Flag className="w-4 h-4" />,
    items: [
      { event: '科學班甄選入學報名', date: '116.02.18 ~ 03.03' },
      { event: '科學班科學能力檢定', date: '116.03.13' },
      { event: '科學班甄選入學報到', date: '116.04.08' },
      { event: '科學班報到後聲明放棄錄取資格', date: '116.04.09' },
      { event: '運動績優生甄審、甄試報名', date: '116.04.12 ~ 05.03' },
      { event: '體育班及運動績優生獨招術科測驗報名', date: '116.05.17 ~ 05.19' },
      { event: '體育班及運動績優生獨招術科測驗', date: '116.05.22' },
      { event: '體育班及運動績優生獨招放榜', date: '116.05.24' },
      { event: '運動績優生甄試術科檢定', date: '116.06.06' },
      { event: '運動績優生甄審、甄試放榜', date: '116.06.21' },
      { event: '體育班及運動績優生報到', date: '116.07.08' },
      { event: '體育班及運動績優生報到後聲明放棄錄取資格', date: '116.07.12' },
    ],
  },
  {
    title: '其他適性入學管道',
    icon: <Calendar className="w-4 h-4" />,
    items: [
      { event: '身心障礙學生適性輔導安置報名', date: '116.02.11 ~ 02.18', note: '臺北、新北、桃園、臺中及高雄市除外' },
      { event: '建教合作班報名開始', date: '116.03.02' },
      { event: '進修部非應屆畢業生免試入學報名開始', date: '116.03.08' },
      { event: '身心障礙學生集中式特殊教育班能力評估', date: '116.04.10', note: '臺北、新北、桃園、臺中及高雄市除外' },
      { event: '身心障礙學生適性輔導安置結果公告', date: '116.06.01', note: '臺北、新北、桃園、臺中及高雄市除外' },
      { event: '建教合作班報到截止', date: '116.07.08' },
    ],
  },
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

export const getOfficialSchedule = (targetExam?: string) => {
    switch (targetExam) {
        case '116gsat':
            return OFFICIAL_SCHEDULE_116_GSAT;
        case '116ast':
            return OFFICIAL_SCHEDULE_116_AST;
        case '115tvet':
            return OFFICIAL_SCHEDULE_115_TVET;
        case '117cap':
            return [{
                title: '117 會考日程（預估）',
                icon: <BookOpen className="w-4 h-4" />,
                items: [
                    { event: '國中教育會考', date: '117.05.20 ~ 05.21（預估）', note: '暫以 2028 年 5 月第三個週末推估，正式日期以官方公告為準' },
                    { event: '報名、准考證與成績公告', date: '待公告', note: '正式日程公布後更新' },
                ],
            }];
        case '116cap':
            return OFFICIAL_SCHEDULE_116_CAP;
        case '115ast':
            return OFFICIAL_SCHEDULE_115_AST;
        default:
            return OFFICAL_SCHEDULE_DEFAULT;
    }
};

interface ImportantDatesProps {
  customDates: CustomDate[];
  setCustomDates: React.Dispatch<React.SetStateAction<CustomDate[]>>;
  onDeleteCustomDate?: (id: string) => void;
  targetExam?: string;
  onOpenOfficialSchedule?: () => void;
}

const ImportantDates: React.FC<ImportantDatesProps> = ({ customDates, setCustomDates, onDeleteCustomDate, targetExam, onOpenOfficialSchedule }) => {
  const today = useToday();
  const formId = useId();
  const isEstimated = EXAM_PRESETS.find(exam => exam.id === targetExam)?.isEstimated || false;
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
      updatedAt: Date.now(),
    };
    
    // Update parent state
    setCustomDates(prev => [...prev, newItem].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    
    setNewTitle('');
    setNewDate('');
    setIsAdding(false);
  };

  const deleteDate = (id: string) => {
    if (window.confirm('確定要刪除這個重要日程嗎？')) {
      if (onDeleteCustomDate) onDeleteCustomDate(id);
      else setCustomDates(prev => prev.filter(d => d.id !== id));
    }
  };

  const getDaysLeft = (dateStr: string) => {
    const target = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
    target.setHours(0, 0, 0, 0);
    const now = new Date(today);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const nearestEvent = useMemo(() => {
    return customDates
      .map(d => ({ ...d, daysLeft: getDaysLeft(d.date) }))
      .filter(d => d.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)[0];
  }, [customDates, today]);

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

    const now = new Date(today);

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
  }, [targetExam, today]);

  const orderedDates = [...customDates].sort((a, b) => {
    const aDays = getDaysLeft(a.date), bDays = getDaysLeft(b.date);
    if ((aDays < 0) !== (bDays < 0)) return aDays < 0 ? 1 : -1;
    return aDays < 0 ? bDays - aDays : aDays - bDays;
  });
  const upcomingCount = customDates.filter(item => getDaysLeft(item.date) >= 0).length;

  return (
    <div className="dates-panel">
      <header className="dates-header">
        <div><p className="dates-eyebrow"><CalendarDays size={13} aria-hidden="true" /> IMPORTANT DATES</p><h3>重要日程</h3><p className="dates-subtitle">把值得留意的日子，放在心上。</p></div>
        <button type="button" title="新增日程" aria-label={isAdding ? '收起新增日程' : '新增日程'} aria-expanded={isAdding} aria-controls={formId} onClick={() => setIsAdding(value => !value)} className="dates-add-toggle">{isAdding ? <X size={16} /> : <Plus size={16} />}<span>{isAdding ? '收起' : '新增'}</span></button>
      </header>

      <div className="dates-scroll">
        {isAdding && <form id={formId} className="dates-composer" onSubmit={handleAddDate}>
          <div className="dates-composer-heading"><span>記下一個重要的日子</span><small>自訂提醒</small></div>
          <label>日程名稱<input type="text" aria-label="日程名稱" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="例如：模擬考、志願選填" maxLength={15} autoFocus required /></label>
          <div className="dates-composer-bottom"><label>日期<input type="date" aria-label="日程日期" value={newDate} onChange={e => setNewDate(e.target.value)} max="2030-12-31" required /></label><button type="submit" disabled={!newTitle.trim() || !newDate}><Plus size={14} aria-hidden="true" />儲存</button></div>
        </form>}

        {(nearestOfficialEvent || nearestEvent) && <section className="dates-next" aria-label="接下來的重要日子">
          <div className="dates-section-heading"><span><i />接下來，別錯過</span><small>{new Date(today).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}</small></div>
          {nearestOfficialEvent && <div className="important-date-highlight dates-feature dates-feature--exam">
            <div className="dates-feature-copy"><span className="dates-type"><BookOpen size={11} aria-hidden="true" />{isEstimated ? '考試參考・預估' : '考試參考日程'}</span><h4>{nearestOfficialEvent.event}</h4><p>{nearestOfficialEvent.date}</p></div>
            <div className="dates-countdown"><span>{nearestOfficialEvent.daysLeft === 0 ? '就在今天' : '距離還有'}</span><div><strong className="text-4xl">{nearestOfficialEvent.daysLeft}</strong><small>天</small></div></div>
          </div>}
          {nearestEvent && <div className="important-date-highlight dates-feature dates-feature--personal">
            <div className="dates-feature-copy"><span className="dates-type"><Flag size={11} aria-hidden="true" />我的重要提醒</span><h4>{nearestEvent.title}</h4><p>{nearestEvent.date.replaceAll('-', '.')}</p></div>
            <div className="dates-countdown"><span>{nearestEvent.daysLeft === 0 ? '就在今天' : '距離還有'}</span><div><strong className="text-4xl">{nearestEvent.daysLeft}</strong><small>天</small></div></div>
          </div>}
        </section>}

        <section className="dates-personal" aria-label="我的自訂日程">
          <div className="dates-section-heading"><span>我的日程</span><small>{customDates.length ? `${upcomingCount} 件待到來` : '為下一步，留個提醒'}</small></div>
          <div className="dates-timeline">{orderedDates.map(item => {
            const daysLeft = getDaysLeft(item.date);
            const date = new Date(`${item.date.slice(0, 10)}T00:00:00`);
            return <div className="dates-timeline-item" key={item.id} data-past={daysLeft < 0} data-today={daysLeft === 0}>
              <time className="dates-date-tile" dateTime={item.date}><span>{date.getMonth() + 1} 月</span><strong>{date.getDate().toString().padStart(2, '0')}</strong></time>
              <div className="dates-item-copy"><h4>{item.title}</h4><p><span>{daysLeft < 0 ? '已結束' : daysLeft === 0 ? '就是今天' : `還剩 ${daysLeft} 天`}</span><small>{date.getFullYear()} 年</small></p></div>
              <button type="button" className="dates-delete" aria-label={`刪除日程：${item.title}`} onClick={() => deleteDate(item.id)}><Trash2 size={14} /></button>
            </div>;
          })}</div>
          {customDates.length === 0 && <div className="dates-empty"><span aria-hidden="true"><CalendarDays size={25} strokeWidth={1.3} /><i /></span><strong>下一個重要日子，是哪一天？</strong><p>加入考試、報名或自己的小目標，<br />讓期待的日子，有個位置。</p><button type="button" onClick={() => setIsAdding(true)}><Plus size={13} aria-hidden="true" />新增第一個日程</button></div>}
        </section>
      </div>
      <button type="button" className="dates-official-link" onClick={() => { if (onOpenOfficialSchedule) onOpenOfficialSchedule(); else setIsScheduleModalOpen(true); }}><span className="dates-official-icon"><BookOpen size={17} /></span><span><strong>官方參考日程</strong><small>查看報名、考試與成績等完整時程</small></span><ExternalLink size={15} /></button>
      {typeof document !== 'undefined' && createPortal(
                   <AnimatePresence>
                     {isScheduleModalOpen && (
                         <ModalLayer className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
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
                         </ModalLayer>
                     )}
                   </AnimatePresence>,
                   document.body
                 )}
    </div>
  );
};

export default ImportantDates;
