import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { kimlikOku } from "./hb/istemci";

/**
 * ============================================================================
 *  K184 — HB API KİMLİĞİNİ HESABA BAĞLA (KİMLİĞE KİLİTLİ)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-hb-hesap-bagla.ts            → KURU
 *      npx tsx scripts/canli-hb-hesap-bagla.ts --uygula   → YAZAR
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bir bağın kurulması.
 *
 *  ⛔ `externalId`E DOKUNMAZ. O alan HB'de `7000222505` (raporlardaki satıcı
 *  numarası) ve dört içe aktarma + listeleme yazıcısı onu okuyor. Bu betik
 *  YALNIZ yeni `apiHesapKimligi` alanını doldurur.
 *
 *  ⚠ HEDEF TAHMİN EDİLMEZ, ÖLÇÜLÜR: HB kanalında beş hesap var ama yalnız
 *  BİRİNDE kanal SKU kaydı var (1098). Bağ o hesaba kurulur ve betik başka
 *  bir dağılım görürse DURUR — "en olası olanı seç" diye bir kural yok.
 * ============================================================================
 */

const UYGULA = process.argv.includes("--uygula");

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
  if (k.ortam.toUpperCase() !== "CANLI") {
    /** ⛔ TEST kimliğini canlı hesaba yazmak, ikisini kalıcı karıştırırdı. */
    console.log(`⛔ ORTAM ${k.ortam} — bu betik yalnız CANLI kimlikle koşar.`);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { izYaz } = await import("../src/lib/iz");

  console.log("\nK184 — HB API KİMLİĞİ BAĞLAMA  ·  " + (UYGULA ? "⚠ YAZIM" : "KURU"));
  console.log("=".repeat(74));

  const hesaplar = await prisma.channelAccount.findMany({
    where: { channel: { name: "Hepsiburada" } },
    select: {
      id: true,
      name: true,
      externalId: true,
      apiHesapKimligi: true,
      _count: { select: { channelSkus: true, sales: true } },
    },
  });

  console.log("\n① HB HESAPLARI");
  for (const h of hesaplar) {
    console.log(
      `   ${h.name} · externalId ${h.externalId ?? "BOŞ"} · ` +
        `apiHesapKimligi ${h.apiHesapKimligi ?? "BOŞ"} · ` +
        `kanalSku ${h._count.channelSkus} · satış ${h._count.sales}`,
    );
  }

  /**
   * ⛔ ÖLÇÜT: kanal SKU kaydı OLAN hesap. Ad ("AXCALI") ile seçseydim bu bir
   * DİZE eşleşmesi olurdu ve ad değiştiği gün sessizce yanlış hesabı bağlardı.
   */
  const adaylar = hesaplar.filter((h) => h._count.channelSkus > 0);
  console.log(`\n② ADAY (kanal SKU kaydı olan): ${adaylar.length}`);
  if (adaylar.length !== 1) {
    console.log("   ⛔ TAM OLARAK BİR ADAY BEKLENİYORDU — bağ KURULMAZ.");
    console.log("      Dağılım değişmiş; hedef elle belirlenmeli.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const hedef = adaylar[0];
  console.log(`   hedef: ${hedef.name}`);

  /** ⚠ ZATEN BAĞLIYSA İKİNCİ KEZ YAZILMAZ — ve bu bir hata değil. */
  if (hedef.apiHesapKimligi === k.merchantId) {
    console.log("\n✓ ZATEN BAĞLI — yapılacak iş yok.");
    await prisma.$disconnect();
    return;
  }
  if (hedef.apiHesapKimligi !== null) {
    /** ⛔ DOLU BİR ALAN SESSİZCE EZİLMEZ. */
    console.log("\n⛔ ALAN ZATEN DOLU ve farklı bir değer taşıyor — EZİLMEZ.");
    console.log("   Değişmesi gerekiyorsa gerekçesiyle ayrıca karar verilir.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  console.log("\n③ YAZILACAK");
  console.log(`   ${hedef.name}.apiHesapKimligi ← Mağaza ID (${k.merchantId.length} karakter)`);
  console.log(`   externalId DOKUNULMAZ: ${hedef.externalId ?? "BOŞ"}`);

  if (!UYGULA) {
    console.log("\n   " + "-".repeat(68));
    console.log("   KURU KOŞUM — hiçbir şey yazılmadı.");
    console.log("   Yazmak için sonuna --uygula ekleyin.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.channelAccount.update({
      where: { id: hedef.id },
      data: { apiHesapKimligi: k.merchantId },
    });
    await izYaz(
      {
        action: "KANAL_API_KIMLIGI_BAGLANDI",
        targetType: "ChannelAccount",
        targetId: hedef.id,
        /** ⚠ KİMLİĞİN KENDİSİ İZE YAZILMAZ — uzunluğu yeter; iz ekranda
         *  görünüyor ve kimlik bir sırdır. */
        detail: JSON.stringify({
          hesap: hedef.name,
          externalIdDokunulmadi: hedef.externalId,
          apiHesapKimligiUzunluk: k.merchantId.length,
        }),
      },
      tx,
    );
  });

  const sonra = await prisma.channelAccount.findUnique({
    where: { id: hedef.id },
    select: { externalId: true, apiHesapKimligi: true },
  });
  console.log("\n④ SONRA");
  console.log(`   externalId       ${sonra?.externalId ?? "BOŞ"}  (değişmedi)`);
  console.log(
    `   apiHesapKimligi  ${sonra?.apiHesapKimligi === k.merchantId ? "✓ bağlandı" : "⛔ yazılamadı"}`,
  );
  process.exitCode = sonra?.apiHesapKimligi === k.merchantId ? 0 : 1;
  await prisma.$disconnect();
}

void main();
