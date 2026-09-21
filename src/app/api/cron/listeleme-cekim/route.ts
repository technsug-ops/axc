import { NextRequest, NextResponse } from "next/server";

import { hbListelemeCekimKos } from "../../../../../scripts/canli-hb-listeleme-yaz";
import { tyListelemeCekimKosGuvenli } from "../../../../../scripts/canli-kanal-listeleme-yaz";
import { n11ListelemeCekimKosGuvenli } from "../../../../../scripts/canli-n11-listeleme-yaz";

/**
 * ============================================================================
 *  K225 — KANAL LİSTELEME DURUMU ÇEKİMİNİN SUNUCU UCU (21.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: listeleme durumu deftere yazılıyordu ama senkronu ÇAĞIRAN
 *  hiçbir şey yoktu. Ölçüldü 21.09.2026 — HB verisi **14 gün**, TY verisi
 *  **21 gün** bayattı ve `/kanal-listeleme` ekranı o bayat rakamı gösterecekti.
 *  Ekran yaşı yazıyor ama **söylemek çözmek değildir**.
 *
 *  ⚠ TEK UÇ, İKİ KANAL — VE BU BİLİNÇLİ BİR AYRIM.
 *  Sipariş/hakediş çekimleri kanal başına AYRI uçlar (`ty-cekim` ·
 *  `hb-cekim` · `n11-cekim`) çünkü onlar farklı kadanslı, farklı işler.
 *  Listeleme durumu ise HER KANALA SORULAN TEK SORUDUR ve ekran üçünü
 *  BİRLİKTE gösteriyor. N11 satırı 22.09.2026'da eklendi (K225-②): o güne
 *  kadar N11 %0 ölçülmüştü, TY/HB %99,7-%99,9. Aynı uç, aynı kadans;
 *  yeni bir rota + vercel girdisi + Action üçlüsü açılmaz.
 *
 *  ⛔ BİR KANALIN DÜŞMESİ ÖTEKİNİ DURDURMAZ. Her kanal ayrı sarılır ve
 *  sonucu ayrı raporlanır — "ikisi de koştu" ile "biri koştu, biri düştü"
 *  aynı görünmez. _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen
 *  denetim, denetim değildir".)_
 *
 *  ⚠ KAPI: `Authorization: Bearer <CRON_SECRET>`. Sır tutmayan/yanlış tutan
 *  istek **404** alır — rotanın varlığı bile sızmaz.
 *
 *  ⚠ İDEMPOTENT: iki betik de "oku, karşılaştır, farklıysa yaz" yapıyor;
 *  çift tetik ikinci koşumda sıfır satır değiştirir (ölçüldü 21.09.2026:
 *  ilk koşum 106 satır, hemen ardından ikinci koşum 0).
 *
 *  ⛔ PAZARYERİNE HİÇBİR ŞEY YAZILMAZ — iki betik de yalnız GET yapıyor.
 * ============================================================================
 */

export const dynamic = "force-dynamic";
/**
 * ⛔ 60 SANİYE YETMEDİ — VE "~40 sn" İDDİASI YANLIŞ ÖLÇÜLMÜŞTÜ.
 *
 * Burada şöyle yazıyordu: _"Ölçüldü 21.09.2026 — ikisi birlikte ~40 sn.
 * Varsayılana bel bağlanmadı."_ O ölçüm **YEREL MAKİNEDE** yapılmıştı ve
 * sunucuya aitmiş gibi yazılmıştı. İlk gerçek tetikte uç **504
 * FUNCTION_INVOCATION_TIMEOUT** verdi.
 * _(Anayasa: "bunu neyin üstünde ölçtün, ve o kaynağı sistemin kendi
 * izinden mi doğruladın" — yerelde ölçüp sunucu için iddia kurmak,
 * ölçmemekle aynı şeydir.)_
 *
 * ⚠ YEREL SÜRELER (gerçek, 21.09.2026): TY kuru koşum **8 sn**, HB **8 sn**.
 * Sunucuda 60 sn'yi aşması sürenin AĞDAN geldiğini söylüyor: fra1'den
 * Türkiye'deki pazaryeri uçlarına ve veritabanına her gidiş-dönüş yerelden
 * pahalı, ve TY yazımı satır satır ~1100 satıra dokunuyor.
 *
 * ⭐ TAVAN YİNE TAHMİN DEĞİL: süre artık CEVAPTA dönüyor (`tyMs`/`hbMs`).
 * İlk başarılı koşum gerçek rakamı verir ve bu sayı ona göre düzeltilir —
 * bugün 300, çünkü ölçülen tek şey "60 yetmiyor".
 */
export const maxDuration = 300;

export async function GET(istek: NextRequest) {
  const sir = process.env.CRON_SECRET?.trim() ?? "";
  const gelen = istek.headers.get("authorization") ?? "";
  if (sir === "" || gelen !== `Bearer ${sir}`) {
    return new NextResponse(null, { status: 404 });
  }
  const dbAdresi = process.env.DATABASE_URL?.trim() ?? "";
  if (dbAdresi === "") {
    return NextResponse.json({ hata: "VERITABANI_TANIMSIZ" }, { status: 500 });
  }

  /**
   * ⛔ SIRALI KOŞUYOR, PARALEL DEĞİL: ikisi de `process.env.DATABASE_URL`
   * yazıyor ve aynı anda koşsalar biri ötekinin adresini ezerdi.
   */
  const tyBasladi = Date.now();
  const ty = await tyListelemeCekimKosGuvenli({ yaz: true, dbAdresi });
  const tyMs = Date.now() - tyBasladi;

  const hbBasladi = Date.now();
  const hb = await hbListelemeCekimKos({ yaz: true, dbAdresi }).catch((e: unknown) => ({
    atlandi: "COKTU" as const,
    mesaj: (e instanceof Error ? (e.stack ?? e.message) : String(e)).replace(/\r?\n/g, " "),
  }));
  const hbMs = Date.now() - hbBasladi;

  /**
   * ⚠ DÜŞEN KANAL SAYILIR VE DURUM KODUNA YANSIR. `200` dönseydi GitHub
   * Action yeşil yanar ve yarısı koşmayan bir senkron "başarılı" sayılırdı —
   * tetikleyicinin gördüğü tek şey durum kodudur.
   */
  const n11Basladi = Date.now();
  const n11 = await n11ListelemeCekimKosGuvenli({ yaz: true, dbAdresi });
  const n11Ms = Date.now() - n11Basladi;
  const dusen = [ty, hb, n11].filter((o) => "atlandi" in o).length;
  /**
   * ⚠ SÜRELER CEVAPTA — tavanı bir daha TAHMİN etmemek için. İlk gerçek
   * tetikte 60 sn yetmedi ve elimizde hiçbir sayı yoktu; 504 zamanlama
   * bilgisi vermiyor. Bundan sonra her koşum kendi maliyetini söylüyor.
   */
  return NextResponse.json(
    { ty, tyMs, hb, hbMs, n11, n11Ms, toplamMs: tyMs + hbMs + n11Ms, dusen },
    { status: dusen > 0 ? 500 : 200 },
  );
}
