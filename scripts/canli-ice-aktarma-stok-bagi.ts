/** BETIK SINIFI: TEK_SEFERLIK — K55, 28.08 tek vakalik bag onarimi. `--geri=<parti>` ile geri alinir, tekrar kosulmaz. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İÇE AKTARMA — STOK + MALİYET BAĞI  (karar: BAĞLANABİLEN BAĞLANIR)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:stok-bagi                 → RAPOR, hiçbir şey yazmaz
 *      npm run canli:stok-bagi -- --uygula     → yazar
 *      npm run canli:stok-bagi -- --geri=<parti> → TERS KAYITLA geri alır
 *
 *  ═══ KARAR (Halil, 26.08.2026) ═══
 *  · FIFO'da parti YETERLİ olan varyantların kalemleri bağlanır.
 *  · Parti yetersiz VE hiç hareket olmayan varyantlar **ATLANIR** —
 *    hareket YAZILMAZ. Negatif stok YOK, kaynaksız çıkış kovası YOK.
 *
 *  ⚠ GEREKÇE ÖLÇÜMDEN GELDİ, TERCİHTEN DEĞİL: kalemlerin **%81'i**
 *  (336/416) maliyet kaynağı bulamıyor. Negatif stok K54 hayaletini
 *  336 kez üretirdi; toplu kaynaksız çıkış 336 kalemi sonsuza kadar
 *  bekletir ve ASIL EKSİĞİ — alım defteri — gizlerdi.
 *
 *  ⚠ İKİNCİ MOTOR AÇILMADI: `fifoDagit` ve hareket şekli satış yazma
 *  yolunun (`lib/satis.ts`) birebir aynısı. Ayrı bir tüketim mantığı
 *  yazsaydık iki yol yarın ayrışırdı.
 * ============================================================================
 */

const UYGULA = process.argv.includes("--uygula");
const geriArg = process.argv.find((a) => a.startsWith("--geri="));
const GERI = geriArg?.split("=")[1] ?? null;

const p2 = (n: number) => n.toFixed(2).padStart(13);

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  /**
   * ⚠ ADRES BAŞTA SABİTLENİR — kâr motoru uygulamanın `prisma` TEKİLİNİ
   * kullanır ve adresi ortam değişkeninden okur. Kendi istemcimizle
   * bağlanıp motoru öylece çağırsaydık CANLIDAN OKUYUP YERELE YAZARDI.
   */
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);

  const { prisma } = await import("../src/lib/prisma");
  const { acikPartilerToplu, fifoDagit } = await import("../src/lib/stok");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");

  console.log("\n" + "=".repeat(76));
  console.log(
    `İÇE AKTARMA STOK BAĞI — ${GERI ? `⚠ GERİ ALMA (${GERI})` : UYGULA ? "⚠ YAZIM" : "RAPOR (yazmaz)"}`,
  );
  console.log("=".repeat(76));

  // ═══ GERİ ALMA ══════════════════════════════════════════════════════════
  if (GERI) {
    /**
     * ⚠ GERİ ALMA TERS KAYITTIR, İŞARETLEME DEĞİL — Halil kararı.
     * Stok hareketi bir LEDGER satırıdır; silmek ya da işaretlemek
     * defterin dokunulmazlığını bozar. Ters işaretli bir `ADJUSTMENT`
     * hem stoğu geri verir hem izi bırakır.
     */
    /**
     * ═══ GERİ ALINACAK KÜME TÜRETİLİYOR — YENİ ALAN AÇILMADI ═══════════
     *
     * ⚠ İLK YAZIMDA `note` alanına parti kimliği yazıyordum. Merdiven
     * ölçülünce gereksiz olduğu çıktı: bu hareketleri ayırt eden şey
     * zaten VAR — bağlı oldukları satışın `importBatch`i. Uygulamadan
     * geçen normal satışlarda o alan `null`.
     *
     * Yani küme TÜRETİLEBİLİR (merdiven 3. basamak); serbest metne de
     * (2.) yeni sütuna da (4.) gerek yok. Halil'in kendi ifadesi de
     * buydu: _"importBatch başına ters kayıt"_.
     */
    const hareketler = await prisma.stockMovement.findMany({
      where: {
        type: "SALE_OUT",
        saleItem: { sale: { importBatch: GERI } },
      },
      select: {
        id: true,
        variantId: true,
        quantityDelta: true,
        occurredAt: true,
        locationId: true,
        unitCostAmount: true,
        unitCostCurrency: true,
        saleItemId: true,
        sourceMovementId: true,
      },
    });
    console.log(`\n  importBatch  ${GERI}`);
    console.log(`  hareket ${hareketler.length}`);
    if (hareketler.length === 0) {
      console.log(`\n  ⛔ BU PARTİDE HAREKET YOK — geri alınacak bir şey yok.\n`);
      await prisma.$disconnect();
      return;
    }
    if (!UYGULA) {
      console.log(`\n  RAPOR — yazmak için: -- --geri=${GERI} --uygula\n`);
      await prisma.$disconnect();
      return;
    }
    let ters = 0;
    for (const h of hareketler) {
      await prisma.stockMovement.create({
        data: {
          variantId: h.variantId,
          type: "ADJUSTMENT",
          /** ⚠ TERS İŞARET — çıkış negatifti, düzeltme pozitif döner. */
          quantityDelta: -h.quantityDelta,
          occurredAt: h.occurredAt,
          locationId: h.locationId,
          unitCostAmount: h.unitCostAmount,
          unitCostCurrency: h.unitCostCurrency,
          /**
           * ⚠ TERS KAYIT ÖZGÜN ÇIKIŞA BAĞLANIR — ayrı bir kimlik alanıyla
           * değil. `sourceMovementId` hangi partinin geri verildiğini
           * defterden okunur kılar.
           */
          sourceMovementId: h.sourceMovementId,
          note: `içe aktarma stok bağı geri alındı — ${GERI}`,
        },
      });
      ters++;
    }
    await prisma.auditLog.create({
      data: {
        action: "ICE_AKTARMA_STOK_BAGI_GERI",
        targetType: "StockMovement",
        detail: JSON.stringify({ importBatch: GERI, hareket: hareketler.length, yazilan: ters }),
      },
    });
    console.log(`\n  ✓ ${ters} ters kayıt yazıldı (importBatch ${GERI})`);
    console.log(`  ⚠ Özgün hareketler SİLİNMEDİ; defter iki satırı da taşır.\n`);
    await prisma.$disconnect();
    return;
  }

  // ═══ KAPSAM ═════════════════════════════════════════════════════════════
  /**
   * ⚠ İPTALLİ SATIŞ BAĞLANMAZ. İptal edilmiş satış mal çıkarmadı —
   * ona `SALE_OUT` yazmak stoğu haksız yere düşürürdü.
   */
  const kalemler = await prisma.saleItem.findMany({
    where: {
      sale: { importBatch: { not: null }, iptalTarihi: null },
      stockMovements: { none: {} },
    },
    select: {
      id: true,
      quantity: true,
      variantId: true,
      sale: { select: { id: true, code: true, soldAt: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
    orderBy: { sale: { soldAt: "asc" } },
  });

  console.log(`\n① KAPSAM`);
  console.log(`   bağsız kalem (iptalsiz)   ${kalemler.length}`);
  const varyantIds = [...new Set(kalemler.map((k) => k.variantId))];
  console.log(`   farklı varyant            ${varyantIds.length}`);
  console.log(`   toplam adet               ${kalemler.reduce((t, k) => t + k.quantity, 0)}`);

  /**
   * SINIR YOK: `sinir` BURADA BİLEREK VERİLMİYOR — kullanıcı kararı
   * 28.08.2026.
   *
   * ⚠ VE BU, `canli-satis-ice-aktar.ts`İN TERSİ YÖNDE — ÇELİŞKİ DEĞİL,
   * BAŞKA SORU. Orada YENİ satış yazılıyor: 2025 tarihli bir satışın
   * bugünkü rafta duran malı yemesi, sayımla sayılmış malı tüketilmiş
   * gösterirdi. Burada satış ZATEN VAR ve maliyetsiz; bugün girilen alım
   * o eksik kaydın yerine geçiyor. _(Anayasa: "aynı veri, farklı soruya
   * farklı pencereden bakar" — ve hangi ekranın hangi soruyu sorduğu
   * KODDA yazılı olmalıdır.)_
   *
   * `sinir` verilseydi yalnız satış tarihinden ÖNCEKİ partiler aday olurdu
   * ve bu koşum **0 kalem** bağlardı (ölçüldü: bağlanabilen 12 kalemin
   * 12'sinde de parti satıştan SONRA damgalı). Yani kullanıcının bugün
   * alım girme işi HİÇBİR ŞEY kazandırmazdı: girdiği her alım, girmeden
   * önceki satışlara bağlanamazdı.
   *
   * ⚠ GEREKÇE: o malın GERÇEK alımı hiç kaydedilmedi; bugün girilen alım
   * o eksik kaydın yerine geçiyor. Maliyet gerçek (aynı ürün, gerçek
   * fatura), yalnız TARİHİ GEÇ. Alternatif "hiç maliyet" — daha doğru
   * değil, daha az bilgi.
   *
   * ⛔ VE İZSİZ KALMIYOR: geriye dönük kurulan her bağ `AuditLog`a
   * gecikme günüyle yazılıyor (aşağıda `geriyeDonuk`).
   *
   * ⚠ K53 (TARİHLİ ENVANTER) İÇİN ZORUNLUDUR VE ORADA VERİLİYOR
   * (`lib/envanter-veri.ts`). Orada soru "o TARİHTE elimde ne vardı" —
   * sonradan girilen parti o günün stoğuna karışamaz. **İki kullanımı
   * karıştırmak, iki farklı soruya tek cevap vermek olur.**
   */
  const partiler = await acikPartilerToplu(prisma, varyantIds);

  // ═══ PLANLAMA — FIFO ════════════════════════════════════════════════════
  /**
   * ⚠ KALEMLER TARİH SIRASINDA İŞLENİR ve tüketilen parti bir sonrakine
   * TAŞINIR. Her kalem için partileri sıfırdan okusaydık aynı partiyi
   * birden çok kaleme dağıtır, stoğu iki kez harcamış olurduk.
   */
  const kalanPartiler = new Map(varyantIds.map((v) => [v, partiler.get(v) ?? []]));
  type Plan = { kalem: (typeof kalemler)[number]; dagitim: { hareketId: string; adet: number; birimMaliyet: unknown; birimMaliyetParaBirimi: unknown; locationId: string | null }[] };
  const planlar: Plan[] = [];
  const atlananlar: { kalem: (typeof kalemler)[number]; mevcut: number }[] = [];

  for (const k of kalemler) {
    const mevcutPartiler = kalanPartiler.get(k.variantId) ?? [];
    const sonuc = fifoDagit(mevcutPartiler, k.quantity);
    if (!sonuc.yeterliMi) {
      atlananlar.push({ kalem: k, mevcut: sonuc.mevcut });
      continue;
    }
    kalanPartiler.set(k.variantId, sonuc.kalanPartiler);
    planlar.push({
      kalem: k,
      dagitim: sonuc.dagitim.map((d) => ({
        hareketId: d.parti.hareketId,
        adet: d.adet,
        birimMaliyet: d.parti.birimMaliyet,
        birimMaliyetParaBirimi: d.parti.birimMaliyetParaBirimi,
        locationId: d.parti.locationId,
      })),
    });
  }

  console.log(`\n② PLAN`);
  console.log(`   BAĞLANACAK kalem          ${planlar.length}`);
  console.log(`   ⛔ ATLANAN kalem           ${atlananlar.length}`);
  console.log(`   bağlanacak adet           ${planlar.reduce((t, p) => t + p.kalem.quantity, 0)}`);
  console.log(`   atlanan adet              ${atlananlar.reduce((t, a) => t + a.kalem.quantity, 0)}`);
  const atlananVaryant = new Set(atlananlar.map((a) => a.kalem.variantId));
  console.log(`   atlanan varyant           ${atlananVaryant.size}`);

  /**
   * ⚠ ATLANAN KALEM SESSİZ GEÇMEZ. "Bağlanabilen bağlanır" kararı, geri
   * kalanı GÖRÜNMEZ yapmak değildir — atlananların sebebi ve büyüklüğü
   * ekranda yazar, yoksa iş yarım kaldığı hâlde tamam sanılır.
   */
  if (atlananlar.length > 0) {
    console.log(`\n③ ATLANANLAR — SEBEP: FIFO'da karşılık yok`);
    const varyantBazli = new Map<string, { sku: string; ad: string; adet: number; kalem: number; mevcut: number }>();
    for (const a of atlananlar) {
      const m = varyantBazli.get(a.kalem.variantId) ?? {
        sku: a.kalem.variant.sku,
        ad: a.kalem.variant.product.name ?? "—",
        adet: 0,
        kalem: 0,
        mevcut: a.mevcut,
      };
      m.adet += a.kalem.quantity;
      m.kalem++;
      varyantBazli.set(a.kalem.variantId, m);
    }
    console.log(`   SKU               KALEM  ADET  AÇIK PARTİ  ÜRÜN`);
    for (const [, m] of [...varyantBazli].sort((a, b) => b[1].adet - a[1].adet).slice(0, 20)) {
      console.log(`   ${m.sku.padEnd(18)} ${String(m.kalem).padStart(4)} ${String(m.adet).padStart(5)} ${String(m.mevcut).padStart(11)}  ${m.ad.slice(0, 40)}`);
    }
    if (varyantBazli.size > 20) console.log(`   … ve ${varyantBazli.size - 20} varyant daha`);
    /**
     * ⛔ MESAJ DÜZELTİLDİ 28.08.2026 — ESKİ HÂLİ VE NİYE:
     *
     *     "BU BİR HATA DEĞİL, EKSİK ALIM DEFTERİ. O ürünlerin alımı
     *      sisteme hiç girilmemiş."
     *
     * Kullanıcı `axcali1869` ile çürüttü: alım GİRİLMİŞ (ALM-HB-260815-09,
     * 4 adet, teslim alınmış) ama **10 adet satılmış**. Alım yok değil,
     * YETMİYOR. Ölçüldü: atlananların **200 varyantı** bu sınıfta
     * (1060 kalem · ₺2.758.690) — mesaj o kümeye YANLIŞ İŞ tarif
     * ediyordu. "Alımı gir" ile "eksik adedi gir" farklı işlerdir.
     * _(Anayasa: "metin, sahip olmadığı anlamı iddia etmez".)_
     */
    const alimGirisi = new Map(
      (
        await prisma.stockMovement.groupBy({
          by: ["variantId"],
          where: { variantId: { in: [...atlananVaryant] }, type: "PURCHASE_IN" },
          _sum: { quantityDelta: true },
        })
      ).map((g) => [g.variantId, g._sum.quantityDelta ?? 0]),
    );
    let hicYok = 0;
    let yetmiyor = 0;
    for (const v of atlananVaryant) {
      if ((alimGirisi.get(v) ?? 0) > 0) yetmiyor++;
      else hicYok++;
    }
    console.log(`\n   ⚠ İKİ AYRI SEBEP — İKİSİ FARKLI İŞ TARİF EDER:`);
    console.log(`     ⛔ ALIM HİÇ GİRİLMEMİŞ   ${String(hicYok).padStart(4)} varyant → o ürünün alımını GİR`);
    console.log(`     ⚠ ALIM VAR AMA YETMİYOR ${String(yetmiyor).padStart(4)} varyant → EKSİK ADEDİ gir`);
    console.log(`     Satış tarafında yapılacak bir şey yok; iş alım defterinde.`);
  }

  if (!UYGULA) {
    console.log(`\n${"=".repeat(76)}`);
    console.log(`  RAPOR — hiçbir şey yazılmadı. Yazmak için: -- --uygula`);
    console.log("=".repeat(76) + "\n");
    await prisma.$disconnect();
    return;
  }

  // ═══ YAZIM ══════════════════════════════════════════════════════════════
  const onceHareket = await prisma.stockMovement.count();
  console.log(`\n④ YAZILIYOR`);
  console.log(`   önce StockMovement toplam ${onceHareket}`);

  let hareket = 0;
  const tazelenecek = new Set<string>();
  /** ⭐ Geriye dönük bağların izi — `AuditLog`a ve rapora gider. */
  const geriyeDonuk: {
    siparis: string | null; sku: string; satisTarihi: string;
    partiTarihi: string; gecikmeGun: number;
  }[] = [];
  /** Parti hareketlerinin tarihi — gecikme hesabı için. */
  const partiTarihleri = new Map(
    (
      await prisma.stockMovement.findMany({
        where: { id: { in: planlar.flatMap((x) => x.dagitim.map((d) => d.hareketId)) } },
        select: { id: true, occurredAt: true },
      })
    ).map((x) => [x.id, x.occurredAt]),
  );
  for (const plan of planlar) {
    for (const pay of plan.dagitim) {
      await prisma.stockMovement.create({
        data: {
          variantId: plan.kalem.variantId,
          type: "SALE_OUT",
          /** Çıkış negatiftir — satış yazma yolunun birebir aynısı. */
          quantityDelta: -pay.adet,
          /**
           * ⚠ `Sale.soldAt` — ÖLÇÜLDÜ, seçilmedi: mevcut `SALE_OUT`
           * hareketlerinin **151/152**'si zaten birebir böyle. Farklı
           * davranmak bir tutarsızlık olurdu.
           */
          occurredAt: plan.kalem.sale.soldAt,
          saleItemId: plan.kalem.id,
          sourceMovementId: pay.hareketId,
          locationId: pay.locationId,
          unitCostAmount: pay.birimMaliyet as never,
          unitCostCurrency: pay.birimMaliyetParaBirimi as never,
        },
      });
      hareket++;
    }
    tazelenecek.add(plan.kalem.sale.id);
    /**
     * ⭐ GERİYE DÖNÜK BAĞ İZİ — parti satıştan SONRA damgalıysa kaydedilir.
     * "Bu maliyet nereden geldi" sorusunun ileride cevabı bu olacak.
     */
    for (const pay of plan.dagitim) {
      const partiTarihi = partiTarihleri.get(pay.hareketId);
      if (partiTarihi === undefined || partiTarihi <= plan.kalem.sale.soldAt) continue;
      geriyeDonuk.push({
        siparis: plan.kalem.sale.code,
        sku: plan.kalem.variant.sku,
        satisTarihi: plan.kalem.sale.soldAt.toISOString().slice(0, 10),
        partiTarihi: partiTarihi.toISOString().slice(0, 10),
        gecikmeGun: Math.round(
          (partiTarihi.getTime() - plan.kalem.sale.soldAt.getTime()) / 86400_000,
        ),
      });
    }
  }

  const sonraHareket = await prisma.stockMovement.count();
  console.log(`   yazılan hareket           ${hareket}`);
  console.log(`   sonra StockMovement       ${onceHareket} → ${sonraHareket}   (fark ${sonraHareket - onceHareket})`);
  if (sonraHareket - onceHareket !== hareket) {
    console.log(`\n   ⛔ SAYIM TUTMADI — beklenen +${hareket}, ölçülen +${sonraHareket - onceHareket}.`);
    console.log(`      YORUMLANMIYOR; ham hâliyle yazıldı.`);
  } else {
    console.log(`   ✓ SAYIM TUTTU`);
  }

  // ═══ KÂR TAZELEME ═══════════════════════════════════════════════════════
  /**
   * ⚠ KÂR AYRI ADIM AMA AYNI KOŞUMDA. Maliyet artık defterde; kâr
   * tazelenmezse `profitStatus` null kalır ve marj şerhi HÂLÂ o satışları
   * "bağ bekliyor" diye sayar — iş yapılmış ama ekran değişmemiş olur.
   */
  console.log(`\n⑤ KÂR TAZELENİYOR — ${tazelenecek.size} satış`);
  let tazelendi = 0;
  let tazelenemedi = 0;
  for (const saleId of tazelenecek) {
    const ok = await satisKarTazele(saleId);
    if (ok) tazelendi++;
    else tazelenemedi++;
    if ((tazelendi + tazelenemedi) % 25 === 0) {
      console.log(`   … ${tazelendi + tazelenemedi}/${tazelenecek.size}`);
    }
  }
  console.log(`   tazelendi                 ${tazelendi}`);
  if (tazelenemedi > 0) console.log(`   ⛔ TAZELENEMEDİ           ${tazelenemedi}`);

  const kalanBagsiz = await prisma.sale.count({
    where: {
      importBatch: { not: null },
      iptalTarihi: null,
      items: { none: { stockMovements: { some: {} } } },
    },
  });
  /**
   * ⚠ GERİYE DÖNÜK BAĞ EKRANDA DA YAZAR — `AuditLog`a yazıp ekranda
   * susmak, "kaydedilen ≠ görünen" hatası olurdu.
   */
  console.log(`\n⑤b GERİYE DÖNÜK BAĞ — parti satıştan SONRA damgalı`);
  console.log(`   ${geriyeDonuk.length} / ${hareket} hareket`);
  if (geriyeDonuk.length > 0) {
    const g = geriyeDonuk.map((x) => x.gecikmeGun).sort((a, b) => a - b);
    console.log(
      `   gecikme: en küçük ${g[0]} gün · ortanca ${g[Math.floor(g.length / 2)]} gün · EN BÜYÜK ${g[g.length - 1]} gün`,
    );
    for (const x of geriyeDonuk) {
      console.log(
        `     ${x.satisTarihi} → ${x.partiTarihi}  (+${x.gecikmeGun} gün)  ${(x.siparis ?? "—").padEnd(14)}${x.sku}`,
      );
    }
  }

  console.log(`\n⑥ SONUÇ`);
  console.log(`   hâlâ bağsız satış         ${kalanBagsiz}   ← alım defteri açığı (K55)`);

  await prisma.auditLog.create({
    data: {
      action: "ICE_AKTARMA_STOK_BAGI",
      targetType: "StockMovement",
      detail: JSON.stringify({
        planlananKalem: planlar.length,
        atlananKalem: atlananlar.length,
        atlananAdet: atlananlar.reduce((t, a) => t + a.kalem.quantity, 0),
        atlananVaryant: atlananVaryant.size,
        yazilanHareket: hareket,
        hareketOnce: onceHareket,
        hareketSonra: sonraHareket,
        karTazelendi: tazelendi,
        kalanBagsizSatis: kalanBagsiz,
        not: "Karar: baglanabilen baglanir. Parti yetersiz ve hic hareketi olmayan varyantlar ATLANDI - negatif stok YOK, kaynaksiz cikis YOK.",
        geriyeDonukBag: {
          adet: geriyeDonuk.length,
          gerekce:
            "O malin GERCEK alimi hic kaydedilmedi; bugun girilen alim o eksik kaydin yerine geciyor. Maliyet gercek, yalniz tarihi gec. `sinir` parametresi bilerek verilmedi (kullanici karari 28.08.2026).",
          enBuyukGecikmeGun:
            geriyeDonuk.length === 0 ? 0 : Math.max(...geriyeDonuk.map((g) => g.gecikmeGun)),
          ortalamaGecikmeGun:
            geriyeDonuk.length === 0
              ? 0
              : Math.round(geriyeDonuk.reduce((t, g) => t + g.gecikmeGun, 0) / geriyeDonuk.length),
          kayitlar: geriyeDonuk,
        },
      }),
    },
  });
  console.log(`   ✓ AuditLog — ICE_AKTARMA_STOK_BAGI`);
  /**
   * ⚠ GERİ ALMA KOMUTU HANGİ PARTİLERİ KAPSADIĞINI YAZAR. Tek bir "parti
   * kimliği" basmak yanlış olurdu: bu koşum birden çok içe aktarma
   * partisinin kalemlerini bağlamış olabilir.
   */
  const kapsananPartiler = [
    ...new Set(
      (
        await prisma.sale.findMany({
          where: { id: { in: [...tazelenecek] } },
          select: { importBatch: true },
        })
      ).map((x) => x.importBatch!),
    ),
  ];
  console.log(`\n   GERİ ALMA — bu koşum ${kapsananPartiler.length} içe aktarma partisini kapsadı:`);
  for (const b of kapsananPartiler) {
    console.log(`     npm run canli:stok-bagi -- --geri=${b} --uygula`);
  }
  console.log("");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
