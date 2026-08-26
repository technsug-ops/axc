import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";
import { UCLAR, baslikKur, kimlikOku, tumSayfalar } from "./ty/istemci";

/**
 * ============================================================================
 *  A3-③ İÇE AKTARMA — TRENDYOL SİPARİŞLERİ → `Sale` / `SaleItem`
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:ty-ice-aktar                 ← ÖNİZLEME (yazmaz)
 *      npm run canli:ty-ice-aktar -- --yaz        ← YAZAR
 *
 *  ⚠ `--yaz` VERİLMEDEN HİÇBİR ŞEY YAZILMAZ. Bayrak bilinçli olarak
 *  ZORUNLU: bu betik tek koşumda yüzlerce satır üretiyor ve yanlışlıkla
 *  çalıştırılması geri alınabilir olsa bile pahalı bir temizlik demek.
 *
 *  ⚠ BU BETİK `--yaz` DIŞINDA HİÇBİR MODDA YAZMAZ ve `api:dogrula` onu
 *  "API'ye ulaşan dosya" olarak tanıyor.
 *
 *  ═══ ONAYLANMIŞ KURALLAR (Halil, 26.08.2026) ═══
 *  · İptaller LİSTEYE GİRER, `iptalTarihi` DOLU yazılır
 *  · Çakışmada ATLA — ÜZERİNE YAZMA
 *  · `StockMovement` ÜRETİLMEZ
 *  · Geri alma = işaretleme (`importBatch` ile bulunur)
 *  · Her kayıt `importBatch` + `importKaynak` taşır
 *  · Önce/sonra sayım · `AuditLog` · ikinci koşum 0 yazmalı
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const gunArg = process.argv.find((a) => a.startsWith("--gun="));
const GUN = Math.min(Number(gunArg?.split("=")[1] ?? 60) || 60, 90);
const DILIM_GUN = 3;
const GUN_MS = 86_400_000;

/**
 * ═══ `orderDate` ÜÇ SAAT KAYMIŞ — ÖLÇÜLDÜ, VARSAYILMADI ═══════════════════
 *
 * ⚠ CANLI ÖLÇÜM 26.08.2026, defterle GÖZ GÖZE karşılaştırma (n=109 çakışan
 * sipariş — Halil'in TY PANELİNDEN okuyup girdiği `soldAt` ile):
 *
 *     HAM `orderDate` ile aynı gün      :  89/109
 *     −3 saat kaydırılmışla aynı gün    : 109/109   ← TAM
 *
 * Yani `orderDate` alanı TR duvar saatini UTC epoch'u gibi taşıyor. Ham
 * kullanılsaydı **20 sipariş yanlış güne** düşerdi — ve iç tutarlılık bunu
 * TAMAMEN gizlerdi: bütün satırlar aynı miktarda kayacağı için hiçbir
 * kontrol kırmızı yanmazdı. Kaymayı gösteren tek şey kaynağın kendi
 * ekranıydı. _(Anayasa: "dış kaynağın kendi etiketiyle karşılaştır".)_
 *
 * ⚠ İKİNCİ TANIK — paketin KENDİ geçmişi: `orderDate − packageHistories[0]`
 * farkı n=560'ta ortanca **2,994 sa**, max **3,000 sa**.
 *
 * ⚠ SABİT 3 SAAT GÜVENLİ: Türkiye 2016'dan beri kalıcı UTC+3, yaz saati
 * uygulaması YOK. DST olsaydı bu sabit yılda iki kez yanlış olurdu.
 *
 * ⚠ VE BU KAYMA YALNIZ `orderDate`E AİT: `packageHistories`, `lastModified`
 * ve `originShipmentDate` gerçek UTC taşıyor (ölçüldü — üçü birbiriyle
 * kuruşuna tutuyor). Bu yüzden iptal anına DOKUNULMAZ.
 */
const ORDERDATE_KAYMA_MS = 3 * 3600_000;

const kurus = (n: number) => Math.round(n * 100) / 100;

/** İstanbul takvim gününün UTC gece yarısı — defterdeki 144/144 satır böyle. */
function isGunuUtc(ms: number): Date {
  const g = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
  return new Date(`${g}T00:00:00.000Z`);
}

type Kaynak = "enumerasyon" | "hakediş çaprazı";

type Kalem = { barkod: string; adet: number; birimFiyat: number; kdv: number | null; komisyon: number | null };

/**
 * ═══ `price` SATIR TOPLAMIDIR, BİRİM FİYAT DEĞİL — ÖLÇÜLDÜ ═══════════════
 *
 * ⚠ CANLI ÖLÇÜM 26.08.2026, adet>1 olan 11 kalemin **11'inde de**
 * `price === amount`, yani satırın tamamı:
 *
 *     adet=2  amount=1623  price=1623   → birim 811,50
 *     adet=2  amount=3899  price=3899   → birim 1949,50
 *     adet=2  amount=7215  price=7165   → birim 3582,50
 *
 * Alan adı "price" birim fiyat gibi OKUNUYOR ve tam bu yüzden sorgusuz
 * geçilirdi. Ham yazılsaydı çok adetli her kalem **iki katı** birim
 * fiyatla girerdi ve `unitPriceAmount × quantity` gerçek cironun iki katını
 * verirdi — üstelik tek adetli 553 kalemde DOĞRU görüneceği için
 * gözden kaçardı. _(Anayasa: "bir alanın ADI, içeriğinin NE OLDUĞUNU
 * söylemez".)_
 *
 * ⚠ SIFIRA BÖLÜNMEZ: `quantity` 0 gelirse kalem yazılmaz — çağıran taraf
 * bunu ayrı sayar.
 */
export function birimFiyatCoz(satirToplami: number, adet: number): number | null {
  if (!Number.isFinite(satirToplami) || !Number.isFinite(adet) || adet <= 0) return null;
  return Math.round((satirToplami / adet) * 10000) / 10000;
}

type Aday = {
  siparisNo: string;
  kaynak: Kaynak;
  soldAt: Date;
  iptalTarihi: Date | null;
  kargoNo: string | null;
  paketSayisi: number;
  tutar: number;
  durum: string;
  kalemler: Kalem[];
};

/**
 * İPTAL ANI KAYNAĞIN KENDİ GEÇMİŞİNDEN OKUNUR — VEKİL KULLANILMAZ.
 *
 * ⚠ `orderDate`i iptal anı diye yazmak kolay olurdu ve ekranda MAKUL bir
 * tarih dururdu. Ama o sipariş anıdır, iptal anı değil — ölçülen örnekte
 * ikisi arasında 2 dakika da olabiliyor, günler de.
 *
 * ⚠ GEÇMİŞ YOKSA `null` DÖNER ve kayıt yazılmaz sayılmaz: çağıran taraf
 * bunu AYRI kovada sayar. Uydurma bir tarih, iptali "olmuş" gösterip
 * anını yanlış söylerdi. _(Anayasa: "kolon başlığı bir iddiadır".)_
 */
export function iptalAniCoz(
  gecmis: { createdDate: number; status: string }[] | null | undefined,
): Date | null {
  if (!Array.isArray(gecmis)) return null;
  const iptaller = gecmis.filter((g) => g.status === "Cancelled");
  if (iptaller.length === 0) return null;
  /** EN SONUNCUSU — bir paket iptal edilip yeniden açılıp yine iptal olabilir. */
  const enSon = Math.max(...iptaller.map((g) => Number(g.createdDate)));
  return new Date(enSon);
}

async function main() {
  const k = kimlikOku();
  if (!k) {
    console.log("\n⛔ ANAHTAR OKUNAMADI (.env.canli)\n");
    process.exitCode = 1;
    return;
  }
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });
  const baslik = baslikKur(k);
  const son = Date.now();
  const bas = son - GUN * GUN_MS;
  const okumaAni = new Date();

  /**
   * PARTİ KİMLİĞİ — koşum anına damgalı.
   * ⚠ Rastgele değil, OKUNABİLİR: geri alma komutunu yazacak insan bu
   * dizeyi elle kopyalayacak. `cuid` teknik olarak yeterdi ama kimse
   * `cl9x2...`in hangi gün koştuğunu bilemezdi.
   */
  const partiKimligi = `ty-${okumaAni.toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;

  console.log("\n" + "=".repeat(78));
  console.log(`A3-③ İÇE AKTARMA — ${YAZ ? "⚠ YAZIM MODU" : "ÖNİZLEME (yazmaz)"}`);
  console.log("=".repeat(78));
  console.log(`  parti kimliği : ${partiKimligi}`);

  const hesap = await prisma.channelAccount.findFirst({
    where: { externalId: k.saticiId },
    select: { id: true, name: true, channel: { select: { name: true } } },
  });
  if (!hesap) {
    console.log(`\n⛔ \`externalId = ${k.saticiId}\` olan kanal hesabı YOK.\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  console.log(`  kanal hesabı  : ${hesap.channel.name} — ${hesap.name}`);
  console.log(`  dönem         : ${new Date(bas).toISOString().slice(0, 10)} → ${new Date(son).toISOString().slice(0, 10)}`);

  // ═══ ÖNCE SAYIM ═════════════════════════════════════════════════════════
  const onceToplam = await prisma.sale.count();
  const onceKanal = await prisma.sale.count({ where: { channelAccountId: hesap.id } });
  console.log(`\n① ÖNCE SAYIM`);
  console.log(`   Sale TOPLAM (tüm kanallar)      ${onceToplam}`);
  console.log(`   Sale — bu kanal hesabı          ${onceKanal}`);

  // ═══ ENUMERASYON ════════════════════════════════════════════════════════
  const paketler = new Map<number, Record<string, unknown>>();
  let dilimHata = 0;
  for (let i = 0; i * DILIM_GUN < GUN + 30; i++) {
    const dSon = son - i * DILIM_GUN * GUN_MS;
    const d = await tumSayfalar(
      (s) => UCLAR.siparisler(k.saticiId, dSon - DILIM_GUN * GUN_MS, dSon, s),
      baslik,
    );
    if (d.tur === "HATA") {
      dilimHata++;
      continue;
    }
    for (const p of d.kayitlar as Record<string, unknown>[]) {
      paketler.set(Number(p.shipmentPackageId), p);
    }
  }

  /** ⚠ EBEVEYN ELENİR — bölünmüş siparişin yerini çocukları almıştır. */
  const ebeveynler = new Set<number>();
  for (const p of paketler.values()) {
    const kok = p.originPackageIds;
    if (Array.isArray(kok)) for (const id of kok) ebeveynler.add(Number(id));
  }

  const adaylar = new Map<string, Aday>();
  for (const p of paketler.values()) {
    if (ebeveynler.has(Number(p.shipmentPackageId))) continue;
    const ham = Number(p.orderDate);
    const duzeltilmis = ham - ORDERDATE_KAYMA_MS;
    if (duzeltilmis < bas || duzeltilmis > son) continue;
    const no = String(p.orderNumber);
    const lines = (p.lines ?? []) as Record<string, unknown>[];
    /**
     * ⚠ ALAN ADLARI ÖLÇÜLDÜ, TAHMİN EDİLMEDİ (n=564 kalem):
     *   `commission`     dolu 564/564 · 90 farklı oran  ← komisyon BURADA
     *   `commissionRate` HİÇ YOK (0/564)                ← ilk yazdığım ad
     *   `vatRate`        dolu 564/564 (%20 × 555, %10 × 9)
     *   `vatBaseAmount`  vatRate ile AYNI 564/564 — kopyası, kullanılmıyor
     *
     * İlk sürüm `commissionRate` okuyordu ve **her kaleme null yazacaktı**:
     * hata vermeden, sessizce. Oranı olmayan 564 kalem, kâr motoru için
     * "komisyon bilinmiyor" demek olurdu.
     */
    const kalemler: Kalem[] = lines.flatMap((l) => {
      const adet = Number(l.quantity ?? 0);
      const birim = birimFiyatCoz(Number(l.price ?? 0), adet);
      if (birim === null) return [];
      return [
        {
          barkod: String(l.barcode),
          adet,
          birimFiyat: birim,
          kdv: l.vatRate != null ? Number(l.vatRate) : null,
          komisyon: l.commission != null ? Number(l.commission) : null,
        },
      ];
    });
    const tutar = kurus(Number(p.grossAmount ?? 0) - Number(p.totalDiscount ?? 0));
    const iptalli = String(p.status) === "Cancelled";
    const mevcut = adaylar.get(no);
    if (mevcut) {
      mevcut.paketSayisi++;
      mevcut.tutar = kurus(mevcut.tutar + tutar);
      mevcut.kalemler.push(...kalemler);
      if (iptalli && !mevcut.iptalTarihi) {
        mevcut.iptalTarihi = iptalAniCoz(
          p.packageHistories as { createdDate: number; status: string }[],
        );
      }
    } else {
      adaylar.set(no, {
        siparisNo: no,
        kaynak: "enumerasyon",
        soldAt: isGunuUtc(duzeltilmis),
        iptalTarihi: iptalli
          ? iptalAniCoz(p.packageHistories as { createdDate: number; status: string }[])
          : null,
        kargoNo: p.cargoTrackingNumber ? String(p.cargoTrackingNumber) : null,
        paketSayisi: 1,
        tutar,
        durum: String(p.status),
        kalemler,
      });
    }
  }

  console.log(`\n② AKIŞ`);
  console.log(`   API paket (ebeveyn elendi: ${ebeveynler.size})   ${paketler.size}`);
  console.log(`   pencereye düşen sipariş                          ${adaylar.size}`);
  if (dilimHata > 0) console.log(`   ⚠ HATALI DİLİM: ${dilimHata} — bu koşum eksik okumuş olabilir`);

  // ═══ ÇAKIŞMA — KÜRESEL ══════════════════════════════════════════════════
  /**
   * ⚠ ÇAKIŞMA KANAL BAZINDA DEĞİL KÜRESEL ARANIYOR — VE BU BİR DÜZELTMEDİR.
   *
   * Kuru koşum çakışmayı `channelAccountId` ile SÜZEREK arıyordu. Ama
   * `Sale.code` şemada **GLOBAL `@unique`**: başka bir kanalda aynı kod
   * varsa aday burada elenmez, `INSERT` ise benzersizlik kısıtına
   * çarpardı. Kuru koşumun sayısı bu yüzden İYİMSER olabilirdi.
   */
  const mevcutKodlar = new Set(
    (
      await prisma.sale.findMany({
        where: { code: { in: [...adaylar.keys()] } },
        select: { code: true },
      })
    ).map((s) => s.code!),
  );
  const cakisanlar = [...adaylar.keys()].filter((n) => mevcutKodlar.has(n));
  for (const n of cakisanlar) adaylar.delete(n);
  console.log(`   ÇAKIŞTI → ATLANDI (ezme YOK)                     ${cakisanlar.length}`);

  // ═══ VARYANT KAPISI ═════════════════════════════════════════════════════
  const tumBarkodlar = [...new Set([...adaylar.values()].flatMap((a) => a.kalemler.map((x) => x.barkod)))];
  const varyantlar = await prisma.productVariant.findMany({
    where: { barcode: { in: tumBarkodlar } },
    select: { id: true, barcode: true },
  });
  const barkodVaryant = new Map(varyantlar.map((v) => [v.barcode!, v.id]));

  const yazilabilir: Aday[] = [];
  const yazilamaz: Aday[] = [];
  for (const a of adaylar.values()) {
    if (a.kalemler.every((x) => barkodVaryant.has(x.barkod))) yazilabilir.push(a);
    else yazilamaz.push(a);
  }
  console.log(`   YAZILABİLİR (tüm barkodlar bilinen)              ${yazilabilir.length}`);
  console.log(`   ⛔ YAZILAMAZ (barkod kataloğumuzda yok)           ${yazilamaz.length}`);

  /** ⚠ İPTAL ANI ÇÖZÜLEMEYEN AYRI SAYILIR — "yazıldı" sanılmasın. */
  const iptalliler = yazilabilir.filter((a) => a.durum === "Cancelled");
  const iptalAniYok = iptalliler.filter((a) => !a.iptalTarihi);
  console.log(`   iptal edilmiş (iptalTarihi DOLU yazılacak)       ${iptalliler.length - iptalAniYok.length}`);
  if (iptalAniYok.length > 0) {
    console.log(`   ⚠ İPTAL ANI ÇÖZÜLEMEYEN                          ${iptalAniYok.length}  ← YAZILMAZ`);
    for (const a of iptalAniYok) console.log(`        ${a.siparisNo}`);
  }
  const yazilacaklar = yazilabilir.filter((a) => !(a.durum === "Cancelled" && !a.iptalTarihi));

  console.log(`\n③ YAZILACAK: ${yazilacaklar.length} sipariş`);
  console.log(`   beklenen Sale TOPLAM = ${onceToplam} + ${yazilacaklar.length} = ${onceToplam + yazilacaklar.length}`);

  if (!YAZ) {
    console.log(`\n${"=".repeat(78)}`);
    console.log(`  ÖNİZLEME — hiçbir şey yazılmadı. Yazmak için: -- --yaz`);
    console.log("=".repeat(78) + "\n");
    await prisma.$disconnect();
    return;
  }

  // ═══ YAZIM ══════════════════════════════════════════════════════════════
  console.log(`\n④ YAZILIYOR…`);
  let yazilan = 0;
  let hata = 0;
  for (const a of yazilacaklar) {
    try {
      await prisma.sale.create({
        data: {
          code: a.siparisNo,
          channelAccountId: hesap.id,
          soldAt: a.soldAt,
          shipmentCode: a.kargoNo,
          paketSayisi: a.paketSayisi,
          iptalTarihi: a.iptalTarihi,
          /**
           * ⚠ `iptalSebebi` BOŞ BIRAKILIYOR — API sebebi söylemiyor.
           * Bir sebep seçmek (ör. MUSTERI_VAZGECTI) uydurma olurdu ve
           * iptal raporlarını sessizce kirletirdi.
           */
          importBatch: partiKimligi,
          importKaynak: a.kaynak,
          items: {
            create: a.kalemler.map((x) => ({
              variantId: barkodVaryant.get(x.barkod)!,
              quantity: x.adet,
              unitPriceAmount: x.birimFiyat,
              unitPriceCurrency: "TRY" as const,
              /**
               * ⚠ ORAN VARSA YAZILIR, YOKSA BOŞ — SIFIR YAZILMAZ.
               * `0` yazmak "komisyon alınmadı / KDV yok" demek olurdu ve
               * bu, bilmemekle aynı şey değildir.
               *
               * ⚠ KDV KANALIN KENDİ BELGESİNDEN: TY'nin uyguladığı oran,
               * bizim kategori çözümümüzden ÜSTÜNDÜR (kaynak sırası #1 —
               * kanalın kendi belgesi). Kesilen bu.
               */
              vatRate: x.kdv,
              commissionRate: x.komisyon,
            })),
          },
        },
      });
      yazilan++;
      if (yazilan % 50 === 0) console.log(`   … ${yazilan}/${yazilacaklar.length}`);
    } catch (e) {
      hata++;
      console.log(`   ⛔ ${a.siparisNo} — ${(e as Error).message.split("\n")[0].slice(0, 110)}`);
    }
  }

  // ═══ SONRA SAYIM ════════════════════════════════════════════════════════
  const sonraToplam = await prisma.sale.count();
  const sonraKanal = await prisma.sale.count({ where: { channelAccountId: hesap.id } });
  const partiSayisi = await prisma.sale.count({ where: { importBatch: partiKimligi } });

  console.log(`\n⑤ SONRA SAYIM`);
  console.log(`   yazılan                         ${yazilan}`);
  if (hata > 0) console.log(`   ⛔ HATA                          ${hata}`);
  console.log(`   Sale TOPLAM                     ${onceToplam} → ${sonraToplam}   (fark ${sonraToplam - onceToplam})`);
  console.log(`   Sale — bu kanal                 ${onceKanal} → ${sonraKanal}   (fark ${sonraKanal - onceKanal})`);
  console.log(`   importBatch = ${partiKimligi}   ${partiSayisi}`);

  /**
   * ⚠ FARK TUTMAZSA YORUMLANMAZ, YAZILIR. _(Halil'in kendi şartı.)_
   * Bir açıklama uydurmak, gerçek bir kaybı makul göstermenin en kolay
   * yoludur.
   */
  const beklenen = onceToplam + yazilacaklar.length;
  if (sonraToplam !== beklenen) {
    console.log(`\n   ⛔ SAYIM TUTMADI — beklenen ${beklenen}, ölçülen ${sonraToplam}.`);
    console.log(`      Fark ${sonraToplam - beklenen}. YORUMLANMIYOR; ham hâliyle yazıldı.`);
  } else {
    console.log(`\n   ✓ SAYIM TUTTU — beklenen ${beklenen} = ölçülen ${sonraToplam}`);
  }

  // ═══ İZ ═════════════════════════════════════════════════════════════════
  await prisma.auditLog.create({
    data: {
      action: "TY_SIPARIS_ICE_AKTARMA",
      targetType: "ChannelAccount",
      targetId: hesap.id,
      detail: JSON.stringify({
        partiKimligi,
        okumaAni: okumaAni.toISOString(),
        pencere: { bas: new Date(bas).toISOString(), son: new Date(son).toISOString(), gun: GUN },
        adayToplam: adaylar.size + cakisanlar.length,
        cakisanAtlandi: cakisanlar.length,
        yazilamazBarkod: yazilamaz.length,
        iptalAniCozulemedi: iptalAniYok.length,
        yazilan,
        hata,
        saleOnce: onceToplam,
        saleSonra: sonraToplam,
        dilimHata,
        not: "StockMovement URETILMEDI - stok bagi ayri karar.",
      }),
    },
  });
  console.log(`   ✓ AuditLog yazıldı — TY_SIPARIS_ICE_AKTARMA`);

  console.log(`\n${"=".repeat(78)}`);
  console.log(`  GERİ ALMA: importBatch = ${partiKimligi}`);
  console.log(`  ⚠ Geri alma SİLME değil İŞARETLEMEdir (iptalTarihi).`);
  console.log(`  ⛔ StockMovement ÜRETİLMEDİ — stok bağı ayrı ve sonraki karar.`);
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

/**
 * ═══ İÇERİ ALINDIĞINDA KOŞMAZ — VE BU BİR KUSUR DÜZELTMESİDİR ════════════
 *
 * ⚠ İlk sürüm `main()`i modül gövdesinde çağırıyordu. Bekçi saf kuralları
 * (`birimFiyatCoz`, `iptalAniCoz`) import edince **canlı API koşumu
 * başlıyordu** — ve `--yaz` argv'de bulunsaydı bekçi koşarken YAZARDI.
 * Yakalanmasının tek sebebi bekçi çıktısının başında bu betiğin
 * başlığının belirmesiydi.
 *
 * ⚠ ÖLÇÜT DOSYA ADI DEĞİL: `process.argv[1]` bu dosyayı gösteriyorsa
 * doğrudan çalıştırılmıştır. Bir modülün "ben mi koşuyorum" sorusuna
 * cevabı, adının bir yerde geçmesi değildir.
 */
const dogrudanKosuluyor = (() => {
  const giris = process.argv[1] ?? "";
  return /canli-ty-ice-aktar\.(ts|js)$/.test(giris.split("\\").join("/"));
})();

if (dogrudanKosuluyor) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
