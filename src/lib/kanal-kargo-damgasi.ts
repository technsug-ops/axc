import { gunHassasiyetliMi, gunMetninden } from "@/lib/donem";

/**
 * ============================================================================
 *  K195 — KANALIN BİLDİRDİĞİ KARGO/TESLİM DAMGASI (SAF)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: kanallar kargo ve teslim anını ZATEN söylüyor, biz atıyorduk.
 *  TY her pakette `packageHistories` veriyor, HB `/shipped` ve `/delivered`
 *  uçlarında `ShippedDate`/`DeliveredDate` veriyor. Bu gövde o iki farklı
 *  biçimi TEK sonuca çeviriyor.
 *
 *  ═══ ⛔ İKİ KANAL, İKİ FARKLI KESİNLİK — VE BU AYRIM KAYBOLMAZ ═══════
 *
 *    TY  `createdDate` = EPOCH MS   → mutlak an, saat dilimi belirsizliği YOK
 *    HB  `ShippedDate` = "2026-09-04T13:58:48"  → DİLİM İŞARETİ YOK
 *
 *  ⚠ HB'nin dizesi ölçülen bir tehlikedir, teorik değil (09.09.2026):
 *
 *      gercek an (Istanbul)    2026-09-04T10:58:48Z
 *      new Date() bu makinede  2026-09-04T11:58:48Z   ← 1 saat ERKEN
 *      new Date() Vercel'de    2026-09-04T13:58:48Z   ← 3 saat ERKEN
 *
 *  Geliştirme makinesi `Europe/Berlin` (+2), üretim Vercel `UTC`, iş ise
 *  `Europe/Istanbul` (+3). Yani `new Date(dize)` **koştuğu yere göre farklı
 *  bir an** üretir ve hiçbir hata vermez.
 *  _(Anayasa: "çalışma ortamının saat dilimi ASLA kullanılmaz" — ve
 *  "iç tutarlılık kaymayı gizler": bütün kayıtlar aynı miktarda kaydığı
 *  için hiçbir iç kontrol kırmızı yanmaz.)_
 *
 *  ⭐ KULLANICI KARARI 09.09.2026 — (c): HB'de SAAT HASSASİYETİNDEN VAZGEÇ,
 *  yalnız GÜNÜ kullan. Belirsizlik böylece ortadan kalkar.
 *  ⛔ VE DOĞRU UYGULAMASI DİZEDEN KESMEKTİR: gün, `Date` KURULMADAN
 *  dizeden alınır. Önce `new Date()` yapıp sonra gününü okumak, kaymış bir
 *  andan gün okumak olurdu — 00:30 ya da 23:30 gibi bir damgada GÜN de
 *  kayardı.
 *
 *  ⚠ KESİNLİK KAYBOLMUYOR, İŞARETLENİYOR: gün hassasiyetli damga tam gün
 *  sınırına düşüyor ve `gunHassasiyetliMi` ile ayırt edilebiliyor. Okuyan
 *  "bu saat gerçek mi" sorusunu sorabilir — depoda zaten var olan bir
 *  mekanizma, ikinci bir gövde yazılmadı.
 * ============================================================================
 */

export type KargoDamgasi =
  /** Kesin an — epoch ms'ten geldi, saat güvenilir. */
  | { tur: "AN"; an: Date }
  /** Yalnız gün — saat bilinmiyor, damga gün sınırında. */
  | { tur: "GUN"; an: Date }
  /** Kanal bu paket için bir şey söylemedi. */
  | { tur: "YOK" };

export type PaketGecmisi = { createdDate?: unknown; status?: unknown };

/**
 * PAKET GEÇMİŞİNDEN İSTENEN DURUMUN ANI — TY **ve** N11.
 *
 * ⚠ ADI ÖNCE `tyKargoDamgasi` İDİ VE BU YANLIŞ BİR İDDİAYDI (09.09.2026):
 * N11'in geçmiş şekli ÖLÇÜLDÜ ve TY ile **birebir aynı** çıktı —
 * `{ createdDate: epoch ms, status }`, durumlar `Shipped`/`Delivered`.
 * Kanal adı taşıyan bir gövdeyi ikinci kanalın çağırması, okuyana "burada
 * TY'ye özel bir şey var" dedirtirdi. _(Anayasa: "ad bir iddiadır".)_
 *
 * ⚠ EN SONUNCUSU ALINIR: bir paket iptal edilip yeniden kargolanabilir ve
 * geçmişte aynı durum İKİ KEZ geçebilir. İlkini almak "ilk denemede
 * kargolandı" der; doğrusu son geçerli olandır.
 */
export function gecmistenKargoDamgasi(
  gecmis: PaketGecmisi[] | null | undefined,
  durum: "Shipped" | "Delivered",
): KargoDamgasi {
  if (!Array.isArray(gecmis)) return { tur: "YOK" };
  let enSon: number | null = null;
  for (const h of gecmis) {
    if (h.status !== durum) continue;
    const ms = h.createdDate;
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) continue;
    if (enSon === null || ms > enSon) enSon = ms;
  }
  if (enSon === null) return { tur: "YOK" };
  return { tur: "AN", an: new Date(enSon) };
}

/**
 * HB — `"2026-09-04T13:58:48"` gibi DİLİMSİZ bir dizeden YALNIZ GÜN.
 *
 * ⛔ `new Date(dize)` ÇAĞRILMAZ. Gün dizenin ilk 10 hanesinden kesilir ve
 * `gunMetninden` ile gün sınırına oturtulur — sonuç ortamdan bağımsızdır.
 */
export function hbKargoDamgasi(dize: unknown): KargoDamgasi {
  if (typeof dize !== "string" || dize.length < 10) return { tur: "YOK" };
  const gun = gunMetninden(dize.slice(0, 10));
  if (gun === null) return { tur: "YOK" };
  return { tur: "GUN", an: gun };
}

/**
 * Damga gün hassasiyetli mi — okuyucular için.
 *
 * ⚠ TEK KUSURU BEYAN EDİLİYOR: tam gün sınırına düşen bir KESİN an da
 * "gün hassasiyetli" görünür (86,4 milyonda bir). Bu gövde o ayrımı
 * damganın KENDİ türünden okur, zamanından değil — yanılma payı yok.
 */
export function damgaGunHassasiyetli(d: KargoDamgasi): boolean {
  return d.tur === "GUN";
}

/** Depodan okunan bir tarih gün hassasiyetli mi (tür bilgisi yokken). */
export function tarihGunHassasiyetli(tarih: Date): boolean {
  return gunHassasiyetliMi(tarih);
}
