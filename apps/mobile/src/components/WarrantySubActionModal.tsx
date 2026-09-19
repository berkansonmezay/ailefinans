import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

export type WarrantySubActionType = 'EXTEND' | 'SERVICE' | 'CLAIM';

interface WarrantySubActionModalProps {
  visible: boolean;
  type: WarrantySubActionType;
  warranty: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const WarrantySubActionModal = ({ 
  visible, type, warranty, onClose, onSuccess 
}: WarrantySubActionModalProps) => {
  const [loading, setLoading] = useState(false);

  // Extend fields
  const [extendProvider, setExtendProvider] = useState('');
  const [extensionMonths, setExtensionMonths] = useState('12');
  const [extendStartDate, setExtendStartDate] = useState('');
  const [extendEndDate, setExtendEndDate] = useState('');
  const [extendCost, setExtendCost] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [extendNotes, setExtendNotes] = useState('');

  // Service fields
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceProvider, setServiceProvider] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [serviceCost, setServiceCost] = useState('');

  // Claim fields
  const [issueDescription, setIssueDescription] = useState('');
  const [rmaNumber, setRmaNumber] = useState('');
  const [claimNotes, setClaimNotes] = useState('');

  useEffect(() => {
    if (visible && warranty) {
      // Setup extend defaults based on existing warranty end date
      const start = warranty.warrantyEndDate 
        ? warranty.warrantyEndDate.split('T')[0] 
        : new Date().toISOString().split('T')[0];
      setExtendStartDate(start);

      const d = new Date(start);
      d.setMonth(d.getMonth() + 12);
      setExtendEndDate(d.toISOString().split('T')[0]);
      setExtendProvider(warranty.brand || '');
      setExtensionMonths('12');
      setExtendCost('');
      setPolicyNumber('');
      setExtendNotes('');

      // Service defaults
      setServiceDate(new Date().toISOString().split('T')[0]);
      setServiceProvider('');
      setServiceDescription('');
      setPartsReplaced('');
      setServiceCost('');

      // Claim defaults
      setIssueDescription('');
      setRmaNumber('');
      setClaimNotes('');
    }
  }, [visible, warranty]);

  const handleMonthsChange = (mStr: string) => {
    setExtensionMonths(mStr);
    const m = parseInt(mStr, 10);
    if (!isNaN(m) && extendStartDate) {
      const d = new Date(extendStartDate);
      d.setMonth(d.getMonth() + m);
      setExtendEndDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async () => {
    if (!warranty?.id) return;

    try {
      setLoading(true);

      if (type === 'EXTEND') {
        if (!extendProvider.trim()) {
          Alert.alert('Eksik Bilgi', 'Lütfen uzatma sağlayıcısını belirtin.');
          setLoading(false);
          return;
        }

        const payload = {
          provider: extendProvider.trim(),
          extensionType: 'EXTENDED',
          startDate: new Date(extendStartDate).toISOString(),
          endDate: new Date(extendEndDate).toISOString(),
          cost: extendCost ? parseFloat(extendCost.replace(',', '.')) : null,
          policyNumber: policyNumber.trim() || null,
          notes: extendNotes.trim() || null,
        };

        await fetchApi(`/warranties/${warranty.id}/extend`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        Alert.alert('Başarılı', 'Garanti süresi başarıyla uzatıldı.');
      } else if (type === 'SERVICE') {
        if (!serviceDescription.trim()) {
          Alert.alert('Eksik Bilgi', 'Lütfen yapılan servis veya onarım işlemini açıklayın.');
          setLoading(false);
          return;
        }

        const payload = {
          serviceDate: new Date(serviceDate).toISOString(),
          serviceProvider: serviceProvider.trim() || 'Yetkili Servis',
          description: serviceDescription.trim(),
          partsReplaced: partsReplaced.trim() || null,
          cost: serviceCost ? parseFloat(serviceCost.replace(',', '.')) : 0,
        };

        await fetchApi(`/warranties/${warranty.id}/services`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        Alert.alert('Başarılı', 'Servis kaydı başarıyla eklendi.');
      } else if (type === 'CLAIM') {
        if (!issueDescription.trim()) {
          Alert.alert('Eksik Bilgi', 'Lütfen arıza veya talep konusunu açıklayın.');
          setLoading(false);
          return;
        }

        const payload = {
          issueDescription: issueDescription.trim(),
          rmaNumber: rmaNumber.trim() || null,
          notes: claimNotes.trim() || null,
        };

        await fetchApi(`/warranties/${warranty.id}/claims`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        Alert.alert('Başarılı', 'Arıza / hasar talebi oluşturuldu.');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Garanti alt işlem hatası:', error);
      Alert.alert('Hata', error.message || 'İşlem gerçekleştirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const getMeta = () => {
    switch (type) {
      case 'EXTEND':
        return {
          title: 'Garanti Süresini Uzat',
          icon: 'shield-outline',
          iconBg: '#eff6ff',
          iconColor: '#3b82f6',
          btnColor: '#3b82f6',
          btnText: 'Garantiyi Uzat',
        };
      case 'SERVICE':
        return {
          title: 'Servis / Bakım Kaydı Ekle',
          icon: 'build-outline',
          iconBg: '#fffbeb',
          iconColor: '#f59e0b',
          btnColor: '#f59e0b',
          btnText: 'Servis Kaydını Kaydet',
        };
      case 'CLAIM':
        return {
          title: 'Hasar / Arıza Talebi Aç',
          icon: 'clipboard-outline',
          iconBg: '#fdf2f8',
          iconColor: '#ec4899',
          btnColor: '#ec4899',
          btnText: 'Talebi Oluştur',
        };
    }
  };

  const meta = getMeta();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={[styles.iconCircle, { backgroundColor: meta.iconBg }]}>
                <Ionicons name={meta.icon as any} size={20} color={meta.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{meta.title}</Text>
                <Text style={styles.subTitle} numberOfLines={1}>
                  {warranty?.productName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* ================= EXTEND FORM ================= */}
            {type === 'EXTEND' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Uzatma Sağlayıcısı / Sigorta Şirketi *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: MediaMarkt Koruma, Sigorta Şirketi..."
                    value={extendProvider}
                    onChangeText={setExtendProvider}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Uzatma Süresi (Ay)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="12"
                      value={extensionMonths}
                      onChangeText={handleMonthsChange}
                      keyboardType="number-pad"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Ek Maliyet (₺)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      value={extendCost}
                      onChangeText={setExtendCost}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Yeni Bitiş Tarihi</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-AA-GG"
                      value={extendEndDate}
                      onChangeText={setExtendEndDate}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Poliçe / Belge No</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Opsiyonel"
                      value={policyNumber}
                      onChangeText={setPolicyNumber}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notlar</Text>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="Ek kapsam veya poliçe şartları..."
                    value={extendNotes}
                    onChangeText={setExtendNotes}
                    multiline
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </>
            )}

            {/* ================= SERVICE FORM ================= */}
            {type === 'SERVICE' && (
              <>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Servis Tarihi *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-AA-GG"
                      value={serviceDate}
                      onChangeText={setServiceDate}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Maliyet (₺)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      value={serviceCost}
                      onChangeText={setServiceCost}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Servis Sağlayıcı / Firma</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: Apple Yetkili Servisi, KVK, Bosch Teknik Servis..."
                    value={serviceProvider}
                    onChangeText={setServiceProvider}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Yapılan İşlem / Açıklama *</Text>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="Örn: Batarya değişimi ve genel temizlik bakımı yapıldı."
                    value={serviceDescription}
                    onChangeText={setServiceDescription}
                    multiline
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Değişen Parçalar (Opsiyonel)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: Batarya, Ekran camı..."
                    value={partsReplaced}
                    onChangeText={setPartsReplaced}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </>
            )}

            {/* ================= CLAIM FORM ================= */}
            {type === 'CLAIM' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Arıza / Sorun Açıklaması *</Text>
                  <TextInput
                    style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                    placeholder="Örn: Cihaz şarj almıyor ve aniden kapanıyor."
                    value={issueDescription}
                    onChangeText={setIssueDescription}
                    multiline
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Servis / Takip Numarası (RMA)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: RMA-8912457"
                    value={rmaNumber}
                    onChangeText={setRmaNumber}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Ek Notlar (Opsiyonel)</Text>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="Kargo bilgisi, servis yetkilisi vs..."
                    value={claimNotes}
                    onChangeText={setClaimNotes}
                    multiline
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Vazgeç</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: meta.btnColor }]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitText}>{meta.btnText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
