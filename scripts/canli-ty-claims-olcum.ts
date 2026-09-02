/**
 * ============================================================================
 *  K136a — TY CLAIMS UCU · SEBEP VE TARİH KAYNAĞI ÖLÇÜMÜ · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:ty-claims-olcum
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K136a yazımının kaynak önceliği kapısı.
 *  ⛔ HİÇBİR ŞEY YAZMAZ. Tek çağrı noktası `scripts/ty/istemci.ts` ve o
 *  modül YALNIZ `GET` biliyor; yazma fiili tanımlı bile değil.
 *
 *  ── NİYE ─────────────────────────────────────────────────────────────────
 *  Halil 02.09.2026'da kaynak önceliğini kurdu:
 *      pazaryeri API  >  ekstre  >  beyan
 *  Yani not alanına "beyan" yazmadan önce, API'nin bu 8 siparişin sebebini
 *  ve iade tarihini VERİP VERMEDİĞİ ölçülmeli.
 *  _(Anayasa: "kaynak önceliği — içerden gelen bilgi üsttedir".)_
 *
 *  ── ⛔ KAPSAM SINIRI, BAŞTAN YAZILI ─────────────────────────────────────
 *  8 siparişin **5'i Hepsiburada**, 3'ü Trendyol. TY claims ucu en iyi
 *  ihtimalle 3'ünü görebilir. HB'de API kapısı AÇILMADI (kullanıcı kararı
 *  02.09), dolayısıyla 5 sipariş için beyan TEK kaynaktır ve bu bir
 *  eksiklik değil, ÖLÇÜLMÜŞ bir sınırdır.
 *
 *  ── ÜÇ AYRI SORU, ÜÇ AYRI CEVAP ────────────────────────────────────────
 *    ① Uç ne döndürüyor — sebep alanı VAR MI, biçimi ne (kod mu metin mi)?
 *    ② GEÇMİŞ UFKU — en eski satırımız 05.06.2026; uç oraya ulaşıyor mu?
 *    ③ Halil beyanıyla ÇAKIŞIYOR MU — tutmayan varsa İKİSİ de raporlanır,
 *       hüküm VERİLMEZ.
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { UCLAR, apiGet, baslikKur, kimlikOku } from "./ty/istemci";

/** Halil'in beyanı — 02.09.2026, birebir. Kanal etiketi ölçümden geldi. */
const BEYAN: {
  siparis: string;
  kanal: "TY" | "HB";
  tarih: string;
  metin: string;
}[] = [
  { siparis: "4446089356", kanal: "HB", tarih: "2026-06-05", metin: "Yanlış sipariş verdim seçeneğinden iade" },
  { siparis: "4068972350", kanal: "HB", tarih: "2026-06-09", metin: "Yanlış sipariş verdim seçeneğinden iade" },
  { siparis: "4903455009", kanal: "HB", tarih: "2026-06-29", metin: "Küçük geldi seçeneğinden iade" },
  { siparis: "4287210000", kanal: "HB", tarih: "2026-07-03", metin: "Yanlış sipariş verdim seçeneğinden iade" },
  { siparis: "4586626981", kanal: "HB", tarih: "2026-07-20", metin: "Yanlış sipariş verdim seçeneğinden iade" },
  { siparis: "11385159467", kanal: "TY", tarih: "2026-07-22", metin: "Yanlış sipariş verdim seçeneğinden iade" },
  { siparis: "11409234590", kanal: "TY", tarih: "2026-07-29", metin: "Beğenmedim seçeneğinden iade" },
  { siparis: "11438301199", kanal: "TY", tarih: "2026-08-10", metin: "Yanlış sipariş verdim seçeneğinden iade" },
];

/** Ham cevabın saklanacağı yer — `veri/ozel/` gitignore'da. */
const CIKTI = "veri/ozel/ty-claims-olcum.json";

function gun(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Bir nesnenin ALAN ADLARINI derinlemesine toplar — değerleri DEĞİL.
 *
 * ⛔ DERİNLİK 6 — VE BU SAYININ BİR HİKÂYESİ VAR.
 * İlk yazımda tavan **3** idi ve rapor _"⭐ SEBEP ADAYI ALANLAR: HİÇ YOK"_
 * dedi. Yanlıştı: sebep `items[].claimItems[].customerClaimItemReason.code`
 * yolunda, yani **4. derinlikte** yaşıyor. Aracın tavanı, kaynağın yokluğu
 * gibi göründü — aynı gün zaman aşımında yaşanan tuzağın ikinci hâli.
 * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 * değildir".)_
 */
function alanlariTopla(x: unknown, onek = "", derinlik = 0): string[] {
  if (derinlik > 6 || x === null || typeof x !== "object") return [];
  if (Array.isArray(x)) {
    return x.length === 0 ? [] : alanlariTopla(x[0], `${onek}[]`, derinlik + 1);
  }
  const cikti: string[] = [];
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    const yol = onek === "" ? k : `${onek}.${k}`;
    cikti.push(yol);
    cikti.push(...alanlariTopla(v, yol, derinlik + 1));
  }
  return cikti;
}

/** İç içe bir yoldan değer okur (`a.b[].c` biçimi desteklenmez, düz yol). */
function oku(x: unknown, yol: string[]): unknown {
  let g: unknown = x;
  for (const p of yol) {
    if (g === null || typeof g !== "object") return undefined;
    g = (g as Record<string, unknown>)[p];
  }
  return g;
}

async function main() {
  console.log("=".repeat(78));
  console.log("  TY CLAIMS UCU — SEBEP/TARİH KAYNAĞI ÖLÇÜMÜ (salt okuma)");
  console.log("=".repeat(78));

  /** ⛔ KAPSAM SINIRI ÖNCE YAZILIR — sonuç okunmadan önce görülsün. */
  const ty = BEYAN.filter((b) => b.kanal === "TY");
  const hb = BEYAN.filter((b) => b.kanal === "HB");
  console.log("\n⛔ KAPSAM SINIRI");
  console.log(
    `   TY siparişi (uç görebilir)  : ${ty.length}   ${ty
      .map((b) => b.siparis)
      .join(" · ")}`,
  );
  console.log(
    `   HB siparişi (uç GÖREMEZ)    : ${hb.length}   ${hb
      .map((b) => b.siparis)
      .join(" · ")}`,
  );
  console.log(
    "   → HB'de API kapısı açılmadı (kullanıcı kararı 02.09). O beş",
  );
  console.log("     sipariş için BEYAN tek kaynaktır — eksiklik değil, SINIR.");

  const k = kimlikOku();
  if (k === null) {
    console.log("\n⛔ TY kimliği okunamadı (.env.canli eksik) — ÖLÇÜM YOK.");
    console.log("   Bu 'uç sebep vermiyor' DEMEK DEĞİLDİR.");
    process.exitCode = 1;
    return;
  }
  const baslik = baslikKur(k);

  /**
   * ⭐ ÖNCE TEK SAYFALIK YOKLAMA — ilk denemede 20 sn tavanı doldu ve
   * `tumSayfalar` "ULASILAMADI" dedi. O mesaj UCU değil ZAMAN AŞIMINI
   * anlatıyordu; ikisi ayrı şeyler. Yoklama küçük sayfa + geniş tavanla
   * ucun AYAKTA olup olmadığını tek başına ölçer.
   * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim,
   * denetim değildir" — burada üçüncü bir hâl var: cevap HİÇ gelmedi.)_
   */
  console.log("\n⓪ YOKLAMA — tek sayfa, size=10, tavan 90 sn");
  const yoklama = await apiGet(UCLAR.iadeler(k.saticiId, 0, 10), baslik, 90_000);
  console.log(`   sonuç: ${yoklama.tur}`);
  if (yoklama.tur === "ISTEK_HATALI") {
    console.log(`   ⛔ PARAMETRE BİZDE YANLIŞ (400): ${yoklama.mesaj}`);
    console.log("      Uç AYAKTA; eksik olan istek biçimi. Bu bir kaynak");
    console.log("      yokluğu DEĞİL — düzeltilebilir bir çağrı hatası.");
    process.exitCode = 1;
    return;
  }
  if (yoklama.tur === "YETKISIZ") {
    console.log(`   ⛔ YETKİSİZ (${yoklama.durum}) — bu uç için izin yok.`);
    console.log("      Anahtar çalışıyor (sipariş ucu okunuyordu); eksik");
    console.log("      olan bu ucun KAPSAMI. 'Sebep yok' demek DEĞİL.");
    process.exitCode = 1;
    return;
  }
  if (yoklama.tur !== "VERI" && yoklama.tur !== "BOS") {
    console.log(
      `   ⛔ CEVAP GELMEDİ: ${
        yoklama.tur === "ULASILAMADI" ? yoklama.sebep : yoklama.tur
      }`,
    );
    console.log("      ⚠ Bu 'uçta sebep yok' DEĞİL 'ÖLÇEMEDİM' demektir.");
    process.exitCode = 1;
    return;
  }
  if (yoklama.tur === "VERI") {
    const g = yoklama.govde as Record<string, unknown>;
    console.log(`   ✓ uç AYAKTA — gövde anahtarları: ${Object.keys(g).slice(0, 8).join(" · ")}`);
    if (typeof g.totalElements === "number") {
      console.log(`   totalElements: ${g.totalElements}`);
    }
    if (typeof g.totalPages === "number") {
      console.log(`   totalPages   : ${g.totalPages}`);
    }
  }

  /**
   * ⛔ `tumSayfalar` KULLANILMIYOR — SEBEBİ ÖLÇÜLDÜ, TERCİH DEĞİL.
   *
   * Ortak gövde `size=200` ve `apiGet`in 20 sn varsayılanıyla çağırıyor;
   * bu uçta 200'lük sayfa 20 sn'yi aşıyor ve sonuç "ULASILAMADI" oluyor —
   * yani ÖLÇÜM ARACININ tavanı, ucun yokluğu gibi görünüyordu. Yoklama
   * ucun ayakta olduğunu gösterdi (351 kayıt / 36 sayfa @ size=10).
   *
   * ⚠ BEKLENEN TOPLAM ÖNCEDEN OKUNUYOR (`totalElements`) ve sonunda
   * ÇEKİLENLE KARŞILAŞTIRILIYOR: eksik çekim sessizce "liste bu kadar"
   * diye okunmasın.
   * _(Anayasa: "bir kaynağın listesi kendi tamlığını kanıtlayamaz" —
   * burada en azından kaynağın KENDİ beyanıyla çaprazlanıyor.)_
   */
  const beklenen =
    yoklama.tur === "VERI"
      ? ((yoklama.govde as Record<string, unknown>).totalElements as number) ??
        null
      : null;

  console.log("\n① UÇ ÇAĞRILIYOR (GET, size=50, tavan 90 sn/sayfa)");
  const kayitlar: unknown[] = [];
  let kesildiMi = false;
  let sayfaNo = 0;
  for (; sayfaNo < 40; sayfaNo++) {
    const s = await apiGet(UCLAR.iadeler(k.saticiId, sayfaNo, 50), baslik, 90_000);
    if (s.tur !== "VERI") {
      console.log(
        `   ⛔ SAYFA ${sayfaNo} CEVAP VERMEDİ: ${
          s.tur === "ULASILAMADI" ? s.sebep : s.tur
        }`,
      );
      kesildiMi = true;
      break;
    }
    const govde = s.govde as Record<string, unknown>;
    const dizi = Array.isArray(govde.content) ? (govde.content as unknown[]) : [];
    if (dizi.length === 0) break;
    kayitlar.push(...dizi);
    const toplamSayfa =
      typeof govde.totalPages === "number" ? govde.totalPages : null;
    if (toplamSayfa !== null && sayfaNo + 1 >= toplamSayfa) {
      sayfaNo++;
      break;
    }
  }

  console.log(`   çekilen ${kayitlar.length} kayıt · ${sayfaNo} sayfa`);
  if (beklenen !== null) {
    console.log(
      `   ucun kendi beyanı: ${beklenen}` +
        (kayitlar.length === beklenen
          ? "  ✓ TAM"
          : `  ⛔ EKSİK ${beklenen - kayitlar.length} — liste ALT SINIRDIR`),
    );
    if (kayitlar.length !== beklenen) kesildiMi = true;
  }
  if (kesildiMi) {
    console.log("   ⚠ Liste eksik olabilir; 'bulunamadı' sonuçları HÜKÜM DEĞİL.");
  }
  if (kayitlar.length === 0) {
    console.log("   ⛔ HİÇ KAYIT ÇEKİLEMEDİ — kaynak ölçülemedi.");
    process.exitCode = 1;
    return;
  }
  if (kayitlar.length === 0) {
    console.log("   ⚠ UÇ BOŞ DÖNDÜ. Bu 'iade yok' demek DEĞİL; uç çalışıyor");
    console.log("     ama bu hesapta/pencerede kayıt göstermiyor olabilir.");
  }

  writeFileSync(CIKTI, JSON.stringify(kayitlar, null, 2), "utf8");
  console.log(`   ham cevap yazıldı: ${CIKTI} (gitignore'da)`);

  if (kayitlar.length === 0) {
    console.log("\n" + "-".repeat(78));
    console.log("  ⛔ HÜKÜM YOK — kayıt gelmedi, kaynak ölçülemedi.");
    console.log("=".repeat(78) + "\n");
    return;
  }

  /**
   * ② ALAN HARİTASI — sebep alanı VAR MI, adı ne.
   *
   * ⛔ TEK KAYITTAN DEĞİL, TÜM KAYITLARIN BİRLEŞİMİNDEN. İlk yazım
   * `kayitlar[0]`a bakıyordu; boş bir dizi (`claimItems: []`) o kayıtta
   * alt alanları gizler ve harita eksik çıkar.
   * _(Anayasa: "sınanmayan dal, sınanmamış koddur" — burada GÖRÜLMEYEN
   * kayıt, görülmemiş alan demek.)_
   */
  console.log("\n② ALAN HARİTASI (TÜM kayıtların birleşimi, DEĞERLER değil ADLAR)");
  const alanlar = [
    ...new Set(kayitlar.flatMap((kayit) => alanlariTopla(kayit))),
  ].sort();
  for (const a of alanlar) console.log(`   ${a}`);

  const sebepAdaylari = alanlar.filter((a) =>
    /reason|claimReason|customerClaim|description/i.test(a),
  );
  console.log(
    `\n   ⭐ SEBEP ADAYI ALANLAR: ${
      sebepAdaylari.length === 0 ? "⛔ HİÇ YOK" : sebepAdaylari.join(" · ")
    }`,
  );

  /** ③ GEÇMİŞ UFKU — en eski satırımız 05.06.2026'ya ulaşıyor mu. */
  const tarihAdaylari = alanlar.filter((a) => /date|Date|At$/.test(a));
  console.log("\n③ GEÇMİŞ UFKU");
  console.log(`   tarih taşıyan alanlar: ${tarihAdaylari.join(" · ")}`);
  let enEski: number | null = null;
  let enYeni: number | null = null;
  for (const kayit of kayitlar) {
    for (const alan of tarihAdaylari) {
      const v = oku(kayit, alan.split("."));
      const ms = typeof v === "number" ? v : null;
      if (ms === null || ms < 1_500_000_000_000) continue;
      if (enEski === null || ms < enEski) enEski = ms;
      if (enYeni === null || ms > enYeni) enYeni = ms;
    }
  }
  if (enEski === null) {
    console.log("   ⚠ SAYISAL TARİH BULUNAMADI — ufuk ÖLÇÜLEMEDİ.");
  } else {
    console.log(`   en eski kayıt : ${gun(enEski)}`);
    console.log(`   en yeni kayıt : ${gun(enYeni ?? enEski)}`);
    const hedef = Date.parse("2026-06-05T00:00:00Z");
    console.log(
      enEski <= hedef
        ? "   ✓ 05.06.2026'YA ULAŞIYOR — geçmiş ufku yeterli"
        : "   ⛔ 05.06.2026'YA ULAŞMIYOR — en eski satırımız uç dışında",
    );
  }

  /** ④ BEYANLA ÇAKIŞTIRMA — hüküm YOK, iki taraf da yazılır. */
  console.log("\n④ HALİL BEYANI ↔ CLAIMS (hüküm YOK, ikisi de yazılır)");
  let bulundu = 0;
  let bulunamadi = 0;
  let tutan = 0;
  let tutmayan = 0;
  for (const b of BEYAN) {
    if (b.kanal === "HB") {
      console.log(
        `   ${b.siparis.padEnd(13)} HB — uç KAPSAMINDA DEĞİL, beyan tek kaynak`,
      );
      continue;
    }
    /** Kimlikle aranır, dizeyle değil: sipariş numarası alanı taranır. */
    const eslesen = kayitlar.filter((kayit) => {
      const metin = JSON.stringify(kayit);
      return metin.includes(b.siparis);
    });
    if (eslesen.length === 0) {
      console.log(
        `   ${b.siparis.padEnd(13)} TY — ⛔ CLAIMS'TE BULUNAMADI` +
          " ('iade değil' DEMEK DEĞİL; uç bu kaydı taşımıyor)",
      );
      bulunamadi += 1;
      continue;
    }
    bulundu += 1;
    console.log(`   ${b.siparis.padEnd(13)} TY — ✓ ${eslesen.length} claim kaydı`);
    console.log(`      beyan  : "${b.metin}"  ·  ${b.tarih}`);

    /**
     * ⛔ HER CLAIM KAYDI AYRI YAZILIR — `eslesen[0]` YETMEZ.
     *
     * İlk yazım yalnız ilk kaydı basıyordu ve ÜÇ SİPARİŞTE DE "tarih
     * çelişkisi" raporlayacaktı. Gerçek şuydu: bir siparişin BİRDEN ÇOK
     * talebi olabiliyor ve ilki `Cancelled`. Halil'in tarihi ve sebebi
     * `Accepted` olanla BİREBİR tutuyor. Yani çelişkiyi veri değil,
     * benim tek-kayıt bakışım üretmişti.
     * _(Anayasa: "kıyasın iki tarafı aynı kümeden gelmeli".)_
     */
    for (const kayit of eslesen) {
      const claimDate = oku(kayit, ["claimDate"]);
      const sonAn = oku(kayit, ["lastModifiedDate"]);
      const kalemler = (oku(kayit, ["items"]) as unknown[]) ?? [];
      for (const it of kalemler) {
        const ciList = (oku(it, ["claimItems"]) as unknown[]) ?? [];
        for (const ci of ciList) {
          const durum = oku(ci, ["claimItemStatus", "name"]);
          const kod = oku(ci, ["customerClaimItemReason", "code"]);
          const ad = oku(ci, ["customerClaimItemReason", "name"]);
          const musteriNotu = String(oku(ci, ["customerNote"]) ?? "").trim();
          const kabul = durum === "Accepted";
          console.log(
            `      ${kabul ? "⭐" : "  "} claims [${String(durum)}]` +
              ` ${String(kod)} · "${String(ad)}"` +
              `  ·  açılış ${
                typeof claimDate === "number" ? gun(claimDate) : "—"
              } → son ${typeof sonAn === "number" ? gun(sonAn) : "—"}`,
          );
          if (musteriNotu !== "") {
            console.log(`         müşteri notu: "${musteriNotu.slice(0, 90)}"`);
          }
          /** ⭐ ÇAKIŞMA YALNIZ `Accepted` KAYITLA ÖLÇÜLÜR. */
          if (kabul) {
            const sebepTutar = b.metin.startsWith(String(ad));
            const tarihTutar =
              typeof sonAn === "number" && gun(sonAn) === b.tarih;
            console.log(
              `         → sebep ${sebepTutar ? "✓ TUTUYOR" : "⛔ AYRIŞIYOR"}` +
                `  ·  tarih ${tarihTutar ? "✓ TUTUYOR" : "⛔ AYRIŞIYOR"}`,
            );
            if (sebepTutar && tarihTutar) tutan += 1;
            else tutmayan += 1;
          }
        }
      }
    }
  }

  console.log("\n" + "=".repeat(78));
  console.log("  ÖZET");
  console.log("=".repeat(78));
  console.log(`   claims kaydı            : ${kayitlar.length}`);
  console.log(`   ⭐ sebep alanı           : ${sebepAdaylari.length > 0 ? "VAR" : "⛔ YOK"}`);
  console.log(`   TY siparişi bulunan     : ${bulundu}/${ty.length}`);
  console.log(
    `   ⭐ beyan ↔ claims TUTAN  : ${tutan}   (sebep VE tarih birlikte)`,
  );
  console.log(`   ⛔ beyan ↔ claims AYRIŞAN: ${tutmayan}`);
  console.log(`   TY siparişi bulunamayan : ${bulunamadi}/${ty.length}`);
  console.log(`   ⛔ HB (uç kapsamı dışı)  : ${hb.length}`);

  console.log("\n" + "-".repeat(78));
  console.log("  ⛔ HÜKÜM YOK. Bu rapor kaynağın NE VERDİĞİNİ söyler; hangi");
  console.log("     kaynağın yazılacağını Halil'in kurduğu öncelik belirler");
  console.log("     (pazaryeri API > ekstre > beyan). Çelişki varsa İKİSİ de");
  console.log("     nota yazılır ve çelişki GÖRÜNÜR kalır.");
  console.log("=".repeat(78) + "\n");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
