import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  HATA EKRANI — MUTASYON HARNESS'İ (K98)
 * ----------------------------------------------------------------------------
 *      npm run hata-mutasyon:kontrol
 *
 *  ⛔ YEŞİL TEST, SINANMIŞ KONTROL DEMEK DEĞİLDİR. `hata:dogrula` 60 ölçütle
 *  yeşil yanıyor; bu betik o yeşilin bir şey KORUDUĞUNU kanıtlar: her ölçütün
 *  aradığı davranış tek tek BOZULUR ve bekçinin KIRMIZI yandığı GÖRÜLÜR.
 *
 *  ⚠ BU MODÜLDE MUTASYON ÖZELLİKLE GEREKLİ: hata ekranı nadiren çizilir.
 *  Bozulduğu gün fark edilmez — aylar sonra, tam da her şeyin yandığı gün
 *  ortaya çıkar. Yani burada "canlıda görürüz" diye bir emniyet YOK.
 *
 *  ── ÜÇ KAPI (`sayim-mutasyon:kontrol` ile aynı) ─────────────────────────
 *    ① desen kaynakta TAM BİR KEZ geçmeli — çoksa/yoksa HATA (birini bozup
 *      ötekinin testi ayakta tutması tam olarak yalancı yeşildir)
 *    ② mutasyon UYGULANDIĞI diskten yeniden okunarak doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN verilir — ve bekçinin kendi başlığı çıktıda YOKSA
 *      "yakalandı" DEĞİL "ÇÖKTÜ" yazılır. Çökme, bekçinin ölçtüğünü
 *      kanıtlamaz; yalnız kodun derlenmediğini söyler.
 *
 *  ── İKİ YÖN AYRI SINANIR ────────────────────────────────────────────────
 *    KALDIRAN → davranışı siler          → susarsa "yanlış susma" serbest
 *    FAZLADAN → davranışı fazladan yapar → susarsa "yanlış yanma" serbest
 *  Yalnız biri yazılırsa öteki yön korumasız kalır.
 * ============================================================================
 */

const BEKCI = "scripts/hata-dogrula.ts";
/** Bekçinin kendi başlığı — çıktıda yoksa bekçi hiç KOŞMAMIŞ demektir. */
const BEKCI_BASLIGI = "HATA EKRANI BEKÇİSİ";

type Yon = "KALDIRAN" | "FAZLADAN";

type Mutasyon = {
  ad: string;
  yon: Yon;
  dosya: string;
  bul: string;
  koy: string;
  /** Hangi davranışı bozuyor — kırmızı yanmazsa o davranış korumasızdır. */
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  // ─────────────────────────────────────────────────────────────────────────
  //  §1 SAF KARAR — dört hâl birbirine EZİLMEMELİ
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "BEKLIYOR dalı öldürüldü (sonda cevap vermeden hüküm)",
    yon: "KALDIRAN",
    dosya: "src/lib/hata/durum.ts",
    bul: 'if (sonda.durum === "BEKLIYOR") return "KONTROL_EDILIYOR";',
    koy: 'if (false) return "KONTROL_EDILIYOR";',
    bozdugu:
      "ekran daha ölçmeden sebep söyler — tahmini ölçüm diye basar",
  },
  {
    ad: "CEVAPSIZ dalı öldürüldü (sunucu susarken 'veritabanı yok' der)",
    yon: "KALDIRAN",
    dosya: "src/lib/hata/durum.ts",
    bul: 'if (sonda.durum === "CEVAPSIZ") return "SUNUCUYA_ULASILAMADI";',
    koy: 'if (false) return "SUNUCUYA_ULASILAMADI";',
    bozdugu:
      "en çok bilgi taşıyan hâl kaybolur; operatör yanlış yere (sağlayıcıya) bakar",
  },
  {
    ad: "iki hâl tek cümleye ezildi (veritabanı ayakta da olsa 'yok' der)",
    yon: "FAZLADAN",
    dosya: "src/lib/hata/durum.ts",
    bul: 'return sonda.veritabani ? "SUNUCU_HATASI" : "VERITABANI_YOK";',
    koy: 'return "VERITABANI_YOK";',
    bozdugu:
      "ekranın kendi hatası 'veritabanı çöktü' diye okunur — kimse koda bakmaz",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  §2 HATA KODU — boş kod satır AÇMAZ, uzun kod kırpıldığını SÖYLER
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "boş digest kapısı öldürüldü",
    yon: "KALDIRAN",
    dosya: "src/lib/hata/durum.ts",
    bul: 'if (temiz === "") return null;',
    koy: "if (false) return null;",
    bozdugu:
      "boş bir ERROR etiketi çizilir — olmayan bir tutamak varmış gibi görünür",
  },
  {
    ad: "kırpma sınırı sıfıra çekildi (her kod kırpılır)",
    yon: "FAZLADAN",
    dosya: "src/lib/hata/durum.ts",
    bul: "temiz.length > 64",
    koy: "temiz.length > 0",
    bozdugu:
      "9 haneli gerçek digest de kırpılır; destek yanlış kodu arar",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  §3 SÖZLÜK BAĞI — zincirin orta halkası
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "metin sözlükten okunmayıp boş bırakıldı",
    yon: "KALDIRAN",
    dosya: "src/lib/hata/metinler.ts",
    bul: "baslik: H.baslik,",
    koy: 'baslik: "",',
    bozdugu:
      "global-error ekranı başlıksız çizilir — sözlük bağı koptuğu görülmez",
  },
  {
    ad: "en sözlüğünde anahtar adı kaydı (tr ile ayrıştı)",
    yon: "KALDIRAN",
    dosya: "messages/en.json",
    bul: '"neYapmaliSUNUCU_HATASI": ""',
    koy: '"neYapmaliSUNUCU_HATASIX": ""',
    bozdugu:
      "İngilizce eklendiğinde o satır sessizce Türkçe kalır",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  §4 SONDA — salt okuma · yutmaz · kırpmaz
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "hata yutuldu (günlüğe yazılmıyor)",
    yon: "KALDIRAN",
    dosya: "src/app/hata-sondasi.ts",
    bul: "console.error(",
    koy: "void (",
    bozdugu:
      "K57-③: sebep hiçbir yerde yazmaz; teşhis canlı veritabanına bakmaya kalır",
  },
  {
    ad: "mesaj ilk satıra kırpıldı",
    yon: "KALDIRAN",
    dosya: "src/app/hata-sondasi.ts",
    bul: "e.stack ?? e.message",
    koy: 'e.message.split("\\n")[0]',
    bozdugu:
      "26.08 vakası: Prisma mesajı boş satırla başlar — günlüğe boş satır düşer",
  },
  {
    ad: "sonda veriye YAZIYOR",
    yon: "FAZLADAN",
    dosya: "src/app/hata-sondasi.ts",
    bul: "    return true;",
    koy: "    await prisma.auditLog.create({ data: {} });\n    return true;",
    bozdugu:
      "zaten bozuk bir durumda koşan gövde ikinci bir risk açar",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  §5 İKİ SINIR — ayrışma ve sızıntı
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "global-error'a çeviri kancası kondu (sağlayıcı YOK)",
    yon: "FAZLADAN",
    dosya: "src/app/global-error.tsx",
    bul: 'import { HataEkrani } from "@/components/hata-ekrani";',
    koy:
      'import { useTranslations } from "next-intl";\n' +
      'import { HataEkrani } from "@/components/hata-ekrani";',
    bozdugu:
      "kök yerleşim düştüğünde sağlayıcı da düşer — HATA EKRANININ KENDİSİ patlar",
  },
  {
    ad: "ham hata mesajı ekrana verildi",
    yon: "FAZLADAN",
    dosya: "src/app/error.tsx",
    bul: "digest={error.digest}",
    koy: "digest={error.message}",
    bozdugu:
      "kullanıcıya bir şey anlatmayan iç ayrıntı ekrana sızar (K57-③)",
  },
  {
    ad: "bir metin alanı ekrana hiç verilmedi",
    yon: "KALDIRAN",
    dosya: "src/app/error.tsx",
    bul: 'neYapmali_SUNUCU_HATASI: t("neYapmaliSUNUCU_HATASI"),',
    koy: "",
    bozdugu:
      "'ne yapmalı' satırı undefined basar — hem de yalnız o durumda",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  §6 EKRAN GÖVDESİ — ölçülen durum kullanıcıya ULAŞIYOR mu
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "CEVAPSIZ koşulu öldürüldü (desen dosyada KALIYOR)",
    yon: "KALDIRAN",
    dosya: "src/components/hata-ekrani.tsx",
    bul: 'if (!iptal) setSonda({ durum: "CEVAPSIZ" });',
    koy: 'if (false) setSonda({ durum: "CEVAPSIZ" });',
    bozdugu:
      "sunucu susunca ekran sonsuza kadar 'kontrol ediliyor' der — en sinsi hâl",
  },
  {
    ad: "ölçülen durum ekrana basılmıyor (başlık tekrarlanıyor)",
    yon: "KALDIRAN",
    dosya: "src/components/hata-ekrani.tsx",
    bul: "{metin[durum]}",
    koy: "{metin.baslik}",
    bozdugu:
      "sonda doğru ölçer, kullanıcı göremez — doğru davranışın görünmezliği",
  },
  {
    ad: "hata kodu satırı koşulsuz çizildi",
    yon: "FAZLADAN",
    dosya: "src/components/hata-ekrani.tsx",
    bul: "{kod ? (",
    koy: "{true ? (",
    bozdugu:
      "digest yokken boş bir 'Hata kodu:' satırı çıkar",
  },
  {
    ad: "tekrar dene düğmesi telefonda küçüldü",
    yon: "KALDIRAN",
    dosya: "src/components/hata-ekrani.tsx",
    bul: 'className="mt-2 h-11 rounded-md border px-4 text-sm font-medium"',
    koy: 'className="mt-2 h-8 rounded-md border px-4 text-sm font-medium"',
    bozdugu:
      "anayasa #8: dokunulabilir öğe telefonda en az 44px — tek çıkış yolu o düğme",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  §7 DENEME ROTASI — KAPI
  // ---------------------------------------------------------------------------
  //  ⛔ BU BLOK KULLANICININ AÇIK ŞARTI (30.08.2026): "bu rotanın yetki
  //  kapısını kaldıran senaryo → KIRMIZI. Mutasyonla sınansın — bu rota
  //  korumasız kalırsa canlıda herkesin tetikleyebileceği bir hata sayfası
  //  doğar."
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "deneme rotasının YETKİ KAPISI kaldırıldı",
    yon: "KALDIRAN",
    dosya: "src/app/sistem/hata-denemesi/page.tsx",
    bul: "  await sayfaTamYetki();\n",
    koy: "",
    bozdugu:
      "canlıda HERKESİN tetikleyebileceği bir hata sayfası doğar — kullanıcının açık şartı",
  },
  {
    ad: "kapı ile hata YER DEĞİŞTİRDİ (ikisi de dosyada duruyor)",
    yon: "FAZLADAN",
    dosya: "src/app/sistem/hata-denemesi/page.tsx",
    bul: "  await sayfaTamYetki();",
    koy: '  throw new Error("erken");\n  await sayfaTamYetki();',
    bozdugu:
      "iki desen de bulunur, varlık ölçütleri yeşil kalır — ama hata yetkisiz kullanıcıya da çizilir",
  },
  {
    ad: "kapının ret dalı öldürüldü (desen dosyada KALIYOR)",
    yon: "KALDIRAN",
    dosya: "src/lib/yetki/index.ts",
    bul: "  if (!tamYetkiliMi(baglam.izinler)) notFound();",
    koy: "  if (false) notFound();",
    bozdugu:
      "kapı çağrılıyor ama hiçbir şeyi reddetmiyor — giriş yapan herkes geçer",
  },
  {
    ad: "tam yetki ölçütü GEVŞETİLDİ (every → some)",
    yon: "FAZLADAN",
    dosya: "src/lib/yetki/izinler.ts",
    bul: "  return FIRMA_IZINLERI.every((izin) => izinler.has(izin));",
    koy: "  return FIRMA_IZINLERI.some((izin) => izinler.has(izin));",
    bozdugu:
      "TEK izni olan kısıtlı rol tam yetkili sayılır — kapı adı var, kendi yok",
  },
  {
    ad: "yetki tabanı BOŞALTILDI",
    yon: "KALDIRAN",
    dosya: "src/lib/yetki/izinler.ts",
    bul: "export const FIRMA_IZINLERI: readonly Izin[] = TUM_IZINLER.filter(",
    koy: "export const FIRMA_IZINLERI: readonly Izin[] = ([] as Izin[]).filter(",
    bozdugu:
      "taban boşalınca `every` her kümede true döner ve kapı herkese açılır",
  },
  {
    ad: "deneme rotası hata ATMIYOR",
    yon: "KALDIRAN",
    dosya: "src/app/sistem/hata-denemesi/page.tsx",
    bul: "  throw new Error(",
    koy: "  console.log(",
    bozdugu:
      "rota hiçbir şey tetiklemez — Halil ekranı göremez, test yalancı biçimde 'yapıldı' sayılır",
  },
  {
    ad: "deneme rotası veriye DOKUNUYOR",
    yon: "FAZLADAN",
    dosya: "src/app/sistem/hata-denemesi/page.tsx",
    bul: 'import { sayfaTamYetki } from "@/lib/yetki";',
    koy:
      'import { prisma } from "@/lib/prisma";\n' +
      'import { sayfaTamYetki } from "@/lib/yetki";',
    bozdugu:
      "bilerek hata atan bir sayfa veriye yazarsa yarım kalmış yazım bırakır",
  },
];

type Sonuc = { kod: number; ciktiVar: boolean };

function bekciyiKostur(): Sonuc {
  /**
   * ⚠ KOMUT TEK METİN — argüman dizisiyle DEĞİL. Windows'ta `npx` bir .cmd
   * dosyası ve kabuk gerekiyor. Komut metninde kullanıcıdan gelen veri yok.
   */
  const r = spawnSync("npx tsx " + BEKCI, {
    encoding: "utf8",
    shell: true,
    windowsHide: true,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  /** ⚠ HÜKÜM ÇIKIŞ KODUNDAN — ama bekçinin koştuğu ayrıca doğrulanır. */
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nHATA EKRANI MUTASYON HARNESS'İ (K98)\n");

// ── Kapı 0: bozulmamış hâlde bekçi YEŞİL olmalı ────────────────────────────
//  Yoksa her mutasyon "yakalandı" görünürdü ve harness hiçbir şey ölçmezdi.
const temiz = bekciyiKostur();
if (temiz.kod !== 0 || !temiz.ciktiVar) {
  console.log("  ⛔ BOZULMAMIŞ HÂLDE BEKÇİ YEŞİL DEĞİL (kod " + temiz.kod + ").");
  console.log("     Mutasyon ölçümü anlamsız olurdu — önce bekçiyi düzeltin.\n");
  process.exit(1);
}
console.log("  ✓  zemin: bozulmamış hâlde bekçi yeşil\n");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");

  // ── Kapı 1: desen TAM BİR KEZ geçmeli ────────────────────────────────────
  const adet = asil.split(m.bul).length - 1;
  if (adet !== 1) {
    bozuk.push(
      m.ad +
        "\n       desen " +
        m.dosya +
        " içinde " +
        adet +
        " kez geçiyor (1 olmalı)",
    );
    continue;
  }

  const mutant = asil.replace(m.bul, m.koy);

  /**
   * ⚠ HARNESS'İN KENDİSİ DE KUSURLU OLABİLİR — VE BURADA OLDU (30.08.2026).
   *
   * Devraldığım kapı şöyleydi: `diskten.includes(m.bul)` ise "uygulanmadı".
   * Bu ölçüt **EKLEYEN** mutasyonlarda YANLIŞ alarm veriyor: bir satırın
   * ÜSTÜNE yeni satır koyan mutasyonda eski satır zaten yerinde kalır. İki
   * `FAZLADAN` mutasyonu (sondaya yazma çağrısı · global-error'a çeviri
   * kancası) tam bu yüzden "ölçülemedi" diye düştü.
   *
   * ⛔ VE TEHLİKESİ BURADA: kolay çare o iki mutasyonu SİLMEK olurdu — yani
   * "yanlış yanma" yönünü tamamen korumasız bırakmak. Ölçüt gevşetilmez,
   * DÜZELTİLİR: beklenen metin baştan hesaplanır ve diskteki hâlin ona
   * KURUŞUNA eşit olduğu sınanır. Bu hem silen hem ekleyen mutasyonda çalışır.
   */
  if (mutant === asil) {
    bozuk.push(m.ad + "\n       mutasyon HİÇBİR ŞEYİ değiştirmiyor");
    continue;
  }

  let sonuc: Sonuc;
  try {
    writeFileSync(m.dosya, mutant, "utf8");

    // ── Kapı 2: mutasyon GERÇEKTEN uygulandı mı (diskten okunur) ───────────
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }

    sonuc = bekciyiKostur();
  } finally {
    writeFileSync(m.dosya, asil, "utf8");
  }

  const isaret = m.yon === "KALDIRAN" ? "−" : "+";
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  ✓  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0 && !sonuc.ciktiVar) {
    // ⚠ Çöktü — bekçi hiç koşmadı. "Yakalandı" SAYILMAZ.
    bozuk.push(m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz");
  } else {
    kacan.push(m.ad + "\n       KORUMASIZ: " + m.bozdugu);
  }
}

// ── Rapor ──────────────────────────────────────────────────────────────────
console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  ✗  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:\n");
  for (const b of bozuk) console.log("  ⛔ " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " +
    yakalanan +
    "/" +
    toplam +
    " mutasyon yakalandı" +
    "   (− kaldıran " +
    kaldiran +
    " · + fazladan " +
    (toplam - kaldiran) +
    ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  ⛔ Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  ✓  her ölçüt İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
