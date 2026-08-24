/**
 * ============================================================================
 *  K36b KURU KOŞUM — DEĞİŞİM KARGOSU SATIŞA TAŞINSA NE OLUR? (salt okuma)
 * ----------------------------------------------------------------------------
 *  Pano şartı: _"Başlamadan önce kuru koşum raporu: hangi satışların NET'i ne
 *  kadar değişiyor, önce/sonra tablosu, kaç kâr damgası bayatlıyor. Raporu
 *  görmeden onay yok."_
 *
 *  ⚠ HİÇBİR ŞEY YAZMAZ. Ne SaleFee, ne ReturnFee, ne damga.
 *
 *  ⚠ SORU NET: `YENIDEN_GONDERIM_KARGO` bugün İADENİN net'inde. K36a malın
 *  maliyetini satışa taşıdı (`EXCHANGE_OUT` + `saleItemId`); kargo taşınmadı.
 *  Bu betik yalnız BÜYÜKLÜĞÜ ölçer — kararı değil.
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok:", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log(`\nK36b KURU KOŞUM — hedef ${y.veri.adres.hostname}`);
  console.log(`kip: RAPOR (hiçbir şey yazılmaz)\n`);

  /**
   * ⚠ İKİ AYRI KÜME AYRI SAYILIR — "kaç iadede kargo var" ile "kaç DEĞİŞİMDE
   * kargo var" farklı sorular. Para iadesinde yeniden gönderim kargosu
   * olmamalı; varsa o başlı başına bir bulgudur.
   */
  const iadeler = await prisma.return.findMany({
    where: { reshipCargoAmount: { not: null } },
    select: {
      id: true,
      returnType: true,
      net1Amount: true,
      net2Amount: true,
      reshipCargoAmount: true,
      returnCargoAmount: true,
      createdAt: true,
      sale: {
        select: {
          id: true,
          code: true,
          soldAt: true,
          channelAccount: { select: { channel: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const kargolu = iadeler.filter(
    (i) => Number(i.reshipCargoAmount?.toString() ?? 0) > 0,
  );

  console.log(`① KAPSAM`);
  console.log(`   reshipCargoAmount DOLU iade      : ${iadeler.length}`);
  console.log(`   ...tutarı SIFIRDAN BÜYÜK olan    : ${kargolu.length}`);
  console.log(`   ...tutarı 0 (yazılmış ama boş)   : ${iadeler.length - kargolu.length}`);

  if (kargolu.length === 0) {
    console.log(`\n   ⚠ TAŞINACAK KARGO YOK. Bugün hiçbir satışın NET'i değişmez.`);
    console.log(`   Bu, kuralın gereksiz olduğu anlamına GELMEZ — ilk değişim`);
    console.log(`   kargosu girildiğinde yanlış cebe yazılır.\n`);
  }

  /**
   * ⚠ DEĞİŞİM Mİ, PARA İADESİ Mİ? Kargo yalnız DEĞİŞİMDE satışa taşınır.
   * Para iadesinde satış öldü; kargosu iadenin kendi zararıdır.
   */
  console.log(`\n② TİPE GÖRE`);
  const tipSayim = new Map<string, { adet: number; kargo: number }>();
  for (const i of kargolu) {
    const t = i.returnType;
    const s = tipSayim.get(t) ?? { adet: 0, kargo: 0 };
    s.adet += 1;
    s.kargo += Number(i.reshipCargoAmount!.toString());
    tipSayim.set(t, s);
  }
  if (tipSayim.size === 0) console.log(`   (kayıt yok)`);
  for (const [t, s] of tipSayim) {
    console.log(`   ${t.padEnd(14)} ${s.adet} iade · toplam kargo ₺${s.kargo.toFixed(2)}`);
  }

  /**
   * ③ ÖNCE/SONRA — satış başına.
   *
   * ⚠ KDV DE TAŞINIR. `YENIDEN_GONDERIM_KARGO` iadede NET-1'e giriyor VE
   * kargo KDV'si indirim olarak NET-2'ye ekleniyor (`kargoKdvIndirimi`).
   * Yalnız tutarı taşıyıp KDV'yi iadede bırakmak, aynı kargoyu iki farklı
   * yerden hesaplamak olurdu.
   */
  console.log(`\n③ SATIŞ BAŞINA ÖNCE/SONRA (kargo iadeden çıkıp satışa girerse)`);
  if (kargolu.length === 0) {
    console.log(`   (etkilenen satış yok)`);
  } else {
    console.log(
      `   ${"SİPARİŞ".padEnd(14)} ${"KANAL".padEnd(13)} ${"KARGO".padStart(10)} ${"İADE NET-2".padStart(12)} ${"→ YENİ".padStart(12)}`,
    );
    for (const i of kargolu) {
      const kargo = Number(i.reshipCargoAmount!.toString());
      const iadeNet2 = Number(i.net2Amount?.toString() ?? 0);
      /** Kargo iadeden ÇIKARSA iadenin NET'i o kadar YUKARI gider. */
      const yeniIadeNet2 = iadeNet2 + kargo;
      console.log(
        `   ${(i.sale?.code ?? "—").padEnd(14)} ${(i.sale?.channelAccount?.channel.name ?? "?").padEnd(13)} ${kargo.toFixed(2).padStart(10)} ${iadeNet2.toFixed(2).padStart(12)} ${yeniIadeNet2.toFixed(2).padStart(12)}`,
      );
    }
  }

  /**
   * ④ KAÇ KÂR DAMGASI BAYATLAR? Kural değişince etkilenen SATIŞLARIN
   * NET damgası yeniden hesaplanmalı; sayı bunu söyler.
   */
  const etkilenenSatisIdleri = [
    ...new Set(kargolu.map((i) => i.sale?.id).filter(Boolean) as string[]),
  ];
  console.log(`\n④ BAYATLAYACAK KÂR DAMGASI: ${etkilenenSatisIdleri.length} satış`);

  /**
   * ⑤ EXCHANGE_OUT HAREKETLERİ — K36a'nın taşıdığı mal tarafı. Kargo
   * taşınacaksa aynı kümede olmalı; ayrışıyorsa sebebi yazılır.
   */
  const degisimHareketleri = await prisma.stockMovement.findMany({
    where: { type: "EXCHANGE_OUT" },
    select: {
      id: true,
      saleItemId: true,
      returnItemId: true,
      quantityDelta: true,
      unitCostAmount: true,
      saleItem: { select: { sale: { select: { code: true } } } },
    },
  });
  console.log(`\n⑤ EXCHANGE_OUT HAREKETİ: ${degisimHareketleri.length}`);
  for (const h of degisimHareketleri) {
    console.log(
      `   ${(h.saleItem?.sale.code ?? "(satışa bağsız)").padEnd(14)} ${h.quantityDelta} × ₺${h.unitCostAmount?.toString() ?? "?"} · saleItemId ${h.saleItemId ? "VAR" : "YOK"} · returnItemId ${h.returnItemId ? "VAR" : "YOK"}`,
    );
  }
  const malli = new Set(
    degisimHareketleri.map((h) => h.saleItem?.sale.code).filter(Boolean),
  );
  const kargoli = new Set(kargolu.map((i) => i.sale?.code).filter(Boolean));
  const malVarKargoYok = [...malli].filter((k) => !kargoli.has(k!));
  const kargoVarMalYok = [...kargoli].filter((k) => !malli.has(k!));
  console.log(`\n   mal taşındı ama kargosu yok : ${malVarKargoYok.length ? malVarKargoYok.join(", ") : "—"}`);
  console.log(`   kargo var ama mal taşınmamış: ${kargoVarMalYok.length ? kargoVarMalYok.join(", ") : "—"}`);

  console.log(`\nRAPOR KİPİ — hiçbir şey yazılmadı.\n`);
}
main();
