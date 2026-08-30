import { prisma } from "@/lib/prisma";
import { donemAnahtari, type DonemAnahtari } from "@/lib/donem-korumasi";
import { ayKaydir, isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  MUHASEBE DÖNEMİ — VERİ KATMANI (K108, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ DOSYA ADI `muhasebe-donemi` — `donem.ts` DEĞİL. `lib/donem.ts` zaten
 *  var ve BAŞKA bir şeyin dönemi: rapor/liste PENCERELERİ (`BU_AY`,
 *  `SON_3_AY`, takvim yardımcıları). İkisi karıştırılırsa aynı kelime iki
 *  farklı kavramı taşır — ve bu, K108'in kendi uyarısının tekrarı olurdu
 *  (`Settlement.periodStart` da "dönem" diyor ama pazaryerinin ödeme
 *  dönemini kastediyor).
 *
 *  ⚠ SATIR "AÇIK" DİYE DOĞMAZ — YOKLUK AÇIKTIR. Kapanmamış her ay için satır
 *  yazmak, hiç dokunulmamış 30 aya 30 satır açmak olurdu. Satır ancak
 *  KAPATILDIĞINDA doğar; satırı olmayan dönem AÇIKTIR.
 *
 *  ⚠ VE BU, "AÇIK DÖNEM YOKSA HER ŞEY SERBEST" kuralının şema tarafı: ilk
 *  kurulumda tablo boştur ve `donemKorumasi` boş kümede SERBEST döner.
 * ============================================================================
 */

/** KAPALI dönemlerin anahtar kümesi — kapının tek girdisi. */
export async function kapaliDonemler(
  db: { muhasebeDonemi: typeof prisma.muhasebeDonemi } = prisma,
): Promise<Set<DonemAnahtari>> {
  const satirlar = await db.muhasebeDonemi.findMany({
    where: { durum: "KAPALI" },
    select: { yil: true, ay: true },
  });
  return new Set(satirlar.map((s) => donemAnahtari(s.yil, s.ay)));
}

/**
 * Bir tarihin iş dönemi — İŞ SAAT DİLİMİNE göre.
 *
 * ⛔ `getFullYear()`/`getMonth()` KULLANILMAZ: onlar çalışma ortamının saat
 * dilimini okur ve anayasa bunu YASAKLIYOR (`Europe/Istanbul` sabit). Ayın
 * ilk ve son günündeki kayıtlar aksi hâlde yanlış döneme düşer — ve tam o
 * iki gün dönem kapanışının en hassas olduğu günlerdir.
 */
export function tarihinDonemi(tarih: Date): { yil: number; ay: number } {
  const g = isTakvimGunu(tarih);
  return { yil: g.yil, ay: g.ay };
}

export type DonemSatiri = {
  yil: number;
  ay: number;
  durum: "ACIK" | "KAPALI";
  kapatildiAt: Date | null;
  kapatanAdi: string | null;
  not: string | null;
};

/**
 * Ekranda gösterilecek dönem listesi — son N ay, en yeni önce.
 *
 * ⚠ LİSTE TAKVİMDEN ÜRETİLİR, TABLODAN DEĞİL. Tablo yalnız kapanmışları
 * tutuyor; ekran "hangi aylar var" sorusunu takvimle cevaplar ve kapanmış
 * olanların kaydını üstüne bindirir. Tablodan üretilseydi ekran yalnız
 * kapanmış ayları gösterir, KAPATILACAK ay hiç görünmezdi — yani ekran tam
 * da işe yarayacağı yerde boş kalırdı.
 */
export async function donemListesi(
  bugun: Date,
  kacAy = 14,
): Promise<DonemSatiri[]> {
  const su = tarihinDonemi(bugun);
  const kayitlar = await prisma.muhasebeDonemi.findMany({
    select: {
      yil: true,
      ay: true,
      durum: true,
      kapatildiAt: true,
      not: true,
      kapatan: { select: { name: true, email: true } },
    },
  });
  const harita = new Map(
    kayitlar.map((k) => [donemAnahtari(k.yil, k.ay), k] as const),
  );

  const cikti: DonemSatiri[] = [];
  for (let i = 0; i < kacAy; i++) {
    const { yil, ay } = ayKaydir(su.yil, su.ay, -i);
    const kayit = harita.get(donemAnahtari(yil, ay));
    cikti.push({
      yil,
      ay,
      durum: kayit?.durum ?? "ACIK",
      kapatildiAt: kayit?.kapatildiAt ?? null,
      kapatanAdi: kayit?.kapatan?.name ?? kayit?.kapatan?.email ?? null,
      not: kayit?.not ?? null,
    });
  }
  return cikti;
}

/**
 * Panelin göstereceği iki rakam: bugünün dönemi ve en son kapanan dönem.
 *
 * ⚠ "AÇIK DÖNEM SAYISI" DİYE BİR RAKAM YOK — kapanmamış her ay açıktır ve o
 * sayı sonsuza kadar büyür. Panelde anlamlı olan **bugünün dönemi** ile **en
 * son kapanış**; ikisi birlikte "nerede duruyoruz" sorusunu cevaplar.
 */
export async function donemOzeti(bugun: Date): Promise<{
  buDonem: { yil: number; ay: number };
  buDonemKapaliMi: boolean;
  sonKapanan: { yil: number; ay: number; kapatildiAt: Date | null } | null;
}> {
  const buDonem = tarihinDonemi(bugun);
  const [kapali, sonKapanan] = await Promise.all([
    prisma.muhasebeDonemi.findUnique({
      where: { yil_ay: { yil: buDonem.yil, ay: buDonem.ay } },
      select: { durum: true },
    }),
    prisma.muhasebeDonemi.findFirst({
      where: { durum: "KAPALI" },
      orderBy: [{ yil: "desc" }, { ay: "desc" }],
      select: { yil: true, ay: true, kapatildiAt: true },
    }),
  ]);
  return {
    buDonem,
    buDonemKapaliMi: kapali?.durum === "KAPALI",
    sonKapanan,
  };
}

/**
 * ISRAR EKRANINDAKİ SOMUT SAYI (kullanıcı şartı 31.08.2026).
 *
 * ⛔ _"Bu dönemde N satış hesaplandı, dönem kapatıldı. Yazarsanız o dönemin
 * rakamı değişir."_ Soyut bir uyarı ("bu dönem kapalı") okunmaz; RAKAM
 * okunur. Kullanıcı ne kadar şeyi etkilediğini görmeden ısrar edemez.
 *
 * ⚠ İPTALLER SAYILMAZ: iptal edilmiş satış ciroya, NET'e ve beyana zaten
 * girmiyor; onu saymak kaybı ABARTMAK olurdu.
 * _(Anayasa: "kayıp abartısı, kayıp küçültmesi kadar yanlıştır".)_
 */
export async function donemdekiSatisSayisi(
  yil: number,
  ay: number,
): Promise<number> {
  const bas = new Date(Date.UTC(yil, ay - 1, 1));
  const { yil: sYil, ay: sAy } = ayKaydir(yil, ay, 1);
  const bit = new Date(Date.UTC(sYil, sAy - 1, 1));
  return prisma.sale.count({
    where: { soldAt: { gte: bas, lt: bit }, iptalTarihi: null },
  });
}
