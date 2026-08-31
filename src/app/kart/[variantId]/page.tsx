import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, Calculator, Layers, Lock, PackageSearch, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Button } from "@/components/ui/button";
import { bicimlendirici } from "@/lib/bicim";
import { partiToplami, siradakiPartiSirasi } from "@/lib/kart-partileri";
import { iadeGerekceEtiketleri, stokHareketEtiketleri } from "@/lib/etiketler";
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
      <div
        className={`truncate text-lg font-semibold tabular-nums ${vurgu ?? ""}`}
      >
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

import { kayitsizSatisKanallari } from "@/lib/fiyatlama/kart-verisi";
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
  /** Parti kaynağı alıma bağlı değilse ekran hareketin ADINI yazar. */
  const hareketEtiketleri = await stokHareketEtiketleri();
  // İade sebebi etiketleri sözlükten — ham enum adı ekrana yazılmaz.
  const gerekceEtiketleri = await iadeGerekceEtiketleri();

  const { ozet, varyant } = veri;
  const para = veri.paraBirimi ?? "TRY";

  /**
   * SİMÜLASYON ZEMİNİ — kanal başına dilimler, pencere ve kanal kuralları.
   * Kâr izni yoksa hiç toplanmıyor: NET üretmeyen bir ekrana NET girdisi
   * hazırlamak boş sorgu olurdu.
   */
  const zeminler = karGorunur
    ? await simulasyonZeminleri(variantId, new Date())
    : [];
  /**
   * Kaydı olmayan satış kanalları — kâr izni yoksa hiç sorulmaz
   * (bölüm zaten çizilmiyor, boşuna sorgu atmayalım).
   */
  const kayitsizKanallar = karGorunur
    ? await kayitsizSatisKanallari(variantId)
    : [];
  const kdvOrani = karGorunur ? await varyantKdvOrani(variantId) : 20;

  /** Para biçimi — değer null ise "?" kalır, sıfıra çevrilmez. */
  const p = (deger: number | null, birim = para) =>
    deger === null ? null : bicim.para(deger, birim);

  /**
   * PARTİ TOPLAMLARI (İlke #15 — tek tek gösterilen yerde toplam da olur).
   * ⭐ KURAL SAF GÖVDEDE: `partiToplami` çağrılıyor, burada elle toplanmıyor.
   * Böylece bekçi kaynağı taramak yerine gövdeyi ÇAĞIRIP değerini ölçer.
   */
  const partiOzeti = partiToplami(veri.partiler, para);
  const siradaki = siradakiPartiSirasi(veri.partiler.length);


  return (
    /*
      ═══ İKİ SÜTUN — YALNIZ GENİŞ EKRANDA (K103, 30.08.2026) ═══
      ⛔ KULLANICI BULGUSU: masaüstünde kartın sağı TAMAMEN boştu ve fiyat
      denemesi için aşağı kaydırmak gerekiyordu. Oysa iki blok BİRLİKTE
      okunur: solda "bu ürün ne kazandırdı", sağda "bu fiyattan ne
      kazandırır". _(İlke #12: ekranda boşluk bilgi taşımaz.)_

      ⚠ AYRIM `xl:` — ALTINDA TEK SÜTUN. Telefon ve tablette kart tek
      sütun kalır ve blokların bugünkü SIRASI korunur; depoda birincil
      cihaz telefon (İlke #8). Erken bir kırılım (`lg:`) 1024 px'lik bir
      tablette iki sütunu 500 px'e sıkıştırır ve ikisini de okunmaz yapardı.

      ⛔ YAPIŞKAN (`sticky`) YAPILMADI — VE BU ÖLÇÜLDÜ. `FiyatDene` KANAL
      BAŞINA bir kart çiziyor, yani yüksekliği kanal sayısıyla büyüyor ve
      ekranı aşabiliyor. Ekranı aşan yapışkan bir blok kendi içinde ikinci
      bir kaydırma ister — faydadan çok yük olurdu.
    */
    <div className="mx-auto max-w-3xl xl:max-w-6xl">
      {/*
        ═══ KÜNYE IZGARANIN ÜSTÜNDE, TAM GENİŞLİKTE (K103-②) ═══
        ⛔ KULLANICI BULGUSU 30.08.2026: künye sol sütunun İÇİNDEYKEN sağdaki
        "Fiyat dene" kartı sayfanın EN TEPESİNDEN başlıyor, soldaki ilk kart
        (Stok kutuları) ise künyenin altından — iki sütun aynı hizada
        başlamıyordu ve göz kayıyordu.

        Künye zaten SAYFA DÜZEYİNDE bir başlık (ürün adı · kodlar · KDV
        künyesi); bir sütunun içeriği değil. Dışarı alınınca iki sütun da
        AYNI ÇİZGİDEN başlıyor. Alt eylemler ve SKU satırı da aynı gerekçeyle
        ızgaranın dışında (İlke #10).
      */}
      <div className="mb-6">
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
          <KopyalanabilirKod
            deger={varyant.companySku}
            etiket={t("firmaSku")}
          />
          {varyant.barcode ? (
            <KopyalanabilirKod deger={varyant.barcode} etiket={t("barkod")} />
          ) : null}
        </div>

        {/*
          ═══ ÜRÜN KÜNYESİ — KDV · KATEGORİ · DESİ (24.08.2026) ═══

          Kullanıcı: _"bunlar sadece ürün sayfasında var; karta eklersen iş
          hallolur."_

          ⚠ KART OKUMA YÜZEYİ, SAYFA EYLEM YÜZEYİ. Üçü de BİLGİ olarak
          giriyor; "Alım gir / Düzenle / Sil" karta GİRMEDİ ve girmeyecek —
          bekçi bunu koşulur hâlde tutuyor. Karttan sayfaya tek SESSİZ
          bağlantı var, düğme değil.

          ⚠ KDV ORANININ YANINDA KAYNAĞI DA YAZIYOR. Çıplak "%20" hangi
          halkadan geldiğini söylemez; kullanıcı ürüne istisna mı girilmiş,
          kategoriden mi geliyor, yoksa varsayılana mı düşmüş — bunu
          bilmeden oranı düzeltemez. (Anayasa: metin, sayının gerçekten
          ölçtüğü şeyi söyler.)

          ⚠ RENK NÖTR: bunlar hüküm değil künye. Yeşil/kırmızı bir şey
          iddia ederdi.
        */}
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span>
            {t("kdvSatiri", {
              oran: bicim.sayi(kdvOrani),
              kaynak: t(`kdvKaynak${veri.kdvKaynagi}`),
            })}
          </span>
          <span aria-hidden>·</span>
          <span>
            {veri.kategoriAdi
              ? t("kategoriSatiri", { ad: veri.kategoriAdi })
              : t("kategoriYok")}
          </span>
          <span aria-hidden>·</span>
          <span>
            {veri.desi === null
              ? t("desiYok")
              : t("desiSatiri", { desi: bicim.sayi(veri.desi) })}
          </span>
          <span aria-hidden>·</span>
          {/* Tek sessiz bağlantı: eylemler ürün sayfasında. */}
          <Baglanti href={`/urunler/${veri.urunId}`}>
            {t("urunSayfasi")}
          </Baglanti>
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] xl:items-start xl:gap-6">
      <div className="space-y-6">
      {/* ═══════════════════ STOK — HERKESE AÇIK ═══════════════════ */}
      <Bolum baslik={t("stokBaslik")} ikon={Boxes}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Kutu etiket={t("eldeki")} deger={String(veri.eldekiAdet)} />
          <Kutu
            etiket={t("yas")}
            deger={
              veri.yasGun === null ? null : t("gun", { sayi: veri.yasGun })
            }
            not={veri.yasGun === null ? t("stokYok") : undefined}
            /* Yaş bandı sistem renginden okunur: 61+ gün kırmızı, 31+ amber. */
            vurgu={
              veri.yasBandi === null
                ? ""
                : DURUM_YAZISI[YAS_BANDI_RENGI[veri.yasBandi]]
            }
          />
          <Kutu
            etiket={t("raf")}
            deger={veri.rafKodu}
            not={veri.rafKodu === null ? t("rafYok") : undefined}
          />
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
                    t("girisTarihi", {
                      tarih: bicim.tarih(veri.sonAlimTarihi),
                    }),
                    veri.sonAlimTedarikcisi ?? t("tedarikciKayitsiz"),
                    veri.sonAlimKodu,
                    /**
                     * ⚠ TÜKENMİŞ PARTİ SESSİZ KALMAZ (kullanıcı 21.08.2026).
                     * Eskiden stok bitince bu kutu "alım yok" derdi — alım
                     * VARDI, stok yoktu. Rakam artık geliyor; ama çerçevesiz
                     * gelseydi bu sefer ters yönde yanlış olurdu: mal elde
                     * sanılırdı. Rakam da, tükendiği de yazıyor.
                     */
                    veri.sonAlimAcikMi ? null : t("partiTukendi"),
                  ]
                    .filter(Boolean)
                    .join(" · ")
            }
          />
          <Kutu
            etiket={t("ortalamaMaliyet")}
            deger={p(ozet.ortalamaMaliyet)}
            not={
              ozet.ortalamaMaliyet === null ? t("maliyetBilinmiyor") : undefined
            }
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

      {/* ═══════════ AÇIK PARTİLER — MALİYETİN KAYNAĞI ═══════════ */}
      {/**
        * ⛔ NİYE VAR: üstteki kutuda "maliyet ₺X" yazıyordu ve o X'in NEREDEN
        * geldiği hiçbir ekranda görünmüyordu. Kullanıcı 31.08.2026'da iki
        * farklı fiyata aldığı bir üründe satış formunda parti seçici görmedi
        * ve sistemi bozuk sandı; cevap doğruydu (tek parti açıktı) ama ekran
        * onu SÖYLEMİYORDU. _(Anayasa: rakam kaynağına götürür.)_
        */}
      <Bolum baslik={t("partiBaslik")} ikon={Layers}>
        {veri.partiler.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("partiYok")}</p>
        ) : (
          <div className="max-w-3xl space-y-2">
            <ul className="divide-y rounded-lg border">
              {veri.partiler.map((parti, sira) => (
                <li
                  key={parti.hareketId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
                >
                  <span className="font-medium tabular-nums">
                    {bicim.tarih(parti.tarih)}
                  </span>
                  <span className="tabular-nums">
                    {t("partiAdet", { adet: parti.kalanAdet })}
                  </span>
                  <span className="tabular-nums">
                    {parti.birimMaliyet === null
                      ? t("partiMaliyetiBilinmiyor")
                      : p(parti.birimMaliyet, parti.paraBirimi ?? para)}
                  </span>
                  {/**
                    * İlke #4 — kod niteliğindeki değer tek tıkla kopyalanır.
                    * ⚠ KOD YOKSA "BAĞLANAMADI" YAZILMAZ, TİP YAZILIR. Ölçüldü
                    * (31.08.2026): kodsuz 100 partinin 88i `COUNT_CORRECTION`
                    * — 29.08 sayımının fazlaları. Orada bağlanacak bir alım HİÇ
                    * YOK; "bağlanamadı" olmayan bir kusur iddia ederdi.
                    */}
                  {parti.alimKodu === null ? (
                    <span className="text-muted-foreground">
                      {hareketEtiketleri[parti.hareketTipi]}
                    </span>
                  ) : (
                    <KopyalanabilirKod
                      deger={parti.alimKodu}
                      etiket={t("partiAlimKodu")}
                    />
                  )}
                  {/**
                    * SIRADAKİ ROZETİ YALNIZ İLK SATIRDA: liste FIFO sırasında
                    * geliyor, yani bir satış girildiğinde tüketilecek parti bu.
                    * Rozet olmasaydı kullanıcı hangisinin gideceğini ancak
                    * tarihlere bakıp TAHMİN ederdi.
                    */}
                  {sira === siradaki ? (
                    <span className="ml-auto rounded-full border px-2 py-0.5 text-xs">
                      {t("partiSiradaki")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {/**
              * İLKE #15 — tek tek gösterilen yerde toplam da olur.
              * ⚠ TOPLAM YALNIZ ÖLÇÜLEBİLENİ TOPLAR: maliyeti bilinmeyen ya da
              * başka para birimindeki parti tutara GİRMEZ ve kaç tanesinin
              * dışarıda kaldığı YAZAR. Sessizce toplasaydık eksik bir rakam
              * tam görünürdü. _(Anayasa: boş sonuç ile temiz sonuç ayrılır.)_
              */}
            <p className="text-muted-foreground text-sm">
              {t("partiToplami", {
                adet: partiOzeti.adet,
                tutar: p(partiOzeti.tutar, para) ?? "",
              })}
              {partiOzeti.olculemeyen > 0
                ? " · " + t("partiToplamEksik", { adet: partiOzeti.olculemeyen })
                : ""}
            </p>
          </div>
        )}
        {/**
          * K91 DİPNOTU — UYARI ŞERİDİ DEĞİL, KAYIT.
          *
          * ⛔ İKİ ÖLÇÜM BU BİÇİMİ DAYATTI (31.08.2026, canlı):
          *
          * ① SIKLIK — stoklu 231 varyantın 107'sinde (%46,3) yanıyor
          *    (KAYMIS 56 · SUPHELI 51). Turuncu bir uyarı şeridi olarak
          *    çizilseydi kartların yarısında yanardı ve üç gün içinde
          *    okunmaz olurdu. _(Anayasa: sönmeyen uyarı, rozetin tamamına
          *    olan güveni götürür.)_
          *
          * ② KAPATILABİLİRLİK — K91b kapandı: çıkışlarda `purchaseItemId`
          *    SIFIR, yani kalan 739 bağı onaracak bir veri yolu YOK. Bunu
          *    okuyan biri bugün hiçbir şey YAPAMAZ. K49'un ayırt edici
          *    sorusuna göre bu bir GÖREV değil KAYITTIR — ve kayıt, sessiz
          *    bir dipnot olarak ilgili ekranda durur.
          *
          * ⚠ VE CÜMLE ÖLÇTÜĞÜNDEN FAZLASINI İDDİA ETMİYOR: bağ kayması
          * GEÇMİŞ ÇIKIŞLARIN hangi partiden düşüldüğünü etkiler. Yukarıda
          * duran AÇIK partiler ve sıradaki parti bundan etkilenmez — ilk
          * yazımda "yukarıdaki maliyet kesin sayılmaz" diyordu ve bu,
          * ölçümün söylemediği bir şeydi.
          */}
        {veri.bagTanisi === "TEMIZ" ? null : (
          <p className="text-muted-foreground mt-2 text-xs">
            {veri.bagTanisi === "KAYMIS"
              ? t("partiBagiKaymis")
              : t("partiBagiSupheli")}
          </p>
        )}
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
                deger={
                  ozet.sonSatis === null ? null : bicim.tarih(ozet.sonSatis)
                }
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
              {/*
                ═══ KÂR CÜMLESİ SOLDAN SAĞA OKUNUR (K102, 30.08.2026) ═══
                ⛔ KULLANICI BULGUSU: blokta maliyet, NET-2 ve marj vardı,
                **satış fiyatı hiçbir yerde yoktu** — "%6,0 marj" yazıyordu
                ama neyin %6'sı olduğu okunamıyordu. Maliyet ayrı bölümdeydi
                (yukarıda "Maliyet ve hız"), üstelik ORADAKİ maliyet ELDE
                KALAN partilerin ortalaması: satılan malın maliyeti DEĞİL.
                İki rakam yan yana konsa birbirini yalanlardı.

                ⭐ Şimdi dört kutu bir cümle kuruyor ve dördü de AYNI
                paydadan (`hesaplananAdet`) okunuyor:

                    satış fiyatı − maliyet − kesintiler = NET-2
                    marj = NET-2 / satış fiyatı

                ⚠ MALİYET BURADA `satilanBirimMaliyeti` — sermaye veriminin
                de paydası. Hesaplanıyordu ama HİÇBİR EKRANDA GÖSTERİLMİYORDU;
                "0.08x" kutusu paydasını söylemeden duruyordu.
              */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kutu
                  etiket={t("birimSatisFiyati")}
                  deger={p(ozet.birimSatisFiyati)}
                  not={t("birimSatisFiyatiNotu")}
                />
                <Kutu
                  etiket={t("satilanMaliyet")}
                  deger={p(ozet.satilanBirimMaliyeti)}
                  not={
                    ozet.satilanBirimMaliyeti === null
                      ? t("maliyetBilinmiyor")
                      : t("satilanMaliyetNotu")
                  }
                />
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
              </div>

              {/* ── İKİNCİ SIRA: BAĞLAM ─────────────────────────────────
                  ⚠ SATILAN ADET BURAYA GİRDİ (kullanıcı: "satış miktarı yok
                  burda"). "Satış geçmişi" bölümünde duruyordu ama kâr
                  cümlesinin ÖLÇEĞİ o: ₺203,70 birim kâr, 1 adette ₺203,70 —
                  100 adette bambaşka bir iştir. Ölçeksiz birim rakam,
                  kararın büyüklüğünü gizler. */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Kutu
                  etiket={t("satilanAdet")}
                  deger={String(ozet.toplamAdet)}
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
                {/*
                  ⚠ TEK SATIŞTA GÖSTERİLMEZ — VE BU BİR ÖLÇÜM SONUCUDUR.
                  `sonSatisNet2` ile `birimNet2` tek satışlı üründe MATEMATİK
                  OLARAK aynı sayıdır (ikisi de o tek kalemden çıkar); ekran
                  görüntüsünde ikisi de ₺203,70 yazıyordu. Aynı rakamı iki
                  kutuda göstermek, ikinci kutuyu bilgi sanan okura yeni bir
                  şey söylemez — yalnız alanı harcar (İlke #12).
                  Çok satışlı üründe İKİSİ AYRIŞIR (ortalama ↔ son) ve o
                  zaman gerçekten iki ayrı bilgidir; kutu geri gelir.
                */}
                {ozet.tekSatisMi ? null : (
                  <Kutu
                    etiket={t("sonSatisNet")}
                    deger={p(ozet.sonSatisNet2)}
                    vurgu={
                      ozet.sonSatisNet2 === null
                        ? ""
                        : DURUM_YAZISI[karDurumu(ozet.sonSatisNet2)]
                    }
                  />
                )}
              </div>

              {/* TEK SATIŞ UYARISI — marj tek başına yanıltır. */}
              {ozet.tekSatisMi ? (
                <p
                  className={`rounded-md p-2 text-xs ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}
                >
                  {t("tekSatisUyarisi")}
                </p>
              ) : null}

              {/**
               * NET'İN NE OLDUĞU YAZILIR. Kart kalem NET-2'sini gösterir;
               * `/satislar` sipariş NET-2'sini (kargo + hizmet bedeli dahil).
               * Yazılmasaydı iki ekran birbirini sessizce yalanlardı.
               */}
              <p className="text-muted-foreground text-xs">
                {t("netKapsamNotu")}
              </p>
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
            not={ozet.hesaplanamayanKalem > 0 ? t("maliyetsizNotu") : undefined}
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
        <p
          className={`rounded-md p-2 text-xs ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}
        >
          {t("paraKarisikUyarisi")}
        </p>
      ) : null}

      </div>

      {/* ═══════════════════ FİYAT DENE — SAĞ SÜTUN ═══════════════════
          Aşama 1'in kullanıcıya değen yüzü. Kâr izni olmayan rol
          NET göremez; simülasyon da NET üretiyor, aynı izne bağlı.

          ⚠ SAĞ SÜTUN GENİŞ EKRANDA; altında bu blok kartın SONUNDA kalır
          (bugünkü sırası) — `xl:` kırılımının doğal sonucu, ayrıca bir
          sıralama kuralı yazılmıyor. */}
      <div className="mt-6 space-y-6 xl:mt-0">
      {/* ⚠ BAŞLIK BURADA, KARTIN İÇİNDE DEĞİL — sol sütun da bölüm
          başlığıyla başlıyor; kartlar ancak böyle aynı hizada durur. */}
      {karGorunur ? (
        <Bolum baslik={t("fiyatDeneBaslik")} ikon={Calculator}>
        <FiyatDene
          /**
           * Tarih ISO metne çevrilir: istemci bileşenine `Date` geçmek
           * serileştirme sınırında sessizce bozulur.
           */
          zeminler={zeminler.map((z) => ({
            ...z,
            pencereBitis:
              z.pencereBitis === null ? null : z.pencereBitis.toISOString(),
          }))}
          birimMaliyet={ozet.ortalamaMaliyet}
          kdvOrani={kdvOrani}
          paraBirimi={para === "EUR" ? "EUR" : "TRY"}
          baslangicFiyati={null}
          /* Yaş kartın üstündeki kutuyla AYNI kaynaktan — iki yerde iki
             farklı gün sayısı çıkmasın. */
          kayitsizKanallar={kayitsizKanallar}
          eldekiAdet={veri.eldekiAdet}
          yasGun={veri.yasGun}
          yasBandi={veri.yasBandi}
        />
        </Bolum>
      ) : null}
      </div>
      </div>

      {/*
        ⚠ ALT EYLEMLER VE SKU IZGARANIN DIŞINDA — TAM GENİŞLİKTE.
        İlk yazımda sağ sütunun içinde kalmışlardı ve masaüstünde fiyat
        denemesinin ALTINA düşüyorlardı. Bunlar sayfa düzeyinde öğeler;
        her ekranda sayfanın en altındalar (İlke #10, tutarlılık) — bir
        sütunun kuyruğu değiller.
      */}
      <div className="mt-6 space-y-6">
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

      <p className="text-muted-foreground text-xs">
        {ortak("sku")}: {varyant.sku}
      </p>
      </div>
    </div>
  );
}
