import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K56 — SATIŞ İÇE AKTARMA · YAZIM
 * ----------------------------------------------------------------------------
 *      npm run canli:satis-aktar -- --dosya="<yol>"          → ÖNİZLEME
 *      npm run canli:satis-aktar -- --dosya="<yol>" --yaz    → YAZAR
 *      npm run canli:satis-aktar -- --geri=<batch> --yaz     → geri alma
 *
 *  ⚠ SINIFLANDIRMA KURU KOŞUMUN AYNISI ve tarih kapısı ORTAK gövdeden.
 *
 *  ═══ KURU KOŞUMDAN GELEN KARARLAR ═══
 *  · Ad eşleştirmesi KULLANILMAZ — yalnız TAM kod eşleşmesi.
 *  · Tür farklı satırlar (iade · tazmin · iptal …) SATIŞ YAZILMAZ.
 *  · Çakışmada ATLA — ezme yok.
 *  · Hesap sütunları (kâr · ROI · komisyon · KDV · stopaj) YAZILMAZ —
 *    motor kendi hesaplar.
 *  · Parti yoksa `SALE_OUT` YAZILMAZ, negatif stok üretilmez.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
/**
 * ⚠ `--kar-tazele` — YAZIMDAN SONRAKİ EKSİK ADIM.
 *
 * ⛔ CANLI KUSUR 27.08.2026: bu betik satışı ve `SALE_OUT` hareketini
 * yazıyor ama KÂR MOTORUNU HİÇ ÇAĞIRMIYORDU. Sonuç: **2757 satışın
 * maliyet bağı VAR ama `profitStatus` null** — ekran onları "bağ
 * bekliyor" diye sayıyordu ve bu bir VERİ eksiği sanıldı.
 *
 * Gerçekte bir HESAP eksiğiydi ve tek komut uzaktaydı. Kova ölçümü
 * yapılmasaydı görünmezdi: sayı doğruydu, ANLAMI yanlıştı.
 * _(Anayasa: "metin, sahip olmadığı anlamı iddia etmez".)_
 *
 * ⚠ Alım tarafındaki `canli:stok-bagi` bunu ZATEN yapıyordu; iki yol
 * sessizce ayrışmıştı.
 */
const KAR_TAZELE = process.argv.includes("--kar-tazele");
const dosyaArg = process.argv.find((a) => a.startsWith("--dosya="));
const geriArg = process.argv.find((a) => a.startsWith("--geri="));
const YOL = dosyaArg?.slice("--dosya=".length) ?? "";
const GERI = geriArg?.slice("--geri=".length) ?? null;

const t2 = (n: number) => n.toFixed(2).padStart(14);
const metne = (v: unknown): string =>
  v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : String(v).trim();
const gunAdi = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
const isGunuUtc = (d: Date) => new Date(`${gunAdi(d)}T00:00:00.000Z`);

const SATIS_TURU = "satış";

/**
 * ═══ KANAL ETİKETİ → HESAP ═══════════════════════════════════════════════
 *
 * ⚠ DOSYA YALNIZ KANALI SÖYLÜYOR, HESABI DEĞİL — ve kanal başına birden
 * çok hesap var (ölçüldü 26.08.2026: 16 hesap).
 *
 * Ölçüt: o kanalda SATIŞI OLAN hesap. Bugün TY/HB/N11'de tek tek var
 * (AXCALI, 556/26/6 satış) ve API içe aktarması da o hesaba yazdı.
 *
 * ⛔ AMAZON'DA ÜÇ HESAP VAR VE ÜÇÜ DE SIFIR SATIŞLI (EKREM · S.ahmet ·
 * SEDA). Hangisine yazılacağı VERİDEN ÇIKMIYOR; tahmin etmek satışı
 * yanlış hesaba yazmak olurdu. AMZN satırları AYRI kovada bekliyor.
 *
 * ⛔ ESKİ GEREKÇE — ÇÜRÜDÜ, SİLİNMİYOR (28.08.2026):
 *
 *     "`DEPO` BİR KANAL DEĞİL — pazaryeri değil, depo hareketi.
 *      Satış olarak yazmak ciroyu şişirirdi."
 *
 * Kullanıcı düzeltti: **DEPO, ELDEN YAPILAN SATIŞLARIN yazıldığı yerdir.**
 * Alışı ve satışı var, yalnız pazaryeri komisyonu yok. Cümlenin ikinci
 * yarısı tersmiş: yazmamak ciroyu ŞİŞİRMİYOR, EKSİK BIRAKIYOR.
 * Ölçüldü: 12 satırın 11'inde komisyon ve kargo SIFIR.
 * _(Anayasa: "eski gerekçe silinmez" — niye çevrildiğiyle birlikte durur.)_
 */
const KANAL_ESLEMESI: Record<string, string> = {
  TY: "Trendyol",
  HB: "Hepsiburada",
  N11: "N11",
  DEPO: "Elden Satış",
};

/**
 * ═══ ADIM 2 KAPISI — HENÜZ YAZILAMAYAN KANALLAR ═════════════════════════
 *
 * ⛔ Kanal eşlemesinde OLMAK, o satırın YAZILABİLİR olduğunu göstermez.
 * DEPO satırları iki ayrı sebeple bugün yazılamaz ve ikisi de ölçüldü:
 *
 *   ① `Sipariş Numarası` kolonu DEPO satırlarında BARKOD taşıyor
 *      (`8720389039577`, `5702017747682` …), sipariş numarası DEĞİL.
 *      Olduğu gibi yazılsaydı barkod `Sale.code`a girerdi — hem yanlış
 *      hem `@unique` çakışması. Elden satışın sipariş numarası YOKTUR;
 *      doğru değer `null`dur ve bunu ayrı bir akış yazmalı.
 *   ② KDV ve stopajın elden satışta işleyip işlemediği CEVAPLANMADI.
 *      `ChannelFee` kümesi o cevaba bağlı; tahmin NET-2'yi bozar.
 *
 * ⚠ Kapı BEYANDIR, unutulmuş bir eksik değil: kanal eşlemesini eklemek
 * ile satırı yazmak AYRI kararlardır ve ikincisi henüz verilmedi.
 * Açılış: cevap gelince bu kümeden `DEPO` çıkarılır.
 */
const ADIM2_BEKLEYEN = new Set(["DEPO"]);

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
  const { kodKosuluToplu } = await import("../src/lib/varyant-arama-kurali");
  const { iceAktarmaTarihi } = await import("../src/lib/ice-aktarma-tarih-kapisi");
  const okumaAni = new Date();

  console.log("\n" + "=".repeat(98));
  console.log(
    `K56 SATIŞ İÇE AKTARMA — ${GERI ? `⚠ GERİ ALMA (${GERI})` : YAZ ? "⚠ YAZIM" : "ÖNİZLEME (yazmaz)"}`,
  );
  console.log("=".repeat(98));

  // ═══ GERİ ALMA ══════════════════════════════════════════════════════════
  if (GERI) {
    /**
     * ⚠ SATIŞ GERİ ALMASI İŞARETLEMEDİR — silme değil. `Sale` silinseydi
     * `StockMovement.saleItemId` SetNull ile boşalır, stok düşük kalır ve
     * DÜŞÜREN kaybolurdu. _(Anayasa: "silme kararı: ilke ihlali değil,
     * veri bozan işlem".)_
     * ⚠ Stok hareketleri AYRICA ters kayıtla geri verilir.
     */
    const satislar = await prisma.sale.findMany({
      where: { importBatch: GERI },
      select: {
        id: true, code: true, iptalTarihi: true,
        items: { select: { id: true, variantId: true, stockMovements: { select: { id: true, quantityDelta: true, occurredAt: true, locationId: true } } } },
      },
    });
    const hareketler = satislar.flatMap((s) => s.items.flatMap((i) => i.stockMovements));
    console.log(`\n  importBatch  ${GERI}`);
    console.log(`  satış        ${satislar.length}   (zaten iptalli ${satislar.filter((s) => s.iptalTarihi).length})`);
    console.log(`  stok hareketi ${hareketler.length}`);
    if (satislar.length === 0) {
      console.log(`\n  ⛔ BU PARTİDE SATIŞ YOK.\n`);
      await prisma.$disconnect();
      return;
    }
    if (!YAZ) {
      console.log(`\n  RAPOR — yazmak için: -- --geri=${GERI} --yaz\n`);
      await prisma.$disconnect();
      return;
    }
    let ters = 0;
    for (const s of satislar) {
      for (const i of s.items) {
        for (const h of i.stockMovements) {
          await prisma.stockMovement.create({
            data: {
              variantId: i.variantId,
              type: "ADJUSTMENT",
              /** Çıkış negatifti — düzeltme pozitif döner. */
              quantityDelta: -h.quantityDelta,
              occurredAt: h.occurredAt,
              locationId: h.locationId,
              note: `satış içe aktarma geri alındı — ${GERI}`,
            },
          });
          ters++;
        }
      }
    }
    const isaretlenen = await prisma.sale.updateMany({
      where: { importBatch: GERI, iptalTarihi: null },
      data: { iptalTarihi: okumaAni },
    });
    await prisma.auditLog.create({
      data: {
        action: "SATIS_ICE_AKTARMA_GERI",
        targetType: "Sale",
        detail: JSON.stringify({ importBatch: GERI, satis: satislar.length, isaretlenen: isaretlenen.count, tersHareket: ters }),
      },
    });
    console.log(`\n  ✓ ${isaretlenen.count} satış iptal işaretlendi · ${ters} ters stok kaydı`);
    console.log(`  ⚠ Hiçbir kayıt SİLİNMEDİ.\n`);
    await prisma.$disconnect();
    return;
  }

  // ═══ KÂR TAZELEME ══════════════════════════════════════════════════════
  if (KAR_TAZELE) {
    const { satisKarTazele } = await import("../src/lib/kar-yeniden");
    /**
     * ⚠ KAPSAM: maliyet bağı OLAN ama kârı hesaplanmamış satışlar.
     * Bağı olmayanlara DOKUNULMAZ — onların maliyeti yok; hesap
     * çalıştırmak `NO_COST` damgası basıp gerçek eksiği GİZLERDİ.
     */
    const adaylar = await prisma.sale.findMany({
      where: {
        importBatch: { not: null },
        iptalTarihi: null,
        profitStatus: null,
        items: { some: { stockMovements: { some: {} } } },
      },
      select: { id: true },
    });
    console.log(`\n  KÂR TAZELEME — ${adaylar.length} satış (maliyet bağı VAR, kârı yok)`);
    if (!YAZ) {
      console.log(`  RAPOR — yazmak için: -- --kar-tazele --yaz\n`);
      await prisma.$disconnect();
      return;
    }
    let ok = 0;
    let yok = 0;
    for (const a of adaylar) {
      if (await satisKarTazele(a.id)) ok++;
      else yok++;
      if ((ok + yok) % 500 === 0) console.log(`   … ${ok + yok}/${adaylar.length}`);
    }
    const kalan = await prisma.sale.count({
      where: { importBatch: { not: null }, iptalTarihi: null, profitStatus: null },
    });
    console.log(`  tazelendi ${ok}` + (yok > 0 ? `   ⛔ tazelenemedi ${yok}` : ""));
    console.log(`  kârı HÂLÂ hesaplanmamış: ${kalan}   ← maliyet bağı olmayanlar`);
    await prisma.auditLog.create({
      data: {
        action: "SATIS_ICE_AKTARMA_KAR",
        targetType: "Sale",
        detail: JSON.stringify({ aday: adaylar.length, tazelendi: ok, tazelenemedi: yok, kalan }),
      },
    });
    console.log(`  ✓ AuditLog — SATIS_ICE_AKTARMA_KAR\n`);
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
  const sayfa = sayfalar.find((s) => anahtarla(s.sheet) === anahtarla("SATIŞ"));
  console.log(`\n① DOSYA KİMLİĞİ`);
  console.log(`   ad     ${YOL.split(/[\\/]/).pop()}`);
  console.log(`   md5    ${md5}`);
  if (!sayfa) {
    console.log(`\n   ⛔ 'SATIŞ' SAYFASI YOK.\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  const basliklar = sayfa.data[5].map((h) => anahtarla(metne(h)));
  const satirlar = sayfa.data.slice(6).filter((r) => r.some((h) => metne(h) !== ""));
  console.log(`   satır  ${satirlar.length}`);

  const K = (ad: string) => basliklar.indexOf(anahtarla(ad));
  const kol = {
    siparis: K("Sipariş Numarası"), sku: K("SKU"), barkod: K("AXCALI BARKOD"),
    kanal: K("PAZAR YERI"), urun: K("Ürün"), tur: K("TÜR"),
    adet: K("Satış Miktarı"), tarih: K("Tarih"), fiyat: K("ÜRÜN LİSTE FİYATI"),
  };
  const eksik = Object.entries(kol).filter(([, i]) => i < 0).map(([a]) => a);
  if (eksik.length > 0) {
    console.log(`\n   ⛔ KOLON BULUNAMADI: ${eksik.join(" · ")}\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  type Satir = {
    sira: number; siparis: string; sku: string; barkod: string; kanal: string;
    urun: string; tur: string; adet: number; fiyat: number;
    kapi: ReturnType<typeof iceAktarmaTarihi>;
  };
  const veri: Satir[] = satirlar.map((r, i) => ({
    sira: i + 7,
    siparis: metne(r[kol.siparis]), sku: metne(r[kol.sku]), barkod: metne(r[kol.barkod]),
    kanal: metne(r[kol.kanal]), urun: metne(r[kol.urun]), tur: metne(r[kol.tur]),
    adet: Number(r[kol.adet]) || 0, fiyat: Number(r[kol.fiyat]) || 0,
    kapi: iceAktarmaTarihi(r[kol.tarih], okumaAni),
  }));

  // ═══ KİMLİK ═════════════════════════════════════════════════════════════
  const kodlar = [...new Set([...veri.map((v) => v.sku), ...veri.map((v) => v.barkod)].filter(Boolean))];
  const varyantlar = await prisma.productVariant.findMany({
    where: { OR: kodKosuluToplu(kodlar) },
    select: { id: true, sku: true, barcode: true, companySku: true, channelSkus: { where: { isActive: true }, select: { channelSku: true } } },
  });
  const kodVar = new Map<string, string[]>();
  const ekle = (k: string, id: string) => {
    if (!k || !kodlar.includes(k)) return;
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
  const defterKod = new Set(
    (await prisma.sale.findMany({ where: { code: { not: null } }, select: { code: true } })).map((s) => s.code!),
  );

  /**
   * ⚠ KANAL → SATIŞ ROLÜ SEÇİLMİŞ hesap. Belirsizse yazılmaz.
   *
   * ⛔ ÖLÇÜT DEĞİŞTİ 28.08.2026 — ESKİSİ: "satışı OLAN hesap"
   * (`_count.sales > 0`). O ölçüt YENİ AÇILAN bir kanalı yapısal olarak
   * dışlıyordu: DEPO hesabı doğduğu gün sıfır satışlıdır, dolayısıyla
   * "belirsiz" sayılır ve kendi satırları hiç yazılamazdı. Yani ölçüt,
   * kendi ön şartını asla sağlanamaz kılıyordu.
   *
   * YENİSİ: `satisIcin = true` olan hesap — bu bir ROL BEYANIDIR, geçmişin
   * yan etkisi değil. Kullanıcı formda tek seçimle beyan ediyor.
   *
   * ⚠ ÖLÇÜLDÜ, DAVRANIŞ DEĞİŞMİYOR: TY · HB · N11'in her birinde `satisIcin`
   * taşıyan TEK hesap var (AXCALI) ve o zaten satışı olan hesabın kendisi.
   * Amazon'un üç hesabının üçü de `satisIcin=false` — eskiden de belirsizdi,
   * şimdi de belirsiz. Ölçüt gevşetilmedi, DOĞRU SORUYA bağlandı.
   */
  const hesaplar = await prisma.channelAccount.findMany({
    select: {
      id: true, name: true, satisIcin: true,
      channel: { select: { name: true } },
      _count: { select: { sales: true } },
    },
  });
  const kanalHesap = new Map<string, string>();
  const belirsizKanal = new Set<string>();
  for (const [etiket, kanalAdi] of Object.entries(KANAL_ESLEMESI)) {
    const adaylar = hesaplar.filter((h) => anahtarla(h.channel.name) === anahtarla(kanalAdi));
    const satisRolu = adaylar.filter((h) => h.satisIcin);
    if (satisRolu.length === 1) kanalHesap.set(etiket, satisRolu[0].id);
    else belirsizKanal.add(etiket);
  }
  console.log(`\n   KANAL → HESAP:`);
  for (const [e, id] of kanalHesap) {
    const h = hesaplar.find((x) => x.id === id)!;
    console.log(`     ${e.padEnd(6)} → ${h.channel.name} — ${h.name}   (${h._count.sales} satış)`);
  }
  for (const e of belirsizKanal) console.log(`     ${e.padEnd(6)} ⛔ BELİRSİZ — yazılmaz`);

  const copMu = (k: string) => k !== "" && !/\d/.test(k);
  const tyDesen = /^1\d{10}$/;
  const hbDesen = /^4\d{9}$/;

  type Cozum = { s: Satir; variantId: string; hesapId: string; tarih: Date };
  const yazilacaklar: Cozum[] = [];
  const kova = new Map<string, number>();
  const say = (k: string) => kova.set(k, (kova.get(k) ?? 0) + 1);

  for (const s of veri) {
    if (anahtarla(s.tur) !== anahtarla(SATIS_TURU)) { say("turFarkli"); continue; }
    if (s.adet <= 0) { say("adetSifir"); continue; }
    if (s.kapi.tur === "OKUNAMADI") { say("tarihOkunamayan"); continue; }
    if (s.kapi.tur === "COK_ESKI") { say("tarihCokEski"); continue; }
    if (s.kapi.tur === "GELECEKTE") { say("gelecekTarihli"); continue; }
    if (!s.siparis) { say("numarasiz"); continue; }
    if (defterKod.has(s.siparis)) { say("zatenVar"); continue; }
    if (copMu(s.sku)) { say("copSku"); continue; }
    const aday = [s.sku, s.barkod].filter(Boolean).map((k) => kodVar.get(k)).find((l) => l && l.length > 0);
    if (!aday) { say("eslesmeyenListing"); continue; }
    if (aday.length > 1) { say("belirsizSku"); continue; }
    if (ADIM2_BEKLEYEN.has(s.kanal.toUpperCase())) { say("adim2Bekliyor"); continue; }
    const hesapId = kanalHesap.get(s.kanal.toUpperCase());
    if (!hesapId) { say("kanalCozulemedi"); continue; }
    /**
     * ⚠ KANAL ETİKETİ İLE NUMARA BİÇİMİ ÇELİŞİYORSA YAZILMAZ.
     * Ölçüldü: HB numaraları 10 hane "4", TY 11 hane "1". Defterde
     * karşılığı olmayan satırda "defter kazanır" kuralı uygulanamaz —
     * ve yanlış kanala yazmak KESİNTİ KURALLARINI değiştirir (HB
     * komisyona %20 KDV + ₺12,60; TY ₺13,19 sabit), yani NET sessizce
     * yanlış çıkar. _(Anayasa: "ilke, kendi kapsamının dışına
     * uygulanırsa hatayı korur" — orada YANLIŞ kanalla hesaplanmış bir
     * snapshot korunuyordu; burada onu üretmemek için duruyoruz.)_
     */
    const etiket = s.kanal.toUpperCase();
    if ((etiket === "TY" && hbDesen.test(s.siparis)) || (etiket === "HB" && tyDesen.test(s.siparis))) {
      say("kanalCeliskisi");
      continue;
    }
    yazilacaklar.push({ s, variantId: aday[0], hesapId, tarih: s.kapi.tarih });
  }

  const gruplar = new Map<string, Cozum[]>();
  for (const c of yazilacaklar) gruplar.set(c.s.siparis, [...(gruplar.get(c.s.siparis) ?? []), c]);

  console.log(`\n② PLAN`);
  console.log(`   satış   ${gruplar.size}`);
  console.log(`   kalem   ${yazilacaklar.length}`);
  console.log(`   tutar   ${t2(yazilacaklar.reduce((t, c) => t + c.s.fiyat * c.s.adet, 0))}`);
  console.log(`\n   DIŞARIDA:`);
  let disarida = 0;
  for (const [k, n] of [...kova].sort((a, b) => b[1] - a[1])) {
    disarida += n;
    console.log(`     ${String(n).padStart(5)}  ${k}`);
  }
  console.log(`     ${String(disarida).padStart(5)}  TOPLAM → ${disarida + yazilacaklar.length} = ${veri.length} ${disarida + yazilacaklar.length === veri.length ? "✓" : "⛔"}`);

  if (!YAZ) {
    console.log(`\n${"=".repeat(98)}\n  ÖNİZLEME — hiçbir şey yazılmadı. Yazmak için: --yaz\n${"=".repeat(98)}\n`);
    await prisma.$disconnect();
    return;
  }

  // ═══ ÖNCE SAYIM ═════════════════════════════════════════════════════════
  const once = {
    sale: await prisma.sale.count(),
    item: await prisma.saleItem.count(),
    hareket: await prisma.stockMovement.count(),
    cikis: await prisma.stockMovement.count({ where: { type: "SALE_OUT" } }),
  };
  console.log(`\n③ ÖNCE SAYIM`);
  console.log(`   Sale           ${once.sale}`);
  console.log(`   SaleItem       ${once.item}`);
  console.log(`   StockMovement  ${once.hareket}   (SALE_OUT ${once.cikis})`);

  const parti = `satis-${okumaAni.toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;
  console.log(`\n④ YAZILIYOR — parti ${parti}`);

  /** ⚠ Açık partiler BİR KEZ okunur, tüketim koşum içinde taşınır. */
  const { acikPartilerToplu, fifoDagit } = await import("../src/lib/stok");
  const varyantIds = [...new Set(yazilacaklar.map((c) => c.variantId))];
  const partiler = await acikPartilerToplu(prisma, varyantIds);
  const kalanPartiler = new Map(varyantIds.map((v) => [v, partiler.get(v) ?? []]));

  /** ⚠ TARİH SIRASINDA — eski satış eski partiyi tüketsin. */
  const sirali = [...gruplar].sort(
    (a, b) => a[1][0].tarih.getTime() - b[1][0].tarih.getTime(),
  );
  let yazilanSatis = 0, yazilanKalem = 0, yazilanHareket = 0, hata = 0, hareketAtlanan = 0;
  for (const [siparisNo, kalemler] of sirali) {
    try {
      const satis = await prisma.sale.create({
        data: {
          code: siparisNo,
          channelAccountId: kalemler[0].hesapId,
          soldAt: isGunuUtc(kalemler[0].tarih),
          importBatch: parti,
          importKaynak: "satis-excel",
          /**
           * ⚠ HESAP SÜTUNLARI YAZILMIYOR (kâr · ROI · komisyon · KDV ·
           * stopaj · %15). Motor kendi hesaplar; dosyanınkini yazmak iki
           * farklı gerçek üretirdi.
           */
          items: {
            create: kalemler.map((c) => ({
              variantId: c.variantId,
              quantity: c.s.adet,
              unitPriceAmount: c.s.fiyat,
              unitPriceCurrency: "TRY" as const,
            })),
          },
        },
        select: { id: true, items: { select: { id: true, variantId: true, quantity: true } } },
      });
      yazilanSatis++;
      yazilanKalem += satis.items.length;

      for (const kalem of satis.items) {
        const mevcut = kalanPartiler.get(kalem.variantId) ?? [];
        const sonuc = fifoDagit(mevcut, kalem.quantity);
        /** ⚠ PARTİ YOKSA HAREKET YAZILMAZ — negatif stok üretilmez. */
        if (!sonuc.yeterliMi) { hareketAtlanan++; continue; }
        kalanPartiler.set(kalem.variantId, sonuc.kalanPartiler);
        for (const pay of sonuc.dagitim) {
          await prisma.stockMovement.create({
            data: {
              variantId: kalem.variantId,
              type: "SALE_OUT",
              quantityDelta: -pay.adet,
              occurredAt: isGunuUtc(kalemler[0].tarih),
              saleItemId: kalem.id,
              sourceMovementId: pay.parti.hareketId,
              locationId: pay.parti.locationId,
              unitCostAmount: pay.parti.birimMaliyet,
              unitCostCurrency: pay.parti.birimMaliyetParaBirimi,
            },
          });
          yazilanHareket++;
        }
      }
      if (yazilanSatis % 500 === 0) console.log(`   … ${yazilanSatis}/${gruplar.size}`);
    } catch (e) {
      hata++;
      /** ⚠ MESAJ TAM TAŞINIR — kısaltma yalnız gösterimde. */
      if (hata <= 8) {
        const hm = (e as Error).message.replace(new RegExp("\\s+", "g"), " ").trim();
        console.log(`   ⛔ ${siparisNo}  ${hm.slice(-200)}`);
      }
    }
  }

  const sonra = {
    sale: await prisma.sale.count(),
    item: await prisma.saleItem.count(),
    hareket: await prisma.stockMovement.count(),
    cikis: await prisma.stockMovement.count({ where: { type: "SALE_OUT" } }),
  };
  console.log(`\n⑤ SONRA SAYIM`);
  console.log(`   yazılan satış ${yazilanSatis} · kalem ${yazilanKalem} · hareket ${yazilanHareket}`);
  console.log(`   ⛔ parti yok, hareket atlandı  ${hareketAtlanan}`);
  if (hata > 0) console.log(`   ⛔ HATA ${hata}`);
  const satir = (ad: string, o: number, s: number, bek: number) =>
    console.log(`   ${ad.padEnd(15)} ${o} → ${s}   (fark ${s - o}, beklenen ${bek}) ${s - o === bek ? "✓" : "⛔ TUTMADI"}`);
  satir("Sale", once.sale, sonra.sale, yazilanSatis);
  satir("SaleItem", once.item, sonra.item, yazilanKalem);
  satir("StockMovement", once.hareket, sonra.hareket, yazilanHareket);
  satir("SALE_OUT", once.cikis, sonra.cikis, yazilanHareket);
  console.log(`   ⚠ Tutmayan varsa YORUMLANMADI; ham hâliyle yukarıda.`);

  await prisma.auditLog.create({
    data: {
      action: "SATIS_ICE_AKTARMA",
      targetType: "Sale",
      detail: JSON.stringify({
        parti, dosya: YOL.split(/[\\/]/).pop(), md5, dosyaSatir: veri.length,
        yazilanSatis, yazilanKalem, yazilanHareket, hareketAtlanan, hata,
        disarida: Object.fromEntries(kova), once, sonra,
        not: "Hesap sutunlari YAZILMADI (kar/ROI/komisyon/KDV/stopaj) - motor kendi hesaplar. Parti yoksa SALE_OUT yazilmadi.",
      }),
    },
  });
  console.log(`   ✓ AuditLog — SATIS_ICE_AKTARMA`);
  console.log(`\n   GERİ ALMA: npm run canli:satis-aktar -- --geri=${parti} --yaz\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
