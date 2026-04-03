import React from 'react';
import { Award, ShieldCheck, Star, Trophy, Crown } from 'lucide-react';
import { Badge as BadgeType } from '../types';

interface BadgeProps {
  badge: BadgeType;
  earned?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({ badge, earned = false, size = 'md' }) => {
  const icons = {
    'Champion': ShieldCheck,
    'Star': Star,
    'Master': Trophy,
    'Legendary': Crown,
    'Topper': Award,
  };

  const Icon = icons[badge.name as keyof typeof icons] || Award;

  const colors = {
    'Silver': earned ? 'bg-stone-100 text-stone-600 border-stone-200' : 'bg-stone-50 text-stone-300 border-stone-100',
    'Gold': earned ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-amber-50 text-amber-300 border-amber-100',
    'Emerald': earned ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-emerald-50 text-emerald-300 border-emerald-100',
    'Diamond': earned ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-blue-50 text-blue-300 border-blue-100',
    'Platinum': earned ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-purple-50 text-purple-300 border-purple-100',
  };

  const sizes = {
    sm: 'p-2 gap-1 text-[10px]',
    md: 'p-4 gap-2 text-xs',
    lg: 'p-6 gap-3 text-sm',
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 32,
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-500 ${colors[badge.club as keyof typeof colors]} ${sizes[size]} ${earned ? 'shadow-lg scale-105' : 'grayscale opacity-50'}`}
      title={badge.description}
    >
      <div className={`rounded-xl p-2 ${earned ? 'bg-white/50 shadow-inner' : 'bg-stone-100/50'}`}>
        <Icon size={iconSizes[size]} className={earned ? 'animate-pulse' : ''} />
      </div>
      <div className="text-center">
        <p className="font-black uppercase tracking-widest leading-none">{badge.name}</p>
        <p className="text-[8px] font-bold opacity-70 mt-1 uppercase tracking-tighter">{badge.club} Club</p>
      </div>
    </div>
  );
}
