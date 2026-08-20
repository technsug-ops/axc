/**
 * ============================================================================
 *  KESİNTİ KAPSAMI TAŞIMA — PER_SALE → PER_PACKAGE
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:kesinti-kapsami             → ÖNİZLEME (yazmaz)
 *      npm run canli:kesinti-kapsami -- --uygula → taşır
 *      npm run canli:kesinti-kapsami -- --geri   → geri alır
 *
 *  ⚠ ÖLÇÜLDÜ 20.08.2026, TY panelinden:
 *      11438745987 (1 paket) → platform hizmet 13,19
 *      11361665302 (2 paket) → platform hizmet 26,38 = 2 × 13,19
 *
 *  Şema hazır (`FeeScope.PER_PACKAGE`, migration canlıda koştu) ama KURALIN
 *  KENDİSİ hâlâ `PER_SALE`. Bu betik o veri işini yapar.
 *
 *  ── ONAYLI VAKA LİSTESİ — GENEL ARAÇ DEĞİL ──────────────────────────────
 *  Yalnız aşağıda ADIYLA yazılı kural taşınabilir. HB'nin `HIZMET_BEDELI`
 *  (₺12,60) paket başına mı sipariş başına mı ÖLÇÜLMEDİ ve varsayım
 *  yapılmadı — listeye girmiyor (BEKLEYENLER → H8).
 *
 *  ── ÜÇ ŞART (mimar, 20.08.2026) ─────────────────────────────────────────
 *  1. ÖNİZLEME ÖNCE — hangi kural, hangi alan, kaç satış etkileniyor.
 *  2. GERİ ALINABİLİR — `--geri` ile eski kapsama döner; her iki yön de
 *     `AuditLog`a yazılır.
 *  3. SONRASINDA ÖLÇÜM — `paketSayisi = 1` satışlarda NET-2 **kuruşuna**
 *     aynı kalmalı. Çarpan 1 olduğu için hiçbir rakam oynamamalı; oynayan
 *     tek kuruş varsa taşıma hatalıdır.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** ⚠ ONAYLI TAŞIMA — mimar onayıyla girer, ölçümsüz satır eklenmez. */
const TASINACAK = [
  {
    kanal: "Trendyol",
    kod: "SABIT_GIDER",
    eski: "PER_SALE" as const,
    yeni: "PER_PACKAGE" as const,
    gerekce:
      "TY paneli 20.08.2026: 11361665302 (2 paket) platform hizmet −26,38 = 2 × 13,19",
  },
];

const UYGULA = process.argv.includes("--uygula");
const GERI = process.argv.includes("--geri");

const EYLEM = "KESINTI_KAPSAMI_DEGISTI";

function p(n: unknown): string {
  if (n === null || n === undefined) return "—";
  return Number(n.toString()).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function main() {
  if (UYGULA && GERI) {
    console.log("\n  ⛔ --uygula ve --geri BİRLİKTE verilemez.\n");
    process.exitCode = 1;
    return;
  }

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("");
  console.log("KESİNTİ KAPSAMI — PER_SALE → PER_PACKAGE");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log(
    "  kip        " +
      (GERI ? "GERİ AL" : UYGULA ? "UYGULA" : "ÖNİZLEME — hiçbir şey yazılmaz"),
  );
  console.log("");

  // ── 1) ÖNİZLEME: hangi kural, hangi alan ─────────────────────────────
  const hedefler: {
    id: string;
    kanal: string;
    kod: string;
    mevcut: string;
    olacak: string;
    tutar: string;
  }[] = [];

  for (const t of TASINACAK) {
    const kurallar = await prisma.channelFee.findMany({
      where: { code: t.kod, isActive: true, channel: { name: t.kanal } },
      select: {
        id: true,
        code: true,
        scope: true,
        basis: true,
        amount: true,
        validFrom: true,
        channel: { select: { name: true } },
      },
    });
    if (kurallar.length === 0) {
      console.log("  ⚠ KURAL BULUNAMADI: " + t.kanal + " / " + t.kod);
      continue;
    }
    for (const k of kurallar) {
      const beklenen = GERI ? t.yeni : t.eski;
      const olacak = GERI ? t.eski : t.yeni;
      if (k.scope !== beklenen) {
        console.log(
          "  ○ ATLANDI " +
            k.channel.name +
            "/" +
            k.code +
            " — kapsamı zaten " +
            k.scope,
        );
        continue;
      }
      hedefler.push({
        id: k.id,
        kanal: k.channel.name,
        kod: k.code,
        mevcut: k.scope,
        olacak,
        tutar: p(k.amount),
      });
    }
  }

  console.log("  DEĞİŞECEK KURAL: " + hedefler.length);
  for (const h of hedefler) {
    console.log(
      "    " +
        h.kanal.padEnd(13) +
        h.kod.padEnd(16) +
        "scope: " +
        h.mevcut +
        " → " +
        h.olacak +
        "   tutar " +
        h.tutar,
    );
  }
  console.log("");
  console.log("  ⚠ DEĞİŞEN TEK ALAN `scope`. Tutar, oran, geçerlilik tarihi,");
  console.log("    aktiflik — hiçbirine dokunulmuyor.");
  console.log("");

  // ── ETKİ: kaç satışın NET'i gerçekten oynar ──────────────────────────
  const toplamSatis = await prisma.sale.count({ where: { iptalTarihi: null } });
  const cokPaket = await prisma.sale.count({
    where: { iptalTarihi: null, paketSayisi: { gt: 1 } },
  });
  console.log("  ETKİ ÖLÇÜSÜ");
  console.log("    iptalsiz satış           " + toplamSatis);
  console.log("    paketSayisi > 1          " + cokPaket);
  console.log("");
  if (cokPaket === 0) {
    console.log("    ✓ Bugün ÇARPAN 1 — hiçbir mevcut NET rakamı değişmemeli.");
    console.log("      Taşımanın etkisi YALNIZ bundan sonraki bölünmüş");
    console.log("      siparişlerde görünür.");
  } else {
    console.log("    ⚠ " + cokPaket + " satışta çarpan 1'den büyük — bu");
    console.log("      satışların NET'i taşımadan SONRA yeniden hesaplanmalı.");
  }
  console.log("");

  if (hedefler.length === 0) {
    console.log("  Yapılacak bir şey yok.");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  if (!UYGULA && !GERI) {
    console.log("  ÖNİZLEME — hiçbir şey yazılmadı.");
    console.log("  Doğruysa:  npm run canli:kesinti-kapsami -- --uygula");
    console.log("  Geri al :  npm run canli:kesinti-kapsami -- --geri");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  // ── 2) UYGULA / GERİ AL ──────────────────────────────────────────────
  for (const h of hedefler) {
    await prisma.channelFee.update({
      where: { id: h.id },
      data: { scope: h.olacak as "PER_SALE" | "PER_ITEM" | "PER_PACKAGE" },
    });
    /**
     * ⚠ İZ HER İKİ YÖNDE. Geri alma da bir karardır ve kayda geçer;
     * "bir ileri bir geri" geçmişi, kuralın kararsız olduğunu söyler ve
     * o da bilgidir.
     */
    await prisma.auditLog.create({
      data: {
        action: EYLEM,
        targetType: "ChannelFee",
        targetId: h.id,
        detail: JSON.stringify({
          kanal: h.kanal,
          kod: h.kod,
          eski: h.mevcut,
          yeni: h.olacak,
          yon: GERI ? "GERI" : "ILERI",
          gerekce: TASINACAK.find((t) => t.kod === h.kod)?.gerekce ?? null,
          kaynak: "canli:kesinti-kapsami",
        }),
      },
    });
    console.log("  ✓ " + h.kanal + "/" + h.kod + "  " + h.mevcut + " → " + h.olacak);
  }
  console.log("  ✓ AuditLog: " + EYLEM + " (eski→yeni birlikte)");
  console.log("");
  console.log("  SIRADAKİ ADIM — DOĞRULAMA:");
  console.log("      npm run canli:kapsam-dogrula");
  console.log("    paketSayisi=1 satışlarda NET-2 KURUŞUNA aynı kalmalı.");
  console.log("");

  await prisma.$disconnect();
}

main();
