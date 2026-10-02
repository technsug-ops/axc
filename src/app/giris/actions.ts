"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GIRIS_KILIT_DK, girisKilidi } from "@/lib/giris-kilidi";
import { izYaz } from "@/lib/iz";
import { oturumAc, oturumKapat } from "@/lib/oturum";
import { parolaDogrula } from "@/lib/parola";
import { prisma } from "@/lib/prisma";

export type GirisDurumu = { hatalar?: string[] };

/**
 * GİRİŞ.
 *
 * Hata mesajı BİLEREK tek: "e-posta veya parola hatalı". Hangisinin yanlış
 * olduğunu söylemek, sisteme kayıtlı e-postaları dışarıya sızdırır.
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

  if (!eposta) return { hatalar: [t("epostaZorunlu")] };
  if (!parola) return { hatalar: [t("parolaZorunlu")] };

  /**
   * ⛔ KABA KUVVET KİLİDİ (02.10.2026) — kural `lib/giris-kilidi.ts`te.
   * Aynı e-posta YA DA aynı IP'den son 15 dk'da 5 başarısız deneme varsa
   * parola HİÇ denenmez. IP: Vercel `x-forwarded-for`un ilk değeri.
   */
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "bilinmiyor";
  const simdi = new Date();
  const yakinDenemeler = await prisma.auditLog.findMany({
    where: {
      action: "GIRIS_BASARISIZ",
      createdAt: { gte: new Date(simdi.getTime() - GIRIS_KILIT_DK * 60_000) },
      OR: [
        { detail: { contains: `"eposta":${JSON.stringify(eposta)}` } },
        { detail: { contains: `"ip":${JSON.stringify(ip)}` } },
      ],
    },
    select: { createdAt: true },
  });
  const kilit = girisKilidi(yakinDenemeler.map((d) => d.createdAt), simdi);
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

  if (!kullanici || !kullanici.isActive || !gecti) {
    /** İz: kilidin sayacı + «kim deniyor» sorusunun cevabı. Parola YAZILMAZ. */
    await izYaz({
      action: "GIRIS_BASARISIZ",
      targetType: "User",
      targetId: kullanici?.id ?? null,
      userId: null,
      detail: JSON.stringify({ eposta, ip }),
    });
    return { hatalar: [t("hataliGiris")] };
  }

  await oturumAc(kullanici.id);

  const devam = String(formData.get("devam") ?? "");
  // Yalnız kendi sitemize dönülür; dışarıdan gelen adrese yönlendirme
  // açık yönlendirme (open redirect) açığı olurdu.
  redirect(devam.startsWith("/") && !devam.startsWith("//") ? devam : "/");
}

export async function cikisYap() {
  await oturumKapat();
  redirect("/giris");
}
