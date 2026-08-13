"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type KanalHesabiDurumu = {
  hatalar?: string[];
  basari?: string;
};

/** Şema, mesajlar çözüldükten sonra kurulur (getTranslations istek kapsamlı). */
function hesapSemasi(m: {
  kanalSecilmeli: string;
  kodZorunlu: string;
  kodCokUzun: string;
  adZorunlu: string;
  adCokUzun: string;
  paraBirimiGecersiz: string;
  rolZorunlu: string;
}) {
  return z.object({
    /**
     * ROL ZORUNLU, VARSAYILANI YOK. Bir hesap ya mal ALDIĞINIZ hesaptır ya
     * mal SATTIĞINIZ mağaza — "ikisi de" normal bir durum değildir
     * (kullanıcı kararı 12.08.2026). Varsayılan konsaydı kullanıcı hiç
     * bakmadan yanlış rolde hesap açardı.
     */
    rol: z.enum(["ALIS", "SATIS"], { message: m.rolZorunlu }),
    channelId: z.string().trim().min(1, m.kanalSecilmeli),
    code: z.string().trim().min(1, m.kodZorunlu).max(191, m.kodCokUzun),
    name: z.string().trim().min(1, m.adZorunlu).max(191, m.adCokUzun),
    externalId: z.string().trim().max(191),
    defaultCurrency: z.enum(["TRY", "EUR"], {
      message: m.paraBirimiGecersiz,
    }),
  });
}

/** Hesap listesini okuyan tüm ekranlar tazelenir. */
function tazele() {
  revalidatePath("/ayarlar/kanallar");
  // Bu formlar hesap listesini rolüne göre süzüyor; tazelenmezse rol
  // değişikliği listelerde görünmez.
  revalidatePath("/alimlar/yeni");
  revalidatePath("/satislar/yeni");
  revalidatePath("/kanal-sku");
  revalidatePath("/hakedis/yukle");
}

export async function kanalHesabiEkle(
  _oncekiDurum: KanalHesabiDurumu,
  formData: FormData,
): Promise<KanalHesabiDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("KanalHesabi");

  const sema = hesapSemasi({
    kanalSecilmeli: t("kanalSecilmeli"),
    kodZorunlu: t("kodZorunlu"),
    kodCokUzun: t("kodCokUzun"),
    adZorunlu: t("adZorunlu"),
    adCokUzun: t("adCokUzun"),
    paraBirimiGecersiz: t("paraBirimiGecersiz"),
    rolZorunlu: t("rolZorunlu"),
  });

  const sonuc = sema.safeParse({
    rol: String(formData.get("rol") ?? ""),
    channelId: String(formData.get("channelId") ?? ""),
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    externalId: String(formData.get("externalId") ?? ""),
    defaultCurrency: String(formData.get("defaultCurrency") ?? ""),
  });

  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }

  const { channelId, code, name, externalId, defaultCurrency } = sonuc.data;

  const kanal = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!kanal) {
    return { hatalar: [t("kanalBulunamadi")] };
  }

  // Kod, kanal içinde benzersiz (şemadaki @@unique([channelId, code])).
  const mevcut = await prisma.channelAccount.findFirst({
    where: { channelId, code },
  });
  if (mevcut) {
    return {
      hatalar: [t("kodZatenVar", { kanal: kanal.name, kod: code })],
    };
  }

  try {
    await prisma.channelAccount.create({
      data: {
        channelId,
        code,
        name,
        externalId: externalId || null,
        defaultCurrency,
        // Tek seçim: XOR. Şemada iki bayrak var ama form ikisini birden
        // açmaz — çift rol yalnız geçmiş kayıtlarda görülebilir.
        alisIcin: sonuc.data.rol === "ALIS",
        satisIcin: sonuc.data.rol === "SATIS",
      },
    });
  } catch (e) {
    console.error("[kanal hesabi] beklenmeyen hata:", e);
    return { hatalar: [t("eklenemedi")] };
  }

  tazele();
  return { basari: t("eklendi", { kanal: kanal.name, ad: name }) };
}

/**
 * ============================================================================
 *  ROL DEĞİŞTİRME — KAYDI OLAN ROL KALDIRILAMAZ
 * ----------------------------------------------------------------------------
 *  Bir hesabın alım kaydı varken "artık satış hesabı" demek, o alımları
 *  ait olmadıkları bir role bırakmaktır. Ekranlar role göre süzüldüğü için
 *  o alımlar hiçbir formda görünmez hâle gelirdi — sessiz veri kaybı.
 *
 *  Bu yüzden kaldırma REDDEDİLİR ve NEDENİ söylenir: kaç kayıt engelliyor.
 *  Kullanıcı önce kayıtları doğru hesaba taşır.
 * ============================================================================
 */
export async function kanalHesabiRolDegistir(
  _oncekiDurum: KanalHesabiDurumu,
  formData: FormData,
): Promise<KanalHesabiDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("KanalHesabi");

  const id = String(formData.get("id") ?? "");
  const rol = String(formData.get("rol") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };
  if (rol !== "ALIS" && rol !== "SATIS") {
    return { hatalar: [t("rolZorunlu")] };
  }

  const hesap = await prisma.channelAccount.findUnique({
    where: { id },
    include: { _count: { select: { purchases: true, sales: true } } },
  });
  if (!hesap) return { hatalar: [t("bulunamadi")] };

  // Kaldırılmak istenen rolde kayıt var mı?
  if (rol === "SATIS" && hesap._count.purchases > 0) {
    return {
      hatalar: [t("rolKaldirilamazAlim", { sayi: hesap._count.purchases })],
    };
  }
  if (rol === "ALIS" && hesap._count.sales > 0) {
    return {
      hatalar: [t("rolKaldirilamazSatis", { sayi: hesap._count.sales })],
    };
  }

  await prisma.channelAccount.update({
    where: { id },
    data: { alisIcin: rol === "ALIS", satisIcin: rol === "SATIS" },
  });

  tazele();
  return {
    basari: t("rolDegisti", {
      ad: hesap.name,
      rol: rol === "ALIS" ? t("rolAlis") : t("rolSatis"),
    }),
  };
}

/** Vade ayarı — YALNIZ satış hesabında anlamlı. */
export async function kanalHesabiVadeGuncelle(
  _oncekiDurum: KanalHesabiDurumu,
  formData: FormData,
): Promise<KanalHesabiDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("KanalHesabi");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const hesap = await prisma.channelAccount.findUnique({ where: { id } });
  if (!hesap) return { hatalar: [t("bulunamadi")] };
  if (!hesap.satisIcin) return { hatalar: [t("vadeYalnizSatis")] };

  const ham = String(formData.get("payoutDays") ?? "").trim();
  const gun = ham === "" ? null : Number(ham);
  if (gun !== null && (!Number.isInteger(gun) || gun < 0 || gun > 365)) {
    return { hatalar: [t("vadeGecersiz")] };
  }

  await prisma.channelAccount.update({
    where: { id },
    data: {
      payoutDays: gun,
      payoutDaysAreBusinessDays: formData.get("isGunu") === "1",
    },
  });

  tazele();
  return { basari: t("vadeGuncellendi", { ad: hesap.name }) };
}

/**
 * ============================================================================
 *  HESAP SİLME — YALNIZ HİÇ KULLANILMAMIŞSA
 * ----------------------------------------------------------------------------
 *  Kapattığınız bir pazaryeri hesabını sistemden de kaldırabilmek gerekiyor
 *  (kullanıcı isteği 12.08.2026). Ama silme, kaydı olan hesapta GEÇMİŞİ
 *  bozar: alımlar, satışlar, hakediş kalemleri o hesaba bağlıdır.
 *
 *  KURAL: hiç kaydı olmayan hesap SİLİNİR; kaydı olan hesap PASİFE ALINIR.
 *  Reddetme sessiz değildir — hangi kayıt türünden kaç tane olduğu yazar,
 *  kullanıcı neyin engellediğini görür.
 *
 *  Pasif hesap: hiçbir formda çıkmaz ama geçmiş kayıtlarında görünmeye
 *  devam eder. Kapanmış hesabın doğru karşılığı budur.
 * ============================================================================
 */
export async function kanalHesabiSil(
  _oncekiDurum: KanalHesabiDurumu,
  formData: FormData,
): Promise<KanalHesabiDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("KanalHesabi");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const hesap = await prisma.channelAccount.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          purchases: true,
          sales: true,
          channelSkus: true,
          settlementItems: true,
          settlements: true,
        },
      },
    },
  });
  if (!hesap) return { hatalar: [t("bulunamadi")] };

  const c = hesap._count;
  const engeller: string[] = [];
  if (c.purchases > 0) engeller.push(t("silEngelAlim", { sayi: c.purchases }));
  if (c.sales > 0) engeller.push(t("silEngelSatis", { sayi: c.sales }));
  if (c.channelSkus > 0)
    engeller.push(t("silEngelKanalSku", { sayi: c.channelSkus }));
  if (c.settlementItems > 0 || c.settlements > 0)
    engeller.push(
      t("silEngelHakedis", { sayi: c.settlementItems + c.settlements }),
    );

  if (engeller.length > 0) {
    return { hatalar: [t("silinemez", { engeller: engeller.join(" · ") })] };
  }

  await prisma.channelAccount.delete({ where: { id } });

  tazele();
  return { basari: t("silindi", { ad: hesap.name }) };
}

/** Hesap silinmez; alımlarla ilişkili olabilir. Sadece aktif/pasif yapılır. */
export async function kanalHesabiDurumDegistir(
  _oncekiDurum: KanalHesabiDurumu,
  formData: FormData,
): Promise<KanalHesabiDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("KanalHesabi");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const hesap = await prisma.channelAccount.findUnique({ where: { id } });
  if (!hesap) return { hatalar: [t("bulunamadi")] };

  await prisma.channelAccount.update({
    where: { id },
    data: { isActive: !hesap.isActive },
  });

  tazele();
  return {
    basari: hesap.isActive
      ? t("pasifeAlindi", { ad: hesap.name })
      : t("aktiflestirildi", { ad: hesap.name }),
  };
}
