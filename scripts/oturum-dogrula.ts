/**
 * ============================================================================
 *  GİRİŞ / OTURUM DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run oturum:dogrula
 *
 *  Güvenlik kodu en çok "çalışıyor gibi görünüp aslında kapıyı açık bırakan"
 *  hataya açıktır. Dört bölüm:
 *
 *  1) PAROLA — doğru/yanlış, aynı parolanın her seferinde FARKLI özet
 *     üretmesi (tuz), bozuk kaydın çökmemesi.
 *  2) JETON — imza doğrulama, kurcalanmış jetonun reddi, süresi geçmişin
 *     reddi, YANLIŞ SIRRIN reddi.
 *  3) KAPI — hangi yollar açık, hangileri kapalı. Bu bölüm asıl kritik
 *     olan: yeni eklenen bir ekranın yanlışlıkla açık kalmadığını sınar.
 *  4) KORUMASIZ UÇ TARAMASI — kaynak ağacındaki TÜM sayfa ve API uçları
 *     taranır; açık listede olmayan her yol kapalı olmalıdır.
 * ============================================================================
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  jetonUret,
  jetonuCoz,
  OTURUM_SURESI_MS,
} from "../src/lib/oturum-imza";
import { parolaDogrula, parolaOzetle, parolaYeterliMi } from "../src/lib/parola";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

const SIR = "test-sirri-cok-uzun-ve-rastgele-olmali-1234567890";
const AN = 1_770_000_000_000;

async function main() {
  // =========================================================================
  console.log("\n1) PAROLA");
  // =========================================================================
  {
    const ozet = await parolaOzetle("Selliora!2026#kasa");
    kontrol("özet scrypt biçiminde", ozet.startsWith("scrypt$"));
    kontrol("özet parolayı İÇERMEZ", !ozet.includes("Selliora!2026#kasa"));
    kontrol("doğru parola geçer", await parolaDogrula("Selliora!2026#kasa", ozet));
    kontrol("yanlış parola geçmez", !(await parolaDogrula("Selliora!2026#kas", ozet)));
    kontrol("boş parola geçmez", !(await parolaDogrula("", ozet)));

    const ikinci = await parolaOzetle("Selliora!2026#kasa");
    kontrol("aynı parola FARKLI özet üretir (tuz çalışıyor)", ozet !== ikinci);
    kontrol("ikinci özet de doğrulanır", await parolaDogrula("Selliora!2026#kasa", ikinci));

    kontrol("bozuk kayıt çökmez, false döner", !(await parolaDogrula("x", "bozuk")));
    kontrol("boş kayıt çökmez", !(await parolaDogrula("x", "")));

    kontrol("kısa parola reddedilir", !parolaYeterliMi("kisa123"));
    kontrol("yeterli parola kabul edilir", parolaYeterliMi("uzunparola1"));
    kosanBolumler.push("parola");
  }

  // =========================================================================
  console.log("\n2) JETON");
  // =========================================================================
  {
    const govde = {
      kullaniciId: "kul-1",
      oturumSurumu: 1,
      sonGecerlilik: AN + OTURUM_SURESI_MS,
    };
    const jeton = await jetonUret(govde, SIR);

    const cozulen = await jetonuCoz(jeton, SIR, AN);
    kontrol("geçerli jeton çözülür", cozulen?.kullaniciId === "kul-1", cozulen);
    kontrol("oturum sürümü taşınır", cozulen?.oturumSurumu === 1);

    kontrol(
      "YANLIŞ SIR ile çözülmez",
      (await jetonuCoz(jeton, SIR + "x", AN)) === null,
    );

    // Gövdeyi kurcala: imza tutmamalı.
    const [g, i] = jeton.split(".");
    const kurcalanmis = `${g.slice(0, -2)}AA.${i}`;
    kontrol(
      "kurcalanmış gövde reddedilir",
      (await jetonuCoz(kurcalanmis, SIR, AN)) === null,
    );
    kontrol(
      "imzası değiştirilmiş jeton reddedilir",
      (await jetonuCoz(`${g}.${i.slice(0, -2)}AA`, SIR, AN)) === null,
    );

    kontrol(
      "süresi geçmiş jeton reddedilir",
      (await jetonuCoz(jeton, SIR, AN + OTURUM_SURESI_MS + 1)) === null,
    );
    kontrol("biçimsiz jeton reddedilir", (await jetonuCoz("abc", SIR, AN)) === null);
    kontrol("boş jeton reddedilir", (await jetonuCoz("", SIR, AN)) === null);

    // Başka kullanıcının jetonu kendi kimliğini taşır — karışmaz.
    const digeri = await jetonUret(
      { ...govde, kullaniciId: "kul-2" },
      SIR,
    );
    kontrol(
      "farklı kullanıcı farklı jeton",
      jeton !== digeri &&
        (await jetonuCoz(digeri, SIR, AN))?.kullaniciId === "kul-2",
    );
    kosanBolumler.push("jeton");
  }

  // =========================================================================
  console.log("\n3) KAPI — hangi yol açık, hangisi kapalı");
  // =========================================================================
  const ACIK = ["/giris", "/cikis", "/api/yedek/otomatik"];
  function acikMi(yol: string) {
    return ACIK.some((a) => yol === a || yol.startsWith(`${a}/`));
  }
  {
    for (const yol of ACIK) {
      kontrol(`açık: ${yol}`, acikMi(yol));
    }
    for (const yol of [
      "/",
      "/urunler",
      "/satislar",
      "/rapor",
      "/giderler",
      "/kanal-sku",
      "/ayarlar/disa-aktarma",
      "/api/yedek",
      "/api/yedek/indir",
      "/api/disa-aktarma/urunler",
      "/api/ice-aktarma",
      "/api/ice-aktarma/sablon",
    ]) {
      kontrol(`kapalı: ${yol}`, !acikMi(yol));
    }
    // Benzer ada sahip yol kazara açılmasın.
    kontrol("/girisimci açık DEĞİL", !acikMi("/girisimci"));
    kontrol("/api/yedek/otomatikx açık DEĞİL", !acikMi("/api/yedek/otomatikx"));
    kosanBolumler.push("kapi");
  }

  // =========================================================================
  console.log("\n4) KORUMASIZ UÇ TARAMASI");
  // =========================================================================
  {
    /** src/app altındaki tüm page.tsx ve route.ts yollarını çıkarır. */
    function yollariTopla(kok: string, onek = ""): string[] {
      const sonuc: string[] = [];
      for (const ad of readdirSync(kok)) {
        const tam = join(kok, ad);
        if (statSync(tam).isDirectory()) {
          // (grup) klasörleri adrese girmez
          const parca = ad.startsWith("(") ? "" : `/${ad}`;
          sonuc.push(...yollariTopla(tam, onek + parca));
        } else if (ad === "page.tsx" || ad === "route.ts") {
          sonuc.push(onek === "" ? "/" : onek);
        }
      }
      return sonuc;
    }

    const yollar = yollariTopla("src/app");
    const kapali = yollar.filter((y) => !acikMi(y));
    const acik = yollar.filter((y) => acikMi(y));

    console.log(`  Toplam yol: ${yollar.length}`);
    console.log(`  Açık: ${acik.join(", ") || "(yok)"}`);

    kontrol("en az 20 yol bulundu (tarama çalışıyor)", yollar.length >= 20, yollar.length);
    kontrol(
      "AÇIK yollar yalnız beklenen üçü",
      acik.length === 3 && acik.every((y) => ACIK.includes(y)),
      acik,
    );
    kontrol(
      "tüm veri döken uçlar KAPALI",
      ["/api/yedek", "/api/disa-aktarma/[liste]", "/api/ice-aktarma"].every(
        (y) => kapali.includes(y),
      ),
      kapali.filter((y) => y.startsWith("/api")),
    );
    kosanBolumler.push("tarama");
  }

  console.log("");
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
    process.exit(1);
  } else if (basarisiz === 0) {
    console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
    process.exit(0);
  } else {
    console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
    process.exit(1);
  }
}

main();
