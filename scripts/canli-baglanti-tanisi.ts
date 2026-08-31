import net from "node:net";

import { canliYapilandirma } from "./canli-ortak";
import { TABAN, baglantiHukmu, type TaniOlcumu } from "./tani-hukmu";

/**
 * ============================================================================
 *  CANLI BAĞLANTI TANISI — TEK KOMUTLUK TEŞHİS (31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run canli:baglanti-tanisi
 *
 *  ⛔ NİYE VAR: 31.08.2026'da giriş ekranı çöktü ve sebebi bulmak **40 dakika**
 *  aldı. Yapılan her ölçüm doğruydu ama elle, dağınık ve tekrarlanamaz
 *  biçimde yapıldı. Kesinti "kendiliğinden düzeldi" — yani SEBEBİ BİLİNMİYOR
 *  ve geri gelebilir. Bu araç o turu tek komuta indiriyor.
 *
 *  ── ⚠ O KESİNTİNİN İMZASI (karşılaştırma tabanı) ───────────────────────
 *      /giris çöküş süresi        TAM 10,15 sn  (= sunucunun connect_timeout'u)
 *      sıcak lambda               200, 0,45 sn  — var olan bağlantı ÇALIŞIYOR
 *      soğuk lambda               500           — YENİ bağlantı kurulamıyor
 *      Aborted_connects           her denemede artıyor → Vercel sunucuya VARIYOR
 *      bizim açık bağlantımız     1             → kota (25) DOLMAMIŞ
 *      IP kısıtı                  yok (panelde "her yerden erişim")
 *
 *  ── ⛔ ARAÇ KENDİSİ DE BAĞLANTI AÇAR — VE BUNU BEYAN EDER ──────────────
 *  Ölçtüğü kaynağı tüketiyor: TEK bir bağlantı açar, ölçer, kapatır. Kota
 *  zaten doluysa bu aracın kendisi de düşebilir — o hâlde de SUSMAZ, "ben de
 *  bağlanamadım" der ve bu başlı başına bir bulgudur.
 *
 *  ── ⚠ BOŞ SONUÇ İLE TEMİZ SONUÇ AYRI ──────────────────────────────────
 *  "Sorun yok" ile "ölçemedim" asla aynı satıra yazılmaz. Her bölüm
 *  ÖLÇÜLDÜ / ÖLÇÜLEMEDİ diye ayrı raporlanır; ölçülemeyen varsa hüküm
 *  bölümü kapsamını daraltır.
 *  _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir".)_
 *
 *  ⛔ SALT OKUMA: `SHOW STATUS` · `SHOW VARIABLES` · `PROCESSLIST` ve siteye
 *  GET. Hiçbir tablo okunmaz, hiçbir şey yazılmaz.
 * ============================================================================
 */

const YOL = "/giris";

/** ⚠ Tip saf gövdeden — iki yerde iki şekil olmaz. */
type Olcum = TaniOlcumu;

async function istek(adres: string): Promise<Olcum> {
  const t0 = Date.now();
  try {
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), 30_000);
    const c = await fetch(adres, { signal: kontrol.signal });
    clearTimeout(zaman);
    return { durum: c.status, sure: (Date.now() - t0) / 1000 };
  } catch {
    return { durum: "hata", sure: (Date.now() - t0) / 1000 };
  }
}

function tcpDene(host: string, port: number): Promise<number | null> {
  return new Promise((coz) => {
    const t0 = Date.now();
    const s = net.connect({ host, port }, () => {
      s.end();
      coz(Date.now() - t0);
    });
    s.setTimeout(12_000, () => {
      s.destroy();
      coz(null);
    });
    s.on("error", () => coz(null));
  });
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("⛔ .env.canli okunamadı — TANI YAPILAMADI.");
    console.log("   Bu 'sorun yok' DEĞİLDİR: hiçbir ölçüm koşmadı.");
    process.exit(1);
  }
  process.env.DATABASE_URL = y.veri.ham;
  const site = y.veri.siteAdresi;

  console.log("");
  console.log("CANLI BAĞLANTI TANISI");
  console.log("=".repeat(66));
  console.log("okuma anı :", new Date().toISOString());
  console.log("sunucu    :", y.veri.adres.hostname);
  console.log("site      :", site ?? "(CANLI_ADRES tanımsız — HTTP ölçümü ATLANIYOR)");
  console.log("");

  const olculemeyen: string[] = [];

  // ─── 1) TCP ULAŞILABİLİRLİĞİ ──────────────────────────────────────────
  console.log("1) TCP — port açık mı");
  const port = Number(y.veri.adres.port || 3306);
  const tcp = await tcpDene(y.veri.adres.hostname, port);
  if (tcp === null) {
    console.log("   ⛔ PORT KAPALI/ULAŞILAMIYOR —", port);
    olculemeyen.push("TCP");
  } else {
    console.log("   OK  açık ·", tcp, "ms");
  }

  // ─── 2) SUNUCU AYARLARI VE SAYAÇLAR ───────────────────────────────────
  console.log("");
  console.log("2) sunucu ayarları ve bağlantı sayaçları");
  let prisma: { $queryRawUnsafe: (s: string) => Promise<unknown>; $disconnect: () => Promise<void> } | null = null;
  let oncekiAbort: number | null = null;
  let bizimBaglanti: number | null = null;
  const ayarlar: Record<string, string> = {};

  try {
    ({ prisma } = (await import("../src/lib/prisma")) as never);
    const q = async (s: string) =>
      (await prisma!.$queryRawUnsafe(s)) as Array<Record<string, unknown>>;

    for (const v of [
      "connect_timeout",
      "max_user_connections",
      "max_connections",
      "wait_timeout",
    ]) {
      const r = await q(`SHOW VARIABLES LIKE '${v}'`);
      ayarlar[v] = String(r[0]?.Value ?? "?");
      console.log("   " + v.padEnd(22) + ayarlar[v]);
    }

    const a = await q("SHOW STATUS LIKE 'Aborted_connects'");
    oncekiAbort = Number(a[0]?.Value ?? 0);
    console.log("   Aborted_connects      " + oncekiAbort);

    /**
     * ⚠ BİZİM KULLANICIMIZIN bağlantısı — sunucu geneli DEĞİL. Paylaşımlı
     * barındırmada `Threads_connected` başka kiracıları da sayar ve kota
     * sorusunu CEVAPLAMAZ. Kota kullanıcı başınadır.
     */
    const p = await q("SELECT ID FROM information_schema.PROCESSLIST");
    bizimBaglanti = p.length;
    console.log("   bizim açık bağlantı   " + bizimBaglanti + "   (kota " + ayarlar.max_user_connections + ")");
  } catch (e) {
    console.log("   ⛔ VERİTABANINA BAĞLANAMADI — bu başlı başına bir bulgudur.");
    console.log("      sebep:", e instanceof Error ? e.message.slice(0, 200) : String(e));
    olculemeyen.push("veritabanı");
  }

  // ─── 3) SİTE — PARALEL VE SIRALI ──────────────────────────────────────
  console.log("");
  console.log("3) site — paralel ve sıralı istek");
  let paralel: Olcum[] = [];
  const sirali: Olcum[] = [];
  if (site === null) {
    console.log("   ⛔ ATLANDI — CANLI_ADRES tanımlı değil.");
    olculemeyen.push("HTTP");
  } else {
    const adres = site + YOL;
    paralel = await Promise.all([0, 1, 2, 3, 4, 5].map(() => istek(adres)));
    console.log(
      "   paralel 6 : " +
        paralel.map((o) => `${o.durum}/${o.sure.toFixed(2)}s`).join("  "),
    );
    for (let i = 0; i < 3; i++) sirali.push(await istek(adres));
    console.log(
      "   sıralı  3 : " +
        sirali.map((o) => `${o.durum}/${o.sure.toFixed(2)}s`).join("  "),
    );
  }

  // ─── 4) SAYAÇ FARKI — VERCEL SUNUCUYA VARIYOR MU ──────────────────────
  console.log("");
  console.log("4) Aborted_connects farkı — istekler sunucuya vardı mı");
  let abortFarki: number | null = null;
  if (prisma && oncekiAbort !== null) {
    try {
      const a2 = (await prisma.$queryRawUnsafe(
        "SHOW STATUS LIKE 'Aborted_connects'",
      )) as Array<Record<string, unknown>>;
      abortFarki = Number(a2[0]?.Value ?? 0) - oncekiAbort;
      console.log("   artış:", abortFarki);
      console.log(
        abortFarki > 0
          ? "   → istekler sunucuya ULAŞTI ve sunucu bağlantıyı DÜŞÜRDÜ"
          : "   → düşen bağlantı yok",
      );
    } catch {
      olculemeyen.push("sayaç farkı");
    }
  } else {
    console.log("   ⛔ ATLANDI — ilk okuma yapılamamıştı.");
  }

  // ═══ HÜKÜM ═════════════════════════════════════════════════════════════
  console.log("");
  console.log("=".repeat(66));
  const hepsi = [...paralel, ...sirali];
  const basarili = hepsi.filter((o) => o.durum === 200);
  const dusen = hepsi.filter((o) => o.durum !== 200);
  console.log(
    "İNCELENEN " + hepsi.length +
      "  ·  TEMİZ " + basarili.length +
      "  ·  DÜŞEN " + dusen.length +
      "  ·  ÖLÇÜLEMEYEN " + olculemeyen.length +
      (olculemeyen.length ? " (" + olculemeyen.join(", ") + ")" : ""),
  );
  console.log("");

  /**
   * ⭐ HÜKÜM SAF GÖVDEDEN — burada İKİNCİ bir mantık yazılmıyor.
   * Aracın kendi `if` merdivenini kursaydık bekçi bir şeyi, araç başka
   * şeyi söylerdi ve ayrışma tam kesinti anında ortaya çıkardı.
   */
  const kotaSayi = Number(ayarlar.max_user_connections ?? 0);
  const hukum = baglantiHukmu({
    olcumler: hepsi,
    acikBaglanti: bizimBaglanti,
    kota: kotaSayi > 0 ? kotaSayi : null,
    abortFarki,
  });

  switch (hukum.sinif) {
    case "OLCUM_YOK":
      console.log("HÜKÜM YOK — HTTP ölçümü hiç koşmadı.");
      break;
    case "SAGLIKLI":
      console.log("✓ SAĞLIKLI — bütün istekler 200 döndü.");
      console.log("  en yavaş yanıt: " + hukum.enYavasSn.toFixed(2) + " sn");
      if (hukum.kotaYakin) {
        console.log(
          "  ⚠ ama açık bağlantı kotanın %" +
            Math.round(((bizimBaglanti ?? 0) / kotaSayi) * 100) +
            "'i — yük altında düşebilir.",
        );
      }
      break;
    case "EL_SIKISMASI":
      console.log("⛔ 31.08.2026 KESİNTİSİNİN İMZASI");
      console.log(
        "   sıcak bağlantı çalışıyor (" + hukum.sicak +
          "), YENİ bağlantı " + TABAN.cokusSuresiSn +
          " sn'de düşüyor (" + hukum.zamanAsimi + ")",
      );
      console.log("   → MySQL el sıkışması takılıyor · SUNUCU TARAFI");
      console.log("   → bizim havuz/IP ayarımız değil (31.08'de ölçülüp elendi)");
      break;
    case "TAM_KESINTI":
      console.log("⛔ TAM KESİNTİ — her istek zaman aşımında (" + hukum.zamanAsimi + ")");
      console.log("   → veritabanı tamamen erişilemez");
      break;
    case "KOTA_DOLU":
      console.log("⛔ KOTA DOLU — " + hukum.acik + "/" + hukum.kota);
      console.log("   → yeni bağlantıya yer yok; havuz ayarı gözden geçirilmeli");
      break;
    case "TANINMADI":
      console.log(
        "⚠ TANINMAYAN TABLO — düşen " + hukum.dusen + ", temiz " + hukum.temiz,
      );
      console.log("   → bilinen imzaların hiçbirine uymuyor; SEBEP UYDURULMUYOR");
      console.log("   → ham satırlar yukarıda, elle bakılmalı");
      break;
  }

  /** ⚠ Sunucuya varış bilgisi her hâlde basılır — hükmü tamamlar. */
  if (abortFarki !== null && hukum.sinif !== "SAGLIKLI") {
    console.log("");
    console.log(
      "   sunucuya varış: " +
        (abortFarki > 0
          ? "VARDI (aborted +" + abortFarki + ") — sunucu reddediyor"
          : "düşen bağlantı SAYILMADI — istekler sunucuya hiç varmamış olabilir"),
    );
  }

  if (prisma) await prisma.$disconnect();
  process.exit(hukum.sinif === "SAGLIKLI" ? 0 : hukum.sinif === "OLCUM_YOK" ? 1 : 2);
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
