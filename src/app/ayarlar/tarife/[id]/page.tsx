import { redirect } from "next/navigation";

import { sayfaIzni } from "@/lib/yetki";

/**
 * K234 (22.09.2026): tarife aynası `/tarife?pencere=<id>` adresine taşındı —
 * menü kayıt numarasız adrese gider, en güncel pencereyi açar. Bu sayfa eski
 * bağlantılar (komisyon ekranı satırları, tarayıcı geçmişi) kırılmasın diye
 * DURUYOR ve yalnız yönlendirir. Gövde `[id]/ayna.tsx` ile `/tarife`de.
 */
export default async function EskiAynaAdresi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaIzni("tarife.gor");
  const { id } = await params;
  redirect(`/tarife?pencere=${encodeURIComponent(id)}`);
}
