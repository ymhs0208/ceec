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
              <span><strong>考前檢查：</strong>從「備考規劃 → 考前檢查」確認應考物品與規則。</span>
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
