import { EL_KITABI_BICEMI } from "./bicem";
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

/** Tarayıcıda tek başına açılabilen, dışa bağımlılığı olmayan belge. */
export async function elKitabiTekDosya(uretimTarihi: string): Promise<string> {
  const { bicem, govde } = await elKitabiParcalari(uretimTarihi);
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Selliora Kullanıcı El Kitabı</title>
<style>
html,body{margin:0;padding:0}
body{background:#EEF2EE}
@media (prefers-color-scheme:dark){body{background:#101613}}
${bicem}
</style>
</head>
<body>
${govde}
</body>
</html>`;
}
