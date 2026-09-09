/** BETIK SINIFI: SUREKLI. Kanala YAZMAZ (GET); deftere yalniz --yaz ile yazar. */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { hbHesabiCoz, hbHesapHatasi, HB_KANAL_ADI } from "../src/lib/kanal-hesabi-hb";
import { hbKargoDamgasi } from "../src/lib/kanal-kargo-damgasi";
import { kodKosuluToplu } from "../src/lib/varyant-arama-kurali";
import { kilitDurumu } from "./bekci-kilit";
import { canliYapilandirma } from "./canli-ortak";
import {
  UCLAR,
  apiGet,
  baslikKur,
  kimlikOku,
  tumKayitlar,
  type Kimlik,
} from "./hb/istemci";

/**
 * ============================================================================
 *  K165 — HEPSİBURADA SİPARİŞ İÇE AKTARMA → `Sale` / `SaleItem`
 * ----------------------------------------------------------------------------
 *      npm run canli:hb-ice-aktar              ← ÖNİZLEME (yazmaz)
 *      npm run canli:hb-ice-aktar -- --yaz     ← YAZAR
 *
 *  TY importer (A3-③) disiplininin kopyası: iptal yazılmaz-uydurulmaz ·
 *  çakışmada ATLA · StockMovement ÜRETİLMEZ (onay kuyruğu düşürür, K164) ·
 *  importBatch + importKaynak · önce/sonra sayım · AuditLog · ikinci koşum 0.
 *
 *  ═══ ALAN EŞLEMESİ — ÖLÇÜLDÜ (04.09.2026, SIT, 2 test siparişi) ═════════
 *  HB sipariş ucu KALEM düzeyinde döner (TY paket düzeyindeydi); kalemler
 *  `orderNumber` ile gruplanır. Ayırt edici kanıtlar:
 *
 *    unitPrice   {amount:100}  ← 2 ADETLİ siparişte totalPrice 200 oldu,
 *    totalPrice  {amount:200}    unitPrice 100 KALDI → unitPrice KESİN
 *                                BİRİM. TY'deki "iki okumayla uyumlu"
 *                                belirsizliği burada doğmadan kapandı;
 *                                bölme/çarpma YASAK (motor adetle çarpar).
 *    commissionRate 0          ← ORAN ayrı alan (commission TUTAR — o
 *                                kullanılmaz). Alan doluysa (0 dahil)
 *                                kanal belgesi sayılır ve AYNEN yazılır;
 *                                NULL ise ChannelSku'dan doldurulur
 *                                (bugünkü TY dersi: oran gelmeyince satış
 *                                RULE_MISSING'e düşüyor; satış-anı snapshot
 *                                kaynağı zaten ChannelSku).
 *    orderDate "2026-09-04T16:12:09.935"
 *                              ← ZONE'SUZ İSTANBUL YERELİ. Kanıt: sipariş
 *                                13:12:09Z'de oluşturuldu = 16:12 İstanbul,
 *                                damga birebir. TR'de DST yok → sabit
 *                                "+03:00" eki güvenli. soldAt GERÇEK AN
 *                                alır (K163) → kuyruk saat süzgecinden
 *                                kendiliğinden geçer.
 *    status "Open"             ← kalem düzeyi. `Cancelled` kalem YAZILMAZ
 *                                (iptal ANI kaynağı yok — uydurulmaz) ve
 *                                ayrı kovada sayılır.
 *    packageNumber ""          ← Open'da boş; kargo/paket bağı ayrı uçtan,
 *                                ayrı karar. `shipmentCode` BOŞ bırakılır.
 *
 *  ═══ HESAP — SIT/CANLI AYRIMI ═══════════════════════════════════════════
 *  ⛔ HESAP `apiHesapKimligi` İLE BULUNUR — `externalId` İLE DEĞİL (07.09.2026).
 *  ESKİ GEREKÇE SİLİNMEDİ, ÇÜRÜDÜ: burada `externalId = HEPSIBURADA_MERCHANT_ID`
 *  yazıyordu ve TEST ortamında doğruydu. CANLI'da `externalId` raporlardaki
 *  `7000222505`i taşıyor, API'nin Mağaza ID'si ise 36 karakterlik AYRI bir
 *  kimlik — eşleşme HİÇ kurulamadı ve betik "HESAP YOK" deyip ilk adımda
 *  durdu. Ölçüldü 07.09: içe aktarma **bir kez bile koşmamış**, Halil
 *  siparişleri elle giriyordu. Çözüm ORTAK GÖVDEDE (`lib/kanal-hesabi-hb`),
 *  listeleme yazıcısıyla aynı yerde — iki çözümleyici bir daha doğmasın.
 *
 *  (eski cümle) Hesap `externalId` ile bulunurdu. TEST ortamında
 *  yoksa "Hepsiburada — Test (SIT)" hesabı OLUŞTURULUR (izli): test
 *  siparişleri canlı AXCALI hesabına (externalId 7000222505) KARIŞMAZ.
 *  CANLI ortamda hesap yoksa OLUŞTURULMAZ — kırmızı durur: canlı hesabın
 *  kimliği elle, bilinçli bağlanır.
 *
 *  ⚠ BEKÇİ TURU KOŞARKEN KOŞMAZ (K162-② kapısı, TY ile aynı gerekçe:
 *  `varyant-arama-kurali` harness hedefi).
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");

/**
 * ⛔ YAZIM ONAYIN KAPSAMIYLA BİREBİR EŞLEŞEBİLMELİ — `--sadece=no,no`
 *
 * NİYE DOĞDU (07.09.2026): mimar İKİ siparişin yazımını onayladı
 * (`4873413946` · `4707418677`), ama kuru koşum arada gelen ÜÇÜNCÜ bir
 * siparişi de yazılabilir gösterdi. Onaylanan kapsamın dışına çıkmak, "zaten
 * doğru olurdu" gerekçesiyle bile YAZIM DEĞİL KARAR genişletmesidir.
 *
 * ⚠ SÜZGEÇ YOKKEN DAVRANIŞ DEĞİŞMEZ: verilmezse yazılabilir olanların hepsi
 * yazılır (bugünkü hâl). Süzgeç bir KISITTIR, yeni bir yol değil.
 * ⚠ Ve süzgeçte olup yazılamayan numara SESSİZ GEÇMEZ — ekranda yazar.
 */
const SADECE: string[] = (() => {
  const ham2 = process.argv.find((a) => a.startsWith("--sadece="));
  if (ham2 === undefined) return [];
  return ham2
    .slice("--sadece=".length)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
})();

const kurus = (n: number) => Math.round(n * 100) / 100;

/**
 * HB zaman damgası → UTC an. Zone'suz İstanbul yereli (ölçüldü, başlıktaki
 * kanıt); TR'de yaz saati uygulaması yok, sabit +03:00 güvenli.
 */
export function hbAni(metin: string): Date | null {
  if (typeof metin !== "string" || metin.length < 19) return null;
  const d = new Date(metin + "+03:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Kalem komisyon oranı: HB alanı DOLUYSA (0 dahil) kanal belgesidir, aynen
 * geçer; NULL ise `null` döner ve çağıran ChannelSku'dan doldurur.
 */
export function hbKomisyonOrani(ham: unknown): number | null {
  if (ham === null || ham === undefined) return null;
  const n = Number(ham);
  return Number.isFinite(n) ? n : null;
}

type Kalem = {
  merchantSku: string;
  hbSku: string;
  adet: number;
  birimFiyat: number;
  kdv: number | null;
  komisyon: number | null;
};

type Aday = {
  siparisNo: string;
  soldAt: Date;
  kalemler: Kalem[];
  iptalliKalem: number;
  /**
   * ⛔ YAZIM ANINDAKİ KANAL DURUMU — SONRADAN ÖĞRENİLEMEZ.
   * `4707418677` yazıldığında `ClaimCreated` idi (talep açık). Bu bilgi
   * kanalda AKAR: yarın `Delivered` ya da `Returned` olur ve o siparişin
   * hangi hâlde deftere girdiği bir daha okunamaz. Not yazım ANINI dondurur.
   * ⚠ Notun kendisi ÇEVRİLMEZ ve sözlüğe girmez — deftere yazılan veridir
   *   (anayasa: kayıtlar yazıldıkları dilde kalıcıdır).
   */
  kanalDurumu: string;
};

function bekciTuruKosuyorMu(): boolean {
  return kilitDurumu().canli;
}

async function hesabiBul(
  prisma: PrismaClient,
  k: Kimlik,
): Promise<{ id: string; ad: string; olusturuldu: boolean } | null> {
  /** ⛔ ORTAK ÇÖZÜMLEYİCİ — listeleme yazıcısıyla AYNI gövde, aynı alan. */
  const c = await hbHesabiCoz(prisma, k.merchantId);
  if (c.tur === "BULUNDU") return { id: c.id, ad: c.ad, olusturuldu: false };
  /** ⛔ SESSİZ DÖNMEZ: niçin çözülemediği çağırana yazdırılır. */
  console.log("   " + hbHesapHatasi(c));
  if (k.ortam.toUpperCase() !== "TEST") return null;
  if (!YAZ) return { id: "(önizleme)", ad: "Hepsiburada — Test (SIT)", olusturuldu: true };
  const kanal = await prisma.channel.findFirst({
    where: { name: HB_KANAL_ADI },
    select: { id: true },
  });
  if (!kanal) return null;
  const yeni = await prisma.channelAccount.create({
    data: {
      name: "Hepsiburada — Test (SIT)",
      code: "HB-SIT-TEST",
      defaultCurrency: "TRY",
      channelId: kanal.id,
      /**
       * ⛔ `apiHesapKimligi`E YAZILIR, `externalId`E DEĞİL — ÇÖZÜMLEYİCİ
       * ORAYA BAKIYOR. `externalId` raporlardaki satıcı numarasıdır ve SIT
       * test hesabının böyle bir numarası YOKTUR; oraya Mağaza ID yazmak
       * sahip olmadığımız bir kimliği beyan etmek olurdu.
       * _(Anayasa: "kolon başlığı bir iddiadır — vekil alan gösterilmez".)_
       */
      apiHesapKimligi: k.merchantId,
      satisIcin: true,
    },
    select: { id: true, name: true },
  });
  return { id: yeni.id, ad: yeni.name, olusturuldu: true };
}

export type HbCekimOzeti = {
  partiKimligi: string;
  siparis: number;
  kacak: number;
  yazilan: number;
  hata: number;
  cakisanAtlandi: number;
  caprazCakisma: number;
};

/**
 * ⛔ ÇEKİRDEK — TEK GÖVDE, İKİ OKUYUCU (K166 deseninin HB karşılığı).
 *
 * Betik de sunucu ucu da BURAYI çağırır. İkinci bir çekim gövdesi yazılsaydı
 * biri düzeltilip öteki unutulduğunda iki kanal iki farklı kural uygular ve
 * fark ancak rakamlar ayrıştığında görülürdü.
 *
 * ⚠ `dbAdresi` SUNUCU UCUNDAN GELİR; betikte boş → `.env.canli`den okunur.
 * Sunucuda dosya yoktur, bu yüzden adres parametreyle taşınır.
 */
export async function hbCekimKos(ayar: {
  yaz: boolean;
  /** Onay kapsamı — boş dizi = süzgeç yok. */
  sadece?: string[];
  dbAdresi?: string;
}): Promise<
  HbCekimOzeti | { atlandi: "BEKCI_TURU" | "KIMLIK" | "VERITABANI" | "HESAP" }
> {
  const YAZ = ayar.yaz;
  const SADECE = ayar.sadece ?? [];
  if (bekciTuruKosuyorMu()) {
    console.log("");
    console.log("⏭ BEKÇİ TURU KOŞUYOR (.bekci-kilidi) — bu çekim ATLANDI; sonraki koşum yakalar.");
    console.log("");
    return { atlandi: "BEKCI_TURU" };
  }
  const k = kimlikOku();
  if (!k) {
    console.log("\n⛔ HB ANAHTARLARI EKSİK (.env.canli)\n");
    return { atlandi: "KIMLIK" };
  }
  /** ⚠ Sunucuda `.env.canli` YOKTUR — adres parametreyle gelir. */
  const adres =
    ayar.dbAdresi && ayar.dbAdresi !== ""
      ? ayar.dbAdresi
      : (() => {
          const c = canliYapilandirma();
          return c.tamam ? c.veri.ham : "";
        })();
  if (adres === "") {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    return { atlandi: "VERITABANI" };
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(adres) });
  const baslik = baslikKur(k);
  const okumaAni = new Date();
  const partiKimligi = `hb-${okumaAni.toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;

  console.log("\n" + "=".repeat(78));
  console.log(`K165 HB İÇE AKTARMA — ${YAZ ? "⚠ YAZIM MODU" : "ÖNİZLEME (yazmaz)"}  ·  ortam: ${k.ortam}`);
  console.log("=".repeat(78));
  console.log(`  parti kimliği : ${partiKimligi}`);

  const hesap = await hesabiBul(prisma, k);
  if (!hesap) {
    console.log("\n⛔ HESAP YOK ve bu ortamda OLUŞTURULMAZ — canlı hesap kimliği elle bağlanır.\n");
    await prisma.$disconnect();
    return { atlandi: "HESAP" };
  }
  console.log(`  kanal hesabı  : ${hesap.ad}${hesap.olusturuldu ? "  (YENİ — bu koşumda oluşturuluyor)" : ""}`);

  // ═══ ÖNCE SAYIM ═════════════════════════════════════════════════════════
  const onceToplam = await prisma.sale.count();
  console.log(`\n① ÖNCE SAYIM — Sale TOPLAM ${onceToplam}`);

  /* ═══ ÇEKİM — İKİ ADIM: NUMARALARI TOPLA, DETAYI TEK TEK ÇEK ══════════
   *
   * ⛔ ESKİ HÂL: `/orders` ucundan kalem düzeyi çekiliyordu. GEREKÇE SİLİNMEDİ,
   * ÇÜRÜDÜ: o uç SIT'te doluydu, CANLIDA **her durum denemesinde 0** döndü.
   * Ölçüldü 07.09.2026 — panelde 4 gönderime hazır + 12 kargoda dururken:
   *
   *     /orders (12 durum denendi)   0
   *     /packages                    4  (Open · TAM kayıt)
   *     /packages/{id}/shipped      12  (ince · TUTAR YOK)
   *     /packages/{id}/delivered    69  (ince · TUTAR YOK)
   *
   * Sipariş numaraları PAKET uçlarında, tutarlar ise yalnız `Open` kaydında
   * ve `orders/.../ordernumber/{no}` DETAYINDA. Detay ucu her durumda tam
   * kayıt veriyor (`Packaged` dahil), o yüzden numara TOPLANIR, detay TEK TEK
   * çekilir. `/packages`ın kendi kalemleriyle yetinilseydi `Open`dan çıkmış
   * her sipariş sessizce KAÇARDI.
   */
  const siparisNolari = new Set<string>();
  const acik = await tumKayitlar((o, l) => UCLAR.paketler(k, o, l), baslik, 100);
  if (acik.tur !== "TAMAM") {
    console.log(`\n⛔ AÇIK PAKETLER OKUNAMADI (${acik.tur === "HATA" ? acik.sonuc.tur : "zarf tanınmadı"}) — hüküm yok.\n`);
    await prisma.$disconnect();
    /** ⛔ AÇIK UÇ OKUNAMAZSA ÇEKİM YAPILMAZ — eksik kümeyle yazım yapılmaz. */
    return { atlandi: "VERITABANI" };
  }
  for (const p of acik.kayitlar as Record<string, unknown>[]) {
    for (const x of (p.items ?? []) as Record<string, unknown>[]) {
      const no = String(x.orderNumber ?? "");
      if (no !== "") siparisNolari.add(no);
    }
  }
  const acikSayisi = siparisNolari.size;

  const gonderilen = await tumKayitlar((o, l) => UCLAR.paketlerGonderilen(k, o, l), baslik, 100);
  let gonderilenSayisi = 0;
  /**
   * ⛔ KANALIN SÖYLEDİĞİNİ ARTIK ATMIYORUZ (K195, 09.09.2026).
   * Bu uç `ShippedDate` de veriyor; eski hâl yalnız sipariş NUMARASINI
   * topluyor, tarihi çöpe atıyordu. `shippedAt` ise defterde 7600 satışta
   * BOŞTU ve görev kutusu bu yüzden şişiyordu (K60).
   *
   * ⚠ TARİHTE SAAT DİLİMİ YOK ("2026-09-04T13:58:48") ve bu ÖLÇÜLMÜŞ bir
   * tehlike: `new Date()` onu bu makinede (Europe/Berlin) 1 saat, Vercel'de
   * (UTC) 3 saat ERKEN okur. Kullanıcı kararı 09.09: SAATTEN VAZGEÇ, GÜNÜ
   * KULLAN — ve gün `Date` kurulmadan dizeden kesilir.
   */
  const kargoDamgalari = new Map<string, Date>();
  /**
   * KANALIN BİLDİRDİĞİ GERÇEKLEŞEN DESİ (K197-4) — `/shipped` ucundaki `Deci`.
   * ⛔ Bu bir ÖLÇÜMDÜR: `cargoAmount`a, NET'e ve kâr hesabına DOKUNMAZ.
   * Defterdeki `cargoDesi` bizim tahminimizdir ve o da değişmez.
   */
  const kanalDesileri = new Map<string, number>();
  if (gonderilen.tur === "TAMAM") {
    for (const p of gonderilen.kayitlar as Record<string, unknown>[]) {
      /** ⚠ İNCE ŞEKİL **PascalCase** — `orderNumber` değil `OrderNumber`. */
      for (const alan of ["OrderNumber", "orderNumber"]) {
        const v = p[alan];
        if (typeof v === "string" && v !== "") {
          if (!siparisNolari.has(v)) gonderilenSayisi++;
          siparisNolari.add(v);
          const d = hbKargoDamgasi(p.ShippedDate ?? p.shippedDate);
          if (d.tur !== "YOK" && !kargoDamgalari.has(v)) kargoDamgalari.set(v, d.an);
          /** ⚠ Sayı OLMAYAN değer atılır — kanal boş gönderirse uydurulmaz. */
          const ham = p.Deci ?? p.deci;
          const desi = typeof ham === "number" ? ham : Number(ham);
          if (Number.isFinite(desi) && desi > 0 && !kanalDesileri.has(v)) {
            kanalDesileri.set(v, desi);
          }
        }
      }
    }
  } else {
    /** ⛔ SESSİZ GEÇMEZ: kargodakiler okunamadıysa küme EKSİKTİR ve yazar. */
    console.log("\n   ⚠ KARGODAKİ PAKETLER OKUNAMADI — bu koşum EKSİK küme görüyor.");
  }

  /**
   * ⛔ TESLİM EDİLENLER DE TOPLANIR — VE BU BİR KAÇAK ÖLÇÜMÜNDEN SONRA.
   *
   * 07.09.2026 ölçümü: enumerasyon `açık + kargoda` ile sınırlıyken iki
   * sipariş hiç görünmedi ve defterde YOKTU — `4873413946` (Delivered,
   * ₺5.979) ve `4707418677` (ClaimCreated, ₺3.099). Toplam ₺9.078.
   * Kanaldan çekilen küme kanalın kendisinden dar olduğu sürece kaçak
   * SESSİZDİR: hata vermez, sayı vermez, kimse aramaz.
   */
  const teslim = await tumKayitlar((o, l) => UCLAR.paketlerTeslim(k, o, l), baslik, 100);
  let teslimSayisi = 0;
  /**
   * ⛔ TESLİM TARİHİ DE ARTIK ATILMIYOR (K195-2, 09.09.2026).
   *
   * ÖLÇÜLDÜ (`npm run canli:kargo-alan-olcum`, 09.09.2026) — bu uç şunları
   * veriyor: `Id · Barcode · PackageNumber · OrderNumber · OrderNumbers ·
   * MerchantId · DeliveredDate · EtgbNo`. Yani teslim TARİHİ var; eski hâl
   * yalnız sipariş NUMARASINI topluyor, tarihi çöpe atıyordu.
   *
   * ⛔ VE ÖLÇÜM BİR YOKLUĞU DA GÖSTERDİ: HB bu uçta **takip bağlantısı ve
   * kargo firması VERMİYOR** (TY ve N11 veriyor). Bu yüzden HB satışlarında
   * `kargoTakipBaglantisi` ve `kanalKargoFirmasi` BOŞ kalır — eksiklik
   * değil, ölçülmüş bir sınır. Vekil bir alan gösterilmiyor.
   * _(Anayasa: "kolon başlığı bir iddiadır — vekil alan gösterilmez".)_
   *
   * ⚠ TARİH DİLİMSİZ, `ShippedDate` ile aynı tuzak: `hbKargoDamgasi` gün
   * olarak keser, `new Date()` ÇAĞRILMAZ.
   */
  const teslimDamgalari = new Map<string, Date>();
  if (teslim.tur === "TAMAM") {
    for (const p of teslim.kayitlar as Record<string, unknown>[]) {
      for (const alan of ["OrderNumber", "orderNumber"]) {
        const v = p[alan];
        if (typeof v === "string" && v !== "") {
          if (!siparisNolari.has(v)) teslimSayisi++;
          siparisNolari.add(v);
          const d = hbKargoDamgasi(p.DeliveredDate ?? p.deliveredDate);
          if (d.tur !== "YOK" && !teslimDamgalari.has(v)) teslimDamgalari.set(v, d.an);
        }
      }
    }
  } else {
    console.log("\n   ⚠ TESLİM EDİLEN PAKETLER OKUNAMADI — bu koşum EKSİK küme görüyor.");
  }

  console.log(
    `\n   PAKET UÇLARI → açık ${acikSayisi} · kargoda +${gonderilenSayisi}` +
      ` · teslim +${teslimSayisi} · toplam ${siparisNolari.size} sipariş`,
  );

  /* ═══ KAÇAK RADARI — KANALDA VAR, DEFTERDE YOK ════════════════════════
   *
   * ⛔ NİYE: kaçak sipariş SESSİZDİR. `4873413946` ve `4707418677` aylarca
   * defterde yoktu ve hiçbir ekran bunu söylemiyordu. Bu sayı her koşumda
   * basılır ve ize geçer; sıfır olduğunda da yazar (İlke: "sıfır satır
   * gizlenmez — `0` yazar ve temiz olduğunu söyler").
   *
   * ⭐ VE DETAY YALNIZ BİLİNMEYENLER İÇİN ÇEKİLİR. Defterde zaten olan
   * siparişin detayına ihtiyaç YOK — nasılsa atlanacak. Enumerasyon
   * `delivered`ı da alınca numara sayısı ~85'e çıktı; hepsinin detayını
   * çekmek 85 gidiş-dönüş demekti ve her ay büyüyecekti.
   */
  const bilinen = await prisma.sale.findMany({
    where: { code: { in: [...siparisNolari] } },
    select: {
      code: true,
      channelAccountId: true,
      channelAccount: { select: { name: true, channel: { select: { name: true } } } },
    },
  });
  const bilinenKodlar = new Set(bilinen.map((s) => s.code!));
  const kacaklar = [...siparisNolari].filter((n) => !bilinenKodlar.has(n));
  console.log(`   ⚠ KAÇAK RADARI — kanalda var, DEFTERDE YOK: ${kacaklar.length}`);
  for (const n of kacaklar) console.log(`        ${n}`);

  /**
   * ⛔ DETAY TEK TEK — her biri bağımsız. Bir siparişin detayı düşerse
   * ötekiler devam eder; düşen SAYILIR ve ekranda yazar (sessiz eksilme yok).
   */
  const detayKalemleri: Record<string, unknown>[] = [];
  let detayDusen = 0;
  for (const no of kacaklar) {
    const d = await apiGet(UCLAR.siparisDetay(k, no), baslik);
    if (d.tur !== "VERI") {
      detayDusen++;
      continue;
    }
    const g = d.govde as Record<string, unknown>;
    for (const x of (g.items ?? []) as Record<string, unknown>[]) detayKalemleri.push(x);
  }
  const cekim = { kayitlar: detayKalemleri };
  console.log(`   detay çekilen (yalnız kaçaklar): ${kacaklar.length - detayDusen}`);
  if (detayDusen > 0) {
    console.log(`   ⚠ DETAYI OKUNAMAYAN SİPARİŞ: ${detayDusen}  ← YAZILMAZ`);
  }

  const adaylar = new Map<string, Aday>();
  let saatCozulemeyen = 0;
  /** ⚠ Satıcı indirimi olan kalem — gelir formülüne GİRMİYOR, sayılıyor. */
  let saticiIndirimliKalem = 0;
  for (const ham of cekim.kayitlar as Record<string, unknown>[]) {
    const no = String(ham.orderNumber);
    const an = hbAni(String(ham.orderDate));
    if (an === null) {
      saatCozulemeyen++;
      continue;
    }
    const aday =
      adaylar.get(no) ??
      ({ siparisNo: no, soldAt: an, kalemler: [], iptalliKalem: 0, kanalDurumu: "" } as Aday);
    /** ⚠ Kalem düzeyi durum; sipariş tek kalemliyse odur, çoklu ise sonuncusu
     *  değil BİRLEŞİK yazılır — biri iptal biri açık olabilir. */
    const durumMetni = String(ham.status ?? "");
    if (durumMetni !== "" && !aday.kanalDurumu.split(", ").includes(durumMetni)) {
      aday.kanalDurumu = aday.kanalDurumu === "" ? durumMetni : `${aday.kanalDurumu}, ${durumMetni}`;
    }
    if (String(ham.status) === "Cancelled") {
      aday.iptalliKalem++;
    } else {
      /**
       * ⛔ GELİR = ÖDENEN + HB'NİN KARŞILADIĞI İNDİRİM — ÖLÇÜLDÜ, SEÇİLMEDİ.
       *
       * HB müşteriye indirim yapıp farkı KENDİ komisyonundan karşılıyor ve
       * hakedişte `KAMPANYA` satırı olarak bize geri ödüyor. Panel (07.09):
       * liste 6.399,00 · HB indirimi 1.400,63 · satış 4.998,37 · komisyon
       * 998,24 (KDV dahil) → indirim komisyondan BÜYÜK, HB aradaki 402,39'u
       * BİZE ödüyor. Kasa: 4.998,37 + 402,39 = 6.399,00 − 998,24.
       *
       * ⭐ 135 sipariş üstünde doğrulandı: `ciro = SIPARIS_TUTARI + KAMPANYA`
       * 86 siparişte kuruşuna tuttu, 43'ü zaten indirimsizdi.
       *
       * ⛔ YALIN `unitPrice` KULLANILAMAZ — HB'nin karşıladığı indirim
       * ciromuzdan düşerdi ve NET olduğundan düşük görünürdü.
       *
       * ⭐ VE TABAN KANALIN KENDİ ARİTMETİĞİYLE DOĞRULANDI (07.09.2026),
       * "makul göründüğü için" seçilmedi — `4777369510`:
       *
       *     unitPrice 3.147,00 + hbDiscount 237,996 = 3.385,00
       *     komisyon 338,50 ÷ 3.385,00 = %10,0000   ← kayıtlı oranla TAM
       *     merchantDiscount(15) da eklenirse %9,9559 ✗ TUTMUYOR
       *
       * ⚠ `merchantDiscount` NEREYE GİDİYOR — ÇÖZÜLMEDİ, UYDURULMUYOR.
       * O siparişte satıcı indirimi 15,00 TL görünüyor ama müşteri
       * 3.147,00 ödemiş (3.385 − 238), yani 15 ne `unitPrice`tan düşülmüş
       * ne de komisyon tabanına girmiş. Hakediş kod listesinde de karşılığı
       * YOK. Bu yüzden formüle KATILMIYOR ve `merchantDiscount > 0` olan
       * kalemler AYRI SAYILIP ekranda beyan ediliyor.
       * _(Anayasa: "sistem, kendi defterinde takip etmediği şey hakkında
       * iddia kurmaz" — bilinmeyen sıfır sayılmaz, GÖRÜNÜR kılınır.)_
       */
      const odenen = Number((ham.unitPrice as { amount?: unknown })?.amount);
      const hbIndirimi = Number(
        (ham.hbDiscount as { unitPrice?: { amount?: unknown } })?.unitPrice?.amount ?? 0,
      );
      const birim = odenen + (Number.isFinite(hbIndirimi) ? hbIndirimi : 0);
      const saticiIndirimi = Number(
        (ham.merchantDiscount as { unitPrice?: { amount?: unknown } })?.unitPrice?.amount ?? 0,
      );
      if (Number.isFinite(saticiIndirimi) && saticiIndirimi > 0) saticiIndirimliKalem++;
      const adet = Number(ham.quantity ?? 0);
      if (Number.isFinite(birim) && adet > 0) {
        aday.kalemler.push({
          merchantSku: String(ham.merchantSKU ?? ""),
          hbSku: String(ham.sku ?? ""),
          adet,
          /** ⛔ BÖLME/ÇARPMA YOK — unitPrice BİRİM (ölçüldü, başlık). */
          birimFiyat: kurus(birim),
          kdv: ham.vatRate == null ? null : Number(ham.vatRate),
          komisyon: hbKomisyonOrani(ham.commissionRate),
        });
      }
    }
    adaylar.set(no, aday);
  }

  console.log(`\n② AKIŞ`);
  console.log(`   API kalem                                        ${cekim.kayitlar.length}`);
  console.log(`   sipariş (gruplandı)                              ${adaylar.size}`);
  if (saatCozulemeyen > 0) console.log(`   ⚠ SAATİ ÇÖZÜLEMEYEN KALEM                        ${saatCozulemeyen}  ← YAZILMAZ`);
  if (saticiIndirimliKalem > 0) {
    /**
     * ⛔ ÇÖZÜLMEMİŞ ALAN SESSİZ GEÇMEZ. Satıcı indirimi ne `unitPrice`ta ne
     * komisyon tabanında; hakediş kodlarında da karşılığı yok. Nereye
     * gittiği ÇÖZÜLENE KADAR ekranda durur ki kimse "hesaba katılmış"
     * sanmasın.
     */
    console.log(`   ⚠ SATICI İNDİRİMİ OLAN KALEM                     ${saticiIndirimliKalem}  ← ciroya GİRMEDİ (yeri çözülmedi)`);
  }

  /** Bütün kalemleri iptalli olan sipariş yazılmaz — ayrı sayılır. */
  const tumIptal = [...adaylar.values()].filter((a) => a.kalemler.length === 0);
  for (const a of tumIptal) adaylar.delete(a.siparisNo);
  if (tumIptal.length > 0) console.log(`   tamamı iptal kalemli → YAZILMAZ                  ${tumIptal.length}`);

  /* ═══ ÇAKIŞMA — KÜRESEL ATLA + SINIF ══════════════════════════════════
   *
   * ⛔ ARAMA KÜRESEL KALIR: `Sale.code` şemada **global `@unique`**
   * (`schema.prisma`). Anahtarı "kanal + sipariş no"ya daraltmak aday
   * elemede geçirir ama `INSERT`i benzersizlik kısıtına çarptırırdı —
   * TY'nin 26.08.2026'da düştüğü tuzağın aynısı ("kuru koşumun sayısı bu
   * yüzden İYİMSER olabilirdi").
   *
   * ⭐ AMA ÇAKIŞMA TEK CİNS DEĞİL VE İKİSİ AYRI İŞ İSTER:
   *   · AYNI KANAL   → bu sipariş zaten bizde; yeniden içe aktarma, BEKLENEN.
   *   · ÇAPRAZ KANAL → aynı numara BAŞKA bir kanalın satışında; o zaman bu
   *     HB siparişi o kodla deftere **HİÇ YAZILAMAZ** ve sessizce kaybolur.
   *     Bu yüzden ayrı sayılır, ekranda YÜKSEK SESLE yazar ve parti
   *     kimliğiyle ize geçer. _(Kullanıcı kararı 07.09.2026.)_
   */
  /**
   * ⛔ SINIFLAMA `bilinen`DEN — DETAY ARTIK YALNIZ KAÇAKLAR İÇİN ÇEKİLİYOR.
   * Enumerasyondaki numaraların defterde olanları zaten yukarıda bulundu;
   * çakışma sayısı ve cinsi oradan okunur.
   */
  const capraz = bilinen.filter((s) => s.channelAccountId !== hesap.id);
  const ayniKanal = bilinen.length - capraz.length;

  /**
   * ⛔ VE YAZIMDAN HEMEN ÖNCE İKİNCİ BİR KÜRESEL KONTROL — KALDIRILMADI.
   * Enumerasyon ile yazım arasında bir kayıt doğabilir (elle giriş, başka
   * koşum). `Sale.code` global `@unique`; bu kapı olmadan `INSERT` kısıta
   * çarpardı. İlk kontrol RAPOR içindir, bu kontrol GÜVENLİK içindir —
   * ikisi aynı şey değil.
   */
  const sonKontrol = await prisma.sale.findMany({
    where: { code: { in: [...adaylar.keys()] } },
    select: { code: true },
  });
  const mevcutKodlar = new Set(sonKontrol.map((s) => s.code!));
  const yarisEdenler = [...adaylar.keys()].filter((n) => mevcutKodlar.has(n));
  for (const n of yarisEdenler) adaylar.delete(n);
  if (yarisEdenler.length > 0) {
    console.log(`   ⚠ ENUMERASYONDAN SONRA DOĞAN KAYIT → ATLANDI: ${yarisEdenler.length}`);
  }
  const cakisanlar = [...bilinen.map((s) => s.code!), ...yarisEdenler];

  /**
   * ═══ KARGO DAMGASI — BOŞ ALANI DOLDURUR, HİÇBİR ŞEYİ EZMEZ (K195) ═══
   *
   * ⛔ "EZME YOK" İLKESİ ÇİĞNENMİYOR: yalnız `shippedAt` NULL olan satışlara
   * yazılıyor. Dolu bir damga ASLA değiştirilmiyor — boş bir alanı
   * doldurmak ezme değildir; ezme, var olan bir bilgiyi yok etmektir.
   * ⚠ Satır satır ve tekrar-koşulabilir: ikinci koşum dolu olanı atlar.
   */
  let damgaYazilan = 0;
  for (const [no, damga] of kargoDamgalari) {
    const guncel = await prisma.sale.updateMany({
      where: { code: no, channelAccountId: hesap.id, shippedAt: null },
      data: { shippedAt: damga },
    });
    damgaYazilan += guncel.count;
  }

  /**
   * ═══ TESLİM DAMGASI (K195-2) — AYNI KALIP, AYNI EZME YASAĞI ═══
   *
   * ⚠ HB'DE TAKİP BAĞLANTISI VE FİRMA YAZILMAZ — ÖLÇÜLDÜ, kanal bu iki
   * bilgiyi vermiyor. Boş kalıyorlar ve boş kalmaları doğru; vekil bir
   * değer (ör. bizim seçtiğimiz `cargoCarrier`) yazmak, kanalın
   * söylemediği bir şey hakkında iddia kurmak olurdu.
   *
   * ⚠ DAMGA GÜN HASSASİYETİNDE: HB'nin tarihi dilimsiz geldiği için saat
   * İDDİA EDİLMİYOR. Okuyan `gunHassasiyetliMi` ile bunu sorabilir.
   */
  let teslimYazilan = 0;
  for (const [no, damga] of teslimDamgalari) {
    const guncel = await prisma.sale.updateMany({
      where: { code: no, channelAccountId: hesap.id, deliveredAt: null },
      data: { deliveredAt: damga },
    });
    teslimYazilan += guncel.count;
  }

  /**
   * ═══ KANAL DESİSİ (K197-4) — ÖLÇÜM ALANI, DEFTERE DOKUNMAZ ═══
   * ⛔ `cargoAmount` ve `cargoDesi` BU DÖNGÜDE HİÇ GEÇMEZ. Kargo maliyeti
   * olduğu gibi kalır; burada biriken şey kanalın tarttığı desidir.
   * ⚠ Yalnız BOŞ olana yazılır: desi fiziksel bir olayın ölçüsüdür, bir kez
   * olur ve değişmez (`deliveredAt` sınıfı, `kanalKargoFirmasi` sınıfı değil).
   */
  let desiYazilan = 0;
  for (const [no, desi] of kanalDesileri) {
    const guncel = await prisma.sale.updateMany({
      where: { code: no, channelAccountId: hesap.id, kanalKargoDesi: null },
      data: { kanalKargoDesi: desi },
    });
    desiYazilan += guncel.count;
  }

  console.log(`   ÇAKIŞTI → ATLANDI (ezme YOK)                     ${cakisanlar.length}`);
  console.log(`   KARGO DAMGASI YAZILDI (yalnız BOŞ olanlara)      ${damgaYazilan}`);
  console.log(`   TESLİM DAMGASI YAZILDI (yalnız BOŞ olanlara)     ${teslimYazilan}`);
  console.log(`   KANAL DESİSİ YAZILDI (ölçüm — deftere dokunmaz)  ${desiYazilan}`);
  console.log(`     ├─ aynı kanal (yeniden içe aktarma, beklenen)  ${ayniKanal}`);
  console.log(`     └─ ÇAPRAZ KANAL (numara uzayı çakışması)       ${capraz.length}`);
  if (capraz.length > 0) {
    console.log("   ⛔ ÇAPRAZ ÇAKIŞMA — BU HB SİPARİŞLERİ DEFTERE HİÇ YAZILAMAZ:");
    for (const s of capraz) {
      console.log(
        `      ${s.code}  →  ${s.channelAccount.channel.name}/${s.channelAccount.name}`,
      );
    }
  }

  // ═══ VARYANT KAPISI — ortak kod kuralı, iki kod adayı ═══════════════════
  const tumKodlar = [
    ...new Set(
      [...adaylar.values()].flatMap((a) =>
        a.kalemler.flatMap((x) => [x.merchantSku, x.hbSku].filter((s) => s !== "")),
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
  /** Kalem çözümü: önce merchantSKU (bizim kod), sonra HB SKU. */
  const kalemVaryanti = (x: Kalem): string | "BELIRSIZ" | null => {
    for (const kod of [x.merchantSku, x.hbSku]) {
      if (kod === "") continue;
      if (belirsizKodlar.has(kod)) return "BELIRSIZ";
      const id = kodVaryant.get(kod);
      if (id) return id;
    }
    return null;
  };

  const yazilabilir: { aday: Aday; varyantIdler: string[] }[] = [];
  const yazilamaz: Aday[] = [];
  const belirsiz: Aday[] = [];
  for (const a of adaylar.values()) {
    const idler: string[] = [];
    let durum: "TAM" | "BELIRSIZ" | "YOK" = "TAM";
    for (const x of a.kalemler) {
      const v = kalemVaryanti(x);
      if (v === "BELIRSIZ") durum = "BELIRSIZ";
      else if (v === null) durum = durum === "BELIRSIZ" ? "BELIRSIZ" : "YOK";
      else idler.push(v);
    }
    if (durum === "TAM") yazilabilir.push({ aday: a, varyantIdler: idler });
    else if (durum === "BELIRSIZ") belirsiz.push(a);
    else yazilamaz.push(a);
  }
  if (belirsiz.length > 0) {
    console.log(`   ⛔ BELİRSİZ (kod birden çok varyantta)            ${belirsiz.length}`);
    for (const a of belirsiz) console.log(`        ${a.siparisNo}`);
  }
  console.log(`   YAZILABİLİR                                      ${yazilabilir.length}`);
  console.log(`   ⛔ YAZILAMAZ (kod kataloğumuzda yok)              ${yazilamaz.length}`);
  for (const a of yazilamaz) console.log(`        ${a.siparisNo} · ${a.kalemler.map((x) => x.merchantSku + "/" + x.hbSku).join(", ")}`);

  /**
   * ⛔ ONAY SÜZGECİ — kapsam daraltma, genişletme DEĞİL.
   * Süzgeçte olup adaylar arasında bulunmayan numara AYRICA yazılır:
   * "onayladım ama yazılmadı" ile "onayladım ve yazıldı" ayırt edilmeli.
   */
  let yazilacak = yazilabilir;
  if (SADECE.length > 0) {
    const adaylarKume = new Set(yazilabilir.map((x) => x.aday.siparisNo));
    yazilacak = yazilabilir.filter((x) => SADECE.includes(x.aday.siparisNo));
    const bulunamayan = SADECE.filter((n) => !adaylarKume.has(n));
    console.log(`\n   ⛔ ONAY SÜZGECİ: yalnız ${SADECE.length} sipariş yazılacak`);
    console.log(`      süzgeçte ${SADECE.length} · adaylarda bulunan ${yazilacak.length}`);
    if (bulunamayan.length > 0) {
      console.log(`      ⚠ SÜZGEÇTE OLUP YAZILAMAYAN: ${bulunamayan.join(", ")}`);
      console.log(`        (defterde zaten var · kodu tanınmadı · ya da detayı okunamadı)`);
    }
    const suzulen = yazilabilir.length - yazilacak.length;
    if (suzulen > 0) console.log(`      süzgeç DIŞINDA bırakılan: ${suzulen}`);
  }

  console.log(`\n③ YAZILACAK: ${yazilacak.length} sipariş  ·  beklenen Sale TOPLAM ${onceToplam + yazilacak.length}`);

  /**
   * ⛔ SAYI = LİSTE (İlke #16). Önizlemenin TEK işi "yazmadan önce gör"dü ve
   * NE yazacağını söylemiyordu: 08.09.2026'da rutin tetiği kurulurken
   * `YAZILACAK: 2` yazıyordu ve hangi iki sipariş olduğu hiçbir yerde
   * yoktu. Gözetimsiz koşacak bir yazıcı, yazacağını ÖNCE söylemek
   * zorunda — yoksa önizleme bir sayı üretir, karar üretmez.
   *
   * ⚠ Tutar yazılmaz: ciro tabanı kalem düzeyinde çözülüyor ve burada
   * ETİKETSİZ bir para basmak "birim mi toplam mı" tuzağını davet ederdi
   * (anayasa: bir sayı etiketiyle taşınır). Kimlik + an + kanal durumu,
   * yazımı tanımaya yeter.
   */
  for (const y of yazilacak) {
    console.log(
      `      · ${y.aday.siparisNo} · ${y.aday.soldAt.toISOString().slice(0, 16)}` +
        ` · ${y.aday.kalemler.length} kalem · kanal durumu: ${y.aday.kanalDurumu || "bilinmiyor"}`,
    );
  }

  if (!YAZ) {
    console.log(`\n${"=".repeat(78)}`);
    console.log(`  ÖNİZLEME — hiçbir şey yazılmadı. Yazmak için: -- --yaz`);
    console.log("=".repeat(78) + "\n");
    await prisma.$disconnect();
    return {
      partiKimligi,
      siparis: siparisNolari.size,
      kacak: kacaklar.length,
      yazilan: 0,
      hata: 0,
      cakisanAtlandi: cakisanlar.length,
      caprazCakisma: capraz.length,
    };
  }

  // ═══ YAZIM ══════════════════════════════════════════════════════════════
  console.log(`\n④ YAZILIYOR…`);
  let yazilan = 0;
  let hata = 0;
  let oranChannelSkudan = 0;
  for (const { aday } of yazilacak) {
    try {
      const kalemVerisi = [] as {
        variantId: string;
        quantity: number;
        unitPriceAmount: number;
        unitPriceCurrency: "TRY";
        vatRate: number | null;
        commissionRate: number | null;
      }[];
      for (const x of aday.kalemler) {
        const variantId = kalemVaryanti(x) as string;
        let komisyon = x.komisyon;
        if (komisyon === null) {
          /** Bugünkü TY dersi (11569147554): oran gelmezse satış
           *  RULE_MISSING'e düşer. Satış-anı snapshot kaynağı ChannelSku —
           *  oradan doldurulur; o da boşsa null kalır (bilinmiyor). */
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
          unitPriceAmount: x.birimFiyat,
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
          soldAt: aday.soldAt,
          /**
           * ⚠ KANALIN BİLDİRDİĞİ KARGO GÜNÜ (K195) — SAAT DEĞİL GÜN.
           * HB dilimsiz bir dize veriyor; saat okunsaydı koştuğu makineye
           * göre kayardı. Damga gün sınırında ve `gunHassasiyetliMi` ile
           * "bu saat gerçek değil" diye ayırt edilebiliyor.
           * `null` ise kanal "kargolandı" demedi — UYDURULMAZ.
           */
          shippedAt: kargoDamgalari.get(aday.siparisNo) ?? null,
          /** ⚠ Kanal "teslim edildi" demediyse BOŞ kalır — uydurulmaz. */
          deliveredAt: teslimDamgalari.get(aday.siparisNo) ?? null,
          /** ⛔ ÖLÇÜM ALANI — kargo tutarını ETKİLEMEZ (K197-4). */
          kanalKargoDesi: kanalDesileri.get(aday.siparisNo) ?? null,
          importBatch: partiKimligi,
          importKaynak: "hb-enumerasyon",
          /**
           * ⛔ YAZIM ANINDAKİ KANAL DURUMU — akan bir bilgi, dondurulmazsa
           * kaybolur. `ClaimCreated` bir siparişin yazıldığı an açık bir talep
           * olduğunu söyler; yarın durum değişince bu bir daha okunamaz.
           */
          note: `HB yazım anında kanal durumu: ${aday.kanalDurumu || "bilinmiyor"}`,
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
  const beklenen = onceToplam + yazilacak.length;
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
      action: "HB_SIPARIS_ICE_AKTARMA",
      targetType: "ChannelAccount",
      targetId: hesap.id,
      detail: JSON.stringify({
        partiKimligi,
        okumaAni: okumaAni.toISOString(),
        ortam: k.ortam,
        apiKalem: cekim.kayitlar.length,
        siparis: adaylar.size + cakisanlar.length + tumIptal.length,
        cakisanAtlandi: cakisanlar.length,
        /**
         * ⛔ ÇAPRAZ ÇAKIŞMA İZE GEÇER — parti kimliğiyle KALICI satır.
         * Ekran çıktısı koşumla birlikte kaybolur; bu sayı üç ay sonra
         * "burada niye bir sipariş eksik" sorusunun cevabıdır.
         */
        cakismaAyniKanal: ayniKanal,
        cakismaCaprazKanal: capraz.length,
        cakismaCaprazKodlar: capraz.map((s) => s.code),
        /**
         * ⛔ KAÇAK RADARI İZE GEÇER — ekran çıktısı koşumla kaybolur, bu sayı
         * üç ay sonra "burada niye bir sipariş eksik" sorusunun cevabıdır.
         */
        kacakSayisi: kacaklar.length,
        kacakKodlar: kacaklar,
        enumerasyonAcik: acikSayisi,
        enumerasyonKargoda: gonderilenSayisi,
        enumerasyonTeslim: teslimSayisi,
        tamamiIptal: tumIptal.length,
        saatCozulemeyen,
        saticiIndirimliKalem,
        belirsiz: belirsiz.length,
        yazilamazKod: yazilamaz.length,
        /** ⛔ ONAY SÜZGECİ İZE GEÇER — hangi kapsamda yazıldığı kaybolmasın. */
        onaySuzgeci: SADECE.length > 0 ? SADECE : null,
        yazilan,
        hata,
        oranChannelSkudan,
        saleOnce: onceToplam,
        saleSonra: sonraToplam,
        not: "StockMovement URETILMEDI - stok/kar bagi ONAY KUYRUGUNDAN (K164).",
      }),
    },
  });
  console.log(`   ✓ AuditLog yazıldı — HB_SIPARIS_ICE_AKTARMA`);

  console.log(`\n${"=".repeat(78)}`);
  console.log(`  GERİ ALMA ÖLÇÜTÜ: importBatch = ${partiKimligi} (liste değil, yeniden hesaplanabilir)`);
  console.log("=".repeat(78) + "\n");
  await prisma.$disconnect();
  return {
    partiKimligi,
    siparis: siparisNolari.size,
    kacak: kacaklar.length,
    yazilan,
    hata,
    cakisanAtlandi: cakisanlar.length,
    caprazCakisma: capraz.length,
  };
}

/**
 * ⛔ BETİK KİPİ — ÇEKİRDEĞİ ÇAĞIRIR, İKİNCİ BİR GÖVDE KURMAZ.
 * Argümanlar burada okunur; çekirdek argv bilmez (sunucuda argv yok).
 */
async function main() {
  const ozet = await hbCekimKos({ yaz: YAZ, sadece: SADECE });
  if ("atlandi" in ozet) {
    /** ⚠ Bekçi turu bir HATA DEĞİL — kırmızı dönmez, atlandı der. */
    if (ozet.atlandi !== "BEKCI_TURU") process.exitCode = 1;
    return;
  }
  if (ozet.hata > 0) process.exitCode = 1;
}

/** İçeri alındığında KOŞMAZ — TY importer'daki kusur düzeltmesinin aynısı. */
const dogrudanKosuluyor = (() => {
  const giris = process.argv[1] ?? "";
  return /canli-hb-ice-aktar\.(ts|js)$/.test(giris.split("\\").join("/"));
})();

if (dogrudanKosuluyor) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
