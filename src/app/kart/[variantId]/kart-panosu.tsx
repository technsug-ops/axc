import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { EgilimRozeti } from "@/components/egilim-rozeti";
import { HalkaKompakt, halkaDilimleriniTopla } from "@/components/halka-grafik";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { bicimlendirici } from "@/lib/bicim";
import { gunMetni, gunMetninden, type Pencere, type PencereTuru } from "@/lib/donem";
import { miniKovalar } from "@/lib/panel/mini-seri";
import { PENCERE_ANAHTARI } from "@/lib/pencere-etiket";
import { DURUM_YAZISI, karDurumu } from "@/lib/renkler";
import { suzgecAdresi } from "@/lib/suzgec";
import { SIPARIS_SATIR_TAVANI, type KartAnalizi } from "@/lib/urun-karti-analiz";

import { DurumHalkasi, GunlukGrafik, MiniCizgi, StokFiyatGrafigi } from "./kart-grafikleri";

/**
 * ============================================================================
 *  KÂRLILIK KARTI PANOSU — ALGORİTMO ÜRÜN SAYFASI İSKELETİ (K330, 10.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «hem frontend olarak hem içerik olarak çok sevdim Algoritmo'yu».
 *  Üst kart (resim · künye · dönem + iki KPI) → dört özet kutusu → sekmeler.
 *  Bütün rakamlar `kartAnalizi`nden (tek gövde); kâr rakamları izinsiz
 *  kullanıcıya HİÇ gelmez (`null`), burada da çizilmez.
 *
 *  ⚠ SEKME ADRESE YAZILIR (İlke #13) ve dönem parametrelerini korur.
 * ============================================================================
 */

/**
 * ⚠ «Fiyat dene» SEKME DEĞİL: K103 (kullanıcı 30.08.2026) gereği geniş ekranda
 * her sekmenin SAĞINDA durur — «ne kazandırdı» ile «bu fiyattan ne kazandırır»
 * birlikte okunur. Sekme olsaydı ikisi ayrı ekranlara düşerdi.
 */
export const KART_SEKMELERI = ["genel", "siparisler", "kar", "varyantlar", "iadeler"] as const;
export type KartSekmesi = (typeof KART_SEKMELERI)[number];

export function kartSekmesiCoz(ham: string | undefined): KartSekmesi {
  return (KART_SEKMELERI as readonly string[]).includes(ham ?? "") ? (ham as KartSekmesi) : "genel";
}

/** Kartın dönem menüsü — liste pencerelerinden, kartın sorusuna uyanlar. */
export const KART_PENCERELERI: readonly PencereTuru[] = ["SON_15_GUN", "SON_30_GUN", "BU_AY", "SON_3_AY", "SON_6_AY", "SON_1_YIL"];

const GUN_MS = 86_400_000;
const gunOnce = (an: Date, simdi: Date) => Math.max(0, Math.floor((simdi.getTime() - an.getTime()) / GUN_MS));

export async function DonemSecici({
  temel,
  mevcut,
  pencere,
}: {
  temel: string;
  mevcut: Record<string, string | undefined>;
  pencere: Pencere;
}) {
  const t = await getTranslations("UrunKarti");
  const tp = await getTranslations("Pencere");
  const bicim = await bicimlendirici();
  return (
    <details className="group relative">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border bg-[var(--se-kart)] px-3 text-sm">
        <span className="text-muted-foreground absolute -top-2 left-2 bg-[var(--se-kart)] px-1 text-[11px]">{t("donem")}</span>
        <CalendarDays className="size-4 shrink-0" />
        <span className="tabular-nums">
          {bicim.tarih(pencere.ilkGun)} – {bicim.tarih(pencere.sonGun)}
        </span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-lg border bg-[var(--se-kart)] p-3 shadow-lg">
        <div className="flex flex-wrap gap-2">
          {KART_PENCERELERI.map((tur) => (
            <Link
              key={tur}
              href={suzgecAdresi(temel, mevcut, { pencere: tur, baslangic: undefined, bitis: undefined })}
              scroll={false}
              className={`inline-flex h-11 items-center rounded-lg border px-3 text-sm ${pencere.tur === tur ? "border-[var(--se-vurgu)] text-[var(--se-vurgu)]" : ""}`}
            >
              {tp(PENCERE_ANAHTARI[tur])}
            </Link>
          ))}
        </div>
        <form method="get" action={temel} className="space-y-2">
          {Object.entries(mevcut).map(([ad, deger]) =>
            ad === "pencere" || ad === "baslangic" || ad === "bitis" || !deger ? null : <input key={ad} type="hidden" name={ad} value={deger} />,
          )}
          <input type="hidden" name="pencere" value="OZEL" />
          <p className="text-xs font-medium">{t("donemOzel")}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs">
              <span>{t("donemBaslangic")}</span>
              <input type="date" name="baslangic" defaultValue={gunMetni(pencere.ilkGun)} className="h-11 w-full rounded-lg border px-2" />
            </label>
            <label className="space-y-1 text-xs">
              <span>{t("donemBitis")}</span>
              <input type="date" name="bitis" defaultValue={gunMetni(pencere.sonGun)} className="h-11 w-full rounded-lg border px-2" />
            </label>
          </div>
          <button type="submit" className="h-11 w-full rounded-lg bg-[var(--se-vurgu)] text-sm font-medium text-white">
            {t("donemUygula")}
          </button>
        </form>
      </div>
    </details>
  );
}

/** Önceki döneme göre % rozeti — yoksa NEDENİ yazar. */
async function Degisim({ yuzde, iyiYukari = true }: { yuzde: number | null; iyiYukari?: boolean }) {
  const t = await getTranslations("UrunKarti");
  const bicim = await bicimlendirici();
  if (yuzde === null) return <span className="text-muted-foreground text-xs">{t("oncekiYok")}</span>;
  const yukari = yuzde >= 0;
  return (
    <EgilimRozeti iyi={yukari === iyiYukari} yukari={yukari} ek={t("oncekiDonem")}>
      {`${yukari ? "+" : ""}${bicim.sayi(Math.round(yuzde * 10) / 10)} %`}
    </EgilimRozeti>
  );
}

/** Üst kartın sağ sütunu: iki KPI (adet · ciro), önceki döneme göre. */
export async function UstKpiler({ a, para }: { a: KartAnalizi; para: string }) {
  const t = await getTranslations("UrunKarti");
  const bicim = await bicimlendirici();
  return (
    <div className="grid grid-cols-2 gap-3">
      <IstatistikKutusu etiket={t("kpiAdet")} cocuk={bicim.sayi(a.adet)} kiyas={<Degisim yuzde={a.adetDegisim} />} mini={miniKovalar(a.gunluk.map((n) => n.adet))} />
      <IstatistikKutusu etiket={t("kpiCiro")} cocuk={bicim.para(a.ciro, para)} kiyas={<Degisim yuzde={a.ciroDegisim} />} mini={miniKovalar(a.gunluk.map((n) => n.ciro))} />
    </div>
  );
}

/** Künye altındaki tarih satırı — Algoritmo «Aktiv seit · Erster/Letzter Verkauf». */
export async function TarihSatiri({ a, tumZaman }: { a: KartAnalizi; tumZaman: { satis: number; adet: number } | null }) {
  const t = await getTranslations("UrunKarti");
  const bicim = await bicimlendirici();
  const simdi = new Date();
  const ogeler: [string, Date | null][] = [
    [t("kayitTarihi"), a.aktifSiden],
    [t("ilkSatis"), a.ilkSatis],
    [t("sonSatisKisa"), a.sonSatis],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ogeler.map(([etiket, an]) => (
        <div key={etiket} className="min-w-0">
          <div className="text-muted-foreground text-[11px] font-medium uppercase">{etiket}</div>
          <div className="text-sm font-medium tabular-nums">
            {an === null ? t("satisHicYok") : t("tarihGun", { tarih: bicim.tarih(an), gun: gunOnce(an, simdi) })}
          </div>
        </div>
      ))}
      {/* K330 — eski «Satış geçmişi» bloğunun tüm zaman sayıları (tekrar gösterge temizliği). */}
      <div className="min-w-0">
        <div className="text-muted-foreground text-[11px] font-medium uppercase">{t("tumZaman")}</div>
        <div className="text-sm font-medium tabular-nums">
          {/* Adet BURADA YOK: tüm zaman adedi kâr bloğunda (K102 — kâr cümlesinin ölçeği); iki yerde yazılmaz. */}
          {tumZaman === null ? t("satisHicYok") : t("tumZamanDeger", { satis: tumZaman.satis })}
        </div>
      </div>
    </div>
  );
}

function KutuBasligi({ children }: { children: React.ReactNode }) {
  return <h3 className="border-b border-dotted border-[var(--se-zarar)] pb-1 text-center text-sm font-medium">{children}</h3>;
}

/** Dört özet kutusu — fiyat · kâr özeti · stok kaç gün yeter · iadeler. */
export async function OzetKutulari({
  a,
  para,
  karGorunur,
  sonAlim,
}: {
  a: KartAnalizi;
  para: string;
  karGorunur: boolean;
  /** Eski «Son alım maliyeti» kutusu buraya taşındı — not (giriş tarihi · tedarikçi · kod · tükendi) AYNEN. */
  sonAlim: { tutar: number | null; paraBirimi: string; not: string };
}) {
  const t = await getTranslations("UrunKarti");
  const bicim = await bicimlendirici();
  const fiyatSerisi = a.gunluk.map((n) => (n.adet > 0 ? n.ciro / n.adet : null));
  const ortAlis =
    a.alimFiyatlari.length === 0
      ? null
      : a.alimFiyatlari.reduce((s, x) => s + x.birim * x.adet, 0) / Math.max(1, a.alimFiyatlari.reduce((s, x) => s + x.adet, 0));
  const m = a.merdiven;
  const yuzde = (pay: number) => (m && m.ciro > 0 ? `%${bicim.sayi(Math.round((pay / m.ciro) * 1000) / 10)}` : "");
  const yeterOrani = a.stokYeterGun === null ? null : Math.min(1, a.stokYeterGun / Math.max(1, a.gunSayisi));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-3 rounded-lg border p-4">
        <KutuBasligi>{t("kutuFiyat")}</KutuBasligi>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span>{t("ortSatisFiyati")}</span>
            <span className="font-semibold tabular-nums">{a.ortalamaFiyat === null ? "?" : `ø ${bicim.para(a.ortalamaFiyat, para)}`}</span>
          </div>
          <MiniCizgi degerler={fiyatSerisi} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span>{t("alisGecmisi")}</span>
            <span className="font-semibold tabular-nums">{ortAlis === null ? t("alisHicYok") : `ø ${bicim.para(ortAlis, para)}`}</span>
          </div>
          <MiniCizgi degerler={a.alimFiyatlari.map((x) => x.birim)} renk="var(--se-vurgu)" />
        </div>
        <div className="space-y-0.5 border-t pt-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span>{t("sonAlisFiyati")}</span>
            <span className="font-semibold tabular-nums">{sonAlim.tutar === null ? "?" : bicim.para(sonAlim.tutar, sonAlim.paraBirimi)}</span>
          </div>
          <div className="text-muted-foreground text-[11px]">{sonAlim.not}</div>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <KutuBasligi>{t("kutuKar")}</KutuBasligi>
        {!karGorunur ? (
          <p className="text-muted-foreground text-xs">{t("karIzinYok")}</p>
        ) : m === null || m.dahilKalem === 0 ? (
          <p className="text-muted-foreground text-xs">{t("merdivenBos")}</p>
        ) : (
          <dl className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2 text-xs">
            <dt>{t("ozetCiro")}</dt>
            <dd />
            <dd className="text-right font-semibold tabular-nums">{bicim.para(m.ciro, para)}</dd>
            <dt>{t("ozetMaliyet")}</dt>
            <dd className="text-muted-foreground tabular-nums">{yuzde(m.maliyet)}</dd>
            <dd className="text-right font-semibold tabular-nums">{bicim.para(m.maliyet, para)}</dd>
            <dt>{t("ozetNet1")}</dt>
            <dd className="text-muted-foreground tabular-nums">{yuzde(m.net1)}</dd>
            <dd className={`text-right font-semibold tabular-nums ${DURUM_YAZISI[karDurumu(m.net1)]}`}>{bicim.para(m.net1, para)}</dd>
            <dt>{t("ozetNet2")}</dt>
            <dd className="text-muted-foreground tabular-nums">{yuzde(m.net2)}</dd>
            <dd className={`text-right font-semibold tabular-nums ${DURUM_YAZISI[karDurumu(m.net2)]}`}>{bicim.para(m.net2, para)}</dd>
          </dl>
        )}
        {karGorunur && m !== null && m.haricKalem > 0 ? (
          <p className="text-muted-foreground text-[11px]">{t("merdivenHaric", { sayi: m.haricKalem })}</p>
        ) : null}
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <KutuBasligi>{t("kutuStok")}</KutuBasligi>
        <div className="grid grid-cols-2 items-center gap-2 text-center">
          <div>
            <div className="text-muted-foreground text-xs">{t("eldekiKisa")}</div>
            <div className="text-3xl font-semibold tabular-nums">{bicim.sayi(a.eldekiAdet)}</div>
          </div>
          <DurumHalkasi
            oran={yeterOrani}
            merkez={a.stokYeterGun === null ? "?" : t("yeterGun", { gun: a.stokYeterGun })}
            alt={a.eldekiAdet <= 0 ? t("stokBitti") : a.stokYeterGun === null ? t("yeterSatisYok") : ""}
            renk="var(--se-vurgu)"
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <KutuBasligi>{t("kutuIade")}</KutuBasligi>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-muted-foreground text-xs">{t("iadeAdedi")}</div>
            <div className="text-3xl font-semibold tabular-nums">{bicim.sayi(a.iadeAdet)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("iadeOrani")}</div>
            <div className={`text-3xl font-semibold tabular-nums ${a.iadeAdet > 0 ? DURUM_YAZISI.olumsuz : ""}`}>
              {a.iadeOrani === null ? "?" : `%${bicim.sayi(Math.round(a.iadeOrani * 1000) / 10)}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Alt çizgili sekmeler (Algoritmo) — adrese yazılır, dönem korunur. */
export async function SekmeCubugu({
  temel,
  mevcut,
  secili,
  sayilar,
  karGorunur,
}: {
  temel: string;
  mevcut: Record<string, string | undefined>;
  secili: KartSekmesi;
  sayilar: { siparisler: number; varyantlar: number };
  karGorunur: boolean;
}) {
  const t = await getTranslations("UrunKarti");
  const adlar: Record<KartSekmesi, string> = {
    genel: t("sekmeGenel"),
    siparisler: `${t("sekmeSiparisler")} (${sayilar.siparisler})`,
    kar: t("sekmeKar"),
    varyantlar: `${t("sekmeVaryantlar")} (${sayilar.varyantlar})`,
    iadeler: t("sekmeIadeler"),
  };
  const gorunen = KART_SEKMELERI.filter((s) => karGorunur || s !== "kar");
  return (
    <nav className="flex gap-1 overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none]" aria-label={t("sekmeGenel")}>
      {gorunen.map((s) => (
        <Link
          key={s}
          href={suzgecAdresi(temel, mevcut, { sekme: s === "genel" ? undefined : s })}
          scroll={false}
          aria-current={s === secili ? "page" : undefined}
          className={`inline-flex h-11 shrink-0 items-center border-b-2 px-3 text-[13px] font-medium ${
            s === secili ? "border-[var(--se-vurgu)] text-[var(--se-vurgu)]" : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          {adlar[s]}
        </Link>
      ))}
    </nav>
  );
}

const PALET = ["#12356B", "#E3A13A", "#2F9E5B", "#D64545", "#6B7A90"];

/** GENEL sekmesi — günlük grafik · kanal/hesap dağılımı · ürün durumu · stok ve fiyat · kanal fiyatları. */
export async function GenelSekmesi({ a, para, karGorunur }: { a: KartAnalizi; para: string; karGorunur: boolean }) {
  const t = await getTranslations("UrunKarti");
  const bicim = await bicimlendirici();
  const kisa = (gun: string) => {
    const d = gunMetninden(gun);
    return d ? bicim.tarih(d).slice(0, 5) : gun;
  };
  const paraKisa = (n: number) => bicim.para(Math.round(n), para);
  const kanalDilimleri = halkaDilimleriniTopla(
    a.kanallar.map((k, i) => ({ etiket: k.ad, tutar: k.ciro, tutarMetni: bicim.para(k.ciro, para), renk: PALET[i % PALET.length]! })),
    (sayi) => t("digerKanal", { sayi }),
    PALET[4]!,
    (tutar) => bicim.para(tutar, para),
  ).dilimler;
  const m = a.merdiven;
  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="text-base font-semibold">{t("grafikBaslik")}</h2>
        <GunlukGrafik
          noktalar={a.gunluk}
          adlar={{ ciro: t("grafikCiro"), net2: karGorunur ? t("grafikNet") : null, adet: t("grafikAdet"), iade: t("grafikIade") }}
          bicimlePara={paraKisa}
          bicimleGun={kisa}
          bosMesaj={t("grafikBos")}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-base font-semibold">{t("kanalBaslik")}</h2>
          <HalkaKompakt
            dilimler={kanalDilimleri}
            toplam={a.ciro}
            toplamMetni={bicim.para(a.ciro, para)}
            toplamEtiketi={t("toplam")}
            /* `HalkaKompakt` yüzdeyi 0–100 verir (`dilimYuzdesi`) — 0–1 sanılıp ×100 yapılınca «%10.000» yazıyordu. */
            yuzdeMetni={(o) => `%${bicim.sayi(Math.round(o * 10) / 10)}`}
            bosMesaj={t("dagilimYok")}
            aciklama={t("kanalBaslik")}
          />
          {a.hesaplar.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="py-1 text-left font-medium">{t("tabloHesap")}</th>
                  <th className="py-1 text-right font-medium">{t("tabloAdet")}</th>
                  <th className="py-1 text-right font-medium">{t("tabloCiro")}</th>
                  <th className="py-1 text-right font-medium">{t("tabloPay")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-[var(--se-baslik)] font-semibold">
                  <td className="py-1.5 pl-1">{t("toplam")}</td>
                  <td className="text-right tabular-nums">{bicim.sayi(a.adet)}</td>
                  <td className="text-right tabular-nums">{bicim.para(a.ciro, para)}</td>
                  <td className="pr-1 text-right tabular-nums">%100</td>
                </tr>
                {a.hesaplar.map((h) => (
                  <tr key={h.ad} className="border-t">
                    <td className="py-1.5 pl-1">{h.ad}</td>
                    <td className="text-right tabular-nums">{bicim.sayi(h.adet)}</td>
                    <td className="text-right tabular-nums">{bicim.para(h.ciro, para)}</td>
                    <td className="pr-1 text-right tabular-nums">%{bicim.sayi(Math.round(h.pay * 1000) / 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-base font-semibold">{t("durumBaslik")}</h2>
          <div className="grid grid-cols-3 gap-2">
            <DurumHalkasi
              oran={a.iadeOrani}
              merkez={a.iadeOrani === null ? "?" : `%${bicim.sayi(Math.round(a.iadeOrani * 1000) / 10)}`}
              alt={`${t("durumIade")} · ${bicim.sayi(a.iadeAdet)}`}
              renk={a.iadeAdet > 0 ? "var(--se-zarar)" : "var(--se-kar)"}
            />
            {karGorunur ? (
              <DurumHalkasi
                oran={m && m.ciro > 0 ? Math.abs(m.net2 / m.ciro) : null}
                merkez={m && m.ciro > 0 ? `%${bicim.sayi(Math.round((m.net2 / m.ciro) * 1000) / 10)}` : "?"}
                alt={`${t("durumMarj")} · ${m && m.dahilKalem > 0 ? bicim.para(m.net2, para) : "?"}`}
                renk={m && m.net2 < 0 ? "var(--se-zarar)" : "var(--se-kar)"}
              />
            ) : (
              <div />
            )}
            <DurumHalkasi
              oran={a.ciroPayi}
              merkez={a.ciroPayi === null ? "?" : `%${bicim.sayi(Math.round(a.ciroPayi * 1000) / 10)}`}
              alt={`${t("durumPay")} · ${bicim.para(a.ciro, para)}`}
              renk="var(--se-vurgu)"
            />
          </div>
        </section>
      </div>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="text-base font-semibold">{t("stokGrafikBaslik")}</h2>
        <StokFiyatGrafigi
          noktalar={a.stokSerisi.map((s, i) => ({ gun: s.gun, stok: s.stok, fiyat: a.gunluk[i] && a.gunluk[i]!.adet > 0 ? a.gunluk[i]!.ciro / a.gunluk[i]!.adet : null }))}
          adlar={{ stok: t("stokSeri"), fiyat: t("fiyatSeri") }}
          bicimlePara={paraKisa}
          bicimleGun={kisa}
          bosMesaj={t("stokGrafikBos")}
        />
      </section>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="text-base font-semibold">{t("kanalFiyatBaslik")}</h2>
        <p className="text-muted-foreground text-xs">{t("kanalFiyatNotu")}</p>
        {a.kanalFiyatlari.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{t("kanalFiyatYok")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="py-1 text-left font-medium">{t("tabloKanal")}</th>
                <th className="py-1 font-medium max-sm:hidden">{t("tabloGelisim")}</th>
                <th className="py-1 text-right font-medium">{t("tabloOrt")}</th>
                <th className="py-1 text-right font-medium">{t("tabloSon")}</th>
              </tr>
            </thead>
            <tbody>
              {a.kanalFiyatlari.map((k) => (
                <tr key={k.kanal} className="border-t">
                  <td className="py-2 pl-1">{k.kanal}</td>
                  <td className="w-1/2 px-3 max-sm:hidden">
                    <MiniCizgi degerler={k.noktalar} />
                  </td>
                  <td className="text-right tabular-nums">{bicim.para(k.ortalama, para)}</td>
                  <td className="pr-1 text-right font-semibold tabular-nums">{bicim.para(k.son, para)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/** KÂR RAPORU — Algoritmo «Profit» listesinin bizim merdivenimiz. Ara toplamlar gri satır. */
export async function KarMerdiveni({ a, para }: { a: KartAnalizi; para: string }) {
  const t = await getTranslations("UrunKarti");
  const bicim = await bicimlendirici();
  const m = a.merdiven;
  if (m === null) return null;
  const yuzde = (n: number) => (m.ciro > 0 ? `%${bicim.sayi(Math.round((n / m.ciro) * 1000) / 10)}` : "");
  const satirlar: { ad: string; deger: string; yuzde?: string; ara?: boolean; eksi?: boolean; renk?: string }[] = [
    /* Satılan adet (dönem) üstteki göstergede — merdivende tekrar edilmez. */
    { ad: t("merdivenIptal"), deger: bicim.sayi(a.iptalAdet) },
    { ad: t("merdivenIade"), deger: bicim.sayi(a.iadeAdet) },
    { ad: t("merdivenCiro"), deger: bicim.para(m.ciro, para), ara: true },
    { ad: t("merdivenMaliyet"), deger: bicim.para(-m.maliyet, para), yuzde: yuzde(m.maliyet), eksi: true },
    { ad: t("merdivenKesinti"), deger: bicim.para(-m.kesinti, para), yuzde: yuzde(m.kesinti), eksi: true },
    { ad: t("merdivenNet1"), deger: bicim.para(m.net1, para), yuzde: yuzde(m.net1), ara: true, renk: DURUM_YAZISI[karDurumu(m.net1)] },
    { ad: t("merdivenKdv"), deger: bicim.para(-m.kdv, para), yuzde: yuzde(m.kdv), eksi: m.kdv > 0 },
    { ad: t("merdivenNet2"), deger: bicim.para(m.net2, para), yuzde: yuzde(m.net2), ara: true, renk: DURUM_YAZISI[karDurumu(m.net2)] },
    { ad: t("merdivenNet2Adet"), deger: a.adet > 0 && m.dahilKalem > 0 ? bicim.para(m.net2 / Math.max(1, a.adet), para) : "?" },
  ];
  return (
    <section className="max-w-3xl space-y-2 rounded-lg border p-4">
      <h2 className="text-base font-semibold">{t("merdivenBaslik")}</h2>
      {m.dahilKalem === 0 ? (
        <p className="text-muted-foreground text-sm">{t("merdivenBos")}</p>
      ) : (
        <dl className="divide-y text-sm">
          {satirlar.map((s) => (
            <div key={s.ad} className={`grid grid-cols-[1fr_auto_8rem] items-center gap-3 px-2 py-2.5 ${s.ara ? "bg-[var(--se-baslik)] font-semibold" : ""}`}>
              <dt>{s.ad}</dt>
              <dd className="text-muted-foreground text-xs tabular-nums">{s.yuzde ?? ""}</dd>
              <dd className={`text-right tabular-nums ${s.renk ?? (s.eksi ? DURUM_YAZISI.olumsuz : "")}`}>{s.deger}</dd>
            </div>
          ))}
        </dl>
      )}
      {m.haricKalem > 0 ? <p className="text-muted-foreground text-xs">{t("merdivenHaric", { sayi: m.haricKalem })}</p> : null}
      <p className="text-muted-foreground text-xs">{t("merdivenNot")}</p>
    </section>
  );
}

/** SİPARİŞLER — dönemdeki satırlar + toplam (İlke #15: toplam DÖNEMİN tamamı). */
export async function SiparisSekmesi({
  a,
  para,
  karGorunur,
  satisAdresi,
}: {
  a: KartAnalizi;
  para: string;
  karGorunur: boolean;
  satisAdresi: string;
}) {
  const t = await getTranslations("UrunKarti");
  const bicim = await bicimlendirici();
  const tp = a.siparisToplam;
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {t("siparisBaslik")} <span className="text-muted-foreground text-sm font-normal">· {t("siparisSayisi", { sayi: tp.satir })}</span>
        </h2>
        <Baglanti href={satisAdresi}>{t("satislardaAc")}</Baglanti>
      </div>
      {tp.satir === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">{t("siparisBos")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="py-2 pl-2 text-left font-medium">{t("sutunSiparis")}</th>
                <th className="py-2 text-left font-medium">{t("sutunTarih")}</th>
                <th className="py-2 text-left font-medium">{t("sutunKanal")}</th>
                <th className="py-2 text-right font-medium">{t("sutunAdet")}</th>
                <th className="py-2 text-right font-medium">{t("sutunBirim")}</th>
                <th className="py-2 text-right font-medium">{t("sutunCiro")}</th>
                {karGorunur ? <th className="py-2 pr-2 text-right font-medium">{t("sutunNet2")}</th> : null}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[var(--se-baslik)] font-semibold">
                <td className="py-2 pl-2" colSpan={3}>
                  {t("toplam")}
                </td>
                <td className="text-right tabular-nums">{bicim.sayi(tp.adet)}</td>
                <td />
                <td className="text-right tabular-nums">{bicim.para(tp.ciro, para)}</td>
                {karGorunur ? (
                  <td className={`pr-2 text-right tabular-nums ${tp.net2 === null ? "" : DURUM_YAZISI[karDurumu(tp.net2)]}`}>
                    {tp.net2 === null ? "?" : bicim.para(tp.net2, para)}
                    {tp.net2Haric > 0 ? <div className="text-muted-foreground text-[11px] font-normal">{t("net2Eksik", { sayi: tp.net2Haric })}</div> : null}
                  </td>
                ) : null}
              </tr>
              {a.siparisler.map((s, i) => (
                <tr key={`${s.saleId}-${i}`} className="border-t">
                  <td className="py-2 pl-2">
                    <Baglanti href={`/satislar/${s.saleId}`}>{s.kod ?? "—"}</Baglanti>
                  </td>
                  <td className="tabular-nums">{bicim.tarih(s.an)}</td>
                  <td>
                    {s.kanal}
                    <div className="text-muted-foreground text-xs">{s.hesap}</div>
                  </td>
                  <td className="text-right tabular-nums">{bicim.sayi(s.adet)}</td>
                  <td className="text-right tabular-nums">{bicim.para(s.birim, para)}</td>
                  <td className="text-right tabular-nums">{bicim.para(s.ciro, para)}</td>
                  {karGorunur ? (
                    <td className={`pr-2 text-right tabular-nums ${s.net2 === null ? "" : DURUM_YAZISI[karDurumu(s.net2)]}`}>
                      {s.net2 === null ? "?" : bicim.para(s.net2, para)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tp.satir > SIPARIS_SATIR_TAVANI ? <p className="text-muted-foreground text-xs">{t("siparisTavan", { tavan: SIPARIS_SATIR_TAVANI })}</p> : null}
    </section>
  );
}

/** VARYANTLAR — aynı ürünün varyantları, dönem satışı + eldeki; toplam satırı. */
export async function VaryantSekmesi({
  a,
  para,
  karGorunur,
  temelSorgu,
}: {
  a: KartAnalizi;
  para: string;
  karGorunur: boolean;
  temelSorgu: string;
}) {
  const t = await getTranslations("UrunKarti");
  const bicim = await bicimlendirici();
  const toplam = a.varyantlar.reduce(
    (s, v) => ({ eldeki: s.eldeki + v.eldeki, adet: s.adet + v.adet, ciro: s.ciro + v.ciro, net2: s.net2 + (v.net2 ?? 0), haric: s.haric + v.net2Haric }),
    { eldeki: 0, adet: 0, ciro: 0, net2: 0, haric: 0 },
  );
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-base font-semibold">{t("varyantBaslik")}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs">
              <th className="py-2 pl-2 text-left font-medium">{t("sutunVaryant")}</th>
              <th className="py-2 text-right font-medium">{t("sutunEldeki")}</th>
              <th className="py-2 text-right font-medium">{t("sutunAdet")}</th>
              <th className="py-2 text-right font-medium">{t("sutunCiro")}</th>
              {karGorunur ? <th className="py-2 pr-2 text-right font-medium">{t("sutunNet2")}</th> : null}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[var(--se-baslik)] font-semibold">
              <td className="py-2 pl-2">{t("toplam")}</td>
              <td className="text-right tabular-nums">{bicim.sayi(toplam.eldeki)}</td>
              <td className="text-right tabular-nums">{bicim.sayi(toplam.adet)}</td>
              <td className="text-right tabular-nums">{bicim.para(toplam.ciro, para)}</td>
              {karGorunur ? (
                <td className={`pr-2 text-right tabular-nums ${DURUM_YAZISI[karDurumu(toplam.net2)]}`}>
                  {bicim.para(toplam.net2, para)}
                  {toplam.haric > 0 ? <div className="text-muted-foreground text-[11px] font-normal">{t("net2Eksik", { sayi: toplam.haric })}</div> : null}
                </td>
              ) : null}
            </tr>
            {a.varyantlar.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="py-2 pl-2">
                  <div className="flex items-center gap-3">
                    {v.resim ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.resim} alt="" loading="lazy" className="size-10 shrink-0 rounded border bg-white object-contain" />
                    ) : (
                      <span className="size-10 shrink-0 rounded border" />
                    )}
                    <div className="min-w-0">
                      {v.buMu ? (
                        <span className="font-medium">{v.ad ?? v.sku}</span>
                      ) : (
                        <Baglanti href={`/kart/${v.id}${temelSorgu}`}>{v.ad ?? v.sku}</Baglanti>
                      )}
                      <div className="text-muted-foreground text-xs">
                        {v.sku}
                        {v.barkod ? ` · ${v.barkod}` : ""}
                        {v.buMu ? ` · ${t("buVaryant")}` : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="text-right tabular-nums">{bicim.sayi(v.eldeki)}</td>
                <td className="text-right tabular-nums">{bicim.sayi(v.adet)}</td>
                <td className="text-right tabular-nums">{bicim.para(v.ciro, para)}</td>
                {karGorunur ? (
                  <td className={`pr-2 text-right tabular-nums ${v.net2 === null ? "" : DURUM_YAZISI[karDurumu(v.net2)]}`}>
                    {v.net2 === null ? "?" : bicim.para(v.net2, para)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** İADELER — günlük iade adedi + kutular (risk bölümü sayfada ardından gelir). */
export async function IadeSekmesi({ a, para }: { a: KartAnalizi; para: string }) {
  const t = await getTranslations("UrunKarti");
  const bicim = await bicimlendirici();
  const kisa = (gun: string) => {
    const d = gunMetninden(gun);
    return d ? bicim.tarih(d).slice(0, 5) : gun;
  };
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-base font-semibold">{t("iadeBaslik")}</h2>
      {a.iadeAdet === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">{t("iadeBos")}</p>
      ) : (
        <StokFiyatGrafigi
          noktalar={a.gunluk.map((n) => ({ gun: n.gun, stok: n.iade, fiyat: null }))}
          adlar={{ stok: t("iadeGrafikSeri"), fiyat: null }}
          bicimlePara={(n) => bicim.para(Math.round(n), para)}
          bicimleGun={kisa}
          bosMesaj={t("iadeBos")}
        />
      )}
      {/* K330 — iade adedi/oranı üstteki «İadeler» kutusunda; burada tekrar edilmez. */}
    </section>
  );
}
