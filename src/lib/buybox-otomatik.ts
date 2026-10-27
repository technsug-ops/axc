import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";

import type { BuyboxKanali, BuyboxSatiri } from "./buybox";
import { buyboxFiyatZemini } from "./buybox-fiyat-verisi";
import { fiyatOnerisi, otomatikKarar, yakindaGonderildiMi, type KuralModu } from "./buybox-kural";
import { genelKuralOku } from "./buybox-kural-verisi";
import { buyboxDurumlari, buyboxUrunleri } from "./buybox-verisi";
import { hbStokFiyatYaz, tyStokFiyatYaz } from "./kanal-fiyat-yaz";

/**
 * ============================================================================
 *  BUYBOX OTOMATİK FİYAT — ZAMANLANMIŞ İŞ (K366 adım 3, kullanıcı onayı
 *  27.10.2026 «tamamla»). Uç: `/api/cron/buybox-otomatik` (15 dakikada bir).
 * ----------------------------------------------------------------------------
 *  Yalnız modu OTOMATİK olan ürünler (ürünün ayrı modu, yoksa genel ayar).
 *  Her ürün için ekrandaki «Fiyatla» penceresinin AYNI zemini ve AYNI öneri
 *  gövdesi (`buyboxFiyatZemini` → `fiyatOnerisi`) — iki yerde iki kural yok.
 *  Öneri «gönder» derse ve `otomatikKarar` kapısından geçerse liste fiyatı
 *  kanala gider (kart eylemlerinin AYNI gövdesi, `lib/kanal-fiyat-yaz.ts`:
 *  kanal kuralları, KANAL_GONDERIMI izi ve geri okuma orada).
 *  ⛔ STOK GÖNDERİLMEZ — yalnız fiyat.
 *  ⛔ OTURUM YOK: izin kapısı ucun `CRON_SECRET`idir; izlerde kullanıcı boş
 *  yazılır («bunu bir insan yapmadı» — `lib/iz.ts`).
 *  Her gönderim (kabul ya da red) `BUYBOX_OTOMATIK_FIYAT` izi bırakır: ne
 *  zaman · kanal · eski → yeni · neden · rakip fiyatı · NET-2 · marj. Ekrandaki
 *  «Son otomatik değişiklikler» bu izden okunur. Ürün varsa tur da
 *  `BUYBOX_OTOMATIK_KOSUM` izi bırakır (ekran «son kontrol»ü buradan yazar;
 *  koşmayan iş görünür olsun).
 * ============================================================================
 */

export const OTOMATIK_FIYAT_IZI = "BUYBOX_OTOMATIK_FIYAT";
export const OTOMATIK_KOSUM_IZI = "BUYBOX_OTOMATIK_KOSUM";

const KANALLAR: readonly BuyboxKanali[] = ["TY", "HB"];
const KANAL_ADI: Record<BuyboxKanali, string> = { TY: "Trendyol", HB: "Hepsiburada" };

/**
 * TY'de kendi fiyatımızı barkod barkod okumak, ürün sayısı onaylı listenin
 * sayfa sayısından (ölçüldü 25.10: 17 sayfa) azken ucuzdur; fazlaysa tam tarama.
 */
const BARKODLA_TAVAN = 17;

export type UrunSonucu =
  | { tur: "GONDERILDI"; variantId: string; kanal: BuyboxKanali; eski: number | null; yeni: number; kanalSonucu: string }
  | { tur: "REDDEDILDI"; variantId: string; kanal: BuyboxKanali; yeni: number; kod: string }
  | { tur: "ATLANDI"; variantId: string; kanal: BuyboxKanali; sebep: string };

export type KanalOzeti = {
  kanal: BuyboxKanali;
  otomatikUrun: number;
  gonderilen: number;
  reddedilen: number;
  /** Sebep → adet (DOKUNMA_YAKIN, ZEMIN_MALIYET_YOK, ZAMAN_YETMEDI …). */
  atlanan: Record<string, number>;
  sebepler: string[];
  /** Kanal sorgusu hiç yapılamadı (kimlik yok, hepsi sorgulanamadı). */
  coktu: boolean;
};

export type OtomatikTurSonucu = { kanallar: KanalOzeti[]; urunler: UrunSonucu[] };

/** Ürünün geçerli modu — ayrı modu varsa o, yoksa genel. */
async function otomatikSecici(): Promise<{ genelMod: KuralModu; ayri: Map<string, KuralModu> }> {
  const [genel, ayrilar] = await Promise.all([
    genelKuralOku(),
    prisma.buyboxKurali.findMany({ where: { mod: { not: null } }, select: { variantId: true, mod: true } }),
  ]);
  return { genelMod: genel.mod, ayri: new Map(ayrilar.flatMap((a) => (a.mod === null ? [] : [[a.variantId, a.mod] as const]))) };
}

/** Son tekrar penceresindeki otomatik gönderimler (bu ürünler için). */
async function sonGonderimler(variantIds: readonly string[], simdi: Date): Promise<Map<string, { kanal: string; fiyat: number; an: Date }[]>> {
  const harita = new Map<string, { kanal: string; fiyat: number; an: Date }[]>();
  if (variantIds.length === 0) return harita;
  const izler = await prisma.auditLog.findMany({
    where: { action: OTOMATIK_FIYAT_IZI, targetType: "ProductVariant", targetId: { in: [...variantIds] }, createdAt: { gte: new Date(simdi.getTime() - 60 * 60_000) } },
    select: { targetId: true, detail: true, createdAt: true },
  });
  for (const iz of izler) {
    try {
      const d = JSON.parse(iz.detail ?? "{}") as { kanal?: unknown; yeni?: unknown };
      if (typeof d.kanal !== "string" || typeof d.yeni !== "number" || iz.targetId === null) continue;
      const liste = harita.get(iz.targetId) ?? [];
      liste.push({ kanal: d.kanal, fiyat: d.yeni, an: iz.createdAt });
      harita.set(iz.targetId, liste);
    } catch {
      /* Çözülemeyen iz tekrar kapısını AÇMAZ — o ürün bu turda atlanır (aşağıda). */
      harita.set(iz.targetId ?? "", [{ kanal: "*", fiyat: Number.NaN, an: iz.createdAt }]);
    }
  }
  return harita;
}

/**
 * Bir tur. `sonAn`: yeni gönderime BAŞLANMAYACAK an (ucun süresi dolmadan
 * dönebilsin) — kalan ürünler «ZAMAN_YETMEDI» diye sayılır, sessiz kalmaz.
 */
export async function buyboxOtomatikTur(simdi: Date, sonAn: number): Promise<OtomatikTurSonucu> {
  const secici = await otomatikSecici();
  const otomatikMi = (variantId: string) => (secici.ayri.get(variantId) ?? secici.genelMod) === "OTOMATIK";
  const kanallar: KanalOzeti[] = [];
  const urunler: UrunSonucu[] = [];

  for (const kanal of KANALLAR) {
    const ozet: KanalOzeti = { kanal, otomatikUrun: 0, gonderilen: 0, reddedilen: 0, atlanan: {}, sebepler: [], coktu: false };
    kanallar.push(ozet);
    const atla = (variantId: string, sebep: string) => {
      ozet.atlanan[sebep] = (ozet.atlanan[sebep] ?? 0) + 1;
      urunler.push({ tur: "ATLANDI", variantId, kanal, sebep });
    };

    /** Genel mod OTOMATİK değilse yalnız ayrı modu OTOMATİK olanlar sorulur. */
    const adaylar = secici.genelMod === "OTOMATIK" ? undefined : [...secici.ayri].filter(([, m]) => m === "OTOMATIK").map(([id]) => id);
    if (adaylar !== undefined && adaylar.length === 0) continue;
    const tum = await buyboxUrunleri(kanal, { variantIds: adaylar, yalnizStoklu: true });
    const secilen = { ...tum, urunler: tum.urunler.filter((u) => otomatikMi(u.variantId)) };
    ozet.otomatikUrun = secilen.urunler.length;
    if (secilen.urunler.length === 0) continue;

    const durum = await buyboxDurumlari(kanal, secilen, { fiyatlarimiz: secilen.urunler.length <= BARKODLA_TAVAN ? "BARKODLA" : true });
    ozet.sebepler = durum.sebepler;
    if (!durum.kimlikVar || durum.satirlar.every((s) => s.durum === "SORGULANAMADI")) ozet.coktu = true;
    const gecmis = await sonGonderimler(durum.satirlar.map((s) => s.variantId), simdi);

    for (const s of durum.satirlar) {
      if (Date.now() >= sonAn) {
        atla(s.variantId, "ZAMAN_YETMEDI");
        continue;
      }
      const sonuc = await birUrun(kanal, s, simdi, gecmis.get(s.variantId) ?? []);
      urunler.push(sonuc);
      if (sonuc.tur === "GONDERILDI") ozet.gonderilen++;
      else if (sonuc.tur === "REDDEDILDI") ozet.reddedilen++;
      else ozet.atlanan[sonuc.sebep] = (ozet.atlanan[sonuc.sebep] ?? 0) + 1;
    }
  }

  const toplamUrun = kanallar.reduce((a, k) => a + k.otomatikUrun, 0);
  if (toplamUrun > 0) {
    await izYaz({
      action: OTOMATIK_KOSUM_IZI,
      targetType: "Buybox",
      targetId: null,
      userId: null,
      detail: JSON.stringify({ an: simdi.toISOString(), kanallar }),
    });
  }
  return { kanallar, urunler };
}

async function birUrun(
  kanal: BuyboxKanali,
  s: BuyboxSatiri,
  simdi: Date,
  gecmis: readonly { kanal: string; fiyat: number; an: Date }[],
): Promise<UrunSonucu> {
  const atla = (sebep: string): UrunSonucu => ({ tur: "ATLANDI", variantId: s.variantId, kanal, sebep });
  if (s.durum === "SORGULANAMADI") return atla("SORGULANAMADI");

  const z = await buyboxFiyatZemini(s.variantId, kanal, simdi);
  if (!z.tamam) return atla(`ZEMIN_${z.kod}`);
  /** Zemin kuralı taze okur — tur başladıktan sonra Onaylı'ya çevrilen ürün gönderilmez. */
  if (z.kural.etkin.mod !== "OTOMATIK") return atla("MOD_ONAYLI");

  const oneri = fiyatOnerisi(
    {
      durum: s.durum,
      bizimFiyat: s.bizimFiyat,
      bizimListeFiyati: s.bizimListeFiyati,
      buyboxFiyati: s.buyboxFiyati,
      ikinciFiyat: s.ikinciFiyat,
      kanalIndirimi: s.kanalIndirimi,
      kampanya: s.kampanya,
      artisKapali: s.hbIlan?.artisKapali === true,
    },
    z.zemin,
    z.kural.etkin,
    simdi,
  );
  const karar = otomatikKarar(oneri, z.kural.etkin, {
    kanal,
    ilanOkundu: s.hbIlan !== null,
    kampanya: s.kampanya,
    artisKapali: s.hbIlan?.artisKapali === true,
    listeFiyati: s.bizimListeFiyati,
  });
  if (!karar.gonder) {
    return atla(oneri.tur === "DOKUNMA" ? `DOKUNMA_${oneri.neden}` : oneri.tur === "HESAPLANAMAZ" ? `HESAPLANAMAZ_${oneri.sebep}` : `KAPI_${karar.sebep}`);
  }
  if (gecmis.some((g) => g.kanal === "*")) return atla("IZ_OKUNAMADI");
  if (yakindaGonderildiMi(gecmis, kanal, karar.fiyat, simdi)) return atla("YAKINDA_GONDERILDI");
  if (oneri.tur !== "GONDER") return atla("ONERI_YOK");

  let kabul: boolean;
  let kanalSonucu: string;
  try {
    if (kanal === "TY") {
      const r = await tyStokFiyatYaz(s.variantId, { stokGonder: false, fiyat: karar.fiyat });
      kabul = r.tamam;
      kanalSonucu = r.tamam ? r.batchDurumu : r.kod;
    } else {
      const r = await hbStokFiyatYaz(s.variantId, { stokGonder: false, fiyat: karar.fiyat });
      kabul = r.tamam && r.fiyat !== null && r.fiyat.hukum !== "RED";
      kanalSonucu = r.tamam ? (r.fiyat?.hukum ?? "FIYAT_YOK") : r.kod;
    }
  } catch (e) {
    console.error("[buybox-otomatik] gönderim düştü", s.variantId, kanal, karar.fiyat, e);
    kabul = false;
    kanalSonucu = "OKUNAMADI";
  }

  await izYaz({
    action: OTOMATIK_FIYAT_IZI,
    targetType: "ProductVariant",
    targetId: s.variantId,
    userId: null,
    detail: JSON.stringify({
      kanal,
      kanalAdi: KANAL_ADI[kanal],
      sonuc: kabul ? "GONDERILDI" : "REDDEDILDI",
      kanalSonucu,
      neden: oneri.neden,
      /** Müşteri fiyatı (eski) → kanala giden liste fiyatı (yeni) + müşterinin göreceği. */
      eski: s.bizimFiyat,
      eskiListe: s.bizimListeFiyati,
      yeni: karar.fiyat,
      musteri: oneri.musteri,
      siramiz: s.siramiz,
      buyboxFiyati: s.buyboxFiyati,
      ikinciFiyat: s.ikinciFiyat,
      net2: oneri.sonuc.net2,
      marj: oneri.sonuc.marj,
      minMarj: z.kural.etkin.minMarj,
      adim: z.kural.etkin.adim,
      maliyet: z.zemin.maliyet,
      maliyetTercihi: z.kural.etkin.maliyet,
      kargoDahil: oneri.sonuc.kargoDahil,
    }),
  });
  return kabul
    ? { tur: "GONDERILDI", variantId: s.variantId, kanal, eski: s.bizimFiyat, yeni: karar.fiyat, kanalSonucu }
    : { tur: "REDDEDILDI", variantId: s.variantId, kanal, yeni: karar.fiyat, kod: kanalSonucu };
}
