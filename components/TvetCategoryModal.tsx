import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { TVET_CATEGORIES } from '../constants';

interface TvetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelect: (id: string) => void;
}

export const TvetCategoryModal: React.FC<TvetCategoryModalProps> = ({ isOpen, onClose, selectedCategory, onSelect }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredCategories = TVET_CATEGORIES.filter(cat => 
    cat.name.includes(searchTerm) || cat.id.includes(searchTerm)
  );

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white relative z-20">
              <div>
                 <h3 className="text-2xl font-black text-slate-800 tracking-tight">統測群(類)別</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Select Category</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100 shrink-0">
                <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text"
                        placeholder="搜尋代碼或群別名稱..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-800 font-bold outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                </div>
            </div>

            <div className="p-4 overflow-y-auto min-h-[300px]">
              <div className="grid grid-cols-1 gap-2">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                        onSelect(cat.id);
                        onClose();
                    }}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-50 border-2 border-indigo-500 shadow-sm'
                        : 'bg-white border-2 border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                        selectedCategory === cat.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                        {cat.id}
                    </div>
                    <span className={`font-bold flex-1 ${
                        selectedCategory === cat.id ? 'text-indigo-900' : 'text-slate-700'
                    }`}>
                        {cat.name}
                    </span>
                  </button>
                ))}
                
                {filteredCategories.length === 0 && (
                    <div className="text-center py-10 text-slate-400 font-medium">
                        找不到符合的群(類)別
                    </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
