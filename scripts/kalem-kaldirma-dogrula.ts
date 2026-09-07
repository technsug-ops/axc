import { readFileSync } from "node:fs";

import {
  geriAlmaPlani,
  kaldirmaImzasi,
  kaldirmaPlani,
  KALDIRMA_SEBEPLERI,
  type KaldirmaGirdisi,
} from "../src/lib/kalem-kaldirma";

/**
 * ============================================================================
 *  KALEM KALDIRMA BEKÇİSİ (K78, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  ⭐ ÖNCE SAF GÖVDE ÇAĞRILIR, DESEN ARANMAZ. Kuralların tamamı
 *  `lib/kalem-kaldirma.ts`te saf; bekçi onları ÇALIŞTIRIP değerine bakıyor.
 *  _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz" —
 *  desen yanlış yerde bulunamaz, çünkü desen aranmaz.)_
 *
 *  Kaynak taraması yalnız GÖVDEYE TAŞINAMAYAN iki şey için var: yazma
 *  katmanının hangi alanı yazdığı (`sourceMovementId`) ve kâr tazelemesinin
 *  çağrıldığı. İkisi de kullanım bloğuna daraltılmış durumda.
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

/** Deseni DOSYANIN TAMAMINDA değil, kullanım bloğunda arar. */
function blok(metin: string, capa: string, uzunluk: number): string {
  const i = metin.indexOf(capa);
  if (i < 0) return "";
  return metin.slice(i, i + uzunluk);
}

function yorumsuz(kaynak: string): string {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** Ayrımın İKİ YAKASI: iki kalemli, iadesiz, açık çıkışı olan bir satış. */
function temelGirdi(): KaldirmaGirdisi {
  return {
    kaldirilmisMi: false,
    satisIptalliMi: false,
    kalemIadeAdedi: 0,
    gecerliKalemSayisi: 2,
    sebep: "MUKERRER_SATIR",
    not: null,
    cikislar: [
      {
        variantId: "v1",
        adet: 1,
        birimMaliyet: "1039.0000",
        birimMaliyetParaBirimi: "TRY",
        locationId: "raf-1",
      },
    ],
    etki: { ciro: 1039, net2: 120.5, paraBirimi: "TRY", kalanKalemSayisi: 1 },
  };
}

// ═══ 1) KAPILAR — her biri AYRI ölçülür ════════════════════════════════════
console.log("\n1) KAPILAR");

{
  const p = kaldirmaPlani(temelGirdi());
  kontrol("geçerli kalem kaldırılabilir", p.olur === true);
  kontrol(
    "geri dönen adet açık çıkıştan gelir",
    p.olur === true && p.geriDonenAdet === 1,
  );
}

kontrol(
  "ZATEN_KALDIRILDI — ikinci kaldırma stoğu iki kez sokardı",
  (() => {
    const p = kaldirmaPlani({ ...temelGirdi(), kaldirilmisMi: true });
    return !p.olur && p.engel === "ZATEN_KALDIRILDI";
  })(),
);

kontrol(
  "SATIS_IPTAL — iptal zaten aynayı yazdı",
  (() => {
    const p = kaldirmaPlani({ ...temelGirdi(), satisIptalliMi: true });
    return !p.olur && p.engel === "SATIS_IPTAL";
  })(),
);

kontrol(
  "IADE_VAR — iade 'satıldı' der, kaldırma 'satılmadı'",
  (() => {
    const p = kaldirmaPlani({ ...temelGirdi(), kalemIadeAdedi: 1 });
    return !p.olur && p.engel === "IADE_VAR";
  })(),
);

kontrol(
  "SON_KALEM — cirosuz satış bırakmaz, iptale yönlendirir",
  (() => {
    const p = kaldirmaPlani({ ...temelGirdi(), gecerliKalemSayisi: 1 });
    return !p.olur && p.engel === "SON_KALEM";
  })(),
);

/** ⚠ AYRIMIN ÖTEKİ YAKASI: 2 kalem GEÇMELİ, yoksa kapı hep kapalı olurdu. */
kontrol(
  "iki kalemli satışta SON_KALEM kapısı AÇIK (yanlış yanma yok)",
  kaldirmaPlani({ ...temelGirdi(), gecerliKalemSayisi: 2 }).olur === true,
);

kontrol(
  "SEBEP_YOK — sebepsiz kaldırma kaydedilemez",
  (() => {
    const p = kaldirmaPlani({ ...temelGirdi(), sebep: null });
    return !p.olur && p.engel === "SEBEP_YOK";
  })(),
);

/**
 * ⚠ SIRA ÖLÇÜLÜR: iadesi OLAN bir SON kalemde hangi engel döner? İade kapısı
 * önce gelmeli — kullanıcıya "iptal et" demek yanlış yol gösterirdi, çünkü
 * iadeli satış zaten iptal EDİLEMEZ.
 */
kontrol(
  "iade + son kalem birlikteyken IADE_VAR döner (doğru yol gösterir)",
  (() => {
    const p = kaldirmaPlani({
      ...temelGirdi(),
      kalemIadeAdedi: 1,
      gecerliKalemSayisi: 1,
    });
    return !p.olur && p.engel === "IADE_VAR";
  })(),
);
kosanBolumler.push("kapılar");

// ═══ 2) AYNA — MALİYET KOPYALANIR, KAYNAK BAĞI YAZILMAZ ════════════════════
console.log("\n2) AYNA HAREKETİ");

{
  const p = kaldirmaPlani({
    ...temelGirdi(),
    cikislar: [
      {
        variantId: "v1",
        adet: 2,
        birimMaliyet: "1039.0000",
        birimMaliyetParaBirimi: "TRY",
        locationId: "raf-1",
      },
      {
        variantId: "v1",
        adet: 3,
        birimMaliyet: "1792.5000",
        birimMaliyetParaBirimi: "TRY",
        locationId: "raf-2",
      },
    ],
  });
  kontrol("çok partili çıkış ayrı ayrı aynalanır", p.olur && p.hareketler.length === 2);
  kontrol("geri dönen adet toplanır (2+3)", p.olur && p.geriDonenAdet === 5);
  kontrol(
    "maliyet AYNEN kopyalanır — uydurulmaz",
    p.olur &&
      p.hareketler[0].birimMaliyet === "1039.0000" &&
      p.hareketler[1].birimMaliyet === "1792.5000",
  );
  kontrol(
    "raf korunur",
    p.olur &&
      p.hareketler[0].locationId === "raf-1" &&
      p.hareketler[1].locationId === "raf-2",
  );
  /**
   * ⛔ K96 — POZİTİF HAREKET KAYNAK BAĞI TAŞIMAZ. Taşırsa aynı adet FIFO'ya
   * iki kez girer (ledger 1, FIFO 2). Ölçüt ALANIN VARLIĞINA bakar: biri
   * `sourceMovementId` eklerse bu kırmızı yanar.
   */
  kontrol(
    "ayna `sourceMovementId` TAŞIMAZ (K96 hayalet parti dersi)",
    p.olur &&
      p.hareketler.every(
        (h) => !Object.prototype.hasOwnProperty.call(h, "sourceMovementId"),
      ),
  );
  kontrol("hareketler POZİTİF (stoğa giriş)", p.olur && p.hareketler.every((h) => h.quantityDelta > 0));
}

kontrol(
  "sıfır adetli çıkış hareket ÜRETMEZ",
  (() => {
    const p = kaldirmaPlani({
      ...temelGirdi(),
      cikislar: [
        {
          variantId: "v1",
          adet: 0,
          birimMaliyet: "1039.0000",
          birimMaliyetParaBirimi: "TRY",
          locationId: null,
        },
      ],
    });
    return p.olur === true && p.hareketler.length === 0 && p.geriDonenAdet === 0;
  })(),
);

kontrol(
  "maliyetsiz çıkış null taşır — SIFIR yazılmaz",
  (() => {
    const p = kaldirmaPlani({
      ...temelGirdi(),
      cikislar: [
        {
          variantId: "v1",
          adet: 1,
          birimMaliyet: null,
          birimMaliyetParaBirimi: null,
          locationId: null,
        },
      ],
    });
    return p.olur === true && p.hareketler[0].birimMaliyet === null;
  })(),
);
kosanBolumler.push("ayna");

// ═══ 3) İMZA — "ONAY GÖSTERİLENE VERİLMİŞTİR" ══════════════════════════════
console.log("\n3) PLAN İMZASI");

{
  const a = kaldirmaImzasi(kaldirmaPlani(temelGirdi()));
  kontrol("aynı plan aynı imzayı verir", a === kaldirmaImzasi(kaldirmaPlani(temelGirdi())));

  const g = temelGirdi();
  kontrol(
    "adet değişince imza DEĞİŞİR",
    a !==
      kaldirmaImzasi(
        kaldirmaPlani({ ...g, cikislar: [{ ...g.cikislar[0], adet: 2 }] }),
      ),
  );
  kontrol(
    "maliyet değişince imza DEĞİŞİR",
    a !==
      kaldirmaImzasi(
        kaldirmaPlani({
          ...g,
          cikislar: [{ ...g.cikislar[0], birimMaliyet: "1.0000" }],
        }),
      ),
  );
  kontrol(
    "ciro değişince imza DEĞİŞİR (araya düzenleme girmişse yakalanır)",
    a !== kaldirmaImzasi(kaldirmaPlani({ ...g, etki: { ...g.etki, ciro: 1 } })),
  );
  kontrol(
    "kalan kalem sayısı değişince imza DEĞİŞİR",
    a !==
      kaldirmaImzasi(
        kaldirmaPlani({ ...g, etki: { ...g.etki, kalanKalemSayisi: 5 } }),
      ),
  );
  kontrol(
    "engel imzası plandan AYRILIR",
    kaldirmaImzasi(kaldirmaPlani({ ...g, kaldirilmisMi: true })) ===
      "ENGEL:ZATEN_KALDIRILDI",
  );
  kontrol(
    "iki farklı engel iki farklı imza verir",
    kaldirmaImzasi(kaldirmaPlani({ ...g, kaldirilmisMi: true })) !==
      kaldirmaImzasi(kaldirmaPlani({ ...g, satisIptalliMi: true })),
  );
}
kosanBolumler.push("imza");

// ═══ 4) SEBEP KÜMESİ — İADE YAPISAL OLARAK DIŞARIDA ════════════════════════
console.log("\n4) SEBEP KÜMESİ");

kontrol(
  "TABAN DOLU — sebep listesi boş değil (" + KALDIRMA_SEBEPLERI.length + ")",
  KALDIRMA_SEBEPLERI.length >= 2,
);
/**
 * ⛔ MÜŞTERİ İADESİ SEBEP OLAMAZ. Listede öyle bir seçenek olsaydı operatör
 * en yakın kelimeyi seçer ve gerçek bir satış deftere hiç olmamış gibi
 * geçerdi: ciro, KDV matrahı ve hakediş beklentisi sessizce eksilirdi.
 */
kontrol(
  "sebep listesinde müşteri/iade geçmiyor",
  KALDIRMA_SEBEPLERI.every((s) => !/IADE|MUSTERI|DEGISIM/.test(s)),
);

{
  /** Şema enumu da aynı şeyi söylemeli — liste ile enum ayrışamaz. */
  const sema = readFileSync("prisma/schema.prisma", "utf8");
  /**
   * ⚠ PENCERE SABİT SAYIYLA KESİLMEZ — İLK YAZIMDA TAM BU OLDU: 400 karakter
   * bir SONRAKİ enuma taşıyordu ve ölçüt 7 değer sayıyordu (2 + 5). Sınır
   * enumun KENDİ kapanışı: gövde büyüse de küçülse de doğru yerde biter.
   * _(Anayasa: "kapsam daraltılır — ve pencere ÖLÇÜLÜR".)_
   */
  const acilis = sema.indexOf("enum SatisKalemKaldirmaSebebi {");
  const kapanis = acilis < 0 ? -1 : sema.indexOf("}", acilis);
  const govde = acilis < 0 || kapanis < 0 ? "" : sema.slice(acilis, kapanis);
  const degerler = govde
    .split(/\r?\n/)
    .slice(1)
    .map((s) => s.replace(/\/\/.*$/, "").trim())
    .filter((s) => /^[A-Z_]+$/.test(s));
  kontrol(
    "TABAN DOLU — şema enumu okunabildi (" + degerler.length + ")",
    degerler.length >= 2,
  );
  kontrol(
    "şema enumu ile ekran listesi AYNI kümedir",
    degerler.length === KALDIRMA_SEBEPLERI.length &&
      degerler.every((d) => (KALDIRMA_SEBEPLERI as readonly string[]).includes(d)),
  );
  kontrol(
    "şema enumunda müşteri iadesi değeri YOK",
    degerler.every((d) => !/IADE|MUSTERI|DEGISIM/.test(d)),
  );
}
kosanBolumler.push("sebep kümesi");

// ═══ 5) GERİ ALMA ══════════════════════════════════════════════════════════
console.log("\n5) GERİ ALMA");

kontrol(
  "kaldırılmamış kalem geri alınamaz",
  (() => {
    const p = geriAlmaPlani({
      kaldirilmisMi: false,
      acikAynaAdedi: 2,
      aynaAdedi: 2,
    });
    return !p.olur && p.engel === "KALDIRILMAMIS";
  })(),
);

kontrol(
  "ayna tamamen açıksa geri alınır",
  (() => {
    const p = geriAlmaPlani({
      kaldirilmisMi: true,
      acikAynaAdedi: 2,
      aynaAdedi: 2,
    });
    return p.olur === true && p.dusulecekAdet === 2;
  })(),
);

/** ⚠ KISMİ TÜKETİM DE ENGELDİR — eksi stok üretirdi. */
kontrol(
  "ayna KISMEN tüketilmişse geri alınamaz",
  (() => {
    const p = geriAlmaPlani({
      kaldirilmisMi: true,
      acikAynaAdedi: 1,
      aynaAdedi: 2,
    });
    return !p.olur && p.engel === "AYNA_KAPANDI";
  })(),
);

kontrol(
  "ayna tamamen tüketilmişse geri alınamaz",
  (() => {
    const p = geriAlmaPlani({
      kaldirilmisMi: true,
      acikAynaAdedi: 0,
      aynaAdedi: 2,
    });
    return !p.olur && p.engel === "AYNA_KAPANDI";
  })(),
);
kosanBolumler.push("geri alma");

// ═══ 6) YAZMA KATMANI — gövdeye taşınamayan iki şey ════════════════════════
console.log("\n6) YAZMA KATMANI");

{
  const veri = yorumsuz(readFileSync("src/lib/kalem-kaldirma-veri.ts", "utf8"));

  /** ⭐ ÇAPA KULLANIMA BAĞLI — `SALE_CANCEL_IN` yazan create bloğuna. */
  const aynaBloku = blok(veri, 'type: "SALE_CANCEL_IN"', 700);
  kontrol(
    "TABAN DOLU — ayna yazma bloğu bulundu",
    aynaBloku.includes("stockMovement") || aynaBloku.includes("quantityDelta"),
  );
  kontrol(
    "ayna bloğu `sourceMovementId` YAZMIYOR (K96)",
    aynaBloku !== "" && !/sourceMovementId/.test(aynaBloku),
  );
  kontrol(
    "ayna bloğu `saleItemId` YAZIYOR — geri alma yolu buna bağlı",
    /saleItemId:/.test(aynaBloku),
  );

  /** Geri almanın tersi NEGATİF ve bağ YAZILIR — aynayı kapatan tek şey o. */
  const geriBloku = blok(veri, 'type: "ADJUSTMENT"', 700);
  kontrol(
    "TABAN DOLU — geri alma yazma bloğu bulundu",
    geriBloku.includes("quantityDelta"),
  );
  kontrol(
    "geri alma NEGATİF yazar",
    /quantityDelta:\s*-h\.quantityDelta/.test(geriBloku),
  );
  kontrol(
    "geri alma `sourceMovementId` YAZAR (ayna partisini kapatır)",
    /sourceMovementId:\s*h\.id/.test(geriBloku),
  );

  /**
   * ⛔ KÂR TAZELEMESİ ŞART — kalem süzülse bile satışın NET damgası eski
   * kümeyle hesaplanmış kalırdı: ciro düşer, NET düşmez, marj şişer.
   * Ölçüt SAYIYA bağlı: iki yol da (kaldırma + geri alma) tazelemeli.
   */
  const tazeleme = (veri.match(/await satisKarTazele\(/g) ?? []).length;
  kontrol(
    "kaldırma VE geri alma kârı tazeler (" + tazeleme + " çağrı)",
    tazeleme === 2,
  );

  /** Süzgeç ortak gövdeden — ikinci bir ölçüt yazılmamış. */
  kontrol(
    "geçerli kalem sayımı `KALEM_GECERLI` ile yapılır",
    /saleItem\.count\(\{[\s\S]{0,120}KALEM_GECERLI/.test(veri),
  );
  /**
   * ⛔ ÇIPLAK SÜZGEÇ YASAĞI — AMA YAZMA DEĞİL, OKUMA. `data: { kaldirildiAt:
   * null }` geri almanın kendisidir ve meşrudur; yasak olan bir SORGUNUN
   * `where`ine elle koşul yazmak. İlk yazımda ölçüt ikisini ayırt etmiyordu
   * ve geri almanın kendi yazımına kırmızı yanıyordu — ölçüt bir KURALI
   * değil, kelimenin varlığını sınıyordu.
   */
  const cıplakSuzgec = [...veri.matchAll(/kaldirildiAt:\s*null/g)].filter(
    (m) => {
      const once = veri.slice(Math.max(0, m.index - 140), m.index);
      return /where/.test(once) && !/data:\s*\{[^}]*$/.test(once);
    },
  );
  kontrol(
    "sorgu süzgecine elle `kaldirildiAt: null` YAZILMAMIŞ (ikinci ölçüt yasağı)",
    cıplakSuzgec.length === 0,
  );
}
kosanBolumler.push("yazma katmanı");

// ═══ ÖZET ══════════════════════════════════════════════════════════════════
const BOLUM_SAYISI = 6;
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `\nKOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})\n`,
  );
  process.exit(1);
}

console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    " (" +
    gecen +
    "/" +
    (gecen + hata) +
    ")\n",
);
process.exit(hata === 0 ? 0 : 1);
