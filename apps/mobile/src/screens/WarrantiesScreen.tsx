import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { WarrantyActionModal } from '../components/WarrantyActionModal';
import { InvoiceActionModal } from '../components/InvoiceActionModal';
import { WarrantySubActionModal, WarrantySubActionType } from '../components/WarrantySubActionModal';

type WarrantyTab = 'WARRANTIES' | 'INVOICES' | 'SERVICES' | 'CLAIMS';

export const WarrantiesScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState<WarrantyTab>('WARRANTIES');
  const [warranties, setWarranties] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [warrantyModalVisible, setWarrantyModalVisible] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<any>(null);

  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const [subActionModalVisible, setSubActionModalVisible] = useState(false);
  const [subActionType, setSubActionType] = useState<WarrantySubActionType>('EXTEND');

  const loadData = async () => {
    try {
      setLoading(true);
      const [wRes, iRes, sRes, cRes] = await Promise.all([
        fetchApi<any>('/warranties').catch(() => []),
        fetchApi<any>('/invoices').catch(() => []),
        fetchApi<any>('/warranties/services').catch(() => []),
        fetchApi<any>('/warranties/claims').catch(() => []),
      ]);

      const wList = Array.isArray(wRes) ? wRes : (wRes.items || wRes.data || []);
      const iList = Array.isArray(iRes) ? iRes : (iRes.items || iRes.data || []);
      const sList = Array.isArray(sRes) ? sRes : (sRes.items || sRes.data || []);
      const cList = Array.isArray(cRes) ? cRes : (cRes.items || cRes.data || []);

      setWarranties(wList);
      setInvoices(iList);
      setServices(sList);
      setClaims(cList);
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number, currency: string = 'TRY') => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';
    return `${symbol}${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Warranty Actions
  const handleEditWarranty = (item: any) => {
    setSelectedWarranty(item);
    setWarrantyModalVisible(true);
  };

  const handleDeleteWarranty = (item: any) => {
    Alert.alert(
      'Garantiyi Sil',
      `"${item.productName}" garanti kaydını silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Evet, Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await fetchApi(`/warranties/${item.id}`, { method: 'DELETE' });
              loadData();
            } catch (error) {
              Alert.alert('Hata', 'Silinirken bir hata oluştu');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const openSubAction = (type: WarrantySubActionType, item: any) => {
    setSelectedWarranty(item);
    setSubActionType(type);
    setSubActionModalVisible(true);
  };

  // Invoice Actions
  const handleEditInvoice = (item: any) => {
    setSelectedInvoice(item);
    setInvoiceModalVisible(true);
  };

  const handleDeleteInvoice = (item: any) => {
    Alert.alert(
      'Faturayı Sil',
      `"${item.provider || 'Fatura'}" kaydını silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Evet, Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await fetchApi(`/invoices/${item.id}`, { method: 'DELETE' });
              loadData();
            } catch (error) {
              Alert.alert('Hata', 'Fatura silinirken bir hata oluştu');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const markInvoiceAsPaid = async (item: any) => {
    try {
      setLoading(true);
      await fetchApi(`/invoices/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PAID' }),
      });
      loadData();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Fatura durumu güncellenemedi.');
      setLoading(false);
    }
  };

  const getWarrantyStatus = (endDateStr: string) => {
    if (!endDateStr) return { text: 'Belirsiz', color: '#64748b', bg: isDark ? 'rgba(100, 116, 139, 0.2)' : '#f1f5f9' };
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Süresi Doldu', color: '#ef4444', bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2' };
    }
    if (diffDays <= 30) {
      return { text: `${diffDays} Gün Kaldı`, color: '#f59e0b', bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb' };
    }
    const months = Math.floor(diffDays / 30);
    return { text: `${months} Ay Kaldı`, color: '#10b981', bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5' };
  };

  const getInvoiceStatus = (inv: any) => {
    if (inv.status === 'PAID') {
      return { text: 'Ödendi', color: '#059669', bg: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5', icon: 'checkmark-circle' };
    }
    if (inv.status === 'CANCELLED') {
      return { text: 'İptal', color: '#64748b', bg: isDark ? 'rgba(100, 116, 139, 0.2)' : '#f1f5f9', icon: 'close-circle' };
    }

    if (inv.dueDate) {
      const due = new Date(inv.dueDate).getTime();
      const now = new Date().getTime();
      if (due < now) {
        return { text: 'Gecikmiş', color: '#dc2626', bg: isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2', icon: 'alert-circle' };
      }
    }
    return { text: 'Bekliyor', color: '#d97706', bg: isDark ? 'rgba(217, 119, 6, 0.2)' : '#fffbeb', icon: 'time' };
  };

  const getClaimStatus = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return { text: 'Gönderildi', color: '#0284c7', bg: isDark ? 'rgba(2, 132, 199, 0.2)' : '#f0f9ff' };
      case 'IN_REVIEW':
        return { text: 'İnceleniyor', color: '#d97706', bg: isDark ? 'rgba(217, 119, 6, 0.2)' : '#fffbeb' };
      case 'APPROVED':
        return { text: 'Onaylandı', color: '#059669', bg: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5' };
      case 'IN_REPAIR':
        return { text: 'Onarımda', color: '#7c3aed', bg: isDark ? 'rgba(124, 58, 237, 0.2)' : '#f5f3ff' };
      case 'RESOLVED':
        return { text: 'Çözüldü', color: '#059669', bg: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5' };
      case 'REJECTED':
        return { text: 'Reddedildi', color: '#dc2626', bg: isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2' };
      default:
        return { text: status || 'Açık', color: '#64748b', bg: isDark ? 'rgba(100, 116, 139, 0.2)' : '#f1f5f9' };
    }
  };

  // KPIs
  const stats = useMemo(() => {
    let total = warranties.length;
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let totalValue = 0;

    const now = new Date().getTime();

    warranties.forEach(w => {
      totalValue += (w.purchasePrice || 0);
      if (w.warrantyEndDate) {
        const end = new Date(w.warrantyEndDate).getTime();
        const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          expired++;
        } else {
          active++;
          if (diffDays <= 30) {
            expiring++;
          }
        }
      } else {
        active++;
      }
    });

    return { total, active, expiring, expired, totalValue };
  }, [warranties]);

  // Categories present in data
  const categories = useMemo(() => {
    const set = new Set<string>();
    warranties.forEach(w => {
      if (w.category) set.add(w.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [warranties]);

  // Filtered warranties
  const filteredWarranties = useMemo(() => {
    return warranties.filter(w => {
      const matchSearch = (w.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (w.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (w.model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (w.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'ALL' ? true : w.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [warranties, searchQuery, categoryFilter]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      return (inv.provider || inv.merchantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (inv.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [invoices, searchQuery]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      return (s.serviceProvider || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (s.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (s.warranty?.productName || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [services, searchQuery]);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      return (c.issueDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (c.rmaNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (c.warranty?.productName || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [claims, searchQuery]);

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      {/* 4 KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { borderLeftColor: '#06b6d4', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>TOPLAM GARANTİ</Text>
          <Text style={[styles.kpiValue, { color: '#06b6d4' }]}>{stats.total} Adet</Text>
          <Text style={styles.kpiSubText}>Kayıtlı Cihaz</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>AKTİF GARANTİ</Text>
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>{stats.active} Adet</Text>
          <Text style={styles.kpiSubText}>Kapsamda</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>YAKINDA BİTEN</Text>
          <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{stats.expiring} Adet</Text>
          <Text style={styles.kpiSubText}>Son 30 Gün</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6', borderLeftWidth: 4 }]}>
          <Text style={styles.kpiLabel}>TOPLAM DEĞER</Text>
          <Text style={[styles.kpiValue, { color: '#8b5cf6' }]} numberOfLines={1}>
            {formatCurrency(stats.totalValue)}
          </Text>
          <Text style={styles.kpiSubText}>Korunan Varlık</Text>
        </View>
      </View>

      {/* 4 Tabs Selector (Scrollable) */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'WARRANTIES' && styles.tabItemActive]}
            onPress={() => setActiveTab('WARRANTIES')}
          >
            <Ionicons name="shield-checkmark" size={15} color={activeTab === 'WARRANTIES' ? '#06b6d4' : '#64748b'} />
            <Text style={[styles.tabItemText, activeTab === 'WARRANTIES' && styles.tabItemTextActive]}>
              Garantiler ({warranties.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'INVOICES' && styles.tabItemActive]}
            onPress={() => setActiveTab('INVOICES')}
          >
            <Ionicons name="receipt" size={15} color={activeTab === 'INVOICES' ? '#06b6d4' : '#64748b'} />
            <Text style={[styles.tabItemText, activeTab === 'INVOICES' && styles.tabItemTextActive]}>
              Faturalar ({invoices.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'SERVICES' && styles.tabItemActive]}
            onPress={() => setActiveTab('SERVICES')}
          >
            <Ionicons name="build" size={15} color={activeTab === 'SERVICES' ? '#06b6d4' : '#64748b'} />
            <Text style={[styles.tabItemText, activeTab === 'SERVICES' && styles.tabItemTextActive]}>
              Servisler ({services.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'CLAIMS' && styles.tabItemActive]}
            onPress={() => setActiveTab('CLAIMS')}
          >
            <Ionicons name="clipboard" size={15} color={activeTab === 'CLAIMS' ? '#06b6d4' : '#64748b'} />
            <Text style={[styles.tabItemText, activeTab === 'CLAIMS' && styles.tabItemTextActive]}>
              Talepler ({claims.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'WARRANTIES' ? "Ürün, marka, model veya seri no ara..." :
              activeTab === 'INVOICES' ? "Fatura no veya sağlayıcı ara..." :
              activeTab === 'SERVICES' ? "Servis sağlayıcı veya işlem ara..." : "Arıza veya talep no ara..."
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills (Only for Warranties) */}
      {activeTab === 'WARRANTIES' && categories.length > 1 && (
        <View style={styles.categoryPills}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, categoryFilter === cat && styles.pillActive]}
                onPress={() => setCategoryFilter(cat)}
              >
                <Text style={[styles.pillText, categoryFilter === cat && styles.pillTextActive]}>
                  {cat === 'ALL' ? 'Tümü' : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'WARRANTIES': return filteredWarranties;
      case 'INVOICES': return filteredInvoices;
      case 'SERVICES': return filteredServices;
      case 'CLAIMS': return filteredClaims;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Garantiler & Faturalar</Text>

        {/* AI Scanner Direct Shortcut */}
        <TouchableOpacity 
          style={styles.scannerHeaderBtn}
          onPress={() => navigation.navigate('InvoiceScanner')}
        >
          <Ionicons name="sparkles" size={14} color="#6366f1" />
          <Text style={styles.scannerHeaderBtnText}>AI ile Tara</Text>
        </TouchableOpacity>
      </View>

      {loading && warranties.length === 0 && invoices.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#06b6d4" />
        </View>
      ) : (
        <FlatList
          data={getListData()}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => {
            // ================== TAB 2: INVOICES ==================
            if (activeTab === 'INVOICES') {
              const invStatus = getInvoiceStatus(item);
              const isPaid = item.status === 'PAID';

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeaderTop}>
                    <View style={[styles.iconBox, { backgroundColor: isPaid ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb') }]}>
                      <Ionicons name="receipt-outline" size={22} color={isPaid ? '#10b981' : '#f59e0b'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cardTitle}>{item.provider || item.merchantName || 'Fatura'}</Text>
                        <View style={[styles.badge, { backgroundColor: invStatus.bg }]}>
                          <Text style={[styles.badgeText, { color: invStatus.color }]}>{invStatus.text}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardSubtitle}>
                        {item.invoiceNumber ? `No: ${item.invoiceNumber}` : 'Fatura No Yok'} • {item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString('tr-TR') : ''}
                      </Text>
                      {item.dueDate && (
                        <Text style={[styles.cardDueDate, !isPaid && invStatus.text === 'Gecikmiş' && { color: '#dc2626', fontWeight: '700' }]}>
                          Son Ödeme: {new Date(item.dueDate).toLocaleDateString('tr-TR')}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.cardAmount}>{formatCurrency(item.amount || item.totalAmount || 0, item.currency)}</Text>
                  </View>

                  {/* Invoice Actions Row */}
                  <View style={styles.invoiceActionRow}>
                    {!isPaid && (
                      <TouchableOpacity 
                        style={styles.payBtn}
                        onPress={() => markInvoiceAsPaid(item)}
                      >
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={styles.payBtnText}>Ödendi Yap</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' }]} 
                      onPress={() => handleEditInvoice(item)}
                    >
                      <Ionicons name="pencil" size={13} color="#3b82f6" />
                      <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Düzenle</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fff1f2' }]} 
                      onPress={() => handleDeleteInvoice(item)}
                    >
                      <Ionicons name="trash" size={13} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            // ================== TAB 3: SERVICES ==================
            if (activeTab === 'SERVICES') {
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeaderTop}>
                    <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#fffbeb' }]}>
                      <Ionicons name="build-outline" size={20} color="#d97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.warranty?.productName || 'Cihaz Bakım / Onarım'}</Text>
                      <Text style={styles.cardSubtitle}>
                        {item.serviceProvider || 'Yetkili Servis'} • {item.serviceDate ? new Date(item.serviceDate).toLocaleDateString('tr-TR') : ''}
                      </Text>
                    </View>
                    {item.cost != null && item.cost > 0 && (
                      <Text style={[styles.cardAmount, { color: colors.textPrimary }]}>{formatCurrency(item.cost)}</Text>
                    )}
                  </View>
                  <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                    <Text style={styles.serviceDesc}>{item.description}</Text>
                    {item.partsReplaced ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Ionicons name="hardware-chip-outline" size={13} color={colors.textSecondary} />
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Değişen: {item.partsReplaced}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            }

            // ================== TAB 4: CLAIMS ==================
            if (activeTab === 'CLAIMS') {
              const claimStatus = getClaimStatus(item.status);

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeaderTop}>
                    <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.2)' : '#fdf2f8' }]}>
                      <Ionicons name="clipboard-outline" size={20} color="#ec4899" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cardTitle}>{item.warranty?.productName || 'Garanti Talebi'}</Text>
                        <View style={[styles.badge, { backgroundColor: claimStatus.bg }]}>
                          <Text style={[styles.badgeText, { color: claimStatus.color }]}>{claimStatus.text}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardSubtitle}>
                        {item.rmaNumber ? `RMA: ${item.rmaNumber} • ` : ''}
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                    <Text style={styles.serviceDesc}>{item.issueDescription}</Text>
                    {item.notes ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' }}>
                        Not: {item.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            }

            // ================== TAB 1: WARRANTIES ==================
            const isExpanded = !!expandedItems[item.id];
            const status = getWarrantyStatus(item.warrantyEndDate);

            return (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.id)}>
                  <View style={styles.cardHeaderTop}>
                    <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.2)' : '#ecfeff' }]}>
                      <Ionicons name="shield-checkmark" size={22} color="#06b6d4" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.productName}</Text>
                      <Text style={styles.cardSubtitle}>
                        {[item.brand, item.model, item.category].filter(Boolean).join(' • ')}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[styles.badge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.badgeText, { color: status.color }]}>{status.text}</Text>
                      </View>
                      {item.purchasePrice != null && item.purchasePrice > 0 && (
                        <Text style={styles.cardPrice}>{formatCurrency(item.purchasePrice, item.currency)}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {item.serialNumber ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Seri No:</Text>
                        <Text style={styles.detailValue}>{item.serialNumber}</Text>
                      </View>
                    ) : null}

                    {item.purchasePlace ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Satın Alınan Yer:</Text>
                        <Text style={styles.detailValue}>{item.purchasePlace}</Text>
                      </View>
                    ) : null}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Satın Alma Tarihi:</Text>
                      <Text style={styles.detailValue}>
                        {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('tr-TR') : 'Belirtilmedi'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Garanti Bitiş:</Text>
                      <Text style={[styles.detailValue, { color: status.color }]}>
                        {item.warrantyEndDate ? new Date(item.warrantyEndDate).toLocaleDateString('tr-TR') : 'Belirtilmedi'}
                      </Text>
                    </View>

                    {/* Quick Warranty Sub-Actions (Extend, Service, Claim, Edit, Delete) */}
                    <View style={styles.warrantyQuickActions}>
                      <TouchableOpacity 
                        style={[styles.subActionBtn, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff' }]}
                        onPress={() => openSubAction('EXTEND', item)}
                      >
                        <Ionicons name="shield-outline" size={13} color="#2563eb" />
                        <Text style={[styles.subActionText, { color: '#2563eb' }]}>Uzat</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.subActionBtn, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#fffbeb' }]}
                        onPress={() => openSubAction('SERVICE', item)}
                      >
                        <Ionicons name="build-outline" size={13} color="#d97706" />
                        <Text style={[styles.subActionText, { color: '#d97706' }]}>Servis</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.subActionBtn, { backgroundColor: isDark ? 'rgba(219, 39, 119, 0.2)' : '#fdf2f8' }]}
                        onPress={() => openSubAction('CLAIM', item)}
                      >
                        <Ionicons name="clipboard-outline" size={13} color="#db2777" />
                        <Text style={[styles.subActionText, { color: '#db2777' }]}>Talep</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.subActionBtn, { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9' }]}
                        onPress={() => handleEditWarranty(item)}
                      >
                        <Ionicons name="pencil" size={13} color={colors.textSecondary} />
                        <Text style={[styles.subActionText, { color: colors.textSecondary }]}>Düzenle</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.subActionBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fff1f2' }]}
                        onPress={() => handleDeleteWarranty(item)}
                      >
                        <Ionicons name="trash" size={13} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {activeTab === 'WARRANTIES' ? 'Kayıtlı garanti belgesi bulunmuyor.' : 
               activeTab === 'INVOICES' ? 'Kayıtlı fatura bulunmuyor.' :
               activeTab === 'SERVICES' ? 'Kayıtlı servis veya bakım geçmişi bulunmuyor.' :
               'Açık veya geçmiş garanti talebi bulunmuyor.'}
            </Text>
          }
        />
      )}

      {/* Warranty Add/Edit Modal */}
      {warrantyModalVisible && (
        <WarrantyActionModal 
          visible={warrantyModalVisible}
          onClose={() => setWarrantyModalVisible(false)}
          onSuccess={loadData}
          warranty={selectedWarranty}
        />
      )}

      {/* Invoice Add/Edit Modal */}
      {invoiceModalVisible && (
        <InvoiceActionModal
          visible={invoiceModalVisible}
          onClose={() => setInvoiceModalVisible(false)}
          onSuccess={loadData}
          invoice={selectedInvoice}
        />
      )}

      {/* Warranty SubAction Modal (Extend / Service / Claim) */}
      {subActionModalVisible && (
        <WarrantySubActionModal
          visible={subActionModalVisible}
          type={subActionType}
          warranty={selectedWarranty}
          onClose={() => setSubActionModalVisible(false)}
          onSuccess={loadData}
        />
      )}

      {/* Dynamic Floating Action Button */}
      {(activeTab === 'WARRANTIES' || activeTab === 'INVOICES') && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => {
            if (activeTab === 'WARRANTIES') {
              setSelectedWarranty(null);
              setWarrantyModalVisible(true);
            } else {
              setSelectedInvoice(null);
              setInvoiceModalVisible(true);
            }
          }}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bgPrimary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.bgCard,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  scannerHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? '#6366f1' : '#e0e7ff',
  },
  scannerHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
  },
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
    backgroundColor: colors.bgCard,
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiSubText: {
    fontSize: 11,
    color: colors.textMuted,
  },

  tabsWrapper: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: isDark ? 'rgba(6, 182, 212, 0.2)' : '#ecfeff',
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabItemTextActive: {
    color: '#06b6d4',
    fontWeight: '700',
  },

  searchContainer: { flexDirection: 'row', marginBottom: 12 },
  searchBox: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.bgCard, 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    height: 42, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 13, color: colors.textPrimary },

  categoryPills: { marginBottom: 16 },
  pill: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16, 
    backgroundColor: colors.bgCard, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  pillActive: { 
    backgroundColor: isDark ? 'rgba(6, 182, 212, 0.25)' : '#cffafe', 
    borderColor: '#06b6d4' 
  },
  pillText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  pillTextActive: { color: '#0891b2', fontWeight: '700' },

  card: {
    backgroundColor: colors.bgCard,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 0,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardDueDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  expandedContent: {
    padding: 14,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailLabel: { fontSize: 12, color: colors.textMuted },
  detailValue: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },

  warrantyQuickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  subActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  subActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  invoiceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  payBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  serviceDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 32, paddingHorizontal: 20 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 99,
  },
});
