'use client';

import React, { useState } from 'react';
import { BookOpen, Users, Wallet, Target, Settings, Info, CreditCard, TrendingUp, PiggyBank, Repeat, BellRing, Calendar, BarChart3, ShieldCheck, Banknote, Bitcoin, ArrowLeftRight, LayoutDashboard, ChevronDown, ChevronUp, Layers, Zap, Globe, Clock } from 'lucide-react';

const modules = [
  {
    icon: LayoutDashboard,
    color: 'blue',
    title: 'Kontrol Paneli',
    description: 'Tüm finansal durumunuzu tek bir ekranda özetler. Aylık gelir, gider, net durum, aktif abonelikleriniz, bekleyen hatırlatıcılar ve son işlemleriniz burada yer alır.',
    tip: 'Grafiksel arayüz sayesinde ayın gidişatını hızlıca gözlemleyebilirsiniz.',
    borderColor: 'border-l-blue-600',
    iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  },
  {
    icon: ArrowLeftRight,
    color: 'emerald',
    title: 'İşlemler & Hesaplar',
    description: '**Hesap Ekleme:** "Hesaplar" menüsünden Nakit, Kredi Kartı veya Vadesiz hesaplarınızı oluşturun. **İşlem Ekleme:** "İşlemler" sayfasından Gelir veya Gider ekleyebilirsiniz.',
    tip: 'Eklediğiniz her işlem, ilgili hesabın bakiyesini otomatik olarak etkiler.',
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  {
    icon: CreditCard,
    color: 'rose',
    title: 'Borç ve Alacaklar',
    description: '**Taksitli Borçlar:** Kredi kartı taksitleri veya kredi borçları gibi düzenli ödemelerinizi buraya ekleyerek kalan taksitlerinizi takip edin. **Taksitli Alacaklar:** Size dışarıdan periyodik olarak gelecek olan alacaklarınızı kaydedebilirsiniz.',
    tip: 'Finansal takvim entegrasyonu ile vade tarihlerinizi görsel olarak takip edin.',
    borderColor: 'border-l-rose-500',
    iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  },
  {
    icon: TrendingUp,
    color: 'amber',
    title: 'Yatırım ve Tasarruf',
    description: '**Hisselerim:** BIST üzerinden hisse senetlerinizi maliyet ve adet belirterek ekleyin; canlı fiyatlar otomatik güncellenir. **Kripto:** BTC-USD gibi sembollerle portföyünüzü gerçek zamanlı takip edin. **Altın & Döviz:** Kur hareketlerine göre anlık kar/zararınızı görün.',
    tip: 'Yahoo Finance entegrasyonu ile canlı fiyat verisi otomatik çekilir.',
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  },
  {
    icon: Repeat,
    color: 'purple',
    title: 'Abonelikler ve Takvim',
    description: '**Abonelikler:** Netflix, Spotify, Elektrik, Su, Aidat gibi her ay tekrarlayan ödemelerinizi kaydedin. **Takvim:** Borç taksitleriniz, abonelik faturalarınız ve özel hatırlatıcılarınız takvim ekranında gün gün listelenir.',
    tip: 'Günü gelenler size "Hatırlatıcı" olarak yansır; nakit akışınızı önceden planlayın.',
    borderColor: 'border-l-purple-500',
    iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  },
  {
    icon: ShieldCheck,
    color: 'indigo',
    title: 'Garanti & Fatura',
    description: 'Satın aldığınız elektronik veya beyaz eşyaların fatura görsellerini ve garanti sürelerini bu modülde saklayabilirsiniz.',
    tip: 'Ayarlar sayfasından "Google Drive Entegrasyonu"nu aktif ederek belgelerinizi kendi Drive\'ınızda güvenle saklayabilirsiniz.',
    borderColor: 'border-l-blue-600',
    iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  },
  {
    icon: BarChart3,
    color: 'cyan',
    title: 'Gelişmiş Raporlar',
    description: 'Aylık ve yıllık periyotlarda kategori bazlı harcama grafikleri, net tasarruf oranı ve gelir analizlerinizi detaylıca inceleyebilirsiniz.',
    tip: 'Geçmişe dönük analiz yaparak hangi ay, hangi kategoriye en fazla harcama yaptığınızı keşfedin.',
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  {
    icon: Users,
    color: 'pink',
    title: 'Aile, Profil ve Ayarlar',
    description: '**Aile Üyeleri:** Ayarlar sayfası üzerinden ailenize e-posta adresiyle davet yollayabilir, ortak havuzu beraber yönetebilirsiniz. **Bütçe Dönemi:** Kendi maaş gününüze göre finansal ayın başlangıç gününü ayarlayabilirsiniz.',
    tip: 'Ayarlar içerisinden Aydınlık / Karanlık / Sistem temasını değiştirebilirsiniz.',
    borderColor: 'border-l-purple-500',
    iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  },
];

export default function GuidePage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Detaylı Kullanım Rehberi</h1>
        <p className="text-text-muted mt-1 text-sm">Aile Finans uygulamasının tüm özelliklerini keşfedin ve finansal süreçlerinizi daha kolay yönetin.</p>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Toplam Modül</p>
            <p className="text-2xl font-black text-text-primary tracking-tight font-mono mt-0.5">8+</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Entegre özellik seti</p>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Canlı Veri</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono mt-0.5">Evet</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Yahoo Finance entegrasyonu</p>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-amber-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Çoklu Kurum</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono mt-0.5">Evet</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Aile / ortak havuz desteği</p>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-purple-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">AI Destekli</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight font-mono mt-0.5">OCR</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Fatura & belge tarama</p>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod, index) => {
          const Icon = mod.icon;
          const isExpanded = expandedIndex === index;
          return (
            <div
              key={index}
              className={`bg-bg-card border border-border rounded-2xl shadow-sm border-l-[5px] ${mod.borderColor} transition-all hover:shadow-md`}
            >
              <button
                className="w-full p-4 flex items-start gap-3.5 text-left"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <div className={`p-2.5 rounded-xl ${mod.iconBg} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary">{mod.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                    {mod.description.replace(/\*\*[^*]+\*\*/g, '').trim().slice(0, 100)}...
                  </p>
                </div>
                <div className="shrink-0 text-text-muted pt-0.5">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2">
                  <p className="text-sm text-text-secondary whitespace-pre-line">
                    {mod.description.replace(/\*\*([^*]+)\*\*/g, '$1')}
                  </p>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex gap-2 text-xs text-text-secondary">
                    <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{mod.tip}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex gap-4">
        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-500 mb-1">Teknik Destek</h4>
          <p className="text-sm text-text-secondary">Sistem üzerinde yaşadığınız giriş problemleri, bağlantı hataları veya yeni modül önerileriniz için sistem yöneticiniz ile iletişime geçebilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
