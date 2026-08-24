/**
 * ============================================================================
 *  K8-ÖLÇÜM — HAKEDİŞ EŞLEŞTİRMESİ NEDEN KURULMUYOR (salt okuma)
 * ----------------------------------------------------------------------------
 *  ⚠ HİÇBİR ŞEY YAZMAZ.
 *
 *  `canli:hakedis-esle` tek bir "karşılığı yok" rakamı basıyor. O rakam İKİ
 *  apayrı şeyi tek kefeye koyuyor ve ikisi FARKLI işe yol açar:
 *    (a) sipariş defterde HİÇ YOK      → kapsam boşluğu, A3 cephesi
 *    (b) sipariş VAR ama eşleşme kurulamıyor → DÜZELTME, bugün yapılır
 *
 *  İkincisi sistematikse (boşluk artığı, biçim farkı, kanal uyuşmazlığı)
 *  `--uygula` koşulmadan ÖNCE bilinmeli — yoksa yanlış bağ yazılır ve bağ,
 *  kargo tarihi gibi sessizce kalıcılaşır.
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("yapılandırma yok:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const okumaAni = new Date();
  console.log("");
  console.log("=".repeat(74));
  console.log("K8-ÖLÇÜM — HAKEDİŞ EŞLEŞTİRMESİ   (SALT OKUMA · yazma YOK)");
  console.log("=".repeat(74));
  console.log(`  hedef         ${y.veri.adres.hostname}`);
  console.log(`  sistem okuma  ${okumaAni.toISOString()}`);

  // ── ① SAYILAR ─────────────────────────────────────────────────────────
  const [toplam, bagli, noSuz] = await Promise.all([
    prisma.settlementItem.count(),
    prisma.settlementItem.count({ where: { saleId: { not: null } } }),
    prisma.settlementItem.count({ where: { orderNo: null } }),
  ]);

  const kalemler = await prisma.settlementItem.findMany({
    where: { saleId: null, orderNo: { not: null } },
    select: {
      id: true,
      orderNo: true,
      channelAccountId: true,
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
    },
  });

  const satislar = await prisma.sale.findMany({
    select: { id: true, code: true, channelAccountId: true },
  });

  /** ⚠ HAM kod ile TEMİZ kod ayrı tutulur — fark (b) kovasının kanıtı. */
  const hamDizin = new Map<string, (typeof satislar)[number]>();
  const temizDizin = new Map<string, (typeof satislar)[number]>();
  for (const s of satislar) {
    if (s.code === null) continue;
    hamDizin.set(s.code, s);
    temizDizin.set(s.code.trim().replace(/\s+/g, ""), s);
  }

  console.log("\n① SAYILAR");
  console.log(`   toplam hakediş kalemi        ${toplam}`);
  console.log(`   bugün BAĞLI                  ${bagli}`);
  console.log(`   sipariş no BOŞ (bağlanamaz)  ${noSuz}`);
  console.log(`   bağsız + sipariş nolu        ${kalemler.length}`);

  // ── ② BAĞLANAMAYANLAR İKİYE AYRILIR ───────────────────────────────────
  let baglanacak = 0;
  const bDusuk: { no: string; sebep: string; ayrinti: string }[] = [];
  const aYok = new Set<string>();

  for (const k of kalemler) {
    const no = k.orderNo!;
    const ham = hamDizin.get(no);
    if (ham) {
      /** Ham eşleşme var — kanal uyuşuyor mu? */
      if (ham.channelAccountId !== k.channelAccountId) {
        bDusuk.push({
          no,
          sebep: "KANAL UYUŞMUYOR",
          ayrinti: `kalem ${k.channelAccount.channel.name}/${k.channelAccount.name}`,
        });
      } else {
        baglanacak += 1;
      }
      continue;
    }
    /**
     * ⚠ HAM TUTMUYOR AMA TEMİZ TUTUYORSA: bu bir KAPSAM boşluğu DEĞİL,
     * bir BİÇİM sorunudur — sipariş defterde VAR, sadece kod boşluk/
     * görünmez karakter taşıyor. Ayrı sayılmazsa "sipariş yok" diye
     * okunur ve düzeltilebilir bir hata A3'ün hanesine yazılır.
     */
    const temiz = temizDizin.get(no.trim().replace(/\s+/g, ""));
    if (temiz) {
      bDusuk.push({
        no,
        sebep: "BİÇİM FARKI",
        ayrinti: `defterdeki kod ${JSON.stringify(temiz.code)}`,
      });
      continue;
    }
    aYok.add(no);
  }

  console.log("\n② BAĞLANAMAYANLAR — İKİYE AYRILDI (tek rakam basılmıyor)");
  console.log(`   BAĞLANACAK (kod + kanal tutuyor)   ${baglanacak} kalem`);
  console.log(
    `   (a) sipariş defterde HİÇ YOK       ${kalemler.length - baglanacak - bDusuk.length} kalem · ${aYok.size} farklı sipariş`,
  );
  console.log(`   (b) sipariş VAR, eşleşme kurulamadı ${bDusuk.length} kalem`);
  if (bDusuk.length > 0) {
    console.log("\n   (b) DÖKÜMÜ — düzeltilebilir:");
    const sebepler = new Map<string, number>();
    for (const b of bDusuk) sebepler.set(b.sebep, (sebepler.get(b.sebep) ?? 0) + 1);
    for (const [s, n] of sebepler) console.log(`     ${s.padEnd(18)} ${n}`);
    for (const b of bDusuk.slice(0, 10)) {
      console.log(`     ${b.no.padEnd(14)} ${b.sebep.padEnd(18)} ${b.ayrinti}`);
    }
  } else {
    console.log("\n   (b) BOŞ — sistematik bir biçim/kanal bozukluğu YOK.");
    console.log("       Yani bağlanamayanların TAMAMI kapsam boşluğu.");
  }

  // ── ③ MEVCUT BAĞLARIN KAYNAĞI ─────────────────────────────────────────
  console.log("\n③ MEVCUT BAĞLARIN KAYNAĞI");
  const izler = await prisma.auditLog.findMany({
    where: { action: { contains: "HAKEDIS" } },
    select: { action: true, createdAt: true, detail: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  /**
   * ⚠ ÖNCE "BAĞ VAR MI" SORULUR. İlk yazım doğrudan bağların KAYNAĞINI
   * anlatmaya geçiyordu; bağ sıfırken bile "yükleme anında kurulmuş"
   * diyordu — olmayan bir şeyin kaynağını açıklamak.
   */
  if (bagli === 0) {
    console.log("   BAĞ YOK (0) — açıklanacak bir kaynak da yok.");
    console.log("   ⚠ Yani rapor HER SEFERİNDE satışlardan ÖNCE yüklenmiş;");
    console.log("     yükleme anındaki eşleştirme hiçbir kez tutmamış.");
  } else if (izler.length === 0) {
    console.log("   İZ YOK — betik hiç `--uygula` ile koşmamış.");
    console.log("   → O hâlde mevcut bağlar YÜKLEME ANINDA kurulmuş demektir:");
    console.log("     o satışlar rapor yüklenmeden ÖNCE deftere girilmiş.");
  } else {
    for (const i of izler) {
      console.log(`   ${i.createdAt.toISOString().slice(0, 16)} ${i.action}`);
    }
  }

  // ── ④ HANGİ PARTİLER ──────────────────────────────────────────────────
  const partiler = await prisma.settlement.findMany({
    select: {
      createdAt: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\n④ RAPOR PARTİLERİ (${partiler.length})`);
  for (const p of partiler) {
    console.log(
      `   ${p.createdAt.toISOString().slice(0, 10)} ${(p.channelAccount?.channel.name ?? "?").padEnd(14)} ${p._count.items} kalem`,
    );
  }

  console.log("\n" + "-".repeat(74));
  console.log("  RAPOR KİPİ — hiçbir şey yazılmadı. `--uygula` KOŞULMADI.");
  console.log("");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
