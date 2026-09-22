import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import {
  gecenGunHesapla,
  kargoOkuyucusuVarMi,
  type KargoKanalOzeti,
} from "@/lib/kargo/kanal-yetenegi";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

import { KanalKartlari } from "./kanal-kartlari";

/**
 * ============================================================================
 *  KARGO TARİFESİ — KANAL KARTLARI (K229, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  KULLANICI TESPİTİ: _"Bu sadece HB'ye özel değil, diğer pazaryerleri de
 *  arada bir değiştiriyor. Onlara has bir yer de olmalı."_
 *
 *  Eski ekran `/ayarlar/hb-kargo-tarife` idi — ADINDA kanal gömülüydü ve
 *  yalnız bir kanalı gösteriyordu. Anayasa: kanal VERİ olabilir, YAPI olamaz.
 *
 *  ⛔ VE EKRAN OLMAYINCA GÖRÜNMEYEN BİR ARIZA BÜYÜMÜŞ (ölçüldü 21.09.2026):
 *  Trendyol'un kargo tarifesi **seed'den** gelmiş (2026-07-16) ve bir daha
 *  tazelenmemiş — iki aydır TY satışlarının kargo maliyeti o tarifeden
 *  hesaplanıyor ve bunu hiçbir ekran söylemiyordu. Kart artık **kaç gün
 *  geçtiğini** yazıyor.
 *
 *  ⚠ "BAYAT" EŞİĞİ KOYULMADI — gerekçesi `lib/kargo/kanal-yetenegi.ts`te:
 *  tarifenin bitiş tarihi VERİDE YOK, dolayısıyla veriden türetilebilir bir
 *  eşik de yok. Uydurma gün sayısı yerine ÖLÇÜLEBİLİR OLAN yazılıyor.
 *
 *  ⚠ KANAL LİSTESİ VERİDEN GELİR. On ikinci kanal açıldığı gün kartı
 *  kendiliğinden çıkar; elle liste tutulsaydı sessizce kapsam dışı kalırdı.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("kargoTarifesi") };
}

export default async function KargoTarifesiSayfasi() {
  await sayfaIzni("kanalsku.yaz");

  const t = await getTranslations("KargoTarifesi");
  const bicim = await bicimlendirici();
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  /**
   * ⛔ YALNIZ SATIŞ KANALLARI (Halil testi #8, 22.09.2026): "Bim ve MediaMarkt
   * da listede" — onlar ALIŞ hesabı; kargo tarifesi satılan paketin
   * maliyetidir, alış kanalının değil. Ölçüt komisyon kapısıyla aynı:
   * en az bir aktif SATIŞ hesabı olan kanal.
   */
  const kanallar = await prisma.channel.findMany({
    where: { isActive: true, accounts: { some: { isActive: true, satisIcin: true } } },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });

  /**
   * TEK SORGU, SONRA GRUPLAMA. Kanal başına ayrı sorgu atmak 12 kanalda
   * 36 gidiş-dönüş ederdi; bu depoda ölçülmüş bir ders var — yavaşlık
   * hacimden değil, satır sayısıyla DOĞRUSAL büyüyen yazılıştan gelir.
   */
  const tarifeler = await prisma.cargoTariff.groupBy({
    by: ["channelId", "carrierId"],
    _count: { _all: true },
    _max: { effectiveFrom: true },
  });

  const ozetler: KargoKanalOzeti[] = kanallar.map((k) => {
    const kendi = tarifeler.filter((x) => x.channelId === k.id);
    const satir = kendi.reduce((t, x) => t + x._count._all, 0);
    const enSon = kendi.reduce<Date | null>((en, x) => {
      const d = x._max.effectiveFrom;
      return d && (en === null || d > en) ? d : en;
    }, null);
    return {
      kanalId: k.id,
      kanalKodu: k.code,
      kanalAdi: k.name,
      okuyucuVar: kargoOkuyucusuVarMi(k.code),
      satirSayisi: satir,
      tasiyiciSayisi: kendi.length,
      sonTarife: enSon,
      gecenGun: gecenGunHesapla(enSon, bugun),
    };
  });

  /**
   * ⚠ SIRALAMA BİR HÜKÜM DEĞİL, BİR KOLAYLIK: tarifesi olmayan ve en eski
   * olan kanallar üstte. Hangi kanalın "sorunlu" olduğuna ekran karar
   * vermiyor; yalnız bakılacak yeri öne alıyor.
   */
  const sirali = [...ozetler].sort((a, b) => {
    if (a.satirSayisi === 0 && b.satirSayisi > 0) return -1;
    if (b.satirSayisi === 0 && a.satirSayisi > 0) return 1;
    return (b.gecenGun ?? -1) - (a.gecenGun ?? -1);
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("aciklama")}</p>
      </div>

      <KanalKartlari
        kartlar={sirali.map((o) => ({
          ...o,
          sonTarifeYazisi: o.sonTarife ? bicim.tarih(o.sonTarife) : null,
        }))}
      />
    </div>
  );
}
