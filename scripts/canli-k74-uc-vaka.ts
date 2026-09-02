/**
 * ============================================================================
 *  K74 — ② ④ ⑨ ÜÇ VAKA · KURU KOŞUM · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:k74-uc-vaka
 *
 *  BETIK SINIFI: TEK_SEFERLIK — Halil'in on vakasının kalan üçü.
 *  ⛔ HİÇBİR ŞEY YAZMAZ; yazma bayrağı YOKTUR. TY tarafında tek çağrı
 *  noktası `scripts/ty/istemci.ts` ve o modül YALNIZ `GET` bilir.
 *
 *  _Halil şartnamesi 02.09: "② 4120311526 → K136 borusu · ④ ₺1.216,87
 *  tazminat · ⑨ 10559161422 ters kayıt planı (silme yok, iz kalır) —
 *  kuru koşum. Üçü tek onay sayfasında."_
 *
 *  ── ⚠ ÜÇÜ AYRI SORU SORUYOR, TEK RAPORDA AMA AYRI HÜKÜMLE ──────────────
 *    ② STOK ARİTMETİĞİ  — iade yazılırsa net stok 1 olur, Halil "yok" diyor
 *    ④ KARŞI TARAF      — tazminatı kim ödüyor, şema onu taşıyor mu
 *    ⑨ KAPSAM           — siparişin tamamı mı, bir kalemi mi
 *
 *  ⛔ VE HİÇBİRİ "YAZ" DEMİYOR. Rapor kararı HAZIRLAR, vermez.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { UCLAR, apiGet, baslikKur, kimlikOku } from "./ty/istemci";
import { kalemMaliyeti } from "../src/lib/kalem-maliyeti";

/** ② teslim edilmedi denen sipariş · ⑨ mükerrer denen sipariş. */
const VAKA_2 = "4120311526";
const VAKA_4 = "4673224319";
const VAKA_9 = "10559161422";
const VAKA_2_VARYANT = "axcali1633";
/** ④ dosyadaki tazmin satırı. */
const TAZMIN_TUTARI = 1216.87;

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function gun(d: Date | null): string {
  return d === null ? "—" : d.toISOString().slice(0, 10);
}
/**
 * ⛔ MALİYET GÖVDENİN KENDİSİNE SORULUR — YENİDEN YAZILMAZ.
 *
 * İlk yazımda `Math.abs(quantityDelta) × birim` toplamıştım. **Yanlış.**
 * `kalemMaliyeti` İŞARETLİ topluyor (`toplam -= birim × quantityDelta`):
 * ters/ayna hareket maliyeti NETLER, artırmaz. `Math.abs` ile ⑨'un ikinci
 * kalemi "₺1.398 maliyet" göründü — oysa iki hareket birbirini götürüyor.
 * _(Anayasa: "ikinci bir hesap yazsaydım biri değişince öteki sessizce
 * ayrışır" — ve bu oturumda aynı `Math.abs` tuzağına bir kez daha düşüldü.)_
 */
function maliyetiSor(
  har: {
    quantityDelta: number;
    unitCostAmount: unknown;
    unitCostCurrency: string | null;
  }[],
) {
  return kalemMaliyeti(
    har.map((h) => ({
      quantityDelta: h.quantityDelta,
      birimMaliyet: h.unitCostAmount === null ? null : String(h.unitCostAmount),
      birimMaliyetParaBirimi: h.unitCostCurrency,
    })),
  );
}

function oku(x: unknown, yol: string[]): unknown {
  let g: unknown = x;
  for (const p of yol) {
    if (g === null || typeof g !== "object") return undefined;
    g = (g as Record<string, unknown>)[p];
  }
  return g;
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

  console.log("=".repeat(88));
  console.log("  K74 — ② ④ ⑨ KURU KOŞUM (salt okuma · hiçbir şey yazılmaz)");
  console.log("=".repeat(88));

  /* ════════════════════════════════════════════════════════════════════════
   *  ② 4120311526 — İADE YAZILIRSA STOK 1 OLUYOR, HALİL "YOK" DİYOR
   * ────────────────────────────────────────────────────────────────────────
   *  ⛔ SORU İKİ KATMANLI:
   *    (a) kanal bu siparişte gerçekten iade/teslim edilmedi diyor mu?
   *    (b) diyorsa, iade yazımı stoğu 1'e çıkarır — o 1 adet NEREDE?
   *  (a) cevaplanmadan (b) yazılmaz; ama (a) "evet" olsa bile (b) açık
   *  kalırsa yazım yine DURUR: sistem, rafta olmayan bir malı stoğa koyamaz.
   *  _(Anayasa: "fiziksel sayım son sözdür".)_
   * ══════════════════════════════════════════════════════════════════════ */
  console.log("\n" + "─".repeat(88));
  console.log(`② ${VAKA_2} — "teslim edilmedi, stoğa girdi, sonra satıldı"`);
  console.log("─".repeat(88));

  const s2 = await prisma.sale.findFirst({
    where: { code: VAKA_2 },
    select: {
      id: true,
      soldAt: true,
      iptalTarihi: true,
      cargoAmount: true,
      profitStatus: true,
      net2Amount: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: {
        select: {
          id: true,
          quantity: true,
          unitPriceAmount: true,
          variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
        },
      },
    },
  });
  if (s2 === null) {
    console.log("  ⛔ SATIŞ DEFTERDE YOK — ÖLÇÜM YOK.");
  } else {
    console.log(
      `  satış: ${gun(s2.soldAt)} · ${s2.channelAccount.channel.name}` +
        ` · iptal: ${s2.iptalTarihi === null ? "hayır" : gun(s2.iptalTarihi)}` +
        ` · kâr: ${s2.profitStatus}`,
    );
    console.log(
      `  kargo: ${s2.cargoAmount === null ? "⛔ YOK" : "₺" + para(Number(s2.cargoAmount.toString()))}` +
        `   (Halil ₺94,20 diyor)`,
    );
    for (const k of s2.items) {
      console.log(
        `  kalem: ${k.variant.sku} × ${k.quantity} · ` +
          `₺${para(Number(k.unitPriceAmount.toString()))} · ${k.variant.product.name.slice(0, 40)}`,
      );
    }
    const iade2 = await prisma.return.findFirst({
      where: { sale: { code: VAKA_2 } },
      select: { id: true, code: true },
    });
    const bildirim2 = await prisma.returnNotice.findFirst({
      where: { sale: { code: VAKA_2 } },
      select: { id: true, reason: true },
    });
    console.log(
      `  defterde iade: ${iade2 === null ? "⛔ YOK" : iade2.code}` +
        ` · bildirim: ${bildirim2 === null ? "YOK" : bildirim2.reason}`,
    );
  }

  /** (a) KANAL NE DİYOR — K136 borusunun aynısı: claims ucu. */
  console.log("\n  (a) KANAL NE DİYOR — TY claims");
  const k = kimlikOku();
  if (k === null) {
    console.log("     ⛔ TY kimliği okunamadı — ÖLÇÜLEMEDİ ('yol yok' DEĞİL).");
  } else if (!/^\d+$/.test(VAKA_2)) {
    console.log("     ⏭ ATLANDI — sipariş no TY biçiminde değil.");
  } else {
    const baslik = baslikKur(k);
    let bulundu: unknown = null;
    let tarananSayfa = 0;
    for (let sayfa = 0; sayfa < 40; sayfa++) {
      const c = await apiGet(UCLAR.iadeler(k.saticiId, sayfa, 50), baslik, 90_000);
      if (c.tur !== "VERI") {
        console.log(`     ⛔ API: ${c.tur} — ÖLÇÜM YARIM (sayfa ${sayfa})`);
        break;
      }
      tarananSayfa = sayfa + 1;
      const g = c.govde as Record<string, unknown>;
      const dizi = Array.isArray(g.content) ? (g.content as unknown[]) : [];
      if (dizi.length === 0) break;
      const esles = dizi.find(
        (x) => String(oku(x, ["orderNumber"]) ?? "").trim() === VAKA_2,
      );
      if (esles !== undefined) {
        bulundu = esles;
        break;
      }
      const tp = typeof g.totalPages === "number" ? g.totalPages : null;
      if (tp !== null && sayfa + 1 >= tp) break;
    }
    if (bulundu === null) {
      console.log(
        `     ⛔ ${tarananSayfa} sayfada BULUNAMADI — bu, "iade yok" DEMEK` +
          " DEĞİL: claims ufku 2023-10 (K136b) ve kapsama %99,1.",
      );
      console.log(
        "     → ② için kanal tarafı KANIT YOK. Halil'in beyanı tek kaynak.",
      );
    } else {
      const kalemler = oku(bulundu, ["items"]);
      console.log(`     ⭐ claims kaydı BULUNDU · durum: ${String(oku(bulundu, ["status"]))}`);
      if (Array.isArray(kalemler)) {
        for (const it of kalemler) {
          const ci = oku(it, ["claimItems"]);
          const n = Array.isArray(ci) ? ci.length : 0;
          const sebep = Array.isArray(ci) && n > 0
            ? String(oku(ci[0], ["customerClaimItemReason", "code"]) ?? "—")
            : "—";
          console.log(`        kalem × ${n} · sebep kodu: ${sebep}`);
        }
      }
    }
  }

  /** (b) STOK ARİTMETİĞİ — iade yazılırsa ne olur? */
  console.log(`\n  (b) STOK ARİTMETİĞİ — ${VAKA_2_VARYANT}`);
  const v2 = await prisma.productVariant.findFirst({
    where: { sku: VAKA_2_VARYANT },
    select: { id: true, product: { select: { name: true } } },
  });
  if (v2 === null) {
    console.log(`     ⛔ ${VAKA_2_VARYANT} DEFTERDE YOK — ÖLÇÜM YOK.`);
  } else {
    const har = await prisma.stockMovement.findMany({
      where: { variantId: v2.id },
      select: {
        type: true,
        quantityDelta: true,
        occurredAt: true,
        note: true,
        saleItem: { select: { sale: { select: { code: true } } } },
      },
      orderBy: { occurredAt: "asc" },
    });
    let yurur = 0;
    for (const h of har) {
      yurur += h.quantityDelta;
      const kod = h.saleItem?.sale.code ?? "";
      console.log(
        `     ${gun(h.occurredAt)}  ${h.type.padEnd(13)}` +
          ` ${String(h.quantityDelta).padStart(3)}  →${String(yurur).padStart(3)}` +
          `  ${kod.padEnd(13)} ${(h.note ?? "").slice(0, 34)}`,
      );
    }
    console.log(`     ⭐ BUGÜNKÜ NET STOK: ${yurur}`);
    console.log(
      `     ⛔ iade yazılırsa: ${yurur} + 1 = ${yurur + 1}` +
        `   ← Halil "stokta yok" diyor`,
    );
    if (yurur + 1 !== 0) {
      console.log(
        "     → ÇELİŞKİ AÇIK. İade yazımı DURUR: sistem rafta olmayan malı",
      );
      console.log(
        "       stoğa koyamaz. Önce sayım ya da eksik satış/fazla alım bulunur.",
      );
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  ④ 4673224319 — ₺1.216,87 TAZMİN NEREYE YAZILIR
   * ────────────────────────────────────────────────────────────────────────
   *  ⭐ PANODAKİ ENDİŞE BAYAT ÇIKTI. Pano diyordu ki: _"`Compensation`
   *  karşı tarafı `supplierId`/`carrierId` istiyor, oysa ödeyen KANAL."_
   *  Şema 23.08'de tam bunun için genişletilmiş ve kendi başlığında
   *  yazıyor: _"Pazaryerleri ZATEN `Supplier` listesinde (arbitrajda
   *  onlardan da alım yapılıyor), yani o taraf ek alan GEREKTİRMEDİ."_
   *  ⛔ Ama bu da bir İDDİA — kaydın gerçekten var olduğu ÖLÇÜLÜR.
   *  _(Anayasa: "yokluk iddiası da iddiadır" · "kural doğru mu değil,
   *  teslim edilebilir mi".)_
   * ══════════════════════════════════════════════════════════════════════ */
  console.log("\n" + "─".repeat(88));
  console.log(`④ ${VAKA_4} — ₺${para(TAZMIN_TUTARI)} tazmin`);
  console.log("─".repeat(88));

  const s4 = await prisma.sale.findFirst({
    where: { code: VAKA_4 },
    select: {
      id: true,
      soldAt: true,
      profitStatus: true,
      channelAccount: {
        select: { channel: { select: { id: true, name: true } } },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
        },
      },
    },
  });
  if (s4 === null) {
    console.log("  ⛔ SATIŞ DEFTERDE YOK — ÖLÇÜM YOK.");
  } else {
    const kanalAdi = s4.channelAccount.channel.name;
    console.log(`  satış: ${gun(s4.soldAt)} · ${kanalAdi} · kâr: ${s4.profitStatus}`);
    for (const it of s4.items) {
      const har = await prisma.stockMovement.findMany({
        where: { saleItemId: it.id },
        select: { quantityDelta: true, unitCostAmount: true, unitCostCurrency: true },
      });
      const m = maliyetiSor(har);
      console.log(
        `  kalem: ${it.variant.sku} × ${it.quantity} · ` +
          `maliyet ${m.maliyet === null ? "⛔ BİLİNMİYOR" : "₺" + para(m.maliyet)}` +
          `  ${it.variant.product.name.slice(0, 34)}`,
      );
    }

    /** ⭐ KARŞI TARAF: kanal `Supplier` olarak var mı? */
    console.log("\n  KARŞI TARAF — kanal `Supplier` listesinde mi?");
    const tedarikciler = await prisma.supplier.findMany({
      select: { id: true, name: true },
    });
    const aday = tedarikciler.filter((t) =>
      t.name.toLocaleLowerCase("tr").includes(
        kanalAdi.split(" ")[0].toLocaleLowerCase("tr"),
      ),
    );
    if (aday.length === 0) {
      console.log(
        `     ⛔ "${kanalAdi}" adlı Supplier YOK (${tedarikciler.length} kayıt tarandı).`,
      );
      console.log(
        "     → TAZMİN YAZILAMAZ: karşı tarafı gösterecek kayıt yok. Önce",
      );
      console.log("       tedarikçi tanımlanır — ve bu bir KARARDIR, yazım değil.");
    } else {
      for (const a of aday) console.log(`     ⭐ BULUNDU: ${a.name}  (${a.id})`);
      console.log("     → karşı taraf `supplierId` ile YAZILABİLİR.");
    }

    /** ⚠ BAĞ: hangi alana bağlanacak — iade kalemi mi, bildirim mi? */
    const iade4 = await prisma.return.findFirst({
      where: { sale: { code: VAKA_4 } },
      select: { id: true, items: { select: { id: true } } },
    });
    const bildirim4 = await prisma.returnNotice.findFirst({
      where: { sale: { code: VAKA_4 } },
      select: { id: true },
    });
    console.log("\n  BAĞ — talep neye bağlanacak?");
    console.log(
      `     iade kaydı : ${iade4 === null ? "⛔ YOK" : `VAR (${iade4.items.length} kalem)`}`,
    );
    console.log(
      `     bildirim   : ${bildirim4 === null ? "⛔ YOK" : "VAR"}`,
    );
    if (iade4 === null && bildirim4 === null) {
      console.log(
        "     ⛔ İKİSİ DE YOK — tazmin bağlanacak bir kayıt bulamaz.",
      );
      console.log(
        "       SIRA: önce iade (ya da bildirim) yazılır, SONRA tazmin.",
      );
    }
    const mevcut4 = await prisma.compensation.count({
      where: { note: { contains: VAKA_4 } },
    });
    console.log(
      `     ⭐ bu siparişe ait mevcut tazmin kaydı: ${mevcut4}` +
        (mevcut4 > 0 ? "  ⚠ ÇİFT YAZIM RİSKİ" : "  (çift yazım riski yok)"),
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  ⑨ 10559161422 — MÜKERRER: TAMAMI MI, BİR KALEMİ Mİ
   * ────────────────────────────────────────────────────────────────────────
   *  ⛔ SİPARİŞİN TAMAMINI İPTAL ETMEK GERÇEK OLAN 1 ADEDİ DE SİLER.
   *  Ölçüt: iki kalem AYNI varyant ve AYNI fiyat mı — yani gerçekten
   *  aynı satırın iki kopyası mı, yoksa iki ayrı mal mı?
   * ══════════════════════════════════════════════════════════════════════ */
  console.log("\n" + "─".repeat(88));
  console.log(`⑨ ${VAKA_9} — mükerrer: tamamı mı, bir kalemi mi`);
  console.log("─".repeat(88));

  const s9 = await prisma.sale.findFirst({
    where: { code: VAKA_9 },
    select: {
      id: true,
      soldAt: true,
      iptalTarihi: true,
      profitStatus: true,
      net2Amount: true,
      items: {
        select: {
          id: true,
          quantity: true,
          unitPriceAmount: true,
          commissionRate: true,
          variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (s9 === null) {
    console.log("  ⛔ SATIŞ DEFTERDE YOK — ÖLÇÜM YOK.");
  } else {
    console.log(
      `  satış: ${gun(s9.soldAt)} · iptal: ` +
        `${s9.iptalTarihi === null ? "hayır" : gun(s9.iptalTarihi)}` +
        ` · kâr: ${s9.profitStatus}` +
        ` · NET-2: ${s9.net2Amount === null ? "—" : "₺" + para(Number(s9.net2Amount.toString()))}`,
    );
    const maliyetler: { maliyet: number | null }[] = [];
    for (const it of s9.items) {
      const har = await prisma.stockMovement.findMany({
        where: { saleItemId: it.id },
        select: {
          quantityDelta: true,
          occurredAt: true,
          unitCostAmount: true,
          unitCostCurrency: true,
        },
        orderBy: { occurredAt: "asc" },
      });
      const m = maliyetiSor(har);
      console.log(
        `\n  kalem ${it.id.slice(-8)} · ${it.variant.sku} × ${it.quantity}` +
          ` · ₺${para(Number(it.unitPriceAmount.toString()))}` +
          ` · komisyon ${it.commissionRate === null ? "⛔ null" : it.commissionRate.toString() + "%"}`,
      );
      maliyetler.push(m);
      console.log(`     ${it.variant.product.name.slice(0, 60)}`);
      console.log(
        `     stok hareketi ${har.length} · NET maliyet ` +
          (m.maliyet === null ? "⛔ BİLİNMİYOR" : "₺" + para(m.maliyet)),
      );
    }
    /** ⭐ AYNI SATIRIN KOPYASI MI? */
    if (s9.items.length === 2) {
      const [a, b] = s9.items;
      const ayniVaryant = a.variant.id === b.variant.id;
      const ayniFiyat =
        Math.abs(
          Number(a.unitPriceAmount.toString()) - Number(b.unitPriceAmount.toString()),
        ) < 0.005;
      console.log("\n  ⭐ KOPYA ÖLÇÜTÜ");
      console.log(`     aynı varyant : ${ayniVaryant ? "EVET" : "HAYIR"}`);
      console.log(`     aynı fiyat   : ${ayniFiyat ? "EVET" : "HAYIR"}`);
      if (ayniVaryant && ayniFiyat) {
        console.log("     → İKİSİ AYNI SATIRIN KOPYASI.");
        /**
         * ⛔ VE ÖNCE "ZATEN YAPILMIŞ MI" SORULUR — ÖNERİ SONRA GELİR.
         *
         * İlk yazımda bu dal doğrudan _"ters ADJUSTMENT at"_ diyordu ve bu
         * **ÇİFT GERİ ALMA** olurdu: fazla kalem 29.08'de zaten nötrlenmiş
         * (`SALE_CANCEL_IN +1`, not "mukerrer kalem") ve adedi 0'a çekilmiş.
         * Ölçüt: adet 0 VE net maliyet 0.
         * _(Anayasa: "alanın DOLU olması olayın gerçekleştiğini göstermez"
         * — burada TERSİ: kalemin durması, işin yapılmadığını göstermez.)_
         */
        const notrlenmis = s9.items.filter(
          (x, i) => x.quantity === 0 && maliyetler[i].maliyet === 0,
        );
        if (notrlenmis.length > 0) {
          console.log(
            `     ⭐ ZATEN NÖTRLENMİŞ: ${notrlenmis.length} kalem` +
              " (adet 0 · net maliyet 0). Stok geri dönmüş, ciroya girmiyor.",
          );
          console.log("     ⛔ YAPILACAK İŞ YOK — ters kayıt ÇİFT geri alma olur.");
          console.log("       Kalem SİLİNMEDİ, izi duruyor: ledger disiplini.");
        } else {
          console.log("     ⛔ SİPARİŞİ İPTAL ETME — gerçek olan 1 adedi de siler.");
          console.log(
            "       Doğru yol: FAZLA KALEMİ ters `ADJUSTMENT` ile geri al",
          );
          console.log("       (kalem SİLİNMEZ, iz kalır) — `11265267349` deseni.");
        }
      } else {
        console.log(
          "     → İKİ AYRI MAL. Mükerrerlik iddiası bu ölçütle DESTEKLENMEDİ;",
        );
        console.log("       Halil'e geri sorulur.");
      }
    } else {
      console.log(`\n  ⚠ kalem sayısı ${s9.items.length} — 2 bekleniyordu.`);
    }
  }

  console.log("\n" + "=".repeat(88));
  console.log("  ⛔ HİÇBİR ŞEY YAZILMADI. Üçü de Halil onayı bekliyor.");
  console.log("=".repeat(88) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
