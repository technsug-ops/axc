import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { tabloNoktalari } from "@/lib/tablo-sirasi";

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
  /**
   * DÖRDÜNCÜ SERİ — İSTEĞE BAĞLI (K126, 01.09.2026).
   *
   * ⛔ ZORUNLU YAPILMADI: bileşen üç seriyle çağrılan yerlerde çalışmaya
   * devam etmeli. `undefined` gelirse dördüncü çizgi hiç çizilmez —
   * "yarım çizilen seri, olmayan seriden kötüdür" kuralı toplam serisinde
   * zaten böyle kurulmuştu, aynısı burada.
   */
  d?: number;
  /** Bu noktanın süzülmüş adresleri; yoksa nokta tıklanamaz. */
  adres?: { a: string; b: string; c: string; d?: string };
};

/**
 * ⚠ İKİ GEOMETRİ (K258): çizgi kipi tam genişlik için (1240), sütun kipi
 * 2/5 sütun için (640) kurulu. Tek geometriyle iki kip olmaz: 1240'lık
 * viewBox 2/5'te ~2,6× küçülür ve yazılar okunmaz (ölçüldü).
 */
const G_CIZGI = {
  genislik: 1240,
  yukseklik: 280,
  sol: 110,
  sag: 16,
  ust: 16,
  alt: 34,
} as const;
const G_SUTUN = {
  genislik: 640,
  yukseklik: 300,
  sol: 64,
  sag: 12,
  ust: 16,
  alt: 34,
} as const;
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
  /**
   * ⭐ DÖRDÜNCÜ RENK MOR (`d`) — üç renkten de yeterince uzak ve hem açık
   * hem koyu temada okunur. Sipariş serisi (K126) buradan çiziliyor.
   *
   * ⚠ MAL KABULE YAKIN BİR YEŞİL TONU SEÇİLMEDİ: iki seri akraba işler
   * (sipariş → kabul) ve yakın tonlar "aynı şeyin iki hâli" izlenimi
   * verirdi. Onlar AYRI iki iş; renk de ayrı.
   */
  d: "#9333ea",
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
  sekil = "cizgi",
}: {
  noktalar: UcSeriNoktasi[];
  adlar: { a: string; b: string; c: string; d?: string };
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
  /**
   * ÇİZGİ mi SÜTUN mu (K258, demo). SÜTUN: her kova için gruplanmış dört
   * çubuk — seriler, tıklama hedefleri, özet ve tablo AYNEN kalır; yalnız
   * şekil değişir. Kullanıcı 21.08.2026'da dört seriyi «aynı grafikte»
   * istedi; demonun iki serili sütunu o isteği yarıya indirirdi — burada
   * dört seri sütun olarak duruyor. Operasyon SAYILABİLİR olaydır; sütun
   * ona, çizgi paraya (sürekli değer) yakışır.
   */
  sekil?: "cizgi" | "sutun";
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
   * ⚠ DÖRDÜNCÜ SERİ DE İKİ ŞARTLI: adı verilmiş VE her noktada sayısı var.
   * Yalnız ad verilip veri gelmezse çizgi `NaN`a düşer ve grafik BOŞ değil
   * BOZUK çizilir — toplam serisinde öğrenilen aynı ders.
   */
  const dVar =
    adlar.d !== undefined && noktalar.every((n) => typeof n.d === "number");
  const dDeger = (n: UcSeriNoktasi) => n.d ?? 0;

  const sutunMu = sekil === "sutun";
  const G = sutunMu ? G_SUTUN : G_CIZGI;
  const IC_GENISLIK = G.genislik - G.sol - G.sag;
  const IC_YUKSEKLIK = G.yukseklik - G.ust - G.alt;

  /**
   * ⚠ TOPLAM EKSENE DAHİL. Dahil edilmezse toplam çizgisi tavanı aşar ve
   * grafiğin ÜSTÜNDEN taşar — okunmaz olur.
   */
  /**
   * ⚠ ÇİZİLEN HER SERİ EKSENE DAHİL. Biri dışarıda kalırsa çizgisi grafiğin
   * ÜSTÜNDEN taşar ve okunmaz olur — toplam serisinde bir kez yaşandı.
   */
  const tumu = noktalar.flatMap((n) => [
    n.a,
    n.b,
    n.c,
    ...(dVar ? [dDeger(n)] : []),
    ...(toplamVar ? [toplamDeger(n)] : []),
  ]);
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

  /** Sütunda her kova bir YUVA (eşit genişlik); çizgide uçlar kenara yaslı. */
  const yuva = IC_GENISLIK / Math.max(1, noktalar.length);
  const x = (i: number) =>
    sutunMu
      ? G.sol + (i + 0.5) * yuva
      : noktalar.length === 1
        ? G.sol + IC_GENISLIK / 2
        : G.sol + (i / (noktalar.length - 1)) * IC_GENISLIK;
  const y = (d: number) =>
    G.ust + IC_YUKSEKLIK - ((d - taban) / (tavan - taban)) * IC_YUKSEKLIK;

  /* Dar kipte daha seyrek etiket: 2/5 sütunda 10 etiket üst üste binerdi. */
  const adim = Math.max(1, Math.ceil(noktalar.length / (sutunMu ? 6 : 10)));

  /**
   * ⛔ SIRA OPERASYON HUNİSİDİR, ALFABE DEĞİL: dördüncü seri (`d`) EN BAŞTA
   * duruyor çünkü iş oradan başlıyor — sipariş → mal kabul → satış → kargo.
   * Sona eklenseydi gösterge ve tablo, işin yapılış sırasını yalanlardı.
   */
  /**
   * ⚠ SERİ DEĞERİ TEK KAPIDAN OKUNUR. `n[anahtar]` doğrudan okunsaydı `d`
   * için `number | undefined` dönerdi ve her kullanım yerinde ayrı ayrı
   * `?? 0` yazmak gerekirdi — biri unutulduğunda `NaN` grafiğe düşer ve
   * çizgi sessizce kaybolur. Tek gövde, tek kural.
   */
  const seriDegeri = (n: UcSeriNoktasi, anahtar: "a" | "b" | "c" | "d") =>
    anahtar === "d" ? dDeger(n) : n[anahtar];

  const seriler = [
    ...(dVar ? [{ anahtar: "d" as const, ad: adlar.d ?? "", renk: RENK.d }] : []),
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
              className={sutunMu ? "inline-block size-3 rounded-sm" : "inline-block h-1 w-4 rounded"}
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

        {sutunMu
          ? /* GRUPLANMIŞ SÜTUNLAR — her kovada seri başına bir çubuk. Çubuk
               tıklanabilir (<a>), çizgi kipindeki noktayla aynı hedef. */
            noktalar.map((n, i) => {
              const grup = yuva * 0.78;
              const cubuk = grup / seriler.length;
              const sol = x(i) - grup / 2;
              return seriler.map((s, k) => {
                const deger = seriDegeri(n, s.anahtar);
                const y0 = y(0);
                const y1 = y(deger);
                const dikd = (
                  <rect
                    x={sol + k * cubuk}
                    y={Math.min(y0, y1)}
                    width={Math.max(1, cubuk - 1)}
                    height={Math.max(0.5, Math.abs(y0 - y1))}
                    fill={s.renk}
                    rx={1.5}
                  />
                );
                const adres = n.adres?.[s.anahtar];
                const baslik = `${n.tamEtiket} · ${s.ad}: ${bicimle(deger)}`;
                return adres ? (
                  <a key={`${s.anahtar}-${i}`} href={adres} aria-label={baslik}>
                    <title>{baslik}</title>
                    {dikd}
                  </a>
                ) : (
                  <g key={`${s.anahtar}-${i}`} aria-hidden>
                    {dikd}
                  </g>
                );
              });
            })
          : seriler.map((s) => (
              <path
                key={s.anahtar}
                aria-hidden
                d={yol((n) => seriDegeri(n, s.anahtar))}
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

        {/* TIKLANABİLİR NOKTALAR — her seri için ayrı hedef (çizgi kipi;
            sütunda çubuğun kendisi hedef). */}
        {sutunMu ? null : seriler.map((s) =>
          noktalar.map((n, i) => {
            const cx = x(i);
            const cy = y(seriDegeri(n, s.anahtar));
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
                aria-label={`${n.tamEtiket} · ${s.ad}: ${bicimle(seriDegeri(n, s.anahtar))}`}
              >
                <title>{`${n.tamEtiket} · ${s.ad}: ${bicimle(seriDegeri(n, s.anahtar))}`}</title>
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
              {/**
               * ⛔ EN YENİ ÜSTTE — KULLANICI KARARI 01.09.2026.
               * Tablo bir DÖKÜMDÜR: göz önce EN SON olana bakar. Grafik ise
               * AYNI diziyi ham hâliyle kullanıyor çünkü soldan sağa zamanı
               * çiziyor; ters çevrilseydi yükselen seri düşüyor görünürdü.
               * İkisi de doğru, ikisi ayrı soruya cevap veriyor.
               */}
              {tabloNoktalari(noktalar).map((n, i) => (
                <tr key={n.tamEtiket + i} className="border-b last:border-0">
                  <td className="text-muted-foreground py-1 pr-2 whitespace-nowrap">
                    {n.tamEtiket}
                  </td>
                  {seriler.map((s) => {
                    const adres = n.adres?.[s.anahtar];
                    const deger = bicimle(seriDegeri(n, s.anahtar));
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
