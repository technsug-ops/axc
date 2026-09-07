import { mkdirSync, writeFileSync } from "node:fs";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { kimlikOku, baslikKur, tumSayfalar, UCLAR } from "./ty/istemci";
import { v2KayitlariniNormallestir, type NormalUrun } from "./ty/urun-v2";
import { listelemeDurumu } from "../src/lib/kanal-listeleme";

/**
 * ============================================================================
 *  K112b — TRENDYOL ÜRÜN TAM TARAMASI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-ty-urun-taramasi.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bir soruyu cevaplar, rutin koşmaz.
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ — ne veritabanına ne Trendyol'a. Kullanıcı şartı
 *  (31.08.2026): _"Veritabanına yazma."_ Kullanılan uçların hepsi OKUMA.
 *
 *  ── SORU ──────────────────────────────────────────────────────────────
 *  "Mal kabul ettim — satışa açtım mı?" (K112). Bu betik Trendyol'daki
 *  BÜTÜN ürünleri tarar ve beş sınıfa ayırır.
 *
 *  ── ⛔ v2 GEÇİŞİ (K181, 07.09.2026) ──────────────────────────────────
 *  Eski `/products` ucu 15.09.2026'da KAPANIYOR. Tarama artık İKİ uçtan
 *  okuyor (`/products/approved` + `/products/unapproved`) ve iki ucun farklı
 *  şekli `ty/urun-v2.ts` normalleştiricisinde tek biçime indirgeniyor.
 *
 *  ── ⭐ SINIFLANDIRICI ARTIK BU DOSYADA DEĞİL ─────────────────────────
 *  Sınıflama `src/lib/kanal-listeleme.ts` → `listelemeDurumu` gövdesinden
 *  geliyor; paneldeki "rafta var, vitrinde yok" kutusu da AYNI gövdeyi
 *  okuyor. Önceden burada İKİNCİ bir sınıflandırıcı vardı ve **ayrışmıştı**:
 *
 *    ⛔ ÖLÇÜLDÜ 07.09.2026 — buradaki `A` dalı `onSale`e HİÇ BAKMIYORDU,
 *       oysa hem başlığı hem rapor satırı baktığını yazıyordu. Onaylı,
 *       stoklu ama vitrine çıkarılmamış ürün "SATIŞA AÇIK" sayılıyordu.
 *       Tek gövdeye bağlanınca bu kendiliğinden kapandı.
 *    _(Anayasa: "iki yerde iki ölçüt olmaz" — aynı soruya iki cevap.)_
 *
 *    ACIK           satılabilir
 *    STOKSUZ        adet 0 YA DA vitrine çıkarılmamış (`onSale` false)
 *    ONAY_BEKLIYOR  onaysız uçtan geldi ya da reddedildi
 *    PASIF          archived · locked · blacklisted
 *    BILINMIYOR     adet okunamadı — hüküm YOK, sayıya ayrı girer
 *    E) BİZDE VAR, TY'DE YOK   barkodu TY listesinde bulunmayan varyantımız
 *
 *  ── ⚠ EŞLEŞTİRME KİMLİKLE, DİZEYLE DEĞİL ────────────────────────────
 *  Barkod üzerinden. _(Anayasa: "kimlik varken dizeyle aranmaz" ve "benzer
 *  ad aynı kimlik değildir".)_ Ve E sınıfı için ÜÇ SIFIR ayrı sayılır:
 *  barkodu olmayan varyant · barkodu olup TY'de bulunmayan · stoksuz olup
 *  hiç listelenmemiş.
 * ============================================================================
 */

const CIKTI = "veri/ozel";

/**
 * DURUMLAR — İYİDEN KÖTÜYE. Sıra bir SUNUM tercihi değil, ÖLÇÜT:
 * bir barkod birden çok kayıtta geçtiğinde (aynı içeriğin iki varyantı)
 * **en satılabilir** hâli kazanır — o barkoddan mal satılabiliyor demektir.
 *
 * ⚠ `BILINMIYOR` EN SONDA ve bu bilerek: ölçülememiş bir kayıt, ölçülmüş bir
 * hükmü (PASIF gibi) EZEMEZ. _(Anayasa: "boş sonuç ile temiz sonuç ayrılır".)_
 */
const IYIDEN_KOTUYE = [
  "ACIK",
  "STOKSUZ",
  "ONAY_BEKLIYOR",
  "PASIF",
  "BILINMIYOR",
] as const;

/** Ekranda ne anlama geldiği — rapor satırının etiketi. */
const DURUM_ACIKLAMA: Record<string, string> = {
  ACIK: "satılabilir",
  STOKSUZ: "adet 0 YA DA vitrinde değil",
  ONAY_BEKLIYOR: "onaysız ya da reddedilmiş",
  PASIF: "arşivli · kilitli · kara listede",
  BILINMIYOR: "adet okunamadı — hüküm YOK",
};

/**
 * ⚠ ÜÇ DEĞERLİ BAYRAK: alan gelmediyse BOŞ yazılır, `false` DEĞİL.
 * "Uç bunu göndermedi" ile "değeri hayır" aynı hücrede görünmemeli.
 */
function bayrak(v: unknown): string {
  return v === undefined ? "" : String(v === true);
}

/** ⚠ CSV kaçışı: alan içinde `;` ya da tırnak varsa sarılır. */
function csvAlan(x: string): string {
  return /[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
}

async function main() {
  const kimlik = kimlikOku();
  if (kimlik === null) {
    console.log("⛔ TY kimliği okunamadı (.env.canli) — tarama yapılamaz.");
    process.exitCode = 1;
    return;
  }
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nK112b — TRENDYOL ÜRÜN TAM TARAMASI");
  console.log("  satıcı  " + kimlik.saticiId);
  console.log("  kip     SALT OKUMA — hiçbir şey yazılmaz");
  console.log("  an      " + new Date().toISOString());
  console.log("=".repeat(72));

  /* ═══ ① TARAMA — v2, İKİ UÇ ═════════════════════════════════════ */
  console.log("\n   taranıyor (v2: onaylı + onaysız)...");
  const baslik = baslikKur(kimlik);

  /**
   * ⚠ SAYFA GEZİNMESİ YETERLİ — ÖLÇÜLDÜ, VARSAYILMADI (07.09.2026).
   * v2 belgesi 10.000 kaydı aşan sorgularda `nextPageToken` istiyor ve
   * `page`/`size` o sınırın üstünde SESSİZCE kesilir. Ölçüm: onaylı **1576**,
   * onaysız **24** — ikisi de sınırın çok altında.
   * ⏭ AÇILIŞ ŞARTI: katalog 10.000'e yaklaşırsa `nextPageToken` gezinmesi
   * yazılır. `kesildiMi` bayrağı o güne kadar tek emniyet.
   */
  const uclar = [
    ["onaylı", (sayfa: number) => UCLAR.onayliUrunler(kimlik.saticiId, sayfa)],
    ["onaysız", (sayfa: number) => UCLAR.onaysizUrunler(kimlik.saticiId, sayfa)],
  ] as const;

  const cekilen: Record<string, unknown>[][] = [];
  let sayfaToplam = 0;
  let kesildi = false;
  for (const [ad, yolKur] of uclar) {
    const s2 = await tumSayfalar(yolKur, baslik, 60);
    if (s2.tur === "HATA") {
      /** ⛔ HATA TAM TAŞINIR — kırpmak teşhisi kırpar. */
      console.log(`\n   ⛔ TARAMA DÜŞTÜ — ${ad} ucunun ilk sayfası okunamadı.`);
      console.log("   " + JSON.stringify(s2.sonuc));
      process.exitCode = 1;
      await prisma.$disconnect();
      return;
    }
    console.log(`   ${ad.padEnd(8)} ${s2.sayfa} sayfa · ${s2.kayitlar.length} kayıt`);
    cekilen.push(s2.kayitlar as Record<string, unknown>[]);
    sayfaToplam += s2.sayfa;
    kesildi = kesildi || s2.kesildiMi;
  }

  /**
   * ⛔ SATIR SAYISI v1'DEKİNDEN FARKLI OLACAK VE BU KUSUR DEĞİL: onaylı uçta
   * bir İÇERİK birden çok barkod taşıyor, normalleştirme varyant başına satır
   * üretiyor. Eşleştirme zaten barkodla yapılıyor.
   */
  const urunler = v2KayitlariniNormallestir({
    onayli: cekilen[0],
    onaysiz: cekilen[1],
  });
  console.log(
    `   ${sayfaToplam} sayfa · ${cekilen[0].length + cekilen[1].length} ürün → ${urunler.length} satır (varyant başına)`,
  );
  if (kesildi) {
    /**
     * ⛔ TAVANA ÇARPTIYSA LİSTE TAM DEĞİLDİR ve öyle YAZAR.
     * _(Anayasa: "bir kaynağın listesi kendi tamlığını kanıtlayamaz" —
     * tavana çarpan liste bir ALT SINIRDIR.)_
     */
    console.log("   ⚠ SAYFA TAVANINA ÇARPILDI — bu liste bir ALT SINIRDIR.");
  }

  /* ═══ ② SINIFLAMA — ORTAK GÖVDEDEN ══════════════════════════════ */
  /**
   * ⛔ BURADA KURAL YAZILMAZ. Öncelik sırası (PASIF → ONAY_BEKLIYOR →
   * STOKSUZ → ACIK) `listelemeDurumu`nun içinde ve panel de onu okuyor.
   */
  const sinif = new Map<string, NormalUrun[]>(
    IYIDEN_KOTUYE.map((d) => [d, [] as NormalUrun[]]),
  );
  for (const u of urunler) {
    const d = listelemeDurumu(u) as string;
    const liste = sinif.get(d);
    if (liste === undefined) {
      /** ⚠ TANINMAYAN DURUM SESSİZCE DÜŞMEZ — gövde yeni bir değer
       *  döndürdüyse bunu BİLMEK isteriz. */
      sinif.set(d, [u]);
    } else {
      liste.push(u);
    }
  }

  /* ═══ ③ E SINIFI — BİZDE VAR, TY'DE YOK ════════════════════════ */
  const tyBarkodlari = new Set<string>();
  for (const u of urunler) {
    for (const v of [u.barcode, u.stockCode, u.productMainId]) {
      const t = v.trim();
      if (t !== "") tyBarkodlari.add(t);
    }
  }

  const varyantlar = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      barcode: true,
      companySku: true,
      name: true,
      product: { select: { name: true } },
    },
  });

  const barkodsuz: typeof varyantlar = [];
  const tydeYok: typeof varyantlar = [];
  let tydeVar = 0;
  for (const v of varyantlar) {
    const bk = (v.barcode ?? "").trim();
    /** ⛔ ÜÇ SIFIR AYRI: barkodu YOK ≠ TY'de bulunamadı. */
    if (bk === "") {
      barkodsuz.push(v);
      continue;
    }
    if (tyBarkodlari.has(bk)) tydeVar += 1;
    else tydeYok.push(v);
  }

  /* ═══ ④ RAPOR ═══════════════════════════════════════════════════ */
  console.log("\n   TRENDYOL TARAFI  (ölçüt: lib/kanal-listeleme → listelemeDurumu)\n");
  let sayilan = 0;
  for (const [d, liste] of sinif) {
    sayilan += liste.length;
    const aciklama = DURUM_ACIKLAMA[d] ?? "⚠ TANINMAYAN DURUM";
    console.log(`   ${d.padEnd(15)} ${`(${aciklama})`.padEnd(36)} ${liste.length}`);
  }
  console.log(`   ${"".padEnd(52)} ${"-".repeat(5)}`);
  console.log(`   TOPLAM${"".padEnd(46)} ${sayilan}  (taranan ${urunler.length})`);

  console.log("\n   BİZİM TARAFIMIZ (aktif varyant " + varyantlar.length + ")\n");
  console.log(`   TY'de BULUNAN                                      ${tydeVar}`);
  console.log(`   E) BİZDE VAR, TY'DE YOK                            ${tydeYok.length}`);
  console.log(`   ⚠ barkodu OLMAYAN (hüküm verilemez)                ${barkodsuz.length}`);

  /* ═══ ⑤ ASIL SORU — STOKLU VARYANTIMIZ SATIŞA AÇIK MI ══════════ */
  /**
   * ⛔ K112'NİN ASIL SORUSU BU: "mal kabul ettim, satışa açtım mı?"
   * Üstteki sayımlar TY'nin TAMAMINI anlatıyor — ama elimizde MALI OLMAYAN
   * bir ürünün stoksuz listelenmesi kusur değildir. Kusur, **elimizde mal
   * olduğu hâlde satışa açık olmayan** varyanttır.
   *
   * ⚠ STOK LEDGER'DAN: `quantityDelta` toplamı > 0 olan varyantlar.
   */
  const stokGrup = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
    orderBy: { variantId: "asc" },
  });
  const stoklu = new Set(
    stokGrup.filter((g) => (g._sum.quantityDelta ?? 0) > 0).map((g) => g.variantId),
  );

  /**
   * TY barkodu → durumu.
   *
   * ⚠ ÖNCELİK ARTIK HARF SIRASINA DEĞİL, `IYIDEN_KOTUYE` DİZİSİNE BAĞLI.
   * Eskiden `ad < mevcut` ile A<B<C<D karşılaştırılıyordu — durum adları
   * dizeye dönünce o karşılaştırma SESSİZCE anlamsız olurdu ("ACIK" < "PASIF"
   * tesadüfen doğru, ama "STOKSUZ" < "ONAY_BEKLIYOR" YANLIŞ).
   */
  const sira = (d: string) => {
    const i = (IYIDEN_KOTUYE as readonly string[]).indexOf(d);
    /** ⛔ Bulunamayan durum EN KÖTÜ sayılır — `-1` "en iyi" gibi davranırdı. */
    return i < 0 ? IYIDEN_KOTUYE.length : i;
  };
  const barkodSinifi = new Map<string, string>();
  for (const [ad, liste] of sinif) {
    for (const u of liste) {
      for (const v of [u.barcode, u.stockCode, u.productMainId]) {
        const t = v.trim();
        if (t === "") continue;
        const mevcut = barkodSinifi.get(t);
        if (mevcut === undefined || sira(ad) < sira(mevcut)) barkodSinifi.set(t, ad);
      }
    }
  }

  /**
   * ⛔ KOVA ANAHTARLARI ELLE YAZILMAZ, ÖLÇÜTTEN GELİR.
   *
   * İlk v2 yazımında burada hâlâ `A`/`B`/`C`/`D` duruyordu ve `barkodSinifi`
   * çoktan `ACIK`/`STOKSUZ`/… döndürüyordu: sayaçlar yeni anahtarlara
   * yazılıyor, rapor eski anahtarları okuyordu → ekranda **her satır 0**.
   * `tsc` bunu göremezdi (ikisi de `string`), sayılar da "makul" görünürdü.
   * _(Anayasa: "bir ekranın ne gösterdiği ölçülmeden iddia edilmez".)_
   */
  const YOK = "YOK";
  const BARKODSUZ = "BARKODSUZ";
  const stokluDurum = new Map<string, number>([
    ...IYIDEN_KOTUYE.map((d) => [d, 0] as [string, number]),
    [YOK, 0],
    [BARKODSUZ, 0],
  ]);
  const acikOlmayan: string[] = [];
  for (const v of varyantlar) {
    if (!stoklu.has(v.id)) continue;
    const bk = (v.barcode ?? "").trim();
    if (bk === "") { stokluDurum.set(BARKODSUZ, stokluDurum.get(BARKODSUZ)! + 1); continue; }
    /** Barkod TY listesinde hiç yoksa: "YOK" — `listelemeDurumu`nun da
     *  tanıdığı değer (bkz. `satisaEngel`), uydurma bir harf değil. */
    const sn = barkodSinifi.get(bk) ?? YOK;
    stokluDurum.set(sn, (stokluDurum.get(sn) ?? 0) + 1);
    if (sn !== "ACIK" && acikOlmayan.length < 15) {
      acikOlmayan.push(`     ${sn}  ${v.sku.padEnd(18)} ${(v.product.name + " " + (v.name ?? "")).trim().slice(0, 44)}`);
    }
  }
  const stokluToplam = [...stokluDurum.values()].reduce((t, x) => t + x, 0);

  console.log("");
  console.log("   ⭐ ASIL SORU — ELİMİZDE MAL VARKEN SATIŞA AÇIK MI");
  console.log("");
  console.log(`   stoklu varyant                                     ${stokluToplam}`);
  const satir = (etiket: string, anahtar: string) =>
    console.log(`     ${etiket.padEnd(48)} ${stokluDurum.get(anahtar) ?? 0}`);
  satir("TY'de SATIŞA AÇIK", "ACIK");
  satir("TY'de stoksuz/vitrinsiz     ⛔ SATILAMIYOR", "STOKSUZ");
  satir("onay bekliyor               ⛔ SATILAMIYOR", "ONAY_BEKLIYOR");
  satir("pasif                       ⛔ SATILAMIYOR", "PASIF");
  satir("TY'de hiç yok               ⛔ SATILAMIYOR", YOK);
  satir("adet okunamadı (hüküm verilemez)", "BILINMIYOR");
  satir("barkodsuz (hüküm verilemez)", BARKODSUZ);
  if (acikOlmayan.length > 0) {
    console.log("");
    console.log("   MAL VAR AMA SATIŞA AÇIK DEĞİL (ilk 15):");
    for (const o of acikOlmayan) console.log(o);
  }

  /* ═══ ⑤ DOSYALAR ════════════════════════════════════════════════ */
  mkdirSync(CIKTI, { recursive: true });
  const gun = new Date().toISOString().slice(0, 10);

  /** Ham JSON — ölçüm tekrar edilebilsin diye. */
  const hamYol = `${CIKTI}/ty-urun-taramasi-${gun}.json`;
  writeFileSync(
    hamYol,
    JSON.stringify(
      {
        _UYARI: "CANLI VERI — depoya girmez. Salt okuma taramasi.",
        alindi: new Date().toISOString(),
        saticiId: kimlik.saticiId,
        /** ⚠ SÜRÜM DAMGASI: bu dosya v2 şeklinde — v1 dosyalarıyla aynı
         *  klasörde duruyor ve ikisi AYNI ŞEY DEĞİL. */
        surum: "v2",
        uclar: ["products/approved", "products/unapproved"],
        sayfa: sayfaToplam,
        kesildiMi: kesildi,
        hamAdet: cekilen[0].length + cekilen[1].length,
        adet: urunler.length,
        urunler,
      },
      null,
      1,
    ),
    "utf8",
  );

  const csvYol = `${CIKTI}/ty-urun-taramasi-${gun}.csv`;
  const satirlar: string[] = [
    [
      "durum",
      "barkod",
      "stockCode",
      "productMainId",
      "baslik",
      "onaylı",
      "arşivli",
      "onSale",
      "reddedildi",
      "kilitli",
      "karaListe",
      "stok",
      "satisFiyati",
      "kategori",
      "urunUrl",
      /** ⭐ v1'DE HİÇ OLMAYAN SÜTUN — ürün NİÇİN reddedilmiş. */
      "redSebebi",
    ].join(";"),
  ];
  for (const [ad, liste] of sinif) {
    for (const u of liste) {
      satirlar.push(
        [
          ad,
          u.barcode,
          u.stockCode,
          u.productMainId,
          u.baslik,
          /**
           * ⚠ BAYRAK ÜÇ DEĞERLİ YAZILIR: `true` · `false` · BOŞ.
           * Onaysız uç `archived`/`onSale` GÖNDERMİYOR; `false` yazmak
           * "ölçtüm, arşivli değil" demek olurdu — oysa bakmadık.
           */
          /**
           * ⛔ `approved` HER ZAMAN BİLİNİR — ham kayıttan değil, UCUN
           * KİMLİĞİNDEN geliyor (onaylı uçtan geldiyse true). Boş yazmak,
           * bildiğimiz bir şeyi "ölçmedik" diye göstermek olurdu.
           */
          bayrak(u.approved),
          bayrak(u.archived),
          bayrak(u.onSale),
          bayrak(u.rejected),
          bayrak(u.locked),
          bayrak(u.blacklisted),
          u.quantity === undefined ? "" : String(u.quantity),
          u.satisFiyati,
          u.kategori,
          u.urunUrl,
          u.redSebepleri.join(" | "),
        ]
          .map(csvAlan)
          .join(";"),
      );
    }
  }
  /** E sınıfı bizim taraftan — TY sütunları boş kalır ve bu doğrudur. */
  for (const v of tydeYok) {
    satirlar.push(
      [
        "E",
        v.barcode ?? "",
        v.companySku ?? "",
        `${v.product.name} ${v.name ?? ""}`.trim(),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        v.sku,
      ]
        .map(csvAlan)
        .join(";"),
    );
  }
  /** ⚠ BOM: Excel Türkçe karakteri UTF-8 olarak tanısın diye. */
  writeFileSync(csvYol, "﻿" + satirlar.join("\r\n"), "utf8");

  console.log("\n   DOSYALAR");
  console.log("   ham JSON  " + hamYol);
  console.log("   CSV       " + csvYol + `  (${satirlar.length - 1} satır)`);
  console.log("\n   ⛔ HİÇBİR ŞEY YAZILMADI — ne veritabanına ne Trendyol'a.");

  await prisma.$disconnect();
}

void main();
