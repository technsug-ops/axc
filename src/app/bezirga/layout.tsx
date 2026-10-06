import { Inter, Poppins } from "next/font/google";

import "./yonetim.css";

/**
 * YÖNETİM KATMANI GÖVDESİ — referans görsel dil (HA-Kompass admin, 07.10.2026
 * birebir): Inter (gövde) + Poppins (başlık), `.yn` kapsamı. Giriş sayfası
 * ve iç sayfalar AYNI dili kullanır. Yazı tipleri `next/font` ile derlemede
 * indirilir ve kendi sunucumuzdan verilir (dış istek yok).
 */
const govde = Inter({ subsets: ["latin", "latin-ext"], variable: "--yn-govde", display: "swap" });
const baslik = Poppins({ subsets: ["latin", "latin-ext"], weight: ["600", "700", "800"], variable: "--yn-baslik", display: "swap" });

export default function YonetimGovdesi({ children }: { children: React.ReactNode }) {
  return <div className={`yn ${govde.variable} ${baslik.variable}`}>{children}</div>;
}
