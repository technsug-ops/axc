/**
 * ============================================================================
 *  K221 — HEPSİBURADA HAKEDİŞİ API'DEN OTOMATİK ÇEKİM (19.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run canli:hb-hakedis-cekim              → KURU KOŞUM (yazmaz)
 *      npm run canli:hb-hakedis-cekim -- --yaz     → yazar
 *      npm run canli:hb-hakedis-cekim -- --gun=90  → geriye tarama genişliği
 *
 *  ⛔ ELLE EXCEL YÜKLEME YERİNE GEÇER, ONU SİLMEZ. `rowKey` (externalId|
 *  siparişNo|hamTip) dedup'ı iki kaynak için de AYNI — externalId kuralı
 *  (`isInvoice ? invoiceNumber : packageNumber`) ve hamTip Türkçe karşılığı
 *  ÇAPRAZ ÖLÇÜLDÜ (bkz. `src/lib/hakedis/hb-api-oku.ts`). Yani bu betik
 *  daha önce Excel'den yüklenmiş bir satırı YENİDEN yazmaz.
 *
 *  ⭐ TY'DEN FARKI — HB'NİN KENDİSİ "ÖDENDİ Mİ" DİYOR: `status: Paid|
 *  WillBePaid` alanı doğrudan geliyor, TY'deki gibi dolaylı bir "ödeme
 *  emri" çıkarımı GEREKMİYOR. Bu yüzden burada TY'nin ③ üncü işi
 *  (paymentOrderId geri doldurma) YOK — yalnız YENİ SATIR ve tutarsızlık
 *  raporu var.
 *
 *  ⛔ ÜSTTEKİ GEREKÇE EKSİKTİ, SİLİNMEDİ (K232-②, 22.09.2026). "Yalnız yeni
 *  satır" demek, `WillBePaid` görülüp yazılan satırın `Paid`e GEÇİŞİNİ hiç
 *  yazmamak demekti: HB paneli "22 Eylül · 84.680,85 · Ödendi" derken
 *  defterde aynı 138 satır sonsuza kadar "Gelecek"te kalacak, geçmiş
 *  ödemeler bir daha BÜYÜMEYECEKTİ (eldekiler 19.09'daki ilk taramada zaten
 *  Paid görüldüğü için doğruydu — hata ilk günlerde görünmezdi). TY'nin
 *  ① işi (K220-①) burada da zorunlu: `paidAt` YALNIZ BOŞSA dolar, doluysa
 *  dokunulmaz; tutarı farklı (tutarsız) satır tazelenmez, raporlanır.
 *
 *  ⚠ PENCERE: `RecordDateStart/End` aralığı azami 1 AY (ölçüldü, uç kendi
 *  mesajıyla söylüyor) — 29 günlük dilimlere bölünerek taranır.
 *  ⚠ TARİH BİÇİMİ ISO (`YYYY-MM-DD`) — TY'nin epoch ms'inden FARKLI,
 *  ayrıca ölçüldü.
 * ============================================================================
 */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { apiGet, baslikKur, kimlikOku, UCLAR } from "./hb/istemci";
import { hbHesabiCoz, hbHesapHatasi } from "../src/lib/kanal-hesabi-hb";
import { satirlariEslestir } from "../src/lib/hakedis/eslestir";
import { satirAnahtari } from "../src/lib/hakedis/okuyucu";
import { izYaz } from "../src/lib/iz";
import { hbApiSatirlariniOku, type HbFinansKaydi } from "../src/lib/hakedis/hb-api-oku";

const GUN_MS = 86_400_000;
const PENCERE_GUN = 29;
const TARAMA_GUN_VARSAYILAN = 45;
const SAYFA_BOYUTU = 100;

function para(x: number): string {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function gunStr(x: number | Date): string {
  return new Date(x).toISOString().slice(0, 10);
}

export type HbHakedisCekimOzeti = {
  kip: "ONIZLEME" | "YAZIM";
  cekilenHam: number;
  digerSayisi: number;
  eslesen: number;
  eslesmeyen: number;
  siparisDisi: number;
  yeni: number;
  /** K232-②: ödenmemişken yazılıp sonra Paid olan satır — `paidAt` boştan doldu. */
  tazelenen: number;
  tutarsiz: number;
  netToplam: number;
  hataSayisi: number;
};

export async function hbHakedisCekimKos(ayar: {
  yaz: boolean;
  dbAdresi?: string;
  taramaGun?: number;
}): Promise<HbHakedisCekimOzeti | { atlandi: "KIMLIK" | "VERITABANI" | "HESAP" }> {
  const YAZ = ayar.yaz;
  const TARAMA_GUN = ayar.taramaGun ?? TARAMA_GUN_VARSAYILAN;

  const kimlik = kimlikOku();
  if (!kimlik) {
    console.log("\n⛔ HB KİMLİĞİ OKUNAMADI (.env.canli / süreç ortamı).");
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
  console.log("HB HAKEDİŞ — API ÇEKİM " + (YAZ ? "⚠ YAZIM" : "(KURU KOŞUM, yazmaz)"));
  console.log("=".repeat(100));

  const cozum = await hbHesabiCoz(prisma, kimlik.merchantId);
  if (cozum.tur === "YOK") {
    console.log("\n⛔ " + hbHesapHatasi(cozum) + "\n");
    await prisma.$disconnect();
    return { atlandi: "HESAP" };
  }
  console.log(`Kanal hesabı: Hepsiburada — ${cozum.ad}\n`);
  const hesapId = cozum.id;

  // ── ① TÜM PENCERELERİ ÇEK (SAYFALI) ─────────────────────────────────────
  const simdi = Date.now();
  const enEski = simdi - TARAMA_GUN * GUN_MS;
  const tumKayitlar: HbFinansKaydi[] = [];
  const hatalar: string[] = [];

  const pencereSayisi = Math.ceil(TARAMA_GUN / PENCERE_GUN);
  for (let p = 0; p < pencereSayisi; p++) {
    const son = simdi - p * PENCERE_GUN * GUN_MS;
    const bas = Math.max(son - PENCERE_GUN * GUN_MS, enEski);
    const basStr = gunStr(bas);
    const sonStr = gunStr(son);

    let offset = 0;
    for (let tur = 0; tur < 100; tur++) {
      const yol = UCLAR.hakedis(kimlik, offset, SAYFA_BOYUTU, {
        recordDateStart: basStr,
        recordDateEnd: sonStr,
      });
      const s = await apiGet(yol, baslik, 30_000);
      if (s.tur !== "VERI") {
        hatalar.push(`${basStr}→${sonStr} offset=${offset}: ${JSON.stringify(s).slice(0, 150)}`);
        break;
      }
      const g = s.govde as { count: number; items: HbFinansKaydi[] };
      tumKayitlar.push(...g.items);
      offset += g.items.length;
      if (g.items.length === 0 || offset >= g.count) break;
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // ── ①b VADESİ GEÇMİŞ ÖDENMEMİŞLER — VADE PENCERESİYLE YENİDEN SORULUR ──
  /**
   * K232-② (22.09.2026). Kayıt-tarihi penceresi (45 gün) ödendi geçişini
   * görmeye YETMEZ: HB siparişten ~35-40 gün sonra öder, yani satır Paid'e
   * döndüğünde çoğu zaman pencerenin KIYISINDADIR — ölçüldü: 22.09 vadeli
   * 104 satırın kayıt yaşı 29-45 gün. HB bir hafta geç işaretlese ya da
   * cron bir gün kaçırsa satır pencereden çıkar ve geçiş BİR DAHA GÖRÜLMEZ;
   * satır sonsuza kadar "Gelecek"te kalır.
   *
   * Ölçüt YENİDEN HESAPLANABİLİR (saklanan liste değil): defterde `paidAt`
   * boş ve vadesi bugün ya da önce olan satırların VADE aralığı, uca
   * `dueDateStart/End` ile sorulur — uç bu süzgeci destekliyor
   * (`UCLAR.hakedis`). Aynı kayıt iki pencereden de gelebilir; `benzersiz`
   * (id) haritası zaten tekilleştiriyor.
   *
   * ⚠ Vade penceresi de kayıt penceresi gibi 29 günlük dilimlerle sorulur —
   * "azami 1 ay" sınırının vade süzgecinde de geçerli olup olmadığı
   * ölçülmedi; dilimlemek iki hâlde de doğru çalışır.
   */
  const vadesiGecmis = await prisma.settlementItem.aggregate({
    where: { channelAccountId: hesapId, paidAt: null, dueDate: { lte: new Date(simdi) } },
    _min: { dueDate: true },
    _max: { dueDate: true },
    _count: { _all: true },
  });
  if (vadesiGecmis._count._all > 0 && vadesiGecmis._min.dueDate && vadesiGecmis._max.dueDate) {
    const vBas = vadesiGecmis._min.dueDate.getTime();
    const vSon = vadesiGecmis._max.dueDate.getTime();
    let vadeKaydi = 0;
    for (let bas = vBas; bas <= vSon; bas += PENCERE_GUN * GUN_MS) {
      const son = Math.min(bas + PENCERE_GUN * GUN_MS, vSon);
      let offset = 0;
      for (let tur = 0; tur < 100; tur++) {
        const yol = UCLAR.hakedis(kimlik, offset, SAYFA_BOYUTU, {
          dueDateStart: gunStr(bas),
          dueDateEnd: gunStr(son),
        });
        const s = await apiGet(yol, baslik, 30_000);
        if (s.tur !== "VERI") {
          hatalar.push(`vade ${gunStr(bas)}→${gunStr(son)} offset=${offset}: ${JSON.stringify(s).slice(0, 150)}`);
          break;
        }
        const g = s.govde as { count: number; items: HbFinansKaydi[] };
        tumKayitlar.push(...g.items);
        vadeKaydi += g.items.length;
        offset += g.items.length;
        if (g.items.length === 0 || offset >= g.count) break;
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    console.log(
      `①b vadesi geçmiş ödenmemiş ${vadesiGecmis._count._all} satır → vade penceresi ${gunStr(vBas)}→${gunStr(vSon)} soruldu, ${vadeKaydi} kayıt geldi`,
    );
  }

  if (hatalar.length > 0) {
    console.log(`⚠ ${hatalar.length} çağrı başarısız (ULAŞILAMADI ≠ "veri yok"):`);
    for (const h of hatalar.slice(0, 10)) console.log("   " + h);
  }

  const benzersiz = new Map<string, HbFinansKaydi>();
  for (const k of tumKayitlar) benzersiz.set(k.id, k);
  console.log(`\nÇekilen ham kayıt: ${tumKayitlar.length} · tekil: ${benzersiz.size}`);

  const tumSatirlar = hbApiSatirlariniOku([...benzersiz.values()]);
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
    where: { code: { in: siparisNolar }, iptalTarihi: null, channelAccountId: hesapId },
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
  const hamHepsi = [
    ...eslesme.eslesenler.map((e) => ({ satir: e.satir, saleId: e.saleId as string | null })),
    ...eslesme.eslesmeyenler.map((s) => ({ satir: s, saleId: null as string | null })),
    ...eslesme.siparisDisi.map((s) => ({ satir: s, saleId: null as string | null })),
  ];

  console.log(
    `Eşleşen: ${eslesme.eslesenler.length} · eşleşmeyen: ${eslesme.eslesmeyenler.length} · sipariş dışı: ${eslesme.siparisDisi.length}`,
  );

  /**
   * ⛔ ÇOK KALEMLİ SİPARİŞ/FATURA ÇAKIŞMASI — CANLI ÖLÇÜLDÜ (19.09.2026).
   * `rowKey` (externalId|siparişNo|hamTip) HB'de İKİ FARKLI ÜRÜNÜN aynı
   * pakette/faturada olduğu durumda ÇAKIŞIYOR (200 günde 3247 satırın
   * 6'sı — %0,18). Excel yolu da AYNI anahtarı kullanıyor; bu, o yolun
   * da bu nadir durumda satırlardan birini SESSİZCE DÜŞÜRDÜĞÜ anlamına
   * gelir (ölçüldü: sipariş 4586626981'de DB'de tek "Kargo Bedeli" satırı
   * vardı, API iki farklı üründen İKİ ayrı tutar veriyordu). Burada
   * TOPLANARAK yazılır — hem DB'nin `@@unique` kısıtına uyar hem de
   * (Excel'in aksine) parayı KAYBETMEZ, yalnız ürün bazlı ayrımı kaybeder.
   */
  const gruplanmis = new Map<string, (typeof hamHepsi)[number]>();
  let cakisanGrupSayisi = 0;
  for (const h of hamHepsi) {
    const anahtar = satirAnahtari(h.satir);
    const mevcut = gruplanmis.get(anahtar);
    if (!mevcut) {
      gruplanmis.set(anahtar, h);
      continue;
    }
    cakisanGrupSayisi++;
    mevcut.satir.tutar += h.satir.tutar;
  }
  if (cakisanGrupSayisi > 0) {
    console.log(`⚠ ${cakisanGrupSayisi} satır, çok kalemli sipariş/fatura çakışması yüzünden TOPLANARAK yazıldı.`);
  }
  const hepsi = [...gruplanmis.values()];

  // ── ③ DB'DEKİ MEVCUT DURUMLA KARŞILAŞTIR ────────────────────────────────
  const anahtarlar = hepsi.map((h) => satirAnahtari(h.satir));
  const parcaBoyutu = 1000;
  const mevcutlar: { id: string; rowKey: string; paidAt: Date | null; amount: unknown }[] = [];
  for (let i = 0; i < anahtarlar.length; i += parcaBoyutu) {
    mevcutlar.push(
      ...(await prisma.settlementItem.findMany({
        where: { channelAccountId: hesapId, rowKey: { in: anahtarlar.slice(i, i + parcaBoyutu) } },
        select: { id: true, rowKey: true, paidAt: true, amount: true },
      })),
    );
  }
  const mevcutHarita = new Map(mevcutlar.map((m) => [m.rowKey, m]));

  const yeniler: typeof hepsi = [];
  const tazelenecekler: { itemId: string; yeniPaidAt: Date; siparisNo: string | null; tutar: number }[] = [];
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
     * K232-② — ÖDENDİ GEÇİŞİ: `paidAt` YALNIZ BOŞSA dolar (K220-①'in HB
     * karşılığı). Dolu bir `paidAt`in üstüne yazılmaz — "gerçekleşen değerin
     * üzerine asla yazılmaz". `odemeTarihi` yalnız `status === "Paid"` iken
     * dolu gelir (bkz. `hbApiSatiriniOku`), yani koşul kanalın kendi beyanı.
     */
    const paidAtDolduracak = var_.paidAt === null && h.satir.odemeTarihi !== null;
    if (paidAtDolduracak) {
      tazelenecekler.push({
        itemId: var_.id,
        yeniPaidAt: h.satir.odemeTarihi!,
        siparisNo: h.satir.siparisNo,
        tutar: h.satir.tutar,
      });
    }
  }

  // ── ④ ÖZET ───────────────────────────────────────────────────────────────
  const yeniToplam = yeniler.reduce((t, y) => t + y.satir.tutar, 0);
  console.log("\n" + "-".repeat(100));
  console.log(`YENİ satır (DB'de hiç yok)         : ${yeniler.length}`);
  console.log(`TAZELENECEK (ödendi geçişi — paidAt boştan dolar) : ${tazelenecekler.length}`);
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

  const ozet: HbHakedisCekimOzeti = {
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
          channelAccountId: hesapId,
          sourceFile: `HB API — ${gunStr(enEski)}→${gunStr(simdi)}`,
          amount: String(yeniToplam),
          currency: paraBirimi,
        },
        select: { id: true },
      });
      await tx.settlementItem.createMany({
        data: yeniler.map(({ satir, saleId }) => ({
          settlementId: parti.id,
          channelAccountId: hesapId,
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
          rawRow: satir.ham,
        })),
      });
      await izYaz(
        {
          action: "HB_HAKEDIS_API_YENI_PARTI",
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

  /**
   * K232-② — ÖDENDİ GEÇİŞİ: satır satır, tekrar koşulabilir (ikinci koşumda
   * `paidAt` dolu olduğu için satır kümeye hiç girmez). Her satır kendi
   * izini taşır — toplu bir "N satır güncellendi" izi, altı ay sonra "bu
   * satırın ödeme tarihi nereden geldi" sorusuna cevap veremezdi.
   */
  for (const t of tazelenecekler) {
    await prisma.$transaction(async (tx) => {
      await tx.settlementItem.update({
        where: { id: t.itemId },
        data: { paidAt: t.yeniPaidAt },
      });
      await izYaz(
        {
          action: "HB_HAKEDIS_ODENDI_TAZELE",
          targetType: "SettlementItem",
          targetId: t.itemId,
          userId: null,
          detail: JSON.stringify({
            eskiPaidAt: null,
            yeniPaidAt: t.yeniPaidAt,
            siparisNo: t.siparisNo,
            tutar: t.tutar,
          }),
        },
        tx,
      );
    });
  }
  if (tazelenecekler.length > 0) {
    console.log(`✓ ${tazelenecekler.length} satır ödendi olarak işaretlendi (paidAt boştan doldu).`);
  }

  /** ⭐ KALP ATIŞI — DEĞİŞİKLİK OLMASA BİLE YAZILIR (K220'deki AYNI ders). */
  await izYaz(
    {
      action: "HB_HAKEDIS_CEKIM_CALISTI",
      targetType: "ChannelAccount",
      targetId: hesapId,
      userId: null,
      detail: JSON.stringify(ozet),
    },
    prisma,
  );

  await prisma.$disconnect();
  return ozet;
}

/** ═══ İÇERİ ALINDIĞINDA KOŞMAZ ═══ (aynı desen: `canli-ty-ice-aktar.ts`) */
const dogrudanKosuluyor = (() => {
  const giris = process.argv[1] ?? "";
  return /canli-hb-hakedis-cekim\.(ts|js)$/.test(giris.split("\\").join("/"));
})();

if (dogrudanKosuluyor) {
  const gunArg = process.argv.find((a) => a.startsWith("--gun="));
  const taramaGun = gunArg ? Number(gunArg.split("=")[1]) || TARAMA_GUN_VARSAYILAN : undefined;
  hbHakedisCekimKos({ yaz: process.argv.includes("--yaz"), taramaGun }).catch((e) => {
    console.error("HATA:", e instanceof Error ? e.stack : e);
    process.exit(1);
  });
}
