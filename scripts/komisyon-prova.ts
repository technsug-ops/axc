/**
 * ============================================================================
 *  KOMİSYON İÇE AKTARMA — YEREL UÇTAN UCA PROVA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run komisyon:prova
 *
 *  `komisyon:dogrula`dan FARKI: o saf hesabı sınar (veritabanına gitmez),
 *  bu ise GERÇEK YAZMA YOLUNU sınar. Uç noktanın çağırdığı iki fonksiyonu
 *  (komisyonDenetle + komisyonYaz) gerçekten koşar: sentetik bir Hepsiburada
 *  ürün listesi üretir, denetler, yazar, veritabanından geri okuyup doğrular,
 *  aynı dosyayı ikinci kez yükleyip idempotentliği ölçer, hata yollarını
 *  dener ve en sonda açtığı her kaydı siler.
 *
 *  ⚠ BU BETİK YAZAR. Bu yüzden CANLI ADRESTE ÇALIŞMAYI REDDEDER: aşağıdaki
 *  kontrol, bağlantı adresi yerel değilse betiği hiç başlatmadan durdurur.
 *  Doğrulama betiklerinin canlı veriye kayıt açması, bir gün mutlaka
 *  yaşanacak bir kaza olurdu.
 *
 *  Açılan tüm kayıtların kodu "PROVA-" ile başlar; temizlik `finally`
 *  içindedir, kontroller patlasa bile koşar.
 * ============================================================================
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { xlsxUret } from "../src/lib/disa-aktarma/xlsx";
import { komisyonDenetle, komisyonYaz } from "../src/lib/komisyon/yukle";

const ON_EK = "PROVA-";
let gecti = 0;
let kaldi = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  if (kosul) {
    gecti++;
    console.log(`  OK    ${ad}`);
  } else {
    kaldi++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/** HB "Listelerim" biçiminde sentetik dosya. */
async function hbDosyaUret(
  satirlar: { sku: string; satici: string; oran: string; barkod: string; ad: string }[],
): Promise<Buffer> {
  return xlsxUret([
    {
      ad: "Listelerim",
      basliklar: [
        "UniqueIdentifier",
        "Buybox Sırası",
        "Satıcı Stok Kodu",
        "SKU",
        "Ürün Adı",
        "Komisyon Oranı",
        "Barkod",
      ],
      satirlar: satirlar.map((s) => [
        null,
        "0",
        s.satici,
        s.sku,
        s.ad,
        s.oran,
        s.barkod,
      ]),
    },
  ]);
}

/**
 * YEREL Mİ? Yazan bir betiğin canlı veritabanına bağlanması yasak.
 * Adres ayrıştırılamıyorsa da REDDEDİLİR — "emin değilim" hâli, yazmaya
 * devam etmek için yeterli sebep değildir.
 */
function yerelMi(adres: string | undefined): boolean {
  if (!adres) return false;
  try {
    const sunucu = new URL(adres).hostname.toLowerCase();
    return sunucu === "localhost" || sunucu === "127.0.0.1" || sunucu === "::1";
  } catch {
    return false;
  }
}

async function main() {
  if (!yerelMi(process.env.DATABASE_URL)) {
    console.log("\nKOŞULMADI — bu betik YAZAR ve yalnız yerel veritabanında çalışır.");
    console.log("DATABASE_URL yerel bir sunucuya (localhost) işaret etmiyor.\n");
    process.exit(1);
  }

  // ------------------------------------------------------------------ HAZIRLIK
  const kanal = await prisma.channel.findFirst({ where: { code: "HEPSIBURADA" } });
  if (!kanal) throw new Error("HEPSIBURADA kanalı yerelde yok");

  const kategori = await prisma.category.findFirst();
  if (!kategori) throw new Error("yerelde hiç kategori yok");

  const hesap = await prisma.channelAccount.create({
    data: {
      channelId: kanal.id,
      code: `${ON_EK}HESAP`,
      name: `${ON_EK}Mağaza`,
      defaultCurrency: "TRY",
      satisIcin: true,
    },
  });

  const alisHesabi = await prisma.channelAccount.create({
    data: {
      channelId: kanal.id,
      code: `${ON_EK}ALIS`,
      name: `${ON_EK}Alış`,
      defaultCurrency: "TRY",
      alisIcin: true,
    },
  });

  const urun = await prisma.product.create({
    data: {
      name: `${ON_EK}Ürün`,
      categoryId: kategori.id,
      variants: {
        create: [
          // 1) eşlemesi olacak, oranı BOŞ
          { sku: `${ON_EK}V1`, companySku: `${ON_EK}V1`, barcode: `${ON_EK}B1`, isDefault: true },
          // 2) eşlemesi olacak, oranı DOLU ve dosyadan farklı
          { sku: `${ON_EK}V2`, companySku: `${ON_EK}V2`, barcode: `${ON_EK}B2` },
          // 3) eşlemesi YOK, barkodu var -> yeni eşleme açılmalı
          { sku: `${ON_EK}V3`, companySku: `${ON_EK}V3`, barcode: `${ON_EK}B3` },
          // 4) eşlemesi olacak, oran AYNI kalacak
          { sku: `${ON_EK}V4`, companySku: `${ON_EK}V4`, barcode: `${ON_EK}B4` },
          // 5) eşlemesi olacak, oranı BOŞ ama DOSYADA HİÇ GEÇMEYECEK.
          //    Pazaryerinde listeden kalkmış ürünün karşılığı: yazımdan
          //    sonra oranı boş KALIR ve kullanıcıya sayısı söylenmelidir.
          { sku: `${ON_EK}V5`, companySku: `${ON_EK}V5`, barcode: `${ON_EK}B5` },
        ],
      },
    },
    include: { variants: true },
  });
  const v = Object.fromEntries(urun.variants.map((x) => [x.sku, x.id])) as Record<string, string>;

  await prisma.channelSku.createMany({
    data: [
      { channelAccountId: hesap.id, variantId: v[`${ON_EK}V1`], channelSku: `${ON_EK}SKU1` },
      {
        channelAccountId: hesap.id,
        variantId: v[`${ON_EK}V2`],
        channelSku: `${ON_EK}SKU2`,
        commissionRate: "10",
      },
      {
        channelAccountId: hesap.id,
        variantId: v[`${ON_EK}V4`],
        channelSku: `${ON_EK}SKU4`,
        commissionRate: "12.5",
      },
      // Dosyada geçmeyecek, oranı boş: kapanış rakamının kaynağı.
      { channelAccountId: hesap.id, variantId: v[`${ON_EK}V5`], channelSku: `${ON_EK}SKU5` },
    ],
  });

  const dosya = await hbDosyaUret([
    // SKU ile eşleşir, boş oran dolar
    { sku: `${ON_EK}SKU1`, satici: "-", oran: "13%", barkod: `${ON_EK}B1`, ad: "bir" },
    // SKU ile eşleşir, dolu oran DEĞİŞİR (10 -> 16,67)
    { sku: `${ON_EK}SKU2`, satici: "-", oran: "16,67%", barkod: `${ON_EK}B2`, ad: "iki" },
    // Eşleme yok; barkod varyanta gider -> YENİ eşleme (kod = dosyadaki SKU)
    { sku: `${ON_EK}SKU3`, satici: "-", oran: "18%", barkod: `${ON_EK}B3`, ad: "üç" },
    // Oran aynı -> yazıma girmez
    { sku: `${ON_EK}SKU4`, satici: "-", oran: "12,5%", barkod: `${ON_EK}B4`, ad: "dört" },
    // Katalogda yok
    { sku: `${ON_EK}YOK`, satici: "-", oran: "20%", barkod: `${ON_EK}BYOK`, ad: "beş" },
    // Oran okunamaz
    { sku: `${ON_EK}SKU1`, satici: "-", oran: "abc", barkod: `${ON_EK}B1`, ad: "altı" },
  ]);

  try {
    // ---------------------------------------------------------------- DENETLE
    console.log("\n1) DENETLE");
    const denetim = await komisyonDenetle(dosya, hesap.id);
    if (denetim.durum !== "ONIZLEME") {
      kontrol("önizleme üretildi", false, denetim);
      return;
    }
    const o = denetim.onizleme;
    console.log("     sayım:", o.sayim);
    kontrol("platform HEPSIBURADA", o.platform === "HEPSIBURADA");
    kontrol('sayfa "Listelerim"', o.sayfa === "Listelerim", o.sayfa);
    kontrol("okunan 6", o.sayim.okunan === 6, o.sayim.okunan);
    kontrol("boş dolan 1", o.sayim.bosDolan === 1, o.sayim.bosDolan);
    kontrol("değişen 1", o.sayim.degisen === 1, o.sayim.degisen);
    kontrol("aynı kalan 1", o.sayim.ayniKalan === 1, o.sayim.ayniKalan);
    kontrol("yeni eşleme 1", o.sayim.yeniEsleme === 1, o.sayim.yeniEsleme);
    kontrol("katalogda yok 1", o.sayim.katalogdaYok === 1, o.sayim.katalogdaYok);
    kontrol("oran okunamadı 1", o.sayim.oranOkunamadi === 1, o.sayim.oranOkunamadi);
    kontrol("yazılacak 3", o.yazilacak === 3, o.yazilacak);
    kontrol(
      "değişen örneği 10 -> 16,67",
      o.degisenOrnekleri[0]?.eskiOran === 10 && o.degisenOrnekleri[0]?.yeniOran === 16.67,
      o.degisenOrnekleri[0],
    );
    /**
     * KAPANIŞ RAKAMI ÖNİZLEMEDE DE VAR (mimar kararı 13.08.2026):
     * SKU5 dosyada geçmiyor, oranı boş — yazımdan sonra da boş kalacak ve
     * kullanıcı bunu ONAYDAN ÖNCE görmeli.
     */
    kontrol("önizleme: oranı boş kalacak 1", o.sayim.kalanBosOran === 1, o.sayim.kalanBosOran);
    kontrol(
      "önizleme: kalan örneği SKU5'i gösterir",
      o.kalanBosOranOrnekleri[0]?.kanalKodu === `${ON_EK}SKU5`,
      o.kalanBosOranOrnekleri,
    );
    kontrol("denetim HİÇBİR ŞEY YAZMADI", (await prisma.channelSku.count({ where: { channelAccountId: hesap.id } })) === 4);

    // ------------------------------------------------------------------- YAZ
    console.log("\n2) YAZ");
    const yazim = await komisyonYaz(hesap.id, denetim.yazim);
    kontrol("2 güncelleme yazıldı", yazim.guncellenen === 2, yazim);
    kontrol("1 yeni eşleme açıldı", yazim.yaratilan === 1, yazim);
    /**
     * Bu sayı TAHMİN DEĞİL ÖLÇÜM: yazımdan sonra aynı transaction içinde
     * sayılıyor. Önizlemedeki 1 ile birebir tutmalı, yoksa kullanıcıya
     * verilen kapanış rakamı ile ekranın gösterdiği çelişirdi.
     */
    kontrol("yazım sonrası oranı boş kalan 1 (ölçüm)", yazim.kalanBosOran === 1, yazim);

    const sonrasi = await prisma.channelSku.findMany({
      where: { channelAccountId: hesap.id },
      select: {
        channelSku: true,
        variantId: true,
        commissionRate: true,
        commissionUpdatedAt: true,
        isActive: true,
      },
      orderBy: { channelSku: "asc" },
    });
    const bul = (kod: string) => sonrasi.find((s) => s.channelSku === kod);

    /**
     * ORAN SAYISAL KARŞILAŞTIRILIR. Prisma Decimal'i "13.00" değil "13"
     * diye veriyor (sondaki sıfırlar düşüyor); metin karşılaştırması
     * doğru değeri yanlış sanır.
     */
    const oranDegeri = (kod: string) => Number(bul(kod)?.commissionRate ?? NaN);

    kontrol(
      "SKU1 oranı 13",
      oranDegeri(`${ON_EK}SKU1`) === 13,
      bul(`${ON_EK}SKU1`)?.commissionRate?.toString(),
    );
    kontrol(
      "SKU2 oranı 16,67 (üzerine yazıldı)",
      oranDegeri(`${ON_EK}SKU2`) === 16.67,
      bul(`${ON_EK}SKU2`)?.commissionRate?.toString(),
    );
    kontrol(
      "SKU4 oranı 12,5 (dokunulmadı)",
      oranDegeri(`${ON_EK}SKU4`) === 12.5,
      bul(`${ON_EK}SKU4`)?.commissionRate?.toString(),
    );
    kontrol("yeni eşleme SKU3 açıldı", bul(`${ON_EK}SKU3`) !== undefined);
    kontrol(
      "yeni eşleme doğru varyanta bağlı",
      bul(`${ON_EK}SKU3`)?.variantId === v[`${ON_EK}V3`],
    );
    kontrol(
      "yeni eşleme oranı 18",
      oranDegeri(`${ON_EK}SKU3`) === 18,
      bul(`${ON_EK}SKU3`)?.commissionRate?.toString(),
    );
    kontrol("yeni eşleme aktif", bul(`${ON_EK}SKU3`)?.isActive === true);
    kontrol(
      "güncellenen kayıtların komisyon damgası doldu",
      bul(`${ON_EK}SKU1`)?.commissionUpdatedAt !== null &&
        bul(`${ON_EK}SKU2`)?.commissionUpdatedAt !== null,
    );
    kontrol(
      "dokunulmayan kaydın damgası BOŞ kaldı (yalan söylemiyor)",
      bul(`${ON_EK}SKU4`)?.commissionUpdatedAt === null,
      bul(`${ON_EK}SKU4`)?.commissionUpdatedAt,
    );
    // 4 mevcut + 1 yeni açılan.
    kontrol("toplam eşleme 5", sonrasi.length === 5, sonrasi.length);

    // ------------------------------------------------------- İKİNCİ KOŞU
    console.log("\n3) AYNI DOSYA İKİNCİ KEZ (idempotentlik)");
    const ikinci = await komisyonDenetle(dosya, hesap.id);
    if (ikinci.durum !== "ONIZLEME") {
      kontrol("ikinci önizleme üretildi", false, ikinci);
    } else {
      kontrol("yazılacak 0", ikinci.onizleme.yazilacak === 0, ikinci.onizleme.yazilacak);
      kontrol(
        "hepsi aynı kalan (4)",
        ikinci.onizleme.sayim.ayniKalan === 4,
        ikinci.onizleme.sayim.ayniKalan,
      );
      kontrol("yeni eşleme 0", ikinci.onizleme.sayim.yeniEsleme === 0);
    }

    // ------------------------------------------------------ HATA YOLLARI
    console.log("\n4) HATA YOLLARI");
    const alisDenetimi = await komisyonDenetle(dosya, alisHesabi.id);
    kontrol(
      "alış hesabı reddedildi",
      alisDenetimi.durum === "HATA" &&
        alisDenetimi.hatalar[0].kod === "HESAP_SATIS_DEGIL",
      alisDenetimi,
    );

    const yokDenetimi = await komisyonDenetle(dosya, "olmayan-kimlik");
    kontrol(
      "olmayan hesap reddedildi",
      yokDenetimi.durum === "HATA" && yokDenetimi.hatalar[0].kod === "HESAP_YOK",
    );

    const bozukDosya = Buffer.from("bu bir xlsx değil");
    const bozukDenetim = await komisyonDenetle(bozukDosya, hesap.id);
    kontrol(
      "xlsx olmayan dosya reddedildi",
      bozukDenetim.durum === "HATA" &&
        bozukDenetim.hatalar[0].kod === "DOSYA_OKUNAMADI",
      bozukDenetim,
    );

    // Trendyol biçimli dosyayı HB hesabına yüklemek: PLATFORM_UYUSMAZ
    const tyDosya = await xlsxUret([
      {
        ad: "Ürünler",
        basliklar: ["Partner ID", "Barkod", "Komisyon Oranı", "Tedarikçi Stok Kodu"],
        satirlar: [["1", `${ON_EK}B1`, "15.0", "-"]],
      },
    ]);
    const uyusmaz = await komisyonDenetle(tyDosya, hesap.id);
    kontrol(
      "TY dosyası HB hesabına yüklenemez",
      uyusmaz.durum === "HATA" && uyusmaz.hatalar[0].kod === "PLATFORM_UYUSMAZ",
      uyusmaz,
    );

    const alakasiz = await xlsxUret([
      { ad: "Sayfa1", basliklar: ["Ad", "Soyad"], satirlar: [["a", "b"]] },
    ]);
    const taninmaz = await komisyonDenetle(alakasiz, hesap.id);
    kontrol(
      "alakasız dosya reddedildi",
      taninmaz.durum === "HATA" && taninmaz.hatalar[0].kod === "TANINMAYAN_DOSYA",
      taninmaz,
    );
  } finally {
    // ------------------------------------------------------------- TEMİZLİK
    console.log("\n5) TEMİZLİK");
    const silinenSku = await prisma.channelSku.deleteMany({
      where: { channelAccountId: { in: [hesap.id, alisHesabi.id] } },
    });
    await prisma.productVariant.deleteMany({ where: { productId: urun.id } });
    await prisma.product.delete({ where: { id: urun.id } });
    const silinenHesap = await prisma.channelAccount.deleteMany({
      where: { id: { in: [hesap.id, alisHesabi.id] } },
    });
    console.log(
      `     silindi: ${silinenSku.count} eşleme · 1 ürün + varyantları · ${silinenHesap.count} hesap`,
    );
    const kalanProva = await prisma.channelAccount.count({
      where: { code: { startsWith: ON_EK } },
    });
    kontrol("prova kaydı kalmadı", kalanProva === 0, kalanProva);

    console.log("");
    console.log(kaldi === 0 ? `TÜM KONTROLLER GEÇTİ (${gecti})` : `${kaldi} KONTROL BAŞARISIZ (${gecti + kaldi})`);
    await prisma.$disconnect();
    process.exit(kaldi === 0 ? 0 : 1);
  }
}

main();
