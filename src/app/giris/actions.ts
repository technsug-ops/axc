"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { girisKilidi } from "@/lib/giris-kilidi";
import { yakinBasarisizDenemeler } from "@/lib/giris-kilidi-okuma";
import { izYaz } from "@/lib/iz";
import { oturumAc, oturumKapat } from "@/lib/oturum";
import {
  FIRMA_KODU_CEREZI,
  firmaKodundanDurum,
  firmaKoduNormalle,
  girisRedSebebi,
  uyelikGirisDurumu,
  uyeMi,
  type GirisRedSebebi,
} from "@/lib/oturum-firmasi";

/** Red sebebi → sözlük anahtarı (`Giris`). Hata KODA çevrilir, metne değil. */
const GIRIS_RED_ANAHTARI: Record<GirisRedSebebi, string> = {
  HATALI: "hataliGiris",
  FIRMA_ASKIDA: "firmaAskida",
  UYELIK_PASIF: "uyelikPasif",
  HESAP_KAPALI: "hesapKapali",
};
import { parolaDogrula } from "@/lib/parola";
import { prisma } from "@/lib/prisma";

export type GirisDurumu = { hatalar?: string[] };

/**
 * GİRİŞ.
 *
 * Hata mesajı BİLEREK tek: "firma kodu, e-posta veya parola hatalı".
 * Hangisinin yanlış olduğunu söylemek, sisteme kayıtlı e-postaları ve
 * FİRMA KODLARINI dışarıya sızdırır.
 *
 * FİRMA (K303 4c-1, kullanıcı kararı 04.10.2026): «firma kodu + kullanıcı +
 * şifre girer ve kendi firmasına geçer». Oturum o firmaya bağlanır; firma
 * içinden başka firmaya geçiş YOK.
 *
 * Kullanıcı bulunamasa bile parola doğrulaması ÇALIŞTIRILIR (sahte bir özet
 * üzerinde): aksi hâlde cevap süresi "bu e-posta kayıtlı mı" sorusunu
 * cevaplardı.
 */
const SAHTE_OZET =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function girisYap(
  _oncekiDurum: GirisDurumu,
  formData: FormData,
): Promise<GirisDurumu> {
  const t = await getTranslations("Giris");

  const eposta = String(formData.get("email") ?? "")
    .trim()
    .toLocaleLowerCase("tr");
  const parola = String(formData.get("password") ?? "");
  const firmaKodu = firmaKoduNormalle(String(formData.get("firmaKodu") ?? ""));

  if (!firmaKodu) return { hatalar: [t("firmaKoduZorunlu")] };
  if (!eposta) return { hatalar: [t("epostaZorunlu")] };
  if (!parola) return { hatalar: [t("parolaZorunlu")] };

  /**
   * ⛔ KABA KUVVET KİLİDİ (02.10.2026) — kural `lib/giris-kilidi.ts`te.
   * Aynı e-posta YA DA aynı IP'den son 15 dk'da 5 başarısız deneme varsa
   * parola HİÇ denenmez. IP: Vercel `x-forwarded-for`un ilk değeri.
   */
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "bilinmiyor";
  const simdi = new Date();
  // Okuma firmalar-üstüdür (girişten önce firma yok) — gerekçe gövdede.
  const kilit = girisKilidi(await yakinBasarisizDenemeler(eposta, ip, simdi), simdi);
  if (kilit.kilitli) {
    const dakika = Math.max(1, Math.ceil((kilit.acilis.getTime() - simdi.getTime()) / 60_000));
    return { hatalar: [t("cokFazlaDeneme", { dakika })] };
  }

  const kullanici = await prisma.user.findUnique({
    where: { email: eposta },
    select: { id: true, passwordHash: true, isActive: true },
  });

  const gecti = await parolaDogrula(
    parola,
    kullanici?.passwordHash ?? SAHTE_OZET,
  );
  /** Üyelik sorgusu firma/kullanıcı yoksa da KOŞAR — süre, hangisinin eksik olduğunu söylemesin. */
  const firma = await firmaKodundanDurum(firmaKodu);
  const uyelik = await uyelikGirisDurumu(kullanici?.id ?? "-", firma?.id ?? "-");
  const uye = await uyeMi(kullanici?.id ?? "-", firma?.id ?? "-");
  /**
   * Karar saf gövdede (`girisRedSebebi`, 05.10.2026 kullanıcı bulgusu):
   * askıdaki firma / pasif üyelik / kapalı hesap YALNIZ parola doğru ve kişi
   * o firmanın üyesiyken söylenir; öteki her durum genel mesaj.
   */
  const red = girisRedSebebi({
    kullaniciVar: Boolean(kullanici),
    parolaDogru: gecti,
    kisiAktif: kullanici?.isActive ?? false,
    firma: firma ? { aktif: firma.aktif } : null,
    uyelik,
  });
  const firmaId = firma?.id ?? null;

  // Son kapı `uyeMi` (oturum okumasıyla AYNI ölçüt): karar «geç» dese bile
  // üyelik ölçütü evet demezse oturum açılmaz — iki ölçüt ayrışamaz.
  if (red !== null || !kullanici || !firmaId || !uye) {
    /** İz: kilidin sayacı + «kim deniyor» sorusunun cevabı. Parola YAZILMAZ. */
    await izYaz({
      action: "GIRIS_BASARISIZ",
      targetType: "User",
      targetId: kullanici?.id ?? null,
      userId: null,
      detail: JSON.stringify({ eposta, ip, firmaKodu, sebep: red ?? "HATALI" }),
    });
    return { hatalar: [t(GIRIS_RED_ANAHTARI[red ?? "HATALI"])] };
  }

  await oturumAc(kullanici.id, firmaId);
  /** Bu cihazda son firma kodu hatırlanır (yalnız kod — parola/oturum değil; İlke #9). */
  (await cookies()).set(FIRMA_KODU_CEREZI, firmaKodu, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/giris",
    maxAge: 365 * 24 * 60 * 60,
  });

  const devam = String(formData.get("devam") ?? "");
  // Yalnız kendi sitemize dönülür; dışarıdan gelen adrese yönlendirme
  // açık yönlendirme (open redirect) açığı olurdu.
  redirect(devam.startsWith("/") && !devam.startsWith("//") ? devam : "/");
}

export async function cikisYap() {
  await oturumKapat();
  redirect("/giris");
}
