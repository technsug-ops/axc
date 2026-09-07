import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { baslikKur, kimlikOku, tumKayitlar, UCLAR } from "./hb/istemci";

/**
 * ============================================================================
 *  K184 — HB LİSTİNG ÖLÇÜMÜ (SALT OKUMA · KOD ÖNCESİ)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-hb-listing-olcum.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bir eşleme kararının tabanını ölçer.
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ. Ne kanala, ne deftere. Ve bilerek KOD YAZILMADAN
 *  ÖNCE koşuyor: "HB durumları TY enumuna nasıl eşlenir" sorusu ancak
 *  dağılım görüldükten sonra cevaplanır.
 *
 *  ── ÜÇ SORU ────────────────────────────────────────────────────────────
 *  ① KANAL HESABI — canlı merchantId deftere bağlı mı? (İçe aktarma bunu
 *    şart koşuyor ve hesabı KENDİLİĞİNDEN OLUŞTURMUYOR.)
 *  ② DURUM DAĞILIMI — `isSalable · isSuspended · isLocked · isFrozen ·
 *    deactivationReasons` gerçekte hangi kombinasyonlarda geliyor.
 *  ③ ANAHTAR SEÇİMİ — bizim `ChannelSku.channelSku` kayıtlarıyla hangi alan
 *    daha çok eşleşiyor: `merchantSku` mu `hepsiburadaSku` mu?
 *
 *  ⛔ ÜÇÜNCÜSÜ NİYE ÖLÇÜLÜYOR: TY tarafında üç alan (`barcode` · `stockCode` ·
 *  `productMainId`) tek kümeye KATLANMIŞTI ve hangisinin eşleştiği
 *  görünmüyordu. Aynı hatayı HB'de tekrarlamamak için alanlar AYRI AYRI
 *  ölçülüyor — ve çakışma (aynı anahtar iki farklı varyanta) ayrıca sayılıyor.
 *  _(Anayasa: "kimlik varken dizeyle aranmaz" · "benzer ad aynı kimlik
 *  değildir".)_
 * ============================================================================
 */

type Listing = Record<string, unknown>;

function bayrak(v: unknown): boolean {
  return v === true;
}
function dize(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const k = kimlikOku();
  if (k === null) {
    console.log("⛔ HB kimliği okunamadı (.env.canli).");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nK184 — HB LİSTİNG ÖLÇÜMÜ (SALT OKUMA)");
  console.log("  ortam  " + k.ortam);
  console.log("  an     " + new Date().toISOString());
  console.log("=".repeat(78));

  /* ═══ ① KANAL HESABI ══════════════════════════════════════════════ */
  const hesaplar = await prisma.channelAccount.findMany({
    where: { channel: { name: "Hepsiburada" } },
    select: {
      id: true,
      name: true,
      code: true,
      externalId: true,
      isActive: true,
      _count: { select: { sales: true, channelSkus: true } },
    },
    orderBy: { name: "asc" },
  });
  console.log("\n① HB KANAL HESAPLARI (" + hesaplar.length + ")");
  const eslesen = hesaplar.find((h) => h.externalId === k.merchantId);
  for (const h of hesaplar) {
    console.log(
      `   ${h.externalId === k.merchantId ? "✓" : " "} ${h.name} [${h.code}] · ` +
        `externalId ${h.externalId ?? "BOŞ"} · aktif ${h.isActive} · ` +
        `satış ${h._count.sales} · kanalSku ${h._count.channelSkus}`,
    );
  }
  /**
   * ⛔ EŞLEŞME YOKSA BU BİR HÜKÜMDÜR: içe aktarma canlıda hesabı KENDİ
   * OLUŞTURMUYOR (doğru davranış — kanal hesabı uydurulmaz). Bağ elle
   * kurulana kadar HB canlı içe aktarması ÇALIŞMAZ.
   */
  console.log(
    "   → canlı merchantId ile eşleşen hesap: " + (eslesen ? eslesen.name : "⛔ YOK"),
  );

  /* ═══ ② LİSTİNGLERİ ÇEK ══════════════════════════════════════════ */
  console.log("\n② LİSTİNGLER ÇEKİLİYOR (salt okuma)...");
  const cekim = await tumKayitlar((o, l) => UCLAR.listingler(k, o, l), baslikKur(k), 100);
  if (cekim.tur !== "TAMAM") {
    /** ⛔ HATA TAM TAŞINIR. */
    console.log("   ⛔ ÇEKİM DÜŞTÜ: " + JSON.stringify(cekim));
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const listingler = cekim.kayitlar as Listing[];
  console.log(`   ${listingler.length} listing`);

  /* ═══ ③ DURUM DAĞILIMI ═══════════════════════════════════════════ */
  /**
   * ⚠ TEK TEK BAYRAK DEĞİL, KOMBİNASYON SAYILIYOR. Bayrakları ayrı ayrı
   * saymak "kaç tanesi kilitli" der ama "kilitli VE satılabilir" gibi bir
   * çelişkinin var olup olmadığını göstermez — eşleme kararı tam orada
   * kurulacak.
   */
  const kombinasyon = new Map<string, number>();
  const sebepler = new Map<string, number>();
  let salabilir = 0;
  let stoksuz = 0;
  for (const l of listingler) {
    const anahtar = [
      bayrak(l.isSalable) ? "satılabilir" : "satılamaz",
      bayrak(l.isSuspended) ? "askıda" : "-",
      bayrak(l.isLocked) ? "kilitli" : "-",
      bayrak(l.isFrozen) ? "donuk" : "-",
      Number(l.availableStock ?? 0) > 0 ? "stoklu" : "stoksuz",
    ].join(" · ");
    kombinasyon.set(anahtar, (kombinasyon.get(anahtar) ?? 0) + 1);
    if (bayrak(l.isSalable)) salabilir++;
    if (Number(l.availableStock ?? 0) <= 0) stoksuz++;
    for (const alan of ["deactivationReasons", "lockReasons", "freezeReasons"]) {
      const v = l[alan];
      if (Array.isArray(v)) {
        for (const r of v) {
          const ad = typeof r === "string" ? r : JSON.stringify(r);
          sebepler.set(`${alan}: ${ad}`, (sebepler.get(`${alan}: ${ad}`) ?? 0) + 1);
        }
      }
    }
  }

  console.log("\n③ DURUM KOMBİNASYONLARI (satılabilir · askıda · kilitli · donuk · stok)");
  for (const [ad, n] of [...kombinasyon].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(6)}  ${ad}`);
  }
  console.log(`\n   isSalable true : ${salabilir}`);
  console.log(`   stoksuz        : ${stoksuz}`);

  console.log("\n   SEBEP KODLARI (" + sebepler.size + " ayrı)");
  if (sebepler.size === 0) console.log("     (hiç sebep kodu dönmedi)");
  for (const [ad, n] of [...sebepler].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`   ${String(n).padStart(6)}  ${ad.slice(0, 66)}`);
  }

  /* ═══ ④ ANAHTAR SEÇİMİ — ÖLÇÜLEREK ══════════════════════════════ */
  const kanalSkulari = await prisma.channelSku.findMany({
    where: { channelAccount: { channel: { name: "Hepsiburada" } } },
    select: { channelSku: true, variantId: true },
  });
  const bizdeki = new Map<string, Set<string>>();
  for (const c of kanalSkulari) {
    const s = bizdeki.get(c.channelSku) ?? new Set<string>();
    s.add(c.variantId);
    bizdeki.set(c.channelSku, s);
  }

  console.log("\n④ ANAHTAR SEÇİMİ — hangi alan defterle eşleşiyor");
  console.log(`   defterdeki HB kanal SKU kaydı: ${kanalSkulari.length}`);
  for (const alan of ["merchantSku", "hepsiburadaSku", "uniqueIdentifier"]) {
    const degerler = listingler.map((l) => dize(l[alan]).trim()).filter((x) => x !== "");
    const benzersiz = new Set(degerler);
    const eslesenler = [...benzersiz].filter((d) => bizdeki.has(d));
    /** ⚠ ÇAKIŞMA: aynı anahtar İKİ farklı varyanta bağlıysa eşleştirme
     *  güvenilir değildir — TY'de üç anahtarın katlanması bu yüzden kötüydü. */
    const cakisan = eslesenler.filter((d) => (bizdeki.get(d)?.size ?? 0) > 1).length;
    const oran =
      benzersiz.size === 0 ? 0 : (eslesenler.length / benzersiz.size) * 100;
    console.log(
      `   ${alan.padEnd(18)} dolu ${String(degerler.length).padStart(5)} · ` +
        `benzersiz ${String(benzersiz.size).padStart(5)} · ` +
        `eşleşen ${String(eslesenler.length).padStart(5)} (%${oran.toFixed(1)}) · ` +
        `çakışan ${cakisan}`,
    );
  }

  console.log("\n" + "=".repeat(78));
  console.log("  SALT OKUMA — hiçbir şey yazılmadı. Eşleme kararı bu ölçümden SONRA.");
  await prisma.$disconnect();
}

void main();
