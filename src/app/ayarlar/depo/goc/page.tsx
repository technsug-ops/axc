import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";

import { GocFormu } from "@/app/ayarlar/depo/goc/goc-formu";
import { DURUM_KUTUSU } from "@/lib/renkler";
import {
  eskiRaflar,
  kisaltmaCakismalari,
  yeniRaflar,
} from "@/lib/depo/goc";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  RAF GÖÇÜ (K50 ⑦)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 25.08.2026: etiketler HENÜZ YAPIŞTIRILMADI, o yüzden
 *  _"hepsi yeni şablonla baştan üretilir, eskiler boşaltılır"_ yolu seçildi.
 *
 *  ⚠ AMA KOD YENİDEN ADLANDIRILMAZ — K50'nin kendi kuralı: _"düzen değişimi
 *  = yeni raf aç + TAŞI + boşalanı sil."_ Yeniden adlandırma kimlik
 *  kıyımıdır: o rafa dair her eski kayıt sahipsiz kalır.
 *
 *  ⚠ ÖNCE `/ayarlar/depo`DA DÜZEN ÇİZİLİR. Hedef raflar yoksa bu ekranın
 *  yapabileceği bir şey yok ve bunu SÖYLER — boş bir form göstermez.
 * ============================================================================
 */
export default async function GocSayfasi() {
  await sayfaIzni("ayar.yaz");

  const t = await getTranslations("Goc");

  const konumlar = await prisma.location.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      _count: { select: { variants: { where: { isActive: true } } } },
    },
    orderBy: { code: "asc" },
  });

  const hepsi = konumlar.map((k) => ({
    id: k.id,
    kod: k.code,
    ad: k.name,
    varyant: k._count.variants,
  }));

  /**
   * ⭐ ÇAKIŞMA ÖLÇÜTÜ SAF GÖVDEDEN — ekran kendi kuralını yazmıyor.
   * `kisaltmaCakismalari` `depo:dogrula` ile veritabanısız sınanıyor.
   */
  const cakismalar = kisaltmaCakismalari(hepsi);

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex items-center gap-2">
        <ArrowRightLeft className="text-muted-foreground size-5" aria-hidden />
        <h1 className="text-xl font-semibold">{t("baslik")}</h1>
      </header>

      <p className="text-muted-foreground text-sm">{t("aciklama")}</p>

      <p className="text-muted-foreground text-sm">
        <Link href="/ayarlar/depo" className="underline underline-offset-4">
          {t("depoyaGit")}
        </Link>
      </p>

      {/*
        ═══ ⑧ KISALTMA ÇAKIŞMASI — İŞARET, BİRLEŞTİRME DEĞİL ═══════════════
        ⛔ CANLI ÖLÇÜM 30.08.2026: `OFİS` (13 raf) ve `Ofis` (1 raf) AYRI
        kayıt — aynı bölüm İKİ KİMLİK. Türkçe `İ` `i`ye inmediği için fark
        gözle bile zor görülüyor.

        ⚠ SESSİZ BİRLEŞTİRME ZATEN YOKTU: eşleme ELLE kuruluyor ve sistem
        hiçbir rafı kendiliğinden taşımıyor. Eksik olan UYARIydı — kullanıcı
        iki adın aynı kısaltmaya indiğini GÖREMİYOR, ikisini iki ayrı bölüm
        sanıp iki kez tarif edebiliyordu.

        ⭐ HÜKMÜ KULLANICI VERİR: ekran yalnız SÖYLER, seçmez.
        ⚠ Çakışma yoksa hiç çıkmaz — sönmeyen uyarı okunmaz olur.
      */}
      {cakismalar.length > 0 ? (
        <div
          className={`space-y-2 rounded-md border border-dashed p-3 text-sm ${DURUM_KUTUSU.uyari}`}
        >
          <p className="font-medium">{t("cakismaBasligi")}</p>
          {cakismalar.map((c) => (
            <p key={c.kisaltma}>
              {t("cakismaSatiri", {
                adlar: c.adlar.join(" · "),
                kisaltma: c.kisaltma,
              })}
            </p>
          ))}
        </div>
      ) : null}

      <GocFormu
        kaynaklar={eskiRaflar(hepsi)}
        hedefler={yeniRaflar(hepsi).map((h) => ({ id: h.id, kod: h.kod }))}
      />
    </div>
  );
}
