import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { duzenGecerliMi, duzeniCoz, duzeniOku, type KayitliDuzen } from "../src/lib/menu/duzen";
import { MENU_GRUPLARI, MENU_KATALOGU } from "../src/lib/menu/katalog";

/**
 * ============================================================================
 *  MENÜ DÜZENİ — "FİYATLANDIRMA VE ANALİZ" GRUBUNU CANLI KAYDA YAZ (K234)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — tek bir firma kaydını, ölçülmüş bir hedefe
 *  taşır; genel araç değildir (menü düzeni normalde `/ayarlar/menu`den
 *  değiştirilir).
 *
 *      npx tsx scripts/canli-menu-duzeni-yaz.ts            → KURU KOŞUM
 *      npx tsx scripts/canli-menu-duzeni-yaz.ts --uygula   → YAZAR
 *
 *  NİYE BETİK: menü sırası VERİ (`Company.menuDuzeni`, K51) ve kayıt
 *  varsayılanı EZER. Katalogda dört kalemin varsayılan grubunu değiştirmek
 *  canlıdaki kaydı OYNATMAZ — kullanıcı 25.08'de bir düzen kaydetmiş
 *  (ölçüldü 22.09: `gunluk` 12 kalem, 5 grup). Kullanıcı isteği (22.09):
 *  dört ekran yeni grupta. Ya kullanıcı sürükler ya bu betik yazar.
 *
 *  NE YAPAR: kayıtlı düzeni okur; dört anahtarı bulunduğu yerden çıkarır;
 *  `grupFiyatAnaliz` grubunu istenen sırayla ekler; geri kalan her şeyi
 *  OLDUĞU GİBİ bırakır. Yazmadan önce `duzeniCoz` ile çözer ve hiçbir
 *  kalemin kaybolmadığını (çözülen küme = eski çözülen küme ∪ yeni kalem)
 *  ÖLÇER; tutmazsa yazmaz.
 *
 *  GERİ ALMA: yerel anlık görüntü (`veri/ozel/menu-duzeni-*.json`) eski
 *  JSON'u olduğu gibi taşır; `--geri=<dosya>` ile geri yazılır.
 * ============================================================================
 */

const GRUP = "grupFiyatAnaliz";
const SIRA = ["urunAnalizi", "urunKarti", "simulasyon", "tarifeHesaplama"] as const;

async function main() {
  const uygula = process.argv.includes("--uygula");
  const geri = process.argv.find((a) => a.startsWith("--geri="))?.slice(7);
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("Canlı yapılandırma okunamadı:", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nMENÜ DÜZENİ — FİYATLANDIRMA VE ANALİZ GRUBU");
  console.log(`  kip  ${geri ? "GERİ ALMA" : uygula ? "⚠ YAZIM" : "KURU KOŞUM — hiçbir şey yazılmaz"}`);
  console.log("=".repeat(72));

  const firmalar = await prisma.company.findMany({ select: { id: true, name: true, menuDuzeni: true } });
  if (firmalar.length !== 1) { console.log(`⛔ firma sayısı ${firmalar.length} — bu betik tek firma için yazıldı.`); process.exitCode = 1; await prisma.$disconnect(); return; }
  const firma = firmalar[0]!;

  if (geri) {
    const { readFileSync } = await import("node:fs");
    const eski = JSON.parse(readFileSync(geri, "utf8")) as { firmaId: string; eskiMenuDuzeni: unknown };
    if (eski.firmaId !== firma.id) { console.log("⛔ görüntü başka firmaya ait."); process.exitCode = 1; await prisma.$disconnect(); return; }
    await prisma.company.update({ where: { id: firma.id }, data: { menuDuzeni: eski.eskiMenuDuzeni === null ? null : JSON.stringify(eski.eskiMenuDuzeni) } });
    await prisma.auditLog.create({ data: { action: "MENU_DUZENI_GERI", targetType: "Company", targetId: firma.id, detail: JSON.stringify({ goruntu: geri }) } });
    console.log("geri yazıldı · iz bırakıldı");
    await prisma.$disconnect();
    return;
  }

  const ham = firma.menuDuzeni === null ? null : String(firma.menuDuzeni);
  const kayitli: KayitliDuzen | null = ham === null ? null : duzeniOku(ham);
  console.log(`firma ${firma.name} · kayıtlı düzen: ${kayitli ? "VAR" : "YOK (varsayılan geçerli, yazmaya gerek yok)"}`);
  if (!kayitli) { await prisma.$disconnect(); return; }

  const cikar = (liste: readonly string[]) => liste.filter((a) => !(SIRA as readonly string[]).includes(a));
  const yeni: KayitliDuzen = {
    gunluk: cikar(kayitli.gunluk),
    gruplar: [
      ...kayitli.gruplar.filter((g) => g.anahtar !== GRUP).map((g) => ({ anahtar: g.anahtar, ogeler: cikar(g.ogeler) })),
      { anahtar: GRUP, ogeler: [...SIRA] },
    ],
  };
  if (!duzenGecerliMi(yeni)) { console.log("⛔ üretilen düzen geçersiz."); process.exitCode = 1; await prisma.$disconnect(); return; }

  /** KAYIP YOK ÖLÇÜMÜ: çözülen küme eskisini kapsamalı. */
  const eskiCoz = duzeniCoz(MENU_KATALOGU, MENU_GRUPLARI, kayitli);
  const yeniCoz = duzeniCoz(MENU_KATALOGU, MENU_GRUPLARI, yeni);
  const kume = (d: typeof eskiCoz) => new Set([...d.gunluk, ...d.gruplar.flatMap((g) => g.ogeler)]);
  const eskiKume = kume(eskiCoz); const yeniKume = kume(yeniCoz);
  const kaybolan = [...eskiKume].filter((a) => !yeniKume.has(a));
  console.log(`\nçözülen kalem: eski ${eskiKume.size} · yeni ${yeniKume.size} · kaybolan ${kaybolan.length}`);
  console.log("yeni grup:", yeniCoz.gruplar.find((g) => g.anahtar === GRUP)?.ogeler.join(" · "));
  console.log("günlük   :", yeniCoz.gunluk.join(" · "));
  for (const g of yeniCoz.gruplar) if (g.anahtar !== GRUP) console.log(`${g.anahtar.padEnd(16)}: ${g.ogeler.join(" · ")}`);
  if (yeniCoz.taninmayanlar.length) console.log("tanınmayan (eski anahtar, düşer):", yeniCoz.taninmayanlar.join(" · "));
  if (kaybolan.length > 0) { console.log("⛔ kalem kaybolurdu:", kaybolan.join(", "), "— YAZILMADI"); process.exitCode = 1; await prisma.$disconnect(); return; }

  if (!uygula) { console.log("\nKURU KOŞUM BİTTİ — hiçbir şey yazılmadı.  Yazmak için: -- --uygula"); await prisma.$disconnect(); return; }

  const damga = new Date();
  const goruntu = `veri/ozel/menu-duzeni-${damga.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(goruntu, JSON.stringify({ firmaId: firma.id, damga: damga.toISOString(), eskiMenuDuzeni: kayitli, yeniMenuDuzeni: yeni }, null, 2), "utf8");
  await prisma.company.update({ where: { id: firma.id }, data: { menuDuzeni: JSON.stringify(yeni) } });
  await prisma.auditLog.create({ data: { action: "MENU_DUZENI_YAZIM", targetType: "Company", targetId: firma.id,
    detail: JSON.stringify({ damga: damga.toISOString(), grup: GRUP, sira: SIRA, goruntu, gerekce: "K234 kullanici istegi: dort fiyat ekrani tek grupta" }) } });
  console.log(`\nyazıldı · iz bırakıldı · görüntü ${goruntu}`);
  console.log(`geri almak için:  npx tsx scripts/canli-menu-duzeni-yaz.ts --geri=${goruntu}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
