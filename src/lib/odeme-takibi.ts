import type { AboneDonemi, Currency, FirmaOdemeYontemi } from "@/generated/prisma/client";
import { bugunIs } from "@/lib/aski-sureci";
import { ayKaydir, gunMetninden } from "@/lib/donem";
import { turkceSayi } from "@/lib/finansman/kural";
import { sistemPrisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  ELLE ÖDEME TAKİBİ (K303, kullanıcı kararı 06.10.2026)
 * ----------------------------------------------------------------------------
 *  «Ödeme alır hâle gelelim» → önce ELLE takip, kartla tahsilat sonra aynı
 *  kayıtların üstüne. Anayasa yalnız bu kadar çevrildi (fatura, kartla
 *  tahsilat, paket satışı, kendi kendine kayıt hâlâ KAPALI).
 *
 *  ⚠ DEFTER: ödeme kaydı silinmez/değiştirilmez; yanlış kayıt TERS kayıtla
 *  (eksi tutar + `duzeltilenId`) düzeltilir, bir kayıt en çok bir kez.
 *  ⚠ PARA: toplamlar KURUŞ tam sayısıyla yapılır (anayasa + `para.ts`: kuruşun
 *  altında para yoktur; float toplamı karşılaştırmaya girerse saçma sonuç verir).
 *  ⚠ GÜN: İstanbul günü (`bugunIs`); vade UTC gece yarısı saklanır.
 *
 *  SISTEM: yönetim verisi — sorgular firma kimliğiyle açıkça süzülür.
 * ============================================================================
 */

export const YAKLASIYOR_GUN = 7;
const GUN_MS = 24 * 60 * 60 * 1000;

export type OdemeDurumu =
  | { tur: "TANIMSIZ" }
  | { tur: "ZAMANINDA"; kalanGun: number; vade: Date }
  | { tur: "YAKLASIYOR"; kalanGun: number; vade: Date }
  | { tur: "GECIKTI"; gecenGun: number; vade: Date };

/** Saf — vadeye göre durum. Vade günü DAHİL zamanında; ertesi gün gecikmiş. */
export function odemeDurumu(vade: Date | null, bugun: Date): OdemeDurumu {
  if (!vade) return { tur: "TANIMSIZ" };
  const fark = Math.round((vade.getTime() - bugun.getTime()) / GUN_MS);
  if (fark < 0) return { tur: "GECIKTI", gecenGun: -fark, vade };
  if (fark <= YAKLASIYOR_GUN) return { tur: "YAKLASIYOR", kalanGun: fark, vade };
  return { tur: "ZAMANINDA", kalanGun: fark, vade };
}

/**
 * Saf — vadeyi bir dönem ileri alır. Ay sonu KISILIR: 31 Ocak + 1 ay =
 * 28/29 Şubat (taşıp Mart'a geçmez); yıllıkta 29 Şubat → 28 Şubat.
 */
export function vadeyiIlerlet(vade: Date, donem: AboneDonemi, adim = 1): Date {
  const ay = donem === "AYLIK" ? adim : adim * 12;
  const { yil, ay: hedefAy } = ayKaydir(vade.getUTCFullYear(), vade.getUTCMonth() + 1, ay);
  const sonGun = new Date(Date.UTC(yil, hedefAy, 0)).getUTCDate();
  return new Date(Date.UTC(yil, hedefAy - 1, Math.min(vade.getUTCDate(), sonGun)));
}

/** Saf — kuruş tam sayısı (Decimal/sayı/metin). Kuruşun altı yuvarlanır. */
export function kurus(tutar: { toString(): string } | number): number {
  const n = typeof tutar === "number" ? tutar : Number(tutar.toString());
  return Math.round(n * 100);
}

export type AbonelikHatasi = "TUTAR_GECERSIZ" | "PARA_BIRIMI_GECERSIZ" | "DONEM_GECERSIZ" | "VADE_GECERSIZ" | "FIRMA_YOK";

/** Abonelik tanımla / değiştir. Eski ve yeni değer aynı işlemde ize yazılır. */
export async function aboneligiKaydet(
  firmaId: string,
  g: { tutar: string; paraBirimi: string; donem: string; vade: string },
  yapanId: string,
): Promise<{ durum: "TAMAM" } | { durum: "HATA"; hata: AbonelikHatasi }> {
  const tutar = turkceSayi(g.tutar);
  if (tutar === null || tutar <= 0) return { durum: "HATA", hata: "TUTAR_GECERSIZ" };
  if (g.paraBirimi !== "TRY" && g.paraBirimi !== "EUR") return { durum: "HATA", hata: "PARA_BIRIMI_GECERSIZ" };
  if (g.donem !== "AYLIK" && g.donem !== "YILLIK") return { durum: "HATA", hata: "DONEM_GECERSIZ" };
  const vade = gunMetninden(g.vade);
  if (!vade) return { durum: "HATA", hata: "VADE_GECERSIZ" };
  // SISTEM: yönetim katmanı.
  const once = await sistemPrisma.company.findUnique({ where: { id: firmaId }, select: { aboneTutari: true, aboneParaBirimi: true, aboneDonemi: true, sonrakiOdemeGunu: true } });
  if (!once) return { durum: "HATA", hata: "FIRMA_YOK" };
  const yeni = { aboneTutari: (kurus(tutar) / 100).toFixed(2), aboneParaBirimi: g.paraBirimi as Currency, aboneDonemi: g.donem as AboneDonemi, sonrakiOdemeGunu: vade };
  // SISTEM: abonelik ve izi aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: firmanın abonelik alanları.
    sistemPrisma.company.update({ where: { id: firmaId }, data: yeni }),
    // SISTEM: iz firmalar-üstü, hedef firma targetId'de.
    sistemPrisma.auditLog.create({
      data: {
        action: "FIRMA_ABONELIK_KAYDEDILDI",
        targetType: "Company",
        targetId: firmaId,
        userId: yapanId,
        companyId: null,
        detail: JSON.stringify({ once: { ...once, aboneTutari: once.aboneTutari?.toString() ?? null }, yeni }),
      },
    }),
  ]);
  return { durum: "TAMAM" };
}

export const ODEME_YONTEMLERI = ["HAVALE", "KART", "NAKIT", "DIGER"] as const satisfies readonly FirmaOdemeYontemi[];

export type OdemeHatasi = "TUTAR_GECERSIZ" | "PARA_BIRIMI_GECERSIZ" | "YONTEM_GECERSIZ" | "GUN_GECERSIZ" | "GUN_GELECEKTE" | "FIRMA_YOK" | "ACIKLAMA_UZUN";

/**
 * Ödeme kaydı. Abonelik tanımlıysa vade BİR dönem ileri kayar (önceki ve yeni
 * vade kayda yazılır — ters kayıt geri alabilsin). Gelecek tarihli ödeme
 * girilemez (para henüz gelmedi).
 */
export async function odemeKaydet(
  firmaId: string,
  g: { gun: string; tutar: string; paraBirimi: string; yontem: string; aciklama: string },
  yapanId: string,
  an: Date = new Date(),
): Promise<{ durum: "TAMAM"; id: string; vadeSonra: Date | null } | { durum: "HATA"; hata: OdemeHatasi }> {
  const tutar = turkceSayi(g.tutar);
  if (tutar === null || tutar <= 0) return { durum: "HATA", hata: "TUTAR_GECERSIZ" };
  if (g.paraBirimi !== "TRY" && g.paraBirimi !== "EUR") return { durum: "HATA", hata: "PARA_BIRIMI_GECERSIZ" };
  const yontem = ODEME_YONTEMLERI.find((y) => y === g.yontem);
  if (!yontem) return { durum: "HATA", hata: "YONTEM_GECERSIZ" };
  const gun = gunMetninden(g.gun);
  if (!gun) return { durum: "HATA", hata: "GUN_GECERSIZ" };
  if (gun.getTime() > bugunIs(an).getTime()) return { durum: "HATA", hata: "GUN_GELECEKTE" };
  const aciklama = g.aciklama.trim();
  if (aciklama.length > 500) return { durum: "HATA", hata: "ACIKLAMA_UZUN" };
  // SISTEM: yönetim katmanı.
  const f = await sistemPrisma.company.findUnique({ where: { id: firmaId }, select: { aboneDonemi: true, sonrakiOdemeGunu: true } });
  if (!f) return { durum: "HATA", hata: "FIRMA_YOK" };
  const vadeOnce = f.sonrakiOdemeGunu;
  const vadeSonra = vadeOnce && f.aboneDonemi ? vadeyiIlerlet(vadeOnce, f.aboneDonemi) : vadeOnce;
  // SISTEM: kayıt + vade + iz aynı işlemde.
  const [kayit] = await sistemPrisma.$transaction([
    // SISTEM: ödeme defteri (yönetim verisi).
    sistemPrisma.firmaOdemesi.create({
      data: { firmaId, odemeGunu: gun, tutar: (kurus(tutar) / 100).toFixed(2), paraBirimi: g.paraBirimi as Currency, yontem, aciklama: aciklama || null, vadeOnce, vadeSonra, yazanId: yapanId },
      select: { id: true },
    }),
    // SISTEM: firmanın vadesi.
    sistemPrisma.company.update({ where: { id: firmaId }, data: { sonrakiOdemeGunu: vadeSonra } }),
  ]);
  return { durum: "TAMAM", id: kayit.id, vadeSonra };
}

export type DuzeltmeHatasi = "KAYIT_YOK" | "TERS_KAYIT_DUZELTILEMEZ" | "ZATEN_DUZELTILDI" | "ACIKLAMA_ZORUNLU";

/**
 * Ters kayıt: eksi tutar + `duzeltilenId`. Vade, ödeme kaydının ÖNCEKİ değerine
 * döner — ama YALNIZ bugünkü vade hâlâ o kaydın bıraktığı değerse (arada başka
 * ödeme girildiyse vade sessizce geri alınmaz; `vadeGeriAlindi: false` döner).
 */
export async function odemeyiDuzelt(
  odemeId: string,
  aciklama: string,
  yapanId: string,
): Promise<{ durum: "TAMAM"; vadeGeriAlindi: boolean } | { durum: "HATA"; hata: DuzeltmeHatasi }> {
  const neden = aciklama.trim();
  if (!neden) return { durum: "HATA", hata: "ACIKLAMA_ZORUNLU" };
  // SISTEM: yönetim katmanı — kayıt kimliğiyle.
  const k = await sistemPrisma.firmaOdemesi.findUnique({
    where: { id: odemeId },
    select: { id: true, firmaId: true, tutar: true, paraBirimi: true, yontem: true, duzeltilenId: true, vadeOnce: true, vadeSonra: true, duzeltme: { select: { id: true } }, firma: { select: { sonrakiOdemeGunu: true } } },
  });
  if (!k) return { durum: "HATA", hata: "KAYIT_YOK" };
  if (k.duzeltilenId) return { durum: "HATA", hata: "TERS_KAYIT_DUZELTILEMEZ" };
  if (k.duzeltme) return { durum: "HATA", hata: "ZATEN_DUZELTILDI" };
  const simdi = k.firma.sonrakiOdemeGunu;
  const vadeGeriAlindi = Boolean(k.vadeSonra && simdi && simdi.getTime() === k.vadeSonra.getTime());
  const yeniVade = vadeGeriAlindi ? k.vadeOnce : simdi;
  // SISTEM: ters kayıt + vade aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: ödeme defteri — ters kayıt.
    sistemPrisma.firmaOdemesi.create({
      data: {
        firmaId: k.firmaId,
        odemeGunu: bugunIs(),
        tutar: (-kurus(k.tutar) / 100).toFixed(2),
        paraBirimi: k.paraBirimi,
        yontem: k.yontem,
        aciklama: neden,
        duzeltilenId: k.id,
        vadeOnce: simdi,
        vadeSonra: yeniVade,
        yazanId: yapanId,
      },
    }),
    // SISTEM: firmanın vadesi.
    sistemPrisma.company.update({ where: { id: k.firmaId }, data: { sonrakiOdemeGunu: yeniVade } }),
  ]);
  return { durum: "TAMAM", vadeGeriAlindi };
}

/** Firmanın ödemeleri (en yeni önce) + para birimi başına toplam (kuruşla toplanır). */
export async function firmaOdemeleri(firmaId: string) {
  // SISTEM: yönetim katmanı — firma kimliğiyle.
  const satirlar = await sistemPrisma.firmaOdemesi.findMany({
    where: { firmaId },
    orderBy: [{ odemeGunu: "desc" }, { createdAt: "desc" }],
    select: { id: true, odemeGunu: true, tutar: true, paraBirimi: true, yontem: true, aciklama: true, duzeltilenId: true, duzeltme: { select: { id: true } }, yazan: { select: { email: true } }, createdAt: true },
  });
  const toplamKurus = new Map<string, number>();
  for (const s of satirlar) toplamKurus.set(s.paraBirimi, (toplamKurus.get(s.paraBirimi) ?? 0) + kurus(s.tutar));
  return {
    satirlar: satirlar.map((s) => ({
      id: s.id,
      gun: s.odemeGunu,
      tutar: kurus(s.tutar) / 100,
      paraBirimi: s.paraBirimi,
      yontem: s.yontem,
      aciklama: s.aciklama,
      tersKayit: Boolean(s.duzeltilenId),
      duzeltildi: Boolean(s.duzeltme),
      yazan: s.yazan.email,
    })),
    toplamlar: [...toplamKurus.entries()].map(([paraBirimi, k]) => ({ paraBirimi, tutar: k / 100 })),
  };
}
