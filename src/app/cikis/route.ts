import { redirect } from "next/navigation";

import { oturumKapat } from "@/lib/oturum";

/**
 * ÇIKIŞ — çerezi siler ve giriş ekranına döner.
 *
 * Neden ayrı bir yol: geçersizleşmiş bir oturumla gezen tarayıcının çerezi
 * TEMİZLENMELİ. Sayfa çizimi sırasında çerez yazılamadığı için, kök yerleşim
 * geçersiz oturumu görünce buraya yönlendirir; burada çerez silinir ve
 * döngü kırılır.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  await oturumKapat();
  redirect("/giris");
}
