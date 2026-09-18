import React, { useState } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

interface CryptoActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action: 'buy' | 'sell' | 'edit' | null;
  crypto?: any;
}

export const CryptoActionModal = ({ visible, onClose, onSuccess, action, crypto }: CryptoActionModalProps) => {
  const [symbol, setSymbol] = useState(crypto?.symbol || '');
  const [quantity, setQuantity] = useState(action === 'edit' ? String(crypto?.quantity || '') : '');
  const [price, setPrice] = useState(action === 'edit' ? String(crypto?.averageCost || '') : '');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setSymbol(crypto?.symbol || '');
      setQuantity(action === 'edit' ? String(crypto?.quantity || '') : '');
      setPrice(action === 'edit' ? String(crypto?.averageCost || '') : '');
    }
  }, [visible, action, crypto]);

  const handleSubmit = async () => {
    if (!symbol || !quantity || !price) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    try {
      setLoading(true);
      const finalSymbol = symbol.trim().toUpperCase();

      if (action === 'buy') {
        await fetchApi('/crypto/buy', {
          method: 'POST',
          body: JSON.stringify({
            symbol: finalSymbol,
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            date: new Date().toISOString(),
          }),
        });
      } else if (action === 'sell') {
        if (crypto && parseFloat(quantity) > crypto.quantity) {
          Alert.alert('Hata', 'Sahip olduğunuzdan fazla miktar satamazsınız.');
          setLoading(false);
          return;
        }
        await fetchApi('/crypto/sell', {
          method: 'POST',
          body: JSON.stringify({
            symbol: finalSymbol,
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            date: new Date().toISOString(),
          }),
        });
      } else if (action === 'edit') {
        await fetchApi(`/crypto/${finalSymbol}`, {
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
    if (action === 'buy') return 'Kripto Al / Ekle';
    if (action === 'sell') return 'Kripto Sat';
    if (action === 'edit') return 'Kripto Düzenle';
    return '';
  };

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

          <View style={styles.form}>
            {(!crypto || action === 'buy') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sembol (Örn: BTC)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="BTC"
                  value={symbol}
                  onChangeText={setSymbol}
                  autoCapitalize="characters"
                  editable={action !== 'edit'}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Miktar</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{action === 'edit' ? 'Ortalama Maliyet (₺)' : 'Fiyat (₺)'}</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
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
                <Text style={styles.submitBtnText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
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
