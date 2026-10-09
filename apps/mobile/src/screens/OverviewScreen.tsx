import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { fetchApi } from '../lib/api';

const { width } = Dimensions.get('window');

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const PALETTE = [
  '#FF006E',
  '#00E5FF',
  '#8338EC',
  '#FFBE0B',
  '#10B981',
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
];

interface KpiData {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  totalDebt: number;
}

interface AssetData {
  accounts: number;
  stocks: number;
  crypto: number;
  gold: number;
}

const formatCurrency = (val: number) => {
  return `₺${Number(val || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

export const OverviewScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [kpis, setKpis] = useState<KpiData>({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    totalDebt: 0,
  });

  const [assets, setAssets] = useState<AssetData>({
    accounts: 0,
    stocks: 0,
    crypto: 0,
    gold: 0,
  });

  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  const loadData = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [
        kpiRes,
        monthlyRes,
        categoryRes,
        accountsRes,
        stocksRes,
        cryptoRes,
        savingsRes,
        marketRes,
      ] = await Promise.allSettled([
        fetchApi<any>('/dashboard/kpis'),
        fetchApi<any[]>('/dashboard/monthly-chart?months=6'),
        fetchApi<any[]>('/dashboard/category-breakdown?type=EXPENSE'),
        fetchApi<any>('/accounts?pageSize=100'),
        fetchApi<any>('/stocks/summary'),
        fetchApi<any>('/crypto/summary'),
        fetchApi<any>('/savings-assets'),
        fetchApi<any>('/market/rates'),
      ]);

      // 1. KPIs
      if (kpiRes.status === 'fulfilled' && kpiRes.value) {
        const k = kpiRes.value;
        setKpis({
          totalIncome: parseFloat(k.totalIncome) || 0,
          totalExpense: parseFloat(k.totalExpense) || 0,
          netCashFlow: parseFloat(k.netCashFlow) || 0,
          totalDebt: parseFloat(k.totalDebt) || 0,
        });
      }

      // 2. Monthly Chart
      if (monthlyRes.status === 'fulfilled' && Array.isArray(monthlyRes.value)) {
        setMonthlyData(monthlyRes.value);
      }

      // 3. Category Breakdown
      if (categoryRes.status === 'fulfilled' && Array.isArray(categoryRes.value)) {
        setCategoryData(categoryRes.value);
      }

      // 4. Asset Portfolios
      let accountsTotal = 0;
      if (accountsRes.status === 'fulfilled' && accountsRes.value) {
        const accList = Array.isArray(accountsRes.value)
          ? accountsRes.value
          : accountsRes.value.data || accountsRes.value.items || [];
        if (Array.isArray(accList)) {
          accountsTotal = accList.reduce(
            (sum: number, acc: any) => sum + (Number(acc.currentBalance) || 0),
            0
          );
        }
      }

      let stocksTotal = 0;
      if (stocksRes.status === 'fulfilled' && stocksRes.value) {
        stocksTotal = Number(stocksRes.value.totalValue) || 0;
      }

      let cryptoTotal = 0;
      if (cryptoRes.status === 'fulfilled' && cryptoRes.value) {
        cryptoTotal = Number(cryptoRes.value.totalValue) || 0;
      }

      let goldTotal = 0;
      if (savingsRes.status === 'fulfilled' && savingsRes.value) {
        const savingsList = Array.isArray(savingsRes.value)
          ? savingsRes.value
          : savingsRes.value.items || savingsRes.value.data || [];
        const rates =
          marketRes.status === 'fulfilled' && marketRes.value?.rates
            ? marketRes.value.rates
            : [];

        if (Array.isArray(savingsList)) {
          savingsList.forEach((asset: any) => {
            const qty = Number(asset.quantity) || 0;
            const avgCost = Number(asset.averageCost) || 0;
            const rate = rates.find((r: any) => r.code === asset.code);
            const currentPrice = rate?.buying != null ? Number(rate.buying) : avgCost;
            goldTotal += qty * currentPrice;
          });
        }
      }

      setAssets({
        accounts: accountsTotal,
        stocks: stocksTotal,
        crypto: cryptoTotal,
        gold: goldTotal,
      });
    } catch (error) {
      console.error('Overview data load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Transform Monthly Data for GiftedCharts
  const barData = useMemo(() => {
    let source = monthlyData;
    if (!Array.isArray(source) || source.length === 0) {
      const list = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        list.push({ month: mStr, income: 0, expense: 0 });
      }
      source = list;
    }

    return source.flatMap((item: any) => {
      let label = item.month;
      if (item.month && item.month.includes('-')) {
        const monthNum = parseInt(item.month.split('-')[1], 10);
        label = MONTH_NAMES[monthNum - 1] || item.month;
      }
      const incVal = Number(((Number(item.income) || 0) / 1000).toFixed(1));
      const expVal = Number(((Number(item.expense) || 0) / 1000).toFixed(1));
      return [
        {
          value: incVal,
          label,
          spacing: 4,
          labelWidth: 30,
          labelTextStyle: { color: '#64748b', fontSize: 10 },
          frontColor: '#10b981',
        },
        {
          value: expVal,
          frontColor: '#f43f5e',
        },
      ];
    });
  }, [monthlyData]);

  const maxRawValue = useMemo(() => {
    return Math.max(
      ...(monthlyData || []).flatMap((m: any) => [
        Number(m.income) || 0,
        Number(m.expense) || 0,
      ]),
      0
    );
  }, [monthlyData]);

  const maxBarValue = useMemo(() => {
    if (maxRawValue === 0) return 100;
    const inThousands = Math.ceil(maxRawValue / 1000);
    return Math.max(10, Math.ceil(inThousands / 20) * 20);
  }, [maxRawValue]);

  // Transform Category Data for PieChart
  const pieData = useMemo(() => {
    const filtered = (categoryData || []).filter((item: any) => Number(item.value) > 0);
    return filtered.map((item: any, idx: number) => ({
      value: Number(item.value),
      color: PALETTE[idx % PALETTE.length],
      text: item.label || 'Diğer',
    }));
  }, [categoryData]);

  const totalCategoryExpense = useMemo(() => {
    return pieData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pieData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kontrol Paneli</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.backButton}>
          <Ionicons name="settings-outline" size={22} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Finansal veriler yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Finansal Özet</Text>
            <Text style={styles.sectionSubtitle}>Aylık nakit akışı ve durumunuz.</Text>
          </View>

          {/* KPI Cards */}
          <View style={styles.kpiGrid}>
            {/* Income */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Transactions')}
              style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}
            >
              <View style={styles.kpiIconWrapper}>
                <Ionicons name="arrow-up-outline" size={20} color="#10b981" />
              </View>
              <Text style={styles.kpiLabel}>TOPLAM GELİR</Text>
              <Text style={styles.kpiValue}>{formatCurrency(kpis.totalIncome)}</Text>
            </TouchableOpacity>

            {/* Expense */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Transactions')}
              style={[styles.kpiCard, { borderLeftColor: '#f43f5e', borderLeftWidth: 4 }]}
            >
              <View style={styles.kpiIconWrapper}>
                <Ionicons name="arrow-down-outline" size={20} color="#f43f5e" />
              </View>
              <Text style={styles.kpiLabel}>TOPLAM GİDER</Text>
              <Text style={styles.kpiValue}>{formatCurrency(kpis.totalExpense)}</Text>
            </TouchableOpacity>

            {/* Net Flow */}
            <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
              <View style={styles.kpiIconWrapper}>
                <Ionicons name="wallet-outline" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.kpiLabel}>NET NAKİT AKIŞI</Text>
              <Text
                style={[
                  styles.kpiValue,
                  { color: kpis.netCashFlow >= 0 ? '#3b82f6' : '#f43f5e' },
                ]}
              >
                {formatCurrency(kpis.netCashFlow)}
              </Text>
            </View>

            {/* Debt */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Debts')}
              style={[styles.kpiCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}
            >
              <View style={styles.kpiIconWrapper}>
                <Ionicons name="card-outline" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.kpiLabel}>TOPLAM BORÇ</Text>
              <Text style={styles.kpiValue}>{formatCurrency(kpis.totalDebt)}</Text>
            </TouchableOpacity>
          </View>

          {/* Charts */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Aylık Gelir & Gider Analizi</Text>
              <Text style={styles.chartSubtitle}>Son 6 Ay</Text>
            </View>
            <BarChart
              data={barData}
              barWidth={12}
              spacing={24}
              roundedTop
              roundedBottom={false}
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
              noOfSections={4}
              maxValue={maxBarValue}
              yAxisLabelPrefix="₺"
              yAxisLabelSuffix="k"
              initialSpacing={10}
              rulesColor="#f1f5f9"
              dashWidth={4}
              dashGap={4}
              hideRules={false}
              isAnimated
            />
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981' }} />
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>Gelir</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#f43f5e' }} />
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>Gider</Text>
              </View>
            </View>
            {maxRawValue === 0 && (
              <View style={styles.chartEmptyNote}>
                <Ionicons name="information-circle-outline" size={15} color="#94a3b8" />
                <Text style={styles.chartEmptyNoteText}>
                  Son 6 aya ait henüz finansal işlem kaydı bulunmuyor.
                </Text>
              </View>
            )}
          </View>

          {/* Category Pie Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Gider Dağılımı</Text>
            {pieData.length === 0 ? (
              <View style={styles.emptyChartState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="pie-chart-outline" size={32} color="#94a3b8" />
                </View>
                <Text style={styles.emptyStateTitle}>Harcama Kaydı Yok</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Bu ay için henüz kategorize edilmiş bir gider işlemi bulunmuyor.
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <PieChart
                  data={pieData}
                  donut
                  innerRadius={50}
                  radius={80}
                  centerLabelComponent={() => (
                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, color: '#1e293b', fontWeight: 'bold' }}>
                        {formatCurrency(totalCategoryExpense)}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#64748b' }}>Toplam Gider</Text>
                    </View>
                  )}
                />
                <View style={{ gap: 10, flex: 1, marginLeft: 16 }}>
                  {pieData.slice(0, 5).map((item, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                        <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }} numberOfLines={1}>
                          {item.text}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600', marginLeft: 8 }}>
                        {formatCurrency(item.value)}
                      </Text>
                    </View>
                  ))}
                  {pieData.length > 5 && (
                    <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
                      +{pieData.length - 5} diğer kategori
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Asset Cards */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Varlık & Portföy Durumu</Text>
          </View>

          <View style={styles.assetList}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Accounts')}
              style={styles.assetCard}
            >
              <View style={[styles.assetIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="business-outline" size={24} color="#10b981" />
              </View>
              <View style={styles.assetInfo}>
                <Text style={styles.assetTitle}>HESAPLARIM</Text>
                <Text style={styles.assetValue}>{formatCurrency(assets.accounts)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Stocks')}
              style={styles.assetCard}
            >
              <View style={[styles.assetIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="trending-up-outline" size={24} color="#3b82f6" />
              </View>
              <View style={styles.assetInfo}>
                <Text style={styles.assetTitle}>HİSSE SENETLERİM</Text>
                <Text style={styles.assetValue}>{formatCurrency(assets.stocks)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Crypto')}
              style={styles.assetCard}
            >
              <View style={[styles.assetIcon, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="logo-bitcoin" size={24} color="#8b5cf6" />
              </View>
              <View style={styles.assetInfo}>
                <Text style={styles.assetTitle}>KRİPTO VARLIKLAR</Text>
                <Text style={styles.assetValue}>{formatCurrency(assets.crypto)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Savings')}
              style={styles.assetCard}
            >
              <View style={[styles.assetIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="cash-outline" size={24} color="#f59e0b" />
              </View>
              <View style={styles.assetInfo}>
                <Text style={styles.assetTitle}>ALTIN & DÖVİZ</Text>
                <Text style={styles.assetValue}>{formatCurrency(assets.gold)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
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
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionHeader: { marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  kpiCard: {
    width: (width - 32 - 12) / 2,
    backgroundColor: '#ffffff',
    padding: 12,
    paddingBottom: 14,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 2 },
  kpiValue: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  chartSubtitle: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  chartEmptyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  chartEmptyNoteText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  emptyChartState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  assetList: { marginBottom: 20 },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  assetInfo: { flex: 1 },
  assetTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  assetValue: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
});
