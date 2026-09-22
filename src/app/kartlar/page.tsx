/**
 * SUTUN TAVANI ISTISNASI: 8 — govdede 6 rozet/ikon — sutunlarin cogu kisa deger tasiyor, sekizle sigmasi olasi; piksel genisligi OLCULMEDI. K43 · gercek cihazda bakilacak 01.09.2026.
 *
 * Tavan (7) UC metin agirlikli ekranin icerik genisligine gore olculmustu;
 * bu ekran o kumenin disinda. Istisna SAYIYLA birlikte okunuyor: sutun
 * eklenirse beyan bayatlar ve bekci kirmizi yanar.
 */
import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Eye, Pencil, Landmark, Plus } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { SatirKarti, SatirListesi } from "@/components/satir-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";

import { kartDurumDegistir } from "./actions";

/**
 * VERİTABANI OKUYAN SAYFA — HER İSTEKTE ÇİZİLİR.
 *
 * Statik kipte Next bu sayfayı DERLEME ANINDA üretmeye çalışır ve o sırada
 * veritabanına bağlanması gerekir. Derlemenin veritabanına bağımlı olması
 * kırılgandır (Vercel yapı makinesi uzak MySQL'e erişemeyebilir) ve zaten
 * bir ERP'de liste ekranı canlı veri göstermelidir.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("kartlar") };
}

export default async function KartlarSayfasi() {
  await sayfaIzni("kart.gor");

  const kartlar = await prisma.creditCard.findMany({
    include: { _count: { select: { purchases: true } } },
    orderBy: [{ isActive: "desc" }, { label: "asc" }],
  });

  const bicim = await bicimlendirici();
  const t = await getTranslations("Kart");
  const tBorc = await getTranslations("KartBorcu");
  const ortak = await getTranslations("Ortak");

  function limitMetni(kart: (typeof kartlar)[number]) {
    return kart.creditLimitAmount
      ? bicim.para(
          kart.creditLimitAmount,
          kart.creditLimitCurrency ?? kart.currency,
        )
      : "—";
  }

  function gunlerMetni(kart: (typeof kartlar)[number]) {
    const kesim = kart.statementDay ?? "—";
    const odeme = kart.dueDay ?? "—";
    return `${kesim} / ${odeme}`;
  }

  function eylemler(kart: (typeof kartlar)[number]) {
    return (
      <>
        <SatirEylemi href={`/kartlar/${kart.id}`} ikon={Eye} etiket={ortak("detay")} />
        <SatirEylemi href={`/kartlar/${kart.id}/duzenle`} ikon={Pencil} etiket={ortak("duzenle")} />
        <DurumDegistirButonu
          kayitId={kart.id}
          aktifMi={kart.isActive}
          action={kartDurumDegistir}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("sayi", { sayi: kartlar.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/kart-borcu">
              <Landmark />
              {tBorc("borcDokumu")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/kartlar/yeni">
              <Plus />
              {t("yeniKart")}
            </Link>
          </Button>
        </div>
      </div>

      {kartlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("bosBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("bosIpucu")}</p>
        </div>
      ) : (
        /*
         * SATIR KARTI (K235-②, 22.09.2026): 8 sütunluk tablo + telefon kartı
         * ikilisi TEK listeye indi. Kart bir KİMLİKTİR (etiket + banka +
         * son 4); kesim/ödeme, limit ve alım sayısı bağlam satırında akar —
         * yan yana karşılaştırılacak sütunlar değil.
         */
        <SatirListesi>
          {kartlar.map((kart) => (
            <SatirKarti
              key={kart.id}
              baslik={<Baglanti href={`/kartlar/${kart.id}`}>{kart.label}</Baglanti>}
              baglam={[
                kart.bankName,
                <KopyalanabilirKod key="son4" deger={kart.last4} etiket={t("son4Hane")} />,
                kart.holderName,
                `${t("kesimOdeme")}: ${gunlerMetni(kart)}`,
                `${ortak("limit")}: ${limitMetni(kart)}`,
                `${t("alimSayisi")}: ${kart._count.purchases}`,
              ]}
              sag={
                <>
                  {kart.isActive ? (
                    <Badge variant="secondary">{ortak("aktif")}</Badge>
                  ) : (
                    <Badge variant="outline">{ortak("pasif")}</Badge>
                  )}
                  <SatirEylemleri>{eylemler(kart)}</SatirEylemleri>
                </>
              }
            />
          ))}
        </SatirListesi>
      )}
    </div>
  );
}
