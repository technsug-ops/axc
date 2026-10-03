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
import { aktifFirmaKimligi } from "@/lib/firma-baglami";
import { argumanlariSuz, FirmaBaglamiHatasi, firmaModeliMi } from "@/lib/firma-suzgeci";

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
  return new PrismaClient({ adapter: new PrismaMariaDb(havuzluAdres(url)) });
}

let istemci: PrismaClient | undefined;

function istemciyiAl(): PrismaClient {
  if (istemci) return istemci;

  istemci = globalForPrisma.prisma ?? createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = istemci;
  }
  return istemci;
}

/**
 * ============================================================================
 *  K303 AŞAMA 3a — FİRMA SÜZGEÇLİ İSTEMCİ
 * ----------------------------------------------------------------------------
 *  `prisma` artık firmaya ait 49 modelde her sorguyu aktif firmaya göre süzer
 *  ve her yazıma firmayı yazar (`lib/firma-suzgeci.ts`, saf gövde). Firma
 *  bilinmiyorsa sorgu `FIRMA_BAGLAMI_YOK` ile DURUR. 197 çağrı yeri değişmedi.
 *  `$transaction(async (tx) => …)` içindeki `tx` de süzgeçlidir (Prisma
 *  uzantıları etkileşimli işleme taşınır).
 *
 *  `sistemPrisma` SÜZGEÇSİZDİR: firmalar-üstü işler içindir (oturum, üyelik/
 *  yetki çözümü, tam yedek ve geri yükleme). Her kullanımı gerekçeli olmalı —
 *  bekçisi `firma-suzgeci:dogrula` (desen yasağı, beyan `SISTEM:`).
 * ============================================================================
 */
let suzgecli: PrismaClient | undefined;

function suzgecliyiAl(): PrismaClient {
  if (suzgecli) return suzgecli;
  suzgecli = istemciyiAl().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!firmaModeliMi(model)) return query(args);
          const companyId = await aktifFirmaKimligi();
          if (!companyId) {
            throw new FirmaBaglamiHatasi("FIRMA_BAGLAMI_YOK", `${model}.${operation}`);
          }
          return query(argumanlariSuz(model, operation, args, companyId) as typeof args);
        },
      },
    },
  }) as unknown as PrismaClient;
  return suzgecli;
}

function vekil(al: () => PrismaClient): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_hedef, ozellik) {
      const gercek = al() as unknown as Record<string | symbol, unknown>;
      const deger = gercek[ozellik];
      // Metotların `this` bağı korunmalı ($transaction, $disconnect...).
      return typeof deger === "function" ? deger.bind(gercek) : deger;
    },
  });
}

/**
 * Dışarıya istemcinin kendisi değil, ilk erişimde onu kuran bir vekil
 * (proxy) veriliyor. Çağrı yerleri değişmedi: `prisma.product.findMany()`
 * aynen çalışır — artık aktif firmaya süzülmüş olarak.
 */
export const prisma = vekil(suzgecliyiAl);

/** SÜZGEÇSİZ — yalnız firmalar-üstü işler (yukarıdaki başlık). */
export const sistemPrisma = vekil(istemciyiAl);

/**
 * İnteraktif transaction içindeki istemci:
 *   await prisma.$transaction(async (tx) => { ... })
 *
 * Prisma 7'nin yeni `prisma-client` jeneratörü `TransactionClient` tipini dışa
 * açmıyor; `$` ile başlayan yönetim metotlarını çıkararak türetiyoruz. Böylece
 * transaction içinde çalışan yardımcılar hem `prisma` hem `tx` kabul edebilir.
 */
export type IslemIstemcisi = Omit<PrismaClient, `$${string}`>;
