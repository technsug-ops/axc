"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, Save } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
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
import { DURUM_KUTUSU } from "@/lib/renkler";
import { SAYIM_ISRAR_SEBEPLERI } from "@/lib/sayim-korumasi";
import { stokDuzelt, type DuzeltmeDurumu } from "../duzeltme-actions";

/**
 * ============================================================================
 *  STOK DÜZELTME FORMU
 * ----------------------------------------------------------------------------
 *  YÖN ÖNCE SEÇİLİR, sonra adet girilir. Tek bir "adet" kutusuna eksi sayı
 *  yazdırmak en klasik stok hatasıdır: "-5" mi "5 eksilt" mi belli olmaz ve
 *  eksi işareti unutulunca stok ARTAR.
 *
 *  İki yön iki AYRI DÜĞMEdir ve seçili olan görünür (İlke #2).
 *
 *  MALİYET YALNIZ ARTI YÖNDE SORULUR: eksi yönde maliyet FIFO partisinden
 *  gelir, kullanıcının bilmesi gerekmez. Artı yönde sorulur ama zorunlu
 *  değildir — girilmezse "değeri bilinmeyen stok" olur ve ekran bunu söyler.
 * ============================================================================
 */

export type NedenSecenegi = {
  id: string;
  ad: string;
  aciklamaZorunlu: boolean;
  sayimFarkiMi: boolean;
  /** Hangi yönde seçilebilir: "EKSI" | "ARTI" | "HER_IKISI". */
  yon: "EKSI" | "ARTI" | "HER_IKISI";
};

export function DuzeltmeFormu({
  variantId,
  nedenler,
  bugun,
  mevcutStok,
  sonSayimTarihi,
}: {
  variantId: string;
  nedenler: NedenSecenegi[];
  /** <input type="date"> biçiminde iş günü. */
  bugun: string;
  mevcutStok: number;
  /**
   * ⭐ SAYIM KAPISI İÇİN — bu varyantın SON sayımının iş tarihi
   * (`<input type="date">` biçiminde). Sayılmamışsa null.
   *
   * ⚠ EKRAN KİLİTLER, SUNUCU GÜVENMEZ: aynı ölçüt sunucuda da koşuyor.
   * Burada gösterilmesinin sebebi kullanıcıyı KAYDET'e bastıktan sonra
   * değil, ÖNCE uyarmak. _(İlke #5: sessiz başarısızlık yasak.)_
   */
  sonSayimTarihi: string | null;
}) {
  const t = useTranslations("StokDuzeltme");
  const ortak = useTranslations("Ortak");

  const [durum, eylem, bekliyor] = useActionState<DuzeltmeDurumu, FormData>(
    stokDuzelt,
    {},
  );

  const [yon, setYon] = useState<"EKSI" | "ARTI">("EKSI");
  const [nedenId, setNedenId] = useState("");

  /**
   * ⚠ TARİH ARTIK DURUMDA — kontrolsüzken sayım kapısı KARAR VEREMİYORDU.
   * _(Anayasa: "kontrollü girdi, durumu olmadan yazılamaz" — burada tersi
   * yönde: karar için değeri OKUMAK gerekiyordu ve `defaultValue` okunamaz.)_
   */
  const [tarih, setTarih] = useState(bugun);
  const [israrOnay, setIsrarOnay] = useState(false);
  const [israrSebep, setIsrarSebep] = useState("");
  const [israrAciklama, setIsrarAciklama] = useState("");

  /**
   * ⭐ SAYIM KAPISI DURAKSATIR MI — ekran tarafı.
   *
   * ⚠ ÖLÇÜT SUNUCUYLA AYNI: sayım damgası VAR ve hareketin iş tarihi
   * damgadan ÖNCE. Aynı gün SERBEST (sayım gününün tamamı kilitlenmez).
   * Metin karşılaştırması `YYYY-MM-DD` biçiminde sıralı olduğu için güvenli.
   */
  const kapiDuraksatir = sonSayimTarihi !== null && tarih < sonSayimTarihi;
  /** ⚠ YÖN AYRIMI EKRANDA DA: iki yön iki AYRI cümle, çünkü yapılacak
   *  kontrol farklı. Sertlik aynı, gerekçe farklı. */
  const israrGecerli =
    israrOnay && israrSebep !== "" && (israrSebep !== "DIGER" || israrAciklama.trim() !== "");

  /**
   * ════════════════════════════════════════════════════════════════════
   *  NEDEN LİSTESİ YÖNE GÖRE SÜZÜLÜR (16.08.2026 kullanıcı bulgusu)
   * --------------------------------------------------------------------
   *  "Stoğa ekle" seçiliyken listede "Fire", "Hasar / kırılma", "Kayıp"
   *  görünüyordu. Yoktan mal belirmesini "fire" diye kaydetmek anlamsızdır
   *  ve zararsız da değil: rapor o kaydı FİRE KAZANCI satırına yazar ve
   *  ekran kendi kendini yalanlar ("Fire ₺0,00 / Fazla çıkan ₺279,00").
   *
   *  Süzgeç GÖRÜNÜRLÜK değil GEÇERLİLİK meselesi — anlamsız bileşim hiç
   *  kurulamamalı.
   * ════════════════════════════════════════════════════════════════════
   */
  const uygunNedenler = nedenler.filter(
    (n) => n.yon === "HER_IKISI" || n.yon === yon,
  );

  /**
   * YÖN DEĞİŞİNCE UYGUNSUZ SEÇİM DÜŞER — ÇİZİM SIRASINDA TÜRETİLEREK.
   *
   * Kullanıcı "Fire" seçip sonra "Stoğa ekle"ye basarsa seçim SESSİZCE
   * kalırdı: ekranda geçerli görünen, kaydedilince anlamsız olan bir kayıt
   * doğardı.
   *
   * Bu önce `useEffect` ile sıfırlanıyordu; ESLint haklı olarak itiraz
   * etti (`set-state-in-effect`). Efekt bir kare GEÇ çalışır — o kare
   * boyunca ekranda hâlâ geçersiz seçim durur. Türetme aynı karede doğru
   * sonucu verir ve fazladan çizim yapmaz.
   */
  const gecerliNedenId = uygunNedenler.some((n) => n.id === nedenId)
    ? nedenId
    : "";

  const secilenNeden = nedenler.find((n) => n.id === gecerliNedenId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("baslik")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </CardHeader>
      <CardContent>
        <form action={eylem} className="space-y-4">
          <input type="hidden" name="variantId" value={variantId} />
          <input type="hidden" name="yon" value={yon} />

          <HataOzeti hatalar={durum.hatalar} />

          {/* ------------------------- YÖN ------------------------- */}
          <div className="space-y-2">
            <Label>{t("yonEtiketi")}</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={yon === "EKSI" ? "default" : "outline"}
                className="h-11 md:h-10"
                onClick={() => setYon("EKSI")}
              >
                <Minus />
                {t("yonEksi")}
              </Button>
              <Button
                type="button"
                variant={yon === "ARTI" ? "default" : "outline"}
                className="h-11 md:h-10"
                onClick={() => setYon("ARTI")}
              >
                <Plus />
                {t("yonArti")}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {yon === "EKSI" ? t("yonEksiNotu") : t("yonArtiNotu")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* ------------------------ NEDEN ------------------------ */}
            <div className="space-y-2">
              <Label htmlFor="sd-neden">{t("nedenEtiketi")} *</Label>
              <Select value={gecerliNedenId} onValueChange={setNedenId}>
                <SelectTrigger id="sd-neden" className="w-full">
                  <SelectValue placeholder={t("nedenSecin")} />
                </SelectTrigger>
                <SelectContent>
                  {uygunNedenler.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.ad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="nedenId" value={gecerliNedenId} />
              {secilenNeden?.sayimFarkiMi ? (
                <p className="text-muted-foreground text-xs">
                  {t("sayimFarkiNotu")}
                </p>
              ) : null}
            </div>

            {/* ------------------------ ADET ------------------------- */}
            <div className="space-y-2">
              <Label htmlFor="sd-adet">{t("adetEtiketi")} *</Label>
              <Input
                id="sd-adet"
                name="adet"
                inputMode="numeric"
                placeholder={t("adetIpucu")}
                autoComplete="off"
                className="h-11 md:h-10"
              />
              <p className="text-muted-foreground text-xs">
                {t("mevcutStokNotu", { adet: mevcutStok })}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* ------------------------ TARİH ------------------------ */}
            <div className="space-y-2">
              <Label htmlFor="sd-tarih">{ortak("tarih")}</Label>
              <Input
                id="sd-tarih"
                name="tarih"
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="h-11 md:h-10"
              />
            </div>

            {/* --- MALİYET: yalnız ARTI yönde, çünkü eksi yönde FIFO'dan --- */}
            {yon === "ARTI" ? (
              <div className="space-y-2">
                <Label htmlFor="sd-maliyet">{t("birimMaliyet")}</Label>
                <Input
                  id="sd-maliyet"
                  name="birimMaliyet"
                  inputMode="decimal"
                  placeholder={t("birimMaliyetIpucu")}
                  autoComplete="off"
                  className="h-11 md:h-10"
                />
                <input type="hidden" name="paraBirimi" value="TRY" />
                <p className="text-muted-foreground text-xs">
                  {t("birimMaliyetNotu")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t("birimMaliyet")}</Label>
                <p className="text-muted-foreground pt-2 text-sm">
                  {t("maliyetFifodan")}
                </p>
              </div>
            )}
          </div>

          {/* ---------------------- AÇIKLAMA ----------------------- */}
          <div className="space-y-2">
            <Label htmlFor="sd-aciklama">
              {t("aciklamaEtiketi")}
              {secilenNeden?.aciklamaZorunlu ? " *" : ""}
            </Label>
            <Textarea
              id="sd-aciklama"
              name="aciklama"
              rows={2}
              placeholder={t("aciklamaIpucu")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/*
              ═══ SAYIM KORUMASI — ISRAR BLOĞU ═══════════════════════════
              ⭐ ANAYASA: "uyarı SORAR, kullanıcı ISRAR ederse istisna
              kaydedilir." Dört şart burada karşılanıyor:
               · eşik yerinde   → uyarı her seferinde çıkar, susturulmaz
               · onay açık      → kutu işaretlenmeden düğme AÇILMAZ
               · sebep kapalı liste → serbest metin sayılamaz
               · iz bırakır     → sunucu `AuditLog` + `sayimGecersizAt` yazar

              ⚠ VE YÖN AYRIMI EKRANDA DA: iki yön İKİ AYRI CÜMLE, çünkü
              kullanıcının yapması gereken kontrol farklı.
            */}
            {kapiDuraksatir ? (
              <div
                className={`space-y-3 rounded-md border border-dashed p-3 text-xs ${DURUM_KUTUSU.uyari}`}
              >
                <p className="font-medium">{t("sayimIsrariBaslik")}</p>
                <p>
                  {yon === "EKSI"
                    ? t("sayimIsrariDusuren", { tarih })
                    : t("sayimIsrariArtiran", { tarih })}
                </p>
                <div className="space-y-1">
                  <Label htmlFor="sd-israr-sebep">
                    {t("sayimIsrariSebepEtiketi")}
                  </Label>
                  {/*
                    ⚠ ÇIPLAK <select> DEĞİL shadcn değil — form `FormData` ile
                    gönderiliyor ve `name` taşıyan yerli öğe gerekiyor.
                    Dokunma alanı telefonda 44px (İlke #8).
                  */}
                  <select
                    id="sd-israr-sebep"
                    name="sayimIsrariSebep"
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
                    <Label htmlFor="sd-israr-aciklama">
                      {t("sayimIsrariAciklamaEtiketi")}
                    </Label>
                    <Input
                      id="sd-israr-aciklama"
                      name="sayimIsrariAciklama"
                      value={israrAciklama}
                      onChange={(e) => setIsrarAciklama(e.target.value)}
                      className="h-11 md:h-10"
                    />
                  </div>
                ) : (
                  <input type="hidden" name="sayimIsrariAciklama" value="" />
                )}
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    name="sayimIsrariOnay"
                    value="1"
                    className="mt-0.5 size-4 shrink-0"
                    checked={israrOnay}
                    onChange={(e) => setIsrarOnay(e.target.checked)}
                  />
                  <span>{t("sayimIsrariOnayMetni")}</span>
                </label>
                {/*
                  ⚠ KİLİTLİ DÜĞME SESSİZ KALMAZ (İlke #5): niye ilerlemediği
                  ve nasıl ilerleyeceği YAZILI.
                */}
                {!israrGecerli ? (
                  <p className="font-medium">
                    {!israrOnay
                      ? t("sayimIsrariOnayGerek")
                      : israrSebep === ""
                        ? t("sayimIsrariSebepGerek")
                        : t("sayimIsrariAciklamaGerek")}
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={bekliyor || (kapiDuraksatir && !israrGecerli)}
              className="h-11 md:h-10"
            >
              <Save />
              {bekliyor ? ortak("kaydediliyor") : t("kaydet")}
            </Button>
            <p className="text-muted-foreground text-xs">{t("ledgerNotu")}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
