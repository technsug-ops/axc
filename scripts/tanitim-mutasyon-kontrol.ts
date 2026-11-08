import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TANITIM VİTRİNİ — MUTASYON HARNESS'İ (K374, 08.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run tanitim-mutasyon:kontrol
 *
 *  ⛔ KAPSAM DEĞİŞTİ 08.11.2026 — ESKİ GEREKÇE `tanitim-dogrula.ts`
 *  başlığında duruyor. Vitrin ayrı statik siteden (`tanitim/`) uygulamanın
 *  içine taşındı (`/info`), bu yüzden eski çapaların hepsi düştü ve liste
 *  yeniden yazıldı. ⚠ Mutasyonlar SİLİNMEDİ — NİYETLERİ korunup yeni koda
 *  taşındı (anayasa: "refaktör, çapalı harness'i de taşır").
 *
 *  Üç kapı (öteki harness'lerle aynı gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli
 *    ② mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı yoksa "ÇÖKTÜ"
 *
 *  ⛔ VE ZARARSIZ SAĞLAMA ÖNCE KOŞAR: hiçbir şeyi ölçmeyen bir harness,
 *  her şeyi kırmızı yakarak "mükemmel" görünebilir (yalancı kırmızı).
 * ============================================================================
 */

const BEKCI = "scripts/tanitim-dogrula.ts";
const BEKCI_BASLIGI = "TANITIM VİTRİNİ BEKÇİSİ";

const SAYFA = "src/app/info/page.tsx";
const KAPI = "src/proxy.ts";
const SOZLUK = "messages/tr.json";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "KAPI KAPANDI - /info artik girise yonleniyor",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: '  "/info",',
    koy: "",
    bozdugu:
      "ziyaretci vitrin yerine giris ekrani gorur; hicbir hata cikmaz, vitrin SESSIZCE yok olur",
  },
  {
    ad: "GORSEL KAPISI KAPANDI - ekran goruntuleri girise yonleniyor",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: '  "/kitap-ekran",',
    koy: "",
    bozdugu:
      "sayfa acilir ama butun ekran goruntuleri bos kutu olur; ziyaretci sistemi HIC goremez",
  },
  {
    ad: "KAPI VARSAYILAN ACIK yapildi",
    yon: "FAZLADAN",
    dosya: KAPI,
    bul: "  if (acikMi(yol)) return NextResponse.next();",
    koy: "  if (true) return NextResponse.next();",
    bozdugu:
      "butun ERP herkese acilir - defterin tamami oturumsuz ziyaretciye gider",
  },
  {
    ad: "KAHRAMANDAKI ornek veri beyani cizilmiyor",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: '            <p className={stil["kahraman-not"]}>{t("kahramanNot")}</p>',
    koy: "",
    bozdugu:
      "ziyaretci ekranlardaki rakamlari GERCEK sanir; uydurma veri gercek ciro gibi okunur",
  },
  {
    ad: "GALERIDEKI «gercek defteri gostermez» cumlesi dustu",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: '              <p>{t("ekranlarMetin")}</p>',
    koy: '              <p>{t("ekranlarBaslik")}</p>',
    bozdugu:
      "ikinci beyan kaybolur; galeriye dogrudan gelen ziyaretci uyariyi hic gormez",
  },
  {
    ad: "SOZLUKTEKI beyan artik ornek veri DEMIYOR",
    yon: "KALDIRAN",
    dosya: SOZLUK,
    bul: '"kahramanNot": "Bu sayfadaki bütün ekran görüntüleri örnek veriden alınmıştır',
    koy: '"kahramanNot": "Bu sayfadaki bütün ekran görüntüleri sistemden alınmıştır',
    bozdugu:
      "cizim yerinde ama CUMLE artik beyan degil - desen ayakta, soz dusmus",
  },
  {
    ad: "OLU BAGLANTI - olmayan bir goruntu gosteriliyor",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: '  { dosya: "satislar.jpg", ad: "Satislar" },',
    koy: '  { dosya: "satislar-yok.jpg", ad: "Satislar" },',
    bozdugu: "galeride kirik gorsel cikar; vitrin bakimsiz gorunur",
  },
  {
    ad: "BASKA KLASORDEN goruntu gosteriliyor (gercek defter sizar)",
    yon: "FAZLADAN",
    dosya: SAYFA,
    bul: '                src="/kitap-ekran/panel.jpg"',
    koy: '                src="/ozel/gercek-panel.jpg"',
    bozdugu:
      "gercek defterin fotografi internete cikar - musteri, tedarikci, SKU ve kar rakami; arama motoru onbellegi yuzunden silmek geri getirmez",
  },
  {
    ad: "HERKESE ACIK SAYFA veritabanina gidiyor",
    yon: "FAZLADAN",
    dosya: SAYFA,
    bul: 'import { UYGULAMA } from "@/lib/uygulama";',
    koy: 'import { UYGULAMA } from "@/lib/uygulama";\nimport { prisma } from "@/lib/prisma";',
    bozdugu:
      "oturumsuz ziyaretci her istekte KAS'in 25 baglantilik kotasini yer; ayrica defterden veri tasima yolu acilir",
  },
  {
    ad: "UYGULAMA ADI koda gomuldu",
    yon: "FAZLADAN",
    dosya: SAYFA,
    bul: "  const ad = UYGULAMA.ad;",
    koy: '  const ad = "Bezirga";',
    bozdugu:
      "ad degisikligi tek satirlik is olmaktan cikar; firma adi YAPIYA gomulur (adlandirma standardi)",
  },
];

function bekciyiKostur() {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("");
console.log("TANITIM VİTRİNİ — K374 MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

/* ── ZARARSIZ SAĞLAMA ÖNCE ───────────────────────────────────────────── */
{
  const asil = readFileSync(SAYFA, "utf8");
  let s: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(
      SAYFA,
      asil.replace(
        "export default async function",
        desenNormalle(asil, "/* zararsiz */\nexport default async function"),
      ),
    );
    s = bekciyiKostur();
  } finally {
    dayanikliYaz(SAYFA, asil);
  }
  if (s.kod === 0 && s.ciktiVar) {
    console.log("  OK  = ZARARSIZ mutasyon (yorum) YEŞİL kaldı — harness ölçüyor");
  } else {
    bozuk.push(
      "ZARARSIZ SAĞLAMA DÜŞTÜ — harness her şeyi kırmızı yakıyor, sonuçlar GEÇERSİZ",
    );
  }
}

/* ── GERÇEK MUTASYONLAR ──────────────────────────────────────────────── */
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  let sonuc: { kod: number; ciktiVar: boolean } | null = null;

  try {
    const bul = desenNormalle(asil, m.bul);
    const adet = asil.split(bul).length - 1;
    if (adet !== 1) {
      bozuk.push(m.ad + "\n       çapa " + adet + " kez geçiyor (1 olmalı)");
      continue;
    }
    const yeni = asil.replace(bul, desenNormalle(asil, m.koy));
    dayanikliYaz(m.dosya, yeni);

    if (readFileSync(m.dosya, "utf8") === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI — ölçüm geçersiz");
    } else {
      sonuc = bekciyiKostur();
    }
  } catch (e) {
    bozuk.push(m.ad + "\n       mutasyon kurulamadı: " + (e as Error).message);
  } finally {
    dayanikliYaz(m.dosya, asil);
  }

  if (!sonuc) continue;

  const isaret = m.yon === "KALDIRAN" ? "-" : "+";
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  OK  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz");
  } else {
    kacan.push(m.ad + "\n       KORUMASIZ: " + m.bozdugu);
  }
}

/* ── GERİ ALMA DOĞRULANIR ────────────────────────────────────────────── */
{
  const son = bekciyiKostur();
  if (son.kod !== 0) {
    bozuk.push(
      "GERİ ALMA EKSİK — tur sonunda bekçi hâlâ KIRMIZI; çalışma ağacı mutasyonlu kalmış olabilir",
    );
  } else {
    console.log("  OK  = tur sonrası bekçi yeniden YEŞİL — geri alma tam");
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  ÖLÇÜLEMEYEN MUTASYONLAR — sonuç GEÇERSİZ:\n");
  for (const b of bozuk) console.log("  ?  " + b);
  console.log("");
}

const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
const fazladan = MUTASYONLAR.length - kaldiran;
console.log(
  `  ${yakalanan}/${MUTASYONLAR.length} mutasyon yakalandı   (- kaldıran ${kaldiran} · + fazladan ${fazladan})`,
);

if (kacan.length || bozuk.length) {
  console.log("  ⛔ TUR GEÇERSİZ — düzeltilmeden teslim edilmez.");
  process.exitCode = 1;
} else {
  console.log("  OK  K374 vitrini İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ");
}
