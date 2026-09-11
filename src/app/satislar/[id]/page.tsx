import { kalemGecerliMi } from "@/lib/kalem-gecerli";
import { KalemKaldir, KalemKaldirmaGeriAl } from "./kalem-kaldir";
import Link from "next/link";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import { PartiMaliyetDuzelt } from "./parti-maliyet-duzelt";
import { notFound } from "next/navigation";
import { Undo2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Baglanti, GeriBaglanti } from "@/components/baglanti";
import {
  IadeBlogu,
  type BekleyenHasar,
  type IadeGorunumu,
} from "@/components/iade-blogu";
import { KarBlogu, type KarBloguVerisi } from "@/components/kar-blogu";

import { GonderiNo } from "./gonderi-no";
import { HesapDegistir } from "./hesap-degistir";
import { YenidenHesapla } from "./yeniden-hesapla";
import { DuzenleFormu } from "./duzenle-formu";
import { IptalFormu } from "./iptal-formu";
import { GeriAlFormu } from "./geri-al-formu";
import { satisIzleri } from "@/lib/satis-duzenleme-veri";
import { kdvDahilKargo } from "@/lib/kargo-kdv";
import { desiSecimi } from "@/lib/kargo-kaynagi";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Badge } from "@/components/ui/badge";
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
import { gunMetni } from "@/lib/donem";
import { prisma } from "@/lib/prisma";
import { KargoDurumu } from "../kargo-durumu";
import { kalemDusumleri, kalemGeriDonusleri, type Dusum } from "@/lib/satis";
import { onayaUygunMu, onayDurumuAnahtari } from "@/lib/onay-kuyrugu";
import { kalanTalepEdilebilirAdet } from "@/lib/tazminat";

import type { Currency } from "@/generated/prisma/enums";
import { satisKalemToplamlari } from "@/lib/tutar";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";

/** Denetim izindeki tek alan değişikliği (AuditLog.detail içinden). */
type IzFarki = {
  alan: string;
  urunAdi: string | null;
  eski: string | number | null;
  yeni: string | number | null;
};

export default async function SatisDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaIzni("satis.gor");
  // Kâr bloğu ayrı izin — bkz. lib/yetki/izinler.ts (tek alan-izni istisnası).
  const karGorunur = await izinVarMi("satis.kar.gor");
  /**
   * DÜZELTME VE İPTAL AYRI İZİNLER (18.08.2026).
   *
   * İzin yoksa düğme HİÇ ÇİZİLMEZ — yapamayacağı bir eylemi gösterip
   * tıklayınca hata vermek, kullanıcıyı boşuna deneten bir tasarımdır.
   * Sunucu tarafı ayrıca korunuyor (`yetkiIste`): ekran süzgeci kolaylık,
   * güvenlik değil.
   */
  const duzenleyebilir = await izinVarMi("satis.duzenle");
  /**
   * ⛔ PARTİ MALİYETİ DÜZELTME İZNİ AYRI (K127): stok düzeltmesiyle aynı
   * kapı (`stok.duzelt`). Satışı düzenleyebilen herkes maliyet damgasına
   * dokunamasın — bu, defterin maliyet tarafına yazan bir işlem.
   */
  const maliyetDuzeltebilir = await izinVarMi("stok.duzelt");
  const iptalEdebilir = await izinVarMi("satis.iptal");

  const { id } = await params;

  // Satış yanlış hesaba yazılmış olabilir; taşıma için SATIŞ hesapları.
  const satisHesaplari = await prisma.channelAccount.findMany({
    where: { isActive: true, satisIcin: true },
    include: { channel: { select: { name: true } } },
    orderBy: [{ channelId: "asc" }, { name: "asc" }],
  });

  const satis = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: {
        /**
         * ══════════════════════════════════════════════════════════════
         *  KALEM_SUZGECI MUAF: kaldırılmış kalemi GÖRMESİ GEREKEN tek ekran
         *  budur ve süzülseydi kaldırma İZSİZ olurdu — satır ekrandan
         *  kaybolur, kimse neyin niye gittiğini göremez ve geri alacak
         *  düğme de kalmazdı.
         * --------------------------------------------------------------
         *  ⛔ ŞARTLARI (muafiyet bedava değildir):
         *  · kaldırılmış kalem ÜSTÜ ÇİZİLİ çizilir, sebebi yanında yazar;
         *  · TOPLAMLARA GİRMEZ — para ve adet sayan her yer aşağıdaki
         *    `gecerliKalemler` kümesinden okur; ekran onu GÖSTERİR, SAYMAZ;
         *  · geri alma yolu aynı satırda durur.
         *
         *  ⚠ Bu, "sıfır satır gizlenmez" kuralının kaldırma tarafı: bir
         *  satırın yok SAYILMASI ile ekrandan SİLİNMESİ aynı şey değildir.
         * ══════════════════════════════════════════════════════════════
         */
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, categoryId: true } },
              /**
               * ⚠ O SATIŞIN KANALINDAKİ KOD — kullanıcı isteği 20.08.2026.
               * Satış kartında yalnız SİSTEM SKU'su (`axcali2020`) vardı;
               * pazaryeri panelinde arama yapmak için oradaki kod gerekiyor
               * ve iki kod BİRBİRİNDEN FARKLI (Kural: SKU · Firma SKU ·
               * Kanal SKU üç ayrı roldür).
               *
               * Süzgeç satışın KENDİ kanal hesabına bağlı: aynı varyantın
               * başka kanaldaki kodunu göstermek yanlış panele yönlendirirdi.
               */
              channelSkus: {
                where: { isActive: true },
                select: { channelSku: true, channelAccountId: true },
              },
            },
          },
          fees: { orderBy: { createdAt: "asc" } },
          returnItems: { select: { quantity: true } },
        },
      },
      // Sipariş başına kesintiler: saleItemId BOŞ olanlar.
      fees: { where: { saleItemId: null }, orderBy: { createdAt: "asc" } },
      cargoCarrier: { select: { name: true } },
      returns: {
        orderBy: { occurredAt: "asc" },
        include: {
          fees: { orderBy: { createdAt: "asc" } },
          // Hasarlı kalemler + açılmış talepler: "talep bekleyen hasar"
          // uyarısı bunlardan hesaplanır (bkz. iade-blogu.tsx).
          items: {
            select: {
              damagedQuantity: true,
              variantId: true,
              compensations: { select: { quantity: true } },
            },
          },
        },
      },
      channelAccount: { include: { channel: { select: { name: true } } } },
    },
  });

  if (!satis) notFound();

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  GÖSTERİLEN KÜME ≠ SAYILAN KÜME (K78)
   * ----------------------------------------------------------------------
   *  `satis.items` KALDIRILMIŞ kalemi de taşır — bilerek (bkz. yukarıdaki
   *  `KALEM_SUZGECI MUAF` beyanı): kaldırma izsiz olmasın, satır üstü çizili
   *  görünsün ve geri alınabilsin.
   *
   *  ⛔ AMA PARA VE ADET SAYAN HER YER `gecerliKalemler`DEN OKUR. İkisi
   *  karışırsa ekran "sayı = liste" sözünü bozar: üstü çizili satır ciroya,
   *  adete ve kâr bloğuna girer. Ölçüt ORTAK GÖVDEDEN (`kalemGecerliMi`) —
   *  burada elle `kaldirildiAt === null` yazılsaydı ikinci bir ölçüt doğardı.
   * ══════════════════════════════════════════════════════════════════════
   */
  const gecerliKalemler = satis.items.filter(kalemGecerliMi);

  // Mevcut hesap SATIŞ süzgecine takılıyorsa (rolü ALIŞ'a çevrilmişse)
  // yine de seçenekte durur; yoksa diyalog boş açılır ve kullanıcı
  // hangi hesapta olduğunu göremez.
  const hesapSecenekleri = [...satisHesaplari];
  if (!hesapSecenekleri.some((h) => h.id === satis.channelAccountId)) {
    hesapSecenekleri.unshift(satis.channelAccount);
  }

  const bicim = await bicimlendirici();
  const t = await getTranslations("Satis");
  const tDuz = await getTranslations("SatisDuzenleme");
  const tIpt = await getTranslations("SatisIptali");
  const tGeri = await getTranslations("IptalGeriAl");
  // Denetim izi: bugünkü tek seferlik fiyat düzeltmesi de burada görünür.
  const izler = await satisIzleri(satis.id);
  const ortak = await getTranslations("Ortak");
  const tIade = await getTranslations("Iade");
  const tKaldirma = await getTranslations("KalemKaldirma");

  // Hangi kalem hangi partilerden düştü — ledger'dan (src/lib/satis.ts).
  const dusumler = await kalemDusumleri(satis.items.map((k) => k.id));
  /**
   * GERİ DÖNÜŞLER — adet düşürülünce stoğa dönen mal. Ayrı kaynak: düşüm
   * listesi FIFO izlenebilirliği içindir, dönüşün kaynak partisi yoktur.
   */
  const geriDonusler = await kalemGeriDonusleri(satis.items.map((k) => k.id));
  const toplamlar = satisKalemToplamlari(gecerliKalemler);

  // Yeniden hesaplama diyaloğu için kargo firmaları.
  const kargoFirmalari = (
    await prisma.cargoCarrier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  ).map((f) => ({ id: f.id, ad: f.name }));

  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());

  // Daha önce iade edilen adetler kalem bazında düşülür; hepsi iade
  // edilmişse "İade Al" pasifleşir ve NEDENİ yazar (#1, #5).
  const iadeKalanVar = gecerliKalemler.some((k) => {
    const iadeEdilen = k.returnItems.reduce((t2, r) => t2 + r.quantity, 0);
    return k.quantity - iadeEdilen > 0;
  });

  const iadeler: IadeGorunumu[] = satis.returns.map((i) => ({
    id: i.id,
    code: i.code,
    returnType: i.returnType,
    occurredAt: i.occurredAt,
    net1: i.net1Amount ? Number(i.net1Amount.toString()) : null,
    net2: i.net2Amount ? Number(i.net2Amount.toString()) : null,
    /** ⭐ SEBEP — 02.09.2026'ya kadar yazılıyor ama HİÇ okunmuyordu. */
    note: i.note,
    satirlar: i.fees.map((f) => ({
      code: f.code,
      tutar: Number(f.amount.toString()),
    })),
  }));

  /**
   * TALEP BEKLEYEN HASAR — hasarlı dönüp de tazminat talebi açılmamış adet.
   * Tutar, Tazminat ekranıyla AYNI yoldan bulunur: varyantın son alımındaki
   * birim maliyet. İki ekranın farklı rakam söylemesi güven kaybettirirdi.
   */
  const hasarliIadeKalemleri = satis.returns
    .flatMap((i) => i.items)
    .filter((k) => k.damagedQuantity > 0);

  const bekleyenAdet = hasarliIadeKalemleri.reduce(
    (toplam, k) =>
      toplam +
      kalanTalepEdilebilirAdet(
        k.damagedQuantity,
        k.compensations.map((c) => c.quantity),
      ),
    0,
  );

  let bekleyenHasar: BekleyenHasar | null = null;
  if (bekleyenAdet > 0) {
    const sonAlimlar = await prisma.purchaseItem.findMany({
      where: {
        variantId: { in: hasarliIadeKalemleri.map((k) => k.variantId) },
        purchase: { NOT: { supplierId: null } },
      },
      select: {
        variantId: true,
        unitCostAmount: true,
        unitCostCurrency: true,
      },
      orderBy: { purchase: { purchasedAt: "desc" } },
    });

    const sonAlim = new Map<string, (typeof sonAlimlar)[number]>();
    for (const a of sonAlimlar) {
      if (!sonAlim.has(a.variantId)) sonAlim.set(a.variantId, a);
    }

    let tutar = 0;
    let paraBirimi: Currency = satis.profitCurrency ?? "TRY";
    for (const k of hasarliIadeKalemleri) {
      const kalan = kalanTalepEdilebilirAdet(
        k.damagedQuantity,
        k.compensations.map((c) => c.quantity),
      );
      const alim = sonAlim.get(k.variantId);
      if (kalan > 0 && alim) {
        tutar += kalan * Number(alim.unitCostAmount.toString());
        paraBirimi = alim.unitCostCurrency;
      }
    }
    bekleyenHasar = { adet: bekleyenAdet, tutar, paraBirimi };
  }

  const karVerisi: KarBloguVerisi = {
    durum: satis.profitStatus,
    paraBirimi: satis.profitCurrency ?? "TRY",
    net1: sayi(satis.net1Amount),
    net2: sayi(satis.net2Amount),
    kalemler: gecerliKalemler.map((kalem) => ({
      id: kalem.id,
      baslik: kalem.variant.name
        ? `${kalem.variant.product.name} — ${kalem.variant.name}`
        : kalem.variant.product.name,
      net1: sayi(kalem.net1Amount),
      net2: sayi(kalem.net2Amount),
      durum: kalem.profitStatus,
      vatRate: sayi(kalem.vatRate),
      kesintiler: kalem.fees.map((f) => ({
        code: f.code,
        tutar: Number(f.amount.toString()),
      })),
    })),
    siparisKesintileri: satis.fees.map((f) => ({
      code: f.code,
      tutar: Number(f.amount.toString()),
    })),
    // Kategorisiz üründe motor varsayılan %20 kullanır; kullanıcı görsün.
    varsayilanKdvKullanildi: gecerliKalemler.some(
      (k) => sayi(k.vatRate) === 20 && k.variant.product.categoryId === null,
    ),
    // Kargo hiç girilmemişse kâr kargo düşülmeden hesaplanmıştır.
    kargoGirilmedi: satis.cargoAmount === null,
  };

  /**
   * ⛔ ETİKET KUYRUĞUN KENDİ GÖVDESİNDEN — İKİNCİ ÖLÇÜT YAZILMAZ (K164).
   *
   * İlk yazımda ölçütü elde kurmuştum (`importKaynak != null && onaylandiAt
   * == null` → "onay bekliyor") ve ÖLÇÜM ÇÜRÜTTÜ: bu **7608 satışa** "onay
   * bekliyor" dedirtiyordu. Kuyruğun gerçek ölçütü çok daha dar (kargolanmış
   * DEĞİL · stok bağı YOK · saatli). Yani detay ekranı, tıklanınca açılan
   * kuyrukla ayrışacaktı — panelin en temel sözü "sayı = liste"dir.
   *
   * ⭐ `onayaUygunMu` zaten SEBEP döndürüyor; etiket doğrudan ona bağlandı.
   * Her sebebin kendi cümlesi var: "onay akışı dışında" ile "onay bekliyor"
   * farklı şeylerdir ve ikisini tek etikete sıkıştırmak yanlış iş üretirdi.
   */
  const onayDurumu = onayaUygunMu({
    importKaynak: satis.importKaynak,
    shippedAt: satis.shippedAt,
    iptalTarihi: satis.iptalTarihi,
    soldAt: satis.soldAt,
    onaylandiAt: satis.onaylandiAt,
    saleOutSayisi: [...dusumler.values()].reduce((t, d) => t + d.length, 0),
  });
  /** Eşleme SAF GÖVDEDE (`onayDurumuAnahtari`) — ekran yalnız çeviriyor. */
  const onayAnahtari = onayDurumuAnahtari(onayDurumu, satis.onaylandiAt);
  const onayMetni =
    onayAnahtari === "onayDurumuOnaylandi"
      ? t("onayDurumuOnaylandi", {
          tarih: bicim.tarihSaat(satis.onaylandiAt as Date),
        })
      : t(onayAnahtari as "onayDurumuBekliyor");

  /**
   * ⛔ GÖSTERİLEN DESİ — TARTIM (kanalKargoDesi) varsa O, yoksa TAHMİN
   * (cargoDesi). Bulgu (11.09.2026, kullanıcı ekran görüntüsü): `kanalKargoDesi`
   * doğru yakalanıyordu (61) ama bu ekran hep `cargoDesi`yi (40, satış
   * anındaki tahmin) gösteriyordu — kanal gerçek desiyi doğruladıktan
   * SONRA bile ekran hiç güncellenmiyordu.
   * ⚠ AYNI GÖVDE (`desiSecimi`, kargo maliyet hesabıyla PAYLAŞILIYOR — "iki
   * yerde iki ölçüt olmaz") ama KÜRESEL (üçüncü) basamağı burada RENDER
   * EDİLMİYOR: o basamak maliyet hesabı için "bilmiyorum" durumunda bile
   * bir sayı üretmek ZORUNDADIR; bu ekran bilinmeyeni GÖSTERMEZ (İlke #11).
   */
  const desiGosterim = desiSecimi({
    kanalKargoDesi:
      satis.kanalKargoDesi === null ? null : Number(satis.kanalKargoDesi.toString()),
    cargoDesi: satis.cargoDesi === null ? null : Number(satis.cargoDesi.toString()),
  });

  // `deger` ReactNode: kargo satırı bir düğme taşıyor (metin değil).
  const bilgiler: { etiket: string; deger: React.ReactNode }[] = [
    /**
     * SİPARİŞ ANI — SAAT YALNIZ BİLİNİYORSA (K163).
     * Liste ekranı bunu zaten basıyordu; detay basmıyordu ve aynı satış iki
     * ekranda farklı görünüyordu. Gövde ORTAK (`bicim.tarihSaat`) — üç ayrı
     * kopya, üç ayrı eskime demekti. _(İlke #10.)_
     */
    { etiket: t("satisTarihi"), deger: bicim.tarihSaat(satis.soldAt) },
    /**
     * ONAY DURUMU (K164) — üç ayrı hâl, üçü farklı şey söyler.
     *
     * ⛔ SESSİZ SIFIR YASAĞI: "onaylandı mı" sorusunun cevabı boş bırakılırsa
     * okuyan onaylandığını varsayar. Elle girilen satışta onay KAVRAMI yok;
     * onu "onay bekliyor" saymak olmayan bir iş üretirdi.
     * Ölçüt `kargo-bekleyen.ts` ile AYNI: `importKaynak === null` (elle) ya da
     * `onaylandiAt !== null` (onaylı) → gerçek satış.
     */
    {
      etiket: t("onayDurumu"),
      deger: onayMetni,
    },
    {
      etiket: ortak("kanalHesabi"),
      deger: `${satis.channelAccount.channel.name} — ${satis.channelAccount.name}`,
    },
    {
      etiket: ortak("adet"),
      deger: String(
        gecerliKalemler.reduce((toplam, k) => toplam + k.quantity, 0),
      ),
    },
    {
      etiket: t("kargoFirmasi"),
      deger: satis.cargoCarrier
        ? `${satis.cargoCarrier.name}${
            desiGosterim.kaynak === "KURESEL"
              ? ""
              : ` — ${desiGosterim.desi} desi${desiGosterim.kaynak === "TAHMIN" ? ` (${t("desiTahmini")})` : ""}`
          }`
        : t("kargoSecilmedi"),
    },
    {
      /**
       * KARGOYA VERİLDİ — elle işaretlenir (kullanıcı kararı 14.08.2026).
       * Detayda tarih de değiştirilebiliyor: "dün verdim, bugün giriyorum"
       * hâli listedeki tek tıklık düğmeyle çözülmez.
       */
      etiket: t("kargoyaVerildi"),
      deger: (
        <KargoDurumu
          saleId={satis.id}
          shippedAt={satis.shippedAt ? gunMetni(satis.shippedAt) : null}
          kip="detay"
        />
      ),
    },
  ];

  /** Partinin nereden geldiği: alım kaleminden mi, açılış/düzeltme mi. */
  function partiKaynagi(dusum: Dusum) {
    const kaynak = dusum.sourceMovement;
    if (!kaynak) return <span className="text-muted-foreground">—</span>;

    if (kaynak.purchaseItem?.purchase) {
      return (
        <Baglanti href={`/alimlar/${kaynak.purchaseItem.purchase.id}`}>
          {kaynak.purchaseItem.purchase.code}
        </Baglanti>
      );
    }
    return (
      <span className="text-muted-foreground">
        {kaynak.type === "INITIAL" ? t("acilisStogu") : t("elleDuzeltme")}
      </span>
    );
  }

  function partiTarihi(dusum: Dusum) {
    return dusum.sourceMovement
      ? bicim.tarih(dusum.sourceMovement.occurredAt)
      : "—";
  }

  function partiMaliyeti(dusum: Dusum) {
    return dusum.unitCostAmount
      ? bicim.para(dusum.unitCostAmount, dusum.unitCostCurrency ?? "TRY")
      : t("maliyetYok");
  }

  return (
    <div className="space-y-6">
      <div>
        <ListeyeDon href="/satislar">{t("baslik")}</ListeyeDon>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
              {satis.code ?? t("siparisNoYok")}
              {satis.code ? (
                <KopyalanabilirKod
                  deger={satis.code}
                  etiket={ortak("siparisNo")}
                  sadeceIkon
                />
              ) : null}
            </h1>
            {/*
              GÖNDERİ (TAKİP) NUMARASI — SONRADAN GİRİLEBİLİR (K41①).

              ⚠ SİPARİŞ NUMARASININ HEMEN ALTINDA: ikisi de aynı siparişin
              kimliği ve depoda ikisi de okutuluyor. Ayrı bir sekmeye ya da
              düzenleme ekranına gizlemek, "bilgiye ulaşmak için detaya
              girmek" demekti (İlke #9).

              ⚠ KOD BURADA YAZILIR ÇÜNKÜ SONRADAN OLUŞUYOR — pazaryeri
              kargo kodunu satıştan sonra veriyor.
            */}
            <div className="mt-2 max-w-md">
              <GonderiNo saleId={satis.id} mevcut={satis.shipmentCode} />
            </div>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span>{bicim.tarih(satis.soldAt)}</span>
              <span>·</span>
              <span>
                {ortak("kalemlerBasligi", { sayi: gecerliKalemler.length })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {iadeKalanVar ? (
              <Button variant="outline" asChild>
                <Link href={`/satislar/${satis.id}/iade`}>
                  <Undo2 />
                  {tIade("iadeAl")}
                </Link>
              </Button>
            ) : (
              // Buton kaybolmaz, PASİF olur ve nedeni yazar (#1, #5).
              <Button
                variant="outline"
                disabled
                title={tIade("tamamiIadeNotu")}
              >
                <Undo2 />
                {tIade("tamamiIade")}
              </Button>
            )}
            <HesapDegistir
              saleId={satis.id}
              mevcutHesapId={satis.channelAccountId}
              mevcutKanalId={satis.channelAccount.channelId}
              secenekler={hesapSecenekleri.map((h) => ({
                id: h.id,
                etiket: `${h.channel.name} — ${h.name}`,
                channelId: h.channelId,
              }))}
            />
            <YenidenHesapla
              saleId={satis.id}
              kalemler={gecerliKalemler.map((k) => {
                // Diyalog MEVCUT komisyonla açılmalı; boş açılırsa kullanıcı
                // farkında olmadan komisyonu sıfırlar (09.08.2026'da oldu).
                //
                // Komisyon oran ile mi tutar ile mi girilmişti? commissionRate
                // doluysa ORAN, boşsa TUTAR. Aslını koruyoruz: tutar her zaman
                // oranı ezdiği için ikisini birden doldurmak oranı işlevsiz
                // bırakırdı.
                const oranVar = k.commissionRate !== null;
                const komisyonKesintisi = k.fees.find(
                  (f) => f.code === "KOMISYON",
                );
                const tutar = komisyonKesintisi
                  ? Number(komisyonKesintisi.amount.toString())
                  : 0;

                return {
                  saleItemId: k.id,
                  baslik: k.variant.name
                    ? `${k.variant.product.name} — ${k.variant.name}`
                    : k.variant.product.name,
                  komisyonOrani: oranVar
                    ? String(Number(k.commissionRate!.toString()))
                    : "",
                  komisyonTutari: !oranVar && tutar > 0 ? String(tutar) : "",
                };
              })}
              kargoFirmalari={kargoFirmalari}
              cargoCarrierId={satis.cargoCarrierId}
              cargoDesi={
                satis.cargoDesi
                  ? String(Number(satis.cargoDesi.toString()))
                  : ""
              }
              cargoAmount={
                satis.cargoAmount
                  ? String(
                      Math.round(
                        Number(satis.cargoAmount.toString()) * 1.2 * 100,
                      ) / 100,
                    )
                  : ""
              }
            />
          </div>
          {toplamlar.length ? (
            <div className="flex flex-wrap gap-2">
              {toplamlar.map((toplam) => (
                <Badge
                  key={toplam.paraBirimi}
                  variant="secondary"
                  className="text-sm"
                >
                  {bicim.para(toplam.tutar, toplam.paraBirimi)}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ═══════════════ İPTAL DURUMU — EN ÜSTTE ═══════════════
          ⚠ TAŞINDI 20.08.2026. Bu kutu sayfanın EN ALTINDAYDI: okuyan
          önce toplam tutarı, kalemleri ve **NET-2'yi** görüyor, iptali en
          son öğreniyordu. İptal edilmiş bir satışta "NET-2 ₺438,72"
          okumak, o satışın kazandırdığı sanılmasına yol açar — oysa satış
          HİÇ DOĞMAMIŞ sayılır ve hiçbir toplama girmez.

          Rakamlar yanlış değil (kaydın dondurulmuş hâli), ÇERÇEVESİ
          eksikti. Kaydın DURUMU, içeriğinden ÖNCE okunur.
          _"Görünen ≠ görülen" dersinin yerleşim hâli._

          ⚠ İPTAL DÜĞMESİ AŞAĞIDA KALDI: durum bir BEYAN, iptal bir
          EYLEMDİR. Yıkıcı eylemi sayfanın tepesine koymak, okumaya gelen
          kullanıcıyı yanlışlıkla tıklamaya davet ederdi. */}
      {/* İPTAL EDİLMİŞ SATIŞ DÜZENLENEMEZ — form yerine DURUM yazar.
          Kayıt silinmiyor; ne zaman, kim, hangi sebeple iptal ettiği
          görünür kalıyor. */}
      {satis.iptalTarihi !== null ? (
        <div className={`space-y-1 rounded-lg p-4 ${DURUM_KUTUSU.olumsuz}`}>
          <p className={`font-medium ${DURUM_YAZISI.olumsuz}`}>
            {tIpt("iptalEdildi", { tarih: bicim.tarih(satis.iptalTarihi) })}
          </p>
          {satis.iptalSebebi ? (
            <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>
              {tIpt(`sebep_${satis.iptalSebebi}`)}
              {satis.iptalNotu ? ` — ${satis.iptalNotu}` : ""}
            </p>
          ) : null}
          <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>
            {tIpt("iptalNotuAciklama")}
          </p>
          {/* GERİ ALMA — gerçek dünya kanıtı 17.08.2026: yanlış iptal olur
              ve geri yolu ekranda olmalı, terminalde değil. */}
          {/* Geri alma da `satis.iptal`e bağlı — iptal edebilen geri de
              alabilmeli, yoksa kendi hatasını düzeltemeyen rol doğar. */}
          {iptalEdebilir ? <GeriAlFormu saleId={satis.id} /> : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("satisBilgileri")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bilgiler.map((bilgi) => (
              <div key={bilgi.etiket}>
                <dt className="text-muted-foreground text-xs">
                  {bilgi.etiket}
                </dt>
                <dd className="text-sm font-medium">{bilgi.deger}</dd>
              </div>
            ))}
          </dl>
          {satis.note ? (
            <div className="mt-4">
              <div className="text-muted-foreground text-xs">
                {ortak("aciklama")}
              </div>
              <p className="text-sm whitespace-pre-line">{satis.note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {satis.items.map((kalem) => {
        /**
         * ⛔ KALDIRILMIŞ KALEM GİZLENMEZ, ÜSTÜ ÇİZİLİR (K78). Gizlemek
         * kaldırmayı İZSİZ yapardı: satır ekrandan kaybolur, "burada ne
         * vardı" sorusunun cevabı kalmaz ve geri alacak düğme de gitmiş
         * olurdu. _(Anayasa: "sıfır satır gizlenmez" — sayılmamak ile
         * ekrandan silinmek AYNI ŞEY DEĞİLDİR.)_
         */
        const kaldirildi = !kalemGecerliMi(kalem);
        const kalemDusumleriListesi = dusumler.get(kalem.id) ?? [];
        const kalemDonusleri = geriDonusler.get(kalem.id) ?? [];
        /**
         * NET DÜŞÜM — Kural #15: tek tek gösterilen yerde toplam da olur.
         * Dönüş varken çıkışları tek tek gösterip toplamı söylememek,
         * kullanıcıyı satırları kafadan toplamaya bırakır; zaten bu
         * ekranın yanıltıcı olma sebebi buydu.
         */
        const cikanAdet = kalemDusumleriListesi.reduce(
          (t2, d) => t2 + Math.abs(d.quantityDelta),
          0,
        );
        const donenAdet = kalemDonusleri.reduce((t2, d) => t2 + d.quantityDelta, 0);

        return (
          <Card key={kalem.id} className={kaldirildi ? "opacity-70" : undefined}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <span className={kaldirildi ? "line-through" : undefined}>
                  <Baglanti href={`/urunler/${kalem.variant.product.id}`}>
                    {kalem.variant.product.name}
                    {kalem.variant.name ? ` — ${kalem.variant.name}` : ""}
                  </Baglanti>
                </span>
                <Badge
                  variant="outline"
                  className={kaldirildi ? "line-through" : undefined}
                >
                  {kalem.quantity} ×{" "}
                  {bicim.para(kalem.unitPriceAmount, kalem.unitPriceCurrency)}
                </Badge>
                {/* ⛔ SEBEP ROZETLE YAZAR — "kaldırıldı" tek başına üç ay
                    sonra "niye" sorusunu cevaplamaz. */}
                {kaldirildi && kalem.kaldirmaSebebi ? (
                  <Badge variant="destructive">
                    {tKaldirma("rozet", {
                      sebep: tKaldirma(`sebep_${kalem.kaldirmaSebebi}`),
                    })}
                  </Badge>
                ) : null}
              </CardTitle>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <KopyalanabilirKod
                  deger={kalem.variant.sku}
                  etiket={ortak("sku")}
                />
                {/* ---------- O KANALDAKİ KOD ----------
                    ⚠ SATIŞIN KENDİ KANAL HESABINA BAĞLI. Aynı varyantın
                    başka kanaldaki kodunu göstermek, kullanıcıyı yanlış
                    panelde aratırdı. Kod yoksa satır çıkmaz — boş bir
                    "Kanal SKU: —" bilgi taşımaz. */}
                {(() => {
                  const kanalKodu = kalem.variant.channelSkus.find(
                    (k) => k.channelAccountId === satis.channelAccountId,
                  );
                  if (!kanalKodu) return null;
                  return (
                    <KopyalanabilirKod
                      deger={kanalKodu.channelSku}
                      etiket={ortak("kanalSku")}
                    />
                  );
                })()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ── SATIR EYLEMİ (İlke #1): kaldır / geri al, KALEMİN kartında ── */}
              {iptalEdebilir && satis.iptalTarihi === null ? (
                <div>
                  {kaldirildi ? (
                    <KalemKaldirmaGeriAl saleItemId={kalem.id} />
                  ) : (
                    <KalemKaldir
                      saleItemId={kalem.id}
                      sonKalem={gecerliKalemler.length <= 1}
                    />
                  )}
                </div>
              ) : null}

              <div className="text-sm font-medium">{t("dusulenPartiler")}</div>

              {/* -------------------- MASAÜSTÜ: TABLO -------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("partiTarihi")}</TableHead>
                      <TableHead>{t("partiKaynagi")}</TableHead>
                      <TableHead>{ortak("raf")}</TableHead>
                      <TableHead className="text-right">
                        {t("partiAdet")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("partiBirimMaliyet")}
                      </TableHead>
                      {/* ⛔ EYLEM SÜTUNU — İlke #1: bir kayıtta yapılabilecek
                          işlem O KAYDIN SATIRINDA görünür durur. */}
                      {maliyetDuzeltebilir ? <TableHead /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kalemDusumleriListesi.map((dusum) => (
                      <TableRow key={dusum.id}>
                        <TableCell className="whitespace-nowrap">
                          {partiTarihi(dusum)}
                        </TableCell>
                        <TableCell>{partiKaynagi(dusum)}</TableCell>
                        <TableCell>
                          {dusum.location ? (
                            <Badge variant="secondary">
                              {dusum.location.code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Math.abs(dusum.quantityDelta)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {partiMaliyeti(dusum)}
                        </TableCell>
                        {/**
                          * ⚠ DÜZELTİLEN ŞEY PARTİ, ÇIKIŞ DEĞİL. Buton
                          * `sourceMovement.id` taşıyor; partisi belli olmayan
                          * bir çıkış için hiç çizilmiyor — düzeltilecek bir
                          * damga yok, olmayan bir yol gösterilmez.
                          */}
                        {maliyetDuzeltebilir ? (
                          <TableCell className="text-right">
                            {dusum.sourceMovement ? (
                              <PartiMaliyetDuzelt
                                hareketId={dusum.sourceMovement.id}
                                mevcutMaliyet={String(partiMaliyeti(dusum))}
                              />
                            ) : null}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}

                    {/* GERİ DÖNENLER — kendi satırı, kendi işareti. */}
                    {kalemDonusleri.map((donus) => (
                      <TableRow key={donus.id} className="text-muted-foreground">
                        <TableCell className="whitespace-nowrap">
                          {bicim.tarih(donus.occurredAt)}
                        </TableCell>
                        <TableCell>{t("stogaDondu")}</TableCell>
                        <TableCell>
                          {donus.location ? (
                            <Badge variant="secondary">{donus.location.code}</Badge>
                          ) : (
                            <span>—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          +{donus.quantityDelta}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {donus.unitCostAmount
                            ? bicim.para(
                                donus.unitCostAmount,
                                donus.unitCostCurrency ?? "TRY",
                              )
                            : t("maliyetYok")}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* NET — yalnız dönüş varken; yoksa gereksiz satır. */}
                    {donenAdet > 0 ? (
                      <TableRow className="font-medium">
                        <TableCell colSpan={3}>{t("netDusum")}</TableCell>
                        <TableCell className="text-right">
                          {cikanAdet - donenAdet}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              {/* --------------------- TELEFON: KART --------------------- */}
              <div className="space-y-3 md:hidden">
                {kalemDusumleriListesi.map((dusum) => (
                  <ListeKarti
                    key={dusum.id}
                    baslik={
                      <span className="flex flex-wrap items-center gap-2">
                        {partiTarihi(dusum)}
                        <Badge variant="outline">
                          {Math.abs(dusum.quantityDelta)}
                        </Badge>
                      </span>
                    }
                    alanlar={[
                      { etiket: t("partiKaynagi"), deger: partiKaynagi(dusum) },
                      {
                        etiket: ortak("raf"),
                        deger: dusum.location ? (
                          <Badge variant="secondary">
                            {dusum.location.code}
                          </Badge>
                        ) : (
                          "—"
                        ),
                      },
                      {
                        etiket: t("partiBirimMaliyet"),
                        deger: (
                          <span className="flex flex-wrap items-center gap-2">
                            {partiMaliyeti(dusum)}
                            {/* ⛔ TELEFONDA DA VAR — İlke #8: mobil eşit
                                vatandaş; düzeltme yalnız masaüstünde kalmaz. */}
                            {maliyetDuzeltebilir && dusum.sourceMovement ? (
                              <PartiMaliyetDuzelt
                                hareketId={dusum.sourceMovement.id}
                                mevcutMaliyet={String(partiMaliyeti(dusum))}
                              />
                            ) : null}
                          </span>
                        ),
                      },
                    ]}
                  />
                ))}

                {kalemDonusleri.map((donus) => (
                  <ListeKarti
                    key={donus.id}
                    baslik={
                      <span className="flex flex-wrap items-center gap-2">
                        {bicim.tarih(donus.occurredAt)}
                        <Badge variant="outline">+{donus.quantityDelta}</Badge>
                      </span>
                    }
                    alanlar={[
                      { etiket: t("partiKaynagi"), deger: t("stogaDondu") },
                      {
                        etiket: ortak("raf"),
                        deger: donus.location ? (
                          <Badge variant="secondary">{donus.location.code}</Badge>
                        ) : (
                          "—"
                        ),
                      },
                      {
                        etiket: t("partiBirimMaliyet"),
                        deger: donus.unitCostAmount
                          ? bicim.para(
                              donus.unitCostAmount,
                              donus.unitCostCurrency ?? "TRY",
                            )
                          : t("maliyetYok"),
                      },
                    ]}
                  />
                ))}

                {donenAdet > 0 ? (
                  <p className="text-sm font-medium">
                    {t("netDusumDeger", { adet: cikanAdet - donenAdet })}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {karGorunur && satis.profitStatus !== null ? (
        <KarBlogu veri={karVerisi} />
      ) : null}

      <IadeBlogu
        iadeler={iadeler}
        paraBirimi={satis.profitCurrency ?? "TRY"}
        orijinalNet1={sayi(satis.net1Amount)}
        orijinalNet2={sayi(satis.net2Amount)}
        bekleyenHasar={bekleyenHasar}
      />

      {/* ══════════════ DÜZENLEME ══════════════
          Kullanıcı talebi 17.08.2026: fiyat hatası script'siz, ekrandan
          düzeltilebilmeli. Önizleme-önce; onay düğmesi plan çizilmeden
          aktif olmaz. */}

      {/* İPTAL EYLEMİ — durum beyanı yukarıda, EYLEM burada. Yıkıcı
          düğme sayfanın tepesinde durmaz (İlke #6: onay ister, ama önce
          kasıtla ulaşılmalı). */}
      {satis.iptalTarihi === null && iptalEdebilir ? (
        <div className="flex flex-wrap gap-2">
          <IptalFormu saleId={satis.id} />
        </div>
      ) : null}
      {satis.iptalTarihi === null && duzenleyebilir ? (
      <DuzenleFormu
        saleId={satis.id}
        paraBirimi={satis.profitCurrency ?? "TRY"}
        kargoDesi={sayi(satis.cargoDesi)}
        // KDV DAHİL gösterilir — veritabanı KDV HARİÇ saklar
        // (bkz. lib/satis-duzenleme-veri.ts → kdvDahilKargo).
        kargoTutar={kdvDahilKargo(sayi(satis.cargoAmount))}
        kargoFirmaId={satis.cargoCarrierId}
        kalemler={gecerliKalemler.map((k) => ({
          id: k.id,
          urunAdi: k.variant.product.name,
          adet: k.quantity,
          fiyat: Number(k.unitPriceAmount.toString()),
        }))}
      />
      ) : null}

      {/* ══════════════ DEĞİŞİKLİK İZİ ══════════════
          Mimar şartı: AuditLog satırı detayda GÖRÜNÜR olsun — bugünkü
          tek seferlik fiyat düzeltmesinin izi de dahil. */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium">{tDuz("izBaslik")}</h2>
        {izler.length === 0 ? (
          <p className="text-muted-foreground text-sm">{tDuz("izYok")}</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {izler.map((iz) => {
              let ayrinti: {
                neden?: string;
                aciklama?: string;
                /** Eski kayıtlar (tek seferlik script) serbest metin taşır. */
                gerekce?: string;
                farklar?: unknown[];
              } = {};
              try {
                ayrinti = JSON.parse(iz.detail ?? "{}");
              } catch {
                ayrinti = {};
              }
              return (
                <li key={iz.id} className="min-w-0 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">
                      {iz.action === "SATIS_IPTAL_GERI_ALINDI"
                        ? tGeri("iz_SATIS_IPTAL_GERI_ALINDI")
                        : tDuz(`iz_${iz.action}`)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {bicim.tarih(iz.createdAt)} ·{" "}
                      {iz.user?.name ?? iz.user?.email ?? tDuz("izSistem")}
                    </span>
                  </div>
                  {/* NEDEN kapalı listeden gelir; açıklama varsa yanında. */}
                  {ayrinti.neden || ayrinti.gerekce || ayrinti.aciklama ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {tDuz("izGerekce")}:{" "}
                      {ayrinti.neden ? tDuz(`neden_${ayrinti.neden}`) : null}
                      {ayrinti.aciklama ? ` — ${ayrinti.aciklama}` : null}
                      {/* Eski kayıtlar (bugünkü script) serbest metin taşıyor. */}
                      {!ayrinti.neden && ayrinti.gerekce ? ayrinti.gerekce : null}
                    </p>
                  ) : null}

                  {/* ═══ ALAN BAZINDA ESKİ → YENİ ═══
                      Mimar şartı 17.08.2026: "İz, değeri taşımıyorsa hikâyeyi
                      taşımıyor." Bu satış dört kez düzenlendi ama hangisinde
                      neyin kaç olduğu görünmüyordu; ezilen orijinal ancak
                      ekran arkeolojisiyle bulunabildi. Veri AuditLog.detail
                      içinde zaten vardı — ekran göstermiyordu. */}
                  {Array.isArray(ayrinti.farklar) && ayrinti.farklar.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {(ayrinti.farklar as IzFarki[]).map((f, i) => (
                        <li key={i} className="text-muted-foreground text-xs">
                          {f.urunAdi ? `${f.urunAdi} · ` : ""}
                          {tDuz(`alan_${f.alan}`)}:{" "}
                          <span className="tabular-nums line-through opacity-70">
                            {f.eski ?? "—"}
                          </span>
                          {" → "}
                          <span className="font-medium tabular-nums">
                            {f.yeni ?? "—"}
                          </span>
                          {/* Kargo rakamı DİLİYLE anılır (ders 2). */}
                          {f.alan === "KARGO_TUTAR" ? ` ${tDuz("kdvDahilNotu")}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-muted-foreground text-xs">{t("detayNotu")}</p>
    </div>
  );
}
