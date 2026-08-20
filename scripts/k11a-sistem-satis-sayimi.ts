/**
 * ============================================================================
 *  K11a — SİSTEM TARAFI TY SATIŞ SAYIMI, HESAP KIRILIMLI
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:k11a-sayim
 *  Çıktı:       raporlar/k11a-sistem-TY-aylik.csv
 *
 *  ⚠ SALT OKUMA. Yazma bayrağı YOK; veritabanına tek `update`/`create` yok.
 *  ⚠ ÇIKTI DOSYASI GERÇEK TİCARİ VERİ TAŞIR — `raporlar/` gitignore'da.
 *
 *  ── NİYE VAR ────────────────────────────────────────────────────────────
 *  Kanalın "sattın" dediği satışlar sistemde yok. Eksik satış = görünmeyen
 *  ciro + yanlış kâr + hatalı hakediş beklentisi. Bu sayım, Aşama 3'ün
 *  gerekçesini anekdottan SAYIYA çevirir.
 *
 *  ── ⚠ HESAP KIRILIMI ZORUNLU (K14 bulgusu) ──────────────────────────────
 *  K9 `channel.name = "Trendyol"` ile süzüyor ve HESAP AYRIMI YAPMIYOR;
 *  Trendyol'un üç hesabı var. Yani K9'un `227/8` kıyası iki tarafı aynı
 *  kapsamda ölçmüyordu. Burada her satır hem `channelAccountId` hem
 *  `hesapAdi` taşıyor ki rapor hangi hesaptansa ONA karşı kıyaslanabilsin.
 *
 *  ⚠ KİMLİK ESAS, AD OKUNURLUK İÇİN. Hesap adları kanallar arasında harf
 *  farkıyla tekrarlıyor (`S.Ahmet` · `S.ahmet` · `s.ahmet` — K14). Adla
 *  eşleştirme yapılmaz; ad yalnız CSV'de okunsun diye var.
 *
 *  ── AYLAR BİRLEŞTİRİLMEZ ────────────────────────────────────────────────
 *  Haziran/temmuz KAPANMIŞ; ağustos DOLMAKTA. Dolmakta olan ayda eksiklik
 *  gerçek bir boşluk değil, sadece GECİKME olabilir. Tek toplamda
 *  birleştirmek bu ayrımı yok eder ve "ağustos da eksik" diye yanlış bir
 *  hüküm ürettirir.
 *
 *  ── BRÜT / NET AYRI ─────────────────────────────────────────────────────
 *  Kanal raporunun hangisini saydığı BİLİNMİYOR, o yüzden ikisi de yazılır
 *  ve tek bir "adet" sütununa indirgenmez:
 *    brutAdet = iptalsiz satışların kalem adedi (iade DÜŞÜLMEMİŞ)
 *    netAdet  = brutAdet − o kaleme bağlı iade adedi
 *  İptal edilmiş satışlar İKİSİNE DE girmez; ayrı sayaçta beyan edilir.
 *
 *  ── ⚠ H20 AÇIK: `soldAt` SAAT TAŞIMIYOR ─────────────────────────────────
 *  Pencere uçları GÜN düzeyinde kesiliyor. 01.06 ve 20.08 tarihli kayıtlar
 *  içeride; gün içi bir sıralama iddiası KURULMUYOR.
 *
 *  ── ⚠ BOŞ SONUÇ ≠ TEMİZ SONUÇ ───────────────────────────────────────────
 *  Her süzgecin kaç kaydı NEDEN elediği ayrı sayaçla basılır (K13b dersi:
 *  iki sebep tek sepete atılınca teşhis kayboluyor). Sıfır satır dönerse
 *  "TY satışı yok" DENMEZ; neyin tarandığı yazılır.
 * ============================================================================
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const KANAL = "Trendyol";
const BASLANGIC = "2026-06-01";
const BITIS = "2026-08-20";
/** Dolmakta olan ay — eksiklik gecikme olabilir, hüküm kurulmaz. */
const DOLMAKTA = "2026-08";
const CIKTI = "raporlar/k11a-sistem-TY-aylik.csv";

/** Mimarın ayrıca izlediği dört ürün — desenle, koda gömülü ada değil. */
const IZLENEN: { etiket: string; desen: RegExp; not?: string }[] = [
  { etiket: "OneBlade QP2824", desen: /QP2824/i },
  {
    etiket: "Philips 5000 10in1",
    desen: /5000\s*serisi.*10\s*in\s*1|10in1/i,
    not: "KISMİ — rapor 12 / sistem 3. Sıfırlardan FARKLI imza: eşleşme kuruluyor ama eksik.",
  },
  { etiket: "Burby Wood", desen: /burby/i },
  { etiket: "Soundcore Q21i", desen: /q21i/i },
];

function csvHucre(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function gun(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("");
  console.log("K11a — SİSTEM TARAFI " + KANAL + " SATIŞ SAYIMI (hesap kırılımlı)");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        SALT OKUMA — veritabanına hiçbir şey yazılmaz");
  console.log("  dönem      " + BASLANGIC + " → " + BITIS + "  (gün düzeyinde)");
  console.log("  ⚠ H20: `soldAt` saat taşımıyor; uçlar TARİHLE kesildi.");
  console.log("");

  // ── HESAPLAR — kimlikle, adla değil ───────────────────────────────────
  const hesaplar = await prisma.channelAccount.findMany({
    where: { channel: { name: KANAL } },
    select: { id: true, name: true, satisIcin: true },
    orderBy: { name: "asc" },
  });
  if (hesaplar.length === 0) {
    console.log("  ⛔ ÖLÇÜM KOŞMADI — '" + KANAL + "' kanalında hesap bulunamadı.");
    console.log("     Bu 'satış yok' DEĞİL; taranacak hesap yok.");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  console.log("  " + KANAL + " HESAPLARI (" + hesaplar.length + ")");
  for (const h of hesaplar)
    console.log(
      "    " + h.id.padEnd(28) + h.name.padEnd(16) + "satışIçin=" + h.satisIcin,
    );
  console.log("");

  const bas = new Date(BASLANGIC + "T00:00:00.000Z");
  const bit = new Date(BITIS + "T23:59:59.999Z");

  /**
   * ⚠ İPTALLİ SATIŞLAR BURADA ELENMİYOR — sorguya alınıyor ki KAÇ TANE
   * olduğu sayılabilsin. Elenmiş kaydı saymak, elemenin kendisini
   * görünür kılmanın tek yolu.
   */
  const kalemler = await prisma.saleItem.findMany({
    where: {
      sale: {
        channelAccount: { channel: { name: KANAL } },
        soldAt: { gte: bas, lte: bit },
      },
    },
    select: {
      id: true,
      quantity: true,
      variantId: true,
      variant: {
        select: { barcode: true, sku: true, product: { select: { name: true } } },
      },
      sale: {
        select: {
          id: true,
          soldAt: true,
          iptalTarihi: true,
          channelAccountId: true,
          channelAccount: { select: { name: true } },
        },
      },
    },
  });

  // ── ELEME SAYAÇLARI — her sebep AYRI ──────────────────────────────────
  const elenen = { iptalli: 0, iptalliAdet: 0 };

  const gecerli = kalemler.filter((k) => {
    if (k.sale.iptalTarihi !== null) {
      elenen.iptalli++;
      elenen.iptalliAdet += k.quantity;
      return false;
    }
    return true;
  });

  // ── İADELER — kalem bazında ───────────────────────────────────────────
  const iadeler = await prisma.returnItem.findMany({
    where: { saleItemId: { in: gecerli.map((k) => k.id) } },
    select: { saleItemId: true, quantity: true },
  });
  const iadeAdedi = new Map<string, number>();
  for (const i of iadeler)
    iadeAdedi.set(i.saleItemId, (iadeAdedi.get(i.saleItemId) ?? 0) + i.quantity);

  // ── KANAL SKU VAR MI — hesap+varyant çifti ────────────────────────────
  const kanalSkular = await prisma.channelSku.findMany({
    where: { channelAccount: { channel: { name: KANAL } } },
    select: { channelAccountId: true, variantId: true },
  });
  const kanalSkuVar = new Set(
    kanalSkular.map((k) => k.channelAccountId + "¦" + k.variantId),
  );

  // ── GRUPLAMA: ay × hesap × varyant ────────────────────────────────────
  type Satir = {
    ay: string;
    hesapAdi: string;
    channelAccountId: string;
    barkod: string;
    urunAdi: string;
    kanalSkuVarMi: boolean;
    brutAdet: number;
    netAdet: number;
    satisSatirSayisi: number;
    ilkSatis: string;
    sonSatis: string;
  };
  const gruplar = new Map<string, Satir>();

  /**
   * ⚠ BARKODSUZ VARYANT "EŞLEŞME_YOK" — kanal raporu barkodla eşleşiyor.
   * Barkodu olmayan bir satış rapora ASLA denk gelemez; bu "satış yok"
   * değil, "kıyaslanamaz" demektir ve satır CSV'den DÜŞÜRÜLMEZ.
   */
  let barkodsuz = 0;

  for (const k of gecerli) {
    const ay = gun(k.sale.soldAt).slice(0, 7);
    const barkod = k.variant.barcode ?? "EŞLEŞME_YOK";
    if (k.variant.barcode === null) barkodsuz++;
    const anahtar = ay + "¦" + k.sale.channelAccountId + "¦" + k.variantId;
    const tarih = gun(k.sale.soldAt);
    const net = k.quantity - (iadeAdedi.get(k.id) ?? 0);

    const mevcut = gruplar.get(anahtar);
    if (mevcut) {
      mevcut.brutAdet += k.quantity;
      mevcut.netAdet += net;
      mevcut.satisSatirSayisi++;
      if (tarih < mevcut.ilkSatis) mevcut.ilkSatis = tarih;
      if (tarih > mevcut.sonSatis) mevcut.sonSatis = tarih;
    } else {
      gruplar.set(anahtar, {
        ay,
        hesapAdi: k.sale.channelAccount.name,
        channelAccountId: k.sale.channelAccountId,
        barkod,
        urunAdi: k.variant.product.name,
        kanalSkuVarMi: kanalSkuVar.has(
          k.sale.channelAccountId + "¦" + k.variantId,
        ),
        brutAdet: k.quantity,
        netAdet: net,
        satisSatirSayisi: 1,
        ilkSatis: tarih,
        sonSatis: tarih,
      });
    }
  }

  const satirlar = [...gruplar.values()].sort(
    (a, b) =>
      a.ay.localeCompare(b.ay) ||
      a.hesapAdi.localeCompare(b.hesapAdi) ||
      b.brutAdet - a.brutAdet,
  );

  // ── CSV ───────────────────────────────────────────────────────────────
  const basliklar = [
    "ay", "hesapAdi", "channelAccountId", "barkod", "urunAdi",
    "kanalSkuVarMi", "brutAdet", "netAdet", "satisSatirSayisi",
    "ilkSatis", "sonSatis",
  ];
  const govde = satirlar.map((s) =>
    [
      s.ay, s.hesapAdi, s.channelAccountId, s.barkod, s.urunAdi,
      s.kanalSkuVarMi ? "EVET" : "HAYIR", s.brutAdet, s.netAdet,
      s.satisSatirSayisi, s.ilkSatis, s.sonSatis,
    ]
      .map(csvHucre)
      .join(";"),
  );
  mkdirSync("raporlar", { recursive: true });
  /** ⚠ BOM — Excel'in UTF-8'i Türkçe karakterlerle doğru açması için. */
  writeFileSync(CIKTI, "﻿" + [basliklar.join(";"), ...govde].join("\n") + "\n", "utf8");

  // ── RAPOR ─────────────────────────────────────────────────────────────
  console.log("  TARANAN");
  console.log("    dönemdeki " + KANAL + " satış kalemi   " + kalemler.length);
  console.log("    ├─ iptalli (elendi)              " + elenen.iptalli +
    "   (" + elenen.iptalliAdet + " adet)");
  console.log("    └─ sayıma giren                  " + gecerli.length);
  console.log("    barkodsuz → EŞLEŞME_YOK          " + barkodsuz);
  console.log("    iade kaydı olan kalem            " + iadeAdedi.size);
  console.log("");

  if (satirlar.length === 0) {
    console.log("  ⛔ SIFIR SATIR — bu 'TY satışı yok' DEMEK DEĞİL.");
    console.log("     Tarandı: " + hesaplar.length + " hesap · " + BASLANGIC +
      " → " + BITIS + " · " + kalemler.length + " kalem okundu.");
    console.log("     Sıfırın sebebi yukarıdaki eleme sayaçlarında görünür.");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  console.log("  AYLIK — BİRLEŞTİRİLMEDİ");
  console.log(
    "    " + "ay".padEnd(9) + "hesap".padEnd(12) + "satır".padStart(6) +
      "brüt".padStart(7) + "net".padStart(7) + "  durum",
  );
  const ayHesap = new Map<string, { satir: number; brut: number; net: number }>();
  for (const s of satirlar) {
    const a = s.ay + "¦" + s.hesapAdi;
    const g = ayHesap.get(a) ?? { satir: 0, brut: 0, net: 0 };
    g.satir += s.satisSatirSayisi;
    g.brut += s.brutAdet;
    g.net += s.netAdet;
    ayHesap.set(a, g);
  }
  for (const [a, g] of [...ayHesap].sort()) {
    const [ay, hesap] = a.split("¦");
    console.log(
      "    " + ay.padEnd(9) + hesap.padEnd(12) + String(g.satir).padStart(6) +
        String(g.brut).padStart(7) + String(g.net).padStart(7) +
        "  " + (ay === DOLMAKTA ? "⚠ DOLMAKTA — eksiklik GECİKME olabilir" : "kapanmış"),
    );
  }
  console.log("");
  console.log("    ⚠ Dolmakta olan ay kapanmış aylarla aynı ölçüte vurulmaz;");
  console.log("      oradaki boşluk henüz eksiklik SAYILMAZ.");

  // ── İZLENEN DÖRT ÜRÜN ─────────────────────────────────────────────────
  console.log("");
  console.log("  MİMARIN İZLEDİĞİ DÖRT ÜRÜN");
  for (const u of IZLENEN) {
    const bulunan = satirlar.filter((s) => u.desen.test(s.urunAdi));
    const brut = bulunan.reduce((t, s) => t + s.brutAdet, 0);
    const net = bulunan.reduce((t, s) => t + s.netAdet, 0);
    console.log("");
    console.log(
      "    " + u.etiket.padEnd(22) + "sistem: " + bulunan.length +
        " satır · brüt " + brut + " · net " + net,
    );
    if (bulunan.length === 0) {
      console.log(
        "      ⚠ SİSTEMDE HİÇ YOK — desen `" + u.desen.source +
          "` bu dönemde eşleşmedi.",
      );
      console.log("        (ürün adı farklı yazılmış da olabilir; sıfır, aranan");
      console.log("         desenin bulunamadığını söyler — satışın yokluğunu değil)");
    } else {
      for (const s of bulunan)
        console.log(
          "      " + s.ay + "  " + s.hesapAdi.padEnd(10) + s.barkod.padEnd(16) +
            "brüt " + String(s.brutAdet).padStart(3) + " · net " +
            String(s.netAdet).padStart(3) + " · kanalSKU " +
            (s.kanalSkuVarMi ? "EVET" : "HAYIR") + "  " + s.urunAdi.slice(0, 34),
        );
    }
    if (u.not) console.log("      ⚠ " + u.not);
  }

  console.log("");
  console.log("  CSV: " + CIKTI + "  (" + satirlar.length + " satır)");
  console.log("  ⚠ GERÇEK TİCARİ VERİ — `raporlar/` gitignore'da, commit edilmez.");
  console.log("  ⚠ HÜKÜM VERİLMEDİ, ARIZA ONARILMADI — bu bir ÖLÇÜM.");
  console.log("");

  await prisma.$disconnect();
}

main();
