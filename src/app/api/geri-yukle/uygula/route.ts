import { put } from "@vercel/blob";

import { apiIzni } from "@/lib/yetki";
import { onayGecerliMi } from "@/lib/geri-yukle";
import { geriYukle } from "@/lib/geri-yukle-calistir";
import { yedegiMetneCevir, yedekUret } from "@/lib/yedek";

import { kaynagiOku, metniCoz } from "../ortak";

/**
 * ============================================================================
 *  GERİ YÜKLEME — UYGULA
 * ----------------------------------------------------------------------------
 *  SIRA DEĞİŞMEZ:
 *    1. Onay metni doğru mu
 *    2. Dosya okunup ÇÖZÜLÜYOR mu  (bozuk dosya için veri silinmez)
 *    3. MEVCUT VERİNİN GÜVENLİK YEDEĞİ ALINIR ve depoya YAZILDIĞI DOĞRULANIR
 *    4. Ancak ondan sonra geri yükleme başlar
 *
 *  3. ADIM PAZARLIĞA KAPALI (kullanıcı kararı 12.08.2026): güvenlik yedeği
 *  alınmadan işlem BAŞLAMAZ. Depo bağlı değilse geri yükleme REDDEDİLİR —
 *  "yedek alamadım ama yine de sildim" diyebilecek bir yol bırakmıyoruz.
 *  Bu, geri yüklemenin kendisini bir kez daha geri alınabilir kılar: yanlış
 *  dosyayı yüklerseniz, az önceki hâliniz depoda duruyor.
 *
 *  Güvenlik yedeği TAM alınır (tarifeler dahil): bu dosya "eski hâline dön"
 *  demek için var, eksik olması hedefiyle çelişirdi.
 * ============================================================================
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const KLASOR = "yedek";

export async function POST(istek: Request) {
  const red = await apiIzni("veri.aktar");
  if (red) return red;

  // İstek gövdesi bir kez okunabilir; onay da aynı formdan gelir.
  const kopya = istek.clone();
  const form = await kopya.formData().catch(() => null);
  const onay = typeof form?.get("onay") === "string" ? String(form.get("onay")) : "";

  if (!onayGecerliMi(onay)) {
    return Response.json({ durum: "ONAY_YANLIS" }, { status: 400 });
  }

  const kaynak = await kaynagiOku(istek);
  if (!kaynak.tamam) {
    return Response.json({ durum: "KAYNAK_HATASI", ...kaynak }, { status: 400 });
  }

  const cozum = metniCoz(kaynak.metin);
  if (!cozum.tamam) {
    return Response.json({ durum: "COZUM_HATASI", hata: cozum.hata }, { status: 400 });
  }

  // --- GÜVENLİK YEDEĞİ: alınmadan tek satır silinmez ---
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      {
        durum: "GUVENLIK_YEDEGI_ALINAMADI",
        sebep: "DEPO_YOK",
      },
      { status: 409 },
    );
  }

  let guvenlikUrl: string;
  let guvenlikAdi: string;
  try {
    const an = new Date();
    const damga = an.toISOString().replace(/[:.]/g, "-");
    guvenlikAdi = `guvenlik-${damga}.json`;

    const oncekiHali = await yedekUret(an, false);
    const { url } = await put(
      `${KLASOR}/${guvenlikAdi}`,
      yedegiMetneCevir(oncekiHali),
      {
        access: "private",
        contentType: "application/json; charset=utf-8",
        addRandomSuffix: false,
        allowOverwrite: true,
      },
    );
    guvenlikUrl = url;
  } catch (e) {
    console.error("[geri-yukle] guvenlik yedegi alinamadi:", e);
    return Response.json(
      {
        durum: "GUVENLIK_YEDEGI_ALINAMADI",
        sebep: "YAZILAMADI",
        ayrinti: String(e).slice(0, 300),
      },
      { status: 409 },
    );
  }

  // --- ASIL İŞ ---
  const sonuc = await geriYukle(cozum.yedek);

  if (!sonuc.tamam) {
    // Geri yükleme başarısız oldu ama işlem geri alındı: veri eski hâlinde.
    console.error("[geri-yukle] basarisiz:", sonuc.hata);
    return Response.json(
      {
        durum: "GERI_YUKLEME_HATASI",
        hata: sonuc.hata,
        guvenlikAdi,
        // Kullanıcıya söylenecek en önemli cümle bu:
        veriDegismedi: true,
      },
      { status: 500 },
    );
  }

  return Response.json({
    durum: "TAMAM",
    toplam: sonuc.toplam,
    yazilan: sonuc.yazilan,
    guvenlikAdi,
    guvenlikUrl,
    tarifeSeedGerekli: (cozum.yedek.tablolar.CargoTariff?.length ?? 0) === 0,
  });
}
