import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { fetchApi, getAvatarUrl } from '../lib/api';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, setUser, logout } = useContext(AuthContext);

  const [username, setUsername] = useState(user?.username || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadAvatarAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || `avatar_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      } as any);

      const res = await fetchApi<any>('/auth/avatar', {
        method: 'POST',
        body: formData,
      });

      const newAvatarUrl = res?.data?.avatarUrl || res?.avatarUrl;
      if (newAvatarUrl && user) {
        const updatedUser = { ...user, avatarUrl: newAvatarUrl };
        setUser(updatedUser);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi.');
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      Alert.alert('Hata', error.message || 'Profil fotoğrafı yüklenemedi.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickFromCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin Gerekli', 'Kamera ile fotoğraf çekebilmek için kamera erişim izni vermeniz gerekmektedir.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadAvatarAsset(result.assets[0]);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      Alert.alert('Hata', 'Kamera açılırken bir sorun oluştu.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin Gerekli', 'Galeriden fotoğraf seçebilmek için fotoğraf kitaplığına erişim izni vermeniz gerekmektedir.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadAvatarAsset(result.assets[0]);
      }
    } catch (err: any) {
      console.error('Gallery error:', err);
      Alert.alert('Hata', 'Galeri açılırken bir sorun oluştu.');
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert(
      'Fotoğrafı Kaldır',
      'Mevcut profil fotoğrafınızı kaldırmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            setUploadingAvatar(true);
            try {
              await fetchApi('/auth/avatar', { method: 'DELETE' });
              if (user) {
                const updatedUser = { ...user, avatarUrl: null };
                setUser(updatedUser);
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
                Alert.alert('Başarılı', 'Profil fotoğrafınız kaldırıldı.');
              }
            } catch (err: any) {
              Alert.alert('Hata', err.message || 'Fotoğraf kaldırılamadı.');
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ]
    );
  };

  const showAvatarOptions = () => {
    if (uploadingAvatar) return;
    const buttons: any[] = [
      { text: '📷 Kamera ile Çek', onPress: handlePickFromCamera },
      { text: '🖼️ Galeriden Seç', onPress: handlePickFromGallery },
    ];
    if (user?.avatarUrl) {
      buttons.push({ text: '🗑️ Fotoğrafı Kaldır', onPress: handleRemoveAvatar, style: 'destructive' });
    }
    buttons.push({ text: 'İptal', style: 'cancel' });

    Alert.alert('Profil Fotoğrafı', 'Profil fotoğrafınızı güncellemek için bir seçenek seçin:', buttons);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchApi<any>('/auth/me')
        .then(async (userData) => {
          const u = userData?.data || userData;
          if (u && setUser) {
            setUser(u);
            await AsyncStorage.setItem('userData', JSON.stringify(u));
          }
        })
        .catch(() => {});
    }, [setUser])
  );

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    Keyboard.dismiss();
    setLoading(true);
    
    try {
      const data: any = {};
      if (username !== user?.username) data.username = username;
      if (firstName !== user?.firstName) data.firstName = firstName;
      if (lastName !== user?.lastName) data.lastName = lastName;
      
      if (password) {
        if (password !== confirmPassword) {
          Alert.alert('Hata', 'Şifreler eşleşmiyor.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
          setLoading(false);
          return;
        }
        data.password = password;
      }
      
      if (Object.keys(data).length === 0) {
        Alert.alert('Bilgi', 'Değişiklik yapılmadı.');
        setLoading(false);
        return;
      }
      
      const res = await fetchApi<any>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      if (user && (res.data || res)) {
        setUser({
          ...user,
          username: res.data?.username || res.username,
          firstName: res.data?.firstName || res.firstName,
          lastName: res.data?.lastName || res.lastName,
        });
      }
      
      Alert.alert('Başarılı', 'Profiliniz başarıyla güncellendi.');
      setPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Hata', error.message || 'Profil güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Çıkış", 
          style: "destructive",
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profilim</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Area */}
            <View style={styles.pageInfo}>
              <TouchableOpacity 
                style={styles.avatarWrapper} 
                onPress={showAvatarOptions}
                activeOpacity={0.8}
                disabled={uploadingAvatar}
              >
                <View style={styles.avatarLarge}>
                  {user?.avatarUrl && getAvatarUrl(user.avatarUrl) ? (
                    <Image source={{ uri: getAvatarUrl(user.avatarUrl)! }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarLargeText}>
                      {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                    </Text>
                  )}
                  {uploadingAvatar && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                </View>
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={13} color="#ffffff" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.changePhotoButton}
                onPress={showAvatarOptions}
                disabled={uploadingAvatar}
              >
                <Ionicons name="camera-outline" size={15} color="#4f46e5" />
                <Text style={styles.changePhotoText}>
                  {user?.avatarUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}
                </Text>
              </TouchableOpacity>

              {user?.username ? (
                <Text style={styles.pageInfoUsername}>@{user.username}</Text>
              ) : null}
              <Text style={styles.pageInfoSubtitle}>Kişisel bilgilerinizi ve şifrenizi güncelleyin.</Text>
            </View>

            {/* Kişisel Bilgiler */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-outline" size={20} color="#6366f1" />
                <Text style={styles.cardTitle}>Kişisel Bilgiler</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kullanıcı Adı</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Kullanıcı adınızı girin"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Ad</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Ad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Soyad</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Soyad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-posta Adresi (Değiştirilemez)</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={user?.email || ''}
                  editable={false}
                  placeholder="E-posta"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              {/* Şifre Değiştirme Alanı */}
              <View style={styles.divider} />
              
              <View style={styles.cardHeader}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                <Text style={styles.cardTitle}>Şifre Değiştirme</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Yeni Şifre</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Değiştirmek istemiyorsanız boş bırakın"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Yeni Şifre Tekrar</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Tekrar girin"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Hesap Güvenliği & Rol */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />
                <Text style={styles.cardTitle}>Hesap Güvenliği & Rol</Text>
              </View>
              
              <View style={styles.roleBox}>
                <Text style={styles.roleBoxLabel}>AKTİF KURUM ROLÜNÜZ</Text>
                <View style={styles.roleBoxContent}>
                  <Text style={styles.roleBoxValue}>{user?.activeTenantName || 'Kurum Bulunamadı'}</Text>
                  
                  <View style={[styles.roleBadge, user?.role === 'OWNER' ? styles.roleBadgeOwner : styles.roleBadgeStandard]}>
                    <Text style={[styles.roleBadgeText, user?.role === 'OWNER' ? styles.roleBadgeTextOwner : styles.roleBadgeTextStandard]}>
                      {user?.role === 'OWNER' ? 'Yönetici' : 'Standart Üye'}
                    </Text>
                  </View>
                </View>
                {user?.role === 'OWNER' && (
                  <Text style={styles.roleBoxDesc}>
                    Yönetici olduğunuz için bu kuruma yeni üyeler ekleyebilir, kurum ayarlarını değiştirebilirsiniz.
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
            </TouchableOpacity>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageInfo: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#c7d2fe',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    marginBottom: 10,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4f46e5',
  },
  pageInfoUsername: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  pageInfoSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  roleBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  roleBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  roleBoxContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBoxValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleBadgeOwner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  roleBadgeStandard: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleBadgeTextOwner: {
    color: '#d97706',
  },
  roleBadgeTextStandard: {
    color: '#64748b',
  },
  roleBoxDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  }
});
