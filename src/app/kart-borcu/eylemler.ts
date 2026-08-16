"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import {
  faizGecerliMi,
  faizTutari,
  odemeOnizlemesi,
  type FaizGirdisi,
} from "@/lib/kart-odeme/hesap";
import {
  FAIZ_KATEGORI_ONERISI,
  type OdemeGirdisi,
  type OdemeSonucu,
} from "@/lib/kart-odeme/kategori";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  KART EKSTRE ÖDEMESİ — SUNUCU EYLEMLERİ
 * ----------------------------------------------------------------------------
 *  HESAP BURADA YAPILMAZ. Tutarlar `lib/kart-odeme/hesap.ts`ten geliyor;
 *  bu dosya yalnız izin, doğrulama ve YAZMA yapar. Hesabı buraya kopyalasaydık
 *  önizleme ile kayıt birbirinden sapabilir ve kullanıcı gördüğünden başkasını
 *  kaydetmiş olurdu.
 *
 *  YETKİ: kart ödemesi bir PARA işlemidir — `satis.kar.gor` + `kart.gor`.
 *  Operasyon rolü göremez, giremez.
 * ============================================================================
 */

/**
 * Faiz giderinin yazılabileceği kategoriler — AKTİF OLANLARIN HEPSİ.
 *
 * Tek bir ada bağlı DEĞİL: kullanıcı seçer. Önerilen ad varsa form onu
 * ön-seçili getirir. Kategori eklemek için ekran olmadığı için tek ada
 * bağlamak kullanıcıyı çıkmaza sokuyordu (16.08.2026 bulgusu).
 */
export async function faizKategorileri(): Promise<
  { id: string; ad: string; onerilenMi: boolean }[]
> {
  const kayitlar = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return kayitlar.map((k) => ({
    id: k.id,
    ad: k.name,
    onerilenMi: k.name === FAIZ_KATEGORI_ONERISI,
  }));
}

/**
 * ÖDEME KAYDI — TEK TRANSACTION.
 *
 * Faiz gideri ve ödeme kaydı BİRLİKTE yazılır ya da hiçbiri yazılmaz. Ayrı
 * yazılsaydı yarım kalan bir hâl mümkün olurdu: gider var, ödemesi yok
 * (ya da tersi) — ve defter yalan söylerdi.
 */
export async function odemeKaydet(girdi: OdemeGirdisi): Promise<OdemeSonucu> {
  await yetkiIste("satis.kar.gor");
  await yetkiIste("kart.gor");
  const t = await getTranslations("KartOdeme");

  if (!faizGecerliMi(girdi.faiz)) return { tamam: false, hata: t("faizGecersiz") };

  const donem = new Date(girdi.donem);
  const odemeTarihi = new Date(girdi.odemeTarihi);
  if (Number.isNaN(donem.getTime()) || Number.isNaN(odemeTarihi.getTime())) {
    return { tamam: false, hata: t("tarihGecersiz") };
  }

  const kart = await prisma.creditCard.findUnique({
    where: { id: girdi.cardId },
    select: { id: true, currency: true },
  });
  if (!kart) return { tamam: false, hata: t("kartYok") };

  const faiz = faizTutari(girdi.faiz);
  /**
   * FAİZ VAR AMA KATEGORİ SEÇİLMEMİŞ: sessizce kategorisiz gider yazmak
   * yerine işlemi durduruyoruz. Form zaten seçtiriyor; bu ikinci kapı.
   * Seçilen kategorinin GERÇEKTEN var ve aktif olduğu da doğrulanıyor —
   * arayüzden gelen kimliğe güvenilmez.
   */
  let kategoriId: string | null = null;
  if (faiz > 0) {
    if (!girdi.faizKategoriId) return { tamam: false, hata: t("kategoriSec") };
    const kategori = await prisma.expenseCategory.findFirst({
      where: { id: girdi.faizKategoriId, isActive: true },
      select: { id: true },
    });
    if (!kategori) return { tamam: false, hata: t("kategoriYok") };
    kategoriId = kategori.id;
  }

  await prisma.$transaction(async (tx) => {
    let faizGiderId: string | null = null;
    if (faiz > 0 && kategoriId) {
      const gider = await tx.expense.create({
        data: {
          spentAt: odemeTarihi,
          categoryId: kategoriId,
          amount: faiz,
          currency: kart.currency,
          // Gecikme faizi KDV'siz bir finansman gideridir.
          vatRate: 0,
          description: t("giderNotu", { donem: girdi.donem.slice(0, 10) }),
        },
        select: { id: true },
      });
      faizGiderId = gider.id;
    }

    await tx.kartOdeme.create({
      data: {
        cardId: kart.id,
        donem,
        ekstreBorcu: girdi.ekstreBorcu,
        odenenAnaBorc: girdi.odenenAnaBorc,
        odemeTarihi,
        faizOrani: girdi.faiz.yol === "hesapla" ? girdi.faiz.oran : null,
        faizGun: girdi.faiz.yol === "hesapla" ? girdi.faiz.gun : null,
        faizTutar: faiz,
        currency: kart.currency,
        faizGiderId,
        kaynak: "TURETILEN",
      },
    });
  });

  revalidatePath("/kart-borcu");
  revalidatePath("/giderler");
  return { tamam: true };
}

/**
 * TERS KAYIT — düzeltmenin TEK yolu, silme YOK.
 *
 * Asıl kaydın tutarları ters işaretle yeni bir satıra yazılır; ikisi de
 * defterde kalır. FAİZ DE TERSLENİR (eksi tutarlı gider), yoksa yanlış
 * kaydın gideri dönem kârını kalıcı olarak eksik bırakır.
 */
export async function odemeTersAl(odemeId: string): Promise<OdemeSonucu> {
  await yetkiIste("satis.kar.gor");
  await yetkiIste("kart.gor");
  const t = await getTranslations("KartOdeme");

  const asil = await prisma.kartOdeme.findUnique({
    where: { id: odemeId },
    select: {
      id: true,
      cardId: true,
      donem: true,
      ekstreBorcu: true,
      odenenAnaBorc: true,
      faizTutar: true,
      currency: true,
      isReversal: true,
      reversedBy: { select: { id: true } },
      faizGider: { select: { categoryId: true } },
    },
  });
  if (!asil) return { tamam: false, hata: t("odemeYok") };
  if (asil.isReversal) return { tamam: false, hata: t("zatenTers") };
  if (asil.reversedBy) return { tamam: false, hata: t("zatenTersAlinmis") };

  const sayi = (d: { toString(): string }) => Number(d.toString());
  const faiz = sayi(asil.faizTutar);

  await prisma.$transaction(async (tx) => {
    let faizGiderId: string | null = null;
    if (faiz !== 0 && asil.faizGider) {
      const gider = await tx.expense.create({
        data: {
          spentAt: new Date(),
          categoryId: asil.faizGider.categoryId,
          amount: -faiz,
          currency: asil.currency,
          vatRate: 0,
          description: t("tersGiderNotu"),
        },
        select: { id: true },
      });
      faizGiderId = gider.id;
    }

    await tx.kartOdeme.create({
      data: {
        cardId: asil.cardId,
        donem: asil.donem,
        // Ekstre borcu SNAPSHOT: hangi borç üzerinden ters alındığı görülsün.
        ekstreBorcu: asil.ekstreBorcu,
        odenenAnaBorc: -sayi(asil.odenenAnaBorc),
        odemeTarihi: new Date(),
        faizTutar: -faiz,
        currency: asil.currency,
        faizGiderId,
        kaynak: "TURETILEN",
        isReversal: true,
        reversesId: asil.id,
      },
    });
  });

  revalidatePath("/kart-borcu");
  revalidatePath("/giderler");
  return { tamam: true };
}

/**
 * ÖNİZLEME — kaydetmeden önce ne olacağı.
 *
 * Sunucuda hesaplanıyor ki ekranda ikinci bir hesap doğmasın. Ekran bu
 * nesneyi olduğu gibi basar.
 */
export async function odemeOnizle(girdi: {
  cardId: string;
  donem: string;
  ekstreBorcu: number;
  odenenAnaBorc: number;
  faiz: FaizGirdisi;
}) {
  await yetkiIste("satis.kar.gor");
  await yetkiIste("kart.gor");

  const mevcut = await prisma.kartOdeme.findMany({
    where: { cardId: girdi.cardId, donem: new Date(girdi.donem) },
    select: { odenenAnaBorc: true },
  });

  return odemeOnizlemesi({
    ekstreBorcu: girdi.ekstreBorcu,
    odenenAnaBorc: girdi.odenenAnaBorc,
    faiz: girdi.faiz,
    mevcutKayitlar: mevcut.map((m) => ({
      odenenAnaBorc: Number(m.odenenAnaBorc.toString()),
    })),
  });
}
