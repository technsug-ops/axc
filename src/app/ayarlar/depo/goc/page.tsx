import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";

import { GocFormu } from "@/app/ayarlar/depo/goc/goc-formu";
import { eskiRaflar, yeniRaflar } from "@/lib/depo/goc";
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

      <GocFormu
        kaynaklar={eskiRaflar(hepsi)}
        hedefler={yeniRaflar(hepsi).map((h) => ({ id: h.id, kod: h.kod }))}
      />
    </div>
  );
}
