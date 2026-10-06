import { cache } from "react";

import type { FirmaAskiSebebi } from "@/generated/prisma/client";
import { askiDurumu, bugunIs } from "@/lib/aski-sureci";
import { gidenEpostalar } from "@/lib/eposta";
import { kurulumDurumlari, type KurulumDurumu } from "@/lib/firma-acilisi";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { odemeDurumu, odemeGenelBakisi } from "@/lib/odeme-takibi";
import { firmaKullanimi, firmaSinirlari, SINIR_TURLERI, sinirDurumu } from "@/lib/paket/sinirlar";
import { sistemPrisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  YÖNETİM — FİRMA DURUM ETİKETLERİ (K303, referans iskelet 06.10.2026)
 * ----------------------------------------------------------------------------
 *  «Bugün»ün yapılacakları, menü rozetleri ve firmalar listesinin süzgeci AYNI
 *  etiketten okunur (İlke #16: sayı = liste; adres süzgeç sözleşmesinin sahibi
 *  dosyadan üretilir — ekran kendi adresini kurmaz). Referans: HA-Kompass admin
 *  `todos()` + `data-pick` kalıbı.
 *
 *  SISTEM: yönetim katmanı firmalar-üstü okur; ticari VERİ okunmaz (yalnız
 *  kayıt durumu, sayılar ve abonelik).
 * ============================================================================
 */

/** Sıra = «Bugün»deki yapılacaklar sırası (önce para ve kilit, sonra fırsat). */
export const FIRMA_ETIKETLERI = ["ODEME_GECIKTI", "UYARI_DOLDU", "YARIM_KURULUM", "PAKETSIZ", "UYARIDA", "ODEME_YAKLASIYOR", "SINIR_DOLU", "ASKIDA", "AKTIF"] as const;
export type FirmaEtiketi = (typeof FIRMA_ETIKETLERI)[number];

/** Yapılacak sayılmayanlar: askıdaki ve aktif firma bir DURUMDUR, iş değil. */
export const YAPILACAK_ETIKETLERI: readonly FirmaEtiketi[] = ["ODEME_GECIKTI", "UYARI_DOLDU", "YARIM_KURULUM", "PAKETSIZ", "UYARIDA", "ODEME_YAKLASIYOR", "SINIR_DOLU"];

/** Etiketin rengi (referans: bad / warn / acc). */
export const ETIKET_RENGI: Record<FirmaEtiketi, "olumsuz" | "uyari" | "bilgi"> = {
  ODEME_GECIKTI: "olumsuz",
  UYARI_DOLDU: "olumsuz",
  YARIM_KURULUM: "olumsuz",
  PAKETSIZ: "olumsuz",
  UYARIDA: "uyari",
  ODEME_YAKLASIYOR: "uyari",
  SINIR_DOLU: "bilgi",
  ASKIDA: "uyari",
  AKTIF: "bilgi",
};

/** Etiket → referans `.yn-pill` / `.yn-chip` sınıfı. AKTIF «iyi durumda» (ok); öteki anlamlar ETIKET_RENGI'nden — tek kaynak. */
export function etiketSinifi(e: FirmaEtiketi): "ok" | "bad" | "warn" | "acc" {
  if (e === "AKTIF") return "ok";
  const r = ETIKET_RENGI[e];
  return r === "olumsuz" ? "bad" : r === "uyari" ? "warn" : "acc";
}

export function firmaEtiketiMi(x: string | undefined): x is FirmaEtiketi {
  return (FIRMA_ETIKETLERI as readonly string[]).includes(x ?? "");
}

/** SÜZGEÇ ADRESİ — tek üretici. Bugün, rozet ve listedeki sayı buradan bağlanır. */
export function firmalarAdresi(etiket?: FirmaEtiketi, ac?: string): string {
  const p = new URLSearchParams();
  if (etiket) p.set("durum", etiket);
  if (ac) p.set("ac", ac);
  const q = p.toString();
  return `${YONETIM_YOLU}/firmalar${q ? `?${q}` : ""}`;
}

/** Saf — bir firmanın etiketleri. */
export function etiketleriHesapla(
  f: { aktif: boolean; uyariSonGun: Date | null; uyariSebebi: FirmaAskiSebebi | null; askiSebebi: FirmaAskiSebebi | null; sonrakiOdemeGunu: Date | null; paketVar: boolean },
  kurulum: KurulumDurumu,
  sinirDikkat: boolean,
  bugun: Date,
): FirmaEtiketi[] {
  const e: FirmaEtiketi[] = [];
  const o = odemeDurumu(f.sonrakiOdemeGunu, bugun);
  if (o.tur === "GECIKTI") e.push("ODEME_GECIKTI");
  if (o.tur === "YAKLASIYOR") e.push("ODEME_YAKLASIYOR");
  if (kurulum === "YARIM") e.push("YARIM_KURULUM");
  else {
    const a = askiDurumu({ aktif: f.aktif, uyariSonGun: f.uyariSonGun, uyariSebebi: f.uyariSebebi, askiSebebi: f.askiSebebi }, bugun);
    if (a.tur === "ASKIDA") e.push("ASKIDA");
    if (a.tur === "UYARIDA") e.push("UYARIDA");
    if (a.tur === "SURESI_DOLDU") e.push("UYARI_DOLDU");
    // «Firmalar nerede?» çubuğunun aktif parçası: kurulumu tam, askı sürecinde değil.
    if (a.tur === "NORMAL") e.push("AKTIF");
  }
  if (!f.paketVar) e.push("PAKETSIZ");
  if (sinirDikkat) e.push("SINIR_DOLU");
  return FIRMA_ETIKETLERI.filter((x) => e.includes(x));
}

export type FirmaOzeti = {
  id: string;
  ad: string;
  kod: string;
  acilis: Date;
  kurulum: KurulumDurumu;
  paket: string | null;
  uyeSayisi: number;
  vade: Date | null;
  etiketler: FirmaEtiketi[];
};

/** Bütün firmalar — etiketleriyle. Rozet, Bugün ve liste bunu okur (istek başına bir kez). */
export const firmaOzetleri = cache(async (): Promise<FirmaOzeti[]> => firmaOzetleriniHesapla(new Date()));

/** Hesaplayan gövde — `an` verilebilir (bekçi sabit bir günde ölçer). */
export async function firmaOzetleriniHesapla(an: Date): Promise<FirmaOzeti[]> {
  // SISTEM: yönetim katmanı — firmaların KAYDI (ticari veri değil).
  const firmalar = await sistemPrisma.company.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, code: true, isActive: true, createdAt: true, uyariSonGun: true, uyariSebebi: true, askiSebebi: true, sonrakiOdemeGunu: true, paket: { select: { ad: true } }, _count: { select: { uyelikler: true } } },
  });
  const kurulum = await kurulumDurumlari(firmalar.map((f) => f.id));
  const bugun = bugunIs(an);
  return Promise.all(
    firmalar.map(async (f) => {
      const [k, s] = await Promise.all([firmaKullanimi(f.id, an), firmaSinirlari(f.id)]);
      const dikkat = SINIR_TURLERI.some((t) => ["DOLU", "ASILDI"].includes(sinirDurumu(k[t], s[t])));
      const kd = kurulum.get(f.id) ?? (f.isActive ? "TAM" : "PASIF");
      return {
        id: f.id,
        ad: f.name,
        kod: f.code,
        acilis: f.createdAt,
        kurulum: kd,
        paket: f.paket?.ad ?? null,
        uyeSayisi: f._count.uyelikler,
        vade: f.sonrakiOdemeGunu,
        etiketler: etiketleriHesapla(
          { aktif: f.isActive, uyariSonGun: f.uyariSonGun, uyariSebebi: f.uyariSebebi, askiSebebi: f.askiSebebi, sonrakiOdemeGunu: f.sonrakiOdemeGunu, paketVar: Boolean(f.paket) },
          kd,
          dikkat,
          bugun,
        ),
      };
    }),
  );
}

/** Etiket başına firma sayısı (yalnız > 0 olanlar). */
export function etiketSayilari(ozetler: FirmaOzeti[]): Map<FirmaEtiketi, number> {
  const m = new Map<FirmaEtiketi, number>();
  for (const o of ozetler) for (const e of o.etiketler) m.set(e, (m.get(e) ?? 0) + 1);
  return m;
}

/**
 * Son 30 günde GİTMEYEN e-postalar (gönderilemeyen + ayarı olmayan) — TEK ölçüt:
 * menü rozeti, «Bugün» satırı ve Giden e-postalar «sorunlu» süzgeci bunu okur.
 */
export async function sorunluEpostalar(an: Date = new Date()) {
  const sinir = new Date(an.getTime() - 30 * 24 * 60 * 60 * 1000);
  return (await gidenEpostalar({ adet: 500 })).filter((e) => e.durum !== "GONDERILDI" && e.an >= sinir);
}

/** Son 30 günde gitmeyen e-posta sayısı (rozet + Bugün). */
export async function gonderilemeyenEpostaSayisi(an: Date = new Date()): Promise<number> {
  return (await sorunluEpostalar(an)).length;
}

/** Bu ayın tahsilatı — Ödemeler sayfasıyla AYNI gövdeden (iki yerde iki toplam olmaz). */
export async function buAyTahsilat(an: Date = new Date()): Promise<{ paraBirimi: string; tutar: number }[]> {
  return (await odemeGenelBakisi(an)).buAyToplam;
}
