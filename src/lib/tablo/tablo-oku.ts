import readXlsxFile from "read-excel-file/node";
import * as XLSX from "xlsx";

import { paketiNormalle } from "./paket";

/**
 * ============================================================================
 *  TABLO OKUMA — TEK KAPI (K226)
 * ----------------------------------------------------------------------------
 *  Elektronik tablo okuyan HER yükleme yolu buradan geçer. Girdi ham bayt,
 *  çıktı sayfa listesi. Veritabanına GİTMEZ.
 *
 *  ── NİYE DOĞDU (canlı arıza 21.09.2026) ────────────────────────────────
 *  Kullanıcı N11'den indirdiği dosyayı komisyon ekranına yükledi ve ekran
 *  şunu yazdı: _"dosyanın bozuk olmadığından ve pazaryerinden indirildiği
 *  hâlde olduğundan emin olun."_ Dosya bozuk DEĞİLDİ ve indirildiği hâldeydi:
 *
 *      D0 CF 11 E0 A1 B1 1A E1   ← OLE2 kapsayıcı = ESKİ BİÇİM .xls
 *
 *  `read-excel-file` kendi cümlesiyle reddediyordu — _"You passed a legacy
 *  `.xls` file. Only `.xlsx` files are supported"_ — ama bu cümle kullanıcıya
 *  hiç ulaşmıyor, yerine onu suçlayan bir metin görünüyordu. Kusur ile sınırı
 *  ayırt ettirmeyen tutanak, arızayı yanlış tarafta kapatır.
 *
 *  ── BİÇİM BAYTTAN TANINIR, UZANTIDAN DEĞİL ─────────────────────────────
 *  `.xls` uzantılı bir dosya pekâlâ xlsx olabilir (ve tersi). Ad bir
 *  İDDİADIR; kapsayıcı imzası iddia değil, ölçüdür.
 *
 *  ── NİYE XLSX YOLU DEĞİŞMEDİ ───────────────────────────────────────────
 *  Her şeyi SheetJS'e taşımak mümkündü ve YAPILMADI: xlsx yolu beş ayrı
 *  yükleme kapısında (hakediş · komisyon · tarife · içe aktarma · geçmiş
 *  ekstre) aylardır kanıtlanmış ve Trendyol'un ZIP64 kabı için özel bir
 *  normalleştirici taşıyor (`paket.ts`). Çalışan bir yolu, ilgisiz bir
 *  biçim için yeniden yazmak, bir tarih hücresi hatasının sessizce yanlış
 *  hakediş üretmesi riskini bedavaya almak olurdu.
 *
 *  ⚠ BU "AYNI SORUYA İKİ CEVAP" DEĞİLDİR: her biçimin TEK çözücüsü var.
 *  Yasak olan aynı soruya iki cevap; farklı sorulara farklı çözücü
 *  zorunluluktur.
 *
 *  ── İKİ YOLUN ÇIKTISI AYNI ŞEKİLDE ─────────────────────────────────────
 *  Aşağıdaki `SayfaGirdisi` sözleşmesi `read-excel-file`in ÖLÇÜLEN
 *  davranışıdır (9.3.9, tek sayfalı dosyada bile `{sheet,data}[]` döner).
 *  SheetJS yolu ona UYDURULUR — boş hücre `null`, tarih `Date`, sayı
 *  `number`. Ayrışsalardı aynı dosya iki kapıdan iki farklı sonuç verirdi
 *  ve bunu hiçbir şey söylemezdi.
 * ============================================================================
 */

/** Bir sayfa: adı ve ham satırları. */
export type SayfaGirdisi = { sheet: string; data: unknown[][] };

/** Tanınan kapsayıcı biçimleri. */
export type TabloBicimi = "XLSX" | "XLS";

export type TabloOkumasi = {
  sayfalar: SayfaGirdisi[];
  bicim: TabloBicimi;
  /** ZIP64/veri tanımlayıcılı paket yeniden paketlendi mi (yalnız XLSX). */
  normallestirildi: boolean;
};

/**
 * Kapsayıcı imzasından biçim. Tanınmıyorsa `null` — ve `null` bir hüküm
 * değil, "bilmiyorum"dur: çağıran bunu kullanıcıya böyle söyler.
 */
export function bicimTani(bayt: Buffer): TabloBicimi | null {
  if (bayt.length < 8) return null;

  // 50 4B — her zip'in başı. xlsx bir zip'tir.
  if (bayt[0] === 0x50 && bayt[1] === 0x4b) return "XLSX";

  // D0 CF 11 E0 A1 B1 1A E1 — OLE2/CFB kapsayıcı. Eski Excel (BIFF) burada.
  const OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (OLE2.every((b, i) => bayt[i] === b)) return "XLS";

  return null;
}

/** Biçim tanınamadığında atılır — çağıran kodu ayırt edebilsin diye ayrı sınıf. */
export class BicimTaninmadiHatasi extends Error {
  constructor() {
    super("BICIM_TANINMADI");
    this.name = "BicimTaninmadiHatasi";
  }
}

/**
 * Ham baytı sayfalara çevirir.
 *
 * ⚠ HATA YUTULMAZ: okuyucunun kendi mesajı olduğu gibi yukarı çıkar.
 * Mesajı kırpmak teşhisi kırpar — kısaltma yalnız GÖSTERİMDE yapılır.
 */
export async function tabloOku(bayt: Buffer): Promise<TabloOkumasi> {
  const bicim = bicimTani(bayt);
  if (bicim === null) throw new BicimTaninmadiHatasi();

  if (bicim === "XLS") {
    return { sayfalar: eskiBicimiOku(bayt), bicim, normallestirildi: false };
  }

  const { bayt: duz, normallestirildi } = paketiNormalle(bayt);
  const sayfalar = (await readXlsxFile(duz)) as unknown as SayfaGirdisi[];
  return { sayfalar, bicim, normallestirildi };
}

/**
 * Excel seri sayısı → `Date`, SAF UTC ARİTMETİĞİYLE.
 *
 * ⛔ NİYE KÜTÜPHANENİN KENDİ ÇEVİRİSİ KULLANILMIYOR — ÖLÇÜLDÜ 21.09.2026.
 * SheetJS `cellDates: true` ile seri sayıyı **YEREL** saatte kuruyor. Aynı
 * hücre iki makinede iki farklı ana çözülüyordu:
 *
 *     dosyadaki duvar saati      2026-09-18 15:59
 *     SheetJS (Almanya, UTC+2)   2026-09-18T13:59:00.000Z   ← KAYMIŞ
 *     read-excel-file            2026-09-18T15:59:00.000Z   ← sözleşme
 *
 * Kayma **tam 2 saat** ve 93 hücrede birden çıktı. Sunucu UTC'de koşuyor,
 * geliştirme makinesi Berlin'de: aynı dosya iki yerde iki farklı tarih
 * üretirdi ve hiçbir yerde hata vermezdi. Anayasa bunu adıyla yasaklıyor —
 * _"çalışma ortamının saat dilimi ASLA kullanılmaz"_. `UTC: true` seçeneği
 * denendi, bu yolda etkisi yok (ölçüldü).
 *
 * Burada saat dilimi HİÇ işe karışmaz: seri sayı doğrudan UTC ms'ye çevrilir.
 */
function seriTariheCevir(seri: number, tabani1904: boolean): Date {
  /**
   * ⚠ FORMÜL TAHMİN EDİLMEDİ, ÖLÇÜLDÜ (21.09.2026 · n=92 tarih hücresi).
   * Üç aday aynı veride sınandı:
   *
   *     (seri − 25569) × 86400000        92/92  ✓
   *     Date.UTC(1899,11,30) + seri×…    57/92  ✗
   *     …aynısı Math.round ile            0/92  ✗
   *
   * Fark kayan nokta kuyruğunda doğuyor: gün sayısı ÖNCE çıkarılınca
   * çarpımın hassasiyeti değişiyor ve `new Date()` kalan kesri KESİYOR.
   * Yuvarlamak (`Math.round`) daha "doğru" görünüyordu ve tam da bu yüzden
   * seçilmedi: aynı duvar saati iki kapıdan 1 ms farkla çıkardı ve sınır
   * karşılaştırmalarında (`lt` / `lte`) bir kaydı sessizce dışarıda
   * bırakabilirdi.
   *
   * 25569 = 1900 sisteminin başlangıcı ile 1970-01-01 arasındaki gün sayısı.
   * 1904 sistemi 1462 gün ileride başlar.
   */
  return new Date((seri - (tabani1904 ? 24107 : 25569)) * 86400000);
}

/**
 * Hücre değerini sözleşmeye uydurur.
 *
 * ⚠ İKİSİ DE ÖLÇÜMLE BULUNDU (21.09.2026), tahminle değil:
 * · **boş metin → `null`** — 357 hücrede ayrışıyordu; `=== null` ile
 *   kurulmuş her kontrol boş bir hücreyi "dolu" sayardı;
 * · **metin kırpılır** — `read-excel-file` hücre metnini kırpıyor, SheetJS
 *   kırpmıyor. Kırpılmamış bir ürün adı (`"… (232 Parça) "`) kataloğumuzdaki
 *   adla eşleşmez ve satır sessizce "bulunamadı" kovasına düşerdi.
 */
function hucreyiNormalle(ham: unknown): unknown {
  if (typeof ham !== "string") return ham;
  const kirpik = ham.trim();
  return kirpik === "" ? null : kirpik;
}

/**
 * Eski biçim (.xls) → `read-excel-file` ŞEKLİNDE sayfalar.
 *
 * ⚠ `cellStyles: true` ZORUNLU: kapalıyken hücrenin sayı biçimi (`z`)
 * gelmiyor ve tarih hücresi ile düz sayı **ayırt edilemiyor** (ölçüldü:
 * N11 dosyasında `z` tanımsız geliyordu). Biçim açıkken `yyyy-mm-dd hh:mm:ss`
 * görünüyor ve `SSF.is_date` doğru ayırıyor.
 *
 * ⚠ `raw: true`: biçimlendirilmiş metin DEĞİL, değerin kendisi. `raw:false`
 * sayıyı hücre biçimine göre METNE çevirir ve komisyon oranı ayrıştırıcısı
 * onu farklı okur.
 *
 * ⚠ `defval: null` + `blankrows: true`: boş hücre `null`, boş satır YERİNDE
 * kalır. Satır numaraları kaymasın — başlık araması ve "satır no" raporları
 * indise güveniyor.
 *
 * ⚠ BOŞ METİN `null`A ÇEVRİLİR — ÖLÇÜMLE BULUNDU (21.09.2026). Aynı içerik
 * iki kaptan okunup hücre hücre kıyaslandı: eski biçim yolu **357 hücrede**
 * `""` veriyordu, xlsx yolu aynı hücrelerde `null`. Fark görünmezdi ve
 * aşağı akıştaki her `=== null` / `?? varsayılan` kontrolünü sessizce
 * çeviriyordu — boş bir hücre "dolu" sayılırdı. Sözleşme `read-excel-file`in
 * ÖLÇÜLEN davranışıdır; yeni yol ona uyar, tersi değil.
 */
function eskiBicimiOku(bayt: Buffer): SayfaGirdisi[] {
  const kitap = XLSX.read(bayt, { type: "buffer", cellStyles: true });
  const tabani1904 = kitap.Workbook?.WBProps?.date1904 === true;

  return kitap.SheetNames.map((ad) => {
    const sayfa = kitap.Sheets[ad];

    /**
     * TARİH HÜCRELERİ YERİNDE ÇEVRİLİR, `sheet_to_json`DAN ÖNCE. Satır/kolon
     * eşlemesini kütüphaneye bırakıyoruz (kanıtlanmış iş); yalnız hücrenin
     * DEĞERİ bizim çevirimizle değişiyor.
     */
    for (const adres of Object.keys(sayfa)) {
      if (adres.startsWith("!")) continue;
      const hucre = sayfa[adres] as XLSX.CellObject;
      if (
        hucre?.t === "n" &&
        typeof hucre.v === "number" &&
        typeof hucre.z === "string" &&
        XLSX.SSF.is_date(hucre.z)
      ) {
        hucre.t = "d";
        hucre.v = seriTariheCevir(hucre.v, tabani1904);
      }
    }

    return {
      sheet: ad,
      data: XLSX.utils
        .sheet_to_json<unknown[]>(sayfa, {
          header: 1,
          raw: true,
          defval: null,
          blankrows: true,
          /**
           * ⛔ `UTC: true` OLMADAN ÜSTTEKİ ÇEVİRİ BOŞA GİDER — ölçüldü.
           * Hücreye doğru `Date`i yazmak YETMİYOR: `sheet_to_json` onu
           * YENİDEN yorumluyor ve 15:59Z yazdığımız hücre çıktıda 13:59Z
           * oluyordu. Kütüphanenin kendi belgesi sebebi söylüyor —
           * _"By default, return dates whose LOCAL interpretation is
           * correct"_. Bu bayrak o yeniden yorumu kapatır.
           */
          UTC: true,
        })
        .map((satir) => satir.map(hucreyiNormalle)),
    };
  }).map((sayfa) => ({ ...sayfa, data: sondakiBosSatirlariAt(sayfa.data) }));
}

/**
 * Sondaki TAMAMEN boş satırları atar.
 *
 * ⚠ ÖLÇÜMLE BULUNDU (21.09.2026): `read-excel-file` sondaki boş satırları
 * DÜŞÜRÜYOR, SheetJS `blankrows: true` ile TUTUYOR. Aynı dosya iki kapıdan
 * farklı `data.length` veriyordu ve satır sayısına bakan her rapor ("N satır
 * okundu") kapıya göre başka sayı basardı.
 *
 * ⛔ YALNIZ SONDAKİLER: aradaki boş satırlar YERİNDE kalır. Onları da atmak
 * satır indislerini kaydırır ve başlık araması yanlış satıra bakar — N11
 * dosyasında başlıklar 11. satırda, üstünde 8 boş satır var.
 */
function sondakiBosSatirlariAt(satirlar: unknown[][]): unknown[][] {
  let son = satirlar.length;
  while (son > 0 && (satirlar[son - 1] ?? []).every((h) => h === null)) son--;
  return satirlar.slice(0, son);
}
