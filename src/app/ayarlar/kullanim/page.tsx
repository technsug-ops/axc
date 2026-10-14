import { getTranslations } from "next-intl/server";
import { MousePointerClick } from "lucide-react";

import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { SekmeliBolum, type Sekme } from "@/components/sekmeli-bolum";
import { SuzgecCubugu } from "@/components/suzgec-cubugu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { hedefCoz, KULLANIM_LISTE_SINIRI, KULLANIM_SEKMELERI, kullanimSekmesi, payYuzde, sayfaMenuAnahtari } from "@/lib/kullanim/rapor";
import { ilkIzAni, kullanimOzeti, sekmeVerisi } from "@/lib/kullanim/rapor-veri";
import type { KullanimListesi } from "@/lib/kullanim/rapor";
import { pencereCoz } from "@/lib/liste-suzgeci";
import { MENU_ADRESLERI } from "@/lib/menu/katalog";
import { suzgecAdresi } from "@/lib/suzgec";
import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  AYARLAR → KULLANIM (K334-②, kullanıcı kararı 14.10.2026)
 * ----------------------------------------------------------------------------
 *  «En çok nereler kullanılıyor, hangi tuşlara basılıyor, hangi sayfalarda ve
 *  nereden nereye geçiliyor.» İz `components/kullanim-izi.tsx`ten gelir;
 *  sayım `lib/kullanim/rapor-veri.ts`te, veritabanında.
 *
 *  ⚠ İZİN: mevcut `ayar.yaz` (kullanıcı kararı 14.10.2026) — yeni izin
 *  açılmadı; iki bacaklı izin kuralının riskine girmeden ayar yöneticisine açık.
 *
 *  ⚠ KUTUCUKLAR ARAMADAN BAĞIMSIZ (İlke #17), liste toplamı ARAMAYA bağlı ve
 *  ekranda «aramada» diye yazar. Toplam görünen satırların değil süzgecin
 *  tamamının toplamıdır (İlke #15) — 100 satır tavanı yalnız ÇİZİMİ sınırlar.
 *
 *  ⚠ İZİN DOĞUM TARİHİ yazar: ilk izden önceki günler için «kayıt yok» bir
 *  sonuç değildir.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

const TEMEL = "/ayarlar/kullanim";

export async function generateMetadata() {
  const t = await getTranslations("Kullanim");
  return { title: t("baslik") };
}

export default async function KullanimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ pencere?: string; baslangic?: string; bitis?: string; q?: string; sekme?: string }>;
}) {
  const baglam = await sayfaIzni("ayar.yaz");
  const p = await searchParams;
  const t = await getTranslations("Kullanim");
  const tMenu = await getTranslations("Menu");
  const bicim = await bicimlendirici();

  const pencere = pencereCoz(p);
  const sekme = kullanimSekmesi(p.sekme);
  const q = (p.q ?? "").trim();

  /** Menü ADIYLA arama: «Satışlar» yazan, `/satislar` kalıbını bulsun. */
  const aranan = q.toLocaleLowerCase("tr");
  const ekKaliplar =
    q === ""
      ? []
      : Object.entries(MENU_ADRESLERI)
          .filter(([anahtar]) => tMenu.has(anahtar) && tMenu(anahtar).toLocaleLowerCase("tr").includes(aranan))
          .map(([, adres]) => adres);

  const [ilk, ozet, veri] = await Promise.all([
    ilkIzAni(baglam.companyId),
    kullanimOzeti(baglam.companyId, pencere.aralik),
    sekmeVerisi(sekme, baglam.companyId, pencere.aralik, q, ekKaliplar),
  ]);

  const aralikMetni = pencere.pencere
    ? `${bicim.tarih(pencere.pencere.ilkGun)} — ${bicim.tarih(pencere.pencere.sonGun)}`
    : t("tumZaman");
  const toplamOlay = ozet.sayfa + ozet.tiklama;
  const pay = (n: number) => {
    const y = payYuzde(n, toplamOlay);
    return y === null ? "—" : bicim.yuzde(y);
  };

  /** Sayfa kalıbı → «Satışlar» + kalıp; menüde adı yoksa yalnız kalıp. */
  const sayfaAdi = (kalip: string) => {
    const anahtar = sayfaMenuAnahtari(kalip);
    const ad = anahtar && tMenu.has(anahtar) ? tMenu(anahtar) : null;
    return (
      <span className="flex min-w-0 flex-col">
        {ad ? <span className="font-medium break-words">{ad}</span> : null}
        <span className={`${ad ? "text-muted-foreground text-xs" : "font-medium"} font-mono break-all`}>{kalip}</span>
      </span>
    );
  };

  const hedefAdi = (hedef: string) => {
    const h = hedefCoz(hedef);
    if (h.tur === "DIS") return <span className="text-muted-foreground italic">{t("disBaglanti")}</span>;
    if (h.tur === "BAGLANTI")
      return (
        <span className="flex min-w-0 items-start gap-1">
          <span className="text-muted-foreground shrink-0">{t("baglantiOn")}</span>
          {sayfaAdi(h.kalip)}
        </span>
      );
    return <span className="font-medium break-words">«{h.yazi}»</span>;
  };

  /** Liste başlığı: kaç farklı satır, toplam kaç olay; aramada mı; tavan aşıldı mı. */
  const listeOzeti = (liste: KullanimListesi<{ adet: number }>, birim: string) => (
    <div className="text-muted-foreground mb-2 space-y-1 text-sm">
      <p>
        {q === ""
          ? t("listeOzeti", { farkli: bicim.sayi(liste.farkli), toplam: bicim.sayi(liste.toplam), birim })
          : t("listeOzetiArama", { q, farkli: bicim.sayi(liste.farkli), toplam: bicim.sayi(liste.toplam), birim })}
      </p>
      {liste.farkli > KULLANIM_LISTE_SINIRI ? (
        <p>{t("tavanNotu", { sinir: bicim.sayi(KULLANIM_LISTE_SINIRI), farkli: bicim.sayi(liste.farkli) })}</p>
      ) : null}
    </div>
  );

  const bos = <p className="text-muted-foreground py-6 text-center text-sm">{q === "" ? t("bos") : t("bosArama", { q })}</p>;

  /** Toplam satırı — İlke #15: tek tek gösterilen yerde toplam da olur. */
  const toplamSatiri = (sutun: number, toplam: number) => (
    <TableRow className="bg-muted/40 font-semibold">
      <TableCell colSpan={sutun}>{t("toplam")}</TableCell>
      <TableCell className="text-right tabular-nums">{bicim.sayi(toplam)}</TableCell>
    </TableRow>
  );

  let icerik: React.ReactNode;
  if (veri.liste.farkli === 0) {
    icerik = bos;
  } else if (veri.sekme === "sayfalar") {
    icerik = (
      <>
        {listeOzeti(veri.liste, t("birimAcilis"))}
        <Table className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sutunSayfa")}</TableHead>
              <TableHead className="text-right">{t("sutunAcilis")}</TableHead>
              <TableHead className="text-right">{t("sutunPay")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veri.liste.satirlar.map((s) => (
              <TableRow key={s.ad}>
                <TableCell className="whitespace-normal">
                  {sayfaAdi(s.ad)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.adet)}</TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {bicim.yuzde(payYuzde(s.adet, veri.liste.toplam) ?? 0)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell>{t("toplam")}</TableCell>
              <TableCell className="text-right tabular-nums">{bicim.sayi(veri.liste.toplam)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </>
    );
  } else if (veri.sekme === "dugmeler") {
    icerik = (
      <>
        {listeOzeti(veri.liste, t("birimTiklama"))}
        <Table className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sutunDugme")}</TableHead>
              <TableHead>{t("sutunHangiSayfada")}</TableHead>
              <TableHead className="text-right">{t("sutunTiklama")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veri.liste.satirlar.map((s) => (
              <TableRow key={s.ad}>
                <TableCell className="whitespace-normal">
                  {hedefAdi(s.hedef)}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {sayfaAdi(s.sayfa)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.adet)}</TableCell>
              </TableRow>
            ))}
            {toplamSatiri(2, veri.liste.toplam)}
          </TableBody>
        </Table>
      </>
    );
  } else if (veri.sekme === "gecisler") {
    icerik = (
      <>
        {listeOzeti(veri.liste, t("birimGecis"))}
        <Table className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sutunNereden")}</TableHead>
              <TableHead>{t("sutunNereye")}</TableHead>
              <TableHead className="text-right">{t("sutunGecis")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veri.liste.satirlar.map((s) => (
              <TableRow key={s.ad}>
                <TableCell className="whitespace-normal">
                  {sayfaAdi(s.nereden)}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {sayfaAdi(s.nereye)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.adet)}</TableCell>
              </TableRow>
            ))}
            {toplamSatiri(2, veri.liste.toplam)}
          </TableBody>
        </Table>
      </>
    );
  } else {
    icerik = (
      <>
        {listeOzeti(veri.liste, t("birimOlay"))}
        <Table className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sutunKullanici")}</TableHead>
              <TableHead className="text-right">{t("sutunAcilis")}</TableHead>
              <TableHead className="text-right">{t("sutunTiklama")}</TableHead>
              <TableHead>{t("sutunSonGorulme")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veri.liste.satirlar.map((s) => (
              <TableRow key={s.kullaniciId ?? "silinmis"}>
                <TableCell className="whitespace-normal font-medium">
                  {s.kullaniciId === null ? <span className="text-muted-foreground italic">{t("silinmisKullanici")}</span> : s.ad}
                </TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.sayfa)}</TableCell>
                <TableCell className="text-right tabular-nums">{bicim.sayi(s.tiklama)}</TableCell>
                <TableCell className="whitespace-nowrap">{s.sonGorulme ? bicim.tarihSaat(s.sonGorulme) : "—"}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell>{t("toplam")}</TableCell>
              <TableCell className="text-right tabular-nums">{bicim.sayi(veri.liste.toplamSayfa)}</TableCell>
              <TableCell className="text-right tabular-nums">{bicim.sayi(veri.liste.toplamTiklama)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </>
    );
  }

  const tasinan = { pencere: p.pencere, baslangic: p.baslangic, bitis: p.bitis, q: p.q };
  const sekmeler: Sekme[] = KULLANIM_SEKMELERI.map((s) => ({
    anahtar: s,
    etiket: t(`sekme.${s}`),
    adres: suzgecAdresi(TEMEL, tasinan, { sekme: s === "sayfalar" ? undefined : s }),
    icerik: s === sekme ? icerik : null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <MousePointerClick className="size-6" aria-hidden />
          {t("baslik")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {ilk ? t("izDogumu", { tarih: bicim.tarihSaat(ilk) }) : t("izYok")}
        </p>
      </div>

      <SuzgecCubugu
        temelAdres={TEMEL}
        mevcut={p}
        suzgecler={[]}
        zaman={{
          secili: pencere.tur,
          aralikMetni: pencere.pencere ? aralikMetni : "",
          baslangic: p.baslangic ?? "",
          bitis: p.bitis ?? "",
        }}
      />
      <p className="text-muted-foreground text-xs">{t("donem", { aralik: aralikMetni })}</p>

      {/* İlke #12 — kompakt kutucuk ızgarası; aramadan BAĞIMSIZ, dönemin tamamı. */}
      <div className="grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
        <IstatistikKutusu etiket={t("kutuSayfa")} cocuk={bicim.sayi(ozet.sayfa)} bas />
        <IstatistikKutusu etiket={t("kutuTiklama")} cocuk={bicim.sayi(ozet.tiklama)} />
        <IstatistikKutusu etiket={t("kutuAktifGun")} cocuk={bicim.sayi(ozet.aktifGun)} altNot={t("kutuAktifGunNot")} />
        <IstatistikKutusu etiket={t("kutuKullanici")} cocuk={bicim.sayi(ozet.kullanici)} />
        <IstatistikKutusu etiket={t("kutuTelefon")} cocuk={pay(ozet.cihaz.TELEFON)} altNot={t("olaySayisi", { n: bicim.sayi(ozet.cihaz.TELEFON) })} />
        <IstatistikKutusu etiket={t("kutuTablet")} cocuk={pay(ozet.cihaz.TABLET)} altNot={t("olaySayisi", { n: bicim.sayi(ozet.cihaz.TABLET) })} />
        <IstatistikKutusu etiket={t("kutuMasaustu")} cocuk={pay(ozet.cihaz.MASAUSTU)} altNot={t("olaySayisi", { n: bicim.sayi(ozet.cihaz.MASAUSTU) })} />
      </div>

      <KodAramaKutusu
        temelAdres={TEMEL}
        baslangic={p.q ?? ""}
        tasinanlar={{ pencere: p.pencere, baslangic: p.baslangic, bitis: p.bitis, sekme: p.sekme }}
        ipucu={t("aramaIpucu")}
      />

      <SekmeliBolum sekmeler={sekmeler} secili={sekme} notu={t(`sekmeNotu.${sekme}`)} />
    </div>
  );
}
