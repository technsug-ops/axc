import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { CiroSunumu } from "@/components/ciro-sunumu";
import { CizgiGrafik, type GrafikNoktasi } from "@/components/cizgi-grafik";
import { KatlanirBolum } from "@/components/katlanir-bolum";
import { SekmeliBolum } from "@/components/sekmeli-bolum";
import { SuzgecCubugu } from "@/components/suzgec-cubugu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import {
  ayKaydir,
  gunDegeri,
  gunEkle,
  isTakvimGunu,
  pencereOlustur,
  pencerede,
  type PencereTuru,
} from "@/lib/donem";
import { kdvOraniniCoz } from "@/lib/kdv";
import { pencereCoz } from "@/lib/liste-suzgeci";
import {
  aylikSeri,
  panelHesapla,
  type PanelIadesi,
  type PanelSatisi,
} from "@/lib/panel";
import {
  birimKar,
  donemOrtalamaMarji,
  enCokSatilan,
  karSiralamasi,
  karsizUrunSayisi,
  marjDurumu,
  marjSiralamasi,
  marjYuzdesi,
  urunlereTopla,
  type KalemGirdisi,
} from "@/lib/panel-listeler";
import { prisma } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";
import { GorevKutusu } from "./gorev-kutusu";
import { NakitOzeti } from "./nakit-ozeti";
import { gorevSayilariniTopla } from "@/lib/panel/gorev-verisi";
import {
  nakitTakvimiKur,
  type TakvimPenceresi,
} from "@/lib/panel/nakit-takvimi";
import { takvimBugunu, takvimSatirlariniTopla } from "@/lib/panel/takvim-verisi";
import { suzgecAdresi } from "@/lib/suzgec";
import { izinVarMi } from "@/lib/yetki";
import {
  siralamaGecerliMi,
  yaslanmaListesi,
  sermayeToplami,
  YAS_BANTLARI,
  type SiralamaOlcutu,
  type YaslanmaGirdisi,
} from "@/lib/yaslanma";

import {
  BantRozeti,
  PanelListesi,
  SiralamaDugmeleri,
  type PanelListeSatiri,
} from "./panel-kartlari";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ANA SAYFA — İŞ ZEKÂSI PANELİ
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 14.08.2026: "Paneli daha efektif kullanmak istiyorum.
 *  Bugün, bu hafta, bu ay, belli tarih aralıkları; kanallar; toplam sipariş,
 *  kargoya teslim edilen, ciro, net kâr 1-2; en çok satılan, en çok kâr
 *  eden, en az kâr bırakan, stokta en çok bekleyen ürünler — bir nevi
 *  business intelligence olarak bana destek ol."
 *
 *  Kâr rakamları SNAPSHOT'lardan okunur; burada hiçbir kâr YENİDEN
 *  HESAPLANMAZ (rapor ekranıyla aynı ilke). Oran/tarife bugün değişse
 *  geçmiş ayların grafiği oynamaz.
 *
 *  TEK SORGU ÜÇ İŞE BAKAR: dönem blokları, ürün listeleri ve 12 aylık grafik
 *  aynı satış listesinden türetilir. Ayrı sorgu atmak aynı veriyi üç kez
 *  okumak olurdu.
 *
 *  DÖNEM SÜZGECİ BLOKLARI VE ÜRÜN LİSTELERİNİ SÜZER, GRAFİĞİ SÜZMEZ: grafik
 *  "son 12 ay" demek, dönem ise "şu aralık". Grafiği de süzsek 12 aylık
 *  eğilim seçilen aralığa kırpılır ve grafiğin varlık sebebi kalmazdı.
 *
 *  YAŞLANMA LİSTESİ DÖNEMDEN ETKİLENMEZ: "bugün depoda ne bekliyor" sorusu
 *  geçmiş bir tarih aralığıyla daralmaz. Bu, ekranda yazılı bir nottur —
 *  sessiz bir istisna değil.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

/** Grafikte kaç ay görünecek (bu ay dahil). */
const GRAFIK_AY_SAYISI = 12;

/** Ürün listelerinde kaç satır. Panelde yer sınırlı; detay listelere gider. */
const LISTE_SATIRI = 5;

/** Yaşlanma listesinde kaç satır — en riskli kalemler yeter, tamamı /stok'ta. */
const YASLANMA_SATIRI = 8;

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("panel") };
}

export default async function AnaSayfa({
  searchParams,
}: {
  searchParams: Promise<{
    kanal?: string;
    para?: string;
    pencere?: string;
    baslangic?: string;
    bitis?: string;
    sirala?: string;
    /** Nakit takvimi penceresi (14 | 30) — dönem süzgecinden BAĞIMSIZ. */
    takvim?: string;
    /** Ürün analizi sekmesi: verim | hacim | stok. */
    analiz?: string;
  }>;
}) {
  // PANEL HERKESE AÇIK ama NET DEĞİL. 13.08.2026'da kullanıcı yakaladı:
  // satış listesinde marj gizliydi, panelde TOPLU görünüyordu.
  // `satis.kar.gor` NET KAVRAMINI yönetir — nerede görünürse orada.
  // Bu yeni bir alan-izni değil, aynı iznin aynı kavrama uygulanması.
  const karGorunur = await izinVarMi("satis.kar.gor");

  const parametreler = await searchParams;
  const t = await getTranslations("Panel");
  const bicim = await bicimlendirici();

  const an = new Date();
  const bugun = isTakvimGunu(an);

  /**
   * DÖNEM — VARSAYILAN "BU AY".
   *
   * Liste ekranlarının varsayılanı "tüm zamanlar" (bkz. `pencereCoz`), ama
   * panelin varsayılanı BU AY: panel "ne oldu" özetidir, tüm zamanların
   * toplamı bir gösterge tablosunda bilgi taşımaz. Adres boşsa ya da
   * bozuksa da buraya düşer — hata vermez, boş ekran göstermez.
   */
  const cozum = pencereCoz(parametreler, an);
  const donem = cozum.pencere ?? pencereOlustur("BU_AY", an);
  const donemTuru: PencereTuru = cozum.tur === "" ? "BU_AY" : cozum.tur;

  // Grafik penceresi: bu ay dahil son 12 ayın 1'inden bugüne.
  const ilkAy = ayKaydir(bugun.yil, bugun.ay, -(GRAFIK_AY_SAYISI - 1));
  const grafikBaslangic = gunDegeri({ yil: ilkAy.yil, ay: ilkAy.ay, gun: 1 });
  const grafikBitisHaric = gunEkle(gunDegeri(bugun), 1);

  /**
   * SORGU ARALIĞI İKİSİNİ DE KAPSAR. Özel aralık 12 aydan geriye gidebilir;
   * yalnız grafik aralığını çekseydik seçilen dönemin kayıtları sessizce
   * eksik kalır ve panel "0 satış" derdi.
   */
  const veriBaslangic = new Date(
    Math.min(grafikBaslangic.getTime(), donem.baslangic.getTime()),
  );
  const veriBitisHaric = new Date(
    Math.max(grafikBitisHaric.getTime(), donem.bitisHaric.getTime()),
  );

  const [kayitlar, iadeKayitlari, partiHaritasi] = await Promise.all([
    prisma.sale.findMany({
      where: { soldAt: { gte: veriBaslangic, lt: veriBitisHaric } },
      select: {
        soldAt: true,
        shippedAt: true,
        net1Amount: true,
        net2Amount: true,
        profitCurrency: true,
        profitStatus: true,
        channelAccount: {
          // `name` HESAP KIRILIMI İÇİN: aynı pazaryerindeki iki mağaza
          // toplamın içinde kaybolmasın (mimar kararı 13.08.2026).
          select: { name: true, channel: { select: { code: true, name: true } } },
        },
        items: {
          select: {
            quantity: true,
            unitPriceAmount: true,
            unitPriceCurrency: true,
            // KALEM SEVİYESİ KÂR — ürün listelerinin kaynağı. Satış
            // seviyesindeki NET ile toplanmaz: sipariş başına kesintiler
            // (hizmet bedeli, sabit gider) kalemde YOK.
            net1Amount: true,
            net2Amount: true,
            profitStatus: true,
            variantId: true,
            variant: {
              select: {
                sku: true,
                product: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    // İADELER AYRI SORGU, KENDİ TARİHİYLE SÜZÜLÜR: penceredeki bir iade
    // pencere DIŞINDAKİ bir satışa bağlı olabilir (geçen yılın malı bu ay
    // iade edilir). Kanalını satış listesinden aramak yerine ilişkiden
    // okuyoruz — aksi hâlde o iade sessizce düşerdi.
    prisma.return.findMany({
      where: { occurredAt: { gte: veriBaslangic, lt: veriBitisHaric } },
      select: {
        occurredAt: true,
        net1Amount: true,
        net2Amount: true,
        profitCurrency: true,
        profitStatus: true,
        /**
         * CİRO DÜŞÜMÜNÜN KAYNAĞI — `KAYIP_GELIR` satırları.
         * `/iadeler` ekranı da aynı yerden okuyor; iki ekran aynı rakamı
         * üretsin diye kaynak ORTAK. Değişimde bu satır hiç oluşmadığı için
         * "değişim ciroyu düşürmez" kuralı kendiliğinden geçerli olur —
         * ayrı bir istisna yazmak gerekmedi.
         */
        fees: { select: { code: true, amount: true } },
        sale: {
          select: {
            channelAccount: {
              select: {
                name: true,
                channel: { select: { code: true, name: true } },
              },
            },
          },
        },
      },
    }),
    /**
     * YAŞLANMA — AÇIK FIFO PARTİLERİ.
     *
     * Stok ve envanter ekranlarıyla AYNI motor (`acikPartilerToplu`). Panel
     * kendi FIFO'sunu yazsaydı iki tanım doğar ve bir gün "stokta 4 var"
     * diyen ekran ile "3 var" diyen panel yan yana dururdu.
     */
    acikPartilerToplu(prisma, null),
  ]);

  const satislar: PanelSatisi[] = kayitlar.map((satis) => {
    // Satışın para birimi: kâr snapshot'ındaki birim, yoksa ilk kalemin.
    // (Rapor ekranıyla birebir aynı kural — iki ekran farklı ciro göstermesin.)
    const paraBirimi: Currency =
      satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY";

    const gelir = satis.items
      .filter((k) => k.unitPriceCurrency === paraBirimi)
      .reduce((t2, k) => t2 + Number(k.unitPriceAmount.toString()) * k.quantity, 0);

    return {
      kanalKodu: satis.channelAccount.channel.code,
      kanalAdi: satis.channelAccount.channel.name,
      hesapAdi: satis.channelAccount.name,
      tarih: satis.soldAt,
      paraBirimi,
      gelir,
      net1: satis.net1Amount === null ? null : Number(satis.net1Amount.toString()),
      net2: satis.net2Amount === null ? null : Number(satis.net2Amount.toString()),
      durum: satis.profitStatus,
      kargoyaVerildiMi: satis.shippedAt !== null,
    };
  });

  const iadeler: PanelIadesi[] = iadeKayitlari.map((iade) => ({
    kanalKodu: iade.sale.channelAccount.channel.code,
    kanalAdi: iade.sale.channelAccount.channel.name,
    hesapAdi: iade.sale.channelAccount.name,
    tarih: iade.occurredAt,
    // Rapor ekranıyla aynı kural: iadenin para birimi kâr snapshot'ından.
    paraBirimi: iade.profitCurrency ?? "TRY",
    net1: iade.net1Amount === null ? null : Number(iade.net1Amount.toString()),
    net2: iade.net2Amount === null ? null : Number(iade.net2Amount.toString()),
    durum: iade.profitStatus,
    // Mutlak değer: satır defterde negatif duruyor (gider işareti), ekranda
    // "−X iade" diye zaten eksiyle yazılıyor. İki kez eksiye düşmesin.
    iadeTutari: Math.abs(
      iade.fees
        .filter((f) => f.code === "KAYIP_GELIR")
        .reduce((t2, f) => t2 + Number(f.amount.toString()), 0),
    ),
  }));

  /**
   * ÜRÜN LİSTELERİNİN HAM VERİSİ — satış KALEMLERİ.
   *
   * Satışın kanalı/tarihi/para birimi kalemle birlikte taşınıyor ki süzgeç
   * bloklarla AYNI koşulu uygulasın. Kalem seviyesinde ayrıca süzmek
   * gerekseydi iki farklı "bu dönem" tanımı doğardı.
   */
  type PanelKalemi = KalemGirdisi & {
    /** Ürün kartına bağlantı için — hesaba girmez, sunuma girer. */
    urunId: string;
    tarih: Date;
    kanalKodu: string;
    paraBirimi: Currency;
  };

  const kalemler: PanelKalemi[] = kayitlar.flatMap((satis) => {
    const paraBirimi: Currency =
      satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY";

    return satis.items
      // Satışın para biriminden farklı kalem ciroya girmiyor (yukarıdaki
      // `gelir` kuralı); listeye de girmemeli, yoksa iki rakam ayrışır.
      .filter((k) => k.unitPriceCurrency === paraBirimi)
      .map((k) => ({
        variantId: k.variantId,
        urunAdi: k.variant.product.name,
        urunId: k.variant.product.id,
        sku: k.variant.sku,
        adet: k.quantity,
        ciro: Number(k.unitPriceAmount.toString()) * k.quantity,
        net1: k.net1Amount === null ? null : Number(k.net1Amount.toString()),
        net2: k.net2Amount === null ? null : Number(k.net2Amount.toString()),
        durum: k.profitStatus,
        tarih: satis.soldAt,
        kanalKodu: satis.channelAccount.channel.code,
        paraBirimi,
      }));
  });

  /**
   * SATIŞ KANALLARI — SATIŞI OLMAYAN DA GÖRÜNÜR (14.08.2026, kullanıcı).
   *
   * Panel yalnız o dönemde satış YAPILMIŞ kanalları çiziyordu. "N11 neden
   * yok?" sorusunun cevabı ekranda değildi — oysa "N11'de bu dönem satış
   * yok" bir BİLGİDİR. Sessiz yokluk yerine AÇIK SIFIR: kanal kartı durur,
   * üstünde sıfır yazar.
   *
   * Yalnız SATIŞ rolündeki aktif hesaplar sayılır; alış hesabının panelde
   * ciro satırı olmaz. Para birimi hesapla birlikte geliyor ki sıfır kart
   * DOĞRU para bloğuna düşsün — TRY bloğuna EUR kanalı eklenmez.
   */
  const satisHesaplari = await prisma.channelAccount.findMany({
    where: { isActive: true, satisIcin: true },
    select: {
      defaultCurrency: true,
      channel: { select: { code: true, name: true } },
    },
  });

  /** para birimi → o para biriminde satış yapan kanallar. */
  const paraBirimineGoreKanallar = new Map<string, Map<string, string>>();
  for (const h of satisHesaplari) {
    const kanallar =
      paraBirimineGoreKanallar.get(h.defaultCurrency) ?? new Map<string, string>();
    kanallar.set(h.channel.code, h.channel.name);
    paraBirimineGoreKanallar.set(h.defaultCurrency, kanallar);
  }

  // --- SÜZGEÇ SEÇENEKLERİ ----------------------------------------------------
  // Seçenekler SÜZÜLMEMİŞ veriden gelir: bir kanal seçilince diğer kanallar
  // listeden düşmemeli, yoksa geri dönmek imkânsızlaşır.
  const kanalSecenekleri = [
    ...new Map(satislar.map((s) => [s.kanalKodu, s.kanalAdi])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "tr"));

  const paraSecenekleri = [...new Set(satislar.map((s) => s.paraBirimi))];

  const seciliKanal =
    parametreler.kanal && kanalSecenekleri.some(([k]) => k === parametreler.kanal)
      ? parametreler.kanal
      : null;

  const seciliPara: Currency =
    parametreler.para && paraSecenekleri.includes(parametreler.para as Currency)
      ? (parametreler.para as Currency)
      : (paraSecenekleri[0] ?? "TRY");

  /**
   * KANAL SÜZGECİ ARTIK BLOKLARI DA SÜZER (14.08.2026).
   *
   * Önce yalnız grafiği süzüyordu; kullanıcı "Hepsiburada, Trendyol, N11
   * direkt panelde görünsün" dediğinde ortaya çıktı: kanal seçilince üstteki
   * rakamlar değişmiyordu, yani süzgeç yarım çalışıyordu.
   */
  const donemSatislari = seciliKanal
    ? satislar.filter((s) => s.kanalKodu === seciliKanal)
    : satislar;
  const donemIadeleri = seciliKanal
    ? iadeler.filter((i) => i.kanalKodu === seciliKanal)
    : iadeler;

  const bloklar = panelHesapla(donem, donemSatislari, donemIadeleri);

  // --- ÜRÜN LİSTELERİ --------------------------------------------------------
  const donemKalemleri = kalemler.filter(
    (k) =>
      pencerede(donem, k.tarih) &&
      k.paraBirimi === seciliPara &&
      (seciliKanal === null || k.kanalKodu === seciliKanal),
  );

  const urunSatirlari = urunlereTopla(donemKalemleri);
  /** Ürün kimliği kalemden gelir; toplama girmediği için ayrı haritada. */
  const urunKimligi = new Map(
    donemKalemleri.map((k) => [k.variantId, { urunId: k.urunId, sku: k.sku }]),
  );

  const listeSatiri = (
    satir: (typeof urunSatirlari)[number],
    deger: string,
    altDeger: string,
  ): PanelListeSatiri => ({
    anahtar: satir.variantId,
    urunAdi: satir.urunAdi,
    urunId: urunKimligi.get(satir.variantId)?.urunId ?? null,
    sku: satir.sku,
    deger,
    altDeger,
  });

  const enCokSatilanlar = enCokSatilan(urunSatirlari, LISTE_SATIRI).map((s) =>
    listeSatiri(
      s,
      t("adetDegeri", { sayi: s.adet }),
      bicim.para(s.ciro, seciliPara),
    ),
  );

  /**
   * TOPLAM KÂR LİSTESİ — hacim × verim. Alt satırda MARJ da yazıyor ki
   * "neden birinci" sorusu tek bakışta anlaşılsın: çok mu sattı, iyi mi
   * sattı? (Kullanıcı kararı 14.08.2026: iki ölçüt ayrı ayrı görünecek.)
   */
  /**
   * DÖNEMİN ORTALAMA MARJI — rozet renginin DAYANAĞI. Uydurma eşik yok;
   * gerekçe için bkz. `lib/panel-listeler.ts` → MARJ RENGİ.
   */
  const ortalamaMarj = donemOrtalamaMarji(urunSatirlari);

  /**
   * MARJ ROZETİ — 14.08.2026, kullanıcı bulgusu.
   *
   * "1.000 ₺'lik üründen 200 ₺, 10.000 ₺'lik üründen 250 ₺ kazandım;
   * sistemde 250 kazandığım 'en çok kazandıran' oluyor." Doğruydu: liste
   * MUTLAK tutara göre sıralıyor ve marj sönük gri bir alt satırdaydı —
   * yanlış okumayı engelleyemiyordu.
   *
   * Artık marj ürünün YANINDA, renkli rozet olarak duruyor: rakam tek
   * başına okunamıyor. Renk dönem ortalamasına göre, ortalama da listenin
   * altında YAZILI — renk sessiz bir hüküm değil.
   */
  function marjRozeti(marj: number | null) {
    const durum = marjDurumu(marj, ortalamaMarj);
    if (durum === null || marj === null) return null;
    const renk =
      durum === "zarar"
        ? "border-destructive/50 text-destructive"
        : durum === "zayif"
          ? "border-amber-500/50 text-amber-700 dark:text-amber-400"
          : "border-emerald-500/50 text-emerald-700 dark:text-emerald-400";
    return (
      <span className={`rounded-md border px-1.5 py-0.5 text-xs ${renk}`}>
        {bicim.yuzde(marj)}
      </span>
    );
  }

  const enCokKarEdenler = karSiralamasi(urunSatirlari, "en-cok", LISTE_SATIRI).map(
    (s) => {
      const marj = marjYuzdesi(s);
      return {
        ...listeSatiri(
          s,
          bicim.para(s.net2, seciliPara),
          t("adetDegeri", { sayi: s.adet }),
        ),
        rozet: marjRozeti(marj),
      };
    },
  );

  /**
   * MARJ LİSTESİ — hacimden BAĞIMSIZ. Birincil değer yüzde; altta adet ve
   * birim kâr durur, çünkü tek adetlik küçük bir ürün yüksek yüzdeyle başa
   * çıkabilir ve yüzde tek başına yanıltır.
   */
  const enYuksekMarjlilar = marjSiralamasi(urunSatirlari, "en-cok", LISTE_SATIRI).map(
    (s) => {
      const birim = birimKar(s);
      return listeSatiri(
        s,
        bicim.yuzde(marjYuzdesi(s) ?? 0),
        birim === null
          ? t("adetDegeri", { sayi: s.adet })
          : t("marjAlt", {
              sayi: s.adet,
              birim: bicim.para(birim, seciliPara),
            }),
      );
    },
  );

  const enAzKarBirakanlar = karSiralamasi(urunSatirlari, "en-az", LISTE_SATIRI).map(
    (s) => {
      const marj = marjYuzdesi(s);
      return listeSatiri(
        s,
        bicim.para(s.net2, seciliPara),
        marj === null
          ? t("adetDegeri", { sayi: s.adet })
          : t("karAlt", { sayi: s.adet, marj: bicim.yuzde(marj) }),
      );
    },
  );

  const karsizUrun = karsizUrunSayisi(urunSatirlari);

  // --- YAŞLANMA --------------------------------------------------------------
  /**
   * SIRALAMA ÖLÇÜTÜ: yaş (varsayılan) ya da bağlı sermaye.
   * İki ayrı soru: "en uzun bekleyen hangisi" ve "en çok parayı hangisi
   * tutuyor". 14.08.2026 ölçümü ikisinin AYRIŞTIĞINI gösterdi (95 günlük
   * kalem 4.797 ₺, 14 günlük kalem 37.790 ₺), o yüzden tek sıralama yetmiyor.
   * Sermaye maliyet bilgisidir; kâr göremeyen kullanıcıya kapalı kalır.
   */
  const istenenSirala = (parametreler.sirala ?? "").trim();
  const siralamaOlcutu: SiralamaOlcutu =
    karGorunur && siralamaGecerliMi(istenenSirala) ? istenenSirala : "yas";

  const partiVaryantlari = [...partiHaritasi.keys()];
  const varyantBilgileri =
    partiVaryantlari.length === 0
      ? []
      : await prisma.productVariant.findMany({
          where: { id: { in: partiVaryantlari } },
          select: {
            id: true,
            sku: true,
            product: {
              select: {
                id: true,
                name: true,
                vatRateOverride: true,
                category: { select: { name: true, vatRate: true } },
              },
            },
          },
        });

  const yaslanmaGirdileri: YaslanmaGirdisi[] = varyantBilgileri.map((v) => ({
    variantId: v.id,
    partiler: partiHaritasi.get(v.id) ?? [],
    // KDV oranı TEK KAYNAKTAN: ürün istisnası > kategori > varsayılan %20.
    kdvOrani: kdvOraniniCoz(v.product).oran,
  }));

  const yaslanma = yaslanmaListesi(yaslanmaGirdileri, gunDegeri(bugun), siralamaOlcutu);
  const varyantKimligi = new Map(
    varyantBilgileri.map((v) => [
      v.id,
      { sku: v.sku, urunAdi: v.product.name, urunId: v.product.id },
    ]),
  );

  /** Bağlı sermaye toplamı — yalnız TRY; çevirim yapılmaz. */
  const sermaye = sermayeToplami(yaslanma, "TRY");

  const yaslanmaSatirlari: PanelListeSatiri[] = yaslanma
    .slice(0, YASLANMA_SATIRI)
    .map((s) => {
      const kimlik = varyantKimligi.get(s.variantId);
      return {
        anahtar: s.variantId,
        urunAdi: kimlik?.urunAdi ?? s.variantId,
        urunId: kimlik?.urunId ?? null,
        sku: kimlik?.sku ?? "",
        // Birincil değer YAŞ: ölçüt bu (mimar kararı 14.08.2026).
        deger: t("yasGun", { sayi: s.yasGun }),
        altDeger:
          s.sermayeKdvHaric !== null && s.sermayeParaBirimi !== null && karGorunur
            ? t("yaslanmaAlt", {
                adet: s.adet,
                tutar: bicim.para(s.sermayeKdvHaric, s.sermayeParaBirimi),
              })
            : karGorunur && s.sermayeKdvHaric === null
              ? t("yaslanmaSermayeYok", { adet: s.adet })
              : t("adetDegeri", { sayi: s.adet }),
        rozet: (
          <BantRozeti
            bant={s.bant}
            metin={
              s.bant === "KIRMIZI"
                ? t("bantKirmizi", { gun: YAS_BANTLARI.kirmiziGun - 1 })
                : s.bant === "AMBER"
                  ? t("bantAmber", {
                      alt: YAS_BANTLARI.amberGun,
                      ust: YAS_BANTLARI.kirmiziGun - 1,
                    })
                  : t("bantNotr", { gun: YAS_BANTLARI.amberGun - 1 })
            }
          />
        ),
      };
    });

  /** Süzgeç düğmesi — bağlantıdır, istemci JavaScript'i gerektirmez. */
  function suzgecDugmesi(etiket: string, adres: string, seciliMi: boolean) {
    return (
      <Button
        key={adres + etiket}
        asChild
        size="sm"
        variant={seciliMi ? "default" : "outline"}
        className="h-11 md:h-9"
      >
        {/* Sayfa içi süzgeç: başa sarmaz (bkz. sekmeli-bolum.tsx). */}
        <Link href={adres} scroll={false}>
          {etiket}
        </Link>
      </Button>
    );
  }

  const paraAdresi = (para: string) =>
    suzgecAdresi("/", parametreler, { para });

  const siralamaAdresi = (olcut: SiralamaOlcutu) =>
    suzgecAdresi("/", parametreler, { sirala: olcut });

  /**
   * PANELDEN SATIŞLARA: kanal adı tıklanınca o kanalın satışları açılır.
   *
   * DÖNEM DE TAŞINIR: panel bloğu seçili dönemi gösteriyor, ama satış
   * listesinin varsayılanı tüm zamanlar. Dönemi taşımasak kullanıcı
   * paneldeki 4 satışa tıklayıp listede 6 satış görür ve rakamların
   * tutmadığını sanar — en sinsi tutarsızlık türü. Özel aralıkta sınır
   * günleri de gider.
   */
  const donemParametreleri = (): Record<string, string> =>
    donemTuru === "OZEL"
      ? {
          pencere: "OZEL",
          baslangic: parametreler.baslangic ?? "",
          bitis: parametreler.bitis ?? "",
        }
      : { pencere: donemTuru };

  const satisAdresi = (ek: Record<string, string>) =>
    suzgecAdresi("/satislar", {}, { ...donemParametreleri(), ...ek });

  const kanalSatislariAdresi = (kanalKodu: string) =>
    satisAdresi({ kanal: kanalKodu });

  /**
   * KARGO KUTUSUNDAN SATIŞLARA. Dönem aynı taşınıyor — paneldeki sayı ile
   * listedeki kayıt sayısı birebir tutsun. "Bekleyenler"i dönem dışında da
   * görmek isteyen, listedeki dönem rozetini tek tıkla kaldırır.
   */
  const kargoAdresi = (kargo: "verildi" | "bekleyen") =>
    satisAdresi({
      kargo,
      ...(seciliKanal ? { kanal: seciliKanal } : {}),
    });

  const aralikMetni = `${bicim.tarih(donem.baslangic)} – ${bicim.tarih(donem.sonGun)}`;

  /** Ürün analizi sekmesi — seçim URL'de yaşar, diğer süzgeçler korunur. */
  /**
   * VARSAYILAN SEKME: MARJ (mimar karari 14.08.2026).
   *
   * Panel acilista VERIMLE gelir, hacimle degil. "En cok kar eden" sekmesi
   * DURUYOR - "toplam ne kazandim" da gecerli bir soru - ama varsayilan
   * degil: mutlak tutar tek basina yaniltiyordu.
   */
  const analizSekmesi = parametreler.analiz ?? (karGorunur ? "verim" : "hacim");
  const analizAdresi = (deger: string) =>
    suzgecAdresi("/", parametreler, { analiz: deger });

  /**
   * ========================= PANEL AŞAMA 3 — PAKET 1 =========================
   *
   * İKİSİ DE DÖNEM SÜZGECİNDEN BAĞIMSIZ ve bu bilinçli:
   *  - Görev kutusu BUGÜNÜN işini sayar; döneme bağlansaydı dönem
   *    daraldığında iş listesi sessizce kısalır, kullanıcı işini unuturdu.
   *  - Takvim İLERİYE bakar; dönem süzgeci geçmişi süzer. Aynı düğmeye
   *    bağlansalardı "bugün" seçilince takvim boşalırdı. Ekranda da yazıyor.
   */
  const takvimPenceresi: TakvimPenceresi =
    parametreler.takvim === "30" ? 30 : 14;

  const takvimBugun = takvimBugunu();
  const [takvimSatirlari, gorevSayilari] = await Promise.all([
    // Nakit takvimi PARA bloğudur; izin yoksa sorgu bile atılmaz.
    karGorunur ? takvimSatirlariniTopla(takvimBugun) : Promise.resolve([]),
    gorevSayilariniTopla(),
  ]);

  const takvim = nakitTakvimiKur({
    satirlar: takvimSatirlari,
    bugun: takvimBugun,
    pencereGun: takvimPenceresi,
  });


  const seri = aylikSeri(
    satislar,
    { yil: bugun.yil, ay: bugun.ay },
    GRAFIK_AY_SAYISI,
    seciliKanal,
    seciliPara,
    iadeler,
  );

  const noktalar: GrafikNoktasi[] = seri.map((nokta) => {
    const tarih = gunDegeri({ yil: nokta.yil, ay: nokta.ay, gun: 1 });
    const tam = bicim.ayYil(tarih);
    return {
      // "Ağustos 2026" -> "Ağustos"; yıl eksende gereksiz yer kaplar.
      etiket: tam.split(" ")[0] ?? tam,
      tamEtiket: tam,
      gelir: nokta.gelir,
      net2: nokta.net2,
    };
  });

  /**
   * TABLO EN YENİDEN ESKİYE (kullanıcı kararı 14.08.2026).
   *
   * GRAFİK ile TABLO farklı sıra ister ve bu bir tutarsızlık değil:
   *   grafik → zaman ekseni soldan sağa akar, eski solda kalmalı
   *   tablo  → okumaya en üstten başlanır, oradaki ay BU AY olmalı
   *
   * Etiket burada nokta ile EŞLEŞTİRİLİYOR: eskiden `noktalar[i]` ile
   * dizin üzerinden bulunuyordu ve sıra değişince ay adları satırlardan
   * KAYARDI — sessiz ve fark edilmesi zor bir hata.
   */
  const aylikSatirlar = seri
    .map((nokta, i) => ({ nokta, etiket: noktalar[i]?.tamEtiket ?? "" }))
    .reverse();

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("altBaslik", { aralik: aralikMetni })}
        </p>
      </div>

      {/* ======================== DÖNEM VE KANAL ========================
          Ortak süzgeç çubuğu (İlke #10): aynı işlem her ekranda aynı
          görünür. Panelin farkı yalnız VARSAYILANI — dönem hiç seçilmemişse
          bu ay. */}
      <SuzgecCubugu
        temelAdres="/"
        mevcut={parametreler}
        suzgecler={
          kanalSecenekleri.length > 0
            ? [
                {
                  ad: "kanal",
                  etiket: t("kanal"),
                  secenekler: kanalSecenekleri.map(([kod, ad]) => ({
                    deger: kod,
                    etiket: ad,
                  })),
                },
              ]
            : []
        }
        zaman={{
          secili: donemTuru,
          aralikMetni,
          baslangic: parametreler.baslangic ?? "",
          bitis: parametreler.bitis ?? "",
        }}
      />

      {/* ═══════════════ ÜST SIRA: EYLEM + ÖNGÖRÜ YAN YANA ═══════════════
          14.08.2026 — PANEL DİKEY YIĞINDI, IZGARA OLDU.
          Her blok tam genişlikte alt alta duruyordu; 1400 px ekranda alanın
          büyük kısmı boş kalıyor, sayfa dört ekran uzuyordu. Gösterge
          tablosu YATAY eksende okunur: birlikte bakılan iki blok yan yana
          durur, göz aşağı kaydırmak yerine sağa bakar.

          Eşleştirme rastgele değil: solda "şimdi ne yapacağım" (eylem),
          sağda "ne zaman sıkışırım" (öngörü). İkisi günlük kararın iki
          yarısı ve birlikte okunur. */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {/* Operasyonel sayılar — `satis.kar.gor` İSTEMEZ, depocu da görür. */}
        <GorevKutusu sayilar={gorevSayilari} />

        {/* Para bloğu — izne bağlı; Operasyon nakit pozisyonu görmez.
            İzin yoksa görev kutusu tek başına tam genişliğe yayılır. */}
        {karGorunur ? (
          <NakitOzeti takvim={takvim} pencereGun={takvimPenceresi} />
        ) : null}
      </div>

      {/* Para birimi süzgeci: yalnız birden fazla varsa görünür. Süzgeç
          çubuğuna girmiyor çünkü "tümü" seçeneği YOK — iki para birimi tek
          toplamda buluşmaz, her zaman biri seçili olmalıdır. */}
      {paraSecenekleri.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {paraSecenekleri.map((para) =>
            suzgecDugmesi(para, paraAdresi(para), para === seciliPara),
          )}
        </div>
      ) : null}

      {/* ==================== DÖNEM — KANAL BAZINDA ==================== */}
      {bloklar.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            {t("donemBos")}
          </CardContent>
        </Card>
      ) : (
        bloklar.map((blok) => (
          <Card key={blok.paraBirimi} className="min-w-0">
            <CardHeader>
              <CardTitle>
                {t("donemBaslik")} · {blok.paraBirimi}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* --- büyük rakamlar --- */}
              <div
                className={`grid gap-2 sm:grid-cols-3 ${karGorunur ? "lg:grid-cols-5" : ""}`}
              >
                <div className="space-y-0.5 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">
                    {t("satisAdedi")}
                  </div>
                  <div className="text-2xl font-semibold">
                    <Baglanti href={satisAdresi(seciliKanal ? { kanal: seciliKanal } : {})}>
                      {blok.toplamAdet}
                    </Baglanti>
                  </div>
                </div>
                <div className="space-y-0.5 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">{t("ciro")}</div>
                  {/* BRÜT · İADE DÜŞÜMÜ · NET — panelin ciro gösterdiği dört
                      yüzeyin hepsinde aynı bileşen (mimar kararı 13.08.2026). */}
                  <CiroSunumu
                    boyut="kutu"
                    brut={bicim.para(blok.toplamGelir, blok.paraBirimi)}
                    iade={
                      blok.toplamIadeTutari > 0
                        ? bicim.para(blok.toplamIadeTutari, blok.paraBirimi)
                        : null
                    }
                    net={bicim.para(
                      blok.toplamGelir - blok.toplamIadeTutari,
                      blok.paraBirimi,
                    )}
                  />
                </div>
                {/* KARGO DURUMU — elle işaretlenen operasyonel rakam.
                    "Bekleyen" bugün ne yapılacağını söylediği için verilenle
                    birlikte duruyor (kullanıcı kararı 14.08.2026) ve ikisi de
                    o satışlara süzülmüş listeye götürüyor (İlke #2, #9). */}
                <div className="space-y-0.5 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">
                    {t("kargoDurumu")}
                  </div>
                  <div className="text-2xl font-semibold">
                    <Baglanti href={kargoAdresi("verildi")}>
                      {blok.kargoyaVerilenAdet}
                    </Baglanti>
                  </div>
                  <div className="text-xs">
                    {blok.kargoBekleyenAdet > 0 ? (
                      <Baglanti href={kargoAdresi("bekleyen")}>
                        {t("kargoBekleyen", { sayi: blok.kargoBekleyenAdet })}
                      </Baglanti>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("kargoBekleyenYok")}
                      </span>
                    )}
                  </div>
                </div>
                {/* NET-1 VE NET-2 YAN YANA (kullanıcı isteği 14.08.2026:
                    "net kâr 1, 2"). İkisi arasındaki fark ÖDENECEK KDV'dir;
                    açıklama satırları bunu yazıyor ki hangisine bakılacağı
                    tahmin edilmesin. */}
                {karGorunur ? (
                  <>
                    <div className="space-y-0.5 rounded-lg border p-3">
                      <div className="text-muted-foreground text-xs">
                        {t("net1")}
                      </div>
                      <div className="text-2xl font-semibold">
                        {bicim.para(blok.toplamNet1, blok.paraBirimi)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {t("net1Aciklama")}
                      </div>
                    </div>
                    <div className="space-y-0.5 rounded-lg border p-3">
                      <div className="text-muted-foreground text-xs">
                        {t("net2")}
                      </div>
                      <div className="text-2xl font-semibold">
                        {bicim.para(blok.toplamNet2, blok.paraBirimi)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {t("net2Aciklama")}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* --- kârı hesaplanamayanlar: SIFIR SAYILMAZ, söylenir ---
                  Kâr göremeyen kullanıcıya gösterilmez: uyarı kâr hakkında ve
                  "sorunluları gör" düğmesi kâr süzgecine gider — elinden
                  gelecek bir iş yok, yalnız kafa karıştırır. */}
              {karGorunur &&
              (blok.hesaplanamayanAdet > 0 ||
                blok.hesaplanamayanIadeAdedi > 0) ? (
                <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                  <p className="space-y-1 text-sm font-medium text-amber-800 dark:text-amber-300">
                    {blok.hesaplanamayanAdet > 0 ? (
                      <span className="flex items-center gap-2">
                        <TriangleAlert className="size-4 shrink-0" />
                        {t("hesaplanamayan", { sayi: blok.hesaplanamayanAdet })}
                      </span>
                    ) : null}
                    {blok.hesaplanamayanIadeAdedi > 0 ? (
                      <span className="flex items-center gap-2">
                        <TriangleAlert className="size-4 shrink-0" />
                        {t("hesaplanamayanIade", {
                          sayi: blok.hesaplanamayanIadeAdedi,
                        })}
                      </span>
                    ) : null}
                  </p>
                  <Button asChild size="sm" variant="outline" className="h-11 md:h-8">
                    <Link href="/satislar?kar=eksik">
                      {t("sorunlulariGor")}
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : null}

              {/* ================= KANAL KIRILIMI — TEK UYGULAMA =================
                  14.08.2026, kullanıcı: "bura daha iyi kurgulanabilir".

                  ÖNCE: masaüstünde TABLO, telefonda KART — iki ayrı kod, aynı
                  bilgi. Tablo iki kanal için yanlış biçimdi: dört sütun tüm
                  genişliğe yayılıyor, altında koca boşluk kalıyordu. Genişliği
                  kırpınca bu kez sağ yarı boş kaldı.

                  ŞİMDİ: tek duyarlı IZGARA. Kanal sayısı azken kartlar yan yana
                  dizilir ve alan dolar; artınca kendiliğinden alt satıra iner.
                  Telefonda tek sütun — ayrı bir mobil uygulama gerekmiyor
                  (İlke #8 ve #10: aynı bilgi her yerde aynı görünür).

                  Tablo, satır sayısı ÖNGÖRÜLEMEYEN listeler için doğru araçtır;
                  2-11 kanal için kart ızgarası hem daha yoğun hem daha okunur. */}
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {blok.kanallar.map((kanal) => (
                  <div
                    key={kanal.kanalKodu}
                    className="min-w-0 space-y-3 rounded-lg border p-3"
                  >
                    {/* TIKLANABİLİR KANAL: o kanalın satışlarına süzülmüş
                        gider. Link stili görünür (İlke #2). */}
                    <div className="font-medium">
                      <Baglanti href={kanalSatislariAdresi(kanal.kanalKodu)}>
                        {kanal.kanalAdi}
                      </Baglanti>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <div className="min-w-0">
                        <div className="text-muted-foreground text-xs">
                          {t("satisAdedi")}
                        </div>
                        <div className="text-lg font-semibold tabular-nums">
                          {kanal.adet}
                        </div>
                      </div>

                      {/* İade/eksik notları NET-2'nin yanında: ciro iadeden
                          etkilenmez, düşen rakam NET-2'dir. Sütun izne
                          kapalıysa notlar da gider — dayanağı kalmaz. */}
                      {karGorunur ? (
                        <div className="min-w-0">
                          <div className="text-muted-foreground text-xs">
                            {t("net2")}
                          </div>
                          <div className="text-lg font-semibold">
                            {bicim.para(kanal.net2, blok.paraBirimi)}
                          </div>
                          {kanal.iadeAdedi > 0 ? (
                            <div className="text-muted-foreground text-xs">
                              {t("kanalIade", { sayi: kanal.iadeAdedi })}
                            </div>
                          ) : null}
                          {kanal.hesaplanamayanAdet > 0 ? (
                            <div className="text-muted-foreground text-xs">
                              {t("kanalEksik", {
                                sayi: kanal.hesaplanamayanAdet,
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="col-span-2 min-w-0">
                        <div className="text-muted-foreground text-xs">
                          {t("ciro")}
                        </div>
                        <CiroSunumu
                          brut={bicim.para(kanal.gelir, blok.paraBirimi)}
                          iade={
                            kanal.iadeTutari > 0
                              ? bicim.para(kanal.iadeTutari, blok.paraBirimi)
                              : null
                          }
                          net={bicim.para(
                            kanal.gelir - kanal.iadeTutari,
                            blok.paraBirimi,
                          )}
                        />
                      </div>
                    </div>

                    {/**
                     * HESAP KIRILIMI — kanal kartının içinde.
                     *
                     * Kanal seviyesinde gruplamak doğru varsayılan ("Trendyol
                     * bu ay ne yaptı") ama aynı pazaryerinde iki mağaza varsa
                     * hangisinin ne yaptığı toplamın içinde kayboluyordu.
                     * TEK HESAPTA HİÇ ÇİZİLMEZ: kırılım o zaman kanal
                     * satırının tekrarıdır, gürültüden başka bir şey değil.
                     */}
                    {kanal.hesaplar.length > 1 ? (
                      <ul className="space-y-1 border-t pt-2">
                        {kanal.hesaplar.map((hesap) => (
                          <li
                            key={`${kanal.kanalKodu}-${hesap.hesapAdi}`}
                            className="text-muted-foreground flex flex-wrap items-baseline justify-between gap-2 text-xs"
                          >
                            <span className="min-w-0 truncate">
                              {hesap.hesapAdi} · {hesap.adet}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {karGorunur
                                ? bicim.para(hesap.net2, blok.paraBirimi)
                                : bicim.para(
                                    hesap.gelir - hesap.iadeTutari,
                                    blok.paraBirimi,
                                  )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}

                {/* SATIŞI OLMAYAN KANALLAR — AÇIK SIFIR.
                    Kart soluk çizilir: "var ama boş" ile "hiç yok" ayrışsın.
                    Kanal sayısı arttığında bu bölümün ayarlardan seçilebilir
                    olması BEKLEYENLER'de. */}
                {[...(paraBirimineGoreKanallar.get(blok.paraBirimi) ?? [])]
                  .filter(
                    ([kod]) => !blok.kanallar.some((k) => k.kanalKodu === kod),
                  )
                  .sort((a, b) => a[1].localeCompare(b[1], "tr"))
                  .map(([kod, ad]) => (
                    <div
                      key={`bos-${kod}`}
                      className="text-muted-foreground min-w-0 space-y-2 rounded-lg border border-dashed p-3"
                    >
                      <div className="font-medium">
                        <Baglanti href={kanalSatislariAdresi(kod)}>{ad}</Baglanti>
                      </div>
                      <div className="text-xs">{t("kanalSatisYok")}</div>
                      <div className="text-lg font-semibold tabular-nums">0</div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* ═══════════════════════ ÜRÜN ANALİZİ ═══════════════════════
          İKİ KART YAN YANA (14.08.2026, kullanıcı isteği). Tek liste tam
          genişlikte durunca sağ yarı boş kalıyordu.

          SEKMELER ÇİFT HÂLİNDE: yan yana duran iki liste aynı sorunun iki
          yüzü. Rastgele eşleştirme değil —
            VERİM  → en yüksek marj  ·  en az kâr bırakan  (aynı eksenin
                     iki ucu; hangisi verimli, hangisi değil)
            HACİM  → en çok satılan  ·  en çok kâr eden    (adet ve tutar;
                     "çok satan" ile "çok kazandıran" aynı ürün olmayabilir
                     ve bunu YAN YANA görmek gerekiyor)
            STOK   → stokta bekleyen                        (tek liste)

          Beş sekme üçe indi ve her sekme daha çok şey söylüyor. */}
      <SekmeliBolum
        baslik={t("urunAnaliziBaslik")}
        notu={t("urunAnaliziNotu")}
        secili={analizSekmesi}
        sekmeler={[
          ...(karGorunur
            ? [
                {
                  anahtar: "verim",
                  etiket: t("sekmeVerim"),
                  adres: analizAdresi("verim"),
                  icerik: (
                    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                      {/* MARJ — HACİMDEN BAĞIMSIZ (kullanıcı kararı
                          14.08.2026). Kâr listesiyle karıştırılmasın diye
                          ayrı: biri "parayı hangi ürün getirdi", öteki
                          "hangi ürün daha verimli satıyor". */}
                      <PanelListesi
                        baslik={t("enYuksekMarj")}
                        notu={t("marjNotu")}
                        satirlar={enYuksekMarjlilar}
                        bosMesaj={t("listeBos")}
                        skuEtiketi={t("sku")}
                        altNot={t("marjUyari")}
                      />
                      <PanelListesi
                        baslik={t("enAzKar")}
                        notu={t("enAzKarNotu")}
                        satirlar={enAzKarBirakanlar}
                        bosMesaj={t("listeBos")}
                        skuEtiketi={t("sku")}
                        altNot={
                          /**
                           * AZ ÇEŞİTLİ DÖNEMDE İKİ LİSTE AYNI LİSTEDİR —
                           * söylenmesi gerekir. Canlı ölçüm (14.08.2026):
                           * Ağustos'ta 5 çeşit ürün satılmış, liste tavanı
                           * da 5; yani "en az kâr" tablosu "en çok kâr"ın
                           * ters sırasıdır. Uyarı olmasaydı kullanıcı iki
                           * ayrı bulgu okuduğunu sanardı.
                           */
                          <>
                            {urunSatirlari.length <= LISTE_SATIRI &&
                            urunSatirlari.length > 0
                              ? t("azCesitUyari", { sayi: urunSatirlari.length })
                              : null}
                            {karsizUrun > 0 ? (
                              <> {t("karsizUrun", { sayi: karsizUrun })}</>
                            ) : null}
                          </>
                        }
                      />
                    </div>
                  ),
                },
              ]
            : []),
          {
            anahtar: "hacim",
            etiket: t("sekmeHacim"),
            adres: analizAdresi("hacim"),
            icerik: (
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                <PanelListesi
                  baslik={t("enCokSatilan")}
                  notu={t("enCokSatilanNotu")}
                  satirlar={enCokSatilanlar}
                  bosMesaj={t("listeBos")}
                  skuEtiketi={t("sku")}
                />
                {karGorunur ? (
                  <PanelListesi
                    baslik={t("enCokKar")}
                    notu={t("enCokKarNotu")}
                    satirlar={enCokKarEdenler}
                    bosMesaj={t("listeBos")}
                    skuEtiketi={t("sku")}
                    altNot={
                      <>
                        {/* RENK DAYANAĞI EKRANDA: eşik uydurma değil,
                            dönemin kendi ortalaması. */}
                        {ortalamaMarj === null
                          ? null
                          : t("marjRenkNotu", {
                              ortalama: bicim.yuzde(ortalamaMarj),
                            })}{" "}
                        {t("kalemKariNotu")}
                        {karsizUrun > 0 ? (
                          <> {t("karsizUrun", { sayi: karsizUrun })}</>
                        ) : null}
                      </>
                    }
                  />
                ) : null}
              </div>
            ),
          },
          {
            /* STOKTA BEKLEYEN — kâr iznine bağlı DEĞİL: adet ve yaş
               operasyonel bilgidir. İçindeki SERMAYE sütunu maliyet
               olduğu için ayrıca izne bakıyor. */
            anahtar: "stok",
            etiket: t("yaslanmaBaslik"),
            adres: analizAdresi("stok"),
            icerik: (
              <PanelListesi
                baslik={t("yaslanmaBaslik")}
                notu={t("yaslanmaNotu")}
                satirlar={yaslanmaSatirlari}
                bosMesaj={t("yaslanmaBos")}
                skuEtiketi={t("sku")}
                genis
                ustEylem={
                  // Sermaye sıralaması MALİYET bilgisidir; kâr göremeyene kapalı.
                  karGorunur ? (
                    <SiralamaDugmeleri
                      secenekler={[
                        {
                          etiket: t("siralaYas"),
                          adres: siralamaAdresi("yas"),
                          seciliMi: siralamaOlcutu === "yas",
                        },
                        {
                          etiket: t("siralaSermaye"),
                          adres: siralamaAdresi("sermaye"),
                          seciliMi: siralamaOlcutu === "sermaye",
                        },
                      ]}
                    />
                  ) : null
                }
                altNot={
                  <>
                    {/* KULLANICI UYARISI (14.08.2026): en yaşlı kalem en
                        pahalı kalem DEĞİLDİR. Ölçüm: 95 günlük kalem
                        4.796,63 ₺ tutarken 14 günlük kalem 37.789,50 ₺
                        tutuyordu. İki sıralama bu yüzden var. */}
                    {t("yaslanmaUyari")}
                    {karGorunur && sermaye.kalem > 0 ? (
                      <>
                        {" "}
                        {t("yaslanmaSermayeToplami", {
                          tutar: bicim.para(sermaye.toplam, "TRY"),
                          kalem: sermaye.kalem,
                        })}
                      </>
                    ) : null}
                    {karGorunur && sermaye.hesaplanamayan > 0 ? (
                      <>
                        {" "}
                        {t("yaslanmaHesaplanamayan", {
                          sayi: sermaye.hesaplanamayan,
                        })}
                      </>
                    ) : null}
                    {/**
                     * BURAYA BAĞLANTI KONMUYOR — bilinçli. "Tamamını gör"
                     * `/stok`'a giderdi ama o ekranda YAŞ SÜTUNU YOK:
                     * kullanıcı soruyu cevaplayamayan bir listeye düşerdi.
                     * Sayı söyleniyor, yanıltıcı bağlantı verilmiyor.
                     */}
                    {yaslanma.length > YASLANMA_SATIRI ? (
                      <>
                        {" "}
                        {t("yaslanmaKalan", {
                          sayi: yaslanma.length - YASLANMA_SATIRI,
                        })}
                      </>
                    ) : null}
                  </>
                }
              />
            ),
          },
        ]}
      />

      {/* Yaşlanma listesi ARTIK AYRI BLOK DEĞİL — "Ürün analizi" kartının
          bir sekmesi (14.08.2026). Tam genişlikte ayrı bir kart olarak
          durunca panelin bir ekranını daha yiyordu; oysa aynı soruya
          ("hangi ürün ne durumda") bakan diğer listelerle aynı yere ait.
          İçeriği yukarıdaki sekme dizisinde. */}

      {/* ======================== AYLIK GRAFİK ======================== */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{t("grafikBaslik", { ay: GRAFIK_AY_SAYISI })}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("grafikNotu")}</p>
        </CardHeader>
        {/* GRAFİK TAM GENİŞLİK, TABLO KATLI (15.08.2026 düzeltmesi).
            Bir gün önce ikisini yan yana koymuştum ve kullanıcı haklı olarak
            "çok kötü oldu" dedi. Sebebi: ÇİZGİ GRAFİĞİ GENİŞLİK İSTER.
            12 ayı yarım genişliğe sıkıştırınca ay etiketleri üst üste
            biniyor, eğim yassılaşıyor ve grafik ne söylediğini kaybediyor.
            Yan yana kurgusu iki LİSTE için doğruydu (aynı biçim, aynı
            yükseklik); grafik + tablo için değil.

            Yer kazancı bu kez KATLAMAYLA: eğri hikâyeyi anlatır, tablo
            rakamı teyit eder. Teyit her zaman ekranda durmak zorunda değil,
            ama BİR TIK ötede durmalı — silinmiyor, katlanıyor. */}
        <CardContent className="min-w-0 space-y-4">
          <CizgiGrafik
            noktalar={noktalar}
            gelirAdi={t("ciro")}
            net2Adi={t("net2")}
            bicimle={(deger) => bicim.para(deger, seciliPara)}
            bosMesaj={t("grafikBos")}
            net2Goster={karGorunur}
          />

          {/* Grafiğin okunabilir hâli — dokunmatik cihazda ve ekran
              okuyucuda ASIL kaynak budur (bkz. cizgi-grafik.tsx). Bu yüzden
              SİLİNMEZ; `<details>` ekran okuyucuda "genişlet" olarak
              tanınır, erişilebilirlik kaybı olmaz. */}
          <KatlanirBolum baslik={t("aylikRakamlar")} notu={t("aylikRakamlarNotu")}>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ay")}</TableHead>
                  <TableHead className="text-right">{t("satisAdedi")}</TableHead>
                  <TableHead className="text-right">{t("ciro")}</TableHead>
                  {karGorunur ? (
                    <TableHead className="text-right">{t("net1")}</TableHead>
                  ) : null}
                  {karGorunur ? (
                    <TableHead className="text-right">{t("net2")}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {aylikSatirlar.map(({ nokta, etiket }) => (
                  <TableRow key={`${nokta.yil}-${nokta.ay}`}>
                    <TableCell className="whitespace-nowrap">{etiket}</TableCell>
                    <TableCell className="text-right">{nokta.adet}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <CiroSunumu
                        brut={bicim.para(nokta.gelir, seciliPara)}
                        iade={
                          nokta.iadeTutari > 0
                            ? bicim.para(nokta.iadeTutari, seciliPara)
                            : null
                        }
                        net={bicim.para(
                          nokta.gelir - nokta.iadeTutari,
                          seciliPara,
                        )}
                      />
                    </TableCell>
                    {karGorunur ? (
                      <TableCell className="text-muted-foreground text-right whitespace-nowrap">
                        {bicim.para(nokta.net1, seciliPara)}
                      </TableCell>
                    ) : null}
                    {karGorunur ? (
                      <TableCell className="text-right whitespace-nowrap">
                        {bicim.para(nokta.net2, seciliPara)}
                        {nokta.iadeAdedi > 0 ? (
                          <span className="text-muted-foreground block text-xs">
                            {t("kanalIade", { sayi: nokta.iadeAdedi })}
                          </span>
                        ) : null}
                        {nokta.hesaplanamayanAdet > 0 ? (
                          <span className="text-muted-foreground block text-xs">
                            {t("kanalEksik", { sayi: nokta.hesaplanamayanAdet })}
                          </span>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </KatlanirBolum>
        </CardContent>
      </Card>
    </div>
  );
}
