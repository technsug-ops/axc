import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Store } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { DURUM_YAZISI } from "@/lib/renkler";
import { vitrinAdresi, type VitrinSatiri } from "@/lib/vitrin-kutusu";
import type { VitrinKutusu as Veri } from "@/lib/panel/vitrin-verisi";

/**
 * ============================================================================
 *  "RAFTA VAR, VİTRİNDE YOK" KUTUSU (K121③, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: elimizde malı olan ürünler pazaryerinde satılamıyor ve sistem
 *  bunu bilmiyordu. Ölçüldü (TY, 01.09.2026): 23 ürün · ₺249.636,58 — rafta
 *  yatan sermaye + kaçan satış.
 *
 *  ── ⛔ DÖRDÜNCÜ SATIR TOPLAMA GİRMEZ ─────────────────────────────────
 *  "Kanal kaydı yok" bir KUSUR değil BOŞLUKTUR: ürün kanalda olabilir de
 *  olmayabilir de, defter bilmiyor. Ölçüldü — 9 varyantın 4'ü aslında
 *  kanalda VAR. Toplama katılsaydı kutu ₺33.857 fazla gösterirdi ve dördü
 *  haksız yere suçlanırdı. _(Kullanıcı şartı: BILINMIYOR ayrı satır.)_
 *
 *  ── ⛔ SIFIR SATIR GİZLENMEZ — VE BU BİR ARIZADAN SONRA DÜZELTİLDİ ───
 *  Eskiden `adet > 0` olmayan satır hiç çizilmiyordu. 01.09.2026 sabahı kutu
 *  kendiliğinden boşaldı ve kullanıcı sordu: _"bu bilgilendirmeler neden
 *  gitmiş"_. Ekranda **"baktım, temiz"** ile **"bu satır artık yok"** ayırt
 *  edilemiyordu. Üç satır artık HER ZAMAN duruyor; sıfır olan `0 · temiz`
 *  yazar ve bağlantı OLMAZ (açılacak liste yok, İlke #16).
 *
 *  ── ⛔ BEŞİNCİ SATIR: HİÇ KARŞILAŞTIRILMAMIŞLAR ──────────────────────
 *  Aynı sabahın gerçek sebebi buydu: Halil **19 ürüne TY kodu ekledi**
 *  (05:03–09:25, `createdAt` damgaları birebir söylüyor) ve gece koşumu
 *  ondan sonra hiç koşmadı. Yeni satır `BILINMIYOR` doğar; kutu onları
 *  hiçbir yerde saymıyordu. Tarama dosyasıyla çaprazlandı: **6'sı STOKSUZ,
 *  4'ü PASIF** — yani 10'u gerçekten satılamaz durumdaydı ve ekranda
 *  görünmüyordu. Sayıya GİRMEZ (defterin hükmü yok), ama GÖRÜNÜR.
 *
 *  ── ⚠ SATIRLAR ₺'YE GÖRE SIRALI ──────────────────────────────────────
 *  Sıralama `vitrinKutusunuTopla` içinde yapılıyor; kutu onu bozmaz.
 *  13 ucuz ürün 5 pahalı üründen önce gelmemeli.
 *
 *  ── ⚠ ÖLÇÜM DAMGASI HER ZAMAN GÖRÜNÜR ───────────────────────────────
 *  Hiç ölçülmediyse "—" değil **"henüz karşılaştırılmadı"**. Bir tire,
 *  okuyana "veri yok" mu "sıfır" mı olduğunu söylemez.
 *  ⚠ VE 48 SAATTEN ESKİYSE TURUNCU: bayat bir rakam taze sanılmasın.
 *  Kaçırılan bir gece koşumu ekranda görünür — üçüncü kaçış birinin fark
 *  etmesine kalmaz. _(Anayasa: "kaçışın kendisi görünür kılınır".)_
 * ============================================================================
 */

/** Damganın bayatlama eşiği. Gece koşumu günlük; 48 saat = iki koşum kaçtı. */
const BAYAT_SAAT = 48;

export async function VitrinKutusu({ veri }: { veri: Veri }) {
  const t = await getTranslations("Vitrin");
  const bicim = await bicimlendirici();

  /**
   * ⛔ HESAP YOKSA KUTU HİÇ ÇİZİLMEZ. Boş bir kutu "her şey yolunda" der;
   * oysa ölçülmemiş demektir. _(Anayasa: boş sonuç ile temiz sonuç ayrılır.)_
   */
  if (veri.hesapId === null) return null;

  /**
   * ⚠ "TEMİZ" ARTIK BİR HÜKÜM, BİR BOŞLUK DEĞİL: üç satır da sıfırsa kutu
   * bunu SÖYLER. Eskiden satırlar hiç çizilmediği için kutu sessizce
   * boşalıyordu ve okuyan "ölçüm mü gitti, sorun mu bitti" bilemiyordu.
   */
  const hepsiSifir = veri.satirlar.every((s) => s.adet === 0);

  /**
   * ⚠ `Date.now()` RENDER İÇİNDE ÇAĞRILMAZ — lint yakaladı ve haklıydı:
   * saf olmayan bir çağrı, aynı girdiyle farklı çıktı üretir ve React'in
   * varsayımını kırar. Yaş VERİ katmanında hesaplanıp prop olarak geliyor.
   */
  /**
   * ⛔ BAŞARISIZLIK BAYATLIKTAN ÖNCE GELİR. Koşum düştüyse damga "48 saat
   * oldu" DEMEZ — o yanlış teşhis olurdu: sorun geçen zaman değil, koşumun
   * DÜŞMESİ. İkisi farklı iş istiyor. _(Kullanıcı şartı 01.09.2026.)_
   */
  const bayat = veri.yasSaat !== null && veri.yasSaat > BAYAT_SAAT;
  const sorunVar = veri.sonKosumBasarisiz || bayat;

  const etiket: Record<VitrinSatiri, string> = {
    LISTELENMEMIS: t("listelenmemis"),
    PASIF: t("pasif"),
    STOK_KAPALI: t("stokKapali"),
  };

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-1 pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Store className="size-4 shrink-0" />
          {t("baslik")}
          {/* ⛔ KANAL ADI BAŞLIKTA — VE BU BİR SORUDAN SONRA EKLENDİ.
              Kullanıcı sordu: "kanal kaydı yok kısmında iki farklı sayı var,
              hangisi muteber?" Kutu 9 diyordu, uyarı merkezi 2. İKİSİ DE
              DOĞRUYDU — ölçüldü: 2 = HİÇBİR kanalda kodu yok, 9 = bu kanalda
              kaydı yok, ve 2 kümesi 9'un ALT KÜMESİ (kalan 7'sinin
              Hepsiburada'da kodu var). Çelişki yoktu, KAPSAM yazılmamıştı.
              _(Anayasa: iki rakam yan yana bırakılmaz; ikisi de kaynağıyla
              yazılır ve hangisinin neyi ölçtüğü söylenir.)_ */}
          {veri.hesapAdi !== null ? (
            <span className="text-muted-foreground text-sm font-normal">
              · {veri.hesapAdi}
            </span>
          ) : null}
          <span className="text-muted-foreground text-sm font-normal tabular-nums">
            {t("ozet", {
              adet: veri.toplamAdet,
              tutar: bicim.para(veri.toplamTutar, "TRY"),
            })}
          </span>
        </CardTitle>
        <p className="text-muted-foreground text-sm">{t("notu")}</p>
        {/* ⚠ DAMGA HER ZAMAN GÖRÜNÜR — ölçüm yoksa da. */}
        <p
          className={
            /**
             * ⚠ HAM TAILWIND RENGİ YASAK — `panel:dogrula` yakaladı ve haklıydı.
             * Renk `DURUM_YAZISI.uyari` belirtecinden geliyor; elle yazılan
             * bir ton, karanlık temada ve ileride palet değişince ayrışırdı.
             */
            sorunVar
              ? `text-sm font-medium ${DURUM_YAZISI.uyari}`
              : "text-muted-foreground text-sm"
          }
        >
          {veri.olcumAt === null
            ? t("hicOlculmedi")
            : t("sonKarsilastirma", { tarih: bicim.tarih(veri.olcumAt) })}
          {/* ⚠ BAŞARISIZLIK ÖNCELİKLİ — bayatlık mesajı onu ÖRTMEZ. */}
          {veri.sonKosumBasarisiz
            ? " · " + t("kosumBasarisiz")
            : bayat
              ? " · " + t("bayat", { saat: BAYAT_SAAT })
              : ""}
        </p>
        {/* ⛔ SEBEP EKRANDA YAZAR — "başarısız" tek başına ne yapılacağını
            söylemez (İlke #5: sessiz başarısızlık yasak). */}
        {veri.sonKosumBasarisiz && veri.sonKosumMesaji !== null ? (
          <p className="text-muted-foreground text-xs">{veri.sonKosumMesaji}</p>
        ) : null}
      </CardHeader>

      {/* ⛔ GENİŞLİK SINIRI — İLKE #12. Kutu panelde TAM GENİŞLİKTE duruyor;
          satırlar sınırsız bırakılsaydı etiket solda, rakam ta sağda kalır
          ve göz aradaki yüzlerce pikseli kat etmek zorunda kalırdı — anayasanın
          adıyla yasakladığı kalıp. Sınır burada, ızgarada değil: kutu nereye
          konursa konsun içi okunabilir kalsın. */}
      {/* ⛔ GENİŞLİK SINIRI — İLKE #12. Kutu panelde TAM GENİŞLİKTE duruyor;
          satırlar sınırsız bırakılsaydı etiket solda, rakam ta sağda kalır
          ve göz aradaki yüzlerce pikseli kat etmek zorunda kalırdı — anayasanın
          adıyla yasakladığı kalıp. Sınır burada, ızgarada değil: kutu nereye
          konursa konsun içi okunabilir kalsın.

          ⭐ VE KALIP "SATIR" DEĞİL "KOMPAKT KUTUCUK IZGARASI" — anayasanın
          İlke #12'de adıyla önerdiği şekil. Üç rakam yan yana durunca
          karşılaştırılabiliyor; alt alta uzun satırlar hâlinde durunca
          durmuyordu. */}
      <CardContent className="min-w-0 max-w-3xl space-y-3">
        {/* ── SAYIYA GİREN ÜÇ KUTUCUK — HER ZAMAN ÜÇÜ DE ÇİZİLİR ──
            ⛔ SIFIR OLANI DA. "Baktım, temiz" ile "bu satır artık yok"
            ekranda AYNI görünüyordu ve kutu bir sabah kendiliğinden boşaldı.
            _(Anayasa: boş sonuç ile temiz sonuç ayırt edilir.)_ */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {veri.satirlar.map((s) => {
            const govde = (
              <>
                <span className="text-muted-foreground text-xs">
                  {etiket[s.satir]}
                </span>
                {s.adet === 0 ? (
                  /* ⚠ SIFIR AÇIKÇA YAZAR — ve "temiz" olduğu da yazar ki
                     okuyan bunu bir eksiklik sanmasın. */
                  <span className="text-muted-foreground text-sm tabular-nums">
                    0 · {t("temiz")}
                  </span>
                ) : (
                  <span className="text-sm font-medium tabular-nums">
                    {t("satirOzeti", {
                      adet: s.adet,
                      tutar: bicim.para(s.tutar, "TRY"),
                    })}
                  </span>
                )}
              </>
            );
            /* ⛔ SIFIR SATIR BAĞLANTI DEĞİLDİR: açılacak liste yok, tıklamak
               boş bir ekrana götürürdü. İlke #2 — tıklanabilir görünen her
               şey tıklanabilir olmalı; tersi de geçerli. */
            return s.adet === 0 ? (
              <div
                key={s.satir}
                className="flex min-h-11 flex-col justify-center gap-0.5 rounded-lg border px-3 py-2"
              >
                {govde}
              </div>
            ) : (
              <Link
                key={s.satir}
                href={vitrinAdresi(s.satir)}
                className="hover:bg-muted/50 flex min-h-11 flex-col justify-center gap-0.5 rounded-lg border px-3 py-2"
              >
                {govde}
              </Link>
            );
          })}
        </div>

        {/* ⚠ ÜÇÜ DE SIFIRSA HÜKÜM YAZILIR — sessiz kalmak "ölçüm mü gitti,
            sorun mu bitti" sorusunu cevapsız bırakırdı. */}
        {hepsiSifir ? (
          <p className="text-muted-foreground text-sm">{t("bos")}</p>
        ) : null}

        {/* ── SAYIYA GİRMEYEN İKİ KÜME — KESİK ÇERÇEVE ──
            ⛔ İKİSİ DE TOPLAMA GİRMEZ ve bu EKRANDA YAZAR; okuyan çıkarmak
            zorunda kalmasın, yoksa toplam ile satırlar çelişiyor sanılır. */}
        {veri.olculmemisAdet > 0 || veri.kaydiYokAdet > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* ⛔ HİÇ KARŞILAŞTIRILMAMIŞLAR — 01.09.2026 arızasının GERÇEK
                sebebi. Kanal kodu yeni girilen ürün gece koşumuna kadar
                burada bekler; görünmezse ekleyen kişi için ürün KAYBOLUR. */}
            {veri.olculmemisAdet > 0 ? (
              <Link
                href={vitrinAdresi("OLCULMEMIS")}
                className="hover:bg-muted/50 flex min-h-11 flex-col justify-center gap-0.5 rounded-lg border border-dashed px-3 py-2"
              >
                <span className="text-muted-foreground text-xs">
                  {t("olculmemis")}
                  <span className="ml-1">{t("toplamaGirmez")}</span>
                </span>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {t("satirOzeti", {
                    adet: veri.olculmemisAdet,
                    tutar: bicim.para(veri.olculmemisTutar, "TRY"),
                  })}
                </span>
              </Link>
            ) : null}

            {veri.kaydiYokAdet > 0 ? (
              <Link
                href={vitrinAdresi("KAYIT_YOK")}
                className="hover:bg-muted/50 flex min-h-11 flex-col justify-center gap-0.5 rounded-lg border border-dashed px-3 py-2"
              >
                <span className="text-muted-foreground text-xs">
                  {t("kaydiYok")}
                  <span className="ml-1">{t("toplamaGirmez")}</span>
                </span>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {t("satirOzeti", {
                    adet: veri.kaydiYokAdet,
                    tutar: bicim.para(veri.kaydiYokTutar, "TRY"),
                  })}
                </span>
              </Link>
            ) : null}
          </div>
        ) : null}

        {/* ⚠ NİYE BEKLİYORLAR — İlke #5: bir şey olmadıysa NEDEN olmadığı
            ekranda yazar. "Henüz karşılaştırılmadı" tek başına ne yapılacağını
            söylemez. */}
        {veri.olculmemisAdet > 0 ? (
          <p className="text-muted-foreground text-xs">{t("olculmemisNotu")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
