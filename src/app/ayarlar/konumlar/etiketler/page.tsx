import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "@/components/niyetli-baglanti";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { ETIKET_BOY_MM, ETIKET_EN_MM, rafEtiketiSvg } from "@/lib/depo/etiket";
import { prisma } from "@/lib/prisma";
import { rafAramasi } from "@/lib/raf-arama";

import { YazdirButonu } from "./yazdir-butonu";

/**
 * VERİTABANI OKUYAN SAYFA — HER İSTEKTE ÇİZİLİR.
 *
 * Statik kipte Next bu sayfayı DERLEME ANINDA üretmeye çalışır ve o sırada
 * veritabanına bağlanması gerekir. Derlemenin veritabanına bağımlı olması
 * kırılgandır (Vercel yapı makinesi uzak MySQL'e erişemeyebilir) ve zaten
 * bir ERP'de liste ekranı canlı veri göstermelidir.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("rafEtiketleri") };
}

/**
 * ============================================================================
 *  RAF ETİKETLERİ — ÜÇ GÖSTERİM, TEK DEĞER (K50 ②)
 * ----------------------------------------------------------------------------
 *  ⭐ Etiket artık ÜÇ gösterim taşıyor ve üçü de AYNI dizeyi söylüyor:
 *    sol   `Code128`  → el terminali
 *    sağ   `QR`       → telefon kamerası
 *    alt   okunabilir → insan gözü
 *
 *  ⛔ QR'A ZENGİN VERİ KONMAZ (adres/URL/liste). İki kod ayrışırsa aynı
 *  etiket İKİ KİMLİK taşır: telefonla okuyan bir raf bulur, el terminaliyle
 *  okuyan başka bir raf bulur ve bunu kimse fark etmez. `depo:dogrula` üç
 *  gösterimin de aynı değerden üretildiğini ÖLÇER.
 *
 *  ⛔ DIŞ SERVİS ÇAĞRISI YOK — barkod da QR da sunucuda üretiliyor. Deponun
 *  etiket basma yeteneği başkasının çalışır olmasına bağlanmaz.
 *
 *  ⚠ SAYFALAMAYI TARAYICI YAPAR (`break-inside-avoid`). Kendi A4 yerleşimimi
 *  yazmıyorum: sığmayan etiketi sessizce DÜŞÜREN bir yerleşim, eksik
 *  yapıştırılmış raf demektir ve eksikliği kimse görmez.
 * ============================================================================
 */
export default async function RafEtiketleriSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await sayfaIzni("ayar.yaz");
  const { q } = await searchParams;
  const arama = (q ?? "").trim();

  const konumlar = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  /**
   * ⭐ SÜZGEÇ LİSTE EKRANIYLA AYNI GÖVDEDEN (İlke #10, K289-③).
   * Kendi `includes` koşulumu yazsaydım iki ekran aynı aramaya farklı cevap
   * verirdi: listede 24 raf, etikette 25. Kullanıcı hangisine inanacağını
   * bilemez — ve YANLIŞ olan hangisiyse onu duvara yapıştırır.
   */
  const { gorunen, tamEslesme, benzerSayisi } = rafAramasi(konumlar, arama);

  const t = await getTranslations("Raf");

  /**
   * ⛔ SVG YALNIZ GÖRÜNEN RAFLAR İÇİN ÜRETİLİR — "sayı = liste = KÂĞIT".
   * Bütün raflar için üretip ekranda süzmek, yazdırmada süzülmemiş kümenin
   * basılması yolunu açık bırakırdı; burada basılacak küme ile ekrandaki
   * küme TEK yerden geliyor.
   */
  const etiketler = await Promise.all(
    gorunen.map(async (konum) => ({
      id: konum.id,
      code: konum.code,
      name: konum.name,
      /**
       * ⭐ TEK ÇAĞRI, TEK DEĞER — `konum.code` üç gösterime de o gövdeden
       * dağılıyor. Ekran kendi kodunu ÜRETMİYOR: burada bir dize birleştirme
       * yapılsaydı etiketin taşıdığı kimlik veritabanındakinden ayrışabilirdi.
       */
      svg: await rafEtiketiSvg(konum.code),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <ListeyeDon href="/ayarlar/konumlar">{t("baslik")}</ListeyeDon>
          <h1 className="mt-1 text-2xl font-semibold">
            {t("etiketlerBasligi")}
          </h1>
          {/*
            ⚠ SÜZGEÇ AÇIKKEN SAYI NEYİ SAYDIĞINI SÖYLER (İlke #17): «24 raf»
            değil, «67 aktif rafın 24 tanesi». Yoksa süzgeci unutan biri
            deponun tamamını bastığını sanır ve eksiği ancak duvarda fark eder.
          */}
          <p className="text-muted-foreground text-sm">
            {arama
              ? t("etiketlerSuzulmus", {
                  sayi: etiketler.length,
                  toplam: konumlar.length,
                })
              : t("etiketlerOzeti", { sayi: konumlar.length })}
          </p>
          {arama && tamEslesme ? (
            <p className="text-muted-foreground text-xs">
              {t("aramaTamEslesme", { q: arama, sayi: benzerSayisi })}
            </p>
          ) : null}
          {/*
            ⚠ ÖLÇÜ EKRANDA YAZAR: 50×30 mm termal etiket. Kullanıcı yazıcıya
            hangi rulonun takılacağını bilmeden basarsa etiketler kayar ve
            bunu ancak yapıştırırken fark eder.
          */}
          <p className="text-muted-foreground text-xs">
            {t("etiketOlcusu", { en: ETIKET_EN_MM, boy: ETIKET_BOY_MM })}
          </p>
        </div>
        <YazdirButonu />
      </div>

      {/*
        ⚠ ARAMA KUTUSU YAZDIRMADA GİZLİ, AMA SONUCU KÂĞIDA GEÇER: basılan
        küme ekrandaki kümedir. Kullanıcı 11.11.2026: «yeni atadığım rafların
        barkodunu çıkarmak istiyorum, hepsini tekrar çıkarmam lazım».
      */}
      {konumlar.length > 0 ? (
        <div className="space-y-1 print:hidden">
          <KodAramaKutusu
            temelAdres="/ayarlar/konumlar/etiketler"
            baslangic={arama}
            tasinanlar={{}}
            ipucu={t("aramaIpucu")}
            kameraBasligi={t("kameraBasligi")}
          />
          <p className="text-muted-foreground text-xs">
            {t("etiketlerAramaNotu")}
          </p>
        </div>
      ) : null}

      {arama && etiketler.length === 0 ? (
        /*
          ⛔ BOŞ ARAMA SONUCU «AKTİF RAF YOK» DEMEZ. İkisi apayrı şeydir:
          biri «depoda raf tanımlı değil», öteki «bu aramaya uyan raf yok».
          Karıştırılırsa kullanıcı var olan raflarını kaybolmuş sanır.
        */
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm print:hidden">
          {t("aramaBos", { q: arama })}
        </p>
      ) : etiketler.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center print:hidden">
          <p className="font-medium">{t("aktifRafYok")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t.rich("aktifRafYokIpucu", {
              baglanti: (parca) => (
                <Link
                  href="/ayarlar/konumlar"
                  className="text-primary hover:text-primary/80"
                >
                  {parca}
                </Link>
              ),
            })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3 print:gap-2">
          {etiketler.map((etiket) => (
            <div
              key={etiket.id}
              className="flex break-inside-avoid flex-col items-center gap-1 rounded-lg border border-black/30 p-2 text-center"
            >
              <div
                className="w-full [&>svg]:h-auto [&>svg]:w-full"
                // SVG sunucuda üretildi (Code128 + qrcode paketi); dış girdi yok.
                dangerouslySetInnerHTML={{ __html: etiket.svg }}
              />
              {/*
                ⚠ AD YALNIZ EKRANDA — ETİKETTE DEĞİL. Bölüm adı raf KİMLİĞİNİN
                parçası değil; etikete basılsaydı bölüm yeniden adlandırıldığında
                duvardaki etiket yalancı olurdu. Kimlik koddur.
              */}
              {etiket.name ? (
                <div className="text-muted-foreground text-xs leading-tight print:hidden">
                  {etiket.name}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
