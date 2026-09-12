'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { fetchApi } from '@/lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PieChart as PieChartIcon, BarChart3, Download, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'YEARLY' | 'MONTHLY' | 'COMPARISON'>('SUMMARY');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [merchantData, setMerchantData] = useState<any[]>([]);
  
  // Data for the 12 month trend includes calculated savings
  const trendData = monthlyData.map(d => ({
    ...d,
    savings: (d.income || 0) - (d.expense || 0)
  }));

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const [monthly, category, merchant] = await Promise.all([
          fetchApi<any>('/dashboard/monthly-chart?months=12'),
          fetchApi<any>('/dashboard/category-breakdown'),
          fetchApi<any>('/dashboard/merchant-breakdown'),
        ]);

        setMonthlyData(monthly.data || []);
        setCategoryData(category.data || []);
        setMerchantData(merchant.data || []);
      } catch (error: any) {
        toast.error(error.message || 'Raporlar yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border p-4 rounded-xl shadow-xl">
          <p className="font-semibold text-text-primary mb-2 border-b border-border pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-text-secondary">{entry.name}:</span>
              </div>
              <span className="text-sm font-medium text-text-primary">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(entry.value)}
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
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-medium text-text-primary">12 Aylık Trend Analizi</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="income" name="Gelir" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="expense" name="Gider" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="savings" name="Tasarruf" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sütun Grafik (Bar) */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-medium text-text-primary">Aylık Karşılaştırma</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="income" name="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'MONTHLY' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Category Breakdown */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-medium text-text-primary">Kategorilere Göre Harcamalar (Bu Ay)</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {categoryData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-text-secondary flex-1 truncate">{entry.label}</span>
                    <span className="font-medium text-text-primary">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(entry.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Merchant Breakdown */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-medium text-text-primary">İşletmelere Göre Harcamalar (Bu Ay)</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={merchantData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {merchantData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {merchantData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }}></div>
                    <span className="text-text-secondary flex-1 truncate">{entry.label}</span>
                    <span className="font-medium text-text-primary">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(entry.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(activeTab === 'YEARLY' || activeTab === 'COMPARISON') && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardContent>
            <div className="flex flex-col items-center justify-center py-20 text-text-muted">
              <PieChartIcon className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg">Bu sekmenin verileri yakında eklenecektir.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
