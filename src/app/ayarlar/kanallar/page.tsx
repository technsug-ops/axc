/**
 * SUTUN TAVANI ISTISNASI: 8 — 8. sutun BOS baslikli eylem sutunu (ikon), yani metin genisligi tasimiyor; piksel genisligi OLCULMEDI. K43 · gercek cihazda bakilacak 01.09.2026.
 *
 * Tavan (7) UC metin agirlikli ekranin icerik genisligine gore olculmustu;
 * bu ekran o kumenin disinda. Istisna SAYIYLA birlikte okunuyor: sutun
 * eklenirse beyan bayatlar ve bekci kirmizi yanar.
 */
import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
import { TriangleAlert } from "lucide-react";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

import { kanalHesabiDurumDegistir } from "./actions";
import { KanalHesabiFormu } from "./kanal-hesabi-formu";
import { RolSecici } from "./rol-secici";
import { HesapSilButonu } from "./sil-butonu";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

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
  return { title: tBaslik("kanalHesaplari") };
}

export default async function KanalHesaplariSayfasi() {
  await sayfaIzni("ayar.yaz");

  const [kanallar, hesaplar] = await Promise.all([
    prisma.channel.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.channelAccount.findMany({
      include: {
        channel: { select: { name: true } },
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
      orderBy: [{ channelId: "asc" }, { code: "asc" }],
    }),
  ]);

  const t = await getTranslations("KanalHesabi");

  // ROL SEÇİLMEMİŞ HESAP hiçbir formda listelenmez — bunu ekranda
  // söylemezsek kullanıcı "hesabım kayboldu" der.
  const rolsuzSayi = hesaplar.filter(
    (h) => !h.alisIcin && !h.satisIcin,
  ).length;
  // ÇİFT ROL genelde kayıt hatasıdır (kullanıcı kararı 12.08.2026).
  // Kayıt taşınmış, geriye yalnız bayrak kalmış hesaplar ÜST UYARIYA
  // girmez: yapılacak iş "kayıtları kontrol et" değil, tek tık.
  const ciftRolSayi = hesaplar.filter(
    (h) =>
      h.alisIcin &&
      h.satisIcin &&
      h._count.purchases > 0 &&
      h._count.sales > 0,
  ).length;
  const ortak = await getTranslations("Ortak");

  /**
   * ÜÇ AYRI BÖLÜM. Rolü olmayan hesap görünmez olsaydı kullanıcı onu hiç
   * fark etmez, "hesabım kayboldu" derdi; kendi bölümünde durur.
   * Çift rollü hesap ALIŞ bölümünde çıkar ve orada uyarısını taşır —
   * düzeltilecek yer alım tarafıdır (satışları taşınacak).
   */
  const gruplar = [
    {
      anahtar: "satis",
      baslik: t("grupSatis"),
      aciklama: t("grupSatisAciklama"),
      bosMetin: t("grupSatisBos"),
      hesaplar: hesaplar.filter((h) => h.satisIcin && !h.alisIcin),
    },
    {
      anahtar: "alis",
      baslik: t("grupAlis"),
      aciklama: t("grupAlisAciklama"),
      bosMetin: t("grupAlisBos"),
      hesaplar: hesaplar.filter((h) => h.alisIcin),
    },
    {
      anahtar: "rolsuz",
      baslik: t("grupRolsuz"),
      aciklama: t("grupRolsuzAciklama"),
      bosMetin: t("grupRolsuzBos"),
      hesaplar: hesaplar.filter((h) => !h.alisIcin && !h.satisIcin),
    },
  ].filter((g) => g.anahtar !== "rolsuz" || g.hesaplar.length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      {rolsuzSayi > 0 ? (
        <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            <TriangleAlert className="size-4 shrink-0" />
            {t("rolSecilmediBaslik", { sayi: rolsuzSayi })}
          </p>
          <p className={`mt-1 text-sm ${DURUM_YAZISI.uyari}`}>
            {t("rolSecilmediMetin")}
          </p>
        </div>
      ) : null}

      {ciftRolSayi > 0 ? (
        <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            <TriangleAlert className="size-4 shrink-0" />
            {t("ciftRolBaslik", { sayi: ciftRolSayi })}
          </p>
          <p className={`mt-1 text-sm ${DURUM_YAZISI.uyari}`}>
            {t("ciftRolMetin")}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniHesap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <KanalHesabiFormu kanallar={kanallar} />
        </CardContent>
      </Card>

      {/* ALICI VE SATICI HESAPLARI AYRI BÖLÜMLERDE (kullanıcı isteği
          12.08.2026). Tek karışık listede "hangisi mağazam?" sorusu her
          seferinde yeniden soruluyordu. Rol seçilmemiş hesaplar da kendi
          bölümünde durur — orada oldukları için görülüp düzeltilirler. */}
      {gruplar.map((grup) => (
      <Card key={grup.anahtar}>
        <CardHeader>
          <CardTitle>
            {grup.baslik} ({grup.hesaplar.length})
          </CardTitle>
          <p className="text-muted-foreground text-sm">{grup.aciklama}</p>
        </CardHeader>
        <CardContent>
          {grup.hesaplar.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground text-sm">{grup.bosMetin}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("kanal")}</TableHead>
                    <TableHead>{t("hesap")}</TableHead>
                    <TableHead>{ortak("kod")}</TableHead>
                    <TableHead>{ortak("paraBirimi")}</TableHead>
                    <TableHead>{t("rolBaslik")}</TableHead>
                    <TableHead className="text-right">
                      {t("alimSutunu")}
                    </TableHead>
                    <TableHead>{ortak("durum")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grup.hesaplar.map((hesap) => (
                    <TableRow key={hesap.id}>
                      <TableCell className="font-medium">
                        {hesap.channel.name}
                      </TableCell>
                      <TableCell>{hesap.name}</TableCell>
                      <TableCell>
                        <KopyalanabilirKod
                          deger={hesap.code}
                          etiket={t("hesapKodu")}
                        />
                      </TableCell>
                      <TableCell>{hesap.defaultCurrency}</TableCell>
                      <TableCell>
                        <RolSecici
                          hesap={{
                            id: hesap.id,
                            ad: hesap.name,
                            alisIcin: hesap.alisIcin,
                            satisIcin: hesap.satisIcin,
                            alimSayisi: hesap._count.purchases,
                            satisSayisi: hesap._count.sales,
                            payoutDays: hesap.payoutDays,
                            isGunuMu: hesap.payoutDaysAreBusinessDays,
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {hesap._count.purchases}
                      </TableCell>
                      <TableCell>
                        {hesap.isActive ? (
                          <Badge variant="secondary">{ortak("aktif")}</Badge>
                        ) : (
                          <Badge variant="outline">{ortak("pasif")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-start justify-end gap-2">
                          <DurumDegistirButonu
                            kayitId={hesap.id}
                            aktifMi={hesap.isActive}
                            action={kanalHesabiDurumDegistir}
                          />
                          <HesapSilButonu
                            hesapId={hesap.id}
                            ad={hesap.name}
                            kayitSayisi={
                              hesap._count.purchases +
                              hesap._count.sales +
                              hesap._count.channelSkus +
                              hesap._count.settlementItems +
                              hesap._count.settlements
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Silme kuralı EKRANDA yazar: pasif düğmeye basıp "neden
              olmuyor?" diye düşünmek zorunda kalmasın (#5). */}
          <p className="text-muted-foreground mt-3 text-xs">{t("silNotu")}</p>
        </CardContent>
      </Card>
      ))}
    </div>
  );
}
