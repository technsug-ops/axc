import { coz, sifrele, sirOku } from "@/lib/kanal-anahtari/sifre";
import { parolaDogrula, parolaOzetle } from "@/lib/parola";
import { sistemPrisma } from "@/lib/prisma";
import { UYGULAMA } from "@/lib/uygulama";

import { base32Coz, dogrula, otpauthAdresi, yedekKodNormal, yeniAnahtar, yeniYedekKod } from "./totp";

/**
 * ============================================================================
 *  İKİ ADIMLI GİRİŞ DEPOSU — süper admin (K303 ⑤, kullanıcı kararı 06.10.2026)
 * ----------------------------------------------------------------------------
 *  Gizli anahtar AES-256-GCM ile şifreli (`IKI_ADIM_SIRRI`, pazaryeri anahtar
 *  sırrından AYRI — biri sızarsa öteki açılmaz). Yedek kodlar yalnız ÖZET.
 *
 *  ⚠ TEKRAR KORUMASI VERİTABANINDA: kabul edilen adım `updateMany` koşuluyla
 *  yazılır (`totpSonAdim < adım`) — aynı kodla aynı anda gelen iki istekten
 *  YALNIZ BİRİ geçer. Yedek kod da `kullanildiAt: null` koşuluyla düşer.
 *  ⚠ Hiçbir dönüş anahtarı ya da kodu dışarı taşımaz (kurulum ekranı hariç:
 *  kullanıcının uygulamasına eklemesi için ANAHTAR bir kez gösterilir).
 *
 *  SISTEM: kullanıcı kaydı firmalar-üstüdür (süper admin firmasızdır).
 * ============================================================================
 */

export const IKI_ADIM_SIR_DEGISKENI = "IKI_ADIM_SIRRI";
export const YEDEK_KOD_SAYISI = 10;
// Doğrulama uygulamasında görünen ad — uygulama adı tek sabitten (`UYGULAMA.ad`).
const SORUMLU = UYGULAMA.ad;

function sir() {
  return sirOku(process.env[IKI_ADIM_SIR_DEGISKENI]);
}

export type IkiAdimDurumu = "YOK" | "KURULUMDA" | "ACIK";

export async function ikiAdimDurumu(userId: string): Promise<IkiAdimDurumu> {
  // SISTEM: kişi kaydı.
  const u = await sistemPrisma.user.findUnique({ where: { id: userId }, select: { totpSifreli: true, totpAcildiAt: true } });
  if (!u?.totpSifreli) return "YOK";
  return u.totpAcildiAt ? "ACIK" : "KURULUMDA";
}

export type KurulumHatasi = "SIR_YOK" | "SIR_GECERSIZ" | "ZATEN_ACIK" | "KULLANICI_YOK" | "COZULEMEDI";

/**
 * Kurulum anahtarı — bekleyen varsa onu (sayfa yenilense de aynı QR), yoksa yeni
 * üretip ŞİFRELİ yazar. Açık iki adımda yeni anahtar ÜRETİLMEZ (sıfırlama ayrı yol).
 */
export async function kurulumAnahtari(userId: string, hesapEtiketi: string): Promise<{ durum: "TAMAM"; anahtar: string; otpauth: string } | { durum: "HATA"; hata: KurulumHatasi }> {
  const s = sir();
  if (s.durum !== "TAMAM") return { durum: "HATA", hata: s.durum };
  // SISTEM: kişi kaydı.
  const u = await sistemPrisma.user.findUnique({ where: { id: userId }, select: { totpSifreli: true, totpAcildiAt: true } });
  if (!u) return { durum: "HATA", hata: "KULLANICI_YOK" };
  if (u.totpAcildiAt) return { durum: "HATA", hata: "ZATEN_ACIK" };
  let anahtar: string;
  if (u.totpSifreli) {
    const c = coz(u.totpSifreli, s.sir);
    if (c.durum !== "TAMAM") return { durum: "HATA", hata: "COZULEMEDI" };
    anahtar = c.duz;
  } else {
    anahtar = yeniAnahtar();
    // SISTEM: bekleyen (açılmamış) anahtar — şifreli.
    await sistemPrisma.user.update({ where: { id: userId }, data: { totpSifreli: sifrele(anahtar, s.sir), totpAcildiAt: null, totpSonAdim: null } });
  }
  return { durum: "TAMAM", anahtar, otpauth: otpauthAdresi(SORUMLU, hesapEtiketi, anahtar) };
}

export type KodHatasi = "SIR_YOK" | "SIR_GECERSIZ" | "COZULEMEDI" | "KURULUM_YOK" | "ZATEN_ACIK" | "ACIK_DEGIL" | "BICIM" | "YANLIS" | "TEKRAR";

async function anahtariAc(userId: string): Promise<{ durum: "TAMAM"; anahtar: Buffer; acik: boolean; sonAdim: number | null } | { durum: "HATA"; hata: KodHatasi }> {
  const s = sir();
  if (s.durum !== "TAMAM") return { durum: "HATA", hata: s.durum };
  // SISTEM: kişi kaydı.
  const u = await sistemPrisma.user.findUnique({ where: { id: userId }, select: { totpSifreli: true, totpAcildiAt: true, totpSonAdim: true } });
  if (!u?.totpSifreli) return { durum: "HATA", hata: "KURULUM_YOK" };
  const c = coz(u.totpSifreli, s.sir);
  if (c.durum !== "TAMAM") return { durum: "HATA", hata: "COZULEMEDI" };
  const b = base32Coz(c.duz);
  if (!b) return { durum: "HATA", hata: "COZULEMEDI" };
  return { durum: "TAMAM", anahtar: b, acik: Boolean(u.totpAcildiAt), sonAdim: u.totpSonAdim };
}

/** Kurulumu ilk kodla tamamlar; 10 yedek kod üretir ve BİR KEZ döndürür (özetleri saklanır). */
export async function kurulumuTamamla(userId: string, kod: string, an: Date = new Date()): Promise<{ durum: "TAMAM"; yedekKodlar: string[] } | { durum: "HATA"; hata: KodHatasi }> {
  const a = await anahtariAc(userId);
  if (a.durum !== "TAMAM") return a;
  if (a.acik) return { durum: "HATA", hata: "ZATEN_ACIK" };
  const d = dogrula(a.anahtar, kod, an, null);
  if (!d.gecer) return { durum: "HATA", hata: d.sebep };
  const kodlar = Array.from({ length: YEDEK_KOD_SAYISI }, () => yeniYedekKod());
  const ozetler = await Promise.all(kodlar.map((k) => parolaOzetle(yedekKodNormal(k))));
  // SISTEM: açılış + yedek kodlar aynı işlemde; eski kodlar silinir.
  await sistemPrisma.$transaction([
    // SISTEM: kişi kaydı — açılış.
    sistemPrisma.user.update({ where: { id: userId }, data: { totpAcildiAt: an, totpSonAdim: d.adim } }),
    // SISTEM: eski yedek kodlar.
    sistemPrisma.ikiAdimYedekKodu.deleteMany({ where: { userId } }),
    // SISTEM: yeni yedek kodlar (yalnız özet).
    sistemPrisma.ikiAdimYedekKodu.createMany({ data: ozetler.map((ozet) => ({ userId, ozet })) }),
  ]);
  return { durum: "TAMAM", yedekKodlar: kodlar };
}

/**
 * Giriş doğrulaması: 6 hane → TOTP (tekrar korumalı, atomik); başka biçim →
 * yedek kod (tek kullanımlık, atomik). Hangi yoldan geçtiği döner (iz için).
 */
export async function girisDogrula(userId: string, kod: string, an: Date = new Date()): Promise<{ durum: "TAMAM"; yol: "TOTP" | "YEDEK"; kalanYedek: number } | { durum: "HATA"; hata: KodHatasi }> {
  const a = await anahtariAc(userId);
  if (a.durum !== "TAMAM") return a;
  if (!a.acik) return { durum: "HATA", hata: "ACIK_DEGIL" };
  const temiz = kod.replace(/\s/g, "");
  if (/^\d{6}$/.test(temiz)) {
    const d = dogrula(a.anahtar, temiz, an, a.sonAdim);
    if (!d.gecer) return { durum: "HATA", hata: d.sebep };
    // SISTEM: atomik tekrar koruması — yalnız daha eski adım kayıtlıysa yazılır.
    const r = await sistemPrisma.user.updateMany({ where: { id: userId, OR: [{ totpSonAdim: null }, { totpSonAdim: { lt: d.adim } }] }, data: { totpSonAdim: d.adim } });
    if (r.count !== 1) return { durum: "HATA", hata: "TEKRAR" };
    return { durum: "TAMAM", yol: "TOTP", kalanYedek: await kalanYedekSayisi(userId) };
  }
  const normal = yedekKodNormal(temiz);
  if (!/^[A-Z0-9]{10}$/.test(normal)) return { durum: "HATA", hata: "BICIM" };
  // SISTEM: kullanılmamış yedek kodlar (özet).
  const adaylar = await sistemPrisma.ikiAdimYedekKodu.findMany({ where: { userId, kullanildiAt: null }, select: { id: true, ozet: true } });
  for (const y of adaylar) {
    if (await parolaDogrula(normal, y.ozet)) {
      // SISTEM: atomik — aynı kod iki kez düşmez.
      const r = await sistemPrisma.ikiAdimYedekKodu.updateMany({ where: { id: y.id, kullanildiAt: null }, data: { kullanildiAt: an } });
      if (r.count !== 1) return { durum: "HATA", hata: "TEKRAR" };
      return { durum: "TAMAM", yol: "YEDEK", kalanYedek: await kalanYedekSayisi(userId) };
    }
  }
  return { durum: "HATA", hata: "YANLIS" };
}

export async function kalanYedekSayisi(userId: string): Promise<number> {
  // SISTEM: kişinin kullanılmamış yedek kodları.
  return sistemPrisma.ikiAdimYedekKodu.count({ where: { userId, kullanildiAt: null } });
}

/** SON ÇARE (sunucu erişimi olan kişi): iki adımı sıfırlar — sonraki girişte yeniden kurulum. */
export async function ikiAdimiSifirla(userId: string): Promise<void> {
  // SISTEM: kişi kaydı + yedek kodlar aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: anahtar ve açılış silinir.
    sistemPrisma.user.update({ where: { id: userId }, data: { totpSifreli: null, totpAcildiAt: null, totpSonAdim: null } }),
    // SISTEM: yedek kodlar silinir.
    sistemPrisma.ikiAdimYedekKodu.deleteMany({ where: { userId } }),
  ]);
}
