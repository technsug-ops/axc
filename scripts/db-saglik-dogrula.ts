/**
 * ============================================================================
 *  DB SAĞLIK SONDASI DOĞRULAMA (K202 SORUN A)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run db-saglik:dogrula
 *
 *  ⭐ SAF HESAP KATMANI GİBİ DEĞİL, GERÇEK SOKETLE SINANIR — ve bu bilerek
 *  yapıldı: burada sınanan şey bir metin deseni değil, gerçek bir TCP
 *  davranışı (bağlanır / reddedilir). Sahte bir sunucu açıp kapatarak
 *  ikisini de GERÇEKTEN ölçüyoruz; kaynak taraması bu ikisini ayırt edemez.
 * ============================================================================
 */
import { createServer } from "node:net";

import { dbAdresiAyikla, dbSaglikliMi } from "../src/lib/db-saglik";

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

async function main() {
  console.log("\n1) ADRES AYIKLAMA");
  {
    kontrol(
      "mysql:// dizesinden host+port doğru ayıklanır",
      JSON.stringify(dbAdresiAyikla("mysql://root:@127.0.0.1:3306/axcali_erp")) ===
        JSON.stringify({ host: "127.0.0.1", port: 3306 }),
    );
    kontrol(
      "port belirtilmemişse varsayılan 3306",
      dbAdresiAyikla("mysql://root:@127.0.0.1/axcali_erp")?.port === 3306,
    );
    kontrol(
      "geçersiz dize null döner (fırlatmaz)",
      dbAdresiAyikla("bu bir url değil") === null,
    );
    kontrol("boş dize null döner", dbAdresiAyikla("") === null);
  }

  console.log("\n2) GERÇEK SOKETLE: AÇIK ↔ KAPALI ayrımı");
  {
    // Sahte sunucu — OS'ten boş bir port istenir (0), gerçekten dinler.
    const sunucu = createServer();
    const port = await new Promise<number>((resolve) => {
      sunucu.listen(0, "127.0.0.1", () => {
        resolve((sunucu.address() as { port: number }).port);
      });
    });

    const acikken = await dbSaglikliMi(`mysql://x:@127.0.0.1:${port}/db`, 1500);
    kontrol("dinleyen porta bağlanır → true", acikken === true);

    await new Promise<void>((resolve) => sunucu.close(() => resolve()));

    // ⚠ ÖRNEK VERİ AYRIMI GÖSTERİR: AYNI port, sunucu KAPANDIKTAN sonra.
    // "her zaman true/false" döndüren bozuk bir gövde de bu port sabitken
    // ilk kontrolü geçebilirdi; ikinci kontrol AYNI portun artık kapalı
    // olduğunu ayrıca ölçüyor. (Anayasa: "örnek veri ayrımın iki yakasını
    // göstermeli".)
    const kapaliyken = await dbSaglikliMi(`mysql://x:@127.0.0.1:${port}/db`, 1500);
    kontrol("aynı port kapandıktan sonra → false", kapaliyken === false);
  }

  console.log("\n3) GEÇERSİZ ADRES SESSİZCE FIRLATMAZ");
  {
    const sonuc = await dbSaglikliMi("bu bir url değil", 500);
    kontrol("ayıklanamayan adreste false (fırlatmadan)", sonuc === false);
  }

  console.log("\n" + "=".repeat(70));
  if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  else {
    console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
    process.exitCode = 1;
  }
  console.log("");
}

main().catch((e) => {
  console.error("BEKLENMEYEN HATA:", e);
  process.exitCode = 1;
});
