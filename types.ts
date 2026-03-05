
export enum Category {
  WORK = '工作记录',
  LEISURE = '娱乐休闲',
  HEALTH = '运动健康',
  MEALS = '一日三餐',
  INVESTMENT = '消费投资',
  OTHER = '其它'
}

export interface Task {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  content: string; // Title
  description?: string; // Detailed process
  category: Category;
  feeling?: string; // Reflective thought/feeling
  timestamp: number;
  isRoutine?: boolean; // 是否为每日固定日程
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string; // 支持情绪罗盘的多种状态
}

export interface DateOption {
  day: number;
  label: string;
  fullDate: string;
}
