import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { indirmeBasliklari, xlsxUret, type SutunTuru } from "@/lib/disa-aktarma/xlsx";
import { izYaz } from "@/lib/iz";
import {
  azStokCoz,
  donemCoz,
  EN_AZ_ADET,
  esikleriKur,
  listeCoz,
  rehberAra,
  rehberListesi,
} from "@/lib/rapor/alim-rehberi";
import { rehberVerisi } from "@/lib/rapor/alim-rehberi-verisi";
import { UYGULAMA } from "@/lib/uygulama";
import { apiIzni } from "@/lib/yetki";

/**
 * ALIM REHBERİ — EXCEL (K363 Faz 1). EKRANDA NE VARSA O İNER: aynı dönem, aynı
 * liste, aynı «az stok» sınırı, aynı arama (sayfa ile AYNI saf gövdeler).
 * ⚠ Ayrı rota, `/api/disa-aktarma` DEĞİL: o rota `veri.aktar` iznine bağlı ve
 * «tümünü indir» dökümüne girer; bu dosya KÂR taşır → sayfanın iki izni birden.
 * ⚠ Sayılar SAYI hücresi (toplanabilir, sıralanabilir); kodlar METİN (baştaki
 * sıfır, uzun barkod korunur) — `SutunTuru`.
 */
export const dynamic = "force-dynamic";

export async function GET(istek: Request) {
  const red = (await apiIzni("rapor.gor")) ?? (await apiIzni("satis.kar.gor"));
  if (red) return red;

  const t = await getTranslations("AlimRehberi");
  const bicim = await bicimlendirici();
  const u = new URL(istek.url).searchParams;
  const donem = donemCoz(u.get("donem") ?? undefined);
  const liste = listeCoz(u.get("liste") ?? undefined);
  const azStok = azStokCoz(u.get("az") ?? undefined);
  const arama = u.get("q")?.trim() || null;

  const veri = await rehberVerisi(donem, new Date());
  const esik = esikleriKur(veri.satirlar);
  const satirlar = rehberAra(rehberListesi(liste, veri.satirlar, esik, azStok), arama);

  const turler: SutunTuru[] = ["tamsayi", "metin", "metin", "metin", "metin", "metin", "metin", "tamsayi", "ondalik", "para", "para", "oran", "para", "tamsayi", "tamsayi", "para"];
  const listeAdi = t(`liste_${liste}`);
  const icerik = await xlsxUret([
    {
      ad: listeAdi,
      basliklar: [
        t("excelSira"), t("sutunUrun"), t("sku"), t("excelFirmaSku"), t("excelBarkod"), t("excelMarka"), t("excelKategori"),
        t("excelSatilan"), t("excelGunlukSatis"), t("excelCiro"), t("excelNet2"), t("excelMarj"), t("excelGunlukNet2"),
        t("sutunRaf"), t("excelStokGunu"), t("excelSermaye"),
      ],
      turler,
      genislikler: [6, 50, 18, 16, 16, 16, 20, 10, 12, 14, 12, 10, 12, 8, 10, 14],
      satirlar: satirlar.map((s, i) => [
        i + 1, s.urunAdi, s.sku, s.firmaSku ?? "", s.barkod ?? "", s.marka ?? "", s.kategori ?? "",
        s.adet, s.gunlukSatis, s.ciro, s.net2, s.marj, s.gunlukNet2,
        s.raf, s.raf > 0 && s.stokGunu !== null ? Math.round(s.stokGunu) : s.raf > 0 ? t("satmiyor") : 0,
        s.raf > 0 ? s.bagliSermaye : null,
      ]),
    },
    {
      ad: t("excelYontemSayfasi"),
      basliklar: ["", ""],
      genislikler: [22, 110],
      satirlar: [
        [t("excelYontemListe"), `${listeAdi} — ${liste === "azalan" ? t("aciklama_azalan", { gun: azStok }) : liste === "fazla" ? (esik.fazlaStokGunu === null ? t("aciklama_fazlaOlcuYok") : t("aciklama_fazla", { gun: Math.round(esik.fazlaStokGunu) })) : t(`aciklama_${liste}`)}`],
        [t("excelYontemDonem"), `${t(`donem_${donem}`)} (${veri.gun})`],
        [
          t("excelYontemEsik"),
          esik.marjOrtancasi === null || esik.hizOrtancasi === null
            ? t("esikYok", { enAz: EN_AZ_ADET })
            : t("esikNotu", { gun: veri.gun, enAz: EN_AZ_ADET, aday: esik.adaySayisi, hiz: bicim.sayi(esik.hizOrtancasi, 3), marj: bicim.yuzde(esik.marjOrtancasi) }),
        ],
        [t("excelYontemAzStok"), t("azStokNotu", { gun: azStok })],
        [t("excelYontemKaynak"), t("excelKaynakMetni", { uygulama: UYGULAMA.ad })],
      ],
    },
  ]);
  await izYaz({ action: "TOPLU_INDIRME", targetType: "AlimRehberi", targetId: liste, detail: JSON.stringify({ tur: "alim-rehberi", donem, liste, azStok, arama, satir: satirlar.length }) });
  return new Response(new Uint8Array(icerik), {
    headers: indirmeBasliklari(`${UYGULAMA.teknikAd}-${t("excelSayfaAdi")}-${listeAdi}.xlsx`),
  });
}
