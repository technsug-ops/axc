import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { SAYFA_HAVUZU_BOYUTU, SICAK_TUTULAN_BAGLANTI } from "@/lib/veritabani-adresi";
import { ERISIM_BOSLUGU_EYLEMI, erisimBoslugu, KOTA_YAKIN_EYLEMI, kotaYakinMi, SON_ERISIM_ANAHTARI } from "@/lib/veritabani-erisim";
import { BAGLANTI_SAYIM_SORGUSU, kaynakIp } from "@/lib/baglanti-teshisi";
import { izYaz } from "@/lib/iz";

/**
 * ============================================================================
 *  SICAK TUT — SAYFA SUNUCUSUNU VE VERİTABANI BAĞLANTISINI UYANIK TUTAR
 *  (K332, kullanıcı kararı 12.10.2026 «A ve B'yi birlikte»)
 * ----------------------------------------------------------------------------
 *  Ölçüldü (canlı süre izi, 12.10): birkaç dakika boşta kalınca panelin ilk
 *  sorgusu 0,56–0,72 sn, gövdesi 3,4–3,7 sn; sıcakken 0,04 sn ve 1,7–2,6 sn.
 *  Pazaryeri çekimleri dakikada bir geliyor ama paneli UYANDIRMIYOR: o uçlar
 *  `maxDuration = 60` taşıyor ve Vercel farklı ayarlı yolları AYRI sunucu
 *  parçasında topluyor (belge: «routes with differing configurations are
 *  bundled into separate functions»).
 *
 *  ⛔ BU YÜZDEN BU UÇ `maxDuration` TAŞIMAZ — sayfalarla aynı parçaya düşsün
 *  diye. Bir ayar eklenirse uç ayrı parçaya gider ve sessizce işe yaramaz
 *  hâle gelir (bekçi: `cron-yollari:dogrula`).
 *
 *  · Kapı: diğer çekim uçlarıyla AYNI `CRON_SECRET`; yanlış/boş sır 404.
 *  · İş: boşta tutulan bağlantı sayısı kadar `SELECT 1` (K355'ten beri 1; KAS boştaki
 *    bağlantıyı 120 sn'de kapatıyor). Havuzun tamamı YOKLANMAZ — kota.
 *  · Yazdığı TEK şey (K358): son erişim anı (`BildirimImleci`, tek satır) ve erişim
 *    geri geldiğinde eşikten uzun boşluğun izi. Başka hiçbir şey yazmaz.
 *  · Tetik: cron-job.org, dakikada bir (kullanıcı hesabında kurulur).
 * ============================================================================
 */

export const dynamic = "force-dynamic";

/** Bu kopyada son başarılı yoklamadan beri düşen yoklama sayısı (K358; bellek — kopya değişirse 0). */
let basarisizYoklama = 0;

/* K381 (20.11.2026) — BAĞLANTI SAYISI İZİ (gerekçe `lib/veritabani-erisim.ts`). Kota kopya
   ömrü boyunca bir kez okunur; sayım tek sorgu (`lib/baglanti-teshisi.ts`, teşhisle AYNI).
   Ölçülemezse null döner — yoklama bundan DÜŞMEZ, «?» yazılır. */
let kotaOnbellek: number | null = null;
async function kotaOku(): Promise<number | null> {
  if (kotaOnbellek !== null) return kotaOnbellek;
  try {
    const r = (await prisma.$queryRawUnsafe("SHOW VARIABLES LIKE 'max_user_connections'")) as Array<{ Value?: unknown }>;
    const v = Number(r[0]?.Value);
    kotaOnbellek = Number.isFinite(v) && v > 0 ? v : null;
    return kotaOnbellek;
  } catch {
    return null;
  }
}
async function baglantiSay(): Promise<{ n: number; kaynak: string | null } | null> {
  try {
    const r = (await prisma.$queryRawUnsafe(BAGLANTI_SAYIM_SORGUSU)) as Array<{ n: bigint | number; kaynak: string | null }>;
    const n = Number(r[0]?.n);
    return Number.isFinite(n) ? { n, kaynak: kaynakIp(r[0]?.kaynak) } : null;
  } catch {
    return null;
  }
}

export async function GET(istek: NextRequest) {
  const sir = process.env.CRON_SECRET?.trim() ?? "";
  const gelen = istek.headers.get("authorization") ?? "";
  if (sir === "" || gelen !== `Bearer ${sir}`) {
    return new NextResponse(null, { status: 404 });
  }
  const bas = performance.now();
  try {
    /* Yalnız BOŞTA tutulan bağlantılar canlı tutulur (`SICAK_TUTULAN_BAGLANTI`, tek kaynak
       `veritabani-adresi.ts`). ⛔ K355 (22.10.2026): eskiden havuzun TAMAMI (5) dakikada bir
       yoklanıyordu → her kopya 5 bağlantıyı hep açık tutuyordu, 5 kopya KAS'ın 25'lik
       kotasını dolduruyordu ve yeni kopya hiç bağlantı alamıyordu. */
    const sureler = await Promise.all(
      Array.from({ length: SICAK_TUTULAN_BAGLANTI }, async () => {
        const b = performance.now();
        await prisma.$queryRawUnsafe("SELECT 1");
        return Math.round(performance.now() - b);
      }),
    );
    /* K381 — bağlantı sayısı: aynı havuz bağlantısı, SIRAYLA (Promise.all DEĞİL — K355 kotayı
       yoklamayla doldurmuştu). Günlüğe her dakika; kotaya yaklaşınca iz. */
    const kota = await kotaOku();
    const olcum = await baglantiSay();
    console.log(`[sicak] bağlantı ${olcum?.n ?? "?"}/${kota ?? "?"} kaynak ${olcum?.kaynak ?? "?"}`);
    if (kotaYakinMi(olcum?.n ?? null, kota, SAYFA_HAVUZU_BOYUTU)) {
      await izYaz({ action: KOTA_YAKIN_EYLEMI, targetType: "VERITABANI", detail: JSON.stringify({ n: olcum?.n ?? null, kota, kaynak: olcum?.kaynak ?? null, an: new Date().toISOString() }), userId: null });
    }
    /* K358 — ERİŞİM BOŞLUĞU KAYDI (`lib/veritabani-erisim.ts`). Son erişim anı KOŞULLU
       ilerler (okunan eski değer yerindeyse) — aynı dakikada iki kopya yoklarsa boşluğu
       yalnız ilerletmeyi başaran yazar, iz ikilenmez (K348 imleç deseni). */
    const simdi = new Date();
    const onceki = await prisma.bildirimImleci.findUnique({ where: { anahtar: SON_ERISIM_ANAHTARI }, select: { an: true } });
    const bosluk = erisimBoslugu(onceki?.an ?? null, simdi, basarisizYoklama);
    if (onceki) {
      const ilerledi = await prisma.bildirimImleci.updateMany({ where: { anahtar: SON_ERISIM_ANAHTARI, an: onceki.an }, data: { an: simdi } });
      if (ilerledi.count === 1 && bosluk) {
        await izYaz({ action: ERISIM_BOSLUGU_EYLEMI, targetType: "VERITABANI", detail: JSON.stringify(bosluk), userId: null });
      }
    } else {
      await prisma.bildirimImleci.upsert({ where: { anahtar: SON_ERISIM_ANAHTARI }, create: { anahtar: SON_ERISIM_ANAHTARI, an: simdi }, update: { an: simdi } });
    }
    basarisizYoklama = 0;
    return NextResponse.json({ durum: "SICAK", veritabaniMs: Math.round(performance.now() - bas), baglantiMs: sureler, surecYasiSn: Math.round(process.uptime()), bosluk, baglanti: olcum ? { ...olcum, kota } : null });
  } catch (hata) {
    /* Yakalanmamış hata teşhisi siler (anayasa) — TAM loglanır, dışarıya kod döner. */
    basarisizYoklama += 1;
    console.error("[sicak] veritabanı yoklaması düştü:", hata);
    return NextResponse.json({ durum: "VERITABANI_YOK" }, { status: 503 });
  }
}
