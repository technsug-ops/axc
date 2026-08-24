/**
 * PANEL SAYACI ↔ LİSTE — aynı rakamı mı veriyorlar? (salt okuma)
 *
 * ⚠ "Sayı tıklanınca kendini doğrulamalı." Panel 15 diyorsa açılan liste
 * 15 satır olmalı; olmazsa ekran kendi kendisiyle çelişir.
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { paketlenenSiparisSayisi, hazirlananSiparisKimlikleri } =
    await import("../src/lib/panel/gorev-verisi");
  const { satisKosulu } = await import("../src/lib/liste-suzgeci");

  const panelBekleyen = await prisma.sale.count({
    where: { shippedAt: null, iptalTarihi: null },
  });
  const panelPaketlenen = await paketlenenSiparisSayisi();

  const paketli = await hazirlananSiparisKimlikleri();
  const { kosul } = satisKosulu(
    { kargo: "bekleyen", paket: "hazirlanan" },
    new Date(),
    undefined,
    paketli,
  );
  const listeSayisi = await prisma.sale.count({ where: kosul });

  const { kosul: kosulBekleyen } = satisKosulu(
    { kargo: "bekleyen", paket: "bekleyen" },
    new Date(),
    undefined,
    paketli,
  );
  const listeBekleyen = await prisma.sale.count({ where: kosulBekleyen });

  console.log(`\nPANEL  kargoya verilmemis : ${panelBekleyen}`);
  console.log(`PANEL  paketlenen          : ${panelPaketlenen}`);
  console.log(`LISTE  paket=hazirlanan    : ${listeSayisi}`);
  console.log(`LISTE  paket=bekleyen      : ${listeBekleyen}`);
  console.log(`\n  hazirlanan + bekleyen   : ${listeSayisi + listeBekleyen}  (payda ${panelBekleyen} olmali)`);

  const tamam =
    panelPaketlenen === listeSayisi &&
    listeSayisi + listeBekleyen === panelBekleyen;
  console.log(tamam ? "\n  MUTABIK." : "\n  AYRISMA VAR!");
  if (!tamam) process.exitCode = 1;
}
main();
