/**
 * ============================================================================
 *  K363 Faz 2-b — ÖZEL GÜN TAKVİMİNİN İLK LİSTESİ (kullanıcı kararı 24.10.2026:
 *  «Ben hazırlayayım, sen onayla»)
 * ----------------------------------------------------------------------------
 *  BETİK SINIFI: TEK_SEFERLIK — takvim bir kez tohumlanır; sonrası ekrandan
 *  (Ayarlar → Özel günler) yönetilir. İkinci koşum zararsızdır: var olan gün ve
 *  var olan tarih ATLANIR, sayılır (satır satır tekrar koşulabilir).
 *
 *  YAZIM ÇEKİRDEĞİ EKRANLA AYNI (`lib/ozel-gun/ozel-gun-yaz.ts`): doğrulama,
 *  benzersizlik ve iz (`OZEL_GUN_EKLE` · `OZEL_GUN_TARIH_EKLE`) tek yerden.
 *  Geri alma: ekrandan sil (gelecek tarihli gün) ya da tarih sil — ölçüt kaydın
 *  kendisi; liste tutulmaz.
 *
 *  ⛔ TAHMİN EDİLEN TARİH KESİNMİŞ GİBİ DURMAZ:
 *   · KURALLA HESAPLANAN günler (Black Friday = Şükran Günü'nden sonraki Cuma ·
 *     11.11 · Anneler Günü = Mayıs'ın 2. Pazarı · Babalar Günü = Haziran'ın 3.
 *     Pazarı · 14 Şubat · 31 Aralık) → `dogrulandi: true`, kaynak «takvim kuralı».
 *   · BAYRAM ve OKUL AÇILIŞI → `dogrulandi: false`. Kaynak haber siteleri
 *     (Diyanet / MEB takvimine atıf yapıyorlar; resmî sayfa okunmadı, 24.10.2026).
 *     Ekran «Doğrulanacak» rozeti gösterir; kullanıcı resmî kaynaktan bakıp işaretler.
 *   · ALIM KAMPANYASI ADAYLARI — alım geçmişinin en yoğun günlerinden (canlı
 *     ölçüm 24.10.2026, salt okuma). Hangi kampanya olduğunu sistem BİLMİYOR:
 *     ad «Alım adayı: …» ve `dogrulandi: false`; kullanıcı adını verir ya da siler.
 *     Gelecek yılın tarihi UYDURULMAZ — kullanıcı bilince ekler.
 *
 *      npx tsx scripts/canli-ozel-gun-ilk-liste.ts          (kuru koşum — yazmaz)
 *      npx tsx scripts/canli-ozel-gun-ilk-liste.ts --yaz
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

type Tarih = { bas: string; bit?: string; kaynak: string; dogrulandi: boolean };
type Gun = { ad: string; tur: "SATIS_GUNU" | "ALIM_KAMPANYASI"; aciklama: string | null; tarihler: Tarih[] };

const KURAL = "takvim kuralı";
const HABER_DIYANET = "haber siteleri, Diyanet takvimine atıf (resmî sayfa okunmadı)";
const HABER_MEB = "haber siteleri, MEB çalışma takvimine atıf (resmî genelge okunmadı)";
const HAFIZA = "genel bilgi, kaynak okunmadı";
const ALIM_OLCUMU = "alım geçmişinden aday (canlı ölçüm 24.10.2026)";

const LISTE: Gun[] = [
  { ad: "Black Friday", tur: "SATIS_GUNU", aciklama: "Kasım'ın Şükran Günü'nden sonraki Cuması. 28.11.2025 geçmişin en yoğun satış günüydü (48 sipariş).", tarihler: [
    { bas: "2025-11-28", kaynak: KURAL, dogrulandi: true },
    { bas: "2026-11-27", kaynak: KURAL, dogrulandi: true },
  ] },
  { ad: "11.11", tur: "SATIS_GUNU", aciklama: "Bekarlar günü indirimleri.", tarihler: [
    { bas: "2025-11-11", kaynak: KURAL, dogrulandi: true },
    { bas: "2026-11-11", kaynak: KURAL, dogrulandi: true },
  ] },
  { ad: "Yılbaşı", tur: "SATIS_GUNU", aciklama: "Tek gün girildi; hediye alışverişi daha önce başlıyorsa başlangıcı ekrandan öne alın.", tarihler: [
    { bas: "2025-12-31", kaynak: KURAL, dogrulandi: true },
    { bas: "2026-12-31", kaynak: KURAL, dogrulandi: true },
  ] },
  { ad: "Sevgililer Günü", tur: "SATIS_GUNU", aciklama: null, tarihler: [
    { bas: "2026-02-14", kaynak: KURAL, dogrulandi: true },
    { bas: "2027-02-14", kaynak: KURAL, dogrulandi: true },
  ] },
  { ad: "Anneler Günü", tur: "SATIS_GUNU", aciklama: "Mayıs'ın ikinci Pazarı.", tarihler: [
    { bas: "2025-05-11", kaynak: KURAL, dogrulandi: true },
    { bas: "2026-05-10", kaynak: KURAL, dogrulandi: true },
    { bas: "2027-05-09", kaynak: KURAL, dogrulandi: true },
  ] },
  { ad: "Babalar Günü", tur: "SATIS_GUNU", aciklama: "Haziran'ın üçüncü Pazarı.", tarihler: [
    { bas: "2025-06-15", kaynak: KURAL, dogrulandi: true },
    { bas: "2026-06-21", kaynak: KURAL, dogrulandi: true },
    { bas: "2027-06-20", kaynak: KURAL, dogrulandi: true },
  ] },
  { ad: "Ramazan Bayramı", tur: "SATIS_GUNU", aciklama: "Bayramın üç günü (arefe hariç).", tarihler: [
    { bas: "2025-03-30", bit: "2025-04-01", kaynak: HAFIZA, dogrulandi: false },
    { bas: "2026-03-20", bit: "2026-03-22", kaynak: HABER_DIYANET, dogrulandi: false },
    { bas: "2027-03-09", bit: "2027-03-11", kaynak: HABER_DIYANET, dogrulandi: false },
  ] },
  { ad: "Kurban Bayramı", tur: "SATIS_GUNU", aciklama: "Bayramın dört günü (arefe hariç).", tarihler: [
    { bas: "2025-06-06", bit: "2025-06-09", kaynak: HAFIZA, dogrulandi: false },
    { bas: "2026-05-27", bit: "2026-05-30", kaynak: HABER_DIYANET, dogrulandi: false },
    { bas: "2027-05-16", bit: "2027-05-19", kaynak: HABER_DIYANET, dogrulandi: false },
  ] },
  { ad: "Okul açılışı", tur: "SATIS_GUNU", aciklama: "Derslerin başladığı gün; alışveriş öncesindeki haftalarda ise başlangıcı ekrandan öne alın.", tarihler: [
    { bas: "2025-09-08", kaynak: HAFIZA, dogrulandi: false },
    { bas: "2026-09-14", kaynak: HABER_MEB, dogrulandi: false },
  ] },
  { ad: "Alım adayı: 30–31 Ekim", tur: "ALIM_KAMPANYASI", aciklama: "30.10.2025 alım geçmişinin zirvesi (tek günde 97 adet). Hangi kampanya olduğunu yazın ya da silin.", tarihler: [
    { bas: "2025-10-30", bit: "2025-10-31", kaynak: ALIM_OLCUMU, dogrulandi: false },
  ] },
  { ad: "Alım adayı: 23–25 Aralık", tur: "ALIM_KAMPANYASI", aciklama: "Üç gün art arda yoğun alım (75 · 44 · 44 adet). Hangi kampanya olduğunu yazın ya da silin.", tarihler: [
    { bas: "2025-12-23", bit: "2025-12-25", kaynak: ALIM_OLCUMU, dogrulandi: false },
  ] },
  { ad: "Alım adayı: 1–7 Şubat", tur: "ALIM_KAMPANYASI", aciklama: "1.02 (52 adet) ve 7.02.2026 (62 adet) arası yoğun alım. Hangi kampanya olduğunu yazın ya da silin.", tarihler: [
    { bas: "2026-02-01", bit: "2026-02-07", kaynak: ALIM_OLCUMU, dogrulandi: false },
  ] },
  { ad: "Alım adayı: 16–25 Mart", tur: "ALIM_KAMPANYASI", aciklama: "16.03 (51 adet) – 25.03.2026 (39 adet) arası yoğun alım. Hangi kampanya olduğunu yazın ya da silin.", tarihler: [
    { bas: "2026-03-16", bit: "2026-03-25", kaynak: ALIM_OLCUMU, dogrulandi: false },
  ] },
  { ad: "Alım adayı: 28–29 Eylül", tur: "ALIM_KAMPANYASI", aciklama: "28–29.09.2026 yoğun alım (42 · 37 adet). Hangi kampanya olduğunu yazın ya da silin.", tarihler: [
    { bas: "2026-09-28", bit: "2026-09-29", kaynak: ALIM_OLCUMU, dogrulandi: false },
  ] },
];

async function main() {
  const YAZ = process.argv.includes("--yaz");
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { ozelGunEkle, tarihEkle } = await import("../src/lib/ozel-gun/ozel-gun-yaz");
  const { tarihDogrula } = await import("../src/lib/ozel-gun/ozel-gun");

  console.log(`\nK363 Faz 2-b ÖZEL GÜN İLK LİSTESİ — ${YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"} · ${new Date().toISOString()}`);
  const sayac = { yeniGun: 0, yeniTarih: 0, varOlanGun: 0, varOlanTarih: 0, hata: 0 };
  try {
    for (const g of LISTE) {
      const mevcut = await prisma.ozelGun.findUnique({ where: { ad: g.ad }, select: { id: true, tarihler: { select: { baslangic: true } } } });
      const varOlan = new Set((mevcut?.tarihler ?? []).map((t) => t.baslangic.toISOString().slice(0, 10)));
      for (const t of g.tarihler) {
        const d = tarihDogrula(t.bas, t.bit ?? "");
        if (!d.tamam) {
          console.log(`   ⛔ ${g.ad} ${t.bas} — ${d.hata}`);
          sayac.hata++;
        }
      }
      if (mevcut) sayac.varOlanGun++;
      const isaret = (t: Tarih) => `${t.bas}${t.bit ? `→${t.bit}` : ""}${t.dogrulandi ? "" : " (doğrulanacak)"}`;
      const eklenecek = g.tarihler.filter((t) => !varOlan.has(t.bas));
      sayac.varOlanTarih += g.tarihler.length - eklenecek.length;
      console.log(`   ${mevcut ? "VAR " : "YENİ"} ${g.tur === "SATIS_GUNU" ? "satış" : "alım "} · ${g.ad} · eklenecek: ${eklenecek.map(isaret).join(", ") || "—"}`);
      if (!YAZ || eklenecek.length === 0) {
        if (!mevcut) sayac.yeniGun++;
        sayac.yeniTarih += eklenecek.length;
        continue;
      }
      let kalan = eklenecek;
      let gunId = mevcut?.id ?? null;
      if (gunId === null) {
        const [ilk, ...geri] = eklenecek;
        const s = await ozelGunEkle(
          { ad: g.ad, tur: g.tur, channelId: null, aciklama: g.aciklama },
          { baslangic: ilk.bas, bitis: ilk.bit ?? "", kaynak: ilk.kaynak, dogrulandi: ilk.dogrulandi },
        );
        if (!s.tamam) {
          console.log(`   ⛔ ${g.ad} — ${s.hata}`);
          sayac.hata++;
          continue;
        }
        gunId = s.id;
        sayac.yeniGun++;
        sayac.yeniTarih++;
        kalan = geri;
      }
      for (const t of kalan) {
        const s = await tarihEkle(gunId, { baslangic: t.bas, bitis: t.bit ?? "", kaynak: t.kaynak, dogrulandi: t.dogrulandi });
        if (!s.tamam) {
          console.log(`   ⛔ ${g.ad} ${t.bas} — ${s.hata}`);
          sayac.hata++;
          continue;
        }
        sayac.yeniTarih++;
      }
    }
    console.log(
      `\n${YAZ ? "Yazıldı" : "Yazılacak"}: ${sayac.yeniGun} yeni gün · ${sayac.yeniTarih} yeni tarih · var olan gün ${sayac.varOlanGun} · var olan tarih ${sayac.varOlanTarih} (atlandı) · hata ${sayac.hata}`,
    );
    if (!YAZ) console.log("KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: --yaz");
    if (sayac.hata > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
main();
