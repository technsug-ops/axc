import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { Card, CardContent } from "@/components/ui/card";
import { duzeniCoz, duzeniOku } from "@/lib/menu/duzen";
import {
  MENU_GRUPLARI,
  MENU_IZNI,
  MENU_KATALOGU,
  MENUDEN_DUSURULEMEZ,
} from "@/lib/menu/katalog";
import { prisma } from "@/lib/prisma";
import { DURUM_KUTUSU } from "@/lib/renkler";
import { sayfaIzni } from "@/lib/yetki";

import { MenuDuzenleyici } from "./duzenleyici";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";

/**
 * ============================================================================
 *  MENÜ DÜZENİ (K51, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _"ayarlar kısmında bu butonların yerlerini değiştirebilecek bir
 *  özellik olsun; istediğimiz zaman butonların kategorilerini ve yerlerini
 *  kolay bir şekilde değiştirebilelim."_
 *
 *  ⚠ V1 KAPSAMI (kullanıcı kararı): sıra değiştir · gruplar arası taşı ·
 *  günlük listeye al/çıkar. **Grup ekleme/adlandırma V2** — ve biçim onu
 *  bugünden taşıyor, yani V2 bir göç değil GENİŞLEME olacak.
 *
 *  ⚠ ETİKETLER SUNUCUDA ÇÖZÜLÜYOR. İstemciye `tMenu` verilseydi düzenleyici
 *  sözlüğe bağımlı olurdu; burada anahtar → ad eşlemesi hazır gidiyor ve
 *  bileşen saf kalıyor.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("menuDuzeni") };
}

export default async function MenuDuzeniSayfasi() {
  const baglam = await sayfaIzni(MENU_IZNI);

  const t = await getTranslations("MenuDuzeni");
  const tMenu = await getTranslations("Menu");

  const firma = await prisma.company.findUnique({
    where: { id: baglam.companyId },
    select: { menuDuzeni: true },
  });

  const cozulmus = duzeniCoz(
    MENU_KATALOGU,
    MENU_GRUPLARI,
    duzeniOku(firma?.menuDuzeni ?? null),
  );

  /** anahtar → ekranda görünen ad. */
  const etiketler: Record<string, string> = {};
  for (const oge of MENU_KATALOGU) {
    etiketler[oge.anahtar] = tMenu.has(oge.anahtar)
      ? tMenu(oge.anahtar)
      : oge.anahtar;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <ListeyeDon href="/">{t("baslik")}</ListeyeDon>
        <h1 className="mt-1 text-xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      {/*
        ⚠ YENİ GELEN EKRAN BEYAN EDİLİR. Kayıtta adı geçmeyen bir ekran
        varsayılan yerine eklenir; SESSİZ eklenseydi kullanıcı "ben bunu
        oraya koymamıştım" der ve düzenin bozulduğunu sanırdı.
      */}
      {cozulmus.yeniGelenler.length > 0 ? (
        <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.bilgi}`}>
          {t("yeniGelen", {
            adet: cozulmus.yeniGelenler.length,
            adlar: cozulmus.yeniGelenler
              .map((a) => etiketler[a] ?? a)
              .join(" · "),
          })}
        </p>
      ) : null}

      {/*
        ⚠ TANINMAYAN KAYIT DA BEYAN EDİLİR. Koddan kaldırılmış bir ekranın
        izi kayıtta kalmış olabilir; yok sayılıyor ama sayılıyor da —
        "boş sonuç ile temiz sonuç ayrı söylenir".
      */}
      {cozulmus.taninmayanlar.length > 0 ? (
        <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          {t("taninmayan", { adet: cozulmus.taninmayanlar.length })}
        </p>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <MenuDuzenleyici
            etiketler={etiketler}
            gruplar={MENU_GRUPLARI.map((g) => ({
              anahtar: g.anahtar,
              etiket: tMenu.has(g.anahtar) ? tMenu(g.anahtar) : g.anahtar,
            }))}
            baslangic={{
              gunluk: cozulmus.gunluk,
              gruplar: cozulmus.gruplar.map((g) => ({
                anahtar: g.anahtar,
                ogeler: g.ogeler,
              })),
            }}
            dusurulemez={[...MENUDEN_DUSURULEMEZ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
