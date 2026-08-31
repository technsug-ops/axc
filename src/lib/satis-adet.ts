import { fifoDagit, partileriOncele, type Parti } from "@/lib/stok";

/**
 * ============================================================================
 *  SATIŞ ADEDİ DÜZENLEME — STOK ETKİSİ
 * ----------------------------------------------------------------------------
 *  Düzenleme paketinin son dilimi. Fiyat ve kargo stok defterine DOKUNMAZ;
 *  adet dokunur — bu yüzden kendi dilimine bırakılmıştı.
 *
 *  ── İKİ YÖN, İKİ MEKANİK ────────────────────────────────────────────────
 *  ADET ARTAR  → aradaki fark FIFO'dan ÇIKAR (yeni `SALE_OUT` hareketleri).
 *                Satış girişindeki kuralın aynısı: `fifoDagit` en eski
 *                partiden başlar ve her partinin kendi maliyetini taşır.
 *  ADET AZALIR → fark stoğa GERİ DÖNER (`ADJUSTMENT` girişi), çıkışın
 *                maliyetinin AYNASI ile.
 *
 *  ── AYNA HAREKETTE KAYNAK BAĞI YOK ──────────────────────────────────────
 *  ⚠ 17.08.2026 dersi: iptal ayna hareketine `sourceMovementId` yazılmıştı ve
 *  FIFO'da HAYALET PARTİ doğmuştu (ledger 1, FIFO 2). Hareket hem pozitif
 *  olduğu için yeni parti sayılıyor hem kaynak bağıyla eski partinin
 *  tüketimini sıfırlıyordu. Burada da bağ YAZILMAZ; maliyet aynası envanter
 *  değerini korumaya yeter.
 *
 *  ── STOK YETMİYORSA ENGELLENİR ──────────────────────────────────────────
 *  Satış girişi ne yapıyorsa o: `fifoDagit` yetersizlikte `yeterliMi: false`
 *  döner ve kayıt yazılmaz. Adet artırma da aynı kurala uyar — "eksi stok"
 *  yazmak defteri bozar. Ekran KAÇ ADET olduğunu söyler.
 * ============================================================================
 */

export type AdetEngeli = "STOK_YETMIYOR";

export type KalemAdetDegisimi = {
  saleItemId: string;
  variantId: string;
  urunAdi: string;
  eskiAdet: number;
  yeniAdet: number;
  /** Bu kalemin mevcut çıkış hareketleri — azalışta ayna için maliyet kaynağı. */
  cikislar: {
    birimMaliyet: string | null;
    birimMaliyetParaBirimi: string | null;
    locationId: string | null;
    adet: number;
  }[];
  /**
   * SPESİFİK BELİRLEME (K110) — bu kalemin ÖNCEDEN tükettiği partinin
   * hareket kimliği; çağıran, kalemin en eski çıkış hareketinden okur.
   *
   * ⚠ NİYE FIFO DEĞİL: satış fiilen O LOTTAN sevk edildi. Adedi artırmak
   * aynı sevkiyata bir adet daha eklemektir; başka bir partiden düşmek,
   * aynı satışın iki farklı maliyet taşıması demek olurdu.
   *
   * ⚠ VE FIFO YİNE YEDEK: o parti tükendiyse `partileriOncele` listeyi
   * olduğu gibi döndürür ve dağıtım FIFO'ya düşer — kilitlenme olmaz.
   */
  oncekiPartiId: string | null;
  /** Varyantın açık FIFO partileri — artışta çıkış buradan yapılır. */
  partiler: Parti[];
};

export type YeniCikis = {
  saleItemId: string;
  variantId: string;
  /** NEGATİF — stoktan düşer. */
  quantityDelta: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: string | null;
  locationId: string | null;
  /** Çıkışın düştüğü parti — FIFO izlenebilirliği için ŞART. */
  sourceMovementId: string;
};

export type AynaGiris = {
  saleItemId: string;
  variantId: string;
  /** POZİTİF — stoğa döner. */
  quantityDelta: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: string | null;
  locationId: string | null;
};

export type AdetPlani =
  | {
      olur: false;
      engel: AdetEngeli;
      /** Hangi üründe, ne kadar gerekiyordu, ne kadar var. */
      ayrinti: { urunAdi: string; gereken: number; mevcut: number };
    }
  | {
      olur: true;
      cikislar: YeniCikis[];
      girisler: AynaGiris[];
      /** Önizlemede gösterilir: net stok etkisi. */
      stoktanDusen: number;
      stogaDonen: number;
    };

export function adetPlani(kalemler: KalemAdetDegisimi[]): AdetPlani {
  const cikislar: YeniCikis[] = [];
  const girisler: AynaGiris[] = [];

  for (const k of kalemler) {
    const fark = k.yeniAdet - k.eskiAdet;
    if (fark === 0) continue;

    if (fark > 0) {
      /**
       * ARTIŞ — FIFO'dan çıkar. Satış girişiyle AYNI fonksiyon: iki yerde
       * iki dağıtım mantığı olsaydı aynı satış iki farklı maliyetle
       * yazılabilirdi.
       */
      const oncelik = partileriOncele(k.partiler, k.oncekiPartiId);
      const sonuc = fifoDagit(oncelik.partiler, fark);
      if (!sonuc.yeterliMi) {
        return {
          olur: false,
          engel: "STOK_YETMIYOR",
          ayrinti: { urunAdi: k.urunAdi, gereken: fark, mevcut: sonuc.mevcut },
        };
      }
      for (const pay of sonuc.dagitim) {
        cikislar.push({
          saleItemId: k.saleItemId,
          variantId: k.variantId,
          quantityDelta: -pay.adet,
          birimMaliyet: pay.parti.birimMaliyet,
          birimMaliyetParaBirimi: pay.parti.birimMaliyetParaBirimi,
          locationId: pay.parti.locationId,
          // Hangi partiden düştüğü kayıtta durur — FIFO izlenebilirliği.
          sourceMovementId: pay.parti.hareketId,
        });
      }
      continue;
    }

    /**
     * AZALIŞ — stoğa geri döner. Maliyet, ÇIKIŞIN maliyetinin aynasıdır;
     * mevcut çıkış hareketlerinden okunur. Yeni maliyet uydurulsaydı aynı
     * mal defterde iki değerle dururdu.
     *
     * Birden çok çıkış varsa (kalem birkaç partiden düşmüşse) SON çıkıştan
     * başlanır: en son düşen ilk döner, FIFO'nun tersi.
     */
    let geriDonecek = -fark;
    for (const c of [...k.cikislar].reverse()) {
      if (geriDonecek <= 0) break;
      const adet = Math.min(c.adet, geriDonecek);
      geriDonecek -= adet;
      girisler.push({
        saleItemId: k.saleItemId,
        variantId: k.variantId,
        quantityDelta: adet,
        birimMaliyet: c.birimMaliyet,
        birimMaliyetParaBirimi: c.birimMaliyetParaBirimi,
        locationId: c.locationId,
      });
    }
  }

  return {
    olur: true,
    cikislar,
    girisler,
    stoktanDusen: cikislar.reduce((t, c) => t + Math.abs(c.quantityDelta), 0),
    stogaDonen: girisler.reduce((t, g) => t + g.quantityDelta, 0),
  };
}
