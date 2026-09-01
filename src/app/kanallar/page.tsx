import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { sayfaIzni } from "@/lib/yetki";

import AnaSayfa from "../page";

/**
 * ============================================================================
 *  /kanallar — KANAL PERFORMANSI DÖKÜM SAYFASI (K124, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ KULLANICI KARARI: _"burada sadece 3 tane kart görünsün, devamını isterse
 *  başka bir sayfada görsün."_ Panel bir HÜKÜM yeridir (İlke #13) — satır
 *  sayısı veriyle birlikte büyüyen bir liste özet ekranına konmaz; döküm
 *  kendi sayfasına gider, özette rakam + "aç" bağlantısı kalır.
 *
 *  ── ⛔ NİYE AYRI BİR SAYFA GÖVDESİ YAZILMADI ─────────────────────────
 *  Kanal kartlarının rakamları panelin kendi hesabından geliyor
 *  (`panelHesapla` + `kanalDagilimi` + dönem süzgeçleri). Buraya ikinci bir
 *  sorgu/eşleme yazılsaydı iki yerde iki hesap olurdu ve bir gün sessizce
 *  ayrışırlardı — panelin en temel sözü **"sayı = liste"**.
 *  Bu yüzden sayfa panelin KENDİ gövdesini çağırıyor ve ondan yalnız kanal
 *  bölümünü çizmesini istiyor.
 *
 *  ⚠ BEDELİ BEYAN EDİLİYOR: bu sayfa panelin BÜTÜN hesabını koşturuyor ama
 *  yalnız kanal ızgarasını çiziyor. Nadiren açılan bir döküm ekranı için
 *  kabul edilebilir bir bedel; sayıların ayrışması değildi.
 *
 *  ⚠ SÜZGEÇLER ADRESTE TAŞINIYOR: bağlantı panelin o anki bütün
 *  parametrelerini aynen getiriyor (`tumKanallarAdresi`), yani dönem ve
 *  sıralama kipi korunuyor. Beyaz liste tutulmuyor — yarın panele eklenen
 *  bir süzgeç listeye girmediği için sessizce düşmesin.
 * ============================================================================
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Panel");
  return { title: t("kanalTumuBaslik") };
}

export default async function KanallarSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  /**
   * ⛔ KAPI BURADA — VE `satis.kar.gor` ÇÜNKÜ SAYFANIN İÇERİĞİ PARA.
   *
   * Panel herkese açık ve NET'i içeride gizliyor; burada gizlenecek bir şey
   * YOK — sayfanın tamamı kanal cirosu ve NET-2. Yetkisi olmayan istek
   * `notFound()` alıyor, yani rotanın varlığı bile sızmıyor.
   * _(Anayasa: "yetkiniz yok" demek, orada bir şey OLDUĞUNU söyler.)_
   *
   * ⚠ VE BAĞLANTI ZATEN `karGorunur` KOŞULUNDA ÇİZİLİYOR: yetkisi olmayan
   * kullanıcı bu adrese panelden ulaşamaz. Kapı yine de burada, çünkü
   * adres elle yazılabilir — görünürlük bir güvenlik katmanı değildir.
   */
  await sayfaIzni("satis.kar.gor");

  /**
   * ⚠ `searchParams` OLDUĞU GİBİ GEÇİYOR: panel kendi tiplediği alanları
   * okuyor, tanımadıklarını yok sayıyor. Burada süzmek, panelin yarın
   * ekleyeceği bir süzgeci sessizce düşürürdü.
   */
  return (
    <AnaSayfa
      searchParams={searchParams as Parameters<typeof AnaSayfa>[0]["searchParams"]}
      yalnizKanallar
    />
  );
}
