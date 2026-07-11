import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { motion } from 'framer-motion';
import { Sun, Sunset, Moon, Coffee } from 'lucide-react';
import { GREETINGS } from '../data/greetings';

interface GreetingProps {
  user: User | null;
}

const Greeting: React.FC<GreetingProps> = ({ user }) => {
  const [greetingData, setGreetingData] = useState<{ title: string; message: string; icon: React.ReactNode; color: string }>({
    title: '',
    message: '',
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

    try {
        localStorage.setItem('gsat_last_greeting', randomMsg);
    } catch (e) {}

    const name = user && user.name ? user.name : '未來大學生';
    
    setGreetingData({
      title: `${titleStr}，${name}！`,
      message: randomMsg,
      icon: iconNode,
      color: colorClass
    });
  }, [user]);

  if (!greetingData.title) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`col-span-3 rounded-[1.5rem] p-4 flex items-center justify-between gap-4 border ${greetingData.color}`}
    >
      <div className="flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
            {greetingData.icon}
        </div>
        <div className="flex flex-col flex-grow">
            <span className="text-xs font-bold text-slate-700">{greetingData.title}</span>
            <span className="text-[10px] text-slate-600/80 leading-snug">{greetingData.message}</span>
        </div>
        <div className="hidden sm:flex gap-1.5 shrink-0 ml-auto self-center">
             {[1,2,3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i===3 ? 'bg-indigo-400' : 'bg-slate-200'} animate-pulse`} style={{ animationDelay: `${i*200}ms` }}></div>)}
        </div>
      </div>
    </motion.div>
  );
};

export default Greeting;
