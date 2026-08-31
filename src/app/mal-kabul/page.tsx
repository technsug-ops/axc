import { getTranslations } from "next-intl/server";
import { PackageCheck } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { UzunAd } from "@/components/uzun-ad";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bicimlendirici } from "@/lib/bicim";
import { pencereCoz } from "@/lib/liste-suzgeci";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

export async function generateMetadata() {
  const t = await getTranslations("KabulListesi");
  return { title: t("baslik") };
}

/**
 * ============================================================================
 *  GÜNÜN GİRİŞLERİ — MAL KABUL LİSTESİ (K112a, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: panelin "Mal kabul" sayısına tıklayınca açılan liste. Sayı
 *  ile liste AYNI gövdeden süzülüyor (`panel/kabul-sayimi.ts` → `kabulKosulu`)
 *  — iki yerde iki koşul olsaydı rakam "12" derken liste 9 satır gösterirdi.
 *
 *  ── ⚠ NİYE `/alimlar` YETMEDİ ───────────────────────────────────────────
 *  O ekran ALIM düzeyinde (bir sipariş = bir satır) ve `purchasedAt` süzüyor.
 *  Buradaki soru VARYANT düzeyinde: _"bugün depoya hangi ürünler girdi ve
 *  satışa açık mı"_. Aynı ekrana iki granülerlik sıkıştırmak, ikisini de
 *  bozardı.
 *
 *  ── ⛔ ROZET YALNIZ İKİ ŞEY SÖYLER: "KOD VAR" / "KOD YOK" ────────────────
 *  "Satışta", "aktif", "yayında" gibi kelimeler YASAK — ve bu bir üslup
 *  tercihi değil, ÖLÇÜLMÜŞ bir sınır. Pazaryerinin listeleme durumu
 *  sistemde YOK: TY istemcisinde ürün ucu çağrılmıyor, HB ve N11 için
 *  hiçbir API bağlantısı yok (K112 §2). `ChannelSku.isActive` BİZİM
 *  bayrağımız ve vekil olarak gösterilmesi yanlış söz olurdu.
 *  _(Anayasa: "kolon başlığı bir iddiadır — vekil alan gösterilmez".)_
 *
 *  ⚠ VE ÖLÇÜM BU SINIRI HAKLI ÇIKARDI: TY ürün ucu tek sayfada denendi,
 *  eşleşen 42 üründen **15'ine TY `onSale=false`** diyordu — yani "kodu
 *  var" ile "satışta" apayrı şeyler. (13'ünde bizde de stok yoktu; yalnız
 *  2'sinde raf doluydu.)
 *
 *  ── ⚠ GELEN ADET LEDGER'DAN, SİPARİŞ ADEDİNDEN DEĞİL ────────────────────
 *  `PurchaseItem.quantity` BEKLENEN adettir; hasarlı gelen ya da eksik
 *  gelen mal onu tutmaz. Fiilen giren adet `PURCHASE_IN` hareketlerinin
 *  toplamıdır ve tek doğruluk kaynağı ledger'dır (bkz. `PurchaseItem`
 *  şemasındaki not: "gelen sağlam adedi BİLEREK kolon olarak tutulmuyor").
 * ============================================================================
 */
export default async function MalKabulSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    pencere?: string;
    baslangic?: string;
    bitis?: string;
  }>;
}) {
  await sayfaIzni("alim.gor");

  const p = await searchParams;
  const t = await getTranslations("KabulListesi");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const pencere = pencereCoz(p);

  /**
   * ⚠ İPTAL DIŞARIDA — panel sayısı da iptalliyi seriye almıyor. İkisi
   * ayrışsaydı "sayı 12, listede 11 satır" olurdu.
   */
  const hareketler = await prisma.stockMovement.findMany({
    where: {
      type: "PURCHASE_IN",
      purchaseItem: {
        purchase: {
          status: { not: "CANCELLED" },
          ...(pencere.aralik ? { receivedAt: pencere.aralik } : {}),
          /** Süzgeç kapalıyken bile kabul edilmemiş alım listeye girmez. */
          ...(pencere.aralik ? {} : { receivedAt: { not: null } }),
        },
      },
    },
    select: {
      quantityDelta: true,
      variantId: true,
      purchaseItem: { select: { purchase: { select: { receivedAt: true } } } },
    },
  });

  /** Varyant başına toplanır — aynı ürün birden çok alımda gelmiş olabilir. */
  const toplamlar = new Map<string, { adet: number; sonKabul: Date | null }>();
  for (const h of hareketler) {
    const onceki = toplamlar.get(h.variantId) ?? { adet: 0, sonKabul: null };
    const kabul = h.purchaseItem?.purchase.receivedAt ?? null;
    toplamlar.set(h.variantId, {
      adet: onceki.adet + h.quantityDelta,
      sonKabul:
        kabul && (!onceki.sonKabul || kabul > onceki.sonKabul)
          ? kabul
          : onceki.sonKabul,
    });
  }

  const idler = [...toplamlar.keys()];
  const [varyantlar, kanalKayitlari] = await Promise.all([
    prisma.productVariant.findMany({
      where: { id: { in: idler } },
      select: {
        id: true,
        sku: true,
        barcode: true,
        product: { select: { name: true } },
        location: { select: { code: true } },
        channelSkus: {
          select: {
            isActive: true,
            channelAccount: { select: { channel: { select: { code: true } } } },
          },
        },
      },
    }),
    /**
     * ⚠ ROZET SÜTUNLARI VERİDEN — sabit kod değil. Anayasa: firma/kanal
     * adları sistemin YAPISINA gömülmez. Yalnız AKTİF HESABI olan kanallar
     * geliyor; 11 kanalın hepsine sütun açmak ekranı okunmaz yapardı.
     */
    prisma.channel.findMany({
      where: { isActive: true, accounts: { some: { isActive: true } } },
      select: { code: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const satirlar = varyantlar
    .map((v) => {
      const o = toplamlar.get(v.id)!;
      const kodluKanallar = new Set(
        v.channelSkus
          .filter((c) => c.isActive)
          .map((c) => c.channelAccount.channel.code),
      );
      return { varyant: v, adet: o.adet, sonKabul: o.sonKabul, kodluKanallar };
    })
    /** En çok gireni üste — depocunun ilgilendiği sıra. */
    .sort((a, b) => b.adet - a.adet);

  const toplamAdet = satirlar.reduce((t, s) => t + s.adet, 0);
  /** ⚠ AÇIK SIFIR: kaç üründe kod eksiği var, ekranda YAZAR. */
  const eksikliOlan = satirlar.filter(
    (s) => s.kodluKanallar.size < kanalKayitlari.length,
  ).length;

  const aralikMetni = pencere.pencere
    ? `${bicim.tarih(pencere.pencere.baslangic)} — ${bicim.tarih(pencere.pencere.sonGun)}`
    : t("tumZaman");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <PackageCheck className="size-6" aria-hidden />
          {t("baslik")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("kapsam", { aralik: aralikMetni })}
        </p>
      </div>

      {/*
        ⚠ İLKE #15 — TEK TEK GÖSTERİLEN YERDE TOPLAM DA OLUR. Ve toplam
        SÜZGECİN tamamının toplamıdır: bu ekran sayfalamıyor, yani görünen
        neyse toplam odur.
      */}
      <div className="flex flex-wrap gap-3">
        <IstatistikKutusu etiket={t("urunSayisi")} cocuk={satirlar.length} />
        <IstatistikKutusu etiket={t("gelenAdet")} cocuk={toplamAdet} bas />
        <IstatistikKutusu etiket={t("kodEksigi")} cocuk={eksikliOlan} />
      </div>

      {satirlar.length === 0 ? (
        /** ⚠ SESSİZ BOŞLUK YASAK (İlke #5): niye boş olduğu yazar. */
        <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          {t("bosMesaj")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ortak("barkod")}</TableHead>
                <TableHead>{ortak("urun")}</TableHead>
                <TableHead className="text-right">{t("gelenAdet")}</TableHead>
                <TableHead>{t("raf")}</TableHead>
                {kanalKayitlari.map((k) => (
                  <TableHead key={k.code}>{k.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {satirlar.map((s) => (
                <TableRow key={s.varyant.id}>
                  <TableCell>
                    {/* İlke #4 — kod niteliğindeki her değer tek tıkla kopyalanır. */}
                    {s.varyant.barcode ? (
                      <KopyalanabilirKod
                        deger={s.varyant.barcode}
                        etiket={ortak("barkod")}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Baglanti href={`/kart/${s.varyant.id}`}>
                      <UzunAd metin={s.varyant.product.name} />
                    </Baglanti>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.adet}
                  </TableCell>
                  <TableCell>
                    {s.varyant.location ? (
                      <Badge variant="secondary">
                        {s.varyant.location.code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {kanalKayitlari.map((k) => {
                    const kodVar = s.kodluKanallar.has(k.code);
                    return (
                      <TableCell key={k.code}>
                        {kodVar ? (
                          <Badge variant="secondary">{t("kodVar")}</Badge>
                        ) : (
                          /*
                            ⚠ EKSİK ROZET TIKLANABİLİR — ve nereye gittiği
                            GÖRÜNÜR (İlke #1, #2). Kanal SKU ekranına, o
                            ürünün barkoduyla süzülmüş hâlde gider; oradaki
                            "Yeni eşleme" formu ürünü hazır bulur.
                          */
                          <Baglanti
                            href={`/kanal-sku?q=${encodeURIComponent(
                              s.varyant.barcode ?? s.varyant.sku,
                            )}&ekle=${s.varyant.id}`}
                          >
                            <Badge variant="outline">{t("kodYok")}</Badge>
                          </Baglanti>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
