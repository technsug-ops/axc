import { getTranslations } from "next-intl/server";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Eye, Plus, TriangleAlert, Undo2 } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { IkiSatir } from "@/components/iki-satir";
import { KargoDurumu } from "./kargo-durumu";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { UzunAd } from "@/components/uzun-ad";
import { NetKar } from "@/components/net-kar";
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
  const tIade = await getTranslations("Iade");
  const tSuzgec = await getTranslations("Suzgec");
  const ortak = await getTranslations("Ortak");

  // EKRAN VE EXCEL AYNI KOŞULU KULLANIR (bkz. lib/liste-suzgeci.ts).
  const { kosul, pencere } = satisKosulu(p);

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

  /** Birim fiyat kolonu: tek kalemde gerçek fiyat, çok kalemde çizgi. */
  function birimFiyatMetni(satis: (typeof satislar)[number]) {
    if (satis.items.length !== 1) return "—";
    const kalem = satis.items[0];
    return bicim.para(kalem.unitPriceAmount, kalem.unitPriceCurrency);
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
    pencere: p.pencere,
    baslangic: p.baslangic,
    bitis: p.bitis,
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

  function eylemler(satis: (typeof satislar)[number]) {
    return (
      <>
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

      {/* Hangi süzgecin açık olduğu EKRANDA yazar (#5). */}
      {karEksik ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <TriangleAlert className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {t("karEksikFiltresi")}
          </span>
          <Badge variant="outline">{satislar.length}</Badge>
        </div>
      ) : null}

      {satislar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {karEksik
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
                  {karGorunur ? (
                    <TableHead className="text-right">{t("netKar")}</TableHead>
                  ) : null}
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {satislar.map((satis) => (
                  <TableRow key={satis.id}>
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
                            <Badge variant="outline">{tIade("iadeVar")}</Badge>
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
                      <Badge variant="outline">{tIade("iadeVar")}</Badge>
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
