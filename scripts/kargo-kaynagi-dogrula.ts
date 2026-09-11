import { readFileSync, readdirSync } from "node:fs";

import {
  desiSecimi,
  kargoSecimi,
  kargoTahminiMi,
  KURESEL_DESI_ORTANCASI,
} from "../src/lib/kargo-kaynagi";

/**
 * ============================================================================
 *  KARGO KAYNAK SIRASI BEKÇİSİ (K201)
 * ----------------------------------------------------------------------------
 *      npm run kargo-kaynagi:dogrula
 *
 *  ⛔ KORUDUĞU İKİ SIRA:
 *    ① TUTAR : gerçekleşen (`cargoAmount`) → tahmin (`tahminiKargo`) → YOK
 *    ② DESİ  : tartım (`kanalKargoDesi`) → tahmin (`cargoDesi`) → küresel
 *
 *  Sıra bozulursa hiçbir şey hata vermez: NET yine bir rakam basar, yalnız
 *  yanlış kaynaktan. En pahalı hâli tersine dönmesi — tahmin, kanalın FİİLEN
 *  kestiği tutarı EZERSE defter kendi hesabını gerçeğe tercih etmiş olur.
 *
 *  ⭐ ÖLÇÜTLER GÖVDEYİ ÇAĞIRIR (saf katman, desen taraması YOK).
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

console.log("\nKARGO KAYNAK SIRASI BEKÇİSİ (K201)\n");

/* ═══ ① TUTAR SIRASI ══════════════════════════════════════════════════ */
console.log("  ── TUTAR: gerçekleşen > tahmin");
/**
 * ⛔ EN KRİTİK ÖLÇÜT — VE ÖRNEK AYRIMI GÖSTERİYOR: iki sütun da DOLU ve
 * DEĞERLERİ FARKLI. Aynı değer verilseydi "doğru olanı seçti" sonucu
 * tesadüf olurdu; ters seçen bir gövde de aynı sayıyı döndürürdü.
 */
kontrol(
  "ikisi de doluysa GERÇEKLEŞEN kazanır",
  (() => {
    const s = kargoSecimi({ cargoAmount: 100, tahminiKargo: 80 });
    return s.kaynak === "GERCEKLESEN" && s.tutar === 100;
  })(),
);
kontrol(
  "gerçekleşen yoksa TAHMİN kullanılır",
  (() => {
    const s = kargoSecimi({ cargoAmount: null, tahminiKargo: 80 });
    return s.kaynak === "TAHMINI" && s.tutar === 80;
  })(),
);
kontrol(
  "ikisi de yoksa YOK — ve tutar SIFIR DEĞİL, null",
  (() => {
    const s = kargoSecimi({ cargoAmount: null, tahminiKargo: null });
    return s.kaynak === "YOK" && s.tutar === null;
  })(),
);
/**
 * ⛔ `0` MEŞRU BİR TUTARDIR: kargosu bedava olan gönderi. `> 0` ölçütüyle
 * yazılsaydı o satış "kargo bilinmiyor"a düşer ve tahmine kayardı.
 * _(Anayasa: "varsayılan değer alanın anlamından türetilir".)_
 */
kontrol(
  "gerçekleşen SIFIR ise yine GERÇEKLEŞEN (tahmine kaçmaz)",
  (() => {
    const s = kargoSecimi({ cargoAmount: 0, tahminiKargo: 80 });
    return s.kaynak === "GERCEKLESEN" && s.tutar === 0;
  })(),
);
kontrol(
  "tahmini olan ETİKETLENİR, gerçekleşen etiketlenmez",
  kargoTahminiMi(kargoSecimi({ cargoAmount: null, tahminiKargo: 80 })) &&
    !kargoTahminiMi(kargoSecimi({ cargoAmount: 100, tahminiKargo: 80 })),
);

/* ═══ ② DESİ SIRASI ═══════════════════════════════════════════════════ */
console.log("\n  ── DESİ: tartım > ürüne-özel tahmin > küresel");
kontrol(
  "tartım varsa TARTIM kazanır (tahmin dolu olsa bile)",
  (() => {
    const d = desiSecimi({ kanalKargoDesi: 7, cargoDesi: 3 });
    return d.kaynak === "TARTIM" && d.desi === 7;
  })(),
);
/**
 * ⛔ ARA BASAMAK — ÖLÇÜMLE EKLENDİ. İlk sıra "tartım → küresel" idi;
 * ölçüm gösterdi ki N11 ürünlerinin 0/10'u tartılmış ama 10/10'unda
 * ürüne-özel tahmin DOLU. Bu basamak kalkarsa her tahmin küresel bir
 * sayıya düşer ve ürün ayrımı kaybolur.
 */
kontrol(
  "tartım yoksa ÜRÜNE-ÖZEL tahmin (küresele DÜŞMEZ)",
  (() => {
    const d = desiSecimi({ kanalKargoDesi: null, cargoDesi: 8 });
    return d.kaynak === "TAHMIN" && d.desi === 8;
  })(),
);
kontrol(
  "ikisi de yoksa KÜRESEL ortanca (" + KURESEL_DESI_ORTANCASI + ")",
  (() => {
    const d = desiSecimi({ kanalKargoDesi: null, cargoDesi: null });
    return d.kaynak === "KURESEL" && d.desi === KURESEL_DESI_ORTANCASI;
  })(),
);
/** ⚠ Sıfır desi bir ölçüm değil, bozuk kayıt — basamak DÜŞER. */
kontrol(
  "SIFIR desi bir sonraki basamağa düşer",
  (() => {
    const a = desiSecimi({ kanalKargoDesi: 0, cargoDesi: 5 });
    const b = desiSecimi({ kanalKargoDesi: 0, cargoDesi: 0 });
    return a.kaynak === "TAHMIN" && a.desi === 5 && b.kaynak === "KURESEL";
  })(),
);
/**
 * ⛔ KÜRESEL SAYI ORTANCA, ORTALAMA DEĞİL — kullanıcı kararı 09.09.2026.
 * Ölçüm: ortanca 3 · ortalama 4,04 (oran 1,345, dağılım kuyruklu).
 * `4` yazılsaydı bu ölçüt kırmızı yanar ve kararın çevrildiği görülürdü.
 */
kontrol(
  "küresel sayı ÖLÇÜLEN ORTANCA (3) — ortalama (4,04) DEĞİL",
  KURESEL_DESI_ORTANCASI === 3,
  KURESEL_DESI_ORTANCASI,
);

/* ═══ ③ DEFTER DEĞİŞMEZLİĞİ — TAHMİN GERÇEĞİ EZMEZ ════════════════════ */
/**
 * ⛔ HALİL'İN ŞARTI: `tahminiKargo` `cargoAmount`a DOKUNMAZ. Bu bir
 * İDDİADIR; kaynak taranarak sınanır çünkü iddia YAZMA yolunda yaşıyor.
 * ⚠ Liste elle tutulmuyor — içe aktarmalar TARANARAK bulunuyor.
 */
console.log("\n  ── DEFTER DEĞİŞMEZLİĞİ (kaynak taraması)");
const ICE = readdirSync("scripts")
  .filter((a) => a.startsWith("canli-") && a.endsWith("-ice-aktar.ts"))
  .map((a) => "scripts/" + a);
kontrol("içe aktarma taranıyor (taban DOLU)", ICE.length >= 3, ICE.length);

/**
 * ⛔ ÖLÇÜT İKİ SÖZDİZİMİ BİRDEN YAKALAR — VE BUNU BİR KAÇAN MUTASYON
 * ÖĞRETTİ (09.09.2026). İlk hâli yalnız NESNE ALANINI arıyordu:
 *
 *     cargoAmount: x        ← yakalanıyordu
 *     obj.cargoAmount = x   ← YAKALANMIYORDU
 *
 * "N11 defterdeki kargo tutarına dokunuyor" mutasyonu tam o boşluktan
 * geçti ve bekçi YEŞİL kaldı. Yani Halil'in şartı ("tahmin gerçeği ezmez")
 * bir sözdizimi biçimi kadar korunuyordu.
 * _(Anayasa: "ölçüt kullanıma bağlanır — ada ya da dizeye değil"; ve
 * "mutasyon sonucu GÖRÜLMEDEN push edilmez".)_
 *
 * ⚠ TİP ANOTASYONU ATAMA DEĞİLDİR: `cargoAmount?: number` bir yazma değil,
 * bir tip bildirimidir ve eleniyor. `: true` (select) ve `: null` (where)
 * de öyle — ikisi de okuma.
 */
function atamaSatirlari(metin: string, alan: string): string[] {
  const haric = new RegExp(alan + "\\??:\\s*(true|null|number|Decimal)\\b");
  const nesneAlani = new RegExp("\\b" + alan + "\\s*:");
  /** ⚠ `=` ama `==`/`===` DEĞİL — karşılaştırma bir yazma değildir. */
  const atama = new RegExp("\\b" + alan + "\\s*=[^=]");
  return metin
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
    })
    /**
     * ⛔ SIRA ÖNEMLİ — VE BUNU DA AYNI MUTASYON ÖĞRETTİ (ikinci tur):
     * muafiyet SATIR düzeyinde çalışıyordu ve mutasyon satırı HEM tip
     * anotasyonu HEM atama içeriyordu:
     *
     *     (veri as { cargoAmount?: number }).cargoAmount = x;
     *      └── tip (muaf) ──────────────────┘└── ATAMA ──┘
     *
     * Muafiyet satırın tamamını eliyor ve gerçek bulguyu İPTAL ediyordu.
     * ⭐ ATAMA VARSA MUAFİYET GEÇMEZ: bir satırda yazma varsa, aynı satırda
     * bir tip bildirimi bulunması onu okuma yapmaz.
     */
    .filter((l) => atama.test(l) || (nesneAlani.test(l) && !haric.test(l)));
}

let tahminYazan = 0;
for (const yol of ICE) {
  const metin = readFileSync(yol, "utf8");
  const ad = yol.split("/").pop()!;
  kontrol(
    ad + " — cargoAmount'a DOKUNMUYOR",
    atamaSatirlari(metin, "cargoAmount").length === 0,
    atamaSatirlari(metin, "cargoAmount"),
  );
  if (metin.includes("tahminiKargo = hesap.tutar")) tahminYazan += 1;
}
/**
 * ⚠ TABAN: bugün YALNIZ N11 tahmin yazıyor (TY/HB'de gerçekleşen zaten
 * geliyor). Sayı artarsa bu bilinçli bir karardır ve ölçüt güncellenir;
 * SIFIRA düşerse bağ kopmuştur.
 */
kontrol("tahmini kargo yazan içe aktarma VAR (bugün 1 — N11)", tahminYazan === 1, tahminYazan);

/**
 * ⛔ SATIŞ DETAYI EKRANI GERÇEKTEN ÖNCELİK SIRASINI OKUYOR MU (11.09.2026).
 *
 * Bulgu: `kanalKargoDesi` (TARTIM, kanalın DOĞRULADIĞI gerçek desi) canlıda
 * doğru yakalanıyordu ama satış detay ekranı (`satislar/[id]/page.tsx`)
 * hep ham `cargoDesi`yi (TAHMIN, satış anındaki bizim hesabımız) basıyordu
 * — kanal gerçek desiyi DOĞRULADIKTAN SONRA bile ekran hiç güncellenmiyordu.
 * `desiSecimi` doğru sırayı zaten uyguluyordu (değer testleriyle kanıtlı);
 * eksik olan EKRANIN onu ÇAĞIRMASIYDI. _(Anayasa: "zincir, halkalarının
 * varlığıyla değil bağlantısıyla sınanır" — saf gövde doğru, tüketici yoktu.)_
 */
{
  const sayfa = readFileSync("src/app/satislar/[id]/page.tsx", "utf8");
  kontrol(
    "satış detayı desiSecimi'yi İTHAL EDİYOR",
    /import \{ desiSecimi \} from "@\/lib\/kargo-kaynagi";/.test(sayfa),
  );
  /** ⚠ ANAHTAR ADI TEK BAŞINA YETMEZ — KAYNAK ALANI DA aranır. Yalnız
   *  `kanalKargoDesi:` anahtarını arayan bir ölçüt, değeri `null`e ya da
   *  başka bir alana sabitleyen bir mutasyonu KAÇIRIR (anahtar dosyada
   *  kalır, kaynağı değişir). */
  const desiSecimiBlok = sayfa.slice(
    sayfa.indexOf("const desiGosterim = desiSecimi({"),
    sayfa.indexOf("});", sayfa.indexOf("const desiGosterim = desiSecimi({")),
  );
  kontrol("desiSecimi çağrısı bulundu", desiSecimiBlok.length > 0);
  kontrol(
    "  ...ham cargoDesi yerine kanalKargoDesi+cargoDesi İKİSİNİ birden geçiriyor",
    /kanalKargoDesi:[\s\S]{0,80}satis\.kanalKargoDesi/.test(desiSecimiBlok) &&
      /cargoDesi: satis\.cargoDesi/.test(desiSecimiBlok),
  );
  kontrol(
    "  ...KÜRESEL (üçüncü, bilinmeyen) basamak EKRANDA gösterilmiyor",
    /desiGosterim\.kaynak === "KURESEL"/.test(sayfa),
  );
  kontrol(
    "  ...TAHMIN kaynağı 'tahmini' etiketiyle taşınıyor (bir sayı etiketiyle taşınır)",
    /desiGosterim\.kaynak === "TAHMIN"[\s\S]{0,60}desiTahmini/.test(sayfa),
  );
}

console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    ` (${gecen}/${gecen + hata})\n`,
);
process.exit(hata === 0 ? 0 : 1);
