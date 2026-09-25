import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import * as XLSX from "xlsx";

import {
  BicimTaninmadiHatasi,
  bicimTani,
  tabloOku,
} from "../src/lib/tablo/tablo-oku";
import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  TABLO OKUMA KAPISI — DOĞRULAMA (K226, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  Saf davranış sınanır: gövde ÇAĞRILIR, kaynak metni TARANMAZ. Anayasa:
 *  _"saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz"_ — desen yanlış
 *  yerde bulunamaz, çünkü desen aranmıyor.
 *
 *  ⚠ DIŞ DOSYAYA BAĞLI DEĞİL. Eski biçim (.xls) örnekleri bu betiğin İÇİNDE
 *  üretiliyor. Kullanıcının indirdiği bir dosyaya bağlansaydı bekçi başka
 *  makinede sessizce "ölçülemedi" olurdu.
 *
 *  ── NİYE DOĞDU ─────────────────────────────────────────────────────────
 *  N11 komisyon dosyasını eski biçimde (.xls) veriyor; okuyucu yalnız .xlsx
 *  açıyordu ve ekran kullanıcıyı suçlayan bir hata basıyordu. Kapı iki biçimi
 *  de çözüyor — ve İKİ YOLUN AYNI ŞEYİ SÖYLEDİĞİ ölçülerek sabitlendi.
 * ============================================================================
 */

/** Kapının kendi dosyası — tek muaf yer. */
const KAPI_DOSYASI = "tablo-oku.ts";

/** `src` altındaki bütün .ts/.tsx dosyaları — elle liste TUTULMAZ. */
function tsDosyalari(kok: string): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(kok)) {
    const tam = join(kok, ad);
    if (statSync(tam).isDirectory()) cikti.push(...tsDosyalari(tam));
    else if (/\.tsx?$/.test(ad)) cikti.push(tam);
  }
  return cikti;
}

/**
 * Yorum ve blok yorumları siler.
 *
 * ⚠ ANAYASA: _"yorumsuz kodda arar"_ — bir yasağı ANLATAN yorum, o yasağı
 * ÇİĞNEMİŞ sayılmaz. Bu dosyanın kendi başlığında `readXlsxFile` geçiyor.
 */
function yorumsuz(kaynak: string): string {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

/** Rapor için kısa yol. */
function kisalt(yol: string): string {
  return yol.replace(/\\/g, "/");
}

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean): void {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  ⛔    ${ad}`);
  }
}

/** Verilen satırlardan eski biçim (.xls) bayt üretir. */
function eskiBicimUret(satirlar: unknown[][], sayfaAdi = "Test"): Buffer {
  const kitap = XLSX.utils.book_new();
  const sayfa = XLSX.utils.aoa_to_sheet(satirlar);
  XLSX.utils.book_append_sheet(kitap, sayfa, sayfaAdi);
  return XLSX.write(kitap, { type: "buffer", bookType: "biff8" }) as Buffer;
}

/**
 * Tarih hücresi taşıyan eski biçim bayt — HAM SERİ SAYIDAN kurulur.
 *
 * ⛔ `new Date(...)` YAZILAMAZ. İlk yazımda fikstür bir `Date` nesnesi
 * taşıyordu ve ölçüt kırmızı yandı; sebep okuma değil YAZMAYDI: SheetJS
 * `Date`i dosyaya çevirirken YEREL saati kullanıyor, yani fikstürün kendisi
 * ortamın saat dilimine bağlı oluyordu. Ham seri yazılınca dosya, gerçek bir
 * pazaryeri dosyası gibi mutlak bir DUVAR SAATİ taşır ve ölçüt makineden
 * bağımsız olur.
 *
 * 46283.665972222225 = 2026-09-18 15:59:00 (N11 dosyasından alınan gerçek
 * değer).
 */
function tarihliEskiBicim(seri: number): Buffer {
  const sayfa: XLSX.WorkSheet = {
    "!ref": "A1:A1",
    A1: { t: "n", v: seri, z: "yyyy-mm-dd hh:mm:ss" },
  };
  const kitap = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(kitap, sayfa, "Tarih");
  return XLSX.write(kitap, {
    type: "buffer",
    bookType: "biff8",
    cellStyles: true,
  }) as Buffer;
}

/** Aynı satırlardan yeni biçim (.xlsx) bayt üretir. */
function yeniBicimUret(satirlar: unknown[][], sayfaAdi = "Test"): Buffer {
  const kitap = XLSX.utils.book_new();
  const sayfa = XLSX.utils.aoa_to_sheet(satirlar);
  XLSX.utils.book_append_sheet(kitap, sayfa, sayfaAdi);
  return XLSX.write(kitap, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function main(): Promise<void> {
  console.log("");
  console.log("TABLO OKUMA KAPISI — İKİ BİÇİM, TEK SÖZLEŞME");

  // ── ① BİÇİM TANIMA — BAYTTAN, UZANTIDAN DEĞİL ──────────────────────────
  console.log("\n① BİÇİM TANIMA");
  {
    const xls = eskiBicimUret([["a"]]);
    const xlsx = yeniBicimUret([["a"]]);

    kontrol("eski biçim (OLE2 imzası) → XLS", bicimTani(xls) === "XLS");
    kontrol("yeni biçim (PK imzası) → XLSX", bicimTani(xlsx) === "XLSX");
    kontrol(
      "tanınmayan bayt → null (hüküm değil, 'bilmiyorum')",
      bicimTani(Buffer.from("bu bir excel dosyasi degil", "utf-8")) === null,
    );
    kontrol(
      "çok kısa bayt → null (taşma yok)",
      bicimTani(Buffer.from([0x50, 0x4b])) === null,
    );
    /**
     * ⚠ UZANTI SORULMUYOR: `bicimTani` yalnız bayt alıyor. Ad bir İDDİADIR;
     * `.xls` uzantılı bir dosya pekâlâ xlsx olabilir.
     */
    kontrol(
      "xlsx baytı, adı ne olursa olsun XLSX (ad hiç sorulmuyor)",
      bicimTani(xlsx) === "XLSX" && bicimTani(xls) === "XLS",
    );

    let atti = false;
    try {
      await tabloOku(Buffer.from("excel degil", "utf-8"));
    } catch (e) {
      atti = e instanceof BicimTaninmadiHatasi;
    }
    kontrol("tanınmayan biçim SESSİZ GEÇMİYOR, ayırt edilebilir hata atıyor", atti);
  }

  // ── ② İKİ YOL AYNI ŞEYİ SÖYLER ─────────────────────────────────────────
  console.log("\n② İKİ YOLUN ÇIKTISI AYNI");
  {
    /**
     * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: boşluklu metin, boş
     * hücre, sayı ve TARİH bir arada. Yalnız düz metinle sınansaydı üç
     * gerçek ayrışmanın (kırpma · boş · saat dilimi) hiçbiri görünmezdi.
     */
    const satirlar: unknown[][] = [
      ["Ad", "Sayı", "Tarih"],
      ["  bosluklu  ", 42, new Date(Date.UTC(2026, 8, 18, 15, 59, 0))],
      ["", null, null],
    ];

    const a = await tabloOku(eskiBicimUret(satirlar));
    const b = await tabloOku(yeniBicimUret(satirlar));

    kontrol("eski biçim XLS olarak okundu", a.bicim === "XLS");
    kontrol("yeni biçim XLSX olarak okundu", b.bicim === "XLSX");
    kontrol(
      "sayfa adı iki yolda da aynı",
      a.sayfalar[0]?.sheet === b.sayfalar[0]?.sheet,
    );
    kontrol(
      "satır sayısı iki yolda da aynı",
      a.sayfalar[0]?.data.length === b.sayfalar[0]?.data.length,
    );

    const ayrisan = hucreFarki(a.sayfalar[0]?.data ?? [], b.sayfalar[0]?.data ?? []);
    kontrol(`iki yol arasında AYRIŞAN HÜCRE YOK (ölçülen: ${ayrisan})`, ayrisan === 0);
  }

  // ── ③ ESKİ BİÇİM SÖZLEŞMESİ — ÜÇ AYRI KURAL ────────────────────────────
  console.log("\n③ ESKİ BİÇİM SÖZLEŞMESİ");
  {
    const bayt = eskiBicimUret([["  kirpilacak  ", "", 7]]);
    const satir = (await tabloOku(bayt)).sayfalar[0]?.data[0] ?? [];

    kontrol("metin KIRPILIYOR", satir[0] === "kirpilacak");
    kontrol("boş metin null'a çevriliyor", satir[1] === null);
    kontrol("sayı sayı kalıyor (metne çevrilmiyor)", satir[2] === 7);

    const tarihBayt = tarihliEskiBicim(46283.665972222225);
    const tarih = (await tabloOku(tarihBayt)).sayfalar[0]?.data[0]?.[0];
    kontrol("tarih hücresi Date olarak geliyor", tarih instanceof Date);
    /**
     * ⛔ EN PAHALI ÖLÇÜT — SAAT DİLİMİ. Kütüphane seri sayıyı YEREL saatte
     * kuruyor; düzeltilmeseydi aynı dosya Almanya'daki makinede ve UTC
     * koşan sunucuda İKİ FARKLI ana çözülürdü (ölçüldü: tam 2 saat, 93
     * hücrede). Anayasa: _"çalışma ortamının saat dilimi ASLA kullanılmaz"_.
     */
    kontrol(
      "tarih ORTAMIN SAAT DİLİMİNDEN bağımsız (duvar saati korunuyor)",
      tarih instanceof Date &&
        tarih.getUTCHours() === 15 &&
        tarih.getUTCMinutes() === 59 &&
        tarih.getUTCDate() === 18,
    );
  }

  // ── ④ ÇOK SAYFALI DOSYA ────────────────────────────────────────────────
  console.log("\n③b TARİH KESME KURALI");
  {
    /**
     * ⛔ AYIRT EDİCİ SERİ. Bu değerde iki aday formül FARKLI sonuç veriyor —
     * tam da bu yüzden seçildi: yuvarlayan formül 14:59:00.000, sözleşmenin
     * kendisi 14:58:59.999 üretir. Önceki fikstür (15:59) iki formülde de AYNI
     * çıkıyordu, yani kuralı hiç sınamıyordu.
     * _(Anayasa: "örnek veri ayrımın iki yakasını göstermeli".)_
     */
    const t2 = (await tabloOku(tarihliEskiBicim(46279.62430555555))).sayfalar[0]
      ?.data[0]?.[0];
    kontrol(
      "kayan nokta kuyruğu KESİLİYOR (yuvarlanmıyor) — .999 korunuyor",
      t2 instanceof Date &&
        t2.getUTCHours() === 14 &&
        t2.getUTCMinutes() === 58 &&
        t2.getUTCSeconds() === 59 &&
        t2.getUTCMilliseconds() === 999,
    );
  }

  console.log("\n③c BOŞ SATIR DAVRANIŞI");
  {
    /**
     * ⛔ N11 VAKASININ KENDİSİ: o dosyada başlıklar 11. SATIRDA ve üstünde
     * 8 boş satır var. Aradaki boş satırlar atılsaydı başlık araması yanlış
     * satıra bakar ve dosya hiç tanınmazdı.
     */
    const veri =
      (await tabloOku(eskiBicimUret([["ust"], [null], [null], ["baslik"], ["veri"]])))
        .sayfalar[0]?.data ?? [];
    kontrol("aradaki boş satırlar YERİNDE (indis kaymıyor)", veri.length === 5);
    kontrol("başlık satırı hâlâ 4. sırada", veri[3]?.[0] === "baslik");
  }

  console.log("\n④ ÇOK SAYFALI DOSYA");
  {
    const kitap = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      kitap,
      XLSX.utils.aoa_to_sheet([["ilk"]]),
      "Aciklama",
    );
    XLSX.utils.book_append_sheet(
      kitap,
      XLSX.utils.aoa_to_sheet([["ikinci"]]),
      "Veri",
    );
    const bayt = XLSX.write(kitap, {
      type: "buffer",
      bookType: "biff8",
    }) as Buffer;

    const okuma = await tabloOku(bayt);
    /**
     * ⚠ BÜTÜN SAYFALAR DÖNER. Yalnız ilkini döndüren bir kapı, veriyi ikinci
     * sayfada taşıyan dosyaları (HB teklif dosyası tam olarak böyle) hiç
     * göremezdi.
     */
    kontrol("iki sayfa da dönüyor", okuma.sayfalar.length === 2);
    kontrol(
      "sayfa adları korunuyor",
      okuma.sayfalar[0]?.sheet === "Aciklama" &&
        okuma.sayfalar[1]?.sheet === "Veri",
    );
  }

  // ── ⑤ DESEN YASAĞI — ÇIPLAK OKUMA YOK ────────────────────────
  console.log("\n⑤ DESEN YASAĞI");
  {
    /**
     * ⛔ ÇİPLAK `readXlsxFile(` SRC ALTINDA YAZILAMAZ — kapının kendisi hariç.
     *
     * Anayasa: _"düzeltmenin çaresi dosya listesi değil, DESEN YASAĞIDIR"_.
     * Beş kapıyı tek tek sayan bir ölçüt, yarın açılan ALTINCI yükleyiciyi
     * sessizce kapsam dışı bırakırdı: o yükleyici eski biçimi açamaz ve bunu
     * kimse göremezdi — bekçi yeşil yanardı.
     */
    const dosyalar = tsDosyalari("src");
    const ihlal = dosyalar.filter(
      (d) =>
        !d.endsWith(KAPI_DOSYASI) &&
        /readXlsxFile[ ]*\(/.test(yorumsuz(kaynakOku(d))),
    );
    kontrol(
      `çıplak readXlsxFile( yok (ihlal: ${ihlal.map(kisalt).join(", ") || "-"})`,
      ihlal.length === 0,
    );

    /**
     * ⚠ TABAN DOLULUĞU AYRICA KANITLANIR. Tarama hiç dosya bulmazsa
     * "ihlal yok" her zaman DOĞRUdur ve ölçüt kendi kendini kandırır
     * (boş küme her koşulu sağlar). Bu yüzden hem taranan küme hem de
     * kapıyı GERÇEKTEN çağıran dosya sayısı ölçülüyor.
     */
    kontrol(`taranan ts dosyası >= 200 (ölçülen: ${dosyalar.length})`, dosyalar.length >= 200);

    const cagiran = dosyalar.filter((d) =>
      /\btabloOku\(/.test(yorumsuz(kaynakOku(d))),
    );
    kontrol(
      `kapıyı çağıran yükleme yolu >= 5 (ölçülen: ${cagiran.length})`,
      cagiran.length >= 5,
    );
  }

  console.log("");
  console.log("=".repeat(70));
  if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
  else {
    console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
    process.exitCode = 1;
  }
  console.log("");
}

/** İki sayfanın hücre hücre farkı — Date'ler ana göre kıyaslanır. */
function hucreFarki(a: unknown[][], b: unknown[][]): number {
  let fark = 0;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const ra = a[i] ?? [];
    const rb = b[i] ?? [];
    const m = Math.max(ra.length, rb.length);
    for (let j = 0; j < m; j++) {
      const va = ra[j] ?? null;
      const vb = rb[j] ?? null;
      const ka = va instanceof Date ? `D${va.getTime()}` : JSON.stringify(va);
      const kb = vb instanceof Date ? `D${vb.getTime()}` : JSON.stringify(vb);
      if (ka !== kb) fark++;
    }
  }
  return fark;
}

main();
