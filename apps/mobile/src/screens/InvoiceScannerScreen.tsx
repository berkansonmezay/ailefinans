import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Dimensions, Image, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { fetchApi } from '../lib/api';

const { width } = Dimensions.get('window');

interface SelectedFileAsset {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export const InvoiceScannerScreen = ({ navigation }: any) => {
  const [documentType, setDocumentType] = useState<'invoice' | 'warranty'>('invoice');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SelectedFileAsset | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Dynamic Options
  const [categories, setCategories] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'CASH' | 'BANK_TRANSFER'>('CREDIT_CARD');

  // Past scanned invoices
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadHistory();
    loadOptions();
  }, []);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetchApi<any>('/invoices');
      const list = Array.isArray(res) ? res : (res.items || res.data || []);
      setInvoices(list);
    } catch (e) {
      console.error('Fatura geçmişi yüklenirken hata:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [catRes, merRes] = await Promise.all([
        fetchApi<any>('/categories').catch(() => []),
        fetchApi<any>('/merchants').catch(() => []),
      ]);
      const catList = Array.isArray(catRes) ? catRes : (catRes.items || catRes.data || []);
      const merList = Array.isArray(merRes) ? merRes : (merRes.items || merRes.data || []);
      setCategories(catList);
      setMerchants(merList);
    } catch (e) {
      console.error('Seçenekler yüklenirken hata:', e);
    }
  };

  // Match merchant from vendor name
  const matchMerchantAndCategory = (vendorName: string, categoryHint?: string) => {
    if (vendorName && merchants.length > 0) {
      const vClean = vendorName.trim().toLowerCase();
      const matched = merchants.find(m => 
        m.name.toLowerCase().includes(vClean) || vClean.includes(m.name.toLowerCase())
      );
      if (matched) {
        setSelectedMerchantId(matched.id);
        if (matched.defaultCategoryId) {
          setSelectedCategoryId(matched.defaultCategoryId);
          return;
        }
      }
    }

    if (categoryHint && categories.length > 0) {
      const cClean = categoryHint.trim().toLowerCase();
      const matchedCat = categories.find(c => 
        c.name.toLowerCase().includes(cClean) || cClean.includes(c.name.toLowerCase())
      );
      if (matchedCat) {
        setSelectedCategoryId(matchedCat.id);
        return;
      }
    }

    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  };

  // 1. Camera Capture
  const handlePickFromCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin Gerekli', 'Kamera ile fatura tarayabilmek için kamera erişim izni vermeniz gerekmektedir.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileAsset: SelectedFileAsset = {
          uri: asset.uri,
          name: asset.fileName || `scan_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize,
        };
        setSelectedAsset(fileAsset);
        processDocumentWithAI(fileAsset);
      }
    } catch (error: any) {
      console.error('Kamera hatası:', error);
      Alert.alert('Hata', 'Kamera açılırken bir sorun oluştu.');
    }
  };

  // 2. Gallery Pick
  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin Gerekli', 'Galeriden belge seçebilmek için fotoğraf kitaplığına erişim izni vermeniz gerekmektedir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileAsset: SelectedFileAsset = {
          uri: asset.uri,
          name: asset.fileName || `gallery_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize,
        };
        setSelectedAsset(fileAsset);
        processDocumentWithAI(fileAsset);
      }
    } catch (error: any) {
      console.error('Galeri hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir sorun oluştu.');
    }
  };

  // 3. Document / PDF Pick
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        const fileAsset: SelectedFileAsset = {
          uri: doc.uri,
          name: doc.name || `doc_${Date.now()}.pdf`,
          mimeType: doc.mimeType || (doc.name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          size: doc.size,
        };
        setSelectedAsset(fileAsset);
        processDocumentWithAI(fileAsset);
      }
    } catch (error: any) {
      console.error('Belge seçme hatası:', error);
      Alert.alert('Hata', 'Belge seçilirken bir sorun oluştu.');
    }
  };

  // 4. Real AI / OCR Server Processing
  const processDocumentWithAI = async (asset: SelectedFileAsset) => {
    setIsProcessing(true);
    setExtractedData(null);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
        name: asset.name || 'document.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
      formData.append('documentType', documentType);

      const res = await fetchApi<any>('/invoices/extract', {
        method: 'POST',
        body: formData,
      });

      const data = res || {};
      if (documentType === 'invoice') {
        const parsed = {
          vendorName: data.vendorName || data.merchantName || 'Bilinmeyen Satıcı',
          invoiceDate: data.invoiceDate ? data.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
          invoiceNumber: data.invoiceNumber || '',
          totalAmount: data.totalAmount ? String(data.totalAmount) : '',
          taxAmount: data.taxAmount ? String(data.taxAmount) : '',
          categoryHint: data.categoryName || '',
        };
        setExtractedData(parsed);
        matchMerchantAndCategory(parsed.vendorName, parsed.categoryHint);
      } else {
        const today = new Date().toISOString().split('T')[0];
        const parsed = {
          productName: data.productName || data.itemName || 'Elektronik Cihaz',
          brand: data.brand || '',
          model: data.model || '',
          serialNumber: data.serialNumber || '',
          purchaseDate: data.purchaseDate ? data.purchaseDate.split('T')[0] : today,
          purchasePrice: data.purchasePrice ? String(data.purchasePrice) : '',
          warrantyMonths: data.warrantyMonths ? String(data.warrantyMonths) : '24',
          warrantyEndDate: data.warrantyEndDate ? data.warrantyEndDate.split('T')[0] : '',
          purchasePlace: data.purchasePlace || data.vendorName || '',
        };
        setExtractedData(parsed);
      }
    } catch (error: any) {
      console.warn('Sunucu OCR yanıt veremedi veya dosya işlenemedi, manuel düzenleme modu açılıyor:', error);
      // Fallback form for user convenience so they don't lose progress
      if (documentType === 'invoice') {
        const fallback = {
          vendorName: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          invoiceNumber: '',
          totalAmount: '',
          taxAmount: '',
          categoryHint: '',
        };
        setExtractedData(fallback);
      } else {
        const today = new Date().toISOString().split('T')[0];
        const fallback = {
          productName: '',
          brand: '',
          model: '',
          serialNumber: '',
          purchaseDate: today,
          purchasePrice: '',
          warrantyMonths: '24',
          warrantyEndDate: '',
          purchasePlace: '',
        };
        setExtractedData(fallback);
      }
      Alert.alert(
        'Belge Yüklendi',
        'Belge başarıyla yüklendi ancak sunucudan otomatik metin okunamadı. Lütfen alanları kontrol edip doldurunuz.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Test Sample Simulator
  const handleUseSample = (type: 'market' | 'tech') => {
    setIsProcessing(true);
    setExtractedData(null);
    setSelectedAsset(null);

    setTimeout(() => {
      if (documentType === 'invoice') {
        if (type === 'market') {
          const s = {
            vendorName: 'MİGROS TİCARET A.Ş.',
            invoiceDate: new Date().toISOString().split('T')[0],
            invoiceNumber: 'MGR202609180124',
            totalAmount: '478.50',
            taxAmount: '43.50',
            categoryHint: 'Gıda & Market',
          };
          setExtractedData(s);
          matchMerchantAndCategory(s.vendorName, s.categoryHint);
        } else {
          const s = {
            vendorName: 'TEKNOSA İÇ VE DIŞ TİC.',
            invoiceDate: new Date().toISOString().split('T')[0],
            invoiceNumber: 'TKN202609190089',
            totalAmount: '1250.00',
            taxAmount: '225.00',
            categoryHint: 'Elektronik',
          };
          setExtractedData(s);
          matchMerchantAndCategory(s.vendorName, s.categoryHint);
        }
      } else {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setFullYear(endDate.getFullYear() + 2);

        setExtractedData({
          productName: 'Philips Kahve Makinesi EP2220',
          brand: 'Philips',
          model: 'Series 2200',
          serialNumber: 'PH-2026-981245',
          purchaseDate: today.toISOString().split('T')[0],
          purchasePrice: '14500.00',
          warrantyMonths: '24',
          warrantyEndDate: endDate.toISOString().split('T')[0],
          purchasePlace: 'MediaMarkt',
        });
      }
      setIsProcessing(false);
    }, 600);
  };

  // Save as Expense Transaction
  const handleSaveAsExpense = async () => {
    if (!extractedData) return;
    const numAmount = parseFloat(String(extractedData.totalAmount || '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Geçersiz Tutar', 'Lütfen geçerli bir harcama tutarı girin.');
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        amount: numAmount,
        type: 'EXPENSE',
        description: `${extractedData.vendorName || 'Fatura'} Harcaması`,
        date: new Date(extractedData.invoiceDate || new Date()).toISOString(),
        paymentMethod,
      };

      if (selectedCategoryId) payload.categoryId = selectedCategoryId;
      if (selectedMerchantId) payload.merchantId = selectedMerchantId;

      await fetchApi('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      Alert.alert('Başarılı', 'Fatura harcamanız gider işlemlerine başarıyla kaydedildi!', [
        { text: 'Tamam', onPress: () => { setExtractedData(null); setSelectedAsset(null); } }
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Harcama kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save to Invoices Tracker
  const handleSaveToInvoices = async () => {
    if (!extractedData) return;
    const numAmount = parseFloat(String(extractedData.totalAmount || '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Geçersiz Tutar', 'Lütfen geçerli bir fatura tutarı girin.');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        provider: extractedData.vendorName || 'Fatura Sağlayıcı',
        invoiceNumber: extractedData.invoiceNumber || null,
        amount: numAmount,
        currency: 'TRY',
        invoiceDate: new Date(extractedData.invoiceDate || new Date()).toISOString(),
        dueDate: new Date(extractedData.invoiceDate || new Date()).toISOString(),
        status: 'PAID',
      };

      await fetchApi('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      loadHistory();
      Alert.alert('Başarılı', 'Fatura başarıyla faturalar listenize kaydedildi!', [
        { text: 'Tamam', onPress: () => { setExtractedData(null); setSelectedAsset(null); } }
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Fatura kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save as Warranty
  const handleSaveAsWarranty = async () => {
    if (!extractedData) return;
    if (!extractedData.productName?.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ürün adını girin.');
      return;
    }

    try {
      setIsSaving(true);
      const pPrice = parseFloat(String(extractedData.purchasePrice || '').replace(',', '.'));
      const payload = {
        productName: extractedData.productName.trim(),
        brand: extractedData.brand?.trim() || null,
        model: extractedData.model?.trim() || null,
        serialNumber: extractedData.serialNumber?.trim() || null,
        category: 'Elektronik',
        purchaseDate: new Date(extractedData.purchaseDate || new Date()).toISOString(),
        purchasePrice: isNaN(pPrice) ? null : pPrice,
        currency: 'TRY',
        warrantyStartDate: new Date(extractedData.purchaseDate || new Date()).toISOString(),
        warrantyEndDate: extractedData.warrantyEndDate 
          ? new Date(extractedData.warrantyEndDate).toISOString() 
          : new Date().toISOString(),
        warrantyType: 'MANUFACTURER',
        purchasePlace: extractedData.purchasePlace?.trim() || null,
        reminderEnabled: true,
        remindBeforeDays: 30,
      };

      await fetchApi('/warranties', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      Alert.alert('Başarılı', 'Garanti belgesi başarıyla garanti listenize kaydedildi!', [
        { text: 'Tamam', onPress: () => { setExtractedData(null); setSelectedAsset(null); } }
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Garanti kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `₺${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fatura & Belge AI Tarayıcı</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Document Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[styles.typeBtn, documentType === 'invoice' && styles.typeBtnActive]}
            onPress={() => {
              setDocumentType('invoice');
              setExtractedData(null);
              setSelectedAsset(null);
            }}
          >
            <Ionicons name="receipt" size={18} color={documentType === 'invoice' ? '#6366f1' : '#64748b'} />
            <Text style={[styles.typeBtnText, documentType === 'invoice' && styles.typeBtnTextActive]}>
              Fatura / Fiş
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.typeBtn, documentType === 'warranty' && styles.typeBtnActive]}
            onPress={() => {
              setDocumentType('warranty');
              setExtractedData(null);
              setSelectedAsset(null);
            }}
          >
            <Ionicons name="shield-checkmark" size={18} color={documentType === 'warranty' ? '#6366f1' : '#64748b'} />
            <Text style={[styles.typeBtnText, documentType === 'warranty' && styles.typeBtnTextActive]}>
              Garanti Belgesi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scan Hero Card */}
        <View style={styles.scanHeroCard}>
          <View style={styles.scanIconCircle}>
            <Ionicons name="scan" size={38} color="#6366f1" />
          </View>
          <Text style={styles.scanHeroTitle}>
            {documentType === 'invoice' ? 'Fatura veya Fişinizi Yükleyin' : 'Garanti Belgenizi Yükleyin'}
          </Text>
          <Text style={styles.scanHeroDesc}>
            {documentType === 'invoice'
              ? 'Yapay zeka OCR motoru faturadaki tutarı, satıcıyı, tarihi ve KDV’yi otomatik okur.'
              : 'Belgedeki ürün adı, marka, model, seri numarası ve garanti bitiş süresi otomatik tespit edilir.'}
          </Text>

          {/* Selected File Badge */}
          {selectedAsset && (
            <View style={styles.selectedFileBadge}>
              <Ionicons 
                name={selectedAsset.mimeType.includes('pdf') ? 'document-text' : 'image'} 
                size={18} 
                color="#6366f1" 
              />
              <Text style={styles.selectedFileName} numberOfLines={1}>
                {selectedAsset.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedAsset(null)}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          {isProcessing ? (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.processingText}>Belge yapay zeka ile analiz ediliyor...</Text>
              <Text style={styles.processingSubText}>Tesseract OCR ve metin ayrıştırma çalışıyor</Text>
            </View>
          ) : (
            <View style={styles.actionGrid}>
              {/* 3 Real Pickers: Camera, Gallery, Document */}
              <View style={styles.scanButtonsRow}>
                <TouchableOpacity 
                  style={styles.primaryScanBtn}
                  onPress={handlePickFromCamera}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.primaryScanBtnText}>Kamera</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.secondaryScanBtn}
                  onPress={handlePickFromGallery}
                >
                  <Ionicons name="images" size={20} color="#6366f1" />
                  <Text style={styles.secondaryScanBtnText}>Galeri</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.documentScanBtn}
                  onPress={handlePickDocument}
                >
                  <Ionicons name="document-text" size={20} color="#0284c7" />
                  <Text style={styles.documentScanBtnText}>Dosya / PDF</Text>
                </TouchableOpacity>
              </View>

              {/* Sample Quick Simulation */}
              <View style={styles.sampleRow}>
                <Text style={styles.sampleLabel}>Test için örnek belge:</Text>
                <TouchableOpacity 
                  style={styles.sampleChip} 
                  onPress={() => handleUseSample('market')}
                >
                  <Text style={styles.sampleChipText}>Market Fişi</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sampleChip} 
                  onPress={() => handleUseSample('tech')}
                >
                  <Text style={styles.sampleChipText}>Elektronik</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* OCR Result Review Form */}
        {extractedData && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#6366f1" />
                <Text style={styles.resultTitle}>Çıkarılan Bilgiler (Kontrol Edin)</Text>
              </View>
              <TouchableOpacity onPress={() => { setExtractedData(null); setSelectedAsset(null); }}>
                <Ionicons name="close-circle" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              {documentType === 'invoice' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Satıcı / Kurum Adı *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={extractedData.vendorName}
                      onChangeText={(val) => setExtractedData({ ...extractedData, vendorName: val })}
                      placeholder="Örn: Migros, Trendyol..."
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* Registered Merchants Selector */}
                  {merchants.length > 0 && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Kayıtlı Mağaza / Harcama Yeri İle Eşle</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                        {merchants.map(m => {
                          const isSelected = selectedMerchantId === m.id;
                          return (
                            <TouchableOpacity
                              key={m.id}
                              style={[styles.miniChip, isSelected && styles.miniChipActive]}
                              onPress={() => setSelectedMerchantId(isSelected ? '' : m.id)}
                            >
                              <Text style={[styles.miniChipText, isSelected && styles.miniChipTextActive]}>
                                {m.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Categories Selector */}
                  {categories.length > 0 && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Harcama Kategorisi</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                        {categories.map(c => {
                          const isSelected = selectedCategoryId === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[styles.miniChip, isSelected && styles.miniChipActive]}
                              onPress={() => setSelectedCategoryId(c.id)}
                            >
                              <Text style={[styles.miniChipText, isSelected && styles.miniChipTextActive]}>
                                {c.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Fatura Tarihi</Text>
                      <TextInput
                        style={styles.formInput}
                        value={extractedData.invoiceDate}
                        onChangeText={(val) => setExtractedData({ ...extractedData, invoiceDate: val })}
                        placeholder="YYYY-AA-GG"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Fatura No</Text>
                      <TextInput
                        style={styles.formInput}
                        value={extractedData.invoiceNumber}
                        onChangeText={(val) => setExtractedData({ ...extractedData, invoiceNumber: val })}
                        placeholder="Opsiyonel"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1.2 }]}>
                      <Text style={styles.inputLabel}>Toplam Tutar (₺) *</Text>
                      <TextInput
                        style={[styles.formInput, { fontWeight: '800', color: '#0f172a', fontSize: 16 }]}
                        value={extractedData.totalAmount}
                        onChangeText={(val) => setExtractedData({ ...extractedData, totalAmount: val })}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>KDV Tutarı (₺)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={extractedData.taxAmount}
                        onChangeText={(val) => setExtractedData({ ...extractedData, taxAmount: val })}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  {/* Payment Method Selector */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Ödeme Yöntemi</Text>
                    <View style={styles.paymentMethodRow}>
                      {[
                        { id: 'CREDIT_CARD', label: 'Kredi Kartı', icon: 'card-outline' },
                        { id: 'CASH', label: 'Nakit', icon: 'cash-outline' },
                        { id: 'BANK_TRANSFER', label: 'Havale / EFT', icon: 'swap-horizontal-outline' },
                      ].map(p => (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.paymentBtn, paymentMethod === p.id && styles.paymentBtnActive]}
                          onPress={() => setPaymentMethod(p.id as any)}
                        >
                          <Ionicons 
                            name={p.icon as any} 
                            size={14} 
                            color={paymentMethod === p.id ? '#6366f1' : '#64748b'} 
                          />
                          <Text style={[styles.paymentBtnText, paymentMethod === p.id && styles.paymentBtnTextActive]}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* 2 Save Options for Invoice */}
                  <View style={{ gap: 8, marginTop: 10 }}>
                    <TouchableOpacity 
                      style={[styles.saveActionBtn, { backgroundColor: '#10b981' }, isSaving && { opacity: 0.7 }]}
                      onPress={handleSaveAsExpense}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="add-circle" size={18} color="#fff" />
                          <Text style={styles.saveActionBtnText}>Gider İşlemlerine Kaydet</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.saveActionBtn, { backgroundColor: '#6366f1' }, isSaving && { opacity: 0.7 }]}
                      onPress={handleSaveToInvoices}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="receipt" size={18} color="#fff" />
                          <Text style={styles.saveActionBtnText}>Fatura Takibine Ekle</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Ürün Adı *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={extractedData.productName}
                      onChangeText={(val) => setExtractedData({ ...extractedData, productName: val })}
                      placeholder="Örn: Televizyon, Kahve Makinesi..."
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Marka</Text>
                      <TextInput
                        style={styles.formInput}
                        value={extractedData.brand}
                        onChangeText={(val) => setExtractedData({ ...extractedData, brand: val })}
                        placeholder="Örn: Samsung"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Model</Text>
                      <TextInput
                        style={styles.formInput}
                        value={extractedData.model}
                        onChangeText={(val) => setExtractedData({ ...extractedData, model: val })}
                        placeholder="Örn: OLED 55"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Satın Alma Tarihi</Text>
                      <TextInput
                        style={styles.formInput}
                        value={extractedData.purchaseDate}
                        onChangeText={(val) => setExtractedData({ ...extractedData, purchaseDate: val })}
                        placeholder="YYYY-AA-GG"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Garanti Bitiş</Text>
                      <TextInput
                        style={styles.formInput}
                        value={extractedData.warrantyEndDate}
                        onChangeText={(val) => setExtractedData({ ...extractedData, warrantyEndDate: val })}
                        placeholder="YYYY-AA-GG"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Fiyat (₺)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={extractedData.purchasePrice}
                        onChangeText={(val) => setExtractedData({ ...extractedData, purchasePrice: val })}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Satın Alınan Yer</Text>
                      <TextInput
                        style={styles.formInput}
                        value={extractedData.purchasePlace}
                        onChangeText={(val) => setExtractedData({ ...extractedData, purchasePlace: val })}
                        placeholder="Örn: Vatan Bilgisayar"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Seri Numarası</Text>
                    <TextInput
                      style={styles.formInput}
                      value={extractedData.serialNumber}
                      onChangeText={(val) => setExtractedData({ ...extractedData, serialNumber: val })}
                      placeholder="Örn: SN-98124578"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.saveActionBtn, { backgroundColor: '#06b6d4', marginTop: 10 }, isSaving && { opacity: 0.7 }]}
                    onPress={handleSaveAsWarranty}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={18} color="#fff" />
                        <Text style={styles.saveActionBtnText}>Garanti Belgesi Olarak Kaydet</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* History / Previous Invoices */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Ionicons name="time" size={18} color="#0f172a" />
            <Text style={styles.historyTitle}>Son Kaydedilen Faturalar</Text>
          </View>

          {loadingHistory ? (
            <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 20 }} />
          ) : invoices.length === 0 ? (
            <Text style={styles.emptyHistoryText}>Henüz kayıtlı bir fatura bulunmuyor.</Text>
          ) : (
            invoices.slice(0, 5).map((inv, idx) => (
              <View key={inv.id || idx} style={styles.historyCard}>
                <View style={styles.historyIconBox}>
                  <Ionicons name="receipt-outline" size={20} color="#6366f1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyVendor}>{inv.provider || inv.merchantName || 'Fatura Kaydı'}</Text>
                  <Text style={styles.historyDate}>
                    {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('tr-TR') : 'Tarih Yok'} • {inv.invoiceNumber ? `No: ${inv.invoiceNumber}` : 'No Yok'}
                  </Text>
                </View>
                <Text style={styles.historyAmount}>{formatCurrency(inv.amount || inv.totalAmount || 0)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  scrollContent: { padding: 16, paddingBottom: 60 },

  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  typeBtnActive: {
    backgroundColor: '#eef2ff',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  typeBtnTextActive: {
    color: '#6366f1',
    fontWeight: '700',
  },

  scanHeroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  scanIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scanHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  scanHeroDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 17,
    paddingHorizontal: 10,
  },
  selectedFileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
    maxWidth: '90%',
  },
  selectedFileName: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  actionGrid: {
    width: '100%',
    gap: 12,
  },
  scanButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  primaryScanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryScanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryScanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  secondaryScanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
  },
  documentScanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  documentScanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  sampleLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  sampleChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sampleChipText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
  },

  processingBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  processingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
    marginTop: 8,
  },
  processingSubText: {
    fontSize: 11,
    color: '#94a3b8',
  },

  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  formGroup: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  miniChipActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  miniChipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  miniChipTextActive: {
    color: '#6366f1',
    fontWeight: '700',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  paymentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentBtnActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  paymentBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  paymentBtnTextActive: {
    color: '#6366f1',
    fontWeight: '700',
  },

  saveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  saveActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  historySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyVendor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  historyDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyHistoryText: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 16,
    fontSize: 12,
  },
});
