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
 * ============================================================================
 *  İKİNCİ BİÇİM — BAŞLIK KİMLİĞİ (K130, 02.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ ARAÇ KENDİ KÖR NOKTASI YÜZÜNDEN AYNI KUSURU ÜRETİYORDU. Bu gövde
 *  kimlikleri yalnız TABLO satırından okuyordu; pano ise kalemlerin
 *  çoğunu BAŞLIK olarak yazıyor (`## 🚨 K138 — …`).
 *
 *  📏 ÖLÇÜLDÜ 02.09.2026: başlık biçimli kimlik **71**, tablo satırı **42**.
 *  `npm run pano:sonraki` "sıradaki K128" diyordu; gerçek en büyük **K144**
 *  — araç **16 numara geride** ve bir sonraki kaleme kullanılmış bir kod
 *  önerecekti (beşinci çakışma).
 *
 *  ⚠ VE BUGÜN ELLE NUMARALANDI: K138–K144 araca sorulmadan verildi, çünkü
 *  yanlış söyleyeceği biliniyordu. Aracın kurulma gerekçesi tam da elle
 *  atamanın üç kez tutmamasıydı.
 *
 *  ── ⛔ DESEN İKİ TUZAK TAŞIYOR, İKİSİ DE ÖLÇÜLDÜ ────────────────────────
 *  ① SATIR ORTASINDAKİ ATIF KİMLİK DEĞİLDİR.
 *     `## ✅ DEFTER ONARIMI — KAPANDI 20.08.2026 (K20 · K21 · K22)`
 *     Üç kod geçiyor ama başlığın kimliği hiçbiri değil. Bu yüzden kod
 *     **başlığın BAŞINDA** aranıyor (isteğe bağlı tek simgeden sonra).
 *
 *  ② ALT BÖLÜM AYNI KODU TEKRAR EDER — VE BU MEŞRUDUR.
 *     `### 📐 K55 ÖLÇÜLDÜ`, `### 🚦 K55 KURU KOŞUM`, `### ✅ K55 KOŞTU` —
 *     altısı da K55'in alt bölümü. Ölçüldü: `###`+ düzeyinde **8 kod**
 *     tekrar ediyor ve hepsi meşru. Çakışma kontrolü onları sayarsa
 *     sekiz sahte çakışma üretir ve bekçi kullanılamaz hâle gelir.
 *
 *  ⭐ ÇARE: kalem başlığı **tam iki diyez** (`##`). Alt bölümler (`###`+)
 *  kimlik ÜRETMEZ. Ölçüldü: `##` düzeyinde tekrar eden 5 kod var ve
 *  **beşi de gerçek kusur** (iki fazlı teslim ya da bayat kopya) — yani
 *  bu ölçüt sahte pozitif üretmiyor.
 * ============================================================================
 */
export const BASLIK_KIMLIGI =
  /^##\s+(?:[^A-Za-z0-9\s]+\s+)?([A-Z]{1,2}\d{1,3}[a-z]?)(?=[\s—·:.,])/;

/**
 * Bir satırdan kalem kimliğini çıkarır — İKİ BİÇİMİ DE bilir.
 *
 * ⛔ TEK GÖVDE: üç çağıran (`pano:sonraki`, `pano:dogrula`nın iki yeri) bunu
 * kullanır. Biçim listesi çağıranlarda dursaydı biri güncellenip öteki
 * unutulurdu — bu kusurun kendisi zaten öyle doğdu.
 */
export function satirKimligi(satir: string): string | null {
  const tablo = SATIR_KIMLIGI.exec(satir);
  if (tablo !== null) return tablo[1].trim();
  const baslik = BASLIK_KIMLIGI.exec(satir);
  return baslik === null ? null : baslik[1].trim();
}

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
