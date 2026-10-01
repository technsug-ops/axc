import { kaynakOku } from "./kaynak-oku";

import { kalemGecerliMi } from "./n11/yazici";
import {
  HB_CANLI_YAZMA_ACIK,
  hbYazmaAcikMi,
  kalemGecerliMi as hbKalemGecerliMi,
  kanaldakiIlanCoz as hbKanaldakiIlanCoz,
  stokFiyatGonder as hbStokFiyatGonder,
  yuklemeDurumuCoz as hbYuklemeDurumuCoz,
} from "./hb/yazici";
import { parcaHukmu } from "../src/lib/kanal-gonderim-hb";
import { tyBatchCoz } from "../src/lib/kanal-gonderim-ty";

/**
 * ============================================================================
 *  KANAL-YAZMA BEKÇİSİ (K169 · K194) — KANALA-YAZAN HER AKIŞIN TAAHHÜTLERİ
 * ----------------------------------------------------------------------------
 *      npm run kanal-yazma:dogrula
 *
 *  `api:dogrula`daki KANALA_YAZMASI_BEYANLI beyanının bekçisi. Beyan bir
 *  muafiyet değil TAAHHÜTTÜR; burada ölçülen taahhütler:
 *    ① yazıcı dosyada TEK fiil, TEK uç — ikinci POST/başka fiil yazılamaz
 *    ② eylem RAKAM GÖRÜLMEDEN GÖNDERMEZ (önizleme + pasif düğme)
 *    ③ İZSİZ GÖNDERİM YOK — kabul de red de deftere yazılır
 *    ④ stok İSTEMCİDEN ALINMAZ — sunucu yeniden çözer
 *    ⑤ izin kapısı (`kanal.yaz`) her iki eylemde
 *
 *  ⛔ LİSTE ELLE TUTULMUYOR — BEYANDAN TÜRÜYOR (K194 düzeltmesi).
 *  Bu bekçi K169'da TY yollarına ÇAKILIYDI. İkinci kanal (N11) eklenince
 *  ortaya çıktı ki çakılı bir bekçi **yeni yazıcıyı hiç görmez**: N11
 *  yazıcısı önizlemesiz olsaydı bu dosya yeşil kalırdı. Artık yazıcı listesi
 *  `api-dogrula.ts`teki beyandan okunuyor; üçüncü kanal (HB) eklendiğinde
 *  kimsenin buraya bir satır yazması gerekmeyecek.
 *  _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_
 *
 *  ⚠ EKRAN YOLLARI DA TÜRETİLİYOR: `scripts/<kod>/yazici.ts` →
 *  `src/app/kart/[variantId]/<kod>-gonderim.tsx` ve `<kod>GonderimOnizle` /
 *  `<kod>StokFiyatGonder`. Bir kanal bu adlandırmadan saparsa bekçi onu
 *  BULAMAZ ve kırmızı yanar — sessizce atlamaz.
 *
 *  Desenler ters bölüsüz, kullanım bloğuna daraltılmış (kaçış dersleri).
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
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

console.log("\nKANAL-YAZMA BEKÇİSİ (K169 · K194)\n");

/* ═══ BEYANDAN TÜRETME ═══════════════════════════════════════════════ */
const apiBekci = kaynakOku("scripts/api-dogrula.ts");
const beyanBasi = apiBekci.indexOf("KANALA_YAZMASI_BEYANLI = new Map");
const beyanSonu = apiBekci.indexOf("]);", beyanBasi);
const beyanBloku =
  beyanBasi >= 0 && beyanSonu > beyanBasi
    ? apiBekci.slice(beyanBasi, beyanSonu)
    : "";
const yazicilar = [
  ...new Set(
    (beyanBloku.match(/"scripts\/[a-z0-9]+\/yazici\.ts"/g) ?? []).map((x) =>
      x.slice(1, -1),
    ),
  ),
];

/**
 * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR: beyan bloğu okunamazsa liste boşalır
 * ve aşağıdaki döngü HİÇ koşmaz — bekçi "geçti" der, hiçbir şey ölçmeden.
 * _(Anayasa: "`every` kapısı taban doluluğunu ayrıca kanıtlar".)_
 */
kontrol(
  "beyan bloğu okundu ve yazıcı bulundu (taban DOLU)",
  yazicilar.length >= 2,
  yazicilar,
);

for (const yol of yazicilar) {
  const kod = yol.split("/")[1];
  console.log("\n  ── " + kod.toUpperCase() + " (" + yol + ")");

  /* ① TEK FİİL, TEK UÇ */
  const yazici = yorumsuz(kaynakOku(yol));
  const postSayisi = yazici.split('method: "POST"').length - 1;
  kontrol("① yazıcıda TAM BİR adet POST var", postSayisi === 1, postSayisi);
  kontrol(
    "①   ...başka fiil yok (PUT/DELETE/PATCH)",
    !yazici.includes('method: "PUT"') &&
      !yazici.includes('method: "DELETE"') &&
      !yazici.includes('method: "PATCH"'),
  );
  /**
   * ⚠ UÇ SABİT: `fetch` çağrısındaki adres bir DEĞİŞKENDEN gelemez. Uç
   * parametreleşirse "tek uç" taahhüdü sözde kalır.
   */
  kontrol(
    "①   ...uç sabit dizeyle yazılı (parametre değil)",
    /fetch\(\s*`\$\{TABAN\}\//.test(yazici),
  );

  /* ② ÖNİZLEME — SALT OKUMA VE AYRI EYLEM */
  const eylem = yorumsuz(
    kaynakOku("src/app/kart/[variantId]/actions.ts"),
  );
  const onizleAd = kod + "GonderimOnizle";
  const gonderAd = kod + "StokFiyatGonder";
  const basi = eylem.indexOf("export async function " + onizleAd);
  kontrol("② önizleme eylemi VAR (" + onizleAd + ")", basi >= 0);
  if (basi >= 0) {
    const sonu = eylem.indexOf("export async function", basi + 10);
    const blok = eylem.slice(basi, sonu < 0 ? undefined : sonu);
    /**
     * ⛔ ÖNİZLEME YAZMAZ. Yazsaydı "önce göster, sonra sor" protokolü
     * çökerdi: kullanıcı daha onaylamadan kanala gitmiş olurdu.
     */
    /**
     * ⚠ DESEN ÖNCE SAYILDI — VE İLK YAZIMDA SAYILMAMIŞTI. Buraya önce
     * `!blok.includes("Iste(")` yazdım; `yetkiIste(` de o alt dizeyle
     * bitiyor ve ölçüt İKİ KANALDA DA yanlış kırmızı yandı. Aranan adlar
     * artık tam: yazıcı çağrısının kendisi.
     * _(Anayasa: "ÖNCE DESENİ SAY" — bugün üçüncü kez aynı tuzak.)_
     */
    kontrol(
      "②   ...ve SALT OKUMA (yazıcıyı çağırmıyor)",
      !blok.includes("stokFiyatGonder(") && !blok.includes("StokFiyatIste("),
    );
  }
  kontrol("② gönderim eylemi VAR (" + gonderAd + ")", eylem.includes("export async function " + gonderAd));

  /* ③ İZ — KABUL VE RED */
  const gBasi = eylem.indexOf("export async function " + gonderAd);
  const gBlok =
    gBasi >= 0
      ? eylem.slice(gBasi, (() => {
          const s = eylem.indexOf("export async function", gBasi + 10);
          return s < 0 ? eylem.length : s;
        })())
      : "";
  kontrol(
    "③ KABUL izi yazılıyor",
    gBlok.includes('sonuc: "KABUL"') && gBlok.includes('action: "KANAL_GONDERIMI"'),
  );
  kontrol(
    "③ RED de iz bırakıyor (gönderdim-sanıyordum sorusuna cevap)",
    gBlok.includes('sonuc: "RED"'),
  );

  /* ④ STOK SUNUCUDA ÇÖZÜLÜR */
  kontrol(
    "④ stok SUNUCUDA yeniden çözülüyor (istemciden sayı alınmaz)",
    gBlok.includes("await varyantStogu(variantId)"),
  );

  /* ⑤ İZİN KAPISI — İKİ EYLEMDE DE */
  const onizBlok =
    basi >= 0
      ? eylem.slice(basi, (() => {
          const s = eylem.indexOf("export async function", basi + 10);
          return s < 0 ? eylem.length : s;
        })())
      : "";
  kontrol(
    "⑤ izin kapısı ÖNİZLEMEDE",
    onizBlok.includes('yetkiIste("kanal.yaz")'),
  );
  kontrol(
    "⑤ izin kapısı GÖNDERİMDE",
    gBlok.includes('yetkiIste("kanal.yaz")'),
  );

  /**
   * ⛔ K201-3 (16.09.2026) — TY'YE GİDEN `barcode`, `ChannelSku.channelSku`
   * DEĞİL `ProductVariant.barcode`DAN OKUNUR. `channelSku` genel bir "kanal
   * kodu" alanı ve boş bırakılırsa iç SKU'ya düşüyor
   * (`kanal-sku/actions.ts`); TY'nin `price-and-inventory` ucu `barcode`ı
   * GERÇEK EAN sanıyor — okuma tarafı (`kanal-listeleme-yaz.ts`) zaten
   * `variant.barcode` ile eşleştiriyordu. Canlı kanıt: 09.09.2026 04:51,
   * yanlış `channelSku` değeri TY'ye barkod diye gönderildi ve TY KABUL etti
   * — o değer bizim hiçbir ürünümüzün barkodu değildi.
   * _(Anayasa: "iki yerde iki ölçüt olmaz".)_
   */
  if (kod === "ty") {
    /**
     * ⚠ KENDİ BLOĞU DAR ÇIKARILIR — paylaşılan `gBlok`, sınır olarak "bir
     * SONRAKİ export async function"u kullanıyor ve bu sınır `tyStokFiyatGonder`
     * ile N11'in `n11GonderimOnizle`si ARASINDA kalan `N11Baglam` tipini de
     * (kendi `channelSku` alanıyla) içine alıyor — "channelSku geçmiyor" testi
     * o sızıntıyı yakalar, TY kodunu değil. Fonksiyonun KENDİ kapanışına
     * (`\n}\n`) daraltılmış ayrı bir blok kullanılır.
     * _(Anayasa: "pencere ölçülür — gövde büyüyünce sessizce kör kalır".)_
     */
    const tbBasi = eylem.indexOf("async function tyBaglami");
    const tbSonu = tbBasi >= 0 ? eylem.indexOf("\n}\n", tbBasi) : -1;
    const tbBlok = tbBasi >= 0 && tbSonu > tbBasi ? eylem.slice(tbBasi, tbSonu) : "";
    kontrol(
      "K201-3 tyBaglami VARYANTIN GERÇEK barkodunu çözüyor (channelSku'dan değil)",
      tbBlok.includes("varyant.barcode") && !tbBlok.includes("kanalSku.channelSku"),
    );

    const gSarBasi = eylem.indexOf("export async function tyStokFiyatGonder");
    const gSarSonu = gSarBasi >= 0 ? eylem.indexOf("\n}\n", gSarBasi) : -1;
    const gSarBlok =
      gSarBasi >= 0 && gSarSonu > gSarBasi ? eylem.slice(gSarBasi, gSarSonu) : "";
    kontrol(
      "K201-3 gönderilen kalem.barcode, çözülen GERÇEK barkoddan geliyor (channelSku değil)",
      gSarBlok.includes("barcode: b.barkod") && !gSarBlok.includes("channelSku"),
    );
  }

  /* ② DİYALOG — RAKAM GELMEDEN GÖNDER PASİF */
  const dyalogYolu = "src/app/kart/[variantId]/" + kod + "-gonderim.tsx";
  let dyalog = "";
  try {
    dyalog = yorumsuz(kaynakOku(dyalogYolu));
  } catch {
    dyalog = "";
  }
  kontrol("② diyalog dosyası VAR (" + dyalogYolu + ")", dyalog.length > 0);
  if (dyalog.length > 0) {
    kontrol(
      "② diyalog önizlemeyi SUNUCUDAN çekiyor",
      dyalog.includes("await " + onizleAd + "(variantId)"),
    );
    /**
     * ⛔ KÖRLEMESİNE GÖNDERİM YASAĞININ KENDİSİ: düğme, önizleme BAŞARIYLA
     * gelmeden basılamaz. Halil kuralı 09.09.2026 — "yazım okumadan
     * kategorik tehlikeli".
     */
    kontrol(
      "② rakam gelmeden GÖNDER pasif (önizlemesiz çağrı YASAK)",
      dyalog.includes("disabled={bekliyor || !gonderilebilir}") &&
        dyalog.includes("onizleme?.tamam === true"),
    );
  }
}

/* ═══ N11 — KANALIN KURALI İSTEK GİTMEDEN SINANIR ════════════════════ */
/**
 * ⭐ DEĞER TESTİ, DESEN TARAMA DEĞİL: `kalemGecerliMi` saf bir gövde ve ağa
 * çıkmıyor, dolayısıyla ÇAĞRILARAK ölçülebiliyor.
 * _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 *
 * ⛔ NİYE ÖNEMLİ: N11 dokümanı bu üç şartı ihlal eden isteği `FAIL` yapıyor.
 * Kanala sordurmak, önlenebilir bir gürültüyü canlıya taşımaktır.
 */
console.log("\n  ── N11 KURALLARI (istek gitmeden)");
/** ⚠ Gövde SAF — `kimlikOku` çağrılmadığı için ithal yan etki üretmiyor. */
const SK = { stockCode: "X" };
const kod = (k: Parameters<typeof kalemGecerliMi>[0]): string | undefined => {
  const r = kalemGecerliMi(k);
  return r.gecerli ? undefined : r.kod;
};
kontrol(
  "stok tek başına GEÇERLİ (fiyata dokunmadan gönderim)",
  kalemGecerliMi({ ...SK, quantity: 3 }).gecerli === true,
);
kontrol(
  "fiyat TEK BAŞINA reddedilir (ikisi birlikte şartı)",
  kod({ ...SK, salePrice: 100 }) === "FIYAT_TEK_BASINA",
);
kontrol(
  "liste = satış reddedilir (eşitlik de FAIL)",
  kod({ ...SK, listPrice: 100, salePrice: 100 }) ===
    "LISTE_FIYATI_DUSUK",
);
kontrol(
  "liste < satış reddedilir",
  kod({ ...SK, listPrice: 90, salePrice: 100 }) ===
    "LISTE_FIYATI_DUSUK",
);
kontrol(
  "liste > satış KABUL",
  kalemGecerliMi({ ...SK, listPrice: 120, salePrice: 100 }).gecerli === true,
);
/**
 * ⚠ ÖRNEK AYRIMIN İKİ YAKASINI GÖSTERİYOR: 100,999 üç haneli ve REDDEDİLMELİ;
 * 100,99 iki haneli ve GEÇMELİ. Yalnız biri sınansaydı kural değil tesadüf
 * ölçülmüş olurdu.
 */
kontrol(
  "üç haneli küsurat reddedilir",
  kod({ ...SK, listPrice: 120, salePrice: 100.999 }) ===
    "KURUSAT_HATALI",
);
kontrol(
  "iki haneli küsurat KABUL",
  kalemGecerliMi({ ...SK, listPrice: 120.5, salePrice: 100.99 }).gecerli === true,
);
kontrol(
  "boş kalem reddedilir (ne stok ne fiyat)",
  kod({ ...SK }) === "GONDERILECEK_YOK",
);

/*
 * ═══ K169 — TRENDYOL TOPLU İŞLEM SONUCU (01.10.2026) ═══
 * ⛔ VAKA: eylem durumu üst seviyede (`govde.status`) arıyordu; TY o alanı hiç
 * göndermiyor → her gönderim «ISLEMDE» yazıldı, başarı ekranda hiç görünmedi.
 * Aşağıdaki gövde 01.10 14:48 gönderiminin TY'den dönen GERÇEK cevabıdır.
 */
console.log("\n  ── TY SONUÇ OKUMASI");
const tyGercek = {
  items: [{ requestItem: { barcode: "8690000000000", quantity: 2 }, status: "SUCCESS", failureReasons: [] }],
  itemCount: 1,
  failedItemCount: 0,
  batchRequestType: "ProductInventoryUpdate",
};
kontrol("TY: ⛔ ÖLÇÜLEN CEVAP (kalemde SUCCESS, üstte status YOK) → BASARILI", tyBatchCoz(tyGercek).durum === "BASARILI", tyBatchCoz(tyGercek));
const tyRed = tyBatchCoz({ items: [{ status: "FAILED", failureReasons: ["Fiyat aralık dışı"] }], failedItemCount: 1 });
kontrol("TY: FAILED kalem → BASARISIZ ve sebep taşınır", tyRed.durum === "BASARISIZ" && tyRed.sebepler[0] === "Fiyat aralık dışı", tyRed);
kontrol("TY: karışık (biri SUCCESS biri FAILED) → BASARISIZ (başarı denmez)", tyBatchCoz({ items: [{ status: "SUCCESS" }, { status: "FAILED", failureReasons: [] }] }).durum === "BASARISIZ");
kontrol("TY: boş kalem listesi → ISLEMDE (henüz işlenmedi)", tyBatchCoz({ items: [] }).durum === "ISLEMDE");
kontrol("TY: bilinmeyen kalem durumu → ISLEMDE (başarı denmez)", tyBatchCoz({ items: [{ status: "PENDING" }] }).durum === "ISLEMDE");
kontrol("TY: üstte status olsa da kalem yoksa başarı DENMEZ", tyBatchCoz({ status: "COMPLETED" }).durum === "SORGULANAMADI");
{
  const e = yorumsuz(kaynakOku("src/app/kart/[variantId]/actions.ts"));
  const gBasi = e.indexOf("export async function tyStokFiyatGonder");
  const gSonu = e.indexOf("export async function", gBasi + 10);
  const tyGovde = gBasi >= 0 ? e.slice(gBasi, gSonu >= 0 ? gSonu : undefined) : "";
  kontrol("TY: gönderim gövdesi bulundu", tyGovde.length > 0);
  kontrol("TY: sonuç tyBatchCoz ile okunuyor", tyGovde.includes('sonucOkuma = batch.tur === "VERI" ? tyBatchCoz(batch.govde) :'));
  kontrol("TY: sonuç 12 sn'ye kadar tekrar sorgulanıyor", /for \(let deneme = 0; deneme < 5; deneme\+\+\)/.test(tyGovde) && tyGovde.includes("const batch = await gonderimSonucu(k, sonuc.batchRequestId);"));
  kontrol("TY: üst seviye `status` okuması geri gelmedi", !/g\.status/.test(tyGovde));
  kontrol("TY: sebepler ize de yazılıyor", tyGovde.includes("sebepler: sonucOkuma.sebepler,"));
  const tyPencere = yorumsuz(kaynakOku("src/app/kart/[variantId]/ty-gonderim.tsx"));
  kontrol("TY: pencere kesin sonucu kendi anahtarıyla yazıyor", tyPencere.includes('sonuc.batchDurumu === "BASARILI" || sonuc.batchDurumu === "BASARISIZ"'));
  /* ⛔ ÖLÇÜLDÜ 01.10: TY 12 sn'de bitirmiyor — pencere sormaya devam etmeli. */
  kontrol("TY: pencere sonucu 2 dk'ya kadar soruyor", tyPencere.includes("const SORGU_TAVANI_SN = 120;") && tyPencere.includes("const r = await tyGonderimSonucuSorgula(variantId, id);"));
  kontrol("TY: sorma koşulu canlı (işleniyor/sorgulanamadı iken, tavana kadar)", /const sonucBekleniyor =\s*acik &&\s*sonuc\?\.tamam === true &&\s*\(sonuc\.batchDurumu === "ISLEMDE" \|\| sonuc\.batchDurumu === "SORGULANAMADI"\) &&\s*sorguSn < SORGU_TAVANI_SN;/.test(tyPencere));
  kontrol("TY: sorma zamanlayıcısı koşula bağlı", tyPencere.includes("if (!sonucBekleniyor || sonuc?.tamam !== true) return;"));
  kontrol("TY: işlenmeyen sonuç BEKLENIYOR/ZAMAN_ASIMI'na gider (başarı denmez)", tyPencere.includes('? "BEKLENIYOR"') && tyPencere.includes(': "ZAMAN_ASIMI"'));
  const sBasi = e.indexOf("export async function tyGonderimSonucuSorgula");
  const sSonu = e.indexOf("export async function", sBasi + 10);
  const sorgu = sBasi >= 0 ? e.slice(sBasi, sSonu >= 0 ? sSonu : undefined) : "";
  kontrol("TY: sonuç sorgu eylemi VAR", sorgu.length > 0);
  kontrol("TY: sorgu izin kapısından geçiyor", sorgu.includes('await yetkiIste("kanal.yaz");'));
  kontrol("TY: sorgu SALT OKUMA — kanala gönderim çağrısı YOK", sorgu.length > 0 && !/stokFiyatGonder|StokFiyatIste/.test(sorgu));
  kontrol("TY: sorgu yalnız bu varyantın kendi gönderim kimliğini soruyor", sorgu.includes('if (!gonderim) return { tamam: false, kod: "GONDERIM_YOK" };'));
  kontrol("TY: sorgu sonucu tyBatchCoz ile okuyor", sorgu.includes('batch.tur === "VERI" ? tyBatchCoz(batch.govde) :'));
  kontrol("TY: kesin sonuç ize BİR KEZ yazılıyor", sorgu.includes("if (yazilmis === 0) {") && sorgu.includes('action: "KANAL_GONDERIMI_SONUCU",'));
  kontrol("TY: pencere red sebeplerini gösteriyor", tyPencere.includes("sonuc.sebepler.map("));
}

/*
 * ═══ STOĞU ÜÇ KANALA TEK DÜĞME (Faz 4 son maddesi, 01.10.2026) ═══
 * Yeni yazma yolu YOK — üç kanalın kendi eylemleri çağrılır. Ölçülen taahhütler:
 * yalnız STOK gider (fiyat her kanalda boş) · önizleme gelmeden Gönder pasif ·
 * HB canlı kilidi kapalıysa HB atlanır · atlanan kanal sebebini yazar ·
 * sayfada iki yüzeyde de (masaüstü + mobil) düğme var.
 */
console.log("\n  ── ÜÇ KANALA STOK (tek düğme)");
{
  const uc = yorumsuz(kaynakOku("src/app/kart/[variantId]/uc-kanal-stok.tsx"));
  kontrol("ÜÇ: üç önizleme birlikte isteniyor", /tyGonderimOnizle\(variantId\),\s*n11GonderimOnizle\(variantId\),\s*hbGonderimOnizle\(variantId\),/.test(uc));
  kontrol("ÜÇ: TY'ye YALNIZ stok (fiyat boş)", uc.includes("hedef.ty ? tyStokFiyatGonder(variantId, { stokGonder: true, fiyat: null }) : undefined,"));
  kontrol("ÜÇ: N11'e YALNIZ stok (iki fiyat da boş)", uc.includes("hedef.n11 ? n11StokFiyatGonder(variantId, { stokGonder: true, listeFiyati: null, satisFiyati: null }) : undefined,"));
  kontrol("ÜÇ: HB'ye YALNIZ stok (fiyat boş)", uc.includes("hedef.hb ? hbStokFiyatGonder(variantId, { stokGonder: true, fiyat: null }) : undefined,"));
  kontrol("ÜÇ: başka hiçbir gönderim çağrısı yok (3 tane)", (uc.match(/StokFiyatGonder\(variantId/g) ?? []).length === 3);
  kontrol("ÜÇ: HB canlı kilidi kapalıysa HB hedef DEĞİL", uc.includes("hb: o.hb.tamam && !o.hb.canliKapali,"));
  kontrol("ÜÇ: önizleme gelmeden ve hedef yokken Gönder pasif", uc.includes("const gonderilebilir = onizleme !== null && hedefSayisi > 0;") && uc.includes("disabled={bekliyor || !gonderilebilir}"));
  kontrol("ÜÇ: atlanan her kanal sebebini yazıyor (TY · N11 · HB · HB kilit)", (uc.match(/t\("atlandi", \{ kanal: "/g) ?? []).length === 4);
  kontrol("ÜÇ: TY sonucu sorma döngüsü var", uc.includes("const r = await tyGonderimSonucuSorgula(variantId, id);") && /sorguSn < SORGU_TAVANI_SN;/.test(uc));
  const sayfa = yorumsuz(kaynakOku("src/app/urunler/[id]/page.tsx"));
  kontrol("ÜÇ: düğme ürün sayfasının iki yüzeyinde de", (sayfa.match(/<UcKanalStokGonderim variantId=\{varyant\.id\} \/>/g) ?? []).length === 2);
}

/* ═══ K194-HB — HEPSİBURADA'YA ÖZGÜ KURALLAR (SIT ölçümüne bağlı, 01.10.2026) ═══ */
async function hbBolumu() {
  console.log("\n  ── HB KURALLARI (istek gitmeden + doğrulama)");
  const SKU = { hepsiburadaSku: "HBV000010LWPR" };
  const hbKod = (k: Parameters<typeof hbKalemGecerliMi>[0]) => {
    const r = hbKalemGecerliMi(k);
    return r.gecerli ? "GECERLI" : r.kod;
  };
  kontrol("HB: stok tek başına GEÇERLİ (fiyatsız stok kabul ediliyor — ölçüldü)", hbKod({ ...SKU, availableStock: 5 }) === "GECERLI");
  kontrol("HB: fiyat tek başına GEÇERLİ (stoksuz fiyat — ölçüldü)", hbKod({ ...SKU, price: 101 }) === "GECERLI");
  kontrol("HB: ne stok ne fiyat → GONDERILECEK_YOK", hbKod({ ...SKU }) === "GONDERILECEK_YOK");
  kontrol("HB: eksi stok reddedilir", hbKod({ ...SKU, availableStock: -1 }) === "STOK_HATALI");
  kontrol("HB: üç haneli küsurat reddedilir", hbKod({ ...SKU, price: 10.123 }) === "FIYAT_HATALI");
  kontrol("HB: boş SKU reddedilir", hbKod({ hepsiburadaSku: " ", availableStock: 1 }) === "SKU_YOK");

  /* ⛔ CANLI KİLİDİ AĞA ÇIKMADAN DURDURUR — değerle: fetch casusu hiç çağrılmamalı. */
  const asilFetch = globalThis.fetch;
  let cagri = 0;
  globalThis.fetch = (async () => {
    cagri++;
    throw new Error("bekçi: ağa çıkılmamalıydı");
  }) as typeof fetch;
  try {
    const canli = await hbStokFiyatGonder({ merchantId: "m", key: "k", developer: "d", ortam: "CANLI" }, { ...SKU, availableStock: 3 });
    /* ⚠ Bayrak açıldı (01.10.2026); kilit KARARI bayraktan bağımsız sınanır. */
    if (!HB_CANLI_YAZMA_ACIK) {
      kontrol("HB: canlı kilit kapalıyken CANLI_KAPALI döner", canli.tur === "CANLI_KAPALI", canli);
      kontrol("HB:   ...ve AĞA HİÇ ÇIKILMAZ", cagri === 0, cagri);
    }
    kontrol("HB: kilit kararı — canlı + bayrak kapalı → KAPALI", hbYazmaAcikMi("CANLI", false) === false);
    kontrol("HB: kilit kararı — canlı + bayrak açık → AÇIK", hbYazmaAcikMi("CANLI", true) === true);
    kontrol("HB: kilit kararı — deneme ortamı her zaman AÇIK", hbYazmaAcikMi("TEST", false) === true && hbYazmaAcikMi("test", false) === true);
    /* Sayaç sıfırlanır: bayrak açıkken yukarıdaki canlı çağrı sahte ağa gider; bu sınama YALNIZ kendi çağrısını sayar. */
    cagri = 0;
    const kural = await hbStokFiyatGonder({ merchantId: "m", key: "k", developer: "d", ortam: "TEST" }, { ...SKU });
    kontrol("HB: kural ihlali de ağa çıkmadan döner", kural.tur === "KURAL_IHLALI" && cagri === 0, kural);
  } finally {
    globalThis.fetch = asilFetch;
  }

  /* ⛔ DOĞRULAMA İLAN GERİ OKUNARAK — HB tanımadığı süzgeci yok sayıp TÜM ilanları döndürüyor (ölçüldü). */
  const tumIlanlar = { listings: [{ hepsiburadaSku: "HBV0000AAA", availableStock: 99, price: 5 }, { hepsiburadaSku: "HBV000010LWPR", availableStock: 11, price: 100 }] };
  const ilan = hbKanaldakiIlanCoz(tumIlanlar, "HBV000010LWPR");
  kontrol("HB: süzgeç yok sayılıp hepsi gelse de DOĞRU ilan okunur", ilan?.stok === 11 && ilan?.fiyat === 100, ilan);
  kontrol("HB:   ...ilan yoksa null (ilk ilan sanılmaz)", hbKanaldakiIlanCoz(tumIlanlar, "HBV0000YOK") === null);
  const temiz = (durum: string) => ({ durum, hatalar: [] as string[], kilitler: [] as unknown[] });
  kontrol("HB: ilanda gönderilen rakam görülürse DOĞRULANDI", parcaHukmu(temiz("Ready"), 11, 11) === "DOGRULANDI");
  kontrol("HB: ⛔ ÖLÇÜLEN VAKA — «Done» ama ilan eski fiyatta → «kanalda görünmüyor» (tamam DENMEZ)", parcaHukmu(temiz("Done"), 100, 101) === "KANALDA_GORUNMUYOR");
  kontrol("HB: ⛔ ÖLÇÜLEN VAKA — olmayan SKU'ya stok «Ready», ilan yok → tamam DENMEZ (hâlâ işleniyor)", parcaHukmu(temiz("Ready"), 1, null) === "ISLENIYOR");
  kontrol("HB: «Done» ama rakam yok → «kanalda görünmüyor»", parcaHukmu(temiz("Done"), 1, null) === "KANALDA_GORUNMUYOR");
  kontrol("HB: durum okunamadı + rakam görünmüyor → İŞLENİYOR", parcaHukmu(null, 11, 10) === "ISLENIYOR");
  kontrol("HB: kuruş kuyruğu eşitliği bozmaz (100,1 = 100,10)", parcaHukmu(temiz("Done"), 100.1, 100.10000000001) === "DOGRULANDI");
  const olmayan = hbYuklemeDurumuCoz({ status: "Done", errors: [{ elementNo: 1, hepsiburadaSku: "X", errors: ["ListingNotFound"] }], priceValidations: null });
  kontrol("HB: fiyat hatası (ListingNotFound) okunuyor", olmayan.hatalar.includes("ListingNotFound"), olmayan);
  kontrol("HB:   ...ve rakam görünse bile hüküm RED", parcaHukmu(olmayan, 50, 50) === "RED");
  const kilit = hbYuklemeDurumuCoz({ status: "Done", errors: null, priceValidations: [{ type: "MinLock", minPrice: 90, maxPrice: 120 }] });
  kontrol("HB: fiyat kilidi (MinLock) okunuyor ve RED", kilit.kilitler[0]?.tip === "MinLock" && kilit.kilitler[0]?.min === 90 && parcaHukmu(kilit, 80, 80) === "RED", kilit);

  /* Kaynak — eylem ve pencere sözleşmesi. */
  const yazici = yorumsuz(kaynakOku("scripts/hb/yazici.ts"));
  kontrol("HB: gönderim kilit kararını ağa çıkmadan çağırıyor", yazici.includes('if (!hbYazmaAcikMi(k.ortam, HB_CANLI_YAZMA_ACIK)) return { tur: "CANLI_KAPALI" };'));
  const eylemKilit = yorumsuz(kaynakOku("src/app/kart/[variantId]/actions.ts"));
  kontrol("HB: önizleme AYNI kilit kararını gösteriyor", eylemKilit.includes("canliKapali: !hbYazmaAcikMi(ortam, HB_CANLI_YAZMA_ACIK),"));
  kontrol("HB: uç adresi kapalı kümeden (iki değer)", /const YUKLEME_UCLARI = \{\s*STOK: "stock-uploads",\s*FIYAT: "price-uploads",\s*\} as const;/.test(yazici) && yazici.includes("/${YUKLEME_UCLARI[tur]}`"));
  const eylem = yorumsuz(kaynakOku("src/app/kart/[variantId]/actions.ts"));
  kontrol("HB: hüküm GERİ OKUNAN ilandan veriliyor (stok ve fiyat)", eylem.includes("const hukum = parcaHukmu(durum, p.gonderilen, kanaldaki(p.tur));") && eylem.includes("ilan = await hbKanaldakiIlan(k, hbSku);"));
  kontrol("HB: geri okuma 12 sn'ye kadar tekrarlanıyor (ölçülen yansıma ~5–6 sn)", /for \(let deneme = 0; kabulEdilenler\.length > 0 && deneme < 5; deneme\+\+\)/.test(eylem));
  const pencere = yorumsuz(kaynakOku("src/app/kart/[variantId]/hb-gonderim.tsx"));
  kontrol("HB: canlı kilit kapalıyken GÖNDER pasif", /const gonderilebilir =\s*onizleme\?\.tamam === true && !onizleme\.canliKapali/.test(pencere));
  kontrol("HB: pencere hangi mağazaya gideceğini yazıyor", pencere.includes('t("ortamTest")') && pencere.includes('t("ortamCanli")'));
}

hbBolumu().then(() => {
  console.log(
    "\n" +
      (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
      ` (${gecen}/${gecen + hata})\n`,
  );
  process.exit(hata === 0 ? 0 : 1);
});
