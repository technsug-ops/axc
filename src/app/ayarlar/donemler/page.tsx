import { Baglanti } from "@/components/baglanti";
import { getTranslations } from "next-intl/server";
import { Lock, LockOpen } from "lucide-react";

import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { DurumRozeti } from "@/components/durum-rozeti";
import { SatirKarti, SatirListesi } from "@/components/satir-karti";
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

      {/*
        ⚠ SATIR KARTI (K235, 22.09.2026): 4 sütunluk tablo yerine ortak satır
        anatomisi — dönem adı manşet, kapatan/tarih/not bağlam, durum ve
        işlemler sağda. Kullanıcı hakediş satırını "çok daha okunaklı"
        bulup bütün listelere istedi; aynı bileşen, aynı görünüm (İlke #10).
      */}
      <SatirListesi>
        {donemler.map((d) => (
          <SatirKarti
            key={`${d.yil}-${d.ay}`}
            baslik={bicim.ayYil(new Date(Date.UTC(d.yil, d.ay - 1, 1)))}
            baglam={[
              /*
                ⚠ KAPATAN KİM VE NE ZAMAN — kapanış bir KARARDIR, sahibi
                olmalı. "Kapalı" yazıp kimin kapattığını söylememek, üç ay
                sonra "bunu kim yaptı" sorusunu cevapsız bırakırdı.
              */
              d.durum === "KAPALI" && d.kapatildiAt
                ? `${d.kapatanAdi ?? t("kapatanBilinmiyor")} · ${bicim.tarih(d.kapatildiAt)}`
                : null,
              d.durum === "KAPALI" && d.not ? d.not : null,
            ]}
            sag={
              <>
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
                {/*
                  ⚠ RAPOR BAĞLANTISI HER SATIRDA — açık dönemin de raporu
                  okunabilir (şerhiyle). Yalnız kapalılara koysaydık kullanıcı
                  kapatmadan önce ne kapattığını göremezdi.
                */}
                <Baglanti href={`/ayarlar/donemler/${d.yil}-${String(d.ay).padStart(2, "0")}`}>
                  {t("raporuAc")}
                </Baglanti>
                <DonemSatiriEylemi
                  yil={d.yil}
                  ay={d.ay}
                  durum={d.durum}
                  etiket={bicim.ayYil(new Date(Date.UTC(d.yil, d.ay - 1, 1)))}
                />
              </>
            }
          />
        ))}
      </SatirListesi>
    </div>
  );
}
