import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  MALİYETİ DAMGALANMAMIŞ ÇIKIŞLAR — FIFO'DAN TÜRETİLEBİLİR Mİ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — K118① ölçümü; HİÇBİR ŞEY YAZMAZ.
 *
 *  ⛔ YAZMA YOK VE BU BİR TERCİH DEĞİL, ŞART: kullanıcı kararı 31.08.2026 —
 *  "türetilebiliyorsa damga yazımı AYRI onay ister; şimdi yazma, rakamı
 *  raporla." Bu betik damga YAZMAZ, yalnız NE OLURDU sorusunu cevaplar.
 *
 *  ── ⛔ İKİNCİ BİR FIFO YAZILMADI ───────────────────────────────────────
 *  Maliyet, çıkış anındaki açık partilerden `acikPartilerToplu` +
 *  `fifoDagit` ÇAĞRILARAK türetiliyor. Elle bir dağıtım yazmak, kâr
 *  motorunun kullandığı kuralla ayrışabilecek İKİNCİ bir gövde doğururdu
 *  ve rapor "motorun yazacağı damga" olmaktan çıkardı.
 *  _(Anayasa: aynı kural iki gövdede yaşamaz.)_
 *
 *  ── ⚠ SINIR: ÇIKIŞIN KENDİ ANI ────────────────────────────────────────
 *  `acikPartilerToplu(sınır)` `lt` kullanıyor — "o anın BAŞLANGICI itibarıyla".
 *  Çıkışın KENDİ `occurredAt`i verilirse o gün alınmış partiler dışarıda
 *  kalır. 29.08'de FIFO sınırında tam bu yaşandı: defterin %48,72'si aynı gün
 *  alınıp aynı gün satılıyordu. Bu yüzden sınır ÇIKIŞ GÜNÜNÜN SONU.
 *
 *  ── ⚠ VE TÜRETİLEMEYEN DE SAYILIR ────────────────────────────────────
 *  "Hepsi türetilebilir" ile "bakamadım" ayrı yazılır; ikisi ekranda aynı
 *  görünürse rapor yalancı yeşil üretir.
 * ============================================================================
 */

function gunSonu(t: Date): Date {
  const d = new Date(t);
  d.setUTCHours(23, 59, 59, 999);
  return d;
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
  const { acikPartilerToplu, fifoDagit } = await import("../src/lib/stok");

  console.log("\nDAMGASIZ ÇIKIŞLAR — FIFO'DAN TÜRETİLEBİLİR Mİ");
  console.log("  hedef  " + y.veri.adres.hostname);
  console.log("  kip    SALT OKUMA — HİÇBİR ŞEY YAZILMAZ");
  console.log("  an     " + new Date().toISOString());
  console.log("=".repeat(70));

  const damgasizlar = await prisma.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 }, unitCostAmount: null },
    select: {
      id: true,
      type: true,
      occurredAt: true,
      quantityDelta: true,
      note: true,
      variantId: true,
      variant: { select: { sku: true, name: true } },
    },
    orderBy: { occurredAt: "asc" },
  });

  console.log(`\n   damgasız çıkış hareketi   ${damgasizlar.length}`);
  console.log(
    `   toplam adet               ${damgasizlar.reduce((t, h) => t + Math.abs(h.quantityDelta), 0)}\n`,
  );

  let turetilen = 0;
  let turetilemeyen = 0;
  let toplamTutar = 0;
  const turetilemeyenSebep = new Map<string, number>();

  for (const h of damgasizlar) {
    const adet = Math.abs(h.quantityDelta);
    /**
     * ⚠ SINIR ÇIKIŞ GÜNÜNÜN SONU — çıkış anı verilseydi aynı gün alınmış
     * parti dışarıda kalır ve maliyet haksız yere "türetilemedi" sayılırdı.
     */
    const partiler = await acikPartilerToplu(
      prisma,
      [h.variantId],
      gunSonu(h.occurredAt),
    );
    const liste = partiler.get(h.variantId) ?? [];

    /**
     * ⚠ AÇIK PARTİLER BUGÜNÜN DURUMU DEĞİL, O ANIN DURUMUDUR — ama
     * `acikPartilerToplu` sınırdan ÖNCEKİ hareketleri de düşerek hesaplıyor,
     * yani o anki kalanı veriyor. Yine de bu çıkış O ANDA yapılmış olduğu
     * için partiler onu da tüketmiş olabilir; bu yüzden sonuç "o an ne
     * yazılabilirdi" sorusunun cevabıdır, kesin bir yeniden kurgu değil.
     */
    const sonuc = fifoDagit(liste, adet);
    if (!sonuc.yeterliMi) {
      turetilemeyen += 1;
      const sebep = liste.length === 0 ? "AÇIK PARTİ YOK" : "PARTİ YETMİYOR";
      turetilemeyenSebep.set(sebep, (turetilemeyenSebep.get(sebep) ?? 0) + 1);
      console.log(
        `   ⛔ ${h.occurredAt.toISOString().slice(0, 10)}  ${h.type.padEnd(18)} ${String(h.quantityDelta).padStart(4)}  ${h.variant.sku}`,
      );
      console.log(
        `        TÜRETİLEMEDİ — ${sebep} (o an mevcut: ${sonuc.mevcut}, gereken: ${adet})`,
      );
      continue;
    }

    /**
     * ⚠ TUTAR TEK KAPIDAN GEÇİYOR — VE BU KAPI BİR HATADAN SONRA KURULDU.
     * İlk yazımda `p.birimMaliyet === null` deniyordu; `FifoPayi` şekli
     * `{ parti, adet }` olduğu için o alan **`undefined`**di, `=== null`
     * karşılaştırması FALSE döndü ve üç satır "✓ türetilebilir" diye
     * işaretlendi — tutarları `NaN` olarak. Yalancı yeşili yakalayan tek
     * şey toplamın `NaN` basmasıydı.
     * ⛔ ÇARE DAL BAŞINA KONTROL DEĞİL, ÇIKIŞI TEK KAPIDAN GEÇİRMEK:
     * sonlu olmayan her değer BİLİNMEYENDİR. _(Anayasa: "sınanmayan dal,
     * sınanmamış koddur" — çare çıkışı tek kapıdan geçirmektir.)_
     */
    const paylar = sonuc.dagitim.map((p) => ({
      adet: p.adet,
      birim:
        p.parti.birimMaliyet === null ? NaN : Number(p.parti.birimMaliyet),
    }));
    const eksikParti = paylar.some((p) => !Number.isFinite(p.birim));
    if (eksikParti) {
      turetilemeyen += 1;
      turetilemeyenSebep.set(
        "PARTİ MALİYETİ BOŞ",
        (turetilemeyenSebep.get("PARTİ MALİYETİ BOŞ") ?? 0) + 1,
      );
      console.log(
        `   ⛔ ${h.occurredAt.toISOString().slice(0, 10)}  ${h.type.padEnd(18)} ${String(h.quantityDelta).padStart(4)}  ${h.variant.sku}`,
      );
      console.log("        TÜRETİLEMEDİ — tüketilecek partinin maliyeti BOŞ");
      continue;
    }

    const tutar = paylar.reduce((t, p) => t + p.adet * p.birim, 0);
    turetilen += 1;
    toplamTutar += tutar;
    console.log(
      `   ✓  ${h.occurredAt.toISOString().slice(0, 10)}  ${h.type.padEnd(18)} ${String(h.quantityDelta).padStart(4)}  ${h.variant.sku}`,
    );
    console.log(
      `        türetilen maliyet: ${tutar.toFixed(2)}   (${paylar
        .map((p) => `${p.adet}×${p.birim.toFixed(2)}`)
        .join(" + ")})`,
    );
    if (h.note) console.log(`        not: ${h.note.slice(0, 80)}`);
  }

  console.log("\n" + "-".repeat(70));
  console.log("   SONUÇ — dört sayı ayrı:\n");
  console.log(`   incelenen          ${damgasizlar.length}`);
  console.log(`   TÜRETİLEBİLEN      ${turetilen}`);
  console.log(`   türetilemeyen      ${turetilemeyen}`);
  for (const [s, n] of turetilemeyenSebep) console.log(`     ${s.padEnd(20)} ${n}`);
  console.log(
    `\n   TÜRETİLEBİLEN MALİYET TOPLAMI   ${toplamTutar.toFixed(2)} TL`,
  );
  console.log("\n   ⛔ HİÇBİR DAMGA YAZILMADI — yazım AYRI onay ister.");

  await prisma.$disconnect();
}

void main();
