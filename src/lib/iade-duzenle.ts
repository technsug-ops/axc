import type { Currency } from "@/generated/prisma/enums";
import type { DonemIsrari } from "@/lib/donem-korumasi";
import { DONEM_ISTISNA_EYLEMI, donemIstisnaIzi, donemKapisi } from "@/lib/donem-kapisi";
import { IADE_PARA_KODLARI, iadeParaFarki, type IadeParaAlanlari } from "@/lib/iade";
import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  İADE DÜZENLEME — STOĞA DOKUNMAYAN ALANLAR (K44 · 1. adım, 30.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı: _«muhtemel yaşanacak bir problemde girişlerin kapalı
 *  olması mantıksız.»_ Kaydedilmiş bir iadeyi düzeltecek yol yoktu.
 *
 *  ⭐ BU GÖVDE STOK DEFTERİNE DOKUNMAZ. Düzenlenebilen: iade no · not ·
 *  hasar notu · ceza notu · değişim teslim tarihi · iade kargosu ·
 *  yeniden gönderim kargosu · ceza. Adet, sağlam/hasarlı, değişim ürünü,
 *  raf ve iade türü STOK yazar → onların yolu «iadeyi geri al» (2. adım).
 *
 *  ⭐ PARA DEĞİŞİNCE KÂR FARKLA TAZELENİR (`iadeParaFarki`). İade baştan
 *  hesaplanmaz: kalem satırları değişmedi ve baştan hesap, satışın sonradan
 *  değişmiş hareketlerini iadenin snapshot'ına sızdırırdı. Genel para
 *  satırları (`IADE_KARGO` · `YENIDEN_GONDERIM_KARGO` · `CEZA`) yeniden
 *  yazılır — bunlar türetilmiş satırlardır, stok defteri değil (kâr motoru
 *  `SaleFee`de aynısını yapıyor). Kalem satırlarına ve tazminat satırına
 *  DOKUNULMAZ.
 *
 *  ⛔ ŞARTLI YAZIM: form açıldığı andaki `updatedAt` tutmuyorsa (arada biri
 *  düzenledi) yazılmaz, `DEGISMIS` döner — başkasının düzeltmesi sessizce
 *  ezilmez.
 *  ⛔ DÖNEM KAPISI: para değişiyorsa iadenin tarihindeki muhasebe dönemi
 *  kapalı mı sorulur (K108); yalnız metin değişiyorsa rakam oynamadığı için
 *  sorulmaz.
 *  ⭐ İZ: her alanın ESKİ ve YENİ değeri `IADE_DUZENLENDI` izine.
 * ============================================================================
 */

export const IADE_DUZENLENDI_EYLEMI = "IADE_DUZENLENDI";

export type IadeDuzenlemeGirdisi = {
  returnId: string;
  /** Form açıldığındaki `updatedAt` (ISO) — şartlı yazımın ölçütü. */
  beklenenGuncelleme: string;
  code: string | null;
  note: string | null;
  cezaNotu: string | null;
  degisimTeslimTarihi: Date | null;
  para: IadeParaAlanlari;
  hasarNotlari: { returnItemId: string; not: string | null }[];
  donemIsrari?: DonemIsrari;
};

export type IadeDuzenlemeSonucu =
  | { durum: "TAMAM"; saleId: string; degisen: string[] }
  | { durum: "YOK" | "DEGISMIS" | "DEGISIKLIK_YOK" | "DEGISIM_YOK" | "EKSI_TUTAR" }
  | { durum: "HASAR_NOTU_ZORUNLU"; returnItemId: string };

const kurus = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);
const sayi = (d: { toString(): string } | null) => (d === null ? null : Number(d.toString()));
const metin = (s: string | null) => (s === null || s.trim() === "" ? null : s.trim());
const gun = (d: Date | null) => (d === null ? null : d.toISOString().slice(0, 10));

export async function iadeDuzenle(girdi: IadeDuzenlemeGirdisi): Promise<IadeDuzenlemeSonucu> {
  const p = girdi.para;
  if ([p.iadeKargosu, p.yenidenGonderimKargosu, p.ceza].some((x) => x !== null && x < 0)) {
    return { durum: "EKSI_TUTAR" };
  }
  return prisma.$transaction(async (tx) => {
    const iade = await tx.return.findUnique({
      where: { id: girdi.returnId },
      select: {
        saleId: true,
        updatedAt: true,
        occurredAt: true,
        code: true,
        note: true,
        penaltyNote: true,
        exchangeDeliveredAt: true,
        returnCargoAmount: true,
        reshipCargoAmount: true,
        penaltyAmount: true,
        net1Amount: true,
        net2Amount: true,
        profitCurrency: true,
        items: { select: { id: true, damagedQuantity: true, damageNote: true, exchangeVariantId: true } },
      },
    });
    if (!iade) return { durum: "YOK" as const };
    if (iade.updatedAt.toISOString() !== girdi.beklenenGuncelleme) return { durum: "DEGISMIS" as const };

    const degisimVar = iade.items.some((k) => k.exchangeVariantId !== null);
    if (!degisimVar && girdi.degisimTeslimTarihi !== null) return { durum: "DEGISIM_YOK" as const };

    const notlar = new Map(girdi.hasarNotlari.map((h) => [h.returnItemId, metin(h.not)]));
    for (const k of iade.items) {
      const yeniNot = notlar.has(k.id) ? notlar.get(k.id)! : k.damageNote;
      if (k.damagedQuantity > 0 && yeniNot === null) {
        return { durum: "HASAR_NOTU_ZORUNLU" as const, returnItemId: k.id };
      }
    }

    const eskiPara: IadeParaAlanlari = {
      iadeKargosu: kurus(sayi(iade.returnCargoAmount)),
      yenidenGonderimKargosu: kurus(sayi(iade.reshipCargoAmount)),
      ceza: kurus(sayi(iade.penaltyAmount)),
    };
    const yeniPara: IadeParaAlanlari = {
      iadeKargosu: kurus(p.iadeKargosu),
      yenidenGonderimKargosu: kurus(p.yenidenGonderimKargosu),
      ceza: kurus(p.ceza),
    };

    const eski = {
      code: iade.code,
      note: iade.note,
      cezaNotu: iade.penaltyNote,
      degisimTeslimTarihi: gun(iade.exchangeDeliveredAt),
      ...eskiPara,
    };
    const yeni = {
      code: metin(girdi.code),
      note: metin(girdi.note),
      cezaNotu: metin(girdi.cezaNotu),
      degisimTeslimTarihi: gun(girdi.degisimTeslimTarihi),
      ...yeniPara,
    };
    const degisen = (Object.keys(yeni) as (keyof typeof yeni)[]).filter((a) => eski[a] !== yeni[a]);
    const notDegisen = iade.items.filter((k) => notlar.has(k.id) && notlar.get(k.id) !== k.damageNote);
    if (degisen.length === 0 && notDegisen.length === 0) return { durum: "DEGISIKLIK_YOK" as const };

    const paraDegisti = degisen.some((a) => a === "iadeKargosu" || a === "yenidenGonderimKargosu" || a === "ceza");

    /** ⛔ DÖNEM KAPISI — yalnız rakam oynuyorsa; kapalıysa `DonemKorumasiHatasi` fırlar. */
    if (paraDegisti) {
      const kapi = await donemKapisi(tx, iade.occurredAt, girdi.donemIsrari);
      if (kapi.durum === "ISRARLA_GECILDI") {
        await izYaz(
          {
            action: DONEM_ISTISNA_EYLEMI,
            targetType: "Return",
            targetId: girdi.returnId,
            detail: donemIstisnaIzi({
              yol: "/satislar/[id]/iade/[iadeId]/duzenle",
              donem: kapi.donem,
              isTarihi: iade.occurredAt,
              israr: girdi.donemIsrari,
            }),
          },
          tx,
        );
      }
    }

    const fark = iadeParaFarki(eskiPara, yeniPara);
    const eskiNet1 = sayi(iade.net1Amount);
    const eskiNet2 = sayi(iade.net2Amount);
    const yeniNet1 = eskiNet1 === null ? null : eskiNet1 + fark.net1Farki;
    const yeniNet2 = eskiNet2 === null ? null : eskiNet2 + fark.net2Farki;
    const kargoVar = yeniPara.iadeKargosu !== null || yeniPara.yenidenGonderimKargosu !== null;

    /** ⛔ ŞARTLI — okuduğumuz hâl hâlâ yerindeyse. */
    const r = await tx.return.updateMany({
      where: { id: girdi.returnId, updatedAt: iade.updatedAt },
      data: {
        code: yeni.code,
        note: yeni.note,
        penaltyNote: yeni.cezaNotu,
        exchangeDeliveredAt: girdi.degisimTeslimTarihi,
        returnCargoAmount: yeniPara.iadeKargosu === null ? null : String(yeniPara.iadeKargosu),
        reshipCargoAmount: yeniPara.yenidenGonderimKargosu === null ? null : String(yeniPara.yenidenGonderimKargosu),
        cargoCurrency: kargoVar ? "TRY" : null,
        penaltyAmount: yeniPara.ceza === null ? null : String(yeniPara.ceza),
        penaltyCurrency: yeniPara.ceza === null ? null : "TRY",
        net1Amount: yeniNet1 === null ? null : String(yeniNet1),
        net2Amount: yeniNet2 === null ? null : String(yeniNet2),
      },
    });
    if (r.count !== 1) return { durum: "DEGISMIS" as const };

    if (paraDegisti) {
      const paraBirimi: Currency = iade.profitCurrency ?? "TRY";
      await tx.returnFee.deleteMany({
        where: { returnId: girdi.returnId, returnItemId: null, code: { in: [...IADE_PARA_KODLARI] } },
      });
      if (fark.yeniSatirlar.length > 0) {
        await tx.returnFee.createMany({
          data: fark.yeniSatirlar.map((s) => ({
            returnId: girdi.returnId,
            code: s.code,
            amount: String(s.tutar),
            currency: paraBirimi,
          })),
        });
      }
    }

    for (const k of notDegisen) {
      await tx.returnItem.update({ where: { id: k.id }, data: { damageNote: notlar.get(k.id)! } });
    }

    await izYaz(
      {
        action: IADE_DUZENLENDI_EYLEMI,
        targetType: "Return",
        targetId: girdi.returnId,
        detail: JSON.stringify({
          eski,
          yeni,
          hasarNotu: notDegisen.map((k) => ({ returnItemId: k.id, eski: k.damageNote, yeni: notlar.get(k.id) })),
          net1: { eski: eskiNet1, yeni: yeniNet1 },
          net2: { eski: eskiNet2, yeni: yeniNet2 },
        }),
      },
      tx,
    );

    return {
      durum: "TAMAM" as const,
      saleId: iade.saleId,
      degisen: [...degisen, ...notDegisen.map(() => "hasarNotu")],
    };
  });
}
