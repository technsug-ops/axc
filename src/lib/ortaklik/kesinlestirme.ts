import type { Prisma } from "@/generated/prisma/client";
import type { AySonucu, KarKullanimi } from "@/lib/ortaklik/paylasim";

/**
 * ============================================================================
 *  KESİNLEŞTİRME · ORTAK HESABI (K347 · Aşama 4b)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararları 19.10.2026:
 *  · ay ancak MUHASEBE AYI KAPALIYKEN kesinleşir (kaynak artık değişmez);
 *  · yalnız SON kesin ay, GEREKÇEYLE geri alınır — silinmez, haklar ters kayıtla düşer;
 *  · ödeme ortak hesabına girilir; istenirse GİDER de açar (her ödemede seçilir);
 *  · «tamamen yeniden yatırım» döneminde ödeme girilebilir ama ONAY ister ve iz bırakır.
 *  ⛔ Ödeme gideri projeye TAHSİS EDİLEMEZ (çift sayım) ve tutarı gider ekranından
 *    değiştirilemez — düzeltme ortak hesabında ters kayıtla.
 * ============================================================================
 */

export type KesinHatasi =
  | "KESIN_AY_YOK" | "KESIN_ZATEN" | "KESIN_AY_BITMEDI" | "KESIN_DONEM_ACIK" | "KESIN_HESAPLANAMADI" | "KESIN_SIRA";

/**
 * SAF — bir ay kesinleşebilir mi. Sıra: ondan önceki, anlaşması olan her ay kesin olmalı
 * (devreden zarar zinciri donmuş rakamdan ilerler). Anlaşmasız aylar zincire girmez.
 */
export function kesinlestirmeKontrolu(g: { ay: string; buAy: string; muhasebeKapali: boolean; sonuclar: AySonucu[] }): KesinHatasi | null {
  const s = g.sonuclar.find((x) => x.ay === g.ay);
  if (!s) return "KESIN_AY_YOK";
  if (s.kesin) return "KESIN_ZATEN";
  if (g.ay >= g.buAy) return "KESIN_AY_BITMEDI";
  if (!g.muhasebeKapali) return "KESIN_DONEM_ACIK";
  if (s.durum !== "TAMAM") return "KESIN_HESAPLANAMADI";
  if (g.sonuclar.some((x) => x.ay < g.ay && x.durum !== "ANLASMA_YOK" && !x.kesin)) return "KESIN_SIRA";
  return null;
}

export type GeriAlmaHatasi = "GERI_SON_DEGIL" | "GERI_GEREKCE";

/** SAF — yalnız EN SON etkin kesin ay, en az 5 karakterlik gerekçeyle. */
export function geriAlmaKontrolu(g: { ay: string; etkinAylar: string[]; gerekce: string }): GeriAlmaHatasi | null {
  if (g.etkinAylar.some((a) => a > g.ay)) return "GERI_SON_DEGIL";
  if (g.gerekce.trim().length < 5) return "GERI_GEREKCE";
  return null;
}

export type OdemeHatasi = "ODEME_TUTAR" | "ODEME_TARIH" | "ODEME_YATIRIM_ONAY" | "ODEME_KATEGORI";

/** SAF — ödeme girdisi. Yeniden yatırım döneminde ödeme ONAYSIZ geçmez (uyarı sorar). */
export function odemeKontrolu(g: { tutar: number; tarihGecerli: boolean; karKullanimi: KarKullanimi | null; yatirimOnayi: boolean; giderMi: boolean; kategoriId: string }): OdemeHatasi | null {
  if (!Number.isFinite(g.tutar) || g.tutar <= 0 || Math.abs(Math.round(g.tutar * 100) - g.tutar * 100) > 1e-6) return "ODEME_TUTAR";
  if (!g.tarihGecerli) return "ODEME_TARIH";
  if (g.karKullanimi === "YENIDEN_YATIRIM" && !g.yatirimOnayi) return "ODEME_YATIRIM_ONAY";
  if (g.giderMi && !g.kategoriId) return "ODEME_KATEGORI";
  return null;
}

type Tx = Prisma.TransactionClient;
const ayTarihi = (ay: string) => new Date(`${ay}-01T00:00:00.000Z`);

/**
 * Kesinleştirir: dönem satırı + her ortağa HAK (sıfır hak yazılmaz). Aynı ayda ETKİN satır varsa
 * ya da daha İLERİ bir ay kesinse reddeder (işlem içinde yeniden sorulur — eşzamanlı ikinci tık).
 */
export async function donemKesinlestir(tx: Tx, g: { projeId: string; sonuc: AySonucu; userId: string | null }) {
  const s = g.sonuc;
  if (!s.surumId || s.durum !== "TAMAM" || s.kesin) throw new Error("KESIN_HESAPLANAMADI");
  const cakisan = await tx.ortaklikDonemi.count({ where: { projeId: g.projeId, geriAlindiAt: null, ay: { gte: ayTarihi(s.ay) } } });
  if (cakisan) throw new Error("KESIN_ZATEN");
  const donem = await tx.ortaklikDonemi.create({
    data: {
      projeId: g.projeId, ay: ayTarihi(s.ay), anlasmaId: s.surumId, karKullanimi: s.karKullanimi!,
      sonuc: s.sonuc.toFixed(2), ucretToplami: s.ucretToplami.toFixed(2), mahsup: s.mahsup.toFixed(2), bolunen: s.bolunen.toFixed(2),
      devredenOnce: s.devredenOnce.toFixed(2), devredenSonra: s.devredenSonra.toFixed(2), kesinlestirenId: g.userId,
    },
  });
  const sonGun = new Date(Date.UTC(Number(s.ay.slice(0, 4)), Number(s.ay.slice(5, 7)), 0));
  const satirlar = Object.entries(s.haklar).filter(([, h]) => h.toplam !== 0);
  if (satirlar.length) {
    await tx.ortakCariHareketi.createMany({
      data: satirlar.map(([katilimId, h]) => ({
        projeId: g.projeId, katilimId, tur: "HAK" as const, tutar: h.toplam.toFixed(2), ucretTutari: h.ucret.toFixed(2), payTutari: h.pay.toFixed(2),
        tarih: sonGun, donemId: donem.id, userId: g.userId, aciklama: `${s.ay} hakkı`,
      })),
    });
  }
  return donem;
}

/** Geri alma: dönem satırı silinmez (`geriAlindiAt` + gerekçe), her HAK ters kayıtla düşer. */
export async function donemGeriAl(tx: Tx, g: { donemId: string; gerekce: string; userId: string | null; bugun: Date }) {
  const d = await tx.ortaklikDonemi.findUnique({ where: { id: g.donemId }, include: { cariHareketleri: { where: { tur: "HAK", reversedBy: null } } } });
  if (!d || d.geriAlindiAt) throw new Error("ORTAKLIK_KAYIT_YOK");
  const etkin = await tx.ortaklikDonemi.findMany({ where: { projeId: d.projeId, geriAlindiAt: null }, select: { ay: true } });
  const hata = geriAlmaKontrolu({ ay: d.ay.toISOString().slice(0, 7), etkinAylar: etkin.map((e) => e.ay.toISOString().slice(0, 7)), gerekce: g.gerekce });
  if (hata) throw new Error(hata);
  // Koşullu yazım: eşzamanlı ikinci geri alma sayım 0 döner.
  const sonuc = await tx.ortaklikDonemi.updateMany({ where: { id: d.id, geriAlindiAt: null }, data: { geriAlindiAt: g.bugun, geriAlmaGerekcesi: g.gerekce.trim() } });
  if (sonuc.count !== 1) throw new Error("ORTAKLIK_KAYIT_YOK");
  for (const h of d.cariHareketleri) {
    await tx.ortakCariHareketi.create({
      data: { projeId: h.projeId, katilimId: h.katilimId, tur: "HAK_TERS", tutar: (-Number(h.tutar)).toFixed(2), tarih: g.bugun, donemId: d.id, reversesId: h.id, userId: g.userId, aciklama: g.gerekce.trim() },
    });
  }
  return d;
}

/**
 * Ödeme: ODEME (eksi). İstenirse gider de açılır (KDV 0, ödeme tarihinde) ve harekete bağlanır.
 * Gider açılırsa işlem `gider.yaz` ister — bunu ÇAĞIRAN sorar.
 */
export async function odemeKaydet(tx: Tx, g: { projeId: string; katilimId: string; tarih: Date; tutar: number; aciklama: string | null; gider: { kategoriId: string; aciklama: string } | null; userId: string | null }) {
  const k = await tx.ortaklikKatilimi.findFirst({ where: { id: g.katilimId, projeId: g.projeId }, include: { proje: { select: { currency: true } } } });
  if (!k) throw new Error("ORTAKLIK_KAYIT_YOK");
  let expenseId: string | null = null;
  if (g.gider) {
    const kat = await tx.expenseCategory.findUnique({ where: { id: g.gider.kategoriId }, select: { id: true } });
    if (!kat) throw new Error("ODEME_KATEGORI");
    expenseId = (await tx.expense.create({ data: { spentAt: g.tarih, categoryId: kat.id, amount: g.tutar.toFixed(2), currency: k.proje.currency, vatRate: "0", description: g.gider.aciklama }, select: { id: true } })).id;
  }
  return tx.ortakCariHareketi.create({ data: { projeId: g.projeId, katilimId: g.katilimId, tur: "ODEME", tutar: (-g.tutar).toFixed(2), tarih: g.tarih, expenseId, userId: g.userId, aciklama: g.aciklama } });
}

/** Yanlış ödemenin tersi: ODEME_TERS (+). Bağlı gider varsa eksi tutarlı ters gider (Finansman deseni). */
export async function odemeTersle(tx: Tx, g: { hareketId: string; userId: string | null; bugun: Date; aciklama: string }) {
  const h = await tx.ortakCariHareketi.findUnique({ where: { id: g.hareketId }, include: { reversedBy: { select: { id: true } }, expense: { select: { categoryId: true, amount: true, currency: true, description: true } } } });
  if (!h || h.tur !== "ODEME") throw new Error("ORTAKLIK_KAYIT_YOK");
  if (h.reversedBy) throw new Error("ODEME_ZATEN_TERS");
  if (h.expense) {
    await tx.expense.create({ data: { spentAt: g.bugun, categoryId: h.expense.categoryId, amount: (-Number(h.expense.amount)).toFixed(2), currency: h.expense.currency, vatRate: "0", description: `${h.expense.description ?? ""} · ters kayıt` } });
  }
  return tx.ortakCariHareketi.create({ data: { projeId: h.projeId, katilimId: h.katilimId, tur: "ODEME_TERS", tutar: (-Number(h.tutar)).toFixed(2), tarih: g.bugun, reversesId: h.id, userId: g.userId, aciklama: g.aciklama } });
}

/** SAF — ortak başına hak · ödenen · kalan. Ters kayıtlar kendi türünün toplamına girer. */
export function ortakBakiyeleri(hareketler: { katilimId: string; tur: string; tutar: number }[]) {
  const b: Record<string, { hak: number; odenen: number; kalan: number }> = {};
  for (const h of hareketler) {
    const x = (b[h.katilimId] ??= { hak: 0, odenen: 0, kalan: 0 });
    if (h.tur === "HAK" || h.tur === "HAK_TERS") x.hak += h.tutar;
    else x.odenen -= h.tutar;
    x.kalan += h.tutar;
  }
  for (const x of Object.values(b)) { x.hak = Math.round(x.hak * 100) / 100; x.odenen = Math.round(x.odenen * 100) / 100; x.kalan = Math.round(x.kalan * 100) / 100; }
  return b;
}
