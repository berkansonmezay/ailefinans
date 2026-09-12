'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { BookOpen, Users, Wallet, Target, Settings, Info } from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-text-muted" />
          Kullanım Rehberi
        </h1>
        <p className="text-text-muted mt-1">Aile Finans uygulamasını en verimli şekilde kullanmanız için ipuçları.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-400" />
              Hesaplar ve İşlemler
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Hesap Ekleme:</strong> "Hesaplar" menüsünden Nakit, Kredi Kartı veya Banka hesaplarınızı ekleyebilirsiniz. Bakiyeler işlemlerinizle otomatik güncellenir.</p>
              <p><strong>Gelir/Gider Ekleme:</strong> "İşlemler" sayfasında sağ üstteki butonları kullanarak hızlıca işlem girebilir, kategori ve bütçe seçerek detaylandırabilirsiniz.</p>
              <p><strong>Kategoriler:</strong> İşlemlerinizin nereye gittiğini görmek için Kategoriler sayfasından kendinize özel kategoriler oluşturabilirsiniz.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Aile & Ortak Kullanım
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Yeni Aile Bireyi Ekleme:</strong> "Ayarlar" sayfasından "Aile Üyeleri" bölümünü kullanarak eşinizi veya çocuklarınızı uygulamaya davet edebilirsiniz. Kayıtlı e-posta adreslerini girmelisiniz.</p>
              <p><strong>Birden Fazla Kurum/Aile:</strong> Sağ üst köşedeki Aile ismine tıklayarak kayıtlı olduğunuz farklı kurum veya aileler arasında kolayca geçiş yapabilirsiniz.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Bütçeler ve Hedefler
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Bütçe Takibi:</strong> Kategori bazlı bütçeler (Örn: Market için 5000 ₺) belirleyerek ay içindeki harcamalarınızın sınırını kontrol altında tutabilirsiniz.</p>
              <p><strong>Birikim Hedefleri:</strong> Tatil, Araba veya Eğitim gibi uzun vadeli hedefler belirleyip periyodik olarak para ekleyebilirsiniz.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-pink-400" />
              Hesap Ayarları
            </div>
          } />
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Tema Değişikliği:</strong> Ekranın sağ üst köşesindeki "Ay / Güneş" ikonuna tıklayarak uygulamanın karanlık (Dark) veya aydınlık (Light) temasını seçebilirsiniz.</p>
              <p><strong>Profil Güncelleme:</strong> Yine sağ üst köşedeki kullanıcı ikonunuza tıklayarak isminizi ve giriş şifrenizi dilediğiniz an değiştirebilirsiniz.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-4 mt-6">
        <Info className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-blue-400 mb-1">Daha Fazla Destek</h4>
          <p className="text-sm text-text-secondary">Uygulama ile ilgili teknik bir sorun yaşarsanız veya geliştirme talebiniz varsa sistem yöneticinize ulaşabilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
