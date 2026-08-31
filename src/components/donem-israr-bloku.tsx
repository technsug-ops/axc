"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import {
  DONEM_ISRAR_SEBEPLERI,
  type DonemIsrarSebebi,
} from "@/lib/donem-korumasi";

/**
 * ============================================================================
 *  DÖNEM ISRAR BLOĞU — DÖRT FORMDA TEK BİLEŞEN (K108, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ DÖRT KEZ YAZILMADI. Satış · mal kabul · iade · stok düzeltme aynı bloğu
 *  çiziyor; ayrı ayrı yazılsalardı biri gün gelip alan adını değiştirir ve o
 *  ekranda ısrar SESSİZCE geçersiz kalırdı — kullanıcı kutuyu işaretler,
 *  sunucu "işaretlenmedi" der ve sebebi hiçbir yerde görünmez.
 *
 *  ── ⭐ SOMUT SAYI, SOYUT UYARI DEĞİL (kullanıcı şartı 31.08.2026) ───────
 *  _"Bu dönemde N satış hesaplandı, dönem kapatıldı. Yazarsanız o dönemin
 *  rakamı değişir."_ — "bu dönem kapalı" gibi soyut bir cümle okunmaz;
 *  RAKAM okunur. Kullanıcı ne kadar şeyi etkilediğini görmeden ısrar edemez.
 *
 *  ── ⚠ SAYIM BLOĞUNDAN AYRI ─────────────────────────────────────────────
 *  Alan adları (`donemIsrari*`) ve sebep listesi ayrı. İkisi birleştirilseydi
 *  tek onay iki farklı riski birden geçerdi: biri FİZİKSEL (rafta ne var),
 *  öteki MALİ (beyan edilmiş vergi).
 *
 *  ⛔ VE EKRAN TEK KAPI DEĞİL: sunucu aynı ölçütü (`israrGecerliMi`) kendi
 *  başına koşuyor. Burada düğmeyi kilitlemek KOLAYLIKTIR, güvenlik değil.
 * ============================================================================
 */
export function DonemIsrarBloku({
  donem,
  satisSayisi,
  onGecerlilik,
}: {
  /** Kapalı dönem (`2026-07`). */
  donem: string;
  /** O dönemde hesaplanmış satış sayısı — uyarıdaki SOMUT rakam. */
  satisSayisi: number;
  /** Formun düğmeyi kilitleyebilmesi için geçerlilik bildirilir. */
  onGecerlilik?: (gecerli: boolean) => void;
}) {
  const t = useTranslations("Donem");
  const [onay, setOnay] = useState(false);
  const [sebep, setSebep] = useState<DonemIsrarSebebi | "">("");
  const [aciklama, setAciklama] = useState("");

  /**
   * ⚠ ÖLÇÜT EKRANDA DA AYNI: onay + sebep + (DIGER ise açıklama). Sunucu
   * `israrGecerliMi` gövdesini çağırıyor; burada aynı üç şart elle
   * yazılmıyor, aynı sırayla soruluyor ve sunucu son sözü söylüyor.
   */
  const gecerli =
    onay && sebep !== "" && (sebep !== "DIGER" || aciklama.trim() !== "");
  onGecerlilik?.(gecerli);

  return (
    <div
      className={`space-y-3 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}
      role="status"
    >
      <p className="font-medium">{t("israrBaslik")}</p>
      {/* ⭐ SOMUT RAKAM — soyut uyarı okunmaz. */}
      <p>{t("kapaliUyari", { donem, sayi: satisSayisi })}</p>

      <div className="space-y-1">
        <Label htmlFor="donem-israr-sebep">{t("israrSebep")}</Label>
        <select
          id="donem-israr-sebep"
          name="donemIsrariSebep"
          value={sebep}
          onChange={(e) => setSebep(e.target.value as DonemIsrarSebebi | "")}
          /** ⚠ 44 px — depoda birincil cihaz telefon (İlke #8). */
          className="border-input bg-background h-11 w-full rounded-md border px-3 md:h-10"
        >
          <option value="">{t("israrSebepSec")}</option>
          {DONEM_ISRAR_SEBEPLERI.map((s) => (
            <option key={s} value={s}>
              {t(`sebep${s}`)}
            </option>
          ))}
        </select>
      </div>

      {/*
        ⚠ AÇIKLAMA YALNIZ `DIGER`DE — ve seçilmediğinde alan BOŞ GÖNDERİLİYOR.
        Gizlemek yetmez: form eski değeri taşımaya devam ederse kullanıcı
        "Diğer"den vazgeçse bile eski açıklama kayda geçerdi.
      */}
      {sebep === "DIGER" ? (
        <div className="space-y-1">
          <Label htmlFor="donem-israr-aciklama">{t("israrAciklama")}</Label>
          <Input
            id="donem-israr-aciklama"
            name="donemIsrariAciklama"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="h-11 md:h-10"
          />
        </div>
      ) : (
        <input type="hidden" name="donemIsrariAciklama" value="" />
      )}

      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          name="donemIsrariOnay"
          value="1"
          className="mt-0.5 size-4 shrink-0"
          checked={onay}
          onChange={(e) => setOnay(e.target.checked)}
        />
        <span>{t("israrOnayMetni")}</span>
      </label>

      {/*
        ⚠ KİLİTLİ DÜĞME SESSİZ KALMAZ (İlke #5): niye ilerlemediği ve nasıl
        ilerleyeceği YAZILI. "Kaydet" gri duruyorsa sebebi ekranda olmalı.
      */}
      {!gecerli ? (
        <p className="font-medium">
          {!onay
            ? t("israrOnayGerek")
            : sebep === ""
              ? t("israrSebepGerek")
              : t("israrAciklamaGerek")}
        </p>
      ) : null}
    </div>
  );
}
