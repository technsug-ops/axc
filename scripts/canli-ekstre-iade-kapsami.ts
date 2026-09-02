/**
 * ============================================================================
 *  EKSTRE YOLU KAPSAM ÖLÇÜMÜ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:ekstre-iade-kapsami
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K73'te seçilen "ekstre yolu"nun kapsamını
 *  ölçer. HİÇBİR ŞEY YAZMAZ; yazma bayrağı yoktur.
 *
 *  ── SORDUĞU SORU ────────────────────────────────────────────────────────
 *  K73'te (28.08.2026) Halil karar verdi: iade içe aktarma **ekstre yolundan**
 *  yapılacak, çünkü ekstre türü ÖLÇÜLEBİLİR kılıyor (`KARGO` ↔ `KARGO_IADE`
 *  ayrı kodlar) ve uydurma gerekmiyor.
 *
 *  ⛔ AMA O KARAR ALINIRKEN KAPSAM ÖLÇÜLMEDİ: elimizdeki ekstre, açık olan
 *  233 siparişin KAÇINI görüyor? Görmüyorsa yol doğru ama YETMEZ.
 *  _(Anayasa: "kural doğru mu değil, TESLİM EDİLEBİLİR Mİ" — seçilen yolun
 *  sistemde karşılığı olup olmadığı ayrıca sınanır.)_
 *
 *  ⚠ VE SIFIR ÜÇ FARKLI ŞEY OLABİLİR, ÜÇÜ AYRI SAYILIR:
 *    (a) sipariş ekstrede HİÇ yok
 *    (b) ekstrede var ama iade kodu YOK
 *    (c) iade kodu var → ekstre yolu bu siparişi KAPSIYOR
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/** Ekstrede iadeyi işaret eden kodlar — şemadan değil VERİDEN türetiliyor. */
const IADE_DESENI = /IADE/;

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
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(76));
  console.log("  EKSTRE YOLU — KAPSAM ÖLÇÜMÜ (salt okuma)");
  console.log("=".repeat(76));

  /** ① Ekstrede iade kodu taşıyan sipariş numaraları. */
  const kalemler = await prisma.settlementItem.findMany({
    select: { code: true, orderNo: true, amount: true },
  });
  const iadeKodlari = new Map<string, number>();
  const iadeliSiparis = new Set<string>();
  const ekstredekiSiparis = new Set<string>();
  for (const k of kalemler) {
    if (k.orderNo) ekstredekiSiparis.add(k.orderNo);
    if (!IADE_DESENI.test(k.code)) continue;
    iadeKodlari.set(k.code, (iadeKodlari.get(k.code) ?? 0) + 1);
    if (k.orderNo) iadeliSiparis.add(k.orderNo);
  }

  console.log("\n① EKSTREDEKİ İADE KODLARI");
  if (iadeKodlari.size === 0) {
    console.log("   ⛔ HİÇ İADE KODU YOK — ekstre yolu bugün BOŞ.");
  }
  for (const [k, n] of [...iadeKodlari.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${k.padEnd(26)} ${String(n).padStart(5)} kalem`);
  }
  console.log(`\n   iade kodu taşıyan FARKLI sipariş : ${iadeliSiparis.size}`);
  console.log(`   ekstrede geçen TOPLAM sipariş     : ${ekstredekiSiparis.size}`);

  /**
   * ② AÇIK SİPARİŞLER — ekstre onları görüyor mu?
   *
   * "Açık" tanımı `canli-iade-acigi.ts` ile AYNI olmak zorunda; ikisi
   * ayrışırsa iki rapor aynı soruya iki cevap verir. Burada aynı ölçüt
   * kullanılıyor: satış VAR, iptal DEĞİL, sistemde iade kaydı YOK.
   */
  const iadeKayitli = new Set<string>(
    [
      ...(await prisma.return.findMany({
        select: { sale: { select: { code: true } } },
      })),
      ...(await prisma.returnNotice.findMany({
        select: { sale: { select: { code: true } } },
      })),
    ]
      .map((x) => x.sale?.code ?? "")
      .filter((x) => x !== ""),
  );

  console.log("\n② KAPSAMA — sıfır ÜÇ ayrı şey");
  console.log(
    "   ⚠ 'Açık' kümesi Excel listesinden geliyor ve bu betik o dosyayı",
  );
  console.log("     OKUMUYOR; kapsama ekstre ↔ SATIŞ defteri üzerinden ölçülüyor.");

  const satislar = await prisma.sale.findMany({
    where: { iptalTarihi: null },
    select: { code: true },
  });
  const defterKodlari = new Set(
    satislar.map((s) => s.code ?? "").filter((x) => x !== ""),
  );

  const a = [...iadeliSiparis].filter((x) => !defterKodlari.has(x));
  const c = [...iadeliSiparis].filter(
    (x) => defterKodlari.has(x) && !iadeKayitli.has(x),
  );
  const zaten = [...iadeliSiparis].filter((x) => iadeKayitli.has(x));

  console.log(
    `\n   (a) ekstrede iade var ama DEFTERDE SATIŞ YOK : ${a.length}`,
  );
  console.log(`   (b) zaten sistemde iade kaydı VAR           : ${zaten.length}`);
  console.log(
    `   ⭐ (c) YAZILABİLİR — satış var, iade kaydı yok : ${c.length}`,
  );
  if (c.length > 0) {
    console.log(`      örnek: ${c.slice(0, 8).join(" · ")}`);
  }

  /** ③ Tutar — ekstre ne kadarını görüyor. */
  const tutar = kalemler
    .filter((k) => IADE_DESENI.test(k.code) && k.orderNo && c.includes(k.orderNo))
    .reduce((t, k) => t + Math.abs(Number(k.amount.toString())), 0);
  console.log(`\n③ YAZILABİLİR KÜMENİN EKSTREDEKİ TUTARI: ${para(tutar)}`);

  /**
   * ④ YAZILABİLİR KÜMENİN TAM DÖKÜMÜ — YAZIMDAN ÖNCE GÖZLE GÖRÜLSÜN.
   *
   * Kullanıcı 02.09.2026: _"bunların listesini ver, sağlam gidelim."_
   * Toplu yazımın onay kapısı budur: satır satır ne yazılacağı, hangi
   * kaynaktan geldiği ve neyin BİLİNMEDİĞİ görünür olmadan yazım yapılmaz.
   */
  if (c.length > 0) {
    console.log("\n" + "=".repeat(76));
    console.log("  ④ YAZILABİLİR 8 SİPARİŞ — TAM DÖKÜM");
    console.log("=".repeat(76));

    const detaylar = await prisma.sale.findMany({
      where: { code: { in: c } },
      select: {
        code: true,
        soldAt: true,
        profitStatus: true,
        net2Amount: true,
        channelAccount: { select: { channel: { select: { name: true } } } },
        items: {
          select: {
            quantity: true,
            unitPriceAmount: true,
            variant: {
              select: { sku: true, product: { select: { name: true } } },
            },
          },
        },
      },
    });

    for (const s of detaylar) {
      const kod = s.code ?? "—";
      const kalemleri = kalemler.filter((k) => k.orderNo === kod);
      const iadeKalem = kalemleri.filter((k) => IADE_DESENI.test(k.code));
      const ciro = s.items.reduce(
        (t, x) => t + Number(x.unitPriceAmount.toString()) * x.quantity,
        0,
      );
      console.log("\n" + "-".repeat(76));
      console.log(
        `  ${kod}  ·  ${s.channelAccount.channel.name}  ·  ` +
          `${s.soldAt.toISOString().slice(0, 10)}`,
      );
      for (const it of s.items) {
        console.log(
          `     ${it.variant.sku.padEnd(16)} ${it.quantity} adet  ` +
            `${para(Number(it.unitPriceAmount.toString()))}  ` +
            it.variant.product.name.slice(0, 34),
        );
      }
      console.log(
        `     satış cirosu ${para(ciro)}  ·  NET-2 ` +
          (s.net2Amount === null
            ? "—"
            : para(Number(s.net2Amount.toString()))) +
          `  ·  durum ${s.profitStatus ?? "—"}`,
      );
      console.log("     EKSTREDEKİ İADE KALEMLERİ:");
      for (const k of iadeKalem) {
        console.log(
          `       ${k.code.padEnd(24)} ${para(Number(k.amount.toString()))}`,
        );
      }
      const oteki = kalemleri.filter((k) => !IADE_DESENI.test(k.code));
      if (oteki.length > 0) {
        console.log(
          "     (aynı siparişin öteki kalemleri: " +
            oteki.map((k) => k.code).join(" · ") +
            ")",
        );
      }
    }

    console.log("\n" + "-".repeat(76));
    console.log("  ⛔ BU DÖKÜMDE OLMAYAN İKİ ŞEY — VE YAZIM ONLARSIZ YAPILAMAZ:");
    console.log("     · iade SEBEBİ (`ReturnReason`) — zorunlu enum");
    console.log("     · iade TÜRÜ (NORMAL / UNDELIVERED / DISPUTED)");
    console.log("     Ekstre bunları TAŞIMIYOR ve ikisi de UYDURULAMAZ:");
    console.log("     tür, kargo maliyetini DEĞİŞTİRİR (iade-sureci §5).");
  }

  console.log("\n" + "-".repeat(76));
  console.log("  ⛔ HÜKÜM YOK. Bu rapor ekstre yolunun BUGÜNKÜ kapsamını");
  console.log("     söyler; yolun doğru olup olmadığını değil. Kapsam darsa");
  console.log("     yol yanlış değil, VERİ eksik demektir — ikisi ayrı iştir.");
  console.log("=".repeat(76) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
