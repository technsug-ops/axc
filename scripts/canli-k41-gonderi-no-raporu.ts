/**
 * ============================================================================
 *  K41① GÖNDERİ NUMARASI — KURU KOŞUM (salt okuma, ŞEMA DEĞİŞMEZ)
 * ----------------------------------------------------------------------------
 *  ⚠ HİÇBİR ŞEY YAZMAZ, MIGRATION KOŞMAZ. Bu rapor onay içindir.
 *
 *  MERDİVEN ÖLÇÜLDÜ (şema en pahalı çözümdür):
 *    ① Mevcut alan taşıyabilir mi? — `Sale.code` sipariş numarası, DOLU.
 *       Başka bir kimlik alanı yok. ✗
 *    ② Serbest metin (`Sale.note`) yeter mi? — Alan ARANACAK ve BENZERSİZ
 *       olacak. Serbest metinde benzersizlik veritabanınca zorlanamaz;
 *       "girilirse benzersiz" sözü tutulamaz. ✗
 *    ③ Türetilebilir mi? — Kod pazaryerinde/kargoda oluşuyor, bizde
 *       hesaplanacak hiçbir girdisi yok. ✗
 *    ④ SÜTUN. ✓  ← kalan tek basamak
 *
 *  KOŞUM: npx tsx scripts/canli-k41-gonderi-no-raporu.ts
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("");
  console.log("=".repeat(78));
  console.log("K41① GÖNDERİ NUMARASI — KURU KOŞUM (salt okuma)");
  console.log("=".repeat(78));
  console.log(`  hedef  ${y.veri.adres.hostname}`);
  console.log(`  okuma  ${new Date().toISOString()}`);

  const toplam = await prisma.sale.count();
  const kodlu = await prisma.sale.count({ where: { code: { not: null } } });
  const kodsuz = toplam - kodlu;

  console.log("\n① ETKİLENEN KAYIT");
  console.log(`   toplam satış            ${toplam}`);
  console.log(`   sipariş no DOLU         ${kodlu}`);
  console.log(`   sipariş no BOŞ          ${kodsuz}`);
  console.log("   → yeni sütun NULLABLE; GERİ DOLDURMA GEREKMEZ.");
  console.log("     Var olan satışlarda gönderi no boş kalır ve bu DOĞRU:");
  console.log("     kod pazaryerinde sonradan oluşuyor, uydurulamaz.");

  console.log("\n② ÖNERİLEN ŞEMA (ONAY BEKLİYOR — koşulmadı)");
  console.log("   model Sale {");
  console.log("     /// Kargo/pazaryeri gönderi (takip) numarası. Sipariş no ile");
  console.log("     /// AYNI KALIP: boş bırakılabilir, GİRİLİRSE BENZERSİZ.");
  console.log("     /// Benzersizlik şart: aynı kod iki satışta olsaydı okutma");
  console.log("     /// iki sonuç döndürür ve hangisi doğru bilinemezdi.");
  console.log("     shipmentCode String? @unique");
  console.log("   }");
  console.log("   ⚠ MySQL'de nullable @unique birden çok NULL'a izin verir —");
  console.log("     `Sale.code` ile birebir aynı davranış, yeni bir kural değil.");

  console.log("\n③ ARAMA — 'AYRI LİSTE YAZILMAZ' KURALI NASIL KORUNUYOR");
  console.log("   ⚠ `kodKosulu` BEŞ yerden çağrılıyor ve HEPSİ ProductVariant");
  console.log("     sorguluyor (okut · varyant-arama · kart-arama ·");
  console.log("     urun-zemini · kart-arama-verisi). Dört rolün dördü de");
  console.log("     VARYANT alanı; gönderi no ise bir SATIŞ kimliği.");
  console.log("     Doğrudan eklemek beş çağıranı birden bozardı ve ürün");
  console.log("     aramasında gönderi numarasının anlamı yok.");
  console.log("");
  console.log("   ÇÖZÜM — liste TEK kalır, YAYIM kapsama göre ayrılır:");
  console.log("     KOD_ROLLERI  = [... , 'shipmentCode']   ← tek kayıt yeri");
  console.log("     ROL_KAPSAMI: Record<KodRolu, 'VARYANT'|'SATIS'>");
  console.log("     kodKosulu()      → yalnız VARYANT kapsamlı roller");
  console.log("     satisKodKosulu() → yalnız SATIS kapsamlı roller");
  console.log("   ⚠ `ROL_KAPSAMI` exhaustive Record: altıncı bir rol");
  console.log("     eklenince DERLENMEZ. Yani 'ayrı liste sessizce eski");
  console.log("     kalır' tuzağı kapalı — liste bir tane, unutulamaz.");

  console.log("\n④ EKRANDA NEREYE GİRİLİR");
  console.log("   · Yeni satış formu — sipariş no ile aynı kalıpta, kameralı");
  console.log("   · Satış düzenleme  — SONRADAN girilebilir");
  const duzenlenebilir = await prisma.sale.count({
    where: { iptalTarihi: null },
  });
  console.log(`     (bugün ${duzenlenebilir} iptal edilmemiş satış düzenlenebilir)`);

  console.log("\n⑤ /okut AKIŞI");
  console.log("   varyant bulunamazsa SATIŞ kimliklerinde aranır; bulunursa");
  console.log("   sipariş TEKİLDİR → 'Paketlendi' o satıra doğrudan bağlanır.");
  console.log("   ⚠ Hangi alandan bulunduğu EKRANDA yazar — `alanAdi`");
  console.log("     exhaustive Record olduğu için yeni rol eklenince o da");
  console.log("     derlenmez; ham enum ekrana sızamaz.");

  console.log("\n" + "-".repeat(78));
  console.log("  ⛔ MIGRATION KOŞULMADI. Onay bekleniyor.");
  console.log("");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
