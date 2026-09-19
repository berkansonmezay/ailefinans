import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

interface InvoiceActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: any;
}

export const InvoiceActionModal = ({ visible, onClose, onSuccess, invoice }: InvoiceActionModalProps) => {
  const [loading, setLoading] = useState(false);

  const [provider, setProvider] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'CANCELLED'>('PENDING');

  useEffect(() => {
    if (visible) {
      if (invoice) {
        setProvider(invoice.provider || invoice.merchantName || '');
        setInvoiceNumber(invoice.invoiceNumber || '');
        setAmount(invoice.amount != null ? String(invoice.amount) : '');
        setCurrency(invoice.currency || 'TRY');
        setInvoiceDate(invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        setDueDate(invoice.dueDate ? invoice.dueDate.split('T')[0] : '');
        setStatus(invoice.status || 'PENDING');
      } else {
        const today = new Date().toISOString().split('T')[0];
        setProvider('');
        setInvoiceNumber('');
        setAmount('');
        setCurrency('TRY');
        setInvoiceDate(today);
        setDueDate('');
        setStatus('PENDING');
      }
    }
  }, [visible, invoice]);

  const handleSubmit = async () => {
    if (!provider.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen fatura sağlayıcısı veya kurum adını girin.');
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Geçersiz Tutar', 'Lütfen geçerli bir fatura tutarı girin.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        provider: provider.trim(),
        invoiceNumber: invoiceNumber.trim() || null,
        amount: numAmount,
        currency,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: dueDate.trim() ? new Date(dueDate).toISOString() : null,
        status,
      };

      if (invoice?.id) {
        await fetchApi(`/invoices/${invoice.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/invoices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Fatura kaydedilirken hata:', error);
      Alert.alert('Hata', error.message || 'Fatura kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="receipt" size={20} color="#10b981" />
              </View>
              <Text style={styles.title}>
                {invoice ? 'Faturayı Düzenle' : 'Yeni Fatura Ekle'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Provider */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kurum / Sağlayıcı Adı *</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Türk Telekom, İGDAŞ, Amazon..."
                value={provider}
                onChangeText={setProvider}
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Invoice Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fatura Numarası (Opsiyonel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: GIB202609180124"
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Amount & Currency */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>Fatura Tutarı *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Para Birimi</Text>
                <View style={styles.currencyRow}>
                  {['TRY', 'USD', 'EUR'].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
                      onPress={() => setCurrency(c)}
                    >
                      <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>
                        {c === 'TRY' ? '₺' : c === 'USD' ? '$' : '€'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Dates: Invoice Date & Due Date */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Fatura Tarihi *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-AA-GG"
                  value={invoiceDate}
                  onChangeText={setInvoiceDate}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Son Ödeme Tarihi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-AA-GG"
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Status Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ödeme Durumu</Text>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[styles.statusBtn, status === 'PENDING' && { backgroundColor: '#fffbeb', borderColor: '#f59e0b' }]}
                  onPress={() => setStatus('PENDING')}
                >
                  <Ionicons name="time-outline" size={16} color={status === 'PENDING' ? '#d97706' : '#64748b'} />
                  <Text style={[styles.statusText, status === 'PENDING' && { color: '#d97706', fontWeight: '700' }]}>
                    Bekliyor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusBtn, status === 'PAID' && { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]}
                  onPress={() => setStatus('PAID')}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={status === 'PAID' ? '#059669' : '#64748b'} />
                  <Text style={[styles.statusText, status === 'PAID' && { color: '#059669', fontWeight: '700' }]}>
                    Ödendi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusBtn, status === 'CANCELLED' && { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]}
                  onPress={() => setStatus('CANCELLED')}
                >
                  <Ionicons name="close-circle-outline" size={16} color={status === 'CANCELLED' ? '#dc2626' : '#64748b'} />
                  <Text style={[styles.statusText, status === 'CANCELLED' && { color: '#dc2626', fontWeight: '700' }]}>
                    İptal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Vazgeç</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitText}>
                  {invoice ? 'Güncelle' : 'Faturayı Kaydet'}
                </Text>
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
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
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
    marginBottom: 16,
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
  currencyRow: {
    flexDirection: 'row',
    gap: 4,
    height: 44,
  },
  currencyBtn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  currencyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  currencyTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
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
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
