import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import { ExamPreset } from '../constants';

interface ConfirmExamSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetPreset: ExamPreset | null;
}

const ConfirmExamSwitchModal: React.FC<ConfirmExamSwitchModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  targetPreset
}) => {
  if (!isOpen || !targetPreset) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
          className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden relative z-10 p-1 flex flex-col"
        >
          {/* Subtle gradient border wrapper simulate */}
          <div className="bg-white rounded-[1.8rem] p-6 flex flex-col items-center text-center relative border border-slate-100/50">
            {/* Decorative background glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl"></div>

            <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 shadow-inner flex items-center justify-center mb-6 relative z-10">
               <Calendar className="w-10 h-10 text-indigo-600" strokeWidth={1.5} />
               <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100">
                   <AlertCircle className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
               </div>
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight relative z-10">確定切換大考？</h2>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full mb-6 relative z-10 flex items-center justify-center gap-3">
              <span className="text-slate-400 font-semibold text-sm line-through decoration-slate-300">目前</span>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <strong className="text-indigo-600 font-bold text-lg bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100/50">
                {targetPreset.name}
              </strong>
            </div>

            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed relative z-10 px-2">
              切換後，系統會自動更新您的倒數日與相關行事曆，但既有的專注紀錄<strong className="text-slate-700">不會</strong>消失。
            </p>

            <div className="flex gap-3 w-full relative z-10">
              <button 
                onClick={onClose}
                className="flex-1 py-3.5 bg-white border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600 transition-all text-sm"
              >
                取消
              </button>
              <button 
                onClick={onConfirm}
                className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-indigo-200/50 text-sm"
              >
                確認切換
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmExamSwitchModal;

