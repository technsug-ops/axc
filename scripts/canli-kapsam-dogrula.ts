/**
 * ============================================================================
 *  KAPSAM DEĞİŞİKLİĞİ DOĞRULAMASI — NET-2 KURUŞUNA AYNI MI?
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:kapsam-dogrula
 *
 *  HİÇBİR ŞEY YAZMAZ. Yazma bayrağı da yoktur.
 *
 *  ⚠ MİMAR ŞARTI 3 (20.08.2026): `SABIT_GIDER` kuralı `PER_SALE`'den
 *  `PER_PACKAGE`'a taşındıktan sonra, **`paketSayisi = 1` olan satışlarda
 *  NET-2 KURUŞUNA aynı kalmalı.** Çarpan 1 olduğu için hiçbir rakam
 *  oynamamalı; **oynayan tek kuruş varsa taşıma hatalıdır.**
 *
 *  ── NİYE AYRI BETİK ─────────────────────────────────────────────────────
 *  Taşımayı yapan betiğin kendi işini doğrulaması, kendi kendini
 *  onaylayan ölçüm olurdu. Bu betik kaydı OKUR ve motoru YENİDEN çağırır:
 *  saklı NET ile motorun bugün ürettiği NET karşılaştırılır.
 *
 *  ⚠ HESAP MOTORDAN, KOPYA DEĞİL. Kendi NET formülünü yazsaydı motor
 *  değiştiğinde bu betik eski formülü savunurdu.
 * ============================================================================
 *
 * ⛔ BEKCI SINIFI: BAGIMSIZ — CANLI veritabani ister, tur baglanti kuramaz.
 * `canli:` onekli komutlar bilerek tur DISINDA (scripts/bekci.ts suzgeci).
 */

import { kdvDahilKargo } from "../src/lib/kargo-kdv";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** Kuruş — paranın gerçek çözünürlüğü. Tolerans DEĞİL, birim. */
const KURUS = 0.005;

function p(n: unknown): string {
  if (n === null || n === undefined) return "—";
  return Number(n.toString()).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const { karOnizle } = await import("../src/lib/kar-yeniden");

  console.log("");
  console.log("KAPSAM DOĞRULAMASI — NET-2 kuruşuna aynı mı?");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        RAPOR — hiçbir şey yazılmaz");
  console.log("");

  const satislar = await prisma.sale.findMany({
    where: { iptalTarihi: null },
    select: {
      id: true,
      code: true,
      paketSayisi: true,
      net1Amount: true,
      net2Amount: true,
      cargoCarrierId: true,
      cargoDesi: true,
      cargoAmount: true,
      items: { select: { id: true, commissionRate: true } },
    },
  });

  let tekPaket = 0;
  let cokPaket = 0;
  let ayni = 0;
  const sapan: { kod: string; saklanan: string; motor: string; fark: number }[] =
    [];
  let hesaplanamayan = 0;

  for (const s of satislar) {
    /**
     * ⚠ ÇAĞRI DÜZENLEME YOLUYLA AYNI — oran kalemden, komisyon TUTARI
     * null, kargo saklı tutardan. Farklı çağırsaydık aynı satış üç yoldan
     * üç türlü hesaplanırdı.
     */
    const sonuc = await karOnizle({
      saleId: s.id,
      kalemler: s.items.map((i) => ({
        saleItemId: i.id,
        commissionRate:
          i.commissionRate === null ? null : Number(i.commissionRate.toString()),
        commissionAmount: null,
      })),
      cargoCarrierId: s.cargoCarrierId,
      cargoDesi: s.cargoDesi === null ? null : Number(s.cargoDesi.toString()),
      cargoAmountManual: kdvDahilKargo(
        s.cargoAmount === null ? null : Number(s.cargoAmount.toString()),
      ),
    });

    if (s.paketSayisi > 1) cokPaket++;
    else tekPaket++;

    if (sonuc === null || s.net2Amount === null) {
      hesaplanamayan++;
      continue;
    }

    /**
     * ⚠ YALNIZ TEK PAKETLİLER HÜKME GİRER. Çok paketli satışta NET'in
     * DEĞİŞMESİ beklenen davranıştır — orada aynılık aranmaz, aksine
     * değişmemesi kusur olurdu.
     */
    if (s.paketSayisi > 1) continue;

    const saklanan = Number(s.net2Amount.toString());
    const fark = Math.abs(sonuc.yeni.net2 - saklanan);
    if (fark < KURUS) ayni++;
    else
      sapan.push({
        kod: s.code ?? "—",
        saklanan: p(saklanan),
        motor: p(sonuc.yeni.net2),
        fark: Math.round(fark * 100) / 100,
      });
  }

  console.log("  taranan satış           " + satislar.length);
  console.log("    paketSayisi = 1       " + tekPaket);
  console.log("    paketSayisi > 1       " + cokPaket + "  (hükme girmez)");
  console.log("    NET hesaplanamayan    " + hesaplanamayan);
  console.log("");
  console.log("  TEK PAKETLİLERDE KURUŞUNA AYNI: " + ayni);
  console.log("  SAPAN                          : " + sapan.length);
  console.log("");

  if (sapan.length > 0) {
    console.log("  ⛔ TAŞIMA HATALI — çarpan 1 iken NET oynamamalıydı:");
    for (const x of sapan.slice(0, 20)) {
      console.log(
        "    " +
          x.kod.padEnd(14) +
          " saklanan " +
          x.saklanan.padStart(10) +
          "  motor " +
          x.motor.padStart(10) +
          "  fark " +
          p(x.fark),
      );
    }
    if (sapan.length > 20) console.log("    … +" + (sapan.length - 20) + " satır");
    console.log("");
    console.log("  ÖNERİ: npm run canli:kesinti-kapsami -- --geri");
    console.log("");
    process.exitCode = 1;
    return;
  }

  console.log("  ✓ TEK PAKETLİ SATIŞLARDA TEK KURUŞ OYNAMADI.");
  if (cokPaket > 0) {
    console.log("");
    console.log("  ⚠ " + cokPaket + " çok paketli satış var; onların NET'i");
    console.log("    taşımadan sonra DEĞİŞMELİ. Tazelemek için:");
    console.log("        satış kartı → Yeniden Hesapla");
  }
  console.log("");

  await prisma.$disconnect();
}

main();
