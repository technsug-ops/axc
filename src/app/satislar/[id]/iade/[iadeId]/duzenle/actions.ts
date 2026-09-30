"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { basariAdresi } from "@/lib/bildirim";
import { DonemKorumasiHatasi, donemIsrariniOku } from "@/lib/donem-kapisi";
import { turkceSayi } from "@/lib/finansman/kural";
import { iadeDuzenle } from "@/lib/iade-duzenle";
import { yetkiIste } from "@/lib/yetki";

/**
 * İADE DÜZENLEME — SUNUCU EYLEMİ (K44). Gövde `lib/iade-duzenle.ts`;
 * burada yalnız form okunur ve sonuç koda → metne çevrilir (ham hata
 * ekrana basılmaz, TAM hâli günlüğe yazılır).
 */

export type DuzenlemeDurumu = {
  hata?: string;
  /** Kapalı muhasebe dönemi — ekran ısrar bloğunu açar. */
  donem?: string;
  donemSatisSayisi?: number;
};

export async function iadeDuzenleEylemi(
  _onceki: DuzenlemeDurumu,
  formData: FormData,
): Promise<DuzenlemeDurumu> {
  await yetkiIste("iade.yaz");
  const t = await getTranslations("IadeDuzenle");

  const oku = (ad: string) => String(formData.get(ad) ?? "");
  /** Boş = yok (null); dolu ama okunamayan = HATA (sessizce sıfır sayılmaz). */
  const tutar = (ad: string): { tamam: true; deger: number | null } | { tamam: false } => {
    const ham = oku(ad).trim();
    if (ham === "") return { tamam: true, deger: null };
    const n = turkceSayi(ham);
    return n === null ? { tamam: false } : { tamam: true, deger: n };
  };
  const iadeKargosu = tutar("iadeKargosu");
  const yeniden = tutar("yenidenGonderimKargosu");
  const ceza = tutar("ceza");
  if (!iadeKargosu.tamam || !yeniden.tamam || !ceza.tamam) return { hata: t("tutarOkunamadi") };

  const teslimHam = oku("degisimTeslimTarihi").trim();
  const teslim = teslimHam === "" ? null : new Date(teslimHam);
  if (teslim !== null && Number.isNaN(teslim.getTime())) return { hata: t("tarihGecersiz") };

  const hasarNotlari: { returnItemId: string; not: string | null }[] = [];
  for (const [ad, deger] of formData.entries()) {
    if (ad.startsWith("hasarNotu:")) {
      hasarNotlari.push({ returnItemId: ad.slice("hasarNotu:".length), not: String(deger) });
    }
  }

  let sonuc;
  try {
    sonuc = await iadeDuzenle({
      returnId: oku("returnId"),
      beklenenGuncelleme: oku("beklenenGuncelleme"),
      code: oku("code"),
      note: oku("note"),
      cezaNotu: oku("cezaNotu"),
      degisimTeslimTarihi: teslim,
      para: {
        iadeKargosu: iadeKargosu.deger,
        yenidenGonderimKargosu: yeniden.deger,
        ceza: ceza.deger,
      },
      hasarNotlari,
      donemIsrari: donemIsrariniOku(formData),
    });
  } catch (e) {
    if (e instanceof DonemKorumasiHatasi) {
      return {
        hata: t("donemKapali", { donem: e.donem, sayi: e.satisSayisi }),
        donem: e.donem,
        donemSatisSayisi: e.satisSayisi,
      };
    }
    console.error("[iade-duzenle] beklenmeyen hata:", e);
    return { hata: t("kaydedilemedi") };
  }

  switch (sonuc.durum) {
    case "YOK":
      return { hata: t("iadeYok") };
    case "DEGISMIS":
      return { hata: t("arayaGirildi") };
    case "DEGISIKLIK_YOK":
      return { hata: t("degisiklikYok") };
    case "DEGISIM_YOK":
      return { hata: t("degisimYok") };
    case "EKSI_TUTAR":
      return { hata: t("eksiTutar") };
    case "HASAR_NOTU_ZORUNLU":
      return { hata: t("hasarNotuZorunlu") };
    case "TAMAM":
      break;
  }

  revalidatePath(`/satislar/${sonuc.saleId}`);
  revalidatePath("/iadeler");
  revalidatePath("/rapor");
  redirect(basariAdresi(`/satislar/${sonuc.saleId}`, "guncellendi"));
}
