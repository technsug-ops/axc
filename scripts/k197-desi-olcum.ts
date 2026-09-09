import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K197 — TAHMİN EDİLEN DESİ ile GERÇEKLEŞEN DESİ ARASINDAKİ FARK (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:desi-olcum
 *
 *  BETIK SINIFI: SUREKLI — hiçbir yere YAZMAZ.
 *
 *  ⛔ NİYE: Halil bir siparişte farkı gördü (TY `5 desi` · defterimiz `7 desi`,
 *  sipariş 11585155315). Tek vaka bir HÜKÜM değildir — yön de büyüklük de
 *  ölçülmeden "optimize" konuşulmaz. _(Anayasa: "yönü doğrulanmış bir bulgunun
 *  büyüklüğü AYRICA doğrulanır".)_
 *
 *  ⭐ VE KANAL BUNU ZATEN SÖYLÜYOR — K195'in aynısı:
 *      TY  paket ucunda `cargoDeci`  (ölçüldü 09.09: 30/50 — kargolanmış pakette)
 *      HB  `/shipped` ucunda `Deci`
 *  Yani veri elimizde ve okunmuyor. Bu betik onu okuyup DEFTERLE kıyaslar.
 *
 *  ═══ ÖLÇÜM DÖRT SAYIYI AYRI TUTAR (denetim kuralı) ═══════════════════════
 *    incelenen · tutan · sapan · İNCELENEMEYEN (ve NEDEN)
 *  "Fark 0" ile "bakamadım" aynı ekrana yazılmaz.
 *
 *  ⚠ TAM DESİ VARSAYIMI BEYAN EDİLİR VE ÖLÇÜLÜR: `CargoTariff.desi` bir
 *  tam sayı ve tarife 1'er adım ilerliyor. Kesirli bir desinin hangi adıma
 *  yuvarlandığı BİZİM varsayımımız (yukarı) — bu yüzden betik defterdeki
 *  MEVCUT `cargoAmount`ı aynı varsayımla yeniden kurmayı dener ve tutma
 *  oranını basar. Tutmuyorsa varsayım yanlıştır ve para rakamı KULLANILMAZ.
 * ============================================================================
 */

type Satir = {
  kod: string;
  kanal: string;
  bizim: number;
  kanalDesi: number;
  fark: number;
  carrierId: string | null;
  channelId: string;
  soldAt: Date;
  kayitliTutar: number | null;
};

function yuzdelik(dizi: number[], p: number): number {
  if (dizi.length === 0) return NaN;
  const s = [...dizi].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[i];
}

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
    console.log("K197 — DESİ FARKI ÖLÇÜMÜ · " + new Date().toISOString());
    console.log("=".repeat(72));

    /** Kanalın bildirdiği desi: sipariş no -> desi. */
    const kanalDesi = new Map<string, { desi: number; kanal: string }>();
    const okunamayan: string[] = [];

    /* ═══ TY ═══════════════════════════════════════════════════════════ */
    {
      const { kimlikOku, baslikKur, UCLAR, apiGet } = await import("./ty/istemci");
      const k = kimlikOku();
      if (!k) {
        okunamayan.push("TY kimlikleri okunamadı");
      } else {
        const bit = Date.now();
        const bas = bit - 30 * 24 * 60 * 60 * 1000;
        let sayfa = 0;
        let toplam = 0;
        for (;;) {
          const s = await apiGet(UCLAR.siparisler(k.saticiId, bas, bit, sayfa, 200), baslikKur(k));
          if (s.tur !== "VERI") {
            okunamayan.push("TY sayfa " + sayfa + " — " + s.tur);
            break;
          }
          const g = s.govde as { content?: Record<string, unknown>[]; totalPages?: number };
          const liste = g.content ?? [];
          for (const p of liste) {
            const no = typeof p.orderNumber === "string" ? p.orderNumber : null;
            const d = p.cargoDeci;
            if (no && typeof d === "number" && Number.isFinite(d) && d > 0) {
              /** ⚠ EN BÜYÜK kazanır: bölünmüş sipariş iki paketse defterdeki
               *  tek `cargoDesi` alanı tek pakete karşılık gelir; toplamak
               *  yanlış olurdu, ama küçüğü almak da. Bugün bölünmüş sipariş
               *  7953'te 1 (ölçüldü 09.09) — bu seçim neredeyse hiç devrede
               *  değil ve devreye girdiğinde AYRI SAYILIR (aşağıda). */
              const v = kanalDesi.get(no);
              if (!v || d > v.desi) kanalDesi.set(no, { desi: d, kanal: "TY" });
            }
          }
          toplam += liste.length;
          sayfa += 1;
          if (sayfa >= (g.totalPages ?? 1) || liste.length === 0) break;
        }
        console.log("\n① TY paket okundu: " + toplam + " · desisi olan sipariş: " + kanalDesi.size);
      }
    }

    /* ═══ HB ═══════════════════════════════════════════════════════════ */
    {
      const { kimlikOku, baslikKur, UCLAR, tumKayitlar } = await import("./hb/istemci");
      const k = kimlikOku();
      if (!k) {
        okunamayan.push("HB kimlikleri okunamadı");
      } else {
        const oncesi = kanalDesi.size;
        const s = await tumKayitlar((o, l) => UCLAR.paketlerGonderilen(k, o, l), baslikKur(k), 100);
        if (s.tur !== "TAMAM") {
          okunamayan.push("HB kargodaki paketler — " + s.tur);
        } else {
          for (const p of s.kayitlar as Record<string, unknown>[]) {
            const no =
              typeof p.OrderNumber === "string"
                ? p.OrderNumber
                : typeof p.orderNumber === "string"
                  ? p.orderNumber
                  : null;
            const ham = p.Deci ?? p.deci;
            const d = typeof ham === "number" ? ham : Number(ham);
            if (no && Number.isFinite(d) && d > 0) {
              const v = kanalDesi.get(no);
              if (!v || d > v.desi) kanalDesi.set(no, { desi: d, kanal: "HB" });
            }
          }
          console.log(
            "② HB kargodaki paket: " +
              s.kayitlar.length +
              " · desi eklenen sipariş: " +
              (kanalDesi.size - oncesi),
          );
        }
      }
    }

    if (kanalDesi.size === 0) {
      console.log("\n⛔ KANALDAN HİÇ DESİ OKUNAMADI — ölçüm YAPILAMADI (temiz DEĞİL).");
      for (const o of okunamayan) console.log("   " + o);
      process.exitCode = 1;
      return;
    }

    /* ═══ DEFTERLE KIYAS ═══════════════════════════════════════════════ */
    const satislar = await prisma.sale.findMany({
      where: { code: { in: [...kanalDesi.keys()] }, iptalTarihi: null },
      select: {
        code: true,
        cargoDesi: true,
        cargoCarrierId: true,
        cargoAmount: true,
        soldAt: true,
        paketSayisi: true,
        channelAccount: { select: { channelId: true } },
      },
    });

    const satirlar: Satir[] = [];
    let defterdeYok = 0;
    let desisiBos = 0;
    let bolunmus = 0;
    const bilinen = new Set(satislar.map((s) => s.code ?? ""));
    for (const n of kanalDesi.keys()) if (!bilinen.has(n)) defterdeYok++;

    for (const s of satislar) {
      const kd = kanalDesi.get(s.code ?? "");
      if (!kd) continue;
      if (s.paketSayisi > 1) {
        /** ⚠ AYRI SAYILIR: tek alanlı `cargoDesi` çok paketli siparişte
         *  neyi temsil ettiğini söylemiyor — kıyas KURULMAZ. */
        bolunmus++;
        continue;
      }
      if (s.cargoDesi === null) {
        desisiBos++;
        continue;
      }
      const bizim = Number(s.cargoDesi);
      satirlar.push({
        kod: s.code ?? "",
        kanal: kd.kanal,
        bizim,
        kanalDesi: kd.desi,
        fark: bizim - kd.desi,
        carrierId: s.cargoCarrierId,
        channelId: s.channelAccount?.channelId ?? "",
        soldAt: s.soldAt,
        kayitliTutar: s.cargoAmount === null ? null : Number(s.cargoAmount),
      });
    }

    console.log("");
    console.log("③ KIYAS KAPSAMI");
    console.log("   kanalda desisi olan sipariş   " + kanalDesi.size);
    console.log("   incelenen (kıyas kuruldu)     " + satirlar.length);
    console.log("   defterde YOK                  " + defterdeYok);
    console.log("   defterde desi BOŞ             " + desisiBos);
    console.log("   çok paketli (kıyas kurulmaz)  " + bolunmus);
    for (const o of okunamayan) console.log("   ⚠ okunamadı: " + o);

    if (satirlar.length === 0) {
      console.log("\n⛔ İNCELENEBİLEN KAYIT YOK — 'fark 0' DEĞİL, ölçülemedi.");
      return;
    }

    /* ═══ DAĞILIM ══════════════════════════════════════════════════════ */
    const farklar = satirlar.map((r) => r.fark);
    const tutan = satirlar.filter((r) => Math.abs(r.fark) < 0.001).length;
    const fazla = satirlar.filter((r) => r.fark > 0.001).length;
    const eksik = satirlar.filter((r) => r.fark < -0.001).length;
    console.log("");
    console.log("④ FARK DAĞILIMI  (bizim − kanal, desi)");
    console.log("   n " + satirlar.length + " · TUTAN " + tutan + " · BİZ FAZLA " + fazla + " · BİZ EKSİK " + eksik);
    console.log(
      "   min " + say(Math.min(...farklar)) +
        " · p25 " + say(yuzdelik(farklar, 25)) +
        " · ortanca " + say(yuzdelik(farklar, 50)) +
        " · p75 " + say(yuzdelik(farklar, 75)) +
        " · max " + say(Math.max(...farklar)),
    );
    /**
     * ⛔ KANAL BAŞINA AYRI — HAVUZLAMAK İKİ TANIMI KARIŞTIRIR.
     * TY `cargoDeci` ile HB `Deci` aynı adı taşıyor ama aynı ŞEYİ ölçüyor
     * olmak zorunda değil (biri paketin ölçülen desisi, öteki kanalın
     * FATURALADIĞI desi olabilir — ör. asgari desi uygulaması). Havuzlanmış
     * bir ortanca, iki farklı dağılımın ortasına düşer ve hiçbirini
     * anlatmaz. _(Anayasa: "kıyasın iki tarafı aynı kümeden gelmeli".)_
     */
    for (const kanal of ["TY", "HB"]) {
      const k = satirlar.filter((r) => r.kanal === kanal);
      if (k.length === 0) continue;
      const f = k.map((r) => r.fark);
      console.log(
        "   " + kanal + "  n " + String(k.length).padStart(3) +
          " · tutan " + String(k.filter((r) => Math.abs(r.fark) < 0.001).length).padStart(3) +
          " · biz fazla " + String(k.filter((r) => r.fark > 0.001).length).padStart(3) +
          " · biz eksik " + String(k.filter((r) => r.fark < -0.001).length).padStart(3) +
          "  |  ortanca " + say(yuzdelik(f, 50)) +
          " · min " + say(Math.min(...f)) +
          " · max " + say(Math.max(...f)),
      );
    }
    const mutlak = farklar.map(Math.abs);
    console.log(
      "   |fark| ortanca " + say(yuzdelik(mutlak, 50)) + " · p90 " + say(yuzdelik(mutlak, 90)),
    );

    /* ═══ TARİFE — VARSAYIM ÖNCE SINANIR ═══════════════════════════════ */
    const tarifeler = await prisma.cargoTariff.findMany({
      select: { channelId: true, carrierId: true, desi: true, amount: true, effectiveFrom: true },
    });
    function tarifeBul(channelId: string, carrierId: string | null, desi: number, an: Date) {
      if (!carrierId) return null;
      const adim = Math.ceil(desi - 0.0001);
      const aday = tarifeler
        .filter(
          (t) =>
            t.channelId === channelId &&
            t.carrierId === carrierId &&
            t.desi === adim &&
            t.effectiveFrom <= an,
        )
        .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
      return aday.length > 0 ? Number(aday[0].amount) : null;
    }

    let dogrulanan = 0;
    let dogrulanamayan = 0;
    for (const r of satirlar) {
      if (r.kayitliTutar === null) continue;
      const yeniden = tarifeBul(r.channelId, r.carrierId, r.bizim, r.soldAt);
      if (yeniden === null) continue;
      if (Math.abs(yeniden - r.kayitliTutar) < 0.01) dogrulanan++;
      else dogrulanamayan++;
    }
    console.log("");
    console.log("⑤ TARİFE VARSAYIMI (yukarı yuvarlama) — DEFTERDEN SINANDI");
    console.log("   kayıtlı tutar yeniden kurulabildi   " + dogrulanan);
    console.log("   kurulamadı (varsayım tutmuyor)      " + dogrulanamayan);

    if (dogrulanan === 0) {
      console.log("");
      console.log("   ⛔ VARSAYIM DOĞRULANAMADI — PARA RAKAMI ÜRETİLMEZ.");
      console.log("      Desi farkı yukarıda duruyor; ₺ karşılığı için tarife");
      console.log("      eşlemesi ayrıca çözülmeli. _(Kapsayan pencere yoksa");
      console.log("      hüküm verilmez.)_");
      return;
    }

    /* ═══ PARA ═════════════════════════════════════════════════════════ */
    let bizimToplam = 0;
    let kanalToplam = 0;
    let paraliSatir = 0;
    let tarifesiz = 0;
    for (const r of satirlar) {
      const a = tarifeBul(r.channelId, r.carrierId, r.bizim, r.soldAt);
      const b = tarifeBul(r.channelId, r.carrierId, r.kanalDesi, r.soldAt);
      if (a === null || b === null) {
        tarifesiz++;
        continue;
      }
      bizimToplam += a;
      kanalToplam += b;
      paraliSatir++;
    }
    console.log("");
    console.log("⑥ PARA ETKİSİ (KDV HARİÇ tarife tutarı)");
    console.log("   ölçülebilen satır      " + paraliSatir + " · tarifesi bulunamayan " + tarifesiz);
    console.log("   bizim desiyle          ₺" + say(bizimToplam));
    console.log("   kanalın desisiyle      ₺" + say(kanalToplam));
    console.log(
      "   FARK                   ₺" +
        say(bizimToplam - kanalToplam) +
        (bizimToplam > kanalToplam
          ? "   ← defter kargoyu FAZLA yazıyor, NET olduğundan DÜŞÜK"
          : "   ← defter kargoyu EKSİK yazıyor, NET olduğundan YÜKSEK"),
    );
    if (paraliSatir > 0) {
      console.log("   satış başına ortalama  ₺" + say((bizimToplam - kanalToplam) / paraliSatir));
    }

    /* ═══ DEFTER GENELİ — ASIL DELİK BURADA OLABİLİR ═══════════════════ */
    /**
     * ⛔ "44 siparişte defterde desi BOŞ" satırı kıyas kapsamında bir eleme
     * gibi görünüyor ama kendi başına bir BULGU olabilir: desi yoksa kargo
     * tutarı da yoktur ve o satışın NET'i kargoyu HİÇ görmemiş olur.
     * Kapsam boşluğu, farkın kendisinden büyük olabilir.
     */
    const genelToplam = await prisma.sale.count({ where: { iptalTarihi: null } });
    const desisiz = await prisma.sale.count({
      where: { iptalTarihi: null, cargoDesi: null },
    });
    const tutarsiz = await prisma.sale.count({
      where: { iptalTarihi: null, cargoAmount: null },
    });
    const desiVarTutarYok = await prisma.sale.count({
      where: { iptalTarihi: null, NOT: { cargoDesi: null }, cargoAmount: null },
    });
    console.log("");
    console.log("⑧ DEFTER GENELİ (iptal HARİÇ) — KAPSAM");
    console.log("   satış toplam            " + genelToplam);
    console.log(
      "   cargoDesi BOŞ           " + desisiz + "   %" + say((desisiz / genelToplam) * 100),
    );
    console.log(
      "   cargoAmount BOŞ         " + tutarsiz + "   %" + say((tutarsiz / genelToplam) * 100),
    );
    console.log("   desi VAR ama tutar YOK  " + desiVarTutarYok);

    /* ═══ EN BÜYÜK SAPANLAR ════════════════════════════════════════════ */
    const enSapan = [...satirlar].sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark)).slice(0, 10);
    console.log("");
    console.log("⑦ EN BÜYÜK SAPAN 10 (kimlikle — 'hangileri' sorusu cevapsız kalmasın)");
    for (const r of enSapan) {
      console.log(
        "   " +
          r.kanal.padEnd(3) +
          r.kod.padEnd(13) +
          " bizim " +
          say(r.bizim).padStart(6) +
          " · kanal " +
          say(r.kanalDesi).padStart(6) +
          " · fark " +
          say(r.fark).padStart(6),
      );
    }
    console.log("");
  } finally {
    /** ⛔ K189: `$disconnect` yoksa görev "Running"de asılı kalır. */
    await prisma.$disconnect();
  }
}
main();
