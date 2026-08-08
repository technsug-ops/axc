import * as React from "react";

/**
 * Ekranın "mobil" sayılıp sayılmayacağını söyler (sidebar bunu kullanıyor).
 *
 * NOT: shadcn'in ürettiği hâli useEffect içinde setState çağırıyordu; Next 16
 * ile gelen React Compiler lint kuralı bunu (haklı olarak) reddediyor.
 * Doğru kalıp useSyncExternalStore: tarayıcı API'sine abone olur, sunucuda
 * güvenli bir varsayılan döner, zincirleme render üretmez.
 */

const MOBILE_BREAKPOINT = 768;
const MEDYA_SORGUSU = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function abone(degisimBildir: () => void) {
  const mql = window.matchMedia(MEDYA_SORGUSU);
  mql.addEventListener("change", degisimBildir);
  return () => mql.removeEventListener("change", degisimBildir);
}

function tarayiciDegeri() {
  return window.matchMedia(MEDYA_SORGUSU).matches;
}

/** Sunucuda pencere yok; masaüstü varsayıp istemcide düzeltiyoruz. */
function sunucuDegeri() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(abone, tarayiciDegeri, sunucuDegeri);
}
