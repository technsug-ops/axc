/**
 * ============================================================================
 *  "BU KALEM SAYILIR MI" — TEK GÖVDE (K78, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR — VAKA: satış `10559161422` (02.10.2025). İçe aktarma dosyası
 *  aynı satırı İKİ KEZ taşıyordu ve içe aktarıcı sadakatle iki kalem yazdı:
 *
 *      axcali3134  x1 @ 1.039   ← gerçek
 *      axcali3134  x1 @ 1.039   ← AYNI satır, ikinci kez
 *
 *  Halil: _"sadece 1 tanesi yanlış, diğeri doğru."_ Defter bugüne kadar
 *  **₺1.039 hayalet ciro** ve **1 adet hayalet stok çıkışı** taşıdı — ve bu
 *  tarih resmî ölçüm penceresinin (01.08.2025+) İÇİNDE.
 *
 *  ── ⛔ KALDIRMA İADE DEĞİLDİR ───────────────────────────────────────────
 *  Müşteri 3 alıp 1'ini geri gönderdiyse o bir İADEDİR: mal gerçekten
 *  satıldı, para girdi, KDV matrahına girdi, komisyon kesildi ve sonra
 *  düzeltildi. Kaldırmada ise o satır **HİÇ SATILMADI**. İadeyi bu yoldan
 *  geçirmek, olmamış bir alışverişi deftere yazıp sonra geri almak olurdu:
 *  ciro şişer, KDV matrahı şişer, hakediş beklentisi doğar ve hepsi geri
 *  alınır — toplam tutar ama defter YALAN SÖYLER.
 *  ⭐ Kısmi iade zaten çalışıyor (ölçüldü 07.09.2026): `11399165160` satılan
 *  2 · iade 1; ayrıca 3 kalemli satışta tek kalemin iadesi 5 vakada var.
 *  Ayrımı `SatisKalemKaldirmaSebebi` enumu YAPISAL olarak koruyor — listede
 *  müşteri iadesi seçeneği YOK.
 *
 *  ── NİYE AYRI DOSYA — DERS PAHALIYA ALINMIŞTI ───────────────────────────
 *  Ölçüldü (07.09.2026): ciro/adet doğrudan kalemden hesaplayan **20 dosya,
 *  25 yer** var. Elle gezilseydi yarın eklenen 21'inci okuyucu sessizce eski
 *  kuralla kalır ve hayalet ciro orada yaşamaya devam ederdi — `KARGO_BEKLEYEN`
 *  vakasının birebir aynısı (altı okuyucudan beşi eski kuralla kalmıştı).
 *  _(Anayasa: "düzeltmenin çaresi dosya listesi değil, DESEN YASAĞIDIR".)_
 *
 *  ⚠ `iptalTarihi` BİLEREK BURADA DEĞİL: satışın iptali ayrı bir sorudur ve
 *  ekrana göre değişir (iptal ekranı iptalliyi görmek ZORUNDA). Bu gövde tek
 *  bir soruyu cevaplar: _"bu KALEM defterde sayılır mı?"_
 * ============================================================================
 */

/**
 * Prisma `where` parçası. Kullanımı:
 *
 *     where: { ...KALEM_GECERLI }
 *     items: { where: { ...KALEM_GECERLI } }
 *     saleItem: { ...KALEM_GECERLI }
 *
 * ⛔ Kaldırılmış kalemi GÖRMESİ GEREKEN tek yer kaldırma/geri alma ekranıdır;
 * orada bu süzgeç KULLANILMAZ ve kullanılmadığı gerekçesiyle beyan edilir.
 */
export const KALEM_GECERLI = { kaldirildiAt: null } as const;

/**
 * Bellekteki kalem için aynı ölçüt. Sorgu süzgeci ile bu gövde AYNI SORUYU
 * sorar — iki yerde iki farklı ölçüt olsaydı biri sayarken öteki saymazdı.
 */
export function kalemGecerliMi(kalem: { kaldirildiAt: Date | null }): boolean {
  return kalem.kaldirildiAt === null;
}

/**
 * KALDIRMA GERİ ALINABİLİR OLMALI — yanlış tıklama kalıcı olmaz.
 * _(Anayasa: "yıkıcı eylem = onay" ve iptalin geri alma yolu.)_
 */
export function kaldirilmisMi(kalem: { kaldirildiAt: Date | null }): boolean {
  return kalem.kaldirildiAt !== null;
}
