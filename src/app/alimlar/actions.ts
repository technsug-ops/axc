"use server";

import { yetkiIste } from "@/lib/yetki";
import { basariAdresi } from "@/lib/bildirim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { ALIM_NO_DENEME, alimNoOlustur } from "@/lib/alim-no";
import { prisma } from "@/lib/prisma";
import { izYaz } from "@/lib/iz";
import { alimEkleri, inisMaliyetleri, type AlimFaturasi } from "@/lib/alim-maliyeti";

export type AlimDurumu = {
  hatalar?: string[];
};

// ---------------------------------------------------------------------------
//  ALIM OLUŞTURMA
// ---------------------------------------------------------------------------

/** Sözlükten çözülen çeviri işlevi. */
type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/**
 * Şema, mesajlar çözüldükten SONRA kurulur.
 * Modül seviyesinde kurulamaz: getTranslations() istek kapsamlıdır.
 */
function alimSemasiKur(t: Ceviri) {
  const kalemSemasi = z
    .object({
      variantId: z.string().min(1, t("urunSecilmeli")),
      quantity: z
        .number({ message: t("adetSayiOlmali") })
        .int(t("adetTamSayi"))
        .min(1, t("adetEnAzBir")),
      unitCostAmount: z
        .number({ message: t("fiyatSayiOlmali") })
        .min(0, t("fiyatNegatifOlamaz")),
      unitCostCurrency: z.enum(["TRY", "EUR"], {
        message: t("paraBirimiGecersiz"),
      }),
      /** K171: promosyon (bedava) beyanı. Yoksa false. */
      promosyon: z.boolean().optional().default(false),
    })
    /**
     * K171 — SIFIR MALİYET İKİ YÖNLÜ KAPILANIR (İlke #11 sessiz sıfır):
     * · promosyon İŞARETLİ → maliyet 0 ZORUNLU (bedava ise fiyat olamaz)
     * · promosyon İŞARETSİZ → maliyet > 0 ZORUNLU (0 bir BEYANDIR, unutkanlık
     *   değil — işaretsiz 0 "promosyon mu hata mı" belirsizliği üretirdi).
     */
    .superRefine((k, ctx) => {
      if (k.promosyon && k.unitCostAmount !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("promosyonMaliyetSifir"),
          path: ["unitCostAmount"],
        });
      }
      if (!k.promosyon && k.unitCostAmount === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("maliyetSifirPromosyonIsaretle"),
          path: ["unitCostAmount"],
        });
      }
    });

  return z.object({
    // ALIM NUMARASI ŞEMADA YOK: sistem üretir, formdan gelmez.
    purchasedAt: z.string().min(1, t("tarihZorunlu")),
    channelAccountId: z.string(),
    creditCardId: z.string(),
    installmentCount: z
      .number({ message: t("taksitSayiOlmali") })
      .int(t("taksitTamSayi"))
      .min(1, t("taksitEnAzBir"))
      .max(36, t("taksitEnFazla36")),
    // TEDARİKÇİ ZORUNLU: alım numarası onun kodundan üretiliyor.
    // "ALM-GEN" gibi bir arka kapı bilerek YOK — kimlik keyfîliğine
    // açılan ilk delik odur.
    supplierId: z.string().min(1, t("tedarikciZorunlu")),
    /** Tedarikçideki sipariş numarası — bizim kimliğimiz değil, onlarınki. */
    supplierOrderNo: z.string().trim().max(191),
    note: z.string().trim(),
    kalemler: z.array(kalemSemasi).min(1, t("enAzBirKalem")),
    /**
     * K309 — FATURA YAPISI. Alan gelmezse bugünkü davranış (dahil · dahil ·
     * ek yok) — eski istemci ya da içe aktarma hiçbir şeyi değiştirmez.
     */
    fiyatKdvDahil: z.boolean().optional().default(true),
    kargoDahil: z.boolean().optional().default(true),
    kdv: z.number().nonnegative(t("tutarEksiOlamaz")).nullable().optional().default(null),
    kargo: z.number().nonnegative(t("tutarEksiOlamaz")).nullable().optional().default(null),
    gumruk: z.number().nonnegative(t("tutarEksiOlamaz")).nullable().optional().default(null),
  });
}

type AlimVerisi = z.infer<ReturnType<typeof alimSemasiKur>>;

/** K309 — formdaki fatura yapısı, gövdenin diliyle. */
function faturaFormdan(veri: AlimVerisi): AlimFaturasi {
  return { fiyatKdvDahil: veri.fiyatKdvDahil, kargoDahil: veri.kargoDahil, kdv: veri.kdv, kargo: veri.kargo, gumruk: veri.gumruk };
}

/**
 * K309 — fatura yapısı tutarlı mı. Hariç alımda KDV TUTARI (faturadan) ve
 * ayrı kargoda KARGO TUTARI zorunlu: boş bırakılsaydı ek sessizce 0 sayılır,
 * maliyet ve kart borcu eksik yazılırdı. Karışık para birimli alımda ek
 * DAĞITILAMAZ (kur çevrilmez) — kaydetmek yerine söylenir.
 */
function faturaHatalari(veri: AlimVerisi, tekParaBirimi: string | null, t: Ceviri): string[] {
  const h: string[] = [];
  if (!veri.fiyatKdvDahil && veri.kdv === null) h.push(t("kdvTutariZorunlu"));
  if (!veri.kargoDahil && veri.kargo === null) h.push(t("kargoTutariZorunlu"));
  if (tekParaBirimi === null && alimEkleri(faturaFormdan(veri)).maliyetEki > 0) h.push(t("karisikParadaEkOlmaz"));
  return h;
}

/** K309 — Purchase'a yazılacak fatura alanları (ek tutarlar alımın para biriminde). */
function faturaAlanlari(veri: AlimVerisi, tekParaBirimi: string | null) {
  const pb = (tekParaBirimi ?? "TRY") as "TRY" | "EUR";
  const kdv = veri.fiyatKdvDahil ? null : veri.kdv;
  const kargo = veri.kargoDahil ? null : veri.kargo;
  return {
    fiyatKdvDahil: veri.fiyatKdvDahil,
    kargoDahil: veri.kargoDahil,
    taxAmount: kdv === null ? null : String(kdv),
    taxCurrency: kdv === null ? null : pb,
    shippingAmount: kargo === null ? null : String(kargo),
    shippingCurrency: kargo === null ? null : pb,
    customsAmount: veri.gumruk === null || veri.gumruk === 0 ? null : String(veri.gumruk),
    customsCurrency: veri.gumruk === null || veri.gumruk === 0 ? null : pb,
  };
}

function hataMesaji(yol: PropertyKey[], mesaj: string, t: Ceviri): string {
  if (yol[0] === "kalemler" && typeof yol[1] === "number") {
    return t("kalemHataKalibi", { sira: yol[1] + 1, mesaj });
  }
  return mesaj;
}

export async function alimOlustur(
  _oncekiDurum: AlimDurumu,
  formData: FormData,
): Promise<AlimDurumu> {
  await yetkiIste("alim.yaz");

  const t = await getTranslations("Alim");

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = alimSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message, t)),
    };
  }
  const veri = sonuc.data;

  // Tedarikçi gerçekten var mı ve kodu var mı? Kod olmadan numara üretilemez.
  const tedarikci = await prisma.supplier.findUnique({
    where: { id: veri.supplierId },
    select: { id: true, name: true, code: true, isActive: true },
  });
  if (!tedarikci || !tedarikci.isActive) {
    return { hatalar: [t("tedarikciBulunamadi")] };
  }
  if (!tedarikci.code) {
    return { hatalar: [t("tedarikciKodsuz", { ad: tedarikci.name })] };
  }

  const tarih = new Date(veri.purchasedAt);
  if (Number.isNaN(tarih.getTime())) {
    return { hatalar: [t("tarihGecersiz")] };
  }

  // Seçilen varyantlar gerçekten var mı?
  const varyantIdleri = [...new Set(veri.kalemler.map((k) => k.variantId))];
  const bulunan = await prisma.productVariant.count({
    where: { id: { in: varyantIdleri } },
  });
  if (bulunan !== varyantIdleri.length) {
    return { hatalar: [t("kalemMevcutDegil")] };
  }

  // Özet alanları: SADECE tüm kalemler aynı para birimindeyse doldurulur.
  // Karma para birimli alımda tek bir toplam yanıltıcı olurdu; boş bırakılır
  // ve toplamlar her zaman kalemlerden hesaplanır.
  const paraBirimleri = new Set(veri.kalemler.map((k) => k.unitCostCurrency));
  const tekParaBirimi =
    paraBirimleri.size === 1 ? [...paraBirimleri][0] : null;
  const malToplami = tekParaBirimi
    ? veri.kalemler.reduce(
        (toplam, k) => toplam + k.unitCostAmount * k.quantity,
        0,
      )
    : null;

  const faturaHata = faturaHatalari(veri, tekParaBirimi, t);
  if (faturaHata.length) return { hatalar: faturaHata };

  /**
   * Numara üretimi ile yazma arasında başkası aynı numarayı alırsa
   * `code` benzersizlik kısıtı (P2002) tetiklenir; sıra yeniden okunarak
   * denenir. Tek kullanıcıda pratikte hiç olmaz, iki sekmede olabilir.
   */
  let yeniId = "";
  let sonHata: unknown = null;

  for (let deneme = 0; deneme < ALIM_NO_DENEME; deneme++) {
    const kod = await alimNoOlustur(prisma, tedarikci.code, new Date());
    try {
      const alim = await prisma.purchase.create({
        data: {
          code: kod,
          // Spec gereği yeni alım "sipariş verildi" durumunda başlar.
          status: "ORDERED",
          purchasedAt: tarih,
          supplierId: tedarikci.id,
          // Serbest metin alanı ARTIK YAZILMIYOR ama SİLİNMEDİ: eski
          // kayıtların yazıldığı hâli duruyor (şemadaki not).
          supplierOrderNo: veri.supplierOrderNo || null,
          note: veri.note || null,
          installmentCount: veri.installmentCount,
          channelAccountId: veri.channelAccountId || null,
          creditCardId: veri.creditCardId || null,
          goodsAmount: malToplami,
          goodsCurrency: tekParaBirimi,
          ...faturaAlanlari(veri, tekParaBirimi),
          items: {
            create: veri.kalemler.map((k) => ({
              variantId: k.variantId,
              quantity: k.quantity,
              unitCostAmount: k.unitCostAmount,
              unitCostCurrency: k.unitCostCurrency,
              promosyon: k.promosyon,
            })),
          },
        },
        select: { id: true },
      });
      yeniId = alim.id;
      break;
    } catch (e) {
      sonHata = e;
      const hataKodu =
        typeof e === "object" && e !== null && "code" in e
          ? String((e as { code: unknown }).code)
          : "";
      // P2002 = benzersizlik çakışması: numarayı yeniden üretip dene.
      if (hataKodu !== "P2002") break;
    }
  }

  if (!yeniId) {
    console.error("[alim] kaydedilemedi:", sonHata);
    return { hatalar: [t("kaydedilemedi")] };
  }

  revalidatePath("/alimlar");
  redirect(basariAdresi(`/alimlar/${yeniId}`, "eklendi"));
}

// ---------------------------------------------------------------------------
//  ALIM GÜNCELLEME VE İPTAL
// ---------------------------------------------------------------------------

/**
 * Kalem başına KABUL EDİLMİŞ adet: PURCHASE_IN hareketlerinin toplamı.
 * "Gelen sağlam" kolon olarak tutulmuyor (şema kuralı), ledger'dan türetilir.
 */
async function gelenAdetler(alimId: string): Promise<Map<string, number>> {
  const hareketler = await prisma.stockMovement.findMany({
    where: { purchaseItem: { purchaseId: alimId } },
    select: { purchaseItemId: true, quantityDelta: true },
  });
  const harita = new Map<string, number>();
  for (const h of hareketler) {
    if (!h.purchaseItemId) continue;
    harita.set(
      h.purchaseItemId,
      (harita.get(h.purchaseItemId) ?? 0) + h.quantityDelta,
    );
  }
  return harita;
}

/**
 * ALIM GÜNCELLEME — üç kural (kullanıcı kararı 10.08.2026).
 *
 * 1. Sipariş adedi KABUL EDİLMİŞ adedin ALTINA inemez. Gelen mal stok
 *    defterine yazıldı; siparişi ondan aza çekmek defteri yalanlamak olurdu.
 * 2. Kabul edilmiş kalem ÇIKARILAMAZ — defterdeki hareket sahipsiz kalırdı.
 * 3. Maliyet değişirse o kaleme ait PURCHASE_IN hareketlerinin maliyet
 *    damgası da düzeltilir. Bu defteri "yeniden yazmak" DEĞİL, yanlış
 *    girilmiş bir veriyi düzeltmektir: geçmiş satışlar kendi maliyetlerini
 *    satış anında kaydettiği için ETKİLENMEZ; yalnız o partiden bundan
 *    sonra yapılacak satışlar doğru maliyeti kullanır.
 *
 * Durum sonunda yeniden hesaplanır: hiç gelmediyse ORDERED, kısmen
 * PARTIALLY_RECEIVED, tamamı geldiyse RECEIVED.
 */
export async function alimGuncelle(
  _oncekiDurum: AlimDurumu,
  formData: FormData,
): Promise<AlimDurumu> {
  await yetkiIste("alim.yaz");

  const t = await getTranslations("Alim");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("bulunamadi")] };

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = alimSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message, t)),
    };
  }
  const veri = sonuc.data;

  const alim = await prisma.purchase.findUnique({
    where: { id },
    include: { items: { include: { variant: { select: { sku: true } } } } },
  });
  if (!alim) return { hatalar: [t("bulunamadi")] };
  if (alim.status === "CANCELLED") {
    return { hatalar: [t("iptalliDuzenlenemez")] };
  }

  const tarih = new Date(veri.purchasedAt);
  if (Number.isNaN(tarih.getTime())) return { hatalar: [t("tarihGecersiz")] };

  // ALIM NUMARASI DÜZENLEMEDE DEĞİŞMEZ. Kod bir kere doğar; etikete ve
  // yazışmaya girmiş olabilir. Bu yüzden çakışma kontrolü de gerekmiyor.
  const tedarikci = await prisma.supplier.findUnique({
    where: { id: veri.supplierId },
    select: { id: true, isActive: true },
  });
  if (!tedarikci || !tedarikci.isActive) {
    return { hatalar: [t("tedarikciBulunamadi")] };
  }

  const gelen = await gelenAdetler(id);
  const eskiKalemler = new Map(alim.items.map((k) => [k.variantId, k]));
  const yeniVaryantlar = new Set(veri.kalemler.map((k) => k.variantId));

  const hatalar: string[] = [];

  for (const eski of alim.items) {
    if (yeniVaryantlar.has(eski.variantId)) continue;
    if ((gelen.get(eski.id) ?? 0) > 0) {
      hatalar.push(t("kalemCikarilamaz", { urun: eski.variant.sku }));
    }
  }

  for (const yeni of veri.kalemler) {
    const eski = eskiKalemler.get(yeni.variantId);
    if (!eski) continue;
    const gelmis = gelen.get(eski.id) ?? 0;
    if (yeni.quantity < gelmis) {
      hatalar.push(
        t("adetGeleninAltinda", {
          urun: eski.variant.sku,
          adet: yeni.quantity,
          gelen: gelmis,
        }),
      );
    }
  }
  if (hatalar.length > 0) return { hatalar };

  const paraBirimleri = new Set(veri.kalemler.map((k) => k.unitCostCurrency));
  const tekParaBirimi = paraBirimleri.size === 1 ? [...paraBirimleri][0] : null;
  const malToplami = tekParaBirimi
    ? veri.kalemler.reduce(
        (toplam, k) => toplam + k.unitCostAmount * k.quantity,
        0,
      )
    : null;

  const faturaHata = faturaHatalari(veri, tekParaBirimi, t);
  if (faturaHata.length) return { hatalar: faturaHata };

  /**
   * K309 — İNİŞ MALİYETİ, DÜZENLEMEDEN SONRAKİ hâlle. Anahtar varyant (bir
   * alımda her varyant bir kalem). Mal kabulde stoğa yazılan maliyet budur;
   * KDV · kargo · gümrük ya da bir kalemin fiyatı değişince HER kabul edilmiş
   * kalemin maliyeti değişebilir — bu yüzden ölçüt «fiyat değişti mi» değil
   * «iniş maliyeti değişti mi».
   */
  const yeniInis = inisMaliyetleri(
    faturaFormdan(veri),
    veri.kalemler.map((k) => ({ anahtar: k.variantId, adet: k.quantity, birim: k.unitCostAmount, paraBirimi: k.unitCostCurrency })),
  ).birim;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id },
        data: {
          ...faturaAlanlari(veri, tekParaBirimi),

          purchasedAt: tarih,
          supplierId: tedarikci.id,
          supplierOrderNo: veri.supplierOrderNo || null,
          note: veri.note || null,
          installmentCount: veri.installmentCount,
          channelAccountId: veri.channelAccountId || null,
          creditCardId: veri.creditCardId || null,
          goodsAmount: malToplami,
          goodsCurrency: tekParaBirimi,
        },
      });

      // Çıkarılanlar — buraya yalnız hiç mal gelmemiş kalemler düşebilir.
      for (const eski of alim.items) {
        if (yeniVaryantlar.has(eski.variantId)) continue;
        await tx.purchaseItem.delete({ where: { id: eski.id } });
      }

      for (const yeni of veri.kalemler) {
        const eski = eskiKalemler.get(yeni.variantId);

        if (!eski) {
          await tx.purchaseItem.create({
            data: {
              purchaseId: id,
              variantId: yeni.variantId,
              quantity: yeni.quantity,
              unitCostAmount: String(yeni.unitCostAmount),
              unitCostCurrency: yeni.unitCostCurrency,
              promosyon: yeni.promosyon,
            },
          });
          continue;
        }

        /**
         * K309 — ölçüt İNİŞ maliyeti: defterdeki PURCHASE_IN damgası
         * (kabul edilmişse) yeni iniş maliyetinden farklı mı. Eski ölçüt
         * yalnız fatura fiyatına bakıyordu; KDV/kargo/gümrük düzeltmesini
         * görmezdi. Varsayılanda iniş = fiyat, yani eski davranış aynen.
         */
        const yeniMaliyet = yeniInis.get(yeni.variantId) ?? yeni.unitCostAmount;
        const defterdeki = await tx.stockMovement.findFirst({
          where: { purchaseItemId: eski.id, type: "PURCHASE_IN" },
          select: { unitCostAmount: true, unitCostCurrency: true },
        });
        const maliyetDegisti =
          defterdeki !== null &&
          (defterdeki.unitCostAmount === null ||
            Number(defterdeki.unitCostAmount.toString()) !== yeniMaliyet ||
            defterdeki.unitCostCurrency !== yeni.unitCostCurrency);

        await tx.purchaseItem.update({
          where: { id: eski.id },
          data: {
            quantity: yeni.quantity,
            unitCostAmount: String(yeni.unitCostAmount),
            unitCostCurrency: yeni.unitCostCurrency,
            promosyon: yeni.promosyon,
          },
        });

        // KURAL 3 — defterdeki maliyet damgası da düzelir.
        if (maliyetDegisti && (gelen.get(eski.id) ?? 0) > 0) {
          const guncellenen = await tx.stockMovement.updateMany({
            where: { purchaseItemId: eski.id },
            data: {
              /** K309 — iniş maliyeti (fiyat + dağıtılan KDV/kargo/gümrük payı). */
              unitCostAmount: String(yeniMaliyet),
              unitCostCurrency: yeni.unitCostCurrency,
            },
          });
          /**
           * ⛔ İZSİZ MALİYET DEĞİŞİKLİĞİ YOK (K90, 01.09.2026).
           * Bu yol defterdeki maliyet damgasını değiştiriyordu ve HİÇBİR İZ
           * BIRAKMIYORDU: kim, ne zaman, hangi değerden hangi değere —
           * üçünün de cevabı yoktu. Ölçümde `src/` içinde iz yazmadan
           * `StockMovement` güncelleyen TEK yol buydu.
           *
           * ⚠ VE BEYAN EDİLEN SINIR: bu güncelleme yalnız `purchaseItemId`
           * ile bağlı hareketlere ulaşıyor. Partiden ÇEKİLMİŞ çıkışlar
           * (`sourceMovementId`) buradan güncellenmiyor — o iş K127'nin
           * parti maliyeti düzeltme yolunda. İz bu sınırı da yazıyor ki
           * okuyan "her yer düzeldi" sanmasın.
           */
          await izYaz(
            {
              action: "ALIM_MALIYETI_DUZELTILDI",
              targetType: "PurchaseItem",
              targetId: eski.id,
              detail: JSON.stringify({
                eskiMaliyet: defterdeki?.unitCostAmount?.toString() ?? null,
                eskiFaturaFiyati: eski.unitCostAmount.toString(),
                eskiParaBirimi: eski.unitCostCurrency,
                yeniMaliyet: String(yeniMaliyet),
                yeniFaturaFiyati: String(yeni.unitCostAmount),
                yeniParaBirimi: yeni.unitCostCurrency,
                guncellenenHareket: guncellenen.count,
                sinir:
                  "yalniz purchaseItemId ile bagli hareketler — cikislar (sourceMovementId) DAHIL DEGIL",
              }),
            },
            tx,
          );
        }
      }

      const guncelKalemler = await tx.purchaseItem.findMany({
        where: { purchaseId: id },
        select: { id: true, quantity: true, damagedQuantity: true },
      });
      const yeniGelen = await gelenAdetler(id);
      const toplamBeklenen = guncelKalemler.reduce((s, k) => s + k.quantity, 0);
      const toplamGelen = guncelKalemler.reduce(
        (s, k) => s + (yeniGelen.get(k.id) ?? 0) + k.damagedQuantity,
        0,
      );

      await tx.purchase.update({
        where: { id },
        data: {
          status:
            toplamGelen === 0
              ? "ORDERED"
              : toplamGelen >= toplamBeklenen
                ? "RECEIVED"
                : "PARTIALLY_RECEIVED",
        },
      });
    },
    /**
     * K309 — kalem başına bir defter okuması eklendi (iniş maliyeti ölçütü).
     * Tavan AÇIKÇA: canlıya gidiş-dönüş ~30–40 ms (ölçüldü 01.09); 40 kalemli
     * bir alım ~3 sn eder, varsayılan 5 sn'ye dayanmasın.
     */
    { timeout: 30_000 });
  } catch (e) {
    console.error("[alim] guncellenemedi:", e);
    return { hatalar: [t("guncellenemedi")] };
  }

  revalidatePath("/alimlar");
  revalidatePath(`/alimlar/${id}`);
  revalidatePath("/stok");
  redirect(basariAdresi(`/alimlar/${id}`, "guncellendi"));
}

/**
 * ALIM İPTAL — kayıt SİLİNMEZ, iptal olarak işaretlenir.
 *
 * Mal kabul yapılmışsa iptal edilemez: stok defterine giren malı geri almak
 * ayrı bir düzeltme işidir, bir iptal düğmesinin sessizce yapacağı şey değil.
 */
export async function alimIptalEt(
  _oncekiDurum: AlimDurumu,
  formData: FormData,
): Promise<AlimDurumu> {
  await yetkiIste("alim.yaz");

  const t = await getTranslations("Alim");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("bulunamadi")] };

  const alim = await prisma.purchase.findUnique({ where: { id } });
  if (!alim) return { hatalar: [t("bulunamadi")] };

  const gelen = await gelenAdetler(id);
  const toplamGelen = [...gelen.values()].reduce((s, n) => s + n, 0);
  if (toplamGelen > 0) return { hatalar: [t("iptalEdilemez")] };

  await prisma.purchase.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/alimlar");
  revalidatePath(`/alimlar/${id}`);
  return {};
}
