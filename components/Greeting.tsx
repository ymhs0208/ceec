import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { motion } from 'framer-motion';
import { Sun, Sunset, Moon, Coffee } from 'lucide-react';
import { GREETINGS } from '../data/greetings';

interface GreetingProps {
  user: User | null;
  targetExam?: string;
}

const GREETING_EXTENSIONS: Record<keyof typeof GREETINGS, string[]> = {
  morning: [
    '先選一件最重要的小事開始，完成它，你就會更有前進的力量。',
    '不需要一次做到完美；把今天第一個專注時段交給自己就很好。',
    '喝口水、整理桌面，讓清醒的節奏陪你展開今天。',
  ],
  afternoon: [
    '補充水分、伸展一下，再用一小段專注把自己的節奏找回來。',
    '先完成眼前最重要的一題或一頁，下午也能累積很扎實的進度。',
    '感到疲倦很正常，短暫休息後再出發，就是一種成熟的自律。',
  ],
  evening: [
    '先收好雜念，完成一件最重要的事，讓今天有個踏實的收尾。',
    '把今天學到的重點簡單整理，明天的自己會謝謝現在的你。',
    '不用和別人比較；專心走好自己的節奏，累積就會發生。',
  ],
  night: [
    '現在最重要的是好好休息，讓大腦整理今天所學，明天再用更好的狀態出發。',
    '把未完成的事寫下來交給明天，今晚先把睡眠和自己照顧好。',
    '真正走得遠的人，也懂得在該休息的時候好好停下來。',
  ],
};

const Greeting: React.FC<GreetingProps> = ({ user, targetExam }) => {
  const [greetingData, setGreetingData] = useState<{ title: string; message: string; detail: string; icon: React.ReactNode; color: string }>({
    title: '',
    message: '',
    detail: '',
    icon: <Sun />,
    color: 'from-orange-400 to-amber-500'
  });

  useEffect(() => {
    // Determine time period
    const hour = new Date().getHours();
    let period: keyof typeof GREETINGS;
    let titleStr = '';
    let iconNode;
    let colorClass = '';

    if (hour >= 5 && hour < 12) {
      period = 'morning';
      titleStr = '早安';
      iconNode = <Sun className="w-5 h-5 text-amber-500" />;
      colorClass = 'bg-amber-50 border-amber-100';
    } else if (hour >= 12 && hour < 18) {
      period = 'afternoon';
      titleStr = '午安';
      iconNode = <Coffee className="w-5 h-5 text-orange-500" />;
      colorClass = 'bg-orange-50 border-orange-100';
    } else if (hour >= 18 && hour < 23) {
      period = 'evening';
      titleStr = '晚安';
      iconNode = <Sunset className="w-5 h-5 text-indigo-500" />;
      colorClass = 'bg-indigo-50 border-indigo-100';
    } else {
      period = 'night';
      titleStr = '夜深了';
      iconNode = <Moon className="w-5 h-5 text-blue-500" />;
      colorClass = 'bg-blue-50 border-blue-100';
    }

    // Prevent repeating the exact last message if possible
    const messages = GREETINGS[period];
    let possibleMsgs = messages;
    
    // Try to get last message from local storage to prevent immediate repetition
    try {
        const lastMsg = localStorage.getItem('gsat_last_greeting');
        if (lastMsg && messages.includes(lastMsg) && messages.length > 1) {
            possibleMsgs = messages.filter(m => m !== lastMsg);
        }
    } catch (e) {
        // ignore storage errors
    }

    const randomMsg = possibleMsgs[Math.floor(Math.random() * possibleMsgs.length)];
    const extensions = GREETING_EXTENSIONS[period];
    const detail = extensions[Math.floor(Math.random() * extensions.length)];

    try {
        localStorage.setItem('gsat_last_greeting', randomMsg);
    } catch (e) {}

    const currentExam = targetExam || (() => {
      try { return localStorage.getItem('gsat_target_exam') || ''; } catch { return ''; }
    })();
    const name = user && user.name ? user.name : currentExam.endsWith('cap') ? '未來高中生' : '未來大學生';
    
    setGreetingData({
      title: `${titleStr}，${name}！`,
      message: randomMsg,
      detail,
      icon: iconNode,
      color: colorClass
    });
  }, [user, targetExam]);

  if (!greetingData.title) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`home-greeting col-span-3 rounded-[1.5rem] p-4 flex items-center justify-between gap-4 border ${greetingData.color}`}
    >
      <div className="flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
            {greetingData.icon}
        </div>
        <div className="flex flex-col flex-grow">
            <span className="text-xs font-bold text-slate-700">{greetingData.title}</span>
            <span className="text-[10px] text-slate-600/80 leading-snug">{greetingData.message}</span>
            <span className="mt-1 text-[10px] font-medium text-slate-500 leading-snug">{greetingData.detail}</span>
        </div>
        <div className="hidden sm:flex gap-1.5 shrink-0 ml-auto self-center">
             {[1,2,3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i===3 ? 'bg-indigo-400' : 'bg-slate-200'} animate-pulse`} style={{ animationDelay: `${i*200}ms` }}></div>)}
        </div>
      </div>
    </motion.div>
  );
};

export default Greeting;
