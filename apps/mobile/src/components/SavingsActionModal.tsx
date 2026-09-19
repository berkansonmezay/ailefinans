import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

interface SavingsActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action: 'buy' | 'sell' | 'edit' | null;
  asset?: any;
  currentRate?: number;
}

export const SavingsActionModal = ({ visible, onClose, onSuccess, action, asset, currentRate }: SavingsActionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [marketRates, setMarketRates] = useState<any[]>([]);

  const [type, setType] = useState('CURRENCY');
  const [code, setCode] = useState('USD');
  const [bank, setBank] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // For Dropdowns
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMarketRates();
      if (asset) {
        setType(asset.type || 'CURRENCY');
        setCode(asset.code || 'USD');
        setBank(asset.bank || '');
        setQuantity(action === 'edit' || action === 'sell' ? String(asset.quantity || '') : '');
        setPrice(action === 'edit' ? String(asset.averageCost || '') : action === 'sell' ? String(currentRate || '') : '');
      } else {
        setType('CURRENCY');
        setCode('USD');
        setBank('');
        setQuantity('');
        setPrice('');
      }
      setShowTypeDropdown(false);
      setShowCodeDropdown(false);
      setShowBankDropdown(false);
    }
  }, [visible, action, asset]);

  useEffect(() => {
    if (action === 'buy' || action === 'sell') {
      const rate = marketRates.find(r => r.code === code);
      if (rate) {
        setPrice(action === 'sell' && rate.buying ? String(rate.buying) : String(rate.selling));
      }
    }
  }, [code, marketRates, action]);

  const loadMarketRates = async () => {
    try {
      const res = await fetchApi('/market/rates');
      setMarketRates((res as any)?.rates || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!code || !quantity || !price) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun.');
      return;
    }

    try {
      setLoading(true);

      if (action === 'buy') {
        await fetchApi('/savings-assets/transaction', {
          method: 'POST',
          body: JSON.stringify({
            code,
            type,
            bank,
            transactionType: 'BUY',
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            date,
          }),
        });
      } else if (action === 'sell') {
        if (asset && parseFloat(quantity) > asset.quantity) {
          Alert.alert('Hata', 'Sahip olduğunuzdan fazla miktar satamazsınız.');
          setLoading(false);
          return;
        }
        await fetchApi('/savings-assets/transaction', {
          method: 'POST',
          body: JSON.stringify({
            code,
            type,
            bank,
            transactionType: 'SELL',
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            date,
          }),
        });
      } else if (action === 'edit') {
        await fetchApi(`/savings-assets/${asset.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            quantity: parseFloat(quantity),
            averageCost: parseFloat(price),
          }),
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

  const getTitle = () => {
    if (action === 'buy') return 'Yeni Varlık Ekle (Alış)';
    if (action === 'sell') return 'Varlık Sat';
    if (action === 'edit') return 'Varlık Düzenle';
    return '';
  };

  const types = [
    { value: 'CURRENCY', label: 'Döviz' },
    { value: 'GOLD', label: 'Altın' },
    { value: 'SILVER', label: 'Gümüş & Platin' },
    { value: 'FUND', label: 'Yatırım Fonu' },
  ];

  const banks = [
    { value: '', label: 'Serbest Piyasa' },
    { value: 'Ziraat Bankası', label: 'Ziraat Bankası' },
    { value: 'Garanti BBVA', label: 'Garanti BBVA' },
    { value: 'İş Bankası', label: 'İş Bankası' },
    { value: 'Akbank', label: 'Akbank' },
    { value: 'Yapı Kredi', label: 'Yapı Kredi' },
    { value: 'Vakıfbank', label: 'Vakıfbank' },
    { value: 'Halkbank', label: 'Halkbank' },
  ];

  const currencyOptions = marketRates.filter(r => r.type === 'Currency').map(r => ({ value: r.code, label: r.code }));
  const goldOptions = marketRates.filter(r => r.type === 'Gold' && !['gumus', 'gram-platin', 'gram-paladyum'].includes(r.code)).map(r => ({ value: r.code, label: r.code }));
  const silverOptions = marketRates.filter(r => r.type === 'Gold' && ['gumus', 'gram-platin', 'gram-paladyum'].includes(r.code)).map(r => ({ value: r.code, label: r.code }));

  const getCodeOptions = () => {
    switch (type) {
      case 'CURRENCY': return currencyOptions;
      case 'GOLD': return goldOptions;
      case 'SILVER': return silverOptions;
      default: return [];
    }
  };

  const codeOptions = getCodeOptions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{maxHeight: 500}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.form}>

              {/* Type Select */}
              {action === 'buy' && (
                <View style={[styles.inputGroup, { zIndex: 300 }]}>
                  <Text style={styles.label}>Tasarruf Türü</Text>
                  <TouchableOpacity 
                    style={styles.dropdownSelector}
                    onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                  >
                    <Text style={styles.dropdownSelectorText}>
                      {types.find(t => t.value === type)?.label || 'Seçiniz'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
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
                            if (t.value === 'CURRENCY') setCode('USD');
                            else if (t.value === 'GOLD') setCode('gram-altin');
                            else if (t.value === 'SILVER') setCode('gumus');
                            else setCode('');
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{t.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Code Select */}
              {action === 'buy' && type !== 'FUND' && (
                <View style={[styles.inputGroup, { zIndex: 200 }]}>
                  <Text style={styles.label}>Varlık Seçimi</Text>
                  <TouchableOpacity 
                    style={styles.dropdownSelector}
                    onPress={() => setShowCodeDropdown(!showCodeDropdown)}
                  >
                    <Text style={styles.dropdownSelectorText}>{code || 'Seçiniz'}</Text>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
                  </TouchableOpacity>
                  {showCodeDropdown && (
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {codeOptions.map(c => (
                        <TouchableOpacity 
                          key={c.value} 
                          style={styles.dropdownItem}
                          onPress={() => {
                            setCode(c.value);
                            setShowCodeDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Fund Code Input */}
              {action === 'buy' && type === 'FUND' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Fon Kodu (Örn: AFT)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Fon Kodu"
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              {/* Bank Select */}
              {action === 'buy' && code === 'gram-altin' && (
                <View style={[styles.inputGroup, { zIndex: 100 }]}>
                  <Text style={styles.label}>Banka / Piyasa</Text>
                  <TouchableOpacity 
                    style={styles.dropdownSelector}
                    onPress={() => setShowBankDropdown(!showBankDropdown)}
                  >
                    <Text style={styles.dropdownSelectorText}>{bank || 'Serbest Piyasa'}</Text>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
                  </TouchableOpacity>
                  {showBankDropdown && (
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {banks.map(b => (
                        <TouchableOpacity 
                          key={b.value} 
                          style={styles.dropdownItem}
                          onPress={() => {
                            setBank(b.value);
                            setShowBankDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{b.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Miktar</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>{action === 'edit' ? 'Maliyet (₺)' : 'Fiyat (₺)'}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
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
                  <Text style={styles.submitBtnText}>Kaydet</Text>
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
    marginBottom: 24,
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
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
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
    fontSize: 16,
    color: '#0f172a',
  },
  dropdownList: {
    position: 'absolute',
    top: 76,
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
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#10b981',
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
