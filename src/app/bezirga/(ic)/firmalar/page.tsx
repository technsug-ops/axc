import { YONETIM_YOLU } from "@/lib/oturum-imza";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PanelRightOpen, Plus } from "lucide-react";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bicimlendirici } from "@/lib/bicim";
import { DURUM_YAZISI } from "@/lib/renkler";
import { ETIKET_RENGI, etiketSayilari, firmaEtiketiMi, firmaOzetleri, FIRMA_ETIKETLERI, type FirmaEtiketi } from "@/lib/yonetim/durumlar";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { SayfaBasligi } from "../sayfa-basligi";
import { FirmaCekmecesi } from "./firma-cekmecesi";
import { FirmaEylemleri } from "./firma-eylemleri";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("firmalar") };
}

/** Liste adresi — arama, durum süzgeci ve açık çekmece birlikte taşınır. */
function adres(g: { q?: string; durum?: string; ac?: string }): string {
  const p = new URLSearchParams();
  if (g.q) p.set("q", g.q);
  if (g.durum) p.set("durum", g.durum);
  if (g.ac) p.set("ac", g.ac);
  const s = p.toString();
  return `${YONETIM_YOLU}/firmalar${s ? `?${s}` : ""}`;
}

/**
 * FİRMALAR — referans iskeletin `families` sayfası (HA-Kompass admin):
 * süzgeç çipleri + arama + liste; satıra tıklayınca sayfa DEĞİŞMEZ, sağdan
 * çekmece açılır (`?ac=`). Durum süzgeci «Bugün» ve menü rozetleriyle AYNI
 * etiketten (`lib/yonetim/durumlar`) — sayı = liste (İlke #16).
 * Yalnız KAYIT bilgisi — ticari veri YOK (kullanıcı kararı 04.10.2026).
 * İlke #17: arama kutusu; kaç sonuç bulunduğu yazar.
 */
export default async function FirmalarSayfasi({ searchParams }: { searchParams: Promise<{ q?: string; durum?: string; ac?: string }> }) {
  await yonetimSayfasi();
  const sp = await searchParams;
  const arama = (sp.q ?? "").trim();
  const durum: FirmaEtiketi | undefined = firmaEtiketiMi(sp.durum) ? sp.durum : undefined;
  const t = await getTranslations("Yonetim");
  const tf = await getTranslations("FirmaDurumu");
  const bicim = await bicimlendirici();

  const tumu = await firmaOzetleri();
  const sayilar = etiketSayilari(tumu);
  const aranan = arama.toLocaleLowerCase("tr");
  const firmalar = tumu.filter(
    (f) => (!durum || f.etiketler.includes(durum)) && (!aranan || `${f.ad} ${f.kod}`.toLocaleLowerCase("tr").includes(aranan)),
  );
  const acik = sp.ac && tumu.some((f) => f.id === sp.ac) ? sp.ac : undefined;

  return (
    <div className="space-y-4">
      <SayfaBasligi
        baslik={t("firmalar")}
        aciklama={t("firmalarAciklama")}
        eylemler={
          <Button asChild className="min-h-11">
            <Link href={`${YONETIM_YOLU}/firmalar/yeni`}>
              <Plus />
              {t("yeniFirma")}
            </Link>
          </Button>
        }
      />

      {/* DURUM ÇİPLERİ — sayı = liste; seçili olan sıfır olsa da görünür */}
      <nav aria-label={t("durumSuzgeci")} className="flex flex-wrap gap-1.5">
        <Link href={adres({ q: arama })} aria-current={!durum ? "true" : undefined} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm no-underline ${!durum ? "bg-foreground text-background" : "hover:bg-muted"}`}>
          {t("tumu")} <b className="tabular-nums">{tumu.length}</b>
        </Link>
        {FIRMA_ETIKETLERI.filter((e) => (sayilar.get(e) ?? 0) > 0 || e === durum).map((e) => (
          <Link key={e} href={adres({ q: arama, durum: e })} aria-current={durum === e ? "true" : undefined} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm no-underline ${durum === e ? "bg-foreground text-background" : `hover:bg-muted ${DURUM_YAZISI[ETIKET_RENGI[e]]}`}`}>
            {tf(e)} <b className="tabular-nums">{sayilar.get(e) ?? 0}</b>
          </Link>
        ))}
      </nav>

      <KodAramaKutusu temelAdres={`${YONETIM_YOLU}/firmalar`} baslangic={arama} tasinanlar={durum ? { durum } : {}} ipucu={t("firmaAramaIpucu")} />
      <p className="text-muted-foreground text-sm">
        {arama || durum ? t("aramaSonucu", { bulunan: firmalar.length, toplam: tumu.length }) : t("firmaSayisi", { toplam: tumu.length })}
      </p>

      {firmalar.length === 0 ? (
        <p className="text-muted-foreground text-sm">{arama || durum ? t("aramaBos") : t("firmaYok")}</p>
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {firmalar.map((f) => (
            <li key={f.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 text-sm ${acik === f.id ? "bg-muted" : ""}`}>
              <Link href={adres({ q: arama, durum, ac: f.id })} scroll={false} className="min-w-40 font-medium underline-offset-4 hover:underline">
                {f.ad}
              </Link>
              <KopyalanabilirKod deger={f.kod} etiket={t("firmaKodu")} />
              <span className="flex flex-wrap gap-1">
                {f.etiketler.filter((e) => e !== "AKTIF").map((e) => (
                  <Link key={e} href={adres({ q: arama, durum: e })} className="inline-flex min-h-11 items-center">
                    <Badge variant="outline" className={`${DURUM_YAZISI[ETIKET_RENGI[e]]} underline-offset-4 hover:underline`}>{tf(e)}</Badge>
                  </Link>
                ))}
                {f.etiketler.includes("AKTIF") && f.etiketler.length === 1 ? <Badge variant="secondary">{tf("AKTIF")}</Badge> : null}
              </span>
              <span className="text-muted-foreground">{f.paket ? t("paketRozeti", { ad: f.paket }) : null}</span>
              <span className="text-muted-foreground">{t("uyeSayisi", { sayi: f.uyeSayisi })}</span>
              <span className="text-muted-foreground text-xs">{t("acilis", { tarih: bicim.tarih(f.acilis) })}</span>
              <div className="ml-auto flex flex-wrap items-start gap-2">
                <Button asChild size="sm" variant="outline" className="min-h-11">
                  <Link href={adres({ q: arama, durum, ac: f.id })} scroll={false}>
                    <PanelRightOpen />
                    {t("kartiAc")}
                  </Link>
                </Button>
                <FirmaEylemleri firmaId={f.id} firmaAdi={f.ad} durum={f.kurulum} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {acik ? <FirmaCekmecesi firmaId={acik} kapatAdresi={adres({ q: arama, durum })} /> : null}
    </div>
  );
}
