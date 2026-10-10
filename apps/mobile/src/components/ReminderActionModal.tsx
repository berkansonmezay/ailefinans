import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { useTheme } from '../context/ThemeContext';

interface ReminderActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reminder?: any;
}

export const ReminderActionModal = ({ visible, onClose, onSuccess, reminder }: ReminderActionModalProps) => {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('MONTHLY');

  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      if (reminder) {
        setTitle(reminder.title || '');
        setDescription(reminder.description || '');
        setAmount(reminder.amount ? String(reminder.amount) : '');
        setCurrency(reminder.currency || 'TRY');
        setDueDate(reminder.dueDate ? reminder.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        setIsRecurring(!!reminder.isRecurring);
        setRecurrenceRule(reminder.recurrenceRule || 'MONTHLY');
      } else {
        setTitle('');
        setDescription('');
        setAmount('');
        setCurrency('TRY');
        setDueDate(new Date().toISOString().split('T')[0]);
        setIsRecurring(false);
        setRecurrenceRule('MONTHLY');
      }
      setShowCurrencyDropdown(false);
      setShowRecurrenceDropdown(false);
    }
  }, [visible, reminder]);

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen Başlık ve Vade Tarihi alanlarını doldurun.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        currency,
        dueDate: new Date(dueDate).toISOString(),
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : undefined,
      };

      if (reminder) {
        await fetchApi(`/reminders/${reminder.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/reminders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Hatırlatıcı kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const currencies = [
    { value: 'TRY', label: 'TRY (₺)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
  ];

  const recurrenceOptions = [
    { value: 'WEEKLY', label: 'Haftalık' },
    { value: 'MONTHLY', label: 'Aylık' },
    { value: 'YEARLY', label: 'Yıllık' },
  ];

  const { overlayKeyboardStyle, maxContentHeight } = useModalKeyboard();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, overlayKeyboardStyle]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={[styles.modalContent, { maxHeight: maxContentHeight }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{reminder ? 'Hatırlatıcıyı Düzenle' : 'Yeni Hatırlatıcı'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={{ flexShrink: 1 }} 
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Başlık <Text style={{color: '#f43f5e'}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="örn: Kira Ödemesi, Kredi Kartı Son Günü"
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Açıklama</Text>
                <TextInput
                  style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                  placeholder="İsteğe bağlı ek notlar..."
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.label}>Tutar (Opsiyonel)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, zIndex: 200 }]}>
                  <Text style={styles.label}>Para Birimi</Text>
                  <TouchableOpacity 
                    style={styles.dropdownSelector}
                    onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  >
                    <Text style={styles.dropdownSelectorText}>
                      {currencies.find(c => c.value === currency)?.label || 'TRY'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  {showCurrencyDropdown && (
                    <View style={styles.dropdownList}>
                      {currencies.map(c => (
                        <TouchableOpacity 
                          key={c.value} 
                          style={styles.dropdownItem}
                          onPress={() => {
                            setCurrency(c.value);
                            setShowCurrencyDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vade / Hatırlatma Tarihi <Text style={{color: '#f43f5e'}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Düzenli Tekrar</Text>
                  <Text style={styles.subLabel}>Belirli aralıklarla otomatik yenilensin mi?</Text>
                </View>
                <Switch 
                  value={isRecurring} 
                  onValueChange={setIsRecurring}
                  trackColor={{ false: isDark ? colors.border : '#e2e8f0', true: '#3b82f6' }}
                  thumbColor="#fff"
                />
              </View>

              {isRecurring && (
                <View style={[styles.inputGroup, { zIndex: 100 }]}>
                  <Text style={styles.label}>Tekrarlama Sıklığı</Text>
                  <TouchableOpacity 
                    style={styles.dropdownSelector}
                    onPress={() => setShowRecurrenceDropdown(!showRecurrenceDropdown)}
                  >
                    <Text style={styles.dropdownSelectorText}>
                      {recurrenceOptions.find(r => r.value === recurrenceRule)?.label || 'Aylık'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  {showRecurrenceDropdown && (
                    <View style={styles.dropdownList}>
                      {recurrenceOptions.map(r => (
                        <TouchableOpacity 
                          key={r.value} 
                          style={styles.dropdownItem}
                          onPress={() => {
                            setRecurrenceRule(r.value);
                            setShowRecurrenceDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{r.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity 
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{reminder ? 'Güncelle' : 'Kaydet'}</Text>
                )}
              </TouchableOpacity>
              
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    gap: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.bgSecondary,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.bgSecondary,
  },
  dropdownSelectorText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  dropdownList: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.4 : 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
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
