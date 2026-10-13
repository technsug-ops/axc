import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { acikPartilerToplu, type Parti } from "@/lib/stok";

/**
 * ============================================================================
 *  AÇIK PARTİLER — AYNI İSTEKTE BİR KEZ (K332, 12.10.2026)
 * ----------------------------------------------------------------------------
 *  Ölçüldü (yerel): bütün açık partilerin okunması ~300 ms. Panelde ÜÇ blok
 *  aynı veriyi ayrı ayrı okuyordu — yaşlanma (ürün analizi), iş zekâsı (ABC ·
 *  stok değeri) ve vitrin kutusu (stoktaki ürünlerin partileri). Üçünün de
 *  2 dk önbelleği var ve genelde AYNI açılışta birlikte doluyor; o açılışta iş
 *  üç kez yapılıyordu.
 *
 *  React `cache` istek kapsamlıdır: aynı istekte bir kez okunur, istek bitince
 *  düşer. Ortak bir 2 dk önbellek SEÇİLMEDİ: o zaman bir blok kendi notunda
 *  «şu saatte hesaplandı» yazarken verisi daha eski olabilirdi. Burada her blok
 *  verisini kendi hesap anında okur — hiçbir şey eskimez.
 *
 *  ⚠ Dönen harita çağıranlarca DEĞİŞTİRİLMEZ (yalnız okunur/süzülür).
 *  İstek dışında (betik, bekçi) `cache` doğrudan çağırır.
 * ============================================================================
 */
export const acikPartilerIstekte = cache((): Promise<Map<string, Parti[]>> => acikPartilerToplu(prisma, null));
