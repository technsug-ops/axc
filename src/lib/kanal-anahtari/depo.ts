import { denemeOrtamiMi } from "@/lib/deneme-ortami";
import { izKaydi } from "@/lib/iz";
import { prisma } from "@/lib/prisma";

import { desteklenenKanalMi, kimligiAc, kimlikKur, kimlikMetni, type KanalKimligi, type KimlikHatasi } from "./kimlik";
import { coz, sifrele, sirOku, sonDort } from "./sifre";

/**
 * ============================================================================
 *  KANAL ANAHTARI DEPOSU — firma başına pazaryeri API anahtarı (K303, 06.10.2026)
 * ----------------------------------------------------------------------------
 *  Bütün okuma/yazma FİRMA SÜZGEÇLİ `prisma` ile — çağıran firma bağlamında
 *  koşar (sunucu eylemi · zamanlanmış işin firma döngüsü). Başka firmanın
 *  hesabı bu süzgeçte `null` döner: anahtar ne yazılabilir ne okunabilir.
 *
 *  ⚠ DÜZ ANAHTAR: yalnız `kimligiOku` dönüşünde, bellekte. Hiçbir ize, log'a,
 *  hata metnine yazılmaz; iz yalnız «kanal · hesap · son 4 hane» taşır.
 *  ⚠ DENEME ORTAMI: `kimligiOku` kimlik VERMEZ (dış çağrı yapılmasın — K303
 *  deneme kurulumu şartı). Saklama/şifreleme/ayrım denemede de çalışır.
 * ============================================================================
 */

export type KayitHatasi = "HESAP_YOK" | "SATIS_HESABI_DEGIL" | "SIR_YOK" | "SIR_GECERSIZ" | KimlikHatasi["hata"];

/** Satış hesabına anahtar yazar (varsa değiştirir). Anahtar ŞİFRELİ gider. */
export async function anahtarKaydet(
  channelAccountId: string,
  ham: Record<string, string | undefined>,
  yapanId: string,
): Promise<{ durum: "TAMAM"; sonDort: string; yeni: boolean } | { durum: "HATA"; hata: KayitHatasi; alanlar?: string[] }> {
  const hesap = await prisma.channelAccount.findUnique({
    where: { id: channelAccountId },
    select: { id: true, name: true, satisIcin: true, companyId: true, channel: { select: { code: true } }, apiAnahtari: { select: { id: true } } },
  });
  // Firmasız (eski) hesap anahtar alamaz: anahtar firmaya bağlı yaşar.
  if (!hesap || !hesap.companyId) return { durum: "HATA", hata: "HESAP_YOK" };
  if (!hesap.satisIcin) return { durum: "HATA", hata: "SATIS_HESABI_DEGIL" };
  const kanal = hesap.channel.code;
  if (!desteklenenKanalMi(kanal)) return { durum: "HATA", hata: "KANAL_DESTEKLENMIYOR" };
  const k = kimlikKur(kanal, ham);
  if (k.durum === "HATA") return { durum: "HATA", hata: k.hata, alanlar: "alanlar" in k ? k.alanlar : undefined };
  const sir = sirOku();
  if (sir.durum !== "TAMAM") return { durum: "HATA", hata: sir.durum };
  const paket = sifrele(kimlikMetni(k.kimlik), sir.sir);
  const son = sonDort(k.gizli);
  await prisma.$transaction([
    prisma.kanalAnahtari.upsert({
      where: { channelAccountId },
      // companyId hesabın firmasıdır; süzgeç bağlamdaki firmayla AYNI olduğunu ayrıca denetler.
      create: { companyId: hesap.companyId, channelAccountId, sifreli: paket, sonDort: son },
      update: { sifreli: paket, sonDort: son, sonDenemeAt: null, sonDenemeBasarili: null, sonHata: null },
    }),
    izKaydi(prisma, {
        action: hesap.apiAnahtari ? "KANAL_ANAHTARI_DEGISTI" : "KANAL_ANAHTARI_KAYDEDILDI",
        targetType: "ChannelAccount",
        targetId: channelAccountId,
        userId: yapanId,
        // Yalnız tanıma bilgisi — anahtarın kendisi ASLA.
        detail: JSON.stringify({ kanal, hesap: hesap.name, sonDort: son }),
      }),
  ]);
  return { durum: "TAMAM", sonDort: son, yeni: !hesap.apiAnahtari };
}

/** Anahtarı kaldırır (iz bırakır). Hesap ve kayıtları yerinde kalır. */
export async function anahtarKaldir(channelAccountId: string, yapanId: string): Promise<{ durum: "TAMAM" } | { durum: "HATA"; hata: "ANAHTAR_YOK" }> {
  const a = await prisma.kanalAnahtari.findUnique({ where: { channelAccountId }, select: { id: true, sonDort: true } });
  if (!a) return { durum: "HATA", hata: "ANAHTAR_YOK" };
  await prisma.$transaction([
    prisma.kanalAnahtari.delete({ where: { id: a.id } }),
    izKaydi(prisma, { action: "KANAL_ANAHTARI_KALDIRILDI", targetType: "ChannelAccount", targetId: channelAccountId, userId: yapanId, detail: JSON.stringify({ sonDort: a.sonDort }) }),
  ]);
  return { durum: "TAMAM" };
}

/** Ekran için durum — anahtarın kendisi DEĞİL, yalnız «bağlı mı · son 4 · son deneme». */
export async function anahtarDurumlari(): Promise<Map<string, { sonDort: string; kayit: Date; sonDenemeAt: Date | null; sonDenemeBasarili: boolean | null; sonHata: string | null }>> {
  const l = await prisma.kanalAnahtari.findMany({ select: { channelAccountId: true, sonDort: true, updatedAt: true, sonDenemeAt: true, sonDenemeBasarili: true, sonHata: true } });
  return new Map(l.map((a) => [a.channelAccountId, { sonDort: a.sonDort, kayit: a.updatedAt, sonDenemeAt: a.sonDenemeAt, sonDenemeBasarili: a.sonDenemeBasarili, sonHata: a.sonHata }]));
}

export type OkumaSonucu = { durum: "TAMAM"; kimlik: KanalKimligi } | { durum: "DENEME_ORTAMI" | "ANAHTAR_YOK" | "SIR_YOK" | "SIR_GECERSIZ" | "COZULEMEDI" | "KANAL_DESTEKLENMIYOR" };

/**
 * Kayıtlı anahtarı açar (deneme kapısı YOK — bekçi ve iç sınama içindir).
 * Uygulama `kimligiOku` kullanır.
 */
export async function kayitliKimligiAc(channelAccountId: string): Promise<Exclude<OkumaSonucu, { durum: "DENEME_ORTAMI" }>> {
  const a = await prisma.kanalAnahtari.findUnique({ where: { channelAccountId }, select: { sifreli: true, channelAccount: { select: { channel: { select: { code: true } } } } } });
  if (!a) return { durum: "ANAHTAR_YOK" };
  const kanal = a.channelAccount.channel.code;
  if (!desteklenenKanalMi(kanal)) return { durum: "KANAL_DESTEKLENMIYOR" };
  const sir = sirOku();
  if (sir.durum !== "TAMAM") return { durum: sir.durum };
  const c = coz(a.sifreli, sir.sir);
  if (c.durum !== "TAMAM") return { durum: "COZULEMEDI" };
  const k = kimligiAc(kanal, c.duz);
  return k ? { durum: "TAMAM", kimlik: k } : { durum: "COZULEMEDI" };
}

/** Uygulamanın okuma kapısı — deneme ortamında kimlik VERMEZ (dış çağrı yapılmaz). */
export async function kimligiOku(channelAccountId: string): Promise<OkumaSonucu> {
  if (denemeOrtamiMi()) return { durum: "DENEME_ORTAMI" };
  return kayitliKimligiAc(channelAccountId);
}
