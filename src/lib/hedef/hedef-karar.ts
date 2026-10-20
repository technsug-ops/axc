import { gunDegeri, gunMetni, isTakvimGunu, pencereOlustur, type Pencere } from "@/lib/donem";

/**
 * ============================================================================
 *  SATIŞ HEDEFLERİ — SAF KARARLAR (K349, 20.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _«günlük, haftalık, aylık, çeyrek ve yıllık hedefler koyalım; satış
 *  hedefini, kâr hedefini geçerse tebrikler yapalım.»_ Kararlar: ölçütler ciro ·
 *  NET-2 · sipariş adedi · firma geneli · TRY · rakamlar PANELLE AYNI tanımdan.
 *
 *  Pencereler panelin kendi pencere üreticisinden gelir (`pencereOlustur`): «bu
 *  ay» hedefinin rakamı, panelde «Bu ay» seçilince görünen rakamla AYNI aralıktır.
 *  Çeyrek ve yıl için panelde hazır tür yok → aynı üreticinin ÖZEL aralığı.
 *  Saf — veritabanına dokunmaz, «şu an» dışarıdan verilir.
 * ============================================================================
 */

export const HEDEF_OLCUTLERI = ["CIRO", "NET2", "SIPARIS"] as const;
export type HedefOlcutu = (typeof HEDEF_OLCUTLERI)[number];
export const HEDEF_DONEMLERI = ["GUN", "HAFTA", "AY", "CEYREK", "YIL"] as const;
export type HedefDonemi = (typeof HEDEF_DONEMLERI)[number];

/** Dönemin «şu ana kadarki» penceresi — İstanbul takvimi, bugün dahil. */
export function hedefPenceresi(donem: HedefDonemi, an: Date): Pencere {
  if (donem === "GUN") return pencereOlustur("BUGUN", an);
  if (donem === "HAFTA") return pencereOlustur("BU_HAFTA", an);
  if (donem === "AY") return pencereOlustur("BU_AY", an);
  const bugun = isTakvimGunu(an);
  const ilkAy = donem === "CEYREK" ? Math.floor((bugun.ay - 1) / 3) * 3 + 1 : 1;
  return pencereOlustur("OZEL", an, {
    baslangic: gunMetni(gunDegeri({ yil: bugun.yil, ay: ilkAy, gun: 1 })),
    bitis: gunMetni(gunDegeri(bugun)),
  });
}

export type HedefSatiri = { id: string; olcut: HedefOlcutu; donem: HedefDonemi; tutar: number | null; gecerlilik: Date; createdAt: Date };

/**
 * Bu dönemde geçerli hedef: aynı ölçüt × dönem, `gecerlilik` ≤ dönem başı olan
 * EN YENİ sürüm (eşitlikte sonra girilen). Tutarı boş sürüm = hedef KALDIRILMIŞ → null.
 */
export function gecerliHedef(satirlar: readonly HedefSatiri[], olcut: HedefOlcutu, donem: HedefDonemi, donemBasi: Date): HedefSatiri | null {
  let secilen: HedefSatiri | null = null;
  for (const s of satirlar) {
    if (s.olcut !== olcut || s.donem !== donem || s.gecerlilik.getTime() > donemBasi.getTime()) continue;
    if (!secilen || s.gecerlilik > secilen.gecerlilik || (s.gecerlilik.getTime() === secilen.gecerlilik.getTime() && s.createdAt > secilen.createdAt)) secilen = s;
  }
  return secilen && secilen.tutar !== null && secilen.tutar > 0 ? secilen : null;
}

export type DonemRakamlari = Record<HedefOlcutu, number>;
export type HedefDurumu = {
  olcut: HedefOlcutu;
  donem: HedefDonemi;
  hedefId: string;
  hedef: number;
  gerceklesen: number;
  /** 0…∞ — 1 hedefin tamamı. */
  oran: number;
  gecildi: boolean;
  donemBasi: Date;
};

/** Hedefi konmuş her ölçüt × dönem için ilerleme. Hedefi olmayan satır ÇIKMAZ. */
export function hedefDurumlari(
  satirlar: readonly HedefSatiri[],
  rakamlar: Record<HedefDonemi, DonemRakamlari>,
  pencereler: Record<HedefDonemi, Pencere>,
): HedefDurumu[] {
  const cikti: HedefDurumu[] = [];
  for (const donem of HEDEF_DONEMLERI) {
    const donemBasi = pencereler[donem].ilkGun;
    for (const olcut of HEDEF_OLCUTLERI) {
      const h = gecerliHedef(satirlar, olcut, donem, donemBasi);
      if (!h || h.tutar === null) continue;
      const gerceklesen = rakamlar[donem][olcut];
      cikti.push({ olcut, donem, hedefId: h.id, hedef: h.tutar, gerceklesen, oran: gerceklesen / h.tutar, gecildi: gerceklesen >= h.tutar, donemBasi });
    }
  }
  return cikti;
}

/** Tebrik bildirimini kim alır: kâr tebriği yalnız kârı görebilene. */
export function tebrikIzni(olcut: HedefOlcutu): "satis.gor" | "satis.kar.gor" {
  return olcut === "NET2" ? "satis.kar.gor" : "satis.gor";
}

/**
 * Formdan gelen tutar: boş → hedefi kaldır (null); geçersiz → hata; sipariş adedi tam sayı.
 * ⚠ BİNLİK AYIRICI TAHMİN EDİLMEZ: «500.000» binlik de «1500.50» ondalık da olabilir —
 * yanlış okuma hedefi 100–1000 kat kaydırır. Alan sayı kutusudur (tarayıcı düz sayı
 * gönderir); yalnız ondalık virgül noktaya çevrilir, birden çok ayırıcı REDDEDİLİR.
 */
export function hedefTutariOku(ham: string, olcut: HedefOlcutu): { tamam: true; tutar: number | null } | { tamam: false } {
  const temiz = ham.trim();
  if (temiz === "") return { tamam: true, tutar: null };
  if (!/^\d+([.,]\d{1,2})?$/.test(temiz)) return { tamam: false };
  const sayi = Number(temiz.replace(",", "."));
  if (!Number.isFinite(sayi) || sayi <= 0 || sayi > 1e13) return { tamam: false };
  if (olcut === "SIPARIS" && !Number.isInteger(sayi)) return { tamam: false };
  if (olcut !== "SIPARIS" && Math.round(sayi * 100) !== sayi * 100) return { tamam: false };
  return { tamam: true, tutar: sayi };
}
