import { ChartLine, IdCard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";

import { DurumRozeti } from "@/components/durum-rozeti";
import { IkiSatir } from "@/components/iki-satir";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { IRI_EYLEM_SINIFI, SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { UrunGorseli } from "@/components/urun-gorseli";
import { UzunAd } from "@/components/uzun-ad";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import {
  BUYBOX_KANALLARI,
  BUYBOX_LISTELERI,
  buyboxAra,
  buyboxFarki,
  buyboxListesi,
  buyboxOzeti,
  durumTonu,
  esitAmaKayip,
  farkTonu,
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
import { FiyatPenceresi } from "./fiyat-penceresi";

/**
 * ============================================================================
 *  BUYBOX DURUMU — K363 Faz 3-a (kullanıcı kararı 25.10.2026: «Satarken:
 *  Buybox'ı kaybettiklerim» + «her ikisi de»)
 * ----------------------------------------------------------------------------
 *  Rafta olan ve kanalda ilanı bulunan ürünlerin Buybox durumu, kanal başına,
 *  o anki canlı sorguyla (resmî satıcı API'leri). Hesap `lib/buybox.ts`te,
 *  okuma `lib/buybox-verisi.ts`te; burası çizer.
 *  FİYAT: Faz 3-c'den beri satırın «Fiyatla» eyleminin penceresinden (kâr →
 *  Kaydet → onay) Trendyol'a ya da Hepsiburada'ya YALNIZ fiyat gönderilir
 *  (`fiyat-penceresi.tsx`). Tablo düzeni Satışlar'la aynı (26.10.2026).
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

  /** Faz 3-c fiyat penceresi: kâr görme izni (kartla aynı kapı) · Kaydet yalnız kanala yazma izniyle. */
  const [karGorunur, gonderebilir, resimEkleyebilir] = await Promise.all([izinVarMi("satis.kar.gor"), izinVarMi("kanal.yaz"), izinVarMi("urun.yaz")]);
  /**
   * SATIR EYLEMLERİ — Satışlar'la aynı düzen (kullanıcı 26.10.2026: «çok
   * düzensiz, Satışlar sayfasını referans al»): masaüstünde ikon, telefonda
   * ikon + ad. Aynı fonksiyon iki görünümde (İlke #10). ⚠ Pencere KANAL +
   * ürünle anahtarlanır: yalnız ürünle anahtarlanınca TY sekmesinden HB'ye
   * geçişte aynı ürünün TY durumu (fiyat + zemin) HB satırında kalıyordu.
   */
  const eylemler = (s: BuyboxSatiri) => (
    <>
      {karGorunur ? (
        <FiyatPenceresi
          key={`${kanal}:${s.variantId}`}
          variantId={s.variantId}
          kanal={kanal}
          urunAdi={s.urunAdi}
          durum={s.durum}
          bizimFiyat={s.bizimFiyat}
          bizimListeFiyati={s.bizimListeFiyati}
          indirim={s.kanalIndirimi}
          buyboxFiyati={s.buyboxFiyati}
          ikinciFiyat={s.ikinciFiyat}
          esitNotu={esitAmaKayip(s) ? t("esitAmaKayip") : null}
          gonderebilir={gonderebilir}
        />
      ) : null}
      <SatirEylemi href={`/kart/${s.variantId}`} ikon={IdCard} etiket={t("kartaGit")} className={IRI_EYLEM_SINIFI} />
    </>
  );

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
  /** HB kendi indirimi varsa müşteri fiyatının yanında ilandaki fiyatımız (kâr ve ödeme tabanı). */
  const bizimYaz = (s: BuyboxSatiri) =>
    s.kanalIndirimi > 0 && s.bizimListeFiyati !== null ? t("bizimListeli", { fiyat: para(s.bizimFiyat), liste: para(s.bizimListeFiyati) }) : para(s.bizimFiyat);
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

      <div className="space-y-1">
        <h2 className="text-base font-semibold">{t(`liste_${liste}`)}</h2>
        {arama ? <p className="text-muted-foreground text-sm">{t("aramaSonucu", { sayi: gorunen.length, toplam: tamListe.length })}</p> : null}
      </div>

      {gorunen.length === 0 ? (
        <div className="space-y-1 rounded-lg border py-8 text-center">
          <p className="text-sm font-medium">{t("listeBos")}</p>
          <p className="text-muted-foreground text-sm">{ozet.incelenen === 0 ? t("urunYok") : t("listeBosSebep")}</p>
        </div>
      ) : (
        <>
          {/* MASAÜSTÜ — Satışlar düzeni (kullanıcı 26.10.2026): ilişkili iki bilgi
              tek sütunda üst üste (`IkiSatir`), durumlar rozet, iş «Eylemler»de. */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sutunUrun")}</TableHead>
                  <TableHead className="text-right">{t("sutunFiyatlar")}</TableHead>
                  <TableHead>{t("sutunDurum")}</TableHead>
                  <TableHead className="text-right">{t("sutunIkinci")}</TableHead>
                  <TableHead className="text-right">{t("sutunStok")}</TableHead>
                  <TableHead>{t("sutunEylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gorunen.map((s) => (
                  <TableRow key={`${kanal}:${s.variantId}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <UrunGorseli ekleyebilir={resimEkleyebilir} variantId={s.variantId} url={s.gorselUrl ?? null} kaynak={s.gorselKaynak ?? null} ad={s.urunAdi} />
                        <div className="min-w-0 space-y-0.5">
                          <UzunAd metin={s.urunAdi} href={s.urunId === null ? undefined : `/urunler/${s.urunId}`} className="max-w-[20rem]" />
                          <Kodlar s={s} etiket={kimlikEtiketi} hizali />
                          <Rakipler s={s} baslik={t("rakipler", { sayi: s.rakipler.length })} listeFiyati={(f) => t("listeFiyati", { fiyat: f })} para={para} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      <IkiSatir
                        ust={<span className="font-medium">{t("bizimKisa", { fiyat: bizimYaz(s) })}</span>}
                        alt={s.buyboxSaticisi ? t("buyboxKisaSatici", { fiyat: para(s.buyboxFiyati), satici: s.buyboxSaticisi }) : t("buyboxKisa", { fiyat: para(s.buyboxFiyati) })}
                        altIpucu={s.buyboxSaticisi ?? undefined}
                        enGenis="max-w-[19rem] ml-auto"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <DurumRozeti durum={durumTonu(s.durum)}>{siraYaz(s)}</DurumRozeti>
                        {farkYaz(s) !== "—" ? <DurumRozeti durum={farkTonu(s)}>{farkYaz(s)}</DurumRozeti> : null}
                        {esitAmaKayip(s) ? <span className={`max-w-[11rem] text-xs leading-snug whitespace-normal ${DURUM_YAZISI.uyari}`}>{t("esitKisa")}</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">{s.ikinciFiyat === null ? "—" : para(s.ikinciFiyat)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">{s.stok}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <SatirEylemleri>{eylemler(s)}</SatirEylemleri>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* TELEFON — Satışlar'daki kart (görsel · ad · kodlar · kutucuklar · eylemler). */}
          <div className="space-y-3 md:hidden">
            {gorunen.map((s) => (
              <ListeKarti
                key={`${kanal}:${s.variantId}`}
                gorsel={<UrunGorseli ekleyebilir={resimEkleyebilir} variantId={s.variantId} url={s.gorselUrl ?? null} kaynak={s.gorselKaynak ?? null} ad={s.urunAdi} boyut={48} />}
                baslik={<UrunAdi s={s} />}
                altBaslik={<Kodlar s={s} etiket={kimlikEtiketi} />}
                alanlar={[
                  { etiket: t("sutunSira"), deger: <span className={DURUM_YAZISI[durumTonu(s.durum)]}>{siraYaz(s)}</span> },
                  { etiket: t("sutunBizim"), deger: bizimYaz(s) },
                  { etiket: t("sutunBuybox"), deger: s.buyboxSaticisi ? `${para(s.buyboxFiyati)} · ${s.buyboxSaticisi}` : para(s.buyboxFiyati) },
                  { etiket: t("sutunFark"), deger: <span className={DURUM_YAZISI[farkTonu(s)]}>{farkYaz(s)}</span> },
                  { etiket: t("sutunIkinci"), deger: s.ikinciFiyat === null ? "—" : para(s.ikinciFiyat) },
                  { etiket: t("sutunStok"), deger: String(s.stok) },
                ]}
                not={esitAmaKayip(s) ? <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("esitKisa")}</p> : undefined}
                eylemler={eylemler(s)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UrunAdi({ s }: { s: BuyboxSatiri }) {
  return s.urunId === null ? (
    <span>{s.urunAdi}</span>
  ) : (
    <Link href={`/urunler/${s.urunId}`} className="underline underline-offset-2 hover:no-underline">
      {s.urunAdi}
    </Link>
  );
}

function Kodlar({ s, etiket, hizali = false }: { s: BuyboxSatiri; etiket: { sku: string; firmaSku: string; barkod: string; kanalKodu: string }; hizali?: boolean }) {
  /**
   * HİZALI (masaüstü tablo, kullanıcı 26.10.2026 «bunlar bir düzende olsun»):
   * dört kod SABİT genişlikte dört yuvada — eksik kod yuvasını boş bırakır, sonraki
   * kod kaymaz; satırlar alt alta aynı hizada okunur. Telefonda kart alt başlığı
   * tek satır kırpılır, orada akış düzeni kalır.
   */
  if (hizali) {
    const yuva = "min-w-0";
    return (
      <div className="text-muted-foreground grid grid-cols-[7.75rem_7.75rem_7.75rem_8.25rem] items-center gap-x-2 text-xs">
        <span className={yuva}><KopyalanabilirKod deger={s.sku} etiket={etiket.sku} /></span>
        <span className={yuva}>{s.firmaSku ? <KopyalanabilirKod deger={s.firmaSku} etiket={etiket.firmaSku} /> : null}</span>
        <span className={yuva}>{s.barkod ? <KopyalanabilirKod deger={s.barkod} etiket={etiket.barkod} /> : null}</span>
        <span className={yuva}>{s.kanalKodu !== s.barkod ? <KopyalanabilirKod deger={s.kanalKodu} etiket={etiket.kanalKodu} /> : null}</span>
      </div>
    );
  }
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
