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
 *  KULLANIM:
 *      import { prisma } from "@/lib/prisma";
 *      const urunler = await prisma.product.findMany();
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

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
  return new PrismaClient({ adapter: new PrismaMariaDb(url) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
