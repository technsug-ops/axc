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
  analizSonucuIstenirMi,
  ayirmaMumkunMu,
  ayrilmisAdetler,
  donenUrunZorunluMu,
  gecisGecerliMi,
  itirazGerekcesiGerekliMi,
  kapaliMi,
  serbestStok,
} from "@/lib/iade/bildirim";
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

  const sonuc = semaKur(t).safeParse(json);
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
  ek?: { itirazGerekcesi?: string; analizSonucu?: string },
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
  } = {};

  if (itirazGerekcesiGerekliMi(hedef)) {
    const secim = (ek?.itirazGerekcesi ?? "").trim();
    if (!secim) return { hata: t("itirazGerekcesiZorunlu") };
    if (!gecerliItirazGerekcesi(secim)) {
      return { hata: t("itirazGerekcesiTanimsiz") };
    }
    yazilacakEk.itirazGerekcesi = secim;
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
