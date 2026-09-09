import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * K195 — KANALIN BİLDİRDİĞİ KARGO/TESLİM BİLGİSİ KAÇ SATIŞA DOKUNUR?
 *      npm run canli:kargo-kapsam        (SALT OKUMA)
 * BETIK SINIFI: SUREKLI — hiçbir yere YAZMAZ.
 *
 * ⚠ Soru "yazalım mı" değil, "yazılacak şey KAÇ KAYITTA var" — şema
 * değişikliği önerilmeden önce kapsamın ölçülmesi şart.
 */
async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("⛔", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { kimlikOku, baslikKur, UCLAR, apiGet } = await import("./hb/istemci");

  console.log("\nK195 — KARGO/TESLİM KAPSAM ÖLÇÜMÜ · " + new Date().toISOString());
  console.log("=".repeat(70));

  const toplam = await prisma.sale.count();
  const kargoluDefter = await prisma.sale.count({ where: { NOT: { shippedAt: null } } });
  console.log(`\n① DEFTER: satış ${toplam} · shippedAt DOLU ${kargoluDefter} · BOŞ ${toplam - kargoluDefter}`);
  /**
   * TESLİM TARAFI (eklendi 09.09.2026, K195-2) — sütunlar açıldı ve
   * yazıcıları bağlandı; DOLDUKLARI ayrıca ölçülür. "Yazıcı var" ile
   * "yazıyor" farklı iddialardır.
   */
  const teslimli = await prisma.sale.count({ where: { NOT: { deliveredAt: null } } });
  const takipli = await prisma.sale.count({
    where: { NOT: { kargoTakipBaglantisi: null } },
  });
  const firmali = await prisma.sale.count({
    where: { NOT: { kanalKargoFirmasi: null } },
  });
  /**
   * ⛔ "DEFTER DEĞİŞMEZ" İDDİASI VERİDE DE ÖLÇÜLÜR (K197-4). Bekçi KAYNAĞI
   * ölçüyor (içe aktarma `cargoAmount`a dokunmuyor); bu satırlar VERİYİ
   * ölçüyor. İkisi ayrı sorudur ve ikisi de sorulur.
   */
  const kanalDesili = await prisma.sale.count({
    where: { NOT: { kanalKargoDesi: null } },
  });
  const kargoTutarli = await prisma.sale.count({
    where: { iptalTarihi: null, NOT: { cargoAmount: null } },
  });
  const bizimDesili = await prisma.sale.count({
    where: { iptalTarihi: null, NOT: { cargoDesi: null } },
  });
  console.log(
    "   DESİ: kanalın TARTTIĞI " + kanalDesili +
      " · bizim TAHMİNİMİZ " + bizimDesili +
      " · kargo TUTARI dolu " + kargoTutarli,
  );
  /**
   * ⛔ TESLİM KUTUSUNUN KAPI ÖLÇÜMÜ (Halil şartı 09.09.2026).
   * "YOLDA" kutusu `shippedAt dolu + deliveredAt boş` diye sayılırsa,
   * mekanizmadan ÖNCE kargolanmış ve çoktan TESLİM EDİLMİŞ siparişler de
   * "yolda" görünür — kutu geçmiş boşluğuyla ŞİŞER. Ayrım tarih eşiği:
   * `deliveredAt` 09.09.2026'da doğdu.
   */
  const MEKANIZMA = new Date(Date.UTC(2026, 8, 9));
  const yoldaHam = await prisma.sale.count({
    where: { iptalTarihi: null, NOT: { shippedAt: null }, deliveredAt: null },
  });
  const yoldaGercek = await prisma.sale.count({
    where: {
      iptalTarihi: null,
      deliveredAt: null,
      shippedAt: { gte: MEKANIZMA },
    },
  });
  const bilinmiyor = await prisma.sale.count({
    where: {
      iptalTarihi: null,
      deliveredAt: null,
      shippedAt: { lt: MEKANIZMA },
    },
  });
  /**
   * ⛔ TARİFE TABANI (K200 kapı ölçümü): N11 kargo maliyeti "6 firma
   * ORTALAMASI" ile hesaplanacak. Önce sorulur: o tablo elimizde VAR MI,
   * hangi firmalar ve hangi desi aralığı? Yoksa hesap kurulmaz —
   * uydurulmuş bir tarife, uydurulmuş bir maliyet demektir.
   */
  const tarifeler = await prisma.cargoTariff.findMany({
    select: { carrierId: true, desi: true, channelId: true },
  });
  const firmalar = new Map<string, { min: number; max: number; n: number }>();
  for (const t of tarifeler) {
    const v = firmalar.get(t.carrierId) ?? { min: t.desi, max: t.desi, n: 0 };
    v.min = Math.min(v.min, t.desi);
    v.max = Math.max(v.max, t.desi);
    v.n += 1;
    firmalar.set(t.carrierId, v);
  }
  const adlar = await prisma.cargoCarrier.findMany({ select: { id: true, name: true } });
  const adEsle = new Map(adlar.map((a) => [a.id, a.name]));
  console.log("");
  console.log("④ TARİFE TABANI (N11 maliyet hesabının ön şartı)");
  console.log("   firma sayısı " + firmalar.size + " · toplam satır " + tarifeler.length);
  for (const [id, v] of firmalar) {
    console.log(
      "   " + (adEsle.get(id) ?? id).padEnd(24) + " desi " +
        String(v.min).padStart(2) + "-" + String(v.max).padStart(2) +
        " · satır " + v.n,
    );
  }
  /**
   * ⛔ HALİL'İN VERDİĞİ VERİ NOKTASIYLA ÇAPRAZ: "Aras desi 1 → 85,38 (KDV
   * hariç) → 102,46 (KDV dahil)". Tutuyorsa elimizdeki tablo ONUN baktığı
   * tarifedir; tutmuyorsa üstüne hesap KURULMAZ.
   * _(Anayasa: "dış kaynağın kendi etiketiyle karşılaştır — iç tutarlılık
   * kaymayı gizler".)_
   */
  const kanalKayitlari = await prisma.channel.findMany({ select: { id: true, name: true } });
  const kanalAdi = new Map(kanalKayitlari.map((k) => [k.id, k.name]));
  const arasId = adlar.find((a) => /aras/i.test(a.name))?.id ?? null;
  if (arasId !== null) {
    const d1 = await prisma.cargoTariff.findMany({
      where: { carrierId: arasId, desi: 1 },
      select: { amount: true, channelId: true, effectiveFrom: true },
      orderBy: { effectiveFrom: "desc" },
    });
    console.log("   ÇAPRAZ — Aras desi 1 (Halil: 85,38 → KDV dahil 102,46):");
    for (const t of d1.slice(0, 4)) {
      const h = Number(t.amount);
      console.log(
        "      ₺" + h.toFixed(2) + " · KDV dahil ₺" + (h * 1.2).toFixed(2) +
          " · kanal " + (kanalAdi.get(t.channelId) ?? t.channelId) +
          " · geçerli " + t.effectiveFrom.toISOString().slice(0, 10) +
          (Math.abs(h - 85.38) < 0.01 ? "   ✓ HALİL'İN RAKAMI" : ""),
      );
    }
  }
  /**
   * ⛔ KAYNAK SIRASI — N11 TARİFESİ YOKKEN İKİNCİ BASAMAK SORULUR.
   * Halil: "N11 tarifeleriyle ilgili resmî bir veri alamadım." Anayasa:
   *   ① kanalın kendi belgesi  ② KENDİ DEFTERİMİZ  ③ dış hesaplayıcı
   * ①  yok. ③'e (TY/HB ortalaması) atlamadan ÖNCE ② ölçülür: N11
   * satışlarımızın FİİLEN ödenmiş kargosu defterde var mı?
   */
  const n11Hesaplar = await prisma.channelAccount.findMany({
    where: { channel: { name: { contains: "11" } } },
    select: { id: true, channel: { select: { name: true } } },
  });
  const n11Idler = n11Hesaplar.map((h) => h.id);
  console.log("");
  console.log("⑤ N11 KENDİ DEFTERİMİZDE NE BİLİYOR (kaynak sırası ② )");
  console.log("   N11 hesabı " + n11Idler.length);
  if (n11Idler.length > 0) {
    const n11Toplam = await prisma.sale.count({
      where: { channelAccountId: { in: n11Idler }, iptalTarihi: null },
    });
    const n11Kargolu = await prisma.sale.count({
      where: {
        channelAccountId: { in: n11Idler },
        iptalTarihi: null,
        NOT: { cargoAmount: null },
      },
    });
    const n11Desili = await prisma.sale.count({
      where: {
        channelAccountId: { in: n11Idler },
        iptalTarihi: null,
        NOT: { cargoDesi: null },
      },
    });
    console.log(
      "   satış " + n11Toplam +
        " · kargo TUTARI dolu " + n11Kargolu +
        " · desi dolu " + n11Desili,
    );
    /** Hem tutarı hem desisi olan satır: efektif tarife BURADAN türer. */
    const ikisi = await prisma.sale.findMany({
      where: {
        channelAccountId: { in: n11Idler },
        iptalTarihi: null,
        NOT: { cargoAmount: null, cargoDesi: null },
      },
      select: { cargoDesi: true, cargoAmount: true },
      take: 200,
    });
    const cift = ikisi.filter((s) => s.cargoDesi !== null && s.cargoAmount !== null);
    console.log("   hem TUTAR hem DESİ olan satır: " + cift.length);
    if (cift.length > 0) {
      for (const s of cift.slice(0, 8)) {
        const d = Number(s.cargoDesi);
        const a = Number(s.cargoAmount);
        console.log(
          "      desi " + d.toFixed(0).padStart(3) +
            " → ₺" + a.toFixed(2).padStart(9) +
            "  (birim ₺" + (d > 0 ? (a / d).toFixed(2) : "—") + ")",
        );
      }
      /**
       * ⛔ ÇAPRAZ — KANALIN YAYIMLADIĞI TARİFE, BİZİM FİİLEN ÖDEDİĞİMİZLE
       * TUTUYOR MU? Tarife kanalın kendi belgesi (1. basamak), ödeme bizim
       * defterimiz (2. basamak). İkisi ÇELİŞİYORSA üstteki kazanır ama
       * alttakinin niye düştüğü YAZILIR — sessizce geçilmez.
       * _(Anayasa: "kaynak önceliği" + "bağımsızlık kaynağın ayrılığıyla".)_
       */
      const { n11OrtalamaTarife } = await import("../src/lib/n11-kargo-tarifesi");
      console.log("   ÇAPRAZ — 6 firma ORTALAMASI ↔ fiilen ödediğimiz:");
      let sapmaToplam = 0;
      let sapmaAdet = 0;
      for (const s of cift) {
        const d = Math.ceil(Number(s.cargoDesi) - 0.0001);
        const ort = n11OrtalamaTarife(d);
        const odenen = Number(s.cargoAmount);
        if (ort === null) {
          console.log("      desi " + d + " → tarife TAVAN DIŞI, hüküm yok");
          continue;
        }
        const oran = ort / odenen;
        sapmaToplam += oran;
        sapmaAdet += 1;
        console.log(
          "      desi " + String(d).padStart(2) +
            " · ödenen ₺" + odenen.toFixed(2).padStart(8) +
            " · tarife ort ₺" + ort.toFixed(2).padStart(8) +
            " · oran " + oran.toFixed(3),
        );
      }
      if (sapmaAdet > 0) {
        const ortOran = sapmaToplam / sapmaAdet;
        console.log(
          "      ORTALAMA ORAN " + ortOran.toFixed(3) +
            (ortOran > 1.02
              ? "  ← tarife ödediğimizden YÜKSEK · NET karamsar çıkar"
              : ortOran < 0.98
                ? "  ← tarife ödediğimizden DÜŞÜK · NET iyimser çıkar"
                : "  ← tutuyor"),
        );
      }
    } else {
      console.log("   ⛔ ② BASAMAĞI DA BOŞ — efektif tarife defterden türetilemiyor.");
    }
  }
  /**
   * ⛔ DESİ ÖĞRENME TABANI (K201 kapı ölçümü). N11 desi VERMİYOR; mimar
   * kararı: "ürün TY/HB'de tartılmışsa o desi, yoksa ORTALAMA desi — ölç,
   * varsayma." Bu blok o ortalamayı ve öğrenmenin KAPSAMINI ölçer.
   */
  const tartilanlar = await prisma.sale.findMany({
    where: { iptalTarihi: null, NOT: { kanalKargoDesi: null } },
    select: { kanalKargoDesi: true, items: { select: { variantId: true } } },
  });
  const desiler = tartilanlar
    .map((s) => Number(s.kanalKargoDesi))
    .filter((d) => Number.isFinite(d) && d > 0)
    .sort((a, b) => a - b);
  console.log("");
  console.log("⑥ DESİ ÖĞRENME TABANI (N11 tahmininin girdisi)");
  if (desiler.length === 0) {
    console.log("   ⛔ TARTILAN SATIŞ YOK — ortalama HESAPLANAMAZ (sıfır değil, YOK).");
  } else {
    const orta = desiler[Math.floor(desiler.length / 2)];
    const ort = desiler.reduce((t, x) => t + x, 0) / desiler.length;
    console.log(
      "   tartılan satış " + desiler.length +
        " · min " + desiler[0] +
        " · ortanca " + orta +
        " · ORTALAMA " + ort.toFixed(2) +
        " · max " + desiler[desiler.length - 1],
    );
    /**
     * ⚠ ORTALAMA mı ORTANCA mı — SEÇİM SONUCU DEĞİŞTİRİR ve bu ölçülür.
     * Kuyruklu bir dağılımda ortalama yukarı kaçar; ekrana basılacak rakam
     * veriyi değil BENİM SEÇİMİMİ söylerdi. İkisi de basılıyor.
     */
    console.log(
      "   ⚠ ortalama/ortanca oranı " + (ort / orta).toFixed(3) +
        (Math.abs(ort / orta - 1) > 0.15
          ? "  ← DAĞILIM KUYRUKLU, seçim sonucu değiştirir"
          : "  ← ikisi yakın, seçim kritik değil"),
    );
    /** Varyant başına öğrenme: N11 ürünlerinin kaçı TY/HB'de tartılmış? */
    const tartilanVaryant = new Set<string>();
    for (const s of tartilanlar) for (const k of s.items) tartilanVaryant.add(k.variantId);
    if (n11Idler.length > 0) {
      const n11Kalemler = await prisma.saleItem.findMany({
        where: { sale: { channelAccountId: { in: n11Idler }, iptalTarihi: null } },
        select: { variantId: true, saleId: true },
      });
      const n11Satis = new Map<string, boolean>();
      for (const k of n11Kalemler) {
        const onceki = n11Satis.get(k.saleId) ?? false;
        n11Satis.set(k.saleId, onceki || tartilanVaryant.has(k.variantId));
      }
      const eslesen = [...n11Satis.values()].filter(Boolean).length;
      console.log(
        "   N11 satışının ÜRÜNÜ tartılmış olan: " + eslesen + "/" + n11Satis.size +
          "  → gerisi ORTALAMAYA düşer",
      );
    }
  }
  const kanallar = new Set(tarifeler.map((t) => t.channelId));
  console.log("   kanal sayısı " + kanallar.size + " (tarife kanal bazında tutuluyor)");
  console.log("");
  console.log(
    "   KUTU KAPISI: ham 'yolda' " + yoldaHam +
      "  =  gerçekten yolda " + yoldaGercek +
      "  +  teslim durumu BİLİNMİYOR " + bilinmiyor,
  );
  console.log(
    "   TESLİM TARAFI: deliveredAt " + teslimli +
      " · takip bağlantısı " + takipli +
      " · kanal kargo firması " + firmali,
  );

  const k = kimlikOku();
  if (!k) { console.log("⛔ HB kimlikleri yok"); await prisma.$disconnect(); return; }
  const baslik = baslikKur(k);

  /** Kanalın bildirdiği kümeler — sayfalanarak. */
  async function topla(
    uc: (o: number, l: number) => string,
    tarihAlani: string,
  ): Promise<Map<string, string>> {
    const harita = new Map<string, string>();
    for (let sayfa = 0; sayfa < 40; sayfa++) {
      const s = await apiGet(uc(sayfa * 100, 100), baslik);
      if (s.tur !== "VERI") break;
      const g = s.govde as Record<string, unknown>;
      const liste = (g.items ?? g.Items ?? g.content ?? g) as unknown;
      if (!Array.isArray(liste) || liste.length === 0) break;
      for (const p of liste as Record<string, unknown>[]) {
        const no = (p.OrderNumber ?? p.orderNumber) as string | undefined;
        const tarih = p[tarihAlani] as string | undefined;
        if (typeof no === "string" && typeof tarih === "string" && !harita.has(no)) {
          harita.set(no, tarih);
        }
      }
      if (liste.length < 100) break;
    }
    return harita;
  }

  const kargoda = await topla((o, l) => UCLAR.paketlerGonderilen(k, o, l), "ShippedDate");
  const teslim = await topla((o, l) => UCLAR.paketlerTeslim(k, o, l), "DeliveredDate");
  console.log(`\n② KANAL (HB): kargoda ${kargoda.size} · teslim ${teslim.size} sipariş`);

  /** Bunların kaçı defterde var, kaçının shippedAt'i BOŞ? */
  for (const [ad, harita] of [["KARGODA", kargoda], ["TESLİM", teslim]] as const) {
    const nolar = [...harita.keys()];
    const satislar = await prisma.sale.findMany({
      where: { code: { in: nolar } },
      select: { code: true, shippedAt: true },
    });
    const bulunan = satislar.length;
    const bosOlan = satislar.filter((s) => s.shippedAt === null).length;
    console.log(
      `   ${ad.padEnd(8)} kanal ${String(harita.size).padStart(4)} · defterde ${String(bulunan).padStart(4)} · shippedAt BOŞ ${String(bosOlan).padStart(4)}`,
    );
    if (harita.size > bulunan) {
      console.log(`      ⚠ defterde OLMAYAN ${harita.size - bulunan} sipariş — ayrı bir kaçak sorusu`);
    }
  }

  /** Örnek bir tarih biçimi — ayrıştırılabilir mi (değer DEĞİL, biçim). */
  const ornek = [...kargoda.values()][0];
  if (ornek) {
    const d = new Date(ornek);
    console.log(
      `\n③ TARİH BİÇİMİ: "${ornek}" → ${Number.isNaN(d.getTime()) ? "⛔ AYRIŞTIRILAMADI" : "✓ ayrıştırıldı (" + d.toISOString() + ")"}`,
    );
  }

  await prisma.$disconnect();
}
main();
