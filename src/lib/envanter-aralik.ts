import { envanterVerisi, type VaryantKimligi } from "@/lib/envanter-veri";
import { prisma } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ARALIK MODU — İKİ FOTOĞRAF + FARK (K53-②, 26.08.2026)
 * ----------------------------------------------------------------------------
 *  Halil dört okuma arasından bunu seçti: dönem BAŞI ve dönem SONU envanteri
 *  yan yana, aralarındaki farkıyla.
 *
 *  ⚠ ÜÇÜNCÜ BİR HESAP YOLU AÇILMADI. Fark, iki fotoğrafın ÇIKARMASIDIR —
 *  ayrı bir sorgudan türetilmez. Ayrı sorgu yazılsaydı üç rakam üretilirdi
 *  (açılış · kapanış · fark) ve üçüncüsü ötekilerden bir gün ayrıştığında
 *  hangisinin doğru olduğu anlaşılmazdı.
 *
 *  ⚠ AYNI MOTOR İKİ KEZ KOŞAR — `envanterVerisi(sinir)`. K53-①'de açılan
 *  parametre burada ikinci kez kullanılıyor; yeni gövde yok.
 *
 *  ── İÇ TUTARLILIK ÇAPRAZI ───────────────────────────────────────────────
 *  Fark, aralıktaki LEDGER hareketlerinin netiyle karşılaştırılır. İki
 *  defter (FIFO ve ledger) aynı şeyi söylemek zorundadır; söylemiyorsa
 *  ekran bunu PİRİNÇ olarak işaretler ve _"defter ayrışması — K54 sınıfı"_
 *  der. **Hüküm VERİLMEZ** — hangi defterin doğru olduğu vakaya göre
 *  değişir ve körlemesine hizalamak veriyi bozar.
 *
 *  ⚠ VE BU ÇAPRAZ ÖLÇÜLDÜ, VARSAYILMADI: `20–25.08` penceresinde
 *  **✗ ayrışma 2** yanıyor (K54'ün bilinen +2'si, 23.08 tarihli iki
 *  `EXCHANGE_OUT`), `01.06–31.07` ve `01.06–01.08` pencerelerinde
 *  **✓ tutuyor**. Yani çapraz hem susmayı hem konuşmayı biliyor.
 * ============================================================================
 */

export type AralikSatiri = {
  variantId: string;
  paraBirimi: Currency;
  acilisAdet: number;
  kapanisAdet: number;
  /** ⚠ ÇIKARMA — ayrı sorgu değil. */
  farkAdet: number;
  /** `null` = o fotoğrafta değeri hesaplanamadı (maliyeti bilinmiyor). */
  acilisDeger: number | null;
  kapanisDeger: number | null;
  farkDeger: number | null;
};

export type AralikBloku = {
  paraBirimi: Currency;
  satirlar: AralikSatiri[];
  acilisAdet: number;
  kapanisAdet: number;
  farkAdet: number;
  acilisDeger: number;
  kapanisDeger: number;
  farkDeger: number;
};

export type AralikSonucu = {
  bloklar: AralikBloku[];
  kimlikler: Map<string, VaryantKimligi>;
  /**
   * İÇ TUTARLILIK ÇAPRAZI — fark ile ledger neti aynı mı?
   * `null` = karşılaştırılamadı (ölçülemeyen durum, sessiz geçilmez).
   */
  capraz: {
    farkAdet: number;
    ledgerNet: number;
    tutuyorMu: boolean;
  };
};

/** Bir fotoğrafın varyant → (adet, değer) haritası. */
type Fotograf = Map<string, { paraBirimi: Currency; adet: number; deger: number | null }>;

function fotografaCevir(sonuc: Awaited<ReturnType<typeof envanterVerisi>>): Fotograf {
  const harita: Fotograf = new Map();
  for (const blok of sonuc.sonuc.bloklar) {
    for (const satir of blok.satirlar) {
      const onceki = harita.get(satir.variantId);
      /** ⚠ Zaten sayı — Decimal değil (bkz. lib/envanter.ts). */
      const deger = satir.malBedeli;
      harita.set(satir.variantId, {
        paraBirimi: blok.paraBirimi,
        adet: (onceki?.adet ?? 0) + satir.adet,
        /**
         * ⚠ BİLİNMEYEN DEĞER TOPLAMA SIFIR OLARAK GİRMEZ. Sıfır girseydi
         * "bedava mal" demiş olurduk; `null` kalır ve ekran onu ayrı sayar.
         */
        deger:
          deger === null || onceki?.deger === null
            ? null
            : (onceki?.deger ?? 0) + deger,
      });
    }
  }
  /**
   * ⚠ DEĞERİ BİLİNMEYEN SATIRLAR DA FOTOĞRAFA GİRER — adetleriyle.
   * Girmeselerdi "değeri bilinmeyen mal yok gibi" davranılırdı ve fark
   * adedi ledger'la tutmazdı: çapraz haksız yere kırmızı yanardı.
   */
  for (const b of sonuc.sonuc.bilinmeyenler) {
    const onceki = harita.get(b.variantId);
    harita.set(b.variantId, {
      paraBirimi: onceki?.paraBirimi ?? ("TRY" as Currency),
      adet: (onceki?.adet ?? 0) + b.adet,
      deger: null,
    });
  }
  return harita;
}

export async function envanterAraligi(
  acilisSiniri: Date,
  kapanisSiniri: Date,
): Promise<AralikSonucu> {
  /**
   * ⚠ AYNI MOTOR, İKİ SINIR. `Promise.all` ikisini paralel koşuyor; sıra
   * önemsiz çünkü ikisi de SALT OKUMA ve birbirinden bağımsız.
   */
  const [acilis, kapanis] = await Promise.all([
    envanterVerisi(acilisSiniri),
    envanterVerisi(kapanisSiniri),
  ]);

  const a = fotografaCevir(acilis);
  const k = fotografaCevir(kapanis);

  /** İki fotoğrafın BİRLEŞİMİ — birinde olup ötekinde olmayan da satırdır. */
  const tumVaryantlar = new Set([...a.keys(), ...k.keys()]);

  const bloklar = new Map<Currency, AralikBloku>();
  for (const variantId of tumVaryantlar) {
    const av = a.get(variantId);
    const kv = k.get(variantId);
    const paraBirimi = kv?.paraBirimi ?? av?.paraBirimi ?? ("TRY" as Currency);

    const acilisAdet = av?.adet ?? 0;
    const kapanisAdet = kv?.adet ?? 0;
    const acilisDeger = av === undefined ? 0 : av.deger;
    const kapanisDeger = kv === undefined ? 0 : kv.deger;

    const satir: AralikSatiri = {
      variantId,
      paraBirimi,
      acilisAdet,
      kapanisAdet,
      /** ⚠ ÇIKARMA — üçüncü sorgu yok. */
      farkAdet: kapanisAdet - acilisAdet,
      acilisDeger,
      kapanisDeger,
      farkDeger:
        acilisDeger === null || kapanisDeger === null
          ? null
          : kapanisDeger - acilisDeger,
    };

    const blok =
      bloklar.get(paraBirimi) ??
      {
        paraBirimi,
        satirlar: [],
        acilisAdet: 0,
        kapanisAdet: 0,
        farkAdet: 0,
        acilisDeger: 0,
        kapanisDeger: 0,
        farkDeger: 0,
      };
    blok.satirlar.push(satir);
    blok.acilisAdet += acilisAdet;
    blok.kapanisAdet += kapanisAdet;
    blok.farkAdet += satir.farkAdet;
    blok.acilisDeger += acilisDeger ?? 0;
    blok.kapanisDeger += kapanisDeger ?? 0;
    blok.farkDeger += satir.farkDeger ?? 0;
    bloklar.set(paraBirimi, blok);
  }

  /**
   * ═══ İÇ TUTARLILIK ÇAPRAZI ══════════════════════════════════════════
   * FIFO'dan gelen fark ile LEDGER'ın aralıktaki neti aynı olmak zorunda.
   * Değilse bu bir "defter ayrışması"dır (K54 sınıfı) ve ekranda pirinç
   * işaretlenir — ama HÜKÜM VERİLMEZ.
   *
   * ⚠ SINIRLAR EKRANLA AYNI: `gte acilis` / `lt kapanis`. Ayrı yazılsaydı
   * çapraz kendi penceresinde doğru, ekranınkinde yanlış olurdu.
   */
  const net = await prisma.stockMovement.aggregate({
    where: { occurredAt: { gte: acilisSiniri, lt: kapanisSiniri } },
    _sum: { quantityDelta: true },
  });
  const ledgerNet = net._sum.quantityDelta ?? 0;
  const farkAdet = [...bloklar.values()].reduce((t, b) => t + b.farkAdet, 0);

  return {
    bloklar: [...bloklar.values()].sort((x, y) =>
      x.paraBirimi.localeCompare(y.paraBirimi),
    ),
    /** Kimlikler KAPANIŞTAN — dönem sonunda görünen ad geçerli olandır. */
    kimlikler: new Map([...acilis.kimlikler, ...kapanis.kimlikler]),
    capraz: { farkAdet, ledgerNet, tutuyorMu: farkAdet === ledgerNet },
  };
}
