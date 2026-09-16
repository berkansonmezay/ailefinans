'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { BookOpen, Users, Wallet, Target, Settings, Info, CreditCard, TrendingUp, PiggyBank, Repeat, BellRing, Calendar, BarChart3, ShieldCheck, Banknote, Bitcoin, ArrowLeftRight, LayoutDashboard } from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-text-muted" />
          Detaylı Kullanım Rehberi
        </h1>
        <p className="text-text-muted mt-1">Aile Finans uygulamasının tüm özelliklerini keşfedin ve finansal süreçlerinizi daha kolay yönetin.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Kontrol Paneli */}
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-blue-400" />
              Kontrol Paneli
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p>Tüm finansal durumunuzu tek bir ekranda özetler. Aylık gelir, gider, net durum, aktif abonelikleriniz, bekleyen hatırlatıcılar ve son işlemleriniz burada yer alır.</p>
              <p>Grafiksel arayüz sayesinde ayın gidişatını hızlıca gözlemleyebilirsiniz.</p>
            </div>
          </CardContent>
        </Card>

        {/* İşlemler & Hesaplar */}
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
              İşlemler & Hesaplar
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Hesap Ekleme:</strong> "Hesaplar" menüsünden Nakit, Kredi Kartı veya Vadesiz hesaplarınızı oluşturun. İşlemlerinizin yapılacağı ana havuz burasıdır.</p>
              <p><strong>İşlem Ekleme:</strong> "İşlemler" sayfasından Gelir veya Gider ekleyebilirsiniz. Eklediğiniz her işlem, ilgili hesabın bakiyesini otomatik olarak etkiler.</p>
            </div>
          </CardContent>
        </Card>

        {/* Borç ve Alacaklar */}
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-red-400" />
              Borç ve Alacaklar
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Taksitli Borçlar:</strong> Kredi kartı taksitleri veya kredi borçları gibi düzenli ödemelerinizi buraya ekleyerek kalan taksitlerinizi takip edin.</p>
              <p><strong>Taksitli Alacaklar:</strong> Size dışarıdan periyodik olarak gelecek olan alacaklarınızı (örn: borç verdiğiniz bir meblağ) kaydedebilirsiniz.</p>
            </div>
          </CardContent>
        </Card>

        {/* Yatırım Araçları (Hisse, Kripto, Altın) */}
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Yatırım ve Tasarruf
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Hisselerim:</strong> Borsa İstanbul (BIST) üzerinden hisse senetlerinizi maliyet ve adet belirterek ekleyin. Canlı fiyatlar otomatik güncellenir (Yahoo Finance entegrasyonu).</p>
              <p><strong>Kripto Varlıklar:</strong> BTC-USD, ETH-USD gibi küresel sembollerle kripto portföyünüzü ekleyerek gerçek zamanlı takip edebilirsiniz.</p>
              <p><strong>Altın & Döviz:</strong> Fiziki veya banka hesabınızdaki Gram Altın, Dolar, Euro gibi birikimlerinizi ekleyebilir, kur hareketlerine göre anlık kar/zararınızı (PnL) görebilirsiniz.</p>
            </div>
          </CardContent>
        </Card>

        {/* Abonelikler & Hatırlatıcılar */}
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-purple-400" />
              Abonelikler ve Takvim
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Abonelikler:</strong> Netflix, Spotify, Elektrik, Su, Aidat gibi her ay tekrarlayan ödemelerinizi kaydedin. Günü gelenler size "Hatırlatıcı" olarak yansır.</p>
              <p><strong>Takvim:</strong> Borç taksitleriniz, abonelik faturalarınız ve özel hatırlatıcılarınız takvim ekranında gün gün listelenir. Böylece önünüzdeki nakit akışını planlayabilirsiniz.</p>
            </div>
          </CardContent>
        </Card>

        {/* Garanti ve Faturalar */}
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Garanti & Fatura
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p>Satın aldığınız elektronik veya beyaz eşyaların fatura görsellerini ve garanti sürelerini bu modülde saklayabilirsiniz.</p>
              <p>Ayarlar sayfasından "Google Drive Entegrasyonu"nu aktif ederek belgelerinizi kendi Drive'ınızda güvenle saklayıp, uygulamanız üzerinden bir tıklamayla görüntüleyebilirsiniz.</p>
            </div>
          </CardContent>
        </Card>

        {/* Raporlar */}
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-500" />
              Gelişmiş Raporlar
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p>Aylık ve yıllık periyotlarda kategori bazlı harcama grafikleri, net tasarruf oranı ve gelir analizlerinizi detaylıca inceleyebilirsiniz.</p>
              <p>Geçmişe dönük analiz yaparak hangi ay, hangi kategoriye en fazla harcama yaptığınızı keşfedebilirsiniz.</p>
            </div>
          </CardContent>
        </Card>

        {/* Aile ve Ayarlar */}
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-500" />
              Aile, Profil ve Ayarlar
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Aile Üyeleri:</strong> Ayarlar sayfası üzerinden ailenize (kiracı/ev arkadaşı vb.) e-posta adresiyle davet yollayabilir, ortak havuzu beraber yönetebilirsiniz.</p>
              <p><strong>Uygulama Teması:</strong> Ayarlar içerisinden Aydınlık / Karanlık / Sistem temasını değiştirebilirsiniz.</p>
              <p><strong>Bütçe Dönemi:</strong> Kendi maaş gününüze göre finansal ayın başlangıç gününü (Örn: Ayın 15'i) ayarlayarak raporlarınızı ve göstergelerinizi kişiselleştirebilirsiniz.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-4 mt-6">
        <Info className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-blue-400 mb-1">Teknik Destek</h4>
          <p className="text-sm text-text-secondary">Sistem üzerinde yaşadığınız giriş problemleri, bağlantı hataları veya yeni modül önerileriniz için sistem yöneticiniz ile iletişime geçebilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
