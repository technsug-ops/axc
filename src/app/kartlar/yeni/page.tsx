import { GeriBaglanti } from "@/components/baglanti";

import { kartOlustur } from "../actions";
import { KartFormu } from "../kart-formu";

export const metadata = { title: "Yeni Kart — Axcali ERP" };

export default function YeniKartSayfasi() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <GeriBaglanti href="/kartlar">Kredi Kartları</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">Yeni Kart</h1>
      </div>

      <KartFormu action={kartOlustur} gonderEtiketi="Kartı Kaydet" />
    </div>
  );
}
