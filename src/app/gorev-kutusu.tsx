import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, ChevronRight, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  bekleyenToplam,
  gorevleriKur,
  hepsiTemizMi,
  type GorevAnahtari,
} from "@/lib/panel/bugun-ne-yapmaliyim";

/**
 * ============================================================================
 *  "BUGÜN NE YAPMALIYIM" — PANELİN EN ÜST KUTUSU
 * ----------------------------------------------------------------------------
 *  Panel açılışında EYLEM üstte, rapor altta (mimar kararı 14.08.2026).
 *  Bu kutu "ne oldu" değil "şimdi ne yapacağım" sorusunu cevaplar.
 *
 *  AÇIK SIFIR: sayısı 0 olan satır GİZLENMEZ, yanına "temiz" yazılır.
 *  Satırın yokluğundan "yapılacak iş yok" sonucunu çıkarmak imkânsızdır;
 *  kullanıcı onu "ekran eksik" diye okur (13.08.2026 dersi).
 *
 *  YETKİ: buradaki sayıların hepsi OPERASYONELDİR — `satis.kar.gor`
 *  İSTEMEZ. Depocu da görebilir; kâr/oran sayıları bu kutuya girmez.
 *
 *  DÖNEM SÜZGECİNDEN ETKİLENMEZ: "kargoya verilmemiş sipariş" dünkü de
 *  olsa bugünün işidir. Süzgece bağlansaydı, dönem daraldığında iş
 *  listesi sessizce kısalır ve kullanıcı işini unuturdu.
 * ============================================================================
 */

export async function GorevKutusu({
  sayilar,
}: {
  sayilar: Record<GorevAnahtari, number>;
}) {
  const t = await getTranslations("Gorevler");

  const gorevler = gorevleriKur(sayilar);
  const toplam = bekleyenToplam(gorevler);
  const hepsiTemiz = hepsiTemizMi(gorevler);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <ListChecks className="size-5" />
          {t("baslik")}
          {toplam > 0 ? (
            <Badge variant="secondary">{t("bekleyen", { sayi: toplam })}</Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Check className="size-3" />
              {t("hepsiTemiz")}
            </Badge>
          )}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {gorevler.map((g) => (
            <li key={g.anahtar}>
              {/* SAYI TIKLANABİLİR: sayıyı görüp "nerede bunlar?" diye
                  aramak zorunda kalmak, sayının işe yaramaması demektir
                  (İlke #9). Temiz satır da tıklanır — boş listeyi görmek
                  de bir cevaptır. */}
              <Link
                href={g.adres}
                className="hover:bg-muted/60 flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-2"
              >
                <span className="min-w-0 text-sm">{t(g.anahtar)}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {g.temizMi ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <Check className="size-3.5" />
                      {t("temiz")}
                    </span>
                  ) : (
                    <span className="text-lg font-semibold tabular-nums">
                      {g.sayi}
                    </span>
                  )}
                  <ChevronRight className="text-muted-foreground size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {hepsiTemiz ? (
          <p className="text-muted-foreground mt-3 text-xs">{t("temizNotu")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
