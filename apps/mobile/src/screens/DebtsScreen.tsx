import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, Modal, ScrollView, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

export const DebtsScreen = ({ navigation }: any) => {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'plan' | 'list'>('plan');

  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL'
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/debts');
      const debtList = Array.isArray(res) ? res : (res.items || res.data || []);
      setDebts(debtList);
    } catch (error) {
      console.error('Borçlar yüklenirken hata:', error);
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toggleExpand = (id: string) => {
    setExpandedPlans(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeletePlan = (item: any) => {
    Alert.alert(
      'Borç Kaydını Sil',
      `"${item.description || item.creditor}" taksitli borç kaydını ve tüm taksitlerini silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Evet, Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              await fetchApi(`/debts/${item.id}`, { method: 'DELETE' });
              loadData();
            } catch (error) {
              alert('Silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  const handleToggleReminder = async (item: any) => {
    try {
      await fetchApi(`/debts/${item.id}/reminder`, {
        method: 'PATCH',
        body: JSON.stringify({ status: !item.hasReminder })
      });
      loadData();
    } catch (error) {
      alert('Hatırlatıcı durumu değiştirilemedi.');
    }
  };

  const handleDeleteInstallment = (installment: any) => {
    Alert.alert(
      'Taksiti Sil',
      'Bu taksiti silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Evet, Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              await fetchApi(`/expenses/${installment.id}`, { method: 'DELETE' });
              loadData();
            } catch (error) {
              alert('Silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  const handleTogglePaid = async (debtId: string, inst: any) => {
    try {
      const isCurrentlyPaid = inst.status === 'PAID';
      if (isCurrentlyPaid) {
        await fetchApi(`/debts/${debtId}/installments/${inst.id}/unpay`, { method: 'POST' });
      } else {
        const remaining = inst.amount - (inst.paidAmount || 0);
        await fetchApi(`/debts/${debtId}/installments/${inst.id}/pay`, {
          method: 'POST',
          body: JSON.stringify({ amount: remaining }),
        });
      }
      loadData();
    } catch (error) {
      alert('Güncellenirken bir hata oluştu');
    }
  };

  const filteredDebts = useMemo(() => {
    let result = [...debts];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(plan => {
        const title = (plan.description || plan.creditor || plan.merchantName || 'İsimsiz Borç').toLowerCase();
        return title.includes(q);
      });
    }

    if (filters.status !== 'ALL') {
      result = result.map(plan => {
        const filteredInsts = (plan.installments || []).filter((inst: any) => {
          const isPaid = inst.status === 'PAID';
          const isOverdue = inst.status === 'OVERDUE' || (new Date(inst.transactionDate || inst.dueDate) < new Date() && !isPaid);
          
          if (filters.status === 'PAID') return isPaid;
          if (filters.status === 'OVERDUE') return isOverdue;
          if (filters.status === 'ACTIVE') return !isPaid && !isOverdue;
          return true;
        });

        return {
          ...plan,
          installments: filteredInsts,
          hasMatchingInstallments: filteredInsts.length > 0
        };
      }).filter(plan => plan.hasMatchingInstallments);
    }

    return result;
  }, [debts, filters]);

  const filteredInstallments = useMemo(() => {
    const list: any[] = [];
    filteredDebts.forEach(plan => {
      (plan.installments || []).forEach((inst: any) => {
        list.push({
          ...inst,
          planTitle: plan.description || plan.creditor || plan.merchantName || 'İsimsiz Borç',
          planId: plan.id,
          currency: plan.currency
        });
      });
    });
    return list.sort((a, b) => new Date(a.transactionDate || a.dueDate).getTime() - new Date(b.transactionDate || b.dueDate).getTime());
  }, [filteredDebts]);

  const activeFiltersCount = (filters.status !== 'ALL' ? 1 : 0);

  const stats = useMemo(() => {
    const now = new Date();
    let totalAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;
    let paidAmount = 0;

    let totalInstallmentsCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let paidCount = 0;
    let totalOverdueDays = 0;

    if (filteredInstallments.length > 0) {
      totalInstallmentsCount = filteredInstallments.length;

      filteredInstallments.forEach(inst => {
        const amt = Number(inst.amount) || 0;
        totalAmount += amt;

        if (inst.status === 'PAID') {
          paidAmount += amt;
          paidCount++;
        } else {
          const dueDate = new Date(inst.transactionDate || inst.dueDate);
          if (dueDate < now) {
            overdueAmount += amt;
            overdueCount++;
            const diffDays = Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
            totalOverdueDays += diffDays;
          } else {
            pendingAmount += amt;
            pendingCount++;
          }
        }
      });
    } else {
      debts.forEach(item => {
        const total = Number(item.totalAmount) || Number(item.principalAmount) || 0;
        const paid = Number(item.paidAmount) || 0;
        const remaining = Number(item.remainingAmount) || Math.max(0, total - paid);

        totalAmount += total;
        paidAmount += paid;
        pendingAmount += remaining;
        totalInstallmentsCount += (item.installmentCount || 1);
      });
    }

    const performanceRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
    const overdueAvgDays = overdueCount > 0 ? Math.round(totalOverdueDays / overdueCount) : 0;

    return {
      totalAmount,
      totalInstallmentsCount,
      pendingAmount,
      pendingCount,
      overdueAmount,
      overdueCount,
      overdueAvgDays,
      paidAmount,
      paidCount,
      performanceRate,
    };
  }, [debts, filteredInstallments]);

  const renderPlanItem = ({ item }: { item: any }) => {
    const isExpanded = !!expandedPlans[item.id] || filters.status !== 'ALL';
    const totalAmount = item.totalAmount || item.principalAmount || 0;
    const paidAmount = item.paidAmount || 0;
    const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const title = item.description || item.creditor || item.merchantName || 'İsimsiz Borç';
    const { width } = Dimensions.get('window');

    return (
      <View style={styles.planCard}>
        {/* Plan Header */}
        <TouchableOpacity style={styles.planHeader} onPress={() => toggleExpand(item.id)}>
          <View style={styles.planHeaderTop}>
            <View style={styles.planHeaderLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="card" size={24} color="#f43f5e" />
              </View>
              <View style={{ paddingRight: 4 }}>
                <Text style={styles.planTitle}>{title}</Text>
                <Text style={styles.planSubtitle}>{item.installmentCount || 1} Taksit • {formatCurrency(totalAmount, item.currency)}</Text>
              </View>
            </View>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressText}>Ödenen: {formatCurrency(paidAmount, item.currency)}</Text>
              <Text style={styles.progressText}>Kalan: {formatCurrency(totalAmount - paidAmount, item.currency)}</Text>
            </View>
          </View>

          <View style={styles.planActionsRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, item.hasReminder ? styles.actionBtnActive : null]}
              onPress={() => handleToggleReminder(item)}
            >
              <Ionicons name={item.hasReminder ? "notifications" : "notifications-outline"} size={16} color={item.hasReminder ? "#f59e0b" : "#64748b"} />
              <Text style={[styles.actionBtnText, item.hasReminder ? { color: '#f59e0b' } : null]}>Hatırlatıcı</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeletePlan(item)}>
              <Ionicons name="trash-outline" size={16} color="#f43f5e" />
              <Text style={[styles.actionBtnText, { color: '#f43f5e' }]}>Planı Sil</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Expanded Installments List */}
        {isExpanded && item.installments && (
          <View style={styles.installmentsList}>
            {item.installments.map((inst: any, idx: number) => {
              const isPaid = inst.status === 'PAID';
              const isOverdue = inst.status === 'OVERDUE' || (new Date(inst.transactionDate || inst.dueDate) < new Date() && !isPaid);
              
              let statusColor = '#94a3b8';
              let statusText = 'Bekliyor';
              if (isPaid) { statusColor = '#10b981'; statusText = 'Ödendi'; }
              else if (isOverdue) { statusColor = '#f43f5e'; statusText = 'Gecikti'; }

              return (
                <View key={inst.id || idx} style={styles.instRow}>
                  <View style={styles.instInfo}>
                    <Text style={styles.instNum}>{inst.number || idx + 1}. Taksit</Text>
                    <Text style={styles.instDate}>{formatDate(inst.transactionDate || inst.dueDate)}</Text>
                  </View>
                  
                  <View style={styles.instRight}>
                    <View style={styles.instAmountWrapper}>
                      <Text style={styles.instAmount}>{formatCurrency(inst.amount, item.currency)}</Text>
                      <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.badgeText, { color: statusColor }]}>{statusText}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.instActions}>
                      <TouchableOpacity 
                        style={[styles.instActionBtn, isPaid ? styles.instActionBtnPaid : styles.instActionBtnPrimary]}
                        onPress={() => handleTogglePaid(item.id, inst)}
                      >
                        <Text style={[styles.instActionBtnText, isPaid ? { color: '#64748b' } : { color: '#fff' }]}>
                          {isPaid ? 'İptal' : 'Öde'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.instDeleteBtn} onPress={() => handleDeleteInstallment(inst)}>
                        <Ionicons name="trash-outline" size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderListItem = ({ item }: { item: any }) => {
    const isPaid = item.status === 'PAID';
    const isOverdue = item.status === 'OVERDUE' || (new Date(item.transactionDate || item.dueDate) < new Date() && !isPaid);
    
    let statusColor = '#94a3b8';
    let statusText = 'Bekliyor';
    if (isPaid) { statusColor = '#10b981'; statusText = 'Ödendi'; }
    else if (isOverdue) { statusColor = '#f43f5e'; statusText = 'Gecikti'; }

    return (
      <View style={styles.planCard}>
        <View style={styles.listRowHeader}>
          <View style={styles.planHeaderLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="card" size={24} color="#f43f5e" />
            </View>
            <View>
              <Text style={styles.planTitle}>{item.planTitle}</Text>
              <Text style={styles.planSubtitle}>{item.number}. Taksit • {formatDate(item.transactionDate || item.dueDate)}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        <View style={[styles.instRight, { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }]}>
          <Text style={[styles.instAmount, { fontSize: 18 }]}>{formatCurrency(item.amount, item.currency)}</Text>
          
          <View style={styles.instActions}>
            <TouchableOpacity 
              style={[styles.instActionBtn, isPaid ? styles.instActionBtnPaid : styles.instActionBtnPrimary]}
              onPress={() => handleTogglePaid(item.planId, item)}
            >
              <Text style={[styles.instActionBtnText, isPaid ? { color: '#64748b' } : { color: '#fff' }]}>
                {isPaid ? 'İptal' : 'Öde'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.instDeleteBtn} onPress={() => handleDeleteInstallment(item)}>
              <Ionicons name="trash-outline" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Taksitli Borçlar</Text>
        <TouchableOpacity 
          style={styles.toggleBtn}
          onPress={() => setViewMode(prev => prev === 'plan' ? 'list' : 'plan')}
        >
          <Ionicons name={viewMode === 'plan' ? "list" : "albums"} size={22} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={viewMode === 'plan' ? filteredDebts : filteredInstallments}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.listContent}
          renderItem={viewMode === 'plan' ? renderPlanItem : renderListItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz bir taksitli borç bulunmuyor.</Text>
          }
          ListHeaderComponent={
            <>
              <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                <View style={styles.kpiGrid}>
                  {/* TOPLAM TUTAR */}
                  <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
                    <Text style={styles.kpiLabel}>TOPLAM TUTAR</Text>
                    <Text style={[styles.kpiValue, { color: '#3b82f6' }]}>{formatCurrency(stats.totalAmount)}</Text>
                    <Text style={styles.kpiSubText}>{stats.totalInstallmentsCount} taksit</Text>
                  </View>
                  
                  {/* BEKLEYEN */}
                  <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
                    <Text style={styles.kpiLabel}>BEKLEYEN</Text>
                    <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{formatCurrency(stats.pendingAmount)}</Text>
                    <Text style={styles.kpiSubText}>{stats.pendingCount} taksit</Text>
                  </View>
                  
                  {/* GECİKMİŞ */}
                  <View style={[styles.kpiCard, { borderLeftColor: '#f43f5e', borderLeftWidth: 4 }]}>
                    <Text style={styles.kpiLabel}>GECİKMİŞ</Text>
                    <Text style={[styles.kpiValue, { color: '#f43f5e' }]}>{formatCurrency(stats.overdueAmount)}</Text>
                    <Text style={styles.kpiSubText}>{stats.overdueCount} taksit {stats.overdueAvgDays > 0 ? `· ort. ${stats.overdueAvgDays} gün` : ''}</Text>
                  </View>
                  
                  {/* ÖDENEN */}
                  <View style={[styles.kpiCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
                    <Text style={styles.kpiLabel}>ÖDENEN</Text>
                    <Text style={[styles.kpiValue, { color: '#10b981' }]}>{formatCurrency(stats.paidAmount)}</Text>
                    <Text style={styles.kpiSubText}>{stats.paidCount} taksit</Text>
                  </View>

                  {/* PERFORMANS */}
                  <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6', borderLeftWidth: 4 }]}>
                    <Text style={styles.kpiLabel}>PERFORMANS</Text>
                    <Text style={[styles.kpiValue, { color: '#8b5cf6' }]}>%{stats.performanceRate}</Text>
                    <Text style={[styles.kpiSubText, { color: '#10b981', fontWeight: '600' }]}>↑ Ödeme Oranı</Text>
                  </View>
                </View>

                {/* Info Box */}
                <View style={[
                  styles.infoBox, 
                  stats.overdueCount > 0 ? styles.infoBoxDanger : styles.infoBoxSuccess
                ]}>
                  <View style={[styles.infoBoxIcon, stats.overdueCount > 0 ? { backgroundColor: '#ffe4e6' } : { backgroundColor: '#d1fae5' }]}>
                    <Ionicons name={stats.overdueCount > 0 ? "warning" : "star"} size={20} color={stats.overdueCount > 0 ? "#f43f5e" : "#10b981"} />
                  </View>
                  <View style={styles.infoBoxTextContainer}>
                    <Text style={[styles.infoBoxTitle, { color: stats.overdueCount > 0 ? '#f43f5e' : '#10b981' }]}>
                      {stats.overdueCount > 0 ? 'Gecikmiş Borç Hatırlatması' : 'Taksitli Borç Durumu İyi'}
                    </Text>
                    <Text style={styles.infoBoxText}>
                      {stats.overdueCount > 0 ? (
                        `Şu anda vadesi geçmiş toplam ${stats.overdueCount} taksit (${formatCurrency(stats.overdueAmount)}) bulunmaktadır (ortalama gecikme: ${stats.overdueAvgDays} gün). Bu ödemeleri en kısa sürede tamamlamanız tavsiye edilir.`
                      ) : (
                        `Tebrikler! Vadesi geçmiş herhangi bir taksitli borcunuz bulunmamaktadır. Önümüzdeki vadelerde toplam ${formatCurrency(stats.pendingAmount)} tutarında ${stats.pendingCount} taksit ödemesi beklenmektedir.`
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
                  <TextInput 
                    style={styles.searchInput}
                    placeholder="Borç adı veya kişi ara..."
                    value={filters.search}
                    onChangeText={(t) => setFilters(prev => ({ ...prev, search: t }))}
                  />
                </View>
                <TouchableOpacity style={styles.filterBtn} onPress={() => setIsFiltersOpen(true)}>
                  <Ionicons name="filter" size={20} color={activeFiltersCount > 0 ? '#4f46e5' : '#64748b'} />
                  {activeFiltersCount > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={isFiltersOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFiltersOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrele</Text>
              <TouchableOpacity onPress={() => setIsFiltersOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Durum</Text>
            <View style={styles.filterOptions}>
              {['ALL', 'ACTIVE', 'OVERDUE', 'PAID'].map(status => {
                const isSelected = filters.status === status;
                const labels: any = { 'ALL': 'Tümü', 'ACTIVE': 'Bekliyor', 'OVERDUE': 'Gecikmiş', 'PAID': 'Ödenmiş' };
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setFilters(prev => ({ ...prev, status }))}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {labels[status]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalBtnClear}
                onPress={() => setFilters(prev => ({ ...prev, status: 'ALL' }))}
              >
                <Text style={styles.modalBtnClearText}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalBtnApply}
                onPress={() => setIsFiltersOpen(false)}
              >
                <Text style={styles.modalBtnApplyText}>Sonuçları Gör</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  toggleBtn: { padding: 4, backgroundColor: '#f1f5f9', borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  },
  kpiSubText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  infoBox: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  infoBoxSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  infoBoxDanger: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  infoBoxIcon: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  infoBoxTextContainer: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  
  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 16, gap: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 15, color: '#0f172a' },
  filterBtn: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#4f46e5', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  listContent: { padding: 16, paddingBottom: 100 },
  
  planCard: {
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
  planHeader: { padding: 0 },
  planHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { 
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  planSubtitle: { fontSize: 13, color: '#64748b' },
  
  progressContainer: { marginBottom: 16 },
  progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#f43f5e', borderRadius: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  planActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnActive: { },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  installmentsList: { backgroundColor: '#f8fafc', padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  instRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 },
  instInfo: { flex: 1 },
  instNum: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  instDate: { fontSize: 12, color: '#94a3b8' },
  instRight: { alignItems: 'flex-end', gap: 8 },
  instAmountWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  instAmount: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  
  instActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  instActionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  instActionBtnPrimary: { backgroundColor: '#f43f5e' },
  instActionBtnPaid: { backgroundColor: '#f1f5f9' },
  instActionBtnText: { fontSize: 12, fontWeight: '700' },
  instDeleteBtn: { padding: 4 },

  listRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 32 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  filterSectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent' },
  filterChipActive: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  filterChipText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  filterChipTextActive: { color: '#4f46e5', fontWeight: '600' },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalBtnClear: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalBtnClearText: { color: '#64748b', fontSize: 16, fontWeight: '600' },
  modalBtnApply: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center' },
  modalBtnApplyText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
