"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { DURUM_YAZISI } from "@/lib/renkler";
import type { PartiMaliyetDurumu } from "@/lib/parti-maliyeti";
import {
  partiMaliyetiOnizle,
  partiMaliyetiniDuzelt,
} from "@/app/stok/parti-maliyet-actions";

/**
 * ============================================================================
 *  PARTİ MALİYETİ DÜZELTME DİYALOĞU (K127, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE BURADA: kullanıcı yanlış maliyeti SATIŞ DETAYINDA gördü ("düşülen
 *  partiler" tablosunda) ve düzeltemedi. Düzeltme yolu, sorunun görüldüğü
 *  yerde olmak zorunda — ürün kartındaki açık parti listesi bu partiyi HİÇ
 *  göstermiyor, çünkü parti tamamen tüketilmiş.
 *  _(Anayasa İlke #1: bir kayıtta yapılabilecek işlem o kaydın satırında
 *  GÖRÜNÜR durur.)_
 *
 *  ── ⛔ İKİ ADIM: ÖNCE GÖSTER, SONRA YAZ ─────────────────────────────
 *  Yazım geçmiş satışların NET'ini değiştiriyor. Önizleme kaç çıkışın
 *  damgalanacağını, kaç satışın yeniden hesaplanacağını ve kârın hangi YÖNE
 *  ne kadar kayacağını söyler. Onay kutusu işaretlenmeden yazım yapılmaz.
 *  _(Anayasa: uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir.)_
 * ============================================================================
 */

export function PartiMaliyetDuzelt({
  hareketId,
  mevcutMaliyet,
}: {
  /** Düzeltilecek PARTİNİN hareket kimliği — çıkışın değil. */
  hareketId: string;
  /** Ekranda gösterilen mevcut maliyet metni. */
  mevcutMaliyet: string;
}) {
  const t = useTranslations("PartiMaliyet");
  const [acik, setAcik] = useState(false);
  const bos: PartiMaliyetDurumu = {};
  const [onizleme, onizleEylem, onizleBekliyor] = useActionState(
    partiMaliyetiOnizle,
    bos,
  );
  const [yazim, yazEylem, yazBekliyor] = useActionState(
    partiMaliyetiniDuzelt,
    bos,
  );

  /**
   * ⚠ YEREL DURUM GERÇEĞİN KAYNAĞI: alanlar yazılırken burada yaşıyor.
   * Değeri yalnız sunucudan okusaydık kutu DOLDURULAMAZ hâle gelirdi —
   * 26.08.2026 canlı arızası tam buydu.
   */
  const [yeniMaliyet, setYeniMaliyet] = useState("");
  const [sebep, setSebep] = useState("");

  const hatalar = yazim.hatalar ?? onizleme.hatalar ?? [];
  const ozet = yazim.basari ? null : onizleme.onizleme;

  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogTrigger asChild>
        {/* İlke #1 — eylem kaydın satırında GÖRÜNÜR durur, gizli değil. */}
        <Button variant="ghost" size="sm" className="min-h-11">
          <Pencil className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("ac")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("baslik")}</DialogTitle>
          <DialogDescription>{t("aciklama")}</DialogDescription>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          {t("mevcut")}: <span className="tabular-nums">{mevcutMaliyet}</span>
        </p>

        {/* ── ADIM 1: ÖNİZLEME ── */}
        <form action={onizleEylem} className="space-y-3">
          <input type="hidden" name="hareketId" value={hareketId} />
          <div className="space-y-1">
            <Label htmlFor="yeniMaliyet">{t("yeniMaliyet")}</Label>
            <Input
              id="yeniMaliyet"
              name="yeniMaliyet"
              inputMode="decimal"
              placeholder={t("yeniMaliyetIpucu")}
              value={yeniMaliyet}
              onChange={(e) => setYeniMaliyet(e.target.value)}
              disabled={yazim.basari !== undefined}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sebep">{t("sebep")}</Label>
            <Input
              id="sebep"
              name="sebep"
              placeholder={t("sebepIpucu")}
              value={sebep}
              onChange={(e) => setSebep(e.target.value)}
              disabled={yazim.basari !== undefined}
            />
          </div>
          {yazim.basari === undefined ? (
            <Button type="submit" variant="secondary" disabled={onizleBekliyor}>
              {t("onizle")}
            </Button>
          ) : null}
        </form>

        {/* ── ADIM 2: ONAY VE YAZIM — yalnız önizleme ÇIKTIKTAN sonra ── */}
        {ozet ? (
          <form action={yazEylem} className="space-y-3 rounded-lg border p-3">
            <input type="hidden" name="hareketId" value={hareketId} />
            <input type="hidden" name="yeniMaliyet" value={yeniMaliyet} />
            <input type="hidden" name="sebep" value={sebep} />
            <p className="text-sm font-medium">{t("onizlemeBaslik")}</p>
            <p className="text-muted-foreground text-sm">
              {t("onizlemeOzeti", {
                eski: ozet.eski ?? "—",
                yeni: ozet.yeni,
                adet: ozet.adet,
                cikis: ozet.cikis,
                satis: ozet.satis,
              })}
            </p>
            {/**
             * ⛔ YÖN AÇIKÇA YAZILIR. "Düzelttim" deyip NET'in sessizce
             * düşmesi sürpriz olurdu; hangi yöne ne kadar kayacağı burada.
             */}
            {ozet.fark !== 0 ? (
              <p className={`text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                {ozet.fark > 0
                  ? t("onizlemeFarkArtis", { fark: ozet.fark.toFixed(2) })
                  : t("onizlemeFarkAzalis", {
                      fark: Math.abs(ozet.fark).toFixed(2),
                    })}
              </p>
            ) : null}
            {/* ⛔ ONAY AÇIK — kutu işaretlenmeden kayıt ilerlemez. */}
            <label className="flex min-h-11 items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="onay"
                value="evet"
                className="mt-1 size-4"
              />
              <span>{t("onay")}</span>
            </label>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button type="submit" disabled={yazBekliyor}>
                {t("uygula")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAcik(false)}
              >
                {t("vazgec")}
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {/* ⛔ SESSİZ BAŞARISIZLIK YASAK (İlke #5) — sebep ekranda yazar. */}
        {hatalar.length > 0 ? (
          <ul className={`space-y-1 text-sm ${DURUM_YAZISI.olumsuz}`}>
            {hatalar.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : null}

        {yazim.basari ? (
          <p className={`text-sm font-medium ${DURUM_YAZISI.olumlu}`}>
            {yazim.basari}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
