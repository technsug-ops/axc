"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Power, PowerOff, Save, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formGonderimi } from "@/lib/form-gonderimi";

import {
  kanalSkuDurumDegistir,
  kanalSkuGuncelle,
  kanalSkuSil,
  type KanalSkuDurumu,
} from "./actions";

/**
 * ============================================================================
 *  SATIR İÇİ DÜZENLEME
 * ----------------------------------------------------------------------------
 *  Komisyon oranı HAFTALIK değişiyor (Trendyol salı, Hepsiburada çarşamba).
 *  Diyalog açtırmak bu iş için fazla yol: oran satırın içinde düzenlenir,
 *  "Kaydet" yalnızca gerçekten bir şey değiştiyse etkinleşir (İlke #9).
 * ============================================================================
 */
export function SatirDuzenle({
  kayitId,
  sku,
  hesapEtiketi,
  kanalKodu,
  oran,
  aktifMi,
}: {
  kayitId: string;
  sku: string;
  hesapEtiketi: string;
  kanalKodu: string;
  /** Boşsa "" — oran girilmemiş demektir. */
  oran: string;
  aktifMi: boolean;
}) {
  const t = useTranslations("KanalSku");
  const ortak = useTranslations("Ortak");

  const [alanlar, setAlanlar] = useState({ kanalKodu, oran });
  const [silAcik, setSilAcik] = useState(false);

  const [durum, kaydetAction, kaydediyor] = useActionState<
    KanalSkuDurumu,
    FormData
  >(kanalSkuGuncelle, {});
  const [durumDurumu, durumAction, degisiyor] = useActionState<
    KanalSkuDurumu,
    FormData
  >(kanalSkuDurumDegistir, {});
  const [silDurumu, silAction, siliniyor] = useActionState<
    KanalSkuDurumu,
    FormData
  >(kanalSkuSil, {});

  const degisti = alanlar.kanalKodu !== kanalKodu || alanlar.oran !== oran;

  // Silme başarılıysa diyalog kapanır; hata varsa AÇIK kalır ki mesaj görünsün.
  const [sonSilDurumu, setSonSilDurumu] = useState(silDurumu);
  if (sonSilDurumu !== silDurumu) {
    setSonSilDurumu(silDurumu);
    if (silDurumu.basari) setSilAcik(false);
  }

  const mesajlar = [durum, durumDurumu, silDurumu];

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={formGonderimi(kaydetAction)}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={kayitId} />

          <Input
            name="channelSku"
            value={alanlar.kanalKodu}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, kanalKodu: e.target.value }))
            }
            placeholder={t("kanalKoduIpucu")}
            aria-label={t("sutunKanalKodu")}
            autoComplete="off"
            className="w-40 font-mono text-xs"
          />

          <Input
            name="commissionRate"
            value={alanlar.oran}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, oran: e.target.value }))
            }
            inputMode="decimal"
            placeholder={t("oranIpucu")}
            aria-label={t("oranEtiketi")}
            autoComplete="off"
            className="w-24"
          />

          <Button type="submit" size="sm" disabled={!degisti || kaydediyor}>
            <Save />
            {kaydediyor ? ortak("kaydediliyor") : t("kaydet")}
          </Button>
        </form>

        <form action={durumAction}>
          <input type="hidden" name="id" value={kayitId} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={degisiyor}
          >
            {aktifMi ? <PowerOff /> : <Power />}
            {aktifMi ? ortak("pasifeAl") : ortak("aktiflestir")}
          </Button>
        </form>

        <AlertDialog open={silAcik} onOpenChange={setSilAcik}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash2 />
              {ortak("sil")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("silBaslik")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("silAciklama", { sku, hesap: hesapEtiketi })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={siliniyor}
                onClick={() => {
                  const veri = new FormData();
                  veri.set("id", kayitId);
                  // GEÇİŞ İÇİNDE çağrılmak ZORUNDA: dışarıda çağrılınca
                  // React "bekliyor" durumunu güncellemiyor ve konsola uyarı
                  // düşüyor. Diyalog burada kapatılmaz — silme başarılıysa
                  // aşağıdaki kontrol kapatır, hata olursa açık kalıp mesajı
                  // gösterir.
                  startTransition(() => silAction(veri));
                }}
              >
                <Trash2 />
                {siliniyor ? ortak("kaydediliyor") : t("silOnayla")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {mesajlar.map((m, sira) => (
        <div key={sira}>
          {m.basari ? (
            <p className="text-xs font-medium text-emerald-600" role="status">
              {m.basari}
            </p>
          ) : null}
          {m.hatalar?.length ? (
            <p className="text-destructive text-xs font-medium" role="alert">
              {m.hatalar.join(" ")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
