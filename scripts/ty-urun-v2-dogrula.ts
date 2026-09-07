import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { listelemeDurumu } from "../src/lib/kanal-listeleme";
import {
  onayliUrunuNormallestir,
  onaysizUrunuNormallestir,
  v2KayitlariniNormallestir,
} from "./ty/urun-v2";

/**
 * ============================================================================
 *  ÜRÜN v2 NORMALLEŞTİRİCİ BEKÇİSİ (K181, 07.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run ty-urun-v2:dogrula
 *
 *  ⭐ GÖVDE ÇAĞRILIR, DESEN ARANMAZ. Normalleştirici saf: ağ yok, veritabanı
 *  yok. _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 *
 *  ⛔ VE ZİNCİRİN BAĞI AYRICA ÖLÇÜLÜR: normalleştirici tek başına doğru,
 *  sınıflandırıcı tek başına doğru olup **aradaki bağ** yanlış olabilir —
 *  `approved` alanını yazmayı unutan bir normalleştirici, kusursuz bir
 *  sınıflandırıcıya her ürünü "ONAY_BEKLIYOR" diye verirdi ve iki birim testi
 *  de yeşil kalırdı. _(Anayasa: "iki halka ayrı ayrı doğru olabilir".)_
 *
 *  Kaynak taraması yalnız TEK şey için: ölen v1 yolunun istemci dışında
 *  yeniden yazılmasını yasaklamak.
 * ============================================================================
 */

let hata = 0;
let gecen = 0;
const kosanBolumler: string[] = [];

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen++;
    console.log("  ✓ " + ad);
  } else {
    hata++;
    console.log("  ✗ " + ad);
  }
}

/** Ölçülen şekle birebir uyan ONAYLI örnek — iki varyantlı bir içerik. */
function onayliOrnek(): Record<string, unknown> {
  return {
    productMainId: "PM-1",
    title: "Örnek Ürün",
    category: { id: 5, name: "Kategori" },
    variants: [
      {
        barcode: "BK-1",
        stockCode: "SK-1",
        archived: false,
        locked: false,
        blacklisted: false,
        onSale: true,
        stock: { quantity: 7 },
        price: { salePrice: 199.9 },
        productUrl: "https://ty/1",
      },
      {
        barcode: "BK-2",
        stockCode: "SK-2",
        archived: true,
        locked: false,
        blacklisted: false,
        onSale: true,
        stock: { quantity: 3 },
        price: { salePrice: 249.9 },
        productUrl: "https://ty/2",
      },
    ],
  };
}

/** Ölçülen şekle birebir uyan ONAYSIZ örnek — düz, varyant dizisi YOK. */
function onaysizOrnek(): Record<string, unknown> {
  return {
    productMainId: "PM-9",
    title: "Bekleyen Ürün",
    category: { id: 5, name: "Kategori" },
    barcode: "BK-9",
    stockCode: "SK-9",
    status: "rejected",
    quantity: 4,
    salePrice: 99.9,
    rejectReasonDetails: [{ rejectReason: "Görsel", rejectReasonDetail: "Bulanık" }],
  };
}

// ═══ 1) ONAYLI UÇ — VARYANT BAŞINA SATIR ══════════════════════════════════
console.log("\n1) ONAYLI UÇ");
{
  const r = onayliUrunuNormallestir(onayliOrnek());
  kontrol("bir içerik → varyant başına satır (2)", r.length === 2);
  /**
   * ⛔ EN KRİTİK ÖLÇÜT: `approved` ham kayıtta YOK, ucun kimliğinden yazılır.
   * Yazılmazsa her onaylı ürün "ONAY_BEKLIYOR"a düşer.
   */
  kontrol("approved UCUN KİMLİĞİNDEN true yazılır", r.every((x) => x.approved === true));
  kontrol("rejected false yazılır", r.every((x) => x.rejected === false));
  kontrol("barkod varyanttan gelir", r[0].barcode === "BK-1" && r[1].barcode === "BK-2");
  kontrol("stockCode varyanttan gelir", r[0].stockCode === "SK-1");
  kontrol("productMainId ÜRÜNDEN gelir", r.every((x) => x.productMainId === "PM-1"));
  /** ⚠ Adet ürün seviyesinde DEĞİL, `variants[].stock.quantity` içinde. */
  kontrol("adet variants[].stock.quantity'den", r[0].quantity === 7 && r[1].quantity === 3);
  kontrol("bayraklar VARYANT başına ayrışır", r[0].archived === false && r[1].archived === true);
  kontrol("fiyat varyanttan", r[0].satisFiyati === "199.9");
  kontrol("kategori adı iç nesneden", r[0].kategori === "Kategori");
  kontrol("başlık üründen", r[0].baslik === "Örnek Ürün");
}

kontrol(
  "adet alanı YOKSA null değil UNDEFINED (bilinmeyen sıfıra çevrilmez)",
  (() => {
    const h = onayliOrnek();
    delete ((h.variants as Record<string, unknown>[])[0]).stock;
    return onayliUrunuNormallestir(h)[0].quantity === undefined;
  })(),
);

kontrol(
  "varyantı OLMAYAN ürün sessizce DÜŞMEZ — barkodsuz tek satır",
  (() => {
    const h = onayliOrnek();
    h.variants = [];
    const r = onayliUrunuNormallestir(h);
    return r.length === 1 && r[0].barcode === "" && r[0].approved === true;
  })(),
);
kosanBolumler.push("onaylı uç");

// ═══ 2) ONAYSIZ UÇ ════════════════════════════════════════════════════════
console.log("\n2) ONAYSIZ UÇ");
{
  const r = onaysizUrunuNormallestir(onaysizOrnek());
  kontrol("approved false", r.approved === false);
  kontrol("status 'rejected' → rejected true", r.rejected === true);
  /** ⚠ ADET BURADA ÜRÜN SEVİYESİNDE — onaylı uçtan FARKLI yerde. */
  kontrol("adet ÜRÜN seviyesinden", r.quantity === 4);
  kontrol("barkod/stockCode üründen", r.barcode === "BK-9" && r.stockCode === "SK-9");
  kontrol("red sebebi taşınır", r.redSebepleri[0] === "Görsel — Bulanık");
  /**
   * ⛔ BAYRAKLAR `undefined` KALIR — uç onları HİÇ göndermiyor. `false`
   * yazmak "ölçtüm, arşivli değil" demek olurdu.
   */
  kontrol(
    "gönderilmeyen bayraklar UNDEFINED (false DEĞİL)",
    r.archived === undefined && r.onSale === undefined && r.locked === undefined,
  );
}

kontrol(
  "status 'pendingApproval' → rejected FALSE",
  (() => {
    const h = onaysizOrnek();
    h.status = "pendingApproval";
    return onaysizUrunuNormallestir(h).rejected === false;
  })(),
);

/** ⚠ TANINMAYAN DURUM UYDURULMAZ: bilmediğimiz bir değer "reddedildi" olmaz. */
kontrol(
  "TANINMAYAN status → rejected FALSE (uydurma yok)",
  (() => {
    const h = onaysizOrnek();
    h.status = "someNewStatusTrendyolAdded";
    return onaysizUrunuNormallestir(h).rejected === false;
  })(),
);

kontrol(
  "red sebebi YOKSA boş dizi (null değil)",
  (() => {
    const h = onaysizOrnek();
    delete h.rejectReasonDetails;
    return onaysizUrunuNormallestir(h).redSebepleri.length === 0;
  })(),
);
kosanBolumler.push("onaysız uç");

// ═══ 3) ZİNCİRİN BAĞI — NORMALLEŞTİRİCİ → SINIFLANDIRICI ══════════════════
console.log("\n3) ZİNCİR — gerçek sınıflandırıcı ÇAĞRILARAK");

/** Tek varyantlı onaylı ürün üretir; verilen alanları ezer. */
function tekVaryant(ezme: Record<string, unknown>) {
  const h = onayliOrnek();
  const v = (h.variants as Record<string, unknown>[])[0];
  h.variants = [{ ...v, ...ezme }];
  return onayliUrunuNormallestir(h)[0];
}

kontrol(
  "onaylı · vitrinde · stoklu → ACIK",
  listelemeDurumu(tekVaryant({ onSale: true, stock: { quantity: 5 } })) === "ACIK",
);
/**
 * ⛔ BU ÖLÇÜT BİR HATAYI KAPATIYOR: taramanın eski sınıflandırıcısı `onSale`e
 * HİÇ BAKMIYORDU (ölçüldü 07.09.2026) ve bu kaydı "SATIŞA AÇIK" sayıyordu.
 */
kontrol(
  "onaylı · stoklu ama VİTRİNDE DEĞİL → STOKSUZ (eski körlük)",
  listelemeDurumu(tekVaryant({ onSale: false, stock: { quantity: 5 } })) === "STOKSUZ",
);
kontrol(
  "onaylı · adet 0 → STOKSUZ",
  listelemeDurumu(tekVaryant({ onSale: true, stock: { quantity: 0 } })) === "STOKSUZ",
);
kontrol(
  "arşivli → PASIF (en kısıtlayıcı kazanır)",
  listelemeDurumu(tekVaryant({ archived: true, onSale: true, stock: { quantity: 5 } })) ===
    "PASIF",
);
kontrol(
  "kilitli → PASIF",
  listelemeDurumu(tekVaryant({ locked: true, onSale: true, stock: { quantity: 5 } })) === "PASIF",
);
kontrol(
  "adet OKUNAMADI → BILINMIYOR (0 sayılıp STOKSUZ denmez)",
  (() => {
    const h = onayliOrnek();
    const v = (h.variants as Record<string, unknown>[])[0];
    delete v.stock;
    h.variants = [v];
    return listelemeDurumu(onayliUrunuNormallestir(h)[0]) === "BILINMIYOR";
  })(),
);
kontrol(
  "onaysız kayıt → ONAY_BEKLIYOR",
  listelemeDurumu(onaysizUrunuNormallestir(onaysizOrnek())) === "ONAY_BEKLIYOR",
);

{
  const hepsi = v2KayitlariniNormallestir({
    onayli: [onayliOrnek()],
    onaysiz: [onaysizOrnek()],
  });
  kontrol("iki uç birleşir (2 varyant + 1 onaysız = 3)", hepsi.length === 3);
  const durumlar = hepsi.map((u) => listelemeDurumu(u));
  kontrol(
    "birleşik listede üç ayrı durum çıkar",
    durumlar[0] === "ACIK" && durumlar[1] === "PASIF" && durumlar[2] === "ONAY_BEKLIYOR",
  );
}
kosanBolumler.push("zincir");

// ═══ 4) ÖLEN UÇ YENİDEN YAZILAMAZ ═════════════════════════════════════════
console.log("\n4) DESEN YASAĞI — ölen v1 yolu");

function dosyalar(kok: string, birikim: string[] = []): string[] {
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) {
      if (ad === "generated" || ad === "node_modules") continue;
      dosyalar(yol, birikim);
    } else if (/\.tsx?$/.test(ad)) birikim.push(yol);
  }
  return birikim;
}

function yorumsuz(kaynak: string): string {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

{
  /**
   * ⛔ YOL TEK YERDE. Üç betik bu adresi ayrı ayrı yazıyordu; geçiş üç yerde
   * ayrı yapılsaydı biri unutulur ve 15.09.2026'da sessizce düşerdi.
   * _(Anayasa: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_
   */
  const SAHIP = "scripts/ty/istemci.ts";
  const YASAK = /\/products\?page=/;
  const suclular: string[] = [];
  let taranan = 0;
  for (const yol of [...dosyalar("scripts"), ...dosyalar("src")]) {
    const d = yol.replace(/\\/g, "/");
    taranan++;
    if (d === SAHIP) continue;
    if (YASAK.test(yorumsuz(readFileSync(yol, "utf8")))) suclular.push(d);
  }
  /** ⭐ TABAN DOLU — tarama boşalırsa döngü hiçbir şey ölçmez. */
  kontrol("TABAN DOLU — taranan dosya (" + taranan + ")", taranan >= 100);
  kontrol(
    "çıplak v1 ürün yolu istemci DIŞINDA yok" +
      (suclular.length > 0 ? " → " + suclular.join(", ") : ""),
    suclular.length === 0,
  );
  /** ⚠ VE SAHİBİNDE DURDUĞU DA ÖLÇÜLÜR: yasak, yolun kaybolması demek değil. */
  kontrol(
    "yol SAHİBİNDE duruyor (kıyas/geçiş için)",
    YASAK.test(readFileSync(SAHIP, "utf8")),
  );
}
kosanBolumler.push("desen yasağı");

const BOLUM_SAYISI = 4;
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `\nKOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})\n`,
  );
  process.exit(1);
}

console.log(
  "\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    " (" + gecen + "/" + (gecen + hata) + ")\n",
);
process.exit(hata === 0 ? 0 : 1);
