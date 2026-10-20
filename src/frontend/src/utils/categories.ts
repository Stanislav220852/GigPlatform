export interface CategoryMeta {
  id: string;
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  pinColor: string;
  iconName: string;
}

export const CATEGORIES: Record<string, CategoryMeta> = {
  repair: {
    id: 'repair',
    label: 'Ремонт и стройка',
    color: '#2563eb',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700 border-blue-200',
    pinColor: '#2563eb',
    iconName: 'Wrench',
  },
  delivery: {
    id: 'delivery',
    label: 'Доставка и курьеры',
    color: '#d97706',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700 border-amber-200',
    pinColor: '#f59e0b',
    iconName: 'Package',
  },
  cleaning: {
    id: 'cleaning',
    label: 'Уборка и клининг',
    color: '#059669',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700 border-emerald-200',
    pinColor: '#10b981',
    iconName: 'Sparkles',
  },
  moving: {
    id: 'moving',
    label: 'Грузоперевозки',
    color: '#7c3aed',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700 border-purple-200',
    pinColor: '#8b5cf6',
    iconName: 'Truck',
  },
  other: {
    id: 'other',
    label: 'Другое',
    color: '#4b5563',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-700 border-slate-200',
    pinColor: '#64748b',
    iconName: 'Layers',
  },
};

export const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  today: { label: 'Срочно сегодня', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  week: { label: 'На этой неделе', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  flexible: { label: 'По договоренности', color: 'text-slate-600 bg-slate-50 border-slate-200' },
};
