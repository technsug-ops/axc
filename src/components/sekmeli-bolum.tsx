import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  etiket: string;
  adres: string;
  icerik: React.ReactNode;
};

export function SekmeliBolum({
  baslik,
  notu,
  sekmeler,
  secili,
}: {
  baslik: string;
  notu?: string;
  sekmeler: Sekme[];
  secili: string;
}) {
  if (sekmeler.length === 0) return null;

  // Bilinmeyen/eksik seçim ilk sekmeye düşer — boş ekran gösterilmez.
  const aktif = sekmeler.find((s) => s.anahtar === secili) ?? sekmeler[0];

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-2 pb-3">
        <CardTitle className="text-base">{baslik}</CardTitle>
        {notu ? <p className="text-muted-foreground text-xs">{notu}</p> : null}

        {/* Tek sekme varsa çubuk çizilmez — tıklanacak bir seçim yok. */}
        {sekmeler.length > 1 ? (
          <div className="flex flex-wrap gap-1">
            {sekmeler.map((s) => (
              <Link
                key={s.anahtar}
                href={s.adres}
                aria-current={s.anahtar === aktif.anahtar ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm md:min-h-9 ${
                  s.anahtar === aktif.anahtar
                    ? "bg-foreground text-background"
                    : "hover:bg-muted"
                }`}
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
