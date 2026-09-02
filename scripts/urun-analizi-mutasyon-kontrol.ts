import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * ============================================================================
 *  ÜRÜN ANALİZİ — MUTASYON TURU
 * ----------------------------------------------------------------------------
 *  Anayasa: _"yeni bekçi, kendi körlüğünü sınayan mutasyonla gelir"_ ve
 *  _"ölçüt mutasyonsuz teslim edilmez."_ Yeşil bir bekçi, ölçtüğünü
 *  KANITLAMAZ; kanıt, davranışı bozan mutasyonun KIRMIZI yandığının
 *  GÖRÜLMESİDİR.
 *
 *  ⚠ İKİ YÖN AYRI SINANIR:
 *    · YANLIŞ SUSMA — davranışı KALDIRAN mutasyon (özellik sessizce düştü)
 *    · YANLIŞ YANMA — davranışı FAZLADAN yapan mutasyon (dokunmaması
 *      gereken yere dokundu)
 *  Yalnız biri yazılırsa öteki yön serbest kalır.
 *
 *  ⛔ HARNESS ÇIKIŞ KODUNA BAKAR VE MUTASYONUN UYGULANDIĞINI DOĞRULAR.
 *  26.08'de iki kez oldu: biri `✗` sayıyordu (sözdizimi hatası "yeşil"
 *  görünüyordu), öteki deseni hiç bulamıyordu ve mutasyon HİÇ UYGULANMADAN
 *  yeşil raporlanıyordu.
 * ============================================================================
 */

type Mutasyon = {
  ad: string;
  dosya: string;
  eski: string;
  yeni: string;
  /** Bu mutasyonun bozduğu davranış — rapora yazılır. */
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  // ── YANLIŞ SUSMA: davranışı KALDIRAN mutasyonlar ────────────────────────
  {
    ad: "toplam KIRPILMIŞ listeden hesaplanıyor",
    dosya: "src/app/rapor/urunler/page.tsx",
    eski: "const toplam = analizToplami(suzulmus);",
    yeni: "const toplam = analizToplami(sirali.slice(0, satirSayisi));",
    bozdugu: "İlke #15 — toplam süzgecin değil sayfanın toplamına düşer",
  },
  {
    ad: "sıralamada null BAŞA geliyor",
    dosya: "src/lib/rapor/urun-analizi.ts",
    eski: "    if (da === null) return 1;",
    yeni: "    if (da === null) return -1;",
    bozdugu: "marjı bilinmeyen ürün 'en düşük marjlı'nın başına oturur",
  },
  {
    ad: "markasız satır marka süzgecinden GEÇİYOR",
    dosya: "src/lib/rapor/urun-analizi.ts",
    eski: "      if (s.marka === null || !suzgec.markalar.includes(s.marka)) return false;",
    yeni: "      if (s.marka !== null && !suzgec.markalar.includes(s.marka)) return false;",
    bozdugu: "LEGO süzgecinde markasız ürünler de listeye girer",
  },
  {
    ad: "yoğunlaşma tavanı SABİT 25",
    dosya: "src/lib/rapor/urun-analizi.ts",
    eski: "  const tavan =\n    SATIR_SAYILARI.find((n) => n >= urunSayisi) ??\n    SATIR_SAYILARI[SATIR_SAYILARI.length - 1];",
    yeni: "  const tavan = SATIR_SAYILARI[0];",
    bozdugu: "panel '39 üründen' der, liste 25 satır gösterir — sayı ≠ liste",
  },
  {
    ad: "çoklu değer `~` ile BÖLÜNÜYOR (eski hatanın geri dönüşü)",
    dosya: "src/lib/rapor/urun-analizi.ts",
    eski: "  const liste = Array.isArray(ham) ? ham : [ham];",
    yeni: "  const liste = Array.isArray(ham) ? ham : ham.split(\"~\");",
    bozdugu: "içinde `~` geçen marka adı iki markaya bölünür",
  },
  {
    ad: "sermayesi bilinmeyen SIFIR sayılıyor",
    dosya: "src/lib/rapor/urun-analizi.ts",
    eski: "    if (s.bagliSermaye === null) sermayesiBilinmeyen++;\n    else bagliSermaye += s.bagliSermaye;",
    yeni: "    bagliSermaye += s.bagliSermaye ?? 0;",
    bozdugu: "maliyeti bilinmeyen mal 'bedava' sayılır, eksik aranmaz",
  },
  {
    ad: "panel adresi ELLE kuruluyor",
    dosya: "src/app/page.tsx",
    eski: "                            href={yogunlasmaAdresi(\n                              yogunluk.urunSayisi,\n                              analizTabani,\n                            )}",
    yeni: "                            href=\"/rapor/urunler\"",
    bozdugu: "süzgeç sözleşmesi değişince sayı ile liste sessizce ayrışır",
  },
  {
    ad: "bölüm sayacı düşürüldü (koşum yarım kalır)",
    dosya: "scripts/urun-analizi-dogrula.ts",
    eski: '  kosanBolumler.push("suzgec");',
    yeni: "",
    bozdugu: "bir blok koşmazsa bekçi 'geçti' demeli DEĞİL",
  },

  // ── K131 KOVALARI: davranışı KALDIRAN ───────────────────────────────────
  {
    ad: "kova sınırı YARI AÇIĞA döndürüldü (bandı keser)",
    dosya: "src/lib/yaslanma.ts",
    eski: "    if (gun >= k.alt && (k.ust === null || gun <= k.ust)) return k.kod;",
    yeni: "    if (gun >= k.alt && (k.ust === null || gun < k.ust)) return k.kod;",
    bozdugu:
      "her sınır günü bir alt kovaya kayar; kovalar rozet bantlarını KESER " +
      "ve tek kovada iki renk çıkar (kullanıcı bulgusu 02.09.2026)",
  },
  {
    ad: "yaşı OLMAYAN satır kova süzgecinden geçiyor",
    dosya: "src/lib/rapor/urun-analizi.ts",
    eski: "      if (s.yasGun === null || kovaBul(s.yasGun) !== suzgec.kova) return false;",
    yeni: "      if (s.yasGun !== null && kovaBul(s.yasGun) !== suzgec.kova) return false;",
    bozdugu: "yaşı bilinmeyen mal bir kovaya sokulur — bilmediğimiz şey iddia edilir",
  },
  {
    ad: "eski BANT kodu artık tanınmıyor",
    dosya: "src/lib/yaslanma.ts",
    eski: "  const bant = yasSuzgeciCoz(deger);",
    yeni: "  const bant: null = null;",
    bozdugu: "panelin /stok?yas=kirmizi bağlantısı sessizce boş liste açar",
  },
  {
    ad: "kova sayısı altıya düştü",
    dosya: "src/lib/yaslanma.ts",
    eski: '  { kod: "46-60", alt: 46, ust: 60 },',
    yeni: "",
    bozdugu: "46–60 aralığı hiçbir kovaya girmez — kapsama boşluğu",
  },

  // ── YANLIŞ YANMA: davranışı FAZLADAN yapan mutasyonlar ──────────────────
  {
    ad: "[yanlış yanma] rozet eşiği kaydırıldı (kovalar bandı keser)",
    dosya: "src/lib/yaslanma.ts",
    eski: "  amberGun: 31,",
    yeni: "  amberGun: 30,",
    bozdugu:
      "ölçülmüş mimar kararı (14.08.2026) ezilir VE 16-30 kovası iki bandı " +
      "birden içerir — kova/bant örtüşmesi bozulur",
  },
  {
    ad: "[yanlış yanma] bant kodu KOVA olarak da çözülüyor",
    dosya: "src/lib/yaslanma.ts",
    eski: "  const kova = YAS_KOVALARI.find((k) => k.kod === deger);",
    yeni: "  const kova = YAS_KOVALARI.find((k) => k.kod === deger) ?? YAS_KOVALARI[0];",
    bozdugu: "tanınmayan her adres ilk kovaya düşer — bozuk adres 'çalıştı' sanılır",
  },

  {
    ad: "[yanlış yanma] pareto HER sıralamada çiziliyor",
    dosya: "src/app/rapor/urunler/page.tsx",
    eski: '  const payGosterilir = eksen === "dagilim" && sira === "net2" && yon === "azalan";',
    yeni: '  const payGosterilir = eksen === "dagilim";',
    bozdugu: "alfabetik listede anlamsız bir eğriye 'Pareto' denir",
  },
  {
    ad: "[yanlış yanma] eksen varsayılanları hepsi net2",
    dosya: "src/lib/rapor/urun-analizi.ts",
    eski: '  dagilim: "net2",\n  marj: "marj",\n  hacim: "adet",\n  stok: "yas",',
    yeni: '  dagilim: "net2",\n  marj: "net2",\n  hacim: "net2",\n  stok: "net2",',
    bozdugu: "stok ekseni NET-2'ye göre sıralanır; hepsi 0, sıra anlamsız",
  },
  {
    ad: "[yanlış yanma] hesaplanamayan kalemin NET'i toplama giriyor",
    dosya: "src/lib/rapor/urun-analizi.ts",
    eski: "    if (s.kalemSayisi > 0 && s.kalemSayisi === s.hesaplanamayanKalem) {\n      hesaplanamayanUrun++;\n    }",
    yeni: "    if (false) {\n      hesaplanamayanUrun++;\n    }",
    bozdugu: "kârı hiç hesaplanamayan ürün sayısı sessizce sıfır görünür",
  },
];

let kirmizi = 0;
let kacan = 0;
let uygulanamayan = 0;

console.log("=".repeat(74));
console.log("  ÜRÜN ANALİZİ — MUTASYON TURU");
console.log("=".repeat(74));

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");

  /** ⛔ MUTASYONUN UYGULANDIĞI DOĞRULANIR — bulunamayan desen "yeşil" değil HATA. */
  if (!asil.includes(m.eski)) {
    uygulanamayan++;
    console.log(`\n  ⛔ UYGULANAMADI — desen bulunamadı: ${m.ad}`);
    console.log(`     dosya: ${m.dosya}`);
    console.log("     Bu bir BAŞARI DEĞİL: mutasyon hiç denenmedi.");
    continue;
  }
  /** Desen tekil olmalı; çoklu eşleşme yanlış yeri bozabilir. */
  const sayi = asil.split(m.eski).length - 1;
  if (sayi !== 1) {
    uygulanamayan++;
    console.log(`\n  ⛔ DESEN TEKİL DEĞİL (${sayi} yerde): ${m.ad}`);
    continue;
  }

  writeFileSync(m.dosya, asil.replace(m.eski, m.yeni), "utf8");

  let cikisKodu = 0;
  try {
    execSync("npx tsx scripts/urun-analizi-dogrula.ts", { stdio: "pipe" });
  } catch (hata) {
    const h = hata as { status?: number };
    cikisKodu = h.status ?? 1;
  } finally {
    /** Asıl içerik HER HÂLÜKÂRDA geri yazılır. */
    writeFileSync(m.dosya, asil, "utf8");
  }

  if (cikisKodu !== 0) {
    kirmizi++;
    console.log(`\n  ✓ KIRMIZI — ${m.ad}`);
    console.log(`     bozduğu: ${m.bozdugu}`);
  } else {
    kacan++;
    console.log(`\n  ⛔ KAÇTI — ${m.ad}`);
    console.log(`     bozduğu: ${m.bozdugu}`);
    console.log("     Bekçi bu davranışı ÖLÇMÜYOR ya da örnek veri kör.");
  }
}

console.log("\n" + "=".repeat(74));
console.log(
  `  kırmızı ${kirmizi} · kaçan ${kacan} · uygulanamayan ${uygulanamayan}` +
    ` / toplam ${MUTASYONLAR.length}`,
);

if (kacan > 0 || uygulanamayan > 0) {
  console.log("  ⛔ TUR DÜŞTÜ — kaçan ya da uygulanamayan mutasyon var.");
  process.exit(1);
}
console.log("  ✓ Her ölçüt İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ.");
console.log("=".repeat(74));
