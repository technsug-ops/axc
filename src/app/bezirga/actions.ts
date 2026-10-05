"use server";

import { YONETIM_YOLU } from "@/lib/oturum-imza";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { girisKilidi } from "@/lib/giris-kilidi";
import { yakinBasarisizDenemeler } from "@/lib/giris-kilidi-okuma";
import { izYaz } from "@/lib/iz";
import { parolaDogrula, parolaOzetle } from "@/lib/parola";
import { EN_AZ_PAROLA_UZUNLUGU, PAROLA_HATA_ANAHTARI, parolaDegisimiHatasi } from "@/lib/parola-degisimi";
import type { ParolaDurumu } from "@/app/parola-degistir/actions";
import { sistemPrisma } from "@/lib/prisma";
import { superAdminHesabi } from "@/lib/oturum-firmasi";
import { yonetimEylemiParolaEkrani, yonetimOturumuAc, yonetimOturumuKapat } from "@/lib/yonetim-oturumu";

export type YonetimGirisDurumu = { hatalar?: string[] };

/**
 * SELLİORA YÖNETİM GİRİŞİ (K303 4c-2, kullanıcı kararı 04.10.2026) — yalnız
 * e-posta + parola, yalnız SÜPER ADMİN. Firma girişinin kurallarının aynısı:
 * tek hata mesajı (süper admin olmayan biri de aynı mesajı alır — hangi
 * hesabın yönetici olduğu sızmaz), kullanıcı yoksa da parola denenir
 * (süre sızmasın), kaba kuvvet kilidi aynı firmalar-üstü okumadan.
 */
const SAHTE_OZET =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function yonetimGirisYap(
  _onceki: YonetimGirisDurumu,
  formData: FormData,
): Promise<YonetimGirisDurumu> {
  const t = await getTranslations("Yonetim");
  const eposta = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr");
  const parola = String(formData.get("password") ?? "");
  if (!eposta) return { hatalar: [t("epostaZorunlu")] };
  if (!parola) return { hatalar: [t("parolaZorunlu")] };

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "bilinmiyor";
  const simdi = new Date();
  const kilit = girisKilidi(await yakinBasarisizDenemeler(eposta, ip, simdi), simdi);
  if (kilit.kilitli) {
    const dakika = Math.max(1, Math.ceil((kilit.acilis.getTime() - simdi.getTime()) / 60_000));
    return { hatalar: [t("cokFazlaDeneme", { dakika })] };
  }

  // SISTEM: kullanıcı ve süper admin işareti firmalar-üstüdür.
  // Model 2 (05.10.2026): yönetim girişi YALNIZ firmasız süper admin hesabını bulur —
  // aynı e-postayla açılmış bir firma hesabı bu kapıdan giremez.
  const kullanici = await superAdminHesabi(eposta);
  const gecti = await parolaDogrula(parola, kullanici?.passwordHash ?? SAHTE_OZET);

  if (!kullanici || !kullanici.isActive || !kullanici.isSuperAdmin || !gecti) {
    await izYaz({
      action: "GIRIS_BASARISIZ",
      targetType: "User",
      targetId: kullanici?.id ?? null,
      userId: null,
      detail: JSON.stringify({ eposta, ip, kapi: "yonetim" }),
    });
    return { hatalar: [t("hataliGiris")] };
  }

  await yonetimOturumuAc(kullanici.id);
  await izYaz({ action: "YONETIM_GIRIS", targetType: "User", targetId: kullanici.id, userId: kullanici.id, detail: JSON.stringify({ ip }) });
  // Parolası değişmeli ise doğrudan parola ekranı (kapı da yönlendirirdi; bir adım az).
  redirect(kullanici.mustChangePassword ? `${YONETIM_YOLU}/parola` : `${YONETIM_YOLU}/firmalar`);
}

export async function yonetimCikisYap() {
  await yonetimOturumuKapat();
  redirect(YONETIM_YOLU);
}

/**
 * YÖNETİM PAROLA DEĞİŞİMİ (05.10.2026, kullanıcı kararı «süper admin ilk
 * girişte parolasını değiştirsin»). Kural firma tarafıyla ORTAK gövdeden;
 * başarıda yönetim çerezi SİLİNİR (layout tazelensin — K319-② dersi) ve
 * giriş ekranı «parolanız değişti» der.
 */
export async function yonetimParolamiDegistir(_onceki: ParolaDurumu, formData: FormData): Promise<ParolaDurumu> {
  const tp = await getTranslations("ParolaDegistir");
  const k = await yonetimEylemiParolaEkrani();
  if (!k) return { hatalar: [tp("oturumYok")] };
  // SISTEM: parola kişiye aittir (firmalar-üstü).
  const kayit = await sistemPrisma.user.findUnique({ where: { id: k.id }, select: { passwordHash: true } });
  if (!kayit) return { hatalar: [tp("oturumYok")] };
  const girdi = {
    eski: String(formData.get("eski") ?? ""),
    yeni: String(formData.get("yeni") ?? ""),
    tekrar: String(formData.get("tekrar") ?? ""),
  };
  const hata = await parolaDegisimiHatasi(girdi, kayit.passwordHash);
  if (hata) return { hatalar: [tp(PAROLA_HATA_ANAHTARI[hata], { uzunluk: EN_AZ_PAROLA_UZUNLUGU })] };
  try {
    // SISTEM: parola + zorunluluk + oturum sürümü kişiye aittir.
    await sistemPrisma.user.update({
      where: { id: k.id },
      data: { passwordHash: await parolaOzetle(girdi.yeni), mustChangePassword: false, sessionVersion: { increment: 1 } },
    });
  } catch (e) {
    console.error("[yonetim parola] beklenmeyen hata:", e);
    return { hatalar: [tp("kaydedilemedi")] };
  }
  await izYaz({ action: "YONETIM_PAROLA_DEGISTI", targetType: "User", targetId: k.id, userId: k.id, detail: null });
  await yonetimOturumuKapat();
  redirect(`${YONETIM_YOLU}?parola=degisti`);
}
