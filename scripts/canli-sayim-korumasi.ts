import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  SAYIM KORUMASI — "AKTARIM STOĞU BİR DAHA BOZAMASIN" (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:sayim-korumasi
 *
 *  ⭐ HALİL'İN KURALI: **FİZİKSEL SAYIM SON SÖZDÜR.** Kayıttan türetilen
 *  hiçbir değer, sayılmış bir stoğu SESSİZCE ezemez.
 *
 *  ⛔ 29.08.2026: 7 saatlik sayımın üstüne Excel aktarımı yazdı ve stok
 *  bozuldu. Bu bir hata değil, TASARIM KUSURU: sıra tanımlı değildi.
 *
 *  ÖLÇÜLECEKLER:
 *   ① Stok yazan bütün yollar — hangi koşulda hareket üretiyor?
 *   ② Hangisi GERİYE DÖNÜK yazabiliyor (fiziksel gerçeği ezebilir)?
 *   ③ Meşru geriye dönük vaka VAR MI — ölç, varsayma.
 *   ④ Koruma önerisi + bekçi.
 *
 *  ⛔ HÜKÜM YOK, KOD YAZILMADI.
 * ============================================================================
 */

/** ⚠ Liste değil, TARAMA: `stockMovement.create` geçen her dosya. */
const YOLLAR: { dosya: string; ad: string; tarih: string }[] = [
  { dosya: "src/app/alimlar/[id]/mal-kabul/actions.ts", ad: "MAL KABUL (alım)", tarih: "kullanıcının girdiği teslim tarihi" },
  { dosya: "src/lib/satis.ts", ad: "SATIŞ KAYDI", tarih: "girdi.soldAt (geri tarihli olabilir)" },
  { dosya: "src/lib/ice-aktarma/yaz.ts", ad: "İÇE AKTARMA (Excel/API)", tarih: "dosyadaki satış tarihi" },
  { dosya: "src/app/stok/duzeltme-actions.ts", ad: "EKRAN DÜZELTMESİ", tarih: "form tarihi" },
  { dosya: "src/app/okut/sayim-yazim-actions.ts", ad: "SAYIM", tarih: "sayım günü" },
  { dosya: "src/lib/iade.ts", ad: "İADE / DEĞİŞİM", tarih: "iade anı" },
  { dosya: "src/app/iadeler/bildirim-actions.ts", ad: "İADE BİLDİRİMİ", tarih: "bildirim/değişim anı" },
  { dosya: "src/lib/satis-iptali-veri.ts", ad: "SATIŞ İPTALİ", tarih: "iptal anı" },
  { dosya: "src/lib/iptal-geri-alma-veri.ts", ad: "İPTAL GERİ ALMA", tarih: "geri alma anı" },
  { dosya: "src/lib/satis-duzenleme-veri.ts", ad: "ADET DÜZENLEME", tarih: "satışın tarihi" },
];

const SAYIM_TIPI = "COUNT_CORRECTION";

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(104));
  console.log("SAYIM KORUMASI — KÖK ÖLÇÜMÜ (salt okuma, kod yazılmadı)");
  console.log("=".repeat(104));

  // ── ① YOLLAR ──────────────────────────────────────────────────────────
  console.log("\n① STOK YAZAN YOLLAR — `stockMovement.create` geçen dosyalar");
  console.log("   " + "yol".padEnd(26) + "occurredAt kaynağı".padEnd(38) + "geriye dönük?");
  for (const y of YOLLAR) {
    let kod = "";
    try { kod = readFileSync(y.dosya, "utf8"); } catch { kod = ""; }
    if (kod === "") { console.log("   " + y.ad.padEnd(26) + "⛔ DOSYA OKUNAMADI"); continue; }
    /** ⚠ `occurredAt: new Date()` ise şimdi; başka bir değişkense geriye dönebilir. */
    const simdi = /occurredAt:\s*new Date\(\)/.test(kod);
    const degisken = /occurredAt:\s*(?!new Date\(\))[a-zA-Z_$][\w$.]*/.test(kod);
    console.log("   " + y.ad.padEnd(26) + y.tarih.padEnd(38) +
      (degisken ? "⛔ EVET" : simdi ? "hayır (şimdi)" : "?"));
  }

  // ── ② SAYILMIŞ VARYANTLAR ─────────────────────────────────────────────
  const sayimlar = await p.stockMovement.findMany({
    where: { type: SAYIM_TIPI },
    select: { variantId: true, occurredAt: true },
  });
  const sonSayim = new Map<string, Date>();
  for (const x of sayimlar) {
    const v = sonSayim.get(x.variantId);
    if (!v || x.occurredAt > v) sonSayim.set(x.variantId, x.occurredAt);
  }
  console.log("\n② SAYILMIŞ VARYANTLAR");
  console.log("   `COUNT_CORRECTION` hareketi olan varyant: " + sonSayim.size);
  console.log("   toplam sayım hareketi                   : " + sayimlar.length);

  // ── ③ ⭐ MEŞRU GERİYE DÖNÜK VAKA VAR MI — ÖLÇÜLDÜ ─────────────────────
  /**
   * Soru: bir varyantta sayımdan SONRA yazılmış ama iş tarihi sayımdan
   * ÖNCE olan hareket var mı? Varsa, "yasaklayalım" demek meşru bir işi
   * de kapatır. Ölçülmeden karar verilmez.
   */
  console.log("\n③ ⭐ MEŞRU GERİYE DÖNÜK VAKA — ÖLÇÜM");
  const vids = [...sonSayim.keys()];
  let geriyeDonuk = 0, ileriye = 0;
  const ornek: string[] = [];
  const tipDagilim = new Map<string, number>();
  for (let k = 0; k < vids.length; k += 200) {
    const dilim = vids.slice(k, k + 200);
    const hh = await p.stockMovement.findMany({
      where: { variantId: { in: dilim }, type: { not: SAYIM_TIPI } },
      select: {
        variantId: true, type: true, occurredAt: true, createdAt: true,
        quantityDelta: true, note: true,
        variant: { select: { sku: true } },
      },
    });
    for (const h of hh) {
      const sayimAni = sonSayim.get(h.variantId)!;
      /** YAZILDIĞI an sayımdan SONRA mı? */
      if (h.createdAt <= sayimAni) continue;
      if (h.occurredAt < sayimAni) {
        geriyeDonuk++;
        tipDagilim.set(h.type, (tipDagilim.get(h.type) ?? 0) + 1);
        if (ornek.length < 8) {
          ornek.push((h.variant.sku ?? "—").padEnd(16) + h.type.padEnd(16) +
            "iş " + h.occurredAt.toISOString().slice(0, 10) +
            " · yazıldı " + h.createdAt.toISOString().slice(0, 10) +
            " · " + h.quantityDelta);
        }
      } else ileriye++;
    }
  }
  console.log("   sayımdan SONRA yazılan hareket:");
  console.log("     iş tarihi sayımdan SONRA (normal) : " + ileriye);
  console.log("     ⛔ iş tarihi sayımdan ÖNCE         : " + geriyeDonuk);
  if (geriyeDonuk > 0) {
    console.log("     tip dağılımı: " +
      [...tipDagilim].map(([a, b]) => a + "=" + b).join(" · "));
    for (const o of ornek) console.log("       " + o);
  }
  console.log("\n   ⚠ OKUMA: bu sayı SIFIRSA, geriye dönük yazımı yasaklamak");
  console.log("     bugün hiçbir meşru işi kapatmaz. SIFIRDAN BÜYÜKSE, her tip");
  console.log("     ayrı değerlendirilir — hepsini yasaklamak çalışan bir akışı");
  console.log("     kilitlerdi (29.08 `sinir` dersinin aynısı).");

  // ── ④ HANGİ YOL EZEBİLİR ──────────────────────────────────────────────
  console.log("\n④ HANGİ YOL FİZİKSEL GERÇEĞİ EZEBİLİR");
  console.log("   ⭐ Ölçüt: yol geriye dönük `occurredAt` yazabiliyor MU ve");
  console.log("     yazdığı hareket STOK MİKTARINI değiştiriyor MU?");
  console.log("");
  console.log("   ⛔ EZEBİLİR (geriye dönük + miktar değiştirir):");
  console.log("     · İÇE AKTARMA — dosyadaki satış tarihiyle yazıyor; 29.08");
  console.log("       arızasının kaynağı tam bu. Sayımdan sonra koşan bir");
  console.log("       aktarım, sayımdan ÖNCEKİ bir satışı yazıp stoğu düşürür.");
  console.log("     · SATIŞ KAYDI — `soldAt` geri tarihli girilebilir.");
  console.log("     · EKRAN DÜZELTMESİ / SAYIM — form tarihi geri alınabilir.");
  console.log("");
  console.log("   ✅ EZEMEZ (tarihi olayın kendi anı):");
  console.log("     · İADE / DEĞİŞİM · İPTAL · İPTAL GERİ ALMA");
  console.log("");
  console.log("   ⚠ MAL KABUL: teslim tarihi geri alınabilir ama stoğu");
  console.log("     ARTIRIR — sayılmış bir rafı DÜŞÜRMEZ. Yine de sayımdan");
  console.log("     önceki bir alımı sonradan girmek, sayımın \"fazla\" dediği");
  console.log("     rakamı haklı çıkarabilir; bu bir çelişki DEĞİL, bilgi.");

  console.log("\n⑤ KORUMA ÖNERİSİ — ⛔ KOD YAZILMADI");
  console.log("   ⭐ ÖLÇÜTE GÖRE İKİ KADEME:");
  console.log("");
  console.log("   (a) SESSİZ EZME YASAK — sayım damgası olan bir varyanta,");
  console.log("       sayım tarihinden ÖNCEYE hareket yazılmak isteniyorsa");
  console.log("       işlem DURUR ve NE OLDUĞU söylenir (İlke #5).");
  console.log("       ⚠ Yasak DEĞİL, DURAKSAMA: kullanıcı ısrar ederse");
  console.log("         istisna İZ BIRAKARAK geçer (anayasadaki \"uyarı sorar,");
  console.log("         kullanıcı ısrar ederse istisna kaydedilir\" kuralı).");
  console.log("");
  console.log("   (b) SAYIM SONRASI DENGE — geriye dönük hareket geçtiyse,");
  console.log("       o varyant \"sayım geçersizleşti\" diye İŞARETLENİR ve");
  console.log("       yeniden sayılması istenir. Sessizce ezilmez.");
  console.log("");
  console.log("   ⛔ \"HİÇ YAZILAMASIN\" ÖNERİLMİYOR: ③'teki ölçüm meşru vaka");
  console.log("     gösterirse tam yasak çalışan bir işi kilitler — 29.08'de");
  console.log("     `sinir` kararında aynı tuzağa düşülüyordu (`soldAt` sınırı");
  console.log("     defterin %48,72'sini kilitleyecekti).");

  console.log("\n⑥ BEKÇİ ÖNERİSİ — DESEN YASAĞI, LİSTE DEĞİL");
  console.log("   > `stockMovement.create` çağıran ve `occurredAt`i SABİT");
  console.log("   > OLMAYAN (geri tarihli olabilen) her yol, yazmadan önce");
  console.log("   > `sayimKorumasi(variantId, occurredAt)` kapısından geçmek");
  console.log("   > ZORUNDA. Geçmeyen çağrı, yanında `SAYIM KORUMASI YOK:");
  console.log("   > <gerekçe>` beyanı taşımıyorsa KIRMIZI.");
  console.log("   ⚠ Ve iki yönde mutasyonla sınanır: kapıyı kaldıran KIRMIZI,");
  console.log("     beyanlı istisna YEŞİL.");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. KOD DEĞİŞMEDİ.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
