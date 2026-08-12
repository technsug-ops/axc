/**
 * ============================================================================
 *  CANLI SAĞLIK KONTROLÜ — TEK KOMUT
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:test
 *
 *  NE ZAMAN KULLANILIR: Veritabanı parolası değiştirildikten sonra, Vercel
 *  ortam değişkeni güncellenip yeniden dağıtım (redeploy) yapıldıktan sonra.
 *  "Site açılıyor mu, veritabanına bağlanabiliyor mu, dün gece yedek alınmış
 *  mı" sorularının üçünü tek seferde cevaplar.
 *
 *  DÖRT KONTROL:
 *    1. Giriş sayfası açılıyor mu            (200 bekleriz)
 *    2. Korumalı sayfa gerçekten kapalı mı   (307 -> /giris bekleriz)
 *    3. Veritabanı bağlantısı ve şema        (gerçek sorgu)
 *    4. Son gece yedeği var mı, kaç günlük
 *
 *  ATLANAN KONTROL BAŞARI SAYILMAZ. Yapılandırma eksikse o kontrol "ATLANDI"
 *  olarak raporlanır ve özet bunu ayrıca yazar — "hepsi yeşil" izlenimi
 *  vermek, olmayan bir güvenceyi satmaktır.
 *
 *  PAROLA HİÇBİR ZAMAN EKRANA YAZILMAZ. Çıktı ekran görüntüsü olarak
 *  paylaşılabilir.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  CANLI_DOSYA,
  canliYapilandirma,
  kurulumuAnlat,
  parolayiTemizle,
} from "./canli-ortak";

/** Korumalı olduğu varsayılan sayfa — giriş yoksa /giris'e atmalı. */
const KORUMALI_YOL = "/urunler";

/** Yedek bu kadar günden eskiyse uyarı verilir. */
const YEDEK_UYARI_GUNU = 2;

const ZAMAN_ASIMI_MS = 15000;

let gecti = 0;
let kaldi = 0;
let atlandi = 0;

function basarili(mesaj: string) {
  gecti++;
  console.log(`  ✓  ${mesaj}`);
}
function basarisiz(mesaj: string, ayrinti?: string) {
  kaldi++;
  console.log(`  ✗  ${mesaj}`);
  if (ayrinti) console.log(`     ${ayrinti}`);
}
function atla(mesaj: string, nasil: string) {
  atlandi++;
  console.log(`  ·  ATLANDI — ${mesaj}`);
  console.log(`     ${nasil}`);
}

/** Yönlendirmeyi İZLEMEZ: 307'yi 200'e çevirseydik koruma kontrolü anlamsız olurdu. */
async function istek(adres: string) {
  const iptal = AbortSignal.timeout(ZAMAN_ASIMI_MS);
  const yanit = await fetch(adres, { redirect: "manual", signal: iptal });
  return { kod: yanit.status, konum: yanit.headers.get("location") };
}

async function main() {
  console.log("\nCANLI SAĞLIK KONTROLÜ\n");

  const sonuc = canliYapilandirma();
  if (!sonuc.tamam) {
    if (sonuc.hata.kod === "DOSYA_YOK") {
      basarisiz(`${CANLI_DOSYA} bulunamadı.`);
      kurulumuAnlat();
    } else if (sonuc.hata.kod === "EKSIK") {
      basarisiz(`${CANLI_DOSYA} eksik: ${sonuc.hata.eksikler.join(", ")}`);
    } else if (sonuc.hata.kod === "BOS") {
      basarisiz(`${CANLI_DOSYA} içinde bağlantı bilgisi yok.`);
      kurulumuAnlat();
    } else {
      basarisiz("Bağlantı adresi okunamadı.");
      console.log("     Biçim: mysql://kullanici:parola@sunucu:3306/veritabani");
    }
    process.exitCode = 1;
    return;
  }

  const yapi = sonuc.veri;
  const temizle = (m: string) => parolayiTemizle(m, yapi.parola);

  console.log("HEDEF (parola gizli)");
  console.log(`  site        ${yapi.siteAdresi ?? "— (CANLI_ADRES yazılmamış)"}`);
  console.log(`  sunucu      ${yapi.adres.hostname}`);
  console.log(`  veritabanı  ${yapi.adres.pathname.slice(1)}`);
  console.log(`  kullanıcı   ${yapi.adres.username}`);

  // ---------------------------------------------------------------- 1 ve 2
  console.log("\n1) GİRİŞ SAYFASI");
  if (yapi.siteAdresi === null) {
    atla(
      "site adresi bilinmiyor",
      `${CANLI_DOSYA} içine ekleyin:  CANLI_ADRES=https://siteniz.vercel.app`,
    );
    console.log("\n2) KORUMALI SAYFA");
    atla("site adresi bilinmiyor", "yukarıdaki satır eklenince bu da çalışır");
  } else {
    try {
      const { kod } = await istek(`${yapi.siteAdresi}/giris`);
      if (kod === 200) basarili(`/giris açılıyor (200)`);
      else if (kod === 401)
        basarisiz(
          `/giris 401 döndü`,
          "Vercel Authentication (kapı kilidi) açık olabilir — o katman kapalıyken bu kontrol çalışmaz.",
        );
      else basarisiz(`/giris beklenmedik yanıt: ${kod}`);
    } catch (e) {
      basarisiz("/giris adresine ulaşılamadı", temizle(String(e)));
    }

    console.log("\n2) KORUMALI SAYFA");
    try {
      const { kod, konum } = await istek(`${yapi.siteAdresi}${KORUMALI_YOL}`);
      if (kod === 307 || kod === 302) {
        const girise = (konum ?? "").includes("/giris");
        if (girise) basarili(`${KORUMALI_YOL} girişe yönlendiriyor (${kod})`);
        else basarisiz(`${KORUMALI_YOL} yönlendirdi ama girişe değil`, `konum: ${konum}`);
      } else if (kod === 200) {
        // AÇIK KAPI: sayfanın kendisi geldiyse oturum kontrolü çalışmıyor.
        basarisiz(
          `${KORUMALI_YOL} OTURUMSUZ AÇILDI (200) — sayfa korumasız!`,
          "Bu ciddi bir bulgudur: veriler internete açık demektir.",
        );
      } else {
        basarisiz(`${KORUMALI_YOL} beklenmedik yanıt: ${kod}`);
      }
    } catch (e) {
      basarisiz(`${KORUMALI_YOL} adresine ulaşılamadı`, temizle(String(e)));
    }
  }

  // -------------------------------------------------------------------- 3
  console.log("\n3) VERİTABANI");
  if (yapi.yerelMi) {
    basarisiz(
      "BU ADRES YEREL VERİTABANI — canlı kontrol edilmedi.",
      `${CANLI_DOSYA} içine üretim adresini yazın.`,
    );
  } else {
    const prisma = new PrismaClient({ adapter: new PrismaMariaDb(yapi.ham) });
    try {
      await prisma.$queryRaw`SELECT 1`;
      basarili("bağlantı ve parola geçti");

      const [urun, satis, hareket] = await Promise.all([
        prisma.product.count(),
        prisma.sale.count(),
        prisma.stockMovement.count(),
      ]);
      basarili(
        `şema yerinde — ${urun} ürün · ${satis} satış · ${hareket} stok hareketi`,
      );
    } catch (e) {
      // Parola değişiminden sonra en olası hata budur; teşhisi açık yaz.
      basarisiz("veritabanına bağlanılamadı", temizle(String(e)));
      console.log(
        "     Parolayı yeni değiştirdiyseniz: .env.canli güncellendi mi?",
      );
      console.log(
        "     Site de hata veriyorsa Vercel'de DATABASE_URL güncellenip",
      );
      console.log("     YENİDEN DAĞITIM (redeploy) yapıldı mı?");
    } finally {
      await prisma.$disconnect();
    }
  }

  // -------------------------------------------------------------------- 4
  console.log("\n4) SON GECE YEDEĞİ");
  if (yapi.blobJetonu === null) {
    atla(
      "yedek deposu jetonu yok",
      `${CANLI_DOSYA} içine ekleyin:  BLOB_READ_WRITE_TOKEN=... (Vercel > Storage > Blob)`,
    );
  } else {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({
        prefix: "yedek/",
        token: yapi.blobJetonu,
      });

      if (blobs.length === 0) {
        basarisiz(
          "hiç yedek bulunamadı",
          "Gece işi (cron) hiç çalışmamış olabilir. Vercel > Deployments > Cron günlüğüne bakın.",
        );
      } else {
        const enYeni = blobs.reduce((a, b) =>
          new Date(a.uploadedAt) > new Date(b.uploadedAt) ? a : b,
        );
        const tarih = new Date(enYeni.uploadedAt);
        const gunFarki = Math.floor(
          (Date.now() - tarih.getTime()) / (24 * 60 * 60 * 1000),
        );
        const ad = enYeni.pathname.replace(/^yedek\//, "");
        const kb = Math.max(1, Math.round(enYeni.size / 1024));
        const ozet = `${ad} · ${kb} KB · ${gunFarki} gün önce · toplam ${blobs.length} yedek`;

        if (gunFarki <= YEDEK_UYARI_GUNU) basarili(`son yedek: ${ozet}`);
        else
          basarisiz(
            `son yedek ${gunFarki} GÜNLÜK — gece işi durmuş olabilir`,
            ozet,
          );
      }
    } catch (e) {
      basarisiz("yedek deposu okunamadı", temizle(String(e)));
    }
  }

  // ----------------------------------------------------------------- ÖZET
  console.log("\n" + "=".repeat(62));
  console.log(`  ${gecti} geçti · ${kaldi} kaldı · ${atlandi} atlandı`);
  if (atlandi > 0) {
    console.log(
      "  ATLANAN KONTROL BAŞARI DEĞİLDİR — yukarıdaki satırları ekleyin.",
    );
  }
  if (kaldi > 0) process.exitCode = 1;
  console.log("");
}

main().catch((e) => {
  console.log(`  ✗  beklenmeyen hata: ${e}`);
  process.exitCode = 1;
});
