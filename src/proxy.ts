import { NextResponse, type NextRequest } from "next/server";

import { jetonuCoz, OTURUM_CEREZI } from "@/lib/oturum-imza";

/**
 * ============================================================================
 *  KAPI — HER İSTEK BURADAN GEÇER
 * ----------------------------------------------------------------------------
 *  Next 16'da bu dosyanın adı `proxy.ts`; `middleware.ts` adı KULLANIMDAN
 *  KALDIRILDI (node_modules/next/dist/docs → middleware.md).
 *
 *  NEDEN KORUMA BURADA, HER SAYFAYA TEK TEK DEĞİL:
 *  Sayfa sayfa kontrol eklemek, bir gün birinin unutulması demektir — ve
 *  unutulan sayfa sessizce herkese açık kalır. Burada varsayılan KAPALI:
 *  açıkça serbest bırakılmayan her yol giriş ister. Yeni bir ekran ya da
 *  API ucu eklendiğinde ekstra bir şey yapmak GEREKMEZ; korumalı doğar.
 *
 *  API uçları da buraya dahildir. `/api/yedek` ve `/api/disa-aktarma` tüm
 *  veriyi döküyor; onların korumasız kalması en pahalı sızıntı olurdu.
 *
 *  Jeton kendi içinde doğrulanır (HMAC + süre), veritabanına gidilmez —
 *  bu katman her istekte çalıştığı için sorgu yapmamalı.
 * ============================================================================
 */

/** Giriş istemeyen yollar. Listeye ekleme YAPMADAN önce iki kez düşün. */
const ACIK_YOLLAR = [
  "/giris",
  // Çerez temizleme yolu — geçersiz oturumla gelen tarayıcı buraya
  // yönlendirilir. Kapalı olsaydı sonsuz yönlendirme oluşurdu.
  "/cikis",
  // Vercel Cron'un çağırdığı uç: kendi CRON_SECRET koruması var ve
  // tarayıcı oturumu taşıyamaz. Korumasız DEĞİL, farklı korumalı.
  "/api/yedek/otomatik",
  // K166 — dış zamanlayıcının çağırdığı TY çekim ucu: aynı sınıf, kendi
  // CRON_SECRET kapısı var (yanlış/boş sır 404, `ice-aktarma:dogrula`
  // kapıyı mutasyonla sınıyor). İlk canlı test bu satır OLMADAN yapıldı
  // ve oturum kapısı 401 verdi — rota kendi kapısına hiç ulaşamamıştı.
  "/api/cron/ty-cekim",
  // K167-③ — N11 çekim ucu: K166'nın birebir kopyası, aynı sır kapısı.
  "/api/cron/n11-cekim",

  // ── PWA: TARAYICI BUNLARI ÇEREZSİZ İSTER ──────────────────────────────
  //
  // ⚠ BU SATIRLAR OLMADAN KURULUM SESSİZCE ÇALIŞMAZ. Tarayıcı manifest'i
  // ve simgeleri OTURUM ÇEREZİ GÖNDERMEDEN çeker (şartname böyle). Kapı
  // onları `/giris`e yönlendirir, tarayıcı JSON yerine HTML alır ve
  // "uygulamayı kur" teklifi HİÇ ÇIKMAZ. Ekranda hata da görünmez —
  // kullanıcı yalnız "olmuyor" der.
  //
  // İçerikleri hassas değil: uygulama adı, sloganı ve marka simgesi.
  // Zaten giriş ekranında da görünüyorlar.
  "/manifest.webmanifest",
  "/ikon",
  "/icon",
  "/apple-icon",
  // Servis çalışanı dosyası: kayıt sırasında çerezsiz istenebilir ve
  // JavaScript olarak sunulmak ZORUNDA (HTML dönerse kayıt reddedilir).
  "/sw.js",
  // Ağ yokken gösterilen sayfa. Servis çalışanı bunu ÇEREZSİZ önbelleğe
  // alıyor (bkz. public/sw.js) — kapalı olsaydı yedek hiç oluşmazdı.
  "/cevrimdisi",
];

function acikMi(yol: string): boolean {
  return ACIK_YOLLAR.some((a) => yol === a || yol.startsWith(`${a}/`));
}

export async function proxy(istek: NextRequest) {
  const yol = istek.nextUrl.pathname;

  if (acikMi(yol)) return NextResponse.next();

  const sir = process.env.OTURUM_SIRRI;
  if (!sir) {
    // Sır tanımlı değilse KAPALI kal. Açık bırakmak, kurulum eksikken
    // sistemi herkese açmak olurdu.
    return kapiyiKapat(istek, "kurulum");
  }

  const jeton = istek.cookies.get(OTURUM_CEREZI)?.value;
  if (!jeton) return kapiyiKapat(istek, "giris");

  const govde = await jetonuCoz(jeton, sir, Date.now());
  if (!govde) return kapiyiKapat(istek, "giris");

  return NextResponse.next();
}

function kapiyiKapat(istek: NextRequest, sebep: "giris" | "kurulum") {
  const yol = istek.nextUrl.pathname;

  // API uçları yönlendirilmez; makine okunur cevap döner.
  if (yol.startsWith("/api/")) {
    return NextResponse.json(
      { durum: sebep === "kurulum" ? "KURULUM_EKSIK" : "YETKISIZ" },
      { status: 401 },
    );
  }

  const adres = new URL("/giris", istek.url);
  // Girişten sonra kullanıcı gitmek istediği yere dönsün.
  if (yol !== "/") adres.searchParams.set("devam", yol + istek.nextUrl.search);
  if (sebep === "kurulum") adres.searchParams.set("kurulum", "1");
  return NextResponse.redirect(adres);
}

export const config = {
  /**
   * Statik dosyalar ve görsel eniyileme dışarıda: aksi hâlde giriş
   * ekranının kendi CSS'i de engellenir ve sayfa çıplak görünür.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.wasm$).*)"],
};
