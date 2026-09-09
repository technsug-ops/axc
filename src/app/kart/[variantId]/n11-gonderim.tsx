"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UploadCloud } from "lucide-react";

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
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_YAZISI } from "@/lib/renkler";

import {
  n11GonderimOnizle,
  n11StokFiyatGonder,
  type N11GonderimOnizlemesi,
  type N11GonderimSonucu,
} from "./actions";

/**
 * ============================================================================
 *  K194 — N11'E GÖNDER (stok / fiyat) — İKİNCİ KANALA-YAZAN EKRAN
 * ----------------------------------------------------------------------------
 *  ⚠ RAKAM GÖRÜLMEDEN GÖNDERİLMEZ: diyalog açılır açılmaz önizleme sunucudan
 *  gelir (kanal kodu · Selliora stoğu · N11'in bildirdiği adet kıyası);
 *  Gönder düğmesi önizleme gelmeden PASİF. _(Halil kuralı 09.09.2026:
 *  "yazım okumadan kategorik tehlikeli — asla körlemesine toplu".)_
 *
 *  ⛔ TY'DEN AYRILDIĞI YER — FİYAT İKİ SAYIDIR. TY'ye tek fiyat gidiyor
 *  (`salePrice` = `listPrice`); N11 bunu REDDEDİYOR: liste fiyatı satış
 *  fiyatından YÜKSEK olmalı, eşit bile olamaz. Bu yüzden burada iki alan var
 *  ve kural EKRANDA sınanıyor — kullanıcı kanaldan `FAIL` yemeden önce
 *  neden gönderemediğini görüyor.
 *  ⚠ Ekrandaki sınama BİR KOLAYLIKTIR, KAPI DEĞİL: asıl kapı sunucuda
 *  (`kalemGecerliMi`) ve istek oraya varmadan geçmiyor. İkisi aynı kuralı
 *  ölçüyor ama ekran susarsa sunucu yine durdurur.
 *
 *  ⚠ İKİSİ DE BOŞ BIRAKILABİLİR — boş, "fiyata dokunma" demektir; 0 ya da
 *  uydurma bir değer GÖNDERİLMEZ. Stok kutusu da kapatılabilir; ikisi de
 *  kapalıysa gönderilecek şey yoktur ve düğme bunu söyler (İlke #5).
 * ============================================================================
 */

const HATA_ANAHTARI: Record<
  Exclude<N11GonderimSonucu, { tamam: true }>["kod"],
  string
> = {
  KANAL_SKU_YOK: "hataKanalSkuYok",
  HESAP_YOK: "hataHesapYok",
  VARYANT_YOK: "hataVaryantYok",
  GONDERILECEK_YOK: "hataGonderilecekYok",
  KURAL_IHLALI: "hataKuralIhlali",
  ANAHTAR_YOK: "hataAnahtarYok",
  KANAL_REDDETTI: "hataKanalReddetti",
  ULASILAMADI: "hataUlasilamadi",
};

const ONIZLEME_HATA: Record<
  Exclude<N11GonderimOnizlemesi, { tamam: true }>["kod"],
  string
> = {
  KANAL_SKU_YOK: "hataKanalSkuYok",
  HESAP_YOK: "hataHesapYok",
  VARYANT_YOK: "hataVaryantYok",
};

export function N11Gonderim({ variantId }: { variantId: string }) {
  const t = useTranslations("KanalGonderimN11");
  const bicim = useBicim();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const [onizleme, setOnizleme] = useState<N11GonderimOnizlemesi | null>(null);
  const [stokGonder, setStokGonder] = useState(true);
  const [listeMetni, setListeMetni] = useState("");
  const [satisMetni, setSatisMetni] = useState("");
  const [sonuc, setSonuc] = useState<N11GonderimSonucu | null>(null);

  useEffect(() => {
    if (!acik || onizleme !== null) return;
    basla(async () => {
      setOnizleme(await n11GonderimOnizle(variantId));
    });
  }, [acik, onizleme, variantId]);

  /** Türkçe ondalık: "2.899,90" → 2899.9 (elle çözüm yalnız GİRİŞ yönünde). */
  const fiyatCoz = (metin: string): number | null => {
    const temiz = metin.trim();
    if (temiz === "") return null;
    const sayi = Number(temiz.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(sayi) ? sayi : Number.NaN;
  };

  const liste = fiyatCoz(listeMetni);
  const satis = fiyatCoz(satisMetni);
  const listeBozuk = liste !== null && Number.isNaN(liste);
  const satisBozuk = satis !== null && Number.isNaN(satis);
  const fiyatVar = liste !== null || satis !== null;

  /**
   * ⛔ N11 KURALLARI EKRANDA — ve sırası önemli: önce "ikisi birlikte", sonra
   * "liste > satış". Tersi olsaydı tek alan doldurulduğunda anlamsız bir
   * karşılaştırma mesajı çıkardı.
   */
  const kuralHatasi: string | null = (() => {
    if (!fiyatVar) return null;
    if (listeBozuk || satisBozuk) return "hataFiyatGecersiz";
    if (liste === null || satis === null) return "kuralIkisiBirlikte";
    if (!(liste > satis)) return "kuralListeYuksek";
    const kusurat = (s: number) => Math.round(s * 100) !== Number((s * 100).toFixed(6));
    if (kusurat(liste) || kusurat(satis)) return "kuralKusurat";
    return null;
  })();

  const gonder = () => {
    basla(async () => {
      const s = await n11StokFiyatGonder(variantId, {
        stokGonder,
        listeFiyati: liste !== null && !Number.isNaN(liste) ? liste : null,
        satisFiyati: satis !== null && !Number.isNaN(satis) ? satis : null,
      });
      setSonuc(s);
      if (s.tamam) router.refresh();
    });
  };

  const gonderilebilir =
    onizleme?.tamam === true &&
    kuralHatasi === null &&
    (stokGonder || fiyatVar);

  return (
    <AlertDialog
      open={acik}
      onOpenChange={(a) => {
        setAcik(a);
        if (!a) {
          setOnizleme(null);
          setSonuc(null);
          setListeMetni("");
          setSatisMetni("");
          setStokGonder(true);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-11 md:h-8">
          <UploadCloud className="size-4" />
          {t("dugme")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("baslik")}</AlertDialogTitle>
          <AlertDialogDescription>
            {sonuc === null ? t("aciklama") : null}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {sonuc !== null ? null : onizleme === null ? (
          <p className="text-sm" role="status">
            {t("yukleniyor")}
          </p>
        ) : !onizleme.tamam ? (
          <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
            {t(ONIZLEME_HATA[onizleme.kod])}
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="tabular-nums">
              <div>
                {t("stockCode")}:{" "}
                <span className="font-medium">{onizleme.stockCode}</span>
              </div>
              <div>
                {t("selioraStok")}:{" "}
                <span className="font-medium">
                  {bicim.sayi(onizleme.selioraStok)}
                </span>
                {" · "}
                {t("kanalAdet")}:{" "}
                <span className="font-medium">
                  {onizleme.kanalAdet === null
                    ? t("kanalAdetOlculmedi")
                    : bicim.sayi(onizleme.kanalAdet)}
                </span>
              </div>
            </div>
            <label className="flex min-h-11 items-center gap-2 md:min-h-8">
              <input
                type="checkbox"
                checked={stokGonder}
                onChange={(e) => setStokGonder(e.target.checked)}
                className="size-4"
              />
              {t("stokGonder", { adet: bicim.sayi(onizleme.selioraStok) })}
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block space-y-1">
                <span>{t("listeEtiketi")}</span>
                <Input
                  inputMode="decimal"
                  value={listeMetni}
                  onChange={(e) => setListeMetni(e.target.value)}
                  placeholder={t("fiyatIpucu")}
                />
              </label>
              <label className="block space-y-1">
                <span>{t("satisEtiketi")}</span>
                <Input
                  inputMode="decimal"
                  value={satisMetni}
                  onChange={(e) => setSatisMetni(e.target.value)}
                  placeholder={t("fiyatIpucu")}
                />
              </label>
            </div>
            {kuralHatasi !== null ? (
              <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">
                {t(kuralHatasi)}
              </p>
            ) : null}
            {!stokGonder && !fiyatVar ? (
              <p className={`text-xs ${DURUM_YAZISI.notr}`}>
                {t("gonderilecekYokUyari")}
              </p>
            ) : null}
          </div>
        )}

        {sonuc === null ? null : sonuc.tamam ? (
          <div className="space-y-1">
            <p className={`text-sm ${DURUM_YAZISI.olumlu}`} role="status">
              {t("basari", {
                stok:
                  sonuc.gonderilenStok === null
                    ? t("gonderilmedi")
                    : bicim.sayi(sonuc.gonderilenStok),
                liste:
                  sonuc.gonderilenListe === null
                    ? t("gonderilmedi")
                    : bicim.para(sonuc.gonderilenListe, "TRY"),
                satis:
                  sonuc.gonderilenSatis === null
                    ? t("gonderilmedi")
                    : bicim.para(sonuc.gonderilenSatis, "TRY"),
                durum: sonuc.taskDurumu,
              })}
            </p>
            {/**
             * ⛔ "KUYRUĞA ALINDI" ≠ "İŞLENDİ" — VE BU EKRANDA YAZAR.
             * N11 `IN_QUEUE` dönüyor ve sonucu ayrı bir servisten sorulmak
             * zorunda; o servisin yolu henüz elimizde yok. Bunu söylememek,
             * kabul edilmiş bir isteği başarılı sanmaya yol açardı.
             */}
            <p className={`text-xs ${DURUM_YAZISI.notr}`}>
              {t("kuyrukUyarisi", { taskId: String(sonuc.taskId) })}
            </p>
          </div>
        ) : (
          <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
            {t(HATA_ANAHTARI[sonuc.kod])}
            {sonuc.ayrinti ? ` (${sonuc.ayrinti})` : ""}
          </p>
        )}

        <AlertDialogFooter>
          {sonuc?.tamam ? (
            <AlertDialogCancel>{t("kapat")}</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel disabled={bekliyor}>
                {t("vazgec")}
              </AlertDialogCancel>
              <Button
                type="button"
                disabled={bekliyor || !gonderilebilir}
                onClick={gonder}
              >
                {bekliyor ? t("gonderiliyor") : t("gonderOnayla")}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
