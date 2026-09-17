'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, List, LayoutGrid, ChevronLeft, ChevronRight, Info, ChevronDown, ChevronUp, CheckCircle2, TrendingDown, TrendingUp, BellRing, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { CalendarGrid } from '@/components/shared/CalendarGrid';
import { CalendarDayDetail } from '@/components/shared/CalendarDayDetail';
import { CalendarLegend } from '@/components/shared/CalendarLegend';
import { CalendarSummaryBar } from '@/components/shared/CalendarSummaryBar';

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

interface CalendarSummary {
  totalDebtAmount: number;
  totalReceivableAmount: number;
  overdueCount: number;
  dueTodayCount: number;
  activeReminderCount: number;
  debtInstallmentCount: number;
  receivableInstallmentCount: number;
}

type ViewMode = 'month' | 'week' | 'list';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const DAYS_FULL_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(val: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(val);
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    debts: true,
    receivables: true,
    reminders: true,
  });
  const [showGuide, setShowGuide] = useState(false);

  // Calculate date range for API call
  const getDateRange = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'week' && selectedDate) {
      const weekDays = getWeekDays(selectedDate);
      return {
        startDate: weekDays[0].toISOString().split('T')[0],
        endDate: weekDays[6].toISOString().split('T')[0],
      };
    }
    
    // For month view, include buffer for prev/next month overflow in grid
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month + 2, 0);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [currentDate, viewMode, selectedDate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      
      const [itemsData, summaryData] = await Promise.all([
        fetchApi<CalendarItem[]>(`/calendar?startDate=${startDate}&endDate=${endDate}`),
        fetchApi<CalendarSummary>(`/calendar/summary?startDate=${startDate}&endDate=${endDate}`),
      ]);
      
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setSummary(summaryData || null);
    } catch (error: any) {
      console.error('Calendar data error:', error);
      toast.error(error.message || 'Takvim verileri yüklenemedi');
      setItems([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (item.type === 'DEBT_INSTALLMENT' && !filters.debts) return false;
      if (item.type === 'RECEIVABLE_INSTALLMENT' && !filters.receivables) return false;
      if (item.type === 'REMINDER' && !filters.reminders) return false;
      return true;
    });
  }, [items, filters]);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of filteredItems) {
      const key = dateKey(new Date(item.date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [filteredItems]);

  // Selected day items
  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    const key = dateKey(selectedDate);
    return itemsByDate.get(key) || [];
  }, [selectedDate, itemsByDate]);

  // Counts for legend
  const filterCounts = useMemo(() => ({
    debts: items.filter(i => i.type === 'DEBT_INSTALLMENT').length,
    receivables: items.filter(i => i.type === 'RECEIVABLE_INSTALLMENT').length,
    reminders: items.filter(i => i.type === 'REMINDER').length,
  }), [items]);

  // Week view data
  const weekDays = useMemo(() => {
    if (!selectedDate) return getWeekDays(new Date());
    return getWeekDays(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };

  // List view: sorted upcoming items
  const listItems = useMemo(() => {
    const now = new Date();
    return filteredItems
      .filter(i => new Date(i.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredItems]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Finansal Takvim</h1>
          <p className="text-text-muted mt-1">
            Taksitli borçlar, alacaklar ve hatırlatmalarınızı takvim üzerinde takip edin.
          </p>
        </div>
        
        {/* View mode toggle */}
        <div className="flex items-center bg-bg-secondary rounded-xl p-1 border border-border">
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'month'
                ? 'bg-bg-card text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Ay
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'week'
                ? 'bg-bg-card text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Hafta
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-bg-card text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <List className="w-4 h-4" />
            Liste
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <CalendarSummaryBar summary={summary} loading={loading} />

      {/* Guide Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Finansal Takvim & Vade Takip Rehberi
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Borç taksitleri, tahsil edilecek alacaklar ve hatırlatmalarınızı gün gün izleyin.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 pt-1"
          >
            {showGuide ? "Rehberi Gizle" : "Nasıl Çalışır?"}
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-emerald-500/20 text-xs text-text-secondary">
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">1. Borç Taksitleri</span>
              Kredi kartı ve kredi taksitlerinizin vadesi geldiğinde takvimde mavi ve turuncu işaretlerle vurgulanır.
            </div>
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">2. Alacak Vadeleri</span>
              Tahsil etmeniz gereken alacak taksitleri yeşil gösterilerek nakit girişini önceden planlamanızı sağlar.
            </div>
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">3. Gecikme Uyarıları</span>
              Günü geçmiş ödenmemiş taksitler kırmızı bildirimle üst bantta öne çıkarılır.
            </div>
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-purple-600 dark:text-purple-400 block mb-1">4. Çoklu Görünüm</span>
              Ay, Hafta ve Liste modları arasında geçiş yaparak ister genel akışı ister günlük detayları görün.
            </div>
          </div>
        )}
      </div>

      {/* Legend / Filters */}
      <CalendarLegend
        filters={filters}
        onFilterChange={setFilters}
        counts={filterCounts}
      />

      {/* Main Content */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
          {/* Calendar Grid */}
          <CalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            items={items}
            onDateChange={handleDateChange}
            onDaySelect={handleDaySelect}
            filters={filters}
          />

          {/* Day Detail Panel */}
          {selectedDate && (
            <div className="hidden xl:block">
              <CalendarDayDetail
                date={selectedDate}
                items={selectedDayItems}
                onClose={() => setSelectedDate(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile Day Detail (below calendar for smaller screens) */}
      {viewMode === 'month' && selectedDate && selectedDayItems.length > 0 && (
        <div className="xl:hidden">
          <CalendarDayDetail
            date={selectedDate}
            items={selectedDayItems}
            onClose={() => setSelectedDate(null)}
          />
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between bg-bg-card border border-border rounded-2xl px-5 py-3">
            <button
              onClick={() => {
                const prev = new Date(weekDays[0]);
                prev.setDate(prev.getDate() - 7);
                setSelectedDate(prev);
                setCurrentDate(new Date(prev.getFullYear(), prev.getMonth(), 1));
              }}
              className="p-2 rounded-xl hover:bg-bg-secondary transition-colors text-text-muted hover:text-text-primary"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-text-primary">
              {weekDays[0].getDate()} {MONTHS_TR[weekDays[0].getMonth()]} – {weekDays[6].getDate()} {MONTHS_TR[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
            </h3>
            <button
              onClick={() => {
                const next = new Date(weekDays[0]);
                next.setDate(next.getDate() + 7);
                setSelectedDate(next);
                setCurrentDate(new Date(next.getFullYear(), next.getMonth(), 1));
              }}
              className="p-2 rounded-xl hover:bg-bg-secondary transition-colors text-text-muted hover:text-text-primary"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map(day => {
              const key = dateKey(day);
              const dayItems = itemsByDate.get(key) || [];
              const isToday = key === dateKey(new Date());
              const isSelected = selectedDate && key === dateKey(selectedDate);

              return (
                <div
                  key={key}
                  className={`
                    bg-bg-card border rounded-2xl overflow-hidden cursor-pointer transition-all
                    ${isToday ? 'border-accent ring-1 ring-accent/20' : 'border-border'}
                    ${isSelected ? 'ring-2 ring-accent/30' : ''}
                    hover:shadow-md
                  `}
                  onClick={() => handleDaySelect(day)}
                >
                  <div className={`px-3 py-2 border-b border-border ${isToday ? 'bg-accent/10' : 'bg-bg-secondary/50'}`}>
                    <p className="text-xs font-medium text-text-muted">{DAYS_FULL_TR[day.getDay()]}</p>
                    <p className={`text-lg font-bold ${isToday ? 'text-accent' : 'text-text-primary'}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="p-2 space-y-1.5 min-h-[60px]">
                    {dayItems.length === 0 && (
                      <p className="text-xs text-text-muted text-center py-2">—</p>
                    )}
                    {dayItems.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium"
                        style={{
                          backgroundColor: item.color + '15',
                          color: item.color,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.title}</span>
                      </div>
                    ))}
                    {dayItems.length > 4 && (
                      <p className="text-[10px] text-text-muted text-center">+{dayItems.length - 4} daha</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day Detail for Week View */}
          {selectedDate && selectedDayItems.length > 0 && (
            <CalendarDayDetail
              date={selectedDate}
              items={selectedDayItems}
              onClose={() => setSelectedDate(null)}
            />
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-lg font-bold text-text-primary">Yaklaşan Ödemeler ve Hatırlatmalar</h3>
            <p className="text-sm text-text-muted mt-0.5">Bugünden itibaren sıralı görünüm</p>
          </div>
          
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-text-muted">Yükleniyor...</div>
            ) : listItems.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-14 h-14 text-text-muted mx-auto mb-3" />
                <h3 className="text-base font-semibold text-text-primary mb-1">Yaklaşan kayıt yok</h3>
                <p className="text-sm text-text-muted">Tüm ödemeler ve hatırlatmalar güncel görünüyor.</p>
              </div>
            ) : (
              listItems.map(item => {
                const itemDate = new Date(item.date);
                const isToday = dateKey(itemDate) === dateKey(new Date());
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-card-hover transition-colors"
                  >
                    {/* Date pill */}
                    <div className={`
                      shrink-0 w-14 text-center py-2 rounded-xl
                      ${isToday ? 'bg-accent/10' : 'bg-bg-secondary'}
                    `}>
                      <p className={`text-lg font-bold ${isToday ? 'text-accent' : 'text-text-primary'}`}>
                        {itemDate.getDate()}
                      </p>
                      <p className="text-[10px] font-medium text-text-muted uppercase">
                        {MONTHS_TR[itemDate.getMonth()].slice(0, 3)}
                      </p>
                    </div>

                    {/* Type indicator */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.color + '20', color: item.color }}
                    >
                      {item.type === 'DEBT_INSTALLMENT' && <span className="text-base">💳</span>}
                      {item.type === 'RECEIVABLE_INSTALLMENT' && <span className="text-base">💰</span>}
                      {item.type === 'REMINDER' && <span className="text-base">🔔</span>}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{item.title}</p>
                      <p className="text-xs text-text-muted truncate">
                        {item.type === 'DEBT_INSTALLMENT' && 'Borç Taksiti'}
                        {item.type === 'RECEIVABLE_INSTALLMENT' && 'Alacak Taksiti'}
                        {item.type === 'REMINDER' && 'Hatırlatma'}
                        {item.description ? ` • ${item.description}` : ''}
                      </p>
                    </div>

                    {/* Amount & Status */}
                    <div className="text-right shrink-0">
                      {item.amount && item.amount > 0 && (
                        <p className="text-sm font-bold" style={{ color: item.color }}>
                          {item.type === 'RECEIVABLE_INSTALLMENT' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                        </p>
                      )}
                      <span
                        className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: item.color + '15',
                          color: item.color,
                        }}
                      >
                        {item.status === 'OVERDUE' && 'Gecikmiş'}
                        {item.status === 'DUE_TODAY' && 'Bugün'}
                        {item.status === 'PLANNED' && 'Planlı'}
                        {item.status === 'ACTIVE' && 'Aktif'}
                        {item.status === 'PAID' && 'Ödendi'}
                        {item.status === 'COLLECTED' && 'Tahsil'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
