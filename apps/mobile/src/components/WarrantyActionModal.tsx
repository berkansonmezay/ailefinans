import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

interface WarrantyActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warranty?: any;
}

const CATEGORIES = [
  'Elektronik', 'Beyaz Eşya', 'Küçük Ev Aletleri', 'Mobilya',
  'Otomobil', 'Hizmet', 'Giyim', 'Spor/Hobi', 'Diğer'
];

const WARRANTY_TYPES = [
  { value: 'MANUFACTURER', label: 'Üretici Garantisi' },
  { value: 'EXTENDED', label: 'Uzatılmış Garanti' },
  { value: 'SELLER', label: 'Satıcı Garantisi' },
  { value: 'INSURANCE', label: 'Sigorta Kapsamı' },
];

export const WarrantyActionModal = ({ visible, onClose, onSuccess, warranty }: WarrantyActionModalProps) => {
  const [loading, setLoading] = useState(false);

  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [category, setCategory] = useState('Elektronik');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [warrantyMonths, setWarrantyMonths] = useState('24');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [warrantyType, setWarrantyType] = useState('MANUFACTURER');
  const [purchasePlace, setPurchasePlace] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [notes, setNotes] = useState('');

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Auto calculate warrantyEndDate from purchaseDate + warrantyMonths
  const recalculateEndDate = (pDateStr: string, monthsStr: string) => {
    const pDate = new Date(pDateStr);
    const months = parseInt(monthsStr, 10) || 24;
    if (!isNaN(pDate.getTime())) {
      const end = new Date(pDate);
      end.setMonth(end.getMonth() + months);
      setWarrantyEndDate(end.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    if (visible) {
      if (warranty) {
        setProductName(warranty.productName || '');
        setBrand(warranty.brand || '');
        setModel(warranty.model || '');
        setSerialNumber(warranty.serialNumber || '');
        setCategory(warranty.category || 'Elektronik');
        const pDate = warranty.purchaseDate ? warranty.purchaseDate.split('T')[0] : new Date().toISOString().split('T')[0];
        setPurchaseDate(pDate);
        setPurchasePrice(warranty.purchasePrice ? String(warranty.purchasePrice) : '');
        setCurrency(warranty.currency || 'TRY');
        const eDate = warranty.warrantyEndDate ? warranty.warrantyEndDate.split('T')[0] : '';
        setWarrantyEndDate(eDate);
        setWarrantyType(warranty.warrantyType || 'MANUFACTURER');
        setPurchasePlace(warranty.purchasePlace || '');
        setReminderEnabled(warranty.reminderEnabled ?? true);
        setNotes(warranty.notes || '');
      } else {
        const today = new Date().toISOString().split('T')[0];
        setProductName('');
        setBrand('');
        setModel('');
        setSerialNumber('');
        setCategory('Elektronik');
        setPurchaseDate(today);
        setPurchasePrice('');
        setCurrency('TRY');
        setWarrantyMonths('24');
        recalculateEndDate(today, '24');
        setWarrantyType('MANUFACTURER');
        setPurchasePlace('');
        setReminderEnabled(true);
        setNotes('');
      }
      setShowCategoryDropdown(false);
      setShowTypeDropdown(false);
    }
  }, [visible, warranty]);

  const handleSubmit = async () => {
    if (!productName.trim() || !purchaseDate.trim() || !warrantyEndDate.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen Ürün Adı, Satın Alma Tarihi ve Bitiş Tarihi alanlarını doldurun.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        productName: productName.trim(),
        brand: brand.trim() || null,
        model: model.trim() || null,
        serialNumber: serialNumber.trim() || null,
        category,
        purchaseDate: new Date(purchaseDate).toISOString(),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        currency,
        warrantyStartDate: new Date(purchaseDate).toISOString(),
        warrantyEndDate: new Date(warrantyEndDate).toISOString(),
        warrantyType,
        purchasePlace: purchasePlace.trim() || null,
        reminderEnabled,
        remindBeforeDays: 30,
        notes: notes.trim() || null,
      };

      if (warranty) {
        await fetchApi(`/warranties/${warranty.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/warranties', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Garanti belgesi kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{warranty ? 'Garantiyi Düzenle' : 'Yeni Garanti Belgesi'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.form}>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ürün Adı <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="örn: iPhone 15 Pro, Çamaşır Makinesi"
                  value={productName}
                  onChangeText={setProductName}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Marka</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="örn: Apple, Bosch"
                    value={brand}
                    onChangeText={setBrand}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Model</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="örn: 128GB Titanyum"
                    value={model}
                    onChangeText={setModel}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { zIndex: 200 }]}>
                <Text style={styles.label}>Kategori</Text>
                <TouchableOpacity 
                  style={styles.dropdownSelector}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text style={styles.dropdownSelectorText}>{category}</Text>
                  <Ionicons name="chevron-down" size={18} color="#64748b" />
                </TouchableOpacity>
                {showCategoryDropdown && (
                  <View style={styles.dropdownList}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity 
                        key={cat} 
                        style={styles.dropdownItem}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.label}>Satın Alma Fiyatı</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Satın Alınan Yer</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="örn: Teknosa"
                    value={purchasePlace}
                    onChangeText={setPurchasePlace}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Satın Alma Tarihi <Text style={{color: 'red'}}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={purchaseDate}
                    onChangeText={(val) => {
                      setPurchaseDate(val);
                      recalculateEndDate(val, warrantyMonths);
                    }}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Garanti Süresi (Ay)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="24"
                    value={warrantyMonths}
                    onChangeText={(val) => {
                      setWarrantyMonths(val);
                      recalculateEndDate(purchaseDate, val);
                    }}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bitiş Tarihi <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={warrantyEndDate}
                  onChangeText={setWarrantyEndDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Seri Numarası</Text>
                <TextInput
                  style={styles.input}
                  placeholder="örn: F2LX90... veya IMEI"
                  value={serialNumber}
                  onChangeText={setSerialNumber}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Garanti Bitiş Hatırlatması</Text>
                  <Text style={styles.subLabel}>Süre dolmadan 30 gün önce uyar</Text>
                </View>
                <Switch 
                  value={reminderEnabled} 
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: "#e2e8f0", true: "#06b6d4" }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{warranty ? 'Güncelle' : 'Kaydet'}</Text>
                )}
              </TouchableOpacity>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    gap: 12,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  subLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  dropdownSelectorText: {
    fontSize: 15,
    color: '#0f172a',
  },
  dropdownList: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    maxHeight: 180,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#06b6d4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
