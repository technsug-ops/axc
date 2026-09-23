/**
 * ============================================================================
 *  GÜNLÜK ÖZET TEASER'I — BAŞLIK DEĞİL, CÜMLE (K249, 23.09.2026)
 * ----------------------------------------------------------------------------
 *  Panel kutusu anlatının "ilk boş olmayan satırını" basıyordu ve canlıda
 *  ekrana şu düştü:
 *
 *      Günlük Özet
 *      **Kırmızı**
 *      Tam özeti gör →
 *
 *  İki ayrı kusur aynı satırda:
 *  ① METİN MARKDOWN, EKRAN DÜZ YAZI. Yıldızlar biçim değil, KARAKTER olarak
 *    çiziliyordu. Kullanıcı bunu bir veri hatası sanabilir.
 *  ② SEÇİLEN SATIR BİR BAŞLIKTI. `**Kırmızı**` anlatının bölüm başlığı;
 *    hiçbir şey söylemiyor. Kutu doluydu ama BOŞTU.
 *
 *  ⛔ ÖLÇÜT UZUNLUK DEĞİL, YAPI. "4 kelimeden kısa satırı atla" gibi bir eşik
 *  uydurma olurdu (anayasa: eşik uydurulmaz). Bunun yerine markdown'ın KENDİ
 *  yapısı kullanılıyor: `#` ile başlayan ya da TAMAMI kalın olan satır bir
 *  BAŞLIKTIR. Bu ayrım metnin uzunluğundan bağımsızdır ve uzun bir başlık da
 *  kısa bir cümle de doğru sınıflanır.
 *
 *  ⚠ HİÇBİR ŞEY DÖNDÜRMEMEKTENSE BAŞLIK DÖNDÜRÜLÜR: bütün satırlar başlıksa
 *  kutu boş kalmaz, temizlenmiş ilk satırı basar. Sessizce boşalan bir kutu,
 *  "bugün özet üretilmedi" ile karışırdı (açık sıfır ilkesi).
 * ============================================================================
 */

/** Satır içi markdown işaretlerini SÖKER — metni değil, işareti siler. */
function isaretleriSok(satir: string): string {
  return satir
    .replace(/^\s*#{1,6}\s*/, "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*>\s?/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

/**
 * Satır bir BAŞLIK mı?
 *
 * ⚠ İKİ BİÇİM DE SAYILIR ve ikisi de canlıda görüldü: `## Kırmızı` ve
 * `**Kırmızı**`. İkincisi "tamamı kalın" demektir — cümlenin İÇİNDE geçen
 * bir kalın parça başlık yapmaz.
 */
export function baslikMi(satir: string): boolean {
  const s = satir.trim();
  if (s === "") return false;
  if (/^#{1,6}\s/.test(s)) return true;
  if (/^\*\*[^*]+\*\*$/.test(s)) return true;
  if (/^__[^_]+__$/.test(s)) return true;
  return false;
}

/**
 * Anlatıdan panel kutusuna basılacak TEK satırı çıkarır.
 *
 * Döner: temizlenmiş cümle, ya da anlatı hiç kullanılabilir satır
 * taşımıyorsa `null` (çağıran "henüz yok" der — uydurma yapılmaz).
 */
export function ozetTeaseri(anlatiMetni: string | null | undefined): string | null {
  if (!anlatiMetni) return null;
  const satirlar = anlatiMetni.split("\n");

  const temizler = satirlar
    .map((s) => ({ ham: s, temiz: isaretleriSok(s) }))
    .filter((x) => x.temiz !== "");
  if (temizler.length === 0) return null;

  const cumle = temizler.find((x) => !baslikMi(x.ham));
  /** ⚠ YEDEK: hepsi başlıksa kutu BOŞ KALMAZ — temizlenmiş ilk satır gider. */
  return (cumle ?? temizler[0]).temiz;
}
