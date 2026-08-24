/**
 * ============================================================================
 *  A3-① TRENDYOL API SAĞLIK ÖLÇÜMÜ — HESABIMIZDA NE AÇIK? (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  ⚠ YALNIZ OKUR. Bu betikte tek bir yazma ucu YOKTUR ve olmayacak:
 *  `GET` dışında hiçbir yöntem kullanılmıyor. Faz 4'ün ilk kapısı salt
 *  okumadır; `Stock and Price Update` gibi bir uç yanlışlıkla çağrılırsa
 *  canlı listing bozulur ve geri alması bizde değil kanaldadır.
 *
 *  ⚠ KEŞİF RAPORU DOKÜMANTASYONDANDI — BU ÖLÇÜM HESABIN GERÇEĞİ.
 *  `docs/a3-trendyol-api-kesif.md` neyin VAR OLDUĞUNU yazıyor; burada
 *  neyin BİZE AÇIK olduğu ölçülüyor. İkisi ayrı sorudur.
 *
 *  ⚠ HER UÇ İÇİN DÖRT SONUÇ AYRI SAYILIR (anayasa: boş sonuç ile temiz
 *  sonucu ayırt edemeyen denetim, denetim değildir):
 *    AÇIK        — 200 döndü, veri geldi
 *    AÇIK/BOŞ    — 200 döndü ama kayıt yok (uç çalışıyor, veri yok)
 *    YETKİSİZ    — 401/403 (anahtar yok ya da kapsam dışı)
 *    ULAŞILAMADI — ağ/zaman aşımı; hüküm verilmez
 *
 *  KOŞUM: npm run canli:ty-saglik
 * ============================================================================
 */
import { readFileSync } from "node:fs";

const TABAN = "https://apigw.trendyol.com";

/** ⚠ ANAHTAR SADECE BELLEĞE OKUNUR — hiçbir yere basılmaz, loglanmaz. */
function anahtarlar(): {
  saticiId: string;
  key: string;
  secret: string;
} | null {
  let ham: string;
  try {
    ham = readFileSync(".env.canli", "utf8");
  } catch {
    return null;
  }
  const oku = (ad: string) =>
    new RegExp(`^${ad}=(.*)$`, "m")
      .exec(ham)?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, "") ?? "";
  const saticiId = oku("TRENDYOL_SATICI_ID");
  const key = oku("TRENDYOL_API_KEY");
  const secret = oku("TRENDYOL_API_SECRET");
  if (!saticiId || !key || !secret) return null;
  return { saticiId, key, secret };
}

type Sonuc =
  | "AÇIK"
  | "AÇIK/BOŞ"
  | "YETKİSİZ"
  | "BULUNAMADI"
  /**
   * ⚠ BİZİM İSTEĞİMİZ HATALI — UÇ SAĞLAM. İlk koşumda `size=5` gönderdim
   * ve hakediş uçları `keys.error.parameter.invalid.size` döndü; bunu
   * "ULAŞILAMADI" saymak, çalışan bir ucu kapalı göstermek olurdu.
   * Kendi hatamı karşı tarafın kusuru gibi raporlamak, en sinsi yalancı
   * kırmızıdır.
   */
  | "İSTEK HATALI"
  | "ULAŞILAMADI";

type Olcum = {
  ad: string;
  yol: string;
  sonuc: Sonuc;
  durum: number | null;
  kayit: number | null;
  not: string;
};

async function olc(
  ad: string,
  yol: string,
  basli: Record<string, string>,
): Promise<Olcum> {
  const bos: Olcum = {
    ad,
    yol,
    sonuc: "ULAŞILAMADI",
    durum: null,
    kayit: null,
    not: "",
  };
  try {
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), 20_000);
    /** ⚠ YALNIZ GET. Başka bir yöntem bu dosyada geçmez. */
    const cevap = await fetch(`${TABAN}${yol}`, {
      method: "GET",
      headers: basli,
      signal: kontrol.signal,
    });
    clearTimeout(zaman);

    if (cevap.status === 401 || cevap.status === 403) {
      return { ...bos, sonuc: "YETKİSİZ", durum: cevap.status };
    }
    if (cevap.status === 404) {
      return { ...bos, sonuc: "BULUNAMADI", durum: 404, not: "yol yanlış olabilir" };
    }
    if (!cevap.ok) {
      const metin = (await cevap.text()).slice(0, 160).replace(/\s+/g, " ");
      /** ⚠ 400 = PARAMETRE hatası; uç ayakta, istek yanlış. Ayrı sayılır. */
      return {
        ...bos,
        sonuc: cevap.status === 400 ? "İSTEK HATALI" : "ULAŞILAMADI",
        durum: cevap.status,
        not: metin,
      };
    }

    const govde = (await cevap.json()) as Record<string, unknown>;
    /**
     * ⚠ KAYIT SAYISI ARANIRKEN TEK ALAN ADINA GÜVENİLMEZ. TY uçları
     * `content` · `items` · dizi kökü gibi farklı şekiller döndürüyor;
     * biri bulunmazsa "0 kayıt" demek, okuyamadığımızı okumuş gibi
     * göstermek olurdu.
     */
    const dizi =
      (Array.isArray(govde) ? govde : null) ??
      (Array.isArray(govde.content) ? (govde.content as unknown[]) : null) ??
      (Array.isArray(govde.items) ? (govde.items as unknown[]) : null);
    if (dizi === null) {
      return {
        ...bos,
        sonuc: "AÇIK",
        durum: cevap.status,
        not: `alanlar: ${Object.keys(govde).slice(0, 8).join(", ")}`,
      };
    }
    return {
      ...bos,
      sonuc: dizi.length > 0 ? "AÇIK" : "AÇIK/BOŞ",
      durum: cevap.status,
      kayit: dizi.length,
      not:
        dizi.length > 0
          ? `örnek alanlar: ${Object.keys(dizi[0] as object).slice(0, 10).join(", ")}`
          : "uç çalışıyor, bu pencerede kayıt yok",
    };
  } catch (e) {
    return {
      ...bos,
      not: e instanceof Error ? e.message.slice(0, 100) : String(e),
    };
  }
}

async function main() {
  const a = anahtarlar();
  if (!a) {
    console.log("");
    console.log("⛔ ANAHTAR OKUNAMADI.");
    console.log("   `.env.canli` içinde şu üçü DOLU olmalı:");
    console.log("     TRENDYOL_SATICI_ID · TRENDYOL_API_KEY · TRENDYOL_API_SECRET");
    process.exitCode = 1;
    return;
  }

  /**
   * ⚠ İKİ BAŞLIK DA ZORUNLU (dokümantasyon):
   *   · Basic auth — key:secret
   *   · User-Agent "{SellerID} - SelfIntegration" — EKSİKSE 403 döner
   * İkincisi unutulursa yetkisizlik sanılır; oysa sebep başlıktır.
   */
  const basli: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${a.key}:${a.secret}`).toString("base64")}`,
    "User-Agent": `${a.saticiId} - SelfIntegration`,
    Accept: "application/json",
  };

  const okumaAni = new Date();
  const gun = 86_400_000;
  const bitis = okumaAni.getTime();
  /** ⚠ SİPARİŞ UCU TEK İSTEKTE EN FAZLA 2 HAFTA — dokümantasyon sınırı. */
  const bas14 = bitis - 13 * gun;
  /** ⚠ HAKEDİŞ UCU EN FAZLA 15 GÜN. */
  const bas15 = bitis - 14 * gun;

  console.log("");
  console.log("=".repeat(76));
  console.log("A3-① TRENDYOL API SAĞLIK ÖLÇÜMÜ   (SALT OKUMA · yalnız GET)");
  console.log("=".repeat(76));
  console.log(`  satıcı        ${a.saticiId}`);
  console.log(`  taban         ${TABAN}`);
  console.log(`  sistem okuma  ${okumaAni.toISOString()}`);
  console.log(`  ⚠ Bu ölçüm HESABIN gerçeği; keşif raporu dokümantasyondu.`);

  const uclar: [string, string][] = [
    /**
     * ⚠ BU İKİ YOL TAHMİN — dokümantasyon indeksi adlarını veriyor ama
     * tam yolu vermiyor. 556 dönerlerse sebep "TY kapalı" DEĞİL,
     * "yolu bilmiyoruz" olabilir. Rapor bunu ayırt edemiyor; ölçüldüğünde
     * düzeltilecek.
     */
    ["Sağlık kontrolü (yol TAHMİN)", `/integration/oms/core/health-check`],
    [
      "SİPARİŞ (2 hafta)",
      `/integration/order/sellers/${a.saticiId}/orders?startDate=${bas14}&endDate=${bitis}&page=0&size=5`,
    ],
    [
      "HAKEDİŞ (15 gün)",
      `/integration/finance/che/sellers/${a.saticiId}/settlements?startDate=${bas15}&endDate=${bitis}&transactionType=Sale&page=0&size=500`,
    ],
    [
      "DİĞER FİNANS (15 gün)",
      `/integration/finance/che/sellers/${a.saticiId}/otherfinancials?startDate=${bas15}&endDate=${bitis}&transactionType=CommissionAgreementInvoice&page=0&size=500`,
    ],
    [
      "İADE",
      `/integration/order/sellers/${a.saticiId}/claims?size=5`,
    ],
    [
      "ÜRÜN süzgeci",
      `/integration/product/sellers/${a.saticiId}/products?page=0&size=5`,
    ],
    ["KARGO firmaları (yol TAHMİN)", `/integration/product/cargo-providers`],
  ];

  const sonuclar: Olcum[] = [];
  for (const [ad, yol] of uclar) {
    const o = await olc(ad, yol, basli);
    sonuclar.push(o);
    const rozet = o.sonuc.padEnd(12);
    const durum = o.durum === null ? "  —" : String(o.durum).padStart(3);
    const kayit = o.kayit === null ? "" : ` · ${o.kayit} kayıt`;
    console.log(`\n  ${rozet} ${durum}  ${ad}${kayit}`);
    if (o.not) console.log(`               ${o.not.slice(0, 120)}`);
  }

  console.log("\n" + "-".repeat(76));
  const say = (s: Sonuc) => sonuclar.filter((x) => x.sonuc === s).length;
  console.log(`  AÇIK          ${say("AÇIK")}`);
  console.log(`  AÇIK/BOŞ      ${say("AÇIK/BOŞ")}   (uç çalışıyor, bu pencerede kayıt yok)`);
  console.log(`  YETKİSİZ      ${say("YETKİSİZ")}`);
  console.log(`  İSTEK HATALI  ${say("İSTEK HATALI")}   (uç ayakta, PARAMETRE bizde yanlış)`);
  console.log(`  BULUNAMADI    ${say("BULUNAMADI")}   (yol yanlış olabilir — hüküm DEĞİL)`);
  console.log(`  ULAŞILAMADI   ${say("ULAŞILAMADI")}   (hüküm verilmez)`);
  console.log("");
  console.log("  ⚠ 'yol TAHMİN' işaretli uçlarda 556, TY'nin kapalı olduğunu");
  console.log("    GÖSTERMEZ — yolu dokümantasyondan okuyamadım, tahmin ettim.");
  console.log("    Kendi bilgisizliğimi karşı tarafın kusuru gibi raporlamam.");
  console.log("");
  console.log("  ⚠ 'AÇIK/BOŞ' ile 'YETKİSİZ' AYRI SAYILIR: biri çalışan bir uç,");
  console.log("    öteki kapalı bir kapı. Tek rakamda toplansaydı hangisi");
  console.log("    olduğu bilinemezdi.");
  console.log("");
  console.log("  SALT OKUMA — hiçbir yazma ucuna dokunulmadı.");
  console.log("");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
