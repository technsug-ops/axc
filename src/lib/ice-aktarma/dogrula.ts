import { SUTUNLAR, type SayfaAnahtari } from "./sutunlar";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  İÇE AKTARMA DOĞRULAYICI — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ, hiçbir şey YAZMAZ, saati kendi okumaz. Girdisi
 *  "dosyadan okunan ham satırlar" + "sistemde ne var" bilgisidir; çıktısı
 *  "hata listesi" ve "yazılacak olan"dır.
 *
 *  BU MODÜLÜN RUHU: ÖNİZLE-ÖNCE-YAZ.
 *  Tek bir satır bile hatalıysa `hatalar` dolu döner ve çağıran taraf HİÇBİR
 *  ŞEY yazmaz. Yarım aktarma yoktur — 400 satırın 399'u geçse bile.
 *
 *  HATA METNİ ÜRETMEZ, HATA KODU ÜRETİR. Metin ekranda sözlükten çözülür;
 *  böylece motor dilden bağımsız kalır ve testler Türkçe cümleye değil
 *  kararlı koda bakar.
 * ============================================================================
 */

export type Kip = "YALNIZ_YENI" | "GUNCELLE";

export type HataKodu =
  | "ZORUNLU"
  | "SAYI_OLMALI"
  | "POZITIF_OLMALI"
  | "TAM_SAYI_OLMALI"
  | "ARALIK_DISI"
  | "TEKRAR_DOSYADA"
  | "ZATEN_KAYITLI"
  | "BULUNAMADI"
  | "SKU_TANIMSIZ"
  | "GECERSIZ_SECENEK"
  | "GECERSIZ_TARIH"
  | "PARA_BIRIMI_EKSIK"
  | "HIC_SATIR_YOK";

export type SatirHatasi = {
  sayfa: SayfaAnahtari | null;
  /** Elektronik tablodaki satır numarası (başlık 1. satır). null = dosya geneli. */
  satir: number | null;
  /** Sütun anahtarı — ekran başlığı buradan çözülür. */
  alan: string | null;
  kod: HataKodu;
  deger?: string;
  /** Ek bilgi: çakışılan satır no, en yakın öneri, geçerli seçenekler... */
  ek?: string;
};

export type HamSatir = {
  /** Elektronik tablodaki gerçek satır numarası. */
  satirNo: number;
  hucreler: Record<string, string>;
};

export type HamVeri = Record<SayfaAnahtari, HamSatir[]>;

export type MevcutVaryant = {
  id: string;
  urunId: string;
  sku: string;
  firmaSku: string;
  barkod: string | null;
};

export type Referans = {
  kategoriler: { id: string; ad: string }[];
  raflar: { id: string; kod: string }[];
  /** "Trendyol — TR Ana Mağaza" biçiminde etiket. */
  kanalHesaplari: { id: string; etiket: string }[];
  mevcutVaryantlar: MevcutVaryant[];
  /** Zaten tanımlı kanal-SKU eşleşmeleri. */
  mevcutKanalSkulari: { kanalHesabiId: string; varyantId: string }[];
  /** Parti tarihi boş bırakılırsa kullanılacak gün (UTC gece yarısı). */
  bugun: Date;
};

// --- YAZIM PLANI: ne oluşacak, ne güncellenecek -----------------------------

export type YeniUrun = {
  id: string;
  ad: string;
  marka: string | null;
  kategoriId: string | null;
  desi: number | null;
  cokVaryantli: boolean;
};

export type YeniVaryant = {
  id: string;
  urunId: string;
  sku: string;
  firmaSku: string;
  barkod: string | null;
  ad: string | null;
  varsayilan: boolean;
  rafId: string | null;
};

export type VaryantGuncellemesi = {
  id: string;
  firmaSku: string;
  barkod: string | null;
  ad: string | null;
  rafId: string | null;
};

export type AcilisHareketi = {
  id: string;
  /** Yeni varyantsa geçici kimliği, mevcutsa gerçek kimliği. */
  varyantId: string;
  adet: number;
  birimMaliyet: number | null;
  paraBirimi: Currency | null;
  tarih: Date;
  rafId: string | null;
  not: string | null;
};

export type KanalSkuKaydi = {
  id: string;
  varyantId: string;
  kanalHesabiId: string;
  kanalKodu: string;
  komisyonOrani: number | null;
};

export type YazimPlani = {
  yeniUrunler: YeniUrun[];
  yeniVaryantlar: YeniVaryant[];
  guncellenenVaryantlar: VaryantGuncellemesi[];
  acilisHareketleri: AcilisHareketi[];
  yeniKanalSkulari: KanalSkuKaydi[];
  guncellenenKanalSkulari: KanalSkuKaydi[];
};

export type Ozet = {
  yeniUrun: number;
  yeniVaryant: number;
  guncellenenVaryant: number;
  acilisPartisi: number;
  acilisAdet: number;
  yeniKanalSku: number;
  guncellenenKanalSku: number;
};

export type DogrulamaSonucu = {
  hatalar: SatirHatasi[];
  ozet: Ozet;
  plan: YazimPlani;
};

// ---------------------------------------------------------------------------
//  YARDIMCILAR
// ---------------------------------------------------------------------------

/** Karşılaştırma için normalleştirir: boşluk kırpar, büyük/küçük harf eşitler. */
function anahtarla(deger: string): string {
  return deger.trim().toLocaleLowerCase("tr");
}

/** "12.500,75" / "12500.75" / "1200" -> sayı. Boşsa null, bozuksa NaN. */
export function sayiCoz(ham: string): number | null {
  const metin = ham
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (metin === "") return null;
  return Number(metin);
}

/**
 * "01.03.2026" veya "2026-03-01" -> UTC gece yarısı.
 * Elektronik tablodan tarih hücresi metin olarak gelebildiği için iki biçim
 * de kabul edilir. Bozuksa undefined.
 */
export function tarihCoz(ham: string): Date | null | undefined {
  const metin = ham.trim();
  if (metin === "") return null;

  const noktali = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/.exec(metin);
  const tireli = /^(\d{4})-(\d{2})-(\d{2})$/.exec(metin);

  let yil: number, ay: number, gun: number;
  if (noktali) {
    gun = Number(noktali[1]);
    ay = Number(noktali[2]);
    yil = Number(noktali[3]);
  } else if (tireli) {
    yil = Number(tireli[1]);
    ay = Number(tireli[2]);
    gun = Number(tireli[3]);
  } else {
    return undefined;
  }

  if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return undefined;
  const tarih = new Date(Date.UTC(yil, ay - 1, gun));
  if (tarih.getUTCMonth() + 1 !== ay || tarih.getUTCDate() !== gun) {
    return undefined;
  }
  return tarih;
}

/**
 * Yazım hatasını yakalamak için en yakın adayı bulur (Levenshtein).
 * "Elektonik" yazıldığında "Elektronik" önerilir — kullanıcı listeyi
 * baştan taramak zorunda kalmaz.
 */
export function enYakin(aranan: string, adaylar: string[]): string | null {
  const hedef = anahtarla(aranan);
  let enIyi: string | null = null;
  let enIyiUzaklik = Infinity;

  for (const aday of adaylar) {
    const uzaklik = uzaklikHesapla(hedef, anahtarla(aday));
    if (uzaklik < enIyiUzaklik) {
      enIyiUzaklik = uzaklik;
      enIyi = aday;
    }
  }

  // Çok uzaksa öneri vermek kafa karıştırır.
  const esik = Math.max(2, Math.floor(hedef.length / 3));
  return enIyiUzaklik <= esik ? enIyi : null;
}

function uzaklikHesapla(a: string, b: string): number {
  const onceki = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let sonUstSol = onceki[0];
    onceki[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const gecici = onceki[j];
      onceki[j] = Math.min(
        onceki[j] + 1,
        onceki[j - 1] + 1,
        sonUstSol + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      sonUstSol = gecici;
    }
  }
  return onceki[b.length];
}

// ---------------------------------------------------------------------------
//  DOĞRULAMA
// ---------------------------------------------------------------------------

export function iceAktarmaDogrula(
  veri: HamVeri,
  referans: Referans,
  kip: Kip,
  /** Kimlik üretici — dışarıdan verilir ki test tekrarlanabilir olsun. */
  kimlikUret: () => string,
): DogrulamaSonucu {
  const hatalar: SatirHatasi[] = [];
  const plan: YazimPlani = {
    yeniUrunler: [],
    yeniVaryantlar: [],
    guncellenenVaryantlar: [],
    acilisHareketleri: [],
    yeniKanalSkulari: [],
    guncellenenKanalSkulari: [],
  };

  const hata = (h: SatirHatasi) => hatalar.push(h);

  // --- referans dizinleri ---
  const kategoriDizini = new Map(
    referans.kategoriler.map((k) => [anahtarla(k.ad), k.id]),
  );
  const rafDizini = new Map(referans.raflar.map((r) => [anahtarla(r.kod), r.id]));
  const hesapDizini = new Map(
    referans.kanalHesaplari.map((h) => [anahtarla(h.etiket), h.id]),
  );
  const mevcutSku = new Map(
    referans.mevcutVaryantlar.map((v) => [anahtarla(v.sku), v]),
  );
  const mevcutFirmaSku = new Map(
    referans.mevcutVaryantlar.map((v) => [anahtarla(v.firmaSku), v]),
  );
  const mevcutBarkod = new Map(
    referans.mevcutVaryantlar
      .filter((v) => v.barkod)
      .map((v) => [anahtarla(v.barkod!), v]),
  );
  const mevcutEsleme = new Set(
    referans.mevcutKanalSkulari.map((e) => `${e.kanalHesabiId}|${e.varyantId}`),
  );

  const hicSatirYok =
    veri.urunler.length === 0 &&
    veri.acilisStogu.length === 0 &&
    veri.kanalSku.length === 0;
  if (hicSatirYok) {
    hata({ sayfa: null, satir: null, alan: null, kod: "HIC_SATIR_YOK" });
    return { hatalar, ozet: bosOzet(), plan };
  }

  /** Zorunlu sütunlar dolu mu? */
  function zorunlulariDenetle(sayfa: SayfaAnahtari, satir: HamSatir) {
    let eksikVar = false;
    for (const sutun of SUTUNLAR[sayfa]) {
      if (!sutun.zorunlu) continue;
      if ((satir.hucreler[sutun.anahtar] ?? "").trim() === "") {
        hata({
          sayfa,
          satir: satir.satirNo,
          alan: sutun.anahtar,
          kod: "ZORUNLU",
        });
        eksikVar = true;
      }
    }
    return !eksikVar;
  }

  // =========================================================================
  //  1) ÜRÜNLER
  // =========================================================================
  /** Dosyada tanımlanan SKU -> varyant kimliği (yeni veya mevcut). */
  const dosyaSku = new Map<string, string>();
  const dosyadaGorulen = {
    sku: new Map<string, number>(),
    firmaSku: new Map<string, number>(),
    barkod: new Map<string, number>(),
  };
  /** Ürün grubu: ad+marka -> ürün kimliği. */
  const urunGruplari = new Map<string, YeniUrun>();

  for (const satir of veri.urunler) {
    if (!zorunlulariDenetle("urunler", satir)) continue;

    const oku = (a: string) => (satir.hucreler[a] ?? "").trim();
    const sku = oku("sku");
    const firmaSku = oku("firmaSku");
    const barkod = oku("barkod");

    // --- dosya içi tekrar ---
    let tekrarVar = false;
    for (const [alan, deger] of [
      ["sku", sku],
      ["firmaSku", firmaSku],
      ["barkod", barkod],
    ] as const) {
      if (deger === "") continue;
      const dizin = dosyadaGorulen[alan];
      const oncekiSatir = dizin.get(anahtarla(deger));
      if (oncekiSatir !== undefined) {
        hata({
          sayfa: "urunler",
          satir: satir.satirNo,
          alan,
          kod: "TEKRAR_DOSYADA",
          deger,
          ek: String(oncekiSatir),
        });
        tekrarVar = true;
      } else {
        dizin.set(anahtarla(deger), satir.satirNo);
      }
    }
    if (tekrarVar) continue;

    // --- sistemde var mı? ---
    const mevcut = mevcutSku.get(anahtarla(sku));
    if (mevcut && kip === "YALNIZ_YENI") {
      hata({
        sayfa: "urunler",
        satir: satir.satirNo,
        alan: "sku",
        kod: "ZATEN_KAYITLI",
        deger: sku,
      });
      continue;
    }

    // Firma SKU / barkod BAŞKA bir varyanta aitse her kipte hatadır.
    const firmaSahibi = mevcutFirmaSku.get(anahtarla(firmaSku));
    if (firmaSahibi && firmaSahibi.id !== mevcut?.id) {
      hata({
        sayfa: "urunler",
        satir: satir.satirNo,
        alan: "firmaSku",
        kod: "ZATEN_KAYITLI",
        deger: firmaSku,
      });
      continue;
    }
    if (barkod) {
      const barkodSahibi = mevcutBarkod.get(anahtarla(barkod));
      if (barkodSahibi && barkodSahibi.id !== mevcut?.id) {
        hata({
          sayfa: "urunler",
          satir: satir.satirNo,
          alan: "barkod",
          kod: "ZATEN_KAYITLI",
          deger: barkod,
        });
        continue;
      }
    }

    // --- kategori / raf: listede yoksa HATA (kullanıcı kararı 10.08.2026) ---
    const kategoriAdi = oku("kategori");
    let kategoriId: string | null = null;
    if (kategoriAdi !== "") {
      kategoriId = kategoriDizini.get(anahtarla(kategoriAdi)) ?? null;
      if (!kategoriId) {
        hata({
          sayfa: "urunler",
          satir: satir.satirNo,
          alan: "kategori",
          kod: "BULUNAMADI",
          deger: kategoriAdi,
          ek: enYakin(kategoriAdi, referans.kategoriler.map((k) => k.ad)) ?? undefined,
        });
        continue;
      }
    }

    const rafKodu = oku("raf");
    let rafId: string | null = null;
    if (rafKodu !== "") {
      rafId = rafDizini.get(anahtarla(rafKodu)) ?? null;
      if (!rafId) {
        hata({
          sayfa: "urunler",
          satir: satir.satirNo,
          alan: "raf",
          kod: "BULUNAMADI",
          deger: rafKodu,
          ek: enYakin(rafKodu, referans.raflar.map((r) => r.kod)) ?? undefined,
        });
        continue;
      }
    }

    // --- desi ---
    const desiHam = oku("desi");
    const desi = sayiCoz(desiHam);
    if (desi !== null && !Number.isFinite(desi)) {
      hata({
        sayfa: "urunler",
        satir: satir.satirNo,
        alan: "desi",
        kod: "SAYI_OLMALI",
        deger: desiHam,
      });
      continue;
    }
    if (desi !== null && desi < 0) {
      hata({
        sayfa: "urunler",
        satir: satir.satirNo,
        alan: "desi",
        kod: "POZITIF_OLMALI",
        deger: desiHam,
      });
      continue;
    }

    const varyantAdi = oku("varyantAdi") || null;

    // --- MEVCUT VARYANT: güncelle ---
    if (mevcut) {
      plan.guncellenenVaryantlar.push({
        id: mevcut.id,
        firmaSku,
        barkod: barkod || null,
        ad: varyantAdi,
        rafId,
      });
      dosyaSku.set(anahtarla(sku), mevcut.id);
      continue;
    }

    // --- YENİ VARYANT: ürün grubuna bağla ---
    const urunAdi = oku("urunAdi");
    const marka = oku("marka") || null;
    const grupAnahtari = `${anahtarla(urunAdi)}|${anahtarla(marka ?? "")}`;

    let urun = urunGruplari.get(grupAnahtari);
    if (!urun) {
      urun = {
        id: kimlikUret(),
        ad: urunAdi,
        marka,
        kategoriId,
        desi,
        cokVaryantli: false,
      };
      urunGruplari.set(grupAnahtari, urun);
      plan.yeniUrunler.push(urun);
    } else {
      // İkinci satırdan itibaren ürün çok varyantlıdır.
      urun.cokVaryantli = true;
    }

    const varyantId = kimlikUret();
    plan.yeniVaryantlar.push({
      id: varyantId,
      urunId: urun.id,
      sku,
      firmaSku,
      barkod: barkod || null,
      ad: varyantAdi,
      // Grubun İLK satırı varsayılan varyanttır (şema: tam olarak bir tane).
      varsayilan: !urun.cokVaryantli,
      rafId,
    });
    dosyaSku.set(anahtarla(sku), varyantId);
  }

  /** SKU dosyada mı sistemde mi — açılış stoğu ve kanal SKU için ortak. */
  function varyantiBul(sku: string): string | null {
    return (
      dosyaSku.get(anahtarla(sku)) ??
      mevcutSku.get(anahtarla(sku))?.id ??
      null
    );
  }

  // =========================================================================
  //  2) AÇILIŞ STOĞU — her satır AYRI bir FIFO partisi
  // =========================================================================
  for (const satir of veri.acilisStogu) {
    if (!zorunlulariDenetle("acilisStogu", satir)) continue;

    const oku = (a: string) => (satir.hucreler[a] ?? "").trim();
    const sku = oku("sku");

    const varyantId = varyantiBul(sku);
    if (!varyantId) {
      hata({
        sayfa: "acilisStogu",
        satir: satir.satirNo,
        alan: "sku",
        kod: "SKU_TANIMSIZ",
        deger: sku,
      });
      continue;
    }

    const adetHam = oku("adet");
    const adet = sayiCoz(adetHam);
    if (adet === null || !Number.isFinite(adet)) {
      hata({ sayfa: "acilisStogu", satir: satir.satirNo, alan: "adet", kod: "SAYI_OLMALI", deger: adetHam });
      continue;
    }
    if (!Number.isInteger(adet)) {
      hata({ sayfa: "acilisStogu", satir: satir.satirNo, alan: "adet", kod: "TAM_SAYI_OLMALI", deger: adetHam });
      continue;
    }
    if (adet <= 0) {
      hata({ sayfa: "acilisStogu", satir: satir.satirNo, alan: "adet", kod: "POZITIF_OLMALI", deger: adetHam });
      continue;
    }

    const maliyetHam = oku("birimMaliyet");
    const maliyet = sayiCoz(maliyetHam);
    if (maliyet !== null && (!Number.isFinite(maliyet) || maliyet <= 0)) {
      hata({ sayfa: "acilisStogu", satir: satir.satirNo, alan: "birimMaliyet", kod: "POZITIF_OLMALI", deger: maliyetHam });
      continue;
    }

    const paraHam = oku("paraBirimi").toUpperCase();
    let paraBirimi: Currency | null = null;
    if (maliyet !== null) {
      // Maliyet varsa para birimi ZORUNLU — hangi paradan olduğu bilinmeden
      // kâr motoru CURRENCY_MISMATCH üretirdi.
      if (paraHam === "") {
        hata({ sayfa: "acilisStogu", satir: satir.satirNo, alan: "paraBirimi", kod: "PARA_BIRIMI_EKSIK" });
        continue;
      }
      if (paraHam !== "TRY" && paraHam !== "EUR") {
        hata({ sayfa: "acilisStogu", satir: satir.satirNo, alan: "paraBirimi", kod: "GECERSIZ_SECENEK", deger: paraHam, ek: "TRY, EUR" });
        continue;
      }
      paraBirimi = paraHam;
    }

    const tarihHam = oku("tarih");
    const tarih = tarihCoz(tarihHam);
    if (tarih === undefined) {
      hata({ sayfa: "acilisStogu", satir: satir.satirNo, alan: "tarih", kod: "GECERSIZ_TARIH", deger: tarihHam });
      continue;
    }

    const rafKodu = oku("raf");
    let rafId: string | null = null;
    if (rafKodu !== "") {
      rafId = rafDizini.get(anahtarla(rafKodu)) ?? null;
      if (!rafId) {
        hata({
          sayfa: "acilisStogu",
          satir: satir.satirNo,
          alan: "raf",
          kod: "BULUNAMADI",
          deger: rafKodu,
          ek: enYakin(rafKodu, referans.raflar.map((r) => r.kod)) ?? undefined,
        });
        continue;
      }
    }

    plan.acilisHareketleri.push({
      id: kimlikUret(),
      varyantId,
      adet,
      birimMaliyet: maliyet,
      paraBirimi,
      // Tarih yazılmazsa yükleme günü (kullanıcı kararı 10.08.2026).
      tarih: tarih ?? referans.bugun,
      rafId,
      not: oku("not") || null,
    });
  }

  // =========================================================================
  //  3) KANAL SKU
  // =========================================================================
  const dosyadaEsleme = new Map<string, number>();

  for (const satir of veri.kanalSku) {
    if (!zorunlulariDenetle("kanalSku", satir)) continue;

    const oku = (a: string) => (satir.hucreler[a] ?? "").trim();
    const sku = oku("sku");

    const varyantId = varyantiBul(sku);
    if (!varyantId) {
      hata({ sayfa: "kanalSku", satir: satir.satirNo, alan: "sku", kod: "SKU_TANIMSIZ", deger: sku });
      continue;
    }

    const hesapEtiketi = oku("kanalHesabi");
    const hesapId = hesapDizini.get(anahtarla(hesapEtiketi));
    if (!hesapId) {
      hata({
        sayfa: "kanalSku",
        satir: satir.satirNo,
        alan: "kanalHesabi",
        kod: "BULUNAMADI",
        deger: hesapEtiketi,
        ek: enYakin(hesapEtiketi, referans.kanalHesaplari.map((h) => h.etiket)) ?? undefined,
      });
      continue;
    }

    const eslemeAnahtari = `${hesapId}|${varyantId}`;
    const oncekiSatir = dosyadaEsleme.get(eslemeAnahtari);
    if (oncekiSatir !== undefined) {
      hata({
        sayfa: "kanalSku",
        satir: satir.satirNo,
        alan: "kanalHesabi",
        kod: "TEKRAR_DOSYADA",
        deger: hesapEtiketi,
        ek: String(oncekiSatir),
      });
      continue;
    }
    dosyadaEsleme.set(eslemeAnahtari, satir.satirNo);

    const oranHam = oku("komisyonOrani");
    const oran = sayiCoz(oranHam);
    if (oran !== null && !Number.isFinite(oran)) {
      hata({ sayfa: "kanalSku", satir: satir.satirNo, alan: "komisyonOrani", kod: "SAYI_OLMALI", deger: oranHam });
      continue;
    }
    if (oran !== null && (oran < 0 || oran > 100)) {
      hata({ sayfa: "kanalSku", satir: satir.satirNo, alan: "komisyonOrani", kod: "ARALIK_DISI", deger: oranHam, ek: "0-100" });
      continue;
    }

    const kayit: KanalSkuKaydi = {
      id: kimlikUret(),
      varyantId,
      kanalHesabiId: hesapId,
      // Kanal kodu boşsa sistem SKU'su kullanılır (şemada zorunlu alan).
      kanalKodu: oku("kanalKodu") || sku,
      komisyonOrani: oran,
    };

    const zatenVar = mevcutEsleme.has(eslemeAnahtari);
    if (zatenVar && kip === "YALNIZ_YENI") {
      hata({
        sayfa: "kanalSku",
        satir: satir.satirNo,
        alan: "kanalHesabi",
        kod: "ZATEN_KAYITLI",
        deger: hesapEtiketi,
      });
      continue;
    }

    if (zatenVar) plan.guncellenenKanalSkulari.push(kayit);
    else plan.yeniKanalSkulari.push(kayit);
  }

  // --- HATA VARSA PLAN GEÇERSİZDİR ---
  // Yarım plan kazara yazılmasın diye boşaltılır: "ya hepsi ya hiçi".
  if (hatalar.length > 0) {
    return { hatalar, ozet: bosOzet(), plan: bosPlan() };
  }

  return {
    hatalar,
    ozet: {
      yeniUrun: plan.yeniUrunler.length,
      yeniVaryant: plan.yeniVaryantlar.length,
      guncellenenVaryant: plan.guncellenenVaryantlar.length,
      acilisPartisi: plan.acilisHareketleri.length,
      acilisAdet: plan.acilisHareketleri.reduce((t, h) => t + h.adet, 0),
      yeniKanalSku: plan.yeniKanalSkulari.length,
      guncellenenKanalSku: plan.guncellenenKanalSkulari.length,
    },
    plan,
  };
}

function bosOzet(): Ozet {
  return {
    yeniUrun: 0,
    yeniVaryant: 0,
    guncellenenVaryant: 0,
    acilisPartisi: 0,
    acilisAdet: 0,
    yeniKanalSku: 0,
    guncellenenKanalSku: 0,
  };
}

function bosPlan(): YazimPlani {
  return {
    yeniUrunler: [],
    yeniVaryantlar: [],
    guncellenenVaryantlar: [],
    acilisHareketleri: [],
    yeniKanalSkulari: [],
    guncellenenKanalSkulari: [],
  };
}
