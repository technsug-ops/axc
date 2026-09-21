import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { apiGet, baslikKur, kimlikOku } from "./n11/istemci";

/**
 * ============================================================================
 *  N11 LİSTELEME DURUMU — KANALDAN OKU, DEFTERE YAZ (22.09.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — gece koşabilir; tekrar koşulabilir ve zararsız.
 *
 *      npx tsx scripts/canli-n11-listeleme-yaz.ts            → KURU KOŞUM
 *      npx tsx scripts/canli-n11-listeleme-yaz.ts --uygula   → YAZAR
 *
 *  ⛔ PAZARYERİNE HİÇBİR ŞEY YAZILMAZ. Bu betik N11'i yalnız OKUR
 *  (`/ms/product-query`, GET) ve `ChannelSku`nun üç alanına yazar:
 *  `listelemeDurumu` · `kanalAdet` · `kanalOlcumAt`. Yazan gövde
 *  `src/lib/kanal-listeleme-hb-yaz.ts` — adı HB'li ama kanal-bağımsız;
 *  iz adı buradan verilir (`N11_LISTELEME_YAZIM`).
 *
 *  ── NİYE DOĞDU ─────────────────────────────────────────────────────────
 *  Ölçüldü 21.09.2026: TY 1099 kodun 1096'sı ölçülmüş (%99,7), HB 1111/1110
 *  (%99,9), **N11 51/0 (%0)**. Listelemelerimizin canlıda olup olmadığını
 *  hiç bilmediğimiz tek kanal. Uç 22.09'da ilk kez sondalandı: 113 listeleme,
 *  tek satıcı (4534966), zarf Spring sayfası (`content` · `totalPages`).
 *
 *  ── HESAP KİMLİKLE ─────────────────────────────────────────────────────
 *  Satırların `sellerId`si `ChannelAccount.externalId` ile eşlenir (ölçüldü:
 *  N11/AXCALI → 4534966). Adla değil. _(K13b: `kanalAdi === "..."` 29 ürünü
 *  sessizce elemişti.)_
 *
 *  ── ⚠ KOŞUM SONUCU — ÇAĞIRAN OKUR ─────────────────────────────────────
 *  `/api/cron/listeleme-cekim` bu gövdeyi çağırır ve sonucu cevapta taşır;
 *  ekrana basılan satırlar insan içindir, karar `N11ListelemeOzeti`nden.
 * ============================================================================
 */

export type N11ListelemeOzeti =
  | { atlandi: "VERITABANI" | "KIMLIK" | "HESAP" | "CEKIM" }
  | {
      kanal: "N11";
      listing: number;
      defterdeki: number;
      degisecek: number;
      yazilan: number;
      hata: number;
      yazdiMi: boolean;
    };

const KOSUM_KANALI = "N11";
const KOSUM_IZI = "N11_LISTELEME_YAZIM";
const SAYFA_BOYUTU = 100;

const SIRA: Record<string, number> = {
  ACIK: 0,
  STOKSUZ: 1,
  ONAY_BEKLIYOR: 2,
  PASIF: 3,
  YOK: 4,
  BILINMIYOR: 5,
};

/**
 * Bütün ürün sayfalarını toplar. Bitiş ölçütü ZARFIN BEYANI (`totalPages`,
 * ölçüldü 22.09.2026) — boş sayfaya ya da 404'e bel bağlanmaz.
 */
async function tumUrunler(
  baslik: Record<string, string>,
): Promise<{ tur: "TAMAM"; kayitlar: Record<string, unknown>[] } | { tur: "HATA"; sebep: string }> {
  const kayitlar: Record<string, unknown>[] = [];
  let sayfa = 0;
  let toplamSayfa = 1;
  while (sayfa < toplamSayfa) {
    const r = await apiGet(`/ms/product-query?page=${sayfa}&size=${SAYFA_BOYUTU}`, baslik);
    if (r.tur !== "VERI") return { tur: "HATA", sebep: JSON.stringify(r) };
    const g = r.govde as { content?: unknown; totalPages?: unknown };
    if (!Array.isArray(g.content) || typeof g.totalPages !== "number") {
      return { tur: "HATA", sebep: "ZARF_TANINMADI: " + Object.keys(g).join(",") };
    }
    kayitlar.push(...(g.content as Record<string, unknown>[]));
    toplamSayfa = g.totalPages;
    sayfa++;
    /** ⚠ Sonsuz döngü kapısı — zarf bozuk gelirse (totalPages şişerse). */
    if (sayfa > 200) return { tur: "HATA", sebep: "SAYFA_TAVANI" };
  }
  return { tur: "TAMAM", kayitlar };
}

export async function n11ListelemeCekimKos(ayar: {
  yaz: boolean;
  dbAdresi?: string;
}): Promise<N11ListelemeOzeti> {
  const UYGULA = ayar.yaz;
  let dbAdresi = ayar.dbAdresi ?? null;
  if (dbAdresi === null) {
    const y = canliYapilandirma();
    if (!y.tamam) {
      console.log("Canlı yapılandırma okunamadı:", y.hata);
      return { atlandi: "VERITABANI" };
    }
    dbAdresi = betikAdresi(y.veri.ham);
  }
  const k = kimlikOku();
  if (k === null) {
    console.log("⛔ N11 kimliği okunamadı (.env.canli / süreç ortamı).");
    return { atlandi: "KIMLIK" };
  }
  process.env.DATABASE_URL = dbAdresi;
  const { prisma } = await import("../src/lib/prisma");
  const { n11Adedi, n11Anahtari, n11ListelemeDurumu } = await import(
    "../src/lib/kanal-listeleme-n11"
  );

  console.log("\nN11 LİSTELEME DURUMU  ·  " + (UYGULA ? "⚠ YAZIM" : "KURU KOŞUM"));
  console.log("=".repeat(78));

  /* ═══ ① ÇEKİM ═════════════════════════════════════════════════════ */
  const cekim = await tumUrunler(baslikKur(k));
  if (cekim.tur !== "TAMAM") {
    console.log("\n   ⛔ ÇEKİM DÜŞTÜ: " + cekim.sebep);
    await prisma.$disconnect();
    return { atlandi: "CEKIM" };
  }
  const listingler = cekim.kayitlar;
  console.log("\n① LİSTİNG  " + listingler.length);

  /* ═══ ② HESAP — KİMLİKLE ══════════════════════════════════════════ */
  const saticiIdleri = new Set(listingler.map((l) => String(l.sellerId ?? "")).filter((s) => s !== ""));
  if (saticiIdleri.size !== 1) {
    console.log(`   ⛔ satıcı kimliği TEK olmalı; gelen: ${[...saticiIdleri].join(",") || "(boş)"}`);
    await prisma.$disconnect();
    return { atlandi: "HESAP" };
  }
  const saticiId = [...saticiIdleri][0]!;
  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { code: "N11" }, externalId: saticiId },
    select: { id: true, name: true, externalId: true },
  });
  if (!hesap) {
    console.log(`   ⛔ externalId=${saticiId} olan N11 hesabı YOK — adla aranmaz, açılması gerekir.`);
    await prisma.$disconnect();
    return { atlandi: "HESAP" };
  }
  console.log(`   hesap  N11/${hesap.name}  (externalId ${hesap.externalId})`);

  /* ═══ ③ ÇEVİRİ + ANAHTAR ═══════════════════════════════════════════ */
  const kanal = new Map<string, { durum: string; kaynak: string; adet: number | null }>();
  const dagilim = new Map<string, number>();
  let anahtarsiz = 0;
  for (const l of listingler) {
    const anahtar = n11Anahtari(l);
    const { durum, kaynak } = n11ListelemeDurumu(l);
    const adet = n11Adedi(l.quantity);
    dagilim.set(`${durum} · ${kaynak}`, (dagilim.get(`${durum} · ${kaynak}`) ?? 0) + 1);
    if (anahtar === "") {
      anahtarsiz++;
      continue;
    }
    const mevcut = kanal.get(anahtar);
    if (mevcut === undefined) kanal.set(anahtar, { durum, kaynak, adet });
    else {
      const enIyi = SIRA[durum] < SIRA[mevcut.durum] ? durum : mevcut.durum;
      const toplam =
        mevcut.adet === null && adet === null ? null : (mevcut.adet ?? 0) + (adet ?? 0);
      kanal.set(anahtar, { durum: enIyi, kaynak: enIyi === durum ? kaynak : mevcut.kaynak, adet: toplam });
    }
  }
  console.log("\n③ DURUM DAĞILIMI (durum · alt-iz)");
  for (const [ad, n] of [...dagilim].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(6)}  ${ad}`);
  }
  if (anahtarsiz > 0) console.log(`   ⚠ anahtarsız (stockCode boş): ${anahtarsiz}`);
  console.log(`   benzersiz anahtar: ${kanal.size}`);

  /* ═══ ④ DEFTERLE EŞLEŞME ═══════════════════════════════════════════ */
  const satirlar = await prisma.channelSku.findMany({
    where: { channelAccountId: hesap.id },
    select: { id: true, channelSku: true, listelemeDurumu: true, kanalAdet: true },
  });
  let eslesen = 0;
  let degisecek = 0;
  let kanaldaYok = 0;
  const yeniDurum = new Map<string, { durum: string; adet: number | null }>();
  for (const s of satirlar) {
    const bulunan = kanal.get(s.channelSku.trim());
    if (bulunan === undefined) {
      kanaldaYok++;
      if (s.listelemeDurumu !== "YOK") yeniDurum.set(s.id, { durum: "YOK", adet: null });
      continue;
    }
    eslesen++;
    if (s.listelemeDurumu !== bulunan.durum || s.kanalAdet !== bulunan.adet) {
      degisecek++;
      yeniDurum.set(s.id, { durum: bulunan.durum, adet: bulunan.adet });
    }
  }
  const defterAnahtarlari = new Set(satirlar.map((s) => s.channelSku.trim()));
  const defterdeYok = [...kanal.keys()].filter((a) => !defterAnahtarlari.has(a)).length;
  console.log("\n④ DEFTERLE EŞLEŞME");
  console.log(`   N11 kanal SKU kaydı  ${satirlar.length}`);
  console.log(`   kanalda bulunan      ${eslesen}`);
  console.log(`   kanalda YOK          ${kanaldaYok}`);
  console.log(`   değişecek satır      ${yeniDurum.size}  (durum ya da adet farklı)`);
  console.log(`   ⚠ kanalda var, DEFTERDE yok: ${defterdeYok}  (kanal SKU kaydı açılmamış)`);
  /**
   * ⚠ İLK KOŞUMUN ASIL ÖLÇÜMÜ BU SATIR: "kanalda bulunan" 0 çıkarsa
   * defterdeki `channelSku` ile N11'in `stockCode`u AYNI ŞEY DEĞİLDİR ve
   * anahtar yeniden seçilir — yazım o zamana kadar anlamsızdır.
   */
  if (satirlar.length > 0 && eslesen === 0) {
    console.log("   ⛔ HİÇ EŞLEŞME YOK — anahtar (channelSku ↔ stockCode) uyuşmuyor; yazım anlamsız.");
  }

  /* ═══ ⑤ YAZIM ═════════════════════════════════════════════════════ */
  if (!UYGULA || (satirlar.length > 0 && eslesen === 0)) {
    console.log("\n   " + "-".repeat(72));
    console.log("   KURU KOŞUM — hiçbir şey yazılmadı." + (UYGULA ? " (eşleşme sıfır: yazım DURDURULDU)" : ""));
    if (!UYGULA) console.log("   Yazmak için sonuna --uygula ekleyin.");
    await prisma.$disconnect();
    return {
      kanal: KOSUM_KANALI,
      listing: listingler.length,
      defterdeki: satirlar.length,
      degisecek,
      yazilan: 0,
      hata: 0,
      yazdiMi: false,
    };
  }
  const { hbListelemeDurumunuYaz } = await import("../src/lib/kanal-listeleme-hb-yaz");
  const y2 = await hbListelemeDurumunuYaz(
    [...yeniDurum].map(([channelSkuId, v]) => ({ channelSkuId, durum: v.durum as never, adet: v.adet })),
    KOSUM_KANALI,
    new Date(),
    satirlar.map((s) => s.id),
    KOSUM_IZI,
  );
  console.log(`\n⑤ YAZIM — ${y2.yazilan} satır güncellendi · hata ${y2.hata}`);
  await prisma.$disconnect();
  return {
    kanal: KOSUM_KANALI,
    listing: listingler.length,
    defterdeki: satirlar.length,
    degisecek,
    yazilan: y2.yazilan,
    hata: y2.hata,
    yazdiMi: true,
  };
}

/** Cron için: hiçbir şey fırlatmaz; çökme de bir SONUÇTUR. */
export async function n11ListelemeCekimKosGuvenli(ayar: {
  yaz: boolean;
  dbAdresi?: string;
}): Promise<N11ListelemeOzeti | { atlandi: "COKTU"; sebep: string }> {
  try {
    return await n11ListelemeCekimKos(ayar);
  } catch (e) {
    return { atlandi: "COKTU", sebep: e instanceof Error ? e.message : String(e) };
  }
}

const dogrudanKosuluyor = (() => {
  const giris = process.argv[1] ?? "";
  return /canli-n11-listeleme-yaz\.(ts|js)$/.test(giris.split("\\").join("/"));
})();
if (dogrudanKosuluyor) {
  n11ListelemeCekimKos({ yaz: process.argv.includes("--uygula") })
    .then((o) => {
      if ("atlandi" in o || o.hata > 0) process.exitCode = 1;
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
}
