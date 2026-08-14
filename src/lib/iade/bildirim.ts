import type { NoticeStatus, ReturnReason } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  İADE BİLDİRİMİ — DURUM MAKİNESİ (SAF MANTIK)
 * ----------------------------------------------------------------------------
 *  İKİ AŞAMALI AKIŞ (onaylı tasarım):
 *    AŞAMA A — BİLDİRİM. Pazaryeri "müşteri iade istiyor" der; mal daha
 *      yolda. KÂR ETKİSİ YOKTUR: ciro düşmez, komisyon dönmez, stok
 *      hareketi yazılmaz. Bu yüzden bildirimin `profitStatus`'ü de yoktur
 *      ve "kârı hesaplanamayan" sayacına DÜŞMEZ.
 *    AŞAMA B — İADE. Mal gelip hüküm verilince `Return` doğar; ledger ve
 *      kâr etkisi ancak burada işler.
 *
 *  NEDEN AYRI: bildirimi iade saymak, henüz olmamış bir gelir kaybını
 *  bugünün kârından düşmek olurdu. Müşteri vazgeçebilir (IPTAL), itiraz
 *  kazanılabilir (ITIRAZ_KABUL) — ikisinde de iade HİÇ doğmaz.
 *
 *  Veritabanına GİTMEZ; `rma:dogrula` bunu veri olmadan sınıyor.
 * ============================================================================
 */

/**
 * İZİNLİ GEÇİŞLER. Listede olmayan geçiş REDDEDİLİR.
 *
 * Serbest bırakılsaydı "kapanmış bildirimi tekrar açmak" ya da "mal
 * gelmeden iade işlemek" gibi geri alınamaz hatalar mümkün olurdu; ikisi de
 * ledger'a yanlış kayıt yazdırır.
 */
export const IZINLI_GECISLER: Record<NoticeStatus, NoticeStatus[]> = {
  // Mal yolda. Ya gelir, ya müşteri vazgeçer.
  BEKLENIYOR: ["MAL_GELDI", "IPTAL"],
  /**
   * Mal geldi. Üç yol var: iade işlenir (KAPANDI), kullanılmış çıktı ve
   * itiraz açılır, ya da hüküm beklenirken burada durur.
   * İPTAL YOK: mal elimizde, "hiç olmadı" sayılamaz.
   */
  MAL_GELDI: ["ITIRAZ_ACILDI", "KAPANDI"],
  ITIRAZ_ACILDI: ["ITIRAZ_INCELEMEDE", "ITIRAZ_KABUL", "ITIRAZ_RED"],
  ITIRAZ_INCELEMEDE: ["ITIRAZ_KABUL", "ITIRAZ_RED"],
  /**
   * LEHE sonuç: ürün müşteride kalır, para bizde kalır. İade İŞLENMEZ —
   * bu yüzden tek çıkışı KAPANDI ve o kapanışta `Return` doğmaz.
   */
  ITIRAZ_KABUL: ["KAPANDI"],
  /** ALEYHE sonuç: normal iade akışı işler, `Return` doğar. */
  ITIRAZ_RED: ["KAPANDI"],
  // Uç durumlar — buradan çıkış yok.
  KAPANDI: [],
  IPTAL: [],
};

/** Bu geçiş yapılabilir mi? */
export function gecisGecerliMi(
  mevcut: NoticeStatus,
  hedef: NoticeStatus,
): boolean {
  return IZINLI_GECISLER[mevcut].includes(hedef);
}

/** Kapanmış/iptal edilmiş bildirim değiştirilemez. */
export function kapaliMi(durum: NoticeStatus): boolean {
  return IZINLI_GECISLER[durum].length === 0;
}

/**
 * "İADEYİ İŞLE" HANGİ DURUMLARDA AÇIK?
 *
 * MAL_GELDI  — mal elimizde, hüküm verilebilir.
 * ITIRAZ_RED — itiraz kaybedildi, iade işlenecek.
 *
 * BEKLENIYOR'da KAPALI: mal gelmeden iade işlemek, gelmemiş malı stoğa
 * sokmak demek. ITIRAZ_KABUL'de KAPALI: ürün müşteride kaldı, iade YOK —
 * burada düğmeyi açık bırakmak, kazanılmış bir itirazdan sonra ciroyu
 * yanlışlıkla düşürmenin en kolay yolu olurdu.
 */
export const IADE_ISLENEBILIR: NoticeStatus[] = ["MAL_GELDI", "ITIRAZ_RED"];

export function iadeIslenebilirMi(durum: NoticeStatus): boolean {
  return IADE_ISLENEBILIR.includes(durum);
}

/**
 * AYRILMIŞ STOK — HANGİ BİLDİRİMLER SAYILIR?
 *
 * Değişim için ayrılan ürün FİZİKSEL STOKA VE FIFO'YA DOKUNMAZ; bu bir
 * defter kaydı değil, niyet beyanıdır (bkz. şema: `reservedVariantId`).
 * Stok ekranındaki "ayrılmış N adet" rozeti AÇIK bildirimlerden ANLIK
 * toplanır: bildirim kapanınca rozet kendiliğinden düşer ve
 * "rezervasyonu serbest bırakmayı unutma" diye bir iş doğmaz.
 *
 * ITIRAZ_KABUL AÇIK SAYILMAZ: ürün müşteride kaldı, değişim gönderilmiyor.
 */
export const AYRILMIS_SAYILAN_DURUMLAR: NoticeStatus[] = [
  "BEKLENIYOR",
  "MAL_GELDI",
  "ITIRAZ_ACILDI",
  "ITIRAZ_INCELEMEDE",
];

export function ayrilmisSayilirMi(durum: NoticeStatus): boolean {
  return AYRILMIS_SAYILAN_DURUMLAR.includes(durum);
}

/** Varyant başına ayrılmış adet — açık bildirimlerden anlık toplam. */
export function ayrilmisAdetler(
  bildirimler: {
    durum: NoticeStatus;
    reservedVariantId: string | null;
    reservedQuantity: number;
  }[],
): Map<string, number> {
  const toplam = new Map<string, number>();
  for (const b of bildirimler) {
    if (!b.reservedVariantId || b.reservedQuantity <= 0) continue;
    if (!ayrilmisSayilirMi(b.durum)) continue;
    toplam.set(
      b.reservedVariantId,
      (toplam.get(b.reservedVariantId) ?? 0) + b.reservedQuantity,
    );
  }
  return toplam;
}

/**
 * GEREKÇE → DEĞİŞİM ÜRÜNÜ AYRILIR MI?
 *
 * Değişim gerekçelerinde müşteriye yeni ürün gidecek; hangi ürünün
 * ayrıldığı bildirimde beyan edilir (senaryo 1, 2, 6). Diğer gerekçelerde
 * hüküm mal gelince verilir, peşin ayırma yapılmaz.
 */
export const DEGISIM_GEREKCELERI: ReturnReason[] = [
  "DEGISIM",
  "DEGISIM_KUSURLU",
  "YANLIS_URUN",
];

export function degisimAyrilirMi(gerekce: ReturnReason): boolean {
  return DEGISIM_GEREKCELERI.includes(gerekce);
}

/**
 * DÖNEN (YANLIŞ GİDEN) ÜRÜN HANGİ GEREKÇEDE ZORUNLU?
 *
 * Yalnız YANLIS_URUN'da. 6. senaryonun defter düzeltmesi o varyanta yazılır;
 * boş kalırsa iade formu dönen ürünü ön-dolu getiremez ve senaryo hiç
 * kurulamaz — kullanıcı 14.08.2026'da tam buna takıldı ("devam gelmiyor").
 *
 * Diğer gerekçelerde dönen mal satılan malın KENDİSİDİR, sorulmaz.
 */
export function donenUrunZorunluMu(gerekce: ReturnReason): boolean {
  return gerekce === "YANLIS_URUN";
}

/**
 * ---------------------------------------------------------------------------
 *  DURUM GEÇİŞİ ONAY İSTER Mİ?
 * ---------------------------------------------------------------------------
 *  14.08.2026: kullanıcı T4 testinin ortasında "İtiraz açıldı" düğmesine
 *  yanlışlıkla bastı. Bildirim itiraz dalına girdi, "İadeyi işle" kapandı ve
 *  MAL_GELDI'ye DÖNÜŞ YOK — tek tıkla akış değişti, geri alınamadı.
 *
 *  BU DURUM MAKİNESİNDE HİÇBİR GEÇİŞ GERİ ALINAMAZ: `IZINLI_GECISLER`in
 *  hiçbir kenarı geriye gitmez. Dolayısıyla ölçüt "hangisi tehlikeli" değil,
 *  HEPSİ tehlikelidir — İlke #6 gereği hepsi onay ister. Mutlu yoldaki
 *  "Mal geldi" de dahil: gelmemiş malı gelmiş işaretlemek, olmayan malı
 *  stoğa sokmanın kapısıdır.
 *
 *  Fonksiyon bilerek basit ve TEK KAYNAK: ekran da `rma:dogrula` da bunu
 *  çağırır. İleride geri dönüşlü bir geçiş eklenirse istisna BURAYA yazılır.
 */
export function gecisOnayIster(hedef: NoticeStatus): boolean {
  // Bugün istisna yok; imza hedef alıyor ki istisna eklemek tek satır olsun.
  return IZINLI_GECISLER[hedef] !== undefined;
}

/**
 * ---------------------------------------------------------------------------
 *  BİLDİRİM ARAMASI — HANGİ ALANLARDA ARANIR?
 * ---------------------------------------------------------------------------
 *  14.08.2026: kullanıcı bildirimi TALEP NO'sundan (nbkhuj) aramak istedi.
 *  Arama kutusu yoktu; satış açılır listesinde aradı ve bulamadı — orada
 *  hiçbir zaman olmayacaktı, o bir satış kodu değil bildirim kodu.
 *
 *  Kullanıcı elindeki HANGİ kâğıtla gelirse gelsin bulabilmeli: pazaryeri
 *  talep no, sipariş no, ürün SKU'su ya da kendi yazdığı not. Bu yüzden
 *  liste değil SORGU süzülür — en yeni 50'yi istemcide süzmek, 51. kaydı
 *  hiç bulunamaz yapardı.
 *
 *  Alan listesi burada duruyor ki `rma:dogrula` hangi alanların arandığını
 *  DEĞER olarak sınayabilsin; biri sessizce düşerse test kırmızı yanar.
 */
export const BILDIRIM_ARAMA_ALANLARI = [
  "code",
  "note",
  "sale.code",
  "reservedVariant.sku",
  "returnedVariant.sku",
  "reservedVariant.product.name",
  "returnedVariant.product.name",
] as const;

/** Noktalı yolu iç içe nesneye çevirir: "sale.code" → { sale: { code: … } } */
function icIceKosul(yol: string, deger: unknown): Record<string, unknown> {
  const parcalar = yol.split(".");
  let sonuc: unknown = deger;
  for (let i = parcalar.length - 1; i >= 0; i--) {
    sonuc = { [parcalar[i]]: sonuc };
  }
  return sonuc as Record<string, unknown>;
}

/**
 * Prisma `where` parçası. Boş aramada BOŞ NESNE döner — "hiçbir şey eşleşmesin"
 * değil, "süzme" demektir; ikisini karıştırmak listeyi sessizce boşaltırdı.
 */
export function bildirimAramaKosulu(arama: string): Record<string, unknown> {
  const q = arama.trim();
  if (q === "") return {};
  return {
    OR: BILDIRIM_ARAMA_ALANLARI.map((yol) =>
      icIceKosul(yol, { contains: q }),
    ),
  };
}

/**
 * ---------------------------------------------------------------------------
 *  BİLDİRİMDEN İADE FORMUNA ÖN-DOLU GEÇİŞ — HANGİ KALEME YAZILIR?
 * ---------------------------------------------------------------------------
 *  Bildirim SATIŞA bağlıdır, satış kalemine değil. Satışta birden fazla kalem
 *  varsa "dönen ürün B" bilgisinin hangi kaleme ait olduğu bildirimden
 *  okunamaz. Eskiden ön-dolu BÜTÜN kalemlere yazılıyordu: iki kalemli bir
 *  satışta B her iki kaleme birden düşer, kullanıcı fark etmezse iki ayrı
 *  defter düzeltmesi doğardı. Sessiz yanlış defter — bu modülün en tehlikeli
 *  hata türü.
 *
 *  ÖLÇÜT SIRASI:
 *    1. Bildirimin AYRILAN varyantıyla eşleşen kalem (6. senaryoda ayrılan
 *       ürün, satılan doğru üründür — yani kalemin kendisi).
 *    2. Eşleşme yoksa ve iade edilebilir TEK kalem varsa, o kalem.
 *    3. Hiçbiri değilse `null` — TAHMİN YAPILMAZ. Ekran bunu söyler ve
 *       kullanıcı doğru kalemde elle seçer.
 *
 *  Birden fazla kalem aynı varyantı taşıyorsa da `null`: "hangisi" sorusunun
 *  cevabı yoktur, atmak zorundayız.
 */
export function onDoluHedefKalem(girdi: {
  kalemler: { saleItemId: string; variantId: string }[];
  ayrilanVaryantId: string | null;
}): string | null {
  const { kalemler, ayrilanVaryantId } = girdi;
  if (kalemler.length === 0) return null;

  if (ayrilanVaryantId) {
    const eslesen = kalemler.filter((k) => k.variantId === ayrilanVaryantId);
    if (eslesen.length === 1) return eslesen[0].saleItemId;
    if (eslesen.length > 1) return null;
  }

  return kalemler.length === 1 ? kalemler[0].saleItemId : null;
}

/**
 * ---------------------------------------------------------------------------
 *  AYIRMA STOK KONTROLÜ
 * ---------------------------------------------------------------------------
 *  Ayırmak = MÜŞTERİYE GÖNDERİLECEK malı taahhüt etmek. Olmayan malı taahhüt
 *  etmek, yapılmamış bir hazırlığı yapılmış göstermektir; stok ekranındaki
 *  "ayrılmış N adet" rozeti de yalancı olur.
 *
 *  14.08.2026: kullanıcı stoğu 0 olan ürünü ayırdı ve rozet çıktı. Ne ekran
 *  ne sunucu engelliyordu.
 *
 *  ÖLÇÜT SERBEST STOK: mevcut − DİĞER açık bildirimlerde ayrılmış. Yalnız
 *  mevcut stoğa bakılsaydı 1 adetlik mal iki bildirime ayrı ayrı taahhüt
 *  edilir ve ikisi de "hazır" görünürdü.
 */
export function serbestStok(mevcutStok: number, zatenAyrilmis: number): number {
  return mevcutStok - zatenAyrilmis;
}

export function ayirmaMumkunMu(girdi: {
  mevcutStok: number;
  zatenAyrilmis: number;
  istenen: number;
}): boolean {
  if (girdi.istenen <= 0) return false;
  return girdi.istenen <= serbestStok(girdi.mevcutStok, girdi.zatenAyrilmis);
}

/**
 * İTİRAZ DALINA GİREBİLİR Mİ?
 *
 * İtiraz, "ürün kullanılmış geldi" iddiasıyla pazaryerine yapılır — yani
 * mal ELİMİZDE olmalı. Bildirim aşamasında (mal yolda) itiraz açmak,
 * görmediğimiz bir malı kullanılmış ilan etmek olurdu.
 */
export function itirazAcilabilirMi(durum: NoticeStatus): boolean {
  return durum === "MAL_GELDI";
}

/**
 * KAPANIŞTA İADE DOĞAR MI?
 *
 * ITIRAZ_KABUL → HAYIR (lehe kapanış, ürün müşteride, kâr etkisi yok).
 * Diğer kapanışlar iade işlendiği için doğar.
 * IPTAL → HAYIR (mal hiç gelmedi).
 */
export function kapanistaIadeDogarMi(oncekiDurum: NoticeStatus): boolean {
  return iadeIslenebilirMi(oncekiDurum);
}

/**
 * "İADEYİ İŞLE" KAPALIYSA SEBEP ANAHTARI — BOŞ KALAMAZ.
 *
 * Mimar kuralı 14.08.2026: kapalı düğme PASİF görünür ve NEDENİ ekranda
 * yazar. Sebep metni sözlükten gelir; burada yalnız ANAHTARI duruyor ki
 * ekran ile kural aynı kaynaktan beslensin.
 *
 * `null` = düğme AÇIK, sebep gerekmez. `Record<NoticeStatus, …>` tipi
 * bilerek dar: şemaya yeni bir durum eklenip sebebi yazılmazsa proje
 * DERLENMEZ — sebepsiz pasif düğme çıkması imkânsız.
 */
export const IADE_ISLE_SEBEP_ANAHTARI: Record<NoticeStatus, string | null> = {
  MAL_GELDI: null,
  ITIRAZ_RED: null,
  BEKLENIYOR: "iadeIsleSebepBekleniyor",
  ITIRAZ_ACILDI: "iadeIsleSebepItirazSuruyor",
  ITIRAZ_INCELEMEDE: "iadeIsleSebepItirazSuruyor",
  ITIRAZ_KABUL: "iadeIsleSebepItirazKabul",
  KAPANDI: "iadeIsleSebepKapandi",
  IPTAL: "iadeIsleSebepIptal",
};
