import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { AuthContext } from '../context/AuthContext';

type Tab = 'TENANT' | 'CATEGORIES' | 'MERCHANTS';

export const SettingsScreen = ({ navigation }: any) => {
  const { user, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<Tab>('TENANT');
  
  // States for Tenant
  const [tenant, setTenant] = useState<any>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantLoading, setTenantLoading] = useState(false);
  const [isTenantSaving, setIsTenantSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  // States for Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormData, setCatFormData] = useState({ name: '', type: 'EXPENSE' });

  // States for Merchants
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [isMerchModalOpen, setIsMerchModalOpen] = useState(false);
  const [editingMerchId, setEditingMerchId] = useState<string | null>(null);
  const [merchFormData, setMerchFormData] = useState({ name: '' });

  useEffect(() => {
    if (activeTab === 'TENANT') {
      loadTenantData();
    } else if (activeTab === 'CATEGORIES') {
      loadCategories();
    } else if (activeTab === 'MERCHANTS') {
      loadMerchants();
    }
  }, [activeTab]);

  // --- Tenant Handlers ---
  const loadTenantData = async () => {
    if (!user?.activeTenantId) return;
    try {
      setTenantLoading(true);
      const res = await fetchApi<any>(`/tenants/${user.activeTenantId}`);
      const t = res.data || res;
      setTenant(t);
      setTenantName(t.name || '');
      setMembers(t.members || []);
    } catch (error) {
      console.error('Kurum yüklenemedi:', error);
    } finally {
      setTenantLoading(false);
    }
  };

  const handleUpdateTenant = async () => {
    if (!user?.activeTenantId) return;
    try {
      setIsTenantSaving(true);
      const res = await fetchApi<any>(`/tenants/${user.activeTenantId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: tenantName }),
      });
      const newName = res.name || res.data?.name;
      if (newName && user) {
        setUser({ ...user, activeTenantName: newName });
      }
      Alert.alert('Başarılı', 'Kurum ayarları güncellendi.');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Güncelleme başarısız');
    } finally {
      setIsTenantSaving(false);
    }
  };

  // --- Category Handlers ---
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await fetchApi<any>('/categories');
      setCategories(Array.isArray(res) ? res : (res.items || res.data || []));
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleOpenCatModal = (cat?: any) => {
    if (cat) {
      setEditingCatId(cat.id);
      setCatFormData({ name: cat.name, type: cat.type });
    } else {
      setEditingCatId(null);
      setCatFormData({ name: '', type: 'EXPENSE' });
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catFormData.name.trim()) return;
    try {
      if (editingCatId) {
        await fetchApi(`/categories/${editingCatId}`, {
          method: 'PUT',
          body: JSON.stringify(catFormData),
        });
      } else {
        await fetchApi('/categories', {
          method: 'POST',
          body: JSON.stringify(catFormData),
        });
      }
      setIsCatModalOpen(false);
      loadCategories();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem başarısız');
    }
  };

  const handleDeleteCategory = (id: string) => {
    Alert.alert('Kategoriyi Sil', 'Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await fetchApi(`/categories/${id}`, { method: 'DELETE' });
          loadCategories();
        } catch (error) {
          Alert.alert('Hata', 'Silinemedi');
        }
      }}
    ]);
  };

  // --- Merchant Handlers ---
  const loadMerchants = async () => {
    try {
      setMerchantsLoading(true);
      const res = await fetchApi<any>('/merchants');
      setMerchants(Array.isArray(res) ? res : (res.items || res.data || []));
    } catch (error) {
      console.error('Harcama yerleri yüklenemedi:', error);
    } finally {
      setMerchantsLoading(false);
    }
  };

  const handleOpenMerchModal = (merch?: any) => {
    if (merch) {
      setEditingMerchId(merch.id);
      setMerchFormData({ name: merch.name });
    } else {
      setEditingMerchId(null);
      setMerchFormData({ name: '' });
    }
    setIsMerchModalOpen(true);
  };

  const handleSaveMerchant = async () => {
    if (!merchFormData.name.trim()) return;
    try {
      if (editingMerchId) {
        await fetchApi(`/merchants/${editingMerchId}`, {
          method: 'PUT',
          body: JSON.stringify(merchFormData),
        });
      } else {
        await fetchApi('/merchants', {
          method: 'POST',
          body: JSON.stringify(merchFormData),
        });
      }
      setIsMerchModalOpen(false);
      loadMerchants();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem başarısız');
    }
  };

  const handleDeleteMerchant = (id: string) => {
    Alert.alert('Kurumu Sil', 'Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await fetchApi(`/merchants/${id}`, { method: 'DELETE' });
          loadMerchants();
        } catch (error) {
          Alert.alert('Hata', 'Silinemedi');
        }
      }}
    ]);
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'TENANT' && styles.activeTab]} 
        onPress={() => setActiveTab('TENANT')}
      >
        <Ionicons name="business-outline" size={16} color={activeTab === 'TENANT' ? '#4f46e5' : '#64748b'} />
        <Text style={[styles.tabText, activeTab === 'TENANT' && styles.activeTabText]}>Kurum</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'CATEGORIES' && styles.activeTab]} 
        onPress={() => setActiveTab('CATEGORIES')}
      >
        <Ionicons name="pricetags-outline" size={16} color={activeTab === 'CATEGORIES' ? '#4f46e5' : '#64748b'} />
        <Text style={[styles.tabText, activeTab === 'CATEGORIES' && styles.activeTabText]}>Kategoriler</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'MERCHANTS' && styles.activeTab]} 
        onPress={() => setActiveTab('MERCHANTS')}
      >
        <Ionicons name="storefront-outline" size={16} color={activeTab === 'MERCHANTS' ? '#4f46e5' : '#64748b'} />
        <Text style={[styles.tabText, activeTab === 'MERCHANTS' && styles.activeTabText]}>Harcama Yeri</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTenantTab = () => {
    if (tenantLoading) return <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />;
    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aktif Kurum Ayarları</Text>
          <Text style={styles.label}>Kurum / Aile Adı</Text>
          <TextInput
            style={styles.input}
            value={tenantName}
            onChangeText={setTenantName}
            placeholder="Örn: Yılmaz Ailesi"
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleUpdateTenant} disabled={isTenantSaving}>
            {isTenantSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kurum Üyeleri</Text>
          {members.map((m, idx) => (
            <View key={idx} style={styles.memberRow}>
              <View style={styles.avatarMini}>
                <Text style={styles.avatarMiniText}>{(m.user?.firstName?.[0] || 'U').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.user?.firstName} {m.user?.lastName}</Text>
                <Text style={styles.memberRole}>{m.role === 'OWNER' ? 'Yönetici' : 'Üye'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCategoriesTab = () => {
    if (categoriesLoading) return <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />;
    return (
      <View style={styles.tabContent}>
        <View style={styles.flexRowBetween}>
          <Text style={styles.sectionTitle}>Tüm Kategoriler</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenCatModal()}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.listLeft}>
                <View style={[styles.typeIcon, { backgroundColor: item.type === 'INCOME' ? '#ecfdf5' : '#fef2f2' }]}>
                  <Ionicons name={item.type === 'INCOME' ? 'arrow-up' : 'arrow-down'} size={16} color={item.type === 'INCOME' ? '#10b981' : '#f43f5e'} />
                </View>
                <Text style={styles.listName}>{item.name}</Text>
              </View>
              <View style={styles.listRight}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleOpenCatModal(item)}>
                  <Ionicons name="pencil" size={18} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteCategory(item.id)}>
                  <Ionicons name="trash" size={18} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Henüz kategori yok.</Text>}
        />
      </View>
    );
  };

  const renderMerchantsTab = () => {
    if (merchantsLoading) return <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />;
    return (
      <View style={styles.tabContent}>
        <View style={styles.flexRowBetween}>
          <Text style={styles.sectionTitle}>Harcama Yerleri</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenMerchModal()}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={merchants}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.listLeft}>
                <View style={[styles.typeIcon, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="storefront" size={16} color="#3b82f6" />
                </View>
                <Text style={styles.listName}>{item.name}</Text>
              </View>
              <View style={styles.listRight}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleOpenMerchModal(item)}>
                  <Ionicons name="pencil" size={18} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteMerchant(item.id)}>
                  <Ionicons name="trash" size={18} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Henüz kayıtlı harcama yeri yok.</Text>}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.backButton} />
      </View>

      {renderTabs()}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'TENANT' && renderTenantTab()}
        {activeTab === 'CATEGORIES' && renderCategoriesTab()}
        {activeTab === 'MERCHANTS' && renderMerchantsTab()}
      </ScrollView>

      {/* Category Modal */}
      <Modal visible={isCatModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCatId ? 'Kategori Düzenle' : 'Yeni Kategori'}</Text>
              <TouchableOpacity onPress={() => setIsCatModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kategori Adı</Text>
              <TextInput style={styles.input} value={catFormData.name} onChangeText={t => setCatFormData({...catFormData, name: t})} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Türü</Text>
              <View style={styles.rowInputs}>
                <TouchableOpacity 
                  style={[styles.typeBtn, catFormData.type === 'EXPENSE' && styles.typeBtnActiveExp]}
                  onPress={() => setCatFormData({...catFormData, type: 'EXPENSE'})}
                >
                  <Text style={[styles.typeBtnText, catFormData.type === 'EXPENSE' && { color: '#f43f5e' }]}>Gider</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeBtn, catFormData.type === 'INCOME' && styles.typeBtnActiveInc]}
                  onPress={() => setCatFormData({...catFormData, type: 'INCOME'})}
                >
                  <Text style={[styles.typeBtnText, catFormData.type === 'INCOME' && { color: '#10b981' }]}>Gelir</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={[styles.btnPrimary, catFormData.type === 'INCOME' ? { backgroundColor: '#10b981' } : { backgroundColor: '#f43f5e' }]} onPress={handleSaveCategory}>
              <Text style={styles.btnPrimaryText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Merchant Modal */}
      <Modal visible={isMerchModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingMerchId ? 'Kurum Düzenle' : 'Yeni Harcama Yeri'}</Text>
              <TouchableOpacity onPress={() => setIsMerchModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Harcama Yeri Adı</Text>
              <TextInput style={styles.input} value={merchFormData.name} onChangeText={t => setMerchFormData({ name: t })} placeholder="Örn: Migros" />
            </View>
            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#3b82f6' }]} onPress={handleSaveMerchant}>
              <Text style={styles.btnPrimaryText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 8
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#f8fafc'
  },
  activeTab: { backgroundColor: '#eef2ff' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#4f46e5' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  tabContent: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', color: '#0f172a' },
  btnPrimary: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatarMini: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarMiniText: { color: '#64748b', fontWeight: '700' },
  memberName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  memberRole: { fontSize: 13, color: '#64748b' },
  flexRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  listRight: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  typeBtnActiveExp: { borderColor: '#f43f5e', backgroundColor: '#fff1f2' },
  typeBtnActiveInc: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
});
