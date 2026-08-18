import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, Lock, PackageSearch, TriangleAlert } from "lucide-react";

import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Button } from "@/components/ui/button";
import { bicimlendirici } from "@/lib/bicim";
import { iadeGerekceEtiketleri } from "@/lib/etiketler";
import { sermayeVerimiMetni } from "@/lib/marj-gosterge";
import { DURUM_KUTUSU, DURUM_YAZISI, karDurumu } from "@/lib/renkler";
import { YAS_BANDI_RENGI } from "@/lib/durum-renkleri";
import { kartVerisiniTopla } from "@/lib/urun-karti-verisi";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("urunKarti") };
}

/**
 * ============================================================================
 *  ÜRÜN KÂRLILIK KARTI
 * ----------------------------------------------------------------------------
 *  Mobil öncelikli: mağazada telefonla, tek elle kaydırılarak okunur.
 *  Masaüstünde iki sütuna açılır.
 *
 *  ── KÂR BLOĞU GİZLENMİŞ KUTU DEĞİLDİR ───────────────────────────────────
 *  `satis.kar.gor` yoksa blok HİÇ RENDER EDİLMEZ; CSS ile saklanmaz. Gizli
 *  kutu sunucudan gelen rakamı tarayıcıya taşır — izin ölçütü sunucuda
 *  uygulanır, rakam hiç yola çıkmaz. İzin yüzünden yoksa ekran NEDEN
 *  olmadığını yazar (sessiz boşluk yasağı, İlke #5).
 *
 *  ── BİLİNMEYEN "?" İLE GÖSTERİLİR ───────────────────────────────────────
 *  Hiçbir eksik veri sıfıra çevrilmez. Maliyeti bilinmeyen ürünün sermaye
 *  verimi "0" değil, bilinmiyordur; ikisi karışırsa kârlı ürün zararlı
 *  sanılır.
 * ============================================================================
 */

/** Tek kutucuk. Değer null ise "?" — sıfır yazmaz (İlke: sessiz varsayım yok). */
function Kutu({
  etiket,
  deger,
  not,
  vurgu,
}: {
  etiket: string;
  deger: string | null;
  not?: string;
  vurgu?: string;
}) {
  return (
    <div className="bg-muted/40 min-w-0 rounded-lg border px-3 py-2">
      <div className="text-muted-foreground text-xs">{etiket}</div>
      <div className={`truncate text-lg font-semibold tabular-nums ${vurgu ?? ""}`}>
        {deger ?? "?"}
      </div>
      {not ? <div className="text-muted-foreground text-xs">{not}</div> : null}
    </div>
  );
}

function Bolum({
  baslik,
  ikon: Ikon,
  children,
}: {
  baslik: string;
  ikon?: typeof Boxes;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        {Ikon ? <Ikon className="size-4 shrink-0" /> : null}
        {baslik}
      </h2>
      {children}
    </section>
  );
}

import { FiyatDene } from "./fiyat-dene";
import {
  simulasyonZeminleri,
  varyantKdvOrani,
} from "@/lib/fiyatlama/kart-verisi";

export default async function KartSayfasi({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  await sayfaIzni("urun.gor");
  const karGorunur = await izinVarMi("satis.kar.gor");

  const { variantId } = await params;
  const veri = await kartVerisiniTopla(variantId);
  if (veri === null) notFound();

  const t = await getTranslations("UrunKarti");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();
  // İade sebebi etiketleri sözlükten — ham enum adı ekrana yazılmaz.
  const gerekceEtiketleri = await iadeGerekceEtiketleri();

  const { ozet, varyant } = veri;
  const para = veri.paraBirimi ?? "TRY";

  /**
   * SİMÜLASYON ZEMİNİ — kanal başına dilimler, pencere ve kanal kuralları.
   * Kâr izni yoksa hiç toplanmıyor: NET üretmeyen bir ekrana NET girdisi
   * hazırlamak boş sorgu olurdu.
   */
  const zeminler = karGorunur ? await simulasyonZeminleri(variantId, new Date()) : [];
  const kdvOrani = karGorunur ? await varyantKdvOrani(variantId) : 20;

  /** Para biçimi — değer null ise "?" kalır, sıfıra çevrilmez. */
  const p = (deger: number | null, birim = para) =>
    deger === null ? null : bicim.para(deger, birim);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ═══════════════════ KİMLİK ═══════════════════ */}
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">
          {varyant.urunAdi}
          {varyant.varyantAdi ? ` — ${varyant.varyantAdi}` : ""}
        </h1>
        {varyant.marka ? (
          <p className="text-muted-foreground text-sm">{varyant.marka}</p>
        ) : null}

        {/* İlke #4: her kimlik kodu tek tıkla kopyalanır. */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <KopyalanabilirKod deger={varyant.sku} etiket={t("sku")} />
          <KopyalanabilirKod deger={varyant.companySku} etiket={t("firmaSku")} />
          {varyant.barcode ? (
            <KopyalanabilirKod deger={varyant.barcode} etiket={t("barkod")} />
          ) : null}
        </div>
      </div>

      {/* ═══════════════════ STOK — HERKESE AÇIK ═══════════════════ */}
      <Bolum baslik={t("stokBaslik")} ikon={Boxes}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Kutu etiket={t("eldeki")} deger={String(veri.eldekiAdet)} />
          <Kutu
            etiket={t("yas")}
            deger={veri.yasGun === null ? null : t("gun", { sayi: veri.yasGun })}
            not={veri.yasGun === null ? t("stokYok") : undefined}
            /* Yaş bandı sistem renginden okunur: 61+ gün kırmızı, 31+ amber. */
            vurgu={
              veri.yasBandi === null
                ? ""
                : DURUM_YAZISI[YAS_BANDI_RENGI[veri.yasBandi]]
            }
          />
          <Kutu etiket={t("raf")} deger={veri.rafKodu} not={veri.rafKodu === null ? t("rafYok") : undefined} />
        </div>
      </Bolum>

      {/* ═══════════════════ MALİYET — HERKESE AÇIK ═══════════════════ */}
      <Bolum baslik={t("maliyetBaslik")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Kutu
            etiket={t("sonAlim")}
            deger={p(veri.sonAlimMaliyeti, veri.sonAlimParaBirimi ?? para)}
            /**
             * "GİRİŞ" İBARESİ BİLİNÇLİ: burada yazan tarih malın STOĞA
             * GİRDİĞİ gündür (mal kabul), siparişin verildiği gün değil.
             * İkisi günlerce ayrışabiliyor; etiketsiz tarih kullanıcıyı
             * alım tarihiyle karıştırıyordu.
             *
             * Alım kodu da yazar: aynı gün aynı üründen birden çok alım
             * olabiliyor (ALM-TR-260814-01 ve -02 gibi) ve hangisinin
             * okunduğu ekranda görünmeden doğrulanamaz.
             */
            not={
              veri.sonAlimTarihi === null
                ? t("alimYok")
                : [
                    t("girisTarihi", { tarih: bicim.tarih(veri.sonAlimTarihi) }),
                    veri.sonAlimTedarikcisi ?? t("tedarikciKayitsiz"),
                    veri.sonAlimKodu,
                  ]
                    .filter(Boolean)
                    .join(" · ")
            }
          />
          <Kutu
            etiket={t("ortalamaMaliyet")}
            deger={p(ozet.ortalamaMaliyet)}
            not={ozet.ortalamaMaliyet === null ? t("maliyetBilinmiyor") : undefined}
          />
          <Kutu
            etiket={t("hiz")}
            deger={
              ozet.ortalamaSatisSuresi === null
                ? null
                : t("gun", { sayi: Math.round(ozet.ortalamaSatisSuresi) })
            }
            /* Kaç veriden çıktığı GÖRÜNÜR: 3 satışın ortalaması ile 30'unki
               aynı güveni taşımaz. */
            not={
              ozet.hizOrnekSayisi === 0
                ? t("hizYok")
                : t("hizOrnek", { sayi: ozet.hizOrnekSayisi })
            }
          />
        </div>
      </Bolum>

      {/* ═══════════════════ SATIŞ GEÇMİŞİ — HERKESE AÇIK ═══════════════════ */}
      <Bolum baslik={t("satisBaslik")} ikon={PackageSearch}>
        {ozet.hicSatilmamisMi ? (
          /* Hiç satılmamış: rakam uydurulmaz, durum yazılır. */
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            {t("hicSatilmamis")}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Kutu etiket={t("kacKez")} deger={String(ozet.satisSayisi)} />
              <Kutu etiket={t("toplamAdet")} deger={String(ozet.toplamAdet)} />
              <Kutu
                etiket={t("sonSatis")}
                deger={ozet.sonSatis === null ? null : bicim.tarih(ozet.sonSatis)}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {t("kanallar", { liste: ozet.kanallar.join(" · ") })}
            </p>
          </>
        )}
      </Bolum>

      {/* ═══════════════════ KÂRLILIK — İZNE BAĞLI ═══════════════════
          Blok izinsiz kullanıcıya HİÇ ÇİZİLMEZ; rakam sunucudan çıkmaz. */}
      {karGorunur ? (
        <Bolum baslik={t("karBaslik")}>
          {ozet.hicSatilmamisMi ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              {t("karYokHenuz")}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kutu
                  etiket={t("birimNet")}
                  deger={p(ozet.birimNet2)}
                  vurgu={
                    ozet.birimNet2 === null
                      ? ""
                      : DURUM_YAZISI[karDurumu(ozet.birimNet2)]
                  }
                />
                <Kutu
                  etiket={t("marj")}
                  deger={ozet.marj === null ? null : `%${ozet.marj.toFixed(1)}`}
                />
                <Kutu
                  etiket={t("sermayeVerimi")}
                  deger={
                    /* Biçim ORTAK (lib/marj-gosterge.ts) — satış listesi de
                       aynı metni üretir. */
                    sermayeVerimiMetni(ozet.sermayeVerimi)
                  }
                  not={t("sermayeVerimiNotu")}
                />
                <Kutu
                  etiket={t("sonSatisNet")}
                  deger={p(ozet.sonSatisNet2)}
                  vurgu={
                    ozet.sonSatisNet2 === null
                      ? ""
                      : DURUM_YAZISI[karDurumu(ozet.sonSatisNet2)]
                  }
                />
              </div>

              {/* TEK SATIŞ UYARISI — marj tek başına yanıltır. */}
              {ozet.tekSatisMi ? (
                <p className={`rounded-md p-2 text-xs ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}>
                  {t("tekSatisUyarisi")}
                </p>
              ) : null}

              {/**
               * NET'İN NE OLDUĞU YAZILIR. Kart kalem NET-2'sini gösterir;
               * `/satislar` sipariş NET-2'sini (kargo + hizmet bedeli dahil).
               * Yazılmasaydı iki ekran birbirini sessizce yalanlardı.
               */}
              <p className="text-muted-foreground text-xs">{t("netKapsamNotu")}</p>
            </>
          )}
        </Bolum>
      ) : (
        /* İZİN YOKSA SESSİZ BOŞLUK YOK: neden görünmediği yazar (İlke #5). */
        <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm">
          <Lock className="size-4 shrink-0" />
          {t("karIzinYok")}
        </div>
      )}

      {/* ═══════════════════ RİSK — izne bağlı olanlar ayrı ═══════════════════ */}
      <Bolum baslik={t("riskBaslik")} ikon={TriangleAlert}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Kutu
            etiket={t("iade")}
            deger={
              ozet.iadeSayisi === 0
                ? t("iadeYok")
                : t("iadeVar", { sayi: ozet.iadeSayisi, adet: ozet.iadeAdedi })
            }
            /**
             * SEBEP DE YAZAR: "2 iade" ile "2 iade — çalışmıyor" aynı alım
             * kararını vermez. Sebep müşteri bildiriminden gelir; beyan
             * edilmemişse hiç yazılmaz (uydurulmaz).
             */
            not={
              veri.iadeSebepleri.length === 0
                ? undefined
                : veri.iadeSebepleri
                    .map((s) => `${gerekceEtiketleri[s.sebep]} (${s.sayi})`)
                    .join(" · ")
            }
            vurgu={ozet.iadeSayisi > 0 ? DURUM_YAZISI.olumsuz : ""}
          />
          <Kutu
            etiket={t("maliyetsizGecmis")}
            deger={String(ozet.hesaplanamayanKalem)}
            not={
              ozet.hesaplanamayanKalem > 0 ? t("maliyetsizNotu") : undefined
            }
          />
          {karGorunur ? (
            <Kutu
              etiket={t("zararliSatis")}
              deger={String(ozet.zararliSatis)}
              vurgu={ozet.zararliSatis > 0 ? DURUM_YAZISI.olumsuz : ""}
            />
          ) : null}
        </div>
      </Bolum>

      {/* Para birimi karışıksa kart tek rakam veremez — söylenir. */}
      {veri.paraBirimi === null && !ozet.hicSatilmamisMi ? (
        <p className={`rounded-md p-2 text-xs ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}>
          {t("paraKarisikUyarisi")}
        </p>
      ) : null}

      {/* ═══════════════════ FİYAT DENE ═══════════════════
          Aşama 1'in kullanıcıya değen yüzü. Kâr izni olmayan rol
          NET göremez; simülasyon da NET üretiyor, aynı izne bağlı. */}
      {karGorunur ? (
        <FiyatDene
          /**
           * Tarih ISO metne çevrilir: istemci bileşenine `Date` geçmek
           * serileştirme sınırında sessizce bozulur.
           */
          zeminler={zeminler.map((z) => ({
            ...z,
            pencereBitis: z.pencereBitis === null ? null : z.pencereBitis.toISOString(),
          }))}
          birimMaliyet={ozet.ortalamaMaliyet}
          kdvOrani={kdvOrani}
          paraBirimi={para === "EUR" ? "EUR" : "TRY"}
          baslangicFiyati={null}
          /* Yaş kartın üstündeki kutuyla AYNI kaynaktan — iki yerde iki
             farklı gün sayısı çıkmasın. */
          eldekiAdet={veri.eldekiAdet}
          yasGun={veri.yasGun}
          yasBandi={veri.yasBandi}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" className="h-11">
          <Link href={`/stok/${varyant.id}`}>{t("stokEkrani")}</Link>
        </Button>
        <Button asChild variant="secondary" className="h-11">
          <Link href={`/urunler/${veri.urunId}`}>{t("urunEkrani")}</Link>
        </Button>
        <Button asChild variant="ghost" className="h-11">
          <Link href="/kart">{t("yeniArama")}</Link>
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">{ortak("sku")}: {varyant.sku}</p>
    </div>
  );
}
