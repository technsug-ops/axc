import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Info, TriangleAlert, Upload } from "lucide-react";

import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { VARYANT_SECIMI, varyantiOzetle } from "@/lib/varyant-ozet";
import { komisyonBandi } from "@/lib/komisyon-bandi";
import { prisma } from "@/lib/prisma";

import { KanalSkuFiltresi } from "./filtre";
import { SayfalamaCubugu } from "@/components/sayfalama";
import { sayfaCoz } from "@/lib/sayfalama";

import { SatirDuzenle } from "./satir-duzenle";
import { YeniEsleme } from "./yeni-esleme";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { ListeyiHatirla } from "@/components/liste-hafizasi-bilesenleri";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("kanalSku") };
}

export default async function KanalSkuSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    hesap?: string;
    q?: string;
    eksik?: string;
    sayfa?: string;
    /** K112a — mal kabul ekranındaki "Kod yok" rozetinden gelen varyant. */
    ekle?: string;
  }>;
}) {
  await sayfaIzni("kanalsku.yaz");

  const { hesap, q, eksik, sayfa, ekle } = await searchParams;
  const seciliHesap = hesap ?? "";

  /**
   * ⚠ ÖN DOLDURMA — mal kabul ekranındaki "Kod yok" rozetinden gelinince.
   * Bulunamazsa `null` döner ve form BOŞ açılır: uydurma bir seçim
   * göstermektense boş bırakmak doğrudur (İlke #11 ailesi).
   */
  const onDoluKayit = ekle
    ? await prisma.productVariant.findUnique({
        where: { id: ekle },
        select: VARYANT_SECIMI,
      })
    : null;
  const onDoluVaryant = onDoluKayit ? varyantiOzetle(onDoluKayit) : null;
  const arama = (q ?? "").trim();
  const eksikOran = eksik === "1";

  const t = await getTranslations("KanalSku");

  const tBaslik = await getTranslations("Basliklar");
  const tKomisyon = await getTranslations("Komisyon");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const suzgec = {
    ...(seciliHesap ? { channelAccountId: seciliHesap } : {}),
    // "Oranı eksik" süzgeci YALNIZ SATIŞ hesaplarında anlamlı: alış
    // hesabındaki kodun komisyonu olmaz, boş olması eksiklik değildir.
    ...(eksikOran
      ? { commissionRate: null, channelAccount: { satisIcin: true } }
      : {}),
    ...(arama
      ? {
          OR: [
            { channelSku: { contains: arama } },
            { variant: { sku: { contains: arama } } },
            { variant: { companySku: { contains: arama } } },
            { variant: { product: { name: { contains: arama } } } },
          ],
        }
      : {}),
  };

  // ÖNCE SAY, SONRA SAYFAYI ÇEK. Göçten sonra bu ekranda 1039 kayıt var;
  // sayfalamasız hâli /urunler'i çökerten desenin aynısıydı.
  // KOMISYON BANDI: hakedislerden fiilen odenen oran. Her hakedis
  // yuklemesinden sonra kendiliginden guncellenir — onbellek yok.
  const bantKalemleri = await prisma.settlementItem.findMany({
    where: { code: { in: ["KOMISYON", "SIPARIS_TUTARI"] } },
    select: { channelAccountId: true, orderNo: true, code: true, amount: true },
  });
  const bantlar = komisyonBandi(
    bantKalemleri.map((k) => ({
      channelAccountId: k.channelAccountId,
      siparisNo: k.orderNo,
      kod: k.code,
      tutar: Number(k.amount.toString()),
    })),
  );

  const toplam = await prisma.channelSku.count({ where: suzgec });
  const sayfalama = sayfaCoz(sayfa, toplam);

  const [kayitlar, hesapKayitlari, eksikOranSayisi] = await Promise.all([
    prisma.channelSku.findMany({
      where: suzgec,
      skip: sayfalama.atla,
      take: sayfalama.boyut,
      include: {
        variant: {
          select: {
            sku: true,
            name: true,
            product: { select: { name: true } },
          },
        },
        channelAccount: {
          select: {
            name: true,
            satisIcin: true,
            alisIcin: true,
            channel: { select: { name: true } },
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    // ALIŞ HESAPLARI DA LİSTELENİR (kullanıcı kararı 12.08.2026):
    // ürünün tedarikçi kataloğundaki kodu (Amazon ASIN vb.) da bir TAKMA
    // ADDIR ve aynı tabloya yazılır. Komisyon alanı yalnız satış hesabında
    // görünür; alışta anlamı yoktur.
    prisma.channelAccount.findMany({
      where: { isActive: true, OR: [{ satisIcin: true }, { alisIcin: true }] },
      include: { channel: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.channelSku.count({
      where: { commissionRate: null, channelAccount: { satisIcin: true } },
    }),
  ]);

  const hesaplar = hesapKayitlari.map((h) => ({
    id: h.id,
    etiket: hesapEtiketi(h.channel.name, h.name),
    satisIcin: h.satisIcin,
  }));

  const filtreVar = Boolean(seciliHesap || arama || eksikOran);

  function urunAdi(kayit: (typeof kayitlar)[number]) {
    const v = kayit.variant;
    return v.name ? `${v.product.name} — ${v.name}` : v.product.name;
  }

  function hesapAdi(kayit: (typeof kayitlar)[number]) {
    return hesapEtiketi(
      kayit.channelAccount.channel.name,
      kayit.channelAccount.name,
    );
  }

  function oranMetni(kayit: (typeof kayitlar)[number]) {
    return kayit.commissionRate === null
      ? ""
      : String(Number(kayit.commissionRate.toString()));
  }

  /**
   * KOMİSYON HÜCRESİ — ORAN YA DA SEBEBİ.
   *
   * ⚠ BOŞLUK SESSİZ BIRAKILMAZ (İlke #5). İki ayrı "oran yok" hâli var ve
   * ikisi farklı şey söyler:
   *   · ALIŞ hesabı  → komisyon KAVRAM OLARAK yok; tedarikçi katalog kodudur
   *   · SATIŞ hesabı → oran GİRİLMEMİŞ; eksik veri, doldurulması gerekir
   * İkisini tek "—" ile göstermek, düzeltilecek olanı düzeltilemeyecek
   * olanla aynı kefeye koyardı.
   *
   * ⚠ BANT UYARISI BURAYA KONMADI — ÖLÇÜLDÜ VE ELENDİ. `bantDisiMi` kuralı
   * canlıda **577/1077 Hepsiburada satırında** yanıyordu (%53,6). Sebebi
   * kural değil KAPSAM: bant HB hakediş komisyonlarından kuruluyor (medyan
   * %20,45) ama buradaki oranların medyanı %15 — iki farklı popülasyon.
   * Ayrıca bant yalnız HB'de var; TY (1057) ve N11 (48) için hiç yok, yani
   * onların "temiz" görünmesi kıyas OLMAMASINDAN. Yarısında yanan bir uyarı
   * okunmaz olur ve rozetin tamamına olan güveni götürür.
   */
  function komisyonMetni(kayit: (typeof kayitlar)[number]) {
    if (kayit.commissionRate !== null) {
      return `%${Number(kayit.commissionRate.toString())}`;
    }
    return kayit.channelAccount.satisIcin ? (
      <span className={DURUM_YAZISI.uyari}>{t("eksikOranRozeti")}</span>
    ) : (
      <span className="text-muted-foreground">{t("oranAlisHesabinda")}</span>
    );
  }

  function duzenleyici(kayit: (typeof kayitlar)[number]) {
    return (
      <SatirDuzenle
        kayitId={kayit.id}
        sku={kayit.variant.sku}
        hesapEtiketi={hesapAdi(kayit)}
        kanalKodu={kayit.channelSku}
        oran={oranMetni(kayit)}
        // Komisyon YALNIZ satis hesabinda anlamli: alis hesabindaki kod
        // urunun tedarikci katalogundaki kodudur, komisyonu olmaz.
        oranGosterilsin={kayit.channelAccount.satisIcin}
        bant={
          bantlar.find((b) => b.channelAccountId === kayit.channelAccountId) ??
          null
        }
        aktifMi={kayit.isActive}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* SUZGECLI ADRESI HATIRLAR — hicbir sey CIZMEZ (K104-2).
          Bir kayda girip donen kullanici suzgecini geri bulsun diye.
          Kaydedici olmadan "< Liste" baglantisi duz listeye duser. */}
      <ListeyiHatirla temel="/kanal-sku" etiket={tBaslik("kanalSku")} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground max-w-3xl text-sm">
            {t("aciklamaMetni")}
          </p>
        </div>
        {/* Oranı tek tek elle girmenin yanında TOPLU yol: pazaryerinden
            inen ürün listesi. Ekranın en pahalı işi bu, görünür durur (#1). */}
        <Button asChild>
          <Link href="/kanal-sku/komisyon-aktar">
            <Upload />
            {tKomisyon("baslik")}
          </Link>
        </Button>
      </div>

      {/* Oranı eksik olanlar: raporda "kural eksik" diyen satışların kaynağı. */}
      {eksikOranSayisi > 0 ? (
        <div className={`flex flex-wrap items-center gap-2 rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <TriangleAlert className={`size-4 shrink-0 ${DURUM_YAZISI.uyari}`} />
          <span className={`text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            {t("eksikOranSayisi", { sayi: eksikOranSayisi })}
          </span>
          <span className={`text-xs ${DURUM_YAZISI.uyari}`}>
            {t("eksikOranNotu")}
          </span>
          {/* UYARI EYLEME DÖNÜK: 1000+ eksik oranı tek tek girmek gerçekçi
              değil, en hızlı çözüm pazaryeri listesini aktarmak. */}
          <Button variant="outline" size="sm" asChild>
            <Link href="/kanal-sku/komisyon-aktar">
              <Upload />
              {tKomisyon("kisaEylem")}
            </Link>
          </Button>
        </div>
      ) : null}

      {/* ------------------- KOMİSYON BANDI -------------------
          Hakedişten gelen GERÇEKTEN ÖDENMİŞ oran. Öneri değil, ölçü:
          elle oran girerken "normal ne kadar" sorusunun cevabı. */}
      {bantlar.length > 0 ? (
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="size-4 shrink-0" />
            {t("bantBaslik")}
          </div>
          <ul className="space-y-1 text-sm">
            {bantlar.map((b) => {
              const h = hesaplar.find((x) => x.id === b.channelAccountId);
              return (
                <li key={b.channelAccountId}>
                  <span className="font-medium">{h?.etiket ?? "—"}</span>{" "}
                  {t("bantSatiri", {
                    dusuk: b.enDusuk.toFixed(2),
                    yuksek: b.enYuksek.toFixed(2),
                    medyan: b.medyan.toFixed(2),
                    siparis: b.siparisSayisi,
                  })}
                </li>
              );
            })}
          </ul>
          <p className="text-muted-foreground text-xs">{t("bantNotu")}</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniEsleme")}</CardTitle>
        </CardHeader>
        <CardContent>
          {hesaplar.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("hesapYokBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("hesapYokIpucu")}
              </p>
            </div>
          ) : (
            <YeniEsleme
              hesaplar={hesaplar}
              bantlar={bantlar}
              onDolu={onDoluVaryant}
            />
          )}
        </CardContent>
      </Card>

      <KanalSkuFiltresi
        hesaplar={hesaplar}
        seciliHesap={seciliHesap}
        arama={arama}
        eksikOran={eksikOran}
      />

      <div>
        <p className="text-muted-foreground text-sm">
          {t("toplamEsleme", { sayi: toplam })}
        </p>
        <p className="text-muted-foreground text-xs">{t("snapshotNotu")}</p>
      </div>

      {kayitlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {eksikOran
              ? t("eksikOranBosBaslik")
              : filtreVar
                ? t("bosFiltreBaslik")
                : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {eksikOran
              ? t("eksikOranBosIpucu")
              : filtreVar
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
                  {/*
                    ⚠ DÖRT SÜTUN — YEDİDEN İNDİRİLDİ (kullanıcı 23.08.2026:
                    _"kötü bir seçim; ürün isimlerini gerekiyorsa iki satır
                    yap ama tüm bilgiyi sağa scroll yapmadan görmek
                    istiyorum"_).

                    İlk sürümde kanal kodu ve komisyon AYRI sütun olarak
                    eklenmişti ve tablo yedi sütuna çıkıp yatay kaydırma
                    gerektiriyordu. Deponun kendi kuralı bunu zaten söylüyor
                    (`yerlesim-dogrula.ts`): _"Yeni bir sütun gerekiyorsa çare
                    sütun eklemek değil, ilişkili iki bilgiyi tek hücrede ÜST
                    ÜSTE koymaktır."_ Kuralı yazmıştık, uygulamamıştık.

                    Eşleştirme ilişkiye göre:
                      Ürün    = ürün adı + SKU        (hangi mal)
                      Kanal   = hesap + kanal kodu    (nerede, hangi kodla)
                      Komisyon= oran + güncelleme     (kaç, ne zamandan beri)
                  */}
                  <TableHead>{t("sutunUrun")}</TableHead>
                  <TableHead>{t("sutunHesap")}</TableHead>
                  <TableHead className="text-right">{t("sutunOran")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kayitlar.map((kayit) => (
                  <TableRow key={kayit.id}>
                    {/*
                      ⚠ ÜRÜN ADI SARIYOR, KIRPILMIYOR. `IkiSatir` bileşeni
                      `truncate` kullanıyor (tek satır + "…" + ipucu); burada
                      ad UZUN ve kullanıcı onu OKUMAK istiyor. `line-clamp-2`
                      en fazla iki satıra sarar, `whitespace-normal` hücrenin
                      varsayılan `whitespace-nowrap`ını ezer.
                    */}
                    <TableCell className="max-w-[26rem] whitespace-normal">
                      <div className="line-clamp-2">{urunAdi(kayit)}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <KopyalanabilirKod
                          deger={kayit.variant.sku}
                          etiket={ortak("sku")}
                        />
                        {!kayit.isActive ? (
                          <Badge variant="secondary">{ortak("pasif")}</Badge>
                        ) : null}
                      </div>
                    </TableCell>

                    {/*
                      KANAL = hesap + o hesaptaki KOD. İkisi aynı soruyu
                      cevaplıyor: "bu ürün nerede, hangi kodla satılıyor".
                      Rol rozeti kalıyor — aynı listede alış ve satış kodları
                      yan yana duruyor, hangisi olduğu görünmeli.
                    */}
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {hesapAdi(kayit)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {kayit.channelAccount.satisIcin
                            ? t("rolSatis")
                            : t("rolAlis")}
                        </Badge>
                      </div>
                      <div className="mt-0.5 font-mono text-xs">
                        <KopyalanabilirKod
                          deger={kayit.channelSku}
                          etiket={t("sutunKanalKodu")}
                        />
                      </div>
                    </TableCell>

                    {/*
                      ⚠ ORAN SAĞA YASLI VE `tabular-nums`: oranlar alt alta
                      karşılaştırılıyor ve canlıda 629/2182'si ondalıklı
                      (%13,5 ↔ %18). Sola yaslı yazılsa virgüller hizalanmaz.
                      Altındaki tarih "bu oran ne zamandan beri" sorusunun
                      cevabı — oranla aynı hücrede olması gereken bilgi.
                    */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="tabular-nums">{komisyonMetni(kayit)}</div>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {kayit.commissionUpdatedAt
                          ? bicim.tarih(kayit.commissionUpdatedAt)
                          : t("hicGuncellenmedi")}
                      </div>
                    </TableCell>

                    <TableCell>{duzenleyici(kayit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {kayitlar.map((kayit) => (
              <ListeKarti
                key={kayit.id}
                baslik={
                  <span className="flex flex-wrap items-center gap-2">
                    {urunAdi(kayit)}
                    {kayit.commissionRate === null ? (
                      <Badge
                        variant="outline"
                        className={`${DURUM_YAZISI.uyari} border-current/40`}
                      >
                        {t("eksikOranRozeti")}
                      </Badge>
                    ) : null}
                    {!kayit.isActive ? (
                      <Badge variant="secondary">{ortak("pasif")}</Badge>
                    ) : null}
                  </span>
                }
                altBaslik={hesapAdi(kayit)}
                alanlar={[
                  /*
                    ⚠ TELEFONDA DA AYNI İKİ BİLGİ (İlke #8: mobil eşit
                    vatandaş). Kanal kodu İLK sırada: ekranın adı bu ve
                    depoda/telefonda aranan şey o.
                  */
                  {
                    etiket: t("sutunKanalKodu"),
                    deger: (
                      <KopyalanabilirKod
                        deger={kayit.channelSku}
                        etiket={t("sutunKanalKodu")}
                      />
                    ),
                  },
                  {
                    etiket: ortak("sku"),
                    deger: (
                      <KopyalanabilirKod
                        deger={kayit.variant.sku}
                        etiket={ortak("sku")}
                      />
                    ),
                  },
                  {
                    etiket: t("sutunOran"),
                    deger: (
                      <span className="tabular-nums">{komisyonMetni(kayit)}</span>
                    ),
                  },
                  {
                    etiket: t("sutunGuncelleme"),
                    deger: kayit.commissionUpdatedAt
                      ? bicim.tarih(kayit.commissionUpdatedAt)
                      : t("hicGuncellenmedi"),
                  },
                ]}
                eylemler={duzenleyici(kayit)}
              />
            ))}
          </div>

          <SayfalamaCubugu
            sayfalama={sayfalama}
            yol="/kanal-sku"
            parametreler={{ hesap: seciliHesap, q: arama, eksik: eksikOran ? "1" : undefined }}
          />
        </>
      )}
    </div>
  );
}
