import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

interface Transaction {
  id: string;
  amount: number;
  transactionDate: string;
  description?: string;
  source?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  transactionType: 'INCOME' | 'EXPENSE';
}

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon?: string;
  color?: string;
}

interface AccountTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
  accountId: string;
  accountName: string;
  accountCurrency?: string;
  accountBalance?: number;
  accountType?: string;
  initialTab?: 'history' | 'add';
}

export const AccountTransactionModal = ({
  visible,
  onClose,
  onUpdate,
  accountId,
  accountName,
  accountCurrency = 'TRY',
  accountBalance,
  accountType,
  initialTab = 'history',
}: AccountTransactionModalProps) => {
  const [activeTab, setActiveTab] = useState<'history' | 'add'>(initialTab);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // History Tab Filter
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // Form state
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Format currency according to account currency
  const formatCurrency = useCallback((val: number) => {
    const symbol = accountCurrency === 'USD' ? '$' : accountCurrency === 'EUR' ? '€' : accountCurrency === 'XAU' ? 'gr ' : '₺';
    return `${symbol}${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [accountCurrency]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      resetForm();
    }
  }, [visible, initialTab]);

  // Load transactions when history tab is active
  useEffect(() => {
    if (visible && accountId && activeTab === 'history') {
      loadTransactions();
    }
  }, [visible, accountId, activeTab]);

  // Load categories when txType changes or add tab opens
  useEffect(() => {
    if (visible && activeTab === 'add') {
      loadCategories(txType);
    }
  }, [visible, activeTab, txType]);

  const resetForm = () => {
    setTxType('INCOME');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setSelectedCategoryId(null);
  };

  const loadCategories = async (type: 'INCOME' | 'EXPENSE') => {
    try {
      setLoadingCategories(true);
      const res = await fetchApi<any>(`/categories?type=${type}`);
      const list = Array.isArray(res) ? res : (res.data || res.items || []);
      setCategories(list);
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadTransactions = async (isPullRefresh: boolean = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await fetchApi<any>(`/accounts/${accountId}/transactions`);
      const list = Array.isArray(res) ? res : (res.data || []);
      setTransactions(list);
    } catch (error: any) {
      Alert.alert('Hata', 'İşlem geçmişi yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    Alert.alert(
      'İşlemi Sil',
      'Bu işlemi silmek istediğinize emin misiniz? Hesap bakiyeniz güncellenecektir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const endpoint = tx.transactionType === 'INCOME'
                ? `/incomes/${tx.id}`
                : `/expenses/${tx.id}`;
              await fetchApi(endpoint, { method: 'DELETE' });
              loadTransactions();
              onUpdate();
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'İşlem silinirken hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleSetQuickDate = (type: 'today' | 'yesterday') => {
    const d = new Date();
    if (type === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    setDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin.');
      return;
    }

    try {
      setSubmitting(true);

      const payload: any = {
        amount: parsedAmount,
        transactionDate: new Date(date).toISOString(),
        description: description || (txType === 'INCOME' ? 'Para Girişi' : 'Para Çıkışı'),
        accountId,
        currency: accountCurrency || 'TRY',
      };

      if (selectedCategoryId) {
        payload.categoryId = selectedCategoryId;
      }

      if (txType === 'INCOME') {
        payload.source = description || 'Para Girişi';
        await fetchApi('/incomes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/expenses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      Alert.alert('Başarılı', 'İşlem kaydedildi.');
      onUpdate();
      resetForm();
      setActiveTab('history');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem eklenirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered transactions for history
  const filteredTransactions = useMemo(() => {
    if (historyFilter === 'ALL') return transactions;
    return transactions.filter(t => t.transactionType === historyFilter);
  }, [transactions, historyFilter]);

  // Totals for history
  const historyTotals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
      if (t.transactionType === 'INCOME') totalIncome += (t.amount || 0);
      else totalExpense += (t.amount || 0);
    });
    return { totalIncome, totalExpense };
  }, [transactions]);

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.transactionType === 'INCOME';
    return (
      <View style={styles.txCard}>
        <View style={styles.txLeft}>
          <View style={[styles.txIconContainer, { backgroundColor: isIncome ? '#dcfce7' : '#fee2e2' }]}>
            <Ionicons
              name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={22}
              color={isIncome ? '#10b981' : '#f43f5e'}
            />
          </View>
          <View style={styles.txInfo}>
            <Text style={styles.txDescription} numberOfLines={1}>
              {item.description || item.source || (isIncome ? 'Para Girişi' : 'Para Çıkışı')}
            </Text>
            <View style={styles.txMetaRow}>
              <Text style={styles.txDate}>{formatDate(item.transactionDate)}</Text>
              {item.category?.name && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText} numberOfLines={1}>{item.category.name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: isIncome ? '#10b981' : '#f43f5e' }]}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <TouchableOpacity
            style={styles.txDeleteBtn}
            onPress={() => handleDeleteTransaction(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.title} numberOfLines={1}>{accountName}</Text>
                {accountType && (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {accountType === 'BANK_ACCOUNT' ? 'Banka' :
                       accountType === 'CREDIT_CARD' ? 'Kredi Kartı' :
                       accountType === 'CASH' ? 'Nakit' : accountType}
                    </Text>
                  </View>
                )}
              </View>
              {accountBalance != null && (
                <Text style={styles.subtitle}>
                  Güncel Bakiye: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{formatCurrency(accountBalance)}</Text>
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
            >
              <Ionicons
                name="list"
                size={16}
                color={activeTab === 'history' ? '#3b82f6' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                İşlem Dökümü
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'add' && styles.tabActive]}
              onPress={() => setActiveTab('add')}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={activeTab === 'add' ? '#3b82f6' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
                İşlem Ekle
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === 'history' ? (
            <View style={{ flex: 1 }}>
              {/* History Summary Bar */}
              {transactions.length > 0 && (
                <View style={styles.historySummaryBar}>
                  <View style={styles.historySummaryItem}>
                    <Text style={styles.historySummaryLabel}>Toplam Giriş</Text>
                    <Text style={[styles.historySummaryValue, { color: '#10b981' }]}>
                      +{formatCurrency(historyTotals.totalIncome)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.historySummaryItem}>
                    <Text style={styles.historySummaryLabel}>Toplam Çıkış</Text>
                    <Text style={[styles.historySummaryValue, { color: '#f43f5e' }]}>
                      -{formatCurrency(historyTotals.totalExpense)}
                    </Text>
                  </View>
                </View>
              )}

              {/* History Filter Chips */}
              <View style={styles.historyFilterRow}>
                <TouchableOpacity
                  style={[styles.hFilterChip, historyFilter === 'ALL' && styles.hFilterChipActive]}
                  onPress={() => setHistoryFilter('ALL')}
                >
                  <Text style={[styles.hFilterText, historyFilter === 'ALL' && styles.hFilterTextActive]}>
                    Tümü ({transactions.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.hFilterChip, historyFilter === 'INCOME' && styles.hFilterChipActive]}
                  onPress={() => setHistoryFilter('INCOME')}
                >
                  <View style={[styles.chipDot, { backgroundColor: '#10b981' }]} />
                  <Text style={[styles.hFilterText, historyFilter === 'INCOME' && styles.hFilterTextActive]}>
                    Girişler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.hFilterChip, historyFilter === 'EXPENSE' && styles.hFilterChipActive]}
                  onPress={() => setHistoryFilter('EXPENSE')}
                >
                  <View style={[styles.chipDot, { backgroundColor: '#f43f5e' }]} />
                  <Text style={[styles.hFilterText, historyFilter === 'EXPENSE' && styles.hFilterTextActive]}>
                    Çıkışlar
                  </Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Yükleniyor...</Text>
                </View>
              ) : filteredTransactions.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons name="receipt-outline" size={44} color="#cbd5e1" />
                  <Text style={styles.emptyText}>
                    {historyFilter === 'ALL' ? 'Henüz işlem bulunmuyor.' : 'Bu filtrede işlem yok.'}
                  </Text>
                  {historyFilter === 'ALL' && (
                    <TouchableOpacity
                      style={styles.emptyAddBtn}
                      onPress={() => setActiveTab('add')}
                    >
                      <Ionicons name="add" size={18} color="#3b82f6" />
                      <Text style={styles.emptyAddBtnText}>İlk İşlemi Ekle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <FlatList
                  data={filteredTransactions}
                  keyExtractor={(item) => item.id}
                  renderItem={renderTransactionItem}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => loadTransactions(true)} colors={['#3b82f6']} />
                  }
                />
              )}
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Type Toggle */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    txType === 'INCOME' && styles.toggleBtnIncome,
                  ]}
                  onPress={() => {
                    setTxType('INCOME');
                    setSelectedCategoryId(null);
                  }}
                >
                  <Ionicons
                    name="arrow-down-circle"
                    size={18}
                    color={txType === 'INCOME' ? '#fff' : '#64748b'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.toggleText, txType === 'INCOME' && styles.toggleTextActive]}>
                    Para Girişi
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    txType === 'EXPENSE' && styles.toggleBtnExpense,
                  ]}
                  onPress={() => {
                    setTxType('EXPENSE');
                    setSelectedCategoryId(null);
                  }}
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={18}
                    color={txType === 'EXPENSE' ? '#fff' : '#64748b'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.toggleText, txType === 'EXPENSE' && styles.toggleTextActive]}>
                    Para Çıkışı
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tutar ({accountCurrency}) <Text style={{ color: '#f43f5e' }}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Category Selector */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.label}>Kategori</Text>
                  {loadingCategories && <ActivityIndicator size="small" color="#3b82f6" />}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      selectedCategoryId === null && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategoryId(null)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategoryId === null && styles.categoryChipTextActive,
                      ]}
                    >
                      Genel / Diğer
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipActive,
                        ]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            isSelected && styles.categoryChipTextActive,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Date with quick buttons */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.label}>Tarih <Text style={{ color: '#f43f5e' }}>*</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.quickDateBtn}
                      onPress={() => handleSetQuickDate('today')}
                    >
                      <Text style={styles.quickDateText}>Bugün</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickDateBtn}
                      onPress={() => handleSetQuickDate('yesterday')}
                    >
                      <Text style={styles.quickDateText}>Dün</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-AA-GG (Örn: 2026-09-19)"
                  placeholderTextColor="#94a3b8"
                  value={date}
                  onChangeText={setDate}
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Açıklama</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Maaş, Kira, Fatura, Market..."
                  placeholderTextColor="#94a3b8"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: txType === 'INCOME' ? '#10b981' : '#f43f5e' },
                  submitting && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={txType === 'INCOME' ? 'arrow-down-circle' : 'arrow-up-circle'}
                      size={20}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.submitBtnText}>İşlemi Kaydet</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '55%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  typeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#3b82f6',
  },

  // History Summary Bar
  historySummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historySummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  historySummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  historySummaryValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#cbd5e1',
  },

  // History Filter
  historyFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  hFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 5,
  },
  hFilterChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  hFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  hFilterTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Center / Empty
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 36,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#94a3b8',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  emptyAddBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    gap: 6,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Transaction Card
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txInfo: {
    flex: 1,
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  categoryBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    maxWidth: 100,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
  },
  toggleBtnIncome: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  toggleBtnExpense: {
    backgroundColor: '#f43f5e',
    shadowColor: '#f43f5e',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  toggleText: {
    fontWeight: '600',
    color: '#64748b',
    fontSize: 14,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Form
  inputGroup: {
    marginBottom: 14,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: '#0f172a',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryChipTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  quickDateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
