"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { formGonderimi } from "@/lib/form-gonderimi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KATEGORI_ONERILERI } from "@/lib/kategori-onerileri";

import { kategoriEkle, type KategoriDurumu } from "./actions";
import { KodAlani } from "./kod-alani";

const BOS = { name: "", vatRate: "", code: "" };

/** Ad karşılaştırması büyük/küçük harf ve boşluk farkına takılmasın. */
function adAnahtari(ad: string) {
  return ad.trim().toLocaleLowerCase("tr");
}

export function KategoriFormu({
  mevcutAdlar,
}: {
  /** Zaten tanımlı kategori adları — listede "zaten var" diye işaretlenir. */
  mevcutAdlar: string[];
}) {
  const [durum, formAction, bekliyor] = useActionState<
    KategoriDurumu,
    FormData
  >(kategoriEkle, {});

  const t = useTranslations("Kategori");
  const ortak = useTranslations("Ortak");

  const [alanlar, setAlanlar] = useState(BOS);
  /** Seçilen hazır kategorinin karışık oran uyarısı — seçimle birlikte gelir. */
  const [karisikUyari, setKarisikUyari] = useState<string | null>(null);

  const eklenmis = new Set(mevcutAdlar.map(adAnahtari));

  /**
   * Hazır listeden seçim SADECE formu doldurur — kayıt oluşturmaz.
   * Doldurduktan sonra üç alan da elle değiştirilebilir.
   */
  function hazirSec(ad: string) {
    const secim = KATEGORI_ONERILERI.find((k) => k.ad === ad);
    if (!secim) {
      setKarisikUyari(null);
      return;
    }
    setAlanlar({
      name: secim.ad,
      vatRate: String(secim.kdv),
      code: secim.kod,
    });
    setKarisikUyari(
      secim.karisikOran
        ? t("karisikOranUyari", {
            aralik: secim.karisikOran,
            oran: `%${secim.kdv}`,
          })
        : null,
    );
  }

  // Başarılı kayıttan sonra alanları temizle — arka arkaya kategori girmek
  // kolay olsun. Render sırasında ayarlanıyor; useEffect zincirleme render
  // üretirdi.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setAlanlar(BOS);
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      <div className="space-y-2 rounded-md border bg-muted/40 p-3">
        <Label htmlFor="kategori-hazir">{t("hazirListe")}</Label>
        {/* Yerli <select>: seçenek sayısı 33 ve tek işi formu doldurmak.
            Telefonda cihazın kendi seçim tekerleği açılır — dokunma hedefi
            işletim sisteminden gelir, elle yükseklik ayarlamaya gerek kalmaz. */}
        <select
          id="kategori-hazir"
          value=""
          onChange={(e) => hazirSec(e.target.value)}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <option value="">{t("hazirListeSecim")}</option>
          {KATEGORI_ONERILERI.map((k) => {
            const zatenVar = eklenmis.has(adAnahtari(k.ad));
            return (
              <option key={k.ad} value={k.ad} disabled={zatenVar}>
                {zatenVar
                  ? t("hazirListeEklendi", { ad: k.ad })
                  : `${k.ad} — ${k.kod} — %${k.kdv}`}
              </option>
            );
          })}
        </select>
        <p className="text-muted-foreground text-xs">{t("hazirListeIpucu")}</p>
      </div>

      {karisikUyari ? (
        <p className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          {karisikUyari}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kategori-ad">{ortak("ad")} *</Label>
          <Input
            id="kategori-ad"
            name="name"
            value={alanlar.name}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, name: e.target.value }))
            }
            placeholder={t("adIpucu")}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kategori-oran">{t("kdvOrani")} *</Label>
          <Input
            id="kategori-oran"
            name="vatRate"
            value={alanlar.vatRate}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, vatRate: e.target.value }))
            }
            inputMode="decimal"
            placeholder={t("oranIpucu")}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <KodAlani
            inputId="kategori-kod"
            ad={alanlar.name}
            deger={alanlar.code}
            onDegisim={(kod) => setAlanlar((o) => ({ ...o, code: kod }))}
          />
          <p className="text-muted-foreground text-xs">{t("kodAciklama")}</p>
        </div>
      </div>

      <HataOzeti hatalar={durum.hatalar} />

      {durum.basari ? (
        <p className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {durum.basari}
        </p>
      ) : null}

      <Button type="submit" disabled={bekliyor}>
        <Plus />
        {bekliyor ? ortak("ekleniyor") : t("kategoriEkle")}
      </Button>

      <p className="text-muted-foreground text-xs">{t("hazirListeNotu")}</p>
    </form>
  );
}
