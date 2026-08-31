/**
 * ============================================================================
 *  ISI HARİTASI — SATIR × SÜTUN YOĞUNLUK IZGARASI (K117, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği: "satış adetlerini gösteren bir harita" — ay × kanal.
 *
 *  ⛔ COĞRAFİ HARİTA DEĞİL, VE NİYE OLMADIĞI ÖLÇÜLDÜ: şemada il/şehir/adres
 *  alanı **HİÇ YOK** (tarandı, 0 eşleşme). Coğrafi bir harita çizmek, sistemin
 *  hiç tutmadığı bir veri hakkında iddia kurmak olurdu.
 *  _(Anayasa: sistem, kendi defterinde takip etmediği şey hakkında iddia
 *  kurmaz.)_
 *
 *  ── ⛔ RENK TEK BAŞINA BİLGİ TAŞIMAZ ───────────────────────────────────
 *  Her hücrede RAKAM da yazar. Yalnız koyuluk kullansaydık renk körü bir
 *  kullanıcı ve siyah-beyaz çıktı için harita boş bir ızgara olurdu; ayrıca
 *  "koyu" ile "biraz daha koyu" arasındaki farkı kimse sayıya çeviremez.
 *
 *  ── ⛔ ÖLÇEK EN BÜYÜK HÜCREDEN GELİR, UYDURMA EŞİKTEN DEĞİL ────────────
 *  "50'nin üstü koyu" gibi bir sınır bugün doğru olsa da hacim büyüyünce
 *  bütün ızgarayı tek renge boyardı. Ölçüt verinin kendisi: en yoğun hücre
 *  en koyu, gerisi ona oranlanır. _(Anayasa: eşik veriden türetilir.)_
 *
 *  ── ⚠ SIFIR İLE BOŞ AYRI ──────────────────────────────────────────────
 *  `0` = ölçtük, o ay o kanalda satış YOK. `null` = o kanal o ay sistemde
 *  hiç yoktu (hesap açılmamıştı) — hüküm verilemez. İkisi aynı görünseydi
 *  "kanal battı" ile "kanal daha yoktu" karışırdı.
 * ============================================================================
 */

export type IsiSatiri = {
  /** Satır başlığı — kanal adı. */
  ad: string;
  /** Sütun başına değer; `null` = hüküm yok (kapsam dışı). */
  hucreler: (number | null)[];
};

export function IsiHaritasi({
  sutunlar,
  satirlar,
  bicimle,
  bosMesaj,
  satirToplamiEtiketi,
}: {
  /** Sütun başlıkları — aylar. */
  sutunlar: string[];
  satirlar: IsiSatiri[];
  /** Adedi ekran biçimine çevirir — dil altyapısından gelir. */
  bicimle: (deger: number) => string;
  bosMesaj: string;
  /** İlke #15 — satır toplamı sütununun başlığı. */
  satirToplamiEtiketi: string;
}) {
  const tumDegerler = satirlar
    .flatMap((s) => s.hucreler)
    .filter((h): h is number => h !== null);

  if (satirlar.length === 0 || tumDegerler.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {bosMesaj}
      </p>
    );
  }

  /** ⚠ Ölçek VERİDEN: en yoğun hücre 1,00 kabul edilir. */
  const enBuyuk = Math.max(...tumDegerler);

  /**
   * Koyuluk oranı. `0` gerçekten sıfırdır ve HİÇ boyanmaz — soluk bir renk
   * "az sattık" der, oysa hiç satmadık.
   */
  const yogunluk = (deger: number) =>
    enBuyuk <= 0 ? 0 : Math.min(1, deger / enBuyuk);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="bg-muted/40 sticky left-0 px-3 py-2 text-left font-medium">
              {/* Köşe hücresi boş: satır başlıkları kanal, sütunlar ay —
                  ikisini birden adlandıran bir kelime yok. */}
            </th>
            {sutunlar.map((s) => (
              <th
                key={s}
                className="text-muted-foreground px-2 py-2 text-center font-medium"
              >
                {s}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium">
              {satirToplamiEtiketi}
            </th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((satir) => {
            const toplam = satir.hucreler.reduce<number>(
              (t, h) => t + (h ?? 0),
              0,
            );
            return (
              <tr key={satir.ad} className="border-b last:border-b-0">
                <th className="bg-background sticky left-0 px-3 py-2 text-left font-medium whitespace-nowrap">
                  {satir.ad}
                </th>
                {satir.hucreler.map((h, i) => (
                  <td
                    key={sutunlar[i] ?? i}
                    className="px-2 py-2 text-center tabular-nums"
                    style={
                      h === null || h === 0
                        ? undefined
                        : {
                            /**
                             * ⚠ RENK TAILWIND BELİRTECİNDEN, ELLE HEX DEĞİL —
                             * karanlık tema kendiliğinden çalışsın diye.
                             * Saydamlık yoğunluğu taşıyor.
                             */
                            backgroundColor: `color-mix(in oklab, var(--primary) ${(
                              yogunluk(h) * 100
                            ).toFixed(0)}%, transparent)`,
                          }
                    }
                  >
                    {/* ⚠ RAKAM HER HÜCREDE YAZAR — renk tek başına bilgi
                        taşımaz. `null` bir hüküm değil, boşluk. */}
                    {h === null ? (
                      <span className="text-muted-foreground">·</span>
                    ) : (
                      bicimle(h)
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {bicimle(toplam)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
