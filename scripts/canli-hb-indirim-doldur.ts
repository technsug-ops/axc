/**
 * ============================================================================
 *  K325-⑧b — HB İNDİRİMİ: ESKİ SATIŞLARA DOLDURMA (kullanıcı bulgusu 23.10.2026)
 * ----------------------------------------------------------------------------
 *  BETİK SINIFI: TEK_SEFERLIK — K325-⑧ `channelDiscountAmount`ı yalnız YENİ
 *  oluşan HB satışına yazıyor (`canli-hb-ice-aktar.ts` → `sale.create`). Ölçüldü
 *  23.10.2026: HB'nin BÜTÜN kalemlerinde alan boş — migration'dan beri yeni HB
 *  siparişi gelmedi, eskiler hiç doldurulmadı. Vaka 4168914629: liste 5.484 ·
 *  HB indirimi 659,88 · stopaj bizde 45,70 (liste fiyatından), HB'de 40,20
 *  (müşterinin ödediğinden). Hakedişi gelmiş satışı K325-⑦ zaten gerçek
 *  kesintiyle düzeltiyor; açık kalan, hakedişi HENÜZ gelmemiş satışlar.
 *  Bundan sonrası mekanizmada (yeni satış alanla doğar); bu betik bir kez koşar.
 *
 *  KAYNAK: HB'nin kendi sipariş detayı (resmî satıcı API'si, yalnız GET) —
 *  `hbDiscount.unitPrice.amount`, içe aktarmanın okuduğu ALANIN AYNISI.
 *  EŞLEŞTİRME: defterdeki birim fiyat = ödenen + HB indirimi (içe aktarmanın
 *  kurduğu taban); kuruşu tutmayan kalem YAZILMAZ, sayılır.
 *
 *  KÜME HÂLDEN: son `--gun` (varsayılan 60) günde satılmış, iptal edilmemiş,
 *  indirim alanı BOŞ kalemi olan HB satışı. İkinci koşum yalnız indirimsizleri
 *  (API 0 diyor, alan boş kalır) yeniden okur, yazmaz.
 *
 *  ÜÇ ŞART (anayasa «toplu yazım üç şartla koşar»):
 *   a) yazımdan ÖNCE anlık görüntü (Sale NET/durum + kalem NET/indirim + SaleFee);
 *   b) satış satış: indirim yazılır, kâr tazelenir; tazeleme düşerse indirim
 *      geri boşaltılır (tekrar koşulabilir) + iz `HB_INDIRIM_DOLDURMA`;
 *   c) kuru koşumda kâr GERİ ALINAN bir işlemde yeniden hesaplanır — STOPAJ ve
 *      ÖDEME GİDERİ dışında bir kesinti oynuyorsa satış YAZILMAZ, sayılır.
 *
 *      npx tsx scripts/canli-hb-indirim-doldur.ts                    (kuru koşum)
 *      npx tsx scripts/canli-hb-indirim-doldur.ts --yaz --anlik="<dosya>"
 *      npx tsx scripts/canli-hb-indirim-doldur.ts --geri-al --anlik="<dosya>"
 * ============================================================================
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma, parolayiTemizle } from "./canli-ortak";
import { UCLAR, apiGet, baslikKur, kimlikOku } from "./hb/istemci";

const IZINLI_KODLAR = new Set(["STOPAJ", "ODEME_GIDERI"]);
const para = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kurus = (n: number) => Math.round(n * 100);

class GeriAl extends Error {}

type Anlik = {
  alindi: string;
  satislar: {
    id: string;
    code: string | null;
    sale: Record<string, string | null>;
    kalemler: { id: string; net1Amount: string | null; net2Amount: string | null; profitStatus: string | null; channelDiscountAmount: string | null }[];
    ucretler: { saleItemId: string | null; code: string; amount: string; currency: string }[];
  }[];
};

async function main() {
  const YAZ = process.argv.includes("--yaz");
  const GERI = process.argv.includes("--geri-al");
  const anlikArg = process.argv.find((a) => a.startsWith("--anlik="))?.slice("--anlik=".length).replace(/^"|"$/g, "");
  const gunArg = Number(process.argv.find((a) => a.startsWith("--gun="))?.slice("--gun=".length) ?? "60");
  const GUN = Number.isInteger(gunArg) && gunArg > 0 && gunArg <= 400 ? gunArg : 60;
  if ((YAZ || GERI) && !anlikArg) {
    console.log("⛔ --anlik=\"<dosya>\" zorunlu (yazımda yazılır, geri almada okunur).");
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
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(betikAdresi(y.veri.ham)) });
  const { satisKarTazele, satisKarTazeleOnizle } = await import("../src/lib/kar-yeniden");
  const { izYaz } = await import("../src/lib/iz");

  try {
    if (GERI) {
      const anlik = JSON.parse(readFileSync(anlikArg!, "utf8")) as Anlik;
      console.log(`\nGERİ AL — ${anlik.satislar.length} satış · görüntü ${anlik.alindi}`);
      let geri = 0;
      for (const s of anlik.satislar) {
        await prisma.$transaction(async (tx) => {
          await tx.saleFee.deleteMany({ where: { saleId: s.id } });
          await tx.saleFee.createMany({
            data: s.ucretler.map((u) => ({ saleId: s.id, saleItemId: u.saleItemId, code: u.code, amount: u.amount, currency: u.currency as "TRY" | "EUR" })),
          });
          await tx.sale.update({ where: { id: s.id }, data: s.sale as never });
          for (const k of s.kalemler) {
            await tx.saleItem.update({
              where: { id: k.id },
              data: { net1Amount: k.net1Amount, net2Amount: k.net2Amount, profitStatus: k.profitStatus as never, channelDiscountAmount: k.channelDiscountAmount },
            });
          }
          await izYaz({ action: "HB_INDIRIM_DOLDURMA_GERI_AL", targetType: "Sale", targetId: s.id, userId: null, detail: JSON.stringify({ anlik: anlikArg, alindi: anlik.alindi }) }, tx);
        }, { timeout: 60_000 });
        geri++;
      }
      console.log(`✓ ${geri} satış görüntüdeki hâline döndü.\n`);
      return;
    }

    const k = kimlikOku();
    if (!k) {
      console.log("⛔ HB anahtarları okunamadı (.env.canli).");
      process.exitCode = 1;
      return;
    }
    const baslik = baslikKur(k);
    const simdi = new Date();
    const sinir = new Date(simdi.getTime() - GUN * 86_400_000);
    const adaylar = await prisma.sale.findMany({
      where: {
        iptalTarihi: null,
        soldAt: { gte: sinir },
        channelAccount: { channel: { code: "HEPSIBURADA" } },
        items: { some: { channelDiscountAmount: null } },
      },
      select: { id: true, code: true, net2Amount: true, items: { select: { id: true, quantity: true, unitPriceAmount: true, channelDiscountAmount: true } } },
      orderBy: { soldAt: "asc" },
    });
    console.log(`\nK325-⑧b HB İNDİRİMİ DOLDURMA — ${YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"} · ${simdi.toISOString()}`);
    console.log(`Aday (son ${GUN} gün, indirim alanı boş kalemi olan HB satışı) ${adaylar.length}`);

    type Plan = { saleId: string; code: string | null; atamalar: { itemId: string; indirim: number }[]; onceNet2: number; sonraNet2: number; onceStopaj: number; sonraStopaj: number };
    const planlar: Plan[] = [];
    const sayac = { indirimsiz: 0, detayYok: 0, eslesmeyen: 0, kodsuz: 0, engellenen: 0 };
    const engellenen: string[] = [];

    for (const s of adaylar) {
      if (!s.code) { sayac.kodsuz++; continue; }
      const d = await apiGet(UCLAR.siparisDetay(k, s.code), baslik);
      if (d.tur !== "VERI") { sayac.detayYok++; continue; }
      const apiKalemler = (((d.govde as Record<string, unknown>).items ?? []) as Record<string, unknown>[])
        .filter((x) => String(x.status) !== "Cancelled")
        .map((x) => {
          const odenen = Number((x.unitPrice as { amount?: unknown })?.amount);
          const ind = Number((x.hbDiscount as { unitPrice?: { amount?: unknown } })?.unitPrice?.amount ?? 0);
          return { birim: kurus(odenen + (Number.isFinite(ind) ? ind : 0)), indirim: Number.isFinite(ind) ? ind : 0 };
        });
      const atamalar: Plan["atamalar"] = [];
      let eslesmedi = false;
      for (const kalem of s.items.filter((x) => x.channelDiscountAmount === null)) {
        const birim = kurus(Number(kalem.unitPriceAmount.toString()));
        const uyan = [...new Set(apiKalemler.filter((a) => a.birim === birim).map((a) => kurus(a.indirim)))];
        if (uyan.length !== 1) { eslesmedi = true; continue; }
        if (uyan[0] > 0) atamalar.push({ itemId: kalem.id, indirim: uyan[0] / 100 });
      }
      if (eslesmedi) { sayac.eslesmeyen++; continue; }
      if (atamalar.length === 0) { sayac.indirimsiz++; continue; }

      /* ── c) kâr GERİ ALINAN işlemde yeniden hesaplanır; kapı ── */
      const eski = await prisma.sale.findUniqueOrThrow({ where: { id: s.id }, select: { fees: { select: { code: true, amount: true } } } });
      let sonuc: { net2: number | null; durum: string; yeniTop: Map<string, number> } | null = null;
      try {
        await prisma.$transaction(async (tx) => {
          for (const a of atamalar) await tx.saleItem.update({ where: { id: a.itemId }, data: { channelDiscountAmount: a.indirim.toFixed(4) } });
          const o = await satisKarTazeleOnizle(s.id, tx as never);
          if (o) {
            const yeniTop = new Map<string, number>();
            for (const kk of o.yeni.kalemler) for (const f of kk.kesintiler) yeniTop.set(f.code, (yeniTop.get(f.code) ?? 0) + f.tutar);
            for (const f of o.yeni.siparisKesintileri) yeniTop.set(f.code, (yeniTop.get(f.code) ?? 0) + f.tutar);
            sonuc = { net2: o.yeni.durum === "CALCULATED" ? o.yeni.net2 : null, durum: o.yeni.durum, yeniTop };
          }
          throw new GeriAl();
        }, { timeout: 60_000 });
      } catch (e) {
        if (!(e instanceof GeriAl)) throw e;
      }
      const r = sonuc as { net2: number | null; durum: string; yeniTop: Map<string, number> } | null;
      const eskiTop = new Map<string, number>();
      for (const f of eski.fees) eskiTop.set(f.code, (eskiTop.get(f.code) ?? 0) + Number(f.amount.toString()));
      if (!r || r.net2 === null || s.net2Amount === null) {
        sayac.engellenen++;
        engellenen.push(`${s.code} — durum ${r?.durum ?? "önizleme yok"}`);
        continue;
      }
      const oynayan = [...new Set([...eskiTop.keys(), ...r.yeniTop.keys()])].filter(
        (kod) => !IZINLI_KODLAR.has(kod) && kurus(eskiTop.get(kod) ?? 0) !== kurus(r.yeniTop.get(kod) ?? 0),
      );
      if (oynayan.length > 0) {
        sayac.engellenen++;
        engellenen.push(`${s.code} — başka kesinti oynuyor: ${oynayan.join(",")}`);
        continue;
      }
      planlar.push({
        saleId: s.id, code: s.code, atamalar,
        onceNet2: Number(s.net2Amount.toString()), sonraNet2: r.net2,
        onceStopaj: eskiTop.get("STOPAJ") ?? 0, sonraStopaj: r.yeniTop.get("STOPAJ") ?? 0,
      });
    }

    const top = (f: (p: Plan) => number) => planlar.reduce((t, p) => t + f(p), 0);
    console.log(`Yazılacak ${planlar.length} · indirimsiz (API 0, dokunulmaz) ${sayac.indirimsiz} · detay okunamayan ${sayac.detayYok} · fiyatı eşleşmeyen ${sayac.eslesmeyen} · kodsuz ${sayac.kodsuz} · ENGELLENEN ${sayac.engellenen}`);
    for (const e of engellenen.slice(0, 20)) console.log(`   ⛔ ${e}`);
    console.log(`STOPAJ önce ${para(top((p) => p.onceStopaj))} → sonra ${para(top((p) => p.sonraStopaj))}`);
    console.log(`NET-2  önce ${para(top((p) => p.onceNet2))} → sonra ${para(top((p) => p.sonraNet2))} · fark ${para(top((p) => p.sonraNet2 - p.onceNet2))}`);
    for (const p of planlar.slice(0, 12)) {
      console.log(`   ${p.code} · indirim ${p.atamalar.map((a) => para(a.indirim)).join("+")} · stopaj ${para(p.onceStopaj)} → ${para(p.sonraStopaj)} · NET-2 ${para(p.onceNet2)} → ${para(p.sonraNet2)}`);
    }

    if (!YAZ) {
      console.log("\nKURU KOŞUM — hiçbir şey yazılmadı.\n");
      return;
    }

    /* ── a) anlık görüntü — yazımdan ÖNCE ── */
    const yazi = (v: unknown) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : String(v));
    const satislar: Anlik["satislar"] = [];
    for (const p of planlar) {
      const s = await prisma.sale.findUniqueOrThrow({
        where: { id: p.saleId },
        select: {
          id: true, code: true, net1Amount: true, net2Amount: true, profitStatus: true, profitCurrency: true, calculatedAt: true,
          cargoCarrierId: true, cargoDesi: true, cargoAmount: true, cargoCurrency: true,
          items: { select: { id: true, net1Amount: true, net2Amount: true, profitStatus: true, channelDiscountAmount: true } },
          fees: { select: { saleItemId: true, code: true, amount: true, currency: true } },
        },
      });
      satislar.push({
        id: s.id,
        code: s.code,
        sale: {
          net1Amount: yazi(s.net1Amount), net2Amount: yazi(s.net2Amount), profitStatus: yazi(s.profitStatus), profitCurrency: yazi(s.profitCurrency),
          calculatedAt: yazi(s.calculatedAt), cargoCarrierId: yazi(s.cargoCarrierId), cargoDesi: yazi(s.cargoDesi), cargoAmount: yazi(s.cargoAmount), cargoCurrency: yazi(s.cargoCurrency),
        },
        kalemler: s.items.map((x) => ({ id: x.id, net1Amount: yazi(x.net1Amount), net2Amount: yazi(x.net2Amount), profitStatus: yazi(x.profitStatus), channelDiscountAmount: yazi(x.channelDiscountAmount) })),
        ucretler: s.fees.map((f) => ({ saleItemId: f.saleItemId, code: f.code, amount: f.amount.toString(), currency: f.currency })),
      });
    }
    mkdirSync(dirname(anlikArg!), { recursive: true });
    writeFileSync(anlikArg!, JSON.stringify({ alindi: new Date().toISOString(), satislar } satisfies Anlik, null, 1));
    if (!existsSync(anlikArg!) || (JSON.parse(readFileSync(anlikArg!, "utf8")) as Anlik).satislar.length !== planlar.length) {
      console.log("⛔ Anlık görüntü doğrulanamadı — YAZILMADI.");
      process.exitCode = 1;
      return;
    }
    console.log(`✓ anlık görüntü ${anlikArg} (${satislar.length} satış)`);

    /* ── b) satış satış ── */
    let yazilan = 0;
    let hata = 0;
    for (const [i, p] of planlar.entries()) {
      try {
        for (const a of p.atamalar) await prisma.saleItem.update({ where: { id: a.itemId }, data: { channelDiscountAmount: a.indirim.toFixed(4) } });
        if (!(await satisKarTazele(p.saleId, prisma))) throw new Error("kâr tazelenemedi");
        await izYaz({
          action: "HB_INDIRIM_DOLDURMA",
          targetType: "Sale",
          targetId: p.saleId,
          userId: null,
          detail: JSON.stringify({ kod: p.code, indirimler: p.atamalar, onceNet2: p.onceNet2, beklenenNet2: p.sonraNet2, eskiUcretler: satislar[i].ucretler, anlik: anlikArg }),
        }, prisma);
        yazilan++;
      } catch (e) {
        hata++;
        /* tekrar koşulabilirlik: indirim geri boşaltılır, satış bir sonraki koşumda yine aday olur */
        for (const a of p.atamalar) await prisma.saleItem.update({ where: { id: a.itemId }, data: { channelDiscountAmount: null } }).catch(() => undefined);
        console.log(`⛔ ${p.code} — ${parolayiTemizle(String((e as Error).message ?? e), y.veri.parola).replace(/\s+/g, " ")}`);
      }
    }
    console.log(`\n✓ ${yazilan} satış yazıldı · hata ${hata}. Doğrulama için kuru koşumu yeniden çalıştırın (Yazılacak 0 beklenir).\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.log("HATA", String((e as Error).message ?? e));
  process.exitCode = 1;
});
