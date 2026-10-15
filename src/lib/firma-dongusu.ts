import { firmaBaglamindaCalistir } from "@/lib/firma-baglami";

/**
 * ============================================================================
 *  ZAMANLANMIŞ İŞLERİN FİRMA DÖNGÜSÜ — K303 Aşama 3b
 * ----------------------------------------------------------------------------
 *  Tasarım §5: «çekimler firma firma döner; bir firmanın hatası ötekini
 *  durdurmaz ve firma adıyla yazar».
 *
 *  ⭐ K337 3. ADIM (15.10.2026): HER FİRMA KOŞAR. Pazaryeri anahtarı artık
 *  satış hesabına bağlı (`lib/kanal-anahtari/hesaplar.ts`); kanal işi firma
 *  bağlamında o firmanın HESAPLARINI kendi anahtarlarıyla dolaşır, anahtarı
 *  olmayan hesap «ATLANDI · ANAHTAR_YOK» yazar.
 *  ── ESKİ KURAL (silinmedi, NİYE çevrildiği yukarıda) ─────────────────────
 *  «Pazaryeri anahtarı tek takım (`.env`); düz döngü BİR firmanın anahtarıyla
 *  BÜTÜN firmalar adına çekim yapardı — kanal işi YALNIZ anahtar firmasında
 *  koşar, ötekiler ATLANDI.» Tek takım anahtar kalkınca bu kısıt korunacak bir
 *  şey korumuyordu; bugün ikinci firmanın KENDİ anahtarıyla çekimini engellerdi.
 *  `kimlikFirmasiSec` YALNIZ komut satırı betiklerinin firma seçimi için durur
 *  (`scripts/betik-firmasi.ts`):
 *   · `PAZARYERI_KIMLIK_FIRMASI=<firma kodu>` beyanı varsa → o firma
 *     (aktif değilse ya da yoksa HATA — sessizce başka firmaya düşmez);
 *   · beyan yoksa ve TEK aktif firma varsa → o firma (canlıdaki bugünkü
 *     davranış AYNEN sürer);
 *   · beyan yoksa ve birden çok firma varsa → HİÇBİR çekim koşmaz, sebep
 *     yazılır. «İlkini seç» dalı YOK.
 * ============================================================================
 */

export type FirmaOzeti = { id: string; code: string; name: string };

export type KimlikFirmasiSecimi =
  | { tamam: true; firma: FirmaOzeti }
  | { tamam: false; sebep: "AKTIF_FIRMA_YOK" | "BEYAN_GEREKLI" | "BEYAN_EDILEN_FIRMA_YOK" };

/** SAF: aktif firmalar + beyan → anahtar firması. Veritabanına gitmez. */
export function kimlikFirmasiSec(aktifFirmalar: FirmaOzeti[], beyan: string | undefined): KimlikFirmasiSecimi {
  const b = beyan?.trim() ?? "";
  if (b !== "") {
    const f = aktifFirmalar.find((x) => x.code === b);
    return f ? { tamam: true, firma: f } : { tamam: false, sebep: "BEYAN_EDILEN_FIRMA_YOK" };
  }
  if (aktifFirmalar.length === 0) return { tamam: false, sebep: "AKTIF_FIRMA_YOK" };
  if (aktifFirmalar.length === 1) return { tamam: true, firma: aktifFirmalar[0]! };
  return { tamam: false, sebep: "BEYAN_GEREKLI" };
}

export type FirmaSonucu<T> =
  | { firma: string; durum: "KOSTU"; sonuc: T }
  | { firma: string; durum: "HATA"; hata: string };

export type DonguSonucu<T> = { tamam: true; firmalar: FirmaSonucu<T>[] } | { tamam: false; sebep: "AKTIF_FIRMA_YOK" };

/**
 * SAF ÇEKİRDEK: firma listesi ve iş verilir, döngü kurulur. Her firma kendi
 * bağlamında koşar (ortak `prisma` o firmaya süzülür); bir firmanın hatası
 * yakalanır, TAM mesajla yazılır ve sıradakine geçilir.
 */
export async function firmaFirmaKos<T>(aktifFirmalar: FirmaOzeti[], is: (companyId: string) => Promise<T>): Promise<DonguSonucu<T>> {
  /* Boş liste «hepsi koştu» sayılmaz (anayasa: `every` kapısı / boş taban). */
  if (aktifFirmalar.length === 0) return { tamam: false, sebep: "AKTIF_FIRMA_YOK" };
  const firmalar: FirmaSonucu<T>[] = [];
  for (const f of aktifFirmalar) {
    const etiket = `${f.code} · ${f.name}`;
    try {
      const sonuc = await firmaBaglamindaCalistir(f.id, () => is(f.id));
      firmalar.push({ firma: etiket, durum: "KOSTU", sonuc });
    } catch (e) {
      const hata = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.error(`[firma-dongusu] ${etiket} HATA:`, hata);
      firmalar.push({ firma: etiket, durum: "HATA", hata });
    }
  }
  return { tamam: true, firmalar };
}

/** Aktif firmalar — firmalar-üstü okuma. */
export async function aktifFirmalariOku(): Promise<FirmaOzeti[]> {
  /** SISTEM: hangi firmalar için döneceğini bulmak firmalar-üstü bir sorudur (döngünün kendisi). */
  const { sistemPrisma } = await import("@/lib/prisma");
  /** SISTEM: aynı gerekçe — firma listesi hiçbir firmaya süzülemez. */
  return sistemPrisma.company.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
}

/** Zamanlanmış iş ucunun kullandığı tam döngü. */
export async function zamanlanmisIsDongusu<T>(is: (companyId: string) => Promise<T>): Promise<DonguSonucu<T>> {
  return firmaFirmaKos(await aktifFirmalariOku(), is);
}

/**
 * Uç yanıtının durumu. K264 sözleşmesi korunur: zamanlayıcının yeşili «çekim
 * koştu» demek olmalı. Aktif firma yoksa, bir firma HATA verdiyse ya da işin
 * kendisi «kırmızı» dediyse (kanal işinde: `hesapSonuclariKirmiziMi`) 503.
 * Anahtarı olmayan hesabın ATLANDI'sı beklenen durumdur — 503 yapmaz.
 */
export function donguDurumKodu<T>(s: DonguSonucu<T>, isAtlandiMi: (sonuc: T) => boolean): number {
  if (!s.tamam) return 503;
  const kirmizi = s.firmalar.some((f) => f.durum === "HATA" || (f.durum === "KOSTU" && isAtlandiMi(f.sonuc)));
  return kirmizi ? 503 : 200;
}

/**
 * ============================================================================
 *  TAM SİSTEM YEDEĞİ / GERİ YÜKLEME KAPISI — K303 Aşama 3b
 * ----------------------------------------------------------------------------
 *  Ekrandan alınan yedek ve geri yükleme BÜTÜN sistemi kapsar: geri yükleme
 *  ham SQL ile her tabloyu `DELETE FROM` ile boşaltıp yedeği yazar — süzgeçten
 *  geçmez. Tek firmada bu doğru davranıştır. İki firmada bir firmanın geri
 *  yüklemesi ÖTEKİNİN verisini silerdi; tam yedek indirmek de öteki firmanın
 *  verisini indirmek olurdu. Firma başına yedek AYRI bir tasarım kararıdır;
 *  o gelene kadar birden çok aktif firma varken bu iki ekran KAPALI.
 *  Gece yedeği (sahibin kendi deposuna, ekrandan inmez) açık kalır.
 * ============================================================================
 */
export function tamSistemIslemiKurali(aktifFirmaSayisi: number): boolean {
  return aktifFirmaSayisi <= 1;
}

export async function tamSistemIslemiAcikMi(): Promise<boolean> {
  return tamSistemIslemiKurali((await aktifFirmalariOku()).length);
}
