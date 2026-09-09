import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K197-③ — HAKEDİŞTEN GELEN GERÇEK KARGO: KURU KOŞUM
 * ----------------------------------------------------------------------------
 *      npm run canli:hakedis-kargo-kosum
 *
 *  BETIK SINIFI: SUREKLI — HİÇBİR ŞEY YAZMAZ. Yazım yolu bu dosyada YOKTUR;
 *  `--uygula` diye bir bayrak da yoktur. Kuru koşum ile yazımı aynı dosyaya
 *  koymak, "yanlışlıkla uygula" mesafesini bir tuşa indirir.
 *
 *  ⛔ SORU: defterdeki kargo tutarını kanalın FİİLEN KESTİĞİ tutarla
 *  değiştirsek hangi satışta ne değişirdi?
 *
 *  ═══ ÖLÇÜLMÜŞ TEMEL (09.09.2026) ═════════════════════════════════════════
 *    · Defterdeki `cargoAmount` 28.08'de Halil'in KENDİ dosyasının R
 *      sütunundan yazıldı. Doğru olabilir ama kendi kendini doğrulayamaz.
 *    · Hakedişteki `KARGO` kalemi kanalın BAĞIMSIZ beyanıdır — kaynak
 *      önceliğinde 1. basamak.
 *    · TABAN ÖLÇÜLDÜ: hakediş kalemi **KDV DAHİL** (146 tutarın 130'u
 *      tarife ×1,20'ye birebir oturuyor, KDV hariç tutara oturan 0).
 *      `Sale.cargoAmount` ise KDV HARİÇ saklanıyor → kıyas ÷1,20 ile.
 *
 *  ⚠ KAPSAM DAR VE BUNU SÖYLÜYOR: hakediş dosyaları 2026-07-14'ten itibaren
 *  var. Daha eskisi bu yoldan düzeltilemez — TY sipariş ucu da o kadar
 *  geriye bakmıyor (ölçüldü: 2025-08 · 2025-11 · 2026-03 → 0 kayıt).
 *
 *  ⚠ YALNIZ HB: TY'nin kargosu hakedişe `KARGO_FATURA` diye TOPLU düşüyor
 *  (20 satır, hiçbiri satışa bağlı değil) — satır bazında dağıtılamıyor.
 * ============================================================================
 */

const KDV = 1.2;

function say(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("⛔", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  try {
    console.log("");
    console.log("KURU KOŞUM — HAKEDİŞTEN GELEN KARGO · " + new Date().toISOString());
    console.log("⚠ HİÇBİR ŞEY YAZILMADI.");
    console.log("=".repeat(74));

    /* ═══ KANALIN KESTİĞİ ═══════════════════════════════════════════════ */
    const kalemler = await prisma.settlementItem.findMany({
      where: { code: "KARGO", NOT: { saleId: null } },
      select: { saleId: true, amount: true },
    });
    const kanal = new Map<string, { dahil: number; satir: number }>();
    for (const k of kalemler) {
      const id = k.saleId!;
      const v = kanal.get(id) ?? { dahil: 0, satir: 0 };
      /** ⚠ MUTLAK DEĞER: kesinti negatif yazılıyor; tutar pozitif taşınır. */
      v.dahil += Math.abs(Number(k.amount));
      v.satir += 1;
      kanal.set(id, v);
    }

    const satislar = await prisma.sale.findMany({
      where: { id: { in: [...kanal.keys()] } },
      select: {
        id: true,
        code: true,
        soldAt: true,
        cargoAmount: true,
        iptalTarihi: true,
        channelAccount: { select: { name: true, channel: { select: { name: true } } } },
      },
    });

    /* ═══ DÖRT SAYI AYRI TUTULUR ════════════════════════════════════════ */
    let degisecek = 0;
    let ayni = 0;
    let iptalli = 0;
    let eskisiYok = 0;
    let cokSatir = 0;
    let dEski = 0;
    let dYeni = 0;
    const hareket: { kod: string; eski: number; yeni: number; fark: number }[] = [];

    for (const s of satislar) {
      const k = kanal.get(s.id)!;
      if (s.iptalTarihi !== null) {
        /** ⚠ İptal satışın kârı zaten hesaplanmıyor — kapsam dışı. */
        iptalli += 1;
        continue;
      }
      if (k.satir > 1) {
        /** ⚠ AYRI SAYILIR: birden çok kargo satırı (bölünmüş gönderi ya da
         *  yeniden gönderim) tek alana toplanamaz — hüküm VERİLMEZ. */
        cokSatir += 1;
        continue;
      }
      const yeni = k.dahil / KDV;
      if (s.cargoAmount === null) {
        eskisiYok += 1;
        continue;
      }
      const eski = Number(s.cargoAmount);
      dEski += eski;
      dYeni += yeni;
      if (Math.abs(yeni - eski) < 0.01) {
        ayni += 1;
        continue;
      }
      degisecek += 1;
      hareket.push({ kod: s.code ?? "", eski, yeni, fark: yeni - eski });
    }

    console.log("");
    console.log("① KAPSAM");
    console.log("   hakedişte kargosu olan satış   " + satislar.length);
    console.log("   DEĞİŞECEK                      " + degisecek);
    console.log("   aynı (kuruşuna tutuyor)        " + ayni);
    console.log("   iptalli (kapsam dışı)          " + iptalli);
    console.log("   çok kargo satırlı (hüküm YOK)  " + cokSatir);
    console.log("   defterde tutar YOK (yeni yazım)" + eskisiYok);

    if (satislar.length > 0) {
      const ilk = satislar.reduce((a, b) => (a.soldAt < b.soldAt ? a : b));
      const son = satislar.reduce((a, b) => (a.soldAt > b.soldAt ? a : b));
      console.log(
        "   dönem  " +
          ilk.soldAt.toISOString().slice(0, 10) +
          " → " +
          son.soldAt.toISOString().slice(0, 10),
      );
      const kanallar = new Set(
        satislar.map((s) => s.channelAccount?.channel.name ?? "?"),
      );
      console.log("   kanal  " + [...kanallar].join(" · "));
    }

    /* ═══ PARA ══════════════════════════════════════════════════════════ */
    console.log("");
    console.log("② PARA (KDV HARİÇ taban — `cargoAmount`ın tabanı)");
    console.log("   defterde bugün  ₺" + say(dEski));
    console.log("   kanalın dediği  ₺" + say(dYeni));
    const fark = dYeni - dEski;
    console.log(
      "   FARK            ₺" + say(fark) +
        (fark < 0
          ? "   ← kargo AZALIR, NET YÜKSELİR"
          : "   ← kargo ARTAR, NET DÜŞER"),
    );
    console.log("");
    console.log("   ⚠ NET'İN KESİN RAKAMI BURADA YAZILMAZ. Kargo, NET'e hem KDV");
    console.log("      hariç tutarıyla hem `KARGO_KDV` kalemiyle giriyor; kesin");
    console.log("      etki kâr motoru yeniden koşturulunca ÇIKAR. Buradaki sayı");
    console.log("      etkinin YÖNÜ ve BÜYÜKLÜK MERTEBESİDİR.");
    console.log("      KDV dahil karşılığı: ₺" + say(fark * KDV));

    /* ═══ EN ÇOK OYNAYANLAR — KİMLİKLE ══════════════════════════════════ */
    console.log("");
    console.log("③ EN ÇOK OYNAYAN 15 (kimlikle — 'hangileri' cevapsız kalmasın)");
    const sirali = [...hareket].sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark));
    for (const h of sirali.slice(0, 15)) {
      console.log(
        "   " + h.kod.padEnd(13) +
          " defter ₺" + say(h.eski).padStart(9) +
          " → kanal ₺" + say(h.yeni).padStart(9) +
          "   fark ₺" + say(h.fark).padStart(8),
      );
    }

    /* ═══ ⚠ TARİFEYE OTURMAYANLAR — KÖRLEMESİNE YAZILMAZ ════════════════ */
    /**
     * ⛔ K197-② ölçümünde 16 tutar hiçbir tarife adımına oturmadı. Bunlar
     * farklı desi olabilir, özel durum olabilir, hata olabilir — BİLMİYORUZ.
     * Yazım kararı verilirken bu küme AYRI görünmeli; toplamın içinde
     * eritilirse hiç sorulmaz.
     */
    const tarife = await prisma.cargoTariff.findMany({ select: { amount: true } });
    const dahilKume = new Set(tarife.map((t) => (Number(t.amount) * KDV).toFixed(2)));
    const oturmayan = [...kanal.entries()].filter(
      ([, v]) => v.satir === 1 && !dahilKume.has(v.dahil.toFixed(2)),
    );
    console.log("");
    console.log("④ TARİFEYE OTURMAYAN KESİNTİLER — " + oturmayan.length + " satış");
    console.log("   (bilinmeyen küme; yazımdan önce tek tek bakılır)");
    const kodEsle = new Map(satislar.map((s) => [s.id, s.code ?? ""]));
    for (const [id, v] of oturmayan.slice(0, 10)) {
      console.log("      " + (kodEsle.get(id) ?? id).padEnd(13) + " ₺" + say(v.dahil));
    }

    console.log("");
    console.log("=".repeat(74));
    console.log("  KURU KOŞUM BİTTİ — DEFTERE HİÇBİR ŞEY YAZILMADI.");
    console.log("=".repeat(74));
    console.log("");
  } finally {
    /** ⛔ K189: `$disconnect` yoksa görev "Running"de asılı kalır. */
    await prisma.$disconnect();
  }
}
main();
