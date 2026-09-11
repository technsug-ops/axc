/** BETIK SINIFI: SUREKLI. Kanala YAZMAZ (GET); deftere yalniz --yaz ile yazar. */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { kodKosuluToplu } from "../src/lib/varyant-arama-kurali";
import { desiSecimi } from "../src/lib/kargo-kaynagi";
import { n11KargoMaliyeti } from "../src/lib/n11-kargo-tarifesi";
import {
  gecmistenKargoDamgasi,
  teslimGuncellemesi,
  teslimYazimiVarMi,
} from "../src/lib/kanal-kargo-damgasi";
import { kilitDurumu } from "./bekci-kilit";
import { canliYapilandirma } from "./canli-ortak";
import { baslikKur, kimlikOku, tumPaketler } from "./n11/istemci";
import { otomatikOnaylaKuyruk } from "../src/lib/onay-kuyrugu";
import { otomatikIptalAdayiMi } from "../src/lib/satis-iptali";
import { iptalOnizle, iptalUygula } from "../src/lib/satis-iptali-veri";

/**
 * ============================================================================
 *  K167-② — N11 SİPARİŞ İÇE AKTARMA → `Sale` / `SaleItem`
 * ----------------------------------------------------------------------------
 *      npm run canli:n11-ice-aktar              ← ÖNİZLEME (yazmaz)
 *      npm run canli:n11-ice-aktar -- --yaz     ← YAZAR
 *
 *  TY/HB (A3-③ · K165) disiplininin kopyası: iptal yazılmaz-uydurulmaz ·
 *  çakışmada ATLA · StockMovement ÜRETİLMEZ (onay kuyruğu düşürür, K164) ·
 *  importBatch + importKaynak · önce/sonra sayım · AuditLog · ikinci koşum 0.
 *
 *  ═══ ALAN EŞLEMESİ — ÖLÇÜLDÜ (05.09.2026, canlı, 4 paket) ═══════════════
 *  N11 ucu PAKET düzeyinde döner; bir sipariş birden çok pakete bölünebilir
 *  → satırlar `orderNumber` ile gruplanır. Ölçülen kanıtlar:
 *
 *    sellerInvoiceAmount 1989  ← SATICININ FATURALADIĞI tutar. 4/4 kayıtta
 *                                indirim N11 FONLU (sellerDiscount=0,
 *                                mallDiscount>0) ve satıcı TAM fiyat
 *                                faturalıyor — ciro tabanı budur; alıcının
 *                                ödediği `dueAmount` değil.
 *    quantity 1 (4/4)          ← BİRİM/TOPLAM AYIRT EDİLEMEDİ: bütün
 *                                kayıtlar tek adet, iki okuma özdeş.
 *                                ⛔ BÖLME/ÇARPMA YASAK (TY faciası 29.08).
 *                                adet>1 satır YAZILMAZ, ayrı kovada kırmızı
 *                                sayılır. Açılış şartı: ilk çok adetli kayıt
 *                                + ayırt edici kanıt (hakediş satırı).
 *    packageHistories          ← Created@epoch = sipariş anı; epoch MUTLAK
 *                                an, saat dilimi tuzağı DOĞAMAZ. soldAt
 *                                GERÇEK AN (K163) → kuyruk saat süzgecinden
 *                                kendiliğinden geçer.
 *    commissionRate 16/18/13   ← satır düzeyinde ORAN, kanalın beyanı.
 *                                Dolu (0 dahil) → aynen; null → ChannelSku
 *                                (RULE_MISSING dersi). taxDeductionRate=1
 *                                (%1 stopaj — iş sabitiyle tutarlı, ayrıca
 *                                yazılmaz: motor kendi kuralından hesaplar).
 *    sellerCampaignCommissionRate 0 (4/4)
 *                              ← anlamı ölçülemedi (hep 0). YAZILMIYOR;
 *                                açılış şartı: ilk >0 kayıt.
 *    shipmentPackageStatus     ← "Cancelled" paket YAZILMAZ; satır düzeyi
 *                                `orderItemLineItemStatusName` "Cancelled"
 *                                satır da YAZILMAZ (iptal anı uydurulmaz).
 *    cargoTrackingNumber       ← VAR ama `shipmentCode` YAZILMIYOR (K165
 *                                kararının kopyası: kargo/paket bağı ayrı
 *                                uçtan, ayrı karar — K60-② alan doluluğu
 *                                olay izi değildir).
 *
 *  ═══ HESAP ═══════════════════════════════════════════════════════════════
 *  Hesap `externalId = String(sellerId)` ile bulunur (sellerId pakette
 *  ölçüldü). YOKSA OLUŞTURULMAZ ve YAZILMAZ — kırmızı durur, sellerId
 *  ekrana basılır: canlı hesabın kimliği elle, bilinçli bağlanır (K165
 *  kuralının aynısı; N11'in test ortamı yok, her koşum canlıdır).
 *
 *  ⚠ BEKÇİ TURU KOŞARKEN KOŞMAZ (K162-② kapısı, TY/HB ile aynı gerekçe).
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");

const kurus = (n: number) => Math.round(n * 100) / 100;

/** Epoch ms → mutlak an. Sayı değilse/anlamsızsa null — tarih uydurulmaz. */
export function n11Ani(ham: unknown): Date | null {
  const n = Number(ham);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n);
}

/**
 * Satır birim geliri (satıcının faturaladığı `sellerInvoiceAmount`):
 * adet 1 → tutar AYNEN birimdir (birim/toplam okumaları özdeş).
 * adet > 1 → null: hangisi olduğu ÖLÇÜLEMEDİ (05.09.2026, 4/4 tek adet) —
 * ⛔ bölme/çarpma yazılmaz, satır "çok adet ölçülemedi" kovasına düşer.
 */
export function n11BirimFiyat(adet: number, sellerInvoiceAmount: unknown): number | null {
  const n = Number(sellerInvoiceAmount);
  if (!Number.isFinite(n) || n < 0) return null;
  if (adet === 1) return kurus(n);
  return null;
}

/** Oran alanı DOLUYSA (0 dahil) kanal belgesidir; null → ChannelSku dalı. */
export function n11KomisyonOrani(ham: unknown): number | null {
  if (ham === null || ham === undefined) return null;
  const n = Number(ham);
  return Number.isFinite(n) ? n : null;
}

type Satir = {
  stokKodu: string;
  barkod: string;
  adet: number;
  birimFiyat: number | null;
  kdv: number | null;
  komisyon: number | null;
};

type Aday = {
  siparisNo: string;
  soldAt: Date | null;
  /**
   * KANALIN BİLDİRDİĞİ KARGO ANI (K195, 09.09.2026) — geçmişteki `Shipped`
   * damgası. ⚠ N11'in geçmiş şekli ÖLÇÜLDÜ ve TY ile birebir aynı
   * (`createdDate` epoch ms + `status`), bu yüzden ortak gövde kullanılıyor.
   * `null` = kanal henüz "kargolandı" demedi.
   */
  kargoAni: Date | null;
  /**
   * KANALIN BİLDİRDİĞİ TESLİM ANI (K195-2) — geçmişteki `Delivered` damgası.
   * ⚠ Şekil TY ile aynı (ölçüldü 09.09.2026), ortak gövde kullanılıyor.
   */
  teslimAni: Date | null;
  /** Kanalın kendi takip bağlantısı (`cargoTrackingLink`). */
  takipBaglantisi: string | null;
  /** Kanalın FİİLEN kullandığı firma — `cargoCarrierId` ile aynı şey DEĞİL. */
  kargoFirmasi: string | null;
  satirlar: Satir[];
  iptalliSatir: number;
};

function bekciTuruKosuyorMu(): boolean {
  return kilitDurumu().canli;
}

type HamPaket = {
  orderNumber?: unknown;
  sellerId?: unknown;
  shipmentPackageStatus?: unknown;
  cargoTrackingLink?: unknown;
  cargoProviderName?: unknown;
  packageHistories?: { createdDate?: unknown; status?: unknown }[];
  lines?: Record<string, unknown>[];
};

/**
 * K167-③ — TEK GÖVDE, İKİ OKUYUCU (K166 deseninin kopyası): betik argv ile,
 * sunucu ucu (`/api/cron/n11-cekim`) env ile çağırır. Dönüş özeti sunucu
 * ucunun JSON cevabıdır; console.log'lar betikte ekrana, Vercel'de function
 * loguna akar.
 */
export type N11CekimOzeti = {
  kip: "ONIZLEME" | "YAZIM";
  apiPaket: number;
  iptalPaket: number;
  tamamiIptal: number;
  saatCozulemeyen: number;
  cokAdetOlculemedi: number;
  cakisanAtlandi: number;
  belirsiz: number;
  yazilamazKod: number;
  yazilan: number;
  hata: number;
  saleOnce: number;
  saleSonra: number | null;
  /** K168: bu koşumda otomatik onaylanan tek-partili sipariş sayısı. */
  otoOnaylanan: number;
};

export async function n11CekimKos(ayar: {
  yaz: boolean;
  /** K166: sunucu ucundan DATABASE_URL; betikte boş → dosyadan. */
  dbAdresi?: string;
}): Promise<
  | N11CekimOzeti
  | { atlandi: "BEKCI_TURU" | "KIMLIK" | "VERITABANI" | "CEKIM" | "HESAP" }
> {
  const YAZIM = ayar.yaz;
  if (bekciTuruKosuyorMu()) {
    console.log("");
    console.log("⏭ BEKÇİ TURU KOŞUYOR (.bekci-kilidi) — bu çekim ATLANDI; sonraki koşum yakalar.");
    console.log("");
    return { atlandi: "BEKCI_TURU" };
  }
  const k = kimlikOku();
  if (!k) {
    console.log("\n⛔ N11 ANAHTARLARI EKSİK (env ya da .env.canli)\n");
    process.exitCode = 1;
    return { atlandi: "KIMLIK" };
  }
  let dbAdresi = ayar.dbAdresi ?? null;
  if (dbAdresi === null) {
    const c = canliYapilandirma();
    if (!c.tamam) {
      console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
      process.exitCode = 1;
      return { atlandi: "VERITABANI" };
    }
    dbAdresi = c.veri.ham;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(dbAdresi) });
  const okumaAni = new Date();
  const partiKimligi = `n11-${okumaAni.toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;

  console.log("\n" + "=".repeat(78));
  console.log(`K167-② N11 İÇE AKTARMA — ${YAZIM ? "⚠ YAZIM MODU" : "ÖNİZLEME (yazmaz)"}`);
  console.log("=".repeat(78));
  console.log(`  parti kimliği : ${partiKimligi}`);

  // ═══ ÖNCE SAYIM ═════════════════════════════════════════════════════════
  const onceToplam = await prisma.sale.count();
  console.log(`\n① ÖNCE SAYIM — Sale TOPLAM ${onceToplam}`);

  // ═══ ÇEKİM (paket düzeyi) ═══════════════════════════════════════════════
  const cekim = await tumPaketler(baslikKur(k), 100);
  if (cekim.tur !== "TAMAM") {
    console.log(
      `\n⛔ PAKETLER OKUNAMADI (${cekim.tur === "HATA" ? cekim.sonuc.tur : "zarf tanınmadı: " + cekim.anahtarlar.join(",")}) — hüküm yok.\n`,
    );
    await prisma.$disconnect();
    process.exitCode = 1;
    return { atlandi: "CEKIM" };
  }
  const paketler = cekim.kayitlar as HamPaket[];

  // ═══ HESAP — sellerId paketten okunur, elle bağlanmış olmalı ════════════
  const sellerIdler = [...new Set(paketler.map((p) => String(p.sellerId ?? "")))].filter(
    (s) => s !== "" && s !== "undefined",
  );
  if (sellerIdler.length !== 1) {
    console.log(`\n⛔ sellerId TEKİL DEĞİL (${sellerIdler.join(",") || "boş"}) — hüküm yok.\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return { atlandi: "HESAP" };
  }
  const hesap = await prisma.channelAccount.findFirst({
    where: { externalId: sellerIdler[0] },
    select: { id: true, name: true },
  });
  if (!hesap) {
    console.log(`\n⛔ HESAP YOK — N11 satış hesabına externalId ELLE bağlanmalı.`);
    console.log(`   Kanalın beyan ettiği sellerId: ${sellerIdler[0]}`);
    console.log(`   (Hesap OLUŞTURULMAZ; bağ bilinçli kurulur — K165 kuralı.)\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
    return { atlandi: "HESAP" };
  }
  console.log(`  kanal hesabı  : ${hesap.name} (sellerId ${sellerIdler[0]})`);

  // ═══ GRUPLAMA — paket → sipariş ═════════════════════════════════════════
  const adaylar = new Map<string, Aday>();
  let iptalPaket = 0;
  /**
   * K213 — SONRADAN TAMAMEN İPTAL OLMUŞ SİPARİŞ (11.09.2026).
   * ⚠ Tam iptal edilmiş paket `adaylar`e HİÇ girmiyor (aşağıdaki `continue`) —
   * yani TY'nin aksine burada "aday listesine gir, iptalTarihi dolu yazılsın"
   * yolu YOK. Onun yerine iptal anı AYRI bir haritada tutulur; döngü
   * bitince yalnız `adaylar`de KARŞILIĞI OLMAYAN (yani parçası hâlâ açık
   * OLMAYAN) siparişler otomatik-iptal adayı sayılır — bkz. aşağı, ④'ten
   * sonra.
   */
  const iptalliPaketler = new Map<string, Date | null>();
  for (const p of paketler) {
    const no = String(p.orderNumber ?? "");
    if (no === "") continue;
    if (String(p.shipmentPackageStatus) === "Cancelled") {
      iptalPaket++;
      const iptalDamga = gecmistenKargoDamgasi(p.packageHistories, "Cancelled");
      const eski = iptalliPaketler.get(no);
      if (iptalDamga.tur === "AN" && (eski === undefined || eski === null || iptalDamga.an > eski)) {
        iptalliPaketler.set(no, iptalDamga.an);
      } else if (!iptalliPaketler.has(no)) {
        iptalliPaketler.set(no, null);
      }
      continue;
    }
    /**
     * ⛔ `as Aday` KALDIRILDI (K195-2) — VE BU BİR ÖLÇÜM SONUCU DEĞİL, BİR
     * TUZAĞIN KAPATILMASI. Cast, eksik alanı TypeScript'ten SAKLIYOR:
     * `teslimAni` eklendiğinde burası `undefined` kalırdı, karşılaştırma
     * (`an > undefined`) sessizce `false` döner ve alan HİÇ DOLMAZDI —
     * hata yok, uyarı yok, yalnız boş bir sütun. Cast olmadan derleyici
     * yarın eklenen alanı da burada gösterir.
     * _(Anayasa: "koruma disipline değil mekanizmaya bağlanır".)_
     */
    const aday: Aday =
      adaylar.get(no) ?? {
        siparisNo: no,
        soldAt: null,
        kargoAni: null,
        teslimAni: null,
        takipBaglantisi: null,
        kargoFirmasi: null,
        satirlar: [],
        iptalliSatir: 0,
      };
    /**
     * ⛔ KANALIN SÖYLEDİĞİNİ ATMIYORUZ ARTIK (K195). Bu bilgi her koşumda
     * geliyordu ve okunmadan çöpe gidiyordu.
     * ⚠ EN GEÇ damga kazanır: bölünmüş sipariş iki paketse ikincisi daha
     * geç kargolanmış olabilir ve sipariş o an yola çıkmıştır.
     */
    const damga = gecmistenKargoDamgasi(p.packageHistories, "Shipped");
    if (damga.tur !== "YOK" && (aday.kargoAni === null || damga.an > aday.kargoAni)) {
      aday.kargoAni = damga.an;
      /** ⭐ TAKİP BİLGİSİ DAMGAYI KAZANAN PAKETTEN — `shippedAt` ile
       *  `kargoTakipBaglantisi` AYNI paketi anlatsın diye (TY ile aynı). */
      aday.takipBaglantisi =
        typeof p.cargoTrackingLink === "string" && p.cargoTrackingLink !== ""
          ? p.cargoTrackingLink
          : null;
      aday.kargoFirmasi =
        typeof p.cargoProviderName === "string" && p.cargoProviderName !== ""
          ? p.cargoProviderName
          : null;
    }
    /**
     * TESLİM DAMGASI (K195-2) — EN GEÇ olan kazanır.
     * ⚠ SINIR BEYAN EDİLİYOR: bölünmüş siparişte paketlerden biri teslim,
     * öteki yolda olabilir; bu kural o siparişi "teslim" sayar. Ölçüldü
     * (09.09.2026): 7953 satışın 1'i bölünmüş (%0,01). Oran anlamlı hâle
     * gelirse kural "bütün paketleri teslim" diye daraltılır.
     */
    const teslim = gecmistenKargoDamgasi(p.packageHistories, "Delivered");
    if (teslim.tur !== "YOK" && (aday.teslimAni === null || teslim.an > aday.teslimAni)) {
      aday.teslimAni = teslim.an;
    }
    /** Sipariş anı: paket geçmişindeki İLK `Created` damgası (epoch, mutlak).
     *  Çok paketli siparişte EN ERKEN Created esas alınır. */
    for (const g of p.packageHistories ?? []) {
      if (String(g.status) !== "Created") continue;
      const an = n11Ani(g.createdDate);
      if (an !== null && (aday.soldAt === null || an < aday.soldAt)) aday.soldAt = an;
    }
    for (const ham of p.lines ?? []) {
      if (String(ham.orderItemLineItemStatusName) === "Cancelled") {
        aday.iptalliSatir++;
        continue;
      }
      const adet = Number(ham.quantity ?? 0);
      if (!Number.isFinite(adet) || adet <= 0) continue;
      aday.satirlar.push({
        stokKodu: String(ham.stockCode ?? ""),
        barkod: String(ham.barcode ?? ""),
        adet,
        /** ⛔ BÖLME/ÇARPMA YOK — adet>1 null döner ve satır yazılmaz. */
        birimFiyat: n11BirimFiyat(adet, ham.sellerInvoiceAmount),
        kdv: ham.vatRate == null ? null : Number(ham.vatRate),
        komisyon: n11KomisyonOrani(ham.commissionRate),
      });
    }
    adaylar.set(no, aday);
  }

  console.log(`\n② AKIŞ`);
  console.log(`   API paket                                        ${paketler.length}`);
  if (iptalPaket > 0) console.log(`   iptal paket → YAZILMAZ                           ${iptalPaket}`);
  console.log(`   sipariş (gruplandı)                              ${adaylar.size}`);

  /** Satırsız kalan sipariş (tamamı iptal) yazılmaz — ayrı sayılır. */
  const tumIptal = [...adaylar.values()].filter((a) => a.satirlar.length === 0);
  for (const a of tumIptal) adaylar.delete(a.siparisNo);
  if (tumIptal.length > 0) console.log(`   tamamı iptal satırlı → YAZILMAZ                  ${tumIptal.length}`);

  /** Saati çözülemeyen yazılmaz — tarih uydurulmaz. */
  const saatsiz = [...adaylar.values()].filter((a) => a.soldAt === null);
  for (const a of saatsiz) adaylar.delete(a.siparisNo);
  if (saatsiz.length > 0) console.log(`   ⚠ SİPARİŞ ANI ÇÖZÜLEMEYEN → YAZILMAZ             ${saatsiz.length}`);

  /** Çok adetli satır: birim/toplam ölçülemedi — sipariş yazılmaz, kırmızı. */
  const cokAdet = [...adaylar.values()].filter((a) =>
    a.satirlar.some((s) => s.birimFiyat === null),
  );
  for (const a of cokAdet) adaylar.delete(a.siparisNo);
  if (cokAdet.length > 0) {
    console.log(`   ⛔ ÇOK ADET / TUTAR ÖLÇÜLEMEDİ → YAZILMAZ         ${cokAdet.length}`);
    for (const a of cokAdet) console.log(`        ${a.siparisNo} (ilk çok adetli kayıt — birim/toplam kanıtı bekliyor)`);
  }

  // ═══ ÇAKIŞMA — KÜRESEL (TY dersi: `Sale.code` global unique) ═══════════
  const mevcutKodlar = new Set(
    (
      await prisma.sale.findMany({
        where: { code: { in: [...adaylar.keys()] } },
        select: { code: true },
      })
    ).map((s) => s.code!),
  );
  const cakisanlar = [...adaylar.keys()].filter((n) => mevcutKodlar.has(n));

  /**
   * ═══ KARGO DAMGASI — BOŞ ALANI DOLDURUR, HİÇBİR ŞEYİ EZMEZ (K195) ═══
   * ⛔ Yalnız `shippedAt` NULL olanlara yazılır; dolu bir damga (elle
   * girilmiş olabilir) ASLA değişmez. Satır satır ve tekrar-koşulabilir.
   */
  let damgaYazilan = 0;
  for (const no of cakisanlar) {
    const damga = adaylar.get(no)?.kargoAni ?? null;
    if (damga === null) continue;
    const guncel = await prisma.sale.updateMany({
      where: { code: no, channelAccountId: hesap.id, shippedAt: null },
      data: { shippedAt: damga },
    });
    damgaYazilan += guncel.count;
  }

  /**
   * ═══ TESLİM TARAFI (K195-2) — İKİ FARKLI EZME KURALI, İKİSİ DE GEREKÇELİ ═══
   *   `deliveredAt`  bir OLAYIN anı → yalnız BOŞ olana yazılır, dolu damga
   *                  (elle girilmiş olabilir) ASLA değişmez
   *   takip/firma    kanalın O ANKİ beyanı → en son söylediği geçerli;
   *                  elle girildiği bir yol YOK. Ama `null` yazılmaz —
   *                  kanalın susması "yok" demek değildir.
   * ⚠ Önce okunur, yalnız DEĞİŞEN satır yazılır (gereksiz gidiş-dönüş yok).
   */
  const mevcutTeslim = await prisma.sale.findMany({
    where: { code: { in: cakisanlar }, channelAccountId: hesap.id },
    select: {
      id: true,
      code: true,
      deliveredAt: true,
      kargoTakipBaglantisi: true,
      kanalKargoFirmasi: true,
      kanalKargoDesi: true,
      /** ⚠ SALT OKUMA — desi sırasının girdisi. Bu iki alana YAZILMIYOR. */
      cargoDesi: true,
      tahminiKargo: true,
    },
  });
  let teslimYazilan = 0;
  let takipYazilan = 0;
  let tahminYazilan = 0;
  for (const s of mevcutTeslim) {
    const a = adaylar.get(s.code ?? "");
    if (!a) continue;
    /** ⭐ KARAR ORTAK SAF GÖVDEDE — iki içe aktarmada iki kopya olmasın. */
    const veri = teslimGuncellemesi(s, {
      teslimAni: a.teslimAni,
      takipBaglantisi: a.takipBaglantisi,
      kargoFirmasi: a.kargoFirmasi,
      /**
       * ⛔ N11 DESİ VERMİYOR — ÖLÇÜLDÜ, VARSAYILMADI (09.09.2026).
       * 5 paketin birleşim kümesinde 34 alan var ve hiçbiri desi/deci/
       * weight/kg değil. `null` geçmek bir eksiklik değil, kanalın
       * söylemediği şey hakkında iddia kurmamaktır.
       * ⚠ ÖRNEKLEM DAR (n=5): kanal alanı yalnız DOLUYKEN gönderiyorsa
       * daha geniş bir örneklemde çıkabilir. Çıktığı gün buraya bağlanır.
       */
      kanalDesi: null,
    });
    /**
     * ═══ TAHMİNİ KARGO (K201) — `cargoAmount`a DOKUNMAZ ═══
     *
     * ⛔ N11'in kargo kesintisi hakedişe SATIR BAZINDA düşmüyor; o gelene
     * kadar NET kargoyu HİÇ görmeyecekti — yani olduğundan YÜKSEK.
     * Bu tahmin o boşluğu dolduruyor ve gerçekleşen geldiğinde `cargoAmount`
     * DEVRALIYOR (sıra `kargoSecimi` gövdesinde).
     *
     * ⚠ YALNIZ BOŞ OLANA: tahmin bir kez hesaplanır. Her turda yeniden
     * yazmak, hakediş geldikten sonra bile tahmini tazelemek olurdu —
     * oysa o noktada tahmin bir GEÇMİŞ kaydıdır, "ne kadar yanılmışız"ın
     * kanıtı. _(Anayasa: "toplu yazımda önceki değer saklanır".)_
     */
    if (s.tahminiKargo === null) {
      const d = desiSecimi({
        kanalKargoDesi:
          s.kanalKargoDesi === null ? null : Number(s.kanalKargoDesi.toString()),
        cargoDesi: s.cargoDesi === null ? null : Number(s.cargoDesi.toString()),
      });
      const hesap = n11KargoMaliyeti({
        desi: d.desi,
        /** Kanalın FİİLEN kullandığı firma; yoksa altı firma ortalaması. */
        kanalFirmasi: a.kargoFirmasi ?? s.kanalKargoFirmasi,
      });
      if (hesap.tamam) {
        (veri as { tahminiKargo?: number }).tahminiKargo = hesap.tutar;
        tahminYazilan++;
      }
    }
    if (!teslimYazimiVarMi(veri) && !("tahminiKargo" in veri)) continue;
    await prisma.sale.update({ where: { id: s.id }, data: veri });
    if (veri.deliveredAt) teslimYazilan++;
    if (veri.kargoTakipBaglantisi || veri.kanalKargoFirmasi) takipYazilan++;
  }

  /**
   * ═══ K213 — SİPARİŞ TÜMÜYLE SONRADAN İPTAL OLMUŞ (11.09.2026) ═══════════
   * ⚠ AYNI MOTOR — elle iptal ekranıyla (`satis-iptali-veri.ts`) BİREBİR ve
   * TY'nin otomatik tespitiyle (`canli-ty-ice-aktar.ts`) AYNI karar gövdesi
   * (`otomatikIptalAdayiMi`). Fark yalnız KAYNAK: N11'de tam iptal olmuş
   * paket hiç `adaylar`e girmiyor (yukarıdaki erken `continue`), bu yüzden
   * aday kümesi `adaylar`den değil `iptalliPaketler`den — ve yalnız
   * `adaylar`de KARŞILIĞI OLMAYAN (yani hiçbir parçası açık kalmamış)
   * sipariş numaraları — kurulur. Parçası hâlâ açık olan (kısmi iptal)
   * sipariş buraya HİÇ girmez; o zaten `iptalliSatir` ile ayrı sayılıyor.
   */
  const OTO_IPTAL_NOTU_N11 =
    "N11'de iptal edildi — otomatik tespit edildi (K213, canli-n11-ice-aktar).";
  const tamIptalSiparisler = [...iptalliPaketler.keys()].filter((no) => !adaylar.has(no));
  let otoIptalTespit = 0;
  let otoIptalEngellendi = 0;
  let otoIptalYazilan = 0;
  if (tamIptalSiparisler.length > 0) {
    const mevcutIptalSiparisler = await prisma.sale.findMany({
      where: { code: { in: tamIptalSiparisler }, channelAccountId: hesap.id },
      select: { id: true, code: true, iptalTarihi: true },
    });
    for (const s of mevcutIptalSiparisler) {
      const iptalAni = iptalliPaketler.get(s.code ?? "") ?? null;
      if (!otomatikIptalAdayiMi({ durum: "Cancelled", iptalTarihi: iptalAni }, s.iptalTarihi)) {
        continue;
      }
      if (iptalAni === null) continue; // TS narrowing içindir — karar otomatikIptalAdayiMi'de
      otoIptalTespit++;
      const onizleme = await iptalOnizle(s.id, "MUSTERI_VAZGECTI", OTO_IPTAL_NOTU_N11);
      if (onizleme === null) {
        otoIptalEngellendi++;
        console.log(`   ⚠ OTOMATİK İPTAL ENGELLENDİ  ${s.code}  SATIS_YOK`);
        continue;
      }
      if (!onizleme.plan.olur) {
        otoIptalEngellendi++;
        console.log(`   ⚠ OTOMATİK İPTAL ENGELLENDİ  ${s.code}  ${onizleme.plan.engel}`);
        continue;
      }
      if (!YAZIM) continue;
      const sonuc = await iptalUygula({
        saleId: s.id,
        sebep: "MUSTERI_VAZGECTI",
        not: OTO_IPTAL_NOTU_N11,
        onaylananImza: onizleme.imza,
        kullaniciId: null,
        an: iptalAni,
      });
      if (sonuc.tamam) otoIptalYazilan++;
      else {
        otoIptalEngellendi++;
        console.log(`   ⚠ OTOMATİK İPTAL YAZILAMADI  ${s.code}  ${sonuc.engel}`);
      }
    }
  }
  if (otoIptalTespit > 0) {
    console.log(`   ↺ SONRADAN TAMAMEN İPTAL OLMUŞ (mevcut satış)    ${otoIptalTespit}`);
    console.log(
      `      ${YAZIM ? "yazılan" : "yazılacak"} ${YAZIM ? otoIptalYazilan : otoIptalTespit - otoIptalEngellendi} · engellenen ${otoIptalEngellendi}`,
    );
  }

  for (const n of cakisanlar) adaylar.delete(n);
  console.log(`   ÇAKIŞTI → ATLANDI (ezme YOK)                     ${cakisanlar.length}`);
  console.log(`   KARGO DAMGASI YAZILDI (yalnız BOŞ olanlara)      ${damgaYazilan}`);
  console.log(`   TESLİM DAMGASI YAZILDI (yalnız BOŞ olanlara)     ${teslimYazilan}`);
  console.log(`   TAKİP/FİRMA TAZELENDİ (kanalın son beyanı)        ${takipYazilan}`);
  console.log(`   TAHMİNİ KARGO YAZILDI (cargoAmount'a DOKUNMAZ)    ${tahminYazilan}`);

  // ═══ VARYANT KAPISI — ortak kod kuralı, iki kod adayı ═══════════════════
  const tumKodlar = [
    ...new Set(
      [...adaylar.values()].flatMap((a) =>
        a.satirlar.flatMap((x) => [x.stokKodu, x.barkod].filter((s) => s !== "")),
      ),
    ),
  ];
  const varyantlar = await prisma.productVariant.findMany({
    where: { OR: kodKosuluToplu(tumKodlar) },
    select: {
      id: true,
      barcode: true,
      companySku: true,
      sku: true,
      channelSkus: { where: { isActive: true }, select: { channelSku: true } },
    },
  });
  const kodVaryantlar = new Map<string, Set<string>>();
  const ekle = (kod: string | null, id: string) => {
    if (!kod || !tumKodlar.includes(kod)) return;
    const kume = kodVaryantlar.get(kod) ?? new Set<string>();
    kume.add(id);
    kodVaryantlar.set(kod, kume);
  };
  for (const v of varyantlar) {
    ekle(v.barcode, v.id);
    ekle(v.companySku, v.id);
    ekle(v.sku, v.id);
    for (const cs of v.channelSkus) ekle(cs.channelSku, v.id);
  }
  const kodVaryant = new Map<string, string>();
  const belirsizKodlar = new Set<string>();
  for (const [kod, kume] of kodVaryantlar) {
    if (kume.size === 1) kodVaryant.set(kod, [...kume][0]);
    else belirsizKodlar.add(kod);
  }
  /** Satır çözümü: önce stockCode (bizim kod), sonra barkod. */
  const satirVaryanti = (x: Satir): string | "BELIRSIZ" | null => {
    for (const kod of [x.stokKodu, x.barkod]) {
      if (kod === "") continue;
      if (belirsizKodlar.has(kod)) return "BELIRSIZ";
      const id = kodVaryant.get(kod);
      if (id) return id;
    }
    return null;
  };

  const yazilabilir: Aday[] = [];
  const yazilamaz: Aday[] = [];
  const belirsiz: Aday[] = [];
  for (const a of adaylar.values()) {
    let durum: "TAM" | "BELIRSIZ" | "YOK" = "TAM";
    for (const x of a.satirlar) {
      const v = satirVaryanti(x);
      if (v === "BELIRSIZ") durum = "BELIRSIZ";
      else if (v === null) durum = durum === "BELIRSIZ" ? "BELIRSIZ" : "YOK";
    }
    if (durum === "TAM") yazilabilir.push(a);
    else if (durum === "BELIRSIZ") belirsiz.push(a);
    else yazilamaz.push(a);
  }
  if (belirsiz.length > 0) {
    console.log(`   ⛔ BELİRSİZ (kod birden çok varyantta)            ${belirsiz.length}`);
    for (const a of belirsiz) console.log(`        ${a.siparisNo}`);
  }
  console.log(`   YAZILABİLİR                                      ${yazilabilir.length}`);
  console.log(`   ⛔ YAZILAMAZ (kod kataloğumuzda yok)              ${yazilamaz.length}`);
  for (const a of yazilamaz) console.log(`        ${a.siparisNo} · ${a.satirlar.map((x) => x.stokKodu + "/" + x.barkod).join(", ")}`);

  console.log(`\n③ YAZILACAK: ${yazilabilir.length} sipariş  ·  beklenen Sale TOPLAM ${onceToplam + yazilabilir.length}`);

  const ozetTabani = {
    apiPaket: paketler.length,
    iptalPaket,
    tamamiIptal: tumIptal.length,
    saatCozulemeyen: saatsiz.length,
    cokAdetOlculemedi: cokAdet.length,
    cakisanAtlandi: cakisanlar.length,
    belirsiz: belirsiz.length,
    yazilamazKod: yazilamaz.length,
    saleOnce: onceToplam,
  };

  if (!YAZIM) {
    console.log(`\n${"=".repeat(78)}`);
    console.log(`  ÖNİZLEME — hiçbir şey yazılmadı. Yazmak için: -- --yaz`);
    console.log("=".repeat(78) + "\n");
    await prisma.$disconnect();
    return { kip: "ONIZLEME", ...ozetTabani, yazilan: 0, hata: 0, saleSonra: null, otoOnaylanan: 0 };
  }

  // ═══ YAZIM ══════════════════════════════════════════════════════════════
  console.log(`\n④ YAZILIYOR…`);
  let yazilan = 0;
  let hata = 0;
  let oranChannelSkudan = 0;
  for (const aday of yazilabilir) {
    try {
      const kalemVerisi = [] as {
        variantId: string;
        quantity: number;
        unitPriceAmount: number;
        unitPriceCurrency: "TRY";
        vatRate: number | null;
        commissionRate: number | null;
      }[];
      for (const x of aday.satirlar) {
        const variantId = satirVaryanti(x) as string;
        let komisyon = x.komisyon;
        if (komisyon === null) {
          /** RULE_MISSING dersi (11569147554): oran gelmezse ChannelSku'dan
           *  doldurulur; o da boşsa null kalır (bilinmiyor). */
          const cs = await prisma.channelSku.findFirst({
            where: { variantId, channelAccountId: hesap.id, isActive: true },
            select: { commissionRate: true },
          });
          if (cs?.commissionRate != null) {
            komisyon = Number(cs.commissionRate.toString());
            oranChannelSkudan++;
          }
        }
        kalemVerisi.push({
          variantId,
          quantity: x.adet,
          /** birimFiyat null olan sipariş bu noktaya GELEMEZ (çok-adet kovası). */
          unitPriceAmount: x.birimFiyat as number,
          unitPriceCurrency: "TRY",
          vatRate: x.kdv,
          commissionRate: komisyon,
        });
      }
      await prisma.sale.create({
        data: {
          code: aday.siparisNo,
          channelAccountId: hesap.id,
          /** GERÇEK AN (K163) — kuyruk saat süzgecinden geçer. */
          soldAt: aday.soldAt as Date,
          /**
           * ⚠ KANALIN BİLDİRDİĞİ AN — UYDURULMUYOR. `null` ise kanal
           * "kargolandı" demedi ve alan BOŞ kalır (K60 yasağı).
           */
          shippedAt: aday.kargoAni,
          /** ⚠ Teslim tarafında da uydurma YOK: `null` = kanal demedi. */
          deliveredAt: aday.teslimAni,
          kargoTakipBaglantisi: aday.takipBaglantisi,
          kanalKargoFirmasi: aday.kargoFirmasi,
          importBatch: partiKimligi,
          importKaynak: "n11-enumerasyon",
          items: { create: kalemVerisi },
        },
      });
      yazilan++;
    } catch (e) {
      hata++;
      console.log(`   ⛔ ${aday.siparisNo} — ${(e as Error).message.replace(/\s+/g, " ").slice(-160)}`);
    }
  }

  // ═══ SONRA SAYIM ════════════════════════════════════════════════════════
  const sonraToplam = await prisma.sale.count();
  const beklenen = onceToplam + yazilabilir.length;
  console.log(`\n⑤ SONRA SAYIM`);
  console.log(`   yazılan ${yazilan} · hata ${hata} · oran ChannelSku'dan ${oranChannelSkudan}`);
  console.log(`   Sale TOPLAM ${onceToplam} → ${sonraToplam}`);
  if (sonraToplam !== beklenen) {
    console.log(`   ⛔ SAYIM TUTMADI — beklenen ${beklenen}. YORUMLANMIYOR; ham hâliyle yazıldı.`);
  } else {
    console.log(`   ✓ SAYIM TUTTU — ${beklenen}`);
  }

  await prisma.auditLog.create({
    data: {
      action: "N11_SIPARIS_ICE_AKTARMA",
      targetType: "ChannelAccount",
      targetId: hesap.id,
      detail: JSON.stringify({
        partiKimligi,
        okumaAni: okumaAni.toISOString(),
        apiPaket: paketler.length,
        iptalPaket,
        tamamiIptal: tumIptal.length,
        saatCozulemeyen: saatsiz.length,
        cokAdetOlculemedi: cokAdet.length,
        cakisanAtlandi: cakisanlar.length,
        belirsiz: belirsiz.length,
        yazilamazKod: yazilamaz.length,
        yazilan,
        hata,
        oranChannelSkudan,
        saleOnce: onceToplam,
        saleSonra: sonraToplam,
        not: "StockMovement URETILMEDI - stok/kar bagi ONAY KUYRUGUNDAN (K164).",
      }),
    },
  });
  console.log(`   ✓ AuditLog yazıldı — N11_SIPARIS_ICE_AKTARMA`);

  /** K168 — TEK PARTİLİ SİPARİŞLERİ OTOMATİK ONAYLA. Yeni yazılanlar VE
   *  kuyrukta bekleyenler; her biri onay çekirdeğinin AYNI kapılarından
   *  geçer (sayım/dönem duraksatırsa kuyrukta kalır). Betiğin kendi
   *  prisma'sıyla (kâr tazeleme dahil). */
  const oto = await otomatikOnaylaKuyruk(prisma);
  console.log(`\n⑥ OTOMATİK ONAY (tek parti)`);
  console.log(`   aday ${oto.aday} · onaylanan ${oto.onaylanan} · çok parti (elle) ${oto.cokParti} · atlanan ${oto.atlanan} · KANAL KAPALI (elle) ${oto.kanalKapali}`);

  console.log(`\n${"=".repeat(78)}`);
  console.log(`  GERİ ALMA ÖLÇÜTÜ: importBatch = ${partiKimligi} (liste değil, yeniden hesaplanabilir)`);
  console.log("=".repeat(78) + "\n");
  await prisma.$disconnect();
  return { kip: "YAZIM", ...ozetTabani, yazilan, hata, saleSonra: sonraToplam, otoOnaylanan: oto.onaylanan };
}

/** İçeri alındığında KOŞMAZ — TY importer'daki kusur düzeltmesinin aynısı. */
const dogrudanKosuluyor = (() => {
  const giris = process.argv[1] ?? "";
  return /canli-n11-ice-aktar\.(ts|js)$/.test(giris.split("\\").join("/"));
})();

if (dogrudanKosuluyor) {
  n11CekimKos({ yaz: YAZ }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
