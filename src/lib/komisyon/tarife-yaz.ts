
import { prisma } from "@/lib/prisma";
import { tabloOku } from "@/lib/tablo/tablo-oku";

import { tarifeOku, type TarifeOkumasi } from "./tarife-okuyucu";
import { teklifTarifesiOku, teklifTarifesiTani } from "./teklif-tarifesi";
import { kanalPlatformu } from "./yukle";
import {
  tarifePlaniKur,
  yazilabilirMi,
  type TarifePlani,
} from "./tarife-plan";

/**
 * ============================================================================
 *  TARİFE YAZIMI — VERİ KATMANI
 * ----------------------------------------------------------------------------
 *  Okuma ve plan saf katmanda (`tarife-okuyucu.ts`, `tarife-plan.ts`);
 *  burada yalnız veritabanı işi var.
 *
 *  ── AYNI PENCERE İKİNCİ KEZ: ÜZERİNE YAZILIR ────────────────────────────
 *  Mimar kararı 18.08.2026, gerekçesi şu: bir pencerenin tarifesi kanalın
 *  YAYIMLADIĞI BİR OLGUDUR; aynı pencerenin iki yüklemesi aynı içeriğe
 *  yakınsamalıdır. Reddetseydik ilk yükleme eksik ya da bozuk geldiğinde
 *  düzeltmenin tek yolu elle silmek olurdu.
 *
 *  **Ledger dokunulmazlığı burada GEÇERLİ DEĞİL** — bu referans veri,
 *  hareket kaydı değil. Stok/kâr defterlerinde kayıt silinmez; tarife ise
 *  kanalın o hafta ne dediğinin kopyasıdır.
 *
 *  Ama sessiz olmuyor: `yuklemeSayisi` artıyor, `yuklendiAt` tazeleniyor
 *  ve rapor "aynı pencere N. kez yüklendi" diyor.
 *
 *  ── KOMİSYON ORANI BURADAN YAZILMAZ ─────────────────────────────────────
 *  ⚠ `ChannelSku.commissionRate`e bu modül DOKUNMAZ. O alanı mevcut
 *  komisyon yükleme yolu (`komisyon/yukle.ts`) yazıyor ve orada üç aşamalı
 *  eşleştirme, eksik eşleme yaratma gibi sınanmış bir mantık var.
 *  Buraya kopyalasaydık aynı kural sistemde İKİ yerde yaşardı — bu paketin
 *  ilk dersi tam olarak buydu. İki yol aynı dosyayı okur, farklı şeyler
 *  yazar: biri güncel oranı, öteki tam tarifeyi.
 * ============================================================================
 */

export type TarifeYuklemeSonucu =
  | {
      durum: "HATA";
      /**
       * MAKİNE OKUNUR KOD — ekran bunu Türkçeye çevirir.
       * ⚠ 25.08.2026 canlı hatası: yalnız `engel` vardı ve ekran onu OLDUĞU
       * GİBİ basıyordu; kullanıcı Hepsiburada teklif dosyasını yükleyince
       * ham `SUTUN_EKSIK` gördü. Kod ile insan cümlesi AYRI alanlar: betik
       * kodu/ham metni yazar, ekran çeviriyi.
       */
      kod:
        | "DOSYA_OKUNAMADI"
        | "SUTUN_EKSIK"
        | "PENCERE_YOK"
        | "SATIR_YOK"
        /**
         * K227 — dosyanın pazaryeri ile seçilen hesabın kanalı çelişiyor.
         *
         * ⚠ `TEKLIF_DOSYASI` KODU BURADAN KALKTI ve bu bilinçli: teklif
         * dosyası artık REDDEDİLMİYOR, dilimli tarife olarak OKUNUYOR
         * (bkz. `teklif-tarifesi.ts` — eski gerekçe orada, niye çevrildiğiyle
         * birlikte duruyor). Üretilmeyen bir kodu birlikte bırakmak,
         * "yazıcısı olmayan alan" olurdu.
         */
        | "PLATFORM_UYUSMAZ";
      /** Betik çıktısı için ham metin — ekranda GÖSTERİLMEZ. */
      engel: string;
      eksikler?: string[];
    }
  | {
      durum: "ONIZLEME";
      okuma: TarifeOkumasi;
      plan: TarifePlani;
      /** Aynı pencere daha önce yüklenmiş mi — kullanıcı ONAYDAN ÖNCE bilsin. */
      mevcutYukleme: { yuklemeSayisi: number; yuklendiAt: Date } | null;
    }
  | {
      durum: "YAZILDI";
      tarifeId: string;
      plan: TarifePlani;
      pencere: { baslangic: Date; bitis: Date };
      yuklemeSayisi: number;
    };

/** Dosyayı okur ve planı kurar — HİÇBİR ŞEY YAZMAZ. */
export async function tarifeDenetle(
  dosya: Buffer,
  channelAccountId: string,
  bugun: Date,
  /** Tanıma için ikinci onay — yapı ölçütü zaten yeterli, ad yedek. */
  dosyaAdi?: string,
): Promise<TarifeYuklemeSonucu> {
  let veri: unknown[][];
  /** Tanıma için dışarıda: `catch` bloğundan sonra da okunabilmeli. */
  let sayfalar: { sheet: string; data: unknown[][] }[] = [];
  try {
    /**
     * TEK OKUMA KAPISI (K226). Biçim BAYTTAN tanınır: xlsx yolu Trendyol'un
     * ZIP64 kabı için normalleştiriciden geçer, eski biçim (.xls) kendi
     * çözücüsüne gider. Çıplak `readXlsxFile` burada YAZILAMAZ — N11 dosyayı
     * eski biçimde veriyor ve o çağrı kullanıcıyı suçlayan bir hata üretirdi.
     */
    sayfalar = (await tabloOku(dosya)).sayfalar;
    /**
     * TARİFE SAYFASINI ARA. Dosya birden çok sayfa taşıyabilir; ilkine
     * bakıp "kolon yok" demek yanlış sayfaya bakmak olurdu.
     */
    let secilen: unknown[][] | null = null;
    for (const s of sayfalar) {
      const deneme = tarifeOku(s.data ?? [], bugun);
      if (deneme.eksikSutunlar.length === 0) {
        secilen = s.data ?? [];
        break;
      }
    }
    veri = secilen ?? (sayfalar[0]?.data ?? []);
  } catch (e) {
    return {
      durum: "HATA",
      kod: "DOSYA_OKUNAMADI",
      engel: `DOSYA_OKUNAMADI: ${String(e).slice(0, 200)}`,
    };
  }

  let okuma = tarifeOku(veri, bugun);
  let izin = yazilabilirMi(okuma);
  /** Teklif dosyasından okunduysa pencere dışı kalan satır sayısı. */
  let pencereDisi = 0;

  if (!izin.olur) {
    /**
     * ⛔ TEKLİF DOSYASI ARTIK REDDEDİLMİYOR — TARİFE OLARAK OKUNUYOR (K227).
     *
     * 02.09.2026'da bu dosya reddediliyordu ve gerekçe şuydu: _"tarife
     * tablosuna girseydi `dilimBul` bugünkü fiyata indirimli oranı
     * uygulardı."_ ⚠ ESKİ GEREKÇE SİLİNMEDİ, KAPSAMI DÜZELTİLDİ: o korku
     * yalnız MEVCUT FİYAT DİLİMİ tabloya konmazsa gerçek olur. Okuyucu artık
     * tepe dilimi kuruyor (`teklif-tarifesi.ts`), dolayısıyla korkunun
     * dayanağı kalktı.
     *
     * ⭐ Kullanıcı tespiti 21.09.2026: HB/N11 teklif tablosu ile Trendyol
     * tarifesi AYNI mekanizma — üç kanalın paneli de aynı aralık tablosunu
     * gösteriyor (ekran görüntüleriyle göz göze doğrulandı).
     *
     * ⚠ YALNIZ HATA YOLUNDA DENENİYOR: geçerli bir Trendyol tarifesi bu
     * satıra hiç gelmez, dolayısıyla çalışan yol etkilenmez.
     */
    const teklif = teklifTarifesiTani(sayfalar);
    if (teklif.durum === "TANINDI") {
      /**
       * DOSYA İLE HESAP ÇELİŞİYORSA YAZILMAZ. N11 teklif dosyasını HB
       * hesabına yüklemek, hiçbir kodun eşleşmediği bir yükleme üretir ve
       * kullanıcı sistemi bozuk sanar; asıl sebep söylenir.
       */
      const hesap = await prisma.channelAccount.findUnique({
        where: { id: channelAccountId },
        include: { channel: { select: { code: true, name: true } } },
      });
      const hesapPlatformu = hesap ? kanalPlatformu(hesap.channel.code) : null;
      if (hesapPlatformu !== teklif.platform) {
        return {
          durum: "HATA",
          kod: "PLATFORM_UYUSMAZ",
          engel: `PLATFORM_UYUSMAZ: dosya ${teklif.platform}, hesap ${
            hesap?.channel.name ?? "?"
          }`,
        };
      }

      const teklifOkumasi = teklifTarifesiOku(teklif);
      pencereDisi = teklifOkumasi.pencereDisi;
      okuma = teklifOkumasi;
      izin = yazilabilirMi(okuma);
    }
  }

  if (!izin.olur) {
    return {
      durum: "HATA",
      kod: izin.engel,
      engel: izin.engel,
      eksikler: "eksikler" in izin ? izin.eksikler : undefined,
    };
  }
  void pencereDisi;

  /**
   * ============================================================================
   *  EŞLEŞME KAPSAMI — DÖRT ROL, BÜTÜN KANALLAR (21.09.2026)
   * ----------------------------------------------------------------------------
   *  ⛔ ESKİ KAPSAM: `barcode` + YALNIZ BU HESABIN kanal kodları. Gerekçesi
   *  koda yazılıydı — _"dosya pazaryerinin kendi kodunu taşıyor"_ — ve
   *  ÖLÇÜM O GEREKÇEYİ ÇÜRÜTTÜ (canlı, 21.09.2026):
   *
   *      N11 teklif dosyasında bağsız kalan 13 ürünün kodları
   *        HBCV00004U1QOR · HBCV00007ITCGF   -> HEPSİBURADA kodları
   *        5702017424842                     -> EAN (LEGO)
   *        40744 · 42221 · 43020             -> LEGO ürün numaraları
   *
   *  Yani dosya "pazaryerinin kendi kodunu" taşımıyor; satıcının o ürüne
   *  hangi kodu girdiyse onu taşıyor. Dar kapsam, sistemde ZATEN VAR olan
   *  ürünleri bağsız bırakıyordu — ölçüldü: 17 bağsız kodun **6'sı**
   *  geniş ölçütle bulunuyor.
   *  _(Anayasa: "kapsam genişlemesi, bağımlı listelerin de genişlemesidir"
   *  — ve `varyantAra`nın Kanal SKU'yu hiç sormaması dersinin aynısı.)_
   *
   *  ⚠ VE ESKİ GEREKÇE SİLİNMİYOR: hesap bazlı kapsam 19.08.2026'da gerçek
   *  bir sorunu çözmüştü (3 bağsızın biri). O çözüm geçerli; bu genişletme
   *  onu KAPSIYOR, iptal etmiyor — bu hesabın kodları hâlâ birincil.
   * ============================================================================
   */
  const varyantlar = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: { id: true, barcode: true, sku: true, companySku: true },
  });
  const kanalKodlari = await prisma.channelSku.findMany({
    where: { isActive: true, variant: { isActive: true } },
    select: { channelSku: true, variantId: true, channelAccountId: true },
  });

  /**
   * ⛔ ÇAKIŞAN KOD BAĞLANMAZ — YENİ BİR SESSİZ SEÇİM ÜRETİLMEZ.
   * Kapsam genişledikçe bir kodun iki varyanta çözülme ihtimali artar.
   * Eski hâlde tek hesaba bakıldığı için bu soru hiç doğmuyordu; şimdi
   * doğuyor ve cevabı "son geleni al" OLAMAZ — bu deponun 21.09'da
   * kapattığı arızanın ta kendisi (`findFirst` sessizce birini seçiyordu).
   * Çakışan kod kümeden ATILIR ve kalem bağsız kalır: bağsız bir kalem
   * görünür, yanlış bağlanmış bir kalem görünmez.
   */
  const cakisan = new Set<string>();
  const tekil = (
    girdiler: { kod: string | null; variantId: string }[],
  ): Map<string, string> => {
    const harita = new Map<string, string>();
    for (const g of girdiler) {
      const kod = (g.kod ?? "").trim();
      if (kod === "") continue;
      const mevcut = harita.get(kod);
      if (mevcut !== undefined && mevcut !== g.variantId) {
        cakisan.add(kod);
        continue;
      }
      harita.set(kod, g.variantId);
    }
    for (const kod of cakisan) harita.delete(kod);
    return harita;
  };

  /**
   * ⚠ SIRA KORUNUYOR: bu hesabın kodları ÖNCE. `tarifePlaniKur` kanal
   * dizinine barkod dizininden önce bakıyor; bu hesabın kodunu listenin
   * başına koymak, aynı kodu taşıyan iki kayıttan doğru olanın kazanmasını
   * sağlar (çakışma zaten yukarıda eleniyor, bu ikinci emniyet).
   */
  const kanalDizini = tekil([
    ...kanalKodlari
      .filter((k) => k.channelAccountId === channelAccountId)
      .map((k) => ({ kod: k.channelSku, variantId: k.variantId })),
    ...kanalKodlari
      .filter((k) => k.channelAccountId !== channelAccountId)
      .map((k) => ({ kod: k.channelSku, variantId: k.variantId })),
  ]);

  const kimlikDizini = tekil([
    ...varyantlar.map((v) => ({ kod: v.barcode, variantId: v.id })),
    ...varyantlar.map((v) => ({ kod: v.sku, variantId: v.id })),
    ...varyantlar.map((v) => ({ kod: v.companySku, variantId: v.id })),
  ]);

  /**
   * ⛔ İKİ DİZİN ARASINDAKİ ÇAKIŞMA DA SESSİZ ÇÖZÜLMEZ. Bir kod, A
   * varyantının KANAL kodu ve B varyantının KİMLİK kodu olabilir —
   * 21.09.2026'da canlıda tam bu vardı (`HBCV00000R0H0K`). `tarifePlaniKur`
   * önce kanal dizinine bakıyor, yani çakışmayı kanal lehine SESSİZCE
   * çözerdi. Bu, aynı gün kapatılan arızanın kılık değiştirmiş hâli olurdu.
   *
   * ⚠ BUGÜN BOŞ ÇIKIYOR (ölçüldü: 0 çakışma) ve bu bir tesadüf değil —
   * K231 yazma kapısı bu kodların doğmasını engelliyor. Ama o kapı ELLE
   * yollarda; toplu içe aktarma henüz geçmiyor (panoda açık kalem). Yani
   * bu kontrol bugün boş, yarın dolabilir.
   */
  for (const [kod, variantId] of kimlikDizini) {
    const kanalSahibi = kanalDizini.get(kod);
    if (kanalSahibi !== undefined && kanalSahibi !== variantId) {
      kanalDizini.delete(kod);
      kimlikDizini.delete(kod);
    }
  }

  const plan = tarifePlaniKur(
    okuma,
    [...kimlikDizini].map(([barkod, id]) => ({ id, barkod })),
    [...kanalDizini].map(([kanalKodu, variantId]) => ({ kanalKodu, variantId })),
  );

  const mevcut = await prisma.komisyonTarifesi.findUnique({
    where: {
      channelAccountId_pencereBaslangic: {
        channelAccountId,
        pencereBaslangic: okuma.pencere!.baslangic,
      },
    },
    select: { yuklemeSayisi: true, yuklendiAt: true },
  });

  return { durum: "ONIZLEME", okuma, plan, mevcutYukleme: mevcut };
}

/** Tarifeyi yazar. Önizleme ile AYNI yoldan geçer — iki hesap olmasın. */
export async function tarifeYaz(girdi: {
  dosya: Buffer;
  dosyaAdi: string;
  channelAccountId: string;
  bugun: Date;
}): Promise<TarifeYuklemeSonucu> {
  const onizleme = await tarifeDenetle(
    girdi.dosya,
    girdi.channelAccountId,
    girdi.bugun,
    /** ⚠ AD DA GEÇER: yazma yolu ile önizleme yolu AYNI tanımayı görmeli.
     *  Geçmeseydi "Önce göster" doğru mesajı verir, "Yaz" başka bir hata
     *  verirdi — aynı dosyaya iki farklı cevap. */
    girdi.dosyaAdi,
  );
  if (onizleme.durum !== "ONIZLEME") return onizleme;

  const { okuma, plan } = onizleme;
  const pencere = okuma.pencere!;

  const tarifeId = await prisma.$transaction(async (tx) => {
    const mevcut = await tx.komisyonTarifesi.findUnique({
      where: {
        channelAccountId_pencereBaslangic: {
          channelAccountId: girdi.channelAccountId,
          pencereBaslangic: pencere.baslangic,
        },
      },
      select: { id: true, yuklemeSayisi: true },
    });

    let id: string;
    if (mevcut) {
      /**
       * ÜZERİNE YAZ — önce eski kalemler silinir. Silmeden `createMany`
       * yapsaydık tekillik anahtarına çarpardı; `upsert` ile tek tek
       * yazmak da dosyadan DÜŞEN bir kalemi (artık yayımlanmayan ürün)
       * eskisi gibi bırakırdı. Pencere içeriği bütün olarak yenilenir.
       */
      await tx.komisyonTarifeKalemi.deleteMany({ where: { tarifeId: mevcut.id } });
      await tx.komisyonTarifesi.update({
        where: { id: mevcut.id },
        data: {
          pencereBitis: pencere.bitis,
          tarifeGrubu: okuma.tarifeGrubu,
          kaynakDosyaAdi: girdi.dosyaAdi,
          yuklemeSayisi: mevcut.yuklemeSayisi + 1,
          yuklendiAt: girdi.bugun,
        },
      });
      id = mevcut.id;
    } else {
      const yeni = await tx.komisyonTarifesi.create({
        data: {
          channelAccountId: girdi.channelAccountId,
          pencereBaslangic: pencere.baslangic,
          pencereBitis: pencere.bitis,
          tarifeGrubu: okuma.tarifeGrubu,
          kaynakDosyaAdi: girdi.dosyaAdi,
          yuklendiAt: girdi.bugun,
        },
        select: { id: true },
      });
      id = yeni.id;
    }

    await tx.komisyonTarifeKalemi.createMany({
      data: plan.kalemler.map((k) => ({
        tarifeId: id,
        barkod: k.barkod,
        saticiStokKodu: k.saticiStokKodu,
        urunAdi: k.urunAdi,
        variantId: k.variantId,
        dilimSirasi: k.dilimSirasi,
        altLimit: k.altLimit === null ? null : String(k.altLimit),
        ustLimit: k.ustLimit === null ? null : String(k.ustLimit),
        oran: String(k.oran),
      })),
    });

    return id;
  });

  const sonrasi = await prisma.komisyonTarifesi.findUnique({
    where: { id: tarifeId },
    select: { yuklemeSayisi: true },
  });

  return {
    durum: "YAZILDI",
    tarifeId,
    plan,
    pencere,
    yuklemeSayisi: sonrasi?.yuklemeSayisi ?? 1,
  };
}
