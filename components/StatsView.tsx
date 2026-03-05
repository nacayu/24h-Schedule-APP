
import React, { useMemo, useState, useEffect } from 'react';
import { Task, Category } from '../types';
import { CategoryConfig } from '../constants';
import { CheckCircle, Plus } from 'lucide-react';

interface StatsViewProps {
  tasks: Task[];
  isDarkMode?: boolean;
}

const StatsView: React.FC<StatsViewProps> = ({ tasks, isDarkMode = false }) => {
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('nh_custom_categories');
    if (saved) setCustomCategories(JSON.parse(saved));
  }, []);

  const calculateDuration = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMinutes < 0) totalMinutes += 1440;
    return totalMinutes / 60;
  };

  const last28Days = useMemo(() => {
    const dates = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const stats = useMemo(() => {
    const summary: Record<string, { 
      duration: number, 
      count: number, 
      lastDate: string,
      activeDays: Set<string> 
    }> = {};

    Object.values(Category).forEach(cat => {
      summary[cat] = { duration: 0, count: 0, lastDate: '', activeDays: new Set() };
    });

    tasks.forEach(task => {
      const s = summary[task.category];
      if (s) {
        s.duration += calculateDuration(task.startTime, task.endTime);
        s.count += 1;
        s.activeDays.add(task.date);
        if (!s.lastDate || task.date > s.lastDate) {
          s.lastDate = task.date;
        }
      }
    });

    return summary;
  }, [tasks]);

  const themeClasses = {
    card: isDarkMode ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-sm shadow-indigo-100/50',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-zinc-800',
    textMuted: isDarkMode ? 'text-zinc-500' : 'text-zinc-400',
    heatmapEmpty: isDarkMode ? 'bg-zinc-800' : 'bg-gray-100',
    checkActive: isDarkMode ? 'bg-zinc-100 text-zinc-900' : 'bg-[#8F87FF] text-white',
    checkInactive: isDarkMode ? 'bg-zinc-800 text-zinc-700' : 'bg-gray-50 text-gray-200'
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 gap-4">
        {Object.values(Category).map((cat) => {
          const s = stats[cat];
          const config = CategoryConfig[cat];
          const isActive = s.count > 0;

          return (
            <div 
              key={cat} 
              className={`p-5 rounded-[32px] border flex flex-col justify-between transition-all duration-300 ${themeClasses.card} ${!isActive && 'opacity-30'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-0.5">
                  <h3 className={`text-[10px] font-black tracking-tight uppercase ${themeClasses.textMuted}`}>{cat}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${themeClasses.textMain}`}>{s.duration.toFixed(1)}</span>
                    <span className={`text-[9px] font-bold ${themeClasses.textMuted}`}>H</span>
                  </div>
                </div>
                <div className={`p-1.5 rounded-full transition-colors duration-300 ${isActive ? themeClasses.checkActive : themeClasses.checkInactive}`}>
                  <CheckCircle size={10} strokeWidth={3} />
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="space-y-3 flex-1 mr-2">
                  <div className="flex flex-wrap gap-[2px] w-[70px]">
                    {last28Days.map((date) => (
                      <div 
                        key={date}
                        className={`w-[6px] h-[6px] rounded-[1.5px] ${
                          s.activeDays.has(date) 
                            ? config.color.split(' ')[0] 
                            : themeClasses.heatmapEmpty
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-colors ${
                  isDarkMode ? (isActive ? config.lightColor : 'border-white/5') : (isActive ? config.lightColor : 'border-gray-50 bg-gray-50')
                }`}>
                   {config.icon}
                </div>
              </div>
            </div>
          );
        })}

        <button className={`p-5 rounded-[32px] border border-dashed flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
          isDarkMode ? 'border-zinc-800 text-zinc-500 bg-zinc-900/30' : 'border-zinc-200 text-zinc-400 bg-white shadow-sm'
        }`}>
          <div className={`p-2 rounded-full border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
            <Plus size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">New Category</span>
        </button>
      </div>
    </div>
  );
};

export default StatsView;
