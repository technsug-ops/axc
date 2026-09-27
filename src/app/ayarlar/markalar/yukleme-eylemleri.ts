"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { izYaz } from "@/lib/iz";
import { markaYuklemePlani, type MarkaPlanHatasi, type MarkaYuklemePlani, type MarkaYuklemeSatiri } from "@/lib/marka-yukleme";
import { prisma } from "@/lib/prisma";
import { tabloOku } from "@/lib/tablo/tablo-oku";
import { izinVarMi } from "@/lib/yetki";

/**
 * ============================================================================
 *  MARKASI BOŞ ÜRÜN LİSTESİ — GERİ YÜKLEME (K288)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 27.09.2026: «indirebiliyoruz ama düzeltip yükleyemiyoruz».
 *  İKİ ADIM, TEK PLAN: `markaListesiOnizle` HİÇBİR ŞEY YAZMAZ; `markaListesiUygula`
 *  aynı dosyayı aynı gövdeyle okur, planı YENİDEN kurar, yalnız geçerli satırları
 *  yazar. Okuma TEK KAPIDAN (`tabloOku`); başlıklar sözlükten (indirilen listeyle
 *  AYNI anahtarlar). Yazım satır satır ŞARTLI (marka hâlâ boşsa), eski/yeni İZE.
 *  İzin `urun.yaz` — eylemin KENDİ gövdesinde.
 *  ⚠ "use server": YALNIZ async fonksiyon dışa aktarılır.
 * ============================================================================
 */

type DosyaHatasi = "DOSYA_YOK" | "OKUNAMADI" | "SAYFA_YOK" | "YETKISIZ" | "HATA";

export type MarkaOnizleme =
  | {
      tamam: true;
      yaz: number;
      bagli: number;
      bos: number;
      ayni: number;
      hataSayisi: number;
      hatalar: { satir: number; urun: string; kod: MarkaPlanHatasi; deger?: string }[];
    }
  | { tamam: false; hata: DosyaHatasi };

export type MarkaUygulama =
  | { tamam: true; yazilan: number; bagli: number; atlanan: number }
  | { tamam: false; hata: DosyaHatasi };

const HATA_GOSTERIM_TAVANI = 100;

async function dosyadanSatirlar(formData: FormData): Promise<MarkaYuklemeSatiri[] | DosyaHatasi> {
  const dosya = formData.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) return "DOSYA_YOK";
  let sayfalar: { sheet: string; data: unknown[][] }[];
  try {
    sayfalar = (await tabloOku(Buffer.from(await dosya.arrayBuffer()))).sayfalar;
  } catch (e) {
    console.error("[markaListesi] dosya okunamadı:", e);
    return "OKUNAMADI";
  }
  const t = await getTranslations("MarkaKodu");
  const metin = (h: unknown) => String(h ?? "").trim();
  for (const s of sayfalar) {
    const bas = (s.data ?? []).findIndex((r) => r.some((h) => metin(h) === t("sutunKimlik")));
    if (bas < 0) continue;
    const b = s.data[bas].map(metin);
    const iKimlik = b.indexOf(t("sutunKimlik"));
    const iMarka = b.indexOf(t("sutunMarka"));
    if (iMarka < 0) continue;
    const cikti: MarkaYuklemeSatiri[] = [];
    for (let i = bas + 1; i < s.data.length; i++) {
      const r = s.data[i] ?? [];
      const kimlik = metin(r[iKimlik]);
      if (kimlik === "") continue;
      cikti.push({ satir: i + 1, kimlik, marka: metin(r[iMarka]) });
    }
    return cikti;
  }
  return "SAYFA_YOK";
}

async function planKur(satirlar: MarkaYuklemeSatiri[]): Promise<MarkaYuklemePlani> {
  const [urunler, markalar] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: [...new Set(satirlar.map((s) => s.kimlik))] } },
      select: { id: true, brand: true, brandId: true },
    }),
    prisma.brand.findMany({ select: { id: true, name: true, anahtar: true } }),
  ]);
  return markaYuklemePlani(satirlar, {
    urunler: new Map(urunler.map((u) => [u.id, { brand: u.brand, brandId: u.brandId }])),
    tablo: new Map(markalar.map((m) => [m.anahtar, { id: m.id, name: m.name }])),
  });
}

export async function markaListesiOnizle(formData: FormData): Promise<MarkaOnizleme> {
  try {
    if (!(await izinVarMi("urun.yaz"))) return { tamam: false, hata: "YETKISIZ" };
    const satirlar = await dosyadanSatirlar(formData);
    if (typeof satirlar === "string") return { tamam: false, hata: satirlar };
    const plan = await planKur(satirlar);
    const gosterilen = plan.hatalar.slice(0, HATA_GOSTERIM_TAVANI);
    const adlar = new Map(
      (await prisma.product.findMany({ where: { id: { in: gosterilen.map((h) => h.kimlik) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]),
    );
    return {
      tamam: true,
      yaz: plan.yaz.length,
      bagli: plan.yaz.filter((y) => y.brandId !== null).length,
      bos: plan.bos,
      ayni: plan.degisiklikYok,
      hataSayisi: plan.hatalar.length,
      hatalar: gosterilen.map((h) => ({ satir: h.satir, urun: adlar.get(h.kimlik) ?? h.kimlik, kod: h.kod, deger: h.deger })),
    };
  } catch (e) {
    console.error("[markaListesiOnizle] beklenmeyen hata:", e);
    return { tamam: false, hata: "HATA" };
  }
}

export async function markaListesiUygula(formData: FormData): Promise<MarkaUygulama> {
  try {
    if (!(await izinVarMi("urun.yaz"))) return { tamam: false, hata: "YETKISIZ" };
    const satirlar = await dosyadanSatirlar(formData);
    if (typeof satirlar === "string") return { tamam: false, hata: satirlar };
    const plan = await planKur(satirlar);
    let yazilan = 0;
    let bagli = 0;
    let atlanan = 0;
    for (const y of plan.yaz) {
      const r = await prisma.product.updateMany({
        where: { id: y.kimlik, brandId: null, OR: [{ brand: null }, { brand: "" }] },
        data: { brand: y.yazim, brandId: y.brandId },
      });
      if (r.count !== 1) { atlanan++; continue; }
      yazilan++;
      if (y.brandId) bagli++;
      await izYaz({
        action: "MARKA_LISTE_YUKLENDI",
        targetType: "Product",
        targetId: y.kimlik,
        detail: JSON.stringify({ satir: y.satir, eski: null, yeni: y.yazim, brandId: y.brandId }),
      });
    }
    for (const yol of ["/ayarlar/markalar", "/urunler"]) revalidatePath(yol);
    return { tamam: true, yazilan, bagli, atlanan };
  } catch (e) {
    console.error("[markaListesiUygula] beklenmeyen hata:", e);
    return { tamam: false, hata: "HATA" };
  }
}
