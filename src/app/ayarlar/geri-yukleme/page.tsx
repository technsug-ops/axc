import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { GeriYuklemeAkisi } from "./akis";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  YEDEKTEN GERİ YÜKLEME
 * ----------------------------------------------------------------------------
 *  BU EKRAN FELAKET ANINDA AÇILIR. Kullanıcı büyük ihtimalle paniktedir,
 *  ekranı ilk kez görüyordur ve acele etmektedir. Tasarım buna göre:
 *    - ne olacağı, olmadan ÖNCE tablo hâlinde yazılır
 *    - "geri alınamaz" uyarısı en tepede, en görünür yerde durur
 *    - onay iki katmanlı: metin yazdırma + otomatik güvenlik yedeği
 *    - hiçbir hata mesajı suçlayıcı değil; hepsi "şimdi şunu yapın" der
 *
 *  Depo listesi sunucuda okunur (jeton tarayıcıya hiç gitmez), akışın
 *  kendisi istemci bileşenidir.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("geriYukleme") };
}

export default async function GeriYuklemeSayfasi() {
  await sayfaIzni("veri.aktar");

  const t = await getTranslations("GeriYukleme");

  const depoBagli = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  let depodakiler: { ad: string; boyutKb: number }[] = [];
  if (depoBagli) {
    /**
     * ⛔ `list()` KALDIRILDI (K192, 08.09.2026): her açılış bir advanced
     * operation harcıyordu ve kota (2000/2000) tam bu sınıftan doldu.
     * Kayıtlar hedef soyutlamasından geliyor.
     */
    try {
      const { varsayilanYedekHedefi } = await import("@/lib/yedek-hedefi");
      const secim = varsayilanYedekHedefi();
      const kayitlar = secim.tamam ? await secim.hedef.listele("yedek/") : [];
      depodakiler = [...kayitlar]
        .sort((a, b) => b.yazildi.getTime() - a.yazildi.getTime())
        .slice(0, 30)
        .map((k) => ({
          ad: k.ad.replace(/^yedek\//, ""),
          boyutKb: Math.max(1, Math.round(k.boyut / 1024)),
        }));
    } catch {
      depodakiler = [];
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          {t("aciklama")}
        </p>
      </div>

      {/* Uyarı en tepede: bu ekranın ne yaptığı okunmadan geçilmesin. */}
      <div className={`space-y-2 rounded-lg p-4 ${DURUM_KUTUSU.uyari}`}>
        <div className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
          <ShieldAlert className="size-4 shrink-0" />
          {t("uyariBaslik")}
        </div>
        <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
          {t("uyariMetin")}
        </p>
      </div>

      {!depoBagli ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("depoYokBaslik")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>{t("depoYokMetin")}</p>
            <p>{t("depoYokNasil")}</p>
          </CardContent>
        </Card>
      ) : (
        <GeriYuklemeAkisi depodakiler={depodakiler} />
      )}
    </div>
  );
}
