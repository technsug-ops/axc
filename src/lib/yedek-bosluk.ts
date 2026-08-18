/**
 * ============================================================================
 *  YEDEK BOŞLUĞU — HANGİ GÜNLER KAÇTI
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR — cron İKİ KEZ kaçtı (18 ve 19.08.2026) ve ikisi de ancak
 *  biri fark ettiği için anlaşıldı. Ekran "son 10 yedek" listeliyordu;
 *  liste doluyken bile ARADA GÜN EKSİK olabilir ve göz bunu yakalamaz.
 *
 *  "Görünmeyen bir yedekleme, olmayan bir yedeklemedir" ilkesinin devamı:
 *  **alınmamış yedek de görünmeli.** Var olanı listelemek, olmayanı
 *  göstermez.
 *
 *  ⚠ İZİN DOĞUM TARİHİ KURALI BURADA DA GEÇERLİ: en eski yedekten ÖNCESİ
 *  için "eksik" denmez. Saklama süresi 30 gün; 40 gün öncesi için yedek
 *  olmaması kusur değil, kuralın kendisidir.
 * ============================================================================
 */

export type YedekGunu = { tarih: Date };

export type BoslukRaporu = {
  /** Taranan gün sayısı (bugün dahil). */
  bakilanGun: number;
  /** Yedeği OLAN günler — gün başına birden çok yedek tek sayılır. */
  doluGun: number;
  /** Yedeği olmayan günler, YENİDEN ESKİYE. */
  eksikGunler: Date[];
  /**
   * Tarama en eski yedekten öncesine GİTMEZ. Bu alan kaç günün bilinçli
   * olarak dışarıda bırakıldığını söyler — sessiz kısaltma olmaz.
   */
  kapsamDisiGun: number;
};

/** Bir tarihi gün anahtarına indirger (İŞ saat dilimi çağıranın işi). */
function gunAnahtari(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Son `gunSayisi` gün içinde hangi günlerde yedek YOK.
 *
 * @param yedekler  Mevcut yedeklerin tarihleri.
 * @param bugun     Referans gün (İŞ saat diliminden gelmeli).
 */
export function yedekBoslugu(
  yedekler: YedekGunu[],
  bugun: Date,
  gunSayisi: number,
): BoslukRaporu {
  const dolu = new Set(yedekler.map((y) => gunAnahtari(y.tarih)));

  /**
   * EN ESKİ YEDEKTEN ÖNCESİNE BAKILMAZ. Bakılsaydı sistem ilk kurulduğu
   * günden bugüne kadar her günü "eksik" sayar ve rapor gürültüye
   * boğulurdu — üstelik o günlerde yedek alınması BEKLENMİYORDU.
   */
  const enEski = yedekler.reduce<Date | null>(
    (e, y) => (e === null || y.tarih < e ? y.tarih : e),
    null,
  );

  const eksikGunler: Date[] = [];
  let bakilan = 0;
  let kapsamDisi = 0;

  for (let i = 0; i < gunSayisi; i++) {
    const gun = new Date(bugun);
    gun.setUTCDate(gun.getUTCDate() - i);

    if (enEski !== null && gunAnahtari(gun) < gunAnahtari(enEski)) {
      kapsamDisi++;
      continue;
    }
    bakilan++;
    if (!dolu.has(gunAnahtari(gun))) eksikGunler.push(gun);
  }

  return {
    bakilanGun: bakilan,
    doluGun: bakilan - eksikGunler.length,
    eksikGunler,
    kapsamDisiGun: kapsamDisi,
  };
}

/**
 * BUGÜN eksikse bu KUSUR SAYILMAZ: cron gece 00:00'da koşuyor ve gün
 * içinde bakan biri bugünün yedeğini görür. Ama DÜN eksikse gerçek bir
 * kaçıştır. Ayrım yapılmasaydı her sabah yalancı alarm çalardı.
 */
export function gercekKacisSayisi(rapor: BoslukRaporu, bugun: Date): number {
  const bugunAnahtar = gunAnahtari(bugun);
  return rapor.eksikGunler.filter((g) => gunAnahtari(g) !== bugunAnahtar).length;
}
