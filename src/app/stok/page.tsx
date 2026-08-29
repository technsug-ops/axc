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
import {
  AYRILMIS_SAYILAN_DURUMLAR,
  ayrilmisAdetler,
} from "@/lib/iade/bildirim";
import { sonHareketTarihleri, varyantStoklari } from "@/lib/stok";
import { kanalKodsuzStokluVaryantlar } from "@/lib/uyari/faz2-veri";
import { maliyetsizVaryantlar } from "@/lib/uyari/maliyetsiz-stok";

import { StokArama } from "./stok-arama";

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
  }>;
}) {
  await sayfaIzni("stok.gor");

  const { q, sayfa, yas, maliyet, kanal } = await searchParams;
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
  const kanalKodsuzIsteniyor = kanal === "yok";
  const kanalKodsuzListe = kanalKodsuzIsteniyor
    ? await kanalKodsuzStokluVaryantlar()
    : null;
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
  const varyantSuzgeci = [yasVaryantlari, maliyetsizListe, kanalKodsuzListe]
    .filter((l): l is string[] => l !== null)
    .reduce<string[] | null>(
      (kesisim, liste) =>
        kesisim === null ? liste : kesisim.filter((id) => liste.includes(id)),
      null,
    );

  const aramaKosulu = arama
    ? {
        OR: [
          { sku: { contains: arama } },
          { companySku: { contains: arama } },
          { barcode: { contains: arama } },
          { product: { name: { contains: arama } } },
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
          { channelSkus: { some: { channelSku: { contains: arama } } } },
        ],
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

  const varyantlar = await prisma.productVariant.findMany({
    where: suzgec,
    skip: sayfalama.atla,
    take: sayfalama.boyut,
    include: {
      product: { select: { id: true, name: true, brand: true } },
      location: { select: { code: true } },
    },
    orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
  });

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {/* SÜZGECİN TAMAMI — sayfanın değil (bkz. `tumStok` gerekçesi). */}
            {t("ozet", { varyant: toplam, adet: tumStok })}
            {arama ? ortak("aramaEki", { arama }) : ""}
          </p>
        </div>
        <ExcelIndir liste="stok" parametreler={{ q: arama }} />
      </div>

      <StokArama baslangic={arama} />

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
