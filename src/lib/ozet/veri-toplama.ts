import type { DogrulanabilirSayi } from "@/lib/llm/dogrulama";
import { bicimlendirici } from "@/lib/bicim";
import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import { uyarilariTopla } from "@/lib/uyari/topla";
import type { UyariAnahtari, UyariSeviyesi } from "@/lib/uyari/turler";
import { gorevSayilariniTopla } from "@/lib/panel/gorev-verisi";
import {
  GOREV_ADRESLERI,
  type GorevAnahtari,
} from "@/lib/panel/bugun-ne-yapmaliyim";
import { acikTazminatOzetiGetir } from "@/lib/panel/tazminat-ozeti";
import { acikKartBorcuOzetiGetir } from "@/lib/panel/kart-borcu-ozeti";
import { desiFarkliVaryantSayisi } from "@/lib/urun-karti-verisi";

/**
 * ============================================================================
 *  GÜNLÜK ÖZET — VERİ TOPLAMA (K-OZET)
 * ----------------------------------------------------------------------------
 *  Bu dosya YENİ HESAP YAZMAZ — yalnız var olan, zaten test edilmiş
 *  toplayıcıları çağırır (Uyarı Merkezi'nin kendi "kopya yasak" ilkesiyle
 *  aynı disiplin). Tek işi: sonucu LLM'e verilecek, DOĞRULANABİLİR bir
 *  pakete dönüştürmek.
 *
 *  ⚠ HER RAKAM ÖNCEDEN BİÇİMLENMİŞ METİN OLARAK TAŞINIR (`goruntu`). Bu,
 *  `ozet-dogrulama.ts`'in tam karşılaştıracağı değerdir — LLM bir rakamı
 *  yalnız `{{anahtar}}` yer tutucusuyla işaret edebilir, biz gerçek metne
 *  BURADA üretilen `goruntu` ile dönüştürürüz. `ham` yalnız modelin kendi
 *  önem sırası akıl yürütmesi içindir, doğrulamada KULLANILMAZ.
 *
 *  ⚠ `uyarilariTopla(true)` — TAM GÖRÜNÜM. Bu bir CRON işi, oturumu yok;
 *  varsayılan (oturum bazlı) süzgeç her izinli uyarıyı elerdi. Özetin
 *  kendisi zaten TEK sayfa izniyle (`ozet.gor`) kapılı (bkz. plan §7).
 * ============================================================================
 */

/** ⚠ K-TAVSIYE taşımasıyla artık `@/lib/llm/dogrulama`de tanımlı — burada yalnız eski ad korunuyor (re-export), ozet/ klasöründeki başka hiçbir satır değişmedi. */
export type OzetSayisi = DogrulanabilirSayi;
/**
 * `onem` — Uyarı Merkezi'nin kendi `UyariSeviyesi` sözlüğüyle AYNI üç
 * değer (kirmizi|amber|notr). LLM'e önceliklendirme sırasını VEREN alan
 * budur; model kendi kafasından önem çıkarmaz, burada beyan edilir.
 */
export type OzetBaglam = {
  anahtar: string;
  baslik: string;
  adres: string;
  onem: "kirmizi" | "amber" | "notr";
};
export type OzetVeriPaketi = {
  isGunu: string;
  sayilar: OzetSayisi[];
  baglamlar: OzetBaglam[];
};

/**
 * Uyarı türü başına PROMPT BAĞLAMI. Bu, çanın kendi `baslik_*` sözlük
 * anahtarlarından BİLEREK AYRI: o anahtarlar `{sayi}` iç içe geçirilmiş
 * next-intl şablonları (istemci-özel biçimlendirme), burası düz, statik
 * bir Türkçe açıklama — LLM'in girdisi, UI metni değil (i18n'e girmez).
 */
const UYARI_BAGLAMI: Record<UyariAnahtari, string> = {
  nakitAcigi: "Önümüzdeki 14 günde nakit açığı riski",
  maliyetsizStok: "Stokta olup birim maliyeti bilinmeyen ürün sayısı",
  karHesaplanamayan: "Kârı hesaplanamayan satış sayısı",
  hakedisGecikti: "Vadesi geçmiş, hâlâ ödenmemiş hakediş kalemi",
  cevapsizTalep: "Cevaplanmamış destek talebi sayısı",
  yedekEski: "Son yedeğin alınmasından bu yana geçen gün",
  yedekYok: "Elde doğrulanmış yedek yok",
  yedekIzden: "Yedek var ama depodan doğrulanamıyor",
  veriSupheli: "Maliyeti ya da kârı olağan aralığın dışında olan satış kalemi",
  iadeSayaciDoluyor: "Süresi dolmak üzere olan iade bildirimi",
  kanalKodsuzStok: "Stokta olup hiçbir pazaryerinde kodu olmayan ürün",
  hakedisBaglanmamis:
    "Satışa bağlanamadığı için gecikme sayımı dışında tutulan hakediş kalemi (bilgi amaçlı)",
  zararinaSatis: "Zararına kapanmış satış kalemi sayısı",
};

/**
 * BU ÜÇ UYARININ `sayi`Sİ HER ZAMAN 1 — GERÇEK BİR ADET/GÜN DEĞİL, VAROLUŞ
 * BAYRAĞI. Kaynak: `nakitAcigiOlcumu` ve `yedekOlcumu`/`yedekIzden` hesabı
 * (uyari/kurallar.ts · uyari/topla.ts) — üçü de koşullu olarak `sayi: 1`
 * sabit döner, hiçbir zaman 2/3/4 olmaz. Böyle bir "1"i modele anahtar
 * olarak vermek, LLM'in onu bir gün/adet sanıp cümleye yanlış yerleştirmesine
 * yol açar (gerçek denemede görüldü) — rakam kaynaklı olsa bile YANILTICI.
 */
const UYARI_SAYISI_ANLAMSIZ = new Set<UyariAnahtari>([
  "nakitAcigi",
  "yedekYok",
  "yedekIzden",
]);

const GOREV_BAGLAMI: Record<GorevAnahtari, string> = {
  onayBekleyen: "API'den düşen, onay bekleyen sipariş",
  kargoBekleyen: "Kargoya henüz verilmemiş sipariş",
  iadeBildirimi: "Karar bekleyen iade bildirimi",
  malKabulBekleyen: "Mal kabulü bekleyen alım",
  karHesaplanamayan: "Kârı hesaplanamayan satış (görev kutusu sayacı)",
  oransizKanalSku: "Komisyon oranı tanımsız kanal SKU",
  tarifePenceresi: "Tarife penceresi bitmek üzere olan kanal",
};

/** `bicimlendirici()`in kullandığı iki fonksiyonun ARAYÜZÜ — testte gerçek next-intl gerekmesin diye. */
export type OzetBicim = { para(tutar: number, paraBirimi: string): string; sayi(deger: number): string };

/**
 * SAF GÖVDE — VERİTABANI YOK, SAATİ KENDİ OKUMAZ (K-OZET).
 *
 * `ozetVeriPaketiOlustur`in ince, DB-dokunan kabuğu bu gövdeyi ZATEN
 * ÇEKİLMİŞ ham verilerle çağırır. Ayrım bilerek: "saf hesap katmanı desen
 * tarayan bekçiye muhtaç olmaz" ilkesi gereği, bekçi bu fonksiyonu doğrudan
 * ÇAĞIRARAK sınar — kaynak metni taramaz.
 */
export function ozetPaketiKur(
  girdi: {
    isGunu: string;
    uyarilar: {
      anahtar: UyariAnahtari;
      seviye: UyariSeviyesi;
      sayi: number;
      tutar: number | null;
      paraBirimi: string | null;
      adres: string;
    }[];
    gorevler: Record<GorevAnahtari, number>;
    tazminat: { paraBirimi: string; tutar: number }[];
    kartBorcu: { paraBirimi: string; tutar: number }[];
    desiFarkliSayisi: number;
  },
  bicim: OzetBicim,
): OzetVeriPaketi {
  const { uyarilar, gorevler, tazminat, kartBorcu, desiFarkliSayisi } = girdi;
  const sayilar: OzetSayisi[] = [];
  const baglamlar: OzetBaglam[] = [];

  for (const u of uyarilar) {
    if (u.sayi <= 0) continue;
    const kokAnahtar = `uyari_${u.anahtar}`;
    /**
     * ⚠ BAZI UYARILARIN `sayi`Sİ SAYI DEĞİL, VAROLUŞ BAYRAĞIDIR (her zaman
     * 1) — `nakitAcigi`/`yedekYok`/`yedekIzden` (bkz. uyari/kurallar.ts ve
     * uyari/topla.ts: üçü de `sayi: 1` sabit döner). Gerçek bir Gemini
     * denemesinde model bunu "önümüzdeki 1 günde" diye anlattı — rakam
     * KAYNAKLIYDI (doğrulama geçti) ama cümle YANILTICIYDI: "1" hiçbir
     * gün/adet ölçmüyor, yalnız "bu durum var" diyor. Böyle bir sayı
     * modele hiç VERİLMEZ — baglam zaten "olay var" demeye yetiyor, model
     * onu rakamsız anlatır.
     */
    if (!UYARI_SAYISI_ANLAMSIZ.has(u.anahtar)) {
      sayilar.push({
        anahtar: `${kokAnahtar}_sayi`,
        goruntu: bicim.sayi(u.sayi),
        ham: u.sayi,
      });
    }
    if (u.tutar !== null) {
      sayilar.push({
        anahtar: `${kokAnahtar}_tutar`,
        goruntu: bicim.para(u.tutar, u.paraBirimi ?? "TRY"),
        ham: u.tutar,
      });
    }
    baglamlar.push({
      anahtar: kokAnahtar,
      baslik: UYARI_BAGLAMI[u.anahtar],
      adres: u.adres,
      onem: u.seviye,
    });
  }

  for (const [anahtar, sayi] of Object.entries(gorevler) as [
    GorevAnahtari,
    number,
  ][]) {
    if (sayi <= 0) continue;
    const kokAnahtar = `gorev_${anahtar}`;
    sayilar.push({
      anahtar: `${kokAnahtar}_sayi`,
      goruntu: bicim.sayi(sayi),
      ham: sayi,
    });
    baglamlar.push({
      anahtar: kokAnahtar,
      baslik: GOREV_BAGLAMI[anahtar],
      adres: GOREV_ADRESLERI[anahtar],
      /** Görev kutusu zaten rutin operasyonel iş demek — para riski değil. */
      onem: "notr",
    });
  }

  for (const t of tazminat) {
    sayilar.push({
      anahtar: `tazminat_acik_${t.paraBirimi}`,
      goruntu: bicim.para(t.tutar, t.paraBirimi),
      ham: t.tutar,
    });
    baglamlar.push({
      anahtar: `tazminat_acik_${t.paraBirimi}`,
      baslik: `Tedarikçi/kargo/pazaryerinden açık tazminat alacağı (${t.paraBirimi})`,
      adres: "/tazminat",
      onem: "amber",
    });
  }

  for (const k of kartBorcu) {
    sayilar.push({
      anahtar: `kartborcu_acik_${k.paraBirimi}`,
      goruntu: bicim.para(k.tutar, k.paraBirimi),
      ham: k.tutar,
    });
    baglamlar.push({
      anahtar: `kartborcu_acik_${k.paraBirimi}`,
      baslik: `Kredi kartlarının açık (ödenmemiş) borcu (${k.paraBirimi})`,
      adres: "/kart-borcu",
      onem: "amber",
    });
  }

  if (desiFarkliSayisi > 0) {
    sayilar.push({
      anahtar: "desi_farkli_sayi",
      goruntu: bicim.sayi(desiFarkliSayisi),
      ham: desiFarkliSayisi,
    });
    baglamlar.push({
      anahtar: "desi_farkli_sayi",
      baslik:
        "Kanalın fiilen ölçtüğü kargo desisi, sistemdeki kayıtlı desiden farklı olan ürün sayısı",
      adres: "/urunler",
      onem: "notr",
    });
  }

  return { isGunu: girdi.isGunu, sayilar, baglamlar };
}

/** İNCE KABUK — DB'DEN ÇEKER, `ozetPaketiKur`i ÇAĞIRIR. Hiçbir kural burada YAZILMAZ. */
export async function ozetVeriPaketiOlustur(): Promise<OzetVeriPaketi> {
  const bugun = gunDegeri(isTakvimGunu(new Date()));
  const bicim = await bicimlendirici();

  const [uyarilar, gorevler, tazminat, kartBorcu, desiFarkliSayisi] =
    await Promise.all([
      uyarilariTopla(true),
      gorevSayilariniTopla(),
      acikTazminatOzetiGetir(),
      acikKartBorcuOzetiGetir(bugun),
      desiFarkliVaryantSayisi(),
    ]);

  return ozetPaketiKur(
    {
      isGunu: gunMetni(bugun),
      uyarilar,
      gorevler,
      tazminat,
      kartBorcu,
      desiFarkliSayisi,
    },
    bicim,
  );
}
