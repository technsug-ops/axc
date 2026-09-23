import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { DURUM_ZEMINI, type DurumRengi } from "@/lib/renkler";

/**
 * ============================================================================
 *  SATIR KARTI — LİSTE SATIRININ ORTAK ANATOMİSİ (K235, 22.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı: _"Hakedişlerdeki kart yapısı çok daha okunaklı ve
 *  düzenli; tüm sistemdeki liste biçimlerini gözden geçir ve yeni hale
 *  uyarla."_ Anatomi hakediş ödeme satırından ÇIKARILDI ve tek gövdeye
 *  alındı — o ekran da artık buradan besleniyor.
 *
 *      ┌──────────────────────────────────────────────────────────────┐
 *      │ BAŞLIK (iri/koyu)              SAĞ BLOK (tutar · rozet · eylem) │
 *      │ bağlam · bağlam · bağlam                              (⌄ açılır) │
 *      └──────────────────────────────────────────────────────────────┘
 *
 *  ⚠ NİYE ORTAK GÖVDE, NİYE HER EKRANA AYRI KOD: aynı anatomi üç ekranda
 *  kopyalansaydı dördüncüsünde yine "etiket solda rakam en sağda" satırı
 *  doğardı — İlke #12'nin adıyla yasakladığı kalıp — ve biri düzeltilip
 *  öteki unutulurdu (İlke #10). Yeni bir liste ekranı bu anatomiyi BEDAVA
 *  alır.
 *
 *  ⚠ TEK RENDER, İKİ KOPYA DEĞİL: eski desen aynı listeyi İKİ kez
 *  çiziyordu (masaüstü `<Table>` + telefon `ListeKarti`). Satır kartı
 *  `flex-wrap` ile iki ekranda da çalışır; ikinci kopya kalkınca "birini
 *  düzeltip ötekini unutma" riski de kalkar.
 *  ⛔ AMA TABLO YASAK DEĞİL: sütunları KARŞILAŞTIRMAK işin kendisiyse
 *  (stok, ürün analizi, rapor) tablo doğru araçtır — kart oraya
 *  uygulanırsa ekran uzar ve karşılaştırma zorlaşır. Satır kartı, satırın
 *  BİR manşet değeri + bağlamı olduğu listeler içindir.
 *
 *  ⚠ DOKUNMA HEDEFİ 56 px (İlke #8): satırın kendisi telefonda tıklanabilir
 *  bir yüzeydir; `min-h-14` hem açılır hem düz satırda aynıdır.
 * ============================================================================
 */

export function SatirListesi({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}

export function SatirKarti({
  baslik,
  vurgulu = false,
  baglam,
  sag,
  sagIzgara,
  zemin,
  acilir,
  acikMi = false,
}: {
  /** Satırın kimliği: manşet tutar, ürün adı ya da bağlantı. */
  baslik: ReactNode;
  /** Manşet bir RAKAMSA iri ve tabular — "şu satır ne kadar" tek bakışta. */
  vurgulu?: boolean;
  /**
   * İkincil bilgi; `·` ile ayrılır. `null`/`false` girdiler atılır, böylece
   * koşullu bağlam için dışarıda ayrı bir dizi kurmak gerekmez.
   */
  baglam?: ReactNode[];
  /** Sağ blok: tutar, rozet, düğme. */
  sag?: ReactNode;
  /**
   * Sağ bloğun sütun şablonu — verilirse sütunlar **SABİT** genişlikte
   * hizalanır (`sm:grid-cols-[8rem_10rem_12rem]` gibi).
   *
   * ⛔ NİYE VAR (K235-③, 23.09.2026, kullanıcı bildirimi): sağ blok bir
   * BÜTÜN olarak sağa yaslanıyor ve genişliği İÇERİĞİNE göre değişiyor.
   * Tazminat ekranında tutar (`₺799,91` ↔ `₺15.819,10`) ve not (`Not ekle`
   * ↔ iki satırlık hepsijet kodu) satırdan satıra farklı yer kaplayınca
   * bloğun sol kenarı kayıyor ve ARADAKİ açılır kutu her satırda başka bir
   * yerde duruyor. Kullanıcı: _"kutular sabit olmalı değil mi"_ — evet.
   *
   * ⚠ YALNIZ `sm:` VE ÜSTÜ: telefonda sabit sütun taşar; orada sarma
   * (`flex-wrap`) doğru davranıştır ve zaten sorun da orada değil.
   *
   * ⚠ GENİŞLİK UYDURULMAZ, EN UZUN İÇERİĞE GÖRE SEÇİLİR: dar bir sütun
   * rakamı kırpar ve kırpılan rakam yanlış okunur.
   */
  sagIzgara?: string;
  /**
   * Satırın DİKKAT çeken hâli — tabloda satır zemininin boyanmasının
   * karşılığı (ör. kanalda kapalı duran listeleme). Renk sınıfı `lib/renkler`
   * tokenlerinden gelir; ham Tailwind rengi yazılamaz.
   * ⚠ Verilmezse zemin YOK: her satır renkliyse hiçbiri vurgulu değildir.
   */
  zemin?: DurumRengi;
  /** Varsa satır açılır (`<details>` — JavaScript'siz, klavyeyle çalışır). */
  acilir?: ReactNode;
  /** Açılır satır başlangıçta açık mı. */
  acikMi?: boolean;
}) {
  /** ⚠ BOŞ DİZE DE ELENİR: yoksa " · " ayıracı yalnız başına kalır. */
  const temizBaglam = (baglam ?? []).filter(
    (b) => b !== null && b !== undefined && b !== false && b !== "",
  );
  const zeminSinifi = zemin ? ` ${DURUM_ZEMINI[zemin]}` : "";

  const govde = (
    <>
      <div className="min-w-0 flex-1">
        <div
          className={
            vurgulu
              ? "text-lg leading-tight font-semibold tabular-nums"
              : "leading-tight font-medium"
          }
        >
          {baslik}
        </div>
        {temizBaglam.length > 0 ? (
          <div className="text-muted-foreground mt-0.5 text-xs">
            {temizBaglam.map((b, i) => (
              <span key={i}>
                {i > 0 ? " · " : ""}
                {b}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {sag ? (
        <div
          className={
            "flex flex-wrap items-center gap-2" +
            (sagIzgara ? " sm:grid sm:items-center " + sagIzgara : "")
          }
        >
          {sag}
        </div>
      ) : null}
    </>
  );

  if (acilir === undefined) {
    return (
      <div
        className={`flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2${zeminSinifi}`}
      >
        {govde}
      </div>
    );
  }

  return (
    <details open={acikMi} className={`group rounded-lg border${zeminSinifi}`}>
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
        {govde}
        {/* Ok yönü açık/kapalı durumu SÖYLER — tıklanabilirlik görünür (İlke #2). */}
        <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t p-3">{acilir}</div>
    </details>
  );
}
