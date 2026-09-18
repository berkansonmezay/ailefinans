import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

export const StocksScreen = ({ navigation }: any) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/stocks');
      const dataList = Array.isArray(res) ? res : (res.items || res.data || []);
      setData(dataList);
    } catch (error) {
      console.error('Borsa & Hisse yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number, currency: string = 'TRY') => {
    return `₺${Number(val || 0).toLocaleString('tr-TR')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Borsa & Hisse</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const itemTitle = item.symbol || item.name || 'İsimsiz Hisse';
            const itemSubtitle = item.quantity ? `${item.quantity} Adet` : '0 Adet';
            const itemAmount = item.currentValue || item.price || 0;
            
            return (
              <View style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name="trending-up" size={28} color="#f59e0b" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{itemTitle}</Text>
                  <Text style={styles.cardSubtitle}>{itemSubtitle}</Text>
                </View>
                {itemAmount !== 0 && (
                  <Text style={styles.cardAmount}>
                    {formatCurrency(itemAmount, item.currency)}
                  </Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz bir hisse bulunmuyor.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardIcon: { 
    marginRight: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#64748b' },
  cardAmount: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 32 },
});
