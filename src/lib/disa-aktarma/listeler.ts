import { getTranslations } from "next-intl/server";

import { alimKosulu, satisKosulu } from "@/lib/liste-suzgeci";
import {
  LISTE_PENCERELERI,
  ayKaydir,
  gunDegeri,
  gunMetni,
  pencereOlustur,
  type PencereTuru,
} from "@/lib/donem";
import { envanterVerisi } from "@/lib/envanter-veri";
import { aralikCoz } from "@/lib/envanter-tarih";
import { envanterAraligi } from "@/lib/envanter-aralik";
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { odemeMetni } from "@/lib/gider-odemesi";
import { prisma } from "@/lib/prisma";

import type { Sayfa } from "./xlsx";
import { kodEsdegerleri } from "@/lib/varyant-arama-kurali";
import { stoguVarMi } from "@/lib/stok-siralama";

/**
 * ============================================================================
 *  LİSTE DIŞA AKTARIMLARI — "EKRANDA NE GÖRÜYORSAN O"
 * ----------------------------------------------------------------------------
 *  Her indirme, ekrandaki FİLTREYİ uygular. Filtre koşulları ekran koduyla
 *  aynı biçimde kurulur; ayrı bir "hepsini indir" davranışı YOK, çünkü
 *  kullanıcı süzdüğü listeyi indirmeyi bekler.
 *
 *  Tutarlar METİN olarak yazılır ve para birimi AYRI sütunda durur —
 *  TRY ile EUR'yu tek sütuna karıştırıp toplatmak kur çevirisi yanılgısına
 *  davetiye olurdu (anayasa: para birimleri çevrilmez).
 * ============================================================================
 */

export const LISTELER = [
  "urunler",
  "alimlar",
  "satislar",
  "stok",
  "giderler",
  "envanter-degeri",
  "iadeler",
] as const;
export type ListeAnahtari = (typeof LISTELER)[number];

export function listeGecerliMi(deger: string): deger is ListeAnahtari {
  return (LISTELER as readonly string[]).includes(deger);
}

type Parametreler = Record<string, string | undefined>;

const sayi = (d: { toString(): string } | null | undefined) =>
  d === null || d === undefined ? "" : String(Number(d.toString()));

const gun = (d: Date | null | undefined) => (d ? gunMetni(d) : "");

/**
 * ⚠ DÖNÜŞ `Sayfa | Sayfa[]` — ARALIK KİPİ ÜÇ SAYFA ÜRETİYOR (K53-②):
 * açılış · kapanış · fark. Tek sayfaya sıkıştırılsaydı üç farklı soru aynı
 * tabloya girer ve muhasebeci hangi sütunun hangi tarihe ait olduğunu
 * dosyanın içinden çıkaramazdı.
 */
export async function listeSayfasi(
  liste: ListeAnahtari,
  p: Parametreler,
): Promise<Sayfa | Sayfa[]> {
  switch (liste) {
    case "urunler":
      return urunlerSayfasi(p);
    case "alimlar":
      return alimlarSayfasi(p);
    case "satislar":
      return satislarSayfasi(p);
    case "stok":
      return stokSayfasi(p);
    case "giderler":
      return giderlerSayfasi(p);
    case "envanter-degeri":
      return envanterDegeriSayfasi(p);
    case "iadeler":
      return iadelerSayfasi(p);
  }
}

/**
 * İADELER — EKRANDAKİ SÜZGEÇ BİREBİR UYGULANIR.
 *
 * Dönem, kanal, tür ve hasar süzgeçleri ekranla AYNI biçimde kurulur;
 * ayrı yazılsalardı liste bir şey, inen dosya başka şey söylerdi (alım
 * aramasında tam olarak bu yaşandı).
 */
async function iadelerSayfasi(p: Parametreler): Promise<Sayfa> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const tIadeler = await getTranslations("Iadeler");
  const tIade = await getTranslations("Iade");
  const tTur = await getTranslations("IadeTuru");

  const istenen = (p.pencere ?? "SON_30_GUN") as PencereTuru;
  const tur = (LISTE_PENCERELERI as readonly string[]).includes(istenen)
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

  const kanal = (p.kanal ?? "").trim();
  const turFiltresi = (p.tur ?? "").trim();
  const hasar = (p.hasar ?? "").trim();

  const iadeler = await prisma.return.findMany({
    where: {
      occurredAt: { gte: pencere.baslangic, lt: pencere.bitisHaric },
      ...(kanal
        ? { sale: { channelAccount: { channel: { code: kanal } } } }
        : {}),
      ...(["UNDELIVERED", "NORMAL", "DISPUTED"].includes(turFiltresi)
        ? { returnType: turFiltresi as never }
        : {}),
      ...(hasar === "var" || hasar === "talepsiz"
        ? { items: { some: { damagedQuantity: { gt: 0 } } } }
        : {}),
    },
    include: {
      sale: {
        select: {
          code: true,
          channelAccount: {
            select: { name: true, channel: { select: { name: true } } },
          },
        },
      },
      user: { select: { name: true, email: true } },
      items: {
        include: {
          variant: {
            select: { sku: true, product: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { occurredAt: "desc" },
  });

  // HER SATIR BİR İADE KALEMİ — hangi ürünün döndüğü satır satır okunur.
  const satirlar = iadeler.flatMap((i) =>
    i.items.map((k) => [
      gun(i.occurredAt),
      i.sale.code,
      `${i.sale.channelAccount.channel.name} — ${i.sale.channelAccount.name}`,
      i.code,
      tTur.has(i.returnType) ? tTur(i.returnType) : i.returnType,
      k.variant.product.name,
      k.variant.sku,
      k.quantity,
      k.soundQuantity,
      k.damagedQuantity,
      k.damageNote,
      sayi(i.net1Amount),
      sayi(i.net2Amount),
      i.profitCurrency,
      sayi(i.penaltyAmount),
      sayi(i.returnCargoAmount),
      sayi(i.reshipCargoAmount),
      gun(i.exchangeDeliveredAt),
      i.user?.name ?? i.user?.email ?? "",
    ]),
  );

  return {
    ad: tBaslik("iadeler"),
    basliklar: [
      ortak("tarih"),
      ortak("siparisNo"),
      ortak("kanalHesabi"),
      tIade("iadeNo"),
      tIadeler("turSuzgeci"),
      ortak("urun"),
      ortak("sku"),
      ortak("adet"),
      tIade("saglamAdet"),
      tIade("hasarliAdet"),
      tIade("hasarNotu"),
      "NET-1",
      "NET-2",
      ortak("paraBirimi"),
      tIadeler("ceza"),
      tIade("iadeKargosu"),
      tIade("yenidenGonderim"),
      tIade("degisimTeslimi"),
      tIadeler("girenKullanici"),
    ],
    satirlar,
  };
}

/**
 * Envanter değeri — EKRANLA BİREBİR AYNI VERİ.
 *
 * Sorgu burada tekrarlanmıyor: ekranın kullandığı `envanterVerisi()`
 * çağrılıyor. Böylece "indirdiğim dosya ekranda gördüğümden farklı" durumu
 * doğamaz.
 *
 * Değeri bilinmeyen partiler dosyada da AYRI satırlarda ve tutar sütunları
 * boş olarak durur — sıfır yazmak "bedava mal" demek olurdu.
 */
/**
 * @param p `tarih=YYYY-MM-DD` verilirse TARİHLİ FOTOĞRAF (K53).
 *
 * ⚠ EKRANLA AYNI SINIR. Dosya bugünün rakamını taşıyıp adında "1 Haziran"
 * yazsaydı muhasebeciye doğru sayı yanlış etiketle giderdi ve kimse fark
 * etmezdi — dosyanın kendisi bir belge.
 */
/**
 * ARALIK — ÜÇ SAYFA: açılış · kapanış · fark.
 *
 * ⚠ FARK SAYFASI AYRI SORGUDAN GELMİYOR — `envanterAraligi` iki fotoğrafın
 * çıkarmasını veriyor. Üçüncü bir hesap yolu açılsaydı dosyadaki fark,
 * ekrandakinden ayrışabilirdi.
 *
 * ⚠ ÇAPRAZ SONUCU DA DOSYAYA GİRER. Ekranda uyarı görüp dosyayı indiren
 * biri, dosyada o uyarıyı bulamazsa temiz sanır — belge kendi şerhini
 * taşımak zorunda.
 */
async function aralikSayfalari(
  acilisSiniri: Date,
  kapanisSiniri: Date,
  basMetin: string,
  bitMetin: string,
): Promise<Sayfa[]> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const tEnvanter = await getTranslations("Envanter");

  const a = await envanterAraligi(acilisSiniri, kapanisSiniri);
  const tumSatirlar = a.bloklar.flatMap((b) => b.satirlar);
  const kimlik = (id: string) => a.kimlikler.get(id);

  /**
   * ⚠ İKİ TABAN DA SÜTUN OLUR. Tek bir "tutar" sütunu, muhasebecinin
   * hangi tabana baktığını bilmemesi demekti — ve rakam doğru olduğu için
   * kimse sorgulamazdı.
   */
  const basliklar = [
    ortak("urun"),
    ortak("sku"),
    ortak("adet"),
    tEnvanter("malBedeli"),
    tEnvanter("odenen"),
    ortak("paraBirimi"),
  ];

  /** Bir fotoğrafın sayfası — açılış ya da kapanış. */
  const fotografSayfasi = (
    ad: string,
    adetAl: (s: (typeof tumSatirlar)[number]) => number,
    degerAl: (s: (typeof tumSatirlar)[number]) => number | null,
    odenenAl: (s: (typeof tumSatirlar)[number]) => number,
  ): Sayfa => ({
    ad,
    basliklar,
    satirlar: tumSatirlar.map((s) => [
      kimlik(s.variantId)?.urunAdi,
      kimlik(s.variantId)?.sku,
      adetAl(s),
      degerAl(s) === null ? tEnvanter("hesaplanamadi") : String(degerAl(s)),
      String(odenenAl(s)),
      s.paraBirimi,
    ]),
  });

  return [
    fotografSayfasi(
      `${tEnvanter("acilis")} ${basMetin}`,
      (s) => s.acilisAdet,
      (s) => s.acilisDeger,
      (s) => s.acilisOdenen,
    ),
    fotografSayfasi(
      `${tEnvanter("kapanis")} ${bitMetin}`,
      (s) => s.kapanisAdet,
      (s) => s.kapanisDeger,
      (s) => s.kapanisOdenen,
    ),
    {
      ad: `${tEnvanter("fark")} ${basMetin} ${bitMetin}`,
      basliklar: [
        ortak("urun"),
        ortak("sku"),
        tEnvanter("acilis"),
        tEnvanter("kapanis"),
        tEnvanter("fark"),
        `${tEnvanter("farkDegeri")} · ${tEnvanter("malBedeli")}`,
        `${tEnvanter("farkDegeri")} · ${tEnvanter("odenen")}`,
        ortak("paraBirimi"),
      ],
      satirlar: [
        ...tumSatirlar.map((s) => [
          kimlik(s.variantId)?.urunAdi,
          kimlik(s.variantId)?.sku,
          s.acilisAdet,
          s.kapanisAdet,
          s.farkAdet,
          s.farkDeger === null ? tEnvanter("hesaplanamadi") : String(s.farkDeger),
          String(s.farkOdenen),
          s.paraBirimi,
        ]),
        /**
         * ⚠ ÇAPRAZ ŞERHİ DOSYANIN İÇİNDE. Ekranda uyarı görüp dosyayı
         * indiren biri, dosyada o uyarıyı bulamazsa temiz sanır.
         */
        [],
        [
          a.capraz.tutuyorMu
            ? tEnvanter("caprazTemiz", { adet: String(a.capraz.farkAdet) })
            : tEnvanter("caprazAyrisma", {
                fark: String(a.capraz.farkAdet),
                ledger: String(a.capraz.ledgerNet),
                sapma: String(a.capraz.farkAdet - a.capraz.ledgerNet),
              }),
        ],
        [tEnvanter("fotografSerhi")],
      ],
    },
  ];
}

/**
 * ⚠ DÖNÜŞ `Sayfa | Sayfa[]` — aralık kipinde ÜÇ sayfa (açılış · kapanış ·
 * fark), tek tarih ve bugün kipinde TEK sayfa.
 */
async function envanterDegeriSayfasi(
  p: Parametreler,
): Promise<Sayfa | Sayfa[]> {
  const t = await getTranslations("IceAktarma");
  const tEnvanter = await getTranslations("Envanter");
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");

  /** ⚠ Geçersiz tarih sessizce bugüne düşmez — ekranla AYNI gövde çözüyor. */
  const kip = aralikCoz(
    { tarih: p.tarih, bas: p.bas, bit: p.bit },
    new Date(),
  );

  /**
   * ═══ ARALIK KİPİ — ÜÇ SAYFA ═══════════════════════════════════════════
   * ⚠ EKRANLA AYNI GÖVDE (`envanterAraligi`). Ayrı yazılsaydı dosya ile
   * ekran bir gün ayrışır ve muhasebeciye giden belge, kullanıcının
   * gördüğünden farklı olurdu.
   */
  if (kip.tur === "ARALIK") {
    return aralikSayfalari(kip.acilisSiniri, kip.kapanisSiniri, kip.basMetin, kip.bitMetin);
  }

  const sinir = kip.tur === "TEK" ? kip.sinir : undefined;
  const { sonuc, kimlikler } = await envanterVerisi(sinir);

  const satirlar: (string | number | null | undefined)[][] = [];

  for (const blok of sonuc.bloklar) {
    for (const satir of blok.satirlar) {
      const k = kimlikler.get(satir.variantId);
      satirlar.push([
        k?.urunAdi,
        k?.marka,
        k?.varyantAdi,
        k?.sku,
        k?.firmaSku,
        k?.barkod,
        k?.kategoriAdi,
        k?.rafKodu,
        /**
         * ⚠ EKRANDA VAR, DOSYADA DA VAR (İlke #10). Giriş tarihi ekrana
         * eklendiğinde dışa aktarım unutulsaydı, indirilen dosya ekranda
         * görünen bir sütunu taşımıyor olurdu.
         */
        satir.girisTarihi === null ? null : gun(satir.girisTarihi),
        satir.adet,
        String(satir.odenen),
        satir.malBedeli === null
          ? tEnvanter("hesaplanamadi")
          : String(satir.malBedeli),
        satir.paraBirimi,
        satir.kdvOrani === null ? tEnvanter("hesaplanamadi") : satir.kdvOrani,
        tEnvanter("durumDegerlendi"),
      ]);
    }
  }

  for (const satir of sonuc.bilinmeyenler) {
    const k = kimlikler.get(satir.variantId);
    satirlar.push([
      k?.urunAdi,
      k?.marka,
      k?.varyantAdi,
      k?.sku,
      k?.firmaSku,
      k?.barkod,
      k?.kategoriAdi,
      k?.rafKodu,
      /** Değeri bilinmeyen partinin tarihi satıra hiç girmiyor. */
      null,
      satir.adet,
      // Maliyet bilinmiyor: tutar sütunları BOŞ BIRAKILIR, sıfır YAZILMAZ —
      // sıfır "bedava mal" demek olurdu ve Excel'de toplanabilir bir sayıdır.
      // Neden boş olduğu son sütunda yazar.
      null,
      null,
      null,
      null,
      tEnvanter("durumBilinmiyor"),
    ]);
  }

  return {
    ad: tBaslik("envanterDegeri"),
    basliklar: [
      t("sutunUrunAdi"),
      t("sutunMarka"),
      t("sutunVaryantAdi"),
      t("sutunSku"),
      t("sutunFirmaSku"),
      t("sutunBarkod"),
      t("sutunKategori"),
      t("sutunRaf"),
      tEnvanter("girisTarihi"),
      tEnvanter("adet"),
      tEnvanter("odenen"),
      tEnvanter("malBedeli"),
      ortak("paraBirimi"),
      tEnvanter("kdvOrani"),
      ortak("durum"),
    ],
    satirlar,
  };
}

// ---------------------------------------------------------------------------

async function urunlerSayfasi(p: Parametreler): Promise<Sayfa> {
  const t = await getTranslations("IceAktarma");
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const arama = (p.q ?? "").trim();

  const urunler = await prisma.product.findMany({
    where: arama
      ? {
          /**
           * ⚠ EŞDEĞER KODLAR (K100) — EKRANLA AYNI KÜME. Dışa aktarma
           * ekranın süzgecini birebir taşımak zorunda: biri barkodu bulup
           * öteki bulamazsa Excel ekrandan farklı bir liste üretir.
           */
          OR: kodEsdegerleri(arama).flatMap((e) => [
            { name: { contains: e } },
            { brand: { contains: e } },
            { variants: { some: { sku: { contains: e } } } },
            { variants: { some: { companySku: { contains: e } } } },
            { variants: { some: { barcode: { contains: e } } } },
          ]),
        }
      : undefined,
    include: {
      category: { select: { name: true } },
      variants: {
        include: { location: { select: { code: true } } },
        orderBy: { sku: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // HER SATIR BİR VARYANT — içe aktarma şablonuyla aynı yapı, böylece
  // dışa aktarılan dosya düzenlenip geri yüklenebilir.
  const satirlar = urunler.flatMap((u) =>
    u.variants.map((v) => [
      u.name,
      u.brand,
      v.name,
      v.sku,
      v.companySku,
      v.barcode,
      u.category?.name,
      sayi(u.desi),
      v.location?.code,
      v.isActive ? ortak("aktif") : ortak("pasif"),
    ]),
  );

  return {
    ad: tBaslik("urunler"),
    basliklar: [
      t("sutunUrunAdi"),
      t("sutunMarka"),
      t("sutunVaryantAdi"),
      t("sutunSku"),
      t("sutunFirmaSku"),
      t("sutunBarkod"),
      t("sutunKategori"),
      t("sutunDesi"),
      t("sutunRaf"),
      ortak("durum"),
    ],
    satirlar,
  };
}

async function alimlarSayfasi(p: Parametreler): Promise<Sayfa> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const tAlim = await getTranslations("Alim");
  const tDurum = await getTranslations("AlimDurumu");
  // Ekrandaki liste ile inen dosya AYNI koşul kurucusunu kullanır
  // (lib/liste-suzgeci.ts) — dönem, hesap, tedarikçi ve kart dahil.
  const { kosul } = await alimKosulu(p);

  const alimlar = await prisma.purchase.findMany({
    where: kosul,
    include: {
      items: {
        include: {
          variant: { select: { sku: true } },
          // "Gelen sağlam" KOLON DEĞİL: ledger'dan türetilir (şema kuralı).
          stockMovements: { select: { quantityDelta: true } },
        },
      },
      creditCard: { select: { label: true } },
      supplier: { select: { name: true } },
    },
    orderBy: { purchasedAt: "desc" },
  });

  const satirlar = alimlar.flatMap((a) =>
    a.items.map((k) => [
      a.code,
      gun(a.purchasedAt),
      tDurum.has(a.status) ? tDurum(a.status) : a.status,
      a.supplier?.name ?? a.supplierName,
      a.supplierOrderNo,
      a.creditCard?.label,
      k.variant.sku,
      k.quantity,
      sayi(k.unitCostAmount),
      k.unitCostCurrency,
      k.stockMovements.reduce((toplam, h) => toplam + h.quantityDelta, 0),
      k.damagedQuantity,
    ]),
  );

  return {
    ad: tBaslik("alimlar"),
    basliklar: [
      ortak("kod"),
      ortak("tarih"),
      ortak("durum"),
      tAlim("tedarikci"),
      tAlim("tedarikciSiparisNo"),
      ortak("kart"),
      ortak("sku"),
      ortak("adet"),
      ortak("sutunBirimFiyat"),
      ortak("paraBirimi"),
      tAlim("sutunSaglam"),
      tAlim("sutunHasarli"),
    ],
    satirlar,
  };
}

async function satislarSayfasi(p: Parametreler): Promise<Sayfa> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const tSatis = await getTranslations("Satis");
  // EKRANLA AYNI KOŞUL KURUCUSU (lib/liste-suzgeci.ts): dosyada ekranda
  // görünenden farklı bir liste çıkmasın.
  const { kosul } = satisKosulu(p);

  const satislar = await prisma.sale.findMany({
    where: kosul,
    include: {
      items: { include: { variant: { select: { sku: true } } } },
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
    },
    orderBy: { soldAt: "desc" },
  });

  const satirlar = satislar.flatMap((s) =>
    s.items.map((k) => [
      s.code,
      gun(s.soldAt),
      hesapEtiketi(s.channelAccount.channel.name, s.channelAccount.name),
      k.variant.sku,
      k.quantity,
      sayi(k.unitPriceAmount),
      k.unitPriceCurrency,
      sayi(k.commissionRate),
      sayi(k.vatRate),
      sayi(s.net1Amount),
      sayi(s.net2Amount),
      s.profitCurrency,
      s.profitStatus,
    ]),
  );

  return {
    ad: tBaslik("satislar"),
    basliklar: [
      ortak("siparisNo"),
      ortak("tarih"),
      ortak("kanalHesabi"),
      ortak("sku"),
      ortak("adet"),
      ortak("sutunBirimFiyat"),
      ortak("paraBirimi"),
      tSatis("komisyonOrani"),
      ortak("oran"),
      "NET-1",
      "NET-2",
      ortak("paraBirimi"),
      ortak("durum"),
    ],
    satirlar,
  };
}

async function stokSayfasi(p: Parametreler): Promise<Sayfa> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const t = await getTranslations("IceAktarma");
  const arama = (p.q ?? "").trim();

  const varyantlar = await prisma.productVariant.findMany({
    where: arama
      ? {
          /** ⚠ EŞDEĞER KODLAR (K100) — ekranla aynı küme. */
          OR: kodEsdegerleri(arama).flatMap((e) => [
            { sku: { contains: e } },
            { companySku: { contains: e } },
            { barcode: { contains: e } },
            { product: { name: { contains: e } } },
          ]),
        }
      : undefined,
    include: {
      product: { select: { name: true, brand: true } },
      location: { select: { code: true } },
      stockMovements: { select: { quantityDelta: true } },
    },
    orderBy: { sku: "asc" },
  });

  /**
   * ⚠ EKRANIN SIFIR SÜZGECİ EXCEL'E DE İŞLER (K101, 30.08.2026).
   * İşlemeseydi ekran 230 satır gösterirken indirilen dosyada 1104 satır
   * olurdu ve muhasebeye giden belge ekranı yalanlardı. Ölçüt paylaşılan
   * `stoguVarMi` gövdesinden geliyor — iki yerde iki eşik olmaz.
   */
  const sifirGizlensin = p.stok === "var";

  const satirlar = varyantlar
    .map((v) => ({
      v,
      // Stok = ledger toplamı; kolon olarak tutulmuyor, türetiliyor.
      adet: v.stockMovements.reduce((toplam, h) => toplam + h.quantityDelta, 0),
    }))
    .filter(({ adet }) => !sifirGizlensin || stoguVarMi(adet))
    .map(({ v, adet }) => [
      v.product.name,
      v.product.brand,
      v.name,
      v.sku,
      v.companySku,
      v.barcode,
      v.location?.code,
      adet,
      v.isActive ? ortak("aktif") : ortak("pasif"),
    ]);

  return {
    ad: tBaslik("stok"),
    basliklar: [
      t("sutunUrunAdi"),
      t("sutunMarka"),
      t("sutunVaryantAdi"),
      t("sutunSku"),
      t("sutunFirmaSku"),
      t("sutunBarkod"),
      t("sutunRaf"),
      ortak("stok"),
      ortak("durum"),
    ],
    satirlar,
  };
}

async function giderlerSayfasi(p: Parametreler): Promise<Sayfa> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const tGider = await getTranslations("Gider");
  const kategori = p.kategori ?? "";

  // Ay filtresi ekranla aynı biçimde: "2026-08"
  const eslesme = /^(\d{4})-(\d{2})$/.exec(p.ay ?? "");
  const tarihFiltresi = eslesme
    ? {
        gte: gunDegeri({
          yil: Number(eslesme[1]),
          ay: Number(eslesme[2]),
          gun: 1,
        }),
        lt: gunDegeri({
          ...ayKaydir(Number(eslesme[1]), Number(eslesme[2]), 1),
          gun: 1,
        }),
      }
    : undefined;

  const giderler = await prisma.expense.findMany({
    where: {
      ...(tarihFiltresi ? { spentAt: tarihFiltresi } : {}),
      ...(kategori ? { categoryId: kategori } : {}),
    },
    include: {
      category: { select: { name: true, isFixed: true } },
      template: { select: { name: true } },
      /** Ödeme sütunu için kartın ADI — "cuid" hiçbir şey söylemez. */
      creditCard: { select: { label: true } },
    },
    orderBy: { spentAt: "desc" },
  });

  /**
   * ⚠ EKRANLA AYNI GÖVDE (`lib/gider-odemesi.ts`). Ayrı yazılsaydı liste
   * bir şey, inen dosya başka şey söylerdi — alım aramasında tam olarak bu
   * yaşandı ve kural oradan geliyor.
   */
  const odemeMetinleri = {
    nakit: tGider("odemeNakit"),
    havale: tGider("odemeHavale"),
    kart: tGider("odemeKart"),
    belirtilmedi: tGider("odemeYontemiBelirtilmedi"),
    taksit: (adet: number) => tGider("taksitOzet", { adet }),
  };

  const satirlar = giderler.map((g) => [
    gun(g.spentAt),
    g.category.name,
    g.category.isFixed ? tGider("sabit") : tGider("degisken"),
    g.description ?? g.template?.name,
    sayi(g.amount),
    g.currency,
    sayi(g.vatRate),
    odemeMetni(
      {
        odemeYontemi: g.odemeYontemi,
        kartAdi: g.creditCard?.label ?? null,
        installmentCount: g.installmentCount,
      },
      odemeMetinleri,
    ),
  ]);

  return {
    ad: tBaslik("giderler"),
    basliklar: [
      ortak("tarih"),
      ortak("kategori"),
      tGider("sabit"),
      ortak("aciklama"),
      ortak("tutar"),
      ortak("paraBirimi"),
      tGider("kdvOraniEtiketi"),
      tGider("sutunOdeme"),
    ],
    satirlar,
  };
}
