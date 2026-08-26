import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";
import { UCLAR, apiGet, baslikKur, kimlikOku, tumSayfalar } from "./ty/istemci";

/**
 * ============================================================================
 *  A3-③ KURU KOŞUM RAPORU — SALT OKUMA, HİÇBİR YERE YAZMAZ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:ty-kuru-kosum -- --gun=60
 *
 *  ⚠ BU BİR ONAY KAPISIDIR, BİR İŞLEM DEĞİL. Kullanıcının kendi kuralı:
 *  _"İçe aktarma (A3-③) başlamadan önce kuru koşum raporu + onayım."_
 *  Bu dosyada tek bir yazma çağrısı YOKTUR ve `api:dogrula` bunu koşulur
 *  hâlde tutuyor.
 *
 *  ⚠ RAPOR YEDİ BÖLÜMDÜR ve sırası önemlidir: ALT SINIR BEYANI en başta,
 *  çünkü listeyi okuyan ilk cümlede listenin ne OLMADIĞINI bilmeli.
 * ============================================================================
 */

const gunArg = process.argv.find((a) => a.startsWith("--gun="));
const GUN = Math.min(Number(gunArg?.split("=")[1] ?? 60) || 60, 90);
const DILIM_GUN = 3;
const GUN_MS = 86_400_000;

const kurus = (n: number) => Math.round(n * 100) / 100;
const gun = (d: Date | number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));

type Kaynak = "enumerasyon" | "hakediş çaprazı";

type Aday = {
  siparisNo: string;
  /**
   * ⚠ KAYNAK HER SATIRDA VE KALICI İZ OLARAK YAZILACAK. Üç ay sonra
   * _"bu satış nereden geldi"_ sorusunun cevabı kayıtta duracak; raporda
   * durup kayıtta durmazsa cevap kaybolur.
   */
  kaynak: Kaynak;
  orderDate: number;
  tutar: number;
  adet: number;
  paketSayisi: number;
  durum: string;
  kargoNo: string | null;
  barkodlar: string[];
};

async function main() {
  const k = kimlikOku();
  if (!k) {
    console.log("\n⛔ ANAHTAR OKUNAMADI (.env.canli)\n");
    process.exitCode = 1;
    return;
  }
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });
  const baslik = baslikKur(k);
  const son = Date.now();
  const bas = son - GUN * GUN_MS;
  const okumaAni = new Date();

  const hesap = await prisma.channelAccount.findFirst({
    where: { externalId: k.saticiId },
    select: { id: true, name: true, channel: { select: { name: true } } },
  });
  if (!hesap) {
    console.log(`\n⛔ \`externalId = ${k.saticiId}\` olan kanal hesabı YOK.\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  // ═══ ENUMERASYON ═══════════════════════════════════════════════════════
  const paketler = new Map<number, Record<string, unknown>>();
  let dilimIstek = 0;
  let dilimHata = 0;
  for (let i = 0; i * DILIM_GUN < GUN + 30; i++) {
    const dSon = son - i * DILIM_GUN * GUN_MS;
    const dBas = dSon - DILIM_GUN * GUN_MS;
    const d = await tumSayfalar(
      (s) => UCLAR.siparisler(k.saticiId, dBas, dSon, s),
      baslik,
    );
    dilimIstek++;
    if (d.tur === "HATA") {
      dilimHata++;
      continue;
    }
    for (const p of d.kayitlar as Record<string, unknown>[]) {
      paketler.set(Number(p.shipmentPackageId), p);
    }
  }

  /** ⚠ EBEVEYN ELENİR — araç kusuru dersi burada TEKRARLANMAZ. */
  const ebeveynler = new Set<number>();
  for (const p of paketler.values()) {
    const kok = p.originPackageIds;
    if (Array.isArray(kok)) for (const id of kok) ebeveynler.add(Number(id));
  }

  const apiSiparis = new Map<string, Aday>();
  for (const p of paketler.values()) {
    if (ebeveynler.has(Number(p.shipmentPackageId))) continue;
    const tarih = Number(p.orderDate);
    if (tarih < bas || tarih > son) continue;
    const no = String(p.orderNumber);
    const lines = (p.lines ?? []) as { quantity: number; barcode: string }[];
    const adet = lines.reduce((t, l) => t + (l.quantity ?? 0), 0);
    const tutar = kurus(Number(p.grossAmount ?? 0) - Number(p.totalDiscount ?? 0));
    const mevcut = apiSiparis.get(no);
    if (mevcut) {
      mevcut.paketSayisi++;
      mevcut.tutar = kurus(mevcut.tutar + tutar);
      mevcut.adet += adet;
      mevcut.barkodlar.push(...lines.map((l) => String(l.barcode)));
    } else {
      apiSiparis.set(no, {
        siparisNo: no,
        kaynak: "enumerasyon",
        orderDate: tarih,
        tutar,
        adet,
        paketSayisi: 1,
        durum: String(p.status),
        kargoNo: p.cargoTrackingNumber ? String(p.cargoTrackingNumber) : null,
        barkodlar: lines.map((l) => String(l.barcode)),
      });
    }
  }

  // ═══ HAKEDİŞ ÇAPRAZI — enumerasyonun bulamadıkları ═════════════════════
  const hakedis = await prisma.settlementItem.findMany({
    select: { orderNo: true },
    where: { orderNo: { not: null }, channelAccountId: hesap.id },
  });
  const hakedisNolar = [...new Set(hakedis.map((h) => h.orderNo!))];
  const enumBulunan = new Set([...paketler.values()].map((p) => String(p.orderNumber)));
  const caprazAdaylari = hakedisNolar.filter((n) => !enumBulunan.has(n));

  /**
   * ⚠ TELAFİ MEKANİZMASI: enumerasyonun düşürdüğü kayıt `orderNumber` ile
   * TEK TEK çekilebiliyor (8/8 ölçüldü). Çaprazdan gelen her numara böyle
   * doğrulanıyor — "hakediş öyle diyor" tek başına yeterli değil.
   */
  let caprazCekilen = 0;
  let caprazCekilemeyen = 0;
  for (const no of caprazAdaylari) {
    const s = await apiGet(
      `/integration/order/sellers/${k.saticiId}/orders?orderNumber=${no}&page=0&size=50`,
      baslik,
    );
    if (s.tur !== "VERI") {
      caprazCekilemeyen++;
      continue;
    }
    const g = s.govde as { content?: Record<string, unknown>[] };
    const kayitlar = g.content ?? [];
    if (kayitlar.length === 0) {
      caprazCekilemeyen++;
      continue;
    }
    const yerel = new Set<number>();
    for (const p of kayitlar) {
      const kok = p.originPackageIds;
      if (Array.isArray(kok)) for (const id of kok) yerel.add(Number(id));
    }
    let adet = 0;
    let tutar = 0;
    let paket = 0;
    const barkodlar: string[] = [];
    let tarih = 0;
    let durum = "";
    let kargoNo: string | null = null;
    for (const p of kayitlar) {
      if (yerel.has(Number(p.shipmentPackageId))) continue;
      paket++;
      const lines = (p.lines ?? []) as { quantity: number; barcode: string }[];
      adet += lines.reduce((t, l) => t + (l.quantity ?? 0), 0);
      tutar = kurus(tutar + Number(p.grossAmount ?? 0) - Number(p.totalDiscount ?? 0));
      barkodlar.push(...lines.map((l) => String(l.barcode)));
      tarih = Number(p.orderDate);
      durum = String(p.status);
      if (p.cargoTrackingNumber) kargoNo = String(p.cargoTrackingNumber);
    }
    if (paket === 0) {
      caprazCekilemeyen++;
      continue;
    }
    caprazCekilen++;
    /** ⚠ Pencere dışıysa listeye girmez ama SAYILIR. */
    if (tarih < bas || tarih > son) continue;
    if (!apiSiparis.has(no)) {
      apiSiparis.set(no, {
        siparisNo: no,
        kaynak: "hakediş çaprazı",
        orderDate: tarih,
        tutar,
        adet,
        paketSayisi: paket,
        durum,
        kargoNo,
        barkodlar,
      });
    }
  }

  // ═══ DEFTER ════════════════════════════════════════════════════════════
  const mevcutSatislar = await prisma.sale.findMany({
    where: { channelAccountId: hesap.id, code: { not: null } },
    select: { code: true },
  });
  const defterKodlari = new Set(mevcutSatislar.map((s) => s.code!));

  const adaylar = [...apiSiparis.values()].filter(
    (a) => !defterKodlari.has(a.siparisNo),
  );

  // ═══ VARYANT KAPSAMI — EN SERT KAPI ════════════════════════════════════
  /**
   * ⚠ `SaleItem.variantId` ZORUNLU (`String`, nullable DEĞİL). Barkodu
   * kataloğumuzda olmayan bir siparişin kalemi YAZILAMAZ — bu bir tercih
   * değil şemanın kendisi. Bu yüzden liste ikiye ayrılıyor ve "yazılabilir"
   * sayısı, listenin uzunluğundan KÜÇÜK.
   */
  const tumBarkodlar = [...new Set(adaylar.flatMap((a) => a.barkodlar))];
  const varyantlar = await prisma.productVariant.findMany({
    where: { barcode: { in: tumBarkodlar } },
    select: { barcode: true },
  });
  const bilinenBarkod = new Set(varyantlar.map((v) => v.barcode!).filter(Boolean));

  const yazilabilir = adaylar.filter((a) =>
    a.barkodlar.every((b) => bilinenBarkod.has(b)),
  );
  const kismenBilinen = adaylar.filter(
    (a) =>
      a.barkodlar.some((b) => bilinenBarkod.has(b)) &&
      !a.barkodlar.every((b) => bilinenBarkod.has(b)),
  );
  const hicBilinmeyen = adaylar.filter(
    (a) => !a.barkodlar.some((b) => bilinenBarkod.has(b)),
  );

  // ═══════════════════════════════════════════════════════════════════════
  const ciz = "=".repeat(78);
  console.log("\n" + ciz);
  console.log("A3-③ KURU KOŞUM RAPORU — SALT OKUMA · HİÇBİR ŞEY YAZILMADI");
  console.log(ciz);

  // ── 2) ALT SINIR BEYANI — EN BAŞTA ──────────────────────────────────────
  console.log("\n② ALT SINIR BEYANI  (listeyi okumadan ÖNCE)");
  console.log("   ⛔ BU LİSTE TAM DEĞİLDİR VE TAM OLDUĞU İDDİA EDİLMİYOR.");
  console.log("   · Trendyol'un tarih penceresi enumerasyonu SESSİZCE kayıt düşürüyor.");
  console.log("     Ölçüldü: aynı sorgu iki koşumda 497 ↔ 560 farklı sipariş verdi —");
  console.log("     enumerasyon KARARLI BİLE DEĞİL.");
  console.log("   · Tek 90 günlük pencere 114 kayıt döndürüyor; 7 günlük dilimlerin");
  console.log("     birleşimi 804. Aynı uç, aynı aralık, YEDİ KAT fark.");
  console.log("   · Kaçan kayıtlarda ayırt edici bir alan ARANDI, BULUNAMADI; sıralama");
  console.log("     ve sayfalama ELENDİ (dört sıralama da aynı kümeyi verdi).");
  console.log("   ⚠ TELAFİ: sipariş numarası BAŞKA bir kaynaktan biliniyorsa tek tek");
  console.log("     çekilebiliyor (ölçüldü 8/8) — bu listede o yolla gelenler AYRI");
  console.log("     işaretli.");
  console.log("   ⛔ AMA HİÇBİR KAYNAKTA ADI GEÇMEYEN SİPARİŞ YİNE GÖRÜNMEZ.");

  console.log("\n   KAPSAM: " + `${hesap.channel.name} — ${hesap.name} (externalId ${k.saticiId})`);
  console.log(`   dönem  : ${gun(bas)} → ${gun(son)}  (${GUN} gün, \`orderDate\`e göre)`);
  console.log(`   tarama : ${DILIM_GUN} günlük ${dilimIstek} dilim${dilimHata > 0 ? ` · ⛔ ${dilimHata} dilim HATA` : ""}`);
  console.log(`   okuma  : ${okumaAni.toISOString()}  (API donmuş fotoğraf, defter akıyor)`);

  // ── 6) HACİM + SINIF ────────────────────────────────────────────────────
  console.log("\n⑥ HACİM + SINIF");
  const toplamTutar = adaylar.reduce((t, a) => t + a.tutar, 0);
  console.log(`   aday sipariş           ${String(adaylar.length).padStart(5)}`);
  console.log(`   toplam adet            ${String(adaylar.reduce((t, a) => t + a.adet, 0)).padStart(5)}`);
  console.log(`   toplam tutar           ${toplamTutar.toFixed(2).padStart(14)} TRY`);
  console.log(`   ── kaynağa göre:`);
  console.log(`      enumerasyon         ${String(adaylar.filter((a) => a.kaynak === "enumerasyon").length).padStart(5)}`);
  console.log(`      hakediş çaprazı     ${String(adaylar.filter((a) => a.kaynak === "hakediş çaprazı").length).padStart(5)}`);
  console.log(`   ── çapraz adayları: ${caprazAdaylari.length} · tek tek ÇEKİLEBİLEN ${caprazCekilen} · ÇEKİLEMEYEN ${caprazCekilemeyen}`);
  /**
   * ⚠ ÇAPRAZ SIFIR ÇIKARSA BU "BOŞLUK YOK" DEMEK DEĞİLDİR — ve bu uyarı
   * ölçülmüş bir vakadan geliyor: aynı çapraz bir önceki koşumda **37**
   * verdi, bu koşumda **0**. Enumerasyon o turda şanslıydı, o kadar.
   * Sıfırı "tamlık kanıtı" diye okumak, en sinsi yalancı yeşil olurdu.
   */
  if (caprazAdaylari.length === 0) {
    console.log(`      ⚠ ÇAPRAZ SIFIR — AMA BU TAMLIK KANITI DEĞİL.`);
    console.log(`        Aynı çapraz önceki koşumda 37 verdi. Enumerasyon bu turda`);
    console.log(`        o kayıtları yakaladı; bir sonraki turda yine kaçırabilir.`);
    console.log(`        Sıfır burada "boşluk yok" değil, "bu turda görünmedi" demektir.`);
  }
  const bolunmus = adaylar.filter((a) => a.paketSayisi > 1);
  console.log(`   ── bölünmüş sipariş     ${String(bolunmus.length).padStart(5)}  (ebeveyn paketler ELENDİ: ${ebeveynler.size})`);

  const aylar = new Map<string, number>();
  for (const a of adaylar) {
    const ay = gun(a.orderDate).slice(0, 7);
    aylar.set(ay, (aylar.get(ay) ?? 0) + 1);
  }
  console.log(`   ── tarih dağılımı:`);
  for (const [ay, n] of [...aylar].sort()) {
    console.log(`      ${ay}  ${"█".repeat(Math.min(n, 46))} ${n}`);
  }

  // ── 3) ALAN EŞLEME ÖNİZLEMESİ ───────────────────────────────────────────
  console.log("\n③ ALAN EŞLEME ÖNİZLEMESİ  (API alanı → kolon)");
  console.log("   orderNumber              → Sale.code");
  console.log("   orderDate                → Sale.soldAt        (İstanbul takvim günü)");
  console.log("   cargoTrackingNumber      → Sale.shipmentCode");
  console.log("   paket sayısı (türetme)   → Sale.paketSayisi   ⚠ TÜRETME: ebeveyn paket");
  console.log("                                                    elenir, çocuklar sayılır");
  console.log("   (sabit)                  → Sale.channelAccountId");
  console.log("                                                    ⚠ TÜRETME: anahtarın");
  console.log("                                                    satıcı kimliği ile eşleşen");
  console.log("                                                    hesap — ADLA DEĞİL");
  console.log("   lines[].quantity         → SaleItem.quantity");
  console.log("   lines[].price            → SaleItem.unitPriceAmount");
  console.log("   lines[].currencyCode     → SaleItem.unitPriceCurrency");
  console.log("   lines[].vatRate          → SaleItem.vatRate");
  console.log("   lines[].commission       → SaleItem.commissionRate");
  console.log("   lines[].barcode          → SaleItem.variantId  ⚠ EŞLEŞTİRME, kopyalama");
  console.log("                                                     DEĞİL — barkod→varyant");
  console.log("");
  console.log("   BOŞ KALACAK ALANLAR — ve boş kalacakları AÇIKÇA yazılıyor:");
  console.log("     Sale.cargoCarrierId · cargoDesi · cargoAmount   API taşımıyor");
  console.log("     Sale.note                                       içe aktarma not yazmaz");
  console.log("     Sale.profitCurrency · profitStatus · calculatedAt");
  console.log("                                                     ⚠ KÂR HESABI AYRI ADIM");
  console.log("     StockMovement                                   ⛔ ÜRETİLMEZ — bkz. ⑦");
  console.log("     SaleItem.commissionTarifeId                     yazıcısı yok (K52)");

  // ── 4) İPTALLERİN MUAMELESİ ─────────────────────────────────────────────
  console.log("\n④ İPTALLERİN MUAMELESİ");
  const durumlar = new Map<string, number>();
  for (const a of adaylar) durumlar.set(a.durum, (durumlar.get(a.durum) ?? 0) + 1);
  for (const [d, n] of [...durumlar].sort((x, y) => y[1] - x[1])) {
    console.log(`   ${d.padEnd(24)} ${String(n).padStart(4)}`);
  }
  const iptalliler = adaylar.filter((a) => a.durum === "Cancelled");
  console.log(`\n   ⚠ ÖNERİ: \`Cancelled\` olanlar LİSTEYE GİRER ama \`iptalTarihi\` DOLU`);
  console.log(`     yazılır (${iptalliler.length} sipariş · ${iptalliler.reduce((t, a) => t + a.tutar, 0).toFixed(2)} TRY).`);
  console.log(`     Gerekçe: defterin iptal modeli kaydı SİLMEZ, işaretler — ciroya ve`);
  console.log(`     NET'e girmez, stok DOĞRU döner, iz kalır. Hiç yazmasaydık o sipariş`);
  console.log(`     "hiç olmadı" olurdu ve kargo gideri sahipsiz kalırdı.`);

  // ── 5) İDEMPOTENTLİK ────────────────────────────────────────────────────
  console.log("\n⑤ İDEMPOTENTLİK PLANI  (ikinci koşum 0 yazmalı)");
  console.log("   KİMLİK ANAHTARI: `Sale.code` — şemada zaten `@unique` (GLOBAL).");
  console.log("     ⚠ Kanal+kod BİLEŞİK anahtar GEREKMİYOR: kod tek başına tekil.");
  console.log("   ÇAKIŞMA KURALI: defterde o kod VARSA → ATLANIR, ÜZERİNE YAZILMAZ.");
  console.log("     ⚠ Elle girilmiş kayıt üstün: Halil'in girdiği tutar (ör. kupon");
  console.log("       düşülmüş faturalanacak tutar) API'nin brütünden DAHA DOĞRU");
  console.log("       olabilir. Alan farkları (c) kovasında zaten raporlanıyor (21 vaka)");
  console.log("       ve içe aktarma onları EZMEZ.");
  console.log(`   ÖLÇÜLDÜ: defterde bu hesapta ${defterKodlari.size} kod var;`);
  console.log(`     ${apiSiparis.size - adaylar.length} aday çakıştığı için listeden düştü.`);

  // ── 7) GERİ ALMA YOLU ───────────────────────────────────────────────────
  console.log("\n⑦ GERİ ALMA YOLU");
  console.log("   ⛔ ŞEMA EKSİĞİ — VE BU RAPORUN AÇTIĞI TEK ŞEMA KALEMİ:");
  console.log("     `Sale`de koşum kimliği taşıyacak alan YOK. Geri alma şart");
  console.log("     koşulduğuna göre bu alan yazımdan ÖNCE açılmalı:");
  console.log("       Sale.importBatch String?   @@index([importBatch])");
  console.log("       Sale.importKaynak String?  ← 'enumerasyon' | 'hakediş çaprazı'");
  console.log("     ⚠ İKİNCİSİ ①'in ŞARTI: kaynak RAPORDA değil KAYITTA durmalı;");
  console.log("       üç ay sonra 'bu satış nereden geldi' sorusu kayıttan cevaplanır.");
  console.log("   GERİ ALMA: silme DEĞİL — parti `iptalTarihi` ile işaretlenir.");
  console.log("     İz kalır, stok doğru döner, ciro/NET'e girmez.");
  console.log("   ⛔ STOK HAREKETİ ÜRETİLMEZ: içe aktarılan satış `SALE_OUT` yazsaydı");
  console.log("     FIFO'dan mal düşer ve geri alınması ledger'a ters kayıt gerektirirdi.");
  console.log("     Stok bağı AYRI ve SONRAKİ bir karardır.");

  // ── 1) LİSTE ────────────────────────────────────────────────────────────
  console.log("\n① LİSTE  —  kaynak sütunu HER SATIRDA");
  console.log(`\n   ⛔ VARYANT KAPISI — EN SERT SINIR:`);
  console.log(`     \`SaleItem.variantId\` ZORUNLU. Barkodu kataloğumuzda olmayan bir`);
  console.log(`     siparişin kalemi YAZILAMAZ — bu bir tercih değil, şemanın kendisi.`);
  console.log(`       tüm barkodları BİLİNEN (yazılabilir)  ${String(yazilabilir.length).padStart(5)}`);
  console.log(`       KISMEN bilinen                        ${String(kismenBilinen.length).padStart(5)}  ⛔ yazılamaz`);
  console.log(`       hiçbiri bilinmeyen                    ${String(hicBilinmeyen.length).padStart(5)}  ⛔ yazılamaz`);
  console.log(`     ⚠ Yani liste ${adaylar.length} satır ama YAZILABİLİR ${yazilabilir.length}.`);
  console.log(`       Kalan ${adaylar.length - yazilabilir.length} sipariş için önce ÜRÜN tanımlanmalı.`);

  console.log("\n   sipariş no      tarih        tutar       adet pkt  durum        kaynak");
  for (const a of yazilabilir.slice(0, 60)) {
    console.log(
      `   ${a.siparisNo.padEnd(15)} ${gun(a.orderDate)}  ${a.tutar.toFixed(2).padStart(10)} ${String(a.adet).padStart(4)} ${String(a.paketSayisi).padStart(3)}  ${a.durum.padEnd(12)} ${a.kaynak}`,
    );
  }
  if (yazilabilir.length > 60) {
    console.log(`   … ve ${yazilabilir.length - 60} yazılabilir sipariş daha`);
  }

  console.log("\n" + ciz);
  console.log("  SALT OKUMA — veritabanına hiçbir şey yazılmadı.");
  console.log("  ⛔ ONAY KAPISI: bu rapor okunmadan ve onaylanmadan HİÇBİR YAZIM YAPILMAZ.");
  console.log("  ⚠ Onay verilirse yazım günü kural aynı: önce/sonra sayım · AuditLog ·");
  console.log("    ikinci koşum 0 yazmalı.");
  console.log(ciz + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("KURU KOŞUM DÜŞTÜ:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
