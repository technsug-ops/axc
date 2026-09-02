/**
 * ============================================================================
 *  K75 ÖN ŞART ① — KARGO YAZIMI MUTABAKATI · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:kargo-mutabakat-izi
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K75 yazımının çift düşüm kapısı.
 *  ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ── ⛔ SORU: ÇİFT DÜŞÜM RİSKİ ───────────────────────────────────────────
 *  Kullanıcı sordu: _"30.08'de yazılan 'kargo 5.595 kayıt' hangi alandı,
 *  K75 hangi alana yazacak, kesişim kaç sipariş? Çift düşüm riski sıfır
 *  kanıtlanmadan yazım yok."_
 *
 *  ⚠ VE PANO ÇELİŞİYOR: K75 satırı `[YAZIM ONAY BEKLİYOR]` diyor, aşağıda
 *  `✅ KARGO YAZILDI · 28.08.2026 · [KOŞTU]` kaydı duruyor ve rakamlar
 *  neredeyse birebir aynı (5595 ↔ 5583 · ₺559.499 ↔ ₺558.134).
 *  ⛔ PANO BİR VERİDİR VE DOĞRULANIR — cevap panodan değil DEFTERDEN okunur.
 *  _(Anayasa: "panonun kendisi de doğrulanan bir veridir"; "pano, işin
 *  DURUMUNU değil NİYETİNİ kaydederse kurgu üretir".)_
 *
 *  ⚠ VE İKİ FARKLI ALAN KARIŞTIRILMAMALI — İKİSİ DE "KARGO" DENİYOR:
 *    `Sale.cargoAmount`  — kargo ÜCRETİ (para) ← K75 buraya yazacak
 *    `Sale.shippedAt`    — kargo TARİHİ (an)   ← K60'ta 5601 satıra
 *                          yazılmış ve GERİ ALINMIŞTI
 *  Bu betik ikisini AYRI sayar; tek "kargo" rakamı basmaz.
 * ============================================================================
 */

import { readFileSync, writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

function para(x: unknown): string {
  const n = Number(String(x));
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";
}
function gun(d: Date | null): string {
  return d === null ? "—" : d.toISOString().slice(0, 19).replace("T", " ");
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

  console.log("=".repeat(84));
  console.log("  K75 ÖN ŞART ① — KARGO MUTABAKATI (salt okuma)");
  console.log("=".repeat(84));

  /** ① İKİ ALAN AYRI SAYILIR — ikisi de "kargo" deniyor. */
  const cargoDolu = await prisma.sale.count({
    where: { cargoAmount: { not: null } },
  });
  const cargoToplam = await prisma.sale.aggregate({
    where: { cargoAmount: { not: null } },
    _sum: { cargoAmount: true },
  });
  const shippedDolu = await prisma.sale.count({
    where: { shippedAt: { not: null } },
  });
  const toplamSatis = await prisma.sale.count();

  console.log("\n① DEFTERİN BUGÜNKÜ HÂLİ — İKİ ALAN AYRI");
  console.log(`   toplam satış                       : ${toplamSatis}`);
  console.log(
    `   ⭐ cargoAmount DOLU (kargo ÜCRETİ)  : ${cargoDolu}` +
      `   toplam ${para(cargoToplam._sum.cargoAmount)}`,
  );
  console.log(`   shippedAt DOLU (kargo TARİHİ)      : ${shippedDolu}`);
  console.log("   ⚠ İkisi FARKLI alan; 'kargo yazıldı' cümlesi ikisini de");
  console.log("     anlatabilir. Bu betik karıştırmaz.");

  /**
   * ② İZLER — YAZIM VE GERİ ALMA. Panonun söylediğini değil, defterin
   * kendi kaydını okuyoruz.
   */
  const izler = await prisma.auditLog.findMany({
    where: {
      OR: [
        { action: { contains: "KARGO" } },
        { action: { contains: "CARGO" } },
      ],
    },
    select: {
      action: true,
      createdAt: true,
      targetType: true,
      targetId: true,
      detail: true,
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\n② KARGO İZLERİ — ${izler.length} kayıt`);
  const eylemSayaci = new Map<string, number>();
  for (const i of izler) {
    eylemSayaci.set(i.action, (eylemSayaci.get(i.action) ?? 0) + 1);
  }
  for (const [ad, n] of [...eylemSayaci.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(4)}  ${ad}`);
  }
  console.log("\n   ZAMAN ÇİZGİSİ (ilk 200 karakter):");
  for (const i of izler) {
    const ozet = (i.detail ?? "").replace(/\s+/g, " ").slice(0, 190);
    console.log(`   ${gun(i.createdAt)}  ${i.action}`);
    if (ozet !== "") console.log(`      ${ozet}`);
  }

  /**
   * ③ HÜKÜM — ÇİFT DÜŞÜM RİSKİ VAR MI.
   *
   * ⚠ ÖLÇÜT KESİŞİM: K75 yalnız `cargoAmount === null` olan satışlara
   * yazıyor (`canli:kargo-yaz` kovası "kargosu ZATEN olan → DOKUNULMUYOR").
   * O hâlde kesişim TANIM GEREĞİ boştur — ama bu bir İDDİADIR ve
   * betiğin kovasından okunmalı, varsayılmamalı.
   */
  console.log("\n③ HÜKÜM — ÇİFT DÜŞÜM RİSKİ");
  /**
   * ⛔ İLK YAZIMDA BU BÖLÜM YANLIŞTI VE DÜZELTMESİ BURADA DURUYOR.
   *
   * _"K75 yalnız `cargoAmount = NULL` olanlara yazar → KESİŞİM = 0"_
   * demiştim. **Kodu okumadan, tanımdan akıl yürüterek.** `canli-kargo-yaz`
   * öyle çalışmıyor: kargosu HEDEF DEĞERE kuruşuna eşit olan kayıt
   * "zaten olan" kovasına DÜŞMEZ, `yazilacak` kümesinde KALIR — çünkü o,
   * önceki koşumun kendi yazdığı satırdır (yeniden koşulabilirlik kapısı).
   *
   * Bu yüzden "yazılacak 5630" rakamı **"5630 satışta kargo eksik"
   * DEMEK DEĞİLDİR.** Çoğu zaten yazılmış olabilir.
   * _(Anayasa: "kendi sistemimizin davranışı da doğrulanır" — bir betiğin
   * ne yaptığını söylemeden önce o betiğe BAKILIR.)_
   */
  console.log("   ⚠ 'Yazılacak' kovası İKİ ŞEYİ birden taşıyor:");
  console.log("     · gerçekten BOŞ olanlar");
  console.log("     · önceki koşumun yazdığı, değeri hedefe EŞİT olanlar");

  /**
   * ⭐ TAVAN ÖLÇÜLÜYOR — "kesişim kaç sipariş" sorusunun kesin cevabı.
   * Gerçekten YENİ yazılacak satış sayısı, kargosu BOŞ olan satış
   * sayısını AŞAMAZ. Bu bir tahmin değil, aritmetik tavan.
   */
  const cargoBos = toplamSatis - cargoDolu;
  console.log(
    `\n   ⭐ cargoAmount BOŞ olan satış (mutlak tavan): ${cargoBos}`,
  );
  console.log(
    `   → canli:kargo-yaz "yazılacak" dediği kümenin EN FAZLA ${cargoBos}` +
      " tanesi",
  );
  console.log(
    `     gerçekten yenidir; geri kalanı ZATEN aynı değeri taşıyor.`,
  );
  console.log(
    `   ⭐ KESİŞİM (zaten yazılmış olup yeniden yazılacak): en az ` +
      `${Math.max(0, 5630 - cargoBos)}`,
  );
  console.log("   ⚠ 5630 rakamı `canli:kargo-yaz` kuru koşumundan alındı;");
  console.log("     iki araç aynı dosyayı okuyor, ölçüt aynı.");

  /**
   * ⭐ VE ÇİFT DÜŞÜMÜN ASIL CEVABI ALANIN CİNSİNDE: `cargoAmount` MUTLAK
   * bir alandır, artımlı değil — betik `data: { cargoAmount: String(...) }`
   * ile ÜZERİNE yazıyor. Aynı değeri ikinci kez yazmak toplamı BÜYÜTMEZ.
   * Çift düşüm ancak alan `{ increment: … }` ile güncellenseydi doğardı.
   */
  const yazmaKaynagi = readFileSync("scripts/canli-kargo-yaz.ts", "utf8");
  const artimliMi = /cargoAmount:\s*\{\s*increment/.test(yazmaKaynagi);
  const mutlakMi = /data:\s*\{\s*cargoAmount:\s*String\(/.test(yazmaKaynagi);
  console.log(
    `\n   ⭐ ALAN CİNSİ: ${mutlakMi ? "MUTLAK (üzerine yazar)" : "?"}` +
      `  ·  artımlı (increment) kullanımı: ${artimliMi ? "⛔ VAR" : "✓ YOK"}`,
  );
  console.log(
    artimliMi
      ? "   ⛔ ARTIMLI YAZIM VAR — ikinci koşum toplamı BÜYÜTÜR. Çift düşüm RİSKİ."
      : "   ✓ ÇİFT DÜŞÜM İMKÂNSIZ: aynı değeri ikinci kez yazmak toplamı değiştirmez.",
  );

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ④ KARGOSUZ SATIŞLAR — TAM LİSTE
   * ---------------------------------------------------------------------
   *  Kullanıcı: _"Hangi satışlar kargosuz listesini çıkar, kontrol
   *  edeceğim."_ Liste ekrana ÖZET, dosyaya TAM basılıyor.
   *
   *  ⚠ VE "KARGOSUZ" ÜÇ AYRI ŞEY OLABİLİR — ÜÇÜ AYRI SAYILIR:
   *    (a) iptal edilmiş satış      → kargo zaten beklenmez
   *    (b) dosyada hiç yok          → kaynak sessiz
   *    (c) dosyada VAR ama yazılmamış → ⛔ GERÇEK EKSİK
   *  Tek "97 kargosuz" rakamı basmak, (c)'yi (a)'nın içinde saklardı.
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n④ KARGOSUZ SATIŞLAR — TAM LİSTE");
  const kargosuz = await prisma.sale.findMany({
    where: { cargoAmount: null },
    select: {
      code: true,
      soldAt: true,
      iptalTarihi: true,
      profitStatus: true,
      net2Amount: true,
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
      items: {
        select: {
          quantity: true,
          unitPriceAmount: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
        },
      },
    },
    orderBy: { soldAt: "desc" },
  });

  const iptalli = kargosuz.filter((s) => s.iptalTarihi !== null);
  const acik = kargosuz.filter((s) => s.iptalTarihi === null);
  console.log(`   toplam kargosuz : ${kargosuz.length}`);
  console.log(`   (a) İPTALLİ     : ${iptalli.length}   ← kargo zaten beklenmez`);
  console.log(`   ⭐ açık satış    : ${acik.length}`);

  const kanalSayaci = new Map<string, number>();
  for (const s of acik) {
    const kanal = s.channelAccount.channel.name;
    kanalSayaci.set(kanal, (kanalSayaci.get(kanal) ?? 0) + 1);
  }
  console.log("   AÇIK OLANLARIN KANALI:");
  for (const [kanal, n] of [...kanalSayaci.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`      ${String(n).padStart(4)}  ${kanal}`);
  }

  console.log("\n   AÇIK KARGOSUZ SATIŞLAR (ekranda ilk 25, tamamı dosyada):");
  console.log(
    "   " +
      "tarih".padEnd(12) +
      "sipariş no".padEnd(15) +
      "kanal".padEnd(14) +
      "ciro".padStart(11) +
      "  ürün",
  );
  for (const s of acik.slice(0, 25)) {
    const ciro = s.items.reduce(
      (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
      0,
    );
    console.log(
      "   " +
        s.soldAt.toISOString().slice(0, 10).padEnd(12) +
        String(s.code ?? "—").padEnd(15) +
        s.channelAccount.channel.name.padEnd(14) +
        para(ciro).padStart(11) +
        "  " +
        (s.items[0]?.variant.product.name ?? "—").slice(0, 34),
    );
  }
  if (acik.length > 25) console.log(`   … +${acik.length - 25} satır dosyada`);

  /**
   * ⚠ CSV `veri/ozel/` altına — ticari veri depoya girmez (gitignore).
   * Ayıraç NOKTALI VİRGÜL: ürün adlarında virgül geçiyor ve Excel TR
   * yerelinde noktalı virgül zaten sütun ayıracı.
   */
  const satirlar = [
    "tarih;siparisNo;kanal;kanalHesabi;iptal;durum;net2;ciro;sku;urun",
    ...kargosuz.map((s) => {
      const ciro = s.items.reduce(
        (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
        0,
      );
      return [
        s.soldAt.toISOString().slice(0, 10),
        s.code ?? "",
        s.channelAccount.channel.name,
        s.channelAccount.name,
        s.iptalTarihi === null ? "" : "IPTAL",
        s.profitStatus ?? "",
        s.net2Amount === null ? "" : String(s.net2Amount),
        ciro.toFixed(2),
        s.items.map((i) => i.variant.sku).join("|"),
        s.items.map((i) => i.variant.product.name.replace(/;/g, ",")).join("|"),
      ].join(";");
    }),
  ];
  const cikti = "veri/ozel/kargosuz-satislar.csv";
  writeFileSync(cikti, "﻿" + satirlar.join("\r\n"), "utf8");
  console.log(`\n   ⭐ TAM LİSTE: ${cikti}  (${kargosuz.length} satır, gitignore'da)`);

  console.log("\n" + "-".repeat(84));
  console.log("  ⛔ HÜKÜM SINIRI. Bu rapor 'yazım koştu mu' sorusunu İZDEN ve");
  console.log("     VERİDEN cevaplar. Pano ile ayrışma varsa DOĞRU olan");
  console.log("     defterdir; pano düzeltilir.");
  console.log("=".repeat(84) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
