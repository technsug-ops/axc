"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MapPin, PackageCheck, RotateCcw } from "lucide-react";

import { paketlemeIcinAra, type PaketAramasi } from "@/app/paketle/actions";
import {
  paketlemeyiGeriAl,
  paketlendiIsaretle,
} from "@/app/okut/actions";
import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { DurumRozeti } from "@/components/durum-rozeti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import {
  kalemBul,
  paketlenebilirMi,
  rafiEksikOlanlar,
  siradakiAdim,
  type PaketKalemi,
  type PaketSiparisi,
} from "@/lib/paketleme/yonlendirme";

/**
 * ============================================================================
 *  YÖNLENDİRMELİ PAKETLEME — EKRAN (K46)
 * ----------------------------------------------------------------------------
 *  Halil tarifi: kargo kodu okut → sistem ürün + adet + RAF söyler → raftan
 *  aldığın ürünü okut → eşleşirse onay → paketlendi. İKİ OKUTMA, SIFIR EZBER.
 *
 *  ⚠ EKRAN KARAR VERMEZ, ÇİZER. Adım seçimi · kalem eşleştirme · "paketlendi
 *  basılabilir mi" — üçü de `lib/paketleme/yonlendirme.ts`te ve orası
 *  veritabanısız sınanıyor (`paketleme:dogrula`). Buraya kural yazmak, aynı
 *  kuralın iki yerde yaşamasına ve birinin gün gelip ötekinden ayrışmasına
 *  yol açardı.
 *
 *  ⚠ EŞLEŞMEME UYARI DEĞİL BİLGİDİR. Kırmızı yok, engel yok: defterin bir
 *  kısmı eksikken kırmızı uyarı çoğunlukla HAKLI OLARAK çalar ve kullanıcı
 *  iki haftada okumadan geçmeyi öğrenir (K34'ün kilitli olma sebebi). Bu
 *  ekran ARAR, SUÇLAMAZ.
 *
 *  ⚠ OKUNAN DEĞER PARAMETRE OLARAK GEÇER, DURUMDAN OKUNMAZ. Kamera
 *  `setKod` çağırıp hemen aramayı tetiklerse React durumu senkron
 *  güncellenmediği için arama HÂLÂ ESKİ kodu kullanır — ekranda hata yok,
 *  yalnız yanlış ürün (fiyat denemesi vakası, 23.08.2026).
 * ============================================================================
 */

/**
 * SESLİ ONAY — DOSYASIZ.
 *
 * ⚠ Halil tarifinde "görsel/SESLİ onay" var: depoda telefon elde, ekrana
 * bakmadan çalışılıyor. Ses dosyası gömmek yerine tek bir ton üretiliyor —
 * ne ağ isteği ne varlık; artifact CSP'si ya da çevrimdışı hâl bunu bozmaz.
 *
 * ⚠ SESSİZ DÜŞER. Tarayıcı `AudioContext` vermezse (izin yok, eski cihaz,
 * sekme arka planda) akış aynen sürer — ses bir KOLAYLIK, kapı değil.
 */
function tonCal(eslesti: boolean) {
  try {
    const Ses =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ses) return;
    const ctx = new Ses();
    const osc = ctx.createOscillator();
    const kazanc = ctx.createGain();
    /* Eşleşti = yüksek ve kısa; eşleşmedi = alçak. Ayrım KULAKLA yapılabilmeli. */
    osc.frequency.value = eslesti ? 880 : 220;
    kazanc.gain.value = 0.08;
    osc.connect(kazanc);
    kazanc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (eslesti ? 0.12 : 0.28));
    osc.onended = () => void ctx.close();
  } catch {
    /* Ses yoksa akış durmaz. */
  }
}

/**
 * ⚠ BAŞLANGIÇ DEĞERİ SUNUCUDAN GELİR, İSTEMCİDE İKİNCİ KEZ ARANMAZ.
 * `?kod=` ile gelindiğinde arama sayfada (sunucuda) yapılıyor ve sonucu
 * buraya hazır düşüyor. İstemcide `useEffect` ile tekrar aramak, aynı
 * kodu iki kez sorgulamak ve ekranın bir an boş görünmesi demekti.
 */
export function Paketleyici({
  baslangicKodu = "",
  baslangic = null,
}: {
  baslangicKodu?: string;
  baslangic?: PaketAramasi | null;
} = {}) {
  const t = useTranslations("Paketle");

  const kargoOdagi = useRef<HTMLInputElement>(null);
  const urunOdagi = useRef<HTMLInputElement>(null);

  const [kargoKodu, setKargoKodu] = useState(baslangicKodu);
  const [urunKodu, setUrunKodu] = useState("");
  const [siparis, setSiparis] = useState<PaketSiparisi | null>(
    baslangic?.durum === "BULUNDU" ? baslangic.siparis : null,
  );
  /** `null` = henüz okutulmadı · `true/false` = son okumanın sonucu. */
  const [sonOkumaEslestiMi, setSonOkuma] = useState<boolean | null>(null);
  const [okunmayanKod, setOkunmayanKod] = useState<string | null>(null);
  /**
   * ⚠ "BULUNAMADI" TEK BAYRAK DEĞİL, SEBEBİ TAŞIYAN BİR DEĞER. Üç apayrı
   * durum (hiç yok · kargoya verilmiş · iptal) tek cümleye sıkışınca
   * kullanıcı yanlış işe yönelir: kodu yeniden okutur, oysa yapılacak şey
   * satışa gönderi numarasını girmektir. (Canlı vaka 25.08.2026, HB etiketi.)
   */
  const [bulunamadi, setBulunamadi] = useState<Exclude<
    PaketAramasi,
    { durum: "BULUNDU" }
  > | null>(baslangic && baslangic.durum !== "BULUNDU" ? baslangic : null);
  const [bekliyor, basla] = useTransition();

  const adim = siradakiAdim({ siparis, sonOkumaEslestiMi });

  /** ── 1. OKUTMA: kargo/sipariş kodu ─────────────────────────────────── */
  const siparisAra = (okunan?: string) => {
    const aranacak = (okunan ?? kargoKodu).trim();
    if (!aranacak) return;
    basla(async () => {
      const cevap = await paketlemeIcinAra(aranacak);
      setSiparis(cevap.durum === "BULUNDU" ? cevap.siparis : null);
      setBulunamadi(cevap.durum === "BULUNDU" ? null : cevap);
      setSonOkuma(null);
      setOkunmayanKod(null);
      setUrunKodu("");
      if (cevap.durum === "BULUNDU") urunOdagi.current?.focus();
    });
  };

  /** ── 2. OKUTMA: raftan alınan ürün. Sunucuya GİTMEZ — kalemler elde. */
  const urunTeyitEt = (okunan?: string) => {
    const aranacak = (okunan ?? urunKodu).trim();
    if (!aranacak || !siparis) return;

    const bulunan = kalemBul(siparis.kalemler, aranacak);
    setOkunmayanKod(bulunan ? null : aranacak);
    setSonOkuma(bulunan !== null);
    tonCal(bulunan !== null);

    if (bulunan) {
      setSiparis({
        ...siparis,
        kalemler: siparis.kalemler.map((k) =>
          k.saleItemId === bulunan.kalem.saleItemId ? { ...k, teyitli: true } : k,
        ),
      });
    }
    setUrunKodu("");
    urunOdagi.current?.focus();
  };

  const paketlendi = () => {
    if (!siparis) return;
    basla(async () => {
      const cevap = await paketlendiIsaretle(
        siparis.saleId,
        siparis.gonderiKodu ?? siparis.siparisKodu ?? "",
        siparis.bulunanAlan,
      );
      if ("ok" in cevap) setSiparis({ ...siparis, hazirlaniyor: true });
    });
  };

  const geriAl = () => {
    if (!siparis) return;
    basla(async () => {
      const cevap = await paketlemeyiGeriAl(siparis.saleId);
      if ("ok" in cevap) setSiparis({ ...siparis, hazirlaniyor: false });
    });
  };

  const bastanBasla = () => {
    setSiparis(null);
    setKargoKodu("");
    setUrunKodu("");
    setSonOkuma(null);
    setOkunmayanKod(null);
    setBulunamadi(null);
    kargoOdagi.current?.focus();
  };

  const rafsizlar = siparis ? rafiEksikOlanlar(siparis) : [];

  return (
    <div className="max-w-3xl space-y-5">
      {/* ── ADIM 1 ──────────────────────────────────────────────────────── */}
      <div className="border-border space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <DurumRozeti durum={siparis ? "olumlu" : "bilgi"} isaretsiz>
            {t("adim1")}
          </DurumRozeti>
          <Label htmlFor="kargo-kodu" className="text-sm font-medium">
            {t("kargoKoduEtiketi")}
          </Label>
        </div>

        <BarkodGirisi
          id="kargo-kodu"
          value={kargoKodu}
          onChange={setKargoKodu}
          onOkundu={(k) => siparisAra(k)}
          inputRef={kargoOdagi}
          autoFocus
          disabled={bekliyor}
          placeholder={t("kargoKoduIpucu")}
          kameraBasligi={t("kargoKoduEtiketi")}
        />

        {/*
          ⚠ SESSİZ BAŞARISIZLIK YASAK (İlke #5) — VE "BULUNAMADI" ÜÇE AYRILIR.
          Tek cümle üç sebebi birden anlatamaz; kullanıcı hangi işi yapacağını
          bilemez. Sunucu sebebi ÖLÇÜP gönderiyor, ekran yalnız çiziyor.
        */}
        {bulunamadi ? (
          <p className={`text-sm ${DURUM_YAZISI.notr}`} role="status">
            {bulunamadi.durum === "HIC_YOK"
              ? t("bulunamadiHicYok")
              : bulunamadi.durum === "KARGOYA_VERILMIS"
                ? t("bulunamadiKargoyaVerilmis", {
                    siparis: bulunamadi.siparisKodu ?? "—",
                  })
                : t("bulunamadiIptal", { siparis: bulunamadi.siparisKodu ?? "—" })}
          </p>
        ) : null}
      </div>

      {/* ── ADIM 2: sipariş bulundu, RAF söyleniyor ─────────────────────── */}
      {siparis ? (
        <div className="border-border space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <DurumRozeti durum={adim === "ESLESTI" ? "olumlu" : "bilgi"} isaretsiz>
                {t("adim2")}
              </DurumRozeti>
              <span className="text-muted-foreground text-sm">{siparis.kanal}</span>
              {siparis.hazirlaniyor ? (
                <DurumRozeti durum="olumlu">{t("zatenHazirlaniyor")}</DurumRozeti>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={bastanBasla}
            >
              <RotateCcw className="size-4" />
              {t("bastanBasla")}
            </Button>
          </div>

          {/* Kimlik kodları LİSTEDE ve TIK-KOPYALA (İlke #3, #4). */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {siparis.siparisKodu ? (
              <span className="text-muted-foreground">
                {t("siparisNo")}:{" "}
                <KopyalanabilirKod deger={siparis.siparisKodu} etiket={t("siparisNo")} />
              </span>
            ) : null}
            {siparis.gonderiKodu ? (
              <span className="text-muted-foreground">
                {t("gonderiNo")}:{" "}
                <KopyalanabilirKod deger={siparis.gonderiKodu} etiket={t("gonderiNo")} />
              </span>
            ) : null}
          </div>

          {/* ── KALEMLER — RAF EN GÖRÜNÜR ŞEY ─────────────────────────── */}
          <ul className="space-y-2">
            {siparis.kalemler.map((k) => (
              <KalemSatiri key={k.saleItemId} kalem={k} />
            ))}
          </ul>

          {/* ⚠ RAF EKSİKSE AKIŞ DURMAZ, SÖYLER. */}
          {rafsizlar.length > 0 ? (
            <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
              {t("rafGirilmemis", { adet: rafsizlar.length })}
            </p>
          ) : null}

          {/* ── ADIM 3: ürün okutma ─────────────────────────────────────── */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="urun-kodu" className="text-sm font-medium">
              {t("urunKoduEtiketi")}
            </Label>
            <BarkodGirisi
              id="urun-kodu"
              value={urunKodu}
              onChange={setUrunKodu}
              onOkundu={(k) => urunTeyitEt(k)}
              inputRef={urunOdagi}
              disabled={bekliyor}
              placeholder={t("urunKoduIpucu")}
              kameraBasligi={t("urunKoduEtiketi")}
            />

            {adim === "ESLESTI" ? (
              <div className={`rounded-md p-3 ${DURUM_KUTUSU.olumlu}`} role="status">
                <p className="text-sm font-medium">{t("eslesti")}</p>
              </div>
            ) : null}

            {/*
              ⚠ NÖTR, KIRMIZI DEĞİL. "Bu siparişte yok" bir suçlama değil bir
              bilgi: kullanıcı yanlış kutuyu almış da olabilir, kayıt eksik de
              olabilir. Akış KİLİTLENMEZ — başka bir ürün okutulabilir.
            */}
            {adim === "ESLESMEDI" ? (
              <div className={`rounded-md p-3 ${DURUM_KUTUSU.notr}`} role="status">
                <p className="text-sm">
                  {t("eslesmedi", { kod: okunmayanKod ?? "" })}
                </p>
              </div>
            ) : null}
          </div>

          {/* ── ADIM 4: paketlendi ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button
              type="button"
              className="min-h-11"
              disabled={bekliyor || !paketlenebilirMi(siparis) || siparis.hazirlaniyor}
              onClick={paketlendi}
            >
              <PackageCheck className="size-4" />
              {t("paketlendi")}
            </Button>

            {siparis.hazirlaniyor ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                disabled={bekliyor}
                onClick={geriAl}
              >
                {t("geriAl")}
              </Button>
            ) : null}

            {/*
              ⚠ KİLİTLİ DÜĞME SESSİZ KALMAZ (İlke #5): niye basılamadığı ve
              nasıl basılabileceği YAZILI. Sebepsiz gri bir düğme, kullanıcıyı
              "bozuk mu" diye düşündürür.
            */}
            {!paketlenebilirMi(siparis) && !siparis.hazirlaniyor ? (
              <span className="text-muted-foreground text-xs">
                {t("paketlendiKilitli")}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Tek kalem — RAF en görünür öğe, çünkü akışın çıktısı o. */
function KalemSatiri({ kalem }: { kalem: PaketKalemi }) {
  const t = useTranslations("Paketle");

  return (
    <li
      className={`rounded-md border p-3 ${kalem.teyitli ? DURUM_KUTUSU.olumlu : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">
            {kalem.urunAdi}
            {kalem.varyantAdi ? (
              <span className="text-muted-foreground"> · {kalem.varyantAdi}</span>
            ) : null}
          </p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>
              {t("sku")}: <KopyalanabilirKod deger={kalem.sku} etiket={t("sku")} />
            </span>
            <span>
              {t("firmaSku")}: <KopyalanabilirKod deger={kalem.companySku} etiket={t("firmaSku")} />
            </span>
            {kalem.barcode ? (
              <span>
                {t("barkod")}: <KopyalanabilirKod deger={kalem.barcode} etiket={t("barkod")} />
              </span>
            ) : null}
          </div>
        </div>

        {/* ⚠ ADET VE RAF YAN YANA, KOMPAKT KUTUCUK (İlke #12). */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="bg-muted/40 rounded-md px-2.5 py-1.5 text-center">
            <p className="text-muted-foreground text-xs">{t("adet")}</p>
            <p className="text-base font-semibold tabular-nums">{kalem.adet}</p>
          </div>
          <div className="bg-muted/40 rounded-md px-2.5 py-1.5 text-center">
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPin className="size-3" aria-hidden />
              {t("raf")}
            </p>
            <p className="text-base font-semibold">
              {kalem.rafKodu ?? (
                <span className={`text-sm ${DURUM_YAZISI.uyari}`}>
                  {t("rafYok")}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}
