"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formGonderimi } from "@/lib/form-gonderimi";

import { kullaniciEkle, type KullaniciDurumu } from "./actions";

/**
 * Yeni kullanıcı — rol AYNI ADIMDA seçilir (kullanıcı kararı 13.08.2026).
 * Ayrı bir "rol ata" adımı, rolsüz kalmış kullanıcı üretme riski demekti.
 */
export function KullaniciFormu({
  roller,
}: {
  roller: { id: string; name: string }[];
}) {
  const t = useTranslations("Kullanici");
  const ortak = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<
    KullaniciDurumu,
    FormData
  >(kullaniciEkle, {});

  const [rolId, setRolId] = useState("");

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      <input type="hidden" name="roleId" value={rolId} />
      <HataOzeti hatalar={durum.hatalar} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="k-eposta">{t("epostaEtiketi")} *</Label>
          <Input
            id="k-eposta"
            name="email"
            type="email"
            placeholder={t("epostaIpucu")}
            autoComplete="off"
            className="h-11 md:h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="k-ad">{t("adEtiketi")}</Label>
          <Input
            id="k-ad"
            name="name"
            placeholder={t("adIpucu")}
            autoComplete="off"
            className="h-11 md:h-10"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="k-rol">{t("rolEtiketi")} *</Label>
          <Select value={rolId} onValueChange={setRolId}>
            <SelectTrigger id="k-rol" className="h-11 w-full md:h-10">
              <SelectValue placeholder={t("rolSecin")} />
            </SelectTrigger>
            <SelectContent>
              {roller.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="k-parola">{t("parolaEtiketi")} *</Label>
          <Input
            id="k-parola"
            name="password"
            type="text"
            placeholder={t("parolaIpucu")}
            autoComplete="off"
            className="h-11 md:h-10"
          />
          {/* Parola GİZLENMİYOR: sahip onu okuyup kullanıcıya iletecek.
              Yıldızlarla göstermek, yazdığını göremeyen birinin yanlış
              parola vermesine yol açardı. */}
          <p className="text-muted-foreground text-xs">{t("parolaGorunurNotu")}</p>
        </div>
      </div>

      <Button type="submit" disabled={bekliyor} className="h-11 md:h-10">
        <Plus />
        {bekliyor ? ortak("kaydediliyor") : t("ekle")}
      </Button>
    </form>
  );
}
