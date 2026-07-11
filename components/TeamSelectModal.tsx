import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, CheckCircle2, GraduationCap, MapPin, Search, X } from 'lucide-react';
import { SCHOOLS } from './data/schools';

interface TeamSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam: (team: string) => void;
}

const TeamSelectModal: React.FC<TeamSelectModalProps> = ({ isOpen, onClose, onSelectTeam }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | '公立' | '私立'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cities = useMemo(() => {
    const uniqueCities = Array.from(new Set(SCHOOLS.map(s => s.location))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    return ['all', ...uniqueCities];
  }, []);

  const filteredSchools = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return SCHOOLS.filter(s => {
      const matchCity = selectedCity === 'all' || s.location === selectedCity;
      const matchType = selectedType === 'all' || s.type === selectedType;
      const searchableText = `${s.name} ${s.location} ${s.type}`.toLowerCase();
      const matchSearch = !keyword || keyword.split(/\s+/).every(token => searchableText.includes(token));
      return matchCity && matchType && matchSearch;
    });
  }, [searchTerm, selectedCity, selectedType]);

  const visibleSchools = useMemo(() => filteredSchools.slice(0, 120), [filteredSchools]);
  const hasMoreResults = filteredSchools.length > visibleSchools.length;

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[70000] flex items-center justify-center p-3 sm:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-2xl rounded-[1.75rem] shadow-[0_28px_80px_-28px_rgba(15,23,42,0.75)] overflow-hidden relative z-10 max-h-[90vh] flex flex-col border border-white/80"
        >
          <div className="relative flex-shrink-0 border-b border-slate-100 bg-gradient-to-br from-white via-indigo-50/70 to-emerald-50/60 p-5 sm:p-6">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400"></div>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-indigo-600 shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black leading-tight tracking-tight text-slate-900 sm:text-2xl">加入學校戰隊</h2>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">選擇您就讀的學校，讓讀書積分累積到校隊排行榜。</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500"
                aria-label="關閉選校視窗"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="搜尋學校、縣市或公私立"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 w-full rounded-2xl border-2 border-white bg-white pl-11 pr-11 text-sm font-black text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="清除搜尋"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {cities.map(city => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`flex-shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-[11px] font-black tracking-widest transition-all ${selectedCity === city ? 'bg-slate-950 text-white shadow-md' : 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 hover:bg-slate-50 hover:text-slate-800'}`}
                  >
                    {city === 'all' ? '全部地區' : city}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                  {(['all', '公立', '私立'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition-all ${selectedType === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                    >
                      {type === 'all' ? '全部' : type}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] font-black tracking-widest text-slate-400">
                  {filteredSchools.length.toLocaleString()} 所學校
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-4">
            {filteredSchools.length > 0 ? (
              <div className="space-y-2.5">
                {visibleSchools.map((school) => (
                  <button
                    key={`${school.location}-${school.name}`}
                    onClick={() => {
                      onSelectTeam(school.name);
                      onClose();
                    }}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 active:translate-y-0 active:scale-[0.99] sm:p-4"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-slate-800 transition-colors group-hover:text-indigo-700 sm:text-base">
                        {school.name}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold">
                        <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {school.location}
                        </span>
                        <span className={`rounded-lg px-2 py-1 ${school.type === '公立' ? 'border border-blue-100 bg-blue-50 text-blue-600' : 'border border-orange-100 bg-orange-50 text-orange-600'}`}>
                          {school.type}
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-slate-200 transition-colors group-hover:text-indigo-500" />
                  </button>
                ))}
                {hasMoreResults && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-center text-xs font-bold text-slate-500">
                    還有 {(filteredSchools.length - visibleSchools.length).toLocaleString()} 筆結果，請輸入更多關鍵字縮小範圍。
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-14 text-center font-bold text-slate-400">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-100 bg-white shadow-sm">
                  <Search className="h-6 w-6 text-slate-300" />
                </div>
                <div>
                  <div className="text-base font-black text-slate-600">找不到相關學校</div>
                  <p className="mt-1 text-xs text-slate-400">試試看縮短校名，或切換地區與公私立篩選。</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default TeamSelectModal;
