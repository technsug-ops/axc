import {
  yeterliVeriVarMi,
  tavsiyePaketiKur,
  HIZ_GUVEN_TABANI,
  type TavsiyeBicim,
} from "../src/lib/tavsiye/veri-toplama";
import { tavsiyeYedekAnlatiOlustur } from "../src/lib/tavsiye/yedek-anlati";
import { anahtariGizle, ikiKatmanliAnahtarOku } from "../src/lib/llm/saglayicilar/ortak-anahtar";
import { aktifSaglayici } from "../src/lib/llm/saglayicilar";
import type { KartOzeti } from "../src/lib/urun-karti";
import type { KartVerisi } from "../src/lib/urun-karti-verisi";

/**
 * ============================================================================
 *  ÜRÜN TAVSİYESİ BEKÇİSİ (K-TAVSIYE)
 * ----------------------------------------------------------------------------
 *      npm run tavsiye:dogrula
 *
 *  Anti-halüsinasyon kapısının kendisi (`llmMetniDogrula`) burada YENİDEN
 *  SINANMAZ — değişmedi, `gunluk-ozet-mutasyon:kontrol` zaten kanıtlıyor.
 *  Bu bekçi yalnız BU ÖZELLİĞE özel yeni mantığı sınar: yeterlilik kapısı,
 *  saf paket kurucu, yedek anlatı.
 * ============================================================================
 */

let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, ipucu?: unknown) {
  if (kosul) {
    gecen++;
    console.log("  OK    " + ad);
  } else {
    hata++;
    console.log("  HATA  " + ad);
    if (ipucu !== undefined) console.log("        ", ipucu);
  }
}

console.log("\nÜRÜN TAVSİYESİ BEKÇİSİ (K-TAVSIYE)\n");

/** Tüm alanları makul varsayılanlarla dolduran taban — testler yalnız farkı yazar. */
function ozetTabani(ust: Partial<KartOzeti>): KartOzeti {
  return {
    satir: null,
    satisSayisi: 5,
    toplamAdet: 8,
    sonSatis: new Date("2026-09-01T00:00:00.000Z"),
    kanallar: ["Trendyol"],
    birimSatisFiyati: 500,
    birimNet2: 60,
    marj: 12,
    sermayeVerimi: 0.3,
    satilanBirimMaliyeti: 200,
    sonSatisNet2: 60,
    ortalamaMaliyet: 210,
    ortalamaSatisSuresi: 12,
    hizOrnekSayisi: 5,
    iadeAdedi: 0,
    iadeSayisi: 0,
    hesaplanamayanKalem: 0,
    zararliSatis: 0,
    tekSatisMi: false,
    hicSatilmamisMi: false,
    ...ust,
  };
}

/* ═══ ① yeterliVeriVarMi ═══════════════════════════════════════════════ */
console.log("  ── yeterliVeriVarMi");
kontrol(
  "hiç satılmamış → HIC_SATILMAMIS",
  (() => {
    const s = yeterliVeriVarMi(ozetTabani({ hicSatilmamisMi: true, satisSayisi: 0 }));
    return !s.yeterli && s.sebep === "HIC_SATILMAMIS";
  })(),
);
kontrol(
  "tek satış → TEK_SATIS",
  (() => {
    const s = yeterliVeriVarMi(ozetTabani({ tekSatisMi: true, satisSayisi: 1 }));
    return !s.yeterli && s.sebep === "TEK_SATIS";
  })(),
);
kontrol(
  "kârlılığın ÜÇÜ de null (ör. hep NO_COST) → KARLILIK_BILINMIYOR",
  (() => {
    const s = yeterliVeriVarMi(
      ozetTabani({ marj: null, sermayeVerimi: null, birimNet2: null }),
    );
    return !s.yeterli && s.sebep === "KARLILIK_BILINMIYOR";
  })(),
);
kontrol(
  "kârlılığın YALNIZ biri dolu olsa bile → yeterli (üçü BİRDEN null olmalı)",
  yeterliVeriVarMi(
    ozetTabani({ marj: null, sermayeVerimi: null, birimNet2: 60 }),
  ).yeterli,
);
kontrol(
  "sağlıklı ürün → yeterli",
  yeterliVeriVarMi(ozetTabani({})).yeterli,
);

/* ═══ ② tavsiyePaketiKur ═══════════════════════════════════════════════ */
console.log("\n  ── tavsiyePaketiKur");

const SAHTE_BICIM: TavsiyeBicim = {
  para: (t, p) => `${p}${t}`,
  sayi: (d) => String(d),
  yuzde: (d) => `%${d}`,
  sermayeVerimiMetni: (o) => (o === null ? null : `${o.toFixed(2)}x`),
};

function veriTabani(ust: {
  ozet?: Partial<KartOzeti>;
  veri?: Partial<KartVerisi>;
}): KartVerisi {
  return {
    varyant: {} as KartVerisi["varyant"],
    urunId: "u1",
    rafKodu: null,
    kategoriAdi: null,
    desi: null,
    kanalDesi: null,
    kdvKaynagi: "VARSAYILAN",
    eldekiAdet: 10,
    yasGun: 30,
    yasBandi: null,
    sonAlimMaliyeti: 180,
    sonAlimTarihi: new Date("2026-08-01T00:00:00.000Z"),
    sonAlimParaBirimi: "TRY",
    sonAlimTedarikcisi: null,
    sonAlimKodu: null,
    partiler: [],
    bagTanisi: "TEMIZ",
    sonAlimAcikMi: true,
    iadeSebepleri: [],
    paraBirimi: "TRY",
    ozet: ozetTabani(ust.ozet ?? {}),
    ...ust.veri,
  };
}

const IADE_ETIKETLERI = { HASARLI: "Hasarlı geldi" } as Record<string, string> as
  Parameters<typeof tavsiyePaketiKur>[2];

kontrol(
  "dolu alanlar hem SAYI hem BAĞLAM üretir",
  (() => {
    const paket = tavsiyePaketiKur(veriTabani({}), SAHTE_BICIM, IADE_ETIKETLERI);
    const marj = paket.sayilar.find((s) => s.anahtar === "marj");
    return (
      marj?.goruntu === "%12" &&
      paket.baglamlar.some((b) => b.anahtar === "marj") &&
      paket.sayilar.some((s) => s.anahtar === "eldekiAdet" && s.goruntu === "10")
    );
  })(),
);
kontrol(
  "null alan (marj) PAKETE HİÇ GİRMEZ — sıfır yazılmaz",
  (() => {
    const paket = tavsiyePaketiKur(
      veriTabani({ ozet: { marj: null } }),
      SAHTE_BICIM,
      IADE_ETIKETLERI,
    );
    return !paket.sayilar.some((s) => s.anahtar === "marj");
  })(),
);
kontrol(
  `hız çifti örneklem < ${HIZ_GUVEN_TABANI} ise İKİSİ BİRDEN düşer`,
  (() => {
    const paket = tavsiyePaketiKur(
      veriTabani({ ozet: { hizOrnekSayisi: HIZ_GUVEN_TABANI - 1 } }),
      SAHTE_BICIM,
      IADE_ETIKETLERI,
    );
    return (
      !paket.sayilar.some((s) => s.anahtar === "ortalamaSatisSuresi") &&
      !paket.sayilar.some((s) => s.anahtar === "hizOrnekSayisi")
    );
  })(),
);
kontrol(
  `hız çifti örneklem >= ${HIZ_GUVEN_TABANI} ise İKİSİ BİRDEN girer`,
  (() => {
    const paket = tavsiyePaketiKur(
      veriTabani({ ozet: { hizOrnekSayisi: HIZ_GUVEN_TABANI } }),
      SAHTE_BICIM,
      IADE_ETIKETLERI,
    );
    return (
      paket.sayilar.some((s) => s.anahtar === "ortalamaSatisSuresi") &&
      paket.sayilar.some((s) => s.anahtar === "hizOrnekSayisi")
    );
  })(),
);
kontrol(
  "sermayeVerimi goruntu'sü SAHTE_BICIM.sermayeVerimiMetni() çağrısıyla BİREBİR — ekrandan ayrışma regresyon kilidi",
  (() => {
    const paket = tavsiyePaketiKur(veriTabani({}), SAHTE_BICIM, IADE_ETIKETLERI);
    const sv = paket.sayilar.find((s) => s.anahtar === "sermayeVerimi");
    return sv?.goruntu === SAHTE_BICIM.sermayeVerimiMetni(0.3);
  })(),
);
kontrol(
  "sonAlimMaliyeti YALNIZ gerçek olarak girer — yön yorumu üretecek ikinci bir alan (delta/trend) YOK",
  (() => {
    const paket = tavsiyePaketiKur(veriTabani({}), SAHTE_BICIM, IADE_ETIKETLERI);
    const anahtarlar = paket.sayilar.map((s) => s.anahtar);
    return (
      anahtarlar.includes("sonAlimMaliyeti") &&
      !anahtarlar.some((a) => /fark|delta|trend|yon|degisim/i.test(a))
    );
  })(),
);
kontrol(
  "stokBagiSupheli — bagTanisi SUPHELI ise true",
  tavsiyePaketiKur(
    veriTabani({ veri: { bagTanisi: "SUPHELI" } }),
    SAHTE_BICIM,
    IADE_ETIKETLERI,
  ).stokBagiSupheli,
);
kontrol(
  "stokBagiSupheli — bagTanisi TEMIZ ise false",
  !tavsiyePaketiKur(veriTabani({}), SAHTE_BICIM, IADE_ETIKETLERI).stokBagiSupheli,
);
kontrol(
  "iade sebebi anahtarı ve Türkçe etiketi doğru eşleşiyor",
  (() => {
    const paket = tavsiyePaketiKur(
      veriTabani({ veri: { iadeSebepleri: [{ sebep: "HASARLI", sayi: 2 }] } }),
      SAHTE_BICIM,
      IADE_ETIKETLERI,
    );
    const baglam = paket.baglamlar.find((b) => b.anahtar === "iadeSebep_HASARLI");
    return (
      paket.sayilar.some((s) => s.anahtar === "iadeSebep_HASARLI" && s.goruntu === "2") &&
      (baglam?.aciklama.includes("Hasarlı geldi") ?? false)
    );
  })(),
);

/* ═══ ③ tavsiyeYedekAnlatiOlustur ═══════════════════════════════════════ */
console.log("\n  ── tavsiyeYedekAnlatiOlustur");
kontrol(
  "yalnız kaynaklı goruntu değerlerini listeler, başka metin YOK",
  (() => {
    const paket = tavsiyePaketiKur(veriTabani({}), SAHTE_BICIM, IADE_ETIKETLERI);
    const metin = tavsiyeYedekAnlatiOlustur(paket);
    return paket.sayilar.every((s) => metin.includes(s.goruntu));
  })(),
);
kontrol(
  "boş pakette 'yeterli veri yok' mesajı",
  tavsiyeYedekAnlatiOlustur({ sayilar: [], baglamlar: [], stokBagiSupheli: false }) ===
    "Bu ürün için yeterli veri yok.",
);

/* ═══ ④ SIR GÜVENLİĞİ — canlı bulgu 11.09.2026 ═══════════════════════════
 * Vercel'de bir değişkenin değerine yanlışlıkla iki satır yapıştırıldı
 * (anahtar + `OZET_LLM_SAGLAYICI=gemini`), SDK "invalid header value" ile
 * çöktü ve HAM anahtar hata mesajının İÇİNDE canlı AuditLog'a yazıldı.
 * İki ayrı savunma: (a) çok satırlı değerden yalnız İLK SATIR okunur,
 * (b) hata mesajından anahtar HER İHTİMALE KARŞI ayrıca temizlenir. */
console.log("\n  ── sır güvenliği (çok satırlı yapıştırma + hata mesajı sızıntısı)");
kontrol(
  "ikiKatmanliAnahtarOku — süreç ortamında ÇOK SATIRLI değerin yalnız İLK satırı okunur",
  (() => {
    const eski = process.env.TAVSIYE_DOGRULA_COK_SATIRLI;
    process.env.TAVSIYE_DOGRULA_COK_SATIRLI = "gercek-anahtar-123\nOZET_LLM_SAGLAYICI=gemini";
    const sonuc = ikiKatmanliAnahtarOku("TAVSIYE_DOGRULA_COK_SATIRLI");
    if (eski === undefined) delete process.env.TAVSIYE_DOGRULA_COK_SATIRLI;
    else process.env.TAVSIYE_DOGRULA_COK_SATIRLI = eski;
    return sonuc === "gercek-anahtar-123";
  })(),
);
kontrol(
  "anahtariGizle — hata metnindeki anahtar [ANAHTAR GİZLENDİ] ile değişir",
  anahtariGizle(
    'Headers.append: "Bearer cokgizlibiranahtar123456" is an invalid header value.',
    "cokgizlibiranahtar123456",
  ) === 'Headers.append: "Bearer [ANAHTAR GİZLENDİ]" is an invalid header value.',
);
kontrol(
  "anahtariGizle — anahtar mesajda YOKSA metin değişmeden döner",
  anahtariGizle("başka bir hata", "cokgizlibiranahtar123456") === "başka bir hata",
);

/* ═══ ⑤ Geriye uyumlu sağlayıcı seçimi ortam değişkeni ══════════════════ */
console.log("\n  ── aktifSaglayici geriye-uyum (LLM_SAGLAYICI ↔ OZET_LLM_SAGLAYICI)");
kontrol(
  "tanımsız bir değişken null döner (dosyada da yoksa)",
  ikiKatmanliAnahtarOku("TAVSIYE_DOGRULA_HICBIR_ZAMAN_TANIMLANMAYACAK_DEGISKEN") === null,
);
{
  const eskiLLM = process.env.LLM_SAGLAYICI;
  const eskiOzet = process.env.OZET_LLM_SAGLAYICI;
  delete process.env.LLM_SAGLAYICI;
  process.env.OZET_LLM_SAGLAYICI = "anthropic";
  kontrol(
    "LLM_SAGLAYICI TANIMSIZSA eski OZET_LLM_SAGLAYICI'ya düşer (K-TAVSIYE taşımasının tek yeni mantığı)",
    aktifSaglayici().ad === "anthropic",
  );
  process.env.LLM_SAGLAYICI = "gemini";
  kontrol(
    "LLM_SAGLAYICI TANIMLIYSA eskisini EZER (yeni ad öncelikli)",
    aktifSaglayici().ad === "gemini",
  );
  if (eskiLLM === undefined) delete process.env.LLM_SAGLAYICI;
  else process.env.LLM_SAGLAYICI = eskiLLM;
  if (eskiOzet === undefined) delete process.env.OZET_LLM_SAGLAYICI;
  else process.env.OZET_LLM_SAGLAYICI = eskiOzet;
}

console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    ` (${gecen}/${gecen + hata})\n`,
);
process.exit(hata === 0 ? 0 : 1);
