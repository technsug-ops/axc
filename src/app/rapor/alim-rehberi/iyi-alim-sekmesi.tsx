import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";

import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { iyiAlimAra, iyiAlimToplami, type IyiAlimSatiri } from "@/lib/alim-fiyat-hafizasi";
import { bicimlendirici } from "@/lib/bicim";

/**
 * ============================================================================
 *  ALIM REHBERİ — «KAMPANYADA İYİ ALDIKLARIN» SEKMESİ (K363 Faz 2-d)
 * ----------------------------------------------------------------------------
 *  Seçili dönemde satılan ve son alışı en ucuz alışından pahalı ürünler: en
 *  ucuz alış TARİHİYLE (hangi kampanya), normal (ortanca), son alış ve fark.
 *  ⛔ Hatırlatma, yargı değil (iş sabiti «fiyatın yönü yoktur»): renk nötr.
 *  Hesap `lib/alim-fiyat-hafizasi.ts`te; burası yalnız çizer.
 * ============================================================================
 */
export async function IyiAlimSekmesi({ liste, arama }: { liste: IyiAlimSatiri[]; arama: string | null }) {
  const t = await getTranslations("AlimRehberi");
  const bicim = await bicimlendirici();
  const gorunen = iyiAlimAra(liste, arama);
  const toplam = iyiAlimToplami(gorunen);
  const kimlikEtiketi = { sku: t("sku"), firmaSku: t("excelFirmaSku"), barkod: t("excelBarkod") };
  const nokta = (fiyat: number, tarih: Date) => t("iyiFiyatTarih", { fiyat: bicim.para(fiyat, "TRY"), tarih: bicim.tarih(tarih) });

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t("iyiNotu")}</p>
      {/* ── TOPLAM (İlke #15) — birim fiyatlar toplanmaz, adetler toplanır ── */}
      <div className="grid max-w-3xl grid-cols-3 gap-2">
        <IstatistikKutusu etiket={t("toplamIyiUrun")} cocuk={toplam.urun} />
        <IstatistikKutusu etiket={t("toplamAdet")} cocuk={toplam.adet} />
        <IstatistikKutusu etiket={t("toplamRaf")} cocuk={toplam.raf} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("liste_iyiAlim")}</CardTitle>
          {arama ? <p className="text-muted-foreground text-sm">{t("aramaSonucu", { sayi: gorunen.length, toplam: liste.length })}</p> : null}
        </CardHeader>
        <CardContent className="min-w-0">
          {gorunen.length === 0 ? (
            <div className="space-y-1 py-8 text-center">
              <p className="text-sm font-medium">{t("listeBos")}</p>
              <p className="text-muted-foreground text-sm">{t("iyiBos")}</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunUrun")}</TableHead>
                      <TableHead className="text-right">{t("sutunSatilan")}</TableHead>
                      <TableHead className="text-right">{t("sutunRaf")}</TableHead>
                      <TableHead className="text-right">{t("sutunIyiEnUcuz")}</TableHead>
                      <TableHead className="text-right">{t("sutunIyiNormal")}</TableHead>
                      <TableHead className="text-right">{t("sutunIyiSon")}</TableHead>
                      <TableHead className="text-right">{t("sutunIyiFark")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gorunen.map(({ satir: s, hafiza: h, fark }) => (
                      <TableRow key={s.variantId}>
                        <TableCell className="max-w-md align-top whitespace-normal">
                          <div className="min-w-0 space-y-0.5">
                            <UrunAdi s={s} />
                            <Kodlar s={s} etiket={kimlikEtiketi} />
                            <div className="text-muted-foreground text-xs">{t("iyiAlisSayisi", { sayi: h.alisSayisi, gun: h.gunSayisi })}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{s.adet}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.raf}</TableCell>
                        <TableCell className="text-right tabular-nums">{nokta(h.enUcuz.fiyat, h.enUcuz.tarih)}</TableCell>
                        <TableCell className="text-right tabular-nums">{bicim.para(h.normal, "TRY")}</TableCell>
                        <TableCell className="text-right tabular-nums">{nokta(h.son.fiyat, h.son.tarih)}</TableCell>
                        <TableCell className="text-right tabular-nums">{bicim.yuzde(fark)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 md:hidden">
                {gorunen.map(({ satir: s, hafiza: h, fark }) => (
                  <ListeKarti
                    key={s.variantId}
                    baslik={<UrunAdi s={s} />}
                    altBaslik={<Kodlar s={s} etiket={kimlikEtiketi} />}
                    alanlar={[
                      { etiket: t("sutunIyiEnUcuz"), deger: nokta(h.enUcuz.fiyat, h.enUcuz.tarih) },
                      { etiket: t("sutunIyiSon"), deger: nokta(h.son.fiyat, h.son.tarih) },
                      { etiket: t("sutunIyiNormal"), deger: bicim.para(h.normal, "TRY") },
                      { etiket: t("sutunIyiFark"), deger: bicim.yuzde(fark) },
                      { etiket: t("sutunSatilan"), deger: String(s.adet) },
                      { etiket: t("sutunRaf"), deger: String(s.raf) },
                    ]}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UrunAdi({ s }: { s: { urunId: string | null; urunAdi: string } }) {
  return s.urunId === null ? (
    <span className="line-clamp-2 font-medium">{s.urunAdi}</span>
  ) : (
    <Link href={`/urunler/${s.urunId}`} className="line-clamp-2 font-medium underline underline-offset-2 hover:no-underline">
      {s.urunAdi}
    </Link>
  );
}

function Kodlar({ s, etiket }: { s: { sku: string; firmaSku: string | null; barkod: string | null }; etiket: { sku: string; firmaSku: string; barkod: string } }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      <KopyalanabilirKod deger={s.sku} etiket={etiket.sku} />
      {s.firmaSku ? <KopyalanabilirKod deger={s.firmaSku} etiket={etiket.firmaSku} /> : null}
      {s.barkod ? <KopyalanabilirKod deger={s.barkod} etiket={etiket.barkod} /> : null}
    </div>
  );
}
