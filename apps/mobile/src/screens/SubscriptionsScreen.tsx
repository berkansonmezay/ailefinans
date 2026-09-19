import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { SubscriptionActionModal } from '../components/SubscriptionActionModal';

export const SubscriptionsScreen = ({ navigation }: any) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/subscriptions');
      const dataList = Array.isArray(res) ? res : (res.items || res.data || []);
      setData(dataList);
    } catch (error) {
      console.error('Abonelikler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number, currency: string = 'TRY') => {
    return `₺${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEdit = (item: any) => {
    setSelectedSubscription(item);
    setModalVisible(true);
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Aboneliği Sil',
      `"${item.name}" aboneliğini tamamen silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Evet, Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await fetchApi(`/subscriptions/${item.id}`, { method: 'DELETE' });
              loadData();
            } catch (error) {
              alert('Silinirken bir hata oluştu');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // KPIs
  const activeSubs = data.filter(s => s.status === 'ACTIVE');
  const inactiveSubs = data.filter(s => s.status !== 'ACTIVE');

  const monthlyTotal = useMemo(() => {
    return activeSubs.reduce((acc, sub) => {
      let monthly = Number(sub.amount) || 0;
      if (sub.frequency === 'YEARLY') monthly = monthly / 12;
      if (sub.frequency === 'WEEKLY') monthly = monthly * 4.33;
      return acc + monthly;
    }, 0);
  }, [activeSubs]);

  const yearlyProjection = monthlyTotal * 12;

  // Upcoming in 7 days
  const upcomingThisWeek = useMemo(() => {
    return activeSubs.filter(s => {
      if (!s.nextPaymentDate) return false;
      const paymentDate = new Date(s.nextPaymentDate).getTime();
      const now = new Date().getTime();
      const diffDays = Math.ceil((paymentDate - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
  }, [activeSubs]);

  const filteredData = useMemo(() => {
    return data.filter(sub => {
      const matchSearch = sub.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const isActive = sub.status === 'ACTIVE';
      const matchStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'ACTIVE' ? isActive : !isActive;
      
      return matchSearch && matchStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const getDaysLeft = (dateString: string) => {
    if (!dateString) return { text: 'Belirsiz', color: '#94a3b8', bg: '#f1f5f9' };
    const paymentDate = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((paymentDate - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Gecikti', color: '#f43f5e', bg: '#fff1f2' };
    if (diffDays === 0) return { text: 'Bugün', color: '#f59e0b', bg: '#fffbeb' };
    if (diffDays <= 7) return { text: `${diffDays} gün kaldı`, color: '#f59e0b', bg: '#fffbeb' };
    return { text: `${diffDays} gün kaldı`, color: '#10b981', bg: '#ecfdf5' };
  };

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>AYLIK TOPLAM GİDER</Text>
          <Text style={styles.kpiValue} numberOfLines={1}>{formatCurrency(monthlyTotal)}</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>YILLIK PROJEKSİYON</Text>
          <Text style={styles.kpiValue} numberOfLines={1}>{formatCurrency(yearlyProjection)}</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4, width: '100%' }]}>
          <Text style={styles.kpiLabel}>AKTİF HİZMETLER</Text>
          <Text style={styles.kpiValue} numberOfLines={1}>{activeSubs.length} Abonelik</Text>
        </View>
      </View>

      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: upcomingThisWeek.length > 0 ? '#fffbeb' : '#ecfdf5', borderColor: upcomingThisWeek.length > 0 ? '#fde68a' : '#a7f3d0' }]}>
        <View style={styles.bannerIcon}>
          <Ionicons name={upcomingThisWeek.length > 0 ? "time" : "checkmark-circle"} size={24} color={upcomingThisWeek.length > 0 ? "#f59e0b" : "#10b981"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: upcomingThisWeek.length > 0 ? "#d97706" : "#059669" }]}>
            {upcomingThisWeek.length > 0 ? 'Yaklaşan Ödemeler Var' : 'Abonelik Durumu Düzenli'}
          </Text>
          <Text style={styles.bannerText}>
            {upcomingThisWeek.length > 0 
              ? `Önümüzdeki 7 gün içinde yenilenecek ${upcomingThisWeek.length} aboneliğiniz var.` 
              : `Şu anda acil bir yenilemeniz bulunmuyor. Toplam ${activeSubs.length} aktif abonelik.`}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Abonelik adı ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
      
      <View style={styles.filterTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'ACTIVE', label: 'Aktif Olanlar' },
            { id: 'INACTIVE', label: 'Durdurulanlar' }
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
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonelikler</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => {
            const isExpanded = !!expandedItems[item.id];
            const daysInfo = getDaysLeft(item.nextPaymentDate);
            const isInactive = item.status !== 'ACTIVE';
            
            return (
              <View style={[styles.card, isInactive && { opacity: 0.6 }]}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.id)}>
                  <View style={styles.cardHeaderTop}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.cardIcon}>
                        <Text style={styles.cardIconText}>{item.name ? item.name.substring(0, 2).toUpperCase() : 'AB'}</Text>
                      </View>
                      <View style={{ flex: 1, paddingRight: 4 }}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardSubtitle}>
                          {item.frequency === 'MONTHLY' ? 'Aylık Plan' : item.frequency === 'YEARLY' ? 'Yıllık Plan' : 'Haftalık Plan'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
                      {!isInactive && (
                        <View style={[styles.badge, { backgroundColor: daysInfo.bg }]}>
                          <Text style={[styles.badgeText, { color: daysInfo.color }]}>{daysInfo.text}</Text>
                        </View>
                      )}
                      {isInactive && (
                        <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
                          <Text style={[styles.badgeText, { color: '#64748b' }]}>Durduruldu</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Sonraki Ödeme:</Text>
                      <Text style={styles.detailValue}>
                        {item.nextPaymentDate ? item.nextPaymentDate.split('T')[0] : 'Belirsiz'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Hatırlatıcı:</Text>
                      <Text style={styles.detailValue}>
                        {item.reminderEnabled ? `${item.remindBeforeDays || 3} gün önce` : 'Kapalı'}
                      </Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#eff6ff' }]} onPress={() => handleEdit(item)}>
                        <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Düzenle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fff1f2' }]} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash" size={16} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz bir abonelik bulunmuyor veya arama kriterine uygun sonuç yok.</Text>
          }
        />
      )}

      {modalVisible && (
        <SubscriptionActionModal 
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={loadData}
          subscription={selectedSubscription}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          setSelectedSubscription(null);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
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
  listContent: { paddingBottom: 100 },
  
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a'
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 12,
    color: '#475569',
  },

  searchContainer: { flexDirection: 'row', marginBottom: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 15, color: '#0f172a' },

  filterTabs: { flexDirection: 'row', marginBottom: 16 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterTabActive: { backgroundColor: '#f3e8ff', borderColor: '#d8b4fe' },
  filterTabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterTabTextActive: { color: '#8b5cf6' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: { 
    marginRight: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9d5ff'
  },
  cardIconText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8b5cf6',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#64748b' },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  cardAmount: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: { fontSize: 13, color: '#64748b' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 32, paddingHorizontal: 20 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 99,
  },
});
