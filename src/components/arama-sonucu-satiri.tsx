"use client";

import { Plus } from "lucide-react";

/**
 * ============================================================================
 *  ARAMA SONUCU SATIRI — SATIRIN TAMAMI TIKLANABİLİR
 * ----------------------------------------------------------------------------
 *  Kullanıcı bildirdi (11.08.2026): ürün adına tıklamak işe yaramıyordu,
 *  yalnızca sağdaki küçük "+ Ekle" düğmesi çalışıyordu. Liste bir seçim
 *  listesidir; insan gördüğü şeye tıklar.
 *
 *  ÜÇ KURAL BİR ARADA:
 *   #1 GÖRÜNÜR EYLEM  — "+ Ekle" görünmeye devam eder, kaldırılmaz.
 *   #2 TIKLANABİLİR GÖRÜNÜR — hover'da zemin değişir, imleç el olur.
 *      Gizli tıklama alanı bırakmak, satırın tıklanabilir OLDUĞUNU
 *      söylemeden tıklatmaya çalışmak olurdu.
 *   #8 MOBİL — satır yüksekliği 44px'in üstünde; dokunma hedefi kocaman.
 *
 *  TEKNİK: "+ Ekle" artık <span>, çünkü satırın kendisi <button>.
 *  İç içe düğme geçersiz HTML'dir ve klavye gezinmesini bozar.
 *  <button> olduğu için Enter ve Boşluk tuşları da çalışır.
 *
 *  Alım ve satış formu aynı bileşeni kullanır (#10 tutarlılık).
 * ============================================================================
 */
export function AramaSonucuSatiri({
  baslik,
  kodlar,
  ekleEtiketi,
  onEkle,
}: {
  baslik: string;
  /** SKU · Firma SKU · barkod — tek satırda, tek aralıklı yazı. */
  kodlar: string;
  ekleEtiketi: string;
  onEkle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onEkle}
        className="hover:bg-accent focus-visible:ring-ring flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{baslik}</span>
          <span className="text-muted-foreground block truncate font-mono text-xs">
            {kodlar}
          </span>
        </span>

        {/* Düğme GİBİ görünür ama <span>: satırın kendisi zaten düğme. */}
        <span className="border-input bg-background inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium">
          <Plus className="size-4" />
          {ekleEtiketi}
        </span>
      </button>
    </li>
  );
}
