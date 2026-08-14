import { getTranslations } from "next-intl/server";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import { Eye, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { ExcelIndir } from "@/components/excel-indir";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { SayfalamaCubugu } from "@/components/sayfalama";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
import { UzunAd } from "@/components/uzun-ad";
import { Badge } from "@/components/ui/badge";
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
  iadeGerekceEtiketleri,
  iadeTuruEtiketleri,
} from "@/lib/etiketler";
import {
  ayrilmisSayilirMi,
  DEGISIM_GEREKCELERI,
  gecisGecerliMi,
  IADE_ISLE_SEBEP_ANAHTARI,
  iadeIslenebilirMi,
} from "@/lib/iade/bildirim";
import { BildirimFormu } from "./bildirim-formu";
import { Ekler } from "./ekler";
import { EK_SINIRLARI } from "@/lib/ekler";

import { BildirimDurumu } from "./bildirim-durumu";
import {
  iadeToplamlari,
  kanalKirilimi,
  urunKirilimi,
  type IadeSatirVerisi,
} from "@/lib/iade-liste";
import { prisma } from "@/lib/prisma";
import { sayfaCoz } from "@/lib/sayfalama";
import { varyantStoklari } from "@/lib/stok";
import { kalanTalepEdilebilirAdet } from "@/lib/tazminat";

import type { NoticeStatus, ReturnType } from "@/generated/prisma/enums";

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

  // --- süzgeç seçenekleri ---
  const kanallar = await prisma.channel.findMany({
    where: { isActive: true },
    select: { code: true, name: true },
    orderBy: { name: "asc" },
  });

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

  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());

  /** Ekran satırı + saf hesaba giden veri, tek yerden türetilir. */
  const satirlar = iadeler.map((i) => {
    const adet = i.items.reduce((t2, k) => t2 + k.quantity, 0);
    const saglamAdet = i.items.reduce((t2, k) => t2 + k.soundQuantity, 0);
    const hasarliAdet = i.items.reduce((t2, k) => t2 + k.damagedQuantity, 0);
    const talepsizHasarAdet = i.items.reduce(
      (t2, k) =>
        t2 +
        kalanTalepEdilebilirAdet(
          k.damagedQuantity,
          k.compensations.map((c) => c.quantity),
        ),
      0,
    );

    const satirTutari = (kod: string) =>
      i.fees
        .filter((f) => f.code === kod)
        .reduce((t2, f) => t2 + Number(f.amount.toString()), 0);

    const maliyetGeri = satirTutari("MALIYET_GERI");
    const kayipGelir = Math.abs(satirTutari("KAYIP_GELIR"));

    const veri: IadeSatirVerisi = {
      iadeId: i.id,
      kanalKodu: i.sale.channelAccount.channel.code,
      kanalAdi: i.sale.channelAccount.channel.name,
      tur: i.returnType,
      adet,
      saglamAdet,
      hasarliAdet,
      talepsizHasarAdet,
      net1: sayi(i.net1Amount),
      net2: sayi(i.net2Amount),
      ceza: sayi(i.penaltyAmount) ?? 0,
      donenMaliyet: maliyetGeri,
      // Stoğa dönmeyen maliyet: hasarlı adet oranınca. Maliyet satırı
      // sağlam adede göre yazıldığı için dönmeyeni tersinden türetiyoruz.
      donmeyenMaliyet:
        saglamAdet > 0 ? (maliyetGeri / saglamAdet) * hasarliAdet : 0,
      kayipGelir,
      paraBirimi: i.profitCurrency ?? "TRY",
    };

    return { kayit: i, veri };
  });

  const toplamlar = iadeToplamlari(satirlar.map((s) => s.veri));

  // --- kanal kırılımı: PENCEREDEKİ TÜM iadeler (sayfa değil) ---
  const tumIadeler = await prisma.return.findMany({
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
            select: { sku: true, name: true, product: { select: { name: true } } },
          },
        },
      },
    },
  });

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

  // Oranın paydası: AYNI dönemde yapılan satışlar (dönem oranı tanımı).
  const donemSatislari = await prisma.sale.groupBy({
    by: ["channelAccountId"],
    where: { soldAt: aralik },
    _count: { _all: true },
  });
  const hesapKanallari = await prisma.channelAccount.findMany({
    select: { id: true, channel: { select: { code: true } } },
  });
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
  const bildirimKayitlari = await prisma.returnNotice.findMany({
    orderBy: [{ noticedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      code: true,
      noticedAt: true,
      reason: true,
      status: true,
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

  const bekleyenBildirimler = bildirimKayitlari.filter((b) =>
    ayrilmisSayilirMi(b.status),
  ).length;

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

  // Form seçenekleri: son satışlar ve varyantlar VERİDEN gelir.
  const [formSatislari, formVaryantlari] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { soldAt: "desc" },
      take: 100,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {ortak("kayitSayisi", { sayi: toplamKayit })} · {aralikMetni}
          </p>
        </div>
        <ExcelIndir liste="iadeler" parametreler={disaAktarmaParametreleri} />
      </div>

      {/* ================== BİLDİRİMLER — AŞAMA A ==================
          Pazaryeri "müşteri iade istiyor" dedi, mal yolda. Burada kâr ve
          stok hesabı YOKTUR; ledger ancak "İadeyi işle" ile açılan AŞAMA
          B'de (iade formu) hareket görür. */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("bekleyenBildirimler")}
            {bekleyenBildirimler > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {bekleyenBildirimler}
              </Badge>
            ) : null}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {tBildirim("aciklamaMetni")}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <BildirimFormu
            satislar={formSatislari.map((s) => ({
              id: s.id,
              etiket: `${s.code ?? tBildirim("siparisNoYok")} · ${bicim.tarih(s.soldAt)} · ${s.channelAccount.channel.name} — ${s.channelAccount.name}`,
            }))}
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

          {bildirimKayitlari.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("bildirimYok")}</p>
          ) : (
            <div className="space-y-3">
              {bildirimKayitlari.map((b) => (
                <div key={b.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Baglanti href={`/satislar/${b.sale.id}`}>
                      {b.sale.code ?? tBildirim("siparisNoYok")}
                    </Baglanti>
                    <Badge variant="outline">{gerekceEtiketleri[b.reason]}</Badge>
                    <Badge
                      variant={ayrilmisSayilirMi(b.status) ? "default" : "secondary"}
                    >
                      {durumEtiketleri[b.status]}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {bicim.tarih(b.noticedAt)}
                      {b.code ? ` · ${b.code}` : ""}
                    </span>
                    {/* AYRILMIŞ ÜRÜN ROZETİ: stoğa dokunmaz, niyet beyanıdır. */}
                    {b.reservedVariant && b.reservedQuantity > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/50 text-amber-700 dark:text-amber-400"
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

                  <BildirimDurumu
                    bildirimId={b.id}
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
        </CardContent>
      </Card>

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
      {toplamlar.map((toplam) => (
        <Card key={toplam.paraBirimi}>
          <CardHeader>
            <CardTitle>
              {t("donemOzeti")} · {toplam.paraBirimi}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      ))}

      {/* ======================= İŞLENMİŞ İADELER ======================= */}
      {satirlar.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {t("bosListe")}
          </CardContent>
        </Card>
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

      {/* ====================== PAZARYERİ KIRILIMI ====================== */}
      {kirilim.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("kanalKirilimi")}</CardTitle>
            <p className="text-muted-foreground text-sm">{t("oranTanimi")}</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
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
          </CardContent>
        </Card>
      ) : null}

      {/* ==================== EN ÇOK İADE EDİLENLER ==================== */}
      {enCokIade.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("enCokIade")}</CardTitle>
            <p className="text-muted-foreground text-sm">{t("enCokIadeNotu")}</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
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
                        <span className="text-amber-700 dark:text-amber-400">
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
          </CardContent>
        </Card>
      ) : null}
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
        uyari ? "border-amber-500/50 bg-amber-500/10" : ""
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
          className="border-amber-500/50 text-xs text-amber-700 dark:text-amber-400"
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
