import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import { Eye, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { ExcelIndir } from "@/components/excel-indir";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { KatlanirBolum } from "@/components/katlanir-bolum";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { SekmeliBolum } from "@/components/sekmeli-bolum";
import { SayfalamaCubugu } from "@/components/sayfalama";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
import { UzunAd } from "@/components/uzun-ad";
import { DurumRozeti } from "@/components/durum-rozeti";
import { BILDIRIM_DURUM_RENGI } from "@/lib/durum-renkleri";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  LISTE_PENCERELERI,
  gunDegeri,
  gunMetni,
  isTakvimGunu,
  pencereOlustur,
  type PencereTuru,
} from "@/lib/donem";
import {
  BILDIRIM_DURUMLARI,
  bildirimDurumEtiketleri,
  bildirimGecisEtiketleri,
  bildirimSiradakiAdim,
  ANALIZ_SONUCLARI,
  ITIRAZ_GEREKCELERI,
  analizSonucuEtiketleri,
  iadeGerekceEtiketleri,
  itirazGerekceEtiketleri,
  iadeTuruEtiketleri,
} from "@/lib/etiketler";
import {
  ACIK_BILDIRIM_DURUMLARI,
  bildirimAramaKosulu,
  DEGISIM_GEREKCELERI,
  gecisGecerliMi,
  IADE_ISLE_SEBEP_ANAHTARI,
  iadeIslenebilirMi,
} from "@/lib/iade/bildirim";
import { BildirimFormu } from "./bildirim-formu";
import { Ekler } from "./ekler";
import { EK_SINIRLARI } from "@/lib/ekler";

import { askidaMi, kargolamaDurumu } from "@/lib/iade/kargolama";
import { isleyenSayac, sayacRengi } from "@/lib/iade/sayac";
import { BildirimDurumu } from "./bildirim-durumu";
import { SayacRozeti, type SayacGorunumu } from "./sayac-rozeti";
import {
  KargolanacakKutusu,
  type AskidaSatir,
  type KargolanacakSatir,
} from "./kargolanacak-kutusu";

/**
 * BİLDİRİMİ EKRANIN ANLAYACAĞI ŞEKLE ÇEVİRİR.
 *
 * ⚠ KURAL BURADA YAZILMAZ — `lib/iade/sayac.ts`ten gelir. Gün sayısı, çıpa
 * türü ve sütun adı bu dosyaya KOPYALANMIYOR; iki yerde iki kural olsaydı
 * biri sessizce eskirdi ve ekran, sunucunun yazdığından başka bir tarih
 * gösterirdi.
 */
function sayacGorunumu(
  b: {
    id: string;
    status: NoticeStatus;
    noticedAt: Date;
    otomatikOnayTarihi: Date | null;
    islemSonTarihi: Date | null;
  },
  bugun: Date,
): SayacGorunumu | null {
  const durum = isleyenSayac(b, bugun);
  if (!durum) return null;
  return {
    bildirimId: b.id,
    tur: durum.tur,
    sonuc: durum.kural.sonuc,
    /* Sunucu bileşeninden istemciye geçen her şey düz veri olmalı. */
    sonTarih: durum.sonTarih ? durum.sonTarih.toISOString() : null,
    kalanGun: durum.kalanGun,
    bosluk: durum.bosluk,
    renk: sayacRengi(durum),
    sutun: durum.kural.sutun,
    cipaElle: durum.kural.cipa === "ELLE_GIRILIR",
  };
}
import {
  iadeSatirVerisi,
  iadeToplamlari,
  kanalKirilimi,
  urunKirilimi,
  type IadeSatirVerisi,
} from "@/lib/iade-liste";
import { prisma } from "@/lib/prisma";
import { sayfaCoz } from "@/lib/sayfalama";
import { suzgecAdresi } from "@/lib/suzgec";
import { varyantStoklari } from "@/lib/stok";
import { kalanTalepEdilebilirAdet } from "@/lib/tazminat";

import type { NoticeStatus, ReturnType } from "@/generated/prisma/enums";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("iadeler") };
}

/**
 * ============================================================================
 *  İADE LİSTESİ
 * ----------------------------------------------------------------------------
 *  Bugüne kadar iadeler yalnız satış detayında yaşıyordu: "geçen ay kaç iade
 *  yedim, hangisi hasarlıydı, hangisinin tazminatı açılmadı" sorularının
 *  cevabı hiçbir ekranda yoktu.
 *
 *  PARA SÜTUNLARI `satis.kar.gor` İZNİNE BAĞLI — yeni bir alan-izni DEĞİL,
 *  aynı iznin aynı kavrama uygulanması (bkz. lib/yetki/izinler.ts başlığı).
 *  Operasyon listeyi PARASIZ görür: tarih, sipariş, ürün, adet ve hasar
 *  bilgisi açıktır; NET-2 etkisi, ceza ve maliyet gizlidir.
 * ============================================================================
 */

const TURLER: ReturnType[] = ["UNDELIVERED", "NORMAL", "DISPUTED"];

/**
 * ── SEKMELER ──
 * Anahtarlar adreste görünür; kısa ve Türkçe okunur tutuldu.
 */
const SEKME_BILDIRIM = "bildirim";
const SEKME_ISLENMIS = "islenmis";
const SEKME_KIRILIM = "kirilim";
const SEKMELER = [SEKME_BILDIRIM, SEKME_ISLENMIS, SEKME_KIRILIM] as const;

/**
 * ── BİLDİRİM DURUM SÜZGECİ ──
 *
 * ⚠ VARSAYILAN "AÇIK" VE BU BİR DÜZELTME. Liste eskiden varsayılan olarak
 * HER ŞEYİ gösteriyordu ama başlığı "Bekleyen bildirimler"di; canlıda
 * rozet `0` derken altında 9 kapanmış kayıt duruyordu. Ekran artık
 * başlığının söylediği şeyi gösteriyor.
 */
const BILDIRIM_SUZGECLERI = ["acik", "kapali", "hepsi"] as const;
type BildirimSuzgeci = (typeof BILDIRIM_SUZGECLERI)[number];

/** Bildirim formundaki satış listesinin üst sınırı — dolarsa ekranda yazar. */
const SATIS_LISTE_SINIRI = 500;

function turGecerliMi(deger: string): deger is ReturnType {
  return (TURLER as string[]).includes(deger);
}

export default async function IadelerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    pencere?: string;
    baslangic?: string;
    bitis?: string;
    kanal?: string;
    tur?: string;
    hasar?: string;
    sayfa?: string;
    /** Bildirim araması — işlenmiş iade tablosunun süzgeçlerinden AYRI. */
    bq?: string;
    /** Panelden gelen "bekleyen bildirim" süzgeci — eski bağlantılar için. */
    bekleyen?: string;
    /** Açık sekme: bildirim | islenmis | kirilim. */
    sekme?: string;
    /** Bildirim durum süzgeci: acik | kapali | hepsi. */
    bdurum?: string;
  }>;
}) {
  await sayfaIzni("iade.gor");
  const karGorunur = await izinVarMi("satis.kar.gor");

  const p = await searchParams;
  const bicim = await bicimlendirici();
  const t = await getTranslations("Iadeler");
  const ortak = await getTranslations("Ortak");
  const tIade = await getTranslations("Iade");
  const turEtiketleri = await iadeTuruEtiketleri();

  // --- dönem penceresi ---
  const istenen = (p.pencere ?? "SON_30_GUN") as PencereTuru;
  const tur: PencereTuru = (LISTE_PENCERELERI as readonly string[]).includes(
    istenen,
  )
    ? istenen
    : "SON_30_GUN";

  let pencere;
  try {
    pencere = pencereOlustur(
      tur,
      new Date(),
      tur === "OZEL" && p.baslangic && p.bitis
        ? { baslangic: p.baslangic, bitis: p.bitis }
        : undefined,
    );
  } catch {
    pencere = pencereOlustur("SON_30_GUN", new Date());
  }

  const aralik = { gte: pencere.baslangic, lt: pencere.bitisHaric };

  const kanalKodu = (p.kanal ?? "").trim();
  const turFiltresi = (p.tur ?? "").trim();
  const hasarFiltresi = (p.hasar ?? "").trim();

  const kosul = {
    occurredAt: aralik,
    ...(kanalKodu
      ? { sale: { channelAccount: { channel: { code: kanalKodu } } } }
      : {}),
    ...(turGecerliMi(turFiltresi) ? { returnType: turFiltresi } : {}),
    ...(hasarFiltresi === "var" || hasarFiltresi === "talepsiz"
      ? { items: { some: { damagedQuantity: { gt: 0 } } } }
      : {}),
  };

  const toplamKayit = await prisma.return.count({ where: kosul });
  const sayfalama = sayfaCoz(p.sayfa, toplamKayit);

  const iadeler = await prisma.return.findMany({
    where: kosul,
    skip: sayfalama.atla,
    take: sayfalama.boyut,
    orderBy: { occurredAt: "desc" },
    include: {
      sale: {
        select: {
          id: true,
          code: true,
          channelAccount: {
            select: {
              name: true,
              channel: { select: { code: true, name: true } },
            },
          },
        },
      },
      user: { select: { name: true, email: true } },
      fees: { select: { code: true, amount: true } },
      items: {
        select: {
          quantity: true,
          soundQuantity: true,
          damagedQuantity: true,
          variantId: true,
          variant: {
            select: { sku: true, name: true, product: { select: { name: true } } },
          },
          compensations: { select: { quantity: true } },
        },
      },
    },
  });

  /** Ekran satırı + saf hesaba giden veri, tek yerden türetilir. */
  const satirlar = iadeler.map((i) => ({
    kayit: i,
    veri: iadeSatirVerisi(i, kalanTalepEdilebilirAdet),
  }));

  /**
   * ÖZET SAYFANIN DEĞİL, SÜZGECİN TAMAMININ TOPLAMIDIR (İlke #15).
   *
   * ⚠ DÜZELTME 17.08.2026: bu toplam `satirlar` üzerinden hesaplanıyordu ve
   * `satirlar` SAYFALANMIŞ listedir (sayfa boyutu 50). Yani "Dönem özeti"
   * başlıklı kart aslında görünen sayfanın özetiydi; 51'inci iadeden sonra
   * sessizce eksik rakam gösterirdi ve başlığı yanlışlığı gizlerdi.
   *
   * Sorgu DAR tutuldu: ekranın gösterdiği ürün adı / kullanıcı gibi alanlar
   * toplam için gerekmiyor.
   */
  const ozetKayitlari = await prisma.return.findMany({
    where: kosul,
    select: {
      id: true,
      returnType: true,
      net1Amount: true,
      net2Amount: true,
      penaltyAmount: true,
      profitCurrency: true,
      sale: {
        select: {
          channelAccount: {
            select: { channel: { select: { code: true, name: true } } },
          },
        },
      },
      fees: { select: { code: true, amount: true } },
      items: {
        select: {
          quantity: true,
          soundQuantity: true,
          damagedQuantity: true,
          compensations: { select: { quantity: true } },
        },
      },
    },
  });

  const toplamlar = iadeToplamlari(
    ozetKayitlari.map((i) => iadeSatirVerisi(i, kalanTalepEdilebilirAdet)),
  );

  /**
   * --- KANAL KIRILIMI: PENCEREDEKİ TÜM iadeler (sayfa değil) ---
   *
   * ÜÇ SORGU PEŞ PEŞE DEĞİL PARALEL. Ölçüldü 14.08.2026: bu sayfada 2 satır
   * dönen bir sorgu bile 133 ms sürüyordu — maliyet veriden değil GİDİŞ-
   * DÖNÜŞÜN KENDİSİNDEN geliyor. Birbirini beklemesi gerekmeyen sorguları
   * sırayla `await` etmek, gecikmeyi topluyordu.
   */
  const [tumIadeler, donemSatislari, hesapKanallari] = await Promise.all([
    prisma.return.findMany({
      where: { occurredAt: aralik },
      select: {
        net2Amount: true,
        penaltyAmount: true,
        profitCurrency: true,
        returnType: true,
        sale: {
          select: {
            channelAccount: {
              select: { channel: { select: { code: true, name: true } } },
            },
          },
        },
        items: {
          select: {
            quantity: true,
            soundQuantity: true,
            damagedQuantity: true,
            variantId: true,
            variant: {
              select: {
                sku: true,
                name: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    // Oranın paydası: AYNI dönemde yapılan satışlar (dönem oranı tanımı).
    prisma.sale.groupBy({
      by: ["channelAccountId"],
      // Oranın paydası GERÇEKLEŞEN satışlar: iptal edilen sipariş satılmadı.
      // Paydaya girseydi iade oranı olduğundan DÜŞÜK görünürdü.
      where: { soldAt: aralik, iptalTarihi: null },
      _count: { _all: true },
    }),
    prisma.channelAccount.findMany({
      select: { id: true, channel: { select: { code: true } } },
    }),
  ]);

  /** Kanal kırılımı dar sorgudan besleniyor; ondalık alanları sayıya çevirir. */
  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());

  const kirilimGirdisi: IadeSatirVerisi[] = tumIadeler.map((i) => ({
    iadeId: "",
    kanalKodu: i.sale.channelAccount.channel.code,
    kanalAdi: i.sale.channelAccount.channel.name,
    tur: i.returnType,
    adet: i.items.reduce((t2, k) => t2 + k.quantity, 0),
    saglamAdet: 0,
    hasarliAdet: 0,
    talepsizHasarAdet: 0,
    net1: null,
    net2: sayi(i.net2Amount),
    ceza: sayi(i.penaltyAmount) ?? 0,
    donenMaliyet: 0,
    donmeyenMaliyet: 0,
    kayipGelir: 0,
    paraBirimi: i.profitCurrency ?? "TRY",
  }));

  const hesapKanalKodu = new Map(
    hesapKanallari.map((h) => [h.id, h.channel.code]),
  );
  const satisAdetleri = new Map<string, number>();
  for (const g of donemSatislari) {
    const kod = hesapKanalKodu.get(g.channelAccountId);
    if (!kod) continue;
    satisAdetleri.set(kod, (satisAdetleri.get(kod) ?? 0) + g._count._all);
  }

  const kirilim = kanalKirilimi(kirilimGirdisi, satisAdetleri);

  const enCokIade = urunKirilimi(
    tumIadeler.flatMap((i) =>
      i.items.map((k) => ({
        variantId: k.variantId,
        sku: k.variant.sku,
        ad: k.variant.name
          ? `${k.variant.product.name} — ${k.variant.name}`
          : k.variant.product.name,
        adet: k.quantity,
        hasarliAdet: k.damagedQuantity,
      })),
    ),
  );

  /**
   * --- BİLDİRİMLER (AŞAMA A) ---
   *
   * KAPANMIŞLAR DA LİSTELENİR ama sonda: "geçen hafta o iade ne olmuştu?"
   * sorusunun cevabı ekranda kalmalı. Sıralama: açık olanlar önce, sonra
   * bildirim tarihine göre yeniden eskiye.
   */
  /**
   * BİLDİRİM ARAMASI — SUNUCUDA.
   *
   * Liste en yeni 50 ile sınırlı; istemcide süzmek yalnız o 50'yi süzerdi ve
   * 51. kayıt hiç bulunamazdı (aynı sessiz düşme tuzağı). Bu yüzden arama
   * sorgunun İÇİNDE.
   *
   * Talep no aranabilir olmalı: kullanıcı 14.08.2026'da bildirimi kodundan
   * (nbkhuj) aradı, arama kutusu olmadığı için bulamadı ve satış açılır
   * listesinde aradı — orada hiçbir zaman olmayacaktı, o bir satış kodu değil.
   */
  const bildirimArama = (p.bq ?? "").trim();
  /**
   * PANELDEN GELEN SÜZGEÇ: yalnız AÇIK bildirimler. Panelin sayısı bunları
   * sayıyor; bağlantı süzgeçsiz gelseydi liste kapanmışları da gösterir ve
   * "sayı = liste" sözü bozulurdu (15.08.2026).
   */
  /**
   * ⚠ PANELDEN GELEN ESKİ BAĞLANTI KIRILMADI. Panel `/iadeler?bekleyen=1`
   * diyor; varsayılan zaten "açık" olduğu için o bağlantı aynı sonucu
   * veriyor. Parametre yine de okunuyor: kullanıcı sonra "hepsi"ne basıp
   * geri gelirse `bdurum` kazanır, yani seçim adreste tek yerde yaşar.
   */
  const istenenDurum = p.bdurum ?? (p.bekleyen === "1" ? "acik" : "acik");
  const bDurum: BildirimSuzgeci = (
    BILDIRIM_SUZGECLERI as readonly string[]
  ).includes(istenenDurum)
    ? (istenenDurum as BildirimSuzgeci)
    : "acik";

  /**
   * ⚠ "KAPALI" DA AÇIK KÜMEDEN TÜRETİLİR (`notIn`). İkinci bir liste
   * yazılsaydı yeni bir durum eklendiğinde ikisi ayrışır ve bir bildirim
   * HİÇBİR süzgeçte görünmezdi — kaybolmanın en sessiz yolu.
   */
  const bildirimKosulu = {
    ...bildirimAramaKosulu(bildirimArama),
    ...(bDurum === "acik"
      ? { status: { in: ACIK_BILDIRIM_DURUMLARI } }
      : bDurum === "kapali"
        ? { status: { notIn: ACIK_BILDIRIM_DURUMLARI } }
        : {}),
  };

  const sekme: string = (SEKMELER as readonly string[]).includes(p.sekme ?? "")
    ? (p.sekme as string)
    : SEKME_BILDIRIM;

  const bildirimKayitlari = await prisma.returnNotice.findMany({
    where: bildirimKosulu,
    orderBy: [{ noticedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      code: true,
      noticedAt: true,
      reason: true,
      status: true,
      /* K31 ① — son tarih sayacı bu iki sütundan okunur. */
      otomatikOnayTarihi: true,
      islemSonTarihi: true,
      /* K31 ④ — ret gerekçesi ve analiz sonucu. */
      itirazGerekcesi: true,
      analizSonucu: true,
      /* K31 ② — kargolanacak kutusu bu alandan türetiliyor. */
      iadeKargoKodu: true,
      note: true,
      reservedQuantity: true,
      returnId: true,
      returnedVariant: {
        select: { sku: true, product: { select: { name: true } } },
      },
      reservedVariant: {
        select: { sku: true, product: { select: { name: true } } },
      },
      sale: {
        select: {
          id: true,
          code: true,
          channelAccount: {
            select: { name: true, channel: { select: { name: true } } },
          },
        },
      },
    },
  });

  /**
   * SON TARİH SAYAÇLARI — TEK YERDE HESAPLANIR (K31 ①).
   *
   * ⚠ "ŞU AN" TEK KEZ ALINIR ve bütün satırlara aynı an verilir. Her satır
   * kendi `new Date()`ini çağırsaydı, listenin başındaki ile sonundaki kayıt
   * teorik olarak farklı güne düşebilirdi — ve gece yarısını geçen bir
   * koşumda "1 gün kaldı" ile "bugün doluyor" aynı listede yan yana çıkardı.
   */
  const bugunAn = new Date();
  const sayaclar = new Map<string, SayacGorunumu | null>(
    bildirimKayitlari.map((b) => [b.id, sayacGorunumu(b, bugunAn)]),
  );

  /**
   * BEKLEYEN SAYACI ARAMADAN BAĞIMSIZ. Eskiden ekrandaki 50 kaydın içinden
   * sayılıyordu; arama açıkken "3 bekleyen" rozeti aramanın sonucunu
   * gösterirdi ve rakam yalan olurdu. Rozet her zaman TÜM açık bildirimleri
   * sayar.
   */
  const [bekleyenBildirimler, bildirimToplami] = await Promise.all([
    prisma.returnNotice.count({
      where: { status: { in: ACIK_BILDIRIM_DURUMLARI } },
    }),
    /** Aramaya uyan toplam — 50'lik pencerenin dışında kalan var mı. */
    prisma.returnNotice.count({ where: bildirimKosulu }),
  ]);

  /**
   * EKLER — bildirim başına, TEK SORGUDA. Satır satır sorgu atmak 50
   * bildirimde 50 gidiş-geliş demekti.
   */
  const ekKayitlari = await prisma.attachment.findMany({
    where: {
      targetType: "ReturnNotice",
      targetId: { in: bildirimKayitlari.map((b) => b.id) },
    },
    orderBy: { uploadedAt: "asc" },
    select: {
      id: true,
      targetId: true,
      fileName: true,
      sizeBytes: true,
      blobPath: true,
    },
  });
  const eklerHaritasi = new Map<string, typeof ekKayitlari>();
  for (const e of ekKayitlari) {
    const liste = eklerHaritasi.get(e.targetId) ?? [];
    liste.push(e);
    eklerHaritasi.set(e.targetId, liste);
  }
  /**
   * SINIR METNİ SAYFADA ÜRETİLİR, action olarak DEĞİL: sunucu action'ı
   * dışarıdan çağrılabilir bir uçtur ve yetki ister (yetki:dogrula bunu
   * yakaladı). Metin üretmek için uç açmak gereksiz yüzey demekti.
   */
  const tEkler = await getTranslations("Ekler");
  const ekSinirlari = tEkler("sinirlar", {
    mb: EK_SINIRLARI.enFazlaBayt / (1024 * 1024),
    adet: EK_SINIRLARI.enFazlaEk,
  });

  // Form seçenekleri ve süzgeç kanalları — hepsi bağımsız, hepsi PARALEL.
  const [kanallar, formSatislari, formVaryantlari] = await Promise.all([
    prisma.channel.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { name: "asc" },
    }),
    /**
     * SATIŞ LİSTESİ — sınır 500. Tamamını yüklemek uzun vadede ağır (günde
     * ~30 satış), ama 100 fazla dardı. Sınıra dayanırsa ekran bunu SÖYLER;
     * sessizce kesilen liste kabul edilmiyor.
     */
    prisma.sale.findMany({
      // İptal edilmiş satışa iade işlenemez (lib/iade.ts) — listede de
      // görünmemeli, yoksa seçilip hata alınır.
      where: { iptalTarihi: null },
      orderBy: { soldAt: "desc" },
      take: SATIS_LISTE_SINIRI,
      select: {
        id: true,
        code: true,
        soldAt: true,
        channelAccount: {
          select: { name: true, channel: { select: { name: true } } },
        },
      },
    }),
    /**
     * FORM VARYANTLARI — `take` KALDIRILDI.
     *
     * Eskiden 500 ile sınırlıydı ve düz açılır listede gösteriliyordu:
     * 1055 üründen 500'ü listelenip gerisi SESSİZCE düşüyordu (aradığı
     * ürünü bulamayan kullanıcı onun kayıtlı olmadığını sanardı). Artık
     * liste aranabilir seçicide çiziliyor, tamamı geliyor.
     */
    prisma.productVariant.findMany({
      where: { isActive: true },
      orderBy: { sku: "asc" },
      select: { id: true, sku: true, product: { select: { name: true } } },
    }),
  ]);

  /**
   * AYRILAN ürün listesi için STOK gerekiyor: gönderilemeyecek mal
   * ayrılamaz (kullanıcı 14.08.2026'da stoğu 0 olan ürünü ayırdı).
   * Tek sorguda bütün varyantların stoğu — varyant başına sorgu atmıyoruz.
   */
  const formStoklari = await varyantStoklari(formVaryantlari.map((v) => v.id));

  const gerekceEtiketleri = await iadeGerekceEtiketleri();

  /**
   * RET GEREKÇESİ (8) ve ANALİZ SONUCU (3) — K31 ④.
   *
   * ⚠ LİSTE SUNUCUDA KURULUR VE SIRASI KAYNAKTAN GELİR (`ITIRAZ_GEREKCELERI`,
   * `ANALIZ_SONUCLARI` — ikisi de exhaustive `Record`tan türüyor). İstemciye
   * elle yazılmış bir dizi geçseydi, sunucunun kabul ettiği kümeyle
   * ayrışabilirdi; 23.08.2026'da iade gerekçelerinde tam bu oldu ve kayıt
   * sessizce düşüyordu.
   */
  /**
   * KARGOLANACAK VE ASKIDAKİ KAYITLAR — AYRI SORGU, LİSTEDEN BAĞIMSIZ.
   *
   * ⚠ EKRANDAKİ 50 KAYDIN İÇİNDEN SÜZÜLMÜYOR. Liste en yeni 50 ile sınırlı
   * ve arama/süzgeç uygulanmış; kutuyu ondan türetseydik 51. sıradaki bir
   * "kargolanması gereken" iade SESSİZCE görünmezdi — ve tam da görünmesi
   * gereken şey odur. (Bekleyen sayacında aynı tuzak 15.08'de yaşanmıştı.)
   */
  const kargoVeAski = await prisma.returnNotice.findMany({
    where: { status: { in: ["ITIRAZ_KABUL", "ASKIDA"] } },
    orderBy: { noticedAt: "asc" },
    select: {
      id: true,
      status: true,
      iadeKargoKodu: true,
      sale: { select: { code: true } },
      returnedVariant: { select: { product: { select: { name: true } } } },
      reservedVariant: { select: { product: { select: { name: true } } } },
    },
  });

  const urunAdi = (k: (typeof kargoVeAski)[number]) =>
    k.returnedVariant?.product.name ??
    k.reservedVariant?.product.name ??
    t("urunBelirtilmemis");

  const kargolanacaklar: KargolanacakSatir[] = kargoVeAski
    .map((k) => {
      const durum = kargolamaDurumu(k);
      return durum
        ? {
            bildirimId: k.id,
            siparisNo: k.sale.code,
            urun: urunAdi(k),
            kargoKodu: k.iadeKargoKodu,
            durum,
          }
        : null;
    })
    .filter((x): x is KargolanacakSatir => x !== null);

  const askidakiler: AskidaSatir[] = kargoVeAski
    .filter((k) => askidaMi(k.status))
    .map((k) => ({
      bildirimId: k.id,
      siparisNo: k.sale.code,
      urun: urunAdi(k),
    }));

  const itirazEtiketleri = await itirazGerekceEtiketleri();
  const analizEtiketleri = await analizSonucuEtiketleri();
  const itirazSecenekleri = ITIRAZ_GEREKCELERI.map((g) => ({
    deger: g,
    etiket: itirazEtiketleri[g],
  }));
  const analizSecenekleri = ANALIZ_SONUCLARI.map((a) => ({
    deger: a,
    etiket: analizEtiketleri[a],
  }));
  const durumEtiketleri = await bildirimDurumEtiketleri();
  const gecisEtiketleri = await bildirimGecisEtiketleri();
  const siradakiAdimlar = await bildirimSiradakiAdim();
  const tBildirim = await getTranslations("Bildirim2");

  /**
   * KAPALI GEÇİŞİN SEBEBİ — mimar kuralı: pasif düğme sebepsiz kalmaz.
   * Metin sözlükten gelir; iki vaka bilerek adıyla anlatılıyor çünkü
   * kullanıcının en çok takıldığı yer bunlar.
   */
  function iadeIsleSebebi(durum: NoticeStatus): string {
    const anahtar = IADE_ISLE_SEBEP_ANAHTARI[durum];
    // Açık durumda sebep sorulmaz; çağıran taraf zaten düğmeyi açık çiziyor.
    return anahtar ? tBildirim(anahtar) : "";
  }

  const suzgecler: SuzgecTanimi[] = [
    {
      ad: "kanal",
      etiket: ortak("kanal"),
      secenekler: kanallar.map((k) => ({ deger: k.code, etiket: k.name })),
    },
    {
      ad: "tur",
      etiket: t("turSuzgeci"),
      secenekler: TURLER.map((x) => ({ deger: x, etiket: turEtiketleri[x] })),
    },
    {
      ad: "hasar",
      etiket: t("hasarSuzgeci"),
      secenekler: [
        { deger: "var", etiket: t("hasarVar") },
        { deger: "talepsiz", etiket: t("hasarTalepsiz") },
      ],
    },
  ];

  const aralikMetni = `${bicim.tarih(pencere.baslangic)} — ${bicim.tarih(pencere.sonGun)}`;

  // Ekrandaki süzgeç Excel'e AYNEN gider.
  const disaAktarmaParametreleri = {
    pencere: tur,
    baslangic: p.baslangic,
    bitis: p.bitis,
    kanal: kanalKodu,
    tur: turFiltresi,
    hasar: hasarFiltresi,
  };

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  SEKMELER — ÜÇ AYRI SORU, ÜÇ AYRI EKRAN
   * ----------------------------------------------------------------------
   *  Kullanıcı 22.08.2026: _"iadeler sayfası çok karışık."_ Ölçüm sebebi
   *  gösterdi — sayfa altı bloğu üst üste diziyordu ve İKİ FARKLI ZİHİN
   *  MODELİ iç içeydi:
   *
   *    · İŞ AKIŞI  — "şu an ne yapmalıyım" (bildirimler)
   *    · ARŞİV     — "geçen ay ne oldu" (işlenmiş iadeler, kırılım)
   *
   *  ⚠ EN BÜYÜK KARIŞIKLIK BAŞLIK İLE İÇERİĞİN ÇELİŞMESİYDİ. Kart
   *  "Bekleyen bildirimler" diyor, rozeti açık olanları sayıyordu; ama
   *  altındaki liste BÜTÜN bildirimleri gösteriyordu. Canlıda ölçüldü:
   *  rozet `0`, liste 9 KAPANMIŞ kayıt. Ekranın en görünür bloğu, bitmiş
   *  işi bekleyen iş gibi gösteriyordu. Artık liste süzgece uyuyor.
   *
   *  ⚠ SÜZGEÇ, YALNIZ ETKİLEDİĞİ SEKMEDE DURUYOR. Eskiden dönem süzgeci
   *  bildirimlerin ALTINDAydı ama onları süzmüyordu: dönem değiştirilince
   *  üstteki liste kıpırdamıyor, sistem kullanıcıyı dinlemiyormuş gibi
   *  görünüyordu.
   *
   *  Seçim ADRESTE yaşıyor (bkz. sekmeli-bolum.tsx): geri tuşu çalışır,
   *  bağlantı paylaşılabilir.
   * ══════════════════════════════════════════════════════════════════════
   */
  const sekmeAdresi = (anahtar: string) =>
    // Sekme değişince sayfa numarası sıfırlanır: 3. sayfadayken başka
    // sekmeye geçip boş liste görmek, "veri kayboldu" sanılır.
    suzgecAdresi("/iadeler", p, { sekme: anahtar, sayfa: "" });

  const durumAdresi = (deger: BildirimSuzgeci) =>
    suzgecAdresi("/iadeler", p, { sekme: SEKME_BILDIRIM, bdurum: deger });

  /**
   * BOŞ LİSTE NEDEN BOŞ — süzgece göre değişir (İlke #5: sessiz
   * başarısızlık yok, NEDEN olmadığı ekranda yazar). Tek bir "bildirim
   * yok" cümlesi, "kapanmış" süzgecindeyken yalan söylerdi.
   */
  const bosBildirimMetni =
    bDurum === "kapali"
      ? t("kapanmisBildirimYok")
      : bDurum === "hepsi"
        ? t("hicBildirimYok")
        : t("bildirimYok");

  const durumEtiketi: Record<BildirimSuzgeci, string> = {
    acik: t("durumAcik"),
    kapali: t("durumKapanmis"),
    hepsi: t("durumHepsi"),
  };

  const bildirimIcerigi = (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t("bildirimNotu")}</p>

      {/*
        KARGOLANACAK + ASKIDA (K31 ② ve ③). Fiziksel iş ve arıza kutusu
        listenin ÜSTÜNDE: ikisi de "şimdi ne yapmalıyım" sorusunun cevabı ve
        elli satırın altında kalırlarsa hiç görülmezler.
      */}
      <KargolanacakKutusu
        satirlar={kargolanacaklar}
        askidakiler={askidakiler}
      />

      {/* DURUM SÜZGECİ — uygulamanın her yerindeki süzgeç düğmesiyle AYNI
          görünüm (İlke #10). Bağlantı, düğme değil: seçim adreste yaşar. */}
      <div className="flex flex-wrap gap-1">
        {BILDIRIM_SUZGECLERI.map((d) => (
          <Button
            key={d}
            asChild
            size="sm"
            variant={d === bDurum ? "default" : "outline"}
            className="h-11 md:h-8"
          >
            <Link
              href={durumAdresi(d)}
              scroll={false}
              aria-current={d === bDurum ? "true" : undefined}
            >
              {durumEtiketi[d]}
            </Link>
          </Button>
        ))}
      </div>

      {/*
        ⚠ FORM KATLANDI, KALDIRILMADI. Eskiden altı alanıyla hep açıktı ve
        asıl işi — bekleyenleri görmeyi — ekranın altına itiyordu. Kayıt
        günde birkaç kez yapılır, liste her açılışta okunur; yer, çok
        okunanın hakkı.
      */}
      <KatlanirBolum baslik={t("yeniBildirim")}>
            <BildirimFormu
              satislar={formSatislari.map((s) => ({
                id: s.id,
                etiket: `${s.code ?? tBildirim("siparisNoYok")} · ${bicim.tarih(s.soldAt)} · ${s.channelAccount.channel.name} — ${s.channelAccount.name}`,
              }))}
              satisSiniriDoldu={formSatislari.length === SATIS_LISTE_SINIRI}
              /**
               * İKİ LİSTE, İKİ KURAL (bkz. bildirim-formu.tsx başlığı):
               *   ayrılan → gönderilecek yedek, STOKTA OLMALI
               *   dönen   → yanlışlıkla gitmiş mal, stok 0 olabilir
               */
              stoktakiVaryantlar={formVaryantlari
                .filter((v) => (formStoklari.get(v.id) ?? 0) > 0)
                .map((v) => ({
                  id: v.id,
                  etiket: `${v.product.name} (${v.sku})`,
                  stokMetni: tBildirim("stokMetni", {
                    sayi: formStoklari.get(v.id) ?? 0,
                  }),
                }))}
              tumVaryantlar={formVaryantlari.map((v) => ({
                id: v.id,
                etiket: `${v.product.name} (${v.sku})`,
                stokMetni: tBildirim("stokMetni", {
                  sayi: formStoklari.get(v.id) ?? 0,
                }),
              }))}
              degisimGerekceleri={[...DEGISIM_GEREKCELERI]}
              gerekceEtiketleri={gerekceEtiketleri}
              bugun={gunMetni(gunDegeri(isTakvimGunu(new Date())))}
            />
      </KatlanirBolum>

          {/* ==================== BİLDİRİM ARAMASI ====================
              Sunucuda arar (bkz. sorgu). Diğer süzgeçler gizli alanlarla
              taşınır; arama yapmak dönem penceresini sıfırlamaz. */}
          {/* ⚠ TALEP NO DA BİR KODDUR — kamera burada da olmalı (İlke #7).
                Sekme ve durum süzgeci `tasinanlar` ile korunuyor; eskiden
                gizli alanlarla taşınıyordu. */}
          <KodAramaKutusu
            temelAdres="/iadeler"
            baslangic={bildirimArama}
            parametre="bq"
            tasinanlar={{
              ...disaAktarmaParametreleri,
              sekme: SEKME_BILDIRIM,
              bdurum: bDurum,
            }}
            ipucu={tBildirim("aramaIpucu")}
          />

          {bildirimArama ? (
            <p className="text-muted-foreground text-xs">
              {ortak("kayitSayisi", { sayi: bildirimToplami })}
              {ortak("aramaEki", { arama: bildirimArama })}
            </p>
          ) : null}
          {bildirimKayitlari.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {bildirimArama ? tBildirim("aramaSonucYok") : bosBildirimMetni}
            </p>
          ) : (
            <div className="space-y-3">
              {bildirimKayitlari.map((b) => (
                <div key={b.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Baglanti href={`/satislar/${b.sale.id}`}>
                      {b.sale.code ?? tBildirim("siparisNoYok")}
                    </Baglanti>
                    <Badge variant="outline">{gerekceEtiketleri[b.reason]}</Badge>
                    {/* Durum akışı renk sisteminden: kapandı/kabul yeşil,
                        mal geldi mavi, bekleyen ve itiraz amber, red kırmızı,
                        iptal nötr (bkz. lib/durum-renkleri.ts). */}
                    <DurumRozeti durum={BILDIRIM_DURUM_RENGI[b.status]} isaretsiz>
                      {durumEtiketleri[b.status]}
                    </DurumRozeti>
                    <span className="text-muted-foreground text-xs">
                      {bicim.tarih(b.noticedAt)}
                    </span>
                    {/* TALEP NO BİR KİMLİK KODUDUR (İlke #3 ve #4): listede
                        GÖRÜNÜR durur ve tek tıkla kopyalanır. Eskiden tarihin
                        arkasında gri bir ek gibiydi; kullanıcı aradığı
                        bildirimi bu yüzden gözden kaçırdı. */}
                    {b.code ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        {tBildirim("talepNoKisa")}: {b.code}
                        <KopyalanabilirKod
                          deger={b.code}
                          etiket={tBildirim("talepNoKisa")}
                          sadeceIkon
                        />
                      </span>
                    ) : null}
                    {/* AYRILMIŞ ÜRÜN ROZETİ: stoğa dokunmaz, niyet beyanıdır. */}
                    {b.reservedVariant && b.reservedQuantity > 0 ? (
                      <Badge
                        variant="outline"
                        className={`${DURUM_YAZISI.uyari} border-current/40`}
                      >
                        {tBildirim("ayrilanRozeti", {
                          urun: b.reservedVariant.sku,
                          sayi: b.reservedQuantity,
                        })}
                      </Badge>
                    ) : null}
                    {b.returnId ? (
                      <Baglanti href={`/satislar/${b.sale.id}`}>
                        {tBildirim("iadeIslendi")}
                      </Baglanti>
                    ) : null}
                  </div>

                  {b.note ? (
                    <p className="text-muted-foreground text-xs">{b.note}</p>
                  ) : null}

                  {/* İTİRAZ DALINDA EKLER: kanıt dosyaları itiraz açıldıktan
                      itibaren duruyor. İtiraz yoksa bölüm gösterilmiyor —
                      her bildirime dosya kutusu koymak ekranı doldururdu. */}
                  {["ITIRAZ_ACILDI", "ITIRAZ_INCELEMEDE", "ITIRAZ_KABUL", "ITIRAZ_RED"].includes(
                    b.status,
                  ) ? (
                    <Ekler
                      hedefTipi="ReturnNotice"
                      hedefId={b.id}
                      ekler={eklerHaritasi.get(b.id) ?? []}
                      sinirMetni={ekSinirlari}
                    />
                  ) : null}

                  {/* SIRADAKİ ADIM — "şimdi ne yapmalıyım" kayıtta yazar.
                      Sebep (neden basamıyorum) ile yönlendirme (ne yapmalıyım)
                      ayrı iki şeydir; ikincisi eksikti. */}
                  <p className="text-muted-foreground text-xs">
                    {siradakiAdimlar[b.status]}
                  </p>

                  {/*
                    RET GEREKÇESİ VE ANALİZ SONUCU (K31 ④).

                    ⚠ YAZILIP GÖRÜNMEYEN ALAN, YAZILMAMIŞ GİBİDİR. Bu iki
                    sütun K31 migration'ında açıldı ve 23.08'e kadar ÖLÜ
                    durdu: sıfır okuyucu, sıfır yazıcı. Kaydediliyor olması
                    yetmez — kullanıcı üç ay sonra "bu iadeyi hangi
                    gerekçeyle reddetmiştim" diye sorduğunda cevabı EKRANDA
                    bulmalı.
                  */}
                  {b.itirazGerekcesi || b.analizSonucu ? (
                    <p className="text-muted-foreground text-xs">
                      {b.itirazGerekcesi
                        ? tBildirim("itirazGerekcesiRozet", {
                            gerekce: itirazEtiketleri[b.itirazGerekcesi],
                          })
                        : null}
                      {b.itirazGerekcesi && b.analizSonucu ? " · " : null}
                      {b.analizSonucu
                        ? tBildirim("analizSonucuRozet", {
                            sonuc: analizEtiketleri[b.analizSonucu],
                          })
                        : null}
                    </p>
                  ) : null}

                  {/*
                    SON TARİH SAYACI (K31 ①). Her bildirimde AYNI ANDA TEK bir
                    saat işler ve hangisi olduğunu durum söyler. Sayaç yoksa
                    hiç çizilmez — "saat işlemiyor" ile "süre bitti" aynı şey
                    değildir ve boş bir satır ikincisi gibi okunurdu.
                  */}
                  {sayaclar.get(b.id) ? (
                    <SayacRozeti sayac={sayaclar.get(b.id)!} />
                  ) : null}

                  <BildirimDurumu
                    bildirimId={b.id}
                    mevcutDurum={b.status}
                    itirazGerekceleri={itirazSecenekleri}
                    analizSonuclari={analizSecenekleri}
                    iadeIsle={{
                      acik: iadeIslenebilirMi(b.status) && b.returnId === null,
                      /**
                       * ÖN-DOLU GEÇİŞ: bildirimin kimliği adreste taşınıyor;
                       * iade formu gerekçeyi ve YANLIS_URUN'da dönen varyantı
                       * oradan okuyup hazır getiriyor.
                       */
                      adres: `/satislar/${b.sale.id}/iade?bildirim=${b.id}`,
                      sebep: iadeIsleSebebi(b.status),
                      etiket: tBildirim("iadeyiIsle"),
                    }}
                    secenekler={BILDIRIM_DURUMLARI.filter(
                      (hedef) => hedef !== b.status,
                    )
                      .filter((hedef) =>
                        // Yalnız anlamlı hedefler: izinli olanlar + iki
                        // öğretici kapalı örnek (kullanıcı neden basamadığını
                        // görsün) ekranı doldurmasın diye izinliler yeter.
                        gecisGecerliMi(b.status, hedef),
                      )
                      .map((hedef) => ({
                        hedef,
                        // DURUM ADI DEĞİL EYLEM ADI: "Mal geldi" bir rozet
                        // gibi okunuyordu, "Mal geldi olarak işaretle"
                        // basılacak bir şey olduğunu söylüyor.
                        etiket: gecisEtiketleri[hedef],
                        acik: true,
                      }))}
                  />
                </div>
              ))}
            </div>
          )}
    </div>
  );

  const islenmisIcerigi = (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">{t("islenmisNotu")}</p>
      <SuzgecCubugu
        temelAdres="/iadeler"
        mevcut={p}
        suzgecler={suzgecler}
        zaman={{
          secili: tur,
          aralikMetni,
          baslangic: p.baslangic ?? gunMetni(pencere.baslangic),
          bitis: p.bitis ?? gunMetni(pencere.sonGun),
        }}
      />
      {/* ========================= ÜST ŞERİT ========================= */}
      {/* ⚠ KART İÇİNDE KART YOK. Bu blok artık sekme kartının İÇİNDE
          çiziliyor; ayrıca <Card> sarılsaydı iç içe iki çerçeve olur ve
          22.08.2026'da belirginleştirilen kenarlıklar üst üste binerdi. */}
      {toplamlar.map((toplam) => (
        <section key={toplam.paraBirimi} className="space-y-3">
          <h3 className="text-sm font-semibold">
            {t("donemOzeti")} · {toplam.paraBirimi}
          </h3>
          <div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Ozet etiket={t("iadeAdedi")} deger={String(toplam.iadeAdedi)} />
              <Ozet etiket={t("urunAdedi")} deger={String(toplam.urunAdedi)} />
              {karGorunur ? (
                <>
                  <Ozet
                    etiket={t("kayipGelir")}
                    deger={bicim.para(toplam.kayipGelir, toplam.paraBirimi)}
                  />
                  <Ozet
                    etiket={t("toplamEtki")}
                    deger={bicim.para(toplam.toplamEtki2, toplam.paraBirimi)}
                  />
                  <Ozet
                    etiket={t("cezaToplami")}
                    deger={bicim.para(toplam.cezaToplami, toplam.paraBirimi)}
                  />
                  <Ozet
                    etiket={t("donenMaliyet")}
                    deger={bicim.para(toplam.donenMaliyet, toplam.paraBirimi)}
                  />
                  <Ozet
                    etiket={t("donmeyenMaliyet")}
                    deger={bicim.para(toplam.donmeyenMaliyet, toplam.paraBirimi)}
                    aciklama={t("donmeyenMaliyetNotu")}
                  />
                </>
              ) : null}
              {toplam.talepsizHasarAdet > 0 ? (
                <Ozet
                  etiket={t("talepsizHasar")}
                  deger={String(toplam.talepsizHasarAdet)}
                  uyari
                />
              ) : null}
            </div>
          </div>
        </section>
      ))}

      {/* ======================= İŞLENMİŞ İADELER ======================= */}
      {satirlar.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          {t("bosListe")}
        </p>
      ) : (
        <>
          {/* --- masaüstü --- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("tarih")}</TableHead>
                  <TableHead>{ortak("siparisNo")}</TableHead>
                  <TableHead>{ortak("kanalHesabi")}</TableHead>
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead>{t("turSuzgeci")}</TableHead>
                  <TableHead className="text-right">{ortak("adet")}</TableHead>
                  {karGorunur ? (
                    <>
                      <TableHead className="text-right">
                        {t("etkiNet2")}
                      </TableHead>
                      <TableHead className="text-right">{t("ceza")}</TableHead>
                    </>
                  ) : null}
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {satirlar.map(({ kayit, veri }) => (
                  <TableRow key={kayit.id}>
                    <TableCell className="whitespace-nowrap">
                      {bicim.tarih(kayit.occurredAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Baglanti href={`/satislar/${kayit.sale.id}`}>
                          {kayit.sale.code ?? "—"}
                        </Baglanti>
                        {kayit.sale.code ? (
                          <KopyalanabilirKod
                            deger={kayit.sale.code}
                            etiket={ortak("siparisNo")}
                            sadeceIkon
                          />
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {kayit.sale.channelAccount.channel.name} —{" "}
                      {kayit.sale.channelAccount.name}
                    </TableCell>
                    <TableCell>
                      <UzunAd
                        metin={kayit.items
                          .map((k) =>
                            k.variant.name
                              ? `${k.variant.product.name} — ${k.variant.name}`
                              : k.variant.product.name,
                          )
                          .join(", ")}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {turEtiketleri[kayit.returnType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {veri.adet}
                      <AdetRozetleri
                        saglam={veri.saglamAdet}
                        hasarli={veri.hasarliAdet}
                        talepsiz={veri.talepsizHasarAdet}
                        saglamEtiket={tIade("saglamAdet")}
                        hasarliEtiket={tIade("hasarliAdet")}
                        talepsizEtiket={t("talepsizKisa")}
                      />
                    </TableCell>
                    {karGorunur ? (
                      <>
                        <TableCell className="text-right whitespace-nowrap">
                          {veri.net2 === null
                            ? "—"
                            : bicim.para(veri.net2, veri.paraBirimi)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {veri.ceza === 0
                            ? "—"
                            : bicim.para(veri.ceza, veri.paraBirimi)}
                        </TableCell>
                      </>
                    ) : null}
                    <TableCell>
                      <SatirEylemleri>
                        <SatirEylemi
                          href={`/satislar/${kayit.sale.id}`}
                          ikon={Eye}
                          etiket={ortak("detay")}
                        />
                      </SatirEylemleri>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* --- telefon --- */}
          <div className="space-y-3 md:hidden">
            {satirlar.map(({ kayit, veri }) => (
              <ListeKarti
                key={kayit.id}
                baslik={
                  <span className="inline-flex items-center gap-1">
                    <Baglanti href={`/satislar/${kayit.sale.id}`}>
                      {kayit.sale.code ?? "—"}
                    </Baglanti>
                    {kayit.sale.code ? (
                      <KopyalanabilirKod
                        deger={kayit.sale.code}
                        etiket={ortak("siparisNo")}
                        sadeceIkon
                      />
                    ) : null}
                  </span>
                }
                alanlar={[
                  { etiket: ortak("tarih"), deger: bicim.tarih(kayit.occurredAt) },
                  {
                    etiket: ortak("kanalHesabi"),
                    deger: `${kayit.sale.channelAccount.channel.name} — ${kayit.sale.channelAccount.name}`,
                  },
                  {
                    etiket: t("turSuzgeci"),
                    deger: turEtiketleri[kayit.returnType],
                  },
                  {
                    etiket: ortak("adet"),
                    deger: (
                      <span>
                        {veri.adet}
                        <AdetRozetleri
                          saglam={veri.saglamAdet}
                          hasarli={veri.hasarliAdet}
                          talepsiz={veri.talepsizHasarAdet}
                          saglamEtiket={tIade("saglamAdet")}
                          hasarliEtiket={tIade("hasarliAdet")}
                          talepsizEtiket={t("talepsizKisa")}
                        />
                      </span>
                    ),
                  },
                  ...(karGorunur
                    ? [
                        {
                          etiket: t("etkiNet2"),
                          deger:
                            veri.net2 === null
                              ? "—"
                              : bicim.para(veri.net2, veri.paraBirimi),
                        },
                      ]
                    : []),
                ]}
                eylemler={
                  <SatirEylemi
                    href={`/satislar/${kayit.sale.id}`}
                    ikon={Eye}
                    etiket={ortak("detay")}
                  />
                }
              />
            ))}
          </div>

          <SayfalamaCubugu
            sayfalama={sayfalama}
            yol="/iadeler"
            parametreler={disaAktarmaParametreleri}
          />
        </>
      )}
    </div>
  );

  const kirilimIcerigi = (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">{t("kirilimNotu")}</p>
      <SuzgecCubugu
        temelAdres="/iadeler"
        mevcut={p}
        suzgecler={suzgecler}
        zaman={{
          secili: tur,
          aralikMetni,
          baslangic: p.baslangic ?? gunMetni(pencere.baslangic),
          bitis: p.bitis ?? gunMetni(pencere.sonGun),
        }}
      />
      {kirilim.length === 0 && enCokIade.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {t("kirilimBos")}
        </p>
      ) : null}
      {/* ====================== PAZARYERİ KIRILIMI ====================== */}
      {kirilim.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("kanalKirilimi")}</h3>
          <p className="text-muted-foreground text-sm">{t("oranTanimi")}</p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("kanal")}</TableHead>
                  <TableHead className="text-right">{t("iadeAdedi")}</TableHead>
                  <TableHead className="text-right">
                    {t("donemSatisi")}
                  </TableHead>
                  <TableHead className="text-right">{t("iadeOrani")}</TableHead>
                  {karGorunur ? (
                    <>
                      <TableHead className="text-right">
                        {t("toplamEtki")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("ortalamaEtki")}
                      </TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {kirilim.map((k) => (
                  <TableRow key={k.kanalKodu}>
                    <TableCell className="font-medium">{k.kanalAdi}</TableCell>
                    <TableCell className="text-right">{k.iadeAdedi}</TableCell>
                    <TableCell className="text-right">{k.satisAdedi}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {/* Satış yoksa oran YOK — sıfır göstermek yalan olurdu. */}
                      {k.oran === null ? (
                        <span className="text-muted-foreground">
                          {t("oranYok")}
                        </span>
                      ) : (
                        bicim.yuzde(k.oran * 100)
                      )}
                    </TableCell>
                    {karGorunur ? (
                      <>
                        <TableCell className="text-right whitespace-nowrap">
                          {bicim.para(k.toplamEtki2, k.paraBirimi)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {k.ortalamaEtki === null
                            ? "—"
                            : bicim.para(k.ortalamaEtki, k.paraBirimi)}
                        </TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}
      {/* ==================== EN ÇOK İADE EDİLENLER ==================== */}
      {enCokIade.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("iadeEdilenUrunler")}</h3>
          <p className="text-muted-foreground text-sm">{t("enCokIadeNotu")}</p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead>{ortak("sku")}</TableHead>
                  <TableHead className="text-right">{t("iadeAdedi")}</TableHead>
                  <TableHead className="text-right">
                    {tIade("hasarliAdet")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enCokIade.map((u) => (
                  <TableRow key={u.variantId}>
                    <TableCell>
                      <UzunAd metin={u.ad} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        {u.sku}
                        <KopyalanabilirKod
                          deger={u.sku}
                          etiket={ortak("sku")}
                          sadeceIkon
                        />
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{u.iadeAdedi}</TableCell>
                    <TableCell className="text-right">
                      {u.hasarliAdet > 0 ? (
                        <span className={`${DURUM_YAZISI.uyari}`}>
                          {u.hasarliAdet}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      {/*
        ⚠ SAYI VE EXCEL BAŞLIKTAN İNDİ — ÇÜNKÜ İKİSİ DE TEK SEKMEYE AİT.
        Başlıkta "N kayıt · 01.08 — 31.08" yazıyordu ve bu YALNIZ işlenmiş
        iadelerin sayısıydı; bildirimler sekmesinde bakan biri onu ekrandaki
        listenin sayısı sanardı. Düzeltmeye çalıştığımız hatanın (başlık
        içerikle çelişiyor) küçük kardeşiydi. Sayılar artık sekme
        etiketlerinde, dönem ise süzgeç çubuğunda yazıyor.
      */}
      <h1 className="text-2xl font-semibold">{t("baslik")}</h1>

      <SekmeliBolum
        secili={sekme}
        /* Excel çıktısı İŞLENMİŞ iadeleri ve o sekmenin süzgecini taşır;
           başka sekmedeyken göstermek, farklı bir şeyi indireceği izlenimi
           verirdi. */
        ustEylem={
          sekme === SEKME_ISLENMIS ? (
            <ExcelIndir
              liste="iadeler"
              parametreler={disaAktarmaParametreleri}
            />
          ) : undefined
        }
        sekmeler={[
          {
            anahtar: SEKME_BILDIRIM,
            /* ⚠ SAYAÇ ETİKETTE: başka sekmedeyken de bekleyen iş görünsün.
               Rozet aramadan bağımsız sayılıyor (bkz. sorgu). */
            etiket: (
              <span className="inline-flex items-center gap-1.5">
                {t("sekmeBildirimler")}
                {bekleyenBildirimler > 0 ? (
                  <Badge variant="secondary">{bekleyenBildirimler}</Badge>
                ) : null}
              </span>
            ),
            adres: sekmeAdresi(SEKME_BILDIRIM),
            icerik: bildirimIcerigi,
          },
          {
            anahtar: SEKME_ISLENMIS,
            etiket: (
              <span className="inline-flex items-center gap-1.5">
                {t("sekmeIslenmis")}
                <Badge variant="secondary">{toplamKayit}</Badge>
              </span>
            ),
            adres: sekmeAdresi(SEKME_ISLENMIS),
            icerik: islenmisIcerigi,
          },
          {
            anahtar: SEKME_KIRILIM,
            etiket: t("sekmeKirilim"),
            adres: sekmeAdresi(SEKME_KIRILIM),
            icerik: kirilimIcerigi,
          },
        ]}
      />
    </div>
  );
}

function Ozet({
  etiket,
  deger,
  aciklama,
  uyari,
}: {
  etiket: string;
  deger: string;
  aciklama?: string;
  uyari?: boolean;
}) {
  return (
    <div
      className={`space-y-1 rounded-lg border p-4 ${
        uyari ? `${DURUM_KUTUSU.uyari}` : ""
      }`}
    >
      <div className="text-muted-foreground text-xs">{etiket}</div>
      <div className="text-2xl font-semibold">{deger}</div>
      {aciklama ? (
        <div className="text-muted-foreground text-xs">{aciklama}</div>
      ) : null}
    </div>
  );
}

/** Sağlam/hasarlı ayrımı satırda GÖRÜNÜR olmalı — detaya girmeden. */
function AdetRozetleri({
  saglam,
  hasarli,
  talepsiz,
  saglamEtiket,
  hasarliEtiket,
  talepsizEtiket,
}: {
  saglam: number;
  hasarli: number;
  talepsiz: number;
  saglamEtiket: string;
  hasarliEtiket: string;
  talepsizEtiket: string;
}) {
  if (hasarli === 0 && saglam === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap justify-end gap-1">
      {saglam > 0 ? (
        <Badge variant="outline" className="text-xs">
          {saglamEtiket}: {saglam}
        </Badge>
      ) : null}
      {hasarli > 0 ? (
        <Badge
          variant="outline"
          className={`text-xs ${DURUM_YAZISI.uyari} border-current/40`}
        >
          {hasarliEtiket}: {hasarli}
        </Badge>
      ) : null}
      {talepsiz > 0 ? (
        <Badge variant="destructive" className="gap-1 text-xs">
          <TriangleAlert className="size-3" />
          {talepsizEtiket}: {talepsiz}
        </Badge>
      ) : null}
    </span>
  );
}
