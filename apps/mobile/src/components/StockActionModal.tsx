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
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const skipSearchRef = React.useRef(false);

  // Reset states when modal opens
  React.useEffect(() => {
    if (visible) {
      const initSymbol = stock?.symbol || '';
      setSymbol(initSymbol);
      setSearchQuery(initSymbol);
      setQuantity(action === 'edit' ? String(stock?.quantity || '') : '');
      setPrice(action === 'edit' ? String(stock?.averageCost || '') : '');
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [visible]);

  React.useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await fetchApi<any[]>(`/stocks/search?q=${searchQuery}`);
        setSearchResults(results || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectStock = async (selectedSymbol: string) => {
    let finalSymbol = selectedSymbol.toUpperCase();
    skipSearchRef.current = true;
    setSymbol(finalSymbol);
    setSearchQuery(finalSymbol);
    setShowDropdown(false);

    try {
      const cleanSymbol = finalSymbol.replace('.IS', '');
      const quote = await fetchApi<any>(`/stocks/${cleanSymbol}/quote`);
      if (quote && quote.regularMarketPrice) {
        setPrice(quote.regularMarketPrice.toString());
      }
    } catch (error) {
      // Silently ignore if quote fails
    }
  };

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
            <View style={[styles.inputGroup, { zIndex: 100 }]}>
              <Text style={styles.label}>Hisse Kodu (Örn: THYAO)</Text>
              <TextInput
                style={styles.input}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setSymbol(text);
                  setShowDropdown(true);
                }}
                placeholder="Hisse Ara... (örn: THYAO)"
                autoCapitalize="characters"
                editable={action === 'buy' && !stock} // Only editable for new buys without selected stock
              />
              
              {showDropdown && (searchQuery.length >= 2) && (
                <View style={styles.dropdown}>
                  {isSearching ? (
                    <Text style={styles.dropdownEmptyText}>Aranıyor...</Text>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.dropdownItem}
                        onPress={() => handleSelectStock(result.symbol)}
                      >
                        <Text style={styles.dropdownSymbol}>{result.symbol}</Text>
                        <Text style={styles.dropdownName} numberOfLines={1}>{result.shortname || result.longname}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.dropdownEmptyText}>Sonuç bulunamadı</Text>
                  )}
                </View>
              )}
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
  dropdown: {
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
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dropdownName: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  dropdownEmptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
  },
});
