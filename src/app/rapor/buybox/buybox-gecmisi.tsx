import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";

import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { TekSeriliGrafik, type TekNokta } from "@/components/tek-serili-grafik";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import type { BuyboxKanali } from "@/lib/buybox";
import {
  ARALIK_GUN,
  ISTATISTIK_ARALIKLARI,
  gunlukSeri,
  kazanmaOrani,
  olculmeyenler,
  saatlikSeri,
  type IstatistikAraligi,
  type SeriNoktasi,
} from "@/lib/buybox-istatistik";
import { buyboxOlcumleri } from "@/lib/buybox-istatistik-verisi";
import { gunBasiAni, gunDegeri, gunEkle, isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  BUYBOX GEÇMİŞİ — K363 Faz 3-b (kullanıcı kararı 25.10.2026)
 * ----------------------------------------------------------------------------
 *  «Gün içindeki Buybox aldığım sayıları grafik hâline getir ve istatistik
 *  olarak tut.» Kaynak `BuyboxOlcumu` (saatlik zamanlayıcı yazar). Bugün →
 *  saat saat (o saatin son ölçümü); 7/30 gün → günlük ortalama.
 *  Kazanma oranı = rakipli ürünlerde Buybox bizde olanların payı (Melontik
 *  örneği «9 / 120»; tanım `rakipliOzet`).
 *  ⛔ Ölçülmeyen dilim UYDURULMAZ: grafikte nokta yok ve altta «ölçülmedi»
 *  diye ayrıca yazar.
 * ============================================================================
 */
export async function BuyboxGecmisi({
  kanal,
  aralik,
  adres,
  canli,
}: {
  kanal: BuyboxKanali;
  aralik: IstatistikAraligi;
  adres: (aralik: IstatistikAraligi) => string;
  /** Sayfanın o anki canlı sorgusu — kazanma oranı kutusu ondan. */
  canli: { rakipli: number; rakipliBirinci: number };
}) {
  const t = await getTranslations("Buybox");
  const bicim = await bicimlendirici();
  const simdi = new Date();
  const bugun = isTakvimGunu(simdi);
  const bugunBasi = gunBasiAni(bugun);

  let seri: SeriNoktasi[];
  if (aralik === "bugun") {
    seri = saatlikSeri(await buyboxOlcumleri(kanal, bugunBasi, simdi), bugunBasi, simdi);
  } else {
    const gunSayisi = ARALIK_GUN[aralik];
    const gunBaslari = Array.from({ length: gunSayisi }, (_, i) => gunBasiAni(isTakvimGunu(gunEkle(gunDegeri(bugun), i - (gunSayisi - 1)))));
    seri = gunlukSeri(await buyboxOlcumleri(kanal, gunBaslari[0], simdi), gunBaslari, simdi);
  }
  const etiket = (n: SeriNoktasi) => (aralik === "bugun" ? bicim.saat(n.an) : bicim.tarih(n.an));
  const tamEtiket = (n: SeriNoktasi) => (aralik === "bugun" ? `${bicim.tarih(n.an)} · ${bicim.saat(n.an)}` : bicim.tarih(n.an));
  const birinciNoktalari: TekNokta[] = seri.map((n) => ({ etiket: etiket(n), tamEtiket: tamEtiket(n), deger: n.birinci }));
  const oranNoktalari: TekNokta[] = seri.map((n) => ({ etiket: etiket(n), tamEtiket: tamEtiket(n), deger: n.oran }));
  const eksik = olculmeyenler(seri);
  const oran = kazanmaOrani(canli.rakipliBirinci, canli.rakipli);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>{t("gecmisBaslik")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t(`gecmisNotu_${aralik}`)}</p>
        <div className="flex flex-wrap gap-2">
          {ISTATISTIK_ARALIKLARI.map((a) => (
            <Link
              key={a}
              href={adres(a)}
              aria-current={a === aralik ? "true" : undefined}
              className={
                "inline-flex h-11 shrink-0 items-center rounded-md border px-4 text-sm font-medium transition-colors " +
                (a === aralik ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted")
              }
            >
              {t(`aralik_${a}`)}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        <div className="grid max-w-md grid-cols-2 gap-2">
          <IstatistikKutusu etiket={t("kazanmaOrani")} cocuk={oran === null ? "—" : bicim.yuzde(oran)} />
          <IstatistikKutusu etiket={t("rakipliUrun")} cocuk={t("rakipliOran", { birinci: canli.rakipliBirinci, rakipli: canli.rakipli })} />
        </div>
        <p className="text-muted-foreground text-xs">{t("kazanmaNotu")}</p>

        <div className="space-y-1">
          <p className="text-sm font-medium">{t("grafikBirinci")}</p>
          <div className="overflow-x-auto">
            <TekSeriliGrafik noktalar={birinciNoktalari} seriAdi={t("grafikBirinci")} bicimle={(d) => bicim.sayi(d, 1)} bicimleKisa={(d) => bicim.sayi(d, 1)} bosMesaj={t("gecmisBos")} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("grafikOran")}</p>
          <div className="overflow-x-auto">
            <TekSeriliGrafik noktalar={oranNoktalari} seriAdi={t("grafikOran")} bicimle={(d) => bicim.yuzde(d)} bicimleKisa={(d) => bicim.yuzde(d, 0)} bosMesaj={t("gecmisBos")} />
          </div>
        </div>

        {/* ⛔ Görünmeyen boşluk sorulamaz — ölçülmeyen dilim adıyla yazar. */}
        {eksik.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("olculmedi", { sayi: eksik.length, liste: eksik.map(etiket).join(", ") })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
