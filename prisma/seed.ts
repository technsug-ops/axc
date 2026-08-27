/**
 * ============================================================================
 *  SELLIORA — SABİT VERİ (SEED)
 * ----------------------------------------------------------------------------
 *  Ne yazar : Sadece pazaryeri kanallarını (Channel tablosu).
 *  Ne YAZMAZ: ChannelAccount (mağaza/hesap). Onlar size özel veridir; hangi
 *             pazaryerinde kaç mağazanız olduğunu ve para birimlerini
 *             bilmediğim için elle girilecek.
 *
 *  ÇALIŞTIRMA:  npx prisma db seed
 *  Prisma 7'de seed, migration ile OTOMATİK çalışmaz — açıkça çağrılır.
 *
 *  TEKRAR ÇALIŞTIRILABİLİR (idempotent): upsert kullanır. Var olan kaydı
 *  değiştirmez; kanal adını panelden elle düzeltirseniz seed geri almaz.
 * ============================================================================
 */

import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { ChannelType } from "../src/generated/prisma/enums";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { karMotoruSeed } from "./seed-kar-motoru";
import { stokDuzeltmeSeed } from "./seed-stok-duzeltme";
import { yetkiSeed } from "./seed-yetki";
import { iadeSeed } from "./seed-iade";
import { giderSeed } from "./seed-gider";

// Seed de bir betiktir: tek bağlantı yeter, canlının kotasını yemesin.
const adapter = new PrismaMariaDb(betikAdresi(process.env.DATABASE_URL!));
const prisma = new PrismaClient({ adapter });

/**
 * Kural 3'teki 11 pazaryeri.
 * `code` benzersizdir ve bir kez yazıldıktan sonra ASLA değiştirilmemelidir —
 * kanal hesapları ve kanal SKU'ları buna bağlanacak.
 */
const CHANNELS: { code: string; name: string; type: ChannelType }[] = [
  { code: "TRENDYOL", name: "Trendyol", type: ChannelType.MARKETPLACE },
  { code: "HEPSIBURADA", name: "Hepsiburada", type: ChannelType.MARKETPLACE },
  { code: "AMAZON", name: "Amazon", type: ChannelType.MARKETPLACE },
  { code: "N11", name: "N11", type: ChannelType.MARKETPLACE },
  { code: "BIM", name: "Bim", type: ChannelType.MARKETPLACE },
  { code: "A101", name: "A101", type: ChannelType.MARKETPLACE },
  { code: "TEKNOSA", name: "Teknosa", type: ChannelType.MARKETPLACE },
  { code: "MEDIAMARKT", name: "MediaMarkt", type: ChannelType.MARKETPLACE },
  { code: "VATAN", name: "Vatan", type: ChannelType.MARKETPLACE },
  { code: "PAZARAMA", name: "Pazarama", type: ChannelType.MARKETPLACE },
  { code: "PTTAVM", name: "PTTAvm", type: ChannelType.MARKETPLACE },

  /**
   * ELDEN SATIŞ — pazaryeri DEĞİL, ama satış kanalı (kullanıcı kararı
   * 28.08.2026). Mal doğrudan elden satılıyor: alışı ve satışı var,
   * üçüncü taraf komisyonu YOK (ölçüldü: 12 satırın 11'inde komisyon
   * ve kargo sıfır). Kaynak dosyada `PAZAR YERI = DEPO` etiketiyle geçer,
   * bu yüzden kod da `DEPO`.
   *
   * ⚠ `type = OWN_STORE` BİR VEKİLDİR VE SAKLANMIYOR. Elden satış "kendi
   * siteniz" değildir; örtüşen şey DAVRANIŞ (üçüncü taraf komisyonu yok),
   * ad değil. Bugün zararsız çünkü ÖLÇÜLDÜ: `Channel.type` kodun hiçbir
   * yerinde okunmuyor — seed yazıyor, hiçbir ekran ya da karar branch
   * etmiyor. Şema değişikliği bu yüzden HAK EDİLMEDİ.
   *
   * ⛔ AÇILIŞ ŞARTI: bir rapor/ekran ilk kez `Channel.type`a göre
   * dallandığında gerçek bir enum değeri (`DIRECT`) eklenir — o gün
   * migration hak edilmiş olur. Şartsız bekleyen alan, unutulmuş alandır.
   */
  { code: "DEPO", name: "Elden Satış", type: ChannelType.OWN_STORE },
];

async function main() {
  console.log(`Kanal seed'i başlıyor — ${CHANNELS.length} kayıt.`);

  for (const channel of CHANNELS) {
    const saved = await prisma.channel.upsert({
      where: { code: channel.code },
      update: {}, // mevcut kaydı BİLEREK değiştirmiyoruz
      create: channel,
    });
    console.log(`  ${saved.code.padEnd(12)} -> ${saved.name}`);
  }

  const total = await prisma.channel.count();
  console.log(`Bitti. Veritabanındaki toplam kanal sayısı: ${total}`);

  // Kâr motoru sabit verisi: KDV kategorileri, kanal kesintileri,
  // kargo firmaları ve tarifeleri.
  await karMotoruSeed(prisma);

  // Iade sabit verisi: kanal politikasi + ceza tarifeleri.
  await iadeSeed(prisma);

  // Gider kategorileri — baslangic seti; ekrandan degistirilebilir.
  await giderSeed(prisma);

  await stokDuzeltmeSeed(prisma);

  await yetkiSeed(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed hatası:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
