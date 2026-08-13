"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
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

import { bildirimOlustur, type BildirimDurumu } from "./bildirim-actions";

import type { ReturnReason } from "@/generated/prisma/enums";

export type SatisSecenegi = { id: string; etiket: string };
export type VaryantSecenegi = { id: string; etiket: string };

/**
 * ============================================================================
 *  BİLDİRİM KAYIT FORMU — AŞAMA A
 * ----------------------------------------------------------------------------
 *  Pazaryeri "müşteri iade istiyor" dedi, mal yolda. Bu form o beyanı kaydeder;
 *  STOK VE KÂR HESABINA DOKUNMAZ.
 *
 *  AYRILAN ÜRÜN yalnız DEĞİŞİM gerekçelerinde sorulur (DEGISIM,
 *  DEGISIM_KUSURLU, YANLIS_URUN). Diğer gerekçelerde hüküm mal gelince
 *  verilir; peşin ayırma sormak, kullanıcıya cevabını bilmediği bir soru
 *  sormaktır.
 * ============================================================================
 */
export function BildirimFormu({
  satislar,
  varyantlar,
  degisimGerekceleri,
  gerekceEtiketleri,
  bugun,
}: {
  satislar: SatisSecenegi[];
  varyantlar: VaryantSecenegi[];
  /** Hangi gerekçelerde ayrılan ürün sorulur — sunucudan gelir (tek kaynak). */
  degisimGerekceleri: ReturnReason[];
  gerekceEtiketleri: Record<string, string>;
  /** İş takvimi günü (Europe/Istanbul) — tarayıcı saatine güvenilmez. */
  bugun: string;
}) {
  const t = useTranslations("Bildirim2");
  const ortak = useTranslations("Ortak");
  const router = useRouter();

  const [durum, gonder, bekliyor] = useActionState<BildirimDurumu, FormData>(
    bildirimOlustur,
    {},
  );

  const [satisId, setSatisId] = useState("");
  const [kod, setKod] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [gerekce, setGerekce] = useState<ReturnReason | "">("");
  const [varyantId, setVaryantId] = useState("");
  const [adet, setAdet] = useState("1");
  const [not, setNot] = useState("");

  const ayirmaSorulur =
    gerekce !== "" && degisimGerekceleri.includes(gerekce as ReturnReason);

  // Kayıt başarılıysa form sıfırlanır ve liste tazelenir.
  if (durum.basarili && satisId !== "") {
    setSatisId("");
    setKod("");
    setGerekce("");
    setVaryantId("");
    setAdet("1");
    setNot("");
    router.refresh();
  }

  const veri = JSON.stringify({
    saleId: satisId,
    code: kod,
    noticedAt: tarih,
    reason: gerekce,
    reservedVariantId: ayirmaSorulur && varyantId ? varyantId : null,
    reservedQuantity: ayirmaSorulur && varyantId ? Number(adet) || 0 : 0,
    note: not,
  });

  return (
    <form action={gonder} className="space-y-4">
      <input type="hidden" name="veri" value={veri} />

      <HataOzeti hatalar={durum.hatalar} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bildirim-satis">{t("satis")} *</Label>
          <Select value={satisId} onValueChange={setSatisId}>
            <SelectTrigger id="bildirim-satis" className="h-11 w-full md:h-9">
              <SelectValue placeholder={t("satisSecin")} />
            </SelectTrigger>
            <SelectContent>
              {satislar.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.etiket}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bildirim-gerekce">{t("gerekce")} *</Label>
          <Select
            value={gerekce}
            onValueChange={(d) => setGerekce(d as ReturnReason)}
          >
            <SelectTrigger id="bildirim-gerekce" className="h-11 w-full md:h-9">
              <SelectValue placeholder={t("gerekceSecin")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(gerekceEtiketleri).map(([deger, etiket]) => (
                <SelectItem key={deger} value={deger}>
                  {etiket}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bildirim-kod">{t("talepNo")}</Label>
          <Input
            id="bildirim-kod"
            className="h-11 md:h-9"
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            // YER TUTUCU DEĞER GİBİ GÖRÜNMEZ (İlke #11).
            placeholder={t("talepNoIpucu")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bildirim-tarih">{t("bildirimTarihi")} *</Label>
          <Input
            id="bildirim-tarih"
            type="date"
            className="h-11 md:h-9"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
          />
        </div>
      </div>

      {/* AYRILAN ÜRÜN — yalnız değişim gerekçelerinde. */}
      {ayirmaSorulur ? (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">{t("ayrilanBaslik")}</p>
          <p className="text-muted-foreground text-xs">{t("ayrilanNotu")}</p>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="bildirim-varyant">{ortak("urun")}</Label>
              <Select value={varyantId} onValueChange={setVaryantId}>
                <SelectTrigger id="bildirim-varyant" className="h-11 w-full md:h-9">
                  <SelectValue placeholder={t("ayrilanUrunSecin")} />
                </SelectTrigger>
                <SelectContent>
                  {varyantlar.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.etiket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bildirim-adet">{ortak("adet")}</Label>
              <Input
                id="bildirim-adet"
                type="number"
                min={1}
                className="h-11 md:h-9"
                value={adet}
                onChange={(e) => setAdet(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="bildirim-not">{ortak("not")}</Label>
        <Input
          id="bildirim-not"
          className="h-11 md:h-9"
          value={not}
          onChange={(e) => setNot(e.target.value)}
          placeholder={t("notIpucu")}
        />
      </div>

      <Button
        type="submit"
        className="h-11 md:h-9"
        disabled={bekliyor || !satisId || !gerekce}
      >
        <Plus className="size-4" />
        {bekliyor ? t("kaydediliyor") : t("bildirimEkle")}
      </Button>
    </form>
  );
}
