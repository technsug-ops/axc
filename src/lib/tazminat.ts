import { gunMetninden } from "@/lib/donem";
import { sayiCoz } from "@/lib/tablo/hucre";
import type { CompensationStatus, Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  TAZMİNAT — TEDARİKÇİDEN ALACAK
 * ----------------------------------------------------------------------------
 *  Saf hesap: veritabanına gitmez, saati kendi okumaz.
 *
 *  NEREDEN DOĞAR: hasarlı gelen mal. İki kaynağı var ve ikisi de STOĞA
 *  GİRMEZ, sayaç olarak durur:
 *    - `PurchaseItem.damagedQuantity` — mal kabulde hasarlı çıkan
 *    - `ReturnItem.damagedQuantity`   — müşteriden hasarlı dönen
 *
 *  BEŞ DURUM (şemadaki `CompensationStatus`):
 *    OPEN      hasar kaydedildi, tedarikçiye henüz bildirilmedi
 *    CLAIMED   bildirildi, cevap bekleniyor
 *    ACCEPTED  kabul edildi, para/mal bekleniyor
 *    REJECTED  reddedildi        → alacak DEĞİL
 *    SETTLED   kapandı           → alacak DEĞİL
 *
 *  "AÇIK ALACAK" = OPEN + CLAIMED + ACCEPTED.
 *  ACCEPTED'in açık sayılması bilinçli: tedarikçi kabul etmiş ama parayı
 *  henüz göndermemiştir; hâlâ tahsil edilecek bir alacaktır. Kapanma
 *  yalnızca SETTLED (para geldi) ya da REJECTED (alamayacağız) ile olur.
 *
 *  PARA BİRİMLERİ TOPLANMAZ. Bir tedarikçiden hem TRY hem EUR alacağınız
 *  olabilir; kur uydurulmaz, ayrı ayrı gösterilir (anayasa kuralı).
 * ============================================================================
 */

/** Alacak sayılan durumlar. Bunun dışı kapanmış demektir. */
export const ACIK_DURUMLAR: CompensationStatus[] = [
  "OPEN",
  "CLAIMED",
  "ACCEPTED",
];

export function acikMi(durum: CompensationStatus): boolean {
  return ACIK_DURUMLAR.includes(durum);
}

export type TazminatKaydi = {
  durum: CompensationStatus;
  tutar: number;
  paraBirimi: Currency;
};

/** Para birimi başına açık alacak toplamı. Boş girdi boş liste döner. */
export function acikAlacakToplami(
  kayitlar: TazminatKaydi[],
): { paraBirimi: Currency; tutar: number }[] {
  const harita = new Map<Currency, number>();

  for (const k of kayitlar) {
    if (!acikMi(k.durum)) continue;
    harita.set(k.paraBirimi, (harita.get(k.paraBirimi) ?? 0) + k.tutar);
  }

  return [...harita.entries()]
    .map(([paraBirimi, tutar]) => ({ paraBirimi, tutar }))
    .sort((a, b) => a.paraBirimi.localeCompare(b.paraBirimi));
}

/**
 * Bir hasar kaynağı için HENÜZ TALEP EDİLMEMİŞ adet.
 *
 * Aynı hasar iki kere talep edilmesin diye açılmış taleplerin adedi
 * düşülür. REDDEDİLEN talep de düşülür: reddedilmiş bir hasarı yeniden
 * talep etmek yeni bir kayıt açmak değil, o kaydı yeniden görüşmektir.
 */
export function kalanTalepEdilebilirAdet(
  hasarliAdet: number,
  mevcutTalepAdetleri: number[],
): number {
  const talepEdilen = mevcutTalepAdetleri.reduce((t, a) => t + a, 0);
  return Math.max(0, hasarliAdet - talepEdilen);
}

/**
 * Varsayılan talep tutarı: adet × birim maliyet. METİN döner.
 *
 * ÖNERİDİR, DAYATMA DEĞİL. Tedarikçiyle pazarlık başka rakamda kapanabilir;
 * alan formda değiştirilebilir.
 *
 * ⚠ NEDEN METİN, NEDEN YUVARLAMA:
 * `3 * 149.9` kayan noktada 449.70000000000005 verir. Bu değer doğrudan
 * Decimal(18,4) alanına yazılsaydı veritabanına da öyle giderdi. Anayasa
 * "parasal değer asla Float" diyor; hesap burada bitirilir ve alanın
 * kesinliğine (4 basamak) yuvarlanmış METİN olarak çıkar.
 * _11.08.2026'da doğrulama betiği yakaladı._
 */
export const TUTAR_BASAMAK = 4;

/**
 * ============================================================================
 *  TALEP TUTARINI ÇÖZ — FORMUN YAZDIĞINI SUNUCU AYNI SAYI OLARAK OKUR (K238)
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI HATA 23.09.2026 — DÖRT TALEP TAM ×10.000 YAZILMIŞ:
 *
 *      ürün maliyeti    799,91  →  deftere yazılan   7.999.100,00
 *                      8.811,00 →                   88.110.000,00
 *                        759,90 →                    7.599.000,00
 *                      1.111,00 →                   11.110.000,00
 *
 *  Sebep, iki YARININ AYNI EKRANDA FARKLI BİÇİM KONUŞMASIYDI:
 *   · `varsayilanTalepTutari` forma MAKİNE biçimi yazıyor: `"799.9100"`
 *     (nokta = ONDALIK, dört basamak — `Decimal(18,4)`).
 *   · Sunucudaki çözücü TÜRKÇE biçim varsayıyordu: `.replace(/\./g, "")`,
 *     yani noktayı BİNLİK AYIRACI sanıp siliyordu → `7999100`.
 *
 *  İki taraf da kendi içinde "doğru"ydu ve ayrı ayrı sınanıyordu; kimse
 *  ARADAKİ BAĞI ölçmemişti. _(Anayasa: "zincir, halkalarının varlığıyla
 *  değil BAĞLANTISIYLA sınanır" · "iki halka ayrı ayrı doğru olabilir —
 *  aradaki bağ yanlış".)_
 *
 *  ⭐ ÇARE İKİNCİ BİR ÇÖZÜCÜ YAZMAK DEĞİL, VAR OLANI KULLANMAK: `sayiCoz`
 *  deponun ortak hücre çözücüsü ve İKİ biçimi de tanıyor — `1.234,56` (TR)
 *  ve `799.9100` (makine). Excel okuyucuları yıllardır onu kullanıyor;
 *  tazminat formu kendi kopyasını yazdığı için ayrıştı.
 * ============================================================================
 */
export function talepTutariniCoz(ham: unknown): number {
  const metin = String(ham ?? "").trim();
  if (metin === "") return Number.NaN;
  return sayiCoz(metin) ?? Number.NaN;
}

export function varsayilanTalepTutari(
  adet: number,
  birimMaliyet: number,
): string {
  const carpan = 10 ** TUTAR_BASAMAK;
  const yuvarlanmis = Math.round(adet * birimMaliyet * carpan) / carpan;
  return yuvarlanmis.toFixed(TUTAR_BASAMAK);
}

/**
 * ============================================================================
 *  KARŞI TARAF — "EN AZ BİRİ DOLU" KURALI
 * ----------------------------------------------------------------------------
 *  23.08.2026: tazminatın karşı tarafı ÜÇ türden biri olabilir hâle geldi
 *  (docs/iade-sureci.md §12.1):
 *
 *    · tedarikçi   — mal bize bozuk geldi
 *    · kargo       — iade 10 günde ulaşmadı, pazaryeri onayladı
 *    · pazaryeri   — HB "Hurda Geliri"; ⚠ pazaryerleri ZATEN `Supplier`
 *                    listesinde olduğu için ayrı alan gerekmedi
 *
 *  ⚠ BU KURAL ŞEMADA DEĞİL, BURADA — VE BİLEREK. `supplierId` zorunluluktan
 *  çıkınca üç alanın da boş olduğu bir kayıt YAZILABİLİR hâle geldi ve
 *  öyle bir kayıt ANLAMSIZDIR: kimden alacaklı olduğumuzu söylemeyen bir
 *  alacak, alacak değildir. Prisma "en az biri dolu" kısıtını ifade
 *  edemiyor (MySQL CHECK'i de şemadan yönetilemiyor), bu yüzden kapı
 *  uygulama katmanında duruyor ve `tazminat:dogrula` onu sınıyor.
 *
 *  ⚠ SAF FONKSİYON: veritabanına gitmez, `Decimal` almaz. Hem sunucu
 *  eylemi hem bekçi aynı gövdeyi çağırsın diye böyle — iki yerde iki
 *  ölçüt olsaydı biri sessizce gevşerdi.
 * ============================================================================
 */
export function karsiTarafGecerliMi(girdi: {
  supplierId?: string | null;
  carrierId?: string | null;
}): boolean {
  return Boolean(girdi.supplierId) || Boolean(girdi.carrierId);
}

/**
 * ============================================================================
 *  KARŞI TARAF SEÇİMİ — FORM DEĞERİ (30.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ VAKA: iadeden açılan talepte karşı taraf «varyantın son alımının
 *  tedarikçisi»ne SABİTLENİYORDU ve form bunu seçtirmiyordu. Hepsiburada'nın
 *  ödediği ütü tazmini (₺5.134,28, EFA2026000000055) «Amazon» diye yazıldı.
 *  Eylemin kendi yorumu «form tedarikçiyi DEĞİŞTİRİLEBİLİR gösterir» diyordu —
 *  kod bunu hiç yapmıyordu. Tazmini çoğu zaman satıcıya PAZARYERİ öder.
 *
 *  Tek alan iki tabloyu taşır: `S:<supplierId>` ya da `C:<carrierId>`.
 *  Çözülemeyen değer `null` döner — sessizce bir tarafa düşmez.
 * ============================================================================
 */
/** Karşı taraf düzeltmesinin izi — eski ve yeni değer detayda. */
export const TAZMINAT_KARSI_TARAF_EYLEMI = "TAZMINAT_KARSI_TARAF_DEGISTI";

export function karsiTarafDegeri(girdi: { supplierId?: string | null; carrierId?: string | null }): string | null {
  if (girdi.supplierId) return `S:${girdi.supplierId}`;
  if (girdi.carrierId) return `C:${girdi.carrierId}`;
  return null;
}

export function karsiTarafCoz(deger: string | null | undefined): { supplierId: string | null; carrierId: string | null } | null {
  if (!deger) return null;
  const m = /^([SC]):(\S+)$/.exec(deger.trim());
  if (!m) return null;
  return m[1] === "S" ? { supplierId: m[2], carrierId: null } : { supplierId: null, carrierId: m[2] };
}

/**
 * Karşı tarafın ekranda görünen adı.
 *
 * ⚠ "—" DÖNMEZ, HANGİSİ OLDUĞUNU SÖYLER. Adsız satır yazılmaz (İlke #14);
 * karşı tarafı olmayan bir tazminat zaten `karsiTarafGecerliMi`den
 * geçemez, ama eski kayıtlar ya da bozuk veri için sessiz kalmak yerine
 * görünür bir işaret bırakılır.
 */
export function karsiTarafAdi(kayit: {
  supplier?: { name: string } | null;
  carrier?: { name: string } | null;
}): string | null {
  return kayit.supplier?.name ?? kayit.carrier?.name ?? null;
}

/**
 * ============================================================================
 *  TAHSİLAT İZİ — TAZMİNAT NE ZAMAN GELİR HALİNE GELDİ (K209)
 * ----------------------------------------------------------------------------
 *  _Kullanıcı 11.09.2026: "tazminden gelen para hangi kalemde görünüyor,
 *  en nihayetinde muhasebeleştirilmeli."_ Tazminat parası hiçbir rapora
 *  girmiyordu — bu ikisi onu GERÇEK NET'e bağlar.
 *
 *  ⚠ ŞEMA DEĞİŞMEDİ — K34a/PAKETLEME İLE AYNI MERDİVEN BASAMAĞI. `status`
 *  SETTLED'e her geçtiğinde `AuditLog`a iz yazılır; "ne zaman tahsil
 *  edildi" sorusunun cevabı `Compensation.updatedAt`TEN OKUNMAZ — o alan
 *  not düzenlemesiyle de (K208) ezilir ve tahsilat anını YALANCI gösterir
 *  (anayasa: "GEÇMİŞİ DÜZELTMEK..." → `updatedAt` her dokunuşta kirlenir).
 *  İz, PAKETLENDI/PAKETLEME_GERI_ALINDI ile BİREBİR aynı desen: en yeni iz
 *  kazanır, silme yok, ters kayıt.
 * ============================================================================
 */
export const TAZMINAT_TAHSIL_EDILDI_EYLEMI = "TAZMINAT_TAHSIL_EDILDI";
export const TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI =
  "TAZMINAT_TAHSILI_GERI_ALINDI";

export const TAZMINAT_TAHSILAT_EYLEMLERI = [
  TAZMINAT_TAHSIL_EDILDI_EYLEMI,
  TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI,
] as const;

export type TazminatTahsilatIzi = {
  action: string;
  createdAt: Date;
  targetId: string | null;
  /**
   * İzin JSON detayı. `tahsilGunu` ("YYYY-MM-DD") taşıyorsa tahsil günü ODUR;
   * yoksa izin anı (eski davranış). İsteğe bağlı: seçmeyen okuyucu eski
   * davranışa düşer — bu yüzden iki okuyucu da (`rapor` · `kart-iadesi-veri`)
   * bekçiyle SEÇMEK zorunda (`tazminat:dogrula`).
   */
  detail?: string | null;
};

/**
 * ============================================================================
 *  TAHSİL GÜNÜ İZİN İÇİNDEN (30.09.2026, kullanıcı kararı)
 * ----------------------------------------------------------------------------
 *  _«Kendi kartlarımdan bakarım ama diğer kart sahipleri bakamaz … aldığım
 *  ürünün parası iade edildiğinde pazaryerinden bildirim geliyor ve takip
 *  eden 2 gün içinde iade gerçekleşiyor; o bildirim tarihini esas kabul
 *  edebiliriz.»_
 *
 *  Tahsil günü eskiden izin ANIYDI — yani durumu «Kapandı»ya çevirdiğin gün.
 *  Bildirimi 3 gün sonra işleyen, parayı 3 gün geç tahsil etmiş görünüyordu;
 *  ve iz doğmadan (K209) kapatılmış 4 alım iadesinin HİÇ günü yoktu → kart
 *  borcundan sessizce düşmüyorlardı (ölçüldü: ₺12.201,70).
 *
 *  ⚠ SIRA HÂLÂ İZİN ANIYLA: «en yeni iz kazanır» değişmedi. Tarih düzeltmesi
 *  YENİ bir iz yazar (silme yok) ve geçmişe dönük gün girilse bile en yeni
 *  olduğu için kazanır. Günü izin anına yazsaydık, geçmiş bir gün eski izin
 *  GERİSİNE düşer ve düzeltme hiç görünmezdi.
 *  ⚠ ÇÖZÜLEMEYEN DETAY iz anına düşer (eski izler `{tutar,paraBirimi}` taşır).
 * ============================================================================
 */
export const TAHSIL_GUNU_ALANI = "tahsilGunu";

export function izdekiTahsilGunu(detail: string | null | undefined): Date | null {
  if (!detail) return null;
  let veri: unknown;
  try {
    veri = JSON.parse(detail);
  } catch {
    /* Bozuk iz tahsil günü taşımaz; iz anına düşülür — yukarıdaki not. */
    return null;
  }
  if (veri === null || typeof veri !== "object") return null;
  const gun = (veri as Record<string, unknown>)[TAHSIL_GUNU_ALANI];
  return typeof gun === "string" ? gunMetninden(gun) : null;
}

/**
 * BİR TALEP TAHSİL EDİLMİŞ Mİ — EN YENİ İZ KAZANIR.
 *
 * Tahsil edildiyse İZİN TARİHİNİ döner (rapor bu tarihe göre döneme
 * yazar); edilmediyse `null`.
 *
 * ⚠ EŞİT ZAMAN DAMGASINDA GERİ ALMA KAZANIR — paketleme izi ile AYNI risk
 * gerekçesi: yanlışlıkla "tahsil edildi" saymak GERÇEK NET'i şişirir,
 * yanlışlıkla "edilmedi" saymak en fazla bir kez fazladan bakılmasına
 * yol açar. İkincisi daha güvenli yön.
 */
export function tazminatTahsilTarihi(
  izler: TazminatTahsilatIzi[],
): Date | null {
  let enYeni: TazminatTahsilatIzi | null = null;
  for (const iz of izler) {
    if (
      iz.action !== TAZMINAT_TAHSIL_EDILDI_EYLEMI &&
      iz.action !== TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI
    ) {
      continue;
    }
    if (enYeni === null) {
      enYeni = iz;
      continue;
    }
    if (iz.createdAt.getTime() > enYeni.createdAt.getTime()) {
      enYeni = iz;
      continue;
    }
    if (
      iz.createdAt.getTime() === enYeni.createdAt.getTime() &&
      iz.action === TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI
    ) {
      enYeni = iz;
    }
  }
  if (enYeni?.action !== TAZMINAT_TAHSIL_EDILDI_EYLEMI) return null;
  return izdekiTahsilGunu(enYeni.detail) ?? enYeni.createdAt;
}

/**
 * TALEP BAŞINA TAHSİLAT HARİTASI — tek sorguda çekilen izler burada
 * gruplanır (paketlemedeki `hazirlananSiparisler` ile aynı desen).
 */
export function tazminatTahsilTarihleri(
  izler: TazminatTahsilatIzi[],
): Map<string, Date> {
  const gruplar = new Map<string, TazminatTahsilatIzi[]>();
  for (const iz of izler) {
    if (!iz.targetId) continue;
    const liste = gruplar.get(iz.targetId);
    if (liste) liste.push(iz);
    else gruplar.set(iz.targetId, [iz]);
  }

  const sonuc = new Map<string, Date>();
  for (const [id, liste] of gruplar) {
    const tarih = tazminatTahsilTarihi(liste);
    if (tarih) sonuc.set(id, tarih);
  }
  return sonuc;
}
