import { get, put } from "@vercel/blob";

import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  MANİFESTİ MEVCUT DOSYALARDAN YENİDEN KUR (K193, 09.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run canli:manifest-kur          (kuru koşum — hiçbir şey yazmaz)
 *      npm run canli:manifest-kur -- --yaz (manifesti YAZAR)
 *
 *  BETIK SINIFI: TEK_SEFERLIK — Blob kotası açıldığı gün BİR KEZ koşar.
 *  Gerekçe: manifest bir kez kurulduktan sonra `yedegiHedefeYaz` onu her
 *  yedekte kendisi günceller; bu betiğin ikinci bir işi yoktur.
 *
 *  ⛔ NİYE GEREKLİ: K192'de `list()` kaldırıldı ve "hangi yedekler var"
 *  sorusu artık `yedek/index.json` manifestinden cevaplanıyor. Ama depodaki
 *  21 yedek manifestten ÖNCE yazılmıştı — dosyalar duruyor, manifest onları
 *  bilmiyor. Depo 30 Eylül'de açıldığında sistem "hiç yedek yok" derdi ve
 *  çan haksız yere kırmızı yanardı.
 *
 *  ⭐ NİYE `list()` KULLANMIYOR: kotayı yakan çağrı oydu (advanced ops
 *  2000/2000). Ad deseni BELİRLENİMCİ (`yedek/selliora-<gün>.json`), yani
 *  günler geriye doğru `get()` ile yoklanabiliyor — ve `get` bir simple
 *  işlem. Manifestin yeniden kurulabilir olması, onu tek nokta arıza
 *  olmaktan çıkaran şeydir.
 *
 *  ⚠ KAPSAM SINIRI — VE BU BEYAN EDİLİYOR: yalnız GÜNLÜK yedekler
 *  (`selliora-<gün>.json`) bulunabilir. Geri yükleme öncesi alınan güvenlik
 *  yedekleri (`guvenlik-<zaman damgası>.json`) belirlenimci DEĞİL; adlarında
 *  milisaniye var ve yoklanamazlar. Onlar manifeste girmez ve bu, çıktıda
 *  AÇIKÇA yazar. _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen
 *  denetim, denetim değildir".)_
 * ============================================================================
 */

const MANIFEST = "yedek/index.json";
/** Saklama 30 gün; 45 gün yoklamak sınırın ötesini de gösterir. */
const GERIYE_GUN = 45;
const YAZ = process.argv.includes("--yaz");

type Kayit = { ad: string; boyut: number; yazildi: string; adres: string };

function gunAdi(g: Date): string {
  return (
    g.getUTCFullYear() +
    "-" +
    String(g.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(g.getUTCDate()).padStart(2, "0")
  );
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("⛔ Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const jeton = y.veri.blobJetonu ?? undefined;
  if (!jeton) {
    console.log("⛔ Blob jetonu yok — ölçüm yapılamaz.");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("MANİFEST KURULUMU — " + (YAZ ? "⚠ YAZIM MODU" : "KURU KOŞUM"));
  console.log("=".repeat(70));

  /** ① Mevcut manifest var mı — üstüne körlemesine yazılmaz. */
  let mevcut: Kayit[] = [];
  try {
    const m = await get(MANIFEST, { access: "private", token: jeton });
    if (m && m.statusCode === 200) {
      mevcut = JSON.parse(await new Response(m.stream).text()) as Kayit[];
      console.log(`① MEVCUT MANİFEST: ${mevcut.length} kayıt`);
    } else {
      console.log("① MEVCUT MANİFEST: yok");
    }
  } catch (e) {
    console.log(
      `① MEVCUT MANİFEST okunamadı: ${String((e as Error).message).replace(/\s+/g, " ")}`,
    );
    console.log("   ⛔ Depo hâlâ askıda olabilir — kurulum YAPILMAZ.");
    process.exitCode = 1;
    return;
  }

  /** ② Belirlenimci adları geriye doğru yokla. */
  console.log("");
  console.log(`② YOKLAMA — son ${GERIYE_GUN} gün, ad deseni selliora-<gün>.json`);
  const bulunan: Kayit[] = [];
  const an = new Date();
  let yoklanan = 0;
  for (let i = 0; i < GERIYE_GUN; i++) {
    const g = new Date(an.getTime() - i * 24 * 60 * 60 * 1000);
    const ad = `yedek/selliora-${gunAdi(g)}.json`;
    yoklanan += 1;
    try {
      const s = await get(ad, { access: "private", token: jeton });
      if (!s || s.statusCode !== 200) continue;
      bulunan.push({
        ad,
        boyut: s.blob.size,
        yazildi: new Date(s.blob.uploadedAt).toISOString(),
        adres: s.blob.url,
      });
      console.log(
        `   ✓ ${ad}  ${(s.blob.size / 1024 / 1024).toFixed(2)} MB  ${new Date(s.blob.uploadedAt).toISOString()}`,
      );
    } catch (e) {
      console.log(
        `   ⛔ ${ad} — ${String((e as Error).message).replace(/\s+/g, " ").slice(0, 80)}`,
      );
    }
  }

  console.log("");
  console.log(`   yoklanan gün ${yoklanan} · bulunan ${bulunan.length}`);
  /**
   * ⚠ BULUNAMAYAN ≠ YOK: `guvenlik-*` yedekleri belirlenimci olmadığı için
   * bu yolla HİÇ görünmez. Sayı "depodaki her şey" değil, "yoklanabilen
   * her şey"dir ve öyle yazılır.
   */
  console.log(
    "   ⚠ KAPSAM: yalnız GÜNLÜK yedekler. `guvenlik-*` dosyaları belirlenimci",
  );
  console.log(
    "     ad taşımadığı için yoklanamaz; manifeste GİRMEZ ve bu bir eksiklik",
  );
  console.log("     olarak burada beyan edilir.");

  if (bulunan.length === 0) {
    console.log("");
    console.log("⛔ Hiç yedek bulunamadı — manifest YAZILMAZ.");
    console.log("   (Depo boş olabilir ya da erişim hâlâ kapalı olabilir.)");
    process.exitCode = 1;
    return;
  }

  /** ③ Mevcut manifestle birleştir — var olan kayıt EZİLMEZ. */
  const birlesik = [...mevcut];
  let eklenen = 0;
  for (const k of bulunan) {
    if (birlesik.some((m) => m.ad === k.ad)) continue;
    birlesik.push(k);
    eklenen += 1;
  }
  birlesik.sort((a, b) => a.ad.localeCompare(b.ad));

  console.log("");
  console.log(`③ SONUÇ: mevcut ${mevcut.length} + yeni ${eklenen} = ${birlesik.length}`);

  if (!YAZ) {
    console.log("");
    console.log("KURU KOŞUM — hiçbir şey yazılmadı.");
    console.log("Yazmak için:  npm run canli:manifest-kur -- --yaz");
    return;
  }

  await put(MANIFEST, JSON.stringify(birlesik), {
    access: "private",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: jeton,
  });

  /** ⛔ YAZDIM DEMEK YETMEZ — GERİ OKUNUR. */
  const teyit = await get(MANIFEST, { access: "private", token: jeton });
  if (!teyit || teyit.statusCode !== 200) {
    console.log("⛔ YAZILDI AMA GERİ OKUNAMADI — manifest doğrulanamadı.");
    process.exitCode = 1;
    return;
  }
  const okunan = JSON.parse(await new Response(teyit.stream).text()) as Kayit[];
  console.log("");
  console.log(
    okunan.length === birlesik.length
      ? `✓ YAZILDI ve GERİ OKUNDU — ${okunan.length} kayıt`
      : `⛔ GERİ OKUNAN SAYI TUTMADI: yazılan ${birlesik.length} · okunan ${okunan.length}`,
  );
  if (okunan.length !== birlesik.length) process.exitCode = 1;
}

main();
