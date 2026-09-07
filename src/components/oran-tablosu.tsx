/**
 * ============================================================================
 *  ORAN TABLOSU — SATIR × SÜTUN, TOPLAMI PAYDAN VE PAYDADAN KURAN (K182)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 07.09.2026: _"pazaryeri pazaryeri ve toplam oran görmek
 *  istiyorum."_
 *
 *  ── ⛔ NİYE ISI HARİTASI KULLANILMADI ───────────────────────────────────
 *  `IsiHaritasi`nın toplam satırı hücreleri **TOPLAR**. Adet için doğru,
 *  ORAN için yanlıştır: `%5 + %8 + %3` diye bir toplam yoktur. Kanalların
 *  hacmi de farklı — 3.687 satışlık Trendyol ile 9 satışlık N11'in oranını
 *  eşit ağırlıkla ortalamak, küçük kanalı büyük kanal kadar konuşturur.
 *
 *  ⭐ ÖLÇÜT: **oran toplanmaz; PAY ve PAYDA toplanır, oran yeniden bölünür.**
 *  Böylece toplam satırı gerçekten "bütün kanallarda o ay ne oldu"yu söyler
 *  ve ağırlık kendiliğinden hacimden gelir.
 *
 *  ── ⚠ SIFIR PAYDA HÜKÜM DEĞİL ──────────────────────────────────────────
 *  O ay o kanalda hiç satış yoksa iade oranı `0` DEĞİLDİR — hesaplanamaz.
 *  `0` yazmak "iade olmadı" der; oysa ölçülecek bir şey yoktu. Hücre `·`
 *  gösterir ve toplama PAY/PAYDA olarak `0/0` girer, yani hiç katkı yapmaz.
 *  _(Anayasa: "sıfıra ve negatife bölünmez" · "bilinmeyen sıfıra çevrilmez".)_
 *
 *  ── ⚠ ORAN %100'Ü AŞABİLİR VE BU KUSUR DEĞİL ───────────────────────────
 *  İade, satışından SONRAKİ bir ayda kaydedilir. Geçen ayın malı bu ay iade
 *  edilirse o ayın oranı %100'ü geçer. Ekran bunu gizlemez; gizleseydi
 *  rakam "makul" görünür ama yanlış olurdu.
 * ============================================================================
 */

/** Bir hücre — oran DEĞİL, oranın iki tarafı. */
export type OranHucresi = {
  pay: number;
  payda: number;
};

export type OranSatiri = {
  ad: string;
  hucreler: OranHucresi[];
};

/** Payda 0 ise `null` — "hesaplanamadı", sıfır DEĞİL. */
export function oran(h: OranHucresi): number | null {
  return h.payda <= 0 ? null : (h.pay / h.payda) * 100;
}

function topla(hucreler: OranHucresi[]): OranHucresi {
  return hucreler.reduce<OranHucresi>(
    (t, h) => ({ pay: t.pay + h.pay, payda: t.payda + h.payda }),
    { pay: 0, payda: 0 },
  );
}

export function OranTablosu({
  sutunlar,
  satirlar,
  bicimleOran,
  bicimleAyrinti,
  toplamEtiketi,
  bosMesaj,
}: {
  sutunlar: string[];
  satirlar: OranSatiri[];
  /** Oranı ekran biçimine çevirir — dil altyapısından gelir. */
  bicimleOran: (deger: number) => string;
  /**
   * ⭐ RAKAM KAYNAĞINI YANINDA TAŞIR (İlke #16'nın kardeşi): hücrede yalnız
   * "%7,4" yazsaydı okuyan "kaçta kaç" diye soramazdı. Alt satırda pay/payda
   * duruyor — oran nereden geldiği görünür.
   */
  bicimleAyrinti: (h: OranHucresi) => string;
  toplamEtiketi: string;
  bosMesaj: string;
}) {
  const doluMu = satirlar.some((s) => s.hucreler.some((h) => h.payda > 0));
  if (satirlar.length === 0 || !doluMu) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {bosMesaj}
      </p>
    );
  }

  /** Sütun başına toplam — satırların PAY ve PAYDAsı toplanır. */
  const sutunToplami = sutunlar.map((_, i) =>
    topla(satirlar.map((s) => s.hucreler[i] ?? { pay: 0, payda: 0 })),
  );
  const genelToplam = topla(sutunToplami);

  const hucre = (h: OranHucresi, kalin: boolean) => {
    const o = oran(h);
    return (
      <>
        <span className={kalin ? "font-semibold" : undefined}>
          {/* ⚠ HESAPLANAMAYAN HÜCRE `·` — `%0` YAZMAZ. */}
          {o === null ? (
            <span className="text-muted-foreground">·</span>
          ) : (
            bicimleOran(o)
          )}
        </span>
        {h.payda > 0 ? (
          <span className="text-muted-foreground block text-[11px]">
            {bicimleAyrinti(h)}
          </span>
        ) : null}
      </>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="bg-muted/40 sticky left-0 px-3 py-2 text-left font-medium" />
            {sutunlar.map((s) => (
              <th
                key={s}
                className="text-muted-foreground px-2 py-2 text-center font-medium"
              >
                {s}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium">{toplamEtiketi}</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((satir) => (
            <tr key={satir.ad} className="border-b last:border-b-0">
              <th className="bg-background sticky left-0 px-3 py-2 text-left font-medium whitespace-nowrap">
                {satir.ad}
              </th>
              {satir.hucreler.map((h, i) => (
                <td
                  key={sutunlar[i] ?? i}
                  className="px-2 py-2 text-center tabular-nums"
                >
                  {hucre(h, false)}
                </td>
              ))}
              {/* SATIR TOPLAMI — o kanalın 12 aylık oranı, aylık oranların
                  ortalaması DEĞİL: pay ve payda toplanıp bölünüyor. */}
              <td className="px-3 py-2 text-right tabular-nums">
                {hucre(topla(satir.hucreler), true)}
              </td>
            </tr>
          ))}
        </tbody>
        {/* ══ TOPLAM SATIRI — bütün kanallar, o ay ══ */}
        <tfoot>
          <tr className="border-t-2">
            <th className="bg-background sticky left-0 px-3 py-2 text-left font-medium whitespace-nowrap">
              {toplamEtiketi}
            </th>
            {sutunToplami.map((h, i) => (
              <td
                key={sutunlar[i] ?? i}
                className="px-2 py-2 text-center tabular-nums"
              >
                {hucre(h, true)}
              </td>
            ))}
            <td className="px-3 py-2 text-right tabular-nums">
              {hucre(genelToplam, true)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
