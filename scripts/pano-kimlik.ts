/**
 * ============================================================================
 *  PANO KİMLİĞİ — SAF KURAL (K10, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE AYRI DOSYA: kod ataması bugüne kadar GÖZLE yapılıyordu ve
 *  **dört kez çakıştı** (`H3` üç kez · `K51` · `K53` · bugün `K50-⑨`).
 *  Bekçi her seferinde yakaladı — yani mekanizma çalışıyor — ama yakalama
 *  YAZIMDAN SONRA oluyor ve her çakışma bir tur kaybettiriyor.
 *
 *  ⭐ ÇARE: sıradaki kodu SORULABİLİR yapmak. `npm run pano:sonraki` bu
 *  gövdeyi çağırıyor, bekçi de çakışma mesajında aynı gövdeden öneri
 *  veriyor. İki yerde iki hesap olmasın diye kural burada, tek yerde.
 *  _(Anayasa: "güvenlik mekanizmaya bağlanır, insan disiplinine değil".)_
 *
 *  ⚠ BOŞLUK YENİDEN KULLANILMAZ — EN BÜYÜK + 1. `K88` kapanıp arşivden
 *  silinse bile o kod bir daha verilmez: kimlik geçmişe atıf yapar ve eski
 *  bir commit mesajında `K88` geçiyorsa, o kodu ikinci bir işe vermek
 *  geçmişi yalancı yapar.
 * ============================================================================
 */

/** Satır kimliği: tablo satırının İLK hücresi. Metin içi atıflar sayılmaz. */
export const SATIR_KIMLIGI = /^\|\s*\*\*([^*|]+)\*\*\s*\|/;

/**
 * Kimlik çekirdeği: harf öneki + sayı + isteğe bağlı TEK küçük harf.
 * Sonrasında ne gelirse gelsin (simge · tire · açıklama) SÜSTÜR.
 */
export const CEKIRDEK = /^([A-Z]{1,2})(\d{1,3})([a-z]?)/;

/**
 * KOD GİBİ GÖRÜNEN AMA KALEM OLMAYAN SATIR BAŞLIKLARI — ADIYLA BEYAN.
 *
 * ⚠ NİYE LİSTE VAR: yapı ölçütü DENENDİ ve YETMEDİ. "Kalem satırının ikinci
 * hücresi kalındır" hipotezi ölçüldü — 50 satır uyuyor ama 10 GERÇEK KALEM
 * uymuyor (emojiyle başlayanlar). O ölçütle gerçek kalemler elenirdi. Kalan
 * tek dürüst yol, istisnayı ADIYLA beyan etmek.
 *
 * ⛔ VE LİSTE BURADA, TEK YERDE — VE BU BİR AYRIŞMADAN SONRA TAŞINDI.
 * `pano:sonraki` ilk yazımda bu listeyi bilmiyordu ve `N11` kanal adını
 * kimlik sayıp "sıradaki N12" diye uydurma bir önek üretti. Bekçi onu
 * eliyordu, komut elemiyordu: aynı soruya iki cevap.
 */
export const KALEM_DEGIL: { dosya: string; ham: string; sebep: string }[] = [
  {
    dosya: "ARSIV.md",
    ham: "N11",
    sebep: "kanal adı — pazaryeri karşılaştırma tablosunun satır başlığı",
  },
];

/** Bu satır başlığı gerçekten bir kalem kimliği mi? */
export function kalemMi(dosya: string, ham: string): boolean {
  return !KALEM_DEGIL.some((x) => x.dosya === dosya && x.ham === ham.trim());
}

/**
 * Bir kimlik kümesinden önek başına SIRADAKİ boş kodu üretir.
 *
 * ⚠ SAF: dosya okumaz. Bekçi de `pano:sonraki` de aynı gövdeyi çağırıyor;
 * ikisi ayrı yazılsaydı bekçinin önerdiği kod ile komutun verdiği kod bir
 * gün ayrışırdı — ve o gün ikisine de güvenilmezdi.
 */
export function sonrakiKodlar(kimlikler: Iterable<string>): Map<string, string> {
  const enBuyuk = new Map<string, number>();
  for (const cekirdek of kimlikler) {
    const m = CEKIRDEK.exec(cekirdek);
    if (m === null) continue;
    const onek = m[1];
    enBuyuk.set(onek, Math.max(enBuyuk.get(onek) ?? 0, Number(m[2])));
  }
  const sonraki = new Map<string, string>();
  for (const [onek, n] of [...enBuyuk].sort()) {
    sonraki.set(onek, onek + String(n + 1));
  }
  return sonraki;
}

/**
 * Çakışan bir kimlik için EKRANA YAZILACAK ÇARE.
 *
 * ⛔ BEKÇİ YALNIZ "HAYIR" DEMEZ, "NE YAP" DER. Çakışmanın iki ayrı sebebi
 * var ve çareleri FARKLI — mesaj hangisi olduğunu okuyana bırakmaz:
 *   · aynı kalemin ikinci fazı  → YENİ SATIR DEĞİL, aynı satırın DEVAMI
 *   · gerçekten yeni bir kalem  → sıradaki boş kod
 * _(Anayasa: "kural doğru mu değil, teslim edilebilir mi" — çaresi
 * gösterilmeyen bir yasak, okuyanı çıkmaza bırakır.)_
 */
export function cakismaCaresi(
  cekirdek: string,
  sonraki: Map<string, string>,
): string {
  const m = CEKIRDEK.exec(cekirdek);
  const onek = m === null ? null : m[1];
  const oneri = onek === null ? null : (sonraki.get(onek) ?? null);
  return (
    `${cekirdek} iki satırda geçiyor. ` +
    `Aynı kalemin ikinci fazıysa YENİ SATIR AÇMA — mevcut satırın sonuna ` +
    `"─── ② …" diye ekle. Gerçekten yeni bir kalemse sıradaki boş kod: ` +
    (oneri ?? "(önek çözülemedi)")
  );
}
