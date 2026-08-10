import { alimNoOnEki, alimNoUret, gunKodu, sonrakiSira } from "@/lib/kimlik";

/**
 * ============================================================================
 *  ALIM NUMARASI ÜRETİMİ
 * ----------------------------------------------------------------------------
 *  ALM-HE-260811-01  =  sabit önek · tedarikçi kodu · gün · gün içi sıra
 *
 *  NEDEN SİSTEM ÜRETİYOR:
 *  Elle girilen alım kodları bilgi taşımıyordu — canlıda "ewe", "wew",
 *  "25-23" gibi kayıtlar vardı. Alım numarası salt KAYIT KİMLİĞİDİR;
 *  yaratıcılık payı yoktur, o yüzden elle giriş kapalıdır.
 *
 *  TEDARİKÇİNİN SİPARİŞ NUMARASI AYRI ALANDA (`supplierOrderNo`). Canlıdaki
 *  "405-8780105-5340330" gibi değerler ÇÖP DEĞİL — tedarikçiye "şu siparişte
 *  sorun var" derken söylenen numaralar. İkisi ayrı sorunun cevabı.
 *
 *  SIRA NUMARASI İŞLEM İÇİNDE ÇÖZÜLÜR: aynı gün aynı tedarikçiden ikinci alım
 *  girilirken sıra yeniden okunur. Yine de yarış olursa `code` alanındaki
 *  benzersizlik kısıtı yakalar ve çağıran yeniden dener.
 * ============================================================================
 */

/** Sorgu için yeterli olan en dar arayüz — hem `prisma` hem `tx` uyar. */
type AlimOkuyucu = {
  purchase: {
    findMany(args: {
      where: { code: { startsWith: string } };
      select: { code: true };
    }): Promise<{ code: string }[]>;
  };
};

/**
 * O gün o tedarikçi için sıradaki alım numarasını üretir.
 *
 * @param db  Prisma istemcisi ya da açık transaction — sıra, numarayı
 *            yazacak işlemin İÇİNDE okunmalı.
 * @param tedarikciKodu  Tedarikçi kaydındaki kod (HE, AM...).
 * @param an  "Şu an". Gün kodu İŞ saat diliminden çözülür.
 */
export async function alimNoOlustur(
  db: AlimOkuyucu,
  tedarikciKodu: string,
  an: Date,
): Promise<string> {
  const gun = gunKodu(an);
  const onEk = alimNoOnEki({ tedarikciKodu, gun });

  const mevcutlar = await db.purchase.findMany({
    where: { code: { startsWith: onEk } },
    select: { code: true },
  });

  const sira = sonrakiSira(
    mevcutlar.map((a) => a.code),
    onEk,
  );

  return alimNoUret({ tedarikciKodu, gun, sira });
}

/**
 * Benzersizlik yarışına karşı yeniden deneme.
 * Tek kullanıcıda pratikte hiç tetiklenmez; iki sekmeden aynı anda kayıt
 * yapılırsa ikinci deneme bir sonraki sırayı alır.
 */
export const ALIM_NO_DENEME = 3;
