/**
 * ============================================================================
 *  BİR ALIM KALEMİNİN BİRİM MALİYETİNİ DÜZELT — FATURA TEYİDİYLE
 * ----------------------------------------------------------------------------
 *  Kuru koşum:  npm run canli:alim-maliyet-duzelt -- ALM-HB-260216-03 --toplam=1598
 *  Yazım:       ...aynı komut + --uygula
 *
 *  BETIK SINIFI: TEK_SEFERLIK — vaka bazlı, alım koduna kilitli.
 *  ⛔ GENEL ARAÇ HÂLİNE GETİRİLMEZ: her koşum bir alım kodu ve bir FATURA
 *  RAKAMI ister; ikisi de komut satırında yazılı durur ve ize geçer.
 *
 *  ── ⛔ NİYE VAR — VE NİYE "İMKÂNSIZ DEĞER" TEK BAŞINA YETMEDİ ────────────
 *  `axcali1805` (2'li şef bıçağı) `ALM-HB-260216-03` partisinde ₺7.641,50
 *  birim maliyetle duruyordu. Aynı gün aynı tedarikçiden alınan kardeş
 *  partiler ₺537,62 · ₺562,47 · ₺612,47 — arada **13 kat**.
 *
 *  ⛔ AMA BU TEK BAŞINA DÜZELTME SEBEBİ DEĞİLDİ. Anayasa: _"imkânsız
 *  görünen değer önce DOĞRULANIR — düzeltilmez"_ (OneBlade `₺27,16` de
 *  imkânsız görünmüştü ve hediye kuponu yüzünden GERÇEKTİ).
 *  ⭐ Düzeltmeyi açan şey ölçüm değil, **Halil'in faturası** oldu:
 *  Hepsiburada sipariş `479 182 345 7` · 16.02.2026 12:09 · satıcı Tefal ·
 *  "Tefal Fresh Kitchen 2'li Şef Bıçağı" **x2 · 1.598,00 TL**.
 *  Halil'in beyanı: _"Ben Excel listesine yanlış girmişim."_
 *
 *  ── ⚠ BİRİM Mİ TOPLAM MI — BETİK KARAR VERMEZ, SORAR ────────────────────
 *  `1.598,00` ekranda `x2` rozetinin yanında duruyor. İki okuma da
 *  dilbilgisel olarak mümkün ve **ikisi farklı sonuç verir**:
 *
 *      --toplam=1598   → birim  ₺799,00     (satır toplamı okuması)
 *      --birim=1598    → toplam ₺3.196,00   (birim fiyat okuması)
 *
 *  Bu ayrım tam olarak TY `price` vakasında yanlış yapılmıştı ve çok
 *  adetli her satış cironun yarısıyla girmişti. _(Anayasa: "iki okumayla
 *  da uyumlu bir gözlem hiçbirini kanıtlamaz" · "birim mi toplam mı
 *  sorusu her iki taraf için AYRI sorulur".)_
 *  ⛔ Bu yüzden komut satırında hangisi olduğu AÇIKÇA yazılır; varsayılan
 *  YOKTUR ve betik tahmin etmez.
 *
 *  ── ⭐ DÜZELTME ÜÇ YERE BİRDEN GİDER ────────────────────────────────────
 *  Maliyet TEK yerde durmuyor; düzeltme hepsine ulaşmazsa ekran doğru
 *  görünür ve NET eski değerle kalır (19.08 dersi):
 *    ① `PurchaseItem.unitCostAmount`      — alım ekranının gösterdiği
 *    ② `StockMovement` PURCHASE_IN        — partinin kendi damgası
 *    ③ `StockMovement` ÇIKIŞLAR           — `sourceMovementId` ile o
 *       partiye bağlı satış hareketleri; **kâr motoru maliyeti BURADAN
 *       okur**. ⚠ Çıkışlarda `purchaseItemId` BOŞ (canlıda 49/49 ölçüldü),
 *       o yüzden eşleştirme `sourceMovementId` üzerinden yapılır.
 *
 *  ── LEDGER DİSİPLİNİ ────────────────────────────────────────────────────
 *  ⚠ Bu bir METADATA/PARA düzeltmesi ve ledger dokunulmazlığının dar
 *  istisnası DEĞİL — burada değişen şey PARA. Ama ters kayıt işe yaramaz:
 *  `ADJUSTMENT` adet düzeltir, geçmiş bir partinin BİRİM MALİYETİNİ
 *  düzeltmez; kaydı silmek de FIFO bağı (`Restrict`) yüzünden mümkün değil.
 *  ⭐ Bu yüzden düzeltme yerinde yapılır **ve iz eski değerle birlikte
 *  yazılır** — eski değer kaybolmaz, `AuditLog`da durur.
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function kurus(x: number): number {
  return Math.round(x * 100) / 100;
}
function sayiArg(ad: string): number | null {
  const a = process.argv.find((x) => x.startsWith(`--${ad}=`));
  if (a === undefined) return null;
  const n = Number(a.split("=")[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function main() {
  const uygula = process.argv.includes("--uygula");
  const alimKodu = process.argv.slice(2).find((a) => !a.startsWith("-")) ?? "";
  const toplamArg = sayiArg("toplam");
  const birimArg = sayiArg("birim");

  if (alimKodu === "") {
    console.log("⛔ Alım kodu gerekli.");
    console.log("   npm run canli:alim-maliyet-duzelt -- ALM-HB-260216-03 --toplam=1598");
    process.exitCode = 1;
    return;
  }
  if ((toplamArg === null) === (birimArg === null)) {
    console.log("⛔ `--toplam=` YA DA `--birim=` — tam olarak biri gerekli.");
    console.log("   Faturadaki rakam SATIR TOPLAMI ise  : --toplam=1598");
    console.log("   Faturadaki rakam BİRİM FİYAT ise    : --birim=1598");
    console.log("   ⚠ Betik tahmin etmez; ikisi farklı sonuç verir.");
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

  console.log("=".repeat(92));
  console.log(
    `  ALIM MALİYETİ DÜZELTME — ${alimKodu} — ${uygula ? "⚠ YAZIM" : "KURU KOŞUM"}`,
  );
  console.log("=".repeat(92));

  const alim = await prisma.purchase.findFirst({
    where: { code: alimKodu },
    select: {
      id: true,
      code: true,
      purchasedAt: true,
      supplierOrderNo: true,
      supplier: { select: { name: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          unitCostAmount: true,
          unitCostCurrency: true,
          variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
        },
      },
    },
  });
  if (alim === null) {
    console.log(`⛔ ${alimKodu} DEFTERDE YOK — ÖLÇÜM YOK.`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  if (alim.items.length !== 1) {
    console.log(
      `⛔ Bu alımda ${alim.items.length} kalem var. Bu betik TEK KALEMLİ` +
        " alım için yazıldı — hangi kaleme yazılacağı belirsiz. DURDU.",
    );
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const kalem = alim.items[0];
  const eskiBirim = Number(kalem.unitCostAmount.toString());
  const adet = kalem.quantity;
  const yeniBirim = kurus(
    toplamArg !== null ? toplamArg / adet : (birimArg as number),
  );
  const yeniToplam = kurus(yeniBirim * adet);

  console.log(`\n  alım      : ${alim.code} · ${alim.purchasedAt.toISOString().slice(0, 10)} · ${alim.supplier?.name ?? "—"}`);
  console.log(`  tedarikçi no: ${alim.supplierOrderNo ?? "—"}   ← faturada bakılan sipariş`);
  console.log(`  kalem     : ${kalem.variant.sku} × ${adet} · ${kalem.variant.product.name.slice(0, 50)}`);
  console.log(`\n① DEĞİŞİM`);
  console.log(`   ESKİ  birim ${para(eskiBirim).padStart(11)} · toplam ${para(eskiBirim * adet).padStart(11)}`);
  console.log(`   YENİ  birim ${para(yeniBirim).padStart(11)} · toplam ${para(yeniToplam).padStart(11)}`);
  console.log(
    `   okuma : ${toplamArg !== null ? `--toplam=${toplamArg} (satır toplamı)` : `--birim=${birimArg} (birim fiyat)`}`,
  );
  console.log(
    `   ⭐ fark: birim ${para(yeniBirim - eskiBirim)} · toplam ${para(yeniToplam - eskiBirim * adet)}`,
  );

  /** ⚠ ÖTEKİ OKUMA DA YAZILIR — okuyan hangisini seçtiğini görsün. */
  const otekiBirim = toplamArg !== null ? kurus(toplamArg) : kurus((birimArg as number) / adet);
  console.log(
    `   ⚠ ÖTEKİ OKUMA olsaydı birim ${para(otekiBirim)} olurdu` +
      ` (toplam ${para(otekiBirim * adet)}). Seçim komut satırında yapıldı.`,
  );

  /* ── ② KARDEŞ PARTİLER — yeni değer bağlama oturuyor mu ─────────────── */
  const kardesler = await prisma.purchaseItem.findMany({
    where: {
      variantId: kalem.variant.id,
      purchase: { purchasedAt: alim.purchasedAt },
      NOT: { id: kalem.id },
    },
    select: { quantity: true, unitCostAmount: true, purchase: { select: { code: true } } },
    orderBy: { purchase: { code: "asc" } },
  });
  console.log(`\n② AYNI GÜN KARDEŞ PARTİLER (${kardesler.length})`);
  for (const k of kardesler) {
    console.log(
      `   ${k.purchase.code.padEnd(22)} ×${k.quantity} · ${para(Number(k.unitCostAmount.toString())).padStart(10)}`,
    );
  }
  if (kardesler.length > 0) {
    const bl = kardesler.map((k) => Number(k.unitCostAmount.toString()));
    const enAz = Math.min(...bl);
    const enCok = Math.max(...bl);
    const oranEski = eskiBirim / enAz;
    const oranYeni = yeniBirim / enAz;
    console.log(
      `   kardeş aralığı ${para(enAz)} – ${para(enCok)}` +
        `  ·  ESKİ oran ${oranEski.toFixed(2)}×  →  YENİ oran ${oranYeni.toFixed(2)}×`,
    );
    if (oranYeni > 1.5) {
      console.log(
        "   ⚠ YENİ DEĞER DE KARDEŞLERİNDEN 1,5 KATTAN UZAK — okuma yanlış olabilir.",
      );
    }
  }

  /* ── ③ ETKİLENEN SATIŞLAR — kâr motoru maliyeti çıkıştan okur ───────── */
  const partiHareketi = await prisma.stockMovement.findFirst({
    where: { purchaseItemId: kalem.id, quantityDelta: { gt: 0 } },
    select: { id: true, unitCostAmount: true },
  });
  if (partiHareketi === null) {
    console.log("\n⛔ Bu alım kalemine bağlı PURCHASE_IN hareketi YOK. DURDU.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const cikislar = await prisma.stockMovement.findMany({
    where: { sourceMovementId: partiHareketi.id },
    select: {
      id: true,
      quantityDelta: true,
      unitCostAmount: true,
      occurredAt: true,
      saleItem: {
        select: {
          id: true,
          quantity: true,
          unitPriceAmount: true,
          sale: {
            select: {
              id: true,
              code: true,
              profitStatus: true,
              net1Amount: true,
              net2Amount: true,
            },
          },
        },
      },
    },
    orderBy: { occurredAt: "asc" },
  });
  console.log(`\n③ BU PARTİDEN YEMİŞ ÇIKIŞLAR (${cikislar.length})`);
  const etkilenenSatis = new Map<string, string>();
  for (const c of cikislar) {
    const s = c.saleItem?.sale;
    if (s !== undefined && s !== null) etkilenenSatis.set(s.id, s.code ?? "");
    console.log(
      `   ${c.occurredAt.toISOString().slice(0, 10)} ${String(c.quantityDelta).padStart(3)} ad` +
        ` · damga ${para(Number((c.unitCostAmount ?? 0).toString())).padStart(10)}` +
        ` · ${(s?.code ?? "—").padEnd(13)}` +
        ` fiyat ${c.saleItem === null ? "—" : para(Number(c.saleItem.unitPriceAmount.toString())).padStart(9)}` +
        ` · NET-2 ${s?.net2Amount == null ? "—" : para(Number(s.net2Amount.toString())).padStart(10)}`,
    );
  }
  console.log(`   ⭐ etkilenen SATIŞ sayısı: ${etkilenenSatis.size}`);
  console.log(
    "   ⚠ Kâr motoru maliyeti bu ÇIKIŞ damgalarından okur — düzeltme" +
      " onlara ulaşmazsa NET eski değerle kalır (19.08 dersi).",
  );

  if (!uygula) {
    console.log("\n" + "=".repeat(92));
    console.log("  ⛔ KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log(
      `     Yazmak için: npm run canli:alim-maliyet-duzelt -- ${alimKodu}` +
        ` ${toplamArg !== null ? `--toplam=${toplamArg}` : `--birim=${birimArg}`} --uygula`,
    );
    console.log("=".repeat(92) + "\n");
    await prisma.$disconnect();
    return;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  YAZIM — (a) anlık görüntü · (b) tek işlem, tamamı-ya-hiçbiri
   * ══════════════════════════════════════════════════════════════════════ */
  const goruntu = {
    alim: alim.code,
    an: new Date().toISOString(),
    okuma: toplamArg !== null ? `toplam=${toplamArg}` : `birim=${birimArg}`,
    eskiBirim,
    yeniBirim,
    adet,
    purchaseItemId: kalem.id,
    partiHareketId: partiHareketi.id,
    partiHareketEskiDamga: partiHareketi.unitCostAmount === null
      ? null
      : Number(partiHareketi.unitCostAmount.toString()),
    cikislar: cikislar.map((c) => ({
      id: c.id,
      eskiDamga: c.unitCostAmount === null ? null : Number(c.unitCostAmount.toString()),
      siparis: c.saleItem?.sale.code ?? null,
      saleId: c.saleItem?.sale.id ?? null,
      eskiNet1: c.saleItem?.sale.net1Amount == null ? null : Number(c.saleItem.sale.net1Amount.toString()),
      eskiNet2: c.saleItem?.sale.net2Amount == null ? null : Number(c.saleItem.sale.net2Amount.toString()),
      eskiDurum: c.saleItem?.sale.profitStatus ?? null,
    })),
  };
  const gYol = `veri/ozel/maliyet-duzeltme-${alimKodu}.json`;
  writeFileSync(gYol, JSON.stringify(goruntu, null, 2), "utf8");
  console.log(`\n   ⭐ ANLIK GÖRÜNTÜ: ${gYol}`);

  const kullanici = await prisma.user.findFirst({ select: { id: true } });
  if (kullanici === null) {
    console.log("⛔ Kullanıcı yok — iz yazılamaz. DURDU.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /**
   * ⛔ TEK İŞLEM — TAMAMI YA HİÇBİRİ. Üç yer birlikte değişmezse defter
   * kendi içinde ayrışır (alım ekranı doğru, kâr eski). Yazım küçük
   * (1 + 1 + ~2 satır), zaman aşımı riski yok; yine de açıkça 60 sn.
   */
  await prisma.$transaction(
    async (tx) => {
      await tx.purchaseItem.update({
        where: { id: kalem.id },
        data: { unitCostAmount: yeniBirim.toFixed(4) },
      });
      await tx.stockMovement.update({
        where: { id: partiHareketi.id },
        data: { unitCostAmount: yeniBirim.toFixed(4) },
      });
      for (const c of cikislar) {
        await tx.stockMovement.update({
          where: { id: c.id },
          data: { unitCostAmount: yeniBirim.toFixed(4) },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: kullanici.id,
          action: "ALIM_MALIYETI_DUZELTILDI",
          targetType: "Purchase",
          targetId: alim.id,
          detail: JSON.stringify({
            alim: alim.code,
            tedarikciSiparisNo: alim.supplierOrderNo,
            sku: kalem.variant.sku,
            adet,
            eskiBirim,
            yeniBirim,
            okuma: goruntu.okuma,
            dokunulanCikis: cikislar.length,
            etkilenenSatis: [...etkilenenSatis.values()],
            kaynak:
              "Halil'in HB fatura teyidi — sipariş " +
              (alim.supplierOrderNo ?? "?") +
              ". Beyan: 'Excel listesine yanlış girmişim.' 03.09.2026",
          }),
        },
      });
    },
    { timeout: 60_000 },
  );

  /* ── DOĞRULAMA — defter anlık görüntüyle karşılaştırılır ─────────────── */
  const sonKalem = await prisma.purchaseItem.findUnique({
    where: { id: kalem.id },
    select: { unitCostAmount: true },
  });
  const sonHareketler = await prisma.stockMovement.findMany({
    where: { id: { in: [partiHareketi.id, ...cikislar.map((c) => c.id)] } },
    select: { id: true, unitCostAmount: true },
  });
  const uyanHareket = sonHareketler.filter(
    (h) =>
      h.unitCostAmount !== null &&
      Math.abs(Number(h.unitCostAmount.toString()) - yeniBirim) < 0.005,
  ).length;
  const kalemUyuyor =
    sonKalem !== null &&
    Math.abs(Number(sonKalem.unitCostAmount.toString()) - yeniBirim) < 0.005;
  console.log(`\n④ DOĞRULAMA`);
  console.log(`   alım kalemi     : ${kalemUyuyor ? "✓" : "⛔ AYRIŞIYOR"}`);
  console.log(
    `   hareket damgası : ${uyanHareket}/${sonHareketler.length} ${uyanHareket === sonHareketler.length ? "✓" : "⛔"}`,
  );
  if (!kalemUyuyor || uyanHareket !== sonHareketler.length) process.exitCode = 1;

  console.log("\n" + "=".repeat(92));
  console.log("  ⚠ KÂR TAZELEMESİ AYRI ADIM: npm run canli:kar-tazele");
  console.log(
    `     ${etkilenenSatis.size} satışın NET damgası hâlâ ESKİ maliyetle duruyor.`,
  );
  console.log("=".repeat(92) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
