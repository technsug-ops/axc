import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";

import { adDogrula, gunMetni, tarihDogrula, turDogrula, type AdHatasi, type OzelGunTuru, type TarihHatasi } from "./ozel-gun";

/**
 * ============================================================================
 *  ÖZEL GÜN TAKVİMİ — YAZMA (K363 Faz 2-b)
 * ----------------------------------------------------------------------------
 *  Takvim AYAR VERİSİDİR (stok/para defteri değil): düzeltilebilir ve tarih
 *  silinebilir. Yine de her yazım İZ bırakır (`OZEL_GUN_*`, eski ve yeni değer)
 *  — «bu bayramın tarihini kim değiştirdi» sorusu cevapsız kalmasın.
 *  ⚠ GEÇMİŞİ OLAN GÜN SİLİNMEZ, PASİFE ALINIR: geçmiş tarih «geçen yılki
 *  karşılık» olarak bugünün kıyasını besler; silinirse gelecek yılın kıyası
 *  sessizce kaybolur. Gelecek tarihleri olan gün silinebilir (henüz kıyas
 *  beslemiyor). Ölçüt kaydın HÂLİNDEN hesaplanır (bugünden önce başlayan tarih
 *  var mı) — liste tutulmaz.
 *  Hata KOD döner; metne ekran çevirir.
 * ============================================================================
 */

export type YazHatasi = AdHatasi | TarihHatasi | "TUR_GECERSIZ" | "AD_VAR" | "TARIH_VAR" | "YOK" | "GECMISI_VAR" | "KANAL_YOK";
export type YazSonucu = { tamam: true; id: string } | { tamam: false; hata: YazHatasi };

const benzersizlikMi = (e: unknown) =>
  typeof e === "object" && e !== null && "code" in e && String((e as { code: unknown }).code) === "P2002";

export type GunGirdisi = { ad: string; tur: string; channelId: string | null; aciklama: string | null };
export type TarihGirdisi = { baslangic: string; bitis: string; kaynak: string | null; dogrulandi: boolean };

async function gunGirdisiCoz(g: GunGirdisi): Promise<
  { tamam: true; ad: string; tur: OzelGunTuru; channelId: string | null; aciklama: string | null } | { tamam: false; hata: YazHatasi }
> {
  const ad = adDogrula(g.ad);
  if (!ad.tamam) return ad;
  const tur = turDogrula(g.tur);
  if (tur === null) return { tamam: false, hata: "TUR_GECERSIZ" };
  const channelId = g.channelId?.trim() || null;
  if (channelId !== null && (await prisma.channel.count({ where: { id: channelId } })) === 0) return { tamam: false, hata: "KANAL_YOK" };
  const aciklama = g.aciklama?.trim() || null;
  return { tamam: true, ad: ad.ad, tur, channelId, aciklama };
}

const kaynakTemiz = (k: string | null) => (k?.trim() || null)?.slice(0, 191) ?? null;

/** Yeni özel gün + ilk tarihi (tek işlem; biri düşerse ikisi de yazılmaz). */
export async function ozelGunEkle(g: GunGirdisi, t: TarihGirdisi): Promise<YazSonucu> {
  const gun = await gunGirdisiCoz(g);
  if (!gun.tamam) return gun;
  const tarih = tarihDogrula(t.baslangic, t.bitis);
  if (!tarih.tamam) return tarih;
  try {
    const id = await prisma.$transaction(async (tx) => {
      const yeni = await tx.ozelGun.create({
        data: { ad: gun.ad, tur: gun.tur, channelId: gun.channelId, aciklama: gun.aciklama },
        select: { id: true },
      });
      await tx.ozelGunTarihi.create({
        data: { ozelGunId: yeni.id, baslangic: tarih.baslangic, bitis: tarih.bitis, kaynak: kaynakTemiz(t.kaynak), dogrulandi: t.dogrulandi },
      });
      await izYaz(
        {
          action: "OZEL_GUN_EKLE",
          targetType: "OzelGun",
          targetId: yeni.id,
          detail: JSON.stringify({ ad: gun.ad, tur: gun.tur, channelId: gun.channelId, baslangic: gunMetni(tarih.baslangic), bitis: gunMetni(tarih.bitis), dogrulandi: t.dogrulandi }),
        },
        tx,
      );
      return yeni.id;
    });
    return { tamam: true, id };
  } catch (e) {
    if (benzersizlikMi(e)) return { tamam: false, hata: "AD_VAR" };
    throw e;
  }
}

export async function ozelGunGuncelle(id: string, g: GunGirdisi): Promise<YazSonucu> {
  const gun = await gunGirdisiCoz(g);
  if (!gun.tamam) return gun;
  try {
    return await prisma.$transaction(async (tx) => {
      const eski = await tx.ozelGun.findUnique({ where: { id }, select: { ad: true, tur: true, channelId: true, aciklama: true } });
      if (!eski) return { tamam: false, hata: "YOK" } as const;
      await tx.ozelGun.update({ where: { id }, data: { ad: gun.ad, tur: gun.tur, channelId: gun.channelId, aciklama: gun.aciklama } });
      await izYaz(
        { action: "OZEL_GUN_DUZELT", targetType: "OzelGun", targetId: id, detail: JSON.stringify({ eski, yeni: { ad: gun.ad, tur: gun.tur, channelId: gun.channelId, aciklama: gun.aciklama } }) },
        tx,
      );
      return { tamam: true, id } as const;
    });
  } catch (e) {
    if (benzersizlikMi(e)) return { tamam: false, hata: "AD_VAR" };
    throw e;
  }
}

export async function ozelGunAktifDegistir(id: string, aktif: boolean): Promise<YazSonucu> {
  return prisma.$transaction(async (tx) => {
    const eski = await tx.ozelGun.findUnique({ where: { id }, select: { aktif: true } });
    if (!eski) return { tamam: false, hata: "YOK" } as const;
    await tx.ozelGun.update({ where: { id }, data: { aktif } });
    await izYaz({ action: aktif ? "OZEL_GUN_AKTIF" : "OZEL_GUN_PASIF", targetType: "OzelGun", targetId: id, detail: JSON.stringify({ eski: eski.aktif, yeni: aktif }) }, tx);
    return { tamam: true, id } as const;
  });
}

/** Siler — ancak bugünden önce başlayan tarihi YOKSA (geçmişi olan pasife alınır). `bugun` İstanbul günü etiketi. */
export async function ozelGunSil(id: string, bugun: Date): Promise<YazSonucu> {
  return prisma.$transaction(async (tx) => {
    const eski = await tx.ozelGun.findUnique({
      where: { id },
      select: { ad: true, tur: true, tarihler: { select: { baslangic: true, bitis: true } } },
    });
    if (!eski) return { tamam: false, hata: "YOK" } as const;
    if (eski.tarihler.some((t) => t.baslangic.getTime() < bugun.getTime())) return { tamam: false, hata: "GECMISI_VAR" } as const;
    await tx.ozelGun.delete({ where: { id } });
    await izYaz(
      {
        action: "OZEL_GUN_SIL",
        targetType: "OzelGun",
        targetId: id,
        detail: JSON.stringify({ ad: eski.ad, tur: eski.tur, tarihler: eski.tarihler.map((t) => [gunMetni(t.baslangic), gunMetni(t.bitis)]) }),
      },
      tx,
    );
    return { tamam: true, id } as const;
  });
}

export async function tarihEkle(ozelGunId: string, t: TarihGirdisi): Promise<YazSonucu> {
  const tarih = tarihDogrula(t.baslangic, t.bitis);
  if (!tarih.tamam) return tarih;
  try {
    return await prisma.$transaction(async (tx) => {
      if ((await tx.ozelGun.count({ where: { id: ozelGunId } })) === 0) return { tamam: false, hata: "YOK" } as const;
      const yeni = await tx.ozelGunTarihi.create({
        data: { ozelGunId, baslangic: tarih.baslangic, bitis: tarih.bitis, kaynak: kaynakTemiz(t.kaynak), dogrulandi: t.dogrulandi },
        select: { id: true },
      });
      await izYaz(
        {
          action: "OZEL_GUN_TARIH_EKLE",
          targetType: "OzelGunTarihi",
          targetId: yeni.id,
          detail: JSON.stringify({ ozelGunId, baslangic: gunMetni(tarih.baslangic), bitis: gunMetni(tarih.bitis), kaynak: kaynakTemiz(t.kaynak), dogrulandi: t.dogrulandi }),
        },
        tx,
      );
      return { tamam: true, id: yeni.id } as const;
    });
  } catch (e) {
    if (benzersizlikMi(e)) return { tamam: false, hata: "TARIH_VAR" };
    throw e;
  }
}

export async function tarihGuncelle(tarihId: string, t: TarihGirdisi): Promise<YazSonucu> {
  const tarih = tarihDogrula(t.baslangic, t.bitis);
  if (!tarih.tamam) return tarih;
  try {
    return await prisma.$transaction(async (tx) => {
      const eski = await tx.ozelGunTarihi.findUnique({ where: { id: tarihId }, select: { baslangic: true, bitis: true, kaynak: true, dogrulandi: true } });
      if (!eski) return { tamam: false, hata: "YOK" } as const;
      await tx.ozelGunTarihi.update({
        where: { id: tarihId },
        data: { baslangic: tarih.baslangic, bitis: tarih.bitis, kaynak: kaynakTemiz(t.kaynak), dogrulandi: t.dogrulandi },
      });
      await izYaz(
        {
          action: "OZEL_GUN_TARIH_DUZELT",
          targetType: "OzelGunTarihi",
          targetId: tarihId,
          detail: JSON.stringify({
            eski: { baslangic: gunMetni(eski.baslangic), bitis: gunMetni(eski.bitis), kaynak: eski.kaynak, dogrulandi: eski.dogrulandi },
            yeni: { baslangic: gunMetni(tarih.baslangic), bitis: gunMetni(tarih.bitis), kaynak: kaynakTemiz(t.kaynak), dogrulandi: t.dogrulandi },
          }),
        },
        tx,
      );
      return { tamam: true, id: tarihId } as const;
    });
  } catch (e) {
    if (benzersizlikMi(e)) return { tamam: false, hata: "TARIH_VAR" };
    throw e;
  }
}

export async function tarihSil(tarihId: string): Promise<YazSonucu> {
  return prisma.$transaction(async (tx) => {
    const eski = await tx.ozelGunTarihi.findUnique({ where: { id: tarihId }, select: { ozelGunId: true, baslangic: true, bitis: true, kaynak: true } });
    if (!eski) return { tamam: false, hata: "YOK" } as const;
    await tx.ozelGunTarihi.delete({ where: { id: tarihId } });
    await izYaz(
      {
        action: "OZEL_GUN_TARIH_SIL",
        targetType: "OzelGunTarihi",
        targetId: tarihId,
        detail: JSON.stringify({ ozelGunId: eski.ozelGunId, baslangic: gunMetni(eski.baslangic), bitis: gunMetni(eski.bitis), kaynak: eski.kaynak }),
      },
      tx,
    );
    return { tamam: true, id: tarihId } as const;
  });
}
