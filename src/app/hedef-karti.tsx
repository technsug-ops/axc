import { getTranslations } from "next-intl/server";
import { PartyPopper } from "lucide-react";
import Link from "@/components/niyetli-baglanti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayCubugu } from "@/components/istatistik-kutusu";
import { bicimlendirici } from "@/lib/bicim";
import { hedefDurumuGetir } from "@/lib/hedef/hedef-veri";
import { DURUM_KUTU_YAZISI, DURUM_KUTUSU } from "@/lib/renkler";

/**
 * ============================================================================
 *  PANEL — HEDEFLER KARTI (K349, 20.10.2026)
 * ----------------------------------------------------------------------------
 *  Hedefi konmuş her ölçüt × dönem için ilerleme; geçilen hedef «Tebrikler!».
 *  Rakamlar panelin kendi motorundan (`hedef-veri.ts`) — üstteki dönem kartlarıyla
 *  aynı tanım. Satır sayısı SABİT tavanlı (en çok 5 dönem × 3 ölçüt): veriyle
 *  büyümez, özet ekranında durabilir (İlke #13).
 *  ⛔ Kâr (NET-2) satırları yalnız `karGorunur` ile — panelin öteki kâr
 *  kutularıyla aynı kapı. Hiç hedef yoksa kart ÇİZİLMEZ; hedef girebilen
 *  kullanıcıya yalnız «hedef koy» bağlantısı görünür.
 * ============================================================================
 */
export async function HedefKarti({ karGorunur, hedefYonetir }: { karGorunur: boolean; hedefYonetir: boolean }) {
  const t = await getTranslations("Hedef");
  const bicim = await bicimlendirici();
  const durumlar = (await hedefDurumuGetir()).filter((d) => d.olcut !== "NET2" || karGorunur);
  if (!durumlar.length) {
    return hedefYonetir ? <p className="text-sm"><Link href="/ayarlar/hedefler" className="underline underline-offset-4">{t("hedefKoy")}</Link></p> : null;
  }
  const deger = (olcut: string, n: number) => (olcut === "SIPARIS" ? bicim.sayi(n) : bicim.para(n, "TRY"));
  const gecilen = durumlar.filter((d) => d.gecildi);
  return <Card data-kart="hedefler">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
      <CardTitle>{t("kartBaslik")}</CardTitle>
      {hedefYonetir ? <Link href="/ayarlar/hedefler" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 md:min-h-0">{t("duzenle")}</Link> : null}
    </CardHeader>
    <CardContent className="space-y-3">
      {gecilen.length ? <div role="status" className={`flex items-start gap-2 rounded-md border p-3 text-sm ${DURUM_KUTUSU.olumlu}`}>
        <PartyPopper className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div><p className="font-semibold">{t("tebrikBaslik")}</p>
          <p>{gecilen.map((d) => t("tebrikSatiri", { olcut: d.olcut, donem: d.donem })).join(" · ")}</p></div>
      </div> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {durumlar.map((d) => <div key={`${d.olcut}-${d.donem}`} data-gecildi={d.gecildi ? "evet" : "hayir"} className="space-y-1 rounded-md border p-3 text-sm">
          {/* Yüzde YALNIZ çubuğun yanında (kullanıcı 21.10: iki kez yazıyordu); geçilen hedefin adı yeşil. */}
          <span className={`block font-medium ${d.gecildi ? DURUM_KUTU_YAZISI.olumlu : ""}`}>{t("satirEtiketi", { olcut: d.olcut, donem: d.donem })}</span>
          <PayCubugu oran={Math.min(d.oran, 1)} etiket={bicim.yuzde(d.oran * 100, 0)} />
          <p className="text-muted-foreground">{t("ilerleme", { gerceklesen: deger(d.olcut, d.gerceklesen), hedef: deger(d.olcut, d.hedef) })}</p>
        </div>)}
      </div>
    </CardContent>
  </Card>;
}
