import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  KOD ÇARPIŞMASI ONARIMI — İKİZ KAYITLAR + BLOKE SİPARİŞ
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — ölçülmüş üç çifte ve tek bir siparişe
 *  KİLİTLİ. Genel araç değildir; genel araç istisnayı kurala çevirir.
 *
 *  ⛔ VARSAYILAN KURU KOŞUM. Yazmak için `--uygula` gerekir.
 *
 *  ── NE YAPAR ───────────────────────────────────────────────────────────
 *  ① Bloke siparişin (4936492065) kalemini İKİZ varyanttan GERÇEK varyanta
 *     çevirir. Sipariş ONAYSIZ — stok hareketi HENÜZ YAZILMADI, yani bu bir
 *     ledger düzeltmesi değil, onay öncesi bir hedef düzeltmesidir.
 *  ② Üç ikiz varyantı pasife alır (`isActive = false`).
 *
 *  ── NİYE BETİK, NİYE EKRAN DEĞİL (ölçüldü 21.09.2026) ──────────────────
 *  · Satış kaleminin ürününü değiştiren bir ekran YOK (`satislar/[id]`
 *    altında kalem KALDIRMA var, hedef değiştirme yok).
 *  · Varyant/ürün pasife alan bir düğme YOK — `isActive` alanı var,
 *    `/urunler` "pasif" rozetini ÇİZİYOR, ama o durumu üreten yazıcı yok.
 *  Alternatifler ölçülüp elendiği için betik meşru. _(Anayasa: "metadata
 *  düzeltmesi — dar istisna": alan para/miktar DEĞİL · alternatifler
 *  ölçülüp elenmiş · iz bırakılıyor.)_
 *
 *  ── GERİ ALMA ──────────────────────────────────────────────────────────
 *  ⛔ SAKLANAN LİSTEYE DEĞİL, YENİDEN HESAPLANABİLİR ÖLÇÜTE DAYANIR:
 *  ölçüt "aşağıdaki sabit kimliklerden biri" — bu liste KODUN İÇİNDE,
 *  veritabanı alanında değil, yani kırpılamaz/bozulamaz. `--geri` ile eski
 *  hâl yazılır.
 *
 *  ⚠ VE YEREL ANLIK GÖRÜNTÜ ZORUNLU: yazımdan önce dokunulacak alanlar
 *  dosyaya yazılır; geri alma sonrası defter onunla karşılaştırılabilir.
 *  _(Anayasa: "iz, yazımın kanıtı değil NİYETİDİR.")_
 * ============================================================================
 */

/** ÖLÇÜLDÜ 21.09.2026 — `npm run canli:kod-carpismasi`. */
const IKIZLER = [
  {
    ad: "Philips BHD500/00",
    ikiz: "cmtlkaypu00vjmcvk1x81c1vi",
    gercek: "cmu5r5hw4000104l760xtqd0i",
    kod: "HBCV00000R0H0K + 97393839282",
  },
  {
    ad: "TEFAL Comfort 3 lu Bicak Seti",
    ikiz: "c3d484e7-4e23-4b44-8429-f6b453b4e837",
    gercek: "cmtlpkh5m000404jx0slgbp21",
    kod: "221000567899",
  },
  {
    ad: "Fisher-Price Egitici Kopekcik",
    ikiz: "cmtlk8tk8001dmcvkrd2uwb9k",
    gercek: "4cc5a4c5-fac3-4d06-84b0-e7a58daeb7b2",
    kod: "887961643367",
  },
] as const;

const BLOKE_SIPARIS = "4936492065";

async function main() {
  const uygula = process.argv.includes("--uygula");
  const geri = process.argv.includes("--geri");

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nKOD ÇARPIŞMASI ONARIMI");
  console.log(
    `  kip  ${geri ? "GERİ ALMA" : uygula ? "YAZIYOR" : "KURU KOŞUM — hiçbir şey yazılmaz"}`,
  );
  console.log("=".repeat(70));

  /* ------------------------------------------------------------------ ① */
  console.log("\n① BLOKE SİPARİŞ — kalem hedefi");

  const satis = await prisma.sale.findFirst({
    where: { code: BLOKE_SIPARIS },
    select: {
      id: true,
      onaylandiAt: true,
      iptalTarihi: true,
      items: {
        select: {
          id: true,
          quantity: true,
          variantId: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
        },
      },
    },
  });

  if (!satis) {
    console.log(`  ⛔ ${BLOKE_SIPARIS} bulunamadı — onarım DURDU.`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /**
   * ⛔ ONAYLI SİPARİŞE DOKUNULMAZ. Onaylıysa stok hareketi YAZILMIŞ demektir
   * ve hedefi değiştirmek hareketi sahipsiz bırakırdı — anayasadaki "satışı
   * silmek stok hareketini sahipsiz bırakır" vakasının aynısı.
   */
  if (satis.onaylandiAt !== null) {
    console.log("  ⛔ SİPARİŞ ONAYLANMIŞ — hedef değiştirilemez. Onarım DURDU.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const philips = IKIZLER[0];
  const ileriKalemler = satis.items.filter((k) => k.variantId === philips.ikiz);
  const geriKalemler = satis.items.filter((k) => k.variantId === philips.gercek);

  const kalemler = geri ? geriKalemler : ileriKalemler;
  const yeniHedef = geri ? philips.ikiz : philips.gercek;

  if (kalemler.length === 0) {
    console.log(
      "  ○ çevrilecek kalem yok — bu adım ZATEN YAPILMIŞ (tekrar koşum zararsız).",
    );
  }
  for (const k of kalemler) {
    console.log(`  kalem ${k.id} adet=${k.quantity}`);
    console.log(`     ${k.variantId} "${k.variant.product.name.slice(0, 45)}"`);
    console.log(`  -> ${yeniHedef}`);
  }

  /* ------------------------------------------------------------------ ② */
  console.log("\n② İKİZ KAYITLAR — aktiflik");

  const durumlar: { ad: string; id: string; aktif: boolean; stok: number }[] = [];
  for (const c of IKIZLER) {
    const v = await prisma.productVariant.findUnique({
      where: { id: c.ikiz },
      select: { isActive: true, sku: true },
    });
    if (!v) {
      console.log(`  ⛔ ${c.ad}: ikiz varyant BULUNAMADI (${c.ikiz}) — onarım DURDU.`);
      process.exitCode = 1;
      await prisma.$disconnect();
      return;
    }
    const g = await prisma.stockMovement.aggregate({
      where: { variantId: c.ikiz },
      _sum: { quantityDelta: true },
    });
    const stok = Number(g._sum.quantityDelta ?? 0);
    durumlar.push({ ad: c.ad, id: c.ikiz, aktif: v.isActive, stok });

    /**
     * ⛔ STOĞU OLAN İKİZ PASİFE ALINMAZ. Ölçüm üçünü de `0` gösterdi; ama
     * ölçüm ile yazım arasında mal kabul yapılmış olabilir. Stoklu bir kaydı
     * aramadan çıkarmak, var olan malı görünmez yapardı.
     */
    if (!geri && stok !== 0) {
      console.log(`  ⛔ ${c.ad}: ikizin stoğu ${stok} — SIFIR DEĞİL. Onarım DURDU.`);
      process.exitCode = 1;
      await prisma.$disconnect();
      return;
    }
    console.log(`  ${c.ad}`);
    console.log(`     ${c.ikiz} sku=${v.sku} aktif=${v.isActive} stok=${stok} · kod ${c.kod}`);
    console.log(`  -> aktif=${geri ? "true" : "false"}`);
  }

  if (!uygula && !geri) {
    console.log("\n" + "=".repeat(70));
    console.log("KURU KOŞUM BİTTİ — hiçbir şey yazılmadı.");
    console.log("Yazmak için:  npm run canli:carpisma-onar -- --uygula");
    await prisma.$disconnect();
    return;
  }

  /* --------------------------------------------------- YEREL GÖRÜNTÜ -- */
  const damga = new Date().toISOString().replace(/[:.]/g, "-");
  const goruntuYolu = `veri/ozel/carpisma-onarim-${damga}.json`;
  writeFileSync(
    goruntuYolu,
    JSON.stringify(
      {
        alindi: new Date().toISOString(),
        kip: geri ? "GERI" : "UYGULA",
        siparis: { kod: BLOKE_SIPARIS, id: satis.id, kalemler: satis.items },
        ikizler: durumlar,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nYEREL ANLIK GÖRÜNTÜ: ${goruntuYolu}`);

  /* ----------------------------------------------------------- YAZIM -- */
  /**
   * ⚠ SATIR SATIR, TEKRAR KOŞULABİLİR. Dört yazım + bir iz = beş
   * gidiş-dönüş; tamamı-ya-hiçbiri işleminin zaman aşımı riski yok. İkinci
   * koşum zararsız: zaten çevrilmiş kalem listeye girmez, zaten pasif olan
   * varyant aynı değeri alır.
   */
  let yazilan = 0;
  for (const k of kalemler) {
    await prisma.saleItem.update({
      where: { id: k.id },
      data: { variantId: yeniHedef },
    });
    yazilan++;
  }
  for (const c of IKIZLER) {
    await prisma.productVariant.update({
      where: { id: c.ikiz },
      data: { isActive: geri },
    });
    yazilan++;
  }

  await prisma.auditLog.create({
    data: {
      action: geri ? "KOD_CARPISMASI_GERI" : "KOD_CARPISMASI_ONARIM",
      targetType: "ProductVariant",
      targetId: IKIZLER.map((c) => c.ikiz).join(","),
      detail: JSON.stringify({
        gerekce:
          "Bir kod iki aktif varyanta cozuluyordu; varyantKodlaBul findFirst ile sessizce birini seciyordu",
        siparis: BLOKE_SIPARIS,
        kalemler: kalemler.map((k) => ({ id: k.id, eski: k.variantId, yeni: yeniHedef })),
        ikizler: durumlar.map((d) => ({ id: d.id, eskiAktif: d.aktif, yeniAktif: geri })),
        goruntu: goruntuYolu,
      }),
    },
  });

  console.log(`\n${yazilan} kayıt yazıldı · iz bırakıldı.`);
  console.log("=".repeat(70));
  await prisma.$disconnect();
}

main();
