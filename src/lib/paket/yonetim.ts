import { turkceSayi } from "@/lib/finansman/kural";
import { izKaydi } from "@/lib/iz";
import { sistemPrisma } from "@/lib/prisma";

import { acikOzellikler, OZELLIKLER } from "./ozellikler";
import { sinirOku } from "./sinirlar";

/**
 * ============================================================================
 *  PAKET YÖNETİMİ — süper admin (K303 ②, kullanıcı kararı 30.09 + 06.10.2026)
 * ----------------------------------------------------------------------------
 *  Paket içeriği VERİDİR; anahtarlar `ozellikler.ts`ten. Her değişiklik
 *  önce/sonra değeriyle ize yazılır (SUSTURMA değil KAYIT: «bu firma neden
 *  bu ekranı göremiyor» sorusunun cevabı izde durur).
 *
 *  ⚠ PAKET DEĞİŞİNCE VERİ SİLİNMEZ (docs §3) — yalnız açık özellik kümesi
 *  değişir. ⚠ Individuel'e GEÇİŞTE firma seçimi BUGÜNKÜ açık kümeden yeniden
 *  kurulur (eski, bayat bir seçim geri gelmez): geçiş tek başına hiçbir ekranı
 *  kapatmaz ve açmaz.
 *
 *  SISTEM: yönetim verisi — sorgular kimlikle açıkça süzülür.
 * ============================================================================
 */

const GECERLI = new Set<string>(OZELLIKLER);

function izYaz(action: string, targetType: string, targetId: string, yapanId: string, detay: unknown) {
  // SISTEM: paket izleri firmalar-üstü; hedef targetId'de.
  return izKaydi(sistemPrisma, { action, targetType, targetId, userId: yapanId, companyId: null, detail: JSON.stringify(detay) });
}

/** Bütün paketler — içerik, firma sayısı, öneri fiyatı. */
export async function paketler() {
  // SISTEM: yönetim katmanı — paket kataloğu.
  const p = await sistemPrisma.paket.findMany({
    orderBy: [{ sira: "asc" }, { ad: "asc" }],
    select: { id: true, ad: true, aciklama: true, sira: true, firmayaOzel: true, onerilenTutar: true, onerilenParaBirimi: true, onerilenDonem: true, kanalHesabiSiniri: true, kullaniciSiniri: true, aylikSiparisSiniri: true, ozellikler: { select: { ozellik: true } }, _count: { select: { firmalar: true } } },
  });
  return p.map((x) => ({
    id: x.id,
    ad: x.ad,
    aciklama: x.aciklama,
    sira: x.sira,
    firmayaOzel: x.firmayaOzel,
    onerilenTutar: x.onerilenTutar === null ? null : Number(x.onerilenTutar.toString()),
    onerilenParaBirimi: x.onerilenParaBirimi,
    onerilenDonem: x.onerilenDonem,
    ozellikler: x.ozellikler.map((o) => o.ozellik).filter((o) => GECERLI.has(o)),
    firmaSayisi: x._count.firmalar,
    sinirlar: { kanalHesabi: x.kanalHesabiSiniri, kullanici: x.kullaniciSiniri, aylikSiparis: x.aylikSiparisSiniri },
  }));
}

export type PaketHatasi = "AD_BOS" | "AD_VAR" | "TUTAR_GECERSIZ" | "PARA_BIRIMI_GECERSIZ" | "DONEM_GECERSIZ" | "PAKET_YOK" | "OZELLIK_GECERSIZ" | "FIRMAYA_OZEL";

/** Yeni paket (`id` null) ya da var olanın adı/açıklaması/öneri fiyatı. */
export async function paketKaydet(
  id: string | null,
  g: { ad: string; aciklama: string; tutar: string; paraBirimi: string; donem: string; firmayaOzel?: boolean },
  yapanId: string,
): Promise<{ durum: "TAMAM"; id: string } | { durum: "HATA"; hata: PaketHatasi }> {
  const ad = g.ad.trim().replace(/\s+/g, " ");
  if (!ad) return { durum: "HATA", hata: "AD_BOS" };
  let tutar: string | null = null;
  if (g.tutar.trim()) {
    const n = turkceSayi(g.tutar);
    if (n === null || n <= 0) return { durum: "HATA", hata: "TUTAR_GECERSIZ" };
    tutar = (Math.round(n * 100) / 100).toFixed(2);
    if (g.paraBirimi !== "TRY" && g.paraBirimi !== "EUR") return { durum: "HATA", hata: "PARA_BIRIMI_GECERSIZ" };
    if (g.donem !== "AYLIK" && g.donem !== "YILLIK") return { durum: "HATA", hata: "DONEM_GECERSIZ" };
  }
  // SISTEM: ad tekilliği.
  const ayni = await sistemPrisma.paket.findUnique({ where: { ad }, select: { id: true } });
  if (ayni && ayni.id !== id) return { durum: "HATA", hata: "AD_VAR" };
  const veri = {
    ad,
    aciklama: g.aciklama.trim() || null,
    onerilenTutar: tutar,
    onerilenParaBirimi: tutar ? (g.paraBirimi as "TRY" | "EUR") : null,
    onerilenDonem: tutar ? (g.donem as "AYLIK" | "YILLIK") : null,
  };
  if (id === null) {
    // SISTEM: sıra — en sona.
    const son = await sistemPrisma.paket.aggregate({ _max: { sira: true } });
    // SISTEM: yeni paket.
    const p = await sistemPrisma.paket.create({ data: { ...veri, firmayaOzel: Boolean(g.firmayaOzel), sira: (son._max.sira ?? 0) + 1 }, select: { id: true } });
    await izYaz("PAKET_ACILDI", "Paket", p.id, yapanId, { ...veri, firmayaOzel: Boolean(g.firmayaOzel) });
    return { durum: "TAMAM", id: p.id };
  }
  // SISTEM: var olan paket.
  const once = await sistemPrisma.paket.findUnique({ where: { id }, select: { ad: true, aciklama: true, onerilenTutar: true, onerilenParaBirimi: true, onerilenDonem: true } });
  if (!once) return { durum: "HATA", hata: "PAKET_YOK" };
  // SISTEM: paket bilgisi.
  await sistemPrisma.paket.update({ where: { id }, data: veri });
  await izYaz("PAKET_DEGISTI", "Paket", id, yapanId, { once: { ...once, onerilenTutar: once.onerilenTutar?.toString() ?? null }, yeni: veri });
  return { durum: "TAMAM", id };
}

/** Paketin içeriğini TAM küme olarak yazar (işaretli kutular). Firmaya özel pakette içerik yoktur. */
export async function paketIceriginiKaydet(
  paketId: string,
  secim: readonly string[],
  yapanId: string,
): Promise<{ durum: "TAMAM"; eklenen: string[]; cikan: string[] } | { durum: "HATA"; hata: PaketHatasi }> {
  if (secim.some((o) => !GECERLI.has(o))) return { durum: "HATA", hata: "OZELLIK_GECERSIZ" };
  // SISTEM: paket.
  const p = await sistemPrisma.paket.findUnique({ where: { id: paketId }, select: { firmayaOzel: true, ozellikler: { select: { ozellik: true } } } });
  if (!p) return { durum: "HATA", hata: "PAKET_YOK" };
  if (p.firmayaOzel) return { durum: "HATA", hata: "FIRMAYA_OZEL" };
  const once = new Set(p.ozellikler.map((o) => o.ozellik));
  const yeni = new Set(secim);
  const eklenen = [...yeni].filter((o) => !once.has(o));
  const cikan = [...once].filter((o) => !yeni.has(o));
  if (eklenen.length === 0 && cikan.length === 0) return { durum: "TAMAM", eklenen, cikan };
  // SISTEM: içerik ve izi aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: çıkan özellikler.
    sistemPrisma.paketOzelligi.deleteMany({ where: { paketId, ozellik: { in: cikan } } }),
    // SISTEM: eklenen özellikler.
    sistemPrisma.paketOzelligi.createMany({ data: eklenen.map((ozellik) => ({ paketId, ozellik })) }),
    // SISTEM: iz.
    izKaydi(sistemPrisma, { action: "PAKET_ICERIGI_DEGISTI", targetType: "Paket", targetId: paketId, userId: yapanId, companyId: null, detail: JSON.stringify({ eklenen, cikan }) }),
  ]);
  return { durum: "TAMAM", eklenen, cikan };
}

/** Firmanın paketi ve AÇIK özellikleri. */
export async function firmaPaketi(firmaId: string) {
  // SISTEM: yönetim katmanı — firma kimliğiyle.
  const f = await sistemPrisma.company.findUnique({
    where: { id: firmaId },
    select: { paket: { select: { id: true, ad: true, firmayaOzel: true, onerilenTutar: true, onerilenParaBirimi: true, onerilenDonem: true, ozellikler: { select: { ozellik: true } } } }, ozellikler: { select: { ozellik: true } } },
  });
  if (!f) return null;
  const paketOz = f.paket?.ozellikler.map((o) => o.ozellik) ?? [];
  const secim = f.ozellikler.map((o) => o.ozellik);
  return {
    paket: f.paket ? { id: f.paket.id, ad: f.paket.ad, firmayaOzel: f.paket.firmayaOzel, onerilenTutar: f.paket.onerilenTutar === null ? null : Number(f.paket.onerilenTutar.toString()), onerilenParaBirimi: f.paket.onerilenParaBirimi, onerilenDonem: f.paket.onerilenDonem } : null,
    acik: acikOzellikler(f.paket ? { firmayaOzel: f.paket.firmayaOzel, ozellikler: paketOz } : null, secim),
  };
}

/**
 * Firmayı pakete bağla. Başka paketten Individuel'e geçerken firma seçimi
 * bugünkü açık kümeyle DEĞİŞTİRİLİR (geçiş tek başına ekran kapatmaz/açmaz).
 * Individuel'den Individuel'e (aynı paket) çağrı seçime dokunmaz.
 */
export async function firmaPaketiniDegistir(
  firmaId: string,
  paketId: string,
  yapanId: string,
): Promise<{ durum: "TAMAM"; kapanan: string[]; acilan: string[] } | { durum: "HATA"; hata: "FIRMA_YOK" | "PAKET_YOK" }> {
  const once = await firmaPaketi(firmaId);
  if (!once) return { durum: "HATA", hata: "FIRMA_YOK" };
  // SISTEM: hedef paket.
  const p = await sistemPrisma.paket.findUnique({ where: { id: paketId }, select: { id: true, ad: true, firmayaOzel: true, ozellikler: { select: { ozellik: true } } } });
  if (!p) return { durum: "HATA", hata: "PAKET_YOK" };
  const yenidenKur = p.firmayaOzel && !once.paket?.firmayaOzel;
  const kopyala = yenidenKur ? [...once.acik] : [];
  const sonraAcik = p.firmayaOzel ? (yenidenKur ? new Set(kopyala) : once.acik) : new Set(p.ozellikler.map((o) => o.ozellik));
  const kapanan = [...once.acik].filter((o) => !sonraAcik.has(o));
  const acilan = [...sonraAcik].filter((o) => !once.acik.has(o));
  // SISTEM: paket bağı + (Individuel'e geçişte) seçimin yeniden kurulması + iz aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: firmanın paketi.
    sistemPrisma.company.update({ where: { id: firmaId }, data: { paketId } }),
    ...(yenidenKur
      ? [
          // SISTEM: bayat seçim silinir…
          sistemPrisma.firmaOzelligi.deleteMany({ where: { firmaId } }),
          // SISTEM: …ve bugünkü açık küme yazılır.
          sistemPrisma.firmaOzelligi.createMany({ data: kopyala.map((ozellik) => ({ firmaId, ozellik })) }),
        ]
      : []),
    // SISTEM: iz.
    izKaydi(sistemPrisma, { action: "FIRMA_PAKETI_DEGISTI", targetType: "Company", targetId: firmaId, userId: yapanId, companyId: null, detail: JSON.stringify({ once: once.paket?.ad ?? null, yeni: p.ad, kapanan, acilan, yenidenKurulan: kopyala.length }) }),
  ]);
  return { durum: "TAMAM", kapanan, acilan };
}

/** Individuel firmada özellik seçimi — TAM küme. */
export async function firmaOzellikleriniKaydet(
  firmaId: string,
  secim: readonly string[],
  yapanId: string,
): Promise<{ durum: "TAMAM"; eklenen: string[]; cikan: string[] } | { durum: "HATA"; hata: "FIRMA_YOK" | "OZEL_DEGIL" | "OZELLIK_GECERSIZ" }> {
  if (secim.some((o) => !GECERLI.has(o))) return { durum: "HATA", hata: "OZELLIK_GECERSIZ" };
  const fp = await firmaPaketi(firmaId);
  if (!fp) return { durum: "HATA", hata: "FIRMA_YOK" };
  if (!fp.paket?.firmayaOzel) return { durum: "HATA", hata: "OZEL_DEGIL" };
  const yeni = new Set(secim);
  const eklenen = [...yeni].filter((o) => !fp.acik.has(o));
  const cikan = [...fp.acik].filter((o) => !yeni.has(o));
  if (eklenen.length === 0 && cikan.length === 0) return { durum: "TAMAM", eklenen, cikan };
  // SISTEM: seçim ve izi aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: çıkan.
    sistemPrisma.firmaOzelligi.deleteMany({ where: { firmaId, ozellik: { in: cikan } } }),
    // SISTEM: eklenen.
    sistemPrisma.firmaOzelligi.createMany({ data: eklenen.map((ozellik) => ({ firmaId, ozellik })) }),
    // SISTEM: iz.
    izKaydi(sistemPrisma, { action: "FIRMA_OZELLIKLERI_DEGISTI", targetType: "Company", targetId: firmaId, userId: yapanId, companyId: null, detail: JSON.stringify({ eklenen, cikan }) }),
  ]);
  return { durum: "TAMAM", eklenen, cikan };
}

/* ═══ ADET SINIRLARI (06.10.2026) ═══════════════════════════════════════ */

export type SinirHatasi = "SINIR_GECERSIZ" | "PAKET_YOK" | "FIRMAYA_OZEL" | "FIRMA_YOK" | "OZEL_DEGIL";

function sinirlariOku(g: { kanalHesabi: string; kullanici: string; aylikSiparis: string }) {
  const k = sinirOku(g.kanalHesabi), u = sinirOku(g.kullanici), s = sinirOku(g.aylikSiparis);
  if (!k.tamam || !u.tamam || !s.tamam) return null;
  return { kanalHesabi: k.deger, kullanici: u.deger, aylikSiparis: s.deger };
}

/** Hazır paketin sınırları (boş = sınırsız). Firmaya özel pakette sınır firma kartında. */
export async function paketSinirlariniKaydet(
  paketId: string,
  g: { kanalHesabi: string; kullanici: string; aylikSiparis: string },
  yapanId: string,
): Promise<{ durum: "TAMAM" } | { durum: "HATA"; hata: SinirHatasi }> {
  const yeni = sinirlariOku(g);
  if (!yeni) return { durum: "HATA", hata: "SINIR_GECERSIZ" };
  // SISTEM: paket.
  const p = await sistemPrisma.paket.findUnique({ where: { id: paketId }, select: { firmayaOzel: true, kanalHesabiSiniri: true, kullaniciSiniri: true, aylikSiparisSiniri: true } });
  if (!p) return { durum: "HATA", hata: "PAKET_YOK" };
  if (p.firmayaOzel) return { durum: "HATA", hata: "FIRMAYA_OZEL" };
  // SISTEM: sınırlar ve izi aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: paket sınırları.
    sistemPrisma.paket.update({ where: { id: paketId }, data: { kanalHesabiSiniri: yeni.kanalHesabi, kullaniciSiniri: yeni.kullanici, aylikSiparisSiniri: yeni.aylikSiparis } }),
    // SISTEM: iz.
    izKaydi(sistemPrisma, { action: "PAKET_SINIRLARI_DEGISTI", targetType: "Paket", targetId: paketId, userId: yapanId, companyId: null, detail: JSON.stringify({ once: { kanalHesabi: p.kanalHesabiSiniri, kullanici: p.kullaniciSiniri, aylikSiparis: p.aylikSiparisSiniri }, yeni }) }),
  ]);
  return { durum: "TAMAM" };
}

/** Individuel firmanın sınırları (boş = sınırsız). Hazır paketteki firmada sınır paketten gelir. */
export async function firmaSinirlariniKaydet(
  firmaId: string,
  g: { kanalHesabi: string; kullanici: string; aylikSiparis: string },
  yapanId: string,
): Promise<{ durum: "TAMAM" } | { durum: "HATA"; hata: SinirHatasi }> {
  const yeni = sinirlariOku(g);
  if (!yeni) return { durum: "HATA", hata: "SINIR_GECERSIZ" };
  // SISTEM: firma kimliğiyle.
  const f = await sistemPrisma.company.findUnique({ where: { id: firmaId }, select: { sinirKanalHesabi: true, sinirKullanici: true, sinirAylikSiparis: true, paket: { select: { firmayaOzel: true } } } });
  if (!f) return { durum: "HATA", hata: "FIRMA_YOK" };
  if (!f.paket?.firmayaOzel) return { durum: "HATA", hata: "OZEL_DEGIL" };
  // SISTEM: sınırlar ve izi aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: firmanın sınırları.
    sistemPrisma.company.update({ where: { id: firmaId }, data: { sinirKanalHesabi: yeni.kanalHesabi, sinirKullanici: yeni.kullanici, sinirAylikSiparis: yeni.aylikSiparis } }),
    // SISTEM: iz.
    izKaydi(sistemPrisma, { action: "FIRMA_SINIRLARI_DEGISTI", targetType: "Company", targetId: firmaId, userId: yapanId, companyId: null, detail: JSON.stringify({ once: { kanalHesabi: f.sinirKanalHesabi, kullanici: f.sinirKullanici, aylikSiparis: f.sinirAylikSiparis }, yeni }) }),
  ]);
  return { durum: "TAMAM" };
}
