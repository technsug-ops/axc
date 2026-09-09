import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K197-② — KARGO MALİYETİ BUGÜN NEREDEN GELİYOR, GEÇMİŞE NE KADAR UZANIYOR?
 * ----------------------------------------------------------------------------
 *      npm run canli:kargo-kaynak            (SALT OKUMA)
 *
 *  BETIK SINIFI: SUREKLI — hiçbir yere YAZMAZ.
 *
 *  ⛔ NİYE: Halil _"bunları reel hâle getirip 1 Ağustos 2025'ten itibaren
 *  düzeltsek"_ dedi. Bu bir TOPLU YAZIM talebidir ve para taşır. Anayasa
 *  gereği önce KAPSAM ölçülür — cevaplanmamış bir kapsam sorusunun üstüne
 *  yazım kurulmaz:
 *
 *    ① O dönemin gerçek verisi kanaldan HÂLÂ alınabiliyor mu?
 *       (Alınamıyorsa "düzeltelim" teknik olarak imkânsızdır ve bunu
 *        denemeden söylemek tahmin olur.)
 *    ② Defterdeki kargo tutarı bugün zaten NEREDEN geliyor ve hangi
 *       dönemi kapsıyor?
 *    ③ Kanalın kendi ödeme kaydında (hakediş) kargo satırı var mı —
 *       ve o, kanalın API'sinden DAHA GERİYE uzanıyor mu?
 *
 *  ⚠ KAYNAK ÖNCELİĞİ BURADA BELİRLEYİCİ: ödediğimiz parayı söyleyen şey
 *  desi değil, kanalın/taşıyıcının KESTİĞİ tutardır. Desi bir GİRDİ,
 *  kesinti bir SONUÇTUR — ve "para söz konusuysa sonuç kazanır".
 * ============================================================================
 */

function say(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("⛔", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  try {
    console.log("");
    console.log("K197-② — KARGO KAYNAĞI ve GEÇMİŞ KAPSAMI · " + new Date().toISOString());
    console.log("=".repeat(74));

    /* ═══ ① KANAL API'Sİ GEÇMİŞE UZANIYOR MU ═══════════════════════════ */
    console.log("");
    console.log("① TY SİPARİŞ UCU — GEÇMİŞ PENCERELERİ SINANIYOR");
    console.log("   (soru: 2025-08 verisi HÂLÂ alınabiliyor mu — denenmeden bilinmez)");
    {
      const { kimlikOku, baslikKur, UCLAR, apiGet } = await import("./ty/istemci");
      const k = kimlikOku();
      if (!k) {
        console.log("   ⛔ TY kimlikleri okunamadı — ÖLÇÜLEMEDİ (temiz değil)");
      } else {
        const pencereler: [string, string, string][] = [
          ["2025-08-01", "2025-08-01", "2025-08-08"],
          ["2025-11-01", "2025-11-01", "2025-11-08"],
          ["2026-03-01", "2026-03-01", "2026-03-08"],
          ["2026-07-01", "2026-07-01", "2026-07-08"],
          ["2026-09-01", "2026-09-01", "2026-09-08"],
        ];
        for (const [ad, b, s] of pencereler) {
          const bas = Date.parse(b + "T00:00:00Z");
          const bit = Date.parse(s + "T00:00:00Z");
          const c = await apiGet(UCLAR.siparisler(k.saticiId, bas, bit, 0, 200), baslikKur(k));
          if (c.tur !== "VERI") {
            console.log("   " + ad + "  ⛔ " + c.tur);
            continue;
          }
          const g = c.govde as { content?: Record<string, unknown>[]; totalElements?: number };
          const liste = g.content ?? [];
          const desili = liste.filter((p) => typeof p.cargoDeci === "number" && p.cargoDeci > 0);
          console.log(
            "   " + ad + "  kayıt " + String(liste.length).padStart(4) +
              " · beyan toplam " + String(g.totalElements ?? "?").padStart(5) +
              " · cargoDeci DOLU " + String(desili.length).padStart(4),
          );
        }
        console.log("   ⚠ 'kayıt 0' iki şey olabilir: o hafta satış YOKTU, ya da uç");
        console.log("      o kadar geriye BAKMIYOR. Ayrımı defterdeki satış sayısı verir (③).");
      }
    }

    /* ═══ ② HB — GEÇMİŞ VERİYOR MU ═════════════════════════════════════ */
    console.log("");
    console.log("② HB PAKET UCU — GEÇMİŞ SORGUSU YOK");
    {
      const { kimlikOku, baslikKur, UCLAR, tumKayitlar } = await import("./hb/istemci");
      const k = kimlikOku();
      if (!k) {
        console.log("   ⛔ HB kimlikleri okunamadı");
      } else {
        const s = await tumKayitlar((o, l) => UCLAR.paketlerGonderilen(k, o, l), baslikKur(k), 100);
        const n = s.tur === "TAMAM" ? s.kayitlar.length : -1;
        console.log(
          "   /shipped ŞU AN kargoda olan paketleri veriyor: " + (n < 0 ? "OKUNAMADI" : n),
        );
        console.log("   ⛔ Tarih parametresi YOK — teslim edilmiş geçmiş paket bu uçtan");
        console.log("      geri ÇAĞRILAMAZ. HB için geçmiş desi/ücret bu yoldan ALINAMAZ.");
      }
    }

    /* ═══ ③ DEFTER — AYLIK KAPSAM ══════════════════════════════════════ */
    console.log("");
    console.log("③ DEFTERDE KARGO KAPSAMI (01.08.2025 →, iptal HARİÇ)");
    const bas2025 = new Date(Date.UTC(2025, 7, 1));
    const satislar = await prisma.sale.findMany({
      where: { iptalTarihi: null, soldAt: { gte: bas2025 } },
      select: { soldAt: true, cargoAmount: true, cargoDesi: true },
    });
    const aylar = new Map<string, { n: number; tutar: number; desi: number }>();
    for (const s of satislar) {
      const ay = s.soldAt.toISOString().slice(0, 7);
      const v = aylar.get(ay) ?? { n: 0, tutar: 0, desi: 0 };
      v.n += 1;
      if (s.cargoAmount !== null) v.tutar += 1;
      if (s.cargoDesi !== null) v.desi += 1;
      aylar.set(ay, v);
    }
    console.log("   ay        satış   tutar DOLU   desi DOLU");
    for (const ay of [...aylar.keys()].sort()) {
      const v = aylar.get(ay)!;
      console.log(
        "   " +
          ay +
          String(v.n).padStart(8) +
          String(v.tutar).padStart(13) +
          String(v.desi).padStart(12),
      );
    }

    /* ═══ ④ HAKEDİŞ — KANALIN KENDİ KESİNTİ KAYDI ══════════════════════ */
    /**
     * ⚠ EN GÜÇLÜ KAYNAK BURASI OLABİLİR: hakediş, kanalın FİİLEN kestiği
     * tutardır — desi bir girdi, kesinti bir SONUÇ. Ve hakediş DOSYADAN
     * geliyor, API penceresine bağlı değil; yani API'nin ulaşamadığı
     * geçmişe ulaşabilir.
     */
    console.log("");
    console.log("④ HAKEDİŞTE KARGO SATIRI VAR MI (kanalın kendi kesintisi)");
    const kalemler = await prisma.settlementItem.groupBy({
      by: ["code"],
      _count: { _all: true },
      _sum: { amount: true },
    });
    const kargoluKodlar = kalemler.filter((k) =>
      /kargo|cargo|gonderi|gönderi|tesli/i.test(k.code),
    );
    if (kargoluKodlar.length === 0) {
      console.log("   kargo geçen kalem kodu: YOK");
      console.log("   ⚠ 'yok' burada hüküm DEĞİL — kod adları başka olabilir.");
      console.log("   Kalem kodlarının tamamı (adet çoktan aza):");
      for (const k of [...kalemler].sort((a, b) => b._count._all - a._count._all).slice(0, 15)) {
        console.log(
          "      " + k.code.padEnd(34) + String(k._count._all).padStart(6) +
            "  Σ ₺" + say(Number(k._sum.amount ?? 0)),
        );
      }
    } else {
      for (const k of kargoluKodlar) {
        const ilk = await prisma.settlementItem.findFirst({
          where: { code: k.code },
          orderBy: { dueDate: "asc" },
          select: { dueDate: true },
        });
        const son = await prisma.settlementItem.findFirst({
          where: { code: k.code },
          orderBy: { dueDate: "desc" },
          select: { dueDate: true },
        });
        const bagli = await prisma.settlementItem.count({
          where: { code: k.code, NOT: { saleId: null } },
        });
        console.log(
          "   " + k.code.padEnd(30) + " adet " + String(k._count._all).padStart(5) +
            " · Σ ₺" + say(Number(k._sum.amount ?? 0)) +
            " · satışa BAĞLI " + bagli,
        );
        console.log(
          "      dönem " +
            (ilk?.dueDate?.toISOString().slice(0, 10) ?? "?") +
            " → " +
            (son?.dueDate?.toISOString().slice(0, 10) ?? "?"),
        );
      }
    }

    /* ═══ ⑤ ÇAPRAZ: DEFTERDEKİ KARGO ile KANALIN KESTİĞİ ═══════════════ */
    /**
     * ⛔ ASIL SORU BU: defterdeki `cargoAmount` Halil'in KENDİ dosyasından
     * geldi (28.08 toplu yazımı, R sütunu). O dosya doğru olabilir ama
     * kendi kendini doğrulayamaz. Kanalın hakedişteki KARGO kesintisi
     * BAĞIMSIZ kaynaktır — kaynak önceliğinde 1. basamak.
     * _(Anayasa: "bağımsızlık KAYNAĞIN ayrılığıyla ölçülür".)_
     *
     * ⚠ TABAN: `Sale.cargoAmount` KDV HARİÇ saklanıyor; hakediş kesintisi
     * KDV DAHİL olabilir. Bu yüzden İKİ oran birden basılıyor — hangisinin
     * tuttuğu ölçümle görülür, varsayılmaz.
     */
    console.log("");
    console.log("⑤ ÇAPRAZ — defterdeki kargo ile kanalın KESTİĞİ kargo");
    const kargoKalem = await prisma.settlementItem.findMany({
      where: { code: "KARGO", NOT: { saleId: null } },
      select: { saleId: true, amount: true },
    });
    const kanalKargo = new Map<string, number>();
    for (const k of kargoKalem) {
      const id = k.saleId!;
      kanalKargo.set(id, (kanalKargo.get(id) ?? 0) + Math.abs(Number(k.amount)));
    }
    const ilgili = await prisma.sale.findMany({
      where: { id: { in: [...kanalKargo.keys()] } },
      select: { id: true, code: true, cargoAmount: true },
    });
    let tutanHaric = 0;
    let tutanDahil = 0;
    let sapan = 0;
    let defterBos = 0;
    let sDefter = 0;
    let sKanal = 0;
    const sapanlar: string[] = [];
    for (const s of ilgili) {
      const kanal = kanalKargo.get(s.id)!;
      if (s.cargoAmount === null) {
        defterBos++;
        continue;
      }
      const defter = Number(s.cargoAmount);
      sDefter += defter;
      sKanal += kanal;
      if (Math.abs(defter - kanal) < 0.01) tutanHaric++;
      else if (Math.abs(defter * 1.2 - kanal) < 0.01) tutanDahil++;
      else {
        sapan++;
        if (sapanlar.length < 8) {
          sapanlar.push(
            "      " + (s.code ?? "").padEnd(13) +
              " defter ₺" + say(defter).padStart(9) +
              " · kanal ₺" + say(kanal).padStart(9) +
              " · oran " + (defter > 0 ? (kanal / defter).toFixed(3) : "—"),
          );
        }
      }
    }
    console.log("   incelenen satış               " + ilgili.length);
    console.log("   TUTAN (aynı taban, kuruşuna)  " + tutanHaric);
    console.log("   TUTAN (kanal KDV DAHİL ×1,20) " + tutanDahil);
    console.log("   SAPAN                         " + sapan);
    console.log("   defterde kargo BOŞ            " + defterBos);
    console.log("   Σ defter ₺" + say(sDefter) + "  ·  Σ kanal ₺" + say(sKanal));
    if (sapanlar.length > 0) {
      console.log("   en sapanlar (kimlikle):");
      for (const x of sapanlar) console.log(x);
    }

  } finally {
    /** ⛔ K189: `$disconnect` yoksa görev "Running"de asılı kalır. */
    await prisma.$disconnect();
  }
}
main();
