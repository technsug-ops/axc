import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  LİSTEYE DÖNÜŞ BEKÇİSİ (K133, 02.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ KORUDUĞU İKİ AYRI SÖZ — VE İKİSİ AYRI ÖLÇÜLÜYOR:
 *    ① dönüş bağlantısı GELDİĞİN listeye gider (hedef doğru)
 *    ② bağlantının METNİ o hedefi söyler (metin davranışla tutuyor)
 *
 *  Yalnız ① ölçülseydi bağlantı `/satislar`a giderken "‹ Ürünler" yazabilir
 *  ve kimse fark etmezdi — doğru hedef, YALAN metin (İlke #2; "metin, sahip
 *  olmadığı anlamı iddia etmez").
 *
 *  ⚠ VE ÜÇÜNCÜ BİR SÖZ: hafızaya yazan HER liste kendi etiketini verir.
 *  Etiket taban→ad eşlemesinden türetilseydi ELLE TUTULAN BİR LİSTE doğar,
 *  yedinci liste eklendiğinde sessizce eskirdi. Ölçüt bu yüzden "eşleme
 *  tablosu YOK" diye de bakıyor.
 *
 *  ⭐ ÖLÇÜTLERİN ÇOĞU DEĞER TESTİ — gövde saf ve `sessionStorage` taklit
 *  ediliyor; kaynak taraması yalnız bileşen çizimi için.
 * ============================================================================
 */

const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];
let gecen = 0;
let kalan = 0;

function yakin(ad: string, bulunan: unknown, beklenen: unknown): void {
  const a = JSON.stringify(bulunan);
  const b = JSON.stringify(beklenen);
  if (a === b) gecen++;
  else {
    kalan++;
    console.log(`  ⛔ ${ad}\n     bulunan : ${a}\n     beklenen: ${b}`);
  }
}
function dogru(ad: string, kosul: boolean): void {
  yakin(ad, kosul, true);
}

/**
 * ⚠ `sessionStorage` TAKLİDİ — gövde tarayıcı API'sine bağlı ve bekçi
 * Node'da koşuyor. Taklit ETMESEYDİM gövde `catch`e düşer, her ölçüt
 * "güvenli" görünür ve HİÇBİR ŞEY ÖLÇÜLMEZDİ (yalancı yeşil).
 */
const depo = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  sessionStorage: {
    getItem: (k: string) => depo.get(k) ?? null,
    setItem: (k: string, v: string) => void depo.set(k, v),
  },
};

/**
 * ⚠ `import` TAKLİTTEN SONRA — üst satırdaki `window` kurulmadan modül
 * yüklenirse gövde tarayıcı API'sini bulamaz. Statik `import` dosyanın
 * başına kaldırılacağı için `require` kullanılıyor.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const {
  sonListeyiHatirla,
  hatirlananSonListe,
  listeyiHatirla,
  hatirlananListe,
} = require("../src/lib/liste-hafizasi") as typeof import("../src/lib/liste-hafizasi");

// ═══════════════════════════════════════════════════════════════════════════
// 1) GENEL HAFIZA — YAZ, OKU, ETİKETİ TAŞI
// ═══════════════════════════════════════════════════════════════════════════
{
  depo.clear();
  sonListeyiHatirla({
    temel: "/stok",
    adres: "/stok?yas=61-90&sirala=adet",
    etiket: "Stok",
  });
  const son = hatirlananSonListe();
  yakin("genel hafıza: adres taşınıyor", son?.adres, "/stok?yas=61-90&sirala=adet");
  /** ⛔ ETİKET DE TAŞINIYOR — bağlantının metni bundan geliyor. */
  yakin("genel hafıza: ETİKET taşınıyor", son?.etiket, "Stok");
  yakin("genel hafıza: taban taşınıyor", son?.temel, "/stok");

  /** İkinci liste ilkini EZER — "en son gördüğüm" tekildir. */
  sonListeyiHatirla({
    temel: "/rapor/urunler",
    adres: "/rapor/urunler?eksen=stok",
    etiket: "Ürün analizi",
  });
  yakin(
    "genel hafıza: en SON yazılan geçerli",
    hatirlananSonListe()?.etiket,
    "Ürün analizi",
  );

  kosanBolumler.push("genel-hafiza");
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) GÜVENLİK — DEPODAN GELEN DEĞER GEZİNME HEDEFİNE DÖNÜŞÜYOR
// ═══════════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ YAZMA TARAFI İZOLE ÖLÇÜLÜYOR — DEPO BOŞ MU DİYE.
   *
   * İlk yazımda `hatirlananSonListe() === null` bakıyordum ve YAZMA
   * kontrolünü kaldıran mutasyon KAÇTI: okuma tarafı aynı kontrolü yaptığı
   * için sonuç yine `null` geliyordu. İki kapı aynı şeyi koruyorsa, birini
   * kaldırmak ötekinin arkasında görünmez kalır.
   * _(Anayasa: "zincir, halkalarının varlığıyla değil bağlantısıyla
   * sınanır" — burada iki halka birbirini maskeliyordu.)_
   */
  const depoBos = () => depo.get("selliora:liste:__son__") ?? null;

  depo.clear();
  /** ⛔ Taban `/` KABUL EDİLMEZ: onunla HER adres doğrulamayı geçerdi. */
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERMELİ.
   * İlk yazımda `adres: "/kotu"` kullandım ve `guvenliTaban`ı kaldıran
   * mutasyon KAÇTI: o adres zaten `guvenliAdres`e takılıyordu, yani
   * `guvenliTaban` hiç değerlendirilmiyordu. Test kuralı değil TESADÜFÜ
   * sınıyordu. `adres: "/"` ise `guvenliAdres`i GEÇER (kalan boş) ve
   * yalnız `guvenliTaban`a takılır — ayrım artık görünür.
   */
  sonListeyiHatirla({ temel: "/", adres: "/", etiket: "Panel" });
  yakin("güvenlik: taban '/' YAZILMIYOR (depo boş)", depoBos(), null);
  yakin("güvenlik: taban '/' okunmuyor", hatirlananSonListe(), null);

  depo.clear();
  sonListeyiHatirla({
    temel: "//kotu.com",
    adres: "//kotu.com/x",
    etiket: "X",
  });
  yakin("güvenlik: protokolsüz mutlak taban reddediliyor", hatirlananSonListe(), null);

  depo.clear();
  /** Adres kendi tabanıyla başlamıyorsa reddedilir. */
  sonListeyiHatirla({ temel: "/stok", adres: "/satislar?x=1", etiket: "Stok" });
  yakin("güvenlik: adres tabanıyla başlamalı", hatirlananSonListe(), null);

  /**
   * ⛔ OKUMA TARAFI AYRICA ÖLÇÜLÜYOR — DEPOYA DOĞRUDAN ENJEKTE EDEREK.
   *
   * Yazma kapısı bozuk kaydı zaten geçirmiyorsa okuma kapısı HİÇ
   * TETİKLENMEZ ve onu kaldıran mutasyon kaçar — ilk turda tam bu oldu
   * (M2 ve M2b kaçtı). Depo başka bir sekmede, eski bir sürümde ya da elle
   * bozulmuş olabilir; okuma kendi başına savunmak ZORUNDA.
   *
   * ⚠ VE HER ÖRNEK YALNIZ BİR KAPIYA TAKILIYOR — ötekiler geçiyor. İki
   * kapıya birden takılan bir örnek, birini kaldıran mutasyonu ötekinin
   * arkasında gizler.
   */
  depo.clear();
  /** Taban GEÇERLİ, adres yabancı → yalnız ADRES kapısı değerlendirilir. */
  depo.set(
    "selliora:liste:__son__",
    JSON.stringify({ temel: "/stok", adres: "/kotu-site", etiket: "Stok" }),
  );
  yakin(
    "güvenlik: DEPODAKİ yabancı adres OKUMADA eleniyor",
    hatirlananSonListe(),
    null,
  );

  depo.clear();
  /**
   * Adres tabanıyla TAM EŞİT (`kalan` boş) → `guvenliAdres` bunu GEÇİRİR.
   * Elenmesinin tek sebebi `guvenliTaban` olabilir.
   */
  depo.set(
    "selliora:liste:__son__",
    JSON.stringify({ temel: "//kotu.com", adres: "//kotu.com", etiket: "X" }),
  );
  yakin(
    "güvenlik: DEPODAKİ bozuk taban OKUMADA eleniyor",
    hatirlananSonListe(),
    null,
  );

  depo.clear();
  depo.set(
    "selliora:liste:__son__",
    JSON.stringify({ temel: "/stok", adres: "/stok", etiket: "" }),
  );
  yakin(
    "güvenlik: DEPODAKİ boş etiket OKUMADA eleniyor",
    hatirlananSonListe(),
    null,
  );

  depo.clear();
  sonListeyiHatirla({ temel: "/stok", adres: "/stok", etiket: "" });
  yakin("güvenlik: boş etiket YAZILMIYOR (depo boş)", depoBos(), null);
  yakin("güvenlik: boş etiket okunmuyor", hatirlananSonListe(), null);

  depo.clear();
  sonListeyiHatirla({
    temel: "/stok",
    adres: "/stok",
    etiket: "x".repeat(200),
  });
  yakin("güvenlik: şişmiş etiket YAZILMIYOR (depo boş)", depoBos(), null);

  /** ⛔ BOZUK KAYIT SESSİZCE KULLANILMAZ — çağıran düz adresine düşer. */
  depo.clear();
  depo.set("selliora:liste:__son__", "{bozuk json");
  yakin("güvenlik: bozuk JSON null döner", hatirlananSonListe(), null);
  depo.clear();
  depo.set("selliora:liste:__son__", JSON.stringify({ temel: "/stok" }));
  yakin("güvenlik: eksik alan null döner", hatirlananSonListe(), null);

  kosanBolumler.push("guvenlik");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3) ESKİ HAFIZA BOZULMADI — genel olan onun ÜSTÜNE bindi, yerine geçmedi
// ═══════════════════════════════════════════════════════════════════════════
{
  depo.clear();
  listeyiHatirla("/urunler", "/urunler?q=lego");
  yakin(
    "taban başına hafıza hâlâ çalışıyor",
    hatirlananListe("/urunler"),
    "/urunler?q=lego",
  );
  /** İki hafıza AYRI anahtarlarda — biri ötekini ezmiyor. */
  sonListeyiHatirla({
    temel: "/stok",
    adres: "/stok?yas=181%2B",
    etiket: "Stok",
  });
  yakin(
    "iki hafıza birbirini EZMİYOR",
    hatirlananListe("/urunler"),
    "/urunler?q=lego",
  );
  yakin("  ...genel olan da yerinde", hatirlananSonListe()?.temel, "/stok");

  kosanBolumler.push("eski-hafiza");
}

// ═══════════════════════════════════════════════════════════════════════════
// 4) EKRAN — HEDEF VE METİN TEK KAYNAKTAN
// ═══════════════════════════════════════════════════════════════════════════
{
  const bilesen = readFileSync(
    "src/components/liste-hafizasi-bilesenleri.tsx",
    "utf8",
  );

  /**
   * ⛔ HEDEF İLE ETİKET AYRI AYRI SEÇİLEMEZ. Ayrı seçilseydi bağlantı
   * `/satislar`a giderken "‹ Ürünler" yazabilirdi. Ölçüt ikisinin AYNI
   * okumadan geldiğini arıyor.
   */
  dogru(
    "ekran: hedef ve etiket TEK okumadan geliyor",
    /const secim = useSyncExternalStore\(/.test(bilesen) &&
      /const \{ h: hedef, e: etiket \} = JSON\.parse\(secim\)/.test(bilesen),
  );
  dogru(
    "ekran: etiket varsa ONU basıyor, yoksa çağıranın metnini",
    /etiket === null \? children : etiket/.test(bilesen),
  );
  /**
   * ⛔ VARLIK VE SIRA AYRI ÖLÇÜLÜYOR — `indexOf` TUZAĞI.
   *
   * İlk yazımda yalnız `indexOf(a) < indexOf(b)` vardı ve genel hafıza
   * okumasını TAMAMEN SİLEN mutasyon KAÇTI: `indexOf` bulamayınca `-1`
   * döner ve `-1 < n` DOĞRUDUR. Yani ölçüt, ölçmesi gereken şey yok
   * olduğunda yeşil yanıyordu.
   * _(Anayasa: "sıfır üç farklı şey olabilir" — burada `-1` "yok" demekti,
   * ölçüt onu "önce geliyor" diye okudu.)_
   */
  const iGenel = bilesen.indexOf("hatirlananSonListe()");
  const iTaban = bilesen.indexOf("hatirlananListe(href)");
  dogru("ekran: genel hafıza okunuyor", iGenel >= 0);
  dogru("ekran: taban başına hafıza da okunuyor (yedek)", iTaban >= 0);
  dogru("ekran: genel hafıza ÖNCE deneniyor", iGenel >= 0 && iGenel < iTaban);
  /** Sunucu görüntüsü DÜZ adres — JavaScript yoksa bağlantı yine çalışır. */
  dogru(
    "ekran: sunucu görüntüsü düz adres (JS'siz çalışır)",
    /\(\) => JSON\.stringify\(\{ h: href, e: null \}\)/.test(bilesen),
  );

  /**
   * ⛔ ETİKET LİSTENİN KENDİSİNDEN — EŞLEME TABLOSU YOK.
   * Tablo olsaydı yedinci liste eklendiğinde sessizce eskirdi.
   */
  dogru(
    "ekran: ListeyiHatirla etiketi ZORUNLU alıyor",
    /etiket: string;/.test(bilesen) && /sonListeyiHatirla\(\{ temel, adres, etiket \}\)/.test(bilesen),
  );

  /**
   * ⭐ DESEN YASAĞI, DOSYA LİSTESİ DEĞİL: hafızaya yazan her çağrı etiket
   * vermek ZORUNDA. TypeScript bunu zaten zorluyor (prop zorunlu); ölçüt
   * prop'un OPSİYONELE çevrilmesini yakalar.
   */
  dogru(
    "ekran: etiket opsiyonel DEĞİL (yarın eklenen liste de vermek zorunda)",
    !/etiket\?: string/.test(bilesen),
  );

  kosanBolumler.push("ekran");
}

// ═══════════════════════════════════════════════════════════════════════════
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `\n⛔ KOŞUM YARIM KALDI — sonuç GEÇERSİZ.` +
      `\n   beklenen ${BOLUM_SAYISI} · koşan ${kosanBolumler.length}` +
      `\n   koşanlar: ${kosanBolumler.join(", ")}`,
  );
  process.exit(1);
}
if (kalan === 0) {
  console.log(`✓  ${gecen}/${gecen} ölçüt geçti (${BOLUM_SAYISI} bölüm)`);
} else {
  console.log(`\n⛔ ${kalan} ölçüt DÜŞTÜ (${gecen} geçti)`);
  process.exit(1);
}
