/**
 * ============================================================================
 *  SERVİS ÇALIŞANI — KURULABİLİRLİK İÇİN, ÖNBELLEK İÇİN DEĞİL
 * ----------------------------------------------------------------------------
 *  Kullanıcı 22.08.2026: _"PWA şeklinde programın mobilde desteklenmesini
 *  istiyorum."_
 *
 *  ⚠⚠ EN ÖNEMLİ KARAR: BU DOSYA VERİ ÖNBELLEKLEMEZ. ⚠⚠
 *
 *  Hazır PWA reçeteleri sayfaları ve API cevaplarını önbelleğe alır; "çevrimdışı
 *  çalışsın" diye. BU UYGULAMADA O BİR HATA OLURDU:
 *
 *  · Önbellekten gelen bir panel, DÜNKÜ NET-2'yi bugünkü gibi gösterir.
 *    Rakam ekranda durur, kaynağı görünmez, yanlış olduğu anlaşılmaz —
 *    tam olarak bu deponun bütün bekçilerle kovaladığı sessiz yanlışlık.
 *  · Çıkış yapıldıktan sonra önbellekte kalmış bir ekran, aynı telefonu
 *    eline alan bir sonraki kişiye finansal veri gösterir. Kapı (`proxy.ts`)
 *    devrede olmaz; cevap ağdan değil diskten gelir.
 *
 *  Bu yüzden ölçüt şu: **BAYATLADIĞINDA YANLIŞ OLABİLEN HİÇBİR ŞEY
 *  ÖNBELLEĞE GİRMEZ.** Geriye tek güvenli küme kalıyor — `/_next/static/`
 *  altındaki derleme çıktıları. Onların adresinde içerik özeti var
 *  (`.../chunk.a3f9c1.js`), yani içerik değişirse ADRES de değişir:
 *  bayatlaması matematiksel olarak mümkün değil.
 *
 *  Kazanç gerçek ama dar: telefonda ikinci açılış belirgin hızlanır
 *  (JavaScript ve yazı tipleri diskten gelir), veri her zaman ağdan.
 *
 *  ── ÇEVRİMDIŞI ─────────────────────────────────────────────────────────
 *  Ağ yoksa VERİ GÖSTERİLMEZ; "çevrimdışısınız" sayfası gösterilir. Bu bir
 *  eksiklik değil, KARAR: yanlış rakam göstermektense hiç rakam
 *  göstermemek doğrudur (İlke #5 — sessiz başarısızlık yasak, NEDEN
 *  olmadığı ekranda yazar).
 * ============================================================================
 */

/**
 * ⚠ SÜRÜM ELLE ARTIRILIR. Bu dosyanın davranışı değiştiğinde (özellikle
 * önbelleğe alınan küme değiştiğinde) sürüm artırılır; `activate` eski
 * sürümün bütün önbelleklerini siler. Sürüm sabit kalsaydı hatalı bir
 * sürümün bıraktığı çöp telefonlarda yaşamaya devam ederdi.
 */
const SURUM = "selliora-sw-2";
const STATIK_ONBELLEK = `${SURUM}-statik`;
const KABUK_ONBELLEK = `${SURUM}-kabuk`;

/** Ağ yokken gösterilecek tek sayfa. Veri taşımaz, bayatlaması zararsızdır. */
const CEVRIMDISI = "/cevrimdisi";

/** Yalnız bu ön ek önbelleklenir — içerik özetli, bayatlayamaz. */
const GUVENLI_ONEK = "/_next/static/";

self.addEventListener("install", (olay) => {
  olay.waitUntil(
    (async () => {
      const kabuk = await caches.open(KABUK_ONBELLEK);
      /* ⚠ `add` HATA FIRLATIRSA KURULUM DÜŞER. Çevrimdışı sayfası
         alınamadıysa (ağ yok, kapı yönlendirdi) servis çalışanı hiç
         kurulmasın istemeyiz — statik hızlandırma yine değerli. */
      try {
        /**
         * ⚠ ÇEREZSİZ İSTENİR (`credentials: "omit"`). Oturum çerezi ile
         * istenseydi sunucu GİRİŞ YAPMIŞ kabuğu döndürürdü — sol menünün
         * tamamı HTML olarak önbelleğe girerdi. `layout.tsx` bunu açıkça
         * yasaklıyor: _"Menü, uygulamanın tüm yapısını ele verir."_ Çıkış
         * yapıldıktan sonra bile diskte duran bir menü, tam olarak
         * 10.08.2026'da canlıda yakalanan sızıntının önbellekteki hâli
         * olurdu. Çerezsiz istenince sunucu ÇIPLAK kabuğu döner.
         */
        const cevap = await fetch(
          new Request(CEVRIMDISI, { credentials: "omit", cache: "reload" }),
        );
        if (cevap.ok) await kabuk.put(CEVRIMDISI, cevap);
      } catch {
        /* Sessiz geçilir; çevrimdışı yedeği olmadan da çalışır. */
      }
      /* Yeni sürüm beklemeden devralsın: hatalı bir servis çalışanı
         sahadan ancak böyle geri çekilebilir. */
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (olay) => {
  olay.waitUntil(
    (async () => {
      const adlar = await caches.keys();
      await Promise.all(
        adlar.filter((ad) => !ad.startsWith(SURUM)).map((ad) => caches.delete(ad)),
      );
      /**
       * ⚠ GEZİNME ÖN YÜKLEMESİ — SÜRÜM 2'DE EKLENDİ, ÇÜNKÜ YAVAŞLATIYORDUK.
       *
       * Kullanıcı 23.08.2026: _"dünden beri sekmeler yavaş açılıyor."_
       * Ölçüldü: arka uç temiz (TTFB 160-466 ms), CSS 95 KB ve bir kez
       * yükleniyor. Sebep BURASIYDI.
       *
       * Tarayıcı boşta kalan servis çalışanını ~30 saniyede kapatır.
       * `respondWith` çağıran bir `fetch` dinleyicisi varsa, sonraki
       * gezinmede önce SW AYAĞA KALDIRILIR ve ağ isteği ancak ondan sonra
       * başlar. Yani her sekme açılışı bir "SW açılış vergisi" ödüyordu —
       * ve bu vergi tam olarak PWA yayına girdiği gün başladı.
       *
       * Ön yükleme bunu ortadan kaldırır: tarayıcı ağ isteğini SW
       * açılışıyla PARALEL başlatır, biz de hazır cevabı alırız.
       *
       * ⚠ ÖZELLİK KONTROLÜ ŞART: eski tarayıcılarda `navigationPreload`
       * yok ve doğrudan çağırmak `activate`i düşürür — SW hiç etkinleşmez.
       */
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (olay) => {
  const istek = olay.request;

  /**
   * ⚠ SIRA ÖNEMLİ — GENİŞTEN DARA ELEME. Aşağıdaki her `return`, isteği
   * tarayıcının normal akışına bırakır (biz hiç dokunmayız).
   */

  /* 1) Yazma istekleri: form gönderimi, Server Action, silme. Asla. */
  if (istek.method !== "GET") return;

  const url = new URL(istek.url);

  /* 2) Başka bir alan adı (yazı tipi, harita, dış servis). Bizim işimiz değil. */
  if (url.origin !== self.location.origin) return;

  /**
   * 3) SAYFA GEÇİŞLERİ — ÖNCE AĞ, ÖNBELLEĞE YAZMA YOK.
   *
   * Cevap ne olursa olsun saklanmaz; ağ ölürse çevrimdışı sayfası döner.
   * Bir sonraki denemede yine ağa çıkılır — yani kullanıcı asla eski bir
   * ekranda kilitli kalmaz.
   */
  if (istek.mode === "navigate") {
    olay.respondWith(
      (async () => {
        try {
          /**
           * ⚠ ÖNCE ÖN YÜKLENEN CEVAP. Tarayıcı bu isteği biz uyanırken
           * çoktan başlatmış olabilir; onu kullanmak, aynı isteği ikinci
           * kez yapmaktan hem hızlı hem ucuz. Yoksa (ön yükleme
           * desteklenmiyorsa ya da kapalıysa) normal `fetch`e düşülür.
           */
          const onYuklenen = await olay.preloadResponse;
          if (onYuklenen) return onYuklenen;
          return await fetch(istek);
        } catch {
          const yedek = await caches.match(CEVRIMDISI);
          return (
            yedek ??
            new Response("", { status: 503, statusText: "Cevrimdisi" })
          );
        }
      })(),
    );
    return;
  }

  /**
   * 4) GÜVENLİ KÜME — yalnız içerik özetli derleme çıktıları.
   *
   * ⚠ `/api`, RSC yükleri (`?_rsc=`), `/ikon`, `/manifest.webmanifest` ve
   * `public/` altındaki dosyalar BU KAPININ DIŞINDA kalır. `public/`
   * dosyalarının adresinde özet yok — `zxing_reader.wasm` güncellense
   * telefon eskisini kullanmaya devam ederdi ve barkod okuyucu sessizce
   * eski sürümde kalırdı.
   */
  if (!url.pathname.startsWith(GUVENLI_ONEK)) return;

  olay.respondWith(
    (async () => {
      const onbellek = await caches.open(STATIK_ONBELLEK);
      const kayitli = await onbellek.match(istek);
      if (kayitli) return kayitli;

      const cevap = await fetch(istek);
      /* Yalnız tam ve başarılı cevap saklanır. Kısmi (206) ya da hatalı
         cevabı saklamak, kırık bir dosyayı kalıcı hâle getirirdi. */
      if (cevap.ok && cevap.status === 200) {
        onbellek.put(istek, cevap.clone());
      }
      return cevap;
    })(),
  );
});
