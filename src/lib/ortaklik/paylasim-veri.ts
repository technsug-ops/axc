import { prisma } from "@/lib/prisma";
import { gunMetni, isTakvimGunu, gunDegeri, pencereOlustur } from "@/lib/donem";
import { projeSonucuGetir } from "@/lib/ortaklik/sonuc-veri";
import { projeGiderleriGetir } from "@/lib/ortaklik/gider-veri";
import { gunAgirlikliSermaye, paylasimHesapla, type AnlasmaSurumu, type AyGirdisi } from "@/lib/ortaklik/paylasim";

/** İstanbul takvim günü → "YYYY-AA-GG" (saat dilimi tek yerden: `isTakvimGunu`). */
const gunAnahtari = (an: Date) => gunMetni(gunDegeri(isTakvimGunu(an)));
const ayAnahtari = (an: Date) => gunAnahtari(an).slice(0, 7);

/** Başlangıç ayından son aya kadar "YYYY-AA" listesi. */
export function aylarArasi(bas: string, son: string): string[] {
  const liste: string[] = [];
  let [y, m] = bas.split("-").map(Number);
  const [sy, sm] = son.split("-").map(Number);
  while (y < sy || (y === sy && m <= sm)) {
    liste.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return liste;
}

/**
 * İNCE KABUK — dönem sonuçları 3a/3b'nin AYNI gövdelerinden (tek pencerede okunup aya
 * bölünür; proje sonucu ekranıyla aynı rakam), sermaye Finansman'dan, sürümler anlaşmadan.
 */
export async function paylasimGetir(proje: { id: string; currency: string; baslangic: Date }, sonAy: string) {
  const ilkAy = gunMetni(proje.baslangic).slice(0, 7);
  const aylar = sonAy < ilkAy ? [] : aylarArasi(ilkAy, sonAy);
  const [yil, ayNo] = sonAy.split("-").map(Number);
  const sonGun = `${sonAy}-${String(new Date(Date.UTC(yil, ayNo, 0)).getUTCDate()).padStart(2, "0")}`;

  const [surumKayitlari, katilimlar] = await Promise.all([
    prisma.ortaklikAnlasmasi.findMany({ where: { projeId: proje.id }, include: { paylar: true }, orderBy: { gecerlilikAyi: "asc" } }),
    prisma.ortaklikKatilimi.findMany({
      where: { projeId: proje.id },
      select: {
        id: true,
        ortak: { select: { ad: true } },
        finansmanKaynaklari: { select: { tur: true, hareketler: { where: { gerceklestiAt: { not: null } }, select: { tur: true, anapara: true, gerceklestiAt: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const surumler: AnlasmaSurumu[] = surumKayitlari.map((s) => ({
    id: s.id,
    gecerlilikAyi: gunMetni(s.gecerlilikAyi).slice(0, 7),
    kalanYontemi: s.kalanYontemi,
    karmaSermayeYuzdesi: s.karmaSermayeYuzdesi === null ? null : Number(s.karmaSermayeYuzdesi),
    zararYontemi: s.zararYontemi,
    karKullanimi: s.karKullanimi,
    paylar: s.paylar.map((p) => ({ katilimId: p.katilimId, sabitOran: Number(p.sabitOran), emekUcreti: Number(p.emekUcreti), sorumlulukPayi: Number(p.sorumlulukPayi) })),
  }));

  if (!aylar.length) return { aylar: [], surumler, surumKayitlari, katilimlar, sonuclar: [], karYok: {} as Record<string, number> };

  const pencere = pencereOlustur("OZEL", new Date(), { baslangic: `${ilkAy}-01`, bitis: sonGun });
  const [satis, gider] = await Promise.all([projeSonucuGetir(proje, pencere), projeGiderleriGetir(proje.id, pencere)]);

  const sonucAyi: Record<string, number> = {};
  const karYok: Record<string, number> = {};
  for (const r of satis.satirlar) {
    const ay = ayAnahtari(r.tarih);
    if (r.durum !== "HESAPLANDI") { karYok[ay] = (karYok[ay] ?? 0) + 1; continue; }
    sonucAyi[ay] = (sonucAyi[ay] ?? 0) + (r.net2 ?? 0) + r.iadeNet2;
  }
  // Gider `spentAt` UTC gece yarısı çapalı GÜN alanıdır → gün metni doğrudan okunur.
  for (const g of gider.satirlar) {
    const ay = gunMetni(g.tarih).slice(0, 7);
    sonucAyi[ay] = (sonucAyi[ay] ?? 0) - g.projeyeDusen;
  }

  /** Katkı kuralı Finansman ile AYNI: SERMAYE → GİRİŞ · ORTAK_BORCU → SERMAYEYE MAHSUP. */
  const katkilar: Record<string, { gun: string; tutar: number }[]> = {};
  for (const k of katilimlar) {
    katkilar[k.id] = k.finansmanKaynaklari.flatMap((f) =>
      f.hareketler
        .filter((h) => (f.tur === "SERMAYE" && h.tur === "GIRIS") || (f.tur === "ORTAK_BORCU" && h.tur === "SERMAYEYE_MAHSUP"))
        .map((h) => ({ gun: gunAnahtari(h.gerceklestiAt!), tutar: Number(h.anapara) })),
    );
  }

  const girdiler: AyGirdisi[] = aylar.map((ay) => ({
    ay,
    sonuc: sonucAyi[ay] ?? 0,
    sermaye: Object.fromEntries(katilimlar.map((k) => [k.id, gunAgirlikliSermaye(katkilar[k.id], ay)])),
  }));

  return { aylar, surumler, surumKayitlari, katilimlar, sonuclar: paylasimHesapla(girdiler, surumler), karYok };
}
