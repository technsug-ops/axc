import { notFound } from "next/navigation";

import { markaIkonu } from "@/lib/marka/ikon";

/**
 * ============================================================================
 *  PWA SİMGELERİ — SABİT ADRESLİ
 * ----------------------------------------------------------------------------
 *  Manifest, simgelere ADRESLE bakar. Next'in `icon.tsx` düzeni simgeyi
 *  `/icon?<özet>` gibi ÖZETLİ bir adrese koyuyor; o adres derlemeden
 *  derlemeye değişebildiği için manifest'ten gösterilemez.
 *
 *  Bu yüzden manifest simgeleri normal bir rota olarak duruyor: adres sabit
 *  (`/ikon/192.png`), çizim `lib/marka/ikon.tsx` ile ORTAK.
 *
 *  ⚠ DERLEME ANINDA ÜRETİLİR: `generateStaticParams` üçünü de derlemede
 *  PNG'ye çeviriyor, istek anında hiçbir şey hesaplanmıyor.
 * ============================================================================
 */

/**
 * ⚠ 192 ve 512 KURULUM ŞARTI. Android'de kurulum teklifinin çıkması için
 * manifest'te en az bu iki boyut istenir; biri eksikse teklif hiç çıkmaz ve
 * ekranda bunu söyleyen bir şey de olmaz — sessiz başarısızlık.
 */
const OLCULER: Record<string, { boyut: number; maskeli: boolean }> = {
  "192.png": { boyut: 192, maskeli: false },
  "512.png": { boyut: 512, maskeli: false },
  /** Android'in kırptığı hâl — kenarlardan pay bırakılmış sürüm. */
  "maskeli-512.png": { boyut: 512, maskeli: true },
};

export function generateStaticParams() {
  return Object.keys(OLCULER).map((ad) => ({ ad }));
}

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ ad: string }> },
) {
  const { ad } = await params;
  const olcu = OLCULER[ad];
  /* Bilinmeyen ad 404 döner — boş PNG dönmek, bozuk simgeyi "çalışıyor"
     gibi gösterirdi. */
  if (!olcu) notFound();

  return markaIkonu(olcu);
}
