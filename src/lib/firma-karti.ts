import { firmaKurulumDurumu, geciciParolaUret, type KurulumDurumu } from "@/lib/firma-acilisi";
import { parolaOzetle } from "@/lib/parola";
import { sistemPrisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  FİRMA KARTI — süper admin paneli ① (K303, 05.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 05.10.2026: dört bölüm — kimlik (ad düzenlenir) ·
 *  kullanıcılar (parola sıfırla) · kayıt sayıları (yalnız ADET) · firma
 *  ayarları (salt okunur).
 *
 *  ⛔ TİCARİ VERİ YOK. 04.10 kararı «süper admin müşteri firmanın ticari
 *  ekranlarını görmez» (05.10'da dışa aktarma için yeniden soruldu ve
 *  KORUNDU). Kart tutar/kâr/fiyat okumaz; kayıt sayısı bir HACİM ölçüsüdür.
 *
 *  ⚠ «PASİFE AL» İLK SÜRÜMDE BİLEREK YOKTU: aktiflik KİŞİDEYDİ
 *  (`User.isActive`) ve firma kartından pasife almak kişiyi BÜTÜN
 *  firmalarında kapatırdı. ✅ ÇÖZÜLDÜ 05.10.2026 (kullanıcı kararı):
 *  `UserCompanyRole.isActive` eklendi; kart YALNIZ bu firmadaki üyeliği
 *  değiştirir (`lib/kullanici-uyeligi.ts`, firma ekranıyla aynı gövde).
 *
 *  ⚠ «SON GİRİŞ» KİŞİNİN, FİRMANIN DEĞİL. `User.lastLoginAt` hangi firmaya
 *  girildiğini tutmaz. Birden çok firmada üye olan kişide ekran bunu YAZAR
 *  (`uyelikSayisi`) — vekil alan firmaya ait bir tarih gibi gösterilmez.
 *
 *  SISTEM: bu dosyanın bütün sorguları firmalar-üstüdür (yönetim katmanı
 *  firma bağlamı taşımaz); firma, her sorguda `companyId` ile AÇIKÇA süzülür.
 * ============================================================================
 */

export type KartKullanicisi = {
  id: string;
  ad: string | null;
  eposta: string;
  rol: string;
  /** Bu firmadaki ÜYELİK aktif mi (pasife alma firma bazında). */
  aktif: boolean;
  /** Kişi kaydı tamamen kapalı mı (`User.isActive`) — firma kartı bunu değiştirmez. */
  hesapKapali: boolean;
  sonGiris: Date | null;
  parolaDegismeli: boolean;
  /** Kişinin üye olduğu firma sayısı — 1'den büyükse «son giriş» firmaya özgü değildir. */
  uyelikSayisi: number;
};

export type FirmaKarti = {
  id: string;
  ad: string;
  kod: string;
  aktif: boolean;
  acilis: Date;
  kurulum: KurulumDurumu;
  kullanicilar: KartKullanicisi[];
  sayilar: {
    urun: number;
    varyant: number;
    satis: number;
    alim: number;
    iade: number;
    kanalHesabi: number;
    kullanici: number;
  };
  /** Askı süreci alanları (05.10.2026) — durum sayfada `askiDurumu` ile hesaplanır. */
  aski: {
    uyariSonGun: Date | null;
    uyariSebebi: string | null;
    askiSebebi: string | null;
    aciklama: string | null;
  };
  ayarlar: {
    maliyetYontemi: string;
    lotKipi: string;
    finansmanCokBirim: boolean;
  };
};

/** Firma kartının verisi — firma yoksa null. */
export async function firmaKarti(firmaId: string): Promise<FirmaKarti | null> {
  // SISTEM: yönetim katmanı — firma kimliğiyle açıkça süzülür.
  const f = await sistemPrisma.company.findUnique({
    where: { id: firmaId },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      createdAt: true,
      maliyetYontemi: true,
      lotKipi: true,
      finansmanCokBirim: true,
      uyariSonGun: true,
      uyariSebebi: true,
      askiSebebi: true,
      askiAciklama: true,
      _count: {
        select: {
          productListesi: true,
          productVariantListesi: true,
          saleListesi: true,
          purchaseListesi: true,
          returnListesi: true,
          channelAccountListesi: true,
          uyelikler: true,
        },
      },
      uyelikler: {
        select: {
          isActive: true,
          role: { select: { name: true } },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              lastLoginAt: true,
              mustChangePassword: true,
              _count: { select: { userCompanyRoles: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!f) return null;

  return {
    id: f.id,
    ad: f.name,
    kod: f.code,
    aktif: f.isActive,
    acilis: f.createdAt,
    kurulum: await firmaKurulumDurumu(f.id),
    kullanicilar: f.uyelikler.map((u) => ({
      id: u.user.id,
      ad: u.user.name,
      eposta: u.user.email,
      rol: u.role.name,
      aktif: u.isActive,
      hesapKapali: !u.user.isActive,
      sonGiris: u.user.lastLoginAt,
      parolaDegismeli: u.user.mustChangePassword,
      uyelikSayisi: u.user._count.userCompanyRoles,
    })),
    sayilar: {
      urun: f._count.productListesi,
      varyant: f._count.productVariantListesi,
      satis: f._count.saleListesi,
      alim: f._count.purchaseListesi,
      iade: f._count.returnListesi,
      kanalHesabi: f._count.channelAccountListesi,
      kullanici: f._count.uyelikler,
    },
    aski: { uyariSonGun: f.uyariSonGun, uyariSebebi: f.uyariSebebi, askiSebebi: f.askiSebebi, aciklama: f.askiAciklama },
    ayarlar: {
      maliyetYontemi: f.maliyetYontemi,
      lotKipi: f.lotKipi,
      finansmanCokBirim: f.finansmanCokBirim,
    },
  };
}

export type FirmaAdiHatasi = "AD_BOS" | "FIRMA_YOK";

/**
 * Saf — adı temizler ve sınar. Ölçüt firma açılışıyla AYNI (`acilisGirdisiniSina`:
 * kenar boşlukları kırpılır, boş ad reddedilir); iki yerde iki kural olmaz.
 */
export function firmaAdiniSina(ham: string): { durum: "TAMAM"; ad: string } | { durum: "HATA"; hata: FirmaAdiHatasi } {
  const ad = ham.trim();
  if (!ad) return { durum: "HATA", hata: "AD_BOS" };
  return { durum: "TAMAM", ad };
}

/**
 * Firma adını değiştirir; eski ve yeni ad aynı işlemde ize yazılır.
 * Ad VERİDİR (anayasa: firma adı yapıya gömülmez) — kod değişmez, çünkü
 * kullanıcılar girişte kodu yazıyor ve cihazları onu hatırlıyor.
 */
export async function firmaAdiniDegistir(
  firmaId: string,
  hamAd: string,
  yapanId: string,
): Promise<{ durum: "TAMAM"; degisti: boolean } | { durum: "HATA"; hata: FirmaAdiHatasi }> {
  const s = firmaAdiniSina(hamAd);
  if (s.durum === "HATA") return s;
  // SISTEM: yönetim katmanı — firma kimliğiyle.
  const f = await sistemPrisma.company.findUnique({ where: { id: firmaId }, select: { name: true } });
  if (!f) return { durum: "HATA", hata: "FIRMA_YOK" };
  if (f.name === s.ad) return { durum: "TAMAM", degisti: false };
  // SISTEM: ad ve izi aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: yönetim katmanı firmanın adını yazar.
    sistemPrisma.company.update({ where: { id: firmaId }, data: { name: s.ad } }),
    // SISTEM: iz firmalar-üstü (companyId null), hedef firma targetId'de.
    sistemPrisma.auditLog.create({
      data: {
        action: "FIRMA_ADI_DEGISTI",
        targetType: "Company",
        targetId: firmaId,
        userId: yapanId,
        companyId: null,
        detail: JSON.stringify({ eski: f.name, yeni: s.ad }),
      },
    }),
  ]);
  return { durum: "TAMAM", degisti: true };
}

export type ParolaSifirlamaHatasi = "UYE_DEGIL" | "SUPER_ADMIN";

/**
 * Bir firma kullanıcısının parolasını sıfırlar: GEÇİCİ parola üretilir,
 * kullanıcı ilk girişte değiştirmek zorundadır, açık oturumları düşer.
 *
 * ⚠ KİŞİ O FİRMANIN ÜYESİ OLMALI. Kart adresindeki firma kimliğiyle başka
 * bir firmanın kişisine dokunulamaz — sorgu üyeliği (kişi + firma) arar.
 * ⚠ SÜPER ADMİNE DOKUNULMAZ. Yönetim katmanının kendi hesabı bir firma
 * kartından sıfırlanamaz (kendini kilitleme + yetki yükseltme yolu olurdu).
 * ⚠ Parola KİŞİNİNDİR: kişi başka firmalarda da üyeyse yeni parola orada da
 * geçerlidir. Bu bir kusur değil, kimliğin tanımı — ekran bunu söyler.
 * ⚠ Geçici parola işlem BAŞARIYLA bittikten SONRA döner (firma açılışıyla
 * aynı kural): işlem düşerse ekranda geçersiz bir parola görünmez.
 */
export async function firmaKullanicisininParolasiniSifirla(
  firmaId: string,
  kullaniciId: string,
  yapanId: string,
): Promise<{ durum: "TAMAM"; geciciParola: string; eposta: string } | { durum: "HATA"; hata: ParolaSifirlamaHatasi }> {
  // SISTEM: üyelik kişi + firma çiftiyle aranır — başka firmanın kişisi bulunmaz.
  const uyelik = await sistemPrisma.userCompanyRole.findUnique({
    where: { userId_companyId: { userId: kullaniciId, companyId: firmaId } },
    select: { user: { select: { email: true, isSuperAdmin: true } } },
  });
  if (!uyelik) return { durum: "HATA", hata: "UYE_DEGIL" };
  if (uyelik.user.isSuperAdmin) return { durum: "HATA", hata: "SUPER_ADMIN" };

  const geciciParola = geciciParolaUret();
  const ozet = await parolaOzetle(geciciParola);
  // SISTEM: parola ve izi aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: parola kişiye aittir (firmalar-üstü).
    sistemPrisma.user.update({
      where: { id: kullaniciId },
      data: { passwordHash: ozet, mustChangePassword: true, sessionVersion: { increment: 1 } },
    }),
    // SISTEM: iz firmalar-üstü; hangi firmanın kartından yapıldığı detayda.
    sistemPrisma.auditLog.create({
      data: {
        action: "YONETIM_PAROLA_SIFIRLADI",
        targetType: "User",
        targetId: kullaniciId,
        userId: yapanId,
        companyId: null,
        detail: JSON.stringify({ firmaId }),
      },
    }),
  ]);
  return { durum: "TAMAM", geciciParola, eposta: uyelik.user.email };
}
