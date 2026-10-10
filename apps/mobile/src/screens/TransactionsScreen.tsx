import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, 
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Dimensions, StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const TransactionsScreen = ({ navigation, route }: any) => {
  const { isDark, colors } = useTheme();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const { overlayKeyboardStyle, maxContentHeight } = useModalKeyboard();

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

  // Handle route params when navigating from Dashboard (e.g. Gelir Ekle / Gider Ekle)
  useEffect(() => {
    if (route?.params?.openModal) {
      setEditingTx(null);
      setAmount('');
      setDescription('');
      setCategoryId('');
      setMerchantId('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsInstallment(false);
      setInstallmentCount('2');
      setFirstInstallmentDate(new Date().toISOString().split('T')[0]);
      setHasSubmitted(false);
      if (route.params.initialType === 'INCOME') {
        setType('INCOME');
      } else if (route.params.initialType === 'EXPENSE') {
        setType('EXPENSE');
      }
      setModalVisible(true);
      navigation.setParams({ openModal: undefined, initialType: undefined });
    }
  }, [route?.params]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expRes, incRes, catRes, merRes] = await Promise.all([
        fetchApi<any>('/expenses').catch(() => []),
        fetchApi<any>('/incomes').catch(() => []),
        fetchApi<any>('/categories').catch(() => []),
        fetchApi<any>('/merchants').catch(() => []),
      ]);

      const expArray = Array.isArray(expRes) ? expRes : (expRes.items || expRes.data || []);
      const incArray = Array.isArray(incRes) ? incRes : (incRes.items || incRes.data || []);
      const catArray = Array.isArray(catRes) ? catRes : (catRes.items || catRes.data || []);
      const merArray = Array.isArray(merRes) ? merRes : (merRes.items || merRes.data || []);

      setCategories(catArray);
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
        merchant: merArray.find((m: any) => m.id === tx.merchantId) || (tx.source ? { name: tx.source } : null),
      }));

      setTransactions(populatedTx);
    } catch (error) {
      console.error('Veri yükleme hatası', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTx(null);
    setHasSubmitted(false);
    setIsInstallment(false);
  };

  const handleTransactionPress = (tx: any) => {
    setSelectedTx(tx);
    setActionModalVisible(true);
  };

  const handleOpenEdit = (tx: any) => {
    setActionModalVisible(false);
    setEditingTx(tx);
    setType(tx.type);
    setAmount(String(tx.amount || ''));
    setDescription(tx.description || '');
    setCategoryId(tx.categoryId || tx.category?.id || '');

    const matchedMerchant = merchants.find(
      (m: any) => m.id === tx.merchantId || m.name === tx.source || m.name === tx.merchant?.name
    );
    setMerchantId(tx.merchantId || matchedMerchant?.id || '');

    const rawDate = tx.transactionDate || tx.date;
    try {
      setDate(rawDate ? new Date(rawDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    } catch {
      setDate(new Date().toISOString().split('T')[0]);
    }

    setIsInstallment(false);
    setHasSubmitted(false);
    setModalVisible(true);
  };

  const handleDeleteTransaction = (tx: any) => {
    if (!tx) return;
    Alert.alert(
      'İşlemi Sil',
      'Bu işlemi silmek istediğinize emin misiniz? Bütçe ve hesap bakiyeniz güncellenecektir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const endpoint = tx.type === 'EXPENSE' ? `/expenses/${tx.id}` : `/incomes/${tx.id}`;
              await fetchApi(endpoint, { method: 'DELETE' });
              setActionModalVisible(false);
              if (modalVisible) setModalVisible(false);
              setEditingTx(null);
              await loadData();
              Alert.alert('Başarılı', 'İşlem silindi.');
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'İşlem silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (modalVisible && !editingTx) {
      setAmount('');
      setDescription('');
      setCategoryId('');
      setMerchantId('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsInstallment(false);
      setInstallmentCount('2');
      setFirstInstallmentDate(new Date().toISOString().split('T')[0]);
      setHasSubmitted(false);
    }
  }, [modalVisible, editingTx]);

  useEffect(() => {
    loadData();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  const selectedMerchant = useMemo(() => {
    return merchants.find(m => m.id === merchantId);
  }, [merchants, merchantId]);

  const selectedCategory = useMemo(() => {
    return filteredCategories.find(c => c.id === categoryId);
  }, [filteredCategories, categoryId]);

  const filteredTransactions = useMemo(() => {
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

      // Merchant
      if (filterMerchantId !== 'Tümü') {
        const txMerId = tx.merchantId || tx.merchant?.id;
        if (txMerId !== filterMerchantId) return false;
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

  const totals = useMemo(() => {
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
    const normalized = String(val).replace(/\s/g, '').replace(',', '.');
    return parseFloat(normalized);
  };

  const isExpense = type === 'EXPENSE';
  const themeColor = isExpense ? '#e53e3e' : '#10b981';

  const handleSubmit = async () => {
    setHasSubmitted(true);
    const parsedAmount = parseAmountValue(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Lütfen geçerli bir tutar girin');
      return;
    }

    if (!merchantId) {
      alert(isExpense 
        ? 'Kayıt tamamlanamaz: Lütfen Harcama Yeri seçiniz.' 
        : 'Kayıt tamamlanamaz: Lütfen Gelir Kaynağı seçiniz.');
      return;
    }
    if (!categoryId) {
      alert(isExpense 
        ? 'Kayıt tamamlanamaz: Lütfen bir Harcama Kategorisi seçiniz.' 
        : 'Kayıt tamamlanamaz: Lütfen bir Gelir Kategorisi seçiniz.');
      return;
    }

    try {
      setIsSubmitting(true);
      const isMerchant = merchants.some(m => m.id === merchantId);
      
      let payloads: any[] = [];
      const generateInstallmentsId = () => Math.random().toString(36).substring(2, 15);
      
      if (isInstallment && !editingTx) {
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
            description: description 
              ? `${description} (${i+1}. Taksit / ${count})` 
              : (isExpense ? `Taksitli Gider (${i+1}/${count})` : `Taksitli Gelir (${i+1}/${count})`),
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

      if (editingTx) {
        if (isExpense) {
          const finalPayload = {
            amount: parsedAmount,
            categoryId: categoryId || null,
            transactionDate: new Date(date).toISOString(),
            description: description || null,
            merchantId: isMerchant ? merchantId : null,
          };
          if (editingTx.type === 'EXPENSE') {
            await fetchApi(`/expenses/${editingTx.id}`, { method: 'PUT', body: JSON.stringify(finalPayload) });
          } else {
            await fetchApi(`/incomes/${editingTx.id}`, { method: 'DELETE' });
            await fetchApi('/expenses', { method: 'POST', body: JSON.stringify(finalPayload) });
          }
        } else {
          const selectedM = merchants.find(m => m.id === merchantId);
          const finalPayload = {
            amount: parsedAmount,
            categoryId: categoryId || null,
            transactionDate: new Date(date).toISOString(),
            description: description || null,
            source: selectedM?.name || description || 'Gelir',
            merchantId: isMerchant ? merchantId : null,
          };
          if (editingTx.type === 'INCOME') {
            await fetchApi(`/incomes/${editingTx.id}`, { method: 'PUT', body: JSON.stringify(finalPayload) });
          } else {
            await fetchApi(`/expenses/${editingTx.id}`, { method: 'DELETE' });
            await fetchApi('/incomes', { method: 'POST', body: JSON.stringify(finalPayload) });
          }
        }

        closeModal();
        await loadData();
        Alert.alert('Başarılı', 'İşlem başarıyla güncellendi.');
        return;
      }

      if (isExpense) {
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
              merchantId: isMerchant ? merchantId : null,
              currency: 'TRY'
            })
          });
        } else {
          for (const payload of payloads) {
            const { _planId, ...rest } = payload;
            const finalPayload = { ...rest, merchantId: isMerchant ? merchantId : null };
            await fetchApi('/expenses', { method: 'POST', body: JSON.stringify(finalPayload) });
          }
        }
      } else {
        const selectedM = merchants.find(m => m.id === merchantId);
        for (const payload of payloads) {
          const { _planId, ...rest } = payload;
          const finalPayload = { 
            ...rest, 
            source: selectedM?.name || description || 'Gelir', 
            parentId: _planId || null 
          };
          await fetchApi('/incomes', { method: 'POST', body: JSON.stringify(finalPayload) });
        }
      }

      closeModal();
      await loadData();
      const successMsg = isInstallment
        ? (isExpense ? 'Taksitli gider başarıyla eklendi.' : 'Taksitli gelir başarıyla eklendi.')
        : (isExpense ? 'Gider başarıyla eklendi.' : 'Gelir başarıyla eklendi.');
      Alert.alert('Başarılı', successMsg);
    } catch (error) {
      console.error('Kaydetme hatası', error);
      Alert.alert('Hata', 'Kaydedilirken bir hata oluştu.');
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>İşlemler</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={styles.kpiGrid}>
          {/* TOPLAM GELİR */}
          <View style={[styles.kpiCard, { backgroundColor: colors.bgCard, borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>TOPLAM GELİR</Text>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>{formatCurrency(totals.income)}</Text>
          </View>
          
          {/* TOPLAM GİDER */}
          <View style={[styles.kpiCard, { backgroundColor: colors.bgCard, borderLeftColor: '#f43f5e', borderLeftWidth: 4 }]}>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>TOPLAM GİDER</Text>
            <Text style={[styles.kpiValue, { color: '#f43f5e' }]}>{formatCurrency(totals.expense)}</Text>
          </View>
          
          {/* NET BAKİYE */}
          <View style={[styles.kpiCard, { backgroundColor: colors.bgCard, borderLeftColor: totals.balance >= 0 ? '#3b82f6' : '#64748b', borderLeftWidth: 4 }]}>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>NET BAKİYE</Text>
            <Text style={[styles.kpiValue, { color: totals.balance >= 0 ? '#3b82f6' : colors.textMuted }]}>{formatCurrency(totals.balance)}</Text>
          </View>
          
          {/* İŞLEM SAYISI */}
          <View style={[styles.kpiCard, { backgroundColor: colors.bgCard, borderLeftColor: '#8b5cf6', borderLeftWidth: 4 }]}>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>İŞLEM SAYISI</Text>
            <Text style={[styles.kpiValue, { color: '#8b5cf6' }]}>{filteredTransactions.length} Adet</Text>
          </View>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="İşlem ara..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: colors.bgCard, borderColor: colors.border }, (filterVade || filterCategoryId !== 'Tümü' || filterMerchantId !== 'Tümü') && styles.filterButtonActive]} 
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color={(filterVade || filterCategoryId !== 'Tümü' || filterMerchantId !== 'Tümü') ? '#fff' : colors.textMuted} />
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
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
              onPress={() => handleTransactionPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardIcon}>
                <Ionicons 
                  name={item.type === 'INCOME' ? "arrow-down-circle" : "arrow-up-circle"} 
                  size={32} 
                  color={item.type === 'INCOME' ? "#10b981" : "#f43f5e"} 
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.description || 'İsimsiz İşlem'}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  {item.category?.name || 'Kategorisiz'} • {item.merchant?.name ? `${item.merchant.name} • ` : ''}{formatDate(item.transactionDate || item.date)}
                </Text>
              </View>
              <View style={styles.cardAmountContainer}>
                <Text style={[styles.cardAmount, { color: item.type === 'INCOME' ? '#10b981' : '#f43f5e' }]}>
                  {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={isDark ? '#475569' : '#cbd5e1'} style={{ marginTop: 2 }} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz bir işlem bulunmuyor.</Text>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          setEditingTx(null);
          setType('EXPENSE');
          setAmount('');
          setDescription('');
          setCategoryId('');
          setMerchantId('');
          setDate(new Date().toISOString().split('T')[0]);
          setIsInstallment(false);
          setHasSubmitted(false);
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* New / Edit Transaction Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, overlayKeyboardStyle]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalContent, { maxHeight: maxContentHeight, backgroundColor: colors.bgCard }]}
          >
            {/* Dynamic Colored Header */}
            <View style={[styles.modalHeaderThemed, { backgroundColor: themeColor }]}>
              <View style={styles.modalHeaderTop}>
                <Text style={styles.modalTitleWhite}>{editingTx ? 'İşlemi Düzenle' : 'Hızlı İşlem Ekle'}</Text>
                <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Type Switcher (Gider / Gelir) */}
              <View style={styles.tabContainerThemed}>
                <TouchableOpacity 
                  style={[styles.tabButtonThemed, isExpense && styles.tabButtonThemedActive]}
                  onPress={() => setType('EXPENSE')}
                >
                  <Ionicons name="trending-down" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={[styles.tabTextThemed, isExpense && styles.tabTextThemedActive]}>Gider</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButtonThemed, !isExpense && styles.tabButtonThemedActive]}
                  onPress={() => setType('INCOME')}
                >
                  <Ionicons name="trending-up" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={[styles.tabTextThemed, !isExpense && styles.tabTextThemedActive]}>Gelir</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1, paddingHorizontal: 20, paddingTop: 16 }}
              contentContainerStyle={{ paddingBottom: 28 }}
            >
              {/* Row: Amount + Payment Option (Tek Çekim / Taksitli) */}
              <View style={{ marginBottom: 16 }}>
                <View style={styles.amountHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tutar (₺)</Text>
                  {!editingTx && (
                    <View style={[styles.paymentTypeToggle, { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9', borderColor: colors.border }]}>
                      <TouchableOpacity 
                        style={[styles.paymentTypeBtn, !isInstallment && [styles.paymentTypeBtnActive, { backgroundColor: isDark ? colors.bgCard : '#ffffff' }]]}
                        onPress={() => setIsInstallment(false)}
                      >
                        <Text style={[styles.paymentTypeBtnText, !isInstallment && [styles.paymentTypeBtnTextActive, { color: colors.textPrimary }]]}>
                          Tek Çekim
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.paymentTypeBtn, isInstallment && [styles.paymentTypeBtnActive, { backgroundColor: isDark ? colors.bgCard : '#ffffff' }]]}
                        onPress={() => setIsInstallment(true)}
                      >
                        <Text style={[styles.paymentTypeBtnText, isInstallment && [styles.paymentTypeBtnTextActive, { color: colors.textPrimary }]]}>
                          # Taksitli
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Big Centered Amount Input */}
                <TextInput 
                  style={[styles.amountInput, { backgroundColor: isDark ? colors.bgSecondary : '#ffffff', borderColor: colors.border, color: colors.textPrimary }]} 
                  keyboardType="numeric" 
                  placeholder="0.00" 
                  placeholderTextColor={colors.textMuted}
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus={!editingTx}
                />
              </View>

              {/* Harcama Yeri (Gider) / Gelir Kaynağı (Gelir) (* Zorunlu) - Sağa Sola Kaydırma */}
              <View style={{ marginBottom: 16 }}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    {isExpense ? 'Harcama Yeri' : 'Gelir Kaynağı'}
                  </Text>
                  <Text style={styles.requiredBadge}>* Zorunlu</Text>
                  {selectedMerchant && (
                    <View style={[styles.activeSelectionBadge, { backgroundColor: isExpense ? '#fef2f2' : '#ecfdf5', borderColor: isExpense ? '#fca5a5' : '#6ee7b7' }]}>
                      <Text style={[styles.activeSelectionBadgeText, { color: isExpense ? '#b91c1c' : '#047857' }]} numberOfLines={1}>
                        {selectedMerchant.name}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Horizontal Swipeable Chips (No broken/fake dropdown box) */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={[
                    styles.chipsScrollView, 
                    hasSubmitted && !merchantId && styles.chipsScrollViewError
                  ]} 
                  contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}
                >
                  {merchants.map(m => {
                    const isSelected = merchantId === m.id;
                    return (
                      <TouchableOpacity 
                        key={m.id} 
                        style={[
                          styles.chipItem, 
                          { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border },
                          isSelected && (isExpense ? styles.chipItemActiveExp : styles.chipItemActiveInc)
                        ]}
                        onPress={() => setMerchantId(isSelected ? '' : m.id)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <Ionicons 
                            name="checkmark-circle" 
                            size={16} 
                            color={isExpense ? '#e11d48' : '#059669'} 
                            style={{ marginRight: 4 }} 
                          />
                        )}
                        <Text style={[styles.chipItemText, { color: isSelected ? (isExpense ? '#ef4444' : '#10b981') : colors.textSecondary }, isSelected && styles.chipItemTextActive]}>
                          {m.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {merchants.length === 0 && (
                    <Text style={{ fontSize: 12, color: colors.textMuted, paddingVertical: 6 }}>
                      {isExpense ? 'Kayıtlı harcama yeri bulunmuyor.' : 'Kayıtlı gelir kaynağı bulunmuyor.'}
                    </Text>
                  )}
                </ScrollView>
                {hasSubmitted && !merchantId && (
                  <Text style={styles.fieldErrorHint}>
                    Lütfen sağa-sola kaydırarak bir {isExpense ? 'harcama yeri' : 'gelir kaynağı'} seçiniz.
                  </Text>
                )}
              </View>

              {/* Kategori (* Zorunlu) - Sağa Sola Kaydırma */}
              <View style={{ marginBottom: 16 }}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Kategori</Text>
                  <Text style={styles.requiredBadge}>* Zorunlu</Text>
                  {selectedCategory && (
                    <View style={[styles.activeSelectionBadge, { backgroundColor: isExpense ? '#fef2f2' : '#ecfdf5', borderColor: isExpense ? '#fca5a5' : '#6ee7b7' }]}>
                      <Text style={[styles.activeSelectionBadgeText, { color: isExpense ? '#b91c1c' : '#047857' }]} numberOfLines={1}>
                        {selectedCategory.name}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Horizontal Swipeable Category Chips */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={[
                    styles.chipsScrollView, 
                    hasSubmitted && !categoryId && styles.chipsScrollViewError
                  ]} 
                  contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}
                >
                  {filteredCategories.map(c => {
                    const isSelected = categoryId === c.id;
                    return (
                      <TouchableOpacity 
                        key={c.id} 
                        style={[
                          styles.chipItem, 
                          { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border },
                          isSelected && (isExpense ? styles.chipItemActiveExp : styles.chipItemActiveInc)
                        ]}
                        onPress={() => setCategoryId(isSelected ? '' : c.id)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <Ionicons 
                            name="checkmark-circle" 
                            size={16} 
                            color={isExpense ? '#e11d48' : '#059669'} 
                            style={{ marginRight: 4 }} 
                          />
                        )}
                        <Text style={[styles.chipItemText, { color: isSelected ? (isExpense ? '#ef4444' : '#10b981') : colors.textSecondary }, isSelected && styles.chipItemTextActive]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {filteredCategories.length === 0 && (
                    <Text style={{ fontSize: 12, color: colors.textMuted, paddingVertical: 6 }}>Kategori bulunmuyor.</Text>
                  )}
                </ScrollView>
                {hasSubmitted && !categoryId && (
                  <Text style={styles.fieldErrorHint}>
                    Lütfen sağa-sola kaydırarak bir kategori seçiniz.
                  </Text>
                )}
              </View>

              {/* Row: Date & Description */}
              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tarih</Text>
                  <View style={styles.inputWithIcon}>
                    <TextInput 
                      style={[styles.textInputCompact, { backgroundColor: isDark ? colors.bgSecondary : '#ffffff', borderColor: colors.border, color: colors.textPrimary }]} 
                      placeholder="YYYY-AA-GG" 
                      placeholderTextColor={colors.textMuted}
                      value={date}
                      onChangeText={setDate}
                    />
                    <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.inputIconRight} />
                  </View>
                </View>

                <View style={{ flex: 1.4 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Açıklama</Text>
                  <TextInput 
                    style={[styles.textInputCompact, { backgroundColor: isDark ? colors.bgSecondary : '#ffffff', borderColor: colors.border, color: colors.textPrimary }]} 
                    placeholder="İşlem açıklaması..." 
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              </View>

              {/* Installments Section (Shown when Taksitli is active, for both Gider and Gelir) */}
              {isInstallment && (
                <View style={[styles.installmentBox, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border }]}>
                  <Text style={[styles.installmentBoxTitle, { color: colors.textMuted }]}>
                    {isExpense ? 'Taksitli Gider Bilgileri' : 'Taksitli Gelir Bilgileri'}
                  </Text>
                  <View style={styles.rowTwoCols}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.installmentSubLabel, { color: colors.textMuted }]}>Taksit Sayısı</Text>
                      <TextInput 
                        style={[styles.installmentInput, { backgroundColor: isDark ? colors.bgCard : '#ffffff', borderColor: colors.border, color: colors.textPrimary }]} 
                        keyboardType="numeric" 
                        placeholder="Örn: 3" 
                        placeholderTextColor={colors.textMuted}
                        value={installmentCount}
                        onChangeText={setInstallmentCount}
                      />
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={[styles.installmentSubLabel, { color: colors.textMuted }]}>İlk Taksit Tarihi</Text>
                      <TextInput 
                        style={[styles.installmentInput, { backgroundColor: isDark ? colors.bgCard : '#ffffff', borderColor: colors.border, color: colors.textPrimary }]} 
                        placeholder="YYYY-AA-GG" 
                        placeholderTextColor={colors.textMuted}
                        value={firstInstallmentDate}
                        onChangeText={setFirstInstallmentDate}
                      />
                    </View>
                  </View>
                  {parseAmountValue(amount) > 0 && parseInt(installmentCount) > 1 && (
                    <View style={[styles.installmentPreviewRow, { borderColor: `${themeColor}40`, backgroundColor: `${themeColor}10` }]}>
                      <Ionicons name="calendar-outline" size={16} color={themeColor} />
                      <Text style={[styles.installmentPreviewText, { color: themeColor }]}>
                        Aylık Taksit: {formatCurrency(parseAmountValue(amount) / parseInt(installmentCount))} x {installmentCount} Ay
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Dynamic Submit Button */}
              <TouchableOpacity 
                style={[styles.themedSubmitBtn, { backgroundColor: themeColor }]} 
                onPress={handleSubmit} 
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.themedSubmitBtnText}>
                    {editingTx 
                      ? 'Değişiklikleri Kaydet' 
                      : isInstallment 
                        ? (isExpense ? 'Taksitli Gider Ekle' : 'Taksitli Gelir Ekle')
                        : (isExpense ? 'Gider Ekle' : 'Gelir Ekle')
                    }
                  </Text>
                )}
              </TouchableOpacity>

              {editingTx && (
                <TouchableOpacity 
                  style={styles.deleteInFormBtn}
                  onPress={() => handleDeleteTransaction(editingTx)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#e11d48" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteInFormBtnText}>Bu İşlemi Sil</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Transaction Actions / Detail Bottom Modal */}
      <Modal
        visible={actionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.actionModalBackdrop} 
          activeOpacity={1} 
          onPress={() => setActionModalVisible(false)}
        >
          <View style={[styles.actionSheetContainer, { backgroundColor: colors.bgCard }]} onStartShouldSetResponder={() => true}>
            {/* Drag Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#475569' : '#cbd5e1' }]} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetHeaderTitle, { color: colors.textPrimary }]}>İşlem Detayı</Text>
              <TouchableOpacity 
                onPress={() => setActionModalVisible(false)}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <>
                {/* Hero Info */}
                <View style={styles.sheetHero}>
                  <View style={[
                    styles.sheetIconCircle, 
                    { backgroundColor: selectedTx.type === 'INCOME' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : (isDark ? 'rgba(244, 63, 94, 0.2)' : '#ffe4e6') }
                  ]}>
                    <Ionicons 
                      name={selectedTx.type === 'INCOME' ? "arrow-down" : "arrow-up"} 
                      size={28} 
                      color={selectedTx.type === 'INCOME' ? "#10b981" : "#f43f5e"} 
                    />
                  </View>

                  <Text style={[
                    styles.sheetAmount,
                    { color: selectedTx.type === 'INCOME' ? '#10b981' : '#f43f5e' }
                  ]}>
                    {selectedTx.type === 'INCOME' ? '+' : '-'}{formatCurrency(selectedTx.amount)}
                  </Text>

                  <Text style={[styles.sheetTitle, { color: colors.textSecondary }]}>
                    {selectedTx.description || (selectedTx.type === 'INCOME' ? 'Gelir İşlemi' : 'Gider İşlemi')}
                  </Text>

                  <View style={[
                    styles.sheetTypeBadge,
                    { 
                      backgroundColor: selectedTx.type === 'INCOME' ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5') : (isDark ? 'rgba(244, 63, 94, 0.15)' : '#fff1f2'),
                      borderColor: selectedTx.type === 'INCOME' ? '#10b981' : '#f43f5e' 
                    }
                  ]}>
                    <Text style={[
                      styles.sheetTypeBadgeText,
                      { color: selectedTx.type === 'INCOME' ? '#10b981' : '#f43f5e' }
                    ]}>
                      {selectedTx.type === 'INCOME' ? 'Gelir Kaydı' : 'Gider Kaydı'}
                    </Text>
                  </View>
                </View>

                {/* Details List */}
                <View style={[styles.sheetDetailsCard, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border }]}>
                  <View style={styles.sheetDetailRow}>
                    <Text style={[styles.sheetDetailLabel, { color: colors.textMuted }]}>
                      {selectedTx.type === 'EXPENSE' ? 'Harcama Yeri' : 'Gelir Kaynağı'}
                    </Text>
                    <Text style={[styles.sheetDetailValue, { color: colors.textPrimary }]}>
                      {selectedTx.merchant?.name || selectedTx.source || '-'}
                    </Text>
                  </View>
                  <View style={[styles.sheetDivider, { backgroundColor: colors.divider }]} />

                  <View style={styles.sheetDetailRow}>
                    <Text style={[styles.sheetDetailLabel, { color: colors.textMuted }]}>Kategori</Text>
                    <Text style={[styles.sheetDetailValue, { color: colors.textPrimary }]}>
                      {selectedTx.category?.name || 'Kategorisiz'}
                    </Text>
                  </View>
                  <View style={[styles.sheetDivider, { backgroundColor: colors.divider }]} />

                  <View style={styles.sheetDetailRow}>
                    <Text style={[styles.sheetDetailLabel, { color: colors.textMuted }]}>Tarih</Text>
                    <Text style={[styles.sheetDetailValue, { color: colors.textPrimary }]}>
                      {new Date(selectedTx.transactionDate || selectedTx.date).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.sheetActions}>
                  <TouchableOpacity 
                    style={styles.sheetEditBtn}
                    onPress={() => handleOpenEdit(selectedTx)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetEditBtnText}>İşlemi Düzenle</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.sheetDeleteBtn, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.15)' : '#fff1f2', borderColor: isDark ? 'rgba(244, 63, 94, 0.3)' : '#fecdd3' }]}
                    onPress={() => handleDeleteTransaction(selectedTx)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#e11d48" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetDeleteBtnText}>İşlemi Sil</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModalContent, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Filtreler</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.filterSectionLabel, { color: colors.textMuted }]}>VADE</Text>
              <View style={styles.catGrid}>
                {['Bugün', 'Bu Hafta', '15 Gün', 'Bu Ay', 'Geçen Ay', 'Geçmiş'].map(vade => (
                  <TouchableOpacity 
                    key={vade} 
                    style={[
                      styles.filterChip, 
                      { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9', borderColor: isDark ? colors.border : 'transparent' },
                      filterVade === vade && styles.filterChipActive
                    ]}
                    onPress={() => setFilterVade(vade === filterVade ? '' : vade)}
                  >
                    <Text style={[
                      styles.filterChipText, 
                      { color: filterVade === vade ? '#4f46e5' : colors.textSecondary },
                      filterVade === vade && styles.filterChipTextActive
                    ]}>{vade}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.filterSectionLabel, { color: colors.textMuted }]}>KATEGORİ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, flexGrow: 0 }}>
                <TouchableOpacity 
                  style={[
                    styles.filterChip, 
                    { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9', borderColor: isDark ? colors.border : 'transparent', marginRight: 8 },
                    filterCategoryId === 'Tümü' && styles.filterChipActive
                  ]}
                  onPress={() => setFilterCategoryId('Tümü')}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: filterCategoryId === 'Tümü' ? '#4f46e5' : colors.textSecondary },
                    filterCategoryId === 'Tümü' && styles.filterChipTextActive
                  ]}>Tümü</Text>
                </TouchableOpacity>
                {categories.map(c => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[
                      styles.filterChip, 
                      { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9', borderColor: isDark ? colors.border : 'transparent', marginRight: 8 },
                      filterCategoryId === c.id && styles.filterChipActive
                    ]}
                    onPress={() => setFilterCategoryId(c.id)}
                  >
                    <Text style={[
                      styles.filterChipText, 
                      { color: filterCategoryId === c.id ? '#4f46e5' : colors.textSecondary },
                      filterCategoryId === c.id && styles.filterChipTextActive
                    ]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Harcama Yeri (Only Merchants, No Accounts!) */}
              <Text style={[styles.filterSectionLabel, { color: colors.textMuted }]}>HARCAMA YERİ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 28, flexGrow: 0 }}>
                <TouchableOpacity 
                  style={[
                    styles.filterChip, 
                    { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9', borderColor: isDark ? colors.border : 'transparent', marginRight: 8 },
                    filterMerchantId === 'Tümü' && styles.filterChipActive
                  ]}
                  onPress={() => setFilterMerchantId('Tümü')}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: filterMerchantId === 'Tümü' ? '#4f46e5' : colors.textSecondary },
                    filterMerchantId === 'Tümü' && styles.filterChipTextActive
                  ]}>Tümü</Text>
                </TouchableOpacity>
                {merchants.map(m => (
                  <TouchableOpacity 
                    key={m.id} 
                    style={[
                      styles.filterChip, 
                      { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9', borderColor: isDark ? colors.border : 'transparent', marginRight: 8 },
                      filterMerchantId === m.id && styles.filterChipActive
                    ]}
                    onPress={() => setFilterMerchantId(m.id)}
                  >
                    <Text style={[
                      styles.filterChipText, 
                      { color: filterMerchantId === m.id ? '#4f46e5' : colors.textSecondary },
                      filterMerchantId === m.id && styles.filterChipTextActive
                    ]}>🏪 {m.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                  style={[styles.submitBtn, { flex: 1, backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9' }]} 
                  onPress={() => {
                    setFilterVade('');
                    setFilterCategoryId('Tümü');
                    setFilterMerchantId('Tümü');
                  }}
                >
                  <Text style={[styles.submitBtnText, { color: colors.textMuted }]}>Temizle</Text>
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
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },

  /* Themed Header for QuickAddModal */
  modalHeaderThemed: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitleWhite: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  tabContainerThemed: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  tabButtonThemed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  tabButtonThemedActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabTextThemed: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  tabTextThemedActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  /* Field Labels */
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  requiredBadge: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
  },
  activeSelectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 4,
  },
  activeSelectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fieldErrorHint: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 4,
  },

  /* Amount Row */
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentTypeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentTypeBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentTypeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  paymentTypeBtnTextActive: {
    color: '#1e293b',
    fontWeight: '700',
  },
  amountInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },

  /* Chips Horizontal ScrollView */
  chipsScrollView: {
    paddingVertical: 2,
  },
  chipsScrollViewError: {
    backgroundColor: '#fff5f5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 4,
  },

  /* Chip Items */
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  chipItemActiveExp: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  chipItemActiveInc: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  chipItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipItemTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },

  /* 2 Cols Row */
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputWithIcon: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIconRight: {
    position: 'absolute',
    right: 12,
  },
  textInputCompact: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },

  /* Installment Box */
  installmentBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  installmentBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  installmentSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  installmentInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  installmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  installmentPreviewText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Themed Submit Button */
  themedSubmitBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  themedSubmitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Filter Modal Items */
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#0f172a' 
  },
  filterSectionLabel: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#64748b', 
    marginBottom: 8, 
    letterSpacing: 0.5,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#818cf8',
  },
  filterChipText: { 
    color: '#475569', 
    fontWeight: '500', 
    fontSize: 13 
  },
  filterChipTextActive: { 
    color: '#4f46e5', 
    fontWeight: '700' 
  },
  submitBtn: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitBtnText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '700' 
  },
  cardAmountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deleteInFormBtn: {
    marginTop: 12,
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  deleteInFormBtnText: {
    color: '#e11d48',
    fontSize: 14,
    fontWeight: '700',
  },
  actionModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHandle: {
    width: 38,
    height: 4.5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetHero: {
    alignItems: 'center',
    marginBottom: 18,
  },
  sheetIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sheetAmount: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },
  sheetTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  sheetTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sheetDetailsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sheetDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  sheetDetailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  sheetDetailValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  sheetActions: {
    gap: 10,
  },
  sheetEditBtn: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  sheetEditBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  sheetDeleteBtn: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  sheetDeleteBtnText: {
    color: '#e11d48',
    fontSize: 14,
    fontWeight: '700',
  },
});
