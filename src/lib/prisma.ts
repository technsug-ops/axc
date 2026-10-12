/**
 * ============================================================================
 *  PRISMA CLIENT — TEKİL (SINGLETON) ÖRNEK
 * ----------------------------------------------------------------------------
 *  NEDEN GEREKLİ:
 *  Next.js geliştirme modunda her dosya değişikliğinde modüller yeniden
 *  yüklenir. Her yüklemede yeni bir PrismaClient açılırsa her biri kendi
 *  bağlantı havuzunu açar ve MySQL kısa sürede "Too many connections" hatası
 *  verir. Bu yüzden dev ortamında client globalThis üzerinde saklanır ve
 *  tekrar kullanılır. Production'da modüller bir kez yüklendiği için global'e
 *  yazmaya gerek yoktur.
 *
 *  NEDEN TEMBEL (LAZY):
 *  İstemci eskiden modül yüklenirken kuruluyordu ve DATABASE_URL yoksa
 *  IMPORT ANINDA hata fırlatıyordu. `next build` her sayfayı yüklediği için
 *  derleme, hiç sorgu yapılmasa bile veritabanına bağımlı hâle geliyordu —
 *  Vercel'deki ilk dağıtım tam olarak bunun yüzünden patladı (10.08.2026):
 *
 *      Error: DATABASE_URL tanımlı değil.
 *        at module evaluation (src/lib/prisma.ts)
 *        at module evaluation (src/app/alimlar/[id]/mal-kabul/page.tsx)
 *
 *  Artık istemci İLK KULLANIMDA kuruluyor. Bağlantı ayarı eksikse hata yine
 *  çıkar — ama derleme sırasında değil, gerçekten sorgu yapıldığı anda.
 *
 *  KULLANIM (değişmedi):
 *      import { prisma } from "@/lib/prisma";
 *      const urunler = await prisma.product.findMany();
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { havuzluAdres } from "@/lib/veritabani-adresi";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL tanımlı değil. .env dosyasını kontrol edin."
    );
  }

  // Prisma 7'de MySQL bağlantısı driver adapter üzerinden kurulur.
  // Havuz ayarları adrese burada eklenir — gerekçesi ve ölçülen sunucu
  // sınırları için bkz. lib/veritabani-adresi.ts. BU SARMALAYICI
  // KALDIRILMAZ: çıplak adresle sürücü varsayılanları geçerli olur
  // (connectionLimit 10, minimumIdle 10) ve havuz hiç iş yokken 10 bağlantı
  // park eder — hesabın 25'lik kotası boşuna dolar.
  /**
   * ⚡ METİN PROTOKOLÜ (K332, 12.10.2026) — sorgu başına İKİ değil BİR gidiş-dönüş.
   * Ölçüldü (yerel sorgu kaydı): panel 80 sorgu atıyordu ve HER biri önce
   * «Prepare» (ayrı gidiş-dönüş), sonra çalıştırma, sonra «Close stmt» —
   * bağdaştırıcının varsayılanı sürücünün ikili protokolü (`execute`).
   * Canlıda gidiş-dönüş ~20 ms (KAS): panelde ~80 fazladan gidiş-dönüş.
   * `useTextProtocol` bağdaştırıcının belgeli, kararlı seçeneği (`query`);
   * parametreleri sürücü kaçışlar. Açılmadan önce 14 sayfanın çıktısı eski ve
   * yeni sürümde karşılaştırıldı (rakam farkı yok — pano K332).
   */
  return new PrismaClient({ adapter: new PrismaMariaDb(havuzluAdres(url), { useTextProtocol: true }) });
}

let istemci: PrismaClient | undefined;

/** ⏱ SÜRE İZİ — TEST İÇİN AÇILDI (K332, kaldırılacak): istemci bu süreçte kuruldu mu. */
export function istemciKuruluMu(): boolean {
  return istemci !== undefined;
}

function istemciyiAl(): PrismaClient {
  if (istemci) return istemci;

  istemci = globalForPrisma.prisma ?? createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = istemci;
  }
  return istemci;
}

/**
 * Dışarıya istemcinin kendisi değil, ilk erişimde onu kuran bir vekil
 * (proxy) veriliyor. Çağrı yerleri değişmedi: `prisma.product.findMany()`
 * aynen çalışır.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_hedef, ozellik) {
    const gercek = istemciyiAl() as unknown as Record<
      string | symbol,
      unknown
    >;
    const deger = gercek[ozellik];
    // Metotların `this` bağı korunmalı ($transaction, $disconnect...).
    return typeof deger === "function" ? deger.bind(gercek) : deger;
  },
});

/**
 * İnteraktif transaction içindeki istemci:
 *   await prisma.$transaction(async (tx) => { ... })
 *
 * Prisma 7'nin yeni `prisma-client` jeneratörü `TransactionClient` tipini dışa
 * açmıyor; `$` ile başlayan yönetim metotlarını çıkararak türetiyoruz. Böylece
 * transaction içinde çalışan yardımcılar hem `prisma` hem `tx` kabul edebilir.
 */
export type IslemIstemcisi = Omit<PrismaClient, `$${string}`>;
