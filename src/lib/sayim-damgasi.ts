import type { PrismaClient } from "@/generated/prisma/client";

import { sayimKorumasi, type SayimKorumaKarari } from "./sayim-korumasi";

/**
 * ============================================================================
 *  SAYIM DAMGASI — SAF KURALIN VERİTABANI TARAFI
 * ----------------------------------------------------------------------------
 *  `sayimKorumasi` saf bir gövdedir: veritabanına gitmez, saat okumaz. Bu
 *  dosya onu BESLER (son sayım tarihi) ve SONUCUNU KAYDEDER (geçersizlik
 *  damgası). İkisi ayrı tutuldu ki kural değerle sınanabilsin.
 *
 *  ⛔ NİYE VAR — 29.08.2026: koruma yazılmıştı, bekçisi yeşildi, 35 ölçüt
 *  geçiyordu ve **hiçbir yazma yolu onu çağırmıyordu.** Yani sistem
 *  tutmadığı bir söz veriyordu; bir Excel aktarımı Halil'in 7 saatlik
 *  sayımını hâlâ sessizce ezebilirdi.
 *  _(Anayasa: "şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur".)_
 * ============================================================================
 */

/**
 * Varyant başına SON sayımın İŞ TARİHİ.
 *
 * ⚠ ÖLÇÜT `type = COUNT_CORRECTION` ve `occurredAt`in EN BÜYÜĞÜ — yazılış
 * anı değil. Sayım geriye dönük yazılabilir; korunması gereken şey malın
 * SAYILDIĞI an, kaydın girildiği an değil.
 *
 * ⚠ VE `variantIdleri` BOŞSA BOŞ HARİTA DÖNER, TÜM DEFTER OKUNMAZ: boş
 * listeyi "hepsi" saymak, tek satırlık bir yazımda bütün defteri çeker.
 */
export async function sonSayimTarihleri(
  db: Pick<PrismaClient, "stockMovement">,
  variantIdleri: string[],
): Promise<Map<string, Date>> {
  if (variantIdleri.length === 0) return new Map();
  const satirlar = await db.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { in: variantIdleri }, type: "COUNT_CORRECTION" },
    _max: { occurredAt: true },
  });
  const harita = new Map<string, Date>();
  for (const s of satirlar) {
    if (s._max.occurredAt) harita.set(s.variantId, s._max.occurredAt);
  }
  return harita;
}

/**
 * ⭐ BETİK KARARI — YÖN AYRIMIYLA.
 *
 * Ekran yolunda kullanıcıya SORULUR (ısrar ekranı). Betikte soru sorulmaz;
 * karar önceden verilmiş olmalıdır. Ölçüm bu kararı belirledi (29.08.2026,
 * 148 sayılmış varyant · sayımdan sonra yazılmış 66 geriye dönük hareket):
 *
 *     SALE_OUT     53 · net −53   ← DÜŞÜREN
 *     PURCHASE_IN  13 · net +47   ← ARTIRAN
 *
 * ⛔ "HEPSİNİ ATLA" ÖLÇÜMLE ELENDİ: 13 alımı atlamak, gerçekten olmuş bir
 * mal kabulünün deftere hiç girmemesi demekti — anayasanın tam uyardığı
 * şey ("tam yasak, çalışan bir işi kilitlerdi").
 *
 * ⭐ YÖN AYRIMININ GEREKÇESİ FİZİKSEL:
 *  · DÜŞÜREN geç kayıt sayılmış malı YOK EDER → **ATLANIR**, çünkü sayım
 *    son sözdür ve betikte soracak kimse yok.
 *  · ARTIRAN geç kayıt (gecikmiş alım) rafı düşürmez; sayımın "fazla"
 *    dediği rakamı HAKLI ÇIKARABİLİR → **YAZILIR**, ama varyant
 *    `sayimGecersizAt` ile damgalanır ve yeniden sayılması istenir.
 *
 * ⚠ İKİSİ DE RAPORLANIR. Sessiz geçen bir istisna, istisna değil kusurdur.
 */
export type BetikKarari =
  | { islem: "YAZ" }
  | { islem: "YAZ_VE_DAMGALA"; karar: Extract<SayimKorumaKarari, { sonuc: "DURAKSA" }> }
  | { islem: "ATLA"; karar: Extract<SayimKorumaKarari, { sonuc: "DURAKSA" }> };

export function betikSayimKarari(g: {
  sonSayimIsTarihi: Date | null;
  hareketIsTarihi: Date;
  adet: number;
}): BetikKarari {
  const karar = sayimKorumasi(g);
  if (karar.sonuc === "SERBEST") return { islem: "YAZ" };
  if (karar.yon === "ARTIRAN") return { islem: "YAZ_VE_DAMGALA", karar };
  return { islem: "ATLA", karar };
}

/**
 * Sayımı geçersizleşen varyantları damgalar.
 *
 * ⚠ DAMGA "ŞU AN" DEĞİL, GEÇERSİZLEŞTİREN HAREKETİN YAZILDIĞI AN olarak
 * verilir — çağıran geçirir. Betik içinde `new Date()` okunsaydı aynı
 * koşumun satırları farklı damgalar taşırdı.
 *
 * ⚠ VE ESKİ DAMGA EZİLİR, BU BİLİNÇLİ: alan "en son ne zaman
 * geçersizleşti" der. Kaç kez geçersizleştiği `AuditLog`ta yaşar.
 */
export async function sayimGecersizlestir(
  db: Pick<PrismaClient, "productVariant">,
  variantIdleri: string[],
  an: Date,
): Promise<number> {
  if (variantIdleri.length === 0) return 0;
  const sonuc = await db.productVariant.updateMany({
    where: { id: { in: [...new Set(variantIdleri)] } },
    data: { sayimGecersizAt: an },
  });
  return sonuc.count;
}
