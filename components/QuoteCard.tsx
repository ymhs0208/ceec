import React, { useState, useEffect } from 'react';
import { getDailyQuote } from '../services/quoteService';
import { Sparkles, Quote, MessageSquareQuote } from 'lucide-react';

const QuoteCard: React.FC = () => {
  const [quote, setQuote] = useState<string>('');

  useEffect(() => {
    setQuote(getDailyQuote());
  }, []);

  return (
    <div className="w-full glass-card rounded-2xl p-4 md:px-6 md:py-5 relative overflow-hidden group bg-gradient-to-r from-white/90 to-indigo-50/50 border border-white/60">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 relative z-10">
        
        {/* Label / Icon */}
        <div className="flex-shrink-0 flex items-center gap-2">
           <div className="p-2 rounded-lg bg-indigo-100/80 text-indigo-600 shadow-sm">
             <Sparkles className="w-4 h-4" />
           </div>
           <span className="text-xs font-bold tracking-widest text-indigo-900/60 uppercase block md:hidden">每日激勵</span>
        </div>
        
        {/* Divider (Desktop) */}
        <div className="hidden md:block w-px h-8 bg-indigo-100"></div>

        {/* Content */}
        <div className="flex-grow">
          <blockquote className="text-sm md:text-base font-medium leading-relaxed text-slate-700 font-sans italic relative">
            <span className="text-indigo-300 text-lg mr-1">"</span>
            {quote}
            <span className="text-indigo-300 text-lg ml-1">"</span>
          </blockquote>
        </div>

        {/* Decorative Quote Icon */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-100 opacity-50 md:opacity-100 pointer-events-none">
           <MessageSquareQuote className="w-12 h-12 md:w-10 md:h-10 rotate-12" />
        </div>
      </div>
    </div>
  );
};

export default QuoteCard;