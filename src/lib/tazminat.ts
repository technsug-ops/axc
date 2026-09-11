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
};

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
  return enYeni?.action === TAZMINAT_TAHSIL_EDILDI_EYLEMI
    ? enYeni.createdAt
    : null;
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
