"use server";

import { yetkiIste } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { kdvOraniniCoz } from "@/lib/kdv";
import {
  satisTarihiTarifesi,
  simulasyonZeminleri,
  type SimulasyonZemini,
} from "@/lib/fiyatlama/kart-verisi";
import { acikPartilerToplu, gunSonu, varyantStogu } from "@/lib/stok";

/**
 * ============================================================================
 *  SATIŞ FORMU — KALEM VE KARGO BİLGİLERİ
 * ----------------------------------------------------------------------------
 *  Form kalem eklerken tek çağrıda ihtiyacı olan her şeyi alır: stok, desi,
 *  KDV oranı, o kanaldaki komisyon oranı. Ayrı ayrı istekler atmak hem yavaş
 *  hem de tutarsız anlık görüntü riski taşırdı.
 *
 *  Bunlar ÖNERİDİR. Hepsi formda değiştirilebilir ve satışa kaydedilen değer
 *  formdaki son değerdir (komisyon oranları haftalık değişiyor, fiili tartım
 *  desiden farklı çıkabiliyor).
 * ============================================================================
 */

/**
 * Formda gösterilen parti seçeneği — tüketilebilir bir lot.
 *
 * ⚠ MALİYET DİZE OLARAK TAŞINIR: `Decimal` float'a çevrilirse kuruş kuyruğu
 * doğar ve ekranda gösterilen maliyet defterdekinden ayrışır.
 */
export type PartiSecenegi = {
  hareketId: string;
  girisTarihi: Date;
  kalanAdet: number;
  birimMaliyet: string | null;
  paraBirimi: "TRY" | "EUR" | null;
};

export type KalemBilgisi = {
  stok: number;
  /** Ürün seviyesindeki desi; yoksa null. */
  desi: number | null;
  /** Çözülen KDV oranı (%) ve kaynağı. */
  kdvOrani: number;
  kdvKaynagi: "ISTISNA" | "KATEGORI" | "VARSAYILAN";
  kategoriAdi: string | null;
  /** Bu kanal hesabındaki komisyon oranı (%). Tanımlı değilse null. */
  komisyonOrani: number | null;

  /**
   * ── ZARARINA SATIŞ UYARISININ ZEMİNİ (K1, aday 1) ────────────────────
   *  ⚠ FORM KENDİ KÂRINI HESAPLAMAZ. Bunlar K5 motorunun (`simulasyonKur`)
   *  girdisidir; form fiyatı yazdıkça motoru çağırır. Formda ikinci bir
   *  NET hesabı yazsaydık, aynı satış formda bir, kaydedildikten sonra
   *  başka türlü görünebilirdi.
   *
   *  Maliyet AÇIK PARTİLERİN ağırlıklı ortalaması — FIFO'da hangi partinin
   *  düşeceği satış anında belli olur, ama form kaydetmeden önce konuşuyor.
   *  Bu bir TAHMİNDİR ve uyarı metni bunu söyler.
   */
  birimMaliyet: number | null;
  /**
   * SPESİFİK BELİRLEME (K110) — bu varyantın SEÇİLEBİLİR partileri.
   *
   * ⚠ SIRA FIFO SIRASIDIR ve ilki varsayılandır: seçim yapılmazsa dağıtım
   * zaten baştan başlar. Liste boşsa (parti yok) ekran seçici çizmez.
   */
  partiler: PartiSecenegi[];
  /** Yalnız SEÇİLİ kanal hesabının zemini; ötekiler formda gereksiz. */
  zemin: SimulasyonZemini | null;
  /**
   * ⚠ ŞÜPHELİ DÜŞÜK TABANI — o kanal hesabının EN YENİ tarifesindeki en
   * düşük oran. Sabit eşik yerine VERİDEN gelir; tarife yüklendikçe
   * kendiliğinden tazelenir ve "yanlış popülasyondan ölçülmüş eşik"
   * hatası (20.08.2026) bir daha doğmaz.
   */
  tarifeTabani: number | null;
};

export async function kalemBilgisiGetir(
  variantId: string,
  channelAccountId: string,
  /**
   * ⚠ SATIŞ TARİHİ — dilim ve taban O GÜNÜN penceresinden çözülür.
   *
   * Kullanıcı bildirdi (20.08.2026): farklı dönemlerde **%1'lik
   * kampanyalar** da olmuş. En yeni pencereye bakan bir kontrol, temmuz
   * satışına girilen %1'i ağustos tabanıyla (%2,7) kıyaslar ve DOĞRU bir
   * oranı şüpheli ilan ederdi.
   *
   * Ölçüm: 54 satışın yalnız 24'ü yüklü bir pencereye düşüyor.
   */
  satisTarihi?: Date,
): Promise<KalemBilgisi> {
  await yetkiIste("satis.yaz");

  const [varyant, stok] = await Promise.all([
    prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        product: {
          select: {
            desi: true,
            vatRateOverride: true,
            category: { select: { name: true, vatRate: true } },
          },
        },
      },
    }),
    varyantStogu(variantId),
  ]);

  const kdv = kdvOraniniCoz({
    vatRateOverride: varyant?.product.vatRateOverride,
    category: varyant?.product.category ?? null,
  });

  let komisyonOrani: number | null = null;
  if (channelAccountId) {
    const kanalSku = await prisma.channelSku.findUnique({
      where: { channelAccountId_variantId: { channelAccountId, variantId } },
      select: { commissionRate: true },
    });
    if (kanalSku?.commissionRate) {
      komisyonOrani = Number(kanalSku.commissionRate.toString());
    }
  }

  /**
   * MALİYET AÇIK PARTİLERDEN — ortak yardımcıdan, ikinci bir FIFO tanımı
   * doğmasın. Maliyeti bilinmeyen parti varsa ortalama null döner:
   * bilinmeyeni sıfır saymak "bedava mal" demek olurdu.
   */
  /**
   * ⚠ SINIR SATIŞ GÜNÜNÜN SONU — YAZMA YOLUYLA AYNI (K110, 31.08.2026).
   *
   * Eskiden burada sınır YOKTU ve bugüne kadar zararsızdı: liste yalnız
   * ortalama maliyet TAHMİNİ için kullanılıyordu. Parti SEÇİMİ eklenince
   * zararsız olmaktan çıktı — form, geri tarihli bir satışa satış gününden
   * SONRA gelmiş bir partiyi seçenek olarak sunardı; `satis.ts` o partiyi
   * `gunSonu(soldAt)` sınırı yüzünden listesinde bulamaz ve seçim SESSİZCE
   * FIFO'ya düşerdi. Kullanıcı seçtiğini sanır, defter başkasını yazardı.
   *
   * ⭐ VE TAHMİN DE DÜZELİYOR: ortalama artık gerçekten tüketilebilecek
   * partilerden hesaplanıyor. Bugünün satışında iki liste AYNI; fark yalnız
   * geri tarihli satışta doğuyor ve orada yeni davranış doğru olandır.
   */
  const partiler =
    (
      await acikPartilerToplu(
        prisma,
        [variantId],
        satisTarihi ? gunSonu(satisTarihi) : undefined,
      )
    ).get(variantId) ?? [];
  let adet = 0;
  let tutar = 0;
  let eksik = partiler.length === 0;
  for (const pa of partiler) {
    if (pa.birimMaliyet === null) { eksik = true; break; }
    adet += pa.kalanAdet;
    tutar += Number(pa.birimMaliyet) * pa.kalanAdet;
  }
  const birimMaliyet = eksik || adet <= 0 ? null : tutar / adet;

  /**
   * ⚠ SATIŞ TARİHİNİN PENCERESİNDEN. Kapsayan pencere yoksa ikisi de
   * `null` döner ve dilim/düşüklük hükmü VERİLMEZ — o dönemin tarifesi
   * elimizde değilse, oran hakkında iddia kuramayız.
   */
  const gunun =
    channelAccountId && satisTarihi
      ? await satisTarihiTarifesi(variantId, channelAccountId, satisTarihi)
      : { dilimler: null, tarifeTabani: null };
  const tarifeTabani = gunun.tarifeTabani;

  const zeminler = channelAccountId
    ? await simulasyonZeminleri(variantId, new Date())
    : [];
  const bulunan =
    zeminler.find((z) => z.channelAccountId === channelAccountId) ?? null;
  /**
   * ⚠ DİLİMLER GÜNÜN PENCERESİNDEN EZİLİR. Zeminin geri kalanı (kesinti
   * kuralları, komisyon KDV'si) kanal ayarıdır ve tarihten bağımsızdır;
   * dilimler ise o haftanın tarifesidir.
   */
  const zemin: SimulasyonZemini | null =
    bulunan === null
      ? null
      : { ...bulunan, dilimler: gunun.dilimler ?? bulunan.dilimler };

  /**
   * TARİFE TABANI — o hesabın en yeni tarifesindeki en düşük oran.
   * Tarife yoksa null döner ve düşüklük hükmü hiç verilmez.
   */

  return {
    stok,
    desi: varyant?.product.desi
      ? Number(varyant.product.desi.toString())
      : null,
    kdvOrani: kdv.oran,
    kdvKaynagi: kdv.kaynak,
    kategoriAdi: kdv.kategoriAdi,
    komisyonOrani,
    /**
     * ⚠ HAM `Parti` DEĞİL, DAR BİR GÖRÜNÜM. Parti nesnesi `girenAdet` ve
     * `locationId` de taşıyor; formun onlara işi yok ve istemciye gereksiz
     * alan göndermek, yarın biri onlara bakıp iş kurduğunda yanlış bir
     * sözleşme doğururdu.
     */
    partiler: partiler.map((pa) => ({
      hareketId: pa.hareketId,
      girisTarihi: pa.occurredAt,
      kalanAdet: pa.kalanAdet,
      birimMaliyet: pa.birimMaliyet,
      paraBirimi: pa.birimMaliyetParaBirimi,
    })),
    birimMaliyet,
    zemin,
    tarifeTabani,
  };
}

// ---------------------------------------------------------------------------
//  KARGO SEÇENEKLERİ
// ---------------------------------------------------------------------------

export type KargoSecenegi = {
  carrierId: string;
  ad: string;
  /** KDV HARİÇ tarife tutarı. Taşımıyorsa null. */
  tarife: number | null;
  /** KDV DAHİL tutar — ekranda bu gösterilir. */
  kdvDahil: number | null;
  /** Bu desiyi taşıyor mu? Taşımıyorsa listede pasif görünür. */
  tasiyorMu: boolean;
};

/**
 * Verilen desi için kanalın tüm kargo firmalarını ücretiyle döndürür.
 * EN UCUZ ÖNCE sıralanır; taşımayan firmalar en sonda kalır.
 *
 * Aralık dışı firma listeden ÇIKARILMAZ — pasif olarak gösterilir ki
 * kullanıcı "neden yok" diye aramasın (Kullanıcı Kolaylığı #5).
 */
export async function kargoSecenekleriGetir(
  channelAccountId: string,
  desi: number,
): Promise<KargoSecenegi[]> {
  await yetkiIste("satis.yaz");

  if (!channelAccountId) return [];

  const hesap = await prisma.channelAccount.findUnique({
    where: { id: channelAccountId },
    select: { channelId: true },
  });
  if (!hesap) return [];

  // Kargo firmaları desiyi YUKARI yuvarlar.
  const tamDesi = Math.max(0, Math.ceil(desi));

  const [firmalar, tarifeler] = await Promise.all([
    prisma.cargoCarrier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.cargoTariff.findMany({
      where: { channelId: hesap.channelId, desi: tamDesi },
      select: { carrierId: true, amount: true },
    }),
  ]);

  const tarifeHaritasi = new Map(
    tarifeler.map((t) => [t.carrierId, Number(t.amount.toString())]),
  );

  const secenekler: KargoSecenegi[] = firmalar.map((f) => {
    const tarife = tarifeHaritasi.get(f.id) ?? null;
    return {
      carrierId: f.id,
      ad: f.name,
      tarife,
      kdvDahil: tarife === null ? null : tarife * 1.2,
      tasiyorMu: tarife !== null,
    };
  });

  // Taşıyanlar ucuzdan pahalıya; taşımayanlar en sonda, alfabetik.
  return secenekler.sort((a, b) => {
    if (a.tasiyorMu !== b.tasiyorMu) return a.tasiyorMu ? -1 : 1;
    if (!a.tasiyorMu) return a.ad.localeCompare(b.ad, "tr");
    return (a.tarife ?? 0) - (b.tarife ?? 0);
  });
}
