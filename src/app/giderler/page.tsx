import Link from "next/link";
import { sayfaIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";
import { BarChart3, Pencil, Plus, Repeat } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { ayKaydir, gunDegeri, isTakvimGunu } from "@/lib/donem";
import { odemeMetni } from "@/lib/gider-odemesi";
import { kdvAyir } from "@/lib/kar";
import { prisma } from "@/lib/prisma";

import { GiderFiltresi, type AySecenegi } from "./filtre";
import { SilButonu } from "./sil-butonu";

import type { Currency } from "@/generated/prisma/enums";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("giderler") };
}

/** "2026-08" -> { yil, ay }. Bozuksa null. */
function ayCoz(metin: string): { yil: number; ay: number } | null {
  const eslesme = /^(\d{4})-(\d{2})$/.exec(metin);
  if (!eslesme) return null;
  const yil = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  if (ay < 1 || ay > 12) return null;
  return { yil, ay };
}

export default async function GiderlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ ay?: string; kategori?: string }>;
}) {
  await sayfaIzni("gider.yaz");

  const { ay: ayParam, kategori: kategoriParam } = await searchParams;
  const t = await getTranslations("Gider");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const bugun = isTakvimGunu(new Date());

  // Son 12 ay — filtrede seçilebilecek dönemler.
  const aylar: AySecenegi[] = Array.from({ length: 12 }, (_, sira) => {
    const { yil, ay } = ayKaydir(bugun.yil, bugun.ay, -sira);
    const tarih = gunDegeri({ yil, ay, gun: 1 });
    return {
      deger: `${yil}-${String(ay).padStart(2, "0")}`,
      etiket: bicim.ayYil(tarih),
    };
  });

  const seciliAy = ayParam && ayCoz(ayParam) ? ayParam : "";
  const seciliKategori = kategoriParam ?? "";

  const ayAraligi = seciliAy ? ayCoz(seciliAy) : null;
  const tarihFiltresi = ayAraligi
    ? {
        gte: gunDegeri({ yil: ayAraligi.yil, ay: ayAraligi.ay, gun: 1 }),
        lt: gunDegeri({
          ...ayKaydir(ayAraligi.yil, ayAraligi.ay, 1),
          gun: 1,
        }),
      }
    : undefined;

  const [kayitlar, kategoriKayitlari] = await Promise.all([
    prisma.expense.findMany({
      where: {
        ...(tarihFiltresi ? { spentAt: tarihFiltresi } : {}),
        ...(seciliKategori ? { categoryId: seciliKategori } : {}),
      },
      include: {
        category: { select: { name: true, isFixed: true } },
        template: { select: { name: true } },
        /** Ödeme satırında kartın ADI görünsün — "cuid" hiçbir şey söylemez. */
        creditCard: { select: { label: true } },
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.expenseCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const filtreVar = Boolean(seciliAy || seciliKategori);

  /** Her satırın KDV'si ve gerçek net'ten düşen kısmı. */
  function parcala(kayit: (typeof kayitlar)[number]) {
    const tutar = Number(kayit.amount.toString());
    const oran = Number(kayit.vatRate.toString());
    const kdv = kdvAyir(tutar, oran);
    return { tutar, oran, kdv, netDusen: tutar - kdv };
  }

  // Toplam şeridi — para birimleri AYRI toplanır, çevrilmez.
  const seritHaritasi = new Map<
    Currency,
    { adet: number; kdvDahil: number; kdv: number; netDusen: number }
  >();
  for (const kayit of kayitlar) {
    const { tutar, kdv, netDusen } = parcala(kayit);
    const mevcut = seritHaritasi.get(kayit.currency) ?? {
      adet: 0,
      kdvDahil: 0,
      kdv: 0,
      netDusen: 0,
    };
    mevcut.adet++;
    mevcut.kdvDahil += tutar;
    mevcut.kdv += kdv;
    mevcut.netDusen += netDusen;
    seritHaritasi.set(kayit.currency, mevcut);
  }
  const serit = [...seritHaritasi.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  function aciklamaMetni(kayit: (typeof kayitlar)[number]) {
    return kayit.description ?? kayit.template?.name ?? t("aciklamaYok");
  }

  /**
   * ÖDEME YÖNTEMİ SATIRI.
   *
   * ⚠ METİN GÖVDESİ ORTAK (`lib/gider-odemesi.ts`) — Excel dışa aktarma da
   * aynı gövdeyi çağırır. Ayrı yazılsalardı liste bir şey, inen dosya başka
   * şey söylerdi.
   *
   * ⚠ VE SÜTUN AÇILMADI. Bu tablo zaten 8 sütunla tavanın (7) üstünde;
   * dokuzuncu sütun sayfayı yatay kaydırırdı (bkz. yerlesim:dogrula).
   * Bilgi, ilişkili olduğu açıklama hücresinin ikinci satırına kondu.
   */
  const odemeMetinleri = {
    nakit: t("odemeNakit"),
    havale: t("odemeHavale"),
    kart: t("odemeKart"),
    belirtilmedi: t("odemeYontemiBelirtilmedi"),
    taksit: (adet: number) => t("taksitOzet", { adet }),
  };

  function odemeSatiri(kayit: (typeof kayitlar)[number]) {
    return odemeMetni(
      {
        odemeYontemi: kayit.odemeYontemi,
        kartAdi: kayit.creditCard?.label ?? null,
        installmentCount: kayit.installmentCount,
      },
      odemeMetinleri,
    );
  }

  function eylemler(kayit: (typeof kayitlar)[number]) {
    const { tutar } = parcala(kayit);
    return (
      <>
        <SatirEylemi href={`/giderler/${kayit.id}/duzenle`} ikon={Pencil} etiket={ortak("duzenle")} />
        <SilButonu
          giderId={kayit.id}
          aciklama={aciklamaMetni(kayit)}
          tutar={bicim.para(tutar, kayit.currency)}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {t("aciklamaMetni")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExcelIndir
            liste="giderler"
            parametreler={{ ay: seciliAy, kategori: seciliKategori }}
          />
          <Button variant="outline" asChild>
            <Link href="/rapor">
              <BarChart3 />
              {t("rapora")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/giderler/sablonlar">
              <Repeat />
              {t("sablonlar")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/giderler/yeni">
              <Plus />
              {t("yeniGider")}
            </Link>
          </Button>
        </div>
      </div>

      <GiderFiltresi
        aylar={aylar}
        kategoriler={kategoriKayitlari.map((k) => ({ id: k.id, ad: k.name }))}
        seciliAy={seciliAy}
        seciliKategori={seciliKategori}
      />

      {/* -------------------------- TOPLAM ŞERİDİ -------------------------- */}
      {serit.length > 0 ? (
        <div className="space-y-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {serit.map(([paraBirimi, toplam]) => (
              <div key={paraBirimi} className="space-y-2 rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {ortak("kayitSayisi", { sayi: toplam.adet })} · {paraBirimi}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <div>
                    <div className="text-muted-foreground text-xs">
                      {t("toplamKdvDahil")}
                    </div>
                    <div className="text-lg font-semibold">
                      {bicim.para(toplam.kdvDahil, paraBirimi)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">
                      {t("indirilebilirKdv")}
                    </div>
                    <div className="text-sm font-medium">
                      {bicim.para(toplam.kdv, paraBirimi)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">
                      {t("netDusenToplam")}
                    </div>
                    <div className="text-sm font-medium">
                      {bicim.para(toplam.netDusen, paraBirimi)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{t("seritNotu")}</p>
        </div>
      ) : null}

      {kayitlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {filtreVar ? t("bosFiltreBaslik") : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {filtreVar ? t("bosFiltreIpucu") : t("bosIpucu")}
          </p>
          {!filtreVar ? (
            <Button className="mt-4" asChild>
              <Link href="/giderler/yeni">
                <Plus />
                {t("yeniGider")}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("tarih")}</TableHead>
                  <TableHead>{ortak("kategori")}</TableHead>
                  <TableHead>{ortak("aciklama")}</TableHead>
                  <TableHead className="text-right">{ortak("tutar")}</TableHead>
                  <TableHead className="text-right">{ortak("oran")}</TableHead>
                  <TableHead className="text-right">{t("sutunKdv")}</TableHead>
                  <TableHead className="text-right">
                    {t("sutunNetDusen")}
                  </TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kayitlar.map((kayit) => {
                  const { tutar, oran, kdv, netDusen } = parcala(kayit);
                  return (
                    <TableRow key={kayit.id}>
                      <TableCell className="whitespace-nowrap">
                        {bicim.tarih(kayit.spentAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{kayit.category.name}</span>
                          <Badge variant="outline">
                            {kayit.category.isFixed
                              ? t("sabit")
                              : t("degisken")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-64">
                        <span className="block truncate">
                          {aciklamaMetni(kayit)}
                        </span>
                        <span className="block truncate text-xs">
                          {odemeSatiri(kayit)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {bicim.para(tutar, kayit.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right">
                        %{oran}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right whitespace-nowrap">
                        {bicim.para(kdv, kayit.currency)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {bicim.para(netDusen, kayit.currency)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <SatirEylemleri>{eylemler(kayit)}</SatirEylemleri>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {kayitlar.map((kayit) => {
              const { tutar, oran, kdv, netDusen } = parcala(kayit);
              return (
                <ListeKarti
                  key={kayit.id}
                  baslik={
                    <span className="flex flex-wrap items-center gap-2">
                      {kayit.category.name}
                      <Badge variant="outline">
                        {kayit.category.isFixed ? t("sabit") : t("degisken")}
                      </Badge>
                    </span>
                  }
                  altBaslik={`${bicim.tarih(kayit.spentAt)} · ${aciklamaMetni(kayit)}`}
                  alanlar={[
                    {
                      etiket: ortak("tutar"),
                      deger: (
                        <span className="text-base font-semibold">
                          {bicim.para(tutar, kayit.currency)}
                        </span>
                      ),
                    },
                    { etiket: ortak("oran"), deger: `%${oran}` },
                    {
                      etiket: t("sutunKdv"),
                      deger: bicim.para(kdv, kayit.currency),
                    },
                    {
                      etiket: t("sutunNetDusen"),
                      deger: bicim.para(netDusen, kayit.currency),
                    },
                    { etiket: t("sutunOdeme"), deger: odemeSatiri(kayit) },
                  ]}
                  eylemler={eylemler(kayit)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
