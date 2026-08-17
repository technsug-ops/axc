import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PackagePlus, ScanBarcode } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { Button } from "@/components/ui/button";
import { sayfaIzni } from "@/lib/yetki";
import { kodDizisi } from "@/lib/varyant-ozet";

import { KartArama } from "./kart-arama";
import { varyantAra } from "@/app/varyant-arama";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("urunKarti") };
}

/**
 * ============================================================================
 *  ÜRÜN KÂRLILIK KARTI — GİRİŞ EKRANI
 * ----------------------------------------------------------------------------
 *  Mimar sözleşmesi 17.08.2026: mağazada, alım öncesi, telefonla barkod
 *  okutulur → "bu ürünü alayım mı" kararının verisi tek bakışta.
 *
 *  İzin `urun.gor` — kartın KİMLİK ve STOK bölümü herkese açıktır. Kâr
 *  bölümü ayrıca `satis.kar.gor` ister ve izinsiz kullanıcıya HİÇ RENDER
 *  EDİLMEZ (bkz. `[variantId]/page.tsx`).
 * ============================================================================
 */
export default async function KartAramaSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await sayfaIzni("urun.gor");

  const p = await searchParams;
  const arama = (p.q ?? "").trim();
  const t = await getTranslations("UrunKarti");

  const sonuclar = arama.length >= 2 ? await varyantAra(arama) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      <KartArama baslangic={arama} />

      {arama === "" ? (
        /* İLK AÇILIŞ: boş ekran değil, ne yapılacağını söyleyen ekran. */
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ScanBarcode className="text-muted-foreground mx-auto size-8" />
          <p className="mt-3 font-medium">{t("basla")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("baslaIpucu")}</p>
        </div>
      ) : sonuclar.length === 0 ? (
        /**
         * ÜRÜN KAYITLI DEĞİL — SESSİZ BOŞ DEĞİL (sözleşme maddesi).
         * Mağazada okutulan ürün sistemde yoksa bu bir HATA değil, bir
         * BİLGİDİR: yeni ürün demektir ve kullanıcı onu eklemek isteyebilir.
         */
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">{t("kayitliDegil")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("kayitliDegilIpucu", { arama })}
          </p>
          <Button asChild className="mt-4 h-11">
            <Link href="/urunler/yeni">
              <PackagePlus />
              {t("yeniUrunEkle")}
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {sonuclar.map((v) => (
            /* min-w-0: <li> ızgara öğesi olarak taşmayı engellemez (14.08 dersi). */
            <li key={v.id} className="min-w-0 p-3">
              <Baglanti href={`/kart/${v.id}`} className="font-medium">
                {v.urunAdi}
                {v.varyantAdi ? ` — ${v.varyantAdi}` : ""}
              </Baglanti>
              {/* İlke #3: kimlik kodları listede, detaya girmeden görünür. */}
              <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                {kodDizisi(v)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
