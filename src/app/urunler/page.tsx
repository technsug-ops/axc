import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Eye, PackagePlus, Pencil, Plus } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { IkiSatir } from "@/components/iki-satir";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { SayfalamaCubugu } from "@/components/sayfalama";
import { UzunAd } from "@/components/uzun-ad";
import { kartAdresi } from "@/lib/kart-adresi";
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
import { prisma } from "@/lib/prisma";
import { sayfaCoz } from "@/lib/sayfalama";
import { satisKodundanVaryantIdleri } from "@/lib/satis-kodundan-varyant";
import { aramaKosulu, kodEsdegerleri } from "@/lib/varyant-arama-kurali";
import { urunStoklari } from "@/lib/stok";

import { SilButonu } from "./sil-butonu";
import { ListeyiHatirla } from "@/components/liste-hafizasi-bilesenleri";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("urunler") };
}

export default async function UrunlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sayfa?: string }>;
}) {
  await sayfaIzni("urun.gor");

  const { q, sayfa } = await searchParams;
  const arama = (q ?? "").trim();
  const bicim = await bicimlendirici();
  const t = await getTranslations("Urunler");
  const ortak = await getTranslations("Ortak");
  const tBaslik = await getTranslations("Basliklar");

  /**
   * ⛔ SİPARİŞ / GÖNDERİ NUMARASI DA ARANIR (08.09.2026) — `/stok` ile AYNI
   * GÖVDEDEN. Kullanıcı isteği `/stok` içindi; buraya da uygulandı çünkü bu
   * iki ekranın ayrışması bu depoda ZATEN yaşandı: kanal SKU'su 12.08'de
   * `/urunler`de düzeltilip `/stok`ta unutulmuştu ve kullanıcı buldu.
   * Yalnız `/stok`a eklemek aynı hatayı ayna simetrisiyle tekrarlardı.
   * _(İlke #10: aynı kod her ekranda aynı sonucu verir.)_
   */
  const satisVaryantIdleri = arama
    ? await satisKodundanVaryantIdleri(prisma, arama)
    : [];

  const suzgec = arama
    ? {
        /**
         * ⚠ EŞDEĞER KODLAR AÇILIR (K100) — UPC-A ↔ EAN-13. Rol kümesi
         * DEĞİŞMEDİ; yalnız aynı kodun ikinci yazılışı da aranıyor.
         */
        /**
         * ⛔ PASİF DAHİL: bu ekran `isActive` SÜZMÜYOR ve bu bilinçli — ürün
         * YÖNETİM ekranıdır; pasif ürün listede DURUR ve satırında pasif
         * rozetiyle gösterilir (bkz. aşağıda `!urun.isActive` dalı). Süzmek,
         * pasife alınan ürünü yönetilemez hâle getirirdi.
         *
         * ⭐ VARYANT DALLARI ORTAK GÖVDEDEN, SARMALANARAK (K121c, 08.09.2026).
         *
         * Bu ekran ÜRÜN sorguluyor, ortak gövde ise VARYANT koşulu üretiyor;
         * bu yüzden her dal `variants: { some: ... }` ile sarmalanıyor.
         * Ölçüldü (66 kod · 6 kod türü, marka dahil): inline dal ile bu
         * ifade **FARK 0**.
         *
         * ⛔ `name` ve `brand` DOĞRUDAN KALIYOR — VE BU ÖLÇÜLMÜŞ BİR KARAR:
         * ikisi ÜRÜNÜN alanı, varyantın değil. Sarmalanmış bir ad araması
         * varyantı OLMAYAN bir ürünü sessizce düşürürdü. Bugün öyle ürün YOK
         * (ölçüldü: 1837 üründe 0), ama bir OR dalı ucuz bir emniyettir ve
         * yokluğu bugünün ölçümüne bağlamak yarını garanti etmez.
         *
         * ⚠ ESKİ GEREKÇE SİLİNMİYOR (12.08.2026): pazaryeri panelinden
         * kopyalanan kod (HBCV00004IA2P8) doğrudan yapıştırılıp bulunabilsin;
         * bu dal olmadan o kod HİÇ bulunmuyordu. Süreye etkisi ölçülmüştü
         * (55 → 63 ms).
         */
        OR: [
          ...kodEsdegerleri(arama).flatMap((e) => [
            { name: { contains: e } },
            { brand: { contains: e } },
          ]),
          ...aramaKosulu(arama).map((k) => ({ variants: { some: k } })),
        ],
      }
    : undefined;

  /**
   * ⚠ SATIŞ KİMLİĞİ `kodEsdegerleri` DÖNGÜSÜNE GİRMEZ: eşdeğer açılımı
   * barkodun iki yazılışı içindir (UPC-A ↔ EAN-13); sipariş numarasının
   * ikinci bir yazılışı yoktur. Küme boşsa dal HİÇ eklenmez — arama sonucu
   * sessizce genişleyemez.
   */
  const suzgecArama =
    suzgec && satisVaryantIdleri.length > 0
      ? { OR: [...suzgec.OR, { variants: { some: { id: { in: satisVaryantIdleri } } } }] }
      : suzgec;

  // ÖNCE SAY, SONRA SAYFAYI ÇEK. Sayım olmadan "kaç sayfa var"
  // bilinemez; kullanıcı kararı gereği toplam sayı da ekranda yazıyor.
  const toplam = await prisma.product.count({ where: suzgecArama });
  const sayfalama = sayfaCoz(sayfa, toplam);

  const urunler = await prisma.product.findMany({
    where: suzgecArama,
    skip: sayfalama.atla,
    take: sayfalama.boyut,
    include: {
      variants: {
        select: {
          id: true,
          sku: true,
          companySku: true,
          barcode: true,
          isDefault: true,
          // Eşleşmenin kanal kodundan geldiğini söyleyebilmek için çekilir.
          // Arama yokken `take: 0` — hiç satır gelmez, maliyeti yoktur.
          // (Koşulu `false` yapmak tipi ikiye bölüyor; take ile şekil sabit.)
          channelSkus: {
            where: { channelSku: { contains: arama } },
            select: {
              channelSku: true,
              channelAccount: {
                select: { name: true, channel: { select: { name: true } } },
              },
            },
            take: arama ? 3 : 0,
          },
        },
        orderBy: { isDefault: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  /**
   * Eşleşme kanal kodundan mı geldi?
   *
   * Kullanıcı pazaryeri kodunu yapıştırıp ürünü bulduğunda, listede o kodu
   * göremezse "bu neden çıktı?" diye sorar. Kaynak rozetle söylenir.
   */
  function kanalEslesmesi(urun: (typeof urunler)[number]) {
    if (!arama) return null;
    for (const varyant of urun.variants) {
      const kod = varyant.channelSkus?.[0];
      if (kod) return kod;
    }
    return null;
  }

  // Stok hesabı tek yerde: src/lib/stok.ts (ledger toplamı).
  const stokHaritasi = await urunStoklari(urunler);

  /** Listede gösterilecek kodlar ilk (varsayılan) varyanttan gelir. */
  function anaVaryant(urun: (typeof urunler)[number]) {
    return urun.variants[0];
  }

  function eylemler(urun: (typeof urunler)[number]) {
    return (
      <>
        <SatirEylemi
          href={`/urunler/${urun.id}`}
          ikon={Eye}
          etiket={ortak("detay")}
        />
        {/* ALIM GİR — ürünü listede bulan kullanıcı alımı buradan açar;
            /alimlar'a gidip aynı ürünü yeniden aramak zorunda kalmaz
            (İlke #1 ve #9). Detaydaki düğmeyle aynı adres, aynı davranış. */}
        {urun.variants[0] ? (
          <SatirEylemi
            href={`/alimlar/yeni?varyant=${urun.variants[0].id}`}
            ikon={PackagePlus}
            etiket={t("alimGir")}
          />
        ) : null}
        <SatirEylemi
          href={`/urunler/${urun.id}/duzenle`}
          ikon={Pencil}
          etiket={ortak("duzenle")}
        />
        <SilButonu urunId={urun.id} urunAdi={urun.name} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUZGECLI ADRESI HATIRLAR — hicbir sey CIZMEZ (K104-2).
          Bir kayda girip donen kullanici suzgecini geri bulsun diye.
          Kaydedici olmadan "< Liste" baglantisi duz listeye duser. */}
      <ListeyiHatirla temel="/urunler" etiket={tBaslik("urunler")} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {ortak("kayitSayisi", { sayi: urunler.length })}
            {arama ? ortak("aramaEki", { arama }) : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExcelIndir liste="urunler" parametreler={{ q: arama }} />
          <Button asChild>
            <Link href="/urunler/yeni">
              <Plus />
              {t("yeniUrun")}
            </Link>
          </Button>
        </div>
      </div>

      <KodAramaKutusu
        temelAdres="/urunler"
        baslangic={arama}
        tasinanlar={{}}
        ipucu={t("aramaIpucu")}
      />

      {urunler.length === 0 ? (
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
                  {/* SÜTUNLAR BİRLEŞTİRİLDİ (14.08.2026, tek ekrana sığsın):
                      ürün+marka · Firma SKU+barkod · stok+varyant sayısı.
                      Üç kimlik de listede DURUYOR ve kopyalanabiliyor. */}
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead>{ortak("firmaSku")}</TableHead>
                  <TableHead className="text-right">
                    {t("sutunToplamStok")}
                  </TableHead>
                  <TableHead>{t("sutunOlusturma")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urunler.map((urun) => {
                  const ana = anaVaryant(urun);
                  return (
                    <TableRow key={urun.id}>
                      {/* Uzun ad üç noktayla kesilir; tamamı `title`'da ve
                          Detay düğmesinde. Sınır hücreye değil içindeki
                          bloğa konur — `<td>` üzerinde `max-width` yok
                          sayılıyor (bkz. UzunAd). */}
                      <TableCell>
                        {/* MARKA ADIN ALTINDA: ayrı sütun 117px yiyordu ve
                            marka adı zaten ürün adının başında geçiyor. */}
                        <IkiSatir
                          alt={urun.brand ?? undefined}
                          altIpucu={urun.brand ?? undefined}
                          enGenis="max-w-[20rem]"
                          ust={
                            <UzunAd
                              metin={urun.name}
                              /*
                                ⚠ ÜRÜN ADI → KÂRLILIK KARTI (kullanıcı isteği
                                24.08.2026): _"arada başka tıklama olmasın."_

                                ⚠ AMA KART VARYANT SEVİYESİNDE. Ölçüldü:
                                1080 ürünün 1076'sı tek varyantlı → doğrudan
                                karta gider. Çok varyantlı 4 üründe hangi
                                varyantın kartı açılacağı BELİRSİZ; orada
                                ürün sayfası açılır ve kullanıcı varyantı
                                kendisi seçer. Belirsizken tahmin etmek,
                                sessizce YANLIŞ kartı açmak olurdu.
                              */
                              href={
                                kartAdresi(
                                  urun.variants.map((v) => ({ variantId: v.id })),
                                ) ?? `/urunler/${urun.id}`
                              }
                              ek={
                            <>
                              {!urun.isActive ? (
                                <Badge variant="secondary">
                                  {ortak("pasif")}
                                </Badge>
                              ) : null}
                              {(() => {
                                const k = kanalEslesmesi(urun);
                                return k ? (
                                  <Badge variant="outline" className="text-xs">
                                    {t("kanalKodundanEslesti", {
                                      hesap: k.channelAccount.channel.name,
                                      kod: k.channelSku,
                                    })}
                                  </Badge>
                                ) : null;
                              })()}
                            </>
                              }
                            />
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {/* Firma SKU üstte, barkod altta: ikisi de kimlik
                            kodudur, ikisi de tık-kopyala taşır (#3, #4). */}
                        <IkiSatir
                          ust={
                            <KopyalanabilirKod
                              deger={ana?.companySku}
                              etiket={ortak("firmaSku")}
                            />
                          }
                          alt={
                            <KopyalanabilirKod
                              deger={ana?.barcode}
                              etiket={ortak("barkod")}
                            />
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <IkiSatir
                          ust={
                            <span className="font-medium">
                              {stokHaritasi.get(urun.id) ?? 0}
                            </span>
                          }
                          alt={t("varyantSayisi", {
                            sayi: urun.variants.length,
                          })}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {bicim.tarih(urun.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <SatirEylemleri>{eylemler(urun)}</SatirEylemleri>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {urunler.map((urun) => {
              const ana = anaVaryant(urun);
              return (
                <ListeKarti
                  key={urun.id}
                  baslik={
                    /*
                      ⚠ MOBİLDE DE KART — tabloyla AYNI kuraldan.
                      Belirsizken (çok varyantlı ürün) ürün sayfasına
                      düşer; seçim kullanıcıda kalır.
                    */
                    <Baglanti
                      href={
                        kartAdresi(
                          urun.variants.map((v) => ({ variantId: v.id })),
                        ) ?? `/urunler/${urun.id}`
                      }
                    >
                      {urun.name}
                    </Baglanti>
                  }
                  altBaslik={urun.brand ?? undefined}
                  alanlar={[
                    {
                      etiket: ortak("firmaSku"),
                      deger: (
                        <KopyalanabilirKod
                          deger={ana?.companySku}
                          etiket={ortak("firmaSku")}
                        />
                      ),
                    },
                    {
                      etiket: ortak("barkod"),
                      deger: (
                        <KopyalanabilirKod
                          deger={ana?.barcode}
                          etiket={ortak("barkod")}
                        />
                      ),
                    },
                    { etiket: ortak("varyant"), deger: urun.variants.length },
                    {
                      etiket: t("sutunToplamStok"),
                      deger: (
                        <span className="font-medium">
                          {stokHaritasi.get(urun.id) ?? 0}
                        </span>
                      ),
                    },
                  ]}
                  eylemler={eylemler(urun)}
                />
              );
            })}
          </div>

          <SayfalamaCubugu
            sayfalama={sayfalama}
            yol="/urunler"
            parametreler={{ q: arama }}
          />
        </>
      )}
    </div>
  );
}
