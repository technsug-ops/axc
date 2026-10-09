import { readFileSync, writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { urunDesisiToplami } from "../src/lib/kargo/ty-nihai-desi";
import { KURESEL_DESI_ORTANCASI } from "../src/lib/kargo-kaynagi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  TAHMİNİ DESİ (`cargoDesi`) GEÇMİŞ ONARIMI — K326-④ (kullanıcı 09.10.2026)
 * ----------------------------------------------------------------------------
 *      Kuru:   npx tsx scripts/canli-tahmin-desi-onar.ts
 *      Yazım:  npx tsx scripts/canli-tahmin-desi-onar.ts --yaz --anlik="C:\…\oncesi.json"
 *      Geri:   npx tsx scripts/canli-tahmin-desi-onar.ts --geri
 *
 *  BETIK SINIFI: TEK_SEFERLIK — kural (`kargo-kaynagi.ts` `tazelemeDesileri`,
 *  1de1cce) bundan sonrasını doğru yazıyor; bu betik kural düzelmeden önce
 *  `cargoDesi`ye yanlış yazılmış / hiç yazılmamış değerleri ürün kartından
 *  doldurur. Kullanıcı kararı 09.10.2026: «geçmişi temizleyerek devam» →
 *  kapsam «hatalı 689 + boş 3.662».
 *
 *  ⭐ ÖLÇÜT (yeniden hesaplanabilir — yazım kapısı ve kuru koşum AYNI ölçüt):
 *  iptalsiz satış · ürün kartı desisi bilinir (Σ ürün desisi × adet, geçerli
 *  kalemler) · ve şunlardan biri:
 *    BOS      kayıt boş
 *    TARTIM   kayıt ≠ kart VE kayıt = kanalın tartımı (tazeleme ezmiş)
 *    KURESEL  kayıt ≠ kart VE kayıt = küresel ortanca (3)
 *  «Başka fark» (elle girilmiş olabilir) ve kartı boş olan DOKUNULMAZ.
 *  İkinci koşum 0 bulur: yazılan kayıt = kart olur ve ölçütten çıkar.
 *
 *  ⛔ NE DEĞİŞMEZ: kâr TAZELENMEZ — NET-1/NET-2, tahmini/gerçekleşen kargo,
 *  tartım aynen kalır (alan yalnız «ürün tahmini»dir; hesap tartımı önceler).
 *  Yazım sonrası doğrulama bunu anlık görüntüyle karşılaştırarak ÖLÇER.
 *  ⚠ BEDELİ BEYAN: kart desisi 26.09'da toplu güncellendi; eski satışa
 *  bugünün kart değeri yazılır (kullanıcı bunu kabul ederek seçti).
 *
 *  ⛔ TOPLU YAZIM ÜÇ ŞARTI: (a) `--anlik` zorunlu, yazımdan ÖNCE dosyaya;
 *  (b) 200'lük parçalar, her parça TEK işlem (zaman aşımı açıkça 120 sn) —
 *  parça ya tamamen yazılır ya hiç; betik kaldığı yerden devam eder;
 *  her satır `cargoDesi` HÂLÂ eski değerdeyse yazılır (yoksa parça geri
 *  alınır); (c) her satış eski/yeni değeri `AuditLog`a yazar
 *  (`TAHMIN_DESI_ONARIM`), aynı işlemin içinde.
 *  ⚠ GERİ ALMA İZE DAYANIR: eski değer (boş / tartım / 3) yazımdan sonra
 *  yeniden hesaplanamaz — iz satır başına küçük bir JSON'dur (kırpılma riski
 *  yok, bkz. 28.08 vakası), `--geri` yalnız değeri HÂLÂ yazdığımız olan
 *  satışı geri çevirir.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");
const ANLIK = process.argv.find((a) => a.startsWith("--anlik="))?.slice("--anlik=".length) ?? null;
const PARCA = 200;
const IZ = "TAHMIN_DESI_ONARIM";

type Grup = "BOS" | "TARTIM" | "KURESEL";
type Plan = {
  id: string; kod: string; kanal: string; grup: Grup;
  eski: number | null; yeni: number; tartim: number | null;
  net2: string | null; tahminiKargo: string | null; cargoAmount: string | null;
};

const sayi = (d: { toString(): string } | null) => (d === null ? null : Number(d.toString()));

async function main() {
  if (YAZ && !ANLIK) throw new Error("--yaz için --anlik=<dosya> zorunlu — hiçbir şey yazılmadı");
  if (YAZ && GERI) throw new Error("--yaz ve --geri birlikte verilemez");
  const y = canliYapilandirma();
  if (!y.tamam) throw new Error("canlı yapılandırma okunamadı");
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  try {
    if (GERI) return await geriAl(prisma);

    const plan = await planKur(prisma);
    const say = (g: Grup) => plan.filter((p) => p.grup === g).length;
    console.log(`\nTAHMİNİ DESİ ONARIMI · ${YAZ ? "⚠ YAZIM" : "KURU KOŞUM"}`);
    console.log(`  yazılacak ${plan.length} · boş ${say("BOS")} · tartım ezmiş ${say("TARTIM")} · küresel 3 ${say("KURESEL")}`);
    for (const k of [...new Set(plan.map((p) => p.kanal))].sort())
      console.log(`    ${k.padEnd(12)} ${plan.filter((p) => p.kanal === k).length}`);
    for (const p of plan.slice(0, 5)) console.log(`    örn ${p.kod} ${p.grup} ${p.eski} → ${p.yeni}`);
    if (!YAZ) { console.log("  KURU KOŞUM — hiçbir şey yazılmadı."); return; }

    writeFileSync(ANLIK!, JSON.stringify(plan, null, 1));
    const geriOku = JSON.parse(readFileSync(ANLIK!, "utf8")) as Plan[];
    if (geriOku.length !== plan.length) throw new Error("anlık görüntü doğrulanamadı — hiçbir şey yazılmadı");
    console.log(`  anlık görüntü → ${ANLIK} (${plan.length} satış, geri okundu)`);

    let yazilan = 0;
    for (let i = 0; i < plan.length; i += PARCA) {
      const parca = plan.slice(i, i + PARCA);
      await prisma.$transaction(
        async (tx) => {
          for (const p of parca) {
            const r = await tx.sale.updateMany({
              where: { id: p.id, cargoDesi: p.eski === null ? null : String(p.eski) },
              data: { cargoDesi: String(p.yeni) },
            });
            if (r.count !== 1) throw new Error(`${p.kod}: kayıt planlandıktan sonra değişmiş (count ${r.count}) — parça geri alındı`);
          }
          await tx.auditLog.createMany({
            data: parca.map((p) => ({
              action: IZ, targetType: "Sale", targetId: p.id, userId: null,
              detail: JSON.stringify({ kod: p.kod, grup: p.grup, eskiCargoDesi: p.eski, yeniCargoDesi: p.yeni, tartim: p.tartim, kaynak: "ürün kartı Σ desi × adet (K326-④)" }),
            })),
          });
        },
        { timeout: 120_000, maxWait: 20_000 },
      );
      yazilan += parca.length;
      console.log(`  … ${yazilan}/${plan.length}`);
    }

    /* ⛔ DOĞRULAMA — iz yazımın kanıtı değil, verinin kendisi karşılaştırılır. */
    const sonra = await prisma.sale.findMany({
      where: { id: { in: plan.map((p) => p.id) } },
      select: { id: true, cargoDesi: true, net2Amount: true, tahminiKargo: true, cargoAmount: true, kanalKargoDesi: true },
    });
    const harita = new Map(sonra.map((s) => [s.id, s]));
    let desiTutmayan = 0;
    let dokunulmamasiGereken = 0;
    for (const p of plan) {
      const s = harita.get(p.id);
      if (!s || sayi(s.cargoDesi) !== p.yeni) desiTutmayan++;
      if (!s || String(s.net2Amount) !== String(p.net2) || String(s.tahminiKargo) !== String(p.tahminiKargo) ||
          String(s.cargoAmount) !== String(p.cargoAmount) || sayi(s.kanalKargoDesi) !== p.tartim) dokunulmamasiGereken++;
    }
    const kalan = (await planKur(prisma)).length;
    console.log(`  ✓ YAZILAN ${yazilan} · desisi plana uymayan ${desiTutmayan} · NET/kargo/tartımı değişen ${dokunulmamasiGereken} · yeniden ölçümde kalan ${kalan}`);
    if (desiTutmayan || dokunulmamasiGereken || kalan) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

async function planKur(prisma: typeof import("../src/lib/prisma").prisma): Promise<Plan[]> {
  const satislar = await prisma.sale.findMany({
    where: { iptalTarihi: null },
    select: {
      id: true, code: true, cargoDesi: true, kanalKargoDesi: true, net2Amount: true, tahminiKargo: true, cargoAmount: true,
      channelAccount: { select: { channel: { select: { code: true } } } },
      items: { where: { kaldirildiAt: null }, select: { quantity: true, variant: { select: { product: { select: { desi: true } } } } } },
    },
  });
  const plan: Plan[] = [];
  for (const s of satislar) {
    const kart = urunDesisiToplami(s.items.map((k) => ({ adet: k.quantity, desi: sayi(k.variant.product.desi) })));
    if (kart === null) continue;
    const kayit = sayi(s.cargoDesi);
    const tartim = sayi(s.kanalKargoDesi);
    let grup: Grup | null = null;
    if (kayit === null) grup = "BOS";
    else if (kayit === kart) grup = null;
    else if (tartim !== null && kayit === tartim) grup = "TARTIM";
    else if (kayit === KURESEL_DESI_ORTANCASI) grup = "KURESEL";
    if (grup === null) continue;
    plan.push({
      id: s.id, kod: s.code ?? s.id, kanal: s.channelAccount.channel.code, grup, eski: kayit, yeni: kart, tartim,
      net2: s.net2Amount === null ? null : s.net2Amount.toString(),
      tahminiKargo: s.tahminiKargo === null ? null : s.tahminiKargo.toString(),
      cargoAmount: s.cargoAmount === null ? null : s.cargoAmount.toString(),
    });
  }
  return plan;
}

async function geriAl(prisma: typeof import("../src/lib/prisma").prisma) {
  const izler = await prisma.auditLog.findMany({ where: { action: IZ }, select: { targetId: true, detail: true }, orderBy: { createdAt: "asc" } });
  console.log(`\nTAHMİNİ DESİ ONARIMI · GERİ ALMA · iz ${izler.length}`);
  let cevrilen = 0;
  let degismis = 0;
  for (const iz of izler) {
    const d = JSON.parse(iz.detail ?? "{}") as { eskiCargoDesi: number | null; yeniCargoDesi: number; kod: string };
    const r = await prisma.sale.updateMany({
      where: { id: iz.targetId!, cargoDesi: String(d.yeniCargoDesi) },
      data: { cargoDesi: d.eskiCargoDesi === null ? null : String(d.eskiCargoDesi) },
    });
    if (r.count === 1) cevrilen++;
    else degismis++;
  }
  console.log(`  geri çevrilen ${cevrilen} · sonradan değiştiği için dokunulmayan ${degismis}`);
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, " ") : e);
  process.exitCode = 1;
});
