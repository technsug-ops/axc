import { ChartLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";

import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import {
  BUYBOX_KANALLARI,
  BUYBOX_LISTELERI,
  buyboxAra,
  buyboxFarki,
  buyboxListesi,
  buyboxOzeti,
  type BuyboxKanali,
  type BuyboxListesi,
  type BuyboxSatiri,
} from "@/lib/buybox";
import { ISTATISTIK_ARALIKLARI, rakipliOzet, type IstatistikAraligi } from "@/lib/buybox-istatistik";
import { buyboxDurumlari, buyboxUrunleri } from "@/lib/buybox-verisi";
import { SEKME_SERIDI, sekmeSinifi } from "@/lib/kutu-bicimi";
import { DURUM_YAZISI } from "@/lib/renkler";
import { suzgecAdresi } from "@/lib/suzgec";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";

import { BuyboxGecmisi } from "./buybox-gecmisi";
import { FiyatKutusu } from "./fiyat-kutusu";

/**
 * ============================================================================
 *  BUYBOX DURUMU — K363 Faz 3-a (kullanıcı kararı 25.10.2026: «Satarken:
 *  Buybox'ı kaybettiklerim» + «her ikisi de»)
 * ----------------------------------------------------------------------------
 *  Rafta olan ve kanalda ilanı bulunan ürünlerin Buybox durumu, kanal başına,
 *  o anki canlı sorguyla (resmî satıcı API'leri). Hesap `lib/buybox.ts`te,
 *  okuma `lib/buybox-verisi.ts`te; burası çizer.
 *  FİYAT: Faz 3-c'den beri satırdaki fiyat kutusundan (Hesapla → kâr → Kaydet
 *  → onay) YALNIZ Trendyol'a, YALNIZ fiyat gönderilir (`fiyat-kutusu.tsx`).
 *  ESKİ KURAL VE NİYE ÇEVRİLDİ: «Fiyat buradan DEĞİŞTİRİLMEZ — Ürün kartına
 *  götürülür» yazılıydı (Faz 3-a); kullanıcı 25.10 satırda gönderim istedi.
 *  Gönderim kartın eylemiyle aynı (izli, sunucu yeniden çözer). Liste canlıdır ve kaydedilmez;
 *  geçmiş grafiği saatlik zamanlayıcının yazdığı ölçümlerden okur (Faz 3-b).
 *  Denetim sayıları AYRI yazılır: incelenen · Buybox bizde · kaybedilen ·
 *  görünmüyor · sorgulanamadı (boş sonuç «temiz» sayılmaz).
 * ============================================================================
 */
export const dynamic = "force-dynamic";
/** İki kanal × ~21 parti + TY fiyat listesi; ölçüldü 25.10: TY ~4 sn, HB ~1 sn. Pay bırakılır. */
export const maxDuration = 60;

const YOL = "/rapor/buybox";

export async function generateMetadata() {
  const t = await getTranslations("Buybox");
  return { title: t("baslik") };
}

function kanalCoz(ham: string | undefined): BuyboxKanali {
  return (BUYBOX_KANALLARI as readonly string[]).includes(ham ?? "") ? (ham as BuyboxKanali) : "TY";
}
function listeCoz(ham: string | undefined): BuyboxListesi {
  return (BUYBOX_LISTELERI as readonly string[]).includes(ham ?? "") ? (ham as BuyboxListesi) : "kaybedilen";
}
function aralikCoz(ham: string | undefined): IstatistikAraligi {
  return (ISTATISTIK_ARALIKLARI as readonly string[]).includes(ham ?? "") ? (ham as IstatistikAraligi) : "bugun";
}

export default async function BuyboxSayfasi({ searchParams }: { searchParams: Promise<{ kanal?: string; liste?: string; q?: string; aralik?: string; grafik?: string }> }) {
  await sayfaIzni("rapor.gor");
  const p = await searchParams;
  const t = await getTranslations("Buybox");
  const bicim = await bicimlendirici();
  const kanal = kanalCoz(p.kanal);
  const liste = listeCoz(p.liste);
  const arama = p.q?.trim() || null;
  const aralik = aralikCoz(p.aralik);
  /**
   * Geçmiş grafiği İSTENİNCE açılır (kullanıcı kararı 25.10.2026: «grafik
   * istendiği zaman sayı kutularının yanında düğme olabilir»). Seçim adreste
   * (İlke #13: sekme/açılış URL'ye yazılır); kapalıyken geçmiş sorgulanmaz.
   */
  const grafikAcik = p.grafik === "1";

  /** Faz 3-c fiyat kutusu: kâr görme izni (kartla aynı kapı) · Kaydet yalnız kanala yazma izniyle. */
  const [karGorunur, gonderebilir] = await Promise.all([izinVarMi("satis.kar.gor"), izinVarMi("kanal.yaz")]);
  const kutu = (s: BuyboxSatiri) =>
    karGorunur ? (
      <FiyatKutusu variantId={s.variantId} kanal={kanal} urunAdi={s.urunAdi} bizimFiyat={s.bizimFiyat} buyboxFiyati={s.buyboxFiyati} gonderebilir={gonderebilir} />
    ) : null;

  const sorguAni = new Date();
  const urunler = await buyboxUrunleri(kanal, { yalnizStoklu: true });
  const sonuc = await buyboxDurumlari(kanal, urunler);
  const ozet = buyboxOzeti(sonuc.satirlar);
  /** Sekme sayısı: aramadan BAĞIMSIZ tam liste (İlke #17). */
  const sekmeSayisi = (l: BuyboxListesi) => buyboxListesi(sonuc.satirlar, l).length;
  const tamListe = buyboxListesi(sonuc.satirlar, liste);
  const gorunen = buyboxAra(tamListe, arama);
  const rafta = gorunen.reduce((s, x) => s + x.stok, 0);

  /** Aralık varsayılanı adrese yazılmaz (temiz adres); seçilince taşınır. */
  const tasinan = { kanal, liste, q: arama ?? undefined, aralik: aralik === "bugun" ? undefined : aralik, grafik: grafikAcik ? "1" : undefined };
  const adres = (ek: Record<string, string | undefined>) => suzgecAdresi(YOL, tasinan, ek);
  const kimlikEtiketi = { sku: t("sku"), firmaSku: t("firmaSku"), barkod: t("barkod"), kanalKodu: t(`kanalKodu_${kanal}`) };
  const para = (n: number | null) => (n === null ? t("bilinmiyor") : bicim.para(n, "TRY"));
  const farkYaz = (s: BuyboxSatiri) => {
    const f = buyboxFarki(s);
    return f === null ? "—" : t("fark", { tl: bicim.para(f.tl, "TRY"), yuzde: bicim.yuzde(f.yuzde) });
  };
  const siraYaz = (s: BuyboxSatiri) =>
    s.siramiz === null ? t(`durum_${s.durum}`) : s.saticiSayisi === null ? t("sira", { sira: s.siramiz }) : t("siraSatici", { sira: s.siramiz, satici: s.saticiSayisi });

  return (
    <div className="min-w-0 space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("notu")}</p>
      </div>

      {/* ── KANAL — adreste yaşar ── */}
      <div className="flex flex-wrap gap-2">
        {BUYBOX_KANALLARI.map((k) => (
          <Link
            key={k}
            href={adres({ kanal: k, liste: "kaybedilen", q: undefined })}
            aria-current={k === kanal ? "true" : undefined}
            className={
              "inline-flex h-11 shrink-0 items-center rounded-md border px-4 text-sm font-medium transition-colors " +
              (k === kanal ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted")
            }
          >
            {t(`kanal_${k}`)}
          </Link>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">{t("sorguAni", { an: bicim.tarihSaat(sorguAni), sayi: ozet.incelenen })}</p>
      {!urunler.hesapVar ? <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("hesapYok")}</p> : null}
      {sonuc.sebepler.length > 0 ? (
        <div className={`space-y-0.5 text-sm ${DURUM_YAZISI.uyari}`}>
          <p>{t("sorunlar")}</p>
          {sonuc.sebepler.map((s) => (
            <p key={s} className="text-xs">· {s === "KIMLIK_YOK" ? t("kimlikYok") : s === "HB_MAGAZA_ADI_YOK" ? t("magazaAdiYok") : s}</p>
          ))}
        </div>
      ) : null}

      {/* ── DENETİM SAYILARI — hepsi ayrı; tıklanınca o liste açılır (İlke #16) ── */}
      <div className="grid max-w-5xl grid-cols-2 gap-2 md:grid-cols-6">
        <IstatistikKutusu etiket={t("ozetIncelenen")} cocuk={ozet.incelenen} />
        <Link href={adres({ liste: "birinci" })} className="no-underline"><IstatistikKutusu etiket={t("ozetBirinci")} cocuk={ozet.birinci} /></Link>
        <Link href={adres({ liste: "kaybedilen" })} className="no-underline"><IstatistikKutusu etiket={t("ozetKaybedilen")} cocuk={ozet.kaybedilen} /></Link>
        <Link href={adres({ liste: "gorunmuyor" })} className="no-underline"><IstatistikKutusu etiket={t("ozetGorunmuyor")} cocuk={ozet.gorunmuyor} /></Link>
        <Link href={adres({ liste: "gorunmuyor" })} className="no-underline"><IstatistikKutusu etiket={t("ozetSorgulanamadi")} cocuk={ozet.sorgulanamadi} /></Link>
        {/* Grafik düğmesi — kutularla aynı boy, görünür eylem (İlke #1/#2). */}
        <Link
          href={adres({ grafik: grafikAcik ? undefined : "1" })}
          aria-expanded={grafikAcik}
          className="bg-card hover:bg-muted flex min-h-11 items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium underline-offset-2 transition-colors hover:underline"
        >
          <ChartLine className="size-5 shrink-0" aria-hidden />
          {grafikAcik ? t("grafikGizle") : t("grafikGoster")}
        </Link>
      </div>

      {/* ── GEÇMİŞ (K363 Faz 3-b) — istenince: saatlik ölçümlerden grafik + kazanma oranı ── */}
      {grafikAcik ? (
        <BuyboxGecmisi
          kanal={kanal}
          aralik={aralik}
          adres={(a) => adres({ aralik: a === "bugun" ? undefined : a })}
          canli={rakipliOzet(sonuc.satirlar)}
        />
      ) : null}

      {/* ── LİSTE SEKMELERİ — sayılar aramadan bağımsız ── */}
      <div className={SEKME_SERIDI}>
        {BUYBOX_LISTELERI.map((l) => (
          <Link key={l} href={adres({ liste: l })} aria-current={l === liste ? "page" : undefined} className={sekmeSinifi(l === liste)}>
            {t(`liste_${l}`)} ({sekmeSayisi(l)})
          </Link>
        ))}
      </div>
      <p className="text-sm">{t(`aciklama_${liste}`)}</p>

      <div className="max-w-3xl">
        <KodAramaKutusu temelAdres={YOL} baslangic={arama ?? ""} tasinanlar={{ kanal, liste, ...(tasinan.aralik ? { aralik: tasinan.aralik } : {}), ...(tasinan.grafik ? { grafik: tasinan.grafik } : {}) }} ipucu={t("aramaIpucu")} />
      </div>

      {/* ── TOPLAM — ekranda ne varsa onun (İlke #15) ── */}
      <div className="grid max-w-md grid-cols-2 gap-2">
        <IstatistikKutusu etiket={t("toplamUrun")} cocuk={gorunen.length} />
        <IstatistikKutusu etiket={t("toplamRaf")} cocuk={rafta} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(`liste_${liste}`)}</CardTitle>
          {arama ? <p className="text-muted-foreground text-sm">{t("aramaSonucu", { sayi: gorunen.length, toplam: tamListe.length })}</p> : null}
        </CardHeader>
        <CardContent className="min-w-0">
          {gorunen.length === 0 ? (
            <div className="space-y-1 py-8 text-center">
              <p className="text-sm font-medium">{t("listeBos")}</p>
              <p className="text-muted-foreground text-sm">{ozet.incelenen === 0 ? t("urunYok") : t("listeBosSebep")}</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunUrun")}</TableHead>
                      <TableHead className="text-right">{t("sutunStok")}</TableHead>
                      <TableHead className="text-right">{t("sutunBizim")}</TableHead>
                      <TableHead className="text-right">{t("sutunBuybox")}</TableHead>
                      <TableHead className="text-right">{t("sutunSira")}</TableHead>
                      <TableHead className="text-right">{t("sutunFark")}</TableHead>
                      <TableHead className="text-right">{t("sutunIkinci")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gorunen.map((s) => (
                      <TableRow key={s.variantId}>
                        <TableCell className="max-w-md align-top whitespace-normal">
                          <div className="min-w-0 space-y-0.5">
                            <UrunAdi s={s} />
                            <Kodlar s={s} etiket={kimlikEtiketi} />
                            <Link href={`/kart/${s.variantId}`} className="text-xs underline underline-offset-2 hover:no-underline">
                              {t("kartaGit")}
                            </Link>
                            <Rakipler s={s} baslik={t("rakipler", { sayi: s.rakipler.length })} listeFiyati={(f) => t("listeFiyati", { fiyat: f })} para={para} />
                            {kutu(s)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top tabular-nums">{s.stok}</TableCell>
                        <TableCell className="text-right align-top tabular-nums">{para(s.bizimFiyat)}</TableCell>
                        <TableCell className="text-right align-top tabular-nums">
                          {para(s.buyboxFiyati)}
                          {s.buyboxSaticisi ? <div className="text-muted-foreground text-xs">{s.buyboxSaticisi}</div> : null}
                        </TableCell>
                        <TableCell className="text-right align-top tabular-nums">{siraYaz(s)}</TableCell>
                        <TableCell className="text-right align-top tabular-nums">{farkYaz(s)}</TableCell>
                        <TableCell className="text-right align-top tabular-nums">{s.ikinciFiyat === null ? "—" : para(s.ikinciFiyat)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 md:hidden">
                {gorunen.map((s) => (
                  <ListeKarti
                    key={s.variantId}
                    baslik={<UrunAdi s={s} />}
                    altBaslik={
                      <div className="space-y-1">
                        <Kodlar s={s} etiket={kimlikEtiketi} />
                        <Link href={`/kart/${s.variantId}`} className="inline-flex min-h-11 items-center text-xs underline underline-offset-2">
                          {t("kartaGit")}
                        </Link>
                        {kutu(s)}
                      </div>
                    }
                    alanlar={[
                      { etiket: t("sutunSira"), deger: siraYaz(s) },
                      { etiket: t("sutunBizim"), deger: para(s.bizimFiyat) },
                      { etiket: t("sutunBuybox"), deger: s.buyboxSaticisi ? `${para(s.buyboxFiyati)} · ${s.buyboxSaticisi}` : para(s.buyboxFiyati) },
                      { etiket: t("sutunFark"), deger: farkYaz(s) },
                      { etiket: t("sutunIkinci"), deger: s.ikinciFiyat === null ? "—" : para(s.ikinciFiyat) },
                      { etiket: t("sutunStok"), deger: String(s.stok) },
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

function UrunAdi({ s }: { s: BuyboxSatiri }) {
  return s.urunId === null ? (
    <span className="line-clamp-2 font-medium">{s.urunAdi}</span>
  ) : (
    <Link href={`/urunler/${s.urunId}`} className="line-clamp-2 font-medium underline underline-offset-2 hover:no-underline">
      {s.urunAdi}
    </Link>
  );
}

function Kodlar({ s, etiket }: { s: BuyboxSatiri; etiket: { sku: string; firmaSku: string; barkod: string; kanalKodu: string } }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      <KopyalanabilirKod deger={s.sku} etiket={etiket.sku} />
      {s.firmaSku ? <KopyalanabilirKod deger={s.firmaSku} etiket={etiket.firmaSku} /> : null}
      {s.barkod ? <KopyalanabilirKod deger={s.barkod} etiket={etiket.barkod} /> : null}
      {s.kanalKodu !== s.barkod ? <KopyalanabilirKod deger={s.kanalKodu} etiket={etiket.kanalKodu} /> : null}
    </div>
  );
}

/** HB'de o üründeki bütün satıcılar — açılır liste (TY rakip adı vermiyor). */
function Rakipler({ s, baslik, listeFiyati, para }: { s: BuyboxSatiri; baslik: string; listeFiyati: (fiyat: string) => string; para: (n: number | null) => string }) {
  if (s.rakipler.length === 0) return null;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer underline underline-offset-2">{baslik}</summary>
      <ol className="mt-1 space-y-0.5">
        {s.rakipler.map((r) => (
          <li key={`${r.sira}-${r.satici}`} className={r.sira === s.siramiz ? "font-medium" : undefined}>
            {r.sira}. {r.satici} · {para(r.fiyat)}
            {r.listeFiyati !== null && r.listeFiyati !== r.fiyat ? ` (${listeFiyati(para(r.listeFiyati))})` : ""}
          </li>
        ))}
      </ol>
    </details>
  );
}
