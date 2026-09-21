import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { kanalYetenegi } from "@/lib/komisyon/kanal-yetenegi";
import { kanalPlatformu } from "@/lib/komisyon/yukle";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

import { KanalKartlari, type KanalKarti } from "./kanal-kartlari";

/**
 * ============================================================================
 *  KOMİSYON YÜKLEME — TEK KAPI (K226, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  KULLANICI KARARI: _"Her bir kanalın kendi yükleme stili olsun. Kişi kanala
 *  tıklasın, dosyayı içine koysun; böylelikle karışıklık olmaz."_
 *
 *  ── NİYE DOĞDU ─────────────────────────────────────────────────────────
 *  Komisyon iki ayrı ekrandan giriyordu (`/ayarlar/tarife` ve
 *  `/kanal-sku/komisyon-aktar`) ve ikisi de "kanal hesabı" soruyordu — ama
 *  tarife ekranının okuyucusu YALNIZ Trendyol'un dilimli dosyası için
 *  yazılmıştı. Kullanıcı HB ve N11 dosyalarını oraya yükledi, ikisi de düştü
 *  ve ekran nereye gideceğini söylemedi. Açılır listede kanal seçmek, o
 *  kanalın dosyasının kabul edileceği izlenimi veriyordu — tutulamayan bir söz.
 *
 *  ── BU EKRAN ESKİLERİ KALDIRMAZ ────────────────────────────────────────
 *  `/ayarlar/tarife` yüklü pencereleri ve kapsam boşluğu tutanağını (K49)
 *  göstermeye devam ediyor — o bir DURUM ekranı. Burası YÜKLEME kapısı.
 *  Çalışan gövdelere (okuyucular, sunucu eylemleri) dokunulmadı; önlerine
 *  kanal başına bir giriş katmanı kondu.
 *
 *  ⚠ KANAL LİSTESİ VERİDEN GELİR, ELLE TUTULMAZ. Dördüncü bir pazaryeri
 *  hesabı açıldığı gün kartı kendiliğinden çıkar. Elle liste tutulsaydı yeni
 *  kanal ekranda hiç görünmez ve bunu kimse fark etmezdi.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("komisyonKapisi") };
}

export default async function KomisyonKapisiSayfasi() {
  await sayfaIzni("kanalsku.yaz");

  const t = await getTranslations("KomisyonKapisi");
  const bicim = await bicimlendirici();

  /**
   * YALNIZ SATIŞ HESAPLARI. Alış hesabındaki kod tedarikçi kataloğunun
   * kodudur; komisyonu yoktur. Sunucu eylemleri ayrıca reddediyor —
   * liste kısaltmak yetki değildir.
   */
  const hesaplar = await prisma.channelAccount.findMany({
    where: { isActive: true, satisIcin: true },
    select: {
      id: true,
      name: true,
      channel: { select: { code: true, name: true } },
    },
    orderBy: [{ channel: { name: "asc" } }, { name: "asc" }],
  });

  /**
   * SON TARİFE PENCERESİ — hesap başına en yenisi.
   *
   * ⚠ "Hiç yüklenmemiş" ile "yüklenmiş ama bayat" AYRI şeylerdir ve kart
   * ikisini ayrı yazar; boş bırakmak ikisini aynı gösterirdi.
   */
  const tarifeler = await prisma.komisyonTarifesi.findMany({
    select: { channelAccountId: true, pencereBaslangic: true },
    orderBy: { pencereBaslangic: "desc" },
  });
  const sonTarife = new Map<string, Date>();
  for (const tr of tarifeler) {
    if (!sonTarife.has(tr.channelAccountId)) {
      sonTarife.set(tr.channelAccountId, tr.pencereBaslangic);
    }
  }

  const kartlar: KanalKarti[] = hesaplar.map((h) => {
    const platform = kanalPlatformu(h.channel.code);
    const damga = sonTarife.get(h.id);
    return {
      hesapId: h.id,
      etiket: hesapEtiketi(h.channel.name, h.name),
      platformTanindi: platform !== null,
      turler: kanalYetenegi(platform),
      sonTarifeYazisi: damga ? bicim.tarih(damga) : null,
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("aciklama")}</p>
      </div>

      <KanalKartlari
        kartlar={kartlar}
        /**
         * Açılır listeyi ÇİZMEYEN kipte bile bileşenler `hesaplar` bekliyor;
         * tek elemanlı liste veriliyor ki sabit kip dışına düşen bir kullanım
         * sessizce boş listeye bakmasın.
         */
        hesaplar={kartlar.map((k) => ({ id: k.hesapId, etiket: k.etiket }))}
      />
    </div>
  );
}
