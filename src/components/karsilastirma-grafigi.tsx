"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  eksen,
  eksenIsaretleri,
  etiketAtlamasi,
  GRAFIK_KUTUSU,
  xKonumu,
  yKonumu,
} from "@/components/grafik-olcek";

/**
 * ============================================================================
 *  KARŞILAŞTIRMA GRAFİĞİ — SERİYİ SEÇ / GİZLE (K182, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği: _"son grafik karşılaştırmalar olsun. Ör: Ciro / NET-2,
 *  NET-2 / sipariş miktarı vs. Bu parametrelerden istediğimi seçip
 *  gösterip istediğimi gizleyebileyim."_
 *
 *  ── ⛔ FARKLI BİRİM AYNI EKSENE KONMAZ (kullanıcı kararı 07.09.2026) ────
 *  Ciro ₺1,7 Mn ile 511 adet aynı eksende çizilseydi adet çizgisi tabanda
 *  düz bir doğru olurdu — grafik "adet değişmiyor" der, oysa 321'den 511'e
 *  çıkmış. Seçenekler tartışıldı ve **karışık seçim ENGELLENİR** seçildi:
 *
 *    · çift eksen  → iki çizginin KESİŞMESİ anlamsız olurdu, ve kesişme
 *                    grafiğin en çok bakılan yeridir
 *    · indeks(100) → gerçek rakamlar kaybolur
 *    · ENGELLE     → en dürüstü: birleştirilemeyeni birleştirmiş gibi
 *                    göstermemek  ✓
 *
 *  ⛔ VE ENGEL SESSİZ DUVAR DEĞİL (İlke #5): karışık seçimde ekran NEDEN
 *  çizemediğini ve NE yapılacağını yazar; düğme de pasifleşmez, çünkü
 *  kullanıcı seçimini geri almak için ona basacak.
 *
 *  ── ⚠ `null` = HÜKÜM YOK ───────────────────────────────────────────────
 *  Ölçülememiş ay sıfır sayılmaz; çizgi orada KESİLİR. Sıfıra çekseydik
 *  grafik "o ay hiç satış yok" derdi — oysa bakamadık.
 * ============================================================================
 */

export type KarsilastirmaSerisi = {
  anahtar: string;
  ad: string;
  /** Aynı `birim` değerine sahip seriler birlikte çizilebilir. */
  birim: string;
  /** Ay başına değer; `null` = o ay için hüküm YOK. */
  degerler: (number | null)[];
  /** Bu birimin ekran biçimi — dil altyapısından gelir. */
  bicimle: (deger: number) => string;
  bicimleKisa: (deger: number) => string;
};

/**
 * ⛔ KENDİ KUTUSUNU TANIMLAMAZ — `GRAFIK_KUTUSU`dan okur. Kopyalanan bir
 * kutu/eksen gövdesi, biri düzeltilip öteki unutulunca iki grafiği farklı
 * ölçekte gösterir ve fark ancak yan yana konunca görülür.
 * _(`cizgi-grafik.tsx` bu gövdeyi tam bu sebeple ortak modüle taşımıştı.)_
 */

/**
 * ⚠ RENK TAILWIND BELİRTECİNDEN DEĞİL SABİT PALETTEN: seri sayısı değişken
 * olduğu için sınıf adı üretilemez (Tailwind sınıfları derleme anında
 * taranır, `text-${x}` çalışmaz). Palet karanlık temada da okunur tonlardan.
 */
const RENKLER = ["#2563eb", "#ea580c", "#16a34a", "#9333ea", "#dc2626", "#0891b2"];

export function KarsilastirmaGrafigi({
  etiketler,
  seriler,
  baslangicSecim,
  bosMesaj,
  karisikBirimMesaji,
  secimBosMesaji,
}: {
  /** Ay etiketleri — eksende yazar. */
  etiketler: string[];
  seriler: KarsilastirmaSerisi[];
  /** Açılışta seçili gelen seriler — aynı birimden olmalı. */
  baslangicSecim: string[];
  bosMesaj: string;
  karisikBirimMesaji: string;
  secimBosMesaji: string;
}) {
  const [secili, setSecili] = useState<string[]>(baslangicSecim);

  const cevir = (anahtar: string) =>
    setSecili((o) =>
      o.includes(anahtar) ? o.filter((x) => x !== anahtar) : [...o, anahtar],
    );

  const seciliSeriler = seriler.filter((s) => secili.includes(s.anahtar));
  const birimler = [...new Set(seciliSeriler.map((s) => s.birim))];

  /** Düğmeler her hâlde çizilir — kullanıcı seçimini onlarla geri alır. */
  const dugmeler = (
    <div className="flex flex-wrap gap-2">
      {seriler.map((s, i) => {
        const acik = secili.includes(s.anahtar);
        return (
          <Button
            key={s.anahtar}
            type="button"
            size="sm"
            variant={acik ? "default" : "outline"}
            className="h-11 md:h-8"
            aria-pressed={acik}
            onClick={() => cevir(s.anahtar)}
          >
            {/* ⚠ RENK TEK BAŞINA BİLGİ TAŞIMAZ: seçililik `aria-pressed` ve
                düğme dolgusuyla da anlatılıyor; nokta yalnız hangi çizgi
                olduğunu eşleştiriyor. */}
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-2 rounded-full"
              style={{ backgroundColor: RENKLER[i % RENKLER.length] }}
            />
            {s.ad}
            <span className="text-muted-foreground ml-1 text-[11px]">
              {s.birim}
            </span>
          </Button>
        );
      })}
    </div>
  );

  if (seciliSeriler.length === 0) {
    return (
      <div className="space-y-3">
        {dugmeler}
        <p className="text-muted-foreground py-8 text-center text-sm">
          {secimBosMesaji}
        </p>
      </div>
    );
  }

  /** ⛔ KARIŞIK BİRİM — ÇİZİLMEZ, VE NİYE ÇİZİLMEDİĞİ YAZILIR. */
  if (birimler.length > 1) {
    return (
      <div className="space-y-3">
        {dugmeler}
        <p className="border-muted-foreground/30 text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
          {karisikBirimMesaji}
        </p>
      </div>
    );
  }

  const tumDegerler = seciliSeriler
    .flatMap((s) => s.degerler)
    .filter((d): d is number => d !== null);
  if (tumDegerler.length === 0) {
    return (
      <div className="space-y-3">
        {dugmeler}
        <p className="text-muted-foreground py-8 text-center text-sm">
          {bosMesaj}
        </p>
      </div>
    );
  }

  /** Ölçek ORTAK GÖVDEDEN — ikinci bir eksen hesabı yazılmaz. */
  const y = eksen(tumDegerler);
  const isaretler = eksenIsaretleri(y);
  const yKonum = (deger: number) => yKonumu(deger, y);
  const x = (i: number) => xKonumu(i, etiketler.length);
  const etiketAtla = etiketAtlamasi(etiketler.length);
  const bicimle = seciliSeriler[0].bicimle;
  const bicimleKisa = seciliSeriler[0].bicimleKisa;

  return (
    <div className="space-y-3">
      {dugmeler}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${GRAFIK_KUTUSU.genislik} ${GRAFIK_KUTUSU.yukseklik}`}
          className="h-auto w-full min-w-[720px]"
          role="img"
          aria-label={seciliSeriler.map((s) => s.ad).join(", ")}
        >
          {/* --- yatay ızgara + eksen --- */}
          <g className="text-muted-foreground" fontSize={12}>
            {isaretler.map((isaret) => (
              <g key={isaret}>
                <line
                  x1={GRAFIK_KUTUSU.sol}
                  x2={GRAFIK_KUTUSU.genislik - GRAFIK_KUTUSU.sag}
                  y1={yKonum(isaret)}
                  y2={yKonum(isaret)}
                  stroke="currentColor"
                  strokeOpacity={0.18}
                />
                <text
                  x={GRAFIK_KUTUSU.sol - 8}
                  y={yKonum(isaret) + 4}
                  textAnchor="end"
                  fill="currentColor"
                >
                  {bicimle(isaret)}
                </text>
              </g>
            ))}
          </g>

          {/* --- seriler --- */}
          {seciliSeriler.map((s) => {
            const renk = RENKLER[seriler.indexOf(s) % RENKLER.length];
            /**
             * ⚠ `null` AY ÇİZGİYİ KESER — sıfıra çekilmez. Tek bir polyline
             * kullansaydım boşluk düz bir doğruyla ATLANIRDI ve ölçülmemiş
             * bir ay ölçülmüş gibi görünürdü.
             */
            const parcalar: string[][] = [];
            let aktif: string[] = [];
            s.degerler.forEach((d, i) => {
              if (d === null) {
                if (aktif.length > 0) parcalar.push(aktif);
                aktif = [];
                return;
              }
              aktif.push(`${x(i)},${yKonum(d)}`);
            });
            if (aktif.length > 0) parcalar.push(aktif);

            return (
              <g key={s.anahtar}>
                {parcalar.map((p, i) => (
                  <polyline
                    key={i}
                    points={p.join(" ")}
                    fill="none"
                    stroke={renk}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                ))}
                {s.degerler.map((d, i) =>
                  d === null ? null : (
                    <circle
                      key={i}
                      cx={x(i)}
                      cy={yKonum(d)}
                      r={3.5}
                      fill={renk}
                    />
                  ),
                )}
              </g>
            );
          })}

          {/* --- TEK SERİ SEÇİLİYSE RAKAMLAR --- */}
          {/* ⚠ RAKAM YALNIZ TEK SERİDE: iki çizginin rakamları aynı dikey
              şeride binerdi ve hangisinin hangi çizgiye ait olduğu yalnız
              renkten anlaşılırdı. Tam rakamlar alttaki tabloda duruyor. */}
          {seciliSeriler.length === 1
            ? seciliSeriler[0].degerler.map((d, i) =>
                d === null || i % etiketAtla !== 0 ? null : (
                  <text
                    key={i}
                    x={x(i)}
                    y={yKonum(d) - 10}
                    textAnchor="middle"
                    className="text-foreground"
                    fill="currentColor"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {bicimleKisa(d)}
                  </text>
                ),
              )
            : null}

          {/* --- ay etiketleri --- */}
          <g className="text-muted-foreground" fontSize={12}>
            {etiketler.map((e, i) =>
              i % etiketAtla === 0 ? (
                <text
                  key={e}
                  x={x(i)}
                  y={GRAFIK_KUTUSU.yukseklik - 12}
                  textAnchor="middle"
                  fill="currentColor"
                >
                  {e}
                </text>
              ) : null,
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
