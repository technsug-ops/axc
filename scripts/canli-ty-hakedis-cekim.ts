/**
 * ============================================================================
 *  K220 — TRENDYOL HAKEDİŞİ API'DEN OTOMATİK ÇEKİM (19.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run canli:ty-hakedis-cekim            → KURU KOŞUM (yazmaz)
 *      npm run canli:ty-hakedis-cekim -- --yaz   → yazar
 *
 *  ⛔ ELLE EXCEL YÜKLEME YERİNE GEÇER, ONU SİLMEZ. `hakedisYaz`in kurduğu
 *  `rowKey` (externalId|siparişNo|hamTip) dedup'ı iki kaynak için de AYNI:
 *  TY'nin Excel'deki "Kayıt No" ile API'nin `id` alanı BİREBİR aynı değer
 *  (canlı ölçüldü 19.09.2026: `16067173` hem Excel satırında hem API
 *  kaydında). Yani bu betik daha önce Excel'den yüklenmiş bir satırı
 *  YENİDEN yazmaz — dedup kendiliğinden çalışır.
 *
 *  ÜÇ AYRI İŞ YAPAR, ÜÇÜ DE AYNI TARAMADAN ÇIKAR:
 *   ① YENİ SATIR — rowKey DB'de yoksa: yeni bir "parti" (Settlement) altında
 *      yazılır. Kaynak: `/settlements` (sipariş bazlı: Satış/İade/Kupon/…)
 *      + `/otherfinancials` (sipariş dışı: Stopaj/Kargo Fatura/Platform
 *      Hizmet — bkz. `scripts/ty/istemci.ts` UCLAR yorumu, bunlar
 *      `/settlements`ten HİÇ gelmiyor, ayrı uç).
 *   ② ÖDENME TAZELEME — rowKey DB'de VAR ve `paidAt` hâlâ boşsa, ama API
 *      artık `paymentOrderId` DOLU diyorsa: yalnız `paidAt` güncellenir.
 *      Bu, Trendyol kalemlerinin ekranda sonsuza kadar "ödenmemiş"
 *      görünmesinin GERÇEK çözümü (Excel'de bu bilgi hiç yok).
 *   ③ ÖDEME EMRİ TAZELEME (K220-③, 19.09.2026) — `paymentOrderId` sütunu
 *      bu satırdan SONRA eklendi; ondan önce yazılan (ve zaten ödenmiş)
 *      binlerce satırda hâlâ boş. Rowkey VAR ve `paymentOrderId` hâlâ
 *      boşsa, API'nin bildirdiği emir no'yla (varsa) tek seferlik doldurulur
 *      — `paidAt`ten BAĞIMSIZ, ikisi de yalnız "boşsa doldur" kuralına uyar.
 *
 *  ⛔ TUTARSIZLIK SESSİZCE EZİLMEZ: DB'deki tutar ile API'nin tutarı
 *  1 kuruştan fazla ayrışıyorsa o satıra DOKUNULMAZ, yalnız RAPORLANIR.
 *
 *  ⚠ PENCERE: hakediş uçları azami 15 gün taşıyor; `taramaGun` gün geriye
 *  15'lik dilimlere bölünerek taranır. GÜNLÜK KOŞUM (cron) 45 gün kullanır —
 *  ödeme dönemi azami 28 gün (ölçüldü) + emniyet payı, daha eski bir satırın
 *  ödenme durumu zaten ÖNCEKİ koşumlarda tazelenmiş OLMALIYDI.
 *
 *  ⛔ AMA İLK KOŞUMDA (ya da uzun süre koşulmadıysa) YETMEZ — ölçüldü
 *  19.09.2026: 45 günlük ilk koşumdan sonra 2380 kalem hâlâ ödenmemiş
 *  görünüyordu, çünkü tarama hiç ULAŞMADIĞI için (dueDate 2025-12-29 →
 *  2026-02'ye kadar 1380 kalem) `paymentOrderId`e hiç BAKILMAMIŞTI —
 *  "ödenmemiş" değil "hiç sorulmamış". Böyle bir GEÇMİŞ AÇIĞI varsa geniş
 *  pencereli tek seferlik bir koşum gerekir: `--gun=300` gibi.
 * ============================================================================
 */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { baslikKur, kimlikOku, tumSayfalar, UCLAR } from "./ty/istemci";
import { satirlariEslestir } from "../src/lib/hakedis/eslestir";
import { satirAnahtari } from "../src/lib/hakedis/okuyucu";
import { izYaz } from "../src/lib/iz";
import {
  odemeEmriGunleriniCoz,
  TY_API_SIPARIS_DISI_TIPLERI,
  TY_API_SIPARIS_TIPLERI,
  tyApiSatirlariniOku,
  type TyFinansKaydi,
} from "../src/lib/hakedis/ty-api-oku";

const GUN_MS = 86_400_000;
const PENCERE_GUN = 15;
const TARAMA_GUN_VARSAYILAN = 45;

function para(x: number): string {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function gun(x: number | Date): string {
  return new Date(x).toISOString().slice(0, 10);
}
function bekle(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * ⚠ 429 (Too Many Requests) — geniş pencereli (`--gun=310`) ilk koşumda
 * ÖLÇÜLDÜ (19.09.2026): 252 ardışık çağrı TY'nin hız sınırına çarptı ve
 * bir pencere sessizce EKSİK kaldı (hata RAPORLANDI ama veri gelmedi).
 * Her çağrı arasına küçük bir bekleme + 429'a özel tekrar deneme eklendi.
 */
async function tumSayfalarSabirli(
  yolKur: (sayfa: number) => string,
  baslik: Record<string, string>,
): Promise<Awaited<ReturnType<typeof tumSayfalar>>> {
  for (let deneme = 0; deneme < 4; deneme++) {
    const s = await tumSayfalar(yolKur, baslik);
    const uc429 = s.tur === "HATA" && s.sonuc.tur === "ULASILAMADI" && s.sonuc.sebep === "HTTP 429";
    if (!uc429) {
      await bekle(400);
      return s;
    }
    await bekle(2000 * (deneme + 1));
  }
  return tumSayfalar(yolKur, baslik);
}

export type TyHakedisCekimOzeti = {
  kip: "ONIZLEME" | "YAZIM";
  cekilenHam: number;
  digerSayisi: number;
  eslesen: number;
  eslesmeyen: number;
  siparisDisi: number;
  yeni: number;
  tazelenen: number;
  tutarsiz: number;
  netToplam: number;
  hataSayisi: number;
};

/**
 * ⚠ ROUTE'DAN DA, CLI'DAN DA ÇAĞRILIR (K166 deseni — bkz. `tyCekimKos`).
 * `dbAdresi` verilmezse `.env.canli`den okunur (yerel koşum); sunucu
 * ucundan `process.env.DATABASE_URL` verilir.
 */
export async function tyHakedisCekimKos(ayar: {
  yaz: boolean;
  dbAdresi?: string;
  /** Kaç gün geriye taranacak. Günlük koşum 45 yeterli; geçmiş açığı
   *  kapatmak için tek seferlik geniş bir değer (ör. 300) verilir. */
  taramaGun?: number;
}): Promise<TyHakedisCekimOzeti | { atlandi: "KIMLIK" | "VERITABANI" | "HESAP" }> {
  const YAZ = ayar.yaz;
  const TARAMA_GUN = ayar.taramaGun ?? TARAMA_GUN_VARSAYILAN;
  const kimlik = kimlikOku();
  if (!kimlik) {
    console.log("\n⛔ TY KİMLİĞİ OKUNAMADI (.env.canli / süreç ortamı).");
    return { atlandi: "KIMLIK" };
  }
  const baslik = baslikKur(kimlik);

  let dbAdresi = ayar.dbAdresi ?? null;
  if (dbAdresi === null) {
    const c = canliYapilandirma();
    if (!c.tamam) {
      console.log("\n⛔ CANLI ADRES OKUNAMADI:", JSON.stringify(c));
      return { atlandi: "VERITABANI" };
    }
    dbAdresi = betikAdresi(c.veri.ham);
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(dbAdresi) });

  console.log("\n" + "=".repeat(100));
  console.log("TY HAKEDİŞ — API ÇEKİM " + (YAZ ? "⚠ YAZIM" : "(KURU KOŞUM, yazmaz)"));
  console.log("=".repeat(100));

  const hesap = await prisma.channelAccount.findFirst({
    where: { externalId: kimlik.saticiId },
    select: { id: true, name: true, channel: { select: { name: true } } },
  });
  if (!hesap) {
    console.log(`\n⛔ externalId=${kimlik.saticiId} olan kanal hesabı yok.\n`);
    await prisma.$disconnect();
    return { atlandi: "HESAP" };
  }
  console.log(`Kanal hesabı: ${hesap.channel.name} — ${hesap.name}\n`);

  // ── ① TÜM PENCERE/TİP KOMBİNASYONLARINI ÇEK ──────────────────────────────
  const simdi = Date.now();
  const enEski = simdi - TARAMA_GUN * GUN_MS;
  const tumKayitlar: TyFinansKaydi[] = [];
  /** ⛔ AYRI KOVA — kalem olarak YAZILMAZ, yalnız ödeme GÜNÜ için okunur. */
  const odemeEmriKayitlari: TyFinansKaydi[] = [];
  const hatalar: string[] = [];

  const pencereSayisi = Math.ceil(TARAMA_GUN / PENCERE_GUN);
  for (let p = 0; p < pencereSayisi; p++) {
    const son = simdi - p * PENCERE_GUN * GUN_MS;
    const bas = Math.max(son - PENCERE_GUN * GUN_MS, enEski);

    for (const tur of TY_API_SIPARIS_TIPLERI) {
      const s = await tumSayfalarSabirli(
        (sayfa) => UCLAR.hakedis(kimlik.saticiId, bas, son, sayfa, tur),
        baslik,
      );
      if (s.tur === "HATA") {
        hatalar.push(`settlements/${tur} ${gun(bas)}→${gun(son)}: ${JSON.stringify(s.sonuc).slice(0, 150)}`);
        continue;
      }
      tumKayitlar.push(...(s.kayitlar as TyFinansKaydi[]));
    }
    for (const tur of TY_API_SIPARIS_DISI_TIPLERI) {
      const s = await tumSayfalarSabirli(
        (sayfa) => UCLAR.otherFinancials(kimlik.saticiId, bas, son, sayfa, tur),
        baslik,
      );
      if (s.tur === "HATA") {
        hatalar.push(`otherfinancials/${tur} ${gun(bas)}→${gun(son)}: ${JSON.stringify(s.sonuc).slice(0, 150)}`);
        continue;
      }
      tumKayitlar.push(...(s.kayitlar as TyFinansKaydi[]));
    }

    /**
     * ⛔ ÖDEME EMİRLERİ AYRI KOVAYA — `tumKayitlar`a GİRMEZ (K223, 21.09.2026).
     * `PaymentOrder` kaydı emrin TOPLAMINI taşır; kalem olarak yazılsaydı
     * aynı para ikinci kez sayılırdı (`TY_API_SIPARIS_DISI_TIPLERI` bu yüzden
     * onu içermiyor). Buraya YALNIZ TARİHİ için geliyor: bir emrin gerçek
     * ödendiği gün başka hiçbir yerde yok.
     */
    const po = await tumSayfalarSabirli(
      (sayfa) => UCLAR.otherFinancials(kimlik.saticiId, bas, son, sayfa, "PaymentOrder"),
      baslik,
    );
    if (po.tur === "HATA") {
      hatalar.push(`otherfinancials/PaymentOrder ${gun(bas)}→${gun(son)}: ${JSON.stringify(po.sonuc).slice(0, 150)}`);
    } else {
      odemeEmriKayitlari.push(...(po.kayitlar as TyFinansKaydi[]));
    }
  }

  if (hatalar.length > 0) {
    console.log(`⚠ ${hatalar.length} çağrı başarısız (ULAŞILAMADI ≠ "veri yok"):`);
    for (const h of hatalar.slice(0, 10)) console.log("   " + h);
  }

  // Aynı kayıt birden çok pencerede çıkmaz (transactionDate pencereleri
  // ayrık) ama emniyet için id bazlı tekilleştirilir.
  const benzersiz = new Map<string, TyFinansKaydi>();
  for (const k of tumKayitlar) benzersiz.set(String(k.id), k);
  console.log(`\nÇekilen ham kayıt: ${tumKayitlar.length} · tekil: ${benzersiz.size}`);

  /**
   * ⛔ "KOMİSYON FATURASI" YAZILMAZ — ÇAPRAZ ÖLÇÜLDÜ (19.09.2026).
   * `DeductionInvoices` ucu bu tipi de veriyor ama bu, HER `Satış` satırında
   * zaten netlenmiş `commissionAmount`ın DÖNEMSEL TOPLAMI — ikinci kez
   * yazılırsa komisyon İKİ KEZ düşer. Ölçüm: 01-07 + 08-14 Eylül faturaları
   * ₺38.756,42 · aynı aralıktaki 164 Satış satırının commissionAmount'ı
   * ₺40.535,29 (oran 0,956 — fark, fatura aralığının Sale sorgusundan 1 gün
   * dar olmasından; aynı parayı anlatıyorlar). `Komisyon Faturası` hariç
   * DIĞER her tanınmayan tip normal DIGER akışına girer (yazılır + uyarır).
   */
  const HARIC_TUTULAN_TIPLER = new Set(["Komisyon Faturası"]);
  const filtrelenmis = [...benzersiz.values()].filter(
    (k) => !HARIC_TUTULAN_TIPLER.has(k.transactionType),
  );
  const haricSayisi = benzersiz.size - filtrelenmis.length;
  if (haricSayisi > 0) {
    console.log(`⛔ ${haricSayisi} "Komisyon Faturası" kaydı HARİÇ tutuldu (mükerrer para — bkz. yorum).`);
  }

  /**
   * K220-③ (19.09.2026) — ÖDEME EMRİ HARİTASI. `HakedisSatiri` ortak
   * modeli (Excel + API) `paymentOrderId` TAŞIMAZ — yalnız API'ye özel bir
   * alan, paylaşılan modele SIZDIRILMADI. Yan haritayla eşleniyor:
   * externalId (= API'nin `id`si, satır anahtarının parçası) → emir no.
   */
  const paymentOrderIdHaritasi = new Map<string, string | null>(
    filtrelenmis.map((k) => [
      String(k.id),
      k.paymentOrderId !== null && k.paymentOrderId !== undefined ? String(k.paymentOrderId) : null,
    ]),
  );

  /**
   * K223 (21.09.2026) — GERÇEK ÖDEME GÜNÜ HARİTASI: emir no → ödendiği an.
   * Kaynak ayrı kovadaki `PaymentOrder` kayıtları; kalem olarak yazılmazlar.
   *
   * ⛔ BOŞ HARİTA "hiçbiri ödenmemiş" DEMEK DEĞİL — "günü bilmiyorum" demek.
   * İkisi ayrı sayılır ve aşağıda AYRI raporlanır, yoksa boş bir sonuç temiz
   * bir sonuç gibi görünür.
   */
  const odemeGunleri = odemeEmriGunleriniCoz(odemeEmriKayitlari);
  console.log(
    `Ödeme emri kaydı: ${odemeEmriKayitlari.length} ham · ${odemeGunleri.size} tekil emir (gerçek ödeme günü buradan)`,
  );

  const tumSatirlar = tyApiSatirlariniOku(filtrelenmis, odemeGunleri);

  /**
   * ⚠ KAPSAM BOŞLUĞU GÖRÜNÜR OLUR: ödenmiş görünen ama emrinin günü
   * elimizde OLMAYAN kalemler. Bunlar bu koşumda ödenmiş yazılmaz ve
   * sessizce kaybolmasınlar diye sayılır.
   */
  const gunuBilinmeyen = filtrelenmis.filter(
    (k) =>
      k.paymentOrderId !== null &&
      k.paymentOrderId !== undefined &&
      !odemeGunleri.has(String(k.paymentOrderId)),
  );
  if (gunuBilinmeyen.length > 0) {
    const emirler = new Set(gunuBilinmeyen.map((k) => String(k.paymentOrderId)));
    console.log(
      `⚠ ${gunuBilinmeyen.length} kalem ÖDENMİŞ ama emrinin günü bu pencerede YOK` +
        ` (${emirler.size} emir) — ödenmiş YAZILMAZ, sonraki koşumda dolar.`,
    );
    console.log(`   emirler: ${[...emirler].slice(0, 8).join(", ")}`);
  }
  const digerSayisi = tumSatirlar.filter((s) => s.kod === "DIGER").length;
  if (digerSayisi > 0) {
    const gruplar = new Map<string, { sayi: number; toplam: number }>();
    for (const s of tumSatirlar.filter((s) => s.kod === "DIGER")) {
      const g = gruplar.get(s.hamTip) ?? { sayi: 0, toplam: 0 };
      g.sayi++;
      g.toplam += s.tutar;
      gruplar.set(s.hamTip, g);
    }
    console.log(`⚠ ${digerSayisi} satır TANINMAYAN tipte (kod=DIGER):`);
    for (const [hamTip, g] of gruplar) {
      console.log(`   ${hamTip.padEnd(35)} adet=${g.sayi}  toplam=${para(g.toplam)}`);
    }
  }

  // ── ② SATIŞLARLA EŞLEŞTİR ────────────────────────────────────────────────
  const siparisNolar = [
    ...new Set(tumSatirlar.map((s) => s.siparisNo).filter((n): n is string => !!n)),
  ];
  const satisKayitlari = await prisma.sale.findMany({
    where: { code: { in: siparisNolar }, iptalTarihi: null, channelAccountId: hesap.id },
    select: {
      id: true,
      code: true,
      soldAt: true,
      returns: {
        where: { exchangeDeliveredAt: { not: null } },
        select: { exchangeDeliveredAt: true },
        orderBy: { exchangeDeliveredAt: "desc" },
        take: 1,
      },
    },
  });
  const satislar = satisKayitlari.map((s) => ({
    id: s.id,
    kod: s.code,
    satisTarihi: s.returns[0]?.exchangeDeliveredAt ?? s.soldAt,
  }));
  const eslesme = satirlariEslestir(tumSatirlar, satislar);
  const hepsi = [
    ...eslesme.eslesenler.map((e) => ({ satir: e.satir, saleId: e.saleId as string | null })),
    ...eslesme.eslesmeyenler.map((s) => ({ satir: s, saleId: null as string | null })),
    ...eslesme.siparisDisi.map((s) => ({ satir: s, saleId: null as string | null })),
  ];

  console.log(
    `Eşleşen: ${eslesme.eslesenler.length} · eşleşmeyen: ${eslesme.eslesmeyenler.length} · sipariş dışı: ${eslesme.siparisDisi.length}`,
  );

  // ── ③ DB'DEKİ MEVCUT DURUMLA KARŞILAŞTIR ────────────────────────────────
  const anahtarlar = hepsi.map((h) => satirAnahtari(h.satir));
  const parcaBoyutu = 1000;
  const mevcutlar: {
    id: string;
    rowKey: string;
    paidAt: Date | null;
    amount: unknown;
    paymentOrderId: string | null;
  }[] = [];
  for (let i = 0; i < anahtarlar.length; i += parcaBoyutu) {
    mevcutlar.push(
      ...(await prisma.settlementItem.findMany({
        where: { channelAccountId: hesap.id, rowKey: { in: anahtarlar.slice(i, i + parcaBoyutu) } },
        select: { id: true, rowKey: true, paidAt: true, amount: true, paymentOrderId: true },
      })),
    );
  }
  const mevcutHarita = new Map(mevcutlar.map((m) => [m.rowKey, m]));

  const yeniler: typeof hepsi = [];
  const tazelenecekler: {
    itemId: string;
    eskiPaidAt: Date | null;
    yeniPaidAt: Date | null;
    siparisNo: string | null;
    tutar: number;
    yeniPaymentOrderId: string | null;
  }[] = [];
  const tutarsizlar: { rowKey: string; dbTutar: number; apiTutar: number; hamTip: string }[] = [];

  for (const h of hepsi) {
    const anahtar = satirAnahtari(h.satir);
    const var_ = mevcutHarita.get(anahtar);
    if (!var_) {
      yeniler.push(h);
      continue;
    }
    const dbTutar = Number(var_.amount!.toString());
    if (Math.abs(dbTutar - h.satir.tutar) > 0.01) {
      tutarsizlar.push({ rowKey: anahtar, dbTutar, apiTutar: h.satir.tutar, hamTip: h.satir.hamTip });
      continue;
    }
    /**
     * ⚠ İKİ AYRI ALAN, İKİ AYRI TAZELEME — ama TEK UPDATE ÇAĞRISI.
     * `paidAt` boştan dolar (K220-①); `paymentOrderId` de AYRICA boştan
     * dolabilir — bu sütun 19.09.2026'da eklendiği için ondan önce yazılan
     * 4946 ödenmiş satırın hepsinde hâlâ NULL. İkisi de "yalnız boşsa
     * doldur, DOLUYSA dokunma" kuralına uyar — "gerçekleşen değerin
     * üzerine asla yazılmaz" kuralının bu alandaki karşılığı.
     */
    const apiPaymentOrderId = paymentOrderIdHaritasi.get(h.satir.externalId) ?? null;
    const paidAtDolduracak = var_.paidAt === null && h.satir.odemeTarihi !== null;
    const paymentOrderIdDolduracak = var_.paymentOrderId === null && apiPaymentOrderId !== null;
    if (paidAtDolduracak || paymentOrderIdDolduracak) {
      tazelenecekler.push({
        itemId: var_.id,
        eskiPaidAt: var_.paidAt,
        yeniPaidAt: paidAtDolduracak ? h.satir.odemeTarihi : null,
        siparisNo: h.satir.siparisNo,
        tutar: h.satir.tutar,
        yeniPaymentOrderId: paymentOrderIdDolduracak ? apiPaymentOrderId : null,
      });
    }
  }

  // ── ④ ÖZET ───────────────────────────────────────────────────────────────
  const yeniToplam = yeniler.reduce((t, y) => t + y.satir.tutar, 0);
  console.log("\n" + "-".repeat(100));
  console.log(`YENİ satır (DB'de hiç yok)         : ${yeniler.length}`);
  console.log(`TAZELENECEK (ödeme durumu ve/veya ödeme emri no boştan dolar) : ${tazelenecekler.length}`);
  console.log(`ZATEN AYNI (dokunulmaz)            : ${hepsi.length - yeniler.length - tazelenecekler.length - tutarsizlar.length}`);
  console.log(`⚠ TUTARSIZ (dokunulmaz, raporlanır) : ${tutarsizlar.length}`);
  if (tutarsizlar.length > 0) {
    for (const t of tutarsizlar.slice(0, 10)) {
      console.log(`   ${t.hamTip.padEnd(20)} DB=${para(t.dbTutar)} API=${para(t.apiTutar)}`);
    }
  }
  if (yeniler.length > 0) {
    console.log(`\nYeni satırların net toplamı: ${para(yeniToplam)}`);
  }
  console.log("-".repeat(100));

  const ozet: TyHakedisCekimOzeti = {
    kip: YAZ ? "YAZIM" : "ONIZLEME",
    cekilenHam: tumKayitlar.length,
    digerSayisi,
    eslesen: eslesme.eslesenler.length,
    eslesmeyen: eslesme.eslesmeyenler.length,
    siparisDisi: eslesme.siparisDisi.length,
    yeni: yeniler.length,
    tazelenen: tazelenecekler.length,
    tutarsiz: tutarsizlar.length,
    netToplam: yeniToplam,
    hataSayisi: hatalar.length,
  };

  if (!YAZ) {
    console.log("\nKURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: --yaz\n");
    await prisma.$disconnect();
    return ozet;
  }

  // ── ⑤ YAZIM ──────────────────────────────────────────────────────────────
  if (yeniler.length > 0) {
    const paraBirimi = yeniler[0].satir.paraBirimi;
    const partiId = await prisma.$transaction(async (tx) => {
      const parti = await tx.settlement.create({
        data: {
          channelAccountId: hesap.id,
          sourceFile: `TY API — ${gun(enEski)}→${gun(simdi)}`,
          amount: String(yeniToplam),
          currency: paraBirimi,
        },
        select: { id: true },
      });
      await tx.settlementItem.createMany({
        data: yeniler.map(({ satir, saleId }) => ({
          settlementId: parti.id,
          channelAccountId: hesap.id,
          saleId,
          externalId: satir.externalId,
          rowKey: satirAnahtari(satir),
          code: satir.kod,
          rawType: satir.hamTip,
          orderNo: satir.siparisNo,
          amount: String(satir.tutar),
          currency: satir.paraBirimi,
          dueDate: satir.vadeTarihi,
          paidAt: satir.odemeTarihi,
          paymentOrderId: paymentOrderIdHaritasi.get(satir.externalId) ?? null,
          rawRow: satir.ham,
        })),
      });
      await izYaz(
        {
          action: "TY_HAKEDIS_API_YENI_PARTI",
          targetType: "Settlement",
          targetId: parti.id,
          userId: null,
          detail: JSON.stringify({ satirSayisi: yeniler.length, toplam: yeniToplam }),
        },
        tx,
      );
      return parti.id;
    });
    console.log(`✓ ${yeniler.length} yeni satır yazıldı (parti ${partiId}).`);
  }

  for (const t of tazelenecekler) {
    await prisma.$transaction(async (tx) => {
      /** ⚠ YALNIZ DOLU OLAN ALAN GÖNDERİLİR — `undefined` Prisma'da "bu
       *  alana dokunma" demektir, `null` DEĞİL. Bu ayrım korunmazsa yalnız
       *  paymentOrderId tazelenen bir satırın `paidAt`i (zaten null'du)
       *  yeniden null'a "yazılır" — zararsız ama gereksiz bir alan daha
       *  UPDATE'e girer ve iz mesajı yanıltıcı olur. */
      await tx.settlementItem.update({
        where: { id: t.itemId },
        data: {
          ...(t.yeniPaidAt !== null ? { paidAt: t.yeniPaidAt } : {}),
          ...(t.yeniPaymentOrderId !== null ? { paymentOrderId: t.yeniPaymentOrderId } : {}),
        },
      });
      await izYaz(
        {
          action: "TY_HAKEDIS_ODENDI_TAZELE",
          targetType: "SettlementItem",
          targetId: t.itemId,
          userId: null,
          detail: JSON.stringify({
            eskiPaidAt: t.eskiPaidAt,
            yeniPaidAt: t.yeniPaidAt,
            yeniPaymentOrderId: t.yeniPaymentOrderId,
            siparisNo: t.siparisNo,
            tutar: t.tutar,
          }),
        },
        tx,
      );
    });
  }
  if (tazelenecekler.length > 0) {
    console.log(`✓ ${tazelenecekler.length} kalem tazelendi (ödeme durumu ve/veya ödeme emri no).`);
  }

  /**
   * ⭐ KALP ATIŞI — DEĞİŞİKLİK OLMASA BİLE YAZILIR (19.09.2026).
   * Diğer izler yalnız bir şey DEĞİŞTİĞİNDE doğar; bir gün hiçbir yeni
   * satır ve tazeleme yoksa (koşum yine de BAŞARILIYSA) hiçbir iz kalmaz
   * ve "son çalıştı" sorusu cevapsız kalır. /hakedis ekranındaki "son
   * senkronizasyon" rozeti BU izi okur.
   */
  /**
   * ⚠ `prisma` AÇIKÇA VERİLİR — `izYaz`in varsayılanı paylaşılan
   * `@/lib/prisma` tekilidir ve bu betik ONU HİÇ KULLANMIYOR (K166 deseni:
   * `dbAdresi` ile KENDİ istemcisini kuruyor, `process.env.DATABASE_URL`a
   * dokunmuyor). Varsayılana bırakılsaydı yerel `--gun=` koşumlarında iz
   * YANLIŞ veritabanına (yerel `.env`) düşerdi.
   */
  await izYaz(
    {
      action: "TY_HAKEDIS_CEKIM_CALISTI",
      targetType: "ChannelAccount",
      targetId: hesap.id,
      userId: null,
      detail: JSON.stringify(ozet),
    },
    prisma,
  );

  await prisma.$disconnect();
  return ozet;
}

/**
 * ═══ İÇERİ ALINDIĞINDA KOŞMAZ ═══ (aynı desen: `canli-ty-ice-aktar.ts`)
 * `process.argv[1]` bu dosyayı gösteriyorsa doğrudan çalıştırılmıştır;
 * route bu modülü import ettiğinde KOŞMAZ.
 */
const dogrudanKosuluyor = (() => {
  const giris = process.argv[1] ?? "";
  return /canli-ty-hakedis-cekim\.(ts|js)$/.test(giris.split("\\").join("/"));
})();

if (dogrudanKosuluyor) {
  const gunArg = process.argv.find((a) => a.startsWith("--gun="));
  const taramaGun = gunArg ? Number(gunArg.split("=")[1]) || TARAMA_GUN_VARSAYILAN : undefined;
  tyHakedisCekimKos({ yaz: process.argv.includes("--yaz"), taramaGun }).catch((e) => {
    console.error("HATA:", e instanceof Error ? e.stack : e);
    process.exit(1);
  });
}
