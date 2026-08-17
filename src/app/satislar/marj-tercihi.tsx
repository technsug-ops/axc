"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { MARJ_OLCULERI, type MarjOlcusu } from "@/lib/marj-gosterge";

const ANAHTAR = "selliora.marjOlcusu";

/**
 * ============================================================================
 *  MARJ ÖLÇÜSÜ TERCİHİ — HATIRLANIR
 * ----------------------------------------------------------------------------
 *  Kullanıcı şartı 17.08.2026: seçilen ölçü hatırlansın.
 *
 *  ── NEDEN VERİTABANI DEĞİL ──────────────────────────────────────────────
 *  Kullanıcı tercihi için şemaya kolon eklemek migration demekti; bu, bir
 *  görünüm tercihi için ödenecek bedelden büyük. Tercih tarayıcıda saklanır
 *  ve adrese yansıtılır — sunucu tarafında ek bir alan gerekmez.
 *
 *  SINIRI AÇIKÇA YAZIYORUM: tercih CİHAZ bazlıdır. Telefonda seçilen ölçü
 *  masaüstünde geçerli olmaz. Çok cihazlı hatırlama gerekirse kullanıcı
 *  ayarı olarak şemaya taşınır — o zaman burası tek satırla değişir.
 *
 *  ── ADRES KAZANIR ───────────────────────────────────────────────────────
 *  Adreste `?marj=` varsa o kullanılır ve kaydedilir: paylaşılan bir bağlantı
 *  her zaman gönderildiği ölçüyü gösterir. Adres boşsa hatırlanan tercih
 *  uygulanır.
 * ============================================================================
 */
export function MarjTercihi() {
  const router = useRouter();
  const pathname = usePathname();
  const parametreler = useSearchParams();

  useEffect(() => {
    const adrestekiOlcu = parametreler.get("marj");

    if (adrestekiOlcu !== null) {
      // Adres kazanır ve tercih olarak kaydedilir.
      if ((MARJ_OLCULERI as readonly string[]).includes(adrestekiOlcu)) {
        window.localStorage.setItem(ANAHTAR, adrestekiOlcu);
      }
      return;
    }

    const hatirlanan = window.localStorage.getItem(ANAHTAR) as MarjOlcusu | null;
    if (hatirlanan === null) return;
    if (!(MARJ_OLCULERI as readonly string[]).includes(hatirlanan)) return;
    // Varsayılan zaten "ciro"; onu adrese yazmak gereksiz gürültü olur.
    if (hatirlanan === "ciro") return;

    const yeni = new URLSearchParams(parametreler.toString());
    yeni.set("marj", hatirlanan);
    router.replace(`${pathname}?${yeni.toString()}`, { scroll: false });
  }, [parametreler, pathname, router]);

  return null;
}
