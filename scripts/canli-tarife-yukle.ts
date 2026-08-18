/**
 * ============================================================================
 *  KOMİSYON TARİFESİ YÜKLEME — CANLI
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:tarife-yukle -- "C:\\yol\\komisyon.xlsx"
 *      npm run canli:tarife-yukle -- "C:\\yol\\komisyon.xlsx" --uygula
 *
 *  Bayraksız koşunca HİÇBİR ŞEY YAZMAZ; ne okunduğunu ve ne yazılacağını
 *  gösterir. Rakamlar beklenene uyduktan SONRA `--uygula`.
 *
 *  ⚠ MEVCUT KOMİSYON YÜKLEMESİNİN YERİNE GEÇMEZ. O yol
 *  (`/ayarlar` → komisyon yükleme) `ChannelSku.commissionRate`i yazar;
 *  bu betik TARİFE tablolarını yazar. İkisi aynı dosyayı okur, farklı
 *  şeyler kaydeder: biri güncel oranı, öteki tam dilim yapısını.
 *  Birleştirmek, sınanmış üç aşamalı eşleştirmeyi ikinci kez yazmak
 *  olurdu — bu paketin ilk dersi tam olarak buydu.
 *
 *  ── HAM DOSYA ARŞİVE ────────────────────────────────────────────────────
 *  Yüklenen dosya `veri/ozel/arsiv/` altına kopyalanır (gitignore'da).
 *  "Kaynakta ne vardı" sorusu bir daha cevapsız kalmasın diye — dilim
 *  bilgisini aylarca attığımızı ancak arşiv olmadığı için geç fark ettik.
 * ============================================================================
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { raporMetni } from "../src/lib/komisyon/tarife-plan";
import { canliYapilandirma } from "./canli-ortak";

const ARSIV = "veri/ozel/arsiv";

function gunSaat(d: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

async function main() {
  const bayraksizlar = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const yol = bayraksizlar[0];
  const UYGULA = process.argv.includes("--uygula");

  if (!yol) {
    console.log("");
    console.log('Kullanım: npm run canli:tarife-yukle -- "C:\\\\yol\\\\dosya.xlsx" [--uygula]');
    console.log("");
    process.exitCode = 1;
    return;
  }
  if (!existsSync(yol)) {
    console.log(`Dosya bulunamadı: ${yol}`);
    process.exitCode = 1;
    return;
  }

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }

  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { tarifeDenetle, tarifeYaz } = await import("../src/lib/komisyon/tarife-yaz");

  console.log("");
  console.log("KOMİSYON TARİFESİ YÜKLEME");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log(`  dosya      ${basename(yol)}`);
  console.log(`  kip        ${UYGULA ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);
  console.log("");

  /**
   * HANGİ HESABA — tarife bir MAĞAZAYA aittir. Dosya Trendyol satıcı
   * panelinden iniyor, yani SATIŞ rolündeki TY hesabı. Birden çok aday
   * varsa betik SEÇMEZ, sorar: yanlış hesaba yazılan tarife sessizce
   * yanlış ürünlere bağlanırdı.
   */
  const adaylar = await prisma.channelAccount.findMany({
    where: { channel: { name: "Trendyol" } },
    select: {
      id: true,
      name: true,
      alisIcin: true,
      satisIcin: true,
      isActive: true,
      channel: { select: { name: true } },
    },
  });
  /**
   * SATIŞ ROLÜ ŞART. Kullanıcı arbitraj yaptığı için aynı pazaryerinde
   * hem ALIŞ hem SATIŞ hesapları var (karar 12.08.2026). Komisyon tarifesi
   * SATTIĞIMIZ mağazanın tarifesidir; alış hesabına yazmak sessizce yanlış
   * ürünlere bağlanan bir tarife üretirdi.
   */
  const satisHesaplari = adaylar.filter((h) => h.satisIcin && h.isActive);

  if (satisHesaplari.length === 0) {
    console.log("  ⚠ Trendyol SATIŞ hesabı bulunamadı — tarife nereye yazılacağı belirsiz.");
    console.log(
      `     bulunan TY hesapları: ${adaylar.map((h) => `${h.name}(${h.satisIcin ? "satış" : ""}${h.alisIcin ? "alış" : ""})`).join(" · ") || "yok"}`,
    );
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  if (satisHesaplari.length > 1) {
    console.log("  ⚠ BİRDEN ÇOK Trendyol satış hesabı var — betik seçim YAPMAZ.");
    for (const h of satisHesaplari) console.log(`     ${h.id}  ${h.name}`);
    console.log("     Hesabı netleştirmeden yükleme yapılmamalı.");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  const hesap = satisHesaplari[0];
  console.log(`  hesap      ${hesap.channel.name} — ${hesap.name}`);
  console.log("");

  const dosya = readFileSync(yol);
  const bugun = new Date();

  const onizleme = await tarifeDenetle(dosya, hesap.id, bugun);
  if (onizleme.durum === "HATA") {
    console.log(`  ✗ OKUNAMADI — ${onizleme.engel}`);
    if (onizleme.eksikler) console.log(`     eksik: ${onizleme.eksikler.join(" · ")}`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  if (onizleme.durum !== "ONIZLEME") {
    await prisma.$disconnect();
    return;
  }

  console.log("  ── OKUNAN ────────────────────────────────────────────────");
  for (const satir of raporMetni(onizleme.plan, onizleme.okuma.pencere!, gunSaat)) {
    console.log(`     ${satir}`);
  }
  console.log(`     tarife grubu   ${onizleme.okuma.tarifeGrubu ?? "—"}`);
  console.log("");

  /** BAĞSIZLIK SESSİZ KALMAZ — örnekleri de basılır. */
  if (onizleme.plan.bagsizOrnekler.length > 0) {
    console.log("     ⚠ BAĞSIZ ÜRÜNLER (katalogda barkod karşılığı yok):");
    for (const b of onizleme.plan.bagsizOrnekler) {
      console.log(`        ${b.barkod}  ${b.urunAdi ?? ""}`);
    }
    console.log("        Kalemler yine de YAZILIR — tarife eksik kalmasın,");
    console.log("        eksiklik de görünsün. Ürün sonradan eşleşince bağ");
    console.log("        kurulabilir.");
    console.log("");
  }

  if (onizleme.mevcutYukleme) {
    console.log("     ⚠ BU PENCERE DAHA ÖNCE YÜKLENMİŞ:");
    console.log(`        ${onizleme.mevcutYukleme.yuklemeSayisi}. yükleme · ${gunSaat(onizleme.mevcutYukleme.yuklendiAt)}`);
    console.log("        --uygula ile İÇERİK YENİLENİR (eski kalemler silinip");
    console.log("        yeniden yazılır). Tarife referans veridir, hareket");
    console.log("        kaydı değil; ledger dokunulmazlığı burada geçerli değil.");
    console.log("");
  }

  if (!UYGULA) {
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log(`  Rakamlar beklenene uyuyorsa:  npm run canli:tarife-yukle -- "${yol}" --uygula`);
    console.log("");
    await prisma.$disconnect();
    return;
  }

  const sonuc = await tarifeYaz({
    dosya,
    dosyaAdi: basename(yol),
    channelAccountId: hesap.id,
    bugun,
  });

  if (sonuc.durum !== "YAZILDI") {
    console.log(`  ✗ YAZILAMADI — ${"engel" in sonuc ? sonuc.engel : sonuc.durum}`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  console.log("  ── YAZILDI ───────────────────────────────────────────────");
  for (const satir of raporMetni(sonuc.plan, sonuc.pencere, gunSaat)) {
    console.log(`     ${satir}`);
  }
  console.log(`     yükleme sayısı ${sonuc.yuklemeSayisi}`);
  console.log("");

  /** ARŞİV — yazma başarılı olduktan SONRA. */
  if (!existsSync(ARSIV)) mkdirSync(ARSIV, { recursive: true });
  const hedef = join(ARSIV, basename(yol));
  copyFileSync(yol, hedef);
  console.log(`  ARŞİVLENDİ → ${hedef}  (gitignore'da)`);
  console.log("");

  await prisma.$disconnect();
}

main();
