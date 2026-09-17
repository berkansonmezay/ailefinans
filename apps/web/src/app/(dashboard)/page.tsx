'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  CalendarDays,
  FileText,
  Filter,
  Banknote,
  Bitcoin,
  Coins,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [monthlyChart, setMonthlyChart] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  // Varlık durumları
  const [stocksSummary, setStocksSummary] = useState<any>(null);
  const [cryptoSummary, setCryptoSummary] = useState<any>(null);
  const [savingsAssets, setSavingsAssets] = useState<any[]>([]);
  const [marketRates, setMarketRates] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const year = parseInt(selectedYear);
        let startDate, endDate;
        
        if (selectedMonth === 'all') {
          startDate = new Date(year, 0, 1).toISOString();
          endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
        } else {
          const month = parseInt(selectedMonth);
          startDate = new Date(year, month, 1).toISOString();
          endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        }

        const [kpiData, chartData, catData] = await Promise.all([
          fetchApi(`/dashboard/kpis?startDate=${startDate}&endDate=${endDate}`),
          fetchApi('/dashboard/monthly-chart'),
          fetchApi(`/dashboard/category-breakdown?startDate=${startDate}&endDate=${endDate}`),
        ]);
        setKpis(kpiData);
        setMonthlyChart(chartData as any[]);
        setCategoryBreakdown(catData as any[]);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    async function loadAssetData() {
      try {
        const [stocksRes, cryptoRes, savingsRes, ratesRes, accountsRes] = await Promise.allSettled([
          fetchApi('/stocks/summary'),
          fetchApi('/crypto/summary'),
          fetchApi('/savings-assets'),
          fetchApi('/market/rates'),
          fetchApi('/accounts?pageSize=100'),
        ]);

        if (stocksRes.status === 'fulfilled') setStocksSummary(stocksRes.value);
        if (cryptoRes.status === 'fulfilled') setCryptoSummary(cryptoRes.value);
        if (savingsRes.status === 'fulfilled' && Array.isArray(savingsRes.value)) setSavingsAssets(savingsRes.value);
        if (ratesRes.status === 'fulfilled' && (ratesRes.value as any)?.rates) setMarketRates((ratesRes.value as any).rates);
        if (accountsRes.status === 'fulfilled') {
          const accVal: any = accountsRes.value;
          setAccounts(Array.isArray(accVal) ? accVal : (accVal?.data || []));
        }
      } catch (error) {
        console.error('Failed to load asset data', error);
      }
    }
    loadAssetData();
  }, []);

  // Varlık Portföy Hesaplamaları
  const accountsTotal = Array.isArray(accounts)
    ? accounts.reduce((sum, acc) => sum + (Number(acc.currentBalance) || 0), 0)
    : 0;
  const accountsCount = Array.isArray(accounts) ? accounts.length : 0;

  const stocksTotal = Number(stocksSummary?.totalValue) || 0;
  const stocksPnL = Number(stocksSummary?.totalPnL) || 0;
  const stocksPnLPercentage = stocksSummary?.totalPnLPercentage != null ? Number(stocksSummary.totalPnLPercentage) : null;

  const cryptoTotal = Number(cryptoSummary?.totalValue) || 0;
  const cryptoPnL = Number(cryptoSummary?.totalPnL) || 0;
  const cryptoPnLPercentage = cryptoSummary?.totalPnLPercentage != null ? Number(cryptoSummary.totalPnLPercentage) : null;

  let savingsTotalInvestment = 0;
  let savingsTotalValue = 0;
  if (Array.isArray(savingsAssets)) {
    savingsAssets.forEach((asset) => {
      const qty = Number(asset.quantity) || 0;
      const avg = Number(asset.averageCost) || 0;
      savingsTotalInvestment += qty * avg;
      const rate = marketRates.find((r: any) => r.code === asset.code);
      const price = rate?.buying != null ? Number(rate.buying) : avg;
      savingsTotalValue += qty * price;
    });
  }
  const savingsPnL = savingsTotalValue - savingsTotalInvestment;
  const savingsPnLPercentage = savingsTotalInvestment > 0 ? (savingsPnL / savingsTotalInvestment) * 100 : 0;
  const savingsCount = Array.isArray(savingsAssets) ? savingsAssets.length : 0;

  const grandTotalAssets = accountsTotal + stocksTotal + cryptoTotal + savingsTotalValue;

  const parseNum = (v: any) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const clean = v.replace(/[^0-9.-]+/g, '');
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  const totalIncomeVal = parseNum(kpis?.totalIncome);
  const totalExpenseVal = parseNum(kpis?.totalExpense);
  const netCashFlowVal = parseNum(kpis?.netCashFlow);
  const totalDebtVal = parseNum(kpis?.totalDebt);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Header & Guide Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            Finansal Özet
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-text-muted hover:text-emerald-500 transition-colors p-1 rounded-lg"
              title="Finansal Kontrol Paneli Rehberi"
            >
              <Info className="w-5 h-5" />
            </button>
          </h1>
          <p className="text-text-muted mt-1">Seçilen döneme ait nakit akışı, varlık portföyünüz ve finansal durumunuz.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>{showGuide ? 'Rehberi Gizle' : 'Akıllı Rehber'}</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 ml-1 text-text-muted" />}
          </button>
        </div>
      </div>

      {/* 2. Bilgilendirme ve Akıllı Rehber Banner'ı (Collapsible) */}
      {showGuide && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-400">Finansal Kontrol Paneli Rehberi</h3>
                <p className="text-xs text-text-secondary mt-0.5">Gelir, gider, varlık ve borç dengenizi tek bakışta analiz edin.</p>
              </div>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-xs text-text-muted hover:text-text-primary p-1 rounded-lg cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-text-secondary">
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-emerald-400 block mb-1">1. Nakit Akışı</span>
              Aylık gelir ve gider dengenizi izleyin; pozitif nakit akışıyla tasarruf oranınızı artırın.
            </div>
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-blue-400 block mb-1">2. Varlık Portföyü</span>
              Banka, hisse senedi, kripto ve altın birikimlerinizin anlık toplam değerini tek ekranda toplayın.
            </div>
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-amber-400 block mb-1">3. Yükümlülükler</span>
              Taksitli borçlar, yaklaşan faturalar ve sabit abonelikleri gecikmeye düşmeden takip edin.
            </div>
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-purple-400 block mb-1">4. Dönemsel Filtre</span>
              Sağ üstteki filtre çubuğundan ay ve yıl seçerek geriye dönük performansınızı karşılaştırın.
            </div>
          </div>
        </div>
      )}

      {/* 3. Modern Arama & Filtreleme Araç Çubuğu */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5 text-xs text-text-muted">
          <div className="p-2 rounded-xl bg-bg-secondary text-text-secondary border border-border">
            <Filter className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <span className="font-bold text-text-primary text-sm block">Dönem & Bütçe Filtresi</span>
            <span className="text-[11px] text-text-muted">Görüntülenen finansal analiz dönemini belirleyin</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2 bg-bg-secondary/60 border border-border rounded-xl px-3 py-1.5 shadow-inner">
            <span className="text-xs font-semibold text-text-muted">Ay:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-text-primary border-none focus:ring-0 outline-none cursor-pointer pr-1"
            >
              <option value="all">Tüm Yıl</option>
              <option value="0">Ocak</option>
              <option value="1">Şubat</option>
              <option value="2">Mart</option>
              <option value="3">Nisan</option>
              <option value="4">Mayıs</option>
              <option value="5">Haziran</option>
              <option value="6">Temmuz</option>
              <option value="7">Ağustos</option>
              <option value="8">Eylül</option>
              <option value="9">Ekim</option>
              <option value="10">Kasım</option>
              <option value="11">Aralık</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-bg-secondary/60 border border-border rounded-xl px-3 py-1.5 shadow-inner">
            <span className="text-xs font-semibold text-text-muted">Yıl:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-semibold text-text-primary border-none focus:ring-0 outline-none cursor-pointer pr-1"
            >
              <option value={(currentYear - 2).toString()}>{currentYear - 2}</option>
              <option value={(currentYear - 1).toString()}>{currentYear - 1}</option>
              <option value={currentYear.toString()}>{currentYear}</option>
            </select>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Canlı Takip
          </div>
        </div>
      </div>

      {/* 4. 4 Renkli KPI Özet Kartları (border-l-[5px]) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* TOPLAM GELİR (Green) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500 hover:border-border-focus transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold tracking-wider text-text-muted uppercase">
              TOPLAM GELİR
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono leading-tight truncate">
              {formatCurrency(totalIncomeVal)}
            </div>
            <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
              <span className="font-semibold text-emerald-500">↑ Aktif Dönem</span>
            </div>
          </div>
        </div>

        {/* TOPLAM GİDER (Red) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-rose-500 hover:border-border-focus transition-all">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold tracking-wider text-text-muted uppercase">
              TOPLAM GİDER
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono leading-tight truncate">
              {formatCurrency(totalExpenseVal)}
            </div>
            <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
              <span className="font-semibold text-rose-500">↓ Harcamalar</span>
            </div>
          </div>
        </div>

        {/* NET NAKİT AKIŞI (Blue) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600 hover:border-border-focus transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold tracking-wider text-text-muted uppercase">
              NET NAKİT AKIŞI
            </span>
            <div className={`text-xl sm:text-2xl font-black tracking-tight font-mono leading-tight truncate ${
              netCashFlowVal >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'
            }`}>
              {formatCurrency(netCashFlowVal)}
            </div>
            <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
              <span className={`font-semibold ${netCashFlowVal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {netCashFlowVal >= 0 ? '● Tasarruf Dengesi' : '● Bütçe Açığı'}
              </span>
            </div>
          </div>
        </div>

        {/* TOPLAM BORÇ (Amber) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-amber-500 hover:border-border-focus transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold tracking-wider text-text-muted uppercase">
              TOPLAM BORÇ
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono leading-tight truncate">
              {formatCurrency(totalDebtVal)}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              <span>Taksit ve borç bakiyesi</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Varlık & Portföy Bölümü (Taksitli Alacaklar Stili) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <h2 className="text-base font-bold text-text-primary tracking-tight">Varlık & Portföy Durumu</h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
              Anlık Değer
            </span>
          </div>
          <div className="text-xs text-text-muted flex items-center gap-2">
            <span>Toplam Portföy Büyüklüğü:</span>
            <span className="font-black text-sm font-mono text-text-primary">
              {formatCurrency(grandTotalAssets)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* HESAPLARIM (Emerald) */}
          <Link
            href="/accounts"
            className="group bg-bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 border-l-[5px] border-l-emerald-500 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-105">
                  <Banknote className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {accountsCount} aktif hesap
                </span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-text-muted text-[11px] font-bold uppercase tracking-wider">
                  HESAPLARIM
                </h3>
                <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xl font-black text-text-primary font-mono tracking-tight">{formatCurrency(accountsTotal)}</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 text-xs text-text-secondary flex items-center justify-between">
              <span>Banka & Nakit Varlıklar</span>
              <span className="text-emerald-500 font-semibold group-hover:underline">Detaylar →</span>
            </div>
          </Link>

          {/* HİSSE SENETLERİM (Blue) */}
          <Link
            href="/stocks"
            className="group bg-bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-blue-500/50 hover:shadow-md transition-all duration-200 border-l-[5px] border-l-blue-600 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center transition-transform group-hover:scale-105">
                  <TrendingUp className="w-5 h-5" />
                </div>
                {stocksTotal > 0 && stocksPnLPercentage != null && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    stocksPnLPercentage >= 0
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}>
                    {stocksPnLPercentage >= 0 ? '+' : ''}{stocksPnLPercentage.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-text-muted text-[11px] font-bold uppercase tracking-wider">
                  HİSSE SENETLERİM
                </h3>
                <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xl font-black text-text-primary font-mono tracking-tight">{formatCurrency(stocksTotal)}</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 text-xs text-text-secondary flex items-center justify-between">
              <span>
                {stocksTotal > 0 && stocksPnLPercentage != null
                  ? `K/Z: ${stocksPnL >= 0 ? '+' : ''}${formatCurrency(stocksPnL)}`
                  : 'Portföy boş'}
              </span>
              <span className="text-blue-500 font-semibold group-hover:underline">Borsa →</span>
            </div>
          </Link>

          {/* KRİPTO VARLIKLAR (Purple) */}
          <Link
            href="/crypto"
            className="group bg-bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-purple-500/50 hover:shadow-md transition-all duration-200 border-l-[5px] border-l-purple-500 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center transition-transform group-hover:scale-105">
                  <Bitcoin className="w-5 h-5" />
                </div>
                {cryptoTotal > 0 && cryptoPnLPercentage != null && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    cryptoPnLPercentage >= 0
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}>
                    {cryptoPnLPercentage >= 0 ? '+' : ''}{cryptoPnLPercentage.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-text-muted text-[11px] font-bold uppercase tracking-wider">
                  KRİPTO VARLIKLAR
                </h3>
                <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xl font-black text-text-primary font-mono tracking-tight">{formatCurrency(cryptoTotal)}</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 text-xs text-text-secondary flex items-center justify-between">
              <span>
                {cryptoTotal > 0 && cryptoPnLPercentage != null
                  ? `K/Z: ${cryptoPnL >= 0 ? '+' : ''}${formatCurrency(cryptoPnL)}`
                  : 'Portföy boş'}
              </span>
              <span className="text-purple-500 font-semibold group-hover:underline">Kripto →</span>
            </div>
          </Link>

          {/* ALTIN & DÖVİZ (Amber) */}
          <Link
            href="/savings"
            className="group bg-bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-amber-500/50 hover:shadow-md transition-all duration-200 border-l-[5px] border-l-amber-500 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center transition-transform group-hover:scale-105">
                  <Coins className="w-5 h-5" />
                </div>
                {savingsCount > 0 && savingsTotalInvestment > 0 && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    savingsPnLPercentage >= 0
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}>
                    {savingsPnLPercentage >= 0 ? '+' : ''}{savingsPnLPercentage.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-text-muted text-[11px] font-bold uppercase tracking-wider">
                  ALTIN & DÖVİZ
                </h3>
                <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xl font-black text-text-primary font-mono tracking-tight">{formatCurrency(savingsTotalValue)}</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 text-xs text-text-secondary flex items-center justify-between">
              <span>
                {savingsCount > 0
                  ? `${savingsCount} varlık (K/Z: ${savingsPnL >= 0 ? '+' : ''}${formatCurrency(savingsPnL)})`
                  : 'Kayıtlı varlık yok'}
              </span>
              <span className="text-amber-500 font-semibold group-hover:underline">Emtia →</span>
            </div>
          </Link>
        </div>
      </div>

      {/* 6. Grafikler (Aylık Trend & Gider Dağılımı) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-text-primary tracking-tight">Aylık Gelir & Gider Analizi</h2>
              <p className="text-xs text-text-muted mt-0.5">Seçilen yıl içerisindeki nakit giriş ve çıkış trendi</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                <span>Gelir</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-rose-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                <span>Gider</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" vertical={false} />
                <XAxis dataKey="month" stroke="currentColor" className="text-text-muted" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="currentColor" className="text-text-muted" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₺${val}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card, #1a2237)', 
                    borderColor: 'var(--border, #2d3a4f)', 
                    borderRadius: '12px', 
                    color: 'var(--text-primary, #f8fafc)',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: 'inherit' }}
                />
                <Bar dataKey="income" name="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expense" name="Gider" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-text-primary tracking-tight">Gider Dağılımı</h2>
              <span className="text-[11px] text-text-muted font-medium">Kategori Bazlı</span>
            </div>

            <div className="h-52 w-full flex items-center justify-center">
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="label"
                      stroke="none"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-card, #1a2237)', 
                        borderColor: 'var(--border, #2d3a4f)', 
                        borderRadius: '12px', 
                        color: 'var(--text-primary, #f8fafc)',
                        fontSize: '12px'
                      }}
                      itemStyle={{ color: 'inherit' }}
                      formatter={(value: any) => `₺${Number(value).toLocaleString('tr-TR')}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-text-muted text-xs text-center py-10">Döneme ait gider verisi bulunmuyor.</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
            {categoryBreakdown.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-text-secondary truncate">{item.label}</span>
                </div>
                <span className="font-mono font-bold text-text-primary ml-2">₺{Number(item.value).toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Yaklaşan Eylemler & Hatırlatıcılar (border-l-[5px]) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Yaklaşan Taksitler (Amber) */}
        <Link 
          href="/debts" 
          className="group bg-bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-amber-500/50 hover:shadow-md transition-all duration-200 border-l-[5px] border-l-amber-500 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                YAKLAŞAN TAKSİTLER
              </span>
              <div className="text-xl font-black font-mono text-text-primary">
                {kpis?.upcomingInstallments || 0} Adet
              </div>
              <span className="text-xs text-amber-500 font-medium">Borç ve Taksit Takibi</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Bekleyen Faturalar (Rose) */}
        <Link 
          href="/invoices" 
          className="group bg-bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-rose-500/50 hover:shadow-md transition-all duration-200 border-l-[5px] border-l-rose-500 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                ÖDENMEMİŞ FATURALAR
              </span>
              <div className="text-xl font-black font-mono text-text-primary">
                {kpis?.upcomingInvoices || 0} Adet
              </div>
              <span className="text-xs text-rose-500 font-medium">Garanti & Fatura Kayıtları</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Aylık Abonelikler (Purple) */}
        <Link 
          href="/subscriptions" 
          className="group bg-bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-purple-500/50 hover:shadow-md transition-all duration-200 border-l-[5px] border-l-purple-500 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                AYLIK ABONELİK
              </span>
              <div className="text-xl font-black font-mono text-text-primary">
                ₺{kpis?.monthlySubscriptionCost || '0'}
              </div>
              <span className="text-xs text-purple-500 font-medium">Düzenli Ödemeler</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
