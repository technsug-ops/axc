import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/**
 * ============================================================================
 *  GEÇİCİ DOSYA BEKÇİSİ — SIZINTI MEKANİK OLARAK İMKÂNSIZ MI?
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run gecici:dogrula
 *
 *  ⚠ NİYE VAR — VAKA 24.08.2026. Bir ölçüm betiği (`gecici-p.ts`) commit'e
 *  sızdı. Sebep dikkatsizlik değil SIRALAMAYDI: silme komutu yazma komutuyla
 *  aynı zincirde koştu ve dosya DOĞMADAN çalıştı; sonra dosya ortada kaldı.
 *
 *  ⚠ ÇÖZÜM ALIŞKANLIK DEĞİL MEKANİZMA. _"Bir dahaki sefere silerim"_ bir
 *  NİYETTİR; niyet unutulur, `.gitignore` unutmaz. Geçici betikler
 *  `scripts/tmp/` altına yazılır ve oradan commit'e GİREMEZLER.
 *
 *  ── ÖLÇÜT METİN DEĞİL, DAVRANIŞ ─────────────────────────────────────────
 *  Bu bekçi `.gitignore` METNİNİ okumakla yetinmiyor — git'in KENDİSİNE
 *  soruyor (`git check-ignore`). Metin taraması, kuralın ilerideki bir
 *  satırla ezildiğini (`!scripts/**` gibi) GÖREMEZDİ: desen dosyada durur,
 *  davranış değişmiş olur. Bu tam olarak deponun beş kez düştüğü tuzak —
 *  _"kaynak tarayan kontrol, deseni dosyada değil KULLANIM BLOĞUNDA arar"_
 *  kuralının en saf hâli: burada kullanım bloğu git'in cevabıdır.
 *
 *  ── VE İZİN LİSTESİ, YASAK LİSTESİ DEĞİL ────────────────────────────────
 *  Klasörde İZİN VERİLEN tek dosya `BENIOKU.md`. Yasak listesi tutulsaydı
 *  (`*.ts` yok sayılsın gibi) yarın yazılan bir `.mjs` ya da `.json`
 *  sızardı. Kural tersinden kuruldu: her şey yasak, bir dosya istisna.
 * ============================================================================
 */

let basarisiz = 0;
let calisan = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) {
    console.log(`  OK    ${ad}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/** git'e "bu yol yok sayılıyor mu" diye sorar. Dosyanın VAR OLMASI gerekmez. */
function yokSayiliyorMu(yol: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", "--", yol], { stdio: "pipe" });
    return true; // çıkış 0 = yok sayılıyor
  } catch {
    return false; // çıkış 1 = yok sayılmıyor
  }
}

console.log("\nGEÇİCİ DOSYA BEKÇİSİ\n");

console.log("1) KLASÖR VE KILAVUZ");
{
  kontrol("scripts/tmp/ klasörü var", existsSync("scripts/tmp"));
  kontrol("BENIOKU.md yerinde", existsSync("scripts/tmp/BENIOKU.md"));

  /**
   * ⚠ KILAVUZ ÖLÇÜTÜ SÖYLEMELİ. "Buraya yaz" demek yetmez; hangi betiğin
   * buraya, hangisinin `scripts/` altına gideceği yazılı olmazsa kalıcı bir
   * bekçi buraya yazılır ve bekçi turu onu HİÇ GÖRMEZ — sessizce koşulmayan
   * bir doğrulama, hiç yazılmamış bir doğrulamadan kötüdür (yeşil sanılır).
   */
  const kilavuz = existsSync("scripts/tmp/BENIOKU.md")
    ? readFileSync("scripts/tmp/BENIOKU.md", "utf8")
    : "";
  kontrol(
    "  ...ve ÖLÇÜTÜ yazıyor (ikinci kez koşulacak mı?)",
    kilavuz.includes("ikinci kez koşulacak mı"),
  );
}

console.log("\n2) SIZINTI — GİT'E SORULDU (metin değil davranış)");
{
  /**
   * ⚠ DÖRT FARKLI UZANTI DENENİYOR. Tek bir `.ts` denenseydi, kural
   * `scripts/tmp/*.ts` biçimine daraltıldığında bekçi YEŞİL kalırdı ve
   * yarın yazılan bir `.mjs` sızardı. Yasak listesi değil izin listesi.
   */
  for (const ad of [
    "olcum.ts",
    "olcum.mjs",
    "cikti.json",
    "not.md",
    "alt/klasor/derin.ts",
  ]) {
    const yol = `scripts/tmp/${ad}`;
    kontrol(`  ${yol} commit'e GİREMEZ`, yokSayiliyorMu(yol));
  }

  /** ⚠ İSTİSNA GERÇEKTEN İSTİSNA MI — klasör depoda görünmeli. */
  kontrol(
    "  scripts/tmp/BENIOKU.md İSTİSNA (klasör depoda görünür)",
    !yokSayiliyorMu("scripts/tmp/BENIOKU.md"),
  );

  /**
   * ⚠ KURAL KOMŞUSUNU YUTMAMALI. `scripts/` altındaki gerçek betikler
   * yok sayılırsa bekçilerin kendisi commit'e giremez ve bu, çözdüğünden
   * çok daha büyük bir hata olurdu.
   */
  kontrol(
    "  scripts/gecici-dogrula.ts YOK SAYILMIYOR (komşu betikler sağlam)",
    !yokSayiliyorMu("scripts/gecici-dogrula.ts"),
  );
}

console.log("\n3) BUGÜNÜN HÂLİ — izlenen dosya var mı?");
{
  /**
   * ⚠ KURAL DOĞRU AMA GEÇMİŞ KİRLİ OLABİLİR: `.gitignore` yalnız İZLENMEYEN
   * dosyaları durdurur. Bir dosya bir kez commit'e girdiyse yok sayma onu
   * ARTIK durdurmaz — o yüzden bugünkü hâl de ayrıca sayılır.
   */
  let izlenen: string[] = [];
  try {
    const cikti = execFileSync("git", ["ls-files", "scripts/tmp/"], {
      encoding: "utf8",
    });
    izlenen = cikti
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s !== "" && s !== "scripts/tmp/BENIOKU.md");
  } catch {
    izlenen = [];
  }
  kontrol(
    "scripts/tmp/ altında izlenen başka dosya YOK",
    izlenen.length === 0,
    izlenen.length > 0 ? izlenen : undefined,
  );
}

console.log("");
if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
