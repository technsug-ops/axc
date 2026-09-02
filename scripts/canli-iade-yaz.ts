/**
 * ============================================================================
 *  K136a — 8 İADEYİ YAZ · ⚠ YAZAR (varsayılan RAPOR kipi)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *    npm run canli:iade-yaz            → RAPOR (hiçbir şey yazmaz)
 *    npm run canli:iade-yaz -- --uygula → YAZAR
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K136a'nın yazımı, 8 siparişin kimliğine
 *  KİLİTLİ. Genel araç DEĞİLDİR; kimlik listesi koda gömülüdür.
 *
 *  ── YETKİ ───────────────────────────────────────────────────────────────
 *  Halil 02.09.2026: _"YAZIM ONAYI VERİLDİ — kuru koşum temizse."_
 *  Kuru koşum (`canli:iade-yazim-plani`) temiz çıktı: 8 sipariş · ekstre
 *  28.110,85 mutabık · tarih kusuru 0 · çapraz kanıt 4/4.
 *
 *  ── ⭐ İKİNCİ MOTOR YAZILMADI ───────────────────────────────────────────
 *  Yazım `src/lib/iade.ts` → `iadeKaydet` ile yapılıyor; yani ekranın
 *  kullandığı gövdenin AYNISI. İkinci bir yazma yolu açılsaydı bugün aynı
 *  sonucu verir, yarın sessizce ayrışırdı.
 *  _(Anayasa: "önizleme = kayıt"; "düzeltme yolu TÜM okuyuculara ulaşmalı".)_
 *
 *  ── ⛔ NİYE TEK DEV İŞLEM DEĞİL ─────────────────────────────────────────
 *  Anayasa iki meşru kalıp tanıyor: **tamamı-ya-hiçbiri** ya da **satır
 *  satır tekrar-koşulabilir**. Burada ikincisi seçildi ve sebebi ÖLÇÜLDÜ:
 *  `iadeKaydet` zaten kendi içinde `$transaction` — yani HER SİPARİŞ
 *  tamamı-ya-hiçbiri. Sekizini bir dış işleme sarmak K91'de yaşanan
 *  zaman aşımı tavanını geri getirirdi (63 satır × 2 sorgu = 5131 ms >
 *  5000 ms varsayılan). Sekiz ayrı işlem: her biri atomik, küme
 *  kaldığı yerden devam eder, ikinci koşum ZARARSIZ.
 *
 *  ── ⭐ TEKRAR KOŞULABİLİRLİK, LİSTEYE DEĞİL ÖLÇÜTE BAĞLI ────────────────
 *  "Neyi yazdım" listesi saklanmıyor. Ölçüt yeniden hesaplanabilir:
 *  _"bu satışın `Return` kaydı VAR MI"_ — varsa atlanır. Aynı ölçüt hem
 *  yazım kapısı hem geri alma kapısıdır.
 *  _(Anayasa: "geri alma yolu, saklanan listeye değil yeniden
 *  hesaplanabilir ölçüte dayanır".)_
 *
 *  ── ⚠ SAYIM KAPISI: ISRARLA GEÇİLİYOR, SESSİZCE DEĞİL ───────────────────
 *  Sekiz iadenin sekizi de 27.08 fiziksel sayımından ÖNCEYE yazılıyor.
 *  `iadeKaydet` bunu kapıya takar ve `sayimIsrari` ister. Israr sebebi
 *  KAPALI LİSTEDEN seçiliyor ve açıklaması yazılıyor — iz kalıyor.
 *
 *  ⛔ SEBEP `DIGER` SEÇİLDİ VE BU BİR BULGUDUR: kapalı listede
 *  `GEC_GIRILEN_ALIM` ve `GEC_GIRILEN_SATIS` var, **`GEC_GIRILEN_IADE`
 *  YOK.** Liste alım/satış için kurulmuş; iade oradan düşüyor. Uygun
 *  olmayan bir etiketi seçmek (ör. `GEC_GIRILEN_ALIM`) kaydı yanlış
 *  sınıflandırırdı. `DIGER` + zorunlu açıklama dürüst olan yol.
 *  ⏭ Eksik enum değeri panoya yazıldı.
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { PLAN, notMetni } from "./k136a-plan";

const UYGULA = process.argv.includes("--uygula");

/** Israr açıklaması — her kayda AYNI metin, sebebi tek ve ortak. */
const ISRAR_ACIKLAMASI =
  "K136a: geç girilen İADE. Mal 27.08.2026 sayımından ÖNCE rafa döndü; " +
  "sayım fazlası bunu doğruluyor (4/4 varyantta fazla = iade adedi). " +
  "Kapalı listede GEC_GIRILEN_IADE değeri yok, o yüzden DIGER.";

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function gun(d: Date | null): string {
  return d === null ? "—" : d.toISOString().slice(0, 10);
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
  const { iadeKaydet, FazlaIadeHatasi } = await import("../src/lib/iade");

  console.log("=".repeat(78));
  console.log(`  K136a — 8 İADE YAZIMI  ·  KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "RAPOR (yazmaz)"}`);
  console.log(`  hedef: ${y.veri.adres.hostname}`);
  console.log("=".repeat(78));

  const kodlar = PLAN.map((p) => p.siparis);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   *  ① ANLIK GÖRÜNTÜ — DOKUNULACAK ALANLARIN YAZIM ÖNCESİ HÂLİ
   * -----------------------------------------------------------------------
   *  ⛔ "İZ SAYISI" KISMİ YAZIM KANITI DEĞİLDİR. Kanıt, verinin kendisinin
   *  karşılaştırılmasıdır — 31.08 vakasında `AuditLog` sayısı 0 çıktı ve
   *  bir `UPDATE` yine de commit olmuştu.
   *  _(Anayasa: "toplu yazım üç şartla koşar" → (a).)_
   * ═══════════════════════════════════════════════════════════════════════
   */
  const gorunuAl = async () => {
    const satislar = await prisma.sale.findMany({
      where: { code: { in: kodlar } },
      select: {
        code: true,
        net1Amount: true,
        net2Amount: true,
        profitStatus: true,
        iptalTarihi: true,
        items: {
          select: { id: true, variantId: true, quantity: true },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { code: "asc" },
    });
    const varyantlar = [
      ...new Set(satislar.flatMap((s) => s.items.map((i) => i.variantId))),
    ];
    const stok = await prisma.stockMovement.groupBy({
      by: ["variantId"],
      where: { variantId: { in: varyantlar } },
      _sum: { quantityDelta: true },
    });
    const iadeSayisi = await prisma.return.count();
    const hareketSayisi = await prisma.stockMovement.count();
    return {
      satislar: satislar.map((s) => ({
        code: s.code,
        net1: s.net1Amount?.toString() ?? null,
        net2: s.net2Amount?.toString() ?? null,
        durum: s.profitStatus,
        iptal: s.iptalTarihi === null ? null : gun(s.iptalTarihi),
      })),
      stok: Object.fromEntries(
        stok.map((x) => [x.variantId, x._sum.quantityDelta ?? 0]),
      ) as Record<string, number>,
      iadeSayisi,
      hareketSayisi,
    };
  };

  const once = await gorunuAl();
  /**
   * ⭐ GÖRÜNTÜ DOSYAYA DA YAZILIR — BELLEKTE KALMASI YETMEZ.
   *
   * ⛔ VE SEBEBİ: `Return` SİLİNEREK GERİ ALINAMAZ. Ölçüldü —
   * `StockMovement.returnItemId` **SetNull**: iade silinirse `RETURN_IN`
   * hareketleri SAHİPSİZ kalır ve stok yüksek kalmaya devam eder; parti
   * tüketilmişse `sourceMovementId` **Restrict** silmeyi zaten engeller.
   * Yani geri alma yolu ters işaretli `ADJUSTMENT`tir ve o da bu
   * görüntüdeki ESKİ değerlere ihtiyaç duyar.
   * _(Anayasa: "silme kararı: ilke ihlali değil, VERİ BOZAN işlem";
   * "toplu yazımda önceki değer satır bazında saklanır".)_
   */
  const gorunuDosyasi = `veri/ozel/k136a-gorunu-${
    new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")
  }.json`;
  writeFileSync(gorunuDosyasi, JSON.stringify(once, null, 2), "utf8");

  console.log("\n① ANLIK GÖRÜNTÜ (yazım ÖNCESİ)");
  console.log(`   dosyaya yazıldı: ${gorunuDosyasi} (gitignore'da)`);
  console.log(`   sistemdeki Return kaydı   : ${once.iadeSayisi}`);
  console.log(`   sistemdeki StockMovement  : ${once.hareketSayisi}`);
  for (const s of once.satislar) {
    console.log(
      `   ${String(s.code).padEnd(13)} NET-1 ${String(s.net1).padStart(12)}` +
        `  NET-2 ${String(s.net2).padStart(12)}  ${s.durum}`,
    );
  }

  /** ② Zaten yazılmış olanları AYIR — ölçüt: satışın Return kaydı var mı. */
  const mevcut = await prisma.return.findMany({
    where: { sale: { code: { in: kodlar } } },
    select: { id: true, sale: { select: { code: true } } },
  });
  const yazilmis = new Set(mevcut.map((r) => r.sale?.code ?? ""));
  console.log("\n② TEKRAR KOŞULABİLİRLİK KAPISI");
  console.log(
    `   zaten iade kaydı OLAN : ${yazilmis.size}` +
      (yazilmis.size > 0 ? `   ${[...yazilmis].join(" · ")}` : ""),
  );
  console.log(`   yazılacak             : ${kodlar.length - yazilmis.size}`);

  if (!UYGULA) {
    console.log("\n" + "-".repeat(78));
    console.log("  ⛔ RAPOR KİPİ — HİÇBİR ŞEY YAZILMADI.");
    console.log("     Yazmak için: npm run canli:iade-yaz -- --uygula");
    console.log("=".repeat(78) + "\n");
    await prisma.$disconnect();
    return;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   *  ③ YAZIM — SİPARİŞ SİPARİŞ, HER BİRİ KENDİ İŞLEMİNDE
   * ═══════════════════════════════════════════════════════════════════════
   */
  console.log("\n③ YAZIM");
  let yazildi = 0;
  let atlandi = 0;
  let hata = 0;

  for (const p of PLAN) {
    if (yazilmis.has(p.siparis)) {
      console.log(`   ${p.siparis.padEnd(13)} — ATLANDI (iade kaydı zaten var)`);
      atlandi += 1;
      continue;
    }
    const satis = await prisma.sale.findFirst({
      where: { code: p.siparis },
      select: {
        id: true,
        net1Amount: true,
        net2Amount: true,
        profitStatus: true,
        items: { select: { id: true, quantity: true, variantId: true } },
      },
    });
    if (satis === null) {
      console.log(`   ${p.siparis.padEnd(13)} ⛔ SATIŞ BULUNAMADI — atlandı`);
      hata += 1;
      continue;
    }

    /** Dönüş kargosu ekstreden — uydurulmuyor, yoksa null. */
    const kargoKalem = await prisma.settlementItem.findFirst({
      where: { orderNo: p.siparis, code: "KARGO_IADE" },
      select: { amount: true },
    });
    const iadeKargosu =
      kargoKalem === null
        ? null
        : Math.abs(Number(kargoKalem.amount.toString()));

    try {
      const iadeId = await iadeKaydet({
        saleId: satis.id,
        code: null,
        returnType: "NORMAL",
        occurredAt: new Date(`${p.tarih}T12:00:00.000Z`),
        note: notMetni(p),
        /** ⚠ Betik yazımı — oturum yok, `userId` null ve bu GÖRÜNÜR. */
        userId: null,
        degisimTeslimTarihi: null,
        iadeKargosu,
        yenidenGonderimKargosu: null,
        ceza: null,
        cezaNotu: null,
        sayimIsrari: {
          onaylandi: true,
          sebep: "DIGER",
          aciklama: ISRAR_ACIKLAMASI,
        },
        kalemler: satis.items.map((it) => ({
          saleItemId: it.id,
          iadeAdedi: it.quantity,
          /** ⭐ Hasar iddiası YOK → mal sağlam döndü, stoğa girer. */
          saglamAdet: it.quantity,
          hasarliAdet: 0,
          hasarNotu: null,
          locationId: null,
          exchangeVariantId: null,
          donenVaryantId: null,
        })),
      });

      /**
       * ⭐ SATIR SATIR İZ — ÖNCEKİ DEĞERLERLE BİRLİKTE.
       * Toplam saklamak yetmez: sonradan doğan bir fark KİME ait
       * sorulamaz hâle gelir.
       * _(Anayasa: "toplu yazımda önceki değer satır bazında saklanır".)_
       */
      await prisma.auditLog.create({
        data: {
          action: "K136A_IADE_YAZIMI",
          targetType: "Return",
          targetId: iadeId,
          detail: JSON.stringify({
            siparis: p.siparis,
            saleId: satis.id,
            iadeTarihi: p.tarih,
            sebepKaynagi: p.kaynak,
            note: notMetni(p),
            returnType: "NORMAL",
            iadeKargosu,
            oncekiNet1: satis.net1Amount?.toString() ?? null,
            oncekiNet2: satis.net2Amount?.toString() ?? null,
            oncekiDurum: satis.profitStatus,
            kalemler: satis.items.map((it) => ({
              saleItemId: it.id,
              variantId: it.variantId,
              adet: it.quantity,
              saglamAdet: it.quantity,
            })),
            israrSebebi: "DIGER",
            israrAciklamasi: ISRAR_ACIKLAMASI,
          }),
        },
      });

      console.log(`   ${p.siparis.padEnd(13)} ✓ YAZILDI — Return ${iadeId}`);
      yazildi += 1;
    } catch (e) {
      /**
       * ⚠ MESAJ TAM TAŞINIR — kırpma yalnız gösterimde, kayıtta ASLA.
       * `split("\n")[0]` Prisma hatasının boş ilk satırını alır ve sebebi
       * siler; satır sonları boşluğa çevrilip TAMAMI basılıyor.
       * _(Anayasa: "hata mesajını kısaltan her işlem teşhisi kısaltır".)_
       */
      const ham =
        e instanceof FazlaIadeHatasi
          ? `FazlaIadeHatasi kalan=${e.kalan} girilen=${e.girilen}`
          : e instanceof Error
            ? e.message
            : String(e);
      console.log(
        `   ${p.siparis.padEnd(13)} ⛔ HATA: ${ham.replace(/\s+/g, " ")}`,
      );
      hata += 1;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   *  ④ DEĞİŞMEZLİK TURU — İADE DIŞI RAKAMLAR BİT-BİT SABİT Mİ
   * ═══════════════════════════════════════════════════════════════════════
   */
  const sonra = await gorunuAl();
  console.log("\n④ DEĞİŞMEZLİK TURU");
  console.log(
    `   Return kaydı      : ${once.iadeSayisi} → ${sonra.iadeSayisi}` +
      `   (+${sonra.iadeSayisi - once.iadeSayisi})`,
  );
  console.log(
    `   StockMovement     : ${once.hareketSayisi} → ${sonra.hareketSayisi}` +
      `   (+${sonra.hareketSayisi - once.hareketSayisi})`,
  );

  /** ⭐ STOK: yalnız beklenen varyantlarda ve yalnız beklenen kadar. */
  console.log("\n   STOK DEĞİŞİMİ (varyant bazında)");
  let stokKusuru = 0;
  const tumVaryantlar = new Set([
    ...Object.keys(once.stok),
    ...Object.keys(sonra.stok),
  ]);
  for (const v of tumVaryantlar) {
    const a = once.stok[v] ?? 0;
    const b = sonra.stok[v] ?? 0;
    if (a === b) continue;
    const fark = b - a;
    console.log(`      ${v}  ${a} → ${b}  (${fark > 0 ? "+" : ""}${fark})`);
    if (fark !== 1) {
      console.log("         ⛔ BEKLENEN +1 DEĞİL — incele.");
      stokKusuru += 1;
    }
  }

  /** ⭐ NET: iade DIŞI hiçbir satış değişmemeli — burada hepsi iadeli. */
  console.log("\n   SATIŞ NET DEĞİŞİMİ (orijinal snapshot DEĞİŞMEMELİ)");
  let netKusuru = 0;
  for (const a of once.satislar) {
    const b = sonra.satislar.find((x) => x.code === a.code);
    if (!b) {
      console.log(`      ${a.code} ⛔ SONRA GÖRÜNTÜSÜNDE YOK`);
      netKusuru += 1;
      continue;
    }
    const ayni = a.net1 === b.net1 && a.net2 === b.net2 && a.durum === b.durum;
    console.log(
      `      ${String(a.code).padEnd(13)} ${
        ayni
          ? "✓ BİT-BİT SABİT"
          : `⛔ DEĞİŞTİ  NET-1 ${a.net1}→${b.net1}  NET-2 ${a.net2}→${b.net2}`
      }`,
    );
    if (!ayni) netKusuru += 1;
  }

  console.log("\n" + "=".repeat(78));
  console.log("  ÖZET");
  console.log("=".repeat(78));
  console.log(`   yazıldı : ${yazildi}`);
  console.log(`   atlandı : ${atlandi}`);
  console.log(`   ⛔ hata  : ${hata}`);
  console.log(`   ⛔ stok kusuru : ${stokKusuru}`);
  console.log(`   ⛔ NET kusuru  : ${netKusuru}`);
  if (hata > 0 || stokKusuru > 0 || netKusuru > 0) {
    console.log("\n   ⛔ TUR TEMİZ DEĞİL — yukarıdaki satırlar incelenmeli.");
    process.exitCode = 1;
  } else {
    console.log("\n   ✓ TUR TEMİZ.");
  }
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
