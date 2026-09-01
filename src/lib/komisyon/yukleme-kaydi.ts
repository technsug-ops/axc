import { prisma } from "@/lib/prisma";
import { izYaz } from "@/lib/iz";

/**
 * ============================================================================
 *  KOMİSYON YÜKLEME KAYDI — `AuditLog`'un DÖRDÜNCÜ YAZICISI
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR — envanterin cevaplayamadığı soru.
 *
 *  Yükleme sonuçları ekranda gösterilip KAYBOLUYORDU. Bu yüzden envanter
 *  "yükleme koştu ama hiçbir oran değişmedi" ile "yükleme hiç koşmadı"
 *  ayrımını yapamıyordu — ikisi de aynı boşluğu gösteriyor.
 *
 *  ── NİYE YENİ TABLO DEĞİL ───────────────────────────────────────────────
 *  Önce `KomisyonYuklemesi` tablosu önerildi ve ONAYLANDI; sonra ölçüldü:
 *  `AuditLog` bu işi olduğu gibi yapıyor (`userId` · `createdAt` indeksli ·
 *  `targetType/targetId` · `detail` · `action` indeksli). Migration, canlı
 *  koşum ve damga gereksizmiş. _Anayasa: "şema değişikliği en pahalı
 *  çözümdür"; ihtiyaç "geriye bakmak"ken serbest metin yeter, tablo ancak
 *  ihtiyaç SORGUYA dönüşünce açılır._
 *
 *  ── EN KRİTİK NOKTA: SIFIR YAZIMDA DA KAYIT DÜŞER ───────────────────────
 *  ⚠ Uç nokta, yazacak satır kalmadığında transaction AÇMADAN erken
 *  dönüyor. Kaydı yalnız yazma yoluna koysaydık **tam olarak ayırt etmek
 *  istediğimiz vakada hiçbir kayıt düşmezdi** — yani araç, var olma
 *  sebebini karşılamazdı. Bu yüzden kayıt İKİ YOLDAN DA yazılır ve
 *  `yazimYapildi` alanı ikisini ayırır.
 *
 *  ── TEK KAYNAK ──────────────────────────────────────────────────────────
 *  `detail`teki sayılar, yükleme ekranının sonuç mesajındaki sayılarla
 *  AYNI nesneden gelir. Ekran bir şey, kayıt başka bir şey derse hangisine
 *  güvenileceği bilinmez.
 * ============================================================================
 */

export const KOMISYON_YUKLEME_EYLEMI = "KOMISYON_YUKLEME";

export type YuklemeKaydiGirdisi = {
  /** Yüklenen dosyanın adı — "hangi dosyaydı" sorusu. */
  dosyaAdi: string;
  /** Kanal hesabı: kimin oranları. */
  channelAccountId: string;
  platform: string;
  /** Dosyadan okunan veri satırı. */
  okunan: number;
  /** Oranı DEĞİŞTİĞİ için yazılan satır. */
  guncellenen: number;
  /** Yeni açılan eşleme. */
  yaratilan: number;
  /**
   * Oranı ZATEN AYNI olduğu için yazma planına hiç girmeyen satır.
   * Envanterin "değişmedi mi, hiç koşmadı mı" sorusunu bu sayı kapatır.
   */
  ayniKalan: number;
  /**
   * Transaction açıldı mı. `false` = yazacak bir şey yoktu; yükleme yine
   * de KOŞTU ve bu kayıt onun kanıtıdır.
   */
  yazimYapildi: boolean;
};

/**
 * `detail` metnini kurar. SAF — veritabanına gitmez, sınanabilir.
 *
 * JSON seçildi çünkü alanlar adlarıyla duruyor; serbest cümle olsaydı
 * altı ay sonra "hangi sayı neydi" diye okunamazdı. Yine de `detail` bir
 * METİN alanı: üzerinde sorgu yapılmıyor, yalnız geriye bakılıyor.
 */
export function yuklemeDetayi(
  girdi: YuklemeKaydiGirdisi & { channelAccountAdi?: string },
): string {
  return JSON.stringify({
    dosya: girdi.dosyaAdi,
    hesap: girdi.channelAccountAdi ?? girdi.channelAccountId,
    platform: girdi.platform,
    okunan: girdi.okunan,
    guncellenen: girdi.guncellenen,
    yaratilan: girdi.yaratilan,
    ayniKalan: girdi.ayniKalan,
    yazimYapildi: girdi.yazimYapildi,
  });
}

/**
 * Kaydı yazar. Yükleme başarılıysa HER ZAMAN çağrılır — sıfır yazımda da.
 *
 * ⚠ HATA YUTULUR. Kayıt yazılamadı diye yükleme başarısız SAYILMAZ:
 * oranlar zaten yazılmış olur ve kullanıcıya "olmadı" demek yalan olurdu.
 * Kayıt bir iz aracıdır, işin kendisi değil.
 */
export async function yuklemeKaydiYaz(
  girdi: YuklemeKaydiGirdisi & { kullaniciId: string | null; companyId: string | null },
): Promise<void> {
  try {
    /**
     * HESAP ADI BURADA ÇÖZÜLÜR — çağıranın taşıması gereken bir bilgi
     * değil. Kayıt altı ay sonra okunacak; o gün hesap kimliği tek başına
     * "hangi mağazaydı" sorusunu cevaplamaz.
     */
    const hesap = await prisma.channelAccount.findUnique({
      where: { id: girdi.channelAccountId },
      select: { name: true, channel: { select: { name: true } } },
    });
    const hesapAdi =
      hesap === null ? undefined : `${hesap.channel.name} — ${hesap.name}`;

    /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
    await izYaz({
      userId: girdi.kullaniciId,
      companyId: girdi.companyId,
      action: KOMISYON_YUKLEME_EYLEMI,
      targetType: "ChannelAccount",
      targetId: girdi.channelAccountId,
      detail: yuklemeDetayi({ ...girdi, channelAccountAdi: hesapAdi }),
    });
  } catch (e) {
    console.error("[komisyon] yükleme kaydı yazılamadı:", e);
  }
}
