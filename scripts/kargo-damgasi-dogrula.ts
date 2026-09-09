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
const BOS = {
  deliveredAt: null,
  kargoTakipBaglantisi: null,
  kanalKargoFirmasi: null,
  kanalKargoDesi: null,
};
const T1 = new Date(Date.UTC(2026, 8, 5));
const T2 = new Date(Date.UTC(2026, 8, 7));

kontrol(
  "BOŞ deliveredAt DOLAR",
  teslimGuncellemesi(BOS, {
    teslimAni: T1,
    takipBaglantisi: null,
    kargoFirmasi: null,
    kanalDesi: null,
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
    { teslimAni: T2, takipBaglantisi: null, kargoFirmasi: null, kanalDesi: null },
  ).deliveredAt === undefined,
);
kontrol(
  "kanal teslim demediyse yazılmaz",
  teslimGuncellemesi(BOS, {
    teslimAni: null,
    takipBaglantisi: null,
    kargoFirmasi: null,
    kanalDesi: null,
  }).deliveredAt === undefined,
);
kontrol(
  "takip bağlantısı BOŞTAN dolar",
  teslimGuncellemesi(BOS, {
    teslimAni: null,
    takipBaglantisi: "https://ty/1",
    kargoFirmasi: null,
    kanalDesi: null,
  }).kargoTakipBaglantisi === "https://ty/1",
);
/** ⚠ TAKİP/FİRMA TAZELENİR — `deliveredAt`ten FARKLI kural, bilerek. */
kontrol(
  "takip bağlantısı DEĞİŞTİYSE tazelenir (kanalın son beyanı)",
  teslimGuncellemesi(
    { ...BOS, kargoTakipBaglantisi: "https://ty/1" },
    { teslimAni: null, takipBaglantisi: "https://ty/2", kargoFirmasi: null, kanalDesi: null },
  ).kargoTakipBaglantisi === "https://ty/2",
);
kontrol(
  "AYNI takip bağlantısı yeniden YAZILMAZ (boş gidiş-dönüş yok)",
  teslimGuncellemesi(
    { ...BOS, kargoTakipBaglantisi: "https://ty/1" },
    { teslimAni: null, takipBaglantisi: "https://ty/1", kargoFirmasi: null, kanalDesi: null },
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
    { teslimAni: null, takipBaglantisi: null, kargoFirmasi: null, kanalDesi: null },
  ).kargoTakipBaglantisi === undefined,
);
kontrol(
  "kargo firması DEĞİŞTİYSE tazelenir, AYNIYSA yazılmaz",
  teslimGuncellemesi({ ...BOS, kanalKargoFirmasi: "Aras" }, {
    teslimAni: null,
    takipBaglantisi: null,
    kargoFirmasi: "Yurtiçi",
    kanalDesi: null,
  }).kanalKargoFirmasi === "Yurtiçi" &&
    teslimGuncellemesi({ ...BOS, kanalKargoFirmasi: "Aras" }, {
      teslimAni: null,
      takipBaglantisi: null,
      kargoFirmasi: "Aras",
      kanalDesi: null,
    }).kanalKargoFirmasi === undefined,
);
kontrol(
  "yazacak bir şey yoksa BOŞ döner (çağıran sorgu açmaz)",
  !teslimYazimiVarMi(
    teslimGuncellemesi(BOS, {
      teslimAni: null,
      takipBaglantisi: null,
      kargoFirmasi: null,
      kanalDesi: null,
    }),
  ),
);
/**
 * ⛔ DESİ, `deliveredAt` SINIFINDA (K197-4) — ve bu ayrım AYRI sınanır, çünkü
 * takip/firma TAZELENİYOR, desi TAZELENMİYOR. İki kural aynı gövdede yaşıyor;
 * biri ötekinin yerine geçerse kimse fark etmez.
 */
kontrol(
  "BOŞ kanal desisi DOLAR",
  teslimGuncellemesi(BOS, {
    teslimAni: null,
    takipBaglantisi: null,
    kargoFirmasi: null,
    kanalDesi: 5,
  }).kanalKargoDesi === 5,
);
/**
 * ⚠ ÖRNEK AYRIMI GÖSTERİYOR: kanalın desisi mevcuttan FARKLI (7 ≠ 5). Aynı
 * değer verilseydi "ezmedi" sonucu tesadüf olurdu — ezen bir gövde de aynı
 * sayıyı yazardı ve test yeşil kalırdı.
 */
kontrol(
  "DOLU kanal desisi EZİLMEZ (kanal farklı desi söylese bile)",
  teslimGuncellemesi(
    { ...BOS, kanalKargoDesi: 5 },
    { teslimAni: null, takipBaglantisi: null, kargoFirmasi: null, kanalDesi: 7 },
  ).kanalKargoDesi === undefined,
);
kontrol(
  "kanal desi vermediyse yazılmaz (N11 vakası)",
  teslimGuncellemesi(BOS, {
    teslimAni: null,
    takipBaglantisi: null,
    kargoFirmasi: null,
    kanalDesi: null,
  }).kanalKargoDesi === undefined,
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
function yazmaBloklari(metin: string): string[] {
  const bloklar: string[] = [];
  for (const cagri of ["prisma.sale.create(", "prisma.sale.update(", "prisma.sale.updateMany("]) {
    let i = metin.indexOf(cagri);
    while (i !== -1) {
      const bitis = metin.indexOf("});", i);
      bloklar.push(metin.slice(i, bitis === -1 ? i + 2000 : bitis));
      i = metin.indexOf(cagri, i + 1);
    }
  }
  return bloklar;
}

/**
 * ⛔ ÖLÇÜT YAZMA ÇAĞRISINA BAĞLI — SATIRA DEĞİL (düzeltildi 09.09.2026).
 *
 * Satır bazlı hâli İKİ kez yanıldı, ikisi de aynı kökten (okuma ile yazmayı
 * ayırt edememek):
 *   ① `cargoDesi: true` (SELECT) yazma sanıldı
 *   ② çok satırlı bir OKUMA — `kanalKargoDesi:` satırda tek başına kalıp
 *      değeri sonraki satıra taşıyor — N11'i "yazan" saydı ve
 *      "TY desiyi hiç yazmıyor" mutasyonu bekçiden KAÇTI
 *
 * ⭐ Doğru kapsam Prisma'nın YAZMA çağrılarının içi. Okuma, saf gövdeye
 * geçirme ve select artık sayılmıyor.
 * _(Anayasa: "deseni kullanım bloğuna daraltarak ara".)_
 */
function atamaSatirlari(metin: string, alan: string): string[] {
  const hariç = new RegExp(alan + ":\\s*(true|null)\\b");
  return yazmaBloklari(metin)
    .flatMap((b) => b.split("\n"))
    .filter((l) => l.includes(alan + ":") && !l.trim().startsWith("*"))
    .filter((l) => !hariç.test(l));
}

/**
 * ⚠ TABAN ALAN BAŞINA — VE GEREKÇESİYLE. Üç alanın hepsini üç kanal
 * yazmıyor: `kanalKargoDesi`yi N11 YAZAMIYOR çünkü kanal desi VERMİYOR
 * (ölçüldü 09.09.2026: 5 paketin birleşim kümesinde 34 alan, hiçbiri
 * desi/deci/weight değil). Tabanı 3 yazsaydım bekçi HER KOŞUMDA haksız
 * yere kırmızı yanar, sonra "gevşetelim" denir ve ölçüt ölürdü.
 */
const ALANLAR = [
  { alan: "shippedAt", taban: 3, gerekce: "TY · HB · N11" },
  { alan: "deliveredAt", taban: 3, gerekce: "TY · HB · N11" },
  { alan: "kanalKargoDesi", taban: 2, gerekce: "TY · HB — N11 desi VERMİYOR (ölçüldü)" },
] as const;

for (const { alan, taban, gerekce } of ALANLAR) {
  const yazanlar = ICE_AKTARMALAR.filter(
    (y) => atamaSatirlari(KAYNAKLAR.get(y)!, alan).length > 0,
  );
  kontrol(
    alan + " yazan içe aktarma bulundu (taban DOLU · " + gerekce + ")",
    yazanlar.length >= taban,
    yazanlar,
  );
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
    /**
     * ⛔ ÖLÇÜT DEĞİŞKEN ADINA BAĞLANMAZ. Eski hâli `data: { <alan>: damga }`
     * diye ARIYORDU; biri değişkeni `desi` diye adlandırdığı an desen
     * tutmaz, kontrol SESSİZCE koşmaz ve "yalnız NULL'a yaz" kuralı
     * korumasız kalırdı. Artık `data: { <alan>:` ile başlayan HER yazım
     * yakalanıyor. _(Anayasa: "dize, davranışın vekilidir".)_
     */
    const yazimBasi = "data: { " + alan + ":";
    if (metin.includes(yazimBasi)) {
      const i = metin.indexOf(yazimBasi);
      const pencere = metin.slice(Math.max(0, i - 260), i);
      kontrol(
        ad + " — " + alan + " yalnız NULL olana yazılıyor",
        pencere.includes(alan + ": null"),
      );
    }
  }
}

/**
 * ⛔ İÇE AKTARMA KARGO MALİYETİNE DOKUNMAZ — DEĞİŞMEZLİK (K197-4).
 *
 * Halil kararı 09.09.2026: `kanalKargoDesi` bir ÖLÇÜM alanıdır; defterdeki
 * kargo tutarı ve NET **değişmez**. Bu bir İDDİADIR ve iddia, onu çiğneyen
 * bir mutasyon kırmızı yanmadıkça korunmuş sayılmaz.
 * _(Anayasa: "'dokunmuyor' iddiası da bir davranıştır".)_
 *
 * ⚠ ÖLÇÜT YORUMSUZ KODDA ARAR: bu dosyanın kendi yorumlarında `cargoAmount`
 * geçiyor ve o bir ihlal DEĞİL.
 */
{
  const YASAK = ["cargoAmount", "cargoDesi"] as const;
  kontrol(
    "içe aktarma taranıyor (taban DOLU)",
    ICE_AKTARMALAR.length >= 3,
    ICE_AKTARMALAR.length,
  );
  /**
   * ⛔ ÖLÇÜT YAZMA ÇAĞRISINA BAĞLANIR — SATIRA DEĞİL (düzeltildi 09.09.2026).
   *
   * İlk hâl dosyanın HER YERİNDE `cargoAmount:` arıyordu ve iki yalancı
   * pozitif üretti: `cargoDesi: true` (bir SELECT) ve
   * `cargoDesi: s.cargoDesi ...` (alanı OKUYUP saf gövdeye geçiren satır).
   * İkisi de okuma. Ölçüt gevşetilmedi, YERİ düzeltildi: yalnız Prisma'nın
   * YAZMA çağrılarının içi taranıyor.
   * _(Anayasa: "deseni kullanım bloğuna daraltarak ara".)_
   *
   * ⚠ Ve blok ÖLÇÜLÜR: yazma çağrısı bulunamazsa bu bir "temiz" değil
   * "bakamadım"dır ve öyle yazar.
   */
  /**
   * ⚠ TABAN KÜME DÜZEYİNDE ÖLÇÜLÜR, DOSYA DÜZEYİNDE DEĞİL.
   * `canli-alis-ice-aktar` bir ALIM içe aktarmasıdır ve `prisma.sale`
   * yazmaz — bu "bakamadım" değil, "bakılacak bir şey yok"tur. Dosya
   * başına şart koşulsaydı bekçi her koşumda haksız kırmızı yanar, sonra
   * "gevşetelim" denir ve ölçüt ölürdü.
   * ⛔ Ama küme boşalırsa bağ kopmuştur: satış yazan en az 3 içe aktarma
   * (TY · HB · N11) olmalı.
   */
  const satisYazanlar = ICE_AKTARMALAR.filter(
    (y) => yazmaBloklari(KAYNAKLAR.get(y)!).length > 0,
  );
  kontrol(
    "satış YAZAN içe aktarma bulundu (taban DOLU — TY · HB · N11)",
    satisYazanlar.length >= 3,
    satisYazanlar,
  );
  for (const yol of ICE_AKTARMALAR) {
    const ad = yol.split("/").pop();
    const bloklar = yazmaBloklari(KAYNAKLAR.get(yol)!);
    if (bloklar.length === 0) continue;
    for (const alan of YASAK) {
      const gecen = bloklar.filter((b) =>
        new RegExp("\\b" + alan + "\\s*[:=][^=]").test(b),
      );
      kontrol(
        ad + " — " + alan + "'a DOKUNMUYOR (defter değişmez)",
        gecen.length === 0,
        gecen.map((b) => b.slice(0, 120)),
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
