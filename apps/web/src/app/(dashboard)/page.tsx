'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  CalendarDays,
  FileText,
  Filter
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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [monthlyChart, setMonthlyChart] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
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
          fetchApi('/dashboard/monthly-chart'), // Monthly chart is usually generic, no date range needed here for now
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

  if (isLoading && !kpis) {
    return <div className="flex h-full items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Finansal Özet</h1>
          <p className="text-text-muted">Seçilen döneme ait durumunuz</p>
        </div>
        
        <div className="flex items-center gap-2 bg-bg-card border border-border p-1.5 rounded-lg">
          <div className="flex items-center px-2 text-text-muted">
            <Filter size={16} className="mr-2" />
            <span className="text-sm font-medium">Filtrele:</span>
          </div>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 text-text-primary px-2"
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
          <div className="w-px h-4 bg-border"></div>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 text-text-primary px-2"
          >
            <option value={(currentYear - 2).toString()}>{currentYear - 2}</option>
            <option value={(currentYear - 1).toString()}>{currentYear - 1}</option>
            <option value={currentYear.toString()}>{currentYear}</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Toplam Gelir" 
          value={kpis?.totalIncome || '0'} 
          icon={<ArrowUpRight size={20} className="text-success" />} 
          trend="+5%" 
        />
        <KpiCard 
          title="Toplam Gider" 
          value={kpis?.totalExpense || '0'} 
          icon={<ArrowDownRight size={20} className="text-danger" />} 
          trend="-2%" 
        />
        <KpiCard 
          title="Net Nakit Akışı" 
          value={kpis?.netCashFlow || '0'} 
          icon={<Wallet size={20} className="text-info" />} 
          trend="Pozitif" 
        />
        <KpiCard 
          title="Toplam Borç" 
          value={kpis?.totalDebt || '0'} 
          icon={<CreditCard size={20} className="text-warning" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Aylık Gelir & Gider Analizi</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4f" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₺${val}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#1a2237', borderColor: '#2d3a4f', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="income" name="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Gider" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Gider Dağılımı</h2>
          <div className="h-64 w-full flex items-center justify-center">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="label"
                    stroke="none"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a2237', borderColor: '#2d3a4f', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value: any) => `₺${value}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-text-muted text-sm text-center">Gider verisi bulunmuyor.</div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {categoryBreakdown.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-text-secondary">{item.label}</span>
                </div>
                <span className="font-medium">₺{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Items / Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AlertCard 
          title="Yaklaşan Taksitler" 
          value={kpis?.upcomingInstallments || 0} 
          icon={<CreditCard className="text-warning" />} 
          href="/debts" 
        />
        <AlertCard 
          title="Ödenmemiş Faturalar" 
          value={kpis?.upcomingInvoices || 0} 
          icon={<FileText className="text-danger" />} 
          href="/invoices" 
        />
        <AlertCard 
          title="Aylık Abonelik Gideri" 
          value={`₺${kpis?.monthlySubscriptionCost || '0'}`} 
          icon={<CalendarDays className="text-info" />} 
          href="/subscriptions" 
        />
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, trend }: any) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 shadow-sm hover:border-border-focus transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-bg-primary rounded-lg border border-border">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend.includes('+') ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-text-muted text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold">
        {typeof value === 'string' && !value.startsWith('₺') && !isNaN(Number(value)) ? `₺${Number(value).toLocaleString('tr-TR')}` : value}
      </p>
    </div>
  );
}

function AlertCard({ title, value, icon, href }: any) {
  return (
    <a href={href} className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl hover:bg-bg-card-hover transition-colors">
      <div className="p-3 bg-bg-primary rounded-full border border-border shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-medium text-text-muted">{title}</h4>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </a>
  );
}
