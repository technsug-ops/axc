// Veritabanına dokunan `yedek.ts` DEĞİL, sabitleri taşıyan `yedek-bicim.ts`
// kullanılıyor: bu dosya geri yükleme ekranından (istemci) da içe aktarılıyor
// ve Prisma istemcisinin tarayıcı paketine sızmaması gerekiyor.
import {
  YEDEK_SURUMU,
  YEDEK_TABLOLARI,
  type YedekDosyasi,
} from "@/lib/yedek-bicim";

/**
 * ============================================================================
 *  GERİ YÜKLEME — ÇÖZÜMLEME VE FARK RAPORU (SAF)
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ. Dosyayı okur, doğrular ve "ne olacak"ı hesaplar.
 *  Yazan taraf ayrıdır (`geri-yukle-calistir.ts`); böylece en tehlikeli
 *  ekranın karar mantığı gerçek veri olmadan sınanabilir.
 *
 *  BU EKRAN FELAKET ANINDA KULLANILIR. Kullanıcı muhtemelen paniktedir ve
 *  ilk kez görüyordur. Bu yüzden:
 *    - her hata kodunun ekranda SAKİN ve YOL GÖSTERİCİ bir karşılığı var
 *    - "bozuk dosya" demek yetmez; hangi tablonun, neden bozuk olduğu yazılır
 *    - hiçbir şey tahmin edilmez: eksik tablo eksik sayılır, sıfır sayılmaz
 * ============================================================================
 */

export type CozumHatasi =
  /** Dosya JSON bile değil. */
  | { kod: "JSON_DEGIL"; ayrinti: string }
  /** JSON ama Selliora yedeği değil (bicim alanı tutmuyor). */
  | { kod: "YEDEK_DEGIL" }
  /** Dosya bu sürümden YENİ — okumaya kalkmak veri bozar. */
  | { kod: "SURUM_YENI"; dosyaSurumu: number; desteklenen: number }
  /** `tablolar` alanı yok ya da nesne değil. */
  | { kod: "TABLO_YOK" }
  /** Bir tablo dizi değil — dosya bozulmuş. */
  | { kod: "TABLO_BOZUK"; tablo: string };

export type CozumSonucu =
  | { tamam: true; yedek: YedekDosyasi }
  | { tamam: false; hata: CozumHatasi };

/**
 * Yedek dosyasını çözer ve doğrular.
 *
 * ESKİ SÜRÜM KABUL EDİLİR, YENİ SÜRÜM REDDEDİLİR. Eski dosyada tablo eksik
 * olabilir — bunu fark raporu tek tek gösterir. Yeni sürüm dosyayı ise
 * anlamadığımız alanlar taşıyabilir; "elimden geldiğince okurum" demek
 * sessiz veri kaybının ta kendisidir.
 */
export function yedegiCoz(metin: string): CozumSonucu {
  let ham: unknown;
  try {
    ham = JSON.parse(metin);
  } catch (e) {
    return {
      tamam: false,
      hata: { kod: "JSON_DEGIL", ayrinti: String(e).slice(0, 200) },
    };
  }

  if (typeof ham !== "object" || ham === null) {
    return { tamam: false, hata: { kod: "YEDEK_DEGIL" } };
  }

  const nesne = ham as Record<string, unknown>;
  if (nesne.bicim !== "selliora-yedek") {
    return { tamam: false, hata: { kod: "YEDEK_DEGIL" } };
  }

  const surum = typeof nesne.surum === "number" ? nesne.surum : 0;
  if (surum > YEDEK_SURUMU) {
    return {
      tamam: false,
      hata: { kod: "SURUM_YENI", dosyaSurumu: surum, desteklenen: YEDEK_SURUMU },
    };
  }

  const tablolar = nesne.tablolar;
  if (typeof tablolar !== "object" || tablolar === null) {
    return { tamam: false, hata: { kod: "TABLO_YOK" } };
  }

  // Dosyadaki her tablo GERÇEKTEN dizi mi? Bozuk bir alan geri yükleme
  // ortasında patlarsa işlem yarıda kalır; burada yakalanır.
  for (const [ad, satirlar] of Object.entries(tablolar)) {
    if (!Array.isArray(satirlar)) {
      return { tamam: false, hata: { kod: "TABLO_BOZUK", tablo: ad } };
    }
  }

  return {
    tamam: true,
    yedek: {
      bicim: "selliora-yedek",
      surum,
      olusturulmaAni:
        typeof nesne.olusturulmaAni === "string" ? nesne.olusturulmaAni : "",
      kargoTarifesiHaric: nesne.kargoTarifesiHaric === true,
      satirSayilari:
        typeof nesne.satirSayilari === "object" && nesne.satirSayilari !== null
          ? (nesne.satirSayilari as Record<string, number>)
          : {},
      tablolar: tablolar as Record<string, unknown[]>,
    },
  };
}

// ---------------------------------------------------------------------------
//  FARK RAPORU
// ---------------------------------------------------------------------------

export type TabloFarki = {
  tablo: string;
  /** Şu anda veritabanında kaç satır var — SİLİNECEK olan. */
  mevcut: number;
  /** Yedekten kaç satır gelecek. */
  gelecek: number;
  /** Bu tablo dosyada HİÇ YOK (eski sürüm yedek). */
  dosyadaYok: boolean;
};

export type FarkRaporu = {
  satirlar: TabloFarki[];
  toplamMevcut: number;
  toplamGelecek: number;
  /** Dosyada olmayan tablolar — geri yüklemede BOŞALIR. */
  eksikTablolar: string[];
  /**
   * Veri KAYBEDİLECEK mi? Mevcutta olup yedekte olmayan satır varsa true.
   * Ekran bunu en tepede, en büyük puntoda söyler.
   */
  kayipVar: boolean;
  /** Kargo tarifeleri dosyada yok — seed ile tamamlanacak. */
  tarifeSeedGerekli: boolean;
  /**
   * GİRİŞ HESABI KAYBI: şu an kullanıcı var ama yedekte YOK.
   *
   * Bu, diğer tablo kayıplarından farklı bir şeydir — geri yükleme
   * bittiğinde sisteme GİREMEZSİNİZ ve düzeltmek için sunucuya komut
   * satırından erişmek gerekir. Ayrı bayrak, ekranda ayrı ve en sert
   * uyarı. _12.08.2026: eski biçimli bir yedekte User 2 -> 0 görüldü._
   */
  girisKaybi: boolean;
};

/**
 * "Ne silinecek, ne gelecek" tablosu.
 *
 * DOSYADA OLMAYAN TABLO BOŞALIR — atlanmaz. Kısmi geri yükleme YOK
 * (kullanıcı kararı 12.08.2026): yarısı eski yarısı yeni bir veritabanı,
 * hiç geri yüklememekten daha tehlikelidir. Bu yüzden eski sürüm bir yedek
 * yüklenirse o tablolar boşalacak ve rapor bunu AÇIKÇA yazacak.
 *
 * @param mevcutSayilar Şu anki satır sayıları (tablo adı -> sayı).
 */
export function farkRaporu(
  yedek: YedekDosyasi,
  mevcutSayilar: Record<string, number>,
): FarkRaporu {
  const satirlar: TabloFarki[] = YEDEK_TABLOLARI.map((tablo) => {
    const dosyadaYok = !(tablo in yedek.tablolar);
    return {
      tablo,
      mevcut: mevcutSayilar[tablo] ?? 0,
      gelecek: dosyadaYok ? 0 : yedek.tablolar[tablo].length,
      dosyadaYok,
    };
  });

  const eksikTablolar = satirlar.filter((s) => s.dosyadaYok).map((s) => s.tablo);

  return {
    satirlar,
    toplamMevcut: satirlar.reduce((t, s) => t + s.mevcut, 0),
    toplamGelecek: satirlar.reduce((t, s) => t + s.gelecek, 0),
    eksikTablolar,
    // Tablo tablo bakılır: toplamlar denk gelse bile bir tabloda kayıp
    // olabilir (biri artmış, öteki azalmış). Toplama bakmak yanıltırdı.
    kayipVar: satirlar.some((s) => s.gelecek < s.mevcut),
    tarifeSeedGerekli:
      yedek.kargoTarifesiHaric ||
      (yedek.tablolar.CargoTariff?.length ?? 0) === 0,
    girisKaybi: (() => {
      const kullanici = satirlar.find((s) => s.tablo === "User");
      return kullanici !== undefined && kullanici.mevcut > 0 && kullanici.gelecek === 0;
    })(),
  };
}

/** Onay kutusuna yazılması gereken metin — ekranda da bu sabit gösterilir. */
export const ONAY_METNI = "GERİ YÜKLE";

/**
 * Onay metni doğru mu?
 *
 * Boşluklar kırpılır ve büyük/küçük harf gözetilmez — ama Türkçe katlama
 * TUZAKLIDIR: `"GERİ".toLowerCase()` ortamın diline göre "gerı̇" ya da
 * "geri" verir. Bu yüzden karşılaştırma büyük harfe çevirmeden, doğrudan
 * beklenen metinle yapılır; kullanıcı zaten büyük harfle yazacak.
 * Küçük harfle yazana da izin verilir ama bu tek tek tanımlıdır.
 */
export function onayGecerliMi(girilen: string): boolean {
  const temiz = girilen.trim().replace(/\s+/g, " ");
  return temiz === ONAY_METNI || temiz === "geri yükle";
}
