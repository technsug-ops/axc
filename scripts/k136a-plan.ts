/**
 * ============================================================================
 *  K136a — YAZIM PLANININ VERİSİ · YAN ETKİSİZ MODÜL
 * ----------------------------------------------------------------------------
 *  ⛔ BU DOSYA HİÇBİR ŞEY ÇALIŞTIRMAZ. `main()` yok, `console` yok, sorgu
 *  yok. Yalnız veri ve saf gövde.
 *
 *  ── NİYE AYRI DOSYA ─────────────────────────────────────────────────────
 *  Plan ve yazım aynı listeyi kullanmak ZORUNDA — iki kopya olsaydı biri
 *  güncellenip öteki unutulur, kuru koşum bir şeyi gösterip yazım başka
 *  şeyi yazardı. Ama liste önce `canli-iade-yazim-plani.ts` içindeydi ve
 *  o dosya en altında `main()` çağırıyor: yazım betiği listeyi İÇE
 *  AKTARINCA plan betiği KENDİLİĞİNDEN KOŞTU.
 *
 *  ⚠ Yakalanmasının tek sebebi yazımı önce RAPOR kipinde koşmam oldu;
 *  doğrudan `--uygula` deseydim iki betik iç içe çalışacaktı.
 *  _(Anayasa: "kritik yazım, yazıldığı doğrulanmadan yapılmış sayılmaz" —
 *  burada koşumun KİMİN koşumu olduğu doğrulanmamıştı.)_
 * ============================================================================
 */

/**
 * HALİL'İN ONAYLADIĞI KÜME — 8 sipariş, kimliğe kilitli.
 *
 * ⭐ KAYNAK ÖNCELİĞİ (Halil, 02.09): pazaryeri API > ekstre > beyan.
 * TY claims ucu ölçüldü (`canli:ty-claims-olcum`): sebep alanı VAR
 * (`customerClaimItemReason.code`/`.name`) ve üç TY siparişinde de beyanla
 * **sebep VE tarih birlikte** tuttu (3/3, `Accepted` kayıt üzerinden).
 * HB'de API kapısı açılmadı → o beş siparişte beyan TEK kaynak.
 *
 * ⚠ SEBEP METNİ ÇEVRİLMEZ, KISALTILMAZ: kaynağın yazdığı gibi durur.
 * TY satırlarında pazaryerinin kanonik etiketi, HB satırlarında Halil'in
 * kendi cümlesi.
 * _(Anayasa: "veritabanına yazılan veri ÇEVRİLMEZ".)_
 */
export const PLAN: {
  siparis: string;
  sebep: string;
  kaynak: "ty-claims" | "halil-beyani-0209";
  /** İade tarihi — İstanbul günü. TY'de claims `lastModifiedDate` ile aynı. */
  tarih: string;
}[] = [
  { siparis: "4068972350", sebep: "Yanlış sipariş verdim seçeneğinden iade", kaynak: "halil-beyani-0209", tarih: "2026-06-09" },
  { siparis: "4287210000", sebep: "Yanlış sipariş verdim seçeneğinden iade", kaynak: "halil-beyani-0209", tarih: "2026-07-03" },
  { siparis: "4446089356", sebep: "Yanlış sipariş verdim seçeneğinden iade", kaynak: "halil-beyani-0209", tarih: "2026-06-05" },
  { siparis: "4586626981", sebep: "Yanlış sipariş verdim seçeneğinden iade", kaynak: "halil-beyani-0209", tarih: "2026-07-20" },
  { siparis: "4903455009", sebep: "Küçük geldi seçeneğinden iade", kaynak: "halil-beyani-0209", tarih: "2026-06-29" },
  { siparis: "11385159467", sebep: "Yanlış sipariş verdim", kaynak: "ty-claims", tarih: "2026-07-22" },
  { siparis: "11409234590", sebep: "Beğenmedim", kaynak: "ty-claims", tarih: "2026-07-29" },
  { siparis: "11438301199", sebep: "Yanlış sipariş verdim", kaynak: "ty-claims", tarih: "2026-08-10" },
];

/**
 * ⭐ NOT BİÇİMİ — HALİL'İN KURDUĞU KALIP (02.09.2026), BİREBİR.
 *
 * Sebep `Return.note`a yazılır; `ReturnReason` enum'u GENİŞLETİLMEZ
 * (uyur-kalem, açılış şartı panoda). Biçim kurallı olduğu için ileride
 * nottan **deterministik türetme** yapılabilir — o gün türetme + migration
 * birlikte gider.
 */
export function notMetni(p: { sebep: string; kaynak: string }): string {
  return `IADE_SEBEP[kaynak:${p.kaynak}]: «${p.sebep}»`;
}

/**
 * ⭐ TÜR TÜRETMESİ — KOD KOD, TAHMİN YOK.
 *
 * `iade-sureci §5`: `KARGO_IADE` satırı DÖNÜŞ kargosunun satıcıya
 * kesildiğini gösterir → mal müşteriye ULAŞMIŞ ve GERİ DÖNMÜŞ → `NORMAL`.
 * Kargo satırı yoksa tür ekstreden türetilemez; o hâlde SEBEP konuşur:
 * "Yanlış sipariş verdim" · "Beğenmedim" · "Küçük geldi" üçü de teslimden
 * SONRAKİ müşteri iadesidir (pazaryeri iade formundan), yani `UNDELIVERED`
 * olamaz.
 *
 * ⛔ `DISPUTED` HİÇBİRİNDE YOK: itiraz kazanılmış bir kayıt aranmadı ve
 * bulunmadı; varsayılmıyor, kapsam dışı bırakılıyor.
 */
export const TUR_TURETMESI = [
  { kod: "KARGO_IADE", varsa: "NORMAL", gerekce: "dönüş kargosu satıcıya kesilmiş → mal geri gelmiş" },
  { kod: "IADE_TUTARI", varsa: "NORMAL", gerekce: "sipariş tutarı iade edilmiş; sebep teslim SONRASI müşteri iadesi" },
  { kod: "KOMISYON_IADE", varsa: "NORMAL", gerekce: "komisyon geri gelmiş; tek başına tür vermez, sebep tamamlıyor" },
] as const;
