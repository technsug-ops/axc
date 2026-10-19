"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";
import { izYaz } from "@/lib/iz";
import { gunDegeri, gunMetni, gunMetninden, isTakvimGunu } from "@/lib/donem";
import { kodlaVaryantCoz } from "@/lib/varyant-kod-cozumu";
import { projeEkle, katilimEkle, katilimGuncelle, katilimSil, projeSil, ortakSil, type Katkilar } from "@/lib/ortaklik/katilim";
import { finansmanBagla, finansmanBagCoz } from "@/lib/finansman/ortaklik";
import { kapsamKuraliEkle, alimKapsaminiDegistir } from "@/lib/ortaklik/kapsam";
import { anlasmaDogrula, formSayisi, type AnlasmaGirdisi } from "@/lib/ortaklik/paylasim";
import { paylasimGetir } from "@/lib/ortaklik/paylasim-veri";
import { donemGeriAl, donemKesinlestir, kesinlestirmeKontrolu, odemeKaydet, odemeKontrolu, odemeTersle } from "@/lib/ortaklik/kesinlestirme";

export type Sonuc = { tamam: boolean; hata?: string };

/**
 * Hata KODA çevrilir, ekran sabit eşlemeyle metne çevirir (anayasa: yakalanmamış
 * hata yutulmuş hatanın kardeşidir). Tanınmayan hata TAM loglanır.
 */
const BILINEN_HATALAR = [
  "ORTAKLIK_KAYIT_YOK", "SILINEMEZ_BAGLI", "KATKI_BAGLI",
  "KAPSAM_KAYIT_YOK", "KAPSAM_BIRIM", "KAPSAM_ESKI_STOK", "KAPSAM_KILITLI",
  "BAG_KAYIT_YOK", "BAG_BIRIM", "BAG_KATKI", "BAG_ZATEN_VAR",
  "ANLASMA_AY", "ANLASMA_ESKI_AY", "ANLASMA_YONTEM", "ANLASMA_KARMA", "ANLASMA_KATILIM",
  "ANLASMA_DEGER", "ANLASMA_SABIT_TOPLAM", "ANLASMA_SORUMLULUK_TOPLAM",
  "KESIN_AY_YOK", "KESIN_ZATEN", "KESIN_AY_BITMEDI", "KESIN_DONEM_ACIK", "KESIN_HESAPLANAMADI", "KESIN_SIRA",
  "GERI_SON_DEGIL", "GERI_GEREKCE",
  "ODEME_TUTAR", "ODEME_TARIH", "ODEME_YATIRIM_ONAY", "ODEME_KATEGORI", "ODEME_ZATEN_TERS",
] as const;

async function hataSonucu(e: unknown, yer: string, tekrarAnahtari: "tekrar" | "kuralCakisiyor" | "anlasmaAyDolu" = "tekrar"): Promise<Sonuc> {
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

const sayi = (v: FormDataEntryValue | null) => formSayisi(String(v ?? ""));

/**
 * K347 · 4a — ANLAŞMA SÜRÜMÜ. Sürüm DÜZENLENMEZ: değişiklik yeni geçerlilik ayıyla yeni
 * sürümdür (geçmiş aylar eski şartla kalır). Aynı aya ikinci sürüm yazılamaz (benzersiz).
 * Kayıt + paylar + iz TEK işlemde. ⛔ 4b'de: kesinleşmiş ayda kullanılan sürüm silinemez.
 */
export async function anlasmaKaydet(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  const projeId = String(veri.get("projeId") ?? "");
  const katilimIdleri = veri.getAll("katilimId").map(String);
  const girdi: AnlasmaGirdisi = {
    gecerlilikAyi: String(veri.get("gecerlilikAyi") ?? "").trim(),
    kalanYontemi: String(veri.get("kalanYontemi") ?? ""),
    karmaSermayeYuzdesi: veri.get("kalanYontemi") === "KARMA" ? sayi(veri.get("karmaSermayeYuzdesi")) : null,
    zararYontemi: String(veri.get("zararYontemi") ?? ""),
    karKullanimi: String(veri.get("karKullanimi") ?? ""),
    paylar: katilimIdleri.map((katilimId) => ({
      katilimId,
      sabitOran: sayi(veri.get(`sabitOran_${katilimId}`)),
      emekUcreti: sayi(veri.get(`emekUcreti_${katilimId}`)),
      sorumlulukPayi: sayi(veri.get(`sorumlulukPayi_${katilimId}`)),
    })),
  };
  try {
    await prisma.$transaction(async (tx) => {
      const proje = await tx.ortaklikProjesi.findUnique({ where: { id: projeId }, select: { id: true, baslangic: true, katilimlar: { select: { id: true } } } });
      if (!proje) throw new Error("ORTAKLIK_KAYIT_YOK");
      const hata = anlasmaDogrula(girdi, proje.baslangic.toISOString().slice(0, 7), proje.katilimlar.map((k) => k.id));
      if (hata) throw new Error(hata);
      const kayit = await tx.ortaklikAnlasmasi.create({
        data: {
          projeId,
          gecerlilikAyi: new Date(`${girdi.gecerlilikAyi}-01T00:00:00.000Z`),
          kalanYontemi: girdi.kalanYontemi as "SABIT" | "SERMAYE" | "KARMA",
          karmaSermayeYuzdesi: girdi.karmaSermayeYuzdesi === null ? null : girdi.karmaSermayeYuzdesi.toFixed(2),
          zararYontemi: girdi.zararYontemi as "DEVREDER" | "KAR_ORANI" | "SORUMLULUK",
          karKullanimi: girdi.karKullanimi as "DAGIT" | "YENIDEN_YATIRIM",
          aciklama: String(veri.get("aciklama") ?? "").trim() || null,
          paylar: { create: girdi.paylar.map((p) => ({ katilimId: p.katilimId, sabitOran: p.sabitOran.toFixed(2), emekUcreti: p.emekUcreti.toFixed(2), sorumlulukPayi: p.sorumlulukPayi.toFixed(2) })) },
        },
      });
      await izYaz({ action: "ORTAKLIK_ANLASMA_EKLE", companyId: baglam.companyId, targetType: "OrtaklikAnlasmasi", targetId: kayit.id, detail: JSON.stringify({ projeId, ...girdi }) }, tx);
    });
  } catch (e) { return hataSonucu(e, "anlasmaKaydet", "anlasmaAyDolu"); }
  tazele([`/ortaklik/${projeId}/paylasim`]);
  return { tamam: true };
}

export async function anlasmaSil(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await yetkiIste("ortaklik.yonet");
  const id = String(veri.get("id") ?? "");
  let projeId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const k = await tx.ortaklikAnlasmasi.findUnique({ where: { id }, include: { paylar: true } });
      if (!k) throw new Error("ORTAKLIK_KAYIT_YOK");
      projeId = k.projeId;
      await tx.ortaklikAnlasmasi.delete({ where: { id } });
      await izYaz({ action: "ORTAKLIK_ANLASMA_SIL", companyId: baglam.companyId, targetType: "OrtaklikAnlasmasi", targetId: id, detail: JSON.stringify(k) }, tx);
    });
  } catch (e) { return hataSonucu(e, "anlasmaSil"); }
  tazele([`/ortaklik/${projeId}/paylasim`]);
  return { tamam: true };
}

// ═══ K347 · 4b — KESİNLEŞTİRME · ORTAK HESABI ═══════════════════════════════

/** Kesinleştirme ve ödeme rakam gösterir/yazar: ortaklık izni + kâr görme izni BİRLİKTE. */
async function karliYetki() {
  const baglam = await yetkiIste("ortaklik.yonet");
  await yetkiIste("satis.kar.gor");
  return baglam;
}

export async function donemKesinlestirEylem(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await karliYetki();
  const projeId = String(veri.get("projeId") ?? "");
  const ay = String(veri.get("ay") ?? "");
  try {
    const proje = await prisma.ortaklikProjesi.findUnique({ where: { id: projeId }, select: { id: true, currency: true, baslangic: true } });
    if (!proje || !/^\d{4}-(0[1-9]|1[0-2])$/.test(ay)) throw new Error("ORTAKLIK_KAYIT_YOK");
    // Hesap ince kabuktan — önizlemeyle AYNI rakam donar.
    const veriler = await paylasimGetir(proje, ay);
    const kapali = await prisma.muhasebeDonemi.findFirst({ where: { yil: Number(ay.slice(0, 4)), ay: Number(ay.slice(5, 7)), durum: "KAPALI" }, select: { id: true } });
    const buAy = gunMetni(gunDegeri(isTakvimGunu(new Date()))).slice(0, 7);
    const hata = kesinlestirmeKontrolu({ ay, buAy, muhasebeKapali: Boolean(kapali), sonuclar: veriler.sonuclar });
    if (hata) throw new Error(hata);
    const sonuc = veriler.sonuclar.find((x) => x.ay === ay)!;
    await prisma.$transaction(async (tx) => {
      const donem = await donemKesinlestir(tx, { projeId, sonuc, userId: baglam.kullaniciId });
      await izYaz({ action: "ORTAKLIK_DONEM_KESIN", companyId: baglam.companyId, targetType: "OrtaklikDonemi", targetId: donem.id, detail: JSON.stringify(sonuc) }, tx);
    }, { timeout: 30_000 });
  } catch (e) { return hataSonucu(e, "donemKesinlestir"); }
  tazele([`/ortaklik/${projeId}/paylasim`, `/ortaklik/${projeId}/hesap`]);
  return { tamam: true };
}

export async function donemGeriAlEylem(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await karliYetki();
  const donemId = String(veri.get("donemId") ?? "");
  let projeId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const d = await donemGeriAl(tx, { donemId, gerekce: String(veri.get("gerekce") ?? ""), userId: baglam.kullaniciId, bugun: gunDegeri(isTakvimGunu(new Date())) });
      projeId = d.projeId;
      await izYaz({ action: "ORTAKLIK_DONEM_GERI_AL", companyId: baglam.companyId, targetType: "OrtaklikDonemi", targetId: donemId, detail: JSON.stringify({ ay: d.ay, gerekce: String(veri.get("gerekce") ?? "").trim() }) }, tx);
    }, { timeout: 30_000 });
  } catch (e) { return hataSonucu(e, "donemGeriAl"); }
  tazele([`/ortaklik/${projeId}/paylasim`, `/ortaklik/${projeId}/hesap`]);
  return { tamam: true };
}

export async function odemeKaydetEylem(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await karliYetki();
  const projeId = String(veri.get("projeId") ?? "");
  const katilimId = String(veri.get("katilimId") ?? "");
  const tarihMetni = String(veri.get("tarih") ?? "");
  const tarih = gunMetninden(tarihMetni);
  const giderMi = veri.get("gider") === "on";
  const kategoriId = String(veri.get("kategoriId") ?? "");
  try {
    if (giderMi) await yetkiIste("gider.yaz");
    const ay = tarih ? tarihMetni.slice(0, 7) : "";
    const surum = tarih ? await prisma.ortaklikAnlasmasi.findFirst({ where: { projeId, gecerlilikAyi: { lte: new Date(`${ay}-01T00:00:00.000Z`) } }, orderBy: { gecerlilikAyi: "desc" }, select: { karKullanimi: true } }) : null;
    const tutar = formSayisi(String(veri.get("tutar") ?? ""));
    const hata = odemeKontrolu({ tutar, tarihGecerli: Boolean(tarih), karKullanimi: surum?.karKullanimi ?? null, yatirimOnayi: veri.get("yatirimOnayi") === "on", giderMi, kategoriId });
    if (hata) throw new Error(hata);
    await prisma.$transaction(async (tx) => {
      const k = await tx.ortaklikKatilimi.findFirst({ where: { id: katilimId, projeId }, select: { ortak: { select: { ad: true } }, proje: { select: { ad: true } } } });
      if (!k) throw new Error("ORTAKLIK_KAYIT_YOK");
      const t = await getTranslations("Ortaklik");
      const aciklama = String(veri.get("aciklama") ?? "").trim() || null;
      const h = await odemeKaydet(tx, { projeId, katilimId, tarih: new Date(`${tarihMetni}T00:00:00.000Z`), tutar, aciklama, gider: giderMi ? { kategoriId, aciklama: t("odemeGiderAciklamasi", { ortak: k.ortak.ad, proje: k.proje.ad }) } : null, userId: baglam.kullaniciId });
      await izYaz({ action: "ORTAKLIK_ODEME", companyId: baglam.companyId, targetType: "OrtakCariHareketi", targetId: h.id, detail: JSON.stringify({ projeId, katilimId, tutar, tarih: tarihMetni, giderMi, yatirimDonemi: surum?.karKullanimi === "YENIDEN_YATIRIM" }) }, tx);
    });
  } catch (e) { return hataSonucu(e, "odemeKaydet"); }
  tazele([`/ortaklik/${projeId}/hesap`, "/giderler", "/rapor"]);
  return { tamam: true };
}

export async function odemeTersleEylem(_onceki: Sonuc, veri: FormData): Promise<Sonuc> {
  const baglam = await karliYetki();
  const hareketId = String(veri.get("hareketId") ?? "");
  let projeId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const t = await getTranslations("Ortaklik");
      const ters = await odemeTersle(tx, { hareketId, userId: baglam.kullaniciId, bugun: gunDegeri(isTakvimGunu(new Date())), aciklama: t("odemeTersAciklama") });
      projeId = ters.projeId;
      await izYaz({ action: "ORTAKLIK_ODEME_TERS", companyId: baglam.companyId, targetType: "OrtakCariHareketi", targetId: hareketId, detail: JSON.stringify({ ters: ters.id }) }, tx);
    });
  } catch (e) { return hataSonucu(e, "odemeTersle"); }
  tazele([`/ortaklik/${projeId}/hesap`, "/giderler", "/rapor"]);
  return { tamam: true };
}
