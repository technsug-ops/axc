import { prisma } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";
import {
  VITRIN_SATIRLARI,
  kanalKaydiYokKosulu,
  vitrinKosulu,
  type VitrinSatiri,
} from "@/lib/vitrin-kutusu";

/**
 * ============================================================================
 *  "RAFTA VAR, VİTRİNDE YOK" KUTUSU — VERİ (K121③, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ SAYI VE LİSTE AYNI GÖVDEDEN: kutu `vitrinKosulu`yla sayıyor, `/stok`
 *  aynı koşulla süzüyor. _(Anayasa: "sayı = liste"; adres ve koşul süzgeç
 *  sözleşmesinin sahibi dosyadan üretilir.)_
 *
 *  ── ⚠ ÖLÇÜM DAMGASI HER ZAMAN GÖRÜNÜR ───────────────────────────────
 *  Hiç karşılaştırılmadıysa "—" değil **"henüz karşılaştırılmadı"** yazar.
 *  Bir tire, okuyana "veri yok" mu "sıfır" mı olduğunu söylemez; kutu bayat
 *  bir rakamı taze sanmakla, hiç ölçülmemiş bir rakamı ölçülmüş sanmak
 *  arasında fark gözetmek zorunda. _(Kullanıcı şartı 01.09.2026.)_
 *
 *  ── ⚠ SATIRLAR ₺'YE GÖRE SIRALI, SAYIYA GÖRE DEĞİL ──────────────────
 *  13 ucuz ürün 5 pahalı üründen önce gelmemeli: kutunun işi parayı
 *  göstermek. _(Kullanıcı kararı 01.09.2026.)_
 * ============================================================================
 */

export type VitrinKutuSatiri = {
  satir: VitrinSatiri;
  adet: number;
  tutar: number;
};

export type VitrinKutusu = {
  /** Kanal hesabı bulunamazsa `null` — kutu çizilmez. */
  hesapId: string | null;
  hesapAdi: string | null;
  satirlar: VitrinKutuSatiri[];
  toplamAdet: number;
  toplamTutar: number;
  /** Kanal kaydı olmayan stoklu varyantlar — AYRI, sayıya girmez. */
  kaydiYokAdet: number;
  kaydiYokTutar: number;
  /** Son karşılaştırma anı; hiç ölçülmediyse `null`. */
  olcumAt: Date | null;
};

/**
 * ⚠ HESAP KİMLİKLE BULUNUR, ADLA DEĞİL. `externalId` pazaryerinin kendi
 * satıcı kimliği; taramanın `saticiId`siyle aynı. _(20.08 dersi:
 * `kanalAdi === "Hepsiburada"` karşılaştırması 29 ürünü sessizce elemişti.)_
 */
export async function vitrinKutusunuTopla(
  saticiId: string,
): Promise<VitrinKutusu> {
  const bos: VitrinKutusu = {
    hesapId: null,
    hesapAdi: null,
    satirlar: [],
    toplamAdet: 0,
    toplamTutar: 0,
    kaydiYokAdet: 0,
    kaydiYokTutar: 0,
    olcumAt: null,
  };

  const hesap = await prisma.channelAccount.findFirst({
    where: { externalId: saticiId },
    select: { id: true, name: true, channel: { select: { name: true } } },
  });
  if (hesap === null) return bos;

  /** Stoklu varyantlar — ledger toplamı > 0. */
  const grup = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
    orderBy: { variantId: "asc" },
  });
  const stoklu = grup
    .filter((g) => (g._sum.quantityDelta ?? 0) > 0)
    .map((g) => g.variantId);
  if (stoklu.length === 0) return { ...bos, hesapId: hesap.id };

  /** Envanter değeri — FIFO gövdesinden, ikinci bir hesap yazılmadan. */
  const partiler = await acikPartilerToplu(prisma, stoklu);
  const deger = new Map<string, number>();
  for (const [vid, liste] of partiler) {
    let t = 0;
    for (const p of liste) {
      /** ⚠ Maliyeti bilinmeyen parti tutara GİRMEZ — sıfır sayılmaz. */
      if (p.birimMaliyet !== null) t += p.kalanAdet * Number(p.birimMaliyet);
    }
    deger.set(vid, t);
  }

  const olc = async (kosul: Parameters<typeof prisma.productVariant.findMany>[0]) => {
    const vs = await prisma.productVariant.findMany({
      ...kosul,
      select: { id: true },
    });
    return {
      adet: vs.length,
      tutar: vs.reduce((t, v) => t + (deger.get(v.id) ?? 0), 0),
    };
  };

  const satirlar: VitrinKutuSatiri[] = [];
  for (const s of VITRIN_SATIRLARI) {
    const r = await olc({
      where: vitrinKosulu({ kanalHesabiId: hesap.id, variantIdleri: stoklu, satir: s }),
    });
    if (r.adet > 0) satirlar.push({ satir: s, adet: r.adet, tutar: r.tutar });
  }
  /** ⚠ ₺'YE GÖRE SIRALI — en pahalı iş en üstte. */
  satirlar.sort((a, b) => b.tutar - a.tutar);

  const kaydiYok = await olc({
    where: kanalKaydiYokKosulu({ kanalHesabiId: hesap.id, variantIdleri: stoklu }),
  });

  /**
   * ⚠ EN ESKİ ÖLÇÜM DAMGASI ALINIR, EN YENİSİ DEĞİL. Kutunun tamamı ancak
   * en geç ölçülen satır kadar tazedir; en yenisini yazmak kutuyu olduğundan
   * taze gösterirdi.
   */
  const damga = await prisma.channelSku.aggregate({
    where: { channelAccountId: hesap.id, kanalOlcumAt: { not: null } },
    _min: { kanalOlcumAt: true },
  });

  return {
    hesapId: hesap.id,
    hesapAdi: `${hesap.channel.name} · ${hesap.name}`,
    satirlar,
    toplamAdet: satirlar.reduce((t, s) => t + s.adet, 0),
    toplamTutar: satirlar.reduce((t, s) => t + s.tutar, 0),
    kaydiYokAdet: kaydiYok.adet,
    kaydiYokTutar: kaydiYok.tutar,
    olcumAt: damga._min.kanalOlcumAt,
  };
}
