import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";
import * as hb from "./hb/istemci";

/**
 * ============================================================================
 *  HB «KENDİ İNDİRİMİ» ÖLÇÜMÜ — Buybox fiyatı ile liste fiyatı arasındaki fark
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — K363 ④ ölçümü; HB'nin müşteri fiyatına
 *  uyguladığı indirimin YAPISINI (sabit tutar mı, yüzde mi, kimde var) ölçer.
 *  SALT OKUMA — hiçbir şey yazmaz.
 *      npx tsx scripts/hb-indirim-olcum.ts
 *
 *  Kullanıcı beyanı 26.10.2026: «HB fiyatı 1.887,90'a indirmiş ama bana
 *  2.170'ten (liste fiyatı) ödeyecek, komisyon da liste fiyatından.»
 *  Soru: buybox sıralamasındaki `price` (müşteri fiyatı) ile `originalPrice`
 *  arasındaki fark sabit tutar mı, yüzde mi? Ve `originalPrice` bizim
 *  ilana gönderdiğimiz fiyat mı?
 * ============================================================================
 */

const y = canliYapilandirma();
if (!y.tamam) throw new Error(`canlı yapılandırma: ${y.hata.kod}`);
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

async function main() {
  const kimlik = hb.kimlikOku();
  if (!kimlik) throw new Error("HB kimliği yok");
  const b = hb.baslikKur(kimlik);
  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { name: "Hepsiburada" }, satisIcin: true, isActive: true },
    select: { id: true, magazaAdi: true },
  });
  if (!hesap) throw new Error("HB satış hesabı yok");
  const ad = (hesap.magazaAdi ?? "").toLowerCase();
  const kodlar = (
    await prisma.channelSku.findMany({ where: { channelAccountId: hesap.id, isActive: true }, select: { channelSku: true } })
  ).map((k) => k.channelSku);
  console.log(`HB aktif kod: ${kodlar.length} · mağaza adı: ${hesap.magazaAdi}`);

  type Satir = { sku: string; sira: number; satici: string; fiyat: number; liste: number | null };
  const satirlar: Satir[] = [];
  let hatali = 0;
  for (let i = 0; i < kodlar.length; i += hb.HB_BUYBOX_PARTI) {
    const parti = kodlar.slice(i, i + hb.HB_BUYBOX_PARTI);
    const s = await hb.apiGet(hb.UCLAR.buyboxSiralama(kimlik, parti), b);
    const dizi = s.tur === "VERI" ? (s.govde as { variants?: unknown }).variants : undefined;
    if (!Array.isArray(dizi)) {
      hatali += parti.length;
      continue;
    }
    for (const v of dizi as Record<string, unknown>[]) {
      for (const r of (Array.isArray(v.buyboxOrders) ? v.buyboxOrders : []) as Record<string, unknown>[]) {
        if (typeof r.price !== "number") continue;
        satirlar.push({ sku: String(v.sku), sira: Number(r.rank), satici: String(r.merchantName ?? ""), fiyat: r.price, liste: typeof r.originalPrice === "number" ? r.originalPrice : null });
      }
    }
  }
  console.log(`sorgulanamayan kod: ${hatali} · satıcı satırı: ${satirlar.length}`);

  const biz = satirlar.filter((r) => r.satici.toLowerCase() === ad);
  const bizIndirimli = biz.filter((r) => r.liste !== null && Math.abs(r.liste - r.fiyat) >= 0.01);
  const digerIndirimli = satirlar.filter((r) => r.satici.toLowerCase() !== ad && r.liste !== null && Math.abs(r.liste - r.fiyat) >= 0.01);
  console.log(`\nBİZİM satır: ${biz.length} · liste≠fiyat: ${bizIndirimli.length} · liste yok: ${biz.filter((r) => r.liste === null).length}`);
  console.log(`RAKİP satır: ${satirlar.length - biz.length} · liste≠fiyat: ${digerIndirimli.length}`);

  const oranlar = (l: Satir[]) => l.map((r) => ({ ...r, tl: r.liste! - r.fiyat, yuzde: ((r.liste! - r.fiyat) / r.liste!) * 100 }));
  console.log("\n── BİZİM indirimli satırlar (liste → müşteri · TL · %) ──");
  for (const r of oranlar(bizIndirimli)) console.log(`${r.sku}  sıra ${r.sira}  ${r.liste} → ${r.fiyat}  −${r.tl.toFixed(2)}  %${r.yuzde.toFixed(3)}`);
  const dagilim = new Map<string, number>();
  for (const r of oranlar(digerIndirimli)) dagilim.set(r.yuzde.toFixed(1), (dagilim.get(r.yuzde.toFixed(1)) ?? 0) + 1);
  console.log("\n── RAKİP indirim yüzdesi dağılımı (yuvarlanmış %) ──");
  console.log([...dagilim.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `%${k}×${n}`).join("  "));
  /* Aynı üründe birden çok satıcıda indirim varsa: yüzde mi tutar mı aynı? */
  const urunBazli = new Map<string, Satir[]>();
  for (const r of satirlar.filter((r) => r.liste !== null && Math.abs(r.liste - r.fiyat) >= 0.01)) urunBazli.set(r.sku, [...(urunBazli.get(r.sku) ?? []), r]);
  console.log("\n── Aynı üründe ≥2 indirimli satıcı (yüzde/tutar aynı mı) ──");
  let n = 0;
  for (const [sku, l] of urunBazli) {
    if (l.length < 2 || n++ >= 15) continue;
    console.log(sku + "  " + oranlar(l).map((r) => `${r.satici}: ${r.liste}→${r.fiyat} −${r.tl.toFixed(2)} %${r.yuzde.toFixed(2)}`).join(" | "));
  }

  console.log("\n── originalPrice bizim ilan fiyatımız mı (ilk 12 indirimli kod) ──");
  for (const r of bizIndirimli.slice(0, 12)) {
    const s = await hb.apiGet(hb.UCLAR.tekListing(kimlik, r.sku), b);
    const l = s.tur === "VERI" ? ((s.govde as { listings?: Record<string, unknown>[] }).listings ?? []).find((x) => String(x.hepsiburadaSku ?? "").toUpperCase() === r.sku.toUpperCase()) : undefined;
    console.log(`${r.sku}  buybox liste ${r.liste} · müşteri ${r.fiyat} · ilan price ${l?.price ?? "?"} · ilan alanları: ${l ? Object.keys(l).filter((k) => /price/i.test(k)).map((k) => `${k}=${JSON.stringify(l[k])}`).join(" ") : s.tur}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
