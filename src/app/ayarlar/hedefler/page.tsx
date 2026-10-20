import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { bicimlendirici } from "@/lib/bicim";
import { gecerliHedef, HEDEF_DONEMLERI, HEDEF_OLCUTLERI } from "@/lib/hedef/hedef-karar";
import { hedefRakamlari, hedefSatirlari } from "@/lib/hedef/hedef-veri";
import { HedefFormu, type FormDonemi } from "./hedef-formu";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Hedef");
  return { title: t("baslik") };
}

/** Gösterilen geçmiş satırı — SABİT tavan (liste veriyle büyümez; İlke #13/#17). */
const GECMIS_TAVANI = 20;

/**
 * K349 — SATIŞ HEDEFLERİ. Ölçütler panelle aynı tanımdan (ciro · NET-2 · sipariş
 * adedi), dönemler İstanbul takvimiyle. Kâr sütunu yalnız `satis.kar.gor` ile —
 * izinsiz kullanıcıya NET-2 rakamı ne sayfada ne istemciye giden veride bulunur.
 */
export default async function HedeflerSayfasi() {
  const baglam = await sayfaIzni("hedef.yonet");
  const t = await getTranslations("Hedef");
  const bicim = await bicimlendirici();
  const karGorunur = baglam.izinler.has("satis.kar.gor");
  const an = new Date();
  const [satirlar, { pencereler, rakamlar }, gecmis] = await Promise.all([
    hedefSatirlari(),
    hedefRakamlari(an),
    prisma.hedef.findMany({
      where: karGorunur ? {} : { olcut: { not: "NET2" } },
      orderBy: { createdAt: "desc" },
      take: GECMIS_TAVANI,
      select: { id: true, olcut: true, donem: true, tutar: true, gecerlilik: true, createdAt: true, user: { select: { email: true } } },
    }),
  ]);
  const olcutler = HEDEF_OLCUTLERI.filter((o) => o !== "NET2" || karGorunur);
  const donemler: FormDonemi[] = HEDEF_DONEMLERI.map((donem) => ({
    donem,
    hucreler: olcutler.map((olcut) => ({
      olcut,
      mevcut: gecerliHedef(satirlar, olcut, donem, pencereler[donem].ilkGun)?.tutar ?? null,
      gerceklesen: rakamlar[donem][olcut],
    })),
  }));

  return <div className="min-w-0 space-y-6">
    <div className="max-w-3xl space-y-2">
      <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
      <p className="text-sm text-muted-foreground">{t("aciklama")}</p>
    </div>
    <HedefFormu donemler={donemler} />
    <section className="max-w-3xl space-y-2">
      <h2 className="text-lg font-semibold">{t("gecmisBaslik", { sayi: GECMIS_TAVANI })}</h2>
      {!gecmis.length ? <p className="text-sm text-muted-foreground">{t("gecmisYok")}</p> : <ul className="divide-y rounded-lg border text-sm">
        {gecmis.map((g) => <li key={g.id} className="flex flex-wrap justify-between gap-2 p-3">
          <span><strong>{t(`donem_${g.donem}`)} · {t(`olcut_${g.olcut}`)}</strong> — {g.tutar === null ? t("kaldirildi") : g.olcut === "SIPARIS" ? bicim.sayi(Number(g.tutar)) : bicim.para(Number(g.tutar), "TRY")}</span>
          <span className="text-muted-foreground">{t("gecmisSatiri", { gecerlilik: bicim.tarih(g.gecerlilik), an: bicim.tarihSaat(g.createdAt), kisi: g.user?.email ?? "—" })}</span>
        </li>)}
      </ul>}
    </section>
  </div>;
}
