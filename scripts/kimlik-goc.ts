/**
 * ============================================================================
 *  KİMLİK GÖÇÜ — pazaryeri kodunu SKU'dan çıkar, kanal koduna taşı
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run kimlik:goc              -> ÖNİZLEME (hiçbir şey yazmaz)
 *      npm run kimlik:goc -- --prova   -> PROVA: gerçekten yazar, sonra GERİ ALIR
 *      npm run kimlik:goc -- --yaz     -> uygular
 *      npm run kimlik:goc -- --canli   -> canlıya bakar (.env.canli)
 *
 *  PROVA NEDEN VAR: 1038 satırlık bir yazımı, hiç çalıştırılmamış bir kodla
 *  canlıda denemek kabul edilemez. Prova kipi işlemin TAMAMINI gerçek veriyle
 *  yürütür (kanal kodları yazılır, sku'lar özdeşleşir, sayım doğrulanır) ve
 *  sonra bilerek hata fırlatıp her şeyi geri alır. Yazma yolu gerçekten
 *  sınanmış olur, tek satır bile kalıcı değişmez.
 *
 *  NEDEN VAR (ölçüldü 12.08.2026, 1054 ürünlük gerçek katalog):
 *  İçe aktarmada `sku` alanına pazaryeri kodu yazılmış:
 *      sku=HBCV00004IA2P8   firmaSku=axcali2278   barkod=8683650134350
 *  Oysa ilke şu: 1 ürün = 1 İÇ KİMLİK (SKU = Firma SKU) + N TAKMA AD
 *  (kanal kodları). Pazaryeri kodu iç kimlik değil, takma addır.
 *
 *  ÖLÇÜM — göç güvenli mi:
 *      Firma SKU 1065 dolu · 1065 BENZERSİZ · tekrar eden 0
 *      sku := companySku yapılsa başka satırın sku'suyla çakışan: 0
 *      HB ile başlayan sku 1038 · benzersiz 1038 · çakışma 0
 *  Yeni kod ÜRETİLMİYOR; kendi kodlarınız zaten Firma SKU'daydı.
 *
 *  ÜÇ KURAL:
 *   1. ÖNİZLE-ÖNCE-YAZ. Bayraksız çalıştırma tek satır bile yazmaz.
 *   2. GÜVENLİK YEDEĞİ ALINMADAN YAZILMAZ. 1038 satırlık sku güncellemesi
 *      geri dönüşü olan bir iş olmalı (kullanıcı kararı 12.08.2026).
 *   3. TANIMADIĞINI ELLEME. Kodu pazaryeri deseni taşımayan varyantlar
 *      DOKUNULMADAN listelenir; hangi kanala ait olduğunu kullanıcı bilir.
 * ============================================================================
 */

import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { topluGuncelle } from "../src/lib/toplu-guncelle";
import { yedegiMetneCevir, yedekUret } from "../src/lib/yedek";

/** Hangi kod hangi kanala ait — desen bazlı tanıma. */
const KANAL_DESENLERI: { desen: RegExp; kanalKodu: string; ad: string }[] = [
  { desen: /^HBCV/i, kanalKodu: "HEPSIBURADA", ad: "Hepsiburada (HBCV)" },
  { desen: /^HBV/i, kanalKodu: "HEPSIBURADA", ad: "Hepsiburada (HBV)" },
];

const YEDEK_KLASORU = "yedekler";

function bayrakVar(ad: string) {
  return process.argv.includes(ad);
}

/** Prova sonrası kanal kodu sayısı eski hâline döndü mü. */
function kanalKodVarSayisi(kalan: number, onceki: number): string {
  return kalan === onceki
    ? `✓  kanal kodu sayısı eski hâlinde: ${kalan}`
    : `✗  kanal kodu sayısı DEĞİŞMİŞ: ${onceki} -> ${kalan}`;
}

async function main() {
  const prova = bayrakVar("--prova");
  const yaz = bayrakVar("--yaz") || prova;
  const canli = bayrakVar("--canli");

  let url = process.env.DATABASE_URL ?? "";
  if (canli) {
    const { parsed } = config({ path: ".env.canli" });
    url = (parsed?.CANLI_DATABASE_URL ?? "").trim();
    if (!url) {
      console.log("\n  ✗  .env.canli okunamadı (CANLI_DATABASE_URL yok).\n");
      process.exitCode = 1;
      return;
    }
  }

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(betikAdresi(url)) });

  console.log("\nKİMLİK GÖÇÜ");
  console.log(`  hedef  : ${canli ? "CANLI" : "YEREL"}`);
  console.log(
    `  kip    : ${prova ? "PROVA (yazar, sonra GERİ ALIR)" : yaz ? "YAZ" : "ÖNİZLEME (hiçbir şey yazılmaz)"}\n`,
  );

  // --- 1) SATIŞ HESAPLARI: kod hangi mağazaya bağlanacak ---
  const hesaplar = await prisma.channelAccount.findMany({
    where: { satisIcin: true, isActive: true },
    include: { channel: { select: { code: true, name: true } } },
  });
  const hesapKanaldan = new Map(hesaplar.map((h) => [h.channel.code, h]));

  // --- 2) VARYANTLAR ---
  const varyantlar = await prisma.productVariant.findMany({
    select: { id: true, sku: true, companySku: true },
  });

  type Plan = {
    id: string;
    eskiSku: string;
    yeniSku: string;
    kanalHesabiId: string;
    hesapAdi: string;
  };

  const plan: Plan[] = [];
  const dokunulmayan: { sku: string; sebep: string }[] = [];

  for (const v of varyantlar) {
    const eslesme = KANAL_DESENLERI.find((k) => k.desen.test(v.sku));
    if (!eslesme) {
      dokunulmayan.push({ sku: v.sku, sebep: "kanal deseni tanınmadı" });
      continue;
    }
    if (!v.companySku || v.companySku.trim() === "") {
      dokunulmayan.push({ sku: v.sku, sebep: "Firma SKU boş — taşınacak kimlik yok" });
      continue;
    }
    const hesap = hesapKanaldan.get(eslesme.kanalKodu);
    if (!hesap) {
      dokunulmayan.push({ sku: v.sku, sebep: `${eslesme.kanalKodu} satış hesabı yok` });
      continue;
    }
    plan.push({
      id: v.id,
      eskiSku: v.sku,
      yeniSku: v.companySku.trim(),
      kanalHesabiId: hesap.id,
      hesapAdi: `${hesap.channel.name} — ${hesap.name}`,
    });
  }

  // --- 3) ÇAKIŞMA DENETİMİ — yazmadan ÖNCE ---
  const yeniler = plan.map((p) => p.yeniSku);
  const tekrarli = yeniler.filter((s, i) => yeniler.indexOf(s) !== i);

  const digerSkular = new Set(
    varyantlar.filter((v) => !plan.some((p) => p.id === v.id)).map((v) => v.sku),
  );
  const disCakisma = plan.filter((p) => digerSkular.has(p.yeniSku));

  const mevcutKanalKodlari = await prisma.channelSku.findMany({
    select: { channelAccountId: true, channelSku: true, variantId: true },
  });
  const kanalKodVar = new Set(
    mevcutKanalKodlari.map((k) => `${k.channelAccountId}|${k.channelSku}`),
  );
  const kanalVaryantVar = new Set(
    mevcutKanalKodlari.map((k) => `${k.channelAccountId}|${k.variantId}`),
  );
  const zatenVar = plan.filter(
    (p) =>
      kanalKodVar.has(`${p.kanalHesabiId}|${p.eskiSku}`) ||
      kanalVaryantVar.has(`${p.kanalHesabiId}|${p.id}`),
  );

  // --- 4) RAPOR ---
  console.log("PLAN");
  console.log(`  taşınacak varyant     : ${plan.length}`);
  console.log(`  dokunulmayan          : ${dokunulmayan.length}`);
  console.log(`  zaten kanal kodu olan : ${zatenVar.length} (atlanacak)`);
  console.log("");
  const hesapDagilimi = new Map<string, number>();
  for (const p of plan) hesapDagilimi.set(p.hesapAdi, (hesapDagilimi.get(p.hesapAdi) ?? 0) + 1);
  for (const [ad, n] of hesapDagilimi) console.log(`    ${ad}: ${n} kod`);

  console.log("\n  ÖRNEK (ilk 5):");
  for (const p of plan.slice(0, 5)) {
    console.log(`    ${p.eskiSku.padEnd(16)} -> kanal kodu · sku := ${p.yeniSku}`);
  }

  if (dokunulmayan.length) {
    console.log(`\n  DOKUNULMAYANLAR (${dokunulmayan.length}) — kararı sizde:`);
    const sebepler = new Map<string, string[]>();
    for (const d of dokunulmayan) {
      const liste = sebepler.get(d.sebep) ?? [];
      liste.push(d.sku);
      sebepler.set(d.sebep, liste);
    }
    for (const [sebep, kodlar] of sebepler) {
      console.log(`    ${sebep} (${kodlar.length}): ${kodlar.slice(0, 12).join(", ")}${kodlar.length > 12 ? " …" : ""}`);
    }
  }

  // --- 5) DURDURUCU HATALAR ---
  let engel = false;
  if (tekrarli.length) {
    console.log(`\n  ✗  DURDURULDU: ${tekrarli.length} Firma SKU tekrar ediyor — sku benzersiz olmalı.`);
    console.log(`     ${[...new Set(tekrarli)].slice(0, 10).join(", ")}`);
    engel = true;
  }
  if (disCakisma.length) {
    console.log(`\n  ✗  DURDURULDU: ${disCakisma.length} yeni sku, dokunulmayan bir kaydın sku'suyla çakışıyor.`);
    console.log(`     ${disCakisma.slice(0, 10).map((p) => p.yeniSku).join(", ")}`);
    engel = true;
  }
  if (engel) {
    console.log("\n  Hiçbir şey yazılmadı.\n");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  console.log("\n  ✓  Çakışma yok: yeni sku'ların hepsi benzersiz ve boşta.");

  if (!yaz) {
    console.log("\n  ÖNİZLEME BİTTİ — hiçbir şey yazılmadı.");
    console.log("  Uygulamak için:  npm run kimlik:goc -- --yaz" + (canli ? " --canli" : "") + "\n");
    await prisma.$disconnect();
    return;
  }

  // --- 6) GÜVENLİK YEDEĞİ — alınmadan yazılmaz ---
  // Provada gerekmez: işlem zaten geri alınacak, veri değişmiyor.
  if (prova) {
    console.log("\nGÜVENLİK YEDEĞİ");
    console.log("  ·  PROVA kipinde atlandı — hiçbir kalıcı değişiklik olmayacak.");
  } else {
  console.log("\nGÜVENLİK YEDEĞİ");
  try {
    // Bu betik yerelden çalışıyor; yedek DİSKE yazılır. Depo (Blob) yolu
    // sunucu tarafındaki geri yükleme ekranının işi.
    mkdirSync(YEDEK_KLASORU, { recursive: true });
    const an = new Date();
    const ad = `${YEDEK_KLASORU}/goc-oncesi-${an.toISOString().replace(/[:.]/g, "-")}.json`;
    // İSTEMCİ AÇIKÇA VERİLİYOR: yedek, göç edilen veritabanından alınır.
    // Varsayılana bırakılsaydı `.env`'deki YEREL adres yedeklenir, canlı
    // göçün ağı sahte olurdu.
    const yedek = await yedekUret(an, false, prisma as never);
    writeFileSync(ad, yedegiMetneCevir(yedek), "utf8");
    console.log(`  ✓  ${ad}`);
    console.log("     Bir sorun olursa: Ayarlar → Geri yükleme → bu dosyayı yükleyin.");
  } catch (e) {
    console.log(`  ✗  Yedek alınamadı: ${String(e).slice(0, 200)}`);
    console.log("     GÖÇ BAŞLATILMADI — yedeksiz 1038 satır güncellenmez.\n");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  }

  // --- 7) TEK TRANSACTION ---
  console.log(prova ? "\nPROVA YÜRÜTÜLÜYOR" : "\nUYGULANIYOR");
  const yazilacak = plan.filter((p) => !zatenVar.some((z) => z.id === p.id));
  const PROVA_GERI_AL = "PROVA_GERI_AL";

  try {
  await prisma.$transaction(
    async (tx) => {
      // Önce KANAL KODU yazılır: sku değişmeden önce eski değeri kullanıyoruz.
      await tx.channelSku.createMany({
        data: yazilacak.map((p) => ({
          variantId: p.id,
          channelAccountId: p.kanalHesabiId,
          channelSku: p.eskiSku,
        })),
        skipDuplicates: true,
      });

      // Sonra iç kimlik özdeşleşir: sku := companySku
      await topluGuncelle(
        tx as never,
        "ProductVariant",
        yazilacak.map((p) => ({ id: p.id, degerler: { sku: p.yeniSku } })),
      );

      // DOĞRULA: sayım tutmuyorsa işlem geri alınır.
      const kanalSayisi = await tx.channelSku.count();
      if (kanalSayisi < yazilacak.length) {
        throw new Error(
          `Kanal kodu sayısı beklenenden az (${kanalSayisi} < ${yazilacak.length}). İşlem geri alındı.`,
        );
      }

      // Yazım GERÇEKTEN oldu mu — örnek bir kayıt okunarak doğrulanır.
      const ornek = yazilacak[0];
      if (ornek) {
        const kontrol = await tx.productVariant.findUnique({
          where: { id: ornek.id },
          select: { sku: true },
        });
        if (kontrol?.sku !== ornek.yeniSku) {
          throw new Error(
            `Örnek kayıt doğrulanamadı: ${kontrol?.sku} ≠ ${ornek.yeniSku}. İşlem geri alındı.`,
          );
        }
        console.log(`  ✓  örnek doğrulandı: ${ornek.eskiSku} -> ${kontrol.sku}`);
      }

      console.log(`  ✓  ${yazilacak.length} kanal kodu yazıldı`);
      console.log(`  ✓  ${yazilacak.length} varyantın sku'su Firma SKU ile özdeşleşti`);

      if (prova) throw new Error(PROVA_GERI_AL);
    },
    { timeout: 300_000, maxWait: 20_000 },
  );
  } catch (e) {
    if (!String(e).includes(PROVA_GERI_AL)) throw e;
  }

  if (prova) {
    // Geri alma GERÇEKTEN oldu mu? Söylemek yetmez, ölçülür.
    const kalanKanal = await prisma.channelSku.count();
    const ornek = yazilacak[0];
    const geriDondu = ornek
      ? (await prisma.productVariant.findUnique({
          where: { id: ornek.id },
          select: { sku: true },
        }))?.sku === ornek.eskiSku
      : true;

    console.log("\nPROVA SONUCU");
    console.log(`  ✓  yazma yolu çalıştı, ${yazilacak.length} satır işlendi`);
    console.log(
      `  ${geriDondu ? "✓" : "✗"}  geri alma doğrulandı: örnek sku yine ${ornek?.eskiSku}`,
    );
    console.log(`  ${kanalKodVarSayisi(kalanKanal, mevcutKanalKodlari.length)}`);
    console.log("\n  Kalıcı değişiklik YOK. Uygulamak için --yaz kullanın.\n");
    if (!geriDondu) process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  console.log("\nGÖÇ TAMAM.\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(
    "\nHATA:",
    String(e).replace(/(mysql:\/\/[^:\s]+:)[^@\s]+(@)/gi, "$1***$2").slice(0, 500),
  );
  process.exitCode = 1;
});
