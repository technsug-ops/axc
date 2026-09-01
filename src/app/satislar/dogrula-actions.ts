"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { kalemMaliyeti } from "@/lib/kalem-maliyeti";
import { oturumdakiKullanici } from "@/lib/oturum";
import { prisma } from "@/lib/prisma";
import { izYaz } from "@/lib/iz";
import {
  DOGRULAMA_EYLEMI,
  damgaKur,
  notZorunluMu,
  sebepGecerliMi,
  type DogrulamaKaydi,
} from "@/lib/uyari/veri-dogrulama";
import { supheliMi } from "@/lib/uyari/veri-supheli";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  VERİ DOĞRULAMA — "BAKTIM, GERÇEK"
 * ----------------------------------------------------------------------------
 *  K6, mimar onayı 19.08.2026.
 *
 *  ── DAMGA SUNUCUDA KURULUR ──────────────────────────────────────────────
 *  ⚠ İSTEMCİDEN GELEN DEĞER DAMGALANMAZ. Damga, kaydın gerçek hâlidir;
 *  istemciden gelseydi biri elle başka bir damga göndererek kaydı KALICI
 *  olarak susturabilirdi (damga hiç tutmayacağı için değil — tam tersine,
 *  bugünkü değerlere uyduracağı için). Değerler burada, ledger'dan
 *  yeniden çözülüyor.
 *
 *  ── ŞÜPHELİ OLMAYAN KAYIT DOĞRULANMAZ ───────────────────────────────────
 *  Uyarı vermeyen bir kaydı "doğrulamak" anlamsızdır ve ileride şüpheli
 *  hâle gelirse peşin susturma olurdu. Sunucu bunu reddediyor.
 *
 *  ── YETKİ: `satis.duzenle` ──────────────────────────────────────────────
 *  Görme izni (`satis.kar.gor`) yetmez: doğrulama sistemin bir İDDİASINI
 *  değiştiriyor. Ayrı bir izin (`satis.veri.dogrula`) SaaS/RBAC kalemine
 *  not düşüldü; bugün açılmıyor (iki bacaklı yetki işi doğururdu).
 * ============================================================================
 */

export type DogrulamaSonucu = { hata?: string; ok?: true };

export async function veriDogrula(
  saleItemId: string,
  sebepHam: string,
  not: string,
): Promise<DogrulamaSonucu> {
  await yetkiIste("satis.duzenle");
  const t = await getTranslations("Satis");

  if (!sebepGecerliMi(sebepHam)) return { hata: t("dogrulaSebepGecersiz") };
  const sebep = sebepHam;
  const temizNot = not.trim();
  if (notZorunluMu(sebep) && temizNot === "") {
    return { hata: t("dogrulaNotZorunlu") };
  }

  const kalem = await prisma.saleItem.findUnique({
    where: { id: saleItemId },
    select: {
      id: true,
      saleId: true,
      quantity: true,
      unitPriceAmount: true,
      net2Amount: true,
      sale: { select: { iptalTarihi: true } },
      stockMovements: {
        select: {
          quantityDelta: true,
          unitCostAmount: true,
          unitCostCurrency: true,
        },
      },
    },
  });
  if (!kalem || kalem.sale.iptalTarihi !== null) {
    return { hata: t("dogrulaKalemYok") };
  }

  const maliyet = kalemMaliyeti(
    kalem.stockMovements.map((h) => ({
      quantityDelta: h.quantityDelta,
      birimMaliyet:
        h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
      birimMaliyetParaBirimi: h.unitCostCurrency,
    })),
  ).maliyet;
  const net2 =
    kalem.net2Amount === null ? null : Number(kalem.net2Amount.toString());
  const ciro = Number(kalem.unitPriceAmount.toString()) * kalem.quantity;

  /** ⚠ ŞÜPHELİ OLMAYAN KAYIT PEŞİN SUSTURULMAZ. */
  if (!supheliMi({ net2, maliyet, ciro })) {
    return { hata: t("dogrulaSupheliDegil") };
  }

  const kullanici = await oturumdakiKullanici();
  const kayit: DogrulamaKaydi = {
    damga: damgaKur({ net2: net2!, maliyet: maliyet!, ciro }),
    sebep,
    not: temizNot === "" ? null : temizNot,
  };

  /**
   * ⚠ ESKİ İZ SİLİNMEZ. Aynı kalem ikinci kez doğrulanırsa yeni bir satır
   * yazılır ve okuma EN YENİSİNİ alır (`createdAt desc`). Ledger ilkesi:
   * kayıt silinmez, üstüne yazılır. "Kim ne zaman neyi doğruladı" geçmişi
   * kalır — bir istisnanın kaç kez geri geldiği kendi başına bilgidir.
   */
  /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
  await izYaz({
    userId: kullanici?.id ?? null,
    action: DOGRULAMA_EYLEMI,
    targetType: "SaleItem",
    targetId: kalem.id,
    detail: JSON.stringify(kayit),
  });

  revalidatePath("/satislar");
  return { ok: true };
}
