import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  DENEME — ÖRNEK VERİ (son 30 gün) — kullanıcı isteği 07.10.2026
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — yalnız deneme veritabanına (3307) bir firmanın
 *  bütün ekranlarını dolduracak ÖRNEK veri yazar: kanal hesapları, tedarikçi,
 *  raflar, ürünler + kanal kodları, alımlar + mal kabul, kredi kartları, son
 *  30 günün satışları (3 kanal), kargo/teslim damgaları, iadeler + iade
 *  bildirimleri, giderler, hakediş dosyaları, kart ödemesi — ve panelde /
 *  uyarı merkezinde iş üreten durumlar (kargo bekleyen, mal kabul bekleyen,
 *  açık iade bildirimi, kârı hesaplanamayan, zararına satış, oransız kanal
 *  kodu, kanal kodsuz stok, geciken hakediş).
 *
 *  Kullanıcı kararı 07.10.2026: «Damisell ve TechNS, ikisi de». Ürün adları,
 *  barkodlar ve rakamlar UYDURMADIR (örnek veri — Halil testinin «gerçek
 *  veri» şartının yerine geçmez; anayasa K303 Damisell notu).
 *
 *  ⛔ TAMAMI-YA-HİÇBİRİ DEĞİL: satış ve iade uygulamanın kendi işlemleriyle
 *  yazılır (`satisKaydet` · `iadeKaydet` · `hakedisYaz` — FIFO, kâr, stok
 *  defteri doğru kurulsun diye); tek işleme sığmaz. Bu yüzden:
 *   · KOŞMADAN ÖNCE deneme veritabanının YEDEĞİ alınır (07.10.2026:
 *     `Desktop/deneme-yedekleri/selliora_deneme-20261007-0808-…sql`).
 *   · Firmada bu betiğin damgası («ÖRNEK VERİ 07.10») taşıyan satış VARSA
 *     hiçbir şey yazılmaz — ikinci koşum zararsızdır.
 *   · Yarım kalırsa yedeğe dönülür.
 *  Rastgelelik SABİT tohumla — iki firma ve tekrar koşum aynı deseni üretir.
 *
 *      npx tsx scripts/deneme-ornek-veri.ts DMS
 *      npx tsx scripts/deneme-ornek-veri.ts TCH
 * ============================================================================
 */

const DAMGA = "ÖRNEK VERİ 07.10";

/** Sabit tohumlu sözde rastgele (mulberry32) — tekrar üretilebilir desen. */
function tohumlu(tohum: number) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** EAN-13 denetim hanesi; 200–299 önekleri firma içi kullanım aralığıdır. */
function ean13(govde12: string): string {
  const t = govde12.split("").reduce((s, c, i) => s + Number(c) * (i % 2 === 0 ? 1 : 3), 0);
  return govde12 + String((10 - (t % 10)) % 10);
}

type UrunTanimi = { ad: string; maliyet: number; fiyat: number; adet: number; kategori: 0 | 1 };

const KATALOG: Record<string, { tema: string; urunler: UrunTanimi[] }> = {
  DMS: {
    tema: "giyim",
    urunler: [
      { ad: "Saten Elbise — Lacivert", maliyet: 640, fiyat: 1399, adet: 40, kategori: 0 },
      { ad: "Saten Elbise — Bordo", maliyet: 640, fiyat: 1399, adet: 30, kategori: 0 },
      { ad: "Keten Gömlek — Beyaz", maliyet: 360, fiyat: 849, adet: 50, kategori: 0 },
      { ad: "Keten Gömlek — Mavi", maliyet: 360, fiyat: 849, adet: 35, kategori: 0 },
      { ad: "Yüksek Bel Pantolon — Siyah", maliyet: 420, fiyat: 999, adet: 45, kategori: 0 },
      { ad: "Yüksek Bel Pantolon — Bej", maliyet: 420, fiyat: 999, adet: 25, kategori: 0 },
      { ad: "Triko Kazak — Ekru", maliyet: 380, fiyat: 899, adet: 30, kategori: 0 },
      { ad: "Triko Kazak — Antrasit", maliyet: 380, fiyat: 899, adet: 6, kategori: 0 },
      { ad: "Kaşe Kaban — Camel", maliyet: 1450, fiyat: 2999, adet: 15, kategori: 0 },
      { ad: "Deri Görünümlü Ceket", maliyet: 980, fiyat: 1999, adet: 18, kategori: 0 },
      { ad: "Midi Etek — Pliseli", maliyet: 310, fiyat: 749, adet: 30, kategori: 0 },
      { ad: "Basic Tişört — 3'lü Paket", maliyet: 210, fiyat: 499, adet: 60, kategori: 0 },
      { ad: "İpeksi Şal — Desenli", maliyet: 140, fiyat: 349, adet: 40, kategori: 0 },
      { ad: "Hasır Çanta — Plaj", maliyet: 260, fiyat: 599, adet: 20, kategori: 0 },
      { ad: "Bebek Tulumu — Organik Pamuk", maliyet: 150, fiyat: 329, adet: 30, kategori: 1 },
      { ad: "Çocuk Pijama Takımı", maliyet: 170, fiyat: 379, adet: 30, kategori: 1 },
    ],
  },
  TCH: {
    tema: "elektronik",
    urunler: [
      { ad: "Kablosuz Kulaklık — ANC", maliyet: 1150, fiyat: 2299, adet: 35, kategori: 0 },
      { ad: "Kablosuz Kulaklık — Kulak İçi", maliyet: 540, fiyat: 1099, adet: 50, kategori: 0 },
      { ad: "Akıllı Saat — 44 mm", maliyet: 1650, fiyat: 3299, adet: 20, kategori: 0 },
      { ad: "Bluetooth Hoparlör — Taşınabilir", maliyet: 720, fiyat: 1499, adet: 30, kategori: 0 },
      { ad: "Powerbank 20.000 mAh", maliyet: 430, fiyat: 899, adet: 45, kategori: 0 },
      { ad: "Hızlı Şarj Adaptörü 65 W", maliyet: 310, fiyat: 649, adet: 50, kategori: 0 },
      { ad: "USB-C Kablo — 2 m Örgülü", maliyet: 65, fiyat: 179, adet: 80, kategori: 0 },
      { ad: "Mekanik Klavye — TKL", maliyet: 980, fiyat: 1999, adet: 15, kategori: 0 },
      { ad: "Kablosuz Mouse — Sessiz", maliyet: 230, fiyat: 499, adet: 40, kategori: 0 },
      { ad: "Webcam 1080p", maliyet: 520, fiyat: 1099, adet: 6, kategori: 0 },
      { ad: "Laptop Standı — Alüminyum", maliyet: 280, fiyat: 649, adet: 25, kategori: 0 },
      { ad: "Akıllı Priz — Wi-Fi", maliyet: 190, fiyat: 399, adet: 40, kategori: 0 },
      { ad: "Robot Süpürge — Lazer", maliyet: 5400, fiyat: 9999, adet: 8, kategori: 0 },
      { ad: "Kahve Makinesi — Kapsüllü", maliyet: 2150, fiyat: 3999, adet: 12, kategori: 0 },
      { ad: "Elektrikli Diş Fırçası", maliyet: 640, fiyat: 1299, adet: 25, kategori: 1 },
      { ad: "Saç Kurutma Makinesi — İyonik", maliyet: 880, fiyat: 1799, adet: 18, kategori: 1 },
    ],
  },
};

/** Kanal başına komisyon (yüzde) ve elle kargo (KDV dahil) aralığı. */
const KANALLAR = [
  { kanal: "TRENDYOL", ek: "TY", komisyon: 18, kargo: [55, 95] as const, pay: 0.5 },
  { kanal: "HEPSIBURADA", ek: "HB", komisyon: 15, kargo: [50, 85] as const, pay: 0.3 },
  { kanal: "N11", ek: "N11", komisyon: 12, kargo: [45, 80] as const, pay: 0.2 },
] as const;

async function main() {
  const firmaKodu = (process.argv[2] ?? "").trim().toUpperCase();
  if (!KATALOG[firmaKodu]) throw new Error(`firma kodu DMS ya da TCH olmalı (verilen: «${firmaKodu}»)`);

  const env = readFileSync(".env", "utf8");
  const adres = /^DATABASE_URL="?([^"\r\n]+)"?/m.exec(env)?.[1] ?? "";
  if (!/@127\.0\.0\.1:3307\/selliora_deneme(\?|$)/.test(adres)) throw new Error("HEDEF selliora_deneme (3307) DEĞİL — hiçbir şey yazılmadı");
  if (!/^DENEME_ORTAMI="?1"?/m.test(env)) throw new Error("DENEME_ORTAMI=1 değil — hiçbir şey yazılmadı");
  process.env.DATABASE_URL = adres;

  const { sistemPrisma, prisma } = await import("../src/lib/prisma");
  const { firmaBaglamindaCalistir } = await import("../src/lib/firma-baglami");
  const { satisKaydet } = await import("../src/lib/satis");
  const { iadeKaydet } = await import("../src/lib/iade");
  const { hakedisYaz } = await import("../src/lib/hakedis/yukle");
  const { isTakvimGunu } = await import("../src/lib/donem");

  // SISTEM: firma ve küresel kanal tablosu firmalar-üstüdür (yalnız okuma).
  const firma = await sistemPrisma.company.findUniqueOrThrow({ where: { code: firmaKodu }, select: { id: true, name: true } });
  const kanallar = await sistemPrisma.channel.findMany({ where: { code: { in: KANALLAR.map((k) => k.kanal) } }, select: { id: true, code: true } });
  if (kanallar.length !== KANALLAR.length) throw new Error("kanal tablosunda TY/HB/N11 eksik — hiçbir şey yazılmadı");

  const katalog = KATALOG[firmaKodu]!;
  const r = tohumlu(firmaKodu === "DMS" ? 7101 : 7102);
  const aralik = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));

  // İstanbul günü (anayasa: iş saat dilimi sabit) — `isTakvimGunu` tek kaynak.
  const bugun = isTakvimGunu(new Date());
  /** İstanbul gününe göre `gunFarki` gün önce/sonra, yerel `saat`te (UTC+3). */
  const an = (gunFarki: number, saat = 10, dakika = 0) =>
    new Date(Date.UTC(bugun.yil, bugun.ay - 1, bugun.gun + gunFarki, saat - 3, dakika));
  const gun = (gunFarki: number) => new Date(Date.UTC(bugun.yil, bugun.ay - 1, bugun.gun + gunFarki));

  const ozet = await firmaBaglamindaCalistir(firma.id, async () => {
    /* ── 0) İKİNCİ KOŞUM KAPISI — yazmadan ÖNCE ── */
    const onceki = await prisma.sale.count({ where: { note: { contains: DAMGA } } });
    if (onceki > 0) return { atlandi: true as const, onceki };

    const kategoriler = await prisma.category.findMany({ orderBy: { vatRate: "desc" }, select: { id: true, vatRate: true } });
    if (kategoriler.length < 2) throw new Error("firmada en az iki kategori yok (kâr motoru tohumu eksik) — hiçbir şey yazılmadı");
    const gelirKat = await prisma.expenseCategory.findMany({ select: { id: true, name: true, defaultVatRate: true } });
    if (gelirKat.length === 0) throw new Error("gider kategorisi yok (gider tohumu eksik) — hiçbir şey yazılmadı");

    /* ── 1) Kanal hesapları — varsa kullanılır, yoksa açılır ── */
    const hesaplar: { id: string; kanal: (typeof KANALLAR)[number] }[] = [];
    for (const k of KANALLAR) {
      const kanalId = kanallar.find((c) => c.code === k.kanal)!.id;
      const mevcut = await prisma.channelAccount.findFirst({ where: { channelId: kanalId, satisIcin: true }, select: { id: true } });
      const h = mevcut ?? (await prisma.channelAccount.create({
        data: { channelId: kanalId, code: `${firmaKodu}-${k.ek}`, name: `${k.kanal === "TRENDYOL" ? "Trendyol" : k.kanal === "HEPSIBURADA" ? "Hepsiburada" : "N11"} — ${firma.name}`, defaultCurrency: "TRY", satisIcin: true, alisIcin: false },
        select: { id: true },
      }));
      hesaplar.push({ id: h.id, kanal: k });
    }

    /* ── 2) Tedarikçiler ── */
    const tedarikciler = [];
    for (const [i, ad] of ["Ana Toptancı", "Kampanya Kaynağı"].entries()) {
      tedarikciler.push(await prisma.supplier.create({ data: { name: `${ad} (örnek)`, code: `${firmaKodu}T${i + 1}` }, select: { id: true, code: true } }));
    }

    /* ── 3) Raflar — bölüm «A», 3 ünite × 4 göz ── */
    const bolum = await prisma.depoBolumu.create({ data: { ad: "Ana Depo", kisaltma: "A", sira: 1 }, select: { id: true } });
    const raflar: string[] = [];
    for (let u = 1; u <= 3; u++) {
      for (let g = 1; g <= 4; g++) {
        const raf = await prisma.location.create({ data: { code: `RAF-A${u}-${g}`, name: "Ana Depo", bolumId: bolum.id, unite: u, goz: g }, select: { id: true } });
        raflar.push(raf.id);
      }
    }

    /* ── 4) Kredi kartları ── */
    const kart1 = await prisma.creditCard.create({ data: { label: "İş Kartı (örnek)", bankName: "Örnek Bank", last4: "4242", currency: "TRY", creditLimitAmount: "250000", creditLimitCurrency: "TRY", statementDay: 10, dueDay: 20 }, select: { id: true } });
    const kart2 = await prisma.creditCard.create({ data: { label: "Alım Kartı (örnek)", bankName: "Deneme Bankası", last4: "1881", currency: "TRY", creditLimitAmount: "150000", creditLimitCurrency: "TRY", statementDay: 25, dueDay: 5 }, select: { id: true } });

    /* ── 5) Ürünler + kanal kodları ── */
    const onEk = firmaKodu === "DMS" ? "2001" : "2002";
    const urunler: { varyantId: string; t: UrunTanimi; vat: number; raf: string }[] = [];
    for (const [i, t] of katalog.urunler.entries()) {
      const kat = kategoriler[t.kategori === 0 ? 0 : Math.min(1, kategoriler.length - 1)]!;
      const sku = `${firmaKodu}-${1001 + i}`;
      const p = await prisma.product.create({
        data: {
          name: t.ad, categoryId: kat.id, isActive: true, hasVariants: false, desi: String(aralik(1, 5)),
          variants: { create: [{ sku, companySku: `${firmaKodu}${String(1001 + i)}`, barcode: ean13(`${onEk}${String(100000 + i * 37).padStart(8, "0")}`), isDefault: true, isActive: true }] },
        },
        select: { variants: { select: { id: true } } },
      });
      const varyantId = p.variants[0]!.id;
      urunler.push({ varyantId, t, vat: Number(kat.vatRate), raf: raflar[i % raflar.length]! });
      // Son ürün HİÇBİR kanala bağlanmaz → «kanal kodu olmayan stok» uyarısı.
      if (i === katalog.urunler.length - 1) continue;
      for (const h of hesaplar) {
        // İlk ürünün N11 kodu ORANSIZ → panelde «komisyonu girilmemiş kanal kodu» görevi.
        const oransiz = i === 0 && h.kanal.kanal === "N11";
        await prisma.channelSku.create({
          data: { variantId: varyantId, channelAccountId: h.id, channelSku: `${h.kanal.ek}-${sku}`, commissionRate: oransiz ? null : String(h.kanal.komisyon), commissionUpdatedAt: oransiz ? null : an(-36) },
        });
      }
    }

    /* ── 6) Alımlar + mal kabul — iki parti; biri kartla. Mal kabul rafa ── */
    const stok = new Map<string, number>();
    type Olay = { an: Date; tur: "kabul"; alimId: string } | { an: Date; tur: "satis"; gunFarki: number; sira: number };
    const olaylar: Olay[] = [];
    const alimlar: { id: string; code: string; kalemler: { id: string; variantId: string; quantity: number; unitCostAmount: unknown }[] }[] = [];
    const partiler = [
      { gunFarki: -35, oran: 1, tedarikci: 0, kart: null as string | null },
      { gunFarki: -16, oran: 0.5, tedarikci: 1, kart: kart2.id },
    ];
    for (const [pi, parti] of partiler.entries()) {
      const kalemler = urunler.map((u) => ({
        variantId: u.varyantId,
        quantity: Math.max(2, Math.round(u.t.adet * parti.oran)),
        // İkinci parti başka kampanyadan: maliyet ±%8 (fiyatın yönü yoktur — anayasa).
        unitCostAmount: String((u.t.maliyet * (pi === 0 ? 1 : 0.92 + r() * 0.16)).toFixed(2)),
        unitCostCurrency: "TRY" as const,
        promosyon: false,
      }));
      const alim = await prisma.purchase.create({
        data: {
          code: `${firmaKodu}-ALIM-${String(pi + 1).padStart(3, "0")}`, status: "ORDERED", purchasedAt: an(parti.gunFarki, 11),
          supplierId: tedarikciler[parti.tedarikci]!.id, note: `${DAMGA} — örnek alım`, installmentCount: parti.kart ? 3 : 1,
          creditCardId: parti.kart, goodsAmount: String(kalemler.reduce((s, k) => s + k.quantity * Number(k.unitCostAmount), 0).toFixed(2)), goodsCurrency: "TRY",
          items: { create: kalemler },
        },
        select: { id: true, code: true, items: { select: { id: true, variantId: true, quantity: true, unitCostAmount: true } } },
      });
      alimlar.push({ id: alim.id, code: alim.code, kalemler: alim.items });
      olaylar.push({ an: an(parti.gunFarki + 1, 9), tur: "kabul", alimId: alim.id });
    }
    // Üçüncü alım SİPARİŞTE kalır → «mal kabul bekleyen» görevi.
    await prisma.purchase.create({
      data: {
        code: `${firmaKodu}-ALIM-003`, status: "ORDERED", purchasedAt: an(-2, 15), supplierId: tedarikciler[0]!.id, note: `${DAMGA} — yolda olan alım`, installmentCount: 1,
        items: { create: urunler.slice(0, 4).map((u) => ({ variantId: u.varyantId, quantity: 10, unitCostAmount: String(u.t.maliyet), unitCostCurrency: "TRY" as const, promosyon: false })) },
      },
    });

    /* ── 7) Satış takvimi — son 30 gün, günde 4–9 sipariş ── */
    for (let g = -30; g <= 0; g++) {
      const adet = g === 0 ? 3 : aralik(4, 9);
      for (let s = 0; s < adet; s++) olaylar.push({ an: an(g, aralik(9, 22), aralik(0, 59)), tur: "satis", gunFarki: g, sira: s });
    }
    olaylar.sort((a, b) => a.an.getTime() - b.an.getTime());

    const satislar: { id: string; gunFarki: number; hesap: (typeof hesaplar)[number]; tutar: number; code: string }[] = [];
    let siparisNo = 0;
    let rulesizYazildi = false;
    let zararliYazildi = false;
    for (const o of olaylar) {
      if (o.tur === "kabul") {
        const alim = alimlar.find((a) => a.id === o.alimId)!;
        for (const k of alim.kalemler) {
          const u = urunler.find((x) => x.varyantId === k.variantId)!;
          await prisma.stockMovement.create({
            data: { variantId: k.variantId, type: "PURCHASE_IN", quantityDelta: k.quantity, occurredAt: o.an, purchaseItemId: k.id, locationId: u.raf, unitCostAmount: String(k.unitCostAmount), unitCostCurrency: "TRY", note: `Mal kabul — ${alim.code}` },
          });
          await prisma.productVariant.update({ where: { id: k.variantId }, data: { locationId: u.raf } });
          stok.set(k.variantId, (stok.get(k.variantId) ?? 0) + k.quantity);
        }
        await prisma.purchase.update({ where: { id: alim.id }, data: { status: "RECEIVED", receivedAt: o.an } });
        continue;
      }
      // Kanal payına göre seç
      const zar = r();
      const hesap = zar < KANALLAR[0].pay ? hesaplar[0]! : zar < KANALLAR[0].pay + KANALLAR[1].pay ? hesaplar[1]! : hesaplar[2]!;
      const kalemSayisi = r() < 0.8 ? 1 : 2;
      const secilen = new Set<number>();
      const kalemler = [];
      for (let k = 0; k < kalemSayisi; k++) {
        // Kanala bağlı ürünler (son ürün hariç), stokta olanlar
        const adaylar = urunler.slice(0, -1).map((u, i) => ({ u, i })).filter(({ u, i }) => (stok.get(u.varyantId) ?? 0) > 0 && !secilen.has(i));
        if (adaylar.length === 0) break;
        // Ucuz ürünler daha sık satar
        const { u, i } = adaylar[Math.floor(Math.pow(r(), 1.6) * adaylar.length)]!;
        secilen.add(i);
        const miktar = Math.min(stok.get(u.varyantId)!, r() < 0.85 ? 1 : 2);
        stok.set(u.varyantId, stok.get(u.varyantId)! - miktar);
        // Fiyat: liste fiyatının %88–%100'ü (kampanya); BİR satış bilerek maliyetin altında → «zararına satış».
        let fiyat = u.t.fiyat * (0.88 + r() * 0.12);
        if (!zararliYazildi && o.gunFarki === -9) { fiyat = u.t.maliyet * 0.9; zararliYazildi = true; }
        // BİR satış komisyonsuz girilir → kârı hesaplanamayan (RULE_MISSING).
        const rulesiz = !rulesizYazildi && o.gunFarki === -4;
        if (rulesiz) rulesizYazildi = true;
        kalemler.push({
          variantId: u.varyantId, quantity: miktar, unitPriceAmount: fiyat.toFixed(2), unitPriceCurrency: "TRY" as const, vatRate: u.vat,
          commissionRate: rulesiz ? null : hesap.kanal.komisyon, commissionAmount: null, secilenPartiId: null,
        });
      }
      if (kalemler.length === 0) continue;
      siparisNo += 1;
      // Kanalların sipariş no BİÇİMİ (TY 11 hane «1…», HB 10 hane «4…»); firma hanesi çakışmayı önler.
      const firmaHanesi = firmaKodu === "DMS" ? "1" : "2";
      const sira8 = String(siparisNo).padStart(8, "0");
      const code = hesap.kanal.ek === "TY" ? `1${firmaHanesi}9${sira8}` : hesap.kanal.ek === "HB" ? `4${firmaHanesi}${sira8}` : `N11${firmaHanesi}${sira8}`;
      const id = await satisKaydet({
        code, shipmentCode: null, channelAccountId: hesap.id, soldAt: o.an, note: `${DAMGA} — örnek satış`, kalemler,
        cargoCarrierId: null, cargoDesi: null, cargoAmountManual: aralik(hesap.kanal.kargo[0], hesap.kanal.kargo[1]),
      });
      const tutar = kalemler.reduce((t, k) => t + Number(k.unitPriceAmount) * k.quantity, 0);
      satislar.push({ id, gunFarki: o.gunFarki, hesap, tutar, code });
      // Kargo / teslim damgaları: 2 günden eski → kargoda; 5 günden eski → teslim.
      // Son 2 gün KARGO BEKLEYEN kalır (panel görevi).
      if (o.gunFarki <= -2) {
        const kargo = an(o.gunFarki + 1, 16);
        const teslim = o.gunFarki <= -5 ? an(o.gunFarki + 3, 14) : null;
        await prisma.sale.update({ where: { id }, data: { shippedAt: kargo, deliveredAt: teslim } });
      }
    }

    /* ── 8) İadeler — teslim edilmiş satışlardan ~%6; biri hasarlı ── */
    const teslimler = satislar.filter((s) => s.gunFarki <= -8);
    let iadeSayisi = 0;
    for (const [j, s] of teslimler.entries()) {
      if (j % 17 !== 3) continue;
      const kalem = await prisma.saleItem.findFirstOrThrow({ where: { saleId: s.id }, select: { id: true, quantity: true, variantId: true, variant: { select: { locationId: true } } } });
      const hasarli = iadeSayisi === 1 ? 1 : 0;
      const iadeAn = an(s.gunFarki + 7, 13);
      const iadeId = await iadeKaydet({
        saleId: s.id, code: null, returnType: "NORMAL", occurredAt: iadeAn, note: `${DAMGA} — örnek iade`, userId: null, degisimTeslimTarihi: null,
        iadeKargosu: 49.9, yenidenGonderimKargosu: null, ceza: null, cezaNotu: null,
        kalemler: [{ saleItemId: kalem.id, iadeAdedi: 1, saglamAdet: 1 - hasarli, hasarliAdet: hasarli, hasarNotu: hasarli ? "Kutu ezik, ürün çizik (örnek)" : null, locationId: hasarli ? null : kalem.variant.locationId, exchangeVariantId: null }],
      });
      // Bildirim → iade (kapanmış bildirim): ekranda iade süreci baştan sona görünür.
      await prisma.returnNotice.create({ data: { saleId: s.id, noticedAt: an(s.gunFarki + 4, 12), reason: iadeSayisi % 2 === 0 ? "CAYMA" : "BEDEN_BUYUK", status: "KAPANDI", note: `${DAMGA}`, reservedQuantity: 0, returnId: iadeId } });
      iadeSayisi += 1;
    }
    // AÇIK iade bildirimleri — biri kargoda, biri sayacı dolmak üzere.
    const acikAdaylar = satislar.filter((s) => s.gunFarki <= -6 && s.gunFarki >= -7);
    for (const [j, s] of acikAdaylar.slice(0, 3).entries()) {
      await prisma.returnNotice.create({
        data: {
          saleId: s.id, noticedAt: an(-2 + j * 0, 10 + j), reason: j === 0 ? "CALISMIYOR" : j === 1 ? "BEDEN_KUCUK" : "HASARLI",
          status: j === 0 ? "KARGOYA_VERILDI" : "BEKLENIYOR", note: `${DAMGA}`, reservedQuantity: 0,
          otomatikOnayTarihi: j === 1 ? an(1, 23) : null,
        },
      });
    }

    /* ── 9) Giderler — sabit + değişken; ikisi kartla ── */
    const kat = (ad: string) => gelirKat.find((g) => g.name === ad) ?? gelirKat[0]!;
    const giderler = [
      { ad: "Kira", g: -28, tutar: 18000, kart: null as string | null, aciklama: "Depo kirası" },
      { ad: "Maaş", g: -27, tutar: 42000, kart: null, aciklama: "Personel maaşı" },
      { ad: "Muhasebe", g: -20, tutar: 3500, kart: null, aciklama: "Aylık muhasebe ücreti" },
      { ad: "Abonelik", g: -18, tutar: 899, kart: kart1.id, aciklama: "Muhasebe yazılımı aboneliği" },
      { ad: "Sarf malzeme", g: -14, tutar: 2650, kart: kart1.id, aciklama: "Koli, bant, balonlu naylon" },
      { ad: "Banka/komisyon", g: -10, tutar: 340, kart: null, aciklama: "EFT/havale masrafları" },
      { ad: "Sarf malzeme", g: -5, tutar: 1180, kart: null, aciklama: "Etiket yazıcı rulosu" },
    ];
    for (const gd of giderler) {
      const k = kat(gd.ad);
      await prisma.expense.create({
        data: { spentAt: an(gd.g, 12), categoryId: k.id, amount: String(gd.tutar), currency: "TRY", vatRate: String(k.defaultVatRate ?? 20), description: `${gd.aciklama} (${DAMGA})`, creditCardId: gd.kart, installmentCount: 1, odemeYontemi: gd.kart ? "KART" : "HAVALE" },
      });
    }

    /* ── 10) Hakediş — kanal başına bir dosya: eski teslimler ÖDENMİŞ,
         bir kısmı vadesi geçmiş ÖDENMEMİŞ (→ geciken hakediş uyarısı) ── */
    let hakedisSatiri = 0;
    for (const h of hesaplar) {
      const adaylar = satislar.filter((s) => s.hesap.id === h.id && s.gunFarki <= -10);
      if (adaylar.length === 0) continue;
      const satirlar = adaylar.map((s, i) => {
        const net = s.tutar * (1 - h.kanal.komisyon / 100) - 60;
        const odendi = s.gunFarki <= -18;
        const vade = gun(s.gunFarki + (odendi ? 14 : 8));
        return {
          satir: {
            externalId: `${firmaKodu}-${h.kanal.ek}-HK-${i + 1}`, kod: "SIPARIS_TUTARI" as const, hamTip: "Satış", siparisNo: s.code,
            tutar: Number(net.toFixed(2)), paraBirimi: "TRY" as const, vadeTarihi: vade, odemeTarihi: odendi ? vade : null,
            urunKodu: null, satirNo: i + 1, ham: `${DAMGA}`,
          },
          saleId: s.id,
        };
      });
      const sonuc = await hakedisYaz({ channelAccountId: h.id, dosyaAdi: `ornek-hakedis-${h.kanal.ek.toLowerCase()}.xlsx`, satirlar });
      hakedisSatiri += sonuc.yazilan;
    }

    /* ── 11) Kart ödemesi — İş Kartı'nın geçen ekstresi ödendi ── */
    await prisma.kartOdeme.create({
      data: { cardId: kart1.id, donem: gun(-27), ekstreBorcu: "899", odenenAnaBorc: "899", odemeTarihi: an(-17, 11), faizOrani: null, faizGun: null, faizTutar: "0", currency: "TRY", faizGiderId: null, kaynak: "TURETILEN" },
    });

    const kalanStok = [...stok.values()].reduce((a, b) => a + b, 0);
    return {
      atlandi: false as const, hesap: hesaplar.length, urun: urunler.length, raf: raflar.length, satis: satislar.length,
      kargoBekleyen: satislar.filter((s) => s.gunFarki > -2).length, iade: iadeSayisi, gider: giderler.length, hakedisSatiri, kalanStok,
      tukenen: urunler.filter((u) => (stok.get(u.varyantId) ?? 0) === 0).length,
    };
  });

  if (ozet.atlandi) {
    console.log(`⏭ ${firma.name}: «${DAMGA}» damgalı ${ozet.onceki} satış zaten var — hiçbir şey yazılmadı.`);
  } else {
    console.log(`${firma.name} — örnek veri yazıldı:`);
    console.log(`  kanal hesabı ${ozet.hesap} · ürün ${ozet.urun} · raf ${ozet.raf}`);
    console.log(`  satış ${ozet.satis} (kargo bekleyen ${ozet.kargoBekleyen}) · iade ${ozet.iade} · gider ${ozet.gider}`);
    console.log(`  hakediş satırı ${ozet.hakedisSatiri} · kalan stok ${ozet.kalanStok} adet · tükenen ürün ${ozet.tukenen}`);
  }
  await sistemPrisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, " ") : e);
  process.exitCode = 1;
});
