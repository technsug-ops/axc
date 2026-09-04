"use server";

import { revalidatePath } from "next/cache";

import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import { varyantStogu } from "@/lib/stok";
import { yetkiIste } from "@/lib/yetki";

import { kimlikOku } from "../../../../scripts/ty/istemci";
import {
  gonderimSonucu,
  stokFiyatGonder,
} from "../../../../scripts/ty/yazici";

/**
 * ============================================================================
 *  K169 — TRENDYOL'A STOK/FİYAT GÖNDERİMİ (ürün kartından, tek varyant)
 * ----------------------------------------------------------------------------
 *  Halil kararı 05.09.2026. İlk kanala-yazma akışı; üç kural:
 *  ① RAKAM GÖRÜLMEDEN GÖNDERİLMEZ — önizleme eylemi ayrı ve salt okuma;
 *    diyalog rakamları basar, onay o rakamların üstüne verilir (K164-③
 *    maliyet kuralının kanal tarafı).
 *  ② SUNUCU EKRANA GÜVENMEZ — gönderim, önizlemenin verisini İSTEMCİDEN
 *    almaz; barkodu ve stoğu kendisi YENİDEN çözer. İstemciden yalnız
 *    NİYET gelir (stok gönderilsin mi · fiyat kaç).
 *  ③ İZSİZ GÖNDERİM YOK — ne gönderildiği, TY'nin batch cevabı ve sonucu
 *    `KANAL_GONDERIMI` iziyle deftere yazılır (kim gönderdi dahil).
 *
 *  ⚠ Hata KODLA döner (K57-③); TY'nin "15 dk aynı istek" reddi de ayrı
 *  kodla taşınır — kullanıcı "bozuk" sanmasın.
 * ============================================================================
 */

export type TyGonderimOnizlemesi =
  | {
      tamam: true;
      barkod: string;
      selioraStok: number;
      kanalAdet: number | null;
      listelemeDurumu: string;
    }
  | {
      tamam: false;
      kod: "KANAL_SKU_YOK" | "HESAP_YOK" | "VARYANT_YOK";
    };

type TyBaglam =
  | { tamam: false; kod: "HESAP_YOK" | "VARYANT_YOK" | "KANAL_SKU_YOK" }
  | {
      tamam: true;
      kanalSku: {
        channelSku: string;
        kanalAdet: number | null;
        listelemeDurumu: string;
      };
    };

async function tyBaglami(variantId: string): Promise<TyBaglam> {
  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { name: "Trendyol" }, satisIcin: true, isActive: true },
    select: { id: true },
  });
  if (!hesap) return { tamam: false, kod: "HESAP_YOK" };
  const varyant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true },
  });
  if (!varyant) return { tamam: false, kod: "VARYANT_YOK" };
  const kanalSku = await prisma.channelSku.findFirst({
    where: { variantId, channelAccountId: hesap.id, isActive: true },
    select: { channelSku: true, kanalAdet: true, listelemeDurumu: true },
  });
  if (!kanalSku) return { tamam: false, kod: "KANAL_SKU_YOK" };
  return { tamam: true, kanalSku };
}

export async function tyGonderimOnizle(
  variantId: string,
): Promise<TyGonderimOnizlemesi> {
  await yetkiIste("kanal.yaz");
  const b = await tyBaglami(variantId);
  if (!b.tamam) return { tamam: false, kod: b.kod };
  return {
    tamam: true,
    barkod: b.kanalSku.channelSku,
    selioraStok: await varyantStogu(variantId),
    kanalAdet: b.kanalSku.kanalAdet,
    listelemeDurumu: b.kanalSku.listelemeDurumu,
  };
}

export type TyGonderimSonucu =
  | {
      tamam: true;
      barkod: string;
      gonderilenStok: number | null;
      gonderilenFiyat: number | null;
      batchRequestId: string;
      /** TY kuyruğu asenkron — sorgu anındaki durum; "İŞLEMDE" olabilir. */
      batchDurumu: string;
    }
  | {
      tamam: false;
      kod:
        | "KANAL_SKU_YOK"
        | "HESAP_YOK"
        | "VARYANT_YOK"
        | "GONDERILECEK_YOK"
        | "FIYAT_GECERSIZ"
        | "ANAHTAR_YOK"
        | "TEKRAR_15DK"
        | "KANAL_REDDETTI"
        | "ULASILAMADI";
      ayrinti?: string;
    };

export async function tyStokFiyatGonder(
  variantId: string,
  niyet: { stokGonder: boolean; fiyat: number | null },
): Promise<TyGonderimSonucu> {
  await yetkiIste("kanal.yaz");
  const b = await tyBaglami(variantId);
  if (!b.tamam) return { tamam: false, kod: b.kod };
  if (!niyet.stokGonder && niyet.fiyat === null) {
    return { tamam: false, kod: "GONDERILECEK_YOK" };
  }
  if (niyet.fiyat !== null && !(Number.isFinite(niyet.fiyat) && niyet.fiyat > 0)) {
    return { tamam: false, kod: "FIYAT_GECERSIZ" };
  }
  const k = kimlikOku();
  if (!k) return { tamam: false, kod: "ANAHTAR_YOK" };

  /** Stok SUNUCUDA yeniden çözülür — istemciden sayı alınmaz. */
  const stok = niyet.stokGonder ? await varyantStogu(variantId) : null;
  const kalem = {
    barcode: b.kanalSku.channelSku,
    ...(stok === null ? {} : { quantity: stok }),
    ...(niyet.fiyat === null
      ? {}
      : { salePrice: niyet.fiyat, listPrice: niyet.fiyat }),
  };

  const sonuc = await stokFiyatGonder(k, kalem);
  if (sonuc.tur === "YETKISIZ") {
    return { tamam: false, kod: "KANAL_REDDETTI", ayrinti: "HTTP " + sonuc.durum };
  }
  if (sonuc.tur === "ULASILAMADI") {
    return { tamam: false, kod: "ULASILAMADI", ayrinti: sonuc.sebep };
  }
  if (sonuc.tur === "ISTEK_HATALI") {
    const tekrarMi = /15 minutes|15 dakika|same request/i.test(sonuc.mesaj);
    /** ⚠ RED DE İZ BIRAKIR — "gönderdim sanıyordum" sorusuna cevap kalsın. */
    await izYaz({
      action: "KANAL_GONDERIMI",
      targetType: "ProductVariant",
      targetId: variantId,
      detail: JSON.stringify({
        kanal: "Trendyol",
        barkod: kalem.barcode,
        istek: kalem,
        sonuc: "RED",
        durum: sonuc.durum,
        mesaj: sonuc.mesaj,
      }),
    });
    return {
      tamam: false,
      kod: tekrarMi ? "TEKRAR_15DK" : "KANAL_REDDETTI",
      ayrinti: sonuc.mesaj.slice(0, 160),
    };
  }

  /** Kabul edildi — kuyruk sonucu kısa beklemeyle sorgulanır. */
  await new Promise((coz) => setTimeout(coz, 2000));
  const batch = await gonderimSonucu(k, sonuc.batchRequestId);
  let batchDurumu = "SORGULANAMADI";
  if (batch.tur === "VERI") {
    const g = batch.govde as { status?: unknown; items?: unknown[] };
    batchDurumu = typeof g.status === "string" ? g.status : "ISLEMDE";
  }

  await izYaz({
    action: "KANAL_GONDERIMI",
    targetType: "ProductVariant",
    targetId: variantId,
    detail: JSON.stringify({
      kanal: "Trendyol",
      barkod: kalem.barcode,
      istek: kalem,
      sonuc: "KABUL",
      batchRequestId: sonuc.batchRequestId,
      batchDurumu,
    }),
  });
  revalidatePath("/kart/" + variantId);
  return {
    tamam: true,
    barkod: kalem.barcode,
    gonderilenStok: stok,
    gonderilenFiyat: niyet.fiyat,
    batchRequestId: sonuc.batchRequestId,
    batchDurumu,
  };
}
