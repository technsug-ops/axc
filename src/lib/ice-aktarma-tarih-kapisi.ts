/**
 * ============================================================================
 *  İÇE AKTARMA TARİH KAPISI — İKİ SINIR, ÜSTÜ KAYAR
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR — İKİ CANLI VAKA ÜST ÜSTE (26.08.2026):
 *
 *  ① Alış dosyasında Teslim Tarihi `"11.02.0202"` yazıyordu (birinin
 *     `2026` yerine `0202` yazması). `new Date()` bunu **YIL 202** diye
 *     geçerli saydı; 8 alım yazımda düştü ve sebep zincirin SONUNDA
 *     göründü.
 *  ② Satış dosyasında `2029-03-30` tarihli bir satır vardı. İlk kapı
 *     "makul yıl 2000–2100" idi ve onu GEÇİRDİ: yıl geçerli, ama **gün
 *     henüz gelmedi.** Bir satış gelecekte olamaz — yazılsaydı ciroya
 *     girer, kâr hesabına katılır ve olmayan bir hakediş beklentisi
 *     doğururdu. Kuru koşumda kova ayrılınca yakalandı.
 *
 *  ═══ İKİ KAPI (Halil kararı 26.08.2026) ═══
 *
 *  · **ALT SINIR SABİT** — `2024-01-01`, işletmenin başlangıcı ve
 *    dosyanın en eski kaydı. Geçmiş büyümez, dolayısıyla sabit kalabilir.
 *
 *  · **ÜST SINIR KAYAR — BUGÜN.** Sabit yıl DEĞİL.
 *    ⛔ `2024–2026` gibi sabit bir aralık yazılsaydı **2027 Ocak'ta kod
 *    sessizce kırılırdı** ve sebebini kimse hatırlamazdı. Geçmiş bir
 *    olayın tarihi bugünden sonra olamaz — ölçüt budur, takvim yılı
 *    değil.
 *
 *  ⚠ SINIR DIŞI KALAN, ALT MI ÜST MÜ AŞTIĞI AYRI YAZILIR. Tek "tarihDışı"
 *  rakamı iki apayrı sorunu gizlerdi: alt sınırı aşan bir kayıt VERİ
 *  HATASI (0202 gibi), üst sınırı aşan ise GELECEK TARİHLİ bir olay.
 *  _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim,
 *  denetim değildir".)_
 * ============================================================================
 */

/**
 * İŞLETME BAŞLANGICI — dosyanın en eski kaydı da bu yıla düşüyor.
 * ⚠ Bundan öncesi bir TARİH DEĞİL, veri hatasıdır: `0202` · `1899` ·
 * Excel'in sıfır serisi.
 */
export const ICE_AKTARMA_ALT_SINIR = new Date("2024-01-01T00:00:00.000Z");

export type TarihKapisi =
  | { tur: "GECERLI"; tarih: Date }
  | { tur: "OKUNAMADI" }
  | { tur: "COK_ESKI"; tarih: Date }
  | { tur: "GELECEKTE"; tarih: Date };

/**
 * Ham hücre değerini içe aktarma için geçerli bir tarihe çevirir.
 *
 * @param ham   Excel hücresi — `Date` · Excel seri numarası · metin.
 * @param simdi ÜST SINIR. Çağıran verir (koşum anı); fonksiyon kendi
 *              saatini OKUMAZ — yoksa test edilemez ve iki çağrı arasında
 *              sınır kayardı.
 *
 * ⚠ GEÇERLİLİK HER DALDA SINANIR ve çıkış TEK KAPIDAN geçer. Dal başına
 * ayrı kontrol yazılsaydı dördüncü dal eklendiğinde atlanırdı.
 * _(Anayasa: "sınanmayan dal, sınanmamış koddur".)_
 */
export function iceAktarmaTarihi(ham: unknown, simdi: Date): TarihKapisi {
  const metin =
    ham === null || ham === undefined
      ? ""
      : typeof ham === "string"
        ? ham.trim()
        : String(ham).trim();
  const aday =
    ham instanceof Date
      ? ham
      : typeof ham === "number"
        ? new Date(Date.UTC(1899, 11, 30) + ham * 86_400_000)
        : metin
          ? new Date(metin)
          : null;
  if (aday === null || Number.isNaN(aday.getTime())) return { tur: "OKUNAMADI" };
  if (aday.getTime() < ICE_AKTARMA_ALT_SINIR.getTime()) return { tur: "COK_ESKI", tarih: aday };
  /**
   * ⚠ ÜST SINIR `simdi` — SABİT YIL DEĞİL. Bu satırı `getUTCFullYear() >
   * 2026` gibi bir şeye çevirmek, kodu 2027 Ocak'ta sessizce kırar.
   */
  if (aday.getTime() > simdi.getTime()) return { tur: "GELECEKTE", tarih: aday };
  return { tur: "GECERLI", tarih: aday };
}
