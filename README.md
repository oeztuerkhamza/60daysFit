# 60dayfit

60 günlük, **hızlı yürüyüş temelli** bir dönüşüm programını takip etmek için
yazılmış web uygulaması. Yürüyüş her seansta biraz daha uzar, ikinci haftadan
itibaren yürüyüşün öncesine ve sonrasına squat + şınav turları eklenir. Kilo ve
vücut fotoğrafları başlangıçta, her haftanın sonunda ve bitişte kaydedilir;
yenen her öğünün fotoğrafı günlüğe düşer.

**Stack:** Angular 19 (standalone + signals) · Supabase (Postgres, Auth, RLS, Storage) · Vercel

---

## Program

| | |
| --- | --- |
| **Süre** | 60 gün · 9 hafta |
| **Haftalık düzen** | 6 antrenman günü + 7. gün hafif yürüyüş ve kontrol kaydı |
| **Mesafe** | Her antrenman seansında **+150 m**: 1. gün 3,0 km → 60. gün 10,7 km |
| **Tempo** | Konuşabildiğin ama şarkı söyleyemediğin hız (yaklaşık 5,5 km/s) |
| **1. hafta** | Sadece yürüyüş |
| **2–9. hafta** | Yürüyüşten önce bir tur squat + şınav (ısınma), sonra bir tur daha (bitirici) |
| **Kuvvet artışı** | Set: 2 (2–4. hafta) → 3 (5–7) → 4 (8–9) · Tekrar her hafta +2 |

2. haftada squat 2×10 / şınav 2×6 ile başlar, 9. haftada squat 4×24 / şınav 4×20
olur. Dinlenme süreleri 8. haftadan itibaren 15 saniye kısalır.

### Beslenme

Az şeker, az rafine karbonhidrat, bol protein. Kurallar uygulamanın Beslenme
sayfasında yazılı; kilogram başına 1,6–2 g protein hedefi profilden ayarlanır ve
her öğün fotoğrafıyla birlikte kaydedilir.

---

## Neler var

- **Panel** — bugünkü mesafe ve plan, tamamlanma oranı, güncel/en uzun seri,
  toplam yürünen kilometre, kilo değişimi, bugünkü öğün sayısı ve bekleyen
  kontrol kaydı uyarısı.
- **Program** — 60 günün haftalara bölünmüş görünümü, gün başına mesafe ve süre.
- **Gün ekranı** — hedef mesafe, yürüyüş öncesi/sonrası kuvvet turları (hareket
  başına işaretleme ve yapılan tekrar), gerçek mesafe/süre/adım/su girişi, enerji
  durumu, not ve o güne ait öğünler.
- **Beslenme** — öğün fotoğrafı yükleme, ne yendiği, protein kaynağı ve gramı,
  şeker / rafine karbonhidrat işaretleri; günlük protein toplamı ve kaçamak sayısı.
- **Gelişim** — başlangıç, 8 haftalık ve bitiş kaydı. Her kayıtta kilo ve
  önden/yandan/arkadan fotoğraf; isteğe bağlı çevre ölçüleri. Kilo eğrisi ve
  önce/sonra karşılaştırması.
- **Profil** — başlangıç tarihi (programın 1. günü), boy, hedef, günlük protein
  ve su hedefi.

Arayüz Türkçe, veri modeli İngilizce isimlendirilmiştir.

---

## Kurulum

### 1. Supabase projesi

[supabase.com/dashboard](https://supabase.com/dashboard) üzerinde yeni bir proje aç.
**SQL Editor**'de şu dosyaları **sırayla** çalıştır:

1. `supabase/migrations/0001_init.sql` — tablolar, trigger'lar ve RLS politikaları
2. `supabase/migrations/0002_seed_program.sql` — hareketler ve 60 günlük yürüyüş programı
3. `supabase/migrations/0003_storage.sql` — fotoğraf depoları (bucket) ve erişim politikaları

Üçü de idempotenttir; tekrar çalıştırmak güvenlidir.

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

## Fotoğraflar

İki özel (private) bucket kullanılır: `progress-photos` ve `meal-photos`.
Nesne yolunun ilk klasörü kullanıcı kimliğidir ve storage politikaları tam olarak
bunu kontrol eder, yani kimse başkasının klasörüne yazamaz ve okuyamaz:

```
progress-photos/<user_id>/<kind>-<week>/<pose>-<timestamp>.jpg
meal-photos/<user_id>/<eaten_on>/<meal_type>-<timestamp>.jpg
```

Fotoğraflar yüklenmeden önce tarayıcıda uzun kenarı 1600 px olacak şekilde
küçültülür ve JPEG'e çevrilir; EXIF yön bilgisi korunur. Görüntüleme kısa ömürlü
imzalı URL'lerle yapılır.

---

## Vercel'e deploy

1. Projeyi Vercel'de içe aktar.
2. **Settings → Environment Variables** altına `SUPABASE_URL` ve
   `SUPABASE_ANON_KEY` ekle.
3. Build ayarları `vercel.json` içinden gelir:
   - Build command: `npm run build`
   - Output directory: `dist/sixtydayfit/browser`
   - SPA rewrite tanımlıdır, doğrudan `/gun/15` gibi adresler çalışır.

---

## Veri modeli

Ortak tablolar herkes tarafından okunur, kullanıcıya ait tabloları RLS korur
(`auth.uid() = user_id`).

| Tablo | İçerik |
| --- | --- |
| `profiles` | Kullanıcı ayarları ve hedefleri. Kayıt anında trigger ile oluşur. |
| `exercises` | Squat ve şınav; talimat, kolay ve zor varyantlarıyla (ortak). |
| `program_days` | 60 günlük şablon: başlık, gün tipi, mesafe, hedef süre (ortak). |
| `program_day_exercises` | Güne bağlı kuvvet turları: faz (öncesi/sonrası), set, tekrar (ortak). |
| `daily_logs` | Gün başına tek check-in: mesafe, süre, adım, su, enerji, not. |
| `set_logs` | Hareket başına işaretleme ve yapılan tekrar. |
| `checkpoints` | Başlangıç / haftalık / bitiş kaydı: kilo, boy, çevre ölçüleri. |
| `checkpoint_photos` | Kayıt başına önden/yandan/arkadan fotoğraf yolu. |
| `meals` | Öğün: tarih, tür, fotoğraf yolu, protein, şeker ve karbonhidrat işaretleri. |

---

## Proje yapısı

```
src/app/
├── core/
│   ├── auth/          AuthService, route guard'ları, hata mesajları
│   ├── data/          Supabase sorguları, istatistikler, beslenme kuralları
│   ├── models/        Veritabanı tiplerinin TypeScript karşılıkları
│   ├── storage/       Fotoğraf yükleme, imzalı URL'ler, görsel küçültme
│   └── supabase/      Tek Supabase istemcisi
├── shared/ui/         Progress ring, stat kartı, gün rozeti, fotoğraf yuvası
└── pages/             giris · kayit · panel · program · gun/:id · beslenme · gelisim · profil

supabase/
├── migrations/        Şema, program verisi ve storage politikaları
└── test/              CI'ın şemayı sade Postgres'te denemesi için auth/storage stub'ı
```

Rotalar `authGuard` ile korunur; guard, oturum okuması bitene kadar bekler, bu
yüzden yenilemede kısa bir "giriş ekranı parlaması" olmaz.

---

## Test

```bash
npm run test:ci
```

Birim testleri istatistik hesaplarını (seri, tamamlanma yüzdesi, yürünen mesafe
toplamı, tarih aritmetiği), bekleyen kontrol kayıtlarının hesabını ve oturum
hazır-olma akışını kapsar. GitHub Actions ayrıca migration'ları gerçek bir
Postgres 16 üzerinde iki kez çalıştırıp program verisini doğrular.

---

## Lisans

MIT
