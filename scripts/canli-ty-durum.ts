/**
 * ============================================================================
 *  TRENDYOL API — NEREDEYİZ · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:ty-durum
 *
 *  BETIK SINIFI: SUREKLI — soru tekrarladıkça koşulur. HİÇBİR ŞEY YAZMAZ.
 *  Tek çağrı noktası `scripts/ty/istemci.ts`; o modül YALNIZ `GET` bilir.
 *
 *  ── ⛔ SORU ─────────────────────────────────────────────────────────────
 *  Kullanıcı: _"TY API'de ne durumdayız. Her şeyiyle bağlı mıyız?"_
 *
 *  ⚠ "BAĞLI MIYIZ" TEK SORU DEĞİL, ÜÇ SORU — VE ÜÇÜ AYRI CEVAPLANIR:
 *    ① UÇ VAR MI      — istemcide tanımlı mı
 *    ② UÇ ÇALIŞIYOR MU — bugün çağrılınca veri dönüyor mu
 *    ③ DEFTERE AKIYOR MU — o veri sistemde KAYITLI mı
 *
 *  ⛔ ÜÇÜ ÇOK FARKLI ŞEYLER. Uç çalışıyor olabilir ve deftere hiçbir şey
 *  akmıyor olabilir; "bağlıyız" cümlesi ikisini birden ima eder ve
 *  yanıltır. Bu betik üçünü ayrı ayrı ölçer.
 * ============================================================================
 */

import { readFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { UCLAR, apiGet, baslikKur, kimlikOku } from "./ty/istemci";

function gun(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
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

  console.log("=".repeat(94));
  console.log("  TRENDYOL API — NEREDEYİZ (salt okuma)");
  console.log("=".repeat(94));

  /**
   * ① UÇ VAR MI — istemci kaynağından SAYILIYOR, elle listelenmiyor.
   * ⚠ Liste elle yazılsaydı yarın eklenen uç burada görünmezdi.
   */
  const istemci = readFileSync("scripts/ty/istemci.ts", "utf8");
  const tanimli = Object.keys(UCLAR);
  console.log("\n① İSTEMCİDE TANIMLI UÇLAR");
  for (const u of tanimli) console.log(`   ✓ ${u}`);
  const yazmaFiili = /method:\s*"(POST|PUT|PATCH|DELETE)"/.test(istemci);
  console.log(
    `   ⭐ yazma fiili (POST/PUT/DELETE): ${yazmaFiili ? "⛔ VAR" : "✓ YOK"}` +
      "   ← istemci yazamıyor, tasarım gereği",
  );

  const k = kimlikOku();
  if (k === null) {
    console.log("\n⛔ TY kimliği okunamadı — ② ve ③ ÖLÇÜLEMEZ.");
    console.log("   Bu 'bağlı değiliz' DEMEK DEĞİL, 'ölçemedim' demektir.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const baslik = baslikKur(k);
  const GUN = 86_400_000;
  const simdi = Date.now();

  /** ② UÇ ÇALIŞIYOR MU — her biri BUGÜN çağrılıyor. */
  console.log("\n② UÇLAR BUGÜN ÇALIŞIYOR MU (canlı çağrı)");
  const denemeler: { ad: string; yol: string }[] = [
    {
      ad: "siparisler",
      yol: UCLAR.siparisler(k.saticiId, simdi - 7 * GUN, simdi, 0, 50),
    },
    {
      ad: "hakedis",
      yol: UCLAR.hakedis(k.saticiId, simdi - 15 * GUN, simdi, 0, 500),
    },
    { ad: "iadeler", yol: UCLAR.iadeler(k.saticiId, 0, 50) },
  ];
  const sonuclar = new Map<string, string>();
  for (const d of denemeler) {
    const s = await apiGet(d.yol, baslik, 90_000);
    let ozet: string;
    if (s.tur === "VERI") {
      const g = s.govde as Record<string, unknown>;
      const n =
        typeof g.totalElements === "number"
          ? g.totalElements
          : Array.isArray(g.content)
            ? (g.content as unknown[]).length
            : Array.isArray(g)
              ? g.length
              : 0;
      ozet = `✓ ÇALIŞIYOR · ${n} kayıt`;
    } else if (s.tur === "ISTEK_HATALI") {
      ozet = `⛔ 400 · parametre BİZDE yanlış · ${s.mesaj.slice(0, 90)}`;
    } else if (s.tur === "YETKISIZ") {
      ozet = `⛔ ${s.durum} · bu uç için İZİN YOK`;
    } else if (s.tur === "ULASILAMADI") {
      ozet = `⚠ ULAŞILAMADI · ${s.sebep} · ÖLÇÜLEMEDİ`;
    } else ozet = s.tur;
    sonuclar.set(d.ad, ozet);
    console.log(`   ${d.ad.padEnd(14)} ${ozet}`);
  }

  /**
   * ③ DEFTERE AKIYOR MU — ASIL SORU.
   *
   * ⚠ `importKaynak` alanı satışın NEREDEN geldiğini söyler. API'den gelen
   * kayıtlar `enumerasyon` damgası taşıyor.
   */
  console.log("\n③ DEFTERE NE AKIYOR — kaynak damgasından");
  const kaynaklar = await prisma.sale.groupBy({
    by: ["importKaynak"],
    _count: { _all: true },
  });
  let apiden = 0;
  let toplam = 0;
  for (const x of kaynaklar.sort((a, b) => b._count._all - a._count._all)) {
    toplam += x._count._all;
    if ((x.importKaynak ?? "").includes("enumerasyon")) apiden += x._count._all;
    console.log(
      `   ${String(x._count._all).padStart(5)}  ${x.importKaynak ?? "(elle / kaynaksız)"}`,
    );
  }
  console.log(
    `   ⭐ API'den gelen satış: ${apiden}/${toplam}` +
      ` (%${((apiden / toplam) * 100).toFixed(1)})`,
  );

  /** API'den gelen satışların tarih ufku — hâlâ akıyor mu, durdu mu? */
  const apiSatis = await prisma.sale.findMany({
    where: { importKaynak: { contains: "enumerasyon" } },
    select: { soldAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const apiIlk = await prisma.sale.findMany({
    where: { importKaynak: { contains: "enumerasyon" } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 1,
  });
  if (apiSatis.length > 0 && apiIlk.length > 0) {
    const sonGun = apiSatis[0].createdAt;
    const kacGun = Math.floor((simdi - sonGun.getTime()) / GUN);
    console.log(
      `   ilk API kaydı  : ${gun(apiIlk[0].createdAt.getTime())}` +
        `   son API kaydı : ${gun(sonGun.getTime())}  (${kacGun} gün önce)`,
    );
    if (kacGun > 2) {
      console.log(
        "   ⚠ Son kayıt 2 günden eski — akış DURMUŞ olabilir. Otomatik bir",
      );
      console.log("     zamanlayıcı YOK; içe aktarma ELLE koşuluyor.");
    }
  }

  /** Hakediş ve iade tarafı deftere ne kadar akmış. */
  const hakedisKalem = await prisma.settlementItem.count();
  const hakedisParti = await prisma.settlement.count();
  const iadeKaydi = await prisma.return.count();
  console.log(`\n   hakediş partisi ${hakedisParti} · kalem ${hakedisKalem}`);
  console.log(`   Return kaydı    ${iadeKaydi}`);
  console.log(
    "   ⚠ Bu rakamlar API'den gelenle ELLE gireni AYIRMIYOR — hakediş",
  );
  console.log("     dosyadan da yüklenebiliyor.");

  /**
   * ④ TANIMLI OLMAYAN — "her şeyiyle bağlı mıyız" sorusunun asıl cevabı.
   * ⚠ Bu liste ELLE tutuluyor ve BU BİR KUSURDUR: yarın TY yeni bir uç
   * yayımlarsa burada görünmez. Ama alternatifi (TY'nin uç kataloğunu
   * makineyle okumak) bugün yok — 403 dönüyor.
   */
  console.log("\n④ TANIMLI OLMAYAN UÇLAR — BİLEREK (yazma yasağı çerçevesi)");
  console.log("   ⛔ stok/fiyat güncelleme  — YAZMA ucu, tanımlanmadı");
  console.log("   ⛔ paket statü güncelleme — YAZMA ucu, tanımlanmadı");
  console.log("   ⚠ buy-box / rakip fiyat  — OKUMA ucu, A3'te belgelendi,");
  console.log("     kapı kararı A'da (mimar+Halil), istemciye EKLENMEDİ");
  console.log("   ⚠ ürün/listeleme okuma   — eklenmedi");
  console.log("   ⛔ Bu liste ELLE tutuluyor; TY yeni uç yayımlarsa görünmez.");

  console.log("\n" + "=".repeat(94));
  console.log("  ÖZET");
  console.log("=".repeat(94));
  for (const [ad, ozet] of sonuclar) {
    console.log(`   ${ad.padEnd(14)} ${ozet}`);
  }
  console.log(`   deftere akan satış: ${apiden}/${toplam}`);
  console.log("\n   ⛔ 'BAĞLIYIZ' TEK CÜMLEYLE SÖYLENEMEZ: üç uç okunuyor,");
  console.log("      yazma ucu HİÇ tanımlı değil, ve içe aktarma ELLE");
  console.log("      koşuluyor — otomatik akış YOK.");
  console.log("=".repeat(94) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
