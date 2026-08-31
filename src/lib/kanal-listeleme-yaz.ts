import { prisma } from "@/lib/prisma";
import {
  kanalAdedi,
  listelemeDurumu,
  type KanalUrunu,
} from "@/lib/kanal-listeleme";

/**
 * ============================================================================
 *  KANAL LİSTELEME DURUMUNU DEFTERE YAZ (K121②, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  Pazaryerinden OKUNAN tarama sonucunu `ChannelSku`nun ÜÇ alanına yazar:
 *  `listelemeDurumu` · `kanalAdet` · `kanalOlcumAt`.
 *
 *  ⛔ PAZARYERİNE HİÇBİR ŞEY YAZILMAZ. Stok senkronu (kanala adet yazma)
 *  KAPSAM DIŞI — kullanıcı şartı 01.09.2026. Bu modül TY istemcisini bile
 *  tanımıyor; ham tarama sonucu ÇAĞIRANDAN gelir.
 *
 *  ⛔ VE YALNIZ BU ÜÇ ALAN YAZILIR. `commissionRate`, `channelSku`,
 *  `externalListingId` gibi alanlara DOKUNULMAZ; onların kendi kaynakları
 *  var ve buradan yazılsalardı iki kaynak sessizce çakışırdı.
 *
 *  ── ⚠ EŞLEŞTİRME KİMLİKLE ────────────────────────────────────────────
 *  Kanal hesabı **`externalId`** ile bulunur (taramanın `saticiId`si), ADLA
 *  değil. Ölçüldü: `Trendyol/AXCALI` → `externalId = 870249` ve tarama da
 *  aynı kimliği taşıyor. _(Anayasa: "kimlik varken dizeyle aranmaz"; ve
 *  `kanalAdi === "Hepsiburada"` karşılaştırması 20.08'de 29 ürünü sessizce
 *  elemişti.)_
 *
 *  ── ⚠ ÜRÜN BARKODLA EŞLEŞİR, ÜÇ ALANIN HERHANGİ BİRİYLE ─────────────
 *  TY kaydında `barcode`, `stockCode` ve `productMainId` çoğu zaman AYNI
 *  dizedir (ölçüldü: 1629 listelemenin 1262'sinde ikisi, 4'ünde üçü aynı).
 *  ⛔ Bu yüzden adet ASLA üç alan üzerinden TOPLANMAZ — 31.08'de tam bu
 *  yapıldı ve "TY iki kat bildiriyor" diye sahte bir bulgu üretti.
 *  _(Kılavuz: fazla temiz örüntü önce ARACIN şüphelisidir.)_
 * ============================================================================
 */

export type TaramaSonucu = {
  /** Taramanın satıcı kimliği — hesap bununla bulunur. */
  saticiId: string;
  urunler: (KanalUrunu & Record<string, unknown>)[];
  /** Ölçümün alındığı an — `kanalOlcumAt`e yazılır. */
  alindi: Date;
};

export type YazimSonucu = {
  hesap: string | null;
  /** Kanalda bulunan ve deftere yazılan satır. */
  yazilan: number;
  /** Kanalda HİÇ bulunmayan ChannelSku → `YOK`. */
  yokIsaretlenen: number;
  /** Barkodu olmayan varyantın ChannelSku'su — hüküm verilemez, atlandı. */
  barkodsuzAtlanan: number;
  /** Kanal kaydı olmayan ama TY'de bulunan ürün — yazacak yer yok. */
  kanalKaydiYok: number;
};

/** Durum önceliği — küçük olan "daha iyi". */
const SIRA: Record<string, number> = {
  ACIK: 0,
  STOKSUZ: 1,
  ONAY_BEKLIYOR: 2,
  PASIF: 3,
  YOK: 4,
  BILINMIYOR: 5,
};

function kimlikleri(u: Record<string, unknown>): string[] {
  const cikan: string[] = [];
  for (const alan of ["barcode", "stockCode", "productMainId"]) {
    const v = u[alan];
    const s = v === null || v === undefined ? "" : String(v).trim();
    /** ⚠ TEKİLLEŞTİRİLİR: üç alan aynı dize olabilir. */
    if (s !== "" && !cikan.includes(s)) cikan.push(s);
  }
  return cikan;
}

export async function listelemeDurumunuYaz(
  tarama: TaramaSonucu,
): Promise<YazimSonucu> {
  const hesap = await prisma.channelAccount.findFirst({
    where: { externalId: tarama.saticiId },
    select: { id: true, name: true, channel: { select: { name: true } } },
  });
  if (hesap === null) {
    /**
     * ⛔ SESSİZ BAŞARISIZLIK YOK: hesap bulunamazsa hiçbir şey yazılmaz ve
     * bu SÖYLENİR. Sessizce 0 yazsaydık "tarama koştu, değişiklik yok"
     * ile "tarama hiç eşleşmedi" ayırt edilemezdi.
     */
    return {
      hesap: null,
      yazilan: 0,
      yokIsaretlenen: 0,
      barkodsuzAtlanan: 0,
      kanalKaydiYok: 0,
    };
  }

  /** Kimlik → { durum, adet } — TEKİL listeleme başına. */
  const kanal = new Map<string, { durum: ReturnType<typeof listelemeDurumu>; adet: number | null }>();
  for (const u of tarama.urunler) {
    const durum = listelemeDurumu(u);
    const adet = kanalAdedi(u.quantity);
    for (const k of kimlikleri(u)) {
      const mevcut = kanal.get(k);
      /**
       * ⚠ AYNI KİMLİK BİRDEN ÇOK LİSTELEMEDE ÇIKARSA: durum EN İYİSİ,
       * adet TOPLANIR. Ölçüldü — bugün böyle bir vaka YOK (1629 barkodun
       * 1629'u tekil), ama yarın doğarsa sessizce yanlış olmasın.
       */
      if (mevcut === undefined) kanal.set(k, { durum, adet });
      else {
        const enIyi = SIRA[durum] < SIRA[mevcut.durum] ? durum : mevcut.durum;
        const toplam =
          mevcut.adet === null && adet === null
            ? null
            : (mevcut.adet ?? 0) + (adet ?? 0);
        kanal.set(k, { durum: enIyi, adet: toplam });
      }
    }
  }

  const satirlar = await prisma.channelSku.findMany({
    where: { channelAccountId: hesap.id },
    select: {
      id: true,
      variantId: true,
      variant: { select: { barcode: true } },
    },
  });

  const sonuc: YazimSonucu = {
    hesap: `${hesap.channel.name}/${hesap.name}`,
    yazilan: 0,
    yokIsaretlenen: 0,
    barkodsuzAtlanan: 0,
    kanalKaydiYok: 0,
  };

  /** ⚠ TEK İŞLEM DEĞİL — satır satır, tekrar koşulabilir.
   *  Yarım kalırsa ikinci koşum kaldığı yerden devam eder ve zararsızdır.
   *  _(Kılavuz: yarım commit mümkün olan hiçbir betik canlıya koşmaz.)_ */
  const an = tarama.alindi;
  for (const s of satirlar) {
    const bk = (s.variant.barcode ?? "").trim();
    if (bk === "") {
      /** ⛔ Barkodu olmayan varyant eşleştirilemez — hüküm YOK, dokunulmaz. */
      sonuc.barkodsuzAtlanan += 1;
      continue;
    }
    const k = kanal.get(bk);
    if (k === undefined) {
      await prisma.channelSku.update({
        where: { id: s.id },
        data: { listelemeDurumu: "YOK", kanalAdet: null, kanalOlcumAt: an },
      });
      sonuc.yokIsaretlenen += 1;
      continue;
    }
    await prisma.channelSku.update({
      where: { id: s.id },
      data: {
        listelemeDurumu: k.durum,
        kanalAdet: k.adet,
        kanalOlcumAt: an,
      },
    });
    sonuc.yazilan += 1;
  }

  /**
   * ⚠ KANAL KAYDI OLMAYAN ÜRÜNLER SAYILIR AMA YAZILMAZ. `ChannelSku` satırı
   * yoksa durumu koyacak yer yok; satır UYDURULMAZ (olmayan bir kanal kodu
   * yazmak olurdu). Ölçüldü: stoklu 231 varyantın 9'unda kayıt yok.
   * Panel süzgeci bu hâli AYRICA kapsıyor, yoksa "sayı = liste" bozulurdu.
   */
  const kayitliVaryantlar = new Set(satirlar.map((s) => s.variantId));
  const barkodlar = await prisma.productVariant.findMany({
    where: { isActive: true, id: { notIn: [...kayitliVaryantlar] } },
    select: { barcode: true },
  });
  for (const v of barkodlar) {
    const bk = (v.barcode ?? "").trim();
    if (bk !== "" && kanal.has(bk)) sonuc.kanalKaydiYok += 1;
  }

  return sonuc;
}

