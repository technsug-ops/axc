/**
 * ============================================================================
 *  BARKOD BAŞTAKİ SIFIR — ÖLÇÜM (K100)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:barkod-sifir
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ. Yazma bayrağı da YOKTUR.
 *
 *  ── VAKA (30.08.2026, Halil · /yerlestir) ───────────────────────────────
 *  Okutulan kod `0194644037598` → "Bu kod ne ürün ne raf olarak bulundu".
 *  Baştaki sıfır elle silinince ürün ÇIKIYOR. Yani bilgi sistemde VAR, arama
 *  sormuyordu — ekran YANLIŞ CEVAP veriyor.
 *
 *  Sebep hipotezi: UPC-A ↔ EAN-13. UPC-A 12 hanedir; EAN-13 aynı kodun
 *  başına sıfır konmuş hâlidir. Okuyucu (ve kamera) çoğu kez 13 hane
 *  döndürür, katalogda ise 12 hane yazılıdır.
 *
 *  ── ⛔ ÖLÇÜLMEDEN KURAL YAZILMAZ ────────────────────────────────────────
 *  "Baştaki sıfırı kırp" makul görünüyor ve TAM BU YÜZDEN tehlikeli.
 *  Anayasa: "bir sınırın yönü ölçülmeden çevrilmez". Sorulacak soru
 *  "kırpmak doğru mu" değil, "kırpınca iki AYRI ürün aynı koda düşüyor mu"
 *  dur — çünkü okutulan kod TAM eşleşme ile aranıyor ve yanlış eşleşme
 *  YANLIŞ ÜRÜNE yazar (stok yanlış rafa, satış yanlış varyanta).
 *
 *  Bu yüzden betik dört şeyi AYRI sayar:
 *    ① dağılım  — kaç barkod 12/13 hane, kaçı sıfırla başlıyor
 *    ② çakışma  — normalleştirme iki farklı varyantı aynı anahtara
 *                 düşürüyor mu (ROLLER ARASI da bakılır)
 *    ③ kazanç   — kural bugün kaç okumayı KURTARIR
 *    ④ vaka     — Halil'in okuttuğu kodun kendisi
 *
 *  ⚠ VE KAPSAM DÖRT ROLÜN HEPSİ: `kodKosulu` barkod · Firma SKU · SKU ·
 *  Kanal SKU arıyor. Yalnız barkoda bakan bir ölçüm, kuralın öteki
 *  rollerde açacağı çakışmayı göremezdi.
 *  _(Anayasa: "kapsam genişlemesi, bağımlı listelerin de genişlemesidir".)_
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** Ölçülen ADAY kural — kodun eşdeğerleri. SAF, veritabanı bilmez. */
function esdegerler(kod: string): string[] {
  const k = kod.trim();
  const cikti = new Set<string>([k]);
  if (/^\d{13}$/.test(k) && k.startsWith("0")) cikti.add(k.slice(1));
  if (/^\d{12}$/.test(k)) cikti.add("0" + k);
  return [...cikti];
}

/** Çakışma ölçümü için TEK anahtar: 13 hane + baştaki sıfır ise 12 haneye iner. */
function anahtar(kod: string): string {
  const k = kod.trim();
  return /^\d{13}$/.test(k) && k.startsWith("0") ? k.slice(1) : k;
}

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
  console.log("BARKOD BAŞTAKİ SIFIR — ÖLÇÜM (K100)");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        SALT OKUMA — hiçbir şey yazılmaz");
  console.log("");

  const varyantlar = await prisma.productVariant.findMany({
    select: {
      id: true,
      sku: true,
      companySku: true,
      barcode: true,
      isActive: true,
      product: { select: { name: true } },
      channelSkus: { select: { channelSku: true, isActive: true } },
    },
  });

  /** ═══ ① DAĞILIM ══════════════════════════════════════════════════════ */
  console.log("① DAĞILIM — " + varyantlar.length + " varyant");

  const barkodlar = varyantlar
    .map((v) => (v.barcode ?? "").trim())
    .filter((b) => b !== "");

  const uzunlukSayaci = new Map<string, number>();
  for (const b of barkodlar) {
    const etiket = /^\d+$/.test(b) ? String(b.length) + " hane" : "sayı DEĞİL";
    uzunlukSayaci.set(etiket, (uzunlukSayaci.get(etiket) ?? 0) + 1);
  }

  console.log("   barkodu OLAN varyant           " + barkodlar.length);
  console.log("   barkodu boş                    " + (varyantlar.length - barkodlar.length));
  for (const [u, n] of [...uzunlukSayaci.entries()].sort()) {
    console.log("     " + doldur(u, 28) + String(n).padStart(6));
  }
  console.log("   sıfır ile BAŞLAYAN barkod      " + barkodlar.filter((b) => b.startsWith("0")).length);
  console.log("");

  /** ═══ ② ÇAKIŞMA — kural iki ürünü karıştırır mı ═════════════════════ */
  console.log("② ÇAKIŞMA — kural iki AYRI varyantı aynı anahtara düşürüyor mu");

  type Kayit = { vid: string; rol: string; ham: string; ad: string };
  const kayitlar: Kayit[] = [];
  for (const v of varyantlar) {
    const ad = v.product.name;
    if (v.barcode && v.barcode.trim()) {
      kayitlar.push({ vid: v.id, rol: "barkod", ham: v.barcode.trim(), ad });
    }
    if (v.companySku && v.companySku.trim()) {
      kayitlar.push({ vid: v.id, rol: "firmaSKU", ham: v.companySku.trim(), ad });
    }
    if (v.sku && v.sku.trim()) {
      kayitlar.push({ vid: v.id, rol: "SKU", ham: v.sku.trim(), ad });
    }
    for (const c of v.channelSkus) {
      if (c.isActive && c.channelSku.trim()) {
        kayitlar.push({ vid: v.id, rol: "kanalSKU", ham: c.channelSku.trim(), ad });
      }
    }
  }

  const gruplar = new Map<string, Kayit[]>();
  for (const k of kayitlar) {
    const a = anahtar(k.ham);
    const g = gruplar.get(a);
    if (g) g.push(k);
    else gruplar.set(a, [k]);
  }

  /**
   * ⚠ ÇAKIŞMA ÖLÇÜTÜ: aynı anahtarda BİRDEN ÇOK VARYANT olması. Aynı
   * varyantın iki rolü aynı anahtara düşerse sorun YOKTUR — arama zaten o
   * varyanta gider. Tehlike, iki FARKLI ürünün karışmasıdır.
   *
   * ⚠ VE YALNIZ KURALIN AÇTIĞI ÇAKIŞMA SAYILIR: ham hâlde de aynı olan
   * kodlar bugün de çakışıyor; onlar bu kuralın günahı değildir ve ayrı
   * sayılır. _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim
   * denetim değildir" — burada da iki sebep tek kefeye konmaz.)_
   */
  const kuralinActigi: Array<[string, Kayit[]]> = [];
  const zatenVar: Array<[string, Kayit[]]> = [];
  for (const [a, g] of gruplar) {
    const vidler = new Set(g.map((k) => k.vid));
    if (vidler.size < 2) continue;
    const hamlar = new Set(g.map((k) => k.ham));
    if (hamlar.size === 1) zatenVar.push([a, g]);
    else kuralinActigi.push([a, g]);
  }

  console.log("   kural YÜZÜNDEN çakışan anahtar   " + kuralinActigi.length);
  console.log("   ZATEN çakışan (kuralsız da)      " + zatenVar.length);
  for (const [a, g] of kuralinActigi.slice(0, 15)) {
    console.log("     ⛔ " + a);
    for (const k of g) {
      console.log("        " + doldur(k.rol, 10) + doldur(k.ham, 16) + k.ad.slice(0, 45));
    }
  }
  console.log("");

  /** ═══ ③ KAZANÇ ══════════════════════════════════════════════════════ */
  console.log("③ KAZANÇ — bugün bulunamayan, kuralla bulunacak okumalar");

  const hamIndeks = new Map<string, Kayit[]>();
  for (const k of kayitlar) {
    const g = hamIndeks.get(k.ham);
    if (g) g.push(k);
    else hamIndeks.set(k.ham, [k]);
  }

  /**
   * Okutulacak kodların kaynağı: katalogdaki 12 haneli barkodların EAN-13
   * hâli. Okuyucudan sıfır+kod olarak gelebilir ve bugün BULUNAMIYOR.
   */
  const onikilik = barkodlar.filter((b) => /^\d{12}$/.test(b));
  let kurtarilan = 0;
  const ornekler: string[] = [];
  for (const b of onikilik) {
    const okunan = "0" + b;
    if (hamIndeks.has(okunan)) continue; // bugün de bulunuyor
    const bulunan = esdegerler(okunan).filter((e) => hamIndeks.has(e));
    if (bulunan.length > 0) {
      kurtarilan++;
      if (ornekler.length < 5) ornekler.push(okunan + "  →  " + bulunan.join(", "));
    }
  }
  console.log("   12 haneli barkod (UPC-A)         " + onikilik.length);
  console.log("   kuralla KURTARILAN okuma         " + kurtarilan);
  for (const o of ornekler) console.log("     " + o);
  console.log("");

  /** ═══ ⑤ GÖNDERİ NUMARASI — KURAL ORAYA DA TAŞAR MI ═════════════════
   *
   * ⚠ `kodKosulu` varyant rollerini arar, ama `/okut` AYRICA `shipmentCode`
   * sorar (SATIS rolü). Eşdeğer kural o kümeye de dokunacaksa çakışması
   * AYRICA ölçülür — dört varyant rolünde sıfır çıkması, beşinci rol
   * hakkında hiçbir şey söylemez.
   * _(Anayasa: "kapsam genişlemesi, bağımlı listelerin de genişlemesidir".)_
   */
  const gonderiler = await prisma.sale.findMany({
    where: { shipmentCode: { not: null } },
    select: { shipmentCode: true },
  });
  const gKodlar = gonderiler
    .map((g) => (g.shipmentCode ?? "").trim())
    .filter((g) => g !== "");
  const varyantAnahtarlari = new Set(kayitlar.map((k) => anahtar(k.ham)));
  let gCakisma = 0;
  const gOrnek: string[] = [];
  for (const g of gKodlar) {
    for (const e of esdegerler(g)) {
      if (e === g) continue;
      if (varyantAnahtarlari.has(anahtar(e)) || hamIndeks.has(e)) {
        gCakisma++;
        if (gOrnek.length < 5) gOrnek.push(g + "  →  " + e);
      }
    }
  }
  console.log("⑤ GÖNDERİ NUMARASI — kuralın taşma riski");
  console.log("   gönderi numarası olan satış      " + gKodlar.length);
  console.log("   12/13 hane sayısal olan          " + gKodlar.filter((g) => /^\d{12,13}$/.test(g)).length);
  console.log("   eşdeğeri bir ÜRÜN koduna düşen   " + gCakisma);
  for (const o of gOrnek) console.log("     ⛔ " + o);
  console.log("");

  /** ═══ ④ HALİL'İN SOMUT VAKASI ═══════════════════════════════════════ */
  const VAKA = "0194644037598";
  console.log("④ HALİL'İN VAKASI — " + VAKA);
  for (const e of esdegerler(VAKA)) {
    const g = hamIndeks.get(e);
    if (!g || g.length === 0) {
      console.log("   " + doldur(e, 16) + "bulunamadı");
    } else {
      for (const k of g) {
        console.log("   " + doldur(e, 16) + doldur(k.rol, 10) + k.ad.slice(0, 50));
      }
    }
  }
  console.log("");

  await prisma.$disconnect();
}

main();
