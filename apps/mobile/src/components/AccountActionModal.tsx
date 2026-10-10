import React, { useState, useEffect, useMemo } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

interface AccountActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: any;
}

export const AccountActionModal = ({ visible, onClose, onSuccess, account }: AccountActionModalProps) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [type, setType] = useState('BANK_ACCOUNT');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [bankName, setBankName] = useState('');

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      if (account) {
        setName(account.name || '');
        setOwnerName(account.ownerName || '');
        setType(account.type || 'BANK_ACCOUNT');
        setBalance(String(account.initialBalance ?? '0'));
        setCurrency(account.currency || 'TRY');
        setBankName(account.institution || '');
      } else {
        setName('');
        setOwnerName('');
        setType('BANK_ACCOUNT');
        setBalance('');
        setCurrency('TRY');
        setBankName('');
      }
      setShowTypeDropdown(false);
      setShowCurrencyDropdown(false);
    }
  }, [visible, account]);

  const handleSubmit = async () => {
    if (!name || !balance || !currency || !type) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları (Hesap Adı, Bakiye, Tür, Para Birimi) doldurun.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name,
        ownerName: ownerName || null,
        type,
        currency,
        institution: bankName,
        initialBalance: parseFloat(balance),
      };

      if (account) {
        await fetchApi(`/accounts/${account.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/accounts', {
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

  const types = [
    { value: 'BANK_ACCOUNT', label: 'Banka Hesabı' },
    { value: 'CREDIT_CARD', label: 'Kredi Kartı' },
    { value: 'CASH', label: 'Nakit Kasa' },
    { value: 'INVESTMENT', label: 'Yatırım Hesabı' },
  ];

  const currencies = [
    { value: 'TRY', label: 'TRY (₺)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
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
            <Text style={styles.title}>{account ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}</Text>
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
                <Text style={styles.label}>Hesap Adı <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="örn: Garanti Maaş, Nakit Cüzdan"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hesap Sahibi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="örn: Ahmet, Ortak"
                  placeholderTextColor={colors.textMuted}
                  value={ownerName}
                  onChangeText={setOwnerName}
                />
              </View>

              <View style={[styles.inputGroup, { zIndex: 200 }]}>
                <Text style={styles.label}>Hesap Türü <Text style={{color: 'red'}}>*</Text></Text>
                <TouchableOpacity 
                  style={styles.dropdownSelector}
                  onPress={() => {
                    setShowTypeDropdown(!showTypeDropdown);
                    setShowCurrencyDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownSelectorText}>
                    {types.find(t => t.value === type)?.label || 'Seçiniz'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                {showTypeDropdown && (
                  <View style={styles.dropdownList}>
                    {types.map(t => (
                      <TouchableOpacity 
                        key={t.value} 
                        style={styles.dropdownItem}
                        onPress={() => {
                          setType(t.value);
                          setShowTypeDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Banka / Kurum Adı</Text>
                <TextInput
                  style={styles.input}
                  placeholder="örn: Garanti BBVA"
                  placeholderTextColor={colors.textMuted}
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Başlangıç Bakiyesi <Text style={{color: 'red'}}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={balance}
                    onChangeText={setBalance}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, zIndex: 100 }]}>
                  <Text style={styles.label}>Para Birimi <Text style={{color: 'red'}}>*</Text></Text>
                  <TouchableOpacity 
                    style={styles.dropdownSelector}
                    onPress={() => {
                      setShowCurrencyDropdown(!showCurrencyDropdown);
                      setShowTypeDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownSelectorText}>
                      {currencies.find(c => c.value === currency)?.label || 'Seçiniz'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                  {showCurrencyDropdown && (
                    <View style={[styles.dropdownList, { top: 76 }]}>
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

              <TouchableOpacity 
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{account ? 'Güncelle' : 'Kaydet'}</Text>
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
    padding: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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
    shadowOpacity: isDark ? 0.3 : 0.1,
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
    backgroundColor: '#3b82f6',
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
