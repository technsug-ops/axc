import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  FİZİKSEL SAYIM — MUTASYON HARNESS'İ (K57)
 * ----------------------------------------------------------------------------
 *      npm run sayim:mutasyon
 *
 *  ⛔ YEŞİL TEST, SINANMIŞ KONTROL DEMEK DEĞİLDİR. `sayim:dogrula` 61 ölçütle
 *  yeşil yanıyor; bu betik o yeşilin bir şey KORUDUĞUNU kanıtlar: her ölçütün
 *  aradığı davranış tek tek BOZULUR ve bekçinin KIRMIZI yandığı GÖRÜLÜR.
 *
 *  ═══ HARNESS'İN KENDİSİ DE KUSURLU OLABİLİR ═══
 *  26.08.2026'da iki kez yaşandı: biri `✗` sayıyordu (çıkış kodu yerine) ve
 *  sözdizimi hatası veren mutasyon çöküp "yakalandı" görünüyordu; öteki deseni
 *  hiç bulamıyor ve mutasyon UYGULANMADAN yeşil raporlanıyordu.
 *
 *  Bu harness üç kapı kurar:
 *    ① desen kaynakta **TAM BİR KEZ** geçmeli — çoksa/yoksa HATA (mutasyon
 *      belirsizdir; birini bozup ötekinin testi ayakta tutması tam olarak
 *      anayasadaki yalancı yeşil)
 *    ② mutasyon UYGULANDIĞI diskten yeniden okunarak doğrulanır
 *    ③ hüküm **ÇIKIŞ KODUNDAN** verilir — ve bekçinin kendi başlığı çıktıda
 *      YOKSA "yakalandı" DEĞİL **"ÇÖKTÜ"** yazılır. Çökme, bekçinin ölçtüğü
 *      şeyi kanıtlamaz; yalnız kodun derlenmediğini söyler.
 *
 *  ═══ İKİ YÖN AYRI SINANIR ═══
 *    KALDIRAN → davranışı siler        → bekçi susarsa "yanlış susma" serbest
 *    FAZLADAN → davranışı fazladan yapar → bekçi susarsa "yanlış yanma" serbest
 *  Yalnız biri yazılırsa öteki yön korumasız kalır.
 * ============================================================================
 */

const BEKCI = "scripts/sayim-dogrula.ts";
/** Bekçinin kendi başlığı — çıktıda yoksa bekçi hiç KOŞMAMIŞ demektir. */
const BEKCI_BASLIGI = "FİZİKSEL SAYIM BEKÇİSİ";

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
  //  null ↔ 0 AYRIMI — sayılmadı vs rafta yok
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "null kapısı falsy'e çevrildi (0 da 'sayılmadı' sayılır)",
    yon: "KALDIRAN",
    dosya: "src/lib/sayim/kova.ts",
    bul: "  if (g.sayilanAdet === null) {",
    koy: "  if (!g.sayilanAdet) {",
    bozdugu: "rafta OLMADIĞI ölçülmüş varyant 'sayılmadı' sanılır — gerçek eksik SESSİZCE kaybolur",
  },
  {
    ad: "null kapısı tamamen kaldırıldı (null aritmetiğe girer)",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/kova.ts",
    bul: "  if (g.sayilanAdet === null) {",
    koy: "  if (false) {",
    bozdugu: "sayılmamış satır hakkında hüküm kurulur — stok yanlış silinir",
  },
  {
    ad: "SAYILMADI'nın farkı 0 döndürüldü",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/kova.ts",
    bul: "      fark: null,",
    koy: "      fark: 0,",
    bozdugu: "bakılmamış satır 'tutuyor' der — 0 bir ÖLÇÜMDÜR, yokluk değil",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  DAMGA — geriye dönük kayıt satırı yeniden açmalı
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "damga karşılaştırması kaldırıldı (her damga geçerli)",
    yon: "KALDIRAN",
    dosya: "src/lib/sayim/kova.ts",
    bul: '  return damgaSistemAdedi === guncelSistemAdedi ? "GECERLI" : "YENIDEN_ACILDI";',
    koy: '  return "GECERLI";',
    bozdugu: "sayımdan sonra giren geriye dönük kayıt satırı yeniden açmaz — düzeltme yanlış kalır",
  },
  {
    ad: "damga her zaman geçersiz sayıldı",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/kova.ts",
    bul: '  return damgaSistemAdedi === guncelSistemAdedi ? "GECERLI" : "YENIDEN_ACILDI";',
    koy: '  return "YENIDEN_ACILDI";',
    bozdugu: "hiç değişmemiş satır da yeniden açılır — uyarı gürültüye döner",
  },
  {
    ad: "çözülemeyen iz susturuldu (damgasız yazım 'geçerli')",
    yon: "KALDIRAN",
    dosya: "src/lib/sayim/kova.ts",
    bul: '  if (damgaSistemAdedi === null) return "YENIDEN_ACILDI";',
    koy: '  if (damgaSistemAdedi === null) return "GECERLI";',
    bozdugu: "bozuk bir iz bir kalemi sonsuza kadar sessizleştirir",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  KOVALAR — fazla/eksik tek "fark"a birleşmemeli
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "eksik, fazla kovasına net olarak eklendi",
    yon: "KALDIRAN",
    dosya: "src/lib/sayim/ozet.ts",
    bul: "o.eksikSatir++; o.eksikAdet += Math.abs(h.fark ?? 0);",
    koy: "o.eksikSatir++; o.fazlaAdet += h.fark ?? 0;",
    bozdugu: "3 eksik + 3 fazla NET SIFIR görünür — iki ayrı iş tek sayıya ezilir",
  },
  {
    ad: "eksik adedi negatif taşındı",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/ozet.ts",
    bul: "o.eksikSatir++; o.eksikAdet += Math.abs(h.fark ?? 0);",
    koy: "o.eksikSatir++; o.eksikAdet += h.fark ?? 0;",
    bozdugu: "iki kova toplandığında sessizce sıfırlanabilir hâle gelir",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  KAPSAM — kapsam dışına dokunulmamalı
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "kapsam ayrımı kaldırıldı (her satır kapsam içi sayıldı)",
    yon: "KALDIRAN",
    dosya: "src/lib/sayim/ozet.ts",
    bul: "    if (g.kapsamdaydi) o.kapsam++;\n    else o.kapsamDisi++;",
    koy: "    o.kapsam++;",
    bozdugu: "kapsam dışı bulgular kaybolur — sayım kapsamı olduğundan geniş görünür",
  },
  {
    ad: "kapsam dışı bayrağı hiç yanmıyor",
    yon: "KALDIRAN",
    dosya: "src/lib/sayim/kova.ts",
    bul: "  const kapsamDisi = !g.kapsamdaydi;",
    koy: "  const kapsamDisi = false;",
    bozdugu: "sistemin boş sandığı yerde bulunan mal işaretlenmez",
  },
  {
    ad: "kapsam dışı bayrağı hep yanıyor",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/kova.ts",
    bul: "  const kapsamDisi = !g.kapsamdaydi;",
    koy: "  const kapsamDisi = true;",
    bozdugu: "kapsam içi satırlar da 'dışarıda bulundu' diye raporlanır",
  },
  {
    ad: "sayılmadı sayacı kapsam dışını da sayıyor",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/ozet.ts",
    bul: "        if (g.kapsamdaydi) o.sayilmadi++;",
    koy: "        o.sayilmadi++;",
    bozdugu: "kapsam raporu olduğundan kötü görünür — sayım eksik sanılır",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  YAZILABİLİRLİK — belirsiz ve yazılmış satır YAZILMAZ
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "yazılabilirlik şartları gevşetildi",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/kova.ts",
    bul: '    yazilabilirMi: kova !== "TUTUYOR" && !g.ayniGunHareketVar && damga === "YAZILMADI",',
    koy: '    yazilabilirMi: kova !== "TUTUYOR",',
    bozdugu: "belirsiz satır sessizce yazılır ve yazılmış satır İKİNCİ kez yazılır (çift sayım)",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  KARAR SIRASI — fazlada belge yolu ÜSTTE
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "fazlada belge yolu en alta indirildi",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/karar.ts",
    bul: '      yollar: ["BELGE_GIR", "MALIYETLE_YAZ", "MALIYETSIZ_YAZ"],',
    koy: '      yollar: ["MALIYETSIZ_YAZ", "MALIYETLE_YAZ", "BELGE_GIR"],',
    bozdugu: "önce fark yazılır sonra fatura girilir → stok İKİ KEZ artar",
  },

  // ── GÜNDE İKİNCİ SAYIM (28.08.2026, canlı çökme) ────────────────────────
  {
    ad: "günde ikinci sayım yine çakışıyor (sonek verilmiyor)",
    yon: "KALDIRAN",
    dosya: "src/lib/sayim/oturum.ts",
    bul: "    if (!kullanilan.has(aday)) return aday;",
    /**
     * ⚠ MUTASYON DEĞER BOZAR, ÇÖKERTMEZ. İlk yazımda döngü gövdesi
     * tamamen siliniyordu; o hâlde `bosSayimKodu` 99 turdan sonra
     * `throw` ediyor, bekçi ÇÖKÜYOR ve harness bunu (haklı olarak)
     * "yakalandı" saymıyordu. Çökme, ölçütün ölçtüğünü kanıtlamaz.
     */
    koy: "    return taban;",
    bozdugu: "aynı gün ikinci 'Sayım başlat' tekillik ihlaliyle 500 döner — kullanıcı sebebi göremez",
  },
  {
    ad: "taban kod boşken bile sonek ekleniyor",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/oturum.ts",
    bul: "  if (!kullanilan.has(taban)) return taban;",
    koy: "  if (false) return taban;",
    bozdugu: "günün İLK sayımı da -2 kodu alır; kod okunaklılığını kaybeder",
  },

  // ── BOŞ KARE KİLİDİ (28.08.2026) — kamera sayım kipinde AÇIK kalıyor ─────
  {
    ad: "boş kare kilidi kaldırıldı (aynı kod hep sayılır)",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/okuma.ts",
    bul: "  if (kod === kilit.sonKod) {\n    return { say: false, kilit: { sonKod: kod, bosKare: 0 } };\n  }",
    koy: "",
    bozdugu: "sabit duran barkod SANİYEDE DÖRT KEZ sayılır — 1 adet 12 saniyede 48 olur",
  },
  {
    ad: "boş kare kilidi hiç AÇILMIYOR",
    yon: "KALDIRAN",
    dosya: "src/lib/sayim/okuma.ts",
    bul: "      kilit: bosKare >= esik ? { sonKod: null, bosKare } : { ...kilit, bosKare },",
    koy: "      kilit: { ...kilit, bosKare },",
    bozdugu: "aynı üründen dört adet okutulamaz — gerçek okuma ENGELLENİR",
  },
  {
    ad: "SÜRE EŞİĞİ eklendi (Date farkı) — uydurma eşik yasak",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/okuma.ts",
    bul: "  if (kod === kilit.sonKod) {",
    koy: "  if (kod === kilit.sonKod && Date.now() % 800 !== 0) {",
    bozdugu: "kural fiziksel olaydan koparılıp uydurma bir süreye bağlanır",
  },
  {
    ad: "bozuk okuma (boş dize) boş kare gibi sayılıyor",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/okuma.ts",
    bul: "  if (kod !== null && kod.trim() === \"\") {\n    return { say: false, kilit };\n  }",
    koy: "",
    bozdugu: "çözülemeyen kare kilidi açar, elde duran ürün İKİ kez sayılır",
  },
  {
    ad: "sepette sıfır satırı siliniyor",
    yon: "FAZLADAN",
    dosya: "src/lib/sayim/okuma.ts",
    bul: "  yeni.set(kod, Math.max(0, sonraki));",
    koy: "  if (sonraki <= 0) yeni.delete(kod); else yeni.set(kod, sonraki);",
    bozdugu: "'sayıldı, rafta yok' (0) satırı kaybolur ve 'sayılmadı'ya döner — stok yanlış silinir",
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  OTURUM HÂLİ — damgadan türetilir
  // ─────────────────────────────────────────────────────────────────────────
  {
    ad: "iptal damgası hâl hesabından çıkarıldı",
    yon: "KALDIRAN",
    dosya: "src/lib/sayim/oturum.ts",
    bul: '  if (d.iptalAt !== null) return "IPTAL";\n',
    koy: "",
    bozdugu: "terk edilmiş oturum hâlâ hüküm verir",
  },
];

// ═══════════════════════════════════════════════════════════════════════════

type Sonuc = { kod: number; ciktiVar: boolean };

function bekciyiKostur(): Sonuc {
  /**
   * ⚠ KOMUT TEK METİN — argüman dizisiyle DEĞİL. Windows'ta `npx` bir .cmd
   * dosyası ve kabuk gerekiyor; diziyi kabuğa vermek DEP0190 uyarısı üretir
   * (kaçırma yapılmadan birleştirilir). Komut metninde kullanıcıdan gelen
   * hiçbir veri yok. `canli-migrate.ts` ile aynı desen.
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

console.log("\nSAYIM MUTASYON HARNESS'İ (K57)\n");

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
      m.ad + "\n       desen " + m.dosya + " içinde " + adet + " kez geçiyor (1 olmalı)",
    );
    continue;
  }

  const mutant = asil.replace(m.bul, m.koy);
  let sonuc: Sonuc;
  try {
    writeFileSync(m.dosya, mutant, "utf8");

    // ── Kapı 2: mutasyon GERÇEKTEN uygulandı mı (diskten okunur) ───────────
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten.includes(m.bul) || diskten === asil) {
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
  "  " + yakalanan + "/" + toplam + " mutasyon yakalandı" +
  "   (− kaldıran " + kaldiran + " · + fazladan " + (toplam - kaldiran) + ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  ⛔ Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  ✓  her ölçüt İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
