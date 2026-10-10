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
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { fetchApi } from '../lib/api';

const { width, height } = Dimensions.get('window');

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

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0-indexed
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '0'..'11'
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [isYearPickerVisible, setIsYearPickerVisible] = useState<boolean>(false);

  const loadAvailableYears = useCallback(async () => {
    try {
      const res = await fetchApi<any>('/dashboard/available-years');
      const years = Array.isArray(res) ? res : ((res as any)?.data || []);
      if (Array.isArray(years) && years.length > 0) {
        setAvailableYears(years);
        if (!years.includes(selectedYear)) {
          setSelectedYear(years[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load available years:', e);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadAvailableYears();
  }, [loadAvailableYears]);

  const { startDate, endDate } = useMemo(() => {
    if (selectedMonth === 'all') {
      return {
        startDate: new Date(selectedYear, 0, 1).toISOString(),
        endDate: new Date(selectedYear, 11, 31, 23, 59, 59).toISOString(),
      };
    }
    const m = parseInt(selectedMonth, 10);
    return {
      startDate: new Date(selectedYear, m, 1).toISOString(),
      endDate: new Date(selectedYear, m + 1, 0, 23, 59, 59).toISOString(),
    };
  }, [selectedMonth, selectedYear]);

  const periodLabel = useMemo(() => {
    if (selectedMonth === 'all') {
      return `${selectedYear} Yılı Geneli`;
    }
    const mIdx = parseInt(selectedMonth, 10);
    return `${MONTH_NAMES[mIdx]} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const kpiLabels = useMemo(() => {
    if (selectedMonth === 'all') {
      return {
        income: 'YILLIK GELİR',
        expense: 'YILLIK GİDER',
        netFlow: 'YILLIK NET AKIŞ',
        debt: 'TOPLAM BORÇ',
      };
    }
    const mIdx = parseInt(selectedMonth, 10);
    const mName = (MONTH_NAMES[mIdx] || '').toUpperCase();
    return {
      income: `${mName} GELİRİ`,
      expense: `${mName} GİDERİ`,
      netFlow: `${mName} NET AKIŞ`,
      debt: 'TOPLAM BORÇ',
    };
  }, [selectedMonth]);

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
        fetchApi<any>(`/dashboard/kpis?startDate=${startDate}&endDate=${endDate}`),
        fetchApi<any[]>(`/dashboard/monthly-chart?months=12&year=${selectedYear}`),
        fetchApi<any[]>(`/dashboard/category-breakdown?startDate=${startDate}&endDate=${endDate}&type=EXPENSE`),
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
  }, [startDate, endDate, selectedYear]);

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
            <Text style={styles.sectionSubtitle}>
              {selectedMonth === 'all'
                ? `${selectedYear} yılı genel nakit akışı ve durumunuz.`
                : `${periodLabel} dönemi nakit akışı ve durumunuz.`}
            </Text>
          </View>

          {/* Dönem Filtresi (Chips) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
            style={styles.filterScrollView}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedMonth === 'all' && styles.filterChipActive,
              ]}
              onPress={() => {
                if (selectedMonth === 'all') {
                  setIsYearPickerVisible(true);
                } else {
                  setSelectedMonth('all');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar"
                size={13}
                color={selectedMonth === 'all' ? '#ffffff' : '#3b82f6'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedMonth === 'all' && styles.filterChipTextActive,
                ]}
              >
                Tüm Yıl ({selectedYear})
              </Text>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                onPress={() => setIsYearPickerVisible(true)}
              >
                <Ionicons
                  name="chevron-down"
                  size={13}
                  color={selectedMonth === 'all' ? '#ffffff' : '#64748b'}
                  style={{ marginLeft: 1 }}
                />
              </TouchableOpacity>
            </TouchableOpacity>

            {selectedYear === currentYear ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedMonth === String(currentMonthIdx) && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedMonth(String(currentMonthIdx))}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedMonth === String(currentMonthIdx) && styles.filterChipTextActive,
                    ]}
                  >
                    Bu Ay ({MONTH_NAMES[currentMonthIdx]})
                  </Text>
                </TouchableOpacity>

                {MONTH_NAMES.map((name, idx) => {
                  if (idx === currentMonthIdx) return null;
                  const isSelected = selectedMonth === String(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedMonth(String(idx))}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isSelected && styles.filterChipTextActive,
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              MONTH_NAMES.map((name, idx) => {
                const isSelected = selectedMonth === String(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedMonth(String(idx))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                      ]}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

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
              <Text style={styles.kpiLabel}>{kpiLabels.income}</Text>
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
              <Text style={styles.kpiLabel}>{kpiLabels.expense}</Text>
              <Text style={styles.kpiValue}>{formatCurrency(kpis.totalExpense)}</Text>
            </TouchableOpacity>

            {/* Net Flow */}
            <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
              <View style={styles.kpiIconWrapper}>
                <Ionicons name="wallet-outline" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.kpiLabel}>{kpiLabels.netFlow}</Text>
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
              <Text style={styles.kpiLabel}>{kpiLabels.debt}</Text>
              <Text style={styles.kpiValue}>{formatCurrency(kpis.totalDebt)}</Text>
            </TouchableOpacity>
          </View>

          {/* Charts */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Aylık Gelir & Gider Analizi</Text>
              <Text style={styles.chartSubtitle}>
                {selectedYear === currentYear ? 'Son 12 Ay' : `${selectedYear} Yılı`}
              </Text>
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
                  {selectedYear === currentYear
                    ? 'Bu döneme ait henüz finansal işlem kaydı bulunmuyor.'
                    : `${selectedYear} yılına ait henüz finansal işlem kaydı bulunmuyor.`}
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

      {/* Year Picker Modal */}
      <Modal
        visible={isYearPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsYearPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsYearPickerVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconContainer}>
                  <Ionicons name="calendar" size={18} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Yıl Seçimi</Text>
                  <Text style={styles.modalSubtitle}>Veritabanında tanımlı yıllar</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsYearPickerVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalYearList} showsVerticalScrollIndicator={false}>
              {availableYears.map((year) => {
                const isSelected = year === selectedYear;
                const isCurrent = year === currentYear;

                return (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearOptionCard,
                      isSelected && styles.yearOptionCardActive,
                    ]}
                    onPress={() => {
                      setSelectedYear(year);
                      setSelectedMonth('all');
                      setIsYearPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.yearOptionLeft}>
                      <View
                        style={[
                          styles.yearIconContainer,
                          isSelected && styles.yearIconContainerActive,
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={isSelected ? '#ffffff' : '#3b82f6'}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.yearOptionText,
                            isSelected && styles.yearOptionTextActive,
                          ]}
                        >
                          {year} Yılı
                        </Text>
                        {isCurrent && (
                          <View style={styles.currentYearBadge}>
                            <Text style={styles.currentYearBadgeText}>Mevcut Yıl</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
                    ) : (
                      <View style={styles.radioEmpty} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  filterScrollView: {
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 0,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: height * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalYearList: {
    marginTop: 14,
  },
  yearOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  yearOptionCardActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  yearOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  yearIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearIconContainerActive: {
    backgroundColor: '#3b82f6',
  },
  yearOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  yearOptionTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  currentYearBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  currentYearBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
});
