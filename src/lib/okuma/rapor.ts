import { gunDegeri, gunEkle, isTakvimGunu } from "@/lib/donem";
import { prisma } from "@/lib/prisma";
import {
  OKUMA_KOVALARI,
  bosSayim,
  eylemKovasi,
  kovaEylemi,
  type KovaSayimi,
} from "@/lib/okuma/kova";

/**
 * ============================================================================
 *  DEPO OKUMASI — HAFTALIK ÖZET (K34a ⑤)
 * ----------------------------------------------------------------------------
 *  Mimar: _"haftalık özet — kova dağılımı ve oranları. Tek 'bulunamadı'
 *  rakamı BASMA."_
 *
 *  ⚠ SAAT DİLİMİ TUZAĞI — VE BU DEPODA DAHA ÖNCE YAŞANDI. `AuditLog.createdAt`
 *  bir ANDIR (gerçek zaman damgası); iş tarihleri ise UTC GECE YARISI olarak
 *  saklanır. İkisini doğrudan karşılaştırmak İstanbul'da üç saatlik bir kayma
 *  demektir: gece 00:00–03:00 arasında okutulan bir barkod BİR ÖNCEKİ haftaya
 *  düşer ve rakamlar kendi içinde tutarlı göründüğü için kimse fark etmez.
 *  (Anayasa: _"dış kaynağın kendi etiketiyle karşılaştır — iç tutarlılık
 *  kaymayı gizler"_; komisyon denetiminde tam bu olmuştu.)
 *
 *  ÇARE: hiçbir yerde tarih aritmetiği yapılmıyor. Her satırın anı
 *  `isTakvimGunu` ile İSTANBUL takvim gününe çevriliyor, kovalama o gün
 *  üzerinden yapılıyor.
 * ============================================================================
 */

/** Kaç hafta gösterilir. Dört hafta, bir aylık deseni görmeye yeter. */
export const HAFTA_SAYISI = 4;

export type HaftaOzeti = {
  /** `2026-08-17` — sıralama ve React anahtarı için. */
  anahtar: string;
  /** Haftanın ilk günü (Pazartesi), İstanbul takvimine göre. */
  baslangic: Date;
  /** Haftanın son günü (Pazar) — DAHİL. */
  sonGun: Date;
  sayim: KovaSayimi;
};

export type OkumaRaporu = {
  haftalar: HaftaOzeti[];
  /** Gösterilen pencerenin tamamı — İlke #15: tek tek gösterilenin toplamı da yazar. */
  toplam: KovaSayimi;
  /**
   * ⚠ AYRIŞTIRILAMAYAN SATIR SAYISI — ayrı sayılır ve ekranda yazar.
   * Anayasa: _"boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
   * değildir"_. Bir izin `detail`i bozuksa o okuma "yok" değildir; sayılamamıştır.
   */
  cozulemeyen: number;
};

/** Bir günün içinde bulunduğu haftanın Pazartesi'si (UTC gece yarısı gösterimi). */
export function pazartesiBasi(gun: Date): Date {
  /* getUTCDay: 0=Pazar … 6=Cumartesi. Pazartesi'ye kaç gün geri gidilecek. */
  const geri = (gun.getUTCDay() + 6) % 7;
  return gunEkle(gun, -geri);
}

function anahtarla(tarih: Date): string {
  return tarih.toISOString().slice(0, 10);
}

/**
 * BİR ANIN DÜŞTÜĞÜ HAFTANIN ANAHTARI — kaymanın engellendiği tek nokta.
 *
 * ⚠ AYRI FONKSİYON OLMASI BİLEREK: kovalama döngünün içinde kalsaydı bekçi
 * onu ancak veritabanıyla sınayabilirdi, yani pratikte hiç sınayamazdı.
 * Burada saf: `2026-08-16T21:30:00Z` (İstanbul'da 17 Ağustos Pazartesi
 * 00:30) → `2026-08-17` haftası. UTC'ye göre kesilseydi bir önceki haftaya
 * düşerdi ve rakamlar kendi içinde tutarlı göründüğü için kimse fark etmezdi.
 */
export function haftaAnahtari(an: Date): string {
  return anahtarla(pazartesiBasi(gunDegeri(isTakvimGunu(an))));
}

export async function okumaRaporu(su_an: Date): Promise<OkumaRaporu> {
  const buGun = gunDegeri(isTakvimGunu(su_an));
  const buHafta = pazartesiBasi(buGun);
  const ilkHafta = gunEkle(buHafta, -7 * (HAFTA_SAYISI - 1));

  /**
   * ⚠ SORGU SINIRI CÖMERT TUTULUYOR (bir gün geriden). İstanbul günü UTC'den
   * üç saat ÖNCE başlar; sınırı tam UTC gece yarısına koysaydık haftanın ilk
   * üç saatinde okutulanlar sorgudan düşerdi. Kesin kovalama zaten aşağıda,
   * takvim günü üzerinden yapılıyor — buradaki sınır yalnız satır sayısını
   * makul tutmak için.
   */
  const izler = await prisma.auditLog.findMany({
    where: {
      action: { in: OKUMA_KOVALARI.map(kovaEylemi) },
      createdAt: { gte: gunEkle(ilkHafta, -1) },
    },
    select: { action: true, createdAt: true },
  });

  const haftalar: HaftaOzeti[] = [];
  const indeks = new Map<string, HaftaOzeti>();
  for (let i = 0; i < HAFTA_SAYISI; i += 1) {
    const baslangic = gunEkle(ilkHafta, 7 * i);
    const hafta: HaftaOzeti = {
      anahtar: anahtarla(baslangic),
      baslangic,
      sonGun: gunEkle(baslangic, 6),
      sayim: bosSayim(),
    };
    haftalar.push(hafta);
    indeks.set(hafta.anahtar, hafta);
  }

  const toplam = bosSayim();
  let cozulemeyen = 0;

  for (const iz of izler) {
    const kova = eylemKovasi(iz.action);
    if (!kova) {
      cozulemeyen += 1;
      continue;
    }
    /* ANI İSTANBUL TAKVİM GÜNÜNE ÇEVİR — kayma buradan engelleniyor. */
    const hafta = indeks.get(haftaAnahtari(iz.createdAt));
    /* Pencerenin dışına düşenler (cömert sınırın getirdikleri) sayılmaz. */
    if (!hafta) continue;
    hafta.sayim[kova] += 1;
    toplam[kova] += 1;
  }

  return { haftalar, toplam, cozulemeyen };
}
