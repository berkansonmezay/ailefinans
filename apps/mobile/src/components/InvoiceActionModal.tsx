import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { useTheme } from '../context/ThemeContext';

interface InvoiceActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: any;
}

export const InvoiceActionModal = ({ visible, onClose, onSuccess, invoice }: InvoiceActionModalProps) => {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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

  const { overlayKeyboardStyle, maxContentHeight } = useModalKeyboard();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, overlayKeyboardStyle]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.container, { maxHeight: maxContentHeight }]}
        >
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
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={[styles.formScroll, { flexShrink: 1 }]} 
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
          >
            {/* Provider */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kurum / Sağlayıcı Adı *</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Türk Telekom, İGDAŞ, Amazon..."
                value={provider}
                onChangeText={setProvider}
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                  placeholderTextColor={colors.textMuted}
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
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Son Ödeme Tarihi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-AA-GG"
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Status Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ödeme Durumu</Text>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[styles.statusBtn, status === 'PENDING' && { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb', borderColor: '#f59e0b' }]}
                  onPress={() => setStatus('PENDING')}
                >
                  <Ionicons name="time-outline" size={16} color={status === 'PENDING' ? '#f59e0b' : colors.textMuted} />
                  <Text style={[styles.statusText, status === 'PENDING' && { color: '#f59e0b', fontWeight: '700' }]}>
                    Bekliyor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusBtn, status === 'PAID' && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5', borderColor: '#10b981' }]}
                  onPress={() => setStatus('PAID')}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={status === 'PAID' ? '#10b981' : colors.textMuted} />
                  <Text style={[styles.statusText, status === 'PAID' && { color: '#10b981', fontWeight: '700' }]}>
                    Ödendi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusBtn, status === 'CANCELLED' && { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2', borderColor: '#ef4444' }]}
                  onPress={() => setStatus('CANCELLED')}
                >
                  <Ionicons name="close-circle-outline" size={16} color={status === 'CANCELLED' ? '#ef4444' : colors.textMuted} />
                  <Text style={[styles.statusText, status === 'CANCELLED' && { color: '#ef4444', fontWeight: '700' }]}>
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: isDark ? colors.bgSecondary : '#f8fafc',
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
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 4,
    height: 44,
  },
  currencyBtn: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyBtnActive: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
    borderColor: '#10b981',
  },
  currencyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  currencyTextActive: {
    color: '#10b981',
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
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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
