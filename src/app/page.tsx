import { redirect } from "next/navigation";

/**
 * Ana sayfa şimdilik ayrı bir gösterge paneli barındırmıyor.
 * Faz 1'de tek aktif bölüm Ürünler olduğu için doğrudan oraya yönlendiriyoruz.
 */
export default function Home() {
  redirect("/urunler");
}
