/**
 * BETIK SINIFI: TEK_SEFERLIK — K91 bağ onarımı KURU KOŞUM (31.08.2026).
 *
 * ⛔ SALT OKUMA. Hiçbir şey yazmaz. Tek çıktı: dört sınıflık rapor.
 *
 * ── ÖLÇÜT (panodan, K91) ──────────────────────────────────────────────
 *   "Çıkışın İŞ TARİHİNDE AÇIK OLAN ve `unitCostAmount`'ı damgaya
 *    KURUŞUNA eşit parti."
 *
 * ⚠ "AÇIK OLAN" GERÇEKTEN SİMÜLE EDİLİYOR — kısayol alınmadı. Yalnız
 * "partinin tarihi çıkıştan önce" demek yetmez: o parti o an TÜKENMİŞ
 * olabilir ve ona bağlamak partiyi eksiye indirirdi. Bu yüzden defter
 * varyant varyant, İŞ TARİHİ sırasıyla YENİDEN OYNATILIYOR ve her çıkış
 * anındaki gerçek kalanlar hesaplanıyor.
 *
 * ⚠ SIRA: `occurredAt`, eşitlikte `createdAt`. İkinci ölçüt olmasaydı aynı
 * güne düşen hareketlerin sırası veritabanının keyfine kalırdı ve kuru
 * koşum her koşumda başka sonuç verebilirdi.
 *
 * ── DÖRT SINIF (kullanıcı şartı) ──────────────────────────────────────
 *   a) TEK partiye çözülen        → yazılacak küme
 *   b) BİRDEN ÇOK aday            → DOKUNULMAZ
 *   c) HİÇ aday yok               → DOKUNULMAZ
 *   d) Zaten doğru bağ            → dokunulmaz
 * ⚠ (a) içinde "yeni bağ = eski bağ" çıkanlar AYRICA sayılır: ölçütün
 * kendini DOĞRULAMASI ile bir bağı DÜZELTMESİ farklı şeylerdir.
 */
import { canliYapilandirma } from "./canli-ortak";

const y = canliYapilandirma();
if (!y.tamam) {
  console.error("canli yapilandirma:", y.hata);
  process.exit(1);
}
process.env.DATABASE_URL = y.veri.ham;

type Hareket = {
  id: string;
  variantId: string;
  occurredAt: Date;
  createdAt: Date;
  quantityDelta: number;
  unitCostAmount: string | null;
  sourceMovementId: string | null;
};

/** Kuruşa yuvarlanmış karşılaştırma — `Decimal`→float kuyruğu sahte fark üretmesin. */
function kurus(x: string | null): string | null {
  if (x === null) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const ham = await prisma.stockMovement.findMany({
    select: {
      id: true,
      variantId: true,
      occurredAt: true,
      createdAt: true,
      quantityDelta: true,
      unitCostAmount: true,
      sourceMovementId: true,
    },
  });
  const hareketler: Hareket[] = ham.map((h) => ({
    ...h,
    unitCostAmount: h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
  }));

  /** Varyant varyant, iş tarihi sırasıyla. */
  const varyantlar = new Map<string, Hareket[]>();
  for (const h of hareketler) {
    const l = varyantlar.get(h.variantId) ?? [];
    l.push(h);
    varyantlar.set(h.variantId, l);
  }

  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;
  let bagsiz = 0;
  let damgasiz = 0;
  const yazilacak: { cikis: string; eski: string; yeni: string; damga: string }[] = [];
  const ornekB: string[] = [];
  const ornekC: string[] = [];

  for (const [, liste] of varyantlar) {
    liste.sort(
      (x, z) =>
        x.occurredAt.getTime() - z.occurredAt.getTime() ||
        x.createdAt.getTime() - z.createdAt.getTime(),
    );

    /** Parti kimliği → o ana kadarki kalan. */
    const kalan = new Map<string, number>();
    /** Parti kimliği → kuruşa yuvarlanmış birim maliyet. */
    const maliyet = new Map<string, string | null>();

    for (const h of liste) {
      if (h.quantityDelta > 0) {
        kalan.set(h.id, h.quantityDelta);
        maliyet.set(h.id, kurus(h.unitCostAmount));
        continue;
      }
      if (h.quantityDelta === 0) continue;

      const adet = -h.quantityDelta;

      if (h.sourceMovementId === null) {
        bagsiz += 1;
        continue;
      }

      const damga = kurus(h.unitCostAmount);
      if (damga === null) {
        /** ⚠ Damgası olmayan çıkış ölçüte GİREMEZ — dokunulmaz, sayılır. */
        damgasiz += 1;
        const k = kalan.get(h.sourceMovementId) ?? 0;
        kalan.set(h.sourceMovementId, k - adet);
        continue;
      }

      /**
       * ⭐ ADAYLAR: O AN AÇIK (kalan > 0) ve damgaya KURUŞUNA eşit partiler.
       * Mevcut bağın kendisi de aday listesine girer — "zaten doğru" hâli
       * böyle ayrışıyor.
       */
      const adaylar: string[] = [];
      for (const [pid, k] of kalan) {
        if (k <= 0) continue;
        if (maliyet.get(pid) !== damga) continue;
        adaylar.push(pid);
      }

      if (adaylar.length === 0) {
        c += 1;
        if (ornekC.length < 5)
          ornekC.push(
            h.id.slice(0, 10) + " · " + h.occurredAt.toISOString().slice(0, 10) + " · damga " + damga,
          );
      } else if (adaylar.length > 1) {
        b += 1;
        if (ornekB.length < 5)
          ornekB.push(
            h.id.slice(0, 10) + " · " + h.occurredAt.toISOString().slice(0, 10) +
              " · damga " + damga + " · " + adaylar.length + " aday",
          );
      } else {
        const yeni = adaylar[0];
        if (yeni === h.sourceMovementId) {
          d += 1;
        } else {
          a += 1;
          yazilacak.push({ cikis: h.id, eski: h.sourceMovementId, yeni, damga });
        }
      }

      /**
       * ⚠ SİMÜLASYON MEVCUT BAĞI TÜKETİR, ÖNERİLENİ DEĞİL. Amaç bugünkü
       * defterin gerçek hâlini yeniden üretmek; öneriyi tüketseydik sonraki
       * çıkışların aday kümesi DEĞİŞİR ve kuru koşum var olmayan bir
       * defteri ölçerdi.
       */
      const k = kalan.get(h.sourceMovementId) ?? 0;
      kalan.set(h.sourceMovementId, k - adet);
    }
  }

  console.log("");
  console.log("K91 — BAĞ ONARIMI KURU KOŞUM (yazma YOK)");
  console.log("=".repeat(66));
  console.log("okuma anı :", new Date().toISOString());
  console.log("toplam hareket:", hareketler.length);
  console.log("");
  console.log("a) TEK partiye çözülen · BAĞ DEĞİŞİYOR :", a, "  ← yazılacak küme");
  /**
   * ⚠ "YENİ BAĞ = ESKİ BAĞ" AYRIMI SAYAÇLA DEĞİL KURGUYLA SAĞLANIYOR.
   * Ölçüt mevcut bağı doğruladığında satır `d` sınıfına gidiyor; `a`
   * sınıfına YAPISAL OLARAK giremez. Bir sayaç koymuştum ve hiç artmadı —
   * `lint` onu ölü kod diye yakaladı ve haklıydı. Sayacı bırakmak, olmayan
   * bir ihtimali ölçüyormuş gibi görünen bir satır bırakırdı.
   */
  console.log("   (yeni bağ = eski bağ olan satır a'ya GİREMEZ — d'ye gider)");
  console.log("d) ZATEN DOĞRU (ölçüt mevcut bağı doğruluyor):", d);
  console.log("b) BİRDEN ÇOK aday · DOKUNULMAZ        :", b);
  for (const o of ornekB) console.log("      " + o);
  console.log("c) HİÇ aday yok · DOKUNULMAZ           :", c);
  for (const o of ornekC) console.log("      " + o);
  console.log("");
  console.log("kapsam dışı — damgası olmayan çıkış    :", damgasiz);
  console.log("kapsam dışı — partiye hiç bağlı olmayan:", bagsiz);
  console.log("");
  const incelenen = a + b + c + d;
  console.log(
    "İNCELENEN " + incelenen +
      "  ·  DÜZELTİLECEK " + a +
      "  ·  DOKUNULMAZ " + (b + c + d) +
      "  ·  KAPSAM DIŞI " + (damgasiz + bagsiz),
  );
  console.log("");
  if (a > 0) {
    console.log("İLK 8 DÜZELTME (çıkış · eski parti → yeni parti · damga):");
    for (const x of yazilacak.slice(0, 8))
      console.log(
        "   " + x.cikis.slice(0, 10) + "  " + x.eski.slice(0, 10) + " → " + x.yeni.slice(0, 10) + "  ₺" + x.damga,
      );
  }
  await prisma.$disconnect();
}
main();
