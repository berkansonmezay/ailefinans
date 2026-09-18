import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const mockKpis = {
  totalIncome: 125000,
  totalExpense: 45000,
  netCashFlow: 80000,
  totalDebt: 15000,
};

const mockAssets = {
  accounts: 85000,
  stocks: 42500,
  crypto: 12000,
  gold: 35000,
};

const barData = {
  labels: ["Oca", "Şub", "Mar", "Nis", "May", "Haz"],
  datasets: [
    {
      data: [20, 45, 28, 80, 99, 43], // Income
      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    },
    {
      data: [15, 30, 20, 45, 30, 25], // Expense
      color: (opacity = 1) => `rgba(244, 63, 94, ${opacity})`,
    }
  ],
};

const pieData = [
  { name: 'Kira', value: 15000, color: '#3b82f6', legendFontColor: '#475569', legendFontSize: 12 },
  { name: 'Market', value: 8000, color: '#10b981', legendFontColor: '#475569', legendFontSize: 12 },
  { name: 'Fatura', value: 3500, color: '#f59e0b', legendFontColor: '#475569', legendFontSize: 12 },
  { name: 'Eğlence', value: 5000, color: '#8b5cf6', legendFontColor: '#475569', legendFontSize: 12 },
];

const formatCurrency = (val: number) => {
  return `₺${val.toLocaleString('tr-TR')}`;
};

export const OverviewScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kontrol Paneli</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Finansal Özet</Text>
          <Text style={styles.sectionSubtitle}>Aylık nakit akışı ve durumunuz.</Text>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          {/* Income */}
          <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
            <View style={styles.kpiIconWrapper}>
              <Ionicons name="arrow-up-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.kpiLabel}>TOPLAM GELİR</Text>
            <Text style={styles.kpiValue}>{formatCurrency(mockKpis.totalIncome)}</Text>
          </View>
          {/* Expense */}
          <View style={[styles.kpiCard, { borderLeftColor: '#f43f5e', borderLeftWidth: 4 }]}>
            <View style={styles.kpiIconWrapper}>
              <Ionicons name="arrow-down-outline" size={20} color="#f43f5e" />
            </View>
            <Text style={styles.kpiLabel}>TOPLAM GİDER</Text>
            <Text style={styles.kpiValue}>{formatCurrency(mockKpis.totalExpense)}</Text>
          </View>
          {/* Net Flow */}
          <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
            <View style={styles.kpiIconWrapper}>
              <Ionicons name="wallet-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.kpiLabel}>NET NAKİT AKIŞI</Text>
            <Text style={[styles.kpiValue, { color: '#3b82f6' }]}>{formatCurrency(mockKpis.netCashFlow)}</Text>
          </View>
          {/* Debt */}
          <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
            <View style={styles.kpiIconWrapper}>
              <Ionicons name="card-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.kpiLabel}>TOPLAM BORÇ</Text>
            <Text style={styles.kpiValue}>{formatCurrency(mockKpis.totalDebt)}</Text>
          </View>
        </View>

        {/* Charts */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Aylık Gelir & Gider Analizi</Text>
          <BarChart
            data={barData}
            width={width - 64} // padding adjustment
            height={220}
            yAxisLabel="₺"
            yAxisSuffix="k"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              style: { borderRadius: 16 },
            }}
            style={{ marginVertical: 8, borderRadius: 16 }}
            withInnerLines={true}
            showBarTops={false}
          />
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Gider Dağılımı</Text>
          <PieChart
            data={pieData}
            width={width - 32}
            height={200}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor={"value"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            center={[10, 0]}
            absolute
          />
        </View>

        {/* Asset Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Varlık & Portföy Durumu</Text>
        </View>

        <View style={styles.assetList}>
          <View style={styles.assetCard}>
            <View style={[styles.assetIcon, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="business-outline" size={24} color="#10b981" />
            </View>
            <View style={styles.assetInfo}>
              <Text style={styles.assetTitle}>HESAPLARIM</Text>
              <Text style={styles.assetValue}>{formatCurrency(mockAssets.accounts)}</Text>
            </View>
          </View>

          <View style={styles.assetCard}>
            <View style={[styles.assetIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="trending-up-outline" size={24} color="#3b82f6" />
            </View>
            <View style={styles.assetInfo}>
              <Text style={styles.assetTitle}>HİSSE SENETLERİM</Text>
              <Text style={styles.assetValue}>{formatCurrency(mockAssets.stocks)}</Text>
            </View>
          </View>

          <View style={styles.assetCard}>
            <View style={[styles.assetIcon, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="logo-bitcoin" size={24} color="#8b5cf6" />
            </View>
            <View style={styles.assetInfo}>
              <Text style={styles.assetTitle}>KRİPTO VARLIKLAR</Text>
              <Text style={styles.assetValue}>{formatCurrency(mockAssets.crypto)}</Text>
            </View>
          </View>

          <View style={styles.assetCard}>
            <View style={[styles.assetIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="cash-outline" size={24} color="#f59e0b" />
            </View>
            <View style={styles.assetInfo}>
              <Text style={styles.assetTitle}>ALTIN & DÖVİZ</Text>
              <Text style={styles.assetValue}>{formatCurrency(mockAssets.gold)}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionHeader: { marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  kpiCard: {
    width: (width - 32 - 12) / 2,
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
  kpiIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
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
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
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
