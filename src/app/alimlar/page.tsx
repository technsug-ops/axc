import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Eye, Pencil, PackageCheck, Plus } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
import {
  ALIM_EKSENLERI,
  eksenAlani,
  eksenAnahtari,
  otekiEksen,
} from "@/lib/alim-ekseni";
import { AlimIptalButonu } from "./iptal-butonu";
import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { IkiSatir } from "@/components/iki-satir";
import { UzunAd } from "@/components/uzun-ad";
import { kartAdresi } from "@/lib/kart-adresi";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { DurumRozeti } from "@/components/durum-rozeti";
import { ALIM_DURUM_RENGI } from "@/lib/durum-renkleri";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ALIM_DURUMLARI, alimDurumEtiketleri } from "@/lib/etiketler";
import { bicimlendirici } from "@/lib/bicim";
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { alimKosulu } from "@/lib/liste-suzgeci";
import { prisma } from "@/lib/prisma";
import { donusDegeri, donusTasiyan, suzgecAdresi } from "@/lib/suzgec";
import { kalemToplamlari } from "@/lib/tutar";
import { ListeToplami } from "@/components/liste-toplami";
import { SayfalamaCubugu } from "@/components/sayfalama";
import { sayfaCoz } from "@/lib/sayfalama";
import { alimToplamlari } from "@/lib/alim-toplami";
import { ListeyiHatirla } from "@/components/liste-hafizasi-bilesenleri";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("alimlar") };
}

/**
 * Durum doğrulaması artık `lib/liste-suzgeci.ts` içinde: koşulu kuran taraf
 * geçerliliği de kontrol ediyor. İki yerde iki liste tutmak, birine yeni bir
 * durum eklenip ötekinin unutulması demekti.
 */

export default async function AlimlarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    durum?: string;
    pencere?: string;
    baslangic?: string;
    bitis?: string;
    hesap?: string;
    tedarikci?: string;
    kart?: string;
    /** Sayfa numarası (27.08.2026) — `SAYFA_PARAMETRESI` ile aynı ad. */
    sayfa?: string;
    /**
     * K114 — tarih ekseni: `siparis` (varsayılan) | `kabul`.
     *
     * ⚠ Tanınmayan değer VARSAYILANA düşer, boş listeye değil: bozuk bir
     * adres ekranı sessizce boşaltmamalı.
     */
    eksen?: string;
  }>;
}) {
  await sayfaIzni("alim.gor");

  const p = await searchParams;
  const arama = (p.q ?? "").trim();
  const bicim = await bicimlendirici();
  const durumEtiketleri = await alimDurumEtiketleri();
  const t = await getTranslations("Alim");
  const ortak = await getTranslations("Ortak");
  // "+N kalem" cümlesi satış sözlüğünde; aynı cümle iki sözlükte durmasın.
  const tSatis = await getTranslations("Satis");

  // EKRAN VE EXCEL AYNI KOŞULU KULLANIR (bkz. lib/liste-suzgeci.ts).
  const { kosul, pencere, eksen } = await alimKosulu(p);

  // Süzgeç seçenekleri VERİDEN gelir. Alım hesapları ALIŞ rolündedir;
  // satış mağazasını alım süzgecinde listelemek anlamsız olurdu.
  const [hesaplar, tedarikciler, kartlar] = await Promise.all([
    prisma.channelAccount.findMany({
      where: { isActive: true, alisIcin: true },
      select: { id: true, name: true, channel: { select: { name: true } } },
      orderBy: [{ channelId: "asc" }, { name: "asc" }],
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.creditCard.findMany({
      where: { isActive: true },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
  ]);

  /**
   * SAYFALAMA (27.08.2026) — gerekçenin tamamı `/satislar`da yazılı.
   * Ölçüm: sayfalamasız hâlde 1955 alım · 3,0 MB · 1913 ms; veritabanı ise
   * aynı satırları 1 ms'de sayıyor. Yavaş olan veri değil, ekranın satır
   * sayısıyla DOĞRUSAL büyüyen yazılış biçimiydi.
   *
   * ⛔ Toplamlar `lib/alim-toplami.ts`e taşındı ve SÜZGECİN TAMAMINI ölçüyor
   * (İlke #15) — yoksa sayfalama toplamı sayfanın toplamına düşürürdü.
   */
  const toplamVerisi = await alimToplamlari(kosul);
  const sayfalama = sayfaCoz(p.sayfa, toplamVerisi.kayitSayisi);

  const alimlar = await prisma.purchase.findMany({
    where: kosul,
    skip: sayfalama.atla,
    take: sayfalama.boyut,
    include: {
      items: {
        include: {
          // Duzenleme/iptal kurallari icin: mal kabul yapilmis mi?
          stockMovements: { select: { quantityDelta: true } },
          /**
           * ÜRÜN ADI LİSTEDE GÖRÜNÜR (kullanıcı isteği 15.08.2026:
           * "alınan ve kabulü beklenen malların isimleri de yazılsın").
           * "1 kalem" ne alındığını söylemiyordu; mal kabul sırası gelen
           * alımın NE olduğunu görmek için detaya girmek gerekiyordu
           * (İlke #3 ve #9).
           */
          variant: {
            select: {
              name: true,
              sku: true,
              product: { select: { name: true } },
            },
          },
        },
      },
      creditCard: { select: { label: true, last4: true } },
      channelAccount: {
        include: { channel: { select: { name: true } } },
      },
      supplier: { select: { name: true } },
    },
    orderBy: { [eksenAlani(eksen)]: "desc" },
  });

  /** Süzgeç çubuğunun seçenekleri. */
  const suzgecler: SuzgecTanimi[] = [
    /**
     * ⛔ TARİH EKSENİ EN BAŞTA — VE BU BİLİNÇLİ: öteki süzgeçler kümeyi
     * DARALTIYOR, bu ise hangi SORUYA bakıldığını değiştiriyor ("ne aldım"
     * ↔ "ne geldi"). Sonda dursaydı kullanıcı önce boş listeyi görür,
     * sebebini en son bulurdu.
     */
    {
      ad: "eksen",
      etiket: t("eksenEtiketi"),
      secenekler: ALIM_EKSENLERI.map((e) => ({
        deger: e,
        etiket: t(eksenAnahtari(e)),
      })),
    },
    {
      ad: "durum",
      etiket: t("durumFiltresiEtiketi"),
      secenekler: ALIM_DURUMLARI.map((d) => ({
        deger: d,
        etiket: durumEtiketleri[d],
      })),
    },
    {
      ad: "hesap",
      etiket: ortak("kanalHesabi"),
      secenekler: hesaplar.map((h) => ({
        deger: h.id,
        etiket: hesapEtiketi(h.channel.name, h.name),
      })),
    },
    {
      ad: "tedarikci",
      etiket: t("tedarikci"),
      secenekler: tedarikciler.map((s) => ({ deger: s.id, etiket: s.name })),
    },
    {
      ad: "kart",
      etiket: t("kart"),
      secenekler: kartlar.map((k) => ({ deger: k.id, etiket: k.label })),
    },
  ];

  /** Arama formu ve Excel TEK KAYNAKTAN beslenir. */
  const formTasinanlar: Record<string, string | undefined> = {
    durum: p.durum,
    hesap: p.hesap,
    tedarikci: p.tedarikci,
    kart: p.kart,
    pencere: p.pencere,
    baslangic: p.baslangic,
    bitis: p.bitis,
    eksen: p.eksen,
  };
  const disaAktarmaParametreleri = { ...formTasinanlar, q: arama };

  const suzgecVar =
    arama !== "" || Object.values(formTasinanlar).some((d) => (d ?? "") !== "");

  /**
   * BOŞ SONUCUN AÇIKLAMASI — ÖTEKİ EKSENDE KAÇ KAYIT VAR (K114).
   *
   * ⛔ YALNIZ LİSTE BOŞKEN ÖLÇÜLÜR. Her açılışta iki ek sorgu koşturmak,
   * hiç görülmeyecek bir cümle için bedel ödemek olurdu — `/stok`taki yaş
   * süzgeciyle aynı kalıp ("süzgeç kapalıyken hiçbir ek sorgu koşmuyor").
   *
   * ⚠ ÖTEKİ EKSEN AYNI PENCEREYLE ÖLÇÜLÜR: pencere değiştirilseydi rakam
   * başka bir soruyu cevaplar ve kullanıcıyı yanlış yere gönderirdi.
   * Değişen TEK ŞEY tarih alanı — kıyasın iki tarafı aynı kümeden.
   */
  const eksenSayilari =
    alimlar.length === 0
      ? await (async () => {
          const oteki = otekiEksen(eksen);
          const otekiKosul = {
            ...kosul,
            /** Aktif eksenin tarih koşulu kaldırılır, ötekininki konur. */
            [eksenAlani(eksen)]: undefined,
            ...(pencere.aralik ? { [eksenAlani(oteki)]: pencere.aralik } : {}),
          };
          const [otekiSayi, kabulsuz] = await Promise.all([
            prisma.purchase.count({ where: otekiKosul }),
            /**
             * ⚠ Mal kabul tarihi OLMAYAN alım sayısı — kabul ekseninde
             * hiçbir pencerede görünmez. Ölçüldü (01.09.2026): 1990 alımın
             * 31'i (%1,6). Pencere UYGULANMAZ: bu kayıtların kabul tarihi
             * YOK, dolayısıyla hiçbir pencereye ait değiller.
             */
            prisma.purchase.count({ where: { receivedAt: null } }),
          ]);
          return {
            oteki: otekiSayi,
            kabulsuz,
            /** ⛔ ADRES EKRANDA KURULMAZ — mevcut süzgeçler korunur. */
            otekiAdres: suzgecAdresi("/alimlar", disaAktarmaParametreleri, {
              eksen: oteki,
            }),
          };
        })()
      : null;


  /** Seçili dönemin gerçek karşılığı — /iadeler ve /satislar ile aynı biçim. */
  const aralikMetni = pencere.pencere
    ? `${bicim.tarih(pencere.pencere.baslangic)} — ${bicim.tarih(pencere.pencere.sonGun)}`
    : "";

  /**
   * Satırda "ne alındı" özeti: tek kalemse ürün adı, çoksa "+N kalem".
   * `/satislar`daki `urunOzeti` ile AYNI kalıp — aynı bilgi iki ekranda
   * aynı biçimde görünsün (İlke #10). Sözlük anahtarı da oradan okunuyor;
   * aynı cümleyi ikinci bir sözlüğe kopyalamak, birini değiştirip diğerini
   * unutmanın davetiyesidir.
   */
  function urunOzeti(alim: (typeof alimlar)[number]) {
    if (alim.items.length === 0) return "—";
    const ilk = alim.items[0];
    const ad = ilk.variant.name
      ? `${ilk.variant.product.name} — ${ilk.variant.name}`
      : ilk.variant.product.name;
    if (alim.items.length === 1) return ad;
    return tSatis("digerKalemler", { urun: ad, sayi: alim.items.length - 1 });
  }

  /**
   * SİPARİŞ EDİLEN TOPLAM ADET — kullanıcı isteği 21.08.2026.
   *
   * ⚠ KALEM SAYISI İLE AYNI ŞEY DEĞİL: "1 kalem" bir ürün satırı demek,
   * o satır 5 adet olabilir. Listede yalnız kalem sayısı vardı ve "kaç
   * tane sipariş ettim" sorusu detaya girmeden cevaplanamıyordu (İlke #9).
   */
  function toplamAdet(alim: (typeof alimlar)[number]) {
    return alim.items.reduce((t, k) => t + k.quantity, 0);
  }

  function toplamMetni(alim: (typeof alimlar)[number]) {
    const toplamlar = kalemToplamlari(alim.items);
    if (!toplamlar.length) return "—";
    return toplamlar.map((t) => bicim.para(t.tutar, t.paraBirimi)).join(" + ");
  }

  /**
   * SÜZGECİN TOPLAMI (İlke #15). Satır satır gösterilen tutarın toplamı da
   * ekranda durur — kullanıcı KDV dengesi için aylık alımı takip ediyor ve
   * bu rakamı satırlardan kafadan topluyordu.
   *
   * İPTALLER TOPLAMA GİRMEZ: iptal edilmiş alım gerçekleşmiş bir alış
   * değildir, matraha yazılamaz. Ama sessizce düşülmez — ayrı kutuda görünür.
   */
  /**
   * SÜZGEÇ DETAYA GİRİNCE KAYBOLMASIN (kullanıcı 21.08.2026).
   *
   * Listedeki HER bağlantı, o anki süzgeci `donus` olarak yanında taşır;
   * detay ekranının "‹ Alımlar" tuşu onu geri açar. Değer yalnız SORGU
   * dizesidir — yol taşınmaz (bkz. lib/suzgec → geriAdresi).
   */
  const donus = donusDegeri(p);
  const alimAdresi = (id: string, ek = "") =>
    donusTasiyan(`/alimlar/${id}${ek}`, donus);

  /** Hariç yüklemi TEK GÖVDEDE — tutar ve adet kutuları ayrışamaz. */
  const iptalliMi = (a: (typeof alimlar)[number]) => a.status === "CANCELLED";

  /**
   * ⛔ ARTIK VERİTABANINDAN — sayfadan DEĞİL. `alimlar` yalnız 50 satır
   * taşıyor; ondan hesaplasaydık toplam "görünen sayfanın toplamı" olurdu.
   */
  const toplamlar = toplamVerisi.tutar;

  /**
   * ADET TOPLAMI — satır satır adet gösteren listenin toplamı (İlke #15).
   *
   * ⚠ BU BOŞLUĞU KENDİM AÇMIŞTIM: adet sütunu 21.08.2026'da eklendi, toplamı
   * eklenmedi. "Tek tek gösterilen yerde toplam da olur" kuralı sütun
   * eklendiği anda borç doğurmuştu; satış listesindeki aynı iş sırasında
   * fark edildi ve birlikte kapatıldı.
   */
  const adetToplam = toplamVerisi.adet; // veritabanından — bkz. üstteki not

  function eylemler(alim: (typeof alimlar)[number]) {
    const kabulEdilebilir =
      alim.status !== "CANCELLED" && alim.status !== "RECEIVED";
    const malKabulVar = alim.items.some((k) =>
      k.stockMovements.some((h) => h.quantityDelta > 0),
    );
    const iptalli = alim.status === "CANCELLED";
    return (
      <>
        <SatirEylemi
          href={alimAdresi(alim.id)}
          ikon={Eye}
          etiket={ortak("detay")}
        />
        {!iptalli ? (
          <SatirEylemi
            href={alimAdresi(alim.id, "/duzenle")}
            ikon={Pencil}
            etiket={ortak("duzenle")}
          />
        ) : null}
        {!iptalli ? (
          <AlimIptalButonu
            alimId={alim.id}
            kod={alim.code}
            malKabulVar={malKabulVar}
          />
        ) : null}
        {kabulEdilebilir ? (
          <SatirEylemi
            href={alimAdresi(alim.id, "/mal-kabul")}
            ikon={PackageCheck}
            etiket={t("malKabul")}
            birincil
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUZGECLI ADRESI HATIRLAR — hicbir sey CIZMEZ (K104-2).
          Bir kayda girip donen kullanici suzgecini geri bulsun diye.
          Kaydedici olmadan "< Liste" baglantisi duz listeye duser. */}
      <ListeyiHatirla temel="/alimlar" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {ortak("kayitSayisi", { sayi: toplamVerisi.kayitSayisi })}
            {arama ? ortak("aramaEki", { arama }) : ""}
            {aralikMetni ? ` · ${aralikMetni}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* EXCEL EKRANDAKİ SÜZGECİ UYGULAR — aynı koşul kurucusu. */}
          <ExcelIndir liste="alimlar" parametreler={disaAktarmaParametreleri} />
          <Button asChild>
            <Link href="/alimlar/yeni">
              <Plus />
              {t("yeniAlim")}
            </Link>
          </Button>
        </div>
      </div>

      {/* ⚠ ARAMA KUTUSU ORTAK BİLEŞENE ALINDI (23.08.2026). Aynı blok
          altı ekranda kopyalanmıştı ve ALTISINDA DA kamera unutulmuştu —
          oysa anayasa (İlke #7) kod girilen her alanda kamera istiyor.
          Tek gövde: yeni bir liste ekranı kamerayı bedava alır. */}
      <KodAramaKutusu
        temelAdres="/alimlar"
        baslangic={arama}
        tasinanlar={formTasinanlar}
        ipucu={t("aramaIpucu")}
      />

      {/* DURUM SÜZGECİ ARTIK ORTAK ÇUBUKTA: kendi <select>'i vardı, iki
          farklı süzgeç görünümü aynı ekranda duruyordu (İlke #10). */}
      <SuzgecCubugu
        temelAdres="/alimlar"
        mevcut={p}
        suzgecler={suzgecler}
        zaman={{
          secili: pencere.tur,
          aralikMetni,
          baslangic: p.baslangic ?? "",
          bitis: p.bitis ?? "",
        }}
      />

      {/* TOPLAM SÜZGECİN ALTINDA, LİSTENİN ÜSTÜNDE — hangi kümenin toplamı
          olduğu seçili süzgeçle birlikte okunsun (İlke #15). */}
      <ListeToplami
        baslik={t("suzgecToplami")}
        toplamlar={toplamlar.toplam}
        altMetin={`${ortak("kayitSayisi", { sayi: toplamlar.sayi })}${
          aralikMetni ? ` · ${aralikMetni}` : ""
        }`}
        /* ADET SOLDA — satışlar sayfasıyla AYNI yerleşim (İlke #10). */
        oncekiler={[
          {
            etiket: t("adetToplami"),
            deger: bicim.sayi(adetToplam.toplam),
            not:
              adetToplam.haric > 0
                ? t("adetIptalHaric", { sayi: adetToplam.haric })
                : undefined,
          },
        ]}
        haric={{
          etiket: t("iptalHaric", { sayi: toplamlar.haricSayi }),
          toplamlar: toplamlar.haric,
          sayi: toplamlar.haricSayi,
        }}
      />

      {alimlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {suzgecVar ? t("bosFiltreBaslik") : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {suzgecVar ? t("bosFiltreIpucu") : t("bosIpucu")}
          </p>

          {/* ═══ BOŞ SONUÇ KENDİNİ ANLATIR (K114) ═══
              ⛔ "Kayıt yok" tek başına YANLIŞ YÖNE GÖNDERİR. Kullanıcı
              31.08.2026'da tam bunu yaşadı: "bugün teslim aldıklarım
              çıkmıyor" — oysa kayıt VARDI, ekran SİPARİŞ tarihine bakıyordu.

              ⭐ VE EKSENİ ADLANDIRMAK YETMEZ, RAKAM GEREKİR: "öteki eksende
              N kayıt var" cümlesi kullanıcıyı doğrudan çözüme götürür. N
              sıfırsa da bilgidir — o zaman sorun eksen değil, pencere.
              _(Anayasa: sessiz başarısızlık yasak; bir şey olmadıysa NEDEN
              olmadığı ekranda yazar.)_ */}
          {eksenSayilari !== null ? (
            <p className="mt-4 text-sm">
              {t("bosEksenAciklamasi", {
                aktif: t(eksenAnahtari(eksen)),
                oteki: t(eksenAnahtari(otekiEksen(eksen))),
                sayi: eksenSayilari.oteki,
              })}
              {eksenSayilari.oteki > 0 ? (
                <>
                  {" "}
                  <Baglanti href={eksenSayilari.otekiAdres}>
                    {t("bosEksenGecis", {
                      oteki: t(eksenAnahtari(otekiEksen(eksen))),
                    })}
                  </Baglanti>
                </>
              ) : null}
            </p>
          ) : null}

          {/* ⚠ KABUL EKSENİNDE GÖRÜNMEYENLER BEYAN EDİLİR: mal kabulü
              yapılmamış alımın kabul tarihi YOKTUR ve hiçbir pencerede
              çıkmaz. Sessiz kalsaydı "kayboldu" sanılırdı. */}
          {eksen === "kabul" && eksenSayilari !== null && eksenSayilari.kabulsuz > 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">
              {t("bosKabulsuzUyarisi", { sayi: eksenSayilari.kabulsuz })}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* İKİ AYRI KİMLİK, TEK SÜTUN AMA İKİ SATIR (İlke #3 + #9).
                      "Alım Kodu" sistemin ürettiği kayıt numarası, "Sipariş
                      No" tedarikçiye sorun bildirirken söylediğiniz numara.
                      İkisi de listede DURUYOR ve kopyalanabiliyor; 14.08.2026
                      ölçümünde ayrı sütun olmaları tabloyu ekran dışına
                      itiyordu (bkz. components/iki-satir.tsx). */}
                  <TableHead>{t("alimKoduVeSiparis")}</TableHead>
                  <TableHead>{ortak("tarih")}</TableHead>
                  <TableHead>{ortak("kanalHesabi")}</TableHead>
                  <TableHead>{ortak("urun")}</TableHead>
                  {/* ⚠ KART AYRI SÜTUN DEĞİL — 22.08.2026'da tutarın altına
                      indi ve kalem sayısı ürün hücresine geçti. Ölçülen sütun
                      tavanı 7, bu tablo 8'e çıkmıştı.

                      NİYE BU EŞLEŞME: "ne kadar ödedim, hangi kartla" tek
                      soruya iki cevaptır; kalem sayısı ise ürünün yanında,
                      toplam adetle birlikte okunur. Hiçbir bilgi düşmedi —
                      ikisi de kendi doğal komşusuna taşındı. */}
                  <TableHead>{ortak("toplam")}</TableHead>
                  <TableHead>{ortak("durum")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alimlar.map((alim) => (
                  <TableRow key={alim.id}>
                    <TableCell>
                      {/* Kod link olarak zaten yazıyor; yanına sadece
                          kopyala ikonu koyuyoruz, metin tekrarı olmasın. */}
                      <IkiSatir
                        ustIpucu={alim.code}
                        ust={
                          <span className="inline-flex items-center gap-1">
                            <Baglanti href={alimAdresi(alim.id)}>
                              {alim.code}
                            </Baglanti>
                            <KopyalanabilirKod
                              deger={alim.code}
                              etiket={t("alimKodu")}
                              sadeceIkon
                            />
                          </span>
                        }
                        altIpucu={alim.supplierOrderNo ?? undefined}
                        alt={
                          alim.supplierOrderNo ? (
                            <span className="inline-flex items-center gap-1">
                              {alim.supplierOrderNo}
                              <KopyalanabilirKod
                                deger={alim.supplierOrderNo}
                                etiket={ortak("siparisNo")}
                                sadeceIkon
                              />
                            </span>
                          ) : (
                            "—"
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {bicim.tarih(alim.purchasedAt)}
                    </TableCell>
                    <TableCell>
                      {/* Kanal üstte, hesap altta: "Hepsiburada — S.Ahmet"
                          tek satırda 169px yiyordu, iki satırda 94px. */}
                      <IkiSatir
                        enGenis="max-w-[8rem]"
                        ust={alim.channelAccount?.channel.name ?? "—"}
                        alt={alim.channelAccount?.name}
                        ustIpucu={alim.channelAccount?.channel.name}
                        altIpucu={alim.channelAccount?.name}
                      />
                    </TableCell>
                    {/* ÜRÜN — uzun adlar sarmalı, tablo genişlemesin.
                        ⚠ ADET AYRI SÜTUN DEĞİL, ÜRÜNÜN ALTINDA (21.08.2026).
                        Kullanıcı "adet sütunu olsun" dedi; sütun eklendi ve
                        `yerlesim:dogrula` KIRMIZI yandı: masaüstü tablosunun
                        sütun tavanı 7 ve bu sayfa zaten 8'deydi. Bekçinin
                        kendi önerdiği çare uygulandı — ilişkili iki bilgi
                        tek hücrede üst üste (`iki-satir.tsx` deseni).

                        Yeri de doğru: adet, ait olduğu ÜRÜNÜN yanında
                        duruyor. Ayrı sütunda göz ürün ile sayı arasında
                        gidip geliyordu. */}
                    <TableCell className="min-w-0 max-w-[22rem]">
                      <UzunAd
                        metin={urunOzeti(alim)}
                        /* Ürün adı → KÂRLILIK KARTI (İlke #9). Satışlarla
                           AYNI gövdeden; iki ekran ayrışmasın. */
                        href={kartAdresi(alim.items) ?? undefined}
                      />
                      <div className="text-muted-foreground text-xs tabular-nums">
                        {t("toplamAdet", { sayi: toplamAdet(alim) })}
                        {" · "}
                        {t("kalemSayisi", { sayi: alim.items.length })}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {/* Tutar üstte, ÖDENDİĞİ KART altta. Kart etiketi
                          serbest metin ("Şaban Akçalı Bonus") ve 27 karaktere
                          kadar çıkıyor; kesilirse tam hâli ipucunda durur ve
                          son dört hane yanında kalır (İlke #3). */}
                      <IkiSatir
                        enGenis="max-w-[11rem]"
                        ust={toplamMetni(alim)}
                        alt={
                          alim.creditCard
                            ? `${alim.creditCard.label} ••${alim.creditCard.last4}`
                            : undefined
                        }
                        altIpucu={
                          alim.creditCard
                            ? `${alim.creditCard.label} ••${alim.creditCard.last4}`
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <DurumRozeti
                        durum={ALIM_DURUM_RENGI[alim.status]}
                        isaretsiz
                      >
                        {durumEtiketleri[alim.status]}
                      </DurumRozeti>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <SatirEylemleri>{eylemler(alim)}</SatirEylemleri>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {alimlar.map((alim) => (
              <ListeKarti
                key={alim.id}
                baslik={
                  <span className="inline-flex items-center gap-1">
                    <Baglanti href={alimAdresi(alim.id)}>{alim.code}</Baglanti>
                    <KopyalanabilirKod
                      deger={alim.code}
                      etiket={t("alimKodu")}
                      sadeceIkon
                    />
                  </span>
                }
                alanlar={[
                  // İlke #3, mobil öncelik: sipariş no tarihten ÖNCE gelir —
                  // telefonda kaydı bulmak için bakılan ilk şey odur.
                  ...(alim.supplierOrderNo
                    ? [
                        {
                          etiket: ortak("siparisNo"),
                          deger: (
                            <span className="inline-flex items-center gap-1">
                              {alim.supplierOrderNo}
                              <KopyalanabilirKod
                                deger={alim.supplierOrderNo}
                                etiket={ortak("siparisNo")}
                                sadeceIkon
                              />
                            </span>
                          ),
                        },
                      ]
                    : []),
                  {
                    etiket: ortak("tarih"),
                    deger: bicim.tarih(alim.purchasedAt),
                  },
                  {
                    etiket: ortak("durum"),
                    deger: (
                      <DurumRozeti
                        durum={ALIM_DURUM_RENGI[alim.status]}
                        isaretsiz
                      >
                        {durumEtiketleri[alim.status]}
                      </DurumRozeti>
                    ),
                  },
                  /* ÜRÜN TELEFONDA DA GÖRÜNÜR (İlke #8, #3). Mobilde
                     öncelik sırası ad > kod olduğu için kalem sayısından
                     ÖNCE geliyor: "ne alındı" sorusu "kaç kalem"den
                     önemlidir. */
                  {
                    etiket: ortak("urun"),
                    /*
                      ⚠ MOBİLDE DE KÂRLILIK KARTINA GİDER (24.08.2026).
                      Tabloda bağlıydı, mobilde DÜZ METİNDİ — aynı bilgi
                      iki ekranda iki farklı şey yapıyordu (İlke #10) ve
                      telefonda karta erişimin başka yolu yoktu.
                    */
                    deger: (() => {
                      const adres = kartAdresi(alim.items);
                      return adres ? (
                        <Baglanti href={adres}>{urunOzeti(alim)}</Baglanti>
                      ) : (
                        urunOzeti(alim)
                      );
                    })(),
                  },
                  /* MOBİLDE DE VAR (İlke #8): adet kalem sayısından ÖNCE —
                     "kaç tane" sorusu "kaç satır"dan sık sorulur. */
                  { etiket: ortak("adet"), deger: toplamAdet(alim) },
                  { etiket: ortak("kalem"), deger: alim.items.length },
                  { etiket: ortak("toplam"), deger: toplamMetni(alim) },
                  {
                    etiket: ortak("kanalHesabi"),
                    deger: alim.channelAccount
                      ? `${alim.channelAccount.channel.name} — ${alim.channelAccount.name}`
                      : "—",
                  },
                  {
                    etiket: ortak("kart"),
                    deger: alim.creditCard
                      ? `${alim.creditCard.label} (••${alim.creditCard.last4})`
                      : "—",
                  },
                ]}
                eylemler={eylemler(alim)}
              />
            ))}
          </div>

          {/* ⚠ SÜZGEÇLER TAŞINIR: taşınmazsa "2. sayfa" tıklaması süzgeci
              sessizce sıfırlar ve kullanıcı başka bir listeye düşer. */}
          <SayfalamaCubugu
            sayfalama={sayfalama}
            yol="/alimlar"
            parametreler={{
              q: p.q,
              durum: p.durum,
              pencere: p.pencere,
              baslangic: p.baslangic,
              bitis: p.bitis,
              hesap: p.hesap,
              tedarikci: p.tedarikci,
              kart: p.kart,
            }}
          />
        </>
      )}
    </div>
  );
}
