
import React, { useId, useState } from 'react';
import { TodoItem, SubjectCategory } from '../types';
import { Plus, Trash2, Check, ListChecks, AlertCircle, CalendarClock, ChevronDown } from 'lucide-react';
import './TaskList.css';

interface TaskListProps {
  tasks: TodoItem[];
  setTasks: React.Dispatch<React.SetStateAction<TodoItem[]>>;
  previewLimit?: number;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, setTasks, previewLimit }) => {
  const [expanded, setExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const listId = useId();
  const orderedTasks = previewLimit ? [...tasks.filter(task => !task.completed), ...tasks.filter(task => task.completed)] : tasks;
  const visibleTasks = previewLimit && !expanded ? orderedTasks.slice(0, previewLimit) : orderedTasks;
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
      updatedAt: Date.now(),
    };
    setTasks(previous => [...previous, newTask]);
    setExpanded(true);
    setInputValue('');
    setDueDate('');
    setIsAdding(false);
  };

  const toggleTask = (id: string) => {
    setTasks(previous => previous.map(t => t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t));
  };

  const deleteTask = (id: string) => {
    if (window.confirm('確定要刪除這個任務嗎？')) {
      setTasks(previous => previous.filter(t => t.id !== id));
    }
  };

  const categories = Object.keys(SubjectCategory) as Array<keyof typeof SubjectCategory>;

  const completedCount = tasks.filter(task => task.completed).length;
  const remainingCount = tasks.length - completedCount;
  const progress = tasks.length ? Math.round(completedCount / tasks.length * 100) : 0;
  const errorId = `${listId}-error`;

  return (
    <div className="task-planner">
      <header className="task-planner-header">
        <div><p className="task-planner-eyebrow"><ListChecks size={13} aria-hidden="true" /> MY DAILY PLAN</p><h3>今天要完成的事</h3><p className="task-planner-subtitle">一件一件，慢慢完成。</p></div>
        <div className="task-progress-ring" style={{ '--task-progress': `${progress}%` } as React.CSSProperties} aria-label={`已完成 ${completedCount} 件，共 ${tasks.length} 件任務`}><span><strong>{completedCount}</strong><small>/ {tasks.length}</small></span></div>
      </header>
      <div className="task-planner-progress">
        <div><span>{tasks.length === 0 ? '從一件小事開始' : remainingCount === 0 ? '今天的安排，都完成了' : `還有 ${remainingCount} 件，慢慢完成就好`}</span><span>{progress}%</span></div>
        <div className="task-progress-track" role="progressbar" aria-label="任務完成進度" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
      </div>

      <button type="button" className="task-composer-toggle" aria-label={isAdding ? '收起新增任務' : '展開新增任務'} aria-expanded={isAdding} aria-controls={`${listId}-composer`} onClick={() => setIsAdding(value => !value)}><Plus size={15} aria-hidden="true" style={{ transform: isAdding ? 'rotate(45deg)' : undefined }} />{isAdding ? '收起新增' : '新增任務'}</button>
      {isAdding && <form id={`${listId}-composer`} onSubmit={handleAddTask} className="task-composer">
        <label className="task-composer-title" htmlFor={`${listId}-input`}>下一件想完成什麼？</label>
        <input id={`${listId}-input`} type="text" value={inputValue} onChange={e => { setInputValue(e.target.value); if (error) setError(''); }} placeholder="新增任務..." maxLength={20} aria-label="任務內容" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} autoFocus />
        <div className="task-composer-options">
          <label><span>科目</span><select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value as TodoItem['category'])} aria-label="選擇任務科目">{categories.map(key => <option key={key} value={key.toLowerCase()}>{SubjectCategory[key]}</option>)}</select></label>
          <label><span>期限 <small>選填</small></span><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} aria-label="任務到期日" /></label>
        </div>
        {error && <p id={errorId} role="alert" className="task-composer-error"><AlertCircle size={13} aria-hidden="true" />{error}</p>}
        <button type="submit" aria-label="新增任務" className="task-add-button"><Plus size={16} aria-hidden="true" />加入今天的計畫</button>
      </form>}

      <div className="task-list-heading"><span>{tasks.length ? '我的任務' : '留一點空間，開始行動'}</span><small>{tasks.length ? `${completedCount} 件已完成` : '每一件小事，都算進步'}</small></div>
      <div id={listId} className="task-list-items">
        {tasks.length === 0 ? <div className="task-list-empty"><span className="task-empty-mark" aria-hidden="true"><ListChecks size={26} strokeWidth={1.3} /><i><Plus size={10} /></i></span><strong>今天，想先完成哪件事？</strong><p>讀一篇文章、解幾題數學，<br />把小目標寫下來，就從這裡開始。</p></div> : visibleTasks.map(task => (
          <div key={task.id} className="group task-planner-item" data-category={task.category} data-completed={task.completed}>
            <button type="button" onClick={() => toggleTask(task.id)} className="task-toggle" aria-label={`${task.completed ? '標記未完成' : '標記完成'}：${task.text}`} aria-pressed={task.completed}><span>{task.completed && <Check size={13} strokeWidth={2.5} />}</span></button>
            <div className="task-item-copy"><p>{task.text}</p><div className="task-item-details"><span className="task-category"><i />{SubjectCategory[task.category.toUpperCase() as keyof typeof SubjectCategory] || '其他'}</span>{task.dueDate && <span className={`task-due-date ${task.completed ? '' : getRemainingDaysColor(task.dueDate)}`}><CalendarClock size={11} aria-hidden="true" />{getRemainingDaysText(task.dueDate)}</span>}</div></div>
            <button type="button" onClick={() => deleteTask(task.id)} className="task-delete" aria-label={`刪除任務：${task.text}`}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      {previewLimit && tasks.length > previewLimit && <button type="button" className="task-list-expand" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(value => !value)}>{expanded ? '收合任務' : `查看全部 ${tasks.length} 件任務`}<ChevronDown size={14} aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : undefined }} /></button>}
    </div>
  );
};

export default TaskList;
