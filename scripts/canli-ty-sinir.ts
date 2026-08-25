import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  A3-①b TRENDYOL API — GERİYE DÖNÜK SINIR ÖLÇÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  SORU: **en fazla ne kadar geriye gidebiliyoruz?** Sağlık ölçümü (A3-①)
 *  uçların AÇIK olduğunu gösterdi ama pencereleri sabit koştu (sipariş 2
 *  hafta · finans 15 gün). A3-②'nin tasarımı bu sınıra bağlı: geçmiş
 *  siparişleri çekip çekemeyeceğimiz buradan çıkar.
 *
 *  ⚠ TAKVİM BASKISI: ağustos başı ~1 Eylül'de 1 aylık pencereden düşüyor
 *  olabilir. Ölçüm ertelenemez.
 *
 *  ⚠ YALNIZ GET. Bu dosyada tek bir yazma ucu YOKTUR.
 *
 *  ── EN ÖNEMLİ AYRIM: "0 KAYIT" BİR SINIR KANITI DEĞİLDİR ────────────────
 *  Bir pencere `200` dönüp **0 kayıt** verirse bu iki apayrı şey olabilir:
 *    · uç pencereyi KABUL etti, o tarihlerde gerçekten sipariş yok
 *    · uç pencereyi sessizce KIRPTI ve boş döndürdü
 *  İkisi ekranda aynı görünür. Bu yüzden rapor **`REDDETTİ`** ile
 *  **`KABUL/BOŞ`**u ayrı sayar ve boş sonucun **hüküm olmadığını** yazar.
 *  (Anayasa: _"boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir."_)
 *
 *  ⚠ VE HÜKÜM ANCAK KENDİ DEFTERİMİZLE KIYASLANINCA KURULUR: o tarihlerde
 *  bizde satış olduğunu biliyorsak, boş dönen pencere KIRPILMIŞ demektir.
 *  Bugün canlı veritabanına yerel betikle bağlanılamıyor; kıyas yapılamadı
 *  ve bu raporda AÇIKÇA yazıyor — eksik kıyas, sessizce atlanmaz.
 *
 *  KOŞUM: npm run canli:ty-sinir
 * ============================================================================
 */

const TABAN = "https://apigw.trendyol.com";

/** ⚠ ANAHTAR SADECE BELLEĞE OKUNUR — hiçbir yere basılmaz, loglanmaz. */
function anahtarlar(): { saticiId: string; key: string; secret: string } | null {
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

type Sonuc = "KABUL" | "KABUL/BOŞ" | "REDDETTİ" | "YETKİSİZ" | "ULAŞILAMADI";

type Olcum = {
  ad: string;
  pencere: string;
  sonuc: Sonuc;
  durum: number | null;
  kayit: number | null;
  /** Hata gövdesi AYNEN — özetlenmez, yorumlanmaz. */
  govde: string;
};

const GUN = 86_400_000;

function ist(ms: number): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
  }).format(new Date(ms));
}

async function olc(
  ad: string,
  pencere: string,
  yol: string,
  basli: Record<string, string>,
): Promise<Olcum> {
  const bos: Olcum = { ad, pencere, sonuc: "ULAŞILAMADI", durum: null, kayit: null, govde: "" };
  try {
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), 25_000);
    /** ⚠ YALNIZ GET. */
    const cevap = await fetch(`${TABAN}${yol}`, {
      method: "GET",
      headers: basli,
      signal: kontrol.signal,
    });
    clearTimeout(zaman);

    if (cevap.status === 401 || cevap.status === 403) {
      return { ...bos, sonuc: "YETKİSİZ", durum: cevap.status };
    }
    if (!cevap.ok) {
      /**
       * ⚠ HATA GÖVDESİ AYNEN TAŞINIR. Sınırın NE OLDUĞU çoğu zaman tam
       * burada yazıyor ("maximum 15 days" gibi); özetlemek o cümleyi
       * kaybetmek olurdu.
       */
      const metin = (await cevap.text()).slice(0, 300).replace(/\s+/g, " ");
      return {
        ...bos,
        sonuc: cevap.status >= 400 && cevap.status < 500 ? "REDDETTİ" : "ULAŞILAMADI",
        durum: cevap.status,
        govde: metin,
      };
    }

    const govde = (await cevap.json()) as Record<string, unknown>;
    const dizi =
      (Array.isArray(govde) ? govde : null) ??
      (Array.isArray(govde.content) ? (govde.content as unknown[]) : null) ??
      (Array.isArray(govde.items) ? (govde.items as unknown[]) : null);

    /** Toplam alanı varsa sayfalamadan bağımsız gerçek sayıyı söyler. */
    const toplam =
      typeof govde.totalElements === "number" ? govde.totalElements : null;

    if (dizi === null) {
      return { ...bos, sonuc: "KABUL", durum: cevap.status, govde: `alanlar: ${Object.keys(govde).slice(0, 8).join(", ")}` };
    }
    const sayi = toplam ?? dizi.length;
    return {
      ...bos,
      sonuc: sayi > 0 ? "KABUL" : "KABUL/BOŞ",
      durum: cevap.status,
      kayit: sayi,
      govde: toplam === null ? "(totalElements yok — sayfadaki kayıt sayısı)" : "",
    };
  } catch (e) {
    return { ...bos, govde: e instanceof Error ? e.message.slice(0, 140) : String(e) };
  }
}

async function main() {
  const a = anahtarlar();
  if (!a) {
    console.log("\n⛔ ANAHTAR OKUNAMADI — `.env.canli` içinde üçü de dolu olmalı.");
    process.exitCode = 1;
    return;
  }

  const basli: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${a.key}:${a.secret}`).toString("base64")}`,
    "User-Agent": `${a.saticiId} - SelfIntegration`,
    Accept: "application/json",
  };

  const simdi = Date.now();

  console.log("");
  console.log("=".repeat(76));
  console.log("A3-①b GERİYE DÖNÜK SINIR ÖLÇÜMÜ   (SALT OKUMA · yalnız GET)");
  console.log("=".repeat(76));
  console.log(`  satıcı        ${a.saticiId}`);
  console.log(`  sistem okuma  ${new Date(simdi).toISOString()}`);
  console.log("");
  console.log("  ⚠ 'KABUL/BOŞ' BİR SINIR KANITI DEĞİLDİR: uç pencereyi kabul edip");
  console.log("    o tarihlerde kayıt olmadığını söylüyor OLABİLİR. Hüküm ancak");
  console.log("    kendi defterimizle kıyaslanınca kurulur.");

  /**
   * KAYAN PENCERELER — her biri 14 gün genişliğinde, giderek geriye.
   * ⚠ GENİŞLİK SABİT TUTULUYOR ki değişen tek şey UZAKLIK olsun; hem
   * genişliği hem uzaklığı birlikte oynatmak, hangisinin reddedildiğini
   * ayırt edilemez yapardı.
   */
  const pencereler: { ad: string; bas: number; son: number }[] = [
    { ad: "şimdi (kontrol)", bas: simdi - 14 * GUN, son: simdi },
    { ad: "3 hafta öncesi", bas: simdi - 21 * GUN, son: simdi - 7 * GUN },
    { ad: "5 hafta öncesi", bas: simdi - 35 * GUN, son: simdi - 21 * GUN },
    { ad: "2 ay öncesi", bas: simdi - 60 * GUN, son: simdi - 46 * GUN },
    { ad: "3 ay öncesi", bas: simdi - 90 * GUN, son: simdi - 76 * GUN },
    { ad: "6 ay öncesi", bas: simdi - 180 * GUN, son: simdi - 166 * GUN },
  ];

  const sonuclar: Olcum[] = [];

  console.log("\n" + "-".repeat(76));
  console.log("① SİPARİŞ UCU — 14 günlük pencere, giderek geriye");
  console.log("-".repeat(76));
  for (const p of pencereler) {
    const yol = `/integration/order/sellers/${a.saticiId}/orders?startDate=${p.bas}&endDate=${p.son}&page=0&size=5`;
    const o = await olc("SİPARİŞ", `${p.ad}  ${ist(p.bas)}→${ist(p.son)}`, yol, basli);
    sonuclar.push(o);
    yaz(o);
  }

  /**
   * GENİŞLİK SINAMASI — "2 hafta" kuralı gerçek mi?
   * ⚠ Dokümantasyon çelişkisi tam burada: bir yer 1 ay, bir yer 3 ay diyor.
   * Genişliği tek tek büyütmek, hangisinin doğru olduğunu SÖYLETİR.
   */
  console.log("\n" + "-".repeat(76));
  console.log("② SİPARİŞ UCU — pencere GENİŞLİĞİ sınaması (bugüne dayalı)");
  console.log("-".repeat(76));
  for (const genislik of [14, 30, 60, 90, 180]) {
    const yol = `/integration/order/sellers/${a.saticiId}/orders?startDate=${simdi - genislik * GUN}&endDate=${simdi}&page=0&size=5`;
    const o = await olc("SİPARİŞ", `son ${genislik} gün`, yol, basli);
    sonuclar.push(o);
    yaz(o);
  }

  console.log("\n" + "-".repeat(76));
  console.log("③ HAKEDİŞ UCU — 14 günlük pencere, giderek geriye");
  console.log("-".repeat(76));
  for (const p of pencereler) {
    const yol = `/integration/finance/che/sellers/${a.saticiId}/settlements?startDate=${p.bas}&endDate=${p.son}&transactionType=Sale&page=0&size=500`;
    const o = await olc("HAKEDİŞ", `${p.ad}  ${ist(p.bas)}→${ist(p.son)}`, yol, basli);
    sonuclar.push(o);
    yaz(o);
  }

  console.log("\n" + "-".repeat(76));
  console.log("④ HAKEDİŞ UCU — pencere GENİŞLİĞİ sınaması");
  console.log("-".repeat(76));
  for (const genislik of [15, 30, 60, 90]) {
    const yol = `/integration/finance/che/sellers/${a.saticiId}/settlements?startDate=${simdi - genislik * GUN}&endDate=${simdi}&transactionType=Sale&page=0&size=500`;
    const o = await olc("HAKEDİŞ", `son ${genislik} gün`, yol, basli);
    sonuclar.push(o);
    yaz(o);
  }

  console.log("\n" + "-".repeat(76));
  console.log("⑤ İADE UCU — tarihli pencere kabul ediyor mu");
  console.log("-".repeat(76));
  for (const p of [pencereler[0], pencereler[3], pencereler[4]]) {
    const yol = `/integration/order/sellers/${a.saticiId}/claims?startDate=${p.bas}&endDate=${p.son}&size=5`;
    const o = await olc("İADE", `${p.ad}  ${ist(p.bas)}→${ist(p.son)}`, yol, basli);
    sonuclar.push(o);
    yaz(o);
  }

  // ── ÖZET ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(76));
  const say = (s: Sonuc) => sonuclar.filter((x) => x.sonuc === s).length;
  console.log(`  KABUL        ${say("KABUL")}   (veri geldi — pencere kesinlikle kabul edildi)`);
  console.log(`  KABUL/BOŞ    ${say("KABUL/BOŞ")}   ⚠ HÜKÜM DEĞİL — kabul mü, sessiz kırpma mı belirsiz`);
  console.log(`  REDDETTİ     ${say("REDDETTİ")}   (uç açıkça reddetti — sınırın kanıtı BUDUR)`);
  console.log(`  YETKİSİZ     ${say("YETKİSİZ")}`);
  console.log(`  ULAŞILAMADI  ${say("ULAŞILAMADI")}   (hüküm verilmez)`);

  console.log("");
  console.log("  ⛔ EKSİK KIYAS — SESSİZCE ATLANMADI:");
  console.log("     'KABUL/BOŞ' dönen pencerelerde o tarihlerde BİZDE satış olup");
  console.log("     olmadığı kıyaslanamadı; canlı veritabanına yerel betikle");
  console.log("     bağlanılamıyor (pool timeout). Kıyas yapılmadan 'sınır burası'");
  console.log("     denemez — boş pencere, veri yokluğu da olabilir.");
  console.log("");
  console.log("  SALT OKUMA — hiçbir yazma ucuna dokunulmadı.");
  console.log("");
}

function yaz(o: Olcum) {
  const rozet = o.sonuc.padEnd(11);
  const kayit = o.kayit === null ? "" : ` · ${o.kayit} kayıt`;
  console.log(`  ${rozet} ${String(o.durum ?? "—").padStart(3)}  ${o.pencere}${kayit}`);
  if (o.govde) console.log(`              ${o.govde}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
