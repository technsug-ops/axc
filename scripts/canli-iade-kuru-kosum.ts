/**
 * ============================================================================
 *  K136a ② — 8 SİPARİŞİN KURU KOŞUMU · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:iade-kuru-kosum
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K136a'nın yazım öncesi onay kapısı.
 *  ⛔ HİÇBİR ŞEY YAZMAZ; yazma bayrağı YOKTUR.
 *
 *  ── NE YAPAR ────────────────────────────────────────────────────────────
 *  Kullanıcı şartnamesi 02.09.2026: "KURU KOŞUM: 8 satır sipariş sipariş —
 *  tutar, tür, NET etkisi, toplam 28.110,85 ile mutabakat."
 *
 *  ⭐ MOTORU TAKLİT ETMEZ, ÇAĞIRIR. Girdiyi kuran parçalar önizleme ve
 *  kayıt yolunun kullandığı gövdelerin AYNISI (`satisCikisMaliyeti`,
 *  `komisyonToplami`, `iadeEtkisiHesapla`). İkinci bir hesap yazılsaydı
 *  kuru koşum, yazımın yapacağı şeyi değil KENDİ yaptığını ölçerdi.
 *  _(Anayasa: "kendi kendini doğrulayan ölçüm ölçüm değildir".)_
 *
 *  ── ⛔ ÜÇ BİLİNMEYEN — VE İKİSİ PARA DEĞİŞTİRİYOR ──────────────────────
 *  Ekstre bunları TAŞIMIYOR. Bu yüzden betik tek bir rakam basmıyor;
 *  seçeneklerin YAYILIMINI basıyor. Kararın bedeli görünür olsun diye.
 *
 *    ① returnType    NORMAL ↔ UNDELIVERED  → dönüş kargosu gider mi
 *    ② soundQuantity 0 ↔ hepsi             → maliyet stoğa döner mi
 *    ③ ReturnReason  — `Return`da alan YOK; yalnız `ReturnNotice` de
 *                      yazılırsa sorun olur (K73 bu yüzden `Return`u seçti)
 *
 *  ⚠ ②'NİN VARSAYILANI NÖTR DEĞİL: `soundQuantity @default(0)` yazmak
 *  "hepsi hasarlı" demektir — maliyet satıcıda kalır ve NET düşer. Bir
 *  varsayılan gibi görünüyor ama bir İDDİADIR.
 *  _(Anayasa: "varsayılan değer, alanın anlamından türetilir — dilin
 *  kolayından değil".)_
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

/** K136a ölçümünün bulduğu yazılabilir küme — kimlikle sabit. */
const SIPARISLER = [
  "4068972350",
  "4287210000",
  "4446089356",
  "4586626981",
  "4903455009",
  "11385159467",
  "11409234590",
  "11438301199",
];

/** Kuru koşumun mutabakat hedefi (K136a kapsam ölçümü, 02.09.2026). */
const HEDEF_TUTAR = 28110.85;

const IADE_DESENI = /IADE/;

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Senaryo = { ad: string; tur: "NORMAL" | "UNDELIVERED"; saglam: boolean };

/**
 * Dört köşe — iki bilinmeyenin çarpımı. Ortası YOK: ara bir değer seçmek
 * ölçülmemiş bir varsayımı rakama çevirmek olurdu.
 */
const SENARYOLAR: Senaryo[] = [
  { ad: "NORMAL      · sağlam=hepsi", tur: "NORMAL", saglam: true },
  { ad: "NORMAL      · sağlam=0    ", tur: "NORMAL", saglam: false },
  { ad: "UNDELIVERED · sağlam=hepsi", tur: "UNDELIVERED", saglam: true },
  { ad: "UNDELIVERED · sağlam=0    ", tur: "UNDELIVERED", saglam: false },
];

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  K136a ② — KURU KOŞUM · 8 SİPARİŞ · SALT OKUMA");
  console.log("=".repeat(78));

  /** Ekstre tarafı — yazılacak tutarın KAYNAĞI. */
  const ekstre = await prisma.settlementItem.findMany({
    where: { orderNo: { in: SIPARISLER } },
    select: { code: true, orderNo: true, amount: true },
  });

  const satislar = await prisma.sale.findMany({
    where: { code: { in: SIPARISLER } },
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

  let ekstreToplami = 0;
  const yayilimlar: number[] = [];
  let netEksik = 0;

  for (const kod of SIPARISLER) {
    const s = satislar.find((x) => x.code === kod);
    const kalemleri = ekstre.filter((k) => k.orderNo === kod);
    const iadeKalem = kalemleri.filter((k) => IADE_DESENI.test(k.code));

    console.log("\n" + "-".repeat(78));
    if (!s) {
      console.log(`  ${kod}  ⛔ DEFTERDE SATIŞ YOK — kuru koşum yapılamaz`);
      continue;
    }
    console.log(
      `  ${kod}  ·  ${s.channelAccount.channel.name}  ·  ` +
        `satış ${s.soldAt.toISOString().slice(0, 10)}`,
    );

    /** ── EKSTRE TARAFI ─────────────────────────────────────────────── */
    let siparisIade = 0;
    console.log("     EKSTRE (yazılacak tutarın kaynağı):");
    for (const k of iadeKalem) {
      const t = Number(k.amount.toString());
      siparisIade += Math.abs(t);
      console.log(`       ${k.code.padEnd(22)} ${para(t).padStart(12)}`);
    }
    ekstreToplami += siparisIade;
    console.log(
      `       ${"= mutlak toplam".padEnd(22)} ${para(siparisIade).padStart(12)}`,
    );

    /** ── TÜR SİNYALİ ───────────────────────────────────────────────── */
    const kargoIade = iadeKalem.find((k) => k.code === "KARGO_IADE");
    const tutarIade = iadeKalem.find((k) => k.code === "IADE_TUTARI");
    if (kargoIade) {
      console.log(
        `     ⭐ TÜR SİNYALİ: KARGO_IADE ${para(
          Number(kargoIade.amount.toString()),
        )} → dönüş kargosu satıcıda → NORMAL`,
      );
    } else if (!tutarIade) {
      console.log(
        "     ⛔ AYKIRI: ne KARGO_IADE ne IADE_TUTARI var — BU BİR İADE" +
          " OLMAYABİLİR. Kısmi düzeltme olabilir; ölçülmeden yazılmaz.",
      );
    } else {
      console.log(
        "     ⛔ TÜR SİNYALİ YOK: ekstrede kargo satırı hiç geçmiyor." +
          " Tür türetilemez, BEYAN gerekir.",
      );
    }

    /** ── SATIŞ TARAFI ─────────────────────────────────────────────── */
    const odemeGideri = s.fees
      .filter((f) => f.code === "ODEME_GIDERI")
      .reduce((t, f) => t + Number(f.amount.toString()), 0);
    const siparisToplami = s.items.reduce(
      (t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity,
      0,
    );

    console.log("     SATIŞ KALEMLERİ:");
    let maliyetsiz = 0;
    for (const it of s.items) {
      const m = satisCikisMaliyeti(it.stockMovements);
      if (m === null) maliyetsiz += 1;
      console.log(
        `       ${it.variant.sku.padEnd(15)} ${it.quantity}×  ` +
          `fiyat ${para(Number(it.unitPriceAmount.toString())).padStart(10)}  ` +
          `maliyet ${(m === null ? "— YOK" : para(m)).padStart(10)}  ` +
          it.variant.product.name.slice(0, 26),
      );
    }
    console.log(
      `     satış NET-2 ${
        s.net2Amount === null ? "—" : para(Number(s.net2Amount.toString()))
      }  ·  durum ${s.profitStatus ?? "—"}` +
        (maliyetsiz > 0 ? `  ⚠ maliyetsiz kalem: ${maliyetsiz}` : ""),
    );

    /** ── DÖRT KÖŞE ─────────────────────────────────────────────────── */
    const kargo = kargoIade
      ? Math.abs(Number(kargoIade.amount.toString()))
      : null;
    console.log(
      "     NET-2 ETKİSİ — DÖRT KÖŞE (iki bilinmeyenin çarpımı)" +
        (kargo === null
          ? "  [dönüş kargosu: ekstrede YOK → 0 alındı]"
          : `  [dönüş kargosu ekstreden: ${para(kargo)}]`),
    );

    const netler: number[] = [];
    for (const sen of SENARYOLAR) {
      const sonuc = iadeEtkisiHesapla({
        returnType: sen.tur,
        kalemler: s.items.map((it) => ({
          satilanAdet: it.quantity,
          iadeAdedi: it.quantity,
          saglamAdet: sen.saglam ? it.quantity : 0,
          satisTutari: Number(it.unitPriceAmount.toString()) * it.quantity,
          maliyet: satisCikisMaliyeti(it.stockMovements),
          kdvOrani: it.vatRate ? Number(it.vatRate.toString()) : 20,
          komisyon: komisyonToplami(it.fees),
          degisimMaliyeti: null,
        })),
        odemeGideri,
        siparisToplami,
        /** NORMAL'de dönüş kargosu satıcıda; UNDELIVERED'da yok. */
        iadeKargosu: sen.tur === "NORMAL" ? kargo : null,
        yenidenGonderimKargosu: null,
        ceza: null,
      });
      netler.push(sonuc.net2Etkisi);
      console.log(
        `       ${sen.ad}   NET-2 etkisi ${para(sonuc.net2Etkisi).padStart(
          12,
        )}   (durum ${sonuc.durum})`,
      );
      if (sonuc.durum !== "CALCULATED") netEksik += 1;
    }
    const yayilim = Math.max(...netler) - Math.min(...netler);
    yayilimlar.push(yayilim);
    console.log(
      `     ⚠ KARARIN BEDELİ (en iyi − en kötü köşe): ${para(yayilim)}`,
    );
  }

  /** ── MUTABAKAT ──────────────────────────────────────────────────── */
  console.log("\n" + "=".repeat(78));
  console.log("  MUTABAKAT");
  console.log("=".repeat(78));
  console.log(`   ekstre iade kalemleri (mutlak) : ${para(ekstreToplami)}`);
  console.log(`   K136a kapsam raporundaki hedef : ${para(HEDEF_TUTAR)}`);
  const fark = ekstreToplami - HEDEF_TUTAR;
  console.log(`   fark                           : ${para(fark)}`);
  if (Math.abs(fark) < 0.005) {
    console.log("   ✓ KURUŞUNA TUTUYOR — kuru koşum kaynağıyla mutabık.");
  } else {
    console.log(
      "   ⛔ TUTMUYOR. İki rakam AYNI kümeyi saymıyor demektir;" +
        " yazımdan önce sebebi bulunmalı.",
    );
    process.exitCode = 1;
  }

  const toplamYayilim = yayilimlar.reduce((t, x) => t + x, 0);
  console.log("");
  console.log(
    `   ⛔ İKİ KARARIN TOPLAM BEDELİ (8 siparişte): ${para(toplamYayilim)}`,
  );
  console.log(
    "      Bu rakam 'ne kadar kaybederiz' DEĞİL; 'seçime göre defter" +
      " ne kadar farklı yazılır' demektir.",
  );
  if (netEksik > 0) {
    console.log(
      `   ⚠ ${netEksik} köşede durum CALCULATED değil — maliyeti olmayan` +
        " kalem var; o satırların NET'i EKSİK hesap taşır.",
    );
  }

  console.log("\n" + "-".repeat(78));
  console.log("  ⛔ YAZIM YOK. Bu betik hiçbir şey yazmaz ve yazma bayrağı");
  console.log("     taşımaz. Yazım ancak ① tür ② sağlam adet kararları");
  console.log("     verildikten VE Halil onayı geldikten sonra, ayrı bir");
  console.log("     betikle yapılır (anlık görüntü → yazım → satır satır iz).");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
