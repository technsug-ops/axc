import { getFormatter } from "next-intl/server";

import { bicimOlustur } from "./bicim-ortak";

/**
 * Sunucu bileşenleri için biçimlendirici.
 *
 * Bileşenin başında BİR KEZ beklenir, sonra senkron kullanılır:
 *
 *   const bicim = await bicimlendirici();
 *   ...
 *   {bicim.para(kalem.unitCostAmount, kalem.unitCostCurrency)}
 *   {bicim.tarih(alim.purchasedAt)}
 *
 * Dil ve biçimler next-intl istek yapılandırmasından gelir; ikinci dil
 * eklendiğinde çağrı yerlerinde hiçbir değişiklik gerekmez.
 */
export async function bicimlendirici() {
  return bicimOlustur(await getFormatter());
}

export { tarihGirdisi } from "./bicim-ortak";
