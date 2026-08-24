"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { bantDisiMi, type KomisyonBandi } from "@/lib/komisyon-bandi";
import { Pencil, Power, PowerOff, Save, Trash2 } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formGonderimi } from "@/lib/form-gonderimi";

import {
  kanalSkuDurumDegistir,
  kanalSkuGuncelle,
  kanalSkuSil,
  type KanalSkuDurumu,
} from "./actions";
import { DURUM_YAZISI } from "@/lib/renkler";

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
  oranGosterilsin,
  bant,
  aktifMi,
}: {
  kayitId: string;
  sku: string;
  hesapEtiketi: string;
  kanalKodu: string;
  /** Boşsa "" — oran girilmemiş demektir. */
  oran: string;
  /** Komisyon alanı gösterilsin mi — yalnız SATIŞ hesabında anlamlı. */
  oranGosterilsin: boolean;
  /** Hakedişten gelen komisyon bandı — yoksa uyarı verilmez. */
  bant: KomisyonBandi | null;
  aktifMi: boolean;
}) {
  const t = useTranslations("KanalSku");
  const ortak = useTranslations("Ortak");

  const [alanlar, setAlanlar] = useState({ kanalKodu, oran });
  const [silAcik, setSilAcik] = useState(false);
  const [duzenleAcik, setDuzenleAcik] = useState(false);

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

  /**
   * Girilen oran bandın dışında mı? UYARIDIR, ENGEL DEĞİL — kampanyalı
   * ürünün oranı bandın dışında olabilir ve bu meşrudur. Amaç yanlış tuşu
   * yakalamak (%2 yerine %20 gibi).
   */
  const girilen = Number(alanlar.oran.replace(",", "."));
  const bantUyarisi =
    bant !== null &&
    alanlar.oran.trim() !== "" &&
    Number.isFinite(girilen) &&
    bantDisiMi(girilen, bant);

  // Silme başarılıysa diyalog kapanır; hata varsa AÇIK kalır ki mesaj görünsün.
  const [sonSilDurumu, setSonSilDurumu] = useState(silDurumu);
  if (sonSilDurumu !== silDurumu) {
    setSonSilDurumu(silDurumu);
    if (silDurumu.basari) setSilAcik(false);
  }

  const mesajlar = [durum, durumDurumu, silDurumu];

  /**
   * ⚠ FORM SATIRDAN ÇIKARILDI — DİYALOĞA ALINDI (24.08.2026).
   *
   * Kullanıcı: _"hiç mi düzen görmedin, değiştir ve optimize et."_ Haklıydı:
   * 2.182 satırın HER BİRİNDE iki `<Input>` + üç düğme + koşullu bir uyarı
   * metni çiziliyordu. Satır yükseklikleri uyarıya göre değişiyor, "Sil"
   * düğmesi alt satıra kaçıyor ve tablo bir tabloya değil yarım kalmış bir
   * forma benziyordu.
   *
   * ⚠ VE BİLGİ ZATEN ORADAYDI — ama OKUNUR değil YAZILIR hâlde. Kanal kodu
   * ve oran birer input kutusunun içindeydi; okumak için forma bakmak
   * gerekiyordu. Sütun olarak eklendiklerinde aynı değer İKİ KEZ göründü
   * (bir okunur, bir kutuda). Doğru bölüşüm: liste OKUR, diyalog YAZAR.
   *
   * ⚠ İLKE #1 KORUNUYOR: eylemler satırda GÖRÜNÜR duruyor — düzenle · pasife
   * al · sil, üç ikon. Gizlenen şey eylem değil, FORM ALANLARI.
   *
   * ⚠ İLKE #8: ikonlar telefonda 44px (`h-11`), masaüstünde kompakt
   * (`md:h-8`). Anayasa `icon-sm`/`icon-xs`in mobilde tek başına
   * kullanılmasını yasaklıyor.
   */
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Dialog open={duzenleAcik} onOpenChange={setDuzenleAcik}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 w-11 p-0 md:h-8 md:w-8"
              aria-label={t("duzenle")}
              title={t("duzenle")}
            >
              <Pencil className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("duzenle")}</DialogTitle>
              <DialogDescription>
                {t("silAciklama", { sku, hesap: hesapEtiketi })}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={formGonderimi(kaydetAction)}
              className="space-y-3"
            >
              <input type="hidden" name="id" value={kayitId} />

              <label className="block space-y-1">
                <span className="text-sm font-medium">
                  {t("sutunKanalKodu")}
                </span>
                <Input
                  name="channelSku"
                  value={alanlar.kanalKodu}
                  onChange={(e) =>
                    setAlanlar((o) => ({ ...o, kanalKodu: e.target.value }))
                  }
                  placeholder={t("kanalKoduIpucu")}
                  aria-label={t("sutunKanalKodu")}
                  autoComplete="off"
                  className="h-11 font-mono md:h-9"
                />
              </label>

              {/* ALIS HESABINDA KOMISYON ALANI YOK: ürünün tedarikçi
                  katalogundaki kodunun komisyonu olmaz. Boş bir kutu
                  göstermek, doldurulması gereken bir şey varmış izlenimi
                  verirdi. */}
              {oranGosterilsin ? (
                <label className="block space-y-1">
                  <span className="text-sm font-medium">
                    {t("oranEtiketi")}
                  </span>
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
                    className="h-11 max-w-32 md:h-9"
                  />
                </label>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("alisKoduNotu")}
                </p>
              )}

              {/* Bant dışı uyarısı KAYDETMEYİ ENGELLEMEZ: kampanyalı ürünün
                  oranı bandın dışında olabilir. Yanlış tuşu yakalamak için.
                  ⚠ Uyarı DİYALOGTA kalıyor, listeye taşınmadı: canlıda
                  577/1077 HB satırında yanıyor (%53,6) ve listede yarısı
                  kırmızı bir tablo, uyarıyı okunmaz yapar. */}
              {bantUyarisi && bant ? (
                <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                  {t("bantDisi", {
                    alt: bant.uyariAlt.toFixed(2),
                    ust: bant.uyariUst.toFixed(2),
                  })}
                </p>
              ) : null}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={!degisti || kaydediyor}
                  className="h-11 md:h-9"
                >
                  <Save />
                  {kaydediyor ? ortak("kaydediliyor") : t("kaydet")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <form action={durumAction}>
          <input type="hidden" name="id" value={kayitId} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-11 w-11 p-0 md:h-8 md:w-8"
            disabled={degisiyor}
            aria-label={aktifMi ? ortak("pasifeAl") : ortak("aktiflestir")}
            title={aktifMi ? ortak("pasifeAl") : ortak("aktiflestir")}
          >
            {aktifMi ? <PowerOff className="size-4" /> : <Power className="size-4" />}
          </Button>
        </form>

        <AlertDialog open={silAcik} onOpenChange={setSilAcik}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-11 p-0 md:h-8 md:w-8"
              aria-label={ortak("sil")}
              title={ortak("sil")}
            >
              <Trash2 className="size-4" />
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
            <p className={`text-xs font-medium ${DURUM_YAZISI.olumlu}`} role="status">
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
