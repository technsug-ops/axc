import { prisma } from "@/lib/prisma";

import { duzeniCoz, duzeniOku, type CozulmusDuzen } from "./duzen";
import { MENU_GRUPLARI, MENU_KATALOGU } from "./katalog";

/**
 * ============================================================================
 *  MENÜ DÜZENİ — VERİ OKUMA (K51, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ ÇÖZÜM SUNUCUDA. İstemcide çözülseydi menü ilk boyamada varsayılan
 *  sırayla çizilir, sonra kullanıcının sırasına ATLARDI — her sayfa
 *  açılışında gözle görülür bir zıplama.
 *
 *  ⚠ HATA MENÜYÜ DÜŞÜREMEZ. Bu fonksiyon her sayfada çağrılıyor; veritabanı
 *  bir an cevap vermezse menünün kaybolması değil, VARSAYILAN düzenle
 *  çizilmesi doğrudur. Kullanıcı sırasını kaybeder, uygulamayı kaybetmez.
 *  _(Anayasa: kalıcılık katmanı, çalışma katmanının önkoşulu yapılmaz.)_
 * ============================================================================
 */

/** Kullanıcı hiç düzenlemediyse ya da okuma düşerse: saf varsayılan. */
export function varsayilanDuzen(): CozulmusDuzen {
  return duzeniCoz(MENU_KATALOGU, MENU_GRUPLARI, null);
}

export async function menuDuzeni(
  companyId: string | null,
): Promise<CozulmusDuzen> {
  if (!companyId) return varsayilanDuzen();

  try {
    const firma = await prisma.company.findUnique({
      where: { id: companyId },
      select: { menuDuzeni: true },
    });
    return duzeniCoz(
      MENU_KATALOGU,
      MENU_GRUPLARI,
      duzeniOku(firma?.menuDuzeni ?? null),
    );
  } catch {
    /**
     * ⚠ SESSİZ YUTMA DEĞİL, BİLİNÇLİ GERİ ÇEKİLME — ve farkı şu: yutulan
     * şey bir VERİ değil, bir TERCİH. Menü yine çizilir, yalnız varsayılan
     * sırayla. Burada `throw` etmek her sayfayı 500'e düşürürdü.
     */
    return varsayilanDuzen();
  }
}
