import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { dosyaHedefi } from "../src/lib/yedek-hedefi";

/**
 * ============================================================================
 *  TAM YEDEK → YEREL DOSYA HEDEFİ + GERİ OKUNABİLİRLİK DOĞRULAMASI
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-yedek-dosya.ts
 *
 *  BETIK SINIFI: SUREKLI — rutin koşabilir. Canlıya YAZMAZ (yalnız okur).
 *
 *  ⛔ NİYE: 31.08.2026'da Vercel Blob askıya alındı; 21 yedeğin üstverisi
 *  okunuyordu ama içeriği dört yolun dördünde de `403` veriyordu. O gün
 *  kullanılabilir yedek sayısı SIFIRDI.
 *
 *  ── ⛔ YEDEK ALMAK YETMEZ, GERİ OKUNDUĞU DOĞRULANIR ───────────────────
 *  Kullanıcı kuralı: "okunamayan yedek, yedek değildir." Bu betik yazdıktan
 *  SONRA aynı hedeften geri okur ve dört şeyi ölçer:
 *    ① boyut makul mü (son başarılı Blob yedeği ~30,7 MB mertebesinde)
 *    ② ayrıştırılabiliyor mu (`JSON.parse`)
 *    ③ kayıt sayıları CANLIYLA eşleşiyor mu
 *    ④ rastgele 5 kayıt ALAN ALAN birebir mi
 *
 *  ⚠ ÜÇÜNCÜ VE DÖRDÜNCÜ ŞART AYRI: sayı tutup içerik bozuk olabilir. Sayım
 *  "kaç satır var" der, alan karşılaştırması "içinde ne var" der.
 * ============================================================================
 */

const KOK = "veri/yedek-yerel";
/** Son başarılı Blob yedeği 30.770.681 B idi; bunun beşte birinden küçük bir
 *  dosya "yedek alındı" diye kabul edilmez. */
const ALT_SINIR_BAYT = 6_000_000;

function esitMi(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { yedekUret, yedegiMetneCevir } = await import("../src/lib/yedek");

  console.log("\nTAM YEDEK → DOSYA HEDEFİ");
  console.log("  hedef veritabanı  " + y.veri.adres.hostname);
  console.log("  yedek hedefi      " + KOK);
  console.log("  an                " + new Date().toISOString());
  console.log("=".repeat(70));

  /* ═══ ① ÜRET VE YAZ ═════════════════════════════════════════════ */
  const an = new Date();
  const gun = an.toISOString().slice(0, 10);
  /**
   * ⚠ ÜRETİM GÖVDESİ DEĞİŞMEDİ — `yedekUret` aynen çağrılıyor. Elle alınan
   * yedekle gece yedeği aynı şeyi içermeye devam ediyor.
   */
  const yedek = await yedekUret(an, true);
  const icerik = yedegiMetneCevir(yedek);
  const hedef = dosyaHedefi(KOK);
  const ad = `yedek/selliora-${gun}.json`;
  const { adres } = await hedef.yaz(ad, icerik);

  const boyut = Buffer.byteLength(icerik, "utf8");
  console.log("\n   YAZILDI");
  console.log("   dosya   " + adres);
  console.log("   boyut   " + boyut.toLocaleString("tr-TR") + " B");

  /* ═══ ② GERİ OKU ════════════════════════════════════════════════ */
  console.log("\n   GERİ OKUNABİLİRLİK\n");
  const kirmizi: string[] = [];
  const kontrol = (ad2: string, tamam: boolean, not = "") => {
    console.log(`   ${tamam ? "OK " : "⛔ "} ${ad2}${not ? "   " + not : ""}`);
    if (!tamam) kirmizi.push(ad2);
  };

  const geri = await hedef.oku(ad);
  kontrol("dosya geri OKUNDU", geri !== null);
  if (geri === null) {
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  kontrol(
    "boyut makul (≥ 6 MB)",
    geri.length >= ALT_SINIR_BAYT,
    geri.length.toLocaleString("tr-TR") + " karakter",
  );
  kontrol("yazılan ile okunan AYNI boyutta", geri.length === icerik.length);

  let cozulen: Record<string, unknown> | null = null;
  try {
    cozulen = JSON.parse(geri) as Record<string, unknown>;
    kontrol("JSON.parse BAŞARILI", true);
  } catch (e) {
    /** ⛔ HATA TAM TAŞINIR — kırpmak teşhisi kırpar. */
    kontrol("JSON.parse BAŞARILI", false, (e as Error).message);
  }

  /* ═══ ③ KAYIT SAYILARI CANLIYLA EŞLEŞİYOR MU ════════════════════ */
  if (cozulen !== null) {
    /**
     * ⚠ YOL VE HARF ÖLÇÜLDÜ, VARSAYILMADI. İlk yazımda üst düzeyde
     * `cozulen.stockMovement` aranıyordu ve dördü de `-1` döndü — yedek
     * DOĞRUYDU, doğrulayıcı yanlış yere bakıyordu. Gerçek şekil:
     * `{ bicim, surum, satirSayilari, tablolar: { StockMovement: [...] } }`
     * ve tablo adları PascalCase.
     * _(Anayasa: "kendi sistemimizin davranışı da doğrulanır".)_
     */
    const tablolar = (cozulen.tablolar ?? {}) as Record<string, unknown>;
    const satirSayilari = (cozulen.satirSayilari ?? {}) as Record<string, number>;
    const canliSayilar: Record<string, number> = {
      StockMovement: await prisma.stockMovement.count(),
      Sale: await prisma.sale.count(),
      Purchase: await prisma.purchase.count(),
      ProductVariant: await prisma.productVariant.count(),
    };
    console.log("");
    for (const [tablo, canli] of Object.entries(canliSayilar)) {
      const dizi = tablolar[tablo];
      const yedekte = Array.isArray(dizi) ? dizi.length : -1;
      /**
       * ⚠ İKİ SAYI AYRI ÖLÇÜLÜR: dosyanın BEYAN ettiği (`satirSayilari`) ve
       * dizinin GERÇEK uzunluğu. İkisi ayrışırsa dosya kendi içinde çelişir
       * ve bu, canlıyla kıyastan önce bilinmesi gereken bir bozulmadır.
       */
      const beyan = satirSayilari[tablo];
      if (beyan !== undefined && beyan !== yedekte) {
        kontrol(
          `dosya KENDİ İÇİNDE tutarlı · ${tablo}`,
          false,
          `beyan ${beyan} · gerçek ${yedekte}`,
        );
      }
      kontrol(
        `kayıt sayısı eşleşiyor · ${tablo}`,
        yedekte === canli,
        `yedek ${yedekte} · canlı ${canli}`,
      );
    }

    /* ═══ ④ RASTGELE 5 KAYIT — ALAN ALAN ═════════════════════════ */
    /**
     * ⛔ SAYIM YETMEZ. Doğru sayıda satır, bozuk içerikle de gelebilir;
     * bu blok "içinde ne var" sorusunu soruyor.
     * ⚠ SEÇİM RASTGELE ama TEKRARLANABİLİR olsun diye eşit aralıklı:
     * hep ilk 5'e bakmak, dosyanın sonunun bozuk olduğunu göremezdi.
     */
    const hareketler = (tablolar.StockMovement ?? []) as Array<
      Record<string, unknown>
    >;
    let alanTamam = 0;
    let alanHata = 0;
    const adim = Math.max(1, Math.floor(hareketler.length / 5));
    for (let i = 0; i < hareketler.length && alanTamam + alanHata < 5; i += adim) {
      const k = hareketler[i];
      if (k === undefined) continue;
      const canliKayit = await prisma.stockMovement.findUnique({
        where: { id: String(k.id) },
        select: {
          id: true,
          variantId: true,
          quantityDelta: true,
          type: true,
          sourceMovementId: true,
        },
      });
      if (canliKayit === null) {
        alanHata += 1;
        console.log(`     ⛔ ${String(k.id)} canlıda YOK`);
        continue;
      }
      const uyum =
        canliKayit.variantId === k.variantId &&
        canliKayit.quantityDelta === k.quantityDelta &&
        canliKayit.type === k.type &&
        esitMi(canliKayit.sourceMovementId ?? null, k.sourceMovementId ?? null);
      if (uyum) alanTamam += 1;
      else {
        alanHata += 1;
        console.log(`     ⛔ ${String(k.id)} ALAN FARKI`);
        console.log(`        canlı : ${JSON.stringify(canliKayit)}`);
        console.log(`        yedek : ${JSON.stringify(k)}`);
      }
    }
    kontrol(
      "rastgele 5 kayıt ALAN ALAN birebir",
      alanHata === 0 && alanTamam > 0,
      `${alanTamam} tuttu · ${alanHata} tutmadı`,
    );
  }

  /* ═══ HÜKÜM ═════════════════════════════════════════════════════ */
  console.log("\n" + "-".repeat(70));
  if (kirmizi.length === 0) {
    console.log("   OK  YEDEK ALINDI VE GERİ OKUNDU — kullanılabilir.");
    console.log("   ⚠ Bu YEREL bir kopya; ikinci hedef (uzak) hâlâ gerekli.");
  } else {
    console.log("   ⛔ DOĞRULAMA DÜŞTÜ — bu dosya yedek SAYILMAZ:");
    for (const k of kirmizi) console.log("     " + k);
    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

void main();
