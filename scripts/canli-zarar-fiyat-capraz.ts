/**
 * ============================================================================
 *  ZARARDAKİ SATIŞLARIN FİYATI DOĞRU MU — KANALIN KENDİ KAYDIYLA ÇAPRAZ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:zarar-fiyat-capraz
 *
 *  BETIK SINIFI: SUREKLI — soru tekrarladıkça koşulur. SALT OKUMA.
 *
 *  ── ⛔ SORU ─────────────────────────────────────────────────────────────
 *  Kullanıcı: _"iadenin olmadığı ürünlerde bu kadar zarar yapmak anlamsız.
 *  Bir hesap hatası var."_
 *
 *  ⭐ HESAP TARAFI ZATEN ÖLÇÜLDÜ VE TUTUYOR (`canli:satis-neden-zarar`,
 *  `11428632368`): ciro − maliyet − kesinti = defterdeki NET-1, fark 0,00.
 *  Yani aritmetik doğru. Geriye İKİ rakip okuma kalıyor:
 *
 *    (A) fiyat DOĞRU  → zarar gerçek (maliyetin altına satılmış)
 *    (B) fiyat YANLIŞ → deftere eksik/yanlış fiyat girmiş, zarar sahte
 *
 *  ⛔ İKİSİ DE AYNI EKRANI ÜRETİR. Ayırt edici kanıt bizde değil,
 *  **KANALIN KENDİ ÖDEME KAYDINDA** (`SettlementItem.SIPARIS_TUTARI`).
 *  _(Anayasa: "kaynak önceliği — kanalın kendi belgesi en üstte";
 *  "iki okumayla da uyumlu bir gözlem hiçbirini kanıtlamaz".)_
 *
 *  ⚠ VE "EŞLEŞME YOK" HÜKÜM DEĞİL: ekstre siparişi taşımıyorsa fiyat
 *  ÖLÇÜLEMEZ — "doğru" da denmez, "yanlış" da.
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
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

  console.log("=".repeat(92));
  console.log("  ZARARDAKİ SATIŞLAR — FİYAT KANALIN KAYDIYLA ÇAPRAZLANIYOR");
  console.log("=".repeat(92));

  const zararlilar = await prisma.sale.findMany({
    where: {
      iptalTarihi: null,
      profitStatus: "CALCULATED",
      net2Amount: { lt: 0 },
    },
    select: {
      code: true,
      soldAt: true,
      net2Amount: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: {
        select: {
          quantity: true,
          unitPriceAmount: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
          stockMovements: {
            select: { quantityDelta: true, unitCostAmount: true },
          },
        },
      },
      returns: { select: { id: true } },
      /** ⭐ Komisyon ÇAPRAZIN TABANI — ekstre onu düşmüş hâlde veriyor. */
      fees: { select: { code: true, amount: true } },

    },
    orderBy: { soldAt: "desc" },
  });
  console.log(`\n  zararda görünen açık satış: ${zararlilar.length}`);

  /** ⚠ İadesi OLAN satış ayrı — kullanıcının sorusu iadesizler hakkında. */
  const iadesiz = zararlilar.filter((s) => s.returns.length === 0);
  console.log(`  ⭐ İADESİZ zarar : ${iadesiz.length}`);
  console.log(`  iadeli zarar    : ${zararlilar.length - iadesiz.length}`);

  /** ── kanalın kendi kaydı ────────────────────────────────────────────── */
  const kodlar = iadesiz.map((s) => s.code ?? "").filter((x) => x !== "");
  const ekstre = await prisma.settlementItem.findMany({
    where: { orderNo: { in: kodlar }, code: "SIPARIS_TUTARI" },
    select: { orderNo: true, amount: true },
  });
  const kanalTutar = new Map<string, number>();
  for (const e of ekstre) {
    if (!e.orderNo) continue;
    kanalTutar.set(
      e.orderNo,
      (kanalTutar.get(e.orderNo) ?? 0) + Number(e.amount.toString()),
    );
  }
  console.log(`  ekstrede SIPARIS_TUTARI bulunan: ${kanalTutar.size}/${iadesiz.length}`);

  /**
   * ① MALİYETİN ALTINA SATIŞ — ZARARIN KAYNAĞI FİYAT MI, KESİNTİ Mİ?
   *
   * ⚠ İKİSİ FARKLI İŞ: fiyat maliyetin ALTINDAYSA zarar satış kararından
   * gelir (kampanya, indirim); fiyat maliyetin ÜSTÜNDE ama NET eksiyse
   * zarar KESİNTİLERDEN gelir. Tek "zarar" rakamı ikisini karıştırır.
   */
  let maliyetAlti = 0;
  let kesintiKaynakli = 0;
  let maliyetsiz = 0;
  let maliyetAltiToplam = 0;
  for (const s of iadesiz) {
    const ciro = s.items.reduce(
      (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
      0,
    );
    const mal = s.items.reduce(
      (t, i) =>
        t +
        i.stockMovements.reduce(
          (u, h) =>
            u +
            (h.unitCostAmount === null
              ? 0
              : Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta)),
          0,
        ),
      0,
    );
    if (mal === 0) maliyetsiz += 1;
    else if (ciro < mal) {
      maliyetAlti += 1;
      maliyetAltiToplam += mal - ciro;
    } else kesintiKaynakli += 1;
  }
  console.log("\n① ZARARIN KAYNAĞI — İKİ AYRI İŞ");
  console.log(
    `   ⛔ FİYAT MALİYETİN ALTINDA : ${maliyetAlti}` +
      `   toplam açık ₺${para(maliyetAltiToplam)}`,
  );
  console.log(`   ⚠ fiyat üstünde, KESİNTİ yiyor : ${kesintiKaynakli}`);
  console.log(`   ⚠ maliyeti ₺0 (ölçülemez)      : ${maliyetsiz}`);

  /**
   * ② FİYAT ÇAPRAZI — KANAL NE DİYOR?
   *
   * ⛔ İLK YAZIMDA TABANI YANLIŞ VARSAYDIM VE DÜZELTMESİ BURADA DURUYOR.
   *
   * Yorumda _"taban aynı"_ YAZDIM ama ÖLÇMEDİM. Sonuç: 30 siparişin
   * 30'u da "SAPAN" çıktı ve hepsinde kanal BİZDEN DÜŞÜK — sistematik bir
   * sapma, yani tipik bir TABAN hatası imzası.
   *
   * ⭐ AYIRT EDİCİ KANIT TEK SATIRDA GÖRÜLDÜ: `11428632368` farkı −91,80
   * ve o satışın KOMİSYONU da tam **91,80**. Anayasa bunu zaten yazıyor:
   * _"11373352181 · price 2074 → SIPARIS_TUTARI 1897,71 = 2074 − 176,29"_
   * — yani `SIPARIS_TUTARI` **komisyon DÜŞÜLMÜŞ** tutardır, brüt değil.
   *
   * Doğru kıyas: `bizim ciro − komisyon`  ↔  `SIPARIS_TUTARI`
   * _(Anayasa: "kontrol tasarımı, veri kapsamı doğrulanmadan FARK
   * üretmez"; "kolon başlığı bir iddiadır".)_
   */
  console.log("\n② FİYAT ÇAPRAZI — (ciro − komisyon) ↔ kanalın SIPARIS_TUTARI");
  let tutan = 0;
  let sapan = 0;
  let olculemeyen = 0;
  const sapanlar: string[] = [];
  const satirlar = [
    "siparisNo;tarih;kanal;bizimCiro;kanalTutar;fark;maliyet;net2;urun",
  ];
  for (const s of iadesiz) {
    const kod = s.code ?? "";
    const ciro = s.items.reduce(
      (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
      0,
    );
    const mal = s.items.reduce(
      (t, i) =>
        t +
        i.stockMovements.reduce(
          (u, h) =>
            u +
            (h.unitCostAmount === null
              ? 0
              : Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta)),
          0,
        ),
      0,
    );
    const kanal = kanalTutar.get(kod);
    /**
     * ⭐ TABAN DÜZELTİLDİ: ekstre komisyonu DÜŞMÜŞ tutar veriyor.
     * Kıyas `ciro − komisyon` ile kurulur; ham ciroyla kurulsaydı her
     * satır komisyon kadar "sapan" görünürdü (ve ilk koşumda öyle oldu).
     */
    const komisyon = s.fees
      .filter((f) => f.code === "KOMISYON")
      .reduce((t, f) => t + Math.abs(Number(f.amount.toString())), 0);
    const bizimNet = ciro - komisyon;
    let durum = "OLCULEMEZ";
    if (kanal === undefined) olculemeyen += 1;
    else if (Math.abs(kanal - bizimNet) < 0.02) {
      tutan += 1;
      durum = "TUTUYOR";
    } else {
      sapan += 1;
      durum = "SAPAN";
      if (sapanlar.length < 15) {
        sapanlar.push(
          `${kod} ciro ${para(ciro)} −kom ${para(komisyon)} = ${para(bizimNet)}` +
            ` · kanal ${para(kanal)} · fark ${para(kanal - bizimNet)}`,
        );
      }
    }
    satirlar.push(
      [
        kod,
        s.soldAt.toISOString().slice(0, 10),
        s.channelAccount.channel.name,
        ciro.toFixed(2),
        kanal === undefined ? "" : kanal.toFixed(2),
        kanal === undefined ? "" : (kanal - ciro).toFixed(2),
        mal.toFixed(2),
        s.net2Amount === null ? "" : String(s.net2Amount),
        (s.items[0]?.variant.product.name ?? "").replace(/;/g, ","),
      ].join(";"),
    );
    void durum;
  }
  console.log(`   ✓ TUTUYOR   : ${tutan}   ← fiyat DOĞRU, zarar GERÇEK`);
  console.log(`   ⛔ SAPAN     : ${sapan}   ← fiyat şüpheli`);
  console.log(
    `   ⚠ ÖLÇÜLEMEZ : ${olculemeyen}   ← ekstrede yok; 'doğru' da denmez`,
  );
  if (sapanlar.length > 0) {
    console.log("\n   SAPANLAR:");
    for (const x of sapanlar) console.log(`      ${x}`);
  }

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ③ ⭐ ASIL SORU: ZARARI KARGO MU YARATTI?
   * ---------------------------------------------------------------------
   *  Kullanıcının zaman çizgisi sezgisi: _"kargo kısmında API'den önce
   *  problem yoktu."_ 28.08'de 5595 satışa kargo yazıldı ve NET-2 toplam
   *  ₺557.418,72 düştü. O hâlde sınanacak şey şu:
   *
   *    Bu satışlar KARGO OLMASAYDI kârda mı olurdu?
   *
   *  ⭐ Motorun ölçülmüş kuralı: ΔNET-2 = −(kargo KDV HARİÇ). Yani
   *  kargosuz NET-2 = mevcut NET-2 + cargoAmount.
   *  ⚠ Bu bir GERİ ALMA ÖNERİSİ DEĞİL — kargo gerçek bir giderdir ve
   *  yazılması doğruydu. Ölçüm yalnız ZARARIN KAYNAĞINI ayırıyor.
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n③ ZARARI KARGO MU YARATTI (kargo eklenmeseydi kârda mıydı)");
  const kargolar = await prisma.sale.findMany({
    where: { code: { in: kodlar } },
    select: { code: true, cargoAmount: true },
  });
  const kargoHaric = new Map(
    kargolar.map((x) => [
      x.code ?? "",
      x.cargoAmount === null ? 0 : Number(x.cargoAmount.toString()),
    ]),
  );
  let kargoyaBagli = 0;
  let kargosuzDaZarar = 0;
  let kargoyaBagliTutar = 0;
  for (const s of iadesiz) {
    const n2 = s.net2Amount === null ? 0 : Number(s.net2Amount.toString());
    const k = kargoHaric.get(s.code ?? "") ?? 0;
    if (n2 + k > 0) {
      kargoyaBagli += 1;
      kargoyaBagliTutar += Math.abs(n2);
    } else kargosuzDaZarar += 1;
  }
  console.log(
    `   ⭐ KARGO OLMASA KÂRDA olurdu : ${kargoyaBagli}` +
      `   (zararı ₺${para(kargoyaBagliTutar)})`,
  );
  console.log(`   ⛔ kargosuz DA zararda        : ${kargosuzDaZarar}`);
  console.log(
    "   ⚠ Bu bir 'kargo yanlış' bulgusu DEĞİL — kargo gerçek bir gider.",
  );
  console.log("     Ölçüm yalnız zararın KAYNAĞINI ayırıyor.");

  const cikti = "veri/ozel/zarar-fiyat-capraz.csv";
  writeFileSync(cikti, "﻿" + satirlar.join("\r\n"), "utf8");
  console.log(`\n   ⭐ TAM LİSTE: ${cikti} (${satirlar.length - 1} satır)`);

  console.log("\n" + "-".repeat(92));
  console.log("  ⛔ HÜKÜM SINIRI. 'Ölçülemez' kovası bir sonuç DEĞİL: o");
  console.log("     siparişler için kanalın kaydı defterimizde yok ve fiyat");
  console.log("     bağımsız olarak doğrulanamıyor. Kapsam kapanmadan");
  console.log("     'fiyatlar doğru' denmez.");
  console.log("=".repeat(92) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
