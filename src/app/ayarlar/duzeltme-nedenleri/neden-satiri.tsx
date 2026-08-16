"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, X } from "lucide-react";

import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
import { HataOzeti } from "@/components/hata-ozeti";
import { Badge } from "@/components/ui/badge";
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

import {
  nedenDurumDegistir,
  nedenGuncelle,
  type NedenDurumu,
} from "./actions";

export type NedenSatiriVerisi = {
  id: string;
  name: string;
  movementType: "ADJUSTMENT" | "COUNT_CORRECTION";
  /** Hangi yönde seçilebilir — "stoğa ekle"de fire çıkmasın diye. */
  yon: "EKSI" | "ARTI" | "HER_IKISI";
  requiresNote: boolean;
  isActive: boolean;
  /** Bu nedene bağlı stok hareketi sayısı — tip kilidini belirler. */
  hareketSayisi: number;
};

/**
 * Neden satırı — yerinde düzenleme (Kategori satırının deseni).
 *
 * HAREKET GÖRMÜŞ NEDENDE TİP KİLİTLİ: bir neden "fire" olarak kullanılıp
 * hareket yazdıysa, sonradan "sayım farkı"na çevrilmesi geçmiş raporları
 * oynatırdı — dünkü fire bugün sayım farkı olurdu. Kilit ekranda görünür
 * ve NEDENİ yazar; sessizce devre dışı bırakılmış bir alan bırakmıyoruz.
 */
export function NedenSatiri({ neden }: { neden: NedenSatiriVerisi }) {
  const t = useTranslations("DuzeltmeNedeni");
  const ortak = useTranslations("Ortak");

  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [durum, formAction, bekliyor] = useActionState<NedenDurumu, FormData>(
    nedenGuncelle,
    {},
  );

  const [ad, setAd] = useState(neden.name);
  const [tip, setTip] = useState(neden.movementType);
  /**
   * YÖN TİPTEN FARKLI: hareket görmüş nedende de DEĞİŞTİRİLEBİLİR.
   * Tip geçmiş raporu oynatır (dünkü fire bugün sayım farkı olurdu); yön
   * yalnız SEÇİM listesini süzer, yazılmış kayıtların anlamına dokunmaz.
   */
  const [yon, setYon] = useState(neden.yon);
  const [aciklamaZorunlu, setAciklamaZorunlu] = useState(neden.requiresNote);

  const tipKilitli = neden.hareketSayisi > 0;

  // Kayıt hatasızsa düzenleme kipinden çık.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (!durum.hatalar?.length) setDuzenleniyor(false);
  }

  const tipMetni = (kod: string) =>
    kod === "COUNT_CORRECTION" ? t("tipSayim") : t("tipFire");

  if (!duzenleniyor) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{neden.name}</span>
            <Badge variant="outline">{tipMetni(neden.movementType)}</Badge>
            {neden.requiresNote ? (
              <Badge variant="outline">{t("aciklamaZorunluRozet")}</Badge>
            ) : null}
            {!neden.isActive ? (
              <Badge variant="secondary">{ortak("pasif")}</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("hareketSayisi", { sayi: neden.hareketSayisi })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-11 md:h-9"
            onClick={() => setDuzenleniyor(true)}
          >
            <Pencil />
            {ortak("duzenle")}
          </Button>
          {/* SİLME YOK: geçmiş hareketler nedensiz kalmasın. */}
          <DurumDegistirButonu
            kayitId={neden.id}
            aktifMi={neden.isActive}
            action={nedenDurumDegistir}
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-3 p-4">
      <input type="hidden" name="id" value={neden.id} />
      <input type="hidden" name="movementType" value={tip} />
      <input type="hidden" name="yon" value={yon} />
      {aciklamaZorunlu ? (
        <input type="hidden" name="requiresNote" value="on" />
      ) : null}

      <HataOzeti hatalar={durum.hatalar} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`ad-${neden.id}`}>{t("adEtiketi")}</Label>
          <Input
            id={`ad-${neden.id}`}
            name="name"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            className="h-11 md:h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`tip-${neden.id}`}>{t("tipEtiketi")}</Label>
          <Select
            value={tip}
            onValueChange={(d) =>
              setTip(d as "ADJUSTMENT" | "COUNT_CORRECTION")
            }
            disabled={tipKilitli}
          >
            <SelectTrigger id={`tip-${neden.id}`} className="h-11 w-full md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADJUSTMENT">{t("tipFire")}</SelectItem>
              <SelectItem value="COUNT_CORRECTION">{t("tipSayim")}</SelectItem>
            </SelectContent>
          </Select>
          {/* Kilit SESSİZ DEĞİL: neden kilitli olduğu yazıyor. */}
          {tipKilitli ? (
            <p className="text-muted-foreground text-xs">
              {t("tipKilitli", { sayi: neden.hareketSayisi })}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`yon-${neden.id}`}>{t("yonEtiketi")}</Label>
          <Select
            value={yon}
            onValueChange={(d) => setYon(d as typeof yon)}
          >
            <SelectTrigger id={`yon-${neden.id}`} className="h-11 w-full md:h-9">
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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={bekliyor} className="h-11 md:h-9">
          <Check />
          {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 md:h-9"
          onClick={() => {
            setAd(neden.name);
            setTip(neden.movementType);
            setAciklamaZorunlu(neden.requiresNote);
            setDuzenleniyor(false);
          }}
        >
          <X />
          {ortak("vazgec")}
        </Button>
      </div>
    </form>
  );
}
