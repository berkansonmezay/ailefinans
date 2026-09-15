'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarItem {
  id: string;
  type: 'DEBT_INSTALLMENT' | 'RECEIVABLE_INSTALLMENT' | 'REMINDER';
  title: string;
  description?: string;
  date: string;
  amount?: number;
  currency: string;
  status: string;
  color: string;
  meta: Record<string, any>;
}

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | null;
  items: CalendarItem[];
  onDateChange: (date: Date) => void;
  onDaySelect: (date: Date) => void;
  filters: {
    debts: boolean;
    receivables: boolean;
    reminders: boolean;
  };
}

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Monday-based week (0=Mon, 6=Sun)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  
  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  
  // Previous month fill
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }
  
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  
  // Next month fill
  const remaining = 42 - days.length; // 6 rows * 7 cols
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }
  
  return days;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarGrid({
  currentDate,
  selectedDate,
  items,
  onDateChange,
  onDaySelect,
  filters,
}: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const grid = getMonthGrid(year, month);
  const today = new Date();
  const todayKey = dateKey(today);

  // Filter items by type
  const filteredItems = items.filter(item => {
    if (item.type === 'DEBT_INSTALLMENT' && !filters.debts) return false;
    if (item.type === 'RECEIVABLE_INSTALLMENT' && !filters.receivables) return false;
    if (item.type === 'REMINDER' && !filters.reminders) return false;
    return true;
  });

  // Group items by date key
  const itemsByDate = new Map<string, CalendarItem[]>();
  for (const item of filteredItems) {
    const key = dateKey(new Date(item.date));
    if (!itemsByDate.has(key)) itemsByDate.set(key, []);
    itemsByDate.get(key)!.push(item);
  }

  const goToPrevMonth = () => onDateChange(new Date(year, month - 1, 1));
  const goToNextMonth = () => onDateChange(new Date(year, month + 1, 1));
  const goToToday = () => {
    onDateChange(new Date(today.getFullYear(), today.getMonth(), 1));
    onDaySelect(today);
  };

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-xl hover:bg-bg-secondary transition-colors text-text-muted hover:text-text-primary"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-text-primary min-w-[180px] text-center">
            {MONTHS_TR[month]} {year}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-xl hover:bg-bg-secondary transition-colors text-text-muted hover:text-text-primary"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-light rounded-lg transition-colors"
        >
          Bugün
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_TR.map(day => (
          <div
            key={day}
            className="py-2.5 text-center text-xs font-semibold text-text-muted uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid cells */}
      <div className="grid grid-cols-7">
        {grid.map((cell, idx) => {
          const key = dateKey(cell.date);
          const isToday = key === todayKey;
          const isSelected = selectedDate && key === dateKey(selectedDate);
          const dayItems = itemsByDate.get(key) || [];
          const hasItems = dayItems.length > 0;

          // Group dots by type for a cleaner display
          const debtDots = dayItems.filter(i => i.type === 'DEBT_INSTALLMENT');
          const recvDots = dayItems.filter(i => i.type === 'RECEIVABLE_INSTALLMENT');
          const remDots = dayItems.filter(i => i.type === 'REMINDER');

          // Check for critical status
          const hasOverdue = dayItems.some(i => i.status === 'OVERDUE');
          const hasDueToday = dayItems.some(i => i.status === 'DUE_TODAY');

          return (
            <button
              key={idx}
              onClick={() => onDaySelect(cell.date)}
              className={`
                relative min-h-[85px] p-1.5 border-r border-b border-border text-left 
                transition-all duration-150 group
                ${!cell.isCurrentMonth ? 'opacity-30' : ''}
                ${isSelected ? 'bg-accent/10 ring-1 ring-inset ring-accent/30' : 'hover:bg-bg-card-hover'}
                ${isToday ? 'bg-accent/5' : ''}
                ${idx % 7 === 6 ? 'border-r-0' : ''}
              `}
            >
              {/* Day number */}
              <span
                className={`
                  inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full
                  ${isToday ? 'bg-accent text-white font-bold' : ''}
                  ${isSelected && !isToday ? 'bg-accent/20 text-accent font-bold' : ''}
                  ${!isToday && !isSelected ? 'text-text-primary' : ''}
                `}
              >
                {cell.date.getDate()}
              </span>

              {/* Event dots */}
              {hasItems && (
                <div className="mt-0.5 space-y-0.5">
                  {/* Show compact dots on small screens, mini labels on larger */}
                  <div className="flex flex-wrap gap-1">
                    {debtDots.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {debtDots.slice(0, 3).map((item, i) => (
                          <span
                            key={i}
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                            title={item.title}
                          />
                        ))}
                        {debtDots.length > 3 && (
                          <span className="text-[9px] text-text-muted font-medium">+{debtDots.length - 3}</span>
                        )}
                      </div>
                    )}
                    {recvDots.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {recvDots.slice(0, 3).map((item, i) => (
                          <span
                            key={i}
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                            title={item.title}
                          />
                        ))}
                        {recvDots.length > 3 && (
                          <span className="text-[9px] text-text-muted font-medium">+{recvDots.length - 3}</span>
                        )}
                      </div>
                    )}
                    {remDots.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {remDots.slice(0, 2).map((item, i) => (
                          <span
                            key={i}
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                            title={item.title}
                          />
                        ))}
                        {remDots.length > 2 && (
                          <span className="text-[9px] text-text-muted font-medium">+{remDots.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mini label for the first item (desktop) */}
                  {dayItems.length > 0 && (
                    <div className="hidden lg:block">
                      <span
                        className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate max-w-full leading-tight"
                        style={{
                          backgroundColor: dayItems[0].color + '20',
                          color: dayItems[0].color,
                        }}
                      >
                        {dayItems[0].title.length > 16 ? dayItems[0].title.slice(0, 16) + '…' : dayItems[0].title}
                      </span>
                      {dayItems.length > 1 && (
                        <span className="text-[9px] text-text-muted ml-0.5">
                          +{dayItems.length - 1}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Overdue/DueToday indicator */}
              {(hasOverdue || hasDueToday) && (
                <div
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    hasOverdue ? 'bg-danger animate-pulse' : 'bg-warning'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
