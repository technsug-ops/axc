import { pencereOlustur } from "@/lib/donem";
import { sistemPrisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  PAKET ADET SINIRLARI (K303 ②, kullanıcı kararı 06.10.2026)
 * ----------------------------------------------------------------------------
 *  Üç sınır: kanal hesabı · kullanıcı · aylık sipariş. `null` = sınırsız.
 *  Hazır pakette sınır PAKETTEN, firmaya özel (Individuel) pakette FİRMADAN
 *  okunur. Paketsiz firma → sınırsız DEĞİL, sıfır (bekçi paketsiz firmayı
 *  zaten kırmızı yakar; burada açık kapı bırakılmaz).
 *
 *  ⚠ İKİ DAVRANIŞ, BİLEREK:
 *  · kanal hesabı + kullanıcı → SERT: yeni ekleme / yeniden açma DURUR, mevcut
 *    olan silinmez, pasife alınmaz.
 *  · aylık sipariş → YUMUŞAK: satış YİNE girer (gerçekten satılmış mal deftere
 *    girmezse stok ve kâr bozulur — «fiziksel gerçek kaydı ezer» ilkesi);
 *    firmaya şerit + süper admine rozet.
 *
 *  ⚠ SAYAN TEK YER BURASI: ekrandaki «2/2» ile kapının saydığı aynı gövdeden
 *  gelir (anayasa: «sayı = liste»; iki yerde iki ölçüt olmaz).
 *
 *  SISTEM: sorgular firma kimliğiyle AÇIKÇA süzülür (süper admin de okur).
 * ============================================================================
 */

export const SINIR_TURLERI = ["kanalHesabi", "kullanici", "aylikSiparis"] as const;
export type SinirTuru = (typeof SINIR_TURLERI)[number];
export type Sinirlar = Record<SinirTuru, number | null>;
export type Kullanim = Record<SinirTuru, number>;

/** Saf — eklenebilir mi (sert sınır). Sınırsızda hep evet. */
export function eklenebilirMi(kullanim: number, sinir: number | null): boolean {
  return sinir === null || kullanim < sinir;
}

export type SinirDurumu = "SINIRSIZ" | "ALTINDA" | "DOLU" | "ASILDI";

/** Saf — kullanımın sınıra göre durumu. */
export function sinirDurumu(kullanim: number, sinir: number | null): SinirDurumu {
  if (sinir === null) return "SINIRSIZ";
  if (kullanim > sinir) return "ASILDI";
  if (kullanim === sinir) return "DOLU";
  return "ALTINDA";
}

/** Saf — form girdisi: boş → sınırsız (null), aksi hâlde 0 ya da pozitif tam sayı. */
export function sinirOku(ham: string): { tamam: true; deger: number | null } | { tamam: false } {
  const s = ham.trim();
  if (s === "") return { tamam: true, deger: null };
  if (!/^\d{1,7}$/.test(s)) return { tamam: false };
  return { tamam: true, deger: Number(s) };
}

/** Firmanın geçerli sınırları. */
export async function firmaSinirlari(firmaId: string): Promise<Sinirlar> {
  // SISTEM: firma kimliğiyle — paket ve firmaya özel sınırlar.
  const f = await sistemPrisma.company.findUnique({
    where: { id: firmaId },
    select: {
      sinirKanalHesabi: true,
      sinirKullanici: true,
      sinirAylikSiparis: true,
      paket: { select: { firmayaOzel: true, kanalHesabiSiniri: true, kullaniciSiniri: true, aylikSiparisSiniri: true } },
    },
  });
  if (!f?.paket) return { kanalHesabi: 0, kullanici: 0, aylikSiparis: 0 };
  if (f.paket.firmayaOzel) return { kanalHesabi: f.sinirKanalHesabi, kullanici: f.sinirKullanici, aylikSiparis: f.sinirAylikSiparis };
  return { kanalHesabi: f.paket.kanalHesabiSiniri, kullanici: f.paket.kullaniciSiniri, aylikSiparis: f.paket.aylikSiparisSiniri };
}

/**
 * Firmanın bugünkü kullanımı:
 * · kanal hesabı = AKTİF + SATIŞ hesabı (alış hesabı tedarikçi kataloğudur, sayılmaz)
 * · kullanıcı = AKTİF üyelik
 * · aylık sipariş = bu İstanbul ayı (`BU_AY` penceresi, rapor ile aynı) iptal edilmemiş satış
 */
export async function firmaKullanimi(firmaId: string, an: Date = new Date()): Promise<Kullanim> {
  const ay = pencereOlustur("BU_AY", an);
  const [kanalHesabi, kullanici, aylikSiparis] = await Promise.all([
    // SISTEM: firma kimliğiyle.
    sistemPrisma.channelAccount.count({ where: { companyId: firmaId, isActive: true, satisIcin: true } }),
    // SISTEM: firma kimliğiyle.
    sistemPrisma.userCompanyRole.count({ where: { companyId: firmaId, isActive: true } }),
    // SISTEM: firma kimliğiyle.
    sistemPrisma.sale.count({ where: { companyId: firmaId, iptalTarihi: null, soldAt: { gte: ay.baslangic, lt: ay.bitisHaric } } }),
  ]);
  return { kanalHesabi, kullanici, aylikSiparis };
}

/** Sert kapı — eylemler çağırır. `artis`: işlem kullanımı kaç artırır (genelde 1). */
export async function sertSinirKapisi(firmaId: string, tur: "kanalHesabi" | "kullanici", artis = 1): Promise<{ gecer: true } | { gecer: false; kullanim: number; sinir: number }> {
  const [s, k] = await Promise.all([firmaSinirlari(firmaId), firmaKullanimi(firmaId)]);
  const sinir = s[tur];
  if (sinir === null || k[tur] + artis <= sinir) return { gecer: true };
  return { gecer: false, kullanim: k[tur], sinir };
}
