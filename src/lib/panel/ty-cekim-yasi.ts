import type { PrismaClient } from "@/generated/prisma/client";

/**
 * ============================================================================
 *  ÇEKİM YAŞI — "SON ÇEKİM NE ZAMANDI" ROZETİ (ÜÇ KANAL)
 * ----------------------------------------------------------------------------
 *  Halil kararı 04.09.2026 ("TY'de devam edelim"): sipariş çekimi Windows
 *  Görev Zamanlayıcı ile koşuyor.
 *  ⛔ ZAMANLAYICI DA KAÇIRABİLİR — Vercel Cron 18-19.08'de iki gün üst üste
 *  hiç tetiklenmedi ve Hobby planında logu olmadığı için sebebi
 *  ÖĞRENİLEMEDİ. Anayasa dersi: _"kaçışın kendisi görünür kılınır — eksik
 *  günler ekranda kırmızı yazmalı ki üçüncü kaçış birinin fark etmesine
 *  kalmasın."_ Bu rozet o dersin uygulaması.
 *
 *  ═══ ⛔ EŞİK RUTİNE BAĞLIDIR — SABİT SAYI DEĞİL (K189, 08.09.2026) ═══
 *
 *  Burada `TY_CEKIM_ESIK_SAAT = 26` yazıyordu ve gerekçesi kendi yorumunda
 *  duruyordu: _"rutin GÜNLÜKTÜR (24 saat) + 2 saat koşum payı."_ Gerekçe o
 *  gün doğruydu. **K187 rutini 5 DAKİKAYA çekti ve bu eşik güncellenmedi.**
 *
 *  Bedeli ölçüldü (08.09.2026): bir Ctrl+C batch'i _"Toplu işi sonlandır
 *  (E/H)?"_ sorusunda astı, `IgnoreNew` sonraki her koşumu sessizce reddetti
 *  ve çekim **69 dakika** durdu. 69 dakika = 1,15 saat, yani 26 saatlik
 *  eşiğin çok altında: **rozet kesinti boyunca YEŞİL kaldı** ve arızayı
 *  kullanıcı gözüyle yakaladı.
 *  _(Anayasa: "kapsam genişlemesi, bağımlı listelerin de genişlemesidir" ve
 *  "eşik, ölçüldüğü popülasyonun dışına uygulanamaz".)_
 *
 *  ⭐ ÇARE SAYIYI DÜZELTMEK DEĞİL, EŞİĞİ RUTİNE BAĞLAMAK: periyot bir daha
 *  değişirse eşik kendiliğinden ayarlanır ve aynı hata tekrar edemez.
 * ============================================================================
 */

/**
 * Rutinin periyodu — Görev Zamanlayıcı `Selliora Kanal Sik Cekim` tetiği.
 * ⚠ BURASI TEK KAYIT YERİ: görevin aralığı değişirse yalnız bu satır
 * değişir ve eşik onunla birlikte yürür.
 */
export const CEKIM_PERIYODU_DK = 5;

/**
 * ⭐ EŞİK = 4 × PERİYOT — ve çarpan ÖLÇÜLEREK seçildi, yuvarlanarak değil.
 *
 * Bugünkü 128 koşum aralığı ölçüldü (08.09.2026):
 *
 *     min 0,6 dk · ortanca 5,0 · p90 5,0 · p95 5,1 · max 74,4
 *     en buyuk bes aralik:  5 · 5 · 6 · 38 · 74
 *                                 └ GOVDE ┘  └ bugunku iki kesinti
 *
 * Gövde 6 dakikada kapanıyor, sonra 38'e sıçrıyor. Eşik o gediğe konuldu:
 * 4 periyot = 20 dk, yani **art arda dört koşum kaçtı** demek. `1 × periyot`
 * her gecikmede yanardı (gövdenin İÇİ), `10 × periyot` bugünkü 69 dakikalık
 * kesintiyi bile kaçırırdı.
 * _(Anayasa: "eşik dağılımın gediğine konur — gövdesine değil".)_
 */
export const CEKIM_ESIK_DK = 4 * CEKIM_PERIYODU_DK;

/**
 * ⛔ ÜÇ KANAL DA ÖLÇÜLÜR — TEK GÖREV, ÜÇ İZ (K189).
 *
 * Eskiden yalnız TY'ye bakılıyordu; K187 aynı göreve HB ve N11'i de ekledi.
 * Yalnız TY'ye bakan bir rozet, HB ucu tek başına düşse **hiçbir şey
 * söylemezdi** — ve bu, K184'te ölçülen vakanın aynısı olurdu (HB için
 * tetikleyici hiç kurulmamıştı, kimse fark etmemişti).
 */
export const CEKIM_KANALLARI = [
  { kod: "TY", iz: "TY_SIPARIS_ICE_AKTARMA" },
  { kod: "HB", iz: "HB_SIPARIS_ICE_AKTARMA" },
  { kod: "N11", iz: "N11_SIPARIS_ICE_AKTARMA" },
] as const;

export type CekimKanali = (typeof CEKIM_KANALLARI)[number]["kod"];

export type CekimDurumu =
  | { durum: "YOK"; dk: null }
  | { durum: "TAZE"; dk: number }
  | { durum: "ESKI"; dk: number };

/**
 * SAF: son çekim anından rozet durumuna. Saatini kendisi okumaz.
 * `null` = hiç çekim izi yok — bu da AYRI söylenir; "0 dk önce" diye
 * gösterilseydi yokluk tazelik sanılırdı (boş ≠ temiz).
 */
export function cekimDurumu(sonCekim: Date | null, an: Date): CekimDurumu {
  if (sonCekim === null) return { durum: "YOK", dk: null };
  const dk = (an.getTime() - sonCekim.getTime()) / 60_000;
  return dk > CEKIM_ESIK_DK ? { durum: "ESKI", dk } : { durum: "TAZE", dk };
}

export type KanalCekimi = { kod: CekimKanali; durum: CekimDurumu };

/**
 * ⭐ SAF: üç kanalın EN KÖTÜSÜ ekrana çıkar.
 *
 * ⚠ "EN YENİ" DEĞİL "EN ESKİ" — ve bu ayrım vakanın kendisi. Üç kanal TEK
 * görevde koşuyor; en yeniye bakan bir rozet, iki kanal ölse bile üçüncüsü
 * koştuğu sürece yeşil kalırdı. Sorulan soru _"çekim çalışıyor mu"_ değil,
 * _"çekimin herhangi bir ayağı düştü mü"_.
 *
 * ⛔ YOK > ESKİ > TAZE sırası: hiç izi olmayan kanal en ağır hâldir —
 * "20 dakikadır koşmadı" bilgisi bile yok demektir.
 */
export function enKotuCekim(kanallar: KanalCekimi[]): KanalCekimi | null {
  if (kanallar.length === 0) return null;
  const agirlik = (d: CekimDurumu) =>
    d.durum === "YOK" ? 2 : d.durum === "ESKI" ? 1 : 0;
  return kanallar.reduce((kotu, k) => {
    const fark = agirlik(k.durum) - agirlik(kotu.durum);
    if (fark > 0) return k;
    if (fark < 0) return kotu;
    /** Aynı ağırlıkta olan iki kanaldan YAŞLI olanı gösterilir. */
    return (k.durum.dk ?? 0) > (kotu.durum.dk ?? 0) ? k : kotu;
  });
}

/** Üç kanalın son çekim anı — iz `AuditLog`daki koşum kaydı. */
export async function sonCekimler(
  db: Pick<PrismaClient, "auditLog">,
  an: Date,
): Promise<KanalCekimi[]> {
  const cikti: KanalCekimi[] = [];
  for (const k of CEKIM_KANALLARI) {
    const iz = await db.auditLog.findFirst({
      where: { action: k.iz },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    cikti.push({ kod: k.kod, durum: cekimDurumu(iz?.createdAt ?? null, an) });
  }
  return cikti;
}
