import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, Dimensions, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { CryptoActionModal } from '../components/CryptoActionModal';

export const CryptoScreen = ({ navigation }: any) => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<'buy' | 'sell' | 'edit' | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cryptosRes, summaryRes] = await Promise.all([
        fetchApi<any>('/crypto'),
        fetchApi<any>('/crypto/summary').catch(() => null)
      ]);
      const dataList = Array.isArray(cryptosRes) ? cryptosRes : (cryptosRes.items || cryptosRes.data || []);
      setData(dataList);
      if (summaryRes) setSummary(summaryRes);
    } catch (error) {
      console.error('Kripto Varlıklar yüklenirken hata:', error);
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

  const handleAction = (action: 'buy' | 'sell' | 'edit', item?: any) => {
    setSelectedCrypto(item || null);
    setModalAction(action);
    setModalVisible(true);
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Kripto Varlığını Sil',
      `"${item.symbol}" kripto varlığını portföyden silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Evet, Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await fetchApi(`/crypto/${item.symbol}`, { method: 'DELETE' });
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

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const pnl = item.pnlAmount || 0;
      const matchStatus = statusFilter === 'ALL' || 
                          (statusFilter === 'PROFIT' && pnl >= 0) || 
                          (statusFilter === 'LOSS' && pnl < 0);
      
      return matchSearch && matchStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      {summary && (
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>TOPLAM DEĞER</Text>
            <Text style={styles.kpiValue} numberOfLines={1}>{formatCurrency(summary.totalValue)}</Text>
            <Text style={styles.kpiSubText}>{data.length} kripto</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>TOPLAM MALİYET</Text>
            <Text style={styles.kpiValue} numberOfLines={1}>{formatCurrency(summary.totalCost)}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: (summary.totalPnL || 0) >= 0 ? '#10b981' : '#f43f5e', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>KÂR / ZARAR</Text>
            <Text style={styles.kpiValue} numberOfLines={1}>{formatCurrency(summary.totalPnL)}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>GETİRİ</Text>
            <Text style={[styles.kpiValue, { color: (summary.totalPnLPercentage || 0) >= 0 ? '#10b981' : '#f43f5e' }]} numberOfLines={1}>
              %{(summary.totalPnLPercentage || 0).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Kripto ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
      
      <View style={styles.filterTabs}>
        {['ALL', 'PROFIT', 'LOSS'].map((filter) => (
          <TouchableOpacity 
            key={filter}
            style={[styles.filterTab, statusFilter === filter && styles.filterTabActive]}
            onPress={() => setStatusFilter(filter as any)}
          >
            <Text style={[styles.filterTabText, statusFilter === filter && styles.filterTabTextActive]}>
              {filter === 'ALL' ? 'Tümü' : filter === 'PROFIT' ? 'Kârda' : 'Zararda'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kripto Varlıklar</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => item.symbol || item.id || String(index)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => {
            const itemTitle = item.symbol || item.name || 'İsimsiz Kripto';
            const itemSubtitle = item.quantity ? `${item.quantity} Adet` : '0 Adet';
            const itemAmount = item.currentValue || 0;
            const pnl = item.pnlAmount || 0;
            const pnlPct = item.pnlPercentage || 0;
            const isProfit = pnl >= 0;
            const isExpanded = !!expandedItems[item.symbol || item.id];
            
            return (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.symbol || item.id)}>
                  <View style={styles.cardHeaderTop}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.cardIcon}>
                        <Ionicons name="logo-bitcoin" size={24} color="#f97316" />
                      </View>
                      <View style={{ flex: 1, paddingRight: 4 }}>
                        <Text style={styles.cardTitle}>{itemTitle}</Text>
                        <Text style={styles.cardSubtitle}>{itemSubtitle}</Text>
                      </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={styles.cardAmount}>{formatCurrency(itemAmount, item.currency)}</Text>
                      <Text style={[styles.pnlText, { color: isProfit ? '#10b981' : '#f43f5e' }]}>
                        {isProfit ? '+' : ''}{formatCurrency(pnl)} ({pnlPct.toFixed(2)}%)
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Maliyet:</Text>
                      <Text style={styles.detailValue}>{formatCurrency(item.averageCost || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Toplam Yatırım:</Text>
                      <Text style={styles.detailValue}>{formatCurrency(item.totalCost || 0)}</Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ecfdf5' }]} onPress={() => handleAction('buy', item)}>
                        <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Al</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fff1f2' }]} onPress={() => handleAction('sell', item)}>
                        <Text style={[styles.actionBtnText, { color: '#f43f5e' }]}>Sat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]} onPress={() => handleAction('edit', item)}>
                        <Text style={[styles.actionBtnText, { color: '#64748b' }]}>Düzenle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz bir kripto varlık bulunmuyor veya arama kriterine uygun sonuç yok.</Text>
          }
        />
      )}

      {modalVisible && (
        <CryptoActionModal 
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={loadData}
          action={modalAction}
          crypto={selectedCrypto}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => handleAction('buy')}>
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
    marginBottom: 2,
  },
  kpiSubText: {
    fontSize: 11,
    color: '#94a3b8',
  },

  searchContainer: { flexDirection: 'row', marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 15, color: '#0f172a' },

  filterTabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterTabActive: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  filterTabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterTabTextActive: { color: '#10b981' },

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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#64748b' },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  cardAmount: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  pnlText: { fontSize: 13, fontWeight: '600' },
  
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
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 99,
  },
});
