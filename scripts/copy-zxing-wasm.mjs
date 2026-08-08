/**
 * zxing-wasm'ın okuyucu .wasm dosyasını public/ altına kopyalar.
 *
 * NEDEN: Kütüphane varsayılan olarak .wasm'ı jsDelivr CDN'inden çeker.
 * Depo internet olmadan da çalışsın ve dış bir servise bağımlı olmayalım
 * diye dosyayı kendi sunucumuzdan veriyoruz.
 *
 * postinstall içinde çalışır; böylece zxing-wasm güncellenince kopya da
 * kendiliğinden tazelenir (sürüm uyuşmazlığı riski kalmaz).
 */

import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  const kaynak = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
  await mkdir("public", { recursive: true });
  await copyFile(kaynak, "public/zxing_reader.wasm");
  console.log("zxing_reader.wasm -> public/ kopyalandi");
} catch (e) {
  console.error("zxing_reader.wasm kopyalanamadi:", e.message);
  process.exitCode = 1;
}
