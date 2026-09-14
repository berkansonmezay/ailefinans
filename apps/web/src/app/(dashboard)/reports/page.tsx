'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PieChart as PieChartIcon, BarChart3, Download, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select as CustomSelect } from '@/components/ui/Select';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'YEARLY' | 'MONTHLY' | 'COMPARISON'>('SUMMARY');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [merchantData, setMerchantData] = useState<any[]>([]);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  // MONTHLY Tab states
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth());
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyKpi, setMonthlyKpi] = useState<any>({ income: 0, expense: 0, totalBalance: 0 });
  const [monthlyCatData, setMonthlyCatData] = useState<any[]>([]);
  const [monthlyMerchantData, setMonthlyMerchantData] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any>({ categoryTrends: [], parentCategoryTrends: [] });
  const [selectedTrendCat, setSelectedTrendCat] = useState<string | null>(null);
  const [selectedTrendMerchant, setSelectedTrendMerchant] = useState<string | null>(null);

  // COMPARISON Tab states
  const today = new Date();
  const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const [compMonthA, setCompMonthA] = useState(lastMonth);
  const [compYearA, setCompYearA] = useState(lastMonthYear);
  const [compMonthB, setCompMonthB] = useState(today.getMonth());
  const [compYearB, setCompYearB] = useState(today.getFullYear());
  
  const [compKpiA, setCompKpiA] = useState<any>({ income: 0, expense: 0, totalBalance: 0 });
  const [compKpiB, setCompKpiB] = useState<any>({ income: 0, expense: 0, totalBalance: 0 });
  const [compCatA, setCompCatA] = useState<any[]>([]);
  const [compCatB, setCompCatB] = useState<any[]>([]);
  const [compIncCatA, setCompIncCatA] = useState<any[]>([]);
  const [compIncCatB, setCompIncCatB] = useState<any[]>([]);
  const [compMerA, setCompMerA] = useState<any[]>([]);
  const [compMerB, setCompMerB] = useState<any[]>([]);
  
  // Data for the 12 month trend includes calculated savings
  const trendData = monthlyData.map(d => ({
    ...d,
    savings: (d.income || 0) - (d.expense || 0)
  }));

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 11);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        
        const startStr = start.toISOString();
        const endStr = end.toISOString();

        const [monthly, category, merchant] = await Promise.all([
          fetchApi<any>('/dashboard/monthly-chart?months=12'),
          fetchApi<any>(`/dashboard/category-breakdown?startDate=${startStr}&endDate=${endStr}`),
          fetchApi<any>(`/dashboard/merchant-breakdown?startDate=${startStr}&endDate=${endStr}`),
        ]);

        setMonthlyData(Array.isArray(monthly) ? monthly : (monthly?.data || []));
        setCategoryData(Array.isArray(category) ? category : (category?.data || []));
        setMerchantData(Array.isArray(merchant) ? merchant : (merchant?.data || []));
      } catch (error: any) {
        toast.error(error.message || 'Raporlar yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  useEffect(() => {
    const loadYearlyData = async () => {
      if (activeTab !== 'YEARLY') return;
      try {
        setYearlyLoading(true);
        const data = await fetchApi<any>(`/dashboard/yearly-expenses?year=${selectedYear}`);
        setYearlyData(Array.isArray(data) ? data : (data?.data || []));
      } catch (error: any) {
        toast.error(error.message || 'Yıllık veriler yüklenemedi');
      } finally {
        setYearlyLoading(false);
      }
    };
    loadYearlyData();
  }, [activeTab, selectedYear]);

  useEffect(() => {
    const loadMonthlyTab = async () => {
      if (activeTab !== 'MONTHLY') return;
      try {
        setLoading(true);
        const y = monthlyYear;
        const m = monthlyMonth;
        const start = new Date(y, m, 1).toISOString();
        const end = new Date(y, m + 1, 0, 23, 59, 59).toISOString();

        const [kpi, cat, mer, trends] = await Promise.all([
          fetchApi<any>(`/dashboard/kpis?startDate=${start}&endDate=${end}`),
          fetchApi<any>(`/dashboard/category-breakdown?startDate=${start}&endDate=${end}`),
          fetchApi<any>(`/dashboard/merchant-breakdown?startDate=${start}&endDate=${end}`),
          fetchApi<any>(`/dashboard/monthly-trends?year=${y}`)
        ]);

        const kpiData = kpi?.data || kpi || {};
        setMonthlyKpi({ 
          income: parseFloat(kpiData.totalIncome || '0'), 
          expense: parseFloat(kpiData.totalExpense || '0'), 
          totalBalance: parseFloat(kpiData.netCashFlow || '0') 
        });
        setMonthlyCatData(Array.isArray(cat) ? cat : (cat?.data || []));
        setMonthlyMerchantData(Array.isArray(mer) ? mer : (mer?.data || []));
        
        const trendData = trends?.data || trends || { categoryTrends: [], parentCategoryTrends: [] };
        setMonthlyTrends(trendData);
        
        if (trendData.categoryTrends?.length > 0) {
          setSelectedTrendCat(trendData.categoryTrends[0].id);
        }
        if (trendData.parentCategoryTrends?.length > 0) {
          setSelectedTrendMerchant(trendData.parentCategoryTrends[0].id);
        }
      } catch (error: any) {
        toast.error(error.message || 'Aylık veriler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    loadMonthlyTab();
  }, [activeTab, monthlyMonth, monthlyYear]);

  useEffect(() => {
    const loadComparisonTab = async () => {
      if (activeTab !== 'COMPARISON') return;
      try {
        setLoading(true);
        const yA = compYearA;
        const mA = compMonthA;
        const startA = new Date(yA, mA, 1).toISOString();
        const endA = new Date(yA, mA + 1, 0, 23, 59, 59).toISOString();

        const yB = compYearB;
        const mB = compMonthB;
        const startB = new Date(yB, mB, 1).toISOString();
        const endB = new Date(yB, mB + 1, 0, 23, 59, 59).toISOString();

        const [kpiA, kpiB, catA, catB, incCatA, incCatB, merA, merB] = await Promise.all([
          fetchApi<any>(`/dashboard/kpis?startDate=${startA}&endDate=${endA}`),
          fetchApi<any>(`/dashboard/kpis?startDate=${startB}&endDate=${endB}`),
          fetchApi<any>(`/dashboard/category-breakdown?startDate=${startA}&endDate=${endA}`),
          fetchApi<any>(`/dashboard/category-breakdown?startDate=${startB}&endDate=${endB}`),
          fetchApi<any>(`/dashboard/category-breakdown?startDate=${startA}&endDate=${endA}&type=INCOME`),
          fetchApi<any>(`/dashboard/category-breakdown?startDate=${startB}&endDate=${endB}&type=INCOME`),
          fetchApi<any>(`/dashboard/merchant-breakdown?startDate=${startA}&endDate=${endA}`),
          fetchApi<any>(`/dashboard/merchant-breakdown?startDate=${startB}&endDate=${endB}`)
        ]);

        const kpiDataA = kpiA?.data || kpiA || {};
        setCompKpiA({ 
          income: parseFloat(kpiDataA.totalIncome || '0'), 
          expense: parseFloat(kpiDataA.totalExpense || '0'), 
          totalBalance: parseFloat(kpiDataA.netCashFlow || '0') 
        });

        const kpiDataB = kpiB?.data || kpiB || {};
        setCompKpiB({ 
          income: parseFloat(kpiDataB.totalIncome || '0'), 
          expense: parseFloat(kpiDataB.totalExpense || '0'), 
          totalBalance: parseFloat(kpiDataB.netCashFlow || '0') 
        });
        
        setCompCatA(Array.isArray(catA) ? catA : (catA?.data || []));
        setCompCatB(Array.isArray(catB) ? catB : (catB?.data || []));
        
        setCompIncCatA(Array.isArray(incCatA) ? incCatA : (incCatA?.data || []));
        setCompIncCatB(Array.isArray(incCatB) ? incCatB : (incCatB?.data || []));
        
        setCompMerA(Array.isArray(merA) ? merA : (merA?.data || []));
        setCompMerB(Array.isArray(merB) ? merB : (merB?.data || []));
        
      } catch (error: any) {
        toast.error(error.message || 'Karşılaştırma verileri yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    loadComparisonTab();
  }, [activeTab, compMonthA, compYearA, compMonthB, compYearB]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border p-4 rounded-xl shadow-lg">
          <p className="text-sm font-semibold text-text-primary mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 py-1">
              <span className="text-sm font-medium" style={{ color: entry.color }}>
                {entry.name} : {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="text-center py-20 text-text-muted">Raporlar hazırlanıyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Raporlar ve Analizler</h1>
          <p className="text-text-muted mt-1">Harcama alışkanlıklarınızı ve finansal trendlerinizi inceleyin.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => toast('PDF özelliği yakında eklenecek')}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="secondary" onClick={() => toast('Excel özelliği yakında eklenecek')}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-bg-card p-1 rounded-xl border border-border overflow-x-auto">
        {[
          { id: 'SUMMARY', label: 'Özet Rapor' },
          { id: 'YEARLY', label: 'Yıllık Gider Listesi' },
          { id: 'MONTHLY', label: 'Aylık Gider Raporu' },
          { id: 'COMPARISON', label: 'Karşılaştırmalı Analiz' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-accent text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'SUMMARY' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Trend Chart (Line) */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-text-primary mb-6">Gelir-Gider Trendi (12 Ay)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={true} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} tickMargin={10} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${value / 1000}K` : value} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ bottom: 0, fontSize: '14px', color: '#64748b' }} />
                    <Line type="monotone" dataKey="income" name="Gelir" stroke="#10b981" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="expense" name="Gider" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="savings" name="Tasarruf" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sütun Grafik (Bar) */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-text-primary mb-6">Aylık Karşılaştırma</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={true} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} tickMargin={10} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${value / 1000}K` : value} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ bottom: 0, fontSize: '14px', color: '#64748b' }} />
                    <Bar dataKey="income" name="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="expense" name="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Kategori Dağılımı */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-text-primary mb-8">Kategori Dağılımı (Son 12 Ay)</h3>
              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-text-muted">
                  Bu tarih aralığında veri bulunamadı.
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-full md:w-5/12 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={85}
                          outerRadius={130}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-7/12 px-4">
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {categoryData.sort((a, b) => b.value - a.value).map((entry, index) => {
                        const total = categoryData.reduce((sum, item) => sum + item.value, 0);
                        const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-text-secondary font-medium">
                                {entry.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="text-text-muted text-sm w-8 text-right">{percent}%</span>
                              <span className="text-text-primary font-bold w-24 text-right">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(entry.value)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'MONTHLY' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Top Header & Selectors */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-32">
                <CustomSelect
                  value={monthlyMonth.toString()}
                  onChange={(e) => setMonthlyMonth(parseInt(e.target.value))}
                  options={[
                    { label: 'Ocak', value: '0' },
                    { label: 'Şubat', value: '1' },
                    { label: 'Mart', value: '2' },
                    { label: 'Nisan', value: '3' },
                    { label: 'Mayıs', value: '4' },
                    { label: 'Haziran', value: '5' },
                    { label: 'Temmuz', value: '6' },
                    { label: 'Ağustos', value: '7' },
                    { label: 'Eylül', value: '8' },
                    { label: 'Ekim', value: '9' },
                    { label: 'Kasım', value: '10' },
                    { label: 'Aralık', value: '11' }
                  ]}
                />
              </div>
              <div className="w-28">
                <CustomSelect
                  value={monthlyYear.toString()}
                  onChange={(e) => setMonthlyYear(parseInt(e.target.value))}
                  options={Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return { label: y.toString(), value: y.toString() };
                  })}
                />
              </div>
            </div>
            <div className="flex flex-1 items-center justify-around gap-6">
              <div className="text-center">
                <span className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">GELİR</span>
                <span className="text-lg font-bold text-emerald-500">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(monthlyKpi.income)}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">GİDER</span>
                <span className="text-lg font-bold text-red-500">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(monthlyKpi.expense)}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">BAKİYE</span>
                <span className={`text-lg font-bold ${monthlyKpi.totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(monthlyKpi.totalBalance)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown (Donut) */}
            <Card className="border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <h3 className="text-lg font-bold text-text-primary">
                    Kategori Dağılımı ({['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][monthlyMonth]})
                  </h3>
                </div>
                {monthlyCatData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-text-muted">
                    Bu aya ait veri bulunamadı.
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-full h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={monthlyCatData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {monthlyCatData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4">
                      {monthlyCatData.sort((a, b) => b.value - a.value).map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5 text-sm">
                          <div className="w-3 h-3 shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="font-medium" style={{ color: COLORS[index % COLORS.length] }}>
                            {entry.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Merchant Breakdown (Horizontal Bar) */}
            <Card className="border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <h3 className="text-lg font-bold text-text-primary">
                    Harcama Yeri Dağılımı ({['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][monthlyMonth]})
                  </h3>
                </div>
                {monthlyMerchantData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-text-muted">
                    Bu aya ait veri bulunamadı.
                  </div>
                ) : (
                  <div className="w-full h-72 pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyMerchantData.sort((a,b) => b.value - a.value)} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={90} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <RechartsTooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-bg-card p-3 border border-border shadow-lg rounded-xl">
                                <p className="text-sm font-medium text-text-primary">{payload[0].payload.label}</p>
                                <p className="text-sm font-bold text-blue-500 mt-1">value : {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payload[0].value as number)}</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Yıllık Kategori Trendi (Sütun) */}
            <Card className="border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary">Yıllık Kategori Trendi</h3>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-64 shrink-0 flex flex-col">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">KATEGORİ SEÇİN</span>
                    <div className="flex flex-col gap-1 border border-border rounded-xl p-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {monthlyTrends.categoryTrends?.map((c: any) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedTrendCat(c.id)}
                          className={clsx(
                            "text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
                            selectedTrendCat === c.id 
                              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                              : "text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-secondary"
                          )}
                        >
                          {c.name}
                        </button>
                      ))}
                      {!monthlyTrends.categoryTrends?.length && (
                        <div className="p-4 text-sm text-text-muted text-center">Kategori bulunamadı</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(monthlyTrends.categoryTrends?.find((c: any) => c.id === selectedTrendCat)?.months || []).map((val: number, i: number) => ({ month: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"][i], total: val }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${value / 1000}K` : value} />
                        <RechartsTooltip cursor={{fill: 'transparent'}} content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-bg-card p-3 border border-border shadow-lg rounded-xl">
                                <p className="text-sm font-bold text-text-primary">{label}</p>
                                <p className="text-sm font-medium text-indigo-500 mt-1">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payload[0].value as number)}</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Yıllık Harcama Yeri Trendi (Sütun) */}
            <Card className="border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary">Yıllık Harcama Yeri Trendi</h3>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-64 shrink-0 flex flex-col">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">HARCAMA YERİ SEÇİN</span>
                    <div className="flex flex-col gap-1 border border-border rounded-xl p-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {monthlyTrends.merchantTrends?.map((c: any) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedTrendMerchant(c.id)}
                          className={clsx(
                            "text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
                            selectedTrendMerchant === c.id 
                              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" 
                              : "text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-secondary"
                          )}
                        >
                          {c.name}
                        </button>
                      ))}
                      {!monthlyTrends.merchantTrends?.length && (
                        <div className="p-4 text-sm text-text-muted text-center">Harcama yeri bulunamadı</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(monthlyTrends.merchantTrends?.find((c: any) => c.id === selectedTrendMerchant)?.months || []).map((val: number, i: number) => ({ month: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"][i], total: val }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${value / 1000}K` : value} />
                        <RechartsTooltip cursor={{fill: 'transparent'}} content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-bg-card p-3 border border-border shadow-lg rounded-xl">
                                <p className="text-sm font-bold text-text-primary">{label}</p>
                                <p className="text-sm font-medium text-rose-500 mt-1">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payload[0].value as number)}</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Bar dataKey="total" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'YEARLY' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between bg-bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedYear(y => y - 1)}
                className="p-2 hover:bg-bg-secondary dark:hover:bg-bg-secondary rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-text-secondary dark:text-text-primary" />
              </button>
              <span className="text-2xl font-bold text-text-primary w-20 text-center">{selectedYear}</span>
              <button 
                onClick={() => setSelectedYear(y => y + 1)}
                className="p-2 hover:bg-bg-secondary dark:hover:bg-bg-secondary rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-text-secondary dark:text-text-primary" />
              </button>
            </div>
            <div className="text-right">
              <span className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">YILLIK TOPLAM GİDER</span>
              <span className="text-2xl font-bold text-red-500">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(yearlyData.reduce((acc, curr) => acc + curr.total, 0))}
              </span>
            </div>
          </div>

          <Card className="border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="bg-bg-secondary border-b border-border text-text-secondary font-semibold">
                  <tr>
                    <th className="p-2 min-w-[150px] border-r border-border text-center text-xs">Harcama Yeri / Kategori</th>
                    {['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'].map(m => (
                      <th key={m} className="p-2 min-w-[80px] text-center text-xs">{m}</th>
                    ))}
                    <th className="p-2 min-w-[100px] text-right font-bold text-xs">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {yearlyLoading ? (
                    <tr><td colSpan={14} className="p-8 text-center text-text-muted">Yükleniyor...</td></tr>
                  ) : yearlyData.length === 0 ? (
                    <tr><td colSpan={14} className="p-8 text-center text-text-muted">Bu yıla ait veri bulunamadı.</td></tr>
                  ) : (
                    <>
                      {yearlyData.map((parent) => (
                        <React.Fragment key={parent.id}>
                          {/* Parent Row */}
                          <tr className="bg-bg-secondary/30">
                            <td className="p-2 font-bold text-text-primary border-r border-border text-center text-xs">
                              {parent.name}
                            </td>
                            {parent.months.map((val: number, i: number) => (
                              <td key={i} className="p-2 text-center font-medium text-emerald-500 text-xs">
                                {val > 0 ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(val) : ''}
                              </td>
                            ))}
                            <td className="p-2 text-right font-bold text-emerald-500 text-xs">
                              {parent.total > 0 ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(parent.total) : ''}
                            </td>
                          </tr>
                          {/* Child Rows */}
                          {parent.subCategories.map((child: any) => (
                            <tr key={child.id} className="bg-bg-card">
                              <td className="p-2 pl-4 font-medium text-text-secondary border-r border-border text-xs">
                                {child.name}
                              </td>
                              {child.months.map((val: number, i: number) => (
                                <td key={i} className="p-2 text-center text-text-muted text-xs">
                                  {val > 0 ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(val) : ''}
                                </td>
                              ))}
                              <td className="p-2 text-right font-semibold text-red-500 text-xs">
                                {child.total > 0 ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(child.total) : ''}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {/* Genel Toplam */}
                      <tr className="bg-bg-secondary border-t-2 border-border font-bold">
                        <td className="p-3 text-right text-text-primary border-r border-border text-xs">
                          Genel Toplam
                        </td>
                        {Array(12).fill(0).map((_, i) => {
                          const monthTotal = yearlyData.reduce((acc, curr) => acc + curr.months[i], 0);
                          return (
                            <td key={i} className="p-3 text-center text-red-500 text-xs">
                              {monthTotal > 0 ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(monthTotal) : ''}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right text-red-500 text-xs">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(yearlyData.reduce((acc, curr) => acc + curr.total, 0))}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'COMPARISON' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header & Period Selectors */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-bg-card p-6 rounded-xl border border-border shadow-sm">
            
            {/* Period A */}
            <div className="flex-1 w-full bg-bg-secondary/50 p-4 rounded-xl border border-border/50">
              <h3 className="text-sm font-bold text-text-primary mb-3">1. DÖNEM</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <CustomSelect
                    value={compMonthA.toString()}
                    onChange={(e) => setCompMonthA(parseInt(e.target.value))}
                    options={[
                      { label: 'Ocak', value: '0' },
                      { label: 'Şubat', value: '1' },
                      { label: 'Mart', value: '2' },
                      { label: 'Nisan', value: '3' },
                      { label: 'Mayıs', value: '4' },
                      { label: 'Haziran', value: '5' },
                      { label: 'Temmuz', value: '6' },
                      { label: 'Ağustos', value: '7' },
                      { label: 'Eylül', value: '8' },
                      { label: 'Ekim', value: '9' },
                      { label: 'Kasım', value: '10' },
                      { label: 'Aralık', value: '11' }
                    ]}
                  />
                </div>
                <div className="flex-1">
                  <CustomSelect
                    value={compYearA.toString()}
                    onChange={(e) => setCompYearA(parseInt(e.target.value))}
                    options={Array.from({ length: 5 }, (_, i) => {
                      const y = new Date().getFullYear() - 2 + i;
                      return { label: y.toString(), value: y.toString() };
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
            </div>

            {/* Period B */}
            <div className="flex-1 w-full bg-bg-secondary/50 p-4 rounded-xl border border-border/50">
              <h3 className="text-sm font-bold text-text-primary mb-3">2. DÖNEM</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <CustomSelect
                    value={compMonthB.toString()}
                    onChange={(e) => setCompMonthB(parseInt(e.target.value))}
                    options={[
                      { label: 'Ocak', value: '0' },
                      { label: 'Şubat', value: '1' },
                      { label: 'Mart', value: '2' },
                      { label: 'Nisan', value: '3' },
                      { label: 'Mayıs', value: '4' },
                      { label: 'Haziran', value: '5' },
                      { label: 'Temmuz', value: '6' },
                      { label: 'Ağustos', value: '7' },
                      { label: 'Eylül', value: '8' },
                      { label: 'Ekim', value: '9' },
                      { label: 'Kasım', value: '10' },
                      { label: 'Aralık', value: '11' }
                    ]}
                  />
                </div>
                <div className="flex-1">
                  <CustomSelect
                    value={compYearB.toString()}
                    onChange={(e) => setCompYearB(parseInt(e.target.value))}
                    options={Array.from({ length: 5 }, (_, i) => {
                      const y = new Date().getFullYear() - 2 + i;
                      return { label: y.toString(), value: y.toString() };
                    })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COMPARISON KPI ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gelir KPI */}
            <Card className="border-border shadow-sm p-5">
              <div className="text-sm font-bold text-text-muted uppercase mb-4">TOPLAM GELİR</div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs font-semibold text-text-muted mb-1">1. DÖNEM</div>
                  <div className="text-lg font-bold text-emerald-500">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(compKpiA.income)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-muted text-right mb-1">2. DÖNEM</div>
                  <div className="text-xl font-bold text-emerald-500 text-right">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(compKpiB.income)}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-sm">
                <span className="font-semibold text-text-secondary">Değişim</span>
                <span className={clsx("font-bold", compKpiB.income >= compKpiA.income ? "text-emerald-500" : "text-red-500")}>
                  {compKpiA.income > 0 ? `${compKpiB.income >= compKpiA.income ? '+' : ''}${(((compKpiB.income - compKpiA.income) / compKpiA.income) * 100).toFixed(1)}%` : '-'}
                </span>
              </div>
            </Card>

            {/* Gider KPI */}
            <Card className="border-border shadow-sm p-5">
              <div className="text-sm font-bold text-text-muted uppercase mb-4">TOPLAM GİDER</div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs font-semibold text-text-muted mb-1">1. DÖNEM</div>
                  <div className="text-lg font-bold text-red-500">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(compKpiA.expense)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-muted text-right mb-1">2. DÖNEM</div>
                  <div className="text-xl font-bold text-red-500 text-right">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(compKpiB.expense)}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-sm">
                <span className="font-semibold text-text-secondary">Değişim</span>
                <span className={clsx("font-bold", compKpiB.expense <= compKpiA.expense ? "text-emerald-500" : "text-red-500")}>
                  {compKpiA.expense > 0 ? `${compKpiB.expense >= compKpiA.expense ? '+' : ''}${(((compKpiB.expense - compKpiA.expense) / compKpiA.expense) * 100).toFixed(1)}%` : '-'}
                </span>
              </div>
            </Card>

            {/* Net Tasarruf KPI */}
            <Card className="border-border shadow-sm p-5 bg-gradient-to-br from-indigo-50/50 to-bg-card dark:from-indigo-950/20">
              <div className="text-sm font-bold text-indigo-500 uppercase mb-4">NET TASARRUF (GELİR - GİDER)</div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs font-semibold text-text-muted mb-1">1. DÖNEM</div>
                  <div className={clsx("text-lg font-bold", compKpiA.income - compKpiA.expense >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-red-500")}>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(compKpiA.income - compKpiA.expense)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-muted text-right mb-1">2. DÖNEM</div>
                  <div className={clsx("text-xl font-bold text-right", compKpiB.income - compKpiB.expense >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-red-500")}>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(compKpiB.income - compKpiB.expense)}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center text-sm">
                <span className="font-semibold text-indigo-700/70 dark:text-indigo-300/70">Tasarruf Oranı (2. Dönem)</span>
                <span className={clsx("font-bold", compKpiB.income > 0 && (compKpiB.income - compKpiB.expense) > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-text-muted")}>
                  {compKpiB.income > 0 ? `${(((compKpiB.income - compKpiB.expense) / compKpiB.income) * 100).toFixed(1)}%` : '-'}
                </span>
              </div>
            </Card>
          </div>

          {/* EN ÇOK ARTAN / AZALAN ÖZET ANALİZİ */}
          {(() => {
            const expenseDiffs = Array.from(new Set([...compCatA.map(c => c.label), ...compCatB.map(c => c.label)])).map(label => {
              const valA = compCatA.find(c => c.label === label)?.value || 0;
              const valB = compCatB.find(c => c.label === label)?.value || 0;
              return { label, diff: valB - valA };
            }).filter(d => d.diff !== 0).sort((a, b) => b.diff - a.diff);
            
            const topIncreases = expenseDiffs.filter(d => d.diff > 0).slice(0, 2);
            const topDecreases = expenseDiffs.filter(d => d.diff < 0).reverse().slice(0, 2);
            
            if (topIncreases.length === 0 && topDecreases.length === 0) return null;
            
            return (
              <Card className="border-border shadow-sm border-l-4 border-l-amber-500 overflow-hidden">
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <h3 className="font-bold text-amber-800 dark:text-amber-500">Harcama Kırılımı Özet Analizi (1. Dönem → 2. Dönem)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topIncreases.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-text-muted uppercase">Dikkat Çeken Artışlar</span>
                        {topIncreases.map(inc => (
                          <div key={inc.label} className="flex justify-between items-center text-sm bg-bg-card p-2 rounded border border-border/50">
                            <span className="font-medium">{inc.label}</span>
                            <span className="font-bold text-red-500">+{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(inc.diff)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {topDecreases.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-text-muted uppercase">Dikkat Çeken Düşüşler</span>
                        {topDecreases.map(dec => (
                          <div key={dec.label} className="flex justify-between items-center text-sm bg-bg-card p-2 rounded border border-border/50">
                            <span className="font-medium">{dec.label}</span>
                            <span className="font-bold text-emerald-500">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(dec.diff)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Category Comparison Table */}
            <Card className="border-border shadow-sm overflow-hidden lg:col-span-2">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border bg-emerald-50/50 dark:bg-emerald-950/20">
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-500">Gelir Kategori Karşılaştırması</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-bg-card sticky top-0 border-b border-border text-text-muted">
                      <tr>
                        <th className="p-4 font-medium">Kategori</th>
                        <th className="p-4 font-medium text-right">1. Dönem</th>
                        <th className="p-4 font-medium text-right">2. Dönem</th>
                        <th className="p-4 font-medium text-right">Değişim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 bg-bg-card">
                      {Array.from(new Set([...compIncCatA.map(c => c.label), ...compIncCatB.map(c => c.label)])).sort().map((catLabel, i) => {
                        const valA = compIncCatA.find(c => c.label === catLabel)?.value || 0;
                        const valB = compIncCatB.find(c => c.label === catLabel)?.value || 0;
                        const diff = valB - valA;
                        const percentDiff = valA > 0 ? (diff / valA) * 100 : (valB > 0 ? 100 : 0);
                        
                        return (
                          <tr key={i} className="hover:bg-bg-secondary/50 dark:hover:bg-bg-secondary/30 transition-colors">
                            <td className="p-4 font-medium text-slate-700 dark:text-text-secondary">{catLabel}</td>
                            <td className="p-4 text-right text-text-secondary">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(valA)}</td>
                            <td className="p-4 text-right text-text-secondary">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(valB)}</td>
                            <td className="p-4 text-right font-medium">
                              {diff !== 0 ? (
                                <div className={`flex items-center justify-end gap-1 ${diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {Math.abs(percentDiff).toFixed(1)}%
                                </div>
                              ) : (
                                <span className="text-text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Comparison Table */}
            <Card className="border-border shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border bg-bg-secondary/30">
                  <h3 className="font-bold text-text-primary">Kategori Karşılaştırması</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-bg-card sticky top-0 border-b border-border text-text-muted">
                      <tr>
                        <th className="p-4 font-medium">Kategori</th>
                        <th className="p-4 font-medium text-right">1. Dönem</th>
                        <th className="p-4 font-medium text-right">2. Dönem</th>
                        <th className="p-4 font-medium text-right">Değişim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 bg-bg-card">
                      {Array.from(new Set([...compCatA.map(c => c.label), ...compCatB.map(c => c.label)])).sort().map((catLabel, i) => {
                        const valA = compCatA.find(c => c.label === catLabel)?.value || 0;
                        const valB = compCatB.find(c => c.label === catLabel)?.value || 0;
                        const diff = valB - valA;
                        const percentDiff = valA > 0 ? (diff / valA) * 100 : (valB > 0 ? 100 : 0);
                        
                        return (
                          <tr key={i} className="hover:bg-bg-secondary/50 dark:hover:bg-bg-secondary/30 transition-colors">
                            <td className="p-4 font-medium text-slate-700 dark:text-text-secondary">{catLabel}</td>
                            <td className="p-4 text-right text-text-secondary">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(valA)}</td>
                            <td className="p-4 text-right text-text-secondary">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(valB)}</td>
                            <td className="p-4 text-right font-medium">
                              {diff !== 0 ? (
                                <div className={`flex items-center justify-end gap-1 ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {Math.abs(percentDiff).toFixed(1)}%
                                </div>
                              ) : (
                                <span className="text-text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Merchant Comparison Table */}
            <Card className="border-border shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border bg-bg-secondary/30">
                  <h3 className="font-bold text-text-primary">İşletme Karşılaştırması</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-bg-card sticky top-0 border-b border-border text-text-muted">
                      <tr>
                        <th className="p-4 font-medium">İşletme</th>
                        <th className="p-4 font-medium text-right">1. Dönem</th>
                        <th className="p-4 font-medium text-right">2. Dönem</th>
                        <th className="p-4 font-medium text-right">Değişim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 bg-bg-card">
                      {Array.from(new Set([...compMerA.map(m => m.label), ...compMerB.map(m => m.label)])).sort().map((merLabel, i) => {
                        const valA = compMerA.find(m => m.label === merLabel)?.value || 0;
                        const valB = compMerB.find(m => m.label === merLabel)?.value || 0;
                        const diff = valB - valA;
                        const percentDiff = valA > 0 ? (diff / valA) * 100 : (valB > 0 ? 100 : 0);
                        
                        return (
                          <tr key={i} className="hover:bg-bg-secondary/50 dark:hover:bg-bg-secondary/30 transition-colors">
                            <td className="p-4 font-medium text-slate-700 dark:text-text-secondary">{merLabel}</td>
                            <td className="p-4 text-right text-text-secondary">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(valA)}</td>
                            <td className="p-4 text-right text-text-secondary">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(valB)}</td>
                            <td className="p-4 text-right font-medium">
                              {diff !== 0 ? (
                                <div className={`flex items-center justify-end gap-1 ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {Math.abs(percentDiff).toFixed(1)}%
                                </div>
                              ) : (
                                <span className="text-text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
