/** BETIK SINIFI: TEK_SEFERLIK — iade_v2 baz dosyasindaki iadeleri yazar; dosya md5 kilidi, tekrar kosum zararsiz ("Return kaydi var mi" olcutu). */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İADE_V2 YAZIMI — TARİHSEL KİP (STOK SAYIMCA KAPATILDI)
 * ----------------------------------------------------------------------------
 *      npm run canli:iade-yaz-v2             → KURU KOŞUM (yazmaz)
 *      npm run canli:iade-yaz-v2 -- --uygula → YAZAR
 *
 *  ── YETKİ ───────────────────────────────────────────────────────────────
 *  Halil 03.09.2026: _"Bu verdiklerim son veriler ve AXcali için BAZ
 *  sayılmalı; stok hariç bütün düzeltmeleri bu verilere göre yap."_
 *
 *  ── ⭐ İKİNCİ MOTOR YOK ─────────────────────────────────────────────────
 *  Yazım `src/lib/iade.ts` → `iadeKaydet` ile — ekranın gövdesinin aynısı,
 *  `stokYazilmaz` kipiyle (motora 03.09.2026'da eklendi; 5 mutasyon
 *  kırmızı kanıtlı). Para tarafı TAM işler (ciro geri, komisyon geri,
 *  maliyet geri, stopaj/ödeme gideri iadesi); stok HİÇ oynamaz — 27.08
 *  sayımı son söz.
 *
 *  ── TARİH VE KARGO: V1 DOSYASINDAN ZENGİNLEŞTİRME ───────────────────────
 *  iade_v2'nin Tarih kolonu SATIŞ tarihi (ölçüldü: V1'in "Sipariş Ta"
 *  değerleriyle örtüşüyor). İadenin GERÇEK dönüş günü V1'de ("Geldiği
 *  Tarih"). Sıra: V1 geldiği > satış tarihi (beyanlı geri düşüş).
 *  Kargo bedeli de V1'den (KDV DAHİL kabul — Halil'in ödediği tutar).
 *
 *  ── SAYIM SONRASI GELEN İADE BU TURA GİRMEZ ─────────────────────────────
 *  Geliş > 27.08.2026 ise mal sayımdan SONRA rafa düştü → stok gerçekten
 *  artmalı → tarihsel kip YANLIŞ olur. O siparişler ayrı kovada Halil'e
 *  listelenir; normal kipte (stoklu) ayrı tur ister.
 *
 *  ── DÖNEM KAPISI ────────────────────────────────────────────────────────
 *  Geçmiş aylara yazım K108 kapısına takılır; `GEC_GIRILEN_KAYIT` ısrarı
 *  ile İZ BIRAKARAK geçilir (gerçekten olmuş iadeler deftere geç giriyor).
 * ============================================================================
 */

const V2 = "C:/Users/yapra/Downloads/iade_v2.xlsx";
const V2_MD5 = "62eab90022f6c761f2d84803f5b58d25";
const V1 = "C:/Users/yapra/Downloads/iade (1).xlsx";
const SAYIM_GUNU = "2026-08-27";
const UYGULA = process.argv.includes("--uygula");

const metne = (h: unknown): string =>
  h instanceof Date ? h.toISOString().slice(0, 10) : String(h ?? "").trim();
const anahtarla = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[\s_-]+/g, "");
const num = (h: unknown): number => (typeof h === "number" && Number.isFinite(h) ? h : 0);
const p2 = (x: number) =>
  x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GEREKCE =
  "V2 baz (Halil 03.09.2026): iade 27.08 fiziksel sayimindan ONCE geldi; " +
  "mal ya yeniden satildi ya sayimda sayildi — stok tarafini SAYIM kapatti.";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { iadeKaydet, satisCikisMaliyeti, komisyonToplami } = await import("../src/lib/iade");

  const ham = readFileSync(V2);
  const md5 = createHash("md5").update(ham).digest("hex");
  console.log("=".repeat(96));
  console.log(`  İADE_V2 YAZIMI · KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "KURU KOŞUM (yazmaz)"}`);
  console.log(`  dosya ${V2.split("/").pop()} · md5 ${md5}`);
  console.log("=".repeat(96));
  if (md5 !== V2_MD5) {
    console.log("\n⛔ MD5 TUTMUYOR — baz ilan edilen dosya bu değil. ÇIKILDI.\n");
    process.exitCode = 1;
    return;
  }

  /* ── V2 satırları ── */
  const sf = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sf[0];
  const bas = sayfa.data[0].map((h) => metne(h));
  const K = (a: string) => bas.findIndex((h) => anahtarla(h) === anahtarla(a));
  const kol = { sip: K("Sipariş Numarası"), sku: K("SKU"), brk: K("AXCALI BARKOD"),
    tur: K("TÜR"), adet: K("Satış Miktarı"), tarih: K("Tarih") };
  type Satir = { kodlar: string[]; adet: number };
  const siparisler = new Map<string, Satir[]>();
  for (let i = 1; i < sayfa.data.length; i += 1) {
    const r = sayfa.data[i];
    if (anahtarla(metne(r[kol.tur])) !== "iade") continue;
    const sip = metne(r[kol.sip]).replace(/\s+/g, "");
    if (sip === "") continue;
    const l = siparisler.get(sip) ?? [];
    l.push({ kodlar: [metne(r[kol.sku]), metne(r[kol.brk])].filter((k) => k !== ""),
      adet: Math.abs(num(r[kol.adet])) || 1 });
    siparisler.set(sip, l);
  }
  console.log(`\n① V2 — iade siparişi: ${siparisler.size}`);

  /* ── V1 zenginleştirme: geldiği tarih + kargo ── */
  const v1sf = await readXlsxFile(paketiNormalle(readFileSync(V1)).bayt);
  const v1 = v1sf[0];
  const v1bi = v1.data.findIndex((r) => r.filter((h) => metne(h) !== "").length >= 3);
  const v1bas = v1.data[v1bi].map((h) => metne(h));
  const vK = (a: string) => v1bas.findIndex((h) => anahtarla(h).includes(anahtarla(a)));
  const vSip = vK("sipariş numarası"), vGel = vK("Geldiği"), vKar = vK("Kargo bedeli");
  const v1map = new Map<string, { geldigi: string; kargo: number }>();
  for (let i = v1bi + 1; i < v1.data.length; i += 1) {
    const r = v1.data[i];
    const sip = metne(r[vSip]).replace(/\s+/g, "");
    if (sip === "") continue;
    const eski = v1map.get(sip);
    v1map.set(sip, {
      geldigi: metne(r[vGel]) || eski?.geldigi || "",
      kargo: (eski?.kargo ?? 0) + num(r[vKar]),
    });
  }
  console.log(`   V1 zenginleştirme haritası: ${v1map.size} sipariş`);

  /* ── Defter ── */
  const satislar = await prisma.sale.findMany({
    where: { code: { in: [...siparisler.keys()] } },
    select: { id: true, code: true, soldAt: true, iptalTarihi: true,
      returns: { select: { id: true } }, returnNotices: { select: { id: true } },
      items: { select: { id: true, quantity: true, unitPriceAmount: true,
        fees: true, stockMovements: true,
        variant: { select: { sku: true, companySku: true, barcode: true } } } } },
  });
  const defter = new Map(satislar.map((s) => [s.code!.replace(/\s+/g, ""), s]));

  /* ── Plan + kovalar ── */
  type Plan = { satis: (typeof satislar)[number]; kalemler: { saleItemId: string; iadeAdedi: number }[];
    occurredAt: Date; tarihKaynagi: "V1_GELDIGI" | "SATIS_TARIHI"; kargo: number | null;
    ozetEtki: number };
  const plan: Plan[] = [];
  const kova = new Map<string, string[]>();
  const koy = (k: string, sip: string) => kova.set(k, [...(kova.get(k) ?? []), sip]);
  let etkiToplam = 0, tarihGeriDusen = 0;
  for (const [sip, satirlar] of siparisler) {
    const s = defter.get(sip);
    if (!s) { koy("satisi defterde YOK", sip); continue; }
    if (s.iptalTarihi !== null) { koy("satis IPTALLI — kar yok", sip); continue; }
    if (s.returns.length > 0 || s.returnNotices.length > 0) { koy("iadesi ZATEN kayitli", sip); continue; }
    const zengin = v1map.get(sip);
    const geldigi = zengin?.geldigi && zengin.geldigi >= "2024" ? zengin.geldigi : "";
    if (geldigi !== "" && geldigi > SAYIM_GUNU) { koy("SAYIM SONRASI gelis — ayri tur (stoklu)", sip); continue; }
    /* kalem eşleştirme: kodla; tek kalemli satışta doğrudan */
    const kalemler: { saleItemId: string; iadeAdedi: number }[] = [];
    let eslesmedi = false;
    for (const satir of satirlar) {
      const hedef = s.items.length === 1
        ? s.items[0]
        : s.items.find((it) => {
            const vk = [it.variant.sku, it.variant.companySku, it.variant.barcode ?? ""];
            return satir.kodlar.some((k) => vk.includes(k));
          });
      if (!hedef) { eslesmedi = true; break; }
      kalemler.push({ saleItemId: hedef.id, iadeAdedi: Math.min(satir.adet, hedef.quantity) });
    }
    if (eslesmedi || kalemler.length === 0) { koy("kalem ESLESMEDI (cok kalemli satis)", sip); continue; }
    /* yaklaşık NET-2 etkisi (önizleme; bağlayıcı rakam motorun yazdığıdır) */
    let etki = 0;
    for (const k of kalemler) {
      const it = s.items.find((x) => x.id === k.saleItemId)!;
      const oran = k.iadeAdedi / it.quantity;
      const tutar = Number(it.unitPriceAmount.toString()) * it.quantity;
      const maliyet = satisCikisMaliyeti(it.stockMovements);
      const komisyon = komisyonToplami(it.fees);
      etki += -tutar * oran + komisyon * oran + (maliyet ?? 0) * oran;
    }
    etkiToplam += etki;
    const occurredAt = geldigi !== ""
      ? new Date(geldigi + "T12:00:00.000Z")
      : new Date(s.soldAt);
    if (geldigi === "") tarihGeriDusen += 1;
    plan.push({ satis: s, kalemler, occurredAt,
      tarihKaynagi: geldigi !== "" ? "V1_GELDIGI" : "SATIS_TARIHI",
      kargo: zengin && zengin.kargo > 0 ? zengin.kargo : null, ozetEtki: etki });
  }
  console.log(`\n② PLAN — yazılacak iade: ${plan.length}`);
  console.log(`   tarih kaynağı: V1 geldiği ${plan.length - tarihGeriDusen} · satış tarihine geri düşen ${tarihGeriDusen} (beyanlı)`);
  console.log(`   kargo bilgisi olan: ${plan.filter((p) => p.kargo !== null).length}`);
  console.log(`   ⚠ YAKLAŞIK NET etki önizlemesi: ₺${p2(etkiToplam)} (bağlayıcı rakam motorundur)`);
  console.log("\n   KOVALAR:");
  for (const [k, l] of kova)
    console.log(`   ${k.padEnd(42)} ${String(l.length).padStart(4)}   ör: ${l.slice(0, 3).join(", ")}`);
  const csv = ["siparis;tarihKaynagi;occurredAt;kargo;yaklasikEtki"];
  for (const p of plan)
    csv.push([p.satis.code, p.tarihKaynagi, p.occurredAt.toISOString().slice(0, 10),
      p.kargo?.toFixed(2) ?? "", p.ozetEtki.toFixed(2)].join(";"));
  writeFileSync("raporlar/iade-v2-plani.csv", "\uFEFF" + csv.join("\r\n"), "utf8");
  console.log(`\n   ⭐ plan listesi: raporlar/iade-v2-plani.csv (${plan.length})`);

  if (!UYGULA) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --uygula\n");
    await prisma.$disconnect();
    return;
  }

  /* ── YAZIM — sipariş başına atomik (iadeKaydet kendi transaction'ı) ── */
  const onceReturn = await prisma.return.count();
  let yazilan = 0, atlanan = 0, hata = 0;
  const hatalar: string[] = [];
  for (const p of plan) {
    try {
      /** Yazım kapısı = okuma ölçütü: Return kaydı hâlâ yok mu. */
      const varMi = await prisma.return.count({ where: { saleId: p.satis.id } });
      if (varMi > 0) { atlanan += 1; continue; }
      await iadeKaydet({
        saleId: p.satis.id,
        code: null,
        returnType: "NORMAL",
        occurredAt: p.occurredAt,
        note:
          "iade_v2 baz yazimi (Halil 03.09.2026)" +
          (p.tarihKaynagi === "SATIS_TARIHI"
            ? " · GELIS TARIHI BILINMIYOR — satis tarihi kullanildi (beyan)"
            : ""),
        userId: null,
        degisimTeslimTarihi: null,
        iadeKargosu: p.kargo,
        yenidenGonderimKargosu: null,
        ceza: null,
        cezaNotu: null,
        stokYazilmaz: { gerekce: GEREKCE },
        donemIsrari: {
          onaylandi: true,
          sebep: "GEC_GIRILEN_KAYIT",
          aciklama:
            "iade_v2 baz dosyasi — gercekten olmus iadeler deftere gec giriliyor (Halil talimati 03.09.2026).",
        },
        kalemler: p.kalemler.map((k) => ({
          saleItemId: k.saleItemId,
          iadeAdedi: k.iadeAdedi,
          /** ⭐ Mal fiziken dondu — para tarafinda SAGLAM sayilir; stok
           *  zaten yazilmiyor (tarihsel kip). Hasarli saymak maliyeti
           *  yakar ve tazminat ekranlarini kirletirdi. */
          saglamAdet: k.iadeAdedi,
          hasarliAdet: 0,
          hasarNotu: null,
          locationId: null,
          exchangeVariantId: null,
        })),
      });
      yazilan += 1;
      if (yazilan % 25 === 0) console.log(`   … ${yazilan}/${plan.length}`);
    } catch (e) {
      hata += 1;
      const m = (e as Error).message.replace(/\n/g, " ");
      hatalar.push(`${p.satis.code} — ${m}`);
      if (hatalar.length <= 8) console.log(`   ⛔ ${p.satis.code} — ${m.slice(-160)}`);
    }
  }
  const sonraReturn = await prisma.return.count();
  console.log(`\n③ YAZIM  yazılan ${yazilan} · atlanan ${atlanan} · hata ${hata}`);
  console.log(`   Return ${onceReturn} → ${sonraReturn}  (fark ${sonraReturn - onceReturn}, beklenen ${yazilan})`);
  /* ⭐ MOTORUN YAZDIĞI GERÇEK ETKİ — önizleme değil, kayıt */
  const yazilanlar = await prisma.return.findMany({
    where: { note: { contains: "iade_v2 baz yazimi" } },
    select: { net2Amount: true } });
  const gercekEtki = yazilanlar.reduce(
    (a, r) => a + (r.net2Amount === null ? 0 : Number(r.net2Amount.toString())), 0);
  console.log(`   ⭐ MOTORUN YAZDIĞI NET-2 etkisi toplamı: ₺${p2(gercekEtki)}  (${yazilanlar.length} kayıt)`);
  const stokKontrol = await prisma.stockMovement.count({
    where: { returnItem: { return: { note: { contains: "iade_v2 baz yazimi" } } } } });
  console.log(`   ⭐ bu yazımın STOK HAREKETİ: ${stokKontrol}  (0 OLMALI)`);
  if (stokKontrol !== 0) process.exitCode = 1;

  await prisma.auditLog.create({
    data: {
      action: "IADE_V2_BAZ_YAZIMI",
      targetType: "Return",
      targetId: "iade-v2-20260903",
      detail: JSON.stringify({
        dosya: V2.split("/").pop(), md5, yazilan, atlanan, hata,
        gercekNet2Etkisi: gercekEtki.toFixed(2),
        stokHareketi: stokKontrol,
        kovalar: Object.fromEntries([...kova.entries()].map(([k, l]) => [k, l.length])),
        tarihGeriDusen,
        gerekce: GEREKCE,
        geriAlmaOlcutu: "Return.note iceren 'iade_v2 baz yazimi' kayitlari (liste saklanmadi)",
        hatalar: hatalar.slice(0, 20),
      }),
    },
  });
  console.log(`\n   iz: AuditLog → IADE_V2_BAZ_YAZIMI\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
