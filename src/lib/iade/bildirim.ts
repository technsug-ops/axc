import type { NoticeObjectionReason,
  NoticeStatus, ReturnReason } from "@/generated/prisma/enums";

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
  /**
   * "Talep Oluşturulan". Müşteri iade açtı, mal HENÜZ KARGODA DEĞİL.
   * ⚠ `MAL_GELDI` doğrudan da açık: bildirim geç girilmiş olabilir ve
   * operasyoncuyu var olmayan bir ara adıma zorlamak, sırf model güzel
   * görünsün diye fazladan tık demektir (İlke #9).
   */
  BEKLENIYOR: ["KARGOYA_VERILDI", "MAL_GELDI", "IPTAL", "ASKIDA"],
  /** "Kargoya Verilen": mal yolda. Müşteri 7 gün vermezse pazaryeri iptal eder. */
  KARGOYA_VERILDI: ["MAL_GELDI", "IPTAL", "ASKIDA"],
  /**
   * "Aksiyon Bekleyen": mal elimizde. Üç yol — onayla (KAPANDI), reddet
   * (ITIRAZ_ACILDI), ya da iade akıştan çıkar (ASKIDA).
   * İPTAL YOK: mal elimizde, "hiç olmadı" sayılamaz.
   */
  MAL_GELDI: ["ITIRAZ_ACILDI", "KAPANDI", "ASKIDA"],
  /** "İhtilaflı": pazaryeri inceliyor. ANALIZ kararını PAZARYERİ verir. */
  ITIRAZ_ACILDI: [
    "ITIRAZ_INCELEMEDE",
    "ITIRAZ_KABUL",
    "ITIRAZ_RED",
    "ANALIZ",
    "ASKIDA",
  ],
  ITIRAZ_INCELEMEDE: ["ITIRAZ_KABUL", "ITIRAZ_RED", "ANALIZ", "ASKIDA"],
  /**
   * "Analiz": ürün serviste, 28 gün. Sonuç ne olursa olsun iki kapıdan
   * birine gider — geri gönderilir (ITIRAZ_KABUL) ya da iade onaylanır
   * (ITIRAZ_RED). Doğrudan KAPANDI yok: her iki hâlde de yapılacak bir iş
   * kalıyor ve o iş kendi durumunda görünmeli.
   */
  ANALIZ: ["ITIRAZ_KABUL", "ITIRAZ_RED", "ASKIDA"],
  /**
   * "Reddedilen" — satıcı haklı bulundu. ⚠ BU BİR KAPANIŞ DEĞİL, İŞ
   * BAŞLANGICI: kargo kodu alınır, ürün 2 iş günü içinde müşteriye geri
   * gönderilir. Kapanış o gönderim yapılınca yazılır.
   */
  ITIRAZ_KABUL: ["KAPANDI", "ASKIDA"],
  /** İtirazımız reddedildi → normal iade akışı işler, `Return` doğar. */
  ITIRAZ_RED: ["KAPANDI", "ASKIDA"],
  /**
   * "Askıda İadeler": iade normal akıştan ÇIKTI (kargo problemi, statü
   * uyumsuzluğu, pazaryerinin ek incelemesi). Bizim seçtiğimiz bir durum
   * değil, iadenin BAŞINA GELEN bir durum.
   *
   * ⚠ TEK GERİ DÖNÜŞLÜ DURUM BUDUR ve bilerek öyle. Arıza çözülünce iade
   * kaldığı yerden devam eder; ileri bir kapıya zorlamak, çözülmüş bir
   * iadeyi yanlış duruma sokardı. Bu istisna `rma:dogrula`da ADIYLA beyan
   * edilir — "geri dönüş yok" değişmezi onun dışında geçerlidir.
   */
  ASKIDA: ["MAL_GELDI", "ITIRAZ_ACILDI", "KAPANDI", "IPTAL"],
  /**
   * "Kapandı" — iş akışı bitti. TEK ÇIKIŞ: `IPTAL`, ve o bir ilerleme
   * değil bir DÜZELTMEDİR (K39, 24.08.2026).
   *
   * ⚠ NİYE AÇILDI: `11473322212` üstünde test denemelerinden bildirimler
   * birikti; `KAPANDI`nın hiçbir çıkışı olmadığı için düzeltilemiyorlardı
   * ve test artığının kırmızı _"ayrılan ürün düşülmedi"_ uyarısı gerçek
   * uyarının değerini düşürüyordu.
   *
   * ⚠ MİMAR KARARI: "test" İŞARETİ KONMAZ — _"ikinci doğruluk kanalı
   * açılmaz; durum tek dildir, kayıt gerçeği değiştiyse DURUMU değişir."_
   * Bu yüzden geçiş ayrı bir bayrak değil, durum makinesinin kendisinde.
   *
   * ⚠ AMA NORMAL GEÇİŞ YOLUNDAN GİTMEZ: `durumDegistir` kapalı bildirimi
   * reddediyor ve öyle KALMALI — o kapı gevşerse kapanmış her bildirim
   * keyfî geçişlere açılır. Düzeltme kendi dar eylemine bağlı ve
   * `bildirimIptalEdilebilirMi` ile korunuyor.
   */
  KAPANDI: ["IPTAL"],
  IPTAL: [],
};

/**
 * UÇ DURUMLAR — iş akışının bittiği yerler.
 *
 * ⚠ ARTIK GEÇİŞ LİSTESİNDEN TÜRETİLMİYOR (24.08.2026). `kapaliMi` eskiden
 * _"ileri geçişi kalmamış"_ demekti ve bu ikisi TESADÜFEN aynı şeydi.
 * `KAPANDI`ya düzeltme çıkışı eklenince tesadüf bozuldu: türetilmiş hâlde
 * `kapaliMi("KAPANDI")` **false** dönerdi ve bunun iki sessiz sonucu olurdu —
 *   ① `ACIK_BILDIRIM_DURUMLARI` KAPANDI'yı içine alır, panel çanı kapanmış
 *      her bildirimi "bekleyen iş" diye sayardı;
 *   ② `durumDegistir`in kapalı-bildirim kapısı açılırdı.
 * İkisi de ekranda hata vermeden yanlış çalışırdı. Ölçüt artık AÇIKÇA
 * yazılı: kapalı olmak, çıkışı olmamak değildir.
 */
export const UC_DURUMLAR: readonly NoticeStatus[] = ["KAPANDI", "IPTAL"];

/** Bu geçiş yapılabilir mi? */
export function gecisGecerliMi(
  mevcut: NoticeStatus,
  hedef: NoticeStatus,
): boolean {
  return IZINLI_GECISLER[mevcut].includes(hedef);
}

/** Kapanmış/iptal edilmiş bildirim NORMAL akışta değiştirilemez. */
export function kapaliMi(durum: NoticeStatus): boolean {
  return UC_DURUMLAR.includes(durum);
}

/**
 * ============================================================================
 *  K39 — KAPANMIŞ BİLDİRİM İPTAL EDİLEBİLİR Mİ? (24.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ ÖLÇÜT "HANGİ İLKEYİ ÇİĞNER" DEĞİL, "HANGİ VERİYİ BOZAR".
 *  `returnId` DOLUYSA arkasında işlenmiş bir iade var: stok hareketleri
 *  yazılmış, kesinti dökümü üretilmiş, NET damgası değişmiş. Bildirimi iptal
 *  etmek o iadeyi SAHİPSİZ bırakır — iade yaşamaya devam eder, doğuran
 *  bildirim "hiç olmadı" der. Bozulan şey bir ilke değil, defterin kendisi.
 *
 *  ⚠ İPTAL, İADEYİ GERİ ALMAZ. Bu geçiş yalnız BİLDİRİMİ düzeltir; para ya
 *  da stok tarafında hiçbir şeye dokunmaz. İşlenmiş bir iadeyi geri almak
 *  ayrı bir iştir ve bu kapıdan yapılamaz.
 * ============================================================================
 */
export function bildirimIptalEdilebilirMi(bildirim: {
  status: NoticeStatus;
  returnId: string | null;
}): boolean {
  if (!gecisGecerliMi(bildirim.status, "IPTAL")) return false;
  /** Yalnız KAPANDI'dan gelen iptal düzeltmedir; ötekiler normal akış. */
  if (bildirim.status !== "KAPANDI") return false;
  return bildirim.returnId === null;
}

/** İptal gerekçesi — boş geçilemez, üç ay sonra "bu neden böyle"nin cevabı. */
export const IPTAL_GEREKCESI_ENAZ = 10;
export function iptalGerekcesiGecerliMi(gerekce: string): boolean {
  return gerekce.trim().length >= IPTAL_GEREKCESI_ENAZ;
}
export const BILDIRIM_IPTAL_EYLEMI = "BILDIRIM_KAPANDI_IPTAL";

/**
 * ============================================================================
 *  AÇIK BİLDİRİM — İŞ BİTMEMİŞ OLANLAR
 * ----------------------------------------------------------------------------
 *  ⚠ BU LİSTE 22.08.2026'DA DOĞDU, ÇÜNKÜ YERİNE ÖDÜNÇ BİR LİSTE
 *  KULLANILIYORDU. Panelin görev kutusu ve iade ekranındaki "bekleyen"
 *  rozeti `AYRILMIS_SAYILAN_DURUMLAR` ile sayıyordu — oysa o liste
 *  DEĞİŞİM İÇİN AYRILAN STOĞU ölçmek için yazılmıştı ve `ITIRAZ_KABUL` ile
 *  `ITIRAZ_RED`'i bilerek dışarıda bırakıyor.
 *
 *  Sonuç: `ITIRAZ_RED` durumundaki bir bildirim — yani **itirazı
 *  kaybettiğimiz, iadeyi İŞLEMEMİZ GEREKEN** kayıt — ne panelde ne iade
 *  ekranında bekleyen sayılıyordu. `IADE_ISLENEBILIR` tam o durumda
 *  düğmeyi AÇIK çiziyor; yani sistem bir yandan "bunu işle" diyor, öbür
 *  yandan onu bekleyen işlerden saymıyordu.
 *
 *  Panelin kendi yorumu zaten doğruyu yazıyordu — _"kapanmış/iptal olan
 *  sayılmaz"_ — uygulaması ondan dardı. Ölçüt artık DURUM MAKİNESİNİN
 *  KENDİSİNDEN türüyor: çıkışı olmayan durum kapalıdır, geri kalanı açık.
 *
 *  ⚠ TÜRETİLİYOR, ELLE YAZILMIYOR. Yarın yeni bir durum eklendiğinde bu
 *  liste kendiliğinden doğru olur; elle tutulan bir liste, tam bugün
 *  düzeltilen hatayı bir kat yukarıda tekrar üretirdi.
 * ============================================================================
 */
export const ACIK_BILDIRIM_DURUMLARI: NoticeStatus[] = (
  Object.keys(IZINLI_GECISLER) as NoticeStatus[]
).filter((durum) => !kapaliMi(durum));

/**
 * "İADEYİ İŞLE" HANGİ DURUMLARDA AÇIK?
 *
 * MAL_GELDI  — mal elimizde, hüküm verilebilir.
 * ITIRAZ_RED — itiraz kaybedildi, iade işlenecek.
 *
 * BEKLENIYOR'da KAPALI: mal gelmeden iade işlemek, gelmemiş malı stoğa
 * sokmak demek. ITIRAZ_KABUL'de KAPALI: itirazı kazandık, iade DOĞMAZ —
 * burada düğmeyi açık bırakmak, kazanılmış bir itirazdan sonra ciroyu
 * yanlışlıkla düşürmenin en kolay yolu olurdu.
 *
 * ⚠ GEREKÇE DÜZELTİLDİ 23.08.2026 — eskiden burada _"ürün müşteride kaldı"_
 * yazıyordu ve bu OLGUSAL OLARAK YANLIŞTI: ürün "Aksiyon Bekleyen"
 * aşamasında bize geldi, elimizde. Kazanılan itirazdan sonra kargo koduyla
 * müşteriye GERİ GÖNDERİLİYOR (docs/iade-sureci.md §5). Hüküm aynı kalıyor
 * (iade işlenmez), sebebi düzeldi.
 */
export const IADE_ISLENEBILIR: NoticeStatus[] = ["MAL_GELDI", "ITIRAZ_RED"];

/**
 * ⚠ İKİ İSTİSNA EKLENDİ 23.08.2026 — KULLANICI BİLDİRDİ, ÖLÇÜMLE DOĞRULANDI.
 *
 * Kullanıcı: _"değişim için bir ürün seçtim, onu kargolayıp yolladım,
 * bildirimi de kapattım ama değişim için seçtiğim ürünün stoğu aynı kaldı."_
 *
 * SEBEP: `EXCHANGE_OUT` hareketini YALNIZ AŞAMA B (`iadeKaydet`) yazıyor ve
 * AŞAMA B bu durumlardan ERİŞİLEMİYORDU. Ayırma bir NİYET BEYANIDIR —
 * fiziksel stoğa dokunmaz — ama niyetin gerçekleştiği an hiçbir yerde
 * kaydedilmiyordu; ürün depodan çıkıyor, defter bunu hiç öğrenmiyordu.
 *
 * ÖLÇÜLDÜ (canlı, 23.08.2026): ayrılan ürünü olan 6 bildirimden İKİSİ
 * kapanmış ve iadesi hiç işlenmemiş (`11473322212` · `11504122276`);
 * canlıda toplam `EXCHANGE_OUT` hareketi 1.
 *
 * İSTİSNA 1 — `ITIRAZ_KABUL` + gerekçe `DEGISIM`: itirazı kazandık ama
 * "değişim yapacağım" dedik, yani müşteriye YENİ ürün gidiyor. O ürün
 * depodan fiziksel olarak çıkar ve `EXCHANGE_OUT` yazılmak ZORUNDADIR.
 * ⚠ Öteki `ITIRAZ_KABUL` yolları KAPALI kalıyor (satıcı haklı / analiz
 * bitti): oralarda geri giden AYNI üründür, stoğumuza hiç girmemiştir ve
 * çıkışı da yoktur. Düğmeyi hepsine açmak, kazanılmış bir itirazdan sonra
 * ciroyu yanlışlıkla düşürmenin en kolay yolu olurdu.
 *
 * İSTİSNA 2 — `KAPANDI` ama AYRILAN ÜRÜN HİÇ DÜŞMEMİŞ: dosya kapanmış
 * görünüyor ama aslında bitmemiştir. Eksik hareketi yazmak defteri BOZMAZ,
 * DÜZELTİR. ⚠ Kapsam dar tutuldu: yalnız ayrılmış ve düşmemiş kayıt;
 * "kapanmış her bildirim işlenebilir" deseydik, hiçbir şeyin kıpırdamaması
 * gereken kapanışlarda ciro sessizce bozulabilirdi.
 */
export function iadeIslenebilirMi(
  durum: NoticeStatus,
  ek?: {
    /** Satıcının itiraz gerekçesi — `DEGISIM` ise YENİ ürün çıkıyor. */
    itirazGerekcesi?: NoticeObjectionReason | null;
    /** Ayrılan ürün var ve henüz stoktan düşülmedi. */
    ayrilmisBekliyor?: boolean;
  },
): boolean {
  if (IADE_ISLENEBILIR.includes(durum)) return true;
  if (durum === "ITIRAZ_KABUL" && ek?.itirazGerekcesi === "DEGISIM") return true;
  if (durum === "KAPANDI" && ek?.ayrilmisBekliyor === true) return true;
  return false;
}

/**
 * AYRILAN ÜRÜN DÜŞMEYİ BEKLİYOR MU — sessiz kaybın tek ölçütü.
 *
 * ⚠ İKİ ŞART BİRDEN: ayrılmış bir ürün VAR ve iade HİÇ işlenmemiş
 * (`returnId` boş). Yalnız birine bakmak yanlış olurdu — ayrılmamış bir
 * kayıtta beklenecek bir şey yok, işlenmiş bir kayıtta hareket zaten yazıldı.
 */
export function ayrilmisDusmeyiBekliyor(bildirim: {
  reservedVariantId: string | null;
  reservedQuantity: number;
  returnId: string | null;
}): boolean {
  return (
    bildirim.reservedVariantId !== null &&
    bildirim.reservedQuantity > 0 &&
    bildirim.returnId === null
  );
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
 * ITIRAZ_KABUL AÇIK SAYILMAZ: itiraz kazanıldı, değişim gönderilmiyor.
 *
 * ⚠ GEREKÇE DÜZELTİLDİ 23.08.2026 — eskiden _"ürün müşteride kaldı"_
 * yazıyordu, YANLIŞTI (ürün bizde, geri gönderilecek). Sonuç değişmedi:
 * geri giden ürün stoktan AYRILAN bir ürün değil, iadenin kendisidir —
 * bu yüzden "ayrılmış" sayacına girmez.
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
  /* Mal yolda — gelmemiş malı stoğa sokmak, olmayan bir girişi yazmaktır. */
  KARGOYA_VERILDI: "iadeIsleSebepBekleniyor",
  ITIRAZ_ACILDI: "iadeIsleSebepItirazSuruyor",
  ITIRAZ_INCELEMEDE: "iadeIsleSebepItirazSuruyor",
  /* Ürün serviste; hüküm analiz bitmeden verilemez. */
  ANALIZ: "iadeIsleSebepAnaliz",
  ITIRAZ_KABUL: "iadeIsleSebepItirazKabul",
  /* Akıştan çıkmış iade üzerinde defter işlemi yapılmaz — önce arıza çözülür. */
  ASKIDA: "iadeIsleSebepAskida",
  KAPANDI: "iadeIsleSebepKapandi",
  IPTAL: "iadeIsleSebepIptal",
};

/**
 * ============================================================================
 *  RET GEREKÇESİ VE ANALİZ SONUCU — HANGİ GEÇİŞTE SORULUR (K31 ④)
 * ----------------------------------------------------------------------------
 *  Kaynak: `docs/iade-sureci.md` §4 ve §6, kullanıcı anlatımı `(K)`.
 * ============================================================================
 */

/**
 * RET GEREKÇESİ ZORUNLUDUR — ÇÜNKÜ PAZARYERİ DE ZORUNLU TUTUYOR.
 *
 * `(K)`: _"Reddet seçilince açılan liste... seçeneklerinden uygun olanı
 * seçer, delillerini yükleyerek itiraz eder. Bu iade satıcının itiraz
 * etmesiyle İhtilaflı sekmesine taşınır."_ Yani gerekçesiz bir itiraz
 * pazaryerinde de kurulamıyor; bizim kaydımızda kurulabilseydi defterimiz
 * pazaryerinden daha az şey bilirdi.
 *
 * ⚠ VE GEREKÇE MALİYET TARAFINI BELİRLİYOR: `DEGISIM` (E) seçilirse geri
 * giden YENİ üründür ve kargo HER KANALDA satıcıya aittir; satıcı haklı
 * bulunduğunda ise Trendyol kargoyu yansıtmaz (§5). Aynı durumun iki farklı
 * parası var ve ayıran şey bu alan.
 */
export function itirazGerekcesiGerekliMi(hedef: NoticeStatus): boolean {
  return hedef === "ITIRAZ_ACILDI";
}

/**
 * ANALİZ SONUCU SORULUR AMA ZORUNLU DEĞİL.
 *
 * ⚠ ZORUNLU TUTULMADI VE BU ÖLÇÜLMEMİŞLİĞİN SONUCU: pazaryerinin bu alanı
 * zorunlu tutup tutmadığını GÖRMEDİK. Zorunlu kılsaydık, ölçmediğimiz bir
 * kuralı operasyoncuya dayatmış olurduk — ve süresi dolmak üzere olan bir
 * kaydı kapatamayan kullanıcı, sistemi bırakıp pazaryeri panelinden işini
 * görürdü. Sorulur, boş geçilebilir, sonradan yazılabilir.
 */
export function analizSonucuIstenirMi(mevcut: NoticeStatus): boolean {
  return mevcut === "ANALIZ";
}

/**
 * ============================================================================
 *  AYNI SATIŞA KAÇ BİLDİRİM AÇILABİLİR (K31 ek)
 * ----------------------------------------------------------------------------
 *  Kullanıcı 23.08.2026: _"Aynı ürünü müşteri 3 defa iade edebiliyor, ben
 *  şimdi aynı iadeyi seçip seçip duruyorum, 3'ten sonra seçtirmemeli."_
 *
 *  ⚠ ÖNCE "SATILAN ADET" HİPOTEZİ DENENDİ VE VERİ ONU ÇÜRÜTTÜ. Sınırın
 *  satılan adet olması en doğal türetmeydi (satılandan fazlası iade
 *  edilemez); canlı ölçüm bunu reddetti — bildirimi olan 8 satışın HEPSİ
 *  1 adetlik ve DÖRDÜ birden fazla bildirim taşıyor:
 *
 *      satılan 1 · bildirim 2  → 11473322212, 11502693455
 *      satılan 1 · bildirim 3  → 11504122276, 11467064391
 *
 *  Yani müşteri aynı TEK ürün için birden çok iade talebi açabiliyor; adet
 *  sınırı koysaydık BUGÜN VAR OLAN gerçek kayıtları engellemiş olurduk.
 *
 *  ⚠ TAVANIN KAYNAĞI: kullanıcı beyanı `(K)` — rozet **BEYAN**, pazaryeri
 *  belgesiyle doğrulanmadı. Canlı veri beyanla TUTARLI (n=8 satış, 14
 *  bildirim; gözlenen en yüksek değer 3 ve iki satış tam 3'te). Tutarlılık
 *  doğruluk değildir ama tavanı bugün hiçbir kayıt AŞMIYOR — yani kural
 *  geçmişi bozmuyor. Pazaryeri belgesi geldiğinde bu sayı deftere geçer.
 * ============================================================================
 */
export const BILDIRIM_TAVANI = 3;

/**
 * ⚠ İPTAL EDİLMİŞ BİLDİRİM DE SAYILIR. Tavan "kaç iade TALEBİ açılabilir"
 * sorusunun cevabı; iptal olmuş bir talep de açılmış bir taleptir. Saymamak,
 * iptal edip yeniden açarak tavanı sınırsız aşmanın yolunu bırakırdı.
 */
export function bildirimTavaniDoldu(mevcutSayi: number): boolean {
  return mevcutSayi >= BILDIRIM_TAVANI;
}

/**
 * SATICI "DEĞİŞİM YAPACAĞIM" DERSE DEĞİŞİM ÜRÜNÜ SORULUR.
 *
 * Kullanıcı 23.08.2026: _"itiraz seçeneklerinden değişimi seçiyorum, sonra
 * değişim ürünü seçin demesi lazım."_
 *
 * ⚠ MÜŞTERİNİN GEREKÇESİNDEN AYRI BİR KAPI. `degisimAyrilirMi` MÜŞTERİNİN
 * iade sebebine bakar (bildirim açılırken); bu ise SATICININ itiraz
 * gerekçesine bakar (itiraz açılırken). Aynı fiziksel iş — müşteriye YENİ
 * ürün gidecek — ama akışın iki farklı anında doğuyor ve ikisi de olabilir:
 * müşteri "daha ucuz buldum" der (değişim değil), biz "değişim yapacağım"
 * diye itiraz ederiz.
 *
 * ⚠ VE BU KARARIN PARASI VAR (docs §5): değişimde geri giden YENİ üründür ve
 * kargo HER KANALDA satıcıya aittir.
 */
export function itirazDegisimUrunuIster(
  gerekce: NoticeObjectionReason,
): boolean {
  return gerekce === "DEGISIM";
}

/** `AuditLog.action` — tavan aşılarak kaydedilen bildirimin izi. */
export const TAVAN_ISTISNASI_EYLEMI = "IADE_TAVAN_ISTISNASI";

/** `AuditLog.action` — değişim ürününün gönderildiği izi. */
export const DEGISIM_GONDERILDI_EYLEMI = "IADE_DEGISIM_GONDERILDI";

/**
 * DEĞİŞİM ÜRÜNÜ GÖNDERİLEBİLİR Mİ (K37).
 *
 * ⚠ NİYE AYRI BİR YOL — VE NİYE İADE FORMU DEĞİL. Değişimde giden ürün bir
 * İADE DEĞİL, bir ÇIKIŞTIR. İade formu "bu satıştan kaç adet daha iade
 * edilebilir" diye soruyor; satışın iade hakkı dolduğunda form
 * _"Tamamı iade edildi"_ deyip kapanıyor ve iadeyle hiç ilgisi olmayan bir
 * stok çıkışı kaydedilemiyor. Kullanıcı 23.08.2026'da bu duvara İKİ ayrı
 * satışta çarptı (`11473322212`, `11467064391`).
 *
 * ⚠ ÜÇ ŞART BİRDEN:
 *   · ayrılmış bir ürün VAR (gönderilecek mal belli)
 *   · henüz gönderilmemiş (`degisimGonderildi` izi yok)
 *   · bildirim iptal DEĞİL — iptal edilmiş talep için mal çıkmaz
 */
export function degisimGonderilebilirMi(bildirim: {
  status: NoticeStatus;
  reservedVariantId: string | null;
  reservedQuantity: number;
  degisimGonderildiMi: boolean;
}): boolean {
  if (bildirim.status === "IPTAL") return false;
  if (bildirim.degisimGonderildiMi) return false;
  return bildirim.reservedVariantId !== null && bildirim.reservedQuantity > 0;
}
