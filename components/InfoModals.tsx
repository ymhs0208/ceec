import ModalLayer from './ModalLayer';
import { buildAppRoute, readAppRoute } from '../utils/appRoutes';
import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import './LoginSuggestionModal.css';
import { X, Shield, Book, AlertTriangle, CheckCircle2, Info, Lock, Server, ExternalLink, Cloud, ArrowRight, Laptop, Smartphone, ClipboardCheck, Clock, MapPin, Sparkles, Check, Backpack, Ban, ScrollText, BookOpen, Target, Calendar, Trophy, Headphones, ListChecks, ArrowLeftRight, RefreshCw, Zap, CalendarClock } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 通用 Modal 外框
const ModalBase: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; icon: React.ReactNode }> = ({ isOpen, onClose, children, title, icon }) => {
  if (!isOpen) return null;
  return (
    <ModalLayer className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative border border-white/50 max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 md:p-8 pb-4 flex-shrink-0 border-b border-transparent">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="overflow-y-auto custom-scrollbar px-6 md:px-8 py-2 space-y-4 text-slate-600 text-sm leading-relaxed">
           {children}
        </div>
        
        {/* Footer - Fixed */}
        <div className="p-6 md:p-8 pt-4 flex justify-end flex-shrink-0">
           <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm">
             關閉
           </button>
        </div>
      </div>
    </ModalLayer>
  );
};

// Keep legacy modal entry points linked to the current full policy.
export const PrivacyModal: React.FC<ModalProps> = (props) => (
  <ModalBase {...props} title="隱私權政策" icon={<Shield className="w-5 h-5 text-indigo-600" />}>
    <p>請閱讀完整隱私權政策，了解本機儲存、帳號同步、公開排行、第三方服務，以及你的個人資料權利。</p>
    <a className="inline-flex items-center gap-2 text-indigo-600" href={buildAppRoute('privacy', readAppRoute(new URL(window.location.href)).examId || '116gsat')}>閱讀完整政策 <ExternalLink className="h-4 w-4" /></a>
  </ModalBase>
);

// Legacy entry points share the current full terms instead of a separate version.
export const TermsModal: React.FC<ModalProps> = (props) => (
  <ModalBase {...props} title="服務條款" icon={<ScrollText className="w-5 h-5 text-indigo-500" />}>
    <p>請閱讀完整服務條款，了解帳號、公開排行、虛擬金幣、自願支持、資料保存與申訴權益。</p>
    <a className="inline-flex items-center gap-2 text-indigo-600" href={buildAppRoute('terms', readAppRoute(new URL(window.location.href)).examId || '116gsat')}>閱讀完整條款 <ExternalLink className="h-4 w-4" /></a>
  </ModalBase>
);

// 使用說明 Modal
export const InstructionsModal: React.FC<ModalProps> = (props) => (
  <ModalBase {...props} title="使用說明與指南" icon={<BookOpen className="w-5 h-5 text-indigo-600" />}>
    <div className="space-y-6 pb-2">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 rounded-2xl p-6 relative overflow-hidden text-white shadow-lg shadow-indigo-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-fuchsia-400/20 rounded-full blur-xl translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
            <Sparkles className="w-6 h-6 text-yellow-300 drop-shadow-sm" />
          </div>
          <h3 className="text-xl font-black tracking-tight drop-shadow-sm">歡迎來到 Focus Space</h3>
          <p className="text-sm text-indigo-50 leading-relaxed max-w-[280px]">
            專為考生打造的整合式備考平台。掌握專注節奏，跟隨全台考生一起衝刺您的理想志願！
          </p>
        </div>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* 目標與倒數 */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 transition-colors group">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">目標設定與倒數</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
            點擊頂端或右上角設定您的「理想大學與科系」。系統會精準倒數學測、統測、會考等大考日期，讓目標時刻督促自己。
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
            <Calendar className="w-3 h-3" /> 各大考試倒數
          </div>
        </div>

        {/* 專注模式 */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-fuchsia-200 transition-colors group">
          <div className="w-10 h-10 bg-fuchsia-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5 text-fuchsia-600" />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">多元專注計時</h4>
          <ul className="space-y-2 text-[11px] text-slate-500">
            <li className="flex items-start gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 mt-1 flex-shrink-0"></div>
              <span><strong>番茄鐘：</strong>25分專注+5分休息，防疲勞。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0"></div>
              <span><strong>正向計時：</strong>不限時紀錄，適合自由閱讀。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 flex-shrink-0"></div>
              <span><strong>模擬考：</strong>內建各科時間，培養考場臨場感。</span>
            </li>
          </ul>
        </div>

        {/* 戰隊與榜單 */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-amber-200 transition-colors group">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">學校戰隊與榮耀榜</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            孤軍奮戰不如結伴同行。您的每分鐘專注都會化為戰隊積分！與全台學校競爭，看看誰是最強的讀書魔人。
          </p>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">個人積分</span>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">全校排名</span>
          </div>
        </div>

        {/* 同步與實用功能 */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-emerald-200 transition-colors group">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Cloud className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">雲端同步與更多功能</h4>
          <ul className="space-y-2 text-[11px] text-slate-500">
            <li className="flex items-start gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span><strong>跨機同步：</strong>登入後手機電腦無縫接軌。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span><strong>環境白噪音：</strong>左上角開啟圖書館/雨聲。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ListChecks className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span><strong>考前檢查：</strong>左下方按鈕確認應考物品與規則。</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  </ModalBase>
);

// 公告 Modal
export const AnnouncementModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <ModalLayer className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl p-0 shadow-2xl relative overflow-hidden animate-scale-in border-2 border-rose-100 max-h-[90vh] flex flex-col">
        <div className="bg-rose-600 p-6 text-white text-center relative overflow-hidden flex-shrink-0">
            <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <CalendarClock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold tracking-[0.25em] text-rose-100">115.07.08 大考中心新聞稿</p>
                  <h2 className="mt-1 text-xl font-bold">115 分科測驗順延公告</h2>
                </div>
            </div>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="flex items-start gap-4 mb-6">
                <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0 mt-1" />
                <div className="space-y-2">
                    <h3 className="font-bold text-slate-800 text-lg">因應巴威颱風，考試日期順延</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        依大考中心公告，115 學年度分科測驗因巴威颱風可能影響考場準備與考試，考試順延至 7 月 13 日（一）至 7 月 14 日（二）舉行。
                    </p>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                        已公布的應試號碼與考試地點不變，請考生留意大考中心最新訊息，考試當日提早出門並注意交通安全。
                    </p>
                    <p className="text-rose-700 text-sm leading-relaxed font-bold bg-rose-50 border border-rose-100 rounded-xl p-3">
                        本站已同步更新倒數、考程表、重要日程與 115 分科成績查詢開放日期。
                    </p>
                </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-xs text-slate-600 flex flex-col gap-3 border border-slate-100">
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-slate-800">考試：</strong>115.07.13（一）至 115.07.14（二）</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-slate-800">查看試場：</strong>115.07.12（日）16:00 至 18:00</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-slate-800">成績公布：</strong>115.08.03（一）</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-slate-800">成績複查：</strong>115.08.03（一）至 115.08.06（四）</span>
                </div>
            </div>

            <button 
                onClick={onClose} 
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-200 active:scale-95"
            >
                我瞭解了，開始讀書
            </button>
        </div>
      </div>
    </ModalLayer>
  );
};

// 成績查詢警告 Modal
export const ScoreQueryModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  examName: string;
  openTime: string;
}> = ({ isOpen, onClose, onConfirm, examName, openTime }) => {
  if (!isOpen) return null;
  return (
    <ModalLayer className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-scale-in border border-white/50">
        <div className="flex flex-col items-center gap-4 text-center">
           <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center border border-amber-200 shadow-sm">
              <AlertTriangle className="w-6 h-6" />
           </div>
           <div>
              <h3 className="text-lg font-bold text-slate-800">查詢系統尚未開放</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                 {examName} 成績查詢開放時間為：<br/>
                 <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{openTime}</span>
              </p>
              <p className="text-xs text-slate-400 mt-2">現在進入可能無法看到成績或系統維護中。</p>
           </div>
           <div className="flex gap-3 w-full mt-2">
              <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">
                 取消
              </button>
              <button onClick={onConfirm} className="flex-1 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm flex items-center justify-center gap-2">
                 仍要前往 <ExternalLink className="w-3.5 h-3.5" />
              </button>
           </div>
        </div>
      </div>
    </ModalLayer>
  );
};

// 登入建議 Modal
export const LoginSuggestionModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: () => void }> = ({ isOpen, onClose, onLogin }) => {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalLayer className="sync-invite-layer" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="sync-invite-backdrop" onClick={onClose} aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="sync-invite" role="dialog" aria-modal="true" aria-labelledby="sync-invite-title" aria-describedby="sync-invite-description"
          >
            <button type="button" onClick={onClose} className="sync-invite-close" aria-label="關閉雲端同步提示"><X size={18} /></button>
            <div className="sync-invite-body">
              <p className="sync-invite-eyebrow"><span /> YOUR PROGRESS, CONNECTED</p>
              <div className="sync-invite-illustration" aria-hidden="true">
                <span className="sync-invite-device"><Laptop size={27} strokeWidth={1.4} /></span>
                <span className="sync-invite-connection" />
                <span className="sync-invite-cloud"><Cloud size={39} strokeWidth={1.3} /><span><Check size={12} strokeWidth={2.5} /></span></span>
                <span className="sync-invite-connection" />
                <span className="sync-invite-device"><Smartphone size={25} strokeWidth={1.4} /></span>
              </div>
              <header className="sync-invite-heading">
                <h2 id="sync-invite-title">啟動雲端連線<span>。</span></h2>
                <p id="sync-invite-description">讓每一份專注，都能隨身帶著走。<br />跨裝置接續您的學習進度。</p>
              </header>
              <div className="sync-invite-features">
                <div className="sync-invite-feature">
                  <span className="sync-invite-feature-icon"><ArrowLeftRight size={19} strokeWidth={1.6} /></span>
                  <div><h3>跨裝置即時同步</h3><p>在手機、平板與電腦之間切換，接續您的專注與學習紀錄。</p></div>
                </div>
                <div className="sync-invite-feature">
                  <span className="sync-invite-feature-icon"><Shield size={19} strokeWidth={1.6} /></span>
                  <div><h3>安全資料備份</h3><p>登入並連線後，將成就、任務與統計數據備份至雲端。</p></div>
                </div>
              </div>
            </div>
            <div className="sync-invite-actions">
              <button type="button" onClick={() => { onClose(); onLogin(); }} className="sync-invite-primary">立即啟用同步 <ArrowRight size={17} /></button>
              <button type="button" onClick={onClose} className="sync-invite-secondary">保持單機模式</button>
              <p>登入帳號後啟用同步，也可以稍後再設定。</p>
            </div>
          </motion.div>
        </ModalLayer>
      )}
    </AnimatePresence>
  );
};

// 互動式考前檢查 Checklist Item Component
const InteractiveChecklistItem: React.FC<{ 
  id: string; 
  checked: boolean; 
  onChange: (id: string, checked: boolean) => void; 
  children: React.ReactNode;
}> = ({ id, checked, onChange, children }) => (
  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}>
    <div className="mt-0.5 relative flex items-center justify-center flex-shrink-0">
      <input 
        type="checkbox" 
        className="peer sr-only" 
        checked={checked} 
        onChange={(e) => onChange(id, e.target.checked)} 
      />
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 peer-hover:border-indigo-400 bg-white'}`}>
        <Check className={`w-3.5 h-3.5 text-white transition-transform ${checked ? 'scale-100' : 'scale-0'}`} />
      </div>
    </div>
    <div className={`text-sm leading-relaxed transition-colors ${checked ? 'text-indigo-900 opacity-70' : 'text-slate-700'}`}>
      {children}
    </div>
  </label>
);

// 全新考前檢查與注意事項 Modal
const LegacyExamReminderModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void;
  checkedItems: Record<string, boolean>;
  onCheckChange: (items: Record<string, boolean>) => void;
}> = ({ isOpen, onClose, checkedItems, onCheckChange }) => {
  const [activeTab, setActiveTab] = React.useState<'items' | 'prohibited' | 'rules'>('items');

  const handleCheck = (id: string, checked: boolean) => {
    onCheckChange({ ...checkedItems, [id]: checked });
  };

  const mustBringItems = [
    { id: 'id_card', text: <><strong className="text-slate-800">應試有效證件正本</strong> (身分證、有照片健保卡、駕照、護照或身心障礙證明)</> },
    { id: 'pencil', text: <><strong>黑色 2B 軟心鉛筆</strong> (建議多備幾支，畫卡用)</> },
    { id: 'eraser', text: <><strong>橡皮擦</strong> (擦拭乾淨，不留痕跡)</> },
    { id: 'pen', text: <><strong>黑色墨水原子筆</strong> (建議 0.5mm~0.7mm，書寫清晰，非選擇題用)</> },
    { id: 'correction', text: <><strong>修正帶 / 修正液</strong> (非選擇題更改用)</> },
    { id: 'ruler', text: <><strong>直尺、三角板、量角器、圓規</strong> (視考科需求攜帶)</> },
    { id: 'watch', text: <><strong>手錶</strong> (僅限指針式或無計算/通訊/發聲功能之電子錶)</> },
  ];

  const progress = Math.round((mustBringItems.filter(item => checkedItems[item.id]).length / mustBringItems.length) * 100);

  if (!isOpen) return null;

  return (
    <ModalBase isOpen={isOpen} onClose={onClose} title="考前檢查暨應考注意事項" icon={<ClipboardCheck className="w-6 h-6 text-indigo-600" />}>
       <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setActiveTab('items')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'items' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Backpack className="w-4 h-4" /> 必備物品
            </button>
            <button 
              onClick={() => setActiveTab('prohibited')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'prohibited' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Ban className="w-4 h-4" /> 違禁品
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'rules' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ScrollText className="w-4 h-4" /> 應考規則
            </button>
          </div>

          {activeTab === 'items' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-sm font-bold text-indigo-900">準備進度</div>
                  <div className="text-2xl font-black text-indigo-600">{progress}%</div>
                </div>
                <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                {mustBringItems.map(item => (
                  <InteractiveChecklistItem 
                    key={item.id} 
                    id={item.id} 
                    checked={!!checkedItems[item.id]} 
                    onChange={handleCheck}
                  >
                    {item.text}
                  </InteractiveChecklistItem>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'prohibited' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 leading-relaxed">
                  <span className="font-bold">絕對禁止攜帶入座！</span>
                  <br/>若不慎攜帶，請務必於預備鈴響前放置於「臨時置物區」，且電子產品須<strong className="text-red-600 underline">完全關機</strong>（含鬧鈴、震動）。
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center gap-2 hover:border-red-300 transition-colors">
                  <Smartphone className="w-8 h-8 text-slate-400" />
                  <div className="font-bold text-slate-700 text-sm">行動電話</div>
                  <div className="text-xs text-slate-500">強烈建議不要帶，或必須完全關機</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center gap-2 hover:border-red-300 transition-colors">
                  <Clock className="w-8 h-8 text-slate-400" />
                  <div className="font-bold text-slate-700 text-sm">智慧型穿戴裝置</div>
                  <div className="text-xs text-slate-500">智慧手錶、智慧手環、智慧眼鏡等</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center gap-2 hover:border-red-300 transition-colors">
                  <Laptop className="w-8 h-8 text-slate-400" />
                  <div className="font-bold text-slate-700 text-sm">通訊/計算器材</div>
                  <div className="text-xs text-slate-500">計算機、藍牙耳機、平板電腦等</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center gap-2 hover:border-red-300 transition-colors">
                  <Book className="w-8 h-8 text-slate-400" />
                  <div className="font-bold text-slate-700 text-sm">未經檢查之物品</div>
                  <div className="text-xs text-slate-500">參考書、小抄、計算紙等</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4 animate-fade-in custom-scrollbar max-h-[60vh] overflow-y-auto pr-2">
              
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4">
                <h4 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> 一般考場與注意事項
                </h4>
                <div className="space-y-3 text-xs text-amber-900/80 leading-relaxed">
                  <div className="bg-white/60 p-3 rounded-lg border border-amber-100/50">
                    <strong className="text-amber-900 block mb-1">一般注意事項</strong>
                    <ul className="list-decimal pl-4 space-y-1.5 marker:text-amber-600/60">
                      <li>每節考試前 5 分鐘預備鈴鐘響時，考生即可入場，入場後除准考證正本及考試必用文具外，所有物品應立即放置於臨時置物區，並迅速依編訂座位入座，經監試人員指示後仍不放妥非考試用品或不就座者，扣減其該科成績 2 分。</li>
                      <li>每節考試開始鈴鐘響前，考生不得翻閱試題本、書籍或紙張，亦不得書寫、劃記、作答或未經監試人員許可逕行離座，違者扣減其該科成績 5 分；經制止仍再犯者，該科不予計分。</li>
                      <li>每節考試開始逾 20 分鐘，考生不得入場，已入場應試者，考試開始 50 分鐘內不得離場，未依規定時間入場或離場，經警告不聽，該科不予計分。</li>
                    </ul>
                  </div>

                  <div className="bg-white/60 p-3 rounded-lg border border-amber-100/50">
                    <strong className="text-amber-900 block mb-1">攜帶物品注意事項</strong>
                    <ul className="list-decimal pl-4 space-y-1.5 marker:text-amber-600/60" start={4}>
                      <li>各節考試期間，考生置於本人座位周遭、隨身攜帶之文具用品或醫療器材須遵守下列規定且不得相互借用，違者扣減其該科成績5分，並得視其使用情節，加重扣分或扣減其該科全部成績：
                         <ul className="list-[lower-alpha] pl-4 mt-1 space-y-1 text-amber-800/80">
                            <li>考生可攜帶如直尺、三角板、圓規、量角器、文具盒(袋)及透明墊板，但禁止攜帶或使用其他有礙考試公平之各類物品。</li>
                            <li>設計群專業科目(二)，考生只能攜帶或使用5種繪製媒材，及輔助繪製之橡皮擦、修正液(帶)、各種尺規(不含圖板或製圖板)，並得自備透明墊板及固定紙張用之膠帶。</li>
                            <li>個人之醫療器材如助聽器等，須事先持醫院診斷證明申請或由監試人員檢查後方可使用。</li>
                         </ul>
                      </li>
                      <li>考生攜帶入場之手機應<strong>完全關機</strong>(含關閉鬧鈴、震動等)，應試時不得發出聲響或影響秩序，違者扣減該科成績 2 分。</li>
                      <li>不得將行動通訊裝置(行動電話、穿戴式裝置等)、書籍、紙張或具有計算、記憶、影音等功能之物品隨身攜帶或置於抽屜、座位旁，違者扣成績 5 分。</li>
                      <li>設計群專業科目(二)應試時不得攜帶色票(卡)，違者扣 10 分。攜帶動物、昆蟲或其標本、擬真模型進入試場，扣 20 分。</li>
                    </ul>
                  </div>

                  <div className="bg-white/60 p-3 rounded-lg border border-amber-100/50">
                    <strong className="text-amber-900 block mb-1">作答及入場注意事項</strong>
                    <ul className="list-decimal pl-4 space-y-1.5 marker:text-amber-600/60" start={8}>
                      <li>考生應攜帶准考證正本入場，違者經核對確係本人，暫准予應試，惟至當節結束若仍未送達或申請補發者，扣 2 分。</li>
                      <li>入座後，應將准考證正本放在考桌左上角。不得拒絕核對身分，否則取消考試資格。</li>
                      <li>開始鈴(鐘)響時即可作答。作答前先檢查答案卡(卷)、座位貼條及准考證之號碼是否正確，不符應立即舉手請監試人員處理。</li>
                      <li>未經許可一經離座，不得再行修改答案，違者扣 5 分。</li>
                      <li>因病、因故須暫時離座者，須經同意及陪同始准離座。處理後可繼續考試，但不得請求延長時間或補考。</li>
                      <li>考試結束鈴(鐘)響畢時，應即停止作答且雙手離開桌面，靜候收取答案卡(卷)。</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4">
                <h4 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
                  <ScrollText className="w-4 h-4" /> 統測專屬注意事項
                </h4>
                <div className="space-y-3 text-xs text-indigo-900/80 leading-relaxed">
                  <div className="bg-white/60 p-3 rounded-lg border border-indigo-100/50">
                    <strong className="text-indigo-900 block mb-1">一、一般規則</strong>
                    <ul className="list-disc pl-4 space-y-1.5 marker:text-indigo-600/60">
                      <li>禁止舞弊行為 (代考、脅迫、集體舞弊、電子舞弊、交換座位/答案卷、傳遞答案等)。</li>
                      <li>須攜帶准考證應試。毀損或遺失應持身分證件正本及照片至考場試務中心補發。</li>
                      <li>應自備文具，不得借用。數學科<strong>不得攜帶量角器</strong>或附該功能之文具；直尺/三角板不可有根號。透明墊板不得有圖形或文字(廠牌標誌除外)。</li>
                      <li>僅能帶手錶計時，電子錶應解除響鈴。使用醫療器材或輔具須考前申請核准。</li>
                      <li>冷氣試場為服務措施，若遇跳電或故障將開啟門窗與風扇繼續考試，不得要求更換試場、加分或延長時間。</li>
                    </ul>
                  </div>

                  <div className="bg-white/60 p-3 rounded-lg border border-indigo-100/50">
                    <strong className="text-indigo-900 block mb-1">二、入場與作答規則</strong>
                    <ul className="list-disc pl-4 space-y-1.5 marker:text-indigo-600/60">
                      <li>考試說明開始後即不准離場。考試說明時段內不得提前翻開試題本、書寫或作答。</li>
                      <li>遲到逾 20 分鐘不得入場。英語(聽力)試題開始播放後即不得入場。</li>
                      <li>正式開始鐘響起，應於試題本封面填入准考證末兩碼。</li>
                      <li>英語(聽力)每題播放兩次。遇設備故障更換設備後繼續；若兩次皆受干擾會於考後重播補救。放棄補救權益者不得要求優待或補考。</li>
                    </ul>
                  </div>

                  <div className="bg-white/60 p-3 rounded-lg border border-indigo-100/50">
                    <strong className="text-indigo-900 block mb-1">三、離場與其他規則</strong>
                    <ul className="list-disc pl-4 space-y-1.5 marker:text-indigo-600/60">
                      <li>正式開始後 30 分鐘內不得提早離場。英語(聽力)結束前或重播期間亦不得離場。</li>
                      <li>提早離場應交予監試委員點收，隨後盡速安靜離開。答案卷收交後不得再修改，亦不得攜出試場。</li>
                      <li>如遇停電導致照明無法使用，應繼續作答；視受影響時間延長考試時間，至多 20 分鐘。</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                <h4 className="text-sm font-bold text-teal-800 mb-2 flex items-center gap-2">
                  <ScrollText className="w-4 h-4" /> 會考專屬注意事項
                </h4>
                <div className="bg-white/60 p-3 rounded-lg border border-teal-100/50 text-xs text-teal-900/80 leading-relaxed">
                  <p>（注意事項以當年度會考簡章及准考證背面說明為主，請考生務必確保遵守相關試場規定，維護自身權益與考試公平。）</p>
                </div>
              </div>
            </div>
          )}
       </div>
    </ModalBase>
  );
};

export const ExamReminderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  checkedItems: Record<string, boolean>;
  onCheckChange: (items: Record<string, boolean>) => void;
}> = ({ isOpen, onClose, checkedItems, onCheckChange }) => {
  const [activeTab, setActiveTab] = React.useState<'items' | 'prohibited' | 'rules'>('items');

  const mustBringItems = [
    { id: 'id_card', title: '身分證明文件', detail: '國民身分證、有效期限內護照、健保卡或駕照等可辨識身分的正本。' },
    { id: 'admission_ticket', title: '准考證與試場資訊', detail: '確認准考證號碼、試場、座位與交通時間，建議截圖或列印備份。' },
    { id: 'pencil', title: '2B 鉛筆', detail: '準備 2 支以上，筆芯不要太短，答案卡劃記要清楚。' },
    { id: 'eraser', title: '橡皮擦', detail: '選乾淨、容易擦拭且不易留下屑屑的橡皮擦。' },
    { id: 'pen', title: '黑色墨水筆', detail: '非選題或簽名使用，建議 0.5mm 至 0.7mm，至少準備 2 支。' },
    { id: 'correction', title: '修正帶或修正液', detail: '依當年度簡章規定使用，帶去前先確認能正常出帶或出液。' },
    { id: 'ruler', title: '透明文具與尺', detail: '透明墊板、直尺、圓規等以簡章允許項目為準，不帶有公式或文字。' },
    { id: 'watch', title: '簡易手錶', detail: '只能看時間，不能有通訊、計算、記憶、鬧鈴或智慧功能。' },
  ];

  const prohibitedItems = [
    { icon: Smartphone, title: '手機與穿戴裝置', detail: '手機、智慧手錶、智慧手環、耳機等電子通訊設備請關機並依規定放置。' },
    { icon: Clock, title: '會發聲的計時器', detail: '有鬧鈴、震動、計算、記憶或通訊功能的裝置都不要帶到座位。' },
    { icon: Laptop, title: '電子設備', detail: '平板、筆電、電子字典、計算機與任何可儲存資料的設備均避免攜入。' },
    { icon: Book, title: '非考試用品', detail: '課本、講義、小抄、便條紙、公式表與未經允許的紙張不可放在座位。' },
  ];

  const ruleGroups = [
    {
      title: '進場前',
      icon: MapPin,
      tone: 'text-indigo-700 bg-indigo-50 border-indigo-100',
      items: ['提前到考場，先找教室、廁所與休息區。', '入場前再次確認證件、准考證、文具與手錶。', '把手機完全關機，依考場指示放置。'],
    },
    {
      title: '開始作答',
      icon: ClipboardCheck,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
      items: ['鈴聲響後再作答，不要提前翻閱或書寫。', '先檢查答案卡、答案卷、座位貼條與准考證號碼是否一致。', '若資料不符或試題缺漏，立刻舉手請監試人員處理。'],
    },
    {
      title: '考試中',
      icon: Shield,
      tone: 'text-amber-700 bg-amber-50 border-amber-100',
      items: ['不要交談、傳遞物品或做出可能被誤會的動作。', '需要協助時舉手，不自行離座或翻找包包。', '注意答案卡劃記與非選題書寫位置，避免寫錯欄位。'],
    },
    {
      title: '交卷離場',
      icon: CheckCircle2,
      tone: 'text-sky-700 bg-sky-50 border-sky-100',
      items: ['依規定時間與監試人員指示交卷。', '離場前確認答案卡、答案卷與試題本是否依規定處理。', '離開考場後再查看手機或討論答案。'],
    },
  ];

  const handleCheck = (id: string, checked: boolean) => {
    onCheckChange({ ...checkedItems, [id]: checked });
  };
  const checkedCount = mustBringItems.filter(item => checkedItems[item.id]).length;
  const progress = Math.round((checkedCount / mustBringItems.length) * 100);

  if (!isOpen) return null;

  const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative flex min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
        activeTab === id
          ? 'bg-white text-slate-950 shadow-lg shadow-slate-200/70'
          : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
      }`}
    >
      <Icon className={`h-4 w-4 ${activeTab === id ? 'text-indigo-600' : 'text-slate-400'}`} />
      {label}
    </button>
  );

  return (
    <ModalLayer className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-md animate-fade-in sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl"
      >
        <div className="relative flex-shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-5 pb-6 pt-5 text-white sm:px-8 sm:pt-7">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-24 w-56 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-indigo-100">
                <Sparkles className="h-3.5 w-3.5" />
                EXAM READY
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">考前檢查暨應考注意事項</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-indigo-100/80">
                把要帶的東西、不能碰的東西、進場到交卷的節奏整理成一張考前行動表。檢查完，就讓腦袋少一點雜訊。
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="關閉考前檢查"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="hidden">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-indigo-100/70">必帶物品完成度</div>
                  <div className="mt-1 text-sm font-bold text-white">{checkedCount} / {mustBringItems.length} 項已確認</div>
                </div>
                <div className="text-4xl font-black tabular-nums text-amber-200">{progress}%</div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-200 to-orange-300 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-1">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                <div className="text-[11px] font-black text-indigo-100/60">核心原則</div>
                <div className="mt-1 text-sm font-black">證件、文具、時間</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                <div className="text-[11px] font-black text-indigo-100/60">最容易出事</div>
                <div className="mt-1 text-sm font-black">手機未關機</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/80 p-3">
          <div className="flex gap-2 overflow-x-auto rounded-[1.35rem] bg-slate-100 p-1.5 custom-scrollbar">
            <TabButton id="items" icon={Backpack} label="必帶清單" />
            <TabButton id="prohibited" icon={Ban} label="禁止攜帶" />
            <TabButton id="rules" icon={ScrollText} label="應考流程" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50 p-4 custom-scrollbar sm:p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'items' && (
              <motion.div
                key="items"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid gap-3 md:grid-cols-2"
              >
                {mustBringItems.map(item => (
                  <label
                    key={item.id}
                    className={`group flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all ${
                      checkedItems[item.id]
                        ? 'border-emerald-200 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={!!checkedItems[item.id]}
                      onChange={(event) => handleCheck(item.id, event.target.checked)}
                    />
                    <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                      checkedItems[item.id]
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-200 bg-slate-50 text-transparent group-hover:border-indigo-300'
                    }`}>
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-black ${checkedItems[item.id] ? 'text-emerald-900' : 'text-slate-850'}`}>
                        {item.title}
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{item.detail}</p>
                    </div>
                  </label>
                ))}
              </motion.div>
            )}

            {activeTab === 'prohibited' && (
              <motion.div
                key="prohibited"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-orange-50 p-4 text-rose-950 sm:p-5">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-black">進考場前先處理電子設備</div>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-rose-800/75">
                        不確定能不能帶的物品，先不要放在座位。手機就算沒有使用，只要發出聲響、震動或被發現違規，通常都會影響成績與權益。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {prohibitedItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-rose-200 hover:shadow-md">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-sm font-black text-slate-900">{item.title}</div>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed text-slate-500">{item.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'rules' && (
              <motion.div
                key="rules"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid gap-4 lg:grid-cols-2"
              >
                {ruleGroups.map((group, index) => {
                  const Icon = group.icon;
                  return (
                    <section key={group.title} className={`rounded-3xl border p-4 ${group.tone}`}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-[11px] font-black tracking-[0.22em] opacity-60">STEP {index + 1}</div>
                            <h3 className="text-base font-black">{group.title}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {group.items.map((item, itemIndex) => (
                          <div key={item} className="flex gap-3 rounded-2xl bg-white/70 p-3 text-sm font-bold leading-relaxed text-slate-700">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black shadow-sm">
                              {itemIndex + 1}
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-xs font-semibold leading-relaxed text-slate-500">
            實際規定仍以當年度簡章、准考證背面與考場公告為準。
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300/50 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <CheckCircle2 className="h-4 w-4" />
            完成檢查
          </button>
        </div>
      </motion.div>
    </ModalLayer>
  );
};
