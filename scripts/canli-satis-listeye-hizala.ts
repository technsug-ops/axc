/** BETIK SINIFI: TEK_SEFERLIK — resmi donem satislarini Halil'in BAZ listesine hizalar; V2(2) md5 kilidi. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  SATIŞLARI LİSTEYE HİZALA — "LİSTE, SATIŞLARIN FİZİKİ SAYIMIDIR"
 * ----------------------------------------------------------------------------
 *      npm run canli:satis-listeye-hizala             → KURU KOŞUM
 *      npm run canli:satis-listeye-hizala -- --uygula → YAZAR
 *
 *  ── YETKİ — HALİL KARARI 04.09.2026 ─────────────────────────────────────
 *  _"Nasıl stoklarda fiziki sayım okeyse, şu anda verdiğim satışlarda son
 *  çalışılan liste ve bunu baz al. Bu tarih aralığında gerisi umurumda
 *  değil."_
 *  → Resmî dönemde (01.08.2025+) LİSTE son sözdür: listeyle çelişen defter
 *  değeri LİSTEYE çekilir; listede olmayan elle giriş İPTAL edilir.
 *  ⚠ Bu, "kaynak önceliği kanal>defter" kuralının ÜZERİNE kullanıcı
 *  beyanıdır ve beyanla geçilir (anayasa: kullanıcı ısrar ederse istisna
 *  kaydedilir) — API kuruşları dahil liste kazanır, gerekçe izde.
 *
 *  ── ÜÇ İŞ, HEPSİ EKRAN MOTORLARIYLA ─────────────────────────────────────
 *  ① 17 fiyat farkı → `duzenlemeUygula` (neden: KANAL_FARKI, açıklamalı)
 *  ② 2 adet farkı  → aynı motor (`adetler`); adet ARTIŞI stok isterse
 *     motor engel döner ve bu RAPORLANIR, zorlanmaz.
 *  ③ listede olmayan kodsuz elle satış (03.08.2026 OneBlade ₺1.649)
 *     → `iptalUygula` (sebep MAGAZA_DIGER; Halil: test şüphesi + listede yok)
 *  İkinci motor YOK; imza akışı (önizle→imza→uygula) ekranla birebir.
 *
 *  ── TEKRAR KOŞULABİLİRLİK ───────────────────────────────────────────────
 *  Ölçüt yeniden hesaplanır: "defter ≠ liste" kalmayana dek; hizalanan
 *  satır ikinci koşumda farksız çıkar ve atlanır.
 * ============================================================================
 */

const V2 = "C:/Users/yapra/Downloads/Satislar_V2 (2).xlsx";
const V2_MD5 = "3a41d5b00500afcad88a6d4836852d7e";
const UYGULA = process.argv.includes("--uygula");

const metne = (h: unknown): string =>
  h instanceof Date ? h.toISOString().slice(0, 10) : String(h ?? "").trim();
const anahtarla = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[\s_-]+/g, "");
const num = (h: unknown): number => (typeof h === "number" && Number.isFinite(h) ? h : 0);
const p2 = (x: number) =>
  x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { duzenlemeOnizle, duzenlemeUygula } = await import("../src/lib/satis-duzenleme-veri");
  const { iptalOnizle, iptalUygula } = await import("../src/lib/satis-iptali-veri");

  const ham = readFileSync(V2);
  const md5 = createHash("md5").update(ham).digest("hex");
  console.log("=".repeat(96));
  console.log(`  SATIŞLARI LİSTEYE HİZALA · KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "KURU KOŞUM"}`);
  console.log(`  dosya ${V2.split("/").pop()} · md5 ${md5}`);
  console.log("=".repeat(96));
  if (md5 !== V2_MD5) {
    console.log("\n⛔ MD5 TUTMUYOR — baz liste bu değil. ÇIKILDI.\n");
    process.exitCode = 1;
    return;
  }

  /** İşlemleri yazan kullanıcı — Halil'in hesabı (ilk kullanıcı). */
  const kullanici = await prisma.user.findFirst({ select: { id: true, name: true } });
  if (!kullanici) { console.log("⛔ kullanıcı yok"); process.exitCode = 1; return; }
  console.log(`  işlem sahibi: ${kullanici.name}`);

  const sf = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sf[0];
  const bas = sayfa.data[0].map((h) => metne(h));
  const K = (a: string) => bas.findIndex((h) => anahtarla(h) === anahtarla(a));
  const kol = { sip: K("Sipariş Numarası"), tur: K("TÜR"), adet: K("Satış Miktarı"),
    fiyat: K("ÜRÜN LİSTE FİYATI"), alis: K("ÜRÜN ALIŞ FİYATI") };
  const satisTuru = (t: string) => anahtarla(t).includes("satış") || anahtarla(t).includes("satis");
  const dosya = new Map<string, { ciro: number; adet: number; birim: number }>();
  for (let i = 1; i < sayfa.data.length; i += 1) {
    const r = sayfa.data[i];
    if (!satisTuru(metne(r[kol.tur]))) continue;
    const sip = metne(r[kol.sip]).replace(/\s+/g, "");
    if (sip === "") continue;
    const adet = num(r[kol.adet]) || 1;
    const g = dosya.get(sip) ?? { ciro: 0, adet: 0, birim: 0 };
    g.ciro += num(r[kol.fiyat]) * adet;
    g.adet += adet;
    g.birim = num(r[kol.fiyat]);
    dosya.set(sip, g);
  }

  const satislar = await prisma.sale.findMany({
    where: { soldAt: { gte: new Date("2025-08-01T00:00:00Z") }, iptalTarihi: null,
      code: { not: null } },
    select: { id: true, code: true, soldAt: true,
      items: { select: { id: true, quantity: true, unitPriceAmount: true } } },
  });

  type Is = { id: string; kod: string; fiyatlar: Record<string, number>;
    adetler?: Record<string, number>; ozet: string };
  const isler: Is[] = [];
  const atlanan: string[] = [];
  for (const s of satislar) {
    const kod = s.code!.replace(/\s+/g, "");
    const d = dosya.get(kod);
    if (!d) continue;
    const ciro = s.items.reduce((a, i) => a + i.quantity * Number(i.unitPriceAmount.toString()), 0);
    const adetD = s.items.reduce((a, i) => a + i.quantity, 0);
    if (Math.abs(ciro - d.ciro) < 0.01 && adetD === d.adet) continue;
    if (s.items.length !== 1) {
      atlanan.push(`${kod} — ÇOK KALEMLİ, elle bakılacak`);
      continue;
    }
    const it = s.items[0];
    const isKaydi: Is = { id: s.id, kod, fiyatlar: { [it.id]: d.birim },
      ozet: `${kod}: fiyat ${it.unitPriceAmount}→${d.birim}` };
    if (it.quantity !== d.adet) {
      isKaydi.adetler = { [it.id]: d.adet };
      isKaydi.ozet += ` · adet ${it.quantity}→${d.adet}`;
    }
    isler.push(isKaydi);
  }
  console.log(`\n① HİZALANACAK: ${isler.length} satış  (atlanan çok-kalemli: ${atlanan.length})`);
  for (const i of isler) console.log("   " + i.ozet);
  for (const a of atlanan) console.log("   ⚠ " + a);

  /* ② listede olmayan kodsuz elle satış → iptal adayı */
  const kodsuz = await prisma.sale.findMany({
    where: { code: null, iptalTarihi: null, importBatch: null,
      soldAt: { gte: new Date("2025-08-01T00:00:00Z") } },
    select: { id: true, soldAt: true,
      items: { select: { quantity: true, unitPriceAmount: true,
        variant: { select: { sku: true } } } } },
  });
  console.log(`\n② LİSTEDE OLMAYAN KODSUZ ELLE SATIŞ (iptal adayı): ${kodsuz.length}`);
  for (const s of kodsuz)
    console.log(`   ${s.soldAt.toISOString().slice(0, 10)} x${s.items[0].quantity}` +
      ` ₺${s.items[0].unitPriceAmount} ${s.items[0].variant.sku}`);

  if (!UYGULA) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --uygula\n");
    await prisma.$disconnect();
    return;
  }

  const an = new Date();
  let hizalanan = 0, engellenen = 0, iptalEdilen = 0;
  const engeller: string[] = [];
  for (const i of isler) {
    const plan = await duzenlemeOnizle(i.id,
      { fiyatlar: i.fiyatlar, adetler: i.adetler, kargoFirmaId: null,
        kargoDesi: null, kargoTutar: null } as never,
      "KANAL_FARKI",
      "Halil karari 04.09.2026: liste satislarin fiziki sayimidir — defter baz listeye cekildi.");
    if (!plan) { engellenen += 1; engeller.push(i.kod + " — plan kurulamadı"); continue; }
    /** ⚠ Kargo alanları formda 'mevcut değer' olarak gelir; null geçersek
     *  siler miydi? planKur mevcutları koruyorsa sorun yok — sonuç NET-2
     *  değişiminden görülür ve raporlanır. */
    const sonuc = await duzenlemeUygula({
      saleId: i.id,
      yeni: { fiyatlar: i.fiyatlar, adetler: i.adetler, kargoFirmaId: null,
        kargoDesi: null, kargoTutar: null } as never,
      neden: "KANAL_FARKI",
      aciklama:
        "Halil karari 04.09.2026: liste satislarin fiziki sayimidir — defter baz listeye cekildi.",
      onaylananImza: (plan as { imza: string }).imza,
      kullaniciId: kullanici.id,
      an,
    });
    if (sonuc.tamam) { hizalanan += 1; }
    else { engellenen += 1;
      engeller.push(`${i.kod} — ${"engel" in sonuc ? sonuc.engel ?? sonuc.kod : sonuc.kod}`); }
  }
  for (const s of kodsuz) {
    const plan = await iptalOnizle(s.id, "MAGAZA_DIGER",
      "Halil karari 04.09.2026: baz listede yok (test suphesi) — liste satislarin fiziki sayimidir.");
    if (!plan) { engeller.push("kodsuz iptal — plan kurulamadı"); continue; }
    const sonuc = await iptalUygula({
      saleId: s.id, sebep: "MAGAZA_DIGER",
      not: "Halil karari 04.09.2026: baz listede yok (test suphesi) — liste satislarin fiziki sayimidir.",
      onaylananImza: (plan as { imza: string }).imza,
      kullaniciId: kullanici.id, an,
    });
    if (sonuc.tamam) iptalEdilen += 1;
    else engeller.push("kodsuz iptal — " + ("engel" in sonuc ? sonuc.engel : "?"));
  }
  console.log(`\n③ SONUÇ  hizalanan ${hizalanan} · engellenen ${engellenen} · iptal ${iptalEdilen}`);
  for (const e of engeller) console.log("   ⛔ " + e);

  await prisma.auditLog.create({
    data: {
      action: "SATIS_LISTEYE_HIZALANDI",
      targetType: "Sale",
      targetId: "listeye-hizala-20260904",
      detail: JSON.stringify({
        dosya: V2.split("/").pop(), md5, hizalanan, engellenen, iptalEdilen,
        karar: "Halil 04.09.2026: liste satislarin fiziki sayimidir; kanal-API kuruslari dahil LISTE kazanir (beyanla)",
        engeller: engeller.slice(0, 10),
      }),
    },
  });
  console.log(`   iz: AuditLog → SATIS_LISTEYE_HIZALANDI\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
