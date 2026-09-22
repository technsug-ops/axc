import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Baglanti } from "@/components/baglanti";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
import { bicimlendirici } from "@/lib/bicim";
import { aynaSatirlariniSuz, guncelPencereSec } from "@/lib/komisyon/pencere-secimi";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";
import { Ayna, type AynaSatiri } from "@/app/ayarlar/tarife/[id]/ayna";

export const dynamic = "force-dynamic";

/**
 * ============================================================================
 *  TARİFE HESAPLAMA — /tarife (K234, 22.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği: "Fiyatlandırma ve Analiz" grubunda dört ekran; biri
 *  tarife aynası. Ayna `…/ayarlar/tarife/[id]` adresindeydi — menüye kayıt
 *  numarası gömülemez. Bu sayfa:
 *   · adreste `pencere` yoksa EN GÜNCEL pencereyi açar (saf gövde:
 *     `guncelPencereSec`), üstte pencere seçici;
 *   · `q` ile barkod / ürün adı araması (Halil #6) — ortak kod kutusu,
 *     kamera dahil (İlke #7);
 *   · gövde AYNI `Ayna` bileşeni (`[id]/ayna.tsx`) — iki ekran iki kopya
 *     değil; eski adres buraya yönlendirir.
 *  İzin `tarife.gor` (OKUMA): aynanın eski kapısı `kanalsku.yaz` bir YAZMA
 *  izniydi; salt okuma ekranı okuma izniyle açılır.
 * ============================================================================
 */

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("tarifeAynasi") };
}

export default async function TarifeHesaplamaSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ pencere?: string; q?: string }>;
}) {
  await sayfaIzni("tarife.gor");
  const sp = await searchParams;
  const t = await getTranslations("TarifeAynasi");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const pencereler = await prisma.komisyonTarifesi.findMany({
    select: {
      id: true,
      pencereBaslangic: true,
      pencereBitis: true,
      yuklendiAt: true,
      channelAccount: {
        select: { name: true, channel: { select: { name: true, code: true } } },
      },
    },
    orderBy: [{ pencereBaslangic: "desc" }, { yuklendiAt: "desc" }],
  });

  const secim = guncelPencereSec(pencereler, sp.pencere);
  /** Adresteki kimlik yoksa 404 — "en yakın pencere" sessizce AÇILMAZ. */
  if (secim.durum === "BULUNAMADI") notFound();

  if (secim.durum === "BOS") {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold">{t("baslik", { kanal: "—" })}</h1>
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("bosBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("bosIpucu")}</p>
          <p className="mt-3 text-sm">
            <Baglanti href="/ayarlar/komisyon">{t("yuklemeyeGit")}</Baglanti>
          </p>
        </div>
      </div>
    );
  }

  const tarife = secim.pencere;
  const kalemler = await prisma.komisyonTarifeKalemi.findMany({
    where: { tarifeId: tarife.id },
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
  });

  const gruplar = new Map<string, AynaSatiri>();
  for (const k of kalemler) {
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
  const sorgu = (sp.q ?? "").trim();
  const suzulmus = aynaSatirlariniSuz(satirlar, sorgu);

  /**
   * Pencere seçici: seçili değer adreste olmasa bile ÇÖZÜLEN pencere
   * gösterilir — "Tümü" gibi durup en günceli açmak, hangi pencereye
   * bakıldığını gizlerdi (İlke #5).
   */
  const pencereEtiketi = (p: (typeof pencereler)[number]) =>
    `${p.channelAccount?.channel.name ?? "—"} · ${bicim.tarih(p.pencereBaslangic)} – ${bicim.tarih(p.pencereBitis)}`;
  const suzgecler: SuzgecTanimi[] = [
    {
      ad: "pencere",
      etiket: t("pencereSecici"),
      secenekler: pencereler.map((p) => ({ deger: p.id, etiket: pencereEtiketi(p) })),
    },
  ];
  const mevcut = { ...sp, pencere: tarife.id };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("baslik", { kanal: tarife.channelAccount?.channel.name ?? "—" })}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("pencere", {
            baslangic: bicim.tarih(tarife.pencereBaslangic),
            bitis: bicim.tarih(tarife.pencereBitis),
            urun: satirlar.length,
          })}
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <SuzgecCubugu temelAdres="/tarife" mevcut={mevcut} suzgecler={suzgecler} />
        <KodAramaKutusu
          temelAdres="/tarife"
          baslangic={sorgu}
          tasinanlar={{ pencere: tarife.id }}
          ipucu={t("aramaIpucu")}
        />
      </div>

      {sorgu ? (
        <p className="text-sm font-medium">{t("aramaSonucu", { sayi: suzulmus.length, q: sorgu })}</p>
      ) : null}

      {suzulmus.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">{t("urunYok")}</p>
          {sorgu ? (
            <p className="mt-2 text-sm">
              <Link href={`/tarife?pencere=${encodeURIComponent(tarife.id)}`} className="underline underline-offset-4">
                {ortak("temizle")}
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <Ayna satirlar={suzulmus} kanalKodu={tarife.channelAccount?.channel.code ?? ""} />
      )}
    </div>
  );
}
