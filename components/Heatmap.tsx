import React, { useMemo } from 'react';
import { StudySession } from '../types';

interface HeatmapProps {
  sessions: StudySession[];
}

const Heatmap: React.FC<HeatmapProps> = ({ sessions }) => {
  const { grid, maxDuration } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create last 365 days
    const days: { date: Date; duration: number }[] = [];
    const dailyDurations: Record<string, number> = {};
    
    sessions.forEach(s => {
      const d = new Date(s.timestamp);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyDurations[dateStr] = (dailyDurations[dateStr] || 0) + s.durationMinutes;
    });

    let max = 0;
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const duration = dailyDurations[dateStr] || 0;
      if (duration > max) max = duration;
      days.push({ date: d, duration });
    }

    // Group into weeks (columns)
    const weeks: { date: Date; duration: number }[][] = [];
    let currentWeek: { date: Date; duration: number }[] = [];
    
    // Pad first week to align with Sunday
    const firstDayOfWeek = days[0].date.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
       currentWeek.push({ date: new Date(0), duration: -1 }); // Empty cell
    }

    days.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: new Date(0), duration: -1 });
      }
      weeks.push(currentWeek);
    }

    return { grid: weeks, maxDuration: max || 1 };
  }, [sessions]);

  const getColor = (duration: number) => {
    if (duration === -1) return 'bg-transparent';
    if (duration === 0) return 'bg-slate-100';
    
    // 5 levels of intensity
    if (duration < 30) return 'bg-indigo-200';
    if (duration < 60) return 'bg-indigo-300';
    if (duration < 120) return 'bg-indigo-400';
    if (duration < 240) return 'bg-indigo-500';
    return 'bg-indigo-600';
  };

  const getTooltip = (date: Date, duration: number) => {
    if (duration === -1) return '';
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (duration === 0) return `${dateStr}: 沒有紀錄`;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    const timeStr = hours > 0 ? `${hours}小時 ${mins}分鐘` : `${mins}分鐘`;
    return `${dateStr}: ${timeStr}`;
  };

  return (
    <div className="w-full overflow-x-auto custom-scrollbar pb-2">
      <div className="min-w-[700px] flex gap-1">
        {grid.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1">
            {week.map((day, dIdx) => (
              <div
                key={dIdx}
                className={`w-3 h-3 rounded-sm ${getColor(day.duration)} transition-colors hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1`}
                title={getTooltip(day.date, day.duration)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-slate-500">
        <span>少</span>
        <div className="w-3 h-3 rounded-sm bg-slate-100"></div>
        <div className="w-3 h-3 rounded-sm bg-indigo-200"></div>
        <div className="w-3 h-3 rounded-sm bg-indigo-300"></div>
        <div className="w-3 h-3 rounded-sm bg-indigo-400"></div>
        <div className="w-3 h-3 rounded-sm bg-indigo-500"></div>
        <div className="w-3 h-3 rounded-sm bg-indigo-600"></div>
        <span>多</span>
      </div>
    </div>
  );
};

export default Heatmap;
