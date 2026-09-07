import { kilitDurumu } from "./bekci-kilit";

/**
 * ============================================================================
 *  TUR KİLİDİ KAPISI — `pre-commit` bunu çağırır
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — SALT OKUMA, hiçbir şey yazmaz.
 *
 *  ⛔ NİYE VAR — AYNI DESEN ÜÇ KEZ (K149 · 03.09 · K173/06.09).
 *  Bekçi turu koşarken mutasyon harness'leri kaynak dosyaları CANLI OLARAK
 *  bozup geri yazıyor. O sırada atılan `git add -A`, havada duran bir
 *  mutasyonu commit'e alıyor; harness dosyayı sonradan geri yazdığı için
 *  tur TEMİZ ağaca karşı koşuyor ve YEŞİL yanıyor. Bozuk commit canlıya
 *  gidiyor ve kimse görmüyor.
 *
 *  📏 Bedeli ölçüldü: 06.09'da `panel/gorev-verisi.ts`e sızan kalıntı,
 *  panelin "dönem alımı" rakamını MAL KABUL yerine SİPARİŞ gününden
 *  saydırıyordu — ve `deploy:bekci` dahil hiçbir tur bunu görmedi.
 *
 *  ⭐ KAPI PUSH'TA VARDI, COMMIT'TE YOKTU. `pre-push` ayrışmayı yakalıyor
 *  ama commit çoktan atılmış oluyor; koruma bir adım erkene alındı.
 *  _(Anayasa: "güvenlik mekanizmaya bağlanır, disipline değil" — üç kez
 *  tekrarlayan bir desen artık dikkatle çözülmez.)_
 *
 *  ⚠ ÖLÇÜT BURADA YAZILMAZ, ÇAĞRILIR. "Tur koşuyor mu" sorusunun tek gövdesi
 *  `bekci-kilit.ts`; bu kapı üçüncü okuyucusu. İki yerde iki farklı ölçüt
 *  olsaydı biri canlı sayarken öteki bayat sayardı.
 *
 *  ⚠ DÜRÜSTLÜK NOTU: `git commit --no-verify` bu kapıyı atlar ve git'ten
 *  kaldırılamaz. Yani koruma "mekanik olarak imkânsız" değil, **kazayla
 *  imkânsız**. Kasıtlı atlama bir KARARDIR.
 * ============================================================================
 */
const durum = kilitDurumu();

if (!durum.canli) {
  process.exit(0);
}

const dakika = Math.round((durum.yasMs ?? 0) / 60_000);
console.log("");
console.log("=".repeat(74));
console.log("  ⛔ COMMIT DURDURULDU — BEKÇİ TURU KOŞUYOR");
console.log("=".repeat(74));
console.log(`     tur pid ${durum.pid} · ${dakika} dakikadır koşuyor`);
console.log("");
console.log("  Tur, mutasyon harness'leriyle kaynak dosyaları GEÇİCİ olarak");
console.log("  bozup geri yazar. Şu an atılan bir commit, havada duran bir");
console.log("  mutasyonu içine alabilir — ve harness dosyayı sonradan geri");
console.log("  yazdığı için tur TEMİZ ağaca karşı koşup YEŞİL yanar.");
console.log("  Bu desen üç kez yaşandı; sonuncusu canlıya bozuk kod gönderdi.");
console.log("");
console.log("  ⏭ NE YAPILIR: tur bitsin, sonra commit atın.");
console.log("     Tur bittiğinde bu kapı kendiliğinden açılır.");
console.log("");
console.log("  ⚠ Kilit ölü bir turdan kalmışsa 90 dakika sonra kendiliğinden");
console.log("     bayatlar; el ile silmek gerekmez.");
console.log("=".repeat(74));
console.log("");
process.exit(1);
