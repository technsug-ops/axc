import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ÜRÜN GÖRSELİ — MUTASYON HARNESS'I (K273, 25.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run urun-gorseli-mutasyon:kontrol
 *
 *  `urun-gorseli:dogrula` iki katmanlı: saf kural DEĞERLE, zincir (senkron →
 *  yazıcı → ekran → kırık bildirimi) yorumsuz kaynakla sınanıyor. Burası iki
 *  katmanın da DİŞİNİ sınar. ÜÇ YÖN: zararsız · kaldıran · fazladan.
 *  Harness mutasyonun UYGULANDIĞINI ve GERİ ALINDIĞINI doğrular; çapası
 *  tutmayan mutasyon "yeşil" değil ÖLÇÜLEMEDİ sayılır.
 * ============================================================================
 */

const BEKCI = "scripts/urun-gorseli-dogrula.ts";
const BEKCI_BASLIGI = "BAĞLANTI";
const KURAL = "src/lib/urun-gorseli.ts";
const YAZICI = "src/lib/urun-gorseli-yaz.ts";
const TY_SENKRON = "scripts/canli-kanal-listeleme-yaz.ts";
const N11_SENKRON = "scripts/canli-n11-listeleme-yaz.ts";
const TY_NORMAL = "scripts/ty/urun-v2.ts";
const KART = "src/components/liste-karti.tsx";
const BILESEN = "src/components/urun-gorseli.tsx";
const EYLEM = "src/app/gorsel-eylemleri.ts";
const STOK = "src/app/stok/page.tsx";
const SATISLAR = "src/app/satislar/page.tsx";

type Mutasyon = {
  ad: string;
  yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const SAHTE_YAZICI =
  "    gorsel = await (async (_a: unknown) => ({ aday: 0, eslesen: 0, degisecek: 0, yazilan: 0, tavandaKalan: 0 }))(";

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ZARARSIZ - yalniz yorum degisti (harness saglamasi)",
    yon: "ZARARSIZ",
    dosya: YAZICI,
    bul: "  /* Barkod başına İLK aday — bir içeriğin birden çok görseli varsa ilki (ana görsel). */",
    koy: "  /* Barkod basina ilk aday. */",
    bozdugu: "hicbir sey - YESIL kalmali",
  },
  {
    ad: "TY SENKRONU YAZICIYI CAGIRMIYOR",
    yon: "KALDIRAN",
    dosya: TY_SENKRON,
    bul: "    gorsel = await gorselleriYaz(",
    koy: SAHTE_YAZICI,
    bozdugu: "Trendyol taramasi gorsel getirir ama hicbir urune yazilmaz - ekran hep bas harf gosterir",
  },
  {
    ad: "N11 SENKRONU YAZICIYI CAGIRMIYOR",
    yon: "KALDIRAN",
    dosya: N11_SENKRON,
    bul: "    gorsel = await gorselleriYaz(",
    koy: SAHTE_YAZICI,
    bozdugu: "yedek kaynak kapanir; kirik Trendyol gorseli N11'e dusemez",
  },
  {
    ad: "TY OKUMASI GORSELI DUSURUYOR (tek varyantli dal)",
    yon: "KALDIRAN",
    dosya: TY_NORMAL,
    bul: "    gorselUrl: anaGorsel(ham),",
    koy: '    gorselUrl: "",',
    bozdugu: "bir urun sinifi sessizce gorselsiz kalir",
  },
  {
    ad: "LISTE KARTI GORSEL YUVASINI CIZMIYOR",
    yon: "KALDIRAN",
    dosya: KART,
    bul: "      {gorsel}",
    koy: "",
    bozdugu: "telefonda hicbir listede resim yok - sayfalar verir, kart yutar",
  },
  {
    ad: "STOK TELEFON KARTI RESMI KAYBETTI",
    yon: "KALDIRAN",
    dosya: STOK,
    bul: "                gorsel={<UrunGorseli ekleyebilir={resimEkleyebilir} variantId={varyant.id} url={varyant.gorselUrl} kaynak={varyant.gorselKaynak} ad={varyant.product.name} boyut={48} />}",
    koy: "",
    bozdugu: "depo telefonunda (birincil cihaz) stok listesi resimsiz",
  },
  {
    ad: "SATISLAR MASAUSTU RESMI KAYBETTI",
    yon: "KALDIRAN",
    dosya: SATISLAR,
    bul: "                      <UrunGorseli ekleyebilir={resimEkleyebilir} variantId={satis.items[0]?.variant.id ?? null} url={satis.items[0]?.variant.gorselUrl ?? null} kaynak={satis.items[0]?.variant.gorselKaynak ?? null} ad={urunOzeti(satis)} />",
    koy: "",
    bozdugu: "masaustu tablo resimsiz, telefon resimli - Ilke #10 ayrisir",
  },
  {
    ad: "BILESEN KIRIGI BILDIRMIYOR",
    yon: "KALDIRAN",
    dosya: BILESEN,
    bul: "        if (variantId) void gorselKirikBildir(variantId);",
    koy: "",
    bozdugu: "kirik link hic isaretlenmez, sira bastan islemez - istenen onarim yolu kopar",
  },
  {
    ad: "BILESEN BUYUK ADRESI YUKLUYOR",
    yon: "KALDIRAN",
    dosya: BILESEN,
    bul: "      src={kucukGorselAdresi(url, kaynak)}",
    koy: "      src={url}",
    bozdugu: "50 satirlik liste 50 x 749 KB indirir (kucuk surum 7,5 KB olculdu)",
  },
  {
    ad: "AG HATASI KIRIK YAZIYOR",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: '      console.error("[gorselKirikBildir] yoklama hatası:", variantId, e);\n      return { durum: "HATA" };',
    koy: '      console.error("[gorselKirikBildir] yoklama hatası:", variantId, e);',
    bozdugu: "bizim tarafin anlik ag sorunu saglam gorseli kirik isaretler",
  },
  {
    ad: "YAZICI TAVANI KALKTI",
    yon: "FAZLADAN",
    dosya: YAZICI,
    bul: "yazilacak.slice(0, GORSEL_YAZIM_TAVANI)",
    koy: "yazilacak.slice(0)",
    bozdugu: "ilk dolumda ~1.200 satir tek kosuma biner, senkron rotasi zaman asimina ugrar",
  },
  {
    ad: "KURAL: KIRIK GORSEL YERINE YENISI YAZILMIYOR",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: "  if (mevcut.url === null || gorselKirikMi(mevcut)) return { url: aday.url, kaynak: aday.kaynak };",
    koy: "  if (mevcut.url === null) return { url: aday.url, kaynak: aday.kaynak };",
    bozdugu: "kirik gorsel sonsuza kadar kirik kalir - 'siraya don' davranisi olur",
  },
  {
    ad: "KURAL: IZINSIZ SUNUCU KABUL",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "  if (aday === null || !gorselAdresiGecerliMi(aday.url, aday.kaynak)) return null;",
    koy: "  if (aday === null) return null;",
    bozdugu: "pazaryeri verisinden gelen herhangi bir adres (http, izleyici) ekrana gomulur",
  },
  {
    ad: "KURAL: BILINEN KIRIK ADRES GERI KABUL",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "  if (aday.url === mevcut.kirikUrl) return null;",
    koy: "",
    bozdugu: "N11'e dusulmus urun, Trendyol ayni bozuk adresi yollayinca yeniden kiriga doner",
  },
  /* ── K273-② kutuyu doldurma + önizleme ── */
  {
    ad: "LISTE RESMI YINE SIGDIRIYOR (object-contain)",
    yon: "KALDIRAN",
    dosya: BILESEN,
    bul: "block cursor-zoom-in rounded-md border object-cover",
    koy: "block cursor-zoom-in rounded-md border object-contain",
    bozdugu: "dikey resim kare kutuda kuculur, iki yanda bosluk - kullanicinin 25.09 sikayeti",
  },
  {
    ad: "BUYUK RESIM HER SATIRDA INIYOR (kosul kalkti)",
    yon: "FAZLADAN",
    dosya: BILESEN,
    bul: "      {onizleme ? (",
    koy: "      {onizleme || true ? (",
    bozdugu: "50 satirlik liste 50 x 27-82 KB onizleme indirir; ustune gelmeden acik durur",
  },
  {
    ad: "DOKUNMA IKI OLAY URETIYOR (fare kapisi kalkti)",
    yon: "FAZLADAN",
    dosya: BILESEN,
    bul: 'if (e.pointerType === "mouse") ac(e.currentTarget);',
    koy: "ac(e.currentTarget);",
    bozdugu: "telefonda dokununca once acilir, ardindan tiklama kapatir - onizleme hic gorunmez",
  },
  {
    ad: "FARE TIKLAMASI ONIZLEMEYI KAPATIYOR (dokunma kapisi kalkti)",
    yon: "FAZLADAN",
    dosya: BILESEN,
    bul: "        if (!dokunma.current) return;",
    koy: "",
    bozdugu: "bilgisayarda resme tiklayan onizlemeyi kapatir; ustundeyken kaybolur",
  },
  {
    ad: "ONIZLEME SAGDA TASIYOR (sola donme kalkti)",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: "    sag + boy + KENAR_PAYI <= ekran.genislik\n      ? sag\n      : Math.max(KENAR_PAYI, kutu.left - KENAR_PAYI - boy);",
    koy: "    sag;",
    bozdugu: "sag kenara yakin resimde onizleme ekrandan tasar, yarisi gorunmez",
  },
  {
    ad: "ONIZLEME KUCUK ADRESI KULLANIYOR",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: 'export const TY_BUYUK_ONEK = "mnresize/600/900/";',
    koy: 'export const TY_BUYUK_ONEK = "mnresize/128/192/";',
    bozdugu: "288 px onizleme 128 px resimden buyutulur - bulanik, buyutme ise yaramaz",
  },
  /* ── K273-③ resim ekle ── */
  {
    ad: "EYLEM IZIN SORMUYOR",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: 'if (!baglam || !baglam.izinler.has("urun.yaz")) return { hata: "YETKISIZ" };',
    koy: 'if (!baglam) return { hata: "YETKISIZ" };',
    bozdugu: "urun duzenleme yetkisi olmayan herkes resim degistirir",
  },
  {
    ad: "EYLEM KAYNAGI ELLE YAZMIYOR",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: 'data: { gorselUrl: denetim.url, gorselKaynak: "ELLE",',
    koy: 'data: { gorselUrl: denetim.url, gorselKaynak: "N11",',
    bozdugu: "elle eklenen resim ilk gece senkronuyla Trendyol'unkiyle ezilir - kullanicinin emegi kaybolur",
  },
  {
    ad: "EYLEM KULLANICININ ADRESINE ISTEK ATIYOR (SSRF)",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: "    if (!v) return { hata: \"BULUNAMADI\" };",
    koy: "    if (!v) return { hata: \"BULUNAMADI\" };\n    await fetch(denetim.url, { method: \"GET\" });",
    bozdugu: "sunucu kullanicinin yazdigi adrese istek atar - ic aga ulasan arac olur",
  },
  {
    ad: "KAYIT ONIZLEMESIZ YAPILABILIYOR",
    yon: "FAZLADAN",
    dosya: BILESEN,
    bul: 'disabled={!gecerli || onizleme !== "ACILDI" || bekliyor}',
    koy: "disabled={!gecerli || bekliyor}",
    bozdugu: "acilmayan (sayfa) linki kaydedilir, kutu kirik resim gosterir",
  },
  {
    ad: "ROZET IZINSIZ DE CIZILIYOR",
    yon: "FAZLADAN",
    dosya: BILESEN,
    bul: "if (ekleyebilir && variantId) {",
    koy: "if (variantId) {",
    bozdugu: "yetkisiz kullanici rozeti gorur, tiklayinca YETKISIZ hatasi alir - kapi kullaniciya acik gorunur",
  },
  {
    ad: "ROZET SOL USTE KAYDI",
    yon: "KALDIRAN",
    dosya: BILESEN,
    bul: "absolute -right-1 -bottom-1",
    koy: "absolute -left-1 -top-1",
    bozdugu: "kullanicinin istedigi yer sag alt kose",
  },
  {
    ad: "KAYITTAN SONRA EKRAN TAZELENMIYOR",
    yon: "KALDIRAN",
    dosya: BILESEN,
    bul: "      router.refresh();",
    koy: "",
    bozdugu: "resim kaydedilir ama rozet ekranda kalir - kullanici kaydin olmadigini sanir",
  },
  {
    ad: "KURAL: http KABUL",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: '  if (u.protocol !== "https:") return { hata: "HTTPS_DEGIL" };',
    koy: "",
    bozdugu: "https sayfasinda http resim karisik icerik uyarisi / engel",
  },
  {
    ad: "KURAL: YEREL ADRES KABUL",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: '    return { hata: "YEREL" };',
    koy: "",
    bozdugu: "ic ag adresleri kayda girer",
  },
  {
    ad: "STOK SAYFASI IZNI GECIRMIYOR",
    yon: "KALDIRAN",
    dosya: STOK,
    bul: "                gorsel={<UrunGorseli ekleyebilir={resimEkleyebilir} variantId={varyant.id}",
    koy: "                gorsel={<UrunGorseli variantId={varyant.id}",
    bozdugu: "telefonda stok kartinda rozet hic cikmaz - depoda resim eklenemez",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("");
console.log("URUN GORSELI - MUTASYON TURU (K273)");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(`${m.ad}\n       desen ${m.dosya} icinde ${adet} kez geciyor (1 olmali) - OLCULEMEDI`);
    continue;
  }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    /* git checkout DEGIL: dosya commit edilmemis olabilir. */
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) {
      bozuk.push(`${m.ad}\n       GERI ALMA BASARISIZ - dosya mutasyonlu kaldi`);
    }
  }
  const isaret = m.yon === "ZARARSIZ" ? "o" : m.yon === "KALDIRAN" ? "-" : "+";
  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) {
      yakalanan++;
      console.log(`  OK  ${isaret} ${m.ad}`);
    } else if (!sonuc.ciktiVar) {
      bozuk.push(`${m.ad}\n       bekci COKTU (baslik basilmadi) - olcum gecersiz`);
    } else {
      kacan.push(`${m.ad}\n       YALANCI KIRMIZI: zararsiz degisiklik bekciyi kirmizi yakti`);
    }
    continue;
  }
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else if (sonuc.kod !== 0) {
    bozuk.push(`${m.ad}\n       bekci COKTU (baslik basilmadi) - olcum gecersiz`);
  } else {
    kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KACAN MUTASYONLAR - bekci bunlari GORMEDI:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI - mutasyon olculemedi:\n");
  for (const b of bozuk) console.log("  !! " + b);
  console.log("");
}
console.log(`  ${yakalanan}/${MUTASYONLAR.length} mutasyon beklendigi gibi davrandi`);
if (kacan.length || bozuk.length) {
  console.log("\n  Kacan ya da olculemeyen mutasyon var - bekci eksik.\n");
  process.exitCode = 1;
} else {
  console.log("\n  OK  Urun gorseli UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
