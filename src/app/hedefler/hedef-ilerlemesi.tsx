import { getTranslations } from "next-intl/server";
import { PartyPopper } from "lucide-react";
import Link from "@/components/niyetli-baglanti";
import { PayCubugu } from "@/components/istatistik-kutusu";
import { bicimlendirici } from "@/lib/bicim";
import { hedefDurumuGetir } from "@/lib/hedef/hedef-veri";
import { DURUM_KUTU_YAZISI, DURUM_KUTUSU } from "@/lib/renkler";

/**
 * ============================================================================
 *  HEDEF İLERLEMESİ (K349) — `/hedefler` sayfasının gövdesi
 * ----------------------------------------------------------------------------
 *  Hedefi konmuş her ölçüt × dönem için ilerleme; geçilen hedef «Tebrikler!».
 *  Rakamlar panelin kendi motorundan (`hedef-veri.ts`).
 *  ⚠ 21.10.2026 (kullanıcı): panelde KART DEĞİL — üst çubukta düğme → bu sayfa;
 *  hedef geçilince kutlama penceresi (`components/hedef-dugmesi.tsx`). Panel kartı
 *  ve küçült/genişlet kabuğu (aynı gün yazılmıştı) kaldırıldı.
 *  ⛔ Kâr (NET-2) satırları yalnız `karGorunur` ile.
 * ============================================================================
 */
export async function HedefIlerlemesi({ karGorunur, hedefYonetir }: { karGorunur: boolean; hedefYonetir: boolean }) {
  const t = await getTranslations("Hedef");
  const bicim = await bicimlendirici();
  const durumlar = (await hedefDurumuGetir()).filter((d) => d.olcut !== "NET2" || karGorunur);
  if (!durumlar.length) {
    return <p className="text-sm text-muted-foreground">{t("hedefYok")}{hedefYonetir ? <> <Link href="/ayarlar/hedefler" className="underline underline-offset-4">{t("hedefKoy")}</Link></> : null}</p>;
  }
  const deger = (olcut: string, n: number) => (olcut === "SIPARIS" ? bicim.sayi(n) : bicim.para(n, "TRY"));
  const gecilen = durumlar.filter((d) => d.gecildi);
  return <div data-hedef-ilerlemesi className="space-y-3">
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
  </div>;
}
