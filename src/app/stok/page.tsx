import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { History, Package } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { UzunAd } from "@/components/uzun-ad";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SayfalamaCubugu } from "@/components/sayfalama";
import { DURUM_ZEMINI } from "@/lib/renkler";
import { bicimlendirici } from "@/lib/bicim";
import { DurumRozeti } from "@/components/durum-rozeti";
import { DefterDerinligiSerhi } from "@/components/defter-derinligi-serhi";
import { IceAktarmaSerhi } from "@/components/ice-aktarma-serhi";
import { prisma } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";
import {
  bandinVaryantlari,
  yaslanmaListesi,
  yasSuzgeciCoz,
  YAS_BANTLARI,
} from "@/lib/yaslanma";
import { sayfaCoz } from "@/lib/sayfalama";
import { kodEsdegerleri } from "@/lib/varyant-arama-kurali";
import {
  idleriSirala,
  sayfaDilimi,
  siralamaCoz,
  stoguOlanIdler,
  veritabanindaSiralanir,
  type VaryantOlcumu,
} from "@/lib/stok-siralama";
import {
  AYRILMIS_SAYILAN_DURUMLAR,
  ayrilmisAdetler,
} from "@/lib/iade/bildirim";
import { sonHareketTarihleri, varyantStoklari } from "@/lib/stok";
import { pazaryeriKanallari } from "@/lib/kanal-kapsami";
import {
  kanalKodsuzStokluVaryantlar,
  kanaldaKodsuzStokluVaryantlar,
} from "@/lib/uyari/faz2-veri";
import { maliyetsizVaryantlar } from "@/lib/uyari/maliyetsiz-stok";

import { StokArama } from "./stok-arama";
import { SiralaSuzgec } from "./sirala-suzgec";
import { ListeyiHatirla } from "@/components/liste-hafizasi-bilesenleri";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("stok") };
}

export default async function StokSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sayfa?: string;
    yas?: string;
    maliyet?: string;
    /** Uyarı merkezinden gelir: stoğu var, hiçbir kanalda kodu yok. */
    kanal?: string;
    /** K101 — sıralama alanı ve yönü; tanınmayan değer varsayılana düşer. */
    sirala?: string;
    yon?: string;
    /** K101 — `var` ise stoğu sıfır olanlar gizlenir. */
    stok?: string;
  }>;
}) {
  await sayfaIzni("stok.gor");

  const { q, sayfa, yas, maliyet, kanal, sirala, yon, stok } =
    await searchParams;
  const arama = (q ?? "").trim();
  const bicim = await bicimlendirici();
  const t = await getTranslations("Stok");
  const ortak = await getTranslations("Ortak");

  /**
   * YAŞ SÜZGECİ — panelin "ölü sermaye" rozetinin hedefi (O2, 15.08.2026).
   *
   * Ölçüt `lib/yaslanma.ts`te TEK YERDE: panel rozeti de bu liste de aynı
   * `bandinVaryantlari` çağrısını kullanıyor. İki yerde iki koşul yazılsaydı
   * biri gün eşiğini diğeri para birimini süzer ve sayılar sessizce
   * ayrışırdı — rozet "4" derken liste 5 gösterirdi.
   *
   * SÜZGEÇ KAPALIYKEN HİÇBİR EK SORGU KOŞMUYOR: yaşlanma hesabı bütün stok
   * hareketlerini okur; her stok açılışında o bedeli ödemeye değmez.
   */
  /**
   * MALİYETSİZ SÜZGECİ — uyarı merkezinin hedefi (16.08.2026).
   *
   * Çandaki "N ürünün maliyeti bilinmiyor" uyarısı buraya gelir. Ölçüt
   * `lib/uyari/maliyetsiz-stok.ts`te TEK YERDE: çan sayısı da bu liste de
   * aynı `maliyetsizVaryantlar` çağrısını kullanıyor. İki yerde iki koşul
   * yazılsaydı rozet 4 derken liste 5 gösterirdi.
   *
   * İki süzgeç de AYNI pahalı sorguyu (bütün stok hareketleri) istiyor;
   * ikisi birden açıksa sorgu BİR KEZ koşuyor. Hiçbiri açık değilse hiç
   * koşmuyor — her stok açılışında o bedel ödenmez.
   */
  const maliyetsizIsteniyor = maliyet === "yok";
  /**
   * ⚠ KÜME UYARIYLA AYNI GÖVDEDEN. Burada kendi sorgumuzu yazsaydık çan
   * "2" derken liste başka bir sayı gösterebilirdi; `faz2-veri.ts` iki
   * tarafı da besliyor.
   */
  /**
   * ── KANAL KAPSAMI SÜZGECİ (K112, 31.08.2026) ──────────────────────────
   *  `?kanal=yok`  → HİÇBİR kanalda kodu yok (uyarı merkezinden gelen bağ)
   *  `?kanal=N11`  → O KANALDA kodu yok (ötekilerde olabilir)
   *
   *  ⚠ ÖLÇÜM BU SÜZGECİ AÇTIRDI (canlı, 31.08.2026, 230 stoklu varyant):
   *      hiçbir kanalda kodu yok     3
   *      TY'de kodu yok             10
   *      HB'de kodu yok              6
   *      N11'de kodu yok           190   ← %82,6, asıl boşluk
   *  "Hiçbir kanalda yok" sorusu boşluğun %1,5'ini gösteriyordu; kanal
   *  bazında sorulmadan gerçek açık görünmüyordu.
   *
   *  ⚠ İKİSİ DE AYNI ÇEKİRDEKTEN (`faz2-veri.ts`) — çan ile liste ayrışmaz.
   */
  const kanalKodsuzIsteniyor = kanal === "yok";
  const kanalKodsuzListe = kanalKodsuzIsteniyor
    ? await kanalKodsuzStokluVaryantlar()
    : kanal
      ? await kanaldaKodsuzStokluVaryantlar(kanal)
      : null;
  /**
   * ⚠ ÇİP LİSTESİ ORTAK GÖVDEDEN — ölçüt DÜZELTİLDİ (31.08.2026).
   * Burada "gerçek hesabı olan kanal sayısı üç" yazıyordu ve o cümle
   * ÖLÇÜLMEMİŞTİ: 11 kanalın hepsinin aktif hesabı var (alım hesapları da
   * sayılıyordu). Doğru ölçüt `lib/kanal-kapsami.ts`te — pazaryeri OLAN ve
   * SATIŞ hesabı bulunan kanallar. `/mal-kabul` sütunlarıyla aynı gövde.
   */
  const kanalSecenekleri = await pazaryeriKanallari();

  const yasBandi = yasSuzgeciCoz(yas);
  let yasVaryantlari: string[] | null = null;
  let maliyetsizListe: string[] | null = null;

  if (yasBandi || maliyetsizIsteniyor) {
    const partiler = await acikPartilerToplu(prisma, null);
    if (maliyetsizIsteniyor) maliyetsizListe = maliyetsizVaryantlar(partiler);
    if (yasBandi) {
      yasVaryantlari = bandinVaryantlari(
        yaslanmaListesi(
          [...partiler.entries()].map(([variantId, liste]) => ({
            variantId,
            partiler: liste,
            kdvOrani: null,
          })),
          new Date(),
        ),
        yasBandi,
      );
    }
  }

  /**
   * İKİ SÜZGEÇ BİRLİKTE: KESİŞİM. "Yaşlanmış VE maliyetsiz" istenirse
   * ikisini de sağlayanlar gelir. Birleşim olsaydı süzgeç eklemek listeyi
   * BÜYÜTÜRDÜ; kullanıcı daraltmak isterken genişletmiş olurdu.
   */
  /**
   * ⚠ ÜÇÜNCÜ SÜZGEÇ EKLENİNCE İÇ İÇE KOŞUL OKUNAMAZ HÂLE GELİYORDU.
   * Kural değişmedi (KESİŞİM), gövde listeleri katlıyor: dördüncü süzgeç
   * eklendiğinde bu satırlara dokunulmayacak.
   */
  /**
   * ═══ K101 — SIRALAMA VE SIFIR SÜZGECİ ═══════════════════════════════
   *
   * ⚠ İKİSİ DE AYNI ÖLÇÜMÜ İSTER: "mevcut stok" ve "son hareket"
   * `ProductVariant` kolonu DEĞİL, `StockMovement` defterinden türer.
   * Ölçüm YALNIZ gerektiğinde koşuyor (ölçüldü 30.08: ~600 ms) — varsayılan
   * sıra (ürün adı) `orderBy` ile veritabanında çözülüyor ve hiçbir ek
   * sorgu üretmiyor. Bu dosyadaki yaş/maliyet süzgeçleri de aynı desende.
   */
  const sira = siralamaCoz(sirala, yon);
  const stokSuzgeciAcik = stok === "var";
  const olcumGerek = stokSuzgeciAcik || !veritabanindaSiralanir(sira);

  let olcumler: Map<string, VaryantOlcumu> | null = null;
  if (olcumGerek) {
    const gruplar = await prisma.stockMovement.groupBy({
      by: ["variantId"],
      _sum: { quantityDelta: true },
      _max: { occurredAt: true },
    });
    olcumler = new Map(
      gruplar.map((g) => [
        g.variantId,
        {
          adet: g._sum.quantityDelta ?? 0,
          sonHareket: g._max.occurredAt ?? null,
        },
      ]),
    );
  }

  /**
   * ⚠ HAREKETİ HİÇ OLMAYAN VARYANT BU LİSTEDE YOKTUR — ve doğrusu bu:
   * bakiyesi sıfırdır, "stoğu olanlar" süzgecinde yeri yoktur. Ölçüldü
   * 30.08: 1104 varyantın 51'i hiç hareket görmemiş.
   */
  const stokluListe =
    stokSuzgeciAcik && olcumler !== null ? stoguOlanIdler(olcumler) : null;

  const varyantSuzgeci = [yasVaryantlari, maliyetsizListe, kanalKodsuzListe, stokluListe]
    .filter((l): l is string[] => l !== null)
    .reduce<string[] | null>(
      (kesisim, liste) =>
        kesisim === null ? liste : kesisim.filter((id) => liste.includes(id)),
      null,
    );

  const aramaKosulu = arama
    ? {
        /**
         * ⚠ EŞDEĞER KODLAR AÇILIR (K100, 30.08.2026) — UPC-A ↔ EAN-13.
         * Okuyucu 12 haneli bir barkodu 13 hane olarak döndürüyor ve
         * `contains` uzun sorguyu kısa alanda BULAMIYOR. Kural
         * `lib/varyant-arama-kurali.ts`te tek yerde; buradaki rol kümesi
         * ve `isActive` şartları DEĞİŞMEDİ, yalnız kod eşdeğeri eklendi.
         */
        OR: kodEsdegerleri(arama).flatMap((e) => [
          { sku: { contains: e } },
          { companySku: { contains: e } },
          { barcode: { contains: e } },
          { product: { name: { contains: e } } },
          /**
           * KANAL KODLARI DA ARANIR — 14.08.2026 kullanıcı bulgusu.
           *
           * Kullanıcı pazaryerinden kopyaladığı eşleşme kodunu
           * (ör. EN10051201144) buraya yapıştırdı ve "0 varyant" gördü.
           * Ürün duruyordu; arama o alana BAKMIYORDU. `/urunler` 12.08'de
           * aynı gerekçeyle düzeltilmişti, `/stok` unutulmuş — iki ekran
           * aynı kodla aynı sonucu vermeliydi (İlke #10).
           *
           * Depoda çalışan kişi elindeki HANGİ kâğıtla gelirse gelsin
           * ürünü bulabilmeli: sistem SKU'su, firma etiketi, üretici
           * barkodu ya da pazaryeri kodu.
           */
          { channelSkus: { some: { channelSku: { contains: e } } } },
        ]),
      }
    : undefined;

  /**
   * İki süzgeç BİRLİKTE yaşar: arama + yaş.
   *
   * Yaş bandı boş küme döndürürse `id: { in: [] }` yazılır ve liste boş
   * çıkar — bu DOĞRU davranıştır. "Süzgeç yokmuş gibi hepsini göster"
   * sessiz bir kayıp olurdu: kullanıcı 61+ gün arıyor, ekranda 1066 varyant
   * görüyor ve süzgecin çalıştığını sanıyor.
   */
  const suzgec =
    varyantSuzgeci === null
      ? aramaKosulu
      : { ...(aramaKosulu ?? {}), id: { in: varyantSuzgeci } };

  // ÖNCE SAY, SONRA SAYFAYI ÇEK (bkz. lib/sayfalama.ts).
  const toplam = await prisma.productVariant.count({ where: suzgec });
  const sayfalama = sayfaCoz(sayfa, toplam);

  /**
   * ÖZET SAYFAYI DEĞİL TÜM SÜZGECİ ANLATIR — 14.08.2026 kullanıcı bulgusu.
   *
   * Başlıkta "50 varyant · toplam 2 adet" yazıyordu: ikisi de EKRANDAKİ
   * sayfanın rakamıydı. 1066 varyantlık depoda "50 varyant" görmek, deponun
   * tamamı sanılabilecek bir yanlış rakamdı — üstelik sayfa değiştikçe
   * değişiyordu. Adet toplamı tek sorguda, süzgecin TAMAMI üzerinden
   * okunuyor (defterin toplamı = mevcut stok).
   */
  const stokToplami = await prisma.stockMovement.aggregate({
    where: suzgec ? { variant: suzgec } : undefined,
    _sum: { quantityDelta: true },
  });
  const tumStok = stokToplami._sum.quantityDelta ?? 0;

  /** İki yol da AYNI alanları çeker; ayrı yazılsalardı biri gün gelip
   *  ötekinden eksik kalırdı. */
  const SATIR_ALANLARI = {
    product: { select: { id: true, name: true, brand: true } },
    location: { select: { code: true } },
  } as const;

  /**
   * ═══ SIRA SÜZGECİN TAMAMI ÜZERİNDE KURULUR — SAYFANIN İÇİNDE DEĞİL ═══
   *
   * ⛔ KOLAY YOL YANLIŞ OLURDU: sayfayı çekip eldeki 50 satırı sıralamak.
   * Ekran "adede göre sıralı" derdi, gerçekte 2. sayfada 1. sayfadan büyük
   * adet çıkardı ve hiçbir şey hata vermezdi.
   * _(K61'in kardeşi: orada TOPLAM sayfaya düşüyordu, burada SIRA.)_
   */
  const varyantlar = veritabanindaSiralanir(sira)
    ? await prisma.productVariant.findMany({
        where: suzgec,
        skip: sayfalama.atla,
        take: sayfalama.boyut,
        include: SATIR_ALANLARI,
        orderBy: [
          { product: { name: sira.yon === "artan" ? "asc" : "desc" } },
          { sku: "asc" },
        ],
      })
    : await (async () => {
        /** Süzgece uyan BÜTÜN kimlikler — sıralama ancak tam küme üzerinde
         *  doğru olur. Yalnız `id` + ad çekiliyor; satırın kendisi sonra. */
        const hepsi = await prisma.productVariant.findMany({
          where: suzgec,
          select: { id: true, product: { select: { name: true } } },
        });
        const adlar = new Map(hepsi.map((v) => [v.id, v.product.name]));
        const sayfaIdleri = sayfaDilimi(
          idleriSirala(
            hepsi.map((v) => v.id),
            adlar,
            olcumler ?? new Map(),
            sira,
          ),
          sayfalama.atla,
          sayfalama.boyut,
        );
        const satirlar = await prisma.productVariant.findMany({
          where: { id: { in: sayfaIdleri } },
          include: SATIR_ALANLARI,
        });
        /**
         * ⚠ SIRAYI GERİ KUR. `where: { id: { in: [...] } }` dizi SIRASINI
         * KORUMAZ — veritabanı kendi bildiği sırada döndürür. Bu satır
         * olmasaydı sıralama sessizce kaybolur, ekran "adede göre sıralı"
         * derken rastgele bir liste gösterirdi.
         */
        const harita = new Map(satirlar.map((v) => [v.id, v]));
        return sayfaIdleri
          .map((id) => harita.get(id))
          .filter((v): v is (typeof satirlar)[number] => v !== undefined);
      })();

  const varyantIdleri = varyantlar.map((v) => v.id);
  const [stoklar, sonHareketler, acikBildirimler] = await Promise.all([
    varyantStoklari(varyantIdleri),
    sonHareketTarihleri(varyantIdleri),
    /**
     * AYRILMIŞ STOK — AÇIK BİLDİRİMLERDEN ANLIK TÜRETİLİR.
     *
     * Ne bir kolon ne bir sayaç: her istekte açık bildirimler okunur.
     * Kolon tutulsaydı bildirim kapandığında onu düşürmeyi unutmak mümkün
     * olurdu ve rozet gerçekte olmayan bir rezervasyonu gösterirdi. Böyle
     * kurulduğu için bildirim kapanır kapanmaz rozet KENDİLİĞİNDEN düşer —
     * "rezervasyonu serbest bırakmayı unutma" diye bir iş doğmaz.
     */
    prisma.returnNotice.findMany({
      where: {
        reservedVariantId: { in: varyantIdleri },
        status: { in: AYRILMIS_SAYILAN_DURUMLAR },
      },
      select: { status: true, reservedVariantId: true, reservedQuantity: true },
    }),
  ]);

  const ayrilmis = ayrilmisAdetler(
    acikBildirimler.map((b) => ({
      durum: b.status,
      reservedVariantId: b.reservedVariantId,
      reservedQuantity: b.reservedQuantity,
    })),
  );

  function eylemler(varyant: (typeof varyantlar)[number]) {
    return (
      <>
        <SatirEylemi href={`/stok/${varyant.id}`} ikon={History} etiket={t("hareketler")} />
        <SatirEylemi href={`/urunler/${varyant.product.id}`} ikon={Package} etiket={t("urunKarti")} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUZGECLI ADRESI HATIRLAR — hicbir sey CIZMEZ (K104-2).
          Bir kayda girip donen kullanici suzgecini geri bulsun diye.
          Kaydedici olmadan "< Liste" baglantisi duz listeye duser. */}
      <ListeyiHatirla temel="/stok" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {/* SÜZGECİN TAMAMI — sayfanın değil (bkz. `tumStok` gerekçesi). */}
            {t("ozet", { varyant: toplam, adet: tumStok })}
            {arama ? ortak("aramaEki", { arama }) : ""}
          </p>
        </div>
        {/* ⚠ EKRANIN SÜZGECİ EXCEL'E DE GİDER — yoksa indirilen dosya
            ekrandan farklı bir liste olurdu (İlke #10, "sayı = liste"). */}
        <ExcelIndir
          liste="stok"
          parametreler={{ q: arama, stok: stokSuzgeciAcik ? "var" : undefined }}
        />
      </div>

      <StokArama baslangic={arama} />

      {/* K101 — sıralama ve sıfır süzgeci. Durum ADRESTE yaşar. */}
      <SiralaSuzgec
        sira={sira}
        stokSuzgeciAcik={stokSuzgeciAcik}
        tasinanlar={{ q: arama, yas, maliyet, kanal }}
        kanallar={kanalSecenekleri}
        seciliKanal={kanal && kanal !== "yok" ? kanal : undefined}
      />

      {/*
        ⚠ İÇE AKTARMA ŞERHİ — A3-③, 26.08.2026.
        İçe aktarılan satışlar stok DÜŞÜRMEDİ (bilinçli: `SALE_OUT` FIFO'dan
        mal düşerdi ve geri alması ledger'a ters kayıt gerektirirdi). Ama
        "bilinçli" demek "görünmez" demek değil: bu ekrana bakan biri satışı
        defterde görüp stoğun düşmediğini fark ederse sistemi bozuk sanar.
        Sayı CANLI — stok bağı kurulunca kendiliğinden söner.
      */}
      {/*
        ⭐ ŞERH EKRANIN SÜZGECİNE BAĞLI — kullanıcı bulgusu 29.08.2026.
        Süzgeçsiz hâlinde tek barkod aranan bir ekranda "9 satış" yazıyordu
        ve o 9 defterin TAMAMINA aitti; aranan ürüne ait olan 0'dı. Rakam
        doğruydu, çerçevesi yanlıştı ve yanlış teşhise yol açtı.
      */}
      <IceAktarmaSerhi varyantSuzgeci={suzgec} />
      {/*
        ⚠ DEFTER DERİNLİĞİ ŞERHİ SÜZGECE BAĞLANMAZ — VE BU BİLİNÇLİ.
        O şerh iki DEFTERİN başlangıçlarını karşılaştırıyor ("alış defteri
        satış defterinden N gün derin"); bu, tek bir ürünün değil sistemin
        tamamının özelliğidir. Süzgeçlemek, olmayan bir ürün bazlı anlam
        üretirdi. _(Anayasa: "aynı veri, farklı soruya farklı pencereden
        bakar" — iki şerh iki farklı soru soruyor.)_
      */}
      <DefterDerinligiSerhi />

      {/* SESSİZ SÜZGEÇ YASAK: yaş süzgeci açıkken ekranda GÖRÜNÜR ve tek
          tıkla kaldırılır. Görünmeseydi kullanıcı eksik listeyi deponun
          tamamı sanardı — bu dosyada `tumStok` de aynı sebeple var. */}
      {yasBandi ? (
        <div className="flex flex-wrap items-center gap-2">
          <DurumRozeti durum="olumsuz" isaretsiz>
            {t("yasSuzgeci", { gun: YAS_BANTLARI.kirmiziGun })}
          </DurumRozeti>
          <Baglanti href={arama ? `/stok?q=${encodeURIComponent(arama)}` : "/stok"}>
            {ortak("temizle")}
          </Baglanti>
        </div>
      ) : null}

      {varyantlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {arama ? t("bosAramaBaslik") : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {arama ? t("bosAramaIpucu") : t("bosIpucu")}
          </p>
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead>{ortak("varyant")}</TableHead>
                  <TableHead>{ortak("firmaSku")}</TableHead>
                  <TableHead>{ortak("barkod")}</TableHead>
                  <TableHead>{ortak("raf")}</TableHead>
                  <TableHead className="text-right">
                    {t("mevcutStok")}
                  </TableHead>
                  <TableHead>{t("sonHareket")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varyantlar.map((varyant) => (
                  <TableRow key={varyant.id}>
                    {/* Uzun ad kesilir, tamamı `title`'da (bkz. UzunAd).
                        Marka alt satırda kalır — kısaltmaya dahil değil. */}
                    <TableCell>
                      <UzunAd
                        metin={varyant.product.name}
                        href={`/stok/${varyant.id}`}
                      />
                      {varyant.product.brand ? (
                        <div className="text-muted-foreground text-xs">
                          {varyant.product.brand}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {varyant.name ?? t("varsayilan")}
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={varyant.companySku}
                        etiket={ortak("firmaSku")}
                      />
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={varyant.barcode}
                        etiket={ortak("barkod")}
                      />
                    </TableCell>
                    <TableCell>
                      {varyant.location ? (
                        <Badge variant="secondary">
                          {varyant.location.code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-base font-semibold">
                      {stoklar.get(varyant.id) ?? 0}
                      {/* AYRILMIŞ ROZETİ: fiziksel stoğu DÜŞÜRMEZ, yanında
                          durur. "3 var ama 1'i söz verilmiş" bilgisi toplama
                          ekranında kararı değiştirir. */}
                      {ayrilmis.get(varyant.id) ? (
                        <span className="block">
                          <Badge
                            variant="outline"
                            className={`text-xs font-normal ${DURUM_ZEMINI.uyari}`}
                          >
                            {t("ayrilmisRozeti", {
                              sayi: ayrilmis.get(varyant.id)!,
                            })}
                          </Badge>
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {sonHareketler.get(varyant.id)
                        ? bicim.tarih(sonHareketler.get(varyant.id)!)
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <SatirEylemleri>{eylemler(varyant)}</SatirEylemleri>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {varyantlar.map((varyant) => (
              <ListeKarti
                key={varyant.id}
                baslik={
                  <Baglanti href={`/stok/${varyant.id}`}>
                    {varyant.product.name}
                  </Baglanti>
                }
                altBaslik={varyant.name ?? t("varsayilanVaryant")}
                alanlar={[
                  {
                    etiket: t("mevcutStok"),
                    deger: (
                      <span className="text-base font-semibold">
                        {stoklar.get(varyant.id) ?? 0}
                        {/* Rozet telefonda da görünür: toplama ekranında
                            birincil cihaz telefon (İlke #8). */}
                        {ayrilmis.get(varyant.id) ? (
                          <span className="block">
                            <Badge
                              variant="outline"
                              className={`text-xs font-normal ${DURUM_ZEMINI.uyari}`}
                            >
                              {t("ayrilmisRozeti", {
                                sayi: ayrilmis.get(varyant.id)!,
                              })}
                            </Badge>
                          </span>
                        ) : null}
                      </span>
                    ),
                  },
                  {
                    etiket: ortak("raf"),
                    deger: varyant.location ? (
                      <Badge variant="secondary">{varyant.location.code}</Badge>
                    ) : (
                      "—"
                    ),
                  },
                  {
                    etiket: ortak("firmaSku"),
                    deger: (
                      <KopyalanabilirKod
                        deger={varyant.companySku}
                        etiket={ortak("firmaSku")}
                      />
                    ),
                  },
                  {
                    etiket: ortak("barkod"),
                    deger: (
                      <KopyalanabilirKod
                        deger={varyant.barcode}
                        etiket={ortak("barkod")}
                      />
                    ),
                  },
                  {
                    etiket: t("sonHareket"),
                    deger: sonHareketler.get(varyant.id)
                      ? bicim.tarih(sonHareketler.get(varyant.id)!)
                      : "—",
                  },
                ]}
                eylemler={eylemler(varyant)}
              />
            ))}
          </div>

          <SayfalamaCubugu
            sayfalama={sayfalama}
            yol="/stok"
            parametreler={{ q: arama }}
          />
        </>
      )}

      <p className="text-muted-foreground text-xs">{t("listeNotu")}</p>
    </div>
  );
}
