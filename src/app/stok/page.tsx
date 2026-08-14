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
import { prisma } from "@/lib/prisma";
import { sayfaCoz } from "@/lib/sayfalama";
import {
  AYRILMIS_SAYILAN_DURUMLAR,
  ayrilmisAdetler,
} from "@/lib/iade/bildirim";
import { sonHareketTarihleri, varyantStoklari } from "@/lib/stok";

import { StokArama } from "./stok-arama";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("stok") };
}

export default async function StokSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sayfa?: string }>;
}) {
  await sayfaIzni("stok.gor");

  const { q, sayfa } = await searchParams;
  const arama = (q ?? "").trim();
  const bicim = await bicimlendirici();
  const t = await getTranslations("Stok");
  const ortak = await getTranslations("Ortak");

  const suzgec = arama
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
