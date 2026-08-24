import type { StockMovementType } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ZARARIN KAYNAĞI — SATIŞTAN MI, SONRAKİ SÜREÇTEN Mİ? (24.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _"burada görünen büyük zarar malın iade edilmesi ve iade edilen
 *  malın çöp olmasından kaynaklı; normalde satış başarılı. Bu zarar ile
 *  satıştaki zarar birbirinden farklı — iadeden kaynaklı olduğunu bir şekilde
 *  bilebiliyor olmalıyız."_
 *
 *  ⚠ RAKAM YANLIŞ DEĞİL, ETİKETİ EKSİK. `11473322212`nin NET-2'si −1.701,63
 *  ve bu DOĞRU: `MALIYET` satırı 4.398 taşıyor çünkü satılan mal (1.799) VE
 *  değişimde giden mal (2.599) aynı satışın bedeli (K36a kuralı). Ama listede
 *  "zararda" rozeti, fiyatını yanlış kurmuş bir satışla AYNI görünüyor ve iki
 *  rakam **iki apayrı işe** yol açıyor:
 *    · satıştan zarar     → fiyat yanlış / maliyet yüksek → fiyatı düzelt
 *    · sonraki süreçten   → satış iyiydi, iade/çöp yedi   → iade oranına bak
 *
 *  ⚠ İKİ TABLOYA BÖLÜNMEDİ. Aynı kaydı iki ekrana bölmek, _"bu üründe para
 *  kazanıyor muyum"_ sorusunu iki yere bakmadan cevaplanamaz yapardı
 *  (İlke #9). Bölünen tablo değil, EKSİK OLAN ETİKET.
 *
 *  ⚠ VE UYDURULMUŞ İKİNCİ BİR NET ÜRETİLMİYOR. "Satışın kendi NET-2'si"
 *  hesaplamak, kâr motorunu farklı girdiyle İKİNCİ KEZ koşmak demekti; o
 *  rakam hiçbir ekranla tutmayan üçüncü bir gerçek olurdu. Bunun yerine
 *  KESİN ve ÖLÇÜLEBİLİR olan söyleniyor: bu NET'in içinde ne kadar
 *  "sonraki süreç" maliyeti var.
 * ============================================================================
 */

/**
 * SATIŞIN KENDİ ÇIKIŞI. Satış anında malı gönderen hareket budur;
 * kaleme bağlı ÖTEKİ her hareket satıştan SONRA olmuştur.
 *
 * ⚠ LİSTE DEĞİL TÜMLEYEN — ve bu bilinçli. "Şu tipleri sonraki süreç say"
 * deseydik, yarın eklenen bir tip sessizce satışın kendi maliyeti sanılırdı
 * (anayasa: "tip listesi değil, BAĞ"). Tümleyen kurulunca yeni tip
 * kendiliğinden GÜVENLİ tarafa — "sonraki süreç" tarafına — düşer.
 */
const SATISIN_KENDI_CIKISI: StockMovementType = "SALE_OUT";

export function sonrakiSurecMi(tip: StockMovementType): boolean {
  return tip !== SATISIN_KENDI_CIKISI;
}

export type ZararKaynagi = "SATISTAN" | "SONRAKI_SUREC" | "ZARAR_YOK";

/**
 * ⚠ ÜÇ DURUM AYRI SAYILIR, İKİ DEĞİL.
 *   · `ZARAR_YOK`      — NET-2 sıfır ya da artı; sınıflandıracak bir şey yok
 *   · `SATISTAN`       — zararda VE sonraki süreç maliyeti YOK → fiyat işi
 *   · `SONRAKI_SUREC`  — zararda VE sonraki süreç maliyeti VAR → iade işi
 *
 * ⚠ NET-2 BİLİNMİYORSA (null) HÜKÜM VERİLMEZ. Kârı hesaplanamamış bir satışı
 * "zarar yok" saymak, ölçülmemiş bir şey hakkında iddia kurmaktır.
 */
export function zararKaynagi(girdi: {
  net2: number | null;
  sonrakiSurecMaliyeti: number;
}): ZararKaynagi | null {
  if (girdi.net2 === null) return null;
  if (girdi.net2 >= 0) return "ZARAR_YOK";
  return girdi.sonrakiSurecMaliyeti > 0 ? "SONRAKI_SUREC" : "SATISTAN";
}

/**
 * ⚠ "SONRAKİ SÜREÇ MALİYETİ VAR" ile "ZARARDA" AYRI ŞEYLER. Kârlı bir satış
 * da değişim malı taşıyabilir; o satış zararda değildir ama NET'i sonraki
 * süreçten ETKİLENMİŞTİR ve kullanıcı bunu görmeli.
 */
export function sonrakiSurecEtkisiVarMi(sonrakiSurecMaliyeti: number): boolean {
  return sonrakiSurecMaliyeti > 0;
}
