import { prisma } from "@/lib/prisma";

import { hbKargoTarifesiPdfOku, type KargoTarifePdfHatasi } from "./pdf-oku";

/**
 * ============================================================================
 *  HEPSİBURADA KARGO TARİFESİ PDF YÜKLEME — VERİ KATMANI (K202, 17.09.2026)
 * ----------------------------------------------------------------------------
 *  Okuma saf katmanda (`pdf-oku.ts`); burada yalnız DB işi var — taşıyıcı
 *  eşleşmesi, mevcut tarifeyle fark ölçümü, yazma.
 *
 *  ── PDF TAŞIYICI ADI → BİZİM CargoCarrier.name (SABİT, DAR) ─────────────
 *  ⛔ DİZE BENZERLİĞİYLE EŞLEŞTİRME YOK. `kargo-tartim-tazele.ts`teki
 *  `TY_FIRMA_ESLEME`/`HB_FIRMA_ESLEME` ile AYNI desen: harita SABİT ve
 *  BUGÜN GEÇERLİ 11 taşıyıcıyla sınırlı. PDF'te haritada olmayan bir ad
 *  görülürse (HB yeni taşıyıcı eklerse) sistem TAHMİN ETMEZ — açık hatayla
 *  durur ve harita GENİŞLETİLİR (bir sonraki oturumda).
 *
 *  ── ADDİTİF PARTİ MODELİ ─────────────────────────────────────────────────
 *  `CargoTariff` eski `effectiveFrom` partilerini SİLMEZ (geçmiş satışlar
 *  kendi soldAt'ına en yakın effectiveFrom'u okur — bkz. K201-4). Bu PDF'in
 *  kendi beyan ettiği tarih (`etkinTarih`) YENİ bir parti olarak eklenir.
 *  ⚠ AYNI TARİH İKİNCİ KEZ YÜKLENİRSE: komisyon tarifesi ekranındaki "aynı
 *  pencere ikinci kez: üzerine yazılır" kararıyla AYNI gerekçe — kanalın
 *  yayımladığı bir olgu, düzeltilmiş bir dosya ikinci kez gelebilir. Kullanıcı
 *  ÖNİZLEMEDE görür ve açıkça onaylarsa o tarihin ESKİ satırları silinip
 *  YENİDEN yazılır; onaylamazsa hiçbir şey değişmez.
 * ============================================================================
 */

const HB_PDF_TASIYICI_ESLEME: Record<string, string> = {
  "Aras Kargo": "Aras Kargo",
  "DHL Kargo": "DHL",
  hepsiJET: "hepsiJET",
  "Kolay Gelsin": "Kolay Gelsin",
  "PTT Kargo": "PTT Kargo",
  "Sürat Kargo": "Sürat Kargo",
  "Yurtiçi Kargo": "Yurtiçi Kargo",
  "Ceva Tedarik": "CEVA Tedarik",
  "Ceva Lojistik": "CEVA Lojistik",
  "hepsiJET XL": "hepsiJET XL",
  "Horoz Lojistik": "Horoz Lojistik",
};

export type KargoTarifeYazHatasi =
  | KargoTarifePdfHatasi
  | "KANAL_YOK"
  | "TASIYICI_ESLESEMEDI"
  | "TASIYICI_DB_YOK";

export type KargoTarifeYuklemeSonucu =
  | { durum: "HATA"; kod: KargoTarifeYazHatasi; ayrinti: string; eslesmeyenler?: string[] }
  | {
      durum: "ONIZLEME";
      etkinTarih: Date;
      uyarilar: string[];
      rapor: {
        okunanSatir: number;
        yazilacakDeger: number;
        ayniKalan: number;
        degisen: number;
        yeni: number;
      };
      ornekDegisenler: { tasiyici: string; desi: number; eski: number; yeni: number }[];
      /** Bu tarih için ZATEN kayıt var VE en az bir değer farklı — onay ister. */
      uzerineYazmaGerekli: boolean;
      /** Bu tarih için kayıt var ve TÜM değerler zaten aynı — yazmanın anlamı yok. */
      zatenAyni: boolean;
    }
  | { durum: "YAZILDI"; etkinTarih: Date; yazilanSatir: number };

async function ortakDenetle(dosya: Buffer) {
  const okuma = await hbKargoTarifesiPdfOku(new Uint8Array(dosya));
  if (!okuma.tamam) {
    return { tamam: false as const, sonuc: { durum: "HATA" as const, kod: okuma.kod, ayrinti: okuma.ayrinti } };
  }

  const kanal = await prisma.channel.findFirst({ where: { name: { contains: "Hepsiburada" } }, select: { id: true } });
  if (!kanal) {
    return {
      tamam: false as const,
      sonuc: { durum: "HATA" as const, kod: "KANAL_YOK" as const, ayrinti: "Hepsiburada kanalı bulunamadı" },
    };
  }

  const eslesmeyenler = okuma.sutunlar.filter((s) => !(s in HB_PDF_TASIYICI_ESLEME));
  if (eslesmeyenler.length > 0) {
    return {
      tamam: false as const,
      sonuc: {
        durum: "HATA" as const,
        kod: "TASIYICI_ESLESEMEDI" as const,
        ayrinti: `PDF'te bilinen 11 taşıyıcı dışında sütun var: ${eslesmeyenler.join(" · ")}`,
        eslesmeyenler,
      },
    };
  }

  const dbAdlari = okuma.sutunlar.map((s) => HB_PDF_TASIYICI_ESLEME[s]!);
  const tasiyicilar = await prisma.cargoCarrier.findMany({
    where: { name: { in: dbAdlari } },
    select: { id: true, name: true },
  });
  const idHaritasi = new Map(tasiyicilar.map((t) => [t.name, t.id]));
  const eksikDb = dbAdlari.filter((ad) => !idHaritasi.has(ad));
  if (eksikDb.length > 0) {
    return {
      tamam: false as const,
      sonuc: {
        durum: "HATA" as const,
        kod: "TASIYICI_DB_YOK" as const,
        ayrinti: `Sistemde bu taşıyıcılar tanımlı değil: ${eksikDb.join(" · ")}`,
        eslesmeyenler: eksikDb,
      },
    };
  }

  return { tamam: true as const, okuma, kanalId: kanal.id, idHaritasi };
}

/** Adım 1 — çözüm, taşıyıcı eşleşmesi, fark ölçümü. HİÇBİR ŞEY YAZMAZ. */
export async function kargoTarifeDenetle(dosya: Buffer): Promise<KargoTarifeYuklemeSonucu> {
  const on = await ortakDenetle(dosya);
  if (!on.tamam) return on.sonuc;
  const { okuma, kanalId, idHaritasi } = on;

  /**
   * MEVCUT EN GÜNCEL TARİFE — fark ölçümü tabanı. `canli-hb-kargo-tarifesi-
   * yukle.ts` ile AYNI yöntem: her taşıyıcı için en son effectiveFrom.
   */
  const mevcutTumu = await prisma.cargoTariff.findMany({
    where: { channelId: kanalId },
    select: { carrierId: true, desi: true, amount: true, effectiveFrom: true },
  });
  const enSonEffectiveFrom = new Map<string, Date>();
  for (const r of mevcutTumu) {
    const su = enSonEffectiveFrom.get(r.carrierId);
    if (!su || r.effectiveFrom > su) enSonEffectiveFrom.set(r.carrierId, r.effectiveFrom);
  }
  const mevcutHarita = new Map<string, number>();
  for (const r of mevcutTumu) {
    if (r.effectiveFrom.getTime() !== enSonEffectiveFrom.get(r.carrierId)?.getTime()) continue;
    mevcutHarita.set(`${r.carrierId}:${r.desi}`, Number(r.amount.toString()));
  }

  /** BU TARİH İÇİN ZATEN SATIR VAR MI — üzerine yazma kararı için. */
  const ayniTarihSatirlari = mevcutTumu.filter(
    (r) => r.effectiveFrom.getTime() === okuma.etkinTarih.getTime(),
  );
  const ayniTarihHarita = new Map(
    ayniTarihSatirlari.map((r) => [`${r.carrierId}:${r.desi}`, Number(r.amount.toString())]),
  );

  let ayniKalan = 0;
  let degisen = 0;
  let yeni = 0;
  let yazilacakDeger = 0;
  const ornekDegisenler: { tasiyici: string; desi: number; eski: number; yeni: number }[] = [];
  let ayniTarihFarkli = false;

  for (const satir of okuma.satirlar) {
    for (const d of satir.degerler) {
      yazilacakDeger++;
      const cid = idHaritasi.get(HB_PDF_TASIYICI_ESLEME[d.ad]!)!;
      const anahtar = `${cid}:${satir.desi}`;
      const eski = mevcutHarita.get(anahtar);
      if (eski === undefined) yeni++;
      else if (Math.abs(eski - d.tutar) > 0.005) {
        degisen++;
        if (ornekDegisenler.length < 15) {
          ornekDegisenler.push({ tasiyici: d.ad, desi: satir.desi, eski, yeni: d.tutar });
        }
      } else ayniKalan++;

      const ayniTarihEski = ayniTarihHarita.get(anahtar);
      if (ayniTarihEski !== undefined && Math.abs(ayniTarihEski - d.tutar) > 0.005) {
        ayniTarihFarkli = true;
      }
    }
  }

  return {
    durum: "ONIZLEME",
    etkinTarih: okuma.etkinTarih,
    uyarilar: okuma.uyarilar,
    rapor: { okunanSatir: okuma.satirlar.length, yazilacakDeger, ayniKalan, degisen, yeni },
    ornekDegisenler,
    uzerineYazmaGerekli: ayniTarihSatirlari.length > 0 && ayniTarihFarkli,
    zatenAyni: ayniTarihSatirlari.length > 0 && !ayniTarihFarkli,
  };
}

/**
 * Adım 2 — yazma. Önizleme ile AYNI yoldan geçer.
 * `uzerineYazOnay`: kullanıcı "bu tarih için zaten kayıt var, üzerine yaz"
 * uyarısını GÖRDÜKTEN sonra `true` geçer — görmeden yazma YOK.
 */
export async function kargoTarifeYaz(
  dosya: Buffer,
  uzerineYazOnay: boolean,
): Promise<KargoTarifeYuklemeSonucu> {
  const on = await ortakDenetle(dosya);
  if (!on.tamam) return on.sonuc;
  const { okuma, kanalId, idHaritasi } = on;

  const ayniTarihSatirSayisi = await prisma.cargoTariff.count({
    where: { channelId: kanalId, effectiveFrom: okuma.etkinTarih },
  });
  if (ayniTarihSatirSayisi > 0 && !uzerineYazOnay) {
    /**
     * ⛔ ÖNİZLEME BUNU ZATEN GÖSTERDİ (uzerineYazmaGerekli/zatenAyni) — bu
     * yalnız "önizleme atlanıp doğrudan yaz çağrıldı" senaryosuna karşı
     * SUNUCU TARAFI kapı. İstemci kapısı tek başına yeterli sayılmaz.
     */
    const onizleme = await kargoTarifeDenetle(dosya);
    return onizleme;
  }

  const yazilacak: {
    channelId: string;
    carrierId: string;
    desi: number;
    amount: string;
    effectiveFrom: Date;
    currency: "TRY";
  }[] = [];
  for (const satir of okuma.satirlar) {
    for (const d of satir.degerler) {
      yazilacak.push({
        channelId: kanalId,
        carrierId: idHaritasi.get(HB_PDF_TASIYICI_ESLEME[d.ad]!)!,
        desi: satir.desi,
        amount: d.tutar.toFixed(4),
        effectiveFrom: okuma.etkinTarih,
        currency: "TRY",
      });
    }
  }

  if (ayniTarihSatirSayisi > 0) {
    await prisma.cargoTariff.deleteMany({ where: { channelId: kanalId, effectiveFrom: okuma.etkinTarih } });
  }
  let yazilan = 0;
  for (let i = 0; i < yazilacak.length; i += 2000) {
    const parca = yazilacak.slice(i, i + 2000);
    const sonuc = await prisma.cargoTariff.createMany({ data: parca, skipDuplicates: true });
    yazilan += sonuc.count;
  }

  return { durum: "YAZILDI", etkinTarih: okuma.etkinTarih, yazilanSatir: yazilan };
}
