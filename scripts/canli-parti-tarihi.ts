/**
 * ============================================================================
 *  PARTİ TARİHİ — ONAYLI VAKA LİSTESİ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:parti-tarihi -- --vaka=schafer --tarih=2026-07-05
 *      npm run canli:parti-tarihi -- --vaka=schafer --tarih=2026-07-05 --uygula
 *
 *  ⚠ BU GENEL BİR ARAÇ DEĞİLDİR VE OLMAYACAK — mimar şartı 19.08.2026.
 *  Betik yalnız `ONAYLI_VAKALAR` listesindeki kayıtlara dokunabilir; her
 *  vaka kendi hareket kimliği, kendi parmak izi ve kendi tarih aralığıyla
 *  yazılıdır. **Listeye giriş YALNIZ MİMAR ONAYIYLA.**
 *
 *  ── NİYE TEK BETİK, İKİ VAKA ────────────────────────────────────────────
 *  İlk hâli tek kayda kilitliydi (Schafer). İkinci vaka (LEGO) çıkınca
 *  ikinci bir betik yazmak, kimlik doğrulaması ve aralık kilidi gibi
 *  güvenlik parçalarını KOPYALAMAK demekti — ve kopya, üçüncü vakada
 *  sapar. Liste deseni aynı garantileri tek gövdede tutuyor: kimlik
 *  kilidi vakada, gövde ortak.
 *
 *  ── NİYE İSTİSNA ────────────────────────────────────────────────────────
 *  Satış `11412533563` (Schafer Kitchenhouse Termos) `14.07`'de satıldı,
 *  ama bağlı olduğu FIFO partisi `13.08` tarihli görünüyor: mal kabul
 *  formundaki teslim tarihi alanı BUGÜNE varsayılan geliyor ve geçmiş
 *  veri girilirken değiştirilmemiş. Sonuç: satış, partisinden 30 gün
 *  ÖNCE duruyor — imkânsız bir sıra.
 *
 *  ALTERNATİFLER ÖLÇÜLDÜ VE ELENDİ (istisnanın 2. şartı):
 *    · Ters kayıt (ADJUSTMENT) → adet düzeltir, TARİH düzeltmez.
 *    · Partiyi silip yeniden yazmak → `sourceMovement` ilişkisi
 *      `onDelete: Restrict`; SALE_OUT ona bağlı, veritabanı reddeder.
 *      Zorlansa satışın FIFO bağı kopardı.
 *    · Mal kabul ekranı → teslim tarihi yalnız mal kabul ANINDA var;
 *      alım `RECEIVED` durumunda o alan yeniden düzenlenmiyor.
 *
 *  ── NE DEĞİŞİR, NE DEĞİŞMEZ ─────────────────────────────────────────────
 *  Değişen tek alan `occurredAt`. **Miktar, maliyet, para birimi, bağlar
 *  ve NET rakamları AYNI KALIR** — bu yüzden kâr tazelemesi de yapılmaz.
 *  Düzelen şey stok yaşı ve dönüş günü ölçümüdür.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

type Vaka = {
  ad: string;
  hareketId: string;
  /** Kimlik doğrulaması — kimliğe güvenip yazmak yetmez. */
  sku: string;
  birimMaliyet: number;
  quantityDelta: number;
  mevcutTarih: string;
  satisKodu: string;
  /** Teslim, siparişten sonra ve satıştan önce olmak ZORUNDA. */
  enErken: string;
  enGec: string;
  sebep: string;
};

/**
 * ⚠ ONAYLI VAKALAR — her satır mimar onayıyla girer.
 * Kimlikler ve beklenen değerler CANLIDAN ÖLÇÜLEREK yazıldı.
 */
const ONAYLI_VAKALAR: Record<string, Vaka> = {
  schafer: {
    ad: "Schafer Kitchenhouse Mimoza 1,5 L Cam Termos",
    hareketId: "cmsrqsxni000004jsm1wa3xlc",
    sku: "axcali1643",
    birimMaliyet: 504,
    quantityDelta: 2,
    mevcutTarih: "2026-08-13",
    satisKodu: "11412533563",
    enErken: "2026-06-26",
    enGec: "2026-07-14",
    sebep:
      "Mal kabul teslim tarihi bugüne varsayılan geldi ve geçmiş veri " +
      "girilirken değiştirilmedi; satış partisinden 30 gün önce görünüyordu.",
  },
  /**
   * ⚠ LEGO — kimlik 20.08.2026'da ÖLÇÜLDÜ ve vaka açıldı.
   * `enErken`/`enGec` sipariş (20.07) ve satış (18.08) tarihlerinden.
   * Amazon sipariş no `406-1398290-0161102` — gerçek teslim tarihi
   * oradan okunabilir.
   */
  lego: {
    ad: "LEGO City Kutup Keşif Gemisi 60368",
    hareketId: "cmszq1gzg000304lbugat9jem",
    sku: "axcali1675",
    birimMaliyet: 8499,
    quantityDelta: 1,
    mevcutTarih: "2026-08-19",
    satisKodu: "11518039572",
    enErken: "2026-07-20",
    enGec: "2026-08-18",
    sebep:
      "Mal kabul teslim tarihi bugüne varsayılan geldi; parti satıştan " +
      "BİR GÜN SONRA görünüyordu (alım 20.07'de sipariş edilmiş).",
  },
};

const UYGULA = process.argv.includes("--uygula");

/**
 * ⚠ TARİHİN KAYNAĞI BEYAN EDİLİR — kural 20.08.2026.
 *
 * Mimar "o aralıkta bir tarih yaz, farketmez" dedi. Farkeder: uydurulmuş
 * bir tarih, ledger'da ÖLÇÜLMÜŞ gibi görünür. `13.08` yanlıştır ama izi
 * bellidir (form varsayılanı); `29.06` yazıldığında altı ay sonra bakan
 * biri onu gerçek teslim tarihi sanar.
 *
 * Çözüm reddetmek değil, DAMGALAMAK: yazılan tarihin nereden geldiği
 * `AuditLog`a girer.
 *   OLCULDU   — belge/sipariş geçmişinden okundu (tercih edilen)
 *   TURETILDI — ölçülen dağılımdan çıkarıldı (sipariş + ortanca gün)
 */
const KAYNAKLAR = ["OLCULDU", "TURETILDI"] as const;
type Kaynak = (typeof KAYNAKLAR)[number];
const kaynakArg = process.argv.find((a) => a.startsWith("--kaynak="));
const tarihArg = process.argv.find((a) => a.startsWith("--tarih="));
const vakaArg = process.argv.find((a) => a.startsWith("--vaka="));

function g(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

async function main() {
  console.log("");
  console.log("PARTİ TARİHİ — onaylı vaka listesi");

  const vakaAdi = vakaArg?.slice("--vaka=".length) ?? "";
  const BEKLENEN = ONAYLI_VAKALAR[vakaAdi];
  if (!BEKLENEN) {
    console.log("");
    console.log("  ⛔ VAKA SEÇİLMEDİ ya da LİSTEDE YOK: " + (vakaAdi || "(boş)"));
    console.log("     Onaylı vakalar: " + Object.keys(ONAYLI_VAKALAR).join(" · "));
    console.log("     Listeye giriş YALNIZ mimar onayıyla olur.");
    console.log("");
    process.exitCode = 1;
    return;
  }
  const HEDEF_HAREKET_ID = BEKLENEN.hareketId;

  /**
   * ⚠ KİMLİĞİ HENÜZ ÖLÇÜLMEMİŞ VAKA YAZAMAZ. Liste bir vakayı taşıyor
   * olabilir ama hareket kimliği boşsa o vaka HAZIR DEĞİLDİR; boş kimlikle
   * devam etmek rastgele bir kayda yazma riskidir.
   */
  if (HEDEF_HAREKET_ID === "") {
    console.log("");
    console.log("  ⛔ VAKA HAZIR DEĞİL: " + BEKLENEN.ad);
    console.log("     Hareket kimliği henüz ölçülmedi — önce teşhis koşulur.");
    console.log("");
    process.exitCode = 1;
    return;
  }

  console.log("  vaka           " + vakaAdi + " — " + BEKLENEN.ad);
  console.log("  hedef hareket  " + HEDEF_HAREKET_ID);

  if (!tarihArg) {
    console.log("");
    console.log("  ⛔ TARİH VERİLMEDİ.");
    console.log("     Gerçek teslim tarihi Halil'den gelir; betik UYDURMAZ.");
    console.log("     Kullanım:  npm run canli:parti-tarihi -- --vaka=" + vakaAdi + " --tarih=2026-07-05");
    console.log("");
    process.exitCode = 1;
    return;
  }

  const kaynak = kaynakArg?.slice("--kaynak=".length) as Kaynak | undefined;
  if (!kaynak || !KAYNAKLAR.includes(kaynak)) {
    console.log("");
    console.log("  ⛔ TARİHİN KAYNAĞI BEYAN EDİLMEDİ.");
    console.log("     --kaynak=OLCULDU    belge/sipariş geçmişinden okundu");
    console.log("     --kaynak=TURETILDI  ölçülen dağılımdan çıkarıldı");
    console.log("");
    console.log("     Kaynaksız tarih, ledger'da ÖLÇÜLMÜŞ gibi görünür.");
    console.log("");
    process.exitCode = 1;
    return;
  }

  const metin = tarihArg.slice("--tarih=".length);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metin)) {
    console.log("  ⛔ TARİH BİÇİMİ HATALI: " + metin + " (beklenen YYYY-AA-GG)");
    process.exitCode = 1;
    return;
  }

  /**
   * ⚠ SAAT 00:00 UTC — mevcut parti kayıtları da böyle duruyor
   * (`2026-08-13 00:00`). İş saat dilimine göre kaydırmak, aynı alanda
   * iki farklı saat kuralı doğururdu.
   */
  const yeniTarih = new Date(metin + "T00:00:00.000Z");
  if (Number.isNaN(yeniTarih.getTime())) {
    console.log("  ⛔ GEÇERSİZ TARİH: " + metin);
    process.exitCode = 1;
    return;
  }

  /**
   * ⚠ AKIL SINIRI — düzeltme yeni bir imkânsızlık üretmesin.
   * Teslim, siparişten önce olamaz; satıştan sonra da olamaz (düzeltmek
   * istediğimiz hata tam olarak buydu).
   */
  if (metin < BEKLENEN.enErken || metin > BEKLENEN.enGec) {
    console.log("");
    console.log("  ⛔ TARİH ARALIK DIŞI: " + metin);
    console.log("     Sipariş " + BEKLENEN.enErken + ", satış " + BEKLENEN.enGec + ".");
    console.log("     Teslim ikisinin ARASINDA olmalı — yoksa aynı hatayı");
    console.log("     başka yönde tekrar üretiriz.");
    console.log("");
    process.exitCode = 1;
    return;
  }

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("  veritabanı     " + y.veri.adres.hostname);
  console.log("  kip            " + (UYGULA ? "UYGULA — yazılacak" : "RAPOR — yazılmaz"));
  console.log("");

  const h = await prisma.stockMovement.findUnique({
    where: { id: HEDEF_HAREKET_ID },
    select: {
      id: true,
      type: true,
      quantityDelta: true,
      occurredAt: true,
      unitCostAmount: true,
      variant: { select: { sku: true, product: { select: { name: true } } } },
      tuketimler: {
        select: {
          quantityDelta: true,
          occurredAt: true,
          saleItem: { select: { sale: { select: { code: true, soldAt: true } } } },
        },
      },
    },
  });

  if (!h) {
    console.log("  ⛔ HAREKET BULUNAMADI — kilitli kimlik canlıda yok.");
    process.exitCode = 1;
    return;
  }

  /**
   * ⚠ KİMLİK DOĞRULAMASI — kimliğe güvenip yazmak yetmez. Bir kimlik
   * yanlış kopyalanmış olabilir; yazmadan önce kaydın BEKLENEN kayıt
   * olduğu değerlerinden teyit edilir.
   */
  const teyitler: [string, boolean, string][] = [
    ["SKU", h.variant.sku === BEKLENEN.sku, h.variant.sku],
    ["tip", h.type === "PURCHASE_IN", h.type],
    ["adet", h.quantityDelta === BEKLENEN.quantityDelta, String(h.quantityDelta)],
    [
      "birim maliyet",
      Number(h.unitCostAmount?.toString() ?? "0") === BEKLENEN.birimMaliyet,
      h.unitCostAmount?.toString() ?? "—",
    ],
    ["mevcut tarih", g(h.occurredAt) === BEKLENEN.mevcutTarih, g(h.occurredAt)],
  ];

  console.log("  KİMLİK DOĞRULAMASI");
  let tamam = true;
  for (const [ad, sonuc, gorulen] of teyitler) {
    console.log("   " + (sonuc ? "✓" : "✗") + " " + ad.padEnd(16) + gorulen);
    if (!sonuc) tamam = false;
  }
  console.log("");

  if (!tamam) {
    console.log("  ⛔ KAYIT BEKLENENE UYMUYOR — yazılmadı.");
    console.log("     Kilit yanlış kayda bakıyor ya da veri değişmiş.");
    console.log("");
    process.exitCode = 1;
    return;
  }

  console.log("  ÜRÜN           " + h.variant.product.name);
  console.log("  TARİH          " + g(h.occurredAt) + "  →  " + metin +
    "   [kaynak: " + kaynak + "]");
  if (kaynak === "TURETILDI") {
    console.log("  ⚠ TÜRETİLMİŞ TARİH — ölçülmüş değil. Amazon alımlarında");
    console.log("    sipariş→teslim ortancası 3 gün (n=22, 20'si 0–8 gün).");
    console.log("    Gerçek tarih sipariş geçmişinden okunabilirse OLCULDU kullan.");
  }
  console.log("  bu partiden çıkanlar:");
  for (const t of h.tuketimler) {
    console.log(
      "    " + g(t.occurredAt) + "  delta " + t.quantityDelta +
      "  satış " + (t.saleItem?.sale.code ?? "—"),
    );
  }
  console.log("");
  console.log("  ⚠ DEĞİŞMEYENLER: miktar · maliyet · para birimi · bağlar · NET");
  console.log("    Kâr tazelemesi YAPILMAZ — kâra giren hiçbir şey değişmiyor.");
  console.log("");

  if (!UYGULA) {
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Tarih doğruysa:");
    console.log("      npm run canli:parti-tarihi -- --vaka=" + vakaAdi +
      " --tarih=" + metin + " --kaynak=" + kaynak + " --uygula");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  const eski = h.occurredAt;
  await prisma.stockMovement.update({
    where: { id: HEDEF_HAREKET_ID },
    data: { occurredAt: yeniTarih },
  });

  /**
   * ⚠ İZ ŞART — istisnanın 3. maddesi. ESKİ VE YENİ DEĞER BİRLİKTE:
   * yalnız yeniyi yazmak, düzeltmenin neyi düzelttiğini kaybettirirdi
   * ve altı ay sonra "bu tarih hep böyle miydi" sorusu cevapsız kalırdı.
   */
  await prisma.auditLog.create({
    data: {
      action: "LEDGER_TARIH_DUZELTME",
      targetType: "StockMovement",
      targetId: HEDEF_HAREKET_ID,
      detail: JSON.stringify({
        alan: "occurredAt",
        eski: eski.toISOString(),
        yeni: yeniTarih.toISOString(),
        vaka: vakaAdi,
        /** ⚠ TARİHİN KAYNAĞI — türetilmiş tarih ölçülmüş sayılmasın. */
        tarihKaynagi: kaynak,
        ...(kaynak === "TURETILDI"
          ? {
              turetmeYontemi:
                "Amazon alımlarında sipariş→teslim ortancası 3 gün " +
                "(n=22, 20/22 aralık 0–8 gün; ölçüm 20.08.2026).",
            }
          : {}),
        sebep: BEKLENEN.sebep + " (satış " + BEKLENEN.satisKodu + ")",
        onay: "mimar, 19.08.2026 — metadata istisnası (miktar/para değişmedi)",
        kaynak: "canli:parti-tarihi",
      }),
    },
  });

  const sonra = await prisma.stockMovement.findUnique({
    where: { id: HEDEF_HAREKET_ID },
    select: { occurredAt: true },
  });
  console.log("  ✓ YAZILDI: " + g(eski) + " → " + g(sonra?.occurredAt));
  console.log("  ✓ AuditLog: LEDGER_TARIH_DUZELTME (eski→yeni birlikte)");
  console.log("");
  console.log("  Sırada: npm run canli:bekleme-olcum — ters tarihli düşüm 0 olmalı.");
  console.log("");

  await prisma.$disconnect();
}

main();
