import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IstatistikKutusu, PayCubugu } from "@/components/istatistik-kutusu";
import { bicimlendirici } from "@/lib/bicim";
import type { Pencere } from "@/lib/donem";
import { KALEM_GECERLI } from "@/lib/kalem-gecerli";
import { abcSiniflari, ABC_SINIRLARI, devirHizi, maliyetSurucuculeri, oranVeyaBos, stokGunu } from "@/lib/panel/bi";
import { abcAdresi, abcGirdileriniYukle, type AbcKapsami } from "@/lib/panel/abc-kumesi";
import { prisma } from "@/lib/prisma";
import { suzgecAdresi } from "@/lib/suzgec";
import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  PANEL — İŞ ZEKÂSI BLOKLARI (Algoritmo kıyası, kullanıcı kararı 07.10.2026)
 * ----------------------------------------------------------------------------
 *  «Algoritmo'da olup bizde olmayanlardan değerli olanları içeri al.» Üç kart:
 *   · PARANIN DAĞILIMI — kesinti kodu başına cirodaki pay (Algoritmo «Cost
 *     Driver»; analiz §6.2). Kodların adı sözlükteki `Kesinti` ad alanından.
 *   · ABC — satış payına göre A/B/C + dönemde hiç satmayan stoklu ürünler.
 *   · STOK VERİMİ — devir hızı, stok kaç gün yeter, ortalama sipariş tutarı,
 *     adet başına NET-2; kanal başına ortalama sipariş tutarı.
 *  ⚠ Hesap saf gövdede (`lib/panel/bi.ts`); burası yalnız okur ve çizer.
 *  ⚠ Panel ile AYNI küme: dönem penceresi, iptal edilmemiş satış, kaldırılmamış
 *  kalem (`KALEM_GECERLI`), seçili kanal ve para birimi.
 *  ⚠ Maliyet tabanı KDV DAHİL (FIFO partisi öyle saklıyor); stok değeri de
 *  aynı tabandan — devir hızı ve stok günü tutarlı tabanla bölünür.
 *  ⚠ Kâr içerir: yalnız `satis.kar.gor` iznine çizilir (çağıran kapılar).
 * ============================================================================
 */
export async function PanelBi({
  donem,
  kanal,
  para,
  an,
  listeParametreleri,
}: {
  donem: Pencere;
  kanal: string | null;
  para: Currency;
  an: Date;
  /**
   * RAKAM KAYNAĞINA GÖTÜRÜR (İlke #16, kullanıcı 09.10.2026): Satışlar listesinin
   * süzgeci — panelin ÇÖZÜLMÜŞ dönemi + seçili kanal (`kargosuz` kutusuyla aynı
   * kalıp). Ölçüldü (demo, son 30 gün): ciro ₺1.245.440,08 · 378 sipariş · 380 adet ·
   * kanal 259/118/1 — panel = liste.
   */
  listeParametreleri: Record<string, string | undefined>;
}) {
  const t = await getTranslations("PanelBi");
  const tk = await getTranslations("Kesinti");
  const bicim = await bicimlendirici();

  const satisKosulu = {
    soldAt: { gte: donem.baslangic, lt: donem.bitisHaric },
    iptalTarihi: null,
    ...(kanal ? { channelAccount: { channel: { code: kanal } } } : {}),
  };
  /* ABC + stok değeri ORTAK YÜKLEYİCİDEN (09.10.2026) — tıklanınca açılan liste
     (`/urunler?abc=…`) aynı gövdeyi çağırır; ikisi ayrı hesaplasaydı «sayı = liste»
     sözü sessizce bozulabilirdi. */
  const abcKapsami: AbcKapsami = { baslangic: donem.baslangic, bitisHaric: donem.bitisHaric, para, kanal };
  const [satislar, kesintiler, abcVerisi] = await Promise.all([
    prisma.sale.findMany({
      /* İptal süzgeci AÇIKÇA (iptal:bekci tanısın) — `satisKosulu` zaten taşıyor; tekrar zararsız. */
      where: { ...satisKosulu, iptalTarihi: null },
      select: {
        net1Amount: true,
        net2Amount: true,
        profitStatus: true,
        channelAccount: { select: { channel: { select: { code: true, name: true } } } },
        items: {
          where: { ...KALEM_GECERLI },
          select: { quantity: true, unitPriceAmount: true, unitPriceCurrency: true, variant: { select: { productId: true } } },
        },
      },
    }),
    prisma.saleFee.findMany({
      where: {
        sale: satisKosulu,
        currency: para,
        // Sipariş başına kesintide `saleItemId` NULL — `is` onu sessizce elerdi.
        OR: [{ saleItemId: null }, { saleItem: { is: { ...KALEM_GECERLI } } }],
      },
      select: { code: true, amount: true, sale: { select: { profitStatus: true } } },
    }),
    abcGirdileriniYukle(prisma, abcKapsami),
  ]);

  /* ── Stok değeri (bugün): açık partilerin kalanı × birim maliyeti — ortak yükleyiciden ── */
  const toplamStokDegeri = abcVerisi.toplamStokDegeri;

  /* ── Ciro, sipariş, adet — seçili para biriminin kalemleri ── */
  let ciro = 0;
  let siparis = 0;
  let net2 = 0;
  let net1 = 0;
  let hesaplanmayanCiro = 0;
  let net2Adet = 0;
  const kanalOzeti = new Map<string, { ad: string; ciro: number; siparis: number }>();
  for (const s of satislar) {
    const kalemler = s.items.filter((k) => k.unitPriceCurrency === para);
    if (kalemler.length === 0) continue;
    const tutar = kalemler.reduce((tp, k) => tp + Number(k.unitPriceAmount) * k.quantity, 0);
    ciro += tutar;
    siparis += 1;
    const kn = s.channelAccount.channel;
    const ko = kanalOzeti.get(kn.code) ?? { ad: kn.name, ciro: 0, siparis: 0 };
    ko.ciro += tutar;
    ko.siparis += 1;
    kanalOzeti.set(kn.code, ko);
    // NET-2 yalnız HESAPLANMIŞ satışta (anayasa: NO_COST/RULE_MISSING NET taşımaz).
    if (s.profitStatus === "CALCULATED" && s.net2Amount !== null && s.net1Amount !== null) {
      net2 += Number(s.net2Amount);
      net1 += Number(s.net1Amount);
      net2Adet += kalemler.reduce((a, k) => a + k.quantity, 0);
    } else {
      // Kârı hesaplanmamış satış ciroda VAR, NET'te YOK — dağılımda ayrı satır.
      hesaplanmayanCiro += tutar;
    }
  }

  /* Dağılım yalnız KÂRI HESAPLANMIŞ satışların kesintisinden: hesaplanmayan
     satış cirosuyla ayrı satırda durur — kesintisi de buraya girseydi aynı satış
     iki kez sayılırdı. Satılan malın maliyeti (devir/gün) ise BÜTÜN satışlardan. */
  const suruculer = maliyetSurucuculeri(
    ciro,
    kesintiler.filter((k) => k.sale.profitStatus === "CALCULATED").map((k) => ({ kod: k.code, tutar: Number(k.amount) })),
  );
  const smm = kesintiler.filter((k) => k.code === "MALIYET").reduce((a, k) => a + Number(k.amount), 0);
  /* Geçen gün: pencere bugünü aşıyorsa (bu ay) bugüne kadar sayılır. */
  const bitis = Math.min(donem.bitisHaric.getTime(), an.getTime());
  const gunSayisi = Math.max(1, Math.round((bitis - donem.baslangic.getTime()) / 86_400_000));
  const devir = devirHizi(smm, toplamStokDegeri);
  const gun = stokGunu(toplamStokDegeri, smm, gunSayisi);
  const aov = oranVeyaBos(ciro, siparis);
  const adetBasinaNet2 = oranVeyaBos(net2, net2Adet);

  const abc = abcSiniflari(abcVerisi.girdiler);

  const tl = (n: number) => bicim.para(n, para);
  /* Kaynak adresleri — Satışlar listesi ve envanter (stok değeri envanterin «Ödenen
     (KDV dahil)» toplamıyla AYNI, ölçüldü 09.10: ₺2.502.671,99). */
  const satisListesi = (ek: Record<string, string | undefined> = {}) => suzgecAdresi("/satislar", listeParametreleri, ek);
  const hesaplananlar = satisListesi({ kar: "tam" });
  const kaynak = "text-primary underline-offset-4 hover:underline";
  const kesintiAdi = (kod: string) => (tk.has(kod) ? tk(kod) : kod);
  const yok = t("hesaplanamaz");

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      {/* ── PARANIN DAĞILIMI ── */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{t("dagilimBaslik")}</CardTitle>
          <p className="text-muted-foreground text-xs">
            <Link href={satisListesi()} className={kaynak}>{t("dagilimNotu", { ciro: tl(ciro) })}</Link>
          </p>
        </CardHeader>
        <CardContent>
          {suruculer.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("veriYok")}</p>
          ) : (
            <ul className="space-y-2">
              {suruculer.map((s) => (
                <li key={s.kod} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="truncate">{kesintiAdi(s.kod)}</span>
                  <PayCubugu oran={s.pay ?? 0} etiket={s.pay === null ? yok : bicim.yuzde(s.pay * 100)} />
                  <Link href={hesaplananlar} className={`tabular-nums ${kaynak}`}>{tl(s.tutar)}</Link>
                </li>
              ))}
              {/* ÖDENECEK KDV = NET-1 − NET-2 (anayasa: NET-2, NET-1'den ödenecek KDV düşülmüş).
                  Bu satır olmadan kesintiler + NET-2 ciroya tamamlanmıyordu (ölçüldü 07.10: %5 açık). */}
              <li className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                <span className="truncate">{t("odenecekKdv")}</span>
                <PayCubugu oran={oranVeyaBos(net1 - net2, ciro) ?? 0} etiket={ciro > 0 ? bicim.yuzde(((net1 - net2) / ciro) * 100) : yok} />
                <Link href={hesaplananlar} className={`tabular-nums ${kaynak}`}>{tl(net1 - net2)}</Link>
              </li>
              {hesaplanmayanCiro > 0 ? (
                <li className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="truncate">{t("hesaplanmayanCiro")}</span>
                  <PayCubugu oran={oranVeyaBos(hesaplanmayanCiro, ciro) ?? 0} etiket={bicim.yuzde((hesaplanmayanCiro / ciro) * 100)} />
                  <Link href={satisListesi({ kar: "eksik" })} className={`tabular-nums ${kaynak}`}>{tl(hesaplanmayanCiro)}</Link>
                </li>
              ) : null}
              <li className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 border-t pt-2 text-sm font-medium">
                <span>{t("net2Kalan")}</span>
                <PayCubugu oran={Math.max(0, oranVeyaBos(net2, ciro) ?? 0)} etiket={ciro > 0 ? bicim.yuzde((net2 / ciro) * 100) : yok} />
                <Link href={hesaplananlar} className={`tabular-nums ${kaynak}`}>{tl(net2)}</Link>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── ABC ── */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <Link href="/rapor/urunler" className="underline-offset-4 hover:underline">{t("abcBaslik")}</Link>
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            {t("abcNotu", { a: bicim.yuzde(ABC_SINIRLARI.A * 100, 0), b: bicim.yuzde(ABC_SINIRLARI.B * 100, 0) })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs">
                  <th className="py-1 pr-2 font-medium">{t("abcSinif")}</th>
                  <th className="py-1 pr-2 text-right font-medium">{t("abcUrun")}</th>
                  <th className="py-1 pr-2 font-medium">{t("abcCiroPayi")}</th>
                  <th className="py-1 text-right font-medium">{t("abcStokDegeri")}</th>
                </tr>
              </thead>
              <tbody>
                {(["A", "B", "C", "SATISSIZ"] as const).map((k) => (
                  <tr key={k} className="border-t">
                    <td className="py-2 pr-2">
                      {/* SATIR KAYNAĞINA GÖTÜRÜR (İlke #16, kullanıcı 09.10.2026): sınıfın
                          ürünleri Ürünler listesinde, panelle AYNI kapsamla (`abcAdresi`).
                          Sıfır satır bağlantı OLMAZ — boş listeye götürmez. */}
                      {abc[k].urunSayisi > 0 ? (
                        <Link
                          href={abcAdresi(k, abcKapsami)}
                          aria-label={t("abcListeyiAc", { sinif: k === "SATISSIZ" ? t("abcSatissiz") : k, sayi: abc[k].urunSayisi })}
                          className="text-primary inline-flex min-h-11 items-center underline-offset-4 hover:underline md:min-h-7"
                        >
                          <AbcRozeti k={k} />
                          {k === "SATISSIZ" ? <span className="ml-2 text-xs">{t("abcSatissiz")}</span> : null}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center">
                          <AbcRozeti k={k} />
                          {k === "SATISSIZ" ? <span className="text-muted-foreground ml-2 text-xs">{t("abcSatissiz")}</span> : null}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {abc[k].urunSayisi > 0 ? (
                        <Link href={abcAdresi(k, abcKapsami)} className="text-primary underline-offset-4 hover:underline">
                          {abc[k].urunSayisi}
                        </Link>
                      ) : (
                        abc[k].urunSayisi
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {k === "SATISSIZ" ? (
                        <span className="text-muted-foreground text-xs">{t("abcCiroYok")}</span>
                      ) : (
                        <PayCubugu oran={abc[k].ciroPayi ?? 0} etiket={abc[k].ciroPayi === null ? yok : bicim.yuzde(abc[k].ciroPayi! * 100)} />
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">{tl(abc[k].stokDegeri)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── STOK VERİMİ + SİPARİŞ ── */}
      <Card className="min-w-0 xl:col-span-2">
        <CardHeader>
          <CardTitle>{t("verimBaslik")}</CardTitle>
          <p className="text-muted-foreground text-xs">{t("verimNotu", { gun: gunSayisi })}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <IstatistikKutusu
              etiket={t("devirHizi")}
              cocuk={devir === null ? yok : t("katSayisi", { kat: bicim.sayi(devir, 2) })}
              altNot={<Link href="/envanter-degeri" className={kaynak}>{t("devirNotu", { stok: tl(toplamStokDegeri), smm: tl(smm) })}</Link>}
            />
            <IstatistikKutusu
              etiket={t("stokGunu")}
              cocuk={gun === null ? yok : t("gunSayisi", { gun: bicim.sayi(gun, 0) })}
              altNot={<Link href="/envanter-degeri" className={kaynak}>{t("stokGunuNotu")}</Link>}
            />
            <IstatistikKutusu
              etiket={t("aov")}
              cocuk={aov === null ? yok : tl(aov)}
              altNot={<Link href={satisListesi()} className={kaynak}>{t("aovNotu", { siparis })}</Link>}
            />
            <IstatistikKutusu
              etiket={t("adetBasinaNet2")}
              cocuk={adetBasinaNet2 === null ? yok : tl(adetBasinaNet2)}
              altNot={<Link href={hesaplananlar} className={kaynak}>{t("adetBasinaNet2Notu", { adet: net2Adet })}</Link>}
            />
          </div>
          {kanalOzeti.size > 0 ? (
            <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[...kanalOzeti.entries()].map(([kod, k]) => (
                <li key={kod}>
                  <Link
                    href={satisListesi({ kanal: kod })}
                    className="hover:bg-accent/50 flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <span className="text-primary truncate underline-offset-4">{k.ad}</span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {t("kanalAov", { tutar: tl(k.ciro / k.siparis), siparis: k.siparis })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

/** ABC sınıf rozeti — bağlantılı ve bağlantısız satırda AYNI çizim. */
function AbcRozeti({ k }: { k: "A" | "B" | "C" | "SATISSIZ" }) {
  return (
    <span className={`inline-grid size-7 place-items-center rounded-full text-xs font-semibold ${k === "A" ? "bg-[var(--se-kar-bg)] text-[var(--se-kar)]" : k === "B" ? "bg-[var(--se-bil-bg)] text-[var(--se-bil-ink)]" : k === "C" ? "bg-[var(--se-zarar-bg)] text-[var(--se-zarar)]" : "bg-muted text-muted-foreground"}`}>
      {k === "SATISSIZ" ? "—" : k}
    </span>
  );
}
