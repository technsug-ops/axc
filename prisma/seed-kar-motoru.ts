/**
 * ============================================================================
 *  KÂR MOTORU SABİT VERİSİ (SEED)
 * ----------------------------------------------------------------------------
 *  Ne yazar:
 *    1. KDV kategorileri (Türkiye varsayılanları)
 *    2. Kanal kesinti kuralları (ChannelFee) — teyitli değerler
 *    3. Kargo firmaları ve tarifeleri (veri/kargo-tarifeleri.xlsx'ten)
 *
 *  TEKRAR ÇALIŞTIRILABİLİR: upsert + skipDuplicates. Var olan kayıtları
 *  değiştirmez; oranları panelden elle düzeltirseniz seed geri almaz.
 * ============================================================================
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { FeeBasis, FeeScope } from "../src/generated/prisma/enums";
import { tutarCoz, xlsxOku, type Sayfa } from "./seed-xlsx";

const TARIFE_DOSYASI = "veri/kargo-tarifeleri.xlsx";

// ---------------------------------------------------------------------------
//  1. KDV KATEGORİLERİ
// ---------------------------------------------------------------------------
const KATEGORILER = [
  { name: "Genel", vatRate: "20" },
  { name: "İndirimli", vatRate: "10" },
  { name: "Süper İndirimli", vatRate: "1" },
];

// ---------------------------------------------------------------------------
//  2. KANAL KESİNTİ KURALLARI (teyitli 09.08.2026)
// ---------------------------------------------------------------------------
//  ORAN BİRİMİ: yüzde olarak saklanır (%0,8 -> 0.8). Motor 100'e böler.
const KESINTILER = [
  {
    kanal: "HEPSIBURADA",
    code: "KOMISYON_KDV",
    scope: FeeScope.PER_ITEM,
    basis: FeeBasis.COMMISSION_AMOUNT,
    rate: "20",
    amount: null,
    currency: null,
  },
  {
    kanal: "HEPSIBURADA",
    code: "ODEME_GIDERI",
    scope: FeeScope.PER_SALE,
    basis: FeeBasis.SALE_AMOUNT,
    rate: "0.8",
    amount: null,
    currency: null,
  },
  {
    kanal: "HEPSIBURADA",
    code: "HIZMET_BEDELI",
    scope: FeeScope.PER_SALE,
    basis: FeeBasis.FIXED,
    rate: null,
    amount: "12.60",
    currency: "TRY" as const,
  },
  {
    kanal: "TRENDYOL",
    code: "SABIT_GIDER",
    scope: FeeScope.PER_SALE,
    basis: FeeBasis.FIXED,
    rate: null,
    amount: "13.19",
    currency: "TRY" as const,
  },
];

// ---------------------------------------------------------------------------
//  3. KARGO — sayfa tanımları
// ---------------------------------------------------------------------------
type SayfaTanimi = {
  kanal: string;
  sayfaAdi: string;
  baslikSatiri: number;
  ilkVeriSatiri: number;
  yururluk: string;
  /**
   * Firma bazlı üst desi sınırı. Kaynak dosyada bu sınırın üstündeki
   * hücreler ya boş ya bozuk; sessizce başka firmaya geçmek yerine o
   * desilerde tarife OLMAZ ve motor RULE_MISSING durumuna düşer.
   */
  ustSinir?: Record<string, number>;
};

const SAYFALAR: SayfaTanimi[] = [
  {
    kanal: "TRENDYOL",
    sayfaAdi: "trendyol güncel kargo",
    baslikSatiri: 3,
    ilkVeriSatiri: 4,
    yururluk: "2026-07-16",
    // Sürat ve Yurtiçi kaynakta desi 100'den sonra boş.
    ustSinir: { SURAT: 100, YURTICI: 100 },
  },
  {
    kanal: "HEPSIBURADA",
    sayfaAdi: "hepsiburada güncel kargo ücretl",
    baslikSatiri: 2,
    ilkVeriSatiri: 3,
    yururluk: "2026-08-01",
    // Kolay Gelsin desi 60'tan sonra boş.
    // hepsiJET desi 61'den itibaren BOZUK: ₺ işareti yok ve değer sürekli
    // AZALIYOR (44344 -> 55). Tarife olamaz; kullanıcı onayıyla atlanıyor.
    ustSinir: { KOLAY_GELSIN: 60, HEPSIJET: 60 },
  },
];

/**
 * Sayfa başlıklarındaki firma adları iki sayfada farklı yazılmış
 * ("Aras" / "Aras Kargo"). Aynı firmayı tek kayıtta topluyoruz ki satış
 * formunda ikili görünmesin.
 */
const FIRMA_KODU: { desen: RegExp; code: string; name: string }[] = [
  { desen: /^aras/i, code: "ARAS", name: "Aras Kargo" },
  { desen: /^dhl/i, code: "DHL", name: "DHL" },
  { desen: /^hepsijet xl/i, code: "HEPSIJET_XL", name: "hepsiJET XL" },
  { desen: /^hepsijet/i, code: "HEPSIJET", name: "hepsiJET" },
  { desen: /^kolay gelsin/i, code: "KOLAY_GELSIN", name: "Kolay Gelsin" },
  { desen: /^ptt/i, code: "PTT", name: "PTT Kargo" },
  { desen: /^sürat|^surat/i, code: "SURAT", name: "Sürat Kargo" },
  { desen: /^tex/i, code: "TEX", name: "TEX" },
  { desen: /^yurtiçi|^yurtici/i, code: "YURTICI", name: "Yurtiçi Kargo" },
  { desen: /^ceva tedarik/i, code: "CEVA_TEDARIK", name: "CEVA Tedarik" },
  { desen: /^ceva/i, code: "CEVA", name: "CEVA Lojistik" },
  { desen: /^horoz/i, code: "HOROZ", name: "Horoz Lojistik" },
];

function firmaEslestir(baslik: string) {
  const temiz = baslik.replace(/\s+/g, " ").trim();
  return FIRMA_KODU.find((f) => f.desen.test(temiz));
}

// ---------------------------------------------------------------------------

export async function karMotoruSeed(prisma: PrismaClient) {
  console.log("\n=== KÂR MOTORU SEED ===\n");

  // ---- 1. Kategoriler ----
  for (const k of KATEGORILER) {
    await prisma.category.upsert({
      where: { name: k.name },
      update: {},
      create: { name: k.name, vatRate: k.vatRate },
    });
  }
  console.log(`Kategori    : ${await prisma.category.count()} kayıt`);

  // ---- 2. Kanal kesintileri ----
  const kanallar = new Map(
    (await prisma.channel.findMany({ select: { id: true, code: true } })).map(
      (c) => [c.code, c.id],
    ),
  );

  for (const f of KESINTILER) {
    const channelId = kanallar.get(f.kanal);
    if (!channelId) {
      console.log(`  UYARI: ${f.kanal} kanalı yok, ${f.code} atlandı`);
      continue;
    }
    const validFrom = new Date("2026-01-01");
    await prisma.channelFee.upsert({
      where: {
        channelId_code_validFrom: { channelId, code: f.code, validFrom },
      },
      update: {},
      create: {
        channelId,
        code: f.code,
        scope: f.scope,
        basis: f.basis,
        rate: f.rate,
        amount: f.amount,
        currency: f.currency,
        validFrom,
      },
    });
  }
  console.log(`Kanal kesintisi: ${await prisma.channelFee.count()} kayıt`);

  // ---- 3. Kargo firmaları + tarifeler ----
  console.log(`\nTarife dosyası okunuyor: ${TARIFE_DOSYASI}`);
  const kitap = xlsxOku(TARIFE_DOSYASI);

  // Firmaları önce oluştur (iki sayfadan birleşik).
  const gorulenFirmalar = new Map<string, string>(); // code -> name
  for (const tanim of SAYFALAR) {
    const sayfa = kitap.get(tanim.sayfaAdi);
    if (!sayfa) throw new Error(`Sayfa bulunamadı: "${tanim.sayfaAdi}"`);
    const baslik = sayfa[tanim.baslikSatiri] ?? [];
    for (const b of baslik.slice(1)) {
      if (!b) continue;
      const firma = firmaEslestir(b);
      if (!firma) {
        console.log(`  UYARI: eşleşmeyen kargo firması sütunu: "${b}"`);
        continue;
      }
      gorulenFirmalar.set(firma.code, firma.name);
    }
  }

  const firmaId = new Map<string, string>();
  for (const [code, name] of gorulenFirmalar) {
    const kayit = await prisma.cargoCarrier.upsert({
      where: { code },
      update: {},
      create: { code, name },
      select: { id: true, code: true },
    });
    firmaId.set(kayit.code, kayit.id);
  }
  console.log(`Kargo firması  : ${firmaId.size} kayıt`);

  // Tarife satırları
  for (const tanim of SAYFALAR) {
    const sayfa = kitap.get(tanim.sayfaAdi)!;
    const channelId = kanallar.get(tanim.kanal);
    if (!channelId) {
      console.log(`  UYARI: ${tanim.kanal} kanalı yok, tarife atlandı`);
      continue;
    }
    const effectiveFrom = new Date(tanim.yururluk);
    const baslik = sayfa[tanim.baslikSatiri] ?? [];

    const satirlar: {
      channelId: string;
      carrierId: string;
      desi: number;
      amount: string;
      effectiveFrom: Date;
    }[] = [];
    const atlanan = new Map<string, number>();

    for (let i = tanim.ilkVeriSatiri; i < sayfa.length; i++) {
      const r = sayfa[i];
      if (!r || r[0] === undefined) continue;
      const desi = Number(String(r[0]).replace(",", "."));
      if (!Number.isInteger(desi) || desi < 0) continue;

      for (let j = 0; j < baslik.length - 1; j++) {
        const firma = baslik[j + 1] ? firmaEslestir(baslik[j + 1]!) : undefined;
        if (!firma) continue;
        const carrierId = firmaId.get(firma.code);
        if (!carrierId) continue;

        const sinir = tanim.ustSinir?.[firma.code];
        if (sinir !== undefined && desi > sinir) {
          atlanan.set(firma.code, (atlanan.get(firma.code) ?? 0) + 1);
          continue;
        }

        const tutar = tutarCoz(r[j + 1]);
        if (tutar === null) {
          atlanan.set(firma.code, (atlanan.get(firma.code) ?? 0) + 1);
          continue;
        }

        satirlar.push({
          channelId,
          carrierId,
          desi,
          amount: tutar.toFixed(4),
          effectiveFrom,
        });
      }
    }

    // Toplu yazım — 2000'lik parçalar hâlinde.
    let yazilan = 0;
    for (let i = 0; i < satirlar.length; i += 2000) {
      const sonuc = await prisma.cargoTariff.createMany({
        data: satirlar.slice(i, i + 2000),
        skipDuplicates: true,
      });
      yazilan += sonuc.count;
    }

    console.log(
      `\n${tanim.kanal} (${tanim.yururluk}): ${satirlar.length} satır hazırlandı, ${yazilan} yeni yazıldı`,
    );
    if (atlanan.size) {
      console.log("  atlanan hücreler (geçerli aralık dışı / boş / bozuk):");
      for (const [code, n] of atlanan) console.log(`    ${code}: ${n}`);
    }
  }

  console.log(`\nToplam tarife satırı: ${await prisma.cargoTariff.count()}`);
}
