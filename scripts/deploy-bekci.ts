import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { beklenenSemayiCikar } from "./migration-semasi";

/**
 * ============================================================================
 *  DEPLOY BEKÇİSİ — "KOD, ŞEMASININ ÖNÜNE GEÇEMEZ"
 * ----------------------------------------------------------------------------
 *  ⚠ NEDEN YAZILDI (17.08.2026, mimar kararı)
 *
 *  `8cb0023` şemaya `Sale`'in dört iptal sütununu ekledi ve push edildi.
 *  Migration SQL'i ONAY BEKLİYORDU, canlıda koşulmadı. Ama kod deploy oldu:
 *  Prisma her `Sale` okumasında canlıda OLMAYAN sütunu istedi ve `Sale`
 *  okuyan HER ekran 500 verdi. Canlı, tek bir push'la yattı.
 *
 *  Kural o güne kadar "migration onaysız koşulmaz" idi ve tuttu. Eksik olan
 *  diğer yarısıydı: migration'ı bekletmek, ona bağlı KODU da bekletmek
 *  demektir. Disiplin bu oturumda üç kez tutmadığı için kural artık yapısal:
 *
 *      Şema commit'i, migration canlıda koşana kadar PUSH EDİLMEZ.
 *
 *  Bu betik `prebuild` olarak çalışır — Vercel'de her deploy'dan ÖNCE. Kırmızı
 *  yanarsa build durur, kırık kod canlıya ULAŞAMAZ.
 *
 *  ── ÜÇ KATMAN, ÜÇ AYRI HATA ─────────────────────────────────────────────
 *  A) Şemada alan var, MIGRATION DOSYASI hiç yazılmamış
 *  B) Migration dosyası var ama CANLIDA KOŞULMAMIŞ   ← 8cb0023 vakası
 *  C) (bağlantı varsa) canlı `_prisma_migrations` ile damga tutuyor mu
 *
 *  ── KATMAN B BAĞLANTISIZ NASIL BİLİYOR ──────────────────────────────────
 *  Canlıya bağlanmak her ortamda mümkün değil: KAS uzak erişimi IP listesine
 *  bağlı ve bu betik Vercel'in build makinesinde koşuyor. Bu yüzden "canlıda
 *  ne uygulandı" bilgisi bir DAMGA dosyasında tutuluyor.
 *
 *  Damgayı İNSAN GÜNCELLEMEZ — `npm run canli:migrate` başarıyla bittiğinde
 *  kendisi yazar. Elle tutulan liste er ya da geç kendi geçmişini doğrulayan
 *  bir törene dönüşür (aynı ders `migration-semasi.ts` başında da yazılı).
 * ============================================================================
 */

export const DAMGA_YOLU = join(process.cwd(), "prisma", "canli-migrasyon-damgasi.json");
const MIGRATION_KOK = join(process.cwd(), "prisma", "migrations");
const SEMA_YOLU = join(process.cwd(), "prisma", "schema.prisma");

export type Damga = {
  aciklama: string;
  guncelleme: string;
  uygulananlar: string[];
};

export function migrationKlasorleri(): string[] {
  if (!existsSync(MIGRATION_KOK)) return [];
  return readdirSync(MIGRATION_KOK)
    .filter((ad) => statSync(join(MIGRATION_KOK, ad)).isDirectory())
    .sort();
}

export function damgayiOku(): Damga | null {
  if (!existsSync(DAMGA_YOLU)) return null;
  try {
    return JSON.parse(readFileSync(DAMGA_YOLU, "utf8")) as Damga;
  } catch {
    return null;
  }
}

/**
 * Şemadaki SKALER alanlar — tablo kolonuna karşılık gelenler.
 *
 * İlişki alanları (`items SaleItem[]`, `iptalEden User?`) veritabanında
 * KOLON DEĞİLDİR; ayıklanmazsa bekçi her modelde yanlış alarm verir. Ölçüt:
 * alanın tipi bir MODEL adıysa ilişkidir, değilse (String/Int/enum) kolondur.
 * Enum alanları kolondur ve dışarıda bırakılmaz.
 *
 * Bu depoda `@map` KULLANILMIYOR (sıfır kullanım, ölçüldü) — alan adı kolon
 * adına eşittir. Bir gün `@map` girerse burası yanlış alarm verir; o yüzden
 * `@map` görülürse alan ATLANIR, sessizce yanlış eşleşmez.
 */
export function semaKolonlari(): Map<string, Set<string>> {
  const metin = readFileSync(SEMA_YOLU, "utf8");
  const modelAdlari = new Set(
    [...metin.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]),
  );

  const sonuc = new Map<string, Set<string>>();
  for (const blok of metin.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const kolonlar = new Set<string>();
    for (const ham of blok[2].split("\n")) {
      const satir = ham.trim();
      if (satir === "" || satir.startsWith("//") || satir.startsWith("@@")) continue;
      if (satir.includes("@map(")) continue; // bkz. yorum — sessiz yanlış eşleşme yok
      const m = /^(\w+)\s+(\w+)/.exec(satir);
      if (!m) continue;
      if (modelAdlari.has(m[2])) continue; // ilişki alanı — kolon değil
      kolonlar.add(m[1]);
    }
    sonuc.set(blok[1], kolonlar);
  }
  return sonuc;
}

export type BekciBulgusu = { katman: "A" | "B"; mesaj: string };

/** Katman A — şemada var, migration dosyalarında yok. */
export function katmanA(): BekciBulgusu[] {
  const migrationSema = beklenenSemayiCikar().tablolar;
  const bulgular: BekciBulgusu[] = [];

  for (const [tablo, kolonlar] of semaKolonlari()) {
    const migrationKolonlari = migrationSema.get(tablo);
    if (!migrationKolonlari) {
      bulgular.push({
        katman: "A",
        mesaj: `tablo şemada var, migration'da YOK: ${tablo}`,
      });
      continue;
    }
    for (const kolon of kolonlar) {
      if (!migrationKolonlari.has(kolon)) {
        bulgular.push({
          katman: "A",
          mesaj: `kolon şemada var, migration'da YOK: ${tablo}.${kolon}`,
        });
      }
    }
  }
  return bulgular;
}

/** Katman B — migration dosyası var, damgaya göre canlıda koşulmamış. */
export function katmanB(
  klasorler: string[],
  damga: Damga | null,
): { bulgular: BekciBulgusu[]; damgaYok: boolean } {
  if (damga === null) return { bulgular: [], damgaYok: true };
  const uygulanan = new Set(damga.uygulananlar);
  return {
    damgaYok: false,
    bulgular: klasorler
      .filter((k) => !uygulanan.has(k))
      .map((k) => ({
        katman: "B" as const,
        mesaj: `migration dosyası var, CANLIDA KOŞULMAMIŞ: ${k}`,
      })),
  };
}

function main() {
  console.log("\nDEPLOY BEKÇİSİ — kod, şemasının önüne geçemez\n");

  const a = katmanA();
  console.log("A) ŞEMA ↔ MIGRATION DOSYALARI");
  if (a.length === 0) {
    const tabloSayisi = semaKolonlari().size;
    console.log(`  ✓  ${tabloSayisi} model · şemadaki her alanın migration'ı var`);
  } else {
    for (const b of a) console.log(`  ✗  ${b.mesaj}`);
  }

  const klasorler = migrationKlasorleri();
  const damga = damgayiOku();
  const { bulgular: b, damgaYok } = katmanB(klasorler, damga);

  console.log("\nB) MIGRATION DOSYALARI ↔ CANLI DAMGASI");
  if (damgaYok) {
    /**
     * SESSİZ YEŞİL YASAĞI. Damga yoksa bu katman KARAR VEREMEZ; "sorun yok"
     * demek yalancı yeşil olurdu. Build durdurulmuyor (damga ilk kez
     * kurulana kadar deploy kilitlenmesin) ama atlandığı ekrana yazılıyor.
     */
    console.log("  ⚠  damga dosyası yok — bu katman KARAR VEREMEDİ, atlandı");
    console.log(`     kurulacak dosya: prisma/canli-migrasyon-damgasi.json`);
  } else if (b.length === 0) {
    console.log(
      `  ✓  ${klasorler.length} migration · hepsi canlıda uygulanmış (damga ${damga!.guncelleme})`,
    );
  } else {
    for (const x of b) console.log(`  ✗  ${x.mesaj}`);
  }

  const bulgular = [...a, ...b];
  if (bulgular.length > 0) {
    console.log("\n────────────────────────────────────────────────────────");
    console.log("  BUILD DURDURULDU — kod, canlı şemasının ÖNÜNDE.");
    console.log("");
    if (a.length > 0) {
      console.log("  Şemayı değiştirdiniz ama migration yazmadınız:");
      console.log("      npx prisma migrate dev --name <ad>");
    }
    if (b.length > 0) {
      console.log("  Migration hazır ama canlıda koşmadı. İKİ YOLDAN BİRİ:");
      console.log("      1) onay + bağlantı varsa:  npm run canli:migrate");
      console.log("      2) beklemesi gerekiyorsa:  şema commit'ini geri alın");
      console.log("         (8cb0023 vakası — canlı bu yüzden 500 verdi)");
    }
    console.log("────────────────────────────────────────────────────────\n");
    process.exitCode = 1;
    return;
  }

  console.log("\nDEPLOY EDİLEBİLİR.\n");
}

/** Doğrulama betiği bu dosyayı içe aktarabilsin diye: yalnız doğrudan koşunca çalışır. */
if (process.argv[1]?.replace(/\\/g, "/").endsWith("deploy-bekci.ts")) main();
