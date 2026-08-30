/**
 * ============================================================================
 *  DEPO ŞABLONU — SAF KURAL (K50 ①)
 * ----------------------------------------------------------------------------
 *  Mimar kararı 25.08.2026: **depo düzeni firmadan firmaya değişir; kanal
 *  kesinti kuralları nasıl VERİ olduysa depo düzeni de VERİDİR.** Firma
 *  deposunu kendisi çizer, biz şablonu koda gömmeyiz.
 *
 *  ⚠ KURAL BURADA SAF DURUYOR, EKRANDA DEĞİL — `depo:dogrula` veritabanı
 *  olmadan sınayabilsin diye.
 *
 *  ── ŞEMA DEĞİŞMEDİ, VE NİYE GEREKMEDİĞİ ÖLÇÜLDÜ ─────────────────────────
 *  Bölüm/ünite/göz yapısını SAKLAMAYA gerek yok: üretilen kodun KENDİSİ
 *  (`RAF-SLN1-3`) o yapıyı zaten taşıyor. Ayrı bir "depo düzeni" tablosu
 *  açmak, aynı gerçeği iki yere yazmak ve birinin gün gelip ötekinden
 *  ayrışmasını beklemek olurdu. Merdiven birinci basamakta durdu.
 *
 *  Sonuç: bu ekran bir KAYIT ekranı değil, bir ÜRETEÇ. Düzeni tarif
 *  edersiniz, kodları üretir, onaylarsanız raflar açılır.
 * ============================================================================
 */

/** Raf kodu öneki — sabit. Okuyucu bu önekten "raf modu"nu anlar. */
export const RAF_ONEKI = "RAF-";

/**
 * KISALTMA KURALI — BARKOD GÜVENLİ.
 *
 * ⚠ Büyük harf ve rakam; boşluk, Türkçe karakter, tire YOK. Sebebi
 * süsleme değil: bu dize basılı etiketin İÇİNE giriyor. `Code128` Türkçe
 * karakteri taşıyamaz, boşluk ise kodu okurken bölünme riski üretir.
 */
export const KISALTMA_KURALI = /^[A-Z0-9]{1,6}$/;

export type BolumTarifi = {
  /** Görünen ad — serbest: "Salon", "Depo-2", "A". */
  ad: string;
  /** Koda giren kısaltma: "SLN". Kurallı ve SONRADAN DEĞİŞMEZ. */
  kisaltma: string;
  uniteSayisi: number;
  gozSayisi: number;
};

export type TarifeHatasi =
  | "AD_BOS"
  | "KISALTMA_BOS"
  | "KISALTMA_KURALSIZ"
  | "UNITE_GECERSIZ"
  | "GOZ_GECERSIZ";

/** En fazla — kazayla 10.000 raf üretilmesin. */
export const UST_SINIR = { unite: 99, goz: 99, toplam: 2000 } as const;

export function tarifiDenetle(t: BolumTarifi): TarifeHatasi[] {
  const hatalar: TarifeHatasi[] = [];
  if (!t.ad.trim()) hatalar.push("AD_BOS");
  if (!t.kisaltma.trim()) hatalar.push("KISALTMA_BOS");
  else if (!KISALTMA_KURALI.test(t.kisaltma)) hatalar.push("KISALTMA_KURALSIZ");
  if (!Number.isInteger(t.uniteSayisi) || t.uniteSayisi < 1 || t.uniteSayisi > UST_SINIR.unite) {
    hatalar.push("UNITE_GECERSIZ");
  }
  if (!Number.isInteger(t.gozSayisi) || t.gozSayisi < 1 || t.gozSayisi > UST_SINIR.goz) {
    hatalar.push("GOZ_GECERSIZ");
  }
  return hatalar;
}

/**
 * KODLARI ÜRET.
 *
 * ⚠ GÖZ NUMARASI YERDEN YUKARI — 1 = EN ALT. SABİT KURAL, AYAR DEĞİL.
 * Gerekçe ekranda da yazar: üste kat eklenince mevcut etiketlerin hiçbiri
 * değişmez. Üstten saysaydık bir kat ekleyen kişi bütün etiketleri sökmek
 * zorunda kalırdı — ve etiket kimliktir, kimlik sökülmez.
 *
 * ⚠ SIRALAMA ÜNİTE→GÖZ: aynı ünitenin gözleri yan yana çıksın ki basılan
 * A4 sayfası fiziksel dizilime uysun.
 */
export function kodlariUret(t: BolumTarifi): string[] {
  const kodlar: string[] = [];
  for (let unite = 1; unite <= t.uniteSayisi; unite++) {
    for (let goz = 1; goz <= t.gozSayisi; goz++) {
      kodlar.push(`${RAF_ONEKI}${t.kisaltma}${unite}-${goz}`);
    }
  }
  return kodlar;
}

/**
 * ÜRETİLEN KOD ŞABLONA UYUYOR MU — bekçinin ölçütü.
 *
 * ⚠ İÇERİKTEN AD TÜRETME YASAĞI BURADAN GEÇER: `RAF-LEGO` bu desene
 * uymaz çünkü kısaltmadan sonra ÜNİTE NUMARASI ve tireli GÖZ zorunlu.
 * Kod konumdan türer, içerikten değil — raf boşalınca adı yalan olmasın.
 */
export const KOD_SABLONU = /^RAF-[A-Z0-9]{1,6}\d+-\d+$/;

export function kodSablonaUyuyorMu(kod: string): boolean {
  return KOD_SABLONU.test(kod);
}

export type UretimOzeti = {
  kodlar: string[];
  toplam: number;
  /** Zaten var olanlar — yeniden üretilmez, ÜSTÜNE YAZILMAZ. */
  mevcut: string[];
  /** Gerçekten açılacaklar. */
  yeni: string[];
  sinirAsildi: boolean;
};

/**
 * PLANI KUR — YAZMADAN ÖNCE NE OLACAĞINI SÖYLER.
 *
 * ⚠ VAR OLAN KOD ÜSTÜNE YAZILMAZ, ATLANIR. Aynı bölüm ikinci kez
 * tarif edilirse (ör. üniteye kat eklendi) mevcut raflara dokunulmaz:
 * onların üstünde ÜRÜN var ve basılı etiketleri raflarda duruyor.
 * "Kapasite artırma = EKLEME" kuralı tam olarak budur.
 */
export function uretimPlani(t: BolumTarifi, mevcutKodlar: readonly string[]): UretimOzeti {
  const kodlar = kodlariUret(t);
  const set = new Set(mevcutKodlar);
  const mevcut = kodlar.filter((k) => set.has(k));
  const yeni = kodlar.filter((k) => !set.has(k));
  return {
    kodlar,
    toplam: kodlar.length,
    mevcut,
    yeni,
    sinirAsildi: kodlar.length > UST_SINIR.toplam,
  };
}

/**
 * ============================================================================
 *  KISALTMA NORMALLEŞTİRME — `İ` TUZAĞINI YAPISAL KAPATIR
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI ÖLÇÜM 30.08.2026: `Location.name` alanında `OFİS` (13 raf) ve
 *  `Ofis` (1 raf) AYRI kayıt olarak duruyordu — aynı bölüm İKİ KİMLİK.
 *
 *  ⚠ VE `toUpperCase()` TEK BAŞINA YETMEZ: Türkçe `İ` JavaScript'te `i`ye
 *  inmez (`"İ".toLowerCase() !== "i"`). Bu tuzak bu depoda daha önce bir
 *  kolon eşleşmesini de sessizce bozmuştu.
 *
 *  ⭐ `KISALTMA_KURALI` yalnız DENETLER (`/^[A-Z0-9]{1,6}$/`); girilen
 *  `Ofis`i reddeder ama `OFİS` ile `Ofis`in AYNI ŞEY olduğunu söylemez.
 *  Normalleştirme o boşluğu kapatıyor: ikisi de `OFIS`e iner ve
 *  `DepoBolumu.kisaltma @unique` ikincisini reddeder.
 *
 *  ⚠ VE BARKOD-GÜVENLİ: Code128'in B kümesi ASCII 32–126 taşır; Türkçe
 *  harfler oraya girmez. Normalleştirme yalnız çakışmayı değil, ETİKETİN
 *  BASILABİLİRLİĞİNİ de garanti eder.
 * ============================================================================
 */
const HARF_ESLEMESI: Record<string, string> = {
  İ: "I", I: "I", ı: "I", i: "I",
  Ş: "S", ş: "S",
  Ğ: "G", ğ: "G",
  Ü: "U", ü: "U",
  Ö: "O", ö: "O",
  Ç: "C", ç: "C",
};

export function kisaltmaNormalle(ham: string): string {
  let cikti = "";
  for (const ch of ham.trim()) {
    const esit = HARF_ESLEMESI[ch];
    if (esit !== undefined) {
      cikti += esit;
      continue;
    }
    const buyuk = ch.toUpperCase();
    /** ⚠ Yalnız A–Z ve 0–9 kalır; boşluk ve noktalama DÜŞER. */
    if (/^[A-Z0-9]$/.test(buyuk)) cikti += buyuk;
  }
  return cikti;
}
