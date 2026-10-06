import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ExternalLink, X } from "lucide-react";

import { KullanimKutulari } from "@/components/kullanim-kutulari";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FirmaAskiSebebi } from "@/generated/prisma/client";
import { askiDurumu, bugunIs } from "@/lib/aski-sureci";
import { bicimlendirici } from "@/lib/bicim";
import { firmaKarti } from "@/lib/firma-karti";
import { odemeDurumu } from "@/lib/odeme-takibi";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { kullanimGorunumu } from "@/lib/paket/kullanim-gorunumu";
import { firmaPaketi } from "@/lib/paket/yonetim";
import { DURUM_YAZISI } from "@/lib/renkler";
import { ETIKET_RENGI, firmaOzetleri } from "@/lib/yonetim/durumlar";

/**
 * FİRMA ÇEKMECESİ — referans iskeletin sağdan açılan `aside.drawer`ı.
 * Sunucuda çizilir (`?ac=<id>`); kapatmak adresten `ac`yi düşüren bir
 * bağlantıdır (perde de aynı yere gider). Özet: durum etiketleri · paket ·
 * abonelik/vade · askı · kullanım · kullanıcılar · kayıt sayıları. Tam kart
 * ve bölümleri bağlantıyla açılır — çekmece YAZMAZ, yalnız gösterir.
 */
export async function FirmaCekmecesi({ firmaId, kapatAdresi }: { firmaId: string; kapatAdresi: string }) {
  const [kart, kg, fp, ozetler] = await Promise.all([firmaKarti(firmaId), kullanimGorunumu(firmaId), firmaPaketi(firmaId), firmaOzetleri()]);
  if (!kart) return null;
  const t = await getTranslations("YonetimCekmece");
  const tf = await getTranslations("FirmaDurumu");
  const ts = await getTranslations("AskiSebebi");
  const ty = await getTranslations("Yonetim");
  const bicim = await bicimlendirici();
  const bugun = bugunIs();
  const etiketler = ozetler.find((o) => o.id === firmaId)?.etiketler ?? [];
  const od = odemeDurumu(kart.abonelik.vade, bugun);
  const aski = askiDurumu({ aktif: kart.aktif, uyariSonGun: kart.aski.uyariSonGun, uyariSebebi: kart.aski.uyariSebebi as FirmaAskiSebebi | null, askiSebebi: kart.aski.askiSebebi as FirmaAskiSebebi | null }, bugun);
  const kartAdresi = `${YONETIM_YOLU}/firmalar/${kart.id}`;
  const aktifKullanici = kart.kullanicilar.filter((k) => k.aktif);

  const odemeMetni =
    od.tur === "TANIMSIZ" ? t("odemeTanimsiz")
    : od.tur === "GECIKTI" ? t("odemeGecikti", { gecen: od.gecenGun, tarih: bicim.tarih(od.vade) })
    : t("odemeKalan", { kalan: od.kalanGun, tarih: bicim.tarih(od.vade) });
  const askiMetni =
    aski.tur === "NORMAL" ? t("askiYok")
    : aski.tur === "ASKIDA" ? t("askida", { sebep: aski.sebep ? ts(aski.sebep) : "—" })
    : aski.tur === "UYARIDA" ? t("uyarida", { tarih: bicim.tarih(aski.sonGun), sebep: aski.sebep ? ts(aski.sebep) : "—" })
    : t("uyariDoldu", { tarih: bicim.tarih(aski.sonGun) });

  return (
    <>
      <Link href={kapatAdresi} scroll={false} aria-label={t("kapat")} className="fixed inset-0 z-40 bg-black/30" />
      <aside role="dialog" aria-modal="true" aria-label={kart.ad} className="bg-background fixed inset-y-0 right-0 z-50 flex w-full max-w-[620px] flex-col shadow-2xl">
        <header className="bg-card flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-xl font-semibold">{kart.ad}</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <KopyalanabilirKod deger={kart.kod} etiket={ty("firmaKodu")} />
              {etiketler.map((e) => (
                <Badge key={e} variant="outline" className={DURUM_YAZISI[ETIKET_RENGI[e]]}>{tf(e)}</Badge>
              ))}
            </div>
          </div>
          <Button asChild variant="ghost" size="icon" className="size-11 shrink-0">
            <Link href={kapatAdresi} scroll={false} aria-label={t("kapat")}><X /></Link>
          </Button>
        </header>

        <div className="grid gap-4 overflow-y-auto px-5 pt-4 pb-10">
          <dl className="bg-card grid gap-x-3 gap-y-2 rounded-xl border p-4 text-sm sm:grid-cols-[110px_minmax(0,1fr)]">
            <dt className="text-muted-foreground">{t("paket")}</dt>
            <dd>
              <Link href={`${kartAdresi}#paket`} className="underline underline-offset-4">{fp?.paket ? fp.paket.ad : t("paketsiz")}</Link>
            </dd>
            <dt className="text-muted-foreground">{t("odeme")}</dt>
            <dd>
              <Link href={`${kartAdresi}#odemeler`} className={`underline underline-offset-4 ${od.tur === "GECIKTI" ? DURUM_YAZISI.olumsuz : od.tur === "YAKLASIYOR" ? DURUM_YAZISI.uyari : ""}`}>{odemeMetni}</Link>
            </dd>
            <dt className="text-muted-foreground">{t("aski")}</dt>
            <dd>
              <Link href={`${kartAdresi}#aski`} className="underline underline-offset-4">{askiMetni}</Link>
            </dd>
            <dt className="text-muted-foreground">{t("acilis")}</dt>
            <dd>{bicim.tarih(kart.acilis)}</dd>
          </dl>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("kullanim")}</h3>
            <KullanimKutulari kullanim={kg.kullanim} sinirlar={kg.sinirlar} etiketler={kg.etiketler} durumlar={kg.durumlar} sinirsiz={kg.sinirsiz} />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("kullanicilar", { aktif: aktifKullanici.length, toplam: kart.kullanicilar.length })}</h3>
            <ul className="bg-card divide-y rounded-xl border text-sm">
              {kart.kullanicilar.slice(0, 6).map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2">
                  <span className="font-medium">{k.ad ?? k.eposta}</span>
                  <span className="text-muted-foreground">{k.rol}</span>
                  {!k.aktif ? <Badge variant="outline">{t("pasif")}</Badge> : null}
                  <span className="text-muted-foreground ml-auto text-xs">{k.sonGiris ? t("sonGiris", { tarih: bicim.tarihSaat(k.sonGiris) }) : t("hicGirmedi")}</span>
                </li>
              ))}
            </ul>
            {kart.kullanicilar.length > 6 ? (
              <Link href={kartAdresi} className="text-muted-foreground inline-flex min-h-11 items-center text-xs underline underline-offset-4">{t("tumKullanicilar", { sayi: kart.kullanicilar.length })}</Link>
            ) : null}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("kayitlar")}</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { a: ty("sayiUrun"), d: kart.sayilar.urun },
                { a: ty("sayiSatis"), d: kart.sayilar.satis },
                { a: ty("sayiAlim"), d: kart.sayilar.alim },
              ].map((x) => (
                <div key={x.a} className="bg-card rounded-xl border p-3">
                  <div className="text-muted-foreground text-xs">{x.a}</div>
                  <div className="text-lg font-semibold tabular-nums">{bicim.sayi(x.d)}</div>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">{ty("sayilarNotu")}</p>
          </section>

          <Button asChild className="min-h-11 justify-self-start">
            <Link href={kartAdresi}>
              <ExternalLink />
              {t("kartiAc")}
            </Link>
          </Button>
        </div>
      </aside>
    </>
  );
}
