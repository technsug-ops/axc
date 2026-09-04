import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { kilitDurumu } from "./bekci-kilit";
import { canliYapilandirma } from "./canli-ortak";
import {
  UCLAR,
  baslikKur,
  isGunuUtc,
  kimlikOku,
  siparisAni,
  tumSayfalar,
} from "./ty/istemci";
import { kodKosuluToplu } from "../src/lib/varyant-arama-kurali";

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
 * ⚠ `orderDate` KAYMASI VE İŞ GÜNÜ ÇEVİRİMİ ORTAK GÖVDEDEN GELİYOR
 * (`ty/istemci.ts`). Burada yerel kopyaları vardı; mutabakat aracı aynı
 * düzeltmeyi almadığı için **44 sipariş yanlışlıkla SAPAN ilan edildi**.
 * Tek gövde, iki okuyucu.
 */

const kurus = (n: number) => Math.round(n * 100) / 100;


type Kaynak = "enumerasyon" | "hakediş çaprazı";

type Kalem = { barkod: string; adet: number; birimFiyat: number; kdv: number | null; komisyon: number | null };

/**
 * ═══ `price` BİRİM FİYATTIR — HAKEDİŞLE KANITLANDI (29.08.2026) ══════════
 *
 * ⛔ BU GÖVDE ÖNCE BÖLÜYORDU VE YANLIŞTI. Eski gerekçe SİLİNMİYOR (anayasa:
 * "karar çevrildiğinde önceki savunma, NİYE çevrildiğiyle birlikte
 * dosyada bırakılır"):
 *
 *   _26.08.2026 ölçümü: adet>1 olan 11 kalemin 11'inde de `price === amount`.
 *   Buradan "price satırın tamamıdır" sonucu çıkarıldı ve adete bölündü._
 *
 * ⚠ ÖLÇÜM GERÇEKTİ, ÇIKARIM YANLIŞTI. `price === amount` eşitliği İKİ
 * OKUMAYLA DA UYUMLUDUR; ayırt edici kanıt hiç aranmamıştı.
 *
 * ⭐ AYIRT EDİCİ KANIT — KANALIN KENDİ ÖDEME KAYDI (hakediş):
 * `11373352181` · adet 2 · API `price` 2074 · komisyon oranı %8,5
 *
 *     hakediş: SIPARIS_TUTARI 1897,71  ·  SIPARIS_TUTARI 1897,71   (İKİ SATIR)
 *     1897,71 = 2074 − 176,29   (2074'ün %8,5'i)
 *
 * Trendyol BİRİM BAŞINA 1897,71 ödemiş ve İKİ satır yazmış. Yani birim
 * fiyat 2074, sipariş toplamı 4148. Bölme, ciroyu ve komisyonu YARIYA
 * indiriyordu; altı siparişin altısı da bu yüzden ZARARDA görünüyordu.
 * _(Kaynak önceliği: kanalın kendi belgesi > bizim çıkarımımız.)_
 *
 * ⚠ VE ADI YİNE ALDATICI DEĞİLDİ: alan "price" ve gerçekten birim fiyat.
 * Yanlış olan, adına DEĞİL, sınanmamış bir çıkarıma güvenmekti.
 *
 * ⛔ ADETLE ÇARPMA DA YOK: motor zaten `unitPriceAmount × quantity`
 * yapıyor (`kar.ts` → `satisTutari`). Burada çarpmak çift sayım olurdu.
 */
export function birimFiyatCoz(birimFiyat: number, adet: number): number | null {
  if (!Number.isFinite(birimFiyat) || !Number.isFinite(adet) || adet <= 0) {
    return null;
  }
  return birimFiyat;
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

/**
 * ═══ BEKÇİ TURU KOŞARKEN CANLI YAZIM KOŞMAZ (K162-②) ═════════════════════
 * Mutasyon harness'leri kaynak dosyaları anlık bozup geri yazar ve bu
 * betiğin import zinciri o hedef listesiyle KESİŞİYOR (ölçüldü 04.09.2026:
 * `varyant-arama-kurali.ts` bir harness'in hedefi). Tur sırasında koşan bir
 * çekim MUTANT arama kuralıyla siparişi yanlış varyanta bağlayabilirdi —
 * 5 dk'lık rutin bu pencereyi her turda 2-3 kez açıyor.
 *
 * Kapı: `.bekci-kilidi` varken bu koşum ATLANIR ve sebebi yazılır (sessiz
 * değil); çıkış 0 — zamanlayıcı hata saymaz, sonraki koşum yakalar.
 * Bekçisi: `ice-aktarma:dogrula` (kaldıran ve körelten mutasyon sınandı).
 */
function bekciTuruKosuyorMu(): boolean {
  return kilitDurumu().canli;
}

async function main() {
  if (bekciTuruKosuyorMu()) {
    console.log("");
    console.log("⏭ BEKÇİ TURU KOŞUYOR (.bekci-kilidi) — bu çekim ATLANDI; sonraki koşum yakalar.");
    console.log("");
    return;
  }
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
    const duzeltilmis = siparisAni(Number(p.orderDate));
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
  /**
   * ═══ KİMLİK ARAMASI ORTAK KURALDAN ═══════════════════════════════════
   *
   * ⛔ CANLI VAKA 26.08.2026 — VE 11 SİPARİŞ BU YÜZDEN DÜŞTÜ.
   * Burada arama YALNIZ `ProductVariant.barcode`daydı. TY'nin sipariş
   * satırındaki `barcode` ise KANALIN kodu: `194645027819` sistemde
   * VARDI — `axcali2755`in Trendyol Kanal SKU'su olarak — ama bu sorgu
   * onu göremiyordu. ₺27.807 defterin dışında kaldı.
   *
   * ⚠ AYRI LİSTE YAZILMADI: `kodKosuluToplu` sistemin TEK kod kuralından
   * türüyor (`kodKosulu` ile aynı alan kümesi). İkinci bir liste, yarın
   * altıncı bir rol eklendiğinde sessizce eski kalırdı.
   */
  const tumBarkodlar = [...new Set([...adaylar.values()].flatMap((a) => a.kalemler.map((x) => x.barkod)))];
  const varyantlar = await prisma.productVariant.findMany({
    where: { OR: kodKosuluToplu(tumBarkodlar) },
    select: {
      id: true,
      barcode: true,
      companySku: true,
      sku: true,
      channelSkus: { where: { isActive: true }, select: { channelSku: true } },
    },
  });

  /**
   * ⚠ ÇOK EŞLEŞME AYRI SAYILIR — YAZILMAZ.
   * `barcode`/`sku`/`companySku` küresel tekil ama `channelSku` yalnız
   * (hesap, kod) çiftinde tekil: aynı kod iki kanal hesabında iki FARKLI
   * varyanta işaret edebilir. O kodu tek bir varyanta bağlamak, kalemi
   * yanlış ürüne yazmak olurdu. _(Anayasa: "sıfır üç farklı şey
   * olabilir" — burada da "bulunamadı" ile "belirsiz" ayrı.)_
   */
  const kodVaryantlar = new Map<string, Set<string>>();
  const ekle = (kod: string | null, id: string) => {
    if (!kod || !tumBarkodlar.includes(kod)) return;
    const k = kodVaryantlar.get(kod) ?? new Set<string>();
    k.add(id);
    kodVaryantlar.set(kod, k);
  };
  for (const v of varyantlar) {
    ekle(v.barcode, v.id);
    ekle(v.companySku, v.id);
    ekle(v.sku, v.id);
    for (const k of v.channelSkus) ekle(k.channelSku, v.id);
  }
  const barkodVaryant = new Map<string, string>();
  const belirsizKodlar = new Set<string>();
  for (const [kod, kume] of kodVaryantlar) {
    if (kume.size === 1) barkodVaryant.set(kod, [...kume][0]);
    else belirsizKodlar.add(kod);
  }

  const yazilabilir: Aday[] = [];
  const yazilamaz: Aday[] = [];
  const belirsiz: Aday[] = [];
  for (const a of adaylar.values()) {
    if (a.kalemler.some((x) => belirsizKodlar.has(x.barkod))) belirsiz.push(a);
    else if (a.kalemler.every((x) => barkodVaryant.has(x.barkod))) yazilabilir.push(a);
    else yazilamaz.push(a);
  }
  if (belirsiz.length > 0) {
    console.log(`   ⛔ BELİRSİZ (kod birden çok varyanta işaret ediyor)  ${belirsiz.length}`);
    for (const a of belirsiz) console.log(`        ${a.siparisNo}`);
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
