import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, ScrollView, Keyboard, TouchableWithoutFeedback, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../lib/api';

export const LoginScreen = () => {
  const { login } = useContext(AuthContext);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!identifier || !password) {
      Alert.alert('Hata', 'Lütfen kullanıcı adı/e-posta ve şifrenizi girin.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetchApi<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      
      const token = res?.tokens?.accessToken || res?.accessToken;
      if (token) {
        await login(token);
      } else {
        throw new Error('Giriş başarılı fakat token alınamadı.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Giriş Başarısız', error.message || 'Lütfen bilgilerinizi kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={styles.card}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBackground}>
                  <Image 
                    source={require('../../assets/logo.jpg')} 
                    style={styles.logoImage} 
                    resizeMode="cover"
                  />
                </View>
              </View>
              
              <Text style={styles.title}>Hoş Geldiniz</Text>
              <Text style={styles.subtitle}>Devam etmek için giriş yapın.</Text>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>E-posta veya Kullanıcı Adı</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Kullanıcı adı veya e-posta"
                    placeholderTextColor="#9ca3af"
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Şifre</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.forgotPasswordContainer}>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>Şifrenizi mi unuttunuz?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.loginButton} 
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Giriş Yap</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>Hesabınız yok mu? </Text>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>Kayıt Olun</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f3f4f6',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 
  },
  keyboardView: { 
    flex: 1, 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  logoContainer: { 
    alignItems: 'center', 
    marginBottom: 32 
  },
  logoBackground: {
    width: 64, 
    height: 64, 
    borderRadius: 16, 
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  logoImage: {
    width: 64,
    height: 64,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#111827', 
    textAlign: 'center',
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 15, 
    color: '#6b7280', 
    textAlign: 'center',
    marginBottom: 32 
  },
  formContainer: { 
    width: '100%' 
  },
  inputGroup: { 
    marginBottom: 16 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#374151', 
    marginBottom: 6 
  },
  input: { 
    width: '100%',
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    backgroundColor: '#ffffff',
    paddingVertical: 12, 
    paddingHorizontal: 14, 
    fontSize: 15, 
    color: '#111827' 
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: 4
  },
  linkText: {
    fontSize: 14,
    color: '#6366f1', // Indigo color for links
    fontWeight: '400',
  },
  loginButton: { 
    backgroundColor: '#6366f1', // Indigo button color
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginBottom: 32
  },
  loginButtonText: { 
    color: '#ffffff', 
    fontSize: 15, 
    fontWeight: '500' 
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  registerText: {
    fontSize: 14,
    color: '#6b7280'
  }
});
