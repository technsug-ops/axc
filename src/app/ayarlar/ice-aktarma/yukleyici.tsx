"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  TriangleAlert,
  Upload,
} from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

/**
 * ============================================================================
 *  İÇE AKTARMA EKRANI
 * ----------------------------------------------------------------------------
 *  Üç adım ekranda GÖRÜNÜR sırayla durur: şablonu indir → kipi seç →
 *  dosyayı yükle. Kullanıcı hangi adımda olduğunu okuyarak anlar.
 *
 *  ÖNİZLE-ÖNCE-YAZ: "Denetle" düğmesi hiçbir şey yazmaz. Yazma düğmesi
 *  ancak temiz bir önizleme geldikten sonra beliriyor ve onay diyaloğu
 *  istiyor (İlke #6 — geri alınamaz işlem).
 * ============================================================================
 */

type SatirHatasi = {
  sayfa: string | null;
  satir: number | null;
  alan: string | null;
  kod: string;
  deger?: string;
  ek?: string;
};

type Ozet = {
  yeniUrun: number;
  yeniVaryant: number;
  guncellenenVaryant: number;
  acilisPartisi: number;
  acilisAdet: number;
  yeniKanalSku: number;
  guncellenenKanalSku: number;
};

type Yanit =
  | { durum: "HATA"; hatalar: SatirHatasi[]; eksikSutunlar: { sayfa: string; sutun: string }[] }
  | { durum: "ONIZLEME"; ozet: Ozet }
  | { durum: "YAZILDI"; sonuc: Record<string, number> }
  | { durum: "COKTU"; mesaj: string };

type Kip = "YALNIZ_YENI" | "GUNCELLE";

export function Yukleyici() {
  const t = useTranslations("IceAktarma");
  const ortak = useTranslations("Ortak");
  const router = useRouter();

  const dosyaGirdisi = useRef<HTMLInputElement>(null);
  const [dosya, setDosya] = useState<File | null>(null);
  const [kip, setKip] = useState<Kip>("YALNIZ_YENI");
  const [yanit, setYanit] = useState<Yanit | null>(null);
  const [calisiyor, setCalisiyor] = useState<"denetle" | "yaz" | null>(null);
  const [onayAcik, setOnayAcik] = useState(false);

  /** Sayfa ve sütun anahtarlarının ekranda görünen adları. */
  const sayfaAdi = (anahtar: string | null) =>
    anahtar === "urunler"
      ? t("sayfaUrunler")
      : anahtar === "acilisStogu"
        ? t("sayfaAcilisStogu")
        : anahtar === "kanalSku"
          ? t("sayfaKanalSku")
          : "";

  const alanAdi = (anahtar: string | null) => {
    switch (anahtar) {
      case "urunAdi": return t("sutunUrunAdi");
      case "marka": return t("sutunMarka");
      case "varyantAdi": return t("sutunVaryantAdi");
      case "sku": return t("sutunSku");
      case "firmaSku": return t("sutunFirmaSku");
      case "barkod": return t("sutunBarkod");
      case "kategori": return t("sutunKategori");
      case "desi": return t("sutunDesi");
      case "raf": return t("sutunRaf");
      case "adet": return t("sutunAdet");
      case "birimMaliyet": return t("sutunBirimMaliyet");
      case "paraBirimi": return t("sutunParaBirimi");
      case "tarih": return t("sutunTarih");
      case "not": return t("sutunNot");
      case "kanalHesabi": return t("sutunKanalHesabi");
      case "kanalKodu": return t("sutunKanalKodu");
      case "komisyonOrani": return t("sutunKomisyonOrani");
      default: return "";
    }
  };

  /** Hata KODU -> Türkçe cümle. Anahtarlar tek tek yazılı: sözlük denetimi
   *  dinamik anahtarları göremiyor, buradaki her metin denetleniyor. */
  function hataMetni(h: SatirHatasi): string {
    const p = { alan: alanAdi(h.alan), deger: h.deger ?? "", ek: h.ek ?? "" };
    switch (h.kod) {
      case "ZORUNLU": return t("hataZORUNLU", p);
      case "SAYI_OLMALI": return t("hataSAYI_OLMALI", p);
      case "POZITIF_OLMALI": return t("hataPOZITIF_OLMALI", p);
      case "TAM_SAYI_OLMALI": return t("hataTAM_SAYI_OLMALI", p);
      case "ARALIK_DISI": return t("hataARALIK_DISI", p);
      case "TEKRAR_DOSYADA": return t("hataTEKRAR_DOSYADA", p);
      case "ZATEN_KAYITLI": return t("hataZATEN_KAYITLI", p);
      case "BULUNAMADI":
        return h.ek ? t("hataBULUNAMADI_ONERI", p) : t("hataBULUNAMADI", p);
      case "SKU_TANIMSIZ": return t("hataSKU_TANIMSIZ", p);
      case "GECERSIZ_SECENEK": return t("hataGECERSIZ_SECENEK", p);
      case "GECERSIZ_TARIH": return t("hataGECERSIZ_TARIH", p);
      case "PARA_BIRIMI_EKSIK": return t("hataPARA_BIRIMI_EKSIK");
      default: return t("hataHIC_SATIR_YOK");
    }
  }

  async function gonder(yaz: boolean) {
    if (!dosya) return;
    setCalisiyor(yaz ? "yaz" : "denetle");
    setOnayAcik(false);

    const govde = new FormData();
    govde.set("dosya", dosya);
    govde.set("kip", kip);
    if (yaz) govde.set("yaz", "1");

    try {
      const cevap = await fetch("/api/ice-aktarma", {
        method: "POST",
        body: govde,
      });
      const veri: Yanit = await cevap.json();
      setYanit(veri);
      if (veri.durum === "YAZILDI") {
        setDosya(null);
        if (dosyaGirdisi.current) dosyaGirdisi.current.value = "";
        router.refresh();
      }
    } catch {
      setYanit({ durum: "COKTU", mesaj: t("beklenmeyenHata") });
    } finally {
      setCalisiyor(null);
    }
  }

  const onizleme = yanit?.durum === "ONIZLEME" ? yanit.ozet : null;

  const ozetSatirlari = onizleme
    ? ([
        [t("ozetYeniUrun"), onizleme.yeniUrun],
        [t("ozetYeniVaryant"), onizleme.yeniVaryant],
        [t("ozetGuncellenenVaryant"), onizleme.guncellenenVaryant],
        [t("ozetAcilisPartisi"), onizleme.acilisPartisi],
        [t("ozetAcilisAdet"), onizleme.acilisAdet],
        [t("ozetYeniKanalSku"), onizleme.yeniKanalSku],
        [t("ozetGuncellenenKanalSku"), onizleme.guncellenenKanalSku],
      ] as const)
    : [];

  return (
    <div className="space-y-5">
      {/* ------------------------- 1. ŞABLON ------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adim1Baslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">{t("adim1Metin")}</p>
          <Button variant="outline" asChild>
            <a href="/api/ice-aktarma/sablon">
              <Download />
              {t("sablonIndir")}
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* --------------------------- 2. KİP -------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adim2Baslik")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["YALNIZ_YENI", t("kipYalnizYeni"), t("kipYalnizYeniNotu")],
              ["GUNCELLE", t("kipGuncelle"), t("kipGuncelleNotu")],
            ] as const
          ).map(([deger, baslik, not]) => (
            <button
              key={deger}
              type="button"
              onClick={() => setKip(deger)}
              className={
                kip === deger
                  ? "border-primary bg-primary/5 rounded-lg border-2 p-4 text-left"
                  : "hover:bg-accent rounded-lg border-2 border-transparent bg-transparent p-4 text-left ring-1 ring-border transition-colors"
              }
            >
              <div className="font-medium">{baslik}</div>
              <div className="text-muted-foreground mt-1 text-xs">{not}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* -------------------------- 3. DOSYA ------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adim3Baslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ice-dosya">{t("dosyaSec")}</Label>
            <input
              id="ice-dosya"
              ref={dosyaGirdisi}
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setDosya(e.target.files?.[0] ?? null);
                setYanit(null);
              }}
              className="file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 block w-full cursor-pointer rounded-md border px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:px-3 file:py-1.5"
            />
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <FileSpreadsheet className="size-3.5" />
              {dosya ? dosya.name : t("dosyaSecilmedi")}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => gonder(false)}
            disabled={!dosya || calisiyor !== null}
          >
            <Upload />
            {calisiyor === "denetle" ? t("denetleniyor") : t("denetle")}
          </Button>
        </CardContent>
      </Card>

      {/* --------------------------- SONUÇ --------------------------- */}
      {yanit?.durum === "COKTU" ? (
        <p
          className="text-destructive border-destructive/50 rounded-md border p-3 text-sm font-medium"
          role="alert"
        >
          {yanit.mesaj}
        </p>
      ) : null}

      {yanit?.durum === "HATA" ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <TriangleAlert className="size-5" />
              {t("hataBasligi", {
                sayi: yanit.hatalar.length + yanit.eksikSutunlar.length,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">{t("hataNotu")}</p>

            <ul className="space-y-2 text-sm">
              {yanit.eksikSutunlar.map((e, sira) => (
                <li key={`s-${sira}`} className="rounded-md border p-2">
                  {t("sutunHatasi", {
                    sayfa: sayfaAdi(e.sayfa),
                    sutun: alanAdi(e.sutun),
                  })}
                </li>
              ))}
              {yanit.hatalar.map((h, sira) => (
                <li key={sira} className="rounded-md border p-2">
                  {h.satir !== null ? (
                    <div className="text-muted-foreground font-mono text-xs">
                      {t("hataSatiri", {
                        sayfa: sayfaAdi(h.sayfa),
                        satir: h.satir,
                      })}
                    </div>
                  ) : null}
                  <div>{hataMetni(h)}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {onizleme ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="size-5" />
              {t("onizlemeBasligi")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">{t("onizlemeNotu")}</p>

            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ozetSatirlari.map(([etiket, deger]) => (
                <div key={etiket} className="rounded-lg border p-3">
                  <dt className="text-muted-foreground text-xs">{etiket}</dt>
                  <dd className="text-xl font-semibold">{deger}</dd>
                </div>
              ))}
            </dl>

            <AlertDialog open={onayAcik} onOpenChange={setOnayAcik}>
              <AlertDialogTrigger asChild>
                <Button disabled={calisiyor !== null}>
                  <Upload />
                  {calisiyor === "yaz" ? t("yaziliyor") : t("yaz")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("onayBasligi")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("onayAciklama", {
                      urun: onizleme.yeniUrun,
                      varyant: onizleme.yeniVaryant,
                      parti: onizleme.acilisPartisi,
                      kanal:
                        onizleme.yeniKanalSku + onizleme.guncellenenKanalSku,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
                  <Button type="button" onClick={() => gonder(true)}>
                    {t("yaz")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ) : null}

      {yanit?.durum === "YAZILDI" ? (
        <Card className="border-emerald-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="size-5" />
              {t("basariBasligi")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {t("basariNotu", {
                urun: yanit.sonuc.urun ?? 0,
                varyant: yanit.sonuc.varyant ?? 0,
                parti: yanit.sonuc.hareket ?? 0,
                adet: yanit.sonuc.adet ?? 0,
                kanal:
                  (yanit.sonuc.kanalSku ?? 0) +
                  (yanit.sonuc.guncellenenKanalSku ?? 0),
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/urunler">{t("urunlereGit")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/stok">{t("stogaGit")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
