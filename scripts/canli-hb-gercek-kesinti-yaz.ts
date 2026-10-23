/**
 * ============================================================================
 *  K325-⑦ — HB GERÇEK KESİNTİ: ESKİ SATIŞLARIN YAZIMI (kullanıcı «yaz» 22.10.2026)
 * ----------------------------------------------------------------------------
 *  BETİK SINIFI: TEK_SEFERLIK — sipariş satırı 40 günden ESKİ HB satışlarının
 *  kârı hakedişteki gerçek kesintiyle bir kez yeniden hesaplanır; daha yenisini
 *  günlük HB hakediş çekimi kendisi tazeler (`hbGercekKesintiAdaylari`).
 *
 *  KÜME HÂLDEN (saklanan liste değil): kayıtlı döküm ≠ hakedişteki gerçek.
 *  İkinci koşum 0 bulur. Geri alma da aynı anlık görüntüden yapılır.
 *
 *  ÜÇ ŞART (anayasa «toplu yazım üç şartla koşar»):
 *   a) yazımdan ÖNCE anlık görüntü — Sale (NET · durum · kargo alanları) +
 *      SaleItem (NET · durum · oran) + SaleFee satırları → JSON dosyası;
 *   b) satır satır, tekrar koşulabilir — her satış kendi işleminde
 *      (`satisKarTazele`) + kendi izi (`HB_GERCEK_KESINTI_YAZIM`, eski değerlerle);
 *   c) BEKLENMEYEN DEĞİŞİM KAPISI — önizlemede STOPAJ · ÖDEME GİDERİ · HİZMET
 *      BEDELİ dışında bir kesinti ya da kargo alanı oynuyorsa satış YAZILMAZ,
 *      ayrı sayılır.
 *
 *      npx tsx scripts/canli-hb-gercek-kesinti-yaz.ts                 (kuru koşum)
 *      npx tsx scripts/canli-hb-gercek-kesinti-yaz.ts --yaz --anlik="<dosya>"
 *      npx tsx scripts/canli-hb-gercek-kesinti-yaz.ts --geri-al --anlik="<dosya>"
 * ============================================================================
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma, parolayiTemizle } from "./canli-ortak";

const YAKIN_GUN = 40;
const IZINLI_KODLAR = new Set(["STOPAJ", "ODEME_GIDERI", "HIZMET_BEDELI"]);
const para = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kurus = (n: number) => Math.round(n * 100);

type Anlik = {
  alindi: string;
  satislar: {
    id: string;
    code: string | null;
    sale: Record<string, string | null>;
    kalemler: { id: string; net1Amount: string | null; net2Amount: string | null; profitStatus: string | null; commissionRate: string | null }[];
    ucretler: { saleItemId: string | null; code: string; amount: string; currency: string }[];
  }[];
};

async function main() {
  const YAZ = process.argv.includes("--yaz");
  const GERI = process.argv.includes("--geri-al");
  const anlikArg = process.argv.find((a) => a.startsWith("--anlik="))?.slice("--anlik=".length).replace(/^"|"$/g, "");
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
  const { hbGercekKesintiAdaylari } = await import("../src/lib/hakedis/gercek-kesinti-tazele");
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
            await tx.saleItem.update({ where: { id: k.id }, data: { net1Amount: k.net1Amount, net2Amount: k.net2Amount, profitStatus: k.profitStatus as never, commissionRate: k.commissionRate } });
          }
          await izYaz({ action: "HB_GERCEK_KESINTI_GERI_AL", targetType: "Sale", targetId: s.id, userId: null, detail: JSON.stringify({ anlik: anlikArg, alindi: anlik.alindi }) }, tx);
        }, { timeout: 60_000 });
        geri++;
      }
      console.log(`✓ ${geri} satış görüntüdeki hâline döndü.\n`);
      return;
    }

    const simdi = new Date();
    const hepsi = await hbGercekKesintiAdaylari(prisma, { simdi, sonGun: null });
    const yakin = new Set((await hbGercekKesintiAdaylari(prisma, { simdi, sonGun: YAKIN_GUN })).map((a) => a.saleId));
    /* K325-⑩ (kullanıcı «yaz» 24.10.2026): çekim 22.10'dan beri zaman aşımına düştüğü
       için son 40 günün birikmişi tazelenmedi. `--yakin-dahil` onları da alır; kapı,
       anlık görüntü ve geri alma aynı. Çift tazeleme zararsız (aynı gerçek değeri yazar). */
    const YAKIN_DAHIL = process.argv.includes("--yakin-dahil");
    const eskiler = YAKIN_DAHIL ? hepsi : hepsi.filter((a) => !yakin.has(a.saleId));
    console.log(`\nK325-⑦ ${YAKIN_DAHIL ? "TÜM ADAY" : "ESKİ SATIŞ"} YAZIMI — ${YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"} · ${simdi.toISOString()}`);
    console.log(`Aday (döküm ≠ gerçek) ${hepsi.length} · son ${YAKIN_GUN} gün (çekim tazeler) ${yakin.size} · YAZIM KÜMESİ ${eskiler.length}`);

    /* ── c) beklenmeyen değişim kapısı + NET önce/sonra ── */
    const yazilacak: { saleId: string; code: string | null; onceNet2: number; sonraNet2: number }[] = [];
    const engellenen: { code: string | null; sebep: string }[] = [];
    for (const a of eskiler) {
      const s = await prisma.sale.findUniqueOrThrow({
        where: { id: a.saleId },
        select: { cargoCarrierId: true, cargoDesi: true, cargoAmount: true, net2Amount: true, fees: { select: { code: true, amount: true } } },
      });
      const o = await satisKarTazeleOnizle(a.saleId, prisma);
      if (!o) { engellenen.push({ code: a.code, sebep: "önizleme yok" }); continue; }
      const eskiTop = new Map<string, number>();
      for (const f of s.fees) eskiTop.set(f.code, (eskiTop.get(f.code) ?? 0) + Number(f.amount.toString()));
      const yeniTop = new Map<string, number>();
      for (const k of o.yeni.kalemler) for (const f of k.kesintiler) yeniTop.set(f.code, (yeniTop.get(f.code) ?? 0) + f.tutar);
      for (const f of o.yeni.siparisKesintileri) yeniTop.set(f.code, (yeniTop.get(f.code) ?? 0) + f.tutar);
      const oynayan = [...new Set([...eskiTop.keys(), ...yeniTop.keys()])].filter(
        (k) => !IZINLI_KODLAR.has(k) && kurus(eskiTop.get(k) ?? 0) !== kurus(yeniTop.get(k) ?? 0),
      );
      if (oynayan.length > 0) { engellenen.push({ code: a.code, sebep: `başka kesinti oynuyor: ${oynayan.join(",")}` }); continue; }
      if (o.yeni.durum !== "CALCULATED" || s.net2Amount === null) { engellenen.push({ code: a.code, sebep: `durum ${o.yeni.durum}` }); continue; }
      yazilacak.push({ saleId: a.saleId, code: a.code, onceNet2: Number(s.net2Amount.toString()), sonraNet2: o.yeni.net2 });
    }
    const once = yazilacak.reduce((t, x) => t + x.onceNet2, 0);
    const sonra = yazilacak.reduce((t, x) => t + x.sonraNet2, 0);
    console.log(`Yazılacak ${yazilacak.length} · ENGELLENEN ${engellenen.length}`);
    for (const e of engellenen.slice(0, 20)) console.log(`   ⛔ ${e.code} — ${e.sebep}`);
    console.log(`NET-2 önce ${para(once)} → sonra ${para(sonra)} · fark ${para(sonra - once)}`);

    if (!YAZ) {
      console.log("\nKURU KOŞUM — hiçbir şey yazılmadı.\n");
      return;
    }

    /* ── a) anlık görüntü — yazımdan ÖNCE, dosyaya; yazılamazsa durulur ── */
    const satislar: Anlik["satislar"] = [];
    for (const x of yazilacak) {
      const s = await prisma.sale.findUniqueOrThrow({
        where: { id: x.saleId },
        select: {
          id: true, code: true, net1Amount: true, net2Amount: true, profitStatus: true, profitCurrency: true, calculatedAt: true,
          cargoCarrierId: true, cargoDesi: true, cargoAmount: true, cargoCurrency: true,
          items: { select: { id: true, net1Amount: true, net2Amount: true, profitStatus: true, commissionRate: true } },
          fees: { select: { saleItemId: true, code: true, amount: true, currency: true } },
        },
      });
      const yazi = (v: unknown) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : String(v));
      satislar.push({
        id: s.id,
        code: s.code,
        sale: {
          net1Amount: yazi(s.net1Amount), net2Amount: yazi(s.net2Amount), profitStatus: yazi(s.profitStatus), profitCurrency: yazi(s.profitCurrency),
          calculatedAt: yazi(s.calculatedAt), cargoCarrierId: yazi(s.cargoCarrierId), cargoDesi: yazi(s.cargoDesi), cargoAmount: yazi(s.cargoAmount), cargoCurrency: yazi(s.cargoCurrency),
        },
        kalemler: s.items.map((k) => ({ id: k.id, net1Amount: yazi(k.net1Amount), net2Amount: yazi(k.net2Amount), profitStatus: yazi(k.profitStatus), commissionRate: yazi(k.commissionRate) })),
        ucretler: s.fees.map((f) => ({ saleItemId: f.saleItemId, code: f.code, amount: f.amount.toString(), currency: f.currency })),
      });
    }
    mkdirSync(dirname(anlikArg!), { recursive: true });
    writeFileSync(anlikArg!, JSON.stringify({ alindi: new Date().toISOString(), satislar } satisfies Anlik, null, 1));
    if (!existsSync(anlikArg!) || (JSON.parse(readFileSync(anlikArg!, "utf8")) as Anlik).satislar.length !== yazilacak.length) {
      console.log("⛔ Anlık görüntü doğrulanamadı — YAZILMADI.");
      process.exitCode = 1;
      return;
    }
    console.log(`✓ anlık görüntü ${anlikArg} (${satislar.length} satış)`);

    /* ── b) satır satır ── */
    let yazilan = 0;
    let hata = 0;
    for (const [i, x] of yazilacak.entries()) {
      try {
        if (await satisKarTazele(x.saleId, prisma)) {
          await izYaz({
            action: "HB_GERCEK_KESINTI_YAZIM",
            targetType: "Sale",
            targetId: x.saleId,
            userId: null,
            detail: JSON.stringify({ kod: x.code, onceNet2: x.onceNet2, beklenenNet2: x.sonraNet2, eskiUcretler: satislar[i].ucretler, anlik: anlikArg }),
          }, prisma);
          yazilan++;
        }
      } catch (e) {
        hata++;
        console.log(`⛔ ${x.code} — ${parolayiTemizle(String((e as Error).message ?? e), y.veri.parola).replace(/\s+/g, " ")}`);
      }
    }
    console.log(`\n✓ ${yazilan} satış yazıldı · hata ${hata}. Doğrulama için kuru koşumu yeniden çalıştırın (ESKİ 0 beklenir).\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.log("HATA", String((e as Error).message ?? e));
  process.exitCode = 1;
});
