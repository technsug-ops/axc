"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Store, TriangleAlert } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { satisHesabiDegistir, type SatisHesapDurumu } from "./hesap-actions";

export type SatisHesapSecenegi = {
  id: string;
  etiket: string;
  /** Kanal değişiyorsa kesinti kuralları da değişir — uyarı için. */
  channelId: string;
};

/**
 * ============================================================================
 *  SATIŞIN KANAL HESABINI DEĞİŞTİRME — DAR KAPSAMLI
 * ----------------------------------------------------------------------------
 *  Satışın tam düzenleme ekranı YOK ve bilerek yapılmadı: satış stok
 *  hareketi üretir (FIFO), kâr anında dondurulur. Serbest düzenleme bu
 *  zinciri sessizce bozardı.
 *
 *  Ama TEK bir alan için gerçek bir ihtiyaç var: satış yanlış kanal hesabına
 *  yazılmış olabilir (alış hesabına kaydedilmiş bir satış gibi). Bu, ledger'a
 *  DOKUNMADAN düzeltilebilecek bir hatadır.
 *
 *  ⚠ KANAL DEĞİŞİRSE KÂR BAYATLAR: kesinti kuralları (komisyon KDV'si,
 *  sabit gider, hizmet bedeli) KANAL bazındadır. Aynı kanalın başka
 *  hesabına taşımak kârı etkilemez; BAŞKA kanala taşımak etkiler ve
 *  ekranda söylenir — sessizce yeniden hesaplamıyoruz, çünkü kâr
 *  snapshot'ı kullanıcının onayıyla değişmeli.
 * ============================================================================
 */
export function HesapDegistir({
  saleId,
  mevcutHesapId,
  mevcutKanalId,
  secenekler,
}: {
  saleId: string;
  mevcutHesapId: string;
  mevcutKanalId: string;
  secenekler: SatisHesapSecenegi[];
}) {
  const t = useTranslations("Satis");
  const ortak = useTranslations("Ortak");

  const [acik, setAcik] = useState(false);
  const [secili, setSecili] = useState(mevcutHesapId);

  const [durum, formAction, bekliyor] = useActionState<
    SatisHesapDurumu,
    FormData
  >(satisHesabiDegistir, {});

  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setAcik(false);
  }

  const yeni = secenekler.find((s) => s.id === secili);
  const kanalDegisiyor = yeni !== undefined && yeni.channelId !== mevcutKanalId;

  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Store />
          {t("hesabiDegistir")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("hesabiDegistir")}</DialogTitle>
          <DialogDescription>{t("hesabiDegistirNotu")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="satis-hesap">{ortak("kanalHesabi")}</Label>
            <Select value={secili} onValueChange={setSecili}>
              <SelectTrigger id="satis-hesap" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {secenekler.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.etiket}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kanal değişiyorsa kesinti kuralları da değişir. */}
          {kanalDegisiyor ? (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
              <p className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {t("hesabiDegistirKanalUyarisi")}
              </p>
            </div>
          ) : null}

          <HataOzeti hatalar={durum.hatalar} />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAcik(false)}
          >
            {ortak("vazgec")}
          </Button>
          <Button
            type="button"
            disabled={bekliyor || secili === mevcutHesapId}
            onClick={() => {
              const veri = new FormData();
              veri.set("saleId", saleId);
              veri.set("channelAccountId", secili);
              // startTransition şart (useActionState kuralı).
              startTransition(() => formAction(veri));
            }}
          >
            {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
