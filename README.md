# Selliora

Çok kanallı e-ticaret operasyonu için ERP. Ürün ve varyant yönetimi,
pazaryeri kanalları ve hesapları, alım (satın alma) kayıtları, mal kabul
ve stok defteri, kredi kartı tanımları.

## Teknoloji

Next.js (App Router) · TypeScript · Prisma · MySQL · Tailwind CSS · shadcn/ui

## Kurulum

```bash
npm install
```

`npm install` sonrasında `postinstall` iki iş yapar: Prisma client'ı üretir
ve barkod okuyucunun `.wasm` dosyasını `public/` altına kopyalar.

`.env` dosyasında veritabanı bağlantısını tanımlayın:

```
DATABASE_URL="mysql://KULLANICI:PAROLA@HOST:3306/VERITABANI"
```

Şemayı uygulayın ve sabit verileri (pazaryeri kanalları) yükleyin:

```bash
npx prisma migrate dev
npx prisma db seed
```

## Çalıştırma

```bash
npm run dev     # http://localhost:3000
npm run build   # üretim derlemesi
npm run lint
```

### Telefondan test

Aynı ağdaki bir telefondan `http://<bilgisayar-ip>:3000` adresini
açabilirsiniz. Geliştirme sunucusu yerel ağdan gelen istekleri varsayılan
olarak engellediği için, IP adresinizin `next.config.ts` içindeki
`allowedDevOrigins` listesinde bulunması gerekir.

Kamera ile barkod okuma güvenli bağlantı (https) ister; yerel ağda `http`
üzerinden çalışmaz. USB barkod okuyucu ve manuel giriş her koşulda çalışır.

## Belgeler

- `CLAUDE.md` — proje anayasası: teknoloji kuralları, adlandırma standardı,
  kullanıcı kolaylığı ilkeleri, faz sırası, commit düzeni
- `BEKLEYENLER.md` — **yalnız AÇIK işler** (kısa, tek ekran)
- `ARSIV.md` — kapanmış işler, kararlar ve dersler (gerekçeleriyle)
- `docs/iade-sureci.md` — **pazaryerinin** iade akışı: durumlar, sebepler,
  itiraz gerekçeleri, kargo maliyetinin kanal farkı. Sistemin nasıl çalıştığını
  değil, karşımızdakinin nasıl çalıştığını anlatır.
