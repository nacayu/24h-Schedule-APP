
import React from 'react';
import { 
  Monitor,
  Tv,
  Bike,
  Utensils,
  Activity,
  Minus
} from 'lucide-react';
import { Category } from './types';

export const CategoryConfig: Record<Category, { icon: React.ReactNode, color: string, lightColor: string, label: string }> = {
  [Category.WORK]: { 
    icon: <Monitor size={20} />, 
    color: 'bg-blue-600', 
    lightColor: 'bg-blue-50 text-blue-500',
    label: '工作记录'
  },
  [Category.LEISURE]: { 
    icon: <Tv size={20} />, 
    color: 'bg-purple-500', 
    lightColor: 'bg-purple-50 text-purple-500',
    label: '娱乐休闲'
  },
  [Category.HEALTH]: { 
    icon: <Bike size={20} />, 
    color: 'bg-orange-500', 
    lightColor: 'bg-orange-50 text-orange-500',
    label: '运动健康'
  },
  [Category.MEALS]: { 
    icon: <Utensils size={20} />, 
    color: 'bg-amber-600', 
    lightColor: 'bg-amber-50 text-amber-600',
    label: '一日三餐'
  },
  [Category.INVESTMENT]: { 
    icon: <Activity size={20} />, 
    color: 'bg-emerald-500', 
    lightColor: 'bg-emerald-50 text-emerald-600',
    label: '消费投资'
  },
  [Category.OTHER]: { 
    icon: <Minus size={20} />, 
    color: 'bg-zinc-500', 
    lightColor: 'bg-zinc-50 text-zinc-500',
    label: '其它'
  },
};
