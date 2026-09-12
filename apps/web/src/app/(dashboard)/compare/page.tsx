'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { BarChart as BarChartIcon, Check, ChevronDown } from 'lucide-react';

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ComparePage() {
  const currentYear = new Date().getFullYear();
  // State for multiple selected years
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear, currentYear - 1]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Available years: last 5 years
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    async function loadData() {
      if (selectedYears.length === 0) {
        setData([]);
        return;
      }
      setIsLoading(true);
      try {
        const yearsQuery = selectedYears.join(',');
        const result = await fetchApi<any>(`/dashboard/compare-years?years=${yearsQuery}`);
        setData(Array.isArray(result) ? result : (result?.data || []));
      } catch (error) {
        console.error('Failed to load comparison data', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedYears]);

  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year].sort((a, b) => b - a)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <BarChartIcon className="w-6 h-6 text-blue-500" />
            Yıllık Karşılaştırma
          </h1>
          <p className="text-text-muted">Seçtiğiniz yılların gelir ve gider analizini karşılaştırın</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-bg-card border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-bg-sidebar transition-colors"
          >
            Yılları Seç ({selectedYears.length})
            <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-bg-card border border-border rounded-xl shadow-2xl z-50 p-2">
              <div className="text-xs font-semibold text-text-muted mb-2 px-2">YILLAR</div>
              <div className="space-y-1">
                {availableYears.map(year => {
                  const isSelected = selectedYears.includes(year);
                  return (
                    <button
                      key={year}
                      onClick={() => toggleYear(year)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-bg-sidebar transition-colors text-text-primary"
                    >
                      {year}
                      {isSelected && <Check size={16} className="text-blue-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-text-muted">Yükleniyor...</div>
      ) : selectedYears.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-bg-card border border-border rounded-xl text-text-muted">
          Lütfen karşılaştırmak için en az bir yıl seçin
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="bg-bg-card border-border backdrop-blur-xl">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold text-text-primary">Aylık Gelir Karşılaştırması</h3>
            </div>
            <CardContent className="p-6">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₺${val.toLocaleString()}`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, undefined]}
                    />
                    <Legend />
                    {selectedYears.map((year, index) => (
                      <Line 
                        key={`income_${year}`}
                        type="monotone" 
                        dataKey={`income_${year}`} 
                        name={`${year} Gelir`} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={3}
                        activeDot={{ r: 6 }}
                        dot={{ r: 3, strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-bg-card border-border backdrop-blur-xl">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold text-text-primary">Aylık Gider Karşılaştırması</h3>
            </div>
            <CardContent className="p-6">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₺${val.toLocaleString()}`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, undefined]}
                    />
                    <Legend />
                    {selectedYears.map((year, index) => (
                      <Line 
                        key={`expense_${year}`}
                        type="monotone" 
                        dataKey={`expense_${year}`} 
                        name={`${year} Gider`} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={3}
                        activeDot={{ r: 6 }}
                        dot={{ r: 3, strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
