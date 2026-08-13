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
const UYGULAMA_HAVUZU = {
  connectionLimit: "3",
  minimumIdle: "1",
  idleTimeout: "60",
} as const;

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
