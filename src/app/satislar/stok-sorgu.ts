"use server";

import { yetkiIste } from "@/lib/yetki";
import { varyantStogu } from "@/lib/stok";

/**
 * Satış formunda kalem eklenirken mevcut stoğu gösterir.
 *
 * Bu SADECE ERKEN UYARIDIR — asıl negatif stok engeli satış kaydedilirken
 * transaction içinde çalışır (src/lib/satis.ts). Buradaki değer okunduktan
 * sonra stok değişebilir; kullanıcı formu doldururken bilgisiz kalmasın diye
 * gösteriliyor (Kullanıcı Kolaylığı #9: bilgi listede olsun, detaya girmeye
 * gerek kalmasın).
 */
export async function varyantStoguGetir(variantId: string): Promise<number> {
  await yetkiIste("satis.yaz");

  return varyantStogu(variantId);
}
