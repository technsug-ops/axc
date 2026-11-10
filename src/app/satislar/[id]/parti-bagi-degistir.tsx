"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight } from "lucide-react";

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
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { useBicim } from "@/lib/bicim-istemci";
import type {
  PartiBagiDurumu,
  PartiHedefi,
} from "@/lib/parti-bagi-degistirme";
import {
  partiBagiOnizle,
  partiBaginiDegistir,
  partiHedefleriniGetir,
} from "@/app/satislar/[id]/parti-bagi-actions";

/**
 * ============================================================================
 *  SATIŞIN PARTİSİNİ DEĞİŞTİRME DİYALOĞU (K376, 10.11.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE BURADA: kullanıcı yanlış partiyi SATIŞ DETAYINDA gördü («Düşülen
 *  partiler» tablosunda) ve değiştirecek hiçbir yol yoktu. Düzeltme yolu,
 *  sorunun GÖRÜLDÜĞÜ yerde olmak zorunda. _(İlke #1.)_
 *
 *  ⛔ VE «MALİYETİ DÜZELT»İN YANINDA, ONUN YERİNE DEĞİL. İkisi farklı iş:
 *  o düğme partinin KENDİ maliyetini düzeltir (o partiden çeken BÜTÜN
 *  satışları etkiler), bu düğme yalnız BU satışın hangi partiden düştüğünü
 *  değiştirir. İkisini tek düğmeye sıkıştırmak, yanlış partiye bağlanmış bir
 *  satışı düzeltirken doğru olan öteki satışları bozmak olurdu.
 *
 *  ── ⛔ HEDEF LİSTESİ ELLE YAZILMAZ, SEÇİLİR ────────────────────────────
 *  Parti kimliği elle girilebilseydi kullanıcı başka varyantın, tükenmiş ya
 *  da satıştan sonra girmiş bir partinin kimliğini yazabilirdi. Liste
 *  sunucuda SÜZÜLÜ geliyor (aynı varyant · FIFO tarih sınırı içinde · kalan
 *  adedi yeterli) ve yazma kapısı aynı gövdeden geçiyor.
 *
 *  ── ⚠ ALANLAR `useState`TE — K375 ─────────────────────────────────────
 *  React 19 `<form action={fn}>` gönderiminde formu KOŞULSUZ sıfırlıyor
 *  (`requestFormReset`). İkinci adım formu yeniden okusaydı boş veri okurdu.
 *  Burada gerçeğin kaynağı yerel durum; ikinci adım gizli alanlarla ONU
 *  gönderiyor — yani onaylanan şey ekranda GÖRÜLEN plan.
 *
 *  ── ⚠ LİSTE DİYALOG AÇILINCA YÜKLENİR ─────────────────────────────────
 *  Sayfa yükünde değil: satış detayında onlarca parti satırı olabilir ve her
 *  biri için önceden parti okumak maliyeti satır sayısıyla DOĞRUSAL
 *  büyütürdü (27.08.2026 dersi).
 * ============================================================================
 */

export function PartiBagiDegistir({
  cikisId,
  mevcutParti,
}: {
  /** TAŞINACAK ÇIKIŞIN hareket kimliği — partinin değil. */
  cikisId: string;
  /** Ekranda görünen mevcut parti tarifi — kullanıcı neyi değiştirdiğini bilsin. */
  mevcutParti: string;
}) {
  const t = useTranslations("PartiBagi");
  const bicim = useBicim();
  const [acik, setAcik] = useState(false);

  const bos: PartiBagiDurumu = {};
  const [onizleme, onizleEylem, onizleBekliyor] = useActionState(
    partiBagiOnizle,
    bos,
  );
  const [yazim, yazEylem, yazBekliyor] = useActionState(
    partiBaginiDegistir,
    bos,
  );

  /**
   * ⚠ YEREL DURUM GERÇEĞİN KAYNAĞI (26.08.2026 canlı arızası · K375).
   * Seçim ve sebep burada yaşıyor; form sıfırlansa bile kaybolmaz.
   */
  const [hedefId, setHedefId] = useState("");
  const [sebep, setSebep] = useState("");

  const [hedefler, setHedefler] = useState<PartiHedefi[] | null>(null);
  const [listeHatasi, setListeHatasi] = useState<string | null>(null);
  const [yukleniyor, yukle] = useTransition();

  /** Diyalog açılınca listeyi getir — bir kez. */
  function acKapa(yeni: boolean) {
    setAcik(yeni);
    if (!yeni || hedefler !== null || yukleniyor) return;
    yukle(async () => {
      const cevap = await partiHedefleriniGetir(cikisId);
      if (cevap.durum === "HATA") {
        setListeHatasi(cevap.mesaj);
        setHedefler([]);
        return;
      }
      setListeHatasi(null);
      setHedefler(cevap.hedefler);
    });
  }

  const hatalar = yazim.hatalar ?? onizleme.hatalar ?? [];
  const ozet = yazim.basari ? null : onizleme.onizleme;
  const bitti = yazim.basari !== undefined;

  return (
    <Dialog open={acik} onOpenChange={acKapa}>
      <DialogTrigger asChild>
        {/* İlke #1 — eylem kaydın satırında GÖRÜNÜR durur, gizli değil. */}
        <Button variant="ghost" size="sm" className="min-h-11">
          <ArrowLeftRight className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("ac")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("baslik")}</DialogTitle>
          <DialogDescription>{t("aciklama")}</DialogDescription>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          {t("mevcut")}: <span className="tabular-nums">{mevcutParti}</span>
        </p>

        {/* ── ADIM 1: HEDEF SEÇ + SEBEP → ÖNİZLE ── */}
        <form action={onizleEylem} className="space-y-3">
          <input type="hidden" name="cikisId" value={cikisId} />
          <input type="hidden" name="hedefId" value={hedefId} />

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("hedefBaslik")}</p>

            {yukleniyor ? (
              <p className="text-muted-foreground text-sm">{t("yukleniyor")}</p>
            ) : null}

            {/*
              ⛔ BOŞ LİSTE SESSİZ KALMAZ — NEDEN boş olduğu yazar (İlke #5).
              "Baktım, uygun parti yok" ile "hiç bakamadım" aynı görünemez.
              _(Anayasa: boş sonuç ile temiz sonucu ayırt edemeyen denetim,
              denetim değildir.)_
            */}
            {!yukleniyor && hedefler !== null && hedefler.length === 0 ? (
              <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.notr}`}>
                {listeHatasi ?? t("hedefYokAciklama")}
              </p>
            ) : null}

            {hedefler !== null && hedefler.length > 0 ? (
              <ul className="space-y-2">
                {hedefler.map((h) => (
                  <li key={h.hareketId}>
                    <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border p-2 text-sm">
                      <input
                        type="radio"
                        name="hedefSecim"
                        className="mt-1 size-4"
                        checked={hedefId === h.hareketId}
                        onChange={() => setHedefId(h.hareketId)}
                        disabled={bitti}
                      />
                      <span className="min-w-0 space-y-0.5">
                        <span className="block font-medium">
                          {bicim.tarih(new Date(h.girisTarihi))}
                          {h.alimKodu ? (
                            <span className="text-muted-foreground">
                              {" · "}
                              {h.alimKodu}
                            </span>
                          ) : null}
                        </span>
                        {/*
                          ⚠ MALİYET TABANIYLA DEĞİL, PARA BİRİMİYLE yazılır:
                          `para()` biçimi VERİDEN gelen para biriminden kurar
                          (anayasa: `Intl.*` doğrudan YASAK).
                        */}
                        <span className="text-muted-foreground block">
                          {t("hedefSatiri", {
                            kalan: h.kalanAdet,
                            maliyet:
                              h.birimMaliyet === null || h.paraBirimi === null
                                ? t("maliyetYok")
                                : bicim.para(h.birimMaliyet, h.paraBirimi),
                          })}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor={"sebep-" + cikisId}>{t("sebep")}</Label>
            <Input
              id={"sebep-" + cikisId}
              name="sebep"
              placeholder={t("sebepIpucu")}
              value={sebep}
              onChange={(e) => setSebep(e.target.value)}
              disabled={bitti}
            />
          </div>

          {!bitti ? (
            <Button
              type="submit"
              variant="secondary"
              className="min-h-11"
              disabled={onizleBekliyor || hedefId === ""}
            >
              {t("onizle")}
            </Button>
          ) : null}

          {/* ⛔ KİLİTLİ DÜĞME SESSİZ KALMAZ (İlke #5). */}
          {!bitti && hedefId === "" ? (
            <p className="text-muted-foreground text-xs">{t("secimGerekli")}</p>
          ) : null}
        </form>

        {/* ── ADIM 2: ONAY VE YAZIM — yalnız önizleme ÇIKTIKTAN sonra ── */}
        {ozet ? (
          <form action={yazEylem} className="space-y-3 rounded-lg border p-3">
            {/*
              ⛔ FORM YENİDEN OKUNMAZ (K375): onaylanan şey ekranda GÖRÜLEN
              plandır ve aynı durumdan geliyor.
            */}
            <input type="hidden" name="cikisId" value={cikisId} />
            <input type="hidden" name="hedefId" value={hedefId} />
            <input type="hidden" name="sebep" value={sebep} />

            <p className="text-sm font-medium">{t("onizlemeBaslik")}</p>
            <p className="text-muted-foreground text-sm">
              {t("onizlemeOzeti", {
                adet: ozet.adet,
                eski: ozet.eskiMaliyet ?? "—",
                yeni: ozet.yeniMaliyet ?? "—",
              })}
            </p>

            {/**
             * ⛔ YÖN AÇIKÇA YAZILIR. "Değiştirdim" deyip NET'in sessizce
             * düşmesi sürpriz olurdu.
             * ⚠ VE `null` İLE `0` AYRI CÜMLE: `0` "fark yok" der, `null`
             * "hesaplanamadı" der. İkisini tek cümleye sıkıştırmak,
             * hesaplanamayan bir farkı «fark yok» diye göstermek olurdu.
             */}
            {ozet.fark === null ? (
              <p className={`text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                {t("farkHesaplanamadi")}
              </p>
            ) : ozet.fark !== 0 ? (
              <p className={`text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                {ozet.fark > 0
                  ? t("onizlemeFarkArtis", { fark: ozet.fark.toFixed(2) })
                  : t("onizlemeFarkAzalis", {
                      fark: Math.abs(ozet.fark).toFixed(2),
                    })}
              </p>
            ) : null}

            {/* ⛔ HEDEFİN MALİYETİ YOKSA KÂR NO_COST'A DÜŞER — sessiz kalmaz. */}
            {ozet.maliyetBilinmezOlacak ? (
              <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
                {t("maliyetBilinmezOlacak")}
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
              <Button type="submit" className="min-h-11" disabled={yazBekliyor}>
                {t("uygula")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
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
