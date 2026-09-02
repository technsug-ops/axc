/**
 * ============================================================================
 *  11265267349 — TAM ONARIM (FIFO gerçeğe göre yeniden kurulur)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *    npm run canli:11265-tam              → KURU KOŞUM (yazmaz)
 *    npm run canli:11265-tam -- --uygula  → YAZAR
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bu siparişin ve `axcali1739`un kimliğine
 *  KİLİTLİ. Genel araç DEĞİLDİR.
 *
 *  ── GERÇEK (kanalın kendi kaydı + kullanıcı teyidi) ─────────────────────
 *      4 alım · 3 satış · 1 İADE (15.06, onaylı) · 2 satış   → stok 0
 *
 *  ── DEFTERİN BUGÜNKÜ HÂLİ ──────────────────────────────────────────────
 *      4 alım · 4 SATIŞ ÇIKIŞI (biri sahte) · 2 HAYALET alım · 2 satış
 *  Toplam yine 0 — ama bileşimi yanlış ve satış ₺3.288 sahte zarar taşıyor.
 *
 *  ── ⛔ NİYE "KÜÇÜK ONARIM" KAPATMIYOR ──────────────────────────────────
 *  Sahte kalemi etkisizleştirip tek `ADJUSTMENT` atmak rakamı düzeltir ama
 *  defterde İKİ YALAN bırakır: iade hiç görünmez (iade sayacı, kanal iade
 *  oranı, hepsi eksik kalır) ve iki uydurma alım kayıtlı kalır.
 *  _(Anayasa: "kapatılamayan madde kutunun tamamına olan güveni eritir".)_
 *
 *  ── ⚠ HAYALET PARTİYİ SİLMEK LEDGER İHLALİ DEĞİL ───────────────────────
 *  Bu iki `PURCHASE_IN`in notu `dosya-maliyet-20260828 · dosya beyanı`:
 *  gerçek bir mal kabulü DEĞİL, maliyet doldurma betiğinin ürettiği kayıt.
 *  Olmamış bir alımı silmek "kaydı değiştirmek" değil, **uydurmayı
 *  kaldırmaktır.** Yerine gerçek parti bağlanıyor.
 *  ⚠ Ve silinmeden ÖNCE tüketicileri gerçek partilere bağlanır; `Restrict`
 *  bağı olan bir partiyi zaten silmez — sıra bu yüzden şart.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const SIPARIS = "11265267349";
const SKU = "axcali1739";
const HAYALET_NOT = "dosya-maliyet-20260828";
const UYGULA = process.argv.includes("--uygula");

/** Kanalın kendi kaydından — uydurulmadı (TY claims + satıcı ekranı). */
const IADE_TARIHI = new Date("2026-06-15T12:00:00.000Z");
const IADE_NOTU = "IADE_SEBEP[kaynak:ty-claims]: «Satıcı Talebi İle İade»";

function para(x: unknown): string {
  const n = Number(String(x));
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";
}
function gun(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("=".repeat(94));
  console.log(
    `  ${SIPARIS} TAM ONARIM · KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "KURU KOŞUM"}`,
  );
  console.log("=".repeat(94));

  const v = await prisma.productVariant.findFirst({
    where: { sku: SKU },
    select: { id: true },
  });
  if (v === null) {
    console.log(`⛔ ${SKU} yok — ÖLÇÜM YOK.`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /** ── HAREKETLER — plan bunlardan kurulur ───────────────────────────── */
  const hareketler = await prisma.stockMovement.findMany({
    where: { variantId: v.id },
    select: {
      id: true,
      type: true,
      quantityDelta: true,
      unitCostAmount: true,
      occurredAt: true,
      note: true,
      sourceMovementId: true,
      saleItemId: true,
      saleItem: {
        select: {
          id: true,
          quantity: true,
          unitPriceAmount: true,
          sale: { select: { id: true, code: true, net2Amount: true } },
        },
      },
    },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  const hayaletler = hareketler.filter(
    (h) => h.quantityDelta > 0 && (h.note ?? "").includes(HAYALET_NOT),
  );
  const gercekPartiler = hareketler.filter(
    (h) => h.quantityDelta > 0 && !(h.note ?? "").includes(HAYALET_NOT),
  );
  /**
   * ⚠ ÖLÇÜT `< 0` DEĞİL `<= 0` — VE SEBEBİ BİR KOŞUMDAN GELDİ.
   * A1 fiyatı −2.550'den 0'a çekiyor; ölçüt negatife bakınca İKİNCİ
   * koşumda kalem BULUNAMADI ve şekil kapısı "zaten onarılmış" diyerek
   * C/D'yi de engelledi. Kimlik fiyatın İŞARETİNE değil, o kalemin sahte
   * olmasına bağlanır: sağlam kalem 2.550, sahte olan 0.
   */
  const sahteCikis = hareketler.find(
    (h) =>
      h.saleItem !== null &&
      h.saleItem.sale.code === SIPARIS &&
      Number(h.saleItem.unitPriceAmount.toString()) <= 0,
  );

  console.log("\n① MEVCUT DURUM");
  console.log(`   gerçek parti  : ${gercekPartiler.length}`);
  console.log(`   hayalet parti : ${hayaletler.length}`);
  console.log(
    `   sahte çıkış   : ${sahteCikis ? "VAR · " + sahteCikis.id.slice(-8) : "YOK"}`,
  );
  /** ⚠ `!== 2` değil `=== 0`: yarım koşumdan sonra da devam edebilmeli. */
  if (sahteCikis === undefined || hayaletler.length === 0) {
    console.log("\n   ⛔ BEKLENEN ŞEKİL BULUNAMADI — onarım YAZILMAZ.");
    console.log(
      `     sahte çıkış ${sahteCikis ? "VAR" : "YOK"} · hayalet parti ${hayaletler.length}`,
    );
    console.log("     Ya zaten onarılmış ya da defter değişmiş.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /**
   * ② HAYALET PARTİLERİ KİM TÜKETİYOR — yeniden bağlanacak çıkışlar.
   */
  const tuketenler = hareketler.filter(
    (h) =>
      h.sourceMovementId !== null &&
      hayaletler.some((p) => p.id === h.sourceMovementId),
  );
  console.log("\n② HAYALET PARTİYİ TÜKETEN ÇIKIŞLAR");
  for (const t of tuketenler) {
    console.log(
      `   ${gun(t.occurredAt)}  satış ${t.saleItem?.sale.code ?? "—"}` +
        `  maliyet ${para(t.unitCostAmount)}  NET-2 ${para(t.saleItem?.sale.net2Amount)}`,
    );
  }

  /**
   * ③ PLAN — SIRA ÖNEMLİ, HER ADIM BİR ÖNCEKİNİ MÜMKÜN KILAR.
   */
  console.log("\n③ PLAN");
  console.log("   A) sahte satış kaleminin adedi 1 → 0");
  console.log("      → SALE_OUT geri alınır, tükettiği gerçek parti AÇILIR");
  console.log(`      → satış NET-2 sahte zararı düzelir`);
  console.log("   B) gerçek İADE kaydı yazılır");
  console.log(
    `      ${gun(IADE_TARIHI)} · 1 adet · NORMAL · sağlam 1 · not: ty-claims`,
  );
  console.log("      → RETURN_IN partisi doğar (iade edilen malın maliyetiyle)");
  console.log("   C) hayalet partiyi tüketen 2 çıkış GERÇEK partilere bağlanır");
  console.log("      → maliyet damgaları gerçek partinin birim maliyetine döner");
  console.log("   D) tüketicisi kalmayan 2 hayalet parti SİLİNİR");
  console.log("      → uydurma alım kaydı defterden kalkar");
  console.log("   E) etkilenen 3 satışın kârı tazelenir");

  /** Beklenen maliyet değişimi — para etkisi ÖNCEDEN yazılır. */
  console.log("\n④ PARA ETKİSİ (maliyet damgası değişimi)");
  let etki = 0;
  for (const t of tuketenler) {
    const eski = Number((t.unitCostAmount ?? 0).toString());
    console.log(
      `   satış ${t.saleItem?.sale.code}  maliyet ${para(eski)} → gerçek partininki`,
    );
    etki += eski;
  }
  console.log(
    `   ⚠ Yeni maliyetler adım C'de FIFO'dan çözülecek; şu an` +
      ` tahmin YAZILMIYOR.`,
  );
  console.log(
    `   ⛔ İKİ SATIŞIN NET'İ DEĞİŞECEK — küçük tutarlar ama DEĞİŞECEK.`,
  );
  void etki;

  console.log("\n⑤ ⛔ BU ONARIMIN SINIRI");
  console.log("   Hayalet partilerin maliyeti ₺1.945 idi ve satış dosyasından");
  console.log("   gelmişti — yani UYDURMA değil, BEYAN. Gerçek partilere");
  console.log("   bağlanınca maliyet 1.934/1.999'a döner. İkisi de gerçek;");
  console.log("   ama hangi fiziksel adedin hangi satışa gittiğini defter");
  console.log("   bilmiyor, FIFO sırası varsayılıyor.");

  if (!UYGULA) {
    console.log("\n" + "-".repeat(94));
    console.log("  ⛔ KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("     Yazmak için: npm run canli:11265-tam -- --uygula");
    console.log("=".repeat(94) + "\n");
    await prisma.$disconnect();
    return;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ⑥ YAZIM — Halil onayı 02.09.2026 ("onaylıyorum çöz şunu")
   * ---------------------------------------------------------------------
   *  ⚠ A ve B UYGULAMANIN KENDİ GÖVDELERİNDEN geçiyor; ikinci bir yazma
   *  yolu açılmıyor. C ve D için hazır gövde YOK ve doğrudan ledger'a
   *  dokunuyor — o yüzden ikisi de AYRI izle yazılıyor.
   * ══════════════════════════════════════════════════════════════════════
   */
  const kullanici = await prisma.user.findFirst({ select: { id: true } });
  if (kullanici === null) {
    console.log("\n⛔ Kullanıcı bulunamadı — iz sahipsiz kalır, YAZIM YOK.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /** ── ANLIK GÖRÜNTÜ — geri alma ve kanıt bunlara dayanır ─────────────── */
  const etkilenen = [SIPARIS, ...tuketenler.map((t) => t.saleItem!.sale.code!)];
  const oncekiler = await prisma.sale.findMany({
    where: { code: { in: etkilenen } },
    select: {
      code: true,
      net1Amount: true,
      net2Amount: true,
      profitStatus: true,
    },
  });
  const stokOnce = await prisma.stockMovement.aggregate({
    where: { variantId: v.id },
    _sum: { quantityDelta: true },
  });
  console.log("\n⑥ YAZIM");
  console.log(`   anlık görüntü: stok ${stokOnce._sum.quantityDelta ?? 0}`);
  for (const o of oncekiler) {
    console.log(
      `     ${o.code}  NET-1 ${para(o.net1Amount)} · NET-2 ${para(o.net2Amount)}`,
    );
  }

  const satis = await prisma.sale.findFirst({
    where: { code: SIPARIS },
    select: { id: true, items: { select: { id: true, unitPriceAmount: true } } },
  });
  /** ⚠ `<= 0` — A1'den sonra fiyat 0; negatife bakan ölçüt kalemi kaybeder. */
  const sahteKalem = satis!.items.find(
    (i) => Number(i.unitPriceAmount.toString()) <= 0,
  )!;
  const saglamKalem = satis!.items.find(
    (i) => Number(i.unitPriceAmount.toString()) > 0,
  )!;

  /** ── A) SAHTE KALEMİN ADEDİ 0 ─────────────────────────────────────── */
  const { duzenlemeOnizle, duzenlemeUygula } = await import(
    "../src/lib/satis-duzenleme-veri"
  );
  /**
   * ⛔ İLK PLAN REDDEDİLDİ VE SEBEBİ BURADA DURUYOR (02.09.2026).
   *
   * "Sahte kalemin adedini 0 yap" denedim; düzenleme kapısı iki kez
   * reddetti:
   *     yeniFiyat < 0   → FIYAT_GECERSIZ   (negatif fiyat geçemiyor)
   *     yeniAdet  <= 0  → ADET_GECERSIZ    (adet 0 da geçemiyor)
   * ⭐ VE KAPILAR HAKLIYDI: uygulamada bir satış kalemini SİLME yolu yok
   *   ve olmaması doğru — ledger disiplini satır silmez.
   *
   * ⭐ ÇARE ANAYASADA ZATEN YAZILI: düzeltme ters işaretli hareketle
   * yapılır. Ve `kalemMaliyeti` maliyeti TİPTEN değil BAĞDAN, işaretiyle
   * topluyor (ölçüldü: `kalem-maliyeti.ts` — "kaleme bağlı her hareket o
   * kalemin STOK AKIŞIDIR ve maliyetine işaretiyle girer"). O hâlde
   * kaleme bağlı bir `+1` hareket hem stoğu geri verir hem maliyeti
   * netler — silmeye gerek yok.
   *
   * Bu yüzden A ikiye ayrıldı:
   *   A1) FİYAT −2.550 → 0  (düzenleme kapısından, ciro doğrulanır)
   *   A2) kaleme bağlı ters hareket +1  (stok ve maliyet netlenir)
   */
  const yeniDegerler = {
    fiyatlar: { [sahteKalem.id]: 0, [saglamKalem.id]: 2550 },
    adetler: { [sahteKalem.id]: 1, [saglamKalem.id]: 1 },
    kargoFirmaId: null,
    kargoDesi: null,
    kargoTutar: null,
  };
  const ACIKLAMA =
    "İade, RETURN_IN yerine negatif fiyatlı satış kalemi olarak girilmişti; " +
    "kalem etkisizleştirildi. Kanal kaydı: TY claims 15.06.2026 " +
    "SELLERREQUEST 'Satıcı Talebi İle İade', Accepted.";
  /**
   * ⭐ DEVAM KAPISI — A1 zaten yapıldıysa atlanır.
   * İlk koşumda C durdu ve A1/A2/B yazılı kaldı; betiğin baştan
   * koşabilmesi için her adım kendi izini SORAR.
   */
  const a1Yapildi = Number(sahteKalem.unitPriceAmount.toString()) === 0;
  const onizleme = a1Yapildi ? null : await duzenlemeOnizle(
    satis!.id,
    yeniDegerler,
    "DIGER",
    ACIKLAMA,
  );
  if (!a1Yapildi && onizleme === null) {
    console.log("   ⛔ A1: önizleme kurulamadı — YAZIM DURDU.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const aSonuc = a1Yapildi
    ? ({ tamam: true, satisKodu: SIPARIS, eskiNet2: null, yeniNet2: null } as const)
    : await duzenlemeUygula({
    saleId: satis!.id,
    yeni: yeniDegerler,
    neden: "DIGER",
    aciklama: ACIKLAMA,
    onaylananImza: onizleme!.imza,
    kullaniciId: kullanici.id,
        an: new Date(),
      });
  if (!aSonuc.tamam) {
    console.log(`   ⛔ A BAŞARISIZ: ${JSON.stringify(aSonuc)}`);
    console.log("     ⚠ Hiçbir sonraki adım koşmadı — defter A öncesi hâlde.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  console.log(
    a1Yapildi
      ? "   ↷ A1: fiyat zaten 0 — ATLANDI"
      : `   ✓ A1: fiyat −2.550 → 0 · NET-2 ${para(aSonuc.eskiNet2)} → ${para(aSonuc.yeniNet2)}`,
  );

  /**
   * ── A2) KALEME BAĞLI TERS HAREKET ─────────────────────────────────────
   * ⚠ `saleItemId` DOLU YAZILIYOR — bağ olmadan `kalemMaliyeti` bu
   * hareketi görmez ve maliyet netleşmez. Tip `ADJUSTMENT`; parti
   * tüketilmediği için `sourceMovementId` YOK, bu hareket bir GİRİŞ.
   */
  const sahteCikisGuncel = await prisma.stockMovement.findFirst({
    where: { saleItemId: sahteKalem.id, quantityDelta: { lt: 0 } },
    select: { id: true, unitCostAmount: true, unitCostCurrency: true, sourceMovementId: true },
  });
  if (sahteCikisGuncel === null) {
    console.log("   ⛔ A2: sahte çıkış hareketi bulunamadı — YAZIM DURDU.");
    console.log("     ⚠ A1 YAZILDI — defter yarım hâlde.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const a2Var = await prisma.stockMovement.findFirst({
    where: { saleItemId: sahteKalem.id, quantityDelta: { gt: 0 } },
    select: { id: true },
  });
  if (a2Var !== null) {
    console.log("   ↷ A2: ters hareket zaten var — ATLANDI");
  } else await prisma.stockMovement.create({
    data: {
      variantId: v.id,
      type: "ADJUSTMENT",
      quantityDelta: 1,
      occurredAt: new Date("2026-05-24T12:00:00.000Z"),
      unitCostAmount: sahteCikisGuncel.unitCostAmount,
      unitCostCurrency: sahteCikisGuncel.unitCostCurrency,
      saleItemId: sahteKalem.id,
      userId: kullanici.id,
      note:
        "11265267349 ONARIM: iade RETURN_IN yerine negatif fiyatlı satış " +
        "kalemi olarak girilmişti; o kalemin stok çıkışı ters kayıtla " +
        "geri alındı. Kanal kaydı: TY claims 15.06.2026 SELLERREQUEST " +
        "'Satıcı Talebi İle İade', Accepted. Kalem SİLİNMEDİ.",
    },
  });
  if (a2Var === null) {
    console.log("   ✓ A2: kaleme bağlı ters hareket +1 yazıldı (maliyet netlenir)");
  }

  /** ── B) GERÇEK İADE KAYDI ─────────────────────────────────────────── */
  const { iadeKaydet } = await import("../src/lib/iade");
  const mevcutIade = await prisma.return.findFirst({
    where: { sale: { code: SIPARIS } },
    select: { id: true },
  });
  let iadeId: string | null = mevcutIade?.id ?? null;
  if (mevcutIade !== null) {
    console.log(`   ↷ B: iade kaydı zaten var — ATLANDI · ${mevcutIade.id}`);
  } else try {
    iadeId = await iadeKaydet({
      saleId: satis!.id,
      code: null,
      returnType: "NORMAL",
      occurredAt: IADE_TARIHI,
      note: IADE_NOTU,
      userId: kullanici.id,
      degisimTeslimTarihi: null,
      iadeKargosu: null,
      yenidenGonderimKargosu: null,
      ceza: null,
      cezaNotu: null,
      sayimIsrari: {
        onaylandi: true,
        sebep: "DIGER",
        aciklama:
          "Geç girilen İADE (15.06.2026). Kapalı listede GEC_GIRILEN_IADE yok.",
      },
      kalemler: [
        {
          saleItemId: saglamKalem.id,
          iadeAdedi: 1,
          saglamAdet: 1,
          hasarliAdet: 0,
          hasarNotu: null,
          locationId: null,
          exchangeVariantId: null,
          donenVaryantId: null,
        },
      ],
    });
    console.log(`   ✓ B: iade kaydı yazıldı · ${iadeId}`);
  } catch (e) {
    const ham = e instanceof Error ? e.message : String(e);
    console.log(`   ⛔ B BAŞARISIZ: ${ham.replace(/\s+/g, " ")}`);
    console.log("     ⚠ A YAZILDI ve geri alınmadı — defter yarım hâlde.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /** ── C+D) HAYALET PARTİLER — TEK İŞLEMDE ──────────────────────────── */
  /**
   * ⛔ `NOT` SÜZGECİ NULL SATIRI DA ATAR — VE BEN BU TUZAĞA DÜŞTÜM.
   *
   * İlk yazım şuydu:  `NOT: { note: { contains: HAYALET_NOT } }`
   * Gerçek partilerin `note`u BOŞ; SQL `NOT (note LIKE ...)` NULL'da
   * `NULL` döner ve satır ELENİR. Sonuç: 4 gerçek parti + RETURN_IN
   * görünmedi, yalnız notu olan 1 hareket sayıldı ve C durdu.
   * ⭐ Anayasada bu kuralın kendi maddesi var ve ben yine düştüm; çare
   * NULL dalını AÇIKÇA yazmak.
   */
  const acikPartiler = await prisma.stockMovement.findMany({
    where: {
      variantId: v.id,
      quantityDelta: { gt: 0 },
      OR: [
        { note: null },
        { NOT: { note: { contains: HAYALET_NOT } } },
      ],
    },
    select: { id: true, unitCostAmount: true, occurredAt: true },
    orderBy: { occurredAt: "asc" },
  });
  /** Her partinin KALANI — FIFO sırası buradan çözülür. */
  const kalanlar = new Map<string, number>();
  for (const p of acikPartiler) kalanlar.set(p.id, 0);
  const tumHareket = await prisma.stockMovement.findMany({
    where: { variantId: v.id },
    select: { id: true, quantityDelta: true, sourceMovementId: true },
  });
  for (const h of tumHareket) {
    if (h.quantityDelta > 0 && kalanlar.has(h.id)) {
      kalanlar.set(h.id, h.quantityDelta);
    }
  }
  for (const h of tumHareket) {
    if (h.sourceMovementId && kalanlar.has(h.sourceMovementId)) {
      kalanlar.set(
        h.sourceMovementId,
        (kalanlar.get(h.sourceMovementId) ?? 0) + h.quantityDelta,
      );
    }
  }
  const bosPartiler = acikPartiler.filter((p) => (kalanlar.get(p.id) ?? 0) > 0);
  console.log(`   açık gerçek parti: ${bosPartiler.length}`);
  if (bosPartiler.length < tuketenler.length) {
    console.log(
      `   ⛔ C DURDU: ${tuketenler.length} çıkış için yalnız ${bosPartiler.length} açık parti var.`,
    );
    console.log("     ⚠ A ve B YAZILDI. C/D yazılmadı — defter yarım hâlde.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      const sira = [...bosPartiler].sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
      );
      const sirali = [...tuketenler].sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
      );
      for (let i = 0; i < sirali.length; i++) {
        const cikis = sirali[i];
        const parti = sira[i];
        await tx.stockMovement.update({
          where: { id: cikis.id },
          data: {
            sourceMovementId: parti.id,
            unitCostAmount: parti.unitCostAmount,
          },
        });
        console.log(
          `   ✓ C: ${cikis.saleItem?.sale.code} → parti ${gun(parti.occurredAt)}` +
            ` maliyet ${para(cikis.unitCostAmount)} → ${para(parti.unitCostAmount)}`,
        );
      }
      for (const h of hayaletler) {
        await tx.stockMovement.delete({ where: { id: h.id } });
        console.log(`   ✓ D: hayalet parti silindi ${gun(h.occurredAt)}`);
      }
      await tx.auditLog.create({
        data: {
          action: "SATIS_11265_TAM_ONARIM",
          targetType: "Sale",
          targetId: satis!.id,
          userId: kullanici.id,
          detail: JSON.stringify({
            gerekce:
              "İade negatif satış kalemi olarak girilmişti; stok erken " +
              "tükendi ve maliyet betiği iki hayalet parti açtı.",
            kanalKaydi:
              "TY claims 15.06.2026 SELLERREQUEST 'Satıcı Talebi İle İade' Accepted",
            iadeId,
            oncekiNetler: oncekiler.map((o) => ({
              kod: o.code,
              net1: o.net1Amount?.toString() ?? null,
              net2: o.net2Amount?.toString() ?? null,
              durum: o.profitStatus,
            })),
            silinenHayaletler: hayaletler.map((h) => ({
              gun: gun(h.occurredAt),
              maliyet: h.unitCostAmount?.toString() ?? null,
              not: h.note,
            })),
            yenidenBaglanan: tuketenler.map((t) => ({
              satis: t.saleItem?.sale.code,
              eskiMaliyet: t.unitCostAmount?.toString() ?? null,
            })),
          }),
        },
      });
    },
    { timeout: 120_000 },
  );

  /** ── E) KÂR TAZELE ────────────────────────────────────────────────── */
  const { karYenidenYaz } = await import("../src/lib/kar-yeniden");
  const { kdvDahilKargo } = await import("../src/lib/kargo-kdv");
  for (const kod of etkilenen) {
    /**
     * ⚠ ÇAĞRI `canli-kar-tazele.ts` İLE BİREBİR AYNI ŞEKİLDE KURULUYOR:
     * komisyon ORANDAN (tutar null), kargo saklı değerden ve KDV çevirisi
     * `kargo-kdv`den. Kendi çarpanımı yazsaydım motorla ayrışırdım.
     */
    const s = await prisma.sale.findFirst({
      where: { code: kod },
      select: {
        id: true,
        cargoCarrierId: true,
        cargoDesi: true,
        cargoAmount: true,
        items: { select: { id: true, commissionRate: true } },
      },
    });
    if (s === null) continue;
    try {
      const oldu = await karYenidenYaz({
        saleId: s.id,
        kalemler: s.items.map((i) => ({
          saleItemId: i.id,
          commissionRate:
            i.commissionRate === null ? null : Number(i.commissionRate.toString()),
          commissionAmount: null,
        })),
        cargoCarrierId: s.cargoCarrierId,
        cargoDesi: s.cargoDesi === null ? null : Number(s.cargoDesi.toString()),
        cargoAmountManual: kdvDahilKargo(
          s.cargoAmount === null ? null : Number(s.cargoAmount.toString()),
        ),
      });
      console.log(`   ${oldu ? "✓" : "⛔"} E: kâr tazelendi ${kod}`);
    } catch (e) {
      console.log(
        `   ⛔ E: ${kod} tazelenemedi — ${(e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ")}`,
      );
    }
  }

  /** ── DEĞİŞMEZLİK TURU ─────────────────────────────────────────────── */
  const stokSonra = await prisma.stockMovement.aggregate({
    where: { variantId: v.id },
    _sum: { quantityDelta: true },
  });
  const sonrakiler = await prisma.sale.findMany({
    where: { code: { in: etkilenen } },
    select: { code: true, net1Amount: true, net2Amount: true, profitStatus: true },
  });
  console.log("\n⑦ SONUÇ");
  console.log(
    `   stok ${stokOnce._sum.quantityDelta ?? 0} → ${stokSonra._sum.quantityDelta ?? 0}` +
      ((stokSonra._sum.quantityDelta ?? 0) === 0 ? "  ✓" : "  ⛔ 0 DEĞİL"),
  );
  for (const o of oncekiler) {
    const s = sonrakiler.find((x) => x.code === o.code);
    console.log(
      `   ${o.code}  NET-2 ${para(o.net2Amount)} → ${para(s?.net2Amount)}` +
        `  ${s?.profitStatus ?? "—"}`,
    );
  }
  if ((stokSonra._sum.quantityDelta ?? 0) !== 0) process.exitCode = 1;

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
