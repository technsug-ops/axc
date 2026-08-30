import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { Yerlestirici } from "@/app/yerlestir/yerlestirici";
import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  YERLEŞTİRME (K50 ④)
 * ----------------------------------------------------------------------------
 *  Depoda tek akış: RAFI okut → ÜRÜNLERİ peş peşe okut.
 *
 *  ⛔ STOK DEFTERİNE DOKUNULMAZ. Yazılan tek alan `locationId` — bir ürünün
 *  NEREDE olduğu, KAÇ TANE olduğu değil. Adet iddiası taşımadığı için sayım
 *  koruması kapsamına da girmiyor.
 *
 *  ⚠ CANLI VERİ — her istekte çizilir. Raf doluluğu yerleştirdikçe değişir;
 *  derleme anında dondurulmuş bir sayı ilk okumada yalan söylerdi.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("yerlestir") };
}

export default async function YerlestirSayfasi() {
  await sayfaIzni("stok.duzelt");

  const t = await getTranslations("Yerlestir");

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <MapPin className="text-muted-foreground size-5" aria-hidden />
        <h1 className="text-xl font-semibold">{t("baslik")}</h1>
      </header>

      <p className="text-muted-foreground max-w-3xl text-sm">{t("aciklama")}</p>

      {/*
        ⚠ TOPLU TAŞIMA BURADAN GİRİLİR — menüye ayrı satır AÇILMADI.
        Günlük iş tek ürün yerleştirmektir; toplu taşıma raf düzeni
        değiştiğinde yapılır ve seyrek bir iş günlük listeyi şişirmemeli.
      */}
      <p className="text-muted-foreground text-sm">
        <Link href="/yerlestir/tasi" className="underline underline-offset-4">
          {t("topluTasimayaGit")}
        </Link>
      </p>

      <Yerlestirici />
    </div>
  );
}
