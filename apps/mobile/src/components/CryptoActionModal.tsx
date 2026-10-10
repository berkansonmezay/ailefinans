import React, { useState } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../lib/api';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { useTheme } from '../context/ThemeContext';

interface CryptoActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action: 'buy' | 'sell' | 'edit' | null;
  crypto?: any;
}

export const CryptoActionModal = ({ visible, onClose, onSuccess, action, crypto }: CryptoActionModalProps) => {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const skipSearchRef = React.useRef(false);

  React.useEffect(() => {
    if (visible) {
      const initSymbol = crypto?.symbol || '';
      setSymbol(initSymbol);
      setSearchQuery(initSymbol);
      setQuantity(action === 'edit' ? String(crypto?.quantity || '') : '');
      setPrice(action === 'edit' ? String(crypto?.averageCost || '') : '');
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [visible]); // Only run when visible changes to avoid losing focus on every prop change

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
        const results = await fetchApi<any[]>(`/crypto/search?q=${searchQuery}`);
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

  const handleSelectCrypto = async (selectedSymbol: string) => {
    let finalSymbol = selectedSymbol.toUpperCase();
    skipSearchRef.current = true;
    setSymbol(finalSymbol);
    setSearchQuery(finalSymbol);
    setShowDropdown(false);

    try {
      const quote = await fetchApi<any>(`/crypto/${finalSymbol}/quote`);
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

  const { overlayKeyboardStyle, maxContentHeight } = useModalKeyboard();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, overlayKeyboardStyle]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={[styles.modalContent, { maxHeight: maxContentHeight }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
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
              {(!crypto || action === 'buy') && (
                <View style={[styles.inputGroup, { zIndex: 100 }]}>
                  <Text style={styles.label}>Sembol (Örn: BTC)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Kripto Ara... (örn: BTC)"
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      setSymbol(text);
                      setShowDropdown(true);
                    }}
                    autoCapitalize="characters"
                    editable={action !== 'edit'}
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
                            onPress={() => handleSelectCrypto(result.symbol)}
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
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Miktar</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
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
                  placeholderTextColor={colors.textMuted}
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
  dropdown: {
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
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dropdownName: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  dropdownEmptyText: {
    padding: 16,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
  },
});
