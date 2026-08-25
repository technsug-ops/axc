import { isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  TARİFE KAPSAM BOŞLUĞU — SAF KURAL (K49, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR — DELİK ÖLÇÜLDÜ VE GERÇEK. Tarife ekranı yüklü pencereleri
 *  tek tek doğru gösteriyordu (`Güncel` · `Bugün son gün` · `Pencere bitti`)
 *  ama **aralarındaki boşluğu hiç söylemiyordu**; delik ancak veritabanına
 *  elle bakınca göründü.
 *
 *  ── CANLI ÖLÇÜM (25.08.2026, Trendyol/AXCALI, 3 pencere) ────────────────
 *    14.08 05:00Z → 18.08 04:59Z   96,0 saat   640 kalem
 *    21.08 05:00Z → 25.08 04:59Z   96,0 saat   672 kalem
 *    25.08 05:00Z → 01.09 04:59Z  168,0 saat   712 kalem
 *
 *    ARDIŞIK KIYAS:
 *      18.08 04:59Z → 21.08 05:00Z   **DELİK 72,0 saat**
 *      25.08 04:59Z → 25.08 05:00Z   bitişik (60 saniye)
 *
 *  ⚠ KAYIP TELAFİ EDİLEMEZ SINIF. Trendyol'un tam dilimli İLERİ tarifesi
 *  arşivden İNMİYOR: 18.08 Salı dosyası indirilmediği için o pencerenin
 *  tarifesi bir daha elde edilemez. Delik **kapanmaz, yalnız görünür olur** —
 *  ve tam bu yüzden görünür olmak zorundadır.
 *  _(Anayasa, Vercel Cron dersi: "kaçışın kendisi görünür kılınır — var
 *  olanı listelemek, olmayanı göstermez.")_
 *
 *  ⚠ KAYBIN ÖLÇÜSÜ: o 72 saatte **16 satış** var. Bu satışların hiçbirinde
 *  `satisTarihiTarifesi` kapsayan pencere bulamaz ve **hüküm vermez** —
 *  doğru davranış, ama sessiz. Ekran artık niye susduğunu söylüyor.
 *
 *  ── EŞİK NEREDEN GELİYOR ────────────────────────────────────────────────
 *  Kaynak dosya pencereyi `07:59` bitirip `08:00` başlatıyor (İstanbul),
 *  yani BİTİŞİK pencereler arasında bile **60 saniyelik** bir dikiş var.
 *  Bu dikiş bir delik DEĞİL, biçim artefaktıdır.
 *
 *  ÖLÇÜLEN DAĞILIM iki noktadan ibaret ve arası UÇURUM:
 *      0,017 saat (dikiş)   [GEDİK]   72,0 saat (delik)
 *  Eşik gediğe kondu: **1 saat** — dikişin 60 katı üstünde, en küçük
 *  anlamlı deliğin 24'te biri altında. Yuvarlak bir sayı seçilmedi, iki
 *  ölçülen değerin arasındaki boşluğa kondu.
 *  _(Anayasa: "eşik, dağılımın gediğine konur — gövdesine değil.")_
 *
 *  ⚠ GÜN SAYIMI EŞİKSİZDİR. "Kaç tam gün kapsamsız" sorusu hiçbir eşik
 *  kullanmıyor: boşluğun başladığı İstanbul günü ile bittiği İstanbul günü
 *  ARASINDA kalan günler, tanımı gereği baştan sona kapsamsızdır. Saat
 *  dilimi aritmetiği hiç yapılmıyor — yalnız takvim günü karşılaştırması.
 * ============================================================================
 */

/**
 * EŞİK — bundan kısa aralık DİKİŞTİR, delik değil.
 *
 * ⚠ KAYNAĞIYLA ANILIR (bkz. yukarıdaki dağılım): ölçülen dikiş 60 saniye,
 * ölçülen delik 72 saat. Eşik ikisinin arasındaki gedikte.
 */
export const DIKIS_TAVANI_SAAT = 1;

/** Ölçümün kendisi — sayı, kaynağından koparılmasın. */
export const BOSLUK_OLCUMU = {
  tarih: "25.08.2026",
  kaynak: "canlı · Trendyol/AXCALI · 3 pencere",
  dikisSaat: 60 / 3600,
  delikSaat: 72,
} as const;

export type Pencere = {
  /** Hangi kanal hesabına ait — boşluk HESAP BAZINDA aranır. */
  hesapId: string;
  hesapAdi: string;
  baslangic: Date;
  bitis: Date;
};

export type Bosluk = {
  hesapId: string;
  hesapAdi: string;
  /** Boşluğun başladığı an = önceki pencerenin bitişi. */
  baslar: Date;
  /** Boşluğun bittiği an = sonraki pencerenin başlangıcı. */
  biter: Date;
  saat: number;
  /**
   * BAŞTAN SONA kapsamsız İstanbul takvim günleri (`YYYY-MM-DD`).
   * ⚠ Kısmen kapsanan uç günler BURAYA GİRMEZ — "18.08 saat 07:59'a kadar
   * kapsanıyordu" demek onu tam kapsamsız saymaya izin vermez.
   */
  tamGunler: string[];
};

/** `{yil,ay,gun}` -> karşılaştırılabilir sayı (20260818). */
function gunKodu(an: Date): number {
  const g = isTakvimGunu(an);
  return g.yil * 10_000 + g.ay * 100 + g.gun;
}

function gunMetni(kod: number): string {
  const yil = Math.floor(kod / 10_000);
  const ay = Math.floor((kod % 10_000) / 100);
  const gun = kod % 100;
  return `${yil}-${String(ay).padStart(2, "0")}-${String(gun).padStart(2, "0")}`;
}

/**
 * ARDIŞIK PENCERELER ARASINDAKİ DELİKLER.
 *
 * ⚠ HESAP BAZINDA — iki farklı kanal hesabının pencereleri birbirinin
 * boşluğunu KAPATMAZ. Karıştırılsaydı Trendyol'un deliği Hepsiburada'nın
 * penceresiyle dolmuş görünürdü; oysa her hesabın tarifesi kendine aittir.
 *
 * ⚠ ÖRTÜŞME DELİK DEĞİL. İki pencere üst üste biniyorsa (aynı gün iki dosya)
 * kapsam vardır; negatif "boşluk" üretilmez.
 */
export function bosluklariBul(pencereler: readonly Pencere[]): Bosluk[] {
  const hesaplar = new Map<string, Pencere[]>();
  for (const p of pencereler) {
    const liste = hesaplar.get(p.hesapId);
    if (liste) liste.push(p);
    else hesaplar.set(p.hesapId, [p]);
  }

  const bosluklar: Bosluk[] = [];

  for (const [hesapId, liste] of hesaplar) {
    const sirali = [...liste].sort(
      (a, b) => a.baslangic.getTime() - b.baslangic.getTime(),
    );

    /**
     * ⚠ EN GEÇ BİTİŞ TAŞINIR, ÖNCEKİ PENCERENİN BİTİŞİ DEĞİL. Bir pencere
     * bir öncekini tamamen KAPSIYORSA (kısa bir düzeltme yüklemesi), düz
     * "önceki.bitis" karşılaştırması sahte bir delik üretirdi.
     */
    let enGecBitis = sirali[0]!.bitis;

    for (let i = 1; i < sirali.length; i++) {
      const simdi = sirali[i]!;
      const araMs = simdi.baslangic.getTime() - enGecBitis.getTime();
      const saat = araMs / 3_600_000;

      if (saat > DIKIS_TAVANI_SAAT) {
        const basKod = gunKodu(enGecBitis);
        const sonKod = gunKodu(simdi.baslangic);

        /**
         * ⚠ TAM KAPSAMSIZ GÜNLER: boşluğun başladığı gün ile bittiği gün
         * ARASINDAKİLER. Saat dilimi aritmetiği yok — bir gün, boşluğun iki
         * ucundaki günlerin ikisinden de farklıysa o gün baştan sona
         * boşluğun içindedir.
         */
        const tamGunler: string[] = [];
        for (
          let g = new Date(enGecBitis.getTime());
          gunKodu(g) < sonKod;
          g = new Date(g.getTime() + 86_400_000)
        ) {
          const kod = gunKodu(g);
          if (kod > basKod && kod < sonKod) {
            const metin = gunMetni(kod);
            if (!tamGunler.includes(metin)) tamGunler.push(metin);
          }
        }

        bosluklar.push({
          hesapId,
          hesapAdi: simdi.hesapAdi,
          baslar: enGecBitis,
          biter: simdi.baslangic,
          saat,
          tamGunler,
        });
      }

      if (simdi.bitis.getTime() > enGecBitis.getTime()) enGecBitis = simdi.bitis;
    }
  }

  /** En yeni delik üstte — ekran ters kronolojik listeliyor. */
  return bosluklar.sort((a, b) => b.baslar.getTime() - a.baslar.getTime());
}
