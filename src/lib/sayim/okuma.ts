/**
 * ============================================================================
 *  SAYIM OKUMA KURALI — BOŞ KARE KİLİDİ (SAF HESAP)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR: sayım kipinde kamera AÇIK kalıyor (okuma kamerayı kapatmıyor,
 *  sayacı artırıyor). Ölçüldü — çözücü **250 ms**'de bir kare çözüyor, yani
 *  saniyede dört. Önünde duran tek bir barkod, koruma olmasa **saniyede dört
 *  kez** sayılırdı: 1 adetlik ürün 12 saniyede 48 adet olurdu.
 *
 *  ═══ KURAL: AYNI KOD, ARADA BOŞ KARE GEÇMEDEN İKİNCİ KEZ SAYILMAZ ═══
 *
 *  ⛔ SÜRE EŞİĞİ YOK ("800 ms içinde aynı kodu sayma" gibi). O sayı veriden
 *  gelmez, uydurulur — ve hızlı okutan biri GERÇEK okumasını kaybeder.
 *  _(Anayasa 28.08.2026: "eşik, dağılımın gediğine ya da FİZİKSEL EYLEMİN
 *  kendisine konur — uydurulmaz. 'Arada boş kare' ÖLÇÜLEBİLİR bir olaydır;
 *  '800 ms' bir tahmindir.")_
 *
 *  Fiziksel dayanağı şu: dört ayrı ürünü okuturken her birini kadraja sokup
 *  ÇIKARIRSINIZ — arada kod bulunmayan kare zorunlu olarak oluşur. Tek ürün
 *  sabit dururken oluşmaz. Yani gerçek dört okuma ENGELLENMEZ, titreme
 *  engellenir.
 *
 *  ⚠ FARKLI KOD KİLİDİ AÇAR: A→B→A dizisinde ikinci A sayılır. Kod değiştiyse
 *  ürün fiziksel olarak değişmiştir; boş kare beklemek, elinde iki farklı
 *  ürünü sırayla okutan kullanıcıyı cezalandırırdı.
 *
 *  ⚠ AÇIK RİSK — BEYAN EDİLİYOR, GİZLENMİYOR: sabit duran bir barkod bazı
 *  karelerde çözülemeyebilir (odak arayışı, parlama, titreme). O kare "boş"
 *  sayılır ve kilit haksız yere açılır → aynı ürün iki kez sayılabilir.
 *  Bu yüzden `bosKareEsigi` bir PARAMETRE ve varsayılanı 1 (onaylanan kural).
 *  Gerçek kullanımda çift sayım görülürse eşik ÖLÇÜMLE yükseltilir — bugün
 *  bir sayı uydurmuyoruz. İkinci emniyet zaten ekranda: her satırda görünür
 *  sayaç ve `−`/`+`, yani düzeltme iki dokunuş.
 * ============================================================================
 */

/** Okuma döngüsünün hatırladığı her şey. Bileşen bunu `useRef`te taşır. */
export type OkumaKilidi = {
  /** En son SAYILAN kod. `null` = kilit açık, her kod sayılabilir. */
  sonKod: string | null;
  /** Arka arkaya kaç karedir kod bulunamadı. */
  bosKare: number;
};

export const BOS_KILIT: OkumaKilidi = { sonKod: null, bosKare: 0 };

/**
 * KAÇ BOŞ KARE KİLİDİ AÇAR — varsayılan 1 (onaylanan kural).
 *
 * ⛔ BU BİR SÜRE DEĞİL, KARE SAYISI: çözücünün hızı değişse de kural
 * "ürün kadrajdan çıktı" olayına bağlı kalır.
 */
export const BOS_KARE_ESIGI = 1;

export type OkumaKarari = {
  /** Bu kare sayılacak mı. */
  say: boolean;
  /** Döngünün bir sonraki kareye taşıyacağı hâl. */
  kilit: OkumaKilidi;
};

/**
 * Bir karenin hükmü.
 *
 * @param kilit Önceki karenin bıraktığı hâl.
 * @param kod   Çözülen kod; kadrajda kod yoksa `null`.
 * @param esik  Kilidi açan ARDIŞIK boş kare sayısı.
 */
export function okumaKarari(
  kilit: OkumaKilidi,
  kod: string | null,
  esik: number = BOS_KARE_ESIGI,
): OkumaKarari {
  /**
   * ⛔ BOZUK OKUMA ÜÇÜNCÜ HÂLDİR — ne ürün, ne boş kare.
   *
   * Çözücü içeriği boş bir kod döndürürse (`""` ya da yalnız boşluk) bu bir
   * ÜRÜN DEĞİLDİR — sayılmamalı. Ama "kadraj boş" da DEĞİLDİR: kadrajda bir
   * şey vardı, çözülemedi. Bu yüzden kilit **hiç oynatılmaz**: ne açılır ne
   * ilerler, kare yok sayılır.
   *
   * ⚠ İKİ YANLIŞIN DA ÖNÜNE GEÇİYOR:
   *   · `null` gibi sayılsaydı → kilit açılır, elde duran ürün İKİ kez sayılır
   *   · kod gibi sayılsaydı    → sepete `""` diye bir satır düşer ve kilit
   *                              ona geçer, gerçek ürün yeniden sayılır
   * İlk yazımda ikincisi oluyordu ve `sayim:dogrula` bunu yakaladı
   * (`["A", "", "A"]` → 2 çıkıyordu, doğrusu 1).
   *
   * ⚠ VE ÖLÇÜT AÇIKÇA YAZILIR: `!kod` yazılsaydı bu dal ile boş kare dalı
   * tek kefeye düşerdi — `""` de `null` de yalancıdır (falsy).
   */
  if (kod !== null && kod.trim() === "") {
    return { say: false, kilit };
  }

  /** Kadraj boş — kural buradan işliyor. */
  if (kod === null) {
    const bosKare = kilit.bosKare + 1;
    return {
      say: false,
      /** Eşiğe ulaşınca kilit AÇILIR: aynı kod yeniden sayılabilir. */
      kilit: bosKare >= esik ? { sonKod: null, bosKare } : { ...kilit, bosKare },
    };
  }

  /**
   * ⛔ AYNI KOD, KİLİT KAPALI → SAYILMAZ. Ürün hâlâ kadrajda demektir.
   * ⚠ `bosKare` SIFIRLANIR: kod yeniden görüldüğüne göre ürün çıkmamıştır;
   * sıfırlanmasaydı araya karışan tek bir bulanık kare birikip kilidi
   * açardı ve kural pratikte hiç çalışmazdı.
   */
  if (kod === kilit.sonKod) {
    return { say: false, kilit: { sonKod: kod, bosKare: 0 } };
  }

  /** Yeni ya da farklı kod — sayılır ve kilit ONA geçer. */
  return { say: true, kilit: { sonKod: kod, bosKare: 0 } };
}

/**
 * SAYIM SEPETİ — okutulan kodların adetleri.
 *
 * ⚠ Ekranda `−`/`+` ile düzeltilebilir; bu gövde o düzeltmeleri de
 * uyguluyor ki iki ayrı "adet" yorumu doğmasın.
 */
export type Sepet = Map<string, number>;

export function sepeteEkle(sepet: Sepet, kod: string, delta = 1): Sepet {
  const yeni = new Map(sepet);
  const sonraki = (yeni.get(kod) ?? 0) + delta;
  /**
   * ⚠ SIFIRIN ALTINA İNMEZ — ama SIFIR SİLİNMEZ. Sıfır burada "sayıldı,
   * rafta yok" demektir ve sayım defterinin en kritik değeri; satırı
   * kaldırmak onu "sayılmadı"ya çevirirdi (bkz. `kova.ts` başlığı).
   */
  yeni.set(kod, Math.max(0, sonraki));
  return yeni;
}

/** Sepetteki toplam adet — ekranın üst çubuğundaki sayaç. */
export function sepetToplami(sepet: Sepet): number {
  let t = 0;
  for (const adet of sepet.values()) t += adet;
  return t;
}
