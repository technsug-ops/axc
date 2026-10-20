import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { izYaz } from "@/lib/iz";
import { VARSAYILAN_DIL } from "@/i18n/ayarlar";
import { abonelereGonder, izinliAbonelikler, pushAyari, type Gonderici } from "@/lib/bildirim/push-gonder";
import { tebrikIzni, type HedefDonemi, type HedefOlcutu } from "./hedef-karar";
import { hedefDurumuGetir } from "./hedef-veri";

/**
 * ============================================================================
 *  HEDEF TEBRİĞİ (K349, 20.10.2026) — geçilen hedefe telefona «Tebrikler!»
 * ----------------------------------------------------------------------------
 *  Sipariş çekiminden sonra, YENİ SİPARİŞ geldiyse koşar (yıllık hesap 5 dakikada
 *  bir boşuna koşmasın). ⛔ HER HEDEF × DÖNEM İÇİN TEK TEBRİK — yapısal: tebrik
 *  satırı tekil (`hedefId + donemBasi`); satır AÇILAMAZSA (başka tetik açmış)
 *  bildirim GİTMEZ. Rakam o anki hâliyle donar; sonradan gelen iade düşürse de
 *  tebrik geri alınmaz (bildirim bir haberdir). Kilit ekranına TUTAR YAZILMAZ.
 *  Kâr tebriği yalnız kârı görme izni olana (`tebrikIzni`).
 * ============================================================================
 */

type Istemci = Prisma.TransactionClient;
type Metin = (olcut: HedefOlcutu, donem: HedefDonemi) => Promise<{ baslik: string; govde: string }>;

async function tebrikMetni(olcut: HedefOlcutu, donem: HedefDonemi) {
  const t = await getTranslations({ locale: VARSAYILAN_DIL, namespace: "Hedef" });
  return { baslik: t("tebrikBaslik"), govde: t("tebrikGovde", { olcut, donem }) };
}

export type TebrikOzeti = { durum: "KAPALI" } | { durum: "TAMAM"; verilen: number; zatenVerilmis: number };

export async function hedefTebrikleriniGonder(
  secenek: { an?: Date; istemci?: Istemci; gonder?: Gonderici; metin?: Metin } = {},
): Promise<TebrikOzeti> {
  const ayar = pushAyari();
  if (!ayar) return { durum: "KAPALI" };
  const istemci = secenek.istemci ?? prisma;
  const gonder = secenek.gonder ?? abonelereGonder;
  const durumlar = (await hedefDurumuGetir(secenek.an ?? new Date(), istemci)).filter((d) => d.gecildi);
  let verilen = 0;
  let zatenVerilmis = 0;
  for (const d of durumlar) {
    const acildi = await istemci.hedefTebrigi.createMany({
      data: [{ hedefId: d.hedefId, donemBasi: d.donemBasi, gerceklesen: d.gerceklesen }],
      skipDuplicates: true,
    });
    if (acildi.count !== 1) { zatenVerilmis++; continue; }
    verilen++;
    const { baslik, govde } = await (secenek.metin ?? tebrikMetni)(d.olcut, d.donem);
    const sonuc = await gonder(ayar, await izinliAbonelikler(tebrikIzni(d.olcut), undefined, istemci), {
      baslik,
      govde,
      url: "/",
      etiket: `hedef-${d.olcut}-${d.donem}`,
    }, istemci);
    await izYaz({
      action: "HEDEF_TEBRIK",
      userId: null,
      targetType: "Hedef",
      targetId: d.hedefId,
      detail: JSON.stringify({ olcut: d.olcut, donem: d.donem, donemBasi: d.donemBasi.toISOString().slice(0, 10), hedef: d.hedef, gerceklesen: d.gerceklesen, gonderim: sonuc }),
    }, istemci);
  }
  return { durum: "TAMAM", verilen, zatenVerilmis };
}

/** Cron uçlarının kabuğu: hata çekimin sonucunu bozmaz, TAM loglanır. */
export async function hedefTebrikleriniDene(): Promise<TebrikOzeti | { durum: "HATA" }> {
  try {
    return await hedefTebrikleriniGonder();
  } catch (hata) {
    console.error("[hedef-tebrik] düştü:", hata);
    return { durum: "HATA" };
  }
}
