import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OverviewScreen } from './src/screens/OverviewScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { DebtsScreen } from './src/screens/DebtsScreen';
import { ReceivablesScreen } from './src/screens/ReceivablesScreen';
import { StocksScreen } from './src/screens/StocksScreen';
import { CryptoScreen } from './src/screens/CryptoScreen';
import { SavingsScreen } from './src/screens/SavingsScreen';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { SubscriptionsScreen } from './src/screens/SubscriptionsScreen';
import { RemindersScreen } from './src/screens/RemindersScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { WarrantiesScreen } from './src/screens/WarrantiesScreen';
import { InvoiceScannerScreen } from './src/screens/InvoiceScannerScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { token, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token == null ? (
        // Giriş Yapmamış Kullanıcı
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        // Giriş Yapmış Kullanıcı
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Overview" component={OverviewScreen} />
          <Stack.Screen name="Transactions" component={TransactionsScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Debts" component={DebtsScreen} />
          <Stack.Screen name="Receivables" component={ReceivablesScreen} />
          <Stack.Screen name="Stocks" component={StocksScreen} />
          <Stack.Screen name="Crypto" component={CryptoScreen} />
          <Stack.Screen name="Savings" component={SavingsScreen} />
          <Stack.Screen name="Accounts" component={AccountsScreen} />
          <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
          <Stack.Screen name="Reminders" component={RemindersScreen} />
          <Stack.Screen name="Calendar" component={CalendarScreen} />
          <Stack.Screen name="Warranties" component={WarrantiesScreen} />
          <Stack.Screen name="InvoiceScanner" component={InvoiceScannerScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
