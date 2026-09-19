import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

const { width } = Dimensions.get('window');

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b'];

type ReportTab = 'SUMMARY' | 'MONTHLY' | 'YEARLY' | 'COMPARISON';

export const ReportsScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('SUMMARY');
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  // SUMMARY Tab states
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [summaryCategoryData, setSummaryCategoryData] = useState<any[]>([]);
  const [summaryMerchantData, setSummaryMerchantData] = useState<any[]>([]);

  // MONTHLY Tab states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyKpi, setMonthlyKpi] = useState({ income: 0, expense: 0, netCashFlow: 0 });
  const [monthlyCategoryData, setMonthlyCategoryData] = useState<any[]>([]);
  const [monthlyMerchantData, setMonthlyMerchantData] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any>({ categoryTrends: [] });
  const [selectedTrendCat, setSelectedTrendCat] = useState<string | null>(null);

  // YEARLY Tab states
  const [yearlyYear, setYearlyYear] = useState(new Date().getFullYear());
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const toggleParentExpand = (key: string) => {
    setExpandedParents(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllParents = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    yearlyData.forEach(p => {
      const key = p.id || p.name;
      next[key] = expand;
    });
    setExpandedParents(next);
  };

  // COMPARISON Tab states
  const today = new Date();
  const defaultLastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  const defaultLastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const [compMonthA, setCompMonthA] = useState(defaultLastMonth);
  const [compYearA, setCompYearA] = useState(defaultLastMonthYear);
  const [compMonthB, setCompMonthB] = useState(today.getMonth());
  const [compYearB, setCompYearB] = useState(today.getFullYear());

  const [compKpiA, setCompKpiA] = useState({ income: 0, expense: 0, netCashFlow: 0 });
  const [compKpiB, setCompKpiB] = useState({ income: 0, expense: 0, netCashFlow: 0 });
  const [compCatA, setCompCatA] = useState<any[]>([]);
  const [compCatB, setCompCatB] = useState<any[]>([]);
  const [compMerA, setCompMerA] = useState<any[]>([]);
  const [compMerB, setCompMerB] = useState<any[]>([]);

  const formatCurrency = (val: number) => {
    return `₺${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrencyCompact = (val: number) => {
    return `₺${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // 1. Load Summary Tab
  const loadSummary = async () => {
    try {
      setLoading(true);
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const [monthlyRes, catRes, merRes] = await Promise.all([
        fetchApi<any>('/dashboard/monthly-chart?months=12').catch(() => []),
        fetchApi<any>(`/dashboard/category-breakdown?startDate=${start.toISOString()}&endDate=${end.toISOString()}`).catch(() => []),
        fetchApi<any>(`/dashboard/merchant-breakdown?startDate=${start.toISOString()}&endDate=${end.toISOString()}`).catch(() => []),
      ]);

      const monthlyList = Array.isArray(monthlyRes) ? monthlyRes : (monthlyRes?.data || []);
      const catList = Array.isArray(catRes) ? catRes : (catRes?.data || []);
      const merList = Array.isArray(merRes) ? merRes : (merRes?.data || []);

      setMonthlyChartData(monthlyList);
      setSummaryCategoryData(catList);
      setSummaryMerchantData(merList);
    } catch (e) {
      console.error('Rapor özeti yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load Monthly Tab
  const loadMonthlyData = async () => {
    try {
      setLoading(true);
      const start = new Date(selectedYear, selectedMonth, 1).toISOString();
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      const [kpiRes, catRes, merRes, trendsRes] = await Promise.all([
        fetchApi<any>(`/dashboard/kpis?startDate=${start}&endDate=${end}`).catch(() => null),
        fetchApi<any>(`/dashboard/category-breakdown?startDate=${start}&endDate=${end}`).catch(() => []),
        fetchApi<any>(`/dashboard/merchant-breakdown?startDate=${start}&endDate=${end}`).catch(() => []),
        fetchApi<any>(`/dashboard/monthly-trends?year=${selectedYear}`).catch(() => null),
      ]);

      const kpiData = kpiRes?.data || kpiRes || {};
      setMonthlyKpi({
        income: parseFloat(kpiData.totalIncome || '0'),
        expense: parseFloat(kpiData.totalExpense || '0'),
        netCashFlow: parseFloat(kpiData.netCashFlow || '0'),
      });

      const catList = Array.isArray(catRes) ? catRes : (catRes?.data || []);
      const merList = Array.isArray(merRes) ? merRes : (merRes?.data || []);
      const trendData = trendsRes?.data || trendsRes || { categoryTrends: [] };

      setMonthlyCategoryData(catList);
      setMonthlyMerchantData(merList);
      setMonthlyTrends(trendData);

      if (trendData.categoryTrends?.length > 0 && !selectedTrendCat) {
        setSelectedTrendCat(trendData.categoryTrends[0].id);
      }
    } catch (e) {
      console.error('Aylık rapor yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  };

  // 3. Load Yearly Tab
  const loadYearlyData = async () => {
    try {
      setYearlyLoading(true);
      const data = await fetchApi<any>(`/dashboard/yearly-expenses?year=${yearlyYear}`);
      setYearlyData(Array.isArray(data) ? data : (data?.data || []));
    } catch (e) {
      console.error('Yıllık rapor yüklenirken hata:', e);
      setYearlyData([]);
    } finally {
      setYearlyLoading(false);
    }
  };

  // 4. Load Comparison Tab
  const loadComparisonData = async () => {
    try {
      setLoading(true);
      const startA = new Date(compYearA, compMonthA, 1).toISOString();
      const endA = new Date(compYearA, compMonthA + 1, 0, 23, 59, 59).toISOString();

      const startB = new Date(compYearB, compMonthB, 1).toISOString();
      const endB = new Date(compYearB, compMonthB + 1, 0, 23, 59, 59).toISOString();

      const [kpiA, kpiB, catA, catB, merA, merB] = await Promise.all([
        fetchApi<any>(`/dashboard/kpis?startDate=${startA}&endDate=${endA}`).catch(() => null),
        fetchApi<any>(`/dashboard/kpis?startDate=${startB}&endDate=${endB}`).catch(() => null),
        fetchApi<any>(`/dashboard/category-breakdown?startDate=${startA}&endDate=${endA}`).catch(() => []),
        fetchApi<any>(`/dashboard/category-breakdown?startDate=${startB}&endDate=${endB}`).catch(() => []),
        fetchApi<any>(`/dashboard/merchant-breakdown?startDate=${startA}&endDate=${endA}`).catch(() => []),
        fetchApi<any>(`/dashboard/merchant-breakdown?startDate=${startB}&endDate=${endB}`).catch(() => []),
      ]);

      const kpiDataA = kpiA?.data || kpiA || {};
      const kpiDataB = kpiB?.data || kpiB || {};

      setCompKpiA({
        income: parseFloat(kpiDataA.totalIncome || '0'),
        expense: parseFloat(kpiDataA.totalExpense || '0'),
        netCashFlow: parseFloat(kpiDataA.netCashFlow || '0'),
      });
      setCompKpiB({
        income: parseFloat(kpiDataB.totalIncome || '0'),
        expense: parseFloat(kpiDataB.totalExpense || '0'),
        netCashFlow: parseFloat(kpiDataB.netCashFlow || '0'),
      });

      setCompCatA(Array.isArray(catA) ? catA : (catA?.data || []));
      setCompCatB(Array.isArray(catB) ? catB : (catB?.data || []));
      setCompMerA(Array.isArray(merA) ? merA : (merA?.data || []));
      setCompMerB(Array.isArray(merB) ? merB : (merB?.data || []));
    } catch (e) {
      console.error('Karşılaştırma yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'SUMMARY') {
      loadSummary();
    } else if (activeTab === 'MONTHLY') {
      loadMonthlyData();
    } else if (activeTab === 'YEARLY') {
      loadYearlyData();
    } else if (activeTab === 'COMPARISON') {
      loadComparisonData();
    }
  }, [activeTab, selectedMonth, selectedYear, yearlyYear, compMonthA, compYearA, compMonthB, compYearB]);

  // Summary Totals
  const summaryTotals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    monthlyChartData.forEach(d => {
      totalIncome += (d.income || 0);
      totalExpense += (d.expense || 0);
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const avgMonthlyExpense = monthlyChartData.length > 0 ? totalExpense / monthlyChartData.length : 0;

    return { totalIncome, totalExpense, netSavings, savingsRate, avgMonthlyExpense };
  }, [monthlyChartData]);

  // Yearly Calculation: Month totals
  const yearlyMonthTotals = useMemo(() => {
    const totals = Array(12).fill(0);
    yearlyData.forEach(item => {
      if (Array.isArray(item.months)) {
        item.months.forEach((val: number, idx: number) => {
          totals[idx] += (val || 0);
        });
      }
    });
    const totalYearExpense = totals.reduce((a, b) => a + b, 0);
    const maxMonthExpense = Math.max(...totals, 1);
    return { totals, totalYearExpense, maxMonthExpense };
  }, [yearlyData]);

  // Comparison differences calculation
  const compDifferences = useMemo(() => {
    const incDiff = compKpiB.income - compKpiA.income;
    const incPct = compKpiA.income > 0 ? ((incDiff / compKpiA.income) * 100).toFixed(1) : (compKpiB.income > 0 ? '+100' : '0');

    const expDiff = compKpiB.expense - compKpiA.expense;
    const expPct = compKpiA.expense > 0 ? ((expDiff / compKpiA.expense) * 100).toFixed(1) : (compKpiB.expense > 0 ? '+100' : '0');

    const netDiff = compKpiB.netCashFlow - compKpiA.netCashFlow;

    // Categories
    const allCatLabels = Array.from(new Set([...compCatA.map(c => c.label || c.name), ...compCatB.map(c => c.label || c.name)]));
    const catDiffs = allCatLabels.map(label => {
      const valA = compCatA.find(c => (c.label || c.name) === label)?.value || 0;
      const valB = compCatB.find(c => (c.label || c.name) === label)?.value || 0;
      const diff = valB - valA;
      const pct = valA > 0 ? ((diff / valA) * 100).toFixed(1) : (valB > 0 ? '100' : '0');
      return { label, valA, valB, diff, pct };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    return { incDiff, incPct, expDiff, expPct, netDiff, catDiffs };
  }, [compKpiA, compKpiB, compCatA, compCatB]);

  // Active trend category data
  const currentTrendData = useMemo(() => {
    if (!selectedTrendCat || !monthlyTrends.categoryTrends) return null;
    return monthlyTrends.categoryTrends.find((c: any) => c.id === selectedTrendCat);
  }, [selectedTrendCat, monthlyTrends]);

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finansal Raporlar</Text>
        <TouchableOpacity onPress={() => setShowGuide(!showGuide)} style={styles.guideToggleBtn}>
          <Ionicons name="information-circle-outline" size={22} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {/* Guide Banner */}
      {showGuide && (
        <View style={styles.guideCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="bulb-outline" size={18} color="#10b981" />
              <Text style={styles.guideTitle}>Raporlama & Analiz Rehberi</Text>
            </View>
            <TouchableOpacity onPress={() => setShowGuide(false)}>
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.guideText}>
            • <Text style={{ fontWeight: '700' }}>Genel Bakış:</Text> 12 aylık gelir/gider akışı ve tasarruf oranınız.{'\n'}
            • <Text style={{ fontWeight: '700' }}>Aylık Detay:</Text> Seçilen ayın kategori ve mağaza dağılımları ile kategori trendleri.{'\n'}
            • <Text style={{ fontWeight: '700' }}>Yıllık Rapor:</Text> Yıl içindeki 12 ayın harcama dökümü ve zirve aylar.{'\n'}
            • <Text style={{ fontWeight: '700' }}>Dönem Kıyas:</Text> İki farklı ayı yan yana karşılaştırarak harcama farklarını görme.
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'SUMMARY' && styles.tabBtnActive]}
            onPress={() => setActiveTab('SUMMARY')}
          >
            <Ionicons name="pie-chart-outline" size={15} color={activeTab === 'SUMMARY' ? '#8b5cf6' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'SUMMARY' && styles.tabTextActive]}>Genel Bakış</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'MONTHLY' && styles.tabBtnActive]}
            onPress={() => setActiveTab('MONTHLY')}
          >
            <Ionicons name="calendar-outline" size={15} color={activeTab === 'MONTHLY' ? '#8b5cf6' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'MONTHLY' && styles.tabTextActive]}>Aylık Detay</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'YEARLY' && styles.tabBtnActive]}
            onPress={() => setActiveTab('YEARLY')}
          >
            <Ionicons name="bar-chart-outline" size={15} color={activeTab === 'YEARLY' ? '#8b5cf6' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'YEARLY' && styles.tabTextActive]}>Yıllık Rapor</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'COMPARISON' && styles.tabBtnActive]}
            onPress={() => setActiveTab('COMPARISON')}
          >
            <Ionicons name="swap-horizontal" size={15} color={activeTab === 'COMPARISON' ? '#8b5cf6' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'COMPARISON' && styles.tabTextActive]}>Dönem Kıyas</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading && activeTab !== 'YEARLY' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ===================== TAB 1: SUMMARY ===================== */}
          {activeTab === 'SUMMARY' && (
            <>
              {/* Summary KPIs */}
              <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
                  <Text style={styles.kpiLabel}>TOPLAM GELİR (12 AY)</Text>
                  <Text style={[styles.kpiValue, { color: '#10b981' }]} numberOfLines={1}>
                    {formatCurrency(summaryTotals.totalIncome)}
                  </Text>
                  <Text style={styles.kpiSubText}>Son 12 Ay</Text>
                </View>

                <View style={[styles.kpiCard, { borderLeftColor: '#ef4444', borderLeftWidth: 4 }]}>
                  <Text style={styles.kpiLabel}>TOPLAM GİDER (12 AY)</Text>
                  <Text style={[styles.kpiValue, { color: '#ef4444' }]} numberOfLines={1}>
                    {formatCurrency(summaryTotals.totalExpense)}
                  </Text>
                  <Text style={styles.kpiSubText}>Son 12 Ay</Text>
                </View>

                <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
                  <Text style={styles.kpiLabel}>NET BİRİKİM</Text>
                  <Text style={[styles.kpiValue, { color: '#3b82f6' }]} numberOfLines={1}>
                    {formatCurrency(summaryTotals.netSavings)}
                  </Text>
                  <Text style={styles.kpiSubText}>Tasarruf Oranı: %{summaryTotals.savingsRate}</Text>
                </View>

                <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
                  <Text style={styles.kpiLabel}>AYLIK ORT. GİDER</Text>
                  <Text style={[styles.kpiValue, { color: '#f59e0b' }]} numberOfLines={1}>
                    {formatCurrency(summaryTotals.avgMonthlyExpense)}
                  </Text>
                  <Text style={styles.kpiSubText}>12 Aylık Ortalama</Text>
                </View>
              </View>

              {/* Monthly Trend Bars */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bar-chart" size={18} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>Son Ayların Gelir & Gider Akışı</Text>
                </View>

                <View style={{ gap: 12, marginTop: 8 }}>
                  {monthlyChartData.slice(-6).map((item, idx) => {
                    const inc = item.income || 0;
                    const exp = item.expense || 0;
                    const maxVal = Math.max(inc, exp, 1);

                    const incWidth = Math.min(Math.round((inc / maxVal) * 100), 100);
                    const expWidth = Math.min(Math.round((exp / maxVal) * 100), 100);

                    return (
                      <View key={idx} style={styles.monthBarRow}>
                        <Text style={styles.monthBarLabel}>{item.month}</Text>
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${incWidth}%`, backgroundColor: '#10b981' }]} />
                            <Text style={styles.barText}>{formatCurrencyCompact(inc)}</Text>
                          </View>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${expWidth}%`, backgroundColor: '#ef4444' }]} />
                            <Text style={styles.barText}>{formatCurrencyCompact(exp)}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.legendRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.legendText}>Gelir</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.legendText}>Gider</Text>
                  </View>
                </View>
              </View>

              {/* Category Breakdown */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pie-chart" size={18} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>Kategori Bazlı Harcamalar</Text>
                </View>

                {summaryCategoryData.length === 0 ? (
                  <Text style={styles.emptyCardText}>Harcama verisi bulunamadı.</Text>
                ) : (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {summaryCategoryData.slice(0, 8).map((cat, idx) => {
                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      const pct = Math.round(cat.percentage || 0);

                      return (
                        <View key={idx}>
                          <View style={styles.catHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={[styles.catDot, { backgroundColor: color }]} />
                              <Text style={styles.catName}>{cat.name || cat.label || 'Diğer'}</Text>
                            </View>
                            <Text style={styles.catAmount}>
                              {formatCurrency(cat.amount || cat.value)} (%{pct})
                            </Text>
                          </View>
                          <View style={styles.catProgressTrack}>
                            <View style={[styles.catProgressFill, { width: `${pct}%`, backgroundColor: color }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Merchant Breakdown */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="storefront" size={18} color="#f59e0b" />
                  <Text style={styles.sectionTitle}>En Çok Harcama Yapılan Mağazalar</Text>
                </View>

                {summaryMerchantData.length === 0 ? (
                  <Text style={styles.emptyCardText}>Kayıtlı mağaza verisi yok.</Text>
                ) : (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {summaryMerchantData.slice(0, 6).map((mer, idx) => (
                      <View key={idx} style={styles.merchantRow}>
                        <View style={styles.merchantRank}>
                          <Text style={styles.merchantRankText}>#{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.merchantName}>{mer.name || mer.label || 'İsimsiz Mağaza'}</Text>
                          <Text style={styles.merchantCount}>{mer.count || 1} İşlem</Text>
                        </View>
                        <Text style={styles.merchantAmount}>{formatCurrency(mer.amount || mer.value)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          {/* ===================== TAB 2: MONTHLY ===================== */}
          {activeTab === 'MONTHLY' && (
            <>
              {/* Month Navigator */}
              <View style={styles.monthNav}>
                <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
                  <Ionicons name="chevron-back" size={20} color="#0f172a" />
                </TouchableOpacity>

                <Text style={styles.monthTitleText}>
                  {MONTHS_TR[selectedMonth]} {selectedYear}
                </Text>

                <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
                  <Ionicons name="chevron-forward" size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              {/* Monthly KPIs */}
              <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
                  <Text style={styles.kpiLabel}>BU AY GELİR</Text>
                  <Text style={[styles.kpiValue, { color: '#10b981' }]} numberOfLines={1}>
                    {formatCurrency(monthlyKpi.income)}
                  </Text>
                </View>

                <View style={[styles.kpiCard, { borderLeftColor: '#ef4444', borderLeftWidth: 4 }]}>
                  <Text style={styles.kpiLabel}>BU AY GİDER</Text>
                  <Text style={[styles.kpiValue, { color: '#ef4444' }]} numberOfLines={1}>
                    {formatCurrency(monthlyKpi.expense)}
                  </Text>
                </View>

                <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4, width: '100%' }]}>
                  <Text style={styles.kpiLabel}>NET DURUM / NAKİT AKIŞI</Text>
                  <Text style={[styles.kpiValue, { color: monthlyKpi.netCashFlow >= 0 ? '#10b981' : '#ef4444' }]} numberOfLines={1}>
                    {formatCurrency(monthlyKpi.netCashFlow)}
                  </Text>
                  <Text style={styles.kpiSubText}>
                    {monthlyKpi.netCashFlow >= 0 ? 'Tasarruf sağlandı' : 'Aylık bütçe aşıldı'}
                  </Text>
                </View>
              </View>

              {/* Monthly Categories */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pie-chart" size={18} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>Bu Ayın Harcama Dağılımı</Text>
                </View>

                {monthlyCategoryData.length === 0 ? (
                  <Text style={styles.emptyCardText}>Bu ay için harcama kaydı bulunmuyor.</Text>
                ) : (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {monthlyCategoryData.map((cat, idx) => {
                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      const pct = Math.round(cat.percentage || 0);

                      return (
                        <View key={idx}>
                          <View style={styles.catHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={[styles.catDot, { backgroundColor: color }]} />
                              <Text style={styles.catName}>{cat.name || cat.label || 'Diğer'}</Text>
                            </View>
                            <Text style={styles.catAmount}>
                              {formatCurrency(cat.amount || cat.value)} (%{pct})
                            </Text>
                          </View>
                          <View style={styles.catProgressTrack}>
                            <View style={[styles.catProgressFill, { width: `${pct}%`, backgroundColor: color }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Monthly Trends Component */}
              {monthlyTrends.categoryTrends && monthlyTrends.categoryTrends.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="trending-up" size={18} color="#10b981" />
                    <Text style={styles.sectionTitle}>Kategori Yıllık Harcama Akışı</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
                    {monthlyTrends.categoryTrends.map((cat: any) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.trendCatChip, selectedTrendCat === cat.id && styles.trendCatChipActive]}
                        onPress={() => setSelectedTrendCat(cat.id)}
                      >
                        <Text style={[styles.trendCatText, selectedTrendCat === cat.id && styles.trendCatTextActive]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {currentTrendData && (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
                        {currentTrendData.name} - Yıllık Toplam: <Text style={{ color: '#0f172a' }}>{formatCurrency(currentTrendData.total)}</Text>
                      </Text>
                      <View style={{ gap: 6 }}>
                        {MONTHS_TR.map((mName, mIdx) => {
                          const val = currentTrendData.months ? currentTrendData.months[mIdx] || 0 : 0;
                          const maxVal = Math.max(...(currentTrendData.months || [1]), 1);
                          const pct = Math.min(Math.round((val / maxVal) * 100), 100);

                          return (
                            <View key={mIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ width: 34, fontSize: 11, color: '#64748b' }}>{mName.slice(0, 3)}</Text>
                              <View style={{ flex: 1, height: 16, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#8b5cf6', borderRadius: 4 }} />
                              </View>
                              <Text style={{ width: 70, fontSize: 11, textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>
                                {val > 0 ? formatCurrencyCompact(val) : '-'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Monthly Merchants */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="storefront" size={18} color="#f59e0b" />
                  <Text style={styles.sectionTitle}>Bu Ay En Çok Harcanan Yerler</Text>
                </View>

                {monthlyMerchantData.length === 0 ? (
                  <Text style={styles.emptyCardText}>Bu ay için mağaza kaydı bulunmuyor.</Text>
                ) : (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {monthlyMerchantData.map((mer, idx) => (
                      <View key={idx} style={styles.merchantRow}>
                        <View style={styles.merchantRank}>
                          <Text style={styles.merchantRankText}>#{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.merchantName}>{mer.name || mer.label || 'İsimsiz Mağaza'}</Text>
                          <Text style={styles.merchantCount}>{mer.count || 1} İşlem</Text>
                        </View>
                        <Text style={styles.merchantAmount}>{formatCurrency(mer.amount || mer.value)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          {/* ===================== TAB 3: YEARLY ===================== */}
          {activeTab === 'YEARLY' && (
            <>
              {/* Year Navigator */}
              <View style={styles.monthNav}>
                <TouchableOpacity style={styles.navBtn} onPress={() => setYearlyYear(y => y - 1)}>
                  <Ionicons name="chevron-back" size={20} color="#0f172a" />
                </TouchableOpacity>

                <Text style={styles.monthTitleText}>{yearlyYear} Yılı Raporu</Text>

                <TouchableOpacity style={styles.navBtn} onPress={() => setYearlyYear(y => y + 1)}>
                  <Ionicons name="chevron-forward" size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              {yearlyLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color="#8b5cf6" />
                </View>
              ) : (
                <>
                  {/* Yearly KPI */}
                  <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCard, { borderLeftColor: '#ef4444', borderLeftWidth: 4, width: '48%' }]}>
                      <Text style={styles.kpiLabel}>YILLIK TOPLAM GİDER</Text>
                      <Text style={[styles.kpiValue, { color: '#ef4444' }]} numberOfLines={1}>
                        {formatCurrency(yearlyMonthTotals.totalYearExpense)}
                      </Text>
                    </View>

                    <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4, width: '48%' }]}>
                      <Text style={styles.kpiLabel}>AYLIK ORTALAMA</Text>
                      <Text style={[styles.kpiValue, { color: '#3b82f6' }]} numberOfLines={1}>
                        {formatCurrency(yearlyMonthTotals.totalYearExpense / 12)}
                      </Text>
                    </View>
                  </View>

                  {/* 12 Months Breakdown Bars */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="bar-chart" size={18} color="#8b5cf6" />
                      <Text style={styles.sectionTitle}>12 Aylık Harcama Dağılımı</Text>
                    </View>

                    <View style={{ gap: 8, marginTop: 8 }}>
                      {MONTHS_TR.map((mName, idx) => {
                        const amount = yearlyMonthTotals.totals[idx] || 0;
                        const pct = Math.min(Math.round((amount / yearlyMonthTotals.maxMonthExpense) * 100), 100);
                        const isHighest = amount === yearlyMonthTotals.maxMonthExpense && amount > 0;

                        return (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ width: 44, fontSize: 12, fontWeight: '600', color: '#475569' }}>{mName}</Text>
                            <View style={{ flex: 1, height: 20, backgroundColor: '#f1f5f9', borderRadius: 6, overflow: 'hidden', justifyContent: 'center' }}>
                              <View style={{ height: '100%', width: `${pct}%`, backgroundColor: isHighest ? '#f43f5e' : '#3b82f6', borderRadius: 6 }} />
                            </View>
                            <View style={{ width: 90, alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: isHighest ? '#f43f5e' : '#1e293b' }}>
                                {amount > 0 ? formatCurrencyCompact(amount) : '-'}
                              </Text>
                              {isHighest && <Text style={{ fontSize: 9, color: '#f43f5e', fontWeight: '700' }}>Zirve Ay</Text>}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* 12-Month Expense Matrix Table */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons name="grid-outline" size={18} color="#10b981" />
                        <Text style={styles.sectionTitle}>Yıllık Harcama Matrisi</Text>
                      </View>
                      {yearlyData.length > 0 && (
                        <TouchableOpacity
                          style={styles.expandToggleBtn}
                          onPress={() => {
                            const allOpen = yearlyData.every(p => expandedParents[p.id || p.name]);
                            toggleAllParents(!allOpen);
                          }}
                        >
                          <Ionicons
                            name={yearlyData.every(p => expandedParents[p.id || p.name]) ? "contract-outline" : "expand-outline"}
                            size={13}
                            color="#6366f1"
                          />
                          <Text style={styles.expandToggleText}>
                            {yearlyData.every(p => expandedParents[p.id || p.name]) ? "Tümünü Kapat" : "Tümünü Aç"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.matrixHintText}>
                      👉 12 ayı ve genel toplamı incelemek için tabloyu yana kaydırın
                    </Text>

                    {yearlyData.length === 0 ? (
                      <Text style={styles.emptyCardText}>Bu yıla ait harcama matrisi verisi bulunamadı.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                        <View style={styles.matrixTable}>
                          {/* Header Row */}
                          <View style={styles.matrixHeaderRow}>
                            <View style={[styles.matrixCell, styles.matrixHeaderCell, styles.matrixNameCol]}>
                              <Text style={styles.matrixHeaderText}>Harcama Yeri / Kategori</Text>
                            </View>
                            {MONTHS_TR.map((m, idx) => (
                              <View key={idx} style={[styles.matrixCell, styles.matrixHeaderCell, styles.matrixMonthCol]}>
                                <Text style={styles.matrixHeaderText}>{m}</Text>
                              </View>
                            ))}
                            <View style={[styles.matrixCell, styles.matrixHeaderCell, styles.matrixTotalCol]}>
                              <Text style={[styles.matrixHeaderText, { textAlign: 'right' }]}>Toplam</Text>
                            </View>
                          </View>

                          {/* Data Rows */}
                          {yearlyData.map((parent, pIdx) => {
                            const parentKey = parent.id || parent.name;
                            const isExpanded = !!expandedParents[parentKey];
                            const hasChildren = parent.subCategories && parent.subCategories.length > 0;

                            return (
                              <View key={parentKey || pIdx} style={styles.matrixParentGroup}>
                                {/* Parent Row */}
                                <TouchableOpacity
                                  activeOpacity={hasChildren ? 0.7 : 1}
                                  onPress={() => hasChildren && toggleParentExpand(parentKey)}
                                  style={styles.matrixParentRow}
                                >
                                  <View style={[styles.matrixCell, styles.matrixNameCol, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                    {hasChildren ? (
                                      <Ionicons
                                        name={isExpanded ? "chevron-down" : "chevron-forward"}
                                        size={14}
                                        color="#0284c7"
                                      />
                                    ) : (
                                      <View style={{ width: 14 }} />
                                    )}
                                    <Text style={styles.matrixParentName} numberOfLines={1}>
                                      {parent.name}
                                    </Text>
                                  </View>

                                  {Array(12).fill(0).map((_, mIdx) => {
                                    const val = parent.months?.[mIdx] || 0;
                                    return (
                                      <View key={mIdx} style={[styles.matrixCell, styles.matrixMonthCol]}>
                                        <Text style={[styles.matrixValueText, val > 0 && styles.matrixParentValText]}>
                                          {val > 0 ? Math.round(val).toLocaleString('tr-TR') : '-'}
                                        </Text>
                                      </View>
                                    );
                                  })}

                                  <View style={[styles.matrixCell, styles.matrixTotalCol]}>
                                    <Text style={styles.matrixParentTotalText}>
                                      {parent.total > 0 ? `₺${Math.round(parent.total).toLocaleString('tr-TR')}` : '-'}
                                    </Text>
                                  </View>
                                </TouchableOpacity>

                                {/* Child Rows */}
                                {isExpanded && hasChildren && parent.subCategories.map((child: any, cIdx: number) => (
                                  <View key={child.id || cIdx} style={styles.matrixChildRow}>
                                    <View style={[styles.matrixCell, styles.matrixNameCol, { paddingLeft: 24 }]}>
                                      <Text style={styles.matrixChildName} numberOfLines={1}>
                                        {child.name}
                                      </Text>
                                    </View>

                                    {Array(12).fill(0).map((_, mIdx) => {
                                      const val = child.months?.[mIdx] || 0;
                                      return (
                                        <View key={mIdx} style={[styles.matrixCell, styles.matrixMonthCol]}>
                                          <Text style={styles.matrixChildValText}>
                                            {val > 0 ? Math.round(val).toLocaleString('tr-TR') : '-'}
                                          </Text>
                                        </View>
                                      );
                                    })}

                                    <View style={[styles.matrixCell, styles.matrixTotalCol]}>
                                      <Text style={styles.matrixChildTotalText}>
                                        {child.total > 0 ? `₺${Math.round(child.total).toLocaleString('tr-TR')}` : '-'}
                                      </Text>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            );
                          })}

                          {/* Grand Total Row */}
                          <View style={styles.matrixGrandTotalRow}>
                            <View style={[styles.matrixCell, styles.matrixNameCol]}>
                              <Text style={styles.matrixGrandTotalLabel}>GENEL TOPLAM</Text>
                            </View>

                            {Array(12).fill(0).map((_, mIdx) => {
                              const monthSum = yearlyMonthTotals.totals[mIdx] || 0;
                              return (
                                <View key={mIdx} style={[styles.matrixCell, styles.matrixMonthCol]}>
                                  <Text style={styles.matrixGrandTotalMonthVal}>
                                    {monthSum > 0 ? Math.round(monthSum).toLocaleString('tr-TR') : '-'}
                                  </Text>
                                </View>
                              );
                            })}

                            <View style={[styles.matrixCell, styles.matrixTotalCol]}>
                              <Text style={styles.matrixGrandTotalVal}>
                                ₺{Math.round(yearlyMonthTotals.totalYearExpense).toLocaleString('tr-TR')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </ScrollView>
                    )}
                  </View>
                </>
              )}
            </>
          )}

          {/* ===================== TAB 4: COMPARISON ===================== */}
          {activeTab === 'COMPARISON' && (
            <>
              {/* Comparison Period Selectors */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="git-compare-outline" size={18} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>Karşılaştırılacak Dönemleri Seçin</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  {/* Period A */}
                  <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6', marginBottom: 6 }}>1. DÖNEM</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <TouchableOpacity
                        onPress={() => {
                          if (compMonthA === 0) { setCompMonthA(11); setCompYearA(y => y - 1); }
                          else { setCompMonthA(m => m - 1); }
                        }}
                        style={styles.compNavBtn}
                      >
                        <Ionicons name="chevron-back" size={16} color="#0f172a" />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
                        {MONTHS_TR[compMonthA].slice(0, 3)} {compYearA}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (compMonthA === 11) { setCompMonthA(0); setCompYearA(y => y + 1); }
                          else { setCompMonthA(m => m + 1); }
                        }}
                        style={styles.compNavBtn}
                      >
                        <Ionicons name="chevron-forward" size={16} color="#0f172a" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Period B */}
                  <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981', marginBottom: 6 }}>2. DÖNEM</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <TouchableOpacity
                        onPress={() => {
                          if (compMonthB === 0) { setCompMonthB(11); setCompYearB(y => y - 1); }
                          else { setCompMonthB(m => m - 1); }
                        }}
                        style={styles.compNavBtn}
                      >
                        <Ionicons name="chevron-back" size={16} color="#0f172a" />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
                        {MONTHS_TR[compMonthB].slice(0, 3)} {compYearB}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (compMonthB === 11) { setCompMonthB(0); setCompYearB(y => y + 1); }
                          else { setCompMonthB(m => m + 1); }
                        }}
                        style={styles.compNavBtn}
                      >
                        <Ionicons name="chevron-forward" size={16} color="#0f172a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Comparative KPIs */}
              <View style={{ gap: 10, marginBottom: 14 }}>
                {/* Gelir Kıyas */}
                <View style={styles.compKpiCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.compKpiTitle}>TOPLAM GELİR</Text>
                    <View style={[styles.pctBadge, { backgroundColor: compDifferences.incDiff >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                      <Ionicons name={compDifferences.incDiff >= 0 ? "trending-up" : "trending-down"} size={12} color={compDifferences.incDiff >= 0 ? '#10b981' : '#f43f5e'} />
                      <Text style={[styles.pctBadgeText, { color: compDifferences.incDiff >= 0 ? '#10b981' : '#f43f5e' }]}>
                        {compDifferences.incDiff >= 0 ? `+${compDifferences.incPct}%` : `${compDifferences.incPct}%`}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={styles.compLabel}>1. Dönem</Text>
                      <Text style={[styles.compAmount, { color: '#64748b' }]}>{formatCurrency(compKpiA.income)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.compLabel}>2. Dönem</Text>
                      <Text style={[styles.compAmount, { color: '#10b981' }]}>{formatCurrency(compKpiB.income)}</Text>
                    </View>
                  </View>
                </View>

                {/* Gider Kıyas */}
                <View style={styles.compKpiCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.compKpiTitle}>TOPLAM GİDER</Text>
                    <View style={[styles.pctBadge, { backgroundColor: compDifferences.expDiff <= 0 ? '#dcfce7' : '#fee2e2' }]}>
                      <Ionicons name={compDifferences.expDiff <= 0 ? "trending-down" : "trending-up"} size={12} color={compDifferences.expDiff <= 0 ? '#10b981' : '#f43f5e'} />
                      <Text style={[styles.pctBadgeText, { color: compDifferences.expDiff <= 0 ? '#10b981' : '#f43f5e' }]}>
                        {compDifferences.expDiff >= 0 ? `+${compDifferences.expPct}%` : `${compDifferences.expPct}%`}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={styles.compLabel}>1. Dönem</Text>
                      <Text style={[styles.compAmount, { color: '#64748b' }]}>{formatCurrency(compKpiA.expense)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.compLabel}>2. Dönem</Text>
                      <Text style={[styles.compAmount, { color: '#ef4444' }]}>{formatCurrency(compKpiB.expense)}</Text>
                    </View>
                  </View>
                </View>

                {/* Net Tasarruf Kıyas */}
                <View style={styles.compKpiCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.compKpiTitle}>NET TASARRUF (GELİR - GİDER)</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: compDifferences.netDiff >= 0 ? '#10b981' : '#f43f5e' }}>
                      Fark: {compDifferences.netDiff >= 0 ? `+${formatCurrency(compDifferences.netDiff)}` : formatCurrency(compDifferences.netDiff)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={styles.compLabel}>1. Dönem</Text>
                      <Text style={[styles.compAmount, { color: compKpiA.netCashFlow >= 0 ? '#10b981' : '#ef4444' }]}>
                        {formatCurrency(compKpiA.netCashFlow)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.compLabel}>2. Dönem</Text>
                      <Text style={[styles.compAmount, { color: compKpiB.netCashFlow >= 0 ? '#10b981' : '#ef4444' }]}>
                        {formatCurrency(compKpiB.netCashFlow)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Category Difference Breakdown */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pie-chart" size={18} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>Kategori Harcama Değişimleri</Text>
                </View>

                {compDifferences.catDiffs.length === 0 ? (
                  <Text style={styles.emptyCardText}>Karşılaştırılacak harcama verisi yok.</Text>
                ) : (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {compDifferences.catDiffs.slice(0, 10).map((cat, idx) => {
                      const isIncrease = cat.diff > 0;
                      return (
                        <View key={idx} style={styles.compCatRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{cat.label}</Text>
                            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              1.D: {formatCurrencyCompact(cat.valA)} → 2.D: {formatCurrencyCompact(cat.valB)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: isIncrease ? '#ef4444' : '#10b981' }}>
                              {isIncrease ? `+${formatCurrencyCompact(cat.diff)}` : formatCurrencyCompact(cat.diff)}
                            </Text>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isIncrease ? '#ef4444' : '#10b981' }}>
                              {isIncrease ? `▲ %${cat.pct}` : `▼ %${cat.pct}`}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
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
    paddingBottom: 16,
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
  guideToggleBtn: { padding: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 60 },

  // Guide
  guideCard: {
    backgroundColor: '#f0fdf4',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  guideText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },

  // Tabs
  tabsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#f3e8ff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#8b5cf6',
    fontWeight: '700',
  },

  // KPIs
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
    color: '#0f172a',
  },
  kpiSubText: {
    fontSize: 10,
    color: '#94a3b8',
  },

  // Sections
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyCardText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 14,
  },

  // Month Navigator
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
  monthTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },

  // Monthly Trend Bar
  monthBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthBarLabel: {
    width: 36,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  barTrack: {
    height: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  barText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1e293b',
    paddingLeft: 6,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },

  // Category list
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  catAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  catProgressTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Merchant List
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  merchantRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  merchantRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  merchantCount: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  merchantAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },

  // Trend Chips
  trendCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  trendCatChipActive: {
    backgroundColor: '#f3e8ff',
    borderColor: '#8b5cf6',
  },
  trendCatText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  trendCatTextActive: {
    color: '#8b5cf6',
    fontWeight: '700',
  },

  // Comparison
  compNavBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compKpiCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  compKpiTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  compLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
  },
  compAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  pctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  pctBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  compCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  // Yearly Matrix Table Styles
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
  },
  matrixHintText: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  tableScroll: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  matrixTable: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1.5,
    borderBottomColor: '#cbd5e1',
  },
  matrixCell: {
    paddingVertical: 9,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  matrixHeaderCell: {
    paddingVertical: 9,
  },
  matrixNameCol: {
    width: 165,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  matrixMonthCol: {
    width: 76,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  matrixTotalCol: {
    width: 95,
    alignItems: 'flex-end',
  },
  matrixHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  matrixParentGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  matrixParentRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },
  matrixParentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  matrixValueText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  matrixParentValText: {
    color: '#059669',
    fontWeight: '700',
  },
  matrixParentTotalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'right',
  },
  matrixChildRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  matrixChildName: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  matrixChildValText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  matrixChildTotalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    textAlign: 'right',
  },
  matrixGrandTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderTopWidth: 2,
    borderTopColor: '#94a3b8',
  },
  matrixGrandTotalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  matrixGrandTotalMonthVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },
  matrixGrandTotalVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#dc2626',
    textAlign: 'right',
  },
});
