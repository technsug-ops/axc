/**
 * ============================================================================
 *  GECE BULUT YEDEĞİ — GITHUB ACTIONS'TAN (K382, kullanıcı kararı 21.11.2026)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-yedek-bulut.ts
 *
 *  BETIK SINIFI: SUREKLI — her gece koşar (`.github/workflows/gece-yedek.yml`).
 *  Stok yazmaz; veritabanını OKUR, Vercel Blob'a yazar, `AuditLog`a iz bırakır.
 *
 *  ⛔ NİYE VERCEL DEĞİL: `/api/yedek/otomatik` yedek 220 MB'ı aşınca (06.11.2026) her gece
 *  bellekten öldü; 20.11'de bilgisayardan ölçüldü: 273 MB · 232 sn · geri okuma 13,9 sn —
 *  60 sn tavanının çok üstünde ve her gün ~3 MB büyüyor. GitHub'ın koşucusu (7 GB, saatler)
 *  bu işi taşır ve bilgisayarın açık olmasına bağlı değildir (19–20.11 gecesi bilgisayar
 *  uyuyordu, iki yerel yedek de kaçtı).
 *
 *  ⭐ ÜRETİM GÖVDESİ DEĞİŞMEDİ: `gunlukYedekYaz` + `blobHedefi` — ekrandaki «Şimdi yedek al»
 *  ile aynı iş, aynı dosya adı (`yedek/bezirga-<gün>.json`), aynı manifest, aynı 30 gün kuralı.
 *  Kütüphane doğrudan ÇAĞRILMAZ (K119a/K192 soyutlaması).
 *
 *  YAPILANDIRMA — İKİ KAYNAK, SIR YAZILMAZ:
 *    · bilgisayarda `.env.canli` (CANLI_DATABASE_URL + BLOB_READ_WRITE_TOKEN)
 *    · GitHub Actions'ta ortam değişkenleri `CANLI_DATABASE_URL` + `BLOB_READ_WRITE_TOKEN`
 *      (depo sırları; iş akışı sır yoksa KIRMIZI biter, sessiz atlamaz)
 *
 *  BAŞARI = yazıldı + geri okundu + özetler birebir (`yedegiHedefeYaz`); ardından bu betik
 *  `YEDEK_UCU_KOSTU` izini yazar (`userAgent: github-actions` ya da `bilgisayar`) ki
 *  `/ayarlar/disa-aktarma` ekranı «en son ne zaman koştu» sorusuna cevap vermeye devam etsin.
 *  Başarısızlık → çıkış kodu 1 → GitHub kırmızı yanar.
 * ============================================================================
 */
import { existsSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma, CANLI_DOSYA, parolayiTemizle } from "./canli-ortak";

function yapilandirma(): { ham: string; jeton: string; kaynak: string } | null {
  if (existsSync(CANLI_DOSYA)) {
    const y = canliYapilandirma();
    if (!y.tamam) {
      console.log(`⛔ ${CANLI_DOSYA} okunamadı: ${y.hata.kod}`);
      return null;
    }
    if (!y.veri.blobJetonu) {
      console.log(`⛔ ${CANLI_DOSYA} içinde BLOB_READ_WRITE_TOKEN yok.`);
      return null;
    }
    return { ham: y.veri.ham, jeton: y.veri.blobJetonu, kaynak: CANLI_DOSYA };
  }
  const ham = (process.env.CANLI_DATABASE_URL ?? "").trim();
  const jeton = (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
  if (ham === "" || jeton === "") {
    console.log("⛔ Yapılandırma yok: ne .env.canli ne de CANLI_DATABASE_URL + BLOB_READ_WRITE_TOKEN ortam değişkenleri.");
    return null;
  }
  return { ham, jeton, kaynak: "ortam değişkenleri" };
}

async function main() {
  const y = yapilandirma();
  if (!y) {
    process.exitCode = 1;
    return;
  }
  const adres = new URL(y.ham);
  process.env.DATABASE_URL = betikAdresi(y.ham);
  /* Hedef BEYANLA Blob: yerel dosya seçimi (YEDEK_HEDEFI=DOSYA) bu betikte geçersiz. */
  delete process.env.YEDEK_HEDEFI;

  const { gunlukYedekYaz, YEDEK_UCU_KOSTU } = await import("../src/lib/yedek-yaz");
  const { blobHedefi } = await import("../src/lib/yedek-hedefi");
  const { izYaz } = await import("../src/lib/iz");
  const { prisma } = await import("../src/lib/prisma");

  const hedef = blobHedefi(y.jeton);
  const basi = Date.now();
  console.log("");
  console.log("GECE BULUT YEDEĞİ (K382)");
  console.log("  veritabanı     " + adres.hostname);
  console.log("  yapılandırma   " + y.kaynak);
  console.log("  hedef          " + hedef.tur + " · " + hedef.aciklama);
  console.log("  an             " + new Date().toISOString());
  console.log("=".repeat(70));

  try {
    const sonuc = await gunlukYedekYaz(new Date(), hedef);
    if (!sonuc.tamam) {
      console.log("");
      console.log("⛔ YEDEK ALINAMADI · kod " + sonuc.kod);
      console.log("   " + parolayiTemizle(sonuc.mesaj, adres.password));
      console.log("   ⛔ Bu kırmızı BİR HÜKÜMDÜR: bu gece doğrulanmış bulut yedeği YOK.");
      process.exitCode = 1;
      return;
    }
    const sure = Date.now() - basi;
    console.log("");
    console.log("  ✓ yazıldı ve GERİ OKUNDU — özetler birebir");
    console.log("    gün           " + sonuc.gun);
    console.log("    satır         " + sonuc.satir.toLocaleString("tr-TR"));
    console.log("    boyut         " + (sonuc.boyutBayt / 1024 / 1024).toFixed(1) + " MB");
    console.log("    silinen eski  " + sonuc.silinenEskiYedek + " (30 gün kuralı)");
    console.log("    geri okuma    " + sonuc.dogrulamaMs + " ms");
    console.log("    toplam        " + Math.round(sure / 1000) + " sn");

    /* ⚠ İZ BAŞARIDAN SONRA; tutulamazsa yedek yine alınmıştır, başarı geri alınmaz. */
    try {
      await izYaz({
        action: YEDEK_UCU_KOSTU,
        targetType: "YedekUcu",
        targetId: sonuc.gun,
        userId: null,
        detail: JSON.stringify({
          userAgent: process.env.GITHUB_ACTIONS === "true" ? "github-actions" : "bilgisayar",
          gun: sonuc.gun,
          satir: sonuc.satir,
          hedefTuru: sonuc.hedefTuru,
          dogrulamaMs: sonuc.dogrulamaMs,
          toplamMs: sure,
          kaynak: "K382 canli-yedek-bulut",
        }),
      });
    } catch (e) {
      console.log("  ⚠ iz yazılamadı (yedek alındı): " + parolayiTemizle(e instanceof Error ? e.message : String(e), adres.password));
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exitCode = 1;
});
