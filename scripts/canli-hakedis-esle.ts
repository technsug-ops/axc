/**
 * ============================================================================
 *  BAĞSIZ HAKEDİŞ KALEMLERİNİ EŞLEŞTİR — TEKRARLANABİLİR TAZELEME
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:hakedis-esle             → YALNIZ RAPOR, hiçbir şey yazmaz
 *      npm run canli:hakedis-esle -- --uygula → bağları yazar
 *
 *  ⚠ NİYE VAR — YAPISAL KÖR NOKTA, tarihsel kaza değil.
 *
 *  Bağ YALNIZ yükleme anında kuruluyor (`satirlariEslestir`). Rapor,
 *  satışlar sisteme girilmeden yüklenirse o an karşılık bulunmaz ve kalem
 *  SONSUZA DEK bağsız kalır. 18.08.2026 ölçümü: 651 kalemin 0'ı bağlı —
 *  üçüncü kez sıfır (13.08: 651/0 · 15.08: 110/0).
 *
 *  Bu sıra bir daha ters dönebilir: Trendyol raporu haftalık geliyor,
 *  satışlar elle giriliyor. Bu yüzden araç TEK SEFERLİK DEĞİL,
 *  TEKRARLANABİLİR: her koşuda yalnız o an bağsız olanlara bakar,
 *  bağlıya dokunmaz, iki kez koşmak bir kez koşmakla aynı sonucu verir.
 *
 *  ── NE YAPAR, NE YAPMAZ ─────────────────────────────────────────────────
 *  YAPAR : `saleId` BOŞ olan kaleme, sipariş kodu BİREBİR tutan satışı bağlar.
 *  YAPMAZ: tutar, vade, kâr, stok — hiçbirine dokunmaz. Yalnız bağ yazılır.
 *          Bağlı bir kalemi ASLA yeniden bağlamaz ya da koparmaz.
 *
 *  Bağ, satışın rakamlarını DEĞİŞTİRMEZ; yalnız karşılaştırmayı MÜMKÜN
 *  kılar. Kayıt kalitesizse zaten eşleşmez; eşleşip tutmuyorsa ekranda
 *  "EKSİK/FAZLA ÖDEME" olarak görünür — bu BİLGİDİR, bozulma değil.
 *
 *  ── AYNI KURAL, YÜKLEME YOLUYLA ─────────────────────────────────────────
 *  Eşleşme ölçütü yükleme yolundakiyle AYNI tutuldu: sipariş kodu birebir
 *  + satış İPTALLİ DEĞİL. İptalli satış eşleşseydi kanalın ödemeyeceği bir
 *  tutar "bekleyen hakediş" olarak görünür ve nakit beklentisi şişerdi.
 *
 *  ── TEK YENİ KONTROL: KANAL ─────────────────────────────────────────────
 *  Yükleme yolu kanal kontrolü yapmaz ve YAPMASINA GEREK YOKTUR: tek bir
 *  kanalın raporu yüklenir, kodlar zaten o kanaldandır. TOPLU tazelemede
 *  ise bütün kanallar aynı anda taranır ve çapraz eşleşme ilk kez MÜMKÜN
 *  hâle gelir. Bu ayrı bir kural değil, aynı niyetin yeni bağlamda açıkça
 *  yazılmış hâlidir: kanalı tutmayan satır BAĞLANMAZ, listelenir.
 *
 *  ── ÇİFT EŞLEŞME REDDEDİLİR ─────────────────────────────────────────────
 *  Aynı sipariş kodu birden çok satışa düşüyorsa hangisi olduğu BİLİNMEZ.
 *  Tahmin edip bağlamak, yanlış satışa para yazmaktır — satır bağlanmaz ve
 *  elle karara bırakılır.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import {
  eslemeOzeti,
  yenidenEsle,
  type RetSebebi,
} from "../src/lib/hakedis/yeniden-esle";
import { canliYapilandirma } from "./canli-ortak";

const UYGULA = process.argv.includes("--uygula");

function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
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

  console.log("");
  console.log("BAĞSIZ HAKEDİŞ KALEMLERİNİ EŞLEŞTİR");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log(`  kip        ${UYGULA ? "UYGULA (bağ yazar)" : "RAPOR (yazmaz)"}`);
  console.log("");

  /** YALNIZ BAĞSIZ OLANLAR — bağlıya dokunulmaz (tekrarlanabilirlik). */
  const bagsizlar = await prisma.settlementItem.findMany({
    where: { saleId: null, orderNo: { not: null } },
    select: {
      id: true,
      orderNo: true,
      amount: true,
      channelAccountId: true,
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
    },
  });

  console.log(`  bağsız kalem (sipariş nolu): ${bagsizlar.length}`);
  if (bagsizlar.length === 0) {
    console.log("  Bağlanacak kalem yok.");
    await prisma.$disconnect();
    return;
  }

  const nolar = [
    ...new Set(
      bagsizlar
        .map((k) => (k.orderNo ?? "").trim())
        .filter((d) => d !== ""),
    ),
  ];

  /**
   * ADAY SATIŞLAR — iptalliler DIŞARIDA (yükleme yolundaki kuralın aynısı).
   */
  const adaylar = await prisma.sale.findMany({
    where: { code: { in: nolar }, iptalTarihi: null },
    select: { id: true, code: true, channelAccountId: true },
  });

  /**
   * KARAR SAF FONKSİYONDAN — kural `lib/hakedis/yeniden-esle.ts`te.
   * Betik yalnız veriyi taşır; mantığı burada tekrarlasaydı eşleşme
   * sistemde iki yerde yaşardı.
   */
  const kararlar = yenidenEsle(
    bagsizlar
      .filter((k) => (k.orderNo ?? "").trim() !== "")
      .map((k) => ({
        id: k.id,
        siparisNo: (k.orderNo ?? "").trim(),
        channelAccountId: k.channelAccountId,
      })),
    adaylar.map((s) => ({
      id: s.id,
      kod: (s.code ?? "").trim(),
      channelAccountId: s.channelAccountId,
    })),
  );
  const ozet = eslemeOzeti(kararlar);

  const baglanacak = kararlar.filter((k) => k.olur);
  const kalemKanali = new Map(
    bagsizlar.map((k) => [
      k.id,
      `${k.channelAccount.channel.name} — ${k.channelAccount.name}`,
    ]),
  );
  const redler = (sebep: RetSebebi) =>
    kararlar.filter((k) => !k.olur && k.sebep === sebep);

  console.log("");
  console.log("  ── SONUÇ ───────────────────────────────────────────────────");
  console.log(`     BAĞLANACAK                   ${ozet.baglanacak}`);
  console.log(`     karşılığı yok                ${ozet.karsiligiYok}`);
  console.log(`     çift eşleşme (REDDEDİLDİ)    ${ozet.ciftEslesme}`);
  console.log(`     kanal uyuşmuyor (REDDEDİLDİ) ${ozet.kanalUyusmaz}`);
  console.log("");

  if (baglanacak.length > 0) {
    const ornek = baglanacak.slice(0, 5).map((b) => b.kod);
    console.log(`     örnek bağlanacak sipariş: ${ornek.join(" · ")}`);
    console.log("");
  }
  if (ozet.ciftEslesme > 0) {
    console.log("     ⚠ ÇİFT EŞLEŞME — elle karara bırakıldı:");
    for (const k of redler("CIFT_ESLESME").slice(0, 10)) {
      console.log(`        ${k.kod}`);
    }
    console.log("");
  }
  if (ozet.kanalUyusmaz > 0) {
    console.log("     ⚠ KANAL UYUŞMUYOR — kod tutuyor ama hesap başka:");
    for (const k of redler("KANAL_UYUSMUYOR").slice(0, 10)) {
      console.log(`        ${doldur(k.kod, 16)} kalem: ${kalemKanali.get(k.kalemId) ?? "?"}`);
    }
    console.log("");
  }

  /**
   * TEŞHİS — A/B ayrımı burada da yazılır ki betik tek başına da konuşsun.
   */
  if (ozet.baglanacak === 0) {
    console.log("     → TEŞHİS B: bağlanacak kalem YOK.");
    console.log("       Raporun sipariş numaralarının sistemde karşılığı");
    console.log("       yok. Taze rapor da bu hâliyle SIFIR verir; önce");
    console.log("       numara biçimi ya da eksik satış girişi çözülmeli.");
    const yoklar = redler("KARSILIK_YOK").map((k) => k.kod);
    if (yoklar.length > 0) {
      console.log(`       örnek karşılıksız no: ${[...new Set(yoklar)].slice(0, 3).join(" · ")}`);
    }
  } else {
    console.log("     → TEŞHİS A: ZAMANLAMA doğrulandı; bağ kurulabilir.");
  }
  console.log("");

  if (!UYGULA) {
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Rakamlar beklenene uyuyorsa:  npm run canli:hakedis-esle -- --uygula");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  /**
   * YAZMA — koşullu güncelleme. `saleId: null` şartı WHERE'de DE durur:
   * betik çalışırken başka bir yükleme aynı kalemi bağlamış olabilir;
   * o bağı ezmek, kurulmuş doğru bir bağı sessizce değiştirmek olurdu.
   */
  let yazilan = 0;
  for (const b of baglanacak) {
    if (!b.olur) continue;
    const sonuc = await prisma.settlementItem.updateMany({
      where: { id: b.kalemId, saleId: null },
      data: { saleId: b.saleId },
    });
    yazilan += sonuc.count;
  }

  console.log(`  ✓ ${yazilan} kalem bağlandı.`);
  if (yazilan !== ozet.baglanacak) {
    console.log(
      `  (${ozet.baglanacak - yazilan} kalem arada başkası tarafından bağlanmış — dokunulmadı)`,
    );
  }
  console.log("");
  console.log("  Sonraki adım: npm run canli:hakedis-teyit");
  console.log("");

  await prisma.$disconnect();
}

main();
