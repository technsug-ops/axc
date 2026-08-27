import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toplamlariBirlestir, type ParaToplami } from "@/lib/tutar";
import type { SuzgecToplamSonucu } from "@/lib/liste-toplami";

/**
 * ============================================================================
 *  SATIŞ LİSTESİ TOPLAMLARI — VERİTABANINDA, BELLEKTE DEĞİL
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE AÇILDI (ölçüm 27.08.2026): `/satislar` toplamları ÇEKİLEN DİZİDEN
 *  hesaplıyordu ve ekranın bütün defteri çekmesinin ASIL sebebi buydu.
 *
 *      sale.count() — 5778 satır                    30 ms   (ağ tabanı 29 ms)
 *      50 satış + kalemleri                         94 ms
 *      TÜM defter + derin include                 1600 ms   ← bugünkü ekran
 *
 *  Yani veritabanı 5778 satırı **1 milisaniyede** sayıyor; yavaş olan veri
 *  değil, ekranın yazılış biçimiydi. Sayfalama tek başına yeterli DEĞİL:
 *  toplamlar bellekte kaldığı sürece defterin tamamı çekilmeye devam ederdi.
 *
 *  ⛔ VE İLKE #15 KORUNUR: toplam **görünen sayfanın değil, SÜZGECİN
 *  TAMAMININ** toplamıdır. Bu gövde `kosul`u alır — sayfa numarasını değil.
 *  Sayfa değiştikçe toplam DEĞİŞMEZ; `satis-toplami:dogrula` bunu ölçüyor.
 *
 *  ═══ İPTAL KOŞULU `AND` İLE EKLENİR, SPREAD İLE DEĞİL ═══
 *  `{ ...kosul, iptalTarihi: null }` yazılsaydı, kullanıcı `?iptal=1`
 *  süzgecini açtığında `kosul`un kendi `iptalTarihi` koşulu SESSİZCE
 *  EZİLİRDİ. `AND` iki koşulu da ayakta tutar.
 *  _(17.08.2026'da aynı sınıftan bir hata yaşandı: `?iptal=1` açıkken
 *  iptalli satışlar toplama giriyordu ve ciro 105.184 → 106.618 sıçradı.)_
 * ============================================================================
 */

/** İptal edilmemiş kayıtlara daraltılmış koşul. */
function iptalsiz(kosul: Prisma.SaleWhereInput): Prisma.SaleWhereInput {
  return { AND: [kosul, { iptalTarihi: null }] };
}

/** Yalnız iptal EDİLMİŞ kayıtlar — "hariç" kutusunun kaynağı. */
function yalnizIptalli(kosul: Prisma.SaleWhereInput): Prisma.SaleWhereInput {
  return { AND: [kosul, { iptalTarihi: { not: null } }] };
}

/**
 * CİRO — para birimi başına `Σ (birim fiyat × adet)`.
 *
 * ⚠ BU TEK TOPLAM SATIR OKUMAK ZORUNDA ve sebebi şu: çarpım, `_sum`ın
 * yapabileceği bir şey değil (`SUM(a*b)` ham SQL ister, `kosul` ise bir
 * Prisma nesnesi — SQL'e çevrilemez).
 *
 * ⚠ AMA OKUNAN ŞEY ÇOK KÜÇÜK: satır başına ÜÇ skaler alan, hiç `include`
 * yok. 5898 kalem ≈ 0,2 MB — ekranın çektiği 10,1 MB'ın yanında yok
 * hükmünde. Ölçüldü ve bu dosyanın altında yazıyor.
 *
 * ⛔ AÇILIŞ ŞARTI YAZILI: kalem sayısı ~200 bini geçtiğinde bu okuma da
 * pahalıya döner. O gün çözüm `SaleItem`e `lineTotalAmount` sütunu eklemek
 * ve `_sum` ile toplamaktır — ama BUGÜN eklemek, tüketicisi doğmadan sütun
 * açmak olurdu (anayasa: "kaydetme kararı tüketicisi doğduğunda verilir").
 */
async function ciroParaBirimine(
  kosul: Prisma.SaleWhereInput,
): Promise<ParaToplami[]> {
  const kalemler = await prisma.saleItem.findMany({
    where: { sale: kosul },
    select: { quantity: true, unitPriceAmount: true, unitPriceCurrency: true },
  });
  const harita = new Map<string, number>();
  for (const k of kalemler) {
    const tutar = Number(k.unitPriceAmount.toString()) * k.quantity;
    harita.set(k.unitPriceCurrency, (harita.get(k.unitPriceCurrency) ?? 0) + tutar);
  }
  return toplamlariBirlestir([
    [...harita.entries()].map(([paraBirimi, tutar]) => ({ paraBirimi, tutar })),
  ]);
}

export type SatisToplamlari = {
  ciro: SuzgecToplamSonucu;
  adet: { toplam: number; haric: number; sayi: number; haricSayi: number };
  net: { toplam: ParaToplami[]; eksikSayi: number };
  /** Süzgece giren TOPLAM kayıt sayısı — sayfalamanın paydası. */
  kayitSayisi: number;
};

/**
 * Süzgecin TAMAMININ toplamları. Sayfa numarasından bağımsızdır.
 *
 * @param kosul `satisKosulu()` çıktısı — ekranın ve Excel'in kullandığının
 *              AYNISI. Ayrı bir koşul kurulsaydı liste bir şey, toplam başka
 *              şey söylerdi (bkz. `liste-suzgeci.ts` başlığı).
 */
export async function satisToplamlari(
  kosul: Prisma.SaleWhereInput,
): Promise<SatisToplamlari> {
  const giren = iptalsiz(kosul);
  const haric = yalnizIptalli(kosul);

  const [
    kayitSayisi,
    girenSayi,
    haricSayi,
    girenCiro,
    haricCiro,
    girenAdet,
    haricAdet,
    netler,
    eksikSayi,
  ] = await Promise.all([
    prisma.sale.count({ where: kosul }),
    prisma.sale.count({ where: giren }),
    prisma.sale.count({ where: haric }),
    ciroParaBirimine(giren),
    ciroParaBirimine(haric),
    prisma.saleItem.aggregate({ where: { sale: giren }, _sum: { quantity: true } }),
    prisma.saleItem.aggregate({ where: { sale: haric }, _sum: { quantity: true } }),
    /**
     * NET-2 — para birimi başına. `profitCurrency` null olabilir; o kayıtlar
     * zaten `CALCULATED` değildir ve aşağıdaki `eksikSayi`ya düşer.
     */
    prisma.sale.groupBy({
      by: ["profitCurrency"],
      where: {
        AND: [giren, { profitStatus: "CALCULATED" }, { net2Amount: { not: null } }],
      },
      _sum: { net2Amount: true },
    }),
    /**
     * ⛔ SESSİZ VARSAYIM YOK: kârı hesaplanamamış satış toplama GİRMEZ ve
     * kaç tanesinin dışarıda kaldığı EKRANDA yazar. Girseydi "0" sayılır ve
     * NET olduğundan küçük görünürdü.
     */
    prisma.sale.count({
      where: {
        AND: [
          giren,
          { OR: [{ profitStatus: { not: "CALCULATED" } }, { net2Amount: null }] },
        ],
      },
    }),
  ]);

  return {
    ciro: {
      toplam: girenCiro,
      haric: haricCiro,
      sayi: girenSayi,
      haricSayi,
    },
    adet: {
      toplam: girenAdet._sum.quantity ?? 0,
      haric: haricAdet._sum.quantity ?? 0,
      sayi: girenSayi,
      haricSayi,
    },
    net: {
      toplam: toplamlariBirlestir([
        netler
          .filter((n) => n.profitCurrency !== null && n._sum.net2Amount !== null)
          .map((n) => ({
            paraBirimi: n.profitCurrency as string,
            tutar: Number(n._sum.net2Amount!.toString()),
          })),
      ]),
      eksikSayi,
    },
    kayitSayisi,
  };
}
