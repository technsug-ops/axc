"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Crown, Info, Search, Trophy, X } from "lucide-react";

import { MarjPili } from "@/components/marj-pili";
import { PastaGrafik, type PastaDilimi } from "@/components/pasta-grafik";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBicim } from "@/lib/bicim-istemci";
import { VARSAYILAN_KDV_ORANI } from "@/lib/kar";
import { marjBandi } from "@/lib/marj-bantlari";
import { ciroMarjiMetni } from "@/lib/marj-gosterge";
import {
  DURUM_KUTUSU,
  DURUM_SERIDI,
  DURUM_YAZISI,
  PASTA_RENKLERI,
  PASTA_VARSAYILAN,
  type DurumRengi,
} from "@/lib/renkler";
import { SIMULASYON_KANALLARI } from "@/lib/simulasyon/kanal-kurallari";
import type { UrunZemini } from "@/lib/simulasyon/urun-zemini";
import { urunAra } from "./actions";
import {
  girdiEksikMi,
  simulasyonKarsilastir,
  type KanalSonucu,
} from "@/lib/simulasyon/karsilastir";

/**
 * ============================================================================
 *  FİYAT DENEMESİ — EKRAN
 * ----------------------------------------------------------------------------
 *  ⚠ BU EKRAN BİR KEZ YENİDEN YAZILDI (21.08.2026). İlk hâli GET formu +
 *  sekiz sütunluk tabloydu; kullanıcı haklı olarak beğenmedi. Üç somut kusur:
 *
 *    1. HER SATIRDA PARAGRAF. Kaynak notu (2–3 satırlık cümle) her kanal
 *       satırının içine basılıyordu; tablo rakam değil METİN duvarıydı.
 *    2. SEKİZ SÜTUN. Telefonda yatay kaydırma zorunluydu (İlke #8).
 *    3. GÖNDER-BEKLE. Her deneme için form gönderiliyordu; oysa denemenin
 *       tamamı "rakamı değiştir, ne olduğuna bak" işidir.
 *
 *  Yeni hâl, depoda ZATEN OTURMUŞ dili izliyor (`kart/[variantId]/fiyat-dene`):
 *  istemcide canlı hesap, kanal başına KUTU, kaynak bir ROZET — notun kendisi
 *  ipucunda. Sıralama motordan geliyor ve KAZANAN vurgulanıyor.
 *
 *  ── HESAP İSTEMCİDE, VERİ SUNUCUDA DEĞİL ────────────────────────────────
 *  Karşılaştırma saf bir işlev ve veritabanına gitmiyor; her tuşta sunucuya
 *  gitmek denemeyi ağır ve isteksiz kılardı. (Aynı gerekçe `FiyatDene`de de
 *  yazılı — iki ekran aynı kararı iki kez vermesin diye buraya da yazıldı.)
 * ============================================================================
 */
export function Deneme({ bugun }: { bugun: string }) {
  const t = useTranslations("Simulasyon");
  const bicim = useBicim();

  const [satis, setSatis] = useState("");
  const [alis, setAlis] = useState("");
  const [kdv, setKdv] = useState(String(VARSAYILAN_KDV_ORANI));
  const [kargo, setKargo] = useState("");
  const [kdvDahil, setKdvDahil] = useState(true);
  /**
   * KANAL BAŞINA ORAN — kanal kodu → metin. Boş metin "elle girilmedi"
   * demektir ve zemine/ortak orana geri düşer.
   *
   * ⚠ NİYE VAR (kullanıcı bildirdi 21.08.2026): _"her pazar yerinde komisyon
   * oranları farklı, kâr değişimi çoğunlukla bundan çıkıyor. Sabit olunca
   * yanlış sonuç geliyor."_ Ölçüldü ve haklıydı: aynı ürünün kanaldan kanala
   * oran farkı ortanca 2 puan, p75 6,2, max 14,4 puan.
   */
  const [kanalOranlari, setKanalOranlari] = useState<Record<string, string>>(
    {},
  );
  /**
   * KANAL BAŞINA SATIŞ FİYATI (buy box) — kanal kodu → metin.
   *
   * ⚠ NİYE VAR (kullanıcı anlattı 21.08.2026): buy box her pazaryerinde
   * AYRI ve karar tam o farktan çıkıyor. Kendi örneği: alış 1000 · TY buy
   * box 2150 (%5) → 673 · HB 2250 (%13) → 533 · N11 2175 (%12) → 554.
   * **En düşük satış fiyatı en yüksek kârı veriyor.** Tek fiyatla bu soru
   * sorulamaz; kanalları aynı fiyata sabitlemek, kullanıcının fiilen
   * karşılaştığı durumu değil varsayımsal bir durumu ölçer.
   *
   * ⚠ ELLE GİRİLİYOR, OTOMASYON YOK — kullanıcı kararı 21.08.2026:
   * _"buybox fiyatlarını manuel gireceğim, ürün arama işi sırasında anlık
   * fiyatları manuel takip ediyorum; burada bir otomasyona ihtiyacım şu an
   * yok."_ Trendyol ürün listesinde `BuyBox Fiyatı` kolonu VAR ve okunabilir
   * (189/189 canlı listede dolu, barkodlu) — ama bilerek okunmuyor.
   */
  const [kanalFiyatlari, setKanalFiyatlari] = useState<Record<string, string>>(
    {},
  );

  /** Koddan bulunan ürün — null ise elle giriş kipindeyiz. */
  const [kod, setKod] = useState("");
  const [urun, setUrun] = useState<UrunZemini | null>(null);
  const [aramaHatasi, setAramaHatasi] = useState<string | null>(null);
  const [araniyor, basla] = useTransition();

  /**
   * ÜRÜN BULUNUNCA ALANLAR DOLAR — AMA KİLİTLENMEZ.
   * Kullanıcı denemek için üstüne yazabilmeli; ekranın adı "fiyat DENEMESİ".
   * Dolan değerler bir başlangıç noktasıdır, bir hüküm değil.
   */
  const ara = () => {
    setAramaHatasi(null);
    basla(async () => {
      const sonuc = await urunAra(kod);
      if (sonuc.tur !== "BULUNDU") {
        setUrun(null);
        setAramaHatasi(sonuc.mesaj);
        return;
      }
      const z = sonuc.zemin;
      setUrun(z);
      /** ⚠ ORTALAMALAR KDV DAHİL — girdi dili de dahile çevriliyor. */
      setKdvDahil(true);
      if (z.ortalamaAlis !== null) setAlis(z.ortalamaAlis.toFixed(2));
      /**
       * ⚠ SON SATIŞ FİYATI, ORTALAMA DEĞİL (kullanıcı kararı 21.08.2026).
       * Ortalama, aylar önceki bir fiyatı bugünkü denemeye karıştırır ve
       * fiyat kaymasını gizler. Hiç satılmadıysa alan BOŞ kalır ve öyle de
       * kalabilir — kapı artık ortak fiyatı şart koşmuyor.
       */
      if (z.sonSatisFiyati !== null) setSatis(z.sonSatisFiyati.toFixed(2));
      setKdv(String(z.kdvOrani));
      /**
       * ⚠ ELLE GİRİLMİŞ ORANLAR TEMİZLENİR. Önceki üründen kalan bir oran
       * yeni ürünün gerçek zeminini ezerdi ve kullanıcı bunu göremezdi —
       * sessizce yanlış kanal kazanırdı.
       */
      setKanalOranlari({});
      /** ⚠ FİYATLAR DA SIFIRLANIR — önceki ürünün buy box'ı yenisinin
          kutusunda kalsaydı, hiç görmediğimiz bir fiyatla hüküm verirdik. */
      setKanalFiyatlari({});
    });
  };

  const urunuBirak = () => {
    setUrun(null);
    setKod("");
    setAramaHatasi(null);
  };

  const sayi = (m: string) => (m.trim() === "" ? Number.NaN : Number(m));
  /**
   * Metin sözlüğünü sayı sözlüğüne çevirir; yalnız GEÇERLİ sayılar geçer.
   * ⚠ Yarım yazılmış metin ("1,") orana ya da fiyata dönüşmez. Kitaplık da
   * ayrıca süzüyor — bu, ekranın nezaketi değil ikinci kilit.
   */
  const sayiSozlugu = (kaynak: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(kaynak)
        .map(([k, v]) => [k, Number(v)] as const)
        .filter(([, v]) => Number.isFinite(v) && v >= 0),
    );
  const girdi = {
    kdvDahilMi: kdvDahil,
    satisFiyati: sayi(satis),
    alisFiyati: sayi(alis),
    /**
     * ⚠ ORTAK ORAN GÖNDERİLMİYOR — ekranda böyle bir alan YOK (21.08.2026).
     * Kullanıcı: _"burada her pazar yerine has oran girilmeli"_. Oran artık
     * yalnız kanal başına girilir; kitaplıktaki yedek alan, kanal ayrımı
     * olmayan çağıranlar (altın senaryolar) için duruyor.
     */
    kdvOrani: sayi(kdv),
    kargoUcreti: kargo.trim() === "" ? null : sayi(kargo),
    /** Yalnız GEÇERLİ sayılar geçer; yarım yazılmış metin orana dönüşmez. */
    kanalOranlari: sayiSozlugu(kanalOranlari),
    kanalFiyatlari: sayiSozlugu(kanalFiyatlari),
  };

  const eksik = girdiEksikMi(girdi);
  /**
   * ⚠ "BUGÜN" SUNUCUDAN GELİYOR, `new Date()` DEĞİL. İş saat dilimi sabittir
   * (Europe/Istanbul) ve tarayıcının saat dilimi ASLA kullanılmaz — anayasa.
   */
  const sonuclar = eksik
    ? []
    : simulasyonKarsilastir(girdi, new Date(bugun), urun?.zeminler ?? []);
  const para = (n: number) => bicim.para(n, "TRY");
  /**
   * Kanal kodu → sonuç. Komisyon kutuları SONUÇTAN beslenir (yer tutucu ve
   * kaynak satırı), ama SIRALARI sonuçtan gelmez.
   *
   * ⚠ SIRA `SIMULASYON_KANALLARI`DAN — sonuç listesi NET-2'ye göre sıralı ve
   * kullanıcı bir orana rakam yazdıkça o kanal sıçrayarak yer değiştirirdi:
   * yazarken kutunun altından kayması demek. Girdi sırası sabittir, hüküm
   * sırası değişir.
   */
  const sonucKod = new Map(sonuclar.map((s) => [s.kod, s]));
  /**
   * KAZANAN KANAL — NET-2'si hesaplanmış en iyi kanal, yoksa null.
   *
   * ⚠ "İLK SIRADAKİ" YETMEZ: hiçbir kanal hesaplanamadığında sıralama
   * girdiyi bozmuyor ve listenin ilki kazanmış gibi görünürdü. Sondada tam
   * bu körlük yakalandı (bütün NET'ler null iken kontrol yeşil kalıyordu).
   */
  const kazananKod =
    sonuclar.length > 0 && sonuclar[0]!.net2 !== null ? sonuclar[0]!.kod : null;

  return (
    <div className="space-y-6">
      {/* ══════════════ ÜRÜNÜ KODDAN BUL ══════════════
          Kullanıcı 21.08.2026: _"ürün EAN, barkod, pazaryeri SKU girdiğimde
          bizde satılmışsa ortalama alım-satım ve komisyon otomatik gelsin"_.
          nesatilir'de üç rakamı da kullanıcı bilmek zorunda; bizde ikisi
          defterde ZATEN var. */}
      <div className="space-y-2">
        <span className="text-sm font-medium">{t("araBaslik")}</span>
        <div className="flex flex-wrap gap-2">
          <Input
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            /* USB okuyucu Enter basar (İlke #7) — form yok, tuşu dinliyoruz. */
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ara();
              }
            }}
            placeholder={t("araIpucu")}
            className="h-11 min-w-0 flex-1"
          />
          <Button
            onClick={ara}
            disabled={araniyor || kod.trim() === ""}
            className="h-11"
          >
            <Search className="size-4" />
            {araniyor ? t("araniyor") : t("araDugme")}
          </Button>
        </div>

        {/* BULUNAMADI SESSİZ KALMAZ — hangi kodların arandığı yazıyor (#5). */}
        {aramaHatasi ? (
          <p className={`rounded-md p-2 text-sm ${DURUM_KUTUSU.uyari}`}>
            {aramaHatasi}
          </p>
        ) : null}

        {urun ? (
          <div className={`rounded-md p-3 ${DURUM_KUTUSU.bilgi}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{urun.ad}</div>
                <div className="text-xs opacity-90">
                  {[urun.sku, urun.barkod, urun.firmaSku]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <button
                type="button"
                onClick={urunuBirak}
                className="inline-flex min-h-11 items-center gap-1 text-xs underline underline-offset-2"
              >
                <X className="size-3.5" />
                {t("urunTemizle")}
              </button>
            </div>

            {/* ⚠ EKSİK VERİ SESSİZ KALMAZ: alım/satış yoksa alan boş kalır
                ve NEDEN boş kaldığı yazar — kullanıcı elle girmeli. */}
            <p className="mt-2 text-xs">
              {urun.ortalamaAlis === null
                ? t("zeminAlimYok")
                : urun.ortalamaSatis === null
                  ? t("zeminSatisYok")
                  : t("zeminOzeti", {
                      adet: urun.satisAdedi,
                      alis: para(urun.ortalamaAlis),
                      ortalama: para(urun.ortalamaSatis),
                      son:
                        urun.sonSatisFiyati === null
                          ? "—"
                          : para(urun.sonSatisFiyati),
                      tarih:
                        urun.sonSatisTarihi === null
                          ? "—"
                          : bicim.tarih(urun.sonSatisTarihi),
                    })}
            </p>
          </div>
        ) : null}
      </div>

      {/* ══════════════ GİRDİ ══════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Alan
          etiket={t("satisFiyati")}
          deger={satis}
          degistir={setSatis}
          ipucu={t("ornek", { deger: "1.000" })}
        />
        <Alan
          etiket={t("alisFiyati")}
          deger={alis}
          degistir={setAlis}
          ipucu={t("ornek", { deger: "500" })}
        />
        <Alan
          etiket={t("kdvOrani")}
          deger={kdv}
          degistir={setKdv}
          ipucu={t("ornek", { deger: "20" })}
        />
        <Alan
          etiket={t("kargoUcreti")}
          deger={kargo}
          degistir={setKargo}
          ipucu={t("ornek", { deger: "120" })}
          not={t("kargoIpucu")}
        />

        {/* ── KDV DİLİ — İKİ SEÇENEK DE GÖRÜNÜR ────────────────────────────
            ⚠ ONAY KUTUSU DEĞİL. Tek kutu olsaydı "işaretli değilse ne
            oluyor" sorusu ekranda cevapsız kalırdı ve hangi dilde girdiğini
            bilmeyen kullanıcı rakamları %20 yanlış girerdi. */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("kdvDili")}</span>
          <div className="border-input flex h-11 overflow-hidden rounded-md border">
            {[
              { deger: true, etiket: t("kdvDahil") },
              { deger: false, etiket: t("kdvHaric") },
            ].map((s) => (
              <button
                key={String(s.deger)}
                type="button"
                onClick={() => setKdvDahil(s.deger)}
                aria-pressed={kdvDahil === s.deger}
                className={`flex-1 text-sm transition-colors ${
                  kdvDahil === s.deger
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted"
                }`}
              >
                {s.etiket}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════ PAZARYERİ BAŞINA GİRDİ — FİYAT + KOMİSYON ══════════
          Kullanıcı 21.08.2026, canlı ekranda: _"burada her pazar yerine has
          oran girilmeli"_. Önceki hâlde tek bir ORTAK kutu vardı; kanal
          başına kutular yalnızca SONUÇ kutusunun içinde yaşıyordu ve sonuç
          kutuları ortak oran yazılmadan çizilmiyordu. Yani kanal oranını
          girmek için önce "kanal oranı yoksa" etiketli alanı doldurmak
          gerekiyordu — ekran kendi etiketiyle çelişiyordu.

          ⚠ KUTULAR HESAPTAN ÖNCE DE DURUR. Oranı girmek için önce hesabın
          çıkması gerekseydi aynı kısır döngü geri gelirdi. */}
      <div className="space-y-2">
        <span className="text-sm font-medium">{t("kanalGirdiBaslik")}</span>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SIMULASYON_KANALLARI.map((k) => (
            <KanalGirdiKutusu
              key={k.kod}
              ad={k.ad}
              kazanan={kazananKod === k.kod}
              fiyat={kanalFiyatlari[k.kod] ?? ""}
              fiyatDegistir={(v) =>
                setKanalFiyatlari((o) => ({ ...o, [k.kod]: v }))
              }
              oran={kanalOranlari[k.kod] ?? ""}
              oranDegistir={(v) =>
                setKanalOranlari((o) => ({ ...o, [k.kod]: v }))
              }
              sonuc={sonucKod.get(k.kod) ?? null}
              yuzde={bicim.yuzde}
              ortakFiyat={satis}
            />
          ))}
        </div>
        <p className="text-muted-foreground text-xs">{t("kanalGirdiNotu")}</p>
      </div>

      {/* ══════════════ SONUÇ ══════════════
          ⚠ BOŞ FORMDA KUTU ÇİZİLMEZ: sıfır satış "0 kâr" değil, cevapsız
          sorudur. Sıfır duvarı hesaplanmış gibi okunurdu (İlke #5). */}
      {eksik ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("bosBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("bosIpucu")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sonuclar.map((s, i) => (
            <KanalKutusu
              key={s.kod}
              sonuc={s}
              kazanan={i === 0 && s.net2 !== null}
              para={para}
              yuzde={bicim.yuzde}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Tek girdi alanı — etiket, sayı kutusu ve isteğe bağlı alt not. */
function Alan({
  etiket,
  deger,
  degistir,
  ipucu,
  not,
}: {
  etiket: string;
  deger: string;
  degistir: (d: string) => void;
  ipucu: string;
  not?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{etiket}</Label>
      {/* MOBİLDE 44 px (İlke #8): `h-11` dokunulabilir yükseklik. */}
      <Input
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        value={deger}
        onChange={(e) => degistir(e.target.value)}
        /* YER TUTUCU DEĞER GİBİ GÖRÜNMEZ (İlke #11): "örn." şart. */
        placeholder={ipucu}
        className="h-11"
      />
      {not ? <p className="text-muted-foreground text-xs">{not}</p> : null}
    </div>
  );
}

/**
 * ── KANAL GİRDİ KUTUSU — PAZARYERİ BAŞINA FİYAT + ORAN ──────────────────
 *
 * ⚠ İKİ GİRDİ BİRDEN, ÇÜNKÜ KARAR İKİSİNİN BİRLİKTE ÇALIŞMASINDAN ÇIKIYOR.
 * Kullanıcının kendi örneği (21.08.2026):
 *
 *     alış 1000 · TY  buy box 2150 · komisyon %5  → NET-2 673,17
 *              · HB  buy box 2250 · komisyon %13 → NET-2 538,25
 *              · N11 buy box 2175 · komisyon %12 → NET-2 566,39
 *
 * EN DÜŞÜK satış fiyatı EN YÜKSEK kârı veriyor. Fiyat sabitlenirse bu sonuç
 * doğmaz, oran sabitlenirse de doğmaz — ikisi birlikte değişmeli. Bu yüzden
 * fiyat kutusu oranın YANINDA durur, ayrı bir ekranda değil.
 *
 * ⚠ HER KANAL BAĞIMSIZ — kullanıcı kararı: _"kişi isterse tek pazaryeri
 * komisyon oranını girsin ve bilgi alsın, isterse hepsini. Bu onun seçimi
 * olsun."_ Bir kutuya yazmak yalnız o kanalı değiştirir; boş kalan kanal
 * zemininden ya da ortak alandan beslenir, o da yoksa SUSAR.
 *
 * ⚠ YER TUTUCU GERÇEK DEĞERDİR: kutu boş bırakılırsa hesapta kullanılacak
 * olan rakam odur. Hangi kaynaktan geldiği kutunun altında yazılı — bu satır
 * olmadan ekranda bir sayı gösterip başka bir sayıyla hesaplamış olurduk.
 */
function KanalGirdiKutusu({
  ad,
  kazanan,
  fiyat,
  fiyatDegistir,
  oran,
  oranDegistir,
  sonuc,
  yuzde,
  ortakFiyat,
}: {
  ad: string;
  /** Bu kanal şu an en yüksek NET-2'yi veriyor mu. */
  kazanan: boolean;
  fiyat: string;
  fiyatDegistir: (d: string) => void;
  oran: string;
  oranDegistir: (d: string) => void;
  /** Bu kanalın hesabı — yoksa (form eksik) yalnız elle giriş gösterilir. */
  sonuc: KanalSonucu | null;
  yuzde: (n: number, b?: number) => string;
  /** Ortak satış fiyatı metni — kutu boşken yer tutucu olarak görünür. */
  ortakFiyat: string;
}) {
  const t = useTranslations("Simulasyon");
  const elleOran = oran.trim() !== "";
  const elleFiyat = fiyat.trim() !== "";

  const veridenOran =
    sonuc !== null && sonuc.komisyonOrani !== null && !sonuc.oranElle
      ? yuzde(sonuc.komisyonOrani).replace("%", "")
      : null;

  /**
   * Kaynak satırı — hangi rakamla hesaplandığı burada yazar.
   *
   * ⚠ "HENÜZ HESAPLANMADI" METNİ BURADAN KALDIRILDI (kullanıcı 21.08.2026:
   * _"komisyon ve buy box fiyatının altında yazan 'satış ve alış fiyatını
   * gir' yanıltıcı"_). Haklıydı: o cümle formun GENEL durumunu anlatıyordu
   * ama komisyon kutusunun ALTINDA duruyordu, yani o kutuya ne yazılacağını
   * söylüyormuş gibi okunuyordu. Boş durum mesajı zaten aşağıda, kendi
   * yerinde duruyor — aynı cümleyi dört kutuda tekrar etmek bilgi değil
   * gürültüdür. Hesap yokken burada hiçbir şey YAZMAZ.
   */
  const oranKaynagi = elleOran
    ? t("oranElleGirildi")
    : sonuc === null
      ? null
      : sonuc.komisyonOrani === null
        ? t("oranVeriYok")
        : t(`oran_${sonuc.oranKaynagi}`);

  /**
   * ── RENK DURUMDAN GELİR, KANALDAN DEĞİL ────────────────────────────────
   * Kullanıcı 21.08.2026: _"kartlar birbirinden biraz ayrılmalı, pano
   * grinin tonlarından kurtulsun, biraz daha renkli yap."_
   *
   * ⚠ AMA MARKA RENGİ KULLANILMADI. Anayasa: renk ANLAM taşır, süs değil —
   * aynı renk her sayfada aynı şeyi söyler. Trendyol'u turuncu yapmak,
   * turuncunun "uyarı" anlamını bu ekranda bozardı. Renk kanalın kimliğine
   * değil, o kanalın HÜKMÜNE bağlandı: kazanan yeşil, zarar kırmızı,
   * hesaplanan mavi, hesaplanmayan nötr. Böylece kutuya rakam yazdıkça
   * şerit renk değiştiriyor ve girdi ile sonuç görsel olarak bağlanıyor.
   *
   * Zemin `bg-card`: gri `bg-muted` kutular panoyu tek renge boğuyordu.
   * Doygunluk şeritte (3px), zemin sakin — kısıt #2 ve #3 korunuyor.
   */
  const durum: DurumRengi =
    sonuc === null || sonuc.net2 === null
      ? "notr"
      : kazanan
        ? "olumlu"
        : sonuc.net2 < 0
          ? "olumsuz"
          : "bilgi";

  return (
    <div
      className={`bg-card min-w-0 space-y-1.5 rounded-lg border p-3 shadow-sm ${DURUM_SERIDI[durum]}`}
    >
      <div className="flex items-center gap-1.5">
        {kazanan ? (
          <Trophy className={`size-3.5 shrink-0 ${DURUM_YAZISI.olumlu}`} />
        ) : null}
        <span className="truncate text-sm font-medium" title={ad}>
          {ad}
        </span>
      </div>

      {/* ── BUY BOX FİYATI ─────────────────────────────────────────────── */}
      <MiniAlan
        etiket={t("kanalFiyati")}
        deger={fiyat}
        degistir={fiyatDegistir}
        ariaEtiket={t("kanalFiyatiAria", { kanal: ad })}
        /* Kutu boşken ortak fiyat kullanılır — yer tutucu onu gösterir. */
        yerTutucu={
          ortakFiyat.trim() !== ""
            ? ortakFiyat
            : t("ornek", { deger: "2.150" })
        }
        temizle={elleFiyat ? () => fiyatDegistir("") : null}
        temizleEtiketi={t("kanalSifirla")}
      />
      {/* ⚠ ORTAKTAN GELDİĞİ YAZAR: aynı gri rakam üç kutuda görününce
          "hepsi aynı fiyat mı" sorusu doğuyor; cevabı ekranda dursun. */}
      {!elleFiyat && ortakFiyat.trim() !== "" ? (
        <div className="text-muted-foreground truncate text-[10px]">
          {t("fiyatOrtaktan")}
        </div>
      ) : null}

      {/* ── KOMİSYON ORANI ─────────────────────────────────────────────── */}
      <MiniAlan
        etiket={t("kanalOrani")}
        deger={oran}
        degistir={oranDegistir}
        ariaEtiket={t("kanalOraniAria", { kanal: ad })}
        yerTutucu={veridenOran ?? t("ornek", { deger: "15" })}
        temizle={elleOran ? () => oranDegistir("") : null}
        temizleEtiketi={t("oranSifirla")}
      />
      {oranKaynagi === null ? null : (
        <div className="text-muted-foreground truncate text-[10px]">
          {oranKaynagi}
        </div>
      )}
    </div>
  );
}

/** Kutu içi tek girdi — etiket, sayı kutusu, görünür temizleme düğmesi. */
function MiniAlan({
  etiket,
  deger,
  degistir,
  ariaEtiket,
  yerTutucu,
  temizle,
  temizleEtiketi,
}: {
  etiket: string;
  deger: string;
  degistir: (d: string) => void;
  ariaEtiket: string;
  yerTutucu: string;
  /** null ise elle girilmiş değer yok — düğme çizilmez. */
  temizle: (() => void) | null;
  temizleEtiketi: string;
}) {
  return (
    <div>
      <div className="text-muted-foreground text-[11px]">{etiket}</div>
      <div className="flex items-center gap-1">
        {/* MOBİLDE 44 px (İlke #8). */}
        <input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={deger}
          onChange={(e) => degistir(e.target.value)}
          aria-label={ariaEtiket}
          placeholder={yerTutucu}
          className="h-11 min-w-0 flex-1 bg-transparent text-center text-base font-medium tabular-nums outline-none"
        />
        {/* GÖRÜNÜR EYLEM (İlke #1): elle girilen değer tek tıkla veriye
            döner. Kutuyu elle silmeyi beklemek gizli tıklama alanıdır. */}
        {temizle ? (
          <button
            type="button"
            onClick={temizle}
            title={temizleEtiketi}
            aria-label={temizleEtiketi}
            className="hover:bg-muted inline-flex size-11 shrink-0 items-center justify-center rounded"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * ── KANAL KUTUSU — ÜÇ KATMAN ────────────────────────────────────────────
 * Renk sistemi (lib/renkler.ts): K1 sol şerit · K2 pastel zemin · K3 koyu
 * rakam. Kazanan kanal şeritle ayrılıyor; ötekiler nötr kalıyor — "nötr
 * taban ~%70" kısıtı gereği her kutu renkli değil.
 */
/**
 * PASTA DİLİMLERİ — motorun dökümü + KÂR.
 *
 * ⚠ KÂR DA BİR DİLİMDİR ve son sırada durur: "satış fiyatı nereye gidiyor"
 * sorusunun cevabı kesintiler bitince kalan şeydir. Zararda kâr dilimi HİÇ
 * çizilmez (negatif dilim diye bir şey yok) ve pasta paydayı doldurmaz —
 * boşluk zaten hükmü söyler.
 *
 * ⚠ TANINMAYAN KOD SESSİZCE KAYBOLMAZ: sözlükte karşılığı yoksa kodun
 * kendisi yazılır ve nötr renk alır. Yeni bir kesinti kalemi eklendiğinde
 * grafikten düşmesin.
 */
function pastaDilimleri(
  sonuc: KanalSonucu,
  t: (anahtar: string) => string,
): PastaDilimi[] {
  const dilimler: PastaDilimi[] = sonuc.dokum.map((d) => ({
    etiket: t(`dokum_${d.kod}`),
    tutar: d.tutar,
    renk: PASTA_RENKLERI[d.kod] ?? PASTA_VARSAYILAN,
  }));
  if (sonuc.net2 !== null && sonuc.net2 > 0) {
    dilimler.push({
      etiket: t("dokum_KAR"),
      tutar: sonuc.net2,
      renk: PASTA_RENKLERI.KAR!,
    });
  }
  return dilimler;
}

function KanalKutusu({
  sonuc,
  kazanan,
  para,
  yuzde,
}: {
  sonuc: KanalSonucu;
  kazanan: boolean;
  para: (n: number) => string;
  yuzde: (n: number, b?: number) => string;
}) {
  const t = useTranslations("Simulasyon");
  const bant = marjBandi(sonuc.ciroMarji);
  const hesaplandi = sonuc.net2 !== null;
  const zarar = hesaplandi && sonuc.net2! < 0;

  /**
   * ⚠ ŞERİT ARTIK HER KARTTA — önce yalnız kazananda vardı ve ekran gri bir
   * kutu duvarına dönüyordu (kullanıcı: _"pano grinin tonlarından
   * kurtulsun"_). Renk kanalın kimliğinden değil HÜKMÜNDEN geliyor ve
   * yukarıdaki girdi kutusunun şeridiyle AYNI ölçütü kullanıyor — iki yerde
   * iki farklı renk, aynı kanal için çelişki üretirdi.
   */
  const durum: DurumRengi = !hesaplandi
    ? "notr"
    : kazanan
      ? "olumlu"
      : zarar
        ? "olumsuz"
        : "bilgi";

  return (
    <div
      className={`bg-card min-w-0 rounded-lg border p-4 shadow-sm ${DURUM_SERIDI[durum]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {kazanan ? (
              <Trophy className={`size-4 shrink-0 ${DURUM_YAZISI.olumlu}`} />
            ) : null}
            <span className="truncate font-medium">{sonuc.ad}</span>
          </div>
          {/* ⚠ KAYNAK ROZETİ — ölçülmüş mü, dış iddia mı. Notun KENDİSİ
              ipucunda: her kutuya paragraf basmak ekranı metin duvarı
              yapıyordu (ilk sürümün kusuru). */}
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
              DURUM_KUTUSU[sonuc.kaynak === "OLCULDU" ? "olumlu" : "uyari"]
            }`}
            title={`${sonuc.kaynakNotu}${
              sonuc.belirsizlik ? `\n\n⚠ ${sonuc.belirsizlik}` : ""
            }`}
          >
            {sonuc.kaynak === "OLCULDU" ? (
              <Crown className="size-3" />
            ) : (
              <Info className="size-3" />
            )}
            {t(`kaynak_${sonuc.kaynak}`)}
          </span>
        </div>

        {/* NET-2 — kutunun HÜKMÜ, en büyük rakam. */}
        <div className="text-right">
          <div className="text-muted-foreground text-xs">{t("net2")}</div>
          <div
            className={`text-xl font-semibold tabular-nums ${
              hesaplandi ? DURUM_YAZISI[zarar ? "olumsuz" : "olumlu"] : ""
            }`}
          >
            {hesaplandi ? para(sonuc.net2!) : "—"}
          </div>
        </div>
      </div>

      {/* KOMPAKT KUTUCUK IZGARASI (İlke #12) — "etiket solda rakam sağda"
          tam genişlik satırı YASAK; göz aradaki boşluğu kat etmesin. */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        {/* ⚠ HANGİ FİYATLA HESAPLANDIĞI YAZAR. Kanallar farklı buy box
            fiyatlarıyla kıyaslandığı için "hangi rakamla" sorusu ekranda
            cevapsız kalamaz: 2150 ile 2250'yi karşılaştırdığını görmeyen
            biri, sıralamayı yalnız komisyona bağlar. */}
        <Rakam
          etiket={t("kullanilanSatis")}
          deger={
            sonuc.satisFiyati === null ? "—" : para(sonuc.satisFiyati)
          }
        />
        {/* ⚠ ORANIN NEREDEN GELDİĞİ YAZAR. Barkodla ürün seçilince komisyon
            artık kullanıcının tahmini değil TARİFENİN kendisi — bu ekranın
            bütün değeri o farkta ve görünmezse fark hiç anlaşılmaz. */}
        {/* ── KOMİSYON: BURADA OKUNUR, GİRDİSİ YUKARIDA ────────────────
            ⚠ GİRDİ KUTUSU BURADAN ALINDI (21.08.2026). Önce burada bir
            input vardı; oran girmenin TEK yolu buydu ve bu kutular ancak
            hesap çıkınca çiziliyordu — yani oranı girmek için önce oranı
            girmiş olmak gerekiyordu. Girdi forma taşındı.

            ⚠ VE İKİ YERE BİRDEN KONMADI: tek değerin iki ayrı kutudan
            düzenlenmesi, hangisinin geçerli olduğu sorusunu ekranda
            cevapsız bırakırdı. Burada yalnız KULLANILAN oran ve nereden
            geldiği yazar. */}
        <Rakam
          etiket={t("kanalOrani")}
          deger={
            sonuc.komisyonOrani === null
              ? "—"
              : yuzde(sonuc.komisyonOrani).replace("%", "")
          }
          not={
            sonuc.oranElle
              ? t("oranElleGirildi")
              : sonuc.komisyonOrani === null
                ? t("oranVeriYok")
                : t(`oran_${sonuc.oranKaynagi}`)
          }
        />
        <Rakam
          etiket={t("net1")}
          deger={sonuc.net1 === null ? "—" : para(sonuc.net1)}
        />
        <div className="bg-muted/40 min-w-0 rounded-md border px-2 py-1.5">
          <div className="text-muted-foreground text-xs">{t("marj")}</div>
          <div className="mt-0.5 flex justify-center">
            {bant === null || sonuc.ciroMarji === null ? (
              <span className="text-muted-foreground text-sm">—</span>
            ) : (
              <MarjPili
                bant={bant}
                metin={ciroMarjiMetni(sonuc.ciroMarji)!}
                durumMetni={t(`bant_${bant}`)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ══════════ SATIŞ FİYATI NEREYE GİDİYOR ══════════
          Kullanıcı 21.08.2026: _"animasyonlu pasta grafik olsun ve HER
          PAZARYERİ İÇİN altta görünsün"_. Tek bir grafik yetmezdi: dilimlerin
          kendisi kanaldan kanala değişiyor (HB'de tahsilat bedeli var, TY'de
          yok) ve karşılaştırmanın anlamı tam olarak bu farkta.

          ⚠ DÖKÜM MOTORDAN GELİYOR, burada yeniden türetilmiyor. */}
      {sonuc.dokum.length > 0 ? (
        <div className="mt-3 border-t pt-3">
          <div className="text-muted-foreground mb-2 text-xs">
            {t("grafikBaslik")}
          </div>
          <PastaGrafik
            dilimler={pastaDilimleri(sonuc, t)}
            /* ⚠ PAYDA KANALIN KENDİ FİYATI. Ortak girdiden okunsaydı
               TY'nin pastası HB'nin buy box'ına bölünürdü ve dilimler
               yanlış oranda çizilirdi — üstelik makul görünürdü. */
            toplam={sonuc.satisFiyati ?? 0}
            bicimle={para}
            bosMesaj={t("grafikBos")}
          />
        </div>
      ) : null}

      {/* ⚠ BEYANLAR SESSİZ KALMAZ. Motor "maliyet yok", "oran yok" diyorsa
          ekranda görünmeli; yoksa motorun dürüstlüğü kullanıcıya ulaşmaz. */}
      {sonuc.beyanlar.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {sonuc.beyanlar.map((b) => (
            <li
              key={b.tur}
              className={`rounded px-2 py-1 text-xs ${DURUM_KUTUSU.uyari}`}
            >
              {t(`beyan_${b.tur}`)}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Belirsizlik rozetin ipucunda ama GÖRÜNÜR de olmalı — dokunmatikte
          ipucu okunmaz (kısıt: renk/ipucu tek başına konuşmaz). */}
      {sonuc.belirsizlik ? (
        <p className="text-muted-foreground mt-2 text-xs italic">
          ⚠ {sonuc.belirsizlik}
        </p>
      ) : null}
    </div>
  );
}

function Rakam({
  etiket,
  deger,
  not,
}: {
  etiket: string;
  deger: string;
  not?: string;
}) {
  return (
    <div className="bg-muted/40 min-w-0 rounded-md border px-2 py-1.5">
      <div className="text-muted-foreground text-xs">{etiket}</div>
      <div className="truncate text-sm font-medium tabular-nums">{deger}</div>
      {not ? (
        <div className="text-muted-foreground truncate text-[10px]">{not}</div>
      ) : null}
    </div>
  );
}
