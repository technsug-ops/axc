import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { DurumRozeti } from "@/components/durum-rozeti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import {
  bosluklariBul,
  gorusSiniriMi,
  type Bosluk,
} from "@/lib/komisyon/kapsam-boslugu";
import { UYARI_GUNU } from "@/lib/panel/tarife-penceresi";
import { prisma } from "@/lib/prisma";
import { DURUM_KUTUSU } from "@/lib/renkler";
import { sayfaIzni } from "@/lib/yetki";

import { Yukleyici } from "./yukleyici";

/**
 * ============================================================================
 *  KOMİSYON TARİFESİ YÜKLEME (K47) + KAPSAM BOŞLUĞU (K49)
 * ----------------------------------------------------------------------------
 *  ⚠ BU EKRAN, PANELDEKİ UYARI SATIRININ ÖN ŞARTIYDI. Panel "tarife
 *  penceresi bitiyor" diyecekti ama tarife tablolarına giden tek yol
 *  terminaldeki `npm run canli:tarife-yukle` idi: uyarı, kullanıcının
 *  YAPAMAYACAĞI bir işi hatırlatacaktı. Anayasa bunu adıyla anıyor —
 *  "kural doğru mu değil, kural teslim edilebilir mi".
 *
 *  ⚠ BETİK KALDIRILMADI. Aynı gövdeyi çağırıyorlar (`tarifeYaz`); betik
 *  toplu/otomatik koşum için duruyor, ekran haftalık rutin için.
 *
 *  ── K49: PENCERELER ARASINDAKİ BOŞLUK (25.08.2026) ──────────────────────
 *  Kart üç satırı da AYRI AYRI doğru gösteriyordu ama aralarındaki deliği
 *  hiç söylemiyordu; 72 saatlik boşluk ancak veritabanına elle bakınca
 *  göründü. Artık ardışık pencereler karşılaştırılıyor ve delik **kırmızı
 *  satır** olarak listenin İÇİNE giriyor — yani gözden kaçamayacağı yere.
 *
 *  ⚠ DELİK KAPANMAZ, GÖRÜNÜR OLUR. Kaçırılan tarife dosyası arşivden
 *  inmiyor; bu satır bir GÖREV değil, bir KAYIT BEYANIDIR. O yüzden panele
 *  taşınmadı: kapanamayacak bir uyarı görev kutusunda sonsuza kadar yanar
 *  ve rozetin tamamına olan güveni götürür.
 *
 *  YETKİ: `kanalsku.yaz` — komisyon verisi yazan mevcut izin. YENİ İZİN
 *  AÇILMADI; açsaydık `izinler.ts` + `seed-yetki.ts → SONRADAN_DOGAN` +
 *  canlı senkron gerekirdi ve unutulan tek satır ekranı görünmez yapardı.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

/** Ekranda listelenecek pencere sayısı — İlke #13. */
const LISTE_TAVANI = 10;

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("tarife") };
}

export default async function TarifeSayfasi() {
  await sayfaIzni("kanalsku.yaz");
  const t = await getTranslations("Tarife");

  const [hesaplar, tarifeler, tumPencereler, ilkKayit] = await Promise.all([
    prisma.channelAccount.findMany({
      where: { satisIcin: true, isActive: true },
      select: { id: true, name: true, channel: { select: { name: true } } },
      orderBy: [{ channel: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.komisyonTarifesi.findMany({
      select: {
        id: true,
        channelAccountId: true,
        pencereBaslangic: true,
        pencereBitis: true,
        channelAccount: {
          select: { name: true, channel: { select: { name: true } } },
        },
        _count: { select: { kalemler: true } },
      },
      orderBy: { pencereBaslangic: "desc" },
      /**
       * ⚠ SON 10 — İlke #13: özet ekranda döküm olmaz. Pencere sayısı
       * haftada bir artıyor; sınırsız listelenseydi bir yıl sonra sayfa
       * 52 satırla açılırdı.
       */
      take: LISTE_TAVANI,
    }),
    /**
     * ⚠ BOŞLUK **BÜTÜN GEÇMİŞTEN** HESAPLANIR, LİSTELENEN 10'DAN DEĞİL.
     * Kesilmiş bir listeden hesaplasaydık 11. pencerenin öncesindeki bir
     * delik hiç doğmaz ve ekran "kapsam kesintisiz" derdi — sayfalamanın
     * ürettiği yalancı yeşil. Sorgu iki tarih + iki kimlik taşıyor, ucuz.
     */
    prisma.komisyonTarifesi.findMany({
      select: {
        channelAccountId: true,
        pencereBaslangic: true,
        pencereBitis: true,
        channelAccount: {
          select: { name: true, channel: { select: { name: true } } },
        },
      },
      orderBy: { pencereBaslangic: "asc" },
    }),
    /**
     * SİSTEMİN GÖRÜŞ SINIRI — ilk tarife kaydının ANI.
     *
     * ⚠ `pencereBaslangic` DEĞİL `yuklendiAt`. Soru "en eski pencere hangisi"
     * değil, "sistem ne zaman tarife bilmeye başladı". İlk yükleme GERİYE
     * DÖNÜK olabilir (nitekim öyleydi: 14–18.08 penceresi, bittikten 6,6
     * saat SONRA yüklendi) ve pencere tarihine bakan bir ölçüt bunu görmez.
     */
    prisma.komisyonTarifesi.aggregate({ _min: { yuklendiAt: true } }),
  ]);

  const bosluklar = bosluklariBul(
    tumPencereler.map((p) => ({
      hesapId: p.channelAccountId,
      hesapAdi: `${p.channelAccount?.channel.name ?? "—"} — ${p.channelAccount?.name ?? "—"}`,
      baslangic: p.pencereBaslangic,
      bitis: p.pencereBitis,
    })),
  );

  /**
   * KAYBIN ÖLÇÜSÜ — boşluğa düşen satış sayısı.
   *
   * ⚠ ADET DEĞİL, HÜKÜM TAŞIYOR: bu satışların hiçbirinde
   * `satisTarihiTarifesi` kapsayan pencere bulamaz ve **hüküm vermez**.
   * Doğru davranış ama sessiz; ekran artık niye sustuğunu söylüyor.
   */
  const satisSayilari = await Promise.all(
    bosluklar.map((b) =>
      prisma.sale.count({
        where: {
          channelAccountId: b.hesapId,
          soldAt: { gt: b.baslar, lt: b.biter },
          /**
           * ⚠ İPTALLİ SATIŞ SAYILMAZ — VE BUNU BEKÇİ YAKALADI (25.08.2026).
           * İlk yazımda süzgeç yoktu ve `iptal:bekci` kırmızı yandı.
           * Ölçüt burada nettir: bu sayı KAYBI ölçüyor, yani "tarifesi
           * olmadığı için hüküm verilemeyen satış" sayısını. İptal edilmiş
           * bir satışta zaten kâr hesaplanmıyor; onu saymak kaybı OLDUĞUNDAN
           * BÜYÜK gösterirdi.
           */
          iptalTarihi: null,
        },
      }),
    ),
  );

  const toplamTamGun = bosluklar.reduce((t, b) => t + b.tamGunler.length, 0);

  const bugun = gunDegeri(isTakvimGunu(new Date()));
  const gun = 86_400_000;

  /** Listelenen en eski pencerenin başlangıcı — boşluk satırı orada kesilir. */
  const enEski =
    tarifeler.length > 0
      ? tarifeler[tarifeler.length - 1]!.pencereBaslangic.getTime()
      : 0;
  const gosterilen = bosluklar.filter((b) => b.biter.getTime() >= enEski);
  const gizlenen = bosluklar.length - gosterilen.length;

  const ilkKayitAni = ilkKayit._min.yuklendiAt ?? null;

  /** Saat/gün metni — boşluk satırının gövdesi. */
  function boslukMetni(b: Bosluk, satis: number): string {
    return t("boslukSatir", {
      kanal: b.hesapAdi,
      baslangic: damga(b.baslar),
      bitis: damga(b.biter),
      saat: b.saat.toFixed(1),
      gun: b.tamGunler.length,
      satis,
    });
  }

  return (
    <div className="max-w-3xl space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Yukleyici
            hesaplar={hesaplar.map((h) => ({
              id: h.id,
              etiket: `${h.channel.name} — ${h.name}`,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("kapsamBaslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/*
            ═══ HÜKÜM ÖNCE — İlke #13 ══════════════════════════════════════
            Döküm aşağıda; buradaki tek satır "kapsam sağlam mı" sorusunun
            cevabı. AÇIK SIFIR: boşluk yoksa satır GİZLENMEZ, kapsamın
            kesintisiz olduğu yazar — yoksa "kontrol edildi mi, edilmedi mi"
            ayırt edilemezdi.
          */}
          {tarifeler.length === 0 ? null : bosluklar.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("boslukYok")}
            </p>
          ) : (
            <div
              className={`flex gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.olumsuz}`}
              role="status"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">
                  {t("boslukOzet", {
                    adet: bosluklar.length,
                    gun: toplamTamGun,
                  })}
                </p>
                {/*
                  ⚠ "KAPANMAZ" AÇIKÇA YAZAR. Kullanıcı bu satırı bir GÖREV
                  sanıp dosyayı indirmeye çalışırsa boşuna uğraşır: Trendyol'un
                  tam dilimli ileri tarifesi arşivden inmiyor. Yapılamayacak
                  bir işi ima eden uyarı, uyarı değildir.
                */}
                <p className="text-xs">{t("boslukKapanmaz")}</p>
              </div>
            </div>
          )}

          {/* AÇIK SIFIR: liste boşsa satır gizlenmez, NEDEN boş olduğu yazar. */}
          {tarifeler.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("kapsamYok")}</p>
          ) : (
            tarifeler.map((x, sira) => {
              const bitis = gunDegeri(isTakvimGunu(x.pencereBitis));
              /** ⚠ BİTİŞ GÜNÜ DAHİL — `21–25.08` ise 25.08 hâlâ kapsanıyor. */
              const kalan = Math.round(
                (bitis.getTime() - bugun.getTime()) / gun,
              );
              /**
               * ⚠ BOŞLUK SATIRI, İKİ PENCERENİN ARASINA GİRER — listenin
               * altına toplu bir kutu olarak DEĞİL. Ayrı kutuda dursaydı
               * hangi iki pencerenin arasında olduğu okumakla bulunurdu;
               * arada durunca göz onu atlayamaz.
               *
               * Liste ters kronolojik: bu pencerenin ÖNÜNDEKİ boşluk, bu
               * pencerenin BAŞLANGICINDA biten boşluktur.
               */
              const onundeki = gosterilen.filter(
                (b) => b.biter.getTime() === x.pencereBaslangic.getTime(),
              );
              return (
                <div key={x.id} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="tabular-nums">
                      {t("kapsamSatir", {
                        kanal: x.channelAccount?.channel.name ?? "—",
                        baslangic: x.pencereBaslangic
                          .toISOString()
                          .slice(0, 10),
                        bitis: x.pencereBitis.toISOString().slice(0, 10),
                        kalem: x._count.kalemler,
                      })}
                    </span>
                    {/*
                      ⚠ RENK SİSTEMİNDEN, HAM TAILWIND'DEN DEĞİL. İlk yazımda
                      ham bir amber sınıfı kullanıldı ve `panel:dogrula`
                      yakaladı — ama ancak COMMIT'ten SONRA: tarama
                      `git ls-files` okuyor, izlenmeyen dosya görünmüyor.
                      (Sınıf adı burada YAZILMIYOR: taramanın kendi deseni
                      yorumun içinde de eşleşir ve yalancı kırmızı üretir.)
                    */}
                    {kalan < 0 ? (
                      <DurumRozeti durum="notr">{t("bitti")}</DurumRozeti>
                    ) : kalan === 0 ? (
                      <DurumRozeti durum="uyari">{t("sonGun")}</DurumRozeti>
                    ) : kalan <= UYARI_GUNU ? (
                      <DurumRozeti durum="uyari">
                        {t("kalanGun", { gun: kalan })}
                      </DurumRozeti>
                    ) : (
                      <DurumRozeti durum="olumlu">{t("guncel")}</DurumRozeti>
                    )}
                  </div>

                  {onundeki.map((b) => (
                    <div
                      key={`${b.hesapId}-${b.baslar.toISOString()}`}
                      className={`flex gap-2 rounded-md p-2 text-xs ${DURUM_KUTUSU.olumsuz}`}
                    >
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                      <div className="space-y-1">
                        <span className="block tabular-nums">
                          {boslukMetni(
                            b,
                            satisSayilari[bosluklar.indexOf(b)] ?? 0,
                          )}
                        </span>
                        {/*
                          ⚠ KUSUR İLE SINIR AYIRT EDİLİR (kullanıcı düzeltmesi
                          25.08.2026). Kayıt ilk hâlinde _"ara verdin"_ diye
                          okundu; oysa bu boşluk, sistemde HENÜZ TEK BİR TARİFE
                          BİLE YOKKEN açıldı. Atlanmış bir indirme değil,
                          sistemin GÖRÜŞ ALANININ BAŞLANGIÇ SINIRI.

                          ⚠ Ölçüt tarih gömülerek değil VERİDEN kuruluyor
                          (`min(yuklendiAt)`), yoksa bugün doğru olan istisna
                          altı ay sonra anlamsız bir muafiyete dönerdi.
                        */}
                        {gorusSiniriMi(b, ilkKayitAni) ? (
                          <span className="block">
                            {t("boslukGorusSiniri", {
                              ilk: ilkKayitAni ? damga(ilkKayitAni) : "—",
                            })}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {/*
                    ⚠ KESİLEN LİSTENİN SINIRI YAZILIR. Boşluk BÜTÜN geçmişten
                    hesaplanıyor ama liste son 10 pencereyi gösteriyor; daha
                    eski bir delik listede yerini bulamaz. Sessizce düşseydi
                    özetteki sayı ile listedeki satır sayısı ayrışır ve
                    hangisinin doğru olduğu anlaşılmazdı.
                  */}
                  {sira === tarifeler.length - 1 && gizlenen > 0 ? (
                    <p className="text-muted-foreground text-xs">
                      {t("boslukGizlenen", { adet: gizlenen })}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * BOŞLUK UCUNUN DAMGASI — `2026-08-18 07:59` (İstanbul).
 *
 * ⚠ TARİH KIRPMASI YETMEZ, SAAT ŞART. Ekran `.slice(0,10)` yaptığı için
 * `21–25` ile `25–01` bitişik olduğu hâlde ÖRTÜŞÜYOR görünüyordu; gerçek
 * sınır `07:59` / `08:00`. Boşluk satırında saat gizlenirse aynı yanılgı
 * bu kez ters yönde doğar: 72 saatlik delik "18→21, arada bir şey yok"
 * diye okunur.
 */
function damga(an: Date): string {
  const g = isTakvimGunu(an);
  const saat = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(an);
  return `${g.yil}-${String(g.ay).padStart(2, "0")}-${String(g.gun).padStart(2, "0")} ${saat}`;
}
