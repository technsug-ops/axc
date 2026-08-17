/**
 * ============================================================================
 *  KANAL KODSUZ KATALOG KAYITLARI — RAPOR
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:kanal-kodsuz
 *
 *  HİÇBİR ŞEY YAZMAZ. Yazma bayrağı da YOKTUR — tamamlama kararı veriye
 *  bakıp verilecek, betiğin işi listeyi çıkarmak.
 *
 *  ⚠ NİYE VAR — mimar kaydı 17.08.2026: katalogda Kanal SKU'su olmayan
 *  kayıtlar var. Etkisi ölçüldü:
 *
 *    · `aramaKosulu` (serbest metin) ve `kodKosulu` (okutulan kod) İKİSİ de
 *      `channelSkus`i sorguluyor. Yani kanal koduyla aranan kayıt BULUNMAZ.
 *    · Ama "kamerayla okutunca kayıtlı değil der" KOŞULLUDUR: okuyucu
 *      etiketteki kodu okur. Pazaryeri etiketi okutulursa eşleşme yok;
 *      **üretici EAN'ı okutulursa `barcode` alanından eşleşir.**
 *
 *  Bu yüzden rapor kayıtları KÖRLÜK DERECESİNE göre ayırır. İki ayrı
 *  aciliyet vardır ve tek listede toplanırsa ayrım kaybolur:
 *
 *    KÖR      — kanal kodu YOK **ve** barkod YOK. Hiçbir kodla bulunamaz;
 *               okutulunca "kayıtlı değil — yeni ürün" der ve operatör
 *               var olan ürünü ikinci kez açar. GERÇEK RİSK BUDUR.
 *    YARI KÖR — kanal kodu yok ama barkod var. EAN ile bulunur; yalnız
 *               pazaryeri kodu aranınca kaçar.
 *
 *  ── SATIŞI OLAN ÖNCE ────────────────────────────────────────────────────
 *  Hiç satılmamış bir kaydın kanal kodu eksik olması bekler; satılmış
 *  olanınki bekleyemez — o ürün operasyonda AKTİF olarak aranıyor demektir.
 *  Liste buna göre sıralanır.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
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

  console.log("");
  console.log("KANAL KODSUZ KATALOG KAYITLARI");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log("  kip        RAPOR — hiçbir şey yazılmaz");
  console.log("");

  /**
   * ÖLÇÜT: aktif kanal SKU'su OLMAYAN aktif varyant.
   *
   * `isActive: false` kanal SKU'su "yok" sayılır — pasif kod aramada da
   * kullanılmıyor (`aramaKosulu` içinde `isActive: true` şartı var).
   * Ölçüt ekranınkiyle aynı olmalı, yoksa rapor "var" derken arama
   * "yok" davranırdı.
   */
  const kayitlar = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      channelSkus: { none: { isActive: true } },
    },
    select: {
      id: true,
      sku: true,
      companySku: true,
      barcode: true,
      product: { select: { name: true } },
      _count: { select: { saleItems: true, purchaseItems: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const toplamAktif = await prisma.productVariant.count({ where: { isActive: true } });

  const bosMu = (d: string | null) => d === null || d.trim() === "";
  const kor = kayitlar.filter((k) => bosMu(k.barcode));
  const yariKor = kayitlar.filter((k) => !bosMu(k.barcode));

  console.log(`  KANAL KODSUZ : ${kayitlar.length} / ${toplamAktif} aktif varyant`);
  console.log(`     KÖR       : ${kor.length}  (kanal kodu YOK + barkod YOK — hiçbir kodla bulunamaz)`);
  console.log(`     yarı kör  : ${yariKor.length}  (barkodu var — EAN ile bulunur)`);
  console.log("");

  function dok(baslik: string, liste: typeof kayitlar) {
    if (liste.length === 0) return;
    console.log(`  ── ${baslik} ${"─".repeat(Math.max(0, 60 - baslik.length))}`);
    console.log(
      `     ${doldur("SKU", 16)} ${doldur("Firma SKU", 16)} ${doldur("Barkod", 15)} sat/alm  ürün`,
    );
    /** SATIŞI OLAN ÖNCE — aktif aranan ürün beklemez. */
    for (const k of [...liste].sort((a, b) => b._count.saleItems - a._count.saleItems)) {
      console.log(
        `     ${doldur(k.sku ?? "—", 16)} ${doldur(k.companySku ?? "—", 16)} ` +
          `${doldur(k.barcode ?? "—", 15)} ${doldur(`${k._count.saleItems}/${k._count.purchaseItems}`, 8)} ` +
          `${k.product.name.slice(0, 46)}`,
      );
    }
    console.log("");
  }

  dok("KÖR — ÖNCE BUNLAR", kor);
  dok("YARI KÖR — barkoduyla bulunuyor", yariKor);

  /**
   * TAMAMLAMA YOLU ÖNERİSİ — veriye bakarak, tahminle değil.
   *
   * Türetme ancak ürünün o kanalda GERÇEKTEN satılmış olmasıyla
   * gerekçelendirilebilir; satılmışsa kanal tarafında bir kodu vardır ve
   * eşleştirme bir tahmin değil, kaydın kendisidir. Hiç satılmamış üründe
   * türetilecek kaynak yoktur — orada tek yol elle girmektir.
   */
  const satilmis = kayitlar.filter((k) => k._count.saleItems > 0);
  console.log("  ── TAMAMLAMA YOLU ──────────────────────────────────────────");
  console.log(`     satışı OLAN  : ${satilmis.length}  → kanal kaydından türetilebilir`);
  console.log(`     satışı YOK   : ${kayitlar.length - satilmis.length}  → ELLE girilecek, türetilecek kaynak yok`);
  console.log("");
  console.log("     ⚠ TÜRETMEDE ÇAKIŞMA KURALI ŞART. Yanlış kanal koduna");
  console.log("       bağlanan ürün, hiç bağlanmamış üründen TEHLİKELİDİR:");
  console.log("       hiç bağlanmamış olan 'bulunamadı' der ve kullanıcı");
  console.log("       durur; yanlış bağlanan SESSİZCE başka ürünü getirir.");
  console.log("       Bir kanal kodu birden çok varyanta düşüyorsa o satır");
  console.log("       türetilmez, elle karara bırakılır.");
  console.log("");

  await prisma.$disconnect();
}

main();
