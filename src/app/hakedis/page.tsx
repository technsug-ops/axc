import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { CircleCheck, TriangleAlert, Upload } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { ListeyiHatirla } from "@/components/liste-hafizasi-bilesenleri";
import { SekmeliBolum } from "@/components/sekmeli-bolum";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
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
import { isTakvimGunu, gunDegeri } from "@/lib/donem";
import { beklenenHakedis, odemeDurumu } from "@/lib/hakedis/eslestir";
import { HAKEDIS_ESIKLERI, sonrakiOdemeGunu } from "@/lib/hakedis/model";
import { prisma } from "@/lib/prisma";
import { suzgecAdresi } from "@/lib/suzgec";
import { KanalDagilimiGrafigi } from "./kanal-dagilimi-grafigi";
import {
  DURUM_KUTUSU,
  DURUM_YAZISI,
  KANAL_RENGI_VARSAYILAN,
  KANAL_RENKLERI,
} from "@/lib/renkler";

export const dynamic = "force-dynamic";

/**
 * Uzun listelerde gösterilecek en fazla satır. Kesme SESSİZ DEĞİLDİR:
 * sınırı aşan her listede kaç kalemin gösterilmediği yazar.
 */
const LISTE_SINIRI = 100;

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("hakedis") };
}

/**
 * K220/K221 — HANGİ KANALIN HANGİ OTOMATİK İZ ADINI YAZDIĞI BURADA BİR KEZ
 * BEYAN EDİLİR. Haritada OLMAYAN kanal (N11 ve otomasyonu olmayan her kanal)
 * seçiliyken rozet "hiç çalışmadı" der — ki bu DOĞRUDUR: gerçekten otomatik
 * çekim yok, dosya elle yükleniyor. Yeni bir kanalın API çekimi eklendiğinde
 * eklenecek TEK satır burasıdır.
 */
const HAKEDIS_SENKRON_AKSIYONU: Record<string, string> = {
  Trendyol: "TY_HAKEDIS_CEKIM_CALISTI",
  Hepsiburada: "HB_HAKEDIS_CEKIM_CALISTI",
};

export default async function HakedisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kanal?: string; sekme?: string }>;
}) {
  await sayfaIzni("hakedis.gor");

  const t = await getTranslations("Hakedis");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  /**
   * ⚠ "sp" (searchParams), "p" DEĞİL: bu dosyada `p` zaten Settlement
   * kaydını dolaşan iki `.map((p) => …)` çağrısında kullanılıyor — aynı
   * adı burada da kullanmak o döngülerin İÇİNDE searchParams'ı sessizce
   * gölgelerdi.
   */
  const sp = await searchParams;
  const kanalSecili = (sp.kanal ?? "").trim() || undefined;

  /**
   * ═══════════════════════════════════════════════════════════════════════
   *  SEKMELER (K222-⑥, kullanıcı kararı 20.09.2026) — "çok fazla detay,
   *  hiç özet yok". Ekran ikiye bölündü:
   *   ÖZET  → kanal ödemeleri + bekleyen para + kanal dağılımı (panel gibi,
   *           tek bakışta okunur, döküm yok — İlke #13)
   *   DETAY → karşılaştırma/eşleşme/kalem dökümleri (satır sayısı veriyle
   *           büyüyen her şey burada yaşar)
   *  Seçim URL'ye yazılır (`lib/suzgec.ts` ilkesi) ve KANAL SÜZGECİYLE
   *  birlikte taşınır — sekme değiştirince filtre sıfırlanmaz.
   * ═══════════════════════════════════════════════════════════════════════
   */
  const SEKME_OZET = "ozet";
  const SEKME_DETAY = "detay";
  const sekmeSecili = sp.sekme === SEKME_DETAY ? SEKME_DETAY : SEKME_OZET;
  const sekmeAdresi = (anahtar: string) =>
    suzgecAdresi("/hakedis", sp, { sekme: anahtar });

  /** Kanal filtresi — YALNIZ bu iki sorguya (ve satış sorgusuna) uygulanır. */
  const kanalKosulu = kanalSecili
    ? { channelAccount: { channel: { name: kanalSecili } } }
    : {};

  const senkronAksiyonlari = kanalSecili
    ? (HAKEDIS_SENKRON_AKSIYONU[kanalSecili] ? [HAKEDIS_SENKRON_AKSIYONU[kanalSecili]!] : [])
    : Object.values(HAKEDIS_SENKRON_AKSIYONU);

  const [partiler, kalemler, satislar, sonSenkronizasyon, kanalHesaplariVeri] =
    await Promise.all([
      prisma.settlement.findMany({
        where: kanalKosulu,
        include: {
          channelAccount: { include: { channel: { select: { name: true } } } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.settlementItem.findMany({
        where: kanalKosulu,
        include: {
          channelAccount: { include: { channel: { select: { name: true } } } },
          sale: { select: { id: true, code: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      }),
      // Karşılaştırma için: kâr snapshot'ı + maliyet kesintisi.
      prisma.sale.findMany({
        where: {
          // İptal edilen satıştan hakediş beklenmez.
          iptalTarihi: null,
          /**
           * ⛔ CANLI BULGU 20.09.2026: iade edilmiş satış bu karşılaştırmaya
           * GİREMEZ. "Beklenen" alanı `Sale.net1Amount`den okunur ve bu
           * rakam İADE ÖNCESİ kâr hesabıdır (iade, kârı geriye dönük
           * DEĞİŞTİRMEZ — "kâr snapshot'ı geçmişin kaydıdır" ilkesi).
           * Pazaryeri ise iade edilen siparişin parasını GERİ ALIR; hakediş
           * raporunda satış + iade satırları toplanıp NET SIFIRA döner.
           * Karşılaştırma "beklenen ₺1.335 / gerçekleşen ₺0" görüp "eksik
           * ödeme" derdi — oysa ödeme zaten doğru netlenmiş, eksik olan
           * hiçbir şey yok. Bu satışların hakediş takibi `/iadeler`
           * ekranındadır; burada yalnız YANLIŞ ALARM üretirler.
           */
          returns: { none: {} },
          ...kanalKosulu,
        },
        include: {
          channelAccount: { include: { channel: { select: { name: true } } } },
          fees: { where: { code: "MALIYET" }, select: { amount: true } },
        },
        orderBy: { soldAt: "desc" },
      }),
      /**
       * K220/K221 — "SON SENKRONİZASYON NE ZAMAN ÇALIŞTI" rozeti buradan
       * okur. Bu iz DEĞİŞİKLİK olmasa bile her koşumda yazılır (bkz.
       * `canli-ty-hakedis-cekim.ts`/`canli-hb-hakedis-cekim.ts` "kalp
       * atışı") — yoksa sessiz bir "hiçbir şey değişmedi" günü, "hiç
       * çalışmadı" ile karışırdı.
       *
       * ⚠ KANALA GÖRE AYRI: "Tümü" seçiliyken her iki kanalın en yenisi
       * gösterilir; tek kanal seçiliyken YALNIZ o kanalın izi okunur —
       * yoksa Hepsiburada'ya bakarken Trendyol'un senkron saati görünür,
       * ki bu yanlış bir iddia olurdu.
       */
      prisma.auditLog.findFirst({
        where: { action: { in: senkronAksiyonlari } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      /**
       * SÜZGEÇ SEÇENEKLERİ VERİDEN GELİR (İlke #16'nın adres tarafı):
       * `kalemler`den TÜRETİLSEYDİ, bir kanal seçiliyken listede yalnız
       * O kanal kalır ve seçici kendi kendini daraltırdı — kullanıcı bir
       * daha "Tümü"ne dönemeden başka kanalları GÖREMEZDİ. Bu yüzden ayrı,
       * süzgeçten BAĞIMSIZ bir sorgu.
       */
      prisma.settlementItem.findMany({
        distinct: ["channelAccountId"],
        select: { channelAccount: { select: { channel: { select: { name: true } } } } },
      }),
    ]);

  const kanalSecenekleri = [
    ...new Set(kanalHesaplariVeri.map((k) => k.channelAccount.channel.name)),
  ].sort((a, b) => a.localeCompare(b, "tr"));

  const suzgecler: SuzgecTanimi[] = [
    {
      ad: "kanal",
      etiket: ortak("kanal"),
      secenekler: kanalSecenekleri.map((ad) => ({ deger: ad, etiket: ad })),
    },
  ];

  // "Bugün" İŞ saat diliminden — vade karşılaştırması gün-güne yapılır.
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  /**
   * BEKLEYEN PARA: ödeme tarihi olmayan kalemler.
   * Beklenen tutar HENÜZ karşılaştırılmıyor (kâr motoru ile eşleme sonraki
   * iş); bu yüzden EKSIK/FAZLA ödeme durumu üretilmiyor, yalnız
   * bekliyor/gecikti ayrımı yapılıyor.
   */
  const bekleyenler = kalemler
    .filter((k) => k.paidAt === null)
    .map((k) => ({
      kayit: k,
      durum: odemeDurumu({
        beklenenTutar: null,
        gerceklesenTutar: null,
        vade: k.dueDate,
        odendiMi: false,
        bugun,
      }),
    }));

  const geciken = bekleyenler.filter((b) => b.durum === "GECIKTI");

  // Para birimi başına bekleyen toplam.
  const bekleyenToplam = new Map<string, number>();
  for (const b of bekleyenler) {
    const tutar = Number(b.kayit.amount.toString());
    bekleyenToplam.set(
      b.kayit.currency,
      (bekleyenToplam.get(b.kayit.currency) ?? 0) + tutar,
    );
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   *  KANAL DAĞILIMI (görsel destek) — "Bekleyen Para"nın kanal kırılımı.
   * -------------------------------------------------------------------------
   *  ⚠ PASTA, EKRANDAKİ SÜZGECİ İZLER — kendi başına ayrı bir toplam
   *  ÜRETMEZ. Kanal seçiliyken `bekleyenler` zaten o kanala daralmış olur;
   *  pasta o hâlde TEK dilim gösterirdi ve bir dağılımdan söz edilemez —
   *  bu yüzden yalnız BİRDEN FAZLA kanal varken çizilir (sayı=liste ilkesi,
   *  bu kartın kendi ekranındaki karşılığı).
   *
   *  ⚠ TEK PARA BİRİMİ: hakediş bugün fiilen TRY'dir ama ileride EUR
   *  gelirse iki para birimini tek pastada toplamak yanlış bir toplam
   *  üretirdi. Baskın para birimi (varsa TRY) seçilir, ötekiler pastaya
   *  girmez — "Bekleyen Para" kutusu zaten her para birimini AYRI satırda
   *  gösteriyor, pasta onun tekrarı değil YALNIZ görsel destek.
   */
  const anaParaBirimi =
    bekleyenToplam.size === 0
      ? undefined
      : bekleyenToplam.has("TRY")
        ? "TRY"
        : [...bekleyenToplam.keys()][0];

  const kanalDagilimHaritasi = new Map<string, number>();
  if (anaParaBirimi) {
    for (const b of bekleyenler) {
      if (b.kayit.currency !== anaParaBirimi) continue;
      const ad = b.kayit.channelAccount.channel.name;
      kanalDagilimHaritasi.set(
        ad,
        (kanalDagilimHaritasi.get(ad) ?? 0) + Number(b.kayit.amount.toString()),
      );
    }
  }
  const kanalDagilimDilimleri = [...kanalDagilimHaritasi.entries()]
    .map(([ad, tutar]) => ({
      etiket: ad,
      tutar,
      renk: KANAL_RENKLERI[ad] ?? KANAL_RENGI_VARSAYILAN,
    }))
    .sort((a, b) => b.tutar - a.tutar);
  const kanalDagilimToplam = kanalDagilimDilimleri.reduce((t, d) => t + d.tutar, 0);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   *  K220/K222 — KANAL ÖDEME GRUPLAMASI (pazaryerinin kendi paneliyle aynı
   *  mantık: "Ödeme Yapıldı" / "Tahmini Hesaplanmıştır")
   * -------------------------------------------------------------------------
   *  ⛔ KAPSAM: yalnız API'DEN OTOMATİK ÇEKİLEN kanallar (bugün Trendyol +
   *  Hepsiburada — `HAKEDIS_SENKRON_AKSIYONU` ile AYNI küme, iki yerde iki
   *  farklı liste olmasın diye). N11 (ve Excel'den yüklenen her şey) bu
   *  gruplamaya HİÇ girmez; onlar aşağıdaki düz "Bekleyen kalem dökümü"
   *  listesinde kalmaya devam eder.
   *
   *  ⚠ CANLI BULGU 20.09.2026 (kullanıcı): "Gelecek ödemeler" ham `dueDate`
   *  GÜNÜNE göre gruplanıyordu ve ekran sanki HER GÜN bir ödeme varmış gibi
   *  görünüyordu — "bu sıklıkta bir ödeme yok". Gerçek: pazaryeri yalnız
   *  BELİRLİ haftanın günlerinde öder (bkz. `KANAL_ODEME_GUNLERI`). Her
   *  siparişin kendi `dueDate` TAHMİNİ, o kanalın bir SONRAKİ gerçek ödeme
   *  gününe SNAP'lenir (`sonrakiOdemeGunu`) — farklı günlere düşen tahminler,
   *  aynı gerçek ödeme gününe denk geldiklerinde TEK satırda birleşir.
   *
   *  ⚠ GEÇMİŞ (ÖDENMİŞ) TARAFTA GRUPLAMA ANAHTARI KANALA GÖRE DEĞİŞİR:
   *  Trendyol'un API'si gerçek bir `paymentOrderId` veriyor — o kullanılır.
   *  Hepsiburada'nın API'si böyle bir kimlik VERMİYOR (bkz.
   *  `canli-hb-hakedis-cekim.ts`); onun için tek güvenilir gruplama `paidAt`
   *  GÜNÜDÜR — bu tahmin değil, GERÇEKLEŞMİŞ bir tarihtir, uydurma değildir.
   *  İkisi FARKLI kesinlik taşır — rozetler (`odemeEmriNo` var/yok) bunu
   *  ayırt eder.
   */
  const API_KANALLARI = new Set(Object.keys(HAKEDIS_SENKRON_AKSIYONU));
  const apiKalemleri = kalemler.filter((k) =>
    API_KANALLARI.has(k.channelAccount.channel.name),
  );

  type OdemeGrubu = {
    anahtar: string;
    kanalAdi: string;
    tarih: Date;
    toplam: number;
    paraBirimi: string;
    sayi: number;
    /** Yalnız GEÇMİŞ ödemelerde anlamlı: gerçek bir ödeme emri no'su var mı. */
    odemeEmriNo: string | null;
  };

  const gecmisOdemeGruplari = new Map<string, OdemeGrubu>();
  for (const k of apiKalemleri) {
    if (k.paidAt === null) continue;
    const kanalAdi = k.channelAccount.channel.name;
    /**
     * ⛔ İSTANBUL TAKVİM GÜNÜNE NORMALİZE EDİLİR (K222-④, 20.09.2026 canlı
     * bulgusu) — `paidAt` da API'nin ham zaman damgasıdır ve UTC gün sınırı
     * İstanbul'unkiyle uyuşmayabilir (`sonrakiOdemeGunu`daki AYNI hata
     * sınıfı). Anahtar VE gösterilen tarih AYNI normalize değerden gelir,
     * yoksa grup adı ile ekrandaki tarih birbirinden ayrışır.
     */
    const paidGunu = gunDegeri(isTakvimGunu(k.paidAt));
    /** TY: gerçek ödeme emri. HB (ve emri olmayan her kanal): ödeme GÜNÜ. */
    const anahtar = k.paymentOrderId
      ? `EMIR:${k.paymentOrderId}`
      : `${kanalAdi}|GUN:${paidGunu.toISOString().slice(0, 10)}`;
    const g = gecmisOdemeGruplari.get(anahtar) ?? {
      anahtar,
      kanalAdi,
      tarih: paidGunu,
      toplam: 0,
      paraBirimi: k.currency,
      sayi: 0,
      odemeEmriNo: k.paymentOrderId,
    };
    g.toplam += Number(k.amount.toString());
    g.sayi++;
    if (paidGunu > g.tarih) g.tarih = paidGunu;
    gecmisOdemeGruplari.set(anahtar, g);
  }
  const gecmisOdemeler = [...gecmisOdemeGruplari.values()].sort(
    (a, b) => b.tarih.getTime() - a.tarih.getTime(),
  );

  const gelecekOdemeGruplari = new Map<string, OdemeGrubu>();
  for (const k of apiKalemleri) {
    if (k.paidAt !== null || k.dueDate === null) continue;
    const kanalAdi = k.channelAccount.channel.name;
    const odemeGunu = sonrakiOdemeGunu(k.dueDate, kanalAdi);
    const anahtar = `${kanalAdi}|${odemeGunu.toISOString().slice(0, 10)}`;
    const g = gelecekOdemeGruplari.get(anahtar) ?? {
      anahtar,
      kanalAdi,
      tarih: odemeGunu,
      toplam: 0,
      paraBirimi: k.currency,
      sayi: 0,
      odemeEmriNo: null,
    };
    g.toplam += Number(k.amount.toString());
    g.sayi++;
    gelecekOdemeGruplari.set(anahtar, g);
  }
  const gelecekOdemeler = [...gelecekOdemeGruplari.values()].sort(
    (a, b) => a.tarih.getTime() - b.tarih.getTime(),
  );

  const ODEME_LISTE_SINIRI = 12;

  /**
   * BEKLENEN vs GERÇEKLEŞEN — satış bazında.
   *
   * Beklenen, kâr motorunun snapshot'ından türetilir (NET-1 + maliyet).
   * Gerçekleşen, o satışa bağlanmış hakediş kalemlerinin TOPLAMIDIR —
   * bir sipariş çok satırlıdır ve tek satıra bakmak yanıltır.
   *
   * Kâr hesaplanamamış satışta beklenen de YOKTUR: karşılaştırma
   * yapılmaz, ekranda "—" durur. Sıfır varsaymak yanlış rakam üretirdi.
   */
  const kalemHaritasi = new Map<
    string,
    { toplam: number; paraBirimi: string; vade: Date | null; odendi: boolean }
  >();
  for (const k of kalemler) {
    if (!k.saleId) continue;
    const m = kalemHaritasi.get(k.saleId) ?? {
      toplam: 0,
      paraBirimi: k.currency,
      vade: k.dueDate,
      odendi: true,
    };
    m.toplam += Number(k.amount.toString());
    // Vade: en GEÇ olan; ödendi: kalemlerin HEPSİ ödendiyse.
    if (k.dueDate && (!m.vade || k.dueDate > m.vade)) m.vade = k.dueDate;
    if (!k.paidAt) m.odendi = false;
    kalemHaritasi.set(k.saleId, m);
  }

  const karsilastirma = satislar.map((satis) => {
    const gelen = kalemHaritasi.get(satis.id);
    const maliyet = satis.fees.reduce(
      (t, f) => t + Number(f.amount.toString()),
      0,
    );
    const beklenen = beklenenHakedis(
      satis.net1Amount === null ? null : Number(satis.net1Amount.toString()),
      maliyet,
    );
    return {
      id: satis.id,
      kod: satis.code,
      tarih: satis.soldAt,
      hesap: `${satis.channelAccount.channel.name} — ${satis.channelAccount.name}`,
      paraBirimi: gelen?.paraBirimi ?? satis.profitCurrency ?? "TRY",
      beklenen,
      gerceklesen: gelen?.toplam ?? null,
      vade: gelen?.vade ?? null,
      durum: odemeDurumu({
        beklenenTutar: beklenen,
        gerceklesenTutar: gelen?.toplam ?? null,
        vade: gelen?.vade ?? null,
        odendiMi: gelen?.odendi ?? false,
        bugun,
        kalemVarMi: gelen !== undefined,
      }),
    };
  });

  /** Dikkat isteyenler önce: eksik/fazla ödeme, sonra gecikme. */
  const ONCELIK: Record<string, number> = {
    EKSIK_ODEME: 0,
    FAZLA_ODEME: 1,
    GECIKTI: 2,
    BEKLIYOR: 3,
    ODENDI: 4,
    GELMEDI: 5,
  };
  karsilastirma.sort((a, b) => ONCELIK[a.durum] - ONCELIK[b.durum]);

  const sorunlu = karsilastirma.filter(
    (k) => k.durum === "EKSIK_ODEME" || k.durum === "GECIKTI",
  );

  /**
   * Durum kodundan sözlük metnine SABİT eşleme.
   * Anahtar DEĞİŞKENLE birleştirilseydi i18n denetimi bu çağrıları
   * göremez, eksik anahtar sessizce canlıya giderdi.
   * (Bu açıklamada örnek kod YAZILMIYOR: denetim yorumları da tarıyor ve
   *  örneği gerçek çağrı sanıp "eksik anahtar" veriyor — 12.08.2026.)
   */
  const durumMetni = (kod: string) =>
    kod === "ODENDI"
      ? t("durumODENDI")
      : kod === "BEKLIYOR"
        ? t("durumBEKLIYOR")
        : kod === "GECIKTI"
          ? t("durumGECIKTI")
          : kod === "EKSIK_ODEME"
            ? t("durumEKSIK_ODEME")
            : kod === "FAZLA_ODEME"
              ? t("durumFAZLA_ODEME")
              : t("durumGELMEDI");

  const eslesmemis = kalemler.filter(
    (k) => k.saleId === null && k.orderNo !== null,
  );

  /**
   * EŞLEŞMEYENLER SİPARİŞ BAZINDA GRUPLANIR.
   * Bir sipariş 7 kalem olabilir; kalem kalem listelemek 648 satır
   * demekti ve okunmazdı. Kullanıcının sorduğu soru "hangi siparişler
   * sistemde yok?" — cevabı sipariş listesidir.
   *
   * Uyarıyı sayı olarak yazıp listelemeseydik, "eyleme dönük hata"
   * ilkesini kendi ekranımızda çiğnerdik: kullanıcı hangi siparişleri
   * gireceğini göremezdi.
   */
  const eslesmeyenSiparisler = [
    ...eslesmemis
      .reduce((harita, k) => {
        const no = k.orderNo!;
        const m = harita.get(no) ?? { sayi: 0, toplam: 0, paraBirimi: k.currency };
        m.sayi++;
        m.toplam += Number(k.amount.toString());
        harita.set(no, m);
        return harita;
      }, new Map<string, { sayi: number; toplam: number; paraBirimi: string }>())
      .entries(),
  ]
    .map(([siparisNo, m]) => ({ siparisNo, ...m }))
    .sort((a, b) => Math.abs(b.toplam) - Math.abs(a.toplam));

  return (
    <div className="space-y-6">
      {/* SÜZGEÇLİ LİSTE HAFIZASI (K104): kanal süzgeciyle buradan çıkan
          "Rapor yükle" ekranı geri dönerken süzgeci kaybetmesin. */}
      <ListeyiHatirla temel="/hakedis" etiket={t("baslik")} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {sonSenkronizasyon
              ? t("sonSenkronizasyon", { zaman: bicim.tarihSaat(sonSenkronizasyon.createdAt) })
              : t("sonSenkronizasyonHicYok")}
          </p>
        </div>
        <Button asChild>
          <Link href="/hakedis/yukle">
            <Upload />
            {t("yukle")}
          </Link>
        </Button>
      </div>

      <SuzgecCubugu temelAdres="/hakedis" mevcut={sp} suzgecler={suzgecler} />

      {kalemler.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          {/* SÜZGEÇ YÜZÜNDEN BOŞSA ONU SÖYLE: "hiç veri yok" demek, başka
              kanalda kalem varken kullanıcıya yanlış bir hüküm verirdi
              (bkz. /satislar aynı desen). */}
          <p className="font-medium">
            {kanalSecili ? t("bosFiltreBaslik") : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {kanalSecili ? t("bosFiltreIpucu") : t("bosIpucu")}
          </p>
        </div>
      ) : (
        <SekmeliBolum
          secili={sekmeSecili}
          sekmeler={[
            {
              anahtar: SEKME_OZET,
              etiket: ortak("ozet"),
              adres: sekmeAdresi(SEKME_OZET),
              icerik: (
                <div className="space-y-6">
          {/* ------------------- KANAL ÖDEMELERİ (K220/K222) -------------- */}
          {gecmisOdemeler.length > 0 || gelecekOdemeler.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("kanalOdemeleriBaslik")}</CardTitle>
                <p className="text-muted-foreground text-sm">{t("kanalOdemeleriKapsamNotu")}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {gelecekOdemeler.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t("gelecekOdemeler")}</p>
                    <div className="space-y-2">
                      {gelecekOdemeler.slice(0, ODEME_LISTE_SINIRI).map((g) => (
                        <div
                          key={g.anahtar}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2 font-medium">
                              {bicim.tarih(g.tarih)}
                              <Badge variant="outline">{g.kanalAdi}</Badge>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t("kalemSayisi", { sayi: g.sayi })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">
                              {bicim.para(g.toplam, g.paraBirimi)}
                            </span>
                            <Badge variant="outline">{t("tahminiHesaplanmistir")}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    {gelecekOdemeler.length > ODEME_LISTE_SINIRI ? (
                      <p className="text-sm font-medium">
                        {t("listeKesildi", {
                          gosterilen: ODEME_LISTE_SINIRI,
                          toplam: gelecekOdemeler.length,
                        })}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {gecmisOdemeler.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t("gecmisOdemeler")}</p>
                    <div className="space-y-2">
                      {gecmisOdemeler.slice(0, ODEME_LISTE_SINIRI).map((g) => (
                        <div
                          key={g.anahtar}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2 font-medium">
                              {bicim.tarih(g.tarih)}
                              <Badge variant="outline">{g.kanalAdi}</Badge>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t("kalemSayisi", { sayi: g.sayi })}
                              {/* ⚠ YALNIZ GERÇEK BİR EMİR NO'SU VARSA
                                  YAZILIR — HB'de bu alan yok, ödeme günü
                                  zaten tarihte görünüyor (bkz. yukarısı). */}
                              {g.odemeEmriNo ? (
                                <>
                                  {" "}
                                  · {t("odemeEmriNo")} {g.odemeEmriNo}
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">
                              {bicim.para(g.toplam, g.paraBirimi)}
                            </span>
                            <Badge className={DURUM_KUTUSU.olumlu}>
                              <CircleCheck className="size-3.5" />
                              {t("odemeYapildi")}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    {gecmisOdemeler.length > ODEME_LISTE_SINIRI ? (
                      <p className="text-sm font-medium">
                        {t("listeKesildi", {
                          gosterilen: ODEME_LISTE_SINIRI,
                          toplam: gecmisOdemeler.length,
                        })}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* ----------------------- BEKLEYEN PARA ---------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>{t("bekleyenPara")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-6">
                {[...bekleyenToplam.entries()].map(([para, tutar]) => (
                  <div key={para}>
                    <div className="text-2xl font-semibold">
                      {bicim.para(tutar, para)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {bekleyenler.length} {t("sutunKalem").toLowerCase()}
                    </div>
                  </div>
                ))}
                {bekleyenToplam.size === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("bekleyenParaNotu")}
                  </p>
                ) : null}
              </div>

              {geciken.length > 0 ? (
                <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
                  <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                    <TriangleAlert className="size-4 shrink-0" />
                    {geciken.length} {t("gecikti")}
                  </p>
                  <p className={`mt-1 text-sm ${DURUM_YAZISI.uyari}`}>
                    {t("gecikmeNotu", { gun: HAKEDIS_ESIKLERI.gecikmeIsGunu })}
                  </p>
                </div>
              ) : null}

              <p className="text-muted-foreground text-xs">
                {t("bekleyenParaNotu")}
              </p>
            </CardContent>
          </Card>

          {/* --------------------- KANAL DAĞILIMI (görsel) --------------- */}
          {/* YALNIZ BİRDEN FAZLA KANAL VARKEN ÇİZİLİR — bkz. yukarıdaki
              hesap bloğunun başlığı: tek kanala süzülmüş bir "dağılım"
              tek dilimli bir pastadır ve hiçbir şey anlatmaz. */}
          {kanalDagilimDilimleri.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("kanalDagilimiBaslik")}</CardTitle>
                <p className="text-muted-foreground text-sm">
                  {t("kanalDagilimiNotu")}
                </p>
              </CardHeader>
              <CardContent>
                <KanalDagilimiGrafigi
                  dilimler={kanalDagilimDilimleri}
                  toplam={kanalDagilimToplam}
                  paraBirimi={anaParaBirimi ?? "TRY"}
                  bosMesaj={t("kanalDagilimiBosMesaj")}
                />
              </CardContent>
            </Card>
          ) : null}
                </div>
              ),
            },
            {
              anahtar: SEKME_DETAY,
              etiket: ortak("detay"),
              adres: sekmeAdresi(SEKME_DETAY),
              icerik: (
                <div className="space-y-6">
          {/* ---------------- BEKLENEN vs GERÇEKLEŞEN ------------------- */}
          {karsilastirma.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("karsilastirmaBaslik")} ({karsilastirma.length})
                </CardTitle>
                {/* EŞİK SABİTTEN GELİR — 18.08.2026.
                    Metin eşiği ZATEN beyan ediyordu ama sayıyı ("1 ₺")
                    sözlüğe ELLE yazıyordu. `HAKEDIS_ESIKLERI.tutarFarki`
                    değişseydi ekran eski sayıyı söylemeye devam ederdi:
                    beyan doğru görünür, yanlış olurdu. Tek kaynak. */}
                <p className="text-muted-foreground text-sm">
                  {t("karsilastirmaNotu", {
                    tutar: HAKEDIS_ESIKLERI.tutarFarki,
                  })}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {sorunlu.length > 0 ? (
                  <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
                    <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                      <TriangleAlert className="size-4 shrink-0" />
                      {t("karsilastirmaSorunlu", { sayi: sorunlu.length })}
                    </p>
                  </div>
                ) : null}

                <div className="hidden overflow-x-auto rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ortak("siparisNo")}</TableHead>
                        <TableHead>{ortak("kanalHesabi")}</TableHead>
                        <TableHead className="text-right">
                          {t("sutunBeklenen")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("sutunGerceklesen")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("sutunFark")}
                        </TableHead>
                        <TableHead>{ortak("durum")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {karsilastirma.slice(0, LISTE_SINIRI).map((k) => (
                        <TableRow key={k.id}>
                          <TableCell>
                            <Baglanti href={`/satislar/${k.id}`}>
                              {k.kod ?? bicim.tarih(k.tarih)}
                            </Baglanti>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {k.hesap}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {k.beklenen === null
                              ? "—"
                              : bicim.para(k.beklenen, k.paraBirimi)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {k.gerceklesen === null
                              ? "—"
                              : bicim.para(k.gerceklesen, k.paraBirimi)}
                          </TableCell>
                          {/* Fark yalnız İKİSİ DE varsa yazılır; biri yoksa
                              çıkarma yapmak uydurmak olurdu. */}
                          <TableCell className="text-right whitespace-nowrap">
                            {k.beklenen !== null && k.gerceklesen !== null
                              ? bicim.para(
                                  k.gerceklesen - k.beklenen,
                                  k.paraBirimi,
                                )
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                k.durum === "EKSIK_ODEME" ||
                                k.durum === "GECIKTI"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {durumMetni(k.durum)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* -------------------- TELEFON: KART -------------------- */}
                <div className="space-y-3 md:hidden">
                  {karsilastirma.slice(0, LISTE_SINIRI).map((k) => (
                    <ListeKarti
                      key={k.id}
                      baslik={
                        <Baglanti href={`/satislar/${k.id}`}>
                          {k.kod ?? bicim.tarih(k.tarih)}
                        </Baglanti>
                      }
                      altBaslik={k.hesap}
                      alanlar={[
                        {
                          etiket: t("sutunBeklenen"),
                          deger:
                            k.beklenen === null
                              ? "—"
                              : bicim.para(k.beklenen, k.paraBirimi),
                        },
                        {
                          etiket: t("sutunGerceklesen"),
                          deger:
                            k.gerceklesen === null
                              ? "—"
                              : bicim.para(k.gerceklesen, k.paraBirimi),
                        },
                        {
                          etiket: ortak("durum"),
                          deger: (
                            <Badge variant="outline">
                              {durumMetni(k.durum)}
                            </Badge>
                          ),
                        },
                      ]}
                    />
                  ))}
                </div>

                {karsilastirma.length > LISTE_SINIRI ? (
                  <p className="text-sm font-medium">
                    {t("listeKesildi", {
                      gosterilen: LISTE_SINIRI,
                      toplam: karsilastirma.length,
                    })}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* -------------------- EŞLEŞMEYEN KALEMLER ------------------- */}
          {eslesmemis.length > 0 ? (
            <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
              <p className={`text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                {t("eslesmemisKalem", { sayi: eslesmemis.length })}
              </p>
              <p className={`mt-1 text-sm ${DURUM_YAZISI.uyari}`}>
                {t("eslesmemisNotu", { siparis: eslesmeyenSiparisler.length })}
              </p>

              {/* HANGİ SİPARİŞLER — tutara göre, en büyük önce. */}
              <div className="mt-3 overflow-x-auto rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ortak("siparisNo")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunKalem")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("sutunTutar")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eslesmeyenSiparisler
                      .slice(0, LISTE_SINIRI)
                      .map((s2) => (
                        <TableRow key={s2.siparisNo}>
                          <TableCell>
                            <KopyalanabilirKod
                              deger={s2.siparisNo}
                              etiket={ortak("siparisNo")}
                            />
                          </TableCell>
                          <TableCell className="text-right">{s2.sayi}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {bicim.para(s2.toplam, s2.paraBirimi)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              {eslesmeyenSiparisler.length > LISTE_SINIRI ? (
                <p className={`mt-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                  {t("listeKesildi", {
                    gosterilen: LISTE_SINIRI,
                    toplam: eslesmeyenSiparisler.length,
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* -------------------------- KALEMLER ------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("partiler", { sayi: partiler.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* ------------------ MASAÜSTÜ: TABLO ------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunDosya")}</TableHead>
                      <TableHead>{t("sutunKanal")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunKalem")}
                      </TableHead>
                      <TableHead>{t("sutunOdeme")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunTutar")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partiler.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-[20rem]">
                          <span className="block truncate">
                            {p.sourceFile ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.channelAccount.channel.name} —{" "}
                          {p.channelAccount.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {p._count.items}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {p.paidAt ? (
                            bicim.tarih(p.paidAt)
                          ) : (
                            <Badge variant="outline">{t("odenmedi")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {bicim.para(p.amount, p.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* -------------------- TELEFON: KART ------------------- */}
              <div className="space-y-3 md:hidden">
                {partiler.map((p) => (
                  <ListeKarti
                    key={p.id}
                    baslik={p.sourceFile ?? "—"}
                    altBaslik={`${p.channelAccount.channel.name} — ${p.channelAccount.name}`}
                    alanlar={[
                      { etiket: t("sutunKalem"), deger: p._count.items },
                      {
                        etiket: t("sutunOdeme"),
                        deger: p.paidAt ? bicim.tarih(p.paidAt) : t("odenmedi"),
                      },
                      {
                        etiket: t("sutunTutar"),
                        deger: bicim.para(p.amount, p.currency),
                      },
                    ]}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ----------------- BEKLEYEN KALEM DÖKÜMÜ -------------------- */}
          {bekleyenler.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("bekleyenPara")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="hidden overflow-x-auto rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ortak("tarih")}</TableHead>
                        <TableHead>{ortak("siparisNo")}</TableHead>
                        {/* HB'de bu alan bir FATURA numarasıdır ve o
                            faturanın tüm kalemleri aynı numarayı taşır. */}
                        <TableHead>{t("faturaNo")}</TableHead>
                        <TableHead>{t("sutunKalem")}</TableHead>
                        <TableHead className="text-right">
                          {t("sutunTutar")}
                        </TableHead>
                        <TableHead>{ortak("durum")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bekleyenler.slice(0, LISTE_SINIRI).map(({ kayit, durum }) => (
                        <TableRow key={kayit.id}>
                          <TableCell className="whitespace-nowrap">
                            {kayit.dueDate ? (
                              bicim.tarih(kayit.dueDate)
                            ) : (
                              <span className="text-muted-foreground">
                                {t("vadeYok")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {kayit.sale ? (
                              <Baglanti href={`/satislar/${kayit.sale.id}`}>
                                {kayit.sale.code ?? kayit.orderNo}
                              </Baglanti>
                            ) : (
                              <span className="text-muted-foreground">
                                {kayit.orderNo ?? "—"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <KopyalanabilirKod
                              deger={kayit.externalId}
                              etiket={t("faturaNo")}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {kayit.rawType ?? kayit.code}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {bicim.para(kayit.amount, kayit.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                durum === "GECIKTI" ? "secondary" : "outline"
                              }
                            >
                              {durum === "GECIKTI"
                                ? t("gecikti")
                                : t("bekliyor")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* SESSİZ KESME YOK: kaç kalemin gösterilmediği yazar.
                    Görünmeyen 12 satır, "hepsi bu" sanılmamalı. */}
                {bekleyenler.length > LISTE_SINIRI ? (
                  <p className="text-sm font-medium">
                    {t("listeKesildi", {
                      gosterilen: LISTE_SINIRI,
                      toplam: bekleyenler.length,
                    })}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  {t("faturaNoNotu")}
                </p>
              </CardContent>
            </Card>
          ) : null}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
