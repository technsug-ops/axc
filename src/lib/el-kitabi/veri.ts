import { prisma } from "@/lib/prisma";
import type { FeeScope } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  EL KİTABI — CANLI VERİ (YALNIZ PAZARYERİ KURALLARI)
 * ----------------------------------------------------------------------------
 *  ⚠ EL KİTABI FİRMAYA ÖZEL BİR BELGE DEĞİLDİR — kullanıcı düzeltmesi
 *  22.08.2026: _"el kitabı bu firmaya özel olmuş, bu şekilde uygun değil.
 *  Şahsileştirmeden yapılmalı; firmanın kanal hesapları var, raf sistemiyle
 *  ilgili bilgiler var."_
 *
 *  Haklıydı ve bu doğrudan anayasaya aykırıydı: _"firma adları yalnızca VERİ
 *  olabilir, YAPI olamaz."_ Belge şunları basıyordu ve hepsi ÇIKARILDI:
 *
 *    · kanal hesabı adları        → mağaza ve KİŞİ adları
 *    · raf kodları ve adları      → deponun fiziksel yerleşimi
 *    · kapaktaki sayımlar         → "N kullanıcı · N ürün · N satış"
 *    · KDV / gider kategorileri   → kurulumun kendi tercihleri
 *    · kargo firmaları            → kurulumun kendi tercihleri
 *    · kanal SKU özeti            → hangi mağazada kaç ürün
 *
 *  ⚠ ESKİ GEREKÇE SİLİNMİYOR. Bu veriler bilerek konmuştu: _"elle yazılmış
 *  bir belge birkaç ay içinde gerçekten sapar; sapmış bir kılavuz olmayan
 *  kılavuzdan daha kötüdür."_ Kaygı GEÇERLİ ama KAPSAMI yanlıştı: sapma
 *  riski KURALLAR içindir (bir kesinti oranı değişirse belge yanılır),
 *  KİMLİK için değil — bir rafın adı belgeyi yanlış yapmaz, yalnız
 *  belgeyi o kuruluma hapseder.
 *
 *  Çare kimliği yazmak değil, YERİ göstermek: kılavuz artık _"kendi
 *  raflarını Ayarlar → Raf Konumları'nda görürsün"_ diyor. Ekran zaten var
 *  ve her zaman günceldir; kopyası bayatlar, kendisi bayatlamaz.
 *
 *  ── GERİDE NE KALDI ─────────────────────────────────────────────────────
 *  Yalnız KANAL bazlı kurallar: komisyon KDV'si, hizmet bedeli, ceza
 *  tarifesi. Bunlar PAZARYERİ bilgisidir (Trendyol · Hepsiburada), firma
 *  bilgisi değil — hiçbir mağaza ya da kişi adı taşımazlar.
 * ============================================================================
 */

export type ElKitabiVerisi = {
  /** Kanal başına kesinti kuralları — PAZARYERİ bazında, hesap bazında DEĞİL. */
  kanalKesintileri: {
    kanal: string;
    kod: string;
    /**
     * ⚠ ŞEMANIN ENUM'UNDAN — elle liste tutulmaz. Elle yazılan liste,
     * `PER_PACKAGE` eklendiğinde (20.08.2026) derlemeyi kırdı ve iyi ki
     * kırdı; sessizce eskiseydi el kitabı yeni kapsamı hiç göstermezdi.
     */
    kapsam: FeeScope;
    oran: string | null;
    tutar: string | null;
    paraBirimi: string | null;
  }[];
  cezaTarifeleri: {
    kanal: string;
    kademeler: { ustSinir: string; tutar: string }[];
  }[];
};

const sayi = (d: { toString(): string } | null) =>
  d === null ? null : String(Number(d.toString()));

export async function elKitabiVerisi(): Promise<ElKitabiVerisi> {
  /**
   * ⚠ YALNIZ İKİ SORGU KALDI. Önce on beş sorgu koşuyordu ve on üçü
   * kurulumun KİMLİĞİNİ okuyordu (raflar, hesaplar, kategoriler, sayımlar).
   * Okunmayan veri okunmaz: alan tipten kalkınca sorgusu da kalkar, yoksa
   * bir gün biri "zaten çekiliyor" deyip yeniden basar.
   */
  const [kesintiler, cezalar] = await Promise.all([
    prisma.channelFee.findMany({
      where: { isActive: true },
      include: { channel: { select: { name: true } } },
      orderBy: [{ channelId: "asc" }, { code: "asc" }],
    }),
    prisma.penaltyTariff.findMany({
      include: { channel: { select: { name: true } } },
      orderBy: [{ channelId: "asc" }, { orderAmountUpTo: "asc" }],
    }),
  ]);

  /** Ceza kademelerini kanal başına grupla. */
  const cezaHaritasi = new Map<string, { ustSinir: string; tutar: string }[]>();
  for (const c of cezalar) {
    const liste = cezaHaritasi.get(c.channel.name) ?? [];
    liste.push({
      ustSinir: sayi(c.orderAmountUpTo) ?? "",
      tutar: sayi(c.amount) ?? "",
    });
    cezaHaritasi.set(c.channel.name, liste);
  }

  return {
    kanalKesintileri: kesintiler.map((k) => ({
      kanal: k.channel.name,
      kod: k.code,
      kapsam: k.scope,
      oran: sayi(k.rate),
      tutar: sayi(k.amount),
      paraBirimi: k.currency,
    })),
    cezaTarifeleri: [...cezaHaritasi.entries()].map(([kanal, kademeler]) => ({
      kanal,
      kademeler,
    })),
  };
}
