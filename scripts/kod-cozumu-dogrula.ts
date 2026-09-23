import { readFileSync, readdirSync } from "node:fs";

/**
 * ============================================================================
 *  KOD ÇÖZÜMÜ BEKÇİSİ — "SESSİZ SEÇİM" DESEN YASAĞI
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — BEKCI. Hiçbir şey yazmaz.
 *
 *  ⛔ NİYE DOĞDU — CANLI ARIZA 21.09.2026. Beş ayrı ekran şunu yapıyordu:
 *
 *      prisma.productVariant.findFirst({ where: { OR: kodKosulu(kod) } })
 *
 *  `findFirst` + sıralama yok = veritabanının o anki sırası kazanır. Bir kod
 *  iki aktif varyanta uyduğunda biri **sessizce** seçiliyor, kaybeden hiçbir
 *  yerde görünmüyordu. Hepsiburada siparişi stoğu SIFIR olan ikize düştü ve
 *  onaylanamadı; ekrandaki `Stok yetersiz (0/1)` rakamı DOĞRU olduğu için
 *  arıza günlerce ürün kartında arandı.
 *
 *  ── ÇARE DOSYA LİSTESİ DEĞİL, DESEN YASAĞI ─────────────────────────────
 *  "Şu beş dosyada düzeltildi mi" diye sayan bir kontrol, ALTINCI ekran
 *  eklendiğinde sessizce yeşil kalırdı ve aynı hatayı bir kat yukarıda
 *  tekrarlardı. Ölçüt bu yüzden bir YASAK:
 *
 *      Bir `productVariant` sorgusunda `kodKosulu(...)` ile `findFirst`
 *      YAN YANA KULLANILAMAZ. Küme `kodlaVaryantCoz` gövdesinden gelir.
 *
 *  ⚠ VE ÖLÇÜT YORUMSUZ KODDA ARANIR: bu yasağı ANLATAN bir yorum, onu
 *  ÇİĞNEMİŞ sayılmaz — yukarıdaki blok tam olarak o deseni içeriyor.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log(`         ${JSON.stringify(gorulen)}`);
  }
}

/** Yorumsuz okur — bir yasağı anlatan yorum, o yasağı çiğnemiş sayılmaz. */
function yorumsuzOku(yol: string): string {
  return readFileSync(yol, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

console.log("\nKOD ÇÖZÜMÜ — sessiz seçim yasağı");
console.log("=".repeat(70));

const GOVDE = "src/lib/varyant-kod-cozumu.ts";

/* ------------------------------------------------------------------- 1 -- */
console.log("\n1) ORTAK GÖVDE — seçmiyor, SAYIYOR");
{
  const g = yorumsuzOku(GOVDE);

  /**
   * ⚠ ÖLÇÜT ADA DEĞİL KULLANIMA BAĞLI. "findMany geçiyor mu" demek yetmez;
   * `take` OLMADAN bir `findMany` de tek sonuç döndürebilir ve çakışmayı
   * hiç göremezdi. Ölçülen şey TAVANIN sorguya bağlandığı.
   */
  kontrol(
    "gövde çoklu okuyor ve tavanı SORGUYA bağlıyor",
    /findMany\(\{[\s\S]{0,400}?take: ADAY_TAVANI/.test(g),
  );

  /**
   * ⛔ ÜÇ SONUÇ AYRI: "YOK" ile "COK" aynı kefeye konsaydı operatör var olan
   * bir ürünü yeniden tanımlamaya kalkardı — ikiz sayısını ARTIRAN bir mesaj.
   */
  /**
   * ⛔ İLK YAZIMDA BU ÖLÇÜT KÖRDÜ VE MUTASYON GÖSTERDİ. Desen
   * `durum: "COK"` idi ve TİP TANIMINDA da geçiyor
   * (`| { durum: "COK"; adaylar: ... }`). Dönüşü `{ durum: "YOK" }`e çeviren
   * mutasyon YEŞİL geçti: tip ayaktaydı, davranış yoktu.
   * Ölçüt `return` ifadesine bağlandı — ada değil KULLANIMA.
   */
  const DONUSLER: [string, RegExp][] = [
    ["YOK", /return \{ durum: "YOK" \}/],
    ["TEK", /return \{ durum: "TEK", id: /],
    ["COK", /return \{ durum: "COK", adaylar/],
  ];
  for (const [durum, desen] of DONUSLER) {
    kontrol(`  ...ve "${durum}" ayrı bir sonuç olarak DÖNÜYOR`, desen.test(g));
  }

  /** Gövdenin kendisi `findFirst` kullanmaz — yasak ondan başlar. */
  kontrol("gövdede findFirst YOK", !/findFirst/.test(g));

  /**
   * ⛔ PASİF VARYANT KAPSAM DIŞI. İkiz temizliği bu davranışa dayanıyor;
   * süzgeç düşerse pasife alınan üç kayıt aramaya geri gelir ve çarpışma
   * sessizce yeniden doğar.
   */
  /**
   * ⚠ ÖLÇÜT KİPİ GÖRÜNCE GÜNCELLENDİ, GEVŞETİLMEDİ. `pasifDahil` açıldığında
   * süzgeç koşullu oldu; "isActive geçiyor mu" demek artık yetmez — kipin
   * KAPALI hâlinin aktif süzgeci ürettiği ölçülür. Süzgeci koşulsuz kaldıran
   * bir mutasyon bu desenle kırmızı yanar.
   */
  kontrol(
    "gövdenin VARSAYILANI yalnız AKTİF varyant",
    /pasifDahil \? \{\} : \{ isActive: true \}/.test(g),
  );
  kontrol(
    "  ...ve pasif kipi AÇIKÇA istenmedikçe açılmıyor",
    /secenek: \{ pasifDahil\?: boolean \} = \{\}/.test(g),
  );
}

/* ------------------------------------------------------------------- 2 -- */
console.log("\n2) DESEN YASAĞI — çıplak findFirst + kodKosulu");
{
  const kaynaklar = readdirSync("src", { recursive: true, encoding: "utf8" })
    .filter((p): p is string => typeof p === "string")
    .filter((p) => p.endsWith(".ts") || p.endsWith(".tsx"))
    .filter((p) => !p.includes("generated"));

  /**
   * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR. Tarama sıfır dosya bulursa aşağıdaki
   * döngü hiç dönmez ve bekçi "ihlal yok" der — boş küme her koşulu sağlar.
   * (Anayasa: `every` kapısının tarama tarafı.)
   */
  kontrol("taranan kaynak sayısı yeterli", kaynaklar.length >= 200, kaynaklar.length);

  const kodKosuluKullanan: string[] = [];
  const ihlal: string[] = [];

  for (const p of kaynaklar) {
    const metin = yorumsuzOku("src/" + p);
    if (!/\bkodKosulu\(/.test(metin)) continue;
    kodKosuluKullanan.push(p);

    /**
     * ⚠ PENCERE ÖLÇÜLDÜ. `findFirst({` ile `kodKosulu(` arasına `where: {`
     * ve bir `isActive` satırı giriyor — bugün en genişi 60 karakter.
     * Pencere gövde büyüyünce sessizce körleşebilir, bu yüzden bolca pay
     * bırakıldı (400) ama SINIRSIZ değil: sınırsız pencere, dosyanın çok
     * aşağısındaki alakasız bir `kodKosulu`yu da ihlal sayardı.
     */
    if (/findFirst\(\{[\s\S]{0,400}?kodKosulu\(/.test(metin)) ihlal.push(p);
  }

  /**
   * ⚠ KURALI KULLANAN DOSYA KALMADIYSA YASAK DA ÖLÇÜLMEMİŞ DEMEKTİR.
   * `kodKosulu` bir refaktörde tamamen kaldırılırsa bu bekçi hiçbir şey
   * ölçmeden yeşil yanardı. (Anayasa: "dize, davranışın vekilidir — ve
   * refaktör vekili eskitir.")
   */
  /**
   * ⚠ EŞİK TAHMİN DEĞİL, ÖLÇÜM (21.09.2026): refaktörden SONRA `kodKosulu`yu
   * kullanan tam olarak İKİ dosya kaldı — kuralın kendisi
   * (`varyant-arama-kurali.ts`) ve çözüm gövdesi. Hedeflenen son durum budur:
   * çıplak koşul artık hiçbir ekranda geçmiyor. İlk yazımda eşik `3` diye
   * TAHMİN edilmişti ve kırmızı yandı; sayı ölçülüp düzeltildi.
   */
  kontrol(
    "kodKosulu'nu kullanan dosya VAR (ölçüt boşa dönmüyor)",
    kodKosuluKullanan.length >= 2,
    kodKosuluKullanan,
  );

  kontrol(
    "hiçbir dosya findFirst + kodKosulu YAN YANA kullanmıyor",
    ihlal.length === 0,
    ihlal,
  );

  /**
   * ⛔ VE ÇÖZÜM GÖVDESİ GERÇEKTEN ÇAĞRILIYOR. Yasağa uymak, gövdeyi
   * kullanmak DEĞİLDİR: `findFirst` yerine sıralamasız bir `findMany[0]`
   * yazan bir ekran yasağı geçer ve aynı sessiz seçimi yapardı.
   */
  const cagiran = kaynaklar.filter((p) =>
    /kodlaVaryantCoz\(/.test(yorumsuzOku("src/" + p)),
  );
  kontrol(
    "çözüm gövdesini ÇAĞIRAN ekran sayısı",
    cagiran.length >= 5,
    cagiran.length,
  );
}

/* ------------------------------------------------------------------- 3 -- */
console.log("\n3) ÇOK EŞLEŞME EKRANDA SÖYLENİYOR");
{
  /**
   * ⛔ GÖVDE DOĞRU ÇALIŞIP SONUCU KULLANICIYA ULAŞMAZSA, DOĞRU DAVRANIŞIN
   * GÖRÜNMEZLİĞİ DE YALANCI YEŞİLDİR. Bu deponun ölçülmüş dersi: "tur 98/98
   * yeşildi ve panelde kutu YOKTU."
   */
  /**
   * ⛔ KOŞUL VE SONUÇ AYNI DESENDE ARANIR. İlk yazımda yalnız sözlük
   * anahtarı aranıyordu ve mutasyon bunu geçti: dalın KOŞULU `false` yapıldı,
   * dal hiç çizilmedi, anahtar dosyada kaldı. Bu deponun en sık tekrarlayan
   * körlüğü — "koşul öldürülür, desen kalır".
   *
   * ⚠ PENCERELER ÖLÇÜLDÜ (yorumsuz kaynakta): en genişi ~120 karakter;
   * gövde büyürse dar pencere sessizce körleşeceği için pay bırakıldı.
   */
  const ekranlar: [string, string, RegExp][] = [
    [
      "satış formu",
      "src/app/satislar/satis-formu.tsx",
      /sonuc\.durum === "COK"[\s\S]{0,400}?ortak\("kodCokEslesti"/,
    ],
    [
      "alım formu",
      "src/app/alimlar/alim-formu.tsx",
      /sonuc\.durum === "COK"[\s\S]{0,400}?ortak\("kodCokEslesti"/,
    ],
    [
      "okuma ekranı",
      "src/app/okut/okuyucu.tsx",
      /sonuc\.cokEslesme > 0 \?[\s\S]{0,400}?t\("cokEslesme"/,
    ],
    [
      "yerleştirme ekranı",
      "src/app/yerlestir/yerlestirici.tsx",
      /case "COK_ESLESME":[\s\S]{0,200}?t\("cokEslesme"/,
    ],
  ];
  for (const [ad, yol, desen] of ekranlar) {
    kontrol(`${ad} çok eşleşmeyi YAZIYOR`, desen.test(yorumsuzOku(yol)));
  }

  /**
   * ⛔ EKRANIN YAZMASI YETMEZ — SUNUCU EYLEMİ DE DURMALI. Ekran metni
   * çizmekten sorumlu; kararı veren yer sunucu eylemidir. Yerleştirme ve
   * sayım yolları çok eşleşmede İŞ YAPMAMALI:
   *   · yerleştirme yanlış ürünü rafa yazardı,
   *   · sayım yanlış varyanta adet yazardı — ve SAYIM SON SÖZDÜR, o adet
   *     doğrudan deftere girer.
   *
   * ⚠ Koşul ve sonuç aynı desende: dalın koşulunu öldüren bir mutasyon,
   * `COK_ESLESME` dizesi dosyada kaldığı için yeşil geçerdi.
   */
  const eylemler: [string, string, RegExp][] = [
    [
      "yerleştirme eylemi",
      "src/app/yerlestir/actions.ts",
      /durum === "COK"[\s\S]{0,150}?durum: "COK_ESLESME"/,
    ],
    [
      "sayım eylemi",
      "src/app/okut/sayim-actions.ts",
      /durum === "COK"[\s\S]{0,80}?hata: "COK_ESLESME"/,
    ],
  ];
  for (const [ad, yol, desen] of eylemler) {
    kontrol(`${ad} ÇOK EŞLEŞMEDE iş yapmıyor`, desen.test(yorumsuzOku(yol)));
  }

  /**
   * ⛔ OKUMA EKRANI ÇAKIŞMADA EŞLEŞTİRME TEKLİF ETMEZ. Teklif etseydi zaten
   * fazla olan bağlara bir tane daha eklenirdi — ekran arızayı BESLERDİ.
   * Ölçüt sırayla kurulur: çok-eşleşme dalı, eşleştirme teklifinden ÖNCE.
   */
  const okuyucu = yorumsuzOku("src/app/okut/okuyucu.tsx");
  const iCok = okuyucu.indexOf('t("cokEslesme"');
  const iTeklif = okuyucu.indexOf('t("gosterTeklifi")');
  /**
   * ⚠ `indexOf` "yok" hâlinde `-1` döner ve `-1 < n` DOĞRUDUR: varlık
   * AYRICA kapılanır, yoksa ölçüt kendi ölçtüğü şey silindiğinde yeşil yanar.
   */
  kontrol("  ...ve çok-eşleşme dalı VAR", iCok >= 0, iCok);
  kontrol("  ...ve eşleştirme teklifi VAR", iTeklif >= 0, iTeklif);
  kontrol("  ...ve çok-eşleşme dalı teklifin ÖNÜNDE", iCok >= 0 && iTeklif >= 0 && iCok < iTeklif);
}

/* ------------------------------------------------------------------- 4 -- */
console.log("\n4) YAZMA KAPILARI — okuma kapısı kadar GENİŞ mi");
{
  /**
   * ⛔ MUSLUK BURADAYDI. Üç ikiz temizlendi ama DOĞDUKLARI yol açıktı:
   * ürün formu kimlik kodlarını yalnız ÖTEKİ kimlik kodlarına, kanal
   * eşleştirme ekranı yeni kodu yalnız ÖTEKİ kanal kodlarına karşı
   * sınıyordu. Arama ise DÖRT rolü birden görüyor — iki kapı "temiz"
   * diyor, arama iki kayıt buluyordu.
   * _(Anayasa: "yazımın kapısı ile okumanın kapısı AYNI ölçüde bakar".)_
   */
  const kapilar: [string, string][] = [
    ["ürün formu", "src/app/urunler/actions.ts"],
    ["kanal eşleştirme", "src/app/kanal-sku/actions.ts"],
  ];
  for (const [ad, ky] of kapilar) {
    kontrol(
      `${ad} ORTAK yazma kapısını çağırıyor`,
      /await kodBaskaVaryantaAitMi\(/.test(yorumsuzOku(ky)),
    );
  }

  /**
   * ⛔ VE KAPI PASİF KAYITLARI DA GÖRMELİ. Pasife alınmış bir ikizin kodunu
   * ikinci kez kullanmak, temizlenen çarpışmayı geri getirir. Yazma kapısı
   * arama kapısından DAHA GENİŞ bakar; tersi olsaydı kapı kendi temizlediği
   * şeyi yeniden üretirdi.
   */
  const gv = yorumsuzOku(GOVDE);
  kontrol(
    "yazma kapısı PASİF kayıtları da tarıyor",
    /kodBaskaVaryantaAitMi[\s\S]{0,700}?kodlaVaryantCoz\(kod, \{ pasifDahil: true \}\)/.test(gv),
  );
  /**
   * ⚠ VE KENDİNİ ÇAKIŞMA SAYMAZ: düzenleme sırasında bir kaydın kendi kodu
   * "başkasının" sayılsaydı, var olan hiçbir ürün kaydedilemezdi.
   */
  kontrol(
    "  ...ve kaydın KENDİSİ hariç tutuluyor",
    /a\.id !== haric\.variantId && a\.urunId !== haric\.urunId/.test(gv),
  );

  /**
   * ═══ K237 (23.09.2026) — SAHİBİN HÂLİ KARARIN PARÇASI ═════════════════
   * ⛔ VAKA: HB siparişi `4711041918` üç gün "kod kataloğumuzda yok" diye
   * düştü. Kodu K231'de PASİFE ALDIĞIMIZ ikiz tutuyordu; kullanıcı kodu
   * ekrandan gerçek ürüne bağlamak istedi ve BU KAPI engelledi — kapı,
   * önlemek için var olduğu arızayı KORUDU.
   * Ayrım: sahip AKTİFSE sert yasak sürer (K231'in çekirdeği); PASİFSE
   * ENGEL DEĞİL SORU — ısrar edilirse geçer ve iz bırakır.
   */
  kontrol("kapı, adayın AKTİF/PASİF hâlini taşıyor", /aktifMi: v\.isActive/.test(gv));
  {
    const eylem = yorumsuzOku("src/app/kanal-sku/actions.ts");
    kontrol(
      "AKTİF sahip hâlâ SERT YASAK (K231 çekirdeği)",
      /if \(kimlikSahibi && kimlikSahibi\.aktifMi\) \{[\s\S]{0,200}?hatalar:/.test(eylem),
    );
    kontrol(
      "  ...PASİF sahip ENGEL DEĞİL, SORU (ısrar kutusu ister)",
      /if \(kimlikSahibi && !pasifSahipOnayi\) \{[\s\S]{0,200}?israrGerekli: true/.test(eylem),
    );
    kontrol(
      "  ...onay AÇIKÇA gelir (varsayılan geçmez)",
      /formData\.get\("pasifSahipOnayi"\) === "evet"/.test(eylem),
    );
    kontrol(
      "  ...ısrar İZ BIRAKIR (sessizce geçmez)",
      /action: "KANAL_SKU_PASIF_IKIZ_ISRAR"/.test(eylem),
    );
    const ekran = yorumsuzOku("src/app/kanal-sku/yeni-esleme.tsx");
    kontrol(
      "  ...ekran onay kutusunu ÇİZİYOR (gövde çalışıp kimse çağırmazsa boş)",
      /durum\.israrGerekli \?[\s\S]{0,600}?name="pasifSahipOnayi"/.test(ekran),
    );
    kontrol(
      "  ...onay bir SONRAKİ kayda taşınmıyor (başarıda sıfırlanır)",
      /setPasifOnay\(false\)/.test(ekran),
    );
  }
}

/* ------------------------------------------------------------------- 5 -- */
console.log("\n5) PASİFE ALMA — zincirin BEŞ halkası");
{
  /**
   * ⛔ ALAN VARDI, YAZICISI YOKTU. `ProductVariant.isActive` aylardır şemada
   * duruyor ve `/urunler` "pasif" rozetini ÇİZİYORDU — ama o durumu üreten
   * hiçbir düğme yoktu. Üç ikiz betikle pasife alındı ve geri alma yolu
   * kullanıcının elinde değildi.
   * _(Anayasa: "şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur";
   * ve "kapatılamayan madde kullanıcıyı yıkıcı işleme iter".)_
   *
   * ⚠ BEŞ HALKA AYRI AYRI SORULUR. Bu deponun ölçülmüş dersi: form doğru
   * çizilir, şema doğru yazar, ARADA bir satır eksiktir ve hiçbir hata
   * çıkmaz. "GERİ VERİR" en kolay unutulanıdır — okunmayan alan, kaydet'te
   * sessizce sıfırlanır.
   */
  const halkalar: [string, string, RegExp][] = [
    ["① SORAR (form kutuyu çiziyor)", "src/app/urunler/urun-formu.tsx",
      /type="checkbox"[\s\S]{0,220}?checked={varyant\.aktif}/],
    ["② OKUR (kutu durumu güncelliyor)", "src/app/urunler/urun-formu.tsx",
      /varyantGuncelle\(sira, \{ aktif: e\.target\.checked \}\)/],
    ["③ DOĞRULAR (şemada alan var)", "src/app/urunler/actions.ts",
      /aktif: z\.boolean\(\)\.default\(true\)/],
    ["④ YAZAR (veritabanına gidiyor)", "src/app/urunler/actions.ts",
      /isActive: v\.aktif/],
    ["⑤ GERİ VERİR (düzenleme forma dolduruyor)",
      "src/app/urunler/[id]/duzenle/page.tsx", /aktif: v\.isActive/],
  ];
  for (const [ad, y, desen] of halkalar) {
    kontrol(ad, desen.test(yorumsuzOku(y)));
  }

  /**
   * ⛔ VE LİSTE DURUMU GÖSTERİR. Rozet olmasaydı pasife alma sessiz bir
   * işlem olurdu: kayıt aramadan düşer, ekranda hiçbir şey değişmez.
   */
  const liste = yorumsuzOku("src/app/urunler/page.tsx");
  kontrol(
    "liste VARYANT aktifliğini çekiyor ve rozeti çiziyor",
    /isActive: true,[\s\S]{0,800}?channelSkus/.test(liste) &&
      /every\(\(v\) => !v\.isActive\)[\s\S]{0,220}?tumVaryantlarPasif/.test(liste),
  );
}

console.log("\n" + "=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
