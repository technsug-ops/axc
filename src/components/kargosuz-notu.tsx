import Link from "@/components/niyetli-baglanti";
import { ChevronRight, TriangleAlert } from "lucide-react";

import { DURUM_KUTUSU } from "@/lib/renkler";

/**
 * KARGOSUZ NOTU (K141) — kârı kargo düşülmeden hesaplanan satışlar.
 *
 * Panel ve Rapor'da NET rakamlarının üstünde durur. Kullanıcı 22.10.2026
 * (telefon ekran görüntüsü): cümlenin tamamı altı çizili bir bağlantıydı ve
 * «NET o kadar iyimser» dili anlaşılmıyordu → sakin bir uyarı kutusu
 * (`DURUM_KUTUSU.uyari`, uygulamanın öteki uyarı kutularıyla aynı görünüm,
 * İlke #10); tıklanacak yer yalnız sağdaki «Göster» (44 px, İlke #8).
 * Sayı kaynağına götürür (İlke #16) — adres çağıranın süzgeç gövdesinden gelir.
 * Metin sözlükten, çağıran çevirir; burada gömülü metin yok.
 */
export function KargosuzNotu({ adres, metin, goster }: { adres: string; metin: string; goster: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-md border py-1.5 ps-3 pe-1 text-sm ${DURUM_KUTUSU.uyari}`}>
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{metin}</span>
      <Link
        href={adres}
        className="hover:bg-accent inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md px-2 font-medium underline underline-offset-4 sm:min-h-9"
      >
        {goster}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
