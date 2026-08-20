"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { karYenidenYaz } from "@/lib/kar-yeniden";
import { kdvDahilKargo } from "@/lib/kargo-kdv";
import { prisma } from "@/lib/prisma";

export type SatisHesapDurumu = {
  hatalar?: string[];
  basari?: string;
};

/**
 * ============================================================================
 *  SATIŞIN KANAL HESABINI DEĞİŞTİR
 * ----------------------------------------------------------------------------
 *  Satışın tam düzenlemesi YOK (stok hareketi + kâr snapshot'ı zinciri).
 *  Bu action kanal hesabını değiştirir ve KÂRI DA TAZELER — ledger'a ve
 *  kalemlere dokunmaz.
 *
 *  NEDEN GEREKLİ: satış yanlış hesaba yazılmış olabilir. 12.08.2026'da
 *  canlıda tam bu çıktı: iki satış, mal ALINAN kişisel hesaba kaydedilmişti;
 *  o hesap hem alış hem satış görünüyordu ve rolü düzeltilemiyordu.
 *
 *  ── KARAR DEĞİŞTİ 20.08.2026 — KÂR ARTIK OTOMATİK TAZELENİYOR ───────────
 *  ⚠ ÖNCEKİ DAVRANIŞ BİLİNÇLİYDİ ve burada şöyle savunuluyordu: _"kâr
 *  snapshot'ı geçmişin kaydıdır; kullanıcı 'Yeniden Hesapla' ile açıkça
 *  onaylamadan değişmemeli."_ Gerekçe makuldü ama **yanlış tarafta
 *  duruyordu.**
 *
 *  Kanal değişince KESİNTİ KURALLARI değişir: HB komisyona %20 KDV ekler +
 *  ₺12,60 hizmet + %0,8 ödeme gideri; TY'de ₺13,19 sabit. Taşıma yapılıp
 *  kâr tazelenmezse NET, ESKİ kanalın kurallarıyla hesaplanmış hâlde kalır
 *  ve ekranda **doğru görünür** — sessiz yanlış.
 *
 *  "Ekran uyarıyor" yeterli değildi: uyarının okunmasına ve ayrı bir düğmeye
 *  basılmasına bel bağlamak, _"düzeltme yolu, düzelttiği verinin TÜM
 *  okuyucularına ulaştığı ölçülmeden 'var' sayılmaz"_ kuralının ihlalidir.
 *  Snapshot'ın dokunulmazlığı, YANLIŞ kanalla hesaplanmış bir snapshot'ı
 *  korumayı gerektirmez — orada korunan şey geçmiş değil, hatadır.
 *
 *  Desen `iptal-geri-alma-veri.ts` ve `canli-maliyet-hizala` ile aynı:
 *  veri değişti → kâr ELLE yazılmaz, motor yeniden hesaplar.
 * ============================================================================
 */
export async function satisHesabiDegistir(
  _oncekiDurum: SatisHesapDurumu,
  formData: FormData,
): Promise<SatisHesapDurumu> {
  await yetkiIste("kar.duzelt");

  const t = await getTranslations("Satis");

  const saleId = String(formData.get("saleId") ?? "");
  const channelAccountId = String(formData.get("channelAccountId") ?? "");
  if (!saleId || !channelAccountId) {
    return { hatalar: [t("hesabiDegistirEksik")] };
  }

  const [satis, hesap] = await Promise.all([
    prisma.sale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        code: true,
        channelAccountId: true,
        /** Kâr tazelemesinin girdileri — düzenleme yoluyla AYNI çağrı. */
        cargoCarrierId: true,
        cargoDesi: true,
        cargoAmount: true,
        items: { select: { id: true, commissionRate: true } },
      },
    }),
    prisma.channelAccount.findUnique({
      where: { id: channelAccountId },
      select: { id: true, name: true, satisIcin: true, isActive: true },
    }),
  ]);

  if (!satis) return { hatalar: [t("bulunamadi")] };
  if (!hesap || !hesap.isActive) {
    return { hatalar: [t("hesabiDegistirHesapYok")] };
  }
  // SATIŞ yalnız SATIŞ hesabına taşınabilir — alış hesabına taşımak
  // düzeltmek değil, aynı hatayı tekrar yapmaktır.
  if (!hesap.satisIcin) {
    return { hatalar: [t("hesabiDegistirSatisDegil", { ad: hesap.name })] };
  }
  if (satis.channelAccountId === channelAccountId) {
    return { hatalar: [t("hesabiDegistirAyni")] };
  }

  await prisma.sale.update({
    where: { id: saleId },
    data: { channelAccountId },
  });

  /**
   * KÂR ELLE YAZILMAZ — motor komisyon, komisyon KDV'si, sipariş
   * kesintileri ve kargoyu YENİ kanalın kurallarıyla yeniden çözer.
   *
   * ⚠ ORAN KALEMDEN, TUTAR null — düzenleme ve iptal-geri-alma yollarıyla
   * AYNI çağrı. Farklı çağırsaydık aynı satış üç yoldan üç türlü
   * hesaplanırdı.
   *
   * ⚠ KOMİSYON ORANI TAŞINMAZ: kalemdeki snapshot oran korunur. Yeni
   * kanalın oranını çekmek, kullanıcının girdiği oranı sessizce ezmek
   * olurdu; oran ayrı bir düzeltmedir (satış düzenleme ekranı, uyarısıyla).
   */
  await karYenidenYaz({
    saleId,
    kalemler: satis.items.map((k) => ({
      saleItemId: k.id,
      commissionRate:
        k.commissionRate === null ? null : Number(k.commissionRate.toString()),
      commissionAmount: null,
    })),
    cargoCarrierId: satis.cargoCarrierId,
    cargoDesi:
      satis.cargoDesi === null ? null : Number(satis.cargoDesi.toString()),
    /** DB KDV hariç saklar; motor KDV dahil bekler (`lib/kargo-kdv.ts`). */
    cargoAmountManual: kdvDahilKargo(
      satis.cargoAmount === null ? null : Number(satis.cargoAmount.toString()),
    ),
  });

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  revalidatePath("/ayarlar/kanallar");
  revalidatePath("/hakedis");

  return { basari: t("hesabiDegisti", { ad: hesap.name }) };
}
