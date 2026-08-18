/**
 * ============================================================================
 *  BEKLEME MALİYETİ — AŞAMA A · ÖLÇÜM RAPORU
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:bekleme-olcum
 *
 *  HİÇBİR ŞEY YAZMAZ. Yazma bayrağı da yoktur.
 *
 *  ── KAVRAM ──────────────────────────────────────────────────────────────
 *  Rafta bekleyen ürün = bağlı sermaye. Günlük bekleme maliyeti
 *      birim maliyet × (ortalama sermaye verimi ÷ ortalama dönüş günü)
 *  FIRSAT MALİYETİDİR, nakit gider DEĞİL. Bu ayrım pazarlıksız: rakam
 *  hiçbir muhasebe ekranına, panel toplamına, NET hesabına ya da hakedişe
 *  GİRMEZ (mimar sınırı 19.08.2026).
 *
 *  ── BU BETİK BİR KAPIDIR, ÖZELLİK DEĞİL ─────────────────────────────────
 *  ⚠ Aşama B (kartta bilgi satırı) yalnız BU RAPOR SAĞLAM ÇIKARSA açılır.
 *  Örneklem 20'nin altındaysa rapor "veri kaba — BEKLETİLİR" der ve hüküm
 *  vermez. Kaba ortalamayla motor kurulmaz: 6 satıştan çıkan bir "günlük
 *  ₺3,40" rakamı ekranda 60 satıştan çıkmış gibi görünür ve kullanıcı ona
 *  göre ürün eler.
 *
 *  _"Ölçütün gerçekliği ölçümden ÖNCE sorulur" dersinin uygulaması._
 * ============================================================================
 */

import { gunDegeri, isTakvimGunu } from "../src/lib/donem";
import { kalemMaliyeti } from "../src/lib/kalem-maliyeti";
import { acikPartilerToplu } from "../src/lib/stok";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * GÜVENİLİRLİK EŞİĞİ — mimar kararı 19.08.2026.
 * Bunun altında hüküm verilmez, özellik bekletilir.
 */
const ASGARI_ORNEKLEM = 20;

/** Tabloda gösterilecek ürün sayısı — döküm değil, örnek. */
const TABLO_SATIRI = 10;

/**
 * ⚠ ÖRNEKLEM SAYISI TEK BAŞINA GÜVENİLİRLİK DEĞİLDİR — ölçüldü 19.08.2026.
 * 40 kalem eşiği rahat geçti, ama türetilmiş günlük oran ORTALAMA mı
 * ORTANCA mı seçildiğine göre İKİYE KATLANIYORDU (%0,47 ↔ %1,05). Bir
 * rakamın kendi seçim keyfiyetine bu kadar duyarlı olması, "kaç satış
 * var" sorusundan bağımsız bir kabalıktır.
 *
 * Bu yüzden hüküm ÜÇ EKSENLİ: örneklem · duyarlılık · aykırı değer.
 */
const SAPMA_TAVANI = 1.5;

/**
 * Bir kalemin verimi mağaza ortalamasının bu katını aşıyorsa MALİYET
 * ŞÜPHELİDİR. Gerçek bir arbitraj kaleminin sermaye verimi mağaza
 * ortalamasının on katı olmaz; olduysa maliyet yanlış girilmiştir.
 */
const AYKIRI_KAT = 10;

const GUN_MS = 24 * 60 * 60 * 1000;

function para(d: number | null): string {
  if (d === null) return "—";
  return d.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function yuzde(d: number | null): string {
  return d === null ? "—" : "%" + (d * 100).toFixed(1);
}

function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
}

function saga(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : " ".repeat(n - m.length) + m;
}

function ortanca(sayilar: number[]): number | null {
  if (sayilar.length === 0) return null;
  const s = [...sayilar].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[o]! : (s[o - 1]! + s[o]!) / 2;
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

  /** "Bugün" İŞ saat diliminden — anayasa kuralı, ortamdan okunmaz. */
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  console.log("");
  console.log("BEKLEME MALİYETİ — AŞAMA A · ÖLÇÜM RAPORU");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        RAPOR — hiçbir şey yazılmaz");
  console.log("  bugün      " + bugun.toISOString().slice(0, 10) + " (Europe/Istanbul)");
  console.log("");

  /**
   * ⚠ İPTAL EDİLEN SATIŞ HİÇ DOĞMAMIŞ SAYILIR — anayasa kuralı.
   * Onu örnekleme katmak, olmayan bir kârın verimini ölçmek olurdu.
   */
  const kalemler = await prisma.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: {
      net2Amount: true,
      sale: {
        select: {
          code: true,
          channelAccount: {
            select: { channel: { select: { name: true } } },
          },
        },
      },
      variant: { select: { product: { select: { name: true } } } },
      stockMovements: {
        select: {
          quantityDelta: true,
          unitCostAmount: true,
          unitCostCurrency: true,
          occurredAt: true,
          sourceMovement: { select: { occurredAt: true } },
        },
      },
    },
  });

  console.log("Taranan satış kalemi (iptalsiz): " + kalemler.length);
  console.log("");

  // ══════════════════════════════════════════════════════════════════
  //  1) GERÇEKLEŞMİŞ SERMAYE VERİMİ — NET-2 ÷ MALİYET
  // ══════════════════════════════════════════════════════════════════
  type Olcum = {
    ad: string;
    kod: string;
    kanal: string;
    net2: number;
    maliyet: number;
    /** Bu kalemin FIFO dönüş günleri (parti girişi → satış). */
    gunler: number[];
  };

  const olcumler: Olcum[] = [];
  let net2Yok = 0;
  let maliyetYok = 0;
  /**
   * ⚠ SESSİZ SÜZGEÇ OLMAZ. Satış hareketi, bağlı olduğu partiden ÖNCE
   * görünüyorsa gün farkı negatif çıkar. Bunları sessizce atmak "veri
   * temiz" izlenimi verirdi; sayılıyor ve raporda ADIYLA yazılıyor.
   */
  const tersGun: { ad: string; kod: string; gun: number }[] = [];

  for (const k of kalemler) {
    if (k.net2Amount === null) {
      net2Yok++;
      continue;
    }

    /**
     * ⚠ MALİYET `kalemMaliyeti` İLE — TİP LİSTESİYLE DEĞİL, BAĞLA.
     * 17.08.2026 dersi: SALE_OUT'ları süzüp mutlak değer almak, adet
     * düzeltmesinin ayna hareketini dışarıda bırakıyor ve maliyeti
     * şişiriyordu. Bu kaleme BAĞLI her hareket işaretiyle girer.
     */
    const m = kalemMaliyeti(
      k.stockMovements.map((h) => ({
        quantityDelta: h.quantityDelta,
        /** ⚠ Decimal METİN olarak geçer — `Number()` kuruş kaybettirir. */
        birimMaliyet: h.unitCostAmount === null ? null : String(h.unitCostAmount),
        birimMaliyetParaBirimi: h.unitCostCurrency,
      })),
    );
    if (m.maliyet === null || m.maliyet <= 0) {
      maliyetYok++;
      continue;
    }

    /**
     * DÖNÜŞ GÜNÜ: partinin GİRİŞ tarihinden satış hareketine kadar.
     * `sourceMovement` FIFO partisidir; bağ yoksa gün ölçülemez ve
     * SIFIR SAYILMAZ — ölçülemeyeni sıfır saymak ortalamayı aşağı
     * çeker ve bekleme maliyetini olduğundan büyük gösterirdi.
     */
    const gunler: number[] = [];
    for (const h of k.stockMovements) {
      if (h.quantityDelta >= 0) continue;
      const giris = h.sourceMovement?.occurredAt;
      if (!giris) continue;
      const fark = Math.floor((h.occurredAt.getTime() - giris.getTime()) / GUN_MS);
      if (fark >= 0) gunler.push(fark);
      else
        tersGun.push({
          ad: k.variant.product.name,
          kod: k.sale.code ?? "—",
          gun: fark,
        });
    }

    olcumler.push({
      ad: k.variant.product.name,
      kod: k.sale.code ?? "—",
      kanal: k.sale.channelAccount.channel.name,
      net2: Number(k.net2Amount),
      maliyet: m.maliyet,
      gunler,
    });
  }

  console.log("1) GERÇEKLEŞMİŞ SERMAYE VERİMİ (NET-2 ÷ maliyet)");
  console.log("   ölçülebilen kalem   " + olcumler.length);
  console.log("   NET-2 yok           " + net2Yok);
  console.log("   maliyet yok/sıfır   " + maliyetYok);
  console.log("");

  if (olcumler.length === 0) {
    console.log("   Ölçülebilen kalem yok — hüküm verilemez.");
    return;
  }

  const toplamNet2 = olcumler.reduce((t, o) => t + o.net2, 0);
  const toplamMaliyet = olcumler.reduce((t, o) => t + o.maliyet, 0);

  /**
   * ⚠ İKİ ORTALAMA AYRI AYRI VERİLİYOR — biri ötekinin yerine geçmez.
   *
   * AĞIRLIKLI (Σnet2 ÷ Σmaliyet) mağazanın gerçek verimidir: büyük
   * sermaye bağlayan kalem daha çok söz sahibi olur. Bekleme maliyeti
   * SERMAYE üstünden hesaplandığı için aranan budur.
   *
   * BASİT ortalama her kalemi eşit sayar. İkisi ayrışıyorsa küçük
   * kalemler büyüklerden farklı davranıyor demektir — o da bilgidir,
   * saklanmaz.
   */
  const agirlikli = toplamNet2 / toplamMaliyet;
  const oranlar = olcumler.map((o) => o.net2 / o.maliyet);
  const basit = oranlar.reduce((t, o) => t + o, 0) / oranlar.length;

  console.log("   toplam NET-2        " + saga(para(toplamNet2), 14));
  console.log("   toplam maliyet      " + saga(para(toplamMaliyet), 14));
  console.log("   AĞIRLIKLI verim     " + saga(yuzde(agirlikli), 14) + "  ← esas alınan");
  console.log("   basit ortalama      " + saga(yuzde(basit), 14));
  console.log("   ortanca             " + saga(yuzde(ortanca(oranlar)), 14));
  console.log("");

  /** KANAL KIRILIMI — mimar maddesi. */
  const kanallar = new Map<string, { net2: number; maliyet: number; adet: number }>();
  for (const o of olcumler) {
    const k = kanallar.get(o.kanal) ?? { net2: 0, maliyet: 0, adet: 0 };
    k.net2 += o.net2;
    k.maliyet += o.maliyet;
    k.adet++;
    kanallar.set(o.kanal, k);
  }
  console.log("   KANAL KIRILIMI");
  console.log("   " + doldur("kanal", 16) + saga("örneklem", 10) + saga("verim", 10));
  for (const [ad, k] of [...kanallar].sort((a, b) => b[1].adet - a[1].adet)) {
    console.log(
      "   " + doldur(ad, 16) + saga(String(k.adet), 10) + saga(yuzde(k.net2 / k.maliyet), 10),
    );
  }
  console.log("");

  // ══════════════════════════════════════════════════════════════════
  //  2) ORTALAMA DÖNÜŞ GÜNÜ
  // ══════════════════════════════════════════════════════════════════
  const tumGunler = olcumler.flatMap((o) => o.gunler);
  const gunOrt =
    tumGunler.length === 0
      ? null
      : tumGunler.reduce((t, g) => t + g, 0) / tumGunler.length;
  const gunOrtanca = ortanca(tumGunler);
  const bagsiz = olcumler.filter((o) => o.gunler.length === 0).length;

  console.log("2) ORTALAMA DÖNÜŞ GÜNÜ (parti girişi → satış)");
  console.log("   ölçülebilen düşüm   " + tumGunler.length);
  console.log("   FIFO bağı yok       " + bagsiz + " kalem");
  console.log("   ortalama            " + saga(gunOrt === null ? "—" : gunOrt.toFixed(1), 10) + " gün");
  console.log("   ortanca             " + saga(gunOrtanca === null ? "—" : gunOrtanca.toFixed(1), 10) + " gün");
  if (tumGunler.length > 0) {
    console.log("   en hızlı / en yavaş " + Math.min(...tumGunler) + " / " + Math.max(...tumGunler) + " gün");
  }
  if (tersGun.length > 0) {
    console.log("");
    console.log("   ⚠ TERS TARİHLİ " + tersGun.length + " düşüm — satış, partisinden ÖNCE görünüyor:");
    for (const t of tersGun) {
      console.log("      " + doldur(t.ad, 40) + " " + doldur(t.kod, 14) + " " + t.gun + " gün");
    }
    console.log("      Ortalamaya KATILMADI. Veri kusuru — düzeltilmeli.");
  }
  console.log("");

  // ══════════════════════════════════════════════════════════════════
  //  4) GÜVENİLİRLİK HÜKMÜ — TÜRETİLMİŞ RAKAMDAN ÖNCE BASILIR
  // ══════════════════════════════════════════════════════════════════
  /**
   * ⚠ HÜKÜM 3. BÖLÜMDEN ÖNCE YAZILIYOR. Mimar sırası 1-2-3-4 ama OKUMA
   * sırası bu değil: türetilmiş tabloyu önce gösterip altına "bu arada
   * veri kaba" yazmak, gözün tabloya takılmasına ve hükmün atlanmasına
   * yol açardı. Tablo ancak hüküm geçerse basılıyor.
   */
  const ornek = olcumler.length;
  const ortancaVerim = ortanca(oranlar);

  /**
   * ⚠ DUYARLILIK — "hangi ortalamayı seçersem" sorusu.
   * Aynı veriden üç meşru günlük oran çıkıyor. Aralarındaki fark küçükse
   * seçim önemsizdir ve rakam sağlamdır; büyükse rakamın kendisi değil
   * SEÇİM konuşuyordur ve ekrana basılamaz.
   */
  const adaylar =
    gunOrt !== null && gunOrt > 0 && gunOrtanca !== null && gunOrtanca > 0
      ? [
          { ad: "ağırlıklı verim ÷ ORTALAMA gün", deger: agirlikli / gunOrt },
          { ad: "ağırlıklı verim ÷ ORTANCA gün", deger: agirlikli / gunOrtanca },
          {
            ad: "ortanca verim   ÷ ORTANCA gün",
            deger: (ortancaVerim ?? agirlikli) / gunOrtanca,
          },
        ]
      : [];
  const degerler = adaylar.map((a) => a.deger).filter((d) => d > 0);
  const sapma =
    degerler.length === 0 ? null : Math.max(...degerler) / Math.min(...degerler);

  /** Maliyeti şüpheli kalemler — mağaza ortalamasının AYKIRI_KAT katı üstü. */
  const aykirilar = olcumler.filter((o) => o.net2 / o.maliyet > agirlikli * AYKIRI_KAT);

  console.log("   DUYARLILIK — aynı veriden çıkan günlük oranlar");
  for (const a of adaylar) {
    console.log("   " + doldur(a.ad, 34) + saga(yuzde(a.deger), 10));
  }
  if (sapma !== null) {
    console.log("   " + doldur("en yüksek ÷ en düşük", 34) + saga(sapma.toFixed(2) + "×", 10) +
      "  (tavan " + SAPMA_TAVANI.toFixed(2) + "×)");
  }
  console.log("");

  if (aykirilar.length > 0) {
    console.log("   ⚠ MALİYETİ ŞÜPHELİ KALEM(LER) — verim mağaza ortalamasının " + AYKIRI_KAT + "× üstü:");
    for (const a of aykirilar) {
      console.log("      " + doldur(a.ad, 34) + " " + doldur(a.kod, 14) +
        " net2 " + saga(para(a.net2), 10) + " ÷ maliyet " + saga(para(a.maliyet), 10) +
        " = " + yuzde(a.net2 / a.maliyet));
    }
    console.log("");
  }

  /**
   * ⚠ HÜKÜM ÜÇ EKSENLİ. Mimar kapısı "örneklem < 20" idi; ölçüm o kapının
   * TEK BAŞINA yetmediğini gösterdi — 40 kalemle eşik geçildi ama rakam
   * seçime iki kat duyarlı çıktı ve bir kalemin maliyeti imkânsızdı.
   * Eşiği geçmiş olmak, sağlam olmak değildir.
   */
  const ornekTamam = ornek >= ASGARI_ORNEKLEM;
  const gunTamam = gunOrt !== null && gunOrt > 0;
  const sapmaTamam = sapma !== null && sapma <= SAPMA_TAVANI;
  const aykiriTamam = aykirilar.length === 0;
  const saglam = ornekTamam && gunTamam && sapmaTamam && aykiriTamam;

  console.log("=".repeat(70));
  console.log("GÜVENİLİRLİK HÜKMÜ");
  console.log("   " + (ornekTamam ? "✓" : "✗") + " örneklem     " + ornek + " kalem (eşik " + ASGARI_ORNEKLEM + ")");
  console.log("   " + (gunTamam ? "✓" : "✗") + " dönüş günü   " + (gunOrt === null ? "ölçülemedi" : gunOrt.toFixed(1) + " gün"));
  console.log("   " + (sapmaTamam ? "✓" : "✗") + " duyarlılık   " + (sapma === null ? "—" : sapma.toFixed(2) + "× (tavan " + SAPMA_TAVANI.toFixed(2) + "×)"));
  console.log("   " + (aykiriTamam ? "✓" : "✗") + " aykırı değer " + aykirilar.length + " kalem");
  if (!saglam) {
    console.log("");
    console.log("   ⛔ VERİ KABA — ÖZELLİK BEKLETİLİR.");
    if (!ornekTamam) {
      console.log("      Örneklem " + ornek + " < " + ASGARI_ORNEKLEM + ". Bu kadar satıştan çıkan");
      console.log("      ortalama ekranda 60 satıştan çıkmış gibi görünür.");
    }
    if (!gunTamam) {
      console.log("      Dönüş günü ölçülemedi — FIFO bağı kurulamayan satışlar.");
    }
    if (!sapmaTamam && sapma !== null) {
      console.log("      Günlük oran ORTALAMA/ORTANCA seçimine " + sapma.toFixed(2) + "× duyarlı.");
      console.log("      Ekrana basılan rakam veriyi değil, SEÇİMİ söylerdi.");
    }
    if (!aykiriTamam) {
      console.log("      " + aykirilar.length + " kalemin maliyeti imkânsız görünüyor; ortalamayı");
      console.log("      yukarı çekiyor. Önce o kayıt düzeltilmeli.");
    }
    console.log("");
    console.log("   AŞAMA B AÇILMAZ. Kaba ortalamayla motor kurulmaz.");
    console.log("=".repeat(70));
    console.log("");
    return;
  }
  console.log("");
  console.log("   ✓ Dört eksen de temiz — türetilmiş rakam gösterilebilir.");
  console.log("=".repeat(70));
  console.log("");

  // ══════════════════════════════════════════════════════════════════
  //  3) TÜRETİLMİŞ GÜNLÜK ORAN + STOKTAKİ ÜRÜNLER
  // ══════════════════════════════════════════════════════════════════
  const gunlukOran = agirlikli / gunOrt;
  console.log("3) TÜRETİLMİŞ GÜNLÜK ORAN");
  console.log(
    "   " + yuzde(agirlikli) + " verim ÷ " + gunOrt.toFixed(1) + " gün = günde " + yuzde(gunlukOran),
  );
  console.log("   (maliyetin yüzdesi; TAHMİNDİR, nakit gider değildir)");
  console.log("");

  /**
   * ⚠ AÇIK PARTİLER ORTAK YARDIMCIDAN — `acikPartilerToplu(db, null)`.
   * Elle "giren − çıkan" yazmak İKİNCİ BİR FIFO TANIMI doğururdu; o tanım
   * bir gün asıl tanımdan ayrışır ve iki ekran aynı ürün için farklı stok
   * gösterir. Yardımcı zaten envanter değeri ekranını besliyor.
   */
  const partiHaritasi = await acikPartilerToplu(prisma, null);

  const adlar = new Map<string, string>();
  for (const v of await prisma.productVariant.findMany({
    where: { id: { in: [...partiHaritasi.keys()] } },
    select: { id: true, product: { select: { name: true } } },
  })) {
    adlar.set(v.id, v.product.name);
  }

  type Stok = { ad: string; adet: number; maliyet: number; enEski: Date };
  const stoklar: Stok[] = [];
  /** Maliyeti bilinmeyen parti taşıyan varyant — sıfır sayılmaz, SAYILIR. */
  let maliyetsizVaryant = 0;

  for (const [variantId, partiler] of partiHaritasi) {
    if (partiler.length === 0) continue;
    let adet = 0;
    let maliyet = 0;
    let eksik = false;
    let enEski = partiler[0]!.occurredAt;
    for (const p of partiler) {
      adet += p.kalanAdet;
      if (p.birimMaliyet === null) eksik = true;
      else maliyet += Number(p.birimMaliyet) * p.kalanAdet;
      if (p.occurredAt < enEski) enEski = p.occurredAt;
    }
    if (adet <= 0) continue;
    /**
     * ⚠ MALİYETİ EKSİK VARYANT TABLOYA GİRMEZ. Bilinen kısmı yazsaydık
     * bekleme bedeli olduğundan KÜÇÜK görünür ve ürün haksız yere
     * "ucuz bekliyor" sayılırdı. Sayısı ayrıca beyan ediliyor.
     */
    if (eksik) {
      maliyetsizVaryant++;
      continue;
    }
    stoklar.push({ ad: adlar.get(variantId) ?? "—", adet, maliyet, enEski });
  }

  const sirali = stoklar
    .map((s) => ({
      ad: s.ad,
      adet: s.adet,
      maliyet: s.maliyet,
      yasGun: Math.floor((bugun.getTime() - s.enEski.getTime()) / GUN_MS),
      gunluk: s.maliyet * gunlukOran,
    }))
    .sort((a, b) => b.gunluk * b.yasGun - a.gunluk * a.yasGun);

  console.log("   STOKTAKİ ÜRÜNLER — ilk " + TABLO_SATIRI + " (birikmiş bekleme bedeline göre)");
  console.log("   toplam stoklu varyant: " + sirali.length +
    (maliyetsizVaryant > 0 ? "  (maliyeti eksik " + maliyetsizVaryant + " varyant tabloya girmedi)" : ""));
  console.log("");
  console.log(
    "   " + doldur("ürün", 32) + saga("adet", 6) + saga("bağlı", 12) +
    saga("yaş", 6) + saga("günlük", 9) + saga("birikmiş", 12),
  );
  for (const s of sirali.slice(0, TABLO_SATIRI)) {
    console.log(
      "   " + doldur(s.ad, 32) + saga(String(s.adet), 6) + saga(para(s.maliyet), 12) +
      saga(String(s.yasGun), 6) + saga(para(s.gunluk), 9) + saga(para(s.gunluk * s.yasGun), 12),
    );
  }
  console.log("");
  console.log("   ⚠ Bu sütunlar TAHMİNDİR — mağaza ortalamasından türetildi.");
  console.log("     Muhasebeye, panele, NET'e, hakedişe GİRMEZ.");
  console.log("");
}

main();
