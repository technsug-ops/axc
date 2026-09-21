import { NextRequest, NextResponse } from "next/server";

import { hbListelemeCekimKos } from "../../../../../scripts/canli-hb-listeleme-yaz";
import { tyListelemeCekimKosGuvenli } from "../../../../../scripts/canli-kanal-listeleme-yaz";

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
 *  BİRLİKTE gösteriyor. N11 senkronu yazıldığı gün buraya bir satır eklenir;
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
 * ⚠ 60 sn: TY tarafı iki ucu sayfa sayfa tarıyor (v2 onaylı + onaysız) ve
 * HB 2202 listingi 100'erli çekiyor. Ölçüldü 21.09.2026 — ikisi birlikte
 * ~40 sn. Varsayılana bel bağlanmadı.
 */
export const maxDuration = 60;

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
  const ty = await tyListelemeCekimKosGuvenli({ yaz: true, dbAdresi });
  const hb = await hbListelemeCekimKos({ yaz: true, dbAdresi }).catch((e: unknown) => ({
    atlandi: "COKTU" as const,
    mesaj: (e instanceof Error ? (e.stack ?? e.message) : String(e)).replace(/\r?\n/g, " "),
  }));

  /**
   * ⚠ DÜŞEN KANAL SAYILIR VE DURUM KODUNA YANSIR. `200` dönseydi GitHub
   * Action yeşil yanar ve yarısı koşmayan bir senkron "başarılı" sayılırdı —
   * tetikleyicinin gördüğü tek şey durum kodudur.
   */
  const dusen = [ty, hb].filter((o) => "atlandi" in o).length;
  return NextResponse.json({ ty, hb, dusen }, { status: dusen > 0 ? 500 : 200 });
}
