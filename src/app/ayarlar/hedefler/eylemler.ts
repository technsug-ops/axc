"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { izinVarMi, yetkiIste } from "@/lib/yetki";
import { izYaz } from "@/lib/iz";
import { gecerliHedef, HEDEF_DONEMLERI, HEDEF_OLCUTLERI, hedefPenceresi, hedefTutariOku, type HedefDonemi, type HedefOlcutu } from "@/lib/hedef/hedef-karar";
import { hedefSatirlari } from "@/lib/hedef/hedef-veri";

export type HedefSonucu = { tamam: boolean; mesaj?: string; hata?: string };

/**
 * K349 — hedefleri kaydeder. Yalnız DEĞİŞEN hedef yeni sürüm satırı açar; satır
 * silinmez/değiştirilmez. Yeni değer İÇİNDE BULUNULAN dönemin başından geçerlidir
 * (geçmiş dönemler eski hedefle değerlendirilir). Boş alan = hedef kaldırıldı.
 * Kâr (NET-2) alanları yalnız kârı görme izni olanda okunur — izinsiz kullanıcı
 * formu elle kursa bile kâr hedefine dokunamaz.
 */
export async function hedefleriKaydet(_onceki: HedefSonucu, veri: FormData): Promise<HedefSonucu> {
  const baglam = await yetkiIste("hedef.yonet");
  const t = await getTranslations("Hedef");
  const karGorunur = await izinVarMi("satis.kar.gor");
  const an = new Date();
  const olcutler = HEDEF_OLCUTLERI.filter((o) => o !== "NET2" || karGorunur);
  const mevcut = await hedefSatirlari();
  const degisenler: { olcut: HedefOlcutu; donem: HedefDonemi; once: number | null; sonra: number | null; gecerlilik: Date }[] = [];
  for (const donem of HEDEF_DONEMLERI) {
    const gecerlilik = hedefPenceresi(donem, an).ilkGun;
    for (const olcut of olcutler) {
      const alan = `${olcut}_${donem}`;
      if (!veri.has(alan)) continue;
      const okunan = hedefTutariOku(String(veri.get(alan) ?? ""), olcut);
      if (!okunan.tamam) return { tamam: false, hata: t("tutarGecersiz", { olcut, donem }) };
      const once = gecerliHedef(mevcut, olcut, donem, gecerlilik)?.tutar ?? null;
      if (once === okunan.tutar) continue;
      degisenler.push({ olcut, donem, once, sonra: okunan.tutar, gecerlilik });
    }
  }
  if (!degisenler.length) return { tamam: true, mesaj: t("degisiklikYok") };
  try {
    await prisma.$transaction(async (tx) => {
      for (const d of degisenler) {
        const satir = await tx.hedef.create({ data: { olcut: d.olcut, donem: d.donem, tutar: d.sonra, gecerlilik: d.gecerlilik, userId: baglam.kullaniciId } });
        await izYaz({ action: "HEDEF_DEGISTI", companyId: baglam.companyId, targetType: "Hedef", targetId: satir.id, detail: JSON.stringify({ olcut: d.olcut, donem: d.donem, once: d.once, sonra: d.sonra, gecerlilik: d.gecerlilik.toISOString().slice(0, 10) }) }, tx);
      }
    });
  } catch (hata) {
    console.error("[hedef] kaydedilemedi:", hata);
    return { tamam: false, hata: t("kaydedilemedi") };
  }
  revalidatePath("/ayarlar/hedefler");
  revalidatePath("/");
  return { tamam: true, mesaj: t("kaydedildi", { sayi: degisenler.length }) };
}
