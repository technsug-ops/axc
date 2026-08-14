import Link from "next/link";

import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { YAS_BANDI_RENGI } from "@/lib/durum-renkleri";
import { DURUM_ZEMINI } from "@/lib/renkler";

/**
 * ============================================================================
 *  PANEL LİSTE KARTLARI — "HANGİ ÜRÜN?" SORULARININ EKRANI
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 14.08.2026: en çok satılan, en çok kâr eden, en az kâr
 *  bırakan ve stokta en çok bekleyen ürünler panelde görünsün.
 *
 *  NEDEN TABLO DEĞİL: dört liste yan yana duracak. Her biri tablo olsaydı
 *  başlık satırları + hücre dolguları ekranı sağa taşırdı (14.08.2026'da
 *  ölçülen sorun). Liste satırı iki kolonlu: solda kimlik, sağda rakam.
 *
 *  KİMLİK KODU LİSTEDE ve TIK-KOPYALA (İlke #3, #4): ürün adının altında
 *  SKU durur ve tek tıkla kopyalanır — panelden koda ihtiyaç duyulan yer
 *  pazaryeri paneline yapıştırmaktır.
 *
 *  BU DOSYA SUNUM KATMANIDIR: hesap yapmaz, biçimlendirme yapmaz. Sayılar
 *  `page.tsx`'te biçimlenip metin olarak gelir; böylece para birimi ve dil
 *  kararları tek yerde kalır.
 * ============================================================================
 */

export type PanelListeSatiri = {
  anahtar: string;
  urunAdi: string;
  /** Ürün kartına bağlantı; bilinmiyorsa ad düz metin kalır. */
  urunId: string | null;
  sku: string;
  /** Sağdaki birincil değer — zaten biçimlenmiş metin. */
  deger: string;
  /** Sağdaki ikincil satır (adet, sermaye…). */
  altDeger?: string | null;
  /** Adın yanındaki rozet — yaşlanma bandı burada gelir. */
  rozet?: React.ReactNode;
};

export function PanelListesi({
  baslik,
  notu,
  satirlar,
  bosMesaj,
  skuEtiketi,
  ustEylem,
  altNot,
  genis = false,
}: {
  baslik: string;
  /** Başlığın altındaki tek satırlık açıklama — ölçütü söyler. */
  notu?: string | null;
  satirlar: PanelListeSatiri[];
  bosMesaj: string;
  /** Ekran okuyucu için kopyalama etiketi ("SKU"). */
  skuEtiketi: string;
  /** Başlığın sağındaki eylem — sıralama düğmeleri gibi. */
  ustEylem?: React.ReactNode;
  /** Listenin altındaki uyarı — kapsam sınırları burada yazar. */
  altNot?: React.ReactNode;
  /**
   * Liste TEK BAŞINA tam genişlikte mi duruyor?
   *
   * 15.08.2026: genişlik sınırı (max-w-3xl) iki liste yan yanayken doğru,
   * ama tek liste geniş bir kartta durunca sağ tarafı boş bırakıyor —
   * kullanıcı haklı olarak "kötü tasarım" dedi. Bu kipte satırlar İKİ
   * SÜTUNA dizilir: alan dolar, liste yarı yüksekliğe iner ve satırlar
   * yine dar kalır (yani "etiket solda / rakam çok sağda" tuzağı doğmaz).
   */
  genis?: boolean;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{baslik}</CardTitle>
          {ustEylem}
        </div>
        {notu ? (
          <p className="text-muted-foreground text-xs">{notu}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        {satirlar.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {bosMesaj}
          </p>
        ) : (
          /**
           * GENİŞLİK SINIRLI — 14.08.2026, kullanıcı üç ayrı ekranda aynı
           * şeyi söyledi: "çok verimsiz yerleşim".
           *
           * Satırlar tam genişlikte `justify-between` duruyordu: ürün adı en
           * solda, rakam en sağda, arada yüzlerce piksel boşluk. Geniş
           * ekranda göz addan rakama uzun bir yol katediyor ve iki satırı
           * karşılaştırmak zorlaşıyor. Sayıların yakın durması okumayı
           * hızlandırır; boşluk bilgi taşımaz.
           *
           * KURAL: panelde tam genişlikte "etiket solda / rakam sağda" satır
           * OLMAZ. Dar kartlarda (2×2 ızgara) zaten sınır etkisizdir; asıl
           * kazanç tam genişlikte duran listelerde (yaşlanma).
           */
          <ul
            className={
              genis
                ? "grid gap-x-8 sm:grid-cols-2 [&>li]:border-b"
                : "max-w-3xl divide-y"
            }
          >
            {satirlar.map((s) => (
              <li
                key={s.anahtar}
                className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                {/* `min-w-0` şart: olmadan uzun ad kısalmaz, kartı taşırır. */}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    {s.urunId ? (
                      <Baglanti
                        href={`/urunler/${s.urunId}`}
                        title={s.urunAdi}
                        className="block truncate text-sm"
                      >
                        {s.urunAdi}
                      </Baglanti>
                    ) : (
                      <span className="block truncate text-sm" title={s.urunAdi}>
                        {s.urunAdi}
                      </span>
                    )}
                    {s.rozet}
                  </div>
                  <KopyalanabilirKod
                    deger={s.sku}
                    etiket={skuEtiketi}
                    className="text-muted-foreground"
                  />
                </div>

                <div className="shrink-0 text-right tabular-nums">
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {s.deger}
                  </div>
                  {s.altDeger ? (
                    <div className="text-muted-foreground text-xs whitespace-nowrap">
                      {s.altDeger}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {altNot ? (
          <p className="text-muted-foreground mt-3 border-t pt-3 text-xs">
            {altNot}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * YAŞ BANDI ROZETİ — bölüm başlığı değil satır rozeti (kullanıcı kararı
 * 14.08.2026). Ölçüldü: 19 kalemin 17'si aynı banda düşüyor; üç bölüm
 * başlığı açmak listeyi bilgi yerine süsle bölerdi.
 *
 * RENK TEK BAŞINA ANLAM TAŞIMAZ: rozette gün sayısı da yazar, çünkü renk
 * körlüğünde ya da siyah-beyaz çıktıda kırmızı ile amber ayırt edilemez.
 */
export function BantRozeti({
  bant,
  metin,
}: {
  bant: "NOTR" | "AMBER" | "KIRMIZI";
  metin: string;
}) {
  /** Renk paletten; eşleme lib/durum-renkleri.ts'te (60+ gün kırmızı). */
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium ${DURUM_ZEMINI[YAS_BANDI_RENGI[bant]]}`}
    >
      {metin}
    </span>
  );
}

/** İki seçenekli sıralama düğmesi — bağlantıdır, JavaScript gerektirmez. */
export function SiralamaDugmeleri({
  secenekler,
}: {
  secenekler: { etiket: string; adres: string; seciliMi: boolean }[];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {secenekler.map((s) => (
        <Button
          key={s.adres + s.etiket}
          asChild
          size="sm"
          variant={s.seciliMi ? "default" : "outline"}
          className="h-11 text-xs md:h-7"
        >
          {/* Sayfa içi sıralama: başa sarmaz. */}
          <Link href={s.adres} scroll={false}>
            {s.etiket}
          </Link>
        </Button>
      ))}
    </div>
  );
}
