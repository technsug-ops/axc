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
import { SEKME_SERIDI, sekmeSinifi } from "@/lib/kutu-bicimi";
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
 * ============================================================================
 */

export async function generateMetadata() {
  const t = await getTranslations("AlimRehberi");
  return { title: t("baslik") };
}

export default async function AlimRehberiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; liste?: string; az?: string; ileri?: string; q?: string }>;
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

  const veri = await rehberVerisi(donem, ileri, new Date());
  const esik = esikleriKur(veri.satirlar);
  const listeler = {
    ...Object.fromEntries(REHBER_LISTELERI.map((l) => [l, rehberListesi(l, veri.satirlar, esik, azStok)])),
    gecenYil: gecenYilListesi(veri.gecenYil.satirlar),
  } as Record<RehberSekmesi, RehberSatiri[]>;
  const tamListe = listeler[liste];
  const gorunen = rehberAra(tamListe, arama);
  const toplam = rehberToplami(gorunen);

  /** Adres TEK yerden — sekme, dönem, form ve Excel aynı parametreleri taşır. */
  const tasinan = { donem, liste, az: String(azStok), ileri: String(ileri), q: arama ?? undefined };
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

      {/* ── DÖNEM (dört liste) ya da ÖNÜMÜZDEKİ N GÜN (geçen yıl) — adreste yaşar ── */}
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
              (c.aktif ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted")
            }
          >
            {c.etiket}
          </Link>
        ))}
      </div>

      {/* ── EŞİKLER VERİDEN — hangi sayıya göre süzüldüğü yazar; geçen yıl sekmesinde PENCERE + uyarı + kapsam ── */}
      {gy ? (
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
              {t(`liste_${l}`)} ({listeler[l].length})
            </Link>
          );
        })}
      </div>
      <p className="text-sm">{aciklama}</p>

      {/* ── AZ STOK AYARI · ARAMA · EXCEL ── */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        {gy ? null : (
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
            tasinanlar={{ donem, liste, az: String(azStok), ileri: String(ileri) }}
            ipucu={t("aramaIpucu")}
          />
        </div>
        <a
          href={excelAdresi}
          className="border-input hover:bg-muted inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium underline-offset-4"
        >
          <Download className="size-4" />
          {t("excelIndir")}
        </a>
      </div>
      {gy ? null : <p className="text-muted-foreground text-xs">{t("azStokNotu", { gun: VARSAYILAN_AZ_STOK_GUN })}</p>}

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
                              <Link href={`/urunler/${s.urunId}`} className="line-clamp-2 font-medium underline underline-offset-2 hover:no-underline">
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
                        <Link href={`/urunler/${s.urunId}`} className="underline underline-offset-2">
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
