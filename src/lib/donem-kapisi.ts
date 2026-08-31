import { prisma } from "@/lib/prisma";
import { israrGecerliMi } from "@/lib/sayim-korumasi";
import {
  DONEM_ISRAR_SEBEPLERI,
  donemIsrariniCevir,
  donemKorumasi,
  type DonemAnahtari,
  type DonemIsrari,
  type DonemIsrarSebebi,
} from "@/lib/donem-korumasi";
import { kapaliDonemler, tarihinDonemi } from "@/lib/muhasebe-donemi";

/**
 * ============================================================================
 *  DÖNEM KAPISI — BEŞ YAZIM YOLUNUN ORTAK GÖVDESİ (K108, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ İKİNCİ BİR BAĞLAMA MANTIĞI YAZILMIYOR. `lib/sayim-damgasi.ts` deseni
 *  birebir izleniyor: saf kural ayrı dosyada, kapının UYGULANIŞI burada,
 *  çağıranlar yalnız bu gövdeyi çağırıyor. Sayım korumasında 9 yol bu şekilde
 *  bağlandı ve borç kaydı 0 — desen kanıtlanmış.
 *
 *  ── ⛔ İKİ FARKLI ÇAĞIRAN, İKİ FARKLI DAVRANIŞ ──────────────────────────
 *  · EKRAN (satış · mal kabul · iade · stok düzeltme): kullanıcı var, SORAR.
 *    Israr geçerli değilse `DonemKorumasiHatasi` fırlatır ve ekran ısrar
 *    kutusunu açar.
 *  · BETİK / İÇE AKTARMA: soracak kimse YOK. **ATLAR ve RAPORLAR** — atlanan
 *    satırın kimliğiyle. Sessizce yazmak, kapanmış bir dönemi kimsenin
 *    haberi olmadan bozmak olurdu.
 *  _(Sayım korumasındaki kuralın aynısı: orada da betik soru sormuyor.)_
 *
 *  ── ⚠ AÇIK DÖNEM YOKSA HER ŞEY SERBEST ─────────────────────────────────
 *  Kapalı dönem kümesi boşsa `donemKorumasi` SERBEST döner ve bu gövde de
 *  hiçbir şey yapmaz. İlk kurulumda kilitlenseydi yeni firma çalışamazdı.
 * ============================================================================
 */

export class DonemKorumasiHatasi extends Error {
  constructor(
    /** Kapalı olduğu için duraksatan dönem (`2026-07` biçiminde). */
    readonly donem: DonemAnahtari,
    /** O dönemde hesaplanmış satış sayısı — ısrar ekranındaki SOMUT rakam. */
    readonly satisSayisi: number,
    /** Israr neden geçersiz — hiç ısrar edilmemişse `"onay"`. */
    readonly eksik: "onay" | "sebep" | "aciklama",
  ) {
    super("Dönem koruması duraksattı");
    this.name = "DonemKorumasiHatasi";
  }
}

export type DonemKapiSonucu =
  /** Dönem açık — hiçbir şey yapılmadı. */
  | { durum: "SERBEST" }
  /** Kapalı döneme ISRARLA yazılıyor; çağıran izi YAZMAK ZORUNDA. */
  | { durum: "ISRARLA_GECILDI"; donem: DonemAnahtari };

/**
 * EKRAN YOLU — kullanıcı var, sorulur.
 *
 * ⛔ SUNUCU EKRANA GÜVENMEZ: ekran düğmeyi kilitliyor ama aynı ölçüt burada
 * DA koşuyor. İki yerde iki ölçüt olmasın diye ikisi de `israrGecerliMi`
 * saf gövdesini çağırıyor.
 *
 * @param isTarihi Yazılacak kaydın İŞ TARİHİ (satış günü, mal kabul günü…).
 */
export async function donemKapisi(
  /**
   * ⚠ TİP `prisma`DAN TÜRETİLİYOR, ELLE YAZILMIYOR. Elle yazılmış yapısal
   * bir tip (`findMany: (args: unknown) => …`) Prisma'nın genel imzasına
   * OTURMUYOR ve çağıran `tx`i geçemiyordu. Türetilmiş tip hem işlem
   * istemcisini hem ana istemciyi kabul ediyor.
   */
  db: Pick<typeof prisma, "muhasebeDonemi" | "sale">,
  isTarihi: Date,
  israr: DonemIsrari | undefined,
): Promise<DonemKapiSonucu> {
  const kapali = await kapaliDonemler(db);
  const karar = donemKorumasi({
    isTarihi: tarihinDonemi(isTarihi),
    kapaliDonemler: kapali,
  });
  if (karar.sonuc === "SERBEST") return { durum: "SERBEST" };

  const g = israrGecerliMi(
    donemIsrariniCevir(israr ?? { onaylandi: false, sebep: null, aciklama: "" }),
  );
  if (!g.gecerli) {
    /**
     * ⚠ SOMUT SAYI BURADA OKUNUYOR — YALNIZ DURAKSAYINCA (kullanıcı şartı).
     * Her yazımda saymak, kapı hiç yanmayacakken de bir `count` koşturmak
     * olurdu; bu sorgu ancak ekran uyarıyı GÖSTERECEKKEN gerekiyor.
     */
    const [yil, ay] = karar.donem.split("-").map(Number);
    const bas = new Date(Date.UTC(yil!, ay! - 1, 1));
    const bit = new Date(Date.UTC(ay! === 12 ? yil! + 1 : yil!, ay! % 12, 1));
    const satisSayisi = await db.sale.count({
      where: { soldAt: { gte: bas, lt: bit }, iptalTarihi: null },
    });
    throw new DonemKorumasiHatasi(karar.donem, satisSayisi, g.eksik);
  }
  return { durum: "ISRARLA_GECILDI", donem: karar.donem };
}

/**
 * BETİK YOLU — soracak kimse yok: ATLA ve RAPORLA.
 *
 * ⚠ SAF: veritabanına gitmez. Kapalı küme çağırandan gelir, çünkü betik onu
 * bir kez okuyup binlerce satır için kullanır; satır başına sorgu atmak
 * içe aktarmayı yüzlerce tur ettirirdi.
 */
export type BetikDonemKarari =
  | { islem: "YAZ" }
  | { islem: "ATLA"; donem: DonemAnahtari };

export function betikDonemKarari(g: {
  isTarihi: Date;
  kapaliDonemler: ReadonlySet<DonemAnahtari>;
}): BetikDonemKarari {
  const karar = donemKorumasi({
    isTarihi: tarihinDonemi(g.isTarihi),
    kapaliDonemler: g.kapaliDonemler,
  });
  if (karar.sonuc === "SERBEST") return { islem: "YAZ" };
  return { islem: "ATLA", donem: karar.donem };
}

/**
 * İSTİSNA İZİ — İKİ YERE (kullanıcı şartı 31.08.2026).
 *
 * ⚠ `AuditLog` **ve** ilgili kayda damga. Yalnız `AuditLog`a yazılsaydı
 * kaydın kendisine bakan biri (dönem raporu, satış detayı) uyarıya rağmen
 * yazıldığını göremezdi — ve tam o kişi bilmek zorunda.
 *
 * ⚠ Damga alanı bu turda AÇILMADI: `AuditLog.detail` içinde `uyariyaRagmen`
 * bayrağı taşınıyor ve rapor onu SAYIYOR. Kayda ayrı bir sütun açmak, beş
 * tabloya beş sütun demekti; merdivenin ilk basamağı (mevcut alan) yeterli.
 */
/**
 * FORM ISRARINI OKUR — DÖRT EKRANDA AYNI ALAN ADLARI.
 *
 * ⚠ AYRI AYRI YAZILSAYDI biri gün gelip alan adını değiştirir ve o ekranda
 * ısrar SESSİZCE geçersiz kalırdı: kullanıcı kutuyu işaretler, sunucu
 * "işaretlenmedi" der ve sebebi hiçbir yerde görünmez.
 */
export function donemIsrariniOku(formData: FormData): DonemIsrari {
  const ham = String(formData.get("donemIsrariSebep") ?? "");
  return {
    onaylandi: String(formData.get("donemIsrariOnay") ?? "") === "1",
    sebep: (DONEM_ISRAR_SEBEPLERI as readonly string[]).includes(ham)
      ? (ham as DonemIsrarSebebi)
      : null,
    aciklama: String(formData.get("donemIsrariAciklama") ?? ""),
  };
}

export const DONEM_ISTISNA_EYLEMI = "DONEM_KORUMASI_ISTISNASI";

export function donemIstisnaIzi(girdi: {
  yol: string;
  donem: DonemAnahtari;
  isTarihi: Date;
  israr: DonemIsrari | undefined;
}): string {
  return JSON.stringify({
    yol: girdi.yol,
    donem: girdi.donem,
    isTarihi: girdi.isTarihi.toISOString(),
    sebep: girdi.israr?.sebep ?? null,
    aciklama: girdi.israr?.aciklama.trim() || null,
    /** ⚠ Rapor bu bayrağı SAYIYOR — adı değişirse rapor sessizce 0 gösterir. */
    uyariyaRagmen: true,
  });
}
