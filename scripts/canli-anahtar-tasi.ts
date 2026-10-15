import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

/**
 * ============================================================================
 *  PAZARYERİ ANAHTAR TAŞIMA — K337 3. adım ③ (kullanıcı kararı 15.10.2026
 *  «tek seferlik taşıma» · «eksiksiz taşıyalım»)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — çok-firma canlı geçiş günü BİR KEZ koşar: sunucudaki
 *  tek takım ortam anahtarlarını (TY · HB · N11) ait oldukları satış hesabına şifreli
 *  yazar. Sonrasında kodda ortama dönüş yolu yoktur; betiğin yeniden koşması
 *  zararsızdır (aynı anahtar «AYNI · atlanır») ama gerekmez.
 *
 *      npx tsx scripts/canli-anahtar-tasi.ts                    ← KURU (yazmaz)
 *      npx tsx scripts/canli-anahtar-tasi.ts --yaz --yapan=<e-posta>
 *      npx tsx scripts/canli-anahtar-tasi.ts --geri             ← geri alma KURU
 *      npx tsx scripts/canli-anahtar-tasi.ts --geri --yaz --yapan=<e-posta>
 *    ek: --uzerine (hesapta FARKLI anahtar varsa üstüne yazmayı AÇIKÇA iste)
 *        --firma=<kod> (varsayılan: tek aktif firma ya da beyan — betik-firmasi)
 *        --deneme (canlı yerine deneme veritabanı: `.env`, hedef kilitli)
 *
 *  Kurallar saf gövdede (`src/lib/kanal-anahtari/tasima.ts`) ve bekçide sınanır.
 *  Toplu yazım üç şartı (anayasa): (a) yazımdan ÖNCE mevcut şifreli kayıtların
 *  anlık görüntüsü `veri/ozel/` altına (depoya girmez) · (b) her hesap bağımsız ve
 *  tekrar koşulabilir — yarım kalırsa ikinci koşum kalanı yazar, yazılanı «AYNI»
 *  görür · (c) plan «durdu» diyen tek kalem varsa HİÇBİR şey yazılmaz.
 *  ⛔ Anahtarın kendisi ekrana, dosyaya, ize yazılmaz — yalnız son 4 hane.
 * ============================================================================
 */

const arg = (ad: string) => process.argv.find((a) => a.startsWith(`--${ad}=`))?.slice(ad.length + 3);
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");
const UZERINE = process.argv.includes("--uzerine");
const DENEME = process.argv.includes("--deneme");

function dosyadanDegisken(dosya: string, ad: string): string | undefined {
  try {
    return new RegExp(`^${ad}="?([^"\\r\\n]+)"?`, "m").exec(readFileSync(dosya, "utf8"))?.[1];
  } catch {
    return undefined;
  }
}

async function main() {
  /* ── HEDEF VERİTABANI ─────────────────────────────────────────────── */
  let adres: string;
  if (DENEME) {
    adres = dosyadanDegisken(".env", "DATABASE_URL") ?? "";
    if (!/\/selliora_deneme(\?|$)/.test(adres)) {
      console.log("⛔ --deneme: .env adresi selliora_deneme DEĞİL — durduruldu.");
      process.exitCode = 1;
      return;
    }
  } else {
    const { canliYapilandirma } = await import("./canli-ortak");
    const { betikAdresi } = await import("../src/lib/veritabani-adresi");
    const c = canliYapilandirma();
    if (!c.tamam) {
      console.log("⛔ CANLI ADRES OKUNAMADI (.env.canli)");
      process.exitCode = 1;
      return;
    }
    adres = betikAdresi(c.veri.ham);
  }
  process.env.DATABASE_URL = adres;
  /* ⛔ DENEME KİPİ: ortam okuyucusu deneme işaretini görmezse yedek olarak `.env.canli`yi okur —
     deneme veritabanına GERÇEK anahtar yazılabilirdi. İşaret, istemciler yüklenmeden ÖNCE konur. */
  if (DENEME) process.env.DENEME_ORTAMI = "1";

  /* ── ANA SIR — depo şifrelemek için ister (canlıda .env.canli'de durur) ── */
  if (!process.env.PAZARYERI_ANAHTAR_SIRRI) {
    const s = dosyadanDegisken(DENEME ? ".env" : ".env.canli", "PAZARYERI_ANAHTAR_SIRRI");
    if (s) process.env.PAZARYERI_ANAHTAR_SIRRI = s;
  }

  const { kimlikOku: tyOku } = await import("./ty/istemci");
  const { kimlikOku: hbOku } = await import("./hb/istemci");
  const { kimlikOku: n11Oku } = await import("./n11/istemci");
  const { sirOku, SIR_DEGISKENI } = await import("../src/lib/kanal-anahtari/sifre");
  const D = await import("../src/lib/kanal-anahtari/depo");
  const T = await import("../src/lib/kanal-anahtari/tasima");
  const { betikFirmasiylaKos } = await import("./betik-firmasi");

  const ortam = { TRENDYOL: tyOku(), HEPSIBURADA: hbOku(), N11: n11Oku() };
  const sir = sirOku(process.env[SIR_DEGISKENI]);

  /* Canlıda firma seçimi betik-firmasi'nın KENDİ okuduğu ham adresle; denemede kilitli .env adresiyle. */
  await betikFirmasiylaKos(DENEME ? adres : undefined, async (companyId) => {
    const { prisma } = await import("../src/lib/prisma");
    const kip = GERI ? (YAZ ? "⚠ GERİ ALMA — YAZIM" : "GERİ ALMA — KURU") : YAZ ? "⚠ TAŞIMA — YAZIM" : "TAŞIMA — KURU (hiçbir şey yazılmaz)";
    console.log("\n" + "=".repeat(78));
    console.log(`PAZARYERİ ANAHTAR TAŞIMA — ${kip}${DENEME ? "  ·  DENEME VERİTABANI" : "  ·  CANLI"}`);
    console.log("=".repeat(78));
    const firma = await prisma.company.findUnique({ where: { id: companyId }, select: { code: true, name: true } });
    console.log(`  firma        : ${firma?.code} · ${firma?.name}`);
    console.log(`  ana sır      : ${sir.durum === "TAMAM" ? "var (32 bayt)" : sir.durum}`);
    console.log(`  ortam anahtarı: TY ${ortam.TRENDYOL ? "var" : "YOK"} · HB ${ortam.HEPSIBURADA ? "var" : "YOK"} · N11 ${ortam.N11 ? "var" : "YOK"}`);

    /* ── HESAPLAR ve bugünkü anahtarları (açılarak — yalnız karşılaştırma için) ── */
    const ham = await prisma.channelAccount.findMany({
      where: { satisIcin: true, isActive: true, channel: { code: { in: ["TRENDYOL", "HEPSIBURADA", "N11"] } } },
      select: { id: true, name: true, externalId: true, apiHesapKimligi: true, channel: { select: { code: true } } },
      orderBy: { name: "asc" },
    });
    const hesaplar = [];
    for (const h of ham) {
      const a = await D.kayitliKimligiAc(h.id);
      hesaplar.push({
        id: h.id,
        name: h.name,
        kanal: h.channel.code as "TRENDYOL" | "HEPSIBURADA" | "N11",
        externalId: h.externalId,
        apiHesapKimligi: h.apiHesapKimligi,
        mevcut: a.durum === "TAMAM" ? { tur: "VAR" as const, kimlik: a.kimlik } : a.durum === "ANAHTAR_YOK" ? { tur: "YOK" as const } : { tur: "ACILAMADI" as const },
      });
    }
    console.log(`  satış hesabı : ${hesaplar.length} (${hesaplar.map((h) => `${h.name} [${h.mevcut.tur}]`).join(" · ") || "—"})`);

    /* ═══ GERİ ALMA ═══════════════════════════════════════════════════ */
    if (GERI) {
      const kume = T.geriAlmaKumesi(ortam, hesaplar);
      console.log(`\n  geri alınacak (anahtarı ortamdakiyle BİREBİR aynı): ${kume.length}`);
      for (const k of kume) console.log(`    · ${k.kanal.padEnd(12)} ${k.name}`);
      if (!YAZ) return console.log("\n  KURU — hiçbir şey silinmedi. Silmek için: --geri --yaz --yapan=<e-posta>\n");
      const yapan = await yapanBul(prisma, companyId);
      if (!yapan) return;
      for (const k of kume) {
        const s = await D.anahtarKaldir(k.id, yapan);
        console.log(`    ${s.durum === "TAMAM" ? "✓ kaldırıldı" : "⛔ " + s.hata} — ${k.name}`);
      }
      return;
    }

    /* ═══ TAŞIMA PLANI ════════════════════════════════════════════════ */
    const plan = T.tasimaPlani(ortam, hesaplar, { uzerine: UZERINE });
    console.log("\n  PLAN");
    for (const k of plan) console.log(`    ${k.kanal.padEnd(12)} ${k.durum.padEnd(24)} ${k.hesap?.name ?? "—"}${k.sonDort ? `  (son 4: ${k.sonDort})` : ""}`);
    const karar = T.tasimaYazilabilirMi(plan);
    if (!karar.yazilabilir) {
      console.log(
        karar.durduran.length > 0
          ? `\n  ⛔ ${karar.durduran.length} kalem DURDU — hiçbir şey yazılmaz (yarım taşıma yok). Nedenleri yukarıda; FARKLI anahtar için --uzerine açıkça istenir.`
          : "\n  Yazılacak bir şey yok (hepsi AYNI ya da ortamda anahtar yok).",
      );
      if (YAZ && karar.durduran.length > 0) process.exitCode = 1;
      return;
    }
    if (!YAZ) return console.log("\n  KURU — hiçbir şey yazılmadı. Yazmak için: --yaz --yapan=<e-posta>\n");
    if (sir.durum !== "TAMAM") {
      console.log(`\n  ⛔ ANA SIR ${sir.durum} — yazım yapılmaz.`);
      process.exitCode = 1;
      return;
    }
    const yapan = await yapanBul(prisma, companyId);
    if (!yapan) return;

    /* (a) ANLIK GÖRÜNTÜ — mevcut ŞİFRELİ kayıtlar (düz anahtar yok), depo dışı klasöre. */
    const once = await prisma.kanalAnahtari.findMany({ select: { channelAccountId: true, sifreli: true, sonDort: true, updatedAt: true } });
    mkdirSync("veri/ozel", { recursive: true });
    const goruntu = `veri/ozel/anahtar-tasima-oncesi-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}.json`;
    writeFileSync(goruntu, JSON.stringify({ firma: firma?.code, an: new Date().toISOString(), kayitlar: once }, null, 2));
    console.log(`\n  anlık görüntü : ${goruntu} (${once.length} şifreli kayıt)`);

    /* (b) YAZIM — hesap hesap; (c) her biri geri açılıp ortamdakiyle BİREBİR karşılaştırılır. */
    let bozuk = 0;
    for (const k of plan) {
      if ((k.durum !== "YAZILACAK" && k.durum !== "USTUNE_YAZILACAK") || !k.hesap || !k.ham) continue;
      const s = await D.anahtarKaydet(k.hesap.id, k.ham, yapan);
      const geri = await D.kayitliKimligiAc(k.hesap.id);
      const tutuyor = s.durum === "TAMAM" && geri.durum === "TAMAM" && T.ayniKimlik(geri.kimlik.kimlik, k.ham);
      if (!tutuyor) bozuk++;
      console.log(`    ${tutuyor ? "✓ yazıldı ve doğrulandı" : `⛔ ${s.durum === "HATA" ? s.hata : geri.durum}`} — ${k.kanal} · ${k.hesap.name} (son 4: ${k.sonDort})`);
    }
    console.log(bozuk === 0 ? "\n  TAŞIMA TAMAM. Sonra: Ayarlar → Kanal hesapları → her hesapta «Bağlantıyı dene».\n" : `\n  ⛔ ${bozuk} kalem doğrulanamadı — anlık görüntü yukarıda; betik yeniden koşulabilir.\n`);
    if (bozuk > 0) process.exitCode = 1;
  });
}

/** İzdeki «yapan»: --yapan=<e-posta>, firmanın ÜYESİ olmalı (iz firmaya ait kalsın). */
async function yapanBul(prisma: typeof import("../src/lib/prisma").prisma, companyId: string): Promise<string | null> {
  const eposta = arg("yapan")?.trim().toLowerCase();
  if (!eposta) {
    console.log("\n  ⛔ --yapan=<e-posta> zorunlu (iz kimin yaptığını yazar).");
    process.exitCode = 1;
    return null;
  }
  const u = await prisma.userCompanyRole.findFirst({ where: { companyId, user: { email: eposta } }, select: { userId: true } });
  if (!u) {
    console.log(`\n  ⛔ ${eposta} bu firmanın üyesi değil.`);
    process.exitCode = 1;
    return null;
  }
  return u.userId;
}

main()
  .catch((e) => {
    console.error("⛔ BEKLENMEYEN HATA:", e);
    process.exitCode = 1;
  })
  /* Bağlantı havuzu kapanmazsa süreç bitmez (öteki betiklerle aynı). */
  .finally(async () => {
    const { prisma, sistemPrisma } = await import("../src/lib/prisma");
    await Promise.allSettled([prisma.$disconnect(), sistemPrisma.$disconnect()]);
  });
