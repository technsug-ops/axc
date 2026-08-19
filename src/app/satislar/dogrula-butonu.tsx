"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { DURUM_YAZISI } from "@/lib/renkler";
import {
  DOGRULAMA_SEBEPLERI,
  notZorunluMu,
  sebepGecerliMi,
  type DogrulamaSebebi,
} from "@/lib/uyari/veri-dogrulama";

import { veriDogrula } from "./dogrula-actions";

/**
 * ============================================================================
 *  "DOĞRULA" DÜĞMESİ — İSTİSNAYI İŞARETLE
 * ----------------------------------------------------------------------------
 *  ⚠ YALNIZ ŞÜPHELİ SATIRDA ÇIKAR. Temiz kayıtta "doğrula" düğmesi hem
 *  anlamsız hem de listeyi kirletir; üstelik peşin susturmaya davet olurdu.
 *  Sunucu da bunu ayrıca reddediyor (ekrana güvenilmez).
 *
 *  ⚠ ONAY DİYALOĞU ZORUNLU. Yıkıcı bir işlem değil ama sistemin bir
 *  İDDİASINI değiştiriyor: "bu rakam yanlış görünüyor" diyen uyarıyı
 *  susturuyor. Tek tıkla susturulabilen uyarı, alışkanlıkla susturulur.
 *
 *  ⚠ SUSTURMA KALICI DEĞİL — diyalog bunu SÖYLÜYOR. Kullanıcı "bir kez
 *  geçtim, bir daha çıkmaz" sanmamalı: kaydın değerleri değişirse uyarı
 *  yeniden yanar ve bu bir kusur değil, tasarımdır.
 * ============================================================================
 */

export function DogrulaButonu({ saleItemId }: { saleItemId: string }) {
  const t = useTranslations("Satis");
  const [acik, setAcik] = useState(false);
  const [sebep, setSebep] = useState<DogrulamaSebebi>("KUPON_INDIRIM");
  const [not, setNot] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  /** Not `DIGER`de zorunlu; ötekilerde ALAN GÖRÜNÜR ama isteğe bağlı. */
  const notEksik = notZorunluMu(sebep) && not.trim() === "";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAcik(true)}
        title={t("dogrulaBaslik")}
      >
        <ShieldCheck className="size-4" />
        <span className="sr-only sm:not-sr-only">{t("dogrulaKisa")}</span>
      </Button>

      <Dialog open={acik} onOpenChange={setAcik}>
        {/* ⚠ KÜÇÜK EKRANDA KESİLMESİN. Halil turunda not alanı
            "yoktu" diye raporlandı; kod ölçümünde alan KOŞULSUZ
            çiziliyordu. Geriye tek makul açıklama kalıyor: diyalog
            görüş alanını taşıyor ve alan altta kalıyordu. Tavan
            yükseklik + kaydırma, o ihtimali kapatıyor. */}
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dogrulaBaslik")}</DialogTitle>
            <DialogDescription>{t("dogrulaAciklama")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dogrula-sebep">{t("dogrulaSebep")}</Label>
              <Select
                value={sebep}
                onValueChange={(d) => sebepGecerliMi(d) && setSebep(d)}
              >
                <SelectTrigger id="dogrula-sebep" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOGRULAMA_SEBEPLERI.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`dogrulaSebep_${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Not alanı HER ZAMAN görünür; yalnız DİĞER'de zorunlu.
                Gizlenen alan, seçim değişince beliren bir sürpriz olurdu. */}
            <div className="space-y-2">
              {/* ⚠ ETİKET HER ZAMAN "AÇIKLAMA". Önce "Not (isteğe bağlı)"
                  yazıyordu; "isteğe bağlı" ibaresi alanı atlanabilir
                  gösteriyor ve kullanıcı yazacağı şeyi yazmadan geçiyor.
                  Zorunluluk ayrı bir ek olarak duruyor. */}
              <Label htmlFor="dogrula-not">
                {t("dogrulaNot")}
                {notZorunluMu(sebep) ? (
                  <span className={DURUM_YAZISI.olumsuz}> {t("dogrulaZorunlu")}</span>
                ) : null}
              </Label>
              <Input
                id="dogrula-not"
                value={not}
                /* Yer tutucu SEBEBE göre: ne yazılacağını göstermek,
                   boş bir kutudan çok daha fazla davet eder. */
                placeholder={t(`dogrulaNotIpucu_${sebep}`)}
                onChange={(e) => setNot(e.target.value)}
                className="h-11"
              />
            </div>

            {/* SUSTURMA KALICI DEĞİL — kullanıcı bunu ONAYDAN ÖNCE bilsin. */}
            <p className="text-muted-foreground text-xs">{t("dogrulaGecicilik")}</p>

            {hata !== null ? (
              <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{hata}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAcik(false)}>
              {t("dogrulaVazgec")}
            </Button>
            <Button
              disabled={bekliyor || notEksik}
              onClick={() =>
                basla(async () => {
                  setHata(null);
                  const s = await veriDogrula(saleItemId, sebep, not);
                  if (s.hata) setHata(s.hata);
                  else setAcik(false);
                })
              }
            >
              {bekliyor ? t("dogrulaBekleniyor") : t("dogrulaOnayla")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
