import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K180 ③ — "KÂĞIT GİRİŞ" ÖLÇÜMÜ (SALT OKUMA · KOD ÖNCESİ)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-kagit-giris-olcum.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bir ölçütün tabanını ölçer.
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ. Ve bilerek KOD YAZILMADAN ÖNCE koşuyor.
 *
 *  ── NİYE ─────────────────────────────────────────────────────────────────
 *  K180 kaldırması, çıkışın arkasındaki GİRİŞİN gerçek olup olmadığına
 *  bakmadan stok yazıyor. `10559161422` vakasında mükerrer satırın girişi de
 *  hizalama betiğinin kâğıt kaydıydı ve kaldırma stoğa hayalet +1 attı.
 *
 *  ⛔ "KÂĞIT" ÖLÇÜTÜ UYDURULMAZ, DAĞILIMDAN KURULUR. Önce şu sorulur:
 *  kaldırılabilir satırların çıkışları hangi girişlere bağlı ve o girişler
 *  NEREDEN geliyor? Ölçüt ancak bu dağılım görüldükten sonra yazılır.
 *  _(Anayasa: "eşiği soruyu soran koyamaz" ve "bir sınırın yönü ölçülmeden
 *  çevrilmez" — yanlış kısıt bir hatayı düzeltmez, çalışan akışı kilitler.)_
 *
 *  ⚠ VE SIFIR ÜÇ FARKLI ŞEY: çıkışın parti bağı YOK · parti bağı VAR ama
 *  parti bulunamadı · parti var. Üçü AYRI sayılır.
 * ============================================================================
 */

/** Girişin kaynağı — hangi mekanizma yazdı. */
type Kaynak =
  | "GERCEK_ALIM"
  | "HIZALAMA_BETIGI"
  | "DOSYA_MALIYET"
  | "SAYIM"
  | "IADE"
  | "IPTAL_AYNASI"
  | "DEVIR"
  | "NOTSUZ_ALIM"
  | "DIGER";

/**
 * ⚠ SINIF NOTTAN OKUNUR — ve not bir BEYANDIR, kesin kimlik değil.
 * Betikler notlarını kendileri yazıyor (`listeye-hizala-2`,
 * `dosya-maliyet-20260828`, `sayim-fiziksel`). Bu yüzden sınıf "tahmin"
 * değil ama "kanıt" da değil: ölçümün kapsamı budur ve raporda yazar.
 */
function kaynakSinifi(h: {
  type: string;
  note: string | null;
  purchaseItemId: string | null;
  returnItemId: string | null;
  sayimSatiriId: string | null;
}): Kaynak {
  const n = (h.note ?? "").toLowerCase();
  if (h.sayimSatiriId !== null || h.type === "COUNT_CORRECTION") return "SAYIM";
  if (h.returnItemId !== null || h.type === "RETURN_IN") return "IADE";
  if (h.type === "SALE_CANCEL_IN") return "IPTAL_AYNASI";
  if (h.type === "INITIAL") return "DEVIR";
  if (n.includes("listeye-hizala")) return "HIZALAMA_BETIGI";
  if (n.includes("dosya-maliyet")) return "DOSYA_MALIYET";
  if (n.includes("sayim")) return "SAYIM";
  if (h.purchaseItemId !== null) return "GERCEK_ALIM";
  if (h.type === "PURCHASE_IN") return "NOTSUZ_ALIM";
  return "DIGER";
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { KALEM_GECERLI } = await import("../src/lib/kalem-gecerli");

  console.log("\nK180 ③ — KÂĞIT GİRİŞ ÖLÇÜMÜ (SALT OKUMA)");
  console.log("  an  " + new Date().toISOString());
  console.log("=".repeat(76));

  /**
   * KAPSAM: KALDIRILABİLİR satırlar — iptalsiz satışın geçerli kalemleri.
   * Kaldırma zaten iptalli satışta ve iadeli kalemde durduğu için kapsam
   * kaldırmanın kendi kapılarıyla AYNI kümeyi seçiyor.
   */
  const kalemler = await prisma.saleItem.findMany({
    where: { ...KALEM_GECERLI, sale: { iptalTarihi: null }, returnItems: { none: {} } },
    select: {
      id: true,
      stockMovements: {
        where: { type: "SALE_OUT" },
        select: { id: true, quantityDelta: true, sourceMovementId: true },
      },
    },
  });

  console.log("\n① KAPSAM");
  console.log("   kaldırılabilir kalem  " + kalemler.length);

  const cikislar = kalemler.flatMap((k) => k.stockMovements);
  const bagsiz = cikislar.filter((c) => c.sourceMovementId === null);
  const bagli = cikislar.filter((c) => c.sourceMovementId !== null);
  console.log("   SALE_OUT hareketi     " + cikislar.length);
  console.log("   ⛔ parti bağı YOK     " + bagsiz.length + "   ← hüküm verilemez");
  console.log("   parti bağı VAR        " + bagli.length);

  /* ═══ ② PARTİLERİN KAYNAĞI ════════════════════════════════════════ */
  const partiIdleri = [...new Set(bagli.map((c) => c.sourceMovementId!))];
  const partiler = await prisma.stockMovement.findMany({
    where: { id: { in: partiIdleri } },
    select: {
      id: true,
      type: true,
      note: true,
      purchaseItemId: true,
      returnItemId: true,
      sayimSatiriId: true,
    },
  });
  const haritasi = new Map(partiler.map((p) => [p.id, p]));

  /** ⚠ BULUNAMAYAN PARTİ AYRI SAYILIR — "kaynak yok" ile karıştırılmaz. */
  const bulunamayan = partiIdleri.filter((i) => !haritasi.has(i)).length;

  const dagilim = new Map<Kaynak, number>();
  for (const c of bagli) {
    const p = haritasi.get(c.sourceMovementId!);
    if (p === undefined) continue;
    const s = kaynakSinifi(p);
    dagilim.set(s, (dagilim.get(s) ?? 0) + 1);
  }

  console.log("\n② ÇIKIŞIN BAĞLI OLDUĞU GİRİŞİN KAYNAĞI (çıkış başına)");
  console.log("   ⚠ Sınıf NOTTAN okundu — not betiklerin kendi beyanı.");
  const sirali = [...dagilim].sort((a, b) => b[1] - a[1]);
  const toplam = sirali.reduce((t, [, n]) => t + n, 0);
  for (const [s, n] of sirali) {
    const pay = toplam === 0 ? 0 : (n / toplam) * 100;
    console.log(`   ${s.padEnd(18)} ${String(n).padStart(6)}   %${pay.toFixed(1)}`);
  }
  console.log(`   ${"partisi BULUNAMADI".padEnd(18)} ${String(bulunamayan).padStart(6)}`);

  /* ═══ ③ AYIRT EDİCİ SORU — KÂĞIT ÇİFTİ ═══════════════════════════ */
  /**
   * ⭐ ASIL ÖLÇÜT ADAYI: girişin "kâğıt" olması tek başına yetmez —
   * `10559161422` vakasında ayırt edici olan, girişin O ÇIKIŞI DENGELEMEK
   * İÇİN aynı betik koşumunda yazılmış olmasıydı (aynı not, aynı gün, 1'e 1).
   * Bu bir HİPOTEZDİR ve burada ölçülüyor: kaç çıkışın partisi kendisiyle
   * AYNI NOTU taşıyor?
   */
  const ayniNot = await prisma.stockMovement.findMany({
    where: { id: { in: bagli.map((c) => c.id) } },
    select: { id: true, note: true, sourceMovementId: true },
  });
  let esNotlu = 0;
  let notsuzCikis = 0;
  for (const c of ayniNot) {
    const p = c.sourceMovementId === null ? undefined : haritasi.get(c.sourceMovementId);
    if (p === undefined) continue;
    if ((c.note ?? "") === "") {
      notsuzCikis++;
      continue;
    }
    if ((c.note ?? "") === (p.note ?? "")) esNotlu++;
  }
  /* ═══ ②b SINIFLAMANIN KENDİ KUSURU — ÖLÇÜLÜR ═════════════════════ */
  /**
   * ⛔ SIRA TUZAĞI: yukarıdaki sınıflayıcı NOTA `purchaseItemId`DEN ÖNCE
   * bakıyor. Yani "DOSYA_MALIYET" sayılan bir girişin arkasında GERÇEK bir
   * `PurchaseItem` kaydı olabilir ve o zaman "kâğıt" demek yanlış olur.
   * Rakamı okumadan önce bu ayrım ölçülür.
   * _(Anayasa: "sıfır üç farklı şey olabilir — üçü ayrı sayılır".)_
   */
  const notluPartiler = partiler.filter((p) => kaynakSinifi(p) === "DOSYA_MALIYET");
  const notluAmaAlimli = notluPartiler.filter((p) => p.purchaseItemId !== null).length;
  console.log("\n②b DOSYA_MALIYET NOTLU GİRİŞLERİN ARKASI");
  console.log(`   toplam parti            ${notluPartiler.length}`);
  console.log(`   ⭐ PurchaseItem'i VAR   ${notluAmaAlimli}   ← "kâğıt" DEĞİL`);
  console.log(`   PurchaseItem'i YOK      ${notluPartiler.length - notluAmaAlimli}`);

  console.log("\n③ HİPOTEZ — çıkış ile partisi AYNI NOTU taşıyor mu");
  console.log("   (kâğıt çifti: giriş, o çıkışı dengelemek için yazılmış)");
  console.log(`   aynı notlu çift   ${esNotlu}`);
  console.log(`   notsuz çıkış      ${notsuzCikis}   ← hüküm verilemez`);
  console.log(
    `   ⚠ Bu bir HİPOTEZ; ölçüt yazılmadan önce örneklerine BAKILIR.`,
  );

  console.log("\n" + "=".repeat(76));
  console.log("  SALT OKUMA — hiçbir şey yazılmadı. Kod bu ölçümden SONRA yazılır.");
  await prisma.$disconnect();
}

void main();
