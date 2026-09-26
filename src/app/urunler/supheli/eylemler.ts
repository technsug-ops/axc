"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import {
  eanHucresi,
  sizinMiCoz,
  yuklemePlani,
  type Dunya,
  type PlanHatasiKodu,
  type YuklemePlani,
  type YuklenenSatir,
} from "@/lib/supheli-urun";
import { tabloOku } from "@/lib/tablo/tablo-oku";
import { izinVarMi } from "@/lib/yetki";

/**
 * ============================================================================
 *  ŞÜPHELİ LİSTESİ GERİ YÜKLEME (K284)
 * ----------------------------------------------------------------------------
 *  İKİ ADIM, TEK PLAN: `supheliOnizle` HİÇBİR ŞEY YAZMAZ; `supheliUygula`
 *  aynı dosyayı aynı gövdeyle okur, planı YENİDEN kurar ve yalnız geçerli
 *  satırları yazar (hatalı satır yazılmaz, sebebi önizlemede yazıyor).
 *  Eşleşme KİMLİĞE göre (Excel'in ilk sütunu). Okuma TEK KAPIDAN (`tabloOku`).
 *  Yazım satır satır ve ŞARTLI (okunan değer değişmediyse); her değişiklik
 *  eski/yeni değerle İZE. İzin `urun.yaz`.
 *  ⚠ "use server": YALNIZ async fonksiyon dışa aktarılır.
 * ============================================================================
 */

type DosyaHatasi = "DOSYA_YOK" | "OKUNAMADI" | "SAYFA_YOK" | "YETKISIZ" | "HATA";

export type OnizlemeSonucu =
  | {
      tamam: true;
      ean: number;
      pasif: number;
      pasifStoklu: number;
      bos: number;
      ayni: number;
      hataSayisi: number;
      hatalar: { satir: number; urun: string; kod: PlanHatasiKodu; deger?: string }[];
    }
  | { tamam: false; hata: DosyaHatasi };

export type UygulamaSonucu =
  | { tamam: true; ean: number; pasif: number; atlanan: number; hataSayisi: number }
  | { tamam: false; hata: DosyaHatasi };

const HATA_GOSTERIM_TAVANI = 100;

async function dosyadanSatirlar(formData: FormData): Promise<YuklenenSatir[] | DosyaHatasi> {
  const dosya = formData.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) return "DOSYA_YOK";
  let sayfalar: { sheet: string; data: unknown[][] }[];
  try {
    sayfalar = (await tabloOku(Buffer.from(await dosya.arrayBuffer()))).sayfalar;
  } catch (e) {
    console.error("[supheli] dosya okunamadı:", e);
    return "OKUNAMADI";
  }
  const t = await getTranslations("SupheliUrun");
  const baslik = (h: unknown) => String(h ?? "").trim();
  for (const s of sayfalar) {
    const bas = (s.data ?? []).findIndex((r) => r.some((h) => baslik(h) === t("sutunKimlik")));
    if (bas < 0) continue;
    const b = s.data[bas].map(baslik);
    const iKimlik = b.indexOf(t("sutunKimlik"));
    const iEan = b.indexOf(t("sutunDogruEan"));
    const iSizin = b.indexOf(t("sutunSizinMi"));
    if (iEan < 0 || iSizin < 0) continue;
    const cikti: YuklenenSatir[] = [];
    for (let i = bas + 1; i < s.data.length; i++) {
      const r = s.data[i] ?? [];
      const kimlik = baslik(r[iKimlik]);
      if (kimlik === "") continue;
      cikti.push({ satir: i + 1, kimlik, ean: eanHucresi(r[iEan]), sizinMi: sizinMiCoz(r[iSizin]) });
    }
    return cikti;
  }
  return "SAYFA_YOK";
}

async function planKur(satirlar: YuklenenSatir[]): Promise<YuklemePlani> {
  const kimlikler = [...new Set(satirlar.map((s) => s.kimlik))];
  const eanlar = [...new Set(satirlar.map((s) => s.ean).filter((e) => e !== ""))];
  const [varyantlar, sahipler] = await Promise.all([
    prisma.productVariant.findMany({ where: { id: { in: kimlikler } }, select: { id: true, barcode: true, isActive: true } }),
    eanlar.length
      ? prisma.productVariant.findMany({ where: { barcode: { in: eanlar } }, select: { id: true, barcode: true } })
      : Promise.resolve([]),
  ]);
  const dunya: Dunya = {
    varyantlar: new Map(varyantlar.map((v) => [v.id, { barkod: v.barcode, aktif: v.isActive }])),
    barkodSahibi: new Map(sahipler.filter((v) => v.barcode).map((v) => [v.barcode!, v.id])),
  };
  return yuklemePlani(satirlar, dunya);
}

export async function supheliOnizle(formData: FormData): Promise<OnizlemeSonucu> {
  try {
    /* İzin eylemin KENDİ gövdesinde (yetki bekçisi yardımcıya gizlenmiş kontrolü göremez). */
    if (!(await izinVarMi("urun.yaz"))) return { tamam: false, hata: "YETKISIZ" };
    const satirlar = await dosyadanSatirlar(formData);
    if (typeof satirlar === "string") return { tamam: false, hata: satirlar };
    const plan = await planKur(satirlar);
    const gosterilen = plan.hatalar.slice(0, HATA_GOSTERIM_TAVANI);
    const adlar = new Map(
      (
        await prisma.productVariant.findMany({
          where: { id: { in: gosterilen.map((h) => h.kimlik) } },
          select: { id: true, product: { select: { name: true } } },
        })
      ).map((v) => [v.id, v.product.name]),
    );
    const pasifStoklu = plan.pasif.length
      ? (
          await prisma.stockMovement.groupBy({
            by: ["variantId"],
            where: { variantId: { in: plan.pasif.map((p) => p.kimlik) } },
            _sum: { quantityDelta: true },
          })
        ).filter((r) => (r._sum.quantityDelta ?? 0) > 0).length
      : 0;
    return {
      tamam: true,
      ean: plan.ean.length,
      pasif: plan.pasif.length,
      pasifStoklu,
      bos: plan.bos,
      ayni: plan.degisiklikYok,
      hataSayisi: plan.hatalar.length,
      hatalar: gosterilen.map((h) => ({ satir: h.satir, urun: adlar.get(h.kimlik) ?? h.kimlik, kod: h.kod, deger: h.deger })),
    };
  } catch (e) {
    console.error("[supheliOnizle] beklenmeyen hata:", e);
    return { tamam: false, hata: "HATA" };
  }
}

export async function supheliUygula(formData: FormData): Promise<UygulamaSonucu> {
  try {
    /* İzin eylemin KENDİ gövdesinde (yetki bekçisi yardımcıya gizlenmiş kontrolü göremez). */
    if (!(await izinVarMi("urun.yaz"))) return { tamam: false, hata: "YETKISIZ" };
    const satirlar = await dosyadanSatirlar(formData);
    if (typeof satirlar === "string") return { tamam: false, hata: satirlar };
    const plan = await planKur(satirlar);
    let ean = 0;
    let pasif = 0;
    let atlanan = 0;

    for (const e of plan.ean) {
      try {
        const r = await prisma.productVariant.updateMany({
          where: { id: e.kimlik, barcode: e.eski },
          data: { barcode: e.yeni },
        });
        if (r.count !== 1) { atlanan++; continue; }
      } catch (hata) {
        /* Tekillik: arada başka bir ürüne aynı EAN yazılmışsa — ezmez, atlar. */
        console.error("[supheliUygula] EAN yazılamadı:", e.kimlik, hata);
        atlanan++;
        continue;
      }
      ean++;
      await izYaz({
        action: "SUPHELI_EAN_YAZILDI",
        targetType: "ProductVariant",
        targetId: e.kimlik,
        detail: JSON.stringify({ eski: e.eski, yeni: e.yeni }),
      });
    }

    const urunler = new Set<string>();
    for (const p of plan.pasif) {
      const r = await prisma.productVariant.updateMany({ where: { id: p.kimlik, isActive: true }, data: { isActive: false } });
      if (r.count !== 1) { atlanan++; continue; }
      pasif++;
      await izYaz({ action: "SUPHELI_PASIF", targetType: "ProductVariant", targetId: p.kimlik, detail: JSON.stringify({ eski: true, yeni: false }) });
      const v = await prisma.productVariant.findUnique({ where: { id: p.kimlik }, select: { productId: true } });
      if (v) urunler.add(v.productId);
    }
    /* Aktif varyantı KALMAYAN ürün de pasife — listelerde görünmesin. */
    for (const id of urunler) {
      const aktif = await prisma.productVariant.count({ where: { productId: id, isActive: true } });
      if (aktif > 0) continue;
      const r = await prisma.product.updateMany({ where: { id, isActive: true }, data: { isActive: false } });
      if (r.count === 1) {
        await izYaz({ action: "SUPHELI_URUN_PASIF", targetType: "Product", targetId: id, detail: JSON.stringify({ eski: true, yeni: false }) });
      }
    }

    for (const yol of ["/urunler/supheli", "/urunler", "/stok"]) revalidatePath(yol);
    return { tamam: true, ean, pasif, atlanan, hataSayisi: plan.hatalar.length };
  } catch (e) {
    console.error("[supheliUygula] beklenmeyen hata:", e);
    return { tamam: false, hata: "HATA" };
  }
}
