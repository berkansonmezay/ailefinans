import React, { useState } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';

interface StockActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action: 'buy' | 'sell' | 'edit' | null;
  stock?: any; // The selected stock item
}

export const StockActionModal = ({ visible, onClose, onSuccess, action, stock }: StockActionModalProps) => {
  const [symbol, setSymbol] = useState(stock?.symbol || '');
  const [quantity, setQuantity] = useState(action === 'edit' ? String(stock?.quantity || '') : '');
  const [price, setPrice] = useState(action === 'edit' ? String(stock?.averageCost || '') : '');
  const [loading, setLoading] = useState(false);

  // Reset states when modal opens
  React.useEffect(() => {
    if (visible) {
      setSymbol(stock?.symbol || '');
      setQuantity(action === 'edit' ? String(stock?.quantity || '') : '');
      setPrice(action === 'edit' ? String(stock?.averageCost || '') : '');
    }
  }, [visible, action, stock]);

  const handleSubmit = async () => {
    if (!symbol || !quantity || !price) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    try {
      setLoading(true);
      let finalSymbol = symbol.trim().toUpperCase();
      if (!finalSymbol.includes('.') && action !== 'edit') {
        finalSymbol = `${finalSymbol}.IS`; // Append .IS for BIST stocks if buying new
      }

      const cleanSymbol = finalSymbol.replace('.IS', ''); // For endpoint paths

      if (action === 'buy') {
        await fetchApi('/stocks/buy', {
          method: 'POST',
          body: JSON.stringify({
            symbol: finalSymbol,
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            date: new Date().toISOString().split('T')[0],
          }),
        });
      } else if (action === 'sell') {
        if (stock && parseFloat(quantity) > stock.quantity) {
          Alert.alert('Hata', 'Sahip olduğunuzdan fazla lot satamazsınız.');
          setLoading(false);
          return;
        }
        await fetchApi('/stocks/sell', {
          method: 'POST',
          body: JSON.stringify({
            symbol: finalSymbol,
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            date: new Date().toISOString().split('T')[0],
          }),
        });
      } else if (action === 'edit') {
        await fetchApi(`/stocks/${cleanSymbol}`, {
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
    if (action === 'buy') return 'Hisse Al';
    if (action === 'sell') return 'Hisse Sat';
    if (action === 'edit') return 'Hisse Düzenle';
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
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hisse Kodu (Örn: THYAO)</Text>
              <TextInput
                style={styles.input}
                value={symbol}
                onChangeText={setSymbol}
                placeholder="THYAO"
                autoCapitalize="characters"
                editable={action === 'buy' && !stock} // Only editable for new buys without selected stock
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Lot Sayısı</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="100"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>{action === 'edit' ? 'Ortalama Maliyet (₺)' : 'Fiyat (₺)'}</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="150.50"
                  keyboardType="numeric"
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
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
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
