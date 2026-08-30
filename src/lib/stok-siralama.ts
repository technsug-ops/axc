/**
 * ============================================================================
 *  STOK LİSTESİ — SIRALAMA VE SIFIR SÜZGECİ (K101, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ KULLANICI BULGUSU: `/stok` ekranında sıralama tuşu YOKTU (sabit: ürün
 *  adı) ve sıfır stoklular listeyi dolduruyordu.
 *
 *  ── ⚠ TUZAK: SIRALANAN İKİ ALAN VARYANT KOLONU DEĞİL ────────────────────
 *  "Mevcut stok" ve "son hareket" `ProductVariant`ta DURMAZ; ikisi de
 *  `StockMovement` defterinden türetilir. Yani `orderBy` ile sıralanamazlar.
 *
 *  ⛔ VE KOLAY YOL YANLIŞ OLURDU: sayfayı çekip ELDEKİ 50 satırı sıralamak.
 *  Ekran "adede göre sıralı" derdi, gerçekte yalnız o sayfanın içi sıralı
 *  olurdu — 2. sayfada 1. sayfadan büyük adet çıkardı ve kimse fark etmezdi.
 *  _(Anayasa K61: "sayfalama, toplamlar veritabanına taşınmadan yapılmaz" —
 *  burada aynı tuzağın SIRALAMA yüzü.)_
 *
 *  ⭐ ÇARE: sıra SÜZGECİN TAMAMI üzerinde kurulur, sonra sayfa dilimlenir.
 *  Bu gövde saf olduğu için bekçi onu ÇAĞIRARAK sınıyor; kaynak taraması yok.
 *
 *  ── 📏 ÖLÇÜM (30.08.2026, canlı, salt okuma) ────────────────────────────
 *      toplam varyant   1104     stok > 0   230     stok = 0   823
 *      HİÇ hareketi yok   51     stok < 0     0
 *      groupBy 607 ms · ağ tabanı 34 ms  →  gerçek iş ~573 ms
 *
 *  İki karar bu ölçümden çıktı:
 *
 *  ① SÜZGEÇ ÖLÇÜTÜ `≠ 0`, `> 0` DEĞİL. Bugün negatif stok yok, yani ikisi
 *     AYNI 230 satırı veriyor. Ama `> 0` yarın doğacak bir negatif stoğu
 *     SESSİZCE GİZLERDİ — ve negatif stok bir anomalidir, tam da görülmesi
 *     gereken şeydir. Bugün bedeli sıfır olan doğru yön seçildi.
 *     _(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez".)_
 *
 *  ② HAREKETİ HİÇ OLMAYAN 51 VARYANT `groupBy`DA YOKTUR. Süzgeç için bu
 *     doğru davranış (hareketi yoksa stok sıfırdır, gizlenir); ama SIRALAMA
 *     için `undefined` değil `0` sayılmaları gerekir, yoksa listeden düşer
 *     ve kullanıcı sıralamayı açınca 51 ürün sessizce kaybolurdu.
 * ============================================================================
 */

export const SIRALAMA_ALANLARI = ["ad", "adet", "hareket"] as const;
export type SiralamaAlani = (typeof SIRALAMA_ALANLARI)[number];

export const YONLER = ["artan", "azalan"] as const;
export type Yon = (typeof YONLER)[number];

export type Siralama = { alan: SiralamaAlani; yon: Yon };

/**
 * Varsayılan sıra: ürün adı, artan.
 *
 * ⚠ VARSAYILAN UCUZ YOL OLMAK ZORUNDA: bu sıra `orderBy` ile veritabanında
 * çözülüyor ve hiçbir toplama sorgusu koşmuyor. Varsayılanı "adet" yapmak,
 * her stok açılışına 600 ms'lik bir `groupBy` eklerdi.
 */
export const VARSAYILAN_SIRA: Siralama = { alan: "ad", yon: "artan" };

/** Adresten gelen ham değerleri çözer; tanınmayan değer VARSAYILANA düşer. */
export function siralamaCoz(alan?: string, yon?: string): Siralama {
  const a = SIRALAMA_ALANLARI.find((x) => x === alan);
  const y = YONLER.find((x) => x === yon);
  /**
   * ⚠ ALAN TANINMIYORSA YÖN DE DÜŞER. Yalnız alanı varsayılana çekip yönü
   * korumak, kullanıcının hiç istemediği bir sıra üretirdi (ör. "ada göre
   * AZALAN") ve adres elle kurcalandığında sessizce tuhaf bir liste çıkardı.
   */
  if (!a) return VARSAYILAN_SIRA;
  return { alan: a, yon: y ?? (a === "ad" ? "artan" : "azalan") };
}

/** Sıra veritabanında `orderBy` ile çözülebiliyor mu? */
export function veritabanindaSiralanir(sira: Siralama): boolean {
  return sira.alan === "ad";
}

export type VaryantOlcumu = {
  /** Ledger toplamı — hareketi olmayan varyant için 0. */
  adet: number;
  /** En son hareketin iş anı; hiç hareket yoksa null. */
  sonHareket: Date | null;
};

/**
 * SÜZGEÇ: stoğu SIFIR OLMAYAN varyantların kimlikleri.
 *
 * ⚠ ÖLÇÜT `stoguVarMi` GÖVDESİNDE, TEK YERDE. Ekran ve Excel dışa
 * aktarması ikisi de ONU çağırıyor; ayrı yazılsalardı biri gün gelip `> 0`
 * olur ve Excel ekrandan farklı bir liste üretirdi.
 *
 * ⚠ ÖLÇÜT `!== 0`. Negatif stok bir ANOMALİDİR ve süzgeç onu gizlemez —
 * "stoğu olanlar" derken kastedilen "defterde bir bakiyesi olanlar"dır.
 * Hareketi hiç olmayan varyant bu haritada zaten YOKTUR ve doğru olarak
 * dışarıda kalır (bakiyesi sıfırdır).
 */
export function stoguVarMi(adet: number): boolean {
  return adet !== 0;
}

export function stoguOlanIdler(
  olcumler: ReadonlyMap<string, VaryantOlcumu>,
): string[] {
  const cikti: string[] = [];
  for (const [id, o] of olcumler) {
    if (stoguVarMi(o.adet)) cikti.push(id);
  }
  return cikti;
}

/**
 * SÜZGECİN TAMAMINI sıralar — sayfayı değil.
 *
 * @param idler   süzgece uyan BÜTÜN varyant kimlikleri
 * @param adlar   kimlik → sıralanacak ad (yalnız `alan === "ad"` için)
 * @param olcumler kimlik → defter ölçümü; haritada olmayan varyant 0 sayılır
 */
export function idleriSirala(
  idler: readonly string[],
  adlar: ReadonlyMap<string, string>,
  olcumler: ReadonlyMap<string, VaryantOlcumu>,
  sira: Siralama,
): string[] {
  const yonKatsayisi = sira.yon === "artan" ? 1 : -1;
  const sirali = [...idler];

  sirali.sort((a, b) => {
    if (sira.alan === "adet") {
      /** ⚠ HARİTADA YOKSA 0 — `undefined` değil. Hareketi hiç olmayan 51
       *  varyant aksi hâlde sıralamadan düşerdi. */
      const fark = (olcumler.get(a)?.adet ?? 0) - (olcumler.get(b)?.adet ?? 0);
      if (fark !== 0) return fark * yonKatsayisi;
    } else if (sira.alan === "hareket") {
      const ta = olcumler.get(a)?.sonHareket ?? null;
      const tb = olcumler.get(b)?.sonHareket ?? null;
      /**
       * ⚠ HAREKETSİZ KAYIT HER İKİ YÖNDE DE SONA GİDER — ve bu bilinçli.
       * "Hiç hareket görmemiş" bir tarih değil, tarihin YOKLUĞUDUR; onu en
       * eski sayıp başa almak, olmayan bir bilgiyi hüküm gibi göstermek
       * olurdu. _(Anayasa: bilinmeyen sıfıra çevrilmez.)_
       */
      if (ta === null && tb !== null) return 1;
      if (ta !== null && tb === null) return -1;
      if (ta !== null && tb !== null) {
        const fark = ta.getTime() - tb.getTime();
        if (fark !== 0) return fark * yonKatsayisi;
      }
    }
    /**
     * ⚠ EŞİTLİK BOZUCU HER ZAMAN AD — ve `alan === "ad"` hâlinde TEK ölçüt.
     * Olmasaydı eşit adetli satırların sırası koşumdan koşuma değişir,
     * sayfa 2'ye geçen kullanıcı aynı ürünü iki kez görebilirdi.
     */
    const adFarki = (adlar.get(a) ?? "").localeCompare(adlar.get(b) ?? "", "tr");
    if (sira.alan === "ad") return adFarki * yonKatsayisi;
    return adFarki;
  });

  return sirali;
}

/** Sıralanmış kimliklerden sayfanın dilimini alır. */
export function sayfaDilimi(
  sirali: readonly string[],
  atla: number,
  boyut: number,
): string[] {
  return sirali.slice(atla, atla + boyut);
}
