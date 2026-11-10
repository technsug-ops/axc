"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma, type IslemIstemcisi } from "@/lib/prisma";
import { izYaz } from "@/lib/iz";
import { satisKarTazele } from "@/lib/kar-yeniden";
import { yetkiIste } from "@/lib/yetki";
import {
  partileriSinirla,
  satisStokZamani,
  tuketilecekPartiler,
} from "@/lib/stok";
import {
  PARTI_BAGI_DEGISIM_EYLEMI,
  degistirilebilirHedefler,
  partiDegisimPlani,
  type HedefParti,
  type PartiBagiDurumu,
  type PartiDegisimReddi,
  type PartiHedefCevabi,
} from "@/lib/parti-bagi-degistirme";

/**
 * ============================================================================
 *  SATIŞIN PARTİ BAĞINI DEĞİŞTİRME — SUNUCU EYLEMİ (K376, 10.11.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _«Bunun maliyeti yanlış seçtim değiştiremiyorum»_ → sorulunca
 *  **«yanlış PARTİ seçildi»**. Satış girişinde parti seçimi VAR (K110,
 *  `secilenPartiId`), satış DÜZENLEME ekranında yok — yani bir kez kaydedilen
 *  satışın hangi partiden düştüğü arayüzden hiç değiştirilemiyordu.
 *
 *  ⛔ VE «MALİYETİ DÜZELT» BUNUN YERİNE GEÇMEZ: o düğme partinin KENDİ
 *  maliyetini değiştirir ve o partiden çeken BÜTÜN satışları etkiler. Yanlış
 *  partiye bağlanmış tek bir satışı onunla düzeltmek, doğru olan öteki
 *  satışları bozardı. _(Anayasa: ilke, kendi kapsamının dışına uygulanırsa
 *  koruduğu şey doğruluk değil hatanın kendisi olur.)_
 *
 *  ── ⛔ KAPASİTE ÖMÜR BOYU OKUNUR, SINIR PENCERESİNDEN DEĞİL ────────────
 *  `tuketilecekPartiler(db, varyant, SINIR)` çağrılsaydı tüketim sorgusu da
 *  `occurredAt < sinir` ile süzülürdü ve sınırdan SONRAKİ çıkışlar
 *  sayılmazdı — geriye dönük bir düzeltmede hedefin kalan adedi OLDUĞUNDAN
 *  FAZLA görünür ve parti aşırı tüketilirdi. K91'de tam bu oldu: 64 satırın
 *  her biri tek başına geçerliydi, yazıldığında 32 parti aşıldı.
 *
 *  İki soru İKİ ayrı yerden cevaplanıyor, ikisi de MEVCUT gövdelerden:
 *    · KAPASİTE → `tuketilecekPartiler(db, varyant)` — sınırsız, ömür boyu
 *    · TARİH    → `partileriSinirla(partiler, sinir)` — bellekte süzme
 *
 *  ── ⛔ VE KAPASİTE YAZIMLA AYNI KİLİTTE OKUNUR ─────────────────────────
 *  Önizleme `prisma` ile okur (salt okuma), YAZIM ise planı `tx` İÇİNDE
 *  yeniden kurar. `tuketilecekPartiler` varyantı `FOR UPDATE` ile kilitliyor;
 *  plan işlem dışında kurulup içeride yazılsaydı araya giren bir satış aynı
 *  partiyi tüketebilirdi ve kapasite kapısı kâğıt üstünde kalırdı.
 *  _(Anayasa: güvenlik mekanizmaya bağlanır, disipline değil.)_
 *
 *  ── ⚠ GERİ ALMA YOLU: AYNI DİYALOG ─────────────────────────────────────
 *  Saklanan bir liste yok. Çıkış eski partiden ayrılınca o parti kapasitesini
 *  GERİ KAZANIR ve aynı ölçütle yeniden listelenir — yani geri alma yolu
 *  yeniden hesaplanabilir bir ölçüte dayanıyor, ize değil.
 *  ⛔ TEK İSTİSNA VE BİLEREK: eski parti FIFO tarih sınırını aşıyorsa (zaten
 *  hatalı olan bağ buydu) geri dönüş listelenmez. Sınırın arka kapısını
 *  açmak, 29.08.2026'da kapatılan arızayı elle geri getirmek olurdu.
 * ============================================================================
 */

async function redMetinleri(redler: PartiDegisimReddi[]): Promise<string[]> {
  const t = await getTranslations("PartiBagi");
  return redler.map((r) => t(("red" + r) as never));
}

/** Çıkış hareketi + satışı + o satışın FIFO sınırı. */
async function cikisiOku(db: IslemIstemcisi, cikisId: string) {
  const cikis = await db.stockMovement.findUnique({
    where: { id: cikisId },
    select: {
      id: true,
      variantId: true,
      quantityDelta: true,
      unitCostAmount: true,
      sourceMovementId: true,
      saleItem: {
        select: {
          saleId: true,
          sale: {
            select: { soldAt: true, createdAt: true, importKaynak: true },
          },
        },
      },
    },
  });
  /**
   * ⛔ YALNIZ ÇIKIŞ TAŞINIR (`quantityDelta < 0`). Partinin kendisini başka
   * bir partiye bağlamak `sourceMovementId` zincirini bozardı.
   */
  if (cikis === null || cikis.quantityDelta >= 0) return null;
  if (cikis.saleItem === null) return null;

  const zaman = await satisStokZamani(db, cikis.saleItem.sale);
  return { cikis, sinir: zaman.sinir };
}

/**
 * ⭐ ÖNİZLEME VE YAZIM AYNI GÖVDEDEN GEÇER (K127 ile aynı disiplin). İki ayrı
 * yol olsaydı önizlemenin söylediği ile yazımın yaptığı bir gün ayrışırdı —
 * ve kullanıcı onayı GÖRDÜĞÜ şeye verir, yapılana değil.
 */
async function planiKur(
  db: IslemIstemcisi,
  cikisId: string,
  hedefId: string,
  sebep: string,
) {
  const okuma = await cikisiOku(db, cikisId);
  if (okuma === null) return null;
  const { cikis, sinir } = okuma;
  const adet = Math.abs(cikis.quantityDelta);

  /**
   * ⚠ HEDEF DOĞRUDAN KİMLİĞİYLE OKUNUR, SÜZÜLMÜŞ LİSTEDEN SEÇİLMEZ.
   * Listeden seçilseydi her ret tek bir sebebe ("hedef yok") düşerdi ve
   * kullanıcı NEDEN olmadığını öğrenemezdi — oysa sebep kapasite de olabilir,
   * tarih de, varyant da. _(İlke #5: bir şey olmadıysa NEDEN olmadığı yazar.)_
   */
  const hedefHareket =
    hedefId === ""
      ? null
      : await db.stockMovement.findUnique({
          where: { id: hedefId },
          select: {
            id: true,
            variantId: true,
            occurredAt: true,
            quantityDelta: true,
            unitCostAmount: true,
            unitCostCurrency: true,
          },
        });

  /* ⛔ SINIR GEÇİLMEZ — ömür boyu kapasite; gerekçe dosya başlığında (K91). */
  const hepsi = await tuketilecekPartiler(db, cikis.variantId);
  /** Listede yoksa parti ya tükenmiş ya başka varyantın — kalan `0`. */
  const kalan = hepsi.find((p) => p.hareketId === hedefId)?.kalanAdet ?? 0;

  const hedef: HedefParti | null =
    hedefHareket === null || hedefHareket.quantityDelta <= 0
      ? null
      : {
          hareketId: hedefHareket.id,
          variantId: hedefHareket.variantId,
          occurredAt: hedefHareket.occurredAt,
          kalanAdet: kalan,
          birimMaliyet: hedefHareket.unitCostAmount?.toString() ?? null,
          birimMaliyetParaBirimi: hedefHareket.unitCostCurrency,
        };

  const plan = partiDegisimPlani({
    cikis: {
      hareketId: cikis.id,
      adet,
      variantId: cikis.variantId,
      mevcutPartiId: cikis.sourceMovementId,
      mevcutMaliyet: cikis.unitCostAmount?.toString() ?? null,
      saleId: cikis.saleItem?.saleId ?? null,
    },
    hedef,
    sinir,
    sebep,
  });

  return { cikis, hedef, plan };
}

/**
 * DİYALOG AÇILINCA ÇAĞRILIR — hedef listesi.
 *
 * ⚠ SAYFA YÜKÜNDE DEĞİL, İSTEK ÜZERİNE: satış detayında onlarca parti satırı
 * olabilir ve her biri için önceden parti okumak sayfanın maliyetini satır
 * sayısıyla DOĞRUSAL büyütürdü (27.08.2026 dersi).
 */
export async function partiHedefleriniGetir(
  cikisId: string,
): Promise<PartiHedefCevabi> {
  await yetkiIste("stok.duzelt");
  const t = await getTranslations("PartiBagi");

  const okuma = await cikisiOku(prisma, cikisId);
  if (okuma === null) return { durum: "HATA", mesaj: t("cikisBulunamadi") };

  const { cikis, sinir } = okuma;
  const adet = Math.abs(cikis.quantityDelta);

  /* ⛔ SINIR GEÇİLMEZ — ömür boyu kapasite (K91). */
  const hepsi = await tuketilecekPartiler(prisma, cikis.variantId);
  const uygun = partileriSinirla(hepsi, sinir).uygun;

  /**
   * ⚠ LİSTE SÜZGECİ İLE YAZMA KAPISI AYNI GÖVDEDEN GEÇER. İki ayrı ölçüt
   * olsaydı biri ötekinin yazdığını göremezdi; kullanıcı yazılamayacak bir
   * seçenek görürdü ya da yazılabilecek bir seçeneği hiç görmezdi.
   */
  const hedefler = degistirilebilirHedefler({
    cikis: {
      hareketId: cikis.id,
      adet,
      variantId: cikis.variantId,
      mevcutPartiId: cikis.sourceMovementId,
      mevcutMaliyet: null,
      saleId: null,
    },
    partiler: uygun.map((p) => ({
      hareketId: p.hareketId,
      variantId: cikis.variantId,
      occurredAt: p.occurredAt,
      kalanAdet: p.kalanAdet,
      birimMaliyet: p.birimMaliyet,
      birimMaliyetParaBirimi: p.birimMaliyetParaBirimi,
    })),
    sinir,
  });

  /** Alım kodları — parti kimliği kullanıcıya hiçbir şey anlatmaz (İlke #3). */
  const alimlar = await prisma.stockMovement.findMany({
    where: { id: { in: hedefler.map((h) => h.hareketId) } },
    select: {
      id: true,
      purchaseItem: { select: { purchase: { select: { code: true } } } },
    },
  });
  const kodlar = new Map(
    alimlar.map((a) => [a.id, a.purchaseItem?.purchase.code ?? null]),
  );

  return {
    durum: "TAMAM",
    mevcutPartiId: cikis.sourceMovementId,
    hedefler: hedefler.map((h) => ({
      hareketId: h.hareketId,
      girisTarihi: h.occurredAt.toISOString(),
      kalanAdet: h.kalanAdet,
      birimMaliyet: h.birimMaliyet,
      paraBirimi: h.birimMaliyetParaBirimi,
      alimKodu: kodlar.get(h.hareketId) ?? null,
    })),
  };
}

/** ÖNİZLEME — hiçbir şey yazmaz, ne olacağını söyler. */
export async function partiBagiOnizle(
  _onceki: PartiBagiDurumu,
  formData: FormData,
): Promise<PartiBagiDurumu> {
  await yetkiIste("stok.duzelt");
  const t = await getTranslations("PartiBagi");

  const kurulum = await planiKur(
    prisma,
    String(formData.get("cikisId") ?? ""),
    String(formData.get("hedefId") ?? ""),
    String(formData.get("sebep") ?? ""),
  );
  if (kurulum === null) return { hatalar: [t("cikisBulunamadi")] };
  if (!kurulum.plan.yazilabilir) {
    return { hatalar: await redMetinleri(kurulum.plan.redler) };
  }

  const { plan } = kurulum;
  return {
    onizleme: {
      eskiParti: plan.eskiPartiId,
      yeniParti: plan.yeniPartiId ?? "",
      eskiMaliyet: plan.eskiMaliyet,
      yeniMaliyet: plan.yeniMaliyet,
      adet: plan.adet,
      fark: plan.maliyetFarkiToplam,
      maliyetBilinmezOlacak: plan.maliyetBilinmezOlacak,
    },
  };
}

/** YAZIM — önizlemeyi ONAYLAYAN çağrı. */
export async function partiBaginiDegistir(
  _onceki: PartiBagiDurumu,
  formData: FormData,
): Promise<PartiBagiDurumu> {
  await yetkiIste("stok.duzelt");
  const t = await getTranslations("PartiBagi");

  /**
   * ⛔ ONAY KUTUSU AÇIK OLMADAN YAZILMAZ — "sorulsun" demek cevabı BEKLEMEK
   * demektir. Satışın NET'i değişecek; bu sürpriz olmamalı.
   * _(Anayasa: uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir.)_
   */
  if (String(formData.get("onay") ?? "") !== "evet") {
    return { hatalar: [t("onayGerekli")] };
  }

  const cikisId = String(formData.get("cikisId") ?? "");
  const hedefId = String(formData.get("hedefId") ?? "");
  const sebep = String(formData.get("sebep") ?? "").trim();

  let sonuc:
    | { durum: "YAZILDI"; plan: NonNullable<Awaited<ReturnType<typeof planiKur>>>["plan"] }
    | { durum: "RED"; hatalar: string[] };

  try {
    /**
     * ⛔ TAMAMI-YA-HİÇBİRİ VE PLAN İÇERİDE KURULUR. Kapasite kapısı aynı
     * kilitte okunmazsa araya giren bir satış hedefi tüketebilir ve kapı
     * kâğıt üstünde kalır. Tavan açıkça ayarlı (varsayılan 5000 ms bir
     * yazımı 01.09'da yarıda kesmişti).
     */
    sonuc = await prisma.$transaction(
      async (tx) => {
        const kurulum = await planiKur(tx, cikisId, hedefId, sebep);
        if (kurulum === null) {
          return { durum: "RED" as const, hatalar: [t("cikisBulunamadi")] };
        }
        const { cikis, hedef, plan } = kurulum;
        if (!plan.yazilabilir || hedef === null) {
          return { durum: "RED" as const, hatalar: await redMetinleri(plan.redler) };
        }

        await tx.stockMovement.update({
          where: { id: cikis.id },
          data: {
            sourceMovementId: hedef.hareketId,
            /**
             * ⛔ MALİYET DAMGASI YENİ PARTİDEN YENİDEN ALINIR. Alınmazsa
             * çıkış yeni partiye bağlı görünür ama ESKİ maliyeti taşır —
             * ekran doğru, NET yanlış. _(19.08.2026 dersi: düzeltme TÜM
             * okuyuculara ulaşmak zorunda.)_
             *
             * ⚠ `null` da YAZILIR: hedefin maliyeti yoksa damga SİLİNİR ve
             * kâr `NO_COST`a düşer. Eski damgayı bırakmak, bilinmeyen bir
             * maliyeti bilinmiş gibi göstermek olurdu.
             */
            unitCostAmount: hedef.birimMaliyet,
            unitCostCurrency: hedef.birimMaliyetParaBirimi,
          },
        });

        /**
         * ⛔ İZ: ESKİ VE YENİ DEĞER BİRLİKTE, SEBEBİYLE. Üç ay sonra "bu bağ
         * niye değişmiş" sorusunun cevabı burada.
         * ⚠ Geri alma buna BAĞLI DEĞİL — eski parti kapasitesini geri kazanır
         * ve aynı ölçütle yeniden listelenir. İz TEŞHİS içindir.
         * _(Anayasa: geri alma yolu saklanan listeye değil yeniden
         * hesaplanabilir ölçüte dayanır.)_
         */
        await izYaz(
          {
            action: PARTI_BAGI_DEGISIM_EYLEMI,
            targetType: "StockMovement",
            targetId: cikis.id,
            detail: JSON.stringify({
              sebep,
              variantId: cikis.variantId,
              adet: plan.adet,
              eskiPartiId: plan.eskiPartiId,
              yeniPartiId: plan.yeniPartiId,
              eskiMaliyet: plan.eskiMaliyet,
              yeniMaliyet: plan.yeniMaliyet,
              maliyetFarkiToplam: plan.maliyetFarkiToplam,
              maliyetBilinmezOlacak: plan.maliyetBilinmezOlacak,
              hedefKalanAdet: plan.hedefKalanAdet,
              saleId: cikis.saleItem?.saleId ?? null,
            }),
          },
          tx,
        );

        return { durum: "YAZILDI" as const, plan };
      },
      { timeout: 120_000 },
    );
  } catch (e) {
    /**
     * ⛔ HATA TAM LOGLANIR, KULLANICIYA KOD DÖNER. Ham mesajı ekrana basmak
     * hem bir şey anlatmaz hem iç ayrıntı sızdırır.
     * _(Anayasa: yakalanmamış hata, yutulmuş hatanın kardeşidir.)_
     */
    console.error(
      "[parti-bagi] yazim dustu:",
      e instanceof Error ? (e.stack ?? e.message) : String(e),
    );
    return { hatalar: [t("yazimDustu")] };
  }

  if (sonuc.durum === "RED") return { hatalar: sonuc.hatalar };
  const plan = sonuc.plan;

  /**
   * ⚠ KÂR TAZELEME İŞLEMİN DIŞINDA — kendi işlemleri var. Yarım kalırsa
   * zararsız: `satisKarTazele` tekrar koşulabilir ve aynı sonucu verir.
   * Tazelenemeyen satış SÖYLENİR, sessizce yutulmaz.
   */
  let dusen = 0;
  for (const saleId of plan.tazelenecekSatislar) {
    const oldu = await satisKarTazele(saleId);
    if (!oldu) dusen += 1;
    revalidatePath("/satislar/" + saleId);
  }

  revalidatePath("/satislar");
  revalidatePath("/stok");
  revalidatePath("/");

  return {
    basari:
      t("degistirildi", {
        eski: plan.eskiMaliyet ?? "—",
        yeni: plan.yeniMaliyet ?? "—",
      }) + (dusen > 0 ? " · " + t("tazelenemeyen", { sayi: dusen }) : ""),
  };
}
