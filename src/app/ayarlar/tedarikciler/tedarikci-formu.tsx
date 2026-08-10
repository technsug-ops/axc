"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formGonderimi } from "@/lib/form-gonderimi";

import { tedarikciEkle, type TedarikciDurumu } from "./actions";
import { TedarikciKodAlani } from "./kod-alani";

const BOS = { name: "", code: "", contact: "" };

export function TedarikciFormu() {
  const [durum, formAction, bekliyor] = useActionState<
    TedarikciDurumu,
    FormData
  >(tedarikciEkle, {});

  const t = useTranslations("Tedarikci");
  const ortak = useTranslations("Ortak");

  const [alanlar, setAlanlar] = useState(BOS);

  // Başarılı kayıttan sonra alanları temizle — arka arkaya tedarikçi
  // girmek kolay olsun. Render sırasında ayarlanıyor; useEffect zincirleme
  // render üretirdi.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setAlanlar(BOS);
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ted-ad">{ortak("ad")} *</Label>
          <Input
            id="ted-ad"
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
          <TedarikciKodAlani
            inputId="ted-kod"
            ad={alanlar.name}
            deger={alanlar.code}
            onDegisim={(kod) => setAlanlar((o) => ({ ...o, code: kod }))}
          />
          <p className="text-muted-foreground text-xs">{t("kodAciklama")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ted-iletisim">{t("iletisim")}</Label>
          <Input
            id="ted-iletisim"
            name="contact"
            value={alanlar.contact}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, contact: e.target.value }))
            }
            placeholder={t("iletisimIpucu")}
            autoComplete="off"
          />
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
        {bekliyor ? ortak("ekleniyor") : t("tedarikciEkle")}
      </Button>
    </form>
  );
}
