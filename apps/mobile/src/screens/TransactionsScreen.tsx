import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Switch, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

const { width } = Dimensions.get('window');

export const TransactionsScreen = ({ navigation }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVade, setFilterVade] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('Tümü');
  const [filterMerchantId, setFilterMerchantId] = useState('Tümü');

  // Form State
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Installments
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('2');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expRes, incRes, catRes, accRes, merRes] = await Promise.all([
        fetchApi<any>('/expenses').catch(() => []),
        fetchApi<any>('/incomes').catch(() => []),
        fetchApi<any>('/categories').catch(() => []),
        fetchApi<any>('/accounts').catch(() => []),
        fetchApi<any>('/merchants').catch(() => []),
      ]);

      const expArray = Array.isArray(expRes) ? expRes : (expRes.items || expRes.data || []);
      const incArray = Array.isArray(incRes) ? incRes : (incRes.items || incRes.data || []);
      const catArray = Array.isArray(catRes) ? catRes : (catRes.items || catRes.data || []);
      const accArray = Array.isArray(accRes) ? accRes : (accRes.items || accRes.data || []);
      const merArray = Array.isArray(merRes) ? merRes : (merRes.items || merRes.data || []);

      setCategories(catArray);
      setAccounts(accArray);
      setMerchants(merArray);

      const expList = expArray.map((t: any) => ({ ...t, type: 'EXPENSE' }));
      const incList = incArray.map((t: any) => ({ ...t, type: 'INCOME' }));
      
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const allTx = [...expList, ...incList]
        .filter(tx => new Date(tx.transactionDate || tx.date).getTime() <= todayEnd.getTime())
        .sort((a, b) => new Date(b.transactionDate || b.date).getTime() - new Date(a.transactionDate || a.date).getTime());

      const populatedTx = allTx.map((tx: any) => ({
        ...tx,
        category: catArray.find((c: any) => c.id === tx.categoryId),
        merchant: merArray.find((m: any) => m.id === tx.merchantId) || accArray.find((a: any) => a.id === (tx.accountId || tx.merchantId)),
      }));

      setTransactions(populatedTx);
    } catch (error) {
      console.error('Veri yükleme hatası', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(modalVisible) {
      setAmount('');
      setDescription('');
      setCategoryId('');
      setMerchantId('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsInstallment(false);
      setInstallmentCount('2');
      setFirstInstallmentDate(new Date().toISOString().split('T')[0]);
    }
  }, [modalVisible]);

  useEffect(() => {
    loadData();
  }, []);

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(tx => {
      // Search
      if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        const descMatch = tx.description?.toLowerCase().includes(lowerQ);
        const catMatch = tx.category?.name?.toLowerCase().includes(lowerQ);
        const merMatch = tx.merchant?.name?.toLowerCase().includes(lowerQ);
        const typeMatch = (tx.type === 'INCOME' ? 'gelir' : 'gider').includes(lowerQ);
        if (!descMatch && !catMatch && !merMatch && !typeMatch) return false;
      }

      // Category
      if (filterCategoryId !== 'Tümü' && tx.categoryId !== filterCategoryId) {
        return false;
      }

      // Merchant/Account
      if (filterMerchantId !== 'Tümü') {
        const txAcc = tx.accountId || tx.merchantId || tx.merchant?.id;
        if (txAcc !== filterMerchantId) return false;
      }

      // Vade (Date)
      if (filterVade) {
        const txTime = new Date(tx.transactionDate || tx.date).getTime();
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (filterVade === 'Bugün' && (txTime < startOfToday || txTime >= startOfToday + oneDayMs)) return false;
        if (filterVade === 'Bu Hafta' && txTime < startOfToday - (today.getDay() * oneDayMs)) return false;
        if (filterVade === 'Bu Ay' && (new Date(txTime).getMonth() !== today.getMonth() || new Date(txTime).getFullYear() !== today.getFullYear())) return false;
        if (filterVade === 'Geçen Ay') {
          const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
          const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
          if (new Date(txTime).getMonth() !== lastMonth || new Date(txTime).getFullYear() !== lastMonthYear) return false;
        }
        if (filterVade === '15 Gün' && txTime < startOfToday - (15 * oneDayMs)) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, filterCategoryId, filterMerchantId, filterVade]);

  const totals = React.useMemo(() => {
    let income = 0;
    let expense = 0;
    
    filteredTransactions.forEach(tx => {
      if (tx.type === 'INCOME') {
        income += Number(tx.amount || 0);
      } else {
        expense += Number(tx.amount || 0);
      }
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [filteredTransactions]);

  const parseAmountValue = (val: any) => {
    if (val === undefined || val === null || val === '') return NaN;
    if (typeof val === 'number') return val;
    const normalized = String(val).replace(/s/g, '').replace(',', '.');
    return parseFloat(normalized);
  };

  const handleSubmit = async () => {
    const parsedAmount = parseAmountValue(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Lütfen geçerli bir tutar girin');
      return;
    }

    if (type === 'EXPENSE') {
      if (!merchantId) {
        alert('Kayıt tamamlanamaz: Lütfen Harcama Yeri / Hesap seçiniz.');
        return;
      }
      if (!categoryId) {
        alert('Kayıt tamamlanamaz: Lütfen bir Harcama Kategorisi seçiniz.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const isMerchant = merchants.some(m => m.id === merchantId);
      const isAccount = accounts.some(a => a.id === merchantId);
      
      let payloads: any[] = [];
      const generateInstallmentsId = () => Math.random().toString(36).substring(2, 15);
      
      if (isInstallment && type === 'EXPENSE') {
        const count = parseInt(installmentCount);
        if (isNaN(count) || count < 2) throw new Error('Geçersiz taksit sayısı');
        
        const installmentAmount = parsedAmount / count;
        const planId = generateInstallmentsId();
        
        for (let i = 0; i < count; i++) {
          const installmentDate = new Date(firstInstallmentDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);
          
          payloads.push({
            amount: installmentAmount,
            categoryId: categoryId || null,
            transactionDate: installmentDate.toISOString(),
            description: description ? `${description} (${i+1}. Taksit / ${count})` : `Taksit ${i+1}/${count}`,
            _planId: planId,
          });
        }
      } else {
        payloads.push({
          amount: parsedAmount,
          categoryId: categoryId || null,
          transactionDate: new Date(date).toISOString(),
          description: description || null,
        });
      }

      if (type === 'EXPENSE') {
        if (isInstallment) {
          const count = parseInt(installmentCount);
          await fetchApi('/debts', {
            method: 'POST',
            body: JSON.stringify({
              creditor: description || 'Taksitli Gider',
              description: description || 'Taksitli Gider',
              principalAmount: parsedAmount,
              totalAmount: parsedAmount,
              installmentCount: count,
              installmentAmount: parsedAmount / count,
              firstPaymentDate: new Date(firstInstallmentDate).toISOString(),
              startDate: new Date().toISOString(),
              categoryId: categoryId || null,
              accountId: isAccount ? merchantId : null,
              merchantId: isMerchant ? merchantId : null,
              currency: 'TRY'
            })
          });
        } else {
          for (const payload of payloads) {
            const { _planId, ...rest } = payload;
            const finalPayload = { ...rest, merchantId: isMerchant ? merchantId : null, accountId: isAccount ? merchantId : null };
            await fetchApi('/expenses', { method: 'POST', body: JSON.stringify(finalPayload) });
          }
        }
      } else {
        const selectedMerchant = merchants.find(m => m.id === merchantId);
        const selectedAccount = accounts.find(a => a.id === merchantId);
        for (const payload of payloads) {
          const { _planId, ...rest } = payload;
          const finalPayload = { ...rest, source: selectedMerchant?.name || selectedAccount?.name || description || 'Gelir', parentId: isAccount ? merchantId : null };
          await fetchApi('/incomes', { method: 'POST', body: JSON.stringify(finalPayload) });
        }
      }

      setModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Kaydetme hatası', error);
      alert('Kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => `₺${Number(val).toLocaleString('tr-TR')}`;
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İşlemler</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={styles.kpiGrid}>
          {/* TOPLAM GELİR */}
          <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>TOPLAM GELİR</Text>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>{formatCurrency(totals.income)}</Text>
          </View>
          
          {/* TOPLAM GİDER */}
          <View style={[styles.kpiCard, { borderLeftColor: '#f43f5e', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>TOPLAM GİDER</Text>
            <Text style={[styles.kpiValue, { color: '#f43f5e' }]}>{formatCurrency(totals.expense)}</Text>
          </View>
          
          {/* NET BAKİYE */}
          <View style={[styles.kpiCard, { borderLeftColor: totals.balance >= 0 ? '#3b82f6' : '#64748b', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>NET BAKİYE</Text>
            <Text style={[styles.kpiValue, { color: totals.balance >= 0 ? '#3b82f6' : '#64748b' }]}>{formatCurrency(totals.balance)}</Text>
          </View>
          
          {/* İŞLEM SAYISI */}
          <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>İŞLEM SAYISI</Text>
            <Text style={[styles.kpiValue, { color: '#8b5cf6' }]}>{filteredTransactions.length} Adet</Text>
          </View>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="İşlem ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, (filterVade || filterCategoryId !== 'Tümü' || filterMerchantId !== 'Tümü') && styles.filterButtonActive]} 
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color={(filterVade || filterCategoryId !== 'Tümü' || filterMerchantId !== 'Tümü') ? '#fff' : '#64748b'} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons 
                  name={item.type === 'INCOME' ? "arrow-down-circle" : "arrow-up-circle"} 
                  size={32} 
                  color={item.type === 'INCOME' ? "#10b981" : "#f43f5e"} 
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.description || 'İşimsiz İşlem'}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.category?.name || 'Kategorisiz'} • {formatDate(item.transactionDate || item.date)}
                </Text>
              </View>
              <Text style={[styles.cardAmount, { color: item.type === 'INCOME' ? '#10b981' : '#f43f5e' }]}>
                {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz bir işlem bulunmuyor.</Text>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* New Transaction Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni İşlem</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
                        <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Toggle */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, type === 'EXPENSE' && styles.toggleBtnActiveExp]}
                  onPress={() => setType('EXPENSE')}
                >
                  <Text style={[styles.toggleText, type === 'EXPENSE' && styles.toggleTextActive]}>Gider</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, type === 'INCOME' && styles.toggleBtnActiveInc]}
                  onPress={() => setType('INCOME')}
                >
                  <Text style={[styles.toggleText, type === 'INCOME' && styles.toggleTextActive]}>Gelir</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Tutar (₺)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                placeholder="0.00" 
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.inputLabel}>Tarih</Text>
              <TextInput 
                style={styles.input} 
                placeholder="YYYY-AA-GG (Örn: 2026-09-18)" 
                value={date}
                onChangeText={setDate}
              />

              <Text style={styles.inputLabel}>Harcama Yeri</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, flexGrow: 0 }}>
                {merchants.map(m => (
                  <TouchableOpacity 
                    key={m.id} 
                    style={[styles.catChip, merchantId === m.id && styles.catChipActive, { marginRight: 8 }]}
                    onPress={() => setMerchantId(m.id)}
                  >
                    <Text style={[styles.catChipText, merchantId === m.id && styles.catChipTextActive]}>🏪 {m.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Açıklama</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Market, Maaş vb." 
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.inputLabel}>Kategori</Text>
              <View style={styles.catGrid}>
                {categories.filter(c => c.type === type).slice(0,10).map(c => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {type === 'EXPENSE' && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Taksitli mi?</Text>
                    <Switch value={isInstallment} onValueChange={setIsInstallment} />
                  </View>

                  {isInstallment && (
                    <>
                      <Text style={styles.inputLabel}>Taksit Sayısı</Text>
                      <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        placeholder="Örn: 3" 
                        value={installmentCount}
                        onChangeText={setInstallmentCount}
                      />
                      <Text style={styles.inputLabel}>İlk Taksit Tarihi</Text>
                      <TextInput 
                        style={styles.input} 
                        placeholder="YYYY-AA-GG" 
                        value={firstInstallmentDate}
                        onChangeText={setFirstInstallmentDate}
                      />
                    </>
                  )}
                </>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtreler</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>VADE</Text>
              <View style={styles.catGrid}>
                {['Bugün', 'Bu Hafta', '15 Gün', 'Bu Ay', 'Geçen Ay', 'Geçmiş'].map(vade => (
                  <TouchableOpacity 
                    key={vade} 
                    style={[styles.catChip, filterVade === vade && styles.catChipActive]}
                    onPress={() => setFilterVade(vade === filterVade ? '' : vade)}
                  >
                    <Text style={[styles.catChipText, filterVade === vade && styles.catChipTextActive]}>{vade}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>KATEGORİ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, flexGrow: 0 }}>
                <TouchableOpacity 
                  style={[styles.catChip, filterCategoryId === 'Tümü' && styles.catChipActive, { marginRight: 8 }]}
                  onPress={() => setFilterCategoryId('Tümü')}
                >
                  <Text style={[styles.catChipText, filterCategoryId === 'Tümü' && styles.catChipTextActive]}>Tümü</Text>
                </TouchableOpacity>
                {categories.map(c => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.catChip, filterCategoryId === c.id && styles.catChipActive, { marginRight: 8 }]}
                    onPress={() => setFilterCategoryId(c.id)}
                  >
                    <Text style={[styles.catChipText, filterCategoryId === c.id && styles.catChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>HARCAMA YERİ / HESAP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32, flexGrow: 0 }}>
                <TouchableOpacity 
                  style={[styles.catChip, filterMerchantId === 'Tümü' && styles.catChipActive, { marginRight: 8 }]}
                  onPress={() => setFilterMerchantId('Tümü')}
                >
                  <Text style={[styles.catChipText, filterMerchantId === 'Tümü' && styles.catChipTextActive]}>Tümü</Text>
                </TouchableOpacity>
                {merchants.map(m => (
                  <TouchableOpacity 
                    key={m.id} 
                    style={[styles.catChip, filterMerchantId === m.id && styles.catChipActive, { marginRight: 8 }]}
                    onPress={() => setFilterMerchantId(m.id)}
                  >
                    <Text style={[styles.catChipText, filterMerchantId === m.id && styles.catChipTextActive]}>🏪 {m.name}</Text>
                  </TouchableOpacity>
                ))}
                {accounts.map(a => (
                  <TouchableOpacity 
                    key={a.id} 
                    style={[styles.catChip, filterMerchantId === a.id && styles.catChipActive, { marginRight: 8 }]}
                    onPress={() => setFilterMerchantId(a.id)}
                  >
                    <Text style={[styles.catChipText, filterMerchantId === a.id && styles.catChipTextActive]}>🏦 {a.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                  style={[styles.submitBtn, { flex: 1, backgroundColor: '#f1f5f9' }]} 
                  onPress={() => {
                    setFilterVade('');
                    setFilterCategoryId('Tümü');
                    setFilterMerchantId('Tümü');
                  }}
                >
                  <Text style={[styles.submitBtnText, { color: '#64748b' }]}>Temizle</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.submitBtn, { flex: 2 }]} 
                  onPress={() => setIsFilterModalVisible(false)}
                >
                  <Text style={styles.submitBtnText}>Uygula</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    color: '#1e293b',
  },

  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#0f172a',
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 100 },
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
  cardIcon: { marginRight: 16 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#64748b' },
  cardAmount: { fontSize: 16, fontWeight: '800' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 32 },
  
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActiveExp: { backgroundColor: '#f43f5e', shadowColor: '#f43f5e', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset:{width:0,height:2} },
  toggleBtnActiveInc: { backgroundColor: '#10b981', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset:{width:0,height:2} },
  toggleText: { fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#fff' },

  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    color: '#0f172a',
  },
  
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catChipActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#818cf8',
  },
  catChipText: { color: '#475569', fontWeight: '500', fontSize: 13 },
  catChipTextActive: { color: '#4f46e5', fontWeight: '700' },

  submitBtn: {
    backgroundColor: '#6366f1',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
