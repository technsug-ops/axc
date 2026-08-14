import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, ListChecks } from "lucide-react";

import { DurumRozeti } from "@/components/durum-rozeti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DURUM_YAZISI, DURUM_ZEMINI } from "@/lib/renkler";
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
          {/* Bekleyen iş AMBER, hepsi temiz YEŞİL — renk sistemi. */}
          {toplam > 0 ? (
            <DurumRozeti durum="uyari">{t("bekleyen", { sayi: toplam })}</DurumRozeti>
          ) : (
            <DurumRozeti durum="olumlu">{t("hepsiTemiz")}</DurumRozeti>
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
              /**
               * `min-w-0` ŞART (15.08.2026): ızgara hücresinin varsayılan
               * en küçük genişliği "auto"dur, yani içeriği kadar. Uzun
               * etiket ("Komisyon oranı boş kanal SKU") hücreyi kendi
               * genişliğine zorluyor ve yazı kutunun dışına taşıyordu.
               */
              className="hover:bg-muted/60 flex min-h-11 min-w-0 flex-col justify-between gap-1 rounded-lg border p-3"
            >
              {/* İŞARET + RENK BİRLİKTE (kısıt #1): temizde ✓ ikonu,
                  bekleyende rakamın kendisi zaten sayısal işaret. */}
              {g.temizMi ? (
                <span
                  className={`inline-flex items-center gap-1 text-sm ${DURUM_YAZISI.olumlu}`}
                >
                  <Check className="size-4" />
                  {t("temiz")}
                </span>
              ) : (
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-2xl leading-none font-semibold tabular-nums ${DURUM_ZEMINI.uyari}`}
                >
                  {g.sayi}
                </span>
              )}
              <span className="text-muted-foreground text-[11px] leading-tight break-words hyphens-auto">
                {t(g.anahtar)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
