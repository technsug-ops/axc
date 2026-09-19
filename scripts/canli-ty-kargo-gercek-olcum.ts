/**
 * ============================================================================
 *  K220-② — TY GERÇEK KARGO MALİYETİ · SALT ÖLÇÜM + GÜVENLİ YAZIM
 * ----------------------------------------------------------------------------
 *      npm run canli:ty-kargo-gercek-olcum            → KURU KOŞUM (ölçer)
 *      npm run canli:ty-kargo-gercek-olcum -- --yaz   → yalnız BOŞ olanları yazar
 *
 *  Son N günün "Kargo Fatura" faturalarını bulur, her birinin
 *  `/cargo-invoice/{id}/items` dökümünü çeker (sipariş bazında gerçek
 *  tutar + desi) ve mevcut `Sale.cargoAmount` ile karşılaştırır:
 *    · cargoAmount BOŞ  → API'den doldurulur (güvenli, "ZATEN_GERCEKLESEN"
 *      kuralı hiç ihlal edilmez — `kargo-tartim-tazele.ts`teki AYNI ilke)
 *    · cargoAmount DOLU → üzerine YAZILMAZ kuralı gereği dokunulamaz;
 *      yalnız NE KADAR saptığını ölçer, YAZMAZ (kullanıcı kararı 19.09.2026:
 *      "geçmişte ufak farklar sorun değil, mekanizma bugünden doğru kurulsun").
 *  ⚠ Amount KDV DAHİL geliyor (canlı ölçüldü 19.09.2026: sipariş
 *  11486752988 → API 141,42 = tarife(desi5, KDV hariç) 117,85 × 1,20 tam).
 * ============================================================================
 */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { apiGet, baslikKur, kimlikOku, tumSayfalar, UCLAR } from "./ty/istemci";
import { izYaz } from "../src/lib/iz";
import { satisKarTazele } from "../src/lib/kar-yeniden";

const GUN = 86_400_000;
const TARAMA_GUN = 45;
const PENCERE_GUN = 15;
const kurus = (x: number) => Math.round(x * 100) / 100;

function para(x: number): string {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function gun(x: number): string {
  return new Date(x).toISOString().slice(0, 10);
}

export type TyKargoGercekOzeti = {
  kip: "ONIZLEME" | "YAZIM";
  faturaSayisi: number;
  bosOlanDoldurulabilir: number;
  bosOlanToplam: number;
  doluOlanUyumlu: number;
  doluOlanSapan: number;
  bulunamayan: number;
  yazilan: number;
};

/** ⚠ ROUTE'DAN DA, CLI'DAN DA ÇAĞRILIR (K166 deseni). */
export async function tyKargoGercekYazKos(ayar: {
  yaz: boolean;
  dbAdresi?: string;
}): Promise<TyKargoGercekOzeti | { atlandi: "KIMLIK" | "VERITABANI" | "HESAP" }> {
  const YAZ = ayar.yaz;
  const kimlik = kimlikOku();
  if (!kimlik) {
    console.log("⛔ TY kimliği okunamadı");
    return { atlandi: "KIMLIK" };
  }
  const baslik = baslikKur(kimlik);

  let dbAdresi = ayar.dbAdresi ?? null;
  if (dbAdresi === null) {
    const c = canliYapilandirma();
    if (!c.tamam) {
      console.log("⛔ canlı adres okunamadı");
      return { atlandi: "VERITABANI" };
    }
    dbAdresi = betikAdresi(c.veri.ham);
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(dbAdresi) });

  console.log("\n" + "=".repeat(100));
  console.log("TY GERÇEK KARGO MALİYETİ " + (YAZ ? "⚠ YAZIM (yalnız boş kalemler)" : "(KURU KOŞUM, ölçer)"));
  console.log("=".repeat(100));

  const hesap = await prisma.channelAccount.findFirst({
    where: { externalId: kimlik.saticiId },
    select: { id: true },
  });
  if (!hesap) {
    console.log("⛔ kanal hesabı yok");
    await prisma.$disconnect();
    return { atlandi: "HESAP" };
  }

  // ── Kargo Fatura faturalarını bul ───────────────────────────────────────
  const simdi = Date.now();
  const enEski = simdi - TARAMA_GUN * GUN;
  const faturalar: { id: string; tutar: number }[] = [];
  for (let bas = enEski; bas < simdi; bas += PENCERE_GUN * GUN) {
    const son = Math.min(bas + PENCERE_GUN * GUN, simdi);
    const s = await tumSayfalar(
      (sayfa) => UCLAR.otherFinancials(kimlik.saticiId, bas, son, sayfa, "DeductionInvoices"),
      baslik,
    );
    if (s.tur !== "TAMAM") continue;
    for (const r of s.kayitlar as Record<string, unknown>[]) {
      if (r.transactionType === "Kargo Fatura") {
        faturalar.push({ id: String(r.id), tutar: (r.debt as number) ?? 0 });
      }
    }
  }
  console.log(`\n${faturalar.length} Kargo Fatura bulundu (${gun(enEski)} → ${gun(simdi)}).`);

  // ── Her faturanın sipariş bazlı dökümü ──────────────────────────────────
  const kalemler: { orderNumber: string; amount: number; desi: number }[] = [];
  for (const f of faturalar) {
    const yol = UCLAR.kargoFaturaKalemleri(kimlik.saticiId, f.id);
    const s = await apiGet(yol, baslik, 60_000);
    if (s.tur !== "VERI") continue;
    const g = s.govde as Record<string, unknown>;
    const icerik = Array.isArray(g.content) ? (g.content as Record<string, unknown>[]) : [];
    for (const it of icerik) {
      if (!it.orderNumber) continue;
      kalemler.push({
        orderNumber: String(it.orderNumber),
        amount: (it.amount as number) ?? 0,
        desi: (it.desi as number) ?? 0,
      });
    }
  }
  console.log(`Sipariş bazlı kargo kalemi: ${kalemler.length}`);

  /**
   * ⚠ BİR SİPARİŞİN BİRDEN ÇOK KARGO KALEMİ OLABİLİR — bölünmüş sevkiyat
   * (K201'deki "2 paket = 2 × platform hizmet" ile aynı desen). Karşılaştırma
   * SİPARİŞ toplamıyla yapılır, tek kalemle değil.
   */
  const siparisBazinda = new Map<string, { toplamAmount: number; maxDesi: number; kalemSayisi: number }>();
  for (const k of kalemler) {
    const m = siparisBazinda.get(k.orderNumber) ?? { toplamAmount: 0, maxDesi: 0, kalemSayisi: 0 };
    m.toplamAmount += k.amount;
    m.maxDesi = Math.max(m.maxDesi, k.desi);
    m.kalemSayisi++;
    siparisBazinda.set(k.orderNumber, m);
  }
  const bolunmusSevkiyat = [...siparisBazinda.values()].filter((m) => m.kalemSayisi > 1).length;
  if (bolunmusSevkiyat > 0) {
    console.log(`⚠ ${bolunmusSevkiyat} sipariş birden çok kargo kalemi taşıyor (bölünmüş sevkiyat) — toplamları alındı.`);
  }

  // ── Sale ile karşılaştır ─────────────────────────────────────────────────
  const siparisNolar = [...siparisBazinda.keys()];
  const satislar = await prisma.sale.findMany({
    where: { code: { in: siparisNolar }, channelAccountId: hesap.id },
    select: { id: true, code: true, cargoAmount: true, kanalKargoDesi: true },
  });
  const satisHarita = new Map(satislar.map((s) => [s.code!, s]));

  let bosOlanDoldurulabilir = 0;
  let bosOlanToplam = 0;
  let doluOlanSapan = 0;
  let doluOlanUyumlu = 0;
  const sapmaOrnekleri: string[] = [];
  const bulunamayan: string[] = [];
  /** ⛔ YALNIZ BU KÜME YAZILIR — cargoAmount BOŞ olanlar. Dolu olana (uyumlu
   *  ya da sapan fark etmez) hiçbir koşulda dokunulmaz. */
  const doldurulacaklar: { saleId: string; orderNo: string; kdvHaricTutar: number; desi: number }[] = [];

  for (const [orderNo, m] of siparisBazinda) {
    const satis = satisHarita.get(orderNo);
    if (!satis) { bulunamayan.push(orderNo); continue; }
    const kdvHaric = m.toplamAmount / 1.2;
    if (satis.cargoAmount === null) {
      bosOlanDoldurulabilir++;
      bosOlanToplam += kdvHaric;
      doldurulacaklar.push({ saleId: satis.id, orderNo, kdvHaricTutar: kdvHaric, desi: m.maxDesi });
    } else {
      const mevcut = Number(satis.cargoAmount.toString());
      const fark = Math.abs(mevcut - kdvHaric);
      if (fark > 0.5) {
        doluOlanSapan++;
        if (sapmaOrnekleri.length < 8) {
          sapmaOrnekleri.push(`   ${orderNo}  DB=${para(mevcut)}  API(KDV hariç)=${para(kdvHaric)}  fark=${para(fark)}`);
        }
      } else {
        doluOlanUyumlu++;
      }
    }
  }

  console.log("\n" + "-".repeat(100));
  console.log(`cargoAmount BOŞ, API'den doldurulabilir : ${bosOlanDoldurulabilir}  (toplam ${para(bosOlanToplam)})`);
  console.log(`cargoAmount DOLU ve API ile UYUMLU (±0,50₺): ${doluOlanUyumlu}`);
  console.log(`cargoAmount DOLU ama API'den SAPAN (>0,50₺): ${doluOlanSapan}`);
  if (sapmaOrnekleri.length > 0) {
    console.log("  örnekler:");
    for (const s of sapmaOrnekleri) console.log(s);
  }
  console.log(`Sistemde satışı bulunamayan sipariş no  : ${bulunamayan.length}`);
  console.log("-".repeat(100));

  if (!YAZ) {
    console.log("\nKURU KOŞUM — hiçbir şey yazılmadı. Yalnız BOŞ kalemleri yazmak için: --yaz\n");
    await prisma.$disconnect();
    return {
      kip: "ONIZLEME",
      faturaSayisi: faturalar.length,
      bosOlanDoldurulabilir,
      bosOlanToplam,
      doluOlanUyumlu,
      doluOlanSapan,
      bulunamayan: bulunamayan.length,
      yazilan: 0,
    };
  }

  // ── YAZIM — YALNIZ cargoAmount BOŞ OLAN KALEMLER ────────────────────────
  let yazilan = 0;
  for (const d of doldurulacaklar) {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: d.saleId },
        data: { cargoAmount: String(kurus(d.kdvHaricTutar)) },
      });
      await izYaz(
        {
          action: "TY_KARGO_GERCEK_YAZ",
          targetType: "Sale",
          targetId: d.saleId,
          userId: null,
          detail: JSON.stringify({ orderNo: d.orderNo, kdvHaricTutar: kurus(d.kdvHaricTutar), desi: d.desi }),
        },
        tx,
      );
    });
    await satisKarTazele(d.saleId, prisma);
    yazilan++;
  }
  console.log(`✓ ${yazilan} satışın gerçek kargo maliyeti yazıldı ve kârı tazelendi.`);

  await prisma.$disconnect();
  return {
    kip: "YAZIM",
    faturaSayisi: faturalar.length,
    bosOlanDoldurulabilir,
    bosOlanToplam,
    doluOlanUyumlu,
    doluOlanSapan,
    bulunamayan: bulunamayan.length,
    yazilan,
  };
}

/** ═══ İÇERİ ALINDIĞINDA KOŞMAZ ═══ (aynı desen: `canli-ty-ice-aktar.ts`) */
const dogrudanKosuluyor = (() => {
  const giris = process.argv[1] ?? "";
  return /canli-ty-kargo-gercek-olcum\.(ts|js)$/.test(giris.split("\\").join("/"));
})();

if (dogrudanKosuluyor) {
  tyKargoGercekYazKos({ yaz: process.argv.includes("--yaz") }).catch((e) => {
    console.error("HATA:", e instanceof Error ? e.stack : e);
    process.exit(1);
  });
}
