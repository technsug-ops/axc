"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { alimDurumunuHesapla, kalemTeslimAlinanlar } from "@/lib/stok";

export type MalKabulDurumu = {
  hatalar?: string[];
};

const satirSemasi = z.object({
  purchaseItemId: z.string().min(1),
  saglam: z
    .number({ message: "sağlam adet sayı olmalı" })
    .int("sağlam adet tam sayı olmalı")
    .min(0, "sağlam adet negatif olamaz"),
  hasarli: z
    .number({ message: "hasarlı adet sayı olmalı" })
    .int("hasarlı adet tam sayı olmalı")
    .min(0, "hasarlı adet negatif olamaz"),
  locationId: z.string(),
  hasarNotu: z.string().trim().max(2000),
});

const kabulSemasi = z.object({
  teslimTarihi: z.string().min(1, "Teslim tarihi zorunlu"),
  satirlar: z.array(satirSemasi).min(1, "Kalem bulunamadı"),
});

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
  const alimId = String(formData.get("alimId") ?? "");
  if (!alimId) return { hatalar: ["Alım kimliği bulunamadı."] };

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: ["Form verisi okunamadı."] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: ["Form verisi bozuk."] };
  }

  const sonuc = kabulSemasi.safeParse(json);
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const tarih = new Date(veri.teslimTarihi);
  if (Number.isNaN(tarih.getTime())) {
    return { hatalar: ["Teslim tarihi geçerli değil."] };
  }

  const alim = await prisma.purchase.findUnique({
    where: { id: alimId },
    include: { items: true },
  });
  if (!alim) return { hatalar: ["Alım bulunamadı."] };

  if (alim.status === "CANCELLED") {
    return { hatalar: ["İptal edilmiş alım için mal kabul yapılamaz."] };
  }
  if (alim.status === "RECEIVED") {
    return { hatalar: ["Bu alımın tüm kalemleri zaten tamamlanmış."] };
  }

  // Girilen satırlar gerçekten bu alıma mı ait?
  const kalemHaritasi = new Map(alim.items.map((k) => [k.id, k]));
  for (const satir of veri.satirlar) {
    if (!kalemHaritasi.has(satir.purchaseItemId)) {
      return { hatalar: ["Kalemlerden biri bu alıma ait değil."] };
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
        `Bir kalemde beklenenden fazla giriş var: kalan ${kalan}, girilen ${girilen}.`,
      );
    }
  }

  if (toplamIslem === 0) {
    hatalar.push("En az bir kalem için adet girmelisiniz.");
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
      return { hatalar: ["Seçilen raflardan biri artık mevcut değil."] };
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
    return { hatalar: ["Mal kabul kaydedilemedi, beklenmeyen bir hata oluştu."] };
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
    `/alimlar/${alimId}?saglam=${toplamSaglam}&hasarli=${toplamHasarli}`,
  );
}
