/** BETIK SINIFI: SUREKLI. Kanala YAZMAZ (GET); deftere yalniz --yaz ile yazar. */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { kodKosuluToplu } from "../src/lib/varyant-arama-kurali";
import { kilitDurumu } from "./bekci-kilit";
import { canliYapilandirma } from "./canli-ortak";
import {
  UCLAR,
  baslikKur,
  kimlikOku,
  tumKayitlar,
  type Kimlik,
} from "./hb/istemci";

/**
 * ============================================================================
 *  K165 — HEPSİBURADA SİPARİŞ İÇE AKTARMA → `Sale` / `SaleItem`
 * ----------------------------------------------------------------------------
 *      npm run canli:hb-ice-aktar              ← ÖNİZLEME (yazmaz)
 *      npm run canli:hb-ice-aktar -- --yaz     ← YAZAR
 *
 *  TY importer (A3-③) disiplininin kopyası: iptal yazılmaz-uydurulmaz ·
 *  çakışmada ATLA · StockMovement ÜRETİLMEZ (onay kuyruğu düşürür, K164) ·
 *  importBatch + importKaynak · önce/sonra sayım · AuditLog · ikinci koşum 0.
 *
 *  ═══ ALAN EŞLEMESİ — ÖLÇÜLDÜ (04.09.2026, SIT, 2 test siparişi) ═════════
 *  HB sipariş ucu KALEM düzeyinde döner (TY paket düzeyindeydi); kalemler
 *  `orderNumber` ile gruplanır. Ayırt edici kanıtlar:
 *
 *    unitPrice   {amount:100}  ← 2 ADETLİ siparişte totalPrice 200 oldu,
 *    totalPrice  {amount:200}    unitPrice 100 KALDI → unitPrice KESİN
 *                                BİRİM. TY'deki "iki okumayla uyumlu"
 *                                belirsizliği burada doğmadan kapandı;
 *                                bölme/çarpma YASAK (motor adetle çarpar).
 *    commissionRate 0          ← ORAN ayrı alan (commission TUTAR — o
 *                                kullanılmaz). Alan doluysa (0 dahil)
 *                                kanal belgesi sayılır ve AYNEN yazılır;
 *                                NULL ise ChannelSku'dan doldurulur
 *                                (bugünkü TY dersi: oran gelmeyince satış
 *                                RULE_MISSING'e düşüyor; satış-anı snapshot
 *                                kaynağı zaten ChannelSku).
 *    orderDate "2026-09-04T16:12:09.935"
 *                              ← ZONE'SUZ İSTANBUL YERELİ. Kanıt: sipariş
 *                                13:12:09Z'de oluşturuldu = 16:12 İstanbul,
 *                                damga birebir. TR'de DST yok → sabit
 *                                "+03:00" eki güvenli. soldAt GERÇEK AN
 *                                alır (K163) → kuyruk saat süzgecinden
 *                                kendiliğinden geçer.
 *    status "Open"             ← kalem düzeyi. `Cancelled` kalem YAZILMAZ
 *                                (iptal ANI kaynağı yok — uydurulmaz) ve
 *                                ayrı kovada sayılır.
 *    packageNumber ""          ← Open'da boş; kargo/paket bağı ayrı uçtan,
 *                                ayrı karar. `shipmentCode` BOŞ bırakılır.
 *
 *  ═══ HESAP — SIT/CANLI AYRIMI ═══════════════════════════════════════════
 *  Hesap `externalId = HEPSIBURADA_MERCHANT_ID` ile bulunur. TEST ortamında
 *  yoksa "Hepsiburada — Test (SIT)" hesabı OLUŞTURULUR (izli): test
 *  siparişleri canlı AXCALI hesabına (externalId 7000222505) KARIŞMAZ.
 *  CANLI ortamda hesap yoksa OLUŞTURULMAZ — kırmızı durur: canlı hesabın
 *  kimliği elle, bilinçli bağlanır.
 *
 *  ⚠ BEKÇİ TURU KOŞARKEN KOŞMAZ (K162-② kapısı, TY ile aynı gerekçe:
 *  `varyant-arama-kurali` harness hedefi).
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");

const kurus = (n: number) => Math.round(n * 100) / 100;

/**
 * HB zaman damgası → UTC an. Zone'suz İstanbul yereli (ölçüldü, başlıktaki
 * kanıt); TR'de yaz saati uygulaması yok, sabit +03:00 güvenli.
 */
export function hbAni(metin: string): Date | null {
  if (typeof metin !== "string" || metin.length < 19) return null;
  const d = new Date(metin + "+03:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Kalem komisyon oranı: HB alanı DOLUYSA (0 dahil) kanal belgesidir, aynen
 * geçer; NULL ise `null` döner ve çağıran ChannelSku'dan doldurur.
 */
export function hbKomisyonOrani(ham: unknown): number | null {
  if (ham === null || ham === undefined) return null;
  const n = Number(ham);
  return Number.isFinite(n) ? n : null;
}

type Kalem = {
  merchantSku: string;
  hbSku: string;
  adet: number;
  birimFiyat: number;
  kdv: number | null;
  komisyon: number | null;
};

type Aday = {
  siparisNo: string;
  soldAt: Date;
  kalemler: Kalem[];
  iptalliKalem: number;
};

function bekciTuruKosuyorMu(): boolean {
  return kilitDurumu().canli;
}

async function hesabiBul(
  prisma: PrismaClient,
  k: Kimlik,
): Promise<{ id: string; ad: string; olusturuldu: boolean } | null> {
  const mevcut = await prisma.channelAccount.findFirst({
    where: { externalId: k.merchantId },
    select: { id: true, name: true },
  });
  if (mevcut) return { id: mevcut.id, ad: mevcut.name, olusturuldu: false };
  if (k.ortam.toUpperCase() !== "TEST") return null;
  if (!YAZ) return { id: "(önizleme)", ad: "Hepsiburada — Test (SIT)", olusturuldu: true };
  const kanal = await prisma.channel.findFirst({
    where: { name: "Hepsiburada" },
    select: { id: true },
  });
  if (!kanal) return null;
  const yeni = await prisma.channelAccount.create({
    data: {
      name: "Hepsiburada — Test (SIT)",
      code: "HB-SIT-TEST",
      defaultCurrency: "TRY",
      channelId: kanal.id,
      externalId: k.merchantId,
      satisIcin: true,
    },
    select: { id: true, name: true },
  });
  return { id: yeni.id, ad: yeni.name, olusturuldu: true };
}

async function main() {
  if (bekciTuruKosuyorMu()) {
    console.log("");
    console.log("⏭ BEKÇİ TURU KOŞUYOR (.bekci-kilidi) — bu çekim ATLANDI; sonraki koşum yakalar.");
    console.log("");
    return;
  }
  const k = kimlikOku();
  if (!k) {
    console.log("\n⛔ HB ANAHTARLARI EKSİK (.env.canli)\n");
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
  const okumaAni = new Date();
  const partiKimligi = `hb-${okumaAni.toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;

  console.log("\n" + "=".repeat(78));
  console.log(`K165 HB İÇE AKTARMA — ${YAZ ? "⚠ YAZIM MODU" : "ÖNİZLEME (yazmaz)"}  ·  ortam: ${k.ortam}`);
  console.log("=".repeat(78));
  console.log(`  parti kimliği : ${partiKimligi}`);

  const hesap = await hesabiBul(prisma, k);
  if (!hesap) {
    console.log("\n⛔ HESAP YOK ve bu ortamda OLUŞTURULMAZ — canlı hesap kimliği elle bağlanır.\n");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  console.log(`  kanal hesabı  : ${hesap.ad}${hesap.olusturuldu ? "  (YENİ — bu koşumda oluşturuluyor)" : ""}`);

  // ═══ ÖNCE SAYIM ═════════════════════════════════════════════════════════
  const onceToplam = await prisma.sale.count();
  console.log(`\n① ÖNCE SAYIM — Sale TOPLAM ${onceToplam}`);

  // ═══ ÇEKİM (kalem düzeyi) ═══════════════════════════════════════════════
  const cekim = await tumKayitlar((o, l) => UCLAR.siparisler(k, o, l), baslik, 100);
  if (cekim.tur !== "TAMAM") {
    console.log(`\n⛔ SİPARİŞLER OKUNAMADI (${cekim.tur === "HATA" ? cekim.sonuc.tur : "zarf tanınmadı"}) — hüküm yok.\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  const adaylar = new Map<string, Aday>();
  let saatCozulemeyen = 0;
  for (const ham of cekim.kayitlar as Record<string, unknown>[]) {
    const no = String(ham.orderNumber);
    const an = hbAni(String(ham.orderDate));
    if (an === null) {
      saatCozulemeyen++;
      continue;
    }
    const aday =
      adaylar.get(no) ??
      ({ siparisNo: no, soldAt: an, kalemler: [], iptalliKalem: 0 } as Aday);
    if (String(ham.status) === "Cancelled") {
      aday.iptalliKalem++;
    } else {
      const birim = Number((ham.unitPrice as { amount?: unknown })?.amount);
      const adet = Number(ham.quantity ?? 0);
      if (Number.isFinite(birim) && adet > 0) {
        aday.kalemler.push({
          merchantSku: String(ham.merchantSKU ?? ""),
          hbSku: String(ham.sku ?? ""),
          adet,
          /** ⛔ BÖLME/ÇARPMA YOK — unitPrice BİRİM (ölçüldü, başlık). */
          birimFiyat: kurus(birim),
          kdv: ham.vatRate == null ? null : Number(ham.vatRate),
          komisyon: hbKomisyonOrani(ham.commissionRate),
        });
      }
    }
    adaylar.set(no, aday);
  }

  console.log(`\n② AKIŞ`);
  console.log(`   API kalem                                        ${cekim.kayitlar.length}`);
  console.log(`   sipariş (gruplandı)                              ${adaylar.size}`);
  if (saatCozulemeyen > 0) console.log(`   ⚠ SAATİ ÇÖZÜLEMEYEN KALEM                        ${saatCozulemeyen}  ← YAZILMAZ`);

  /** Bütün kalemleri iptalli olan sipariş yazılmaz — ayrı sayılır. */
  const tumIptal = [...adaylar.values()].filter((a) => a.kalemler.length === 0);
  for (const a of tumIptal) adaylar.delete(a.siparisNo);
  if (tumIptal.length > 0) console.log(`   tamamı iptal kalemli → YAZILMAZ                  ${tumIptal.length}`);

  // ═══ ÇAKIŞMA — KÜRESEL (TY dersi: `Sale.code` global unique) ═══════════
  const mevcutKodlar = new Set(
    (
      await prisma.sale.findMany({
        where: { code: { in: [...adaylar.keys()] } },
        select: { code: true },
      })
    ).map((s) => s.code!),
  );
  const cakisanlar = [...adaylar.keys()].filter((n) => mevcutKodlar.has(n));
  for (const n of cakisanlar) adaylar.delete(n);
  console.log(`   ÇAKIŞTI → ATLANDI (ezme YOK)                     ${cakisanlar.length}`);

  // ═══ VARYANT KAPISI — ortak kod kuralı, iki kod adayı ═══════════════════
  const tumKodlar = [
    ...new Set(
      [...adaylar.values()].flatMap((a) =>
        a.kalemler.flatMap((x) => [x.merchantSku, x.hbSku].filter((s) => s !== "")),
      ),
    ),
  ];
  const varyantlar = await prisma.productVariant.findMany({
    where: { OR: kodKosuluToplu(tumKodlar) },
    select: {
      id: true,
      barcode: true,
      companySku: true,
      sku: true,
      channelSkus: { where: { isActive: true }, select: { channelSku: true } },
    },
  });
  const kodVaryantlar = new Map<string, Set<string>>();
  const ekle = (kod: string | null, id: string) => {
    if (!kod || !tumKodlar.includes(kod)) return;
    const kume = kodVaryantlar.get(kod) ?? new Set<string>();
    kume.add(id);
    kodVaryantlar.set(kod, kume);
  };
  for (const v of varyantlar) {
    ekle(v.barcode, v.id);
    ekle(v.companySku, v.id);
    ekle(v.sku, v.id);
    for (const cs of v.channelSkus) ekle(cs.channelSku, v.id);
  }
  const kodVaryant = new Map<string, string>();
  const belirsizKodlar = new Set<string>();
  for (const [kod, kume] of kodVaryantlar) {
    if (kume.size === 1) kodVaryant.set(kod, [...kume][0]);
    else belirsizKodlar.add(kod);
  }
  /** Kalem çözümü: önce merchantSKU (bizim kod), sonra HB SKU. */
  const kalemVaryanti = (x: Kalem): string | "BELIRSIZ" | null => {
    for (const kod of [x.merchantSku, x.hbSku]) {
      if (kod === "") continue;
      if (belirsizKodlar.has(kod)) return "BELIRSIZ";
      const id = kodVaryant.get(kod);
      if (id) return id;
    }
    return null;
  };

  const yazilabilir: { aday: Aday; varyantIdler: string[] }[] = [];
  const yazilamaz: Aday[] = [];
  const belirsiz: Aday[] = [];
  for (const a of adaylar.values()) {
    const idler: string[] = [];
    let durum: "TAM" | "BELIRSIZ" | "YOK" = "TAM";
    for (const x of a.kalemler) {
      const v = kalemVaryanti(x);
      if (v === "BELIRSIZ") durum = "BELIRSIZ";
      else if (v === null) durum = durum === "BELIRSIZ" ? "BELIRSIZ" : "YOK";
      else idler.push(v);
    }
    if (durum === "TAM") yazilabilir.push({ aday: a, varyantIdler: idler });
    else if (durum === "BELIRSIZ") belirsiz.push(a);
    else yazilamaz.push(a);
  }
  if (belirsiz.length > 0) {
    console.log(`   ⛔ BELİRSİZ (kod birden çok varyantta)            ${belirsiz.length}`);
    for (const a of belirsiz) console.log(`        ${a.siparisNo}`);
  }
  console.log(`   YAZILABİLİR                                      ${yazilabilir.length}`);
  console.log(`   ⛔ YAZILAMAZ (kod kataloğumuzda yok)              ${yazilamaz.length}`);
  for (const a of yazilamaz) console.log(`        ${a.siparisNo} · ${a.kalemler.map((x) => x.merchantSku + "/" + x.hbSku).join(", ")}`);

  console.log(`\n③ YAZILACAK: ${yazilabilir.length} sipariş  ·  beklenen Sale TOPLAM ${onceToplam + yazilabilir.length}`);

  if (!YAZ) {
    console.log(`\n${"=".repeat(78)}`);
    console.log(`  ÖNİZLEME — hiçbir şey yazılmadı. Yazmak için: -- --yaz`);
    console.log("=".repeat(78) + "\n");
    await prisma.$disconnect();
    return;
  }

  // ═══ YAZIM ══════════════════════════════════════════════════════════════
  console.log(`\n④ YAZILIYOR…`);
  let yazilan = 0;
  let hata = 0;
  let oranChannelSkudan = 0;
  for (const { aday } of yazilabilir) {
    try {
      const kalemVerisi = [] as {
        variantId: string;
        quantity: number;
        unitPriceAmount: number;
        unitPriceCurrency: "TRY";
        vatRate: number | null;
        commissionRate: number | null;
      }[];
      for (const x of aday.kalemler) {
        const variantId = kalemVaryanti(x) as string;
        let komisyon = x.komisyon;
        if (komisyon === null) {
          /** Bugünkü TY dersi (11569147554): oran gelmezse satış
           *  RULE_MISSING'e düşer. Satış-anı snapshot kaynağı ChannelSku —
           *  oradan doldurulur; o da boşsa null kalır (bilinmiyor). */
          const cs = await prisma.channelSku.findFirst({
            where: { variantId, channelAccountId: hesap.id, isActive: true },
            select: { commissionRate: true },
          });
          if (cs?.commissionRate != null) {
            komisyon = Number(cs.commissionRate.toString());
            oranChannelSkudan++;
          }
        }
        kalemVerisi.push({
          variantId,
          quantity: x.adet,
          unitPriceAmount: x.birimFiyat,
          unitPriceCurrency: "TRY",
          vatRate: x.kdv,
          commissionRate: komisyon,
        });
      }
      await prisma.sale.create({
        data: {
          code: aday.siparisNo,
          channelAccountId: hesap.id,
          /** GERÇEK AN (K163) — kuyruk saat süzgecinden geçer. */
          soldAt: aday.soldAt,
          importBatch: partiKimligi,
          importKaynak: "hb-enumerasyon",
          items: { create: kalemVerisi },
        },
      });
      yazilan++;
    } catch (e) {
      hata++;
      console.log(`   ⛔ ${aday.siparisNo} — ${(e as Error).message.replace(/\s+/g, " ").slice(-160)}`);
    }
  }

  // ═══ SONRA SAYIM ════════════════════════════════════════════════════════
  const sonraToplam = await prisma.sale.count();
  const beklenen = onceToplam + yazilabilir.length;
  console.log(`\n⑤ SONRA SAYIM`);
  console.log(`   yazılan ${yazilan} · hata ${hata} · oran ChannelSku'dan ${oranChannelSkudan}`);
  console.log(`   Sale TOPLAM ${onceToplam} → ${sonraToplam}`);
  if (sonraToplam !== beklenen) {
    console.log(`   ⛔ SAYIM TUTMADI — beklenen ${beklenen}. YORUMLANMIYOR; ham hâliyle yazıldı.`);
  } else {
    console.log(`   ✓ SAYIM TUTTU — ${beklenen}`);
  }

  await prisma.auditLog.create({
    data: {
      action: "HB_SIPARIS_ICE_AKTARMA",
      targetType: "ChannelAccount",
      targetId: hesap.id,
      detail: JSON.stringify({
        partiKimligi,
        okumaAni: okumaAni.toISOString(),
        ortam: k.ortam,
        apiKalem: cekim.kayitlar.length,
        siparis: adaylar.size + cakisanlar.length + tumIptal.length,
        cakisanAtlandi: cakisanlar.length,
        tamamiIptal: tumIptal.length,
        saatCozulemeyen,
        belirsiz: belirsiz.length,
        yazilamazKod: yazilamaz.length,
        yazilan,
        hata,
        oranChannelSkudan,
        saleOnce: onceToplam,
        saleSonra: sonraToplam,
        not: "StockMovement URETILMEDI - stok/kar bagi ONAY KUYRUGUNDAN (K164).",
      }),
    },
  });
  console.log(`   ✓ AuditLog yazıldı — HB_SIPARIS_ICE_AKTARMA`);

  console.log(`\n${"=".repeat(78)}`);
  console.log(`  GERİ ALMA ÖLÇÜTÜ: importBatch = ${partiKimligi} (liste değil, yeniden hesaplanabilir)`);
  console.log("=".repeat(78) + "\n");
  await prisma.$disconnect();
}

/** İçeri alındığında KOŞMAZ — TY importer'daki kusur düzeltmesinin aynısı. */
const dogrudanKosuluyor = (() => {
  const giris = process.argv[1] ?? "";
  return /canli-hb-ice-aktar\.(ts|js)$/.test(giris.split("\\").join("/"));
})();

if (dogrudanKosuluyor) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
