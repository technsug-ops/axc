import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";

import { DurumRozeti } from "@/components/durum-rozeti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  altindakiler,
  FIYAT_TAKIBI_SUZGECLERI,
  fiyatTakibiAdresi,
  fiyatTakibiListesi,
  hedefFarki,
  hedefinAltinda,
  type FiyatTakibiSuzgeci,
} from "@/lib/alim-hedefi";
import type { HedefListeSatiri } from "@/lib/alim-hedefi-verisi";
import { bicimlendirici } from "@/lib/bicim";
import { SEKME_SERIDI, sekmeSinifi } from "@/lib/kutu-bicimi";
import type { DurumRengi } from "@/lib/renkler";

import { HedefEylemleri, YeniHedefFormu } from "./fiyat-takibi-formu";

/**
 * ============================================================================
 *  ALIM REHBERİ — «FİYAT TAKİBİ» SEKMESİ (K363 Faz 3-d, kullanıcı kararları 30.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı ürüne hedef alış fiyatı yazar; saatlik ölçüm TY + HB'de başka
 *  satıcının en ucuz fiyatını okur. Hesap `lib/alim-hedefi.ts`te (saf);
 *  burası yalnız çizer.
 *  ⚠ SÜZGEÇ «Hedefin altında» = çandaki küme (`altindakiler`) — sayı = liste.
 *  ⚠ Sınırlar EKRANDA yazar: yalnız ilanımız olan ürün · saatte bir · kupon
 *  bilinmez. Fiyatı bilinmeyen satır «fırsat» sayılmaz ve NEDENİ yazar.
 * ============================================================================
 */
export async function FiyatTakibiSekmesi({
  liste,
  suzgec,
  arama,
  yazabilir,
}: {
  liste: HedefListeSatiri[];
  suzgec: FiyatTakibiSuzgeci;
  arama: string | null;
  /** `alim.yaz` — yoksa form ve satır eylemleri çizilmez, nedeni yazar. */
  yazabilir: boolean;
}) {
  const t = await getTranslations("FiyatTakibi");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const sayilar: Record<FiyatTakibiSuzgeci, number> = { hepsi: liste.length, altinda: altindakiler(liste).length };
  const tamListe = fiyatTakibiListesi(liste, suzgec);
  const q = (arama ?? "").trim().toLocaleLowerCase("tr");
  const gorunen = q === "" ? tamListe : tamListe.filter((s) => [s.urunAdi, s.sku, s.firmaSku, s.barkod].some((x) => x !== null && x.toLocaleLowerCase("tr").includes(q)));
  const sonKontrol = liste.reduce<Date | null>((en, s) => (s.sonKontrolAt !== null && (en === null || s.sonKontrolAt > en) ? s.sonKontrolAt : en), null);

  const para = (n: number | null) => (n === null ? "—" : bicim.para(n, "TRY"));
  /** Kanal hücresi: fiyat · ilan yoksa «ilan yok» (okunamaz) · ölçüldü ama yok «satıcı yok/okunamadı». */
  const kanalHucresi = (s: HedefListeSatiri, kanal: "TY" | "HB") => {
    const f = kanal === "TY" ? s.ty : s.hb;
    if (!s.ilan[kanal]) return <span className="text-muted-foreground text-xs">{t("ilanYok")}</span>;
    if (s.sonKontrolAt === null) return <span className="text-muted-foreground text-xs">{t("henuzOkunmadi")}</span>;
    if (f === null) return <span className="text-muted-foreground text-xs">{t("fiyatYok")}</span>;
    return <span className="tabular-nums">{para(f)}</span>;
  };
  const durum = (s: HedefListeSatiri): { renk: DurumRengi; metin: string } => {
    if (!s.aktif) return { renk: "notr", metin: t("durumDurduruldu") };
    const fark = hedefFarki(s);
    if (fark === null) return { renk: "notr", metin: s.sonKontrolAt === null ? t("durumBekliyor") : t("durumBilinmiyor") };
    if (hedefinAltinda(s)) return { renk: "olumlu", metin: t("durumAltinda", { tl: bicim.para(Math.abs(fark.tl), "TRY") }) };
    return { renk: "notr", metin: t("durumUstunde", { tl: bicim.para(fark.tl, "TRY"), yuzde: bicim.yuzde(fark.yuzde) }) };
  };
  const sonAltindaMetni = (s: HedefListeSatiri) =>
    s.sonAltindaAt === null || s.sonAltindaFiyat === null
      ? t("hicAltinaInmedi")
      : t("sonAltinda", { zaman: bicim.tarihSaat(s.sonAltindaAt), fiyat: para(s.sonAltindaFiyat), kanal: s.sonAltindaKanal === null ? "—" : t(`kanal_${s.sonAltindaKanal}`) });
  const Kimlik = ({ s }: { s: HedefListeSatiri }) => (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      <KopyalanabilirKod deger={s.sku} etiket={ortak("sku")} />
      {s.firmaSku && s.firmaSku !== s.sku ? <KopyalanabilirKod deger={s.firmaSku} etiket={ortak("firmaSku")} /> : null}
      {s.barkod ? <KopyalanabilirKod deger={s.barkod} etiket={ortak("barkod")} /> : null}
    </div>
  );
  const Ad = ({ s }: { s: HedefListeSatiri }) =>
    s.urunId === null ? (
      <span className="line-clamp-2 font-medium">{s.urunAdi}</span>
    ) : (
      <Link href={`/urunler/${s.urunId}`} className="line-clamp-2 font-medium underline underline-offset-2 hover:no-underline">
        {s.urunAdi}
      </Link>
    );
  const eylemler = (s: HedefListeSatiri) =>
    yazabilir ? <HedefEylemleri id={s.id} variantId={s.variantId} urunAdi={s.urunAdi} hedefMetni={para(s.hedef)} aktif={s.aktif} /> : null;

  return (
    <div className="space-y-4">
      {/* ── SINIRLAR — ne izleniyor, ne izlenemiyor (İlke #5: sessiz varsayım yok) ── */}
      <div className="text-muted-foreground space-y-1 text-sm">
        <p>{t("kapsamNotu")}</p>
        <p>{sonKontrol === null ? t("hicOlculmedi") : t("sonOlcum", { zaman: bicim.tarihSaat(sonKontrol) })}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniBaslik")}</CardTitle>
        </CardHeader>
        <CardContent>{yazabilir ? <YeniHedefFormu /> : <p className="text-muted-foreground text-sm">{t("yazmaIzniYok")}</p>}</CardContent>
      </Card>

      {/* ── SÜZGEÇ — «Hedefin altında» çandaki kümedir; sayılar aramadan bağımsız ── */}
      <div className={SEKME_SERIDI}>
        {FIYAT_TAKIBI_SUZGECLERI.map((x) => {
          const aktif = x === suzgec;
          return (
            <Link key={x} href={fiyatTakibiAdresi(x)} aria-current={aktif ? "page" : undefined} className={sekmeSinifi(aktif)}>
              {t(`suzgec_${x}`)} ({sayilar[x]})
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(`suzgec_${suzgec}`)}</CardTitle>
          {arama ? <p className="text-muted-foreground text-sm">{t("aramaSonucu", { sayi: gorunen.length, toplam: tamListe.length })}</p> : null}
        </CardHeader>
        <CardContent className="min-w-0">
          {gorunen.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {liste.length === 0 ? t("bosHicHedef") : suzgec === "altinda" && !arama ? t("bosAltinda") : t("bosArama")}
            </p>
          ) : (
            <>
              {/* ── MASAÜSTÜ: TABLO (7 sütun) ── */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunUrun")}</TableHead>
                      <TableHead className="text-right">{t("sutunHedef")}</TableHead>
                      <TableHead className="text-right">{t("kanal_TY")}</TableHead>
                      <TableHead className="text-right">{t("kanal_HB")}</TableHead>
                      <TableHead>{t("sutunDurum")}</TableHead>
                      <TableHead>{t("sutunSonAltinda")}</TableHead>
                      <TableHead>{ortak("eylemler")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gorunen.map((s) => {
                      const d = durum(s);
                      return (
                        <TableRow key={s.id} className={s.aktif ? undefined : "opacity-70"}>
                          <TableCell className="max-w-sm align-top whitespace-normal">
                            <div className="min-w-0 space-y-0.5">
                              <Ad s={s} />
                              <Kimlik s={s} />
                              <p className="text-muted-foreground text-xs">{t("rafta", { sayi: s.raf })}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right align-top font-medium tabular-nums">{para(s.hedef)}</TableCell>
                          <TableCell className="text-right align-top">{kanalHucresi(s, "TY")}</TableCell>
                          <TableCell className="text-right align-top">{kanalHucresi(s, "HB")}</TableCell>
                          <TableCell className="align-top">
                            <DurumRozeti durum={d.renk}>{d.metin}</DurumRozeti>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-48 align-top text-xs whitespace-normal">{sonAltindaMetni(s)}</TableCell>
                          <TableCell className="align-top">{eylemler(s)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ── TELEFON: KART LİSTESİ (İlke #8) ── */}
              <div className="space-y-3 md:hidden">
                {gorunen.map((s) => {
                  const d = durum(s);
                  return (
                    <ListeKarti
                      key={s.id}
                      baslik={<Ad s={s} />}
                      altBaslik={<Kimlik s={s} />}
                      alanlar={[
                        { etiket: t("sutunHedef"), deger: para(s.hedef) },
                        { etiket: t("kanal_TY"), deger: kanalHucresi(s, "TY") },
                        { etiket: t("kanal_HB"), deger: kanalHucresi(s, "HB") },
                        { etiket: ortak("raf"), deger: String(s.raf) },
                      ]}
                      not={
                        <div className="space-y-1">
                          <DurumRozeti durum={d.renk}>{d.metin}</DurumRozeti>
                          <p className="text-muted-foreground text-xs">{sonAltindaMetni(s)}</p>
                        </div>
                      }
                      eylemler={eylemler(s)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
