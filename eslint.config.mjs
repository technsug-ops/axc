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
    /**
     * ⚠ 30.08.2026'DA EKLENDİ — BEKÇİNİN KENDİ ÇIKTISI LİNT'İ KIRIYORDU.
     *
     * K48 ile `derleme:dogrula` tura girdi ve derlemeyi `.next-bekci/`
     * altına yazıyor (335 MB üretilmiş JS). Dizin `.gitignore`da vardı ama
     * ESLint'ten dışlanmamıştı; `npm run lint` o üretilmiş yığını taramaya
     * başladı ve `require() style import`, `@ts-ignore`, `module` ataması
     * gibi ONLARCA hatayla kırmızı yandı. Hataların hiçbiri BİZİM kodumuzda
     * değildi.
     *
     * ⚠ VE KİMSE GÖRMEDİ: `lint` bekçi turunda YOK — tur `package.json`dan
     * `:dogrula` / `:bekci` / `:kontrol` ekiyle keşfediyor ve düz `lint` bu
     * kalıba uymuyor. Yani bir bekçinin yan etkisi, tur DIŞINDAKİ bir
     * kontrolü bozdu ve tur yeşil yanmaya devam etti.
     * _(Anayasa: "iyi bir refaktör bekçiyi kör etmemeli" — burada tersi
     * oldu, yeni bir bekçi başka bir kontrolü kör etti.)_
     */
    ".next-bekci/**",
  ]),
]);

export default eslintConfig;
