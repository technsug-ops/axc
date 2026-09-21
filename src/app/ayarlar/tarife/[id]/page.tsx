import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

import { Ayna, type AynaSatiri } from "./ayna";

/**
 * ============================================================================
 *  TARİFE AYNASI — PAZARYERİ GÖRÜNÜMÜ + BİZİM NET'İMİZ (K230, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  KULLANICI İSTEĞİ: _"Aynı şekilde pazaryerini taklit eden arayüz
 *  oluşturabilir misin?"_ — ve kararı: **ayna + bizim NET kârımız**.
 *
 *  ⛔ NİYE SADECE AYNA DEĞİL. Pazaryeri paneli _"fiyatı 1.621'e düşür,
 *  komisyon %6 olsun"_ diyor ve bunu bilerek cazip gösteriyor. Ama senin
 *  MALİYETİNİ bilmiyor. Gerçek ölçüm (Stanley French Press, N11, kargo ₺110):
 *
 *      fiyat 4.174,00  komisyon %16     NET-2  800,78   ← bugünkü
 *      fiyat 3.026,14  komisyon %3,81   NET-2  333,38
 *      fiyat 2.933,17  komisyon %3,31   NET-2  273,41
 *      fiyat 2.840,20  komisyon %3      NET-2  208,16
 *
 *  Komisyon %16'dan %3'e düşerken NET adet başına **₺592 eriyor**. Komisyon
 *  oranı tek başına bir karar rakamı DEĞİLDİR; bu ekranın varlık sebebi
 *  o sütunu eklemek.
 *
 *  ⚠ NET SATIR AÇILINCA HESAPLANIR, LİSTEDE DEĞİL. Maliyet her ürün için
 *  ayrı sorgu ister (`urunZemini`); 44 satırda listeyi ağırlaştırırdı.
 *  Liste = panelin aynası (tek sorgu), NET = baktığın ürün.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("tarifeAynasi") };
}

export default async function TarifeAynasiSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaIzni("kanalsku.yaz");
  const { id } = await params;

  const t = await getTranslations("TarifeAynasi");
  const bicim = await bicimlendirici();

  const tarife = await prisma.komisyonTarifesi.findUnique({
    where: { id },
    select: {
      pencereBaslangic: true,
      pencereBitis: true,
      channelAccount: {
        select: { name: true, channel: { select: { name: true, code: true } } },
      },
      kalemler: {
        select: {
          barkod: true,
          urunAdi: true,
          dilimSirasi: true,
          altLimit: true,
          ustLimit: true,
          oran: true,
          variantId: true,
        },
        orderBy: [{ barkod: "asc" }, { dilimSirasi: "asc" }],
      },
    },
  });

  /**
   * ⛔ BULUNAMAYAN TARİFE 404 — "boş ekran" değil. Adres elle değiştirilmiş
   * ya da kayıt silinmiş olabilir; boş bir tablo göstermek "bu tarifede ürün
   * yok" diye okunurdu.
   */
  if (!tarife) notFound();

  const gruplar = new Map<string, AynaSatiri>();
  for (const k of tarife.kalemler) {
    const mevcut = gruplar.get(k.barkod);
    const dilim = {
      sira: k.dilimSirasi,
      alt: k.altLimit === null ? null : Number(k.altLimit),
      ust: k.ustLimit === null ? null : Number(k.ustLimit),
      oran: Number(k.oran),
    };
    if (mevcut) {
      mevcut.dilimler.push(dilim);
    } else {
      gruplar.set(k.barkod, {
        kod: k.barkod,
        urunAdi: k.urunAdi,
        katalogda: k.variantId !== null,
        dilimler: [dilim],
      });
    }
  }

  const satirlar = [...gruplar.values()];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("baslik", {
            kanal: tarife.channelAccount?.channel.name ?? "—",
          })}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("pencere", {
            baslangic: bicim.tarih(tarife.pencereBaslangic),
            bitis: bicim.tarih(tarife.pencereBitis),
            urun: satirlar.length,
          })}
        </p>
      </div>

      <Ayna
        satirlar={satirlar}
        kanalKodu={tarife.channelAccount?.channel.code ?? ""}
      />
    </div>
  );
}
