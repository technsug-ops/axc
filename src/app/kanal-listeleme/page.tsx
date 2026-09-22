import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { SatirKarti, SatirListesi } from "@/components/satir-karti";
import { ListeyiHatirla } from "@/components/liste-hafizasi-bilesenleri";
import { SayfalamaCubugu } from "@/components/sayfalama";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { KALEM_GECERLI } from "@/lib/kalem-gecerli";
import {
  bayatMi,
  kapaliDuranMi,
  olcumYasiGun,
  saglikOzeti,
  type ListelemeSatiri,
} from "@/lib/kanal-listeleme-saglik";
import { prisma } from "@/lib/prisma";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { sayfaCoz } from "@/lib/sayfalama";
import { suzgecAdresi } from "@/lib/suzgec";
import { aramaKosulu, kodEsdegerleri } from "@/lib/varyant-arama-kurali";
import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  K224 — KANAL LİSTELEME SAĞLIĞI (21.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: listeleme durumu 07.09'dan beri deftere yazılıyordu ve
 *  HİÇBİR EKRAN göstermiyordu. Kaydedilen ≠ görünen.
 *
 *  ⭐ EKRANIN TEK SORUSU PARA SORUSU: **bizde stok var, kanalda kapalı.**
 *  O mal satılamıyor. Canlıda ölçüldü 21.09.2026 (HB): 5 ürün · ₺14.965.
 *
 *  ⛔ EKRAN KANALA HİÇBİR ŞEY YAZMAZ — yalnız defteri okur. Durum kanalın
 *  cevabıdır (`ChannelSku.listelemeDurumu` şema notu); tazeleme ayrı bir
 *  betiktir (`canli:hb-listeleme` · `canli:kanal-listeleme`).
 *
 *  ⚠ ÖLÇÜMÜN YAŞI EKRANDA YAZAR — şemanın kendi şartı. 21.09'da veri 14 gün
 *  bayattı ve bunu hiçbir yer söylemiyordu; bayat bir rakam taze sanılır.
 *
 *  ⚠ ADLANDIRMA: ekran KANAL bağımsız (`/kanal-listeleme`), firma adı yapıya
 *  gömülmez — Hepsiburada bir VERİDİR, süzgeçten seçilir.
 * ============================================================================
 */

const SAYFA_BOYU = 50;

/** Süzgeç değerleri — URL'de bunlar yaşar. */
const DURUM_SUZGECLERI = {
  kapali: "kapali",
  acik: "acik",
  stoksuz: "stoksuz",
  pasif: "pasif",
  olculmemis: "olculmemis",
} as const;

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("kanalListeleme") };
}

export default async function KanalListelemeSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    kanal?: string;
    durum?: string;
    q?: string;
    sayfa?: string;
  }>;
}) {
  await sayfaIzni("stok.gor");

  const sp = await searchParams;
  const t = await getTranslations("KanalListeleme");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();
  const simdi = new Date();

  const hesaplar = await prisma.channelAccount.findMany({
    where: { channelSkus: { some: {} } },
    select: { id: true, name: true, channel: { select: { name: true } } },
    orderBy: [{ channel: { name: "asc" } }, { name: "asc" }],
  });

  /**
   * ⚠ SÜZGEÇ KOŞULU `AND` İLE KURULUR, SPREAD İLE DEĞİL — spread kullanıcının
   * kendi seçimini sessizce ezer (anayasadaki `?iptal=1` vakası).
   */
  const kosullar: Record<string, unknown>[] = [];
  if (sp.kanal) kosullar.push({ channelAccountId: sp.kanal });
  const arama = (sp.q ?? "").trim();
  if (arama) {
    /**
     * ⛔ ARAMA KOŞULU ORTAK GÖVDEDEN — ÇIPLAK YAZILMAZ (`arama:dogrula`).
     *
     * Elle yazılmış hâli `barcode: { contains: arama }` diyordu ve UPC-A ↔
     * EAN-13 eşdeğerliğini bilmiyordu: `0194644037598` okutulunca katalogdaki
     * `194644037598` BULUNAMAZ — ekran susmaz, YANLIŞ CEVAP verir (K100 canlı
     * vakası). `aramaKosulu` eşdeğerleri üretir ve beş kod rolünü birden
     * kapsar; kanal kodu için de aynı eşdeğerler kullanılır.
     */
    /**
     * PASİF DAHİL: pasif varyant ELENMİYOR — ve bu bilinçli.
     *
     * ⛔ İKİ SEBEP, İKİSİ DE ÖLÇÜLDÜ (21.09.2026, canlı):
     *  ① Bu ekranın sorusu "hangi MALIM satılamıyor". Bir varyantı pasife
     *    almak rafı boşaltmaz; stoğu duran pasif bir varyant hâlâ bağlı
     *    paradır ve elenirse o para EKRANDAN KAYBOLUR — tam gizlemek
     *    istemediğimiz şey.
     *  ② Arama bir SÜZGEÇTİR: aradığı SKU'yu bulamayan kullanıcı sistemi
     *    bozuk sanır ("neden bulamıyorum" — İlke #5).
     *
     * ⚠ BUGÜNKÜ ETKİSİ ÖLÇÜLDÜ VE KÜÇÜK: 2258 kanal SKU'sunun yalnız 1'i
     * pasif varyanta bağlı, stoğu YOK ve kapalı kovada DEĞİL. Yani karar
     * bugünü değil, yarını koruyor.
     */
    kosullar.push({
      OR: [
        ...kodEsdegerleri(arama).map((e) => ({ channelSku: { contains: e } })),
        { variant: { OR: aramaKosulu(arama) } },
      ],
    });
  }

  const kayitlar = await prisma.channelSku.findMany({
    where: kosullar.length > 0 ? { AND: kosullar } : {},
    select: {
      id: true,
      channelSku: true,
      listelemeDurumu: true,
      kanalAdet: true,
      kanalOlcumAt: true,
      variant: {
        select: { id: true, sku: true, name: true, companySku: true },
      },
      channelAccount: {
        select: { id: true, name: true, channel: { select: { name: true } } },
      },
    },
  });

  /**
   * STOK LEDGER'DAN — `StockMovement` toplamı. Varyant tablosunda saklanan
   * bir "stok" alanı YOK ve olmamalı (ledger tek gerçek).
   */
  const varyantIdleri = [...new Set(kayitlar.map((k) => k.variant.id))];
  const hareketler =
    varyantIdleri.length === 0
      ? []
      : await prisma.stockMovement.groupBy({
          by: ["variantId"],
          where: { variantId: { in: varyantIdleri } },
          _sum: { quantityDelta: true },
        });
  const stokHaritasi = new Map(
    hareketler.map((h) => [h.variantId, Number(h._sum.quantityDelta ?? 0)]),
  );

  /**
   * ⛔ KANAL FİYATI DEFTERDE TUTULMUYOR — ve UYDURULMAZ.
   *
   * Tutar için gereken fiyatın kaynağı arandı ve şema merdiveni inildi
   * (anayasa: "şema değişikliği EN PAHALI çözümdür"):
   *   ① mevcut alan  — `ProductVariant`ta da `ChannelSku`da da fiyat YOK ✗
   *   ② serbest metin — yok ✗
   *   ③ TÜRETİLEBİLİR — o varyantın SON SATIŞ fiyatı ✓
   *   ④ yeni sütun — gerekmedi
   *
   * ⚠ TABAN ETİKETİYLE TAŞINIR (anayasa): bu rakam kanalın BUGÜNKÜ fiyatı
   * DEĞİL, bizim SON SATTIĞIMIZ fiyattır ve ekranda öyle yazar. Hiç
   * satılmamış bir varyantta fiyat yoktur; satır SAYILIR ama tutara GİRMEZ —
   * adet tam, tutar ALT SINIR.
   */
  const sonSatislar =
    varyantIdleri.length === 0
      ? []
      : await prisma.saleItem.findMany({
          where: {
            variantId: { in: varyantIdleri },
            /**
             * ⛔ KALDIRILMIŞ KALEM HİÇ SATILMADI — fiyatı da bir satış fiyatı
             * değildir (K78: mükerrer içe aktarma satırı deftere ₺1.039
             * hayalet ciro yazmıştı). Ölçüt ortak gövdeden gelir, elle
             * yazılmaz — yarın eklenen okuyucu da kapsama girsin.
             */
            ...KALEM_GECERLI,
            /** ⛔ İPTAL EDİLMİŞ SATIŞ da olmamış bir satıştır. */
            sale: { iptalTarihi: null },
          },
          select: { variantId: true, unitPriceAmount: true, sale: { select: { soldAt: true } } },
          orderBy: { sale: { soldAt: "desc" } },
        });
  const fiyatHaritasi = new Map<string, number | null>();
  for (const si of sonSatislar) {
    /** İlk gördüğümüz EN YENİDİR (sıralama desc) — sonrakiler eskisi. */
    if (!fiyatHaritasi.has(si.variantId)) {
      fiyatHaritasi.set(si.variantId, Number(si.unitPriceAmount.toString()));
    }
  }

  const satirlar = kayitlar.map((k) => {
    const stok = stokHaritasi.get(k.variant.id) ?? 0;
    const fiyat = fiyatHaritasi.get(k.variant.id) ?? null;
    const saglik: ListelemeSatiri = {
      durum: k.listelemeDurumu,
      kanalAdet: k.kanalAdet,
      olcumAt: k.kanalOlcumAt,
      stok,
      fiyat,
    };
    return { ...k, stok, fiyat, saglik, kapali: kapaliDuranMi(saglik) };
  });

  /** ⚠ ÖZET SÜZGEÇLİ KÜMEDEN ÇIKAR (İlke #15) — "hepsinin toplamı" değil. */
  const ozet = saglikOzeti(satirlar.map((s) => s.saglik));

  const durumSuzgeci = sp.durum ?? "";
  const suzulmus = satirlar.filter((s) => {
    if (durumSuzgeci === DURUM_SUZGECLERI.kapali) return s.kapali;
    if (durumSuzgeci === DURUM_SUZGECLERI.acik) return s.listelemeDurumu === "ACIK";
    if (durumSuzgeci === DURUM_SUZGECLERI.stoksuz) return s.listelemeDurumu === "STOKSUZ";
    if (durumSuzgeci === DURUM_SUZGECLERI.pasif)
      return s.listelemeDurumu === "PASIF" || s.listelemeDurumu === "ONAY_BEKLIYOR";
    if (durumSuzgeci === DURUM_SUZGECLERI.olculmemis) return s.kanalOlcumAt === null;
    return true;
  });

  /** Kapalı duranlar önce, içlerinde de parası büyük olan önce. */
  const sirali = [...suzulmus].sort((a, b) => {
    if (a.kapali !== b.kapali) return a.kapali ? -1 : 1;
    return b.stok * (b.fiyat ?? 0) - a.stok * (a.fiyat ?? 0);
  });

  const sayfalama = sayfaCoz(sp.sayfa, sirali.length, SAYFA_BOYU);
  const dilim = sirali.slice(sayfalama.atla, sayfalama.atla + sayfalama.boyut);

  const suzgecler: SuzgecTanimi[] = [
    {
      ad: "kanal",
      etiket: ortak("kanalHesabi"),
      secenekler: hesaplar.map((h) => ({
        deger: h.id,
        etiket: hesapEtiketi(h.channel.name, h.name),
      })),
    },
    {
      ad: "durum",
      etiket: t("durumSuzgeci"),
      secenekler: [
        { deger: DURUM_SUZGECLERI.kapali, etiket: t("suzgecKapaliDuran") },
        { deger: DURUM_SUZGECLERI.acik, etiket: t("suzgecAcik") },
        { deger: DURUM_SUZGECLERI.stoksuz, etiket: t("suzgecStoksuz") },
        { deger: DURUM_SUZGECLERI.pasif, etiket: t("suzgecPasif") },
        { deger: DURUM_SUZGECLERI.olculmemis, etiket: t("suzgecOlculmemis") },
      ],
    },
  ];

  const yas = olcumYasiGun(ozet.enYeniOlcum, simdi);
  const bayat = bayatMi(ozet.enYeniOlcum, simdi);

  /**
   * ⚠ ADRES SÜZGEÇ SÖZLEŞMESİNİN SAHİBİ DOSYADAN ÜRETİLİR (İlke #16):
   * kutudaki sayı ile tıklanınca açılan liste AYNI kümeden gelsin.
   */
  const kutuAdresi = (durum: string) =>
    suzgecAdresi("/kanal-listeleme", sp, { durum, sayfa: undefined });

  return (
    <div className="space-y-6">
      <ListeyiHatirla temel="/kanal-listeleme" etiket={t("baslik")} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground max-w-3xl text-sm">{t("aciklama")}</p>
      </div>

      {/* ── ÖLÇÜMÜN YAŞI — şemanın şartı, bayatsa görünür ───────────────── */}
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
          /** ⛔ HAM TAILWIND RENGİ YOK — jeton paletten gelir (panel:dogrula). */
          bayat ? DURUM_KUTUSU.uyari : ""
        }`}
      >
        {bayat ? <AlertTriangle className={`size-4 shrink-0 ${DURUM_YAZISI.uyari}`} /> : null}
        <span>
          {yas === null
            ? t("olcumHic")
            : yas === 0
              ? t("olcumBugun")
              : t("olcumYas", { gun: yas })}
        </span>
        <span className="text-muted-foreground">
          {t("tazelemeKomutu")}
        </span>
      </div>

      {/* ── KOMPAKT KUTUCUK IZGARASI (İlke #12) ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KapaliKutusu
          adet={ozet.kapaliDuran}
          tutar={bicim.para(ozet.kapaliDuranTutar, "TRY")}
          baslik={t("kutuKapaliDuran")}
          aciklama={
            /**
             * ⛔ TOPLAMIN KAPSAMI YAZAR. Fiyatı bilinmeyen satır tutara
             * girmiyor; yazmasaydık doğru bir sayı yanlış bir hüküm üretirdi.
             */
            ozet.kapaliDuranFiyatsiz > 0
              ? t("kutuKapaliDuranEksik", { sayi: ozet.kapaliDuranFiyatsiz })
              : t("kutuKapaliDuranAciklama")
          }
          adres={kutuAdresi(DURUM_SUZGECLERI.kapali)}
          acButon={t("ac")}
        />
        <Kutu baslik={t("kutuAcik")} deger={String(ozet.acik)} adres={kutuAdresi(DURUM_SUZGECLERI.acik)} acButon={t("ac")} />
        <Kutu baslik={t("kutuStoksuz")} deger={String(ozet.stoksuz)} adres={kutuAdresi(DURUM_SUZGECLERI.stoksuz)} acButon={t("ac")} />
        <Kutu baslik={t("kutuPasif")} deger={String(ozet.pasif)} adres={kutuAdresi(DURUM_SUZGECLERI.pasif)} acButon={t("ac")} />
        <Kutu
          baslik={t("kutuOlculmemis")}
          deger={String(ozet.olculmemis)}
          adres={kutuAdresi(DURUM_SUZGECLERI.olculmemis)}
          acButon={t("ac")}
          /** ⚠ "Ölçülmedi" TEMİZ DEĞİL — kutu bunu kendisi söyler. */
          altMetin={t("kutuOlculmemisAciklama")}
        />
      </div>

      {/**
       * ⚠ OKUNAN PARAMETRENİN GİRİLECEK YERİ OLMALI. `q` süzgeci kodda
       * vardı ama ekranda kutusu YOKTU — kurulamayan bir süzgeç, tutulmayan
       * bir sözdür. Ortak bileşen kamerayı da getirir (İlke #7).
       */}
      <KodAramaKutusu
        temelAdres="/kanal-listeleme"
        baslangic={arama}
        tasinanlar={{ kanal: sp.kanal, durum: sp.durum }}
        ipucu={t("aramaIpucu")}
      />

      <SuzgecCubugu temelAdres="/kanal-listeleme" mevcut={sp} suzgecler={suzgecler} />

      <div className="text-muted-foreground text-sm">
        {t("listeToplami", { sayi: sirali.length, toplam: ozet.toplam })}
      </div>

      {sirali.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {t("bosSonuc")}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("listeBasligi")}</CardTitle>
            </CardHeader>
            <CardContent>
              {/*
                SATIR KARTI (K235-②): ürün manşet, kodlar ve stok bağlamda,
                durum rozeti sağda. ⚠ KAPALI SATIRIN ZEMİNİ KORUNDU — tabloda
                satır boyanıyordu; rozet tek başına bırakılsaydı "hangileri
                kapalı" taranabilirliği düşerdi.
              */}
              <SatirListesi>
                {dilim.map((s) => (
                  <SatirKarti
                    key={s.id}
                    zemin={s.kapali ? "uyari" : undefined}
                    baslik={
                      <Link
                        href={`/kart/${s.variant.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {s.variant.name ?? s.variant.sku}
                      </Link>
                    }
                    baglam={[
                      <KopyalanabilirKod key="sku" deger={s.variant.sku} etiket={ortak("sku")} />,
                      <KopyalanabilirKod
                        key="kanalKodu"
                        deger={s.channelSku}
                        etiket={t("kanalKodu")}
                      />,
                      hesapEtiketi(s.channelAccount.channel.name, s.channelAccount.name),
                      `${t("bizdekiStok")}: ${s.stok}`,
                      `${t("kanalAdedi")}: ${s.kanalAdet === null ? t("olculmedi") : s.kanalAdet}`,
                    ]}
                    sag={
                      <DurumRozeti
                        durum={s.listelemeDurumu}
                        kapali={s.kapali}
                        kapaliEtiketi={t("rozetKapaliDuran")}
                      />
                    }
                  />
                ))}
              </SatirListesi>
            </CardContent>
          </Card>

          <SayfalamaCubugu sayfalama={sayfalama} yol="/kanal-listeleme" parametreler={sp} />
        </>
      )}
    </div>
  );
}

/** Kompakt sayı kutusu — tıklanınca AYNI kümeyi süzülmüş açar (İlke #16). */
function Kutu({
  baslik,
  deger,
  adres,
  acButon,
  altMetin,
}: {
  baslik: string;
  deger: string;
  adres: string;
  acButon: string;
  altMetin?: string;
}) {
  return (
    <Link
      href={adres}
      className="hover:bg-muted/50 flex min-h-[88px] flex-col justify-between rounded-lg border p-3 transition-colors"
    >
      <div className="text-muted-foreground text-xs">{baslik}</div>
      <div className="text-2xl font-semibold tabular-nums">{deger}</div>
      {altMetin ? <div className="text-muted-foreground text-[11px]">{altMetin}</div> : null}
      <div className="text-primary text-xs">{acButon}</div>
    </Link>
  );
}

/** Ekranın ASIL kutusu: para taşıyan tek kova. */
function KapaliKutusu({
  adet,
  tutar,
  baslik,
  aciklama,
  adres,
  acButon,
}: {
  adet: number;
  tutar: string;
  baslik: string;
  aciklama: string;
  adres: string;
  acButon: string;
}) {
  return (
    <Link
      href={adres}
      className={`col-span-2 flex min-h-[88px] flex-col justify-between rounded-lg border p-3 transition-colors hover:opacity-90 sm:col-span-1 ${DURUM_KUTUSU.uyari}`}
    >
      <div className="flex items-center gap-1.5 text-xs">
        <PackageX className="size-3.5 shrink-0" />
        {baslik}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{adet}</div>
      <div className="text-xs font-medium tabular-nums">{tutar}</div>
      <div className="text-[11px] opacity-80">{aciklama}</div>
      <div className="text-primary text-xs">{acButon}</div>
    </Link>
  );
}

function DurumRozeti({
  durum,
  kapali,
  kapaliEtiketi,
}: {
  durum: string;
  kapali: boolean;
  kapaliEtiketi: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className={DURUM_KUTUSU.notr}>
        <span className={DURUM_YAZISI.notr}>{durum}</span>
      </Badge>
      {kapali ? (
        <Badge variant="outline" className={DURUM_KUTUSU.uyari}>
          <span className={DURUM_YAZISI.uyari}>{kapaliEtiketi}</span>
        </Badge>
      ) : null}
    </div>
  );
}
