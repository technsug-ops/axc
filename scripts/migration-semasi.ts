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

    /**
     * CREATE TABLE gövdesindeki kolonlar da TOPLANIR.
     *
     * Önce yalnız tablo adı alınıyordu; kolonlar boş kümeyle geçiliyordu.
     * Sonucu: yeni bir tabloyla gelen kolonların hiçbiri doğrulanmıyordu ve
     * "şemada var, migration'da yok" hâli yakalanamıyordu — kontrolün en
     * çok işe yarayacağı yer tam da yeni tablolardı.
     *
     * Gövde `\n)` ile kapanır (Prisma çıktısı satır başında kapatır); kolon
     * satırları backtick ile BAŞLAR, `INDEX` / `PRIMARY KEY` / `UNIQUE` /
     * `CONSTRAINT` satırları başlamaz — ayrım bu.
     */
    for (const m of sql.matchAll(/CREATE TABLE\s+`(\w+)`\s*\(([\s\S]*?)\n\)/g)) {
      const kume = tablolar.get(m[1]) ?? new Set<string>();
      for (const satir of m[2].split("\n")) {
        const k = /^\s*`([A-Za-z_][A-Za-z0-9_]*)`\s+\S/.exec(satir);
        if (k) kume.add(k[1]);
      }
      tablolar.set(m[1], kume);
    }

    /**
     * Bir `ALTER TABLE` birden çok `ADD COLUMN` taşıyabilir (virgülle
     * ayrılmış). İfadeyi bütün olarak alıp içindeki her kolonu topluyoruz;
     * yalnız ilkini almak sessizce eksik doğrulama olurdu.
     */
    for (const m of sql.matchAll(
      /ALTER TABLE\s+`(\w+)`([\s\S]*?);/g,
    )) {
      const tablo = m[1];
      const govde = m[2];
      if (!tablolar.has(tablo)) tablolar.set(tablo, new Set());
      const kume = tablolar.get(tablo)!;
      for (const k of govde.matchAll(/ADD COLUMN\s+`(\w+)`/g)) {
        kume.add(k[1]);
      }
      for (const k of govde.matchAll(/DROP COLUMN\s+`(\w+)`/g)) {
        kume.delete(k[1]);
      }
      /**
       * YENİDEN ADLANDIRMA (`CHANGE eski yeni`) — eski ad düşer, yeni ad
       * girer. İşlenmezse yeniden adlandırılan kolon "migration'da yok"
       * sanılır: `axcaliSku → companySku` göçü tam olarak buydu.
       */
      for (const k of govde.matchAll(/CHANGE\s+`(\w+)`\s+`(\w+)`/g)) {
        kume.delete(k[1]);
        kume.add(k[2]);
      }
    }

    for (const m of sql.matchAll(/DROP TABLE\s+(?:IF EXISTS\s+)?`(\w+)`/g)) {
      tablolar.delete(m[1]);
    }
  }

  return { tablolar };
}
