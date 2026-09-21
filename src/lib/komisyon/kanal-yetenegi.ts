import { KAMPANYA_ORANI_OKUYUCUSU_OLAN } from "./kampanya-orani";
import { TEKLIF_TARIFESI_OKUYUCUSU_OLAN } from "./teklif-tarifesi";
import { ORAN_OKUYUCUSU_OLAN } from "./okuyucu";
import type { KomisyonPlatformu } from "./model";

/**
 * ============================================================================
 *  KANAL YETENEĞİ — HANGİ KANAL HANGİ DOSYAYI KABUL EDER (K226)
 * ----------------------------------------------------------------------------
 *  Komisyon yükleme ekranının TEK doğruluk kaynağı. Ekran "şu dosyayı yükle"
 *  diyorsa bu bir SÖZDÜR ve sistem onu tutmak zorundadır; söz burada bir
 *  kez kurulur, üç yerde ayrı ayrı değil.
 *
 *  ── NİYE DOĞDU (canlı arıza 21.09.2026) ────────────────────────────────
 *  Kullanıcı Hepsiburada ve N11 dosyalarını tarife ekranına yükledi, ikisi
 *  de düştü ve ekran nereye gideceğini SÖYLEMEDİ. Kırmızı kutu dosyanın ne
 *  OLMADIĞINI yazıyordu; ne olduğunu ve hangi kapıya ait olduğunu değil.
 *  Anayasa bunu adıyla anıyor — _"kural doğru mu değil, teslim edilebilir
 *  mi"_: uyarı çıkmaza götürüyorsa uyarı değildir.
 *
 *  ── İKİ AYRI DOSYA, İKİ AYRI İŞ — KARIŞTIRILMAZ ────────────────────────
 *  · DİLİMLİ TARİFE  → `KomisyonTarifesi` + kalemleri. Fiyat denemesini ve
 *    oran denetimini besler: _"şu fiyata düşersen komisyon şu olur."_
 *  · GÜNCEL ORAN     → `ChannelSku.commissionRate`. KÂR HESABINI besler:
 *    satış anında kayda snapshot'lanan orandır.
 *  İkisi aynı kutuya konsaydı, HB listesini yükleyen biri "tarifemi
 *  yükledim" sanıp o kanalda fiyat denemesi beklerdi — sistemin veremeyeceği
 *  bir söz.
 * ============================================================================
 */

export type YuklemeTuru =
  | "DILIMLI_TARIFE"
  | "GUNCEL_ORAN"
  /** K226-4 — kampanya dosyasından YALNIZ `Mevcut Komisyon`. */
  | "KAMPANYA_ORANI";

/**
 * Bir türün NİYE olmadığı. Serbest metin DEĞİL kapalı küme: ekran metni
 * sözlükten gelir (i18n kuralı) ve gerekçesiz "yok" yazılamaz.
 */
/**
 * TÜRLERİN ÇALIŞMA ANI LİSTESİ — ekran ve bekçi buradan sayar.
 *
 * ⚠ NİYE VAR: `tarife:dogrula`da "iki tür döner" diye ELLE SAYILMIŞ bir
 * ölçüt vardı ve üçüncü tür eklenince kırmızı yandı. Ölçüt yanlış değildi,
 * **eskimişti** — ve elle sayılan her rakam er ya da geç eskir. Artık sayı
 * beyandan türetiliyor.
 *
 * ⛔ TAMLIK DERLEME ZAMANINDA KAPILANIYOR: aşağıdaki `Record` bir tür
 * eklenip buraya yazılmazsa DERLENMEZ. Liste böylece kendi kendine eksik
 * kalamaz.
 */
export const YUKLEME_TURLERI: readonly YuklemeTuru[] = [
  "DILIMLI_TARIFE",
  "GUNCEL_ORAN",
  "KAMPANYA_ORANI",
];

/** Yalnız derleme zamanı kapısı — çalışma anında kullanılmaz. */
const _TURLER_TAM: Record<YuklemeTuru, true> = {
  DILIMLI_TARIFE: true,
  GUNCEL_ORAN: true,
  KAMPANYA_ORANI: true,
};
void _TURLER_TAM;

export type EksikSebebi = "OKUYUCU_YOK";

export type TurDurumu =
  | { tur: YuklemeTuru; durum: "VAR" }
  | { tur: YuklemeTuru; durum: "YOK"; sebep: EksikSebebi };

/**
 * DİLİMLİ TARİFE OKUYUCUSU OLAN PLATFORMLAR — BEYAN.
 *
 * ⚠ TÜRETİLEMİYOR, BU YÜZDEN BEYAN EDİLİYOR. `tarife-okuyucu.ts` dört
 * dilimli tek bir şekil tanıyor (`1.KOMİSYON`…`4.KOMİSYON` + fiyat limit
 * kolonları) ve o şekil Trendyol'un haftalık yayımladığı dosyadan
 * ölçülerek yazıldı (18.08.2026, 161 satır). Kodda "bu okuyucu TY
 * şeklindedir" diyen makine-okunur bir işaret yok; desenle tahmin etmek
 * yanlış sınıf üretirdi.
 *
 * ⛔ BU LİSTE "HB VE N11 DİLİMLİ TARİFE YAYIMLAMIYOR" DEMEK DEĞİLDİR.
 * Öyle bir ölçüm YAPILMADI ve yokluk iddiası da bir iddiadır. Söylediği
 * yalnız şu: **bizim o kanallar için dilimli tarife okuyucumuz yok, çünkü
 * öyle bir dosya sisteme hiç gelmedi.** Geldiği gün okuyucu yazılır ve bu
 * satıra o platform eklenir.
 */
export const DILIMLI_TARIFE_OKUYUCUSU_OLAN: readonly KomisyonPlatformu[] = [
  /** Kendi haftalık dilimli tarife dosyası (`1.KOMİSYON…4.KOMİSYON`). */
  "TRENDYOL",
  /**
   * K227 — HB ve N11 aynı tabloyu "teklif" adıyla yayımlıyor ve okuyucusu
   * yazıldı (`teklif-tarifesi.ts`). Küme ELLE değil o beyandan türetiliyor;
   * dördüncü bir kanalın okuyucusu yazıldığı gün buraya kendiliğinden girer.
   */
  ...TEKLIF_TARIFESI_OKUYUCUSU_OLAN,
];

/**
 * Bir platformun kabul ettiği yükleme türleri — VAR/YOK, gerekçesiyle.
 *
 * ⚠ HER TÜR İÇİN BİR SATIR DÖNER, eksik olanlar da dahil. Desteklenmeyen
 * türü listeden DÜŞÜRMEK, ekranda "baktım yok" ile "bu satır hiç yok"u
 * aynı görünür yapardı — anayasadaki "sıfır satır gizlenmez" kuralı.
 */
export function kanalYetenegi(
  platform: KomisyonPlatformu | null,
): TurDurumu[] {
  const tarifeVar =
    platform !== null && DILIMLI_TARIFE_OKUYUCUSU_OLAN.includes(platform);
  const oranVar = platform !== null && ORAN_OKUYUCUSU_OLAN.includes(platform);
  const kampanyaVar =
    platform !== null && KAMPANYA_ORANI_OKUYUCUSU_OLAN.includes(platform);

  return [
    tarifeVar
      ? { tur: "DILIMLI_TARIFE", durum: "VAR" }
      : { tur: "DILIMLI_TARIFE", durum: "YOK", sebep: "OKUYUCU_YOK" },
    oranVar
      ? { tur: "GUNCEL_ORAN", durum: "VAR" }
      : { tur: "GUNCEL_ORAN", durum: "YOK", sebep: "OKUYUCU_YOK" },
    kampanyaVar
      ? { tur: "KAMPANYA_ORANI", durum: "VAR" }
      : { tur: "KAMPANYA_ORANI", durum: "YOK", sebep: "OKUYUCU_YOK" },
  ];
}
