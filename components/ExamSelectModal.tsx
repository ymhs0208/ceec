import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, GraduationCap, PenTool, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { EXAM_PRESETS } from '../constants';

interface ExamSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExam: (examId: string) => void;
  currentExamId: string;
}

const CATEGORIES = [
  { id: 'gsat', name: '學測', icon: GraduationCap, color: 'from-blue-500 to-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-500', shadow: 'shadow-indigo-200/50', iconBg: 'bg-indigo-100' },
  { id: 'cap', name: '會考', icon: PenTool, color: 'from-emerald-400 to-teal-500', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-500', shadow: 'shadow-teal-200/50', iconBg: 'bg-teal-100' },
  { id: 'tvet', name: '統測', icon: BookOpen, color: 'from-amber-400 to-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-500', shadow: 'shadow-orange-200/50', iconBg: 'bg-orange-100' },
  { id: 'ast', name: '分科', icon: Sparkles, color: 'from-rose-400 to-pink-500', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-500', shadow: 'shadow-pink-200/50', iconBg: 'bg-pink-100' }
];

const ExamSelectModal: React.FC<ExamSelectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectExam,
  currentExamId
}) => {
  const defaultCategory = EXAM_PRESETS.find(e => e.id === currentExamId)?.category || 'gsat';
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentCategoryData = CATEGORIES.find(c => c.id === selectedCategory);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[70000] flex items-center justify-center p-4 sm:p-6">
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
          className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 flex flex-col"
        >
          {/* Header - Modern Gradient Area */}
          <div className={`relative px-8 pt-8 pb-10 overflow-hidden bg-gradient-to-br ${currentCategoryData?.color} transition-colors duration-500`}>
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>
            
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white/90 text-sm tracking-widest font-bold mb-3 backdrop-blur-md border border-white/20 uppercase"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Select Target Exam
                </motion.div>
                <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                  選擇大考類別
                  <br />
                  <span className="text-white/80 font-bold text-xl tracking-normal">與準備年份</span>
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="px-8 pb-8 -mt-6 relative z-20">
            {/* Category Selector Tabs */}
            <div className="flex bg-white p-1.5 rounded-2xl shadow-lg border border-slate-100 overflow-x-auto no-scrollbar mb-8">
               {CATEGORIES.map((cat) => {
                 const isActive = selectedCategory === cat.id;
                 const Icon = cat.icon;
                 return (
                   <button
                     key={cat.id}
                     onClick={() => setSelectedCategory(cat.id)}
                     className={`flex-1 relative py-3 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap z-10 flex items-center justify-center gap-2 ${
                       isActive
                         ? cat.text
                         : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                     }`}
                   >
                     <Icon className={`w-4 h-4 ${isActive ? cat.text : 'text-slate-400'}`} />
                     {cat.name}
                     {isActive && (
                       <motion.div
                         layoutId="exam-select-cat-bg"
                         className={`absolute inset-0 ${cat.bg} rounded-xl -z-10`}
                         transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                       />
                     )}
                   </button>
                 );
               })}
            </div>
            
            {/* Exam Year Grid */}
            <div className="mb-2">
              <h3 className="text-sm font-extrabold text-slate-800 mb-4 px-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                可選擇年份
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {EXAM_PRESETS.filter(exam => exam.category === selectedCategory).sort((a, b) => a.year - b.year).map((exam) => {
                   const isActive = currentExamId === exam.id;
                   return (
                     <button
                       key={exam.id}
                       onClick={() => {
                         onSelectExam(exam.id);
                         onClose();
                       }}
                       className={`relative py-5 px-5 rounded-[1.25rem] text-left transition-all group border-2 overflow-hidden ${
                         isActive
                           ? `bg-white ${currentCategoryData?.border} shadow-xl ${currentCategoryData?.shadow} scale-[1.02]`
                           : 'bg-slate-50/50 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-md'
                       }`}
                     >
                       {/* Active background subtle glow */}
                       {isActive && (
                         <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${currentCategoryData?.color}`}></div>
                       )}

                       <div className="flex items-center justify-between relative z-10">
                         <div className="flex flex-col gap-1">
                           <span className={`text-lg font-black ${isActive ? currentCategoryData?.text : 'text-slate-700'}`}>
                             {exam.year} 年
                           </span>
                           <span className="text-xs font-semibold text-slate-400">
                             {exam.name.replace(`${exam.year}`, '').trim()}
                           </span>
                         </div>
                         
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                           isActive 
                             ? `${currentCategoryData?.iconBg} ${currentCategoryData?.text}`
                             : 'bg-slate-200 text-slate-400 group-hover:bg-slate-300 group-hover:text-slate-500'
                         }`}>
                           {isActive ? <CheckCircle2 className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                         </div>
                       </div>

                       {exam.isEstimated && (
                         <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] items-center justify-center font-bold tracking-widest rounded-bl-xl ${
                           isActive 
                             ? `${currentCategoryData?.iconBg} ${currentCategoryData?.text}`
                             : 'bg-slate-200 text-slate-500'
                         }`}>
                           預計
                         </div>
                       )}
                     </button>
                   );
                 })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ExamSelectModal;
