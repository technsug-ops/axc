import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  ChartLine,
  ScanBarcode,
  Store,
  TriangleAlert,
} from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { CiroSunumu } from "@/components/ciro-sunumu";
import { CizgiGrafik, type GrafikNoktasi } from "@/components/cizgi-grafik";
import { DurumRakami, DurumRozeti } from "@/components/durum-rozeti";
import {
  IstatistikKutusu,
  PayCubugu,
  UyariKarti,
} from "@/components/istatistik-kutusu";
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
  gunMetni,
  gunEkle,
  isTakvimGunu,
  pencereOlustur,
  pencerede,
  type PencereTuru,
  PANEL_VARSAYILAN_PENCERE,
} from "@/lib/donem";
import { GENEL_KDV_ORANI, kdvHaric } from "@/lib/kar";
import { kdvOraniniCoz } from "@/lib/kdv";
import { kutuOranlari } from "@/lib/panel/kar-orani";
import { pencereCoz } from "@/lib/liste-suzgeci";
import {
  aylikSeri,
  panelHesapla,
  type PanelIadesi,
  type PanelKargosu,
  type PanelSatisi,
  type ParaBirimiPaneli,
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
import {
  KIYAS_ANAHTARLARI,
  degisim,
  kiyasCoz,
  kiyasPenceresi,
} from "@/lib/karsilastirma";
import {
  gorunumCoz,
  kirilimSec,
  pencereGunSayisi,
  operasyonSerisi,
  operasyonToplami,
  serileriKur,
  tabloAcikMi,
} from "@/lib/panel/operasyon-serisi";
import { UcSeriliGrafik } from "@/components/uc-serili-grafik";
import { OPERASYON_GORUNUMLERI } from "@/lib/panel/operasyon-serisi";
import {
  kanalDagilimi,
  paretoKur,
  yogunlasma,
  zararOzeti,
} from "@/lib/panel/dagilim";
import { MarjSerhi } from "@/components/marj-serhi";
import { marjBasilabilirMi, marjSerhi } from "@/lib/ice-aktarma-serhi";
import { prisma } from "@/lib/prisma";
import { DURUM_SERIDI, karDurumu } from "@/lib/renkler";
import { acikPartilerToplu } from "@/lib/stok";
import { GorevKutusu } from "./gorev-kutusu";
import {
  donemAlimi,
  gorevSayilariniTopla,
  tarifeKapsaminiOlc,
  paketlenenSiparisSayisi,
} from "@/lib/panel/gorev-verisi";
import { tarifeUyarisiVarMi } from "@/lib/panel/tarife-penceresi";
import { suzgecAdresi } from "@/lib/suzgec";
import { izinVarMi } from "@/lib/yetki";
import {
  bandinVaryantlari,
  siralamaGecerliMi,
  yaslanmaListesi,
  sermayeToplami,
  YAS_BANTLARI,
  YAS_SUZGEC_KODU,
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

/**
 * Yoğunlaşma cümlesinin hedefi: "kârının %70'i şu N üründe".
 * 70 klasik Pareto eşiği; ekranda YAZILI olduğu için sessiz varsayım değil.
 */
const YOGUNLASMA_HEDEFI = 70;

/** Dağılım kutularında kaç satır görünür — gerisi kendi sayfasına gider. */
const DAGILIM_SATIRI = 8;

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
    /** Ürün analizi sekmesi: verim | hacim | stok | dagilim. */
    analiz?: string;
    /** Operasyon grafiği görünümü: "adet" (varsayılan) | "ciro". */
    operasyon?: string;
    /** Karşılaştırma tabanı: onceki | ucAy | gecenYil. Boşsa kapalı. */
    kiyas?: string;
  }>;
}) {
  // PANEL HERKESE AÇIK ama NET DEĞİL. 13.08.2026'da kullanıcı yakaladı:
  // satış listesinde marj gizliydi, panelde TOPLU görünüyordu.
  // `satis.kar.gor` NET KAVRAMINI yönetir — nerede görünürse orada.
  // Bu yeni bir alan-izni değil, aynı iznin aynı kavrama uygulanması.
  const karGorunur = await izinVarMi("satis.kar.gor");

  const parametreler = await searchParams;
  const t = await getTranslations("Panel");
  // "kârda"/"zararda" satış kavramıdır; sözlüğü çoğaltmak yerine oradan okunur.
  const tSatis = await getTranslations("Satis");
  // Karşılaştırma metinleri rapor sözlüğünde; aynı kavramı ikinci bir
  // sözlüğe kopyalamak, birini değiştirip diğerini unutmanın davetiyesidir.
  const tRapor = await getTranslations("Rapor");
  const bicim = await bicimlendirici();

  const an = new Date();
  const bugun = isTakvimGunu(an);

  /**
   * DÖNEM — VARSAYILAN TEK SABİTTEN (`PANEL_VARSAYILAN_PENCERE`).
   *
   * ⚠ İKİ YERDE İKİ DEĞER OLMASIN: aşağıda hem `pencereOlustur` hem
   * `donemTuru` aynı varsayılanı istiyor. Ayrı ayrı yazılsaydı biri
   * değiştirilip öteki unutulduğunda ekran bir dönemi hesaplayıp BAŞKA
   * bir düğmeyi mavi gösterirdi — sessiz ve fark edilmesi zor.
   *
   * Gerekçe ve çevrilme sebebi sabitin başında yazılı.
   * Adres boşsa ya da bozuksa da buraya düşer — hata vermez.
   */
  const cozum = pencereCoz(parametreler, an);
  const donem = cozum.pencere ?? pencereOlustur(PANEL_VARSAYILAN_PENCERE, an);
  const donemTuru: PencereTuru =
    cozum.tur === "" ? PANEL_VARSAYILAN_PENCERE : cozum.tur;

  // Grafik penceresi: bu ay dahil son 12 ayın 1'inden bugüne.
  const ilkAy = ayKaydir(bugun.yil, bugun.ay, -(GRAFIK_AY_SAYISI - 1));
  const grafikBaslangic = gunDegeri({ yil: ilkAy.yil, ay: ilkAy.ay, gun: 1 });
  const grafikBitisHaric = gunEkle(gunDegeri(bugun), 1);

  /**
   * SORGU ARALIĞI İKİSİNİ DE KAPSAR. Özel aralık 12 aydan geriye gidebilir;
   * yalnız grafik aralığını çekseydik seçilen dönemin kayıtları sessizce
   * eksik kalır ve panel "0 satış" derdi.
   */
  /**
   * ══════════════ KIYAS PENCERESİ (2a — panel ayağı) ══════════════
   * Kural TEK KAYNAKTAN: `lib/karsilastirma.ts`. Panel de rapor da aynı
   * fonksiyonu çağırıyor; ikinci bir kopya yazılmadı.
   *
   * KAPALI GELİR. Her panele zorla ikinci bir rakam basmak, kullanıcı
   * istemediği hâlde ekranı iki katına çıkarırdı — ve karşılaştırma açıkken
   * sorgu aralığı genişliyor, yani maliyeti de var.
   */
  const kiyasTuru = kiyasCoz(parametreler.kiyas);
  const kiyasPencere = kiyasTuru ? kiyasPenceresi(donem, kiyasTuru) : null;

  /**
   * SORGU ARALIĞI ÜÇÜNÜ DE KAPSAR: grafik, seçili dönem VE kıyas dönemi.
   * "Geçen yıl aynı dönem" 12 ay geriye düşer ve grafik penceresinin
   * (11 ay) DIŞINDA kalır; kapsanmasaydı panel "geçen yıl 0 satış" derdi —
   * veri yokluğu değil, SORGU yokluğu yüzünden.
   */
  const veriBaslangic = new Date(
    Math.min(
      grafikBaslangic.getTime(),
      donem.baslangic.getTime(),
      kiyasPencere?.baslangic.getTime() ?? Infinity,
    ),
  );
  const veriBitisHaric = new Date(
    Math.max(
      grafikBitisHaric.getTime(),
      donem.bitisHaric.getTime(),
      kiyasPencere?.bitisHaric.getTime() ?? -Infinity,
    ),
  );

  const [
    kayitlar,
    iadeKayitlari,
    partiHaritasi,
    kargoKayitlari,
    maliyetKayitlari,
  ] = await Promise.all([
    prisma.sale.findMany({
      // İPTAL EDİLEN SATIŞ CİROYA GİRMEZ (bkz. lib/liste-suzgeci.ts).
      where: {
        soldAt: { gte: veriBaslangic, lt: veriBitisHaric },
        iptalTarihi: null,
      },
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
          select: {
            name: true,
            channel: { select: { code: true, name: true } },
          },
        },
        items: {
          select: {
            quantity: true,
            unitPriceAmount: true,
            unitPriceCurrency: true,
            /** KDV oranı SATIŞ ANINDA yazılmış snapshot — KDV sekmesi bunu okur. */
            vatRate: true,
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

    /**
     * KARGO — KENDİ EKSENİ, KENDİ SORGUSU.
     *
     * İki küme çekilir ve ikisi de satış sorgusunun aralığına SIĞMAZ:
     *  1. Bu DÖNEMDE kargolananlar — satış tarihi çok eski olabilir.
     *  2. Hâlâ bekleyenler (`shippedAt: null`) — dönemden bağımsızdır,
     *     "bugünün bekleyeni" diye bir şey yoktur.
     *
     * ⚠ SORGU ARTIK HAFİF DEĞİL — VE SEBEBİ YAZILI (21.08.2026).
     * Eskiden yalnız para birimi çekiliyordu ("tek ihtiyacımız satışı doğru
     * blokta saymak"). Günlük operasyon grafiğinin CİRO görünümü "o gün kaç
     * liralık mal elimden çıktı" diye soruyor; bu soru kalem tutarı olmadan
     * cevaplanamaz. Sorgu genişledi, gerekçesi burada — ileride biri
     * "niye ağır" diye sorduğunda cevabı aramak zorunda kalmasın.
     */
    prisma.sale.findMany({
      where: {
        // İptal edilen satış kargolanmadı sayılır — kutuya girmez.
        iptalTarihi: null,
        OR: [
          { shippedAt: { gte: donem.baslangic, lt: donem.bitisHaric } },
          ...(kiyasPencere
            ? [
                {
                  shippedAt: {
                    gte: kiyasPencere.baslangic,
                    lt: kiyasPencere.bitisHaric,
                  },
                },
              ]
            : []),
          { shippedAt: null },
        ],
      },
      select: {
        shippedAt: true,
        profitCurrency: true,
        channelAccount: {
          select: { channel: { select: { code: true, name: true } } },
        },
        /**
         * ⚠ `take: 1` KALDIRILDI. Eskiden tek kalem yetiyordu (yalnız para
         * birimi lazımdı); ciro için TÜM kalemler gerekiyor. `take: 1` kalsa
         * çok kalemli sipariş cirosunun yalnız ilk satırını sayardı — sessiz
         * ve ekranda "makul" görünen bir eksiklik.
         */
        items: {
          select: {
            unitPriceCurrency: true,
            unitPriceAmount: true,
            quantity: true,
          },
        },
      },
    }),

    /**
     * MALİYET SATIRLARI — kâr oranlarının paydası.
     *
     * Maliyet, kalem başına `SaleFee` satırında POZİTİF bir kesinti olarak
     * duruyor (bkz. lib/kar.ts). Yanında kalemin KDV oranı çekiliyor çünkü
     * payda KDV HARİÇ olmalı ve FIFO maliyeti KDV DÂHİL saklanıyor.
     *
     * Sorgu YALNIZ SEÇİLİ DÖNEMİ kapsıyor: 12 aylık grafik aralığını da
     * çekmek, kullanılmayacak binlerce satır okumak olurdu.
     */
    prisma.saleFee.findMany({
      where: {
        code: "MALIYET",
        sale: { soldAt: { gte: donem.baslangic, lt: donem.bitisHaric } },
      },
      select: {
        amount: true,
        currency: true,
        saleItem: { select: { vatRate: true } },
      },
    }),
  ]);

  /**
   * PARA BİRİMİ BAŞINA KDV HARİÇ MALİYET.
   *
   * Oran KDV oranı BULUNAMAYAN kalemde varsayılan %20'ye düşer — bu
   * anayasadaki çözüm sırasının son basamağıdır ("ürün istisnası >
   * kategori oranı > varsayılan %20"), uydurma bir varsayım değil.
   */
  const maliyetKdvHaric = new Map<Currency, number>();
  for (const satir of maliyetKayitlari) {
    const tutar = Number(satir.amount.toString());
    const oran =
      satir.saleItem?.vatRate === null || satir.saleItem?.vatRate === undefined
        ? GENEL_KDV_ORANI
        : Number(satir.saleItem.vatRate.toString());
    maliyetKdvHaric.set(
      satir.currency,
      (maliyetKdvHaric.get(satir.currency) ?? 0) + kdvHaric(tutar, oran),
    );
  }

  /**
   * KARGO LİSTESİ — satış listesinden AYRI.
   *
   * Satış sorgusu `soldAt` aralığına bakar. Bu dönemde kargolanan bir
   * sipariş çok daha önce satılmış olabilir ve o sorguya HİÇ GİRMEZ;
   * bekleyenler için de aynısı geçerli (aylar önce satılmış, hâlâ
   * gönderilmemiş). Bu yüzden kargo kendi hafif sorgusuyla geliyor:
   * yalnız sevkiyat tarihi, kanal ve para birimi çekiliyor.
   */
  const kargolar: PanelKargosu[] = kargoKayitlari.map((k) => {
    const paraBirimi: Currency =
      k.profitCurrency ?? k.items[0]?.unitPriceCurrency ?? "TRY";
    return {
      kanalKodu: k.channelAccount.channel.code,
      kanalAdi: k.channelAccount.channel.name,
      paraBirimi,
      kargoTarihi: k.shippedAt,
      /**
       * ⚠ SEVK EDİLEN SİPARİŞİN CİROSU — kargo ÜCRETİ DEĞİL.
       * Soru "o gün kaç liralık mal elimden çıktı"; "kargoya ne kadar
       * ödedim" başka bir soru ve başka bir alan.
       *
       * Hesap satış cirosuyla AYNI kuralla: yalnız o para biriminin
       * kalemleri toplanır — karma para biriminde iki ekran ayrışmasın.
       */
      gelir: k.items
        .filter((i) => i.unitPriceCurrency === paraBirimi)
        .reduce(
          (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
          0,
        ),
    };
  });

  const satislar: PanelSatisi[] = kayitlar.map((satis) => {
    // Satışın para birimi: kâr snapshot'ındaki birim, yoksa ilk kalemin.
    // (Rapor ekranıyla birebir aynı kural — iki ekran farklı ciro göstermesin.)
    const paraBirimi: Currency =
      satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY";

    const gelir = satis.items
      .filter((k) => k.unitPriceCurrency === paraBirimi)
      .reduce(
        (t2, k) => t2 + Number(k.unitPriceAmount.toString()) * k.quantity,
        0,
      );

    /**
     * ⚠ KDV KALEM KALEM — tek oranla çarpılmaz. Bir siparişte %20 kulaklık
     * ile %1 kitap birlikte olabilir; sipariş toplamına tek oran uygulamak
     * ikisini de yanlış hesaplardı.
     * ⚠ TUTAR KDV DAHİL: kdv = satır − satır/(1+oran).
     */
    const kdv = satis.items
      .filter((k) => k.unitPriceCurrency === paraBirimi)
      .reduce((t, k) => {
        const satir = Number(k.unitPriceAmount.toString()) * k.quantity;
        const oran = k.vatRate === null ? 0 : Number(k.vatRate.toString());
        return t + (oran === 0 ? 0 : satir - satir / (1 + oran / 100));
      }, 0);

    return {
      kanalKodu: satis.channelAccount.channel.code,
      kanalAdi: satis.channelAccount.channel.name,
      hesapAdi: satis.channelAccount.name,
      tarih: satis.soldAt,
      paraBirimi,
      gelir,
      kdv,
      net1:
        satis.net1Amount === null ? null : Number(satis.net1Amount.toString()),
      net2:
        satis.net2Amount === null ? null : Number(satis.net2Amount.toString()),
      durum: satis.profitStatus,
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

    return (
      satis.items
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
        }))
    );
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
      paraBirimineGoreKanallar.get(h.defaultCurrency) ??
      new Map<string, string>();
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
    parametreler.kanal &&
    kanalSecenekleri.some(([k]) => k === parametreler.kanal)
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

  /**
   * ⚠ KARGO DA SÜZÜLÜR — 17.08.2026 canlı bulgusu.
   *
   * Satış ve iade süzülüyordu, KARGO ham geçiyordu. Kullanıcı Hepsiburada
   * seçti: ciro ve adet o kanala düştü, kargo kartı GENEL sayıyı gösterdi.
   * Aynı ekranda iki evren — kart hangi soruya cevap verdiği belli olmadan
   * rakam gösteriyordu.
   *
   * Bu, süzgecin "yarım çalışması"nın ikinci kez yaşanması: yukarıdaki
   * yorumda 14.08'de grafik süzülüp rakamların süzülmediği anlatılıyor.
   * Aynı hata bir alan ötede duruyormuş.
   */
  const donemKargolari = seciliKanal
    ? kargolar.filter((k) => k.kanalKodu === seciliKanal)
    : kargolar;

  const bloklar = panelHesapla(
    donem,
    donemSatislari,
    donemIadeleri,
    donemKargolari,
  );

  /**
   * TÜM KANAL TOPLAMI — süzgeç açıkken alt satırda gösterilir ki kullanıcı
   * genel resmi kaybetmesin. Süzgeç yokken bu satır gereksiz.
   */
  const tumKanalKargo = seciliKanal
    ? {
        verilen: kargolar.filter(
          (k) => k.kargoTarihi !== null && pencerede(donem, k.kargoTarihi),
        ).length,
        bekleyen: kargolar.filter((k) => k.kargoTarihi === null).length,
      }
    : null;

  /**
   * KIYAS BLOKLARI — aynı motor, farklı pencere. `panelHesapla` pencereyi
   * kendi içinde süzdüğü için ikinci çağrı aynı listeyle yetiniyor; kıyas
   * için ayrı bir hesap YAZILMADI.
   */
  const kiyasBloklar = kiyasPencere
    ? panelHesapla(
        kiyasPencere,
        donemSatislari,
        donemIadeleri,
        /**
         * ⚠ KIYAS DA SÜZÜLÜ LİSTEYİ KULLANIR (17.08.2026 taraması).
         *
         * Ana blok düzeltilirken bu ikinci çağrı ham `kargolar` ile
         * kalmıştı: kanal seçiliyken kartın rakamı o kanalın, "önceki
         * döneme göre" rozeti ise TÜM kanalların değişimini gösterecekti.
         * Aynı kartta iki farklı evren — düzeltilen hatanın kendisi.
         */
        donemKargolari,
      )
    : null;
  /** Kıyas döneminde o para biriminde HİÇ KAYIT yoksa null → "karşılaştırılamaz". */
  const kiyasBlogu = (paraBirimi: Currency) =>
    kiyasBloklar?.find((b) => b.paraBirimi === paraBirimi) ?? null;

  /**
   * KIYAS DÖNEMİ TAMAMEN BOŞ MU?
   *
   * Boşsa her kutuya "karşılaştırılamaz" basmak GÜRÜLTÜDÜR: beş kutuda aynı
   * cümle tekrarlanır, uzun metin kutuları taşırır ve rakamların önüne
   * geçer (kullanıcı ekran görüntüsü 15.08.2026). Bütün satırlarda AYNI
   * olan bir rozet bilgi taşımaz — vadesi bilinmeyen listesinde de aynı
   * karara varmıştık.
   *
   * Doğrusu: durumu seçicinin altında BİR KEZ söyle, kutuları rakamlara
   * bırak.
   */
  const kiyasBos =
    kiyasPencere !== null &&
    (kiyasBloklar === null || kiyasBloklar.length === 0);

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
   * ⚠ MARJ BASILABİLİR Mİ — tek sorgudan, şerhle AYNI gövdeden.
   * Ayrı hesaplansaydı şerh "%90 kapsanmıyor" derken kutu rakam basabilir
   * ve iki ekran birbirini çürütürdü.
   */
  const marjDurumuOzeti = await marjSerhi(prisma);

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
  /**
   * NET KUTULARININ ALTINDAKİ KÂR ROZETİ — tasarım referansında stat kartının
   * durumu rakamın ALTINDAKİ pastel rozetten konuşuyor.
   *
   * Sıfırda rozet YOK: sıfır ne müjde ne alarmdır (kısıt #4). "kârda" ve
   * "zararda" sözcükleri `Satis` sözlüğünden okunuyor — aynı kavramın
   * karşılığını ikinci bir sözlüğe kopyalamak, ileride birini değiştirip
   * diğerini unutmanın davetiyesidir.
   */
  function karRozeti(tutar: number) {
    const renk = karDurumu(tutar);
    if (renk === "notr") return null;
    return (
      <DurumRozeti durum={renk} isaretsiz>
        {renk === "olumlu" ? tSatis("karda") : tSatis("zararda")}
      </DurumRozeti>
    );
  }

  /**
   * KÂR ORANLARI — NET KUTUSUNUN İÇİNDE İKİ SATIR.
   *
   * Kullanıcı isteği 15.08.2026: "hem NET-1'de hem NET-2'de bu iki bilgi
   * kartın içinde görünebilir mi". Her kutu KENDİ kârının oranını gösterir;
   * aynı sayıyı iki kutuda tekrarlamak bilgi taşımazdı.
   *
   * TANIM ETİKETİ RAKAMIN YANINDA DURUR. Oran tek başına yazılsaydı
   * "neyin oranı" sorusu doğardı; paydası farklı iki oran yan yana
   * duruyor ve karışması işin doğasında.
   *
   * Payda yoksa satır HİÇ ÇİZİLMEZ — "%0" yazmak "kâr yok" demektir, oysa
   * doğru cevap "hesaplanamıyor"dur.
   */
  function oranSatirlari(
    kar: number,
    blok: (typeof bloklar)[number],
    /**
     * MELONTİK EŞLEME ETİKETİ (mimar kararı 15.08.2026, seçenek C).
     *
     * Melontik case'i AÇIK ve sürekli karşılaştırılacak; hangi bizim
     * rakamın onların hangisine denk geldiği ekranda yazmazsa her
     * karşılaştırmada aynı sürtünme doğar. Ölçüldü (15.08.2026, iki
     * sipariş): Melontik "Kâr/Satış Fiyat" = NET-2 / brüt ciro, birebir
     * aynı tanım.
     *
     * YALNIZ NET-2 KUTUSUNDA: Melontik'in oranı NET-2 üzerinden; etiketi
     * NET-1 kutusuna da koymak yanlış eşleme olurdu.
     */
    melontikEsleme = false,
  ) {
    const oranlar = kutuOranlari({
      kar,
      maliyetKdvHaric: maliyetKdvHaric.get(blok.paraBirimi) ?? 0,
      brutCiro: blok.toplamGelir,
    });
    if (oranlar.maliyete === null && oranlar.satisa === null) return null;
    return (
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {oranlar.maliyete === null ? null : (
          <span className="whitespace-nowrap">
            <span className="font-medium tabular-nums">
              {bicim.yuzde(oranlar.maliyete)}
            </span>{" "}
            <span className="text-muted-foreground">{t("oranMaliyete")}</span>
          </span>
        )}
        {oranlar.satisa === null ? null : (
          <span className="min-w-0">
            {/*
              ⛔ MALİYETİ OLMAYAN SATIŞ VARSA RAKAM BASILMAZ.
              Ekrandaki oran `net / TÜM ciro`; gerçek oran `net / MALİYETİ
              OLAN ciro`. İkisinin oranı tam olarak `1 − kapsanmayanPay`,
              yani kapsanmayan pay kadar DÜŞÜK gösterir. Ölçüldü
              27.08.2026: pay **%90** iken ekran **%1,11**, gerçek **%11,12**.
              Bir rakamı on kat yanlış basmak, hiç basmamaktan kötüdür.

              ⚠ EŞİK GÖSTERİM HASSASİYETİNDEN TÜRETİLDİ, veriden değil —
              gerekçe `lib/ice-aktarma-serhi.ts` → `MARJ_KAPSAM_ESIGI`.
            */}
            {marjBasilabilirMi(marjDurumuOzeti) ? (
              <span className="font-medium tabular-nums">
                {bicim.yuzde(oranlar.satisa)}
              </span>
            ) : (
              <span className="font-medium">
                {t("marjHesaplanamiyor", {
                  kapsanmayan: marjDurumuOzeti.kapsanmayanSatis,
                  toplam: marjDurumuOzeti.toplamSatis,
                })}
              </span>
            )}{" "}
            <span className="text-muted-foreground break-words">
              {t("oranSatisa")}
              {melontikEsleme ? ` ${t("melontikCiro")}` : ""}
            </span>
          </span>
        )}
      </span>
    );
  }

  function marjRozeti(marj: number | null) {
    const durum = marjDurumu(marj, ortalamaMarj);
    if (durum === null || marj === null) return null;
    /**
     * PALET TEK KAYNAKTAN (bkz. lib/panel/renkler.ts). Rozet işaret de
     * taşıyor: renk körlüğünde ve siyah-beyaz çıktıda yüzde tek başına
     * kalmasın (kısıt #1).
     */
    const renkDurumu =
      durum === "zarar" ? "olumsuz" : durum === "zayif" ? "uyari" : "olumlu";
    return <DurumRozeti durum={renkDurumu}>{bicim.yuzde(marj)}</DurumRozeti>;
  }

  /**
   * ══════════════════ DAĞILIM (2c) — "NEREYE YOĞUNLAŞMALIYIM" ══════════════
   * İKİ AYRI LİSTE (mimar kararı 15.08.2026): kâr edenler kendi toplamları
   * üzerinden kümülatifli, zarar edenler ayrı kutuda. Tek listede negatifleri
   * kümülatife katmak eğriyi %100'ün üstüne çıkarıp geri düşürürdü.
   *
   * PAYDA DÖNEMİN TOPLAMIDIR, tüm zamanın değil: `urunSatirlari` zaten
   * seçili dönemin kalemlerinden türüyor.
   */
  const pareto = paretoKur(
    urunSatirlari.map((u) => ({
      anahtar: u.variantId,
      ad: u.urunAdi,
      sku: u.sku,
      net2: u.net2,
    })),
  );
  const yogunluk = yogunlasma(pareto, YOGUNLASMA_HEDEFI);

  /**
   * ZARARA GİDEN SATIŞLAR (2b) — dönem süzgecine bağlı.
   * Ölçüt `zararOzeti` içinde tek yerde; tıklanınca açılan liste
   * (`/satislar?kar=zarar`) aynı iki şartı arıyor, sayı ile liste tutar.
   */
  const zarar = zararOzeti(
    donemSatislari
      .filter((s) => pencerede(donem, s.tarih))
      .map((s) => ({
        net2: s.net2,
        hesaplandiMi: s.durum === "CALCULATED",
      })),
  );

  /**
   * Dağılım kutularının para birimi. Ürün listeleri kalem seviyesinde
   * tek para birimi varsayar (bkz. lib/panel-listeler.ts); dağılım da aynı
   * varsayımı kullanıyor ve HAREKETİ EN ÇOK olan bloğun birimini alıyor.
   * Blok yoksa TRY — sistemin operasyon para birimi.
   */
  const dagilimParaBirimi: Currency = bloklar[0]?.paraBirimi ?? "TRY";

  const enCokKarEdenler = karSiralamasi(
    urunSatirlari,
    "en-cok",
    LISTE_SATIRI,
  ).map((s) => {
    const marj = marjYuzdesi(s);
    return {
      ...listeSatiri(
        s,
        bicim.para(s.net2, seciliPara),
        t("adetDegeri", { sayi: s.adet }),
      ),
      rozet: marjRozeti(marj),
    };
  });

  /**
   * MARJ LİSTESİ — hacimden BAĞIMSIZ. Birincil değer yüzde; altta adet ve
   * birim kâr durur, çünkü tek adetlik küçük bir ürün yüksek yüzdeyle başa
   * çıkabilir ve yüzde tek başına yanıltır.
   */
  const enYuksekMarjlilar = marjSiralamasi(
    urunSatirlari,
    "en-cok",
    LISTE_SATIRI,
  ).map((s) => {
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
  });

  const enAzKarBirakanlar = karSiralamasi(
    urunSatirlari,
    "en-az",
    LISTE_SATIRI,
  ).map((s) => {
    const marj = marjYuzdesi(s);
    return listeSatiri(
      s,
      bicim.para(s.net2, seciliPara),
      marj === null
        ? t("adetDegeri", { sayi: s.adet })
        : t("karAlt", { sayi: s.adet, marj: bicim.yuzde(marj) }),
    );
  });

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

  const yaslanma = yaslanmaListesi(
    yaslanmaGirdileri,
    gunDegeri(bugun),
    siralamaOlcutu,
  );
  const varyantKimligi = new Map(
    varyantBilgileri.map((v) => [
      v.id,
      { sku: v.sku, urunAdi: v.product.name, urunId: v.product.id },
    ]),
  );

  /** Bağlı sermaye toplamı — yalnız TRY; çevirim yapılmaz. */
  const sermaye = sermayeToplami(yaslanma, "TRY");

  /**
   * ÖLÜ SERMAYE — 60+ GÜNDÜR RAFTA (Panel Aşama 3, madde 4).
   *
   * Yaşlanma listesi Paket 1'den beri var; eksik olan HÜKÜMDÜ. "Neyi
   * kesmeliyim" sorusunun iki yarısı yan yana durmalı: zarara giden
   * satışlar (para kaybı) ve ölü sermaye (para tutsak).
   *
   * Ölçüt `YAS_BANTLARI.kirmiziGun` (61) — aynı sabit rozetleri de
   * boyuyor, ikinci bir eşik uydurulmadı.
   *
   * DÖNEM SÜZGECİNDEN ETKİLENMEZ: "bugün depoda ne bekliyor" sorusu geçmiş
   * bir tarih aralığıyla daralmaz (aynı ilke yaşlanma listesinde de yazılı).
   */
  const oluKalemler = bandinVaryantlari(yaslanma, "KIRMIZI");
  /** Rozetin hedefi — /stok yaş süzgeci. Kod tek yerden okunuyor. */
  const oluSermayeAdresi = `/stok?yas=${YAS_SUZGEC_KODU.KIRMIZI}`;
  const oluSermaye = sermayeToplami(
    yaslanma.filter((y) => y.bant === "KIRMIZI"),
    "TRY",
  );

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
          s.sermayeKdvHaric !== null &&
          s.sermayeParaBirimi !== null &&
          karGorunur
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

  /**
   * Kıyas seçimi adreste yaşar; DÖNEM, KANAL ve SEKME seçimi KORUNUR.
   * Aynı düğmeye tekrar basmak karşılaştırmayı kapatır.
   */
  const kiyasAdresi = (yeni: string | null) => {
    const q = new URLSearchParams();
    for (const [ad, deger] of Object.entries(donemParametreleri())) {
      if (deger) q.set(ad, deger);
    }
    if (parametreler.kanal) q.set("kanal", parametreler.kanal);
    if (parametreler.analiz) q.set("analiz", parametreler.analiz);
    if (parametreler.sirala) q.set("sirala", parametreler.sirala);
    if (yeni) q.set("kiyas", yeni);
    const metin = q.toString();
    return metin ? `/?${metin}` : "/";
  };

  /**
   * DEĞİŞİM ROZETİ — HEM SAYI HEM ORAN. Raporla AYNI kural
   * (`lib/karsilastirma.ts`); iki ekranda iki farklı hesap olmasın.
   *
   * Kıyas döneminde KAYIT YOKSA "karşılaştırılamaz" der. Rozeti hiç
   * çizmemek "sorun yok" gibi okunur, %0 yazmak "hiç değişmedi" der;
   * ikisi de veri yokluğunu gizler (sessiz sıfır yasağı).
   */
  function kiyasRozeti(
    simdi: number,
    onceki: number | null,
    bicimle: (n: number) => string,
    artisIyiMi = true,
  ) {
    if (!kiyasPencere || kiyasBos) return null;
    const d = degisim(simdi, onceki);
    if (!d.karsilastirilabilir || d.mutlak === null) {
      return (
        <DurumRozeti durum="notr" isaretsiz>
          {tRapor("kiyaslanamaz")}
        </DurumRozeti>
      );
    }
    if (d.mutlak === 0) {
      return (
        <DurumRozeti durum="notr" isaretsiz>
          {tRapor("degisimYok")}
        </DurumRozeti>
      );
    }
    const iyi = d.mutlak > 0 === artisIyiMi;
    return (
      <DurumRozeti durum={iyi ? "olumlu" : "olumsuz"} isaretsiz>
        <span className="tabular-nums">
          {d.mutlak > 0 ? "▲" : "▼"} {bicimle(Math.abs(d.mutlak))}
          {d.yuzde === null ? "" : ` · ${bicim.yuzde(Math.abs(d.yuzde))}`}
        </span>
      </DurumRozeti>
    );
  }

  const satisAdresi = (ek: Record<string, string>) =>
    suzgecAdresi("/satislar", {}, { ...donemParametreleri(), ...ek });

  const kanalSatislariAdresi = (kanalKodu: string) =>
    satisAdresi({ kanal: kanalKodu });

  /**
   * KARGO KUTUSUNDAN SATIŞLARA — SAYI İLE LİSTE BİREBİR TUTMALI.
   *
   * "Verildi" dönemi TAŞIR: liste tarafında dönem artık `shippedAt`e
   * uygulanıyor (bkz. lib/liste-suzgeci.ts), yani "bu dönemde
   * kargoladıklarım" — panelin saydığı şeyin aynısı.
   *
   * "Bekleyen" dönemi TAŞIMAZ: o sayaç dönemden bağımsızdır. Dönem
   * taşınsaydı panel "7 bekliyor" derken liste 2 kayıt gösterirdi.
   */
  const kargoAdresi = (kargo: "verildi" | "bekleyen") => {
    const ek = { kargo, ...(seciliKanal ? { kanal: seciliKanal } : {}) };
    return kargo === "bekleyen"
      ? suzgecAdresi("/satislar", {}, ek)
      : satisAdresi(ek);
  };

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
  const [gorevSayilari, tarifeKapsam, paketlenen, alim, kiyasAlim] =
    await Promise.all([
    gorevSayilariniTopla(),

    /**
     * TARİFE PENCERESİ — görev satırının SÜRE tarafı (K47).
     *
     * ⚠ SAYI `gorevSayilariniTopla` İÇİNDE ZATEN VAR; burada gereken
     * KALAN GÜN. Aynı türetme iki yerde yapılmıyor — ikisi de
     * `tarifeKapsaminiOlc()` çağırıyor.
     */
    tarifeKapsaminiOlc(),

    /**
     * PAKETLEME İLERLEMESİ — "kargoya verilecek 15 · paketlenen 1".
     *
     * ⚠ AYRI SAYI, AYRI GÖREV DEĞİL. Bu bir iş kalemi değil, var olan
     * `kargoBekleyen` görevinin ne kadarının hazır olduğu. Yeni bir görev
     * anahtarı açsaydık dört exhaustive haritaya birden dokunmak gerekirdi
     * ve panelde 0'ken de duran bir satır daha doğardı.
     */
    paketlenenSiparisSayisi(),
    /**
     * ALIM ADEDİ — dönem kartının ilk kutusu (kullanıcı isteği
     * 20–21.08.2026: _"burası da günlük bir emek"_).
     *
     * ⚠ DÖNEM SÜZGECİNE BAĞLI, "bugün"e sabit DEĞİL. Kart "Seçili dönem"
     * diyor; içindeki tek kutu süzgeci dinlemeseydi kullanıcı dönemi
     * değiştirdiğinde beş rakam oynar, biri donar kalırdı. Günlük emeği
     * görmek için süzgeç "Bugün" seçilir — o zaman altısı da bugünü
     * gösterir.
     */
    donemAlimi(donem),
    kiyasPencere ? donemAlimi(kiyasPencere) : Promise.resolve(null),
  ]);

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

  /**
   * ── GÜNLÜK OPERASYON SERİSİ (kullanıcı isteği 21.08.2026) ───────────────
   * "Günlük operasyonlarım bu üç kalemden oluşuyor: kaç mal aldım, kaç mal
   * sattım, kaç kargo verdim."
   *
   * ⚠ ÜÇ AYRI TARİH EKSENİ korunuyor: alım `purchasedAt`, satış satış
   * tarihi, kargo `shippedAt`. Aynı güne indirgemek 15.08.2026'da yaşanmış
   * bir hatadır (6 paket kargolandı, panel "2" dedi).
   *
   * ⚠ SEÇİLİ PARA BİRİMİ: satış ve kargo o para birimine süzülüyor. Alım
   * tarafı bugün TRY okuyor — karma para biriminde alım varsa serinin alım
   * çizgisi eksik kalır ve bu ekranda YAZILI (kart altındaki not).
   */
  /**
   * ⚠ KIRILIM PENCEREYE GÖRE (kullanıcı eşlemesi 21.08.2026): son 30 gün
   * gün gün, bu ay hafta hafta, 3/6 ay ve 1 yıl ay ay. Uzun pencerede gün
   * gün çizmek 365 noktalı okunmaz bir tarak üretir.
   */
  const operasyonKirilimi = kirilimSec(donemTuru, pencereGunSayisi(donem));
  const operasyonGunleri = operasyonSerisi({
    pencere: donem,
    kirilim: operasyonKirilimi,
    alimlar: alim.gunluk,
    satislar: donemSatislari
      .filter((s) => s.paraBirimi === seciliPara)
      .map((s) => ({ tarih: s.tarih, gelir: s.gelir, kdv: s.kdv })),
    kargolar: donemKargolari
      .filter((k) => k.kargoTarihi !== null && k.paraBirimi === seciliPara)
      .map((k) => ({ tarih: k.kargoTarihi as Date, gelir: k.gelir })),
  });
  const operasyonGorunumu = gorunumCoz(parametreler.operasyon);
  const operasyonSeri = serileriKur(operasyonGunleri, operasyonGorunumu);
  const operasyonToplam = operasyonToplami(operasyonGunleri);
  /**
   * NOKTAYA TIKLAYINCA SÜZÜLMÜŞ LİSTE (kullanıcı isteği 21.08.2026).
   * ⚠ Nokta kendi tarih aralığını taşıyor; adres ondan kuruluyor. Böylece
   * haftalık/aylık kovada da doğru aralık açılır — "20.08" değil "17–23.08".
   */
  const noktaAdresi = (temel: string, n: (typeof operasyonGunleri)[number]) =>
    suzgecAdresi(
      temel,
      {},
      {
        pencere: "OZEL",
        baslangic: gunMetni(n.baslangic),
        bitis: gunMetni(n.sonGun),
        ...(seciliKanal && temel !== "/alimlar" ? { kanal: seciliKanal } : {}),
      },
    );

  /**
   * ÜST SIRADA GÖSTERİLECEK BLOK — seçili para biriminin bloğu.
   * ⚠ `bloklar[0]` DEĞİL: iki para birimi varsa ekranın geri kalanı
   * `seciliPara`yı gösterirken üst kart başka bir para birimini gösterirdi.
   */
  const ustBlok =
    bloklar.find((b) => b.paraBirimi === seciliPara) ?? bloklar[0] ?? null;
  const ustPaylar = ustBlok
    ? new Map(
        kanalDagilimi(
          ustBlok.kanallar.map((k) => ({
            kanalKodu: k.kanalKodu,
            kanalAdi: k.kanalAdi,
            ciro: k.gelir,
            net2: k.net2,
          })),
        ).kanallar.map((k) => [k.kanalKodu, k]),
      )
    : null;

  /**
   * ============================================================================
   *  PAZARYERİ KARTLARI — ÜST SIRAYA TAŞINDI (kullanıcı kararı 21.08.2026)
   * ----------------------------------------------------------------------------
   *  Kartlar "Seçili dönem" kartının İÇİNDE, sayfanın ortasında duruyordu.
   *  Kullanıcı: _"pazaryeri kartını sağ tarafa koy, nakit özetini Rapor'a al"_.
   *
   *  Gerekçe yerleşimden değil SORUDAN geliyor: panel açılışında sorulan iki
   *  soru "bugün ne yapmalıyım" (sol) ve "hangi kanal ne getiriyor" (sağ).
   *  Nakit özeti ise ileriye bakan bir RAPOR sorusu; günlük iş ekranında
   *  yer kaplıyordu.
   *
   *  ⚠ JSX TAŞINDI, YENİDEN YAZILMADI. 178 satırlık işaretleme birebir
   *  korunuyor — yeniden yazmak, içindeki onlarca kararı (pay çubuğu, iade
   *  satırı, açık sıfır notları) sessizce kaybetme riskiydi.
   *
   *  ⚠ BLOK DIŞARIDAN GELİYOR: `blok` ve `kanalPaylari` eskiden `bloklar.map`
   *  kapsamındaydı. Şimdi SEÇİLİ PARA BİRİMİNİN bloğu üstte hesaplanıp
   *  parametre olarak veriliyor; ekranın geri kalanı da aynı para birimini
   *  kullanıyor (`seciliPara`), yani iki yer ayrışamaz.
   * ============================================================================
   */
  const kanalIzgarasi = (
    blok: ParaBirimiPaneli,
    kanalPaylari: Map<string, { ciroPayi: number; net2Payi: number | null }>,
  ) => (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {blok.kanallar.map((kanal) => (
        <div
          key={kanal.kanalKodu}
          className="bg-card min-w-0 space-y-3 rounded-lg border p-3"
        >
          {/* TIKLANABİLİR KANAL: o kanalın satışlarına süzülmüş
                      gider. Link stili görünür (İlke #2). */}
          <div className="font-medium">
            <Baglanti href={kanalSatislariAdresi(kanal.kanalKodu)}>
              {kanal.kanalAdi}
            </Baglanti>
          </div>

          {/* PAY ÇUBUĞU — kanalın ciro içindeki ağırlığı.
                      Kartlar bir ızgara dolusu birbirinin aynıydı; hangi
                      kanalın yükü taşıdığı ancak rakamlar tek tek okunup
                      kafada karşılaştırılınca anlaşılıyordu. Çubuk bunu
                      BAKINCA söylüyor.
                      Kanala ayrı KİMLİK RENGİ verilmedi: 11 kanal için 11
                      ton, dört durum rengiyle karışır ve "yeşil = iyi"
                      anlamı çökerdi. Bilgiyi taşıyan renk değil UZUNLUK. */}
          {/* İKİ ÇUBUK: CİRO PAYI VE NET-2 PAYI (2c).
                      Biri hacmi, diğeri gerçek kazancı gösterir ve
                      FARKLI OLABİLİRLER — o fark önemlidir: cironun
                      %60'ını taşıyan kanal kârın %40'ını getiriyor
                      olabilir. Paylar `kanalDagilimi` ile denkleştirilir,
                      toplam %100'dür ve yuvarlama artığı kaybolmaz.
                      Kanala ayrı KİMLİK RENGİ verilmedi: 11 kanal için 11
                      ton, dört durum rengiyle karışır ve "yeşil = iyi"
                      anlamı çökerdi. Bilgiyi taşıyan renk değil UZUNLUK. */}
          {(() => {
            const pay = kanalPaylari.get(kanal.kanalKodu);
            if (!pay) return null;
            return (
              <div className="space-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-muted-foreground w-10 shrink-0 text-xs">
                    {t("ciro")}
                  </span>
                  <PayCubugu
                    oran={pay.ciroPayi / 100}
                    etiket={bicim.yuzde(pay.ciroPayi)}
                  />
                </div>
                {/* NET-2 payı: toplam kâr eksiyse pay ANLAMSIZ —
                            işaretler birbirini yer. O hâlde çubuk yok. */}
                {karGorunur && pay.net2Payi !== null ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-muted-foreground w-10 shrink-0 text-xs">
                      {t("net2")}
                    </span>
                    <PayCubugu
                      oran={pay.net2Payi / 100}
                      etiket={bicim.yuzde(pay.net2Payi)}
                    />
                  </div>
                ) : null}
              </div>
            );
          })()}

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
                <div className="text-muted-foreground text-xs">{t("net2")}</div>
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
              <div className="text-muted-foreground text-xs">{t("ciro")}</div>
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
        .filter(([kod]) => !blok.kanallar.some((k) => k.kanalKodu === kod))
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
  );

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("altBaslik", { aralik: aralikMetni })}
        </p>
      </div>

      {/* ═══════════ SÜZGEÇ + KARŞILAŞTIRMA — TEK GRUP ═══════════
          ⚠ İkisi arasındaki boşluk `space-y-6` idi ve "Karşılaştır"
          satırı ayrı bir bölüm gibi duruyordu; oysa ikisi de AYNI soruyu
          ayarlıyor: hangi dönem. Tek sarmalda `space-y-3` ile birbirine
          yaklaştı — kazanılan dikey alan panelin ilk ekranına yazıyor
          (#12: alanı verimli kullan). */}
      <div className="space-y-3">
        {/* ======================== DÖNEM VE KANAL ========================
          Ortak süzgeç çubuğu (İlke #10): aynı işlem her ekranda aynı
          görünür. Panelin farkı yalnız VARSAYILANI — dönem hiç seçilmemişse
          bu ay. */}
        <SuzgecCubugu
          /* YAPIŞKAN — Halil 18.08.2026: "kanalı SIK değiştiriyorum."
           Yalnız telefonda yapışıyor; masaüstünde çubuk zaten görünür. */
          yapiskan
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
          /* ⚠ PANELDE DÖNEM BOŞ OLAMAZ — seçilmemişse "Bu ay"a düşüyor.
           Rozet kaldırılabilir gibi görünmesin diye sabit işaretlendi. */
          zamanSabit
          zaman={{
            secili: donemTuru,
            /* ⚠ ARALIK METNİ BOŞ GEÇİLİYOR, kaybolmuyor: aynı aralık iki
             satır yukarıda sayfa BAŞLIĞINDA yazılı ("01.08 – 21.08 ·
             dönemi değiştirmek için…"). İki kez yazmak, süzgeç alanını
             beş satıra çıkarıp aynı şeyi dört kez söylemek demekti. */
            aralikMetni: "",
            baslangic: parametreler.baslangic ?? "",
            bitis: parametreler.bitis ?? "",
          }}
        />


        {/*
          ⚠ MARJ ŞERHİ — [YANLIŞ CEVAP VEREN EKRAN], 26.08.2026.
          İçe aktarılan satışlar CİROYA giriyor, NET'e girmiyor: bu kutunun
          `kâr/ciro` oranı olduğundan DÜŞÜK çıkıyor (ölçüldü: ekran %2,58,
          maliyet bağlı olanlarda %9,31; haziran %0,3 · temmuz %0,2).
          Şerh maliyet bağı kurulunca KENDİLİĞİNDEN söner — ölçüt
          `profitStatus`, `importBatch` değil.
        */}
        <MarjSerhi />

        {/* ═══════════════ KARŞILAŞTIRMA SEÇİCİ (2a) ═══════════════
          KAPALI GELİR: her panele zorla ikinci bir rakam basmak ekranı
          gereksiz kalabalıklaştırırdı; ayrıca açıkken sorgu aralığı
          genişliyor, yani maliyeti var.
          Aynı düğmeye tekrar basmak KAPATIR (İlke #10).
          KIYASLANAN ARALIK YAZILI DURUR — tanım ekranda olmazsa rozet
          sessiz bir varsayıma dönerdi. */}
        {karGorunur ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {tRapor("kiyasBaslik")}
            </span>
            {KIYAS_ANAHTARLARI.map((a) => (
              <Button
                key={a}
                asChild
                size="sm"
                variant={kiyasTuru === a ? "default" : "outline"}
                className="h-11 md:h-8"
              >
                <Link
                  href={kiyasAdresi(kiyasTuru === a ? null : a)}
                  scroll={false}
                >
                  {tRapor(`kiyas_${a}`)}
                </Link>
              </Button>
            ))}
            {kiyasPencere ? (
              <span className="text-muted-foreground text-xs">
                {aralikMetni} ↔ {bicim.tarih(kiyasPencere.baslangic)} –{" "}
                {bicim.tarih(kiyasPencere.sonGun)}
              </span>
            ) : null}
            {/* Kıyas dönemi bomboşsa BİR KEZ söylenir; beş kutuda
              tekrarlanmaz. Sessiz sıfır yasağı korunuyor — durum yine
              açıkça yazılı, sadece tek yerde. */}
            {kiyasBos ? (
              <DurumRozeti durum="notr" isaretsiz>
                {tRapor("kiyaslanamaz")}
              </DurumRozeti>
            ) : null}
          </div>
        ) : null}

        {/* ═══════════════ ÜST SIRA: EYLEM + ÖNGÖRÜ YAN YANA ═══════════════
          14.08.2026 — PANEL DİKEY YIĞINDI, IZGARA OLDU.
          Her blok tam genişlikte alt alta duruyordu; 1400 px ekranda alanın
          büyük kısmı boş kalıyor, sayfa dört ekran uzuyordu. Gösterge
          tablosu YATAY eksende okunur: birlikte bakılan iki blok yan yana
          durur, göz aşağı kaydırmak yerine sağa bakar.

          Eşleştirme rastgele değil: solda "şimdi ne yapacağım" (eylem),
          sağda "ne zaman sıkışırım" (öngörü). İkisi günlük kararın iki
          yarısı ve birlikte okunur. */}
        {/* ⚠ 2/5 — 3/5 (kullanıcı kararı 21.08.2026): görev kartları
          daraltıldı, pazaryeri kartları sağa ve GENİŞ tarafa alındı.
          Eşit bölünce (2/2) pazaryeri kartları üçe bölünüp sıkışıyordu;
          görev kutucukları ise kısa ve fazla genişlik istemiyor. */}
        <div className="grid min-w-0 gap-4 xl:grid-cols-5">
          {/* Operasyonel sayılar — `satis.kar.gor` İSTEMEZ, depocu da görür. */}
          <div className="min-w-0 xl:col-span-2">
            <GorevKutusu
              sayilar={gorevSayilari}
              ilerlemeler={{ kargoBekleyen: paketlenen }}
              /*
                ⚠ ADRES KUTUNUN KENDİ HEDEFİNİ DARALTIYOR, DEĞİŞTİRMİYOR:
                `kargo=bekleyen` korunuyor, üstüne `paket=hazirlanan`
                ekleniyor. Yalnız `paket=hazirlanan` yazsaydık kargoya
                VERİLMİŞ eski siparişler de listeye girer, liste rakamdan
                büyük çıkardı — sayının tıklanınca kendini doğrulamaması
                en sinsi hata olurdu.
              */
              ilerlemeAdresleri={{
                kargoBekleyen: "/satislar?kargo=bekleyen&paket=hazirlanan",
              }}
              /*
                ⚠ "ACELE" KARARI SAF KURALDAN GELİYOR, BURADA
                TÜRETİLMİYOR. Eşiği (`UYARI_GUNU`) ekranda yazsaydık
                panel ile uyarı merkezi bir gün ayrışabilirdi.
              */
              sureler={{
                tarifePenceresi: {
                  kalanGun: tarifeKapsam.kalanGun,
                  aceleMi: tarifeUyarisiVarMi(tarifeKapsam),
                },
              }}
            />
          </div>

          {/* PAZARYERİ PERFORMANSI — para bloğu, izne bağlı.
            İzin yoksa görev kartları tek başına tam genişliğe yayılır. */}
          {karGorunur && ustBlok && ustPaylar ? (
            <Card className="flex min-w-0 flex-col xl:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Store className="size-5" />
                  {t("kanalKirilimi")}
                  <span className="text-muted-foreground text-xs font-normal">
                    {ustBlok.paraBirimi}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                {ustBlok.kanallar.length === 0 ? (
                  /* AÇIK SIFIR: kanal yoksa kart boş kalmaz, sebebi yazar. */
                  <p className="text-muted-foreground text-sm">
                    {t("donemBos")}
                  </p>
                ) : (
                  kanalIzgarasi(ustBlok, ustPaylar)
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
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
        bloklar.map((blok) => {
          /**
           * ⚠ KANAL PAYLARI ARTIK BURADA HESAPLANMIYOR — pazaryeri kartları
           * üst sıraya taşındı ve payları `ustPaylar` olarak orada bir kez
           * hesaplanıyor. İki yerde hesaplansaydı yuvarlama artığı farklı
           * dağıtılıp aynı kanal iki farklı yüzde gösterebilirdi.
           */
          /** Bu para biriminin kıyas dönemi bloğu; yoksa null. */
          const kb = kiyasBlogu(blok.paraBirimi);
          return (
            <Card key={blok.paraBirimi} className="min-w-0">
              <CardHeader>
                <CardTitle>
                  {t("donemBaslik")} · {blok.paraBirimi}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ---------------- KIYAS YOKSA SÖYLE ----------------
                  ⚠ 18.08.2026 — Halil: "kıyas rozeti sessiz kaldı, veri
                  yok mu değişim yok mu anlaşılmıyor."

                  Sessizlik BİLİNÇLİYDİ (15.08.2026): kıyas dönemi bomboşken
                  her kutuya "karşılaştırılamaz" basmak beş kez aynı cümle
                  demekti ve rakamların önüne geçiyordu. O karar DURUYOR.

                  Eksik olan yerdi: ibare dönem seçicisinin altında, yani
                  telefonda rakamlardan EKRANLAR ötede kalıyordu. Bilgi
                  vardı, KARAR ANINDA görünmüyordu — Ders 3'ün aynısı.

                  Çözüm ikisini de korur: kutu başına DEĞİL, kart başına BİR
                  satır, rakamların hemen üstünde. */}
                {kiyasBos ? (
                  <p className="text-muted-foreground text-xs">
                    {t("kiyasVeriYok")}
                  </p>
                ) : null}

                {/* ---------------- BÜYÜK RAKAMLAR ----------------
                  SIRA: ADET → KARGOYA VERİLEN → CİRO → NET-1 → NET-2.
                  _Halil kararı 18.08.2026; ciro ile kargo yer değiştirdi._

                  Sıra OPERASYON HUNİSİDİR: göz önce "kaç iş var", sonra
                  "kaçı çıktı", ancak ondan sonra paraya bakar. Ciro
                  kargodan önce durunca sayfa para ile başlıyor ve günün
                  işi arada kalıyordu.

                  ⚠ SIRA RASTGELE DEĞİL — yeni kutu eklenirken hunideki
                  yerine konur, sona eklenmez. */}
                <div
                  className={`grid gap-2 sm:grid-cols-3 ${karGorunur ? "lg:grid-cols-6" : ""}`}
                >
                  {/* ---------------- ALIM ADEDİ — HUNİNİN BAŞI ----------------
                    Kullanıcı sırası 21.08.2026: alım → satış → kargo →
                    ciro → NET-1 → NET-2.

                    Huninin başına geçmesi mantıklı: mal ÖNCE alınır, sonra
                    satılır. Ve "günlük emek" olarak istendi — kaç alım
                    girildiği, kaç satış girildiği kadar günün işidir.

                    ⚠ DÖNEM SÜZGECİNE BAĞLI, kardeşleriyle aynı pencereyi
                    paylaşıyor; kıyas rozetini de onlarla aynı motordan
                    alıyor. */}
                  <IstatistikKutusu
                    etiket={t("alimAdedi")}
                    cocuk={
                      <Baglanti
                        href={suzgecAdresi(
                          "/alimlar",
                          {},
                          donemParametreleri(),
                        )}
                      >
                        {alim.adet}
                      </Baglanti>
                    }
                    rozet={kiyasRozeti(
                      alim.adet,
                      kiyasAlim?.adet ?? null,
                      (n) => String(n),
                    )}
                    /* ---------------- ALT NOT: DÖNEMİN ALIM TUTARI ----------
                     İlke #15 — tek tek gösterilen yerde toplam da olur.
                     Kullanıcı KDV dengesi için aylık alım tutarını takip
                     ediyor ve alım listesinde bu toplam ZATEN var; panelde
                     yokken aynı rakam için ikinci ekrana gitmek gerekiyordu.

                     ⚠ PARA — izne bağlı. Adet operasyoneldir, tutar değil;
                     `satis.kar.gor` yoksa yalnız adet görünür.

                     ⚠ Bu bloğun para birimi süzgeci var; yalnız o para
                     biriminin toplamı yazılır, karışık toplam üretilmez. */
                    altNot={
                      karGorunur ? (
                        <span>
                          {t("alimToplami", {
                            tutar: bicim.para(
                              alim.toplam.find(
                                (x) => x.paraBirimi === blok.paraBirimi,
                              )?.tutar ?? 0,
                              blok.paraBirimi,
                            ),
                          })}
                        </span>
                      ) : null
                    }
                  />
                  <IstatistikKutusu
                    etiket={t("satisAdedi")}
                    cocuk={
                      <Baglanti
                        href={satisAdresi(
                          seciliKanal ? { kanal: seciliKanal } : {},
                        )}
                      >
                        {blok.toplamAdet}
                      </Baglanti>
                    }
                    rozet={kiyasRozeti(
                      blok.toplamAdet,
                      kb?.toplamAdet ?? null,
                      (n) => String(n),
                    )}
                    /* ADET KUTUSUNDA ADET, PARA KUTUSUNDA PARA.
                     Ciro kutusu iadenin TUTARINI yazıyor; buraya ADEDİ
                     geliyor. Aynı bilgi iki kez değil, aynı olayın iki
                     ölçüsü — "3 iade" ile "−₺2.980" farklı sorulara cevap.

                     AÇIK SIFIR: iade yoksa da satır yazılır. Yokluğundan
                     "iade olmadı" sonucunu çıkarmak imkânsızdır. */
                    altNot={
                      <span>
                        {t("iadeAdedi", { sayi: blok.toplamIadeAdedi })}
                      </span>
                    }
                  />
                  {/* KARGO DURUMU — elle işaretlenen operasyonel rakam.
                    "Bekleyen" bugün ne yapılacağını söylediği için verilenle
                    birlikte duruyor (kullanıcı kararı 14.08.2026) ve ikisi de
                    o satışlara süzülmüş listeye götürüyor (İlke #2, #9).

                    İKİ TARİH EKSENİ AYNI EKRANDA — alttaki not ZORUNLU.
                    Ciro ve satış adedi SATIŞ tarihine, kargo SEVKİYAT
                    tarihine göre süzülür. Not olmazsa kullanıcı "satış 2 ama
                    kargo 6, neden tutmuyor" der ve panele güveni gider. */}
                  <IstatistikKutusu
                    /* SÜZGEÇ AÇIKKEN KANAL ADI BAŞLIKTA: kart hangi soruya
                     cevap verdiğini kendisi söyler. */
                    etiket={
                      seciliKanal
                        ? t("kargoDurumuKanal", {
                            kanal:
                              kanalSecenekleri.find(
                                ([k]) => k === seciliKanal,
                              )?.[1] ?? seciliKanal,
                          })
                        : t("kargoDurumu")
                    }
                    cocuk={
                      <Baglanti href={kargoAdresi("verildi")}>
                        {blok.kargoyaVerilenAdet}
                      </Baglanti>
                    }
                    kiyas={kiyasRozeti(
                      blok.kargoyaVerilenAdet,
                      kb?.kargoyaVerilenAdet ?? null,
                      (n) => String(n),
                    )}
                    /* BEKLEYEN KARGO YAPILACAK İŞTİR — rozet amber yanar.
                     Bekleyen yoksa rozet YOK: "iş yok" bir başarı değil,
                     sıradan hâldir; yeşile boyamak her gün kutlama olurdu. */
                    rozet={
                      blok.kargoBekleyenAdet > 0 ? (
                        <DurumRozeti durum="uyari">
                          <Baglanti href={kargoAdresi("bekleyen")}>
                            {t("kargoBekleyen", {
                              sayi: blok.kargoBekleyenAdet,
                            })}
                          </Baglanti>
                        </DurumRozeti>
                      ) : null
                    }
                    altNot={
                      <span className="text-muted-foreground">
                        {/* Rakamın hangi tarihe göre sayıldığı YAZIYOR. */}
                        <span className="block">{t("kargoEkseniNotu")}</span>
                        <span className="block">
                          {blok.kargoBekleyenAdet > 0
                            ? t("kargoBekleyenNotu")
                            : t("kargoBekleyenYok")}
                        </span>
                        {/* GENEL RESİM KAYBOLMASIN: süzgeç açıkken tüm kanal
                          toplamı küçük satırda durur. Süzgeç yokken bu satır
                          gereksiz tekrar olurdu. */}
                        {tumKanalKargo ? (
                          <span className="block">
                            {t("kargoTumKanallar", {
                              verilen: tumKanalKargo.verilen,
                              bekleyen: tumKanalKargo.bekleyen,
                            })}
                          </span>
                        ) : null}
                      </span>
                    }
                  />
                  {/* CİRO — kutu düzenine girmiyor çünkü tek rakam değil, üç
                    satır (brüt · iade düşümü · net). Kendi bileşeni var ve
                    panelin ciro gösterdiği dört yüzeyin hepsinde aynı
                    (mimar kararı 13.08.2026). */}
                  <div className="bg-card min-w-0 space-y-1 rounded-lg border p-3">
                    <span className="text-muted-foreground min-w-0 text-xs break-words">
                      {t("ciro")}
                    </span>
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
                    {/* Kıyas BRÜT ciro üzerinden: iade etkisi ayrı bir
                      kavram ve raporda da karşılaştırma dışında tutuluyor. */}
                    {kiyasRozeti(
                      blok.toplamGelir,
                      kb?.toplamGelir ?? null,
                      (n) => bicim.para(n, blok.paraBirimi),
                    )}
                  </div>
                  {/* NET-1 VE NET-2 YAN YANA (kullanıcı isteği 14.08.2026:
                    "net kâr 1, 2"). İkisi arasındaki fark ÖDENECEK KDV'dir;
                    açıklama satırları bunu yazıyor ki hangisine bakılacağı
                    tahmin edilmesin. */}
                  {karGorunur ? (
                    <>
                      <IstatistikKutusu
                        etiket={t("net1")}
                        cocuk={bicim.para(blok.toplamNet1, blok.paraBirimi)}
                        rozet={karRozeti(blok.toplamNet1)}
                        kiyas={kiyasRozeti(
                          blok.toplamNet1,
                          kb?.toplamNet1 ?? null,
                          (n) => bicim.para(n, blok.paraBirimi),
                        )}
                        altNot={
                          <>
                            {oranSatirlari(blok.toplamNet1, blok)}
                            <span className="text-muted-foreground block">
                              {t("net1Aciklama")}
                            </span>
                          </>
                        }
                      />
                      {/* NET-2 BAŞROL. Beş kutu da aynı boydayken hiçbiri
                        önemli görünmüyordu; oysa günün sonunda cebe giren
                        rakam budur. Tek "bas" kutusu o yüzden burada. */}
                      <IstatistikKutusu
                        etiket={t("net2")}
                        bas
                        cocuk={bicim.para(blok.toplamNet2, blok.paraBirimi)}
                        rozet={karRozeti(blok.toplamNet2)}
                        kiyas={kiyasRozeti(
                          blok.toplamNet2,
                          kb?.toplamNet2 ?? null,
                          (n) => bicim.para(n, blok.paraBirimi),
                        )}
                        altNot={
                          <>
                            {oranSatirlari(blok.toplamNet2, blok, true)}
                            <span className="text-muted-foreground block">
                              {t("net2Aciklama")}
                            </span>
                          </>
                        }
                      />
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
                  /* UYARI KARTI — referanstaki bildirim kartının ta kendisi:
                   sol şerit + doygun çip + metin + eylem. Önceden burada
                   `amber-500/10` gibi ham Tailwind sınıfları vardı, yani
                   palet dışından bir sarı; tek kapı kuralı deliniyordu. */
                  <UyariKarti
                    durum="uyari"
                    ikon={TriangleAlert}
                    baslik={
                      blok.hesaplanamayanAdet > 0
                        ? t("hesaplanamayan", { sayi: blok.hesaplanamayanAdet })
                        : t("hesaplanamayanIade", {
                            sayi: blok.hesaplanamayanIadeAdedi,
                          })
                    }
                    altSatir={
                      blok.hesaplanamayanAdet > 0 &&
                      blok.hesaplanamayanIadeAdedi > 0
                        ? t("hesaplanamayanIade", {
                            sayi: blok.hesaplanamayanIadeAdedi,
                          })
                        : null
                    }
                    eylem={
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-11 md:h-8"
                      >
                        <Link href="/satislar?kar=eksik">
                          {t("sorunlulariGor")}
                          <ArrowRight />
                        </Link>
                      </Button>
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* ══════════════ GÜNLÜK OPERASYON GRAFİĞİ ══════════════
          ⚠ YERİ "SEÇİLİ DÖNEM"İN ALTINDA (kullanıcı kararı 21.08.2026).
          Sıra bilinçli: önce dönemin HÜKMÜ (adet · ciro · NET), sonra o
          hükmün GÜN GÜN nasıl oluştuğu. Grafik üstteyken göz eğilime
          bakıyor ama neyin eğilimi olduğunu henüz bilmiyordu.

          Kullanıcı isteği 21.08.2026: _"günlük kaç mal aldığımı, kaç mal
          sattığımı ve kaç kargo verdiğimi aynı grafikte görmek istiyorum"_.

          ⚠ İZNE BAĞLI: ciro görünümü para gösteriyor. Adet görünümü
          operasyoneldir ama sekme aynı kartta olduğu için kart bütün
          olarak `satis.kar.gor` istiyor — yarısı görünen bir kart,
          görünmeyen yarısını merak ettirir. */}
      {karGorunur ? (
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <ChartLine className="size-5" />
                {t("operasyonBaslik")}
              </span>
              {/* SEKME ADRESE YAZILIR (İlke #13): yenilenince seçim kalır. */}
              <span className="flex flex-wrap gap-2">
                {OPERASYON_GORUNUMLERI.map((gor) => (
                  <Button
                    key={gor}
                    asChild
                    size="sm"
                    variant={operasyonGorunumu === gor ? "default" : "outline"}
                    className="h-11 md:h-8"
                  >
                    <Link
                      href={suzgecAdresi("/", parametreler, { operasyon: gor })}
                      scroll={false}
                    >
                      {t(`operasyon_${gor}`)}
                    </Link>
                  </Button>
                ))}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <UcSeriliGrafik
              noktalar={operasyonGunleri.map((n, i) => ({
                etiket: bicim.tarih(n.baslangic),
                /* Kova bir günden genişse ARALIK yazılır: "17–23.08".
                   Tek gün yazılsaydı haftalık noktada sayı ile etiket
                   ayrışır, kullanıcı "o gün 12 satış mı olmuş" derdi. */
                tamEtiket:
                  n.baslangic.getTime() === n.sonGun.getTime()
                    ? bicim.tarih(n.baslangic)
                    : `${bicim.tarih(n.baslangic)} – ${bicim.tarih(n.sonGun)}`,
                a: operasyonSeri.alim[i] ?? 0,
                b: operasyonSeri.satis[i] ?? 0,
                c: operasyonSeri.ucuncu[i] ?? 0,
                /* ⚠ YALNIZ ADET KİPİNDE DOLU — `serileriKur` öteki kiplerde
                   `null` döner ve grafik toplam çizgisini hiç çizmez. Ciroda
                   alım ile satış zıt yönlerdir; toplamak "para hangi yöne
                   aktı" sorusunu bulandırırdı. */
                ...(operasyonSeri.toplam
                  ? { toplam: operasyonSeri.toplam[i] ?? 0 }
                  : {}),
                /* ⚠ FARK ÇİZGİSİ TIKLANMAZ: tek bir listeye karşılığı yok
                   (iki kümenin farkı). Sessiz kalmasın diye adres hiç
                   verilmiyor — nokta çizilir ama link olmaz. */
                adres:
                  operasyonGorunumu !== "adet"
                    ? {
                        a: noktaAdresi("/alimlar", n),
                        b: noktaAdresi("/satislar", n),
                        c: "",
                      }
                    : {
                        a: noktaAdresi("/alimlar", n),
                        b: noktaAdresi("/satislar", n),
                        c: suzgecAdresi(
                          "/satislar",
                          {},
                          {
                            pencere: "OZEL",
                            baslangic: gunMetni(n.baslangic),
                            bitis: gunMetni(n.sonGun),
                            kargo: "verildi",
                            ...(seciliKanal ? { kanal: seciliKanal } : {}),
                          },
                        ),
                      },
              }))}
              /* Ad verilmezse grafik toplamı hiç çizmez — iki şart birlikte. */
              toplamAdi={
                operasyonSeri.toplam ? t("operasyonToplamSeri") : undefined
              }
              tabloAcik={tabloAcikMi(operasyonGunleri.length)}
              /* AKORDİYON BAŞLIĞI — kaç satır olduğunu söylüyor ki
                 açmadan önce beklenti kurulsun (İlke #5). */
              tabloAcMetni={t("operasyonTabloAc", {
                sayi: operasyonGunleri.length,
              })}
              /* ⚠ ÖZET GRAFİK İLE TABLO ARASINDA (kullanıcı 21.08.2026):
                 önce eğilim, sonra hüküm, en sonra istersen döküm. */
              ozet={
                <p className="text-muted-foreground text-xs">
                  {operasyonGorunumu === "ciro"
                    ? /* ⚠ KARGO CİROSU YAZILMIYOR (kullanıcı: "ihtiyaç yok").
                         Yerine FARK: satış − alım. */
                      t("operasyonToplamCiro", {
                        alim: bicim.para(operasyonToplam.alimTutar, seciliPara),
                        satis: bicim.para(
                          operasyonToplam.satisCiro,
                          seciliPara,
                        ),
                        fark: bicim.para(operasyonToplam.fark, seciliPara),
                      })
                    : /* Adet tarafında üç kalem + TOPLAM İŞLEM sayısı. */
                      t("operasyonToplamAdet", {
                        alim: operasyonToplam.alimAdet,
                        satis: operasyonToplam.satisAdet,
                        kargo: operasyonToplam.kargoAdet,
                        islem: operasyonToplam.islemAdedi,
                      })}
                </p>
              }
              adlar={{
                a:
                  operasyonGorunumu === "kdv"
                    ? t("operasyonIndirilecek")
                    : t("operasyonAlim"),
                b:
                  operasyonGorunumu === "kdv"
                    ? t("operasyonHesaplanan")
                    : t("operasyonSatis"),
                c:
                  operasyonGorunumu === "ciro"
                    ? t("operasyonFark")
                    : operasyonGorunumu === "kdv"
                      ? t("operasyonOdenecek")
                      : t("operasyonKargo"),
              }}
              bicimle={(d) =>
                operasyonGorunumu === "adet"
                  ? String(Math.round(d))
                  : bicim.para(d, seciliPara)
              }
              bosMesaj={t("donemBos")}
            />

            {/* ⚠ ESKİ UYARI KALDIRILDI, GEREKÇESİYLE (21.08.2026).
                Kartta _"bu grafik ciro gösterir, KDV değil; iki cironun
                farkı vergiyi vermez"_ yazıyordu. Kullanıcı itiraz etti:
                "her ürünün KDV bilgisi girildiği için net bilgi sende var".
                HAKLIYDI — ölçüldü: satış 60/60 kalemde snapshot'lı, alım
                193/193 kalem kategoriden çözülebiliyor. Uyarı yerine KDV
                SEKMESİ kondu.

                Kalan tek sınır beyan ediliyor: satış oranı DONDURULMUŞ,
                alım oranı BUGÜNDEN okunuyor. */}
            {operasyonGorunumu === "kdv" ? (
              <p className="text-muted-foreground border-t pt-2 text-xs">
                {t("operasyonKdvKaynak")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
        /**
         * KART ARAMASI BURADA: listeler DÖNEMİN en iyi/en kötüsünü gösterir,
         * ama kullanıcının aklındaki ürün listede olmayabilir. Aramayı
         * analiz başlığına koymak, "şu ürün ne durumda" sorusunu listeye
         * bakmadan cevaplatıyor (İlke #9).
         */
        ustEylem={
          <Button asChild variant="secondary" size="sm" className="h-9">
            <Link href="/kart">
              <ScanBarcode />
              {t("kartAra")}
            </Link>
          </Button>
        }
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
                              ? t("azCesitUyari", {
                                  sayi: urunSatirlari.length,
                                })
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
          /**
           * ═══════════════ DAĞILIM SEKMESİ (2c) ═══════════════
           * Kâr izni yoksa hiç çizilmez: sekmenin tamamı NET-2 üzerine
           * kurulu, izinsiz kullanıcıya boş bir kabuk göstermek olurdu.
           */
          ...(karGorunur
            ? [
                {
                  anahtar: "dagilim",
                  etiket: t("sekmeDagilim"),
                  adres: analizAdresi("dagilim"),
                  icerik: (
                    <div className="min-w-0 space-y-4">
                      {/* ZARARA GİDEN SATIŞLAR (2b) — sayaç EYLEME götürür:
                          tıklayınca `kar=zarar` süzgeciyle o satışlara gider.
                          Sıfırsa GİZLENMEZ, "temiz" yazar — açık sıfır.
                          Ölçüt `zararOzeti` ile süzgeçte AYNI: hesaplanmış
                          VE NET-2 eksi. Böylece sayı ile liste tutar. */}
                      <div className="flex">
                        {zarar.adet > 0 ? (
                          <DurumRozeti durum="olumsuz" isaretsiz>
                            <Baglanti href={satisAdresi({ kar: "zarar" })}>
                              {t("zararliSatis", {
                                sayi: zarar.adet,
                                tutar: bicim.para(
                                  zarar.toplam,
                                  dagilimParaBirimi,
                                ),
                              })}
                            </Baglanti>
                          </DurumRozeti>
                        ) : (
                          <DurumRozeti durum="olumlu" isaretsiz>
                            {t("zararliSatisYok")}
                          </DurumRozeti>
                        )}
                      </div>

                      {/* ÖLÜ SERMAYE — zararın YANINDA duruyor: "neyi
                          kesmeliyim" sorusunun iki yarısı (para kaybı ve
                          para tutsak) birlikte okunur. Sıfırsa gizlenmez. */}
                      <div className="flex">
                        {oluKalemler.length > 0 ? (
                          <DurumRozeti durum="olumsuz" isaretsiz>
                            {/* HEDEF: /stok'un YAŞ SÜZGECİ — panelin kendi
                                sekmesi DEĞİL. O2 testi tam burada düştü:
                                `analizAdresi("stok")` aynı sayfanın sekmesine
                                gidiyordu, yani rozet eyleme götürmüyor,
                                sayfayı başa atıyordu. */}
                            <Baglanti href={oluSermayeAdresi}>
                              {t("oluSermaye", {
                                gun: YAS_BANTLARI.kirmiziGun,
                                /* SAYI KÜMEDEN OKUNUYOR. `sermayeToplami.kalem`
                                   yalnız maliyeti BİLİNEN kalemleri sayar;
                                   liste ise bandı tutan HEPSİNİ gösterecek.
                                   İkisi ayrışmasın diye sayı da aynı kümeden
                                   geliyor (Halil maddesi c). */
                                kalem: oluKalemler.length,
                                tutar: bicim.para(oluSermaye.toplam, "TRY"),
                              })}
                            </Baglanti>
                          </DurumRozeti>
                        ) : (
                          <DurumRozeti durum="olumlu" isaretsiz>
                            {t("oluSermayeYok", {
                              gun: YAS_BANTLARI.kirmiziGun,
                            })}
                          </DurumRozeti>
                        )}
                      </div>

                      {/* YOĞUNLAŞMA CÜMLESİ — abartısız, yorum kullanıcının.
                          Panel yalnız dağılımı dürüstçe söyler. */}
                      {yogunluk ? (
                        <p className="text-sm">
                          {t("yogunlasmaCumlesi", {
                            sayi: yogunluk.urunSayisi,
                            yuzde: bicim.yuzde(yogunluk.yuzde),
                          })}
                        </p>
                      ) : null}

                      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                        {/* KÂR EDENLER — kümülatif kendi toplamları üzerinden */}
                        <div
                          className={`min-w-0 rounded-lg border p-3 ${DURUM_SERIDI.olumlu} bg-card`}
                        >
                          <div className="mb-2 min-w-0">
                            <div className="font-medium">{t("karEdenler")}</div>
                            <p className="text-muted-foreground text-xs">
                              {t("karEdenlerNotu")}
                            </p>
                          </div>
                          {pareto.karEdenler.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              {t("karEdenYok")}
                            </p>
                          ) : (
                            <ul className="max-w-3xl space-y-2">
                              {pareto.karEdenler
                                .slice(0, DAGILIM_SATIRI)
                                .map((u) => (
                                  <li
                                    key={u.anahtar}
                                    className="min-w-0 space-y-1"
                                  >
                                    <div className="flex min-w-0 items-baseline justify-between gap-2 text-sm">
                                      <span className="min-w-0 truncate">
                                        {u.ad}
                                      </span>
                                      <span className="shrink-0 tabular-nums">
                                        {bicim.para(u.net2, dagilimParaBirimi)}
                                      </span>
                                    </div>
                                    {/* Çubuk KÜMÜLATİFİ gösterir: "ilk N ürün
                                      kârın %X'i" cümlesi gözle okunsun. */}
                                    <PayCubugu
                                      oran={u.kumulatif / 100}
                                      etiket={bicim.yuzde(u.kumulatif)}
                                    />
                                  </li>
                                ))}
                            </ul>
                          )}
                          {pareto.karEdenler.length > DAGILIM_SATIRI ? (
                            <p className="text-muted-foreground mt-2 text-xs">
                              {t("dagilimKalan", {
                                sayi: pareto.karEdenler.length - DAGILIM_SATIRI,
                              })}
                            </p>
                          ) : null}
                        </div>

                        {/* ZARAR EDENLER — AYRI KUTU, kümülatife karışmaz */}
                        <div
                          className={`min-w-0 rounded-lg border p-3 ${DURUM_SERIDI.olumsuz} bg-card`}
                        >
                          <div className="mb-2 min-w-0">
                            <div className="font-medium">
                              {t("zararEdenler")}
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {t("zararEdenlerNotu")}
                            </p>
                          </div>
                          {pareto.zararEdenler.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              {t("zararEdenYok")}
                            </p>
                          ) : (
                            <>
                              <div className="mb-2">
                                <DurumRozeti durum="olumsuz" isaretsiz>
                                  {t("zararOzeti", {
                                    sayi: pareto.zararEdenler.length,
                                    tutar: bicim.para(
                                      pareto.zararToplami,
                                      dagilimParaBirimi,
                                    ),
                                  })}
                                </DurumRozeti>
                              </div>
                              <ul className="max-w-3xl space-y-1">
                                {pareto.zararEdenler
                                  .slice(0, DAGILIM_SATIRI)
                                  .map((u) => (
                                    <li
                                      key={u.anahtar}
                                      className="flex min-w-0 items-baseline justify-between gap-2 text-sm"
                                    >
                                      <span className="min-w-0 truncate">
                                        {u.ad}
                                      </span>
                                      <DurumRakami
                                        durum="olumsuz"
                                        className="shrink-0"
                                      >
                                        {bicim.para(u.net2, dagilimParaBirimi)}
                                      </DurumRakami>
                                    </li>
                                  ))}
                              </ul>
                            </>
                          )}
                          {pareto.zararEdenler.length > DAGILIM_SATIRI ? (
                            <p className="text-muted-foreground mt-2 text-xs">
                              {t("dagilimKalan", {
                                sayi:
                                  pareto.zararEdenler.length - DAGILIM_SATIRI,
                              })}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* SIFIR KÂRLI ÜRÜN SESSİZCE KAYBOLMAZ. */}
                      {pareto.notrAdet > 0 ? (
                        <p className="text-muted-foreground text-xs">
                          {t("notrUrunNotu", { sayi: pareto.notrAdet })}
                        </p>
                      ) : null}
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
          <KatlanirBolum
            baslik={t("aylikRakamlar")}
            notu={t("aylikRakamlarNotu")}
          >
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("ay")}</TableHead>
                    <TableHead className="text-right">
                      {t("satisAdedi")}
                    </TableHead>
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
                      <TableCell className="whitespace-nowrap">
                        {etiket}
                      </TableCell>
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
                              {t("kanalEksik", {
                                sayi: nokta.hesaplanamayanAdet,
                              })}
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
