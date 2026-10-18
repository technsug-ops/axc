/**
 * ============================================================================
 *  KÂR PAYLAŞIMI (K347 · Aşama 4a) — SAF GÖVDE, veritabanı yok
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararları 19.10.2026:
 *  · dönem AYLIK;
 *  · emek ücreti (sorumluluk karşılığı, ortak başına) HER AY TAM yazılır — kâr
 *    yetmezse fark zarardır;
 *  · kalan kâr: SABİT oran · SERMAYE (gün ağırlıklı) · KARMA (x%'i sermayeye,
 *    gerisi sabit orana) — üçü de seçilebilir;
 *  · zarar: DEVREDER (sonraki kârdan paylaşımdan ÖNCE kapatılır) · KAR_ORANI ·
 *    SORUMLULUK (sorumluluk payı %);
 *  · kâr kullanımı (dağıt / yeniden yatırım) ve bütün şartlar TARİHLİ SÜRÜMLE
 *    değişir; her ay o ay geçerli olan en son sürümle hesaplanır.
 *
 *  ⭐ DENKLEM (bekçi sabitler, kuruşuna): Σ haklar = dönem sonucu + Δ devreden zarar.
 *     · kâr ayı: haklar = sonuç − mahsup, devreden −mahsup kadar azalır;
 *     · DEVREDER zarar ayı: haklar = ücretler, devreden |zarar| kadar artar;
 *     · paylaşılan zarar ayı: haklar = sonuç, devreden değişmez.
 * ============================================================================
 */

export type KalanYontemi = "SABIT" | "SERMAYE" | "KARMA";
export type ZararYontemi = "DEVREDER" | "KAR_ORANI" | "SORUMLULUK";
export type KarKullanimi = "DAGIT" | "YENIDEN_YATIRIM";

export type AnlasmaPayi = { katilimId: string; sabitOran: number; emekUcreti: number; sorumlulukPayi: number };
export type AnlasmaSurumu = {
  id: string;
  /** "YYYY-AA" */
  gecerlilikAyi: string;
  kalanYontemi: KalanYontemi;
  karmaSermayeYuzdesi: number | null;
  zararYontemi: ZararYontemi;
  karKullanimi: KarKullanimi;
  paylar: AnlasmaPayi[];
};
export type AyGirdisi = {
  ay: string;
  /** Dönem sonucu (iadeler sonrası NET-2 − projeye yazılan gider). */
  sonuc: number;
  /** katilimId → o ayın gün ağırlıklı ortalama sermayesi. */
  sermaye: Record<string, number>;
};
export type OrtakHakki = { ucret: number; pay: number; toplam: number };
export type AySonucu = {
  ay: string;
  durum: "TAMAM" | "ANLASMA_YOK" | "SERMAYE_YOK";
  surumId: string | null;
  karKullanimi: KarKullanimi | null;
  sonuc: number;
  ucretToplami: number;
  mahsup: number;
  devredenOnce: number;
  devredenSonra: number;
  /** Ücretlerden sonra kâr ya da zarar olarak ortaklara bölünen (eksi olabilir). */
  bolunen: number;
  haklar: Record<string, OrtakHakki>;
};

const kurus = (n: number) => Math.round(n * 100) / 100;

/** "YYYY-AA" sırası — sözlük sırası ay sırasıdır. */
export function gecerliSurum(surumler: AnlasmaSurumu[], ay: string): AnlasmaSurumu | null {
  let secilen: AnlasmaSurumu | null = null;
  for (const s of surumler) if (s.gecerlilikAyi <= ay && (!secilen || s.gecerlilikAyi > secilen.gecerlilikAyi)) secilen = s;
  return secilen;
}

/**
 * Tutarı ağırlıklarla kuruşa böler; yuvarlama artığı mutlak değerce EN BÜYÜK paya
 * (tasarım §6 varsayılanı) — toplam, hedefe kuruşuna eşit kalır.
 */
export function agirliklaBol(tutar: number, agirliklar: Record<string, number>): Record<string, number> | null {
  const anahtarlar = Object.keys(agirliklar).filter((k) => agirliklar[k] > 0);
  const toplamAgirlik = anahtarlar.reduce((t, k) => t + agirliklar[k], 0);
  if (toplamAgirlik <= 0) return null;
  const hedef = kurus(tutar);
  const sonuc: Record<string, number> = {};
  for (const k of anahtarlar) sonuc[k] = kurus((hedef * agirliklar[k]) / toplamAgirlik);
  const artik = kurus(hedef - anahtarlar.reduce((t, k) => t + sonuc[k], 0));
  if (artik !== 0) {
    const enBuyuk = anahtarlar.reduce((a, b) => (Math.abs(sonuc[b]) > Math.abs(sonuc[a]) ? b : a));
    sonuc[enBuyuk] = kurus(sonuc[enBuyuk] + artik);
  }
  return sonuc;
}

function karAgirliklari(s: AnlasmaSurumu, sermaye: Record<string, number>): Record<string, number> | null {
  const sabit: Record<string, number> = Object.fromEntries(s.paylar.map((p) => [p.katilimId, p.sabitOran]));
  if (s.kalanYontemi === "SABIT") return sabit;
  const ser: Record<string, number> = Object.fromEntries(s.paylar.map((p) => [p.katilimId, Math.max(0, sermaye[p.katilimId] ?? 0)]));
  const serToplam = Object.values(ser).reduce((t, x) => t + x, 0);
  if (serToplam <= 0) return null;
  if (s.kalanYontemi === "SERMAYE") return ser;
  // KARMA: x%'i sermaye payına, (100−x)%'i sabit orana — ağırlıklar yüzde cinsinden normalize edilir.
  const x = s.karmaSermayeYuzdesi ?? 0;
  return Object.fromEntries(s.paylar.map((p) => [p.katilimId, (x * ser[p.katilimId]) / serToplam + ((100 - x) * p.sabitOran) / 100]));
}

export function paylasimHesapla(aylar: AyGirdisi[], surumler: AnlasmaSurumu[]): AySonucu[] {
  const sonuclar: AySonucu[] = [];
  let devreden = 0;
  for (const a of [...aylar].sort((x, y) => x.ay.localeCompare(y.ay))) {
    const s = gecerliSurum(surumler, a.ay);
    const temel = { ay: a.ay, sonuc: kurus(a.sonuc), devredenOnce: devreden, mahsup: 0, ucretToplami: 0, bolunen: 0, haklar: {} as Record<string, OrtakHakki> };
    if (!s) {
      sonuclar.push({ ...temel, durum: "ANLASMA_YOK", surumId: null, karKullanimi: null, devredenSonra: devreden });
      continue;
    }
    const kar = karAgirliklari(s, a.sermaye);
    if (!kar) {
      sonuclar.push({ ...temel, durum: "SERMAYE_YOK", surumId: s.id, karKullanimi: s.karKullanimi, devredenSonra: devreden });
      continue;
    }
    const haklar: Record<string, OrtakHakki> = {};
    for (const p of s.paylar) haklar[p.katilimId] = { ucret: kurus(p.emekUcreti), pay: 0, toplam: 0 };
    const ucretToplami = kurus(s.paylar.reduce((t, p) => t + kurus(p.emekUcreti), 0));
    let kalan = kurus(a.sonuc - ucretToplami);
    let mahsup = 0;
    let bolunen = 0;
    if (kalan > 0) {
      mahsup = kurus(Math.min(kalan, devreden));
      devreden = kurus(devreden - mahsup);
      kalan = kurus(kalan - mahsup);
      bolunen = kalan;
    } else if (kalan < 0) {
      if (s.zararYontemi === "DEVREDER") devreden = kurus(devreden - kalan);
      else bolunen = kalan;
    }
    if (bolunen !== 0) {
      const agirlik = bolunen < 0 && s.zararYontemi === "SORUMLULUK"
        ? Object.fromEntries(s.paylar.map((p) => [p.katilimId, p.sorumlulukPayi]))
        : kar;
      const dagilim = agirliklaBol(bolunen, agirlik);
      if (!dagilim) {
        sonuclar.push({ ...temel, durum: "SERMAYE_YOK", surumId: s.id, karKullanimi: s.karKullanimi, devredenSonra: temel.devredenOnce });
        devreden = temel.devredenOnce;
        continue;
      }
      for (const [k, v] of Object.entries(dagilim)) haklar[k] = { ...(haklar[k] ?? { ucret: 0, pay: 0, toplam: 0 }), pay: v };
    }
    for (const h of Object.values(haklar)) h.toplam = kurus(h.ucret + h.pay);
    sonuclar.push({ ...temel, durum: "TAMAM", surumId: s.id, karKullanimi: s.karKullanimi, ucretToplami, mahsup, bolunen, devredenSonra: devreden, haklar });
  }
  return sonuclar;
}

/**
 * GÜN AĞIRLIKLI SERMAYE — ayın her günü için o güne kadar gerçekleşmiş katkı toplamı,
 * gün sayısına bölünür. Ayın 16'sında konan ₺200.000, 30 günlük ayda ₺100.000 ağırlık taşır.
 * Katkı kuralı Finansman ile AYNI (`kaynakOzeti.sermayeKatkisi`): sermayede gerçekleşmiş
 * GİRİŞ, ortak borcunda SERMAYEYE MAHSUP; ters kayıt aynı türde eksi tutardır.
 * Gün, İstanbul takvim günü olarak "YYYY-AA-GG" verilir (saat dilimi çağıranda çözülür).
 */
export function gunAgirlikliSermaye(hareketler: { gun: string; tutar: number }[], ay: string): number {
  const [yil, ayNo] = ay.split("-").map(Number);
  const gunSayisi = new Date(Date.UTC(yil, ayNo, 0)).getUTCDate();
  let toplam = 0;
  for (let g = 1; g <= gunSayisi; g++) {
    const gun = `${ay}-${String(g).padStart(2, "0")}`;
    toplam += hareketler.filter((h) => h.gun <= gun).reduce((t, h) => t + h.tutar, 0);
  }
  return kurus(toplam / gunSayisi);
}

export type AnlasmaGirdisi = {
  gecerlilikAyi: string;
  kalanYontemi: string;
  karmaSermayeYuzdesi: number | null;
  zararYontemi: string;
  karKullanimi: string;
  paylar: AnlasmaPayi[];
};
export type AnlasmaHatasi =
  | "ANLASMA_AY" | "ANLASMA_ESKI_AY" | "ANLASMA_YONTEM" | "ANLASMA_KARMA" | "ANLASMA_KATILIM"
  | "ANLASMA_DEGER" | "ANLASMA_SABIT_TOPLAM" | "ANLASMA_SORUMLULUK_TOPLAM";

const ikiOndalik = (n: number) => Number.isFinite(n) && Math.abs(Math.round(n * 100) - n * 100) <= 1e-6;
const yuzde = (n: number) => ikiOndalik(n) && n >= 0 && n <= 100;
const toplamYuz = (ns: number[]) => Math.round(ns.reduce((t, n) => t + n * 100, 0)) === 10000;

/** SAF — sürüm kaydedilmeden önce. Projenin BÜTÜN katılımcıları sürümde tam bir kez yer alır. */
export function anlasmaDogrula(g: AnlasmaGirdisi, projeBaslangicAyi: string, katilimIdleri: string[]): AnlasmaHatasi | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(g.gecerlilikAyi)) return "ANLASMA_AY";
  if (g.gecerlilikAyi < projeBaslangicAyi) return "ANLASMA_ESKI_AY";
  if (!["SABIT", "SERMAYE", "KARMA"].includes(g.kalanYontemi) || !["DEVREDER", "KAR_ORANI", "SORUMLULUK"].includes(g.zararYontemi) || !["DAGIT", "YENIDEN_YATIRIM"].includes(g.karKullanimi)) return "ANLASMA_YONTEM";
  if (g.kalanYontemi === "KARMA" && (g.karmaSermayeYuzdesi === null || !ikiOndalik(g.karmaSermayeYuzdesi) || g.karmaSermayeYuzdesi <= 0 || g.karmaSermayeYuzdesi >= 100)) return "ANLASMA_KARMA";
  const ids = g.paylar.map((p) => p.katilimId);
  if (ids.length !== katilimIdleri.length || new Set(ids).size !== ids.length || ids.some((i) => !katilimIdleri.includes(i))) return "ANLASMA_KATILIM";
  for (const p of g.paylar) {
    if (!yuzde(p.sabitOran) || !yuzde(p.sorumlulukPayi) || !ikiOndalik(p.emekUcreti) || p.emekUcreti < 0) return "ANLASMA_DEGER";
  }
  if ((g.kalanYontemi === "SABIT" || g.kalanYontemi === "KARMA") && !toplamYuz(g.paylar.map((p) => p.sabitOran))) return "ANLASMA_SABIT_TOPLAM";
  if (g.zararYontemi === "SORUMLULUK" && !toplamYuz(g.paylar.map((p) => p.sorumlulukPayi))) return "ANLASMA_SORUMLULUK_TOPLAM";
  return null;
}

/**
 * Türkçe sayı: virgül VARSA noktalar binlik ayırıcıdır ("10.000,50" → 10000.5); virgül YOKSA
 * nokta ondalıktır ("30.5" → 30.5 — telefon klavyesi çoğu zaman nokta verir). Boş → 0.
 */
export function formSayisi(ham: string): number {
  const t = ham.trim();
  if (t === "") return 0;
  return Number(t.includes(",") ? t.split(".").join("").replace(",", ".") : t);
}
