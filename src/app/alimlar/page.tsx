import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Eye, Pencil, PackageCheck, Plus } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
import { AlimIptalButonu } from "./iptal-butonu";
import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { IkiSatir } from "@/components/iki-satir";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
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
import { ALIM_DURUMLARI, alimDurumEtiketleri } from "@/lib/etiketler";
import { bicimlendirici } from "@/lib/bicim";
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { alimKosulu } from "@/lib/liste-suzgeci";
import { prisma } from "@/lib/prisma";
import { suzgecAdresi } from "@/lib/suzgec";
import { kalemToplamlari } from "@/lib/tutar";

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
  }>;
}) {
  await sayfaIzni("alim.gor");

  const p = await searchParams;
  const arama = (p.q ?? "").trim();
  const bicim = await bicimlendirici();
  const durumEtiketleri = await alimDurumEtiketleri();
  const t = await getTranslations("Alim");
  const ortak = await getTranslations("Ortak");

  // EKRAN VE EXCEL AYNI KOŞULU KULLANIR (bkz. lib/liste-suzgeci.ts).
  const { kosul, pencere } = await alimKosulu(p);

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

  const alimlar = await prisma.purchase.findMany({
    where: kosul,
    include: {
      items: {
        include: {
          // Duzenleme/iptal kurallari icin: mal kabul yapilmis mi?
          stockMovements: { select: { quantityDelta: true } },
        },
      },
      creditCard: { select: { label: true, last4: true } },
      channelAccount: {
        include: { channel: { select: { name: true } } },
      },
      supplier: { select: { name: true } },
    },
    orderBy: { purchasedAt: "desc" },
  });

  /** Süzgeç çubuğunun seçenekleri. */
  const suzgecler: SuzgecTanimi[] = [
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
  };
  const disaAktarmaParametreleri = { ...formTasinanlar, q: arama };

  const suzgecVar =
    arama !== "" || Object.values(formTasinanlar).some((d) => (d ?? "") !== "");

  /** Seçili dönemin gerçek karşılığı — /iadeler ve /satislar ile aynı biçim. */
  const aralikMetni = pencere.pencere
    ? `${bicim.tarih(pencere.pencere.baslangic)} — ${bicim.tarih(pencere.pencere.sonGun)}`
    : "";

  function toplamMetni(alim: (typeof alimlar)[number]) {
    const toplamlar = kalemToplamlari(alim.items);
    if (!toplamlar.length) return "—";
    return toplamlar.map((t) => bicim.para(t.tutar, t.paraBirimi)).join(" + ");
  }

  function eylemler(alim: (typeof alimlar)[number]) {
    const kabulEdilebilir =
      alim.status !== "CANCELLED" && alim.status !== "RECEIVED";
    const malKabulVar = alim.items.some((k) =>
      k.stockMovements.some((h) => h.quantityDelta > 0),
    );
    const iptalli = alim.status === "CANCELLED";
    return (
      <>
        <SatirEylemi href={`/alimlar/${alim.id}`} ikon={Eye} etiket={ortak("detay")} />
        {!iptalli ? (
          <SatirEylemi href={`/alimlar/${alim.id}/duzenle`} ikon={Pencil} etiket={ortak("duzenle")} />
        ) : null}
        {!iptalli ? (
          <AlimIptalButonu
            alimId={alim.id}
            kod={alim.code}
            malKabulVar={malKabulVar}
          />
        ) : null}
        {kabulEdilebilir ? (
          <SatirEylemi href={`/alimlar/${alim.id}/mal-kabul`} ikon={PackageCheck} etiket={t("malKabul")} birincil />
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
            {ortak("kayitSayisi", { sayi: alimlar.length })}
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

      <form action="/alimlar" className="flex flex-wrap items-end gap-2">
        {/* Açık süzgeçler arama gönderiminde kaybolmasın. */}
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
            <Link href={suzgecAdresi("/alimlar", p, { q: "" })}>
              {ortak("temizle")}
            </Link>
          </Button>
        ) : null}
      </form>

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

      {alimlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {suzgecVar ? t("bosFiltreBaslik") : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {suzgecVar ? t("bosFiltreIpucu") : t("bosIpucu")}
          </p>
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
                  {/* Kalem sayısı tutarın altında — ayrı sütun 50px yiyordu. */}
                  <TableHead>{ortak("toplam")}</TableHead>
                  <TableHead>{ortak("kart")}</TableHead>
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
                            <Baglanti href={`/alimlar/${alim.id}`}>
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
                    <TableCell className="whitespace-nowrap">
                      <IkiSatir
                        ust={toplamMetni(alim)}
                        alt={t("kalemSayisi", { sayi: alim.items.length })}
                      />
                    </TableCell>
                    <TableCell>
                      {/* Kart etiketi serbest metin ("Şaban Akçalı Bonus") ve
                          27 karaktere kadar çıkıyor; son dört hane altta. */}
                      {alim.creditCard ? (
                        <IkiSatir
                          enGenis="max-w-[7.5rem]"
                          ust={alim.creditCard.label}
                          ustIpucu={alim.creditCard.label}
                          alt={`••${alim.creditCard.last4}`}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {durumEtiketleri[alim.status]}
                      </Badge>
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
                    <Baglanti href={`/alimlar/${alim.id}`}>
                      {alim.code}
                    </Baglanti>
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
                      <Badge variant="secondary">
                        {durumEtiketleri[alim.status]}
                      </Badge>
                    ),
                  },
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
        </>
      )}
    </div>
  );
}
