/**
 * ============================================================================
 *  SATIŞ DÜZENLEME — SAF KURALLAR
 * ----------------------------------------------------------------------------
 *  Kullanıcı ihtiyacı 17.08.2026, GERÇEK VAKA: "satış fiyatını 2805 yazacağıma
 *  2085 yazmışım, değiştiremiyorum." Satış `11511906855` canlıda duruyor;
 *  maliyet ₺2.022,05, kayıtlı fiyat ₺2.085 → sistem bu satışı ZARAR gösteriyor
 *  ve yanlış rakam panelde, raporda, kârlılık kartında ve NET-2 toplamında
 *  her gün dolaşıyor.
 *
 *  ── NE DEĞİŞİR, NE DEĞİŞMEZ (mimar kararı) ──────────────────────────────
 *  DEĞİŞİR: fiyat · adet · kargo (firma, desi, tutar)
 *  DEĞİŞMEZ: sipariş no · kanal · tarih · ürün
 *
 *  Kimlik alanları düzeltme konusu değildir: yanlış ürün ya da kanal
 *  girildiyse o kayıt "yanlış yazılmış" değil, BAŞKA BİR KAYITTIR. Yolu iptal
 *  + yeni kayıttır. Kimliği düzenlemeye açmak, aynı sipariş numarasının
 *  geçmişte başka bir ürüne ait olduğu bir defter üretirdi.
 *
 *  ── İZ OLMADAN DÜZENLEME YOK ────────────────────────────────────────────
 *  Her düzenleme ESKİ ve YENİ değeri, kimin yaptığını, ne zaman yaptığını ve
 *  NEDEN yaptığını taşır. Gerekçe zorunludur: altı ay sonra "bu fiyat neden
 *  değişmiş" sorusunun cevabı kayıtta durmalı.
 * ============================================================================
 */

/**
 * ============================================================================
 *  DÜZENLEME NEDENLERİ — KAPALI LİSTE (kullanıcı isteği 17.08.2026)
 * ----------------------------------------------------------------------------
 *  Gerekçe önce SERBEST METİNDİ. Kullanıcı haklı olarak itiraz etti:
 *  "belirli nedenler olsun, sonra kargaşaya sebep olmasın."
 *
 *  Serbest metin altı ay sonra "fiyat hatası", "yanlış girdim", "düzeltme",
 *  "hata" gibi aynı şeyin beş yazımıyla dolar; o alandan hiçbir zaman
 *  "kaç düzeltme fiyat yüzünden yapıldı" sorusu cevaplanamaz.
 *
 *  Liste KAPALIDIR ve `DIGER` açıklama ZORUNLU kılar — aynı kural iptal
 *  taksonomisinde de var (`MAGAZA_DIGER`, bkz. `lib/satis-iptali.ts`).
 * ============================================================================
 */
export const DUZENLEME_NEDENLERI = [
  /** Fiyat yanlış yazılmış — bugünkü 2085/2805 vakası. */
  "FIYAT_YANLIS",
  /** Kargo desisi ya da tutarı yanlış/eksik girilmiş. */
  "KARGO_YANLIS",
  /** Pazaryeri raporundaki tutar sistemdekiyle uyuşmuyor. */
  "KANAL_FARKI",
  /** Kampanya, kupon ya da indirim kayda yansımamış. */
  "KAMPANYA_INDIRIM",
  /** Diğer — AÇIKLAMA ZORUNLU. */
  "DIGER",
] as const;

export type DuzenlemeNedeni = (typeof DUZENLEME_NEDENLERI)[number];

/** Açıklama zorunlu nedenler — "diğer" kendini anlatmak zorundadır. */
export const ACIKLAMA_ZORUNLU_NEDENLER: readonly DuzenlemeNedeni[] = ["DIGER"];

export function nedenGecerliMi(deger: string): deger is DuzenlemeNedeni {
  return (DUZENLEME_NEDENLERI as readonly string[]).includes(deger);
}

export type DuzenlemeEngeli =
  | "IPTALLI"
  | "DEGISIKLIK_YOK"
  | "ADET_IADE_ALTINDA"
  | "NEDEN_YOK"
  | "ACIKLAMA_YOK"
  | "FIYAT_GECERSIZ"
  | "ADET_GECERSIZ"
  | "KARGO_GECERSIZ";

/** Tek bir kalemin düzenlenebilir alanları. */
export type KalemDegisikligi = {
  saleItemId: string;
  eskiAdet: number;
  yeniAdet: number;
  eskiFiyat: number;
  yeniFiyat: number;
  /** Bu kalemden şu ana kadar iade edilen adet — yeni adet bunun ALTINA inemez. */
  iadeEdilenAdet: number;
  urunAdi: string;
};

export type KargoDegisikligi = {
  eskiDesi: number | null;
  yeniDesi: number | null;
  eskiTutar: number | null;
  yeniTutar: number | null;
  eskiFirmaId: string | null;
  yeniFirmaId: string | null;
};

export type DuzenlemeGirdisi = {
  iptalliMi: boolean;
  /** Kapalı listeden seçilen neden. */
  neden: DuzenlemeNedeni | null;
  /** Serbest açıklama — DIGER seçildiyse ZORUNLU, diğerlerinde isteğe bağlı. */
  aciklama: string | null;
  kalemler: KalemDegisikligi[];
  kargo: KargoDegisikligi;
  paraBirimi: string;
};

/** Ekranda "eski → yeni" satırı olarak gösterilecek tek değişiklik. */
export type Fark = {
  alan: "FIYAT" | "ADET" | "KARGO_DESI" | "KARGO_TUTAR" | "KARGO_FIRMA";
  /** Kalem farklarında ürün adı; sipariş seviyesinde null. */
  urunAdi: string | null;
  eski: string | number | null;
  yeni: string | number | null;
};

export type DuzenlemePlani =
  | { olur: false; engel: DuzenlemeEngeli; ayrinti?: string }
  | {
      olur: true;
      farklar: Fark[];
      /** Ciro değişimi — eksi ise ciro düşüyor. */
      ciroFarki: number;
      eskiCiro: number;
      yeniCiro: number;
      paraBirimi: string;
      /**
       * NET-2 YENİDEN HESAPLANACAK — plan onu ÖNCEDEN söyleyemez.
       * Kâr motoru komisyon, KDV, stopaj ve kargoyu birlikte çözer; burada
       * tahmini bir NET üretmek "kopya hesap" olurdu ve gerçekleşenle
       * tutmazdı. Ekran bunu açıkça yazar.
       */
      netYenidenHesaplanacak: true;
    };

/**
 * ============================================================================
 *  NEDEN KONTROLÜ — YALNIZ KAYDETMEDE
 * ----------------------------------------------------------------------------
 *  ⚠ 17.08.2026 kullanılabilirlik düzeltmesi: neden kontrolü `duzenlemePlani`
 *  içindeydi ve ÖNİZLEMEYİ de engelliyordu. Kullanıcı adedi 1→2 yaptı,
 *  "Önizle"ye bastı ve "neden seçilmeden kaydedilemez" hatası aldı — oysa
 *  daha hiçbir şey kaydetmiyordu.
 *
 *  "Ne olacak?" sorusunun cevabı gerekçeden BAĞIMSIZDIR. Kullanıcı önce
 *  değişikliği görür, sonra neden yazar; ters sıra dayatmak, göremediği bir
 *  şeyi gerekçelendirmesini istemekti.
 *
 *  İZ ŞARTI DEĞİŞMEDİ: kayıt hâlâ nedensiz yazılamaz — kontrol yazma
 *  yolunda duruyor.
 * ============================================================================
 */
export function kaydedilebilirMi(
  neden: DuzenlemeNedeni | null,
  aciklama: string | null,
): { olur: true } | { olur: false; engel: DuzenlemeEngeli } {
  if (neden === null) return { olur: false, engel: "NEDEN_YOK" };
  if (
    ACIKLAMA_ZORUNLU_NEDENLER.includes(neden) &&
    (aciklama === null || aciklama.trim() === "")
  ) {
    return { olur: false, engel: "ACIKLAMA_YOK" };
  }
  return { olur: true };
}

/** Kalemin satır toplamı. */
function satirToplami(adet: number, fiyat: number): number {
  return adet * fiyat;
}

export function duzenlemePlani(girdi: DuzenlemeGirdisi): DuzenlemePlani {
  /**
   * İPTALLİ SATIŞ DÜZENLENEMEZ. İptal "bu satış hiç doğmadı" demektir;
   * doğmamış bir satışın fiyatını düzeltmek anlamsızdır ve iptal sonrası
   * yazılan bir fiyat, raporlarda hiç görünmeyecek bir rakam üretirdi.
   */
  if (girdi.iptalliMi) return { olur: false, engel: "IPTALLI" };

  const farklar: Fark[] = [];

  for (const k of girdi.kalemler) {
    if (!Number.isFinite(k.yeniFiyat) || k.yeniFiyat < 0) {
      return { olur: false, engel: "FIYAT_GECERSIZ", ayrinti: k.urunAdi };
    }
    if (!Number.isInteger(k.yeniAdet) || k.yeniAdet <= 0) {
      return { olur: false, engel: "ADET_GECERSIZ", ayrinti: k.urunAdi };
    }

    /**
     * ADET, İADE EDİLEN ADEDİN ALTINA İNEMEZ. 3 adet satılıp 2'si iade
     * edilmişse adet 1'e düşürülemez: iade kaydı satılmamış bir maldan
     * dönmüş görünürdü ve stok defteri kendi içinde çelişirdi.
     */
    if (k.yeniAdet < k.iadeEdilenAdet) {
      return {
        olur: false,
        engel: "ADET_IADE_ALTINDA",
        ayrinti: `${k.urunAdi}: ${k.iadeEdilenAdet}`,
      };
    }

    if (k.yeniFiyat !== k.eskiFiyat) {
      farklar.push({
        alan: "FIYAT",
        urunAdi: k.urunAdi,
        eski: k.eskiFiyat,
        yeni: k.yeniFiyat,
      });
    }
    if (k.yeniAdet !== k.eskiAdet) {
      farklar.push({
        alan: "ADET",
        urunAdi: k.urunAdi,
        eski: k.eskiAdet,
        yeni: k.yeniAdet,
      });
    }
  }

  const { kargo } = girdi;
  if (kargo.yeniDesi !== null && (!Number.isFinite(kargo.yeniDesi) || kargo.yeniDesi < 0)) {
    return { olur: false, engel: "KARGO_GECERSIZ" };
  }
  if (kargo.yeniTutar !== null && (!Number.isFinite(kargo.yeniTutar) || kargo.yeniTutar < 0)) {
    return { olur: false, engel: "KARGO_GECERSIZ" };
  }
  if (kargo.yeniDesi !== kargo.eskiDesi) {
    farklar.push({ alan: "KARGO_DESI", urunAdi: null, eski: kargo.eskiDesi, yeni: kargo.yeniDesi });
  }
  if (kargo.yeniTutar !== kargo.eskiTutar) {
    farklar.push({ alan: "KARGO_TUTAR", urunAdi: null, eski: kargo.eskiTutar, yeni: kargo.yeniTutar });
  }
  if (kargo.yeniFirmaId !== kargo.eskiFirmaId) {
    farklar.push({ alan: "KARGO_FIRMA", urunAdi: null, eski: kargo.eskiFirmaId, yeni: kargo.yeniFirmaId });
  }

  /**
   * DEĞİŞİKLİK YOKSA YAZMA YOK. Boş bir düzenleme, denetim izine "hiçbir şey
   * değişmedi" satırı düşürür ve gerçek düzeltmeleri gürültüye boğardı.
   */
  if (farklar.length === 0) return { olur: false, engel: "DEGISIKLIK_YOK" };

  const eskiCiro = girdi.kalemler.reduce(
    (t, k) => t + satirToplami(k.eskiAdet, k.eskiFiyat),
    0,
  );
  const yeniCiro = girdi.kalemler.reduce(
    (t, k) => t + satirToplami(k.yeniAdet, k.yeniFiyat),
    0,
  );

  return {
    olur: true,
    farklar,
    eskiCiro,
    yeniCiro,
    ciroFarki: yeniCiro - eskiCiro,
    paraBirimi: girdi.paraBirimi,
    netYenidenHesaplanacak: true,
  };
}

/**
 * ============================================================================
 *  PLAN İMZASI — "ONAY GÖSTERİLENE VERİLMİŞTİR"
 * ----------------------------------------------------------------------------
 *  ⚠ MİMAR ŞARTI (EK 1, 17.08.2026): yazma anında plan yeniden kurulur.
 *  Yeniden kurulan plan GÖSTERİLENDEN FARKLIYSA yazma DURUR.
 *
 *  Neden: kullanıcı önizlemeyi açtıktan sonra başka bir sekmede o satışa iade
 *  girmiş, satışı iptal etmiş ya da başka biri fiyatı değiştirmiş olabilir.
 *  Sessizce YENİ plana göre yazmak, kullanıcının onaylamadığı bir işlemi
 *  onaylamış saymaktır — geri alınamaz bir işlemde kabul edilemez.
 *
 *  İmza DEĞERLERDEN üretilir, nesne kimliğinden değil: aynı içerik her zaman
 *  aynı imzayı verir, tek bir kuruş farkı imzayı değiştirir.
 * ============================================================================
 */
export function duzenlemeImzasi(plan: DuzenlemePlani): string {
  if (!plan.olur) return `ENGEL:${plan.engel}`;

  /**
   * YÜKÜ FARKLAR TAŞIR. Her fark hem ESKİ hem YENİ değeri içerir; araya biri
   * girip fiyatı değiştirirse eski değer kayar ve imza değişir. Başka birinin
   * düzenlemesi de, araya giren iade/iptal de bu yolla yakalanır.
   *
   * ⚠ DÜRÜSTLÜK NOTU (ölçüldü 17.08.2026): aşağıdaki `CIRO` satırı TEK BAŞINA
   * yük taşımıyor — mutasyonla sınandı, sabitlendiğinde hiçbir test kırılmadı.
   * Çünkü ciro farklardan türetilir; farklar değişmeden ciro değişemez.
   * İkinci savunma hattı olarak bırakıldı: fark listesi ileride daraltılırsa
   * (örneğin bir alan "önemsiz" sayılıp çıkarılırsa) ciro yakalar. Yük
   * taşımadığı yazılmasaydı, ileride birisi ona güvenip fark listesini
   * zayıflatabilirdi.
   */
  const parcalar = plan.farklar
    .map((f) => `${f.alan}|${f.urunAdi ?? ""}|${f.eski ?? ""}|${f.yeni ?? ""}`)
    .sort();
  return [
    ...parcalar,
    `CIRO:${plan.eskiCiro}->${plan.yeniCiro}`,
    `PARA:${plan.paraBirimi}`,
  ].join("§");
}
