"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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

  const kullanici = await prisma.user.findUnique({
    where: { email: eposta },
    select: { id: true, passwordHash: true, isActive: true },
  });

  const gecti = await parolaDogrula(
    parola,
    kullanici?.passwordHash ?? SAHTE_OZET,
  );

  if (!kullanici || !kullanici.isActive || !gecti) {
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
