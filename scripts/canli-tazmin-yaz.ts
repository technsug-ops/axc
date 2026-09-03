/** BETIK SINIFI: TEK_SEFERLIK — tanzim_v2'nin 13 siparisini tazminatli bicime cevirir; dosya md5 kilidi. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  TAZMİN YAZIMI — 13 SİPARİŞ: HASARLI İADE + KDV'Lİ TAZMİNAT TAHSİLATI
 * ----------------------------------------------------------------------------
 *      npm run canli:tazmin-yaz             → KURU KOŞUM
 *      npm run canli:tazmin-yaz -- --uygula → YAZAR
 *
 *  ── YETKİ — HALİL BEYANLARI ─────────────────────────────────────────────
 *  03.09: "İade ürünlerde sattığın gibi almamışsın, dava açmışsın, parayı
 *  tahsil etmişsin." · 04.09: "Ürün alış fiyatı giriyorum ve tazmin yatan
 *  fiyatı satış fiyatına giriyorum; komisyon/kargo/diğer 0; alışla tazmin
 *  arasındaki fark kâr; TAZMİN FATURALI → KDV'Lİ."
 *
 *  ── NE DEĞİŞİYOR ────────────────────────────────────────────────────────
 *  Bu 13 sipariş dün iade_v2 turunda SAĞLAM iade yazılmıştı (maliyet geri
 *  geldi). Gerçek: mal satılamaz geldi (maliyet YANAR), kanal tazminat
 *  ödedi (KDV'li gelir). Düzeltme:
 *   1. Dünkü Return SİLİNİR (bu betiklerin dünkü çıktısı; stok hareketi
 *      YAZMAMIŞTI — silmeden önce bu ÖLÇÜLÜR, hareketli Return SİLİNMEZ).
 *   2. Motorla yeniden: hasarlı (saglamAdet 0) + `tazminatTahsilati`
 *      (motora 04.09'da eklendi; 5 değer ölçütü + 2 mutasyon kanıtlı) +
 *      tarihsel kip (stok sayımca kapalı) + dönem ısrarı.
 *   3. `Compensation` SETTLED kaydı — tazminat modülünde tarihçe + talepsiz
 *      hasar rozeti sussun (karşı taraf: kanalın Supplier kaydı).
 *
 *  ── TEKRAR KOŞULABİLİRLİK ───────────────────────────────────────────────
 *  Ölçüt: satışın Return'ünde TAZMINAT_TAHSILATI satırı var mı — varsa
 *  o sipariş atlanır. Liste tutulmaz.
 * ============================================================================
 */

const TZ = "C:/Users/yapra/Downloads/tanzim_v2.xlsx";
const TZ_MD5 = "0c325a5a1c60dfdedf80e0370805c7f3";
const V1 = "C:/Users/yapra/Downloads/iade (1).xlsx";
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
  const { iadeKaydet } = await import("../src/lib/iade");

  const ham = readFileSync(TZ);
  const md5 = createHash("md5").update(ham).digest("hex");
  console.log("=".repeat(96));
  console.log(`  TAZMİN YAZIMI · KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "KURU KOŞUM"}`);
  console.log(`  dosya ${TZ.split("/").pop()} · md5 ${md5}`);
  console.log("=".repeat(96));
  if (md5 !== TZ_MD5) {
    console.log("\n⛔ MD5 TUTMUYOR — baz tanzim dosyası bu değil. ÇIKILDI.\n");
    process.exitCode = 1;
    return;
  }

  const sf = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sf[0];
  const bas = sayfa.data[0].map((h) => metne(h));
  const K = (a: string) => bas.findIndex((h) => anahtarla(h) === anahtarla(a));
  const kol = { sip: K("Sipariş Numarası"), tahsilat: K("ÜRÜN LİSTE FİYATI"),
    alis: K("ÜRÜN ALIŞ FİYATI") };
  type Tz = { tahsilat: number; alis: number };
  const tanzim = new Map<string, Tz>();
  for (let i = 1; i < sayfa.data.length; i += 1) {
    const r = sayfa.data[i];
    const sip = metne(r[kol.sip]).replace(/\s+/g, "");
    if (sip === "") continue;
    tanzim.set(sip, { tahsilat: num(r[kol.tahsilat]), alis: num(r[kol.alis]) });
  }
  console.log(`\n① TANZİM DOSYASI: ${tanzim.size} sipariş`);

  /* V1 zenginlestirme (gelis + kargo) — iade_v2 turundaki desenle */
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
    v1map.set(sip, { geldigi: metne(r[vGel]) || eski?.geldigi || "",
      kargo: (eski?.kargo ?? 0) + num(r[vKar]) });
  }

  const satislar = await prisma.sale.findMany({
    where: { code: { in: [...tanzim.keys()] } },
    select: { id: true, code: true, soldAt: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      returns: { select: { id: true, note: true, net2Amount: true,
        fees: { select: { code: true } },
        items: { select: { id: true,
          _count: { select: { stockMovements: true } } } } } },
      items: { select: { id: true, quantity: true } } },
  });

  /** Karşı taraf: kanalın Supplier kaydı (pazaryerleri Supplier listesinde). */
  const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
  const supplierBul = (kanal: string) =>
    suppliers.find((s) => anahtarla(s.name).includes(anahtarla(kanal).slice(0, 5)))?.id ?? null;

  console.log(`② DEFTER: ${satislar.length} satış bulundu\n`);
  type Is = { s: (typeof satislar)[number]; tz: Tz; eskiReturnId: string | null };
  const isler: Is[] = [];
  for (const s of satislar) {
    const kod = s.code!.replace(/\s+/g, "");
    const tz = tanzim.get(kod)!;
    const r = s.returns[0];
    const zaten = s.returns.some((x) => x.fees.some((f) => f.code === "TAZMINAT_TAHSILATI"));
    const hareketli = r?.items.some((it) => it._count.stockMovements > 0) ?? false;
    console.log(`   ${kod.padEnd(13)} tahsilat ₺${p2(tz.tahsilat).padStart(10)}` +
      ` alış ₺${p2(tz.alis).padStart(10)} · iade ${s.returns.length}` +
      ` (${r ? (r.note ?? "").slice(0, 28) : "—"})` +
      (zaten ? " · ZATEN TAZMİNLİ" : "") + (hareketli ? " · ⛔ STOK HAREKETLİ" : ""));
    if (zaten) continue;
    if (s.returns.length > 1) { console.log("      ⛔ birden çok iade — elle bakılacak"); continue; }
    if (hareketli) { console.log("      ⛔ iadesi stok yazmış — SİLİNMEZ, elle bakılacak"); continue; }
    isler.push({ s, tz, eskiReturnId: r?.id ?? null });
  }
  const netTahsilat = isler.reduce((a, x) => a + x.tz.tahsilat, 0);
  console.log(`\n③ PLAN: ${isler.length} sipariş yeniden yazılacak · tahsilat toplamı ₺${p2(netTahsilat)}`);

  if (!UYGULA) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --uygula\n");
    await prisma.$disconnect();
    return;
  }

  let yazilan = 0, hata = 0;
  const eskiler: string[] = [];
  for (const is_ of isler) {
    try {
      if (is_.eskiReturnId) {
        /** Dünkü sağlam-iade SİLİNİR (stok hareketi YOK — yukarıda ölçüldü).
         *  Cascade: ReturnItem + ReturnFee. Karar izde. */
        await prisma.return.delete({ where: { id: is_.eskiReturnId } });
        eskiler.push(is_.eskiReturnId);
      }
      const zengin = v1map.get(is_.s.code!.replace(/\s+/g, ""));
      const geldigi = zengin?.geldigi && /^\d{4}-\d{2}-\d{2}$/.test(zengin.geldigi)
        ? zengin.geldigi : "";
      const iadeId = await iadeKaydet({
        saleId: is_.s.id, code: null, returnType: "NORMAL",
        occurredAt: geldigi !== ""
          ? new Date(geldigi + "T12:00:00.000Z") : new Date(is_.s.soldAt),
        note: "tanzim_v2 baz yazimi (Halil 04.09.2026): satildigi gibi gelmedi — " +
          "hasarli + KDV'li tazminat tahsilati" +
          (geldigi === "" ? " · gelis bilinmiyor, satis tarihi (beyan)" : ""),
        userId: null, degisimTeslimTarihi: null,
        iadeKargosu: zengin && zengin.kargo > 0 ? zengin.kargo : null,
        yenidenGonderimKargosu: null, ceza: null, cezaNotu: null,
        stokYazilmaz: { gerekce:
          "V2 baz: iade 27.08 sayimindan once; stok sayimca kapatildi. " +
          "Hasarli mal zaten stoga girmezdi." },
        tazminatTahsilati: is_.tz.tahsilat,
        donemIsrari: { onaylandi: true, sebep: "GEC_GIRILEN_KAYIT",
          aciklama: "tanzim_v2 baz — gercekten olmus tazminli iade deftere gec giriliyor." },
        kalemler: is_.s.items.map((it) => ({
          saleItemId: it.id, iadeAdedi: it.quantity,
          /** ⭐ HASARLI: satildigi gibi gelmedi, maliyet YANAR — tazminat karsilar. */
          saglamAdet: 0, hasarliAdet: it.quantity,
          hasarNotu: "tazmin: satildigi gibi gelmedi (Halil beyani)",
          locationId: null, exchangeVariantId: null,
        })),
      });
      /* Compensation SETTLED — tazminat modulunde tarihce + rozet sussun */
      const iadeKalem = await prisma.returnItem.findFirst({
        where: { returnId: iadeId }, select: { id: true } });
      const supplierId = supplierBul(is_.s.channelAccount.channel.name);
      if (iadeKalem && supplierId) {
        await prisma.compensation.create({ data: {
          supplierId, returnItemId: iadeKalem.id,
          quantity: is_.s.items.reduce((t, it) => t + it.quantity, 0),
          amount: String(is_.tz.tahsilat), currency: "TRY",
          status: "SETTLED",
          occurredAt: geldigi !== "" ? new Date(geldigi + "T12:00:00.000Z")
            : new Date(is_.s.soldAt),
          note: "tanzim_v2 baz: dava acildi, tahsil edildi (Halil 03-04.09.2026). Faturali/KDV'li." } });
      } else if (iadeKalem) {
        console.log(`   ⚠ ${is_.s.code}: kanal Supplier kaydi yok — Compensation ACILMADI (beyan).`);
      }
      yazilan += 1;
    } catch (e) {
      hata += 1;
      console.log(`   ⛔ ${is_.s.code} — ${(e as Error).message.replace(/\n/g, " ").slice(-150)}`);
    }
  }
  /* dogrulama */
  const yeniler = await prisma.return.findMany({
    where: { note: { contains: "tanzim_v2 baz yazimi" } },
    select: { net2Amount: true } });
  const etki = yeniler.reduce((a, r) =>
    a + (r.net2Amount === null ? 0 : Number(r.net2Amount.toString())), 0);
  const stok = await prisma.stockMovement.count({
    where: { returnItem: { return: { note: { contains: "tanzim_v2 baz yazimi" } } } } });
  console.log(`\n④ YAZIM  yazılan ${yazilan} · hata ${hata} · silinen eski iade ${eskiler.length}`);
  console.log(`   ⭐ MOTORUN YAZDIĞI NET-2 etkisi toplamı: ₺${p2(etki)} (${yeniler.length} kayıt)`);
  console.log(`   ⭐ STOK HAREKETİ: ${stok} (0 OLMALI)`);
  if (stok !== 0) process.exitCode = 1;
  await prisma.auditLog.create({
    data: {
      action: "TAZMIN_YAZILDI", targetType: "Return", targetId: "tanzim-v2-20260904",
      detail: JSON.stringify({ dosya: TZ.split("/").pop(), md5, yazilan, hata,
        silinenEskiIadeler: eskiler,
        net2EtkisiToplami: etki.toFixed(2), stokHareketi: stok,
        beyan: "Halil 03-04.09.2026: tazmin faturali/KDV'li; hasarli mal, maliyet yanar, tazminat karsilar",
        geriAlmaOlcutu: "Return.note iceren 'tanzim_v2 baz yazimi'" }),
    },
  });
  console.log(`   iz: AuditLog → TAZMIN_YAZILDI\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
