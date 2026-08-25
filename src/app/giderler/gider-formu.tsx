"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Banknote,
  CreditCard,
  Landmark,
  Plus,
  Save,
  TriangleAlert,
} from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
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
import { formGonderimi } from "@/lib/form-gonderimi";

import { giderEkle, giderGuncelle, type GiderDurumu } from "./actions";
import { DURUM_KUTUSU } from "@/lib/renkler";

/**
 * ============================================================================
 *  GİDER FORMU — hem yeni kayıt hem düzenleme
 * ----------------------------------------------------------------------------
 *  KDV ORANI KATEGORİDEN GELİR: kategori seçilince oran otomatik dolar.
 *  Maaş seçilince 0, kira seçilince 20. Kullanıcı yine de değiştirebilir —
 *  öneridir, kilit değil.
 *
 *  YER TUTUCULAR "örn. X" BİÇİMİNDE (İlke #11): gri "20" yazsaydı girilmiş
 *  bir değer sanılırdı; bu tuzağa 09.08.2026'da iki kez düşüldü.
 * ============================================================================
 */

export type KategoriSecenegi = {
  id: string;
  ad: string;
  kdvOrani: string;
  /** Sözlükteki uyarı anahtarı (ör. Vergi kategorisi). Yoksa null. */
  uyariAnahtari: string | null;
};

export type GiderBaslangici = {
  id: string;
  spentAt: string;
  categoryId: string;
  amount: string;
  currency: string;
  vatRate: string;
  description: string;
  creditCardId: string;
  installmentCount: string;
  /** "" = belirtilmedi (alan açılmadan önce girilmiş kayıt). */
  odemeYontemi: string;
};

export type KartSecenegi = { id: string; ad: string };

export function GiderFormu({
  kategoriler,
  kartlar,
  bugun,
  baslangic,
}: {
  kategoriler: KategoriSecenegi[];
  /** Aktif kartlar — boşsa kart alanı hiç çizilmez. */
  kartlar: KartSecenegi[];
  /** Yeni kayıtta varsayılan tarih — İŞ saat diliminde bugün. */
  bugun: string;
  /** Doluysa düzenleme kipi. */
  baslangic?: GiderBaslangici;
}) {
  const t = useTranslations("Gider");
  const tUyari = useTranslations("Gider.uyarilar");
  const ortak = useTranslations("Ortak");

  const duzenleme = Boolean(baslangic);

  const [durum, formAction, bekliyor] = useActionState<GiderDurumu, FormData>(
    duzenleme ? giderGuncelle : giderEkle,
    {},
  );

  const BOS = {
    spentAt: bugun,
    categoryId: "",
    amount: "",
    vatRate: "",
    description: "",
    /** ⚠ Varsayılan BOŞ: her gider kartla ödenmiyor. */
    creditCardId: "",
    /** ⚠ Varsayılan 1 = tek çekim. */
    installmentCount: "1",
    /**
     * ⚠ VARSAYILAN BOŞ — VE ZORUNLU DEĞİL. Bir seçenek önceden işaretli
     * gelseydi (ör. "Nakit"), kullanıcı seçmediği hâlde seçilmiş sayılır ve
     * sistem bilmediği bir şeyi veri diye saklardı. Boş kalırsa ekran
     * "belirtilmedi" der — dürüst olan bu.
     */
    odemeYontemi: "",
  };

  const [alanlar, setAlanlar] = useState(
    baslangic
      ? {
          spentAt: baslangic.spentAt,
          categoryId: baslangic.categoryId,
          amount: baslangic.amount,
          vatRate: baslangic.vatRate,
          description: baslangic.description,
          creditCardId: baslangic.creditCardId,
          installmentCount: baslangic.installmentCount,
          odemeYontemi: baslangic.odemeYontemi,
        }
      : BOS,
  );
  const [paraBirimi, setParaBirimi] = useState(baslangic?.currency ?? "TRY");

  // Başarılı kayıttan sonra alanları temizle — bir ayın giderleri arka arkaya
  // girilir (İlke #9). Düzenlemede temizlenmez, kayıt yerinde kalır.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari && !duzenleme) {
      setAlanlar(BOS);
      setParaBirimi("TRY");
    }
  }

  const secili = kategoriler.find((k) => k.id === alanlar.categoryId);
  const uyari =
    secili?.uyariAnahtari && tUyari.has(secili.uyariAnahtari)
      ? tUyari(secili.uyariAnahtari)
      : null;

  /**
   * ÖDEME YÖNTEMİ SEÇİMİ.
   *
   * ⚠ KART SEÇİLİ DEĞİLKEN KART BİLGİSİ TEMİZLENMEZ — bilerek. Nakit'e
   * basmak kartı silseydi, kullanıcının kart borcu hiçbir uyarı olmadan
   * azalırdı. Çelişki EKRANDA söylenir, çözümü kullanıcı verir.
   */
  function yontemSec(deger: string) {
    setAlanlar((o) => ({ ...o, odemeYontemi: deger }));
  }

  /**
   * KART SEÇİLİNCE YÖNTEM DE KART OLUR.
   *
   * ⚠ BU UYDURMA DEĞİL: bir kart seçmek, kartla ödendiğini SÖYLEMEKTİR.
   * Kullanıcıyı aynı şeyi iki kez söylemeye zorlamak (İlke #9'a aykırı) ve
   * unutulduğunda kaydı çelişkili bırakmak olurdu.
   */
  function kartSec(id: string) {
    setAlanlar((o) => ({
      ...o,
      creditCardId: id,
      odemeYontemi: id ? "KART" : o.odemeYontemi,
    }));
  }

  /** Nakit/havale seçili ama kart da duruyor — sunucu da reddeder. */
  const celiski =
    (alanlar.odemeYontemi === "NAKIT" || alanlar.odemeYontemi === "HAVALE") &&
    alanlar.creditCardId !== "";

  /** Kategori değişince KDV oranı önerisi tazelenir. */
  function kategoriSec(id: string) {
    const kategori = kategoriler.find((k) => k.id === id);
    setAlanlar((o) => ({
      ...o,
      categoryId: id,
      vatRate: kategori ? kategori.kdvOrani : o.vatRate,
    }));
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-5">
      {baslangic ? (
        <input type="hidden" name="id" value={baslangic.id} />
      ) : null}
      <input type="hidden" name="currency" value={paraBirimi} />
      <input type="hidden" name="categoryId" value={alanlar.categoryId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gider-tarih">{t("tarihEtiketi")} *</Label>
          <Input
            id="gider-tarih"
            name="spentAt"
            type="date"
            value={alanlar.spentAt}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, spentAt: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gider-kategori">{t("kategoriEtiketi")} *</Label>
          <Select value={alanlar.categoryId} onValueChange={kategoriSec}>
            <SelectTrigger id="gider-kategori" className="w-full">
              <SelectValue placeholder={t("kategoriSecin")} />
            </SelectTrigger>
            <SelectContent>
              {kategoriler.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.ad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kategoriye özel uyarı — çift sayımı önler (İlke #5). */}
      {uyari ? (
        <p className={`flex gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{uyari}</span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="gider-tutar">{t("tutarEtiketi")} *</Label>
          <Input
            id="gider-tutar"
            name="amount"
            inputMode="decimal"
            value={alanlar.amount}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, amount: e.target.value }))
            }
            placeholder={t("tutarIpucu")}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gider-para">{ortak("paraBirimi")}</Label>
          <Select value={paraBirimi} onValueChange={setParaBirimi}>
            <SelectTrigger id="gider-para" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">TRY</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gider-kdv">{t("kdvOraniEtiketi")} *</Label>
          <Input
            id="gider-kdv"
            name="vatRate"
            inputMode="decimal"
            value={alanlar.vatRate}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, vatRate: e.target.value }))
            }
            placeholder={t("kdvOraniIpucu")}
            autoComplete="off"
          />
        </div>
      </div>

      <p className="text-muted-foreground text-xs">{t("kdvOraniNotu")}</p>

      {/*
        ═══ ÖDEME YÖNTEMİ — ÜÇ ANA SEÇENEK (25.08.2026) ═══════════════════
        Kullanıcı: _"havale ile ödeme veya cash ödeme ana kategorileri
        olmalı, kartla ödeme tıklanırsa altta kartlar açılsın."_

        ⚠ SEÇİM SAKLANIR (`Expense.odemeYontemi`). Saklanmasaydı düzenlemeye
        girildiğinde "Havale" seçilmiş bir gider ekranda başka türlü
        görünürdü: sistem bilmediği için "kart yok" hâlini gösterir,
        kullanıcı seçtiğini sanır. Ekranın YANLIŞ bir şey göstermesi, bir
        sütundan pahalıdır.

        ⚠ HİÇBİRİ ÖNCEDEN İŞARETLİ DEĞİL — bu bir YER TUTUCU DEĞİL, gerçek
        bir boşluk (İlke #11'in kardeşi). Seçilmezse kayıt "belirtilmedi"
        olarak yaşar; sistem uydurmaz.
      */}
      <div className="space-y-2">
        <fieldset className="space-y-2">
          <legend className="text-sm leading-none font-medium">
            {t("odemeYontemiEtiketi")}{" "}
            <span className="text-muted-foreground text-xs font-normal">
              ({ortak("istegeBagli")})
            </span>
          </legend>
          {/*
            ⚠ GERÇEK RADIO — görünüşte düğme. `<button>` yığınıyla yapılsaydı
            klavye okları ve ekran okuyucu grubu kaybolurdu; `sr-only` radio,
            erişilebilirliği bozmadan düğme görüntüsü verir.
            ⚠ Dokunma alanı `min-h-11` (44px) — İlke #8.
          */}
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                { deger: "NAKIT", ikon: Banknote, etiket: t("odemeNakit") },
                { deger: "HAVALE", ikon: Landmark, etiket: t("odemeHavale") },
                { deger: "KART", ikon: CreditCard, etiket: t("odemeKart") },
              ] as const
            ).map((secenek) => {
              const Ikon = secenek.ikon;
              const isaretli = alanlar.odemeYontemi === secenek.deger;
              return (
                <label
                  key={secenek.deger}
                  className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm transition-colors ${
                    isaretli
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-input hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="odemeYontemi"
                    value={secenek.deger}
                    checked={isaretli}
                    onChange={() => yontemSec(secenek.deger)}
                    className="sr-only"
                  />
                  <Ikon className="size-4 shrink-0" />
                  <span>{secenek.etiket}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/*
          ⚠ "BELİRTİLMEDİ"YE DÖNÜŞ YOLU AÇIK KALIR — ama YALNIZ bir seçim
          varken. Boşken gösterilseydi, hiçbir şeyi geri almayan bir düğme
          olurdu (tıklanınca iş yapmayan düğme = sessiz başarısızlık, #5).
        */}
        {alanlar.odemeYontemi ? (
          <button
            type="button"
            onClick={() => yontemSec("")}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          >
            {t("odemeYontemiTemizle")}
          </button>
        ) : null}

        {/*
          ⚠ ESKİ KAYIT AÇIKLAMASI. Alan 25.08.2026'da açıldı; ondan önceki
          giderlerde yöntem BİLİNMİYOR ve geri doldurulmadı. Boşluğun bir
          eksiklik değil bir BİLGİ YOKLUĞU olduğu ekranda yazar — yoksa
          kullanıcı "sistem seçimimi kaybetti" sanır.
        */}
        {duzenleme && alanlar.odemeYontemi === "" ? (
          <p className="text-muted-foreground text-xs">
            {t("odemeYontemiBelirtilmediNotu")}
          </p>
        ) : null}
      </div>

      {/*
        KART LİSTESİ — KART SEÇİLİNCE AÇILIR.

        ⚠ KART ZATEN SEÇİLİYSE DE AÇILIR (`|| alanlar.creditCardId`).
        Yöntemi "belirtilmedi" olan ESKİ bir gider kartlı olabilir; blok
        gizlenseydi kullanıcı kartını göremez, kaydı açıp kapatmak kartı
        sessizce kaybettirebilirdi.

        ⚠ HİÇ AKTİF KART YOKSA blok çizilmez ve NEDENİ yazar — boş bir
        seçici, olmayan bir imkânı varmış gibi gösterirdi.
      */}
      {alanlar.odemeYontemi === "KART" || alanlar.creditCardId ? (
        kartlar.length === 0 ? (
          <p
            className={`flex gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{t("kartHicYok")}</span>
          </p>
        ) : (
          <div className="border-l-primary/40 grid gap-4 border-l-2 pl-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gider-kart">{t("kartEtiketi")}</Label>
              <select
                id="gider-kart"
                name="creditCardId"
                value={alanlar.creditCardId}
                onChange={(e) => kartSec(e.target.value)}
                className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm md:h-9"
              >
                <option value="">{t("kartSecin")}</option>
                {kartlar.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">{t("kartNotu")}</p>
            </div>

            {/*
              ⚠ TAKSİT YALNIZ KART SEÇİLİNCE GÖRÜNÜR. Kartsız bir giderde
              "taksit" sorusu anlamsızdır ve boş bir alan doldurulacak bir
              şey varmış gibi durur.
            */}
            {alanlar.creditCardId ? (
              <div className="space-y-2">
                <Label htmlFor="gider-taksit">{t("taksitEtiketi")}</Label>
                <Input
                  id="gider-taksit"
                  name="installmentCount"
                  inputMode="numeric"
                  value={alanlar.installmentCount}
                  onChange={(e) =>
                    setAlanlar((o) => ({
                      ...o,
                      installmentCount: e.target.value,
                    }))
                  }
                  placeholder={t("taksitIpucu")}
                  autoComplete="off"
                />
                <p className="text-muted-foreground text-xs">
                  {t("taksitNotu")}
                </p>
              </div>
            ) : null}
          </div>
        )
      ) : null}

      {/*
        ⚠ ÇELİŞKİ GÖNDERMEDEN ÖNCE SÖYLENİR. Sunucu da reddediyor (zod), ama
        kullanıcıyı formu gönderip hata almaya zorlamak gereksiz bir tur.
        ⚠ VE KART SESSİZCE SİLİNMEZ: nakit/havale tıklanınca kartı kendi
        kendimize kaldırsaydık kart borcu hiçbir uyarı olmadan azalırdı.
        Kararı kullanıcı verir — tek tıkla (İlke #5).
      */}
      {celiski ? (
        <div
          className={`space-y-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}
        >
          <p className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{t("odemeKartCelisik")}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAlanlar((o) => ({ ...o, creditCardId: "" }))}
          >
            {t("kartiKaldir")}
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="gider-aciklama">
          {ortak("aciklama")}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            ({ortak("istegeBagli")})
          </span>
        </Label>
        <Input
          id="gider-aciklama"
          name="description"
          value={alanlar.description}
          onChange={(e) =>
            setAlanlar((o) => ({ ...o, description: e.target.value }))
          }
          placeholder={t("aciklamaIpucu")}
          autoComplete="off"
        />
      </div>

      <HataOzeti hatalar={durum.hatalar} />

      {durum.basari ? (
        <p
          className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.olumlu}`}
          role="status"
        >
          {durum.basari}
        </p>
      ) : null}

      <Button type="submit" disabled={bekliyor}>
        {duzenleme ? <Save /> : <Plus />}
        {bekliyor
          ? ortak("kaydediliyor")
          : duzenleme
            ? ortak("degisiklikleriKaydet")
            : t("kaydet")}
      </Button>
    </form>
  );
}
