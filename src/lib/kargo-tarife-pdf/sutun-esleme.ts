/**
 * ============================================================================
 *  KARGO TARİFESİ PDF — SATIR İÇİ SÜTUN EŞLEME (K202)
 * ----------------------------------------------------------------------------
 *  Bir satırdaki her değer belirteci, PDF'te KENDİ X KONUMUNU taşır ve bu
 *  konum, o taşıyıcının BAŞLIK satırındaki x konumuna en yakın olandır.
 *
 *  ⚠ NİYE "EN YAKIN SIRALI EŞLEME" — SABİT SÜTUN SAYISI DEĞİL: bir taşıyıcı
 *  o desi'de fiyat vermiyorsa (ör. hepsiJET desi>60'ta) satırda o sütuna ait
 *  HİÇ belirteç yoktur — sabit "N. belirteç = N. sütun" varsayımı bu durumda
 *  her şeyi bir sütun kaydırırdı (tam olarak `pdftotext -table`nin canlıda
 *  yaşanan hatası, bkz. K-HB-tarife 16.09.2026 vakası). Konum eşleşmesi bu
 *  sınıfı YAPISAL olarak imkânsız kılar: eksik sütun basitçe eşleşmez, komşu
 *  sütuna kaymaz.
 *
 *  ⚠ İKİ İŞARETÇİ (h) SAF VE O(n): hem sütunlar hem belirteçler x'e göre
 *  ARTAN sıralı olduğundan (çağıran sıralar), bir belirteç bir sütunu
 *  TÜKETTİĞİNDE arama bir SONRAKİ sütundan devam eder — aynı sütun iki kez
 *  eşleşmez ve sıra asla GERİYE gitmez.
 * ============================================================================
 */

export type Sutun = { ad: string; x: number };
export type Belirtec = { x: number; tutar: number };

export type EslemeSonucu =
  | { tamam: true; eslesenler: { ad: string; tutar: number }[] }
  /** Belirteç sayısı, kalan sütun sayısını AŞTI — veri satırın kendisi bozuk. */
  | { tamam: false; kod: "SUTUN_YETERSIZ"; belirtecSirasi: number };

export function sutunlaraEsle(
  sutunlarHam: Sutun[],
  belirteclerHam: Belirtec[],
): EslemeSonucu {
  const sutunlar = [...sutunlarHam].sort((a, b) => a.x - b.x);
  const belirtecler = [...belirteclerHam].sort((a, b) => a.x - b.x);

  const eslesenler: { ad: string; tutar: number }[] = [];
  let h = 0;
  for (let i = 0; i < belirtecler.length; i++) {
    const b = belirtecler[i]!;
    if (h >= sutunlar.length) {
      return { tamam: false, kod: "SUTUN_YETERSIZ", belirtecSirasi: i };
    }
    let en = h;
    let enUzaklik = Math.abs(sutunlar[h]!.x - b.x);
    for (let j = h + 1; j < sutunlar.length; j++) {
      const uzaklik = Math.abs(sutunlar[j]!.x - b.x);
      /** ⚠ Sütunlar artan x'te: uzaklık bir kez ARTMAYA başladıktan sonra
       *  bir daha küçülmez — döngü erken kesilebilir (küçük ama gerçek bir
       *  performans kazancı, 4501 satır × 11 sütun için önemli). */
      if (uzaklik < enUzaklik) {
        enUzaklik = uzaklik;
        en = j;
      } else {
        break;
      }
    }
    eslesenler.push({ ad: sutunlar[en]!.ad, tutar: b.tutar });
    h = en + 1;
  }
  return { tamam: true, eslesenler };
}
