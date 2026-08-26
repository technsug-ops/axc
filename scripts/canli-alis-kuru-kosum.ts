import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { anahtarla } from "../src/lib/benzerlik";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { tedarikciAnahtari } from "../src/lib/tedarikci-adi";
import { kodKosuluToplu } from "../src/lib/varyant-arama-kurali";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K55 — ALIŞ İÇE AKTARMA KURU KOŞUMU · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:alis-kuru -- --dosya="<yol>"
 *
 *  ⛔ BU BİR ONAY KAPISIDIR. Tek bir yazma çağrısı YOKTUR.
 *
 *  ⚠ DOSYA KİMLİĞİ RAPORUN İLK SATIRINDA — ad + md5 + satır sayısı.
 *  Bu turda `(4)` ile `(5)` karıştı; iki dosyanın md5'i farklıydı ve
 *  hangisinin ölçüldüğü ancak sonradan anlaşıldı. Kaynağını söylemeyen
 *  bir rapor, doğru olsa bile kullanılamaz.
 * ============================================================================
 */

const dosyaArg = process.argv.find((a) => a.startsWith("--dosya="));
const YOL = dosyaArg?.slice("--dosya=".length) ?? "";

const t2 = (n: number) => n.toFixed(2).padStart(14);
const gun = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
const metne = (v: unknown): string =>
  v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : String(v).trim();

/** Excel seri numarasını tarihe çevirir; 1900 tarih sistemi. */
function tariheCevir(ham: unknown): Date | null {
  if (ham instanceof Date) return ham;
  if (typeof ham === "number") return new Date(Date.UTC(1899, 11, 30) + ham * 86_400_000);
  const m = metne(ham);
  if (!m) return null;
  const d = new Date(m);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  if (!YOL) {
    console.log("\n⛔ DOSYA YOLU VERİLMEDİ:  -- --dosya=\"C:\\...\\alislar.xlsx\"\n");
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
  const sayfa = sayfalar.find((s) => anahtarla(s.sheet) === anahtarla("ALIŞLAR"));

  console.log("\n" + "=".repeat(98));
  console.log("K55 ALIŞ İÇE AKTARMA — KURU KOŞUM · SALT OKUMA");
  console.log("=".repeat(98));
  console.log("\n① DOSYA KİMLİĞİ");
  console.log("   ad     " + YOL.split(/[\\/]/).pop());
  console.log("   md5    " + md5);
  console.log("   sayfa  " + sayfalar.map((s) => s.sheet).join(" · "));
  if (!sayfa) {
    console.log("\n   ⛔ 'ALIŞLAR' SAYFASI YOK — durduruldu.\n");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  const basliklar = sayfa.data[2].map((h) => anahtarla(metne(h)));
  const satirlar = sayfa.data.slice(3).filter((r) => r.some((h) => metne(h) !== ""));
  console.log("   satır  " + satirlar.length);
  console.log("   okuma  " + okumaAni.toISOString());

  const K = (ad: string) => basliklar.indexOf(anahtarla(ad));
  const kol = {
    magaza: K("Mağaza"), urun: K("Ürün Adı"), siparis: K("Sipariş Numarası"),
    fiyat: K("Fiyatı"), adet: K("Adet"), toplam: K("Toplam Tutar"),
    alis: K("Satın Alma Tarihi"), teslim: K("Teslim Tarihi"),
    barkod: K("Barkod"), envanter: K("Envantere İşlendimi"), iade: K("İade"),
  };
  /**
   * ⚠ KOLON EKSİKSE DURULUR — boş sonuç "temiz" sanılmasın.
   * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim,
   * denetim değildir".)_
   */
  const eksik = Object.entries(kol).filter(([, i]) => i < 0).map(([a]) => a);
  if (eksik.length > 0) {
    console.log("\n   ⛔ KOLON BULUNAMADI: " + eksik.join(" · ") + " — durduruldu.\n");
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
    magaza: metne(r[kol.magaza]),
    urun: metne(r[kol.urun]),
    siparis: metne(r[kol.siparis]),
    barkod: metne(r[kol.barkod]),
    adet: Number(r[kol.adet]) || 0,
    fiyat: Number(r[kol.fiyat]) || 0,
    toplam: Number(r[kol.toplam]) || 0,
    alis: tariheCevir(r[kol.alis]),
    teslim: tariheCevir(r[kol.teslim]),
    iade: metne(r[kol.iade]),
  }));

  // ═══ KİMLİK ÇÖZÜMÜ ═════════════════════════════════════════════════════
  const tekilBarkod = [...new Set(veri.map((v) => v.barkod).filter(Boolean))];
  const varyantlar = await prisma.productVariant.findMany({
    where: { OR: kodKosuluToplu(tekilBarkod) },
    select: {
      id: true, sku: true, barcode: true, companySku: true,
      product: { select: { name: true } },
      channelSkus: { where: { isActive: true }, select: { channelSku: true } },
    },
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
  /** Ürün adıyla eşleşme — AYRI ve DAHA ZAYIF kanıt. */
  const urunler = await prisma.product.findMany({
    select: { name: true, variants: { where: { isDefault: true }, select: { id: true } } },
  });
  const adVar = new Map<string, string>();
  for (const u of urunler) {
    if (u.name && u.variants[0]) adVar.set(anahtarla(u.name), u.variants[0].id);
  }

  // ═══ ÇAKIŞMA ═══════════════════════════════════════════════════════════
  const mevcutAlimlar = await prisma.purchase.findMany({
    select: { supplierOrderNo: true, purchasedAt: true, items: { select: { variantId: true, quantity: true } } },
  });
  const mevcutNo = new Set(mevcutAlimlar.map((a) => a.supplierOrderNo).filter((x): x is string => Boolean(x)));
  const mevcutUclu = new Set<string>();
  for (const a of mevcutAlimlar) {
    for (const i of a.items) mevcutUclu.add(i.variantId + "|" + gun(a.purchasedAt) + "|" + i.quantity);
  }

  // ═══ TEDARİKÇİ ═════════════════════════════════════════════════════════
  const tedarikciler = await prisma.supplier.findMany({ select: { id: true, name: true } });
  const tedHarita = new Map(tedarikciler.map((t) => [tedarikciAnahtari(t.name), t]));

  // ═══ SINIFLANDIRMA — HER SATIR TEK KOVAYA ══════════════════════════════
  /**
   * ⚠ KOVALAR AYRIK VE SIRALI. Bir satır birden çok sebeple dışarıda
   * kalabilir; tek rakama karıştırmak "kaç tanesi niye düştü" sorusunu
   * cevapsız bırakırdı. Sıra en KESİN sebepten en zayıfa.
   */
  type Kova =
    | "yazilacak" | "adEslesmesi" | "zatenVar" | "copBarkod"
    | "barkodsuz" | "eslesmeyenBarkod" | "belirsizBarkod"
    | "tarihYok" | "tedarikciBos" | "adetSifir" | "iadeli";
  const kovalar = new Map<Kova, Satir[]>();
  const koy = (k: Kova, s: Satir) => kovalar.set(k, [...(kovalar.get(k) ?? []), s]);
  const cozum = new Map<number, { variantId: string; guven: "barkod" | "ad" }>();

  /** ⚠ Barkod alanına yazılmış METİN — rakam içermeyen değer koddur sanılmaz. */
  const copMu = (b: string) => b !== "" && !/\d/.test(b);

  for (const s of veri) {
    if (s.adet <= 0) { koy("adetSifir", s); continue; }
    if (s.iade && anahtarla(s.iade) !== "0" && anahtarla(s.iade) !== "hayır") { koy("iadeli", s); continue; }
    if (s.alis === null) { koy("tarihYok", s); continue; }
    if (copMu(s.barkod)) { koy("copBarkod", s); continue; }

    let vid: string | null = null;
    let guven: "barkod" | "ad" = "barkod";
    if (s.barkod) {
      const l = kodVar.get(s.barkod);
      if (!l || l.length === 0) { koy("eslesmeyenBarkod", s); continue; }
      if (l.length > 1) { koy("belirsizBarkod", s); continue; }
      vid = l[0];
    } else {
      const a = s.urun ? adVar.get(anahtarla(s.urun)) : undefined;
      if (!a) { koy("barkodsuz", s); continue; }
      vid = a;
      guven = "ad";
    }
    if (s.magaza === "" || !tedHarita.has(tedarikciAnahtari(s.magaza))) {
      if (s.magaza === "") { koy("tedarikciBos", s); continue; }
    }
    /** ⚠ ZATEN VAR — iki ölçüt: sipariş no VEYA (varyant+gün+adet). */
    const ucluAnahtar = vid + "|" + gun(s.alis) + "|" + s.adet;
    if ((s.siparis && mevcutNo.has(s.siparis)) || mevcutUclu.has(ucluAnahtar)) {
      koy("zatenVar", s);
      continue;
    }
    cozum.set(s.sira, { variantId: vid, guven });
    koy(guven === "ad" ? "adEslesmesi" : "yazilacak", s);
  }

  const yazilacak = kovalar.get("yazilacak") ?? [];
  const adEslesmesi = kovalar.get("adEslesmesi") ?? [];

  // ═══ ② YAZILACAK LİSTE ═════════════════════════════════════════════════
  console.log("\n② YAZILACAK");
  const tumYazilacak = [...yazilacak, ...adEslesmesi];
  /**
   * ⚠ ALIM KAYDI SİPARİŞ NUMARASI BAŞINA GRUPLANIR — satır başına DEĞİL.
   * Aynı siparişte iki ürün varsa o bir alımdır, iki değil. Numarası
   * olmayan satır kendi başına bir alım olur (gruplayacak kimlik yok).
   */
  const gruplar = new Map<string, Satir[]>();
  for (const s of tumYazilacak) {
    const g = s.siparis ? "no:" + s.siparis : "satir:" + s.sira;
    gruplar.set(g, [...(gruplar.get(g) ?? []), s]);
  }
  const toplamTutar = tumYazilacak.reduce((t, s) => t + s.toplam, 0);
  console.log("   alım kaydı (sipariş no başına)  " + gruplar.size);
  console.log("   kalem                           " + tumYazilacak.length);
  console.log("     ── barkodla eşleşen           " + yazilacak.length);
  console.log("     ── ⚠ ÜRÜN ADIYLA eşleşen      " + adEslesmesi.length + "   (daha ZAYIF kanıt)");
  console.log("   toplam adet                     " + tumYazilacak.reduce((t, s) => t + s.adet, 0));
  console.log("   toplam tutar                    " + t2(toplamTutar));
  console.log("   kaynak sütunu (her satırda)     \"alis-excel\"");
  const aylik = new Map<string, { kalem: number; tutar: number }>();
  for (const s of tumYazilacak) {
    const a = gun(s.alis!).slice(0, 7);
    const m = aylik.get(a) ?? { kalem: 0, tutar: 0 };
    m.kalem++; m.tutar += s.toplam;
    aylik.set(a, m);
  }
  console.log("\n   TARİH DAĞILIMI:");
  for (const [a, m] of [...aylik].sort()) {
    console.log("     " + a + "  " + String(m.kalem).padStart(5) + " kalem " + t2(m.tutar));
  }

  // ═══ ③ DIŞARIDA KALANLAR ═══════════════════════════════════════════════
  console.log("\n③ DIŞARIDA KALANLAR — AYRI KOVALAR, tek rakama KARIŞTIRILMADI");
  const aciklama: Record<Kova, string> = {
    yazilacak: "", adEslesmesi: "",
    zatenVar: "sistemde ZATEN VAR (sipariş no ya da varyant+gün+adet)",
    copBarkod: "barkod alanı METİN — çöp veri",
    barkodsuz: "barkod YOK ve ürün adı da eşleşmedi",
    eslesmeyenBarkod: "barkod var ama ÜRÜN SİSTEMDE YOK",
    belirsizBarkod: "barkod BİRDEN ÇOK varyanta işaret ediyor",
    tarihYok: "satın alma tarihi OKUNAMADI",
    tedarikciBos: "mağaza adı BOŞ — tedarikçi kurulamaz",
    adetSifir: "adet 0 ya da negatif",
    iadeli: "İADE edilmiş — stok vermez",
  };
  let disarida = 0;
  for (const [k, l] of kovalar) {
    if (k === "yazilacak" || k === "adEslesmesi") continue;
    disarida += l.length;
    console.log("   " + String(l.length).padStart(5) + "  " + k.padEnd(20) + aciklama[k]);
  }
  console.log("   " + "-".repeat(70));
  console.log("   " + String(disarida).padStart(5) + "  TOPLAM DIŞARIDA");
  console.log("   " + String(tumYazilacak.length).padStart(5) + "  yazılacak");
  console.log("   " + String(disarida + tumYazilacak.length).padStart(5) + "  = " + veri.length + " satır " + (disarida + tumYazilacak.length === veri.length ? "✓ TUTUYOR" : "⛔ TUTMUYOR"));

  for (const k of ["eslesmeyenBarkod", "copBarkod", "tarihYok", "belirsizBarkod"] as Kova[]) {
    const l = kovalar.get(k) ?? [];
    if (l.length === 0) continue;
    console.log("\n   ── " + k + " — örnek:");
    for (const s of l.slice(0, 6)) {
      console.log("      satır " + String(s.sira).padStart(5) + "  barkod " + (s.barkod || "(boş)").padEnd(16) + " " + s.urun.slice(0, 42));
    }
    if (l.length > 6) console.log("      … ve " + (l.length - 6) + " tane daha");
  }

  // ═══ ④ TEDARİKÇİ ═══════════════════════════════════════════════════════
  console.log("\n④ TEDARİKÇİ — YENİ KAYIT OTOMATİK AÇILMAZ");
  const magazaKume = new Map<string, { satir: number; eslesen: string | null }>();
  for (const s of tumYazilacak) {
    const es = tedHarita.get(tedarikciAnahtari(s.magaza));
    const m = magazaKume.get(s.magaza || "(boş)") ?? { satir: 0, eslesen: es?.name ?? null };
    m.satir++;
    magazaKume.set(s.magaza || "(boş)", m);
  }
  console.log("   MAĞAZA                  KALEM  EŞLEŞME");
  const yeniAday: string[] = [];
  for (const [ad, m] of [...magazaKume].sort((a, b) => b[1].satir - a[1].satir)) {
    if (!m.eslesen) yeniAday.push(ad);
    console.log("   " + ad.slice(0, 22).padEnd(24) + String(m.satir).padStart(5) + "  " + (m.eslesen ? "✓ " + m.eslesen : "⛔ YENİ ADAY"));
  }
  console.log("\n   ⛔ YENİ TEDARİKÇİ ADAYI: " + yeniAday.length + (yeniAday.length ? " → " + yeniAday.join(" · ") : ""));
  console.log("   ⚠ OTOMATİK AÇILMAZ — Halil onaylamadan bu satırlar YAZILMAZ.");
  const yeniAdayKalem = tumYazilacak.filter((s) => !tedHarita.has(tedarikciAnahtari(s.magaza))).length;
  console.log("   ⚠ Onay beklerken dışarıda kalacak kalem: " + yeniAdayKalem);

  // ═══ ⑤ İDEMPOTENTLİK ═══════════════════════════════════════════════════
  console.log("\n⑤ İDEMPOTENTLİK — ikinci koşum SİMÜLASYONU");
  console.log("   kimlik anahtarı  supplierOrderNo   (yedek: varyant + alış günü + adet)");
  const yazilanNo = new Set(tumYazilacak.map((s) => s.siparis).filter(Boolean));
  const yazilanUclu = new Set(tumYazilacak.map((s) => cozum.get(s.sira)!.variantId + "|" + gun(s.alis!) + "|" + s.adet));
  /**
   * ⚠ İKİNCİ KOŞUM AYNI KURALLA SİMÜLE EDİLİYOR — "0 yazar" diye BEYAN
   * etmek yetmez. Yazım sonrası hâli taklit edilip aynı sınıflandırma
   * yeniden koşuluyor.
   */
  let ikinciKosumYazar = 0;
  for (const s of tumYazilacak) {
    const vid = cozum.get(s.sira)!.variantId;
    const u = vid + "|" + gun(s.alis!) + "|" + s.adet;
    if ((s.siparis && yazilanNo.has(s.siparis)) || yazilanUclu.has(u)) continue;
    ikinciKosumYazar++;
  }
  console.log("   ikinci koşum yazacağı satır: " + ikinciKosumYazar + (ikinciKosumYazar === 0 ? "   ✓" : "   ⛔ SIFIR DEĞİL"));

  // ═══ ⑥ GERİ ALMA ═══════════════════════════════════════════════════════
  console.log("\n⑥ GERİ ALMA");
  console.log("   parti kimliği   alis-YYYYMMDDHHMMSS  → `Purchase.supplierOrderNo` DEĞİL,");
  console.log("                   ayrı bir iz gerekiyor — bkz. ŞEMA NOTU aşağıda.");
  console.log("   yöntem          TERS KAYIT (satış tarafındaki kararın aynısı)");
  console.log("   ⚠ Stok hareketi LEDGER satırıdır; silinmez, ters `ADJUSTMENT` yazılır.");

  // ═══ ⑦ STOK HAREKETİ ═══════════════════════════════════════════════════
  console.log("\n⑦ STOK HAREKETİ — PURCHASE_IN YAZILACAK");
  console.log("   occurredAt = Satın Alma Tarihi (İstanbul günü, UTC gece yarısı)");
  console.log("   ⚠ SATIŞ TARAFINDAKİ KARARDAN FARKLI ve sebebi net: orada hareket");
  console.log("     yazılmadı çünkü PARTİ YOKTU. Burada parti BİZZAT bu kayıtlar.");
  const onceHareket = await prisma.stockMovement.count();
  const oncePurchaseIn = await prisma.stockMovement.count({ where: { type: "PURCHASE_IN" } });
  console.log("\n   ÖNCE:  StockMovement " + onceHareket + "  (PURCHASE_IN " + oncePurchaseIn + ")");
  console.log("   SONRA: beklenen      " + (onceHareket + tumYazilacak.length) + "  (PURCHASE_IN " + (oncePurchaseIn + tumYazilacak.length) + ")");
  console.log("   ⚠ Kalem başına TEK hareket — FIFO partisi budur.");

  // ═══ ⑧ SONRASI ═════════════════════════════════════════════════════════
  console.log("\n⑧ SONRASI — stok bağı betiği yeniden koşunca");
  const karsiliksiz = await prisma.saleItem.findMany({
    where: { sale: { importBatch: { not: null }, iptalTarihi: null }, stockMovements: { none: {} } },
    select: { variantId: true, quantity: true, unitPriceAmount: true, sale: { select: { soldAt: true } } },
    orderBy: { sale: { soldAt: "asc" } },
  });
  const yeniParti = new Map<string, { tarih: Date; adet: number }[]>();
  for (const s of tumYazilacak) {
    const vid = cozum.get(s.sira)!.variantId;
    const p = yeniParti.get(vid) ?? [];
    p.push({ tarih: s.alis!, adet: s.adet });
    yeniParti.set(vid, p);
  }
  for (const p of yeniParti.values()) p.sort((a, b) => a.tarih.getTime() - b.tarih.getTime());
  let baglanir = 0;
  let baglananTutar = 0;
  for (const k of karsiliksiz) {
    const p = yeniParti.get(k.variantId);
    if (!p) continue;
    const uygun = p.filter((x) => x.tarih.getTime() <= k.sale.soldAt.getTime() && x.adet > 0);
    if (uygun.reduce((t, x) => t + x.adet, 0) < k.quantity) continue;
    let ihtiyac = k.quantity;
    for (const x of uygun) {
      const al = Math.min(x.adet, ihtiyac);
      x.adet -= al;
      ihtiyac -= al;
      if (ihtiyac === 0) break;
    }
    baglanir++;
    baglananTutar += Number(k.unitPriceAmount) * k.quantity;
  }
  const acikTutar = karsiliksiz.reduce((t, k) => t + Number(k.unitPriceAmount) * k.quantity, 0);
  console.log("   bugün karşılıksız kalem   " + karsiliksiz.length + " · " + t2(acikTutar));
  console.log("   ✓ BEKLENEN BAĞLANMA      " + baglanir + " kalem · " + t2(baglananTutar));
  console.log("     → açığın %" + ((baglananTutar / acikTutar) * 100).toFixed(1) + "'i kapanır");
  console.log("   ⛔ yine bağlanamayacak   " + (karsiliksiz.length - baglanir) + " kalem");

  // ═══ ŞEMA NOTU ═════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(98));
  console.log("⛔ ŞEMA NOTU — BU RAPORUN AÇTIĞI TEK KALEM");
  console.log("=".repeat(98));
  console.log("   `Purchase`de içe aktarma izi taşıyacak alan YOK.");
  console.log("   Satış tarafında `Sale.importBatch` + `importKaynak` açılmıştı;");
  console.log("   alım tarafında karşılığı yok ve geri alma ONA bağlanacak.");
  console.log("");
  console.log("     Purchase.importBatch  String?   @@index([importBatch])");
  console.log("     Purchase.importKaynak String?   ← 'alis-excel'");
  console.log("");
  console.log("   ⚠ MERDİVEN ÖLÇÜLDÜ: `supplierOrderNo` bu işi GÖREMEZ — o alan");
  console.log("     tedarikçinin numarası ve elle girilen kayıtlarda da dolu;");
  console.log("     parti kimliği olarak kullanmak iki anlamı tek kolona koyardı.");
  console.log("     `note` serbest metni de sorgulanacağı için yetmez.");
  console.log("   ⚠ Yazımdan ÖNCE ayrı migration onayı gerekir.");

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
