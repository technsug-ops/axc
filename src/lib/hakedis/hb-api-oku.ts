import type { Currency } from "@/generated/prisma/enums";
import { gunDegeri } from "@/lib/donem";

import type { HakedisKodu, HakedisSatiri } from "./model";

/**
 * ============================================================================
 *  HEPSİBURADA "KAYIT BAZLI MUHASEBE SERVİSİ" — SAF HESAP (K221, 19.09.2026)
 * ----------------------------------------------------------------------------
 *  Kaynak: HB Developer Portal → muhasebe-entegrasyonu → "Kayıt Bazlı
 *  Muhasebe Servisi" (kullanıcı BİREBİR yapıştırdı — WebFetch bu siteye
 *  403 döndüğü için TEK kaynak bu; TY'deki "Komisyon Faturası" dersiyle
 *  AYNI ihtiyat: her satır CANLI VERİYLE çapraz ölçüldü, tahmin edilmedi).
 *
 *  ⭐ HB'NİN TY'YE GÖRE İKİ BÜYÜK AVANTAJI (ikisi de ölçüldü):
 *   ① `status: "Paid"|"WillBePaid"` — kanalın KENDİSİ "ödendi mi" diyor.
 *      TY'de bu bilgi hiç yoktu, `paymentOrderId`den dolaylı çıkarmıştık.
 *   ② `amount.value` = mevcut Excel'in "Tutar" sütunuyla KURUŞUNA AYNI
 *      (çapraz ölçüldü 19.09.2026, sipariş 4359042065, 6 farklı kalem
 *      tipinde SIFIR sapma) — okuyucu değişse de rakam değişmiyor.
 *
 *  ⛔ "TotalPayment" YAZILMAZ — ÇAPRAZ ÖLÇÜLDÜ. Bu tip periyodik EKSTRE
 *  TOPLAMIDIR (id `1481-2162485952-2026-001-000000`, tutar −80.473,32,
 *  invoiceDate 25.08.2026) ve gerçek "Ekstreler-20260826951.xlsx" dosyasının
 *  KENDİ toplamıyla (₺80.473,32) kuruşuna eşit. Yazılsaydı, o dönemin TÜM
 *  kalemleri zaten tek tek yazılmışken parayı İKİNCİ KEZ sayardı —
 *  TY'nin "Komisyon Faturası" dersinin birebir kardeşi.
 *
 *  ⭐ EXTERNALID KURALI — ÇAPRAZ ÖLÇÜLDÜ, TAHMİN EDİLMEDİ: Excel'in
 *  "Kayıt No" sütunu `isInvoice` DOĞRUYSA `invoiceNumber`, YANLIŞSA
 *  `packageNumber` taşıyor (6/6 kalemde doğrulandı). Bu kural sayesinde
 *  API'den gelen bir satırın rowKey'i, aynı satırın Excel'den gelmiş
 *  hâliyle BİREBİR aynı çıkıyor — dedup kendiliğinden çalışıyor (TY'deki
 *  "Kayıt No = API id" durumunun HB'deki karşılığı, farklı kural ama aynı
 *  sonuç).
 *
 *  ⚠ HAM TİP TÜRKÇE YAZILIR, İNGİLİZCE DEĞİL: `rowKey` = externalId|
 *  siparişNo|hamTip ve Excel'deki tüm geçmiş kayıtlar TÜRKÇE ham tip
 *  taşıyor (ör. "Komisyon tutarı"). API İngilizce döner ("Commission");
 *  eşleşmesi gereken TÜRKÇE karşılık aşağıdaki tabloda — DB'deki 1048
 *  gerçek kalemin rawType'ı TARANARAK alındı, uydurulmadı.
 * ============================================================================
 */

/** Bu tip yazılmaz — dönemsel ekstre toplamıdır, para ikinci kez sayılır. */
export const HB_API_HARIC_TUTULAN = new Set(["TotalPayment"]);

type Esleme = { kod: HakedisKodu; hamTip: string };

/**
 * ⭐ "ONAYLI" satırlar: gerçek DB verisiyle (rawType) ÇAPRAZ ölçüldü.
 * ⚠ "MAKUL" satırlar: HB'nin kendi açıklama tablosundan İSİM eşleşmesiyle
 * türetildi ama Excel geçmişinde HİÇ görülmedi (çapraz kanıt yok) — kod
 * doğru sayılıyor ama hamTip UYDURULMADI, yalnız İngilizce adın Türkçe
 * karşılığı yazıldı; ilk gerçek örnek geldiğinde gerekirse düzeltilir.
 */
const HB_API_TIP_ESLEME: Record<string, Esleme> = {
  // --- ONAYLI (çapraz ölçüldü, 19.09.2026) ---
  Commission: { kod: "KOMISYON", hamTip: "Komisyon tutarı" },
  Stoppage: { kod: "STOPAJ", hamTip: "MP Stopaj" },
  PaymentServiceCostReflection: { kod: "TAHSILAT_BEDELI", hamTip: "Tahsilat Yönetim Bedeli" },
  Payment: { kod: "SIPARIS_TUTARI", hamTip: "Sipariş tutarı" },
  ShipmentCostSharingExpense: { kod: "KARGO", hamTip: "Kargo Bedeli" },
  ProcessingFeeExpense: { kod: "HIZMET_BEDELI", hamTip: "Hizmet bedeli" },
  Return: { kod: "IADE_TUTARI", hamTip: "İade tutarı" },
  CampaignDiscount: { kod: "KAMPANYA", hamTip: "Kampanya indirimleri" },
  CampaignDiscountRefund: { kod: "KAMPANYA_IADE", hamTip: "Kampanya indirimleri iadesi" },
  CommissionRefund: { kod: "KOMISYON_IADE", hamTip: "Komisyon iadesi" },
  StoppageRefund: { kod: "STOPAJ_IADE", hamTip: "MP Stopaj İade" },
  PaymentServiceCostReflectionRefund: {
    kod: "TAHSILAT_BEDELI_IADE",
    hamTip: "Tahsilat Yönetim Bedeli İadesi",
  },
  ReturnShipmentCostSharingExpense: { kod: "KARGO_IADE", hamTip: "Kargo Bedeli (İade Sipariş)" },
  ReturnProcessingFeeExpense: {
    kod: "HIZMET_BEDELI_IADE",
    hamTip: "Hizmet Bedeli (İade Sipariş)",
  },
  MpScrapIncome: { kod: "HURDA_GELIRI", hamTip: "Hurda geliri" },

  // --- MAKUL (isim eşleşmesi — Excel'de hiç görülmedi, çapraz YOK) ---
  CommissionInvoiceRefund: { kod: "KOMISYON_IADE", hamTip: "Komisyon iadesi" },
  ShipmentCostSharingIncome: { kod: "KARGO_IADE", hamTip: "Kargo katkı payı iadesi" },
  ProcessingFeeExpenseRefund: { kod: "HIZMET_BEDELI_IADE", hamTip: "Hizmet bedeli iadesi" },
};

export type HbFinansKaydi = {
  id: string;
  transactionType: string;
  status: string;
  orderNumber: string | null;
  packageNumber: string | null;
  invoiceNumber: string | null;
  isInvoice: boolean;
  amount: { value: number; currencyCode: string };
  dueDate: string | null;
  paymentDate: string | null;
  sku: string | null;
};

function paraBirimiCoz(kod: string): Currency {
  return kod === "840" ? "EUR" : "TRY"; // 949=TRY, 840=USD; Currency enum'da USD yok — ölçülene kadar TRY'ye düşülür, DIGER'e değil (para birimi kaybı ayrı bir konu, tutar hiç kaybolmaz).
}

/**
 * ============================================================================
 *  HB İŞ TARİHİ — ORTAMIN SAAT DİLİMİ KULLANILMAZ (K239, 23.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ ESKİ HÂL `new Date(ham)` İDİ VE SESSİZCE MAKİNENİN SAATİNİ KULLANIYORDU.
 *  HB saat dilimi TAŞIMAYAN bir damga gönderiyor (`"2026-09-16T00:00:00"`);
 *  JavaScript bunu YEREL saat sayar. ÖLÇÜLDÜ (23.09.2026, Europe/Berlin):
 *
 *      API dueDate  "2026-09-16T00:00:00"
 *      saklanan     2026-09-15T22:00:00.000Z      ← bir gün ERKEN (UTC'de)
 *      Vercel'de (UTC) aynı satır 2026-09-16T00:00:00.000Z olurdu
 *
 *  Yani AYNI satır, yazıldığı makineye göre İKİ FARKLI değerle deftere
 *  giriyordu. Ekran İstanbul gününe normalize ettiği için gösterim doğru
 *  kalıyordu — ama ham `dueDate` ile süzen her sorgu bir gün kayabilir.
 *  _(Anayasa: "İŞ SAAT DİLİMİ Europe/Istanbul SABİT — çalışma ortamının
 *  saat dilimi ASLA kullanılmaz".)_
 *
 *  ⭐ ÇARE: bunlar İŞ TARİHİDİR, saat taşımaz. Tarih parçası okunur ve
 *  `gunDegeri` ile UTC gece yarısına damgalanır — makineden bağımsız.
 * ============================================================================
 */
function tarihCoz(ham: string | null): Date | null {
  if (ham === null || ham.trim() === "") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ham.trim());
  if (!m) return null;
  return gunDegeri({ yil: Number(m[1]), ay: Number(m[2]), gun: Number(m[3]) });
}

export function hbApiSatiriniOku(kayit: HbFinansKaydi): HakedisSatiri {
  const eslesen = HB_API_TIP_ESLEME[kayit.transactionType];
  const odendi = kayit.status === "Paid";
  const vade = tarihCoz(kayit.dueDate);
  const odeme = odendi ? tarihCoz(kayit.paymentDate) : null;

  return {
    externalId: kayit.isInvoice
      ? (kayit.invoiceNumber ?? kayit.id)
      : (kayit.packageNumber ?? kayit.id),
    kod: eslesen?.kod ?? "DIGER",
    hamTip: eslesen?.hamTip ?? kayit.transactionType,
    siparisNo: kayit.orderNumber && kayit.orderNumber.trim() !== "" ? kayit.orderNumber : null,
    tutar: kayit.amount.value,
    paraBirimi: paraBirimiCoz(kayit.amount.currencyCode),
    vadeTarihi: vade,
    odemeTarihi: odeme,
    urunKodu: kayit.sku && kayit.sku.trim() !== "" ? kayit.sku : null,
    satirNo: 0,
    ham: `${kayit.transactionType} · ${kayit.orderNumber ?? "-"} · ${kayit.amount.value}`,
  };
}

export function hbApiSatirlariniOku(kayitlar: HbFinansKaydi[]): HakedisSatiri[] {
  return kayitlar
    .filter((k) => !HB_API_HARIC_TUTULAN.has(k.transactionType))
    .map(hbApiSatiriniOku);
}
