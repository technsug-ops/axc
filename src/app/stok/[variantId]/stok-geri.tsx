"use client";

import { useRouter } from "next/navigation";

import { GeriBaglanti } from "@/components/baglanti";

/**
 * ============================================================================
 *  "‹ STOK" — LİSTEYE SÜZGEÇLE BİRLİKTE DÖNER (K104, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ KULLANICI BULGUSU: `/stok`ta "Anker" arayıp sıralama ve sıfır süzgeci
 *  uygulandıktan sonra bir ürünün detayına girip geri dönülünce **filtre
 *  kayboluyor**, liste baştan kuruluyordu. Marka/grup bazlı seri işlem
 *  (etiket · sayım · raf) bu ekranda yapılıyor; her dönüşte süzgeci yeniden
 *  kurmak doğrudan işçilik.
 *
 *  ⚠ SEBEP LİSTEDE DEĞİL, BU BAĞLANTIDAYDI. Liste durumunun tamamı zaten
 *  ADRESTE (`q` · `sirala` · `yon` · `stok`), dolayısıyla **tarayıcının geri
 *  tuşu bugün bile doğru çalışıyordu.** Bozuk olan tek şey ekrandaki
 *  bağlantıydı: sabit `href="/stok"` yazıyordu ve geliş adresini hiç
 *  taşımıyordu.
 *
 *  ── ⭐ NİYE `<Link>` KALDI, DÜĞMEYE ÇEVRİLMEDİ ──────────────────────────
 *  Gövde hâlâ gerçek bir bağlantı: JavaScript çalışmasa da, sayfa doğrudan
 *  bir linkle açılmış olsa da `/stok`a gider. `router.back()` yalnız
 *  **geçmiş varsa** devreye giriyor ve o hâlde varsayılan gezinme iptal
 *  ediliyor. Yani en kötü ihtimalde bugünkü davranışa düşer, daha kötüsüne
 *  değil. _(Anayasa: "kalıcılık katmanı, çalışma katmanının önkoşulu
 *  yapılmaz".)_
 *
 *  ── ⚠ BEYAN EDİLEN SINIR — TAHMİN DEĞİL, ÖLÇÜLEMEYEN BİR ŞEY ───────────
 *  Tarayıcı, "geçmişteki önceki adres bizim sitemiz mi" sorusunu
 *  cevaplamıyor: `history.length` sekmenin TOPLAM geçmişini sayar, kimin
 *  olduğunu söylemez. Dolayısıyla şu tek durumda `back()` siteden çıkar:
 *  kullanıcı başka bir sitede gezinmiş, sonra AYNI sekmede doğrudan bu ürün
 *  detayının linkini açmış ve "‹ Stok"a basmıştır.
 *
 *  Bu vaka operasyonda gerçekleşmiyor (detaya listeden giriliyor) ve bedeli
 *  bir geri tuşuyla düzelir. Uydurma bir çözüm (referrer tahmini,
 *  `sessionStorage` izi) bu sınırı kaldırmaz, yalnız görünmez yapardı.
 * ============================================================================
 */
export function StokGeriBaglantisi({ etiket }: { etiket: string }) {
  const router = useRouter();

  return (
    <GeriBaglanti
      href="/stok"
      onClick={(olay) => {
        /**
         * ⚠ TEK GİRDİLİ GEÇMİŞTE `back()` ÇAĞRILMAZ — hiçbir yere gitmez ve
         * kullanıcı tıkladığı hâlde ekranda hiçbir şey olmaz (sessiz
         * başarısızlık, İlke #5). O hâlde bağlantı kendi işini yapar.
         */
        if (typeof window === "undefined" || window.history.length <= 1) return;
        olay.preventDefault();
        router.back();
      }}
    >
      {etiket}
    </GeriBaglanti>
  );
}
