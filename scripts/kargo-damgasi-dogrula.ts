import { readFileSync, readdirSync } from "node:fs";

import {
  hbKargoDamgasi,
  gecmistenKargoDamgasi,
  damgaGunHassasiyetli,
} from "../src/lib/kanal-kargo-damgasi";

/**
 * ============================================================================
 *  KARGO DAMGASI BEKÇİSİ (K195, 09.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kargo-damgasi:dogrula
 *
 *  İki taahhüdü ölçer:
 *    ① KANALIN SÖYLEDİĞİ ATILMAZ — gövde damgayı doğru çıkarır
 *    ② SİSTEMİN BİLMEDİĞİ DEĞER YAZILMAZ — içe aktarmalar `shippedAt`e
 *      uydurma bir tarih basamaz (K60'ta 5601 siparişe bugünün tarihi
 *      basılmıştı ve geri alınmak zorunda kalındı)
 *
 *  ⭐ ÖLÇÜTLER GÖVDEYİ ÇAĞIRIR: `kanal-kargo-damgasi.ts` saf ve ağa
 *  çıkmıyor. _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç
 *  olmaz".)_
 * ============================================================================
 */

let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, ipucu?: unknown) {
  if (kosul) {
    gecen++;
    console.log("  OK    " + ad);
  } else {
    hata++;
    console.log("  HATA  " + ad);
    if (ipucu !== undefined) console.log("        ", ipucu);
  }
}

console.log("\nKARGO DAMGASI BEKÇİSİ (K195)\n");

/* ═══ ① TY — EPOCH MS, BELİRSİZLİK YOK ═══════════════════════════════ */
console.log("  ── PAKET GEÇMİŞİ — TY ve N11 (epoch ms)");
const AN = 1788858128720; // 2026-09-08T09:02:08.720Z
kontrol(
  "Shipped damgası bulunur ve AN türünde",
  (() => {
    const d = gecmistenKargoDamgasi([{ createdDate: AN, status: "Shipped" }], "Shipped");
    return d.tur === "AN" && d.an.getTime() === AN;
  })(),
);
kontrol(
  "istenmeyen durum sayılmaz (Delivered arayınca Shipped dönmez)",
  gecmistenKargoDamgasi([{ createdDate: AN, status: "Shipped" }], "Delivered").tur === "YOK",
);
/**
 * ⚠ EN GEÇ DAMGA KAZANIR — ve örnek AYRIMI GÖSTERİYOR: iki `Shipped`
 * kaydı var ve ikisi FARKLI zamanda. İlkini alan bir gövde de "AN" derdi;
 * ayrımı yalnız DEĞER ortaya çıkarır.
 */
kontrol(
  "iki Shipped varsa EN GEÇ olanı alınır",
  (() => {
    const d = gecmistenKargoDamgasi(
      [
        { createdDate: AN, status: "Shipped" },
        { createdDate: AN + 3600_000, status: "Shipped" },
      ],
      "Shipped",
    );
    return d.tur === "AN" && d.an.getTime() === AN + 3600_000;
  })(),
);
kontrol("geçmiş yoksa YOK", gecmistenKargoDamgasi(undefined, "Shipped").tur === "YOK");
kontrol(
  "bozuk createdDate sayılmaz (0 · metin · eksik)",
  gecmistenKargoDamgasi(
    [
      { createdDate: 0, status: "Shipped" },
      { createdDate: "dun", status: "Shipped" },
      { status: "Shipped" },
    ],
    "Shipped",
  ).tur === "YOK",
);

/* ═══ ② HB — DİLİMSİZ DİZE, YALNIZ GÜN ═══════════════════════════════ */
console.log("\n  ── HB (dilimsiz dize → GÜN)");
const HB = "2026-09-04T13:58:48";
kontrol(
  "damga GÜN türünde (saat iddia edilmiyor)",
  (() => {
    const d = hbKargoDamgasi(HB);
    return d.tur === "GUN" && damgaGunHassasiyetli(d);
  })(),
);
kontrol(
  "gün TÜRKİYE günü ve ortamdan BAĞIMSIZ",
  (() => {
    const d = hbKargoDamgasi(HB);
    return d.tur === "GUN" && d.an.getTime() === Date.UTC(2026, 8, 4);
  })(),
);

/**
 * ⛔ EN KRİTİK ÖLÇÜT — NAİF AYRIŞTIRMA GÜNÜ DE KAYDIRIR.
 *
 * `"2026-09-04T00:30:00"` Türkiye'de 4 Eylül'dür. `new Date()` bunu
 * geliştirme makinesinde (Europe/Berlin, +2) `2026-09-03T22:30Z` yapar —
 * yani UTC günü **3 Eylül**. Vercel'de (UTC) ise 4 Eylül kalır.
 * Yani naif yol yalnız SAATİ değil GÜNÜ de, ve KOŞTUĞU YERE GÖRE bozar.
 *
 * ⚠ ÖLÇÜT ORTAMA BAĞLI OLMAMALI: bu yüzden "naif sonuç farklı" diye
 * değil, "bizim sonucumuz dizenin GÜNÜ" diye yazıldı. Makine UTC'ye
 * taşınsa bile bu ölçüt aynı şeyi ölçer.
 */
const GECE = "2026-09-04T00:30:00";
kontrol(
  "gece yarısına yakın damgada da GÜN dizeden gelir (kayma yok)",
  (() => {
    const d = hbKargoDamgasi(GECE);
    return d.tur === "GUN" && d.an.getTime() === Date.UTC(2026, 8, 4);
  })(),
);
kontrol(
  "bozuk/eksik dize YOK döner",
  hbKargoDamgasi("").tur === "YOK" &&
    hbKargoDamgasi(null).tur === "YOK" &&
    hbKargoDamgasi("2026-13-45T00:00:00").tur === "YOK",
);

/* ═══ ③ İÇE AKTARMALAR UYDURMA TARİH YAZAMAZ ═════════════════════════ */
/**
 * ⛔ K60 VAKASI: `shippedAt`e "bugünün tarihi" basan toplu bir düğme 5601
 * siparişe sistemin BİLMEDİĞİ bir değer yazdı ve geri alınmak zorunda
 * kalındı. O yasak burada koşuyor.
 *
 * ⚠ DESEN KULLANIM SATIRINA BAĞLI: `shippedAt:` atamasının SAĞ TARAFI
 * ölçülüyor; dosyanın herhangi bir yerinde `new Date()` geçmesi (ki geçer)
 * ölçütü kırmızı yakmaz.
 */
console.log("\n  ── İÇE AKTARMALAR (uydurma tarih yasağı)");
/**
 * ⛔ LİSTE ELLE TUTULMUYOR — TARANARAK BULUNUYOR (K195 düzeltmesi).
 *
 * İlk yazımda TY ve HB elle yazılmıştı. Üçüncü kanal (N11) eklenince
 * ortaya çıktı ki elle liste **yeni içe aktarmayı hiç görmez** — N11
 * uydurma tarih yazsaydı bekçi yeşil kalırdı. Ölçüt artık şu: `shippedAt`
 * YAZAN her içe aktarma taranır.
 * _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur" —
 * ve bugün aynı ders `kanal-yazma:dogrula`da da alındı.)_
 */
const ICE_AKTARMALAR = readdirSync("scripts")
  .filter((a) => a.startsWith("canli-") && a.endsWith("-ice-aktar.ts"))
  .map((a) => "scripts/" + a)
  .filter((y) => readFileSync(y, "utf8").includes("shippedAt:"));
/**
 * ⚠ TABAN DOLULUĞU: boş liste her ölçütü sessizce geçirir. Üç kanal
 * (TY · HB · N11) `shippedAt` yazıyor; azalırsa bir bağ kopmuş demektir.
 */
kontrol(
  "shippedAt yazan içe aktarma bulundu (taban DOLU)",
  ICE_AKTARMALAR.length >= 3,
  ICE_AKTARMALAR,
);
for (const yol of ICE_AKTARMALAR) {
  const metin = readFileSync(yol, "utf8");
  const satirlar = metin
    .split("\n")
    .filter((l) => l.includes("shippedAt:") && !l.trim().startsWith("*"));
  kontrol(
    yol.split("/").pop() + " — shippedAt ataması VAR",
    satirlar.length > 0,
    satirlar.length,
  );
  const uydurma = satirlar.filter(
    (l) => l.includes("new Date()") || l.includes("Date.now()"),
  );
  kontrol(
    yol.split("/").pop() + " — shippedAt'e UYDURMA tarih yazılmıyor",
    uydurma.length === 0,
    uydurma,
  );
  /**
   * ⛔ VE YAZIM YALNIZ BOŞ ALANA: `updateMany` koşulunda `shippedAt: null`
   * olmazsa dolu bir damga ezilir — "ezme YOK" ilkesi sözde kalırdı.
   */
  if (metin.includes("data: { shippedAt: damga }")) {
    const i = metin.indexOf("data: { shippedAt: damga }");
    const pencere = metin.slice(Math.max(0, i - 260), i);
    kontrol(
      yol.split("/").pop() + " — damga yalnız shippedAt NULL olana yazılıyor",
      pencere.includes("shippedAt: null"),
    );
  }
}

console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    ` (${gecen}/${gecen + hata})\n`,
);
process.exit(hata === 0 ? 0 : 1);
