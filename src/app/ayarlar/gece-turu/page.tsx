import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { geceTuruKayitlari, geceTuruSorunu } from "@/lib/gece-turu-veri";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { sayfaIzni } from "@/lib/yetki";
import { yayinDurumunuOlc } from "@/lib/yayin-boslugu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { sonSunucuHatalari, SUNUCU_HATASI_IZI_BASLANGICI } from "@/lib/hata/sunucu-hatasi-kaydi";
import { ERISIM_IZI_BASLANGICI, sonErisimBosluklari } from "@/lib/veritabani-erisim-kaydi";

const HATA_TURLERI = ["render", "route", "action", "proxy"] as const;
const HATA_GOSTERILEN = 20;

/**
 * ============================================================================
 *  GECE BEKÇİ TURU EKRANI (K290)
 * ----------------------------------------------------------------------------
 *  Son 14 gecenin tam tur sonucu; kırmızıda hangi denetim ve (geriye tarama
 *  bulduysa) onu bozan push. Çan uyarısıyla AYNI gövde (`gece-turu-veri.ts`).
 *  Hiç iz yoksa «kayıt yok bir sonuç değildir» der (izin doğum tarihi); son iz
 *  gecikmişse tur KAÇMIŞTIR ve kırmızı kutuda yazar.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("GeceTuru");
  return { title: t("baslik") };
}

export default async function GeceTuruSayfasi() {
  await sayfaIzni("ayar.yaz");
  const t = await getTranslations("GeceTuru");
  const bicim = await bicimlendirici();
  const kayitlar = await geceTuruKayitlari(14);
  const simdi = new Date();
  const sorun = geceTuruSorunu(kayitlar[0] ?? null, simdi);
  const yayin = await yayinDurumunuOlc(simdi);
  const hatalar = await sonSunucuHatalari(7, HATA_GOSTERILEN);
  const bosluklar = await sonErisimBosluklari(7, HATA_GOSTERILEN);
  const saatOnce = kayitlar[0] ? Math.floor((simdi.getTime() - kayitlar[0].zaman.getTime()) / 3600_000) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      {/* K329 — canlı yayın: çandaki «yayın boşluğu» uyarısıyla AYNI gövde (`yayinDurumunuOlc`). */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-sm font-medium">{t("yayinBaslik")}</p>
          <p
            className={`text-sm ${yayin.durum === "GUNCEL" ? DURUM_YAZISI.olumlu : yayin.durum === "GERIDE" ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.uyari}`}
          >
            {yayin.durum === "OLCULEMEDI"
              ? t(`yayinOLCULEMEDI_${yayin.neden}`)
              : yayin.durum === "GERIDE"
                ? t("yayinGERIDE", { dakika: yayin.dakika })
                : t(`yayin${yayin.durum}`)}
          </p>
          {yayin.durum === "GERIDE" ? <p className="text-xs">{t("yayinGERIDE_ne")}</p> : null}
          <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span className="flex items-center gap-1">
              {t("yayinCanli")}: <KopyalanabilirKod deger={yayin.canliSha?.slice(0, 7)} etiket={t("yayinCanli")} />
            </span>
            {yayin.durum !== "OLCULEMEDI" ? (
              <span className="flex items-center gap-1">
                {t("yayinAna")}: <KopyalanabilirKod deger={yayin.anaSha.slice(0, 7)} etiket={t("yayinAna")} />
              </span>
            ) : null}
            {yayin.durum === "GERIDE" || yayin.durum === "YAYIMLANIYOR" ? (
              <span>{t("yayinItildi", { zaman: bicim.tarihSaat(yayin.itildiAt) })}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* K358 — veritabanı erişim boşlukları: sıcak tutmanın dakikalık yoklamasından. Sıfırken
          de durur (izin doğum tarihiyle); «başarısız 0» = kesinti değil «ölçülmedi». */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{t("erisimBaslik")}</p>
            <p className={`text-sm ${bosluklar.toplam > 0 ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.olumlu}`}>
              {bosluklar.toplam > 0 ? t("erisimSayisi", { sayi: bosluklar.toplam }) : t("erisimYok")}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("erisimNeIse")} {t("erisimDogum", { tarih: ERISIM_IZI_BASLANGICI })}
          </p>
          {bosluklar.satirlar.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {bosluklar.satirlar.map((b, i) => (
                <li key={i} className="space-y-0.5 px-3 py-2 text-xs">
                  <p className="font-medium">
                    {t("erisimAralik", { baslangic: bicim.tarihSaat(new Date(b.baslangic)), bitis: bicim.tarihSaat(new Date(b.bitis)), dakika: b.dakika })}
                  </p>
                  <p className={b.basarisizYoklama > 0 ? DURUM_YAZISI.olumsuz : "text-muted-foreground"}>
                    {b.basarisizYoklama > 0 ? t("erisimBasarisiz", { sayi: b.basarisizYoklama }) : t("erisimOlculmedi")}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          {bosluklar.cozulemeyen > 0 ? <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("erisimCozulemeyen", { sayi: bosluklar.cozulemeyen })}</p> : null}
        </CardContent>
      </Card>

      {/* K353 — sunucu hataları: «Bu ekran çizilemedi»nin sebebi. Sıfırken de durur ve
          izin doğum tarihini söyler (kayıt açılmadan önceki sessizlik hüküm değildir). */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{t("hataBaslik")}</p>
            <p className={`text-sm ${hatalar.toplam > 0 ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.olumlu}`}>
              {hatalar.toplam > 0 ? t("hataSayisi", { sayi: hatalar.toplam }) : t("hataYok")}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("hataNeIse")} {t("hataDogum", { tarih: SUNUCU_HATASI_IZI_BASLANGICI })}
          </p>
          {hatalar.satirlar.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {hatalar.satirlar.map((h, i) => (
                <li key={i} className="space-y-1 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-medium">{bicim.tarihSaat(h.zaman)}</span>
                    <span>{t(`hataTur.${HATA_TURLERI.find((x) => x === h.tur) ?? "bilinmiyor"}`)}</span>
                    <span className="font-mono break-all">{h.yol}</span>
                    <span className="flex items-center gap-1">
                      {t("hataKod")}:{" "}
                      {h.digest ? <KopyalanabilirKod deger={h.digest} etiket={t("hataKod")} /> : t("hataKodYok")}
                    </span>
                  </div>
                  <p className={`font-mono text-xs break-words whitespace-pre-wrap ${DURUM_YAZISI.olumsuz}`}>{h.mesaj}</p>
                  {h.mesajKirpildi ? <p className="text-muted-foreground text-xs">{t("hataKirpildi")}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {hatalar.toplam > hatalar.satirlar.length ? (
            <p className="text-muted-foreground text-xs">{t("hataGosterilen", { adet: hatalar.satirlar.length })}</p>
          ) : null}
        </CardContent>
      </Card>

      {sorun.gecikti ? (
        <div className={`rounded-md p-3 ${DURUM_KUTUSU.olumsuz}`}>
          <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.olumsuz}`}>
            <TriangleAlert className="size-4 shrink-0" />
            {t("gecikti", { saat: saatOnce })}
          </p>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {kayitlar.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">{t("izYok")}</p>
          ) : (
            <div className="divide-y">
              {kayitlar.map((k, i) => (
                <div key={i} className="space-y-1 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{bicim.tarihSaat(k.zaman)}</p>
                    <p
                      className={`text-sm ${k.durum === "YESIL" ? DURUM_YAZISI.olumlu : k.durum === "KIRMIZI" ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.uyari}`}
                    >
                      {t(`sonuc.${k.durum}`, { yesil: k.yesil ?? 0, toplam: k.toplam ?? 0 })}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t("sutunSurum")}: <span className="font-mono">{k.sha ? k.sha.slice(0, 7) : "—"}</span>
                    {k.sureSn !== null ? ` · ${t("sutunSure")}: ${t("sureDk", { dk: Math.round(k.sureSn / 60) })}` : ""}
                  </p>
                  {k.sebep ? <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("sebep", { sebep: k.sebep })}</p> : null}
                  {k.kirmizilar.length > 0 ? (
                    <ul className="space-y-1 pt-1 text-xs">
                      {k.kirmizilar.map((r) => (
                        <li key={r.ad} className="bg-muted/50 rounded px-2 py-1">
                          <span className="font-mono font-medium">{r.ad}</span>
                          <br />
                          {r.tur === "BEKCI"
                            ? t("bekciNotu")
                            : r.ilkKotu
                              ? t("ilkKotu", { sha: r.ilkKotu.sha.slice(0, 7), tarih: r.ilkKotu.tarih, mesaj: r.ilkKotu.mesaj })
                              : t("ilkKotuYok")}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
