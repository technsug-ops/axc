"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formGonderimi } from "@/lib/form-gonderimi";

import { tazminatAc, type TazminatDurumu } from "./actions";

export type HasarKalemi = {
  /** Hasar nereden geldi: mal kabulde mi, müşteri iadesinde mi. */
  kaynak: "alim" | "iade";
  kalemId: string;
  /** Alım kodu ya da satış/sipariş no — hangi kayıttan geldiği. */
  baglam: string;
  tedarikci: string;
  urun: string;
  sku: string;
  hasarliAdet: number;
  kalanAdet: number;
  /** Adet × birim maliyet — önerilen tutar, metin olarak. */
  onerilenTutar: string;
  paraBirimi: string;
  hasarNotu: string | null;
};

/** Kullanıcının seçebileceği başlangıç durumları. */
const BASLANGIC_DURUMLARI = ["OPEN", "CLAIMED"] as const;

/**
 * Talep açma diyaloğu. Hasar satırından açılır: hangi hasar için talep
 * açıldığı BAŞTAN bellidir, kullanıcı listeden aramaz.
 *
 * Tutar ve adet ÖNERİLİ gelir ama değiştirilebilir — tedarikçiyle pazarlık
 * başka rakamda kapanabilir.
 */
export function TalepFormu({
  hasar,
  bugun,
}: {
  hasar: HasarKalemi;
  /** İş saat diliminde bugün (YYYY-AA-GG). */
  bugun: string;
}) {
  const t = useTranslations("Tazminat");
  const tDurum = useTranslations("TazminatDurumu");
  const ortak = useTranslations("Ortak");

  const [acik, setAcik] = useState(false);
  const [durum, formAction, bekliyor] = useActionState<
    TazminatDurumu,
    FormData
  >(tazminatAc, {});

  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setAcik(false);
  }

  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          {t("talepAc")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("yeniTalep")}</DialogTitle>
          <DialogDescription>
            {hasar.urun} — {hasar.tedarikci} · {hasar.baglam}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={formGonderimi(formAction)} className="space-y-4">
          <input type="hidden" name="kaynak" value={hasar.kaynak} />
          <input type="hidden" name="kalemId" value={hasar.kalemId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tazminat-adet">
                {ortak("adet")} * ({t("kalanAdet")}: {hasar.kalanAdet})
              </Label>
              <Input
                id="tazminat-adet"
                name="quantity"
                defaultValue={String(hasar.kalanAdet)}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tazminat-tutar">
                {t("talepTutari")} * ({hasar.paraBirimi})
              </Label>
              <Input
                id="tazminat-tutar"
                name="amount"
                defaultValue={hasar.onerilenTutar}
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tazminat-tarih">{t("olayTarihi")} *</Label>
              <Input
                id="tazminat-tarih"
                name="occurredAt"
                type="date"
                defaultValue={bugun}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tazminat-durum">{t("durumSec")}</Label>
              <Select name="status" defaultValue="OPEN">
                <SelectTrigger id="tazminat-durum" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BASLANGIC_DURUMLARI.map((d) => (
                    <SelectItem key={d} value={d}>
                      {tDurum(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tazminat-not">{t("notEtiketi")}</Label>
            <Textarea
              id="tazminat-not"
              name="note"
              rows={2}
              defaultValue={hasar.hasarNotu ?? ""}
              placeholder={ortak("istegeBagli")}
            />
          </div>

          <p className="text-muted-foreground text-xs">
            {t("talepTutariNotu")}
          </p>

          <HataOzeti hatalar={durum.hatalar} />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={bekliyor}>
              {bekliyor ? ortak("kaydediliyor") : t("talepAc")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAcik(false)}
            >
              {ortak("vazgec")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
