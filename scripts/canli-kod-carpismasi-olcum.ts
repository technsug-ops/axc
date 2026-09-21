import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { kodEsdegerleri } from "../src/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  KOD ÇARPIŞMASI — BİR KOD KAÇ AKTİF VARYANTA ÇÖZÜLÜYOR (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — hiçbir şey yazmaz, tekrar koşulabilir.
 *
 *  ⛔ NİYE DOĞDU (kullanıcı bildirimi 21.09.2026). Hepsiburada siparişi
 *  onaylanamıyordu: _"bu üründen 2 tane stok kaydı var, birinde 4 stok var,
 *  diğeri sıfır; sipariş 0 stoktan düşmeye çalışıyor."_ Ekran
 *  `Stok yetersiz (HBCV00000R0H0K: 0/1)` diyordu ve rakam DOĞRUYDU — yanlış
 *  olan, kodun hangi varyanta çözüldüğüydü.
 *
 *  ── MEKANİZMA ──────────────────────────────────────────────────────────
 *  `varyantKodlaBul` dört kod rolünü birden arıyor (sku · firmaSku · barkod ·
 *  kanalSku) ve `findFirst` ile TEK sonuç alıyor — **sıralama yok.** Bir kod
 *  iki aktif varyanta çözüldüğünde hangisinin geleceği veritabanının o anki
 *  sırasına kalıyor ve **kaybeden sessizce düşüyor.** Anayasa bu sınıfı
 *  adıyla anıyor: _"seçici ölçüt, evren genişlediğinde ne yapacağıyla
 *  tasarlanır — bugün doğru cevabı vermesi, sınanmış olduğunu göstermez."_
 *
 *  ── KÖK: KANAL KODU KİMLİK ALANINA YAZILMIŞ ────────────────────────────
 *  Ölçülen üç çiftin üçünde de aynı şey var: bir pazaryeri kodu (`HBCV…`,
 *  TY barkodu) ikinci bir varyantın **`sku`/`firmaSku`/`barkod`** alanına
 *  yazılmış. Anayasadaki üç kod rolü ayrımının ihlali — Kanal SKU bir
 *  KİMLİK değildir, eşleştirmedir.
 *
 *  ⚠ BU BETİK KARAR VERMEZ. Hangi kaydın yaşayacağı, geçmişin nereye
 *  taşınacağı operatör kararıdır; burada yalnız ÇARPIŞMA ölçülür.
 *  _(Anayasa: "imkânsız görünen değer önce DOĞRULANIR — düzeltilmez.")_
 *
 *  ⚠ ÖLÇÜM EŞDEĞERLERİ AÇAR. `887961643367` ile `0887961643367` iki ayrı
 *  dizedir ve `@unique` kısıtı ikisini de kabul eder — ama arama onları
 *  DENK sayar (UPC-A ↔ EAN-13). Çarpışmayı yalnız arama kuralının kendi
 *  denkliğiyle bakan bir ölçüm görebilir; ham dize karşılaştırması KÖRDÜR.
 * ============================================================================
 */

type Sahip = { vid: string; roller: string[] };

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nKOD ÇARPIŞMASI — bir kod kaç aktif varyanta çözülüyor");
  console.log("  kip  SALT OKUMA — hiçbir şey yazılmaz");
  console.log("=".repeat(70));

  const varyantlar = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      companySku: true,
      barcode: true,
      createdAt: true,
      product: { select: { name: true } },
      channelSkus: {
        select: {
          channelSku: true,
          channelAccount: { select: { channel: { select: { code: true } } } },
        },
      },
    },
  });

  /**
   * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR. Sorgu boş dönerse aşağıdaki döngü
   * hiç dönmez ve betik "çarpışma yok" der — boş küme her koşulu sağlar.
   * (Anayasa: `every` kapısının tarama tarafı.)
   */
  if (varyantlar.length < 100) {
    console.log(`⛔ TABAN ŞÜPHELİ: yalnız ${varyantlar.length} aktif varyant okundu.`);
    console.log("   Ölçüm GEÇERSİZ — bağlantı ya da süzgeç hatalı olabilir.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const stok = new Map<string, number>();
  for (const g of await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
  })) {
    stok.set(g.variantId, Number(g._sum.quantityDelta ?? 0));
  }

  const harita = new Map<string, Map<string, string[]>>();
  const ekle = (kod: string | null, vid: string, rol: string) => {
    if (!kod) return;
    for (const esdeger of kodEsdegerleri(kod.trim())) {
      if (!esdeger) continue;
      const sahipler = harita.get(esdeger) ?? new Map<string, string[]>();
      const roller = sahipler.get(vid) ?? [];
      if (!roller.includes(rol)) roller.push(rol);
      sahipler.set(vid, roller);
      harita.set(esdeger, sahipler);
    }
  };

  for (const v of varyantlar) {
    ekle(v.sku, v.id, "sku");
    ekle(v.companySku, v.id, "firmaSku");
    ekle(v.barcode, v.id, "barkod");
    for (const c of v.channelSkus) {
      ekle(c.channelSku, v.id, "kanal:" + c.channelAccount.channel.code);
    }
  }

  const bilgi = new Map(varyantlar.map((v) => [v.id, v]));

  /**
   * ⚠ ÇİFT SAYIM ENGELLENİR. Aynı çift hem `887961643367` hem
   * `0887961643367` altında görünür; "6 çarpışma" demek üçü ikiye katlayıp
   * arızayı olduğundan BÜYÜK gösterirdi. Anayasa: _"kayıp abartısı, kayıp
   * küçültmesi kadar yanlıştır — ve daha sinsidir."_
   */
  const gorulenCift = new Set<string>();
  const ciftler: { kodlar: string[]; sahipler: Sahip[] }[] = [];

  for (const [kod, sahipHaritasi] of harita) {
    if (sahipHaritasi.size < 2) continue;
    const imza = [...sahipHaritasi.keys()].sort().join("|");
    const mevcut = ciftler.find((c) => c.sahipler.map((s) => s.vid).sort().join("|") === imza);
    if (mevcut) {
      mevcut.kodlar.push(kod);
      continue;
    }
    gorulenCift.add(imza);
    ciftler.push({
      kodlar: [kod],
      sahipler: [...sahipHaritasi.entries()].map(([vid, roller]) => ({ vid, roller })),
    });
  }

  console.log(`\nTABAN: ${varyantlar.length} aktif varyant · ${harita.size} benzersiz kod`);
  console.log(`ÇARPIŞAN KÜME: ${ciftler.length}`);
  console.log(`  (kod sayısı ${[...harita.values()].filter((m) => m.size > 1).length} — eşdeğerler aynı kümeyi iki kez gösterir)`);

  if (ciftler.length === 0) {
    /** AÇIK SIFIR: "baktım, temiz" ile "hiç bakmadım" ekranda aynı görünmez. */
    console.log("\n  Hiçbir kod iki aktif varyanta çözülmüyor — arama tekil.");
  }

  for (const c of ciftler) {
    console.log("\n" + "-".repeat(70));
    console.log(`KOD(lar): ${c.kodlar.join(" · ")}`);
    for (const s of c.sahipler) {
      const v = bilgi.get(s.vid);
      if (!v) continue;
      const kanal = v.channelSkus
        .map((k) => k.channelAccount.channel.code + ":" + k.channelSku)
        .join(" | ");
      console.log(
        `  stok=${String(stok.get(s.vid) ?? 0).padStart(4)}  [${s.roller.join("+")}]`,
      );
      console.log(`      ${s.vid}  sku=${v.sku}  barkod=${v.barcode ?? "-"}`);
      console.log(`      kanal=[${kanal || "YOK"}]  oluşturuldu=${v.createdAt.toISOString().slice(0, 10)}`);
      console.log(`      "${v.product.name.slice(0, 60)}"`);
    }
  }

  console.log("\n" + "=".repeat(70));
  await prisma.$disconnect();
}

main();
