import { del, get, put } from "@vercel/blob";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  YEDEK HEDEFİ — TEK ARAYÜZ, İKİ UYGULAMA (K119a, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DOĞDU: 31.08.2026'da Vercel Blob deposu askıya alındı ve
 *  `npm run canli:yedek` ile `canli:ham-yedek` **ikisi de** düştü. Ölçüldü:
 *  21 yedek dosyasının ÜSTVERİSİ okunuyor ama İÇERİĞİ dört yolun dördünde de
 *  `403` — yani o gün **sıfır kullanılabilir yedek** vardı.
 *
 *  Sebep tek bir kütüphane çağrısının üç yere GÖMÜLÜ olmasıydı: `put()`
 *  `canli-yedek.ts`, `canli-ham-yedek.ts` ve `yedek-yaz.ts` içinde doğrudan
 *  duruyordu. Depo düşünce yedek almanın BAŞKA hiçbir yolu yoktu.
 *
 *  ── ⛔ ÜRETİM GÖVDESİNE DOKUNULMADI ────────────────────────────────────
 *  `yedekUret` ve `yedegiMetneCevir` hedeften ZATEN bağımsızdı — bu dosya
 *  yalnız "üretilen metni NEREYE koyacağız" sorusunu ayırıyor. İçerik
 *  üretimi tek gövdede kalıyor; elle alınan yedekle gece yedeği aynı şeyi
 *  içermeye devam ediyor.
 *
 *  ── ⚠ ARAYÜZ ÜÇ İŞ YAPAR: YAZ · LİSTELE · OKU ─────────────────────────
 *  **OKU zorunlu** ve bu ölçülmüş bir karardır: 31.08'de yazma da listeleme
 *  de "çalışıyor" görünüyordu; kırılan şey OKUMAYDI. Okuma arayüzde olmasa,
 *  bir hedefin sağlamlığı ancak felaket anında anlaşılırdı.
 *  _(Anayasa: "okunamayan yedek, yedek değildir".)_
 * ============================================================================
 */

export type YedekKaydi = {
  /** Hedef içindeki yol/ad — `yedek/selliora-2026-08-31.json`. */
  ad: string;
  boyut: number;
  yazildi: Date;
  /** Blob'da URL, dosyada tam yol. Gösterim için. */
  adres: string;
};

export type YedekHedefi = {
  /** Ekranda ve günlükte görünen ad. */
  readonly tur: "BLOB" | "DOSYA";
  readonly aciklama: string;
  yaz(ad: string, icerik: string): Promise<{ adres: string }>;
  listele(onek: string): Promise<YedekKaydi[]>;
  /**
   * İÇERİĞİ geri okur. Bulunamazsa `null`.
   *
   * ⛔ HATA YUTULMAZ: erişim reddi gibi durumlar FIRLATILIR. `null` yalnız
   * "böyle bir kayıt yok" demektir; ikisi karışırsa 403 alan bir hedef
   * "yedek yok" gibi görünür ve kimse bakmaz.
   */
  oku(ad: string): Promise<string | null>;
  sil(adlar: string[]): Promise<number>;
};

/* ═══════════════════════ VERCEL BLOB ═══════════════════════════════ */

/**
 * ⛔ MANIFEST DOSYASI — `list()` YERİNE (K192, 08.09.2026).
 *
 * Depo askısının SEBEBİ ölçüldü: **advanced operations 2000/2000 DOLU**.
 * Storage 217 MB/1 GB, simple ops 10/10k, transfer 2,38 MB/10 GB — hepsi
 * bol. Kotayı yakan tek şey `list()` çağrılarıydı ve en pahalısı çandı:
 * `uyari/topla.ts` HER PANEL ÇİZİMİNDE bir `list()` atıyordu.
 *
 * ⚠ VERİ KAYBI RİSKİ YOK: storage temiz, geri sayım yok — kapanan şey
 * ERİŞİM. Yuvarlanan pencere düşünce depo kendiliğinden açılır ve
 * `list()` kalktığı için bir daha dolmaz.
 */
const MANIFEST = "yedek/index.json";

export function blobHedefi(jeton?: string): YedekHedefi {
  const token = jeton ?? process.env.BLOB_READ_WRITE_TOKEN;

  /** Manifesti okur; yoksa BOŞ döner (henüz hiç yedek yazılmamış olabilir). */
  async function manifestOku(): Promise<YedekKaydi[]> {
    const sonuc = await get(MANIFEST, { access: "private", token });
    if (!sonuc) return [];
    if (sonuc.statusCode !== 200) {
      throw new Error(
        `Manifest okunamadı (${sonuc.statusCode}) — depo askıda olabilir.`,
      );
    }
    const metin = await new Response(sonuc.stream).text();
    const ham = JSON.parse(metin) as {
      ad: string;
      boyut: number;
      yazildi: string;
      adres: string;
    }[];
    return ham.map((k) => ({ ...k, yazildi: new Date(k.yazildi) }));
  }

  async function manifestYaz(kayitlar: YedekKaydi[]): Promise<void> {
    await put(MANIFEST, JSON.stringify(kayitlar), {
      access: "private",
      contentType: "application/json; charset=utf-8",
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
  }

  return {
    tur: "BLOB",
    aciklama: "Vercel Blob (özel)",
    async yaz(ad, icerik) {
      const { url } = await put(ad, icerik, {
        /**
         * ÖZEL — KAMUYA AÇIK DEĞİL. Bu dosyada satış, maliyet ve kâr
         * rakamları AÇIK METİN duruyor; adresin tahmin edilemez olması
         * gizlilik sayılmaz.
         */
        access: "private",
        contentType: "application/json; charset=utf-8",
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
      });
      /**
       * ⚠ MANIFEST YAZIMDAN SONRA GÜNCELLENİR — ve dosyanın KENDİSİ hâlâ
       * tek doğru kanıttır. Manifest yalnız bir DİZİNDİR; kaybolursa
       * yeniden kurulabilir, çünkü ad deseni belirlenimci
       * (`yedek/selliora-<gün>.json`). Bu yüzden manifest bir tek nokta
       * arıza değil, bir hızlandırıcıdır.
       */
      const kayitlar = (await manifestOku()).filter((k) => k.ad !== ad);
      kayitlar.push({
        ad,
        boyut: Buffer.byteLength(icerik, "utf8"),
        yazildi: new Date(),
        adres: url,
      });
      await manifestYaz(kayitlar);
      return { adres: url };
    },
    /**
     * ⛔ `list()` ÇAĞRILMAZ — kotayı yakan çağrı buydu. Kayıtlar manifestten
     * okunuyor ve `get()` bir SIMPLE işlem.
     */
    async listele(onek) {
      return (await manifestOku()).filter((k) => k.ad.startsWith(onek));
    },
    async oku(ad) {
      /**
       * ⛔ DÜZ `fetch` KULLANILMAZ — VE BU BİR ÖLÇÜM SONUCUDUR (08.09.2026).
       * Bu dosyalar `access: "private"` yazılıyor; özel bir blob'un URL'sine
       * jetonsuz `fetch` atmak TASARIM GEREĞİ `403` verir.
       *
       * ⛔ VE ARTIK ÖNCE `listele()` DE ÇAĞRILMIYOR (K192): `get()` zaten
       * pathname kabul ediyor ve bulunamayınca `null` dönüyor. Eski gövde
       * her okuma için bir `list()` harcıyordu — okuma başına bir advanced
       * operation.
       */
      const sonuc = await get(ad, { access: "private", token });
      if (!sonuc) return null;
      if (sonuc.statusCode !== 200) {
        /**
         * ⛔ SESSİZ `null` DÖNÜLMEZ. 31.08.2026'da tam bu ayrım kritikti:
         * dosya VARDI, okuma 403 veriyordu. `null` dönseydi araç "yedek
         * yok" der ve asıl arıza (askı) görünmezdi.
         */
        throw new Error(
          `Blob okunamadı (${sonuc.statusCode}) — ${ad}. Depo askıda olabilir.`,
        );
      }
      return new Response(sonuc.stream).text();
    },
    /**
     * ⛔ `del()` PATHNAME KABUL EDİYOR — ölçüldü (`@vercel/blob` tip
     * bildirimi: `urlOrPathname`). Eski gövde silinecek adresleri bulmak
     * için `list()` atıyordu; gerek yokmuş.
     */
    async sil(adlar) {
      if (adlar.length === 0) return 0;
      await del(adlar, { token });
      /**
       * ⚠ DÖNEN SAYI MANİFESTTEN ÖLÇÜLÜR, `adlar.length`ten DEĞİL: istenen
       * ile SİLİNEN aynı şey değildir ve "kaç sildim" sorusuna istediğim
       * sayıyı geri vermek ölçüm değil YANKI olurdu.
       */
      const kayitlar = await manifestOku();
      const kalan = kayitlar.filter((k) => !adlar.includes(k.ad));
      const silinen = kayitlar.length - kalan.length;
      await manifestYaz(kalan);
      return silinen;
    },
  };
}

/**
 * ⛔ `blobUstverisi` KALDIRILDI (K192, 08.09.2026) — ÇAĞIRANI YOKTU.
 *
 * K119a'da teşhis için yazılmıştı ve **hiçbir yerden çağrılmıyordu**
 * (ölçüldü: `src/` ve `scripts/` altında 0 kullanım). `head()` de depo
 * işlemi harcar; kotayı yakan sınıftan bir çağrıyı çağıransız tutmanın
 * hiçbir faydası yok, tek etkisi birinin onu "demek üstveri takip
 * ediliyor" diye okuması olurdu.
 * _(Anayasa: "yazıcısı olmayan alan iki şeyden biri olur — bağlanır ya da
 * KALDIRILIR; üçüncü seçenek kararın ertelenmesidir".)_
 */

/* ═══════════════════════ HEDEF SEÇİMİ ══════════════════════════════ */

/**
 * ⛔ HEDEF SEÇİMİ **BEYANLIDIR** — SESSİZ YEDEK HEDEFİ YOKTUR (K119b, 08.09.2026).
 *
 * "Blob düştüyse yerele yaz" ilk bakışta doğru görünüyor ve YANLIŞ olurdu:
 * gece yedeği ile "Şimdi yedek al" düğmesi **Vercel'de** koşuyor
 * (`vercel.json` → `crons`, bölge `fra1`) ve orada kalıcı disk YOK — yazılan
 * dosya işlev bitince kaybolur. Sessiz bir yerel yedek, ekranda "yedek
 * alındı" yazan ama bir saat sonra var olmayan bir dosya üretirdi:
 * **tam olarak kaçınmaya çalıştığımız yalancı yeşil.**
 *
 * Bu yüzden yerel hedef ancak AÇIKÇA istendiğinde seçilir
 * (`YEDEK_HEDEFI=DOSYA` + `YEDEK_KOK=...`) — operatörün kendi makinesinde,
 * betikle. Vercel'de bu değişkenler yok, dolayısıyla üretim yolu asla
 * kendiliğinden yerele düşmez.
 *
 * ⚠ VE "HEDEF YOK" BİR HATADIR, SESSİZLİK DEĞİL: çağıran `DEPO_YOK` alır ve
 * ekranda görünür. _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen
 * denetim, denetim değildir".)_
 */
export type HedefSecimi =
  | { tamam: true; hedef: YedekHedefi }
  | { tamam: false; kod: "DEPO_YOK"; mesaj: string };

export function varsayilanYedekHedefi(
  env: Record<string, string | undefined> = process.env,
): HedefSecimi {
  if (env.YEDEK_HEDEFI === "DOSYA") {
    const kok = env.YEDEK_KOK;
    if (!kok) {
      return {
        tamam: false,
        kod: "DEPO_YOK",
        mesaj:
          "YEDEK_HEDEFI=DOSYA seçilmiş ama YEDEK_KOK tanımlı değil — hedef klasör belirtilmeden yerel yedek yazılmaz.",
      };
    }
    return { tamam: true, hedef: dosyaHedefi(kok) };
  }

  if (env.BLOB_READ_WRITE_TOKEN) {
    return { tamam: true, hedef: blobHedefi(env.BLOB_READ_WRITE_TOKEN) };
  }

  return {
    tamam: false,
    kod: "DEPO_YOK",
    mesaj:
      "Yedek hedefi yok: Vercel Blob deposu bağlı değil ve YEDEK_HEDEFI=DOSYA seçilmemiş.",
  };
}

/* ═══════════════════════ YEREL DOSYA ═══════════════════════════════ */

/**
 * Yerel klasör hedefi.
 *
 * ⚠ BU BİR "GEÇİCİ ÇÖZÜM" DEĞİL, İKİNCİ BİR HEDEFTİR. Tek hedefe bağlı
 * kalmak 31.08'de sıfır yedeğe düşürdü; ikinci hedef o sınıfın ilacıdır.
 *
 * ⛔ KLASÖR DEPOYA GİRMEZ — canlı veri taşır (`.gitignore`).
 */
export function dosyaHedefi(kok: string): YedekHedefi {
  const tamYol = (ad: string) => join(kok, ad.replace(/\//g, "__"));
  return {
    tur: "DOSYA",
    aciklama: `Yerel klasör (${kok})`,
    async yaz(ad, icerik) {
      mkdirSync(kok, { recursive: true });
      const yol = tamYol(ad);
      writeFileSync(yol, icerik, "utf8");
      return { adres: yol };
    },
    async listele(onek) {
      let adlar: string[];
      try {
        adlar = readdirSync(kok);
      } catch {
        /** Klasör henüz yoksa "kayıt yok" demektir — hata değil. */
        return [];
      }
      const arananOnek = onek.replace(/\//g, "__");
      return adlar
        .filter((a) => a.startsWith(arananOnek))
        .map((a) => {
          const s = statSync(join(kok, a));
          return {
            ad: a.replace(/__/g, "/"),
            boyut: s.size,
            yazildi: s.mtime,
            adres: join(kok, a),
          };
        });
    },
    async oku(ad) {
      try {
        return readFileSync(tamYol(ad), "utf8");
      } catch (e) {
        /** ⛔ YALNIZ "YOK" `null` DÖNER; izin/okuma hatası FIRLATILIR. */
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    },
    async sil(adlar) {
      let n = 0;
      for (const a of adlar) {
        try {
          unlinkSync(tamYol(a));
          n += 1;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        }
      }
      return n;
    },
  };
}
