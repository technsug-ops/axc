/**
 * ============================================================================
 *  KANAL GÖSTERİM SIRASI (K106, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ KULLANICI KARARI: _"1 Trendyol · 2 Hepsiburada · 3 N11 · 4 Amazon ·
 *  5 Elden — sıralama bu şekilde olsun."_
 *
 *  ── ⚠ NİYE CİRO SIRASI DEĞİL ────────────────────────────────────────────
 *  Panel kanal kartlarını `b.gelir - a.gelir` ile sıralıyordu. Rakama göre
 *  sıralama makul görünür ama **kartların yeri veriyle birlikte oynar**:
 *  bugün ikinci sıradaki kanal yarın dördüncü olur ve kullanıcı her açılışta
 *  aradığı kanalı yeniden ARAR. Sabit yer, göz için sabit bir adrestir
 *  (İlke #10: aynı şey her ekranda aynı yerde).
 *
 *  ⚠ VE BÜYÜKLÜK BİLGİSİ KAYBOLMUYOR: her kartın üstünde ciro payı çubuğu
 *  ve rakamı zaten yazılı. Sıralama o bilgiyi TAŞIMIYORDU, yalnız
 *  tekrarlıyordu — karşılığında yerleri oynatıyordu.
 *
 *  ── ⚠ LİSTE KAPALI DEĞİL ────────────────────────────────────────────────
 *  Canlıda 12 kanal var (ölçüldü 30.08.2026) ve kullanıcı beşini saydı.
 *  Sayılmayanlar KAYBOLMAZ: beşliden sonra ADA GÖRE sıralanır. Sabit listeye
 *  bağlı bir süzgeç olsaydı, yarın açılan bir kanal panelden sessizce düşerdi.
 *
 *  ⚠ ÖLÇÜT KOD, AD DEĞİL. "Elden Satış" kanalının kodu `DEPO`; ada bağlanan
 *  bir sıra, ad düzenlendiği gün sessizce bozulurdu.
 *  _(Anayasa: "kimlik varken dizeyle aranmaz".)_
 *
 *  ── ⭐ İKİ SIRA DA DOĞRU — SEÇENEK OLDU (kullanıcı, 31.08.2026) ────────
 *  Kullanıcı sabit düzeni istedikten sonra ekledi: _"aslında ciroya göre de
 *  iyiymiş."_ Haklı — ikisi FARKLI SORUYA cevap veriyor:
 *
 *      SABİT  → "Trendyol'u nerede bulacağım?"   (yer sabit, göz öğrenir)
 *      CİRO   → "Bu dönem hangisi kazandırdı?"   (hüküm sırayla okunur)
 *
 *  Birini seçip ötekini atmak, iki doğrudan birini kaybetmek olurdu.
 *  _(Anayasa: "aynı veri, farklı soruya farklı pencereden bakar" — ve o
 *  kural iki ekranın AYRIŞMASINI tutarsızlık saymamayı da söylüyor.)_
 *
 *  ⚠ VARSAYILAN SABİT DÜZEN: panel önce "nerede ne var" sorusuna cevap
 *  veriyor; ciro tek tıkla alınıyor.
 *
 *  ⭐ VE BU, ŞEMA İŞİNİ GEREKSİZ KILDI. Sıra `Company` üstünde bir sütunda
 *  saklanacaktı; seçenek ADRESTE yaşayınca migration'a hiç gerek kalmadı ve
 *  panel zaten süzgeçli bir rota olduğu için liste hafızası onu
 *  KENDİLİĞİNDEN hatırlıyor (K104).
 * ============================================================================
 */

export const KANAL_SIRA_KIPLERI = ["duzen", "ciro"] as const;
export type KanalSiraKipi = (typeof KANAL_SIRA_KIPLERI)[number];

/**
 * ⚠ VARSAYILAN GÖVDEDE, EKRANDA DEĞİL. İki yerde iki varsayılan olsaydı
 * (sunucu "duzen", çip "ciro" gibi) ekran açılışta bir sıra çizer, kullanıcı
 * hiçbir şeye basmadan başka bir sıra görürdü.
 */
export const VARSAYILAN_KANAL_SIRASI: KanalSiraKipi = "duzen";

/** Adresten gelen ham değeri çözer; tanınmayan değer VARSAYILANA düşer. */
export function kanalSiraKipi(ham?: string): KanalSiraKipi {
  return KANAL_SIRA_KIPLERI.find((k) => k === ham) ?? VARSAYILAN_KANAL_SIRASI;
}

/** Kullanıcının saydığı sıra — KOD ile, ad ile değil. */
export const KANAL_SIRASI = [
  "TRENDYOL",
  "HEPSIBURADA",
  "N11",
  "AMAZON",
  /** "Elden Satış" — kodu tarihsel olarak `DEPO`. */
  "DEPO",
] as const;

/**
 * Sıradaki yeri; listede olmayan kanal için `KANAL_SIRASI.length`.
 *
 * ⚠ EŞİT DEĞER DÖNDÜRMESİ BİLİNÇLİ: sayılmayan kanalların hepsi aynı
 * basamağa düşer ve aralarındaki sırayı AD belirler. Her birine ayrı bir
 * numara uydurmak, kullanıcının vermediği bir kararı koda gömmek olurdu.
 */
export function kanalSirasi(kod: string): number {
  const yer = KANAL_SIRASI.indexOf(kod as (typeof KANAL_SIRASI)[number]);
  return yer === -1 ? KANAL_SIRASI.length : yer;
}

/**
 * Kanal listesini gösterim sırasına dizer — YENİ DİZİ döner, girdiyi bozmaz.
 *
 * ⚠ KARŞILAŞTIRMA İKİ BASAMAKLI: önce sabit sıra, sonra ad. Yalnız sabit
 * sıra kullanılsaydı sayılmayan 7 kanalın arasındaki düzen koşumdan koşuma
 * değişebilirdi (`sort` kararlılığı motora bağlı bırakılmaz).
 */
export function kanallariSirala<
  T extends { kanalKodu: string; kanalAdi: string; gelir: number },
>(kanallar: readonly T[], kip: KanalSiraKipi = VARSAYILAN_KANAL_SIRASI): T[] {
  return [...kanallar].sort((a, b) => {
    if (kip === "ciro") {
      const ciroFarki = b.gelir - a.gelir;
      if (ciroFarki !== 0) return ciroFarki;
      /**
       * ⚠ CİRO KİPİNDE DE EŞİTLİK BOZUCU VAR — ve SABİT DÜZEN. Ciroları
       * eşit kanallar (özellikle hepsi 0 olan dönemler) aksi hâlde rastgele
       * dizilir; kullanıcı aynı ekranı iki kez açtığında farklı bir liste
       * görürdü. Sıfırlı dönemde ekran bu sayede yine tanıdık kalıyor.
       */
      const duzenFarki = kanalSirasi(a.kanalKodu) - kanalSirasi(b.kanalKodu);
      if (duzenFarki !== 0) return duzenFarki;
    } else {
      const fark = kanalSirasi(a.kanalKodu) - kanalSirasi(b.kanalKodu);
      if (fark !== 0) return fark;
    }
    return a.kanalAdi.localeCompare(b.kanalAdi, "tr");
  });
}
