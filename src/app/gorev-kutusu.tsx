import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, PackageCheck, Truck } from "lucide-react";

import { DurumRozeti } from "@/components/durum-rozeti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DURUM_YAZISI, DURUM_ZEMINI } from "@/lib/renkler";
import {
  bekleyenToplam,
  gorevleriKur,
  grubunGorevleri,
  type Gorev,
  type GorevAnahtari,
  type GorevGrubu,
} from "@/lib/panel/bugun-ne-yapmaliyim";

/**
 * ============================================================================
 *  GÜNLÜK İŞ KUTULARI — İKİ KART, İKİ FARKLI EMEK
 * ----------------------------------------------------------------------------
 *  Panel açılışında EYLEM üstte, rapor altta (mimar kararı 14.08.2026).
 *  Bu kutular "ne oldu" değil "şimdi ne yapacağım" sorusunu cevaplar.
 *
 *  ── NİYE İKİ KART (kullanıcı isteği 20.08.2026) ─────────────────────────
 *  Tek kutuda beş sayı yan yanaydı ve iki ayrı işi karıştırıyordu:
 *  paket çıkarmak/iade karşılamak ile mal kabul edip kayıt tamamlamak.
 *  Ayrım keyfi değil — günün farklı saatlerinde, çoğu zaman farklı kişilerce
 *  yapılıyor. Karışık durduğunda "hangisi şimdi benim işim" sorusu her
 *  bakışta yeniden soruluyordu.
 *
 *  ── AÇIK SIFIR ──────────────────────────────────────────────────────────
 *  Sayısı 0 olan kutucuk GİZLENMEZ, "temiz ✓" yazar. Satırın yokluğundan
 *  "yapılacak iş yok" sonucunu çıkarmak imkânsızdır.
 *
 *  ── ⚠ BURAYA YALNIZ BEKLEYEN İŞ GİRER ───────────────────────────────────
 *  "Bugün girilen alım" bir süre burada durdu ve YANLIŞ YERDEYDİ: bu
 *  kutular YAPILMAMIŞ işi sayar, o ise YAPILMIŞ işin adedi. Kullanıcı
 *  kararı 21.08.2026 ile dönem kartına taşındı.
 *
 *  ── YETKİ ───────────────────────────────────────────────────────────────
 *  Buradaki sayıların hepsi OPERASYONELDİR — `satis.kar.gor` İSTEMEZ.
 *  Depocu da görebilir; kâr/oran TUTARLARI bu kutulara girmez.
 *
 *  DÖNEM SÜZGECİNDEN ETKİLENMEZ: "kargoya verilmemiş sipariş" dünkü de
 *  olsa bugünün işidir. ("Bugün girilen alım" zaten kendi günüyle sınırlı.)
 * ============================================================================
 */

/** Tek kutucuk — iki kart da aynı biçimi kullanır, ayrışmasın diye. */
function GorevKutucugu({
  gorev,
  etiket,
  temizMetni,
  ilerlemeMetni,
  ilerlemeAdresi,
  sureMetni,
}: {
  gorev: Gorev;
  etiket: string;
  temizMetni: string;
  /** "3 paketlendi" — ilerlemesi olmayan görevde kullanılmaz. */
  ilerlemeMetni: string;
  /** İlerleme rakamının kendi listesi; yoksa rakam düz yazı kalır. */
  ilerlemeAdresi?: string;
  /**
   * SÜRE METNİ — "2 gün kaldı" / "Bugün son gün".
   *
   * ⚠ SAYI YERİNE GEÇER, YANINA DEĞİL. Tarife satırında bekleyen kanal
   * sayısı 0 olsa bile iş bekliyor olabilir (pencere bugün bitiyor).
   * Büyük bir "0" basıp yanına "bugün son gün" yazsaydık ekran kendi
   * kendisiyle çelişirdi.
   */
  sureMetni?: string;
}) {
  /**
   * ⚠ İÇ İÇE <a> YAZILAMAZ — kutunun tamamı zaten bir bağlantı ve
   * "N paketlendi" onun İÇİNDE ikinci bir bağlantı olacak. Geçersiz HTML;
   * tarayıcı iç bağlantıyı dışarı atıp yerleşimi bozuyor.
   *
   * Çözüm "yayılan bağlantı" deseni: kap `relative`, ana bağlantı
   * `after:absolute after:inset-0` ile bütün kutuyu kaplıyor, ilerleme
   * bağlantısı `relative z-10` ile onun ÜSTÜNDE duruyor. Kutunun her yeri
   * tıklanabilir kalıyor (diğer dört kutuda hiçbir şey değişmiyor),
   * rakamın kendi hedefi de çalışıyor.
   */
  return (
    <div
      /**
       * `min-w-0` ŞART (15.08.2026): ızgara hücresinin varsayılan en küçük
       * genişliği "auto"dur, yani içeriği kadar. Uzun etiket ("Komisyon
       * oranı boş kanal SKU") hücreyi kendi genişliğine zorluyor ve yazı
       * kutunun dışına taşıyordu.
       */
      className="hover:bg-muted/60 relative flex min-h-11 min-w-0 flex-col justify-center gap-1 rounded-lg border p-3"
    >
      <Link href={gorev.adres} className="absolute inset-0 rounded-lg">
        <span className="sr-only">{etiket}</span>
      </Link>
      {gorev.temizMi ? (
        /* İŞARET + RENK BİRLİKTE: temizde ✓ ikonu, bekleyende rakam. */
        <span
          className={`inline-flex items-center gap-1 text-sm ${DURUM_YAZISI.olumlu}`}
        >
          <Check className="size-4" />
          {temizMetni}
        </span>
      ) : sureMetni !== undefined ? (
        /*
          SÜRELİ GÖREV — rakam değil, kalan gün yazar.
          ⚠ `sayi > 0` ise (pencere ZATEN bitmiş) süre metni gelmez ve
          aşağıdaki normal rakam dalı çalışır; "bitti" hâlini "0 gün kaldı"
          diye yazmak, geçmiş bir kaybı gelecekteki bir iş gibi gösterirdi.
        */
        <span
          className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-sm font-semibold ${DURUM_ZEMINI.uyari}`}
        >
          {sureMetni}
        </span>
      ) : (
        <span className="inline-flex flex-wrap items-baseline gap-2">
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-2xl leading-none font-semibold tabular-nums ${DURUM_ZEMINI.uyari}`}
          >
            {gorev.sayi}
          </span>
          {/*
            İLERLEME — "kaç tanesi hazır". Bekleyen sayısı tek başına yol
            aldığını göstermiyordu: 15 sipariş paketlenirken rakam 15'te
            duruyor (kargoya verilene kadar düşmüyor).

            ⚠ HEPSİ HAZIRSA YEŞİL. "15 / 15" ile "15 / 3" aynı renkte
            durursa, bitmiş iş bitmemiş gibi okunur.
          */}
          {gorev.ilerleme !== null ? (
            /*
              ⚠ RAKAM TIKLANABİLİR OLMALI (İlke #2 + #9). Kullanıcı
              24.08.2026: _"15 paketlenen tıklayınca liste çıksa, kontrol
              ederken bakarız."_ Düz metin gibi duran bir sayı, arkasında
              liste olduğunu söylemez.

              ⚠ `z-10` ŞART: yayılan ana bağlantı bütün kutuyu kaplıyor;
              bu link onun altında kalsaydı tıklama ana hedefe giderdi ve
              düğme çalışıyormuş gibi görünüp YANLIŞ listeyi açardı.

              ⚠ Telefonda dokunma alanı: `min-h-11` (44px) — anayasa
              ölçüsü. Rakamın kendisi küçük yazı.
            */
            <Link
              href={ilerlemeAdresi ?? gorev.adres}
              className={`relative z-10 inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium tabular-nums underline-offset-2 hover:underline ${
                gorev.ilerleme >= gorev.sayi
                  ? DURUM_YAZISI.olumlu
                  : "text-muted-foreground"
              }`}
            >
              {ilerlemeMetni}
            </Link>
          ) : null}
        </span>
      )}
      <span className="text-muted-foreground text-[11px] leading-tight break-words hyphens-auto">
        {etiket}
      </span>
    </div>
  );
}

async function TekKart({
  grup,
  gorevler,
  baslikAnahtari,
  Ikon,
  ilerlemeAdresleri,
}: {
  grup: GorevGrubu;
  gorevler: Gorev[];
  baslikAnahtari: string;
  Ikon: typeof Truck;
  ilerlemeAdresleri?: Partial<Record<GorevAnahtari, string>>;
}) {
  const t = await getTranslations("Gorevler");
  const kartinkiler = grubunGorevleri(gorevler, grup);
  const toplam = bekleyenToplam(kartinkiler);

  return (
    /* Komşu kart (Nakit özeti) yüksekliği paylaşıyor; bu kartlar da
       kalan alanı doldursun ki sütunlar arasında ölü boşluk kalmasın. */
    <Card className="flex h-full min-w-0 flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Ikon className="size-5" />
          {t(baslikAnahtari)}
          {/* Bekleyen iş AMBER, hepsi temiz YEŞİL — renk sistemi. */}
          {toplam > 0 ? (
            <DurumRozeti durum="uyari">
              {t("bekleyen", { sayi: toplam })}
            </DurumRozeti>
          ) : (
            <DurumRozeti durum="olumlu">{t("hepsiTemiz")}</DurumRozeti>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {/* Kutucuk sayısı karta göre: 2 ve 3. Telefonda 2 sütun. */}
        <div
          className={`grid flex-1 grid-cols-2 gap-2 ${kartinkiler.length > 2 ? "sm:grid-cols-3" : ""}`}
        >
          {kartinkiler.map((g) => (
            <GorevKutucugu
              key={g.anahtar}
              gorev={g}
              etiket={t(g.anahtar)}
              temizMetni={t("temiz")}
              ilerlemeMetni={t("ilerleme", { sayi: g.ilerleme ?? 0 })}
              ilerlemeAdresi={ilerlemeAdresleri?.[g.anahtar]}
              /*
                ⚠ SÜRE YALNIZ "ACELE AMA SAYISI 0" HÂLİNDE. Kapsamsız kanal
                varsa (`sayi > 0`) o rakam basılır — pencere çoktan bitmiş
                demektir ve kalan gün diye bir şey yoktur.
              */
              sureMetni={
                g.kalanGun !== null && g.aceleMi && g.sayi === 0
                  ? g.kalanGun === 0
                    ? t("sonGun")
                    : t("kalanGun", { gun: g.kalanGun })
                  : undefined
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export async function GorevKutusu({
  sayilar,
  ilerlemeler,
  ilerlemeAdresleri,
  sureler,
}: {
  sayilar: Record<GorevAnahtari, number>;
  /** Görev başına ilerleme — bugün yalnız `kargoBekleyen`. */
  ilerlemeler?: Partial<Record<GorevAnahtari, number>>;
  /** İlerleme rakamının kendi süzülü listesi. */
  ilerlemeAdresleri?: Partial<Record<GorevAnahtari, string>>;
  /** Süreli görevlerin kalan günü ve acele hâli — bugün yalnız tarife. */
  sureler?: Partial<
    Record<GorevAnahtari, { kalanGun: number | null; aceleMi: boolean }>
  >;
}) {
  const gorevler = gorevleriKur(sayilar, ilerlemeler, sureler);

  /**
   * ⚠ YAN YANA DEĞİL, ALT ALTA (kullanıcı düzeltmesi 21.08.2026).
   *
   * İlk teslimde iki kart `lg:grid-cols-2` ile yan yana konmuştu. Ama bu
   * blok zaten sayfanın YARISINDA duruyor (öteki yarısı Nakit özeti), yani
   * her kart ~%25 genişliğe düşüyor ve içindeki kutucuklar 2–3 sütuna daha
   * bölününce etiketler harf harf sarıyordu ("Kargo | ya verilm | emiş").
   *
   * Alt alta konunca her kart yarım sayfa genişliğinde kalıyor ve
   * kutucuklar okunur genişliğe kavuşuyor.
   */
  return (
    <div className="grid min-w-0 gap-4">
      <TekKart
        ilerlemeAdresleri={ilerlemeAdresleri}
        grup="SEVKIYAT"
        gorevler={gorevler}
        baslikAnahtari="baslikSevkiyat"
        Ikon={Truck}
      />
      <TekKart
        ilerlemeAdresleri={ilerlemeAdresleri}
        grup="TEDARIK"
        gorevler={gorevler}
        baslikAnahtari="baslikTedarik"
        Ikon={PackageCheck}
      />
    </div>
  );
}
