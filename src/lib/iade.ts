import { sonSayimTarihleri, sayimGecersizlestir } from "./sayim-damgasi";
import { izYaz } from "@/lib/iz";
import {
  israrGecerliMi,
  sayimKorumasi,
  type SayimIsrari,
} from "./sayim-korumasi";
import { SayimKorumasiHatasi } from "./satis";
import { acikCikislar, kalemMaliyeti } from "@/lib/kalem-maliyeti";
import { GENEL_KDV_ORANI, kdvAyir, type KarDurumu } from "@/lib/kar";
import { prisma, type IslemIstemcisi } from "@/lib/prisma";
import { donenMalDagilimi } from "@/lib/iade/yanlis-urun";
import { acikPartiler, fifoDagit, gunSonu, type Parti } from "@/lib/stok";

import type { Currency, ReturnType } from "@/generated/prisma/enums";
import {
  donemKapisi,
  donemIstisnaIzi,
  DONEM_ISTISNA_EYLEMI,
} from "@/lib/donem-kapisi";
import type { DonemIsrari } from "@/lib/donem-korumasi";

/**
 * ============================================================================
 *  İADE MOTORU
 * ----------------------------------------------------------------------------
 *  ORİJİNAL SATIŞ SNAPSHOT'I DEĞİŞMEZ. İadenin getirdiği her para hareketi
 *  AYRI satır olarak yazılır; satış detayı "orijinal kâr + iade etkisi =
 *  iade sonrası net" gösterir.
 *
 *  KESİNTİ İADESİ (teyitli 09.08.2026):
 *    GERİ GELİR  : komisyon (KDV'si dahil — tek tutar olarak tutuluyor),
 *                  %0,8 ödeme gideri, stopaj — hepsi ADET ORANINDA
 *    GERİ GELMEZ : 12,60 hizmet bedeli, 13,19 sabit gider, GİDİŞ kargosu
 *
 *  ÜÇ SENARYO:
 *    UNDELIVERED — müşteriye ulaşmadı. Gelir ve kesintiler geri gelir,
 *                  mal stoğa döner. Gidiş kargosu yanar, ek kargo yok.
 *    NORMAL      — aynısı + dönüş kargosu satıcı gideri.
 *    DISPUTED    — itiraz KABUL edildi: satış AYAKTA kalır. Gelir düşmez,
 *                  komisyon geri GELMEZ, mal stoğa GİRMEZ. Yalnızca
 *                  katlanılan giderler yazılır (kargo, yeniden gönderim,
 *                  ceza).
 *
 *  İŞARET KURALI: pozitif = satıcıya geri gelen, negatif = gider.
 * ============================================================================
 */

/** Satışın iade edilebilir kalem bilgisi — hesap için gereken her şey. */
export type IadeKalemGirdisi = {
  /** Satıştaki toplam adet — oranlama paydası. */
  satilanAdet: number;
  /** İade edilen adet. */
  iadeAdedi: number;
  /** Stoğa dönen (sağlam) adet. Hasarlı olan buraya girmez. */
  saglamAdet: number;

  /** KDV DAHİL satış tutarı (kalemin tamamı). */
  satisTutari: number;
  /** KDV DAHİL toplam maliyet (kalemin tamamı). Bilinmiyorsa null. */
  maliyet: number | null;
  /** Kalemin KDV oranı (%) — satış anındaki snapshot. */
  kdvOrani: number;

  /** Satışta kesilen komisyon (KDV DAHİL, kalemin tamamı). */
  komisyon: number;

  /** Değişimde giden ürünün maliyeti (KDV DAHİL). Yoksa null. */
  degisimMaliyeti: number | null;
};

export type IadeGirdisi = {
  returnType: ReturnType;
  kalemler: IadeKalemGirdisi[];

  /** Satışta kesilen ödeme gideri (sipariş geneli, KDV DAHİL). */
  odemeGideri: number;
  /** Sipariş toplam tutarı — ödeme giderini kaleme paylaştırmak için. */
  siparisToplami: number;

  /** KDV DAHİL, satıcı gideri. */
  iadeKargosu: number | null;
  yenidenGonderimKargosu: number | null;
  ceza: number | null;
};

export type IadeSatiri = { code: string; tutar: number };

export type IadeSonucu = {
  durum: KarDurumu;
  /** Kalem başına satırlar — sırayla girdideki kalemlere karşılık gelir. */
  kalemSatirlari: IadeSatiri[][];
  /** İade geneli satırlar (kargo, ceza). */
  genelSatirlar: IadeSatiri[];
  /** Ödenecek KDV'deki DEĞİŞİM. Pozitif = daha fazla KDV ödenir. */
  odenecekKdvDegisimi: number;
  /** İadenin NET-1'e etkisi (KDV hariç bakış). */
  net1Etkisi: number;
  /** net1Etkisi − ödenecek KDV değişimi. */
  net2Etkisi: number;
};

/**
 * İade etkisini hesaplar. Veritabanına GİTMEZ; aynı girdiyle her zaman aynı
 * çıktıyı üretir, bu yüzden `iade:dogrula` ile birebir sınanabilir.
 */
/**
 * ---------------------------------------------------------------------------
 *  ÖNİZLEME İLE KAYIT AYNI KAYNAKTAN BESLENİR
 * ---------------------------------------------------------------------------
 *  14.08.2026: önizleme ve kayıt `iadeEtkisiHesapla`yı paylaşıyordu ama ona
 *  verilen GİRDİYİ iki yerde ayrı ayrı kuruyordu. Aynı kodun iki kopyası,
 *  biri düzeltilip diğeri unutulduğunda ekranın kaydettiğinden başka bir
 *  rakam göstermesi demektir — kullanıcı yanlış rakama bakarak karar verir.
 *  Bu yüzden girdiyi üreten parçalar buraya çıkarıldı ve İKİ TARAF DA
 *  bunları çağırıyor.
 */

/**
 * Satış kaleminin TOPLAM maliyeti. Biri maliyetsizse `null` — uydurulmaz.
 *
 * ⚠ 17.08.2026: burada `Math.abs` vardı ve çağıranların üçü de sorguyu
 * `type: "SALE_OUT"` ile süzüyordu. Adet azaltmada yazılan ayna giriş
 * (ADJUSTMENT) hem süzgece takılıyor hem işareti yutuluyordu: satış
 * 11513025054 tek adete indirildiği hâlde İKİ adetlik maliyetle
 * hesaplandı ve +₺695 kâr, −₺1.304 zarar göründü.
 *
 * Kural tek yere alındı: `lib/kalem-maliyeti.ts`. Bu sarmalayıcı yalnız
 * Prisma tipini saf tipe çeviriyor.
 */
export function satisCikisMaliyeti(
  hareketler: {
    quantityDelta: number;
    unitCostAmount: { toString(): string } | null;
  }[],
): number | null {
  return kalemMaliyeti(
    hareketler.map((h) => ({
      quantityDelta: h.quantityDelta,
      birimMaliyet: h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
      birimMaliyetParaBirimi: null,
    })),
  ).maliyet;
}

/** Prisma hareketlerini `acikCikislar`a verip AÇIK olanları döndürür. */
function acikKalemCikislari<
  T extends { quantityDelta: number; unitCostAmount: { toString(): string } | null },
>(hareketler: T[]) {
  return acikCikislar(
    hareketler.map((h) => ({
      ...h,
      birimMaliyet: h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
    })),
  );
}

/** Kalemin komisyon toplamı. */
export function komisyonToplami(
  kesintiler: { code: string; amount: { toString(): string } }[],
): number {
  return kesintiler
    .filter((f) => f.code === "KOMISYON")
    .reduce((t, f) => t + Number(f.amount.toString()), 0);
}

/** FIFO dağıtımının para karşılığı — değişimde çıkan malın maliyeti. */
export function fifoMaliyeti(
  dagitim: { parti: { birimMaliyet: string | null }; adet: number }[],
): number {
  return dagitim.reduce(
    (t, p) => t + Number(p.parti.birimMaliyet ?? 0) * p.adet,
    0,
  );
}

export function iadeEtkisiHesapla(girdi: IadeGirdisi): IadeSonucu {
  // İtiraz kabul edilmişse satış ayakta: gelir ve kesintiler geri gelmez.
  const geriGelir = girdi.returnType !== "DISPUTED";

  const kalemSatirlari: IadeSatiri[][] = [];
  let durum: KarDurumu = "CALCULATED";

  // KDV bileşenlerindeki değişim — S6 VARSAYIMI (muhasebeci teyidi bekliyor):
  // iade edilen kalemin KDV bileşenleri adet oranında TERS işlenir.
  // Teyit sonrası değişirse SADECE bu blok düzeltilir.
  let satisKdvIadesi = 0; // satış KDV'si azalır -> ödenecek KDV azalır
  let komisyonKdvIptali = 0; // komisyon KDV indirimi iptal -> ödenecek artar
  let odemeGideriKdvIptali = 0;
  let kargoKdvIndirimi = 0; // iade kargoları indirilir -> ödenecek azalır

  for (const kalem of girdi.kalemler) {
    const satirlar: IadeSatiri[] = [];

    if (kalem.satilanAdet <= 0) {
      durum = "RULE_MISSING";
      kalemSatirlari.push(satirlar);
      continue;
    }

    // Kısmi iadede her şey ADET ORANINDA.
    const oran = kalem.iadeAdedi / kalem.satilanAdet;
    const saglamOran = kalem.saglamAdet / kalem.satilanAdet;

    /**
     * DEĞİŞİM Mİ, İADE Mİ — kâr davranışları FARKLIDIR.
     * _Kullanıcı teyidi 13.08.2026._
     *
     *   İADE   : müşteri parasını geri alır → ciro DÜŞER, komisyon geri gelir
     *   DEĞİŞİM: pazaryeri siparişi AÇIK tutar, para SATICIDA KALIR →
     *            ciro ve komisyon DURUR; tek gider git-gel kargo (+ceza)
     *
     * Eskiden ikisi de "NORMAL iade" sayılıyordu ve değişimde de ciro
     * siliniyordu: 2.980 TL'lik bir değişim, satış ayakta olmasına rağmen
     * 2.980 TL gelir kaybı yazıyordu. Kanal marjını olduğundan kötü
     * gösteren sessiz bir hataydı.
     *
     * Ayrım kalem bazındadır: bir siparişte bir kalem iade, başka kalem
     * değişim olabilir.
     */
    const degisimMi = kalem.degisimMaliyeti !== null;

    if (geriGelir && !degisimMi) {
      const kayipGelir = kalem.satisTutari * oran;
      satirlar.push({ code: "KAYIP_GELIR", tutar: -kayipGelir });
      satisKdvIadesi += kdvAyir(kayipGelir, kalem.kdvOrani);

      const komisyonIade = kalem.komisyon * oran;
      if (komisyonIade > 0) {
        satirlar.push({ code: "KOMISYON_IADE", tutar: komisyonIade });
        komisyonKdvIptali += kdvAyir(komisyonIade, GENEL_KDV_ORANI);
      }

      // Ödeme gideri sipariş genelidir; kalemin sipariş içindeki payı kadar.
      if (girdi.odemeGideri > 0 && girdi.siparisToplami > 0) {
        const pay =
          girdi.odemeGideri *
          ((kalem.satisTutari * oran) / girdi.siparisToplami);
        satirlar.push({ code: "ODEME_GIDERI_IADE", tutar: pay });
        odemeGideriKdvIptali += kdvAyir(pay, GENEL_KDV_ORANI);
      }

      // Stopaj: KDV hariç tutarın %1'i, adet oranında.
      const stopajIade =
        ((kalem.satisTutari * oran) / (1 + kalem.kdvOrani / 100)) * 0.01;
      satirlar.push({ code: "STOPAJ_IADE", tutar: stopajIade });
    }

    // MALİYET, DEĞİŞİMDE DE GERİ GELİR — bu blok gelir bloğunun DIŞINDA.
    // Gerekçe: ciro değişimde durur ama ESKİ MAL FİZİKEN DÖNER. Maliyeti
    // gelirle birlikte dondursaydık, geri gelen malın maliyeti hiç
    // sayılmaz ve değişim olduğundan kârlı görünürdü.
    // DISPUTED'ta blok hiç çalışmaz: ürün müşteride kalır (geriGelir=false).
    if (geriGelir) {
      // Maliyet SADECE stoğa dönen (sağlam) adet kadar geri gelir.
      // Hasarlı mal stoğa girmez; maliyeti satıcıda kalır.
      //
      // SIFIR DA YAZILIR — 13.08.2026 dersi. Eskiden sağlam adet 0'ken bu
      // satır hiç oluşmuyordu ve önizlemede GÖRÜNMÜYORDU. Kullanıcı bir TY
      // iadesini hasarlı kaydetti, 1.799 TL maliyet üstünde kaldı, kanal
      // NET-2'si −806,20'ye düştü ve "hesaplamada hata var" dedi. Hesap
      // doğruydu; EKSİK OLAN AÇIKLAMAYDI. Sessiz yokluk yerine açık sıfır:
      // satır durur, tutarı 0,00'dır, ekran nedenini yazar.
      if (kalem.maliyet === null) {
        durum = "NO_COST";
      } else {
        /**
         * MALİYET İKİ SATIRA AYRILIR — 14.08.2026 kullanıcı bulgusu.
         *
         * Eskiden tek satır vardı: `maliyet × sağlamOran`. Hasarlıya düşen
         * maliyet HİÇBİR YERE YAZILMIYORDU; "stoğa dönmeyen maliyet" kutusu
         * onu dönen maliyetten türetmeye çalışıyor ve sağlam adet 0'ken
         * SIFIR gösteriyordu. Kullanıcının iki iadesi de tamamen hasarlıydı;
         * ekran "maliyeti üstünüzde kaldı" yazıp yanına ₺0,00 koyuyordu.
         * Kaynak üretilmediği için türetecek bir şey de yoktu.
         *
         * AYRIŞTIRMA, EK YÜK DEĞİL: iki satırın TOPLAMI eski tek satırla
         * BİREBİR AYNIDIR (tam × iadeOranı − tam × hasarlıOranı =
         * tam × sağlamOran). NET-1 ve NET-2 DEĞİŞMEZ; yalnız paranın nereye
         * gittiği görünür olur. Negatif satırı eski satırın üstüne eklemek
         * zararı İKİ KEZ sayardı — net satırların toplamıdır.
         */
        const hasarliOran = oran - saglamOran;

        satirlar.push({
          code: "MALIYET_GERI",
          tutar: kalem.maliyet * oran,
        });

        // SIFIR DA YAZILIR (aynı 13.08.2026 dersi): hasar yokken satır
        // 0,00 olarak durur ki "hiç hasar yok" ile "hesaplanmadı" ayrışsın.
        satirlar.push({
          code: "MALIYET_DONMEYEN",
          tutar: -(kalem.maliyet * hasarliOran),
        });
      }
    }

    /**
     * ⚠ DEĞİŞİM MALİYETİ ARTIK BURADA YAZILMIYOR — K36a, 23.08.2026.
     *
     * Eskiden şu satır vardı:
     *     satirlar.push({ code: "DEGISIM_MALIYET", tutar: -kalem.degisimMaliyeti })
     * ve yorumu şuydu: _"Değişim: yerine giden ürünün maliyeti her senaryoda
     * giderdir."_ Gider olduğu doğruydu; YERİ yanlıştı.
     *
     * MİMAR KARARI: değişim maliyeti **SATIŞIN** NET'ine yazılır, iadenin
     * değil. _Gerekçe: değişim o satışı kurtarmanın bedelidir; ayrı cebe
     * konursa satış kârlı görünür, değildir._ Hurdadan farkı da böyle
     * konuldu: hurdada satış ÖLDÜ (dönem kalemi), değişimde satış YAŞIYOR.
     *
     * NASIL: `EXCHANGE_OUT` hareketi artık `saleItemId` taşıyor ve
     * `kalemMaliyeti` tip bakmadan topladığı için maliyet kendiliğinden
     * satışın NET'ine giriyor.
     *
     * ⚠ BU SATIR KALSAYDI AYNI LİRA İKİ KEZ SAYILIRDI — bir kez satışın
     * maliyetinde (hareket üzerinden), bir kez burada. Kaldırma ile bağ
     * ekleme AYNI pakette yapılmak zorundaydı.
     *
     * ⚠ KARGO HENÜZ TAŞINMADI (K36b): değişimin yeniden gönderim kargosu
     * hâlâ AŞAĞIDA, iadenin NET'inde. `SaleFee` satırları her yeniden
     * hesapta silinip motor tarafından yeniden üretildiği için kargo ancak
     * motorun kendisi iadeleri okursa satışa taşınabilir. Geçici tutarsızlık
     * BİLEREK görünür: ekranda pirinç kesikli satır bunu söylüyor.
     */

    kalemSatirlari.push(satirlar);
  }

  // ------------------------- İADE GENELİ -------------------------
  const genelSatirlar: IadeSatiri[] = [];

  if (girdi.iadeKargosu !== null && girdi.iadeKargosu > 0) {
    genelSatirlar.push({ code: "IADE_KARGO", tutar: -girdi.iadeKargosu });
    kargoKdvIndirimi += kdvAyir(girdi.iadeKargosu, GENEL_KDV_ORANI);
  }
  if (
    girdi.yenidenGonderimKargosu !== null &&
    girdi.yenidenGonderimKargosu > 0
  ) {
    genelSatirlar.push({
      code: "YENIDEN_GONDERIM_KARGO",
      tutar: -girdi.yenidenGonderimKargosu,
    });
    kargoKdvIndirimi += kdvAyir(girdi.yenidenGonderimKargosu, GENEL_KDV_ORANI);
  }
  // Ceza pazaryeri kesintisidir; KDV'li bir hizmet bedeli değildir.
  if (girdi.ceza !== null && girdi.ceza > 0) {
    genelSatirlar.push({ code: "CEZA", tutar: -girdi.ceza });
  }

  const net1Etkisi =
    kalemSatirlari.flat().reduce((t, s) => t + s.tutar, 0) +
    genelSatirlar.reduce((t, s) => t + s.tutar, 0);

  const odenecekKdvDegisimi =
    -satisKdvIadesi +
    komisyonKdvIptali +
    odemeGideriKdvIptali -
    kargoKdvIndirimi;

  return {
    durum,
    kalemSatirlari,
    genelSatirlar,
    odenecekKdvDegisimi,
    net1Etkisi,
    net2Etkisi: net1Etkisi - odenecekKdvDegisimi,
  };
}

// ---------------------------------------------------------------------------
//  CEZA TARİFESİ ÖNERİSİ
// ---------------------------------------------------------------------------

/**
 * Sipariş tutarına düşen ceza kademesini bulur.
 * Kademesi yoksa null döner — ekran "elle girin" der, uydurma yapılmaz.
 * (Hepsiburada'da 6.000 TL üstü böyle: pazaryeri "değişen oran" diyor.)
 */
export async function cezaOnerisi(
  channelId: string,
  siparisTutari: number,
  tarih: Date,
): Promise<number | null> {
  const kademe = await prisma.penaltyTariff.findFirst({
    where: {
      channelId,
      orderAmountUpTo: { gte: String(siparisTutari) },
      effectiveFrom: { lte: tarih },
    },
    orderBy: [{ orderAmountUpTo: "asc" }, { effectiveFrom: "desc" }],
    select: { amount: true },
  });
  return kademe ? Number(kademe.amount.toString()) : null;
}

// ---------------------------------------------------------------------------
//  KAYIT — TEK TRANSACTION
// ---------------------------------------------------------------------------

export type IadeKaydiGirdisi = {
  saleId: string;
  code: string | null;
  returnType: ReturnType;
  occurredAt: Date;
  note: string | null;
  /** Kaydı giren kullanıcı. Oturumdan gelir, formdan DEĞİL. */
  userId: string | null;
  /**
   * Değişim ürününün müşteriye teslim tarihi — hakediş vadesi buradan
   * yeniden başlar. Değişim yoksa null.
   */
  degisimTeslimTarihi: Date | null;
  iadeKargosu: number | null;
  yenidenGonderimKargosu: number | null;
  ceza: number | null;
  cezaNotu: string | null;
  /**
   * ⭐ SAYIM KAPISI ISRARI — İADE BAŞINA (kalem başına DEĞİL).
   * Kapıyı tetikleyen şey TARİH ve iadenin tek tarihi var.
   */
  sayimIsrari?: SayimIsrari;
  /** ⭐ DÖNEM KAPISI ISRARI (K108) — sayım ısrarından AYRI alan:
   *  biri FİZİKSEL sayıma, öteki AYIN beyanına bağlı bir riski geçiyor. */
  donemIsrari?: DonemIsrari;
  kalemler: {
    saleItemId: string;
    iadeAdedi: number;
    saglamAdet: number;
    hasarliAdet: number;
    hasarNotu: string | null;
    locationId: string | null;
    /** Değişim ürünü — doluysa EXCHANGE_OUT hareketi oluşur. */
    exchangeVariantId: string | null;
    /**
     * 6. SENARYO — YANLIŞ ÜRÜN GÖNDERİLDİ.
     *
     * Dolu ve satılan varyanttan FARKLIYSA, geri dönen mal satılan mal
     * DEĞİLDİR: A satıldı, B gönderildi, B dönüyor, A gidiyor. O zaman
     * `RETURN_IN` bu varyanta yazılır ve iki taraf da DÜZELTME hareketiyle
     * kapatılır (bkz. lib/iade/yanlis-urun.ts).
     *
     * Boş bırakılırsa akış değişmez: dönen mal satılan maldır.
     */
    donenVaryantId?: string | null;
  }[];
};

export class FazlaIadeHatasi extends Error {
  constructor(
    readonly saleItemId: string,
    readonly kalan: number,
    readonly girilen: number,
  ) {
    super("Fazla iade");
    this.name = "FazlaIadeHatasi";
  }
}

/**
 * 6. senaryoda ters çevrilecek SALE_OUT'un maliyeti yok. Düzeltme partisi
 * maliyetsiz doğarsa o mal bir sonraki satışta "kâr hesaplanamadı" der;
 * sessiz bozulma yerine işlem durur ve sebep söylenir.
 */
export class MaliyetsizSatisHatasi extends Error {
  constructor(readonly variantId: string) {
    super("Satış çıkışının maliyeti yok");
    this.name = "MaliyetsizSatisHatasi";
  }
}

/**
 * SEVKİYAT HATASI NEDENİ — ADIYLA DEĞİL `systemKey` İLE BULUNUR.
 *
 * Neden adı kullanıcıya aittir ve "Düzeltme nedenleri" ekranından
 * değiştirilebilir; koda ad gömülse, kullanıcı adı düzelttiği an 6. senaryo
 * sessizce çalışmaz olurdu.
 *
 * YOKSA AÇILIR (idempotent): sistem nedeni, kullanıcının silmesine ya da
 * seed'in atlanmasına bağlı kalmamalı. Açılan kayıt neden listesinde
 * görünür; adı değiştirilebilir, `systemKey` sabit kalır.
 */
async function sevkiyatHatasiNedeniId(tx: IslemIstemcisi): Promise<string> {
  const mevcut = await tx.stockAdjustmentReason.findUnique({
    where: { systemKey: "SEVKIYAT_HATASI" },
    select: { id: true },
  });
  if (mevcut) return mevcut.id;

  const yeni = await tx.stockAdjustmentReason.create({
    data: {
      name: "Sevkiyat hatası (yanlış ürün)",
      systemKey: "SEVKIYAT_HATASI",
      movementType: "ADJUSTMENT",
      requiresNote: false,
    },
    select: { id: true },
  });
  return yeni.id;
}

/**
 * GERİ GELEN MALIN MALİYETİ BİLİNMİYOR — stok yetersizliği DEĞİLDİR.
 *
 * B'nin sistemde hiç maliyetli hareketi yoksa (ürün hiç alınmamış) geri gelen
 * malı değerlendiremeyiz. Sıfırla yazmak envanteri sessizce eksiltirdi;
 * durdurup DOĞRU ürünü ve DOĞRU çözümü söylüyoruz.
 */
export class DonenMaliyetYokHatasi extends Error {
  constructor(readonly variantId: string) {
    super("Geri gelen ürünün maliyeti bilinmiyor");
    this.name = "DonenMaliyetYokHatasi";
  }
}

export class DegisimStokYokHatasi extends Error {
  constructor(
    readonly variantId: string,
    readonly istenen: number,
    readonly mevcut: number,
  ) {
    super("Değişim ürününde stok yok");
    this.name = "DegisimStokYokHatasi";
  }
}

/**
 * İadeyi kaydeder: stok hareketleri, iade etkisi ve kesinti satırları
 * TEK TRANSACTION içinde yazılır. Yarım iade kaydı oluşamaz.
 */
export async function iadeKaydet(girdi: IadeKaydiGirdisi): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const satis = await tx.sale.findUnique({
      where: { id: girdi.saleId },
      include: {
        channelAccount: { select: { channelId: true } },
        items: {
          include: {
            fees: true,
            returnItems: { select: { quantity: true } },
            /**
             * SÜZGEÇ YOK — kaleme bağlı TÜM hareketler. Maliyet işaretli
             * toplamdan, stoğa dönecek mal `acikCikislar`tan çözülür.
             */
            stockMovements: {
              orderBy: { createdAt: "asc" },
              select: {
                quantityDelta: true,
                unitCostAmount: true,
                unitCostCurrency: true,
              },
            },
          },
        },
        fees: { where: { saleItemId: null } },
      },
    });
    if (!satis) throw new Error("Satış bulunamadı");

    /**
     * ═══════════════════════════════════════════════════════════════════
     *  İPTAL EDİLMİŞ SATIŞA İADE YAPILAMAZ (17.08.2026)
     * -------------------------------------------------------------------
     *  Kural İKİ YÖNLÜ olmak zorunda. Diğer yönü `lib/satis-iptali.ts`te:
     *  iadesi olan satış iptal edilemez. Bu yön olmasaydı aynı çelişki ters
     *  kapıdan girerdi — önce iptal edilip stoğu geri gelen bir satışa iade
     *  işlenir, mal İKİNCİ KEZ stoğa girer ve envanter sessizce şişerdi.
     *
     *  Bu kontrol aynı zamanda `iptal-bekci.ts`teki
     *  `iade/actions.ts:saleItem.findMany` beyanının DAYANAĞIDIR: iptalli
     *  satış iade akışına hiç giremediği için o sorgunun süzgece ihtiyacı
     *  yoktur. Beyan bir garantiye dayanıyorsa garanti kodda DURMALIDIR.
     * ═══════════════════════════════════════════════════════════════════
     */
    if (satis.iptalTarihi !== null) {
      throw new Error("İptal edilmiş satışa iade işlenemez");
    }

    const kanalId = satis.channelAccount.channelId;
    const paraBirimi: Currency = satis.profitCurrency ?? "TRY";

    // --- girdi doğrulaması: daha önce iade edilen adetler düşülür ---
    const kalemHaritasi = new Map(satis.items.map((k) => [k.id, k]));
    for (const g of girdi.kalemler) {
      const kalem = kalemHaritasi.get(g.saleItemId);
      if (!kalem) throw new Error("İade edilen kalem bulunamadı");
      const oncekiIade = kalem.returnItems.reduce((t, r) => t + r.quantity, 0);
      const kalan = kalem.quantity - oncekiIade;
      if (g.iadeAdedi > kalan) {
        throw new FazlaIadeHatasi(g.saleItemId, kalan, g.iadeAdedi);
      }
    }

    // --- ödeme gideri (sipariş geneli) ---
    const odemeGideri = satis.fees
      .filter((f) => f.code === "ODEME_GIDERI")
      .reduce((t, f) => t + Number(f.amount.toString()), 0);
    const siparisToplami = satis.items.reduce(
      (t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity,
      0,
    );

    /**
     * ═══ SAYIM KAPISI ══════════════════════════════════════════════════════
     *
     * ⭐ ANAYASA: **FİZİKSEL SAYIM SON SÖZDÜR.** İade tarihi kullanıcıdan
     * geliyor (`girdi.occurredAt`), yani sayımdan ÖNCEYE yazılabilir.
     *
     * ⚠ İADE HER İKİ YÖNDE DE HAREKET YAZAR ve ikisi de sayımı bozar:
     *  · `RETURN_IN` (+)    → geri dönen mal; sayan kişi onu ZATEN saymışsa
     *                         aynı mal ikinci kez eklenir, stok ŞİŞER
     *  · `EXCHANGE_OUT` (−) → giden değişim ürünü; sayılmış malı YOK EDER
     *
     * ⚠ VE KAPI İKİ YÖNÜ DE AYRI ÖLÇER — tek varyantta ikisi birden
     * olabiliyor (yanlış ürün senaryosu: A gidiyor, B dönüyor).
     *
     * ⛔ ISRAR İADE BAŞINA: kapıyı tetikleyen şey TARİH ve iadenin tek
     * tarihi var. (Kalem başına sorulsaydı aynı soru defalarca sorulurdu.)
     */
    {
      const yonler = new Map<string, number>();
      const ekle = (variantId: string, adet: number) => {
        yonler.set(variantId, (yonler.get(variantId) ?? 0) + adet);
      };
      for (const g of girdi.kalemler) {
        const kalem = kalemHaritasi.get(g.saleItemId)!;
        /** Geri dönen mal — `donenVaryantId` doluysa o, yoksa satılan. */
        ekle(g.donenVaryantId || kalem.variantId, g.saglamAdet);
        /** Giden değişim ürünü — stoktan düşer. */
        if (g.exchangeVariantId) ekle(g.exchangeVariantId, -g.iadeAdedi);
      }
      const sonSayimlar = await sonSayimTarihleri(tx, [...yonler.keys()]);
      const duraksayanlar: {
        variantId: string;
        yon: "ARTIRAN" | "DUSUREN";
        sayimTarihi: Date;
      }[] = [];
      for (const [variantId, adet] of yonler) {
        const karar = sayimKorumasi({
          sonSayimIsTarihi: sonSayimlar.get(variantId) ?? null,
          hareketIsTarihi: girdi.occurredAt,
          adet,
        });
        if (karar.sonuc === "DURAKSA") {
          duraksayanlar.push({
            variantId,
            yon: karar.yon,
            sayimTarihi: karar.sayimTarihi,
          });
        }
      }
      /**
       * ═══ DÖNEM KAPISI (K108) — sayım kapısının yanında, ondan AYRI ═══
       */
      const donemSonucu = await donemKapisi(tx, girdi.occurredAt, girdi.donemIsrari);
      if (donemSonucu.durum === "ISRARLA_GECILDI") {
        /**
         * ⛔ İZ ORTAK GÖVDEDEN — `userId` KENDİLİĞİNDEN DAMGALANIR (K90).
         * İSTISNA İZLERİ ÖZELLİKLE ÖNEMLİ: bunlar bir insanın uyarıyı AŞTIĞINI
         * kaydeder. "Kim" yazılmazsa üç ay sonra "bunu neden geçmişiz"
         * sorusunun cevabı yarım kalır.
         */
        await izYaz({
          action: DONEM_ISTISNA_EYLEMI,
          /**
           * ⚠ HEDEF `Sale` — komşu sayım izi de aynı hedefi kullanıyor.
           * İade kaydı bu noktada HENÜZ YOK (kapı yazmadan ÖNCE koşmak
           * zorunda); satış kimliği ise girdide hazır ve iadenin ait
           * olduğu kaydı zaten o gösteriyor.
           */
          targetType: "Sale",
          targetId: girdi.saleId,
          detail: donemIstisnaIzi({
            yol: "/iadeler — iade kaydı",
            donem: donemSonucu.donem,
            isTarihi: girdi.occurredAt,
            israr: girdi.donemIsrari,
          }),
        },
          tx);
      }

      if (duraksayanlar.length > 0) {
        /** ⛔ SUNUCU EKRANA GÜVENMEZ — aynı saf gövde burada da koşuyor. */
        const g = israrGecerliMi(
          girdi.sayimIsrari ?? { onaylandi: false, sebep: null, aciklama: "" },
        );
        if (!g.gecerli) throw new SayimKorumasiHatasi(duraksayanlar, g.eksik);
        /**
         * ⚠ İSTİSNA GEÇTİ — İZ İKİ YERE, VE İŞLEM İÇİNDE. İade geri
         * sarılırsa damga da sarılmalı.
         */
        const an = new Date();
        await sayimGecersizlestir(
          tx,
          duraksayanlar.map((x) => x.variantId),
          an,
        );
        /**
         * ⛔ İZ ORTAK GÖVDEDEN — `userId` KENDİLİĞİNDEN DAMGALANIR (K90).
         * İSTISNA İZLERİ ÖZELLİKLE ÖNEMLİ: bunlar bir insanın uyarıyı AŞTIĞINI
         * kaydeder. "Kim" yazılmazsa üç ay sonra "bunu neden geçmişiz"
         * sorusunun cevabı yarım kalır.
         */
        await izYaz({
          action: "SAYIM_KORUMASI_ISTISNASI",
          targetType: "Sale",
          targetId: girdi.saleId,
          detail: JSON.stringify({
            yol: "/satislar/[id]/iade",
            occurredAt: girdi.occurredAt.toISOString(),
            sebep: girdi.sayimIsrari?.sebep ?? null,
            aciklama: girdi.sayimIsrari?.aciklama.trim() || null,
            duraksayanlar,
            sonuc: "SAYIM GECERSIZLESTI — bu varyantlar yeniden sayilmali.",
          }),
        },
          tx);
      }
    }

    // --- hesap girdisi ---
    const hesapKalemleri: IadeKalemGirdisi[] = [];
    // Değişim maliyetleri FIFO'dan okunacak; plan önce hesaplanır.
    const degisimPlanlari = new Map<
      string,
      { parti: Parti; adet: number }[]
    >();

    for (const g of girdi.kalemler) {
      const kalem = kalemHaritasi.get(g.saleItemId)!;

      const maliyet = satisCikisMaliyeti(kalem.stockMovements);
      const komisyon = komisyonToplami(kalem.fees);

      // --- değişim: yeni ürün FIFO'dan düşer ---
      let degisimMaliyeti: number | null = null;
      if (g.exchangeVariantId) {
        /** ⛔ SINIR: iade gununun sonu — bkz. `gunSonu` (29.08.2026). */
        const partiler = await acikPartiler(tx, g.exchangeVariantId, gunSonu(girdi.occurredAt));
        const dagitim = fifoDagit(partiler, g.iadeAdedi);
        if (!dagitim.yeterliMi) {
          throw new DegisimStokYokHatasi(
            g.exchangeVariantId,
            g.iadeAdedi,
            dagitim.mevcut,
          );
        }
        degisimPlanlari.set(g.saleItemId, dagitim.dagitim);
        degisimMaliyeti = fifoMaliyeti(dagitim.dagitim);
      }

      hesapKalemleri.push({
        satilanAdet: kalem.quantity,
        iadeAdedi: g.iadeAdedi,
        saglamAdet: g.saglamAdet,
        satisTutari: Number(kalem.unitPriceAmount.toString()) * kalem.quantity,
        maliyet,
        kdvOrani: kalem.vatRate ? Number(kalem.vatRate.toString()) : 20,
        komisyon,
        degisimMaliyeti,
      });
    }

    const sonuc = iadeEtkisiHesapla({
      returnType: girdi.returnType,
      kalemler: hesapKalemleri,
      odemeGideri,
      siparisToplami,
      iadeKargosu: girdi.iadeKargosu,
      yenidenGonderimKargosu: girdi.yenidenGonderimKargosu,
      ceza: girdi.ceza,
    });

    // --- iade kaydı ---
    const iade = await tx.return.create({
      data: {
        saleId: girdi.saleId,
        code: girdi.code,
        returnType: girdi.returnType,
        occurredAt: girdi.occurredAt,
        note: girdi.note,
        userId: girdi.userId,
        exchangeDeliveredAt: girdi.degisimTeslimTarihi,
        returnCargoAmount:
          girdi.iadeKargosu === null ? null : String(girdi.iadeKargosu),
        reshipCargoAmount:
          girdi.yenidenGonderimKargosu === null
            ? null
            : String(girdi.yenidenGonderimKargosu),
        cargoCurrency:
          girdi.iadeKargosu === null && girdi.yenidenGonderimKargosu === null
            ? null
            : "TRY",
        penaltyAmount: girdi.ceza === null ? null : String(girdi.ceza),
        penaltyCurrency: girdi.ceza === null ? null : "TRY",
        penaltyNote: girdi.cezaNotu,
        net1Amount: String(sonuc.net1Etkisi),
        net2Amount: String(sonuc.net2Etkisi),
        profitCurrency: paraBirimi,
        profitStatus: sonuc.durum,
        calculatedAt: girdi.occurredAt,
      },
      select: { id: true },
    });

    // --- kalemler + stok hareketleri ---
    for (const [i, g] of girdi.kalemler.entries()) {
      const kalem = kalemHaritasi.get(g.saleItemId)!;

      const iadeKalemi = await tx.returnItem.create({
        data: {
          returnId: iade.id,
          saleItemId: g.saleItemId,
          variantId: kalem.variantId,
          quantity: g.iadeAdedi,
          soundQuantity: g.saglamAdet,
          damagedQuantity: g.hasarliAdet,
          damageNote: g.hasarNotu,
          locationId: g.locationId,
          exchangeVariantId: g.exchangeVariantId,
        },
        select: { id: true },
      });

      /**
       * 6. SENARYO — YANLIŞ ÜRÜN. Dönen mal satılan mal değilse defter İKİ
       * TARAFTA düzeltilir; hepsi bu transaction içinde.
       *
       *   A (satılan) : DÜZELTME +  → "A aslında hiç gitmemişti"
       *   B (dönen)   : DÜZELTME −  → "B fiilen gitti, defterde duruyordu"
       *                 RETURN_IN + → sağlam döndüyse stoğa girer
       *
       * A'nın EXCHANGE_OUT'u aşağıdaki değişim bloğunda yazılıyor
       * (`exchangeVariantId` = A): senaryo 6 bir DEĞİŞİMDİR, ciro DURUR.
       */
      const yanlisUrunMu =
        !!g.donenVaryantId && g.donenVaryantId !== kalem.variantId;
      const donenVaryantId = yanlisUrunMu
        ? g.donenVaryantId!
        : kalem.variantId;

      if (yanlisUrunMu) {
        const nedenId = await sevkiyatHatasiNedeniId(tx);

        /**
         * DÜZELTME + : MALİYET, TERS ÇEVİRDİĞİ SALE_OUT'TAN BİREBİR KOPYALANIR.
         * Kullanıcıya sorulmaz, sıfır varsayılmaz — yoksa yeni parti NO_COST
         * doğar ve o mal bir sonraki satışta "kâr hesaplanamadı" der; depo
         * hatasını düzeltmek kâr motorunu bozardı.
         * _Mimar kilidi 14.08.2026._
         *
         * ÇOK PARTİLİ SATIŞTA PARTİ BAŞINA AYRI SATIR: ortalama maliyet
         * yazmak, iki farklı maliyetli malı tek fiyata eşitlemek olurdu.
         */
        /**
         * AÇIK ÇIKIŞLAR — geri dönmüş mal ikinci kez dönmez. Adedi
         * düşürülmüş bir satışta ham SALE_OUT listesi stoğu şişirirdi.
         */
        for (const cikis of acikCikislar(
          kalem.stockMovements.map((h) => ({
            ...h,
            birimMaliyet:
              h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
          })),
        )) {
          if (cikis.unitCostAmount === null) {
            throw new MaliyetsizSatisHatasi(kalem.variantId);
          }
          await tx.stockMovement.create({
            data: {
              variantId: kalem.variantId,
              type: "ADJUSTMENT",
              quantityDelta: cikis.adet,
              occurredAt: girdi.occurredAt,
              returnItemId: iadeKalemi.id,
              adjustmentReasonId: nedenId,
              unitCostAmount: cikis.unitCostAmount,
              unitCostCurrency: cikis.unitCostCurrency,
            },
          });
        }

        /**
         * B — GERİ GELEN MAL. STOK YETERLİLİĞİ ARANMAZ.
         *
         * 14.08.2026 canlı hatası: burada `fifoDagit` yetmezse
         * `DegisimStokYokHatasi` fırlatılıyordu ve ekran "değişim ürününde
         * stok yok" diyerek B'yi suçluyordu. Kural ve mesaj birlikte
         * yanlıştı; ayrımı `donenMalDagilimi` tutuyor ve `rma:dogrula`
         * onu sınıyor.
         */
        /** ⛔ SINIR: iade gununun sonu — bkz. `gunSonu` (29.08.2026). */
        const bPartileri = await acikPartiler(tx, donenVaryantId, gunSonu(girdi.occurredAt));
        const bMevcut = bPartileri.reduce((t, p) => t + p.kalanAdet, 0);

        /** Maliyeti bilinen SON hareket — FIFO'nun yetmediği giriş için. */
        const sonMaliyetli = await tx.stockMovement.findFirst({
          where: { variantId: donenVaryantId, unitCostAmount: { not: null } },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          select: { unitCostAmount: true, unitCostCurrency: true },
        });

        const dagilim = donenMalDagilimi({
          iadeAdedi: g.iadeAdedi,
          girecekSaglamAdet:
            girdi.returnType === "DISPUTED" ? 0 : g.saglamAdet,
          defterdekiStok: bMevcut,
          sonBilinenMaliyetVarMi: sonMaliyetli !== null,
        });

        /**
         * MALİYET UYDURULMAZ. B'nin hiç maliyetli hareketi yoksa geri gelen
         * malın değeri bilinmiyordur; sıfır yazmak envanteri sessizce
         * eksiltir ve o mal sonraki satışta "kâr hesaplanamadı" der.
         * Bu bir STOK yetersizliği değildir — mesajı da öyle demez.
         */
        if (dagilim.hata === "MALIYET_BILINMIYOR") {
          throw new DonenMaliyetYokHatasi(donenVaryantId);
        }

        /** Girişin maliyet payları: önce çıktığı parti, kalan son maliyet. */
        const girisPaylari: {
          adet: number;
          /** Decimal metin olarak taşınır — iki kaynak tek tipte buluşsun. */
          birimMaliyet: string | null;
          paraBirimi: Currency | null;
        }[] = [];

        // DÜZELTME − : yalnız defterin FAZLA gösterdiği kadar.
        if (dagilim.duzeltmeAdedi > 0) {
          const bDagitim = fifoDagit(bPartileri, dagilim.duzeltmeAdedi);
          if (bDagitim.yeterliMi) {
            for (const pay of bDagitim.dagitim) {
              await tx.stockMovement.create({
                data: {
                  variantId: donenVaryantId,
                  type: "ADJUSTMENT",
                  quantityDelta: -pay.adet,
                  occurredAt: girdi.occurredAt,
                  returnItemId: iadeKalemi.id,
                  adjustmentReasonId: nedenId,
                  sourceMovementId: pay.parti.hareketId,
                  unitCostAmount: pay.parti.birimMaliyet,
                  unitCostCurrency: pay.parti.birimMaliyetParaBirimi,
                },
              });
              girisPaylari.push({
                adet: pay.adet,
                birimMaliyet: pay.parti.birimMaliyet,
                paraBirimi: pay.parti.birimMaliyetParaBirimi,
              });
            }
          }
        }

        if (dagilim.sonMaliyeteDusenAdet > 0 && sonMaliyetli) {
          girisPaylari.push({
            adet: dagilim.sonMaliyeteDusenAdet,
            birimMaliyet: sonMaliyetli.unitCostAmount!.toString(),
            paraBirimi: sonMaliyetli.unitCostCurrency,
          });
        }

        /**
         * RETURN_IN, ÇIKIŞ MALİYETİNİN AYNASI: aynı partiden çıktıysa aynı
         * maliyetle giriyor. Yeni maliyet uydurulsaydı aynı mal defterde iki
         * değerle durur ve envanter değeri sessizce kayardı.
         * Hasarlı kısım HİÇ girmez (maliyeti satıcıda kalır).
         */
        let kalanSaglam = dagilim.girisAdedi;
        for (const pay of girisPaylari) {
          if (kalanSaglam <= 0) break;
          const adet = Math.min(pay.adet, kalanSaglam);
          kalanSaglam -= adet;
          await tx.stockMovement.create({
            data: {
              variantId: donenVaryantId,
              type: "RETURN_IN",
              quantityDelta: adet,
              occurredAt: girdi.occurredAt,
              returnItemId: iadeKalemi.id,
              locationId: g.locationId,
              unitCostAmount: pay.birimMaliyet,
              unitCostCurrency: pay.paraBirimi,
            },
          });
        }
      } else if (girdi.returnType !== "DISPUTED" && g.saglamAdet > 0) {
        // SAĞLAM mal stoğa döner — ama itirazlı iadede ürün müşteride kalır.
        await tx.stockMovement.create({
          data: {
            variantId: kalem.variantId,
            type: "RETURN_IN",
            quantityDelta: g.saglamAdet,
            occurredAt: girdi.occurredAt,
            returnItemId: iadeKalemi.id,
            locationId: g.locationId,
            // Maliyet satıştaki çıkış maliyetinden gelir.
            // AÇIK çıkışın maliyeti — geri dönmüş satır kaynak olamaz.
            unitCostAmount: acikKalemCikislari(kalem.stockMovements)[0]?.unitCostAmount ?? null,
            unitCostCurrency: acikKalemCikislari(kalem.stockMovements)[0]?.unitCostCurrency ?? null,
          },
        });
      }

      // DEĞİŞİM: yerine giden ürün FIFO'dan düşer.
      const degisim = degisimPlanlari.get(g.saleItemId);
      if (degisim) {
        for (const pay of degisim) {
          await tx.stockMovement.create({
            data: {
              variantId: g.exchangeVariantId!,
              type: "EXCHANGE_OUT",
              quantityDelta: -pay.adet,
              occurredAt: girdi.occurredAt,
              /**
               * ⚠ İKİ BAĞ BİRDEN — K36a, 23.08.2026.
               *
               * `saleItemId` YENİ: maliyet bu bağ sayesinde SATIŞIN NET'ine
               * giriyor (`kalemMaliyeti` tip bakmaz, bağ varsa sayar).
               * Karşılığında `DEGISIM_MALIYET` satırı iadenin kâr
               * dökümünden kaldırıldı — yoksa aynı lira iki kez sayılırdı.
               *
               * `returnItemId` KALIYOR: hangi iadeden doğduğu izi kaybolmaz.
               * ⚠ Bu bağ fire raporunda dışlama ölçütü ama burada zararsız:
               * dışlama yalnız `ADJUSTMENT`/`COUNT_CORRECTION` tiplerine
               * bakıyor, `EXCHANGE_OUT` zaten o kümede değil.
               */
              saleItemId: kalem.id,
              returnItemId: iadeKalemi.id,
              sourceMovementId: pay.parti.hareketId,
              locationId: pay.parti.locationId,
              unitCostAmount: pay.parti.birimMaliyet,
              unitCostCurrency: pay.parti.birimMaliyetParaBirimi,
            },
          });
        }
      }

      // --- kalem para satırları ---
      for (const satir of sonuc.kalemSatirlari[i] ?? []) {
        await tx.returnFee.create({
          data: {
            returnId: iade.id,
            returnItemId: iadeKalemi.id,
            code: satir.code,
            amount: String(satir.tutar),
            currency: paraBirimi,
          },
        });
      }
    }

    // --- iade geneli para satırları ---
    for (const satir of sonuc.genelSatirlar) {
      await tx.returnFee.create({
        data: {
          returnId: iade.id,
          code: satir.code,
          amount: String(satir.tutar),
          currency: paraBirimi,
        },
      });
    }

    void kanalId;
    return iade.id;
  });
}
