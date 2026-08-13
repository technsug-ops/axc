/**
 * ============================================================================
 *  BAĞLANTI ÖLÇÜMÜ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run baglanti:olc
 *
 *  Canlı veritabanında bu hesabın KAÇ bağlantı tuttuğunu ve sunucunun
 *  tavanının ne olduğunu gösterir. Havuz ayarı değişikliklerinin önce/sonra
 *  teyidi bununla yapılır.
 *
 *  ÖLÇÜM KENDİSİ KOTA YEMEZ: tek bağlantı açar (bkz. betikAdresi).
 *
 *  OKUMA KILAVUZU:
 *    "Sleep" satırları = boşta duran bağlantılar. Site hiç kullanılmıyorken
 *    bu sayı 0'a yakın olmalıdır. Yüksekse havuz bağlantı PARK EDİYOR
 *    demektir ve kota, iş yapılmadan tükeniyor.
 * ============================================================================
 */

import mariadb from "mariadb";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }

  const adres = new URL(betikAdresi(y.veri.ham));
  adres.protocol = "mariadb:";
  const havuz = mariadb.createPool(adres.toString());
  const c = await havuz.getConnection();

  const degisken = async (ad: string) => {
    const r = (await c.query(`SHOW VARIABLES LIKE '${ad}'`)) as {
      Value: string;
    }[];
    return r[0]?.Value ?? "?";
  };

  const tavan = Number(await degisken("max_user_connections"));
  const bekleme = await degisken("wait_timeout");

  const satirlar = (await c.query(
    `SELECT COMMAND, TIME FROM information_schema.PROCESSLIST
     WHERE USER = SUBSTRING_INDEX(CURRENT_USER(), '@', 1)`,
  )) as { COMMAND: string; TIME: bigint | number }[];

  // Bu ölçümün kendi bağlantısı sayılmaz — o hep 1 tanedir.
  const toplam = satirlar.length - 1;
  const bosta = satirlar.filter((s) => s.COMMAND === "Sleep").length;
  const calisan = toplam - bosta;

  console.log("");
  console.log("=== SUNUCU ===");
  console.log(`  hesap başına tavan : ${tavan}`);
  console.log(`  wait_timeout       : ${bekleme} sn`);
  console.log("");
  console.log("=== BU HESABIN AÇIK BAĞLANTILARI ===");
  console.log(`  toplam             : ${toplam < 0 ? 0 : toplam} / ${tavan}`);
  console.log(`  boşta (Sleep)      : ${bosta}`);
  console.log(`  iş yapan           : ${calisan < 0 ? 0 : calisan}`);
  console.log("");

  const yasalar = satirlar
    .filter((s) => s.COMMAND === "Sleep")
    .map((s) => Number(s.TIME))
    .sort((a, b) => b - a);
  if (yasalar.length > 0) {
    console.log(`  boştakilerin yaşı  : ${yasalar.join(", ")} sn`);
    console.log("");
  }

  const oran = tavan > 0 ? Math.round(((toplam < 0 ? 0 : toplam) / tavan) * 100) : 0;
  console.log(
    oran >= 60
      ? `  DURUM: kota %${oran} dolu — havuz ayarına bakılmalı`
      : `  DURUM: kota %${oran} dolu — rahat`,
  );
  console.log("");

  await c.release();
  await havuz.end();
}

main();
