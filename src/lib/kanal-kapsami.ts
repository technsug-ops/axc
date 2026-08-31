import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  KANAL KAPSAMI — HANGİ KANAL SÜTUN/ÇİP HAK EDER (31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE AÇILDI — VE BU BENİM HATAMDI. K112②'de ölçüt _"aktif hesabı olan
 *  kanal"_ diye yazıldı ve yanına _"gerçek hesabı olan kanal sayısı üç"_ diye
 *  bir cümle kondu. O cümle ÖLÇÜLMEDİ, VARSAYILDI.
 *
 *  Canlı ölçüm (31.08.2026) tersini gösterdi — 11 kanalın hepsinin aktif
 *  hesabı var, çünkü **alım hesapları** da sayılıyordu:
 *
 *      kanal          aktifHesap  satışHesabı  kanalSKU  satış
 *      Trendyol            3           1         1072    3922
 *      Hepsiburada         5           1         1092    1942
 *      N11                 2           1           49       7
 *      Amazon              4           1            0      11
 *      Elden Satış         1           1            0       0   ← OWN_STORE
 *      A101/MediaMarkt/
 *      Pazarama/Teknosa    1           0            0       0   ← ALIM hesabı
 *      Bim/PTTAvm/Vatan    0           0            0       0
 *
 *  Sonuç: `/mal-kabul` tablosu **dokuz sütun** çizdi, neredeyse hepsi
 *  "Kod yok" — ve "Kanal kodu eksik: 717" rakamı hiçbir şey söylemedi
 *  (11 kanaldan birinde bile kod yoksa sayılıyordu).
 *  _(Anayasa: "yokluk iddiası da iddiadır" — ölçmeden yazdım.)_
 *
 *  ── ⭐ DOĞRU ÖLÇÜT — İKİ ŞART BİRDEN ────────────────────────────────────
 *  ① `type = MARKETPLACE` — `Elden Satış` bir pazaryeri DEĞİL (`OWN_STORE`).
 *     Orada "kanal kodu yok" demek anlamsız: elden satışın listelemesi olmaz.
 *  ② EN AZ BİR **SATIŞ** HESABI (`satisIcin: true`) — alım hesabı olan bir
 *     kanalda ürün listelemiyoruz. A101'de hesap var ama orada satmıyoruz.
 *
 *  Bugün dördü geçiyor: Trendyol · Hepsiburada · N11 · Amazon.
 *
 *  ⚠ AMAZON SIFIR SKU İLE LİSTEDE VE BU DOĞRU: orada 11 satış var ama
 *  hiç kanal SKU'su yok — yani gerçek bir boşluk. Ölçüt "SKU'su olan"
 *  olsaydı tam da görülmesi gereken kanal listeden düşerdi.
 *
 *  ⚠ TEK GÖVDE: `/mal-kabul` sütunları ve `/stok` çipleri buradan besleniyor.
 *  İki yerde iki ölçüt olsaydı bir ekran dört, öteki dokuz kanal gösterirdi.
 * ============================================================================
 */

export type KanalKapsami = { kod: string; ad: string };

export async function pazaryeriKanallari(): Promise<KanalKapsami[]> {
  const kayitlar = await prisma.channel.findMany({
    where: {
      isActive: true,
      type: "MARKETPLACE",
      accounts: { some: { isActive: true, satisIcin: true } },
    },
    select: { code: true, name: true },
    orderBy: { name: "asc" },
  });
  return kayitlar.map((k) => ({ kod: k.code, ad: k.name }));
}
