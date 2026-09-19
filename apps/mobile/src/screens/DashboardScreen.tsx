import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 32 - CARD_MARGIN * 2) / 2; // 32 is horizontal padding

const MENU_ITEMS = [
  { id: '0', title: 'Kontrol Paneli', icon: 'grid-outline' },
  { id: '1', title: 'İşlemler', icon: 'swap-horizontal-outline' },
  { id: '2', title: 'Taksitli Borçlar', icon: 'card-outline' },
  { id: '3', title: 'Taksitli Alacaklar', icon: 'wallet-outline' },
  { id: '4', title: 'Hisselerim', icon: 'trending-up-outline' },
  { id: '5', title: 'Kripto Varlıklar', icon: 'logo-bitcoin' },
  { id: '6', title: 'Altın & Döviz', icon: 'cash-outline' },
  { id: '7', title: 'Hesaplar', icon: 'business-outline' },
  { id: '8', title: 'Abonelikler', icon: 'sync-outline' },
  { id: '9', title: 'Hatırlatıcılar', icon: 'notifications-outline', badge: 2 },
  { id: '10', title: 'Takvim', icon: 'calendar-outline' },
  { id: '11', title: 'Raporlar', icon: 'bar-chart-outline' },
  { id: '12', title: 'Garanti & Fatura', icon: 'shield-checkmark-outline' },
  { id: '13', title: 'Fatura Tarama (AI)', icon: 'scan-outline' },
];

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);

  const handlePress = (id: string) => {
    const routes: Record<string, string> = {
      '0': 'Overview',
      '1': 'Transactions',
      '2': 'Debts',
      '3': 'Receivables',
      '4': 'Stocks',
      '5': 'Crypto',
      '6': 'Savings',
      '7': 'Accounts',
      '8': 'Subscriptions',
      '9': 'Reminders',
      '10': 'Calendar',
      '11': 'Reports',
      '12': 'Warranties',
      '13': 'InvoiceScanner',
    };
    
    if (routes[id]) {
      navigation.navigate(routes[id]);
    }
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : (user?.username || 'Kullanıcı');
  
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.avatarClickArea} 
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.centerTitleContainer} pointerEvents="none">
          <Text style={styles.userName}>{displayName}</Text>
        </View>

        <View style={styles.rightIconsContainer}>
          <TouchableOpacity style={styles.bellContainer}>
            <Ionicons name="notifications-outline" size={24} color="#111827" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>10</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsContainer}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo Area */}
        <View style={styles.logoWrapper}>
          <Image source={require('../../assets/logo.jpg')} style={styles.logoImage} />
          <Text style={styles.logoTextMain}>Aile Finans</Text>
        </View>

        {/* Menu Grid */}
        <View style={styles.gridContainer}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.card} 
              activeOpacity={0.7}
              onPress={() => handlePress(item.id)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon as any} size={20} color="#8b5cf6" />
                </View>
                {item.badge && (
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={styles.chevron} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarClickArea: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  centerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#7c3aed',
    fontWeight: '600',
    fontSize: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellContainer: {
    position: 'relative',
    padding: 4,
  },
  settingsContainer: {
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  logoImage: {
    width: 48,
    height: 48,
    marginRight: 12,
    borderRadius: 8,
  },
  logoTextMain: {
    fontSize: 20,
    fontWeight: '400',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 'auto',
    marginRight: 4,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chevron: {
    marginLeft: 'auto',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
});
