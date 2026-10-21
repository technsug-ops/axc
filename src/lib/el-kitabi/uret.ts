import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EL_KITABI_BICEMI } from "./bicem";
import { EKRAN_KLASORU } from "./ekranlar";
import { UYGULAMA } from "@/lib/uygulama";
import { elKitabiGovdesi } from "./icerik";
import { elKitabiVerisi } from "./veri";

/**
 * Tek üreteç, iki çıktı:
 *   - uygulama içi /el-kitabi sayfası  -> yalnız gövde + biçem
 *   - indirilebilir tek dosya          -> tam HTML belgesi
 *
 * İkisi de AYNI kaynaktan çıktığı için sapamaz.
 */
export async function elKitabiParcalari(uretimTarihi: string) {
  const veri = await elKitabiVerisi();
  return { bicem: EL_KITABI_BICEMI, govde: elKitabiGovdesi(veri, uretimTarihi) };
}

/**
 * EKRAN GÖRÜNTÜLERİNİ GÖM (K350-③). İndirilen dosya internetsiz ve girişsiz açılır;
 * `/kitap-ekran/…` adresi orada boşa düşerdi. Dosyalar sunucu paketine
 * `next.config.ts` → `outputFileTracingIncludes` ile girer. Okunamayan görüntü
 * SESSİZ düşmez: günlüğe tam yazılır ve adres olduğu gibi kalır (uygulamada görünür).
 */
export function ekranlariGom(govde: string, kok = process.cwd()): string {
  return govde.replace(new RegExp(`src="/${EKRAN_KLASORU}/([a-z0-9-]+)\\.jpg"`, "g"), (tum, ad: string) => {
    try {
      const veri = readFileSync(join(kok, "public", EKRAN_KLASORU, `${ad}.jpg`)).toString("base64");
      return `src="data:image/jpeg;base64,${veri}"`;
    } catch (hata) {
      console.error(`[el-kitabi] ekran görüntüsü gömülemedi: ${ad}`, hata);
      return tum;
    }
  });
}

/** Tarayıcıda tek başına açılabilen, dışa bağımlılığı olmayan belge. */
export async function elKitabiTekDosya(uretimTarihi: string): Promise<string> {
  const { bicem, govde } = await elKitabiParcalari(uretimTarihi);
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${UYGULAMA.ad} Kullanıcı El Kitabı</title>
<style>
html,body{margin:0;padding:0}
body{background:#EEF2EE}
@media (prefers-color-scheme:dark){body{background:#101613}}
${bicem}
</style>
</head>
<body>
${ekranlariGom(govde)}
</body>
</html>`;
}
