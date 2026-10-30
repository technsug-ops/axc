import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";

import { ListeToplami } from "@/components/liste-toplami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FiyatHafizasi } from "@/lib/alim-fiyat-hafizasi";
import { hedefGirdiMetni, ONERI_KAYNAKLARI, ONERI_TAVANI, onerilenHedef, oneriDurumu, type OneriKaynagi } from "@/lib/alim-hedefi-oneri";
import type { TakipKanali } from "@/lib/alim-hedefi-verisi";
import { bicimlendirici } from "@/lib/bicim";
import type { BuyboxKanali } from "@/lib/buybox";
import { SEKME_SERIDI, sekmeSinifi } from "@/lib/kutu-bicimi";
import { rehberAra, type RehberSatiri } from "@/lib/rapor/alim-rehberi";

import { OneriListesi, type OneriSatiri } from "./fiyat-takibi-oneri-listesi";

/**
 * ============================================================================
 *  FİYAT TAKİBİ — «TAKİBE EKLE» ÖNERİLERİ (K363 Faz 3-e, 30.10.2026)
 * ----------------------------------------------------------------------------
 *  Dört kaynak (tükenen yıldızlar · kampanyada iyi aldıkların · en çok satılan ·
 *  en çok kâr), rehberin dönem seçimiyle. Küme `lib/alim-hedefi-oneri.ts`te (saf).
 *  ⚠ TY/HB'de ilanı olmayan ürün LİSTEYE GİRMEZ (fiyatı okunamaz) — ama SAYILIR ve
 *  sayısı yazar. Kaynak düğmelerindeki sayı = o kaynağın listesi (ilanlılar).
 *  ⚠ En çok `ONERI_TAVANI` satır çizilir; sayı, toplam ve arama BÜTÜN kümeye bakar.
 * ============================================================================
 */
export async function FiyatTakibiOnerileri({
  kumeler,
  kaynak,
  tumRaf,
  arama,
  kanallar,
  hafizalar,
  takipte,
  yazabilir,
  kaynakAdresi,
  rafAdresi,
  donemEtiketi,
}: {
  /** Dört kaynağın kümesi (raf süzgeci uygulanmış, ilan süzgeci uygulanMAMIŞ). */
  kumeler: Record<OneriKaynagi, RehberSatiri[]>;
  kaynak: OneriKaynagi;
  /** `true` = raftakiler de listede; varsayılan yalnız rafta olmayanlar. */
  tumRaf: boolean;
  arama: string | null;
  kanallar: ReadonlyMap<string, Record<BuyboxKanali, TakipKanali>>;
  hafizalar: ReadonlyMap<string, FiyatHafizasi>;
  takipte: ReadonlySet<string>;
  yazabilir: boolean;
  kaynakAdresi: Record<OneriKaynagi, string>;
  /** Raf süzgecini ÇEVİREN adres. */
  rafAdresi: string;
  donemEtiketi: string;
}) {
  const t = await getTranslations("FiyatTakibi");
  const bicim = await bicimlendirici();

  const ilanli = (s: RehberSatiri) => {
    const k = kanallar.get(s.variantId);
    return k !== undefined && (k.TY.ilan || k.HB.ilan);
  };
  const sayilar = Object.fromEntries(ONERI_KAYNAKLARI.map((k) => [k, kumeler[k].filter(ilanli).length])) as Record<OneriKaynagi, number>;
  const tam = kumeler[kaynak].filter(ilanli);
  const ilanYok = kumeler[kaynak].length - tam.length;
  const gorunen = rehberAra(tam, arama);
  const cizilen = gorunen.slice(0, ONERI_TAVANI);
  const toplam = gorunen.reduce((a, s) => ({ adet: a.adet + s.adet, net2: a.net2 + s.net2 }), { adet: 0, net2: 0 });

  const satirlar: OneriSatiri[] = cizilen.map((s) => {
    const k = kanallar.get(s.variantId) as Record<BuyboxKanali, TakipKanali>;
    const h = hafizalar.get(s.variantId);
    const hedef = onerilenHedef(h);
    return {
      variantId: s.variantId,
      urunId: s.urunId,
      urunAdi: s.urunAdi,
      sku: s.sku,
      firmaSku: s.firmaSku && s.firmaSku !== s.sku ? s.firmaSku : null,
      barkod: s.barkod,
      satisMetni: t("oneriSatis", { adet: s.adet, net2: bicim.para(s.net2, "TRY"), raf: s.raf }),
      enDusukMetni: h ? t("oneriEnDusuk", { fiyat: bicim.para(h.enUcuz.fiyat, "TRY"), tarih: bicim.tarih(h.enUcuz.tarih), normal: bicim.para(h.normal, "TRY") }) : null,
      hedefGirdi: hedef === null ? null : hedefGirdiMetni(hedef),
      hedefMetni: hedef === null ? null : bicim.para(hedef, "TRY"),
      durum: oneriDurumu({ takipte: takipte.has(s.variantId), ilan: { TY: k.TY.ilan, HB: k.HB.ilan }, hedef }),
      kanallar: k,
    };
  });

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>{t("oneriBaslik")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("oneriNotu", { donem: donemEtiketi })}</p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        {/* ── KAYNAK — sayı = o kaynağın listesi (aramadan bağımsız) ── */}
        <div className={SEKME_SERIDI}>
          {ONERI_KAYNAKLARI.map((k) => (
            <Link key={k} href={kaynakAdresi[k]} aria-current={k === kaynak ? "page" : undefined} className={sekmeSinifi(k === kaynak)}>
              {t(`kaynak_${k}`)} ({sayilar[k]})
            </Link>
          ))}
        </div>
        <p className="text-sm">{t(`kaynakAciklama_${kaynak}`)}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">{tumRaf ? t("rafHepsi") : t("rafYalnizYok")}</span>
          <Link href={rafAdresi} className="inline-flex min-h-11 items-center underline underline-offset-2 hover:no-underline md:min-h-6">
            {tumRaf ? t("rafYalnizYokGoster") : t("rafHepsiGoster")}
          </Link>
        </div>
        {ilanYok > 0 ? <p className="text-muted-foreground text-sm">{t("oneriIlanYok", { sayi: ilanYok })}</p> : null}

        {/* ── TOPLAM — süzgecin TAMAMI (çizilen ilk N değil) ── */}
        <ListeToplami
          baslik={t("oneriToplamNet2")}
          toplamlar={[{ paraBirimi: "TRY", tutar: toplam.net2 }]}
          altMetin={t("oneriToplamUrun", { sayi: gorunen.length })}
          oncekiler={[{ etiket: t("oneriToplamAdet"), deger: String(toplam.adet) }]}
        />
        {arama ? <p className="text-muted-foreground text-sm">{t("aramaSonucu", { sayi: gorunen.length, toplam: tam.length })}</p> : null}
        {gorunen.length > ONERI_TAVANI ? <p className="text-muted-foreground text-sm">{t("oneriTavan", { tavan: ONERI_TAVANI, toplam: gorunen.length })}</p> : null}

        {gorunen.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{arama ? t("bosArama") : t("oneriBos")}</p>
        ) : (
          <OneriListesi satirlar={satirlar} yazabilir={yazabilir} />
        )}
      </CardContent>
    </Card>
  );
}
