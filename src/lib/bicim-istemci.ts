"use client";

import { useFormatter } from "next-intl";

import { bicimOlustur } from "./bicim-ortak";

/**
 * İstemci bileşenleri için biçimlendirici.
 * Sunucudaki bicimlendirici() ile aynı yüzeyi ve aynı mantığı sunar.
 *
 *   const bicim = useBicim();
 *   {bicim.para(tutar, paraBirimi)}
 */
export function useBicim() {
  return bicimOlustur(useFormatter());
}
