import type { PrismaClient } from "@/generated/prisma/client";

/**
 * ============================================================================
 *  HB KANAL HESABI — TEK ÇÖZÜMLEYİCİ (K165-HB ①, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE TEK GÖVDE: 07.09'da HB tarafında İKİ ayrı çözümleyici vardı ve
 *  FARKLI ALANLARA bakıyorlardı —
 *
 *      listeleme yazıcısı  → `apiHesapKimligi`   ✓ çalışıyordu
 *      sipariş içe aktarma → `externalId`        ⛔ HİÇ eşleşmedi
 *
 *  Sonuç: sipariş içe aktarması **bir kez bile koşamadı** ("HESAP YOK" deyip
 *  ilk adımda durdu) ve Halil siparişleri ELLE girdi. Aynı soruya iki cevap
 *  veren iki gövde, birinin bozukluğunu ötekinin sağlığıyla gizler.
 *  _(Anayasa: "iki yerde iki ölçüt olmaz" — yasak olan aynı soruya iki cevap.)_
 *
 *  ── ⛔ `externalId`E DÜŞÜLMEZ — VE BU BİR YEDEK DEĞİL, BİR HATA OLURDU ──
 *  HB'de `externalId` **`7000222505`**: raporlardaki/hakedişteki satıcı
 *  numarası. API'nin istediği Mağaza ID ise 36 karakterlik AYRI bir kimlik.
 *  İkisi farklı CİNS kimliktir; "bulamazsan ötekine bak" demek, iki kimlik
 *  uzayını tek kefeye koymaktır ve yanlış hesabı bağlayabilir.
 *  _(Anayasa: "benzer ad, aynı kimlik değildir" · "kimlik varken dizeyle
 *  aranmaz".)_
 *
 *  ── ⚠ "BULUNAMADI" SESSİZ DÖNMEZ ────────────────────────────────────
 *  Çözüm başarısızsa çağıran NİÇİN olduğunu yazabilsin diye sayımlar da
 *  dönüyor: kaç HB hesabı var, kaçının API kimliği DOLU. "Hesap yok" ile
 *  "hesap var ama bağlanmamış" bambaşka iki iştir.
 *  _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir".)_
 * ============================================================================
 */

/** ⚠ Kanal adı VERİDİR — hesap kimlikle çözülür, bu yalnız kanal süzgeci. */
export const HB_KANAL_ADI = "Hepsiburada";

export type HbHesapCozumu =
  | { tur: "BULUNDU"; id: string; ad: string }
  | {
      tur: "YOK";
      /** Kanaldaki toplam hesap — 0 ise kanal hiç kurulmamış. */
      hbHesapSayisi: number;
      /** API kimliği DOLU olan hesap sayısı — 0 ise bağ hiç kurulmamış. */
      kimligiDoluSayisi: number;
    };

/**
 * API Mağaza ID'sinden kanal hesabını çözer.
 *
 * ⚠ `db` PARAMETRE: içe aktarma betikleri kendi `PrismaClient`ini kuruyor
 * (MariaDB adaptörüyle), ekran tarafı paylaşılan istemciyi kullanıyor.
 * Gövde ikisine de aynı cevabı vermek zorunda, bu yüzden istemciyi
 * kendisi seçmiyor.
 */
export async function hbHesabiCoz(
  db: PrismaClient,
  apiKimligi: string,
): Promise<HbHesapCozumu> {
  const hesaplar = await db.channelAccount.findMany({
    where: { channel: { name: HB_KANAL_ADI } },
    select: { id: true, name: true, apiHesapKimligi: true },
  });
  const eslesen = hesaplar.find((h) => h.apiHesapKimligi === apiKimligi);
  if (eslesen !== undefined) {
    return { tur: "BULUNDU", id: eslesen.id, ad: eslesen.name };
  }
  return {
    tur: "YOK",
    hbHesapSayisi: hesaplar.length,
    kimligiDoluSayisi: hesaplar.filter((h) => h.apiHesapKimligi !== null).length,
  };
}

/** Çözülemeyen durumu tek cümlede anlatır — her çağıran aynı cümleyi bassın. */
export function hbHesapHatasi(c: Extract<HbHesapCozumu, { tur: "YOK" }>): string {
  if (c.hbHesapSayisi === 0) return "Hepsiburada kanalında hiç hesap yok.";
  if (c.kimligiDoluSayisi === 0) {
    return (
      `${c.hbHesapSayisi} HB hesabı var ama hiçbirine API Mağaza ID'si ` +
      "bağlanmamış (canli:hb-hesap-bagla)."
    );
  }
  return (
    `${c.hbHesapSayisi} HB hesabından ${c.kimligiDoluSayisi} tanesinin API ` +
    "kimliği dolu, ama hiçbiri bu Mağaza ID'siyle eşleşmiyor — " +
    "`.env.canli` kimliği ile deftere bağlanan kimlik AYRI."
  );
}
