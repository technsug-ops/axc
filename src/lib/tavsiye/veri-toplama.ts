import type { DogrulanabilirSayi } from "@/lib/llm/dogrulama";
import type { KartOzeti } from "@/lib/urun-karti";
import { kartVerisiniTopla, type KartVerisi } from "@/lib/urun-karti-verisi";
import { bicimlendirici } from "@/lib/bicim";
import { sermayeVerimiMetni } from "@/lib/marj-gosterge";
import { iadeGerekceEtiketleri } from "@/lib/etiketler";
import type { ReturnReason } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ÜRÜN TAVSİYESİ — VERİ TOPLAMA (K-TAVSIYE)
 * ----------------------------------------------------------------------------
 *  Yeni hesap YAZMAZ — yalnız `kartVerisiniTopla(variantId)` (ürün kartı
 *  sayfasının kullandığı AYNI fonksiyon, `urun-karti-verisi.ts`) çağrılır.
 *  K-OZET'in "kopya yasak" disiplini burada da geçerli.
 *
 *  ⚠ ÜRÜN ADI/SKU/BARKOD BU PAKETE ASLA GİRMEZ. Türkçe ürün adları rakam
 *  içerir ("Philips HD9200/90" gibi) — LLM adı anlatısında tekrarlarsa,
 *  `llmMetniDogrula` o rakamı SERBEST SAYI sanıp DOĞRU bir tavsiyeyi bile
 *  reddeder. Çare modele "adı yazma" demek değil, adı hiç VERMEMEK —
 *  `dogrulama.ts`'in kendi ilkesiyle aynı: önleme, tespit değil.
 * ============================================================================
 */

export type TavsiyeBaglam = { anahtar: string; aciklama: string };

export type TavsiyeVeriPaketi = {
  sayilar: DogrulanabilirSayi[];
  baglamlar: TavsiyeBaglam[];
  /** FIFO bağı şüpheliyse (K91) stok yaşı/maliyet iddiaları promptta temkinli kurulur. */
  stokBagiSupheli: boolean;
};

export type YeterliVeriSonucu =
  | { yeterli: true }
  | {
      yeterli: false;
      sebep: "HIC_SATILMAMIS" | "TEK_SATIS" | "KARLILIK_BILINMIYOR";
    };

/**
 * LLM'E HİÇ GİTMEDEN, ÜCRETSİZ KARAR. `hicSatilmamisMi`/`tekSatisMi` zaten
 * `KartOzeti`nin kendi alanları — burada yeniden hesaplanmaz (kopya yasak).
 */
export function yeterliVeriVarMi(ozet: KartOzeti): YeterliVeriSonucu {
  if (ozet.hicSatilmamisMi) return { yeterli: false, sebep: "HIC_SATILMAMIS" };
  if (ozet.tekSatisMi) return { yeterli: false, sebep: "TEK_SATIS" };
  if (
    ozet.marj === null &&
    ozet.sermayeVerimi === null &&
    ozet.birimNet2 === null
  ) {
    return { yeterli: false, sebep: "KARLILIK_BILINMIYOR" };
  }
  return { yeterli: true };
}

/**
 * Hız çifti (`ortalamaSatisSuresi`/`hizOrnekSayisi`) yalnız örneklem bu
 * eşiğin ÜSTÜNDEYSE pakete girer — K197-⑤'teki `AZ_ORNEKLEM_TAVANI` ile
 * aynı gerekçe (n<3 güvenilmez bir ortalamadır). Altındaysa ikisi de HİÇ
 * yazılmaz; LLM "veri yoksa bahsetme" kuralına zaten uyduğu için hız
 * hakkında temkinli/hatalı bir cümle kurmaz — sessizce doğru olur.
 */
export const HIZ_GUVEN_TABANI = 3;

export type TavsiyeBicim = {
  para(tutar: number, paraBirimi: string): string;
  sayi(deger: number): string;
  yuzde(deger: number, basamak?: number): string;
  sermayeVerimiMetni(oran: number | null): string | null;
};

/** Anahtar başına PROMPT BAĞLAMI — düz, statik bir Türkçe açıklama. */
const ANAHTAR_ACIKLAMASI: Record<string, string> = {
  satisSayisi: "Toplam satış (sipariş kalemi) sayısı",
  toplamAdet: "Satılan toplam adet",
  birimSatisFiyati: "Adet başına satış fiyatı",
  birimNet2: "Adet başına net kâr (NET-2)",
  satilanBirimMaliyeti: "Satılan adetlerin ağırlıklı ortalama maliyeti",
  ortalamaMaliyet: "Elde kalan (satılmamış) stoğun ortalama maliyeti",
  marj: "Kâr marjı yüzdesi",
  sermayeVerimi: "Sermaye verimi — yatırılan paranın kaç katının döndüğü",
  ortalamaSatisSuresi: "Alımdan satışa ortalama gün (satış hızı)",
  hizOrnekSayisi: "Satış hızı ortalamasının kaç satıştan hesaplandığı",
  iadeAdedi: "İade edilen toplam adet",
  iadeSayisi: "İade sayısı (farklı iade olayı)",
  hesaplanamayanKalem: "Kârı hesaplanamayan satış kalemi sayısı",
  zararliSatis: "Zararla kapanan satış sayısı",
  eldekiAdet: "Şu an elde (stokta) olan adet",
  yasGun: "En eski açık partinin, stokta bekleme süresi (gün)",
  sonAlimMaliyeti:
    "Son alımın birim maliyeti — YALNIZ BİR GERÇEK, yön/eğilim işareti DEĞİL",
};

/**
 * SAF GÖVDE — VERİTABANI YOK, SAATİ KENDİ OKUMAZ.
 *
 * `tavsiyeVeriPaketiOlustur`in ince, DB-dokunan kabuğu bu gövdeyi ZATEN
 * ÇEKİLMİŞ `KartVerisi` ile çağırır — bekçi bu fonksiyonu doğrudan
 * ÇAĞIRARAK sınar (saf hesap katmanı desen tarayan bekçiye muhtaç olmaz).
 */
export function tavsiyePaketiKur(
  veri: KartVerisi,
  bicim: TavsiyeBicim,
  iadeEtiketleri: Record<ReturnReason, string>,
): TavsiyeVeriPaketi {
  const { ozet } = veri;
  const sayilar: DogrulanabilirSayi[] = [];
  const baglamlar: TavsiyeBaglam[] = [];
  const paraBirimi = veri.paraBirimi ?? "TRY";

  const ekle = (anahtar: string, ham: number | null, goruntu: string | null) => {
    if (ham === null || goruntu === null) return;
    sayilar.push({ anahtar, ham, goruntu });
    const aciklama = ANAHTAR_ACIKLAMASI[anahtar];
    if (aciklama) baglamlar.push({ anahtar, aciklama });
  };

  ekle("satisSayisi", ozet.satisSayisi, bicim.sayi(ozet.satisSayisi));
  ekle("toplamAdet", ozet.toplamAdet, bicim.sayi(ozet.toplamAdet));
  ekle(
    "birimSatisFiyati",
    ozet.birimSatisFiyati,
    ozet.birimSatisFiyati === null ? null : bicim.para(ozet.birimSatisFiyati, paraBirimi),
  );
  ekle(
    "birimNet2",
    ozet.birimNet2,
    ozet.birimNet2 === null ? null : bicim.para(ozet.birimNet2, paraBirimi),
  );
  ekle(
    "satilanBirimMaliyeti",
    ozet.satilanBirimMaliyeti,
    ozet.satilanBirimMaliyeti === null
      ? null
      : bicim.para(ozet.satilanBirimMaliyeti, paraBirimi),
  );
  ekle(
    "ortalamaMaliyet",
    ozet.ortalamaMaliyet,
    ozet.ortalamaMaliyet === null ? null : bicim.para(ozet.ortalamaMaliyet, paraBirimi),
  );
  ekle("marj", ozet.marj, ozet.marj === null ? null : bicim.yuzde(ozet.marj, 1));
  /** ⚠ `sermayeVerimi` EKRANIN KULLANDIĞI AYNI BİÇİMLEYİCİDEN — kopya formül yasak. */
  ekle(
    "sermayeVerimi",
    ozet.sermayeVerimi,
    bicim.sermayeVerimiMetni(ozet.sermayeVerimi),
  );

  /** ⚠ HIZ ÇİFTİ YALNIZ BİRLİKTE — bkz. HIZ_GUVEN_TABANI dosya başlığı. */
  if (
    ozet.ortalamaSatisSuresi !== null &&
    ozet.hizOrnekSayisi >= HIZ_GUVEN_TABANI
  ) {
    ekle(
      "ortalamaSatisSuresi",
      ozet.ortalamaSatisSuresi,
      bicim.sayi(ozet.ortalamaSatisSuresi),
    );
    ekle("hizOrnekSayisi", ozet.hizOrnekSayisi, bicim.sayi(ozet.hizOrnekSayisi));
  }

  ekle("iadeAdedi", ozet.iadeAdedi, bicim.sayi(ozet.iadeAdedi));
  ekle("iadeSayisi", ozet.iadeSayisi, bicim.sayi(ozet.iadeSayisi));
  ekle(
    "hesaplanamayanKalem",
    ozet.hesaplanamayanKalem,
    bicim.sayi(ozet.hesaplanamayanKalem),
  );
  ekle("zararliSatis", ozet.zararliSatis, bicim.sayi(ozet.zararliSatis));

  ekle("eldekiAdet", veri.eldekiAdet, bicim.sayi(veri.eldekiAdet));
  ekle("yasGun", veri.yasGun, veri.yasGun === null ? null : bicim.sayi(veri.yasGun));
  /** ⚠ YALNIZ GERÇEK OLARAK — yön yorumu (arttı/azaldı) burada da, promptta da YOK. */
  ekle(
    "sonAlimMaliyeti",
    veri.sonAlimMaliyeti,
    veri.sonAlimMaliyeti === null
      ? null
      : bicim.para(veri.sonAlimMaliyeti, veri.sonAlimParaBirimi ?? paraBirimi),
  );

  /**
   * ⚠ İADE SEBEPLERİ `ekle()`Yİ KULLANMAZ — anahtar önceden bilinmediği
   * için `ANAHTAR_ACIKLAMASI` sözlüğünde karşılığı yok ve `ekle()` baglam
   * eklemezdi. Burada anahtar + Türkçe etiket BİRLİKTE, tek adımda yazılır.
   */
  for (const { sebep, sayi } of veri.iadeSebepleri) {
    if (sayi <= 0) continue;
    const anahtar = `iadeSebep_${sebep}`;
    sayilar.push({ anahtar, ham: sayi, goruntu: bicim.sayi(sayi) });
    baglamlar.push({
      anahtar,
      aciklama: `"${iadeEtiketleri[sebep]}" sebepli iade sayısı`,
    });
  }

  return { sayilar, baglamlar, stokBagiSupheli: veri.bagTanisi === "SUPHELI" };
}

export type TavsiyeVeriSonucu =
  | { durum: "URUN_YOK" }
  | { durum: "YETERSIZ_VERI"; sebep: "HIC_SATILMAMIS" | "TEK_SATIS" | "KARLILIK_BILINMIYOR" }
  | { durum: "HAZIR"; paket: TavsiyeVeriPaketi };

/** İNCE KABUK — DB'DEN ÇEKER, `tavsiyePaketiKur`i ÇAĞIRIR. Hiçbir kural burada YAZILMAZ. */
export async function tavsiyeVeriPaketiOlustur(
  variantId: string,
): Promise<TavsiyeVeriSonucu> {
  const veri = await kartVerisiniTopla(variantId);
  if (veri === null) return { durum: "URUN_YOK" };

  const yeterlilik = yeterliVeriVarMi(veri.ozet);
  if (!yeterlilik.yeterli) {
    return { durum: "YETERSIZ_VERI", sebep: yeterlilik.sebep };
  }

  const [bicimOrn, iadeEtiketleri] = await Promise.all([
    bicimlendirici(),
    iadeGerekceEtiketleri(),
  ]);
  const bicim: TavsiyeBicim = {
    para: bicimOrn.para,
    sayi: bicimOrn.sayi,
    yuzde: bicimOrn.yuzde,
    sermayeVerimiMetni,
  };

  return { durum: "HAZIR", paket: tavsiyePaketiKur(veri, bicim, iadeEtiketleri) };
}
