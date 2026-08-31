/**
 * ============================================================================
 *  MALİYET YÖNTEMİ — SAF HESAP (K107, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı: yöntem seçeneği AÇILIYOR. Erteleme kalktı.
 *
 *  ⚠ ENDİŞE KAYITTA, TEKRARLANMIYOR: hareketli ortalama parti kavramını
 *  ortadan kaldırır — `sourceMovementId` boş kalır, parti kodu ve lot
 *  izlenebilirliği o firmada çalışmaz. Ölçüldü (31.08): bugün çıkışların
 *  %100'ü partiye bağlı. Karar firmanın, sorumluluk firmanın, kayıt sistemin.
 *
 *  ── ⛔ LIFO KAPSAM DIŞI ────────────────────────────────────────────────
 *  Ölçülmedi, tartışılmadı, buraya konmadı. VUK ve TMS 2'de yasak; sisteme
 *  koymak kullanılamayacak bir yöntemi taşımak ve her bekçiye ÜÇÜNCÜ bir
 *  şart eklemek olurdu.
 *
 *  ── ⭐ NİYE "HAREKETLİ", BASİT ORTALAMA DEĞİL ──────────────────────────
 *  Basit (dönem sonu) ortalama, maliyeti ancak dönem kapanınca bilir. Üç
 *  şeyi birden kırardı:
 *    · fiyat denemesi ANLIK maliyet istiyor (`kalem-bilgisi.ts`)
 *    · NET satış anında snapshot'lanıyor — sonradan yazılamaz
 *    · dönem içindeki her satış `NO_COST` damgalanırdı ve anayasa
 *      bilinmeyeni sıfıra çevirmeyi yasaklıyor
 *  Hareketli ortalama her girişte tazelenir; satış anında maliyet HAZIRDIR.
 *
 *  ── ⚠ BU DOSYA VERİTABANINA GİTMEZ ────────────────────────────────────
 *  Hareket listesini ÇAĞIRAN verir. Böylece bekçi gövdeyi çağırıp DEĞERİNİ
 *  ölçebiliyor; kaynak taramaya gerek kalmıyor.
 *  _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 * ============================================================================
 */

export const MALIYET_YONTEMLERI = ["FIFO", "HAREKETLI_ORTALAMA"] as const;
export type MaliyetYontemi = (typeof MALIYET_YONTEMLERI)[number];

/**
 * ⚠ VARSAYILAN FIFO — VE BU BİR TERCİH DEĞİL, MEVCUT DURUMUN KORUNMASI.
 * Bugün canlıda tek firma var ve FIFO ile çalışıyor; varsayılan başka bir
 * şey olsaydı yöntem sütunu eklendiği ANDA bütün maliyetler sessizce
 * değişirdi.
 */
export const VARSAYILAN_MALIYET_YONTEMI: MaliyetYontemi = "FIFO";

export function maliyetYontemiCoz(ham: string | null | undefined): MaliyetYontemi {
  return (MALIYET_YONTEMLERI as readonly string[]).includes(ham ?? "")
    ? (ham as MaliyetYontemi)
    : VARSAYILAN_MALIYET_YONTEMI;
}

/** Ortalamayı besleyen hareket — sıra ÇAĞIRANIN sorumluluğunda. */
export type OrtalamaHareketi = {
  /** Pozitif = giriş, negatif = çıkış. */
  quantityDelta: number;
  /** Girişin birim maliyeti (Decimal dizesi). Çıkışta yok sayılır. */
  birimMaliyet: string | null;
};

export type OrtalamaSonucu =
  /** Ortalama hesaplandı — satış anında damgalanacak değer. */
  | { durum: "HESAPLANDI"; birimMaliyet: number; adet: number }
  /** Stok yok — ortalama tanımsızdır (sıfır DEĞİL). */
  | { durum: "STOK_YOK" }
  /**
   * Maliyeti bilinmeyen bir GİRİŞ var → ortalama kirlenir.
   * ⛔ Bilinmeyeni sıfır sayıp ortalamayı düşürmek "bedava mal" demek olurdu.
   */
  | { durum: "MALIYET_EKSIK" };

/**
 * SÜREKLİ (PERPETUAL) AĞIRLIKLI ORTALAMA.
 *
 * Kural:
 *   giriş  → ortalama = (mevcut değer + giren değer) / (mevcut adet + giren adet)
 *   çıkış  → ADET düşer, ORTALAMA DEĞİŞMEZ
 *
 * ⚠ ÇIKIŞ ORTALAMAYI DEĞİŞTİRMEZ — ve bu yöntemin tanımıdır, kısayol değil.
 * Çıkış ortalamadan değerlenir; kendi değerini ortalamadan çıkarmak ortalamayı
 * oynatmaz. Oynatan bir gövde, satış yaptıkça maliyeti kaydırırdı.
 *
 * ⚠ ADET SIFIRA DÜŞÜNCE ORTALAMA SIFIRLANIR. Elde mal yokken taşınan bir
 * ortalama, aylar sonra gelen ilk girişle karışır ve kimsenin açıklayamayacağı
 * bir maliyet üretir. Stok bitti = geçmiş kapandı.
 *
 * ⚠ SIRA ÇAĞIRANDAN GELİR ve KRİTİKTİR: hareketler İŞ TARİHİNE göre sıralı
 * olmalı. Sırasız liste, geleceğin girişini geçmişin ortalamasına katar —
 * FIFO'da 29.08'de yaşanan sınır hatasının ortalama tarafındaki karşılığı.
 * Gövde sıralamayı KENDİ YAPMAZ: veriyi çağıran biliyor, ve iki yerde iki
 * sıralama ölçütü doğmasın.
 */
export function hareketliOrtalama(
  hareketler: readonly OrtalamaHareketi[],
): OrtalamaSonucu {
  let adet = 0;
  /** Elde kalan malın TOPLAM değeri — ortalama buradan türer. */
  let deger = 0;

  for (const h of hareketler) {
    if (h.quantityDelta > 0) {
      /**
       * ⛔ MALİYETSİZ GİRİŞ ORTALAMAYI KİRLETİR — ve sessizce geçilmez.
       * `null`u 0 saymak ortalamayı aşağı çeker ve kârı YÜKSEK gösterir;
       * girişi atlamak adedi eksik bırakır ve ortalamayı YUKARI çeker.
       * İkisi de yanlış; doğru cevap "bilmiyorum".
       */
      if (h.birimMaliyet === null) return { durum: "MALIYET_EKSIK" };
      const birim = Number(h.birimMaliyet);
      if (!Number.isFinite(birim)) return { durum: "MALIYET_EKSIK" };
      deger += birim * h.quantityDelta;
      adet += h.quantityDelta;
      continue;
    }

    if (h.quantityDelta < 0) {
      const cikan = Math.min(adet, -h.quantityDelta);
      /**
       * ⚠ ORTALAMA SABİT TUTULARAK DEĞER DÜŞÜLÜYOR. `deger -= ortalama × cikan`
       * yazılsaydı kayan nokta kuyruğu her çıkışta ortalamayı biraz kaydırırdı;
       * oran olarak düşmek ortalamayı KURUŞUNA korur.
       */
      if (adet > 0) deger -= (deger / adet) * cikan;
      adet -= cikan;
      /**
       * ⚠ SIFIRA DÜŞTÜ → GEÇMİŞ KAPANDI. Kalan kuruş tozu da siliniyor;
       * yoksa "adet 0 ama değer 0,0001" gibi bir kalıntı bir sonraki girişin
       * ortalamasına sızardı.
       */
      if (adet === 0) deger = 0;
      continue;
    }
    /** `0` delta bir hareket değildir; sessizce atlanır. */
  }

  if (adet <= 0) return { durum: "STOK_YOK" };
  return { durum: "HESAPLANDI", birimMaliyet: deger / adet, adet };
}

/**
 * ⛔ BUGÜN SEÇİLEBİLEN YÖNTEMLER — KAPI, LİSTE DEĞİL.
 *
 * Kullanıcı şartı (31.08.2026): _"bekçiler koşullanmadan
 * `HAREKETLI_ORTALAMA` seçilebilir olmaz."_
 *
 * ⚠ EKRANDAN GİZLEMEK YETMEZ: seçeneği listelemesek de bir POST isteği
 * yeter. Yazma gövdesi bu listeye bakıp reddediyor — kapı SUNUCUDA.
 *
 * ⚠ VE BURADA, SAF MODÜLDE: `"use server"` dosyasından dışa aktarılan her
 * şey ağdan çağrılabilir bir uçtur. Sabit bir liste için yetki kontrolü
 * yazmak yanlış cevaptı; doğrusu onu hiç uç yapmamak.
 * _(`yetki:dogrula` bunu yakaladı ve haklıydı.)_
 *
 * Bekçiler yöntem-koşullu hâle geldiği gün burası `MALIYET_YONTEMLERI`
 * olur ve bu blok silinir.
 */
export const ACIK_YONTEMLER: readonly MaliyetYontemi[] = ["FIFO"];
