"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { baglantiyiDene } from "@/lib/kanal-anahtari/dene";
import { anahtarKaldir, anahtarKaydet, denemeSonucuYaz, kimligiOku } from "@/lib/kanal-anahtari/depo";
import { KIMLIK_ALANLARI, desteklenenKanalMi } from "@/lib/kanal-anahtari/kimlik";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  API BAĞLANTISI — anahtar kaydet / kaldır (K303 2. adım, 14.10.2026)
 * ----------------------------------------------------------------------------
 *  İş kuralı depoda (`lib/kanal-anahtari/depo.ts`): şifreleme, satış hesabı
 *  şartı, firma süzgeci, iz. Bu eylemler yalnız İZİN + formdan okuma + hata
 *  KODUNU sözlüğe çevirme yapar.
 *
 *  ⚠ ANAHTAR GERİ DÖNMEZ: dönüş yalnız «son 4 hane» ya da hata metni taşır;
 *  form alanları istemciye geri verilmez (yanlış girişte kullanıcı yeniden yazar).
 *  ⚠ Hata YUTULMAZ: beklenmeyen hata TAM loglanır, ekrana kod üzerinden sabit
 *  bir cümle gider (anayasa: «yakalanmamış hata, yutulmuş hatanın kardeşidir»).
 * ============================================================================
 */

export type AnahtarDurumu = { hata?: string; basari?: string; tamam?: boolean };

function tazele() {
  revalidatePath("/ayarlar/kanallar");
}

export async function kanalAnahtariKaydet(_onceki: AnahtarDurumu, form: FormData): Promise<AnahtarDurumu> {
  const baglam = await yetkiIste("kanal.anahtar");
  const t = await getTranslations("KanalAnahtari");
  const hesapId = String(form.get("hesapId") ?? "");
  try {
    /* Formdan YALNIZ o kanalın alanları okunur — fazladan alan depoya ulaşmaz. */
    const hesap = await prisma.channelAccount.findUnique({ where: { id: hesapId }, select: { channel: { select: { code: true } } } });
    if (!hesap) return { hata: t("hata_HESAP_YOK") };
    const kanal = hesap.channel.code;
    if (!desteklenenKanalMi(kanal)) return { hata: t("hata_KANAL_DESTEKLENMIYOR") };
    const ham: Record<string, string> = {};
    for (const a of KIMLIK_ALANLARI[kanal]) ham[a.ad] = String(form.get(a.ad) ?? "");
    const s = await anahtarKaydet(hesapId, ham, baglam.kullaniciId);
    if (s.durum === "TAMAM") {
      tazele();
      return { tamam: true, basari: t("kaydedildi", { son: s.sonDort }) };
    }
    if (s.hata === "ALAN_EKSIK" || s.hata === "ALAN_GECERSIZ") {
      const adlar = (s.alanlar ?? []).map((a) => t(`alan_${a}`)).join(", ");
      return { hata: t(`hata_${s.hata}`, { alanlar: adlar }) };
    }
    return { hata: t(`hata_${s.hata}`) };
  } catch (e) {
    console.error("[kanal-anahtari] kaydetme düştü:", e);
    return { hata: t("hata_BEKLENMEDIK") };
  }
}

/**
 * BAĞLANTIYI DENE (K337 3. adım ②). Hesabın KENDİ anahtarı okunur (`kimligiOku` —
 * deneme ortamında kimlik VERMEZ, gerçek pazaryerine gidilmez ve bu ekranda SÖYLENİR).
 * Okuma yalnız GET; sonuç KOD olarak depoya yazılır, ekrana sözlükten cümle gider.
 */
export async function kanalAnahtariDene(_onceki: AnahtarDurumu, form: FormData): Promise<AnahtarDurumu> {
  const baglam = await yetkiIste("kanal.anahtar");
  const t = await getTranslations("KanalAnahtari");
  const hesapId = String(form.get("hesapId") ?? "");
  try {
    const o = await kimligiOku(hesapId);
    if (o.durum === "DENEME_ORTAMI" || o.durum === "COZULEMEDI") return { hata: t(`dene_${o.durum}`) };
    if (o.durum !== "TAMAM") return { hata: t(`hata_${o.durum}`) };
    const sonuc = await baglantiyiDene(o.kimlik);
    await denemeSonucuYaz(hesapId, sonuc, baglam.kullaniciId);
    tazele();
    return sonuc === "BAGLANDI" ? { tamam: true, basari: t("dene_BAGLANDI") } : { hata: t(`dene_${sonuc}`) };
  } catch (e) {
    console.error("[kanal-anahtari] bağlantı denemesi düştü:", e);
    return { hata: t("hata_BEKLENMEDIK") };
  }
}

export async function kanalAnahtariKaldir(_onceki: AnahtarDurumu, form: FormData): Promise<AnahtarDurumu> {
  const baglam = await yetkiIste("kanal.anahtar");
  const t = await getTranslations("KanalAnahtari");
  try {
    const s = await anahtarKaldir(String(form.get("hesapId") ?? ""), baglam.kullaniciId);
    if (s.durum === "HATA") return { hata: t(`hata_${s.hata}`) };
    tazele();
    return { tamam: true, basari: t("kaldirildi") };
  } catch (e) {
    console.error("[kanal-anahtari] kaldırma düştü:", e);
    return { hata: t("hata_BEKLENMEDIK") };
  }
}
