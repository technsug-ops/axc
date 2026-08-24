"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { varyantAra } from "@/app/varyant-arama";
import {
  barkoduOkut,
  okumayiEslestir,
  paketlemeyiGeriAl,
  paketlendiIsaretle,
  type AcikSiparis,
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
  const ortak = useTranslations("Ortak");

  const kutuOdagi = useRef<HTMLInputElement>(null);
  const [kod, setKod] = useState("");
  const [sonuc, setSonuc] = useState<OkumaSonucu | null>(null);
  const [bekliyor, basla] = useTransition();

  /* "Biliyorsan göster" — isteğe bağlı ikinci adım. */
  const [sorgu, setSorgu] = useState("");
  const [adaylar, setAdaylar] = useState<VaryantSonucu[]>([]);
  const [eslesmeNotu, setEslesmeNotu] = useState<string | null>(null);

  /* Sipariş bulunamadığında ürün kartı GİZLİ başlar (İŞ 1). */
  const [detayAcik, setDetayAcik] = useState(false);
  const [paketNotu, setPaketNotu] = useState<string | null>(null);

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
      setDetayAcik(false);
      setPaketNotu(null);
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
   * PAKETLEME İŞARETİ — SATIRA BAĞLI (İŞ 2).
   *
   * ⚠ Cevap geldikten sonra ekranı yeniden çizmek için okuma TAZELENİYOR:
   * "hazırlanıyor" işareti `AuditLog` izinden TÜRETİLİYOR, istemcide
   * tutulan bir bayraktan değil. İstemcide ayrıca tutsaydık iki gerçek
   * olurdu ve biri gün gelip ötekinden ayrışırdı.
   */
  const paketle = (siparis: AcikSiparis) => {
    if (!sonuc) return;
    setPaketNotu(null);
    basla(async () => {
      const cevap = siparis.hazirlaniyor
        ? await paketlemeyiGeriAl(siparis.saleId)
        : await paketlendiIsaretle(siparis.saleId, sonuc.kod, sonuc.alan);
      if ("hata" in cevap) {
        setPaketNotu(t("paketlemeOlmadi"));
        return;
      }
      setSonuc(await barkoduOkut(sonuc.kod));
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
    /** K41① — satış kimliği; ürün rolü değil ama aynı sözlükten okunur. */
    shipmentCode: t("alanShipmentCode"),
  };

  const siparisVar = (sonuc?.siparisler.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-2">
        <BarkodGirisi
          className="max-w-sm min-w-48 flex-1"
          value={kod}
          onChange={setKod}
          inputRef={kutuOdagi}
          /* Enter (USB okuyucu) ve kamera aynı yola çıkar — okunan kod parametreyle. */
          onOkundu={(okunan) => okut(okunan)}
          placeholder={t("ipucu")}
          kameraBasligi={t("kameraBasligi")}
          autoFocus
        />
        {/*
          ⚠ onClick&#123;okut&#125; YAZILAMAZ: tıklama olayı ilk parametreye düşer ve
          fonksiyon onu "okunan kod" sanar. Fiyat denemesinde TypeScript
          yakalamıştı; burada baştan doğru yazıldı.
        */}
        <Button type="button" onClick={() => okut()} disabled={bekliyor}>
          {t("okut")}
        </Button>
        {/*
          TEMİZLE — KUTUYU DA BOŞALTIR (kullanıcı isteği 24.08.2026).

          _"temizlenince sadece alttaki veriler değil arama çubuğunda yazan
          barkod da silinse iyi olur; diğer taraflarda barkod silinmiyor,
          elle siliyorsun."_ Depoda sıradaki ürünü okutmadan önce kutuyu
          elle silmek gereksiz bir adım (İlke #9).

          ⚠ ODAK KUTUYA GERİ VERİLİYOR: temizledikten sonraki tek işlem
          yeni bir kod okutmak. Odağı bırakmak, USB okuyucunun gönderdiği
          tuşların HİÇBİR YERE gitmemesi demekti.

          ⚠ OKUNACAK BİR ŞEY YOKKEN GÖRÜNMEZ: boş ekranda duran bir Temizle,
          basılacak bir şey varmış izlenimi verirdi.
        */}
        {kod || sonuc ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setKod("");
              setSonuc(null);
              setSorgu("");
              setAdaylar([]);
              setEslesmeNotu(null);
              setDetayAcik(false);
              setPaketNotu(null);
              kutuOdagi.current?.focus();
            }}
          >
            {ortak("temizle")}
          </Button>
        ) : null}
      </div>

      {sonuc ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("sonOkuma")}</span>
            <KopyalanabilirKod deger={sonuc.kod} etiket={t("ipucu")} />
          </div>

          {/*
            ⚠ KOŞUL "ÜRÜN BULUNDU MU" DEĞİL, "BİR ŞEY BULUNDU MU" (24.08.2026).

            K41① ile gönderi numarası eklendi ve canlıda hemen çıktı: kod bir
            SATIŞ kimliğiyse `urun` boş kalıyor, ama `siparisler` DOLU. Eski
            koşul her şeyi `sonuc.urun`a sarmıştı, dolayısıyla bulunmuş bir
            sipariş HİÇ ÇİZİLMİYOR ve ekran "dört alanın hiçbirinde
            bulunamadı" diyordu — bulunmuş olmasına rağmen.

            ⚠ ÜRÜN KİMLİĞİ SATIRLARI `sonuc.urun`A BAĞLI KALIYOR: gönderi
            numarasından gelen okumada SKU/barkod YOKTUR ve boş satır
            göstermek, olmayan bir bilgiyi varmış gibi sunardı.
          */}
          {sonuc.urun || siparisVar ? (
            <div className="space-y-3">
              {siparisVar && sonuc.urun ? (
                /* Sipariş varsa asıl bilgi ürünün kendisi — kart açık gelir. */
                <div>
                  <p className="font-medium">{sonuc.urun.urunAdi}</p>
                  {sonuc.urun.varyantAdi ? (
                    <p className="text-sm text-muted-foreground">
                      {sonuc.urun.varyantAdi}
                    </p>
                  ) : null}
                </div>
              ) : siparisVar ? (
                /*
                  GÖNDERİ NUMARASINDAN BULUNDU — ürün değil SİPARİŞ.
                  ⚠ Hangi alandan bulunduğu SÖYLENİR; kullanıcı kodun neden
                  eşleştiğini bilmezse yanlış kutuyu paketleyebilir.
                */
                <div className="space-y-1">
                  <p className="text-lg font-medium">{t("siparisBulundu")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("siparisBulunduAlan", {
                      alan: sonuc.alan ? alanAdi[sonuc.alan] : t("alanSku"),
                    })}
                  </p>
                </div>
              ) : (
                /*
                  ⚠ SİPARİŞSİZ OKUMADA SADE EKRAN (İŞ 1, mimar kararı
                  23.08.2026). Tam ürün kartı dökülmüyor: BÜYÜK tek mesaj,
                  altında KÜÇÜK tek satır, kalan detay "Detay" ile açılıyor.

                  ⚠ VE RENK NÖTR — çarpı yok, uyarı işareti yok, kırmızı yok.
                  Defter %72 eksikken "siparişte yok" çoğunlukla "satış
                  girilmemiş" demektir. Kırmızı gösterilseydi kullanıcı iki
                  haftada okumadan geçmeyi öğrenir ve işaret GERÇEK yanlış
                  üründe görünmez olurdu. Uyarı katmanı K34'tür; açılış şartı
                  defterin kapanması.

                  ⚠ KAYIT DEĞİŞMEDİ: kova hâlâ ACIK_SIPARISTE_YOK. Sadeleşen
                  ekran, ölçüm değil.
                */
                <div className="space-y-1">
                  <p className="text-lg font-medium">
                    {t("siparistteYokBaslik")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("tanindi", {
                      ad: sonuc.urun?.urunAdi ?? "",
                      alan: sonuc.alan ? alanAdi[sonuc.alan] : t("alanSku"),
                    })}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 px-2 md:h-7"
                    onClick={() => setDetayAcik((o) => !o)}
                  >
                    {detayAcik ? t("detayGizle") : t("detay")}
                  </Button>
                </div>
              )}

              {siparisVar || detayAcik ? (
                <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                  {sonuc.alan ? (
                    <>
                      <dt className="text-muted-foreground">{t("hangiAlan")}</dt>
                      <dd>{alanAdi[sonuc.alan]}</dd>
                    </>
                  ) : null}
                  {/*
                    ⚠ ÜRÜN KİMLİĞİ SATIRLARI YALNIZ ÜRÜN BULUNDUYSA. Gönderi
                    numarasından gelen okumada varyant YOKTUR; boş SKU/barkod
                    satırı göstermek, olmayan bir bilgiyi varmış gibi sunardı.
                  */}
                  {sonuc.urun ? (
                    <>
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
                    </>
                  ) : null}
                  {sonuc.urun?.barcode ? (
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
              ) : null}

              {siparisVar ? (
                <div>
                  <p className="text-sm font-medium">{t("acikSiparisler")}</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {sonuc.siparisler.map((s) => (
                      <li
                        key={s.saleId}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span>
                          {t("siparisSatiri", {
                            kod: s.kod ?? t("kodsuzSiparis"),
                            adet: s.adet,
                            kanal: s.kanal,
                          })}
                        </span>
                        {s.hazirlaniyor ? (
                          <span className="text-muted-foreground">
                            {t("paketlendiIsareti")}
                          </span>
                        ) : null}
                        {/*
                          ⚠ TUŞ SATIRIN YANINDA, OKUMANIN DEĞİL. Barkod ÜRÜNÜ
                          söyler, SİPARİŞİ söylemez: aynı ürün üç açık
                          siparişte geçiyorsa hangisine paketlendiğini yalnız
                          kullanıcı bilir. Okumaya bağlı tek bir tuş, sistemin
                          bilmediği bir seçimi kendi yapması olurdu.

                          ⚠ KAPI DEĞİL: tuşa basmadan da paketlenebilir.
                        */}
                        <Button
                          type="button"
                          size="sm"
                          variant={s.hazirlaniyor ? "ghost" : "secondary"}
                          className="h-11 md:h-7"
                          disabled={bekliyor}
                          onClick={() => paketle(s)}
                        >
                          {s.hazirlaniyor
                            ? t("paketlemeGeriAl")
                            : t("paketlendi")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {paketNotu ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {paketNotu}
                    </p>
                  ) : null}
                </div>
              ) : null}
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
