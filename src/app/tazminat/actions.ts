"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import type { CompensationStatus, Currency } from "@/generated/prisma/enums";
import { gunDegeri, gunMetninden, isTakvimGunu } from "@/lib/donem";
import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import {
  kalanTalepEdilebilirAdet,
  karsiTarafGecerliMi,
  karsiTarafCoz,
  karsiTarafDegeri,
  TAZMINAT_KARSI_TARAF_EYLEMI,
  TAHSIL_GUNU_ALANI,
  TAZMINAT_TAHSIL_EDILDI_EYLEMI,
  TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI,
  talepTutariniCoz,
} from "@/lib/tazminat";
import { IADE_GECERLI } from "@/lib/iade-geri-alma";

export type TazminatDurumu = {
  hatalar?: string[];
  basari?: string;
};

type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

const DURUMLAR = [
  "OPEN",
  "CLAIMED",
  "ACCEPTED",
  "REJECTED",
  "SETTLED",
] as const;

function semaKur(t: Ceviri) {
  return z.object({
    /** "alim" ya da "iade" — hasarın hangi kaynaktan geldiği. */
    kaynak: z.enum(["alim", "iade"], { message: t("kalemZorunlu") }),
    kalemId: z.string().min(1, t("kalemZorunlu")),
    quantity: z
      .number({ message: t("adetSayiOlmali") })
      .int(t("adetTamSayi"))
      .min(1, t("adetEnAzBir")),
    amount: z
      .number({ message: t("tutarSayiOlmali") })
      .min(0, t("tutarNegatifOlamaz")),
    occurredAt: z.string().min(1, t("tarihZorunlu")),
    status: z.enum(DURUMLAR, { message: t("durumGecersiz") }),
    note: z.string().trim(),
  });
}

/** "1.234,56" / "1234.56" -> sayı. Boşsa NaN (zod yakalar). */
function tazele() {
  revalidatePath("/tazminat");
  revalidatePath("/ayarlar/tedarikciler");
  // Tahsilat GERÇEK NET'i değiştirebilir (K209).
  revalidatePath("/rapor");
}

/** Seçilen karşı taraf gerçekten var mı — formdan gelen kimliğe güvenilmez. */
async function karsiTarafVarMi(k: { supplierId: string | null; carrierId: string | null }): Promise<boolean> {
  if (k.supplierId) return (await prisma.supplier.count({ where: { id: k.supplierId } })) === 1;
  if (k.carrierId) return (await prisma.cargoCarrier.count({ where: { id: k.carrierId } })) === 1;
  return false;
}

/** İki kaynağın ortak şekli — çağıran taraf farkı bilmez. */
type CozulmusHasar = {
  id: string;
  sku: string;
  hasarliAdet: number;
  paraBirimi: Currency;
  tedarikciId: string | null;
  /** Hata metninde kullanılacak bağlam: alım kodu ya da sipariş no. */
  baglam: string;
};

/**
 * İADE TARAFINDA TEDARİKÇİ DOLAYLI BULUNUR.
 *
 * Alım kaleminde tedarikçi doğrudan yazılıdır. İade kaleminde yoktur:
 * müşteri bize iade eder, biz tedarikçiden isteriz. Sorumlu tedarikçi,
 * o varyantın EN SON alındığı tedarikçidir.
 *
 * ⚠ BU BİR TAHMİNDİR, kesin değildir. Aynı ürünü iki tedarikçiden aldıysanız
 * müşteriye giden malın hangisinden çıktığını iade kaydı bilmez (FIFO
 * partisi satışta tutulur, iadede değil). Bu yüzden form tedarikçiyi
 * DEĞİŞTİRİLEBİLİR gösterir; sistem sadece en olası olanı önerir.
 */
async function hasariCoz(
  kaynak: "alim" | "iade",
  kalemId: string,
): Promise<CozulmusHasar | null> {
  if (kaynak === "alim") {
    const k = await prisma.purchaseItem.findUnique({
      where: { id: kalemId },
      select: {
        id: true,
        damagedQuantity: true,
        unitCostCurrency: true,
        variant: { select: { sku: true } },
        purchase: { select: { supplierId: true, code: true } },
      },
    });
    if (!k) return null;
    return {
      id: k.id,
      sku: k.variant.sku,
      hasarliAdet: k.damagedQuantity,
      paraBirimi: k.unitCostCurrency,
      tedarikciId: k.purchase.supplierId,
      baglam: k.purchase.code,
    };
  }

  /** K44 ② — geri alınmış iadenin kalemine talep AÇILMAZ: «bulunamadı» sayılır. */
  const k = await prisma.returnItem.findFirst({
    where: { id: kalemId, return: IADE_GECERLI },
    select: {
      id: true,
      damagedQuantity: true,
      variantId: true,
      variant: { select: { sku: true } },
      return: { select: { sale: { select: { code: true } } } },
    },
  });
  if (!k) return null;

  // O varyantın son alımı: tedarikçi ve maliyet para birimi oradan gelir.
  const sonAlim = await prisma.purchaseItem.findFirst({
    where: { variantId: k.variantId, purchase: { NOT: { supplierId: null } } },
    select: {
      unitCostCurrency: true,
      purchase: { select: { supplierId: true } },
    },
    orderBy: { purchase: { purchasedAt: "desc" } },
  });

  return {
    id: k.id,
    sku: k.variant.sku,
    hasarliAdet: k.damagedQuantity,
    paraBirimi: sonAlim?.unitCostCurrency ?? "TRY",
    tedarikciId: sonAlim?.purchase.supplierId ?? null,
    baglam: k.return.sale.code ?? k.variant.sku,
  };
}

/**
 * ============================================================================
 *  TAZMİNAT TALEBİ AÇMA
 * ----------------------------------------------------------------------------
 *  Talep bir HASARA bağlanır: alım kalemindeki `damagedQuantity`.
 *  Serbest talep açılamaz — "hangi hasar için?" sorusunun cevabı olmayan
 *  bir alacak kaydı, üç ay sonra kimsenin doğrulayamayacağı bir rakamdır.
 *
 *  AYNI HASAR İKİ KEZ TALEP EDİLEMEZ: açık taleplerin adedi düşülür ve
 *  kalan sıfırsa yeni talep reddedilir.
 * ============================================================================
 */
export async function tazminatAc(
  _oncekiDurum: TazminatDurumu,
  formData: FormData,
): Promise<TazminatDurumu> {
  await yetkiIste("tazminat.yaz");

  const t = await getTranslations("Tazminat");

  const sonuc = semaKur(t).safeParse({
    kaynak: String(formData.get("kaynak") ?? "alim"),
    kalemId: String(formData.get("kalemId") ?? ""),
    quantity: Number(String(formData.get("quantity") ?? "")),
    amount: talepTutariniCoz(formData.get("amount")),
    occurredAt: String(formData.get("occurredAt") ?? ""),
    status: String(formData.get("status") ?? "OPEN"),
    note: String(formData.get("note") ?? ""),
  });
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const tarih = gunMetninden(veri.occurredAt);
  if (!tarih) return { hatalar: [t("tarihGecersiz")] };

  /**
   * HASAR İKİ KAYNAKTAN GELİR ama talep TEK kaleme bağlanır:
   *  - alım kalemi: mal bize hasarlı geldi
   *  - iade kalemi: müşteriden hasarlı döndü
   *
   * İade tarafında tedarikçi DOLAYLI bulunur: iade → satış kalemi →
   * varyant → o varyantın SON alımı. Müşteriye giden mal hangi partiden
   * çıktıysa sorumluluk o tedarikçidedir.
   */
  const kalem = await hasariCoz(veri.kaynak, veri.kalemId);
  if (!kalem) return { hatalar: [t("kalemBulunamadi")] };

  /**
   * KARŞI TARAF FORMDAN (30.09.2026) — seçilmediyse önerilen (son alımın
   * tedarikçisi). Seçilen değer VERİTABANINDA var mı sorulur; formdan gelen
   * kimliğe körü körüne güvenilmez.
   */
  const secilenHam = String(formData.get("karsiTaraf") ?? "").trim();
  let karsi: { supplierId: string | null; carrierId: string | null };
  if (secilenHam !== "") {
    const cozulen = karsiTarafCoz(secilenHam);
    if (!cozulen || !(await karsiTarafVarMi(cozulen))) return { hatalar: [t("karsiTarafGecersiz")] };
    karsi = cozulen;
  } else {
    if (!kalem.tedarikciId) {
      return { hatalar: [t("kaynakTedarikcisiz", { kod: kalem.baglam })] };
    }
    karsi = { supplierId: kalem.tedarikciId, carrierId: null };
  }

  const mevcutler = await prisma.compensation.findMany({
    where:
      veri.kaynak === "alim"
        ? { purchaseItemId: kalem.id }
        : { returnItemId: kalem.id },
    select: { quantity: true },
  });
  const kalan = kalanTalepEdilebilirAdet(
    kalem.hasarliAdet,
    mevcutler.map((m) => m.quantity),
  );

  if (kalan <= 0) {
    return { hatalar: [t("hepsiTalepEdilmis", { sku: kalem.sku })] };
  }
  if (veri.quantity > kalan) {
    return { hatalar: [t("adetKalandanFazla", { kalan })] };
  }

  /**
   * ⚠ KARŞI TARAFSIZ TALEP YAZILMAZ — VE BU KAPI 23.08.2026'DA AÇILDI.
   *
   * `supplierId` o güne kadar ŞEMADA ZORUNLUYDU; kargo şirketi de karşı
   * taraf olabilsin diye nullable'a çevrildi (K33). Zorunluluk kalkınca
   * bir kapı açıldı: karşı tarafı olmayan bir talep artık YAZILABİLİR ve
   * öyle bir kayıt ANLAMSIZDIR — kimden alacaklı olduğumuzu söylemeyen
   * bir alacak, alacak değildir.
   *
   * ⚠ KURAL BURADA DEĞİL, `lib/tazminat.ts`TE — ve bilerek. Bekçi de
   * oradan çağırıyor; iki yerde iki ölçüt olsaydı biri sessizce gevşerdi.
   *
   * ⚠ SESSİZ DÜŞMEZ (İlke #5): kalem tedarikçisiz geldiyse kullanıcı NEDEN
   * açılamadığını görür. Alım kaydında tedarikçi boş olabiliyor
   * (`purchase.supplierId` nullable) — o zaman talebin kime açılacağı
   * belli değildir ve bunu söylemek gerekir.
   */
  if (!karsiTarafGecerliMi(karsi)) {
    return { hatalar: [t("karsiTarafYokHata")] };
  }

  try {
    await prisma.compensation.create({
      data: {
        supplierId: karsi.supplierId,
        carrierId: karsi.carrierId,
        // Talep YA alım kalemine YA iade kalemine bağlanır, ikisine değil.
        purchaseItemId: veri.kaynak === "alim" ? kalem.id : null,
        returnItemId: veri.kaynak === "iade" ? kalem.id : null,
        quantity: veri.quantity,
        amount: String(veri.amount),
        // Para birimi TALEPTEN DEĞİL, malın maliyetinden gelir:
        // neyi kaybettiyseniz onu talep edersiniz.
        currency: kalem.paraBirimi,
        status: veri.status as CompensationStatus,
        occurredAt: tarih,
        note: veri.note || null,
      },
    });
  } catch (e) {
    console.error("[tazminat] beklenmeyen hata:", e);
    return { hatalar: [t("acilamadi")] };
  }

  tazele();
  return { basari: t("acildi", { sku: kalem.sku }) };
}

/**
 * Durum değiştirme. Kayıt SİLİNMEZ — reddedilen talep de geçmiştir,
 * "bu hasarı talep etmiştik, kabul etmediler" bilgisi kalır.
 */
export async function tazminatDurumDegistir(
  _oncekiDurum: TazminatDurumu,
  formData: FormData,
): Promise<TazminatDurumu> {
  await yetkiIste("tazminat.yaz");

  const t = await getTranslations("Tazminat");
  const tDurum = await getTranslations("TazminatDurumu");

  const id = String(formData.get("id") ?? "");
  const yeni = String(formData.get("status") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };
  if (!(DURUMLAR as readonly string[]).includes(yeni)) {
    return { hatalar: [t("durumGecersiz")] };
  }

  const kayit = await prisma.compensation.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  await prisma.compensation.update({
    where: { id },
    data: { status: yeni as CompensationStatus },
  });

  /**
   * ⭐ TAHSİLAT İZİ (K209) — YALNIZ SETTLED SINIRINI GEÇERKEN.
   * "Kapandı" → "Kabul edildi" → "Kapandı" gibi ileri-geri gidişlerde her
   * seferinde YENİ iz yazılır (silme yok); en yenisi geçerli olan olur.
   * Aynı duruma tekrar basmak (SETTLED → SETTLED gelmez, Select zaten
   * değişimi gerektirir) burada zaten oluşmaz.
   */
  if (kayit.status !== "SETTLED" && yeni === "SETTLED") {
    await izYaz({
      action: TAZMINAT_TAHSIL_EDILDI_EYLEMI,
      targetType: "Compensation",
      targetId: id,
      detail: JSON.stringify({
        tutar: kayit.amount.toString(),
        paraBirimi: kayit.currency,
      }),
    });
  } else if (kayit.status === "SETTLED" && yeni !== "SETTLED") {
    await izYaz({
      action: TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI,
      targetType: "Compensation",
      targetId: id,
      detail: null,
    });
  }

  tazele();
  return { basari: t("durumDegisti", { durum: tDurum(yeni) }) };
}

/**
 * ============================================================================
 *  TAHSİL GÜNÜ — PAZARYERİ BİLDİRİMİ TARİHİ (30.09.2026, kullanıcı kararı)
 * ----------------------------------------------------------------------------
 *  _«Kendi kartlarımdan bakarım ama diğer kart sahipleri bakamaz … iade
 *  bildirimi gelir, takip eden 2 gün içinde iade gerçekleşir; bildirim
 *  tarihini esas kabul edebiliriz.»_
 *
 *  Yalnız KAPANMIŞ (SETTLED) talebe girilir. YENİ bir tahsil izi yazar
 *  (silme yok); «en yeni iz kazanır» kuralı değişmediği için geçmiş bir gün
 *  girilse bile bu iz geçerli olur — gün izin İÇİNDE taşınır
 *  (`TAHSIL_GUNU_ALANI`), izin anında değil.
 *  Kart borcu ve GERÇEK NET raporu AYNI günü okur.
 * ============================================================================
 */
export async function tazminatTahsilGunuKaydet(
  _oncekiDurum: TazminatDurumu,
  formData: FormData,
): Promise<TazminatDurumu> {
  await yetkiIste("tazminat.yaz");
  const t = await getTranslations("Tazminat");

  const id = String(formData.get("id") ?? "");
  const gunMetni = String(formData.get("gun") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };
  const gun = gunMetninden(gunMetni);
  if (gun === null) return { hatalar: [t("tahsilGunuGecersiz")] };
  if (gun.getTime() > gunDegeri(isTakvimGunu(new Date())).getTime()) {
    return { hatalar: [t("tahsilGunuGelecek")] };
  }

  try {
    const kayit = await prisma.compensation.findUnique({
      where: { id },
      select: { status: true, amount: true, currency: true, occurredAt: true },
    });
    if (!kayit) return { hatalar: [t("bulunamadi")] };
    if (kayit.status !== "SETTLED") return { hatalar: [t("tahsilGunuYalnizKapanan")] };
    if (gun.getTime() < gunDegeri(isTakvimGunu(kayit.occurredAt)).getTime()) {
      return { hatalar: [t("tahsilGunuTalepOncesi")] };
    }
    await izYaz({
      action: TAZMINAT_TAHSIL_EDILDI_EYLEMI,
      targetType: "Compensation",
      targetId: id,
      detail: JSON.stringify({
        tutar: kayit.amount.toString(),
        paraBirimi: kayit.currency,
        [TAHSIL_GUNU_ALANI]: gunMetni,
        kaynak: "PAZARYERI_BILDIRIMI",
      }),
    });
  } catch (e) {
    console.error("[tazminat] tahsil günü yazılamadı:", e);
    return { hatalar: [t("tahsilGunuYazilamadi")] };
  }

  tazele();
  revalidatePath("/kart-borcu");
  return { basari: t("tahsilGunuKaydedildi") };
}

/**
 * ============================================================================
 *  KARŞI TARAF DÜZELTME (30.09.2026)
 * ----------------------------------------------------------------------------
 *  Açılmış talebin karşı tarafı yanlışsa (ütü vakası: HB ödedi, «Amazon»
 *  yazıldı) satırdan düzeltilir. Tutar, adet ve durum DEĞİŞMEZ — yalnız
 *  kimden alacaklı olduğumuz. Eski ve yeni değer `TAZMINAT_KARSI_TARAF`
 *  izine yazılır; kayıt silinmez.
 * ============================================================================
 */
export async function tazminatKarsiTarafDegistir(
  _oncekiDurum: TazminatDurumu,
  formData: FormData,
): Promise<TazminatDurumu> {
  await yetkiIste("tazminat.yaz");
  const t = await getTranslations("Tazminat");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };
  const yeni = karsiTarafCoz(String(formData.get("karsiTaraf") ?? ""));
  if (!yeni || !(await karsiTarafVarMi(yeni))) return { hatalar: [t("karsiTarafGecersiz")] };

  try {
    const kayit = await prisma.compensation.findUnique({ where: { id }, select: { supplierId: true, carrierId: true } });
    if (!kayit) return { hatalar: [t("bulunamadi")] };
    const eski = karsiTarafDegeri(kayit);
    if (eski === karsiTarafDegeri(yeni)) return { hatalar: [t("karsiTarafAyni")] };
    await prisma.$transaction(async (tx) => {
      await tx.compensation.update({ where: { id }, data: { supplierId: yeni.supplierId, carrierId: yeni.carrierId } });
      await izYaz(
        { action: TAZMINAT_KARSI_TARAF_EYLEMI, targetType: "Compensation", targetId: id, detail: JSON.stringify({ eski, yeni: karsiTarafDegeri(yeni) }) },
        tx,
      );
    });
  } catch (e) {
    console.error("[tazminat] karşı taraf değiştirilemedi:", e);
    return { hatalar: [t("karsiTarafYazilamadi")] };
  }

  tazele();
  return { basari: t("karsiTarafDegisti") };
}

/**
 * ============================================================================
 *  NOT GÜNCELLEME (K208)
 * ----------------------------------------------------------------------------
 *  _Kullanıcı 11.09.2026: talebi kabul ettirdi, faturasını kesti, ödeme
 *  gelene kadar fatura numarasını takip edebileceği bir yer istedi._
 *
 *  `note` alanı ŞEMADA zaten vardı (talep açılırken yazılıyordu) ama hiçbir
 *  ekran onu SONRADAN değiştirmiyordu — açılış anındaki notla donuyordu.
 *  Durum değişimi gibi bu da SERBEST METİN, ledger tutarı DEĞİL; ters kayıt
 *  gerektirmez, üzerine yazılır.
 * ============================================================================
 */
export async function tazminatNotGuncelle(
  _oncekiDurum: TazminatDurumu,
  formData: FormData,
): Promise<TazminatDurumu> {
  await yetkiIste("tazminat.yaz");

  const t = await getTranslations("Tazminat");

  const id = String(formData.get("id") ?? "");
  const not = String(formData.get("note") ?? "").trim();
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const kayit = await prisma.compensation.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  await prisma.compensation.update({
    where: { id },
    data: { note: not || null },
  });

  tazele();
  return { basari: t("notKaydedildi") };
}
