import type { KomisyonOkumasi, KomisyonSatiri } from "./model";

/**
 * ============================================================================
 *  EŞLEŞTİRME VE PLAN — SAF HESAP, HİÇBİR ŞEY YAZMAZ
 * ----------------------------------------------------------------------------
 *  Girdi: okunmuş dosya satırları + o hesabın MEVCUT kanal SKU eşlemeleri +
 *  katalogdaki barkod→varyant haritası. Çıktı: ne güncellenecek, ne
 *  yaratılacak, ne atlanacak. Veritabanına gitmediği için gerçek dosya
 *  olmadan sınanabilir (komisyon:dogrula).
 *
 *  ÜÇ AŞAMALI EŞLEŞTİRME (sıra önemli, ölçümle belirlendi 13.08.2026):
 *    1. Pazaryerinin kendi kodu  → mevcut eşleme     (HB'de 1040 satır)
 *    2. İkinci kod               → mevcut eşleme     (HB'de +10 satır)
 *    3. Barkod → varyant → o hesaptaki eşleme        (HB'de +4 satır)
 *       Varyant bulunup eşleme YOKSA eşleme YARATILIR (kullanıcı kararı
 *       13.08.2026). Bu adım olmasa Trendyol tarafı bu paketten 1042 yerine
 *       14 oranla çıkardı: TY hesabında yalnız 14 eşleme vardı ama 1042
 *       barkod kataloğumuzda karşılık buluyordu.
 *
 *  ORAN YOKSA SATIR İŞE YARAMAZ: eşleşse de eşleşmese de atlanır ve ham
 *  metniyle uyarıya düşer. "Boş oranı yaz" demek, dolu bir oranı silmek
 *  olurdu.
 * ============================================================================
 */

/** O hesapta halihazırda duran bir eşleme. */
export type MevcutEsleme = {
  id: string;
  kanalKodu: string;
  varyantId: string;
  /** Yüzde olarak mevcut oran; girilmemişse null. */
  oran: number | null;
};

/** Katalogdaki varyant — barkoddan varyanta gitmek için. */
export type VaryantKaydi = {
  id: string;
  barkod: string | null;
  /** Önizlemede gösterilir: hangi ürüne eşleme açılıyor. */
  sku: string;
};

export type PlanGuncelleme = {
  eslemeId: string;
  kanalKodu: string;
  eskiOran: number | null;
  yeniOran: number;
  urunAdi: string | null;
  satirNo: number;
};

export type PlanYaratma = {
  varyantId: string;
  varyantSku: string;
  kanalKodu: string;
  oran: number;
  urunAdi: string | null;
  satirNo: number;
};

/** Önizlemede kaç örnek gösterilir. Tamamı gösterilse ekran okunmaz olur. */
export const ORNEK_SINIRI = 20;

export type KomisyonSayimi = {
  /** Dosyadan okunan veri satırı. */
  okunan: number;
  /** Oranı okunamayan/aralık dışı satır — YAZILMAZ. */
  oranOkunamadi: number;
  /** Mevcut eşlemenin boş oranı dolacak. */
  bosDolan: number;
  /** Mevcut eşlemede dolu oran DEĞİŞECEK. */
  degisen: number;
  /** Oran zaten aynı — yazıma girmez. */
  ayniKalan: number;
  /** Varyant bulundu, eşleme yok: yeni eşleme açılacak. */
  yeniEsleme: number;
  /** Ne eşleme ne varyant bulundu — bu ürün bizde yok. */
  katalogdaYok: number;
  /** Aynı eşlemeye/varyanta düşen ikinci satır — ilki kazanır. */
  tekrarEden: number;
};

export type KomisyonPlani = {
  platform: KomisyonOkumasi["platform"];
  sayfa: string;
  sayim: KomisyonSayimi;
  guncellenecekler: PlanGuncelleme[];
  yaratilacaklar: PlanYaratma[];
  /** Önizleme listeleri — ilk ORNEK_SINIRI kadar. */
  degisenOrnekleri: {
    kanalKodu: string;
    urunAdi: string | null;
    eskiOran: number;
    yeniOran: number;
  }[];
  oranOrnekleri: { satirNo: number; hamOran: string }[];
  bulunamayanOrnekleri: { satirNo: number; kod: string; urunAdi: string | null }[];
};

/** Bir satırın deneyeceği tüm kod adayları — sırayla. */
function kodAdaylari(satir: KomisyonSatiri): string[] {
  const adaylar = [satir.kanalKodu, satir.ikinciKod ?? "", ...satir.barkodlar];
  return adaylar.map((a) => a.trim()).filter((a) => a !== "");
}

export function planKur(
  okuma: KomisyonOkumasi,
  mevcutlar: MevcutEsleme[],
  varyantlar: VaryantKaydi[],
): KomisyonPlani {
  const kodHarita = new Map<string, MevcutEsleme>();
  const varyantHarita = new Map<string, MevcutEsleme>();
  for (const m of mevcutlar) {
    kodHarita.set(m.kanalKodu.trim(), m);
    varyantHarita.set(m.varyantId, m);
  }

  const barkodVaryant = new Map<string, VaryantKaydi>();
  for (const v of varyantlar) {
    if (v.barkod) barkodVaryant.set(v.barkod.trim(), v);
  }

  const sayim: KomisyonSayimi = {
    okunan: okuma.satirlar.length,
    oranOkunamadi: 0,
    bosDolan: 0,
    degisen: 0,
    ayniKalan: 0,
    yeniEsleme: 0,
    katalogdaYok: 0,
    tekrarEden: 0,
  };

  const guncellenecekler: PlanGuncelleme[] = [];
  const yaratilacaklar: PlanYaratma[] = [];
  const degisenOrnekleri: KomisyonPlani["degisenOrnekleri"] = [];
  const oranOrnekleri: KomisyonPlani["oranOrnekleri"] = [];
  const bulunamayanOrnekleri: KomisyonPlani["bulunamayanOrnekleri"] = [];

  /**
   * AYNI HEDEFE İKİNCİ KEZ DOKUNULMAZ. Aynı ürünün iki listelemesi dosyada
   * ayrı satır olarak gelebilir; ikisi de plana girseydi toplu güncellemede
   * aynı kimliğe iki değer yazılır ve hangisinin kazandığı belirsiz olurdu.
   */
  const dokunulanEsleme = new Set<string>();
  const dokunulanVaryant = new Set<string>();

  for (const satir of okuma.satirlar) {
    // --- 1) ORAN: yoksa satır işe yaramaz ---
    if (satir.oran === null) {
      sayim.oranOkunamadi++;
      if (oranOrnekleri.length < ORNEK_SINIRI) {
        oranOrnekleri.push({ satirNo: satir.satirNo, hamOran: satir.hamOran });
      }
      continue;
    }

    const adaylar = kodAdaylari(satir);

    // --- 2) MEVCUT EŞLEME: kod ile ---
    let esleme: MevcutEsleme | undefined;
    for (const aday of adaylar) {
      esleme = kodHarita.get(aday);
      if (esleme) break;
    }

    // --- 3) MEVCUT EŞLEME: barkod → varyant → eşleme ---
    let varyant: VaryantKaydi | undefined;
    if (!esleme) {
      for (const aday of adaylar) {
        varyant = barkodVaryant.get(aday);
        if (varyant) break;
      }
      if (varyant) esleme = varyantHarita.get(varyant.id);
    }

    if (esleme) {
      if (dokunulanEsleme.has(esleme.id)) {
        sayim.tekrarEden++;
        continue;
      }
      if (esleme.oran !== null && esleme.oran === satir.oran) {
        sayim.ayniKalan++;
        continue;
      }
      dokunulanEsleme.add(esleme.id);
      guncellenecekler.push({
        eslemeId: esleme.id,
        kanalKodu: esleme.kanalKodu,
        eskiOran: esleme.oran,
        yeniOran: satir.oran,
        urunAdi: satir.urunAdi,
        satirNo: satir.satirNo,
      });
      if (esleme.oran === null) {
        sayim.bosDolan++;
      } else {
        sayim.degisen++;
        if (degisenOrnekleri.length < ORNEK_SINIRI) {
          degisenOrnekleri.push({
            kanalKodu: esleme.kanalKodu,
            urunAdi: satir.urunAdi,
            eskiOran: esleme.oran,
            yeniOran: satir.oran,
          });
        }
      }
      continue;
    }

    // --- 4) VARYANT VAR, EŞLEME YOK: eşleme yaratılır ---
    if (varyant) {
      if (dokunulanVaryant.has(varyant.id)) {
        sayim.tekrarEden++;
        continue;
      }
      dokunulanVaryant.add(varyant.id);
      sayim.yeniEsleme++;
      yaratilacaklar.push({
        varyantId: varyant.id,
        varyantSku: varyant.sku,
        // Yeni eşlemeye pazaryerinin KENDİ kodu yazılır (bkz. model.ts).
        kanalKodu: satir.kanalKodu,
        oran: satir.oran,
        urunAdi: satir.urunAdi,
        satirNo: satir.satirNo,
      });
      continue;
    }

    // --- 5) BU ÜRÜN BİZDE YOK ---
    sayim.katalogdaYok++;
    if (bulunamayanOrnekleri.length < ORNEK_SINIRI) {
      bulunamayanOrnekleri.push({
        satirNo: satir.satirNo,
        kod: satir.kanalKodu,
        urunAdi: satir.urunAdi,
      });
    }
  }

  return {
    platform: okuma.platform,
    sayfa: okuma.sayfa,
    sayim,
    guncellenecekler,
    yaratilacaklar,
    degisenOrnekleri,
    oranOrnekleri,
    bulunamayanOrnekleri,
  };
}

/**
 * YENİ EŞLEMENİN KANAL KODU ÇAKIŞIYOR MU?
 *
 * `ChannelSku` üzerinde (hesap, kanalKodu) tekildir. Yaratılacak kodların
 * hiçbiri mevcut eşlemelerde YOKTUR (yoksa 2. adımda tutardı), ama dosyanın
 * kendi içinde iki farklı varyanta AYNI kod düşebilir — o zaman ikinci
 * `createMany` satırı veritabanı hatası verir ve tüm işlem geri alınır.
 * Bu yüzden plan yazıma gitmeden burada süzülür.
 */
export function cakisanKodlariAyikla(plan: KomisyonPlani): {
  temiz: PlanYaratma[];
  cakisan: PlanYaratma[];
} {
  const gorulen = new Set<string>();
  const temiz: PlanYaratma[] = [];
  const cakisan: PlanYaratma[] = [];
  for (const y of plan.yaratilacaklar) {
    const anahtar = y.kanalKodu.trim();
    if (anahtar === "" || gorulen.has(anahtar)) {
      cakisan.push(y);
      continue;
    }
    gorulen.add(anahtar);
    temiz.push(y);
  }
  return { temiz, cakisan };
}
