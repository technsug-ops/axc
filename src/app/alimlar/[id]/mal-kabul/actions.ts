"use server";

import { yetkiIste } from "@/lib/yetki";
import { basariAdresi } from "@/lib/bildirim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { alimDurumunuHesapla, kalemTeslimAlinanlar } from "@/lib/stok";

export type MalKabulDurumu = {
  hatalar?: string[];
};

/** Sözlükten çözülen çeviri işlevi. */
type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/**
 * Şema, mesajlar çözüldükten SONRA kurulur.
 * Modül seviyesinde kurulamaz: getTranslations() istek kapsamlıdır.
 */
function kabulSemasiKur(t: Ceviri) {
  const satirSemasi = z.object({
    purchaseItemId: z.string().min(1),
    saglam: z
      .number({ message: t("saglamSayiOlmali") })
      .int(t("saglamTamSayi"))
      .min(0, t("saglamNegatifOlamaz")),
    hasarli: z
      .number({ message: t("hasarliSayiOlmali") })
      .int(t("hasarliTamSayi"))
      .min(0, t("hasarliNegatifOlamaz")),
    locationId: z.string(),
    hasarNotu: z.string().trim().max(2000),
  });

  return z.object({
    teslimTarihi: z.string().min(1, t("teslimTarihiZorunlu")),
    satirlar: z.array(satirSemasi).min(1, t("kalemBulunamadi")),
  });
}

/**
 * MAL KABUL
 * ---------------------------------------------------------------------------
 * - SAĞLAM adet  -> PURCHASE_IN stok hareketi (ledger'a girer) + raf bilgisi
 * - HASARLI adet -> stoğa GİRMEZ, kalemdeki sayaca eklenir
 * - Aynı alım için birden fazla kez çalıştırılabilir (parçalı teslim)
 * - Hiçbir hareket silinmez/değiştirilmez; yalnızca yeni kayıt eklenir
 */
export async function malKabulEt(
  _oncekiDurum: MalKabulDurumu,
  formData: FormData,
): Promise<MalKabulDurumu> {
  await yetkiIste("malkabul.yaz");

  const t = await getTranslations("MalKabul");

  const alimId = String(formData.get("alimId") ?? "");
  if (!alimId) return { hatalar: [t("alimKimligiBulunamadi")] };

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = kabulSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const tarih = new Date(veri.teslimTarihi);
  if (Number.isNaN(tarih.getTime())) {
    return { hatalar: [t("teslimTarihiGecersiz")] };
  }

  const alim = await prisma.purchase.findUnique({
    where: { id: alimId },
    include: { items: true },
  });
  if (!alim) return { hatalar: [t("alimBulunamadi")] };

  if (alim.status === "CANCELLED") {
    return { hatalar: [t("iptalEdilmisAlim")] };
  }
  if (alim.status === "RECEIVED") {
    return { hatalar: [t("zatenTamamlanmis")] };
  }

  // Girilen satırlar gerçekten bu alıma mı ait?
  const kalemHaritasi = new Map(alim.items.map((k) => [k.id, k]));
  for (const satir of veri.satirlar) {
    if (!kalemHaritasi.has(satir.purchaseItemId)) {
      return { hatalar: [t("kalemBuAlimaAitDegil")] };
    }
  }

  // Şu ana kadar teslim alınan sağlam adetler (ledger'dan).
  const teslimAlinanlar = await kalemTeslimAlinanlar(
    alim.items.map((k) => k.id),
  );

  // Fazla kabul engeli: beklenenden çok mal girilemez.
  const hatalar: string[] = [];
  let toplamIslem = 0;

  for (const satir of veri.satirlar) {
    const kalem = kalemHaritasi.get(satir.purchaseItemId)!;
    const oncekiSaglam = teslimAlinanlar.get(kalem.id) ?? 0;
    const kalan = kalem.quantity - oncekiSaglam - kalem.damagedQuantity;
    const girilen = satir.saglam + satir.hasarli;

    toplamIslem += girilen;

    if (girilen > kalan) {
      hatalar.push(
        t("fazlaGiris", { kalan, girilen }),
      );
    }
  }

  if (toplamIslem === 0) {
    hatalar.push(t("enAzBirAdet"));
  }
  if (hatalar.length) return { hatalar };

  // Raf seçimleri geçerli mi?
  const rafIdleri = [
    ...new Set(veri.satirlar.map((s) => s.locationId).filter(Boolean)),
  ];
  if (rafIdleri.length) {
    const bulunan = await prisma.location.count({
      where: { id: { in: rafIdleri } },
    });
    if (bulunan !== rafIdleri.length) {
      return { hatalar: [t("rafMevcutDegil")] };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const satir of veri.satirlar) {
        const kalem = kalemHaritasi.get(satir.purchaseItemId)!;
        const raf = satir.locationId || null;

        // 1) SAĞLAM -> ledger'a giriş
        if (satir.saglam > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: kalem.variantId,
              type: "PURCHASE_IN",
              quantityDelta: satir.saglam,
              occurredAt: tarih,
              purchaseItemId: kalem.id,
              locationId: raf,
              // Giriş anındaki maliyet ileride stok değerlemesinde kullanılacak.
              unitCostAmount: kalem.unitCostAmount,
              unitCostCurrency: kalem.unitCostCurrency,
              note: `Mal kabul — ${alim.code}`,
            },
          });

          // Varyantın güncel rafı, en son yerleştirilen raf olsun.
          if (raf) {
            await tx.productVariant.update({
              where: { id: kalem.variantId },
              data: { locationId: raf },
            });
          }
        }

        // 2) HASARLI -> stoğa girmez, kalemdeki sayaç artar
        if (satir.hasarli > 0 || satir.hasarNotu) {
          const yeniNot = [kalem.damageNote, satir.hasarNotu]
            .filter(Boolean)
            .join("\n");

          await tx.purchaseItem.update({
            where: { id: kalem.id },
            data: {
              damagedQuantity: { increment: satir.hasarli },
              damageNote: yeniNot || null,
            },
          });
        }
      }
    });
  } catch (e) {
    console.error("[mal kabul] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  // Durumu yeniden hesapla (işlem sonrası güncel ledger ile).
  const guncelKalemler = await prisma.purchaseItem.findMany({
    where: { purchaseId: alimId },
    select: { id: true, quantity: true, damagedQuantity: true },
  });
  const guncelTeslimler = await kalemTeslimAlinanlar(
    guncelKalemler.map((k) => k.id),
  );

  const yeniDurum = alimDurumunuHesapla(
    guncelKalemler.map((k) => ({
      beklenen: k.quantity,
      saglam: guncelTeslimler.get(k.id) ?? 0,
      hasarli: k.damagedQuantity,
    })),
  );

  await prisma.purchase.update({
    where: { id: alimId },
    data: {
      status: yeniDurum,
      receivedAt: yeniDurum === "RECEIVED" ? tarih : null,
    },
  });

  revalidatePath("/alimlar");
  revalidatePath(`/alimlar/${alimId}`);
  revalidatePath("/stok");
  revalidatePath("/urunler");

  // Sonucu detay sayfasında görünür şekilde bildir (#5) — sessiz başarı yasak.
  const toplamSaglam = veri.satirlar.reduce((t, s) => t + s.saglam, 0);
  const toplamHasarli = veri.satirlar.reduce((t, s) => t + s.hasarli, 0);
  redirect(
    basariAdresi(`/alimlar/${alimId}?saglam=${toplamSaglam}&hasarli=${toplamHasarli}`, "malKabul"),
  );
}
