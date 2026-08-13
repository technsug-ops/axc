"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Truck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBicim } from "@/lib/bicim-istemci";

import { kargoDurumuGuncelle } from "./actions";

/**
 * ============================================================================
 *  KARGOYA VERİLDİ — TEK TIKLA İŞARETLE, GERİ ALINABİLİR
 * ----------------------------------------------------------------------------
 *  _Kullanıcı kararı 14.08.2026: "kargoya teslim edilen ürünü manuel
 *  girebilirim." Giriş yeri: liste + detay._
 *
 *  İKİ KİP, TEK BİLEŞEN (İlke #10 — aynı işlem her ekranda aynı çalışır):
 *    `satir`  → listede: işaretli değilse tek düğme (bugünün tarihini yazar),
 *               işaretliyse tarih + kaldır düğmesi.
 *    `detay`  → satış detayında: tarih alanı da var, geçmişe dönük giriş için
 *               ("dün kargoya verdim, bugün kaydediyorum").
 *
 *  NEDEN ONAY DİYALOĞU YOK: bu bir LEDGER kaydı değil, operasyonel durum.
 *  Yanlış basıldıysa aynı yerden tek tıkla geri alınıyor ve hiçbir para
 *  hesabı değişmiyor. Yıkıcı eylem onayı (İlke #6) geri alınamayan işler
 *  içindir; buraya konsa her paket için iki tık olurdu.
 *
 *  BUGÜNÜN TARİHİ SUNUCUDAN GELİR: tarayıcının saati Almanya'da, iş takvimi
 *  Türkiye'de. `İstanbul günü` sunucuda üretiliyor (anayasa kuralı) — bu
 *  yüzden düğme boş gönderiyor, tarihi sunucu koyuyor.
 * ============================================================================
 */
export function KargoDurumu({
  saleId,
  shippedAt,
  kip = "satir",
}: {
  saleId: string;
  /** ISO gün metni (2026-08-14) ya da null. */
  shippedAt: string | null;
  kip?: "satir" | "detay";
}) {
  const t = useTranslations("Satis");
  const bicim = useBicim();
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [tarih, setTarih] = useState(shippedAt ?? "");

  const guncelle = (deger: string | null) => {
    setHata(null);
    basla(async () => {
      const sonuc = await kargoDurumuGuncelle(saleId, deger);
      if (sonuc.hata) setHata(sonuc.hata);
      else router.refresh();
    });
  };

  const isaretli = shippedAt !== null;

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1">
        {isaretli ? (
          <>
            <span className="text-xs whitespace-nowrap">
              {bicim.tarih(new Date(`${shippedAt}T00:00:00.000Z`))}
            </span>
            {/* İşareti kaldır — mobilde de basılabilir olsun diye 44px. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-11 md:size-8"
              aria-label={t("kargoIsaretiKaldir")}
              title={t("kargoIsaretiKaldir")}
              disabled={bekliyor}
              onClick={() => guncelle(null)}
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 md:h-8"
            disabled={bekliyor}
            /**
             * BOŞ METİN GÖNDERİLMEZ, "BUGÜN" İSTENİR: sunucu iş takvimi
             * gününü yazar. İstemci `new Date()` gönderseydi Almanya'da gece
             * yarısından sonra bir gün geriye yazardı.
             */
            onClick={() => guncelle("BUGUN")}
          >
            <Truck className="size-4" />
            {t("kargoyaVerildi")}
          </Button>
        )}
      </span>

      {/* DETAYDA TARİH DEĞİŞTİRİLEBİLİR: geçmişe dönük giriş için. */}
      {kip === "detay" ? (
        <span className="inline-flex items-center gap-2">
          <Input
            type="date"
            className="h-11 w-40 md:h-9"
            value={tarih}
            aria-label={t("kargoTarihi")}
            onChange={(e) => setTarih(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            className="h-11 md:h-9"
            disabled={bekliyor || tarih === (shippedAt ?? "")}
            onClick={() => guncelle(tarih === "" ? null : tarih)}
          >
            {t("kargoTarihiKaydet")}
          </Button>
        </span>
      ) : null}

      {hata ? (
        <span role="alert" className="text-destructive text-xs">
          {hata}
        </span>
      ) : null}
    </span>
  );
}
