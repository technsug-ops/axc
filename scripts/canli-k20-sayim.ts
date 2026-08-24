/**
 * ============================================================================
 *  K20 — GECİKMİŞ BORÇ SAYIMI (salt okuma)
 * ----------------------------------------------------------------------------
 *  ⚠ HİÇBİR ŞEY YAZMAZ.
 *
 *  Dört kez istendi, hiç koşmadı. Nakit takvimi ve bütün kâr raporları bu
 *  sayıma yaslanıyor — sayım yapılmadan onların üstüne hüküm kurmak,
 *  ölçülmemiş bir tabanın üstüne bina dikmektir.
 *
 *  ⚠ İKİ PENCERE AYRI SAYILIR VE BU BİLEREK:
 *    · 01–20.08 → sipariş dökümüyle KIYASLANABİLİR (döküm o tarihe kadar)
 *    · 20–24.08 → hiçbir dökümle kapatılmadı; kıyas YOK, yalnız sayım
 *  İkisini tek rakamda toplamak, doğrulanmış bir sayı ile doğrulanmamış
 *  bir sayıyı aynı kefeye koymak olurdu.
 *
 *  ⚠ DONMUŞ KAYNAK / AKAN SİSTEM: döküm üretildiği anda dondu, defterimiz
 *  akmaya devam ediyor. Bu yüzden hem dökümün dönemi hem sistem okuma anı
 *  basılır; damga olmadan rakam "sabit bir gerçek" sanılır.
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** Pencere sınırları — İstanbul iş günü, UTC gece yarısı damgalı. */
const BAS = new Date("2026-08-01T00:00:00.000Z");
const ORTA = new Date("2026-08-21T00:00:00.000Z"); // 20.08 dahil
const SON = new Date("2026-08-25T00:00:00.000Z"); // 24.08 dahil

/** Sipariş dökümünün beyanı — kıyas YALNIZ ilk pencerede geçerli. */
const DOKUM_BEYANI = { adet: 147, tutar: 464657 };

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("yapılandırma yok:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const okumaAni = new Date();
  console.log("");
  console.log("=".repeat(78));
  console.log("K20 — GECİKMİŞ BORÇ SAYIMI   (SALT OKUMA · yazma YOK)");
  console.log("=".repeat(78));
  console.log(`  hedef         ${y.veri.adres.hostname}`);
  console.log(`  sistem okuma  ${okumaAni.toISOString()}`);
  console.log(`  ⚠ DÖKÜM DONMUŞ, DEFTER AKIYOR — iki damga da yazılı.`);

  const satislar = await prisma.sale.findMany({
    where: { soldAt: { gte: BAS, lt: SON } },
    select: {
      id: true,
      code: true,
      soldAt: true,
      iptalTarihi: true,
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
      items: {
        select: {
          quantity: true,
          unitPriceAmount: true,
          variant: { select: { barcode: true, sku: true } },
          returnItems: { select: { quantity: true } },
        },
      },
    },
    orderBy: { soldAt: "asc" },
  });

  type Kova = {
    satir: number;
    brutAdet: number;
    netAdet: number;
    tutar: number;
    iptal: number;
  };
  const bos = (): Kova => ({
    satir: 0,
    brutAdet: 0,
    netAdet: 0,
    tutar: 0,
    iptal: 0,
  });

  /** kanal → hesap → pencere */
  const sayim = new Map<string, Map<string, { erken: Kova; gec: Kova }>>();

  for (const s of satislar) {
    const kanal = s.channelAccount?.channel.name ?? "(kanalsız)";
    const hesap = s.channelAccount?.name ?? "(hesapsız)";
    if (!sayim.has(kanal)) sayim.set(kanal, new Map());
    const hesaplar = sayim.get(kanal)!;
    if (!hesaplar.has(hesap)) hesaplar.set(hesap, { erken: bos(), gec: bos() });
    const pencere = s.soldAt < ORTA ? "erken" : "gec";
    const k = hesaplar.get(hesap)![pencere];

    k.satir += 1;
    /**
     * ⚠ İPTAL AYRI SAYILIR, SESSİZ DÜŞMEZ. Döküm iptalleri de içeriyor
     * olabilir; hangi tarafta ne olduğu görünmezse fark "eksik giriş"
     * sanılır.
     */
    if (s.iptalTarihi !== null) {
      k.iptal += 1;
      continue;
    }
    for (const kalem of s.items) {
      const iade = kalem.returnItems.reduce((t, r) => t + r.quantity, 0);
      k.brutAdet += kalem.quantity;
      k.netAdet += kalem.quantity - iade;
      k.tutar += Number(kalem.unitPriceAmount.toString()) * kalem.quantity;
    }
  }

  const yaz = (ad: string, k: Kova) =>
    console.log(
      `     ${ad.padEnd(22)} satır ${String(k.satir).padStart(4)} · brüt ${String(k.brutAdet).padStart(4)} · net ${String(k.netAdet).padStart(4)} · ₺${k.tutar.toFixed(2).padStart(12)} · iptal ${k.iptal}`,
    );

  for (const [kanal, hesaplar] of [...sayim].sort()) {
    console.log(`\n── ${kanal} ${"─".repeat(60 - kanal.length)}`);
    const kanalErken = bos();
    const kanalGec = bos();
    for (const [hesap, p] of [...hesaplar].sort()) {
      console.log(`   ${hesap}`);
      yaz("01–20.08 (kıyaslanır)", p.erken);
      yaz("20–24.08 (KIYAS YOK)", p.gec);
      for (const [hedef, kaynak] of [
        [kanalErken, p.erken],
        [kanalGec, p.gec],
      ] as const) {
        hedef.satir += kaynak.satir;
        hedef.brutAdet += kaynak.brutAdet;
        hedef.netAdet += kaynak.netAdet;
        hedef.tutar += kaynak.tutar;
        hedef.iptal += kaynak.iptal;
      }
    }
    if (hesaplar.size > 1) {
      console.log(`   ${kanal} TOPLAMI`);
      yaz("01–20.08", kanalErken);
      yaz("20–24.08", kanalGec);
    }

    // ── DÖKÜM KIYASI: YALNIZ TRENDYOL, YALNIZ İLK PENCERE ──────────────
    if (kanal === "Trendyol") {
      console.log(`\n   ⚖ DÖKÜM KIYASI — YALNIZ 01–20.08`);
      console.log(
        `     döküm beyanı   ${DOKUM_BEYANI.adet} adet · ₺${DOKUM_BEYANI.tutar.toFixed(2)}`,
      );
      console.log(
        `     bizde (brüt)   ${kanalErken.brutAdet} adet · ₺${kanalErken.tutar.toFixed(2)}`,
      );
      console.log(
        `     FARK           ${kanalErken.brutAdet - DOKUM_BEYANI.adet} adet · ₺${(kanalErken.tutar - DOKUM_BEYANI.tutar).toFixed(2)}`,
      );
      console.log(
        `     ⚠ 20–24.08 penceresi bu kıyasa GİRMEZ — o dönem hiçbir`,
      );
      console.log(`       dökümle kapatılmadı. Sayımı ayrı satırda duruyor.`);
    }
    if (kanal === "Hepsiburada") {
      console.log(`\n   ⚠ HB DÖKÜMÜ 15.08'E KADARDI — bu pencerede kıyas`);
      console.log(`     kurulamaz. Rakamlar YALNIZ sayımdır, hüküm değil.`);
    }
  }

  // ── ③ ÇİFT KAYIT ──────────────────────────────────────────────────────
  console.log(`\n── ÇİFT KAYIT KONTROLÜ ${"─".repeat(46)}`);
  const ikili = new Map<string, string[]>();
  for (const s of satislar) {
    if (s.iptalTarihi !== null) continue;
    for (const k of s.items) {
      const barkod = k.variant.barcode ?? k.variant.sku;
      const anahtar = `${s.code ?? "(kodsuz)"}|${barkod}`;
      if (!ikili.has(anahtar)) ikili.set(anahtar, []);
      ikili.get(anahtar)!.push(s.id);
    }
  }
  const tekrar = [...ikili.entries()].filter(([, v]) => v.length > 1);
  console.log(`   sipariş no + barkod ikilisi: ${ikili.size} farklı`);
  console.log(`   TEKRAR EDEN: ${tekrar.length}`);
  /**
   * ⚠ TEKRAR ETMEK ÇİFT KAYIT DEMEK DEĞİLDİR. Aynı siparişte aynı ürün
   * iki satırda geçebilir (farklı fiyattan). Bu yüzden liste basılır,
   * hüküm verilmez.
   */
  if (tekrar.length > 0) {
    console.log(`   ⚠ HÜKÜM VERİLMEDİ — aynı siparişte aynı ürün iki`);
    console.log(`     satırda MEŞRU olarak geçebilir (farklı fiyat).`);
    for (const [a, v] of tekrar.slice(0, 15)) {
      console.log(`     ${a}  → ${v.length} kez`);
    }
  }

  console.log("\n" + "-".repeat(78));
  console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
  console.log("");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
