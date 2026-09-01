import { prisma } from "@/lib/prisma";
import { KOSUM_IZI } from "@/lib/kanal-listeleme-yaz";
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
  /**
   * Ölçümün YAŞI (saat). Burada hesaplanıyor çünkü `Date.now()` render
   * içinde çağrılamaz — saf olmayan çağrı aynı girdiyle farklı çıktı verir.
   */
  yasSaat: number | null;
  /**
   * Son koşum HATA ile mi bitti.
   *
   * ⛔ NİYE AYRI: koşum düştüğünde `kanalOlcumAt` ESKİ değerinde kalır ve
   * kutu "48 saat oldu" der — YANLIŞ TEŞHİS. Sorun geçen zaman değil,
   * koşumun DÜŞMESİ; ikisi farklı iş istiyor ("zamanlayıcı çalışmıyor" ↔
   * "çalıştı ama patladı").
   */
  sonKosumBasarisiz: boolean;
  /** Başarısızlığın sebebi — ekranda görünür, kırpılmaz. */
  sonKosumMesaji: string | null;
};

/**
 * ⚠ HESAP KİMLİKLE BULUNUR, ADLA DEĞİL. `externalId` pazaryerinin kendi
 * satıcı kimliği; taramanın `saticiId`siyle aynı. _(20.08 dersi:
 * `kanalAdi === "Hepsiburada"` karşılaştırması 29 ürünü sessizce elemişti.)_
 */
export async function vitrinKutusunuTopla(): Promise<VitrinKutusu> {
  const bos: VitrinKutusu = {
    hesapId: null,
    hesapAdi: null,
    satirlar: [],
    toplamAdet: 0,
    toplamTutar: 0,
    kaydiYokAdet: 0,
    kaydiYokTutar: 0,
    olcumAt: null,
    yasSaat: null,
    sonKosumBasarisiz: false,
    sonKosumMesaji: null,
  };

  /**
   * ⛔ SATICI KİMLİĞİ KODA GÖMÜLMEZ — anayasa: "firma adları yalnızca VERİ
   * olabilir, YAPI olamaz."
   *
   * ⭐ HESAP ÖLÇÜMÜN KENDİSİNDEN BULUNUR: `kanalOlcumAt` dolu bir satırı olan
   * hesap, karşılaştırması yapılmış hesaptır. Yarın ikinci kanal ölçülmeye
   * başlarsa kod değişmeden görünür.
   *
   * ⚠ VE `externalId` İLE ARAMA BURADA YANLIŞ OLURDU: parametre boş
   * geldiğinde Prisma `undefined` koşulu YOK SAYAR ve findFirst rastgele bir
   * hesap döndürür. 01.09.2026'da tam bu oldu — kutu `Hepsiburada/S.Ahmet`
   * hesabını seçti ve 231 ürünü "kanal kaydı yok" saydı.
   */
  const olculmus = await prisma.channelSku.groupBy({
    by: ["channelAccountId"],
    where: { kanalOlcumAt: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { channelAccountId: "desc" } },
    take: 1,
  });
  const hesapId = olculmus[0]?.channelAccountId;
  /** ⛔ HİÇ ÖLÇÜM YOKSA KUTU ÇİZİLMEZ — boş kutu "her şey yolunda" der. */
  if (hesapId === undefined) return bos;
  const hesap = await prisma.channelAccount.findUnique({
    where: { id: hesapId },
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

  /**
   * ⚠ EN SON İZ OKUNUR — "kaç kez düştü" değil "şu an durum ne" sorusu.
   * Eski iz SİLİNMEZ, en yenisi geçerlidir (ledger disiplini izlere de işler).
   */
  const sonIz = await prisma.auditLog.findFirst({
    where: { action: KOSUM_IZI },
    orderBy: { createdAt: "desc" },
    select: { detail: true },
  });
  let basarisiz = false;
  let mesaj: string | null = null;
  if (sonIz?.detail) {
    try {
      const v = JSON.parse(sonIz.detail) as { basarili?: boolean; mesaj?: string };
      basarisiz = v.basarili === false;
      if (basarisiz) mesaj = v.mesaj ?? null;
    } catch {
      /**
       * ⛔ ÇÖZÜLEMEYEN İZ "BAŞARILI" SAYILMAZ — bozuk bir kayıt sessizce
       * iyimser okunursa gerçek bir arıza görünmez kalır.
       */
      basarisiz = true;
      mesaj = "Koşum izi okunamadı (bozuk kayıt).";
    }
  }

  return {
    hesapId: hesap.id,
    hesapAdi: `${hesap.channel.name} · ${hesap.name}`,
    satirlar,
    toplamAdet: satirlar.reduce((t, s) => t + s.adet, 0),
    toplamTutar: satirlar.reduce((t, s) => t + s.tutar, 0),
    kaydiYokAdet: kaydiYok.adet,
    kaydiYokTutar: kaydiYok.tutar,
    olcumAt: damga._min.kanalOlcumAt,
    yasSaat:
      damga._min.kanalOlcumAt === null
        ? null
        : (Date.now() - damga._min.kanalOlcumAt.getTime()) / 3_600_000,
    sonKosumBasarisiz: basarisiz,
    sonKosumMesaji: mesaj,
  };
}
