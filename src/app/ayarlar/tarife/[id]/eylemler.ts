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
  /** Fiyat üst sınırdan mı, son satıştan mı geldi — etiketiyle taşınır. */
  fiyatKaynagi: "DILIM_USTU" | "SON_SATIS" | "YOK";
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
    };

export async function dilimNetleri(girdi: {
  kod: string;
  kanalAdi: string;
  kargoUcreti: number;
  dilimler: DilimGirdisi[];
}): Promise<DilimNetSonucu> {
  await yetkiIste("kanalsku.yaz");

  /**
   * ⚠ İŞ GÜNÜ İSTANBUL TAKVİMİNDEN — `/simulasyon` ekranıyla AYNI ifade.
   * Ortamın saat dilimi kullanılmaz (anayasa kuralı); iki ekran aynı günü
   * farklı kurarsa aynı ürün için farklı tarife penceresi seçilebilirdi.
   */
  const bugun = gunDegeri(isTakvimGunu(new Date()));
  const zemin = await urunZemini(girdi.kod, bugun);
  if (!zemin) return { durum: "URUN_YOK" };
  if (zemin.sonAlisFiyati === null) {
    return { durum: "MALIYET_YOK", urunAdi: zemin.ad };
  }

  const maliyet = zemin.sonAlisFiyati;
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

    const sonuc = simulasyonKarsilastir(
      {
        kdvDahilMi: true,
        alisFiyati: maliyet,
        kdvOrani: zemin.kdvOrani,
        kargoUcreti: girdi.kargoUcreti,
        kanalFiyatlari: { [girdi.kanalAdi]: fiyat },
      },
      bugun,
      zemin.zeminler,
    );
    const kanal = sonuc.find((k) => k.ad === girdi.kanalAdi);

    return {
      sira: d.sira,
      fiyat,
      fiyatKaynagi,
      oran: kanal?.komisyonOrani ?? null,
      oranKaynagi: kanal?.oranKaynagi ?? "YOK",
      net1: kanal?.net1 ?? null,
      net2: kanal?.net2 ?? null,
    };
  });

  return {
    durum: "TAMAM",
    urunAdi: zemin.ad,
    maliyet,
    kdvOrani: zemin.kdvOrani,
    sonSatisFiyati: zemin.sonSatisFiyati,
    satirlar,
  };
}
