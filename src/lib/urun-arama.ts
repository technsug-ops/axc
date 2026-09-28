import { prisma } from "@/lib/prisma";
import { satisKodundanVaryantIdleri } from "@/lib/satis-kodundan-varyant";
import { aramaKosulu, kodEsdegerleri } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  ÜRÜNLER ARAMASI — EKRAN VE EXCEL TEK GÖVDE (K302, 28.09.2026)
 * ----------------------------------------------------------------------------
 *  Bu koşul önce `/urunler/page.tsx` içinde yaşıyordu; Excel dışa aktarması
 *  (`listeler.ts → urunlerSayfasi`) KENDİ koşulunu yazıyordu ve DARDI: kanal
 *  SKU'su, eski kod (K287) ve sipariş/gönderi numarasıyla arama Excel'de YOKTU.
 *  Ekranda bulunan ürün indirilen dosyada çıkmıyordu (ölçüldü 27.09, K289
 *  notu). İlke #10 ve «sayı = liste»: iki yer iki kural yazarsa biri öbüründen
 *  sessizce ayrışır — bu depoda `/urunler` ↔ `/stok` ile ZATEN yaşandı.
 * ============================================================================
 */

/**
 * SAF — arama metni + satış kimliğinden çözülmüş varyantlar → ürün koşulu.
 * Boş arama → `undefined` (süzgeç yok).
 */
export function urunAramaSuzgeci(arama: string, satisVaryantIdleri: readonly string[]) {
  if (!arama) return undefined;
  const suzgec = {
    /**
     * ⚠ EŞDEĞER KODLAR AÇILIR (K100) — UPC-A ↔ EAN-13. Rol kümesi
     * DEĞİŞMEDİ; yalnız aynı kodun ikinci yazılışı da aranıyor.
     */
    /**
     * ⛔ PASİF DAHİL: bu ekran `isActive` SÜZMÜYOR ve bu bilinçli — ürün
     * YÖNETİM ekranıdır; pasif ürün listede DURUR ve satırında pasif
     * rozetiyle gösterilir. Süzmek, pasife alınan ürünü yönetilemez hâle
     * getirirdi.
     *
     * ⭐ VARYANT DALLARI ORTAK GÖVDEDEN, SARMALANARAK (K121c, 08.09.2026).
     *
     * Bu ekran ÜRÜN sorguluyor, ortak gövde ise VARYANT koşulu üretiyor;
     * bu yüzden her dal `variants: { some: ... }` ile sarmalanıyor.
     * Ölçüldü (66 kod · 6 kod türü, marka dahil): inline dal ile bu
     * ifade **FARK 0**.
     *
     * ⛔ `name` ve `brand` DOĞRUDAN KALIYOR — VE BU ÖLÇÜLMÜŞ BİR KARAR:
     * ikisi ÜRÜNÜN alanı, varyantın değil. Sarmalanmış bir ad araması
     * varyantı OLMAYAN bir ürünü sessizce düşürürdü. Bugün öyle ürün YOK
     * (ölçüldü: 1837 üründe 0), ama bir OR dalı ucuz bir emniyettir ve
     * yokluğu bugünün ölçümüne bağlamak yarını garanti etmez.
     *
     * ⚠ ESKİ GEREKÇE SİLİNMİYOR (12.08.2026): pazaryeri panelinden
     * kopyalanan kod (HBCV00004IA2P8) doğrudan yapıştırılıp bulunabilsin;
     * bu dal olmadan o kod HİÇ bulunmuyordu. Süreye etkisi ölçülmüştü
     * (55 → 63 ms).
     */
    OR: [
      ...kodEsdegerleri(arama).flatMap((e) => [
        { name: { contains: e } },
        { brand: { contains: e } },
      ]),
      ...aramaKosulu(arama).map((k) => ({ variants: { some: k } })),
    ],
  };
  /**
   * ⚠ SATIŞ KİMLİĞİ `kodEsdegerleri` DÖNGÜSÜNE GİRMEZ: eşdeğer açılımı
   * barkodun iki yazılışı içindir (UPC-A ↔ EAN-13); sipariş numarasının
   * ikinci bir yazılışı yoktur. Küme boşsa dal HİÇ eklenmez — arama sonucu
   * sessizce genişleyemez.
   */
  return satisVaryantIdleri.length > 0
    ? { OR: [...suzgec.OR, { variants: { some: { id: { in: [...satisVaryantIdleri] } } } }] }
    : suzgec;
}

/**
 * ⛔ SİPARİŞ / GÖNDERİ NUMARASI DA ARANIR (08.09.2026) — `/stok` ile AYNI
 * GÖVDEDEN (`satisKodundanVaryantIdleri`). Ekran ve Excel bunu çağırır.
 */
export async function urunAramaKosulu(arama: string) {
  const satisVaryantIdleri = arama ? await satisKodundanVaryantIdleri(prisma, arama) : [];
  return urunAramaSuzgeci(arama, satisVaryantIdleri);
}
