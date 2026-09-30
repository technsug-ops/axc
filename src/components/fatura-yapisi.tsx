"use client";

import { useTranslations } from "next-intl";

/**
 * FATURA YAPISI KUTULARI (K309) — «Fiyatlar KDV dahil» · «Kargo fiyata dahil».
 * Tedarikçi formu, tedarikçi satırı ve alım formu AYNI bileşeni kullanır
 * (İlke #10). Değer gizli alanla her zaman AÇIKÇA gider ("1"/"0") — işaretsiz
 * kutu formda hiç gönderilmez ve «yok» hayır sayılamaz (`lib/alim-fatura.ts`).
 */
export function FaturaYapisiKutulari({
  fiyatKdvDahil,
  kargoDahil,
  onDegisim,
  kimlik,
}: {
  fiyatKdvDahil: boolean;
  kargoDahil: boolean;
  onDegisim: (d: { fiyatKdvDahil: boolean; kargoDahil: boolean }) => void;
  /** Aynı sayfada birden çok form varsa `id` çakışmasın. */
  kimlik: string;
}) {
  const t = useTranslations("FaturaYapisi");
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <input type="hidden" name="fiyatKdvDahil" value={fiyatKdvDahil ? "1" : "0"} />
      <input type="hidden" name="kargoDahil" value={kargoDahil ? "1" : "0"} />
      <label htmlFor={`${kimlik}-kdv`} className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
        <input
          id={`${kimlik}-kdv`}
          type="checkbox"
          checked={fiyatKdvDahil}
          onChange={(e) => onDegisim({ fiyatKdvDahil: e.target.checked, kargoDahil })}
          className="size-4"
        />
        {t("fiyatKdvDahil")}
      </label>
      <label htmlFor={`${kimlik}-kargo`} className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
        <input
          id={`${kimlik}-kargo`}
          type="checkbox"
          checked={kargoDahil}
          onChange={(e) => onDegisim({ fiyatKdvDahil, kargoDahil: e.target.checked })}
          className="size-4"
        />
        {t("kargoDahil")}
      </label>
    </div>
  );
}
