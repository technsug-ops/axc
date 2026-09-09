import { readFileSync, readdirSync } from "node:fs";

import {
  hbKargoDamgasi,
  gecmistenKargoDamgasi,
  damgaGunHassasiyetli,
  teslimGuncellemesi,
  teslimYazimiVarMi,
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

/* ═══ ②b TESLİM KARARI — SAF GÖVDE, DEĞER TESTİ (K195-2) ═══════════════ */
/**
 * ⭐ DESEN ARANMIYOR, GÖVDE ÇAĞRILIYOR. Karar TY ve N11'de aynı ve iki
 * dosyaya kopyalansaydı kaynak tarayan bir ölçüt iki farklı yazılışı tek
 * desenle kovalayamazdı. _(Anayasa: "saf hesap katmanı, desen tarayan
 * bekçiye muhtaç olmaz".)_
 */
console.log("\n  ── TESLİM KARARI (ezme yasağı + tazeleme)");
const BOS = { deliveredAt: null, kargoTakipBaglantisi: null, kanalKargoFirmasi: null };
const T1 = new Date(Date.UTC(2026, 8, 5));
const T2 = new Date(Date.UTC(2026, 8, 7));

kontrol(
  "BOŞ deliveredAt DOLAR",
  teslimGuncellemesi(BOS, {
    teslimAni: T1,
    takipBaglantisi: null,
    kargoFirmasi: null,
  }).deliveredAt?.getTime() === T1.getTime(),
);
/**
 * ⛔ EN KRİTİK ÖLÇÜT — K60'IN TESLİM TARAFI. Dolu bir damga elle girilmiş
 * olabilir; kanalın daha yeni bir tarih söylemesi onu EZMEZ.
 * ⚠ ÖRNEK AYRIMI GÖSTERİYOR: kanalın damgası mevcuttan DAHA YENİ (T2 > T1).
 * Aynı tarih verilseydi "ezmedi" sonucu tesadüf olurdu — ezen bir gövde de
 * aynı değeri yazardı ve test yeşil kalırdı.
 */
kontrol(
  "DOLU deliveredAt EZİLMEZ (kanal daha yeni tarih söylese bile)",
  teslimGuncellemesi(
    { ...BOS, deliveredAt: T1 },
    { teslimAni: T2, takipBaglantisi: null, kargoFirmasi: null },
  ).deliveredAt === undefined,
);
kontrol(
  "kanal teslim demediyse yazılmaz",
  teslimGuncellemesi(BOS, {
    teslimAni: null,
    takipBaglantisi: null,
    kargoFirmasi: null,
  }).deliveredAt === undefined,
);
kontrol(
  "takip bağlantısı BOŞTAN dolar",
  teslimGuncellemesi(BOS, {
    teslimAni: null,
    takipBaglantisi: "https://ty/1",
    kargoFirmasi: null,
  }).kargoTakipBaglantisi === "https://ty/1",
);
/** ⚠ TAKİP/FİRMA TAZELENİR — `deliveredAt`ten FARKLI kural, bilerek. */
kontrol(
  "takip bağlantısı DEĞİŞTİYSE tazelenir (kanalın son beyanı)",
  teslimGuncellemesi(
    { ...BOS, kargoTakipBaglantisi: "https://ty/1" },
    { teslimAni: null, takipBaglantisi: "https://ty/2", kargoFirmasi: null },
  ).kargoTakipBaglantisi === "https://ty/2",
);
kontrol(
  "AYNI takip bağlantısı yeniden YAZILMAZ (boş gidiş-dönüş yok)",
  teslimGuncellemesi(
    { ...BOS, kargoTakipBaglantisi: "https://ty/1" },
    { teslimAni: null, takipBaglantisi: "https://ty/1", kargoFirmasi: null },
  ).kargoTakipBaglantisi === undefined,
);
/**
 * ⛔ SUSMAK "YOK" DEMEK DEĞİLDİR: kanal bu turda bağlantı vermediyse
 * elimizdeki bilgi SİLİNMEZ. Bunu ölçen ayrı bir test şart — üstteki
 * "değiştiyse tazele" ölçütü `null` dalını hiç çalıştırmıyor.
 */
kontrol(
  "kanal SUSTUYSA dolu takip bağlantısı SİLİNMEZ",
  teslimGuncellemesi(
    { ...BOS, kargoTakipBaglantisi: "https://ty/1", kanalKargoFirmasi: "Aras" },
    { teslimAni: null, takipBaglantisi: null, kargoFirmasi: null },
  ).kargoTakipBaglantisi === undefined,
);
kontrol(
  "kargo firması DEĞİŞTİYSE tazelenir, AYNIYSA yazılmaz",
  teslimGuncellemesi({ ...BOS, kanalKargoFirmasi: "Aras" }, {
    teslimAni: null,
    takipBaglantisi: null,
    kargoFirmasi: "Yurtiçi",
  }).kanalKargoFirmasi === "Yurtiçi" &&
    teslimGuncellemesi({ ...BOS, kanalKargoFirmasi: "Aras" }, {
      teslimAni: null,
      takipBaglantisi: null,
      kargoFirmasi: "Aras",
    }).kanalKargoFirmasi === undefined,
);
kontrol(
  "yazacak bir şey yoksa BOŞ döner (çağıran sorgu açmaz)",
  !teslimYazimiVarMi(
    teslimGuncellemesi(BOS, {
      teslimAni: null,
      takipBaglantisi: null,
      kargoFirmasi: null,
    }),
  ),
);
kontrol(
  "Delivered damgası geçmişten çözülür (en geç olan)",
  (() => {
    const d = gecmistenKargoDamgasi(
      [
        { createdDate: AN, status: "Delivered" },
        { createdDate: AN + 7200_000, status: "Delivered" },
        { createdDate: AN + 9000_000, status: "Shipped" },
      ],
      "Delivered",
    );
    return d.tur === "AN" && d.an.getTime() === AN + 7200_000;
  })(),
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
  .map((a) => "scripts/" + a);
const KAYNAKLAR = new Map(ICE_AKTARMALAR.map((y) => [y, readFileSync(y, "utf8")]));

/**
 * ⭐ İKİ ALAN, TEK DÖNGÜ (K195-2). Kargo ve teslim damgası AYNI yasağa tabi;
 * ikisini iki ayrı blokla yazmak, yarın birine eklenen bir kuralı ötekinde
 * unutmanın en kısa yoluydu.
 */
/**
 * ⛔ "GEÇİYOR" DEĞİL "ATANIYOR" — ÖLÇÜT KULLANIMA BAĞLANIR.
 *
 * `deliveredAt: true` bir SELECT satırıdır, `deliveredAt: null` bir WHERE
 * koşuludur; ikisi de alanı YAZMAZ. Sadece "dosyada geçiyor mu" diye
 * bakılsaydı taban doluluğu ölçütü, hiçbir şey yazmayan bir dosyayı da
 * "yazan" sayardı ve mutasyon kaçardı.
 * _(Anayasa: "ölçüt kullanıma bağlanır — ada ya da dizeye değil".)_
 */
function atamaSatirlari(metin: string, alan: string): string[] {
  const hariç = new RegExp(alan + ":" + "\\s*(true|null)" + "\\b");
  return metin
    .split("\n")
    .filter((l) => l.includes(alan + ":") && !l.trim().startsWith("*"))
    .filter((l) => !hariç.test(l));
}

for (const alan of ["shippedAt", "deliveredAt"] as const) {
  const yazanlar = ICE_AKTARMALAR.filter(
    (y) => atamaSatirlari(KAYNAKLAR.get(y)!, alan).length > 0,
  );
  /**
   * ⚠ TABAN DOLULUĞU: boş liste her ölçütü sessizce geçirir. Üç kanal
   * (TY · HB · N11) bu alanları yazıyor; azalırsa bir bağ kopmuş demektir.
   */
  kontrol(alan + " yazan içe aktarma bulundu (taban DOLU)", yazanlar.length >= 3, yazanlar);
  for (const yol of yazanlar) {
    const metin = KAYNAKLAR.get(yol)!;
    const ad = yol.split("/").pop();
    const satirlar = atamaSatirlari(metin, alan);
    kontrol(ad + " — " + alan + " ataması VAR", satirlar.length > 0, satirlar.length);
    const uydurma = satirlar.filter(
      (l) => l.includes("new Date()") || l.includes("Date.now()"),
    );
    kontrol(ad + " — " + alan + "'e UYDURMA tarih yazılmıyor", uydurma.length === 0, uydurma);
    /**
     * ⛔ VE YAZIM YALNIZ BOŞ ALANA: `updateMany` koşulunda `<alan>: null`
     * olmazsa dolu bir damga ezilir — "ezme YOK" ilkesi sözde kalırdı.
     */
    const yazim = "data: { " + alan + ": damga }";
    if (metin.includes(yazim)) {
      const i = metin.indexOf(yazim);
      const pencere = metin.slice(Math.max(0, i - 260), i);
      kontrol(
        ad + " — " + alan + " yalnız NULL olana yazılıyor",
        pencere.includes(alan + ": null"),
      );
    }
  }
}

/**
 * ⛔ ORTAK GÖVDE ÇAĞRILMAYA DEVAM EDİYOR MU — DESEN YASAĞI (K195-2).
 *
 * Teslim kararı `teslimGuncellemesi` içinde ve DEĞER testleriyle korunuyor.
 * Ama biri o çağrıyı söküp mantığı yeniden satır içine yazarsa değer
 * testleri hâlâ YEŞİL yanar — gövde doğru çalışmaya devam eder, yalnız
 * onu kimse çağırmaz. _(Anayasa: "tur 98/98 yeşildi ve panelde kutu YOKTU":
 * bütün ölçütler saf gövdeyi sınıyordu ve gövdeleri kimse çağırmıyordu.)_
 *
 * ⚠ LİSTE ELLE TUTULMUYOR: çağıranlar taranarak bulunuyor. Dördüncü kanal
 * eklenirse taban kendiliğinden büyür; kimsenin listeye eklemesi gerekmez.
 */
const govdeyiCagiranlar = ICE_AKTARMALAR.filter((y) =>
  KAYNAKLAR.get(y)!.includes("teslimGuncellemesi("),
);
kontrol(
  "teslim kararı ORTAK GÖVDEDEN okunuyor (satır içine kopyalanmamış)",
  govdeyiCagiranlar.length >= 2,
  govdeyiCagiranlar,
);

console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    ` (${gecen}/${gecen + hata})\n`,
);
process.exit(hata === 0 ? 0 : 1);
