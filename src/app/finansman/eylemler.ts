"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { gunMetninden } from "@/lib/donem";
import {
  FINANSMAN_TURLERI,
  giderTutari,
  hareketHatasi,
  HAREKET_TURLERI,
  odemePlaniCoz,
  turkceSayi,
  type HareketTuru,
} from "@/lib/finansman/kural";
import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  FİNANSMAN — SUNUCU EYLEMLERİ (K304)
 * ----------------------------------------------------------------------------
 *  HESAP BURADA YAPILMAZ — kural `lib/finansman/kural.ts`te. Bu dosya izin,
 *  doğrulama ve YAZMA yapar (kart ödemesi deseni).
 *
 *  ⛔ GERÇEKLEŞMİŞ HAREKET DEĞİŞTİRİLMEZ. Düzeltme ters kayıtla yapılır ve
 *  faizi de terslenir (eksi tutarlı gider) — yoksa yanlış taksitin faizi
 *  dönem kârını kalıcı olarak eksik bırakır. PLANLI hareket henüz bir olay
 *  değildir: onay diyaloğuyla silinebilir, iz bırakır.
 *
 *  ⛔ HATA KODA ÇEVRİLİR, MESAJA DEĞİL; ham hata TAM loglanır (anayasa:
 *  «yakalanmamış hata, yutulmuş hatanın kardeşidir»).
 * ============================================================================
 */

export type FinansmanSonucu = { tamam: boolean; hata?: string };

/**
 * Tutar okuma — ORTAK gövde (`turkceSayi`). Boş = 0; belirsiz ya da bozuk
 * sayı NaN döner ve `hareketHatasi` onu reddeder. Elle `replace` yazılsaydı
 * `1234.56` sessizce 123456 olurdu.
 */
const sayiOku = (ham: string): number => {
  if (ham.trim() === "") return 0;
  return turkceSayi(ham) ?? Number.NaN;
};

// ---------------------------------------------------------------- KAYNAK
export async function kaynakEkle(_onceki: FinansmanSonucu, veri: FormData): Promise<FinansmanSonucu> {
  const baglam = await yetkiIste("finansman.yonet");
  const t = await getTranslations("Finansman");

  const tur = FINANSMAN_TURLERI.find((x) => x === veri.get("tur"));
  const kaynakAdi = String(veri.get("kaynakAdi") ?? "").trim();
  const currency = veri.get("currency") === "EUR" ? "EUR" : "TRY";
  const note = String(veri.get("note") ?? "").trim() || null;
  if (!tur) return { tamam: false, hata: t("hata.TUR_SECILMEDI") };
  if (kaynakAdi === "") return { tamam: false, hata: t("hata.KAYNAK_ADI_BOS") };
  if (kaynakAdi.length > 191) return { tamam: false, hata: t("hata.KAYNAK_ADI_UZUN") };

  let id: string;
  try {
    const k = await prisma.finansman.create({ data: { tur, kaynakAdi, currency, note }, select: { id: true } });
    id = k.id;
    await izYaz({ action: "FINANSMAN_KAYNAK_EKLE", companyId: baglam.companyId, targetType: "Finansman", targetId: id, detail: JSON.stringify({ tur, kaynakAdi, currency }) });
  } catch (e) {
    console.error("[finansman] kaynakEkle", e);
    return { tamam: false, hata: t("hata.KAYDEDILEMEDI") };
  }
  revalidatePath("/finansman");
  redirect(`/finansman/${id}`);
}

/**
 * KAYNAK SİLME — yalnız YANLIŞ AÇILMIŞ kaynak için. Tek bir gerçekleşmiş (ya
 * da ters) hareketi varsa SİLİNMEZ: olmuş para defterden kalkmaz, düzeltme
 * ters kayıtla yapılır. Planlı satırlar kaynakla birlikte silinir; iz kalır.
 */
export async function kaynakSil(finansmanId: string): Promise<FinansmanSonucu> {
  const baglam = await yetkiIste("finansman.yonet");
  const t = await getTranslations("Finansman");

  const k = await prisma.finansman.findUnique({ where: { id: finansmanId }, select: { id: true, tur: true, kaynakAdi: true, currency: true } });
  if (!k) return { tamam: false, hata: t("hata.KAYNAK_YOK") };
  try {
    await prisma.$transaction(async (tx) => {
      const olmus = await tx.finansmanHareketi.count({ where: { finansmanId: k.id, OR: [{ gerceklestiAt: { not: null } }, { isReversal: true }] } });
      if (olmus > 0) throw new Error("GERCEKLESMIS_VAR");
      const plan = await tx.finansmanHareketi.deleteMany({ where: { finansmanId: k.id, gerceklestiAt: null, isReversal: false } });
      await tx.finansman.delete({ where: { id: k.id } });
      await izYaz({ action: "FINANSMAN_KAYNAK_SIL", companyId: baglam.companyId, targetType: "Finansman", targetId: k.id, detail: JSON.stringify({ tur: k.tur, kaynakAdi: k.kaynakAdi, currency: k.currency, silinenPlan: plan.count }) }, tx);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "GERCEKLESMIS_VAR") return { tamam: false, hata: t("hata.GERCEKLESMIS_VAR") };
    console.error("[finansman] kaynakSil", e);
    return { tamam: false, hata: t("hata.KAYDEDILEMEDI") };
  }
  revalidatePath("/finansman");
  revalidatePath("/nakit-takvimi");
  redirect("/finansman");
}

// ---------------------------------------------------------------- HAREKET
export type HareketEkleGirdisi = {
  finansmanId: string;
  tur: string;
  vade: string;
  gerceklesti: boolean;
  anapara: string;
  faiz: string;
  vergi: string;
  note: string;
  faizKategoriId: string | null;
};

export async function hareketEkle(g: HareketEkleGirdisi): Promise<FinansmanSonucu> {
  const baglam = await yetkiIste("finansman.yonet");
  const t = await getTranslations("Finansman");

  const kaynak = await prisma.finansman.findUnique({ where: { id: g.finansmanId }, select: { id: true, tur: true, currency: true, kaynakAdi: true } });
  if (!kaynak) return { tamam: false, hata: t("hata.KAYNAK_YOK") };
  const tur = HAREKET_TURLERI.find((x) => x === g.tur) as HareketTuru | undefined;
  if (!tur) return { tamam: false, hata: t("hata.TUR_IZINSIZ") };
  const vade = gunMetninden(g.vade);
  if (!vade) return { tamam: false, hata: t("hata.TARIH_GECERSIZ") };

  const h = { tur, anapara: sayiOku(g.anapara), faiz: sayiOku(g.faiz), vergi: sayiOku(g.vergi) };
  const hata = hareketHatasi(kaynak.tur, h);
  if (hata) return { tamam: false, hata: t(`hata.${hata}`) };

  /* Gerçekleşmiş taksitin faizi+vergisi varsa kategori ZORUNLU ve gerçekten var olmalı. */
  const gider = g.gerceklesti ? giderTutari(h) : 0;
  let kategoriId: string | null = null;
  if (gider > 0) {
    if (!g.faizKategoriId) return { tamam: false, hata: t("hata.KATEGORI_SEC") };
    const k = await prisma.expenseCategory.findFirst({ where: { id: g.faizKategoriId, isActive: true }, select: { id: true } });
    if (!k) return { tamam: false, hata: t("hata.KATEGORI_YOK") };
    kategoriId = k.id;
  }

  try {
    await prisma.$transaction(async (tx) => {
      let faizGiderId: string | null = null;
      if (gider > 0 && kategoriId) {
        const e = await tx.expense.create({
          data: { spentAt: vade, categoryId: kategoriId, amount: gider, currency: kaynak.currency, vatRate: 0, description: `${kaynak.kaynakAdi} · ${g.vade}` },
          select: { id: true },
        });
        faizGiderId = e.id;
      }
      const yeni = await tx.finansmanHareketi.create({
        data: {
          finansmanId: kaynak.id,
          tur,
          vade,
          gerceklestiAt: g.gerceklesti ? vade : null,
          anapara: h.anapara,
          faiz: h.faiz,
          vergi: h.vergi,
          faizGiderId,
          note: g.note.trim() || null,
        },
        select: { id: true },
      });
      await izYaz({ action: "FINANSMAN_HAREKET_EKLE", companyId: baglam.companyId, targetType: "FinansmanHareketi", targetId: yeni.id, detail: JSON.stringify({ ...h, vade: g.vade, gerceklesti: g.gerceklesti, faizGiderId }) }, tx);
    });
  } catch (e) {
    console.error("[finansman] hareketEkle", e);
    return { tamam: false, hata: t("hata.KAYDEDILEMEDI") };
  }
  revalidatePath(`/finansman/${kaynak.id}`);
  revalidatePath("/finansman");
  revalidatePath("/nakit-takvimi");
  revalidatePath("/giderler");
  return { tamam: true };
}

/** Banka ödeme planı — yapıştırılan satırlar PLANLI geri ödeme olarak yazılır. */
export async function planYapistir(finansmanId: string, metin: string): Promise<FinansmanSonucu & { eklenen?: number }> {
  const baglam = await yetkiIste("finansman.yonet");
  const t = await getTranslations("Finansman");

  const kaynak = await prisma.finansman.findUnique({ where: { id: finansmanId }, select: { id: true, tur: true } });
  if (!kaynak) return { tamam: false, hata: t("hata.KAYNAK_YOK") };
  if (kaynak.tur === "SERMAYE") return { tamam: false, hata: t("hata.TUR_IZINSIZ") };
  const { satirlar, hatalar } = odemePlaniCoz(metin);
  /* TAMAMI YA DA HİÇBİRİ: tek bozuk satır varsa hiçbir şey yazılmaz ve satır numaraları söylenir. */
  if (hatalar.length > 0) return { tamam: false, hata: t("hata.PLAN_SATIR_HATALI", { satirlar: hatalar.join(", ") }) };
  if (satirlar.length === 0) return { tamam: false, hata: t("hata.PLAN_BOS") };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.finansmanHareketi.createMany({
        data: satirlar.map((s) => ({
          finansmanId: kaynak.id,
          tur: "GERI_ODEME" as const,
          vade: gunMetninden(s.vade)!,
          anapara: s.anapara,
          faiz: s.faiz,
          vergi: s.vergi,
        })),
      });
      await izYaz({ action: "FINANSMAN_PLAN_YAPISTIR", companyId: baglam.companyId, targetType: "Finansman", targetId: kaynak.id, detail: JSON.stringify({ adet: satirlar.length }) }, tx);
    });
  } catch (e) {
    console.error("[finansman] planYapistir", e);
    return { tamam: false, hata: t("hata.KAYDEDILEMEDI") };
  }
  revalidatePath(`/finansman/${kaynak.id}`);
  revalidatePath("/finansman");
  revalidatePath("/nakit-takvimi");
  return { tamam: true, eklenen: satirlar.length };
}

// ---------------------------------------------------------------- GERÇEKLEŞTİR
export async function gerceklestir(hareketId: string, tarih: string, faizKategoriId: string | null): Promise<FinansmanSonucu> {
  const baglam = await yetkiIste("finansman.yonet");
  const t = await getTranslations("Finansman");

  const gun = gunMetninden(tarih);
  if (!gun) return { tamam: false, hata: t("hata.TARIH_GECERSIZ") };
  const h = await prisma.finansmanHareketi.findUnique({
    where: { id: hareketId },
    select: { id: true, tur: true, anapara: true, faiz: true, vergi: true, gerceklestiAt: true, isReversal: true, finansman: { select: { id: true, kaynakAdi: true, currency: true } } },
  });
  if (!h) return { tamam: false, hata: t("hata.HAREKET_YOK") };
  if (h.gerceklestiAt !== null || h.isReversal) return { tamam: false, hata: t("hata.ZATEN_GERCEKLESTI") };

  const gider = giderTutari({ tur: h.tur, anapara: Number(h.anapara.toString()), faiz: Number(h.faiz.toString()), vergi: Number(h.vergi.toString()) });
  let kategoriId: string | null = null;
  if (gider > 0) {
    if (!faizKategoriId) return { tamam: false, hata: t("hata.KATEGORI_SEC") };
    const k = await prisma.expenseCategory.findFirst({ where: { id: faizKategoriId, isActive: true }, select: { id: true } });
    if (!k) return { tamam: false, hata: t("hata.KATEGORI_YOK") };
    kategoriId = k.id;
  }

  try {
    await prisma.$transaction(async (tx) => {
      let faizGiderId: string | null = null;
      if (gider > 0 && kategoriId) {
        const e = await tx.expense.create({
          data: { spentAt: gun, categoryId: kategoriId, amount: gider, currency: h.finansman.currency, vatRate: 0, description: `${h.finansman.kaynakAdi} · ${tarih}` },
          select: { id: true },
        });
        faizGiderId = e.id;
      }
      /* KOŞULLU YAZIM: iki sekmede aynı anda basılırsa ikincisi hiçbir şey yazmaz. */
      const r = await tx.finansmanHareketi.updateMany({ where: { id: h.id, gerceklestiAt: null }, data: { gerceklestiAt: gun, faizGiderId } });
      if (r.count !== 1) throw new Error("ZATEN_GERCEKLESTI");
      await izYaz({ action: "FINANSMAN_GERCEKLESTI", companyId: baglam.companyId, targetType: "FinansmanHareketi", targetId: h.id, detail: JSON.stringify({ tarih, gider, faizGiderId }) }, tx);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ZATEN_GERCEKLESTI") return { tamam: false, hata: t("hata.ZATEN_GERCEKLESTI") };
    console.error("[finansman] gerceklestir", e);
    return { tamam: false, hata: t("hata.KAYDEDILEMEDI") };
  }
  revalidatePath(`/finansman/${h.finansman.id}`);
  revalidatePath("/finansman");
  revalidatePath("/nakit-takvimi");
  revalidatePath("/giderler");
  return { tamam: true };
}

// ---------------------------------------------------------------- TERS KAYIT
export async function tersKayit(hareketId: string): Promise<FinansmanSonucu> {
  const baglam = await yetkiIste("finansman.yonet");
  const t = await getTranslations("Finansman");

  const h = await prisma.finansmanHareketi.findUnique({
    where: { id: hareketId },
    select: {
      id: true, tur: true, vade: true, anapara: true, faiz: true, vergi: true, gerceklestiAt: true, isReversal: true,
      reversedBy: { select: { id: true } },
      faizGider: { select: { categoryId: true, amount: true } },
      finansman: { select: { id: true, kaynakAdi: true, currency: true } },
    },
  });
  if (!h) return { tamam: false, hata: t("hata.HAREKET_YOK") };
  if (h.gerceklestiAt === null) return { tamam: false, hata: t("hata.PLANLI_TERSLENMEZ") };
  if (h.isReversal) return { tamam: false, hata: t("hata.ZATEN_TERS") };
  if (h.reversedBy) return { tamam: false, hata: t("hata.ZATEN_TERSLENMIS") };

  const bugun = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      let faizGiderId: string | null = null;
      if (h.faizGider) {
        const e = await tx.expense.create({
          data: { spentAt: bugun, categoryId: h.faizGider.categoryId, amount: -Number(h.faizGider.amount.toString()), currency: h.finansman.currency, vatRate: 0, description: `${h.finansman.kaynakAdi} · ters kayıt` },
          select: { id: true },
        });
        faizGiderId = e.id;
      }
      const ters = await tx.finansmanHareketi.create({
        data: {
          finansmanId: h.finansman.id,
          tur: h.tur,
          vade: h.vade,
          gerceklestiAt: bugun,
          anapara: -Number(h.anapara.toString()),
          faiz: -Number(h.faiz.toString()),
          vergi: -Number(h.vergi.toString()),
          faizGiderId,
          isReversal: true,
          reversesId: h.id,
        },
        select: { id: true },
      });
      await izYaz({ action: "FINANSMAN_TERS_KAYIT", companyId: baglam.companyId, targetType: "FinansmanHareketi", targetId: ters.id, detail: JSON.stringify({ asil: h.id, faizGiderId }) }, tx);
    });
  } catch (e) {
    console.error("[finansman] tersKayit", e);
    return { tamam: false, hata: t("hata.KAYDEDILEMEDI") };
  }
  revalidatePath(`/finansman/${h.finansman.id}`);
  revalidatePath("/finansman");
  revalidatePath("/nakit-takvimi");
  revalidatePath("/giderler");
  return { tamam: true };
}

// ---------------------------------------------------------------- PLAN SİL
export async function planSil(hareketId: string): Promise<FinansmanSonucu> {
  const baglam = await yetkiIste("finansman.yonet");
  const t = await getTranslations("Finansman");

  const h = await prisma.finansmanHareketi.findUnique({
    where: { id: hareketId },
    select: { id: true, tur: true, vade: true, anapara: true, faiz: true, vergi: true, finansmanId: true, gerceklestiAt: true },
  });
  if (!h) return { tamam: false, hata: t("hata.HAREKET_YOK") };
  if (h.gerceklestiAt !== null) return { tamam: false, hata: t("hata.GERCEKLESMIS_SILINMEZ") };

  try {
    await prisma.$transaction(async (tx) => {
      /* KOŞULLU: arada gerçekleştirilmişse silinmez. */
      const r = await tx.finansmanHareketi.deleteMany({ where: { id: h.id, gerceklestiAt: null, isReversal: false } });
      if (r.count !== 1) throw new Error("GERCEKLESMIS_SILINMEZ");
      await izYaz({ action: "FINANSMAN_PLAN_SIL", companyId: baglam.companyId, targetType: "FinansmanHareketi", targetId: h.id, detail: JSON.stringify({ tur: h.tur, vade: h.vade, anapara: h.anapara.toString(), faiz: h.faiz.toString(), vergi: h.vergi.toString() }) }, tx);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "GERCEKLESMIS_SILINMEZ") return { tamam: false, hata: t("hata.GERCEKLESMIS_SILINMEZ") };
    console.error("[finansman] planSil", e);
    return { tamam: false, hata: t("hata.KAYDEDILEMEDI") };
  }
  revalidatePath(`/finansman/${h.finansmanId}`);
  revalidatePath("/finansman");
  revalidatePath("/nakit-takvimi");
  return { tamam: true };
}
