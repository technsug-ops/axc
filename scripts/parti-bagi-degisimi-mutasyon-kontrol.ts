import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenAdedi, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  PARTİ BAĞI DEĞİŞTİRME — MUTASYON HARNESS'İ (K376, 10.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run parti-bagi-degisimi-mutasyon:kontrol
 *
 *  ⛔ NİYE VAR: yeni bir bekçi, KENDİ KÖRLÜĞÜNÜ sınayan mutasyonla gelir.
 *  `parti-bagi-degisimi:dogrula` 60 ölçütle yeşil yandı — bu hiçbir şeyi
 *  kanıtlamaz: yeşil test, sınanmış kontrol demek değildir.
 *
 *  Üç kapı (öteki harness'lerle AYNI gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli — yoksa "ÖLÇÜLEMEDİ", yeşil değil
 *    ② mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı yoksa "ÇÖKTÜ"
 *
 *  ⛔ VE ZARARSIZ SAĞLAMA ÖNCE KOŞAR: hiçbir şeyi ölçmeyen bir harness her
 *  şeyi kırmızı yakarak "mükemmel" görünebilir (yalancı kırmızı, 21.09.2026).
 *
 *  ⚠ İKİ YÖN AYRI: davranışı KALDIRAN mutasyon (yanlış susma) ve davranışı
 *  FAZLADAN/YANLIŞ yapan mutasyon (yanlış yanma). Yalnız biri yazılsaydı
 *  öteki yön serbest kalırdı.
 * ============================================================================
 */

const BEKCI = "scripts/parti-bagi-degisimi-dogrula.ts";
const BEKCI_BASLIGI = "PARTİ BAĞI DEĞİŞTİRME BEKÇİSİ";

const SAF = "src/lib/parti-bagi-degistirme.ts";
const EYLEM = "src/app/satislar/[id]/parti-bagi-actions.ts";
const DIYALOG = "src/app/satislar/[id]/parti-bagi-degistir.tsx";
const SAYFA = "src/app/satislar/[id]/page.tsx";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  /* ── KALDIRAN — davranış sessizce düşerse ─────────────────────────── */
  {
    ad: "FIFO tarih sinirini KALDIR",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: '    if (!(hedef.occurredAt < g.sinir)) redler.push("TARIH_SINIRI");',
    koy: "",
    bozdugu:
      "satis, kendisinden SONRA giren partiyi yiyebilir — 29.08.2026 arizasinin elle acilmis arka kapisi (809 bag, stok kilitlendi)",
  },
  {
    ad: "KAPASITE kapisini KALDIR (K91)",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: '    if (hedef.kalanAdet < cikis.adet) redler.push("KAPASITE_YETERSIZ");',
    koy: "",
    bozdugu:
      "parti asiri tuketilir: satir bazinda gecerli gorunen hedef, kume bazinda asilir (K91: 32 parti, 64 adet asim)",
  },
  {
    ad: "AYNI_PARTI kapisini KALDIR",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: '    if (hedef.hareketId === cikis.mevcutPartiId) redler.push("AYNI_PARTI");',
    koy: "",
    bozdugu:
      "hicbir sey degistirmeyen bir yazim ize girer ve kullaniciya 'degistirildi' der",
  },
  {
    ad: "SEBEP zorunlulugunu KALDIR",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: '  if (g.sebep.trim() === "") redler.push("SEBEP_BOS");',
    koy: "",
    bozdugu:
      "uc ay sonra 'bu bag niye degismis' sorusunun cevabi kalmaz; iz kendini anlamsiz kilar",
  },
  {
    ad: "fark null yerine 0 donuyor",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: "        ? null\n        : kurus((yeni - eski) * cikis.adet),",
    koy: "        ? 0\n        : kurus((yeni - eski) * cikis.adet),",
    bozdugu:
      "hesaplanamayan fark 'fark yok' diye okunur — null ile 0 ayri sey (varsayilan deger alanin anlamindan turetilir)",
  },
  {
    ad: "maliyetsizlik beyani dusuruldu",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: "    maliyetBilinmezOlacak: hedef !== null && hedef.birimMaliyet === null,",
    koy: "    maliyetBilinmezOlacak: false,",
    bozdugu:
      "hedefin maliyeti yoksa satis sessizce NO_COST'a duser; kullanici NET'in nicin kayboldugunu gormez",
  },
  {
    ad: "liste suzgecinden kapasite kosulu dustu",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: "      p.kalanAdet >= g.cikis.adet,",
    koy: "      true,",
    bozdugu:
      "ekran yazilamayacak partileri listeler; liste ile yazma kapisi AYRISIR (iki yerde iki olcut)",
  },
  {
    ad: "maliyet damgasi yeni partiden ALINMIYOR",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "            unitCostAmount: hedef.birimMaliyet,\n            unitCostCurrency: hedef.birimMaliyetParaBirimi,",
    koy: "",
    bozdugu:
      "cikis yeni partiye bagli gorunur ama ESKI maliyeti tasir — ekran dogru, NET yanlis (19.08.2026 dersi)",
  },
  {
    ad: "ONAY kapisi KALDIRILDI",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: '  if (String(formData.get("onay") ?? "") !== "evet") {\n    return { hatalar: [t("onayGerekli")] };\n  }',
    koy: "",
    bozdugu:
      "onizlemeyi onaylamadan yazim gecer; satisin NET'i kullanicinin gormedigi bir plana gore degisir",
  },
  {
    ad: "IZ yazilmiyor",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "            action: PARTI_BAGI_DEGISIM_EYLEMI,",
    koy: '            action: "BASKA_BIR_SEY",',
    bozdugu: "bag degisir, izi dusmez; tesHis imkani yok olur",
  },
  {
    ad: "kar tazelenmiyor",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "    const oldu = await satisKarTazele(saleId);",
    koy: "    const oldu = true;",
    bozdugu:
      "maliyet damgasi degisir, NET eski damgayla kalir — duzeltme tum okuyuculara ulasmaz",
  },
  {
    ad: "TABAN BOSALDI — kapasite okumasi tek kaldi",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "  const hepsi = await tuketilecekPartiler(db, cikis.variantId);",
    koy: "  const hepsi: Awaited<ReturnType<typeof tuketilecekPartiler>> = [];",
    bozdugu:
      "bos kume her kosulu saglar; kapasite hic olculmez ve olcutun tabani cokmus olur",
  },
  {
    ad: "ekran dugmeyi telefonda cizmiyor",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "                            {maliyetDuzeltebilir ? (\n                              <PartiBagiDegistir\n                                cikisId={dusum.id}",
    koy: "                            {false ? (\n                              <PartiBagiDegistir\n                                cikisId={dusum.id}",
    bozdugu:
      "duzeltme yolu yalniz masaustunde kalir — Ilke #8: mobil esit vatandas",
  },
  {
    ad: "kilitli dugmenin sebebi ekranda yazmiyor",
    yon: "KALDIRAN",
    dosya: DIYALOG,
    bul: '            <p className="text-muted-foreground text-xs">{t("secimGerekli")}</p>',
    koy: "",
    bozdugu:
      "dugme kilitli ama nicin oldugu yazmiyor — sessiz basarisizlik (Ilke #5)",
  },

  /* ── FAZLADAN — davranış yanlış yöne giderse ───────────────────────── */
  {
    ad: "CANLI RISKIN KENDISI — kapasite SINIR penceresinden okunuyor",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: "  const hepsi = await tuketilecekPartiler(db, cikis.variantId);",
    koy: "  const hepsi = await tuketilecekPartiler(db, cikis.variantId, sinir);",
    bozdugu:
      "tuketim sorgusu da suzulur; sinirdan SONRAKI cikislar sayilmaz ve hedefin kalani OLDUGUNDAN FAZLA gorunur — K91'in ta kendisi",
  },
  {
    ad: "tarih siniri gevsetildi (lt -> lte)",
    yon: "FAZLADAN",
    dosya: SAF,
    bul: '    if (!(hedef.occurredAt < g.sinir)) redler.push("TARIH_SINIRI");',
    koy: '    if (!(hedef.occurredAt <= g.sinir)) redler.push("TARIH_SINIRI");',
    bozdugu:
      "ertesi gunun ilk ani iceri girer; sinirin DEGERI degil OPERATORU oynatilmis olur (29.08: cozum operatoru degistirmek DEGILdi)",
  },
  {
    ad: "maliyetsizlik uyarisi HER ZAMAN yaniyor",
    yon: "FAZLADAN",
    dosya: SAF,
    bul: "    maliyetBilinmezOlacak: hedef !== null && hedef.birimMaliyet === null,",
    koy: "    maliyetBilinmezOlacak: hedef !== null,",
    bozdugu:
      "maliyeti BILINEN hedefte de 'NO_COST'a duser' uyarisi cikar; yanlis uyari uyarisizliktan kotudur",
  },
  {
    ad: "plan ISLEM DISINDA kuruluyor",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: "        const kurulum = await planiKur(tx, cikisId, hedefId, sebep);",
    koy: "        const kurulum = await planiKur(prisma, cikisId, hedefId, sebep);",
    bozdugu:
      "kapasite ayni kilitte okunmaz; araya giren bir satis hedefi tuketebilir ve kapasite kapisi kagit ustunde kalir",
  },
  {
    ad: "liste suzgeci ayni partiyi de oneriyor",
    yon: "FAZLADAN",
    dosya: SAF,
    bul: "      p.hareketId !== g.cikis.mevcutPartiId &&",
    koy: "      true &&",
    bozdugu:
      "kullanici zaten bagli oldugu partiyi secebilir; liste ile yazma kapisi AYRISIR",
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
console.log("PARTİ BAĞI DEĞİŞTİRME — K376 MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

/* ── ZARARSIZ SAĞLAMA ÖNCE ───────────────────────────────────────────── */
{
  const asil = readFileSync(SAF, "utf8");
  let s: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(
      SAF,
      asil.replace(
        "function kurus(n: number): number {",
        desenNormalle(asil, "/* zararsiz */\nfunction kurus(n: number): number {"),
      ),
    );
    s = bekciyiKostur();
  } finally {
    dayanikliYaz(SAF, asil);
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
    const adet = desenAdedi(asil, m.bul);
    if (adet !== 1) {
      bozuk.push(m.ad + "\n       çapa " + adet + " kez geçiyor (1 olmalı)");
      continue;
    }
    dayanikliYaz(
      m.dosya,
      asil.replace(desenNormalle(asil, m.bul), desenNormalle(asil, m.koy)),
    );

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
console.log(
  "  " +
    yakalanan +
    "/" +
    MUTASYONLAR.length +
    " mutasyon yakalandı   (- kaldıran " +
    kaldiran +
    " · + fazladan " +
    (MUTASYONLAR.length - kaldiran) +
    ")",
);

if (kacan.length || bozuk.length) {
  console.log("  ⛔ TUR GEÇERSİZ — düzeltilmeden teslim edilmez.");
  process.exitCode = 1;
} else {
  console.log("  OK  K376 kapısı İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ");
}
