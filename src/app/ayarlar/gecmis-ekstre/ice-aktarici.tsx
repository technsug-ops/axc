"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import type { Onizleme } from "@/lib/gecmis/onizleme";
import {
  dosyayiIncele,
  ekstreleriYaz,
  onizlemeGetir,
  type CozumSonucu,
} from "./eylemler";

/**
 * ============================================================================
 *  GEÇMİŞ EKSTRE İÇE AKTARICI — ÜÇ ADIM
 * ----------------------------------------------------------------------------
 *  1) DOSYA      — çözülür, hiçbir şey yazılmaz
 *  2) EŞLEŞTİRME — 10 kart TEK TEK onaylanır (öneri + güven + değiştir + atla)
 *  3) ÖNİZLEME   — "N yazılacak, M atlandı (sebep dağılımı)" → sonra yazılır
 *
 *  ── NEDEN İKİ AYRI ONAY ─────────────────────────────────────────────────
 *  Eşleştirme yanlışsa bir kartın 16 aylık geçmişi başka karta yazılır ve
 *  HATA VERMEZ. Önizleme yanlışsa çift sayım girer. İkisi farklı hatalar,
 *  farklı anlarda görülür; tek onaya sıkıştırmak ikisini de gözden kaçırır.
 *
 *  ── OTOMATİK EŞLEŞTİRME YOK ─────────────────────────────────────────────
 *  Öneri ÖN-DOLU gelir ama onaylanmadan hiçbir kart yazılmaz. Gün
 *  eşleştirmesi ölçüldü ve 10 karttan 4'ünde yanlıştı; biri SESSİZCE.
 * ============================================================================
 */

type Adim = "dosya" | "eslesme" | "onizleme" | "bitti";

export function IceAktarici() {
  const t = useTranslations("GecmisEkstre");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();

  const [cozum, dosyaAction, dosyaBekliyor] = useActionState<
    CozumSonucu | null,
    FormData
  >(dosyayiIncele, null);

  const [secimler, setSecimler] = useState<Record<string, string>>({});
  const [onizleme, setOnizleme] = useState<Onizleme | null>(null);
  const [sonuc, setSonuc] = useState<{ yazilan: number; parti: string } | null>(
    null,
  );
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  /**
   * ADIM TÜRETİLİR, SAKLANMAZ. Ayrı bir "adim" durumu tutulsaydı iki gerçek
   * doğardı: veri ile ekranın gösterdiği adım ayrışabilirdi.
   */
  const adim: Adim = sonuc
    ? "bitti"
    : onizleme
      ? "onizleme"
      : cozum?.tamam
        ? "eslesme"
        : "dosya";

  const secim = (etiket: string): string =>
    secimler[etiket] ??
    (cozum?.tamam
      ? (cozum.oneriler.find((o) => o.excelEtiketi === etiket)?.onerilenKartId ??
        "")
      : "");

  const ATLA = "__atla__";

  return (
    <div className="space-y-4">
      {/* ---------------------------- 1) DOSYA ---------------------------- */}
      {adim === "dosya" ? (
        <form action={dosyaAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ge-dosya">{t("dosyaEtiketi")}</Label>
            <Input
              id="ge-dosya"
              name="dosya"
              type="file"
              accept=".xlsx"
              className="h-11 md:h-10"
            />
            <p className="text-muted-foreground text-xs">{t("dosyaNotu")}</p>
          </div>
          {cozum && !cozum.tamam ? (
            <p
              className={`rounded-lg p-3 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}
            >
              {cozum.hata}
            </p>
          ) : null}
          <Button type="submit" disabled={dosyaBekliyor} className="h-11 md:h-10">
            {dosyaBekliyor ? ortak("kaydediliyor") : t("dosyayiIncele")}
          </Button>
        </form>
      ) : null}

      {/* ------------------------- 2) EŞLEŞTİRME -------------------------- */}
      {adim === "eslesme" && cozum?.tamam ? (
        <div className="space-y-4">
          <div className={`rounded-lg p-3 text-sm ${DURUM_KUTUSU.bilgi}`}>
            {t("okumaOzeti", {
              ekstre: cozum.okuma.ekstreler.length,
              kart: cozum.okuma.kartlar.length,
              atlanan: cozum.okuma.atlananlar.length,
            })}
          </div>

          <AtlananRapor atlananlar={cozum.okuma.atlananlar} />

          <div className="space-y-2">
            <div className="text-sm font-medium">{t("eslesmeBaslik")}</div>
            <p className="text-muted-foreground text-xs">{t("eslesmeNotu")}</p>

            {/* Mobilde kart kart, masaüstünde iki sütun — 10 satır taşmasın. */}
            <div className="grid gap-2 lg:grid-cols-2">
              {cozum.okuma.kartlar.map((k) => {
                const oneri = cozum.oneriler.find(
                  (o) => o.excelEtiketi === k.etiket,
                );
                const secili = secim(k.etiket);
                const atlandi = secili === ATLA || secili === "";
                return (
                  <div
                    key={k.etiket}
                    className={`min-w-0 space-y-2 rounded-lg border p-3 ${
                      atlandi ? "bg-muted/40" : ""
                    }`}
                  >
                    <div className="min-w-0 text-sm font-medium break-words">
                      {k.etiket}
                    </div>
                    {oneri && oneri.onerilenKartId ? (
                      <p className="text-muted-foreground text-xs">
                        {t("guven", { yuzde: oneri.guven })}
                      </p>
                    ) : (
                      <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                        {t("oneriYok")}
                      </p>
                    )}
                    <Select
                      value={secili === "" ? ATLA : secili}
                      onValueChange={(v) =>
                        setSecimler((s) => ({ ...s, [k.etiket]: v }))
                      }
                    >
                      <SelectTrigger className="h-11 w-full md:h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* ATLA HER ZAMAN SEÇENEK: eşleşmeyen kart aktarımı
                            durdurmaz, kullanıcı onu dışarıda bırakır. */}
                        <SelectItem value={ATLA}>{t("bunuAtla")}</SelectItem>
                        {cozum.kartlar.map((sk) => (
                          <SelectItem key={sk.id} value={sk.id}>
                            {sk.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>

          {hata ? (
            <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{hata}</p>
          ) : null}

          <Button
            className="h-11 md:h-10"
            disabled={bekliyor}
            onClick={() =>
              basla(async () => {
                setHata(null);
                const cevap = await onizlemeGetir(
                  JSON.stringify(cozum.okuma.ekstreler),
                  JSON.stringify(cozum.okuma.atlananlar),
                  cozum.okuma.kartlar.map((k) => {
                    const s = secim(k.etiket);
                    return {
                      excelEtiketi: k.etiket,
                      kartId: s === "" || s === ATLA ? null : s,
                    };
                  }),
                );
                if (cevap.tamam) setOnizleme(cevap.onizleme);
                else setHata(cevap.hata);
              })
            }
          >
            {bekliyor ? ortak("kaydediliyor") : t("onizlemeyeGec")}
          </Button>
        </div>
      ) : null}

      {/* -------------------------- 3) ÖNİZLEME --------------------------- */}
      {adim === "onizleme" && onizleme ? (
        <div className="space-y-4">
          <div className={`rounded-lg p-4 ${DURUM_KUTUSU.bilgi}`}>
            <div className="text-lg font-semibold">
              {t("yazilacakOzet", { sayi: onizleme.yazilacaklar.length })}
            </div>
            <p className="text-sm">
              {t("donemAraligi", {
                ilk: onizleme.ilkDonem ?? "—",
                son: onizleme.sonDonem ?? "—",
              })}
              {" · "}
              {t("toplamBorc", {
                tutar: bicim.para(onizleme.toplamBorc, "TRY"),
              })}
            </p>
          </div>

          {/* Kart başına: kaç satır, hangi aralık, ne kadar. */}
          <div className="grid gap-2 sm:grid-cols-2">
            {onizleme.kartOzetleri.map((o) => (
              <div
                key={o.excelEtiketi}
                className={`min-w-0 rounded-lg border p-3 text-sm ${
                  o.kartId === null ? "bg-muted/40 opacity-70" : ""
                }`}
              >
                <div className="min-w-0 font-medium break-words">
                  {o.excelEtiketi}
                </div>
                {o.kartId === null ? (
                  <div className="text-muted-foreground text-xs">
                    {t("atlandi")}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-xs">
                    {t("kartOzeti", {
                      satir: o.satir,
                      ilk: o.ilkDonem ?? "—",
                      son: o.sonDonem ?? "—",
                    })}{" "}
                    · {bicim.para(o.toplamBorc, "TRY")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <CakismaRaporu onizleme={onizleme} />
          <AtlananRapor atlananlar={onizleme.atlananlar} />

          {hata ? (
            <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{hata}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              className="h-11 md:h-10"
              disabled={bekliyor || onizleme.yazilacaklar.length === 0}
              onClick={() =>
                basla(async () => {
                  setHata(null);
                  const cevap = await ekstreleriYaz(
                    JSON.stringify(onizleme.yazilacaklar),
                  );
                  if (cevap.tamam)
                    setSonuc({ yazilan: cevap.yazilan, parti: cevap.partiKodu });
                  else setHata(cevap.hata);
                })
              }
            >
              {bekliyor ? ortak("kaydediliyor") : t("yaz")}
            </Button>
            <Button
              variant="outline"
              className="h-11 md:h-10"
              onClick={() => setOnizleme(null)}
            >
              {t("eslesmeyeDon")}
            </Button>
          </div>
        </div>
      ) : null}

      {/* --------------------------- 4) SONUÇ ----------------------------- */}
      {adim === "bitti" && sonuc ? (
        <div className={`space-y-3 rounded-lg p-4 ${DURUM_KUTUSU.olumlu}`}>
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-5 shrink-0" />
            {t("yazildi", { sayi: sonuc.yazilan, parti: sonuc.parti })}
          </p>
          {/* YAZDIM AMA NEREDE GÖREMİYORUM olmasın — doğrudan bağlantı. */}
          <Button asChild className="h-11 md:h-10">
            <Link href="/kart-borcu">{t("kartBorcunaGit")}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Atlanan satırlar — SEBEP DAĞILIMIYLA. Sessiz atlama yok. */
function AtlananRapor({
  atlananlar,
}: {
  atlananlar: { sebep: string; kartEtiketi: string | null; ayrinti: string | null }[];
}) {
  const t = useTranslations("GecmisEkstre");
  if (atlananlar.length === 0) return null;

  const dagilim = new Map<string, number>();
  for (const a of atlananlar) {
    dagilim.set(a.sebep, (dagilim.get(a.sebep) ?? 0) + 1);
  }

  return (
    <details className="bg-muted/40 rounded-lg border px-3 py-2">
      <summary className="cursor-pointer text-sm">
        {t("atlananOzet", { sayi: atlananlar.length })}
      </summary>
      <ul className="mt-2 space-y-1">
        {[...dagilim.entries()].map(([sebep, sayi]) => (
          <li key={sebep} className="text-muted-foreground text-xs">
            <span className="font-medium">{t(`sebep_${sebep}`)}</span>: {sayi}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Çakışmalar — hangi kart, hangi ay, neden atlandı. */
function CakismaRaporu({ onizleme }: { onizleme: Onizleme }) {
  const t = useTranslations("GecmisEkstre");
  if (onizleme.cakismalar.length === 0) return null;

  const dagilim = new Map<string, number>();
  for (const c of onizleme.cakismalar) {
    dagilim.set(c.sebep, (dagilim.get(c.sebep) ?? 0) + 1);
  }

  return (
    <div className={`rounded-lg p-3 ${DURUM_KUTUSU.uyari}`}>
      <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
        <TriangleAlert className="size-4 shrink-0" />
        {t("cakismaBaslik", { sayi: onizleme.cakismalar.length })}
      </p>
      <ul className="mt-1 space-y-0.5">
        {[...dagilim.entries()].map(([sebep, sayi]) => (
          <li key={sebep} className="text-xs">
            {t(`cakisma_${sebep}`)}: {sayi}
          </li>
        ))}
      </ul>
    </div>
  );
}
