import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  analizAdresi,
  ANALIZ_YOLU,
  SATIR_SAYILARI,
  SIRALAMA_ALANLARI,
  type AnalizEkseni,
  type AnalizSuzgeci,
  type SatirSayisi,
  type SiralamaAlani,
  type Yon,
} from "@/lib/rapor/urun-analizi";
import { YAS_KOVALARI } from "@/lib/yaslanma";

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
  markaSecenekleri,
  kategoriSecenekleri,
  suzgecVarMi,
}: {
  eksen: AnalizEkseni;
  tasinan: TasinanParametreler;
  suzgec: AnalizSuzgeci;
  sira: SiralamaAlani;
  yon: Yon;
  satir: SatirSayisi;
  /** Süzülmemiş kümeden — ad ve o markadaki ürün sayısı. */
  markaSecenekleri: { ad: string; sayi: number }[];
  kategoriSecenekleri: { ad: string; sayi: number }[];
  /** En az bir süzgeç etkinse "temizle" bağlantısı çizilir. */
  suzgecVarMi: boolean;
}) {
  const t = await getTranslations("UrunAnalizi");
  /** Kova adları `Stok` ad alanında — ikinci bir kopya iki ekranı ayrıştırırdı. */
  const tStok = await getTranslations("Stok");

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

  return (
    <form
      method="get"
      action={ANALIZ_YOLU}
      className="bg-muted/30 space-y-4 rounded-lg border p-3"
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
      {/* ⚠ KOVA GİZLİ ALANLA TAŞINIYOR: çiple seçilip formdan uygulanınca
          kaybolsaydı, kullanıcı "marka ekledim, yaş süzgecim düştü" derdi. */}
      {suzgec.kova !== null ? (
        <input type="hidden" name="kova" value={suzgec.kova} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* ── SIRALAMA ── */}
        <div className="space-y-1.5">
          <label
            htmlFor="analiz-sirala"
            className="text-muted-foreground text-xs font-medium"
          >
            {t("sirala")}
          </label>
          <select
            id="analiz-sirala"
            name="sirala"
            defaultValue={sira}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
          >
            {SIRALAMA_ALANLARI.map((a) => (
              <option key={a} value={a}>
                {siraEtiketi[a]}
              </option>
            ))}
          </select>
        </div>

        {/* ── YÖN ── */}
        <div className="space-y-1.5">
          <label
            htmlFor="analiz-yon"
            className="text-muted-foreground text-xs font-medium"
          >
            {t("yon")}
          </label>
          <select
            id="analiz-yon"
            name="yon"
            defaultValue={yon}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
          >
            <option value="azalan">{t("yonAzalan")}</option>
            <option value="artan">{t("yonArtan")}</option>
          </select>
        </div>

        {/* ── EN AZ ADET ──
            ⚠ Yer tutucu "örn. 2" — girilmiş DEĞER sanılmasın (İlke #11). */}
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

        {/* ── EN AZ CİRO ── */}
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

      {/* ── RAF YAŞI KOVALARI — YALNIZ STOK EKSENİNDE (K131) ──
          ⛔ Öteki eksenlerde ÇİZİLMİYOR ve bu bilinçli: satış satırlarının
          `yasGun`u tanım gereği `null`, kova seçilse hiçbir satır geçmezdi.
          Tıklanabilir görünüp boş liste açan bir çip, kullanıcıya "sistem
          bozuk" dedirtirdi (İlke #2 + #5).

          ⚠ ÇİPLER `<select>` DEĞİL: tek tıkla seçilip tek tıkla kalkıyor
          ve form göndermeye gerek yok — kova KÜMEYİ belirler, ötekiler
          küme İÇİNDE daraltır. */}
      {eksen === "stok" ? (
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-medium">
            {tStok("yasKovaBaslik")}
          </span>
          <div className="flex flex-wrap gap-2">
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
                  className={
                    "inline-flex h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors " +
                    (aktif
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted")
                  }
                >
                  {tStok(`yasKova${k.kod}`)}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

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

      <div className="flex flex-wrap items-end gap-3">
        {/* ── SATIR SAYISI ──
            Kullanıcı: "50 ürüne kadar listelensin, istekle 100'e çıkabilsin." */}
        <div className="space-y-1.5">
          <label
            htmlFor="analiz-satir"
            className="text-muted-foreground text-xs font-medium"
          >
            {t("satirSayisi")}
          </label>
          <select
            id="analiz-satir"
            name="satir"
            defaultValue={String(satir)}
            className="border-input bg-background h-11 rounded-md border px-3 text-sm"
          >
            {SATIR_SAYILARI.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="h-11">
          {t("uygula")}
        </Button>

        {/* Süzgeç yoksa çizilmez: hiçbir şeyi temizlemeyen bir düğme,
            tıklanabilir görünüp hiçbir şey yapmaz (İlke #2). */}
        {suzgecVarMi ? (
          <Button asChild variant="ghost" className="h-11">
            <Link href={temizAdres}>
              <RotateCcw />
              {t("temizle")}
            </Link>
          </Button>
        ) : null}
      </div>
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
