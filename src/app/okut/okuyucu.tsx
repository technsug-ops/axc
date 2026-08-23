"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { varyantAra } from "@/app/varyant-arama";
import {
  barkoduOkut,
  okumayiEslestir,
  type OkumaSonucu,
} from "@/app/okut/actions";
import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Button } from "@/components/ui/button";
import type { KodRolu } from "@/lib/varyant-arama-kurali";
import type { VaryantSonucu } from "@/lib/varyant-ozet";

/**
 * ============================================================================
 *  DEPO OKUMASI — OKUTMA EKRANI (K34a)
 * ----------------------------------------------------------------------------
 *  ⚠ BU EKRANDA UYARI YOKTUR. Kırmızı yok, ünlem yok, onay kutusu yok, engel
 *  yok. Sebebi ölçüldü: kontrol katmanı (K34) EKSİK DEFTERİN üstünde
 *  çalışırdı — ağustosta kümenin %72'si sistemde yok. Uyarı çoğunlukla HAKLI
 *  OLARAK çalar, kullanıcı her seferinde geçer ve iki haftada uyarıyı
 *  OKUMADAN tıklamayı öğrenir. Bu ekranın işi ölçmek; ölçtüğü şeyi bozacak
 *  bir alışkanlık üretemez.
 *
 *  ⚠ "Bulunamadı" bir SUÇLAMA değil BİLGİDİR ve öyle yazılır.
 * ============================================================================
 */
export function Okuyucu() {
  const t = useTranslations("Okuma");

  const [kod, setKod] = useState("");
  const [sonuc, setSonuc] = useState<OkumaSonucu | null>(null);
  const [bekliyor, basla] = useTransition();

  /* "Biliyorsan göster" — isteğe bağlı ikinci adım. */
  const [sorgu, setSorgu] = useState("");
  const [adaylar, setAdaylar] = useState<VaryantSonucu[]>([]);
  const [eslesmeNotu, setEslesmeNotu] = useState<string | null>(null);

  /**
   * ⚠ OKUNAN DEĞER PARAMETRE OLARAK GEÇER — DURUMDAN OKUNMAZ.
   * Fiyat denemesinde tam bu tuzağa düşülmüştü: kamera `setKod` çağırıp
   * hemen aramayı tetikleyince, React durumu senkron güncellenmediği için
   * arama HÂLÂ ESKİ barkodu kullanıyordu. Kamera yeni kodu okur, sistem bir
   * öncekini arardı — ekranda hata yok, kilitlenme yok, yalnız yanlış ürün.
   */
  const okut = (okunan?: string) => {
    const aranacak = (okunan ?? kod).trim();
    if (!aranacak) return;
    basla(async () => {
      const cevap = await barkoduOkut(aranacak);
      setSonuc(cevap);
      setSorgu("");
      setAdaylar([]);
      setEslesmeNotu(null);
    });
  };

  const adayAra = (metin: string) => {
    setSorgu(metin);
    if (metin.trim().length < 2) {
      setAdaylar([]);
      return;
    }
    basla(async () => setAdaylar(await varyantAra(metin)));
  };

  const eslestir = (varyantId: string) => {
    const iz = sonuc?.izId;
    if (!iz) return;
    basla(async () => {
      const cevap = await okumayiEslestir(iz, varyantId);
      setEslesmeNotu("ok" in cevap ? t("eslestirildi") : t("eslestirmeOlmadi"));
      setAdaylar([]);
      setSorgu("");
    });
  };

  /**
   * ⚠ ALAN ETİKETLERİ EXHAUSTIVE `Record` — şemaya beşinci bir kod rolü
   * eklenirse burası DERLENMEZ. Ham enum ("channelSku") ekranda görünmesi
   * bu kilit sayesinde imkânsız.
   */
  const alanAdi: Record<KodRolu, string> = {
    barcode: t("alanBarcode"),
    companySku: t("alanCompanySku"),
    sku: t("alanSku"),
    channelSku: t("alanChannelSku"),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-2">
        <BarkodGirisi
          className="max-w-sm min-w-48 flex-1"
          value={kod}
          onChange={setKod}
          /* Enter (USB okuyucu) ve kamera aynı yola çıkar — okunan kod parametreyle. */
          onOkundu={(okunan) => okut(okunan)}
          placeholder={t("ipucu")}
          kameraBasligi={t("kameraBasligi")}
          autoFocus
        />
        {/*
          ⚠ onClick={okut} YAZILAMAZ: tıklama olayı ilk parametreye düşer ve
          fonksiyon onu "okunan kod" sanar. Fiyat denemesinde TypeScript
          yakalamıştı; burada baştan doğru yazıldı.
        */}
        <Button type="button" onClick={() => okut()} disabled={bekliyor}>
          {t("okut")}
        </Button>
      </div>

      {sonuc ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("sonOkuma")}</span>
            <KopyalanabilirKod deger={sonuc.kod} etiket={t("ipucu")} />
          </div>

          {sonuc.urun ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium">{sonuc.urun.urunAdi}</p>
                {sonuc.urun.varyantAdi ? (
                  <p className="text-sm text-muted-foreground">
                    {sonuc.urun.varyantAdi}
                  </p>
                ) : null}
              </div>

              <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                {sonuc.alan ? (
                  <>
                    <dt className="text-muted-foreground">{t("hangiAlan")}</dt>
                    <dd>{alanAdi[sonuc.alan]}</dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">{t("alanSku")}</dt>
                <dd>
                  <KopyalanabilirKod
                    deger={sonuc.urun.sku}
                    etiket={t("alanSku")}
                  />
                </dd>
                <dt className="text-muted-foreground">
                  {t("alanCompanySku")}
                </dt>
                <dd>
                  <KopyalanabilirKod
                    deger={sonuc.urun.companySku}
                    etiket={t("alanCompanySku")}
                  />
                </dd>
                {sonuc.urun.barcode ? (
                  <>
                    <dt className="text-muted-foreground">
                      {t("alanBarcode")}
                    </dt>
                    <dd>
                      <KopyalanabilirKod
                        deger={sonuc.urun.barcode}
                        etiket={t("alanBarcode")}
                      />
                    </dd>
                  </>
                ) : null}
              </dl>

              <div>
                <p className="text-sm font-medium">{t("acikSiparisler")}</p>
                {sonuc.siparisler.length === 0 ? (
                  /*
                    ⚠ NÖTR DİL, NÖTR RENK. "Açık siparişte yok" bilgidir;
                    satışın girilmemiş olması KADAR, ürünün bugün
                    paketlenmiyor olması da mümkündür. Hangisi olduğunu bu
                    ekran BİLEMEZ ve iddia etmez.
                  */
                  <p className="text-sm text-muted-foreground">
                    {t("acikSiparisYok")}
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm">
                    {sonuc.siparisler.map((s, i) => (
                      <li key={`${s.kod ?? "kodsuz"}-${i}`}>
                        {t("siparisSatiri", {
                          kod: s.kod ?? t("kodsuzSiparis"),
                          adet: s.adet,
                          kanal: s.kanal,
                        })}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* ⚠ `text-muted-foreground`: bu bir uyarı değil, bilgi. Kırmızı YOK. */}
              <p className="text-sm text-muted-foreground">{t("bulunamadi")}</p>

              {eslesmeNotu ? (
                <p className="text-sm">{eslesmeNotu}</p>
              ) : (
                <div className="space-y-2">
                  {/*
                    ⚠ TEKLİF, TALEP DEĞİL. Cümle "istersen atla" diyor ve bunu
                    demesi şart: sorulmuş gibi duran her alan, cevaplanması
                    gereken bir alan sanılır ve depoda paketleyen kişiyi
                    yavaşlatır. Kullanıcının burada yaptığı şey EŞLEŞTİRMEDİR
                    — "okuttuğum kod bu ürüne ait" — kodun NİYE tutmadığı
                    SORULMUYOR (mimar kararı 23.08.2026).
                  */}
                  <p className="text-sm text-muted-foreground">
                    {t("gosterTeklifi")}
                  </p>
                  <BarkodGirisi
                    className="max-w-sm"
                    value={sorgu}
                    onChange={adayAra}
                    onOkundu={adayAra}
                    placeholder={t("gosterAra")}
                    kameraBasligi={t("kameraBasligi")}
                  />
                  {adaylar.length > 0 ? (
                    <ul className="space-y-1">
                      {adaylar.map((aday) => (
                        <li
                          key={aday.id}
                          className="flex flex-wrap items-center gap-2 text-sm"
                        >
                          <span>{aday.urunAdi}</span>
                          <KopyalanabilirKod
                            deger={aday.sku}
                            etiket={t("alanSku")}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => eslestir(aday.id)}
                            disabled={bekliyor}
                          >
                            {t("gosterSec")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {sonuc && sonuc.izId === null ? (
        <p className="text-sm text-muted-foreground">{t("izYazilamadi")}</p>
      ) : null}
    </div>
  );
}
