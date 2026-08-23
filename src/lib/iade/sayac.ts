import type { NoticeStatus } from "@/generated/prisma/enums";
import { gunDegeri, gunEkle, isTakvimGunu } from "@/lib/donem";
import type { DurumRengi } from "@/lib/renkler";

/**
 * ============================================================================
 *  İADE SAYAÇLARI (K31 ①) — SON TARİH UYARILARI
 * ----------------------------------------------------------------------------
 *  Bir iade bildiriminin üstünde aynı anda TEK bir saat işler ve hangisi
 *  olduğunu `status` söyler. Süre dolduğunda ya iade iptal olur ya OTOMATİK
 *  ONAYLANIR — ikincisi doğrudan para kaybıdır, çünkü onaylanan iade
 *  ciromuzdan düşer ve itiraz hakkı biter.
 *
 *  ⚠ YAZILAN HER TARİH TÜRETMEDİR, ÇIPA DEĞİL (mimar kararı 23.08.2026).
 *  Sistemin kendi kaydettiği bir "olay anı" yok; geçiş anından kural
 *  uygulanarak SON TARİH hesaplanıyor ve ölü duran iki sütuna yazılıyor.
 *  Bu yüzden:
 *   · hesaplanan tarih ekranda NÖTR gösterilir (iddia değil, türetme),
 *   · hangi geçişte hangi kuralla hangi andan hesaplandığı `AuditLog`a yazılır,
 *   · **pazaryeri paneliyle ayrışırsa KAZANAN PANELDİR** — onların beyanı
 *     bizim hesabımızı ezer (kaynak önceliği: kanalın kendi belgesi üstte).
 *
 *  ⚠ YENİ SÜTUN AÇILMADI. `otomatikOnayTarihi` ve `islemSonTarihi` K31
 *  migration'ında açılmış ama HİÇBİR KOD onları okumuyor ya da yazmıyordu
 *  (ölçüldü 23.08.2026: sıfır okuyucu, sıfır yazıcı). Merdiven birinci
 *  basamak: mevcut alan taşıyor.
 * ============================================================================
 */

export const SAYAC_TURLERI = [
  "MUSTERI_KARGOYA_VERSIN",
  "KARGO_ULASSIN",
  "ONAY_RED_KARARI",
  "ANALIZ",
  "GERI_GONDERIM",
] as const;

export type SayacTuru = (typeof SAYAC_TURLERI)[number];

/** Süre dolunca ne olur. Ekranda YAZAR — sayaç tek başına anlam taşımaz. */
export type SayacSonucu = "IPTAL" | "OTOMATIK_ONAY" | "BILINMIYOR";

/** Çıpa nereden gelir — tarih yoksa NİYE yok sorusunun cevabı budur. */
export type SayacCipasi = "BILDIRIM_TARIHI" | "GECIS_ANI" | "ELLE_GIRILIR" | "YOK";

export type SayacKurali = {
  /** Kaç gün. `null` = ÖLÇÜLMEDİ; o sayaç tarih göstermez. */
  gun: number | null;
  sonuc: SayacSonucu;
  cipa: SayacCipasi;
  /**
   * Türetilen son tarih hangi sütunda yaşar.
   * `null` = HESAPLANIR, SAKLANMAZ — çıpası zaten kayıtta olduğu için
   * saklamak aynı gerçeği iki yere yazmak olurdu.
   */
  sutun: "otomatikOnayTarihi" | "islemSonTarihi" | null;
};

/**
 * BEŞ SAYAÇ — DÖRDÜ ÖLÇÜLDÜ, BİRİ ÖLÇÜLMEDİ.
 *
 * Kaynak: `docs/iade-sureci.md` (Trendyol uygulaması `(E)`, HB paneli `(EH)`,
 * kullanıcı anlatımı `(K)`, Aras takip kaydı `(KG)`).
 */
export const SAYAC_KURALLARI: Record<SayacTuru, SayacKurali> = {
  /** Müşteri talebi açtı; kargoya vermezse talep düşer. */
  MUSTERI_KARGOYA_VERSIN: {
    gun: 7,
    sonuc: "IPTAL",
    cipa: "BILDIRIM_TARIHI",
    /* Çıpa `noticedAt` — zaten kayıtta. İkinci kez yazmak iki gerçek olurdu. */
    sutun: null,
  },
  /**
   * Mal yolda. Süre dolarsa pazaryeri OTOMATİK ONAYLAR ve kargoda kaybolan
   * mal için tazminat vakası doğar.
   *
   * ⚠ ÇIPASI BİZDE DOĞMUYOR (mimar şartı ③): kargoya veren MÜŞTERİ, biz bir
   * düğmeye basmıyoruz. Bu yüzden tarih ELLE girilir; girilmezse sayaç BOŞ
   * durur ve "çıpa girilmedi" der. Uydurulmaz.
   */
  KARGO_ULASSIN: {
    gun: 10,
    sonuc: "OTOMATIK_ONAY",
    cipa: "ELLE_GIRILIR",
    sutun: "otomatikOnayTarihi",
  },
  /** Mal elimizde; iki gün içinde onay ya da red. Sessizlik = onay. */
  ONAY_RED_KARARI: {
    gun: 2,
    sonuc: "OTOMATIK_ONAY",
    cipa: "GECIS_ANI",
    sutun: "otomatikOnayTarihi",
  },
  /** Pazaryeri servise göndermemizi istedi; 28 gün içinde dönmeli. */
  ANALIZ: {
    gun: 28,
    sonuc: "OTOMATIK_ONAY",
    cipa: "GECIS_ANI",
    sutun: "islemSonTarihi",
  },
  /**
   * ⚠ ÖLÇÜLMEDİ — VE BU BİLEREK BOŞ (H25 ①).
   *
   * İtirazımız kabul edildiğinde ürün BİZDE kalır ve müşteriye geri
   * gönderilir. Ama bu sürenin BİRİMİ (gün mü iş günü mü) ve BAŞLANGIÇ ANI
   * (kabul anı mı, bildirim anı mı) ölçülmedi; N11'de hiç deneyim yok.
   *
   * Yanlış çıpadan hesaplanan bir son tarih, hiç göstermemekten KÖTÜDÜR:
   * ekranda duran tarih güvenilir sanılır ve gerçek son tarih kaçırılır.
   * Satır görünür, tarih görünmez.
   */
  GERI_GONDERIM: {
    gun: null,
    sonuc: "BILINMIYOR",
    cipa: "YOK",
    sutun: null,
  },
};

/**
 * HANGİ DURUMDA HANGİ SAYAÇ İŞLER.
 *
 * ⚠ EXHAUSTIVE `Record` — şemaya on ikinci bir durum eklenirse burası
 * DERLENMEZ. "Tip listesi değil, BAĞ" kuralı: elle sayılan bir liste,
 * yarın eklenecek durumu sessizce sayaçsız bırakırdı.
 *
 * `null` = o durumda işleyen bir saat YOK ve bu normaldir:
 *  · `ITIRAZ_ACILDI` / `ITIRAZ_INCELEMEDE` → top pazaryerinde, bizde süre yok
 *  · `ASKIDA` → süreç durdu; sayaç işletmek yanlış bilgi olurdu
 *  · `KAPANDI` / `IPTAL` → dosya bitti
 */
export const DURUM_SAYACI: Record<NoticeStatus, SayacTuru | null> = {
  BEKLENIYOR: "MUSTERI_KARGOYA_VERSIN",
  KARGOYA_VERILDI: "KARGO_ULASSIN",
  MAL_GELDI: "ONAY_RED_KARARI",
  ANALIZ: "ANALIZ",
  ITIRAZ_KABUL: "GERI_GONDERIM",
  ITIRAZ_ACILDI: null,
  ITIRAZ_INCELEMEDE: null,
  ITIRAZ_RED: null,
  ASKIDA: null,
  KAPANDI: null,
  IPTAL: null,
};

/** Sayacın tarihi neden yok — boş kalmanın SEBEBİ ayrı ayrı sayılır. */
export type SayacBoslugu = "OLCULMEDI" | "CIPA_GIRILMEDI";

export type SayacDurumu = {
  tur: SayacTuru;
  kural: SayacKurali;
  /** Türetilmiş son tarih. `null` ise `bosluk` niye olmadığını söyler. */
  sonTarih: Date | null;
  /** Bugüne göre kalan gün. Negatif = süre geçti. `null` = tarih yok. */
  kalanGun: number | null;
  bosluk: SayacBoslugu | null;
};

/**
 * ⚠ "SON ÇEYREK" BİR SÖZLEŞMEDİR, ÖLÇÜM DEĞİL — ve öyle beyan ediliyor.
 *
 * Uyarının ne zaman kırmızıya döneceği için elimizde bir dağılım yok
 * (kaç iadenin son gün kurtarıldığı ölçülmedi). Sabit bir gün sayısı
 * seçmek daha kötü olurdu: "3 gün kala uyar" kuralı 2 GÜNLÜK sayaçta hiç
 * yanmaz, 28 GÜNLÜK sayaçta ise ayın çeyreğinde yanardı.
 *
 * Bu yüzden eşik sayacın KENDİ uzunluğuna bağlandı — süresi kısa olan iş
 * için erken uyarı zaten imkânsız, uzun olan için gereksiz. En az 1 gün:
 * iki günlük sayaçta çeyrek yarım gün ederdi.
 */
export function acilEsigi(gun: number): number {
  return Math.max(1, Math.round(gun / 4));
}

/** İş takvimi gününe göre iki tarih arasındaki tam gün farkı. */
function gunFarki(bugun: Date, hedef: Date): number {
  const a = gunDegeri(isTakvimGunu(bugun));
  const b = gunDegeri(isTakvimGunu(hedef));
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * BİR BİLDİRİMİN İŞLEYEN SAYACI.
 *
 * ⚠ `null` DÖNMEK "SORUN YOK" DEMEK DEĞİL, "SAAT İŞLEMİYOR" DEMEKTİR.
 * Çağıran taraf bunu ayırt etmeli; kapanmış bir dosyayla askıya alınmış
 * bir dosya aynı şey değildir ama ikisinde de sayaç yoktur.
 */
export function isleyenSayac(
  bildirim: {
    status: NoticeStatus;
    noticedAt: Date;
    otomatikOnayTarihi: Date | null;
    islemSonTarihi: Date | null;
  },
  bugun: Date,
): SayacDurumu | null {
  const tur = DURUM_SAYACI[bildirim.status];
  if (!tur) return null;

  const kural = SAYAC_KURALLARI[tur];

  /* Ölçülmemiş sayaç: satır var, tarih YOK. */
  if (kural.gun === null) {
    return { tur, kural, sonTarih: null, kalanGun: null, bosluk: "OLCULMEDI" };
  }

  /**
   * ÇIPASI KAYITTA OLAN SAYAÇ HESAPLANIR, SAKLANMAZ. `noticedAt` zaten
   * kayıtta duruyor; son tarihi ayrıca yazmak aynı gerçeği iki yere
   * koymak olurdu ve biri gün gelip ötekinden ayrışırdı.
   */
  const sonTarih =
    kural.sutun === null
      ? gunEkle(gunDegeri(isTakvimGunu(bildirim.noticedAt)), kural.gun)
      : bildirim[kural.sutun];

  if (!sonTarih) {
    return { tur, kural, sonTarih: null, kalanGun: null, bosluk: "CIPA_GIRILMEDI" };
  }

  return {
    tur,
    kural,
    sonTarih,
    kalanGun: gunFarki(bugun, sonTarih),
    bosluk: null,
  };
}

/**
 * SAYACIN RENGİ — ÖLÇÜLEN İLE ÖLÇÜLMEYEN KARIŞTIRILMAZ (mimar şartı).
 *
 * · ölçülmüş sayaç, süresi dolmak üzere/dolmuş → `olumsuz` (ZARAR: para riski)
 * · ölçülmüş sayaç, süre rahat                → `notr`
 * · ölçülmemiş / çıpasız sayaç                → `notr` (BİLİNMİYOR)
 *
 * ⚠ İKİSİ AYNI RENGİ PAYLAŞIYOR AMA AYNI ŞEY DEĞİL: biri "vaktin var",
 * öteki "bilmiyoruz". Ayrımı renk değil METİN taşır — boş sayaç tarih
 * yerine sebebini yazar. Renk sistemi bugün "bilinmiyor" için ayrı bir ton
 * TANIMIYOR (`DurumRengi` beş değer: olumlu·olumsuz·uyari·bilgi·notr) ve
 * uydurulmuş bir altıncı ton, beş yerde kullanılan sözlüğü bozardı.
 */
export function sayacRengi(durum: SayacDurumu): DurumRengi {
  if (durum.sonTarih === null || durum.kalanGun === null) return "notr";
  if (durum.kural.gun === null) return "notr";
  return durum.kalanGun <= acilEsigi(durum.kural.gun) ? "olumsuz" : "notr";
}

/** Panel çanına düşecek mi — renk kararıyla TEK gövdeden geçer. */
export function acilMi(durum: SayacDurumu): boolean {
  return sayacRengi(durum) === "olumsuz";
}

/**
 * `AuditLog.action` — son tarih türetmeleri ve pazaryeri beyanları.
 *
 * ⚠ BURADA DURUYOR, ACTION DOSYASINDA DEĞİL: `"use server"` dosyaları yalnız
 * async fonksiyon dışa aktarabilir; sabit orada kalsaydı build kırılırdı
 * (23.08.2026'da kırıldı — `tsc` ve bekçi turu görmedi, `next build` gördü).
 */
export const SON_TARIH_EYLEMI = "IADE_SON_TARIH";
