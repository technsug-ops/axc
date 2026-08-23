"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { gunDegeri, gunEkle, gunMetninden, isTakvimGunu } from "@/lib/donem";
import {
  DURUM_SAYACI,
  SAYAC_KURALLARI,
  SON_TARIH_EYLEMI,
} from "@/lib/iade/sayac";
import {
  gecerliAnalizSonucu,
  gecerliIadeGerekcesi,
  gecerliItirazGerekcesi,
} from "@/lib/etiketler";
import {
  AYRILMIS_SAYILAN_DURUMLAR,
  BILDIRIM_TAVANI,
  TAVAN_ISTISNASI_EYLEMI,
  bildirimTavaniDoldu,
  analizSonucuIstenirMi,
  ayirmaMumkunMu,
  ayrilmisAdetler,
  donenUrunZorunluMu,
  gecisGecerliMi,
  itirazDegisimUrunuIster,
  itirazGerekcesiGerekliMi,
  kapaliMi,
  serbestStok,
} from "@/lib/iade/bildirim";
import { kargolamaDogurur } from "@/lib/iade/kargolama";
import { oturumdakiKullanici } from "@/lib/oturum";
import { prisma } from "@/lib/prisma";
import { varyantStogu } from "@/lib/stok";
import { yetkiIste } from "@/lib/yetki";

import type {
  AnalysisResult,
  NoticeObjectionReason,
  NoticeStatus,
} from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  İADE BİLDİRİMİ — YAZIM İŞLEMLERİ
 * ----------------------------------------------------------------------------
 *  AŞAMA A'nın tamamı burada: bildirim açılır, durumu ilerler, iptal edilir.
 *  HİÇBİRİ LEDGER'A DOKUNMAZ ve hiçbiri kâr hesaplamaz — bildirim bir niyet
 *  beyanıdır. Stok ve kâr ancak AŞAMA B'de (`iadeKaydet`) işler.
 *
 *  GEÇİŞ KURALI SUNUCUDA DA UYGULANIR: ekranda pasif düğme göstermek yetki
 *  değildir; istek elle kurulabilir. `gecisGecerliMi` hem düğmeyi çizerken
 *  hem burada çağrılır — tek kaynak (src/lib/iade/bildirim.ts).
 * ============================================================================
 */

export type BildirimDurumu = { hatalar?: string[]; basarili?: boolean };

type Ceviri = (anahtar: string, degerler?: Record<string, string | number>) => string;

function semaKur(t: Ceviri) {
  return z.object({
    saleId: z.string().min(1, t("satisZorunlu")),
    /** Pazaryerindeki talep numarası — dış dünyanın kimliği, boş olabilir. */
    code: z.string().trim().max(191),
    noticedAt: z.string().min(1, t("tarihZorunlu")),
    /**
     * ⚠ GEREKÇE LİSTESİ ELLE YAZILMAZ — FORMUN OKUDUĞU KAYNAKTAN GELİR.
     *
     * 23.08.2026 canlı hatası: burada elle tutulan YEDİ değerlik bir dizi
     * vardı. Şemaya yedi yeni gerekçe eklendi (`HASARLI`, `BOS_PAKET`…),
     * açılır liste onları gösterdi — çünkü o taraf `Record<ReturnReason,
     * null>` ile DERLEYİCİ KİLİDİ altında — ama sunucu tanımadı ve kaydı
     * reddetti. Kullanıcı "Ürün hasarlı"yı seçiyor, ekran _"Gerekçe
     * seçilmeli"_ diyordu: seçilmiş bir alan için seçilmedi denmesi, hatayı
     * kullanıcının üstüne atıp asıl sebebi GİZLİYORDU.
     *
     * Kilit artık tek: `IADE_GEREKCELERI` de `etiketler.ts`teki exhaustive
     * `Record`tan türüyor. Şemaya sekizinci gerekçe eklenirse ORASI
     * derlenmez; düzeltilince form da sunucu da onu aynı anda tanır.
     * İki listenin ayrışması yapısal olarak imkânsız.
     */
    reason: z
      .string()
      .min(1, t("gerekceZorunlu"))
      .refine(gecerliIadeGerekcesi, { message: t("gerekceTanimsiz") }),
    /** Değişim için ayrılan ürün — FİZİKSEL STOĞA DOKUNMAZ, niyet beyanıdır. */
    reservedVariantId: z.string().nullable(),
    reservedQuantity: z.number().int().min(0),
    /**
     * 6. SENARYODA DÖNEN (yanlış giden) ürün. `reservedVariantId` ile
     * BİNDİRİLMEZ: ayrılan gönderilecek, dönen geri gelen.
     */
    returnedVariantId: z.string().nullable(),
    note: z.string().trim(),
    /**
     * TAVAN İSTİSNASI — kullanıcı ısrar ettiyse `true`. Onay bir sonraki
     * kayda TAŞINMAZ: her kayıt kendi bayrağını taşır, "bir kez onayladım,
     * artık sorma" yoktur.
     */
    tavanIstisnasi: z.boolean(),
  });
}

export async function bildirimOlustur(
  _oncekiDurum: BildirimDurumu,
  formData: FormData,
): Promise<BildirimDurumu> {
  await yetkiIste("iade.yaz");
  const t = await getTranslations("Bildirim2");

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formOkunamadi")] };
  }

  /* Eski istemciden gelen istek bayrağı taşımayabilir — varsayılan HAYIR. */
  const govde =
    typeof json === "object" && json !== null
      ? { tavanIstisnasi: false, ...(json as Record<string, unknown>) }
      : json;
  const sonuc = semaKur(t).safeParse(govde);
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const tarih = gunMetninden(veri.noticedAt);
  if (!tarih) return { hatalar: [t("tarihGecersiz")] };

  const satis = await prisma.sale.findUnique({
    where: { id: veri.saleId },
    select: { id: true },
  });
  if (!satis) return { hatalar: [t("satisBulunamadi")] };

  /**
   * ⚠ AYNI SATIŞA EN FAZLA `BILDIRIM_TAVANI` BİLDİRİM. Kullanıcı aynı iadeyi
   * tekrar tekrar seçip kaydedebiliyordu ve hiçbir şey engellemiyordu.
   *
   * Tavanın kaynağı ve niye "satılan adet" OLMADIĞI `lib/iade/bildirim.ts`te
   * ölçümüyle yazılı — kısaca: bildirimi olan 8 satışın hepsi 1 adetlik ve
   * dördü birden fazla bildirim taşıyor, yani adet sınırı bugünkü gerçek
   * kayıtları engellerdi.
   *
   * ⚠ MUTLAK KİLİT DEĞİL — İSTİSNA İZ BIRAKARAK GEÇER. Tavan bir BEYAN
   * (pazaryeri belgesiyle doğrulanmadı); mutlak kilit, kuralın yanıldığı gün
   * operasyoncuyu kilitler ve gerçek bir olay hiç kaydedilemez. Anayasa
   * (20.08.2026): _"uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir"_
   * — eşik yerinde kalır, onay bir sonraki kayda TAŞINMAZ, sebep ekranda
   * yazar ve istisna iz bırakır.
   */
  const mevcutBildirimSayisi = await prisma.returnNotice.count({
    where: { saleId: veri.saleId },
  });
  if (bildirimTavaniDoldu(mevcutBildirimSayisi) && !veri.tavanIstisnasi) {
    return {
      hatalar: [
        t("bildirimTavaniDoldu", {
          adet: mevcutBildirimSayisi,
          tavan: BILDIRIM_TAVANI,
        }),
      ],
    };
  }

  /**
   * AYRILAN ÜRÜN VARSA ADEDİ DE OLMALI — ve tersi. Yarım beyan, stok
   * ekranındaki rozeti sessizce yanlış gösterirdi.
   */
  if (veri.reservedVariantId && veri.reservedQuantity <= 0) {
    return { hatalar: [t("ayrilanAdetZorunlu")] };
  }
  if (!veri.reservedVariantId && veri.reservedQuantity > 0) {
    return { hatalar: [t("ayrilanUrunZorunlu")] };
  }
  /**
   * ============================================================================
   *  AYRILAN ÜRÜN STOKTA OLMAK ZORUNDA — SUNUCUDA DOĞRULANIR
   * ----------------------------------------------------------------------------
   *  14.08.2026'da kullanıcı yakaladı: stoğu 0 olan bir ürün seçildi ve
   *  "ayrıldı" rozeti çıktı. Ayırmak, MÜŞTERİYE GÖNDERİLECEK malı taahhüt
   *  etmektir; olmayan malı taahhüt etmek boş bir hazırlık kaydıdır ve stok
   *  ekranındaki rozeti yalancı yapar.
   *
   *  ÖLÇÜT "SERBEST STOK": mevcut stok − DİĞER açık bildirimlerde ayrılmış
   *  adet. Yalnız mevcut stoğa bakılsaydı 1 adetlik mal iki bildirime ayrı
   *  ayrı taahhüt edilebilirdi ve ikisi de "hazır" görünürdü.
   *
   *  Ekranda liste zaten stoğu olanlarla sınırlı; bu kontrol o listeyi
   *  ATLAYAN istekler için (adres/istek elle kurulabilir) ve iki kullanıcı
   *  aynı malı ayırırsa diye duruyor.
   * ============================================================================
   */
  if (veri.reservedVariantId) {
    const varyant = await prisma.productVariant.findUnique({
      where: { id: veri.reservedVariantId },
      select: { id: true, sku: true },
    });
    if (!varyant) return { hatalar: [t("ayrilanUrunBulunamadi")] };

    const mevcutStok = await varyantStogu(veri.reservedVariantId);

    const acikBildirimler = await prisma.returnNotice.findMany({
      where: {
        reservedVariantId: veri.reservedVariantId,
        status: { in: AYRILMIS_SAYILAN_DURUMLAR },
      },
      select: { status: true, reservedVariantId: true, reservedQuantity: true },
    });
    const zatenAyrilmis =
      ayrilmisAdetler(
        acikBildirimler.map((b) => ({
          durum: b.status,
          reservedVariantId: b.reservedVariantId,
          reservedQuantity: b.reservedQuantity,
        })),
      ).get(veri.reservedVariantId) ?? 0;

    // Kural SAF MODÜLDEN gelir; ekran, sunucu ve test aynı fonksiyonu çağırır.
    if (
      !ayirmaMumkunMu({
        mevcutStok,
        zatenAyrilmis,
        istenen: veri.reservedQuantity,
      })
    ) {
      return {
        hatalar: [
          t("ayrilanStokYetersiz", {
            sku: varyant.sku,
            stok: mevcutStok,
            ayrilmis: zatenAyrilmis,
            serbest: Math.max(0, serbestStok(mevcutStok, zatenAyrilmis)),
            istenen: veri.reservedQuantity,
          }),
        ],
      };
    }
  }

  /**
   * YANLIS_URUN'DA DÖNEN ÜRÜN ZORUNLU. Boş bırakılırsa 6. senaryonun defter
   * düzeltmesi hedefsiz kalır: iade formu dönen varyantı ön-dolu getiremez ve
   * kullanıcı "devam gelmiyor" der (14.08.2026'da tam bu yaşandı).
   */
  if (donenUrunZorunluMu(veri.reason)) {
    if (!veri.returnedVariantId) {
      return { hatalar: [t("donenUrunZorunlu")] };
    }
    const donen = await prisma.productVariant.findUnique({
      where: { id: veri.returnedVariantId },
      select: { id: true },
    });
    if (!donen) return { hatalar: [t("donenUrunBulunamadi")] };
  }

  const kullanici = await oturumdakiKullanici();

  await prisma.returnNotice.create({
    data: {
      saleId: veri.saleId,
      code: veri.code || null,
      noticedAt: tarih,
      reason: veri.reason,
      // Yeni bildirim her zaman BEKLENIYOR doğar: mal daha yolda.
      status: "BEKLENIYOR",
      note: veri.note || null,
      reservedVariantId: veri.reservedVariantId || null,
      reservedQuantity: veri.reservedVariantId ? veri.reservedQuantity : 0,
      // Yalnız YANLIS_URUN gerekçesinde anlamlı; diğerlerinde boş kalır.
      returnedVariantId:
        veri.reason === "YANLIS_URUN" ? veri.returnedVariantId || null : null,
      userId: kullanici?.id ?? null,
    },
  });

  /**
   * ⚠ İSTİSNA İZ BIRAKIR. "Devam edilsin" demek, kaydın SESSİZCE geçmesi
   * demek değildir; üç ay sonra "bu satışta niye dört bildirim var"
   * sorusunun cevabı olmalı (anayasa, 20.08.2026).
   */
  if (veri.tavanIstisnasi && bildirimTavaniDoldu(mevcutBildirimSayisi)) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: kullanici?.id ?? null,
          action: TAVAN_ISTISNASI_EYLEMI,
          targetType: "Sale",
          targetId: veri.saleId,
          detail: JSON.stringify({
            mevcutBildirim: mevcutBildirimSayisi,
            tavan: BILDIRIM_TAVANI,
          }),
        },
      });
    } catch (e) {
      console.error("[iade] tavan istisnası izi yazılamadı:", e);
    }
  }

  revalidatePath("/iadeler");
  // Ayrılmış rozet stok ekranından okunuyor.
  revalidatePath("/stok");
  revalidatePath(`/satislar/${veri.saleId}`);
  return { basarili: true };
}

/**
 * Durumu ilerletir. İZİNSİZ GEÇİŞ REDDEDİLİR ve sebebi söylenir.
 */
export async function bildirimDurumuGuncelle(
  bildirimId: string,
  hedef: NoticeStatus,
  /**
   * ÇIPA TARİHİ — YALNIZ ÇIPASI BİZDE DOĞMAYAN SAYAÇ İÇİN (`ELLE_GIRILIR`).
   *
   * Kargoya veren MÜŞTERİDİR; biz bir düğmeye basmıyoruz, dolayısıyla
   * "geçiş anı" o olayın anı değildir. Boş bırakılırsa sayaç BOŞ durur ve
   * ekranda _"çıpa girilmedi"_ yazar — uydurulmaz (mimar şartı ③).
   */
  cipaTarihi?: string,
  /**
   * RET GEREKÇESİ (8) ve ANALİZ SONUCU (3) — K31 ④.
   * `itirazGerekcesi` ITIRAZ_ACILDI'ya geçerken ZORUNLU; `analizSonucu`
   * ANALİZ'den çıkarken sorulur ama boş geçilebilir.
   */
  ek?: {
    itirazGerekcesi?: string;
    analizSonucu?: string;
    /** "Değişim yapacağım" seçilince gönderilecek YENİ ürün. */
    degisimVaryantId?: string;
    degisimAdet?: number;
  },
): Promise<{ hata?: string }> {
  await yetkiIste("iade.yaz");
  const t = await getTranslations("Bildirim2");

  const bildirim = await prisma.returnNotice.findUnique({
    where: { id: bildirimId },
    select: { id: true, status: true, saleId: true, returnId: true },
  });
  if (!bildirim) return { hata: t("bulunamadi") };

  if (kapaliMi(bildirim.status)) {
    return { hata: t("kapaliBildirim") };
  }
  if (!gecisGecerliMi(bildirim.status, hedef)) {
    return { hata: t("gecisIzinliDegil") };
  }

  /**
   * KAPANIŞ İKİ YOLDAN GELİR ve karıştırılmamalı:
   *   - İade işlendiyse (`returnId` dolu) kapanış doğaldır.
   *   - ITIRAZ_KABUL'den gelen kapanışta iade HİÇ doğmaz; ürün müşteride
   *     kalır. Bu yüzden `returnId` boş olması BEKLENEN durumdur.
   * MAL_GELDI'den doğrudan KAPANDI'ya geçmek, iade işlenmeden dosyayı
   * kapatmak demektir — bu geçiş açıktır çünkü kullanıcı "iade işlemeyeceğim,
   * konu kapandı" diyebilir; ama iade işlemek isterse "İadeyi işle" düğmesi
   * onu iade formuna götürür.
   */
  /**
   * ── RET GEREKÇESİ VE ANALİZ SONUCU (K31 ④) ─────────────────────────────
   *
   * ⚠ KABUL KÜMESİ FORMUN OKUDUĞU KAYNAKTAN GELİR. 23.08.2026'da iade
   * gerekçelerinde tam tersi yaşandı: açılır liste 14 değer sunuyor, sunucu
   * elle yazılmış 7'lik bir diziyle doğruluyordu ve kayıt SESSİZCE
   * düşüyordu. Burada iki taraf da `etiketler.ts`teki exhaustive `Record`tan
   * türüyor.
   *
   * ⚠ VE İKİ HATA AYRI SÖYLENİR: boş bırakmak ile TANINMAYAN bir değer
   * göndermek aynı mesajı verirse, ikinci durum birinci gibi görünür ve
   * kullanıcı seçtiği hâlde "seçmedin" cevabı alır.
   */
  const yazilacakEk: {
    itirazGerekcesi?: NoticeObjectionReason;
    analizSonucu?: AnalysisResult;
    reservedVariantId?: string;
    reservedQuantity?: number;
  } = {};

  if (itirazGerekcesiGerekliMi(hedef)) {
    const secim = (ek?.itirazGerekcesi ?? "").trim();
    if (!secim) return { hata: t("itirazGerekcesiZorunlu") };
    if (!gecerliItirazGerekcesi(secim)) {
      return { hata: t("itirazGerekcesiTanimsiz") };
    }
    yazilacakEk.itirazGerekcesi = secim;

    /**
     * ⚠ "DEĞİŞİM YAPACAĞIM" DEYİP NE GÖNDERECEĞİNİ SÖYLEMEMEK, YARIM BEYANDIR.
     * Kullanıcı 23.08.2026: _"itiraz seçeneklerinden değişimi seçiyorum,
     * sonra değişim ürünü seçin demesi lazım."_
     *
     * ⚠ VE AYIRMA KURALI BURADA DA GEÇERLİ: olmayan malı taahhüt etmek boş
     * bir hazırlık kaydıdır ve stok ekranındaki rozeti yalancı yapar. Ölçüt
     * SERBEST STOK — mevcut stok eksi DİĞER açık bildirimlerde ayrılmış adet;
     * yalnız mevcuda bakılsaydı 1 adetlik mal iki bildirime ayrı ayrı
     * taahhüt edilebilirdi.
     */
    if (itirazDegisimUrunuIster(secim)) {
      const varyantId = (ek?.degisimVaryantId ?? "").trim();
      const adet = ek?.degisimAdet ?? 0;
      if (!varyantId) return { hata: t("degisimUrunuZorunlu") };
      if (!Number.isInteger(adet) || adet < 1) {
        return { hata: t("degisimAdetGecersiz") };
      }

      const varyant = await prisma.productVariant.findUnique({
        where: { id: varyantId },
        select: { id: true, sku: true },
      });
      if (!varyant) return { hata: t("ayrilanUrunBulunamadi") };

      const mevcutStok = await varyantStogu(varyantId);
      const digerBildirimler = await prisma.returnNotice.findMany({
        where: {
          reservedVariantId: varyantId,
          status: { in: AYRILMIS_SAYILAN_DURUMLAR },
          NOT: { id: bildirimId },
        },
        select: { status: true, reservedVariantId: true, reservedQuantity: true },
      });
      const zatenAyrilmis =
        ayrilmisAdetler(
          digerBildirimler.map((b) => ({
            durum: b.status,
            reservedVariantId: b.reservedVariantId,
            reservedQuantity: b.reservedQuantity,
          })),
        ).get(varyantId) ?? 0;

      if (!ayirmaMumkunMu({ mevcutStok, zatenAyrilmis, istenen: adet })) {
        return {
          hata: t("ayrilanStokYetersiz", {
            sku: varyant.sku,
            stok: mevcutStok,
            ayrilmis: zatenAyrilmis,
            serbest: Math.max(0, serbestStok(mevcutStok, zatenAyrilmis)),
            istenen: adet,
          }),
        };
      }

      yazilacakEk.reservedVariantId = varyantId;
      yazilacakEk.reservedQuantity = adet;
    }
  }

  if (analizSonucuIstenirMi(bildirim.status)) {
    const secim = (ek?.analizSonucu ?? "").trim();
    /* Boş geçilebilir — zorunlu tutulmadığının gerekçesi kuralın yanında. */
    if (secim) {
      if (!gecerliAnalizSonucu(secim)) {
        return { hata: t("analizSonucuTanimsiz") };
      }
      yazilacakEk.analizSonucu = secim;
    }
  }

  /**
   * ── SON TARİH TÜRETMESİ (K31 ①) ────────────────────────────────────────
   *
   * Hedef durumun sayacı varsa ve o sayaç bir sütunda yaşıyorsa, son tarih
   * BURADA hesaplanır. Sistemin kaydettiği bir "olay anı" olmadığı için
   * çıpa ya geçiş anıdır ya elle girilen tarihtir.
   *
   * ⚠ ÖTEKİ SÜTUN TEMİZLENMEZ. Okuma `status`e göre yapılıyor
   * (`isleyenSayac`), yani aktif olmayan sütun hiç okunmaz. Silmek ise
   * pazaryerinin beyan ettiği bir tarihi yok etmek olabilirdi — ve o beyan
   * bizim hesabımızdan ÜSTÜNDÜR.
   */
  const turetme = sonTarihTuret(hedef, cipaTarihi);
  if (turetme?.hata) return { hata: t(turetme.hata) };

  await prisma.returnNotice.update({
    where: { id: bildirimId },
    data: {
      status: hedef,
      ...yazilacakEk,
      ...(turetme?.yazilacak ?? {}),
    },
  });

  /**
   * ⚠ TÜRETMENİN İZİ BIRAKILIR (mimar şartı ②). Ekranda duran tarih bir
   * OLGU değil bir HESAPTIR; üç ay sonra "bu tarih nereden çıktı" sorusunun
   * cevabı olmalı. Hangi geçişte, hangi kuralla, hangi andan hesaplandığı
   * yazılıyor — ve `kaynak: "TURETME"`, çünkü pazaryeri beyanı geldiğinde
   * o beyan bunu ezecek ve ikisi izde ayırt edilebilmeli.
   */
  if (turetme?.iz) {
    try {
      const kullanici = await oturumdakiKullanici();
      await prisma.auditLog.create({
        data: {
          userId: kullanici?.id ?? null,
          action: SON_TARIH_EYLEMI,
          targetType: "ReturnNotice",
          targetId: bildirimId,
          detail: JSON.stringify(turetme.iz),
        },
      });
    } catch (e) {
      /* İz tutulamadıysa geçiş yine geçerlidir; sayaç ekranda doğru durur. */
      console.error("[iade] son tarih izi yazılamadı:", e);
    }
  }

  revalidatePath("/iadeler");
  revalidatePath("/stok");
  revalidatePath(`/satislar/${bildirim.saleId}`);
  revalidatePath("/");
  return {};
}

type Turetme = {
  yazilacak?: Record<string, Date | null>;
  iz?: Record<string, string | number | null>;
  hata?: string;
};

/**
 * HEDEF DURUMUN SAYACINDAN SON TARİH ÜRETİR.
 *
 * ⚠ SAF DEĞİL AMA KURALSIZ DA DEĞİL: kuralların hepsi `lib/iade/sayac.ts`ten
 * geliyor. Gün sayısı, çıpa türü ve sütun adı buraya KOPYALANMIYOR — iki
 * yerde iki kural olsaydı biri sessizce eskirdi.
 */
function sonTarihTuret(hedef: NoticeStatus, cipaTarihi?: string): Turetme | null {
  const tur = DURUM_SAYACI[hedef];
  if (!tur) return null;

  const kural = SAYAC_KURALLARI[tur];
  /* Ölçülmemiş ya da saklanmayan sayaç: yazacak bir şey yok. */
  if (kural.gun === null || kural.sutun === null) return null;

  if (kural.cipa === "ELLE_GIRILIR") {
    /**
     * ⚠ BOŞ BIRAKMAK GEÇERLİ BİR CEVAPTIR. Kargoya veriliş tarihi bizde
     * doğmuyor; bilinmiyorsa sayaç boş durur. Geçişi engellemek, bilmediği
     * bir tarihi uydurmaya zorlardı.
     */
    if (!cipaTarihi?.trim()) return null;
    const cipa = gunMetninden(cipaTarihi);
    if (!cipa) return { hata: "cipaTarihiGecersiz" };
    const sonTarih = gunEkle(cipa, kural.gun);
    return {
      yazilacak: { [kural.sutun]: sonTarih },
      iz: {
        kaynak: "TURETME",
        hedefDurum: hedef,
        sayac: tur,
        kural: `elle girilen çıpa + ${kural.gun} gün`,
        cipa: cipa.toISOString(),
        sonTarih: sonTarih.toISOString(),
      },
    };
  }

  if (kural.cipa === "GECIS_ANI") {
    const cipa = gunDegeri(isTakvimGunu(new Date()));
    const sonTarih = gunEkle(cipa, kural.gun);
    return {
      yazilacak: { [kural.sutun]: sonTarih },
      iz: {
        kaynak: "TURETME",
        hedefDurum: hedef,
        sayac: tur,
        kural: `geçiş anı + ${kural.gun} gün`,
        cipa: cipa.toISOString(),
        sonTarih: sonTarih.toISOString(),
      },
    };
  }

  return null;
}

/**
 * ÇIPA GİRİŞİ — SİSTEM KURALI UYGULAR, TARİHİ KULLANICI VERİR.
 *
 * Yalnız çıpası bizde doğmayan sayaç için (`ELLE_GIRILIR`): kargoya veren
 * müşteridir, biz o anı bilmiyoruz. Kullanıcı tarihi girer, kuralı
 * (`+10 gün`) SİSTEM uygular — böylece hesap tek yerde kalır ve kullanıcı
 * kafadan gün saymaz.
 *
 * ⚠ AKTİF SAYAÇTAN OKUNUR, PARAMETREYLE GELMEZ. Hangi kuralın uygulanacağı
 * bildirimin O ANKİ durumundan çözülüyor; istemciden "kaç gün ekle" bilgisi
 * gelseydi, elle kurulmuş bir istek kuralı istediği gibi eğebilirdi.
 */
export async function bildirimCipasiYaz(
  bildirimId: string,
  tarihMetni: string,
): Promise<{ hata?: string }> {
  await yetkiIste("iade.yaz");
  const t = await getTranslations("Bildirim2");

  const bildirim = await prisma.returnNotice.findUnique({
    where: { id: bildirimId },
    select: { id: true, status: true, saleId: true },
  });
  if (!bildirim) return { hata: t("bulunamadi") };

  const turetme = sonTarihTuret(bildirim.status, tarihMetni);
  if (turetme?.hata) return { hata: t(turetme.hata) };
  if (!turetme?.yazilacak) return { hata: t("cipaTarihiGecersiz") };

  await prisma.returnNotice.update({
    where: { id: bildirimId },
    data: turetme.yazilacak,
  });

  try {
    const kullanici = await oturumdakiKullanici();
    await prisma.auditLog.create({
      data: {
        userId: kullanici?.id ?? null,
        action: SON_TARIH_EYLEMI,
        targetType: "ReturnNotice",
        targetId: bildirimId,
        detail: JSON.stringify(turetme.iz ?? {}),
      },
    });
  } catch (e) {
    console.error("[iade] çıpa izi yazılamadı:", e);
  }

  revalidatePath("/iadeler");
  revalidatePath(`/satislar/${bildirim.saleId}`);
  revalidatePath("/");
  return {};
}

/**
 * ============================================================================
 *  PAZARYERİ BEYANI — TÜRETMEYİ EZER
 * ----------------------------------------------------------------------------
 *  Mimar şartı ②: _"Panel ile ayrışırsa KAZANAN PANEL."_ Ve bu, anayasanın
 *  kaynak önceliği kuralının aynısı: kanalın kendi belgesi bizim hesabımızın
 *  ÜSTÜNDEDİR. Trendyol ekranda "Otomatik Onaya Kalan Süre: 19 gün" yazıyorsa
 *  o tarih geçerlidir — bizim `+10 gün` hesabımız değil.
 *
 *  ⚠ ESKİ İZ SİLİNMEZ, YENİSİ YAZILIR. Bir tarihin önce türetilip sonra
 *  panelden düzeltilmiş olması KENDİ BAŞINA bilgidir: kuralımızın ne kadar
 *  tuttuğunu ancak ikisi de dururken ölçebiliriz.
 * ============================================================================
 */
export async function bildirimSonTarihiYaz(
  bildirimId: string,
  sutun: "otomatikOnayTarihi" | "islemSonTarihi",
  tarihMetni: string,
): Promise<{ hata?: string }> {
  await yetkiIste("iade.yaz");
  const t = await getTranslations("Bildirim2");

  const bildirim = await prisma.returnNotice.findUnique({
    where: { id: bildirimId },
    select: { id: true, saleId: true },
  });
  if (!bildirim) return { hata: t("bulunamadi") };

  /* Boş gönderim = tarihi KALDIR. Yanlış girilen bir tarih silinebilmeli. */
  const temiz = tarihMetni.trim();
  const tarih = temiz === "" ? null : gunMetninden(temiz);
  if (temiz !== "" && !tarih) return { hata: t("cipaTarihiGecersiz") };

  await prisma.returnNotice.update({
    where: { id: bildirimId },
    data: { [sutun]: tarih },
  });

  try {
    const kullanici = await oturumdakiKullanici();
    await prisma.auditLog.create({
      data: {
        userId: kullanici?.id ?? null,
        action: SON_TARIH_EYLEMI,
        targetType: "ReturnNotice",
        targetId: bildirimId,
        detail: JSON.stringify({
          kaynak: "PANEL",
          sutun,
          sonTarih: tarih ? tarih.toISOString() : null,
        }),
      },
    });
  } catch (e) {
    console.error("[iade] panel tarihi izi yazılamadı:", e);
  }

  revalidatePath("/iadeler");
  revalidatePath(`/satislar/${bildirim.saleId}`);
  revalidatePath("/");
  return {};
}

/**
 * ============================================================================
 *  İADE KARGO KODU (K31 ②)
 * ----------------------------------------------------------------------------
 *  Pazaryeri, satıcı haklı bulunduğunda bir KARGO KODU atar ve ürün o kodla
 *  2 iş günü içinde müşteriye geri gönderilir (`docs/iade-sureci.md` §5).
 *
 *  ⚠ KOD DIŞARIDAN GELİR, ÜRETİLMEZ. Pazaryerinin verdiği kimliktir;
 *  sistemin uydurduğu bir numara kargo firmasında karşılığı olmayan bir
 *  değer olurdu.
 *
 *  ⚠ "GÖNDERİLDİ" DİYE AYRI BİR BAYRAK AÇILMADI. Kodun VARLIĞI olayın
 *  kanıtıdır; ikinci bir alan iki gerçek demekti ve biri gün gelip
 *  ötekinden ayrışırdı (kodu var ama bayrağı boş kayıt hangisidir?).
 * ============================================================================
 */
export async function bildirimKargoKoduYaz(
  bildirimId: string,
  kod: string,
): Promise<{ hata?: string }> {
  await yetkiIste("iade.yaz");
  const t = await getTranslations("Bildirim2");

  const bildirim = await prisma.returnNotice.findUnique({
    where: { id: bildirimId },
    select: { id: true, saleId: true, status: true },
  });
  if (!bildirim) return { hata: t("bulunamadi") };

  /**
   * ⚠ KURAL SAF MODÜLDEN. Kargolama işi yalnız `ITIRAZ_KABUL`de doğar;
   * başka bir durumda kod yazmak, kutuya hiç girmeyecek bir veri
   * biriktirmek olurdu.
   */
  if (!kargolamaDogurur(bildirim.status)) {
    return { hata: t("kargoKoduDurumUygunDegil") };
  }

  /* Boş gönderim = kodu KALDIR. Yanlış girilen kod silinebilmeli. */
  const temiz = kod.trim();
  await prisma.returnNotice.update({
    where: { id: bildirimId },
    data: { iadeKargoKodu: temiz === "" ? null : temiz },
  });

  revalidatePath("/iadeler");
  revalidatePath(`/satislar/${bildirim.saleId}`);
  return {};
}
