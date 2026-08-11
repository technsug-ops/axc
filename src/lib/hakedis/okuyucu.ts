import type { Currency } from "@/generated/prisma/enums";
import { gunDegeri } from "@/lib/donem";

import {
  type HakedisKodu,
  type HakedisOkumasi,
  type HakedisSatiri,
} from "./model";

/**
 * ============================================================================
 *  HAKEDİŞ OKUYUCULARI — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ, dosya AÇMAZ. Girdi: elektronik tablodan okunmuş
 *  ham hücre dizileri. Böylece gerçek dosya olmadan da sınanabilir.
 *
 *  BAŞLIK EŞLEŞTİRME TOLERANSLI: pazaryerleri kolon başlıklarını haber
 *  vermeden değiştirir — fazladan boşluk, büyük/küçük harf, "İ" yerine "I".
 *  Birebir eşleştirme yapılsaydı tek boşluk yüzünden okuyucu tutmazdı ve
 *  hata "kolon yok" diye görünürdü. Bu yüzden başlıklar normalize edilerek
 *  karşılaştırılır.
 * ============================================================================
 */

/** Başlık karşılaştırma anahtarı: Türkçe küçük harf, tek boşluk, sadeleşmiş. */
export function basligiNormalle(ham: string): string {
  return String(ham ?? "")
    .replace(/ /g, " ") // kırılmaz boşluk
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/\s+/g, " ");
}

/** Başlık satırından "normalize başlık → kolon sırası" haritası. */
export function basliklariDizinle(basliklar: unknown[]): Map<string, number> {
  const dizin = new Map<string, number>();
  basliklar.forEach((b, i) => {
    const anahtar = basligiNormalle(String(b ?? ""));
    if (anahtar !== "" && !dizin.has(anahtar)) dizin.set(anahtar, i);
  });
  return dizin;
}

/**
 * "1.234,56" · "1234.56" · "-52,87" · 1958 → sayı.
 * Elektronik tabloda tutar hem sayı hem metin gelebilir.
 */
export function sayiCoz(ham: unknown): number | null {
  if (typeof ham === "number") return Number.isFinite(ham) ? ham : null;
  const metin = String(ham ?? "")
    .replace(/\s|₺|TL/gi, "")
    .trim();
  if (metin === "") return null;

  // Binlik ayıracı nokta, ondalık virgül (TR) — ama "1234.56" de gelebilir.
  const trBicim = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(metin);
  const sade = trBicim
    ? metin.replace(/\./g, "").replace(",", ".")
    : metin.replace(",", ".");

  const sayi = Number(sade);
  return Number.isFinite(sayi) ? sayi : null;
}

/**
 * "10.08.2026" · "2026-08-10" · Date → UTC gece yarısı.
 * İş tarihleri saat taşımaz (donem.ts kuralı).
 */
export function tarihCoz(ham: unknown): Date | null {
  if (ham instanceof Date) {
    return gunDegeri({
      yil: ham.getUTCFullYear(),
      ay: ham.getUTCMonth() + 1,
      gun: ham.getUTCDate(),
    });
  }
  const metin = String(ham ?? "").trim();
  if (metin === "") return null;

  const noktali = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/.exec(metin);
  if (noktali) {
    return gunDegeri({
      yil: Number(noktali[3]),
      ay: Number(noktali[2]),
      gun: Number(noktali[1]),
    });
  }
  const tireli = /^(\d{4})-(\d{2})-(\d{2})/.exec(metin);
  if (tireli) {
    return gunDegeri({
      yil: Number(tireli[1]),
      ay: Number(tireli[2]),
      gun: Number(tireli[3]),
    });
  }
  return null;
}

/** Boş/anlamsız hücre mi? */
const bos = (d: unknown) => String(d ?? "").trim() === "";

// ---------------------------------------------------------------------------
//  TRENDYOL — GENİŞ FORMAT
// ---------------------------------------------------------------------------

/** TY "İşlem Tipi" → ortak kod. Normalize edilmiş metinle eşleşir. */
const TY_TIPLER: Record<string, HakedisKodu> = {
  "satış": "SIPARIS_TUTARI",
  "kupon": "KUPON",
  "e-ticaret stopajı": "ETICARET_STOPAJI",
  "kargo fatura": "KARGO_FATURA",
  "platform hizmet bedeli": "PLATFORM_HIZMET",
  "kurumsal fatura - trendyol kupon": "KUPON",
};

const TY_SUTUNLAR = {
  kayitNo: "kayıt no",
  ulke: "ülke",
  islemTipi: "işlem tipi",
  siparisNo: "sipariş no",
  barkod: "barkod",
  saticiHakedis: "satıcı hakediş",
  vadeTarihi: "vade tarihi",
  toplamTutar: "toplam tutar",
} as const;

export function trendyolOku(satirlar: unknown[][]): HakedisOkumasi {
  const eksikSutunlar: string[] = [];
  if (satirlar.length === 0) {
    return { kanal: "TRENDYOL", satirlar: [], eksikSutunlar: ["(dosya boş)"] };
  }

  const dizin = basliklariDizinle(satirlar[0]);
  const al = (anahtar: string) => {
    const sira = dizin.get(anahtar);
    if (sira === undefined) eksikSutunlar.push(anahtar);
    return sira;
  };

  const s = {
    kayitNo: al(TY_SUTUNLAR.kayitNo),
    ulke: dizin.get(TY_SUTUNLAR.ulke),
    islemTipi: al(TY_SUTUNLAR.islemTipi),
    siparisNo: al(TY_SUTUNLAR.siparisNo),
    barkod: dizin.get(TY_SUTUNLAR.barkod),
    hakedis: al(TY_SUTUNLAR.saticiHakedis),
    vade: al(TY_SUTUNLAR.vadeTarihi),
    toplam: dizin.get(TY_SUTUNLAR.toplamTutar),
  };

  if (eksikSutunlar.length > 0) {
    return { kanal: "TRENDYOL", satirlar: [], eksikSutunlar };
  }

  const cikti: HakedisSatiri[] = [];

  for (let i = 1; i < satirlar.length; i++) {
    const satir = satirlar[i];
    const hucre = (sira: number | undefined) =>
      sira === undefined ? undefined : satir[sira];

    const kayitNo = String(hucre(s.kayitNo) ?? "").trim();
    const hamTip = String(hucre(s.islemTipi) ?? "").trim();
    // Kayıt no'su ve tipi olmayan satır GENEL TOPLAM ya da boş satırdır.
    if (kayitNo === "" || hamTip === "") continue;

    const kod = TY_TIPLER[basligiNormalle(hamTip)] ?? "DIGER";
    const siparisNo = bos(hucre(s.siparisNo))
      ? null
      : String(hucre(s.siparisNo)).trim();

    cikti.push({
      externalId: kayitNo,
      kod,
      hamTip,
      siparisNo,
      // TY'de satıcının eline geçen tutar "Satıcı Hakediş" kolonudur.
      tutar: sayiCoz(hucre(s.hakedis)) ?? 0,
      paraBirimi: ulkedenParaBirimi(),
      vadeTarihi: tarihCoz(hucre(s.vade)),
      // TY raporunda GERÇEKLEŞEN ödeme tarihi YOK — yalnız vade var.
      odemeTarihi: null,
      urunKodu: bos(hucre(s.barkod)) ? null : String(hucre(s.barkod)).trim(),
      satirNo: i + 1,
      ham: `${hamTip} · ${siparisNo ?? "-"} · ${hucre(s.toplam) ?? "-"}`,
    });
  }

  return { kanal: "TRENDYOL", satirlar: cikti, eksikSutunlar: [] };
}

/**
 * TY'de para birimi kolonu YOK.
 *
 * Kullanıcı kararı 11.08.2026: Ülke=Türkiye → TRY. Başka bir ülke değeri
 * gelirse yine TRY yazılır AMA satır uyarı listesine düşer (`turkiyeDisiMi`).
 * Kur uydurulmaz; kullanıcı görüp karar verir — anayasa kuralı.
 *
 * Bu yüzden fonksiyon bugün sabit döner: ülke bilgisi karar için değil,
 * UYARI için kullanılıyor. İleride TY çok para birimli rapor verirse
 * dönüşüm burada olur.
 */
export function ulkedenParaBirimi(): Currency {
  return "TRY";
}

export function turkiyeDisiMi(ulke: string): boolean {
  const u = basligiNormalle(ulke);
  return u !== "" && u !== "türkiye" && u !== "turkiye" && u !== "tr";
}

// ---------------------------------------------------------------------------
//  HEPSİBURADA — UZUN FORMAT
// ---------------------------------------------------------------------------

/** HB "Kayıt Tipi" → ortak kod. */
const HB_TIPLER: Record<string, HakedisKodu> = {
  "sipariş tutarı": "SIPARIS_TUTARI",
  "komisyon tutarı": "KOMISYON",
  "kargo bedeli": "KARGO",
  "tahsilat yönetim bedeli": "TAHSILAT_BEDELI",
  "mp stopaj": "STOPAJ",
  "kampanya indirimleri": "KAMPANYA",
  "hizmet bedeli": "HIZMET_BEDELI",
  "iade tutarı": "IADE_TUTARI",
  "komisyon iadesi": "KOMISYON_IADE",
  "mp stopaj iade": "STOPAJ_IADE",
  "kargo bedeli (iade)": "KARGO_IADE",
  "tahsilat yön. bedeli iadesi": "TAHSILAT_BEDELI_IADE",
  "kampanya ind. iadesi": "KAMPANYA_IADE",
  "hizmet bedeli (iade)": "HIZMET_BEDELI_IADE",
  "hurda geliri": "HURDA_GELIRI",
};

const HB_SUTUNLAR = {
  durum: "durum",
  odemeTarihi: "ödeme tarihi",
  kayitNo: "kayıt no",
  kayitTipi: "kayıt tipi",
  vadeTarihi: "vade tarihi",
  tutar: "tutar",
  paraBirimi: "para birimi",
  siparisNo: "sipariş no",
  urunNo: "ürün no (sku)",
  kayitTuru: "kayıt türü",
} as const;

export function hepsiburadaOku(satirlar: unknown[][]): HakedisOkumasi {
  const eksikSutunlar: string[] = [];
  if (satirlar.length === 0) {
    return {
      kanal: "HEPSIBURADA",
      satirlar: [],
      eksikSutunlar: ["(dosya boş)"],
    };
  }

  const dizin = basliklariDizinle(satirlar[0]);
  const al = (anahtar: string) => {
    const sira = dizin.get(anahtar);
    if (sira === undefined) eksikSutunlar.push(anahtar);
    return sira;
  };

  const s = {
    durum: dizin.get(HB_SUTUNLAR.durum),
    odeme: dizin.get(HB_SUTUNLAR.odemeTarihi),
    kayitNo: al(HB_SUTUNLAR.kayitNo),
    kayitTipi: al(HB_SUTUNLAR.kayitTipi),
    vade: dizin.get(HB_SUTUNLAR.vadeTarihi),
    tutar: al(HB_SUTUNLAR.tutar),
    paraBirimi: dizin.get(HB_SUTUNLAR.paraBirimi),
    siparisNo: al(HB_SUTUNLAR.siparisNo),
    urunNo: dizin.get(HB_SUTUNLAR.urunNo),
    kayitTuru: dizin.get(HB_SUTUNLAR.kayitTuru),
  };

  if (eksikSutunlar.length > 0) {
    return { kanal: "HEPSIBURADA", satirlar: [], eksikSutunlar };
  }

  const cikti: HakedisSatiri[] = [];

  for (let i = 1; i < satirlar.length; i++) {
    const satir = satirlar[i];
    const hucre = (sira: number | undefined) =>
      sira === undefined ? undefined : satir[sira];

    const kayitNo = String(hucre(s.kayitNo) ?? "").trim();
    const hamTip = String(hucre(s.kayitTipi) ?? "").trim();
    // SON SATIR TİPSİZ GENEL TOPLAMDIR — atlanır.
    if (kayitNo === "" || hamTip === "") continue;

    const kod = HB_TIPLER[basligiNormalle(hamTip)] ?? "DIGER";

    /**
     * İŞARET TEKLEŞTİRME: HB tutarları pozitif verip yönü "Kayıt Türü"
     * kolonunda söylüyor (Gelir/Gider). İç modelde gider NEGATİF.
     * Dosya zaten negatif verdiyse tekrar çevrilmez.
     */
    const hamTutar = sayiCoz(hucre(s.tutar)) ?? 0;
    const giderMi = basligiNormalle(String(hucre(s.kayitTuru) ?? "")) === "gider";
    const tutar = giderMi && hamTutar > 0 ? -hamTutar : hamTutar;

    const paraKod = String(hucre(s.paraBirimi) ?? "").trim().toUpperCase();

    cikti.push({
      externalId: kayitNo,
      kod,
      hamTip,
      siparisNo: bos(hucre(s.siparisNo))
        ? null
        : String(hucre(s.siparisNo)).trim(),
      tutar,
      paraBirimi: paraKod === "EUR" ? "EUR" : "TRY",
      vadeTarihi: tarihCoz(hucre(s.vade)),
      // "Durum: Ödendi" + Ödeme Tarihi = gerçekleşen ödeme.
      // Ödenmemişse tarih boş kalır ve kalem BEKLEYEN sayılır.
      odemeTarihi: tarihCoz(hucre(s.odeme)),
      urunKodu: bos(hucre(s.urunNo)) ? null : String(hucre(s.urunNo)).trim(),
      satirNo: i + 1,
      ham: `${hamTip} · ${hucre(s.siparisNo) ?? "-"} · ${hamTutar}`,
    });
  }

  return { kanal: "HEPSIBURADA", satirlar: cikti, eksikSutunlar: [] };
}
