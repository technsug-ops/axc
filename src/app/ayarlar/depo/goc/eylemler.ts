"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  eskiRaflar,
  gocPlani,
  sayimTutuyorMu,
  yeniRaflar,
  type Esleme,
  type GocPlani,
} from "@/lib/depo/goc";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  RAF GÖÇÜ — SUNUCU EYLEMLERİ (K50 ⑦)
 * ----------------------------------------------------------------------------
 *  ⚠ İKİ ADIM, TEK YAZMA. Önce plan (hiçbir şey yazmaz), sonra onay.
 *
 *  ⚠ TAŞIMA TEK İŞLEMDE (`$transaction`). Yarıda kalırsa bazı ürünler yeni
 *  rafta, bazıları eskide olur ve hangisinin nerede olduğu ancak elle
 *  sayılarak bulunur. Ya hepsi taşınır ya hiçbiri.
 *
 *  ⚠ ÖNCE/SONRA SAYIM YAPILIR VE TUTMAZSA GERİ ALINIR. Bağ kaybı
 *  varsayılmaz, ÖLÇÜLÜR — düşen bir bağ ürünü "rafsız" bırakır ve depoda
 *  aranıp bulunamaz.
 * ============================================================================
 */

export type GocSonucu =
  | { durum: "HATA"; engel: string }
  | { durum: "ONIZLEME"; plan: GocPlani }
  | {
      durum: "TASINDI";
      tasinanRaf: number;
      tasinanVaryant: number;
      pasifEdilen: number;
    };

async function raflariOku() {
  const konumlar = await prisma.location.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      _count: { select: { variants: { where: { isActive: true } } } },
    },
    orderBy: { code: "asc" },
  });
  const hepsi = konumlar.map((k) => ({
    id: k.id,
    kod: k.code,
    ad: k.name,
    varyant: k._count.variants,
  }));
  return { eski: eskiRaflar(hepsi), yeni: yeniRaflar(hepsi) };
}

function formdanEslemeler(form: FormData): Esleme[] {
  const cikti: Esleme[] = [];
  for (const [anahtar, deger] of form.entries()) {
    if (!anahtar.startsWith("hedef-")) continue;
    const hedefId = String(deger);
    cikti.push({
      kaynakId: anahtar.slice("hedef-".length),
      hedefId: hedefId ? hedefId : null,
    });
  }
  return cikti;
}

/** Adım 1 — plan. HİÇBİR ŞEY YAZMAZ. */
export async function gocuOnizle(form: FormData): Promise<GocSonucu> {
  await yetkiIste("ayar.yaz");
  const t = await getTranslations("Goc");

  const { eski, yeni } = await raflariOku();
  const plan = gocPlani(eski, yeni, formdanEslemeler(form));

  if (plan.hatalar.length > 0) {
    const h = plan.hatalar[0];
    return { durum: "HATA", engel: t(`hata${h.tur}` as "hataHEDEF_TEKRAR", { kod: h.kod }) };
  }
  if (plan.tasinacak.length === 0) {
    return { durum: "HATA", engel: t("hataEslemeYok") };
  }
  return { durum: "ONIZLEME", plan };
}

/** Adım 2 — taşıma. Kullanıcı planı GÖRDÜKTEN sonra. */
export async function gocuUygula(form: FormData): Promise<GocSonucu> {
  await yetkiIste("ayar.yaz");
  const t = await getTranslations("Goc");

  const { eski, yeni } = await raflariOku();
  const plan = gocPlani(eski, yeni, formdanEslemeler(form));

  if (plan.hatalar.length > 0) {
    const h = plan.hatalar[0];
    return { durum: "HATA", engel: t(`hata${h.tur}` as "hataHEDEF_TEKRAR", { kod: h.kod }) };
  }
  if (plan.tasinacak.length === 0) {
    return { durum: "HATA", engel: t("hataEslemeYok") };
  }

  const hedefIdsi = new Map(yeni.map((y) => [y.kod, y.id]));
  const once = plan.varyantToplami;

  const sonuc = await prisma.$transaction(async (tx) => {
    let tasinanVaryant = 0;

    for (const satir of plan.tasinacak) {
      const hedefId = hedefIdsi.get(satir.hedefKod);
      if (!hedefId) continue;
      const guncelleme = await tx.productVariant.updateMany({
        where: { locationId: satir.kaynak.id, isActive: true },
        data: { locationId: hedefId },
      });
      tasinanVaryant += guncelleme.count;
    }

    /**
     * ⚠ ÖNCE/SONRA SAYIM — TUTMAZSA İŞLEM GERİ ALINIR.
     * Bir bağ düşmüşse ürün "rafsız" kalır ve depoda aranıp bulunamaz.
     * Sessizce devam etmek, bulunamayan ürünü yarına bırakmak olurdu.
     */
    if (!sayimTutuyorMu(once, tasinanVaryant)) {
      throw new Error(`SAYIM_TUTMADI:${once}:${tasinanVaryant}`);
    }

    /**
     * ⚠ BOŞALAN RAF SİLİNMEZ, PASİFE ALINIR. K50 "boşalanı sil" diyor ve
     * amaç aynı: raf aktif listelerden kalkar. Ama SİLMEK, o rafa dair
     * geçmiş her kaydı sahipsiz bırakırdı; deponun kendi idiyomu da
     * pasife almak (`konumDurumDegistir`). Gerçekten silmek isteyen aynı
     * ekrandan tek tek silebilir — geri dönüşsüz iş toplu yapılmaz.
     */
    const pasif = await tx.location.updateMany({
      where: { id: { in: plan.tasinacak.map((s) => s.kaynak.id) } },
      data: { isActive: false },
    });

    return { tasinanVaryant, pasifEdilen: pasif.count };
  });

  revalidatePath("/ayarlar/depo");
  revalidatePath("/ayarlar/depo/goc");
  revalidatePath("/ayarlar/konumlar");

  return {
    durum: "TASINDI",
    tasinanRaf: plan.tasinacak.length,
    tasinanVaryant: sonuc.tasinanVaryant,
    pasifEdilen: sonuc.pasifEdilen,
  };
}
