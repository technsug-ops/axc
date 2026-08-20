/**
 * ============================================================================
 *  K9 — KOMİSYON ORANI DENETİMİ (kayıtlı vs GERÇEKLEŞEN)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:oran-denetimi -- --dosya="C:/.../rapor.xlsx"
 *
 *  HİÇBİR ŞEY YAZMAZ. Yazma bayrağı da YOKTUR — bu bir denetim, düzeltme
 *  değil. Düzeltme kararı ayrı verilir.
 *
 *  ── KAYNAK: "ÜRÜN KOMİSYON TARİFE RAPORU" ───────────────────────────────
 *  Trendyol'un satıcı panelinden inen performans raporu. ⚠ Bu bir TARİFE
 *  DEĞİL, FATURA ÖZETİDİR: neyin uygulanacağını değil, neyin UYGULANDIĞINI
 *  söyler. Denetim için doğru referans budur — tarife niyeti, rapor sonucu
 *  kaydeder. _(Anayasa: "Denetim için 'ne oldu' doğru referanstır.")_
 *
 *  ── ŞEMAYA GİRMEZ ───────────────────────────────────────────────────────
 *  Dosya okuma anında okunur, karşılaştırılır, raporlanır. Kaydetme kararı
 *  tüketicisi doğduğunda verilir (karar 20.08.2026); satırlar KISMİ olduğu
 *  için `KomisyonTarifesi`'ne karışsaydı `satisTarihiTarifesi`'yi bozardı.
 *
 *  ── NET FARKI MOTORDAN ──────────────────────────────────────────────────
 *  ⚠ Fark elle hesaplanmaz. `karOnizle` rapordaki oranla YENİDEN çağrılır
 *  ve iki NET karşılaştırılır. Kendi formülünü yazan bir denetim, motor
 *  değiştiğinde eski formülü savunur.
 *
 *  ── SINIR GÜNÜ BELİRSİZDİR VE SÖYLENİR ──────────────────────────────────
 *  ⚠ Tarife pencereleri `08:00 → 07:59` ile tanımlı ve BİTİŞİK
 *  (28.07→04.08, 04.08→11.08 …). Bizim `soldAt` alanımızda SAAT YOK (00:00).
 *  Bu yüzden tam sınır gününe düşen bir satışın hangi pencereye ait olduğu
 *  VERİDEN ÇÖZÜLEMEZ. Böyle satışlar "belirsiz" olarak AYRI raporlanır —
 *  birini seçip sessizce hüküm vermek, uydurmak olurdu.
 * ============================================================================
 */

import { readFileSync } from "node:fs";
import readXlsxFile from "read-excel-file/node";

import { kdvDahilKargo } from "../src/lib/kargo-kdv";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const dosyaArg = process.argv.find((a) => a.startsWith("--dosya="));

function p(n: unknown): string {
  if (n === null || n === undefined) return "—";
  return Number(n.toString()).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function g(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/**
 * `28-07-2026 08:00` → Date.
 *
 * ⚠ UTC İLE KURULUR, YEREL SAATLE DEĞİL. `soldAt` veritabanında UTC gece
 * yarısı olarak duruyor; pencereyi `new Date(yıl, ay, gün)` ile kursaydık
 * yerel gece yarısı (TR'de UTC+3) çıkar ve pencere **bir gün geriye
 * kayardı**. İlk koşumda tam bu oldu: rapor `28-07` diyordu, çıktı
 * `2026-07-27` yazdı — ve sınır günü tespiti de o kaymayla yapılıyordu.
 *
 * _Saat dilimi hatası sessizdir: rakamlar makul görünür, yalnız yanlış
 * pencereye düşer._
 */
function tarihCoz(x: string): Date | null {
  const m = x.match(/^(\d{2})-(\d{2})-(\d{4})/);
  return m
    ? new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])))
    : null;
}
function gunEsit(a: Date, b: Date): boolean {
  return g(a) === g(b);
}

type RaporSatiri = {
  urun: string;
  barkod: string;
  bas: Date;
  bit: Date;
  adet: number;
  ciro: number;
  oran: number;
  kazanc: number;
  degisim: string;
};

async function raporuOku(yol: string): Promise<RaporSatiri[]> {
  const { bayt } = paketiNormalle(readFileSync(yol));
  const sayfalar = (await readXlsxFile(bayt)) as unknown as {
    sheet: string;
    data: unknown[][];
  }[];
  const d = sayfalar[0]?.data ?? [];
  const bas = (d[0] ?? []).map((x) => String(x ?? "").trim());
  const I = (ad: string) => bas.indexOf(ad);
  const iUrun = I("Ürün Adı"),
    iBar = I("Barkod"),
    iBas = I("Tarife Başlangıç Tarihi"),
    iBit = I("Tarife Bitiş Tarihi"),
    iAdet = I("Toplam Tarifeli Brüt Satış Adedi"),
    iCiro = I("Toplam Tarifeli Brüt Ciro"),
    iOran = I("Toplam Tarifeli Ortalama Komisyon Oranı"),
    iKaz = I("Toplam Tarifeli Komisyon TL Kazanç"),
    iDeg = I("Toplam Tarifeli Ortalama Komisyon Değişimi");

  /**
   * ⚠ EKSİK KOLON SESSİZ GEÇİLMEZ. Rapor biçimi değişirse denetim boş
   * döner ve "sapma yok" diye okunur — en tehlikeli yalancı yeşil.
   */
  const eksik = [
    ["Barkod", iBar],
    ["Tarife Başlangıç Tarihi", iBas],
    ["Tarife Bitiş Tarihi", iBit],
    ["Toplam Tarifeli Ortalama Komisyon Oranı", iOran],
  ].filter(([, i]) => (i as number) < 0);
  if (eksik.length > 0) {
    throw new Error(
      "RAPOR BİÇİMİ TANINMADI — eksik kolon: " +
        eksik.map(([a]) => a).join(", "),
    );
  }

  const satirlar: RaporSatiri[] = [];
  for (const r of d.slice(1)) {
    const barkod = String(r?.[iBar] ?? "").trim();
    const b1 = tarihCoz(String(r?.[iBas] ?? ""));
    const b2 = tarihCoz(String(r?.[iBit] ?? ""));
    const oran = Number(r?.[iOran] ?? NaN);
    if (!barkod || !b1 || !b2 || !Number.isFinite(oran)) continue;
    satirlar.push({
      urun: String(r?.[iUrun] ?? "").slice(0, 30),
      barkod,
      bas: b1,
      bit: b2,
      adet: Number(r?.[iAdet] ?? 0),
      ciro: Number(r?.[iCiro] ?? 0),
      oran,
      kazanc: Number(r?.[iKaz] ?? 0),
      degisim: String(r?.[iDeg] ?? ""),
    });
  }
  return satirlar;
}

async function main() {
  if (!dosyaArg) {
    console.log("");
    console.log("  ⛔ DOSYA VERİLMEDİ.");
    console.log('     npm run canli:oran-denetimi -- --dosya="C:/.../rapor.xlsx"');
    console.log("");
    process.exitCode = 1;
    return;
  }
  const yol = dosyaArg.slice("--dosya=".length);

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { karOnizle } = await import("../src/lib/kar-yeniden");

  const rapor = await raporuOku(yol);

  console.log("");
  console.log("K9 — KOMİSYON ORANI DENETİMİ");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        RAPOR — hiçbir şey yazılmaz, hüküm verilmez");
  console.log("  dosya      " + yol.split(/[\\/]/).pop());
  console.log("  satır      " + rapor.length);
  if (rapor.length > 0) {
    const bas = rapor.map((r) => r.bas).sort((a, b) => a.getTime() - b.getTime())[0]!;
    const bit = rapor.map((r) => r.bit).sort((a, b) => b.getTime() - a.getTime())[0]!;
    console.log("  pencereler " + g(bas) + " .. " + g(bit));
  }
  console.log("");

  const barkodlar = [...new Set(rapor.map((r) => r.barkod))];
  const kalemler = await prisma.saleItem.findMany({
    where: {
      sale: {
        iptalTarihi: null,
        channelAccount: { channel: { name: "Trendyol" } },
      },
      variant: { barcode: { in: barkodlar } },
    },
    select: {
      id: true,
      quantity: true,
      unitPriceAmount: true,
      commissionRate: true,
      net2Amount: true,
      sale: {
        select: {
          id: true,
          code: true,
          soldAt: true,
          cargoCarrierId: true,
          cargoDesi: true,
          cargoAmount: true,
          items: { select: { id: true, commissionRate: true } },
        },
      },
      variant: { select: { barcode: true, sku: true } },
    },
  });

  type Bulgu = {
    kod: string;
    urun: string;
    tarih: string;
    kayitli: number | null;
    gercek: number;
    ciro: number;
    net2Eski: number | null;
    net2Yeni: number | null;
    fark: number | null;
    degisim: string;
  };
  const sapan: Bulgu[] = [];
  const belirsiz: { kod: string; tarih: string; urun: string; not: string }[] = [];
  let eslesen = 0;
  let ayni = 0;

  /** Kapsam: rapordaki adet ile bizim bulduğumuz kalem sayısı. */
  const kapsam: { urun: string; pencere: string; raporAdet: number; bizde: number }[] =
    [];

  for (const r of rapor) {
    const bizimkiler = kalemler.filter((k) => {
      if (k.variant.barcode !== r.barkod) return false;
      const t = k.sale.soldAt;
      return t >= r.bas && t <= r.bit;
    });

    /**
     * ⚠ SINIR GÜNÜ AYRI TUTULUR. Pencereler bitişik ve `soldAt`ta saat yok;
     * tam sınıra düşen satış iki pencereden hangisine ait, veriden
     * çözülemez.
     */
    const kesin = bizimkiler.filter(
      (k) => !gunEsit(k.sale.soldAt, r.bas) && !gunEsit(k.sale.soldAt, r.bit),
    );
    for (const k of bizimkiler) {
      if (kesin.includes(k)) continue;
      belirsiz.push({
        kod: k.sale.code ?? "—",
        tarih: g(k.sale.soldAt),
        urun: r.urun,
        not: "pencere sınırı " + g(r.bas) + "/" + g(r.bit),
      });
    }

    kapsam.push({
      urun: r.urun,
      pencere: g(r.bas) + ".." + g(r.bit),
      raporAdet: r.adet,
      bizde: kesin.reduce((t, k) => t + k.quantity, 0),
    });

    for (const k of kesin) {
      eslesen++;
      const kayitli =
        k.commissionRate === null ? null : Number(k.commissionRate.toString());
      if (kayitli !== null && Math.abs(kayitli - r.oran) < 0.051) {
        ayni++;
        continue;
      }

      /**
       * ⚠ NET FARKI MOTORDAN. Rapordaki oranla `karOnizle` yeniden
       * çağrılıyor; kendi formülümüzü yazsaydık motor değiştiğinde eski
       * formülü savunurduk.
       */
      const yeni = await karOnizle({
        saleId: k.sale.id,
        kalemler: k.sale.items.map((i) => ({
          saleItemId: i.id,
          commissionRate:
            i.id === k.id
              ? r.oran
              : i.commissionRate === null
                ? null
                : Number(i.commissionRate.toString()),
          commissionAmount: null,
        })),
        cargoCarrierId: k.sale.cargoCarrierId,
        cargoDesi:
          k.sale.cargoDesi === null ? null : Number(k.sale.cargoDesi.toString()),
        cargoAmountManual: kdvDahilKargo(
          k.sale.cargoAmount === null
            ? null
            : Number(k.sale.cargoAmount.toString()),
        ),
      });

      const eski = yeni?.onceki.net2 ?? null;
      const yeniNet = yeni?.yeni.net2 ?? null;
      sapan.push({
        kod: k.sale.code ?? "—",
        urun: r.urun,
        tarih: g(k.sale.soldAt),
        kayitli,
        gercek: r.oran,
        ciro: Number(k.unitPriceAmount.toString()) * k.quantity,
        net2Eski: eski,
        net2Yeni: yeniNet,
        fark: eski !== null && yeniNet !== null ? yeniNet - eski : null,
        degisim: r.degisim,
      });
    }
  }

  console.log("EŞLEŞME");
  console.log("  rapor satırı        " + rapor.length);
  console.log("  eşleşen satış kalemi " + eslesen);
  console.log("    oranı TUTAN       " + ayni);
  console.log("    oranı SAPAN       " + sapan.length);
  console.log("  sınır günü (belirsiz) " + belirsiz.length);
  console.log("");

  if (sapan.length > 0) {
    console.log("SAPAN KAYITLAR");
    console.log(
      "  " +
        "satış".padEnd(14) +
        "tarih".padEnd(12) +
        "ürün".padEnd(26) +
        "kayıtlı".padStart(8) +
        "gerçek".padStart(8) +
        "NET-2 eski".padStart(12) +
        "NET-2 doğru".padStart(13) +
        "fark".padStart(11),
    );
    let toplam = 0;
    for (const s of sapan) {
      if (s.fark !== null) toplam += s.fark;
      console.log(
        "  " +
          s.kod.padEnd(14) +
          s.tarih.padEnd(12) +
          s.urun.padEnd(26) +
          ("%" + (s.kayitli ?? "—")).padStart(8) +
          ("%" + s.gercek).padStart(8) +
          p(s.net2Eski).padStart(12) +
          p(s.net2Yeni).padStart(13) +
          (s.fark === null ? "—" : (s.fark > 0 ? "+" : "") + p(s.fark)).padStart(11),
      );
    }
    console.log("");
    console.log(
      "  TOPLAM NET-2 FARKI: " +
        (toplam > 0 ? "+" : "") +
        p(toplam) +
        (toplam > 0
          ? "   (gerçek kâr GÖSTERİLENDEN YÜKSEK)"
          : "   (gerçek kâr gösterilenden düşük)"),
    );
    console.log("");
  }

  if (belirsiz.length > 0) {
    console.log("SINIR GÜNÜNE DÜŞEN — HÜKÜM VERİLMEDİ");
    console.log(
      "  ⚠ Tarife pencereleri 08:00→07:59 ile tanımlı; `soldAt`ta saat yok.",
    );
    console.log("    Bu satışların hangi pencereye ait olduğu VERİDEN çözülemez.");
    for (const b of belirsiz)
      console.log("    " + b.kod.padEnd(14) + b.tarih + "  " + b.urun + "  (" + b.not + ")");
    console.log("");
  }

  /**
   * ⚠ KAPSAM FARKI HATA DEĞİL (beşinci kapsam sorusu). Rapordaki adet
   * bizim kayıtlarımızdan fazlaysa, o fark ELLE GİRİŞ BOŞLUĞUDUR:
   * kanal sattığımızı söylüyor, bizde kaydı yok.
   */
  const bosluk = kapsam.filter((k) => k.raporAdet > k.bizde);
  console.log("KAPSAM — rapor ne diyor, bizde ne var");
  const raporToplam = kapsam.reduce((t, k) => t + k.raporAdet, 0);
  const bizdeToplam = kapsam.reduce((t, k) => t + k.bizde, 0);
  console.log("  rapordaki toplam adet " + raporToplam);
  console.log("  bizde eşleşen adet    " + bizdeToplam);
  console.log("  ⚠ FARK " + (raporToplam - bizdeToplam) + " adet — bu HATA DEĞİL,");
  console.log("    kapsam boşluğudur: kanal sattığımızı söylüyor, bizde kaydı yok.");
  if (bosluk.length > 0) {
    console.log("");
    for (const k of bosluk.slice(0, 15))
      console.log(
        "    " + k.urun.padEnd(30) + k.pencere + "  rapor " + k.raporAdet + "  bizde " + k.bizde,
      );
  }
  console.log("");
  console.log("  RAPOR KİPİ — hiçbir şey yazılmadı, düzeltme kararı AYRI verilir.");
  console.log("");

  await prisma.$disconnect();
}

main();
