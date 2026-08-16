import { kurusaYuvarla } from "@/lib/para";

import type { Atlanan, OkunanEkstre } from "./okuyucu";

/**
 * ============================================================================
 *  İÇE AKTARMA ÖNİZLEMESİ — YAZMADAN ÖNCE NE OLACAĞINI SÖYLER
 * ----------------------------------------------------------------------------
 *  Mimar şartı: "preview-before-write". 160 satır yazan bir işlem, ne
 *  yazacağını önce göstermek zorundadır; "içe aktar" düğmesine basıp
 *  sonucu görmek geri alınması pahalı bir sürprizdir.
 *
 *  ── ÇAKIŞMA KURALI: TÜRETİLEN KAZANIR ───────────────────────────────────
 *  Aynı kart + aynı ay için hem TÜRETİLEN (gerçek alımlardan) hem BEYAN
 *  (Excel) varsa TÜRETİLEN kazanır ve beyan ATLANIR.
 *
 *  Gerekçe: türetilmiş ekstre sistemdeki gerçek alım kayıtlarından çıkar ve
 *  her zaman güncellenir; beyan bir insanın tabloya yazdığı özettir. İkisi
 *  toplanırsa aynı ay iki kez borç yazar — raporda düzelttiğimiz çift
 *  sayımın kart versiyonu, ama bu sefer GİRİŞTE engelleniyor.
 *
 *  Atlama SESSİZ DEĞİL: hangi kart, hangi ay, hangi tutar atlandı — hepsi
 *  önizlemede yazar. Kullanıcı "160 satır vardı, 148 yazıldı" farkını
 *  ekranda görebilmeli.
 * ============================================================================
 */

/** Bir kartın kullanıcı tarafından ONAYLANMIŞ eşleşmesi. */
export type OnaylananEslesme = {
  excelEtiketi: string;
  /** `null` = bu kart AKTARILMAYACAK (kullanıcı atladı). */
  kartId: string | null;
};

/** Sistemde zaten var olan bir dönem — türetilmiş ya da önceden beyan. */
export type MevcutDonem = {
  kartId: string;
  /** `donemAnahtari` biçimi: "2025-05-01". */
  donemAnahtari: string;
  kaynak: "TURETILEN" | "GECMIS_EXCEL";
};

export type YazilacakSatir = {
  kartId: string;
  excelEtiketi: string;
  donem: Date;
  donemAnahtari: string;
  hamDonemMetni: string;
  borc: number;
  odenenTutar: number | null;
  odemeTarihi: Date | null;
};

export type CakismaSebebi = "TURETILEN_VAR" | "ZATEN_BEYAN_VAR" | "KART_ATLANDI";

export type Cakisma = {
  sebep: CakismaSebebi;
  excelEtiketi: string;
  donemAnahtari: string;
  borc: number;
};

export type Onizleme = {
  yazilacaklar: YazilacakSatir[];
  cakismalar: Cakisma[];
  /** Okuyucunun bildirdiği atlananlar aynen taşınır — tek rapor. */
  atlananlar: Atlanan[];
  /** Kart başına özet — kullanıcı "hangi kart kaç satır" görsün. */
  kartOzetleri: {
    excelEtiketi: string;
    kartId: string | null;
    satir: number;
    toplamBorc: number;
    ilkDonem: string | null;
    sonDonem: string | null;
  }[];
  toplamBorc: number;
  ilkDonem: string | null;
  sonDonem: string | null;
};

/** `2025-05-01` — `lib/kart-borcu.ts` içindeki `donemAnahtari` ile aynı biçim. */
function anahtar(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function onizlemeKur(girdi: {
  ekstreler: OkunanEkstre[];
  atlananlar: Atlanan[];
  eslesmeler: OnaylananEslesme[];
  mevcutDonemler: MevcutDonem[];
}): Onizleme {
  const { ekstreler, atlananlar, eslesmeler, mevcutDonemler } = girdi;

  const kartHaritasi = new Map<string, string | null>();
  for (const e of eslesmeler) kartHaritasi.set(e.excelEtiketi, e.kartId);

  const mevcut = new Map<string, "TURETILEN" | "GECMIS_EXCEL">();
  for (const m of mevcutDonemler) {
    mevcut.set(`${m.kartId}|${m.donemAnahtari}`, m.kaynak);
  }

  const yazilacaklar: YazilacakSatir[] = [];
  const cakismalar: Cakisma[] = [];

  for (const e of ekstreler) {
    const donemAnahtari = anahtar(e.donem);
    const kartId = kartHaritasi.get(e.kartEtiketi) ?? null;

    /**
     * Kullanıcı bu kartı eşleştirmediyse (ya da açıkça atladıysa) satırları
     * yazılmaz. Sessizce düşmez — çakışma listesinde sebebiyle görünür.
     */
    if (kartId === null) {
      cakismalar.push({
        sebep: "KART_ATLANDI",
        excelEtiketi: e.kartEtiketi,
        donemAnahtari,
        borc: e.borc,
      });
      continue;
    }

    const varOlan = mevcut.get(`${kartId}|${donemAnahtari}`);
    if (varOlan === "TURETILEN") {
      cakismalar.push({
        sebep: "TURETILEN_VAR",
        excelEtiketi: e.kartEtiketi,
        donemAnahtari,
        borc: e.borc,
      });
      continue;
    }
    if (varOlan === "GECMIS_EXCEL") {
      // Aynı dosya ikinci kez yüklenmiş olabilir; `@@unique` zaten kırardı
      // ama kullanıcı hatayı DEĞİL sebebi görmeli.
      cakismalar.push({
        sebep: "ZATEN_BEYAN_VAR",
        excelEtiketi: e.kartEtiketi,
        donemAnahtari,
        borc: e.borc,
      });
      continue;
    }

    yazilacaklar.push({
      kartId,
      excelEtiketi: e.kartEtiketi,
      donem: e.donem,
      donemAnahtari,
      hamDonemMetni: e.hamDonemMetni,
      borc: kurusaYuvarla(e.borc),
      odenenTutar:
        e.odenenTutar === null ? null : kurusaYuvarla(e.odenenTutar),
      odemeTarihi: e.odemeTarihi,
    });
  }

  /**
   * AYNI DOSYADA AYNI KART+AY İKİ KEZ GEÇERSE. `@@unique` bunu veritabanında
   * kırar ama transaction yarıda patlar ve kullanıcı sebebi anlamaz. Burada
   * yakalanıp çakışma olarak bildiriliyor — ilki yazılır, ikincisi atlanır.
   */
  const gorulen = new Set<string>();
  const temizYazilacaklar: YazilacakSatir[] = [];
  for (const y of yazilacaklar) {
    const k = `${y.kartId}|${y.donemAnahtari}`;
    if (gorulen.has(k)) {
      cakismalar.push({
        sebep: "ZATEN_BEYAN_VAR",
        excelEtiketi: y.excelEtiketi,
        donemAnahtari: y.donemAnahtari,
        borc: y.borc,
      });
      continue;
    }
    gorulen.add(k);
    temizYazilacaklar.push(y);
  }

  // --- kart başına özet ---
  const ozetHaritasi = new Map<string, {
    excelEtiketi: string;
    kartId: string | null;
    satir: number;
    toplamBorc: number;
    donemler: string[];
  }>();
  for (const e of eslesmeler) {
    ozetHaritasi.set(e.excelEtiketi, {
      excelEtiketi: e.excelEtiketi,
      kartId: e.kartId,
      satir: 0,
      toplamBorc: 0,
      donemler: [],
    });
  }
  for (const y of temizYazilacaklar) {
    const o = ozetHaritasi.get(y.excelEtiketi);
    if (!o) continue;
    o.satir += 1;
    o.toplamBorc = kurusaYuvarla(o.toplamBorc + y.borc);
    o.donemler.push(y.donemAnahtari);
  }

  const tumDonemler = temizYazilacaklar.map((y) => y.donemAnahtari).sort();

  return {
    yazilacaklar: temizYazilacaklar,
    cakismalar,
    atlananlar,
    kartOzetleri: [...ozetHaritasi.values()].map((o) => {
      const sirali = [...o.donemler].sort();
      return {
        excelEtiketi: o.excelEtiketi,
        kartId: o.kartId,
        satir: o.satir,
        toplamBorc: o.toplamBorc,
        ilkDonem: sirali[0] ?? null,
        sonDonem: sirali[sirali.length - 1] ?? null,
      };
    }),
    toplamBorc: kurusaYuvarla(
      temizYazilacaklar.reduce((t, y) => t + y.borc, 0),
    ),
    ilkDonem: tumDonemler[0] ?? null,
    sonDonem: tumDonemler[tumDonemler.length - 1] ?? null,
  };
}
