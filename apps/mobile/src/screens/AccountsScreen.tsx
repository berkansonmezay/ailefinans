import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { AccountActionModal } from '../components/AccountActionModal';
import { AccountTransactionModal } from '../components/AccountTransactionModal';

export const AccountsScreen = ({ navigation }: any) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH'>('ALL');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txModalAccount, setTxModalAccount] = useState<any>(null);
  const [txModalTab, setTxModalTab] = useState<'history' | 'add'>('history');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/accounts?pageSize=100');
      const dataList = Array.isArray(res) ? res : (res.items || res.data || []);
      setData(dataList);
    } catch (error) {
      console.error('Varlık ve Hesaplar yüklenirken hata:', error);
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
    setSelectedAccount(item);
    setModalVisible(true);
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Hesabı Sil',
      `"${item.name}" hesabını tamamen silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Evet, Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await fetchApi(`/accounts/${item.id}`, { method: 'DELETE' });
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

  const stats = useMemo(() => {
    let totalBalance = 0;
    let bankTotal = 0;
    let creditCardTotal = 0;
    let cashTotal = 0;

    data.forEach(acc => {
      const b = acc.currentBalance ?? acc.initialBalance ?? 0;
      totalBalance += b;
      if (acc.type === 'BANK_ACCOUNT' || acc.type === 'INVESTMENT') {
        bankTotal += b;
      } else if (acc.type === 'CREDIT_CARD') {
        creditCardTotal += b;
      } else if (acc.type === 'CASH') {
        cashTotal += b;
      }
    });

    return { totalBalance, bankTotal, creditCardTotal, cashTotal };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(acc => {
      const matchSearch = acc.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          acc.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          acc.institution?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === 'ALL' ? true : acc.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [data, searchQuery, typeFilter]);

  const groupedAccounts = useMemo(() => {
    const groups: { owner: string, accounts: any[], total: number }[] = [];
    
    filteredData.forEach(account => {
      const owner = account.ownerName || 'Ortak / Diğer';
      let group = groups.find(g => g.owner === owner);
      if (!group) {
        group = { owner, accounts: [], total: 0 };
        groups.push(group);
      }
      group.accounts.push(account);
      group.total += (account.currentBalance ?? account.initialBalance ?? 0);
    });

    return groups.sort((a, b) => {
      if (a.owner === 'Ortak / Diğer') return 1;
      if (b.owner === 'Ortak / Diğer') return -1;
      return a.owner.localeCompare(b.owner);
    });
  }, [filteredData]);

  const getIconForType = (type: string) => {
    if (type === 'CREDIT_CARD') return { name: 'card', color: '#f43f5e', bg: '#fff1f2' };
    if (type === 'CASH') return { name: 'wallet', color: '#f59e0b', bg: '#fef3c7' };
    return { name: 'business', color: '#3b82f6', bg: '#eff6ff' };
  };

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>TOPLAM VARLIK</Text>
          <Text style={styles.kpiValue} numberOfLines={1}>{formatCurrency(stats.totalBalance)}</Text>
          <Text style={styles.kpiSubText}>{data.length} aktif hesap</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>BANKA & MEVDUAT</Text>
          <Text style={styles.kpiValue} numberOfLines={1}>{formatCurrency(stats.bankTotal)}</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#f43f5e', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>KREDİ KARTLARI</Text>
          <Text style={[styles.kpiValue, { color: '#f43f5e' }]} numberOfLines={1}>{formatCurrency(stats.creditCardTotal)}</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>NAKİT KASA</Text>
          <Text style={styles.kpiValue} numberOfLines={1}>{formatCurrency(stats.cashTotal)}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Hesap, banka veya kişi ara..."
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
            { id: 'BANK_ACCOUNT', label: 'Banka' },
            { id: 'CREDIT_CARD', label: 'Kredi Kartı' },
            { id: 'CASH', label: 'Nakit' }
          ].map((filter) => (
            <TouchableOpacity 
              key={filter.id}
              style={[styles.filterTab, typeFilter === filter.id && styles.filterTabActive]}
              onPress={() => setTypeFilter(filter.id as any)}
            >
              <Text style={[styles.filterTabText, typeFilter === filter.id && styles.filterTabTextActive]}>
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
        <Text style={styles.headerTitle}>Hesaplarım</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={groupedAccounts}
          keyExtractor={(item, index) => item.owner || String(index)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item: group }) => (
            <View style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="person" size={16} color="#10b981" />
                  <Text style={styles.groupTitle}>{group.owner}</Text>
                </View>
                <Text style={styles.groupTotal}>{formatCurrency(group.total)}</Text>
              </View>

              {group.accounts.map((account) => {
                const isExpanded = !!expandedItems[account.id];
                const balance = account.currentBalance ?? account.initialBalance ?? 0;
                const iconInfo = getIconForType(account.type);
                
                return (
                  <View key={account.id} style={styles.card}>
                    <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(account.id)}>
                      <View style={styles.cardHeaderTop}>
                        <View style={styles.cardHeaderLeft}>
                          <View style={[styles.cardIcon, { backgroundColor: iconInfo.bg }]}>
                            <Ionicons name={iconInfo.name as any} size={24} color={iconInfo.color} />
                          </View>
                          <View style={{ flex: 1, paddingRight: 4 }}>
                            <Text style={styles.cardTitle}>{account.name}</Text>
                            <Text style={styles.cardSubtitle}>{account.institution || 'Banka/Kurum Yok'}</Text>
                          </View>
                        </View>
                        <View style={styles.cardHeaderRight}>
                          <Text style={styles.cardAmount}>{formatCurrency(balance, account.currency)}</Text>
                          <Text style={styles.cardCurrencyLabel}>{account.currency}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Hesap Türü:</Text>
                          <Text style={styles.detailValue}>
                            {account.type === 'BANK_ACCOUNT' ? 'Banka Hesabı' : 
                             account.type === 'CREDIT_CARD' ? 'Kredi Kartı' : 
                             account.type === 'CASH' ? 'Nakit Kasa' : account.type}
                          </Text>
                        </View>
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#dcfce7' }]}
                            onPress={() => {
                              setTxModalAccount(account);
                              setTxModalTab('add');
                              setTxModalVisible(true);
                            }}
                          >
                            <Ionicons name="add-circle-outline" size={16} color="#10b981" />
                            <Text style={[styles.actionBtnText, { color: '#10b981' }]}>İşlem Ekle</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#f0f9ff' }]}
                            onPress={() => {
                              setTxModalAccount(account);
                              setTxModalTab('history');
                              setTxModalVisible(true);
                            }}
                          >
                            <Ionicons name="list-outline" size={16} color="#0ea5e9" />
                            <Text style={[styles.actionBtnText, { color: '#0ea5e9' }]}>İşlem Dökümü</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={[styles.actionRow, { marginTop: 8 }]}>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#eff6ff' }]} onPress={() => handleEdit(account)}>
                            <Ionicons name="create-outline" size={16} color="#3b82f6" />
                            <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Düzenle</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fff1f2' }]} onPress={() => handleDelete(account)}>
                            <Ionicons name="trash-outline" size={16} color="#f43f5e" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Hesap bulunamadı.</Text>
          }
        />
      )}

      {modalVisible && (
        <AccountActionModal 
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={loadData}
          account={selectedAccount}
        />
      )}

      {txModalVisible && txModalAccount && (
        <AccountTransactionModal
          visible={txModalVisible}
          onClose={() => {
            setTxModalVisible(false);
            setTxModalAccount(null);
          }}
          onUpdate={loadData}
          accountId={txModalAccount.id}
          accountName={txModalAccount.name}
          accountCurrency={txModalAccount.currency || 'TRY'}
          accountBalance={txModalAccount.currentBalance ?? txModalAccount.initialBalance ?? 0}
          accountType={txModalAccount.type}
          initialTab={txModalTab}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          setSelectedAccount(null);
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
    marginBottom: 2,
    color: '#0f172a'
  },
  kpiSubText: {
    fontSize: 11,
    color: '#94a3b8',
  },

  searchContainer: { flexDirection: 'row', marginBottom: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 15, color: '#0f172a' },

  filterTabs: { flexDirection: 'row', marginBottom: 16 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterTabActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  filterTabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterTabTextActive: { color: '#3b82f6' },

  groupContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b'
  },
  groupTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b'
  },

  card: {
    backgroundColor: '#fff',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#64748b' },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  cardAmount: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  cardCurrencyLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  
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
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 99,
  },
});
