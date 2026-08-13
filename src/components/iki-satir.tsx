import { cn } from "@/lib/utils";

/**
 * ============================================================================
 *  İKİ SATIRLI HÜCRE — SÜTUN SAYISINI DEĞİL GENİŞLİĞİ DÜŞÜRÜR
 * ----------------------------------------------------------------------------
 *  NEDEN VAR (kullanıcı kararı 14.08.2026): "1 sayfada her şeyi görmek
 *  istiyorum, sayfa sağa sola gitmemeli." Liste tabloları 9-10 sütuna
 *  çıkmıştı ve ÖLÇÜLDÜ: alımlar 1232px, ürünler 1189px, satışlar 1122px
 *  yer istiyor; dizüstü ekranında kullanılabilir genişlik ~1045px.
 *
 *  ÜÇ SEÇENEK VARDI:
 *    1. Yatay kaydırma — kullanıcı bunu istemiyor.
 *    2. Sütun/bilgi silmek — kimlik kodları listede kalmalı (İlke #3).
 *    3. İLİŞKİLİ İKİ BİLGİYİ TEK SÜTUNDA ÜST ÜSTE koymak — seçilen.
 *
 *  Kazanç iki yerden gelir: bir sütunun dolgusu ve başlığı silinir, ve
 *  sütun genişliğini iki değerin TOPLAMI değil UZUN OLANI belirler.
 *  Ölçüldü: alımlarda 1232px → 820px (sipariş no koda, kalem toplama,
 *  hesap adı kanala bindi).
 *
 *  BİLGİ KAYBI YOK: ikincil değer daha küçük ve soluk ama OKUNUR durur,
 *  kopyalama ikonu da yerinde kalır (İlke #4). Kesilen metin `title` ile
 *  tam hâlini taşır.
 *
 *  Panel bunu zaten yapıyordu (ciro sunumu: brüt / iade / net) — burada
 *  aynı dil listelere taşınıyor (İlke #10).
 * ============================================================================
 */
export function IkiSatir({
  ust,
  alt,
  ustIpucu,
  altIpucu,
  enGenis,
  altSoluk = true,
}: {
  /** Birincil değer — normal boyut. */
  ust: React.ReactNode;
  /** İkincil değer — küçük. Boşsa ikinci satır hiç çizilmez. */
  alt?: React.ReactNode;
  /** Kesilme olursa tam metni taşıyan ipucu. */
  ustIpucu?: string;
  altIpucu?: string;
  /**
   * Genişlik sınırı (ör. `max-w-[9rem]`). Verilirse metin üç noktayla
   * kesilir. Tablo hücresine `max-width` yazmak İŞE YARAMAZ — sınır
   * hücrenin İÇİNDEKİ blok öğede olmalı (aynı tuzak `uzun-ad.tsx`'te
   * 11.08.2026'da yaşandı).
   */
  enGenis?: string;
  /** İkinci satır soluk mu? Para gibi eşit ağırlıklı bilgilerde kapatılır. */
  altSoluk?: boolean;
}) {
  return (
    <span className="block min-w-0">
      <span className={cn("block truncate", enGenis)} title={ustIpucu}>
        {ust}
      </span>
      {alt !== undefined && alt !== null && alt !== "" ? (
        <span
          className={cn(
            "block truncate text-xs",
            altSoluk && "text-muted-foreground",
            enGenis,
          )}
          title={altIpucu}
        >
          {alt}
        </span>
      ) : null}
    </span>
  );
}
