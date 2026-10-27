"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calculator, UploadCloud } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EYLEM_SINIFI, EylemEtiketi, IRI_EYLEM_SINIFI } from "@/components/satir-eylemi";
import { cn } from "@/lib/utils";
import type { BuyboxDurumu, BuyboxKanali } from "@/lib/buybox";
import { fiyatMetniCoz, fiyatSonucu, hizliFiyatlar, listeFiyatiIcin, musteriFiyati, zararOnayiGerekirMi, type FiyatSonucu } from "@/lib/buybox-fiyat";
import { useBicim } from "@/lib/bicim-istemci";
import { fiyatOnerisi } from "@/lib/buybox-kural";
import { HB_HATA_ANAHTARLARI } from "@/lib/kanal-gonderim-hb";
import { DURUM_SERIDI, DURUM_YAZISI } from "@/lib/renkler";

import { HATA_ANAHTARI as HB_HATA } from "../../kart/[variantId]/hb-gonderim";
import { buyboxFiyatGonder, buyboxFiyatZeminiGetir, type BuyboxGonderimSonucu, type ZeminCevabi } from "./fiyat-eylemleri";
import { KuralOzeti, OneriKutusu, UrunKuraliFormu } from "./kural-kutulari";

/**
 * ============================================================================
 *  BUYBOX FİYAT PENCERESİ — SATIRIN «FİYATLA» EYLEMİ (K363 Faz 3-c)
 * ----------------------------------------------------------------------------
 *  «Her ürünün yanına bir kutu koyalım, mevcut Buybox fiyatını yazalım …
 *  hemen hesap ediyor ve altta kâr oranları çıkıyor; sen okey dersen hemen
 *  gönderiyor.» (Melontik örneği: Hesapla → kâr rozeti → Kaydet → onay.)
 *  YERLEŞİM ÇEVRİLDİ (kullanıcı 26.10.2026: «çok düzensiz, Satışlar sayfasını
 *  referans al» → seçim «eylem düğmesi + pencere»). ESKİ HÂL: kutu, hızlı
 *  düğmeler ve notlar tablonun en sağındaki «Fiyat» sütunundaydı; sütun dar
 *  kaldı, düğmeler komşu satıra taştı. Satır artık Satışlar gibi sade; iş bu
 *  pencerede, Satışlar'ın «Eylemler» sütunundaki düğmeden açılır.
 *  · Pencere açılınca zemin sunucudan alınır (tek varyant × tek kanal; sayfa
 *    açılışında ~170 ürünün zemini kurulmaz — KAS bağlantı kotası), sonra her
 *    tuşta tarayıcıda yeniden hesaplanır — kartla aynı motor.
 *  · Kapanınca her şey sıfırlanır: bir sonraki açılış o anın Buybox fiyatıyla
 *    başlar. ⚠ Eski kutuda Trendyol sekmesinden Hepsiburada'ya geçince aynı
 *    ürünün TY değeri ve zemini kutuda KALIYORDU (kullanıcının ekranında Anker
 *    HB 2.299 iken kutu 2.099); sayfa da bileşeni kanal+ürünle anahtarlar.
 *  · Kaydet Trendyol + Hepsiburada, YALNIZ fiyat; onay adımı eski → yeni fiyatı
 *    ve NET'i gösterir. Zarar/bilinmeyen kâr → onay kutusu işaretlenmeden geçmez.
 *  · HB KENDİ İNDİRİMİ (26.10.2026): kutu LİSTE fiyatıdır (ilana giden, ödeme ve
 *    komisyon tabanı); müşterinin göreceği fiyat altında yazar. ⚠ ESKİ HÂL:
 *    kutu HB'nin indirimli müşteri fiyatıyla açılıyor ve kâr onun üstünden
 *    hesaplanıyordu — Emsan'da 2.170'lik ilan 1.887,90 görünüp «zarar» dedi ve
 *    1.882'yi önerdi; gönderilseydi müşteri fiyatı ~1.638'e düşerdi.
 * ============================================================================
 */
export function FiyatPenceresi({
  variantId,
  urunId,
  kanal,
  urunAdi,
  durum,
  bizimFiyat,
  bizimListeFiyati,
  indirim,
  buyboxFiyati,
  ikinciFiyat,
  esitNotu,
  gonderebilir,
}: {
  variantId: string;
  /** Ürün kartı (desi girişi) bağlantısı için; yoksa bağlantı çizilmez. */
  urunId: string | null;
  kanal: BuyboxKanali;
  urunAdi: string;
  durum: BuyboxDurumu;
  /** Müşterinin gördüğü fiyatımız (Buybox yarışı bununla). */
  bizimFiyat: number | null;
  /** İlandaki fiyatımız (HB); `null` = müşteri fiyatıyla aynı. */
  bizimListeFiyati: number | null;
  /** HB kendi indirimi (0–1); TY ve indirimsiz üründe 0. */
  indirim: number;
  buyboxFiyati: number | null;
  ikinciFiyat: number | null;
  /** Kaybedilmiş ama pahalı değiliz — pencerede açıklaması yazar (`null` = yok). */
  esitNotu: string | null;
  /** `kanal.yaz` izni var mı (sayfa çözer; sunucu yine kendisi sınar). */
  gonderebilir: boolean;
}) {
  const t = useTranslations("Buybox");
  const tk = useTranslations("KanalGonderim");
  const bicim = useBicim();
  const router = useRouter();
  /** Şu anki fiyatımız LİSTE fiyatıyla (kâr ve onay bununla); Buybox'a eşit müşteri fiyatını veren liste fiyatı. */
  const mevcut = bizimListeFiyati ?? bizimFiyat;
  const buyboxListe = buyboxFiyati === null ? null : listeFiyatiIcin(buyboxFiyati, indirim);
  const ilkMetin = buyboxListe === null ? "" : bicim.sayi(buyboxListe, 2);
  const [acik, setAcik] = useState(false);
  const [fiyatMetni, setFiyatMetni] = useState(ilkMetin);
  const [zemin, setZemin] = useState<ZeminCevabi | null>(null);
  const [yukleniyor, yukle] = useTransition();
  const [adim, setAdim] = useState<"fiyat" | "onay">("fiyat");
  const [zararOnayi, setZararOnayi] = useState(false);
  const [gonderiliyor, gonderBasla] = useTransition();
  const [sonuc, setSonuc] = useState<BuyboxGonderimSonucu | null>(null);

  const fiyat = fiyatMetniCoz(fiyatMetni);
  const fiyatGecerli = fiyat !== null && !Number.isNaN(fiyat);
  const bugun = new Date();
  const hesap = (f: number | null): FiyatSonucu | null => (zemin?.tamam && f !== null ? fiyatSonucu(zemin.zemin, f, bugun) : null);
  const girilen = fiyatGecerli ? hesap(fiyat) : null;
  const hizli = hizliFiyatlar({ durum, bizimFiyat, buyboxFiyati, ikinciFiyat, indirim });
  const para = (n: number) => bicim.para(n, "TRY");
  const indirimli = indirim > 0;
  const musteriMetni = (f: number) => t("musteriGorur", { fiyat: para(musteriFiyati(f, indirim)), oran: bicim.yuzde(indirim * 100) });
  const kanalAdi = t(`kanal_${kanal}`);

  const hesapla = () => {
    if (zemin?.tamam || yukleniyor) return;
    yukle(async () => setZemin(await buyboxFiyatZeminiGetir(variantId, kanal)));
  };
  /** K366 — ürün kuralı kaydedilince zemin (maliyet tercihi) ve öneri yeniden kurulur. */
  /**
   * Zemin SIFIRLANMAZ: sıfırlansaydı form kapanır ve «kaydedildi» onayı
   * görünmeden kaybolurdu (İlke #5). Yeni zemin gelince öneri yenilenir.
   */
  const yenidenHesapla = () => {
    yukle(async () => setZemin(await buyboxFiyatZeminiGetir(variantId, kanal)));
    router.refresh();
  };
  /**
   * K366 — ÖNERİLEN FİYAT (onaylı mod): kuralın saf gövdesi, pencerenin zeminiyle.
   * «Kutuya yaz» yalnız kutuyu doldurur; gönderim yine Kaydet → onay adımından.
   */
  const oneri = zemin?.tamam
    ? fiyatOnerisi({ durum, bizimFiyat, bizimListeFiyati, buyboxFiyati, ikinciFiyat, kanalIndirimi: indirim }, zemin.zemin, zemin.kural.etkin, bugun)
    : null;
  /** Pencere açılınca hesap kendiliğinden yapılır (Hesapla tıklaması yerine «Fiyatla»). */
  const ac = () => {
    setAcik(true);
    hesapla();
  };

  const kapat = (a: boolean) => {
    if (gonderiliyor) return;
    setAcik(a);
    if (!a) {
      setFiyatMetni(ilkMetin);
      setZemin(null);
      setAdim("fiyat");
      setZararOnayi(false);
      setSonuc(null);
    }
  };

  const karMetni = (s: FiyatSonucu) =>
    s.net2 === null
      ? t("karBilinmiyor")
      : t(s.net2 < 0 ? "rozetZarar" : "rozetKar", { tutar: para(Math.abs(s.net2)), marj: s.marj === null ? "—" : bicim.yuzde(s.marj) });
  const ton = (s: FiyatSonucu) => (s.net2 === null ? "uyari" : s.net2 < 0 ? "olumsuz" : "olumlu");

  /** Kâr kutusu — etiket, fiyat, kâr. Girilen fiyatın kutusu şeritli (asıl soru o). */
  const karKutusu = (etiket: string, f: number | null, vurgulu: boolean) => {
    const s = hesap(f);
    return (
      <div className={`bg-card min-w-0 rounded-lg border p-2.5 ${vurgulu && s ? DURUM_SERIDI[ton(s)] : ""}`}>
        <p className="text-muted-foreground truncate text-xs">{etiket}</p>
        <p className="truncate text-xs tabular-nums">{f === null ? "—" : para(f)}</p>
        {indirimli && f !== null ? <p className="text-muted-foreground truncate text-[11px] tabular-nums">{t("musteriKisa", { fiyat: para(musteriFiyati(f, indirim)) })}</p> : null}
        <p className={`mt-1 text-sm font-semibold tabular-nums ${s ? DURUM_YAZISI[ton(s)] : ""}`}>{s ? karMetni(s) : "—"}</p>
      </div>
    );
  };

  const gonder = () => {
    if (!fiyatGecerli) return;
    gonderBasla(async () => {
      const s = await buyboxFiyatGonder(variantId, kanal, fiyat, zararOnayi);
      setSonuc(s);
      if (s.sonuc.tamam) router.refresh();
    });
  };
  const onayGerekli = girilen !== null && zararOnayiGerekirMi(girilen);

  return (
    <Dialog open={acik} onOpenChange={kapat}>
      <Button type="button" size="sm" onClick={ac} title={t("fiyatla")} aria-label={t("fiyatlaEtiketi", { urun: urunAdi })} className={cn(EYLEM_SINIFI, IRI_EYLEM_SINIFI)}>
        <Calculator />
        <EylemEtiketi>{t("fiyatla")}</EylemEtiketi>
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{adim === "fiyat" ? t("pencereBaslik", { kanal: kanalAdi }) : t("onayBaslik")}</DialogTitle>
          <DialogDescription className="line-clamp-2">{urunAdi}</DialogDescription>
        </DialogHeader>

        {adim === "fiyat" ? (
          <div className="min-w-0 space-y-3">
            {esitNotu ? <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{esitNotu}</p> : null}

            {zemin?.tamam && oneri !== null && !yukleniyor ? (
              <OneriKutusu
                oneri={oneri}
                kural={zemin.kural.etkin}
                ikinciFiyat={ikinciFiyat}
                buyboxFiyati={buyboxFiyati}
                indirimli={indirimli}
                desiYok={zemin.kargo.sebep === "DESI_YOK"}
                urunId={urunId}
                kutuyaYaz={(f) => {
                  setFiyatMetni(bicim.sayi(f, 2));
                  setSonuc(null);
                }}
              />
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor={`fiyat-${kanal}-${variantId}`}>{t(indirimli ? "yeniListeFiyati" : "yeniFiyat")}</label>
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  id={`fiyat-${kanal}-${variantId}`}
                  inputMode="decimal"
                  value={fiyatMetni}
                  onChange={(e) => {
                    setFiyatMetni(e.target.value);
                    setSonuc(null);
                  }}
                  placeholder={t("fiyatIpucu")}
                  aria-label={t("fiyatEtiketi", { urun: urunAdi })}
                  className="h-11 w-36 text-right tabular-nums md:h-9"
                />
                {/* Hızlı doldurma — yalnız kutuya yazar, hesabı açar; GÖNDERMEZ (İlke #9). */}
                {hizli.map((h) => {
                  const secili = fiyatGecerli && Math.abs(fiyat - h.fiyat) < 0.005;
                  return (
                    <Button
                      key={h.anahtar}
                      type="button"
                      variant={secili ? "secondary" : "outline"}
                      aria-pressed={secili}
                      className="h-11 px-2.5 text-xs md:h-9"
                      onClick={() => {
                        setFiyatMetni(bicim.sayi(h.fiyat, 2));
                        setSonuc(null);
                        hesapla();
                      }}
                    >
                      {t(`hizli_${h.anahtar}`, { fiyat: para(h.fiyat) })}
                    </Button>
                  );
                })}
              </div>
              {fiyat !== null && Number.isNaN(fiyat) ? <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{t("fiyatGecersiz")}</p> : null}
              {indirimli && fiyatGecerli ? <p className="text-xs font-medium" role="status">{musteriMetni(fiyat)}</p> : null}
              {indirimli ? <p className="text-muted-foreground text-xs">{t("indirimNotu")}</p> : null}
            </div>

            {zemin === null ? (
              <p className="text-muted-foreground text-sm" role="status">{t("hesaplaniyor")}</p>
            ) : !zemin.tamam ? (
              <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">{t(`zeminHata_${zemin.kod}`)}</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {karKutusu(t("girilenFiyatta"), fiyatGecerli ? fiyat : null, true)}
                  {karKutusu(t("bizimFiyatta"), mevcut, false)}
                  {karKutusu(t("buyboxFiyatinda"), buyboxListe, false)}
                </div>
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  <li>
                    {zemin.zemin.maliyet === null
                      ? t("maliyetYok")
                      : t("maliyetNotu", { maliyet: para(zemin.zemin.maliyet), parti: zemin.partiSayisi, tercih: t(`maliyetTercihi_${zemin.kural.etkin.maliyet}`) })}
                  </li>
                  <li>
                    {zemin.zemin.kargoTarifesi !== null
                      ? zemin.kargo.firmaKaynagi === "SATIS"
                        ? t("kargoDahilSatis", { tutar: para(zemin.zemin.kargoTarifesi), desi: zemin.kargo.desi === null ? "—" : bicim.sayi(zemin.kargo.desi, 1) })
                        : t(zemin.kargo.firmaKaynagi === "KANAL" ? "kargoDahilKanal" : "kargoDahil", { firma: zemin.kargo.firma ?? "—", desi: bicim.sayi(zemin.kargo.desi ?? 0, 1) })
                      : t(`kargoHaric_${zemin.kargo.sebep ?? "TARIFE_YOK"}`)}
                  </li>
                  {girilen?.komisyonOrani != null ? <li>{t("komisyonNotu", { oran: bicim.yuzde(girilen.komisyonOrani) })}</li> : null}
                </ul>
                <KuralOzeti kural={zemin.kural.etkin} />
                {gonderebilir ? <UrunKuraliFormu variantId={variantId} genel={zemin.kural.genel} urun={zemin.kural.urun} kaydedildi={yenidenHesapla} /> : null}
              </>
            )}
          </div>
        ) : (
          <div className="min-w-0 space-y-2 text-sm">
            <p>
              {t("onayMetni", {
                urun: urunAdi,
                kanal: kanalAdi,
                eski: mevcut === null ? "—" : para(mevcut),
                yeni: fiyatGecerli ? para(fiyat) : "—",
              })}
            </p>
            {indirimli && fiyatGecerli ? <p className="text-xs">{musteriMetni(fiyat)}</p> : null}
            {girilen ? (
              <p>
                {t("onayKar")} <span className={`font-semibold tabular-nums ${DURUM_YAZISI[ton(girilen)]}`}>{karMetni(girilen)}</span>
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">{t(`onayYalnizFiyat_${kanal}`)}</p>
            {onayGerekli ? (
              <label className={`flex min-h-11 items-start gap-2 text-sm ${DURUM_YAZISI.olumsuz}`}>
                <input type="checkbox" className="mt-1 size-4" checked={zararOnayi} onChange={(e) => setZararOnayi(e.target.checked)} />
                {girilen?.net2 === null ? t("onayKarBilinmiyorKutu") : t("onayZararKutu")}
              </label>
            ) : null}
            {sonuc !== null ? <GonderimSonucu sonuc={sonuc} para={para} /> : null}
            {onayGerekli && !zararOnayi && sonuc === null ? <p className="text-muted-foreground text-xs">{t("onayKutuGerekli")}</p> : null}
          </div>
        )}

        <DialogFooter>
          {adim === "fiyat" ? (
            <>
              <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => kapat(false)}>{tk("vazgec")}</Button>
              {zemin?.tamam && gonderebilir ? (
                <Button
                  type="button"
                  className="h-11 md:h-9"
                  disabled={!fiyatGecerli}
                  onClick={() => {
                    setZararOnayi(false);
                    setSonuc(null);
                    setAdim("onay");
                  }}
                >
                  <UploadCloud className="size-4" />
                  {t("kaydet")}
                </Button>
              ) : null}
            </>
          ) : sonuc?.sonuc.tamam ? (
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => kapat(false)}>{tk("kapat")}</Button>
          ) : (
            <>
              <Button type="button" variant="outline" className="h-11 md:h-9" disabled={gonderiliyor} onClick={() => setAdim("fiyat")}>{t("geri")}</Button>
              <Button type="button" className="h-11 md:h-9" disabled={gonderiliyor || !fiyatGecerli || (onayGerekli && !zararOnayi)} onClick={gonder}>
                {gonderiliyor ? tk("gonderiliyor") : t("onayEvet")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Kartın Trendyol gönderimiyle AYNI hata metinleri (`KanalGonderim`, İlke #10). */
const TY_HATA: Record<string, string> = {
  KANAL_SKU_YOK: "hataKanalSkuYok",
  HESAP_YOK: "hataHesapYok",
  VARYANT_YOK: "hataVaryantYok",
  VARYANT_BARKODU_YOK: "hataVaryantBarkoduYok",
  GONDERILECEK_YOK: "hataGonderilecekYok",
  FIYAT_GECERSIZ: "hataFiyatGecersiz",
  ANAHTAR_YOK: "hataAnahtarYok",
  TEKRAR_15DK: "hataTekrar15dk",
  KANAL_REDDETTI: "hataKanalReddetti",
  ULASILAMADI: "hataUlasilamadi",
};

function GonderimSonucu({ sonuc, para }: { sonuc: BuyboxGonderimSonucu; para: (n: number) => string }) {
  const t = useTranslations("Buybox");
  const tTy = useTranslations("KanalGonderim");
  const tHb = useTranslations("KanalGonderimHb");

  if (sonuc.kanal === null) {
    return <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">{t(`gonderimHata_${sonuc.sonuc.kod}`)}</p>;
  }

  if (sonuc.kanal === "TY") {
    const s = sonuc.sonuc;
    if (!s.tamam) {
      return (
        <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">
          {tTy(TY_HATA[s.kod] ?? "hataUlasilamadi")}
          {s.ayrinti ? ` (${s.ayrinti})` : ""}
        </p>
      );
    }
    const renk = s.batchDurumu === "BASARILI" ? DURUM_YAZISI.olumlu : s.batchDurumu === "BASARISIZ" ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.uyari;
    return (
      <div className="space-y-0.5" role={s.batchDurumu === "BASARISIZ" ? "alert" : "status"}>
        <p className={`text-xs ${renk}`}>{t(`gonderim_${s.batchDurumu}`, { fiyat: s.gonderilenFiyat === null ? "—" : para(s.gonderilenFiyat) })}</p>
        {s.sebepler.map((x, i) => (
          <p key={i} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{x}</p>
        ))}
      </div>
    );
  }

  /** Hepsiburada — kartın HB penceresiyle aynı hüküm metinleri (ilan geri okunarak doğrulanır). */
  const s = sonuc.sonuc;
  if (!s.tamam) {
    return (
      <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">
        {tHb(HB_HATA[s.kod])}
        {s.ayrinti ? ` (${s.ayrinti})` : ""}
      </p>
    );
  }
  const p = s.fiyat;
  if (p === null) return <p className={`text-xs ${DURUM_YAZISI.uyari}`} role="status">{t("gonderimHbSonucYok")}</p>;
  const renk = p.hukum === "DOGRULANDI" ? DURUM_YAZISI.olumlu : p.hukum === "RED" ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.uyari;
  const hbHata = (kod: string) => (HB_HATA_ANAHTARLARI[kod] ? tHb(HB_HATA_ANAHTARLARI[kod]) : kod);
  return (
    <div className="space-y-0.5" role={p.hukum === "RED" ? "alert" : "status"}>
      <p className={`text-xs ${renk}`}>
        {tHb(`hukum_${p.hukum}`, { ad: tHb("parcaFiyat"), deger: para(p.gonderilen) })}
        {p.kanaldaki !== undefined && p.hukum !== "DOGRULANDI" && p.hukum !== "RED" ? " " + tHb("kanaldaki", { deger: p.kanaldaki === null ? "—" : para(p.kanaldaki) }) : ""}
        {p.ayrinti ? ` (${p.ayrinti})` : ""}
      </p>
      {p.hatalar.map((h) => (
        <p key={h} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{hbHata(h)}</p>
      ))}
      {p.kilitler.map((k, i) => (
        <p key={i} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>
          {hbHata(k.tip)} {tHb("kilitAraligi", { min: k.min === null ? "—" : para(k.min), max: k.max === null ? "—" : para(k.max) })}
        </p>
      ))}
    </div>
  );
}
