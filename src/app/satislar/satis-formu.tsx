"use client";

import { DonemIsrarBloku } from "@/components/donem-israr-bloku";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, ExternalLink } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { AramaSonucuSatiri } from "@/components/arama-sonucu-satiri";
import { HataOzeti } from "@/components/hata-ozeti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formGonderimi } from "@/lib/form-gonderimi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBicim } from "@/lib/bicim-istemci";

import {
  varyantAra,
  varyantKodlaBul,
} from "../varyant-arama";
import { kodDizisi, type VaryantSonucu } from "@/lib/varyant-ozet";
import {
  kalemBilgisiGetir,
  kargoSecenekleriGetir,
  type KargoSecenegi,
} from "./kalem-bilgisi";
import { type SatisDurumu } from "./actions";
import { KarDurumu } from "./kar-durumu";
import type { SimulasyonZemini } from "@/lib/fiyatlama/kart-verisi";
import { oranUyarisi } from "@/lib/komisyon/oran-uyarisi";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { SAYIM_ISRAR_SEBEPLERI } from "@/lib/sayim-korumasi";

export type HesapSecenegi = {
  id: string;
  etiket: string;
  paraBirimi: "TRY" | "EUR";
};

type Kalem = {
  variantId: string;
  etiket: string;
  sku: string;
  quantity: number;
  unitPriceAmount: string;
  unitPriceCurrency: "TRY" | "EUR";
  /** Kalem eklenirken okunan stok — uyarı için, doğrulama sunucuda. */
  stok: number | null;
  /** Ürün desisi — toplam desi bundan hesaplanır. */
  desi: number | null;
  /** Çözülen KDV oranı (%) ve varsayılana düşülüp düşülmediği. */
  kdvOrani: number;
  kdvVarsayilan: boolean;
  /** Kanal SKU'sundan önerilen oran; kullanıcı değiştirebilir. */
  komisyonOrani: string;
  /**
   * Kanal SKU'sundan gelen KAYITLI oran — kullanıcının düzenlediği
   * değerden AYRI tutulur. Sapmayı ölçebilmek için orijinali saklamak
   * şart; yoksa "elle mi değiştirildi" sorusu cevaplanamaz.
   */
  onerilenOran: number | null;
  /** Panel gerçeği — doluysa oran yok sayılır. */
  komisyonTutari: string;
  /**
   * ZARARINA SATIŞ UYARISININ ZEMİNİ — K5 motoruna girdi.
   * ⚠ Form kendi kârını HESAPLAMAZ; `simulasyonKur`u çağırır. İkinci bir
   * NET hesabı yazsaydık aynı satış formda bir türlü, kaydedildikten
   * sonra başka türlü görünebilirdi.
   */
  birimMaliyet: number | null;
  zemin: SimulasyonZemini | null;
  /**
   * ⚠ ŞÜPHELİ DÜŞÜK ÖLÇÜTÜ — o kanalın YÜKLÜ tarifesindeki en düşük oran.
   * Sabit eşik değil: tarife her yüklendiğinde kendiliğinden tazelenir.
   */
  tarifeTabani: number | null;
  /**
   * ⚠ ŞÜPHELİ DÜŞÜK ORAN İÇİN AÇIK ONAY — kullanıcı kararı 20.08.2026:
   * _"kullanıcıya yanlış yapıp yapmadığı sorulsun; aynı şeyi söylemeye
   * devam ederse bu sipariş istisna kabul edilip KURAL BOZULMADAN devam
   * edilsin."_
   *
   * Kural zayıflatılmıyor: eşik yerinde kalıyor, uyarı her seferinde
   * çıkıyor. Değişen tek şey, kullanıcının o SİPARİŞ için "evet, doğru"
   * demesi ve bunun kayda geçmesi. (K6'nın form içindeki kardeşi.)
   */
  oranIstisnasi: boolean;
};

/** Radix Select bos deger kabul etmiyor; "kargo secilmedi" icin nobetci. */
const KARGO_YOK = "__kargo_yok__";

function varyantEtiketi(v: VaryantSonucu): string {
  const parcalar = [v.urunAdi];
  if (v.varyantAdi) parcalar.push(v.varyantAdi);
  return parcalar.join(" — ");
}

export function SatisFormu({
  hesaplar,
  action,
  bugun,
}: {
  hesaplar: HesapSecenegi[];
  action: (durum: SatisDurumu, formData: FormData) => Promise<SatisDurumu>;
  bugun: string;
}) {
  /** Dönem ısrarının geçerliliği — blok bildirir, düğme okur. */
  const [donemIsrarGecerli, setDonemIsrarGecerli] = useState(false);
  const [durum, formAction, bekliyor] = useActionState<SatisDurumu, FormData>(
    action,
    {},
  );

  const bicim = useBicim();
  const t = useTranslations("Satis");
  const ortak = useTranslations("Ortak");

  /**
   * ⭐ SAYIM KAPISI ISRARI — SATIŞ BAŞINA, kalem başına DEĞİL.
   * Kapıyı tetikleyen şey TARİH (`soldAt`) ve satışın tek tarihi var.
   * _(Komisyon `oranIstisnasi` kalem başına — çünkü ORAN kalem başına.)_
   */
  const [israrOnay, setIsrarOnay] = useState(false);
  const [israrSebep, setIsrarSebep] = useState("");
  const [israrAciklama, setIsrarAciklama] = useState("");

  // --- Başlık alanları ---
  const [code, setCode] = useState("");
  const [soldAt, setSoldAt] = useState(bugun);
  const [channelAccountId, setChannelAccountId] = useState("");
  const [note, setNote] = useState("");

  // --- Kalemler ---
  const [kalemler, setKalemler] = useState<Kalem[]>([]);

  // --- Kalem ekleme: TEK KUTU ---
  // `sorgu` hem okutulan kodu hem elle yazılan aramayı taşır. Okuyucu
  // Enter gönderince koddanEkle çalışır (tam eşleşme), elle yazınca
  // aşağıda eşleşen ürünler listelenir.
  const [sorgu, setSorgu] = useState("");
  const [barkodAdedi, setBarkodAdedi] = useState("1");
  const [barkodMesaji, setBarkodMesaji] = useState<string | null>(null);
  const barkodRef = useRef<HTMLInputElement>(null);
  const [sonuclar, setSonuclar] = useState<VaryantSonucu[]>([]);
  const [araniyor, setAraniyor] = useState(false);

  // --- kargo ---
  // Desi kalemlerden hesaplanır ama elle değiştirilebilir; kullanıcı
  // dokunduğu andan itibaren otomatik hesap devreye girmez.
  const [desiElle, setDesiElle] = useState<string | null>(null);
  const [cargoCarrierId, setCargoCarrierId] = useState("");
  /** Elle girilen KDV DAHİL kargo tutarı — doluysa tarife kullanılmaz. */
  const [kargoTutariElle, setKargoTutariElle] = useState("");
  /**
   * KAÇ PAKET — ölçüldü 20.08.2026 (TY paneli). Sipariş bölünürse
   * platform hizmet bedeli PAKET BAŞINA alınıyor (2 paket = 2 × 13,19).
   * Varsayılan "1": bölünmemiş sipariş zaten tek pakettir.
   */
  const [paketSayisi, setPaketSayisi] = useState("1");
  const [shipmentCode, setShipmentCode] = useState("");
  const [kargoSecenekleri, setKargoSecenekleri] = useState<KargoSecenegi[]>([]);

  /** Seçili kanal hesabının para birimi, yeni kalemler için varsayılan olur. */
  const varsayilanParaBirimi: "TRY" | "EUR" =
    hesaplar.find((h) => h.id === channelAccountId)?.paraBirimi ?? "TRY";

  useEffect(() => {
    const q = sorgu.trim();
    let iptal = false;

    const zamanlayici = setTimeout(async () => {
      if (q.length < 2) {
        if (!iptal) setSonuclar([]);
        return;
      }
      setAraniyor(true);
      try {
        const bulunan = await varyantAra(q);
        if (!iptal) setSonuclar(bulunan);
      } catch {
        if (!iptal) setSonuclar([]);
      } finally {
        if (!iptal) setAraniyor(false);
      }
    }, 300);

    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [sorgu]);

  async function kalemEkle(varyant: VaryantSonucu, adet: number) {
    // Stok, desi, KDV oranı ve komisyon oranı tek çağrıda gelir.
    // Hepsi ÖNERİDİR; kullanıcı formda değiştirebilir.
    let bilgi = null;
    try {
      /**
       * ⚠ SATIŞ TARİHİ GEÇİLİR — dilim ve taban O GÜNÜN penceresinden
       * çözülsün. Farklı dönemlerde %1'lik kampanyalar da olmuş; en yeni
       * pencereye bakmak, geçmiş bir satışın doğru oranını şüpheli
       * gösterirdi.
       */
      bilgi = await kalemBilgisiGetir(
        varyant.id,
        channelAccountId,
        soldAt ? new Date(soldAt) : undefined,
      );
    } catch {
      bilgi = null;
    }
    const stok = bilgi?.stok ?? null;

    setKalemler((onceki) => {
      const sira = onceki.findIndex((k) => k.variantId === varyant.id);
      if (sira >= 0) {
        // Aynı ürün tekrar okutulursa adet artar (peş peşe okutma akışı).
        return onceki.map((k, i) =>
          i === sira ? { ...k, quantity: k.quantity + adet, stok } : k,
        );
      }
      return [
        ...onceki,
        {
          variantId: varyant.id,
          etiket: varyantEtiketi(varyant),
          sku: varyant.sku,
          quantity: adet,
          unitPriceAmount: "",
          unitPriceCurrency: varsayilanParaBirimi,
          stok,
          desi: bilgi?.desi ?? null,
          kdvOrani: bilgi?.kdvOrani ?? 20,
          kdvVarsayilan: bilgi?.kdvKaynagi === "VARSAYILAN",
          komisyonOrani:
            bilgi?.komisyonOrani !== null && bilgi?.komisyonOrani !== undefined
              ? String(bilgi.komisyonOrani)
              : "",
          komisyonTutari: "",
          /**
           * KAYITLI oran ayrı saklanır. `komisyonOrani` kullanıcı
           * düzenledikçe değişir; sapmayı ölçmek için orijinal gerekir.
           * `null` = bu ürün için kayıtlı oran YOK → kullanıcı körüne
           * yazıyor demektir ve uyarı tam olarak bunu söyler.
           */
          onerilenOran: bilgi?.komisyonOrani ?? null,
          birimMaliyet: bilgi?.birimMaliyet ?? null,
          zemin: bilgi?.zemin ?? null,
          tarifeTabani: bilgi?.tarifeTabani ?? null,
          oranIstisnasi: false,
        },
      ];
    });
  }

  /** Enter (USB okuyucu) veya kamera: TAM eşleşen kodu doğrudan ekler. */
  async function koddanEkle(kod: string) {
    const adet = Math.max(1, Math.trunc(Number(barkodAdedi) || 1));
    setBarkodMesaji(null);

    try {
      const varyant = await varyantKodlaBul(kod);
      if (!varyant) {
        // Bulunamadıysa kutuyu TEMİZLEMİYORUZ: yazılan metin arama olarak
        // kalsın, kullanıcı aşağıdaki sonuçlardan seçebilsin.
        setBarkodMesaji(ortak("kodBulunamadi", { kod }));
        return;
      }

      await kalemEkle(varyant, adet);
      setBarkodMesaji(
        ortak("kalemEklendi", { urun: varyantEtiketi(varyant), adet }),
      );
      setSorgu("");
    } catch {
      setBarkodMesaji(ortak("aramaHatasi"));
    } finally {
      // Peş peşe okutma için kutuya geri dön.
      barkodRef.current?.focus();
    }
  }

  function kalemGuncelle(sira: number, degisim: Partial<Kalem>) {
    setKalemler((onceki) =>
      onceki.map((k, i) => (i === sira ? { ...k, ...degisim } : k)),
    );
  }

  const toplamlar = useMemo(() => {
    const harita = new Map<string, number>();
    for (const kalem of kalemler) {
      const fiyat = Number(kalem.unitPriceAmount.replace(",", "."));
      if (!Number.isFinite(fiyat)) continue;
      harita.set(
        kalem.unitPriceCurrency,
        (harita.get(kalem.unitPriceCurrency) ?? 0) + fiyat * kalem.quantity,
      );
    }
    return [...harita.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [kalemler]);

  /** Kalemlerden hesaplanan toplam desi. */
  const hesaplananDesi = useMemo(
    () => kalemler.reduce((t, k) => t + (k.desi ?? 0) * k.quantity, 0),
    [kalemler],
  );

  /** Formdaki geçerli desi: kullanıcı dokunduysa onun değeri. */
  const desiMetni =
    desiElle ?? (hesaplananDesi > 0 ? String(hesaplananDesi) : "");
  const desiSayi = Number(desiMetni.replace(",", ".")) || 0;

  // Desi veya kanal hesabı değişince kargo fiyatları yeniden okunur.
  useEffect(() => {
    let iptal = false;

    // setState doğrudan efekt gövdesinde çağrılmaz (React Compiler kuralı);
    // erken çıkış da zamanlayıcının içinde yapılır — arama efektiyle aynı kalıp.
    const zamanlayici = setTimeout(async () => {
      if (!channelAccountId || desiSayi <= 0) {
        if (!iptal) setKargoSecenekleri([]);
        return;
      }
      try {
        const liste = await kargoSecenekleriGetir(channelAccountId, desiSayi);
        if (!iptal) setKargoSecenekleri(liste);
      } catch {
        if (!iptal) setKargoSecenekleri([]);
      }
    }, 250);
    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [channelAccountId, desiSayi]);

  /**
   * ⚠ ONAY BEKLEYEN ŞÜPHELİ ORAN — kayıt İLERLEMEZ.
   *
   * "Kullanıcıya sorulsun" demek, cevabı beklemek demektir. Ama cevap
   * "evet, doğru" olabilir: doğruyu sistem değil kullanıcı biliyor.
   * Kural zayıflamıyor — uyarı her seferinde çıkıyor, yalnız bu SİPARİŞ
   * için açık onay alınıyor ve kayda geçiyor.
   */
  const onayBekleyen = kalemler.some((k) => {
    if (k.oranIstisnasi) return false;
    const ham = k.komisyonOrani.replace(",", ".").trim();
    const sayi = ham === "" ? null : Number(ham);
    const fiyatHam = k.unitPriceAmount.replace(",", ".").trim();
    const fiyat = fiyatHam === "" ? null : Number(fiyatHam);
    return (
      oranUyarisi({
        girilen: sayi !== null && Number.isFinite(sayi) ? sayi : null,
        onerilen: k.onerilenOran,
        dilimler: k.zemin?.dilimler ?? null,
        fiyat: fiyat !== null && Number.isFinite(fiyat) ? fiyat : null,
        tarifeTabani: k.tarifeTabani,
      })?.tur === "SUPHELI_DUSUK"
    );
  });

  const gonderilecek = {
    code,
    shipmentCode,
    soldAt,
    channelAccountId,
    note,
    cargoCarrierId: cargoCarrierId || null,
    cargoDesi: desiSayi > 0 ? desiSayi : null,
    /**
     * ⚠ EN AZ 1. Boş ya da anlamsız değer tek pakete düşer; "0 paket"
     * diye bir gerçeklik yok ve sıfır, kesintiyi yok ederdi.
     */
    paketSayisi: (() => {
      const n = Number(paketSayisi.replace(",", "."));
      return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1;
    })(),
    cargoAmountManual: (() => {
      const n = Number(kargoTutariElle.replace(",", "."));
      return kargoTutariElle.trim() !== "" && Number.isFinite(n) ? n : null;
    })(),
    /**
     * ⭐ SAYIM KAPISI ISRARI — kapı tetiklenmediyse HİÇ GÖNDERİLMEZ.
     * ⚠ Boş bir nesne göndermek "ısrar edildi ama geçersiz" demek olurdu;
     * `undefined` "ısrar edilmedi" der ve sunucu kapıyı normal işletir.
     */
    sayimIsrari:
      israrOnay || israrSebep !== ""
        ? {
            onaylandi: israrOnay,
            sebep: israrSebep === "" ? null : israrSebep,
            aciklama: israrAciklama,
          }
        : undefined,
    kalemler: kalemler.map((k) => {
      const sayi = Number(k.unitPriceAmount.replace(",", "."));
      const oran = Number(k.komisyonOrani.replace(",", "."));
      const tutar = Number(k.komisyonTutari.replace(",", "."));
      return {
        variantId: k.variantId,
        quantity: k.quantity,
        unitPriceAmount:
          k.unitPriceAmount.trim() !== "" && Number.isFinite(sayi)
            ? sayi
            : null,
        unitPriceCurrency: k.unitPriceCurrency,
        vatRate: k.kdvOrani,
        commissionRate:
          k.komisyonOrani.trim() !== "" && Number.isFinite(oran) ? oran : null,
        commissionAmount:
          k.komisyonTutari.trim() !== "" && Number.isFinite(tutar)
            ? tutar
            : null,
        /**
         * ŞÜPHELİ DÜŞÜK ORAN AÇIKÇA ONAYLANDI MI — kayda gider.
         * "İstisna kabul edilip devam edilsin" demek, istisnanın İZ
         * BIRAKMASI demektir; yoksa üç ay sonra "bu neden böyle" sorusu
         * cevapsız kalır.
         */
        oranIstisnasi: k.oranIstisnasi,
      };
    }),
  };

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-6">
      <input type="hidden" name="veri" value={JSON.stringify(gonderilecek)} />

      {/* ----------------------------- BAŞLIK ----------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("satisBilgileri")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="satis-kod">{ortak("siparisNo")}</Label>
              {/* Pazaryeri fişindeki barkod okutulabilir (#7). */}
              <BarkodGirisi
                id="satis-kod"
                value={code}
                onChange={setCode}
                placeholder={t("siparisNoIpucu")}
                kameraBasligi={t("siparisNoKamera")}
              />
              <p className="text-muted-foreground text-xs">
                {t("siparisNoNotu")}
              </p>
            </div>

            {/*
              GÖNDERİ (TAKİP) NUMARASI — K41①, 24.08.2026.

              ⚠ SİPARİŞ NO İLE AYNI KALIP: isteğe bağlı, girilirse benzersiz,
              okutulabilir. Farklı bir kalıp kurmak, iki kod alanını iki ayrı
              şey gibi gösterirdi (İlke #10: aynı işlem her yerde aynı görünür).

              ⚠ BOŞ BIRAKILABİLİR ve bu BEKLENEN durumdur: kod pazaryerinde
              satıştan SONRA oluşuyor. Bu yüzden satış düzenleme ekranından
              sonradan da girilebiliyor — zorunlu yapmak, kodu henüz olmayan
              bir satışı kaydettirmemek olurdu.
            */}
            <div className="space-y-2">
              <Label htmlFor="satis-gonderi">{t("gonderiNo")}</Label>
              <BarkodGirisi
                id="satis-gonderi"
                value={shipmentCode}
                onChange={setShipmentCode}
                placeholder={t("gonderiNoIpucu")}
                kameraBasligi={t("gonderiNoKamera")}
              />
              <p className="text-muted-foreground text-xs">
                {t("gonderiNoNotu")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="satis-tarih">{t("satisTarihi")} *</Label>
              <Input
                id="satis-tarih"
                type="date"
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="satis-hesap">{ortak("kanalHesabi")} *</Label>
              <Select
                value={channelAccountId}
                onValueChange={setChannelAccountId}
              >
                <SelectTrigger id="satis-hesap" className="w-full">
                  <SelectValue placeholder={t("hesapSecin")} />
                </SelectTrigger>
                <SelectContent>
                  {hesaplar.map((hesap) => (
                    <SelectItem key={hesap.id} value={hesap.id}>
                      {hesap.etiket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hesaplar.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t.rich("hesapYokNotu", {
                    baglanti: (parca) => (
                      <Link
                        href="/ayarlar/kanallar"
                        className="underline underline-offset-4"
                      >
                        {parca}
                      </Link>
                    ),
                  })}
                </p>
              ) : null}
            </div>
          </div>

          {/* ------------------------------ KARGO ------------------------------ */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="text-sm font-medium">{t("kargoBasligi")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="satis-desi">{t("desiEtiketi")}</Label>
                <Input
                  id="satis-desi"
                  value={desiMetni}
                  onChange={(e) => setDesiElle(e.target.value)}
                  inputMode="decimal"
                  placeholder={t("desiIpucu")}
                />
                <p className="text-muted-foreground text-xs">{t("desiNotu")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="satis-kargo">{t("kargoFirmasi")}</Label>
                <Select
                  value={cargoCarrierId || KARGO_YOK}
                  onValueChange={(d) =>
                    setCargoCarrierId(d === KARGO_YOK ? "" : d)
                  }
                >
                  <SelectTrigger id="satis-kargo" className="w-full">
                    <SelectValue placeholder={t("kargoSecin")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={KARGO_YOK}>
                      {t("kargoSecilmedi")}
                    </SelectItem>
                    {kargoSecenekleri.map((k, sira) => (
                      <SelectItem
                        key={k.carrierId}
                        value={k.carrierId}
                        disabled={!k.tasiyorMu}
                      >
                        {k.tasiyorMu ? (
                          <span className="flex w-full items-center gap-2">
                            <span>{k.ad}</span>
                            <span className="font-medium">
                              {bicim.para(k.kdvDahil ?? 0, "TRY")}
                            </span>
                            {/* En ucuz = ilk sıradaki; öneri dayatma değil. */}
                            {sira === 0 ? (
                              <Badge variant="secondary">
                                {t("kargoOnerilen")}
                              </Badge>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {k.ad} — {t("kargoTasimiyor")}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {!channelAccountId
                    ? t("kargoHesapYok")
                    : desiSayi <= 0
                      ? t("kargoDesiYok")
                      : t("kargoNotu")}
                </p>
              </div>
            </div>

            {/* Panel gerçeği tarifeden sapabilir — komisyondaki oran/tutar
                ikilisinin aynısı: tutar girilirse tarife kullanılmaz. */}
            <div className="space-y-2">
              <Label htmlFor="satis-kargo-tutar">{t("kargoTutariElle")}</Label>
              <Input
                id="satis-kargo-tutar"
                value={kargoTutariElle}
                onChange={(e) => setKargoTutariElle(e.target.value)}
                inputMode="decimal"
                placeholder={t("kargoTutariIpucu")}
                className="max-w-xs"
              />
              <p className="text-muted-foreground text-xs">
                {t("kargoTutariNotu")}
              </p>
            </div>

            {/* ---------- PAKET SAYISI ----------
                ⚠ KARGO ÜÇLÜSÜNÜN YANINDA: bölünme kargo kararıyla birlikte
                doğuyor, orada sorulması doğal.

                ⚠ ALANIN NİYE VAR OLDUĞU YAZILI. Sayı kutusu tek başına
                "neden soruyorsun" sorusunu bırakır; yardım metni kesintiyi
                söylüyor. */}
            <div className="space-y-2">
              <Label htmlFor="satis-paket">{t("paketSayisi")}</Label>
              <Input
                id="satis-paket"
                value={paketSayisi}
                onChange={(e) => setPaketSayisi(e.target.value)}
                inputMode="numeric"
                placeholder={t("paketSayisiIpucu")}
                className="max-w-xs"
              />
              <p className="text-muted-foreground text-xs">
                {t("paketSayisiNotu")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="satis-not">{ortak("aciklama")}</Label>
            <Textarea
              id="satis-not"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={ortak("istegeBagli")}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------- KALEM EKLEME + KALEMLER (TEK KART) ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            {ortak("kalemlerBasligi", { sayi: kalemler.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TEK KUTU: okutma ve arama aynı alanda. Okutucu Enter gönderir →
              tam eşleşme doğrudan eklenir; elle yazınca aşağıda sonuçlar
              çıkar. İki ayrı kutu, eklenen kalemleri ekrandan uzaklaştırıyordu. */}
          <div className="space-y-2">
            <Label htmlFor="satis-ekle">{ortak("urunEkle")}</Label>
            <div className="flex flex-wrap items-start gap-2">
              <BarkodGirisi
                id="satis-ekle"
                className="min-w-56 flex-1"
                value={sorgu}
                onChange={setSorgu}
                onOkundu={koddanEkle}
                inputRef={barkodRef}
                placeholder={ortak("ekleIpucu")}
                kameraBasligi={ortak("barkodKamera")}
              />
              <div className="w-24">
                <Input
                  value={barkodAdedi}
                  onChange={(e) => setBarkodAdedi(e.target.value)}
                  inputMode="numeric"
                  aria-label={ortak("adetEtiketi")}
                  placeholder={ortak("adetIpucu")}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">{ortak("ekleNotu")}</p>
            {barkodMesaji ? (
              <p className="text-sm" role="status">
                {barkodMesaji}
              </p>
            ) : null}
            {araniyor ? (
              <p className="text-muted-foreground text-xs">
                {ortak("araniyor")}
              </p>
            ) : null}
            {sonuclar.length ? (
              <ul className="divide-y rounded-md border">
                {sonuclar.map((varyant) => (
                  <AramaSonucuSatiri
                    key={varyant.id}
                    baslik={varyantEtiketi(varyant)}
                    kodlar={kodDizisi(varyant)}
                    ekleEtiketi={ortak("ekle")}
                    onEkle={() => {
                      void kalemEkle(varyant, 1);
                      setSorgu("");
                    }}
                  />
                ))}
              </ul>
            ) : null}
          </div>

          {kalemler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{ortak("bosKalemBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {ortak("bosKalemIpucu")}
              </p>
            </div>
          ) : (
            kalemler.map((kalem, sira) => {
              const stokYetersiz =
                kalem.stok !== null && kalem.quantity > kalem.stok;

              return (
                <div
                  key={kalem.variantId}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{kalem.etiket}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {kalem.sku}
                      </div>
                      {kalem.stok !== null ? (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {kalem.stok > 0
                            ? t("mevcutStok", { adet: kalem.stok })
                            : t("stokYok")}
                        </div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setKalemler((onceki) =>
                          onceki.filter((_, i) => i !== sira),
                        )
                      }
                    >
                      <Trash2 />
                      {ortak("kaldir")}
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`adet-${sira}`}>{ortak("adet")}</Label>
                      <Input
                        id={`adet-${sira}`}
                        value={String(kalem.quantity)}
                        inputMode="numeric"
                        onChange={(e) =>
                          kalemGuncelle(sira, {
                            quantity: Math.max(
                              1,
                              Math.trunc(Number(e.target.value) || 1),
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`fiyat-${sira}`}>
                        {t("birimSatisFiyati")}
                      </Label>
                      <Input
                        id={`fiyat-${sira}`}
                        value={kalem.unitPriceAmount}
                        inputMode="decimal"
                        placeholder={ortak("fiyatIpucu")}
                        onChange={(e) =>
                          kalemGuncelle(sira, {
                            unitPriceAmount: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`para-${sira}`}>
                        {ortak("paraBirimi")}
                      </Label>
                      {/* KDV oranı ürünün kategorisinden geldi; sadece bilgi. */}
                      <Select
                        value={kalem.unitPriceCurrency}
                        onValueChange={(d) =>
                          kalemGuncelle(sira, {
                            unitPriceCurrency: d as "TRY" | "EUR",
                          })
                        }
                      >
                        <SelectTrigger id={`para-${sira}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRY">TRY</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* --- komisyon: oran ÖNERİLİR, tutar EZER --- */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`komisyon-oran-${sira}`}>
                        {t("komisyonOrani")}
                      </Label>
                      <Input
                        id={`komisyon-oran-${sira}`}
                        value={kalem.komisyonOrani}
                        inputMode="decimal"
                        /**
                         * KURAL #11 İHLALİ DÜZELTİLDİ: burada "0" yazıyordu.
                         * Gri bir "0", girilmiş bir oran sanılabilir — üstelik
                         * %0 komisyon mümkün görünen bir değer. Yer tutucu
                         * artık "örn." ile başlıyor.
                         */
                        placeholder={t("komisyonIpucu")}
                        onChange={(e) =>
                          kalemGuncelle(sira, { komisyonOrani: e.target.value })
                        }
                      />
                      {/* ---------------- ORAN UYARISI ----------------
                          18.08.2026 ölçümü: üç satış %2,70 oranla
                          kaydedilmiş, gerçeği %15; kâr ~721 TL fazla
                          göründü. Kanal SKU'su satıştan SONRA açıldığı
                          için oran forma ELLE yazılmıştı ve hiçbir şey
                          uyarmamıştı.

                          UYARI, ENGEL DEĞİL: oran gerçekten düşük
                          olabilir (kampanya, özel anlaşma). Kaydı
                          durdurmak operasyoncuyu kilitlerdi. */}
                      {(() => {
                        const ham = kalem.komisyonOrani.replace(",", ".").trim();
                        const sayi = ham === "" ? null : Number(ham);
                        const fiyatHam = kalem.unitPriceAmount.replace(",", ".").trim();
                        const fiyat = fiyatHam === "" ? null : Number(fiyatHam);
                        /**
                         * ⚠ DİLİM TARİFESİ ÖLÇÜTTÜR — 20.08.2026 düzeltmesi.
                         * Önce "oran %3'ün altındaysa şüpheli" deniyordu ve
                         * DÖRT DOĞRU KAYDI suçluyordu: Trendyol fiyat
                         * indirimi karşılığı komisyon indiriyor. Ölçüt artık
                         * ürünün O FİYATTAKİ dilim oranı.
                         */
                        const uyari = oranUyarisi({
                          girilen:
                            sayi !== null && Number.isFinite(sayi) ? sayi : null,
                          onerilen: kalem.onerilenOran,
                          dilimler: kalem.zemin?.dilimler ?? null,
                          fiyat:
                            fiyat !== null && Number.isFinite(fiyat) ? fiyat : null,
                          tarifeTabani: kalem.tarifeTabani,
                        });
                        if (uyari === null) return null;
                        const supheli = uyari.tur === "SUPHELI_DUSUK";
                        return (
                          <>
                          <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                            {uyari.tur === "KAYNAK_YOK"
                              ? t("oranKaynakYok")
                              : uyari.tur === "SUPHELI_DUSUK"
                                ? t("oranSupheliDusuk", {
                                    oran: uyari.girilen,
                                    taban: uyari.taban,
                                  })
                                : uyari.tur === "DILIMDEN_SAPTI"
                                  ? t("oranDilimdenSapti", {
                                      beklenen: uyari.beklenen,
                                      dilim: uyari.dilimSira,
                                    })
                                  : t("oranSapti", {
                                    onerilen: uyari.onerilen,
                                    fark: uyari.fark,
                                  })}
                          </p>
                          {/* ---------- SORU: YANLIŞ MI YAZDIN? ----------
                              ⚠ KURAL ZAYIFLATILMIYOR. Eşik yerinde duruyor
                              ve uyarı her seferinde çıkıyor. Değişen tek
                              şey: kullanıcı bu SİPARİŞ için "evet, doğru"
                              diyebiliyor ve bu kayda geçiyor.

                              Onaylanmadan kayıt İLERLEMEZ — "sorulsun"
                              demek cevabı beklemek demektir. Ama cevap
                              "evet" olabilir: doğruyu sistem değil
                              kullanıcı biliyor. (K6'nın form içindeki
                              kardeşi.) */}
                          {supheli ? (
                            <label className="mt-1 flex cursor-pointer items-start gap-2 text-xs">
                              <input
                                type="checkbox"
                                className="mt-0.5 size-4 shrink-0"
                                checked={kalem.oranIstisnasi}
                                onChange={(e) =>
                                  kalemGuncelle(sira, {
                                    oranIstisnasi: e.target.checked,
                                  })
                                }
                              />
                              <span>{t("oranIstisnaOnayi")}</span>
                            </label>
                          ) : null}
                          </>
                        );
                      })()}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`komisyon-tutar-${sira}`}>
                        {t("komisyonTutari")}
                      </Label>
                      <Input
                        id={`komisyon-tutar-${sira}`}
                        value={kalem.komisyonTutari}
                        inputMode="decimal"
                        placeholder={ortak("istegeBagli")}
                        onChange={(e) =>
                          kalemGuncelle(sira, {
                            komisyonTutari: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Badge variant="outline">
                        {t("kdvOraniKisa", { oran: kalem.kdvOrani })}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t("komisyonNotu")}
                  </p>

                  {/* ---------------- ZARARINA SATIŞ ----------------
                      Oran uyarısının hemen altında duruyor: ikisi de
                      "bu satış beklediğin gibi mi" sorusunu soruyor ve
                      biri ötekini açıklayabiliyor — yanlış girilmiş bir
                      oran, zarar gibi görünür.

                      Kaydı ENGELLEMEZ: zararına satış bilinçli bir karar
                      olabilir (stok eritme, kampanya). Engelleseydik
                      operasyoncu uyarıyı aşmanın yolunu arardı ve o yol
                      bulunduğu anda uyarı bir daha okunmazdı. */}
                  <KarDurumu
                    fiyatMetni={kalem.unitPriceAmount}
                    adet={kalem.quantity}
                    birimMaliyet={kalem.birimMaliyet}
                    kdvOrani={kalem.kdvOrani}
                    paraBirimi={kalem.unitPriceCurrency}
                    zemin={kalem.zemin}
                    komisyonOraniMetni={kalem.komisyonOrani}
                  />

                  {/* Sessiz varsayım olmasın: kategorisiz ürün %20'ye düşer. */}
                  {kalem.kdvVarsayilan ? (
                    <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                      {t("varsayilanKdvNotu")}
                    </p>
                  ) : null}

                  {/* Erken uyarı; asıl engel sunucuda (#5). */}
                  {stokYetersiz ? (
                    <p className="text-destructive text-sm" role="alert">
                      {t("stokUyarisi", {
                        urun: kalem.etiket,
                        mevcut: kalem.stok ?? 0,
                        istenen: kalem.quantity,
                      })}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}

          {toplamlar.length ? (
            <div className="space-y-2 rounded-lg border p-4">
              <div className="text-sm font-medium">{t("satisToplami")}</div>
              <div className="flex flex-wrap gap-3">
                {toplamlar.map(([paraBirimi, tutar]) => (
                  <div key={paraBirimi} className="rounded-md border px-3 py-2">
                    <div className="text-muted-foreground text-xs">
                      {paraBirimi}
                    </div>
                    <div className="text-lg font-semibold">
                      {bicim.para(tutar, paraBirimi)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">{t("toplamNotu")}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <HataOzeti hatalar={durum.hatalar} />

      {/* Aynı siparişi ikinci kez girmeye çalışıyorsanız, var olan kayda
          götürür. "Zaten kayıtlı" deyip bırakmak, o kaydı elle aratmaktı. */}
      {durum.mevcutSatisId ? (
        <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          {/*
            ⚠ İKİ AYRI DURUM, İKİ AYRI METİN.
            Aktif satışla çakışma bir MÜKERRERLİK uyarısıdır ("aynı satışı
            ikinci kez girme"). İptalli satışla çakışma ise bir YÖNLENDİRME:
            numara serbest bırakılamaz (`Sale.code` @unique) ama yapılacak
            şey bellidir — o satışın iptalini geri al. Tek metin kullanılsaydı
            operatör yine çıkmazda kalırdı; 20.08.2026'da tam bu oldu ve
            numaranın sonuna bir `0` eklendi.
          */}
          <p className={`mb-2 text-sm ${DURUM_YAZISI.uyari}`}>
            {durum.mevcutSatisIptalli
              ? t("cakisanSatisIptalliMetni")
              : t("cakisanSatisMetni")}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/satislar/${durum.mevcutSatisId}`}>
              <ExternalLink />
              {durum.mevcutSatisIptalli
                ? t("cakisanSatisIptaliGeriAl")
                : t("cakisanSatisaGit")}
            </Link>
          </Button>
        </div>
      ) : null}

      {/*
        ═══ SAYIM KORUMASI — ISRAR BLOĞU ═════════════════════════════════════
        ⭐ ANAYASA: "uyarı SORAR, kullanıcı ISRAR ederse istisna kaydedilir."

        ⚠ BLOK SUNUCU DURAKSATINCA AÇILIR, ÖNCEDEN DEĞİL — ve bu bilinçli:
        satışın tarihi ile kalemleri birlikte değerlendiriliyor ve hangi
        varyantın sayıldığı ancak sunucuda bilinir. Formu önden yüklemek,
        her satışta gereksiz bir sorgu demek olurdu.

        ⚠ Stok düzeltme ekranında blok ÖNDEN çiziliyor — orada tek varyant
        var ve sayfa zaten onu okuyor. Aynı kural, iki farklı maliyet.
      */}
      {/*
        ═══ DÖNEM KAPISI ISRARI (K108) — SAYIM BLOĞUNUN ÜSTÜNDE ═══
        ⚠ İKİSİ AYNI ANDA ÇIKABİLİR: bir satış hem kapanmış bir döneme hem
        sayımdan öncesine düşebilir. Tek blok gösterilseydi kullanıcı birini
        geçer, öteki sessizce beklerdi ve "niye hâlâ kaydetmiyor" derdi.
      */}
      {durum.donemDuraksatti && durum.donem ? (
        <DonemIsrarBloku
          donem={durum.donem}
          satisSayisi={durum.donemSatisSayisi ?? 0}
          onGecerlilik={setDonemIsrarGecerli}
        />
      ) : null}
      {durum.sayimDuraksatti ? (
        <div
          className={`space-y-3 rounded-md border border-dashed p-3 text-xs ${DURUM_KUTUSU.uyari}`}
        >
          <p className="font-medium">{t("sayimIsrariBaslik")}</p>
          <div className="space-y-1">
            <Label htmlFor="satis-israr-sebep">
              {t("sayimIsrariSebepEtiketi")}
            </Label>
            <select
              id="satis-israr-sebep"
              value={israrSebep}
              onChange={(e) => setIsrarSebep(e.target.value)}
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-xs md:h-10"
            >
              <option value="">—</option>
              {SAYIM_ISRAR_SEBEPLERI.map((s) => (
                <option key={s} value={s}>
                  {t(`sayimSebep_${s}`)}
                </option>
              ))}
            </select>
          </div>
          {/* ⚠ `DIGER` kapalı listenin kaçak deliği — açıklama ZORUNLU. */}
          {israrSebep === "DIGER" ? (
            <div className="space-y-1">
              <Label htmlFor="satis-israr-aciklama">
                {t("sayimIsrariAciklamaEtiketi")}
              </Label>
              <Input
                id="satis-israr-aciklama"
                value={israrAciklama}
                onChange={(e) => setIsrarAciklama(e.target.value)}
                className="h-11 md:h-10"
              />
            </div>
          ) : null}
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0"
              checked={israrOnay}
              onChange={(e) => setIsrarOnay(e.target.checked)}
            />
            <span>{t("sayimIsrariOnayMetni")}</span>
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {/* ⚠ SESSİZ KİLİTLİ DÜĞME YASAK (İlke #5): kaydedilemiyorsa
            NEDEN kaydedilemediği ekranda yazar. */}
        {onayBekleyen ? (
          <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("oranOnayBekliyor")}</p>
        ) : null}
        <Button
          type="submit"
          disabled={
            bekliyor ||
            kalemler.length === 0 ||
            onayBekleyen ||
            /** ⚠ DÖNEM KAPISI AYRI KİLİTLER — sunucu zaten reddediyor ama
             *  kilidin sebebi ekranda yazılı (İlke #5). */
            (durum.donemDuraksatti === true && !donemIsrarGecerli)
          }
        >
          {bekliyor ? ortak("kaydediliyor") : t("satisiKaydet")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/satislar">{ortak("vazgec")}</Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t("formNotu")}</p>
    </form>
  );
}
