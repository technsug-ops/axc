import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";
import { CalendarRange, ChevronDown, Flag, RotateCcw, SlidersHorizontal, Star, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RAPOR_PENCERELERI, type PencereTuru } from "@/lib/donem";
import { PENCERE_ANAHTARI } from "@/lib/pencere-etiket";
import {
  analizAdresi,
  ANALIZ_YOLU,
  SATIR_SAYILARI,
  SIRALAMA_ALANLARI,
  type AnalizEkseni,
  type AnalizSuzgeci,
  type Ceyrek,
  type SatirSayisi,
  type SiralamaAlani,
  type Yon,
} from "@/lib/rapor/urun-analizi";
import { YAS_KOVALARI } from "@/lib/yaslanma";
import { acikSuzgecSayisi, analizOzetParcalari, type OzetParcasi } from "@/lib/rapor/analiz-ozeti";
import { AnalizAramaKutusu } from "./analiz-arama-kutusu";
import { OtomatikGonderSecim } from "./otomatik-gonder-secim";
import { TelefonSuzgecKabi } from "./telefon-suzgec-kabi";
import { SECIM_AKTIF, SECIM_PASIF } from "@/lib/kutu-bicimi";
import { bicimlendirici } from "@/lib/bicim";

/** K293: telefonda çip satırı TEK SATIR, yatay kayar; masaüstünde eskisi gibi sarar. */
const KAYAN_SATIR =
  "flex gap-2 max-md:-mx-3 max-md:overflow-x-auto max-md:px-3 max-md:[scrollbar-width:none] md:flex-wrap";

/**
 * ============================================================================
 *  ÜRÜN ANALİZİ — GELİŞMİŞ SÜZGEÇ ÇUBUĞU
 * ----------------------------------------------------------------------------
 *  ⛔ JAVASCRIPT'SİZ ÇALIŞIR — düz bir GET formu. Sunucu bileşeni; istemciye
 *  hiçbir demet inmiyor. Durum ADRESTE yaşadığı için süzülmüş liste
 *  paylaşılabilir, geri tuşu çalışır ve yer imi anlamını korur.
 *
 *  ── ⚠ ONAY KUTUSU IZGARASI, ÇOKLU SEÇİM KUTUSU DEĞİL ────────────────────
 *  `<select multiple>` telefonda kullanılamaz (parmakla çoklu seçim yok) ve
 *  depo aşamasında birincil cihaz telefon (İlke #8). Onay kutuları hem
 *  telefonda hem masaüstünde aynı çalışır — ve tarayıcı bunları zaten
 *  tekrarlı parametre olarak gönderir (`?marka=LEGO&marka=Karaca`), yani
 *  ayıraç uydurmaya gerek kalmaz.
 *
 *  ── ⚠ SEÇENEKLER SÜZÜLMEMİŞ VERİDEN GELİR ───────────────────────────────
 *  LEGO seçilince öteki markalar listeden DÜŞMEZ. Düşseydi geri dönmek
 *  imkânsızlaşırdı — kullanıcı kendi kurduğu süzgece kilitlenirdi.
 *  (Panelin kanal seçicisindeki kuralın aynısı.)
 *
 *  ⚠ DOKUNULABİLİR HER ÖĞE ≥44 px (İlke #8) — `h-11` ve onay kutularında
 *  tıklama alanı etikete kadar uzanır (`<label>` sarmalı).
 * ============================================================================
 */

/** Sayfa değiştiğinde korunacak, süzgece ait OLMAYAN parametreler. */
export type TasinanParametreler = {
  eksen: AnalizEkseni;
  pencere?: string;
  baslangic?: string;
  bitis?: string;
  kanal?: string;
  para?: string;
};

export async function AnalizSuzgeci({
  eksen,
  tasinan,
  suzgec,
  sira,
  yon,
  satir,
  ceyrek,
  markaSecenekleri,
  kategoriSecenekleri,
  kanalSecenekleri,
  suzgecVarMi,
}: {
  eksen: AnalizEkseni;
  tasinan: TasinanParametreler;
  suzgec: AnalizSuzgeci;
  sira: SiralamaAlani;
  yon: Yon;
  satir: SatirSayisi;
  /** Yalnız `eksen === "mevsim"` iken anlamlı — bkz. hidden alan altta. */
  ceyrek: Ceyrek;
  /** Süzülmemiş kümeden — ad ve o markadaki ürün sayısı. */
  markaSecenekleri: { ad: string; sayi: number }[];
  kategoriSecenekleri: { ad: string; sayi: number }[];
  /** ⚠ `hamSatirlar`DAN DEĞİL — bkz. çağıran (`page.tsx`) yorumu: kanal
   *  DB sorgusunda süzülüyor, süzülmüş satırdan seçenek türetilseydi
   *  seçili olmayan kanallar listeden düşerdi. */
  kanalSecenekleri: { code: string; name: string }[];
  /** En az bir süzgeç etkinse "temizle" bağlantısı çizilir. */
  suzgecVarMi: boolean;
}) {
  const t = await getTranslations("UrunAnalizi");
  /** Kova adları `Stok` ad alanında — ikinci bir kopya iki ekranı ayrıştırırdı. */
  const tStok = await getTranslations("Stok");
  /** Dönem etiketleri `Pencere` ad alanında — `/rapor`la AYNI kaynak. */
  const tPencere = await getTranslations("Pencere");
  const bicim = await bicimlendirici();

  /**
   * SIRALAMA ETİKETLERİ — exhaustive `Record`. Yeni bir alan eklendiğinde
   * TypeScript burada kırmızı yanar; elle tutulan bir liste olsaydı yeni
   * alan sessizce etiketsiz kalırdı.
   */
  const siraEtiketi: Record<SiralamaAlani, string> = {
    net2: t("siraNet2"),
    net1: t("siraNet1"),
    marj: t("siraMarj"),
    adet: t("siraAdet"),
    ciro: t("siraCiro"),
    birimFiyat: t("siraBirimFiyat"),
    yas: t("siraYas"),
    sermaye: t("siraSermaye"),
    rafAdedi: t("siraRafAdedi"),
    ad: t("siraAd"),
  };

  /** Tek-tık uygulanan çip görünümü — kova/eksen sekmeleriyle AYNI stil. */
  const chipSinifi = (aktif: boolean) =>
    "inline-flex h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium transition-colors " +
    (aktif
      ? SECIM_AKTIF
      : SECIM_PASIF);

  /**
   * DEĞİŞMEYEN TABAN — dönem/kanal/para çipleri bunun üstüne TEK alan
   * değiştirir. `analizAdresi` çağrıları bu tabanı spread edip yalnız
   * kendi alanını override eder (kova chip'iyle AYNI desen).
   */
  const taban = {
    ...tasinan,
    markalar: suzgec.markalar,
    kategoriler: suzgec.kategoriler,
    minAdet: suzgec.minAdet,
    minCiro: suzgec.minCiro,
    arama: suzgec.arama,
    favori: suzgec.favoriYalniz,
    incelenecek: suzgec.incelenecekYalniz,
    sezon: suzgec.sezon,
    sirala: sira,
    yon,
    satir,
  };

  const guncelPencere = (tasinan.pencere ?? "BU_AY") as PencereTuru;
  const guncelPara = tasinan.para === "EUR" ? "EUR" : "TRY";

  /** Süzgeci sıfırlayan adres — eksen ve dönem KORUNUR, süzgeçler düşer. */
  const temizAdres = (() => {
    const q = new URLSearchParams();
    q.set("eksen", eksen);
    if (tasinan.pencere) q.set("pencere", tasinan.pencere);
    if (tasinan.baslangic) q.set("baslangic", tasinan.baslangic);
    if (tasinan.bitis) q.set("bitis", tasinan.bitis);
    if (tasinan.kanal) q.set("kanal", tasinan.kanal);
    if (tasinan.para) q.set("para", tasinan.para);
    return `${ANALIZ_YOLU}?${q.toString()}`;
  })();

  /**
   * TELEFON ÖZETİ (K293) — katlanan panelin düğmesinde yazar: açık süzgeçler
   * liste okunurken görünür kalsın. Kural saf gövdede (`lib/rapor/analiz-ozeti`):
   * sayı yalnız varsayılandan sapanları sayar; burada yalnız metne çevrilir.
   */
  const ozetParcalari = analizOzetParcalari({
    eksen,
    pencere: guncelPencere,
    kanal: tasinan.kanal ?? null,
    para: guncelPara,
    kova: suzgec.kova,
    markaSayisi: suzgec.markalar.length,
    kategoriSayisi: suzgec.kategoriler.length,
    minAdet: suzgec.minAdet,
    minCiro: suzgec.minCiro,
    favori: suzgec.favoriYalniz,
    incelenecek: suzgec.incelenecekYalniz,
    sezon: suzgec.sezon,
  });
  const parcaMetni = (o: OzetParcasi): string => {
    switch (o.tur) {
      case "donem":
        return tPencere(PENCERE_ANAHTARI[o.deger as PencereTuru]);
      case "kanal":
        return kanalSecenekleri.find((k) => k.code === o.deger)?.name ?? o.deger;
      case "para":
        return o.deger;
      case "kova":
        return tStok(`yasKova${o.deger}`);
      case "sezon":
        return o.deger === "YAZ" ? t("sezonYaz") : t("sezonKis");
      case "marka":
      case "kategori":
      case "minAdet":
      case "minCiro":
        return t("ozetEtiketSayi", { ad: t(o.tur), sayi: o.sayi });
      case "favori":
        return t("favoriYalniz");
      case "incelenecek":
        return t("incelenecekYalniz");
    }
  };
  const ozetMetni = ozetParcalari.map(parcaMetni).join(" · ");
  const acikSayi = acikSuzgecSayisi(ozetParcalari);

  /**
   * İKİ KATMAN (kullanıcı kararı 31.10.2026: «çok karışık görünüyor» → seçenek
   * sunuldu, «iki katman» seçildi). Altı grup eşit ağırlıkta alt alta
   * duruyordu; göz neyin önemli olduğunu ayıramıyordu.
   *  · ÜSTTE her zaman: Dönem · Kanal (stokta raf yaşı) · Sırala/Yön/Satır/Para.
   *  · «Daha fazla süzgeç» altında: en az adet/ciro · etiket · mevsim · marka ·
   *    kategori — seyrek kullanılanlar. Açık olanların SAYISI düğmede yazar.
   *  · Açık ikincil süzgeçler listenin üstünde ✕'li etiket: kapalı bölmenin
   *    içinde unutulan bir süzgeç rakamı «yanlış» gösterirdi.
   */
  const ikincilSayi =
    suzgec.markalar.length +
    suzgec.kategoriler.length +
    (suzgec.minAdet !== null ? 1 : 0) +
    (suzgec.minCiro !== null ? 1 : 0) +
    (suzgec.favoriYalniz ? 1 : 0) +
    (suzgec.incelenecekYalniz ? 1 : 0) +
    (suzgec.sezon !== null ? 1 : 0);

  /** Her etiket YALNIZ kendi süzgecini kaldıran adrese gider (İlke #10). */
  const acikEtiketler: { anahtar: string; metin: string; adres: string }[] = [];
  if (suzgec.arama) {
    acikEtiketler.push({
      anahtar: "arama",
      metin: t("etiketDeger", { ad: t("aramaBaslik"), deger: suzgec.arama }),
      adres: analizAdresi({ ...taban, arama: null }),
    });
  }
  for (const m of suzgec.markalar) {
    acikEtiketler.push({
      anahtar: `marka-${m}`,
      metin: t("etiketDeger", { ad: t("marka"), deger: m }),
      adres: analizAdresi({ ...taban, markalar: suzgec.markalar.filter((x) => x !== m) }),
    });
  }
  for (const k of suzgec.kategoriler) {
    acikEtiketler.push({
      anahtar: `kategori-${k}`,
      metin: t("etiketDeger", { ad: t("kategori"), deger: k }),
      adres: analizAdresi({ ...taban, kategoriler: suzgec.kategoriler.filter((x) => x !== k) }),
    });
  }
  if (suzgec.minAdet !== null) {
    acikEtiketler.push({
      anahtar: "minAdet",
      metin: t("etiketDeger", { ad: t("minAdet"), deger: bicim.sayi(suzgec.minAdet) }),
      adres: analizAdresi({ ...taban, minAdet: null }),
    });
  }
  if (suzgec.minCiro !== null) {
    acikEtiketler.push({
      anahtar: "minCiro",
      metin: t("etiketDeger", { ad: t("minCiro"), deger: bicim.para(suzgec.minCiro, guncelPara) }),
      adres: analizAdresi({ ...taban, minCiro: null }),
    });
  }
  if (suzgec.favoriYalniz) {
    acikEtiketler.push({
      anahtar: "favori",
      metin: t("favoriYalniz"),
      adres: analizAdresi({ ...taban, favori: undefined }),
    });
  }
  if (suzgec.incelenecekYalniz) {
    acikEtiketler.push({
      anahtar: "incelenecek",
      metin: t("incelenecekYalniz"),
      adres: analizAdresi({ ...taban, incelenecek: undefined }),
    });
  }
  if (suzgec.sezon !== null) {
    acikEtiketler.push({
      anahtar: "sezon",
      metin: t("etiketDeger", {
        ad: t("sezonBaslik"),
        deger: suzgec.sezon === "YAZ" ? t("sezonYaz") : t("sezonKis"),
      }),
      adres: analizAdresi({ ...taban, sezon: undefined }),
    });
  }

  /** Satır başı etiketi — üst katmanda grupların adı solda, sabit genişlikte. */
  const SATIR_ETIKETI = "text-muted-foreground w-full text-xs font-medium sm:w-16 sm:shrink-0";
  const SECIM_KUTUSU = "border-input bg-background h-11 w-full rounded-md border px-3 text-sm";

  return (
    <form
      method="get"
      action={ANALIZ_YOLU}
      className="bg-muted/30 space-y-3 rounded-lg border p-3"
    >
      {/* Süzgece ait OLMAYAN durum gizli alanlarla taşınır: form
          gönderilince dönem ve eksen kaybolmasın. */}
      <input type="hidden" name="eksen" value={eksen} />
      {tasinan.pencere ? (
        <input type="hidden" name="pencere" value={tasinan.pencere} />
      ) : null}
      {tasinan.baslangic ? (
        <input type="hidden" name="baslangic" value={tasinan.baslangic} />
      ) : null}
      {tasinan.bitis ? (
        <input type="hidden" name="bitis" value={tasinan.bitis} />
      ) : null}
      {tasinan.kanal ? (
        <input type="hidden" name="kanal" value={tasinan.kanal} />
      ) : null}
      {tasinan.para ? (
        <input type="hidden" name="para" value={tasinan.para} />
      ) : null}
      {/* ⚠ KOVA/ÇEYREK/FAVORİ/İNCELENECEK/SEZON GİZLİ ALANLA TAŞINIYOR:
          çiple seçilip formdan uygulanınca kaybolsaydı, kullanıcı "marka
          ekledim, yaş süzgecim düştü" derdi (K131'in AYNI kuralı, K212'de
          genişledi). */}
      {suzgec.kova !== null ? (
        <input type="hidden" name="kova" value={suzgec.kova} />
      ) : null}
      {eksen === "mevsim" ? (
        <input type="hidden" name="ceyrek" value={ceyrek} />
      ) : null}
      {suzgec.favoriYalniz ? (
        <input type="hidden" name="favori" value="1" />
      ) : null}
      {suzgec.incelenecekYalniz ? (
        <input type="hidden" name="incelenecek" value="1" />
      ) : null}
      {suzgec.sezon !== null ? (
        <input type="hidden" name="sezon" value={suzgec.sezon} />
      ) : null}

      {/* ── ARAMA — barkod/EAN, SKU, Firma SKU, kanal kodları, ürün adı
          (K212, kullanıcı isteği 11.09.2026). Kamera + USB okuyucu (İlke #7,
          bulgu 11.09.2026) — bkz. `analiz-arama-kutusu.tsx` başlığı. */}
      <div className="space-y-1.5">
        <label
          htmlFor="analiz-arama"
          className="sr-only"
        >
          {t("aramaBaslik")}
        </label>
        <AnalizAramaKutusu
          taban={taban}
          baslangic={suzgec.arama ?? ""}
          ipucu={t("aramaYer")}
        />
      </div>

      {/* K293 — arama dışındaki HER ŞEY telefonda «Süzgeçler» düğmesinin
          arkasında (varsayılan kapalı); masaüstünde her zaman açık. */}
      <TelefonSuzgecKabi baslik={t("suzgecler")} ozet={ozetMetni} acikSayi={acikSayi}>

      {/* ═══ ÜST KATMAN — sık kullanılanlar, hepsi tek tıkla uygulanır ═══ */}

      {/* ── RAF YAŞI KOVALARI — YALNIZ STOK EKSENİNDE (K131) ──
          ⛔ Öteki eksenlerde ÇİZİLMİYOR ve bu bilinçli: satış satırlarının
          `yasGun`u tanım gereği `null`, kova seçilse hiçbir satır geçmezdi.
          Tıklanabilir görünüp boş liste açan bir çip, kullanıcıya "sistem
          bozuk" dedirtirdi (İlke #2 + #5).

          ⚠ ÇİPLER `<select>` DEĞİL: tek tıkla seçilip tek tıkla kalkıyor
          ve form göndermeye gerek yok — kova KÜMEYİ belirler, ötekiler
          küme İÇİNDE daraltır. */}
      {eksen === "stok" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className={SATIR_ETIKETI}>
            {tStok("yasKovaBaslik")}
          </span>
          <div className={KAYAN_SATIR}>
            {YAS_KOVALARI.map((k) => {
              const aktif = suzgec.kova === k.kod;
              return (
                <Link
                  key={k.kod}
                  /** Aktif kovaya tekrar basmak süzgeci KALDIRIR (İlke #10). */
                  href={analizAdresi({
                    ...tasinan,
                    markalar: suzgec.markalar,
                    kategoriler: suzgec.kategoriler,
                    minAdet: suzgec.minAdet,
                    minCiro: suzgec.minCiro,
                    kova: aktif ? null : k.kod,
                    sirala: sira,
                    yon,
                    satir,
                  })}
                  aria-current={aktif ? "true" : undefined}
                  className={chipSinifi(aktif)}
                >
                  {tStok(`yasKova${k.kod}`)}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── DÖNEM VE KANAL — YALNIZ ÜÇ SATIŞ EKSENİNDE (K210) ──
          ⛔ STOK VE MEVSİM EKSENİNDE ÇİZİLMİYOR. `stokEkseniVerisi` bunları
          hiç parametre almıyor; `mevsimselVerisi` de (K212) TÜM geçmişi TRY
          sabit okuyor, ikisi de bilerek. Tıklanabilir görünüp hiçbir şeyi
          değiştirmeyen bir kontrol İlke #2 + #5'i çiğnerdi.

          ⚠ BUNLAR "SÜZGEÇ TEMİZLE"YE GİRMEZ — EKSEN gibi bir GÖRÜNÜM seçimi
          (bkz. `temizAdres` pencere/kanal/parayı KORUYOR). */}
      {eksen !== "stok" && eksen !== "mevsim" ? (
        <div className="space-y-3">
          {/* ── DÖNEM ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={SATIR_ETIKETI}>{t("donemBaslik")}</span>
            {/* K293: telefonda dönem çipleri tek satır kayar; «Özel aralık»
                kaydırılan satırın DIŞINDA (açılan form kırpılmasın).
                Masaüstünde `md:contents` → iç kap yok. */}
            <div className={`${KAYAN_SATIR} max-md:w-full md:contents`}>
            {RAPOR_PENCERELERI.filter((tur) => tur !== "OZEL").map(
              (tur) => {
                const aktif = guncelPencere === tur;
                return (
                  <Link
                    key={tur}
                    href={analizAdresi({
                      ...taban,
                      pencere: tur,
                      baslangic: undefined,
                      bitis: undefined,
                    })}
                    aria-current={aktif ? "true" : undefined}
                    className={chipSinifi(aktif)}
                  >
                    {tPencere(PENCERE_ANAHTARI[tur])}
                  </Link>
                );
              },
            )}
            </div>
            {/* ⚠ `<details>` — JAVASCRIPT'SİZ AÇILIR/KAPANIR (native HTML).
                Kendi KÜÇÜK formu var: ana "Uygula"ya karışırsa `pencere`
                alanı İKİ KEZ gönderilir (biri bu, biri üstteki taşıyıcı)
                ve hangisinin geçerli olacağı belirsizleşirdi. */}
            <details className="bg-background rounded-md border">
              <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 px-3 text-sm font-medium">
                <CalendarRange className="size-4" aria-hidden />
                {tPencere("ozel")}
                {guncelPencere === "OZEL" ? (
                  <span className="text-muted-foreground text-xs font-normal">
                    {tasinan.baslangic} – {tasinan.bitis}
                  </span>
                ) : null}
              </summary>
              <form
                method="get"
                action={ANALIZ_YOLU}
                className="flex flex-wrap items-end gap-2 border-t p-2"
              >
                <input type="hidden" name="eksen" value={eksen} />
                <input type="hidden" name="pencere" value="OZEL" />
                {tasinan.kanal ? (
                  <input type="hidden" name="kanal" value={tasinan.kanal} />
                ) : null}
                {tasinan.para ? (
                  <input type="hidden" name="para" value={tasinan.para} />
                ) : null}
                {suzgec.markalar.map((m) => (
                  <input key={m} type="hidden" name="marka" value={m} />
                ))}
                {suzgec.kategoriler.map((k) => (
                  <input key={k} type="hidden" name="kategori" value={k} />
                ))}
                {suzgec.minAdet !== null ? (
                  <input
                    type="hidden"
                    name="minAdet"
                    value={suzgec.minAdet}
                  />
                ) : null}
                {suzgec.minCiro !== null ? (
                  <input
                    type="hidden"
                    name="minCiro"
                    value={suzgec.minCiro}
                  />
                ) : null}
                <input type="hidden" name="sirala" value={sira} />
                <input type="hidden" name="yon" value={yon} />
                <input type="hidden" name="satir" value={satir} />
                <div className="space-y-1">
                  <Label
                    htmlFor="analiz-baslangic"
                    className="text-muted-foreground text-xs"
                  >
                    {t("baslangic")}
                  </Label>
                  <Input
                    id="analiz-baslangic"
                    name="baslangic"
                    type="date"
                    defaultValue={tasinan.baslangic ?? ""}
                    className="h-11 w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="analiz-bitis"
                    className="text-muted-foreground text-xs"
                  >
                    {t("bitis")}
                  </Label>
                  <Input
                    id="analiz-bitis"
                    name="bitis"
                    type="date"
                    defaultValue={tasinan.bitis ?? ""}
                    className="h-11 w-40"
                  />
                </div>
                <Button type="submit" size="sm" className="h-11">
                  {t("uygula")}
                </Button>
              </form>
            </details>
          </div>

          {/* ── KANAL ──
              ⛔ K293-② (kullanıcı 28.09.2026: «telefonda Trendyol yok»): kanal
              satırı ilk hâlde YANA KAYIYORDU ve kaydırma çubuğu gizliydi — sıra
              alfabetik, Trendyol en sonda, ekranın dışında kaldı. Kanal
              seçenekleri satışı olan kanallarla sınırlı (bugün 5) → telefonda da
              SARAR, hepsi aynı anda görünür. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={SATIR_ETIKETI}>{t("kanalBaslik")}</span>
            <div className="flex flex-wrap gap-2" aria-label={t("kanalBaslik")}>
              <Link
                href={analizAdresi({ ...taban, kanal: undefined })}
                aria-current={!tasinan.kanal ? "true" : undefined}
                className={chipSinifi(!tasinan.kanal)}
              >
                {t("kanalHepsi")}
              </Link>
              {kanalSecenekleri.map((k) => {
                const aktif = tasinan.kanal === k.code;
                return (
                  <Link
                    key={k.code}
                    href={analizAdresi({
                      ...taban,
                      kanal: aktif ? undefined : k.code,
                    })}
                    aria-current={aktif ? "true" : undefined}
                    className={chipSinifi(aktif)}
                  >
                    {k.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── SIRALAMA SATIRI — Sırala · Yön · Satır (DEĞİŞİNCE ANINDA
          uygulanır) + satış eksenlerinde Para birimi. Telefonda üç seçim TEK
          SATIRDA (K293). */}
      <div className="flex flex-wrap items-end gap-3 border-t pt-3">
        {/* ── SIRALAMA — anında uygulanır ── */}
        <div className="w-[calc(50%-0.375rem)] space-y-1.5 sm:w-44">
          <label
            htmlFor="analiz-sirala"
            className="text-muted-foreground text-xs font-medium"
          >
            {t("sirala")}
          </label>
          <OtomatikGonderSecim
            id="analiz-sirala"
            name="sirala"
            defaultValue={sira}
            className={SECIM_KUTUSU}
          >
            {SIRALAMA_ALANLARI.map((a) => (
              <option key={a} value={a}>
                {siraEtiketi[a]}
              </option>
            ))}
          </OtomatikGonderSecim>
        </div>

        {/* ── YÖN — anında uygulanır ── */}
        <div className="w-[calc(30%-0.375rem)] space-y-1.5 sm:w-32">
          <label
            htmlFor="analiz-yon"
            className="text-muted-foreground text-xs font-medium"
          >
            {t("yon")}
          </label>
          <OtomatikGonderSecim
            id="analiz-yon"
            name="yon"
            defaultValue={yon}
            className={SECIM_KUTUSU}
          >
            <option value="azalan">{t("yonAzalan")}</option>
            <option value="artan">{t("yonArtan")}</option>
          </OtomatikGonderSecim>
        </div>

        {/* ── SATIR SAYISI — anında uygulanır ──
            Kullanıcı: "50 ürüne kadar listelensin, istekle 100'e çıkabilsin." */}
        <div className="min-w-0 flex-1 space-y-1.5 sm:w-24 sm:flex-none">
          <label
            htmlFor="analiz-satir"
            className="text-muted-foreground text-xs font-medium"
          >
            {t("satirSayisi")}
          </label>
          <OtomatikGonderSecim
            id="analiz-satir"
            name="satir"
            defaultValue={String(satir)}
            className={SECIM_KUTUSU}
          >
            {SATIR_SAYILARI.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </OtomatikGonderSecim>
        </div>

        {/* ── PARA BİRİMİ — YALNIZ SATIŞ EKSENLERİNDE (dönem/kanal ile aynı
            gerekçe). ⚠ SEÇENEK İKİYLE SINIRLI — anayasa: Currency = TRY | EUR. */}
        {eksen !== "stok" && eksen !== "mevsim" ? (
          <div className="space-y-1.5">
            <span className="text-muted-foreground block text-xs font-medium">
              {t("paraBaslik")}
            </span>
            <div className="flex gap-2">
              {(["TRY", "EUR"] as const).map((pb) => {
                const aktif = guncelPara === pb;
                return (
                  <Link
                    key={pb}
                    href={analizAdresi({
                      ...taban,
                      para: pb === "TRY" ? undefined : pb,
                    })}
                    aria-current={aktif ? "true" : undefined}
                    className={chipSinifi(aktif)}
                  >
                    {pb}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* ═══ ALT KATMAN — «Daha fazla süzgeç» ═══
          ⚠ `<details>` KAPALIYKEN DE içindeki alanlar FORMLA GÖNDERİLİR
          (yalnız gizlenir) — marka seçip kapatan kullanıcının seçimi düşmez.
          Açık süzgeç varsa SAYISI başlıkta yazar ve bölme AÇIK gelir. */}
      <details className="bg-background rounded-md border" open={ikincilSayi > 0}>
        <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium">
          <SlidersHorizontal className="size-4" aria-hidden />
          {t("dahaFazlaSuzgec")}
          {ikincilSayi > 0 ? (
            <Badge variant="secondary">{ikincilSayi}</Badge>
          ) : null}
          <ChevronDown className="text-muted-foreground ml-auto size-4" aria-hidden />
        </summary>
        <div className="space-y-3 border-t p-3">

        {/* ── EŞİKLER — "Uygula"yı bekler (serbest metin)
            ⚠ Yer tutucu "örn. 2" — girilmiş DEĞER sanılmasın (İlke #11).
            Telefonda En az adet · En az ciro TEK SATIRDA. */}
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="space-y-1.5">
            <label
              htmlFor="analiz-min-adet"
              className="text-muted-foreground text-xs font-medium"
            >
              {t("minAdet")}
            </label>
            <Input
              id="analiz-min-adet"
              name="minAdet"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              defaultValue={suzgec.minAdet ?? ""}
              placeholder={t("minAdetYer")}
              className="h-11"
            />
          </div>

          {/* ── EN AZ CİRO — "Uygula"yı bekler ── */}
          <div className="space-y-1.5">
            <label
              htmlFor="analiz-min-ciro"
              className="text-muted-foreground text-xs font-medium"
            >
              {t("minCiro")}
            </label>
            <Input
              id="analiz-min-ciro"
              name="minCiro"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              defaultValue={suzgec.minCiro ?? ""}
              placeholder={t("minCiroYer")}
              className="h-11"
            />
          </div>
        </div>

        {/* ── FAVORİ / İNCELENECEK / SEZON — TÜM EKSENLERDE (K212) ──
            ⛔ Dönem/Kanal/Para'nın TERSİNE her eksende çizilir: etiketler
            ÜRÜNE ait, hangi eksene bakıldığından bağımsız. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={SATIR_ETIKETI}>
              {t("etiketBaslik")}
            </span>
            <Link
              href={analizAdresi({
                ...taban,
                favori: !suzgec.favoriYalniz ? true : undefined,
              })}
              aria-current={suzgec.favoriYalniz ? "true" : undefined}
              className={chipSinifi(suzgec.favoriYalniz)}
            >
              <Star className="size-4" aria-hidden />
              {t("favoriYalniz")}
            </Link>
            <Link
              href={analizAdresi({
                ...taban,
                incelenecek: !suzgec.incelenecekYalniz ? true : undefined,
              })}
              aria-current={suzgec.incelenecekYalniz ? "true" : undefined}
              className={chipSinifi(suzgec.incelenecekYalniz)}
            >
              <Flag className="size-4" aria-hidden />
              {t("incelenecekYalniz")}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              {t("sezonBaslik")}
            </span>
            <Link
              href={analizAdresi({ ...taban, sezon: undefined })}
              aria-current={suzgec.sezon === null ? "true" : undefined}
              className={chipSinifi(suzgec.sezon === null)}
            >
              {t("sezonHepsi")}
            </Link>
            {(["YAZ", "KIS"] as const).map((sz) => (
              <Link
                key={sz}
                href={analizAdresi({
                  ...taban,
                  sezon: suzgec.sezon === sz ? undefined : sz,
                })}
                aria-current={suzgec.sezon === sz ? "true" : undefined}
                className={chipSinifi(suzgec.sezon === sz)}
              >
                {sz === "YAZ" ? t("sezonYaz") : t("sezonKis")}
              </Link>
            ))}
          </div>
        </div>

        {/* ── MARKA VE KATEGORİ — katlanır, çünkü uzun.
            `<details>` VARSAYILAN KAPALI: açık gelseydi 100+ marka ekranı
            yutar ve asıl liste ekranın altına düşerdi (İlke #13). */}
        <div className="grid gap-3 md:grid-cols-2">
          <OnayIzgarasi
            ad="marka"
            baslik={t("marka")}
            hepsiMetni={t("markaHepsi")}
            secenekler={markaSecenekleri}
            secili={suzgec.markalar}
          />
          <OnayIzgarasi
            ad="kategori"
            baslik={t("kategori")}
            hepsiMetni={t("kategoriHepsi")}
            secenekler={kategoriSecenekleri}
            secili={suzgec.kategoriler}
          />
        </div>

        {/* ── UYGULA — yalnız EŞİKLER ve MARKA/KATEGORİ için gerekli;
            ötekiler zaten tek tıkla uygulanmıştı. */}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="h-11 max-md:flex-1">
            {t("uygula")}
          </Button>
        </div>
        </div>
      </details>
      </TelefonSuzgecKabi>

      {/* ── AÇIK SÜZGEÇLER — kabın DIŞINDA: telefonda panel kapalıyken de
          görünür. Her etiket ✕ ile YALNIZ kendini kaldırır; «Tümünü temizle»
          dönem/kanal/parayı korur (bkz. `temizAdres`).
          Süzgeç yoksa satır hiç çizilmez: hiçbir şeyi temizlemeyen bir
          düğme, tıklanabilir görünüp hiçbir şey yapmaz (İlke #2). */}
      {suzgecVarMi ? (
        <div className="flex flex-wrap items-center gap-2">
          {acikEtiketler.length > 0 ? (
            <span className="text-muted-foreground text-xs font-medium">
              {t("acikSuzgecler")}
            </span>
          ) : null}
          {acikEtiketler.map((e) => (
            <Link
              key={e.anahtar}
              href={e.adres}
              aria-label={t("suzgeciKaldir", { ad: e.metin })}
              className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors"
            >
              <span className="max-w-56 truncate">{e.metin}</span>
              <X className="size-4 shrink-0" aria-hidden />
            </Link>
          ))}
          <Button asChild variant="ghost" className="h-11">
            <Link href={temizAdres}>
              <RotateCcw />
              {t("temizle")}
            </Link>
          </Button>
        </div>
      ) : null}
    </form>
  );
}

/**
 * Onay kutusu ızgarası — katlanır bölüm içinde.
 *
 * ⚠ SEÇİLİ SAYISI BAŞLIKTA YAZAR. Bölüm kapalıyken içeride bir seçim olup
 * olmadığı görünmezdi; kullanıcı süzülmüş bir listeye bakıp süzgeci
 * unutabilir ve rakamı "yanlış" sanabilirdi.
 */
function OnayIzgarasi({
  ad,
  baslik,
  hepsiMetni,
  secenekler,
  secili,
}: {
  ad: string;
  baslik: string;
  hepsiMetni: string;
  secenekler: { ad: string; sayi: number }[];
  secili: string[];
}) {
  if (secenekler.length === 0) return null;

  return (
    <details className="bg-background rounded-md border" open={secili.length > 0}>
      <summary className="flex h-11 cursor-pointer items-center px-3 text-sm font-medium">
        {baslik}
        <span className="text-muted-foreground ml-2 text-xs font-normal">
          {secili.length === 0 ? hepsiMetni : `${secili.length}`}
        </span>
      </summary>
      <div className="max-h-64 overflow-y-auto border-t p-2">
        <div className="grid gap-0.5 sm:grid-cols-2">
          {secenekler.map((s) => (
            <label
              key={s.ad}
              /** Tıklama alanı etiketin tamamı — 44 px yükseklik (İlke #8). */
              className="hover:bg-muted flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-sm"
            >
              <input
                type="checkbox"
                name={ad}
                value={s.ad}
                defaultChecked={secili.includes(s.ad)}
                className="size-4 shrink-0"
              />
              <span className="min-w-0 flex-1 truncate">{s.ad}</span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {s.sayi}
              </span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}
