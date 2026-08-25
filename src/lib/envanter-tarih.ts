import {
  gunDegeri,
  gunEkle,
  gunMetni,
  gunMetninden,
  isTakvimGunu,
} from "@/lib/donem";

/**
 * ============================================================================
 *  TARİHLİ ENVANTER — SINIRIN SAF KURALI (K53, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _"kullanıcı tarih seçer; sistem o tarih itibarıyla kayıtlı
 *  stoku ve FIFO maliyet değerini kurar."_
 *
 *  ⚠ SINIR AÇIKÇA: **seçilen günün BAŞLANGICI itibarıyla.** 1 Haziran
 *  seçilirse 31 Mayıs'ın sonundaki hâl gösterilir; 1 Haziran'da yaşanan
 *  hiçbir hareket girmez. Bu bir tercih değil, muhasebe dilinin kendisi:
 *  "1 Haziran açılış bakiyesi" tam olarak bunu söyler.
 *
 *  ⚠ VE EKRANDA ÖRNEKLE YAZILIR. "Başlangıcı itibarıyla" cümlesi tek
 *  başına yoruma açık; ekran `31 Mayıs sonu = 1 Haziran açılışı` diye
 *  örnekliyor. Bir gün kayması, ay kapanışında bütün rakamı kaydırır.
 *
 *  ⚠ ADI "DEĞER", "SAYIM" DEĞİL — ve bu dil kuralı BEKÇİLİ. Bu ekran
 *  kayıtlardan kurulmuş bir DEFTER FOTOĞRAFIDIR; rafta ne olduğunu
 *  söylemez, deftere ne yazıldığını söyler. "Sayım" demek, yapılmamış bir
 *  işi yapılmış göstermek olurdu.
 * ============================================================================
 */

/** Ekranda yazan dil — "sayım" YASAK, bekçi bunu ölçüyor. */
export const YASAK_KELIME = "sayım";

export type TarihCozumu =
  | { tur: "BUGUN" }
  | { tur: "TARIHLI"; sinir: Date; metin: string }
  /** Geçersiz metin sessizce bugüne düşmez — kullanıcıya söylenir. */
  | { tur: "GECERSIZ"; ham: string };

/**
 * Adres çubuğundaki `?tarih=YYYY-MM-DD` → sınır.
 *
 * ⚠ BOŞ = BUGÜN, ve bu bir varsayım değil varsayılan: tarih seçilmediğinde
 * ekranın bugünü göstermesi zaten mevcut davranış.
 *
 * ⚠ GEÇERSİZ TARİH SESSİZCE BUGÜNE DÜŞMEZ. Düşseydi kullanıcı yanlış
 * yazdığı bir tarihin sonucunu DOĞRU sanırdı — ekranda "1 Hazran" yazar,
 * rakam bugünün rakamı olurdu.
 */
export function tarihCoz(ham: string | undefined): TarihCozumu {
  const metin = (ham ?? "").trim();
  if (metin === "") return { tur: "BUGUN" };

  const gun = gunMetninden(metin);
  if (!gun) return { tur: "GECERSIZ", ham: metin };

  return { tur: "TARIHLI", sinir: gun, metin: gunMetni(gun) };
}

/**
 * SEÇİLEBİLİR EN GEÇ GÜN — bugün.
 *
 * ⚠ GELECEK TARİH SEÇİLEMEZ. Seçilebilseydi ekran bugünle aynı rakamı
 * gösterir ama başlığında YARIN yazardı: doğru sayı, yanlış etiket.
 * _(Anayasa: "metin, sahip olmadığı anlamı iddia etmez.")_
 */
export function enGecGun(an: Date): string {
  return gunMetni(gunDegeri(isTakvimGunu(an)));
}

/**
 * Seçilen gün gelecekte mi?
 *
 * ⚠ BUGÜN GELECEK DEĞİLDİR — `>` kullanılıyor. `>=` olsaydı bugünü seçmek
 * reddedilir ve "bugünün açılışı" sorusu sorulamazdı; oysa o meşru bir
 * soru: bu sabah elimde ne vardı.
 */
export function gelecekMi(sinir: Date, an: Date): boolean {
  return sinir.getTime() > gunDegeri(isTakvimGunu(an)).getTime();
}

/**
 * ============================================================================
 *  ARALIK MODU — İKİ FOTOĞRAF + FARK (K53-②, Halil seçimi 26.08.2026)
 * ----------------------------------------------------------------------------
 *  Halil dört okuma arasından bunu seçti: dönem BAŞI ve dönem SONU envanteri
 *  yan yana, aralarındaki farkıyla. Muhasebecinin sorduğu klasik soru.
 *
 *  ⚠ İKİ UÇ DA AÇIKÇA SEÇİLİR — BAZ TARİH YOK (Halil şartı). Tek uç verilip
 *  öteki varsayılsaydı ekran, kullanıcının seçmediği bir sınırdan rakam
 *  üretir ve o rakam "seçtiğim dönem" diye okunurdu.
 *
 *  ── SINIRLARIN TANIMI — VE NİYE ASİMETRİK ───────────────────────────────
 *      AÇILIŞ  = başlangıç gününün BAŞI     → `sinir = bas`
 *      KAPANIŞ = bitiş gününün SONU         → `sinir = bit + 1 gün`
 *
 *  ⚠ İKİSİ AYNI KURALLA KURULSAYDI DÖNEM BİR GÜN EKSİK OLURDU: bitiş günü
 *  de dönemin İÇİNDEDİR. `1 Haziran → 31 Temmuz` seçen biri 31 Temmuz'da
 *  yaşanan alımın dışarıda kaldığını fark etmezdi — rakam makul çıkar,
 *  kimse sorgulamaz.
 *
 *  ⚠ VE BU EKRANDA ÖRNEKLE YAZILIR: sınır metni ile süzgeç AYNI GÖVDEDEN
 *  gelir (`aralikAciklamasi`), yoksa metin bir şey der, hesap başka şey
 *  yapar ve ikisi ayrıştığında yalnız metin okunur.
 * ============================================================================
 */

export type AralikCozumu =
  | { tur: "BUGUN" }
  /** Tek tarih — K53-①'in davranışı, geriye uyumlu. */
  | { tur: "TEK"; sinir: Date; metin: string }
  | {
      tur: "ARALIK";
      /** `< acilisSiniri` → dönem başındaki hâl. */
      acilisSiniri: Date;
      /** `< kapanisSiniri` → dönem sonundaki hâl (bitiş günü DAHİL). */
      kapanisSiniri: Date;
      basMetin: string;
      bitMetin: string;
    }
  | { tur: "GECERSIZ"; sebep: AralikHatasi };

export type AralikHatasi =
  /** Tarih okunamadı (bozuk metin, taşan gün). */
  | "OKUNAMADI"
  /** Bir uç seçilmiş, öteki boş — baz tarih VARSAYILMAZ. */
  | "EKSIK_UC"
  /** Başlangıç bitişten sonra. */
  | "TERS"
  /** Gelecek tarih. */
  | "GELECEK";

/**
 * `?bas=YYYY-MM-DD&bit=YYYY-MM-DD` (aralık) ya da `?tarih=...` (tek).
 *
 * ⚠ ÖNCELİK ARALIKTA: ikisi birden verilirse aralık kazanır ve bu bir
 * belirsizlik değil — aralık daha SPESİFİK bir istektir.
 *
 * ⚠ HİÇBİR HATA SESSİZCE BUGÜNE DÜŞMEZ. Düşseydi kullanıcı yanlış yazdığı
 * bir dönemin sonucunu DOĞRU sanırdı.
 */
export function aralikCoz(
  ham: { tarih?: string; bas?: string; bit?: string },
  an: Date,
): AralikCozumu {
  const basHam = (ham.bas ?? "").trim();
  const bitHam = (ham.bit ?? "").trim();

  /** Aralık hiç istenmemiş — tek tarih ya da bugün. */
  if (basHam === "" && bitHam === "") {
    const tek = tarihCoz(ham.tarih);
    if (tek.tur === "BUGUN") return { tur: "BUGUN" };
    if (tek.tur === "GECERSIZ") return { tur: "GECERSIZ", sebep: "OKUNAMADI" };
    if (gelecekMi(tek.sinir, an)) return { tur: "GECERSIZ", sebep: "GELECEK" };
    return { tur: "TEK", sinir: tek.sinir, metin: tek.metin };
  }

  /**
   * ⚠ TEK UÇ = HATA, VARSAYIM DEĞİL. "Başlangıçtan bugüne" ya da "en
   * baştan bitişe" diye tamamlamak, kullanıcının seçmediği bir sınırdan
   * rakam üretmek olurdu (Halil şartı: baz tarih kabul edilemez).
   */
  if (basHam === "" || bitHam === "") {
    return { tur: "GECERSIZ", sebep: "EKSIK_UC" };
  }

  const bas = gunMetninden(basHam);
  const bit = gunMetninden(bitHam);
  if (!bas || !bit) return { tur: "GECERSIZ", sebep: "OKUNAMADI" };

  /** ⚠ AYNI GÜN GEÇERLİ: tek günlük dönem meşrudur (o gün ne oldu). */
  if (bas.getTime() > bit.getTime()) return { tur: "GECERSIZ", sebep: "TERS" };

  if (gelecekMi(bas, an) || gelecekMi(bit, an)) {
    return { tur: "GECERSIZ", sebep: "GELECEK" };
  }

  return {
    tur: "ARALIK",
    acilisSiniri: bas,
    /**
     * ⚠ BİTİŞ GÜNÜ DÖNEME DAHİL — sınır ERTESİ GÜNÜN BAŞI. Gün başı
     * yapılsaydı bitiş gününün hareketleri kaybolurdu ve rakam bir gün
     * eksik çıkardı; makul göründüğü için de kimse sorgulamazdı.
     */
    kapanisSiniri: gunEkle(bit, 1),
    basMetin: gunMetni(bas),
    bitMetin: gunMetni(bit),
  };
}

/**
 * SINIR METNİNİN KAYNAĞI — ekranda yazan cümle ile süzgeç AYNI YERDEN.
 *
 * ⚠ İKİSİ AYRI YAZILSAYDI metin bir şey der, hesap başka şey yapar ve
 * ayrıştıklarında yalnız METİN okunur: kullanıcı yanlış dönemin rakamına
 * doğru etiketle bakar.
 */
export function aralikAciklamasi(a: {
  basMetin: string;
  bitMetin: string;
}): { bas: string; bit: string } {
  return { bas: a.basMetin, bit: a.bitMetin };
}

