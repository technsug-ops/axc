import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { UYARI_GUNU } from "@/lib/panel/tarife-penceresi";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

import { Yukleyici } from "./yukleyici";

/**
 * ============================================================================
 *  KOMİSYON TARİFESİ YÜKLEME (K47)
 * ----------------------------------------------------------------------------
 *  ⚠ BU EKRAN, PANELDEKİ UYARI SATIRININ ÖN ŞARTIYDI. Panel "tarife
 *  penceresi bitiyor" diyecekti ama tarife tablolarına giden tek yol
 *  terminaldeki `npm run canli:tarife-yukle` idi: uyarı, kullanıcının
 *  YAPAMAYACAĞI bir işi hatırlatacaktı. Anayasa bunu adıyla anıyor —
 *  "kural doğru mu değil, kural teslim edilebilir mi".
 *
 *  ⚠ BETİK KALDIRILMADI. Aynı gövdeyi çağırıyorlar (`tarifeYaz`); betik
 *  toplu/otomatik koşum için duruyor, ekran haftalık rutin için.
 *
 *  YETKİ: `kanalsku.yaz` — komisyon verisi yazan mevcut izin. YENİ İZİN
 *  AÇILMADI; açsaydık `izinler.ts` + `seed-yetki.ts → SONRADAN_DOGAN` +
 *  canlı senkron gerekirdi ve unutulan tek satır ekranı görünmez yapardı.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("tarife") };
}

export default async function TarifeSayfasi() {
  await sayfaIzni("kanalsku.yaz");
  const t = await getTranslations("Tarife");

  const [hesaplar, tarifeler] = await Promise.all([
    prisma.channelAccount.findMany({
      where: { satisIcin: true, isActive: true },
      select: { id: true, name: true, channel: { select: { name: true } } },
      orderBy: [{ channel: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.komisyonTarifesi.findMany({
      select: {
        id: true,
        pencereBaslangic: true,
        pencereBitis: true,
        channelAccount: {
          select: { name: true, channel: { select: { name: true } } },
        },
        _count: { select: { kalemler: true } },
      },
      orderBy: { pencereBaslangic: "desc" },
      /**
       * ⚠ SON 10 — İlke #13: özet ekranda döküm olmaz. Pencere sayısı
       * haftada bir artıyor; sınırsız listelenseydi bir yıl sonra sayfa
       * 52 satırla açılırdı.
       */
      take: 10,
    }),
  ]);

  const bugun = gunDegeri(isTakvimGunu(new Date()));
  const gun = 86_400_000;

  return (
    <div className="max-w-3xl space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Yukleyici
            hesaplar={hesaplar.map((h) => ({
              id: h.id,
              etiket: `${h.channel.name} — ${h.name}`,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("kapsamBaslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* AÇIK SIFIR: liste boşsa satır gizlenmez, NEDEN boş olduğu yazar. */}
          {tarifeler.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("kapsamYok")}</p>
          ) : (
            tarifeler.map((x) => {
              const bitis = gunDegeri(isTakvimGunu(x.pencereBitis));
              /** ⚠ BİTİŞ GÜNÜ DAHİL — `21–25.08` ise 25.08 hâlâ kapsanıyor. */
              const kalan = Math.round(
                (bitis.getTime() - bugun.getTime()) / gun,
              );
              return (
                <div
                  key={x.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                >
                  <span className="tabular-nums">
                    {t("kapsamSatir", {
                      kanal: x.channelAccount?.channel.name ?? "—",
                      baslangic: x.pencereBaslangic
                        .toISOString()
                        .slice(0, 10),
                      bitis: x.pencereBitis.toISOString().slice(0, 10),
                      kalem: x._count.kalemler,
                    })}
                  </span>
                  {kalan < 0 ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("bitti")}
                    </Badge>
                  ) : kalan === 0 ? (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                      {t("sonGun")}
                    </Badge>
                  ) : kalan <= UYARI_GUNU ? (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                      {t("kalanGun", { gun: kalan })}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t("guncel")}</Badge>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
