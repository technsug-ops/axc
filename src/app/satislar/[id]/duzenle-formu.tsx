"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Pencil, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DUZENLEME_NEDENLERI,
  kaydedilebilirMi,
  type DuzenlemeNedeni,
} from "@/lib/satis-duzenleme";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { useBicim } from "@/lib/bicim-istemci";

import {
  duzenlemeyiOnizle,
  duzenlemeyiUygula,
  type OnizlemeSonucu,
  kargoTarifesiniOku,
} from "./duzenle-actions";

/**
 * ============================================================================
 *  SATIŞ DÜZENLEME FORMU — ÖNİZLEME ÖNCE
 * ----------------------------------------------------------------------------
 *  Kullanıcı talebi: "Bir daha yanlış yaptığımda script çalışmamalı, daha
 *  kolay halletmeliyim." Ölçü: bir fiyat hatası 30 saniyede, yardımsız.
 *
 *  ── ONAY DÜĞMESİ ÖNİZLEME ÇİZİLMEDEN AKTİF OLMAZ ────────────────────────
 *  Mimar şartı. Kullanıcı neyin değişeceğini görmeden yazamaz. İmza da
 *  önizlemeden gelir; imzasız yazma sunucuda zaten reddedilir.
 *
 *  ── ADET BU DİLİMDE KAPALI ──────────────────────────────────────────────
 *  Fiyat ve kargo stok defterine dokunmaz; adet dokunur (FIFO'dan ek çıkış
 *  ya da ayna giriş gerekir). Alan GÖRÜNÜR ama kapalı ve NEDEN kapalı olduğu
 *  yazılı — sessiz eksik bırakılmıyor.
 * ============================================================================
 */

export type DuzenlenebilirKalem = {
  id: string;
  urunAdi: string;
  adet: number;
  fiyat: number;
};

export function DuzenleFormu({
  saleId,
  kalemler,
  kargoDesi,
  kargoTutar,
  kargoFirmaId,
  paraBirimi,
}: {
  saleId: string;
  kalemler: DuzenlenebilirKalem[];
  kargoDesi: number | null;
  kargoTutar: number | null;
  kargoFirmaId: string | null;
  paraBirimi: string;
}) {
  const t = useTranslations("SatisDuzenleme");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const router = useRouter();
  const [bekliyor, basla] = useTransition();

  const [acik, setAcik] = useState(false);
  const [fiyatlar, setFiyatlar] = useState<Record<string, string>>(() =>
    Object.fromEntries(kalemler.map((k) => [k.id, String(k.fiyat)])),
  );
  const [adetler, setAdetler] = useState<Record<string, string>>(() =>
    Object.fromEntries(kalemler.map((k) => [k.id, String(k.adet)])),
  );
  const [desi, setDesi] = useState(kargoDesi === null ? "" : String(kargoDesi));
  const [tutar, setTutar] = useState(kargoTutar === null ? "" : String(kargoTutar));
  /**
   * ── KARGO TUTARI NEREDEN GELDİ ──────────────────────────────────────
   * Kullanıcı 22.08.2026: _"kargoda bizim yazdığımızdan farklı desi çıktı,
   * 3'ü 5 yapıyorum... fakat kargo ücreti değişmiyor."_
   *
   * Kök sebep motorda değil EKRANDAYDI: motorun kuralı "elle girilen tutar
   * tarifeyi EZER" ve bu kural DOĞRU (kargodan farklı tutar ödenmiş
   * olabilir). Ama form tutar alanını her zaman dolu gönderiyordu, yani
   * tarife dalı HİÇ çalışmıyordu.
   *
   * Çözüm: desi değişince tutar TARİFEDEN tazelenir; kullanıcı tutara
   * dokunursa "elle" olur ve tarife bir daha ezmez. Fiyat denemesindeki
   * "elle > zemin" sırasının aynısı (İlke #10: aynı iş her ekranda aynı).
   */
  const [tutarKaynagi, setTutarKaynagi] = useState<"ELLE" | "TARIFE">("ELLE");
  const [tarifeNotu, setTarifeNotu] = useState<string | null>(null);
  const [tarifeOkunuyor, tarifeBasla] = useTransition();
  const [neden, setNeden] = useState<DuzenlemeNedeni | "">("");
  const [aciklama, setAciklama] = useState("");
  const [onizleme, setOnizleme] = useState<OnizlemeSonucu | null>(null);
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  /** Alan değişince önizleme GEÇERSİZ olur — eski plana onay verilemesin. */
  function degisti<T>(ayarla: (d: T) => void) {
    return (deger: T) => {
      setOnizleme(null);
      setHata(null);
      ayarla(deger);
    };
  }

  /**
   * KAYIT İZNİ — neden/açıklama şartı. Sunucudaki `kaydedilebilirMi` ile
   * AYNI fonksiyon: iki yerde iki kural olsaydı ekran "olur" der, sunucu
   * reddederdi.
   *
   * Bu şart ÖNİZLEMEYİ değil YALNIZ KAYDI kapatır (17.08.2026 düzeltmesi).
   */
  const izin = kaydedilebilirMi(
    neden === "" ? null : neden,
    aciklama.trim() === "" ? null : aciklama,
  );

  /**
   * ⚠ ODAK ÇIKINCA OKUNUR, HER TUŞTA DEĞİL. Her tuşta sunucuya gitmek
   * "3" yazarken "3" için, sonra "35" için iki ayrı sorgu demekti ve
   * kullanıcı yazarken tutar zıplardı.
   */
  const desiBirakildi = () => {
    const sayi = Number(desi);
    if (desi.trim() === "" || !Number.isFinite(sayi) || sayi <= 0) {
      setTarifeNotu(null);
      return;
    }
    tarifeBasla(async () => {
      const sonuc = await kargoTarifesiniOku(saleId, sayi);
      if (sonuc.tur === "TARIFE") {
        setOnizleme(null);
        setTutar(String(sonuc.kdvDahil));
        setTutarKaynagi("TARIFE");
        setTarifeNotu(t("tarifeden", { desi: sonuc.desi }));
        return;
      }
      /**
       * ⚠ SESSİZ KALINMAZ (İlke #5). Tarife bulunamadıysa tutar OLDUĞU GİBİ
       * bırakılır — eski değeri silmek, kullanıcının elindeki tek rakamı da
       * götürürdü — ama NEDEN yenilenmediği ekranda yazar.
       */
      setTarifeNotu(
        sonuc.tur === "TARIFE_YOK"
          ? t("tarifeYok", { desi: sonuc.desi })
          : sonuc.tur === "FIRMA_YOK"
            ? t("kargoFirmasiYok")
            : t("satisYok"),
      );
    });
  };

  const yeniDegerler = () => ({
    fiyatlar: Object.fromEntries(
      Object.entries(fiyatlar).map(([id, v]) => [id, Number(v)]),
    ),
    adetler: Object.fromEntries(
      Object.entries(adetler).map(([id, v]) => [id, Number(v)]),
    ),
    kargoFirmaId,
    kargoDesi: desi.trim() === "" ? null : Number(desi),
    kargoTutar: tutar.trim() === "" ? null : Number(tutar),
  });

  if (!acik) {
    return (
      <Button variant="outline" className="h-11" onClick={() => setAcik(true)}>
        <Pencil />
        {t("duzenle")}
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t("baslik")}</h3>
        <Button variant="ghost" size="sm" onClick={() => setAcik(false)}>
          <X />
          {ortak("kapat")}
        </Button>
      </div>

      {/* KİMLİK DEĞİŞMEZ — neden değişmediği yazılı. */}
      <p className="text-muted-foreground text-xs">{t("kimlikNotu")}</p>

      {/* ------------------------- KALEMLER ------------------------- */}
      {kalemler.map((k) => (
        <div key={k.id} className="grid gap-2 sm:grid-cols-3">
          <div className="text-sm sm:col-span-3">{k.urunAdi}</div>
          <label className="text-sm">
            <span className="text-muted-foreground block text-xs">
              {t("birimFiyat")}
            </span>
            <Input
              inputMode="decimal"
              value={fiyatlar[k.id] ?? ""}
              onChange={(e) =>
                degisti<Record<string, string>>(setFiyatlar)({
                  ...fiyatlar,
                  [k.id]: e.target.value,
                })
              }
              className="h-11"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground block text-xs">
              {ortak("adet")}
            </span>
            {/* ADET AÇILDI (son dilim 17.08.2026): artarsa FIFO'dan ek çıkış,
                azalırsa ayna giriş yazılır. Stok yetmezse önizleme söyler. */}
            <Input
              inputMode="numeric"
              value={adetler[k.id] ?? ""}
              onChange={(e) =>
                degisti<Record<string, string>>(setAdetler)({
                  ...adetler,
                  [k.id]: e.target.value,
                })
              }
              className="h-11"
            />
            <span className="text-muted-foreground text-xs">{t("adetNotu")}</span>
          </label>
        </div>
      ))}

      {/* -------------------------- KARGO --------------------------- */}
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-muted-foreground block text-xs">{t("desi")}</span>
          <Input
            inputMode="decimal"
            value={desi}
            placeholder={t("desiIpucu")}
            onChange={(e) => degisti(setDesi)(e.target.value)}
            onBlur={desiBirakildi}
            className="h-11"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground block text-xs">
            {t("kargoTutari")}
          </span>
          <Input
            inputMode="decimal"
            value={tutar}
            placeholder={t("kargoIpucu")}
            onChange={(e) => {
              /** Tutara dokunmak onu ELLE yapar; tarife bir daha ezmez. */
              setTutarKaynagi("ELLE");
              setTarifeNotu(null);
              degisti(setTutar)(e.target.value);
            }}
            className="h-11"
          />
          {/* ⚠ RAKAMIN KAYNAĞI YAZAR. "Tarifeden" ile "senin girdiğin"
              karışırsa kullanıcı hangi tutarla hesaplandığını bilemez —
              fiyat denemesindeki kuralın aynısı. */}
          {tarifeOkunuyor ? (
            <span className="text-muted-foreground block text-xs">
              {t("tarifeOkunuyor")}
            </span>
          ) : tarifeNotu !== null ? (
            <span className="text-muted-foreground block text-xs">
              {tarifeNotu}
            </span>
          ) : tutarKaynagi === "ELLE" && tutar.trim() !== "" ? (
            <span className="text-muted-foreground block text-xs">
              {t("tutarElle")}
            </span>
          ) : null}
        </label>
      </div>

      {/* ------------------------- NEDEN ---------------------------
          KAPALI LİSTE: serbest metin altı ay sonra aynı şeyin beş yazımıyla
          dolar ve o alandan hiçbir soru cevaplanamaz (kullanıcı isteği). */}
      <div className="space-y-2">
        <span className="text-muted-foreground block text-xs">{t("neden")}</span>
        <Select
          value={neden}
          onValueChange={(d) => {
            /**
             * ÖNİZLEME BOZULMAZ — neden plana girmiyor. Eskiden burada
             * setOnizleme(null) vardı: kullanıcı önizler, neden seçer,
             * önizleme silinir, yeniden önizlemek zorunda kalırdı.
             */
            setHata(null);
            setNeden(d as DuzenlemeNedeni);
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder={t("nedenSecin")} />
          </SelectTrigger>
          <SelectContent>
            {DUZENLEME_NEDENLERI.map((n) => (
              <SelectItem key={n} value={n}>
                {t(`neden_${n}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* DIGER seçilince açıklama ZORUNLU — kural saf katmanda da aynı. */}
        {neden === "DIGER" ? (
          <label className="block text-sm">
            <span className="text-muted-foreground block text-xs">
              {t("aciklamaZorunlu")}
            </span>
            <Input
              value={aciklama}
              placeholder={t("aciklamaIpucu")}
              onChange={(e) => setAciklama(e.target.value)}
              className="h-11"
            />
          </label>
        ) : (
          <label className="block text-sm">
            <span className="text-muted-foreground block text-xs">
              {t("aciklamaIstege")}
            </span>
            <Input
              value={aciklama}
              placeholder={t("aciklamaIpucu")}
              onChange={(e) => setAciklama(e.target.value)}
              className="h-11"
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="h-11"
          disabled={bekliyor}
          onClick={() =>
            basla(async () => {
              setHata(null);
              setSonuc(null);
              const c = await duzenlemeyiOnizle(
                saleId,
                yeniDegerler(),
                neden === "" ? null : neden,
                aciklama.trim() === "" ? null : aciklama,
              );
              setOnizleme(c);
              if (!c.tamam) setHata(c.hata);
            })
          }
        >
          {bekliyor ? t("hesaplaniyor") : t("onizle")}
        </Button>

        {/* ONAY: yalnız GEÇERLİ önizleme varken aktif. */}
        <Button
          className="h-11"
          disabled={
            bekliyor || onizleme === null || onizleme.tamam !== true || !izin.olur
          }
          onClick={() =>
            basla(async () => {
              if (onizleme === null || !onizleme.tamam || neden === "") return;
              const c = await duzenlemeyiUygula(
                saleId,
                yeniDegerler(),
                neden,
                aciklama.trim() === "" ? null : aciklama,
                onizleme.imza,
              );
              if (c.tamam) {
                setSonuc(
                  t("kaydedildi", {
                    eski: c.eskiNet2 === null ? "?" : bicim.para(c.eskiNet2, paraBirimi),
                    yeni: c.yeniNet2 === null ? "?" : bicim.para(c.yeniNet2, paraBirimi),
                  }),
                );
                setOnizleme(null);
                setAcik(false);
                router.refresh();
              } else {
                setHata(c.hata);
                // Durum değiştiyse önizleme geçersizdir; yeniden alınmalı.
                setOnizleme(null);
              }
            })
          }
        >
          <Check />
          {t("onayla")}
        </Button>
      </div>

      {/* ------------------- KAPALI BUTON KONUŞUR -------------------
          Kural #5 — sessiz başarısızlık yasak. Onay kapalıysa NEDEN
          kapalı olduğu ekranda yazar; kullanıcı butona basıp hiçbir şey
          olmamasını izlemez. 17.08.2026: kullanıcı adedi 1→2 yaptı ve
          neden alanının kaydın şartı olduğunu ekrandan anlayamadı. */}
      {onizleme?.tamam === true && !izin.olur ? (
        <p className="text-muted-foreground text-xs">
          {izin.engel === "NEDEN_YOK" ? t("onayIcinNeden") : t("onayIcinAciklama")}
        </p>
      ) : null}

      {/* ------------------------ ÖNİZLEME -------------------------- */}
      {onizleme?.tamam === true ? (
        <div className="bg-muted/40 space-y-2 rounded-md border p-3 text-sm">
          <div className="font-medium">{t("onizlemeBaslik")}</div>
          {onizleme.farklar.map((f, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {f.urunAdi ? `${f.urunAdi} · ` : ""}
                {t(`alan_${f.alan}`)}
              </span>
              <span className="tabular-nums line-through opacity-60">
                {f.eski ?? "—"}
              </span>
              <ArrowRight className="size-3.5" />
              <span className="font-semibold tabular-nums">{f.yeni ?? "—"}</span>
            </div>
          ))}
          <div className="border-t pt-2">
            {t("ciroEtkisi", {
              eski: bicim.para(onizleme.eskiCiro, onizleme.paraBirimi),
              yeni: bicim.para(onizleme.yeniCiro, onizleme.paraBirimi),
              fark: bicim.para(onizleme.ciroFarki, onizleme.paraBirimi),
            })}
          </div>
          {/* NET burada TAHMİN EDİLMEZ — motor onaydan sonra hesaplar. */}
          <div className="text-muted-foreground text-xs">{t("netNotu")}</div>
        </div>
      ) : null}

      {hata ? (
        <p className={`flex items-center gap-2 rounded-md p-2 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}>
          <TriangleAlert className="size-4 shrink-0" />
          {hata}
        </p>
      ) : null}

      {sonuc ? (
        <p className={`rounded-md p-2 text-sm ${DURUM_KUTUSU.olumlu} ${DURUM_YAZISI.olumlu}`}>
          {sonuc}
        </p>
      ) : null}
    </div>
  );
}
