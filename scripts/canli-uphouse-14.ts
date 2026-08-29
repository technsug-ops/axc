/** BETIK SINIFI: TEK_SEFERLIK — LEGO 43217 mukerrer cifti, `uphouse-20260829` koduna kilitli. */
/** SAYIM KORUMASI YOK: bu betik SAYIMIN KENDISI — Halil'in saydigi 14'u yaziyor. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  UP HOUSE (LEGO 43217) — MÜKERRER ÇİFT BİRLEŞTİRME · HEDEF 14
 * ----------------------------------------------------------------------------
 *      npm run canli:uphouse -- --adim=1            → KURU KOŞUM
 *      npm run canli:uphouse -- --adim=1 --yaz      → yazar
 *      npm run canli:uphouse -- --geri              → hepsini geri alır
 *
 *  ⭐ HALİL: _"Toplam 14 adet var, ona göre düzenle."_
 *
 *  ADIMLAR:
 *    1 · axcali2601 barkodunu boşalt — İÇE AKTARMANIN TIKACI BU.
 *        Kod `5702017424842` iki varyanta çözülüyordu (birinde kanal SKU,
 *        ötekinde barkod) ve içe aktarıcı TAHMİN ETMEYİP duruyordu. Ölçüldü:
 *        10.205 satırlık dosyanın `belirsizSku` kovasının TAMAMI bu tek kod.
 *        ⚠ Pasife almak YETMEZ — içe aktarıcı `isActive` süzmez.
 *    2 · (bu betikte DEĞİL) `canli:satis-aktar -- --yaz`
 *    4 · OYU-LG-598P-01 → 14 · COUNT_CORRECTION
 *    5 · axcali2601 → 0 + `isActive: false`
 *
 *  ⚠ GERİ ALMA ÖLÇÜTE BAĞLI, LİSTEYE DEĞİL: hareketler `note` içindeki
 *  `uphouse-20260829` koduyla bulunur; barkod sabitten geri yazılır.
 *  _(Anayasa: "geri alma yolu, saklanan listeye değil yeniden
 *  hesaplanabilir ölçüte dayanır".)_
 * ============================================================================
 */

const ANA = "OYU-LG-598P-01";
const MUKERRER = "axcali2601";
const ESKI_BARKOD = "5702017424842";
const HEDEF = 14;
const KOD = "uphouse-20260829";

const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");
const ADIM = Number(
  (process.argv.find((a) => a.startsWith("--adim=")) ?? "--adim=0").slice(7),
);

const p2 = (n: number) => String(n).padStart(2);
const tl = (n: number) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");
  const { acikPartiler, fifoDagit, gunSonu } = await import("../src/lib/stok");

  console.log("\n" + "=".repeat(92));
  console.log(
    "UP HOUSE — " +
      (GERI
        ? "⚠ GERİ ALMA"
        : "ADIM " + ADIM + " · " + (YAZ ? "⚠ YAZIM" : "KURU KOŞUM")),
  );
  console.log("=".repeat(92));

  const oku = async (sku: string) => {
    const v = await p.productVariant.findFirst({
      where: { sku },
      select: { id: true, barcode: true, isActive: true, companySku: true },
    });
    if (!v) return null;
    const s = await p.stockMovement.aggregate({
      where: { variantId: v.id },
      _sum: { quantityDelta: true },
    });
    return { ...v, stok: s._sum.quantityDelta ?? 0 };
  };

  const durum = async (etiket: string) => {
    const a = await oku(ANA);
    const b = await oku(MUKERRER);
    console.log("\n   " + etiket);
    console.log(
      "     " + ANA.padEnd(16) + " stok " + p2(a!.stok) +
        " · barkod " + (a!.barcode ?? "—") + " · aktif " + a!.isActive,
    );
    console.log(
      "     " + MUKERRER.padEnd(16) + " stok " + p2(b!.stok) +
        " · barkod " + (b!.barcode ?? "—") + " · aktif " + b!.isActive,
    );
    return { a: a!, b: b! };
  };

  // ═══ GERİ ALMA ═══════════════════════════════════════════════════════════
  if (GERI) {
    await durum("ÖNCE");
    const hh = await p.stockMovement.findMany({
      where: { note: { contains: KOD } },
      select: { id: true },
    });
    await p.stockMovement.deleteMany({ where: { id: { in: hh.map((x) => x.id) } } });
    await p.productVariant.updateMany({
      where: { sku: MUKERRER },
      data: { barcode: ESKI_BARKOD, isActive: true },
    });
    console.log(
      "\n   ⭐ silinen hareket: " + hh.length + " · barkod ve aktiflik geri yazıldı",
    );
    await durum("SONRA");
    await p.auditLog.create({
      data: {
        action: "UPHOUSE_GERI_ALMA",
        targetType: "ProductVariant",
        detail: JSON.stringify({
          kod: KOD,
          silinenHareket: hh.length,
          barkodGeriYazildi: ESKI_BARKOD,
        }),
      },
    });
    console.log("");
    await p.$disconnect();
    return;
  }

  const { a, b } = await durum("ÖNCE");

  // ═══ ADIM 1 — BARKODU BOŞALT ═════════════════════════════════════════════
  if (ADIM === 1) {
    if (b.barcode !== ESKI_BARKOD) {
      console.log("\n   ⛔ BEKLENEN BARKOD DEĞİL (" + b.barcode + ") — YAZILMADI.\n");
      await p.$disconnect();
      process.exitCode = 1;
      return;
    }
    console.log("\n   PLAN: " + MUKERRER + ".barcode  '" + ESKI_BARKOD + "' → boş");
    console.log("   GEREKÇE: kod iki varyanta çözülüyor; içe aktarıcı duruyor.");
    if (!YAZ) {
      console.log("\n   KURU KOŞUM — yazılmadı.\n");
      await p.$disconnect();
      return;
    }
    await p.productVariant.update({ where: { id: b.id }, data: { barcode: null } });
    await p.auditLog.create({
      data: {
        action: "MUKERRER_BARKOD_BOSALTILDI",
        targetType: "ProductVariant",
        targetId: b.id,
        detail: JSON.stringify({
          kod: KOD,
          sku: MUKERRER,
          eskiBarkod: ESKI_BARKOD,
          yeniBarkod: null,
          gerekce:
            "Kod '" + ESKI_BARKOD + "' iki varyanta cozuluyordu: " + ANA +
            "'de KANAL SKU, " + MUKERRER + "'de BARKOD. Ice aktarici tahmin " +
            "etmeyip duruyordu; olculdu: 10205 satirlik dosyanin belirsizSku " +
            "kovasinin TAMAMI bu tek kod (41 satir, 36'si sisteme girmemis).",
          niyePasifYetmez:
            "Ice aktarici productVariant sorgusunda isActive suzgeci " +
            "UYGULAMIYOR; pasif varyantin barkodu haritada kalirdi.",
          geriAlma: "npm run canli:uphouse -- --geri  → barkod sabitten geri yazilir.",
        }),
      },
    });
    await durum("SONRA");
    console.log("\n   ✓ AuditLog: MUKERRER_BARKOD_BOSALTILDI\n");
    await p.$disconnect();
    return;
  }

  // ═══ ADIM 4 — ANA VARYANT → 14 ═══════════════════════════════════════════
  if (ADIM === 4) {
    const fark = HEDEF - a.stok;
    console.log(
      "\n   " + ANA + ": sistem " + a.stok + " · Halil " + HEDEF +
        " · ⭐ FARK " + (fark > 0 ? "+" : "") + fark,
    );
    if (fark === 0) {
      console.log("\n   ⭐ ZATEN 14 — yapacak iş yok.\n");
      await p.$disconnect();
      return;
    }
    const an = new Date();
    an.setUTCHours(0, 0, 0, 0);

    if (fark > 0) {
      /**
       * ⚠ MALİYET VARSAYIMDIR — kullanıcı kararı 29.08.2026.
       *
       * Bu adet fiziken RAFTA duruyor ama alım kaydı YOK; gerçek maliyeti
       * sistem BİLMİYOR. Kullanıcı _"şimdiye kadarki alınanların ortalama
       * maliyeti olarak varsayım gir"_ dedi.
       *
       * ⛔ ORTALAMA BİR SEÇİMDİR, ÖLÇÜM DEĞİL: 28.08.2026'da fiyat denemesi
       * için tam tersi karar alınmıştı (_"ortalama aylar önceki fiyatı
       * bugüne karıştırır, SON fiyat kullanılsın"_; ölçüldü: 247 varyantta
       * ayrışma, max %81,4). Burada ortalama BİLEREK seçildi ve bu yüzden
       * `varsayim: true` damgasıyla ize yazılır — sonradan bakan biri onu
       * ölçülmüş maliyet sanmasın.
       *
       * ⚠ Ve taban: `unitCostAmount` bu depoda KDV DAHİL ödenen tutardır
       * (kâr motoru öyle okur), dolayısıyla ortalama da o tabandan alınır.
       */
      const alimlar = await p.stockMovement.findMany({
        where: {
          variantId: a.id,
          type: "PURCHASE_IN",
          unitCostAmount: { not: null },
        },
        select: { unitCostAmount: true, quantityDelta: true, occurredAt: true },
        orderBy: { occurredAt: "asc" },
      });
      const birimler = alimlar.map((x) => Number(x.unitCostAmount));
      if (birimler.length === 0) {
        console.log("\n   ⛔ MALİYETLİ ALIM KAYDI YOK — ortalama üretilemez.\n");
        await p.$disconnect();
        process.exitCode = 1;
        return;
      }
      const sirali = [...birimler].sort((x, y) => x - y);
      const ortalama = birimler.reduce((t, x) => t + x, 0) / birimler.length;
      const ortanca = sirali[Math.floor(sirali.length / 2)];
      const son = birimler[birimler.length - 1];
      console.log("\n   YÖN: ARTIRAN · maliyet VARSAYIM (kullanıcı kararı)");
      console.log("   ⭐ ALIM MALİYETİ DAĞILIMI  (n=" + birimler.length + ")");
      console.log("     min      ₺" + tl(sirali[0]));
      console.log("     ortanca  ₺" + tl(ortanca));
      console.log("     max      ₺" + tl(sirali[sirali.length - 1]));
      console.log("     SON      ₺" + tl(son));
      console.log("     ⭐ ORTALAMA (yazılacak) ₺" + tl(ortalama));
      const sapma = son === 0 ? 0 : ((ortalama - son) / son) * 100;
      console.log(
        "     ⚠ ortalama ile SON arasındaki fark: %" + sapma.toFixed(1) +
          "  (28.08 kararı SON'u seçmişti)",
      );
      console.log(
        "\n   YAZILACAK: " + fark + " adet × ₺" + tl(ortalama) +
          " = ₺" + tl(fark * ortalama) + "  (VARSAYIM damgalı)",
      );
      if (!YAZ) {
        console.log("\n   KURU KOŞUM — yazılmadı.\n");
        await p.$disconnect();
        return;
      }
      await p.stockMovement.create({
        data: {
          variantId: a.id,
          type: "COUNT_CORRECTION",
          quantityDelta: fark,
          occurredAt: an,
          unitCostAmount: ortalama.toFixed(2),
          unitCostCurrency: "TRY",
          note:
            KOD + " · Halil sayimi: toplam 14 adet. 36 girilmemis satis ice " +
            "aktarildiktan SONRA kalan fark. ALIM KAYDI YOK; maliyet VARSAYIM " +
            "olarak bu varyantin gecmis alimlarinin ORTALAMASI yazildi " +
            "(n=" + birimler.length + ", ort " + ortalama.toFixed(2) +
            ", son " + son.toFixed(2) + ") — kullanici karari 29.08.2026.",
        },
      });
      await p.auditLog.create({
        data: {
          action: "UPHOUSE_SAYIM_DUZELTMESI",
          targetType: "StockMovement",
          targetId: a.id,
          detail: JSON.stringify({
            kod: KOD,
            sku: ANA,
            oncekiStok: a.stok,
            hedef: HEDEF,
            fark,
            varsayim: true,
            maliyetSecimi: "ORTALAMA",
            maliyetOrnneklem: birimler.length,
            maliyetOrtalama: Number(ortalama.toFixed(2)),
            maliyetOrtanca: Number(ortanca.toFixed(2)),
            maliyetSon: Number(son.toFixed(2)),
            maliyetMin: Number(sirali[0].toFixed(2)),
            maliyetMax: Number(sirali[sirali.length - 1].toFixed(2)),
            uyari:
              "MALIYET OLCULMEDI, VARSAYILDI. 28.08.2026'da fiyat denemesi " +
              "icin SON fiyat karari alinmisti; burada kullanici ORTALAMA " +
              "istedi. Gercek alim faturasi bulunursa bu hareket geri alinip " +
              "gercek maliyetle yeniden yazilmalidir.",
            halilBeyani: "Toplam 14 adet var, ona gore duzenle.",
            geriAlmaOlcutu: "note icinde '" + KOD + "' gecen hareketler.",
          }),
        },
      });
    } else {
      console.log("   YÖN: DÜŞÜREN — FIFO'dan düşülür.");
      const partiler = await acikPartiler(p, a.id, gunSonu(an));
      const d = fifoDagit(partiler, Math.abs(fark));
      if (!d.yeterliMi) {
        console.log("   ⛔ FIFO YETMEDİ (" + d.mevcut + ") — YAZILMADI.\n");
        await p.$disconnect();
        process.exitCode = 1;
        return;
      }
      for (const x of d.dagitim) {
        console.log(
          "     " + x.adet + " adet · birim ₺" +
            (x.parti.birimMaliyet === null ? "—" : tl(Number(x.parti.birimMaliyet))),
        );
      }
      if (!YAZ) {
        console.log("\n   KURU KOŞUM — yazılmadı.\n");
        await p.$disconnect();
        return;
      }
      for (const x of d.dagitim) {
        await p.stockMovement.create({
          data: {
            variantId: a.id,
            type: "COUNT_CORRECTION",
            quantityDelta: -x.adet,
            occurredAt: an,
            sourceMovementId: x.parti.hareketId,
            unitCostAmount: x.parti.birimMaliyet,
            unitCostCurrency: x.parti.birimMaliyetParaBirimi,
            note:
              KOD + " · Halil sayimi: rafta 14. 36 girilmemis satis ice " +
              "aktarildi, 8'i parti bulamadi (FIFO siniri). Kalan -1 sayim farki.",
          },
        });
      }
      await p.auditLog.create({
        data: {
          action: "UPHOUSE_SAYIM_DUZELTMESI",
          targetType: "StockMovement",
          targetId: a.id,
          detail: JSON.stringify({
            kod: KOD,
            sku: ANA,
            oncekiStok: a.stok,
            hedef: HEDEF,
            fark,
            varsayim: false,
            halilBeyani: "Toplam 14 adet var, ona gore duzenle.",
            geriAlmaOlcutu: "note icinde '" + KOD + "' gecen hareketler.",
          }),
        },
      });
    }
    await durum("SONRA");
    console.log("");
    await p.$disconnect();
    return;
  }

  // ═══ ADIM 5 — MÜKERRER → 0 + PASİF ═══════════════════════════════════════
  if (ADIM === 5) {
    console.log("\n   " + MUKERRER + ": stok " + b.stok + " → 0 · aktif → false");
    console.log("   ⛔ SİLİNMİYOR: StockMovement.variantId `Restrict` — hareketi");
    console.log("     olan varyant silinemez; silinseydi hareketler sahipsiz kalırdı.");
    if (b.stok === 0 && !b.isActive) {
      console.log("\n   ⭐ ZATEN 0 VE PASİF.\n");
      await p.$disconnect();
      return;
    }
    const an = new Date();
    an.setUTCHours(0, 0, 0, 0);
    let plan: {
      adet: number;
      hareketId: string | null;
      maliyet: string | null;
      birim: "TRY" | "EUR" | null;
    }[] = [];
    if (b.stok > 0) {
      const partiler = await acikPartiler(p, b.id, gunSonu(an));
      const d = fifoDagit(partiler, b.stok);
      if (d.yeterliMi) {
        plan = d.dagitim.map((x) => ({
          adet: x.adet,
          hareketId: x.parti.hareketId,
          maliyet: x.parti.birimMaliyet,
          birim: x.parti.birimMaliyetParaBirimi,
        }));
        console.log("   FIFO: yeterli ✓ · " + plan.length + " parti");
      } else {
        plan = [{ adet: b.stok, hareketId: null, maliyet: null, birim: null }];
        console.log("   ⚠ FIFO yetmedi (" + d.mevcut + ") — partisiz düşülür.");
      }
    }
    if (!YAZ) {
      console.log("\n   KURU KOŞUM — yazılmadı.\n");
      await p.$disconnect();
      return;
    }
    for (const x of plan) {
      await p.stockMovement.create({
        data: {
          variantId: b.id,
          type: "COUNT_CORRECTION",
          quantityDelta: -x.adet,
          occurredAt: an,
          sourceMovementId: x.hareketId,
          unitCostAmount: x.maliyet,
          unitCostCurrency: x.birim,
          note:
            KOD + " · Mukerrer kayit, " + ANA + " ile birlestirildi. " +
            "Barkod bosaltildi (" + ESKI_BARKOD + " → " + ANA +
            "'in TY kanal SKU'su). Kayit SILINMIYOR, sifirlanip pasife aliniyor.",
        },
      });
    }
    await p.productVariant.update({ where: { id: b.id }, data: { isActive: false } });
    await p.auditLog.create({
      data: {
        action: "MUKERRER_KAYIT_PASIFE_ALINDI",
        targetType: "ProductVariant",
        targetId: b.id,
        detail: JSON.stringify({
          kod: KOD,
          sku: MUKERRER,
          oncekiStok: b.stok,
          birlestirildigiSku: ANA,
          niyeSilinmedi:
            "StockMovement.variantId onDelete Restrict; ayrica hareketleri ve " +
            "satis kalemleri sahipsiz kalirdi.",
          geriAlmaOlcutu:
            "note icinde '" + KOD + "' gecen hareketler + isActive geri acilir.",
        }),
      },
    });
    await durum("SONRA");
    console.log("");
    await p.$disconnect();
    return;
  }

  console.log("\n   ⛔ ADIM BELİRTİLMEDİ — --adim=1 | 4 | 5  ya da  --geri\n");
  await p.$disconnect();
  process.exitCode = 1;
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
