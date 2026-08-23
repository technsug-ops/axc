"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { AranabilirSecim } from "@/components/aranabilir-secim";
import { BILDIRIM_TAVANI } from "@/lib/iade/bildirim";
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

import { bildirimOlustur, type BildirimDurumu } from "./bildirim-actions";

import type { ReturnReason } from "@/generated/prisma/enums";
import { DURUM_KUTUSU } from "@/lib/renkler";

export type SatisSecenegi = {
  id: string;
  etiket: string;
  /**
   * O SATIŞTA ZATEN KAÇ BİLDİRİM VAR. Seçim listesinde görünür: kullanıcı
   * aynı iadeyi tekrar tekrar seçebiliyordu ve hiçbir yerde "bunu zaten
   * girdin" yazmıyordu (kullanıcı bildirimi 23.08.2026).
   */
  bildirimSayisi: number;
};
export type VaryantSecenegi = {
  id: string;
  etiket: string;
  /** Stok adedi metni — "stokta 4 adet". Aranabilir seçimde alt satır. */
  stokMetni?: string;
};

/**
 * ============================================================================
 *  BİLDİRİM KAYIT FORMU — AŞAMA A
 * ----------------------------------------------------------------------------
 *  Pazaryeri "müşteri iade istiyor" dedi, mal yolda. Bu form o beyanı kaydeder;
 *  STOK VE KÂR HESABINA DOKUNMAZ.
 *
 *  AYRILAN ÜRÜN yalnız DEĞİŞİM gerekçelerinde sorulur (DEGISIM,
 *  DEGISIM_KUSURLU, YANLIS_URUN). Diğer gerekçelerde hüküm mal gelince
 *  verilir; peşin ayırma sormak, kullanıcıya cevabını bilmediği bir soru
 *  sormaktır.
 *
 *  İKİ ÜRÜN ALANI, İKİ AYRI KURAL (14.08.2026'da kullanıcı hatayı buldu):
 *
 *    AYRILAN ürün  = MÜŞTERİYE GİDECEK yedek. STOKTA OLMAK ZORUNDA —
 *      liste yalnız stoğu olan varyantları gösterir ve adedi yazar.
 *      Eskiden bütün ürünler listeleniyordu; kullanıcı stoğu 0 olan bir
 *      ürünü seçti ve "ayrıldı" rozeti çıktı. Gönderilemeyecek bir malı
 *      ayırmak, olmayan bir hazırlığı yapılmış göstermekti.
 *
 *    DÖNEN ürün    = YANLIŞLIKLA GİTMİŞ, geri gelen mal. STOK ŞARTI YOK:
 *      zaten stoktan çıkmış olduğu için 0 görünmesi NORMALDİR. Bu alan
 *      6. senaryonun defter düzeltmesinin hedefidir.
 *
 *  Bu ayrım bindirilirse ya gönderilemeyecek mal ayrılır ya da dönen mal
 *  hiç seçilemez.
 * ============================================================================
 */
export function BildirimFormu({
  satislar,
  satisSiniriDoldu,
  stoktakiVaryantlar,
  tumVaryantlar,
  degisimGerekceleri,
  gerekceEtiketleri,
  bugun,
}: {
  satislar: SatisSecenegi[];
  /** Satış listesi üst sınıra dayandı mı — dayandıysa ekranda yazar. */
  satisSiniriDoldu: boolean;
  /** AYRILAN ürün için: yalnız stoğu olanlar. */
  stoktakiVaryantlar: VaryantSecenegi[];
  /** DÖNEN ürün için: hepsi (stok 0 olabilir). */
  tumVaryantlar: VaryantSecenegi[];
  /** Hangi gerekçelerde ayrılan ürün sorulur — sunucudan gelir (tek kaynak). */
  degisimGerekceleri: ReturnReason[];
  gerekceEtiketleri: Record<string, string>;
  /** İş takvimi günü (Europe/Istanbul) — tarayıcı saatine güvenilmez. */
  bugun: string;
}) {
  const t = useTranslations("Bildirim2");
  const ortak = useTranslations("Ortak");
  const router = useRouter();

  const [durum, gonder, bekliyor] = useActionState<BildirimDurumu, FormData>(
    bildirimOlustur,
    {},
  );

  const [satisId, setSatisId] = useState("");
  const [kod, setKod] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [gerekce, setGerekce] = useState<ReturnReason | "">("");
  const [varyantId, setVaryantId] = useState("");
  const [adet, setAdet] = useState("1");
  const [not, setNot] = useState("");
  const [donenId, setDonenId] = useState("");
  const [tavanOnayi, setTavanOnayi] = useState(false);

  /**
   * DÖNEN ÜRÜN yalnız YANLIS_URUN gerekçesinde sorulur: 6. senaryonun
   * defter düzeltmesi bu varyanta yazılıyor ve iade formu onu SEÇİLİ
   * getiriyor. Diğer gerekçelerde dönen mal satılan malın kendisidir.
   */
  const donenSorulur = gerekce === "YANLIS_URUN";

  const ayirmaSorulur =
    gerekce !== "" && degisimGerekceleri.includes(gerekce as ReturnReason);

  /** Seçilen ayrılan ürünün stok metni — seçimden sonra da görünür kalır. */
  const seciliStokMetni =
    stoktakiVaryantlar.find((v) => v.id === varyantId)?.stokMetni ?? null;

  /**
   * KAYIT ŞARTLARI — düğme neden kapalı, ekranda yazılı (İlke #5).
   * YANLIS_URUN'da dönen ürün ZORUNLU: onsuz 6. senaryo kurulamaz.
   */
  const eksikler: string[] = [];
  if (!satisId) eksikler.push(t("eksikSatis"));
  if (!gerekce) eksikler.push(t("eksikGerekce"));
  if (donenSorulur && !donenId) eksikler.push(t("eksikDonen"));

  // Kayıt başarılıysa form sıfırlanır ve liste tazelenir.
  if (durum.basarili && satisId !== "") {
    setSatisId("");
    setKod("");
    setGerekce("");
    setVaryantId("");
    setDonenId("");
    setTavanOnayi(false);
    setAdet("1");
    setNot("");
    router.refresh();
  }

  /**
   * TAVAN — seçilen satışta zaten `BILDIRIM_TAVANI` bildirim varsa kayıt
   * durur ve SEBEBİ yazar. Mutlak kilit değil: tavan bir BEYAN, ve kuralın
   * yanıldığı gün operasyoncu kilitlenmemeli. Anayasa (20.08.2026): uyarı
   * sorar, kullanıcı ısrar ederse istisna KAYDA GEÇER.
   *
   * ⚠ ONAY BİR SONRAKİ KAYDA TAŞINMAZ: kutu her kayıtta yeniden işaretlenir.
   */
  const seciliSatis = satislar.find((s) => s.id === satisId) ?? null;
  const tavanDoldu =
    seciliSatis !== null && seciliSatis.bildirimSayisi >= BILDIRIM_TAVANI;
  if (tavanDoldu && !tavanOnayi) eksikler.push(t("eksikTavanOnayi"));

  const veri = JSON.stringify({
    saleId: satisId,
    tavanIstisnasi: tavanDoldu && tavanOnayi,
    code: kod,
    noticedAt: tarih,
    reason: gerekce,
    reservedVariantId: ayirmaSorulur && varyantId ? varyantId : null,
    reservedQuantity: ayirmaSorulur && varyantId ? Number(adet) || 0 : 0,
    returnedVariantId: donenSorulur && donenId ? donenId : null,
    note: not,
  });

  return (
    <form action={gonder} className="space-y-4">
      <input type="hidden" name="veri" value={veri} />

      {/*
        TAVAN İSTİSNASI — açık onay olmadan kayıt ilerlemez (İlke #6 ve
        20.08.2026 kararı). Kutu işaretlenmeden düğme kapalı kalır ve
        NEDEN kapalı olduğu eksikler listesinde yazar; sessiz kilit yok.
      */}
      {tavanDoldu ? (
        <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
          <input
            type="checkbox"
            checked={tavanOnayi}
            onChange={(e) => setTavanOnayi(e.target.checked)}
            className="mt-1 size-4"
          />
          <span>
            {t("tavanIstisnasiOnay", {
              adet: seciliSatis?.bildirimSayisi ?? 0,
            })}
          </span>
        </label>
      ) : null}

      <HataOzeti hatalar={durum.hatalar} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bildirim-satis">{t("satis")} *</Label>
          {/* ARANABİLİR: sipariş no yazarak daraltılır. Düz açılır listede
              kullanıcı gözüyle tarayıp bulmak zorundaydı; hacim büyüdükçe
              imkânsızlaşan bir iş (İlke #9 ve #10). */}
          <AranabilirSecim
            id="bildirim-satis"
            etiket={t("satisSecin")}
            ipucu={t("satisPencereIpucu")}
            secenekler={satislar.map((s) => ({
              deger: s.id,
              etiket: s.etiket,
              /* ⚠ SEÇMEDEN ÖNCE GÖRÜNSÜN. Bilgiyi seçimden SONRA vermek,
                 yanlış seçimi düzeltmeye zorlar; alt satır bedava. */
              altEtiket:
                s.bildirimSayisi > 0
                  ? t("tavanUyarisi", {
                      adet: s.bildirimSayisi,
                      tavan: BILDIRIM_TAVANI,
                    })
                  : undefined,
            }))}
            seciliDeger={satisId}
            onSec={setSatisId}
          />
          {/* NE ARANACAĞI YAZAR: kullanıcı 14.08.2026'da iki kez pazaryeri
              TALEP NO'sunu (nbkhuj) bu kutuya yazdı ve "eşleşen seçenek yok"
              cevabını hata sandı. Doğru cevaptı — o bir satış kodu değil.
              Alanın ne beklediğini söylemek, yanlış cevabı düzeltmekten
              ucuzdur (İlke #5). */}
          <p className="text-muted-foreground text-xs">{t("satisIpucu")}</p>
          {/* SINIR AÇIKÇA YAZAR: liste doluysa daha eski satışlar burada
              YOK demektir. Sessizce kesilen liste, kullanıcıya "o satış
              sistemde kayıtlı değil" dedirtir — en sinsi tür. */}
          {satisSiniriDoldu ? (
            <p className="text-muted-foreground text-xs">
              {t("satisListesiSinirli", { sayi: satislar.length })}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bildirim-gerekce">{t("gerekce")} *</Label>
          <Select
            value={gerekce}
            onValueChange={(d) => setGerekce(d as ReturnReason)}
          >
            <SelectTrigger id="bildirim-gerekce" className="h-11 w-full md:h-9">
              <SelectValue placeholder={t("gerekceSecin")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(gerekceEtiketleri).map(([deger, etiket]) => (
                <SelectItem key={deger} value={deger}>
                  {etiket}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bildirim-kod">{t("talepNo")}</Label>
          <Input
            id="bildirim-kod"
            className="h-11 md:h-9"
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            // YER TUTUCU DEĞER GİBİ GÖRÜNMEZ (İlke #11).
            placeholder={t("talepNoIpucu")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bildirim-tarih">{t("bildirimTarihi")} *</Label>
          <Input
            id="bildirim-tarih"
            type="date"
            className="h-11 md:h-9"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
          />
        </div>
      </div>

      {/* DÖNEN ÜRÜN — yalnız YANLIS_URUN gerekçesinde, ZORUNLU.
          6. senaryonun defter düzeltmesi bu varyanta yazılıyor; boş kalırsa
          "iadeyi işle" ön-dolu gelemez ve senaryo hiç kurulamaz. */}
      {donenSorulur ? (
        <div className={`space-y-3 rounded-lg p-3 ${DURUM_KUTUSU.uyari}`}>
          <p className="text-sm font-medium">{t("donenBaslik")} *</p>
          <p className="text-muted-foreground text-xs">{t("donenNotu")}</p>
          <div className="space-y-2">
            <Label htmlFor="bildirim-donen">{ortak("urun")}</Label>
            {/* STOK ŞARTI YOK: yanlışlıkla gitmiş mal zaten stoktan
                düşmüştür, 0 görünmesi normaldir. */}
            <AranabilirSecim
              id="bildirim-donen"
              etiket={t("donenUrunSecin")}
              secenekler={tumVaryantlar.map((v) => ({
                deger: v.id,
                etiket: v.etiket,
                altEtiket: v.stokMetni,
              }))}
              seciliDeger={donenId}
              onSec={setDonenId}
            />
          </div>
        </div>
      ) : null}

      {/* AYRILAN ÜRÜN — yalnız değişim gerekçelerinde. */}
      {ayirmaSorulur ? (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">{t("ayrilanBaslik")}</p>
          <p className="text-muted-foreground text-xs">{t("ayrilanNotu")}</p>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="bildirim-varyant">{ortak("urun")}</Label>
              {/* YALNIZ STOĞU OLANLAR — gönderilemeyecek mal ayrılamaz.
                  Etiketin altında stok adedi yazar ki seçim körlemesine
                  yapılmasın (kullanıcının 14.08.2026'daki hatası). */}
              <AranabilirSecim
                id="bildirim-varyant"
                etiket={t("ayrilanUrunSecin")}
                secenekler={stoktakiVaryantlar.map((v) => ({
                  deger: v.id,
                  etiket: v.etiket,
                  altEtiket: v.stokMetni,
                }))}
                seciliDeger={varyantId}
                onSec={setVaryantId}
              />
              {stoktakiVaryantlar.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t("stoktaUrunYok")}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bildirim-adet">{ortak("adet")}</Label>
              <Input
                id="bildirim-adet"
                type="number"
                min={1}
                className="h-11 md:h-9"
                value={adet}
                onChange={(e) => setAdet(e.target.value)}
              />
            </div>
          </div>
          {/* Seçilen ürünün stoğu, seçimden SONRA da görünür durur. */}
          {seciliStokMetni ? (
            <p className="text-muted-foreground text-xs">{seciliStokMetni}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="bildirim-not">{ortak("not")}</Label>
        <Input
          id="bildirim-not"
          className="h-11 md:h-9"
          value={not}
          onChange={(e) => setNot(e.target.value)}
          placeholder={t("notIpucu")}
        />
      </div>

      <div className="space-y-2">
        <Button
          type="submit"
          className="h-11 md:h-9"
          disabled={bekliyor || eksikler.length > 0}
        >
          <Plus className="size-4" />
          {bekliyor ? t("kaydediliyor") : t("bildirimEkle")}
        </Button>

        {/* DÜĞME NEDEN KAPALI: sebep ekranda yazar (İlke #5). Sessiz pasif
            düğme "sistem bozuk" hissi verir. */}
        {eksikler.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("eksikOnEk")} {eksikler.join(" · ")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
