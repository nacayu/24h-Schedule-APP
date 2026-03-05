
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  User,
  Clock,
  Plus,
  Smile,
  Calendar as CalendarIcon,
  Settings,
  Loader2,
  Check,
  X,
  Pin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LayoutGrid,
  List,
  MoreVertical,
  Trash2,
  Edit2
} from 'lucide-react';
import { Task, Category, JournalEntry } from './types';
import { CategoryConfig } from './constants';
import { parseTaskDetails, analyzeJournalEntry, classifyActivity } from './services/geminiService';

// --- Sub-components ---

const WheelPicker: React.FC<{
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
  label: string;
}> = ({ items, selected, onSelect, label }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);
  const itemHeight = 44;

  // Sync scroll position when 'selected' or 'items' changes
  useEffect(() => {
    if (scrollRef.current) {
      const index = items.indexOf(selected);
      if (index !== -1) {
        const targetScrollTop = index * itemHeight;
        // Use immediate jump for first render to avoid scroll animation issues
        if (isInitialRender.current) {
          scrollRef.current.scrollTop = targetScrollTop;
          isInitialRender.current = false;
        } else if (Math.abs(scrollRef.current.scrollTop - targetScrollTop) > 1) {
          // Only scroll if there's a significant difference to avoid feedback loops
          scrollRef.current.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selected, items]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // We only want to trigger onSelect if the user is actually scrolling
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (items[index] && items[index] !== selected) {
      onSelect(items[index]);
    }
  };

  return (
    <div className="flex flex-col items-center flex-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</span>
      <div className="relative h-[220px] w-full overflow-hidden">
        {/* Selection Highlighting Overlay */}
        <div className="absolute top-[88px] left-4 right-4 h-[44px] bg-[#8F87FF]/5 rounded-xl pointer-events-none border-y border-[#8F87FF]/10 z-10" />
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[88px] relative z-0"
          style={{ scrollBehavior: 'auto' }} // Internal scrolls managed manually or via snap
        >
          {items.map((item) => (
            <div 
              key={item}
              className={`h-[44px] flex items-center justify-center snap-center transition-all duration-200 ${
                selected === item ? 'text-[#8F87FF] text-2xl font-black' : 'text-gray-300 text-lg font-bold opacity-30'
              }`}
              onClick={() => onSelect(item)}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TimelineView: React.FC<{ tasks: Task[]; selectedDate: string }> = ({ tasks, selectedDate }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const nowInMinutes = now.getHours() * 60 + now.getMinutes();

  const renderGap = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    
    if (diff <= 15) return <div className="h-4" />;
    
    return (
      <div className="flex items-center gap-4 py-4 px-2">
        <div className="w-12 text-right">
          <span className="text-[10px] font-black text-gray-200 tabular-nums">{startTime}</span>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-50 border-t border-dashed border-gray-100" />
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-2 bg-white rounded-full border border-gray-50">
            {Math.floor(diff / 60)}H {diff % 60}M Gaps
          </span>
          <div className="h-px flex-1 bg-gray-50 border-t border-dashed border-gray-100" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar relative pt-6 pb-32 px-6">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full opacity-20 text-center px-10">
          <Clock size={64} className="mb-4" />
          <p className="font-black text-lg">今日暂无日程安排</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {tasks.map((task, index) => {
            const config = CategoryConfig[task.category];
            const elements = [];

            if (index === 0) {
              const [h, m] = task.startTime.split(':').map(Number);
              if (h > 0 || m > 0) {
                elements.push(<React.Fragment key={`gap-start`}>{renderGap("00:00", task.startTime)}</React.Fragment>);
              }
            } else {
              const prevTask = tasks[index - 1];
              if (prevTask.endTime !== task.startTime) {
                elements.push(<React.Fragment key={`gap-${index}`}>{renderGap(prevTask.endTime, task.startTime)}</React.Fragment>);
              }
            }

            const [tsh, tsm] = task.startTime.split(':').map(Number);
            const taskStartMinutes = tsh * 60 + tsm;
            if (isToday && index === 0 && nowInMinutes < taskStartMinutes) {
               elements.push(
                 <div key="now-indicator-top" className="flex items-center gap-2 py-4">
                    <div className="w-12 shrink-0" />
                    <div className="flex-1 h-px bg-red-500/20 relative">
                       <div className="absolute -left-1.5 -top-1 w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                       <span className="absolute left-4 -top-2 text-[9px] font-black text-red-500 bg-white px-1">NOW</span>
                    </div>
                 </div>
               );
            }

            elements.push(
              <div key={task.id} className="flex gap-4 group">
                <div className="w-12 pt-4 text-right shrink-0">
                   <span className="text-[11px] font-black text-zinc-300 tabular-nums">{task.startTime}</span>
                </div>
                <div className={`flex-1 rounded-[36px] p-6 mb-2 border border-white/60 shadow-sm relative flex flex-col justify-between ${config.lightColor}`}>
                   <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black opacity-40 uppercase tracking-tighter">
                               {task.startTime} - {task.endTime}
                               {task.isRoutine && " · FIXED"}
                            </span>
                         </div>
                         <h4 className="font-black text-lg leading-tight text-gray-900 line-clamp-2">{task.content}</h4>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                         <div className="opacity-30 p-2 bg-white/20 rounded-2xl">{config.icon}</div>
                      </div>
                   </div>
                   {task.description && (
                     <p className="text-sm font-medium opacity-50 mt-1.5 line-clamp-3 leading-relaxed">
                        {task.description}
                     </p>
                   )}
                </div>
              </div>
            );

            return elements;
          })}
        </div>
      )}
    </div>
  );
};

// --- Main App Logic ---

const StatusMatrix: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  return (
    <div className="grid grid-cols-6 grid-rows-3 gap-1.5 opacity-20">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="w-[4px] h-[4px] rounded-full bg-gray-900" />
      ))}
    </div>
  );
};

const CARD_COLORS = [
  'from-[#3B82F6] to-[#2563EB]', 
  'from-[#8F87FF] to-[#7F75FF]',
  'from-[#FF6B6B] to-[#EE5253]',
  'from-[#10AC84] to-[#08917A]',
];

const JOURNAL_PLACEHOLDERS = [
  "今天发生在我身上\n最值得讲述的事情",
  "此时此刻，我的脑海里\n正在思考些什么？",
  "记录一个今天让你\n感到心动的微小瞬间",
  "如果今天要写进传记\n这一章该叫什么名字？",
  "今天的你，在哪些方面\n悄悄变厉害了一点？",
  "此时此刻，你窗外的\n景色是什么样子的？",
  "今天有没有什么让你\n感到意外的小确幸？",
  "记录今天哪一个时刻\n让你感到最放松？",
  "给未来的自己，在这里\n留下一句想说的话吧",
  "今天学到的最有意思的\n一个知识是什么？"
];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [journalEntries, setJournalEntries] = useState<Record<string, JournalEntry>>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'now' | 'myday' | 'me'>('now');
  const [viewMode, setViewMode] = useState<'stack' | 'timeline'>('stack');
  
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", startTime: "12:00", endTime: "13:00", category: Category.WORK, isRoutine: false });
  
  const [timePickerMode, setTimePickerMode] = useState<'startTime' | 'endTime' | null>(null);
  const [tempTime, setTempTime] = useState({ hour: "12", minute: "00" });

  const [isEditingJournal, setIsEditingJournal] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false); 
  const [isPinned, setIsPinned] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState(""); 

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const weekStripRef = useRef<HTMLDivElement>(null);

  const dateRange = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = -100; i <= 100; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const last28Days = useMemo(() => {
    const dates = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const currentIndex = useMemo(() => dateRange.indexOf(selectedDate), [dateRange, selectedDate]);

  const stripDates = useMemo(() => {
    const center = new Date(selectedDate);
    const dates = [];
    const labels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    for (let i = -15; i <= 15; i++) {
      const d = new Date(center);
      d.setDate(center.getDate() + i);
      dates.push({
        day: d.getDate(),
        label: labels[d.getDay()],
        fullDate: d.toISOString().split('T')[0]
      });
    }
    return dates;
  }, [selectedDate]);

  useEffect(() => {
    if (weekStripRef.current) {
        const activeElement = weekStripRef.current.querySelector('[data-active="true"]');
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }
  }, [selectedDate]);

  const goNextDay = () => {
    if (currentIndex < dateRange.length - 1) {
      setSelectedDate(dateRange[currentIndex + 1]);
    }
  };

  const goPrevDay = () => {
    if (currentIndex > 0) {
      setSelectedDate(dateRange[currentIndex - 1]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAddingInline || editingTaskId || isEditingJournal || timePickerMode) return;
      if (e.key === 'ArrowRight') goNextDay();
      if (e.key === 'ArrowLeft') goPrevDay();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isAddingInline, editingTaskId, isEditingJournal, timePickerMode]);

  useEffect(() => {
    const savedTasks = localStorage.getItem('nh_habits_v18');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    const savedJournals = localStorage.getItem('nh_journal_v2'); 
    if (savedJournals) setJournalEntries(JSON.parse(savedJournals));
  }, []);

  useEffect(() => {
    localStorage.setItem('nh_habits_v18', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('nh_journal_v2', JSON.stringify(journalEntries));
  }, [journalEntries]);

  const resetNewTaskWithDefaults = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const startT = `${String(currentHour).padStart(2, '0')}:00`;
    const endT = `${String((currentHour + 1) % 24).padStart(2, '0')}:00`;
    
    setNewTask({ 
      title: "", 
      description: "", 
      startTime: startT, 
      endTime: endT, 
      category: Category.WORK, 
      isRoutine: false 
    });
  };

  useEffect(() => {
    setIsEditingJournal(false);
    setIsFlipped(false);
    setIsPinned(false);
    setIsAddingInline(false);
    setEditingTaskId(null);
    setEditTitle("");
    setEditBody("");
    resetNewTaskWithDefaults();
  }, [selectedDate]);

  const headerDate = useMemo(() => {
    const d = new Date(selectedDate);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return {
      day: d.getDate(),
      month: months[d.getMonth()],
      weekday: weekdays[d.getDay()]
    };
  }, [selectedDate]);

  const realStats = useMemo(() => {
    const stats: Record<string, { duration: number, count: number, lastDate: string, activeDates: Set<string> }> = {};
    Object.values(Category).forEach(cat => {
      stats[cat] = { duration: 0, count: 0, lastDate: '', activeDates: new Set() };
    });
    tasks.forEach(task => {
      const s = stats[task.category];
      if (s) {
        const [sh, sm] = task.startTime.split(':').map(Number);
        const [eh, em] = task.endTime.split(':').map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 1440;
        s.duration += mins / 60;
        s.count += 1;
        s.activeDates.add(task.date);
        if (!s.lastDate || task.date > s.lastDate) s.lastDate = task.date;
      }
    });
    return stats;
  }, [tasks]);

  const sortedTasksForSelectedDate = useMemo(() => {
    return tasks
      .filter(t => t.date === selectedDate || t.isRoutine)
      .sort((a, b) => {
        const [ah, am] = a.startTime.split(':').map(Number);
        const [bh, bm] = b.startTime.split(':').map(Number);
        return (ah * 60 + am) - (bh * 60 + bm);
      });
  }, [tasks, selectedDate]);

  const handleSaveJournal = async () => {
    setIsTranscribing(true);
    try {
        let finalTitle = editTitle;
        if (!editTitle && editBody.trim()) {
             const result = await analyzeJournalEntry(editBody);
             finalTitle = result.title;
        } else if (!editTitle) {
             finalTitle = "";
        }
        
        const newEntry: JournalEntry = {
          id: journalEntries[selectedDate]?.id || Math.random().toString(36).substr(2, 9),
          date: selectedDate,
          title: finalTitle, 
          content: editBody, 
          mood: journalEntries[selectedDate]?.mood || ""
        };
        setJournalEntries(prev => ({ ...prev, [selectedDate]: newEntry }));
        setIsEditingJournal(false);
    } catch (e) { 
        console.error(e); 
        setIsEditingJournal(false);
    } finally { 
        setIsTranscribing(false); 
    }
  };

  const handleSaveNewTask = async () => {
    if (!newTask.title.trim()) return;
    setIsSavingManual(true);
    try {
      let finalCategory = newTask.category;
      if (finalCategory === Category.OTHER) {
        finalCategory = await classifyActivity(newTask.title + " " + newTask.description);
      }

      if (editingTaskId) {
        // Update existing
        setTasks(prev => prev.map(t => t.id === editingTaskId ? {
          ...t,
          startTime: newTask.startTime,
          endTime: newTask.endTime,
          content: newTask.title,
          description: newTask.description,
          category: finalCategory,
          isRoutine: newTask.isRoutine
        } : t));
        setEditingTaskId(null);
      } else {
        // Create new
        const t: Task = {
          id: Math.random().toString(36).substr(2, 9).toUpperCase(),
          date: selectedDate,
          startTime: newTask.startTime,
          endTime: newTask.endTime, 
          content: newTask.title,
          description: newTask.description,
          category: finalCategory,
          timestamp: Date.now(),
          isRoutine: newTask.isRoutine
        };
        setTasks(prev => [...prev, t]);
        setIsAddingInline(false);
      }
      resetNewTaskWithDefaults();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setIsAddingInline(false); // Make sure we aren't "adding" while "editing"
    setNewTask({
      title: task.content,
      description: task.description || "",
      startTime: task.startTime,
      endTime: task.endTime,
      category: task.category,
      isRoutine: !!task.isRoutine
    });
  };

  const openTimePicker = (mode: 'startTime' | 'endTime') => {
    const currentVal = newTask[mode];
    const [h, m] = currentVal.split(':');
    const minuteNum = parseInt(m);
    // Snap to nearest 5 minutes for the wheel
    const roundedM = String(Math.round(minuteNum / 5) * 5 % 60).padStart(2, '0');
    
    // Explicitly update tempTime state to exactly match the button's hour and snapped minutes
    setTempTime({ hour: h, minute: roundedM });
    setTimePickerMode(mode);
  };

  const confirmTimePicker = () => {
    if (timePickerMode) {
      const timeStr = `${tempTime.hour}:${tempTime.minute}`;
      setNewTask(prev => {
        const updated = { ...prev, [timePickerMode]: timeStr };
        if (timePickerMode === 'startTime') {
          const [sh, sm] = timeStr.split(':').map(Number);
          const [eh, em] = updated.endTime.split(':').map(Number);
          if ((eh * 60 + em) <= (sh * 60 + sm)) {
            updated.endTime = `${String((sh + 1) % 24).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
          }
        }
        return updated;
      });
    }
    setTimePickerMode(null);
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isPinned || isAddingInline || editingTaskId || isEditingJournal || timePickerMode || viewMode === 'timeline') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    startX.current = clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const offset = clientX - startX.current;
    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const threshold = 100;
    if (swipeOffset < -threshold) {
      goNextDay();
    } else if (swipeOffset > threshold) {
      goPrevDay();
    }
    setSwipeOffset(0);
  };

  const renderTaskForm = () => (
    <div className="bg-white rounded-[40px] p-5 shadow-xl flex flex-col gap-3 animate-in zoom-in-95 duration-200 border border-gray-100 relative w-full">
      {isSavingManual && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-[40px] flex items-center justify-center z-10"><Loader2 size={32} className="animate-spin text-zinc-900" /></div>}
      <div className="relative group">
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 px-1">任务分类</label>
        <div className="relative">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">{CategoryConfig[newTask.category].icon}</div>
          <select className="w-full text-sm bg-gray-50 rounded-2xl pl-12 pr-12 py-3 text-gray-800 font-bold outline-none border border-gray-100 appearance-none focus:ring-2 ring-zinc-100 cursor-pointer" value={newTask.category} onChange={e => setNewTask({...newTask, category: e.target.value as Category})}>
            {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18} />
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-[32px] overflow-hidden border border-gray-100 focus-within:ring-2 ring-zinc-100 transition-all flex flex-col w-full">
        <input 
          autoFocus 
          type="text" 
          placeholder="任务标题" 
          className="w-full text-lg font-bold text-gray-800 bg-transparent px-6 pt-4 pb-1 outline-none" 
          value={newTask.title} 
          onChange={e => setNewTask({...newTask, title: e.target.value})} 
        />
        <textarea 
          placeholder="正文/详情" 
          className="w-full text-lg text-gray-600 bg-transparent px-6 pb-4 pt-1 outline-none resize-none h-24 leading-relaxed" 
          value={newTask.description} 
          onChange={e => setNewTask({...newTask, description: e.target.value})} 
        />
      </div>

      <div className="flex gap-2 items-center w-full">
        <button onClick={() => openTimePicker('startTime')} className="flex-1 flex flex-col items-center bg-gray-50 rounded-2xl py-2 px-3 border border-gray-100 active:scale-95 transition-transform min-w-0"><span className="text-[9px] font-black uppercase tracking-tighter text-gray-400 mb-0.5 truncate w-full text-center">开始时间</span><span className="text-lg font-black text-gray-700">{newTask.startTime}</span></button>
        <span className="text-gray-300 font-black shrink-0"><ChevronRight size={14} /></span>
        <button onClick={() => openTimePicker('endTime')} className="flex-1 flex flex-col items-center bg-gray-50 rounded-2xl py-2 px-3 border border-gray-100 active:scale-95 transition-transform min-w-0"><span className="text-[9px] font-black uppercase tracking-tighter text-gray-400 mb-0.5 truncate w-full text-center">结束时间</span><span className="text-lg font-black text-gray-700">{newTask.endTime}</span></button>
      </div>
      <div className="px-1 py-1 flex items-center justify-between border-t border-gray-50 mt-0.5">
        <div className="flex flex-col"><span className="text-[11px] font-black text-gray-900">每日固定日程</span><span className="text-[9px] text-gray-400 font-bold">开启后该任务将每天自动展示</span></div>
        <button onClick={() => setNewTask(prev => ({ ...prev, isRoutine: !prev.isRoutine }))} className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${newTask.isRoutine ? 'bg-zinc-900' : 'bg-gray-200'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${newTask.isRoutine ? 'left-7' : 'left-1'}`} /></button>
      </div>
    </div>
  );

  const renderCardContent = (date: string, isTop: boolean, indexInStack: number) => {
    const journal = journalEntries[date];
    const dayTasks = tasks.filter(t => t.date === date || t.isRoutine).sort((a,b) => a.startTime.localeCompare(b.startTime));
    const isEditing = isEditingJournal && isTop;
    const dateIdx = dateRange.indexOf(date);
    const colorClass = CARD_COLORS[Math.abs(dateIdx) % CARD_COLORS.length];
    const placeholder = JOURNAL_PLACEHOLDERS[Math.abs(dateIdx) % JOURNAL_PLACEHOLDERS.length];

    return (
      <div className={`relative w-full h-full transform-style-3d select-none ${isTop ? '' : 'pointer-events-none'}`}>
        <div 
          className={`absolute inset-0 w-full h-full backface-hidden rounded-[48px] p-8 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-gradient-to-br ${colorClass} text-white transition-all duration-700 ease-in-out`}
          style={{ transform: isFlipped && isTop ? 'rotateY(-180deg)' : 'rotateY(0deg)', zIndex: isFlipped && isTop ? 0 : 10, opacity: isFlipped && isTop ? 0 : 1 }}
          onDoubleClick={() => isTop && !isPinned && setIsFlipped(true)}
        >
          {isEditing ? (
            <div className="flex flex-col h-full gap-4 relative">
                <input autoFocus type="text" className="bg-transparent border-none outline-none text-[24px] font-black placeholder-white/50 text-white w-full text-center" placeholder="给今天起个标题吧" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <textarea className="flex-1 w-full bg-transparent border-none outline-none text-xl placeholder-white/40 resize-none pt-4 leading-relaxed" placeholder="点击此处开始记录..." value={editBody} onChange={(e) => setEditBody(e.target.value)} />
            </div>
          ) : (
            <>
              <div className="flex justify-end items-start">
                {isTop && (
                  <button onClick={(e) => { e.stopPropagation(); setIsPinned(!isPinned); }} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isPinned ? 'bg-white text-zinc-900 shadow-lg scale-110' : 'bg-white/10 text-white hover:bg-white/20'}`}><Pin size={22} fill={isPinned ? "currentColor" : "none"} /></button>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-center items-center text-center px-4 overflow-y-auto no-scrollbar pb-8">
                 {journal?.title || journal?.content ? (
                    <div className="space-y-6" onClick={() => isTop && setIsEditingJournal(true)}>
                       {journal?.title && <h2 className="text-[26px] font-black leading-tight tracking-tight drop-shadow-sm">{journal.title}</h2>}
                       {journal?.content && <p className="text-xl opacity-90 leading-relaxed font-medium line-clamp-6">{journal.content}</p>}
                    </div>
                 ) : (
                    <h2 onClick={() => isTop && setIsEditingJournal(true)} className="text-[24px] font-black leading-snug opacity-90 cursor-text hover:opacity-100 transition-opacity whitespace-pre-line">{placeholder}</h2>
                 )}
              </div>
            </>
          )}
          {isTop && isEditing && (
            <div className="absolute bottom-8 left-0 right-0 h-16 pointer-events-none flex justify-center items-center">
              <button onClick={(e) => { e.stopPropagation(); handleSaveJournal(); }} className="w-16 h-16 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-xl active:scale-95 transition-transform pointer-events-auto"><Check size={32} strokeWidth={4} /></button>
            </div>
          )}
        </div>

        <div 
          className={`absolute inset-0 w-full h-full backface-hidden rounded-[48px] px-6 py-8 flex flex-col shadow-2xl bg-white text-gray-800 transition-all duration-700 ease-in-out`}
          style={{ transform: isFlipped && isTop ? 'rotateY(0deg)' : 'rotateY(180deg)', zIndex: isFlipped && isTop ? 10 : 0, opacity: isFlipped && isTop ? 1 : 0 }}
          onDoubleClick={() => isTop && !isPinned && !isAddingInline && !editingTaskId && setIsFlipped(false)}
        >
          <div className="flex justify-between items-center mb-5 px-2">
              <h3 className="text-2xl font-black text-gray-900">日程记录</h3>
              {isTop && <button onClick={(e) => { e.stopPropagation(); setIsPinned(!isPinned); }} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isPinned ? 'bg-zinc-900 text-white shadow-lg scale-110' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}><Pin size={22} fill={isPinned ? "currentColor" : "none"} /></button>}
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar pb-10 flex flex-col gap-4">
               {dayTasks.map((task) => (
                 editingTaskId === task.id ? (
                   <React.Fragment key={task.id}>
                     {renderTaskForm()}
                   </React.Fragment>
                 ) : (
                   <div 
                     key={task.id} 
                     onClick={() => isTop && startEditingTask(task)}
                     className="flex gap-5 p-6 rounded-[36px] bg-gray-50/70 hover:bg-gray-100 transition-all active:scale-[0.98] relative border border-gray-100/50 cursor-pointer"
                   >
                      <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${CategoryConfig[task.category].lightColor} shadow-sm`}>{CategoryConfig[task.category].icon}</div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">{task.startTime}~{task.endTime}{task.isRoutine && <RefreshCw size={10} className="text-zinc-300" />}</span>
                         </div>
                         <h4 className="font-bold text-gray-900 text-lg leading-snug">{task.content}</h4>
                         {task.description && <p className="text-base text-gray-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>}
                      </div>
                      <div className="shrink-0 flex items-center">
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                            className="p-2.5 rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                         >
                            <Trash2 size={18} />
                         </button>
                      </div>
                   </div>
                 )
               ))}
               {isTop && !editingTaskId && (isAddingInline ? (
                   renderTaskForm()
                 ) : (
                   <div onClick={() => { setIsAddingInline(true); setEditingTaskId(null); resetNewTaskWithDefaults(); }} className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[36px] py-12 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group"><Plus size={40} className="text-gray-300 group-hover:text-gray-400 transition-colors" /></div>
                 ))}
          </div>
          {(isAddingInline || editingTaskId) && isTop && (
             <div className="absolute bottom-6 right-6 flex items-center z-20 gap-3">
                <button onClick={() => { setIsAddingInline(false); setEditingTaskId(null); }} disabled={isSavingManual} className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shadow-md active:scale-95 transition-transform hover:bg-gray-200"><X size={24} /></button>
                <button onClick={handleSaveNewTask} disabled={isSavingManual} className="w-16 h-16 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform">{isSavingManual ? <Loader2 className="animate-spin" size={32} /> : <Check size={32} strokeWidth={4} />}</button>
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderNowTab = () => {
    const visibleIndices = [currentIndex, currentIndex + 1, currentIndex + 2].filter(idx => idx >= 0 && idx < dateRange.length);
    return (
      <div 
        className="flex-1 flex flex-col perspective-1200 overflow-hidden justify-start relative select-none"
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-white" />

        <div className="px-10 flex justify-end items-center mb-4 z-20">
            <div className="flex bg-gray-100/50 backdrop-blur-md p-1 rounded-2xl border border-gray-200/50">
              <button 
                onClick={() => setViewMode('stack')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ${viewMode === 'stack' ? 'bg-white shadow-sm text-zinc-900 scale-105' : 'text-gray-400'}`}
              >
                <LayoutGrid size={14} strokeWidth={3} />
                <span className="text-[9px] font-black uppercase">Stack</span>
              </button>
              <button 
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ${viewMode === 'timeline' ? 'bg-white shadow-sm text-zinc-900 scale-105' : 'text-gray-400'}`}
              >
                <List size={14} strokeWidth={3} />
                <span className="text-[9px] font-black uppercase">Timeline</span>
              </button>
            </div>
        </div>

        {viewMode === 'stack' ? (
          <div className="relative w-full h-[88%] px-5 pointer-events-none z-10 translate-y-[20px]">
            {visibleIndices.reverse().map((idx, i) => {
              const date = dateRange[idx];
              const depth = visibleIndices.length - 1 - i; 
              const isTop = depth === 0;
              const swipeProgress = Math.abs(swipeOffset) / 300;
              const x = isTop ? swipeOffset : 0;
              const rotation = isTop ? swipeOffset / 15 : (depth === 1 ? 2 : -2);
              const baseScale = 1 - (depth * 0.06);
              const baseTranslateY = (depth * 8); 
              const dynamicScale = isTop ? 1 : baseScale + (swipeProgress * 0.04);
              const dynamicTranslateY = isTop ? 0 : baseTranslateY - (swipeProgress * 4);
              const opacity = 1 - (depth * 0.2);

              return (
                <div 
                  key={date}
                  className="absolute inset-x-5 inset-y-0 transition-all duration-300 ease-out"
                  style={{ 
                    transform: `translateX(${x}px) rotate(${rotation}deg) scale(${dynamicScale}) translateY(${dynamicTranslateY}px)`,
                    zIndex: 100 - depth,
                    opacity: opacity,
                    pointerEvents: isTop ? 'auto' : 'none',
                    transformOrigin: 'bottom center'
                  }}
                >
                  {renderCardContent(date, isTop, depth)}
                </div>
              );
            })}
          </div>
        ) : (
          <TimelineView tasks={sortedTasksForSelectedDate} selectedDate={selectedDate} />
        )}
      </div>
    );
  };

  const renderMeTab = () => (
    <div className="flex-1 flex flex-col px-10 pb-32 pt-0 overflow-y-auto no-scrollbar space-y-8">
       <div className="grid grid-cols-2 gap-4">
          {Object.entries(realStats).map(([cat, s]: [string, any]) => (
              <div key={cat} className={`bg-white rounded-[40px] p-6 relative flex flex-col justify-between min-h-[170px] shadow-sm border border-gray-100 transition-all hover:shadow-md ${s.count === 0 && 'opacity-40 grayscale'}`}>
                 <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-[10px] text-gray-400 uppercase tracking-widest">{CategoryConfig[cat as Category].label}</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${s.count > 0 ? 'bg-zinc-900 text-white' : 'text-gray-200 border border-gray-100'}`}><Check size={12} strokeWidth={4} /></div>
                 </div>
                 <div className="mb-4">
                    <span className="text-3xl font-black text-gray-900">{s.duration.toFixed(1)}</span>
                    <span className="text-[10px] font-black text-gray-400 ml-1 uppercase">hrs</span>
                 </div>
                 <div className="grid grid-cols-7 gap-[2.5px] w-full mb-1">
                    {last28Days.map(date => <div key={date} className={`w-full aspect-square rounded-[1.5px] ${s.activeDates.has(date) ? CategoryConfig[cat as Category].color.split(' ')[0] : 'bg-gray-100'}`} />)}
                 </div>
                 <div className={`absolute bottom-6 right-6 transform scale-150 opacity-10 ${CategoryConfig[cat as Category].lightColor} bg-transparent`}>{CategoryConfig[cat as Category].icon}</div>
              </div>
          ))}
       </div>
    </div>
  );

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white select-none overflow-hidden relative font-sans">
      <header className="px-10 pt-14 pb-4 shrink-0 flex flex-col gap-6 z-10 bg-white">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2 cursor-pointer" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
              <span className="text-[32px] font-black leading-tight text-gray-900 uppercase tracking-tighter">
                {headerDate.month} {headerDate.day}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 opacity-40 font-black text-[10px] text-gray-900 uppercase tracking-widest">
              <span>{headerDate.weekday}</span>
              <div className="w-1 h-1 rounded-full bg-gray-400" />
              <span>CLOUDY 24°C</span>
            </div>
          </div>
          <StatusMatrix tasks={tasks} />
        </div>

        {activeTab !== 'myday' && (
          <div 
            ref={weekStripRef}
            className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2 py-2"
            style={{ scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem' }}
          >
             {stripDates.map(d => (
               <button
                 key={d.fullDate}
                 data-active={d.fullDate === selectedDate}
                 onClick={() => setSelectedDate(d.fullDate)}
                 className="flex flex-col items-center gap-2 shrink-0 snap-center transition-all group w-[13%]"
               >
                  <span className={`text-[8px] font-black uppercase tracking-tighter transition-colors ${d.fullDate === selectedDate ? 'text-zinc-900' : 'text-gray-300 group-hover:text-gray-400'}`}>
                    {d.label}
                  </span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                    d.fullDate === selectedDate ? 'bg-zinc-900 text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-gray-50'
                  }`}>
                    {d.day}
                  </div>
               </button>
             ))}
          </div>
        )}
      </header>
      
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {activeTab === 'now' && renderNowTab()}
        {activeTab === 'myday' && (
          <div className="flex-1 flex flex-col px-10 pb-24 pt-4 overflow-y-auto no-scrollbar">
          </div>
        )}
        {activeTab === 'me' && renderMeTab()}
      </main>

      <nav className="h-24 px-10 pb-6 flex justify-between items-center shrink-0 z-[80] bg-white border-t border-gray-50/50">
        {[
          { id: 'now', icon: Clock, label: 'NOW' },
          { id: 'myday', icon: CalendarIcon, label: 'DAY' },
          { id: 'me', icon: User, label: 'ME' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex flex-col items-center gap-1.5 w-16 group">
              <div className={`p-3 rounded-3xl transition-all duration-300 ${isActive ? 'bg-zinc-900 text-white shadow-lg' : 'text-gray-300 group-hover:text-gray-400'}`}><tab.icon size={26} strokeWidth={isActive ? 2.5 : 2} /></div>
              <span className={`text-[10px] font-black tracking-tighter transition-colors duration-300 ${isActive ? 'text-zinc-900' : 'text-gray-300'}`}>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Time Picker Modal - Scoped to container */}
      {timePickerMode && (
        <div className="absolute inset-0 z-[200] flex items-end justify-center animate-in slide-in-from-bottom duration-300">
           <div className="absolute inset-0 backdrop-blur-md bg-black/30" onClick={() => setTimePickerMode(null)} />
           <div className="relative w-full rounded-t-[56px] bg-white shadow-[0_-20px_50px_rgba(0,0,0,0.15)] p-10 pb-16 border-t border-gray-100">
              <div className="flex justify-between items-center mb-10">
                 <h4 className="text-2xl font-black text-gray-900 tracking-tight">
                   {timePickerMode === 'startTime' ? '开始时间' : '结束时间'}
                 </h4>
                 <button onClick={() => setTimePickerMode(null)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 hover:bg-gray-100 transition-colors"><X size={20} /></button>
              </div>
              <div className="flex gap-4 mb-14">
                  <WheelPicker label="HOUR" items={hours} selected={tempTime.hour} onSelect={(h) => setTempTime(prev => ({ ...prev, hour: h }))} />
                  <div className="pt-10 flex items-center justify-center text-gray-900 text-3xl font-black opacity-30">:</div>
                  <WheelPicker label="MIN" items={minutes} selected={tempTime.minute} onSelect={(m) => setTempTime(prev => ({ ...prev, minute: m }))} />
              </div>
              <button onClick={confirmTimePicker} className="w-full py-5 rounded-[32px] font-black text-lg bg-zinc-900 text-white shadow-2xl active:scale-95 transition-transform">确认时间</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
