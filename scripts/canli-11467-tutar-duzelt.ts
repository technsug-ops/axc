import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  11467475277 — BİRİM TUTAR DÜZELTMESİ  1.812,00 → 1.833,00
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:11467-tutar             → RAPOR, hiçbir şey yazmaz
 *      npm run canli:11467-tutar -- --uygula → yazar
 *
 *  ⚠ BU BİR PARA ALANI VE METADATA İSTİSNASI KAPSAMINA GİRMEZ.
 *  Anayasadaki dar istisna (izli betikle metadata düzeltme) açıkça
 *  _"değişen alan miktar ya da para DEĞİL"_ diyor. Burada değişen şey
 *  PARA. Betik bu yüzden bir GENEL ARAÇ değil, **tek kaydın kimliğine
 *  kilitli** ve kullanıcının AÇIK TALİMATIYLA yazılmıştır (26.08.2026).
 *
 *  ⚠ KAYNAK: kanalın kendi belgesi — fatura **TEA2026000002284**
 *  (03.08.2026). Kaynak sırasında 1. basamak; API'nin brütü ile aynı
 *  rakamı veriyor (1.833,00) ve defterdeki 1.812,00'yi düşürüyor.
 *
 *  ⚠ LEDGER'A DOKUNMAZ. `StockMovement` okunmaz, yazılmaz, silinmez.
 *  Değişen tek şey `SaleItem.unitPriceAmount` ve onun tetiklediği kâr
 *  yeniden hesabı.
 *
 *  ⚠ ADRES BAŞTA SABİTLENİR: kâr motoru uygulamanın `prisma` TEKİLİNİ
 *  kullanır ve adresi ortam değişkeninden okur. Kendi istemcimizle
 *  bağlanıp motoru öylece çağırsaydık CANLIDAN OKUYUP YERELE YAZARDI.
 * ============================================================================
 */

const UYGULA = process.argv.includes("--uygula");

/** ⚠ KİMLİĞE KİLİTLİ — genel araç DEĞİL. */
const SIPARIS_NO = "11467475277";
const ESKI_TUTAR = 1812;
const YENI_TUTAR = 1833;
const KAYNAK = "KANAL_BELGESI";
const BELGE = "TEA2026000002284 (03.08.2026)";

const para = (d: unknown) => Number(String(d)).toFixed(2);

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);

  const { prisma } = await import("../src/lib/prisma");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");

  console.log("\n" + "=".repeat(74));
  console.log(`11467475277 TUTAR DÜZELTMESİ — ${UYGULA ? "⚠ YAZIM" : "RAPOR (yazmaz)"}`);
  console.log("=".repeat(74));
  console.log(`  kaynak : ${KAYNAK} — ${BELGE}`);

  const satis = await prisma.sale.findFirst({
    where: { code: SIPARIS_NO },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!satis) {
    console.log(`\n⛔ ${SIPARIS_NO} KAYDI YOK — düzeltme yapılmadı.\n`);
    process.exitCode = 1;
    return;
  }
  if (satis.items.length !== 1) {
    /**
     * ⚠ TEK KALEM ŞARTI. Kalem sayısı değişmişse hangi kalemin
     * düzeltileceği belirsizdir ve tahmin edilmez.
     */
    console.log(`\n⛔ BEKLENEN 1 KALEM, BULUNAN ${satis.items.length} — durduruldu.\n`);
    process.exitCode = 1;
    return;
  }
  const kalem = satis.items[0];
  const mevcut = Number(String(kalem.unitPriceAmount));

  console.log(`\n  satış id      ${satis.id}`);
  console.log(`  kalem id      ${kalem.id}`);
  console.log(`  barkod        ${kalem.variantId}`);
  console.log(`  adet          ${kalem.quantity}`);
  console.log(`  mevcut tutar  ${para(kalem.unitPriceAmount)}`);
  console.log(`  hedef tutar   ${YENI_TUTAR.toFixed(2)}`);
  console.log(`  mevcut NET-2  ${satis.net2Amount === null ? "—" : para(satis.net2Amount)}`);

  /**
   * ═══ İDEMPOTENT: HEDEF DEĞERDEYSE HİÇBİR ŞEY YAPILMAZ ═══════════════
   * ⚠ İkinci koşum yazmamalı — ve "yazmadım" demesi yetmez, NİYE
   * yazmadığını da söylemeli. Sessiz atlama, çalışmayan bir betikle
   * zaten-doğru bir kaydı ayırt edilemez yapardı.
   */
  if (mevcut === YENI_TUTAR) {
    console.log(`\n  ✓ ZATEN ${YENI_TUTAR.toFixed(2)} — düzeltme daha önce uygulanmış.`);
    console.log(`    İkinci koşum HİÇBİR ŞEY YAZMADI (idempotent).\n`);
    await prisma.$disconnect();
    return;
  }
  /**
   * ⚠ BEKLENEN ESKİ DEĞER DE SINANIR. Kayıt arada başka bir yolla
   * değiştiyse (ekrandan elle), bu betik onun üstüne yazmaz — çünkü o
   * durumda hangi değerin doğru olduğunu bilmiyoruz.
   */
  if (mevcut !== ESKI_TUTAR) {
    console.log(`\n  ⛔ BEKLENEN ESKİ DEĞER ${ESKI_TUTAR.toFixed(2)}, BULUNAN ${mevcut.toFixed(2)}.`);
    console.log(`     Kayıt arada başka bir yolla değişmiş — ÜSTÜNE YAZILMADI.`);
    console.log(`     Hangi değerin doğru olduğu ölçülmeden karar verilmez.\n`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  if (!UYGULA) {
    console.log(`\n  RAPOR — hiçbir şey yazılmadı. Yazmak için: -- --uygula\n`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\n  YAZILIYOR…`);
  await prisma.$transaction(async (tx) => {
    await tx.saleItem.update({
      where: { id: kalem.id },
      data: { unitPriceAmount: YENI_TUTAR },
    });
    /**
     * ⚠ İZ, ESKİ VE YENİ DEĞERİ BİRLİKTE TAŞIR. Yalnız yeni değer
     * yazılsaydı üç ay sonra "neyi düzelttik" sorusunun cevabı olmazdı.
     */
    await tx.auditLog.create({
      data: {
        action: "SATIS_TUTAR_DUZELTME",
        targetType: "SaleItem",
        targetId: kalem.id,
        detail: JSON.stringify({
          siparisNo: SIPARIS_NO,
          saleId: satis.id,
          alan: "unitPriceAmount",
          eski: ESKI_TUTAR,
          yeni: YENI_TUTAR,
          fark: YENI_TUTAR - ESKI_TUTAR,
          kaynak: KAYNAK,
          belge: BELGE,
          not: "Mutabakat (c) kovasindaki -21,00 sapmasi. Kanalin kendi faturasi defterdeki tutari dusurdu. Ledger'a DOKUNULMADI.",
        }),
      },
    });
  });
  console.log(`  ✓ tutar yazıldı · AuditLog: SATIS_TUTAR_DUZELTME`);

  /**
   * ⚠ KÂR TAZELENİR — VE BU İSTEĞE BAĞLI DEĞİL. Tutar kârın GİRDİSİ;
   * tazelenmezse ekran yeni tutarı, NET eski tutarın hesabını gösterir
   * ve ikisi sessizce ayrışır. _(Anayasa: "ilke, kendi kapsamının dışına
   * uygulanırsa hatayı korur" — snapshot dokunulmazlığı DOĞRU koşullarla
   * hesaplanmış snapshot'ı korur; bu yanlış tutarla hesaplanmıştı.)_
   */
  const tazelendi = await satisKarTazele(satis.id);
  console.log(`  ${tazelendi ? "✓" : "⛔"} kâr tazeleme: ${tazelendi ? "tamam" : "BAŞARISIZ"}`);

  const sonra = await prisma.sale.findUnique({
    where: { id: satis.id },
    select: { net1Amount: true, net2Amount: true, profitStatus: true, items: { select: { unitPriceAmount: true } } },
  });
  console.log(`\n  SONRA:`);
  console.log(`    tutar   ${para(sonra?.items[0]?.unitPriceAmount)}`);
  console.log(`    NET-1   ${sonra?.net1Amount === null ? "—" : para(sonra?.net1Amount)}`);
  console.log(`    NET-2   ${sonra?.net2Amount === null ? "—" : para(sonra?.net2Amount)}   (${sonra?.profitStatus ?? "—"})`);
  console.log(`\n  ⚠ Mutabakat (c) kovası 21 → 20 olmalı. Doğrulama:`);
  console.log(`     npm run canli:ty-mutabakat\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
