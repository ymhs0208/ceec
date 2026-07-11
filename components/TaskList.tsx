
import React, { useState } from 'react';
import { TodoItem, SubjectCategory } from '../types';
import { Plus, Trash2, Check, CheckCircle2, Circle, AlertCircle, CalendarClock } from 'lucide-react';

interface TaskListProps {
  tasks: TodoItem[];
  setTasks: React.Dispatch<React.SetStateAction<TodoItem[]>>;
}

const CATEGORY_STYLES: Record<string, { bg: string, tag: string }> = {
  chinese: { 
    bg: 'bg-red-50/80 hover:bg-red-50 border-red-100 hover:border-red-200', 
    tag: 'text-red-600 bg-red-100/50 px-2 py-0.5 rounded-md' 
  },
  english: { 
    bg: 'bg-blue-50/80 hover:bg-blue-50 border-blue-100 hover:border-blue-200', 
    tag: 'text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-md' 
  },
  math: { 
    bg: 'bg-emerald-50/80 hover:bg-emerald-50 border-emerald-100 hover:border-emerald-200', 
    tag: 'text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-md' 
  },
  social: { 
    bg: 'bg-amber-50/80 hover:bg-amber-50 border-amber-100 hover:border-amber-200', 
    tag: 'text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-md' 
  },
  natural: { 
    bg: 'bg-cyan-50/80 hover:bg-cyan-50 border-cyan-100 hover:border-cyan-200', 
    tag: 'text-cyan-600 bg-cyan-100/50 px-2 py-0.5 rounded-md' 
  },
  other: { 
    bg: 'bg-slate-50/80 hover:bg-slate-50 border-slate-100 hover:border-slate-200', 
    tag: 'text-slate-600 bg-slate-100/50 px-2 py-0.5 rounded-md' 
  },
};

const TaskList: React.FC<TaskListProps> = ({ tasks, setTasks }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TodoItem['category']>('chinese');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  const getRemainingDaysText = (dateStr?: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天到期';
    if (diffDays < 0) return `已逾期 ${Math.abs(diffDays)} 天`;
    return `還剩 ${diffDays} 天`;
  };

  const getRemainingDaysColor = (dateStr?: string) => {
    if (!dateStr) return 'text-slate-500';
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-500 font-bold';
    if (diffDays === 0) return 'text-orange-500 font-bold';
    if (diffDays <= 3) return 'text-amber-500 font-medium';
    return 'text-slate-500';
  };

  const validateInput = (text: string): boolean => {
    if (!text.trim()) {
      return false;
    }
    if (text.length > 20) {
      setError('任務名稱請控制在 20 字以內');
      return false;
    }
    if (/[<>]/.test(text)) {
      setError('請勿包含特殊符號 < 或 >');
      return false;
    }
    return true;
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateInput(inputValue)) return;

    const newTask: TodoItem = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      completed: false,
      category: selectedCategory,
      dueDate: dueDate || undefined,
    };
    setTasks([...tasks, newTask]);
    setInputValue('');
    setDueDate('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    if (window.confirm('確定要刪除這個任務嗎？')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const categories = Object.keys(SubjectCategory) as Array<keyof typeof SubjectCategory>;

  return (
    <div className="w-full h-full glass-card rounded-3xl p-6 flex flex-col bg-white/80">
      <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-fuchsia-400 rounded-full"></span>
        待辦清單
      </h3>

      <form onSubmit={handleAddTask} className="mb-2 relative group flex flex-col gap-2">
         <div className="flex gap-2">
            <select 
               value={selectedCategory}
               onChange={(e) => setSelectedCategory(e.target.value as TodoItem['category'])}
               aria-label="選擇任務科目"
               className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-xl px-2 outline-none focus:border-indigo-400 transition-colors"
            >
               {categories.map((key) => (
               <option key={key} value={key.toLowerCase()}>
                  {SubjectCategory[key]}
               </option>
               ))}
            </select>
            <input
               type="text"
               value={inputValue}
               onChange={(e) => {
                 setInputValue(e.target.value);
                 if (error) setError('');
               }}
               placeholder="新增任務..."
               maxLength={25}
               aria-label="任務內容"
               aria-invalid={Boolean(error)}
               aria-describedby={error ? 'task-input-error' : undefined}
               className={`flex-grow bg-slate-50 border ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'} text-slate-800 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder-slate-400 min-w-0`}
            />
         </div>
         <div className="flex gap-2 items-start relative">
             <div className="relative flex-grow">
               <input
                 type="date"
                 value={dueDate}
                 onChange={(e) => setDueDate(e.target.value)}
                 aria-label="任務到期日"
                 className="w-full bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-400 transition-colors"
               />
             </div>
             <button
                type="submit"
                className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors flex-shrink-0"
                aria-label="新增任務"
             >
                <Plus className="w-4 h-4" />
             </button>
         </div>
         {error && (
            <div id="task-input-error" role="alert" className="absolute top-full left-0 mt-1 text-[10px] text-red-500 flex items-center gap-1 animate-fade-in z-10">
               <AlertCircle className="w-3 h-3" /> {error}
            </div>
         )}
      </form>

      <div className="flex-grow space-y-2 overflow-y-auto pr-2 custom-scrollbar mt-4">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
             <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center mb-3 bg-slate-50">
               <Check className="w-5 h-5" />
             </div>
             任務全數完成
          </div>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id} 
              className={`group flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                task.completed 
                  ? 'bg-slate-50/50 border-transparent opacity-60' 
                  : `${CATEGORY_STYLES[task.category]?.bg || 'bg-white border-slate-100'} hover:shadow-sm`
              }`}
            >
              <button onClick={() => toggleTask(task.id)} className="flex-shrink-0 text-slate-300 hover:text-indigo-500 transition-colors" aria-label={`${task.completed ? '標記未完成' : '標記完成'}：${task.text}`} aria-pressed={task.completed}>
                {task.completed ? <CheckCircle2 className="w-5 h-5 text-indigo-500" /> : <Circle className="w-5 h-5" />}
              </button>
              
              <div className="flex-grow min-w-0">
                <p className={`text-sm truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                   {task.text}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] tracking-wider font-bold ${CATEGORY_STYLES[task.category]?.tag || 'text-slate-500'}`}>
                    # {SubjectCategory[task.category.toUpperCase() as keyof typeof SubjectCategory]}
                    </span>
                    {task.dueDate && (
                       <span className={`flex items-center gap-1 text-[10px] ${task.completed ? 'text-slate-400' : getRemainingDaysColor(task.dueDate)}`}>
                          <CalendarClock className="w-3 h-3" />
                          {getRemainingDaysText(task.dueDate)}
                       </span>
                    )}
                </div>
              </div>
              
              <button 
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-400 transition-all"
                aria-label={`刪除任務：${task.text}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;
