import { indeksDurumu, kilitDurumu } from "./bekci-kilit";

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
/**
 * ═══ İKİNCİ KAPI — ZEHİRLENMİŞ İNDEKS (K198, 09.09.2026) ═══════════════
 *
 * ⛔ İLK KAPI EKSİKTİ VE BU ÖLÇÜLDÜ: tur koşarken commit durduruluyordu ama
 * `git add` durdurulmuyordu. 09.09'da tur sırasında çalışan bir `git add -A`
 * indekse CANLI bir mutasyon aldı:
 *
 *     -    if (enSon === null || ms > enSon) enSon = ms;
 *     +    if (enSon === null) enSon = ms;
 *
 * Kapı o anki commit'i reddetti — ama **indeks zehirli kaldı**. Tur bitince
 * atılacak sıradan bir commit onu sessizce içine alırdı ve kapı o an açık
 * olduğu için hiçbir şey söylemezdi. Koruma engellediği ANI koruyordu.
 *
 * ⭐ ÖLÇÜT: indeks, son turun PENCERESİ içinde mi yazıldı. Olaya değil HÂLE
 * bağlı ve kendini iyileştirir — indeks yeniden hazırlandığı an damga
 * pencerenin dışına çıkar ve kapı susar.
 *
 * ⚠ YANLIŞ POZİTİF YÖNÜ BEYAN EDİLİR: tur sırasında `git`in kendisi indekse
 * dokunursa (bir harness git çağırırsa) sonraki commit HAKSIZ yere durur.
 * Bu bilinçli bir tercih — kapının hata yönü GÜVENLİ tarafa bakıyor: fazla
 * durdurmak, bozuk bir commit'i geçirmekten ucuzdur. Ve çare tek satır:
 * indeksi yeniden hazırlamak.
 */
function indeksKapisi(): never {
  const ind = indeksDurumu();
  if (!ind.olculdu) {
    /** ⚠ "ölçemedim" ile "temiz" ayrı söylenir; sessiz yeşil verilmez. */
    console.log("");
    console.log("  ⚠ İNDEKS DAMGASI ÖLÇÜLEMEDİ — " + ind.sebep);
    console.log("     Commit geçiyor, ama bu kapı bu koşumda BAKMADI.");
    console.log("");
    process.exit(0);
  }
  if (!ind.supheli) process.exit(0);

  const p = ind.pencere!;
  const bicim = (ms: number) => new Date(ms).toLocaleTimeString("tr-TR");
  console.log("");
  console.log("=".repeat(74));
  console.log("  ⛔ COMMIT DURDURULDU — İNDEKS TURUN İÇİNDE HAZIRLANMIŞ");
  console.log("=".repeat(74));
  console.log("     son tur   " + bicim(p.basladi) + " → " + bicim(p.bitti));
  console.log("     indeks    " + bicim(ind.indeksMs) + "   ← BU ARALIĞIN İÇİNDE");
  console.log("");
  console.log("  Tur koşarken yapılan `git add`, mutasyon harness'inin o an");
  console.log("  BOZDUĞU bir dosyayı indekse almış olabilir. Harness dosyayı");
  console.log("  sonradan geri yazdığı için `git status` TEMİZ görünür — ama");
  console.log("  indekste bozuk hâli durur ve commit onu içine alır.");
  console.log("");
  console.log("  ⏭ NE YAPILIR — indeksi tazeleyin:");
  console.log("       git reset");
  console.log("       git add -A -- . ':!*.env*'");
  console.log("     Yeniden eklendiği an bu kapı kendiliğinden açılır.");
  console.log("");
  console.log("  ⚠ ÖNCE BAKIN: `git diff --cached --ignore-all-space` çıktısında");
  console.log("     beklemediğiniz bir satır varsa o bir mutasyon artığıdır.");
  console.log("=".repeat(74));
  console.log("");
  process.exit(1);
}

const durum = kilitDurumu();

if (!durum.canli) {
  indeksKapisi();
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
