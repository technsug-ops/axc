import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  GECE TURU — TAM BEKÇİ TURU + GERİYE TARAMA (K290, 27.09.2026)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/gece-turu.ts        (zamanlayıcı: scripts/gece-turu.cmd)
 *
 *  Kullanıcı kararı 27.09.2026: push'ta bekçilerin hepsi + değişene dokunan
 *  mutasyon denetimleri; TAM tur her GECE. Bu betik o gece turudur.
 *
 *  NE ÖLÇER: canlıdaki sürümü (`origin/main`) — geliştirme klasörünü DEĞİL
 *  (orada yarım iş olabilir). Ayrı bir çalışma ağacında (`../axcali-gece`)
 *  koşar; yerel test veritabanı (`.env`) kullanılır — canlı veriye DOKUNMAZ.
 *
 *  KIRMIZIDA GERİYE TARAMA: son YEŞİL gecenin sürümü ile bu gecenin sürümü
 *  arasında kırmızı mutasyon denetimi `git bisect run` ile koşulur ve onu
 *  ilk kırmızıya çeviren push bulunur. Bekçi (davranış) kırmızısı taranmaz:
 *  bekçiler her push'ta koşuyor — gece kırmızısı ortam/zaman kaynaklıdır ve
 *  öyle raporlanır.
 *
 *  SONUÇ İKİ YERE: `raporlar/gece-turu-*.log` (tam çıktı) ve canlı
 *  `AuditLog` → `GECE_BEKCI_TURU` (panel uyarısı ve `/ayarlar/gece-turu`
 *  ekranı bunu okur). Hazırlık düşse bile iz yazılır — kaçan gece GÖRÜNÜR.
 *
 *  BETIK SINIFI: SUREKLI
 * ============================================================================
 */

const KOK = process.cwd();
const GECE = resolve(KOK, "..", "axcali-gece");
const RAPOR = join(KOK, "raporlar");
const DURUM = join(RAPOR, "gece-turu-durum.json");

type Durum = { sonYesilSha?: string; kilitOzeti?: string };
type Kirmizi = { ad: string; tur: "BEKCI" | "MUTASYON"; ilkKotu?: { sha: string; tarih: string; mesaj: string } | null };

function kos(komut: string, cwd: string, ek: Record<string, string> = {}) {
  const r = spawnSync(komut, { cwd, shell: true, encoding: "utf8", env: { ...process.env, ...ek }, maxBuffer: 256 * 1024 * 1024 });
  return { kod: r.status ?? 1, cikti: (r.stdout ?? "") + (r.stderr ?? "") };
}

function durumOku(): Durum {
  try {
    return JSON.parse(readFileSync(DURUM, "utf8")) as Durum;
  } catch {
    return {};
  }
}

async function izYaz(detay: Record<string, unknown>) {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("⚠ canlı yapılandırma yok — iz yazılamadı (rapor dosyada)");
    return;
  }
  process.env.DATABASE_URL = c.veri.ham;
  const { prisma } = await import("../src/lib/prisma");
  await prisma.auditLog.create({ data: { action: "GECE_BEKCI_TURU", targetType: "Depo", detail: JSON.stringify(detay) } });
  await prisma.$disconnect();
}

async function main() {
  const basladi = Date.now();
  mkdirSync(RAPOR, { recursive: true });
  const gun = new Date().toISOString().slice(0, 10);
  const gunluk = join(RAPOR, `gece-turu-${gun}.log`);
  const yaz = (s: string) => {
    console.log(s);
    writeFileSync(gunluk, s + "\n", { flag: "a" });
  };
  const hazirlik = (adim: string, r: { kod: number; cikti: string }) => {
    writeFileSync(gunluk, `\n── ${adim} (çıkış ${r.kod}) ──\n${r.cikti}\n`, { flag: "a" });
    if (r.kod !== 0) throw new Error(`HAZIRLIK_DUSTU: ${adim}`);
  };

  const durum = durumOku();
  let sha = "";
  try {
    yaz(`GECE TURU BAŞLADI ${new Date().toISOString()}`);
    hazirlik("git fetch", kos("git fetch origin --quiet", KOK));
    if (!existsSync(GECE)) hazirlik("worktree ekle", kos(`git worktree add --detach "${GECE}" origin/main`, KOK));
    else {
      hazirlik("checkout", kos("git checkout --detach --force origin/main", GECE));
      hazirlik("temizle", kos("git clean -fdx -e node_modules -e .env -e .env.canli", GECE));
    }
    sha = kos("git rev-parse HEAD", GECE).cikti.trim();
    yaz(`sürüm ${sha}`);

    /* Bağımlılıklar yalnız kilit dosyası değişince yeniden kurulur. */
    const kilit = createHash("md5").update(readFileSync(join(GECE, "package-lock.json"))).digest("hex");
    if (!existsSync(join(GECE, "node_modules")) || durum.kilitOzeti !== kilit) {
      hazirlik("npm ci", kos("npm ci --no-audit --no-fund", GECE));
      durum.kilitOzeti = kilit;
    }
    for (const f of [".env", ".env.canli"]) if (existsSync(join(KOK, f))) copyFileSync(join(KOK, f), join(GECE, f));
    hazirlik("prisma generate", kos("npx prisma generate", GECE));
    hazirlik("migrate deploy (yerel test veritabanı)", kos("npx prisma migrate deploy", GECE));
  } catch (e) {
    const sebep = e instanceof Error ? e.message : String(e);
    yaz(`⛔ ${sebep} — tur KOŞMADI (ayrıntı: ${gunluk})`);
    await izYaz({ sha: sha || null, durum: "HAZIRLIK_DUSTU", sebep, sureSn: Math.round((Date.now() - basladi) / 1000) });
    process.exitCode = 1;
    return;
  }

  yaz("TAM TUR koşuyor…");
  const tur = kos("npx tsx scripts/bekci.ts", GECE, { TAM_TUR: "1" });
  writeFileSync(gunluk, tur.cikti, { flag: "a" });
  const kirmiziAdlar = [...tur.cikti.matchAll(/^\s+(\S+)\s+\.\.\.\s+KIRMIZI/gm)].map((m) => m[1]!);
  const ozet = tur.cikti.match(/^(\d+)\/(\d+) yeşil/m);
  const yesil = ozet ? Number(ozet[1]) : null;
  const toplam = ozet ? Number(ozet[2]) : null;

  const kirmizilar: Kirmizi[] = kirmiziAdlar.map((ad) => ({ ad, tur: /-mutasyon:kontrol$/.test(ad) ? "MUTASYON" : "BEKCI" }));
  /* Tur çıktısı tanınmadıysa (özet yok) sonuç GEÇERSİZ — yeşil sayılmaz. */
  const gecerli = ozet !== null;

  if (gecerli && kirmizilar.length > 0 && durum.sonYesilSha && durum.sonYesilSha !== sha) {
    for (const k of kirmizilar.filter((x) => x.tur === "MUTASYON")) {
      /* Denetim son yeşil gecede YOKTUYSA tarama yanlış push'u suçlar — taranmaz, söylenir. */
      const dosya = "scripts/" + k.ad.replace(":", "-") + ".ts";
      if (kos(`git cat-file -e ${durum.sonYesilSha}:${dosya}`, GECE).kod !== 0) {
        k.ilkKotu = null;
        yaz(`GERİYE TARAMA ATLANDI: ${k.ad} son yeşil gecede yoktu (yeni denetim — ilk koşumunda kırmızı)`);
        continue;
      }
      yaz(`GERİYE TARAMA: ${k.ad} (${durum.sonYesilSha.slice(0, 7)}..${sha.slice(0, 7)})`);
      kos("git bisect reset", GECE);
      const b = kos(`git bisect start ${sha} ${durum.sonYesilSha} && git bisect run npm run ${k.ad}`, GECE);
      writeFileSync(gunluk, b.cikti, { flag: "a" });
      const ilk = b.cikti.match(/^([0-9a-f]{40}) is the first bad commit/m)?.[1];
      if (ilk) {
        const bilgi = kos(`git show -s --format=%cI%n%s ${ilk}`, GECE).cikti.trim().split(/\r?\n/);
        k.ilkKotu = { sha: ilk, tarih: bilgi[0] ?? "", mesaj: bilgi[1] ?? "" };
        yaz(`  → ilk kırmızı: ${ilk.slice(0, 7)} ${bilgi[0]} «${bilgi[1]}»`);
      } else {
        k.ilkKotu = null;
        yaz("  → bulunamadı (aralık tek sürüm ya da tarama düştü)");
      }
      kos("git bisect reset", GECE);
    }
  }

  if (gecerli && kirmizilar.length === 0) durum.sonYesilSha = sha;
  writeFileSync(DURUM, JSON.stringify(durum, null, 1));

  const sureSn = Math.round((Date.now() - basladi) / 1000);
  yaz(`GECE TURU BİTTİ · ${gecerli ? `${yesil}/${toplam} yeşil` : "SONUÇ OKUNAMADI"} · ${sureSn} sn`);
  await izYaz({
    sha,
    durum: !gecerli ? "SONUC_OKUNAMADI" : kirmizilar.length === 0 ? "YESIL" : "KIRMIZI",
    yesil,
    toplam,
    kirmizilar,
    sonYesilSha: durum.sonYesilSha ?? null,
    sureSn,
    gunluk: gunluk.replace(dirname(KOK) + "\\", ""),
  });
  if (!gecerli || kirmizilar.length > 0) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error("GECE TURU BEKLENMEYEN HATA:", e);
  try {
    await izYaz({ durum: "HATA", sebep: e instanceof Error ? e.message : String(e) });
  } catch {
    /* İz de yazılamadıysa rapor dosyasında kalır; çan «tur koşmadı» diye yanar (son iz eskir). */
  }
  process.exitCode = 1;
});
