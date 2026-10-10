import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { useTheme } from '../context/ThemeContext';

interface SubscriptionActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscription?: any;
}

export const SubscriptionActionModal = ({ visible, onClose, onSuccess, subscription }: SubscriptionActionModalProps) => {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [category, setCategory] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [remindBeforeDays, setRemindBeforeDays] = useState('3');
  const [status, setStatus] = useState('ACTIVE');

  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      if (subscription) {
        setName(subscription.name || '');
        setPlatform(subscription.platform || '');
        setAmount(String(subscription.amount || '0'));
        setFrequency(subscription.frequency || 'MONTHLY');
        setCategory(subscription.category || '');
        setNextPaymentDate(subscription.nextPaymentDate ? subscription.nextPaymentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        setReminderEnabled(subscription.reminderEnabled ?? true);
        setRemindBeforeDays(String(subscription.remindBeforeDays ?? '3'));
        setStatus(subscription.status || 'ACTIVE');
      } else {
        setName('');
        setPlatform('');
        setAmount('');
        setFrequency('MONTHLY');
        setCategory('');
        setNextPaymentDate(new Date().toISOString().split('T')[0]);
        setReminderEnabled(true);
        setRemindBeforeDays('3');
        setStatus('ACTIVE');
      }
      setShowFrequencyDropdown(false);
      setShowStatusDropdown(false);
    }
  }, [visible, subscription]);

  const handleSubmit = async () => {
    if (!name || !amount || !nextPaymentDate) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları (Ad, Tutar, Ödeme Tarihi) doldurun.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name,
        platform,
        amount: parseFloat(amount),
        currency: 'TRY',
        frequency,
        category,
        nextPaymentDate,
        reminderEnabled,
        remindBeforeDays: parseInt(remindBeforeDays, 10),
        status
      };

      if (subscription) {
        await fetchApi(`/subscriptions/${subscription.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/subscriptions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const frequencies = [
    { value: 'MONTHLY', label: 'Aylık' },
    { value: 'YEARLY', label: 'Yıllık' },
    { value: 'WEEKLY', label: 'Haftalık' },
  ];

  const statuses = [
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'PAUSED', label: 'Durduruldu' },
    { value: 'CANCELLED', label: 'İptal Edildi' },
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
            <Text style={styles.title}>{subscription ? 'Aboneliği Düzenle' : 'Yeni Abonelik'}</Text>
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
                <Text style={styles.label}>Abonelik Adı <Text style={{color: '#f43f5e'}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="örn: Netflix, Spor Salonu"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, zIndex: 200 }]}>
                  <Text style={styles.label}>Sıklık <Text style={{color: '#f43f5e'}}>*</Text></Text>
                  <TouchableOpacity 
                    style={styles.dropdownSelector}
                    onPress={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                  >
                    <Text style={styles.dropdownSelectorText}>
                      {frequencies.find(f => f.value === frequency)?.label || 'Seçiniz'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                  {showFrequencyDropdown && (
                    <View style={styles.dropdownList}>
                      {frequencies.map(f => (
                        <TouchableOpacity 
                          key={f.value} 
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFrequency(f.value);
                            setShowFrequencyDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{f.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Tutar (₺) <Text style={{color: '#f43f5e'}}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>İlk / Sonraki Ödeme Tarihi <Text style={{color: '#f43f5e'}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={nextPaymentDate}
                  onChangeText={setNextPaymentDate}
                />
              </View>

              {subscription && (
                <View style={[styles.inputGroup, { zIndex: 100 }]}>
                  <Text style={styles.label}>Durum</Text>
                  <TouchableOpacity 
                    style={styles.dropdownSelector}
                    onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                  >
                    <Text style={styles.dropdownSelectorText}>
                      {statuses.find(s => s.value === status)?.label || 'Seçiniz'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                  {showStatusDropdown && (
                    <View style={styles.dropdownList}>
                      {statuses.map(s => (
                        <TouchableOpacity 
                          key={s.value} 
                          style={styles.dropdownItem}
                          onPress={() => {
                            setStatus(s.value);
                            setShowStatusDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{s.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.switchGroup}>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Hatırlatıcı</Text>
                  <Text style={styles.subLabel}>Ödeme gününden önce uyar</Text>
                </View>
                <Switch 
                  value={reminderEnabled} 
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: isDark ? colors.border : '#e2e8f0', true: '#10b981' }}
                  thumbColor="#fff"
                />
              </View>

              {reminderEnabled && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Kaç Gün Önce?</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="3"
                    placeholderTextColor={colors.textMuted}
                    value={remindBeforeDays}
                    onChangeText={setRemindBeforeDays}
                    keyboardType="number-pad"
                  />
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
                  <Text style={styles.submitBtnText}>{subscription ? 'Güncelle' : 'Kaydet'}</Text>
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
    marginBottom: 24,
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
    gap: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    gap: 8,
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
    fontSize: 16,
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
    fontSize: 16,
    color: colors.textPrimary,
  },
  dropdownList: {
    position: 'absolute',
    top: 76,
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
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#8b5cf6',
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
