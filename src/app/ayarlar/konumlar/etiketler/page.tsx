import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";

import { GeriBaglanti } from "@/components/baglanti";
import { ETIKET_BOY_MM, ETIKET_EN_MM, rafEtiketiSvg } from "@/lib/depo/etiket";
import { prisma } from "@/lib/prisma";

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
export default async function RafEtiketleriSayfasi() {
  await sayfaIzni("ayar.yaz");

  const konumlar = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  const t = await getTranslations("Raf");

  const etiketler = await Promise.all(
    konumlar.map(async (konum) => ({
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
          <GeriBaglanti href="/ayarlar/konumlar">{t("baslik")}</GeriBaglanti>
          <h1 className="mt-1 text-2xl font-semibold">
            {t("etiketlerBasligi")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("etiketlerOzeti", { sayi: etiketler.length })}
          </p>
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

      {etiketler.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center print:hidden">
          <p className="font-medium">{t("aktifRafYok")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t.rich("aktifRafYokIpucu", {
              baglanti: (parca) => (
                <Link
                  href="/ayarlar/konumlar"
                  className="underline underline-offset-4"
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
