/**
 * ============================================================================
 *  GİRDİSİ DEĞİŞEN SATIŞLARIN NET DAMGASINI TAZELE
 * ----------------------------------------------------------------------------
 *  Rapor:  npm run canli:net-tazele -- 11015495705 11015821765
 *  Yazım:  ...aynı komut + --uygula
 *  Parti:  npm run canli:net-tazele -- --iz=KARGO_ELLE_YAZILDI
 *
 *  BETIK SINIFI: SUREKLI — girdi (kargo/maliyet) değiştiğinde koşar.
 *  BEKCI SINIFI: BAGIMSIZ — canlı veritabanı gerekiyor.
 *
 *  ── ⛔ NİYE `canli:kar-tazele` YETMEDİ ──────────────────────────────────
 *  O betik **"adet düzenlemesinden etkilenen satışlar"** için yazıldı:
 *  damgalanmış maliyet ile defterin AYRIŞTIĞI satırları arar. Ama girdi
 *  değiştiğinde ayrışma olmaz — defter de damga da tutarlıdır, yalnız
 *  ikisi de ESKİ girdiyle hesaplanmıştır.
 *
 *  📏 ÖLÇÜLDÜ 03.09.2026: 19 satışın kargosu ve `ALM-HB-260216-03`ün birim
 *  maliyeti yazıldıktan sonra `canli:kar-tazele` **beş** satış buldu ve
 *  **hiçbiri bu 21'den değildi.** Bıçak satışları hâlâ NET-2 −5.296,15
 *  gösteriyordu — maliyet ₺7.641,50'den ₺799,00'a düşmüş olmasına rağmen.
 *  _(Anayasa: "düzeltme yolu, TÜM OKUYUCULARA ulaştığı ölçülmeden 'var'
 *  sayılmaz".)_
 *
 *  ── ⭐ EKRANIN ÇAĞRISININ AYNISI ────────────────────────────────────────
 *  `karYenidenYaz` çağrılıyor — kanal hesabı değiştirme ekranının
 *  (`satislar/[id]/hesap-actions.ts`) kullandığı gövdenin aynısı. İkinci
 *  bir hesap yazsaydım aynı satış iki yoldan iki türlü hesaplanırdı.
 *
 *  ⚠ KOMİSYON ORANI TAŞINIR, ÇEKİLMEZ: kalemdeki snapshot oran korunur
 *  (`commissionAmount: null`). Yeni oran çekmek, kaydın o günkü oranını
 *  sessizce ezmek olurdu.
 *  ⚠ KARGO KDV DAHİL VERİLİR: defter KDV hariç saklıyor, motor dahil
 *  bekliyor (`lib/kargo-kdv.ts`). Çevirme `kdvDahilKargo` ile — elle
 *  1,20 çarpmak ikinci bir hesap olurdu.
 *
 *  ── ADRES BAŞTA SABİTLENİR ──────────────────────────────────────────────
 *  ⚠ Kâr motoru uygulamanın `prisma` TEKİLİNİ kullanır. `DATABASE_URL`
 *  her şeyden ÖNCE canlıya kurulur, motor modülü ondan SONRA yüklenir —
 *  yoksa CANLIDAN OKUYUP YERELE YAZARDI (29.08 dersi).
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

function para(x: number | null): string {
  return x === null
    ? "—"
    : x.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

async function main() {
  const uygula = process.argv.includes("--uygula");
  const izArg = process.argv.find((a) => a.startsWith("--iz="));
  const kodlar = process.argv.slice(2).filter((a) => !a.startsWith("-"));

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { karYenidenYaz, karOnizle } = await import("../src/lib/kar-yeniden");
  const { kdvDahilKargo } = await import("../src/lib/kargo-kdv");

  console.log("=".repeat(92));
  console.log(`  NET TAZELEME — ${uygula ? "⚠ YAZIM" : "RAPOR (yazmaz)"}`);
  console.log("=".repeat(92));

  /* ── HEDEF KÜME ────────────────────────────────────────────────────── */
  let hedefKodlar = kodlar;
  if (izArg !== undefined) {
    /**
     * ⭐ KÜME İZDEN ÜRETİLİR, LİSTE SAKLANMAZ. Hangi satışlara dokunulduğu
     * `AuditLog`dan yeniden hesaplanır; elle tutulan bir liste bozulabilir.
     * _(Anayasa: "geri alma yolu, saklanan listeye değil yeniden
     * hesaplanabilir ölçüte dayanır".)_
     */
    const eylem = izArg.split("=")[1];
    const izler = await prisma.auditLog.findMany({
      where: { action: eylem },
      select: { targetId: true },
    });
    const idler = [...new Set(izler.map((i) => i.targetId).filter(Boolean))] as string[];
    const s = await prisma.sale.findMany({
      where: { id: { in: idler } },
      select: { code: true },
    });
    /**
     * ⛔ İZ, KOMUT SATIRINDAKİLERİ EZMEZ — EKLER.
     * İlk yazımda `hedefKodlar = ...` yazmıştım ve `--iz` ile birlikte
     * verilen sipariş numaraları SESSİZCE DÜŞÜYORDU: 21 satış istendi,
     * 19'u koştu ve iki bıçak satışı hiç görünmedi. Sessiz eleme, en
     * pahalı kusur sınıfı.
     */
    const izKodlari = s.map((x) => x.code ?? "").filter((x) => x !== "");
    hedefKodlar = [...new Set([...kodlar, ...izKodlari])];
    console.log(
      `
  iz "${eylem}" → ${izKodlari.length} satış` +
        (kodlar.length > 0
          ? `  ·  komut satırından ${kodlar.length}  ·  BİRLEŞİK ${hedefKodlar.length}`
          : ""),
    );
  }
  if (hedefKodlar.length === 0) {
    console.log("⛔ Hedef yok. Sipariş no verin ya da --iz=<EYLEM> kullanın.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const satislar = await prisma.sale.findMany({
    where: { code: { in: hedefKodlar } },
    select: {
      id: true,
      code: true,
      net1Amount: true,
      net2Amount: true,
      profitStatus: true,
      cargoAmount: true,
      cargoCarrierId: true,
      cargoDesi: true,
      items: { select: { id: true, commissionRate: true }, orderBy: { id: "asc" } },
    },
  });
  const bulunmayan = hedefKodlar.filter(
    (k) => !satislar.some((s) => s.code === k),
  );
  console.log(`  hedef ${hedefKodlar.length} · defterde bulunan ${satislar.length}`);
  if (bulunmayan.length > 0) {
    console.log(`  ⛔ DEFTERDE YOK: ${bulunmayan.join(" ")}`);
  }

  /* ── ÖNİZLEME — her satış için eski/yeni ───────────────────────────── */
  type Sonuc = {
    kod: string;
    id: string;
    eskiNet1: number | null;
    eskiNet2: number | null;
    yeniNet1: number | null;
    yeniNet2: number | null;
    eskiDurum: string | null;
    yeniDurum: string;
  };
  const sonuclar: Sonuc[] = [];
  const okunamayan: string[] = [];

  for (const s of satislar) {
    const girdi = {
      saleId: s.id,
      kalemler: s.items.map((k) => ({
        saleItemId: k.id,
        commissionRate:
          k.commissionRate === null ? null : Number(k.commissionRate.toString()),
        commissionAmount: null,
      })),
      cargoCarrierId: s.cargoCarrierId,
      cargoDesi: s.cargoDesi === null ? null : Number(s.cargoDesi.toString()),
      /** ⚠ Defter KDV HARİÇ saklar; motor DAHİL bekler. */
      cargoAmountManual: kdvDahilKargo(
        s.cargoAmount === null ? null : Number(s.cargoAmount.toString()),
      ),
    };
    const on = await karOnizle(girdi);
    if (on === null) {
      okunamayan.push(s.code ?? "");
      continue;
    }
    sonuclar.push({
      kod: s.code ?? "",
      id: s.id,
      eskiNet1: s.net1Amount === null ? null : Number(s.net1Amount.toString()),
      eskiNet2: s.net2Amount === null ? null : Number(s.net2Amount.toString()),
      yeniNet1: on.yeni.net1,
      yeniNet2: on.yeni.net2,
      eskiDurum: s.profitStatus ?? "—",
      yeniDurum: on.yeni.durum ?? "—",
    });
  }

  console.log("\n① ÖNİZLEME — eski ↔ yeni");
  let degisen = 0;
  let toplamFark = 0;
  for (const r of sonuclar) {
    const fark =
      r.eskiNet2 === null || r.yeniNet2 === null ? null : r.yeniNet2 - r.eskiNet2;
    const oynadi = fark !== null && Math.abs(fark) >= 0.005;
    if (oynadi) {
      degisen += 1;
      toplamFark += fark;
    }
    console.log(
      `   ${r.kod.padEnd(13)} NET-2 ${para(r.eskiNet2).padStart(11)} → ${para(r.yeniNet2).padStart(11)}` +
        `  ${fark === null ? "" : (fark >= 0 ? "+" : "") + para(fark).padStart(10)}` +
        `  ${oynadi ? "⭐" : "  "} ${r.eskiDurum === r.yeniDurum ? r.yeniDurum : `${r.eskiDurum}→${r.yeniDurum}`}`,
    );
  }
  console.log(
    `\n   ⭐ NET-2 DEĞİŞEN: ${degisen}/${sonuclar.length}` +
      `  ·  toplam etki ${(toplamFark >= 0 ? "+" : "") + para(toplamFark)}`,
  );
  /** ⚠ "Okunamadı" ile "değişmedi" AYRI SAYILIR. */
  console.log(
    `   ⚠ önizlemesi ÜRETİLEMEYEN: ${okunamayan.length}` +
      (okunamayan.length > 0 ? "  " + okunamayan.join(" ") : "") +
      "   (bu 'değişmedi' DEMEK DEĞİL — hesaplanamadı)",
  );

  if (!uygula) {
    console.log("\n" + "=".repeat(92));
    console.log("  ⛔ RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("     Yazmak için aynı komuta --uygula ekleyin.");
    console.log("=".repeat(92) + "\n");
    await prisma.$disconnect();
    return;
  }

  /* ── YAZIM — (a) anlık görüntü · (b) satır satır ───────────────────── */
  const damga = new Date().toISOString().replace(/[:.]/g, "-");
  const gYol = `veri/ozel/net-tazele-${damga}.json`;
  writeFileSync(
    gYol,
    JSON.stringify(
      { an: new Date().toISOString(), hedef: hedefKodlar, oncesi: sonuclar },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\n   ⭐ ANLIK GÖRÜNTÜ: ${gYol} (${sonuclar.length} satır)`);

  let yazilan = 0;
  const hatalar: string[] = [];
  for (const s of satislar) {
    if (!sonuclar.some((r) => r.id === s.id)) continue;
    try {
      const ok = await karYenidenYaz({
        saleId: s.id,
        kalemler: s.items.map((k) => ({
          saleItemId: k.id,
          commissionRate:
            k.commissionRate === null ? null : Number(k.commissionRate.toString()),
          commissionAmount: null,
        })),
        cargoCarrierId: s.cargoCarrierId,
        cargoDesi: s.cargoDesi === null ? null : Number(s.cargoDesi.toString()),
        cargoAmountManual: kdvDahilKargo(
          s.cargoAmount === null ? null : Number(s.cargoAmount.toString()),
        ),
      });
      if (ok) yazilan += 1;
      else hatalar.push(`${s.code} — karYenidenYaz false döndü`);
    } catch (e) {
      /** ⛔ MESAJ TAM TAŞINIR — kırpma teşhisi kırpar. */
      hatalar.push(
        `${s.code} — ${(e instanceof Error ? (e.stack ?? e.message) : String(e))
          .replace(/[\r\n]+/g, " ")
          .slice(-260)}`,
      );
    }
  }
  console.log(`\n   ⭐ YAZILAN: ${yazilan}/${sonuclar.length}`);
  if (hatalar.length > 0) {
    console.log(`   ⛔ HATA: ${hatalar.length}`);
    for (const h of hatalar) console.log(`      ${h}`);
    process.exitCode = 1;
  }

  /* ── DOĞRULAMA — defter önizlemeyle uyuyor mu ──────────────────────── */
  const sonrasi = await prisma.sale.findMany({
    where: { id: { in: sonuclar.map((r) => r.id) } },
    select: { id: true, code: true, net2Amount: true },
  });
  let uyan = 0;
  const ayrisan: string[] = [];
  for (const s of sonrasi) {
    const r = sonuclar.find((x) => x.id === s.id)!;
    const d = s.net2Amount === null ? null : Number(s.net2Amount.toString());
    if (
      (d === null && r.yeniNet2 === null) ||
      (d !== null && r.yeniNet2 !== null && Math.abs(d - r.yeniNet2) < 0.005)
    ) {
      uyan += 1;
    } else {
      ayrisan.push(`${s.code} defter ${para(d)} ≠ önizleme ${para(r.yeniNet2)}`);
    }
  }
  console.log(`\n② DOĞRULAMA — defter ↔ önizleme: ${uyan}/${sonuclar.length}`);
  if (ayrisan.length > 0) {
    console.log("   ⛔ AYRIŞAN:");
    for (const a of ayrisan) console.log(`      ${a}`);
    process.exitCode = 1;
  }

  console.log("\n" + "=".repeat(92) + "\n");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
