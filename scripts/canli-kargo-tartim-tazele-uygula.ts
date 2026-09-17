import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";
import { kanalTahminiHesapla, kargoTartimGeldiTazele } from "../src/lib/kargo-tartim-tazele";

/**
 * ============================================================================
 *  GERİYE DÖNÜK: MEKANİZMA KURULMADAN ÖNCE BİRİKEN SİPARİŞLERİ TAZELE
 * ----------------------------------------------------------------------------
 *      Kuru koşum:  npm run canli:kargo-tartim-tazele-uygula
 *      Yazım:       npm run canli:kargo-tartim-tazele-uygula -- --yaz
 *
 *  BETIK SINIFI: TEK_SEFERLIK — `kargoTartimGeldiTazele` mekanizması
 *  15.09.2026'da canlı içe aktarma betiklerine (`canli-ty-ice-aktar.ts`,
 *  `canli-hb-ice-aktar.ts`) bağlandı; bundan sonra doğan her sipariş kendi
 *  içe aktarma turunda otomatik yakalanır. Bu betik YALNIZ o tarihten ÖNCE
 *  birikmiş (kanalKargoDesi zaten dolu, cargoAmount hâlâ boş) siparişleri
 *  bir kez tazeler.
 *
 *  ⚠ YİNE DE İDEMPOTENTTİR: liste sabit değil, ÖLÇÜTTEN türetilir
 *  (`cargoAmount` boş + `kanalKargoDesi` dolu). Bir daha koşulursa bugün
 *  sıfır aday bulur (mekanizma yeni doğanları anında yakalıyor); regresyon
 *  olursa yine güvenle çalışır.
 *  _(Anayasa: "geri alma yolu saklanan listeye değil yeniden hesaplanabilir
 *  ölçüte dayanır".)_
 *
 *  ⛔ 1 AĞUSTOS 2025 ÖNCESİ HİÇ TARANMAZ — iş takviminin miladı.
 *
 *  ⛔ KAPSAM DAR TUTULDU (kullanıcı kararı 15.09.2026): yalnız "hâlâ tahmin
 *  aşamasındaki" sipariş (`cargoAmount` boş) düzeltilir. Kargo firması hiç
 *  seçilmemiş ~1325 siparişte kargo maliyetinin sessizce ₺0 sayılması AYRI
 *  ve DAHA BÜYÜK bir konu — bilerek KAPSAM DIŞI bırakıldı, bu betik ona
 *  dokunmaz.
 *
 *  ⭐ GERİ ALMA: her tazeleme `KARGO_TAHMIN_TARTIMLA_TAZELE` izini eski
 *  `tahminiKargo` değeriyle birlikte `AuditLog`a yazar — geri alınması
 *  gerekirse kaynak odur, bu betiğin çıktısı değil.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const IS_MILADI = new Date("2025-08-01T00:00:00.000Z");

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  GERİYE DÖNÜK KARGO TARTIM TAZELEME");
  console.log(`  kip: ${YAZ ? "YAZIM" : "KURU KOŞUM (önizleme)"}`);
  console.log("=".repeat(78));

  const adaylar = await prisma.sale.findMany({
    where: {
      iptalTarihi: null,
      cargoAmount: null,
      kanalKargoDesi: { not: null },
      soldAt: { gte: IS_MILADI },
    },
    select: {
      id: true,
      code: true,
      soldAt: true,
      kanalKargoDesi: true,
      kanalKargoFirmasi: true,
      tahminiKargo: true,
      net2Amount: true,
      channelAccount: { select: { channelId: true, channel: { select: { name: true } } } },
    },
    orderBy: { soldAt: "asc" },
  });

  console.log(
    `\nADAY (kanalKargoDesi dolu, cargoAmount boş, ${IS_MILADI.toISOString().slice(0, 10)} sonrası): ${adaylar.length}\n`,
  );

  let tazelenebilir = 0;
  let firmaBilinmiyor = 0;
  let tarifeYok = 0;
  let digerAtlanan = 0;
  let yazilan = 0;

  for (const s of adaylar) {
    const desi = Number(s.kanalKargoDesi!.toString());
    const kanalAdi = s.channelAccount.channel.name;
    const hesap = await kanalTahminiHesapla(prisma, {
      kanalAdi,
      channelId: s.channelAccount.channelId,
      kanalKargoFirmasi: s.kanalKargoFirmasi,
      desi,
      soldAt: s.soldAt,
    });
    const eskiTahmin = s.tahminiKargo === null ? null : Number(s.tahminiKargo.toString());
    const eskiNet2 = s.net2Amount === null ? null : Number(s.net2Amount.toString());

    if (!hesap.tamam) {
      if (hesap.kod === "FIRMA_BILINMIYOR" || hesap.kod === "FIRMA_YOK") firmaBilinmiyor++;
      else if (hesap.kod === "TARIFE_YOK") tarifeYok++;
      else digerAtlanan++;
      console.log(
        `  ⏭  ${s.code}  ${kanalAdi}  desi=${desi}  firma=${s.kanalKargoFirmasi ?? "—"}  → ${hesap.kod} (atlandı, uydurulmadı)`,
      );
      continue;
    }
    tazelenebilir++;
    console.log(
      `  ${YAZ ? "→" : "○"} ${s.code}  ${kanalAdi}  desi=${desi}  firma=${hesap.carrierAdi}` +
        `  eski tahmin=${eskiTahmin?.toFixed(2) ?? "—"}  YENİ tahmin=${hesap.tutar.toFixed(2)}` +
        `  eski NET-2=${eskiNet2?.toFixed(2) ?? "—"}`,
    );

    if (YAZ) {
      const sonuc = await kargoTartimGeldiTazele(
        {
          saleId: s.id,
          channelId: s.channelAccount.channelId,
          kanalAdi,
          kanalKargoFirmasi: s.kanalKargoFirmasi,
          kanalKargoDesi: desi,
          cargoAmount: null,
          tahminiKargo: eskiTahmin,
          soldAt: s.soldAt,
        },
        /** ⛔ BU BETİĞİN KENDİ CANLI İSTEMCİSİ — global `prisma` DEĞİL. */
        prisma,
      );
      if (sonuc.yapildi) {
        yazilan++;
        const guncel = await prisma.sale.findUnique({ where: { id: s.id }, select: { net2Amount: true } });
        console.log(`      ✓ YAZILDI — yeni NET-2=${guncel?.net2Amount?.toString() ?? "—"}`);
      } else {
        console.log(`      ⛔ YAZILAMADI (aradaki turda değişmiş olabilir): ${sonuc.neden}`);
      }
    }
  }

  console.log("\n" + "=".repeat(78));
  console.log(`  TAZELENEBİLİR (firma+tarife bulundu)         ${tazelenebilir}`);
  console.log(`  FİRMA BİLİNMİYOR/YOK (atlandı, uydurulmadı)  ${firmaBilinmiyor}`);
  console.log(`  TARİFE YOK (atlandı)                         ${tarifeYok}`);
  if (digerAtlanan > 0) console.log(`  DİĞER ATLANAN                                ${digerAtlanan}`);
  if (YAZ) console.log(`  YAZILAN                                      ${yazilan}`);
  console.log(YAZ ? "\n  YAZILDI." : "\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --yaz");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
