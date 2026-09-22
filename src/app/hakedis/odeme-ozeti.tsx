import { getTranslations } from "next-intl/server";
import { ChevronDown, CircleCheck } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { SayfalamaCubugu } from "@/components/sayfalama";
import { SekmeliBolum } from "@/components/sekmeli-bolum";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import {
  kalemTuruDokumu,
  odemeToplamlari,
  siparisDokumu,
  type OdemeKalemi,
} from "@/lib/hakedis/model";
import { DURUM_KUTUSU } from "@/lib/renkler";
import type { Sayfalama } from "@/lib/sayfalama";
import { suzgecAdresi } from "@/lib/suzgec";

/**
 * ============================================================================
 *  ÖDEME ÖZETİ — PAZARYERİNİN KENDİ PANELİ GİBİ (22.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _"Çok karışık, anlamak mümkün değil… müşteri alışık olduğu
 *  arayüzde hakedişlerini görsün."_ Trendyol panelinin "Ödeme Özeti" düzeni
 *  birebir: Geçmiş / Gelecek ödemeler sekmesi · sipariş-fatura araması ·
 *  BİR SATIR = BİR ÖDEME (iri tutar, ödeme günü, durum rozeti) · ok ile
 *  açılınca kalem dökümü ve siparişler.
 *
 *  ⚠ VERİ DOĞRUYDU, SUNUM YANLIŞTI. Ölçüldü (22.09): defterdeki Trendyol
 *  ödeme emirleri panelin rakamlarıyla kuruşuna tutuyor (14.09 → 61.958,33 ·
 *  10.09 → 46.022,33 · 07.09 → 69.800,24). Eski "Detay" sekmesi aynı veriyi
 *  satış bazlı karşılaştırma ve kalem dökümü olarak basıyordu — doğru ama
 *  operasyoncunun aradığı şekil değil. O görünüm "Kontrol" sekmesine taşındı.
 *
 *  ⚠ AÇILIR KUTU `<details>` — tarayıcının kendi öğesi (bkz. `KatlanirBolum`):
 *  JavaScript yok, klavyeyle çalışır, telefonda dokunma hedefi 56 px.
 *
 *  ⚠ ARAMA KUTUSU ORTAK BİLEŞEN (İlke #7): sipariş no bir KOD alanıdır,
 *  kargo etiketindeki barkod kamerayla okunup aranabilir.
 * ============================================================================
 */

export type OdemeSatiri = {
  anahtar: string;
  kanalAdi: string;
  tarih: Date;
  toplam: number;
  brut: number;
  kesinti: number;
  paraBirimi: string;
  sayi: number;
  odemeEmriNo: string | null;
  kalemler: OdemeKalemi[];
};

export type OdemeKipi = "gecmis" | "gelecek";
export const ODEME_KIPI_PARAMETRESI = "odeme";
export const ODEME_ARAMA_PARAMETRESI = "q";

/** Açılan bir ödemede en fazla gösterilecek sipariş — kesme sessiz değil. */
const SIPARIS_SINIRI = 100;

export async function OdemeOzeti({
  kip,
  sorgu,
  sayfadakiler,
  suzulmusSayi,
  toplamlar,
  sayfalama,
  sp,
  kapsamDisiKanal,
}: {
  kip: OdemeKipi;
  sorgu: string;
  /** Yalnız bu sayfanın satırları. */
  sayfadakiler: OdemeSatiri[];
  /** Süzgecin TAMAMI — toplam ve "kaç ödeme" bundan. */
  suzulmusSayi: number;
  toplamlar: ReturnType<typeof odemeToplamlari>;
  sayfalama: Sayfalama;
  /** Adresteki mevcut süzgeçler (kanal · sekme · odeme · q · sayfa). */
  sp: Record<string, string | undefined>;
  /** Seçili kanalın otomatik çekimi yoksa NİYE boş olduğu yazılır. */
  kapsamDisiKanal: string | null;
}) {
  const t = await getTranslations("Hakedis");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const kipAdresi = (hedef: OdemeKipi) =>
    suzgecAdresi("/hakedis", sp, { [ODEME_KIPI_PARAMETRESI]: hedef });

  const liste = (
    <div className="space-y-3">
      {kapsamDisiKanal ? (
        <p className="text-muted-foreground text-sm">
          {t("odemeKapsamDisi", { kanal: kapsamDisiKanal })}
        </p>
      ) : null}

      {/* SÜZGECİN TOPLAMI — sayfanın değil (İlke #15). Sıfır da yazılır. */}
      <p className="text-sm font-medium">
        {t("odemeToplami", {
          sayi: suzulmusSayi,
          tutar:
            toplamlar.length === 0
              ? "—"
              : toplamlar.map((x) => bicim.para(x.tutar, x.paraBirimi)).join(" · "),
        })}
      </p>

      {sayfadakiler.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">
            {sorgu
              ? t("odemeAramaBos", { q: sorgu })
              : kip === "gecmis"
                ? t("odemeYokGecmis")
                : t("odemeYokGelecek")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sayfadakiler.map((o) => {
            const turler = kalemTuruDokumu(o.kalemler);
            const siparisler = siparisDokumu(o.kalemler);
            return (
              <details key={o.anahtar} className="group rounded-lg border">
                <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-lg leading-tight font-semibold tabular-nums">
                      {bicim.para(o.toplam, o.paraBirimi)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {kip === "gecmis" ? t("odemeGunu") : t("tahminiOdemeGunu")}:{" "}
                      {bicim.tarih(o.tarih)}
                      {" · "}
                      {t("kalemSayisi", { sayi: o.sayi })}
                      {/* Yalnız GERÇEK bir emir numarası varsa (TY). HB'de yok. */}
                      {o.odemeEmriNo ? (
                        <>
                          {" · "}
                          {t("odemeEmriNo")} {o.odemeEmriNo}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Badge variant="outline">{o.kanalAdi}</Badge>
                  {kip === "gecmis" ? (
                    <Badge className={DURUM_KUTUSU.olumlu}>
                      <CircleCheck className="size-3.5" />
                      {t("odemeYapildi")}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{t("tahminiHesaplanmistir")}</Badge>
                  )}
                  {/* Ok yönü açık/kapalı durumu SÖYLER (İlke #2). */}
                  <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>

                <div className="space-y-4 border-t p-3">
                  {/* RAKAMIN TABANI: gelecek TY ödemesinde brüt − tahmini kesinti. */}
                  {o.kesinti > 0 ? (
                    <p className="text-muted-foreground text-xs">
                      {t("kesintiSerhi", {
                        brut: bicim.para(o.brut, o.paraBirimi),
                        kesinti: bicim.para(o.kesinti, o.paraBirimi),
                      })}
                    </p>
                  ) : null}

                  {/* ① TÜR DÖKÜMÜ — kanalın kendi adlarıyla; toplamı satırın brütüne eşit. */}
                  <div className="max-w-2xl">
                    <p className="mb-1 text-sm font-medium">{t("kalemTuruDokumu")}</p>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("sutunTur")}</TableHead>
                            <TableHead className="text-right">{t("sutunAdet")}</TableHead>
                            <TableHead className="text-right">{t("sutunTutar")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {turler.map((x) => (
                            <TableRow key={x.tur}>
                              <TableCell>{x.tur}</TableCell>
                              <TableCell className="text-right">{x.adet}</TableCell>
                              <TableCell className="text-right whitespace-nowrap tabular-nums">
                                {bicim.para(x.tutar, o.paraBirimi)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell className="font-medium">{ortak("toplam")}</TableCell>
                            <TableCell className="text-right font-medium">{o.sayi}</TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                              {bicim.para(o.brut, o.paraBirimi)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* ② SİPARİŞLER — sipariş numarası olan kalemler; sistemdeki satışa bağlıysa link. */}
                  {siparisler.length > 0 ? (
                    <div className="max-w-2xl">
                      <p className="mb-1 text-sm font-medium">
                        {t("siparisler", { sayi: siparisler.length })}
                      </p>
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{ortak("siparisNo")}</TableHead>
                              <TableHead className="text-right">{t("sutunKalem")}</TableHead>
                              <TableHead className="text-right">{t("sutunTutar")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {siparisler.slice(0, SIPARIS_SINIRI).map((s) => (
                              <TableRow key={s.siparisNo}>
                                <TableCell>
                                  {s.saleId ? (
                                    <Baglanti href={`/satislar/${s.saleId}`}>{s.siparisNo}</Baglanti>
                                  ) : (
                                    <KopyalanabilirKod deger={s.siparisNo} etiket={ortak("siparisNo")} />
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{s.adet}</TableCell>
                                <TableCell className="text-right whitespace-nowrap tabular-nums">
                                  {bicim.para(s.tutar, o.paraBirimi)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {siparisler.length > SIPARIS_SINIRI ? (
                        <p className="mt-1 text-sm font-medium">
                          {t("listeKesildi", { gosterilen: SIPARIS_SINIRI, toplam: siparisler.length })}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground mt-1 text-xs">{t("siparisDisiNotu")}</p>
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      )}

      <SayfalamaCubugu sayfalama={sayfalama} yol="/hakedis" parametreler={sp} />
    </div>
  );

  return (
    <SekmeliBolum
      baslik={t("odemeOzetiBaslik")}
      notu={t("odemeOzetiNotu")}
      ustEylem={
        <KodAramaKutusu
          temelAdres="/hakedis"
          baslangic={sorgu}
          tasinanlar={sp}
          parametre={ODEME_ARAMA_PARAMETRESI}
          ipucu={t("odemeAramaIpucu")}
        />
      }
      secili={kip}
      sekmeler={[
        {
          anahtar: "gecmis",
          etiket: t("gecmisOdemeler"),
          adres: kipAdresi("gecmis"),
          icerik: kip === "gecmis" ? liste : null,
        },
        {
          anahtar: "gelecek",
          etiket: t("gelecekOdemeler"),
          adres: kipAdresi("gelecek"),
          icerik: kip === "gelecek" ? liste : null,
        },
      ]}
    />
  );
}
