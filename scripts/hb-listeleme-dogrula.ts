import { readFileSync } from "node:fs";

import {
  hbAdedi,
  hbAnahtari,
  hbListelemeDurumu,
} from "../src/lib/kanal-listeleme-hb";
import { engelGrubu, satisaEngel } from "../src/lib/kanal-listeleme";

/**
 * ============================================================================
 *  HB LİSTELEME BEKÇİSİ (K184, 07.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run hb-listeleme:dogrula
 *
 *  ⭐ GÖVDE ÇAĞRILIR, DESEN ARANMAZ — çeviri saf: ağ yok, veritabanı yok.
 *  _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 *
 *  ⛔ VE ZİNCİRİN BAĞI AYRICA ÖLÇÜLÜR: çeviri tek başına doğru, panel kutusu
 *  tek başına doğru olup ARADAKİ BAĞ yanlış olabilir. HB'den çıkan durum
 *  `satisaEngel`/`engelGrubu` gövdelerine ne olarak giriyor — ayrı sınanır.
 * ============================================================================
 */

let hata = 0;
let gecen = 0;
const kosanBolumler: string[] = [];

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen++;
    console.log("  ✓ " + ad);
  } else {
    hata++;
    console.log("  ✗ " + ad);
  }
}

/** Ölçülen şekle birebir uyan bir listing. */
function ornek(ezme: Record<string, unknown> = {}) {
  return {
    isSalable: true,
    isSuspended: false,
    isLocked: false,
    isFrozen: false,
    availableStock: 5,
    hepsiburadaSku: "HBC00000ABCDE",
    ...ezme,
  };
}

// ═══ 1) ÇEVİRİ — HER DAL AYRI ═════════════════════════════════════════════
console.log("\n1) ÇEVİRİ");

kontrol(
  "satılabilir · stoklu → ACIK",
  hbListelemeDurumu(ornek()).durum === "ACIK",
);
kontrol(
  "stok 0 → STOKSUZ",
  hbListelemeDurumu(ornek({ availableStock: 0 })).durum === "STOKSUZ",
);
kontrol(
  "kilitli → PASIF",
  hbListelemeDurumu(ornek({ isLocked: true })).durum === "PASIF",
);
kontrol(
  "askıda → PASIF",
  hbListelemeDurumu(ornek({ isSuspended: true })).durum === "PASIF",
);
kontrol(
  "donuk → PASIF",
  hbListelemeDurumu(ornek({ isFrozen: true })).durum === "PASIF",
);

/**
 * ⛔ EN ÖNEMLİ ÖLÇÜT (219 canlı kayıt): rafta mal VAR, kilit YOK, ama HB
 * "satılamaz" diyor. `STOKSUZ` demek YALAN olurdu — raf boş değil.
 */
kontrol(
  "satılamaz · STOKLU · kilitsiz → PASIF (STOKSUZ DEĞİL)",
  hbListelemeDurumu(ornek({ isSalable: false })).durum === "PASIF",
);
kontrol(
  "…ve alt-izi 'satilamaz-kilitsiz' (kilitliden AYRILIR)",
  hbListelemeDurumu(ornek({ isSalable: false })).kaynak === "satilamaz-kilitsiz" &&
    hbListelemeDurumu(ornek({ isLocked: true })).kaynak === "kilitli",
);

/**
 * ⚠ EN KISITLAYICI KAZANIR: kilitli VE stoksuz bir kayıt STOKSUZ değil
 * PASIF'tir — yapılacak iş kilidi açmaktır, stok bildirmek değil.
 */
kontrol(
  "kilitli + stoksuz → PASIF (en kısıtlayıcı kazanır)",
  hbListelemeDurumu(ornek({ isLocked: true, availableStock: 0 })).durum === "PASIF",
);
kosanBolumler.push("çeviri");

// ═══ 2) BİLİNMEYEN SIFIRA ÇEVRİLMEZ ═══════════════════════════════════════
console.log("\n2) BİLİNMEYEN");

kontrol(
  "adet alanı YOKSA → BILINMIYOR (STOKSUZ değil)",
  hbListelemeDurumu({ isSalable: false }).durum === "BILINMIYOR",
);
kontrol(
  "adet dize gelirse → BILINMIYOR",
  hbListelemeDurumu(ornek({ availableStock: "5" })).durum === "BILINMIYOR",
);
/**
 * ⛔ VE BU KAPI SATILABİLİRLİK KAPISINDAN ÖNCE: adedi bilmeden "stoksuz mu,
 * kapatılmış mı" ayrımı yapılamaz.
 */
kontrol(
  "adet okunamazsa satılabilir olsa BİLE BILINMIYOR",
  hbListelemeDurumu({ isSalable: true }).durum === "BILINMIYOR",
);
kontrol("hbAdedi sayı olmayanda null", hbAdedi("3") === null && hbAdedi(3) === 3);
kontrol("hbAdedi NaN'ı null sayar", hbAdedi(Number.NaN) === null);

/**
 * ⛔ ONAY DURUMU ÜRETİLEMEZ — uç vermiyor. Gövde hiçbir girdide
 * `ONAY_BEKLIYOR` dönmemeli; dönseydi uydurma bir hüküm olurdu.
 */
kontrol(
  "hiçbir girdi ONAY_BEKLIYOR üretmez (uç onay bilgisi vermiyor)",
  [
    ornek(),
    ornek({ isSalable: false }),
    ornek({ isLocked: true }),
    ornek({ availableStock: 0 }),
    {},
  ].every((l) => hbListelemeDurumu(l).durum !== "ONAY_BEKLIYOR"),
);
kosanBolumler.push("bilinmeyen");

// ═══ 3) ANAHTAR — hepsiburadaSku ══════════════════════════════════════════
console.log("\n3) ANAHTAR");

kontrol("anahtar hepsiburadaSku'dan", hbAnahtari(ornek()) === "HBC00000ABCDE");
kontrol("boşluklar kırpılır", hbAnahtari({ hepsiburadaSku: "  X  " }) === "X");
kontrol("alan yoksa boş dize", hbAnahtari({}) === "");
/**
 * ⛔ merchantSku ANAHTAR OLAMAZ — canlıda 68 çakışma ölçüldü. Gövde onu
 * OKUMAMALI; okusaydı yarın biri "yedek anahtar" diye bağlardı.
 */
kontrol(
  "merchantSku anahtar olarak KULLANILMAZ",
  hbAnahtari({ merchantSku: "BIZIM-KOD" } as never) === "",
);
kosanBolumler.push("anahtar");

// ═══ 4) ZİNCİR — panel kutusuna ne olarak giriyor ═════════════════════════
console.log("\n4) ZİNCİR — panel gövdeleri ÇAĞRILARAK");

kontrol(
  "ACIK satışa ENGEL DEĞİL",
  !satisaEngel(hbListelemeDurumu(ornek()).durum),
);
kontrol(
  "satılamaz-stoklu PASIF → satışa ENGEL",
  satisaEngel(hbListelemeDurumu(ornek({ isSalable: false })).durum),
);
/**
 * ⛔ BILINMIYOR ENGEL SAYILMAZ VE AÇIK DA SAYILMAZ — ölçülmemiş kayıt
 * hakkında hüküm yoktur.
 */
kontrol(
  "BILINMIYOR engel SAYILMAZ",
  !satisaEngel(hbListelemeDurumu({ isSalable: true }).durum),
);
kontrol(
  "PASIF kutuda 'PASIF' kovasına düşer",
  engelGrubu(hbListelemeDurumu(ornek({ isLocked: true })).durum) === "PASIF",
);
kontrol(
  "STOKSUZ kutuda 'STOK_KAPALI' kovasına düşer",
  engelGrubu(hbListelemeDurumu(ornek({ availableStock: 0 })).durum) ===
    "STOK_KAPALI",
);
kontrol(
  "BILINMIYOR hiçbir kovaya girmez",
  engelGrubu(hbListelemeDurumu({}).durum) === null,
);
kosanBolumler.push("zincir");

// ═══ 5) YAZICI — YALNIZ ÜÇ ALAN, KANALA YAZMA YOK ═════════════════════════
console.log("\n5) YAZICI");
{
  const kaynak = readFileSync("scripts/canli-hb-listeleme-yaz.ts", "utf8");
  const yorumsuz = kaynak
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

  /**
   * ⚠ ÖLÇÜT 07.09.2026'DA TAZELENDİ — KOD DEĞİL, YER DEĞİŞTİ.
   *
   * Yazma bloğu önce BETİKTEYDİ ve ölçüt orayı tarıyordu. `api:dogrula`
   * haklı olarak kırmızı yandı ("ölçüm betiği deftere yazmaz") ve gövde
   * TY kardeşi gibi `src/lib`e taşındı. Ölçüt SUSTURULMADI, yeni yerine
   * bağlandı — ve üstüne bir şart daha kondu: betiğin kendisi ARTIK
   * doğrudan yazamaz. _(Anayasa: "bekçinin kırmızısı her zaman kod yanlış
   * demez; eskiyen ölçüt güncellenir, SUSTURULMAZ".)_
   */
  const yaziciKaynak = readFileSync("src/lib/kanal-listeleme-hb-yaz.ts", "utf8");
  const yaziciYorumsuz = yaziciKaynak
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  const i = yaziciYorumsuz.indexOf("channelSku.update(");
  const blok = i < 0 ? "" : yaziciYorumsuz.slice(i, i + 400);
  kontrol("TABAN DOLU — yazma bloğu bulundu", blok !== "");
  /** ⛔ YENİ ŞART: betik kendi başına deftere YAZAMAZ. */
  kontrol(
    "betik doğrudan prisma YAZMIYOR (gövde src/lib'te)",
    !/prisma\.\w+\.(update|create|upsert|delete)/.test(yorumsuz),
  );
  /**
   * ⛔ ÜÇ ALAN — FAZLASI YOK. Fiyat/komisyon/ad başka kaynaklardan geliyor;
   * buradan yazılsaydı iki kaynak aynı alana yazar ve biri ötekini ezerdi.
   */
  for (const alan of ["listelemeDurumu", "kanalAdet", "kanalOlcumAt"]) {
    kontrol(`yazma bloğu ${alan} yazıyor`, blok.includes(alan + ":"));
  }
  for (const yasak of ["price", "commissionRate", "channelSku:", "variantId"]) {
    kontrol(`yazma bloğu ${yasak} YAZMIYOR`, !blok.includes(yasak));
  }
  /** ⛔ KANALA YAZMA YOK: istemcide POST/PUT metodu tanımlı bile değil. */
  kontrol(
    "betik kanala yazma ucu ÇAĞIRMIYOR",
    !/apiPost|apiPut|method:\s*"(POST|PUT|PATCH)"/.test(yorumsuz),
  );
  /** ⛔ VARSAYILAN KURU: bayraksız koşum yazmamalı. */
  kontrol(
    "varsayılan KURU (--uygula olmadan yazmaz)",
    /const UYGULA = process\.argv\.includes\("--uygula"\)/.test(yorumsuz) &&
      /if \(!UYGULA\)/.test(yorumsuz),
  );
}
kosanBolumler.push("yazıcı");

const BOLUM_SAYISI = 5;
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `\nKOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})\n`,
  );
  process.exit(1);
}
console.log(
  "\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    " (" + gecen + "/" + (gecen + hata) + ")\n",
);
process.exit(hata === 0 ? 0 : 1);
