import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowDown, ArrowUp, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SIRALAMA_ALANLARI,
  type Siralama,
  type SiralamaAlani,
} from "@/lib/stok-siralama";
import { YAS_KOVALARI, type YasKovasi } from "@/lib/yaslanma";

/**
 * ============================================================================
 *  STOK — SIRALAMA VE SIFIR SÜZGECİ ÇUBUĞU (K101, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ KULLANICI BULGUSU: `/stok`ta sıralama tuşu YOKTU (sabit: ürün adı) ve
 *  sıfır stoklular listeyi dolduruyordu. Ölçüldü 30.08: 1104 varyantın
 *  **823'ü sıfır stoklu, 51'i hiç hareket görmemiş** — yani ekranın %79'u
 *  operasyonda elde OLMAYAN mal.
 *
 *  ── ⚠ NİYE TABLO BAŞLIĞINA TIKLAMA DEĞİL ────────────────────────────────
 *  Masaüstünde tablo başlığına tıklamak alışılmış bir kalıp; ama bu ekranın
 *  MOBİL hâli tablo değil KART listesidir (`ListeKarti`) — başlık satırı
 *  telefonda hiç çizilmez. Sıralamayı oraya bağlamak, özelliği telefonda
 *  YOK ederdi. Depo aşamasında birincil cihaz telefon (İlke #8).
 *
 *  ⚠ HER ÖĞE BAĞLANTI, DÜĞME DEĞİL: durum ADRESTE yaşıyor. Böylece sıralı
 *  liste paylaşılabiliyor, geri tuşu çalışıyor ve sunucu bileşeni istemciye
 *  inmeden karar veriyor.
 *
 *  ⚠ SAYFA HER DEĞİŞİKLİKTE 1'E DÖNER. Dönmeseydi 5. sayfadayken sıra
 *  değiştiren kullanıcı, bambaşka bir listenin 5. sayfasına düşer ve aradığı
 *  ürünü "kayboldu" sanardı.
 * ============================================================================
 */

/** Aktif/pasif çip — tıklanabilir olan tıklanabilir GÖRÜNÜR (İlke #2). */
function Cip({
  href,
  aktif,
  children,
}: {
  href: string;
  aktif: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      /**
       * ⚠ 44 px YÜKSEKLİK (h-11) — İlke #8. `size="icon-sm"` benzeri küçük
       * varyantlar mobilde tek başına kullanılmaz.
       */
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
        aktif
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted",
      )}
      /** ⚠ Renk tek başına konuşmaz: aktiflik ekran okuyucuya da söylenir. */
      aria-current={aktif ? "true" : undefined}
    >
      {children}
    </Link>
  );
}

export async function SiralaSuzgec({
  sira,
  stokSuzgeciAcik,
  tasinanlar,
  kanallar,
  seciliKanal,
  seciliKova,
}: {
  sira: Siralama;
  stokSuzgeciAcik: boolean;
  /** Korunacak öteki adres parametreleri (arama, yaş, maliyet, kanal). */
  tasinanlar: Record<string, string | undefined>;
  /**
   * K112 — kanal kapsamı süzgeci için seçenekler.
   *
   * ⚠ LİSTE VERİDEN GELİR, SABİT KOD DEĞİL. Anayasa: firma/kanal adları
   * sistemin YAPISINA gömülmez. Ve yalnız AKTİF HESABI OLAN kanallar
   * geliyor — 11 kanalın hepsini çipe dökmek, dokuzu hiç kullanılmıyorken
   * ekranı gürültüye boğardı.
   */
  kanallar: { kod: string; ad: string }[];
  seciliKanal: string | undefined;
  /**
   * K131 — seçili raf yaşı kovası. `undefined` = kova seçili değil.
   * ⚠ ROZET BANDI (`amber`/`kirmizi`) buraya GELMEZ: o ayrı bir sözcük
   * dağarcığı ve çiplerde karşılığı yok. Bant seçiliyken hiçbir kova çipi
   * aktif görünmez ve bu doğrudur — kullanıcı panelden gelmiştir.
   */
  seciliKova: YasKovasi | undefined;
}) {
  const t = await getTranslations("Stok");

  /**
   * ⚠ `sayfa` BİLEREK TAŞINMIYOR — her değişiklik 1. sayfaya döner.
   * Taşınsaydı sıra değişince kullanıcı başka bir listenin ortasına düşerdi.
   */
  function adres(ek: Record<string, string | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...tasinanlar, ...ek })) {
      if (v !== undefined && v !== "") p.set(k, v);
    }
    const qs = p.toString();
    return qs ? `/stok?${qs}` : "/stok";
  }

  const etiketler: Record<SiralamaAlani, string> = {
    ad: t("siralaAd"),
    adet: t("siralaAdet"),
    hareket: t("siralaHareket"),
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">{t("siralaEtiket")}</span>

      {SIRALAMA_ALANLARI.map((alan) => {
        const aktif = sira.alan === alan;
        /**
         * ⭐ AKTİF ALANA TEKRAR BASMAK YÖNÜ ÇEVİRİR — ayrı bir "yön" düğmesi
         * açmak ikinci bir tıklama ve ikinci bir kavram getirirdi (İlke #9).
         * Pasif alana basınca o alanın DOĞAL yönü gelir: adda A→Z, sayısal
         * alanlarda büyükten küçüğe (kullanıcı "en çok stoklu hangisi" diye
         * sorar, "en az" diye değil).
         */
        const yeniYon = aktif
          ? sira.yon === "artan"
            ? "azalan"
            : "artan"
          : alan === "ad"
            ? "artan"
            : "azalan";
        return (
          <Cip
            key={alan}
            aktif={aktif}
            href={adres({ sirala: alan, yon: yeniYon })}
          >
            {etiketler[alan]}
            {aktif ? (
              sira.yon === "artan" ? (
                <ArrowUp className="size-4" aria-hidden />
              ) : (
                <ArrowDown className="size-4" aria-hidden />
              )
            ) : null}
          </Cip>
        );
      })}

      {/*
        ⚠ SÜZGEÇ AÇIKKEN GÖRÜNÜR VE TEK TIKLA KALKAR — sessiz süzgeç yasak.
        Kapatıldığında `stok` parametresi adresten TAMAMEN düşer; boş dize
        bırakmak "süzgeç var ama boş" gibi okunurdu.
      */}
      <Cip
        aktif={stokSuzgeciAcik}
        href={adres({
          stok: stokSuzgeciAcik ? undefined : "var",
          sirala: sira.alan === "ad" ? undefined : sira.alan,
          yon: sira.alan === "ad" ? undefined : sira.yon,
        })}
      >
        <EyeOff className="size-4" aria-hidden />
        {t("sifirGizle")}
      </Cip>

      {/*
        ═══ K131 — RAF YAŞI KOVALARI ═════════════════════════════════════
        Kullanıcı isteği 02.09.2026: yedi aralık.

        📏 SINIRLAR ÖLÇÜLDÜ (`npm run canli:yas-dagilimi`, 230 raflı kalem):
        kovaların YEDİSİ DE DOLU, boş kova yok, kapsama tam. Boş bir kova
        çizmek, tıklayana boş liste açıp "bozuk mu" dedirtirdi.

        ⚠ ÇİP LİSTESİ `YAS_KOVALARI` DİZİSİNDEN — burada elle sıra tutulmuyor.
        Sekizinci kova eklenirse bu dosyaya dokunulmayacak.

        ⚠ AKTİF KOVAYA TEKRAR BASMAK SÜZGECİ KALDIRIR (İlke #10: açtığın
        şeyi kapatmanın yolu, açtığın düğmedir).
      */}
      <span className="text-muted-foreground ml-2 text-sm">
        {t("yasKovaBaslik")}
      </span>
      {YAS_KOVALARI.map((k) => (
        <Cip
          key={k.kod}
          aktif={seciliKova === k.kod}
          href={adres({
            yas: seciliKova === k.kod ? undefined : k.kod,
            sirala: sira.alan === "ad" ? undefined : sira.alan,
            yon: sira.alan === "ad" ? undefined : sira.yon,
          })}
        >
          {t(`yasKova${k.kod}`)}
        </Cip>
      ))}

      {/*
        ═══ K112 — KANALDA KODU OLMAYANLAR ═══════════════════════════════
        ⚠ ÖLÇÜM BU ÇİPLERİ AÇTIRDI (canlı 31.08.2026, 230 stoklu varyant):
            hiçbir kanalda kodu yok     3
            N11'de kodu yok           190   ← %82,6
        Eskiden yalnız "hiçbir kanalda yok" sorulabiliyordu ve o soru
        boşluğun %1,5'ini gösteriyordu.

        ⚠ ÇİP "KODU YOK" DER, "SATIŞTA DEĞİL" DEMEZ. Pazaryerinin listeleme
        durumu sistemde HİÇ YOK (TY'de ürün ucu yok, HB/N11'de API yok).
        "Satışta değil" demek, tutamayacağımız bir söz olurdu.
      */}
      {kanallar.length > 0 ? (
        <>
          <span className="text-muted-foreground ml-2 text-sm">
            {t("kanalKapsami")}
          </span>
          {kanallar.map((k) => (
            <Cip
              key={k.kod}
              aktif={seciliKanal === k.kod}
              href={adres({
                kanal: seciliKanal === k.kod ? undefined : k.kod,
                sirala: sira.alan === "ad" ? undefined : sira.alan,
                yon: sira.alan === "ad" ? undefined : sira.yon,
              })}
            >
              {t("kanaldaKodYok", { kanal: k.ad })}
            </Cip>
          ))}
        </>
      ) : null}
    </div>
  );
}
