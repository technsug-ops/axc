/**
 * ============================================================================
 *  MUTASYON HARNESS'LERİNİN HEDEF DOSYALARI (K202 SORUN B)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: 23 mutasyon bekçisi turun %57,8'i (K202, 09.09.2026) —
 *  paralelleştirme performans için gerekliydi. Ama İKİ harness AYNI hedef
 *  dosyayı mutasyona uğratıp `finally`de geri yazıyorsa, paralel koşum
 *  YARIŞ DURUMU üretir: biri ötekinin mutantını "asıl" sanıp geri yazar —
 *  tam bugün onardığımız sıfır-bayt bozulmasının (kanal-kargo-damgasi.ts)
 *  BAŞKA bir türü, kesinti yerine eşzamanlılıkla.
 *
 *  Bu modül İKİ şeyi tek yerden sağlar:
 *  1) `gercekHedefler(harnessDosyasi)` — bir harness'in GERÇEKTE hangi
 *     dosyaları okuyup yazdığını, kaynağı TARAYARAK bulur (`readFileSync`/
 *     `writeFileSync` çağrılarının ilk argümanını takip eder — değişken adı
 *     ne olursa olsun, çünkü hedef isimlendirme harness'ten harness'e
 *     değişiyor: `GOVDE`, `KURAL`, `m.dosya` vb.)
 *  2) `SIRALI_MUTASYON_GRUP` — GERÇEK çakışmalardan BEYAN EDİLMİŞ, elle
 *     gözden geçirilmiş küme: bu npm-script adları birbirine göre SIRALI
 *     koşar, aynı dosyayı hedefliyor olabilirler.
 *
 *  ⚠ BEYAN TEK BAŞINA YETMEZ — `mutasyon-cakisma:dogrula` her koşumda GERÇEK
 *  çakışmaları yeniden tarar ve BEYANLA karşılaştırır: yarın eklenen bir
 *  harness'in undeclared bir çakışma açması SESSİZCE geçemez.
 *  _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur" —
 *  ama BURADA liste GÜVENLİK için var, ÖLÇÜM ayrıca ona bekçilik ediyor.)_
 * ============================================================================
 */
import { readFileSync } from "node:fs";

/** npm-script adından (`xxx-mutasyon:kontrol`) harness dosya yoluna çevirir. */
export function harnessDosyaYolu(npmAdi: string): string {
  return "scripts/" + npmAdi.replace(":", "-") + ".ts";
}

export function mutasyonAdiMi(npmAdi: string): boolean {
  return /-mutasyon:kontrol$/.test(npmAdi);
}

/**
 * Bir harness dosyasının GERÇEKTE dokunduğu dosya yollarını kaynağı
 * tarayarak çıkarır. İki biçimi de yakalar:
 *   - `const GOVDE = "src/lib/x.ts"` + `readFileSync(GOVDE, ...)`
 *   - `dosya: "literal"` / `dosya: SABIT` (mutasyon nesneleri dizisinde) +
 *     `readFileSync(m.dosya, ...)` (alan erişimi — tek tek çözülemez, o
 *     yüzden TÜM `dosya:` değerleri toplanır)
 */
export function gercekHedefler(harnessYolu: string): string[] {
  const metin = readFileSync(harnessYolu, "utf8");

  const sabitler = new Map<string, string>();
  for (const m of metin.matchAll(/^const\s+([A-Za-z_]+)\s*=\s*"([^"]+)"\s*;/gm)) {
    sabitler.set(m[1]!, m[2]!);
  }

  const hedefler = new Set<string>();
  for (const m of metin.matchAll(
    /(?:readFileSync|writeFileSync|dayanikliYaz)\(\s*([A-Za-z_.]+|"[^"]+")\s*,/g,
  )) {
    const arg = m[1]!;
    if (arg.startsWith('"')) {
      hedefler.add(JSON.parse(arg));
      continue;
    }
    if (arg.includes(".")) {
      // per-mutasyon alan erişimi (örn. `m.dosya`) — dizideki TÜM dosya:
      // değerlerini topla (hangi mutasyonun hangisine denk geldiğini ayırt
      // etmiyoruz; güvenlik amaçlı taramada bu FAZLA-KAPSAMA sorun değil).
      for (const mm of metin.matchAll(/\bdosya:\s*(?:([A-Za-z_]+)|"([^"]+)")/g)) {
        if (mm[2]) hedefler.add(mm[2]);
        else if (mm[1] && sabitler.has(mm[1])) hedefler.add(sabitler.get(mm[1])!);
      }
      continue;
    }
    if (sabitler.has(arg)) hedefler.add(sabitler.get(arg)!);
  }
  return [...hedefler];
}

/**
 * Verilen npm-script adları arasında GERÇEK (kaynaktan taranmış) dosya
 * çakışmalarını bulur. Birbirine bağlı harness'leri BİRLİKTE gruplar
 * (A↔B ve B↔C çakışıyorsa, A/B/C aynı grupta — transitiflik).
 */
export function gercekCakismaGruplari(npmAdlari: string[]): string[][] {
  const hedeflerHarita = new Map<string, string[]>();
  for (const ad of npmAdlari) {
    hedeflerHarita.set(ad, gercekHedefler(harnessDosyaYolu(ad)));
  }

  // union-find
  const ebeveyn = new Map<string, string>(npmAdlari.map((a) => [a, a]));
  function bul(x: string): string {
    while (ebeveyn.get(x) !== x) x = ebeveyn.get(x)!;
    return x;
  }
  function birlestir(a: string, b: string) {
    const ka = bul(a);
    const kb = bul(b);
    if (ka !== kb) ebeveyn.set(ka, kb);
  }

  const dosyaSahipleri = new Map<string, string[]>();
  for (const ad of npmAdlari) {
    for (const dosya of hedeflerHarita.get(ad)!) {
      if (!dosyaSahipleri.has(dosya)) dosyaSahipleri.set(dosya, []);
      dosyaSahipleri.get(dosya)!.push(ad);
    }
  }
  for (const sahipler of dosyaSahipleri.values()) {
    for (let i = 1; i < sahipler.length; i++) birlestir(sahipler[0]!, sahipler[i]!);
  }

  const gruplar = new Map<string, string[]>();
  for (const ad of npmAdlari) {
    const kok = bul(ad);
    if (!gruplar.has(kok)) gruplar.set(kok, []);
    gruplar.get(kok)!.push(ad);
  }
  return [...gruplar.values()].filter((g) => g.length > 1).map((g) => g.sort());
}

/**
 * ⭐ BEYAN (K202 SORUN B, 09.09.2026 ölçümü) — GERÇEK ÇAKIŞMA GRUBU.
 *
 * Bu 7 harness aşağıdaki 4 dosyayı paylaşıyor ve bu yüzden birbirlerine
 * göre SIRALI koşar (paralel havuza girmezler):
 *   messages/tr.json           ← kare-tanisi · mal-kabul · toplu-kargo
 *   src/app/page.tsx           ← mal-kabul · panel · urun-analizi
 *   src/app/satislar/page.tsx  ← liste-hafizasi · toplu-kargo
 *   src/lib/panel.ts           ← aylik-marj · panel
 *
 * `mal-kabul` ve `panel` köprü görevi görüyor, bu yüzden tek bir bağlı
 * küme oluşuyor (transitif olarak hepsi birbirine bağlı).
 *
 * ⚠ BU LİSTE ELLE TUTULUYOR AMA KENDİ BAŞINA GÜVENİLMEZ — her koşumda
 * `mutasyon-cakisma:dogrula` gerçek taramayla karşılaştırır. Liste yanlış
 * çıkarsa (ör. yeni bir harness undeclared bir çakışma açtıysa) o bekçi
 * KIRMIZI yanar.
 */
export const SIRALI_MUTASYON_GRUP: readonly string[] = [
  "aylik-marj-mutasyon:kontrol",
  /**
   * K236 (22.09.2026) — `kamera` ve `kare-tanisi` İKİSİ DE
   * `src/components/barkod-okuyucu.tsx`i mutasyona uğratıyor: `kamera`
   * tarama hâli satırının ÇİZİLDİĞİNİ, `kare-tanisi` kare çözümünün
   * bağlarını sınıyor. Paralel koşsalardı biri ötekinin MUTANTINI "asıl"
   * sanıp geri yazardı ve bozulma SESSİZ olurdu.
   * ⚠ Bekçi bunu push kapısında yakaladı — beyan sonradan yazılmadı,
   * ölçüm zorladı. Liste elle tutuluyor ama her koşumda gerçek taramayla
   * karşılaştırılıyor.
   */
  "kamera-mutasyon:kontrol",
  "kare-tanisi-mutasyon:kontrol",
  "liste-hafizasi-mutasyon:kontrol",
  "mal-kabul-mutasyon:kontrol",
  "panel-mutasyon:kontrol",
  "toplu-kargo-mutasyon:kontrol",
  "urun-analizi-mutasyon:kontrol",
  /**
   * K226 — İKİSİ DE `src/lib/komisyon/yukle.ts`i mutasyona uğratıyor:
   * `tablo-oku` okuma kapısının çağrıldığını, `teklif-tanima` kampanya
   * tanımasının o dosyadaki bağını sınıyor. Paralel koşsalardı biri
   * ötekinin MUTANTINI "asıl" sanıp geri yazardı — ve bozulma sessiz
   * olurdu. Bekçi bunu push kapısında yakaladı; liste elle tutuluyor ama
   * gerçek taramayla her koşumda karşılaştırılıyor.
   */
  "tablo-oku-mutasyon:kontrol",
  "teklif-tanima-mutasyon:kontrol",
  /**
   * K195-② (02.10.2026) — `teslim-durumu` artık PANEL sayfasını
   * (`src/app/page.tsx`: kutucuk sayıları ve adresleri) ve
   * `liste-suzgeci.ts`i (teslim ekseni) mutasyona uğratıyor; ikisine de
   * `panel` · `kargosuz` ve başka üyeler dokunuyor. Bekçi push öncesi
   * yakaladı.
   */
  "teslim-durumu-mutasyon:kontrol",
  /** 02.10.2026 — `iade-kdv` `src/lib/iade.ts`i mutasyona uğratıyor; `iade-duzenle` ve `iade-gecerli` de aynı dosyaya dokunuyor. */
  "iade-kdv-mutasyon:kontrol",
  /** 02.10.2026 — `urun-aktiflik` `src/app/urunler/actions.ts`i mutasyona uğratıyor; `kod-cozumu` · `marka-kodu` da aynı dosyaya dokunuyor. */
  "urun-aktiflik-mutasyon:kontrol",
  /**
   * K314 (02.10.2026) — `aktarilan-siparis` `src/lib/stok.ts` ve
   * `src/lib/satis.ts`i mutasyona uğratıyor: `parti-secimi` stok.ts'e,
   * `donem` satis.ts'e dokunuyor. ⛔ Push turunda paralel koştular ve bir
   * mutant (`ILK CEKIM GUNU KAPISI YOK`) stok.ts'te KALDI; parti-secimi'nin
   * 4 «kaçan» mutasyonu da bu yarıştan doğdu. Çakışma bekçisi yakaladı.
   */
  "aktarilan-siparis-mutasyon:kontrol",
  "parti-secimi-mutasyon:kontrol",
  "donem-mutasyon:kontrol",
  /**
   * K243 (23.09.2026) — `kargo-kaynagi` artık SATIŞ DETAY ekranını da
   * mutasyona uğratıyor (`satislar/[id]/page.tsx`): desi ve kanal kargo
   * firması satırlarının ÇİZİLDİĞİNİ sınıyor. O dosyaya yukarıdaki grubun
   * birçok üyesi de dokunuyor — paralel koşarlarsa biri ötekinin MUTANTINI
   * "asıl" sanıp geri yazardı.
   */
  "kargo-kaynagi-mutasyon:kontrol",
  /**
   * K243 — İKİSİ DE `scripts/canli-hb-ice-aktar.ts`i mutasyona uğratıyor:
   * `ice-aktarma` geri doldurma SEÇİMİNİ, `kargo-damgasi` kargo/teslim
   * damgalarını sınıyor. Bekçi bunu ilk koşumda yakaladı — beyan sonradan
   * hatırlanmadı, ölçüm zorladı.
   */
  "ice-aktarma-mutasyon:kontrol",
  "kargo-damgasi-mutasyon:kontrol",
  /**
   * K244 (23.09.2026) — `vitrin` harness'i PANELİ (`src/app/page.tsx`)
   * mutasyona uğratıyor: dökümün paneli terk ettiğini ve şerhin çizildiğini
   * sınıyor. Panele dokunan öteki harness'lerle paralel koşarsa biri
   * ötekinin MUTANTINI "asıl" sanıp geri yazar.
   */
  "vitrin-mutasyon:kontrol",
  /**
   * K273 (25.09.2026) — `urun-gorseli` ortak liste bileşenini (`liste-karti.tsx`)
   * ve `/stok` sayfasını mutasyona uğratıyor. `satir-karti` aynı kartı,
   * `stok-siralama` aynı sayfayı hedefliyor; üçü paralel koşsa biri ötekinin
   * MUTANTINI asıl sanıp geri yazabilirdi. Beyan unutulmuştu —
   * `mutasyon-cakisma:dogrula` push turunda yakaladı.
   */
  "satir-karti-mutasyon:kontrol",
  "stok-siralama-mutasyon:kontrol",
  "urun-gorseli-mutasyon:kontrol",
  /**
   * K283 (26.09.2026) — `kategori-eslesme` Trendyol listeleme senkronunu
   * (`urun-gorseli` ile ortak) ve uyarı toplayıcısını (`uyari-cron` ile ortak)
   * mutasyona uğratıyor; paralel koşsalar biri ötekinin mutantını asıl sanırdı.
   */
  "kategori-eslesme-mutasyon:kontrol",
  "uyari-cron-mutasyon:kontrol",
  /**
   * K303 (03.10.2026) — `deneme-ortami` pazaryeri istemcilerinin kimlik
   * kapısını (`scripts/hb/istemci.ts`) mutasyona uğratıyor; `hb-sayfa` da aynı
   * dosyayı bozuyor. Çakışma deneme ortamı kapısının geldiği commit'ten beri
   * vardı ve o gün tam tur koşulmadığı için görülmedi — 3b turunda
   * `mutasyon-cakisma:dogrula` yakaladı.
   */
  "deneme-ortami-mutasyon:kontrol",
  "hb-sayfa-mutasyon:kontrol",
  /**
   * K303 (04.10.2026) — `giris-firmasiz` ve `erisim` ikisi de giriş eylemini
   * (`src/app/giris/actions.ts`) ve kilidin okuma gövdesini mutasyona uğratıyor;
   * `oturum-firmasi` (4c-1) da giriş eylemini bozuyor.
   */
  "erisim-mutasyon:kontrol",
  "giris-firmasiz-mutasyon:kontrol",
  "oturum-firmasi-mutasyon:kontrol",
  /** `hata` da `src/lib/yetki/index.ts`i bozuyor (yetki kapısı mutasyonu) — `oturum-firmasi` ile çakışır. */
  "hata-mutasyon:kontrol",
  /** K303 4c-2 — `yonetim-kapisi` proxy ve kök düzeni bozuyor (`deneme-ortami` ile ortak). */
  "yonetim-kapisi-mutasyon:kontrol",
  /** K303 4c-2 — `saglayici-izni` bekçisi veritabanı istemcisini içeri alır (`giris-firmasiz` / `oturum-firmasi` ile aynı sınıf). */
  "saglayici-izni-mutasyon:kontrol",
  /**
   * K303 Aşama 3–4 (03.10.2026) — `firma-suzgeci` artık ham SQL'li gövdeleri
   * (`alim-arama`, `toplu-guncelle`), geri yüklemeyi ve `satis.ts`'i (bağ kapısı
   * desen yasağı) mutasyona uğratıyor; bu dosyaları başka harness'ler de bozuyor.
   */
  "firma-suzgeci-mutasyon:kontrol",
  /**
   * K284 (26.09.2026) — `supheli-urun` Ürünler listesindeki şüpheli
   * bağlantısını (`src/app/urunler/page.tsx`) mutasyona uğratıyor; aynı dosyayı
   * `kod-cozumu` da bozuyor. Paralel koşsalar biri ötekinin mutantını asıl
   * sanıp geri yazardı. ⚠ Beyan ölçümle zorlandı (`mutasyon-cakisma:dogrula`).
   */
  "kod-cozumu-mutasyon:kontrol",
  "supheli-urun-mutasyon:kontrol",
  /**
   * K285 (26.09.2026) — `marka-kodu` ürün kaydını (`src/app/urunler/actions.ts`,
   * `kod-cozumu` ile ortak) ve dışa aktarma listesini (`listeler.ts`,
   * `supheli-urun` ile ortak) mutasyona uğratıyor. ⚠ Ölçümle zorlandı.
   */
  "marka-kodu-mutasyon:kontrol",
  /**
   * K286 (26.09.2026) — `sku-onizleme` dışa aktarma listesini (`listeler.ts`,
   * `supheli-urun` ve `marka-kodu` ile ortak) mutasyona uğratıyor. ⚠ Ölçümle zorlandı.
   */
  "sku-onizleme-mutasyon:kontrol",
  /**
   * K287 (27.09.2026) — `eski-kod` ortak kod kuralını (`varyant-arama-kurali.ts`),
   * ürün formunu, önizleme gövdesini ve yedek listesini mutasyona uğratıyor —
   * sıralı gruptaki pek çok harness'le ortak dosyalar. ⚠ Ölçümle zorlandı.
   */
  "eski-kod-mutasyon:kontrol",
  /**
   * K288 (27.09.2026) — `marka-yukleme` Markalar ve SKU önizlemesi ekranlarını
   * (`marka-kodu` · `sku-onizleme` ile ortak) mutasyona uğratıyor. ⚠ Ölçümle zorlandı.
   */
  "marka-yukleme-mutasyon:kontrol",
  /**
   * K289 (27.09.2026) — `liste-aramasi` hakediş sayfasını (`hakedis-ozeti` ile
   * ortak) ve dışa aktarma listesini (`listeler.ts`) mutasyona uğratıyor;
   * `hakedis-ozeti` bu yüzden ilk kez bir çakışma kümesine girdi. ⚠ Ölçümle zorlandı.
   */
  "liste-aramasi-mutasyon:kontrol",
  "hakedis-ozeti-mutasyon:kontrol",
  /**
   * K298 (28.09.2026) — `tarife-eslesme` ve `teklif-tanima` İKİSİ DE
   * `src/lib/komisyon/tarife-eslesme.ts`i mutasyona uğratıyor (eşleşme kuralı
   * `tarife-yaz.ts`ten ortak gövdeye çıkınca `teklif-tanima`nın çapaları da oraya
   * taşındı). ⚠ Push kapısında ölçümle zorlandı.
   */
  "tarife-eslesme-mutasyon:kontrol",
  /**
   * K300 (28.09.2026) — `okuyucu-duzeltme` arama kuralını, `/okut` ve
   * `/yerlestir` eylemlerini ve raf aramasını mutasyona uğratıyor; hepsi başka
   * denetimlerle ortak (`eski-kod` · `paketleme` · `kod-cozumu` · `liste-aramasi`).
   */
  "okuyucu-duzeltme-mutasyon:kontrol",
  /**
   * K302 (28.09.2026) — `urun-arama` Ürünler ekranını (`kategori-eslesme` ·
   * `supheli-urun` · `kod-cozumu` ile ortak) ve dışa aktarma listesini
   * (`liste-aramasi` · `sku-onizleme` ile ortak) mutasyona uğratıyor.
   */
  "urun-arama-mutasyon:kontrol",
  /**
   * K304 (28.09.2026) — `finansman` nakit takvimi verisini (`panel` ile ortak)
   * ve yetki tohumunu mutasyona uğratıyor.
   */
  "finansman-mutasyon:kontrol",
  /**
   * K305 (29.09.2026) — `kart-iadesi` nakit takvimi verisini, panel kart
   * özetini ve rapor gövdesini mutasyona uğratıyor (panel · finansman ile ortak).
   */
  "kart-iadesi-mutasyon:kontrol",
  /**
   * K112b (30.09.2026) — `ty-sayfa-gezici` TY sipariş içe aktarmasını
   * (`canli-ty-ice-aktar.ts`, içe aktarma harness'leriyle ortak) ve ortak
   * TY istemcisini mutasyona uğratıyor.
   */
  "ty-sayfa-gezici-mutasyon:kontrol",
  /**
   * K44 (30.09.2026) — `iade-duzenle` ve `iade-gecerli` İKİSİ DE
   * `src/lib/iade.ts`i mutasyona uğratıyor (para gövdesi · önceki iade süzgeci).
   */
  "iade-duzenle-mutasyon:kontrol",
  "iade-gecerli-mutasyon:kontrol",
  /**
   * K19-② (30.09.2026) — `kupon` sözlüğü (`messages/tr.json`, birçok
   * harness'le ortak) ve fiyat deneme ekranını mutasyona uğratıyor.
   */
  "kupon-mutasyon:kontrol",
  /**
   * K309 (30.09.2026) — `alim-maliyeti` alım eylemlerini ve mal kabulü
   * (içe aktarma · mal kabul harness'leriyle ortak) mutasyona uğratıyor.
   */
  "alim-maliyeti-mutasyon:kontrol",
  /**
   * 30.09.2026 — `kdv-uyusmazligi` çan toplayıcısını (`uyari/topla.ts`, uyarı
   * harness'leriyle ortak), listeleme yazıcısını ve kanal SKU ekranını
   * mutasyona uğratıyor.
   */
  "kdv-uyusmazligi-mutasyon:kontrol",
  /**
   * 30.09.2026 — `tazminat` artık kart iadesi veri gövdesini
   * (`kart-iadesi-veri.ts`, kart-iadesi harness'iyle ortak) de mutasyona uğratıyor.
   */
  "tazminat-mutasyon:kontrol",
  /**
   * K141 (30.09.2026) — `kargosuz` paneli, raporu, satış listesini ve süzgeç
   * gövdesini mutasyona uğratıyor (panel · süzgeç harness'leriyle ortak).
   */
  "kargosuz-mutasyon:kontrol",
  /**
   * K318 (04.10.2026) — `uygulama-adi` adın okunduğu ortak dosyaları
   * mutasyona uğratıyor: `layout.tsx` · `app-sidebar.tsx` · `giris/page.tsx`
   * · `oturum-imza.ts` · `messages/tr.json` · `public/sw.js` · `uygulama.ts`.
   * İlk turda paralel havuza düştü ve `mutasyon-cakisma` yakaladı.
   */
  "uygulama-adi-mutasyon:kontrol",
  /**
   * K303 (05.10.2026) — `kullanici-uyeligi` `oturum-firmasi.ts` (oturum-firmasi
   * harness'iyle ortak) ve yeni satış sayfasını mutasyona uğratıyor.
   */
  "kullanici-uyeligi-mutasyon:kontrol",
  /**
   * K303 (05.10.2026) — `aski-sureci` `firma-acilisi.ts`i (firma-acilisi
   * harness'iyle ortak) ve `eposta.ts`i mutasyona uğratıyor.
   */
  "aski-sureci-mutasyon:kontrol",
  /** K303 (05.10.2026) — `firma-acilisi.ts` aski-sureci harness'iyle ortak. */
  "firma-acilisi-mutasyon:kontrol",
  /** K303 Model 2 (05.10.2026) — `hesap-modeli` oturum-firmasi, giriş, kullanıcılar ve firma açılışını mutasyona uğratıyor. */
  "hesap-modeli-mutasyon:kontrol",
];
