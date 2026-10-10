import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEKME_SERIDI, sekmeSinifi } from "@/lib/kutu-bicimi";

/**
 * ============================================================================
 *  SEKMELİ BÖLÜM — ALANI VERİMLİ KULLANMANIN ARACI
 * ----------------------------------------------------------------------------
 *  14.08.2026, kullanıcı kuralı: "Alanı verimli kullanma ve kullanım
 *  kolaylığı asıl şartlardan olsun. Gerekirse sayfa içinde sekmelerle
 *  ayrıştırma yapılabilir."
 *
 *  NE ZAMAN SEKME: aynı soruya farklı açılardan bakan, AYNI ANDA
 *  karşılaştırılması gerekmeyen bloklar. Dört ürün listesi böyleydi —
 *  yan yana dizilince her biri okunamayacak kadar daralıyor, alt alta
 *  dizilince panel iki ekran uzuyordu.
 *
 *  NE ZAMAN SEKME DEĞİL: birlikte okunması gereken rakamlar (ciro ile NET
 *  aynı anda görünmeli). Sekme, bilgiyi saklamanın kolay yolu değildir;
 *  yalnız aynı anda GEREKMEYEN şeyleri ayırır.
 *
 *  SEÇİM URL'YE YAZILIR (`lib/suzgec.ts` ilkesi): geri tuşu çalışır, link
 *  paylaşılabilir, sunucu doğrudan okur ve istemciye durum taşımak
 *  gerekmez. Bu yüzden sekmeler <button> değil <Link>.
 * ============================================================================
 */

export type Sekme = {
  anahtar: string;
  /**
   * ⚠ DÜZ METİN DEĞİL, DÜĞÜM. Sekme etiketinin yanında sayaç/rozet
   * taşınabilsin diye genişletildi (iade ekranı 22.08.2026: "Bildirimler"
   * sekmesi açık bildirim sayısını rozetle taşıyor, çünkü o sayı başka
   * sekmedeyken de görünmeli). Dize hâlâ geçerli — eski kullanımlar aynen
   * çalışır.
   */
  etiket: React.ReactNode;
  adres: string;
  icerik: React.ReactNode;
};

export function SekmeliBolum({
  baslik,
  notu,
  sekmeler,
  secili,
  ustEylem,
}: {
  /**
   * ⚠ İSTEĞE BAĞLI. Sayfanın kendi `h1`i zaten aynı şeyi söylüyorsa başlık
   * yazmak tekrardır ve iki satır yer yer. Verilmezse yalnız sekme şeridi
   * çizilir.
   */
  baslik?: string;
  notu?: string;
  sekmeler: Sekme[];
  secili: string;
  /** Başlık hizasında duran eylem — ürün analizinde kart araması gibi. */
  ustEylem?: React.ReactNode;
}) {
  if (sekmeler.length === 0) return null;

  // Bilinmeyen/eksik seçim ilk sekmeye düşer — boş ekran gösterilmez.
  const aktif = sekmeler.find((s) => s.anahtar === secili) ?? sekmeler[0];

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-2 pb-3">
        {baslik || ustEylem ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {baslik ? (
              <CardTitle className="text-base">{baslik}</CardTitle>
            ) : (
              <span />
            )}
            {ustEylem}
          </div>
        ) : null}
        {notu ? <p className="text-muted-foreground text-xs">{notu}</p> : null}

        {/* Tek sekme varsa çubuk çizilmez — tıklanacak bir seçim yok. */}
        {sekmeler.length > 1 ? (
          <div className={SEKME_SERIDI}>
            {sekmeler.map((s) => (
              <Link
                key={s.anahtar}
                href={s.adres}
                /**
                 * SAYFA BAŞA ATMAZ — 15.08.2026 kullanıcı hatası.
                 *
                 * Next gezinmede sayfayı varsayılan olarak başa sarar; bu,
                 * SAYFA DEĞİŞTİRİRKEN doğrudur. Ama sekme aynı sayfada bir
                 * bölümü değiştiriyor: kullanıcı aşağıda bir karta bakarken
                 * sekmeye basınca ekran tepeye fırlıyor ve baktığı yeri
                 * kaybediyordu. Aynı gerekçe sayfa içi her süzgeç bağlantısı
                 * için geçerli (sıralama, para birimi, takvim penceresi).
                 */
                scroll={false}
                aria-current={s.anahtar === aktif.anahtar ? "page" : undefined}
                /* K330-④ — alt çizgili sekme (ortak biçim `sekmeSinifi`). Aktif hâl yine
                   AKSAN renginde (16.08.2026 kararı korunuyor: siyah dolgu yok). */
                className={sekmeSinifi(s.anahtar === aktif.anahtar)}
              >
                {s.etiket}
              </Link>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0">{aktif.icerik}</CardContent>
    </Card>
  );
}
