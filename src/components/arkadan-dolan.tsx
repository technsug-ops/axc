import type { ReactNode } from "react";

/**
 * ARKADAN DOLAN BÖLÜM (K332, 12.10.2026) — sunucu bileşeni.
 *
 * Sayfanın bir parçası yavaş bir sözü (promise) bekliyorsa, sayfanın TAMAMI onu
 * beklemesin diye o parça `<Suspense>` içine bu bileşenle konur: söz çözülünce
 * `ciz` çağrılır, o ana kadar `Suspense`in yer tutucusu görünür.
 *
 * ⚠ Söz SAYFADA bir kez başlatılır ve aynı sözü bekleyen bütün parçalar
 * paylaşır — iki parça aynı rakamı iki ayrı okumadan basmaz (sayı = liste).
 * `ciz` sunucuda çalışır; istemciye fonksiyon gitmez.
 */
export async function ArkadanDolan<T>({
  soz,
  ciz,
}: {
  soz: Promise<T>;
  ciz: (deger: T) => ReactNode;
}) {
  return <>{ciz(await soz)}</>;
}
