import { baslikKur, type Kimlik } from "./istemci";

/**
 * ============================================================================
 *  K194 — N11 YAZMA İSTEMCİSİ (İKİNCİ KANAL)
 * ----------------------------------------------------------------------------
 *  Halil kararı 09.09.2026: stok TEK düğmeyle üç kanala, fiyat kanal başına
 *  AYRI düğmeyle. TY'de açılan yol (K169) burada tekrarlanıyor.
 *
 *  ⛔ YAZIM OKUMADAN KATEGORİK TEHLİKELİ (Halil, 09.09): her yazım
 *  **ÖNİZLE → ONAYLA** protokolünden geçer, asla körlemesine toplu gitmez.
 *  Bu dosya yalnız GÖNDERİR; kararı ekran verir ve bekçisi
 *  `kanal-yazma:dogrula` önizlemesiz çağrıyı kırmızı yakar.
 *
 *  ⛔ BU DOSYA DIŞINDA N11'E FİİL YOK. `api:dogrula` bunu
 *  KANALA_YAZMASI_BEYANLI listesiyle tanır; beyan muafiyet değil TAAHHÜTTÜR.
 *
 *  UÇ — RESMÎ DOKÜMANDAN (n11 Mağaza Destek Merkezi, 09.09.2026):
 *    POST https://api.n11.com/ms/product/tasks/price-stock-update
 *    kimlik: `appKey`/`appSecret` BAŞLIKTA (auth şeması YOK) — mevcut okuma
 *    istemcisinin `baslikKur`u ile birebir aynı.
 *    gövde: { payload: { integrator, skus: [{ stockCode, listPrice,
 *            salePrice, quantity, currencyType }] } }
 *    yanıt: { id (taskId), type: "SKU_UPDATE", status: "IN_QUEUE" | "REJECT",
 *            reasons: string[] }
 *
 *  ── ⛔ DOKÜMANDAKİ KURALLAR KODA GEÇTİ — "FAIL"İ BAŞTAN ENGELLE ────────
 *  Doküman şunları söylüyor ve üçü de İSTEK GİTMEDEN sınanıyor; kanala
 *  gidip `FAIL` almak, önlenebilir bir gürültüdür:
 *    ① `listPrice` ve `salePrice` BİRLİKTE gönderilmeli — biri tek başına
 *       olamaz.
 *    ② `listPrice` > `salePrice` ŞART; değilse istek FAIL olur.
 *    ③ Küsurat NOKTA ile ve noktadan sonra TAM 2 hane; aksi hâlde FAIL.
 *  ⚠ Yalnız stok güncellenecekse fiyat alanları HİÇ gönderilmez — dokümanın
 *  kendi kuralı: "istekte mevcut olmayan alanlar için update yapılmaz."
 *  Boş/sıfır göndermek stok-yalnız gönderimi fiyat yazımına çevirirdi.
 *
 *  ⚠ TEK KALEM: bu sürüm bilerek tek üründür. Doküman 1000 SKU'ya izin
 *  veriyor ama Halil kararı açık — **ilk gönderimler TEK TEK**. Toplu
 *  gönderim ayrı bir karardır ve önizleme tasarımı da onunla değişir.
 *
 *  ⚠ ANAHTAR YALNIZ BELLEĞE; istek gövdesi İZE yazılır (ne gönderdiğimiz
 *  sorulabilir olmalı) ama anahtar/başlık asla.
 *
 *  ⛔ SONUÇ SORGUSU HENÜZ YOK — VE BU BEYAN EDİLİYOR: doküman "TaskDetails
 *  servisi ile kontrol sağlanabilir" diyor ama o ucun TAM YOLUNU vermiyor.
 *  Uydurulmuş bir yol yanlış yere sorar ve "sonuç okunamadı"yı "sorun yok"
 *  gibi gösterir. Yol geldiğinde `gonderimSonucu` buraya eklenecek.
 *  _(Anayasa: "sistem, kendi defterinde takip etmediği şey hakkında iddia
 *  kurmaz".)_
 * ============================================================================
 */

const TABAN = "https://api.n11.com";

/**
 * ⚠ SABİT VE DEĞİŞMEZ: doküman "tüm gönderimlerinizde aynı değeri kullanın"
 * diyor. Uygulama adından (`UYGULAMA.ad`) türetilmedi bilerek — ad bir gün
 * değişirse N11 tarafındaki entegratör kimliği de değişir ve geçmiş
 * gönderimlerle bağı kopar.
 */
const ENTEGRATOR = "SELLIORA";

export type GonderilecekKalem = {
  /** Tedarikçinin ürüne verdiği uniq kod — bizde `ChannelSku.channelSku`. */
  stockCode: string;
  quantity?: number;
  listPrice?: number;
  salePrice?: number;
};

export type YazmaSonucu =
  | { tur: "KABUL"; taskId: number; durum: string; sebepler: string[] }
  | { tur: "REDDEDILDI"; taskId: number | null; sebepler: string[] }
  | { tur: "YETKISIZ"; durum: number }
  | { tur: "ISTEK_HATALI"; durum: number; mesaj: string }
  | { tur: "ULASILAMADI"; sebep: string }
  /** ⛔ İSTEK HİÇ GİTMEDİ — kural ihlali önceden yakalandı. */
  | { tur: "KURAL_IHLALI"; kod: KuralKodu; mesaj: string };

export type KuralKodu =
  | "FIYAT_TEK_BASINA"
  | "LISTE_FIYATI_DUSUK"
  | "KURUSAT_HATALI"
  | "GONDERILECEK_YOK";

/**
 * ⭐ SAF KURAL — İSTEK GİTMEDEN SINANIR (ve bekçi bunu ÇAĞIRARAK ölçer).
 *
 * Ağa çıkmadığı için değer testiyle sınanabiliyor; desen taramaya gerek yok.
 * _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 */
export function kalemGecerliMi(
  kalem: GonderilecekKalem,
): { gecerli: true } | { gecerli: false; kod: KuralKodu; mesaj: string } {
  const fiyatVar = kalem.listPrice !== undefined || kalem.salePrice !== undefined;
  const stokVar = kalem.quantity !== undefined;

  if (!fiyatVar && !stokVar) {
    return {
      gecerli: false,
      kod: "GONDERILECEK_YOK",
      mesaj: "Ne stok ne fiyat verildi — gönderilecek bir şey yok.",
    };
  }

  if (fiyatVar) {
    /** ① İkisi BİRLİKTE — dokümanın açık şartı. */
    if (kalem.listPrice === undefined || kalem.salePrice === undefined) {
      return {
        gecerli: false,
        kod: "FIYAT_TEK_BASINA",
        mesaj:
          "N11 fiyat güncellemesinde liste ve satış fiyatı BİRLİKTE gönderilmeli.",
      };
    }
    /** ② listPrice > salePrice — eşitlik de FAIL. */
    if (!(kalem.listPrice > kalem.salePrice)) {
      return {
        gecerli: false,
        kod: "LISTE_FIYATI_DUSUK",
        mesaj:
          "Liste fiyatı satış fiyatından YÜKSEK olmalı (eşit de olamaz). " +
          `Verilen: liste ${kalem.listPrice} · satış ${kalem.salePrice}.`,
      };
    }
    /**
     * ③ Küsurat en fazla 2 hane. ⚠ Yuvarlamıyoruz: yuvarlamak kullanıcının
     * girdiği fiyatı SESSİZCE değiştirmek olurdu ve kanala bizim
     * uydurduğumuz bir rakam giderdi.
     */
    for (const [ad, deger] of [
      ["liste fiyatı", kalem.listPrice],
      ["satış fiyatı", kalem.salePrice],
    ] as const) {
      if (!Number.isFinite(deger) || deger <= 0) {
        return {
          gecerli: false,
          kod: "KURUSAT_HATALI",
          mesaj: `${ad} geçerli bir pozitif sayı değil.`,
        };
      }
      if (Math.round(deger * 100) !== Number((deger * 100).toFixed(6))) {
        return {
          gecerli: false,
          kod: "KURUSAT_HATALI",
          mesaj: `${ad} en fazla 2 küsurat hanesi taşıyabilir — verilen: ${deger}.`,
        };
      }
    }
  }

  if (stokVar && (!Number.isInteger(kalem.quantity) || (kalem.quantity ?? 0) < 0)) {
    return {
      gecerli: false,
      kod: "KURUSAT_HATALI",
      mesaj: "Stok tam sayı ve negatif olmayan bir değer olmalı.",
    };
  }

  return { gecerli: true };
}

/**
 * TEK YAZMA NOKTASI — uç ve fiil SABİT (parametre değil): ikinci bir uca
 * yazmak bu dosyada İMKÂNSIZ olsun diye.
 */
export async function stokFiyatGonder(
  k: Kimlik,
  kalem: GonderilecekKalem,
  zamanAsimiMs = 20_000,
): Promise<YazmaSonucu> {
  /** ⛔ KURAL ÖNCE — ağa çıkmadan. */
  const kural = kalemGecerliMi(kalem);
  if (!kural.gecerli) {
    return { tur: "KURAL_IHLALI", kod: kural.kod, mesaj: kural.mesaj };
  }

  try {
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), zamanAsimiMs);
    const cevap = await fetch(`${TABAN}/ms/product/tasks/price-stock-update`, {
      method: "POST",
      headers: { ...baslikKur(k), "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: { integrator: ENTEGRATOR, skus: [kalem] },
      }),
      signal: kontrol.signal,
    });
    clearTimeout(zaman);
    const govde = await cevap.text();

    if (cevap.status === 401 || cevap.status === 403) {
      return { tur: "YETKISIZ", durum: cevap.status };
    }
    if (!cevap.ok) {
      return {
        tur: "ISTEK_HATALI",
        durum: cevap.status,
        /** ⛔ KIRPMA YOK (K183) — yazma ucunun hatası en pahalı teşhis. */
        mesaj: govde.replace(/\s+/g, " ").trim(),
      };
    }

    const j = JSON.parse(govde) as {
      id?: number;
      status?: string;
      reasons?: string[];
    };
    const sebepler = Array.isArray(j.reasons) ? j.reasons : [];

    /**
     * ⛔ `REJECT` BAŞARI DEĞİLDİR — VE HTTP 200 İLE GELİR. Yalnız
     * `cevap.ok`a bakan bir gövde bunu "gönderildi" sayardı; dokümanın
     * kendi tablosu diyor ki `REJECT` = task işlenmemiştir.
     */
    if (j.status === "REJECT") {
      return { tur: "REDDEDILDI", taskId: j.id ?? null, sebepler };
    }
    if (typeof j.id !== "number") {
      return {
        tur: "ISTEK_HATALI",
        durum: cevap.status,
        mesaj: "taskId dönmedi: " + govde.replace(/\s+/g, " ").trim(),
      };
    }
    return {
      tur: "KABUL",
      taskId: j.id,
      durum: j.status ?? "(durum yok)",
      sebepler,
    };
  } catch (e) {
    return {
      tur: "ULASILAMADI",
      sebep: e instanceof Error ? e.message.slice(0, 120) : String(e),
    };
  }
}
