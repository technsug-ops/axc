import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { iadeTuruEtiketleri } from "@/lib/etiketler";

import type { Currency, ReturnType } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  İADE ETKİSİ BLOĞU
 * ----------------------------------------------------------------------------
 *  ORİJİNAL SATIŞ KÂRI SİLİNMEZ. Her iade kendi tarihli bloğunda görünür ve
 *  en altta "iade sonrası net" toplanır. Bir satışta birden fazla iade
 *  olabilir (kısmi iadeler).
 *
 *  İşaret kuralı ekranda da korunur: pozitif = geri gelen (yeşil),
 *  negatif = gider (kırmızı).
 * ============================================================================
 */

export type IadeGorunumu = {
  id: string;
  code: string | null;
  returnType: ReturnType;
  occurredAt: Date;
  net1: number | null;
  net2: number | null;
  satirlar: { code: string; tutar: number }[];
};

/**
 * TALEP BEKLEYEN HASAR — eyleme dönük öneri.
 *
 * 13.08.2026 dersi: kullanıcı hasarlı bir iade kaydetti, 1.799 TL maliyet
 * üstünde kaldı ve bunu ancak kanal NET-2'si eksiye düşünce fark etti.
 * Hasarın parasal sonucu, hasarın kaydedildiği yerde söylenmeli.
 *
 * Kaydetme ANINA değil VERİYE bağlı: talep açılana kadar her açılışta
 * görünür. Tek seferlik bir bildirim olsaydı, kapatan bir daha görmezdi.
 */
export type BekleyenHasar = {
  adet: number;
  tutar: number;
  paraBirimi: Currency;
};

/**
 * GEÇMİŞ KAYITLAR İÇİN AÇIK SIFIR.
 *
 * 13.08.2026'dan önce yazılan iadelerde sağlam adet 0'ken `MALIYET_GERI`
 * satırı hiç oluşmuyordu; kullanıcı "maliyet geri gelmedi"yi satırın
 * YOKLUĞUNDAN anlamak zorundaydı ve anlamadı.
 *
 * Defter kaydı DEĞİŞTİRİLMEZ (anayasa: kayıt silinmez/düzenlenmez) —
 * eksik satır yalnızca EKRANDA tamamlanır. Koşul `KAYIP_GELIR`e bağlı:
 * itirazı kabul edilen (DISPUTED) iadede gelir zaten geri gelmez, orada
 * maliyet satırı anlamsız olurdu.
 */
function gosterilecekSatirlar(satirlar: { code: string; tutar: number }[]) {
  const gelirDondu = satirlar.some((s) => s.code === "KAYIP_GELIR");
  const maliyetSatiriVar = satirlar.some((s) => s.code === "MALIYET_GERI");
  if (!gelirDondu || maliyetSatiriVar) return satirlar;
  return [...satirlar, { code: "MALIYET_GERI", tutar: 0 }];
}

export async function IadeBlogu({
  iadeler,
  paraBirimi,
  orijinalNet1,
  orijinalNet2,
  bekleyenHasar,
}: {
  iadeler: IadeGorunumu[];
  paraBirimi: Currency;
  bekleyenHasar?: BekleyenHasar | null;
  orijinalNet1: number | null;
  orijinalNet2: number | null;
}) {
  const t = await getTranslations("Iade");
  const tKesinti = await getTranslations("Kesinti");
  const bicim = await bicimlendirici();
  const turler = await iadeTuruEtiketleri();

  if (iadeler.length === 0) return null;

  const para = (n: number) => bicim.para(n, paraBirimi);

  const BILINEN = [
    "KOMISYON_IADE",
    "KOMISYON_KDV_IADE",
    "ODEME_GIDERI_IADE",
    "STOPAJ_IADE",
    "KAYIP_GELIR",
    "MALIYET_GERI",
    "IADE_KARGO",
    "YENIDEN_GONDERIM_KARGO",
    "CEZA",
    "DEGISIM_MALIYET",
  ];
  const ad = (kod: string) => (BILINEN.includes(kod) ? tKesinti(kod) : kod);

  const toplamEtki1 = iadeler.reduce((t2, i) => t2 + (i.net1 ?? 0), 0);
  const toplamEtki2 = iadeler.reduce((t2, i) => t2 + (i.net2 ?? 0), 0);

  const sonNet1 = orijinalNet1 === null ? null : orijinalNet1 + toplamEtki1;
  const sonNet2 = orijinalNet2 === null ? null : orijinalNet2 + toplamEtki2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("iadeSayisi", { sayi: iadeler.length })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground text-xs">{t("etkiNotu")}</p>

        {/* Hasarlı mal = üstünüzde kalan maliyet. Rakamı söyle, yapılacak
            işi göster — "bir şeyler ters" demek yetmez (#5). */}
        {bekleyenHasar && bekleyenHasar.adet > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t("hasarUyarisi", {
                adet: bekleyenHasar.adet,
                tutar: bicim.para(bekleyenHasar.tutar, bekleyenHasar.paraBirimi),
              })}
            </p>
            <Button asChild size="sm" variant="outline" className="h-11 md:h-8">
              <Link href="/tazminat">
                {t("tazminatTalebiAc")}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : null}

        {/* Orijinal kâr — silinmediği görünsün. */}
        <div className="rounded-lg border p-3">
          <div className="text-muted-foreground text-xs">
            {t("orijinalKar")}
          </div>
          <div className="mt-1 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">NET-1: </span>
              <span className="font-medium">
                {orijinalNet1 === null ? "—" : para(orijinalNet1)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">NET-2: </span>
              <span className="font-medium">
                {orijinalNet2 === null ? "—" : para(orijinalNet2)}
              </span>
            </div>
          </div>
        </div>

        {/* Her iade kendi tarihli bloğunda. */}
        {iadeler.map((iade) => (
          <div key={iade.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{turler[iade.returnType]}</Badge>
                <span className="text-muted-foreground text-sm">
                  {bicim.tarih(iade.occurredAt)}
                </span>
                {iade.code ? (
                  <span className="text-muted-foreground font-mono text-xs">
                    {iade.code}
                  </span>
                ) : null}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {t("net2Etkisi")}:{" "}
                </span>
                <span
                  className={
                    (iade.net2 ?? 0) < 0
                      ? "text-destructive font-medium"
                      : "font-medium text-emerald-600"
                  }
                >
                  {iade.net2 === null ? "—" : para(iade.net2)}
                </span>
              </div>
            </div>

            <dl className="space-y-1 text-sm">
              {/* GEÇMİŞ KAYITLAR İÇİN AÇIK SIFIR.
                  13.08.2026'dan önce yazılan iadelerde sağlam adet 0'ken
                  MALIYET_GERI satırı hiç oluşmuyordu. Defter kaydı
                  DEĞİŞTİRİLMEZ (anayasa); eksik olan satır yalnızca EKRANDA
                  tamamlanır ki eski iadeler de kendini açıklasın.
                  Koşul KAYIP_GELIR'e bağlı: itirazı kabul edilen (DISPUTED)
                  iadede zaten maliyet geri gelmez, orada satır anlamsız. */}
              {gosterilecekSatirlar(iade.satirlar).map((s, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {ad(s.code)}
                    {/* Açık sıfırın nedeni burada da yazar — aynı bilgi
                        önizlemede ve kayıtta aynı görünmeli (#10). */}
                    {s.code === "MALIYET_GERI" && s.tutar === 0 ? (
                      <span className="block text-xs">
                        {t("maliyetGeriYok")}
                      </span>
                    ) : null}
                  </dt>
                  <dd
                    className={
                      s.tutar < 0
                        ? "text-destructive whitespace-nowrap"
                        : s.tutar === 0
                          ? "text-muted-foreground whitespace-nowrap"
                          : "whitespace-nowrap text-emerald-600"
                    }
                  >
                    {s.tutar > 0 ? "+" : ""}
                    {para(s.tutar)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        {/* İade sonrası net. */}
        <div className="space-y-2 rounded-lg border p-4">
          <div className="text-sm font-medium">{t("iadeSonrasiNet")}</div>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-muted-foreground text-xs">NET-1</div>
              <div
                className={
                  (sonNet1 ?? 0) < 0
                    ? "text-destructive text-xl font-semibold"
                    : "text-xl font-semibold"
                }
              >
                {sonNet1 === null ? "—" : para(sonNet1)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">NET-2</div>
              <div
                className={
                  (sonNet2 ?? 0) < 0
                    ? "text-destructive text-2xl font-semibold"
                    : "text-2xl font-semibold"
                }
              >
                {sonNet2 === null ? "—" : para(sonNet2)}
              </div>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-xs">{t("kdvVarsayimNotu")}</p>
      </CardContent>
    </Card>
  );
}
