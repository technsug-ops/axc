import { Baglanti } from "@/components/baglanti";
import { getTranslations } from "next-intl/server";
import { Lock, LockOpen } from "lucide-react";

import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { DurumRozeti } from "@/components/durum-rozeti";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { donemListesi } from "@/lib/muhasebe-donemi";
import { sayfaIzni } from "@/lib/yetki";

import { DonemSatiriEylemi } from "./satir-eylemi";

export async function generateMetadata() {
  const t = await getTranslations("Donem");
  return { title: t("baslik") };
}

/**
 * ============================================================================
 *  MUHASEBE DÖNEMLERİ — LİSTE VE KAPATMA (K108, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ BU EKRAN KAPIDAN SONRA AÇILDI. Kullanıcı kararı 31.08: kapı beş yola
 *  bağlanmadan bu ekran açılsaydı Halil dönemi kapatır ve KORUNDUĞUNU
 *  SANIRDI — kapalı döneme yazım sessizce geçerdi.
 *
 *  ⚠ LİSTE TAKVİMDEN ÜRETİLİR, TABLODAN DEĞİL. Tablo yalnız kapanmışları
 *  tutuyor; tablodan üretilseydi ekran yalnız kapanmış ayları gösterir,
 *  KAPATILACAK ay hiç görünmezdi — yani ekran tam da işe yarayacağı yerde
 *  boş kalırdı.
 *
 *  ⚠ SON 14 AY: sabit bir pencere, çünkü "hepsini göster" listesi her ay bir
 *  satır büyür ve beş yıl sonra 60 satırlık bir duvar olur. Daha eskisi
 *  gerektiğinde ayrı bir iş — bugün yok.
 * ============================================================================
 */
export default async function DonemlerSayfasi() {
  await sayfaIzni("ayar.yaz");

  const t = await getTranslations("Donem");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const donemler = await donemListesi(new Date());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <ListeyeDon href="/ayarlar">{t("ayarlaraDon")}</ListeyeDon>
        <h1 className="mt-1 text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("aciklama")}</p>
      </div>

      {/*
        ⚠ UYARI EKRANDA DURUYOR: kapatmak GERİ ALINABİLİR ama etkisi
        anlıktır — o dönemin her kaydı ısrar ister. Kullanıcı neye
        bastığını bilmeden basmasın (İlke #5, #6).
      */}
      <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
        {t("kapatmaUyarisi")}
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sutunDonem")}</TableHead>
              <TableHead>{ortak("durum")}</TableHead>
              <TableHead>{t("sutunKapatan")}</TableHead>
              <TableHead>{t("sutunIslem")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donemler.map((d) => (
              <TableRow key={`${d.yil}-${d.ay}`}>
                <TableCell className="font-medium">
                  {bicim.ayYil(new Date(Date.UTC(d.yil, d.ay - 1, 1)))}
                </TableCell>
                <TableCell>
                  {/*
                    ⚠ RENK TEK BAŞINA KONUŞMAZ: rozetin içinde metin de var.
                    Renk körü bir kullanıcı için "kapalı" yalnız kırmızıysa
                    hiçbir şey söylemez.
                  */}
                  <DurumRozeti
                    durum={d.durum === "KAPALI" ? "olumsuz" : "olumlu"}
                    isaretsiz
                  >
                    {d.durum === "KAPALI" ? (
                      <Lock className="size-3.5" aria-hidden />
                    ) : (
                      <LockOpen className="size-3.5" aria-hidden />
                    )}
                    {t(`durum${d.durum}`)}
                  </DurumRozeti>
                </TableCell>
                <TableCell className="text-sm">
                  {/*
                    ⚠ KAPATAN KİM VE NE ZAMAN — kapanış bir KARARDIR, sahibi
                    olmalı. "Kapalı" yazıp kimin kapattığını söylememek, üç ay
                    sonra "bunu kim yaptı" sorusunu cevapsız bırakırdı.
                  */}
                  {d.durum === "KAPALI" && d.kapatildiAt ? (
                    <>
                      <div>{d.kapatanAdi ?? t("kapatanBilinmiyor")}</div>
                      <div className="text-muted-foreground text-xs">
                        {bicim.tarih(d.kapatildiAt)}
                      </div>
                      {d.not ? (
                        <div className="text-muted-foreground text-xs">
                          {d.not}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="space-y-1">
                  {/*
                    ⚠ RAPOR BAĞLANTISI HER SATIRDA — açık dönemin de raporu
                    okunabilir (şerhiyle). Yalnız kapalılara koysaydık
                    kullanıcı kapatmadan önce ne kapattığını göremezdi.
                  */}
                  <div>
                    <Baglanti href={`/ayarlar/donemler/${d.yil}-${String(d.ay).padStart(2, "0")}`}>
                      {t("raporuAc")}
                    </Baglanti>
                  </div>
                  <DonemSatiriEylemi
                    yil={d.yil}
                    ay={d.ay}
                    durum={d.durum}
                    etiket={bicim.ayYil(new Date(Date.UTC(d.yil, d.ay - 1, 1)))}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
