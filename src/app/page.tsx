import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { CiroSunumu } from "@/components/ciro-sunumu";
import { CizgiGrafik, type GrafikNoktasi } from "@/components/cizgi-grafik";
import { ListeKarti } from "@/components/liste-karti";
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
  enCokSatilan,
  karSiralamasi,
  karsizUrunSayisi,
  urunlereTopla,
  type KalemGirdisi,
} from "@/lib/panel-listeler";
import { prisma } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";
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

  const enCokKarEdenler = karSiralamasi(urunSatirlari, "en-cok", LISTE_SATIRI).map(
    (s) =>
      listeSatiri(
        s,
        bicim.para(s.net2, seciliPara),
        t("adetDegeri", { sayi: s.adet }),
      ),
  );

  const enAzKarBirakanlar = karSiralamasi(urunSatirlari, "en-az", LISTE_SATIRI).map(
    (s) =>
      listeSatiri(
        s,
        bicim.para(s.net2, seciliPara),
        t("adetDegeri", { sayi: s.adet }),
      ),
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
        <Link href={adres}>{etiket}</Link>
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
                className={`grid gap-3 sm:grid-cols-3 ${karGorunur ? "lg:grid-cols-5" : ""}`}
              >
                <div className="space-y-1 rounded-lg border p-4">
                  <div className="text-muted-foreground text-xs">
                    {t("satisAdedi")}
                  </div>
                  <div className="text-2xl font-semibold">
                    <Baglanti href={satisAdresi(seciliKanal ? { kanal: seciliKanal } : {})}>
                      {blok.toplamAdet}
                    </Baglanti>
                  </div>
                </div>
                <div className="space-y-1 rounded-lg border p-4">
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
                <div className="space-y-1 rounded-lg border p-4">
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
                    <div className="space-y-1 rounded-lg border p-4">
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
                    <div className="space-y-1 rounded-lg border p-4">
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

              {/* --- kanal kırılımı: masaüstü tablo --- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("kanal")}</TableHead>
                      <TableHead className="text-right">
                        {t("satisAdedi")}
                      </TableHead>
                      <TableHead className="text-right">{t("ciro")}</TableHead>
                      {karGorunur ? (
                        <TableHead className="text-right">{t("net2")}</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blok.kanallar.flatMap((kanal) => [
                      <TableRow key={kanal.kanalKodu}>
                        <TableCell className="font-medium">
                          {/* TIKLANABİLİR KANAL: o kanalın satışlarına süzülmüş
                              gider. Link stili görünür (İlke #2) — düz metin
                              gibi duran tıklanabilir öğe yasak. */}
                          <Baglanti href={kanalSatislariAdresi(kanal.kanalKodu)}>
                            {kanal.kanalAdi}
                          </Baglanti>
                        </TableCell>
                        <TableCell className="text-right">{kanal.adet}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
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
                        </TableCell>
                        {/* İade/eksik notları BU HÜCREYE ait: ciro iadeden
                            etkilenmez, düşen rakam NET-2'dir. Sütun gizlenince
                            notlar da gider — dayanağı kalmaz. */}
                        {karGorunur ? (
                          <TableCell className="text-right whitespace-nowrap">
                            {bicim.para(kanal.net2, blok.paraBirimi)}
                            {/* İade varsa rakamın neden düştüğü satırda yazar —
                                yoksa "ciro yüksek, kâr düşük" bilmecesi olur. */}
                            {kanal.iadeAdedi > 0 ? (
                              <span className="text-muted-foreground block text-xs">
                                {t("kanalIade", { sayi: kanal.iadeAdedi })}
                              </span>
                            ) : null}
                            {kanal.hesaplanamayanAdet > 0 ? (
                              <span className="text-muted-foreground block text-xs">
                                {t("kanalEksik", { sayi: kanal.hesaplanamayanAdet })}
                              </span>
                            ) : null}
                          </TableCell>
                        ) : null}
                      </TableRow>,
                      /**
                       * HESAP KIRILIMI — kanal altında, girintili.
                       *
                       * Kanal seviyesinde gruplamak doğru varsayılan ("Trendyol
                       * bu ay ne yaptı") ama aynı pazaryerinde iki mağaza varsa
                       * hangisinin ne yaptığı toplamın içinde kayboluyordu.
                       * TEK HESAP VARSA SATIR AÇILMAZ: kırılım o zaman kanal
                       * satırının tekrarıdır, gürültüden başka bir şey değil.
                       */
                      ...(kanal.hesaplar.length > 1
                        ? kanal.hesaplar.map((hesap) => (
                            <TableRow
                              key={`${kanal.kanalKodu}-${hesap.hesapAdi}`}
                              className="bg-muted/30"
                            >
                              <TableCell className="text-muted-foreground pl-8 text-xs">
                                {hesap.hesapAdi}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-right text-xs">
                                {hesap.adet}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-right text-xs whitespace-nowrap">
                                <CiroSunumu
                                  brut={bicim.para(hesap.gelir, blok.paraBirimi)}
                                  iade={
                                    hesap.iadeTutari > 0
                                      ? bicim.para(
                                          hesap.iadeTutari,
                                          blok.paraBirimi,
                                        )
                                      : null
                                  }
                                  net={bicim.para(
                                    hesap.gelir - hesap.iadeTutari,
                                    blok.paraBirimi,
                                  )}
                                />
                              </TableCell>
                              {karGorunur ? (
                                <TableCell className="text-muted-foreground text-right text-xs whitespace-nowrap">
                                  {bicim.para(hesap.net2, blok.paraBirimi)}
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))
                        : []),
                    ])}
                  </TableBody>
                </Table>
              </div>

              {/* --- kanal kırılımı: telefon kartı --- */}
              <div className="space-y-3 md:hidden">
                {blok.kanallar.map((kanal) => (
                  <ListeKarti
                    key={kanal.kanalKodu}
                    baslik={
                      <Baglanti href={kanalSatislariAdresi(kanal.kanalKodu)}>
                        {kanal.kanalAdi}
                      </Baglanti>
                    }
                    alanlar={[
                      { etiket: t("satisAdedi"), deger: String(kanal.adet) },
                      {
                        etiket: t("ciro"),
                        deger: (
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
                        ),
                      },
                      ...(karGorunur
                        ? [
                            {
                              etiket: t("net2"),
                              deger: bicim.para(kanal.net2, blok.paraBirimi),
                            },
                          ]
                        : []),
                      // HESAP KIRILIMI TELEFONDA DA VAR: tek hesapta gizli.
                      ...(kanal.hesaplar.length > 1
                        ? kanal.hesaplar.map((hesap) => ({
                            etiket: hesap.hesapAdi,
                            deger: (
                              <CiroSunumu
                                brut={bicim.para(hesap.gelir, blok.paraBirimi)}
                                iade={
                                  hesap.iadeTutari > 0
                                    ? bicim.para(hesap.iadeTutari, blok.paraBirimi)
                                    : null
                                }
                                net={bicim.para(
                                  hesap.gelir - hesap.iadeTutari,
                                  blok.paraBirimi,
                                )}
                              />
                            ),
                          }))
                        : []),
                    ]}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* ==================== ÜRÜN LİSTELERİ ====================
          Üçü yan yana: aynı dönemin üç ayrı sorusu. Telefonda alt alta
          düşer (İlke #8). */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <PanelListesi
          baslik={t("enCokSatilan")}
          notu={t("enCokSatilanNotu")}
          satirlar={enCokSatilanlar}
          bosMesaj={t("listeBos")}
          skuEtiketi={t("sku")}
        />
        {karGorunur ? (
          <>
            <PanelListesi
              baslik={t("enCokKar")}
              notu={t("kalemKariNotu")}
              satirlar={enCokKarEdenler}
              bosMesaj={t("listeBos")}
              skuEtiketi={t("sku")}
              altNot={
                karsizUrun > 0 ? t("karsizUrun", { sayi: karsizUrun }) : null
              }
            />
            <PanelListesi
              baslik={t("enAzKar")}
              notu={t("enAzKarNotu")}
              satirlar={enAzKarBirakanlar}
              bosMesaj={t("listeBos")}
              skuEtiketi={t("sku")}
              altNot={
                /**
                 * AZ ÇEŞİTLİ DÖNEMDE İKİ LİSTE AYNI LİSTEDİR — söylenmesi
                 * gerekir. Canlı ölçüm (14.08.2026) gösterdi: Ağustos'ta 5
                 * çeşit ürün satılmış, liste tavanı da 5; yani "en az kâr"
                 * tablosu "en çok kâr"ın ters sırasıdır. Uyarı olmasaydı
                 * kullanıcı iki ayrı bulgu okuduğunu sanardı.
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
          </>
        ) : null}
      </div>

      {/* ==================== STOKTA BEKLEYEN — YAŞLANMA ==================== */}
      <PanelListesi
        baslik={t("yaslanmaBaslik")}
        notu={t("yaslanmaNotu")}
        satirlar={yaslanmaSatirlari}
        bosMesaj={t("yaslanmaBos")}
        skuEtiketi={t("sku")}
        ustEylem={
          // Sermayeye göre sıralama MALİYET bilgisidir; kâr göremeyene kapalı.
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
            {/* KULLANICI UYARISI (14.08.2026): en yaşlı kalem en pahalı kalem
                DEĞİLDİR. Ölçüm: 95 günlük kalem 4.796,63 ₺ tutarken 14 günlük
                kalem 37.789,50 ₺ tutuyordu. İki sıralama bu yüzden var. */}
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
                {t("yaslanmaHesaplanamayan", { sayi: sermaye.hesaplanamayan })}
              </>
            ) : null}
            {/**
             * BURAYA BAĞLANTI KONMUYOR — bilinçli. "Tamamını gör" düğmesi
             * `/stok`'a giderdi, ama o ekranda YAŞ SÜTUNU YOK: kullanıcı
             * soruyu cevaplayamayan bir listeye düşerdi. Sayı söyleniyor,
             * yanıltıcı bağlantı verilmiyor. Yaş sütununun /stok'a eklenmesi
             * BEKLEYENLER'e yazıldı.
             */}
            {yaslanma.length > YASLANMA_SATIRI ? (
              <> {t("yaslanmaKalan", { sayi: yaslanma.length - YASLANMA_SATIRI })}</>
            ) : null}
          </>
        }
      />

      {/* ======================== AYLIK GRAFİK ======================== */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{t("grafikBaslik", { ay: GRAFIK_AY_SAYISI })}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("grafikNotu")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <CizgiGrafik
            noktalar={noktalar}
            gelirAdi={t("ciro")}
            net2Adi={t("net2")}
            bicimle={(deger) => bicim.para(deger, seciliPara)}
            bosMesaj={t("grafikBos")}
            net2Goster={karGorunur}
          />

          {/* Grafiğin okunabilir hâli — dokunmatik cihazda ve ekran
              okuyucuda ASIL kaynak budur (bkz. cizgi-grafik.tsx). */}
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
        </CardContent>
      </Card>
    </div>
  );
}
