# 60dayfit

60 günlük antrenman challenge'ını takip etmek için yazılmış bir web uygulaması.
Program hazır gelir: 7 günlük bir döngü (itme · bacak · kardiyo · çekme · core ·
full body · dinlenme) 60 güne yayılır, haftalara göre set ve dinlenme süreleri
artar. Sen sadece günü açıp hareketleri işaretlersin.

**Stack:** Angular 19 (standalone + signals) · Supabase (Postgres, Auth, RLS) · Vercel

---

## Neler var

- **Günlük antrenman ekranı** — o günün hareketleri, set × tekrar, dinlenme süresi
  ve "nasıl yapılır" açıklamaları. Her hareket için kaldırılan ağırlık ve yapılan
  tekrar kaydedilir; işaretleme anında kaydolur.
- **Gün özeti** — süre, su, adım, enerji durumu ve serbest not. Gün tamamlandı
  olarak işaretlenir (ve gerekirse geri alınır).
- **60 günlük program görünümü** — haftalara bölünmüş takvim, odak rengi,
  tamamlanan günler ve bugünün vurgusu.
- **Panel** — tamamlanma yüzdesi, güncel ve en uzun seri, toplam antrenman süresi,
  güncel kilo ve başlangıca göre değişim.
- **Ölçümler** — kilo, yağ oranı ve çevre ölçüleri; kilo eğrisi grafiği ve geçmiş
  tablosu. Aynı tarih tekrar girilirse üzerine yazılır.
- **Profil** — başlangıç tarihi (programın 1. günü), boy, hedef ve haftalık
  antrenman hedefi.

Arayüz Türkçe, veri modeli İngilizce isimlendirilmiştir.

---

## Kurulum

### 1. Supabase projesi

[supabase.com/dashboard](https://supabase.com/dashboard) üzerinde yeni bir proje aç.
Ardından **SQL Editor**'de şu dosyaları **sırayla** çalıştır:

1. `supabase/migrations/0001_init.sql` — tablolar, trigger'lar ve RLS politikaları
2. `supabase/migrations/0002_seed_program.sql` — hareket kütüphanesi ve 60 günlük program

Her iki dosya da idempotenttir; tekrar çalıştırmak güvenlidir.

> **Authentication → Providers → Email** altında "Confirm email" açıksa kayıt
> sonrası e-posta onayı istenir. Tek kişilik kullanımda kapatmak işi hızlandırır.

### 2. Ortam değişkenleri

```bash
cp .env.example .env
```

`.env` içine Supabase projesinin **Settings → API** sayfasındaki değerleri yaz:

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

`anon` anahtarı tarayıcıya gitmek üzere tasarlanmıştır; veriyi RLS politikaları
korur. `service_role` anahtarını bu dosyaya **koyma**.

### 3. Çalıştır

```bash
npm install
npm start
```

`http://localhost:4200` adresinde açılır. `npm start` ve `npm run build`, çalışmadan
önce `scripts/set-env.mjs` ile `src/environments/environment.ts` dosyasını üretir —
bu dosya git'e girmez.

---

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm start` | Geliştirme sunucusu (4200) |
| `npm run build` | Üretim derlemesi → `dist/sixtydayfit/browser` |
| `npm test` | Testleri izleme modunda çalıştırır |
| `npm run test:ci` | Testleri headless Chrome ile bir kez çalıştırır |
| `npm run lint:types` | Tip kontrolü (`tsc --noEmit`) |
| `npm run set-env` | `environment.ts` dosyasını yeniden üretir |

---

## Vercel'e deploy

1. Projeyi Vercel'de içe aktar.
2. **Settings → Environment Variables** altına `SUPABASE_URL` ve
   `SUPABASE_ANON_KEY` ekle.
3. Build ayarları `vercel.json` içinden gelir:
   - Build command: `npm run build`
   - Output directory: `dist/sixtydayfit/browser`
   - SPA rewrite'ı tanımlıdır, doğrudan `/gun/15` gibi adresler çalışır.

---

## Veri modeli

Ortak tablolar herkes tarafından okunur, kullanıcıya ait tabloları RLS korur
(`auth.uid() = user_id`).

| Tablo | İçerik |
| --- | --- |
| `profiles` | Kullanıcı ayarları. Kayıt anında trigger ile otomatik oluşur. |
| `exercises` | Hareket kütüphanesi (ortak). |
| `program_days` | 60 günlük şablon: başlık, odak, hedef süre (ortak). |
| `program_day_exercises` | Güne bağlı hareketler: sıra, set, tekrar, dinlenme (ortak). |
| `daily_logs` | Kullanıcının gün başına tek check-in kaydı. |
| `set_logs` | Hareket başına işaretleme, ağırlık ve tekrar. |
| `measurements` | Tarih başına kilo ve çevre ölçüleri. |

Programın ilerlemesi şablona gömülüdür: 5. haftadan itibaren her harekete bir set
eklenir, 8. haftadan itibaren dinlenme süreleri 15 saniye kısalır.

---

## Proje yapısı

```
src/app/
├── core/
│   ├── auth/          AuthService, route guard'ları, hata mesajları
│   ├── data/          Supabase sorguları ve istatistik hesapları
│   ├── models/        Veritabanı tiplerinin TypeScript karşılıkları
│   └── supabase/      Tek Supabase istemcisi
├── shared/ui/         Progress ring, stat kartı, odak rozeti, kurulum notu
└── pages/             giris · kayit · panel · program · gun/:id · olcumler · profil

supabase/
├── migrations/        Şema ve program verisi
└── test/              CI'ın şemayı sade Postgres'te denemesi için auth stub'ı
```

Rotalar `authGuard` ile korunur; guard, oturum okuması bitene kadar bekler, bu
yüzden yenilemede kısa bir "giriş ekranı parlaması" olmaz.

---

## Test

```bash
npm run test:ci
```

Birim testleri istatistik hesaplarını (seri, tamamlanma yüzdesi, tarih aritmetiği)
ve oturum hazır-olma akışını kapsar. GitHub Actions ayrıca migration'ları gerçek
bir Postgres 16 üzerinde iki kez çalıştırıp program verisini doğrular.

---

## Lisans

MIT
