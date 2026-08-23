import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /**
   * ⚠ DEĞİŞKEN, BİLDİRİMİNDEN ÖNCE KULLANILAMAZ — 23.08.2026 CANLI HATASI.
   *
   * `/iadeler` sunucu bileşeninde bir `.map()` çağrısı, kendisinden 20 satır
   * SONRA tanımlanan bir sabiti kullanıyordu. `.map()` hemen çalıştığı için
   * canlıda "Cannot access 'tBildirim' before initialization" hatası verdi
   * ve sayfa 500 döndü.
   *
   * ⚠ NE `tsc` NE 45 BEKÇİ NE `next build` GÖRDÜ. TypeScript'in
   * "bildirimden önce kullanım" kontrolü, kullanım bir OK FONKSİYONUNUN
   * içindeyse sırayı takip edemiyor — çünkü genel durumda o fonksiyon daha
   * sonra çağrılabilir. Burada hemen çağrılıyordu.
   *
   * ⚠ YALNIZ DEĞİŞKENLER. `functions: false` bilerek: fonksiyon bildirimleri
   * hoisting ile yukarı taşınır ve bu depoda yardımcı fonksiyonu kullanımın
   * ALTINDA tanımlamak yaygın bir okunabilirlik tercihi. Kural oraya
   * uygulansaydı yüzlerce yanlış pozitif üretir ve kapatılırdı.
   */
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": [
        "error",
        {
          functions: false,
          classes: false,
          variables: true,
          enums: false,
          typedefs: false,
          ignoreTypeReferences: true,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
