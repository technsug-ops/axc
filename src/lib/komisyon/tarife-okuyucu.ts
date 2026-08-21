import { basligiNormalle } from "@/lib/tablo/hucre";

/**
 * ============================================================================
 *  KOMİSYON TARİFESİ OKUYUCUSU — DİLİMLİ YAPI, SAF HESAP
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ. Girdi ham satırlar, çıktı tarife + kalemler.
 *  Gerçek dosya olmadan sınanabilir (`tarife:dogrula`).
 *
 *  ⚠ MEVCUT `okuyucu.ts` NİYE YETMİYOR: o, satır başına TEK oran alıyor
 *  (`GÜNCEL KOMİSYON`) ve dilim kolonlarını hiç görmüyor. Bu modül dosyanın
 *  ATTIĞIMIZ kısmını okur — dört dilim, limitleri ve geçerlilik penceresi.
 *
 *  ── DOSYADAN ÖLÇÜLEN YAPI (18.08.2026, 161 satır) ───────────────────────
 *  · Dört dilim, İSTİSNASIZ: 161/161 satırda dördü de dolu.
 *  · Altı limit kolonu: `1.Fiyat Alt Limit` · `2.Fiyat Üst Limiti` /
 *    `2.Fiyat Alt Limit` · `3.Fiyat Üst Limiti` / `3.Fiyat Alt Limit` ·
 *    `4.Fiyat Üst Limiti`. **1. dilimin ÜSTÜ, 4. dilimin ALTI açıktır.**
 *  · `1.KOMİSYON`…`4.KOMİSYON` başlıkları dosyada İKİ KEZ geçer — iki
 *    pencere yuvası için. **Yalnız DOLU olan blok geçerlidir**; ölçümde
 *    3 Gün bloğu 161/161 boştu, 4 Gün bloğu doluydu.
 *  · Dilim, fiyat düştükçe ucuzlar: 769,99+ → %18 · 701,29-769,98 → %12,8
 *    · 641,09-701,28 → %11,1 · 641,08 altı → %9,3. Trendyol'un mekanizması
 *    "fiyatı düşürene komisyon indirimi".
 * ============================================================================
 */

/** Bir ürünün bir dilimi. */
export type TarifeDilimi = {
  sira: number;
  /** null = alt uç AÇIK (son dilim). */
  altLimit: number | null;
  /** null = üst uç AÇIK (ilk dilim). */
  ustLimit: number | null;
  oran: number;
};

/** Bir ürünün tarife satırı. */
export type TarifeSatiri = {
  barkod: string;
  saticiStokKodu: string | null;
  urunAdi: string | null;
  dilimler: TarifeDilimi[];
  /**
   * Dosyadaki `GÜNCEL KOMİSYON` — KANALIN KENDİ BEYANI.
   *
   * ⚠ `ChannelSku.commissionRate` BUNDAN gelir; sistem fiyattan dilim
   * çözerek TÜRETMEZ (mimar kararı 18.08.2026). İki kaynak ayrışabilir
   * ve tek doğru kanalın beyanıdır. Fiyatlama aracı türetme yapar ama o
   * SİMÜLASYONDUR, kayıt değil.
   */
  guncelKomisyon: number | null;
  satirNo: number;
};

export type TarifePenceresi = { baslangic: Date; bitis: Date };

export type TarifeOkumasi = {
  pencere: TarifePenceresi | null;
  tarifeGrubu: string | null;
  satirlar: TarifeSatiri[];
  /** Aynı barkod birebir tekrar etmişse kaç satır elendi. */
  mukerrerElenen: number;
  /** Okunamayan satırlar — sessizce düşmez, sayılır ve gösterilir. */
  atlananlar: { satirNo: number; sebep: string }[];
  eksikSutunlar: string[];
};

const AYLAR: Record<string, number> = {
  ocak: 1,
  "şubat": 2,
  subat: 2,
  mart: 3,
  nisan: 4,
  "mayıs": 5,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  "ağustos": 8,
  agustos: 8,
  "eylül": 9,
  eylul: 9,
  ekim: 10,
  "kasım": 11,
  kasim: 11,
  "aralık": 12,
  aralik: 12,
};

const PENCERE_DESENI =
  /(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{1,2})[.:](\d{2})/;

/**
 * Bir anın Europe/Istanbul ofseti (ms). Ortamın saat dilimi ASLA
 * kullanılmaz (anayasa kuralı) ve sabit +3 YAZILMAZ: yaz saati uygulaması
 * geri gelirse sabit ofset her tarifeyi sessizce bir saat kaydırırdı.
 */
function istanbulOfsetiMs(an: Date): number {
  const parcalar = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(an);
  const al = (tur: string) =>
    Number(parcalar.find((p) => p.type === tur)?.value ?? 0);
  const yerel = Date.UTC(
    al("year"),
    al("month") - 1,
    al("day"),
    al("hour") % 24,
    al("minute"),
    al("second"),
  );
  return yerel - an.getTime();
}

/** İŞ saat dilimindeki duvar saatini gerçek ana çevirir. */
function isSaatinden(
  yil: number,
  ay: number,
  gun: number,
  saat: number,
  dakika: number,
): Date {
  const varsayilan = Date.UTC(yil, ay - 1, gun, saat, dakika);
  const ofset = istanbulOfsetiMs(new Date(varsayilan));
  return new Date(varsayilan - ofset);
}

/**
 * PENCERE METNİNİ ÇÖZER: "14 Ağustos 08.00-18 Ağustos 07.59"
 *
 * ⚠ METİNDE YIL YOK. Yıl yükleme anından alınır ve ARALIK→OCAK dönümü
 * ayrıca ele alınır: bitiş ayı başlangıçtan küçükse bitiş yılı BİR
 * FAZLADIR. Yazılmasaydı yılda bir kez pencere "geçmişte bitmiş" görünür
 * ve tarife hiç geçerli sayılmazdı — sessiz, yılda bir tekrarlayan hata.
 */
export function pencereCoz(metin: string, bugun: Date): TarifePenceresi | null {
  const temiz = String(metin ?? "").trim();
  if (temiz === "") return null;

  const e = PENCERE_DESENI.exec(temiz);
  if (!e) return null;

  const ayCoz = (ad: string) => AYLAR[ad.toLocaleLowerCase("tr")] ?? null;
  const ay1 = ayCoz(e[2]);
  const ay2 = ayCoz(e[6]);
  if (ay1 === null || ay2 === null) return null;

  const yil = bugun.getUTCFullYear();
  const baslangic = isSaatinden(yil, ay1, Number(e[1]), Number(e[3]), Number(e[4]));
  const bitisYili = ay2 < ay1 ? yil + 1 : yil;
  const bitis = isSaatinden(bitisYili, ay2, Number(e[5]), Number(e[7]), Number(e[8]));

  return { baslangic, bitis };
}

/** Hücreyi sayıya çevirir; çözülemezse null. */
function sayi(ham: unknown): number | null {
  if (ham === null || ham === undefined) return null;
  if (typeof ham === "number") return Number.isFinite(ham) ? ham : null;
  const metin = String(ham).trim().replace(/\s/g, "").replace(",", ".");
  if (metin === "") return null;
  const deger = Number(metin);
  return Number.isFinite(deger) ? deger : null;
}

/** Başlık dizini — aynı başlık birden çok kez geçebilir, hepsi tutulur. */
function dizinle(basliklar: unknown[]): Map<string, number[]> {
  const dizin = new Map<string, number[]>();
  basliklar.forEach((baslik, i) => {
    const ad = basligiNormalle(String(baslik ?? ""));
    if (ad === "") return;
    dizin.set(ad, [...(dizin.get(ad) ?? []), i]);
  });
  return dizin;
}

const LIMIT_BASLIKLARI = [
  "1.Fiyat Alt Limit",
  "2.Fiyat Üst Limiti",
  "2.Fiyat Alt Limit",
  "3.Fiyat Üst Limiti",
  "3.Fiyat Alt Limit",
  "4.Fiyat Üst Limiti",
];

export function tarifeOku(veri: unknown[][], bugun: Date): TarifeOkumasi {
  const bos: TarifeOkumasi = {
    pencere: null,
    tarifeGrubu: null,
    satirlar: [],
    mukerrerElenen: 0,
    atlananlar: [],
    eksikSutunlar: [],
  };
  if (veri.length === 0) return { ...bos, eksikSutunlar: ["(dosya boş)"] };

  const dizin = dizinle(veri[0]);
  const tek = (ad: string) => dizin.get(basligiNormalle(ad))?.[0] ?? -1;

  const iBarkod = tek("BARKOD");
  const iStok = tek("SATICI STOK KODU");
  const iAd = tek("ÜRÜN İSMİ");
  const iGuncel = tek("GÜNCEL KOMİSYON");
  const iGrup = tek("TARİFE GRUBU");

  const eksik: string[] = [];
  if (iBarkod < 0) eksik.push("BARKOD");

  const limitler = LIMIT_BASLIKLARI.map((b) => tek(b));
  if (limitler.some((k) => k < 0)) eksik.push("fiyat limit kolonları");

  /** Komisyon başlıkları İKİ KEZ geçer — her blok ayrı toplanır. */
  const komBloklari: number[][] = [];
  const birinci = dizin.get(basligiNormalle("1.KOMİSYON")) ?? [];
  for (let blok = 0; blok < birinci.length; blok++) {
    const kolonlar = [1, 2, 3, 4].map(
      (n) => (dizin.get(basligiNormalle(`${n}.KOMİSYON`)) ?? [])[blok] ?? -1,
    );
    if (kolonlar.every((k) => k >= 0)) komBloklari.push(kolonlar);
  }
  if (komBloklari.length === 0) eksik.push("komisyon kolonları");
  if (eksik.length > 0) return { ...bos, eksikSutunlar: eksik };

  const satirlar = veri
    .slice(1)
    .filter((r) => r.some((c) => c !== null && String(c ?? "").trim() !== ""));

  /**
   * HANGİ KOMİSYON BLOĞU GEÇERLİ: DOLU OLAN.
   *
   * İki pencere yuvasından o hafta hangisi yayımlandıysa o dolu gelir.
   * "İlkini al" deseydik ölçülen dosyada TAMAMEN BOŞ bloğu okur ve
   * tarifeyi oransız yazardık — üstelik sessizce.
   */
  const doluluk = komBloklari.map(
    (kolonlar) =>
      satirlar.filter((r) => kolonlar.every((k) => sayi(r[k]) !== null)).length,
  );
  const enDolu = Math.max(...doluluk);
  if (enDolu === 0) {
    return { ...bos, eksikSutunlar: ["komisyon değerleri (tüm bloklar boş)"] };
  }
  const blokSirasi = doluluk.indexOf(enDolu);
  const seciliBlok = komBloklari[blokSirasi];

  /**
   * PENCERE, SEÇİLEN BLOĞUN KENDİ TARİH KOLONUNDAN.
   *
   * ⚠ ÖNCE "İLK ÇÖZÜLEBİLEN" ALINIYORDU ve bu bir KAPSAM TUZAĞIYDI:
   * oranlar dolu bloktan, pencere ise kolon sırasına göre İLK okunabilen
   * tarihten geliyordu. Bugüne kadar tutmasının sebebi kural değil
   * TESADÜFTÜ — elimizdeki iki dosyada da bloklardan biri tamamen boştu,
   * dolayısıyla boş bloğun tarihi zaten çözülemiyordu.
   *
   * İki blok birden dolu gelen bir dosyada (Trendyol'un biçimi bunu açıkça
   * öngörüyor: "3 Gün" ve "4 Gün" yuvaları) oranlar bir pencereden,
   * ETİKET öteki pencereden yazılırdı. Sonuç sessizce yanlış olurdu:
   * rakamlar makul, tarih makul, ikisi birbirine ait DEĞİL.
   *
   * Blok sırası ile tarih kolonu sırası aynı: her "Tarih aralığı (N Gün)"
   * kolonunu kendi 1-4.KOMİSYON dördülü izliyor. Eşi çözülemezse ötekilere
   * düşülür — dosya biçimi değişirse pencere büsbütün kaybolmasın.
   */
  let pencere: TarifePenceresi | null = null;
  const tarihKolonlari = [...dizin.entries()]
    .filter(([ad]) => ad.includes("tarih") && ad.includes("aral"))
    .flatMap(([, kolonlar]) => kolonlar);
  const esKolon = tarihKolonlari[blokSirasi];
  const pencereKolonlari =
    esKolon === undefined
      ? tarihKolonlari
      : [esKolon, ...tarihKolonlari.filter((k) => k !== esKolon)];
  for (const kolon of pencereKolonlari) {
    for (const r of satirlar) {
      const cozulen = pencereCoz(String(r[kolon] ?? ""), bugun);
      if (cozulen) {
        pencere = cozulen;
        break;
      }
    }
    if (pencere) break;
  }

  const tarifeGrubu =
    iGrup >= 0 ? String(satirlar[0]?.[iGrup] ?? "").trim() || null : null;

  const cikti: TarifeSatiri[] = [];
  const gorulen = new Set<string>();
  let mukerrer = 0;
  const atlananlar: { satirNo: number; sebep: string }[] = [];

  for (const [i, r] of satirlar.entries()) {
    const satirNo = i + 2;
    const barkod = String(r[iBarkod] ?? "").trim();
    if (barkod === "") {
      atlananlar.push({ satirNo, sebep: "barkod boş" });
      continue;
    }

    const oranlar = seciliBlok.map((k) => sayi(r[k]));
    if (oranlar.some((o) => o === null)) {
      atlananlar.push({ satirNo, sebep: "dilim oranı eksik" });
      continue;
    }
    const lim = limitler.map((k) => sayi(r[k]));

    /**
     * DİLİM SINIRLARI — uçlar AÇIK.
     *   1: lim0 ve üzeri        2: lim2 - lim1
     *   3: lim4 - lim3          4: lim5 ve altı
     */
    const dilimler: TarifeDilimi[] = [
      { sira: 1, altLimit: lim[0], ustLimit: null, oran: oranlar[0]! },
      { sira: 2, altLimit: lim[2], ustLimit: lim[1], oran: oranlar[1]! },
      { sira: 3, altLimit: lim[4], ustLimit: lim[3], oran: oranlar[2]! },
      { sira: 4, altLimit: null, ustLimit: lim[5], oran: oranlar[3]! },
    ];

    /**
     * MÜKERRER SATIR ELENİR — ölçüldü: dosyada bir barkod iki kez geçiyor
     * ve iki satır BİREBİR aynıydı. "İki dilim seti" sanılmamalı.
     *
     * İmza dilimleri de kapsar: aynı barkod FARKLI tarifeyle gelirse o
     * mükerrer değildir, gerçek bir çelişkidir ve elenmemeli.
     */
    const imza = `${barkod}|${dilimler
      .map((d) => `${d.altLimit}-${d.ustLimit}:${d.oran}`)
      .join(",")}`;
    if (gorulen.has(imza)) {
      mukerrer++;
      continue;
    }
    gorulen.add(imza);

    cikti.push({
      barkod,
      saticiStokKodu: iStok >= 0 ? String(r[iStok] ?? "").trim() || null : null,
      urunAdi: iAd >= 0 ? String(r[iAd] ?? "").trim() || null : null,
      dilimler,
      guncelKomisyon: iGuncel >= 0 ? sayi(r[iGuncel]) : null,
      satirNo,
    });
  }

  return {
    pencere,
    tarifeGrubu,
    satirlar: cikti,
    mukerrerElenen: mukerrer,
    atlananlar,
    eksikSutunlar: [],
  };
}

/**
 * Bir fiyatın hangi dilime düştüğü.
 *
 * ⚠ Bu FİYATLAMA ARACININ hesabıdır — kayda YAZILMAZ. Kayıt, kanalın
 * kendi beyanı olan `GÜNCEL KOMİSYON`dan gelir (mimar kararı 18.08.2026).
 * İki kaynak ayrışırsa doğru olan kanalın beyanıdır; bu fonksiyon
 * "fiyatı şuraya çeksem ne olurdu" sorusunu yanıtlar.
 */
export function dilimBul(
  dilimler: TarifeDilimi[],
  fiyat: number,
): TarifeDilimi | null {
  for (const d of [...dilimler].sort((a, b) => a.sira - b.sira)) {
    const altTamam = d.altLimit === null || fiyat >= d.altLimit;
    const ustTamam = d.ustLimit === null || fiyat <= d.ustLimit;
    if (altTamam && ustTamam) return d;
  }
  return null;
}
