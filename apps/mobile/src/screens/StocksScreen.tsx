import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Dimensions, ScrollView, Alert, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { StockActionModal } from '../components/StockActionModal';

const { width } = Dimensions.get('window');

export const StocksScreen = ({ navigation }: any) => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<'buy' | 'sell' | 'edit' | null>(null);
  const [selectedStock, setSelectedStock] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resStocks, resSummary] = await Promise.all([
        fetchApi<any>('/stocks'),
        fetchApi<any>('/stocks/summary')
      ]);
      const dataList = Array.isArray(resStocks) ? resStocks : (resStocks.items || resStocks.data || []);
      setData(dataList);
      setSummary(resSummary);
    } catch (error) {
      console.error('Borsa & Hisse yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = (symbol: string) => {
    Alert.alert(
      'Hisse Sil',
      `${symbol} hissesini portföyden silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              const cleanSymbol = symbol.replace('.IS', '');
              await fetchApi(`/stocks/${cleanSymbol}`, { method: 'DELETE' });
              loadData();
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Silme işlemi başarısız.');
            }
          }
        }
      ]
    );
  };

  const openModal = (action: 'buy' | 'sell' | 'edit', stock?: any) => {
    setModalAction(action);
    setSelectedStock(stock || null);
    setModalVisible(true);
  };

  const filteredData = useMemo(() => {
    return data.filter(stock => {
      const matchesSearch = 
        (stock.symbol && stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (stock.name && stock.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const isProfit = (stock.pnlAmount || 0) >= 0;
      const matchesStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'PROFIT' ? isProfit :
        !isProfit;

      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const isOverallPositive = (summary?.totalPnL || 0) >= 0;

  const formatCurrency = (val: number, currency: string = 'TRY') => {
    return `₺${Number(val || 0).toLocaleString('tr-TR')}`;
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>PORTFÖY DEĞERİ</Text>
            <Text style={styles.kpiValue}>{formatCurrency(summary?.totalValue || 0)}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#6366f1', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>TOPLAM MALİYET</Text>
            <Text style={styles.kpiValue}>{formatCurrency(summary?.totalCost || 0)}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: isOverallPositive ? '#10b981' : '#f43f5e', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>KÂR / ZARAR</Text>
            <Text style={[styles.kpiValue, { color: isOverallPositive ? '#10b981' : '#f43f5e' }]}>
              {formatCurrency(summary?.totalPnL || 0)}
            </Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: isOverallPositive ? '#10b981' : '#f43f5e', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>GETİRİ ORANI</Text>
            <Text style={[styles.kpiValue, { color: isOverallPositive ? '#10b981' : '#f43f5e' }]}>
              %{summary?.totalPnLPercentage?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>

        {/* Status Banner */}
        <View style={[styles.banner, isOverallPositive ? styles.bannerSuccess : styles.bannerError]}>
          <View style={styles.bannerIcon}>
            <Ionicons name={isOverallPositive ? "sparkles" : "alert-circle"} size={20} color={isOverallPositive ? '#10b981' : '#f43f5e'} />
          </View>
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: isOverallPositive ? '#10b981' : '#f43f5e' }]}>
              {isOverallPositive ? 'Hisse Portföyü Kârda' : 'Hisse Portföyü Zararda'}
            </Text>
            <Text style={styles.bannerText}>
              {isOverallPositive 
                ? `Portföyünüz toplamda %${summary?.totalPnLPercentage?.toFixed(2) || '0'} kâr durumundadır.`
                : `Portföyünüz maliyetinin altında (%${Math.abs(summary?.totalPnLPercentage || 0).toFixed(2)} zarar).`}
            </Text>
          </View>
        </View>

        {/* Search & Filters */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Hisse ara (örn. THYAO)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={styles.filterButtons}>
            <TouchableOpacity 
              style={[styles.filterBtn, statusFilter === 'ALL' && styles.filterBtnActive]}
              onPress={() => setStatusFilter('ALL')}
            >
              <Text style={[styles.filterBtnText, statusFilter === 'ALL' && styles.filterBtnTextActive]}>Tümü</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterBtn, statusFilter === 'PROFIT' && styles.filterBtnActive]}
              onPress={() => setStatusFilter('PROFIT')}
            >
              <Text style={[styles.filterBtnText, statusFilter === 'PROFIT' && styles.filterBtnTextActive]}>Kârda</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterBtn, statusFilter === 'LOSS' && styles.filterBtnActive]}
              onPress={() => setStatusFilter('LOSS')}
            >
              <Text style={[styles.filterBtnText, statusFilter === 'LOSS' && styles.filterBtnTextActive]}>Zararda</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.newBuyBtn} onPress={() => openModal('buy')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newBuyBtnText}>Yeni Hisse Al</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hisselerim</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !data.length ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => {
            const itemTitle = item.symbol || item.name || 'İsimsiz Hisse';
            const itemQuantity = item.quantity || 0;
            const itemAmount = item.currentValue || 0;
            const itemPnL = item.pnlAmount || 0;
            const itemPnLPercentage = item.pnlPercentage || 0;
            const isProfit = itemPnL >= 0;
            const profitColor = isProfit ? '#10b981' : '#f43f5e';
            
            return (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleSection}>
                    <View style={styles.cardIcon}>
                      <Ionicons name="trending-up" size={24} color="#f59e0b" />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>{itemTitle}</Text>
                      <Text style={styles.cardSubtitle}>{itemQuantity} Adet</Text>
                    </View>
                  </View>
                  <View style={styles.cardValueSection}>
                    <Text style={styles.cardAmount}>{formatCurrency(itemAmount)}</Text>
                    <View style={styles.pnlRow}>
                      <Ionicons name={isProfit ? "caret-up" : "caret-down"} size={12} color={profitColor} />
                      <Text style={[styles.pnlText, { color: profitColor }]}>
                        {formatCurrency(Math.abs(itemPnL))} (%{Math.abs(itemPnLPercentage).toFixed(2)})
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions Row */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openModal('buy', item)}>
                    <Ionicons name="add-circle-outline" size={18} color="#3b82f6" />
                    <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Al</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openModal('sell', item)}>
                    <Ionicons name="remove-circle-outline" size={18} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Sat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openModal('edit', item)}>
                    <Ionicons name="create-outline" size={18} color="#6366f1" />
                    <Text style={[styles.actionBtnText, { color: '#6366f1' }]}>Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.symbol)}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz hisse senedi bulunmuyor.</Text>
          }
        />
      )}

      <StockActionModal
        visible={modalVisible}
        action={modalAction}
        stock={selectedStock}
        onClose={() => setModalVisible(false)}
        onSuccess={loadData}
      />
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
  listContent: { padding: 16, paddingBottom: 100 },
  headerContainer: { marginBottom: 16 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    width: (width - 32 - 12) / 2,
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
  kpiLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  kpiValue: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  banner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bannerError: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  bannerIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  filterSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1e293b',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterBtnTextActive: {
    color: '#10b981',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardValueSection: {
    alignItems: 'flex-end',
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pnlText: {
    fontSize: 12,
    fontWeight: '700',
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#64748b' },
  cardAmount: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  newBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  newBuyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 32 },
});
