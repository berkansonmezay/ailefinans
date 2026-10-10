import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { ReminderActionModal } from '../components/ReminderActionModal';

export const RemindersScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'COMPLETED'>('ALL');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/reminders');
      const dataList = Array.isArray(res) ? res : (res.items || res.data || []);
      setData(dataList);
    } catch (error) {
      console.error('Hatırlatıcılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number, currency: string = 'TRY') => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';
    return `${symbol}${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleComplete = async (item: any) => {
    try {
      setLoading(true);
      await fetchApi(`/reminders/${item.id}/complete`, { method: 'POST' });
      loadData();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Durum güncellenemedi.');
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedReminder(item);
    setModalVisible(true);
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Hatırlatıcıyı Sil',
      `"${item.title}" hatırlatıcısını silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Evet, Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await fetchApi(`/reminders/${item.id}`, { method: 'DELETE' });
              loadData();
            } catch (error) {
              Alert.alert('Hata', 'Silinirken bir hata oluştu');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusInfo = (dueDateStr: string, status: string) => {
    if (status === 'COMPLETED') {
      return { text: 'Tamamlandı', color: '#10b981', bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5', isCompleted: true, isOverdue: false };
    }
    if (status === 'CANCELLED') {
      return { text: 'İptal Edildi', color: '#64748b', bg: isDark ? 'rgba(100, 116, 139, 0.2)' : '#f1f5f9', isCompleted: false, isOverdue: false };
    }

    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} Gün Gecikti`, color: '#ef4444', bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2', isCompleted: false, isOverdue: true };
    }
    if (diffDays === 0) {
      return { text: 'Bugün', color: '#f59e0b', bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb', isCompleted: false, isOverdue: false };
    }
    return { text: `${diffDays} Gün Kaldı`, color: '#3b82f6', bg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff', isCompleted: false, isOverdue: false };
  };

  // KPIs
  const stats = useMemo(() => {
    let active = 0;
    let overdue = 0;
    let completed = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data.forEach(item => {
      if (item.status === 'COMPLETED') {
        completed++;
      } else if (item.status === 'ACTIVE') {
        active++;
        const d = new Date(item.dueDate);
        d.setHours(0, 0, 0, 0);
        if (d < today) {
          overdue++;
        }
      }
    });

    return { active, overdue, completed };
  }, [data]);

  // Filtered data
  const filteredData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data.filter(item => {
      const matchSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const d = new Date(item.dueDate);
      d.setHours(0, 0, 0, 0);
      const isOverdue = item.status === 'ACTIVE' && d < today;

      let matchStatus = true;
      if (statusFilter === 'ACTIVE') matchStatus = item.status === 'ACTIVE';
      else if (statusFilter === 'OVERDUE') matchStatus = isOverdue;
      else if (statusFilter === 'COMPLETED') matchStatus = item.status === 'COMPLETED';

      return matchSearch && matchStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      {/* 3 KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>AKTİF</Text>
          <Text style={[styles.kpiValue, { color: '#3b82f6' }]}>{stats.active}</Text>
          <Text style={styles.kpiSubText}>Bekleyen</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#ef4444', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>GECİKMİŞ</Text>
          <Text style={[styles.kpiValue, { color: '#ef4444' }]}>{stats.overdue}</Text>
          <Text style={styles.kpiSubText}>Vadesi Geçen</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>TAMAMLANAN</Text>
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>{stats.completed}</Text>
          <Text style={styles.kpiSubText}>Bitenler</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Hatırlatıcı veya açıklama ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'ACTIVE', label: 'Aktif' },
            { id: 'OVERDUE', label: 'Gecikmiş' },
            { id: 'COMPLETED', label: 'Tamamlanan' }
          ].map((filter) => (
            <TouchableOpacity 
              key={filter.id}
              style={[styles.filterTab, statusFilter === filter.id && styles.filterTabActive]}
              onPress={() => setStatusFilter(filter.id as any)}
            >
              <Text style={[styles.filterTabText, statusFilter === filter.id && styles.filterTabTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hatırlatıcılar</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => {
            const isExpanded = !!expandedItems[item.id];
            const statusInfo = getStatusInfo(item.dueDate, item.status);
            const isCompleted = item.status === 'COMPLETED';

            return (
              <View style={[styles.card, isCompleted && { opacity: 0.65 }]}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.id)}>
                  <View style={styles.cardHeaderTop}>
                    <TouchableOpacity 
                      style={[styles.checkCircle, isCompleted && styles.checkCircleActive]}
                      onPress={() => handleComplete(item)}
                    >
                      <Ionicons 
                        name={isCompleted ? "checkmark-circle" : "ellipse-outline"} 
                        size={26} 
                        color={isCompleted ? "#10b981" : colors.textMuted} 
                      />
                    </TouchableOpacity>

                    <View style={styles.cardBody}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.cardTitle, isCompleted && styles.completedText]}>
                          {item.title}
                        </Text>
                        {item.isRecurring && (
                          <Ionicons name="repeat" size={16} color="#6366f1" />
                        )}
                      </View>
                      <Text style={styles.cardSubtitle}>
                        {new Date(item.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                    </View>

                    <View style={styles.cardRight}>
                      {item.amount != null && item.amount > 0 && (
                        <Text style={styles.cardAmount}>{formatCurrency(item.amount, item.currency)}</Text>
                      )}
                      <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.badgeText, { color: statusInfo.color }]}>
                          {statusInfo.text}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {item.description ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailDesc}>{item.description}</Text>
                      </View>
                    ) : null}

                    {item.isRecurring && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Tekrarlama:</Text>
                        <Text style={styles.detailValue}>
                          {item.recurrenceRule === 'MONTHLY' ? 'Aylık' : item.recurrenceRule === 'WEEKLY' ? 'Haftalık' : 'Yıllık'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.actionRow}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: isDark ? (isCompleted ? colors.bgSecondary : 'rgba(16, 185, 129, 0.2)') : (isCompleted ? '#f1f5f9' : '#ecfdf5') }]} 
                        onPress={() => handleComplete(item)}
                      >
                        <Ionicons 
                          name={isCompleted ? "arrow-undo" : "checkmark"} 
                          size={16} 
                          color={isCompleted ? colors.textMuted : "#10b981"} 
                        />
                        <Text style={[styles.actionBtnText, { color: isCompleted ? colors.textMuted : "#10b981" }]}>
                          {isCompleted ? 'Geri Al' : 'Tamamla'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' }]} 
                        onPress={() => handleEdit(item)}
                      >
                        <Ionicons name="pencil" size={14} color="#3b82f6" />
                        <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Düzenle</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fff1f2' }]} 
                        onPress={() => handleDelete(item)}
                      >
                        <Ionicons name="trash" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz bir hatırlatıcı bulunmuyor veya arama kriterine uygun sonuç yok.</Text>
          }
        />
      )}

      {modalVisible && (
        <ReminderActionModal 
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={loadData}
          reminder={selectedReminder}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          setSelectedReminder(null);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bgPrimary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.bgCard,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 100 },

  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    padding: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiSubText: {
    fontSize: 11,
    color: colors.textMuted,
  },

  searchContainer: { flexDirection: 'row', marginBottom: 12 },
  searchBox: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.bgCard, 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    height: 46, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, color: colors.textPrimary },

  filterTabs: { flexDirection: 'row', marginBottom: 16 },
  filterTab: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: colors.bgCard, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  filterTabActive: { 
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', 
    borderColor: '#ef4444' 
  },
  filterTabText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  filterTabTextActive: { color: '#ef4444' },

  card: {
    backgroundColor: colors.bgCard,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 14,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    marginRight: 12,
    padding: 2,
  },
  checkCircleActive: {},
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  expandedContent: {
    padding: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: { fontSize: 12, color: colors.textMuted },
  detailValue: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 32, paddingHorizontal: 20 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 99,
  },
});
