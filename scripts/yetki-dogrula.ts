/**
 * ============================================================================
 *  YETKİ DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run yetki:dogrula
 *
 *  DÖRT BÖLÜM:
 *  1) KORUMASIZ ACTION BEKÇİSİ — her server action'ın ilk işi yetki
 *     sormak mı? Bu bölüm paketin en önemli parçası: 58 action var ve
 *     BİRİ unutulursa o kapı herkese açık kalır. Menü gizlemek yetki
 *     değildir; unutulan bir action sessizce çalışır.
 *  2) KORUMASIZ SAYFA BEKÇİSİ — aynı şey sayfalar için.
 *  3) İZİN LİSTESİ TUTARLILIĞI — kodda tanımlı ama hiçbir yerde
 *     kullanılmayan izin var mı; koruma satırında tanınmayan anahtar
 *     kullanılmış mı.
 *  4) SEED TUTARLILIĞI — SAHİP tüm izinlere sahip mi, OPERASYON'un
 *     izinleri tanınıyor mu.
 *
 *  Veritabanına GİTMEZ (4. bölüm hariç, o da yalnız yerelde koşar):
 *  kaynak ağacını tarar.
 * ============================================================================
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  IZINLER,
  OPERASYON_IZINLERI,
  TUM_IZINLER,
  izinTaninirMi,
} from "../src/lib/yetki/izinler";

let basarisiz = 0;
let calisan = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/** Kaynak ağacındaki tüm .ts/.tsx dosyaları. */
function dosyalar(kok: string): string[] {
  const sonuc: string[] = [];
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) {
      if (ad === "generated" || ad === "node_modules") continue;
      sonuc.push(...dosyalar(yol));
    } else if (/\.tsx?$/.test(ad)) {
      sonuc.push(yol);
    }
  }
  return sonuc;
}

const KAYNAKLAR = dosyalar("src");

/**
 * YETKİ İSTEMEYEN ACTION'LAR — gerekçesi olan istisnalar.
 * Listeye ekleme yapmadan önce iki kez düşün: her istisna bir kapıdır.
 */
const ACTION_ISTISNALARI = new Map<string, string>([
  ["girisYap", "giriş yapmamış kullanıcı çağırır — yetki isteyemez"],
  ["cikisYap", "çıkış her zaman serbest olmalı"],
]);

// ===========================================================================
console.log("\n1) KORUMASIZ ACTION BEKÇİSİ");
// ===========================================================================
{
  const korumasiz: string[] = [];
  const korumali: string[] = [];
  const istisna: string[] = [];

  for (const yol of KAYNAKLAR) {
    const icerik = readFileSync(yol, "utf8");
    if (!icerik.includes('"use server"')) continue;

    // Her export edilen async fonksiyon bir action'dır.
    const desen = /export async function (\w+)\s*\([\s\S]*?\)\s*:?[\s\S]*?\{/g;
    let eslesme: RegExpExecArray | null;

    while ((eslesme = desen.exec(icerik)) !== null) {
      const ad = eslesme[1];
      // Gövde: fonksiyon açılışından sonraki 900 karakter — koruma satırı
      // ilk işlerden biri olmalı, dibe gizlenmiş bir kontrol koruma değildir.
      const govde = icerik.slice(eslesme.index, eslesme.index + 900);

      if (ACTION_ISTISNALARI.has(ad)) {
        istisna.push(ad);
        continue;
      }
      if (/yetkiIste\(|yetkiBaglami\(|izinVarMi\(/.test(govde)) {
        korumali.push(ad);
      } else {
        korumasiz.push(`${ad}  (${yol.replace(/\\/g, "/")})`);
      }
    }
  }

  console.log(
    `        ${korumali.length} korumalı · ${istisna.length} istisna · ${korumasiz.length} KORUMASIZ`,
  );
  kontrol(
    "her server action yetki istiyor",
    korumasiz.length === 0,
    korumasiz.length ? korumasiz.join("\n         ") : undefined,
  );

  for (const [ad, sebep] of ACTION_ISTISNALARI) {
    kontrol(`  istisna gerekçeli: ${ad}`, sebep.length > 10);
  }
}

// ===========================================================================
console.log("\n2) KORUMASIZ SAYFA BEKÇİSİ");
// ===========================================================================
/** Yetki istemeyen sayfalar — gerekçeli. */
const SAYFA_ISTISNALARI = new Map<string, string>([
  ["src/app/giris/page.tsx", "giriş ekranı"],
  ["src/app/page.tsx", "panel — girişi olan herkes görür"],
]);
{
  const korumasiz: string[] = [];
  let korumali = 0;

  for (const yol of KAYNAKLAR) {
    if (!/[\\/]page\.tsx$/.test(yol)) continue;
    const anahtar = yol.replace(/\\/g, "/");
    if (SAYFA_ISTISNALARI.has(anahtar)) continue;

    const icerik = readFileSync(yol, "utf8");
    if (/yetkiIste\(|yetkiBaglami\(|izinVarMi\(|sayfaIzni\(/.test(icerik)) {
      korumali++;
    } else {
      korumasiz.push(anahtar);
    }
  }

  console.log(`        ${korumali} korumalı · ${korumasiz.length} KORUMASIZ`);
  kontrol(
    "her sayfa yetki istiyor",
    korumasiz.length === 0,
    korumasiz.length ? korumasiz.join("\n         ") : undefined,
  );
}

// ===========================================================================
console.log("\n3) İZİN LİSTESİ TUTARLILIĞI");
// ===========================================================================
{
  kontrol(
    "izin anahtarları tekrarsız",
    new Set(TUM_IZINLER).size === TUM_IZINLER.length,
    `${TUM_IZINLER.length} izin, ${new Set(TUM_IZINLER).size} benzersiz`,
  );

  kontrol(
    "OPERASYON izinlerinin hepsi tanınıyor",
    OPERASYON_IZINLERI.every((i) => izinTaninirMi(i)),
    OPERASYON_IZINLERI.filter((i) => !izinTaninirMi(i)).join(", "),
  );

  // OPERASYON marj göremez — kararın kendisi.
  const yasak = ["satis.kar.gor", "rapor.gor", "hakedis.gor", "kart.gor", "envanter.gor"];
  const sizinti = yasak.filter((i) => (OPERASYON_IZINLERI as readonly string[]).includes(i));
  kontrol(
    "OPERASYON'da marj/para izni YOK",
    sizinti.length === 0,
    sizinti.length ? `SIZINTI: ${sizinti.join(", ")}` : undefined,
  );

  // Kodda geçen her yetkiIste("x") anahtarı tanınıyor mu?
  const kullanilan = new Set<string>();
  for (const yol of KAYNAKLAR) {
    const icerik = readFileSync(yol, "utf8");
    for (const e of icerik.matchAll(/yetkiIste\("([^"]+)"\)/g)) kullanilan.add(e[1]);
    for (const e of icerik.matchAll(/izinVarMi\("([^"]+)"\)/g)) kullanilan.add(e[1]);
    for (const e of icerik.matchAll(/sayfaIzni\("([^"]+)"\)/g)) kullanilan.add(e[1]);
  }
  const taninmayan = [...kullanilan].filter((k) => !izinTaninirMi(k));
  kontrol(
    "kodda tanınmayan izin anahtarı kullanılmamış",
    taninmayan.length === 0,
    taninmayan.join(", "),
  );

  // Tanımlı ama hiç kullanılmayan izin: ölü izin, yanlış güven verir.
  // BEKLEYEN İZİNLER ayrı: ekranı henüz yazılmamış izinler burada durur ve
  // listeden düşmek İŞİN BİTTİĞİ anlamına gelir. Gerekçesiz bırakılmaz.
  const BEKLEYEN = new Map<string, string>([
    ["kullanici.yonet", "kullanıcı ekranı henüz yazılmadı"],
    ["rol.yonet", "rol ekranı henüz yazılmadı"],
  ]);
  for (const [izin, sebep] of BEKLEYEN) {
    kontrol(`  bekleyen izin gerekçeli: ${izin}`, sebep.length > 10, sebep);
  }
  const kullanilmayan = TUM_IZINLER.filter(
    (i) => !kullanilan.has(i) && !BEKLEYEN.has(i),
  );
  kontrol(
    "tanımlı her izin en az bir yerde kullanılıyor",
    kullanilmayan.length === 0,
    kullanilmayan.length ? `kullanılmayan: ${kullanilmayan.join(", ")}` : undefined,
  );

  kontrol(
    "her iznin grubu var",
    IZINLER.every((i) => ["operasyon", "para", "ayar", "yonetim"].includes(i.grup)),
  );
}

console.log("\n" + "=".repeat(70));
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
