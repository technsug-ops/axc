import type { LucideIcon } from "lucide-react";

import {
  DURUM_CIPI,
  DURUM_ISARETI,
  DURUM_SERIDI,
  type DurumRengi,
} from "@/lib/renkler";

/**
 * ============================================================================
 *  RAKAM KUTUSU VE UYARI KARTI — TASARIM REFERANSINA GÖRE
 * ----------------------------------------------------------------------------
 *  Kaynak: kullanıcının `Site Sayfaları.dc.html` tasarım dosyası (Claude
 *  Design projesi "Palet Spesifikasyonu Tasarımı"). Üç katmanın HANGİSİNİN
 *  NEREDE kullanılacağı orada gösteriliyor ve ilk uygulamamda yanlış
 *  yerleştirmiştim:
 *
 *    K1 sol şerit  → UYARI/BİLDİRİM kartları
 *    K2 pastel rozet → tablo satırları VE stat kartlarının rakamının ALTI
 *    K3 doygun çip  → YALNIZ uyarı kartındaki 28 px ikon kutusu
 *
 *  Ben K3'ü stat kutularının etiketinin yanına koymuştum. Referans stat
 *  kartında hiç çip kullanmıyor: orada durumu taşıyan şey rakamın altındaki
 *  PASTEL ROZET (ya da oran gösteren çubuk). Doygun renk uyarıya ayrılmış —
 *  makul, çünkü doygunluk bir dikkat çağrısıdır ve her rakam kutusunda
 *  tekrarlanırsa çağrı olmaktan çıkar.
 * ============================================================================
 */

/**
 * STAT KARTI — etiket / iri rakam / (rozet ya da çubuk).
 *
 * Panelde beş yerde elle yazılmış aynı kutu vardı; hepsi aynı göründüğü için
 * hiçbiri önemli durmuyordu ve sayfa "tek düze" okunuyordu.
 */
export function IstatistikKutusu({
  etiket,
  bas = false,
  cocuk,
  rozet,
  altNot,
}: {
  etiket: string;
  /** Başrol kutusu: rakam bir boy iri. Ekranda en fazla bir tane olmalı. */
  bas?: boolean;
  /** Rakamın kendisi — bağlantı, para bileşeni, ne gerekiyorsa. */
  cocuk: React.ReactNode;
  /**
   * Rakamın ALTINDAKİ pastel rozet ya da pay çubuğu. Referansta stat
   * kartının durumu buradan konuşuyor.
   */
  rozet?: React.ReactNode;
  /** Açıklama ya da ikincil bağlantı. */
  altNot?: React.ReactNode;
}) {
  return (
    <div className="bg-card flex min-w-0 flex-col gap-1.5 rounded-lg border p-3">
      <span className="text-muted-foreground min-w-0 text-xs break-words">
        {etiket}
      </span>
      <span
        className={`min-w-0 font-semibold tabular-nums ${bas ? "text-3xl" : "text-2xl"}`}
      >
        {cocuk}
      </span>
      {rozet ? <span className="flex min-w-0">{rozet}</span> : null}
      {altNot ? <span className="min-w-0 text-xs">{altNot}</span> : null}
    </div>
  );
}

/**
 * UYARI KARTI — üç katmanın hepsi bir arada: sol şerit + doygun çip + metin.
 *
 * Panelde uyarılar `amber-500` gibi ham Tailwind sınıflarıyla yazılmıştı;
 * yani palet dışından. Tek kapı kuralı burada da geçerli.
 *
 * Çipteki işaret (✓ − • →) paletten geliyor: renk tek başına konuşmaz, renk
 * körlüğünde ve siyah-beyaz çıktıda işaret ayakta kalır (kısıt #1).
 */
export function UyariKarti({
  durum,
  baslik,
  altSatir,
  eylem,
  ikon: Ikon,
}: {
  durum: DurumRengi;
  baslik: React.ReactNode;
  altSatir?: React.ReactNode;
  /** Sağdaki düğme/bağlantı — "sorunluları gör" gibi. */
  eylem?: React.ReactNode;
  /**
   * Çipteki ikon. Verilmezse durumun kendi işareti (✓ − • →) yazılır;
   * ikonsuz da anlam kaybolmasın diye.
   */
  ikon?: LucideIcon;
}) {
  return (
    <div
      className={`bg-card flex min-w-0 flex-wrap items-center gap-3 rounded-lg border p-3 ${DURUM_SERIDI[durum]}`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-bold ${DURUM_CIPI[durum]}`}
        aria-hidden="true"
      >
        {Ikon ? <Ikon className="size-4" /> : DURUM_ISARETI[durum]}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-snug">
        <span className="font-medium break-words">{baslik}</span>
        {altSatir ? (
          <span className="text-muted-foreground block text-xs break-words">
            {altSatir}
          </span>
        ) : null}
      </div>
      {eylem ? <span className="shrink-0">{eylem}</span> : null}
    </div>
  );
}

/**
 * PAY ÇUBUĞU — uzunluk bilgi taşır.
 *
 * Referanstaki "Kota kullanımı" kartının karşılığı. Kanal kartları bir ızgara
 * dolusu birbirinin aynıydı; hangi kanalın yükü taşıdığı ancak rakamlar tek
 * tek okunup kafada karşılaştırılınca anlaşılıyordu.
 *
 * Renk taşımıyor, UZUNLUK taşıyor: tek aksan tonu yeterli. Kanal başına ayrı
 * renk verilseydi 11 ton dört durum rengiyle karışır ve "yeşil = iyi" anlamı
 * çökerdi.
 *
 * Yüzde metni de yazılıyor: çubuk tek başına okunmaz (kısıt #1).
 */
export function PayCubugu({
  oran,
  etiket,
}: {
  /** 0–1 arası. Sınır dışı değer kırpılır: bozuk veri ekranı taşırmaz. */
  oran: number;
  /** Ekran okuyucu ve gören kullanıcı için yazılı karşılık ("%38"). */
  etiket: string;
}) {
  const guvenli = Math.max(0, Math.min(1, Number.isFinite(oran) ? oran : 0));
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="bg-muted h-2 min-w-0 flex-1 overflow-hidden rounded-full">
        <span
          className="block h-full rounded-full bg-[#2F7FD1]"
          style={{ width: `${(guvenli * 100).toFixed(1)}%` }}
        />
      </span>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {etiket}
      </span>
    </span>
  );
}
