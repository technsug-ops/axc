/**
 * ============================================================================
 *  K136a — 8 İADENİN YAZIM PLANI · SALT OKUMA · ONAY KAPISI
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:iade-yazim-plani
 *
 *  BETIK SINIFI: TEK_SEFERLIK — yazımdan ÖNCEKİ son kapı.
 *  ⛔ HİÇBİR ŞEY YAZMAZ; yazma bayrağı YOKTUR.
 *
 *  ── NE YAPAR ────────────────────────────────────────────────────────────
 *  Halil 02.09.2026'da eksik iki girdiyi verdi: iade SEBEBİ ve iade TARİHİ.
 *  Bu betik yazılacak her satırı olduğu gibi basar ve ÜÇ ŞEYİ SINAR:
 *
 *    ① TARİH TUTARLILIĞI — iade tarihi satıştan sonra, bugünden önce mi
 *    ② SAYIM İLİŞKİSİ    — iade 27.08 sayımından ÖNCEYE yazılıyor;
 *                          anayasa gereği bu SESSİZCE yapılamaz
 *    ③ ⭐ ÇAPRAZ KANIT   — iade adedi, sayımın bulduğu FAZLAYI açıklıyor mu
 *
 *  ── ⭐ ③ NİYE EN ÖNEMLİSİ ───────────────────────────────────────────────
 *  Halil'in tarihleri BEYANDIR ve beyan tek başına bir kaynaktır. Ama
 *  sayım BAĞIMSIZ bir kaynaktır: 27.08'de raf fiilen sayıldı ve sistemin
 *  bilmediği mal bulundu. İki kaynak birbirini doğruluyorsa beyan
 *  KANITLANMIŞ olur.
 *
 *    sayılan − sistem(sayım günü) == iade adedi   → iade fazlayı AÇIKLIYOR
 *
 *  ⚠ VE BU GÖZLEM RAKİP OKUMAYI ELİYOR MU: fazla mal eksik girilmiş bir
 *  alımdan da gelebilirdi. Ama fark TAM olarak iade adedine eşitse ve
 *  sistem o varyantta SIFIR sanıyorsa, alım açıklaması ayrıca bir alım
 *  kaydının yokluğunu gerektirir. Eşitlik tutmuyorsa betik bunu YAZAR ve
 *  hüküm vermez.
 *  _(Anayasa: "iki okumayla da uyumlu bir gözlem, hiçbirini kanıtlamaz".)_
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

import {
  iadeEtkisiHesapla,
  komisyonToplami,
  satisCikisMaliyeti,
} from "../src/lib/iade";
import { gunSonu } from "../src/lib/stok";

/** ⭐ VERİ AYRI MODÜLDE — yan etkisiz; iki betik AYNI listeyi okur. */
import { PLAN, TUR_TURETMESI, notMetni } from "./k136a-plan";

/** Ekstrede iadeyi işaret eden kodlar. */
const IADE_DESENI = /IADE/;

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function gun(d: Date | null): string {
  return d === null ? "—" : d.toISOString().slice(0, 10);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  K136a — YAZIM PLANI · SALT OKUMA · ONAY KAPISI");
  console.log("=".repeat(78));

  const sayimlar = await prisma.stokSayimi.findMany({
    select: { kod: true, sayimGunu: true },
    orderBy: { sayimGunu: "desc" },
  });
  const sonSayim = sayimlar[0] ?? null;
  console.log(
    `\n  son fiziksel sayım: ${
      sonSayim ? `${sonSayim.kod} · ${gun(sonSayim.sayimGunu)}` : "YOK"
    }`,
  );

  const ekstre = await prisma.settlementItem.findMany({
    where: { orderNo: { in: PLAN.map((p) => p.siparis) } },
    select: { code: true, orderNo: true, amount: true },
  });

  const satislar = await prisma.sale.findMany({
    where: { code: { in: PLAN.map((p) => p.siparis) } },
    include: {
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: {
        include: {
          fees: true,
          variant: { include: { product: { select: { name: true } } } },
          stockMovements: {
            select: { quantityDelta: true, unitCostAmount: true },
          },
        },
      },
      fees: { where: { saleItemId: null } },
    },
  });

  let net2Toplam = 0;
  let ekstreToplam = 0;
  let tarihKusuru = 0;
  let aciklayan = 0;
  let aciklamayan = 0;
  let olculemez = 0;

  for (const p of PLAN) {
    const s = satislar.find((x) => x.code === p.siparis);
    console.log("\n" + "-".repeat(78));
    if (!s) {
      console.log(`  ${p.siparis}  ⛔ DEFTERDE SATIŞ YOK — plandan ÇIKAR`);
      tarihKusuru += 1;
      continue;
    }

    const iadeAni = new Date(`${p.tarih}T12:00:00.000Z`);
    console.log(
      `  ${p.siparis}  ·  ${s.channelAccount.channel.name}` +
        `  ·  satış ${gun(s.soldAt)}  →  iade ${p.tarih}`,
    );
    /** ⭐ YAZILACAK NOT — BİREBİR, kırpılmadan. */
    console.log(`     note = ${notMetni(p)}`);

    /** ⭐ TÜR TÜRETMESİ — hangi ekstre kodu ne söylüyor. */
    const bukodlar = ekstre
      .filter((k) => k.orderNo === p.siparis && IADE_DESENI.test(k.code))
      .map((k) => k.code);
    const konusanlar = TUR_TURETMESI.filter((t) => bukodlar.includes(t.kod));
    for (const t of konusanlar) {
      console.log(`     tür ← ${t.kod.padEnd(16)} → ${t.varsa}   (${t.gerekce})`);
    }
    if (konusanlar.length === 0) {
      console.log(
        "     ⛔ TÜR TÜRETİLEMEDİ — hiçbir bilinen kod yok; yazım DURUR.",
      );
      tarihKusuru += 1;
    }
    console.log("     tür: NORMAL  ·  sağlam adet: TAMAMI (hasar iddiası yok)");

    /** ① TARİH TUTARLILIĞI. */
    const satistanSonra = iadeAni.getTime() > s.soldAt.getTime();
    const bugundenOnce = iadeAni.getTime() < Date.now();
    if (!satistanSonra || !bugundenOnce) {
      console.log(
        `     ⛔ TARİH TUTARSIZ: satış ${gun(s.soldAt)}` +
          (satistanSonra ? "" : " — iade satıştan ÖNCE") +
          (bugundenOnce ? "" : " — iade GELECEKTE"),
      );
      tarihKusuru += 1;
    } else {
      const kacGun = Math.round(
        (iadeAni.getTime() - s.soldAt.getTime()) / 86400000,
      );
      console.log(`     ✓ tarih tutarlı — satıştan ${kacGun} gün sonra`);
    }

    /** ② SAYIM İLİŞKİSİ — anayasa gereği sessizce yazılamaz. */
    if (sonSayim && iadeAni.getTime() < gunSonu(sonSayim.sayimGunu).getTime()) {
      console.log(
        `     ⚠ SAYIMDAN ÖNCEYE YAZILIYOR (${gun(sonSayim.sayimGunu)}).` +
          " Stoğu ARTIRAN geç kayıt sayılmış rafı DÜŞÜRMEZ; sayımın 'fazla'" +
          " dediği rakamı haklı çıkarabilir.",
      );
    }

    /** ③ ⭐ ÇAPRAZ KANIT — fazla açıklanıyor mu. */
    for (const it of s.items) {
      const satir = await prisma.stokSayimSatiri.findFirst({
        where: {
          variantId: it.variantId,
          sayilanAdet: { not: null },
        },
        select: {
          sayilanAdet: true,
          kapsamdaydi: true,
          duzeltmeYazildiAt: true,
          sayim: { select: { kod: true, sayimGunu: true } },
        },
        orderBy: { sayim: { sayimGunu: "desc" } },
      });

      if (satir === null) {
        console.log(
          `     ⚠ ${it.variant.sku}: varyant hiç sayılmamış → çapraz kanıt` +
            " ÖLÇÜLEMEZ ('yoktu' demek DEĞİL)",
        );
        olculemez += 1;
        continue;
      }

      /** Sayım günü sonuna kadarki ledger toplamı — sistemin o günkü aklı. */
      const hareketler = await prisma.stockMovement.aggregate({
        where: {
          variantId: it.variantId,
          occurredAt: { lte: gunSonu(satir.sayim.sayimGunu) },
        },
        _sum: { quantityDelta: true },
      });
      const sistem = hareketler._sum.quantityDelta ?? 0;
      const sayilan = satir.sayilanAdet ?? 0;
      const fazla = sayilan - sistem;

      console.log(
        `     ⭐ ÇAPRAZ (${it.variant.sku}) ${satir.sayim.kod}:` +
          ` sayılan ${sayilan} − sistem ${sistem} = fazla ${fazla}` +
          `  ·  iade adedi ${it.quantity}` +
          (satir.kapsamdaydi ? "" : "  [kapsam DIŞI]"),
      );
      if (satir.duzeltmeYazildiAt !== null) {
        console.log(
          `        ⛔ DÜZELTME YAZILMIŞ ${gun(satir.duzeltmeYazildiAt)} —` +
            " fazla ledger'a girmiş; `soundQuantity` ÇİFT SAYAR.",
        );
        aciklamayan += 1;
      } else if (fazla === it.quantity) {
        console.log(
          "        ✓✓ FAZLA TAM OLARAK İADE ADEDİNE EŞİT — Halil'in beyanı" +
            " BAĞIMSIZ kaynakla (fiziksel sayım) doğrulandı.",
        );
        aciklayan += 1;
      } else if (fazla > 0) {
        console.log(
          `        ⚠ fazla var (${fazla}) ama iade adedine (${it.quantity})` +
            " EŞİT DEĞİL — iade fazlanın bir KISMINI açıklıyor olabilir." +
            " Beyan çürütülmedi ama doğrulanmadı da.",
        );
        aciklamayan += 1;
      } else {
        console.log(
          `        ⚠ fazla YOK (${fazla}) — sayım bu malı görmemiş.` +
            " Beyanla çelişmiyor (mal sonra satılmış olabilir) ama" +
            " çapraz kanıt da vermiyor.",
        );
        aciklamayan += 1;
      }
    }

    /** ── YAZILACAK RAKAM ─────────────────────────────────────────────── */
    const iadeKalem = ekstre.filter(
      (k) => k.orderNo === p.siparis && IADE_DESENI.test(k.code),
    );
    const ekstreTutar = iadeKalem.reduce(
      (t, k) => t + Math.abs(Number(k.amount.toString())),
      0,
    );
    ekstreToplam += ekstreTutar;

    const kargoIade = iadeKalem.find((k) => k.code === "KARGO_IADE");
    const kargo = kargoIade
      ? Math.abs(Number(kargoIade.amount.toString()))
      : null;

    const odemeGideri = s.fees
      .filter((f) => f.code === "ODEME_GIDERI")
      .reduce((t, f) => t + Number(f.amount.toString()), 0);
    const siparisToplami = s.items.reduce(
      (t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity,
      0,
    );

    const sonuc = iadeEtkisiHesapla({
      returnType: "NORMAL",
      kalemler: s.items.map((it) => ({
        satilanAdet: it.quantity,
        iadeAdedi: it.quantity,
        /** ⭐ HASAR İDDİASI YOK → mal sağlam döndü. */
        saglamAdet: it.quantity,
        satisTutari: Number(it.unitPriceAmount.toString()) * it.quantity,
        maliyet: satisCikisMaliyeti(it.stockMovements),
        kdvOrani: it.vatRate ? Number(it.vatRate.toString()) : 20,
        komisyon: komisyonToplami(it.fees),
        degisimMaliyeti: null,
      })),
      odemeGideri,
      siparisToplami,
      iadeKargosu: kargo,
      yenidenGonderimKargosu: null,
      ceza: null,
    });
    net2Toplam += sonuc.net2Etkisi;

    console.log(
      `     YAZILACAK — ekstre ${para(ekstreTutar)}` +
        `  ·  dönüş kargosu ${kargo === null ? "—" : para(kargo)}` +
        `  ·  NET-2 etkisi ${para(sonuc.net2Etkisi)}  (${sonuc.durum})`,
    );
    console.log(
      `        satış NET-2 ${
        s.net2Amount === null ? "—" : para(Number(s.net2Amount.toString()))
      } → iade sonrası ${para(
        (s.net2Amount === null ? 0 : Number(s.net2Amount.toString())) +
          sonuc.net2Etkisi,
      )}`,
    );
    console.log(
      "        stok: " +
        s.items
          .map((it) => `${it.variant.sku} RETURN_IN +${it.quantity}`)
          .join(" · "),
    );
  }

  console.log("\n" + "=".repeat(78));
  console.log("  ÖZET");
  console.log("=".repeat(78));
  console.log(`   sipariş                      : ${PLAN.length}`);
  console.log(`   ekstre iade toplamı          : ${para(ekstreToplam)}`);
  console.log(`   NET-2 toplam etki            : ${para(net2Toplam)}`);
  console.log(`   ⛔ tarih kusuru / satışı yok  : ${tarihKusuru}`);
  console.log("");
  console.log("   ÇAPRAZ KANIT (BİRİM: SATIŞ KALEMİ)");
  console.log(`   ✓✓ fazla = iade adedi (beyan DOĞRULANDI) : ${aciklayan}`);
  console.log(`   ⚠  fazla eşleşmedi (doğrulanmadı)        : ${aciklamayan}`);
  console.log(`   ⚠  varyant hiç sayılmamış (ölçülemez)    : ${olculemez}`);

  console.log("\n" + "-".repeat(78));
  console.log("  ⛔ YAZIM YOK. Bu betik hiçbir şey yazmaz. Yazım ancak Halil");
  console.log("     bu planı GÖRÜP onayladıktan sonra, ayrı bir betikle:");
  console.log("     anlık görüntü → tek işlem → satır satır AuditLog →");
  console.log("     değişmezlik turu (iade dışı rakamlar bit-bit sabit).");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
