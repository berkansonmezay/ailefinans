# 🚀 Aile Finans - Ücretsiz Bulut Dağıtım Rehberi (Deployment Guide)

Bu rehber, **Aile Finans** projesini sıfır maliyetle, yüksek performanslı ve modern bulut servislerine nasıl taşıyacağınızı adım adım anlatır.

---

### 🏛️ Mimari Özeti

* **Veritabanı & Dosya Saklama (Database & Storage):** [Supabase](https://supabase.com) (Ücretsiz 500 MB Postgres + 1 GB Storage)
* **Backend API:** [Render.com](https://render.com) (Ücretsiz Web Service) veya [Fly.io](https://fly.io)
* **Web Arayüzü (Frontend):** [Vercel](https://vercel.com) (Ücretsiz Next.js Hosting)
* **Mobil Uygulama (Mobile):** Expo / React Native

---

## 1. Adım: Supabase Veritabanı ve Storage Kurulumu

1. **Bağlantı Adreslerini (DATABASE_URL & DIRECT_URL) Alın:**
   * Ekranınızın en üst çubuğunda, `ailefinans` / `main [PRODUCTION]` etiketinin hemen sağındaki yeşil **`Connect`** butonuna tıklayın.
   * Açılan pencerede **"ORM"** sekmesine tıklayın ve **"Prisma"** seçeneğini seçin.
   * Supabase doğrudan sizin projenize özel iki satırı gösterecektir:
     * `DATABASE_URL`: Transaction mode (Port 6543)
     * `DIRECT_URL`: Session mode (Port 5432)
   * *(Buradaki `[YOUR-PASSWORD]` kısmına veritabanını oluştururken belirlediğiniz şifreyi yazacaksınız).*

2. **Storage Bucket Oluşturun (Fatura & Fiş Depolama):**
   * Sol taraftaki dar dikey ikon menüsünde yukarıdan aşağıya **6. sıradaki kıvrık sayfa / dosya ikonuna (Storage)** tıklayın.
   * Açılan sayfada **"New Bucket"** butonuna tıklayın.
   * Bucket Adı: `documents`
   * **"Public bucket"** seçeneğini işaretleyin (Kullanıcıların yüklediği fatura/fişleri doğrudan tarayıcıdan görüntüleyebilmesi için).
   * **Save** diyerek kaydedin.

3. **API Anahtarlarını Alın (SUPABASE_URL & SUPABASE_KEY):**
   * Sol dikey menünün en altındaki **Çark simgesine (Project Settings)** tıklayın.
   * Açılan menüden **"API"** veya **"API Keys"** sekmesine tıklayın.
   * Buradan:
     * **Project URL:** `https://jbraadetqhitkhbyojza.supabase.co`
     * **anon / public key** veya **service_role key** anahtarını kopyalayın.

4. **Veritabanı Tablolarını Buluta Gönderin:**
   Bilgisayarınızdaki terminalden projenin tablolarını Supabase'e oluşturmak için:
   ```bash
   DATABASE_URL="<Connect-butonundan-aldiginiz-DATABASE_URL>" DIRECT_URL="<Connect-butonundan-aldiginiz-DIRECT_URL>" pnpm --filter api db:push
   ```
   *İlk demo kullanıcıyı oluşturmak için seed komutu:*
   ```bash
   DATABASE_URL="<DATABASE_URL>" DIRECT_URL="<DIRECT_URL>" pnpm --filter api db:seed
   ```

---

## 2. Adım: Backend API'yi Render.com'a Dağıtma

Projede hazır bir `render.yaml` Blueprint dosyası bulunmaktadır.

1. Projenizi GitHub'a push edin.
2. [render.com](https://render.com) adresine giriş yapın.
3. Dashboard ekranında **"New +"** > **"Blueprint"** seçeneğini seçin.
4. GitHub repository'nizi bağlayın.
5. Render, repo içindeki `render.yaml` dosyasını otomatik olarak algılayacaktır.
6. Sizden istenen Environment Variable değerlerini girin:
   * `DATABASE_URL`: Supabase Transaction Pooler URL (Port 6543)
   * `DIRECT_URL`: Supabase Direct Connection URL (Port 5432)
   * `FRONTEND_URL`: `https://[VERCEL_PROJENIZ].vercel.app` (veya `http://localhost:3000`)
   * `SUPABASE_URL`: `https://[PROJECT_REF].supabase.co`
   * `SUPABASE_KEY`: Supabase API Key
   * `SUPABASE_STORAGE_BUCKET`: `documents`
7. **"Apply"** butonuna tıklayın. Render, API servisinizi derleyip canlıya alacaktır.
8. API adresiniz şu formatta olacaktır:
   `https://ailefinans-api.onrender.com`

---

## 3. Adım: Web Arayüzünü Vercel'e Dağıtma

1. [vercel.com](https://vercel.com) adresine gidin ve **"Add New Project"** butonuna tıklayın.
2. GitHub reponuzu seçin.
3. **Proje Ayarları (Project Settings):**
   * **Root Directory:** `apps/web` olarak ayarlayın.
   * **Framework Preset:** `Next.js` (Otomatik algılanır).
   * **Build Command:** `pnpm --filter @family-app/types build && pnpm --filter web build`
   * **Output Directory:** `.next`
4. **Environment Variables:**
   * `NEXT_PUBLIC_API_URL`: Render'daki canlı API adresiniz:
     `https://ailefinans-api.onrender.com/api/v1`
5. **"Deploy"** butonuna tıklayın. 1-2 dakika içinde web siteniz yayında olacaktır!

---

## 4. Adım: Mobil Uygulamayı Canlı API'ye Bağlama

Mobil uygulamanızın (`apps/mobile`) yerel ağ yerine internet üzerinden canlı API'niz ile konuşması için:

1. `apps/mobile/src/lib/api.ts` dosyasını açın.
2. `getBaseUrl()` fonksiyonunu canlı adresinizle güncelleyin:
   ```typescript
   const getBaseUrl = () => {
     if (process.env.EXPO_PUBLIC_API_URL) {
       return process.env.EXPO_PUBLIC_API_URL;
     }
     // Canlı Render.com API adresi
     return 'https://ailefinans-api.onrender.com/api/v1';
   };
   ```
3. Artık hem iOS hem Android cihazlarınız dünyanın her yerinden aile finans verilerinize kesintisiz erişebilir!
