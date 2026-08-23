import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * ============================================================================
 *  ÜÇ SERİLİ ÇİZGİ GRAFİK — ELLE SVG, KÜTÜPHANE YOK
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE `cizgi-grafik.tsx` GENELLEŞTİRİLMEDİ:
 *  O bileşen iki seriye (`gelir`/`net2`) ve AYLIK eksene göre kurulmuş,
 *  içinde ölçülmüş kararlar var. Genelleştirmek çalışan bir grafiği yeniden
 *  yazmak olurdu ve aylık grafiğin garantilerini riske atardı.
 *
 *  KÜTÜPHANE KARARI DEĞİŞMEDİ (12.08.2026, kalıcı): elle SVG sunucuda
 *  çizilir, `"use client"` gerekmez, karanlık tema `currentColor` ile
 *  kendiliğinden çalışır.
 *
 *  ── ⚠ TIKLANABİLİRLİK — İSTEMCİ JAVASCRIPT'İ OLMADAN ────────────────────
 *  Kullanıcı isteği 21.08.2026: _"grafikte bir noktaya tıklayınca ilgili
 *  sayfa o döneme süzülmüş açılsın"_. Her nokta bir `<a>` ile sarılıyor —
 *  SVG içinde `<a>` geçerlidir ve link olduğu için sunucuda çizilebiliyor,
 *  `"use client"` gerekmiyor.
 *
 *  ⚠ POP-UP DEĞİL, SAYFA. Gerçek bir pop-up (modal içinde başka sayfa)
 *  istemci bileşeni ve iframe/portal ister; ikisi de bu grafiğin "sıfır
 *  istemci JS" sözünü bozar. Tıklama süzülmüş listeye GÖTÜRÜYOR — aynı
 *  bilgi, geri tuşuyla dönülebilir hâlde.
 *
 *  ⚠ TIKLAMA ALANI GÖRÜNMEZ AMA BÜYÜK: `r=14` şeffaf daire. Nokta 3px
 *  çizilseydi telefonda isabet ettirmek imkânsız olurdu (İlke #8, 44px).
 *
 *  ⚠ TABLO TÜM NOKTALARI GÖSTERİR — kırpma YOK (21.08.2026). Eskiden 15
 *  satırda kesiliyor ve "tam dökümü Rapor'da aç" diyordu; Rapor'da öyle bir
 *  döküm YOKTU. Kırılım sayesinde en kötü hâl 32 satır, o da akordiyonun
 *  arkasında — kırpmanın gerekçesi kalmadı.
 *
 *  ERİŞİLEBİLİRLİK: Altındaki tablo SÜS DEĞİL, asıl okunabilir hâlidir.
 *  Dokunmatikte hover yok, ekran okuyucu SVG'yi atlıyor (`aria-hidden`) —
 *  veri ve bağlantılar oradan da erişilebilir.
 * ============================================================================
 */

export type UcSeriNoktasi = {
  /** Eksende yazan kısa etiket. */
  etiket: string;
  /** Tam metin — tabloda ve bağlantı başlığında. */
  tamEtiket: string;
  a: number;
  b: number;
  c: number;
  /**
   * ÜÇ SERİNİN TOPLAMI — "o gün kaç kalem iş yaptım".
   *
   * ⚠ İSTEĞE BAĞLI VE BİLEREK: yalnız üç serinin toplanması ANLAMLI olduğu
   * görünümde dolar. Ciro görünümünde alım ile satış zıt yönlerdir; ikisini
   * toplamak "para hangi yöne aktı" sorusunu cevaplamaz, bulandırır.
   * Kararı ÇAĞIRAN verir (bkz. `serileriKur`), grafik bilmez.
   */
  toplam?: number;
  /** Bu noktanın süzülmüş adresleri; yoksa nokta tıklanamaz. */
  adres?: { a: string; b: string; c: string };
};

const G = {
  genislik: 1240,
  yukseklik: 280,
  sol: 110,
  sag: 16,
  ust: 16,
  alt: 34,
} as const;

const IC_GENISLIK = G.genislik - G.sol - G.sag;
const IC_YUKSEKLIK = G.yukseklik - G.ust - G.alt;
const ARALIK = 4;

/**
 * SERİ RENKLERİ — kullanıcı kararı 21.08.2026:
 * alım YEŞİL, satış MAVİ, üçüncü seri TURUNCU.
 *
 * ⚠ RENK TEK BAŞINA KONUŞMAZ (kısıt #1): göstergede her rengin YANINDA adı
 * yazıyor ve tablo da aynı sırayla okunuyor. Renk körü bir kullanıcı için
 * grafik, tablo sayesinde yine tam okunur.
 *
 * ⚠ SABİT RENK, `--chart-*` DEĞİL: kullanıcı üç rengi ADIYLA istedi
 * (yeşil/mavi/turuncu). Tema değişkenleri gri tonlarına ayarlı ve o istek
 * karşılanmazdı. Değerler hem açık hem koyu temada okunacak tonlarda.
 */
const RENK = {
  a: "#16a34a",
  b: "#2563eb",
  c: "#ea580c",
} as const;

export function UcSeriliGrafik({
  noktalar,
  adlar,
  bicimle,
  bosMesaj,
  tabloAcMetni,
  ozet,
  toplamAdi,
  tabloAcik = false,
}: {
  noktalar: UcSeriNoktasi[];
  adlar: { a: string; b: string; c: string };
  bicimle: (deger: number) => string;
  bosMesaj: string;
  /** Kapalı akordiyonun üstünde yazan metin. */
  tabloAcMetni: string;
  /**
   * GRAFİK İLE TABLO ARASINA giren özet satırı (kullanıcı 21.08.2026).
   *
   * ⚠ NİYE PROP, NİYE ALTA DEĞİL: toplam, grafiğin CEVABI. Tablonun
   * altında dururken önce döküm okunuyor, hüküm en sona kalıyordu. Sıra
   * artık "eğilim → hüküm → istersen döküm".
   *
   * ⚠ Bileşenin içine yazılmadı: toplamın METNİ ekranın işine göre değişir
   * (adet mi ciro mu, hangi para birimi). Grafik onu bilmez, çağıran bilir.
   */
  ozet?: React.ReactNode;
  /**
   * TOPLAM SERİSİNİN ADI. Verilirse VE noktalarda `toplam` varsa, kesikli
   * bir çizgi ve tabloda bir sütun daha çizilir.
   *
   * ⚠ İKİSİ BİRLİKTE ARANIYOR: yalnız ad verilip veri gelmezse çizgi
   * `NaN`a düşer ve grafik BOZUK çizilir — boş değil, bozuk.
   */
  toplamAdi?: string;
  /**
   * Tablo VARSAYILAN AÇIK mı? Kural bileşende değil, saf işlevde
   * (`tabloAcikMi`) — eşik değişirse test kırmızı yansın diye.
   */
  tabloAcik?: boolean;
}) {
  if (noktalar.length === 0) {
    return <p className="text-muted-foreground text-sm">{bosMesaj}</p>;
  }

  /**
   * ⚠ İKİ ŞART BİRDEN: ad verilmiş VE her noktada sayı var. Biri eksikse
   * toplam hiç çizilmez — yarım çizilen bir seri, olmayan bir seriden kötü.
   */
  const toplamVar =
    toplamAdi !== undefined && noktalar.every((n) => typeof n.toplam === "number");
  const toplamDeger = (n: UcSeriNoktasi) => n.toplam ?? 0;

  /**
   * ⚠ TOPLAM EKSENE DAHİL. Dahil edilmezse toplam çizgisi tavanı aşar ve
   * grafiğin ÜSTÜNDEN taşar — okunmaz olur.
   */
  const tumu = noktalar.flatMap((n) =>
    toplamVar ? [n.a, n.b, n.c, toplamDeger(n)] : [n.a, n.b, n.c],
  );
  const tavanHam = Math.max(...tumu, 0);
  const tabanHam = Math.min(...tumu, 0);
  /**
   * ⚠ TABAN SIFIRIN ALTINA İNEBİLİR: ciro görünümünde üçüncü seri FARK ve
   * fark negatif olabilir (alım satıştan büyükse). Ekseni sıfırda kessek
   * negatif kısım çizilmez ve "o hafta para çıktı" bilgisi kaybolurdu.
   *
   * ⚠ TAVAN=TABAN OLAMAZ: hiç hareket yoksa bölme sıfıra düşer ve bütün
   * noktalar NaN olur — grafik boş değil BOZUK çizilirdi.
   */
  const taban = Math.min(tabanHam, 0);
  const tavan = tavanHam === taban ? taban + 1 : tavanHam;

  const x = (i: number) =>
    noktalar.length === 1
      ? G.sol + IC_GENISLIK / 2
      : G.sol + (i / (noktalar.length - 1)) * IC_GENISLIK;
  const y = (d: number) =>
    G.ust + IC_YUKSEKLIK - ((d - taban) / (tavan - taban)) * IC_YUKSEKLIK;

  const adim = Math.max(1, Math.ceil(noktalar.length / 10));

  const seriler = [
    { anahtar: "a" as const, ad: adlar.a, renk: RENK.a },
    { anahtar: "b" as const, ad: adlar.b, renk: RENK.b },
    { anahtar: "c" as const, ad: adlar.c, renk: RENK.c },
  ];

  const yol = (sec: (n: UcSeriNoktasi) => number) =>
    noktalar
      .map((n, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(sec(n))}`)
      .join(" ");

  return (
    <div className="min-w-0 space-y-3">
      {/* GÖSTERGE — renk tek başına konuşmaz, adı yanında yazar. */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {seriler.map((s) => (
          <span key={s.anahtar} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-1 w-4 rounded"
              style={{ backgroundColor: s.renk }}
            />
            {s.ad}
          </span>
        ))}
        {/* TOPLAM — kesikli, çünkü ölçülen bir şey değil TÜRETİLMİŞ.
            Göstergedeki çizgi de kesikli ki grafiğe bakmadan anlaşılsın. */}
        {toplamVar ? (
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-0 w-4 border-t-2 border-dashed border-current"
            />
            {toplamAdi}
          </span>
        ) : null}
      </div>

      <svg viewBox={`0 0 ${G.genislik} ${G.yukseklik}`} className="w-full">
        {/* Y ekseni */}
        {Array.from({ length: ARALIK + 1 }, (_, i) => {
          const deger = taban + ((tavan - taban) / ARALIK) * i;
          const yy = y(deger);
          return (
            <g key={i} aria-hidden>
              <line
                x1={G.sol}
                y1={yy}
                x2={G.genislik - G.sag}
                y2={yy}
                className="text-border"
                stroke="currentColor"
                strokeWidth={1}
              />
              <text
                x={G.sol - 8}
                y={yy + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[13px]"
              >
                {bicimle(deger)}
              </text>
            </g>
          );
        })}

        {/* SIFIR ÇİZGİSİ — negatif varsa nerede olduğunu göster. */}
        {taban < 0 ? (
          <line
            aria-hidden
            x1={G.sol}
            y1={y(0)}
            x2={G.genislik - G.sag}
            y2={y(0)}
            className="text-foreground"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        ) : null}

        {noktalar.map((n, i) =>
          i % adim === 0 || i === noktalar.length - 1 ? (
            <text
              key={n.etiket + i}
              aria-hidden
              x={x(i)}
              y={G.yukseklik - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[13px]"
            >
              {n.etiket}
            </text>
          ) : null,
        )}

        {seriler.map((s) => (
          <path
            key={s.anahtar}
            aria-hidden
            d={yol((n) => n[s.anahtar])}
            fill="none"
            stroke={s.renk}
            strokeWidth={2.5}
          />
        ))}

        {/*
          TOPLAM ÇİZGİSİ — KESİKLİ VE NÖTR RENKTE.

          ⚠ Kesikli olması bir süs değil: bu çizgi ÖLÇÜLEN bir şey değil,
          öteki üçünün TOPLAMI. Düz çizilseydi dördüncü bir ölçüm sanılır
          ve "toplam neden satıştan büyük" diye sorulurdu.

          ⚠ TIKLANAMAZ ve bu bilerek: tek bir toplamın süzülmüş karşılığı
          YOK — tıklanınca alıma mı satışa mı kargoya mı gidileceği belirsiz.
          Tıklanabilir görünüp hiçbir yere gitmemek, İlke #2'nin tersidir.
        */}
        {toplamVar ? (
          <path
            aria-hidden
            d={yol(toplamDeger)}
            fill="none"
            className="text-muted-foreground"
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        ) : null}

        {/* TIKLANABİLİR NOKTALAR — her seri için ayrı hedef. */}
        {seriler.map((s) =>
          noktalar.map((n, i) => {
            const cx = x(i);
            const cy = y(n[s.anahtar]);
            const daire = (
              <>
                <circle cx={cx} cy={cy} r={3.5} fill={s.renk} />
                {/* Şeffaf ve BÜYÜK isabet alanı — telefonda dokunulabilsin. */}
                <circle cx={cx} cy={cy} r={14} fill="transparent" />
              </>
            );
            const adres = n.adres?.[s.anahtar];
            return adres ? (
              <a
                key={`${s.anahtar}-${i}`}
                href={adres}
                aria-label={`${n.tamEtiket} · ${s.ad}: ${bicimle(n[s.anahtar])}`}
              >
                <title>{`${n.tamEtiket} · ${s.ad}: ${bicimle(n[s.anahtar])}`}</title>
                {daire}
              </a>
            ) : (
              <g key={`${s.anahtar}-${i}`} aria-hidden>
                {daire}
              </g>
            );
          }),
        )}
      </svg>

      {/* ÖZET — grafiğin hemen altında, tablodan ÖNCE. */}
      {ozet}

      {/*
        ⚠ TABLO VARSAYILAN KAPALI — AMA KAYBOLMADI (kullanıcı 21.08.2026).
        Grafik zaten cevabı veriyor; tablo "rakamı tam görmek isteyen" için.
        Açık dururken panelin yarısını yiyordu (İlke #12: alanı verimli
        kullan).

        ⚠ `<details>` SEÇİLDİ, AKORDİYON BİLEŞENİ DEĞİL: shadcn Accordion
        istemci bileşeni ve bu grafiğin "sıfır istemci JS" sözünü bozardı
        (12.08.2026 kütüphane kararının aynı ailesi). `<details>` tarayıcının
        kendi açılır-kapanırı: klavyeyle çalışır, ekran okuyucu "genişlet"
        diye duyurur, JavaScript kapalıyken bile açılır.

        ⚠ ERİŞİLEBİLİRLİK KAYBI YOK: SVG `aria-hidden`, yani veriyi okuyan
        tek yer bu tablo. Kapalı olması onu DOM'dan çıkarmıyor — ekran
        okuyucu açılır bölümü görür ve açabilir.

        ⚠ TABLO ASIL OKUNABİLİR HÂL — süs değil, ve KIRPILMIŞ.
        Özet ekranda döküm olmaz (İlke #13): satır sayısı veriyle büyüyen
        hiçbir şey panele konmaz. Gizlenen varsa SAYISI yazar ve tam dökümün
        adresi verilir — "bir şey gizlendi" sessiz kalmaz.
      */}
      <details open={tabloAcik} className="group rounded-lg border">
        <summary className="hover:bg-muted/60 flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm">
          {/* İŞARET + METİN BİRLİKTE: ok tek başına "burada bir şey var"
              demez; yanında ne olduğu yazıyor. */}
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 transition-transform group-open:rotate-90"
          />
          {tabloAcMetni}
        </summary>

        <div className="overflow-x-auto px-3 pb-3">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="py-1 pr-2 font-normal">—</th>
                {seriler.map((s) => (
                  <th
                    key={s.anahtar}
                    className="py-1 pr-2 text-right font-normal"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-block h-1 w-3 rounded"
                        style={{ backgroundColor: s.renk }}
                      />
                      {s.ad}
                    </span>
                  </th>
                ))}
                {toplamVar ? (
                  <th className="py-1 pr-2 text-right font-normal">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-block h-0 w-3 border-t-2 border-dashed border-current"
                      />
                      {toplamAdi}
                    </span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {noktalar.map((n, i) => (
                <tr key={n.tamEtiket + i} className="border-b last:border-0">
                  <td className="text-muted-foreground py-1 pr-2 whitespace-nowrap">
                    {n.tamEtiket}
                  </td>
                  {seriler.map((s) => {
                    const adres = n.adres?.[s.anahtar];
                    const deger = bicimle(n[s.anahtar]);
                    return (
                      <td
                        key={s.anahtar}
                        className="py-1 pr-2 text-right tabular-nums"
                      >
                        {adres ? (
                          <Link
                            href={adres}
                            className="hover:text-foreground underline-offset-2 hover:underline"
                          >
                            {deger}
                          </Link>
                        ) : (
                          deger
                        )}
                      </td>
                    );
                  })}
                  {toplamVar ? (
                    /* Toplam KALIN: satırın hükmü bu, gözün duracağı yer. */
                    <td className="py-1 pr-2 text-right font-semibold tabular-nums">
                      {bicimle(toplamDeger(n))}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
