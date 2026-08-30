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
 *  ⏭ BUGÜN SABİT, YARIN AYARLANABİLİR: kullanıcı bunun menü düzeni gibi
 *  ekrandan değiştirilebilmesini istedi. O bir ŞEMA işidir (`Company`
 *  üstünde `menuDuzeni`nin kardeşi bir sütun) ve migration onayı bekliyor;
 *  bu gövde o gün varsayılan sıra olarak kalır, üstüne kayıtlı düzen biner.
 * ============================================================================
 */

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
export function kanallariSirala<T extends { kanalKodu: string; kanalAdi: string }>(
  kanallar: readonly T[],
): T[] {
  return [...kanallar].sort((a, b) => {
    const fark = kanalSirasi(a.kanalKodu) - kanalSirasi(b.kanalKodu);
    if (fark !== 0) return fark;
    return a.kanalAdi.localeCompare(b.kanalAdi, "tr");
  });
}
