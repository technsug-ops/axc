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

  /**
   * ⛔ İKİ AÇIKLAMA TEK SATIRDA. Ayrı paragraflarken kutu iki satır daha
   * uzuyordu ve altındaki asıl iş kutuları ekranın dışına itiliyordu
   * (kullanıcı şartı 01.09.2026). Metin KISALTILMADI — birleştirildi.
   *
   * ⚠ Üçü de sıfırsa hüküm YAZILIR: sessiz kalmak "ölçüm mü gitti, sorun
   * mu bitti" sorusunu cevapsız bırakırdı.
   */
  const altNot = [
    hepsiSifir ? t("bos") : "",
    veri.olculmemisAdet > 0 ? t("olculmemisNotu") : "",
    /**
     * ⛔ PARA TABANI EKRANDA YAZAR — ANAYASA KURALI, TERCİH DEĞİL.
     * `unitCostAmount` FİİLEN ÖDENEN tutardır (KDV dahil); aynı stok "mal
     * bedeli (KDV hariç)" tabanıyla da yazılabilir ve iki rakam **%20'ye
     * varan** fark eder. 26.08.2026'da tam bu yaşandı: aynı stok, aynı an,
     * iki DOĞRU rakam (543.664,54 ↔ 453.053,78) ve hangisine bakıldığı
     * yazılı olmadığı için Halil testi düştü.
     * _(Anayasa: "para rakamı tabanıyla birlikte yazılır".)_
     */
    t("tabanNotu"),
  ]
    .filter((m) => m !== "")
    .join(" · ");

  const etiket: Record<VitrinSatiri, string> = {
    LISTELENMEMIS: t("listelenmemis"),
    PASIF: t("pasif"),
    STOK_KAPALI: t("stokKapali"),
  };

  return (
    <Card className="min-w-0">
      {/* TEK SATIR BASLIK — kullanici sarti 01.09.2026: kutu cok uzundu,
          yatay bosluk kullanilacak, panelin ust yarisi gorunur kalacak. */}
      <CardHeader className="gap-1 pb-2">
        <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Store className="size-4 shrink-0" />
          {t("baslik")}
          {veri.hesapAdi !== null ? (
            <span className="text-muted-foreground text-sm font-normal">
              {"\u00b7"} {veri.hesapAdi}
            </span>
          ) : null}
          <span className="text-muted-foreground text-sm font-normal tabular-nums">
            {t("ozet", {
              adet: veri.toplamAdet,
              tutar: bicim.para(veri.toplamTutar, "TRY"),
            })}
          </span>
          {/* ⚠ DAMGA HER ZAMAN GÖRÜNÜR — ölçüm yoksa da. Ve `ml-auto` ile
              SAĞ BOŞLUĞA yaslanıyor: kendi satırını yemiyor.
              ⚠ HAM TAILWIND RENGİ YASAK — `panel:dogrula` yakaladı ve haklıydı;
              renk `DURUM_YAZISI.uyari` belirtecinden geliyor.
              ⚠ BAŞARISIZLIK ÖNCELİKLİ — bayatlık mesajı onu ÖRTMEZ: sorun
              geçen zaman değil, koşumun DÜŞMESİ. */}
          <span
            className={
              sorunVar
                ? `ml-auto text-sm font-medium ${DURUM_YAZISI.uyari}`
                : "text-muted-foreground ml-auto text-sm font-normal"
            }
          >
            {veri.olcumAt === null
              ? t("hicOlculmedi")
              : t("sonKarsilastirma", { tarih: bicim.tarih(veri.olcumAt) })}
            {veri.sonKosumBasarisiz
              ? " \u00b7 " + t("kosumBasarisiz")
              : bayat
                ? " \u00b7 " + t("bayat", { saat: BAYAT_SAAT })
                : ""}
          </span>
        </CardTitle>
        {veri.sonKosumBasarisiz && veri.sonKosumMesaji !== null ? (
          <p className="text-muted-foreground text-xs">{veri.sonKosumMesaji}</p>
        ) : null}
      </CardHeader>

      {/* ⛔ GENİŞLİK SINIRI KALDIRILDI — VE NİYE.
          İlke #12'nin yasakladığı şey "tam genişlikte etiket solda / rakam ta
          sağda SATIR"dır; ÖNERDİĞİ şekil ise KOMPAKT KUTUCUK IZGARASI.
          Kutucuk ızgarası genişledikçe satır uzamaz, SÜTUN SAYISI artar — yani
          geniş ekran burada göz yormuyor, DİKEY YER KAZANDIRIYOR. `max-w-3xl`
          beş kutucuğu iki satıra kırıyor ve kutuyu boşuna uzatıyordu.
          _(Kullanıcı şartı 01.09.2026: "en fazla yarısı kadar aşağıya uzasın,
          yan taraftaki boşlukları kullan".)_ */}
      <CardContent className="min-w-0 space-y-2 pt-0">
        {/* ⛔ ÜÇÜ SAYIYA GİRER, İKİSİ GİRMEZ — ayrım KESİK ÇERÇEVE ve satır
            içindeki "(toplama girmez)" ile YAZILI. Yan yana durmaları onları
            aynı cinse çevirmez; ayrımı gizleyen tek şey YAZMAMAK olurdu. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {veri.satirlar.map((s) => {
            const govde = (
              <>
                <span className="text-muted-foreground text-xs">
                  {etiket[s.satir]}
                </span>
                {s.adet === 0 ? (
                  <span className="text-muted-foreground text-sm tabular-nums">
                    0 {"\u00b7"} {t("temiz")}
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
               boş bir ekrana götürürdü. İlke #2 — tıklanabilir görünen her şey
               tıklanabilir olmalı; TERSİ DE GEÇERLİ. */
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

          {/* ⛔ HİÇ KARŞILAŞTIRILMAMIŞLAR — 01.09.2026 arızasının GERÇEK
              sebebi. Kanal kodu yeni girilen ürün gece koşumuna kadar burada
              bekler; görünmezse ekleyen kişi için ürün EKRANDAN KAYBOLUR. */}
          {veri.olculmemisAdet > 0 ? (
            <Link
              href={vitrinAdresi("OLCULMEMIS")}
              className="hover:bg-muted/50 flex min-h-11 flex-col justify-center gap-0.5 rounded-lg border border-dashed px-3 py-2"
            >
              <span className="text-muted-foreground text-xs">
                {t("olculmemis")} {t("toplamaGirmez")}
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
                {t("kaydiYok")} {t("toplamaGirmez")}
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

        {altNot !== "" ? (
          <p className="text-muted-foreground text-xs">{altNot}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
