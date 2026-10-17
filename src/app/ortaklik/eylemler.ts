"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";
import { izYaz } from "@/lib/iz";
import { gunMetninden } from "@/lib/donem";
import { kodlaVaryantCoz } from "@/lib/varyant-kod-cozumu";
import { projeEkle, katilimEkle, katilimGuncelle, katilimSil, projeSil, ortakSil, type Katkilar } from "@/lib/ortaklik/katilim";
import { finansmanBagla, finansmanBagCoz } from "@/lib/finansman/ortaklik";
import { kapsamKuraliEkle, alimKapsaminiDegistir } from "@/lib/ortaklik/kapsam";

export type Sonuc = { tamam: boolean; hata?: string };

/**
 * Hata KODA çevrilir, ekran sabit eşlemeyle metne çevirir (anayasa: yakalanmamış
 * hata yutulmuş hatanın kardeşidir). Tanınmayan hata TAM loglanır.
 */
const BILINEN_HATALAR = [
  "ORTAKLIK_KAYIT_YOK", "SILINEMEZ_BAGLI", "KATKI_BAGLI",
  "KAPSAM_KAYIT_YOK", "KAPSAM_BIRIM", "KAPSAM_ESKI_STOK", "KAPSAM_KILITLI",
  "BAG_KAYIT_YOK", "BAG_BIRIM", "BAG_KATKI", "BAG_ZATEN_VAR",
] as const;

async function hataSonucu(e: unknown, yer: string, tekrarAnahtari: "tekrar" | "kuralCakisiyor" = "tekrar"): Promise<Sonuc> {
  const t = await getTranslations("Ortaklik");
  if (e instanceof Error && (BILINEN_HATALAR as readonly string[]).includes(e.message)) return { tamam: false, hata: t(e.message as (typeof BILINEN_HATALAR)[number]) };
  if (e && typeof e === "object" && "code" in e && e.code === "P2002") return { tamam: false, hata: t(tekrarAnahtari) };
  console.error(`[ortaklik] ${yer}`, e);
  return { tamam: false, hata: t("kaydedilemedi") };
}

function tazele(ek: string[] = []) {
  revalidatePath("/ortaklik");
  for (const yol of ek) revalidatePath(yol);
}

function katkilariOku(veri: FormData): Katkilar {
  return { sermaye: veri.get("sermaye") === "on", emek: veri.get("emek") === "on", komisyon: veri.get("komisyon") === "on", finansman: veri.get("finansman") === "on" };
}

export async function kaydet(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  const t = await getTranslations("Ortaklik");
  const alan = (ad: string) => String(veri.get(ad) ?? "").trim();
  const tur = alan("tur");
  const ad = alan("ad");
  if (!["proje", "ortak", "katilim"].includes(tur)) return { tamam: false, hata: t("gecersiz") };
  if ((tur === "proje" || tur === "ortak") && (!ad || ad.length > 191)) return { tamam: false, hata: t("gecersizAd") };
  const baslangicMetni = alan("baslangic");
  if (tur === "proje" && !gunMetninden(baslangicMetni)) return { tamam: false, hata: t("gecersizProje") };
  const sorumluluk = alan("sorumluluk");
  const katkilar = katkilariOku(veri);
  if (tur === "katilim" && (!sorumluluk || sorumluluk.length > 1000 || !Object.values(katkilar).some(Boolean))) return { tamam: false, hata: t("gecersiz") };
  try {
    await prisma.$transaction(async (tx) => {
      let id: string;
      if (tur === "proje") {
        id = (await projeEkle(tx, { ad, baslangicGunu: baslangicMetni })).id;
      } else if (tur === "ortak") {
        id = (await tx.isOrtagi.create({ data: { ad } })).id;
      } else {
        id = (await katilimEkle(tx, { projeId: alan("projeId"), ortakId: alan("ortakId"), sorumluluk, ...katkilar })).id;
      }
      await izYaz({ action: "ORTAKLIK_EKLE", companyId: baglam.companyId, targetType: tur, targetId: id, detail: JSON.stringify({ ad, sorumluluk, ...katkilar }) }, tx);
    });
  } catch (e) { return hataSonucu(e, "kaydet"); }
  tazele();
  return { tamam: true };
}

/** Proje ve ortak kartının ADI düzeltilebilir; tarih/para birimi bağlara dokunduğu için değişmez. */
export async function adDuzenle(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  const t = await getTranslations("Ortaklik");
  const tur = String(veri.get("tur") ?? "");
  const id = String(veri.get("id") ?? "");
  const ad = String(veri.get("ad") ?? "").trim();
  if ((tur !== "proje" && tur !== "ortak") || !ad || ad.length > 191) return { tamam: false, hata: t("gecersizAd") };
  try {
    await prisma.$transaction(async (tx) => {
      const once = tur === "proje" ? await tx.ortaklikProjesi.findUnique({ where: { id } }) : await tx.isOrtagi.findUnique({ where: { id } });
      if (!once) throw new Error("ORTAKLIK_KAYIT_YOK");
      if (tur === "proje") await tx.ortaklikProjesi.update({ where: { id }, data: { ad } });
      else await tx.isOrtagi.update({ where: { id }, data: { ad } });
      await izYaz({ action: "ORTAKLIK_AD_DUZENLE", companyId: baglam.companyId, targetType: tur, targetId: id, detail: JSON.stringify({ once: once.ad, sonra: ad }) }, tx);
    });
  } catch (e) { return hataSonucu(e, "adDuzenle"); }
  tazele(["/finansman"]);
  return { tamam: true };
}

export async function katilimDuzenle(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  const t = await getTranslations("Ortaklik");
  const id = String(veri.get("id") ?? "");
  const sorumluluk = String(veri.get("sorumluluk") ?? "").trim();
  const katkilar = katkilariOku(veri);
  if (!sorumluluk || sorumluluk.length > 1000 || !Object.values(katkilar).some(Boolean)) return { tamam: false, hata: t("gecersiz") };
  try {
    await prisma.$transaction(async (tx) => {
      const { once } = await katilimGuncelle(tx, id, { sorumluluk, ...katkilar });
      await izYaz({ action: "ORTAKLIK_KATILIM_DUZENLE", companyId: baglam.companyId, targetType: "OrtaklikKatilimi", targetId: id, detail: JSON.stringify({ once, sonra: { sorumluluk, ...katkilar } }) }, tx);
    });
  } catch (e) { return hataSonucu(e, "katilimDuzenle"); }
  tazele();
  return { tamam: true };
}

/** Yalnız bağı OLMAYAN (yanlış açılmış) kayıt silinir; silinen satır ize tam yazılır. */
export async function kayitSil(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  const t = await getTranslations("Ortaklik");
  const tur = String(veri.get("tur") ?? "");
  const id = String(veri.get("id") ?? "");
  if (!["proje", "ortak", "katilim"].includes(tur)) return { tamam: false, hata: t("gecersiz") };
  try {
    await prisma.$transaction(async (tx) => {
      const silinen = tur === "proje" ? await projeSil(tx, id) : tur === "ortak" ? await ortakSil(tx, id) : await katilimSil(tx, id);
      await izYaz({ action: "ORTAKLIK_SIL", companyId: baglam.companyId, targetType: tur, targetId: id, detail: JSON.stringify(silinen) }, tx);
    });
  } catch (e) { return hataSonucu(e, "kayitSil"); }
  tazele();
  return { tamam: true };
}

export async function kapsamKuraliKaydet(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  await yetkiIste("alim.yaz");
  const t = await getTranslations("Ortaklik");
  const projeId = String(veri.get("projeId") ?? "");
  const kod = String(veri.get("kod") ?? "").trim();
  // Kod üç rolden biri olabilir (SKU · Firma SKU · barkod); çözüm tek gövdeden.
  // Birden çok ürüne uyan kod SEÇİLMEZ, söylenir.
  const cozum = await kodlaVaryantCoz(kod);
  if (cozum.durum === "YOK") return { tamam: false, hata: t("kodBulunamadi", { kod }) };
  if (cozum.durum === "COK") return { tamam: false, hata: t("kodBirdenCok", { kod, sayi: cozum.adaylar.length }) };
  try {
    await prisma.$transaction(async tx => {
      const k = await kapsamKuraliEkle(tx, projeId, cozum.id);
      await izYaz({ action: "ORTAKLIK_KAPSAM_KURALI", companyId: baglam.companyId, targetType: "OrtaklikKapsamKurali", targetId: k.id, detail: JSON.stringify({ projeId, variantId: k.variantId, kod }) }, tx);
    });
  } catch (e) { return hataSonucu(e, "kapsamKuraliKaydet", "kuralCakisiyor"); }
  tazele();
  return { tamam: true };
}

export async function kapsamKuraliSil(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  await yetkiIste("alim.yaz");
  try {
    await prisma.$transaction(async tx => {
      const id = String(veri.get("id") ?? "");
      const k = await tx.ortaklikKapsamKurali.findUnique({ where: { id } });
      if (!k) throw new Error("KAPSAM_KAYIT_YOK");
      await tx.ortaklikKapsamKurali.delete({ where: { id: k.id } });
      await izYaz({ action: "ORTAKLIK_KAPSAM_KURALI_SIL", companyId: baglam.companyId, targetType: "OrtaklikKapsamKurali", targetId: k.id, detail: JSON.stringify(k) }, tx);
    });
  } catch (e) { return hataSonucu(e, "kapsamKuraliSil"); }
  tazele();
  return { tamam: true };
}

export async function alimKalemiKapsamKaydet(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  await yetkiIste("alim.yaz");
  let alimId = "";
  try {
    await prisma.$transaction(async tx => {
      const id = String(veri.get("kalemId") ?? "");
      const sonuc = await alimKapsaminiDegistir(tx, id, String(veri.get("projeId") ?? "") || null);
      alimId = sonuc.alimId;
      await izYaz({ action: "ORTAKLIK_ALIM_KAPSAMI", companyId: baglam.companyId, targetType: "PurchaseItem", targetId: id, detail: JSON.stringify(sonuc) }, tx);
    });
  } catch (e) { return hataSonucu(e, "alimKalemiKapsamKaydet"); }
  tazele([`/alimlar/${alimId}`]);
  return { tamam: true };
}

export async function finansmanKaynakBagla(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  await yetkiIste("finansman.yonet");
  const finansmanId = String(veri.get("finansmanId") ?? "").trim();
  const katilimId = String(veri.get("katilimId") ?? "").trim();
  try {
    await prisma.$transaction(async tx => {
      const bag = await finansmanBagla(tx, katilimId, finansmanId);
      await izYaz({ action: "ORTAKLIK_FINANSMAN_BAGLA", companyId: baglam.companyId, targetType: "Finansman", targetId: finansmanId, detail: JSON.stringify({ ...bag, katilimId }) }, tx);
    });
  } catch (e) { return hataSonucu(e, "finansmanKaynakBagla"); }
  tazele([`/finansman/${finansmanId}`, "/finansman"]);
  return { tamam: true };
}

export async function finansmanBagiCoz(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  await yetkiIste("finansman.yonet");
  const finansmanId = String(veri.get("finansmanId") ?? "").trim();
  try {
    await prisma.$transaction(async tx => {
      const eski = await finansmanBagCoz(tx, finansmanId);
      await izYaz({ action: "ORTAKLIK_FINANSMAN_COZ", companyId: baglam.companyId, targetType: "Finansman", targetId: finansmanId, detail: JSON.stringify({ eski }) }, tx);
    });
  } catch (e) { return hataSonucu(e, "finansmanBagiCoz"); }
  tazele([`/finansman/${finansmanId}`, "/finansman"]);
  return { tamam: true };
}
