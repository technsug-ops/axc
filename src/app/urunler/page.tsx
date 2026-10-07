import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { getTranslations } from "next-intl/server";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
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
import { UrunGorseli } from "@/components/urun-gorseli";
import { supheliSayisi } from "@/lib/supheli-urun-veri";
import { kartAdresi } from "@/lib/kart-adresi";
import { TY_KATEGORI_PARAMETRESI, tyKategoriCoz, tyKategoriUrunKosulu } from "@/lib/ty-kategori-suzgeci";
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
import { DURUM_YAZISI } from "@/lib/renkler";
import { sayfaCoz } from "@/lib/sayfalama";
import { urunAramaKosulu } from "@/lib/urun-arama";
import { urunStoklari } from "@/lib/stok";

import { SilButonu } from "./sil-butonu";
import { ListeyiHatirla } from "@/components/liste-hafizasi-bilesenleri";
import { PazaryeriLinkleri, type PazaryeriSatiri } from "@/components/pazaryeri-linkleri";
import { ilanAdresi, listeKanallariCoz } from "@/lib/kanal-ilan-adresi";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("urunler") };
}

export default async function UrunlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sayfa?: string; tyKategori?: string }>;
}) {
  const baglam = await sayfaIzni("urun.gor");
  /* K273-③: resimsiz kutuda "resim ekle" rozeti yalnız ürün düzenleme izniyle. */
  const resimEkleyebilir = await izinVarMi("urun.yaz");
  /* K284: şüpheli sayısı listeyle AYNI gövdeden; yalnız düzenleme izniyle (ekran urun.yaz ister). */
  const supheli = resimEkleyebilir ? await supheliSayisi() : null;

  const { q, sayfa, tyKategori: tyHam } = await searchParams;
  const arama = (q ?? "").trim();
  /* K295: Trendyol kategori eşleşmesindeki «N ürün» buraya getirir — koşul ortak gövdeden. */
  const tyKategori = tyKategoriCoz(tyHam);
  const bicim = await bicimlendirici();
  const t = await getTranslations("Urunler");
  const ortak = await getTranslations("Ortak");
  const tSupheli = await getTranslations("SupheliUrun");
  const tSku = await getTranslations("SkuOnizleme");
  const tEtiket = await getTranslations("UrunEtiketi");
  const tBaslik = await getTranslations("Basliklar");

  /**
   * ⭐ ARAMA KOŞULU ORTAK GÖVDEDE (K302, 28.09.2026) — `lib/urun-arama.ts`.
   * Excel dışa aktarması AYNI gövdeyi çağırır; önceki hâl (koşul burada,
   * Excel kendi dar koşuluyla) ekranda bulunan ürünü Excel'de düşürüyordu.
   * Gerekçeler (satış kimliği · eşdeğer kodlar · pasif dahil · ad/marka
   * doğrudan) gövdeye taşındı, silinmedi.
   */
  const suzgecArama = await urunAramaKosulu(arama);

  // ÖNCE SAY, SONRA SAYFAYI ÇEK. Sayım olmadan "kaç sayfa var"
  // bilinemez; kullanıcı kararı gereği toplam sayı da ekranda yazıyor.
  /* ⚠ AND ile eklenir, spread ile değil — arama koşulu ezilmesin. */
  const kosul = { AND: [suzgecArama ?? {}, tyKategori ? tyKategoriUrunKosulu(tyKategori) : {}] };
  const toplam = await prisma.product.count({ where: kosul });
  const sayfalama = sayfaCoz(sayfa, toplam);

  const urunler = await prisma.product.findMany({
    where: kosul,
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
          /* K273: küçük resim — ana varyantınki gösterilir. */
          gorselUrl: true,
          gorselKaynak: true,
          /**
           * ⛔ VARYANT AKTİFLİĞİ LİSTEDE ÇEKİLİR (21.09.2026). Ekran bugüne
           * kadar yalnız ÜRÜN düzeyini gösteriyordu; oysa aramayı süzen alan
           * bu. Pasife alınan üç ikiz kayıt ekranda TAMAMEN normal görünüyordu
           * — durum değişti, ekran söylemedi.
           * _(Anayasa: "kaydedilen ≠ görünen".)_
           */
          isActive: true,
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

  /**
   * PAZARYERİ SÜTUNU (kullanıcı isteği 07.10.2026) — firmanın seçtiği kanallar
   * (`Company.urunListesiKanallari`, Ayarlar → Kanallar) ve sayfadaki ANA
   * varyantların SATIŞ hesabı kanal kodları. Adres saklanmaz; kanal kalıbından
   * kurulur (`lib/kanal-ilan-adresi.ts`). Yalnız bu sayfanın satırları çekilir.
   */
  const anaIdleri = urunler.map((u) => u.variants[0]?.id).filter((x): x is string => Boolean(x));
  const [firmaAyari, aktifKanallar, kanalKayitlari] = await Promise.all([
    prisma.company.findUnique({ where: { id: baglam.companyId }, select: { urunListesiKanallari: true } }),
    prisma.channel.findMany({ where: { isActive: true }, select: { code: true, name: true } }),
    prisma.channelSku.findMany({
      where: { variantId: { in: anaIdleri }, isActive: true, channelAccount: { satisIcin: true } },
      select: {
        variantId: true,
        channelSku: true,
        externalListingId: true,
        channelAccount: { select: { externalId: true, channel: { select: { code: true } } } },
      },
    }),
  ]);
  const listeKanallari = listeKanallariCoz(firmaAyari?.urunListesiKanallari ?? null, aktifKanallar.map((k) => k.code));
  const kanalAdlari = new Map(aktifKanallar.map((k) => [k.code, k.name]));
  function pazaryeriSatirlari(variantId: string | undefined): PazaryeriSatiri[] {
    return listeKanallari.map((kod) => {
      const ad = kanalAdlari.get(kod) ?? kod;
      const kayitlar = kanalKayitlari.filter((k) => k.variantId === variantId && k.channelAccount.channel.code === kod);
      if (kayitlar.length === 0) return { kod, ad, durum: "KAYIT_YOK", adres: null };
      for (const k of kayitlar) {
        const adres = ilanAdresi(kod, { channelSku: k.channelSku, externalListingId: k.externalListingId, saticiId: k.channelAccount.externalId });
        if (adres) return { kod, ad, durum: "LINK", adres };
      }
      return { kod, ad, durum: "LINK_YOK", adres: null };
    });
  }
  const tPazaryeri = await getTranslations("PazaryeriLinki");
  const pazaryeriMetni = {
    kayitYok: tPazaryeri("kayitYok"),
    linkYok: tPazaryeri("linkYok"),
    ac: (kanal: string) => tPazaryeri("ac", { kanal }),
  };

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
            {/* K295: TOPLAM (süzgecin tamamı), sayfadaki satır sayısı değil — sayfalamada 50'de takılıyordu. */}
            {ortak("kayitSayisi", { sayi: toplam })}
            {arama ? ortak("aramaEki", { arama }) : ""}
          </p>
          {supheli !== null ? (
            supheli > 0 ? (
              <Baglanti href="/urunler/supheli" className="inline-flex min-h-11 items-center text-sm md:min-h-0">
                {tSupheli("baglanti", { sayi: supheli })}
              </Baglanti>
            ) : (
              <p className="text-muted-foreground text-sm">{tSupheli("baglanti", { sayi: 0 })}</p>
            )
          ) : null}
          {/* K286: salt okuma önizleme — ürün görebilen herkese. */}
          <Baglanti href="/urunler/sku-onizleme" className="inline-flex min-h-11 items-center text-sm md:ml-4 md:min-h-0">
            {tSku("baglanti")}
          </Baglanti>
          {/* K291: ürün etiketi basımı — ürün görebilen herkese (depocu da basar). */}
          <Baglanti href="/urunler/etiketler" className="inline-flex min-h-11 items-center text-sm md:ml-4 md:min-h-0">
            {tEtiket("baglanti")}
          </Baglanti>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExcelIndir liste="urunler" parametreler={{ q: arama, [TY_KATEGORI_PARAMETRESI]: tyKategori ?? undefined }} />
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
        tasinanlar={tyKategori ? { [TY_KATEGORI_PARAMETRESI]: tyKategori } : {}}
        ipucu={t("aramaIpucu")}
      />

      {/* K295: süzgeç GÖRÜNÜR ve kaldırılabilir — liste neden kısa, sorusu cevapsız kalmasın (İlke #5). */}
      {tyKategori ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{t("tyKategoriSuzgeci", { ad: tyKategori })}</Badge>
          <Baglanti href={arama ? `/urunler?q=${encodeURIComponent(arama)}` : "/urunler"} className="inline-flex min-h-11 items-center md:min-h-0">
            {t("suzgeciKaldir")}
          </Baglanti>
        </div>
      ) : null}

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
                  {listeKanallari.length > 0 ? <TableHead>{tPazaryeri("sutun")}</TableHead> : null}
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
                        <div className="flex items-center gap-2.5">
                        <UrunGorseli ekleyebilir={resimEkleyebilir} variantId={ana?.id ?? null} url={ana?.gorselUrl ?? null} kaynak={ana?.gorselKaynak ?? null} ad={urun.name} />
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
                              {/*
                                ⛔ VARYANT DÜZEYİ AYRI ROZETTİR. Aramayı süzen
                                alan varyantın `isActive`i; ürün aktif olduğu
                                hâlde varyantı pasif olabilir ve o ürün hiçbir
                                okutmada ÇIKMAZ. Rozet olmasaydı operatör
                                "neden bulamıyorum" diye kodu suçlardı.

                                ⚠ "HEPSİ" ile "BAZISI" AYRI YAZILIR: tek
                                varyantı pasif olan çok varyantlı bir ürün
                                hâlâ satılabilir; ikisini tek rozete indirmek
                                çalışan bir ürünü ölü göstermek olurdu.
                              */}
                              {/*
                                ⛔ ROZET GİBİ GÖRÜNMEYEN ROZET, ROZET DEĞİLDİR (22.09.2026).
                                `variant="secondary"` bu temada düz metin gibi çıktı;
                                kullanıcı canlı ekran görüntüsüyle geldi: rozet ORADAYDI
                                ("Varyantları pasif — aramada çıkmaz" yazıyordu) ama
                                yanındaki çerçeveli "Hepsiburada kodu" etiketinin yanında
                                metin sanıldı. Kod doğru, veri doğru, deploy güncel —
                                yine de "rozet yok" denildi; İlke #2'nin rozet hâli:
                                etiket etiket gibi GÖRÜNMELİ. `outline` çerçeve çiziyor; rengi `lib/renkler` sabitinden (ham Tailwind
                                sınıfı yasak — `panel:dogrula` ilk denemede tam bunu yakaladı).
                              */}
                              {urun.variants.length > 0 &&
                              urun.variants.every((v) => !v.isActive) ? (
                                <Badge variant="outline" className={DURUM_YAZISI.uyari}>
                                  {t("tumVaryantlarPasif")}
                                </Badge>
                              ) : urun.variants.some((v) => !v.isActive) ? (
                                <Badge variant="outline">
                                  {t("bazıVaryantlarPasif", {
                                    adet: urun.variants.filter((v) => !v.isActive)
                                      .length,
                                  })}
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
                        </div>
                      </TableCell>
                      {listeKanallari.length > 0 ? (
                        <TableCell>
                          <PazaryeriLinkleri satirlar={pazaryeriSatirlari(ana?.id)} metin={pazaryeriMetni} />
                        </TableCell>
                      ) : null}
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
                  gorsel={<UrunGorseli ekleyebilir={resimEkleyebilir} variantId={ana?.id ?? null} url={ana?.gorselUrl ?? null} kaynak={ana?.gorselKaynak ?? null} ad={urun.name} boyut={48} />}
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
                    ...(listeKanallari.length > 0
                      ? [{ etiket: tPazaryeri("sutun"), deger: <PazaryeriLinkleri satirlar={pazaryeriSatirlari(ana?.id)} metin={pazaryeriMetni} /> }]
                      : []),
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
            parametreler={{ q: arama, [TY_KATEGORI_PARAMETRESI]: tyKategori ?? undefined }}
          />
        </>
      )}
    </div>
  );
}
