/**
 * ============================================================================
 *  OKUMA SİNYALİ — SES · EKRAN PARLAMASI · TİTREŞİM (kullanıcı isteği 15.10.2026)
 * ----------------------------------------------------------------------------
 *  _«Paketle'de sipariş etiketi ve ürün okuttuktan sonra doğruda belirgin yeşil
 *  ve onay sesi, yanlışta kırmızı ve sesli uyarı · sipariş gelince kasa sesi.»_
 *
 *  · DOSYASIZ: sesler tarayıcının kendi ses motoruyla üretilir (ağ isteği yok,
 *    çevrimdışı/CSP bozmaz). Ayırt edici olmalı — ekrana BAKMADAN, kulakla:
 *      ONAY — iki yükselen tiz ton («ding-ding»), kısa
 *      HATA — üç alçak, sert «bıp» (kare dalga) + titreşim
 *      KASA — metalik çan + kısa çekmece hışırtısı
 *  · TEK SES BAĞLAMI, İLK DOKUNUŞTA AÇILIR: tarayıcılar sesi yalnız kullanıcı
 *    sayfaya dokunduktan sonra çaldırır. Bağlam ilk dokunuş/tuşta açılır;
 *    açılmamışsa ses SESSİZCE düşer — akış durmaz (ses bir kolaylık, kapı değil).
 *  · PARLAMA EKRANIN TAMAMI: depoda telefon elde, göz rafta — küçük bir kutu
 *    yeterince belirgin değil. Tıklamayı engellemez, ekran okuyucuya görünmez
 *    (asıl durum metni sayfada yazılı kalır).
 * ============================================================================
 */

import { KASA_TARIFI } from "./kasa-sesi-tarifi";

export type Sinyal = "onay" | "hata" | "kasa";

type SesBaglami = AudioContext;
let baglam: SesBaglami | null = null;

function baglamAl(): SesBaglami | null {
  if (typeof window === "undefined") return null;
  try {
    if (!baglam) {
      const Ses = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ses) return null;
      baglam = new Ses();
    }
    if (baglam.state === "suspended") void baglam.resume();
    return baglam;
  } catch {
    /* Ses yoksa akış durmaz. */
    return null;
  }
}

/** İlk dokunuşta/tuşta ses bağlamını açar (tarayıcının «önce kullanıcı dokunsun» kuralı). */
export function sesiHazirla(): void {
  if (typeof window === "undefined") return;
  const ac = () => {
    baglamAl();
    window.removeEventListener("pointerdown", ac);
    window.removeEventListener("keydown", ac);
  };
  window.addEventListener("pointerdown", ac, { once: true });
  window.addEventListener("keydown", ac, { once: true });
}

function ton(ctx: SesBaglami, frekans: number, bas: number, sure: number, dalga: OscillatorType, ses: number) {
  const osc = ctx.createOscillator();
  const kazanc = ctx.createGain();
  osc.type = dalga;
  osc.frequency.value = frekans;
  const t0 = ctx.currentTime + bas;
  kazanc.gain.setValueAtTime(0.0001, t0);
  kazanc.gain.exponentialRampToValueAtTime(ses, t0 + 0.01);
  kazanc.gain.exponentialRampToValueAtTime(0.0001, t0 + sure);
  osc.connect(kazanc);
  kazanc.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + sure + 0.02);
}

function hisirti(ctx: SesBaglami, bas: number, sure: number, ses: number) {
  const ornek = Math.floor(ctx.sampleRate * sure);
  const tampon = ctx.createBuffer(1, ornek, ctx.sampleRate);
  const veri = tampon.getChannelData(0);
  for (let i = 0; i < ornek; i++) veri[i] = (Math.random() * 2 - 1) * (1 - i / ornek);
  const kaynak = ctx.createBufferSource();
  const kazanc = ctx.createGain();
  kazanc.gain.value = ses;
  kaynak.buffer = tampon;
  kaynak.connect(kazanc);
  kazanc.connect(ctx.destination);
  kaynak.start(ctx.currentTime + bas);
}

/** Yalnız ses — parlama yok (kasa sesi her sayfada; ekranı boyamak işi bölerdi). */
export function sesCal(sinyal: Sinyal): void {
  const ctx = baglamAl();
  if (!ctx) return;
  try {
    if (sinyal === "onay") {
      ton(ctx, 1046, 0, 0.12, "sine", 0.35);
      ton(ctx, 1568, 0.11, 0.18, "sine", 0.35);
    } else if (sinyal === "hata") {
      for (const bas of [0, 0.2, 0.4]) ton(ctx, 196, bas, 0.15, "square", 0.22);
    } else {
      /* Tarif TEK kaynaktan — indirilebilir bildirim sesi de aynı tariften üretilir. */
      hisirti(ctx, KASA_TARIFI.hisirti.bas, KASA_TARIFI.hisirti.sure, KASA_TARIFI.hisirti.ses);
      for (const k of KASA_TARIFI.tonlar) ton(ctx, k.frekans, k.bas, k.sure, k.dalga, k.ses);
    }
  } catch {
    /* Ses yoksa akış durmaz. */
  }
}

/** Ekranın tamamı kısa süre yeşil/kırmızı parlar — tıklamayı engellemez. */
function parla(sinyal: "onay" | "hata"): void {
  if (typeof document === "undefined") return;
  const kat = document.createElement("div");
  kat.setAttribute("aria-hidden", "true");
  kat.dataset.okumaSinyali = sinyal;
  Object.assign(kat.style, {
    position: "fixed",
    inset: "0",
    zIndex: "100",
    pointerEvents: "none",
    background: sinyal === "onay" ? "var(--se-kar)" : "var(--se-zarar)",
    opacity: "0.45",
    transition: "opacity 650ms ease-out",
  });
  document.body.appendChild(kat);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      kat.style.opacity = "0";
    });
  });
  window.setTimeout(() => kat.remove(), 800);
}

/** Okutma sonucu: ses + parlama + (hatada belirgin) titreşim. */
export function okumaSinyali(eslesti: boolean): void {
  const sinyal = eslesti ? "onay" : "hata";
  sesCal(sinyal);
  parla(sinyal);
  try {
    navigator.vibrate?.(eslesti ? 60 : [120, 60, 120, 60, 120]);
  } catch {
    /* Titreşim yoksa geç. */
  }
}
