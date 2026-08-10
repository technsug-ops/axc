/**
 * ============================================================================
 *  MIGRATION HARF BEKÇİSİ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run migration:kontrol
 *
 *  NEDEN VAR:
 *  Geliştirme Windows'ta, üretim Linux'ta. Windows'taki MySQL tablo adlarını
 *  küçük harfe katlar (lower_case_table_names=1). Prisma migration SQL'ini
 *  üretirken tablo adını CANLI VERİTABANINDAN okur — bu yüzden Windows'ta
 *  üretilen dosyaya `ALTER TABLE \`category\`` yazılır. Linux'taki gerçek
 *  tablonun adı ise `Category`. O dosya olduğu gibi sunucuya gidince:
 *
 *      Table 'd047df6e.category' doesn't exist
 *
 *  09.08.2026'da yedi migration dosyasında bu hata vardı ve elle düzeltildi.
 *  Elle düzeltme unutulabilir; bu betik unutmaz.
 *
 *  NE YAPAR:
 *  Şemadaki model adlarını (tablo adları — projede @@map kullanılmıyor)
 *  okur, tüm migration SQL dosyalarını tarar, ters tırnak içinde geçen
 *  tablo adlarının yazımını karşılaştırır. Harfi tutmayan her satırı
 *  dosya + satır numarasıyla bildirir.
 *
 *  Çıkış kodu 1 ise: dosyayı DÜZELTMEDEN commit etmeyin.
 * ============================================================================
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SEMA_YOLU = join(process.cwd(), "prisma", "schema.prisma");
const MIGRATION_KOKU = join(process.cwd(), "prisma", "migrations");

/** Şemadaki `model X {` satırlarından tablo adlarını toplar. */
function tabloAdlari(): string[] {
  const sema = readFileSync(SEMA_YOLU, "utf8");

  // @@map varsa tablo adı model adından farklıdır ve bu betiğin varsayımı
  // çöker. Sessizce yanlış sonuç vermektense durup haber veriyoruz.
  if (/@@map\s*\(/.test(sema)) {
    console.log(
      "  ✗  Şemada @@map kullanılmış. Bu betik tablo adının model adıyla",
    );
    console.log("     aynı olduğunu varsayıyor — betiği güncelleyin.");
    process.exit(1);
  }

  return [...sema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((e) => e[1]);
}

type Bulgu = {
  dosya: string;
  satirNo: number;
  yazilan: string;
  dogrusu: string;
  satir: string;
};

function migrationDosyalari(): string[] {
  if (!existsSync(MIGRATION_KOKU)) return [];
  return readdirSync(MIGRATION_KOKU, { withFileTypes: true })
    .filter((g) => g.isDirectory())
    .map((g) => join(MIGRATION_KOKU, g.name, "migration.sql"))
    .filter((y) => existsSync(y))
    .sort();
}

/**
 * SADECE TABLO KONUMUNDAKİ adları yakalar.
 *
 * Her ters tırnaklı kelimeye bakmak yanlış alarm üretiyor: `ChannelSku`
 * tablosunun `channelSku` adında bir KOLONU var ve o kolon doğru yazılmış.
 * Tablo adı yalnızca şu anahtar kelimelerden sonra gelir.
 *
 * Tüm dosya metni birden taranır (satır satır değil): bir ifade
 * "ALTER TABLE" ile bir satırda, tablo adıyla bir sonraki satırda
 * bölünmüş olabilir.
 */
const TABLO_KONUMU =
  /\b(?:ALTER\s+TABLE|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|RENAME\s+TABLE|TRUNCATE(?:\s+TABLE)?|INSERT\s+INTO|REFERENCES|UPDATE|DELETE\s+FROM|FROM|JOIN|ON)\s+`([A-Za-z_][A-Za-z0-9_]*)`/gi;

function dosyayiTara(yol: string, adlar: Map<string, string>): Bulgu[] {
  const bulgular: Bulgu[] = [];
  const metin = readFileSync(yol, "utf8");
  const satirlar = metin.split(/\r?\n/);

  /** Karakter konumundan satır numarası (1'den başlar). */
  function satirNosu(konum: number): number {
    return metin.slice(0, konum).split(/\r?\n/).length;
  }

  for (const eslesme of metin.matchAll(TABLO_KONUMU)) {
    const yazilan = eslesme[1];
    const dogrusu = adlar.get(yazilan.toLowerCase());
    // Bilinen bir tablo adının FARKLI yazımı mı?
    if (dogrusu && dogrusu !== yazilan) {
      const satirNo = satirNosu(eslesme.index);
      bulgular.push({
        dosya: yol,
        satirNo,
        yazilan,
        dogrusu,
        satir: (satirlar[satirNo - 1] ?? "").trim(),
      });
    }
  }

  return bulgular;
}

function main() {
  const adlar = tabloAdlari();
  const dizin = new Map(adlar.map((a) => [a.toLowerCase(), a]));
  const dosyalar = migrationDosyalari();

  console.log("\nMIGRATION HARF BEKÇİSİ");
  console.log(`  ${adlar.length} tablo adı · ${dosyalar.length} migration dosyası\n`);

  const bulgular = dosyalar.flatMap((y) => dosyayiTara(y, dizin));

  if (bulgular.length === 0) {
    console.log(`  ✓  ${dosyalar.length}/${dosyalar.length} dosya temiz\n`);
    return;
  }

  // Dosya bazında grupla — okunur çıktı, tek tek satır listesi değil.
  const gruplar = new Map<string, Bulgu[]>();
  for (const b of bulgular) {
    const kisa = b.dosya.replace(process.cwd() + "\\", "").replace(/\\/g, "/");
    (gruplar.get(kisa) ?? gruplar.set(kisa, []).get(kisa)!).push(b);
  }

  for (const [dosya, liste] of gruplar) {
    console.log(`  ✗  ${dosya}`);
    for (const b of liste) {
      console.log(`       satır ${b.satirNo}:  \`${b.yazilan}\`  →  \`${b.dogrusu}\``);
      console.log(`         ${b.satir}`);
    }
    console.log("");
  }

  console.log(
    `  ${bulgular.length} yanlış yazım bulundu. Bu dosyalar Linux sunucuda`,
  );
  console.log("  \"Table doesn't exist\" hatası verir. Düzeltmeden commit etmeyin.\n");
  process.exitCode = 1;
}

main();
