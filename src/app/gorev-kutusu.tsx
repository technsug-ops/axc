import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  bekleyenToplam,
  gorevleriKur,
  type GorevAnahtari,
} from "@/lib/panel/bugun-ne-yapmaliyim";

/**
 * ============================================================================
 *  "BUGÜN NE YAPMALIYIM" — PANELİN EN ÜST KUTUSU
 * ----------------------------------------------------------------------------
 *  Panel açılışında EYLEM üstte, rapor altta (mimar kararı 14.08.2026).
 *  Bu kutu "ne oldu" değil "şimdi ne yapacağım" sorusunu cevaplar.
 *
 *  YERLEŞİM — KUTUCUK IZGARASI, SATIR LİSTESİ DEĞİL (14.08.2026 düzeltmesi):
 *  İlk teslimde her görev tam genişlikte bir satırdı; etiket solda, rakam
 *  en sağda ve arada yüzlerce piksel boşluk kalıyordu. Kullanıcı haklı
 *  olarak "çok verimsiz yerleşim" dedi. Beş küçük sayaç için doğru biçim
 *  yan yana KUTUCUKLARDIR: göz rakamları tek bakışta tarar, dikey yer
 *  beşte bire iner.
 *
 *  AÇIK SIFIR: sayısı 0 olan kutucuk GİZLENMEZ, "temiz" yazar. Satırın
 *  yokluğundan "yapılacak iş yok" sonucunu çıkarmak imkânsızdır.
 *
 *  YETKİ: buradaki sayıların hepsi OPERASYONELDİR — `satis.kar.gor`
 *  İSTEMEZ. Depocu da görebilir; kâr/oran sayıları bu kutuya girmez.
 *
 *  DÖNEM SÜZGECİNDEN ETKİLENMEZ: "kargoya verilmemiş sipariş" dünkü de
 *  olsa bugünün işidir.
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

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
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
      </CardHeader>

      <CardContent>
        {/* Beş kutucuk: telefonda 2, tablette 3, dizüstünde 5 sütun. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {gorevler.map((g) => (
            <Link
              key={g.anahtar}
              href={g.adres}
              className={`hover:bg-muted/60 flex min-h-11 flex-col justify-between gap-1 rounded-lg border p-3 ${
                g.temizMi ? "" : "border-foreground/20"
              }`}
            >
              {g.temizMi ? (
                <span className="text-muted-foreground inline-flex items-center gap-1 text-lg font-semibold">
                  <Check className="size-4" />
                  <span className="text-sm font-normal">{t("temiz")}</span>
                </span>
              ) : (
                <span className="text-2xl leading-none font-semibold tabular-nums">
                  {g.sayi}
                </span>
              )}
              <span className="text-muted-foreground text-xs leading-tight">
                {t(g.anahtar)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
