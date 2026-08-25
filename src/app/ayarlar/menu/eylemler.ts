"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { duzenGecerliMi, type KayitliDuzen } from "@/lib/menu/duzen";
import {
  MENU_GRUPLARI,
  MENU_IZNI,
  MENU_KATALOGU,
  MENUDEN_DUSURULEMEZ,
} from "@/lib/menu/katalog";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  MENÜ DÜZENİ — YAZMA (K51, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ YENİ İZİN AÇILMADI. `ayar.yaz` mevcut ve bu ekran tam olarak
 *  onun işi. Yeni izin açsaydık `izinler.ts` + `seed-yetki.ts →
 *  SONRADAN_DOGAN` + canlı senkron gerekirdi ve unutulan tek satır ekranı
 *  GÖRÜNMEZ yapardı (bkz. `/iadeler`, 13.08.2026).
 *
 *  ⚠ DOĞRULAMA SUNUCUDA. İstemcinin gönderdiği şekle güvenilmez: bozuk bir
 *  gövde menüyü boşaltabilir ve kullanıcı hiçbir ekrana ulaşamaz.
 * ============================================================================
 */

export type MenuDurumu = { hatalar?: string[]; basari?: string };

export async function menuDuzeniniKaydet(
  _oncekiDurum: MenuDurumu,
  formData: FormData,
): Promise<MenuDurumu> {
  const baglam = await yetkiIste(MENU_IZNI);
  const t = await getTranslations("MenuDuzeni");

  const ham = String(formData.get("duzen") ?? "");
  let cozulen: unknown;
  try {
    cozulen = JSON.parse(ham);
  } catch {
    return { hatalar: [t("bozukGovde")] };
  }
  if (!duzenGecerliMi(cozulen)) return { hatalar: [t("bozukGovde")] };

  const duzen = cozulen as KayitliDuzen;

  /**
   * ⚠ KAPSAM DENETİMİ — İSTEMCİ NE GÖNDERİRSE GÖNDERSİN.
   * Kayıt katalogda olmayan bir anahtar taşıyorsa bu bir hata DEĞİL, çözüm
   * katmanı zaten yok sayıyor. Ama katalogda OLUP hiçbir yerde geçmeyen
   * anahtar da hata değil — varsayılan yerine düşüyor. Yani burada
   * reddedilecek tek şey ŞEKİL bozukluğu; kapsam kendiliğinden onarılıyor.
   *
   * ⚠ TEK GERÇEK KİLİT: düşürülemez ekranlar. Bugün V1'de gizleme yolu
   * yok, ama kilidi ŞİMDİ koyuyoruz — ileride "gizle" açıldığında bu
   * kontrolün unutulması, kullanıcının kendi menüsünü kilitlemesi demek.
   */
  const gecen = new Set<string>([
    ...duzen.gunluk,
    ...duzen.gruplar.flatMap((g) => g.ogeler),
  ]);
  const bilinen = new Set(MENU_KATALOGU.map((o) => o.anahtar));
  const eksik = MENUDEN_DUSURULEMEZ.filter(
    (a) => bilinen.has(a) && !gecen.has(a),
  );
  if (eksik.length > 0) {
    return { hatalar: [t("dusurulemez", { adet: eksik.length })] };
  }

  /**
   * ⚠ TANINMAYAN GRUP TEMİZLENİR. İstemci uydurma bir grup gönderirse
   * (ya da koddan bir grup kaldırılmışsa) kaydın içinde ölü satır
   * birikmesin — çözüm katmanı onu zaten yok sayıyor, ama kaydın kendisi
   * de temiz kalmalı. Aksi hâlde bir yıl sonra kimsenin anlamadığı
   * anahtarlar taşıyan bir JSON kalırdı.
   */
  const bilinenGrup = new Set(MENU_GRUPLARI.map((g) => g.anahtar));
  const temiz: KayitliDuzen = {
    gunluk: duzen.gunluk.filter((a) => bilinen.has(a)),
    gruplar: duzen.gruplar
      .filter((g) => bilinenGrup.has(g.anahtar))
      .map((g) => ({
        anahtar: g.anahtar,
        /** ⚠ V2 alanı KORUNUR — V1 yazmıyor ama varsa silmiyor. */
        ...(g.ad === undefined ? {} : { ad: g.ad }),
        ogeler: g.ogeler.filter((a) => bilinen.has(a)),
      })),
  };

  try {
    await prisma.company.update({
      where: { id: baglam.companyId },
      data: { menuDuzeni: JSON.stringify(temiz) },
    });
  } catch (e) {
    console.error("[menu duzeni] kaydedilemedi:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  /**
   * ⚠ BÜTÜN SAYFALAR TAZELENİR — menü her sayfada çiziliyor. Yalnız bu
   * sayfa tazelenseydi kullanıcı kaydeder, başka bir ekrana geçer ve ESKİ
   * menüyü görürdü; değişikliğin kaydolmadığını sanırdı.
   */
  revalidatePath("/", "layout");
  return { basari: t("kaydedildi") };
}

/**
 * VARSAYILANA DÖN — kaydı siler, kod düzeni geçerli olur.
 *
 * ⚠ YIKICI EYLEM (İlke #6): çağıran ekran onay diyaloğu göstermek zorunda.
 * ⚠ SİLİNEN ŞEY BİR TERCİH, BİR VERİ DEĞİL — geri alınamaz ama kaybolan
 * bir kayıt da yok; kullanıcı sırasını yeniden dizer.
 */
export async function menuDuzeniniSifirla(
  _oncekiDurum: MenuDurumu,
  _formData: FormData,
): Promise<MenuDurumu> {
  const baglam = await yetkiIste(MENU_IZNI);
  const t = await getTranslations("MenuDuzeni");

  try {
    await prisma.company.update({
      where: { id: baglam.companyId },
      data: { menuDuzeni: null },
    });
  } catch (e) {
    console.error("[menu duzeni] sifirlanamadi:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  revalidatePath("/", "layout");
  return { basari: t("sifirlandi") };
}
