import webpush from "web-push";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { izYaz } from "@/lib/iz";
import { VARSAYILAN_DIL } from "@/i18n/ayarlar";
import { bildirimHakkiVarMi, bildirimImleciKarari, olusAbonelikMi, SIPARIS_IMLECI } from "./push-karar";

/**
 * ============================================================================
 *  ANLIK BİLDİRİM — GÖNDERİCİ (20.10.2026)
 * ----------------------------------------------------------------------------
 *  Üç gizli değer ortamdan okunur: `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` ·
 *  `VAPID_SUBJECT` (mailto:…). Biri yoksa özellik KAPALIDIR ve bunu söyler
 *  (`KAPALI`) — sessizce «gönderildi» demez.
 *
 *  ⚠ YÜK VERİ TAŞIMAZ: yalnız «N yeni sipariş» ve açılacak yol. Ciro, ürün, kâr
 *  kilit ekranına düşmez (PWA kararı: çıkıştan sonra telefonu alan kişiye
 *  finansal bilgi göstermemek).
 * ============================================================================
 */

export type PushAyari = { genel: string; ozel: string; konu: string };

/** Gizli değerler tamsa ayar, değilse null (özellik kapalı). */
export function pushAyari(): PushAyari | null {
  const genel = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const ozel = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const konu = process.env.VAPID_SUBJECT?.trim() ?? "";
  if (!genel || !ozel || !konu) return null;
  return { genel, ozel, konu };
}

export type PushYuku = { baslik: string; govde: string; url: string; etiket: string };
export type GonderimSonucu = { hedef: number; gonderilen: number; silinen: number; hatali: number };

/** Verilen aboneliklere gönderir; ölü abonelik (404/410) silinir, öteki hata TAM loglanır. */
type Istemci = Prisma.TransactionClient;
type Abonelik = { id: string; endpoint: string; p256dh: string; auth: string };
export type Gonderici = (ayar: PushAyari, abonelikler: Abonelik[], yuk: PushYuku, istemci: Istemci) => Promise<GonderimSonucu>;

async function abonelereGonder(ayar: PushAyari, abonelikler: Abonelik[], yuk: PushYuku, istemci: Istemci = prisma): Promise<GonderimSonucu> {
  const sonuc: GonderimSonucu = { hedef: abonelikler.length, gonderilen: 0, silinen: 0, hatali: 0 };
  const govde = JSON.stringify(yuk);
  await Promise.all(
    abonelikler.map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, govde, {
          vapidDetails: { subject: ayar.konu, publicKey: ayar.genel, privateKey: ayar.ozel },
          // Bir saat içinde teslim edilemeyen sipariş bildirimi bayattır.
          TTL: 3600,
          urgency: "high",
        });
        sonuc.gonderilen++;
      } catch (hata) {
        const kod = (hata as { statusCode?: number }).statusCode;
        if (olusAbonelikMi(kod)) {
          await istemci.pushAboneligi.deleteMany({ where: { id: a.id } });
          sonuc.silinen++;
        } else {
          sonuc.hatali++;
          console.error("[anlik-bildirim] gönderim düştü:", hata);
        }
      }
    }),
  );
  return sonuc;
}

/** Bu izne sahip (ve aktif) kullanıcıların abonelikleri — `yetkiBaglami` ile aynı ölçüt. */
export async function izinliAbonelikler(izin: string, userId?: string, istemci: Istemci = prisma) {
  const satirlar = await istemci.pushAboneligi.findMany({
    where: userId ? { userId } : {},
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      user: {
        select: {
          isActive: true,
          userCompanyRoles: {
            where: { company: { isActive: true } },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { role: { select: { isActive: true, izinler: { select: { permissionKey: true } } } } },
          },
        },
      },
    },
  });
  return satirlar.filter((s) => {
    const uyelik = s.user.userCompanyRoles[0];
    return bildirimHakkiVarMi(
      { isActive: s.user.isActive, ilkUyelik: uyelik ? { rolAktif: uyelik.role.isActive, izinler: uyelik.role.izinler.map((i) => i.permissionKey) } : null },
      izin,
    );
  });
}

export type SiparisBildirimOzeti =
  | { durum: "KAPALI" | "TABAN" | "BASKASI_GONDERDI" | "YENI_YOK" }
  | ({ durum: "GONDERILDI"; sayi: number } & GonderimSonucu);

/**
 * YENİ SİPARİŞ BİLDİRİMİ — her sipariş çekiminden sonra çağrılır (üç kanalın
 * cron ucu). «İmleçten beri kaç yeni (iptal edilmemiş) satış düştü» sayılır.
 *
 * ⛔ ÇİFT BİLDİRİM YAPISAL OLARAK ÖNLENİR: imleç KOŞULLU ilerletilir — okunan
 * eski değer hâlâ yerindeyse. İki zamanlayıcı aynı anda koşarsa yalnız biri
 * satırı günceller ve yalnız o gönderir; öteki `BASKASI_GONDERDI` döner.
 * ⚠ İmleç gönderimden ÖNCE ilerler: gönderim düşerse o siparişler için bildirim
 * tekrar denenmez (bildirim bir haberdir, defter kaydı değil — kayıp sipariş
 * değil, kaybolan bir uyarıdır; satış ekranında sipariş yine durur).
 */
export async function yeniSiparisBildirimiGonder(
  secenek: { simdi?: Date; istemci?: Istemci; gonder?: Gonderici; metin?: (sayi: number) => Promise<{ baslik: string; govde: string }> } = {},
): Promise<SiparisBildirimOzeti> {
  const simdi = secenek.simdi ?? new Date();
  const istemci = secenek.istemci ?? prisma;
  const gonder = secenek.gonder ?? abonelereGonder;
  const ayar = pushAyari();
  if (!ayar) return { durum: "KAPALI" };
  const satir = await istemci.bildirimImleci.findUnique({ where: { anahtar: SIPARIS_IMLECI } });
  const karar = bildirimImleciKarari(satir?.an ?? null, simdi);
  if (karar.tur === "TABAN") {
    await istemci.bildirimImleci.upsert({ where: { anahtar: SIPARIS_IMLECI }, create: { anahtar: SIPARIS_IMLECI, an: simdi }, update: { an: simdi } });
    return { durum: "TABAN" };
  }
  const sayi = await istemci.sale.count({ where: { createdAt: { gt: karar.bas, lte: simdi }, iptalTarihi: null } });
  const sahiplik = await istemci.bildirimImleci.updateMany({ where: { anahtar: SIPARIS_IMLECI, an: karar.bas }, data: { an: simdi } });
  if (sahiplik.count !== 1) return { durum: "BASKASI_GONDERDI" };
  if (sayi === 0) return { durum: "YENI_YOK" };

  const { baslik, govde } = await (secenek.metin ?? siparisMetni)(sayi);
  const sonuc = await gonder(ayar, await izinliAbonelikler("satis.gor", undefined, istemci), {
    baslik,
    govde,
    url: "/satislar",
    etiket: "yeni-siparis",
  }, istemci);
  await izYaz({
    action: "ANLIK_BILDIRIM_SIPARIS",
    userId: null,
    targetType: "BildirimImleci",
    targetId: SIPARIS_IMLECI,
    detail: JSON.stringify({ sayi, aralik: [karar.bas.toISOString(), simdi.toISOString()], ...sonuc }),
  }, istemci);
  return { durum: "GONDERILDI", sayi, ...sonuc };
}

/** Bildirim metni sözlükten (sunucuda; servis çalışanı metin yazmaz). */
async function siparisMetni(sayi: number) {
  const t = await getTranslations({ locale: VARSAYILAN_DIL, namespace: "AnlikBildirim" });
  return { baslik: t("siparisBaslik", { sayi }), govde: t("siparisGovde") };
}

/**
 * Cron uçlarının çağırdığı kabuk: bildirim hatası ÇEKİMİN sonucunu bozmaz
 * (sipariş deftere girdi; haber düştüyse yalnız haber düşer) — ama TAM loglanır.
 */
export async function siparisBildiriminiDene(): Promise<SiparisBildirimOzeti | { durum: "HATA" }> {
  try {
    return await yeniSiparisBildirimiGonder();
  } catch (hata) {
    console.error("[anlik-bildirim] sipariş bildirimi düştü:", hata);
    return { durum: "HATA" };
  }
}

/** Ekrandaki «deneme bildirimi» — yalnız bu kullanıcının cihazlarına. */
export async function denemeBildirimiGonder(userId: string): Promise<GonderimSonucu | null> {
  const ayar = pushAyari();
  if (!ayar) return null;
  const t = await getTranslations({ locale: VARSAYILAN_DIL, namespace: "AnlikBildirim" });
  return abonelereGonder(ayar, await izinliAbonelikler("satis.gor", userId), {
    baslik: t("denemeBaslik"),
    govde: t("denemeGovde"),
    url: "/bildirimler",
    etiket: "deneme",
  });
}
