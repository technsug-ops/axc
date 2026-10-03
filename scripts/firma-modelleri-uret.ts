import { readFileSync, writeFileSync } from "node:fs";

/**
 * ============================================================================
 *  FİRMA MODELLERİ HARİTASI — ÜRETİCİ (K303 Aşama 3a)
 * ----------------------------------------------------------------------------
 *      npm run firma-modelleri:uret
 *
 *  Firma süzgeci iki şeyi bilmek zorunda: ① hangi model firmaya ait
 *  (`companyId` alanı taşıyan her model) ② iç içe yazımda bir ilişki alanı
 *  hangi modele gidiyor ve hangi skaler yabancı anahtarlar o modeli işaret
 *  ediyor (kontrollü/kontrolsüz giriş biçimini ayırmak için).
 *
 *  ⛔ ELLE LİSTE YOK (anayasa: «bekçi ölçütü elle tutulan liste değil, tersten
 *  kurulur»): harita şemadan ÜRETİLİR. Prisma bu bilgiyi açık API ile vermiyor;
 *  iç alanına (`runtimeDataModel`) bağlanmak sürüm yükseltmesinde sessizce
 *  kırılırdı. `firma-modelleri:dogrula` haritayı yeniden üretip dosyayla
 *  kıyaslar — şema değişip harita yenilenmezse KIRMIZI.
 * ============================================================================
 */

export type IliskiAlani = { hedef: string; liste: boolean };
export type ModelBilgisi = {
  firma: boolean;
  /** ilişki alanı adı → hedef model */
  iliskiler: Record<string, IliskiAlani>;
  /** başka modeli işaret eden skaler yabancı anahtarlar (companyId HARİÇ) */
  yabanciAnahtarlar: string[];
};

export function haritaUret(sema: string): Record<string, ModelBilgisi> {
  const metin = sema.replace(/\r\n/g, "\n");
  const modelAdlari = new Set([...metin.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]!));
  const harita: Record<string, ModelBilgisi> = {};
  for (const m of metin.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)) {
    const ad = m[1]!;
    const bilgi: ModelBilgisi = { firma: false, iliskiler: {}, yabanciAnahtarlar: [] };
    for (const hamSatir of m[2]!.split("\n")) {
      const satir = hamSatir.replace(/\/\/.*$/, "").trim();
      if (!satir || satir.startsWith("@@")) continue;
      const p = /^(\w+)\s+(\w+)(\[\])?(\?)?/.exec(satir);
      if (!p) continue;
      const [, alan, tip, liste] = p;
      if (alan === "companyId") bilgi.firma = true;
      if (modelAdlari.has(tip!)) {
        bilgi.iliskiler[alan!] = { hedef: tip!, liste: Boolean(liste) };
        const fk = /@relation\([^)]*fields:\s*\[([^\]]*)\]/.exec(satir);
        if (fk) {
          for (const f of fk[1]!.split(",").map((x) => x.trim()).filter(Boolean)) {
            if (f !== "companyId") bilgi.yabanciAnahtarlar.push(f);
          }
        }
      }
    }
    harita[ad] = bilgi;
  }
  return harita;
}

export function dosyaMetni(harita: Record<string, ModelBilgisi>): string {
  const sirali = Object.fromEntries(Object.keys(harita).sort().map((k) => [k, harita[k]]));
  return [
    "/**",
    " * ÜRETİLMİŞ DOSYA — ELLE DÜZENLEMEYİN. Kaynak: prisma/schema.prisma",
    " * Yenilemek: npm run firma-modelleri:uret · Tazeliği: npm run firma-modelleri:dogrula",
    " * (K303 Aşama 3a — firma süzgecinin model ve ilişki haritası.)",
    " */",
    'import type { ModelBilgisi } from "../../scripts/firma-modelleri-uret";',
    "",
    `export const MODEL_HARITASI: Record<string, ModelBilgisi> = ${JSON.stringify(sirali, null, 2)};`,
    "",
  ].join("\n");
}

export const HARITA_DOSYASI = "src/lib/firma-modelleri.uretilmis.ts";

if (process.argv[1] && /firma-modelleri-uret\.ts$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const harita = haritaUret(readFileSync("prisma/schema.prisma", "utf8"));
  writeFileSync(HARITA_DOSYASI, dosyaMetni(harita));
  const firma = Object.entries(harita).filter(([, b]) => b.firma).map(([k]) => k);
  console.log(`yazıldı: ${HARITA_DOSYASI} · ${Object.keys(harita).length} model · firmaya ait ${firma.length}`);
}
