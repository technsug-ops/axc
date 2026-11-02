/**
 * ============================================================================
 *  TARİFE KODU → KATALOG VARYANTI — TEK KURAL (K298, 28.09.2026)
 * ----------------------------------------------------------------------------
 *  Bu kural önce yalnız tarife YÜKLEYİCİSİNDE (`tarife-yaz.ts`) yaşıyordu ve
 *  eşleşme satıra YÜKLEME ANINDA yazılıyordu. Kullanıcı bulgusu 28.09.2026:
 *  Tarife hesaplama ekranı Philips BHD500'e (`HBCV00000R0H0K`) «Bu ürün
 *  kataloğunuzda yok» diyordu. Ölçüldü: HB penceresi 23.09 00:07'de yüklenmiş,
 *  kodun aktif Philips'e kanal kodu olarak bağlanması 23.09 07:28'de — yükleme
 *  anının fotoğrafında karşılık yoktu. 21.09 penceresinde aynı durumda 13 ürün.
 *
 *  ⛔ FOTOĞRAF DOKUNULMAZ — KARAR DARALTILDI, ÇEVRİLMEDİ. 21.09 kararı:
 *  «geçmiş penceredeki bağsız kalem kusur değildir, yükleme anının fotoğrafıdır»
 *  — DENETİM sorusu için («o gün ne geçerliydi») doğru ve geçerli. Ama tarife
 *  ekranları «bugün bu fiyattan satarsam ne kalır» diye soruyor; o soru bugünkü
 *  katalogla cevaplanır (anayasa: «aynı veri, farklı soruya farklı pencereden
 *  bakar»). Bu yüzden ekranlar boş kalmış satırı OKUMA ANINDA bu kuralla çözer,
 *  veritabanına HİÇBİR ŞEY YAZILMAZ; yükleyici de AYNI kuralı kullanır — iki
 *  yerde iki ayrı kural doğmaz.
 *
 *  Kural (yükleyicinin 21.09'dan beri uyguladığı, aynen):
 *   · kapsam: AKTİF varyantların barkod · SKU · Firma SKU'su (kimlik dizini) ve
 *     AKTİF kanal kodları, bütün hesaplar (kanal dizini; bu hesabınki önce);
 *   · bir kod iki varyanta çözülüyorsa BAĞLANMAZ (sessiz seçim yok);
 *   · kanal ve kimlik dizini aynı kodu farklı varyantlara veriyorsa ikisinden
 *     de atılır;
 *   · çözüm sırası: önce kanal dizini, sonra kimlik dizini.
 * ============================================================================
 */

export type DizinGirdisi = {
  varyantlar: { id: string; barcode: string | null; sku: string | null; companySku: string | null }[];
  kanalKodlari: { channelSku: string; variantId: string; channelAccountId: string }[];
  /** Tarifenin hesabı — bu hesabın kanal kodları önce gelir. */
  channelAccountId: string;
};

export type TarifeDizinleri = {
  kanalDizini: Map<string, string>;
  kimlikDizini: Map<string, string>;
};

export function tarifeDizinleriKur(g: DizinGirdisi): TarifeDizinleri {
  const tekil = (girdiler: { kod: string | null; variantId: string }[]): Map<string, string> => {
    const cakisan = new Set<string>();
    const harita = new Map<string, string>();
    for (const x of girdiler) {
      const kod = (x.kod ?? "").trim();
      if (kod === "") continue;
      const mevcut = harita.get(kod);
      if (mevcut !== undefined && mevcut !== x.variantId) {
        cakisan.add(kod);
        continue;
      }
      harita.set(kod, x.variantId);
    }
    for (const kod of cakisan) harita.delete(kod);
    return harita;
  };

  const kanalDizini = tekil([
    ...g.kanalKodlari
      .filter((k) => k.channelAccountId === g.channelAccountId)
      .map((k) => ({ kod: k.channelSku, variantId: k.variantId })),
    ...g.kanalKodlari
      .filter((k) => k.channelAccountId !== g.channelAccountId)
      .map((k) => ({ kod: k.channelSku, variantId: k.variantId })),
  ]);
  const kimlikDizini = tekil([
    ...g.varyantlar.map((v) => ({ kod: v.barcode, variantId: v.id })),
    ...g.varyantlar.map((v) => ({ kod: v.sku, variantId: v.id })),
    ...g.varyantlar.map((v) => ({ kod: v.companySku, variantId: v.id })),
  ]);
  for (const [kod, variantId] of kimlikDizini) {
    const kanalSahibi = kanalDizini.get(kod);
    if (kanalSahibi !== undefined && kanalSahibi !== variantId) {
      kanalDizini.delete(kod);
      kimlikDizini.delete(kod);
    }
  }
  return { kanalDizini, kimlikDizini };
}

/**
 * BİR VARYANTIN TARİFE SATIRLARI — TEK SEÇİM KURALI (K298-②, 28.09.2026).
 *
 * Kullanıcı Test 24: Philips'te NET «komisyon %15» dedi, dilimler %11,8 · %9,5 ·
 * %7,8'di. Fiyat denemesi zemini ve satış kaydının oranı dilimi kayıtlı bağdan
 * (`variantId`) arıyordu; bağ boşken dilim bulunmuyor, tek orana düşülüyordu.
 * Kural (kullanıcı: «yanılgı istemiyorum, en doğrusu olsun»):
 *  · o varyanta BAĞLI satırlar varsa yalnız onlar (kayıt önce gelir);
 *  · yoksa BAĞSIZ satırlardan kodu bugünkü katalogla bu varyanta çözülenler;
 *  · hiçbir şey YAZILMAZ — seçim okuma anında yapılır.
 * Çözücü çağırandan gelir (dizin pahalı; yalnız bağsız aday varsa kurulur).
 */
export function varyantKalemleriniSec<T extends { barkod: string; variantId: string | null }>(
  adaylar: readonly T[],
  variantId: string,
  coz: (kod: string) => string | null,
): T[] {
  const bagli = adaylar.filter((k) => k.variantId === variantId);
  if (bagli.length > 0) return bagli;
  return adaylar.filter((k) => k.variantId === null && coz(k.barkod) === variantId);
}

/** Kalemin kendi geçerlilik aralığı (28.10.2026) — ikisi de boşsa tarifenin penceresi geçerli. */
export type GecerlilikliKalem = { gecerlilikBaslangic: Date | null; gecerlilikBitis: Date | null };

/**
 * BİR TARİFE ADAYI, VERİLEN ANDA (28.10.2026 — ürün başına tarihli teklifler).
 * Fiyat denemesi ve satış tarihi oranı AYNI kuralı kullanır.
 * · Kalemlerin kendi aralığı YOKSA (Trendyol, eski yüklemeler): kapsama
 *   tarifenin penceresinden, bitiş tarifenin bitişi — eski davranışın aynısı.
 * · Kendi aralığı VARSA: o anda geçerli olan kalemler; bitiş onların en geç
 *   bitişi. Hiçbiri geçerli değilse kapsamaz; bitiş kalemlerin en geç bitişi
 *   (ekran «pencere bitti» der — tarifenin geniş penceresi sanılmaz).
 *
 * ⛔ KAPSAMAYAN ADAY KALEM VERMEZ (K368, 02.11.2026) — VE BU, ÇEVRİLMİŞ BİR
 * KARARDIR; ESKİ GEREKÇE SİLİNMEDİ.
 *
 * _Eski hâl:_ kapsamayan aday da bütün kalemleri döndürüyordu; fiyat denemesi
 * onları dilim olarak kullanıyor ve motor yanına «pencere bitti» beyanı
 * yazıyordu. Gerekçe: «eski tarife de bir fikir verir».
 *
 * _Çürüten vaka (LEGO 76334 · HB · 2 Kasım):_ 21–25 Ekim penceresi defterde
 * duruyordu (≥2.849,01 → %18 · 2.706,01–2.849 → %14,1 · 2.564,01–2.706 →
 * %11,3 · ≤2.564 → %9,1). Buybox fiyatı 2.184,99 en alt dilime düşüyor ve
 * komisyon %9,1 hesaplanıyordu; kanalın güncel oranı %18. Kullanıcı teyidi:
 * _«HB'de bu ürünün komisyonu hep 18; teklifler çarşambadan çarşambaya
 * yenileniyor ve bu haftaki tekliflerde 9,1 yok.»_ Yani bitmiş pencerenin
 * indirimli dilimi bir FİKİR değil, artık var olmayan bir vaattir — ve
 * kanalın vermediği bir oranla kâr hesaplanıyordu.
 *
 * ⚠ BEYAN KAYBOLMAZ: `bitis` yine döner, yani çağıran pencerenin NE ZAMAN
 * bittiğini bilir ve ekran bunu yazar. Düşen tek şey, kullanılmaması gereken
 * oranlar.
 *
 * ⚠ VE AYRIM BURADA, ÇAĞIRANDA DEĞİL: kapsama ölçüsünü zaten bu gövde
 * kuruyor. Her çağıranın «kapsamıyorsa kalemleri atma» kuralını kendi
 * yazması, aynı kuralı iki yerde yaşatır ve biri unutulduğunda sessizce
 * eski davranışa döner.
 */
export function tarifeAdayi<K extends GecerlilikliKalem>(
  pencere: { pencereBaslangic: Date; pencereBitis: Date },
  kalemler: readonly K[],
  an: Date,
): { kapsiyor: boolean; kalemler: K[]; bitis: Date } {
  const t = an.getTime();
  const kendi = kalemler.filter((k) => k.gecerlilikBaslangic !== null && k.gecerlilikBitis !== null);
  if (kendi.length === 0) {
    const kapsiyor = pencere.pencereBaslangic.getTime() <= t && t <= pencere.pencereBitis.getTime();
    return {
      kapsiyor,
      kalemler: kapsiyor ? [...kalemler] : [],
      bitis: pencere.pencereBitis,
    };
  }
  const enGec = (liste: readonly K[]) => new Date(Math.max(...liste.map((k) => k.gecerlilikBitis!.getTime())));
  const gecerli = kendi.filter((k) => k.gecerlilikBaslangic!.getTime() <= t && t <= k.gecerlilikBitis!.getTime());
  return gecerli.length > 0
    ? { kapsiyor: true, kalemler: gecerli, bitis: enGec(gecerli) }
    : { kapsiyor: false, kalemler: [], bitis: enGec(kendi) };
}

/** Tek kod: önce kanal, sonra kimlik dizini (`tarifePlaniKur` ile aynı sıra). */
export function tarifeKodunuCoz(kod: string, d: TarifeDizinleri): string | null {
  const k = kod.trim();
  return d.kanalDizini.get(k) ?? d.kimlikDizini.get(k) ?? null;
}
