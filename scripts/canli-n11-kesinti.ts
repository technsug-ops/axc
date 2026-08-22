/**
 * ============================================================================
 *  N11 KESİNTİ KURALLARINI DEFTERE GEÇİR — CANLI
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:n11-kesinti              (RAPOR — hiçbir şey yazmaz)
 *      npm run canli:n11-kesinti -- --uygula  (yazar)
 *      npm run canli:n11-kesinti -- --geri    (yazdığını geri alır)
 *
 *  ── NİYE VAR ────────────────────────────────────────────────────────────
 *  N11'in kesinti kuralları 22.08.2026'da GERÇEK hakediş ekstresinden
 *  ölçüldü ve simülasyona işlendi. Ama `ChannelFee` tablosunda N11'in
 *  **hiç kuralı yok**: canlıdaki gerçek N11 satışlarının kârı %2'lik
 *  kesinti hiç düşülmeden hesaplanmış, yani NET-2 olduğundan İYİMSER.
 *
 *  `kanal-kurallari.ts`in kendi sözleşmesi bunu zaten söylüyordu:
 *  _"Bir kanalın ekstresi eline geçip ölçüldüğünde kuralı DEFTERE geçer."_
 *
 *  ── ÖLÇÜM (n=3 · hakediş ekstresi + KOMİSYON FATURASI, 22.08.2026) ──────
 *      sipariş        tutar     komisyon   pazarlama   pazaryeri
 *      218135584424   6.299,00  %15,00     %1,2000     %0,8000
 *      218277164422   4.299,00  %10,00     %1,2000     %0,8000
 *      231686994420   9.599,00  %16,00     %1,2000     %0,8000
 *
 *  Üç FARKLI tutar, üç FARKLI komisyon oranı, aynı iki kesinti oranı —
 *  sabit terim ihtimali kapandı. Hakediş denklemi de kuruşuna kapanıyor:
 *      9.599,00 − 1.535,84 − 115,19 − 76,79 − 79,99 = 7.791,19 ✓
 *
 *  Matrah KDV DAHİL — stopaj satırıyla BAĞIMSIZ doğrulandı: 79,99 ancak
 *  KDV hariç tutarın %1'i olarak çıkıyor. Oranlar yalnız o tabanda tam
 *  yuvarlak sayı veriyor.
 *
 *  ⚠ KARGO AYRI SATIR: "Satış Kargo (Mağaza Öder)" — sipariş başına
 *  ₺119,12 / ₺111,16 ve AYRI fatura numarasında. Bir siparişte hakedişten
 *  düşülmüş, ötekinde düşülmemiş (henüz transfer edilmemiş olabilir).
 *  ÖLÇÜLMEDİ, bu yüzden kural YAZILMIYOR — kargo zaten satışta seçiliyor.
 *
 *  ── NE YAZILMIYOR ───────────────────────────────────────────────────────
 *  · KOMİSYON yazılmıyor — komisyon oranı ürün×kanal bazında `ChannelSku`da
 *    tutulur ve satışa snapshot'lanır; `ChannelFee` kanal geneli kurallar
 *    içindir. Fatura da bunu doğruluyor: komisyon oranı sipariş sipariş
 *    değişiyor (%10 · %15 · %16), yani kanal geneli bir kural değil.
 *  · STOPAJ yazılmıyor — motor onu zaten her satışta kendisi kesiyor
 *    (KDV hariç %1, anayasa sabiti). İkinci kez yazmak çift keserdi.
 *  · KOMİSYON KDV'si yazılmıyor — ekstre komisyona KDV EKLEMİYOR (%16 tam).
 *
 *  ── GEÇMİŞE DOKUNMUYOR ──────────────────────────────────────────────────
 *  `validFrom` bugünden başlar ve eski satışların kâr snapshot'ı DEĞİŞMEZ.
 *  Var olan iki N11 satışının NET-2'si ancak KULLANICI "yeniden hesapla"
 *  derse tazelenir — bu betik onu yapmaz, yalnız RAPOR EDER. Sessizce
 *  geçmişi değiştiren bir betik, defterin izini bozar.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** ⚠ ÖLÇÜLMÜŞ KURAL — ölçümsüz satır bu listeye girmez. */
const KURALLAR = [
  {
    code: "PAZARLAMA_HIZMET",
    scope: "PER_SALE" as const,
    basis: "SALE_AMOUNT" as const,
    rate: 1.2,
    aciklama: "Pazarlama Bedeli · 3 satışta ölçüldü: 51,59/4.299 · 75,59/6.299 · 115,19/9.599 = %1,2000",
  },
  {
    code: "PAZARYERI_BEDELI",
    scope: "PER_SALE" as const,
    basis: "SALE_AMOUNT" as const,
    rate: 0.8,
    aciklama: "Pazaryeri Bedeli · 3 satışta ölçüldü: 34,39/4.299 · 50,39/6.299 · 76,79/9.599 = %0,8000",
  },
];

const KANAL_ADI = "N11";

async function main() {
  const uygula = process.argv.includes("--uygula");
  const geri = process.argv.includes("--geri");

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("");
  console.log("N11 KESİNTİ KURALLARI → DEFTER");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log(
    "  kip        " + (geri ? "GERİ AL" : uygula ? "YAZ" : "RAPOR (yazmaz)"),
  );
  console.log("");

  const kanal = await prisma.channel.findFirst({
    where: { name: KANAL_ADI },
    select: { id: true, name: true },
  });
  if (kanal === null) {
    console.log(`  ⚠ "${KANAL_ADI}" adlı kanal BULUNAMADI — hiçbir şey yapılmadı.`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  const mevcut = await prisma.channelFee.findMany({
    where: { channelId: kanal.id },
    select: {
      id: true,
      code: true,
      scope: true,
      basis: true,
      rate: true,
      amount: true,
      isActive: true,
      validFrom: true,
    },
    orderBy: { code: "asc" },
  });

  console.log("  ── DEFTERDE ŞU AN ────────────────────────────────────────");
  if (mevcut.length === 0) {
    console.log("     (hiç kesinti kuralı yok)");
  } else {
    for (const k of mevcut) {
      const deger =
        k.rate !== null ? `%${Number(k.rate)}` : `${Number(k.amount)} sabit`;
      console.log(
        `     ${k.code.padEnd(20)} ${k.basis.padEnd(14)} ${deger.padEnd(10)} ${k.isActive ? "aktif" : "pasif"}`,
      );
    }
  }

  /**
   * ⚠ ETKİLENEN SATIŞLAR SAYILIYOR — "kaç kayıt" sorusu cevapsız kalmasın.
   * Geçmiş satışların snapshot'ı değişmiyor; ama kaçının etkilenebileceği
   * (yeniden hesaplanırsa) ekranda yazsın.
   */
  const satislar = await prisma.sale.findMany({
    where: {
      iptalTarihi: null,
      channelAccount: { channelId: kanal.id },
    },
    select: {
      id: true,
      code: true,
      soldAt: true,
      net2Amount: true,
      /** Satış tutarı kalemlerden toplanıyor — Sale'de tek alan yok. */
      items: { select: { quantity: true, unitPriceAmount: true } },
    },
    orderBy: { soldAt: "asc" },
  });

  console.log("");
  console.log("  ── ETKİLENEBİLECEK SATIŞLAR ──────────────────────────────");
  console.log(`     iptalsiz N11 satışı: ${satislar.length}`);
  let toplamFark = 0;
  for (const s of satislar) {
    const tutar = s.items.reduce(
      (t, k) => t + k.quantity * Number(k.unitPriceAmount),
      0,
    );
    /** Yeni kuralların bu satışta keseceği tutar — %2,00. */
    const kesinti = tutar * 0.02;
    /**
     * ⚠ KDV ETKİSİ DE VAR: kesintinin içindeki KDV indirilecek KDV'ye
     * yazılır, yani NET-2'deki düşüş kesintinin TAMAMI kadar değil.
     * Kaba tahmin: kesinti − kesinti/6. Kesin rakam yeniden hesapta çıkar.
     */
    const yaklasikDusus = kesinti - kesinti / 6;
    toplamFark += yaklasikDusus;
    console.log(
      `     ${(s.code ?? "—").padEnd(14)} ${s.soldAt.toISOString().slice(0, 10)}  tutar ${tutar.toFixed(2).padStart(10)}  NET-2 ${
        s.net2Amount === null ? "—" : Number(s.net2Amount).toFixed(2)
      }  → yeni kesinti ${kesinti.toFixed(2)} (NET-2 ~−${yaklasikDusus.toFixed(2)})`,
    );
  }
  if (satislar.length > 0) {
    console.log(
      `     TOPLAM yaklaşık NET-2 düşüşü: ${toplamFark.toFixed(2)} (yeniden hesaplanırsa)`,
    );
  }
  console.log(
    "     ⚠ Bu betik geçmişi DEĞİŞTİRMEZ. Snapshot'lar yerinde kalır;",
  );
  console.log(
    "       tazelemek satış detayındaki 'Yeniden hesapla' ile YAPILIR.",
  );

  console.log("");
  console.log("  ── YAZILACAK ─────────────────────────────────────────────");
  for (const k of KURALLAR) {
    const zatenVar = mevcut.find((m) => m.code === k.code && m.isActive);
    console.log(
      `     ${k.code.padEnd(20)} %${String(k.rate).padEnd(6)} ${zatenVar ? "ZATEN VAR — atlanacak" : "yeni"}`,
    );
    console.log(`        ${k.aciklama}`);
  }
  console.log("");
  console.log("     YAZILMAYANLAR (bilerek):");
  console.log("       KOMISYON     — ürün×kanal bazında ChannelSku'da tutulur");
  console.log("       STOPAJ       — motor zaten kesiyor (KDV hariç %1)");
  console.log("       KOMISYON_KDV — ekstre komisyona KDV EKLEMİYOR");

  if (geri) {
    const silinecek = mevcut.filter((m) =>
      KURALLAR.some((k) => k.code === m.code),
    );
    if (!uygula) {
      console.log("");
      console.log(`  GERİ ALMA ÖNİZLEMESİ — ${silinecek.length} kural pasife alınacak.`);
      console.log("  Uygulamak için: --geri --uygula");
    } else {
      await prisma.$transaction(async (tx) => {
        for (const m of silinecek) {
          await tx.channelFee.update({
            where: { id: m.id },
            data: { isActive: false },
          });
        }
        await tx.auditLog.create({
          data: {
            action: "N11_KESINTI_GERI",
            targetType: "Channel",
            targetId: kanal.id,
            detail: `N11 kesinti kuralları pasife alındı: ${silinecek.map((s) => s.code).join(", ")}`,
          },
        });
      });
      console.log("");
      console.log(`  GERİ ALINDI — ${silinecek.length} kural pasife alındı.`);
    }
    await prisma.$disconnect();
    return;
  }

  if (!uygula) {
    console.log("");
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Rakamlar beklenene uyuyorsa:  npm run canli:n11-kesinti -- --uygula");
    await prisma.$disconnect();
    return;
  }

  /**
   * ⚠ TEK İŞLEMDE — bir kural yazılıp öteki yazılamazsa kanal YARIM kuralla
   * kalır ve NET-2 sessizce eksik kesilmeye devam eder. Hepsi ya da hiçbiri.
   */
  const bugun = new Date();
  const yazilan: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const k of KURALLAR) {
      if (mevcut.some((m) => m.code === k.code && m.isActive)) continue;
      await tx.channelFee.create({
        data: {
          channelId: kanal.id,
          code: k.code,
          scope: k.scope,
          basis: k.basis,
          rate: k.rate,
          validFrom: bugun,
          isActive: true,
        },
      });
      yazilan.push(k.code);
    }
    await tx.auditLog.create({
      data: {
        action: "N11_KESINTI_YAZ",
        targetType: "Channel",
        targetId: kanal.id,
        detail:
          `N11 kesinti kuralları deftere geçti (hakediş ekstresi + komisyon faturası, n=3): ` +
          KURALLAR.map((k) => `${k.code} %${k.rate}`).join(" · ") +
          ` · ölçüm: 4.299/6.299/9.599 üç satışta pazarlama %1,20 · pazaryeri %0,80`,
      },
    });
  });

  console.log("");
  console.log(`  YAZILDI — ${yazilan.length} kural: ${yazilan.join(", ") || "(yeni yok)"}`);
  console.log("  AuditLog'a iz bırakıldı (N11_KESINTI_YAZ).");
  console.log("");
  console.log("  ⚠ GEÇMİŞ SATIŞLAR DEĞİŞMEDİ. Yukarıdaki satışların NET-2'sini");
  console.log("    tazelemek istersen satış detayından 'Yeniden hesapla'.");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Hata:", String(e).split("\n")[0]);
  process.exitCode = 1;
});
