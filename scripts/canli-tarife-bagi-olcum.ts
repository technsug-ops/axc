import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  TARİFE BAĞI — KAPSAM VE BAĞSIZ KALEM ÖLÇÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — hiçbir şey yazmaz, tekrar koşulabilir.
 *
 *      npm run canli:tarife-bagi
 *
 *  ⛔ NİYE DOĞDU (21.09.2026). Panoda _"N11'de 46 teklif ürününün 13'ü
 *  kataloğa bağlanamadı"_ diye bir kalem duruyordu ve sebebi _"o ürünlerin
 *  N11 kodu bizde yok"_ diye YAZILMIŞTI. Ölçüm bunu çürüttü: bağsız kodların
 *  bir kısmı sistemde ZATEN VARDI — başka kanalın kodu olarak.
 *
 *  ── ÜÇ SORU, ÜÇÜ AYRI SAYILIR ──────────────────────────────────────────
 *  ① Kanal başına kaç kanal SKU'su var ve kaçının listeleme durumu ÖLÇÜLMÜŞ
 *  ② Yüklü tarife pencereleri — hangi kanal, hangi aralık, kaç kalem
 *  ③ Bağsız kalemler — ve bugünkü ölçütle kaçı BULUNABİLİR
 *
 *  ⚠ GEÇMİŞ PENCEREDEKİ BAĞSIZ KALEM KUSUR DEĞİLDİR. Kalem yükleme ANINDA
 *  bağlanır; eşleştirme sonradan kurulduysa eski pencere bağsız kalır ve
 *  kalmalıdır — o bir SNAPSHOT'tır. Ölçüldü: `TYB03WJ27YHQ5LZU10` 09-08
 *  penceresinde bağsız, 09-15'te bağlı; kanal SKU'su 09-10'da kurulmuş.
 *  Bu yüzden çıktı pencereyi ve yükleme tarihini birlikte yazar — yoksa
 *  doğru çalışan bir mekanizma "kusurlu" diye okunur.
 *  _(Anayasa: "geçmişi düzeltmek ile mekanizmayı kurmak ayrı kararlardır".)_
 * ============================================================================
 */

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nTARİFE BAĞI — KAPSAM VE BAĞSIZ KALEM");
  console.log("  kip  SALT OKUMA — hiçbir şey yazılmaz");
  console.log("=".repeat(72));

  /* ---------------------------------------------------------------- ① -- */
  console.log("\n① KANAL SKU KAPSAMI — kaçı ÖLÇÜLMÜŞ");
  const hesaplar = await prisma.channelAccount.findMany({
    where: { isActive: true, satisIcin: true },
    select: { id: true, name: true, channel: { select: { name: true } } },
    orderBy: [{ channel: { name: "asc" } }, { name: "asc" }],
  });
  for (const h of hesaplar) {
    const toplam = await prisma.channelSku.count({
      where: { channelAccountId: h.id },
    });
    if (toplam === 0) continue;
    /**
     * ⚠ "ÖLÇÜLMEMİŞ" = `BILINMIYOR`. Alan nullable DEĞİL, varsayılanı
     * `BILINMIYOR`; yani "hiç bakılmadı" ile "baktım, bilinmiyor" ayırt
     * EDİLEMEZ. Bu bir sınır ve çıktıda yazar — sayıyı "hiç ölçülmedi"
     * diye okumak, ölçmediğimiz bir şeyi iddia etmek olurdu.
     */
    const olculmus = await prisma.channelSku.count({
      where: { channelAccountId: h.id, listelemeDurumu: { not: "BILINMIYOR" } },
    });
    const yuzde = ((olculmus / toplam) * 100).toFixed(1);
    console.log(
      `  ${(h.channel.name + " / " + h.name).padEnd(26)} ${String(toplam).padStart(5)} kod · ölçülmüş ${String(olculmus).padStart(5)} (%${yuzde})`,
    );
  }
  console.log(
    "  ⚠ 'ölçülmüş' = listeleme durumu BILINMIYOR'dan farklı; alan nullable değil,",
  );
  console.log("    yani 'hiç bakılmadı' ile 'bakıldı, bilinmiyor' ayırt edilemez.");

  /* ---------------------------------------------------------------- ② -- */
  console.log("\n② YÜKLÜ TARİFE PENCERELERİ");
  const tarifeler = await prisma.komisyonTarifesi.findMany({
    select: {
      id: true,
      pencereBaslangic: true,
      pencereBitis: true,
      yuklendiAt: true,
      _count: { select: { kalemler: true } },
      channelAccount: { select: { channel: { select: { name: true } } } },
    },
    orderBy: { pencereBaslangic: "desc" },
  });
  const bugun = new Date();
  for (const t of tarifeler) {
    const bagsiz = await prisma.komisyonTarifeKalemi.count({
      where: { tarifeId: t.id, variantId: null },
    });
    const yururlukte =
      t.pencereBaslangic <= bugun && t.pencereBitis >= bugun ? " ← YÜRÜRLÜKTE" : "";
    console.log(
      `  ${(t.channelAccount?.channel.name ?? "—").padEnd(14)}` +
        ` ${t.pencereBaslangic.toISOString().slice(0, 10)} → ${t.pencereBitis.toISOString().slice(0, 10)}` +
        ` · ${String(t._count.kalemler).padStart(4)} kalem · bağsız ${String(bagsiz).padStart(3)}` +
        ` · yüklendi ${t.yuklendiAt.toISOString().slice(0, 10)}${yururlukte}`,
    );
  }

  /* ---------------------------------------------------------------- ③ -- */
  console.log("\n③ BAĞSIZ KODLAR — bugünkü ölçütle bulunabilir mi");

  /** Yükleyicinin BUGÜNKÜ kapsamı: dört rol, bütün kanallar. */
  const varyantlar = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: { id: true, barcode: true, sku: true, companySku: true },
  });
  const kanalKodlari = await prisma.channelSku.findMany({
    where: { isActive: true, variant: { isActive: true } },
    select: { channelSku: true, variantId: true },
  });

  const cakisan = new Set<string>();
  const tekil = (girdiler: { kod: string | null; variantId: string }[]) => {
    const harita = new Map<string, string>();
    for (const g of girdiler) {
      const kod = (g.kod ?? "").trim();
      if (kod === "") continue;
      const mevcut = harita.get(kod);
      if (mevcut !== undefined && mevcut !== g.variantId) {
        cakisan.add(kod);
        continue;
      }
      harita.set(kod, g.variantId);
    }
    for (const kod of cakisan) harita.delete(kod);
    return harita;
  };
  const kanalDizini = tekil(
    kanalKodlari.map((k) => ({ kod: k.channelSku, variantId: k.variantId })),
  );
  const kimlikDizini = tekil([
    ...varyantlar.map((v) => ({ kod: v.barcode, variantId: v.id })),
    ...varyantlar.map((v) => ({ kod: v.sku, variantId: v.id })),
    ...varyantlar.map((v) => ({ kod: v.companySku, variantId: v.id })),
  ]);
  console.log(
    `  dizin: kanal ${kanalDizini.size} · kimlik ${kimlikDizini.size} · ÇAKIŞAN (elenen) ${cakisan.size}`,
  );

  const bagsizKalemler = await prisma.komisyonTarifeKalemi.findMany({
    where: { variantId: null },
    select: {
      barkod: true,
      urunAdi: true,
      tarife: {
        select: {
          pencereBaslangic: true,
          pencereBitis: true,
          channelAccount: { select: { channel: { select: { name: true } } } },
        },
      },
    },
  });

  const kodlar = new Map<
    string,
    { ad: string | null; kanal: string; pencere: string; yururlukte: boolean }
  >();
  for (const k of bagsizKalemler) {
    const kod = k.barkod.trim();
    if (kodlar.has(kod)) continue;
    kodlar.set(kod, {
      ad: k.urunAdi,
      kanal: k.tarife.channelAccount?.channel.name ?? "—",
      pencere: k.tarife.pencereBaslangic.toISOString().slice(0, 10),
      yururlukte:
        k.tarife.pencereBaslangic <= bugun && k.tarife.pencereBitis >= bugun,
    });
  }

  let bulunur = 0;
  let yururluktekiBulunur = 0;
  for (const [kod, v] of kodlar) {
    const hedef = kanalDizini.get(kod) ?? kimlikDizini.get(kod) ?? null;
    if (hedef) {
      bulunur++;
      if (v.yururlukte) yururluktekiBulunur++;
    }
    console.log(
      `  ${(hedef ? "BULUNUR   " : "bulunamaz ").padEnd(11)}${kod.padEnd(20)}` +
        ` ${(v.kanal + " " + v.pencere).padEnd(24)}${v.yururlukte ? "YÜRÜRLÜKTE " : "geçmiş     "}` +
        `${(v.ad ?? "").slice(0, 30)}`,
    );
  }

  console.log("\n" + "=".repeat(72));
  console.log(
    `  bağsız kod ${kodlar.size} · bugünkü ölçütle bulunur ${bulunur}` +
      ` (bunun ${yururluktekiBulunur}'i YÜRÜRLÜKTEKİ pencerede)`,
  );
  /**
   * ⛔ GEÇMİŞ PENCERE YENİDEN BAĞLANMAZ. "Bulunur" demek "düzeltilecek"
   * demek DEĞİLDİR: geçmiş pencere yükleme anının fotoğrafıdır. Yalnız
   * YÜRÜRLÜKTEKİ penceredeki sayı bir sonraki yüklemede kendiliğinden
   * düzelir.
   */
  console.log(
    "  ⚠ geçmiş penceredeki 'bulunur' kalemler DÜZELTİLMEZ — snapshot'tır.",
  );
  console.log(
    "    Yalnız yürürlükteki pencere bir sonraki yüklemede kendiliğinden düzelir.",
  );

  await prisma.$disconnect();
}

main();
