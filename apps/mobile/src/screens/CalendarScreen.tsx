import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, Dimensions, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - 40) / 7;

interface CalendarItem {
  id: string;
  type: 'DEBT_INSTALLMENT' | 'RECEIVABLE_INSTALLMENT' | 'REMINDER';
  title: string;
  description?: string;
  date: string;
  amount?: number;
  currency: string;
  status: string;
  color?: string;
  meta?: Record<string, any>;
}

interface CalendarSummary {
  totalDebtAmount: number;
  totalReceivableAmount: number;
  overdueCount: number;
  dueTodayCount: number;
  activeReminderCount: number;
  debtInstallmentCount?: number;
  receivableInstallmentCount?: number;
}

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const WEEKDAYS_TR = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CalendarScreen = ({ navigation }: any) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    debts: true,
    receivables: true,
    reminders: true,
  });

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Buffer for previous and next month
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month + 2, 0);

      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const [itemsRes, summaryRes] = await Promise.all([
        fetchApi<CalendarItem[]>(`/calendar?startDate=${startDate}&endDate=${endDate}`),
        fetchApi<CalendarSummary>(`/calendar/summary?startDate=${startDate}&endDate=${endDate}`).catch(() => null),
      ]);

      setItems(Array.isArray(itemsRes) ? itemsRes : []);
      if (summaryRes) setSummary(summaryRes);
    } catch (error) {
      console.error('Takvim verisi yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const formatCurrency = (val: number, cur: string = 'TRY') => {
    const symbol = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : '₺';
    return `${symbol}${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (item.type === 'DEBT_INSTALLMENT' && !filters.debts) return false;
      if (item.type === 'RECEIVABLE_INSTALLMENT' && !filters.receivables) return false;
      if (item.type === 'REMINDER' && !filters.reminders) return false;
      return true;
    });
  }, [items, filters]);

  // Group by date key
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    filteredItems.forEach(item => {
      const key = formatDateKey(new Date(item.date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [filteredItems]);

  // Items for selected day
  const selectedDayItems = useMemo(() => {
    const key = formatDateKey(selectedDate);
    return itemsByDate.get(key) || [];
  }, [itemsByDate, selectedDate]);

  // Calendar Grid Cells calculation
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; dateKey: string }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, totalDaysInPrevMonth - i);
      cells.push({ date: d, isCurrentMonth: false, dateKey: formatDateKey(d) });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ date: d, isCurrentMonth: true, dateKey: formatDateKey(d) });
    }

    // Next month padding to fill complete weeks (multiples of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({ date: d, isCurrentMonth: false, dateKey: formatDateKey(d) });
    }

    return cells;
  }, [currentDate]);

  // Filter counts for badges
  const filterCounts = useMemo(() => ({
    debts: items.filter(i => i.type === 'DEBT_INSTALLMENT').length,
    receivables: items.filter(i => i.type === 'RECEIVABLE_INSTALLMENT').length,
    reminders: items.filter(i => i.type === 'REMINDER').length,
  }), [items]);

  // Selected day financial summary (total debt and receivable on selected date)
  const selectedDaySummary = useMemo(() => {
    let debt = 0;
    let recv = 0;
    selectedDayItems.forEach(i => {
      if (i.type === 'DEBT_INSTALLMENT' && i.status !== 'PAID') {
        debt += (i.amount || 0);
      } else if (i.type === 'RECEIVABLE_INSTALLMENT' && i.status !== 'COLLECTED') {
        recv += (i.amount || 0);
      }
    });
    return { debt, recv };
  }, [selectedDayItems]);

  const getItemTypeConfig = (type: string) => {
    if (type === 'DEBT_INSTALLMENT') {
      return { label: 'Borç Taksiti', color: '#ef4444', bg: '#fef2f2', icon: 'trending-down' };
    }
    if (type === 'RECEIVABLE_INSTALLMENT') {
      return { label: 'Alacak Taksiti', color: '#10b981', bg: '#ecfdf5', icon: 'trending-up' };
    }
    return { label: 'Hatırlatıcı', color: '#8b5cf6', bg: '#f3e8ff', icon: 'notifications' };
  };

  const getStatusBadgeConfig = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return { label: 'Gecikmiş', color: '#f43f5e', bg: '#fee2e2', icon: 'alert-circle' };
      case 'DUE_TODAY':
        return { label: 'Bugün Vadeli', color: '#f59e0b', bg: '#fef3c7', icon: 'time' };
      case 'PAID':
        return { label: 'Ödendi', color: '#10b981', bg: '#dcfce7', icon: 'checkmark-circle' };
      case 'COLLECTED':
        return { label: 'Tahsil Edildi', color: '#10b981', bg: '#dcfce7', icon: 'checkmark-circle' };
      case 'PLANNED':
        return { label: 'Planlı', color: '#3b82f6', bg: '#eff6ff', icon: 'calendar-outline' };
      case 'ACTIVE':
        return { label: 'Aktif', color: '#8b5cf6', bg: '#f3e8ff', icon: 'notifications-outline' };
      default:
        return null;
    }
  };

  const todayKey = formatDateKey(new Date());
  const selectedKey = formatDateKey(selectedDate);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* 4'lü Summary KPI Grid */}
      <View style={styles.kpiGrid}>
        {/* 1. Borç Taksitleri */}
        <View style={[styles.kpiBox, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel}>BORÇ TAKSİTLERİ</Text>
            <Ionicons name="trending-down" size={14} color="#3b82f6" />
          </View>
          <Text style={[styles.kpiValue, { color: '#3b82f6' }]} numberOfLines={1}>
            {formatCurrency(summary?.totalDebtAmount || 0)}
          </Text>
          <Text style={styles.kpiSubText}>
            {summary?.debtInstallmentCount != null ? `${summary.debtInstallmentCount} taksit planlandı` : 'Bu ayki ödemeler'}
          </Text>
        </View>

        {/* 2. Beklenen Alacak */}
        <View style={[styles.kpiBox, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel}>BEKLENEN ALACAK</Text>
            <Ionicons name="trending-up" size={14} color="#10b981" />
          </View>
          <Text style={[styles.kpiValue, { color: '#10b981' }]} numberOfLines={1}>
            {formatCurrency(summary?.totalReceivableAmount || 0)}
          </Text>
          <Text style={styles.kpiSubText}>
            {summary?.receivableInstallmentCount != null ? `${summary.receivableInstallmentCount} alacak taksiti` : 'Tahsil edilecek'}
          </Text>
        </View>

        {/* 3. Vadesi Geçmiş / Bugün */}
        <View style={[styles.kpiBox, { borderLeftColor: '#f43f5e', borderLeftWidth: 4 }]}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel}>GECİKMİŞ / BUGÜN</Text>
            <Ionicons name="alert-circle" size={14} color="#f43f5e" />
          </View>
          <Text style={[styles.kpiValue, { color: '#f43f5e' }]} numberOfLines={1}>
            {summary?.overdueCount || 0} <Text style={{ fontSize: 11, fontWeight: 'normal', color: '#64748b' }}>kalem</Text>
          </Text>
          <Text style={styles.kpiSubText}>
            {(summary?.dueTodayCount || 0) > 0 ? `+ ${summary?.dueTodayCount} bugün vadeli` : 'Kritik gecikme yok'}
          </Text>
        </View>

        {/* 4. Aktif Hatırlatmalar */}
        <View style={[styles.kpiBox, { borderLeftColor: '#8b5cf6', borderLeftWidth: 4 }]}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel}>HATIRLATMALAR</Text>
            <Ionicons name="notifications" size={14} color="#8b5cf6" />
          </View>
          <Text style={[styles.kpiValue, { color: '#8b5cf6' }]} numberOfLines={1}>
            {summary?.activeReminderCount || 0} <Text style={{ fontSize: 11, fontWeight: 'normal', color: '#64748b' }}>adet</Text>
          </Text>
          <Text style={styles.kpiSubText}>Zamanlanmış bildirim</Text>
        </View>
      </View>

      {/* Month Navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={20} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.monthTitleWrapper}>
          <Text style={styles.monthTitleText}>
            {MONTHS_TR[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity style={styles.todayBadge} onPress={jumpToToday}>
            <Text style={styles.todayBadgeText}>Bugün</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Filter Toggle Pills */}
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterChip, filters.debts && { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
          onPress={() => setFilters(f => ({ ...f, debts: !f.debts }))}
        >
          <View style={[styles.chipDot, { backgroundColor: '#ef4444' }]} />
          <Text style={[styles.chipText, filters.debts && { color: '#ef4444', fontWeight: '700' }]}>Borçlar</Text>
          {filterCounts.debts > 0 && (
            <View style={[styles.chipBadge, { backgroundColor: filters.debts ? '#ef4444' : '#94a3b8' }]}>
              <Text style={styles.chipBadgeText}>{filterCounts.debts}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterChip, filters.receivables && { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}
          onPress={() => setFilters(f => ({ ...f, receivables: !f.receivables }))}
        >
          <View style={[styles.chipDot, { backgroundColor: '#10b981' }]} />
          <Text style={[styles.chipText, filters.receivables && { color: '#10b981', fontWeight: '700' }]}>Alacaklar</Text>
          {filterCounts.receivables > 0 && (
            <View style={[styles.chipBadge, { backgroundColor: filters.receivables ? '#10b981' : '#94a3b8' }]}>
              <Text style={styles.chipBadgeText}>{filterCounts.receivables}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterChip, filters.reminders && { backgroundColor: '#f3e8ff', borderColor: '#d8b4fe' }]}
          onPress={() => setFilters(f => ({ ...f, reminders: !f.reminders }))}
        >
          <View style={[styles.chipDot, { backgroundColor: '#8b5cf6' }]} />
          <Text style={[styles.chipText, filters.reminders && { color: '#8b5cf6', fontWeight: '700' }]}>Hatırlatıcı</Text>
          {filterCounts.reminders > 0 && (
            <View style={[styles.chipBadge, { backgroundColor: filters.reminders ? '#8b5cf6' : '#94a3b8' }]}>
              <Text style={styles.chipBadgeText}>{filterCounts.reminders}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {viewMode === 'calendar' ? (
        <View style={styles.calendarCard}>
          {/* Weekday Headers */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS_TR.map((d, i) => (
              <View key={i} style={styles.weekdayCell}>
                <Text style={[styles.weekdayText, (i === 5 || i === 6) && styles.weekendText]}>
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarCells.map((cell, idx) => {
              const isSelected = cell.dateKey === selectedKey;
              const isToday = cell.dateKey === todayKey;
              const dayItems = itemsByDate.get(cell.dateKey) || [];

              const hasDebt = dayItems.some(item => item.type === 'DEBT_INSTALLMENT');
              const hasReceivable = dayItems.some(item => item.type === 'RECEIVABLE_INSTALLMENT');
              const hasReminder = dayItems.some(item => item.type === 'REMINDER');

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDate(cell.date)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayNumber,
                    !cell.isCurrentMonth && styles.dayNumberDimmed,
                    isSelected && styles.dayNumberSelected,
                    isToday && !isSelected && styles.dayNumberToday,
                  ]}>
                    {cell.date.getDate()}
                  </Text>

                  <View style={styles.dotsContainer}>
                    {hasDebt && <View style={[styles.cellDot, { backgroundColor: '#ef4444' }]} />}
                    {hasReceivable && <View style={[styles.cellDot, { backgroundColor: '#10b981' }]} />}
                    {hasReminder && <View style={[styles.cellDot, { backgroundColor: '#8b5cf6' }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Selected Day Header & Summary */}
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="calendar-outline" size={18} color="#0f172a" />
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {viewMode === 'calendar' 
                ? `${selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' })} Olayları`
                : 'Tüm Takvim Olayları'}
            </Text>
          </View>
          {viewMode === 'calendar' && (selectedDaySummary.debt > 0 || selectedDaySummary.recv > 0) && (
            <View style={styles.dailySummaryRow}>
              {selectedDaySummary.debt > 0 && (
                <View style={styles.dailySummaryItem}>
                  <View style={[styles.miniDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.dailySummaryText}>
                    Borç: <Text style={{ color: '#ef4444', fontWeight: '700' }}>{formatCurrency(selectedDaySummary.debt)}</Text>
                  </Text>
                </View>
              )}
              {selectedDaySummary.recv > 0 && (
                <View style={styles.dailySummaryItem}>
                  <View style={[styles.miniDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.dailySummaryText}>
                    Alacak: <Text style={{ color: '#10b981', fontWeight: '700' }}>{formatCurrency(selectedDaySummary.recv)}</Text>
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <Text style={styles.sectionBadge}>
          {viewMode === 'calendar' ? selectedDayItems.length : filteredItems.length} Kayıt
        </Text>
      </View>
    </View>
  );

  const displayList = viewMode === 'calendar' ? selectedDayItems : filteredItems;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Takvim & Ödemeler</Text>
        <TouchableOpacity 
          style={styles.headerViewToggleBtn}
          onPress={() => setViewMode(v => v === 'calendar' ? 'list' : 'calendar')}
          activeOpacity={0.7}
        >
          <Ionicons name={viewMode === 'calendar' ? "list" : "calendar"} size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => {
            const config = getItemTypeConfig(item.type);
            const statusBadge = getStatusBadgeConfig(item.status);

            return (
              <View style={styles.eventCard}>
                <View style={[styles.eventIcon, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon as any} size={22} color={config.color} />
                </View>

                <View style={styles.eventBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                    {item.amount != null && item.amount > 0 && (
                      <Text style={[styles.eventAmount, { color: config.color }]}>
                        {formatCurrency(item.amount, item.currency)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.eventMetaRow}>
                    <Text style={styles.eventSubtitle}>
                      {new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • {config.label}
                    </Text>
                    {statusBadge && (
                      <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                        <Ionicons name={statusBadge.icon as any} size={11} color={statusBadge.color} style={{ marginRight: 3 }} />
                        <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                          {statusBadge.label}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-clear-outline" size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>Bu tarihe ait finansal bir olay veya hatırlatıcı bulunmuyor.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 60 },

  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  kpiBox: {
    width: (width - 40) / 2,
    backgroundColor: '#fff',
    padding: 11,
    borderRadius: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiSubText: {
    fontSize: 10,
    color: '#94a3b8',
  },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  todayBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 5,
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  headerViewToggleBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  weekdayCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  weekendText: {
    color: '#f43f5e',
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_SIZE,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#0f172a',
  },
  dayCellToday: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  dayNumberDimmed: {
    color: '#cbd5e1',
  },
  dayNumberSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dayNumberToday: {
    color: '#2563eb',
    fontWeight: '800',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  cellDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  dailySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  dailySummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dailySummaryText: {
    fontSize: 11,
    color: '#64748b',
  },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventBody: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  eventSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  eventAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
  },
});
