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
}: {
  variantId: string;
  nedenler: NedenSecenegi[];
  /** <input type="date"> biçiminde iş günü. */
  bugun: string;
  mevcutStok: number;
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
                defaultValue={bugun}
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
            <Button type="submit" disabled={bekliyor} className="h-11 md:h-10">
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
