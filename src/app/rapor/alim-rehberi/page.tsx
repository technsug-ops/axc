/* SUTUN TAVANI ISTISNASI: 8 — 8. sutun (Piyasa/Buybox) YALNIZ «Piyasa fiyatini getir» basilinca cizilir, varsayilan 7; piksel genisligi OLCULMEDI. K363 Faz 3-a · gercek cihazda bakilacak 25.10.2026. */
import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";
import { Download } from "lucide-react";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { ListeToplami } from "@/components/liste-toplami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { SEKME_SERIDI, sekmeSayaciSinifi, sekmeSinifi, SECIM_AKTIF, SECIM_PASIF } from "@/lib/kutu-bicimi";
import {
  azStokCoz,
  donemCoz,
  eksikAdet,
  EN_AZ_ADET,
  esikleriKur,
  gecenYilListesi,
  ileriCoz,
  ILERI_GUNLER,
  listeCoz,
  REHBER_DONEMLERI,
  REHBER_LISTELERI,
  REHBER_SEKMELERI,
  REHBER_YOLU,
  rehberAra,
  rehberListesi,
  rehberToplami,
  VARSAYILAN_AZ_STOK_GUN,
  type RehberSatiri,
  type RehberSekmesi,
} from "@/lib/rapor/alim-rehberi";
import { rehberVerisi } from "@/lib/rapor/alim-rehberi-verisi";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { YAKLASAN_GUN, yaklasanlar } from "@/lib/ozel-gun/ozel-gun";
import { ozelGunDetayi, ozelGunKayitlari } from "@/lib/ozel-gun/ozel-gun-verisi";
import { OzelGunSekmesi } from "./ozel-gun-sekmesi";
import { IyiAlimSekmesi } from "./iyi-alim-sekmesi";
import { FiyatTakibiSekmesi } from "./fiyat-takibi-sekmesi";
import { fiyatTakibiSuzgeciCoz } from "@/lib/alim-hedefi";
import { alimHedefleri, takipKanallari } from "@/lib/alim-hedefi-verisi";
import { ONERI_KAYNAKLARI, oneriKaynagiCoz, oneriKumesi, type OneriKaynagi } from "@/lib/alim-hedefi-oneri";
import { FiyatTakibiOnerileri } from "./fiyat-takibi-oneri";
import { iyiAlimAra, iyiAlimListesi } from "@/lib/alim-fiyat-hafizasi";
import { PIYASA_TAVAN } from "@/lib/buybox";
import { piyasaFiyatlari } from "@/lib/buybox-verisi";
import { tryHafizalari } from "@/lib/alim-fiyat-hafizasi-verisi";
import { suzgecAdresi } from "@/lib/suzgec";
import { DURUM_YAZISI } from "@/lib/renkler";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  ALIM REHBERİ — K363 Faz 1 (kullanıcı kararı 23.10.2026)
 * ----------------------------------------------------------------------------
 *  Dört liste, kendi verimizden: tükenen yıldızlar · azalan yıldızlar · fazla
 *  stok · hızlı ama kârsız. Hesap `lib/rapor/alim-rehberi.ts`te (saf, değer
 *  testli); burası yalnız okur ve çizer.
 *  ⚠ AYRI SAYFA, Ürün analizinin İÇİNE GÖMÜLMEDİ: o sayfanın iki ekseni ayrı
 *  kümelere bakıyor ve onlarca bekçi yapısına bağlı. Rakamlar yine AYNI
 *  gövdelerden gelir (iki ekran aynı ürüne aynı adedi yazar).
 *  ⚠ İzin: `rapor.gor` (sayfa) + `satis.kar.gor` (listeler marja dayanır —
 *  kâr göremeyen rol için sebebi yazılır, boş liste gösterilmez).
 *  ⚠ Sekme sayıları ARAMADAN BAĞIMSIZ bütün listeyi sayar (İlke #17); arama
 *  açıkken «aramada N» ayrıca yazar.
 *  Faz 2-a (23.10.2026): beşinci sekme «Geçen yıl bu dönem» — dönem yerine
 *  «önümüzdeki N gün», «kaç günlük stok» yerine «eksik»; uyarı ve kapsam
 *  (defter o tarihlere bakabiliyor mu) ekranda yazar.
 *  Faz 2-b (24.10.2026): altıncı sekme «Özel günler» — yaklaşan günün geçen
 *  yılki karşılığı (`lib/ozel-gun`); çizimi `ozel-gun-sekmesi.tsx`. Sekme
 *  sayısı GÜN sayısıdır; Excel düğmesi bu sekmede çizilmez.
 * ============================================================================
 */

/** K363 Faz 3-a: «Piyasa fiyatını getir» canlı Buybox sorgusu yapar (en çok 100 ürün × 2 kanal) — süre payı. */
export const maxDuration = 60;

export async function generateMetadata() {
  const t = await getTranslations("AlimRehberi");
  return { title: t("baslik") };
}

export default async function AlimRehberiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; liste?: string; az?: string; ileri?: string; q?: string; gun?: string; piyasa?: string; ft?: string; fk?: string; fr?: string }>;
}) {
  await sayfaIzni("rapor.gor");
  const p = await searchParams;
  const t = await getTranslations("AlimRehberi");
  const bicim = await bicimlendirici();

  const donem = donemCoz(p.donem);
  const liste = listeCoz(p.liste);
  const azStok = azStokCoz(p.az);
  const ileri = ileriCoz(p.ileri);
  /** Faz 2-a: «Geçen yıl bu dönem» sekmesi — dönem yerine «önümüzdeki N gün», «stok günü» yerine «eksik». */
  const gy = liste === "gecenYil";
  /** Faz 2-b: «Özel günler» sekmesi — kendi bileşeni çizer; dönem, eşik, az stok ve Excel bu sekmede yok. */
  const oz = liste === "ozelGun";
  /** Faz 2-d: «Kampanyada iyi aldıkların» — dönem seçimi kalır (satılan dönemde ölçülür); eşik, az stok ve Excel bu sekmede yok. */
  const ia = liste === "iyiAlim";
  /** Faz 3-d: «Fiyat takibi» — kendi bileşeni çizer; dönem, eşik, az stok, Excel ve piyasa düğmesi bu sekmede yok. */
  const ft = liste === "fiyatTakibi";
  const ftSuzgec = fiyatTakibiSuzgeciCoz(p.ft);
  /** Faz 3-e: «Takibe ekle» önerilerinin kaynağı ve raf süzgeci (varsayılan: yalnız rafta olmayanlar). */
  const fk = oneriKaynagiCoz(p.fk);
  const fr = p.fr === "hepsi";
  const arama = p.q?.trim() || null;

  const karGorunur = await izinVarMi("satis.kar.gor");
  if (!karGorunur) {
    return (
      <div className="space-y-2 p-4 md:p-6">
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("karIzniYok")}</p>
      </div>
    );
  }

  const an = new Date();
  const bugun = gunDegeri(isTakvimGunu(an));
  const [veri, ozelKayitlar, ayarlariGorebilir, hafizalar, hedefler, alimYazabilir] = await Promise.all([
    rehberVerisi(donem, ileri, an),
    ozelGunKayitlari(),
    izinVarMi("ayar.yaz"),
    tryHafizalari(),
    alimHedefleri(),
    izinVarMi("alim.yaz"),
  ]);
  const esik = esikleriKur(veri.satirlar);
  const yaklasan = yaklasanlar(ozelKayitlar, bugun);
  const iyiAlim = iyiAlimListesi(veri.satirlar, hafizalar);
  const listeler = {
    ...Object.fromEntries(REHBER_LISTELERI.map((l) => [l, rehberListesi(l, veri.satirlar, esik, azStok)])),
    gecenYil: gecenYilListesi(veri.gecenYil.satirlar),
    ozelGun: [] as RehberSatiri[],
    iyiAlim: [] as RehberSatiri[],
    fiyatTakibi: [] as RehberSatiri[],
  } as Record<RehberSekmesi, RehberSatiri[]>;
  /**
   * Sekme sayısı: özel gün sekmesinde yaklaşan GÜN sayısı, iyi alımda kendi listesi, fiyat takibinde BÜTÜN hedefler
   * (sekme süzgeçsiz «Hepsi» açılır; «hedefin altında» sayısı sekmenin içinde yazar), ötekilerde ürün sayısı (sayı = açılan liste).
   */
  const sekmeSayisi = (l: RehberSekmesi) =>
    l === "ozelGun" ? yaklasan.length : l === "iyiAlim" ? iyiAlim.length : l === "fiyatTakibi" ? hedefler.length : listeler[l].length;
  const seciliGun = oz ? (yaklasan.find((y) => y.tarih.id === p.gun) ?? yaklasan[0] ?? null) : null;
  const ozelDetay = seciliGun ? await ozelGunDetayi(seciliGun, an, veri.stok, veri.satirlar) : null;
  const tamListe = listeler[liste];
  /** Faz 3-e: öneri kümeleri — rehberin KENDİ listelerinden (tükenen · iyi alım) ve dönem satırlarından. */
  const oneriKumeleri = ft
    ? (Object.fromEntries(
        ONERI_KAYNAKLARI.map((k) => [k, oneriKumesi(k, { tukenen: listeler.tukenen, iyiAlim, satirlar: veri.satirlar }, !fr)]),
      ) as Record<OneriKaynagi, RehberSatiri[]>)
    : null;
  const oneriKanallari = oneriKumeleri ? await takipKanallari([...new Set(Object.values(oneriKumeleri).flat().map((s) => s.variantId))]) : new Map();
  const gorunen = rehberAra(tamListe, arama);
  const toplam = rehberToplami(gorunen);

  /**
   * K363 Faz 3-a — PİYASA FİYATI İSTEK ÜZERİNE (`?piyasa=1`): ekrandaki listenin
   * ilk `PIYASA_TAVAN` ürünü için TY + HB Buybox fiyatı (canlı, resmî API).
   * Taşınan parametrelere GİRMEZ: sekme/dönem/arama değişince kendiliğinden
   * kapanır — her tıklamada onlarca canlı sorgu gitmesin. Özel gün sekmesinde yok.
   */
  const piyasaIstendi = p.piyasa === "1" && !oz && !ft;
  const piyasaKumesi = ia ? iyiAlimAra(iyiAlim, arama).map((x) => x.satir.variantId) : gorunen.map((s) => s.variantId);
  const piyasa = piyasaIstendi ? await piyasaFiyatlari(piyasaKumesi.slice(0, PIYASA_TAVAN)) : null;
  const piyasaMetni: Record<string, string> | null = piyasa
    ? Object.fromEntries(
        [...piyasa.harita].map(([id, f]) => [
          id,
          t("piyasaHucre", { ty: f.TY === null ? "—" : bicim.para(f.TY, "TRY"), hb: f.HB === null ? "—" : bicim.para(f.HB, "TRY") }),
        ]),
      )
    : null;
  const piyasaYaz = (variantId: string) => piyasaMetni?.[variantId] ?? t("piyasaSorulmadi");

  /** Adres TEK yerden — sekme, dönem, form ve Excel aynı parametreleri taşır. */
  const tasinan = { donem, liste, az: String(azStok), ileri: String(ileri), q: arama ?? undefined, gun: oz ? seciliGun?.tarih.id : undefined, ft: ft && ftSuzgec !== "hepsi" ? ftSuzgec : undefined, fk: ft && fk !== "tukenen" ? fk : undefined, fr: ft && fr ? "hepsi" : undefined };
  const adres = (ek: Record<string, string | undefined>) => suzgecAdresi(REHBER_YOLU, tasinan, ek);
  const excelAdresi = suzgecAdresi(`${REHBER_YOLU}/excel`, tasinan, {});

  const aciklama =
    liste === "azalan"
      ? t("aciklama_azalan", { gun: azStok })
      : liste === "fazla"
        ? esik.fazlaStokGunu === null
          ? t("aciklama_fazlaOlcuYok")
          : t("aciklama_fazla", { gun: Math.round(esik.fazlaStokGunu) })
        : liste === "gecenYil"
          ? t("aciklama_gecenYil", { enAz: EN_AZ_ADET })
          : liste === "ozelGun"
            ? t("aciklama_ozelGun", { gun: YAKLASAN_GUN })
            : liste === "iyiAlim"
              ? t("aciklama_iyiAlim", { donem: t(`donem_${donem}`) })
              : liste === "fiyatTakibi"
                ? t("aciklama_fiyatTakibi")
                : t(`aciklama_${liste}`);
  const gyPencere = { bas: bicim.tarih(veri.gecenYil.ilkGun), bit: bicim.tarih(veri.gecenYil.sonGun) };
  const gyIlk = veri.gecenYil.ilkSatis === null ? "—" : bicim.tarih(veri.gecenYil.ilkSatis);

  const kimlikEtiketi = { sku: t("sku"), firmaSku: t("excelFirmaSku"), barkod: t("excelBarkod") };
  const stokGunuYaz = (s: RehberSatiri) =>
    s.raf <= 0 ? "0" : s.stokGunu === null ? t("satmiyor") : t("gun", { sayi: Math.round(s.stokGunu) });

  return (
    <div className="min-w-0 space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("notu")}</p>
      </div>

      {/* ── DÖNEM (dört liste) ya da ÖNÜMÜZDEKİ N GÜN (geçen yıl) — adreste yaşar; fiyat takibinde ÖNERİLERİN dönemi (Faz 3-e) ── */}
      {oz ? null : (
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {(gy
          ? ILERI_GUNLER.map((g) => ({ anahtar: String(g), aktif: g === ileri, href: adres({ ileri: String(g) }), etiket: t("ileriGun", { gun: g }) }))
          : REHBER_DONEMLERI.map((d) => ({ anahtar: d, aktif: d === donem, href: adres({ donem: d }), etiket: t(`donem_${d}`) }))
        ).map((c) => (
          <Link
            key={c.anahtar}
            href={c.href}
            aria-current={c.aktif ? "true" : undefined}
            className={
              "inline-flex h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium transition-colors " +
              (c.aktif ? SECIM_AKTIF : SECIM_PASIF)
            }
          >
            {c.etiket}
          </Link>
        ))}
      </div>
      )}

      {/* ── EŞİKLER VERİDEN — hangi sayıya göre süzüldüğü yazar; geçen yıl sekmesinde PENCERE + uyarı + kapsam ── */}
      {oz || ia || ft ? null : gy ? (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">{t("gecenYilPencere", { bas: gyPencere.bas, bit: gyPencere.bit })}</p>
          <p className={DURUM_YAZISI.uyari}>{t("gecenYilUyari")}</p>
          {veri.gecenYil.kapsam === "KISMI" ? (
            <p className={DURUM_YAZISI.uyari}>{t("gecenYilKismi", { ilk: gyIlk })}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {esik.marjOrtancasi === null || esik.hizOrtancasi === null
            ? t("esikYok", { enAz: EN_AZ_ADET })
            : t("esikNotu", {
                gun: veri.gun,
                enAz: EN_AZ_ADET,
                aday: esik.adaySayisi,
                hiz: bicim.sayi(esik.hizOrtancasi, 3),
                marj: bicim.yuzde(esik.marjOrtancasi),
              })}
        </p>
      )}

      {/* ── LİSTE SEKMELERİ — sayılar aramadan bağımsız ── */}
      <div className={SEKME_SERIDI}>
        {REHBER_SEKMELERI.map((l) => {
          const aktif = l === liste;
          return (
            <Link key={l} href={adres({ liste: l })} aria-current={aktif ? "page" : undefined} className={sekmeSinifi(aktif)}>
              {t(`liste_${l}`)} <span className={sekmeSayaciSinifi(aktif)}>{sekmeSayisi(l)}</span>
            </Link>
          );
        })}
      </div>
      <p className="text-sm">{aciklama}</p>

      {/* ── AZ STOK AYARI · ARAMA · EXCEL ── */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        {gy || oz || ia || ft ? null : (
        <form action={REHBER_YOLU} method="get" className="flex items-end gap-2">
          <input type="hidden" name="donem" value={donem} />
          <input type="hidden" name="liste" value={liste} />
          <input type="hidden" name="ileri" value={ileri} />
          {arama ? <input type="hidden" name="q" value={arama} /> : null}
          <label className="space-y-1 text-sm">
            <span className="block font-medium">{t("azStokEtiketi")}</span>
            <input
              type="number"
              name="az"
              min={1}
              max={365}
              step={1}
              inputMode="numeric"
              defaultValue={azStok}
              placeholder={t("azStokYerTutucu")}
              className="border-input bg-background h-11 w-28 rounded-md border px-3 text-sm"
            />
          </label>
          <button type="submit" className="bg-secondary hover:bg-secondary/80 h-11 rounded-md px-4 text-sm font-medium">
            {t("uygula")}
          </button>
        </form>
        )}
        <div className="min-w-0 md:flex-1">
          <KodAramaKutusu
            temelAdres={REHBER_YOLU}
            baslangic={arama ?? ""}
            tasinanlar={{ donem, liste, az: String(azStok), ileri: String(ileri), gun: oz ? seciliGun?.tarih.id : undefined, ft: ft && ftSuzgec !== "hepsi" ? ftSuzgec : undefined, fk: ft && fk !== "tukenen" ? fk : undefined, fr: ft && fr ? "hepsi" : undefined }}
            ipucu={t("aramaIpucu")}
          />
        </div>
        {oz || ia || ft ? null : (
        <a
          href={excelAdresi}
          className="border-input hover:bg-muted inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium"
        >
          <Download className="size-4" />
          {t("excelIndir")}
        </a>
        )}
      </div>
      {gy || oz || ia || ft ? null : <p className="text-muted-foreground text-xs">{t("azStokNotu", { gun: VARSAYILAN_AZ_STOK_GUN })}</p>}

      {/* ── PİYASA FİYATI — istek üzerine canlı Buybox (K363 Faz 3-a) ── */}
      {oz || ft ? null : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {piyasa === null ? (
            <Link
              href={adres({ piyasa: "1" })}
              className="border-input hover:bg-muted inline-flex h-11 items-center rounded-md border px-4 font-medium"
            >
              {t("piyasaGetir")}
            </Link>
          ) : (
            <>
              <span className="text-muted-foreground">{t("piyasaNotu", { an: bicim.saat(an), sayi: Math.min(piyasaKumesi.length, PIYASA_TAVAN) })}</span>
              {piyasaKumesi.length > PIYASA_TAVAN ? (
                <span className={DURUM_YAZISI.uyari}>{t("piyasaTavan", { tavan: PIYASA_TAVAN, toplam: piyasaKumesi.length })}</span>
              ) : null}
              <Link href={adres({})} className="text-primary hover:text-primary/80 inline-flex min-h-11 items-center">
                {t("piyasaKapat")}
              </Link>
            </>
          )}
          {piyasa && piyasa.sebepler.length > 0 ? <span className={DURUM_YAZISI.uyari}>{t("piyasaSorun", { sebep: piyasa.sebepler.join(" · ") })}</span> : null}
        </div>
      )}

      {oz ? (
        <OzelGunSekmesi
          yaklasan={yaklasan}
          secili={seciliGun}
          detay={ozelDetay}
          arama={arama}
          gunAdresi={Object.fromEntries(yaklasan.map((y) => [y.tarih.id, adres({ gun: y.tarih.id })]))}
          donemEtiketi={t(`donem_${donem}`)}
          ayarlariGorebilir={ayarlariGorebilir}
          bugun={bugun}
        />
      ) : ia ? (
        <IyiAlimSekmesi liste={iyiAlim} arama={arama} piyasa={piyasaMetni} />
      ) : ft ? (
        <FiyatTakibiSekmesi
          liste={hedefler}
          suzgec={ftSuzgec}
          arama={arama}
          yazabilir={alimYazabilir}
          oneri={
            oneriKumeleri ? (
              <FiyatTakibiOnerileri
                kumeler={oneriKumeleri}
                kaynak={fk}
                tumRaf={fr}
                arama={arama}
                kanallar={oneriKanallari}
                hafizalar={hafizalar}
                takipte={new Set(hedefler.map((h) => h.variantId))}
                yazabilir={alimYazabilir}
                kaynakAdresi={Object.fromEntries(ONERI_KAYNAKLARI.map((k) => [k, adres({ fk: k === "tukenen" ? undefined : k })])) as Record<OneriKaynagi, string>}
                rafAdresi={adres({ fr: fr ? undefined : "hepsi" })}
                donemEtiketi={t(`donem_${donem}`)}
              />
            ) : null
          }
        />
      ) : (
      <>
      {/* ── TOPLAM — EKRANDA NE VARSA ONUN (İlke #15) ── */}
      <ListeToplami
        baslik={t("toplamBaslik")}
        toplamlar={[{ paraBirimi: "TRY", tutar: toplam.bagliSermaye }]}
        altMetin={t("toplamUrun", { sayi: toplam.urun, liste: t(`liste_${liste}`) })}
        oncekiler={[{ etiket: gy ? t("toplamGecenYilAdet") : t("toplamAdet"), deger: String(toplam.adet) }]}
        ekler={[
          { etiket: gy ? t("toplamGecenYilNet2") : t("toplamNet2"), toplamlar: [{ paraBirimi: "TRY", tutar: toplam.net2 }] },
          {
            etiket: t("toplamRaf"),
            deger: String(toplam.raf),
            not: toplam.sermayesiBilinmeyen > 0 ? t("sermayesiBilinmeyen", { sayi: toplam.sermayesiBilinmeyen }) : undefined,
          },
          ...(gy ? [{ etiket: t("toplamEksik"), deger: String(toplam.eksik) }] : []),
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t(`liste_${liste}`)}</CardTitle>
          {arama ? (
            <p className="text-muted-foreground text-sm">{t("aramaSonucu", { sayi: gorunen.length, toplam: tamListe.length })}</p>
          ) : null}
        </CardHeader>
        <CardContent className="min-w-0">
          {gorunen.length === 0 ? (
            <div className="space-y-1 py-8 text-center">
              <p className="text-sm font-medium">{t("listeBos")}</p>
              <p className="text-muted-foreground text-sm">
                {gy && veri.gecenYil.kapsam === "YOK" ? t("gecenYilVeriYok", { ilk: gyIlk }) : t("listeBosSebep")}
              </p>
            </div>
          ) : (
            <>
              {/* ── MASAÜSTÜ: TABLO (7 sütun) ── */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunUrun")}</TableHead>
                      <TableHead className="text-right">{gy ? t("sutunGecenYilSatilan") : t("sutunSatilan")}</TableHead>
                      <TableHead className="text-right">{t("sutunMarj")}</TableHead>
                      <TableHead className="text-right">{gy ? t("sutunGecenYilNet2") : t("sutunGunlukNet2")}</TableHead>
                      <TableHead className="text-right">{t("sutunRaf")}</TableHead>
                      <TableHead className="text-right">{gy ? t("sutunEksik") : t("sutunStokGunu")}</TableHead>
                      <TableHead className="text-right">{t("sutunSermaye")}</TableHead>
                      {piyasaMetni ? <TableHead className="text-right">{t("sutunPiyasa")}</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gorunen.map((s) => (
                      <TableRow key={s.variantId}>
                        <TableCell className="max-w-md align-top whitespace-normal">
                          <div className="min-w-0 space-y-0.5">
                            {s.urunId === null ? (
                              <span className="line-clamp-2 font-medium">{s.urunAdi}</span>
                            ) : (
                              <Link href={`/urunler/${s.urunId}`} className="text-primary hover:text-primary/80 line-clamp-2 font-medium">
                                {s.urunAdi}
                              </Link>
                            )}
                            <Kimlik s={s} etiket={kimlikEtiketi} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.adet}
                          <div className="text-muted-foreground text-xs">{t("sutunGunluk", { sayi: bicim.sayi(s.gunlukSatis, 2) })}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{s.marj === null ? t("bilinmiyor") : bicim.yuzde(s.marj)}</TableCell>
                        <TableCell className="text-right tabular-nums">{bicim.para(gy ? s.net2 : s.gunlukNet2, "TRY")}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.raf}</TableCell>
                        <TableCell className="text-right tabular-nums">{gy ? eksikAdet(s) : stokGunuYaz(s)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.raf <= 0 ? "—" : s.bagliSermaye === null ? t("bilinmiyor") : bicim.para(s.bagliSermaye, "TRY")}
                        </TableCell>
                        {piyasaMetni ? <TableCell className="text-right whitespace-nowrap tabular-nums">{piyasaYaz(s.variantId)}</TableCell> : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ── TELEFON: KART LİSTESİ (İlke #8) ── */}
              <div className="space-y-3 md:hidden">
                {gorunen.map((s) => (
                  <ListeKarti
                    key={s.variantId}
                    baslik={
                      s.urunId === null ? (
                        s.urunAdi
                      ) : (
                        <Link href={`/urunler/${s.urunId}`} className="text-primary hover:text-primary/80">
                          {s.urunAdi}
                        </Link>
                      )
                    }
                    altBaslik={<Kimlik s={s} etiket={kimlikEtiketi} />}
                    alanlar={[
                      {
                        etiket: gy ? t("sutunGecenYilSatilan") : t("sutunSatilan"),
                        deger: `${s.adet} · ${t("sutunGunluk", { sayi: bicim.sayi(s.gunlukSatis, 2) })}`,
                      },
                      { etiket: t("sutunMarj"), deger: s.marj === null ? t("bilinmiyor") : bicim.yuzde(s.marj) },
                      { etiket: gy ? t("sutunGecenYilNet2") : t("sutunGunlukNet2"), deger: bicim.para(gy ? s.net2 : s.gunlukNet2, "TRY") },
                      { etiket: t("sutunRaf"), deger: String(s.raf) },
                      { etiket: gy ? t("sutunEksik") : t("sutunStokGunu"), deger: gy ? String(eksikAdet(s)) : stokGunuYaz(s) },
                      {
                        etiket: t("sutunSermaye"),
                        deger: s.raf <= 0 ? "—" : s.bagliSermaye === null ? t("bilinmiyor") : bicim.para(s.bagliSermaye, "TRY"),
                      },
                      ...(piyasaMetni ? [{ etiket: t("sutunPiyasa"), deger: piyasaYaz(s.variantId) }] : []),
                    ]}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}

/** Kimlik kodları — SKU her zaman, Firma SKU yalnız farklıysa, barkod; hepsi tek tıkla kopyalanır (İlke #3 #4). */
function Kimlik({ s, etiket }: { s: RehberSatiri; etiket: { sku: string; firmaSku: string; barkod: string } }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      <KopyalanabilirKod deger={s.sku} etiket={etiket.sku} />
      {s.firmaSku ? <KopyalanabilirKod deger={s.firmaSku} etiket={etiket.firmaSku} /> : null}
      {s.barkod ? <KopyalanabilirKod deger={s.barkod} etiket={etiket.barkod} /> : null}
    </div>
  );
}
