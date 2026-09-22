"use server";

import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { simulasyonKarsilastir } from "@/lib/simulasyon/karsilastir";
import { urunZemini } from "@/lib/simulasyon/urun-zemini";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  DİLİM BAŞINA NET — SUNUCU EYLEMİ (K228, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ YENİ HESAP YAZILMIYOR. Kâr, fiyat denemesinin MEVCUT motorundan
 *  (`simulasyonKarsilastir`) geliyor; maliyet ve KDV `urunZemini`den.
 *  İkinci bir NET hesabı yazılsaydı iki ekran aynı ürün için iki farklı
 *  rakam gösterebilirdi — ve hangisinin doğru olduğu sorulamazdı.
 *
 *  ── NİYE VAR ───────────────────────────────────────────────────────────
 *  Pazaryeri paneli "fiyatı 1.621'e düşür, komisyon %6 olsun" diyor. Bu
 *  cümle CAZİP görünür ve pazaryeri onu bilerek cazip gösterir — ama senin
 *  MALİYETİNİ bilmiyor. %6 komisyonla satış, %18'lik satıştan daha az kâr
 *  bırakabilir. Karar veren rakam komisyon değil, NET'tir.
 *
 *  ⚠ KARGO SORULUYOR, UYDURULMUYOR. `urunZemini` kargo taşımıyor (ölçüldü:
 *  maliyet · KDV · son satış var, kargo YOK) ve desi bazlı tarife bu ekranın
 *  işi değil. Kullanıcı girmezse NET hesaplanmaz — sıfır varsayılsaydı her
 *  dilim olduğundan kârlı görünürdü.
 * ============================================================================
 */

export type DilimGirdisi = {
  sira: number;
  /** Dilimin üst sınırı; `null` ise üst uç AÇIK (bugünkü fiyat dilimi). */
  ust: number | null;
  oran: number;
};

export type DilimNetSatiri = {
  sira: number;
  /** Hangi fiyat üzerinden hesaplandı. */
  fiyat: number | null;
  /** Fiyat üst sınırdan mı, son satıştan mı, kullanıcının girdiğinden mi — etiketiyle taşınır. */
  fiyatKaynagi: "DILIM_USTU" | "SON_SATIS" | "GIRILEN" | "YOK";
  oran: number | null;
  oranKaynagi: string;
  net1: number | null;
  net2: number | null;
};

export type DilimNetSonucu =
  | { durum: "URUN_YOK" }
  | { durum: "MALIYET_YOK"; urunAdi: string }
  | {
      durum: "TAMAM";
      urunAdi: string;
      maliyet: number;
      kdvOrani: number;
      sonSatisFiyati: number | null;
      satirlar: DilimNetSatiri[];
      /**
       * K234-② — ŞU ANKİ FİYATIN NET'İ. Kullanıcı 22.09: "son satış fiyatı
       * var ama güncel olmayabilir." Sistem kanal satış fiyatını TUTMUYOR
       * (ölçüldü: `ChannelSku`te fiyat alanı yok, listeleme senkronu da
       * fiyat çekmiyor) — bu yüzden fiyat SORULUR; boş bırakılırsa o
       * kanaldaki son satış kullanılır ve öyle etiketlenir. Oran, fiyatın
       * düştüğü dilimden motor tarafından çözülür (kullanıcı dilim seçmez).
       */
      guncel: DilimNetSatiri | null;
      /** Son satışın günü — "güncel olmayabilir" uyarısının ölçüsü ekranda yazsın. */
      sonSatisTarihi: Date | null;
    };

export async function dilimNetleri(girdi: {
  kod: string;
  /**
   * ⛔ KANAL **KODU**, ADI DEĞİL (ölçüldü 21.09.2026 — kendi kodumda aynı
   * tuzak). Motor kanal fiyatını `SIMULASYON_KANALLARI`nin **kod**uyla arıyor
   * (`elleFiyat(k.kod, ...)`). Ad gönderilirse Hepsiburada'da eşleşme HİÇ
   * tutmuyor ve NET sessizce boş çıkıyor — hata da vermiyor.
   *
   * ⚠ N11'DE TESADÜFEN ÇALIŞIYORDU: orada kod da ad da `"N11"`. Yani kusur,
   * kendini en az görünür kılan kanalda saklanıyordu.
   * _(Anayasa: "benzer ad aynı kimlik değildir".)_
   */
  kanalKodu: string;
  kargoUcreti: number;
  /** Kullanıcının yazdığı şu anki satış fiyatı; `null` → son satış. */
  guncelFiyat: number | null;
  dilimler: DilimGirdisi[];
}): Promise<DilimNetSonucu> {
  /** K234: ekran okuma izniyle açılır; hesap da aynı kapıdan (yazmaz). */
  await yetkiIste("tarife.gor");

  /**
   * ⚠ İŞ GÜNÜ İSTANBUL TAKVİMİNDEN — `/simulasyon` ekranıyla AYNI ifade.
   * Ortamın saat dilimi kullanılmaz (anayasa kuralı); iki ekran aynı günü
   * farklı kurarsa aynı ürün için farklı tarife penceresi seçilebilirdi.
   */
  const bugun = gunDegeri(isTakvimGunu(new Date()));
  const zeminSonucu = await urunZemini(girdi.kod, bugun);
  /**
   * ⚠ ÇOK EŞLEŞME DE "ÜRÜN YOK" DEĞİL — ama bu ekranda kod TARİFEDEN
   * geliyor, kullanıcının yazdığı bir şey değil. Çakışma burada bir VERİ
   * sorunudur; ekran ikisini de "hesaplanamadı" diye çizer ve ayrımı
   * ürün kartı yapar. Sebep yine de kaybolmuyor: `/urunler` ve `/okut`
   * çakışmayı adıyla söylüyor.
   */
  if (zeminSonucu.durum !== "BULUNDU") return { durum: "URUN_YOK" };
  const zemin = zeminSonucu.zemin;
  if (zemin.sonAlisFiyati === null) {
    return { durum: "MALIYET_YOK", urunAdi: zemin.ad };
  }

  const maliyet = zemin.sonAlisFiyati;

  /** TEK MOTOR ÇAĞRISI — dilim satırı da "şu anki fiyat" satırı da buradan. */
  const netHesapla = (
    sira: number,
    fiyat: number,
    fiyatKaynagi: DilimNetSatiri["fiyatKaynagi"],
  ): DilimNetSatiri => {
    const sonuc = simulasyonKarsilastir(
      {
        kdvDahilMi: true,
        alisFiyati: maliyet,
        kdvOrani: zemin.kdvOrani,
        kargoUcreti: girdi.kargoUcreti,
        kanalFiyatlari: { [girdi.kanalKodu]: fiyat },
      },
      bugun,
      zemin.zeminler,
    );
    /** ⚠ Sonuç da KOD ile bulunur; ad eşleşmesi aynı tuzağın ikinci yarısı. */
    const kanal = sonuc.find((k) => k.kod === girdi.kanalKodu);
    return {
      sira,
      fiyat,
      fiyatKaynagi,
      oran: kanal?.komisyonOrani ?? null,
      oranKaynagi: kanal?.oranKaynagi ?? "YOK",
      net1: kanal?.net1 ?? null,
      net2: kanal?.net2 ?? null,
    };
  };

  const satirlar: DilimNetSatiri[] = girdi.dilimler.map((d) => {
    /**
     * ⚠ ÜST UCU AÇIK DİLİMİN FİYATI YOKTUR — o "bugünkü fiyatın" dilimidir.
     * Sistem kanal satış fiyatını TUTMUYOR (ölçüldü: `ChannelSku`te fiyat
     * alanı yok), bu yüzden o kanaldaki SON SATIŞ fiyatı kullanılır ve
     * ekranda öyle ETİKETLENİR. Uydurma bir baz yazılmaz.
     */
    const fiyat = d.ust ?? zemin.sonSatisFiyati;
    const fiyatKaynagi: DilimNetSatiri["fiyatKaynagi"] =
      d.ust !== null ? "DILIM_USTU" : zemin.sonSatisFiyati !== null ? "SON_SATIS" : "YOK";

    if (fiyat === null) {
      return {
        sira: d.sira,
        fiyat: null,
        fiyatKaynagi: "YOK",
        oran: null,
        oranKaynagi: "YOK",
        net1: null,
        net2: null,
      };
    }

    return netHesapla(d.sira, fiyat, fiyatKaynagi);
  });

  /** ŞU ANKİ FİYAT: girilen; yoksa son satış; o da yoksa hüküm yok. */
  const guncelFiyat =
    girdi.guncelFiyat !== null && Number.isFinite(girdi.guncelFiyat) && girdi.guncelFiyat > 0
      ? girdi.guncelFiyat
      : null;
  const guncel: DilimNetSatiri | null =
    guncelFiyat !== null
      ? netHesapla(0, guncelFiyat, "GIRILEN")
      : zemin.sonSatisFiyati !== null
        ? netHesapla(0, zemin.sonSatisFiyati, "SON_SATIS")
        : null;

  return {
    durum: "TAMAM",
    urunAdi: zemin.ad,
    maliyet,
    kdvOrani: zemin.kdvOrani,
    sonSatisFiyati: zemin.sonSatisFiyati,
    satirlar,
    guncel,
    sonSatisTarihi: zemin.sonSatisTarihi,
  };
}
