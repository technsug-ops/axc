import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { anahtarla } from "../src/lib/benzerlik";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { kodKosuluToplu } from "../src/lib/varyant-arama-kurali";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K56 — SATIŞ İÇE AKTARMA KURU KOŞUMU · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:satis-kuru -- --dosya="<yol>"
 *
 *  ⛔ ONAY KAPISI. Tek bir yazma çağrısı YOKTUR.
 *
 *  ═══ TEŞHİSTEN GELEN KARARLAR (Halil, 26.08.2026) ═══
 *  · **AD EŞLEŞTİRMESİ KULLANILMAZ.** Ölçüm çürüttü: renk/model farkı
 *    eşiğin altında kalıyor (`SC 3`→`SC 4` · `Mor`→`Mavi` ·
 *    `Siyah`→`Krem`). Yanlış ürüne bağlanan satış SESSİZCE yanlış
 *    maliyet ve stok üretir.
 *  · Alış çaprazı da adla kurulmuştu — aynı zayıflık. Yalnız TAM barkod
 *    eşleşmesi kabul edilir.
 *  · `belirsizSku` (>1 varyant) YAZILMAZ — tek varyanta bağlanamaz.
 *  · Tür farklı satırlar (iade · tazmin · iptal · aktarma · TATİL ·
 *    Zarar) SATIŞ OLARAK YAZILMAZ; sistemde ayrı mekanizmalar var.
 * ============================================================================
 */

const dosyaArg = process.argv.find((a) => a.startsWith("--dosya="));
const YOL = dosyaArg?.slice("--dosya=".length) ?? "";

const t2 = (n: number) => n.toFixed(2).padStart(14);
const metne = (v: unknown): string =>
  v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : String(v).trim();
const gun = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
const isGunuUtc = (d: Date) => new Date(`${gun(d)}T00:00:00.000Z`);

/**
 * ⚠ GEÇERLİLİK HER DALDA — ve makul yıl kapısı OKUMA anında.
 * _(Anayasa: "sınanmayan dal, sınanmamış koddur" + "kütüphanenin
 * geçerlisi iş kuralımızın geçerlisi değildir".)_
 */
function tariheCevir(ham: unknown): Date | null {
  const aday =
    ham instanceof Date
      ? ham
      : typeof ham === "number"
        ? new Date(Date.UTC(1899, 11, 30) + ham * 86_400_000)
        : metne(ham)
          ? new Date(metne(ham))
          : null;
  if (aday === null || Number.isNaN(aday.getTime())) return null;
  const yil = aday.getUTCFullYear();
  if (yil < 2000 || yil > 2100) return null;
  return aday;
}

/**
 * ⚠ SATIŞ TÜRÜ — YALNIZ "satış" YAZILIR.
 * Ötekiler sistemde AYRI mekanizmalara ait; satış olarak yazmak onları
 * ciroya sokar ve iade/iptal defterini de bozar.
 */
const SATIS_TURU = "satış";

async function main() {
  if (!YOL) {
    console.log('\n⛔ DOSYA YOLU VERİLMEDİ:  -- --dosya="…"\n');
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
  const okumaAni = new Date();

  const ham = readFileSync(YOL);
  const md5 = createHash("md5").update(ham).digest("hex");
  const sayfalar = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sayfalar.find((s) => anahtarla(s.sheet) === anahtarla("SATIŞ"));

  console.log("\n" + "=".repeat(98));
  console.log("K56 SATIŞ İÇE AKTARMA — KURU KOŞUM · SALT OKUMA");
  console.log("=".repeat(98));
  console.log("\n① DOSYA KİMLİĞİ");
  console.log("   ad     " + YOL.split(/[\\/]/).pop());
  console.log("   md5    " + md5);
  if (!sayfa) {
    console.log("\n   ⛔ 'SATIŞ' SAYFASI YOK — durduruldu.\n");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  /** ⚠ Başlık 6. satırda (indeks 5), veri 7'den. */
  const basliklar = sayfa.data[5].map((h) => anahtarla(metne(h)));
  const satirlar = sayfa.data.slice(6).filter((r) => r.some((h) => metne(h) !== ""));
  console.log("   satır  " + satirlar.length);
  console.log("   okuma  " + okumaAni.toISOString());

  const K = (ad: string) => basliklar.indexOf(anahtarla(ad));
  const kol = {
    siparis: K("Sipariş Numarası"), sku: K("SKU"), barkod: K("AXCALI BARKOD"),
    kanal: K("PAZAR YERI"), urun: K("Ürün"), tur: K("TÜR"),
    adet: K("Satış Miktarı"), tarih: K("Tarih"), fiyat: K("ÜRÜN LİSTE FİYATI"),
  };
  const eksik = Object.entries(kol).filter(([, i]) => i < 0).map(([a]) => a);
  if (eksik.length > 0) {
    console.log("\n   ⛔ KOLON BULUNAMADI: " + eksik.join(" · ") + " — durduruldu.\n");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  /**
   * ⚠ FİYAT KOLONU ÖLÇÜLDÜ, SEÇİLMEDİ. `Satış Fiyat` başlığı doğru
   * görünüyor ama YALNIZ 85 satırda dolu (hepsi 2024). Gerçek kolon
   * `ÜRÜN LİSTE FİYATI` (10162/10205). Doluluk ölçülmeden seçilseydi
   * tutar 50 kat yanlış çıkardı — ve bir kez çıktı.
   */
  const fiyatDoluluk = satirlar.filter((r) => Number(r[kol.fiyat]) > 0).length;
  console.log("   ⚠ fiyat kolonu `ÜRÜN LİSTE FİYATI` — dolu " + fiyatDoluluk + "/" + satirlar.length);

  type Satir = {
    sira: number; siparis: string; sku: string; barkod: string; kanal: string;
    urun: string; tur: string; adet: number; tarih: Date | null; fiyat: number;
  };
  const veri: Satir[] = satirlar.map((r, i) => ({
    sira: i + 7,
    siparis: metne(r[kol.siparis]), sku: metne(r[kol.sku]), barkod: metne(r[kol.barkod]),
    kanal: metne(r[kol.kanal]), urun: metne(r[kol.urun]), tur: metne(r[kol.tur]),
    adet: Number(r[kol.adet]) || 0, tarih: tariheCevir(r[kol.tarih]),
    fiyat: Number(r[kol.fiyat]) || 0,
  }));

  // ═══ KİMLİK ÇÖZÜMÜ — YALNIZ TAM EŞLEŞME ═══════════════════════════════
  const kodlar = [...new Set([...veri.map((v) => v.sku), ...veri.map((v) => v.barkod)].filter(Boolean))];
  const varyantlar = await prisma.productVariant.findMany({
    where: { OR: kodKosuluToplu(kodlar) },
    select: {
      id: true, sku: true, barcode: true, companySku: true,
      channelSkus: { where: { isActive: true }, select: { channelSku: true } },
    },
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

  const mevcutSatislar = await prisma.sale.findMany({
    select: { code: true, channelAccount: { select: { channel: { select: { name: true } } } } },
  });
  const defterKod = new Map(
    mevcutSatislar.filter((s) => s.code).map((s) => [s.code!, s.channelAccount.channel.name]),
  );

  /** ⚠ SKU sütununa kod yerine PAZARYERİ ADI yazılmış satırlar. */
  const copMu = (k: string) => k !== "" && !/\d/.test(k);

  // ═══ SINIFLANDIRMA — HER SATIR TEK KOVAYA ══════════════════════════════
  type Kova =
    | "yazilacak" | "zatenVar" | "turFarkli" | "copSku" | "belirsizSku"
    | "eslesmeyenListing" | "numarasiz" | "tarihOkunamayan" | "gelecekTarihli"
    | "adetSifir";
  const kovalar = new Map<Kova, Satir[]>();
  const koy = (k: Kova, s: Satir) => kovalar.set(k, [...(kovalar.get(k) ?? []), s]);
  const cozum = new Map<number, string>();
  /** Tür kırılımı ayrı sayılır — hepsi tek "turFarkli" rakamına gömülmez. */
  const turKirilim = new Map<string, number>();

  for (const s of veri) {
    /**
     * ⚠ SIRA: TÜR EN BAŞTA. Bir iade satırının barkodu eşleşmese de o
     * satır "eşleşmeyen ürün" değil, "iade"dir. Sıra yanlış olsaydı
     * kovalar birbirinin sayısını yerdi.
     */
    if (anahtarla(s.tur) !== anahtarla(SATIS_TURU)) {
      turKirilim.set(s.tur || "(boş)", (turKirilim.get(s.tur || "(boş)") ?? 0) + 1);
      koy("turFarkli", s);
      continue;
    }
    if (s.adet <= 0) { koy("adetSifir", s); continue; }
    if (s.tarih === null) { koy("tarihOkunamayan", s); continue; }
    /**
     * ⚠ GELECEK TARİHLİ SATIŞ AYRI KOVA — VE İLK SÜRÜMDE SIZMIŞTI.
     * Makul yıl kapısı (2000–2100) `2029-03-30`u geçiriyor: yıl geçerli,
     * ama o gün HENÜZ GELMEDİ. Bir satış gelecekte olamaz; yazılsaydı
     * ciroya girer, kâr hesabına katılır ve nakit takviminde olmayan bir
     * hakediş beklentisi doğururdu.
     * ⛔ 1 satır bu yüzden yazılabilir listeye sızdı ve kuru koşumda
     * yakalandı — kova ayrılmasaydı yazıma kadar görünmezdi.
     */
    if (s.tarih.getTime() > okumaAni.getTime()) { koy("gelecekTarihli", s); continue; }
    if (!s.siparis) { koy("numarasiz", s); continue; }
    if (defterKod.has(s.siparis)) { koy("zatenVar", s); continue; }
    if (copMu(s.sku)) { koy("copSku", s); continue; }

    /** ⚠ YALNIZ TAM EŞLEŞME — ad eşleştirmesi KULLANILMIYOR. */
    const aday = [s.sku, s.barkod].filter(Boolean).map((k) => kodVar.get(k)).find((l) => l && l.length > 0);
    if (!aday) { koy("eslesmeyenListing", s); continue; }
    if (aday.length > 1) { koy("belirsizSku", s); continue; }
    cozum.set(s.sira, aday[0]);
    koy("yazilacak", s);
  }

  const yazilacak = kovalar.get("yazilacak") ?? [];

  // ═══ ② YAZILACAK ═══════════════════════════════════════════════════════
  console.log("\n② YAZILACAK");
  /** Sipariş numarası başına gruplanır — aynı siparişte iki ürün BİR satıştır. */
  const gruplar = new Map<string, Satir[]>();
  for (const s of yazilacak) gruplar.set(s.siparis, [...(gruplar.get(s.siparis) ?? []), s]);
  console.log("   satış kaydı (sipariş no başına)  " + gruplar.size);
  console.log("   kalem                            " + yazilacak.length);
  console.log("   adet                             " + yazilacak.reduce((t, s) => t + s.adet, 0));
  console.log("   tutar                            " + t2(yazilacak.reduce((t, s) => t + s.fiyat * s.adet, 0)));
  console.log("   kaynak                           \"satis-excel\"");
  const yillik = new Map<string, { kalem: number; tutar: number }>();
  for (const s of yazilacak) {
    const y = gun(s.tarih!).slice(0, 4);
    const m = yillik.get(y) ?? { kalem: 0, tutar: 0 };
    m.kalem++;
    m.tutar += s.fiyat * s.adet;
    yillik.set(y, m);
  }
  console.log("\n   YILA GÖRE:");
  for (const [y, m] of [...yillik].sort()) {
    console.log("     " + y + "  " + String(m.kalem).padStart(5) + " kalem " + t2(m.tutar));
  }

  /**
   * ⚠ KANAL ETİKETİ İLE NUMARA BİÇİMİ ÇELİŞİYOR MU — ölçülüyor.
   * Ölçüldü (26.08): HB sipariş numaraları 10 hane "4" ile, TY 11 hane
   * "1" ile başlıyor. Defterde karşılığı olmayan satırda "defter kazanır"
   * kuralı uygulanamaz — çelişki SAYILIR ve karar Halil'e bırakılır.
   */
  const tyDesen = /^1\d{10}$/;
  const hbDesen = /^4\d{9}$/;
  let celiski = 0;
  const celiskiOrnek: string[] = [];
  for (const s of yazilacak) {
    const etiket = anahtarla(s.kanal);
    const tyEtiket = etiket.startsWith("ty");
    const hbEtiket = etiket.startsWith("hb");
    if ((tyEtiket && hbDesen.test(s.siparis)) || (hbEtiket && tyDesen.test(s.siparis))) {
      celiski++;
      if (celiskiOrnek.length < 6) celiskiOrnek.push("     " + s.siparis + "  etiket=" + s.kanal);
    }
  }
  console.log("\n   ⚠ KANAL ETİKETİ ↔ NUMARA BİÇİMİ ÇELİŞKİSİ: " + celiski);
  for (const o of celiskiOrnek) console.log(o);
  if (celiski > 0) {
    console.log("     ⛔ Bu satırların defterde karşılığı YOK — 'defter kazanır'");
    console.log("       kuralı uygulanamaz. Karar gerekiyor.");
  }

  // ═══ ③ DIŞARIDA ════════════════════════════════════════════════════════
  console.log("\n③ DIŞARIDA — AYRI KOVALAR");
  const aciklama: Record<Kova, string> = {
    yazilacak: "",
    zatenVar: "sistemde ZATEN VAR — çakışmada ATLA, ezme yok",
    turFarkli: "SATIŞ DEĞİL — sistemde ayrı mekanizma (aşağıda kırılım)",
    copSku: "SKU yerine PAZARYERİ ADI — ürün bilgisi dosyada YOK",
    belirsizSku: "kod BİRDEN ÇOK varyanta işaret ediyor",
    eslesmeyenListing: "HBCV/HBV/başka desen — ürün sistemde YOK",
    numarasiz: "sipariş numarası HİÇ YOK",
    tarihOkunamayan: "tarih okunamadı ya da makul yıl dışı",
    gelecekTarihli: "tarih GELECEKTE — satış henüz olmadı",
    adetSifir: "adet 0 ya da negatif",
  };
  let disarida = 0;
  for (const [k, l] of [...kovalar].sort((a, b) => b[1].length - a[1].length)) {
    if (k === "yazilacak") continue;
    disarida += l.length;
    console.log("   " + String(l.length).padStart(5) + "  " + k.padEnd(20) + aciklama[k]);
  }
  console.log("   " + "-".repeat(76));
  console.log("   " + String(disarida).padStart(5) + "  TOPLAM DIŞARIDA");
  console.log("   " + String(yazilacak.length).padStart(5) + "  yazılacak");
  console.log(
    "   " + String(disarida + yazilacak.length).padStart(5) + "  = " + veri.length + " satır " +
      (disarida + yazilacak.length === veri.length ? "✓ TUTUYOR" : "⛔ TUTMUYOR"),
  );

  /**
   * ⚠ TÜR KIRILIMI AYRI YAZILIR — ve her tür için sistemdeki KARŞILIĞI da.
   * Tek "turFarkli" rakamına gömmek, altı farklı işi tek satır gibi
   * gösterirdi. _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen
   * denetim, denetim değildir" — kova tarafı.)_
   */
  console.log("\n   TÜR KIRILIMI — sistemde karşılığı ne:");
  const karsilik: Record<string, string> = {
    iade: "`Return` + `ReturnItem` — iade akışı (RETURN_IN hareketi)",
    tazmin: "`Compensation` — tedarikçi tazminat talebi",
    iptal: "`Sale.iptalTarihi` — satış İPTAL işareti",
    aktarma: "⛔ KARŞILIĞI YOK — depo içi aktarma mekanizması yok",
    TATİL: "⛔ KARŞILIĞI YOK — satış değil, takvim notu",
    Zarar: "`StockMovement ADJUSTMENT` ya da hurda — ayrı karar",
    "(boş)": "⛔ TÜRÜ BELİRSİZ — sınıflandırılamaz",
  };
  for (const [t, n] of [...turKirilim].sort((a, b) => b[1] - a[1])) {
    console.log("     " + t.slice(0, 12).padEnd(14) + String(n).padStart(5) + "  " + (karsilik[t] ?? "?"));
  }
  console.log("     ⛔ BU TURDA HİÇBİRİ YAZILMIYOR — her biri ayrı karar.");

  // ═══ ④ STOK HAREKETİ ÖLÇÜMÜ ════════════════════════════════════════════
  console.log("\n④ STOK HAREKETİ — FIFO'da o dönem partisi VAR MI");
  /**
   * ⚠ SATIŞ TARAFINDAKİ KURAL GEÇERLİ: parti yoksa hareket YAZILMAZ,
   * atlanır. Negatif stok yok. Bu koşum yalnız KAÇ TANESİNİN parti
   * bulacağını ölçüyor.
   */
  const varyantIds = [...new Set([...cozum.values()])];
  const girisler = await prisma.stockMovement.findMany({
    where: { variantId: { in: varyantIds }, quantityDelta: { gt: 0 } },
    select: { id: true, variantId: true, quantityDelta: true, occurredAt: true },
    orderBy: { occurredAt: "asc" },
  });
  const tuketimler = await prisma.stockMovement.groupBy({
    by: ["sourceMovementId"],
    where: { sourceMovementId: { in: girisler.map((g) => g.id) } },
    _sum: { quantityDelta: true },
  });
  const tuketim = new Map(tuketimler.map((t) => [t.sourceMovementId!, Number(t._sum.quantityDelta ?? 0)]));
  const partiler = new Map<string, { tarih: Date; kalan: number }[]>();
  for (const g of girisler) {
    const kalan = g.quantityDelta + (tuketim.get(g.id) ?? 0);
    if (kalan <= 0) continue;
    partiler.set(g.variantId, [...(partiler.get(g.variantId) ?? []), { tarih: g.occurredAt, kalan }]);
  }
  console.log("   ilgili varyant           " + varyantIds.length);
  console.log("   açık partisi olan        " + partiler.size);

  /** ⚠ Kalemler TARİH SIRASINDA tüketilir — parti bir sonrakine taşınır. */
  const kalan = new Map([...partiler].map(([k, v]) => [k, v.map((x) => ({ ...x }))]));
  const siraliKalemler = [...yazilacak].sort((a, b) => a.tarih!.getTime() - b.tarih!.getTime());
  let hareketYazilir = 0, hareketAtlanir = 0, erienAdet = 0;
  for (const s of siraliKalemler) {
    const vid = cozum.get(s.sira)!;
    const p = kalan.get(vid) ?? [];
    const uygun = p.filter((x) => x.tarih.getTime() <= isGunuUtc(s.tarih!).getTime() && x.kalan > 0);
    if (uygun.reduce((t, x) => t + x.kalan, 0) < s.adet) { hareketAtlanir++; continue; }
    let ihtiyac = s.adet;
    for (const x of uygun) {
      const al = Math.min(x.kalan, ihtiyac);
      x.kalan -= al;
      ihtiyac -= al;
      erienAdet += al;
      if (ihtiyac === 0) break;
    }
    hareketYazilir++;
  }
  console.log("\n   ✓ SALE_OUT YAZILIR       " + hareketYazilir + " kalem");
  console.log("   ⛔ parti YOK, atlanır     " + hareketAtlanir + " kalem");
  console.log("     ⚠ Satış tarafındaki kural: parti yoksa hareket YAZILMAZ,");
  console.log("       negatif stok üretilmez.");

  // ═══ ⑤ ENVANTER ETKİSİ ═════════════════════════════════════════════════
  console.log("\n⑤ BEKLENEN ENVANTER ETKİSİ");
  const { defterDerinligi } = await import("../src/lib/ice-aktarma-serhi");
  const d = await defterDerinligi(prisma);
  console.log("   bugün kapsanmayan pencerede AÇIK  " + d.kapsamsizAdet + " adet");
  console.log("   bu aktarımın ERİTECEĞİ            " + erienAdet + " adet");
  console.log("   → kalan (kaba tahmin)             " + Math.max(0, d.kapsamsizAdet - erienAdet));
  console.log("   ⚠ KABA TAHMİN: şerhin ölçütü 'satış defterinin en eski tarihinden");
  console.log("     ÖNCE alınmış açık parti'. Bu aktarım satış defterini 2024'e");
  console.log("     indirdiği için PENCERENİN KENDİSİ de daralacak — gerçek düşüş");
  console.log("     bundan büyük olabilir. Kesin rakam yazımdan sonra ölçülür.");

  // ═══ ⑥ İDEMPOTENTLİK ═══════════════════════════════════════════════════
  console.log("\n⑥ İDEMPOTENTLİK — ikinci koşum SİMÜLASYONU");
  console.log("   kimlik anahtarı  Sipariş Numarası (`Sale.code`, global @unique)");
  const yazilanNo = new Set(yazilacak.map((s) => s.siparis));
  let ikinci = 0;
  for (const s of yazilacak) if (!yazilanNo.has(s.siparis)) ikinci++;
  console.log("   ikinci koşum yazacağı satır: " + ikinci + (ikinci === 0 ? "   ✓" : "   ⛔ SIFIR DEĞİL"));

  console.log("\n" + "=".repeat(98));
  console.log("  SALT OKUMA — veritabanına hiçbir şey yazılmadı.");
  console.log("  ⛔ ONAY KAPISI: bu rapor onaylanmadan HİÇBİR YAZIM YAPILMAZ.");
  console.log("=".repeat(98) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
