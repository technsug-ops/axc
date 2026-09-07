import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { baslikKur, kimlikOku, tumKayitlar, UCLAR } from "./hb/istemci";

/**
 * ============================================================================
 *  K184 — HB LİSTELEME DURUMUNU DEFTERE YAZ (TY tarama gövdesinin HB hâli)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-hb-listeleme-yaz.ts            → KURU (varsayılan)
 *      npx tsx scripts/canli-hb-listeleme-yaz.ts --uygula   → YAZAR
 *
 *  BETIK SINIFI: SUREKLI — gece koşabilir; tekrar koşulabilir ve zararsız.
 *
 *  ⛔ VARSAYILAN KURU. Bayraksız koşum hiçbir şey yazmaz.
 *  ⛔ PAZARYERİNE HİÇBİR ŞEY YAZILMAZ — yalnız GET. HB istemcisinde yazma
 *  metodu zaten TANIMLI DEĞİL; stok/fiyat senkronu KAPSAM DIŞI.
 *
 *  ⚠ YALNIZ ÜÇ ALAN YAZILIR (mimar kararı 07.09.2026):
 *    `listelemeDurumu` · `kanalAdet` · `kanalOlcumAt`
 *  Fiyat, komisyon, ad gibi alanlara DOKUNULMAZ — onların kaynağı başka.
 *
 *  ⚠ YAZIM SATIR SATIR VE TEKRAR KOŞULABİLİR — tek dev işlem değil.
 *  _(Kılavuz: yarım commit mümkün olan hiçbir betik canlıya koşmaz.)_
 * ============================================================================
 */

const UYGULA = process.argv.includes("--uygula");

/** Durum önceliği — TY yazıcısıyla AYNI sıra; iki yerde iki sıra olmaz. */
const SIRA: Record<string, number> = {
  ACIK: 0,
  STOKSUZ: 1,
  ONAY_BEKLIYOR: 2,
  PASIF: 3,
  YOK: 4,
  BILINMIYOR: 5,
};

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const k = kimlikOku();
  if (k === null) {
    console.log("⛔ HB kimliği okunamadı (.env.canli).");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { hbAdedi, hbAnahtari, hbListelemeDurumu } = await import(
    "../src/lib/kanal-listeleme-hb"
  );

  console.log("\nK184 — HB LİSTELEME DURUMU  ·  " + (UYGULA ? "⚠ YAZIM" : "KURU KOŞUM"));
  console.log("  ortam  " + k.ortam);
  console.log("=".repeat(78));

  /* ═══ ① HESAP — YAZIM İÇİN ŞART ═══════════════════════════════════ */
  /**
   * ⛔ HESAP KİMLİKLE BULUNUR, ADLA DEĞİL. Ama HB'nin API kimliği
   * (`Mağaza ID`, GUID) defterdeki `externalId`de DEĞİL: orada raporlarda
   * kullanılan `7000222505` duruyor ve o alan EZİLMEYECEK (mimar kararı).
   * İkinci kimlik için alan henüz YOK — bu yüzden yazım kapısı KAPALI ve
   * sebebi ekranda yazıyor.
   */
  const hesaplar = await prisma.channelAccount.findMany({
    where: { channel: { name: "Hepsiburada" } },
    select: {
      id: true,
      name: true,
      externalId: true,
      _count: { select: { channelSkus: true } },
    },
  });
  const kimlikleEslesen = hesaplar.find((h) => h.externalId === k.merchantId);
  const kanalSkusuOlan = hesaplar.filter((h) => h._count.channelSkus > 0);

  console.log("\n① HESAP");
  console.log(`   HB hesabı ${hesaplar.length} · kanalSku'su olan ${kanalSkusuOlan.length}`);
  console.log(
    `   API kimliğiyle (Mağaza ID) eşleşen: ${kimlikleEslesen ? kimlikleEslesen.name : "⛔ YOK"}`,
  );

  /* ═══ ② LİSTİNGLER ════════════════════════════════════════════════ */
  const cekim = await tumKayitlar((o, l) => UCLAR.listingler(k, o, l), baslikKur(k), 100);
  if (cekim.tur !== "TAMAM") {
    /** ⛔ HATA TAM TAŞINIR — kırpmak teşhisi kırpar. */
    console.log("\n   ⛔ ÇEKİM DÜŞTÜ: " + JSON.stringify(cekim));
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const listingler = cekim.kayitlar as Record<string, unknown>[];
  console.log("\n② LİSTİNG  " + listingler.length);

  /** Anahtar → { durum, adet } · aynı anahtar iki kez çıkarsa EN İYİSİ. */
  const kanal = new Map<
    string,
    { durum: string; kaynak: string; adet: number | null }
  >();
  const dagilim = new Map<string, number>();
  let anahtarsiz = 0;
  for (const l of listingler) {
    const anahtar = hbAnahtari(l);
    const { durum, kaynak } = hbListelemeDurumu(l);
    const adet = hbAdedi(l.availableStock);
    dagilim.set(`${durum} · ${kaynak}`, (dagilim.get(`${durum} · ${kaynak}`) ?? 0) + 1);
    if (anahtar === "") {
      /** ⚠ ANAHTARSIZ KAYIT SESSİZCE DÜŞMEZ — ayrı sayılır. */
      anahtarsiz++;
      continue;
    }
    const mevcut = kanal.get(anahtar);
    if (mevcut === undefined) kanal.set(anahtar, { durum, kaynak, adet });
    else {
      const enIyi = SIRA[durum] < SIRA[mevcut.durum] ? durum : mevcut.durum;
      const toplam =
        mevcut.adet === null && adet === null ? null : (mevcut.adet ?? 0) + (adet ?? 0);
      kanal.set(anahtar, {
        durum: enIyi,
        kaynak: enIyi === durum ? kaynak : mevcut.kaynak,
        adet: toplam,
      });
    }
  }

  console.log("\n③ DURUM DAĞILIMI (durum · alt-iz)");
  for (const [ad, n] of [...dagilim].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(6)}  ${ad}`);
  }
  if (anahtarsiz > 0) console.log(`   ⚠ anahtarsız (hepsiburadaSku boş): ${anahtarsiz}`);
  console.log(`   benzersiz anahtar: ${kanal.size}`);

  /* ═══ ④ DEFTERLE EŞLEŞME ══════════════════════════════════════════ */
  const satirlar = await prisma.channelSku.findMany({
    where: { channelAccount: { channel: { name: "Hepsiburada" } } },
    select: {
      id: true,
      channelSku: true,
      listelemeDurumu: true,
      kanalAdet: true,
      channelAccountId: true,
    },
  });

  let eslesen = 0;
  let degisecek = 0;
  let kanaldaYok = 0;
  const yeniDurum = new Map<string, { durum: string; adet: number | null }>();
  for (const s of satirlar) {
    const bulunan = kanal.get(s.channelSku.trim());
    if (bulunan === undefined) {
      /**
       * ⛔ KANALDA BULUNAMAYAN KAYIT `YOK` OLUR — ama bu yalnız çekim TAM
       * ise doğrudur. Eksik bir liste, gerçekte listede OLAN ürünleri
       * `YOK` diye damgalardı.
       */
      kanaldaYok++;
      if (s.listelemeDurumu !== "YOK") yeniDurum.set(s.id, { durum: "YOK", adet: null });
      continue;
    }
    eslesen++;
    if (s.listelemeDurumu !== bulunan.durum || s.kanalAdet !== bulunan.adet) {
      degisecek++;
      yeniDurum.set(s.id, { durum: bulunan.durum, adet: bulunan.adet });
    }
  }

  console.log("\n④ DEFTERLE EŞLEŞME");
  console.log(`   HB kanal SKU kaydı   ${satirlar.length}`);
  console.log(`   kanalda bulunan      ${eslesen}`);
  console.log(`   kanalda YOK          ${kanaldaYok}`);
  console.log(`   değişecek satır      ${yeniDurum.size}  (durum ya da adet farklı)`);
  /** ⚠ TERSİ DE ÖLÇÜLÜR: kanalda var, defterde yok. */
  const defterAnahtarlari = new Set(satirlar.map((s) => s.channelSku.trim()));
  const defterdeYok = [...kanal.keys()].filter((a) => !defterAnahtarlari.has(a)).length;
  console.log(`   ⚠ kanalda var, DEFTERDE yok: ${defterdeYok}  (kanal SKU kaydı açılmamış)`);

  /* ═══ ⑤ YAZIM ═════════════════════════════════════════════════════ */
  if (!UYGULA) {
    console.log("\n   " + "-".repeat(72));
    console.log("   KURU KOŞUM — hiçbir şey yazılmadı.");
    console.log("   Yazmak için sonuna --uygula ekleyin.");
    await prisma.$disconnect();
    return;
  }

  /**
   * ⛔ YAZIM KAPISI: hesap API kimliğiyle bağlanmadan yazılmaz.
   * Bugün `externalId` raporlardaki numarayı taşıyor ve EZİLMEYECEK; GUID
   * için ayrı alan onaylanınca burası açılır.
   */
  if (kimlikleEslesen === null || kimlikleEslesen === undefined) {
    console.log("\n⛔ YAZIM YAPILMADI — hesap API kimliğiyle (Mağaza ID) bağlı değil.");
    console.log("   `externalId` raporlardaki numarayı taşıyor ve EZİLMEYECEK.");
    console.log("   İkinci kimlik alanı açılınca bu kapı çalışır.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /**
   * ⛔ YAZIM GÖVDESİ `src/lib`TE — BETİKTE DEĞİL.
   *
   * `api:dogrula` "ölçüm betiği deftere yazmaz" diyor ve istisna BEYANLA
   * geçiliyor. Beyan etmek yerine YAPI, TY kardeşine benzetildi
   * (`lib/kanal-listeleme-yaz.ts` de orada): aynı iş aynı yerde durur ve
   * beyanlı-istisna listesi büyümez. _(İlke #10 — tutarlılık.)_
   */
  const { hbListelemeDurumunuYaz } = await import(
    "../src/lib/kanal-listeleme-hb-yaz"
  );
  const y2 = await hbListelemeDurumunuYaz(
    [...yeniDurum].map(([channelSkuId, v]) => ({
      channelSkuId,
      durum: v.durum as never,
      adet: v.adet,
    })),
  );
  console.log(`\n⑤ YAZIM — ${y2.yazilan} satır güncellendi · hata ${y2.hata}`);
  /** ⛔ HATA SESSİZ GEÇMEZ: çıkış kodu da düşer. */
  if (y2.hata > 0) process.exitCode = 1;
  await prisma.$disconnect();
}

void main();
