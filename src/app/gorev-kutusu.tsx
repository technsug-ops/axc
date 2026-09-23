import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, PackageCheck, Truck } from "lucide-react";

import { DurumRozeti } from "@/components/durum-rozeti";
import { DURUM_YAZISI, DURUM_ZEMINI } from "@/lib/renkler";
import {
  bekleyenToplam,
  GOREV_GRUPLARI,
  gorevleriKur,
  grubunGorevleri,
  type Gorev,
  type GorevAnahtari,
  type GorevGrubu,
} from "@/lib/panel/bugun-ne-yapmaliyim";

/**
 * ============================================================================
 *  GÜNLÜK İŞ ŞERİDİ — TEK SATIR, İKİ GRUP (K254, 23.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ İKİ KART KARARI ÇEVRİLDİ — GEREKÇESİ AŞAĞIDA DURUYOR. Kullanıcı demoyu
 *  onayladı: görevler tek satırlık ÇİP ŞERİDİ ("Bugün ne yapmalıyım · Onay
 *  bekleyen 3 · Paketlenecek 11 · …"). İki kartın sebebi («iki ayrı emek,» 
 *  20.08.2026) YAŞIYOR: şerit iki grubu ince bir ayraç ve ikonla ayırıyor,
 *  yalnız iki kart olarak değil. Kazanılan: panelin ilk ekranında iki kart
 *  ve on kutucuk yerine bir satır; hüküm kartları ile pazaryeri arasına
 *  giren şey artık bir bakışta okunuyor.
 *
 *  ⚠ SIFIR ÇİP BAĞLANTI DEĞİL (İlke #2): açılacak liste yoktur, tıklamak boş
 *  ekrana götürürdü. Ama KAYBOLMAZ — «temiz ✓» yazar (açık sıfır). Eski
 *  kutucuk sıfırda da bağlantıydı; demo ve İlke #2 bunu çevirdi.
 *
 *  ── ESKİ: GÜNLÜK İŞ KUTULARI — İKİ KART, İKİ FARKLI EMEK ────────────────
 * ----------------------------------------------------------------------------
 *  ⛔ ESKİ SIRA ÇEVRİLDİ — GEREKÇESİ SİLİNMİYOR (K250, 23.09.2026).
 *  Mimar kararı 14.08.2026 şöyleydi: _"Panel açılışında EYLEM üstte,
 *  rapor altta."_ O gün doğruydu — panel bir İŞ LİSTESİ gibi kurulmuştu.
 *  NİYE ÇEVRİLDİ (kullanıcı kararı 23.09.2026): panel o tarihten sonra
 *  HÜKÜM yeri oldu (İlke #13), döküm kendi sayfalarına taşındı (K244) ve
 *  NET-2 marjı + kanal hükmü eklendi (K245 · K246). Kullanıcı canlı
 *  panele bakıp tek bir lira görmeden yedi satır kabuk saydı. Para en
 *  üste çıktı; bu kutular KAYBOLMADI, bir satır aşağı indi.
 *
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

/**
 * TEK ÇİP — bekleyen (amber, bağlantı) · temiz (nötr, düz yazı) · süreli.
 * İki grup da aynı çipi kullanır, ayrışmasın diye (İlke #10).
 */
function GorevCipi({
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
  /** İlerleme rakamının kendi listesi; yoksa ana adrese düşer. */
  ilerlemeAdresi?: string;
  /**
   * SÜRE METNİ — "2 gün kaldı" / "Bugün son gün".
   * ⚠ SAYI YERİNE GEÇER, YANINA DEĞİL: tarife çipinde bekleyen kanal sayısı
   * 0 olsa bile iş bekliyor olabilir (pencere bugün bitiyor). Büyük bir
   * "0" basıp yanına "bugün son gün" yazmak ekranı kendiyle çeliştirirdi.
   */
  sureMetni?: string;
}) {
  /**
   * ⚠ İÇ İÇE <a> YOK — bilerek. Eski kutucuk yayılan bağlantı + z-10 hilesi
   * taşıyordu (kutunun tamamı bağlantıydı, ilerleme ikinci bağlantıydı).
   * Çipte ana bağlantı ile ilerleme bağlantısı KARDEŞ: ikisi de kendi
   * <a>'sı, iç içe değil. Hile ve bekçisi bununla birlikte kalktı.
   */
  const govde = (
    <>
      <span className="min-w-0 truncate">{etiket}</span>
      {gorev.temizMi ? (
        /* İŞARET + RENK BİRLİKTE: temizde ✓, bekleyende rakam (kısıt #1). */
        <span
          className={`inline-flex items-center gap-1 font-semibold ${DURUM_YAZISI.olumlu}`}
        >
          <Check className="size-3.5" aria-hidden />
          {temizMetni}
        </span>
      ) : sureMetni !== undefined ? (
        <span className="font-semibold">{sureMetni}</span>
      ) : (
        <span className="font-semibold tabular-nums">{gorev.sayi}</span>
      )}
    </>
  );
  /** ⚠ Telefonda 44 px (İlke #8), masaüstünde ince — çubukla aynı ölçü. */
  const sinif = `inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs md:min-h-8 ${
    gorev.temizMi ? DURUM_ZEMINI.notr : DURUM_ZEMINI.uyari
  }`;

  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1">
      {gorev.temizMi ? (
        /* SIFIR SATIR BAĞLANTI OLMAZ (İlke #2) — ama kaybolmaz (açık sıfır). */
        <span className={sinif}>{govde}</span>
      ) : (
        <Link href={gorev.adres} className={sinif}>
          {govde}
        </Link>
      )}
      {/*
        İLERLEME — "kaç tanesi hazır". Bekleyen sayısı tek başına yol aldığını
        göstermiyordu: 15 sipariş paketlenirken rakam 15'te duruyor.
        ⚠ HEPSİ HAZIRSA YEŞİL: "15 / 15" ile "15 / 3" aynı renkte dursaydı
        bitmiş iş bitmemiş gibi okunurdu.
        ⚠ RAKAM TIKLANABİLİR (İlke #2 + #9, kullanıcı 24.08.2026: "15
        paketlenen tıklayınca liste çıksa"). Kendi süzülü listesine gider.
      */}
      {gorev.ilerleme !== null ? (
        /* Temiz çipte ilerleme yazılmaz: «0 / 0 paketlendi» gürültü olurdu. */
        gorev.temizMi ? null : (
        <Link
          href={ilerlemeAdresi ?? gorev.adres}
          className={`inline-flex min-h-11 items-center rounded-md px-1.5 text-xs font-medium tabular-nums underline-offset-2 hover:underline md:min-h-8 ${
            gorev.ilerleme >= gorev.sayi
              ? DURUM_YAZISI.olumlu
              : "text-muted-foreground"
          }`}
        >
          {ilerlemeMetni}
        </Link>
        )
      ) : null}
    </span>
  );
}

/** Grup ikonu — iki emek görünür kalsın (20.08 kararının şeritteki izi). */
const GRUP_IKONU: Record<GorevGrubu, typeof Truck> = {
  SEVKIYAT: Truck,
  TEDARIK: PackageCheck,
};

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
  const t = await getTranslations("Gorevler");
  const gorevler = gorevleriKur(sayilar, ilerlemeler, sureler);
  const toplam = bekleyenToplam(gorevler);

  return (
    <div
      /**
       * TÜRLERİNE GÖRE SATIRLAR (K259, kullanıcı 24.09.2026: «biraz karmaşık;
       * türlerine göre düzenlemek gerek»). K254 iki grubu tek satırda ince
       * ayraçla ayırıyordu; iki emek göz için karışıyordu. Şimdi her grup
       * KENDİ SATIRINDA, BAŞLIĞI ve bekleyen sayısıyla — 20.08 gerekçesi
       * (farklı saat, farklı kişi) artık okunur hâlde.
       * Telefonda çipler satır içinde sarar; yatay kaydırma yok (İlke #8).
       */
      className="bg-card min-w-0 space-y-1.5 rounded-lg border px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">
          {t("baslik")}
        </span>
        {/* Bekleyen iş AMBER, hepsi temiz YEŞİL — renk sistemi. */}
        {toplam > 0 ? (
          <DurumRozeti durum="uyari">{t("bekleyen", { sayi: toplam })}</DurumRozeti>
        ) : (
          <DurumRozeti durum="olumlu">{t("hepsiTemiz")}</DurumRozeti>
        )}
      </div>
      {GOREV_GRUPLARI.map((grup) => {
        const Ikon = GRUP_IKONU[grup];
        const grubunkiler = grubunGorevleri(gorevler, grup);
        const grupBekleyen = bekleyenToplam(grubunkiler);
        return (
          <div key={grup} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
            {/* GRUP BAŞLIĞI — satırın başında, GÖRÜNÜR (K259). İkon + ad +
                grubun bekleyen sayısı; sabit genişlik ki iki satırın çipleri
                aynı hizadan başlasın. */}
            <span className="inline-flex min-w-0 shrink-0 items-center gap-1.5 text-xs font-medium sm:w-48">
              <Ikon className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <span className="truncate">
                {t(grup === "SEVKIYAT" ? "baslikSevkiyat" : "baslikTedarik")}
              </span>
              {grupBekleyen > 0 ? (
                <span className="text-muted-foreground tabular-nums">({grupBekleyen})</span>
              ) : null}
            </span>
            {grubunkiler.map((g) => (
              <GorevCipi
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
        );
      })}
    </div>
  );
}
