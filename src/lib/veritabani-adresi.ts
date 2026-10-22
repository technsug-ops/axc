/**
 * ============================================================================
 *  VERİTABANI ADRESİ — BAĞLANTI HAVUZU AYARLARI
 * ----------------------------------------------------------------------------
 *  ÖLÇÜLDÜ 13.08.2026 (canlı sunucu, All-Inkl/KAS):
 *
 *      max_user_connections : 25      <- HESAP BAŞINA TAVAN
 *      max_connections      : 500     (sunucu geneli, paylaşımlı)
 *      wait_timeout         : 120 sn  <- boştaki bağlantıyı sunucu düşürür
 *
 *  Bu ayarlar OLMADAN sürücünün varsayılanları geçerliydi ve üçü de bu
 *  sunucuya yanlıştı:
 *
 *      connectionLimit 10  ·  minimumIdle 10  ·  idleTimeout 1800 sn
 *
 *  Ortadaki asıl suçluydu: `minimumIdle` varsayılan olarak `connectionLimit`e
 *  eşit ve havuz o kadar bağlantıyı HİÇ İŞ YOKKEN açık tutuyor. Ölçümde
 *  hesabın 25 bağlantılık kotasının 16'sı boşta (`Sleep`) duruyordu.
 *
 *  KRİTİK NOKTA: kotayı tüketen kullanıcı sayısı değil, EŞZAMANLI VERCEL
 *  FONKSİYON ÖRNEĞİ sayısıdır. Her örnek kendi PrismaClient'ını, o da kendi
 *  havuzunu kurar. 10 bağlantı/örnek ile 25 ÷ 10 = 2,5 → ÜÇÜNCÜ ÖRNEK ÇÖKER.
 *  Tek kullanıcı bile art arda tıklayınca birden fazla örnek doğurabilir.
 *
 *  PRISMA'NIN `connection_limit` PARAMETRESİ BURADA GEÇMEZ. Prisma 7'de
 *  bağlantı sürücü adaptörüyle kurulur; adaptör adresi olduğu gibi
 *  `mariadb.createPool()`'a verir. Havuzu Prisma değil mariadb sürücüsü
 *  yönetir ve parametre adı `connectionLimit`tir (camelCase).
 *
 *  NEDEN ADRESE DEĞİL KODA YAZILDI: Vercel'deki ortam değişkenine parametre
 *  eklemek de işe yarardı ama bir sonraki düzenlemede sessizce silinir ve
 *  hata aylar sonra, hiç ilgisiz bir işin ortasında geri döner. Kodda durursa
 *  sürüm kontrolündedir ve tek satırda değişir.
 * ============================================================================
 */

/**
 * Uygulama havuzu — 25 ÷ 3 ≈ 8 eşzamanlı örnek sığar (bugün 2 bekleniyor).
 *
 * connectionLimit 3 : bir istek genelde 1 bağlantı kullanır; 3, sayfanın
 *                     paralel sorguları ve $transaction için pay bırakır.
 *                     Yetmezse istek KUYRUĞA girer, hata almaz.
 * minimumIdle 1     : havuz boşta 1 bağlantı tutar, 3 değil. Varsayılanı
 *                     `connectionLimit`e eşittir — asıl israf oradaydı.
 * idleTimeout 60    : sunucunun 120 sn'lik wait_timeout'undan KISA olmalı ki
 *                     bağlantıyı önce biz kapatalım. Aksi hâlde havuz,
 *                     sunucunun çoktan düşürdüğü bağlantıyı canlı sanır —
 *                     "ara ara gelen açıklanamaz hata"nın klasik kaynağı.
 *
 *  ⚠ `minimumIdle=0` YAZMAYIN — DENENDİ VE BAĞLANTIYI TAMAMEN KIRIYOR.
 *  13.08.2026'da ölçüldü: bu değerle Prisma adaptörü hiç bağlantı kuramadı,
 *  havuz boş kaldı ve her sorgu 10 sn sonra `pool timeout ... active=0
 *  idle=0` ile düştü. Tuzağın sinsiliği şurada: ham mariadb sürücüsüyle
 *  `minimumIdle=0` SORUNSUZ çalışıyor, hata yalnız Prisma adaptörü
 *  üzerinden çıkıyor. Yani "sürücü belgesine baktım, geçerli bir değer"
 *  demek yetmiyor — bu kurulumda ölçmek gerekiyor.
 *  Park sayısını düşürmenin çalışan yolu `minimumIdle=1`'dir:
 *  ölçüldü, havuz 3 yerine 1 bağlantı park ediyor.
 */
/**
 * ⚠ `minimumIdle` 1 → 3 (K332, 12.10.2026) — YUKARIDAKİ GEREKÇE SİLİNMEDİ,
 * KAPSAMI DEĞİŞTİ. İsraf sınır 10 iken gerçekti (örnek başına 10 park, kota
 * 25). Sınır 3 iken sabit havuz örnek başına en fazla 3 bağlantı tutar →
 * 25 ÷ 3 ≈ 8 örnek sığar. Ölçüldü (canlı, 12.10): bağlantıyı YENİDEN kurmak
 * ~0,54 sn (`/api/cron/sicak` ilk çağrı 560 ms, sonrakiler 21 ms). Panel aynı
 * anda 3 bağlantı kullanıyor; 1 park edildiğinde öteki ikisi panelin içinde
 * sıfırdan kuruluyordu. Sürücü belgesi de sabit havuzu öneriyor
 * («Recommendation is to use fixed pool»). Bağlantıların KAS'ın 120 sn'lik
 * `wait_timeout`una düşmemesi için sıcak tutma ucu dakikada bir ÜÇÜNÜ birden
 * kullanır. ⛔ `minimumIdle=0` YASAĞI AYNEN GEÇERLİ.
 */
/**
 * ⚠ 3 → 5 (K332, kullanıcı kararı 13.10.2026 «5 yap»). Yerel ölçüm (28 ms gecikme
 * aracı): panel ana okuma 3 bağlantıda ~2,3 sn, 4'te ~2,1, 6'da ~1,8; 10, 6'dan iyi
 * değil. 6 SEÇİLMEDİ: canlıda tepe (çekimler küçük havuza alındıktan sonra) 13;
 * kötü anda 3 sayfa kopyası × 6 + çekimler ≈ 27 > 25 (`max_user_connections`).
 * 5'te ≈ 24. Sıcak tutma ucu bu sayıyı buradan okur (`SAYFA_HAVUZU_BOYUTU`).
 */
/**
 * ⛔ `minimumIdle` 5 → 1 (K355, kullanıcı «önce problemi çöz», 22.10.2026) — 12.10/13.10
 * gerekçeleri SİLİNMEDİ, bedeli ÖLÇÜLDÜ. Sabit havuz kopya başına 5 bağlantıyı HER ZAMAN
 * açık tutuyordu ve sıcak tutma dakikada bir beşini birden canlı tutuyordu: 5 kopya × 5 =
 * 25 = `max_user_connections`. Kota dolunca yeni kopya bağlantı AÇAMADI → Vercel kaydı
 * (erişim 22.10'da açıldı): `pool timeout … active=0 idle=0`, son 72 saatte ~360 satır,
 * 21 ayrı yayında; kullanıcı «30 sn açılmadı · 404 · şifre sayfasına attı».
 * Kopya sayısını büyüten: sık yayın + açık eski sekmeler (eski sürümler ayakta kalır) +
 * dakikalık sorgular (kasa sesi · hedef) + çekimler. Artık boştaki kopya 1 bağlantı
 * tutar (kota ≈ 20+ kopyaya yeter); yoğunlukta 5'e kadar açar, 60 sn boşta 1'e iner.
 * Bedeli: ilave bağlantı kurulumu ~0,5 sn (12.10 ölçümü) — kesintiden çok küçük.
 * ⛔ `minimumIdle=0` YASAĞI AYNEN GEÇERLİ.
 */
const UYGULAMA_HAVUZU = {
  connectionLimit: "5",
  minimumIdle: "1",
  idleTimeout: "60",
} as const;

/** Sayfa havuzunun üst sınırı (yoğunlukta açılabilecek bağlantı). */
export const SAYFA_HAVUZU_BOYUTU = Number(UYGULAMA_HAVUZU.connectionLimit);
/**
 * Sıcak tutma ucunun yokladığı bağlantı sayısı = boşta tutulan sayı (K355). Eskiden
 * havuzun TAMAMI yoklanıyordu; `minimumIdle` düşse bile uç her dakika beşini yeniden
 * açar ve düzeltme işe yaramazdı.
 */
export const SICAK_TUTULAN_BAGLANTI = Number(UYGULAMA_HAVUZU.minimumIdle);

/**
 * ARKA PLAN HAVUZU (K332, 13.10.2026) — çekim uçları gibi `maxDuration` taşıyan
 * arka plan işleri için. Gerekçe ve ölçüm `lib/arka-plan-havuzu.ts`te.
 * minimumIdle 1 : 12.10 öncesi ölçülmüş çalışan değer (yukarıdaki gerekçe);
 *                 ⛔ 0 YASAĞI burada da geçerli.
 * connectionLimit 3 : uygulamanın 12.10'a kadar aylarca çalıştığı değer; çekim
 *                     çekirdekleri 10'la yazılmıştı, 2'ye inmek iç içe işlemde
 *                     (`$transaction` + dışarıdan okuma) kuyruk kilidi riski taşırdı.
 */
export const ARKA_PLAN_HAVUZU = {
  connectionLimit: "3",
  minimumIdle: "1",
  idleTimeout: "60",
} as const;

/** İşaret anahtarı — kuran: `lib/arka-plan-havuzu.ts` (içe alındığı her yerde). */
export const ARKA_PLAN_ISARETI = Symbol.for("veritabani.arkaPlanHavuzu");

/** Bu sunucu kopyası arka plan havuzuyla mı kurulmalı? Yan etkisiz okuma. */
export function arkaPlanHavuzuMu(): boolean {
  return (globalThis as unknown as Record<symbol, boolean | undefined>)[ARKA_PLAN_ISARETI] === true;
}

/** İstemcinin havuz ayarı — işaret yoksa sayfaların ayarı. */
export function uygulamaHavuzu(): Record<string, string> {
  return arkaPlanHavuzuMu() ? ARKA_PLAN_HAVUZU : UYGULAMA_HAVUZU;
}

/**
 * Adrese havuz ayarlarını ekler. **Adreste açıkça yazılmış bir parametreye
 * DOKUNULMAZ** — acil durumda ortam değişkeninden müdahale edebilmek için
 * bu kapı açık bırakıldı.
 */
export function havuzluAdres(
  ham: string,
  ekler: Record<string, string> = UYGULAMA_HAVUZU,
): string {
  try {
    const adres = new URL(ham);
    for (const [ad, deger] of Object.entries(ekler)) {
      if (!adres.searchParams.has(ad)) adres.searchParams.set(ad, deger);
    }

    /**
     * "Açıkça yazılana dokunulmaz" kuralının TEK istisnası.
     * `minimumIdle=0` bu adaptörde geçerli görünen ama siteyi tamamen
     * durduran bir değer (yukarıdaki uyarı). Acil müdahale kapısının
     * siteyi bricklemesine izin vermiyoruz: düzeltip yüksek sesle
     * söylüyoruz. Sessizce düzeltmek de yanlış olurdu — o zaman ayarın
     * neden tutmadığı anlaşılmazdı.
     */
    if (adres.searchParams.get("minimumIdle") === "0") {
      console.warn(
        "[veritabani] minimumIdle=0 bu adaptörde bağlantıyı kırıyor; 1 olarak düzeltildi.",
      );
      adres.searchParams.set("minimumIdle", "1");
    }

    return adres.toString();
  } catch {
    // Ayrıştırılamayan adrese dokunmuyoruz: bağlantı hatası, adresi
    // bozmanın yarattığı anlamsız hatadan daha okunaklıdır.
    return ham;
  }
}

/**
 * Doğrulama/bakım betikleri için. `connectionLimit` **1'e ZORLANIR** (adreste
 * yazsa bile): bir betik canlı sitenin kotasını yememelidir. 13.08.2026'da
 * tam olarak bu oldu — arka arkaya çalışan iki betik kotayı doldurdu ve
 * `pool timeout` hatası kod hatası sanıldı.
 */
export function betikAdresi(ham: string): string {
  const temel = havuzluAdres(ham, { minimumIdle: "1", idleTimeout: "60" });
  try {
    const adres = new URL(temel);
    adres.searchParams.set("connectionLimit", "1");
    return adres.toString();
  } catch {
    return temel;
  }
}
