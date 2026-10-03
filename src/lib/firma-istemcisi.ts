import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { argumanlariSuz, FirmaBaglamiHatasi, firmaModeliMi } from "@/lib/firma-suzgeci";

/**
 * ============================================================================
 *  FİRMA SÜZGECİ UZANTISI — TEK GÖVDE (K303 Aşama 3b)
 * ----------------------------------------------------------------------------
 *  Süzgeç iki yerden kullanılır ve İKİSİ DE bu gövdeden geçer:
 *  · web istekleri — ortak `prisma` (`lib/prisma.ts`), firma oturumdan/bağlamdan;
 *  · çekim betikleri ve zamanlanmış işler — `firmaIstemcisi(adres, companyId)`,
 *    firma ÇAĞIRAN tarafından açıkça verilir.
 *
 *  ⛔ VAKA (ölçüldü 03.10.2026): 7 zamanlanmış işin hepsi `scripts/` altındaki
 *  çekim betiklerini çağırıyor ve o betikler `new PrismaClient(...)` ile KENDİ
 *  istemcisini kuruyordu — süzgeç onlara HİÇ ulaşmıyordu. Tek firmada zararsız;
 *  çok firmada bir firmanın çekimi ötekinin satırlarını görür ve firmasız satır
 *  yazardı. İki ayrı süzgeç yazılsaydı biri ötekinden geri kalırdı (anayasa:
 *  «iki yerde iki ölçüt olmaz»).
 * ============================================================================
 */

export function suzgecUzat(istemci: PrismaClient, firmaBul: () => Promise<string | null> | string | null): PrismaClient {
  return istemci.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!firmaModeliMi(model)) return query(args);
          const companyId = await firmaBul();
          if (!companyId) {
            throw new FirmaBaglamiHatasi("FIRMA_BAGLAMI_YOK", `${model}.${operation}`);
          }
          return query(argumanlariSuz(model, operation, args, companyId) as typeof args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

/**
 * Betik/zamanlanmış iş istemcisi: firma SABİT, kurulurken verilir.
 * Boş firma ile kurulamaz — «parametresiz koşum HATA verir» (tasarım §5).
 */
export function firmaIstemcisi(adres: string, companyId: string): PrismaClient {
  if (!companyId) {
    throw new FirmaBaglamiHatasi("FIRMA_BAGLAMI_YOK", "firmaIstemcisi: companyId verilmedi");
  }
  const ham = new PrismaClient({ adapter: new PrismaMariaDb(adres) });
  return suzgecUzat(ham, () => companyId);
}
