/**
 * ============================================================================
 *  GİDER KATEGORİLERİ (SEED)
 * ----------------------------------------------------------------------------
 *  Kategoriler AYARLANABİLİR VERİDİR — sabit kod değil. Buradakiler yalnızca
 *  BAŞLANGIÇ setidir; ekrandan yeni kategori eklenebilir, adı değiştirilebilir,
 *  pasife alınabilir. Çok-kiracılı yapıda her müşteri kendi setini kullanır.
 *
 *  TEKRAR ÇALIŞTIRILABİLİR: upsert kullanır ve mevcut kaydı DEĞİŞTİRMEZ.
 *  Kategoriyi ekrandan yeniden adlandırırsanız seed geri almaz.
 *
 *  KDV ORANI NEDEN KATEGORİDEN GELİYOR:
 *  Maaş ve verginin KDV'si yoktur. Varsayılan %20 bırakılsaydı, maaş girer
 *  girmez sistem sessizce 20.000 TL'nin 3.333'ünü "indirilebilir KDV" sayar
 *  ve GERÇEK NET olduğundan iyi görünürdü. Bu yüzden oran kategoriye bağlı.
 * ============================================================================
 */

import { PrismaClient } from "../src/generated/prisma/client";

type GiderKategorisi = {
  name: string;
  /** Sabit gider mi (her ay aynı) yoksa değişken mi (işe göre oynar)? */
  isFixed: boolean;
  /** Varsayılan KDV oranı (%). KDV'siz kalemlerde 0. */
  defaultVatRate: number;
  sortOrder: number;
  /** Formda çıkacak uyarının sözlük anahtarı. */
  warningKey?: string;
};

const KATEGORILER: GiderKategorisi[] = [
  { name: "Kira", isFixed: true, defaultVatRate: 20, sortOrder: 10 },
  // Maaşta KDV yoktur — tam tutar GERÇEK NET'ten düşer.
  { name: "Maaş", isFixed: true, defaultVatRate: 0, sortOrder: 20 },
  { name: "Muhasebe", isFixed: true, defaultVatRate: 20, sortOrder: 30 },
  { name: "Abonelik", isFixed: true, defaultVatRate: 20, sortOrder: 40 },
  { name: "Banka/komisyon", isFixed: false, defaultVatRate: 20, sortOrder: 50 },
  { name: "Sarf malzeme", isFixed: false, defaultVatRate: 20, sortOrder: 60 },
  {
    name: "Vergi",
    isFixed: false,
    defaultVatRate: 0,
    sortOrder: 70,
    // NET-2 ödenecek KDV'yi zaten düşüyor; KDV ödemesi buraya girilirse
    // ÇİFT düşer. Kullanıcı kararı 10.08.2026: kategori kalsın, uyarı çıksın.
    warningKey: "vergiUyarisi",
  },
  { name: "Diğer", isFixed: false, defaultVatRate: 20, sortOrder: 80 },
];

export async function giderSeed(prisma: PrismaClient) {
  console.log(`\nGider kategorileri — ${KATEGORILER.length} kayıt.`);

  for (const kategori of KATEGORILER) {
    const kayit = await prisma.expenseCategory.upsert({
      where: { name: kategori.name },
      update: {}, // mevcut kaydı BİLEREK değiştirmiyoruz
      create: kategori,
    });
    const tur = kayit.isFixed ? "sabit" : "değişken";
    console.log(
      `  ${kayit.name.padEnd(16)} ${tur.padEnd(10)} KDV %${Number(kayit.defaultVatRate.toString())}`,
    );
  }

  const toplam = await prisma.expenseCategory.count();
  console.log(`Bitti. Toplam gider kategorisi: ${toplam}`);
}
