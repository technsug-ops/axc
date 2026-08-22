import { markaIkonu } from "@/lib/marka/ikon";

/** Sekme simgesi. Çizim `lib/marka/ikon.tsx` ile ortak — bkz. oradaki not. */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return markaIkonu({ boyut: 32 });
}
