import { donemAnahtari, type Ekstre } from "@/lib/kart-borcu";
import { kurusaYuvarla } from "@/lib/para";

/**
 * ============================================================================
 *  TÜRETİLMİŞ + BEYAN EKSTRELER — BİRLİKTE GÖSTERİM
 * ----------------------------------------------------------------------------
 *  Mimar kararı 16.08.2026: içe aktarılan 2025 ekstreleri ekranda
 *  GÖRÜNMEZSE teslim edilemez ("tanımladım ama gösteremiyorum" yasağı).
 *
 *  Canlı ekstreler alımlardan TÜRETİLİR; 2025'te alım yok, o aylar yalnız
 *  BEYANDAN gelir. Ekran ikisini tek listede gösterir ama KAYNAK GÖRÜNÜR
 *  kalır: beyan olanlar "geçmiş beyan" rozetiyle ayrılır.
 *
 *  ── KAYNAK NEDEN GİZLENMİYOR ────────────────────────────────────────────
 *  Türetilmiş ekstre her alım değişikliğinde kendini günceller; beyan bir
 *  insanın tabloya yazdığı sabit özettir. İkisi aynı görünürse kullanıcı
 *  yanlış olanı düzeltmeye kalkar: beyanı düzeltmek için alım aramaya
 *  başlar, ya da türetilmişi "elle değiştirmek" ister. Rozet bu soruyu
 *  baştan cevaplıyor.
 *
 *  ── ÇAKIŞMA ZATEN GİRİŞTE ENGELLENDİ ────────────────────────────────────
 *  Aynı kart+ay için iki kayıt olamaz (içe aktarma kuralı + `@@unique`).
 *  Yine de burada TÜRETİLEN kazanır: veri bir şekilde çakışırsa ekran
 *  ikisini birden göstermez, gerçek alımlardan geleni gösterir.
 * ============================================================================
 */

export type BeyanEkstre = {
  donem: Date;
  borc: number;
  odenenTutar: number | null;
  odemeTarihi: Date | null;
  hamDonemMetni: string | null;
};

/** Ekranın çizdiği satır — türetilmiş ya da beyan. */
export type BirlesikEkstre = Ekstre & {
  kaynak: "TURETILEN" | "GECMIS_EXCEL";
  /** Beyan satırında Excel'deki ham ay metni — ipucunda gösterilir. */
  hamDonemMetni: string | null;
};

/**
 * Türetilmiş ekstrelerle beyan ekstreleri tek listede birleştirir.
 *
 * @param bugun "Geçmiş mi" kararı için — dışarıdan verilir ki test gerçek
 *              takvimi beklemesin.
 */
export function ekstreleriBirlestir(girdi: {
  turetilmis: Ekstre[];
  beyanlar: BeyanEkstre[];
  sonOdemeGunuHesapla: (kesim: Date) => Date | null;
  bugun: Date;
}): BirlesikEkstre[] {
  const { turetilmis, beyanlar, sonOdemeGunuHesapla, bugun } = girdi;

  const liste: BirlesikEkstre[] = turetilmis.map((e) => ({
    ...e,
    kaynak: "TURETILEN" as const,
    hamDonemMetni: null,
  }));

  const turetilmisAnahtarlar = new Set(
    turetilmis.map((e) => donemAnahtari(e.kesimTarihi)),
  );

  for (const b of beyanlar) {
    /**
     * TÜRETİLEN KAZANIR. İçe aktarma bunu zaten engelliyor ama ekran da
     * kendi başına doğru olmalı: veri bir şekilde çakışırsa aynı ay iki
     * satır olarak görünmez.
     */
    if (turetilmisAnahtarlar.has(donemAnahtari(b.donem))) continue;

    const odenen = b.odenenTutar ?? 0;
    liste.push({
      kesimTarihi: b.donem,
      sonOdemeTarihi: sonOdemeGunuHesapla(b.donem),
      toplam: kurusaYuvarla(b.borc),
      taksitler: [],
      // Beyan edilen ay geçmişte mi — türetilmişle aynı ölçüt.
      gecmisMi: b.donem.getTime() < bugun.getTime(),
      odenen: kurusaYuvarla(odenen),
      kalan: Math.max(0, kurusaYuvarla(b.borc - odenen)),
      kaynak: "GECMIS_EXCEL",
      hamDonemMetni: b.hamDonemMetni,
    });
  }

  // Kesim tarihine göre sıralı — ekranda geçmişten bugüne akar.
  return liste.sort(
    (a, b) => a.kesimTarihi.getTime() - b.kesimTarihi.getTime(),
  );
}

/**
 * Beyan ekstreleri toplamlara KATILIR MI.
 *
 * EVET — ve bu bilinçli. Beyan edilen borç gerçek bir borçtur; katılmasaydı
 * "toplam bekleyen" 2025'i hiç görmez ve ekran kendi listesiyle çelişirdi
 * (liste 16 ay gösterir, toplam yalnız 2026'yı sayar).
 *
 * Ödenmiş beyanların kalanı zaten sıfır olduğu için toplama etkisi yoktur;
 * etkisi yalnız ÖDENMEMİŞ geçmiş beyanlarda görülür — ki orası da gerçek
 * bir açıktır.
 */
export function birlesikToplamlar(ekstreler: BirlesikEkstre[]): {
  gecikmisToplam: number;
  bekleyenToplam: number;
  acikToplam: number;
} {
  let gecikmisToplam = 0;
  let bekleyenToplam = 0;
  for (const e of ekstreler) {
    if (e.gecmisMi) gecikmisToplam += e.kalan;
    else bekleyenToplam += e.kalan;
  }
  return {
    gecikmisToplam: kurusaYuvarla(gecikmisToplam),
    bekleyenToplam: kurusaYuvarla(bekleyenToplam),
    acikToplam: kurusaYuvarla(gecikmisToplam + bekleyenToplam),
  };
}
