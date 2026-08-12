import { prisma } from "@/lib/prisma";
import { YEDEK_TABLOLARI, type YedekDosyasi } from "@/lib/yedek-bicim";

/**
 * ============================================================================
 *  GERİ YÜKLEME — YAZAN TARAF
 * ----------------------------------------------------------------------------
 *  SİSTEMDEKİ EN YIKICI İŞLEM. Tasarım kararları tek tek gerekçeli:
 *
 *  1. TEK İŞLEM (transaction). Yarısı yüklenmiş bir veritabanı, hiç
 *     yüklenmemişten kötüdür — stok defteri ile satışlar birbirini tutmaz.
 *     Hata olursa hiçbir şey değişmez.
 *
 *  2. `DELETE FROM`, `TRUNCATE` DEĞİL. MySQL'de TRUNCATE örtük commit
 *     yapar; işlemin ortasında çağrılırsa geri alma imkânı YOK OLUR.
 *     Bu tek satırlık fark, "hata olursa geri alınır" güvencesinin
 *     tamamını taşır.
 *
 *  3. YABANCI ANAHTAR KONTROLÜ KAPATILIR. Stok defteri kendi kendine
 *     bakar (sourceMovementId) ve tablolar birbirine halka halinde
 *     bağlıdır; hiçbir ekleme sırası bunu çözmez. Kontrol işlem boyunca
 *     kapalı, sonunda geri açılır. Bütünlük güvencesi ekleme sırasından
 *     değil, YEDEĞİN TUTARLI BİR VERİTABANINDAN ALINMIŞ olmasından gelir.
 *
 *  4. SÜTUN TİPLERİ VERİTABANINDAN OKUNUR (information_schema). Tarih
 *     alanlarını "ISO'ya benziyorsa tarihtir" diye tahmin etmek, tarih
 *     gibi görünen bir NOT alanını bozardı. Şema dosyasına da bakılmaz;
 *     o dosya çalışma anında yanımızda olmayabilir.
 *
 *  5. DOSYADAKİ SÜTUN VERİTABANINDA YOKSA İŞLEM BAŞLAMAZ. Sessizce
 *     atlamak, o alanı kaybetmek demektir.
 * ============================================================================
 */

/** Tek INSERT'e kaç satır konur. */
const PARCA = 400;

/** İşlemin üst sınırı — büyük yedekte tarife tablosu uzun sürer. */
const ISLEM_ZAMAN_ASIMI_MS = 240_000;
const ISLEM_BEKLEME_MS = 15_000;

export type GeriYuklemeHatasi =
  | { kod: "SUTUN_TANINMADI"; tablo: string; sutunlar: string[] }
  | { kod: "TABLO_TANINMADI"; tablo: string }
  | { kod: "SAYIM_TUTMADI"; tablo: string; beklenen: number; gelen: number }
  | { kod: "ISLEM_HATASI"; ayrinti: string };

export type GeriYuklemeSonucu =
  | { tamam: true; yazilan: Record<string, number>; toplam: number }
  | { tamam: false; hata: GeriYuklemeHatasi };

/** Tablo -> sütun adı -> MySQL veri tipi (lowercase). */
type SemaHaritasi = Map<string, Map<string, string>>;

async function semayiOku(): Promise<SemaHaritasi> {
  const satirlar = await prisma.$queryRaw<
    { TABLE_NAME: string; COLUMN_NAME: string; DATA_TYPE: string }[]
  >`SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()`;

  const harita: SemaHaritasi = new Map();
  for (const s of satirlar) {
    // MySQL Windows'ta tablo adlarını küçük harfe katlar; arama küçük harften.
    const tablo = s.TABLE_NAME.toLowerCase();
    let sutunlar = harita.get(tablo);
    if (!sutunlar) {
      sutunlar = new Map();
      harita.set(tablo, sutunlar);
    }
    sutunlar.set(s.COLUMN_NAME, s.DATA_TYPE.toLowerCase());
  }
  return harita;
}

const TARIH_TIPLERI = new Set(["datetime", "timestamp", "date"]);

/**
 * JSON değerini MySQL'in beklediği biçime çevirir.
 *
 * Tarihler ISO metin olarak iner ("2026-08-12T09:00:00.000Z"); MySQL bunu
 * doğrudan kabul etmez. UTC'de sakladığımız için sadece biçim değiştirilir,
 * saat dilimi KAYDIRILMAZ — kaydırmak bütün iş tarihlerini bir gün oynatırdı.
 */
function degeriCevir(deger: unknown, tip: string): unknown {
  if (deger === null || deger === undefined) return null;

  if (TARIH_TIPLERI.has(tip)) {
    if (deger instanceof Date) return deger;
    if (typeof deger === "string") {
      const t = new Date(deger);
      if (Number.isNaN(t.getTime())) return null;
      return t;
    }
    return null;
  }

  // Decimal ve büyük sayılar metin olarak gider; float'a çevirmek
  // parasal değerde basamak kaybettirirdi (anayasa: asla Float).
  if (typeof deger === "object") return JSON.stringify(deger);

  if (typeof deger === "boolean") return deger ? 1 : 0;

  return deger;
}

/**
 * Yedeği veritabanına yazar. ÇAĞIRMADAN ÖNCE GÜVENLİK YEDEĞİ ALINMIŞ
 * OLMALIDIR — bu fonksiyon onu kontrol etmez, çağıran taraf sorumludur
 * (bkz. /api/geri-yukle route).
 */
export async function geriYukle(
  yedek: YedekDosyasi,
): Promise<GeriYuklemeSonucu> {
  const sema = await semayiOku();

  // --- ÖN DENETİM: hiçbir şey silmeden önce dosya şemaya uyuyor mu? ---
  // Bu döngü BİLEREK yazma işleminden ayrı: yarı yolda "tanınmayan sütun"
  // demek, veriyi çoktan silmiş olmak demekti.
  const yazilacak: { tablo: string; sutunlar: string[]; satirlar: unknown[] }[] =
    [];

  for (const tablo of YEDEK_TABLOLARI) {
    const sutunTipleri = sema.get(tablo.toLowerCase());
    if (!sutunTipleri) return { tamam: false, hata: { kod: "TABLO_TANINMADI", tablo } };

    const satirlar = yedek.tablolar[tablo];
    // Dosyada olmayan tablo BOŞALIR (kısmi geri yükleme yok) — silinir,
    // hiçbir şey yazılmaz.
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
      yazilacak.push({ tablo, sutunlar: [], satirlar: [] });
      continue;
    }

    const sutunlar = Object.keys(satirlar[0] as Record<string, unknown>);
    const taninmayan = sutunlar.filter((s) => !sutunTipleri.has(s));
    if (taninmayan.length > 0) {
      return {
        tamam: false,
        hata: { kod: "SUTUN_TANINMADI", tablo, sutunlar: taninmayan },
      };
    }

    yazilacak.push({ tablo, sutunlar, satirlar });
  }

  const yazilan: Record<string, number> = {};

  try {
    await prisma.$transaction(
      async (tx) => {
        // FK kontrolü KAPALI — oturum değişkeni, işlemin bağlantısında geçerli.
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

        try {
          // --- SİL: bağımlılığın TERSİ sırayla ---
          for (const tablo of [...YEDEK_TABLOLARI].reverse()) {
            await tx.$executeRawUnsafe(`DELETE FROM \`${tablo}\``);
          }

          // --- YAZ: bağımlılık sırasıyla ---
          for (const { tablo, sutunlar, satirlar } of yazilacak) {
            yazilan[tablo] = 0;
            if (satirlar.length === 0) continue;

            const sutunTipleri = sema.get(tablo.toLowerCase())!;
            const basliklar = sutunlar.map((s) => `\`${s}\``).join(", ");

            for (let i = 0; i < satirlar.length; i += PARCA) {
              const dilim = satirlar.slice(i, i + PARCA);
              const yerTutucu = dilim
                .map(() => `(${sutunlar.map(() => "?").join(", ")})`)
                .join(", ");

              const degerler: unknown[] = [];
              for (const satir of dilim) {
                const kayit = satir as Record<string, unknown>;
                for (const sutun of sutunlar) {
                  degerler.push(
                    degeriCevir(kayit[sutun], sutunTipleri.get(sutun)!),
                  );
                }
              }

              await tx.$executeRawUnsafe(
                `INSERT INTO \`${tablo}\` (${basliklar}) VALUES ${yerTutucu}`,
                ...degerler,
              );
            }
            yazilan[tablo] = satirlar.length;
          }

          // --- DOĞRULA: yazılan satır sayısı dosyayla birebir mi? ---
          // Tutmuyorsa işlem geri alınır. "Herhâlde olmuştur" demek yok.
          for (const { tablo, satirlar } of yazilacak) {
            const [{ n }] = await tx.$queryRawUnsafe<{ n: bigint }[]>(
              `SELECT COUNT(*) AS n FROM \`${tablo}\``,
            );
            const gelen = Number(n);
            if (gelen !== satirlar.length) {
              throw Object.assign(new Error("SAYIM_TUTMADI"), {
                selliora: { tablo, beklenen: satirlar.length, gelen },
              });
            }
          }
        } finally {
          // Hata olsa da olmasa da kontrol geri açılır.
          await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
        }
      },
      { timeout: ISLEM_ZAMAN_ASIMI_MS, maxWait: ISLEM_BEKLEME_MS },
    );
  } catch (e) {
    const ek = (e as { selliora?: { tablo: string; beklenen: number; gelen: number } })
      .selliora;
    if (ek) {
      return { tamam: false, hata: { kod: "SAYIM_TUTMADI", ...ek } };
    }
    return {
      tamam: false,
      hata: { kod: "ISLEM_HATASI", ayrinti: String(e).slice(0, 400) },
    };
  }

  return {
    tamam: true,
    yazilan,
    toplam: Object.values(yazilan).reduce((t, n) => t + n, 0),
  };
}

/** Şu anki satır sayıları — fark raporu için. */
export async function mevcutSatirSayilari(): Promise<Record<string, number>> {
  const sonuc: Record<string, number> = {};
  for (const tablo of YEDEK_TABLOLARI) {
    try {
      const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
        `SELECT COUNT(*) AS n FROM \`${tablo}\``,
      );
      sonuc[tablo] = Number(n);
    } catch {
      // Tablo yoksa (eski şema) sayım da yok — sıfır YAZILMAZ, atlanır;
      // fark raporunda "0" görünür ama tablo listede zaten duruyor.
      sonuc[tablo] = 0;
    }
  }
  return sonuc;
}
