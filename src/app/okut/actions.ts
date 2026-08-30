"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { bulunanAlan, kaydiOku, kaydiYaz } from "@/lib/okuma/kayit";
import {
  PAKETLEME_EYLEMLERI,
  PAKETLENDI_EYLEMI,
  PAKETLEME_GERI_ALINDI_EYLEMI,
  hazirlananSiparisler,
} from "@/lib/okuma/paketleme";
import {
  eslestirilebilirMi,
  eylemKovasi,
  ilkKova,
  kovaEylemi,
  type OkumaKovasi,
} from "@/lib/okuma/kova";
import {
  kodKosulu,
  satisKodKosulu,
  type KodRolu,
} from "@/lib/varyant-arama-kurali";
import {
  VARYANT_SECIMI,
  varyantiOzetle,
  type VaryantSonucu,
} from "@/lib/varyant-ozet";
import { oturumdakiKullanici } from "@/lib/oturum";
import { yetkiIste } from "@/lib/yetki";
import { KARGO_BEKLEYEN } from "@/lib/kargo-bekleyen";

/**
 * ============================================================================
 *  DEPO OKUMASI — SUNUCU EYLEMLERİ (K34a)
 * ----------------------------------------------------------------------------
 *  ⚠ BURADA KAPI YOK. Hiçbir eylem "izin vermiyorum" demez, hiçbir sonuç
 *  bir işi durdurmaz. Ekran yalnız BİLDİĞİNİ söyler ve okumayı KAYDEDER.
 *  Kontrol katmanı (K34) ağustos defteri kapanana kadar açılmıyor.
 * ============================================================================
 */

export type AcikSiparis = {
  /** Satış kimliği — "Paketlendi" izi BUNA bağlanır, okumaya değil. */
  saleId: string;
  /** Sipariş numarası — pazaryerinin kodu. Girilmemiş olabilir. */
  kod: string | null;
  adet: number;
  satisTarihi: Date;
  kanal: string;
  /**
   * `AuditLog` izinden TÜRETİLİR — yeni durum sütunu açılmadı.
   * En yeni iz `PAKETLENDI` ise doğru, `PAKETLEME_GERI_ALINDI` ise yanlış.
   */
  hazirlaniyor: boolean;
};

/**
 * RAF OKUMASI (K50 ⑤) — "kayıt", envanter DEĞİL.
 *
 * ⚠ ÖNCE "ADET İDDİASI YOK" YAZIYORDU — KARAR ÇEVRİLDİ 25.08.2026, VE ESKİ
 * GEREKÇE SİLİNMİYOR. Şöyle savunulmuştu: _"çıkışlar rafı boşaltmıyor, adet
 * defteri değil; 'envanter' desek takip etmediğimiz şey hakkında iddia
 * kurmuş oluruz."_
 *
 * Kullanıcı vakası bu savunmayı çürüttü: _"aynı üründen kaç tane olursa
 * olsun tek kayıt var ama yanında adet yazmıyor; bu ürünün stoğu dün bitti."_
 * Adetsiz liste, **stoğu sıfırlanmış ürünü hâlâ rafta duruyormuş gibi
 * gösteriyordu** — yani sessizce YANLIŞ bilgi veriyordu.
 *
 * ⚠ VE ADET GÖSTERMEK UYDURMA DEĞİL, ŞEMANIN LİSANS VERDİĞİ BİR TÜRETME:
 * şema _"varyant başına TEK konum — bilerek basit tutuldu"_ diyor. Bir
 * varyantın defterdeki stoğunun tamamı o rafta sayılır. Rafa özel bir sayaç
 * uydurulmuyor; ledger okunuyor.
 *
 * ⚠ AMA HÂLÂ "ENVANTER" DEĞİL: bu bir LEDGER sayısıdır, fiziksel sayım
 * değil. Biri ürünü kaydetmeden başka rafa taşıdıysa sistem bilemez — ve
 * ekran bunu da söylüyor.
 */
export type RafKaydi = {
  kod: string;
  ad: string | null;
  aktif: boolean;
  urunler: {
    sku: string;
    companySku: string;
    barcode: string | null;
    urunAdi: string;
    varyantAdi: string | null;
    /**
     * Defterdeki stok (`quantityDelta` toplamı). Varyant başına TEK konum
     * olduğu için bu, o rafın stoğudur. `0` da GÖSTERİLİR: "bu rafa kayıtlı
     * ama elde kalmamış" bir bilgidir.
     */
    adet: number;
  }[];
  /**
   * Bu rafa KAYITLI ama stoğu bitmiş ürün sayısı. Listede GÖRÜNMEZLER
   * (rafta fiilen yoklar) ama sayıları yazılır — bağ duruyor ve yeni
   * stok gelince buraya dönecekler. Sessizce gizlemek, var olan bir
   * kaydı görünmez yapmak olurdu.
   */
  stoksuz: number;
};

export type OkumaSonucu = {
  /** `AuditLog` satırının kimliği — eşleştirme bu ize bağlanır. */
  izId: string | null;
  kod: string;
  kova: OkumaKovasi;
  alan: KodRolu | null;
  urun: VaryantSonucu | null;
  siparisler: AcikSiparis[];
  /** Dolu ise okutulan kod bir RAF kodudur; ürün/sipariş yerine bu çizilir. */
  raf?: RafKaydi;
};


/**
 * BARKODU OKUT — ekranın tek girişi.
 *
 * ⚠ ARAMA KURALI BURADA YAZILMAZ, ORTAK KAYNAKTAN GELİR (`kodKosulu`):
 * barkod · Firma SKU · sistem SKU · Kanal SKU. Mimar üç alan istemişti;
 * ortak kural DÖRDÜNÜ birden sorar ve fazlası bedava — Soundcore vakası
 * (rapordaki barkod sistemdekinden farklıydı) tam da eksik alan sorgulamanın
 * ürünüydü. Buraya ayrı bir liste yazsaydık, kural bir gün değiştiğinde bu
 * ekran sessizce eski kalırdı.
 */
export async function barkoduOkut(kod: string): Promise<OkumaSonucu | null> {
  await yetkiIste("stok.gor");

  const temiz = kod.trim();
  if (!temiz) return null;

  const varyant = await prisma.productVariant.findFirst({
    where: { isActive: true, OR: kodKosulu(temiz) },
    select: VARYANT_SECIMI,
  });

  /**
   * AÇIK SİPARİŞLER — yalnız varyant bulunduysa sorulur. Bulunamamış bir
   * kod için "siparişi var mı" sorusunun cevabı YOKTUR; boş liste dönmek
   * "siparişi yok" demek olurdu ve bu, bilmediğimiz bir şey hakkında iddia
   * kurmaktır (anayasa: _"sistem, defterinde takip etmediği şey hakkında
   * iddia kurmaz"_).
   */
  /**
   * ════════════════════════════════════════════════════════════════════════
   *  SATIŞ KİMLİĞİYLE OKUTMA — GÖNDERİ NUMARASI (K41①, 24.08.2026)
   * ------------------------------------------------------------------------
   *  Varyant bulunamadıysa kod bir SATIŞ kimliği olabilir: gönderi (takip)
   *  numarası ya da sipariş numarası. Depoda elindeki kâğıtta hangisi
   *  yazıyorsa onu okutur.
   *
   *  ⚠ YALNIZ VARYANT BULUNAMADIYSA SORULUR. Önce varyant denenir çünkü
   *  günlük iş ürün okutmaktır; her okumada iki sorgu atmak, %99'unda
   *  gereksiz bir gidiş-dönüş olurdu.
   *
   *  ⚠ SONUÇ TEKİLDİR — `shipmentCode` ve `code` ikisi de `@unique`.
   *  Bu yüzden "Paketlendi" düğmesi elle sipariş seçimi olmadan doğrudan
   *  o satıra bağlanabiliyor.
   *
   *  ⚠ İPTAL EDİLMİŞ SATIŞ AÇIK SİPARİŞ SAYILMAZ — süzgeç aşağıdaki
   *  kalem sorgusuyla AYNI: `shippedAt: null, iptalTarihi: null`.
   * ════════════════════════════════════════════════════════════════════════
   */
  const satisKaydi = varyant
    ? null
    : await prisma.sale.findFirst({
        where: {
          OR: satisKodKosulu(temiz),
          /* ⛔ TEK GÖVDE (K60): içe aktarılmış sipariş AÇIK SİPARİŞ değildir —
             kargo tarihi BİLİNMİYOR, "çıkmadı" demiyor. Elle yazılsaydı okuma
             ekranı aylar önce kapanmış siparişlerde eşleşme gösterirdi. */
          ...KARGO_BEKLEYEN,
          iptalTarihi: null,
        },
        select: {
          id: true,
          code: true,
          shipmentCode: true,
          soldAt: true,
          items: { select: { quantity: true } },
          channelAccount: {
            select: { name: true, channel: { select: { name: true } } },
          },
        },
      });

  const kalemler = varyant
    ? await prisma.saleItem.findMany({
        where: {
          variantId: varyant.id,
          /**
           * ⚠ SÜZGEÇ ÇAĞRI YERİNDE YAZILI — SABİTE SAKLANMIYOR.
           *
           * İlk hâlinde bu iki alan `ACIK_SIPARIS_KOSULU` adlı bir sabitte
           * duruyordu ve `iptal:bekci` kırmızı yandı: iptalli satışın ciroya
           * sızmasını arayan bekçi, sorgunun yanında `iptalTarihi: null`
           * GÖREMİYORDU. Süzgeç doğruydu ama görünmüyordu — ve bir bekçinin
           * göremediği süzgeç, yarın silindiğinde de görünmezdi.
           *
           * ⚠ VE BU GEREKÇE 27.08.2026'DA DARALTILDI, KALDIRILMADI:
           * `iptalTarihi: null` HÂLÂ ÇAĞRI YERİNDE YAZILI — `iptal:bekci`
           * onu görmeye devam ediyor. Sabite taşınan yalnız KARGO koşulu
           * (`KARGO_BEKLEYEN`) ve onun kendi bekçisi var
           * (`kargo-bekleyen:dogrula`). Yani her koşul, kendisini ölçen
           * bekçinin GÖREBİLECEĞİ yerde duruyor.
           *
           * `iptalTarihi: null` = iptal edilmiş satış açık sipariş sayılmaz.
           */
          sale: { ...KARGO_BEKLEYEN, iptalTarihi: null },
        },
        select: {
          quantity: true,
          sale: {
            select: {
              id: true,
              code: true,
              soldAt: true,
              channelAccount: {
                select: { name: true, channel: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { sale: { soldAt: "desc" } },
        take: 20,
      })
    : [];

  /**
   * PAKETLEME İZLERİ TEK SORGUDA. Satış başına ayrı sorgu atmak, üç açık
   * siparişi olan bir üründe üç gidiş-dönüş demekti.
   */
  const hazirlananlar = kalemler.length
    ? hazirlananSiparisler(
        await prisma.auditLog.findMany({
          where: {
            action: { in: [...PAKETLEME_EYLEMLERI] },
            targetType: "Sale",
            targetId: { in: kalemler.map((k) => k.sale.id) },
          },
          select: { action: true, createdAt: true, targetId: true },
        }),
      )
    : new Set<string>();

  /**
   * ⚠ SATIŞTAN GELEN SİPARİŞ DE AYNI LİSTEYE GİRER. Ayrı bir yol yazsaydık
   * "Paketlendi" düğmesi iki farklı yerde iki farklı davranış kazanırdı.
   */
  const satistanGelen: AcikSiparis[] = satisKaydi
    ? [
        {
          saleId: satisKaydi.id,
          kod: satisKaydi.code,
          adet: satisKaydi.items.reduce((t, k) => t + k.quantity, 0),
          satisTarihi: satisKaydi.soldAt,
          kanal: `${satisKaydi.channelAccount.channel.name} — ${satisKaydi.channelAccount.name}`,
          hazirlaniyor: hazirlananSiparisler(
            await prisma.auditLog.findMany({
              where: {
                action: { in: [...PAKETLEME_EYLEMLERI] },
                targetType: "Sale",
                targetId: satisKaydi.id,
              },
              select: { action: true, createdAt: true, targetId: true },
            }),
          ).has(satisKaydi.id),
        },
      ]
    : [];

  const siparisler: AcikSiparis[] = kalemler.map((k) => ({
    saleId: k.sale.id,
    kod: k.sale.code,
    adet: k.quantity,
    satisTarihi: k.sale.soldAt,
    kanal: `${k.sale.channelAccount.channel.name} — ${k.sale.channelAccount.name}`,
    hazirlaniyor: hazirlananlar.has(k.sale.id),
  }));

  /**
   * ⚠ İKİ KAYNAK TEK LİSTEDE BİRLEŞİR. Varyanttan gelen kalemler ya da
   * satış kimliğinden gelen tekil sipariş — hangisi doluysa o.
   */
  const tumSiparisler = [...siparisler, ...satistanGelen];

  /**
   * ════════════════════════════════════════════════════════════════════════
   *  RAF MODU (K50 ⑤, 25.08.2026)
   * ------------------------------------------------------------------------
   *  Canlı bulgu (Halil): _"raf etiketleri okutulduğunda raftakiler şu anda
   *  çıkmıyor."_ Etiketler zaten vardı (`/ayarlar/konumlar/etiketler`, QR
   *  içeriği ham raf kodu) ama OKUMA tarafı hiç yazılmamıştı.
   *
   *  ⚠ EN SONA SORULUR. Önce ürün, sonra satış, en son raf: günlük iş ürün
   *  okutmaktır ve her okumada üç sorgu atmak %99'unda gereksizdir.
   *
   *  ⚠ VE ÖLÇÜM KOVALARINA GİRMEZ — `iziYaz`dan ÖNCE dönülüyor. Bu ekranın
   *  asıl ürünü haftalık KAPSAM ÖLÇÜMÜ: _"okuttuğum ürünlerin yüzde kaçının
   *  açık siparişi defterde var."_ Bir RAF okuması bir ürün okuması değildir;
   *  kovaya girseydi `BILINMEYEN` şişer ve ölçüm "defter eksik" derken
   *  aslında "raf okutuldu" demiş olurdu. Ölçüm aletini kendi eklediğimiz
   *  özellikle bozamayız.
   *
   *  ⚠ "SON YERLEŞTİRME TARİHİ" HÂLÂ GÖSTERİLMİYOR — VE SEBEBİ DEĞİŞTİ
   *  (30.08.2026). Eskiden şöyle yazıyordu ve o gün doğruydu:
   *  _"yerleştirme izi henüz yazılmadı."_ Artık YAZILDI — `/yerlestir`
   *  her yerleştirmeyi `AuditLog`a `URUN_YERLESTIRILDI` olarak, eski ve
   *  yeni rafıyla birlikte kaydediyor.
   *
   *  Bugünkü sebep başka: iz VAR ama bu ekran için henüz KAPSAMI YOK.
   *  Rafın 969 ürünü için "son yerleştirme" göstermek, varyant başına en
   *  yeni izi bulan bir SORGU demektir; bugün o izlerin tamamı da yeni
   *  (ilk yerleştirmeler daha yapılmadı) ve sütunun büyük kısmı boş
   *  görünürdü. `updatedAt` yine vekil olarak KULLANILMIYOR: "en son
   *  dokunulan an"dır, "en son yerleştirilen an" değil.
   *
   *  AÇILIŞ ŞARTI: raflara yerleştirme başladıktan sonra, sütunun anlamlı
   *  ölçüde dolduğu ölçüldüğünde. _(Anayasa: "şartsız bekleyen alan,
   *  unutulmuş alandır".)_
   * ════════════════════════════════════════════════════════════════════════
   */
  if (!varyant && !satisKaydi) {
    const raf = await prisma.location.findFirst({
      where: { code: temiz },
      select: {
        code: true,
        name: true,
        isActive: true,
        variants: {
          where: { isActive: true },
          select: {
            /** ⚠ Stok gruplaması varyant kimliğine bağlı — seçilmek zorunda. */
            id: true,
            sku: true,
            companySku: true,
            barcode: true,
            name: true,
            product: { select: { name: true } },
          },
          orderBy: { sku: "asc" },
        },
      },
    });
    if (raf) {
      /**
       * ⚠ ADET GÖSTERİLİYOR — VE BU BİR UYDURMA DEĞİL, ŞEMANIN İZİN
       * VERDİĞİ BİR TÜRETME (kullanıcı isteği 25.08.2026).
       *
       * Şema açıkça diyor: _"varyant başına TEK konum — bilerek basit
       * tutuldu."_ Yani bir varyantın defterdeki stoğunun TAMAMI o rafta
       * duruyor sayılır. Sayı ledger'dan (`quantityDelta` toplamı) geliyor;
       * rafa özel bir sayaç UYDURULMUYOR.
       *
       * ⚠ NİYE ÖNEMLİ — KULLANICI VAKASI: "aynı üründen kaç tane olursa
       * olsun tek kayıt var ama yanında adet yazmıyor; bu ürünün stoğu dün
       * bitti." Adetsiz liste, **stoğu sıfırlanmış ürünü hâlâ rafta duruyor
       * gibi gösteriyordu.** Şimdi `0` yazıyor ve bu bir BİLGİ: "bu ürün bu
       * rafa kayıtlı ama elde kalmamış".
       *
       * ⚠ AMA BU BİR LEDGER SAYISIDIR, FİZİKSEL SAYIM DEĞİL. Biri ürünü
       * kaydetmeden başka rafa taşıdıysa sistem bunu bilemez — ekran bunu
       * da söylüyor.
       */
      const varyantIdleri = raf.variants.map((v) => v.id);
      const stoklar =
        varyantIdleri.length === 0
          ? []
          : await prisma.stockMovement.groupBy({
              by: ["variantId"],
              where: { variantId: { in: varyantIdleri } },
              _sum: { quantityDelta: true },
            });
      const adetler = new Map(
        stoklar.map((s) => [s.variantId, s._sum.quantityDelta ?? 0]),
      );

      const hepsi = raf.variants.map((v) => ({
        sku: v.sku,
        companySku: v.companySku,
        barcode: v.barcode,
        urunAdi: v.product.name,
        varyantAdi: v.name,
        adet: adetler.get(v.id) ?? 0,
      }));

      /**
       * ⚠ STOĞU BİTMİŞ ÜRÜN RAFTA GÖRÜNMEZ (kullanıcı kararı 25.08.2026):
       * _"satılmış ve stoktan düşmüş ürünler rafta olmamalı."_ Doğru: rafın
       * başında duran kişinin sorusu **"burada ne VAR"**dır; olmayan bir
       * ürünü listelemek onu aratır.
       *
       * ⚠ AMA SESSİZCE GİZLENMEZ — SAYISI YAZILIR (İlke #5 · "açık sıfır").
       * Bağ duruyor: ürünün YERİ hâlâ bu raf ve yeni stok gelince buraya
       * dönecek. Listeden çıkarıp hiç söylememek, var olan bir kaydı
       * görünmez yapmak olurdu; ekran "N ürün bu rafa kayıtlı ama stokta
       * yok" diyor.
       *
       * ⚠ NEGATİF DE BURAYA DÜŞER (`<= 0`): eksi stok bir veri sorunudur ve
       * rafta "var" gibi göstermek onu gizlerdi.
       */
      return {
        izId: null,
        kod: temiz,
        /** ⚠ Kova YAZILMADI; bu değer yalnız tipi doldurur, sayıma girmez. */
        kova: "BILINMEYEN",
        alan: null,
        urun: null,
        siparisler: [],
        raf: {
          kod: raf.code,
          ad: raf.name,
          aktif: raf.isActive,
          urunler: hepsi.filter((u) => u.adet > 0),
          stoksuz: hepsi.filter((u) => u.adet <= 0).length,
        },
      };
    }
  }

  /**
   * ⚠ KOVA "BULUNDU MU" SORUSUNU İKİ KAYNAKTAN BİRDEN CEVAPLAR. Yalnız
   * varyanta baksaydı, gönderi numarasından bulunan bir sipariş
   * `BILINMEYEN` kovasına düşerdi ve haftalık kapsama ölçümü yanlış
   * çıkardı — bulunmuş bir kod "bulunamadı" diye sayılırdı.
   */
  const kova = ilkKova({
    bulunduMu: varyant !== null || satisKaydi !== null,
    acikSiparisVar: tumSiparisler.length > 0,
  });

  /**
   * ⚠ HANGİ ALANDA BULUNDUĞU SÖYLENİR — satış kimliğinde de.
   * Kullanıcı "gönderi numarasından bulundu" görmezse, kodun neden
   * eşleştiğini bilemez ve yanlış kutuyu paketleyebilir.
   */
  const alan: KodRolu | null = varyant
    ? bulunanAlan(temiz, varyant)
    : satisKaydi
      ? satisKaydi.shipmentCode === temiz
        ? "shipmentCode"
        : null
      : null;
  const izId = await iziYaz(kova, {
    kod: temiz,
    alan,
    varyantId: varyant?.id ?? null,
    sebep: null,
  });

  revalidatePath("/okut");
  return {
    izId,
    kod: temiz,
    kova,
    alan,
    urun: varyant ? varyantiOzetle(varyant) : null,
    siparisler: tumSiparisler,
  };
}

/**
 * "BİLİYORSAN GÖSTER" — İSTEĞE BAĞLI İKİNCİ ADIM.
 *
 * ⚠ BU BİR KAPI DEĞİL. Atlanabilir, hiçbir şeyi engellemez, sorulmaz —
 * yalnız TEKLİF edilir. Amacı tek: `BILINMEYEN` kovasını hükme çevirmek.
 *
 * ⚠ VE KOVA ADI BİR EYLEMDİR: `ESLESTIRILDI`, "EAN tutmuyor" DEĞİL.
 * Kullanıcının yaptığı şey eşleştirmedir; okumanın NİYE tutmadığı (ürünün
 * barkodu farklı · kayıtta EAN yanlış · parti farklı geldi) ayrı bir
 * sorudur ve bugün SORULMUYOR. Vaka biriktiğinde desen kendisi çıkacak.
 *
 * ⚠ TEK YÖN: yalnız `BILINMEYEN` yükseltilebilir. Tanınmış bir okuma elle
 * bozulamaz — eşleştirme, hüküm verilemeyeni hükme çevirir; hükmü değiştirmez.
 */
export async function okumayiEslestir(
  izId: string,
  variantId: string,
): Promise<{ ok: true } | { hata: "iz-yok" | "kova-uygun-degil" }> {
  await yetkiIste("stok.gor");

  const iz = await prisma.auditLog.findUnique({
    where: { id: izId },
    select: { action: true, detail: true },
  });
  if (!iz) return { hata: "iz-yok" };

  const kova = eylemKovasi(iz.action);
  if (!kova || !eslestirilebilirMi(kova)) return { hata: "kova-uygun-degil" };

  /**
   * ⚠ ESKİ İZ SİLİNMEZ, YENİSİ YAZILIR. Ledger ilkesi: bir okumanın önce
   * tanınmayıp sonra eşleştirilmiş olması KENDİ BAŞINA bilgidir — kaç
   * okumanın elle kurtarıldığını ancak ikisi de dururken sayabiliriz.
   * Sayım en yeni satırı okur.
   */
  const eski = kaydiOku(iz.detail);
  await iziYaz("ESLESTIRILDI", {
    kod: eski?.kod ?? "",
    alan: null,
    varyantId: variantId,
    sebep: null,
  });

  revalidatePath("/okut");
  return { ok: true };
}

async function iziYaz(
  kova: OkumaKovasi,
  kayit: Parameters<typeof kaydiYaz>[0],
): Promise<string | null> {
  try {
    const kullanici = await oturumdakiKullanici();
    const satir = await prisma.auditLog.create({
      data: {
        userId: kullanici?.id ?? null,
        action: kovaEylemi(kova),
        targetType: kayit.varyantId ? "ProductVariant" : null,
        targetId: kayit.varyantId,
        detail: kaydiYaz(kayit),
      },
      select: { id: true },
    });
    return satir.id;
  } catch (e) {
    /**
     * ⚠ İZ TUTULAMADIYSA OKUMA YİNE DE CEVAP VERİR. Bu ekran depoda
     * paketleme sırasında kullanılıyor; ölçüm uğruna operasyonu durdurmak,
     * ölçülecek operasyonu bozmak olurdu.
     */
    console.error("[okuma] iz yazılamadı:", e);
    return null;
  }
}

/**
 * ============================================================================
 *  PAKETLENDİ — VE GERİ ALMA (K34a ek, İŞ 2)
 * ----------------------------------------------------------------------------
 *  ⚠ SATIŞA BAĞLANIR, OKUMAYA DEĞİL. Barkod ÜRÜNÜ söyler, SİPARİŞİ söylemez;
 *  aynı ürün üç açık siparişte geçiyorsa hangisine paketlendiğini yalnız
 *  kullanıcı bilir. Bu yüzden `saleId` parametredir ve tuş satırın yanındadır.
 *
 *  ⚠ KAPI DEĞİL. Tuşa basmadan da paketlenebilir; hiçbir akış engellenmiyor,
 *  hiçbir uyarı çıkmıyor. Bu bir İZ, bir kontrol değil.
 * ============================================================================
 */
export async function paketlendiIsaretle(
  saleId: string,
  kod: string,
  alan: KodRolu | null,
): Promise<{ ok: true } | { hata: "satis-yok" }> {
  await yetkiIste("stok.gor");

  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true },
  });
  if (!satis) return { hata: "satis-yok" };

  await paketlemeIziYaz(PAKETLENDI_EYLEMI, saleId, { kod, alan });
  revalidatePath("/okut");
  return { ok: true };
}

/**
 * ⚠ SİLME YOK — TERS KAYIT. Yanlış tuşa basıldığında önceki iz silinmez;
 * ikinci bir kayıt yazılır ve okuma en yenisini alır. Bir paketin kaç kez
 * işaretlenip geri alındığı kendi başına bilgidir.
 */
export async function paketlemeyiGeriAl(
  saleId: string,
): Promise<{ ok: true } | { hata: "satis-yok" }> {
  await yetkiIste("stok.gor");

  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true },
  });
  if (!satis) return { hata: "satis-yok" };

  await paketlemeIziYaz(PAKETLEME_GERI_ALINDI_EYLEMI, saleId, null);
  revalidatePath("/okut");
  return { ok: true };
}

async function paketlemeIziYaz(
  eylem: string,
  saleId: string,
  okuma: { kod: string; alan: KodRolu | null } | null,
): Promise<void> {
  try {
    const kullanici = await oturumdakiKullanici();
    await prisma.auditLog.create({
      data: {
        userId: kullanici?.id ?? null,
        action: eylem,
        targetType: "Sale",
        targetId: saleId,
        /**
         * ⚠ YAPILANDIRILMIŞ, SERBEST METİN DEĞİL — K34a ④ ile aynı kural.
         * "Hangi barkodla paketlendi" sorusu ileride metin ayrıştırmaya
         * dönmesin diye şekil bugün sabitleniyor.
         */
        detail: okuma ? JSON.stringify(okuma) : null,
      },
    });
  } catch (e) {
    /* İz tutulamadıysa paket yine hazırlanır; operasyon ölçüm için durmaz. */
    console.error("[okuma] paketleme izi yazılamadı:", e);
  }
}
