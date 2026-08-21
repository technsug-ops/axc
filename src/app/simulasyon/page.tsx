import { getTranslations } from "next-intl/server";

import { DurumRozeti } from "@/components/durum-rozeti";
import { MarjPili } from "@/components/marj-pili";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { VARSAYILAN_KDV_ORANI } from "@/lib/kar";
import { marjBandi } from "@/lib/marj-bantlari";
import { ciroMarjiMetni } from "@/lib/marj-gosterge";
import { DURUM_YAZISI } from "@/lib/renkler";
import {
  girdiEksikMi,
  simulasyonKarsilastir,
  type SimulasyonGirdisi,
} from "@/lib/simulasyon/karsilastir";
import { sayfaIzni } from "@/lib/yetki";

export async function generateMetadata() {
  /**
   * ⚠ ADI `tBaslik` — `t` OLAMAZ. Sayfa gövdesindeki `t` "Simulasyon"
   * sözlüğüne bağlı; ikisi aynı adı taşıyınca `i18n:kontrol` anahtarı yanlış
   * sözlükte aradı ve "Simulasyon.simulasyon eksik" dedi. Depodaki öteki
   * sayfalar da `tBaslik` kullanıyor.
   */
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("simulasyon") };
}

/**
 * ============================================================================
 *  FİYAT DENEMESİ — "HANGİ PAZARYERİNDE SATSAM NE KALIR"
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026: _"bulduğum 1 ürünü alım fiyatı, satış fiyatı,
 *  komisyon oranı girdiğimde hangi pazar yerinde satsam ne kadar kâr ederim"_.
 *
 *  ── YENİ İZİN AÇILMADI ──────────────────────────────────────────────────
 *  Ekran kâr gösteriyor; doğal kapısı `satis.kar.gor`. Yeni bir izin anahtarı
 *  açmak iki bacaklı bir iş olurdu (kod + canlı rol satırı) ve unutulan bacak
 *  ekranı SESSİZCE kaybederdi. Var olan izin bu soruyu zaten cevaplıyor.
 *
 *  ── DURUM ADRESTE (istemci JS yok) ──────────────────────────────────────
 *  Form GET ile kendine gönderiyor; sonuç adres çubuğunda taşınıyor. Böylece
 *  bir deneme paylaşılabilir, yer imine eklenebilir ve geri tuşu çalışır.
 *  Bu ekranda tek satır istemci JS'i yok.
 *
 *  ── HER SAYININ KAYNAĞI ROZETLİ ─────────────────────────────────────────
 *  ⚠ Trendyol ve Hepsiburada kuralları ÖLÇÜLDÜ (anayasa + canlı ekstre);
 *  N11 ve Amazon nesatilir.com'dan REFERANS. Aynı gün ölçüldü ki o kaynak
 *  yanılabiliyor (HB tahsilat bedeli: nesatilir 9,60 · gerçek 8,00). Bu
 *  yüzden kullanıcı hangi rakamın ölçülmüş olduğunu ekranda GÖRÜR.
 * ============================================================================
 */
export default async function SimulasyonSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    kdv?: string;
    dahil?: string;
    satis?: string;
    alis?: string;
    komisyon?: string;
    kargo?: string;
  }>;
}) {
  await sayfaIzni("satis.kar.gor");

  const p = await searchParams;
  const t = await getTranslations("Simulasyon");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  /** Boş metin `NaN` verir; `girdiEksikMi` onu yakalar ve tablo çizilmez. */
  const sayi = (deger: string | undefined): number =>
    deger === undefined || deger.trim() === "" ? Number.NaN : Number(deger);

  const girdi: SimulasyonGirdisi = {
    /** Varsayılan KDV DAHİL — operasyonun konuştuğu dil (etiket fiyatı). */
    kdvDahilMi: p.dahil !== "0",
    satisFiyati: sayi(p.satis),
    alisFiyati: sayi(p.alis),
    komisyonOrani: sayi(p.komisyon),
    kdvOrani: p.kdv === undefined ? VARSAYILAN_KDV_ORANI : sayi(p.kdv),
    kargoUcreti:
      p.kargo === undefined || p.kargo.trim() === "" ? null : sayi(p.kargo),
  };

  const eksik = girdiEksikMi(girdi);
  const sonuclar = eksik ? [] : simulasyonKarsilastir(girdi);
  const enIyi = sonuclar[0] ?? null;

  const para = (n: number) => bicim.para(n, "TRY");

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      {/* ── GİRDİ FORMU ───────────────────────────────────────────────────
          GET ile kendine gönderiyor: sonuç adreste taşınır, JS gerekmez. */}
      <Card>
        <CardContent className="pt-6">
          <form
            method="get"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="satis">{t("satisFiyati")}</Label>
              <Input
                id="satis"
                name="satis"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={p.satis ?? ""}
                /* YER TUTUCU DEĞER GİBİ GÖRÜNMEZ (İlke #11): "örn." şart. */
                placeholder={t("ornek", { deger: "1.000" })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alis">{t("alisFiyati")}</Label>
              <Input
                id="alis"
                name="alis"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={p.alis ?? ""}
                placeholder={t("ornek", { deger: "500" })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="komisyon">{t("komisyonOrani")}</Label>
              <Input
                id="komisyon"
                name="komisyon"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={p.komisyon ?? ""}
                placeholder={t("ornek", { deger: "15" })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kdv">{t("kdvOrani")}</Label>
              <Input
                id="kdv"
                name="kdv"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={p.kdv ?? String(VARSAYILAN_KDV_ORANI)}
                placeholder={t("ornek", { deger: "20" })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kargo">{t("kargoUcreti")}</Label>
              <Input
                id="kargo"
                name="kargo"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={p.kargo ?? ""}
                placeholder={t("ornek", { deger: "120" })}
              />
              <p className="text-muted-foreground text-xs">{t("kargoIpucu")}</p>
            </div>

            {/* ── KDV DAHİL / HARİÇ (kullanıcı isteği 21.08.2026) ──────────
                ⚠ RADYO, ONAY KUTUSU DEĞİL: iki seçenek de GÖRÜNÜR olmalı.
                Tek kutu olsaydı "işaretli değilse ne oluyor" sorusu ekranda
                cevapsız kalırdı. Hangi dilde girdiğini bilmeyen kullanıcı
                rakamları %20 yanlış girer. */}
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">{t("kdvDili")}</legend>
              <div className="flex flex-wrap gap-4 pt-1">
                {[
                  { deger: "1", etiket: t("kdvDahil") },
                  { deger: "0", etiket: t("kdvHaric") },
                ].map((secenek) => (
                  <label
                    key={secenek.deger}
                    className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="dahil"
                      value={secenek.deger}
                      defaultChecked={
                        secenek.deger === "1"
                          ? p.dahil !== "0"
                          : p.dahil === "0"
                      }
                      className="size-4"
                    />
                    {secenek.etiket}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit">{t("hesapla")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── SONUÇ ─────────────────────────────────────────────────────────
          ⚠ BOŞ FORMDA TABLO ÇİZİLMEZ. Sıfır satırlık bir "0,00" duvarı
          hesaplanmış gibi görünürdü; sıfır satış "0 kâr" değil, cevapsız
          sorudur (İlke #5: neden olmadığı ekranda yazar). */}
      {eksik ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("bosBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("bosIpucu")}</p>
        </div>
      ) : (
        <>
          {enIyi ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("hukumBaslik")}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* HÜKÜM TEK CÜMLE: panel bir hüküm yeridir (İlke #13). */}
                <p className="text-sm">
                  {t.rich("hukum", {
                    kanal: enIyi.ad,
                    tutar: para(enIyi.net2),
                    b: (parca) => (
                      <span
                        className={`font-semibold ${
                          DURUM_YAZISI[enIyi.net2 >= 0 ? "olumlu" : "olumsuz"]
                        }`}
                      >
                        {parca}
                      </span>
                    ),
                  })}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("kanal")}</TableHead>
                  <TableHead className="text-right">{t("komisyon")}</TableHead>
                  <TableHead className="text-right">
                    {t("kesintiler")}
                  </TableHead>
                  <TableHead className="text-right">{t("kargo")}</TableHead>
                  <TableHead className="text-right">{t("stopaj")}</TableHead>
                  <TableHead className="text-right">
                    {t("odenecekKdv")}
                  </TableHead>
                  <TableHead className="text-right">{t("net2")}</TableHead>
                  <TableHead className="text-right">{t("marj")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sonuclar.map((s) => {
                  const bant = marjBandi(s.ciroMarji);
                  const kesintiToplami = s.kesintiler.reduce(
                    (a, k) => a + k.tutar,
                    0,
                  );
                  return (
                    <TableRow key={s.kod}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{s.ad}</span>
                          {/* ⚠ KAYNAK ROZETİ — ölçülmüş mü, dış iddia mı.
                              "Kaynağı yazılmayan sayı kullanılamaz." */}
                          <span className="flex flex-wrap items-center gap-1">
                            <DurumRozeti
                              durum={
                                s.kaynak === "OLCULDU" ? "olumlu" : "uyari"
                              }
                              isaretsiz
                            >
                              {t(`kaynak_${s.kaynak}`)}
                            </DurumRozeti>
                          </span>
                          <span
                            className="text-muted-foreground text-xs"
                            title={s.kaynakNotu}
                          >
                            {s.kaynakNotu}
                          </span>
                          {/* Belirsizlik SESSİZ KALMAZ — rakamın yanında durur. */}
                          {s.belirsizlik ? (
                            <span className="text-muted-foreground text-xs italic">
                              ⚠ {s.belirsizlik}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {para(s.komisyon)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {kesintiToplami === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            title={s.kesintiler
                              .map((k) => `${k.code}: ${para(k.tutar)}`)
                              .join(" · ")}
                          >
                            {para(kesintiToplami)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.kargo === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          para(s.kargo)
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {para(s.stopaj)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {para(s.odenecekKdv)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold tabular-nums ${
                          DURUM_YAZISI[s.net2 >= 0 ? "olumlu" : "olumsuz"]
                        }`}
                      >
                        {para(s.net2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Marj pili — satış listesiyle AYNI dil (İlke #10). */}
                        {bant === null || s.ciroMarji === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <MarjPili
                            bant={bant}
                            metin={ciroMarjiMetni(s.ciroMarji)!}
                            durumMetni={t(`bant_${bant}`)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* NE HESAPLANDIĞI EKRANDA YAZAR — hangi dilde girildiği dahil. */}
          <p className="text-muted-foreground text-xs">
            {t("girdiOzeti", {
              dil: girdi.kdvDahilMi ? t("kdvDahil") : t("kdvHaric"),
              satis: para(girdi.satisFiyati),
              alis: para(girdi.alisFiyati),
              komisyon: bicim.yuzde(girdi.komisyonOrani),
              kdv: bicim.yuzde(girdi.kdvOrani),
            })}
          </p>

          <div className="text-muted-foreground space-y-1 text-xs">
            <p>{t("notSimulasyon")}</p>
            <p>{t("notTekAdet")}</p>
          </div>
          <Badge variant="outline">
            {ortak("kayitSayisi", { sayi: sonuclar.length })}
          </Badge>
        </>
      )}
    </div>
  );
}
