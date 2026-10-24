"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useBicim } from "@/lib/bicim-istemci";
import { enUcuzaGoreFark, type ParaBirimi } from "@/lib/alim-fiyat-hafizasi";
import { DURUM_YAZISI } from "@/lib/renkler";

import { fiyatHafizasiEylemi, type HafizaSonucu } from "./fiyat-hafizasi-eylemi";

/**
 * ALIM FORMU — FİYAT HAFIZASI SATIRI (K363 Faz 2-d). Fiyat kutusunun altında:
 * «4 alış · en ucuz 1.069 (11.11.2025) · normal 1.250 · son 1.380 (02.10.2026)»
 * ve yazılan fiyat en ucuzdan ne kadar uzakta.
 * ⛔ HATIRLATMA, YARGI DEĞİL (iş sabiti «fiyatın yönü yoktur»): renk nötr,
 * kayıt engellenmez, fiyat kutusu DOLDURULMAZ (form kuralı: parayı tahmin etmek
 * değil — kullanıcı gerçek maliyeti kendisi yazar).
 */
export function FiyatHafizasiSatiri({
  variantId,
  haricAlimId,
  paraBirimi,
  yazilan,
  kiyasGecerli,
}: {
  variantId: string;
  /** Düzenlenen alım kendi geçmişine karışmaz. */
  haricAlimId: string | null;
  paraBirimi: ParaBirimi;
  /** Kutuya yazılan metin (boş/okunamaz olabilir). */
  yazilan: string;
  /** Bu fatura geçmişle AYNI tabanda mı (KDV dahil · kargo dahil · gümrüksüz). Değilse yazılan kıyaslanmaz. */
  kiyasGecerli: boolean;
}) {
  const t = useTranslations("Alim");
  const bicim = useBicim();
  /* Sonuç SORULAN ürünün anahtarıyla saklanır: ürün değişince eski ürünün geçmişi bir an bile yeni ürünün altında görünmez. */
  const anahtar = `${variantId}|${haricAlimId ?? ""}`;
  const [kayit, setKayit] = useState<{ anahtar: string; sonuc: HafizaSonucu } | null>(null);

  useEffect(() => {
    let iptal = false;
    fiyatHafizasiEylemi(variantId, haricAlimId)
      .then((s) => {
        if (!iptal) setKayit({ anahtar, sonuc: s });
      })
      /* Ağ hatası da SÖYLENİR (İlke #5) — sessizce boş satır kalmaz. */
      .catch(() => {
        if (!iptal) setKayit({ anahtar, sonuc: { tamam: false, hata: "HATA" } });
      });
    return () => {
      iptal = true;
    };
  }, [anahtar, variantId, haricAlimId]);

  const sonuc = kayit !== null && kayit.anahtar === anahtar ? kayit.sonuc : null;
  if (sonuc === null) return <p className="text-muted-foreground text-xs">{t("hafizaYukleniyor")}</p>;
  if (!sonuc.tamam) return <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t(sonuc.hata === "YETKISIZ" ? "hafizaYetkisiz" : "hafizaOkunamadi")}</p>;

  const h = sonuc[paraBirimi];
  const disarida = sonuc.kiyasDisi[paraBirimi];
  if (h === null) {
    return (
      <p className="text-muted-foreground text-xs">
        {disarida > 0 ? t("hafizaHepsiKiyasDisi", { sayi: disarida }) : t("hafizaYok")}
      </p>
    );
  }

  const fiyat = Number(yazilan.trim().replace(",", "."));
  const yazildi = yazilan.trim() !== "" && Number.isFinite(fiyat) && fiyat > 0;
  const fark = yazildi ? enUcuzaGoreFark(fiyat, h.enUcuz.fiyat) : null;
  const yon = fark === null ? "yok" : Math.abs(fark) < 0.05 ? "ayni" : fark > 0 ? "yukari" : "asagi";

  return (
    <div className="text-muted-foreground space-y-0.5 text-xs">
      <p>
        {t("hafizaOzet", {
          sayi: h.alisSayisi,
          enUcuz: bicim.para(h.enUcuz.fiyat, paraBirimi),
          enUcuzTarih: bicim.tarih(h.enUcuz.tarih),
          normal: bicim.para(h.normal, paraBirimi),
          son: bicim.para(h.son.fiyat, paraBirimi),
          sonTarih: bicim.tarih(h.son.tarih),
        })}
        {disarida > 0 ? ` ${t("hafizaKiyasDisi", { sayi: disarida })}` : ""}
        {h.cariKullanilan > 0 ? ` ${t("hafizaCariKullanildi", { sayi: h.cariKullanilan })}` : ""}
      </p>
      {!yazildi ? null : !kiyasGecerli ? (
        <p>{t("hafizaFarkliTaban")}</p>
      ) : fark === null ? null : (
        <p>{t("hafizaYazilan", { yon, fark: bicim.yuzde(Math.abs(fark)) })}</p>
      )}
    </div>
  );
}
