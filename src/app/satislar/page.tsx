import { getTranslations } from "next-intl/server";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { supheliVeriBulgusu } from "@/lib/uyari/faz2-veri";
import { DogrulaButonu } from "./dogrula-butonu";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Eye, Plus, TriangleAlert, Undo2 } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
import { Baglanti } from "@/components/baglanti";
import { DurumRozeti } from "@/components/durum-rozeti";
import { DURUM_KUTUSU, DURUM_SERIDI, DURUM_YAZISI, karDurumu } from "@/lib/renkler";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { IkiSatir } from "@/components/iki-satir";
import { KargoDurumu } from "./kargo-durumu";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { UzunAd } from "@/components/uzun-ad";
import { NetKar } from "@/components/net-kar";
import { MarjRozeti } from "@/components/marj-rozeti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { gunMetni } from "@/lib/donem";
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { satisKosulu } from "@/lib/liste-suzgeci";
import { prisma } from "@/lib/prisma";
import { suzgecAdresi } from "@/lib/suzgec";
import { satisKalemToplamlari } from "@/lib/tutar";
import { hesaplananToplami, suzgecToplami } from "@/lib/liste-toplami";
import { Suspense } from "react";

import { MarjTercihi } from "./marj-tercihi";
import { ListeToplami } from "@/components/liste-toplami";
import {
  MARJ_OLCULERI,
  VARSAYILAN_OLCU,
  olcuGecerliMi,
  satirGostergesi,
  type MarjOlcusu,
} from "@/lib/marj-gosterge";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("satislar") };
}

export default async function SatislarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kar?: string;
    pencere?: string;
    baslangic?: string;
    bitis?: string;
    kanal?: string;
    hesap?: string;
    iade?: string;
    kargo?: string;
    /** "1" → iptal edilenler de listelenir (varsayılan: gizli). */
    iptal?: string;
    /** "ciro" | "sermaye" — marj göstergesinin ölçüsü. */
    marj?: string;
    /** Uyarı merkezinden: maliyet/kâr olağan aralığın dışında. */
    veri?: string;
    /** Uyarı merkezinden: komisyon oranı K3 eşiğinin altında. */
    oran?: string;
  }>;
}) {
  await sayfaIzni("satis.gor");
  // TEK ALAN-İZNİ (bilinçli istisna, bkz. lib/yetki/izinler.ts başlığı):
  // izin modeli sayfa bazlıdır; NET-2 kolonu operasyonun görmemesi gereken
  // TEK alandır ve sayfayı komple kapatmak satış girişini imkânsız kılardı.
  const karGorunur = await izinVarMi("satis.kar.gor");

  const p = await searchParams;
  const arama = (p.q ?? "").trim();

  /**
   * Dönem raporundaki "kârı hesaplanamadı" uyarısı buraya bağlanır.
   * Sorunlu satışları aramadan bulabilmek için ayrı bir süzgeç
   * (Kullanıcı Kolaylığı #9 — bilgiye az tıkla ulaş).
   */
  const karEksik = p.kar === "eksik";
  const bicim = await bicimlendirici();
  const t = await getTranslations("Satis");
  const tIpt = await getTranslations("SatisIptali");
  const tMarj = await getTranslations("MarjGosterge");

  /**
   * MARJ ÖLÇÜSÜ — adresten okunur, geçersizse varsayılana düşer.
   * "İkisi birden" YOK: iki yüzde yan yana karışır (bkz. lib/marj-gosterge).
   */
  const olcu: MarjOlcusu = olcuGecerliMi(p.marj) ? p.marj : VARSAYILAN_OLCU;

  /** Decimal → sayı; null kalır (sıfıra çevrilmez). */
  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());
  const tIade = await getTranslations("Iade");
  const ortak = await getTranslations("Ortak");

  /**
   * ŞÜPHELİ VERİ KÜMESİ — yalnız süzgeç AÇIKKEN hesaplanır.
   *
   * ⚠ Her satış açılışında koşsaydı, hiç kullanılmayan bir süzgeç için
   * her sayfa yüklemesinde stok hareketleri okunurdu. Çanın kendisi zaten
   * ayrı ölçüyor; burası yalnız listeyi süzüyor — ama AYNI GÖVDEDEN,
   * ikisi ayrışmasın diye.
   */
  const supheliBulgu =
    p.veri === "supheli"
      ? await supheliVeriBulgusu(gunDegeri(isTakvimGunu(new Date())))
      : null;
  const supheliIdler = supheliBulgu?.saleIdleri;

  // EKRAN VE EXCEL AYNI KOŞULU KULLANIR (bkz. lib/liste-suzgeci.ts).
  const { kosul, pencere } = satisKosulu(p, new Date(), supheliIdler);

  // Süzgeç seçenekleri VERİDEN gelir: olmayan bir seçeneğe tıklanıp boş
  // liste görülmesin.
  const [kanallar, hesaplar] = await Promise.all([
    prisma.channel.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.channelAccount.findMany({
      where: { isActive: true, satisIcin: true },
      select: { id: true, name: true, channel: { select: { name: true } } },
      orderBy: [{ channelId: "asc" }, { name: "asc" }],
    }),
  ]);

  const satislar = await prisma.sale.findMany({
    where: kosul,
    include: {
      items: {
        include: {
          variant: {
            include: { product: { select: { name: true } } },
          },
          returnItems: { select: { quantity: true } },
        },
      },
      channelAccount: { include: { channel: { select: { name: true } } } },
      // Rozet ve satır eylemi için: iade var mı, kalan var mı?
      returns: { select: { id: true } },
      /**
       * SERMAYE VERİMİNİN PAYDASI — satışın maliyeti. Yalnız MALIYET
       * kesintisi çekilir; YENİ HESAP YOK, mevcut snapshot okunur.
       */
      fees: { where: { code: "MALIYET" }, select: { amount: true } },
    },
    orderBy: { soldAt: "desc" },
  });

  /** Satırda "ne satıldı" özeti: tek kalemse ürün adı, çoksa "+N". */
  function urunOzeti(satis: (typeof satislar)[number]) {
    if (satis.items.length === 0) return "—";
    const ilk = satis.items[0];
    const ad = ilk.variant.name
      ? `${ilk.variant.product.name} — ${ilk.variant.name}`
      : ilk.variant.product.name;
    if (satis.items.length === 1) return ad;
    return t("digerKalemler", { urun: ad, sayi: satis.items.length - 1 });
  }

  function adetToplami(satis: (typeof satislar)[number]) {
    return satis.items.reduce((toplam, k) => toplam + k.quantity, 0);
  }

  function tutarMetni(satis: (typeof satislar)[number]) {
    const toplamlar = satisKalemToplamlari(satis.items);
    if (!toplamlar.length) return "—";
    return toplamlar.map((k) => bicim.para(k.tutar, k.paraBirimi)).join(" + ");
  }

  function hesapMetni(satis: (typeof satislar)[number]) {
    return `${satis.channelAccount.channel.name} — ${satis.channelAccount.name}`;
  }

  /**
   * SÜZGECİN TOPLAMI (İlke #15) — ciro herkese, NET yalnız izinliye.
   *
   * `Sale`de bugün iptal alanı YOK (satış iptali paketi henüz canlıda değil),
   * bu yüzden hariç tutulan küme boş. Paket geldiğinde `haricMi` iptalli
   * satışları dışarıda bırakacak; kural burada tek satır değişir.
   */
  /**
   * ⚠ GÖSTERMEK ≠ SAYMAK (canlı bulgu 17.08.2026).
   *
   * `?iptal=1` açıkken iptalli satışlar listeye giriyordu ve TOPLAMA DA
   * giriyorlardı: ciro 105.184 → 106.618 sıçradı. Oysa iptal edilen satış
   * hiç doğmamış sayılır — GÖRÜNÜR olması SAYILDIĞI anlamına gelmez.
   *
   * Toplam kutuları HER ZAMAN iptal hariçtir; iptal edilenler ayrı kutuda,
   * kendi rakamıyla görünür.
   */
  const ciroToplami = suzgecToplami(
    satislar,
    (s) => satisKalemToplamlari(s.items),
    (s) => s.iptalTarihi !== null,
  );

  /**
   * NET-2 TOPLAMI — SESSİZ VARSAYIM YOK.
   *
   * Kârı hesaplanamamış satış (maliyet yok, kur uyuşmazlığı, kural eksik)
   * toplama GİREMEZ; girseydi "0" sayılır ve NET olduğundan küçük görünürdü.
   * Kaç satışın dışarıda kaldığı kutunun altında yazar — eksik rakamı tam
   * sanmak, yanlış rakamdan tehlikelidir.
   */
  const net = hesaplananToplami(
    satislar,
    (s) =>
      // İptal edilen satış NET toplamına da girmez (yukarıdaki gerekçe).
      s.iptalTarihi === null &&
      s.profitStatus === "CALCULATED" &&
      s.net2Amount !== null,
    (s) => ({
      paraBirimi: s.profitCurrency ?? "TRY",
      tutar: Number(s.net2Amount!.toString()),
    }),
  );

  /** Birim fiyat kolonu: tek kalemde gerçek fiyat, çok kalemde çizgi. */
  function birimFiyatMetni(satis: (typeof satislar)[number]) {
    if (satis.items.length !== 1) return "—";
    const kalem = satis.items[0];
    return bicim.para(kalem.unitPriceAmount, kalem.unitPriceCurrency);
  }

  /**
   * SATIRIN KÂR DURUMU — şerit rengi buradan. Hesaplanmamış kâr NÖTRDÜR:
   * "zarar" demek yalan olurdu.
   */
  function satirDurumu(satis: (typeof satislar)[number]) {
    if (satis.profitStatus !== "CALCULATED" || satis.net2Amount === null) {
      return "notr" as const;
    }
    return karDurumu(Number(satis.net2Amount.toString()));
  }

  /** Kalemlerden en az birinde iade edilebilir adet kaldı mı? */
  function iadeKalanVar(satis: (typeof satislar)[number]) {
    return satis.items.some((k) => {
      const iadeEdilen = k.returnItems.reduce((t2, r) => t2 + r.quantity, 0);
      return k.quantity - iadeEdilen > 0;
    });
  }

  /** Süzgeç çubuğunun seçenekleri. */
  const suzgecler: SuzgecTanimi[] = [
    {
      ad: "kanal",
      etiket: ortak("kanal"),
      secenekler: kanallar.map((k) => ({ deger: k.code, etiket: k.name })),
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
      ad: "kar",
      etiket: t("karSuzgeci"),
      secenekler: [
        { deger: "eksik", etiket: t("karSuzgeciEksik") },
        { deger: "tam", etiket: t("karSuzgeciTam") },
        // 2b: panelin "N satış zararda" sayacı buraya bağlanır.
        { deger: "zarar", etiket: t("karSuzgeciZarar") },
      ],
    },
    {
      ad: "iade",
      etiket: t("iadeSuzgeci"),
      secenekler: [
        { deger: "var", etiket: t("iadeSuzgeciVar") },
        { deger: "yok", etiket: t("iadeSuzgeciYok") },
      ],
    },
    /**
     * KARGO SÜZGECİ — panelin "kargoya verilen / bekleyen" kutusu buraya
     * bağlanıyor. "Bekleyen" günlük iş listesidir: bugün ne kargoya
     * verilecek, onu gösterir.
     */
    {
      ad: "kargo",
      etiket: t("kargoSuzgeci"),
      secenekler: [
        { deger: "verildi", etiket: t("kargoSuzgeciVerildi") },
        { deger: "bekleyen", etiket: t("kargoSuzgeciBekleyen") },
      ],
    },
    /**
     * İPTAL SÜZGECİ — varsayılan GİZLİ. İptal edilen satış ciroya girmez ve
     * listede de görünmez; ama kayıt SİLİNMEZ, bu süzgeçle geri gelir.
     * Tek seçenek: "göster". Kapalıyken gizli olması varsayılan davranış
     * olduğu için ikinci bir seçenek ("gizle") gürültü olurdu.
     */
    {
      ad: "marj",
      etiket: tMarj("etiket"),
      secenekler: MARJ_OLCULERI.map((o) => ({
        deger: o,
        etiket: tMarj(`olcu_${o}`),
      })),
    },
    {
      ad: "iptal",
      etiket: tIpt("suzgecEtiketi"),
      secenekler: [{ deger: "1", etiket: tIpt("suzgecGoster") }],
    },
  ];

  /**
   * Arama formunun taşıyacağı süzgeçler ve Excel'e gidecek parametreler
   * TEK KAYNAKTAN üretiliyor: ikisi ayrı yazılsaydı biri güncellenip diğeri
   * unutulur ve inen dosya ekrandan farklı olurdu.
   */
  const formTasinanlar: Record<string, string | undefined> = {
    kar: p.kar,
    kanal: p.kanal,
    hesap: p.hesap,
    iade: p.iade,
    kargo: p.kargo,
    iptal: p.iptal,
    marj: p.marj,
    pencere: p.pencere,
    baslangic: p.baslangic,
    bitis: p.bitis,
    /**
     * ⚠ UYARIDAN GELEN SÜZGEÇLER DE TAŞINIR — canlı bulgu 19.08.2026.
     *
     * Eklenmemişlerdi ve üç şey birden bozuluyordu:
     *  1. `suzgecVar` yanlış hesaplanıyor → liste boşalınca "hiç satış
     *     yok" diyordu; oysa doğrusu "süzgece uyan kayıt yok".
     *  2. Kullanıcı başka bir süzgece dokununca `veri=supheli` SESSİZCE
     *     düşüyor ve liste bambaşka bir kümeye açılıyordu.
     *  3. Excel indirmesi süzgeci yok sayıyordu.
     */
    veri: p.veri,
    oran: p.oran,
  };
  const disaAktarmaParametreleri = { ...formTasinanlar, q: arama };

  const suzgecVar =
    arama !== "" || Object.values(formTasinanlar).some((d) => (d ?? "") !== "");

  /**
   * Seçili dönemin gerçek karşılığı — tanım tahmin edilmesin. Biçim
   * /iadeler ekranıyla birebir aynı (İlke #10); tarihler dil
   * altyapısından geçiyor.
   */
  const aralikMetni = pencere.pencere
    ? `${bicim.tarih(pencere.pencere.baslangic)} — ${bicim.tarih(pencere.pencere.sonGun)}`
    : "";

  /**
   * ŞÜPHELİ KALEMLER — satış başına, YALNIZ süzgeç açıkken.
   *
   * ⚠ HER AÇILIŞTA HESAPLANMAZ. "Doğrula" düğmesi ancak kullanıcı uyarıdan
   * gelip `?veri=supheli` süzgecini açtığında anlamlı; normal listede her
   * satır için maliyet çözmek her sayfa yüklemesine stok hareketi okuması
   * eklerdi. Giriş noktası uyarının kendisidir.
   */
  const supheliKalemHaritasi = new Map<string, string[]>();
  for (const k of supheliBulgu?.kalemler ?? []) {
    const l = supheliKalemHaritasi.get(k.saleId) ?? [];
    l.push(k.saleItemId);
    supheliKalemHaritasi.set(k.saleId, l);
  }

  function eylemler(satis: (typeof satislar)[number]) {
    /** Bir satışta birden çok şüpheli kalem olabilir; her biri ayrı düğme. */
    const supheliler = supheliKalemHaritasi.get(satis.id) ?? [];
    return (
      <>
        {supheliler.map((saleItemId) => (
          <DogrulaButonu key={saleItemId} saleItemId={saleItemId} />
        ))}
        {/* KARGO İŞARETİ AYRI SÜTUN DEĞİL, EYLEM: bu bir toggle ve tablo
            sütun bütçesi 7 (bkz. yerlesim:dogrula). Durum da burada
            görünüyor — işaretliyse tarih, değilse düğme. */}
        <KargoDurumu
          saleId={satis.id}
          shippedAt={satis.shippedAt ? gunMetni(satis.shippedAt) : null}
        />
        <SatirEylemi href={`/satislar/${satis.id}`} ikon={Eye} etiket={ortak("detay")} />
        {iadeKalanVar(satis) ? (
          <SatirEylemi href={`/satislar/${satis.id}/iade`} ikon={Undo2} etiket={tIade("iadeAl")} />
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {ortak("kayitSayisi", { sayi: satislar.length })}
            {arama ? ortak("aramaEki", { arama }) : ""}
            {/* Seçili dönem başlıkta yazar: "9 kayıt" rakamının hangi
                aralığa ait olduğu ekranda görünsün (#5). */}
            {aralikMetni ? ` · ${aralikMetni}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* EXCEL EKRANDAKİ SÜZGECİ UYGULAR: aynı parametreler, aynı koşul
              kurucusu (lib/liste-suzgeci.ts). Liste bir şey, dosya başka şey
              söylemesin. */}
          <ExcelIndir liste="satislar" parametreler={disaAktarmaParametreleri} />
          <Button asChild>
            <Link href="/satislar/yeni">
              <Plus />
              {t("yeniSatis")}
            </Link>
          </Button>
        </div>
      </div>

      <form action="/satislar" className="flex flex-wrap items-end gap-2">
        {/* SÜZGEÇLER ARAMADA KAYBOLMASIN: form gönderimi adresi baştan kurar,
            gizli alanlar açık süzgeçleri taşır. Tek tek yazmak yerine
            listeden üretiliyor — yeni bir süzgeç eklenince burada unutulan
            alan sessizce filtreyi düşürürdü. */}
        {Object.entries(formTasinanlar).map(([ad, deger]) =>
          deger ? <input key={ad} type="hidden" name={ad} value={deger} /> : null,
        )}
        <Input
          name="q"
          defaultValue={arama}
          placeholder={t("aramaIpucu")}
          className="max-w-xs min-w-44 flex-1"
        />
        <Button type="submit" variant="secondary">
          {ortak("ara")}
        </Button>
        {arama ? (
          <Button type="button" variant="ghost" asChild>
            <Link href={suzgecAdresi("/satislar", p, { q: "" })}>
              {ortak("temizle")}
            </Link>
          </Button>
        ) : null}
      </form>

      {/* Tercih hatırlama — cihaz bazlı, adres kazanır (bkz. marj-tercihi). */}
      <Suspense fallback={null}>
        <MarjTercihi />
      </Suspense>

      <SuzgecCubugu
        temelAdres="/satislar"
        mevcut={p}
        suzgecler={suzgecler}
        zaman={{
          secili: pencere.tur,
          aralikMetni,
          baslangic: p.baslangic ?? "",
          bitis: p.bitis ?? "",
        }}
      />

      {/* SÜZGECİN TOPLAMI — listenin üstünde, seçili dönemle birlikte (#15). */}
      <ListeToplami
        baslik={t("ciroToplami")}
        toplamlar={ciroToplami.toplam}
        /* Sayı da iptal HARİÇ — toplam hangi kümeden çıktıysa o kadar kayıt. */
        altMetin={`${ortak("kayitSayisi", { sayi: ciroToplami.sayi })}${
          aralikMetni ? ` · ${aralikMetni}` : ""
        }`}
        /* İPTAL EDİLENLER AYRI KUTUDA — sessizce düşülmez, rakamıyla görünür. */
        haric={{
          etiket: tIpt("toplamHaric", { sayi: ciroToplami.haricSayi }),
          toplamlar: ciroToplami.haric,
          sayi: ciroToplami.haricSayi,
        }}
        ekler={[
          {
            etiket: t("netToplami"),
            toplamlar: net.toplam,
            // Kâr rakamı izne bağlı: Operasyon rolü ciroyu görür, NET'i görmez.
            gorunur: karGorunur,
            not:
              net.eksikSayi > 0
                ? t("netHesaplanamayanHaric", { sayi: net.eksikSayi })
                : undefined,
          },
        ]}
      />

      {/* Hangi süzgecin açık olduğu EKRANDA yazar (#5). */}
      {karEksik ? (
        <div className={`flex flex-wrap items-center gap-2 rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <TriangleAlert className={`size-4 shrink-0 ${DURUM_YAZISI.uyari}`} />
          <span className={`text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            {t("karEksikFiltresi")}
          </span>
          <Badge variant="outline">{satislar.length}</Badge>
        </div>
      ) : null}

      {satislar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {/* ⚠ AÇIK SIFIR: uyarıdan gelen süzgeç boşaldıysa bu bir
                BAŞARIDIR, "kayıt bulunamadı" değil. Genel boş mesajı
                göstermek, sorunu çözen kullanıcıya sanki bir şey ters
                gitmiş gibi bakmak olurdu. */}
            {p.veri === "supheli"
              ? t("bosSupheliVeri")
              : p.oran === "supheli"
                ? t("bosSupheliOran")
                : karEksik
                  ? t("bosKarEksikBaslik")
                  : suzgecVar
                    ? t("bosFiltreBaslik")
                    : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {/* SÜZGEÇ YÜZÜNDEN BOŞSA ONU SÖYLE: "kayıt yok" demek, süzgeci
                unutan kullanıcıya yanlış cevabı kendinden emin vermektir. */}
            {karEksik
              ? t("bosKarEksikIpucu")
              : suzgecVar
                ? t("bosFiltreIpucu")
                : t("bosIpucu")}
          </p>
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* SÜTUNLAR BİRLEŞTİRİLDİ (14.08.2026, tek ekrana sığsın):
                      tarih+sipariş no · kanal+hesap · tutar+birim fiyat.
                      Hiçbir bilgi düşmedi, ikincil olan alt satıra indi
                      (bkz. components/iki-satir.tsx). */}
                  <TableHead>{ortak("tarih")}</TableHead>
                  <TableHead>{ortak("kanalHesabi")}</TableHead>
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead className="text-right">{ortak("adet")}</TableHead>
                  <TableHead>{ortak("tutar")}</TableHead>
                  {/* MARJ AYRI SÜTUN (kullanıcı isteği 17.08.2026): NET
                      rozetinin içinde sıkışıkken okunmuyordu. Başlık ÖLÇÜYÜ
                      yazar, böylece rozette tekrar etmesi gerekmez. */}
                  {karGorunur ? (
                    <>
                      <TableHead className="text-right">{t("netKar")}</TableHead>
                      <TableHead className="text-right">
                        {tMarj(`olcu_${olcu}`)}
                      </TableHead>
                    </>
                  ) : null}
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {satislar.map((satis) => (
                  /* ÜÇÜNCÜ KATMAN — SATIR ŞERİDİ. Rozet tek başına zayıf
                     kalıyordu: göz satırı OKUMADAN durumu göremiyordu. 3px sol
                     şerit satırı taramadan önce sınıflandırır.
                     Yalnız ZARAR şeritlenir; her satırı boyamak nötr tabanı
                     yok eder ve vurgu anlamını yitirir (kısıt #3). Kâr izni
                     yoksa şerit de yok — NET bilgisi kenarlıktan sızmaz. */
                  <TableRow
                    key={satis.id}
                    className={[
                      karGorunur && satirDurumu(satis) === "olumsuz"
                        ? DURUM_SERIDI.olumsuz
                        : "",
                      /* İPTAL EDİLEN SATIŞ ÜSTÜ ÇİZİLİ VE SOLGUN: satır
                         okunmadan önce "bu sayılmıyor" anlaşılmalı. Kayıt
                         silinmiyor, yalnız varsayılan olarak gizli. */
                      satis.iptalTarihi !== null ? "line-through opacity-60" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <TableCell className="whitespace-nowrap">
                      {/* Tarih üstte (kayda giden bağlantı), sipariş no altta
                          ve kopyalanabilir — kimlik listede kalıyor (#3, #4). */}
                      <IkiSatir
                        ust={
                          <Baglanti href={`/satislar/${satis.id}`}>
                            {bicim.tarih(satis.soldAt)}
                          </Baglanti>
                        }
                        alt={
                          satis.code ? (
                            <KopyalanabilirKod
                              deger={satis.code}
                              etiket={ortak("siparisNo")}
                            />
                          ) : (
                            t("siparisNoYok")
                          )
                        }
                        altIpucu={satis.code ?? undefined}
                      />
                      {/* ROZETTE SEBEP DE VAR — "iptal" demek yetmez, NEDEN
                          iptal edildiği listede görünür (mimar şartı). */}
                      {satis.iptalTarihi !== null ? (
                        <Badge
                          variant="outline"
                          className="mt-1 no-underline"
                          title={
                            satis.iptalNotu ??
                            (satis.iptalSebebi ? tIpt(`sebep_${satis.iptalSebebi}`) : undefined)
                          }
                        >
                          {tIpt("rozet")}
                          {satis.iptalSebebi ? ` · ${tIpt(`sebepKisa_${satis.iptalSebebi}`)}` : ""}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <IkiSatir
                        enGenis="max-w-[8rem]"
                        ust={satis.channelAccount.channel.name}
                        ustIpucu={satis.channelAccount.channel.name}
                        alt={satis.channelAccount.name}
                        altIpucu={satis.channelAccount.name}
                      />
                    </TableCell>
                    {/* Uzun ürün özeti kesilir, tamamı `title`'da; satırın
                        Detay düğmesi kaydın tamamına götürür (bkz. UzunAd). */}
                    <TableCell>
                      <UzunAd
                        metin={urunOzeti(satis)}
                        ek={
                          satis.returns.length ? (
                            <DurumRozeti durum="uyari">{tIade("iadeVar")}</DurumRozeti>
                          ) : null
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {adetToplami(satis)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {/* Tutar üstte, birim fiyat altta. Tek kalemli satışta
                          ikisi aynı sayıdır ama çok kalemlide birim fiyat
                          "—" olur; ayrı sütun 95px yiyordu. */}
                      <IkiSatir
                        ust={tutarMetni(satis)}
                        alt={ortak("birimFiyatKisa", {
                          tutar: birimFiyatMetni(satis),
                        })}
                      />
                    </TableCell>
                    {karGorunur ? (
                      <TableCell className="text-right whitespace-nowrap">
                        <NetKar
                          tutar={satis.net2Amount}
                          paraBirimi={satis.profitCurrency}
                          durum={satis.profitStatus}
                        />
                      </TableCell>
                    ) : null}
                    {karGorunur ? (
                      <TableCell className="text-right whitespace-nowrap">
                        <MarjRozeti
                          gosterge={satirGostergesi({
                            olcu,
                            net2: sayi(satis.net2Amount),
                            tutar: satisKalemToplamlari(satis.items).reduce(
                              (t2, k) => t2 + k.tutar,
                              0,
                            ),
                            maliyet:
                              satis.fees.length === 0
                                ? null
                                : Math.abs(
                                    Number(satis.fees[0].amount.toString()),
                                  ),
                            iptalliMi: satis.iptalTarihi !== null,
                          })}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="whitespace-nowrap">
                      <SatirEylemleri>{eylemler(satis)}</SatirEylemleri>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {satislar.map((satis) => (
              <ListeKarti
                key={satis.id}
                baslik={
                  <span className="flex flex-wrap items-center gap-2">
                    <Baglanti href={`/satislar/${satis.id}`}>
                      {urunOzeti(satis)}
                    </Baglanti>
                    {satis.returns.length ? (
                      <DurumRozeti durum="uyari">{tIade("iadeVar")}</DurumRozeti>
                    ) : null}
                  </span>
                }
                altBaslik={bicim.tarih(satis.soldAt)}
                alanlar={[
                  {
                    etiket: ortak("siparisNo"),
                    deger: satis.code ? (
                      <KopyalanabilirKod
                        deger={satis.code}
                        etiket={ortak("siparisNo")}
                      />
                    ) : (
                      t("siparisNoYok")
                    ),
                  },
                  {
                    etiket: ortak("adet"),
                    deger: (
                      <span className="text-base font-semibold">
                        {adetToplami(satis)}
                      </span>
                    ),
                  },
                  {
                    etiket: ortak("sutunBirimFiyat"),
                    deger: birimFiyatMetni(satis),
                  },
                  { etiket: ortak("tutar"), deger: tutarMetni(satis) },
                  ...(karGorunur
                    ? [
                        {
                          etiket: t("netKar"),
                          deger: (
                            <NetKar
                              tutar={satis.net2Amount}
                              paraBirimi={satis.profitCurrency}
                              durum={satis.profitStatus}
                            />
                          ),
                        },
                        {
                          /* Masaüstünde sütun, telefonda AYRI ALAN — aynı
                             bilgi iki düzende de kendi yerinde durur. */
                          etiket: tMarj(`olcu_${olcu}`),
                          deger: (
                            <MarjRozeti
                              gosterge={satirGostergesi({
                                olcu,
                                net2: sayi(satis.net2Amount),
                                tutar: satisKalemToplamlari(satis.items).reduce(
                                  (t2, k) => t2 + k.tutar,
                                  0,
                                ),
                                maliyet:
                                  satis.fees.length === 0
                                    ? null
                                    : Math.abs(
                                        Number(satis.fees[0].amount.toString()),
                                      ),
                                iptalliMi: satis.iptalTarihi !== null,
                              })}
                            />
                          ),
                        },
                      ]
                    : []),
                  { etiket: ortak("kanalHesabi"), deger: hesapMetni(satis) },
                ]}
                eylemler={eylemler(satis)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
