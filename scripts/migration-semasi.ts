import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  MIGRATION'LARDAN BEKLENEN ŞEMAYI ÇIKARIR
 * ----------------------------------------------------------------------------
 *  ⚠ NEDEN YAZILDI (16.08.2026, mimar notu)
 *
 *  Canlı migration betiğinin sağlık kontrolü ELLE tutulan bir listeydi ve
 *  başındaki yorum bile "her migration'da genişletilir" diye uyarıyordu.
 *  Disiplin tam da öngörüldüğü gibi tutmadı: `GecmisEkstre` gönderildi,
 *  sağlık kontrolü onu HİÇ sormadı ve yine "CANLI ŞEMA GÜNCEL" dedi.
 *
 *  Bir kontrol, güncellenmesi insana bırakıldığı sürece er ya da geç kendi
 *  geçmişini doğrulayan bir törene dönüşür. Bu yüzden liste artık
 *  MIGRATION DOSYALARINDAN türetiliyor: yeni tablo/kolon gönderen kişinin
 *  hiçbir şey eklemesi gerekmiyor, unutabileceği bir adım kalmıyor.
 *
 *  ── SINIR ────────────────────────────────────────────────────────────────
 *  Ayrıştırıcı SALT-EKLEME migration'lara göre yazıldı (`CREATE TABLE`,
 *  `ADD COLUMN`). Bu depoda yıkıcı ifade yok — `migration:kontrol` bunu
 *  ayrıca sınıyor. Yine de `DROP` ifadeleri beklenen kümeden DÜŞÜLÜYOR ki
 *  ileride bir sütun kaldırılırsa kontrol yanlış alarm vermesin.
 * ============================================================================
 */

export type BeklenenSema = {
  /** Tablo adı → beklenen kolon adları (yalnız migration'da ADD COLUMN ile eklenenler). */
  tablolar: Map<string, Set<string>>;
};

const KOK = join(process.cwd(), "prisma", "migrations");

function migrationDosyalari(): string[] {
  return readdirSync(KOK)
    .filter((ad) => statSync(join(KOK, ad)).isDirectory())
    .sort() // klasör adı zaman damgasıyla başlıyor — sıra kronolojik
    .map((ad) => join(KOK, ad, "migration.sql"));
}

/** Yorumları soyar — SQL yorumundaki örnek bir tablo adı sayılmasın. */
function yorumsuz(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((s) => !s.trimStart().startsWith("--"))
    .join("\n");
}

export function beklenenSemayiCikar(): BeklenenSema {
  const tablolar = new Map<string, Set<string>>();

  for (const yol of migrationDosyalari()) {
    let sql: string;
    try {
      sql = yorumsuz(readFileSync(yol, "utf8"));
    } catch {
      continue;
    }

    for (const m of sql.matchAll(/CREATE TABLE\s+`([A-Za-z_]+)`/g)) {
      if (!tablolar.has(m[1])) tablolar.set(m[1], new Set());
    }

    /**
     * Bir `ALTER TABLE` birden çok `ADD COLUMN` taşıyabilir (virgülle
     * ayrılmış). İfadeyi bütün olarak alıp içindeki her kolonu topluyoruz;
     * yalnız ilkini almak sessizce eksik doğrulama olurdu.
     */
    for (const m of sql.matchAll(
      /ALTER TABLE\s+`([A-Za-z_]+)`([\s\S]*?);/g,
    )) {
      const tablo = m[1];
      const govde = m[2];
      if (!tablolar.has(tablo)) tablolar.set(tablo, new Set());
      const kume = tablolar.get(tablo)!;
      for (const k of govde.matchAll(/ADD COLUMN\s+`([A-Za-z_]+)`/g)) {
        kume.add(k[1]);
      }
      for (const k of govde.matchAll(/DROP COLUMN\s+`([A-Za-z_]+)`/g)) {
        kume.delete(k[1]);
      }
    }

    for (const m of sql.matchAll(/DROP TABLE\s+(?:IF EXISTS\s+)?`([A-Za-z_]+)`/g)) {
      tablolar.delete(m[1]);
    }
  }

  return { tablolar };
}
