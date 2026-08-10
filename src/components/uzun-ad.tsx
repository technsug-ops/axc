import { Baglanti } from "@/components/baglanti";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 *  UZUN AD — LİSTE TABLOLARINDA KISALTILMIŞ METİN HÜCRESİ
 * ----------------------------------------------------------------------------
 *  11.08.2026: ürün adı sütunu tabloyu ekranın dışına itiyordu. Yatay
 *  kaydırma olmadan sağdaki sütunlar (stok, tarih, eylemler) görünmüyordu.
 *
 *  ÖNCEKİ DENEME NEDEN TUTMADI: hücreye `max-w-[22rem]` yazılmıştı. Tablo
 *  hücresinde (`<td>`) `max-width` TARAYICI TARAFINDAN YOK SAYILIR —
 *  otomatik tablo yerleşiminde sütun genişliğini içerik belirler. Sınır
 *  hiç uygulanmadı, ad hiç kısalmadı.
 *
 *  ÇÖZÜM: sınırı hücreye değil, hücrenin İÇİNDEKİ blok öğeye koymak.
 *  `<span class="block truncate">` üzerinde `max-width` gerçekten çalışır;
 *  metin üç noktayla kesilir ve sütun o genişlikte durur.
 *
 *  TAM METNE ERİŞİM: kısaltılan ad `title` olarak durur (üstüne gelince
 *  görünür) ve satırdaki "Detay" düğmesi zaten kaydın tamamına götürür.
 *  Bilgi kaybolmuyor, sadece listede yer kaplamıyor.
 *
 *  ⚠ Kısaltma KARAKTER SAYISIYLA değil GENİŞLİKLE yapılır. Sabit karakter
 *  sınırı dar ekranda yine taşar, geniş ekranda boşuna keser.
 *
 *  Telefondaki kart görünümünde kullanılmaz — orada ad tam durur (yer var).
 * ============================================================================
 */
export function UzunAd({
  metin,
  href,
  ek,
  className,
}: {
  /** Gösterilecek ve kısaltılacak metin. Tamamı `title` olarak kalır. */
  metin: string;
  /** Verilirse ad tıklanabilir olur (Kullanıcı Kolaylığı #2). */
  href?: string;
  /** Adın yanında duran ve KISALTILMAYAN ek (rozet vb.). */
  ek?: React.ReactNode;
  /** Genişlik sınırını değiştirmek için: varsayılan `max-w-[22rem]`. */
  className?: string;
}) {
  // `block` şart: `truncate` satır içi öğede çalışmaz, genişlik sınırı
  // uygulanabilmesi için blok olmalı.
  const kisaltilmis = cn("block max-w-[22rem] truncate", className);

  return (
    // `min-w-0` şart: flex çocuğu varsayılan olarak içeriğinden küçülmez,
    // olmadan `truncate` hiç devreye girmez.
    <div className="flex min-w-0 items-center gap-2">
      {href ? (
        // Link stili tek kaynaktan gelsin diye Baglanti kullanılıyor (#10);
        // burada elle yazılsaydı listelerdeki bağlantılar diğerlerinden
        // farklı görünürdü.
        <Baglanti href={href} title={metin} className={kisaltilmis}>
          {metin}
        </Baglanti>
      ) : (
        <span title={metin} className={kisaltilmis}>
          {metin}
        </span>
      )}
      {ek}
    </div>
  );
}
