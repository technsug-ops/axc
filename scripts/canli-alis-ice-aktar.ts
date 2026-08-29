/** BETIK SINIFI: SUREKLI — Alim dosyasi her yeni dosyada yeniden kosulur; stogu geri tarihli yazar. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { iceAktarmaTarihi } from "../src/lib/ice-aktarma-tarih-kapisi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K55 — ALIŞ İÇE AKTARMA · YAZIM
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:alis-aktar -- --dosya="<yol>"            → ÖNİZLEME
 *      npm run canli:alis-aktar -- --dosya="<yol>" --yaz      → YAZAR
 *      npm run canli:alis-aktar -- --geri=<batch> --yaz       → TERS KAYIT
 *
 *  ⚠ SINIFLANDIRMA KURU KOŞUMUN AYNISI. İki ayrı gövde yazılsaydı biri
 *  yarın ötekinden ayrışır ve "kuru koşumda 1615 çıkmıştı, yazım 1608
 *  yazdı" gibi açıklanamayan bir fark doğardı.
 *
 *  ⚠ ADRES BAŞTA SABİTLENİR — alım numarası üreteci uygulamanın `prisma`
 *  tekilini kullanır ve adresi ortam değişkeninden okur.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const dosyaArg = process.argv.find((a) => a.startsWith("--dosya="));
const geriArg = process.argv.find((a) => a.startsWith("--geri="));
const YOL = dosyaArg?.slice("--dosya=".length) ?? "";
const GERI = geriArg?.slice("--geri=".length) ?? null;

const t2 = (n: number) => n.toFixed(2).padStart(14);
const metne = (v: unknown): string =>
  v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : String(v).trim();

/**
 * ⚠ TARİH KAPISI ORTAK GÖVDEDEN — burada yerel bir kopyası vardı.
 * Kapı iki ayrı vaka üretti (alışta `0202`, satışta `2029`) ve iki
 * betikte iki ayrı kopya tutmak, ikisinin yarın ayrışmasına davetiyeydi.
 * `iceAktarmaTarihi` alt sınırı SABİT (2024-01-01), üst sınırı KAYAR
 * (bugün) — ayrıntı için `src/lib/ice-aktarma-tarih-kapisi.ts`.
 */
function tariheCevir(ham: unknown, simdi: Date): Date | null {
  const k = iceAktarmaTarihi(ham, simdi);
  return k.tur === "GECERLI" ? k.tarih : null;
}

/** İstanbul takvim gününün UTC gece yarısı — defterdeki hareketler böyle. */
function isGunuUtc(d: Date): Date {
  const g = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return new Date(`${g}T00:00:00.000Z`);
}
const gunAdi = (d: Date) => isGunuUtc(d).toISOString().slice(0, 10);

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);

  const { prisma } = await import("../src/lib/prisma");
  const { anahtarla } = await import("../src/lib/benzerlik");
  const { paketiNormalle } = await import("../src/lib/tablo/paket");
  const { tedarikciAnahtari } = await import("../src/lib/tedarikci-adi");
  const { kodKosuluToplu } = await import("../src/lib/varyant-arama-kurali");
  const { alimNoOlustur } = await import("../src/lib/alim-no");

  /** ⚠ ÜST SINIR koşum anıdır — fonksiyon kendi saatini okumaz. */
  const okumaAni = new Date();

  console.log("\n" + "=".repeat(96));
  console.log(
    `K55 ALIŞ İÇE AKTARMA — ${GERI ? `⚠ GERİ ALMA (${GERI})` : YAZ ? "⚠ YAZIM" : "ÖNİZLEME (yazmaz)"}`,
  );
  console.log("=".repeat(96));

  // ═══ GERİ ALMA ══════════════════════════════════════════════════════════
  if (GERI) {
    /**
     * ⚠ TERS KAYIT, SİLME DEĞİL. Stok hareketi LEDGER satırıdır.
     * `PURCHASE_IN` silinemez de: tükettiği çıkışlar `sourceMovementId`
     * ile ona bağlı ve ilişki `Restrict`.
     */
    const alimlar = await prisma.purchase.findMany({
      where: { importBatch: GERI },
      select: { id: true, code: true, items: { select: { id: true, variantId: true, quantity: true, unitCostAmount: true, unitCostCurrency: true, stockMovements: { select: { id: true, quantityDelta: true, occurredAt: true, locationId: true } } } } },
    });
    console.log(`\n  importBatch  ${GERI}`);
    console.log(`  alım         ${alimlar.length}`);
    const hareketler = alimlar.flatMap((a) => a.items.flatMap((i) => i.stockMovements));
    console.log(`  hareket      ${hareketler.length}`);
    if (alimlar.length === 0) {
      console.log(`\n  ⛔ BU PARTİDE ALIM YOK.\n`);
      await prisma.$disconnect();
      return;
    }
    /**
     * ⚠ TÜKETİLMİŞ PARTİ GERİ ALINAMAZ — ölçülür, varsayılmaz.
     * Bir `PURCHASE_IN` partisi satışta tüketildiyse ters kayıt stoğu
     * eksiye düşürür. Bu koşum onları AYRI sayar ve ellemez.
     */
    const partiIdler = hareketler.map((h) => h.id);
    const tuketimler = await prisma.stockMovement.groupBy({
      by: ["sourceMovementId"],
      where: { sourceMovementId: { in: partiIdler } },
      _sum: { quantityDelta: true },
    });
    const tuketilen = new Set(tuketimler.map((t) => t.sourceMovementId!));
    const temiz = hareketler.filter((h) => !tuketilen.has(h.id));
    console.log(`  ── tüketilmemiş (geri alınabilir) ${temiz.length}`);
    console.log(`  ── TÜKETİLMİŞ (ellenmiyor)        ${hareketler.length - temiz.length}`);
    if (!YAZ) {
      console.log(`\n  RAPOR — yazmak için: -- --geri=${GERI} --yaz\n`);
      await prisma.$disconnect();
      return;
    }
    let ters = 0;
    for (const h of temiz) {
      await prisma.stockMovement.create({
        data: {
          variantId: alimlar.flatMap((a) => a.items).find((i) => i.stockMovements.some((s) => s.id === h.id))!.variantId,
          type: "ADJUSTMENT",
          /** ⚠ TERS İŞARET — giriş pozitifti, düzeltme negatif döner. */
          quantityDelta: -h.quantityDelta,
          occurredAt: h.occurredAt,
          locationId: h.locationId,
          note: `alış içe aktarma geri alındı — ${GERI}`,
        },
      });
      ters++;
    }
    await prisma.purchase.updateMany({
      where: { importBatch: GERI },
      data: { status: "CANCELLED" },
    });
    await prisma.auditLog.create({
      data: {
        action: "ALIS_ICE_AKTARMA_GERI",
        targetType: "Purchase",
        detail: JSON.stringify({ importBatch: GERI, alim: alimlar.length, hareket: hareketler.length, tersYazilan: ters, tuketilmisAtlandi: hareketler.length - temiz.length }),
      },
    });
    console.log(`\n  ✓ ${ters} ters kayıt · ${alimlar.length} alım CANCELLED`);
    console.log(`  ⚠ Özgün kayıtlar SİLİNMEDİ; defter iki satırı da taşır.\n`);
    await prisma.$disconnect();
    return;
  }

  if (!YOL) {
    console.log("\n⛔ DOSYA YOLU VERİLMEDİ\n");
    process.exitCode = 1;
    return;
  }

  // ═══ OKUMA ══════════════════════════════════════════════════════════════
  const ham = readFileSync(YOL);
  const md5 = createHash("md5").update(ham).digest("hex");
  const sayfalar = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sayfalar.find((s) => anahtarla(s.sheet) === anahtarla("ALIŞLAR"));
  console.log(`\n① DOSYA KİMLİĞİ`);
  console.log(`   ad     ${YOL.split(/[\\/]/).pop()}`);
  console.log(`   md5    ${md5}`);
  if (!sayfa) {
    console.log(`\n   ⛔ 'ALIŞLAR' SAYFASI YOK.\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  const basliklar = sayfa.data[2].map((h) => anahtarla(metne(h)));
  const satirlar = sayfa.data.slice(3).filter((r) => r.some((h) => metne(h) !== ""));
  console.log(`   satır  ${satirlar.length}`);

  const K = (ad: string) => basliklar.indexOf(anahtarla(ad));
  const kol = {
    magaza: K("Mağaza"), urun: K("Ürün Adı"), siparis: K("Sipariş Numarası"),
    fiyat: K("Fiyatı"), adet: K("Adet"), toplam: K("Toplam Tutar"),
    alis: K("Satın Alma Tarihi"), teslim: K("Teslim Tarihi"),
    barkod: K("Barkod"), iade: K("İade"),
  };
  const eksik = Object.entries(kol).filter(([, i]) => i < 0).map(([a]) => a);
  if (eksik.length > 0) {
    console.log(`\n   ⛔ KOLON BULUNAMADI: ${eksik.join(" · ")}\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  type Satir = {
    sira: number; magaza: string; urun: string; siparis: string; barkod: string;
    adet: number; fiyat: number; toplam: number; alis: Date | null; teslim: Date | null; iade: string;
  };
  const veri: Satir[] = satirlar.map((r, i) => ({
    sira: i + 4,
    magaza: metne(r[kol.magaza]), urun: metne(r[kol.urun]), siparis: metne(r[kol.siparis]),
    barkod: metne(r[kol.barkod]), adet: Number(r[kol.adet]) || 0,
    fiyat: Number(r[kol.fiyat]) || 0, toplam: Number(r[kol.toplam]) || 0,
    alis: tariheCevir(r[kol.alis], okumaAni), teslim: tariheCevir(r[kol.teslim], okumaAni),
    iade: metne(r[kol.iade]),
  }));

  // ═══ KİMLİK ÇÖZÜMÜ ══════════════════════════════════════════════════════
  const tekilBarkod = [...new Set(veri.map((v) => v.barkod).filter(Boolean))];
  const varyantlar = await prisma.productVariant.findMany({
    where: { OR: kodKosuluToplu(tekilBarkod) },
    select: { id: true, barcode: true, companySku: true, sku: true, channelSkus: { where: { isActive: true }, select: { channelSku: true } } },
  });
  const kodVar = new Map<string, string[]>();
  const ekle = (k: string, id: string) => {
    if (!k || !tekilBarkod.includes(k)) return;
    const l = kodVar.get(k) ?? [];
    if (!l.includes(id)) l.push(id);
    kodVar.set(k, l);
  };
  for (const v of varyantlar) {
    if (v.barcode) ekle(v.barcode, v.id);
    ekle(v.companySku, v.id);
    ekle(v.sku, v.id);
    for (const k of v.channelSkus) ekle(k.channelSku, v.id);
  }
  const urunler = await prisma.product.findMany({
    select: { name: true, variants: { where: { isDefault: true }, select: { id: true } } },
  });
  const adVar = new Map<string, string>();
  for (const u of urunler) if (u.name && u.variants[0]) adVar.set(anahtarla(u.name), u.variants[0].id);

  const mevcutAlimlar = await prisma.purchase.findMany({
    select: { supplierOrderNo: true, purchasedAt: true, items: { select: { variantId: true, quantity: true } } },
  });
  const mevcutNo = new Set(mevcutAlimlar.map((a) => a.supplierOrderNo).filter((x): x is string => Boolean(x)));
  const mevcutUclu = new Set<string>();
  for (const a of mevcutAlimlar) {
    for (const i of a.items) mevcutUclu.add(`${i.variantId}|${gunAdi(a.purchasedAt)}|${i.quantity}`);
  }
  const tedarikciler = await prisma.supplier.findMany({ select: { id: true, name: true, code: true } });
  const tedHarita = new Map(tedarikciler.map((t) => [tedarikciAnahtari(t.name), t]));

  // ═══ SINIFLANDIRMA ══════════════════════════════════════════════════════
  /** ⚠ Barkod alanına yazılmış METİN — rakam içermeyen değer kod değildir. */
  const copMu = (b: string) => b !== "" && !/\d/.test(b);
  type Cozum = { satir: Satir; variantId: string; guven: "barkod" | "ad"; tedarikciId: string };
  const yazilacaklar: Cozum[] = [];
  /** ⚠ SESSİZ DÜŞMEZ: teslim tarihi okunamayan satır sayılır ve yazılır. */
  let teslimOkunamayan = 0;
  const kova = new Map<string, number>();
  const say = (k: string) => kova.set(k, (kova.get(k) ?? 0) + 1);

  for (const s of veri) {
    if (s.adet <= 0) { say("adetSifir"); continue; }
    if (s.iade && anahtarla(s.iade) !== "0" && anahtarla(s.iade) !== "hayır") { say("iadeli"); continue; }
    if (s.alis === null) { say("tarihYok"); continue; }
    if (copMu(s.barkod)) { say("copBarkod"); continue; }
    let vid: string | null = null;
    let guven: "barkod" | "ad" = "barkod";
    if (s.barkod) {
      const l = kodVar.get(s.barkod);
      if (!l || l.length === 0) { say("eslesmeyenBarkod"); continue; }
      if (l.length > 1) { say("belirsizBarkod"); continue; }
      vid = l[0];
    } else {
      const a = s.urun ? adVar.get(anahtarla(s.urun)) : undefined;
      if (!a) { say("barkodsuz"); continue; }
      vid = a;
      guven = "ad";
    }
    /**
     * ⚠ TEDARİKÇİ OTOMATİK AÇILMAZ — Halil'in açık şartı. Eşleşmeyen
     * mağaza adı bir KAYIT DEĞİL, bir ADAYDIR; onaysız açmak defterde
     * kimsenin tanımadığı tedarikçiler doğururdu.
     */
    const ted = tedHarita.get(tedarikciAnahtari(s.magaza));
    if (!ted) { say(s.magaza === "" ? "tedarikciBos" : "tedarikciYeniAday"); continue; }
    if ((s.siparis && mevcutNo.has(s.siparis)) || mevcutUclu.has(`${vid}|${gunAdi(s.alis)}|${s.adet}`)) {
      say("zatenVar");
      continue;
    }
    if (s.teslim === null) teslimOkunamayan++;
    yazilacaklar.push({ satir: s, variantId: vid, guven, tedarikciId: ted.id });
  }

  const gruplar = new Map<string, Cozum[]>();
  for (const c of yazilacaklar) {
    const g = c.satir.siparis ? `no:${c.satir.siparis}` : `satir:${c.satir.sira}`;
    gruplar.set(g, [...(gruplar.get(g) ?? []), c]);
  }
  console.log(`\n② PLAN`);
  console.log(`   alım        ${gruplar.size}`);
  console.log(`   kalem       ${yazilacaklar.length}`);
  console.log(`     ── barkodla  ${yazilacaklar.filter((c) => c.guven === "barkod").length}`);
  console.log(`     ── ⚠ AD ile  ${yazilacaklar.filter((c) => c.guven === "ad").length}`);
  console.log(`   adet        ${yazilacaklar.reduce((t, c) => t + c.satir.adet, 0)}`);
  console.log(`   tutar       ${t2(yazilacaklar.reduce((t, c) => t + c.satir.toplam, 0))}`);
  if (teslimOkunamayan > 0) {
    console.log(`   ⚠ TESLİM TARİHİ OKUNAMAYAN ${teslimOkunamayan} — satın alma tarihine düşüldü`);
  }
  console.log(`\n   DIŞARIDA:`);
  let disarida = 0;
  for (const [k, n] of [...kova].sort((a, b) => b[1] - a[1])) {
    disarida += n;
    console.log(`     ${String(n).padStart(5)}  ${k}`);
  }
  console.log(`     ${String(disarida).padStart(5)}  TOPLAM → ${disarida + yazilacaklar.length} = ${veri.length} ${disarida + yazilacaklar.length === veri.length ? "✓" : "⛔"}`);

  /**
   * ⭐ SAYIM KAPISI KURU KOŞUMDA DA GÖRÜNÜR — kararı kuru koşum verir.
   * ⚠ ALIM YÖNÜ ARTIRAN: atlanmaz, YAZILIR ama varyant damgalanır.
   */
  {
    const { betikSayimKarari, sonSayimTarihleri } =
      await import("../src/lib/sayim-damgasi");
    const idler = [...new Set(yazilacaklar.map((c) => c.variantId))];
    const sonSayimlar = await sonSayimTarihleri(prisma, idler);
    const damgalanacak = new Set<string>();
    let atlanacak = 0;
    for (const c of yazilacaklar) {
      const k = betikSayimKarari({
        sonSayimIsTarihi: sonSayimlar.get(c.variantId) ?? null,
        hareketIsTarihi: isGunuUtc(c.satir.alis!),
        adet: c.satir.adet,
      });
      if (k.islem === "YAZ_VE_DAMGALA") damgalanacak.add(c.variantId);
      if (k.islem === "ATLA") atlanacak++;
    }
    console.log(`\n   ⭐ SAYIM KAPISI (projeksiyon)`);
    console.log(`     sayım damgalı varyant       ${sonSayimlar.size}`);
    console.log(`     ⚠ YAZILACAK + DAMGALANACAK  ${damgalanacak.size} varyant`);
    console.log(`     ⛔ ATLANACAK                 ${atlanacak}`);
    if (damgalanacak.size > 0) {
      console.log(`     → geç girilen GERÇEK alım; yazılır ama sayım geçersizleşir`);
      console.log(`     → bu varyantlar YENİDEN SAYILMALI`);
    }
  }

  if (!YAZ) {
    console.log(`\n${"=".repeat(96)}\n  ÖNİZLEME — hiçbir şey yazılmadı. Yazmak için: --yaz\n${"=".repeat(96)}\n`);
    await prisma.$disconnect();
    return;
  }

  // ═══ ÖNCE SAYIM ═════════════════════════════════════════════════════════
  const once = {
    purchase: await prisma.purchase.count(),
    item: await prisma.purchaseItem.count(),
    hareket: await prisma.stockMovement.count(),
    girisi: await prisma.stockMovement.count({ where: { type: "PURCHASE_IN" } }),
  };
  console.log(`\n③ ÖNCE SAYIM`);
  console.log(`   Purchase       ${once.purchase}`);
  console.log(`   PurchaseItem   ${once.item}`);
  console.log(`   StockMovement  ${once.hareket}   (PURCHASE_IN ${once.girisi})`);

  const parti = `alis-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;
  console.log(`\n④ YAZILIYOR — parti ${parti}`);

  /**
   * ⭐ SAYIM KAPISI — son sayım tarihleri BİR KEZ okunur.
   * ⚠ Kapsam yalnız YAZILACAK varyantlar; boş liste tüm defteri çekmez.
   */
  const { betikSayimKarari, sonSayimTarihleri, sayimGecersizlestir } =
    await import("../src/lib/sayim-damgasi");
  const yazilacakVaryantlar = [
    ...new Set([...gruplar.values()].flatMap((k) => k.map((c) => c.variantId))),
  ];
  const sonSayimlar = await sonSayimTarihleri(prisma, yazilacakVaryantlar);
  console.log(`   sayım kapısı: ${sonSayimlar.size} varyantın sayım damgası var`);
  const sayimAtlanan: { variantId: string; adet: number }[] = [];
  const sayimDamgalanan: string[] = [];

  let yazilanAlim = 0;
  let yazilanKalem = 0;
  let yazilanHareket = 0;
  let hata = 0;
  for (const [, kalemler] of gruplar) {
    const ilk = kalemler[0].satir;
    const tedKodu = tedarikciler.find((t) => t.id === kalemler[0].tedarikciId)!.code ?? "XX";
    try {
      const kod = await alimNoOlustur(prisma, tedKodu, ilk.alis!);
      const alim = await prisma.purchase.create({
        data: {
          code: kod,
          /**
           * ⚠ `RECEIVED` — mal FİİLEN gelmiş. Bu kayıtlar geçmiş
           * alımların dökümü; `ORDERED` yazsaydık stok hareketi
           * üretmemiz kendi durumumuzla çelişirdi.
           */
          status: "RECEIVED",
          supplierId: kalemler[0].tedarikciId,
          supplierOrderNo: ilk.siparis || null,
          purchasedAt: isGunuUtc(ilk.alis!),
          /**
           * ⚠ TESLİM TARİHİ KULLANILAMAZSA SATIN ALMA TARİHİNE DÜŞÜLÜR —
           * ve bu bir varsayım değil, beyan: mal geldi (`RECEIVED`), ne
           * zaman geldiği kaynakta okunamıyor. Uydurma bir gün yazmak,
           * olmayan bir kesinlik iddia etmek olurdu.
           */
          receivedAt: ilk.teslim ? isGunuUtc(ilk.teslim) : isGunuUtc(ilk.alis!),
          goodsAmount: kalemler.reduce((t, c) => t + c.satir.toplam, 0),
          goodsCurrency: "TRY",
          importBatch: parti,
          importKaynak: "alis-excel",
          /**
           * ⚠ AD EŞLEŞMESİ KAYITTA İŞARETLİ KALIR. Barkod eşleşmesiyle
           * aynı güvende değil; üç ay sonra "bu kalem nasıl bağlandı"
           * sorusunun cevabı raporda değil KAYITTA olmalı.
           */
          note: kalemler.some((c) => c.guven === "ad")
            ? "⚠ En az bir kalem ÜRÜN ADIYLA eşleştirildi (barkod yok) — barkod eşleşmesiyle aynı güvende değil."
            : null,
          items: {
            create: kalemler.map((c) => ({
              variantId: c.variantId,
              quantity: c.satir.adet,
              unitCostAmount: c.satir.fiyat,
              unitCostCurrency: "TRY" as const,
            })),
          },
        },
        select: { id: true, items: { select: { id: true, variantId: true, quantity: true, unitCostAmount: true } } },
      });
      yazilanAlim++;
      yazilanKalem += alim.items.length;
      for (const kalem of alim.items) {
        /**
         * ⭐ SAYIM KAPISI — anayasa: FİZİKSEL SAYIM SON SÖZDÜR.
         *
         * ⚠ ALIM YÖNÜ ARTIRANDIR ve ölçüm gösterdi ki bu yön MEŞRU:
         * sayımdan sonra yazılan 13 `PURCHASE_IN` (net +47) geç girilmiş
         * GERÇEK mal kabulleriydi. Atlamak, olmuş bir alımın deftere hiç
         * girmemesi olurdu. Bu yüzden YAZILIR — ama sessizce değil:
         * varyant `sayimGecersizAt` ile damgalanır ve yeniden sayılması
         * istenir. _(Anayasa: "yasak değil DURAKSAMA".)_
         */
        const kapi = betikSayimKarari({
          sonSayimIsTarihi: sonSayimlar.get(kalem.variantId) ?? null,
          hareketIsTarihi: isGunuUtc(ilk.alis!),
          adet: kalem.quantity,
        });
        if (kapi.islem === "ATLA") {
          sayimAtlanan.push({ variantId: kalem.variantId, adet: kalem.quantity });
          continue;
        }
        if (kapi.islem === "YAZ_VE_DAMGALA") sayimDamgalanan.push(kalem.variantId);
        await prisma.stockMovement.create({
          data: {
            variantId: kalem.variantId,
            type: "PURCHASE_IN",
            /** Giriş pozitiftir. */
            quantityDelta: kalem.quantity,
            /** ⚠ Satın Alma Tarihi — Halil'in şartı, İstanbul günü. */
            occurredAt: isGunuUtc(ilk.alis!),
            purchaseItemId: kalem.id,
            unitCostAmount: kalem.unitCostAmount,
            unitCostCurrency: "TRY",
          },
        });
        yazilanHareket++;
      }
      if (yazilanAlim % 200 === 0) console.log(`   … ${yazilanAlim}/${gruplar.size}`);
    } catch (e) {
      hata++;
      /**
       * ⚠ HATA MESAJI TAM YAZILIR — İLK SÜRÜM BOŞ BASIYORDU.
       * `message.split()[0]` Prisma hatalarında BOŞ SATIR düşürüyordu;
       * ekrana " — " yazılıp sebep KAYBOLUYORDU. 44 alım düştü ve niye
       * düştüğü ölçülemedi — sessiz başarısızlık yasağının (İlke #5)
       * tam kendisi.
       */
      if (hata <= 8) {
        const hm = (e as Error).message.replace(new RegExp("\\s+", "g"), " ").trim();
        const kod = (e as { code?: string }).code ?? "—";
        console.log(`   ⛔ ${ilk.siparis || "satır " + ilk.sira}  [${kod}]  ${hm.slice(-260)}`);
      }
    }
  }

  // ═══ SONRA SAYIM ════════════════════════════════════════════════════════
  const sonra = {
    purchase: await prisma.purchase.count(),
    item: await prisma.purchaseItem.count(),
    hareket: await prisma.stockMovement.count(),
    girisi: await prisma.stockMovement.count({ where: { type: "PURCHASE_IN" } }),
  };
  /**
   * ⭐ SAYIMI GEÇERSİZLEŞEN VARYANTLAR DAMGALANIR.
   * ⚠ Damga TEK AN taşır (`damgaAni`) — koşum içinde `new Date()` okunsaydı
   * aynı turun satırları farklı damga taşır ve "bu tur ne yaptı" sorusu
   * cevapsız kalırdı.
   */
  const damgaAni = new Date();
  const damgalanan = await sayimGecersizlestir(prisma, sayimDamgalanan, damgaAni);

  console.log(`\n⑤ SONRA SAYIM`);
  console.log(`   yazılan alım   ${yazilanAlim}   kalem ${yazilanKalem}   hareket ${yazilanHareket}`);
  if (hata > 0) console.log(`   ⛔ HATA        ${hata}`);
  /**
   * ⚠ SAYIM KAPISI HER ZAMAN RAPORLANIR — SIFIRSA DA. "Kapı çalıştı ve
   * kimseyi durdurmadı" ile "kapı hiç çağrılmadı" aynı şey değildir ve
   * ekranda ayırt edilebilmelidir.
   * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
   * değildir".)_
   */
  console.log(`\n   ⭐ SAYIM KAPISI`);
  console.log(`     sayım damgalı varyant       ${sonSayimlar.size}`);
  console.log(`     ⛔ ATLANAN (düşüren)         ${sayimAtlanan.length}` +
    `   adet ${sayimAtlanan.reduce((t, x) => t + x.adet, 0)}`);
  console.log(`     ⚠ YAZILDI + DAMGALANDI      ${new Set(sayimDamgalanan).size}` +
    ` varyant   (güncellenen ${damgalanan})`);
  if (sayimAtlanan.length > 0) {
    const kimlik = await prisma.productVariant.findMany({
      where: { id: { in: [...new Set(sayimAtlanan.map((x) => x.variantId))] } },
      select: { id: true, sku: true },
    });
    const ad = new Map(kimlik.map((v) => [v.id, v.sku]));
    console.log(`     ATLANAN KİMLİKLER:`);
    for (const x of sayimAtlanan.slice(0, 40)) {
      console.log(`       ${(ad.get(x.variantId) ?? "?").padEnd(18)} adet ${x.adet}`);
    }
    if (sayimAtlanan.length > 40) console.log(`       … +${sayimAtlanan.length - 40}`);
  }
  if (new Set(sayimDamgalanan).size > 0) {
    const kimlik = await prisma.productVariant.findMany({
      where: { id: { in: [...new Set(sayimDamgalanan)] } },
      select: { sku: true },
    });
    console.log(`     DAMGALANAN KİMLİKLER: ${kimlik.map((v) => v.sku).join(", ")}`);
    console.log(`     → bu varyantlar YENİDEN SAYILMALI (sayım geçersizleşti)`);
  }
  const satir = (ad: string, o: number, s: number, bek: number) => {
    const fark = s - o;
    console.log(`   ${ad.padEnd(15)} ${o} → ${s}   (fark ${fark}, beklenen ${bek}) ${fark === bek ? "✓" : "⛔ TUTMADI"}`);
  };
  satir("Purchase", once.purchase, sonra.purchase, yazilanAlim);
  satir("PurchaseItem", once.item, sonra.item, yazilanKalem);
  satir("StockMovement", once.hareket, sonra.hareket, yazilanHareket);
  satir("PURCHASE_IN", once.girisi, sonra.girisi, yazilanHareket);
  /** ⚠ TUTMAYAN SAYIM YORUMLANMAZ — Halil'in şartı. */
  console.log(`   ⚠ Tutmayan varsa YORUMLANMADI; ham hâliyle yukarıda.`);

  await prisma.auditLog.create({
    data: {
      action: "ALIS_ICE_AKTARMA",
      targetType: "Purchase",
      detail: JSON.stringify({
        parti, dosya: YOL.split(/[\\/]/).pop(), md5, dosyaSatir: veri.length,
        yazilanAlim, yazilanKalem, yazilanHareket, hata,
        adIleEslesen: yazilacaklar.filter((c) => c.guven === "ad").length,
        disarida: Object.fromEntries(kova),
        once, sonra,
        not: "Tedarikci OTOMATIK ACILMADI; eslesmeyen magaza adlari tedarikciYeniAday kovasinda.",
      }),
    },
  });
  console.log(`   ✓ AuditLog — ALIS_ICE_AKTARMA`);
  console.log(`\n   GERİ ALMA: npm run canli:alis-aktar -- --geri=${parti} --yaz\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
