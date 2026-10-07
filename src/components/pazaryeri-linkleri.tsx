import { ExternalLink } from "lucide-react";

/**
 * PAZARYERİ LİNKLERİ — ürünler listesinde ürünün ilanına giden satırlar
 * (kullanıcı isteği 07.10.2026). Satır başına kanal adı + yeni sekmede açılan
 * link. İki «yok» hâli AYRI yazılır (anayasa: sıfır üç farklı şey olabilir):
 *   · `kayitYok`  — bu ürünün o kanalda kanal kodu hiç yok
 *   · `linkYok`   — kanal kodu var, ama ilan kimliği henüz okunmadı / ilan yok
 * Link yalnız `adres` doluyken çizilir; uydurma adres YOK.
 */
export type PazaryeriSatiri = {
  kod: string;
  ad: string;
  durum: "LINK" | "KAYIT_YOK" | "LINK_YOK";
  adres: string | null;
};

export function PazaryeriLinkleri({
  satirlar,
  metin,
}: {
  satirlar: PazaryeriSatiri[];
  metin: { kayitYok: string; linkYok: string; ac: (kanal: string) => string };
}) {
  return (
    <ul className="space-y-0.5 text-xs">
      {satirlar.map((s) => (
        <li key={s.kod} className="flex min-h-6 items-center gap-1.5 whitespace-nowrap">
          {s.durum === "LINK" && s.adres ? (
            <a
              href={s.adres}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={metin.ac(s.ad)}
              className="text-primary inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline md:min-h-6"
            >
              {s.ad}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : (
            <span className="text-muted-foreground">
              {s.ad} · {s.durum === "KAYIT_YOK" ? metin.kayitYok : metin.linkYok}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
