import { prisma } from "@/lib/prisma";
import type { KullanimCihazTuru } from "./olay";
import { isSaatDilimiFarki, kullanimListele, type KullanimListesi, type KullanimSekmesi } from "./firma-raporu";

export type { KullanimListesi };

/**
 * ============================================================================
 *  FİRMA KULLANIM RAPORU — VERİ (K334-③)
 * ----------------------------------------------------------------------------
 *  ⛔ HER SORGU FİRMAYA BAĞLI: `companyId` oturumdan gelir (sayfa verir).
 *  Çok-firma geldiğinde başka firmanın izi bu ekranda görünmez.
 *
 *  ⚠ SAYIMLAR VERİTABANINDA: satırlar çekilip uygulamada sayılmaz —
 *  `groupBy`/`count` kullanılır. Grup sayısı sınırlı bir küme (sayfa
 *  kalıpları, düğme yazıları); olay sayısıyla DOĞRUSAL büyüyen bir şey
 *  uygulamaya taşınmaz (anayasa: yavaşlık hacimle değil ölçeklenme
 *  biçimiyle açıklanır).
 *
 *  ⚠ ÖZET ARAMADAN BAĞIMSIZ (İlke #17): kutucuklar dönemin TAMAMINI sayar;
 *  arama yalnız listeyi daraltır ve liste «aramada N» der.
 * ============================================================================
 */

export type Aralik = { gte: Date; lt: Date } | undefined;

export type KullanimOzeti = {
  sayfa: number;
  tiklama: number;
  aktifGun: number;
  kullanici: number;
  cihaz: Record<KullanimCihazTuru, number>;
};

export type SayimSatiri = { ad: string; adet: number };
export type DugmeSatiri = SayimSatiri & { hedef: string; sayfa: string };
export type GecisSatiri = SayimSatiri & { nereden: string; nereye: string };
export type KullaniciSatiri = SayimSatiri & {
  kullaniciId: string | null;
  sayfa: number;
  tiklama: number;
  sonGorulme: Date | null;
};

/** Bütün sorguların ortak koşulu — firma + dönem. Tek gövde, iki yerde iki koşul olmaz. */
export function kullanimKosulu(companyId: string, aralik: Aralik) {
  return { companyId, ...(aralik ? { createdAt: aralik } : {}) };
}

/** Firmanın İLK izinin anı — izin doğum tarihi (öncesi için «kayıt yok» hüküm değildir). */
export async function ilkIzAni(companyId: string): Promise<Date | null> {
  const ilk = await prisma.kullanimOlayi.findFirst({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return ilk?.createdAt ?? null;
}

/** İstanbul gününe göre kaç farklı günde iz var. Tek sayı döner; günler uygulamaya çekilmez. */
async function aktifGunSay(companyId: string, aralik: Aralik): Promise<number> {
  const fark = isSaatDilimiFarki(new Date());
  const sonuc = aralik
    ? await prisma.$queryRaw<{ gun: bigint | number }[]>`
        SELECT COUNT(DISTINCT DATE(CONVERT_TZ(createdAt, '+00:00', ${fark}))) AS gun
        FROM KullanimOlayi
        WHERE companyId = ${companyId} AND createdAt >= ${aralik.gte} AND createdAt < ${aralik.lt}`
    : await prisma.$queryRaw<{ gun: bigint | number }[]>`
        SELECT COUNT(DISTINCT DATE(CONVERT_TZ(createdAt, '+00:00', ${fark}))) AS gun
        FROM KullanimOlayi
        WHERE companyId = ${companyId}`;
  return Number(sonuc[0]?.gun ?? 0);
}

export async function kullanimOzeti(companyId: string, aralik: Aralik): Promise<KullanimOzeti> {
  const kosul = kullanimKosulu(companyId, aralik);
  const [turler, cihazlar, kullanicilar, aktifGun] = await Promise.all([
    prisma.kullanimOlayi.groupBy({ by: ["tur"], where: kosul, _count: { _all: true } }),
    prisma.kullanimOlayi.groupBy({ by: ["cihaz"], where: kosul, _count: { _all: true } }),
    prisma.kullanimOlayi.groupBy({ by: ["userId"], where: kosul, _count: { _all: true } }),
    aktifGunSay(companyId, aralik),
  ]);
  const tur = (t: string) => turler.find((x) => x.tur === t)?._count._all ?? 0;
  const cihaz = (c: KullanimCihazTuru) => cihazlar.find((x) => x.cihaz === c)?._count._all ?? 0;
  return {
    sayfa: tur("SAYFA"),
    tiklama: tur("TIKLAMA"),
    aktifGun,
    kullanici: kullanicilar.length,
    cihaz: { TELEFON: cihaz("TELEFON"), TABLET: cihaz("TABLET"), MASAUSTU: cihaz("MASAUSTU") },
  };
}

const listele = kullanimListele;

/**
 * Arama koşulu. `q` metinde aranır (sütun harfe duyarsız); `ekKaliplar` menü
 * ADIYLA eşleşen sayfa kalıplarıdır — kullanıcı «/satislar» değil «Satışlar»
 * yazar (sayfa verir, sözlük ondadır).
 */
function aramaKosulu(alanlar: ("sayfa" | "oncekiSayfa" | "hedef")[], q: string, ekKaliplar: string[]) {
  if (q === "") return {};
  const veya: object[] = alanlar.map((a) => ({ [a]: { contains: q } }));
  for (const a of alanlar) if (a !== "hedef" && ekKaliplar.length > 0) veya.push({ [a]: { in: ekKaliplar } });
  return { OR: veya };
}

export async function sayfaListesi(companyId: string, aralik: Aralik, q: string, ekKaliplar: string[]) {
  const gruplar = await prisma.kullanimOlayi.groupBy({
    by: ["sayfa"],
    where: { AND: [kullanimKosulu(companyId, aralik), { tur: "SAYFA" }, aramaKosulu(["sayfa"], q, ekKaliplar)] },
    _count: { _all: true },
  });
  return listele(gruplar.map((g) => ({ ad: g.sayfa, adet: g._count._all })));
}

export async function dugmeListesi(companyId: string, aralik: Aralik, q: string, ekKaliplar: string[]) {
  const gruplar = await prisma.kullanimOlayi.groupBy({
    by: ["hedef", "sayfa"],
    where: {
      AND: [kullanimKosulu(companyId, aralik), { tur: "TIKLAMA" }, { hedef: { not: null } }, aramaKosulu(["hedef", "sayfa"], q, ekKaliplar)],
    },
    _count: { _all: true },
  });
  return listele<DugmeSatiri>(
    gruplar.map((g) => ({ ad: `${g.hedef ?? ""} ${g.sayfa}`, hedef: g.hedef ?? "", sayfa: g.sayfa, adet: g._count._all })),
  );
}

export async function gecisListesi(companyId: string, aralik: Aralik, q: string, ekKaliplar: string[]) {
  const gruplar = await prisma.kullanimOlayi.groupBy({
    by: ["oncekiSayfa", "sayfa"],
    where: {
      AND: [kullanimKosulu(companyId, aralik), { tur: "SAYFA" }, { oncekiSayfa: { not: null } }, aramaKosulu(["oncekiSayfa", "sayfa"], q, ekKaliplar)],
    },
    _count: { _all: true },
  });
  return listele<GecisSatiri>(
    gruplar.map((g) => ({ ad: `${g.oncekiSayfa ?? ""} ${g.sayfa}`, nereden: g.oncekiSayfa ?? "", nereye: g.sayfa, adet: g._count._all })),
  );
}

/**
 * Kullanıcı kırılımı. Arama ADDA/E-POSTADA yapılır (kullanıcı sayısı küçük ve
 * sınırlı — firma üyeleri). Silinmiş kullanıcının izi (`userId` boş) kaybolmaz,
 * kendi satırında durur.
 */
export async function kullaniciListesi(companyId: string, aralik: Aralik, q: string) {
  const gruplar = await prisma.kullanimOlayi.groupBy({
    by: ["userId", "tur"],
    where: kullanimKosulu(companyId, aralik),
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const idler = [...new Set(gruplar.map((g) => g.userId).filter((x): x is string => x !== null))];
  const kisiler = await prisma.user.findMany({ where: { id: { in: idler } }, select: { id: true, name: true, email: true } });

  const birlesik = new Map<string, KullaniciSatiri>();
  for (const g of gruplar) {
    const anahtar = g.userId ?? "";
    const kisi = kisiler.find((k) => k.id === g.userId);
    const satir = birlesik.get(anahtar) ?? {
      kullaniciId: g.userId,
      ad: kisi ? (kisi.name?.trim() || kisi.email) : "",
      adet: 0,
      sayfa: 0,
      tiklama: 0,
      sonGorulme: null,
    };
    const n = g._count._all;
    satir.adet += n;
    if (g.tur === "SAYFA") satir.sayfa += n;
    else satir.tiklama += n;
    const son = g._max.createdAt;
    if (son && (!satir.sonGorulme || son > satir.sonGorulme)) satir.sonGorulme = son;
    birlesik.set(anahtar, satir);
  }
  const aranan = q.toLocaleLowerCase("tr");
  const kalan = [...birlesik.values()].filter((s) => aranan === "" || s.ad.toLocaleLowerCase("tr").includes(aranan));
  /** Sütun toplamları da TAVANDAN ÖNCE, kümenin tamamından (İlke #15). */
  return {
    ...listele(kalan),
    toplamSayfa: kalan.reduce((t, s) => t + s.sayfa, 0),
    toplamTiklama: kalan.reduce((t, s) => t + s.tiklama, 0),
  };
}

export type SekmeVerisi =
  | { sekme: "sayfalar"; liste: KullanimListesi<SayimSatiri> }
  | { sekme: "dugmeler"; liste: KullanimListesi<DugmeSatiri> }
  | { sekme: "gecisler"; liste: KullanimListesi<GecisSatiri> }
  | { sekme: "kullanicilar"; liste: KullanimListesi<KullaniciSatiri> & { toplamSayfa: number; toplamTiklama: number } };

/** Yalnız AÇIK sekmenin listesi sorgulanır — görünmeyen üç liste için veritabanına gidilmez. */
export async function sekmeVerisi(
  sekme: KullanimSekmesi,
  companyId: string,
  aralik: Aralik,
  q: string,
  ekKaliplar: string[],
): Promise<SekmeVerisi> {
  switch (sekme) {
    case "sayfalar":
      return { sekme, liste: await sayfaListesi(companyId, aralik, q, ekKaliplar) };
    case "dugmeler":
      return { sekme, liste: await dugmeListesi(companyId, aralik, q, ekKaliplar) };
    case "gecisler":
      return { sekme, liste: await gecisListesi(companyId, aralik, q, ekKaliplar) };
    case "kullanicilar":
      return { sekme, liste: await kullaniciListesi(companyId, aralik, q) };
  }
}
