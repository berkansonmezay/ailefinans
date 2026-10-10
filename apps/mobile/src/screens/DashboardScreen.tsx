import React, { useContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { fetchApi, getAvatarUrl } from '../lib/api';

const { width, height } = Dimensions.get('window');
const GRID_SPACING = 10;
const GRID_ITEM_WIDTH = (width - 36 - GRID_SPACING * 3) / 4;

interface UpcomingPaymentItem {
  id: string;
  title: string;
  date: string;
  amount: number;
  daysLeft: number;
  icon: string;
  color: string;
  bg: string;
  route?: string;
}

const QUICK_SERVICES = [
  { id: 'accounts', title: 'Hesaplar', icon: 'wallet-outline', route: 'Accounts' },
  { id: 'transactions', title: 'İşlemler', icon: 'swap-horizontal-outline', route: 'Transactions' },
  { id: 'debts', title: 'Taksitli Borçlar', icon: 'card-outline', route: 'Debts' },
  { id: 'receivables', title: 'Taksitli Alacaklar', icon: 'receipt-outline', route: 'Receivables' },
  { id: 'savings', title: 'Altın & Döviz', icon: 'cube-outline', route: 'Savings' },
  { id: 'stocks', title: 'Hisse Senetleri', icon: 'trending-up-outline', route: 'Stocks' },
  { id: 'crypto', title: 'Kripto Varlıklar', icon: 'logo-bitcoin', route: 'Crypto' },
  { id: 'subscriptions', title: 'Abonelikler', icon: 'sync-outline', route: 'Subscriptions' },
];

const ALL_MENU_SERVICES = [
  { id: 'overview', title: 'Kontrol Paneli', icon: 'grid-outline', color: '#6366f1', route: 'Overview' },
  { id: 'transactions', title: 'İşlemler', icon: 'swap-horizontal-outline', color: '#8b5cf6', route: 'Transactions' },
  { id: 'debts', title: 'Taksitli Borçlar', icon: 'card-outline', color: '#ec4899', route: 'Debts' },
  { id: 'receivables', title: 'Taksitli Alacaklar', icon: 'receipt-outline', color: '#10b981', route: 'Receivables' },
  { id: 'accounts', title: 'Hesaplar', icon: 'wallet-outline', color: '#14b8a6', route: 'Accounts' },
  { id: 'savings', title: 'Altın & Döviz', icon: 'cube-outline', color: '#eab308', route: 'Savings' },
  { id: 'stocks', title: 'Hisse Senetleri', icon: 'trending-up-outline', color: '#3b82f6', route: 'Stocks' },
  { id: 'crypto', title: 'Kripto Varlıklar', icon: 'logo-bitcoin', color: '#f59e0b', route: 'Crypto' },
  { id: 'subscriptions', title: 'Abonelikler', icon: 'sync-outline', color: '#a855f7', route: 'Subscriptions' },
  { id: 'calendar', title: 'Takvim', icon: 'calendar-outline', color: '#6366f1', route: 'Calendar' },
  { id: 'reminders', title: 'Hatırlatıcılar', icon: 'notifications-outline', color: '#f97316', route: 'Reminders' },
  { id: 'reports', title: 'Raporlar', icon: 'bar-chart-outline', color: '#06b6d4', route: 'Reports' },
  { id: 'warranties', title: 'Garanti & Fatura', icon: 'shield-checkmark-outline', color: '#10b981', route: 'Warranties' },
  { id: 'invoices', title: 'Fatura Tarama (AI)', icon: 'scan-outline', color: '#ec4899', route: 'InvoiceScanner', badge: 'BETA' },
];

export const DashboardScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useContext(AuthContext);
  const { unreadCount } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [isMoreModalVisible, setIsMoreModalVisible] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

  // Financial States
  const [totalAssets, setTotalAssets] = useState<number>(412500);
  const [totalDebts, setTotalDebts] = useState<number>(153750);
  const [netWorth, setNetWorth] = useState<number>(258750);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(18420);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPaymentItem[]>([
    {
      id: 'mock-1',
      title: 'Kredi Kartı Taksiti',
      date: '12 Ekim 2025',
      amount: 2850,
      daysLeft: 3,
      icon: 'card-outline',
      color: '#4f46e5',
      bg: '#e0e7ff',
      route: 'Debts',
    },
    {
      id: 'mock-2',
      title: 'Ev Kirası',
      date: '15 Ekim 2025',
      amount: 12000,
      daysLeft: 6,
      icon: 'home-outline',
      color: '#0284c7',
      bg: '#e0f2fe',
      route: 'Debts',
    },
    {
      id: 'mock-3',
      title: 'Elektrik Faturası',
      date: '18 Ekim 2025',
      amount: 1240,
      daysLeft: 9,
      icon: 'flash-outline',
      color: '#d97706',
      bg: '#fef3c7',
      route: 'Reminders',
    },
  ]);

  // Load eye toggle state from storage
  useEffect(() => {
    AsyncStorage.getItem('hide_home_balances').then((val) => {
      if (val !== null) setIsBalanceHidden(val === 'true');
    });
  }, []);

  const toggleHideBalances = async () => {
    const next = !isBalanceHidden;
    setIsBalanceHidden(next);
    await AsyncStorage.setItem('hide_home_balances', String(next));
  };

  const loadData = useCallback(async () => {
    try {
      // 1. User info
      fetchApi<any>('/auth/me')
        .then(async (userData) => {
          const u = userData?.data || userData;
          if (u && setUser) {
            setUser(u);
            await AsyncStorage.setItem('userData', JSON.stringify(u));
          }
        })
        .catch(() => {});

      // 2. Load KPIs and Asset Breakdown
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [kpisRes, accountsRes, savingsRes, cryptoRes, stocksRes] = await Promise.all([
        fetchApi<any>(`/dashboard/kpis?startDate=${startOfMonth}&endDate=${endOfMonth}`).catch(() => null),
        fetchApi<any>('/accounts?pageSize=100').catch(() => null),
        fetchApi<any>('/savings-assets').catch(() => null),
        fetchApi<any>('/crypto/summary').catch(() => null),
        fetchApi<any>('/stocks/summary').catch(() => null),
      ]);

      // Calculate total assets
      let calculatedAssets = 0;

      // Accounts
      const accountsList = Array.isArray(accountsRes) ? accountsRes : (accountsRes?.data || accountsRes?.items || []);
      if (Array.isArray(accountsList) && accountsList.length > 0) {
        calculatedAssets += accountsList.reduce((acc, curr) => acc + Number(curr.currentBalance || curr.initialBalance || 0), 0);
      }

      // Savings (Gold & Currency)
      const savingsList = Array.isArray(savingsRes) ? savingsRes : (savingsRes?.data || []);
      if (Array.isArray(savingsList) && savingsList.length > 0) {
        calculatedAssets += savingsList.reduce((acc, curr) => acc + Number(curr.totalValue || curr.currentValue || (curr.quantity * (curr.currentPrice || curr.purchasePrice || 0))), 0);
      }

      // Crypto
      if (cryptoRes?.totalValue) {
        calculatedAssets += Number(cryptoRes.totalValue || 0);
      }

      // Stocks
      if (stocksRes?.totalValue) {
        calculatedAssets += Number(stocksRes.totalValue || 0);
      }

      const debtAmount = Number(kpisRes?.totalDebt || 0);

      if (calculatedAssets > 0 || debtAmount > 0) {
        setTotalAssets(calculatedAssets > 0 ? calculatedAssets : 412500);
        setTotalDebts(debtAmount > 0 ? debtAmount : 153750);
        setNetWorth((calculatedAssets > 0 ? calculatedAssets : 412500) - (debtAmount > 0 ? debtAmount : 153750));
      }

      if (kpisRes?.totalExpense) {
        setMonthlyExpense(Number(kpisRes.totalExpense));
      }

      // 3. Upcoming Payments from calendar
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];

      fetchApi<any[]>(`/calendar?startDate=${todayStr}&endDate=${nextMonth}`)
        .then((calRes) => {
          if (Array.isArray(calRes) && calRes.length > 0) {
            const filtered = calRes
              .filter((item) => item.date >= todayStr && (item.type === 'DEBT_INSTALLMENT' || item.type === 'REMINDER'))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 3);

            if (filtered.length > 0) {
              const mapped: UpcomingPaymentItem[] = filtered.map((item) => {
                const itemDate = new Date(item.date);
                const diffTime = itemDate.getTime() - new Date(todayStr).getTime();
                const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                let icon = 'card-outline';
                let color = '#4f46e5';
                let bg = '#e0e7ff';
                const lowerTitle = (item.title || '').toLowerCase();

                if (lowerTitle.includes('kira') || lowerTitle.includes('ev') || lowerTitle.includes('aidat')) {
                  icon = 'home-outline';
                  color = '#0284c7';
                  bg = '#e0f2fe';
                } else if (lowerTitle.includes('fatura') || lowerTitle.includes('elektrik') || lowerTitle.includes('su') || lowerTitle.includes('gaz')) {
                  icon = 'flash-outline';
                  color = '#d97706';
                  bg = '#fef3c7';
                }

                const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                const formattedDate = `${itemDate.getDate()} ${months[itemDate.getMonth()]} ${itemDate.getFullYear()}`;

                return {
                  id: item.id,
                  title: item.title || 'Ödeme',
                  date: formattedDate,
                  amount: Number(item.amount || 0),
                  daysLeft: days,
                  icon,
                  color,
                  bg,
                  route: item.type === 'DEBT_INSTALLMENT' ? 'Debts' : 'Reminders',
                };
              });

              setUpcomingPayments(mapped);
            }
          }
        })
        .catch(() => {});
    } catch (e) {
      console.error('Home data load error:', e);
    }
  }, [setUser]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatMoney = (val: number) => {
    return `₺ ${Number(val || 0).toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const displayName = user?.firstName || user?.username || 'Berkan';
  const initial = displayName.charAt(0).toUpperCase();

  const visibleAllServices = useMemo(() => {
    let list = ALL_MENU_SERVICES;
    if (user?.disabledMenus && Array.isArray(user.disabledMenus) && user.disabledMenus.length > 0) {
      const MENU_ROUTE_KEYS: Record<string, string> = {
        Overview: 'overview',
        Transactions: 'transactions',
        Debts: 'debts',
        Receivables: 'receivables',
        Stocks: 'stocks',
        Crypto: 'crypto',
        Savings: 'savings',
        Accounts: 'accounts',
        Subscriptions: 'subscriptions',
        Reminders: 'reminders',
        Calendar: 'calendar',
        Reports: 'reports',
        Warranties: 'warranties',
        InvoiceScanner: 'invoices',
      };
      list = list.filter((item) => {
        const key = MENU_ROUTE_KEYS[item.route];
        return !key || !user.disabledMenus.includes(key);
      });
    }

    if (menuSearchQuery.trim()) {
      const q = menuSearchQuery.toLowerCase().trim();
      list = list.filter((item) => item.title.toLowerCase().includes(q));
    }

    return list;
  }, [user?.disabledMenus, menuSearchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarContainer}>
              {user?.avatarUrl && getAvatarUrl(user.avatarUrl) ? (
                <Image source={{ uri: getAvatarUrl(user.avatarUrl)! }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={9} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{displayName}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color="#1e293b" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={22} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />}
      >
        {/* HERO CARD: TOPLAM VARLIKLARIM */}
        <LinearGradient
          colors={['#10214c', '#183168', '#1c3e7f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.wealthCard}
        >
          {/* Decorative Sparkline / Wave */}
          <View style={styles.wealthWaveWrapper} pointerEvents="none">
            <Svg width={150} height={75} viewBox="0 0 180 90">
              <Defs>
                <SvgLinearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                  <Stop offset="100%" stopColor="#60a5fa" stopOpacity="0.0" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M0 65 Q 25 55, 45 42 T 90 38 T 130 20 T 180 14 L 180 90 L 0 90 Z"
                fill="url(#waveGrad)"
              />
              <Path
                d="M0 65 Q 25 55, 45 42 T 90 38 T 130 20 T 180 14"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </Svg>
          </View>

          {/* Top Row: Title + Eye on Left, Inline Trend Badge on Right */}
          <View style={styles.wealthCardTop}>
            <View style={styles.wealthTitleGroup}>
              <Text style={styles.wealthTitle}>Toplam Varlıklarım</Text>
              <TouchableOpacity
                onPress={toggleHideBalances}
                style={styles.eyeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={isBalanceHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>

            {/* Inline Trend Badge */}
            <View style={styles.trendChip}>
              <Ionicons name="arrow-up" size={11} color="#10b981" />
              <Text style={styles.trendText}>%12</Text>
              <Text style={styles.trendSeparator}>|</Text>
              <Text style={styles.trendPeriod}>Son 30 gün</Text>
            </View>
          </View>

          {/* Main Net Balance */}
          <Text style={styles.wealthMainAmount}>
            {isBalanceHidden ? '••••••••' : formatMoney(netWorth)}
          </Text>

          {/* Divider */}
          <View style={styles.wealthDivider} />

          {/* 3 Column Sub-Stats */}
          <View style={styles.wealthStatsRow}>
            <View style={styles.wealthStatCol}>
              <Text style={styles.wealthStatLabel}>Toplam Varlıklar</Text>
              <Text style={styles.wealthStatValue}>
                {isBalanceHidden ? '••••••' : formatMoney(totalAssets)}
              </Text>
            </View>

            <View style={styles.wealthStatSeparator} />

            <View style={styles.wealthStatCol}>
              <Text style={styles.wealthStatLabel}>Toplam Borçlar</Text>
              <Text style={[styles.wealthStatValue, { color: '#fca5a5' }]}>
                {isBalanceHidden ? '••••••' : formatMoney(totalDebts)}
              </Text>
            </View>

            <View style={styles.wealthStatSeparator} />

            <View style={styles.wealthStatCol}>
              <Text style={styles.wealthStatLabel}>Net Varlık</Text>
              <Text style={[styles.wealthStatValue, { color: '#93c5fd' }]}>
                {isBalanceHidden ? '••••••' : formatMoney(netWorth)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* QUICK ACTION BUTTONS (GELİR EKLE / GİDER EKLE) */}
        <View style={styles.actionsRow}>
          {/* Gelir Ekle */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Transactions', { initialType: 'INCOME', openModal: true })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="add" size={22} color="#16a34a" />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>Gelir Ekle</Text>
              <Text style={styles.actionSubtitle}>Yeni gelir kaydı oluştur</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#16a34a" />
          </TouchableOpacity>

          {/* Gider Ekle */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Transactions', { initialType: 'EXPENSE', openModal: true })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="remove" size={22} color="#dc2626" />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>Gider Ekle</Text>
              <Text style={styles.actionSubtitle}>Harcama kaydı oluştur</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* QUICK ACCESS (HIZLI ERİŞİM) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          <TouchableOpacity onPress={() => setIsMoreModalVisible(true)} activeOpacity={0.7}>
            <View style={styles.seeAllRow}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
              <Ionicons name="arrow-forward" size={13} color="#6366f1" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {QUICK_SERVICES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.quickCard}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.75}
            >
              <View style={styles.quickIconBox}>
                <Ionicons name={item.icon as any} size={22} color="#7c3aed" />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* UPCOMING PAYMENTS (YAKLAŞAN ÖDEMELER) */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.calendarIconSquare}>
              <Ionicons name="calendar-outline" size={16} color="#7c3aed" />
            </View>
            <Text style={styles.sectionTitle}>Yaklaşan Ödemeler</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Calendar')} activeOpacity={0.7}>
            <View style={styles.seeAllRow}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
              <Ionicons name="arrow-forward" size={13} color="#6366f1" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.upcomingContainer}>
          {upcomingPayments.map((item, index) => {
            const isUrgent = item.daysLeft <= 3;
            return (
              <React.Fragment key={item.id}>
                {index > 0 && <View style={styles.upcomingDivider} />}
                <TouchableOpacity
                  style={styles.upcomingItemRow}
                  onPress={() => navigation.navigate(item.route || 'Calendar')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.upcomingIconBox, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>

                  <View style={styles.upcomingInfoCol}>
                    <Text style={styles.upcomingItemTitle}>{item.title}</Text>
                    <Text style={styles.upcomingItemDate}>{item.date}</Text>
                  </View>

                  <View style={styles.upcomingRightCol}>
                    <Text style={styles.upcomingItemAmount}>
                      {isBalanceHidden ? '••••••' : formatMoney(item.amount)}
                    </Text>
                    <View style={[styles.daysBadge, isUrgent ? styles.daysBadgeUrgent : styles.daysBadgeNormal]}>
                      <Text style={[styles.daysBadgeText, isUrgent ? styles.daysTextUrgent : styles.daysTextNormal]}>
                        {item.daysLeft <= 0 ? 'Bugün' : `${item.daysLeft} gün kaldı`}
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* MONTHLY SPENDING / TARGET CARD */}
        <TouchableOpacity
          style={styles.spendingCard}
          onPress={() => navigation.navigate('Reports')}
          activeOpacity={0.85}
        >
          <View style={styles.spendingLeftCol}>
            <View style={styles.spendingHeaderRow}>
              <View style={styles.targetIconCircle}>
                <Ionicons name="disc-outline" size={18} color="#7c3aed" />
              </View>
              <Text style={styles.spendingCardTitle}>Bu ay toplam harcamanız</Text>
            </View>

            <Text style={styles.spendingCardAmount}>
              {isBalanceHidden ? '••••••' : formatMoney(monthlyExpense)}
            </Text>

            <View style={styles.spendingTrendRow}>
              <Ionicons name="arrow-down" size={12} color="#10b981" />
              <Text style={styles.spendingTrendText}>%8</Text>
              <Text style={styles.spendingTrendDesc}>Geçen aya göre daha az</Text>
            </View>
          </View>

          {/* Plant & Coins Illustration */}
          <View style={styles.spendingIllustration}>
            <Svg width={64} height={56} viewBox="0 0 64 56">
              <Defs>
                <SvgLinearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#fde047" />
                  <Stop offset="100%" stopColor="#eab308" />
                </SvgLinearGradient>
                <SvgLinearGradient id="plantGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#4ade80" />
                  <Stop offset="100%" stopColor="#16a34a" />
                </SvgLinearGradient>
              </Defs>
              <Path d="M16 44 C 16 38, 48 38, 48 44 C 48 50, 16 50, 16 44 Z" fill="url(#coinGrad)" />
              <Path d="M18 38 C 18 33, 46 33, 46 38 C 46 43, 18 43, 18 38 Z" fill="url(#coinGrad)" />
              <Path d="M20 32 C 20 28, 44 28, 44 32 C 44 36, 20 36, 20 32 Z" fill="#facc15" />
              <Path d="M32 32 Q 33 20, 36 12" stroke="url(#plantGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />
              <Path d="M36 12 Q 44 8, 46 14 Q 40 18, 36 14 Z" fill="url(#plantGrad)" />
              <Path d="M33 20 Q 24 16, 23 22 Q 29 25, 33 21 Z" fill="url(#plantGrad)" />
            </Svg>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#94a3b8" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR */}
      <View
        style={[
          styles.bottomNavContainer,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : (Platform.OS === 'android' ? 16 : 8),
          },
        ]}
      >
        <TouchableOpacity style={styles.navItem} activeOpacity={0.8}>
          <Ionicons name="home" size={24} color="#6366f1" />
          <Text style={[styles.navText, styles.navTextActive]}>Ana Sayfa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Overview')}
          activeOpacity={0.7}
        >
          <Ionicons name="grid-outline" size={22} color="#94a3b8" />
          <Text style={styles.navText}>Kontrol Paneli</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Transactions')}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-horizontal-outline" size={24} color="#94a3b8" />
          <Text style={styles.navText}>İşlemler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Reports')}
          activeOpacity={0.7}
        >
          <Ionicons name="bar-chart-outline" size={22} color="#94a3b8" />
          <Text style={styles.navText}>Raporlar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setIsMoreModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Daha Fazla</Text>
        </TouchableOpacity>
      </View>

      {/* DAHA FAZLA / TÜM MENÜLER MODAL */}
      <Modal
        visible={isMoreModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setIsMoreModalVisible(false);
          setMenuSearchQuery('');
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setIsMoreModalVisible(false);
            setMenuSearchQuery('');
          }}
        >
          <Pressable
            style={[
              styles.modalSheet,
              {
                paddingBottom: insets.bottom > 0 ? insets.bottom + 20 : (Platform.OS === 'ios' ? 36 : 24),
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Tüm Menüler</Text>
                <Text style={styles.modalSubtitle}>Tüm finansal araçlarınız ve hizmetler</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsMoreModalVisible(false);
                  setMenuSearchQuery('');
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Arama Çubuğu */}
            <View style={styles.modalSearchContainer}>
              <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Menü veya hizmet ara..."
                placeholderTextColor="#94a3b8"
                value={menuSearchQuery}
                onChangeText={setMenuSearchQuery}
                style={styles.modalSearchInput}
                autoCorrect={false}
              />
              {menuSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMenuSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* 4 Sütunlu 16 Hizmet Izgarası */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: height * 0.6 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <View style={styles.moreGrid}>
                {visibleAllServices.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.moreCard}
                    onPress={() => {
                      setIsMoreModalVisible(false);
                      setMenuSearchQuery('');
                      navigation.navigate(s.route);
                    }}
                    activeOpacity={0.7}
                  >
                    {(s as any).badge && (
                      <View style={styles.moreCardBadge}>
                        <Text style={styles.moreCardBadgeText}>{(s as any).badge}</Text>
                      </View>
                    )}
                    <View style={[styles.moreIconCircle, { backgroundColor: `${s.color}15` }]}>
                      <Ionicons name={s.icon as any} size={22} color={s.color} />
                    </View>
                    <Text style={styles.moreCardLabel} numberOfLines={2}>
                      {s.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#7c3aed',
    fontWeight: '700',
    fontSize: 18,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },

  // HERO WEALTH CARD (KOMPAKT)
  wealthCard: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  wealthWaveWrapper: {
    position: 'absolute',
    right: 0,
    top: 4,
    opacity: 0.75,
  },
  wealthCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wealthTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wealthTitle: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontWeight: '600',
  },
  eyeButton: {
    padding: 2,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trendText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  trendSeparator: {
    color: '#34d399',
    fontSize: 10,
    opacity: 0.6,
  },
  trendPeriod: {
    color: '#a7f3d0',
    fontSize: 10.5,
    fontWeight: '600',
  },
  wealthMainAmount: {
    fontSize: 27,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  wealthDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  wealthStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wealthStatCol: {
    flex: 1,
  },
  wealthStatLabel: {
    fontSize: 9.5,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  wealthStatValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  wealthStatSeparator: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 6,
  },

  // QUICK ACTIONS
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 1,
  },
  actionSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // SECTION HEADERS
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIconSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },

  // QUICK ACCESS GRID (8'li)
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
    marginBottom: 22,
  },
  quickCard: {
    width: GRID_ITEM_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 14,
  },

  // UPCOMING PAYMENTS
  upcomingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  upcomingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  upcomingDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 4,
  },
  upcomingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  upcomingInfoCol: {
    flex: 1,
  },
  upcomingItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  upcomingItemDate: {
    fontSize: 11.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  upcomingRightCol: {
    alignItems: 'flex-end',
  },
  upcomingItemAmount: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  daysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  daysBadgeUrgent: {
    backgroundColor: '#fee2e2',
  },
  daysBadgeNormal: {
    backgroundColor: '#e0f2fe',
  },
  daysBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  daysTextUrgent: {
    color: '#ef4444',
  },
  daysTextNormal: {
    color: '#0284c7',
  },

  // MONTHLY SPENDING CARD
  spendingCard: {
    backgroundColor: '#f5f3ff',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ede9fe',
    marginBottom: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  spendingLeftCol: {
    flex: 1,
  },
  spendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  targetIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spendingCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  spendingCardAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  spendingTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spendingTrendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  spendingTrendDesc: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  spendingIllustration: {
    marginHorizontal: 8,
  },

  // BOTTOM NAVIGATION BAR
  bottomNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 54,
  },
  navText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 3,
  },
  navTextActive: {
    color: '#6366f1',
    fontWeight: '700',
  },

  // MORE SERVICES MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  modalCloseBtn: {
    padding: 4,
  },
  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moreCard: {
    width: (width - 40 - 30) / 4,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  moreCardBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 0.8,
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 10,
  },
  moreCardBadgeText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 0.3,
  },
  moreIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  moreCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 14,
  },
});
