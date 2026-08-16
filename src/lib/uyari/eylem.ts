"use server";

import { uyarilariTopla } from "./topla";
import type { Uyari } from "./turler";

/**
 * ÇAN VERİSİ — SUNUCU EYLEMİ.
 *
 * Neden layout'ta değil: maliyetsiz stok uyarısı bütün stok hareketlerini
 * okuyan FIFO motorunu çalıştırıyor. Bunu kök layout'a koymak, uygulamadaki
 * HER sayfayı o sorgunun arkasında bekletirdi. Çan ikincil bir öğedir;
 * sayfanın çizilmesini geciktirmeye değmez.
 *
 * Yetki süzgeci `uyarilariTopla` içinde, SUNUCUDA uygulanıyor — istemciye
 * hiç göremeyeceği bir uyarı gönderilmiyor.
 */
export async function uyarilariGetir(): Promise<Uyari[]> {
  return uyarilariTopla();
}
