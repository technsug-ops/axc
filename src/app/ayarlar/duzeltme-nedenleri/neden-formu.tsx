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

import { nedenEkle, type NedenDurumu } from "./actions";

/**
 * Yeni düzeltme nedeni.
 *
 * TİP SEÇİMİ AÇIKLAMALI: "Fire" ile "Sayım farkı" ayrımı raporu ikiye
 * bölüyor ve kullanıcı bunu bilmeden seçemez. Seçeneğin altında ne anlama
 * geldiği yazıyor — sonradan değiştirilemeyen bir alan, ilk seferde doğru
 * seçilmeli.
 */
export function NedenFormu() {
  const t = useTranslations("DuzeltmeNedeni");
  const ortak = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<NedenDurumu, FormData>(
    nedenEkle,
    {},
  );

  const [tip, setTip] = useState<"ADJUSTMENT" | "COUNT_CORRECTION">(
    "ADJUSTMENT",
  );
  const [aciklamaZorunlu, setAciklamaZorunlu] = useState(false);
  /**
   * YÖN — 16.08.2026'da eklendi.
   *
   * Alan şemaya girdiğinde bu ekran unutulmuştu: kullanıcının açtığı her
   * neden sonsuza dek `HER_IKISI` kalıyordu ve "stoğa ekle" listesinde
   * anlamsız seçenekler yeniden birikiyordu. Yani kapatılan kapı
   * ayarlardan tekrar açılıyordu.
   *
   * VARSAYILAN HER_IKISI: kullanıcı düşünmeden geçerse davranış eskisi
   * gibi olur — süzgeç kısıtlamaz. Daraltma bilinçli bir seçimdir.
   */
  const [yon, setYon] = useState<"EKSI" | "ARTI" | "HER_IKISI">("HER_IKISI");

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      <input type="hidden" name="movementType" value={tip} />
      <input type="hidden" name="yon" value={yon} />
      {aciklamaZorunlu ? (
        <input type="hidden" name="requiresNote" value="on" />
      ) : null}

      <HataOzeti hatalar={durum.hatalar} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="neden-ad">{t("adEtiketi")} *</Label>
          <Input
            id="neden-ad"
            name="name"
            placeholder={t("adIpucu")}
            autoComplete="off"
            className="h-11 md:h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="neden-tip">{t("tipEtiketi")} *</Label>
          <Select
            value={tip}
            onValueChange={(d) =>
              setTip(d as "ADJUSTMENT" | "COUNT_CORRECTION")
            }
          >
            <SelectTrigger id="neden-tip" className="h-11 w-full md:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADJUSTMENT">{t("tipFire")}</SelectItem>
              <SelectItem value="COUNT_CORRECTION">{t("tipSayim")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {tip === "ADJUSTMENT" ? t("tipFireNotu") : t("tipSayimNotu")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="neden-yon">{t("yonEtiketi")} *</Label>
        <Select
          value={yon}
          onValueChange={(d) => setYon(d as "EKSI" | "ARTI" | "HER_IKISI")}
        >
          <SelectTrigger id="neden-yon" className="h-11 w-full md:h-10 sm:max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EKSI">{t("yonEksi")}</SelectItem>
            <SelectItem value="ARTI">{t("yonArti")}</SelectItem>
            <SelectItem value="HER_IKISI">{t("yonHerIkisi")}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{t("yonNotu")}</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={aciklamaZorunlu}
          onChange={(e) => setAciklamaZorunlu(e.target.checked)}
          className="size-4"
        />
        {t("aciklamaZorunluEtiketi")}
      </label>
      <p className="text-muted-foreground -mt-2 text-xs">
        {t("aciklamaZorunluNotu")}
      </p>

      <Button type="submit" disabled={bekliyor} className="h-11 md:h-10">
        <Plus />
        {bekliyor ? ortak("kaydediliyor") : t("ekle")}
      </Button>
    </form>
  );
}
