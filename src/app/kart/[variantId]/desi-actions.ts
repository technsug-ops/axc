"use server";

import { revalidatePath } from "next/cache";

import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  K197-⑤ — KANAL DESİSİYLE GÜNCELLE (ürün kartından, tek ürün)
 * ----------------------------------------------------------------------------
 *  Kullanıcı sordu (10.09.2026): "API'den desileri çekemiyoruz." Veri
 *  aslında K197'den beri toplanıyordu (`Sale.kanalKargoDesi`) — hiçbir
 *  ekran göstermiyordu. Bu eylem, kartta gösterilen kanal ortalamasını
 *  ürünün kendi desisine YAZAR — kullanıcı onayladığında, tek tıkla.
 *
 *  ⚠ SUNUCU EKRANA GÜVENMEZ (K169'un aynı kuralı): istemciden yalnız
 *  `productId` gelir; ORTALAMA sunucu tarafından YENİDEN hesaplanır
 *  (`kartVerisiniTopla` aynı ölçütle). İstemcinin gösterdiği rakamla
 *  sunucunun yazdığı rakam arasında ekranda geçen sürede fark oluşmuşsa
 *  (yeni bir satış girdi), YENİ hesap yazılır — bayat rakam donmaz.
 *
 *  ⚠ AYRI DOSYA — `actions.ts` DEĞİL. `actions.ts` TY/N11 kanal
 *  API'lerine ulaşıyor ve `api:dogrula` bu dosyanın prisma'ya DOĞRUDAN
 *  yazmadığını beyan olarak taşıyor (kanal-yazan kod ile veritabanı
 *  yazımı ayrı tutulur — biri bozulursa öteki karışmasın). Bu eylem hiçbir
 *  kanal API'sine dokunmuyor; oraya konsaydı o beyanı sessizce çiğnerdi.
 * ============================================================================
 */
export type KanalDesiGuncelleSonucu =
  | { tamam: true; yeniDesi: number; ornekSayisi: number }
  | { tamam: false; hata: "ORNEK_YOK" | "URUN_YOK" };

export async function kanalDesiyleGuncelle(
  variantId: string,
): Promise<KanalDesiGuncelleSonucu> {
  await yetkiIste("urun.yaz");

  const { kartVerisiniTopla } = await import("@/lib/urun-karti-verisi");
  const veri = await kartVerisiniTopla(variantId);
  if (veri === null || veri.kanalDesi === null) {
    return { tamam: false, hata: "ORNEK_YOK" };
  }

  /** ⚠ KURUŞA DEĞİL AMA MAKUL HASSASİYETE YUVARLANIR — desi 9,3 ondalık
   *  taşıyor; ortalamanın ham hassasiyeti kayıt anlamı taşımaz. */
  const yeniDesi = Math.round(veri.kanalDesi.ortalama * 100) / 100;

  const onceki = await prisma.product.findUnique({
    where: { id: veri.urunId },
    select: { desi: true },
  });
  if (onceki === null) return { tamam: false, hata: "URUN_YOK" };

  await prisma.product.update({
    where: { id: veri.urunId },
    data: { desi: yeniDesi },
  });

  await izYaz({
    action: "URUN_DESI_KANALDAN_GUNCELLENDI",
    targetType: "Product",
    targetId: veri.urunId,
    detail: JSON.stringify({
      onceki: onceki.desi?.toString() ?? null,
      yeni: yeniDesi,
      ornekSayisi: veri.kanalDesi.ornekSayisi,
      kaynakVaryant: variantId,
    }),
  });

  revalidatePath("/kart/" + variantId);
  revalidatePath("/urunler/" + veri.urunId);

  return { tamam: true, yeniDesi, ornekSayisi: veri.kanalDesi.ornekSayisi };
}
