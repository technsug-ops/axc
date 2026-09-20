/**
 * ============================================================================
 *  K223 — GEÇMİŞ TY ÖDEME GÜNLERİNİ ONAR (21.09.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — geçmişte yazılmış yanlış `paidAt` damgalarını
 *  bir kez düzeltir. Mekanizma zaten onarıldı (K223, `ty-api-oku.ts`); bu
 *  betik yalnız ONDAN ÖNCE yazılmış satırlar içindir.
 *
 *      npm run canli:ty-odeme-gunu-onar             → KURU KOŞUM (yazmaz)
 *      npm run canli:ty-odeme-gunu-onar -- --yaz    → yazar
 *      npm run canli:ty-odeme-gunu-onar -- --geri   → anlık görüntüden geri al
 *
 *  ⛔ NİYE: `paidAt` kalemin KENDİ VADESİNDEN yazılıyordu, ödeme emrinin
 *  gününden değil. Bir ödeme emri = BİR ödeme günü; kalem başına vade
 *  yazılınca tek bir ödeme nakit takviminde günlere dağıldı:
 *
 *      emir 76313675 · 112 kalem · ₺205.691,63
 *        GERÇEK    2026-08-11 (TEK gün)
 *        defterde  10·11·17·18·19·20·22·23·24·25 Ağu + 3 Eyl
 *
 *  ⭐ METADATA DÜZELTMESİ — DAR İSTİSNA (anayasa). Üç şart da sağlanıyor:
 *   ① Değişen alan miktar ya da para DEĞİL — bir tarih damgası.
 *   ② Alternatifler elendi: ters kayıt tarih düzeltmez, silme FIFO/bağ
 *     yüzünden imkânsız, düzelten bir ekran yok.
 *   ③ İz bırakılıyor — emir başına `AuditLog`, ESKİ ve YENİ değerle.
 *
 *  ⛔ TOPLU YAZIM ÜÇ ŞARTI (anayasa):
 *   (a) YEREL ANLIK GÖRÜNTÜ — yazımdan ÖNCE alınır, sonra bit-bit
 *       karşılaştırılır. "İz sayısı" kısmi yazım kanıtı DEĞİLDİR.
 *   (b) SATIR SATIR TEKRAR-KOŞULABİLİR — her emir bağımsız bir işlem;
 *       ikinci koşum aynı değeri yazar, zararsızdır. Zaman aşımı AÇIKÇA
 *       ayarlı, varsayılana bel bağlanmaz.
 *   (c) Kapasite kısıtı yok (bir tarih alanı, hedef tüketilmiyor).
 *
 *  ⚠ GERİ ALMA YOLU LİSTEYE DEĞİL ANLIK GÖRÜNTÜYE DAYANIR ve görüntü
 *  YEREL DOSYADADIR — `AuditLog.detail` MySQL `TEXT`tir (65.535 bayt) ve
 *  tam tavanda sessizce kırpılır; geri alma yolu yazıldığı anda bozulurdu
 *  (anayasadaki kargo vakası). İz TEŞHİS içindir, geri alma için değil.
 * ============================================================================
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { gunDegeri, isTakvimGunu } from "../src/lib/donem";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { izYaz } from "../src/lib/iz";
import { canliYapilandirma } from "./canli-ortak";
import { baslikKur, kimlikOku, tumSayfalar, UCLAR } from "./ty/istemci";
import { odemeEmriGunleriniCoz, type TyFinansKaydi } from "../src/lib/hakedis/ty-api-oku";

const GUN_MS = 86_400_000;
/** 420 gün: ölçüldü 21.09.2026 — API bu pencerede 123 emir veriyor, bizde 91. */
const TARAMA_GUN = 420;
const GORUNTU_DOSYASI = "veri/ozel/k223-paidat-goruntu.json";
/** ⚠ VARSAYILANA BEL BAĞLANMAZ — yazım boyutuna göre AÇIKÇA ayarlı. */
const ISLEM_TAVANI_MS = 120_000;
/** `AuditLog.detail` TEXT (65.535 bayt); tavana yaklaşan iz YAZILMAZ. */
const IZ_TAVANI = 60_000;

/**
 * ⚠ ADLAR BÜYÜK HARF — depo konvansiyonu (`canli-ty-hakedis-cekim.ts` ve
 * kardeşleri). `hakedis-yazici:dogrula` `--yaz` kapısını `if (!YAZ) {`
 * deseniyle arıyor; küçük harfli bir ad kapıyı GÖRÜNMEZ yapardı.
 */
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");

/**
 * ⛔ GÜN KARŞILAŞTIRMASI İSTANBUL'DA YAPILIR — UTC'de DEĞİL.
 *
 * VAKA 21.09.2026, ilk koşumda yaşandı: ölçüt `toISOString().slice(0,10)`
 * yani UTC günüydü. Emir 59702717'nin iki kalemi `2026-07-27T21:30:37Z`
 * damgasını taşıyordu — UTC'de hedefle AYNI gün, ama İstanbul'da
 * **28 Temmuz**. İkisi "zaten doğru" sayılıp atlandı ve ekran o emri hâlâ
 * İKİ güne yayılmış gösterdi (5 emirde toplam böyle bir kalıntı kaldı).
 *
 * Ekran `gunDegeri(isTakvimGunu(...))` ile grupluyor; ölçüt de öyle olmalı.
 * İki taraf farklı dilimde kurulursa sayı ile liste sessizce ayrışır
 * (anayasa: "tarih penceresiyle çalışan her karşılaştırmada iki tarafın
 * hangi saat diliminde kurulduğu AÇIKÇA yazılmalıdır").
 */
const g10 = (d: Date) => gunDegeri(isTakvimGunu(d)).toISOString().slice(0, 10);

type Goruntu = { alindi: string; satirlar: { id: string; paidAt: string | null }[] };

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("⛔ CANLI YAPILANDIRMA YOK");
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(betikAdresi(c.veri.ham)),
  });

  console.log("=".repeat(96));
  console.log(
    `K223 — GEÇMİŞ TY ÖDEME GÜNÜ ONARIMI  (${GERI ? "GERİ ALMA" : YAZ ? "YAZAR" : "KURU KOŞUM, yazmaz"})`,
  );
  console.log("=".repeat(96));

  /**
   * ⛔ `--geri` DE BİR YAZMA KİPİDİR — kapı ondan da ÖNCE gelir.
   * Geri alma defteri değiştirir; bayraksız koşumda hiçbir yol yazmaz.
   */
  if (!YAZ) {
    if (GERI) {
      const n = existsSync(GORUNTU_DOSYASI)
        ? (JSON.parse(readFileSync(GORUNTU_DOSYASI, "utf8")) as Goruntu).satirlar.length
        : 0;
      console.log(
        `KURU KOŞUM — ${n} satır geri yazılacaktı. Yazmak için: --geri --yaz`,
      );
      await prisma.$disconnect();
      return;
    }
    /** İleri yön: ölçüm aşağıda, kuru koşum raporu orada verilir. */
  }

  // ── GERİ ALMA — yerel anlık görüntüden ────────────────────────────────
  if (GERI) {
    if (!existsSync(GORUNTU_DOSYASI)) {
      console.log(`⛔ Anlık görüntü YOK (${GORUNTU_DOSYASI}) — geri alınamaz.`);
      process.exitCode = 1;
      await prisma.$disconnect();
      return;
    }
    const g: Goruntu = JSON.parse(readFileSync(GORUNTU_DOSYASI, "utf8"));
    console.log(`Görüntü ${g.alindi} · ${g.satirlar.length} satır geri yazılıyor...`);
    let sayac = 0;
    for (const s of g.satirlar) {
      await prisma.settlementItem.update({
        where: { id: s.id },
        data: { paidAt: s.paidAt === null ? null : new Date(s.paidAt) },
      });
      sayac++;
    }
    console.log(`✓ ${sayac} satır geri yazıldı.`);
    await prisma.$disconnect();
    return;
  }

  // ── ① KANALIN KENDİ ÖDEME EMRİ KAYITLARI ──────────────────────────────
  const kimlik = kimlikOku();
  if (kimlik === null) {
    console.log("⛔ TY KİMLİĞİ YOK");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const baslik = baslikKur(kimlik);
  const son = Date.now();
  const bas = son - TARAMA_GUN * GUN_MS;
  const ham: TyFinansKaydi[] = [];
  let okunamayan = 0;

  for (let p = bas; p < son; p += 15 * GUN_MS) {
    const pSon = Math.min(p + 15 * GUN_MS, son);
    const r = await tumSayfalar(
      (sayfa) => UCLAR.otherFinancials(kimlik.saticiId, p, pSon, sayfa, "PaymentOrder", 500),
      baslik,
    );
    if (r.tur === "HATA") {
      okunamayan++;
      continue;
    }
    ham.push(...(r.kayitlar as TyFinansKaydi[]));
  }
  const gercekGun = odemeEmriGunleriniCoz(ham);
  console.log(
    `\n① API: ${TARAMA_GUN} günde ${gercekGun.size} ödeme emri` +
      (okunamayan > 0 ? `  ⚠ ${okunamayan} pencere OKUNAMADI` : ""),
  );
  /**
   * ⛔ BOŞ KÜME HER KOŞULU SAĞLAR. Harita boşsa aşağıdaki döngü hiç dönmez
   * ve betik "düzeltilecek bir şey yok" der — oysa hiç BAKAMAMIŞTIR.
   */
  if (gercekGun.size === 0) {
    console.log("⛔ Ödeme emri kaydı HİÇ gelmedi — ölçüm YAPILAMADI, hüküm yok.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  // ── ② DEFTER ──────────────────────────────────────────────────────────
  const kalemler = await prisma.settlementItem.findMany({
    where: {
      paidAt: { not: null },
      channelAccount: { channel: { name: "Trendyol" } },
    },
    select: { id: true, paymentOrderId: true, paidAt: true, amount: true },
  });

  /** ⚠ ÜÇ KOVA AYRI SAYILIR — "incelenemedi" ile "temiz" karıştırılmaz. */
  const emirsiz = kalemler.filter((k) => k.paymentOrderId === null);
  const gunuYok: typeof kalemler = [];
  const zatenDogru: typeof kalemler = [];
  const duzelecek = new Map<string, { hedef: Date; satirlar: typeof kalemler }>();

  for (const k of kalemler) {
    if (k.paymentOrderId === null) continue;
    const hedef = gercekGun.get(String(k.paymentOrderId));
    if (hedef === undefined) {
      gunuYok.push(k);
      continue;
    }
    if (g10(k.paidAt!) === g10(hedef)) {
      zatenDogru.push(k);
      continue;
    }
    const g = duzelecek.get(String(k.paymentOrderId)) ?? { hedef, satirlar: [] };
    g.satirlar.push(k);
    duzelecek.set(String(k.paymentOrderId), g);
  }

  const duzelecekKalem = [...duzelecek.values()].reduce((t, g) => t + g.satirlar.length, 0);
  console.log(`\n② DEFTER: ${kalemler.length} ödenmiş TY kalemi\n`);
  console.log("   KOVA                          EMİR     KALEM");
  console.log(`     zaten DOĞRU              ${"".padStart(6)} ${String(zatenDogru.length).padStart(9)}`);
  console.log(`     DÜZELECEK                ${String(duzelecek.size).padStart(6)} ${String(duzelecekKalem).padStart(9)}`);
  console.log(`     emri YOK (incelenemedi)  ${"".padStart(6)} ${String(emirsiz.length).padStart(9)}`);
  console.log(`     günü YOK (incelenemedi)  ${"".padStart(6)} ${String(gunuYok.length).padStart(9)}`);

  if (emirsiz.length > 0 || gunuYok.length > 0) {
    console.log(
      `\n   ⚠ ${emirsiz.length + gunuYok.length} kalem İNCELENEMEDİ — bunlar "doğru" DEĞİL,` +
        ` ölçülemedi. Dokunulmuyor.`,
    );
  }

  console.log("\n   ÖRNEKLER:");
  for (const [emir, g] of [...duzelecek.entries()].slice(0, 6)) {
    const gunler = [...new Set(g.satirlar.map((s) => g10(s.paidAt!)))].sort();
    console.log(
      `     ${emir.padEnd(11)} ${String(g.satirlar.length).padStart(4)} kalem` +
        `   → ${g10(g.hedef)}   (defterde: ${gunler.join(", ")})`,
    );
  }

  if (duzelecekKalem === 0) {
    console.log("\n✓ Düzeltilecek satır yok.");
    await prisma.$disconnect();
    return;
  }

  if (!YAZ) {
    console.log(`\nKURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: --yaz`);
    await prisma.$disconnect();
    return;
  }

  // ── ③ (a) YEREL ANLIK GÖRÜNTÜ — YAZIMDAN ÖNCE ────────────────────────
  const yeniSatirlar = [...duzelecek.values()].flatMap((g) =>
    g.satirlar.map((s) => ({ id: s.id, paidAt: s.paidAt!.toISOString() })),
  );
  /**
   * ⛔ İKİNCİ KOŞUM İLK GÖRÜNTÜYÜ EZMEZ. Betik tekrar koşulabilir; ezilseydi
   * ilk partinin ÖZGÜN değeri kaybolur ve geri alma yolu yazıldığı anda
   * yarım kalırdı. Bir kimlik zaten kayıtlıysa ESKİ (özgün) değeri korunur —
   * ikinci koşumun gördüğü değer zaten BİZİM yazdığımızdır.
   */
  const oncekiler: Goruntu["satirlar"] = existsSync(GORUNTU_DOSYASI)
    ? (JSON.parse(readFileSync(GORUNTU_DOSYASI, "utf8")) as Goruntu).satirlar
    : [];
  const birlesik = new Map<string, Goruntu["satirlar"][number]>(
    yeniSatirlar.map((s) => [s.id, s]),
  );
  for (const s of oncekiler) birlesik.set(s.id, s); // özgün kazanır
  const goruntu: Goruntu = {
    alindi: new Date().toISOString(),
    satirlar: [...birlesik.values()],
  };
  if (oncekiler.length > 0) {
    console.log(
      `\n   ℹ Önceki görüntüde ${oncekiler.length} satır vardı; özgün değerleri KORUNDU.`,
    );
  }
  writeFileSync(GORUNTU_DOSYASI, JSON.stringify(goruntu, null, 2), "utf8");
  /** ⚠ YAZILDIĞI DOĞRULANIR — "yazdım" demek yazıldı demek değildir. */
  const geriOkunan: Goruntu = JSON.parse(readFileSync(GORUNTU_DOSYASI, "utf8"));
  if (geriOkunan.satirlar.length !== goruntu.satirlar.length) {
    console.log("⛔ Anlık görüntü GERİ OKUNAMADI — yazım YAPILMADI.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  console.log(
    `\n③ Anlık görüntü yazıldı ve geri okundu: ${GORUNTU_DOSYASI} (${geriOkunan.satirlar.length} satır)`,
  );

  const kullanici = await prisma.user.findFirst({ select: { id: true } });
  if (!kullanici) {
    console.log("⛔ Kullanıcı yok — iz yazılamaz, yazım YAPILMADI.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  // ── ④ (b) EMİR EMİR YAZ — her emir bağımsız, tekrar koşulabilir ──────
  let yazilanEmir = 0;
  let yazilanKalem = 0;
  for (const [emir, g] of duzelecek) {
    const iz = JSON.stringify({
      emir,
      hedefGun: g10(g.hedef),
      kalem: g.satirlar.length,
      /** ⚠ ÖNCEKİ DEĞER SATIR BAZINDA — teşhis için (geri alma görüntüde). */
      eski: g.satirlar.map((s) => ({ id: s.id, paidAt: s.paidAt!.toISOString() })),
      kaynak:
        "TY PaymentOrder kaydı (otherfinancials). Eski değer kalemin KENDİ " +
        "vadesiydi — bir ödeme emri BİR gündür. K223, 21.09.2026.",
    });
    if (Buffer.byteLength(iz, "utf8") > IZ_TAVANI) {
      console.log(`⛔ ${emir}: iz ${Buffer.byteLength(iz, "utf8")} bayt — TAVAN AŞILDI, atlandı.`);
      continue;
    }

    await prisma.$transaction(
      async (tx) => {
        /**
         * ⚠ `updateMany` BURADA DOĞRU: aynı emrin bütün kalemleri AYNI günü
         * alır. (K91'de her satırın hedefi farklıydı, orada yasaktı.)
         */
        await tx.settlementItem.updateMany({
          where: { id: { in: g.satirlar.map((s) => s.id) } },
          data: { paidAt: g.hedef },
        });
        /**
         * ⚠ `izYaz` KULLANILIR, ham `auditLog.create` DEĞİL — depo
         * konvansiyonu ve `hakedis-yazici:dogrula`nın ② ölçütü.
         * İşlem istemcisi geçilir ki iz yazımla AYNI işlemde dursun:
         * yazım geri alınırsa iz de geri alınır, yetim iz kalmaz.
         */
        await izYaz(
          {
            userId: kullanici.id,
            action: "TY_ODEME_GUNU_DUZELTILDI",
            targetType: "SettlementItem",
            targetId: emir,
            detail: iz,
          },
          tx,
        );
      },
      { timeout: ISLEM_TAVANI_MS },
    );
    yazilanEmir++;
    yazilanKalem += g.satirlar.length;
  }
  console.log(`\n④ YAZILDI: ${yazilanEmir} emir · ${yazilanKalem} kalem`);

  // ── ⑤ (a) BİT-BİT DOĞRULAMA — iz sayısı kanıt DEĞİLDİR ───────────────
  const sonra = await prisma.settlementItem.findMany({
    where: { id: { in: goruntu.satirlar.map((s) => s.id) } },
    select: { id: true, paymentOrderId: true, paidAt: true },
  });
  let sapan = 0;
  for (const s of sonra) {
    const hedef = gercekGun.get(String(s.paymentOrderId));
    if (hedef === undefined || s.paidAt === null || g10(s.paidAt) !== g10(hedef)) sapan++;
  }
  console.log(
    `⑤ DOĞRULAMA: ${sonra.length} satır okundu · hedefte OLMAYAN ${sapan}` +
      (sapan === 0 ? "  ✓" : "  ⛔"),
  );
  if (sapan > 0) {
    console.log("   ⛔ Yazım TAM DEĞİL. Geri almak için: --geri");
    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
