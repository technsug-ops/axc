/**
 * ============================================================================
 *  BAĞSIZ HAKEDİŞ KALEMLERİNİ YENİDEN EŞLEŞTİRME — SAF KURAL
 * ----------------------------------------------------------------------------
 *  Bağ yalnız YÜKLEME anında kuruluyor (`satirlariEslestir`). Rapor,
 *  satışlar girilmeden yüklenirse kalem SONSUZA DEK bağsız kalır. Ölçüldü,
 *  üç kez sıfır: 13.08.2026 651/0 · 15.08.2026 110/0 · 18.08.2026 651/0.
 *
 *  Sıra bir daha ters dönebilir (TY raporu haftalık, satışlar elle), bu
 *  yüzden tazeleme TEK SEFERLİK DEĞİL tekrarlanabilir bir işlemdir.
 *
 *  ── NEDEN SAF FONKSİYON ─────────────────────────────────────────────────
 *  Kural ilk hâlinde betiğin içine gömülüydü. O hâlde eşleşme mantığı
 *  sistemde İKİ yerde yaşardı (yükleme + tazeleme) ve biri değişince öteki
 *  sessizce ayrışırdı — bu paketin altı dersinden birincisi tam olarak bu.
 *  Kural buraya alındı, betik yalnız veriyi taşıyor.
 *
 *  ── ÜÇ RET SEBEBİ ───────────────────────────────────────────────────────
 *  KARSILIK_YOK    — kod sistemde yok (ya da satış iptalli; iptalliler
 *                    çağırana verilmez, yükleme yolundaki kuralın aynısı).
 *  CIFT_ESLESME    — aynı kod birden çok satışta. Hangisi olduğu BİLİNMEZ;
 *                    tahmin edip bağlamak yanlış satışa para yazmaktır.
 *  KANAL_UYUSMUYOR — kod tutuyor ama kalem başka kanal hesabının.
 *
 *  ⚠ KANAL KONTROLÜ NİYE BURADA VAR, YÜKLEMEDE YOK: yükleme tek kanalın
 *  raporunu işler, kodlar zaten o kanaldandır. TOPLU tazeleme bütün
 *  kanalları aynı anda tarar ve çapraz eşleşme ilk kez MÜMKÜN olur. Ayrı
 *  bir kural değil, aynı niyetin yeni bağlamda açıkça yazılmış hâli.
 * ============================================================================
 */

export type BagsizKalem = {
  id: string;
  /** Rapordaki sipariş numarası. */
  siparisNo: string;
  channelAccountId: string;
};

export type AdaySatis = {
  id: string;
  kod: string;
  channelAccountId: string;
};

export type RetSebebi = "KARSILIK_YOK" | "CIFT_ESLESME" | "KANAL_UYUSMUYOR";

export type EslemeKarari =
  | { olur: true; kalemId: string; saleId: string; kod: string }
  | { olur: false; kalemId: string; kod: string; sebep: RetSebebi };

/**
 * Her bağsız kalem için tek bir karar üretir. Veritabanına GİTMEZ.
 *
 * Kodlar KIRPILARAK karşılaştırılır: rapordan gelen değerde baştaki/sondaki
 * boşluk olabiliyor ve `satirlariEslestir` de satış kodunu kırpıyor. İki
 * tarafı da kırpmak, aynı numaranın boşluk yüzünden eşleşmemesini önler.
 */
export function yenidenEsle(
  kalemler: BagsizKalem[],
  satislar: AdaySatis[],
): EslemeKarari[] {
  const dizin = new Map<string, AdaySatis[]>();
  for (const s of satislar) {
    const kod = s.kod.trim();
    if (kod === "") continue;
    dizin.set(kod, [...(dizin.get(kod) ?? []), s]);
  }

  return kalemler.map((k): EslemeKarari => {
    const kod = k.siparisNo.trim();
    const bulunanlar = kod === "" ? undefined : dizin.get(kod);

    if (!bulunanlar || bulunanlar.length === 0) {
      return { olur: false, kalemId: k.id, kod, sebep: "KARSILIK_YOK" };
    }
    if (bulunanlar.length > 1) {
      return { olur: false, kalemId: k.id, kod, sebep: "CIFT_ESLESME" };
    }
    const satis = bulunanlar[0];
    if (satis.channelAccountId !== k.channelAccountId) {
      return { olur: false, kalemId: k.id, kod, sebep: "KANAL_UYUSMUYOR" };
    }
    return { olur: true, kalemId: k.id, saleId: satis.id, kod };
  });
}

/** Kararların özeti — ekran ve betik aynı sayıları söylesin diye. */
export function eslemeOzeti(kararlar: EslemeKarari[]) {
  const ozet = {
    baglanacak: 0,
    karsiligiYok: 0,
    ciftEslesme: 0,
    kanalUyusmaz: 0,
  };
  for (const k of kararlar) {
    if (k.olur) ozet.baglanacak++;
    else if (k.sebep === "KARSILIK_YOK") ozet.karsiligiYok++;
    else if (k.sebep === "CIFT_ESLESME") ozet.ciftEslesme++;
    else ozet.kanalUyusmaz++;
  }
  return ozet;
}
