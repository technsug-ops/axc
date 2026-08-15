import type { LucideIcon } from "lucide-react";

import { DURUM_CIPI, type DurumRengi } from "@/lib/renkler";

/**
 * ============================================================================
 *  İSTATİSTİK KUTUSU — PANELİN TEK RAKAM KUTUSU
 * ----------------------------------------------------------------------------
 *  Panelde beş yerde elle yazılmış aynı kutu vardı: `rounded-lg border p-3` +
 *  gri etiket + `text-2xl` rakam. Beşi de birbirinin kopyasıydı, bu yüzden
 *  panel "tek düze" görünüyordu — bütün rakamlar aynı ağırlıkta duruyor,
 *  hangisinin önemli olduğu anlaşılmıyordu.
 *
 *  Bu bileşen üç şeyi getiriyor:
 *
 *  1. İKON ÇİPİ — her rakamın kendi ikonu, doygun renkli küçük kutuda.
 *     Tek düzeliği kıran şey ikonun KENDİSİ: beş kutu artık beş farklı şeye
 *     benziyor. Renk ise ancak durum VARSA renklenir; sayının kendisinde
 *     iyi/kötü yoksa çip nötr kalır. "Satış adedi" ne iyidir ne kötü.
 *
 *  2. HİYERARŞİ — `bas` verilen kutu daha iri rakam taşır. Ekranda her şey
 *     eşit önemdeyse hiçbir şey önemli değildir.
 *
 *  3. RAKAM SİYAH KALIR. Renk çipte; kontrast rakamda (kısıt #2). Rakamı da
 *     boyamak ikinci kez aynı şeyi söylemek olurdu.
 * ============================================================================
 */
export function IstatistikKutusu({
  etiket,
  ikon: Ikon,
  durum = "notr",
  bas = false,
  cocuk,
  altNot,
}: {
  etiket: string;
  ikon: LucideIcon;
  /**
   * Çipin rengi. Varsayılan NÖTR — bir rakama renk vermek için o rakamın
   * gerçekten bir durumu olmalı (kısıt #3: nötr taban korunur).
   */
  durum?: DurumRengi;
  /** Başrol kutusu: rakam bir boy iri. Ekranda en fazla bir-iki tane olmalı. */
  bas?: boolean;
  /** Rakamın kendisi — bağlantı, para bileşeni, ne gerekiyorsa. */
  cocuk: React.ReactNode;
  /** Rakamın altındaki açıklama ya da ikincil bağlantı. */
  altNot?: React.ReactNode;
}) {
  return (
    <div className="bg-card min-w-0 space-y-1 rounded-lg border p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-md ${DURUM_CIPI[durum]}`}
          aria-hidden="true"
        >
          <Ikon className="size-4" />
        </span>
        <span className="text-muted-foreground min-w-0 text-xs break-words">
          {etiket}
        </span>
      </div>
      <div
        className={`min-w-0 font-semibold tabular-nums ${bas ? "text-3xl" : "text-2xl"}`}
      >
        {cocuk}
      </div>
      {altNot ? <div className="min-w-0 text-xs">{altNot}</div> : null}
    </div>
  );
}

/**
 * PAY ÇUBUĞU — uzunluk bilgi taşır.
 *
 * Kanal kartları bir ızgara dolusu birbirinin aynı kutuydu; hangi kanalın
 * yükü taşıdığı ancak rakamları tek tek okuyup kafada karşılaştırınca
 * anlaşılıyordu. Çubuk bunu BAKINCA söylüyor — örnek ERP ekranındaki yatay
 * çubukların işi de buydu.
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
    <div className="flex min-w-0 items-center gap-2">
      <div className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-[#2F7FD1]"
          style={{ width: `${(guvenli * 100).toFixed(1)}%` }}
        />
      </div>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {etiket}
      </span>
    </div>
  );
}
