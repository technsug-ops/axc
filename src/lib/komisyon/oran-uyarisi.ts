import { dilimBul, type TarifeDilimi } from "./tarife-okuyucu";

/**
 * ============================================================================
 *  KOMİSYON ORANI UYARISI — SATIŞ FORMU
 * ----------------------------------------------------------------------------
 *  ⚠⚠ EŞİK 20.08.2026'DA ÇÜRÜDÜ — ÖNCE BUNU OKU.
 *
 *  İlk sürüm "oran %3'ün altındaysa şüphelidir" diyordu ve dört satışı
 *  (%2,70) işaretliyordu. Kullanıcı düzeltti: **o oranlar DOĞRU.**
 *
 *  Trendyol her Salı komisyon tarifesi yayımlıyor ve haftayı ikiye bölüyor
 *  (3 gün + 4 gün). Bazı ürünlere **fiyat indirimi karşılığı komisyon
 *  indirimi** tanımlıyor: _"2.000 TL'ye %10 alırım, 1.750 TL'ye satarsan
 *  %7 alırım."_ Yani düşük oran bir hata değil, **kanalın teklif ettiği
 *  mekanizmanın sonucu.**
 *
 *  ── ESKİ GEREKÇE, NİYE ÇÜRÜDÜĞÜYLE BİRLİKTE ─────────────────────────────
 *  Eşik şöyle savunuluyordu: _"18.08.2026 canlı ölçümü — Trendyol %3,6–%23
 *  … görülmüş en düşük oran %3,6; eşik onun altına, %3'e konuldu."_
 *
 *  Ölçüm gerçekti ama **YANLIŞ POPÜLASYONDAN**: `ChannelSku` tek
 *  oranlarından alınmıştı. Dilim tarifesi bir gün SONRA (19.08) yüklendi ve
 *  oralarda oran çok daha aşağı iniyor (Fiorino: %21 → %8,4 → %4,5 → %4,2).
 *  Eşik, ölçüldüğü kümenin dışına uygulandı.
 *
 *  ── SABİT SAYI BU İŞİ YAPAMAZ — AMA TABAN VERİDEN GELİRSE YAPAR ─────────
 *  Eşiği %2'ye çekmek çözmezdi: indirim mekanizması oranı ilkece istediği
 *  kadar aşağı çekebilir. Bu yüzden SABİT eşik kaldırıldı.
 *
 *  Yerine **veriden gelen taban** kondu (kullanıcı kararı 20.08.2026):
 *  o kanalın YÜKLÜ TARİFESİNDE görülmüş en düşük oran. Artık eşik doğru
 *  popülasyondan ölçülüyor ve tarife her yüklendiğinde KENDİLİĞİNDEN
 *  tazeleniyor — bir daha "18.08'de ölçtüm, 19.08'de küme değişti"
 *  durumuna düşülmez.
 *
 *  Tarife hiç yoksa taban da yoktur ve **düşüklük hükmü verilmez.**
 *
 *  ── DOĞRU ÖLÇÜT: ORANIN KENDİ TARİFESİYLE KARŞILAŞTIRILMASI ─────────────
 *  Soru "oran düşük mü" değil, **"oran o ürünün O FİYATTAKİ diliminde
 *  yazan oran mı"**. Tarife elimizdeyse cevap kesindir. Elimizde değilse
 *  HÜKÜM VERİLMEZ — sistem, kendi defterinde takip etmediği şey hakkında
 *  iddia kurmaz.
 *
 *  ── UYARI, ENGEL DEĞİL ──────────────────────────────────────────────────
 *  Sapma gerçek olabilir (özel anlaşma, kampanya dışı). Kaydı DURDURMAK
 *  operasyoncuyu kilitler. Doğrusu: görünür uyarı + serbest kayıt.
 * ============================================================================
 */

/**
 * Öneriden/dilimden bu kadar PUAN sapma dikkat ister.
 *
 * ⚠ Dilim karşılaştırmasında tolerans DAR olmalı: dilim oranı kanalın
 * yayımladığı kesin değerdir, "yaklaşık" değil. Kuruş/yuvarlama payı için
 * küçük bir pencere bırakılıyor, o kadar.
 */
export const SAPMA_ESIGI = 5;

/** Dilim oranıyla kıyasta kabul edilen fark (puan). */
export const DILIM_TOLERANSI = 0.05;

export type OranZemini = {
  /** Formdaki oran. Boşsa null. */
  girilen: number | null;
  /** Kanal SKU'sundaki kayıtlı tek oran. Kayıt yoksa null. */
  onerilen: number | null;
  /** O ürünün o kanaldaki dilim tarifesi. Yoksa null. */
  dilimler: TarifeDilimi[] | null;
  /** Formdaki birim satış fiyatı — dilimi çözmek için. Yoksa null. */
  fiyat: number | null;
  /**
   * ⚠ TABAN VERİDEN GELİR, SABİT DEĞİL.
   * O kanalın yüklü tarifesindeki EN DÜŞÜK oran. Bunun altı, kanalın
   * hiçbir ürün için yayımlamadığı bir orandır — indirim mekanizması bile
   * oraya inmiyor demektir.
   *
   * Tarife yoksa `null` ve düşüklük hükmü VERİLMEZ.
   */
  tarifeTabani: number | null;
};

export type OranUyarisi =
  | { tur: "KAYNAK_YOK" }
  | { tur: "SUPHELI_DUSUK"; girilen: number; taban: number }
  | {
      tur: "DILIMDEN_SAPTI";
      girilen: number;
      beklenen: number;
      dilimSira: number;
      fark: number;
    }
  | { tur: "ONERIDEN_SAPTI"; girilen: number; onerilen: number; fark: number };

/**
 * Girilen oran için uyarı üretir. Uyarı YOKSA `null` — her satırda bir şey
 * yazmak, hiçbir şey yazmamakla aynı kapıya çıkar.
 *
 * ⚠ SIRA ÖNEMLİ: dilim tarifesi varsa ölçüt ODUR. Kanal SKU'sundaki tek
 * oran, dilimli bir üründe zaten yanlış cevaptır (Philips: kayıtlı oran
 * %15, dilimden gelen %2,70 — ikisi de doğru, farklı sorulara).
 */
export function oranUyarisi(zemin: OranZemini): OranUyarisi | null {
  const { girilen, onerilen, dilimler, fiyat, tarifeTabani } = zemin;

  /**
   * ⚠ ÖNCE "KAYNAK VAR MIYDI". Ne kanal kaydı ne tarife varsa kullanıcı
   * KÖRÜNE yazıyor demektir; asıl vaka buydu ve hâlâ geçerli.
   */
  const tarifeVar = dilimler !== null && dilimler.length > 0;
  if (onerilen === null && !tarifeVar && tarifeTabani === null) {
    return girilen === null ? null : { tur: "KAYNAK_YOK" };
  }

  if (girilen === null) return null;

  /**
   * ── DİLİM ÖLÇÜTÜ — kesin cevap ────────────────────────────────────────
   * Fiyat biliniyorsa hangi dilimde olduğumuz belli, o dilimin oranı da.
   * Girilen oran onunla tutuyorsa DOĞRUDUR — ne kadar düşük olursa olsun.
   */
  if (tarifeVar && fiyat !== null && fiyat > 0) {
    const dilim = dilimBul(dilimler, fiyat);
    if (dilim) {
      const fark = Math.abs(girilen - dilim.oran);
      if (fark <= DILIM_TOLERANSI) return null;
      return {
        tur: "DILIMDEN_SAPTI",
        girilen,
        beklenen: dilim.oran,
        dilimSira: dilim.sira,
        fark: Math.round(fark * 100) / 100,
      };
    }
  }

  /**
   * ── TARİFE TABANININ ALTI — ŞÜPHELİ DÜŞÜK ─────────────────────────────
   * ⚠ ÖLÇÜT SABİT SAYI DEĞİL, KANALIN KENDİ TARİFESİ. Taban, o kanalın
   * yüklü tarifesindeki en düşük orandır; altına inmek, kanalın HİÇBİR
   * ürün için yayımlamadığı bir oran demektir.
   *
   * Bu, dilim kıyasından SONRA gelir: dilimde yazan oran ne kadar düşük
   * olursa olsun doğrudur ve yukarıda zaten `null` dönmüştür.
   */
  if (tarifeTabani !== null && girilen < tarifeTabani) {
    return { tur: "SUPHELI_DUSUK", girilen, taban: tarifeTabani };
  }

  /**
   * ── SON: kanal SKU'suyla kıyas ────────────────────────────────────────
   * Tarife hiç yoksa buraya düşülür ve DÜŞÜKLÜK hükmü verilmez — o hafta
   * indirim tanımlanmış, dosyası bizde olmayabilir.
   */
  if (onerilen === null) return { tur: "KAYNAK_YOK" };

  const fark = Math.abs(girilen - onerilen);
  if (fark > SAPMA_ESIGI) {
    return {
      tur: "ONERIDEN_SAPTI",
      girilen,
      onerilen,
      fark: Math.round(fark * 100) / 100,
    };
  }

  return null;
}
