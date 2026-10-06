import { readFileSync, writeFileSync } from "node:fs";

/**
 * ============================================================================
 *  FİRMA BAĞ KAPISI — TETİKLEYİCİ ÜRETİCİ (K303 Aşama 4, 03.10.2026)
 * ----------------------------------------------------------------------------
 *  Tasarım §4.5: «bir kayıt BAŞKA firmanın kaydına bağlanamasın». İzolasyon
 *  bekçisi ölçtü: A'nın satış kalemi B'nin varyantına, A'nın satışı B'nin kanal
 *  hesabına BAĞLANABİLİYORDU — süzgeç okumayı ayırıyor, bağı değil.
 *
 *  NEDEN VERİTABANI TETİKLEYİCİSİ (seçenekler ölçüldü):
 *  · süzgeç içinden kontrol: süzgeç işlemin DIŞINDAN bakar; aynı işlemde yeni
 *    açılmış kaydı (satış → kalemleri) göremez, meşru yazımı reddederdi;
 *  · bileşik yabancı anahtar: 67 bağın ve ona dayanan kodun yeniden yazımı,
 *    Prisma'nın yönetmediği anahtarlar şema↔veritabanı farkı üretir;
 *  · tetikleyici: aynı işlemin içini görür, Prisma onu YÖNETMEZ (fark üretmez).
 *    Canlıda kurulabildiği ölçüldü: veritabanında ALL PRIVILEGES +
 *    `log_bin_trust_function_creators = 1`.
 *
 *  ⛔ ELLE LİSTE YOK: bağlar ŞEMADAN türetilir (firmaya ait model → firmaya ait
 *  modele giden her `@relation(fields: [x], references: [id])`). Bekçi aynı
 *  türetmeyle her bağın tetikleyicide olduğunu sınar.
 *
 *      npx tsx scripts/firma-bag-tetikleyici-uret.ts <migration.sql yolu>
 * ============================================================================
 */

export type Bag = { tablo: string; alan: string; hedef: string };

/** Geri yüklemenin kapıyı kendi oturumunda kapattığı değişken — YALNIZ orada geçer (desen yasağı). */
export const KAPI_DEGISKENI = "selliora_bag_kapisi_kapali";

export function bagIliskileri(sema: string, firmaModelleri: Set<string>): Bag[] {
  const metin = sema.replace(/\r\n/g, "\n");
  const baglar: Bag[] = [];
  for (const m of metin.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)) {
    const tablo = m[1]!;
    if (!firmaModelleri.has(tablo)) continue;
    for (const r of m[2]!.matchAll(/^\s+\w+\s+(\w+)\??\s+@relation\(([^)]*)\)/gm)) {
      const hedef = r[1]!;
      if (hedef === "Company" || !firmaModelleri.has(hedef)) continue;
      const alan = /fields:\s*\[\s*(\w+)\s*\]/.exec(r[2]!)?.[1];
      const ref = /references:\s*\[\s*(\w+)\s*\]/.exec(r[2]!)?.[1];
      if (!alan) continue; // ilişkinin karşı tarafı — alan taşımaz
      if (ref !== "id") throw new Error(`beklenmeyen bağ biçimi: ${tablo}.${alan} -> ${hedef}(${ref})`);
      baglar.push({ tablo, alan, hedef });
    }
  }
  return baglar.sort((a, b) => (a.tablo + a.alan).localeCompare(b.tablo + b.alan));
}

/** Tablo başına iki tetikleyici: eklemede her bağ, güncellemede yalnız DEĞİŞEN bağ sınanır. */
export function tetikleyiciSql(baglar: Bag[]): string {
  const tablolar = [...new Set(baglar.map((b) => b.tablo))].sort();
  const parcalar: string[] = [];
  for (const t of tablolar) {
    const kendi = baglar.filter((b) => b.tablo === t);
    const kosul = (b: Bag, guncelleme: boolean) => {
      const degisti = guncelleme ? ` AND (NOT (NEW.\`${b.alan}\` <=> OLD.\`${b.alan}\`) OR NOT (NEW.\`companyId\` <=> OLD.\`companyId\`))` : "";
      return (
        `  IF NEW.\`${b.alan}\` IS NOT NULL${degisti} AND NOT EXISTS (SELECT 1 FROM \`${b.hedef}\` WHERE \`id\` = NEW.\`${b.alan}\` AND \`companyId\` = NEW.\`companyId\`) THEN\n` +
        `    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ${t}.${b.alan} -> ${b.hedef}';\n` +
        `  END IF;`
      );
    };
    /* Kapı yalnız GERİ YÜKLEME oturumunda kapanır (`@KAPI_DEGISKENI`), tıpkı
       FOREIGN_KEY_CHECKS gibi: kendine bağlı tablolarda (stok hareketi → kaynak
       hareket) yazım sırası garanti değildir. Geri yükleme yazınca bütün bağları
       TOPLU doğrular (`firmaBagIhlalSorgulari`) ve ihlalde işlemi geri alır. */
    const govde = (g: boolean) =>
      `  IF @${KAPI_DEGISKENI} IS NULL THEN\n${kendi.map((b) => kosul(b, g).replace(/^/gm, "  ")).join("\n")}\n  END IF;`;
    parcalar.push(
      `CREATE TRIGGER \`${t}_firma_bag_ekle\` BEFORE INSERT ON \`${t}\` FOR EACH ROW\nBEGIN\n${govde(false)}\nEND;`,
      `CREATE TRIGGER \`${t}_firma_bag_guncelle\` BEFORE UPDATE ON \`${t}\` FOR EACH ROW\nBEGIN\n${govde(true)}\nEND;`,
    );
  }
  return parcalar.join("\n\n") + "\n";
}

/** Üretilmiş bağ listesi — geri yüklemenin toplu doğrulaması bunu okur. */
export function bagListesiDosyasi(baglar: Bag[]): string {
  return [
    "/**",
    " * ÜRETİLMİŞ DOSYA — ELLE DÜZENLEMEYİN. Kaynak: prisma/schema.prisma",
    " * Üretici: scripts/firma-bag-tetikleyici-uret.ts (K303 Aşama 4 — firma bağ kapısı).",
    " */",
    `export const FIRMA_BAGLARI: readonly { tablo: string; alan: string; hedef: string }[] = ${JSON.stringify(baglar, null, 2)};`,
    `export const BAG_KAPISI_DEGISKENI = ${JSON.stringify(KAPI_DEGISKENI)};`,
    "",
  ].join("\n");
}
export const BAG_LISTESI_DOSYASI = "src/lib/firma-baglari.uretilmis.ts";

export const BASLIK = `-- K303 Aşama 4 (03.10.2026): FİRMA BAĞ KAPISI — bir kayıt BAŞKA firmanın kaydına bağlanamaz.
-- ÜRETİLMİŞ: scripts/firma-bag-tetikleyici-uret.ts (şemadan; elle düzenlemeyin).
-- Veritabanı tetikleyicisi: aynı işlemin içini görür; Prisma tetikleyicileri yönetmez.
-- İhlal: SQLSTATE 45000 'FIRMA_BAG_IHLALI: <tablo>.<alan> -> <hedef>'.

`;

/** İlk (ana) bağ kapısı migration'ı — Aşama 4'te kurulan tablolar burada. */
export const ANA_BAG_MIGRATION = "prisma/migrations/20261003100500_k303_firma_bag_kapisi/migration.sql";

/**
 * SONRADAN EKLENEN TABLOLAR (06.10.2026, KanalAnahtari ile ortaya çıktı): ana
 * dosya bir kez koştu; onu yeniden yazmak koşmuş migration'ı değiştirir ve
 * sıfırdan kurulumda tetikleyiciyi TABLODAN ÖNCE yaratıp düşerdi. Bu yüzden her
 * migration dosyası YALNIZ başka hiçbir migration'da tetikleyicisi olmayan
 * tabloları taşır. Bekçi bütün dosyaları toplayıp şemayla karşılaştırır.
 * ⚠ Var olan bir tabloya YENİ bağ eklenirse (tetikleyici metni değişir) bu
 * üretici onu yazmaz — bekçi «metin farklı» diye kırmızı yanar ve DROP+CREATE
 * içeren ayrı bir migration elle istenir (kör yeniden yazım yok).
 */
export function migrationTetikleyicileri(metin: string): Map<string, string> {
  const m = new Map<string, string>();
  const duz = metin.replace(/\r\n/g, "\n");
  const desen = /CREATE TRIGGER `(\w+)_firma_bag_(?:ekle|guncelle)` [\s\S]*?\nEND;/g;
  for (let x = desen.exec(duz); x; x = desen.exec(duz)) m.set(x[1]!, (m.get(x[1]!) ?? "") + x[0] + "\n");
  return m;
}

/** Şemadan beklenen tetikleyici metni — tablo başına (bekçi karşılaştırması için). */
export function beklenenTetikleyiciler(baglar: Bag[]): Map<string, string> {
  return migrationTetikleyicileri(tetikleyiciSql(baglar));
}

if (process.argv[1] && /firma-bag-tetikleyici-uret\.ts$/.test(process.argv[1].replace(/\\/g, "/"))) {
  void (async () => {
    const { readdirSync, existsSync } = await import("node:fs");
    const { MODEL_HARITASI } = await import("../src/lib/firma-modelleri.uretilmis");
    const firma = new Set(Object.entries(MODEL_HARITASI).filter(([, b]) => b.firma).map(([k]) => k));
    const baglar = bagIliskileri(readFileSync("prisma/schema.prisma", "utf8"), firma);
    const hedef = process.argv[2]?.replace(/\\/g, "/");
    if (!hedef) throw new Error("migration.sql yolu verilmedi");
    // Başka migration'larda tetikleyicisi olan tablolar bu dosyaya YAZILMAZ.
    const baskalarinda = new Set<string>();
    for (const d of readdirSync("prisma/migrations")) {
      const y = `prisma/migrations/${d}/migration.sql`;
      if (y === hedef || !existsSync(y)) continue;
      for (const t of migrationTetikleyicileri(readFileSync(y, "utf8")).keys()) baskalarinda.add(t);
    }
    const buraya = baglar.filter((b) => !baskalarinda.has(b.tablo));
    if (buraya.length === 0) throw new Error("bu dosyaya yazılacak tablo yok — bütün tabloların tetikleyicisi başka migration'larda");
    writeFileSync(hedef, BASLIK + tetikleyiciSql(buraya));
    writeFileSync(BAG_LISTESI_DOSYASI, bagListesiDosyasi(baglar));
    console.log(`yazıldı: ${hedef} · ${buraya.length} bağ · ${new Set(buraya.map((b) => b.tablo)).size} tablo (toplam ${baglar.length} bağ)`);
  })();
}
